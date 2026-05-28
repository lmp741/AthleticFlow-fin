-- Пост-матч: фиксируем счёт, статистику игроков, MVP. После финализации
-- игра считается архивной — чат закрыт, состав/правила нельзя менять,
-- запись на игру невозможна, страница показывает только summary.

-- ============================================================
-- 1. games — поле archived_at
-- ============================================================
-- archived_at != NULL → игра завершена и зафиксирована.
-- Игра становится read-only: ни записаться, ни редактировать, ни писать в чат.
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_games_archived
  ON public.games(archived_at)
  WHERE archived_at IS NOT NULL;

-- ============================================================
-- 2. game_results — общий итог игры
-- ============================================================
-- One row per game (UNIQUE game_id). Капитан/организатор финализирует через RPC.
CREATE TABLE IF NOT EXISTS public.game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  score_team_a int NOT NULL DEFAULT 0 CHECK (score_team_a >= 0),
  score_team_b int NOT NULL DEFAULT 0 CHECK (score_team_b >= 0),
  -- Кто финализировал (для аудита). Обычно organizer.
  finalized_by uuid NOT NULL REFERENCES auth.users(id),
  finalized_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT game_results_game_uniq UNIQUE (game_id)
);

CREATE INDEX IF NOT EXISTS idx_game_results_game
  ON public.game_results(game_id);

ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- Чтение результата — всем (это публичная статистика).
CREATE POLICY "anyone reads game results"
  ON public.game_results FOR SELECT
  USING (true);

-- Запись/изменение только через RPC finalize_game (SECURITY DEFINER).
-- Клиентский INSERT/UPDATE/DELETE отбит.

-- ============================================================
-- 3. game_player_stats — что игрок сделал в этой игре
-- ============================================================
-- One row per (game_id, user_id). Хранит команду, голы, ассисты, флаг MVP.
CREATE TABLE IF NOT EXISTS public.game_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Команда: 'A' / 'B' / NULL (не разделили на команды).
  team text CHECK (team IN ('A', 'B') OR team IS NULL),
  goals int NOT NULL DEFAULT 0 CHECK (goals >= 0 AND goals <= 99),
  assists int NOT NULL DEFAULT 0 CHECK (assists >= 0 AND assists <= 99),
  is_mvp boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_player_stats_uniq UNIQUE (game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_player_stats_game
  ON public.game_player_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_game_player_stats_user
  ON public.game_player_stats(user_id);
-- Полезно для лидерборда:
CREATE INDEX IF NOT EXISTS idx_game_player_stats_user_goals
  ON public.game_player_stats(user_id, goals DESC);

ALTER TABLE public.game_player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads player stats"
  ON public.game_player_stats FOR SELECT
  USING (true);
-- INSERT/UPDATE/DELETE — только через RPC.

-- ============================================================
-- 4. RPC: finalize_game
-- ============================================================
-- Принимает счёт и массив статистики игроков, проверяет права и атомарно:
--   - вставляет game_results
--   - вставляет game_player_stats для каждого игрока
--   - помечает archived_at = now() на games
--   - отправляет уведомления всем участникам
--
-- Параметры:
--   p_game_id      — uuid игры
--   p_score_a      — счёт команды A
--   p_score_b      — счёт команды B
--   p_stats        — jsonb массив { user_id, team, goals, assists, is_mvp }
--   p_notes        — опциональный текст (комментарий капитана)
--
-- Проверки:
--   - Игра должна закончиться (ends_at < now)
--   - Игра не должна быть уже архивной
--   - Вызывающий = organizer
--   - Все user_id в p_stats должны быть участниками игры
CREATE OR REPLACE FUNCTION public.finalize_game(
  p_game_id uuid,
  p_score_a int,
  p_score_b int,
  p_stats jsonb,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_game record;
  v_stat jsonb;
  v_user_id uuid;
  v_team text;
  v_goals int;
  v_assists int;
  v_is_mvp boolean;
  v_mvp_count int := 0;
  v_participant_count int;
  v_finalized_count int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, organizer_id, ends_at, archived_at, sport
  INTO v_game
  FROM public.games
  WHERE id = p_game_id;

  IF v_game.id IS NULL THEN
    RAISE EXCEPTION 'Game not found';
  END IF;
  IF v_game.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Game already archived';
  END IF;
  IF v_game.ends_at > now() THEN
    RAISE EXCEPTION 'Game has not ended yet';
  END IF;
  -- Право финализации — только организатор. (В будущем расширим на капитанов.)
  IF v_game.organizer_id <> v_uid THEN
    RAISE EXCEPTION 'Only organizer can finalize the game';
  END IF;

  IF p_score_a < 0 OR p_score_b < 0 OR p_score_a > 99 OR p_score_b > 99 THEN
    RAISE EXCEPTION 'Bad score';
  END IF;
  IF p_stats IS NULL OR jsonb_typeof(p_stats) <> 'array' THEN
    RAISE EXCEPTION 'Bad stats payload';
  END IF;

  -- Вставляем общий итог
  INSERT INTO public.game_results (game_id, score_team_a, score_team_b, finalized_by, notes)
  VALUES (p_game_id, p_score_a, p_score_b, v_uid, p_notes);

  -- Перебираем массив статистики игроков
  FOR v_stat IN SELECT * FROM jsonb_array_elements(p_stats)
  LOOP
    v_user_id := (v_stat->>'user_id')::uuid;
    v_team := v_stat->>'team';
    v_goals := COALESCE((v_stat->>'goals')::int, 0);
    v_assists := COALESCE((v_stat->>'assists')::int, 0);
    v_is_mvp := COALESCE((v_stat->>'is_mvp')::boolean, false);

    -- Проверка: игрок должен быть участником этой игры
    IF NOT EXISTS (
      SELECT 1 FROM public.game_participants
      WHERE game_id = p_game_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'User % is not a participant of this game', v_user_id;
    END IF;
    IF v_team IS NOT NULL AND v_team NOT IN ('A', 'B') THEN
      RAISE EXCEPTION 'Bad team value';
    END IF;
    IF v_is_mvp THEN
      v_mvp_count := v_mvp_count + 1;
    END IF;

    INSERT INTO public.game_player_stats
      (game_id, user_id, team, goals, assists, is_mvp)
    VALUES (p_game_id, v_user_id, v_team, v_goals, v_assists, v_is_mvp);
    v_finalized_count := v_finalized_count + 1;
  END LOOP;

  -- MVP должен быть ровно один (или ни одного — если капитан решил пропустить).
  IF v_mvp_count > 1 THEN
    RAISE EXCEPTION 'Only one MVP allowed';
  END IF;

  -- Помечаем игру архивной
  UPDATE public.games SET archived_at = now() WHERE id = p_game_id;

  -- Уведомления всем участникам
  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  SELECT
    gp.user_id,
    'game_finalized',
    'Игра завершена · ' || v_game.sport,
    'Счёт: ' || p_score_a || ':' || p_score_b,
    '/games/' || p_game_id::text,
    jsonb_build_object('game_id', p_game_id, 'score_a', p_score_a, 'score_b', p_score_b)
  FROM public.game_participants gp
  WHERE gp.game_id = p_game_id AND gp.user_id <> v_uid;

  RETURN json_build_object(
    'ok', true,
    'game_id', p_game_id,
    'players_finalized', v_finalized_count,
    'mvp_count', v_mvp_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_game(uuid, int, int, jsonb, text) TO authenticated;

-- ============================================================
-- 5. Закрываем мутации на архивных играх через триггер
-- ============================================================
-- После archived_at:
--   - INSERT в game_participants (запись) → запрет
--   - INSERT в game_messages (чат) → запрет
--   - UPDATE games (редактирование) → запрет (кроме archived_at сам)
CREATE OR REPLACE FUNCTION public.block_mutations_on_archived()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_archived timestamptz;
BEGIN
  IF TG_TABLE_NAME = 'games' THEN
    -- Не блочим UPDATE если archived_at само меняется (например, разархивирование).
    IF (OLD.archived_at IS NOT NULL) AND (NEW.archived_at = OLD.archived_at) THEN
      RAISE EXCEPTION 'Cannot modify archived game';
    END IF;
    RETURN NEW;
  END IF;
  -- Для дочерних таблиц — проверяем games.archived_at
  SELECT archived_at INTO v_archived FROM public.games WHERE id = NEW.game_id;
  IF v_archived IS NOT NULL THEN
    RAISE EXCEPTION 'Game is archived, mutation blocked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_archived_messages ON public.game_messages;
CREATE TRIGGER trg_block_archived_messages
  BEFORE INSERT ON public.game_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.block_mutations_on_archived();

DROP TRIGGER IF EXISTS trg_block_archived_participants ON public.game_participants;
CREATE TRIGGER trg_block_archived_participants
  BEFORE INSERT ON public.game_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.block_mutations_on_archived();

DROP TRIGGER IF EXISTS trg_block_archived_games ON public.games;
CREATE TRIGGER trg_block_archived_games
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.block_mutations_on_archived();
