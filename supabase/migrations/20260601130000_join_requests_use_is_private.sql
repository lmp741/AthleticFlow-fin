-- Упрощаем модель: вместо отдельного флага requires_approval
-- используем существующее поле games.is_private.
--   - Открытая игра (is_private = false) → запись только через заявку.
--   - Приватная игра (is_private = true)  → запись напрямую по инвайт-ссылке.
-- Так не нужно объяснять пользователю отдельную галку и нет рассинхрона.

ALTER TABLE public.games DROP COLUMN IF EXISTS requires_approval;

-- request_join: открытые игры
CREATE OR REPLACE FUNCTION public.request_join(
  p_game_id uuid,
  p_message text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_game record;
  v_taken int;
  v_existing uuid;
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, organizer_id, is_private, archived_at, ends_at, slots_total, sport
  INTO v_game
  FROM public.games
  WHERE id = p_game_id;

  IF v_game.id IS NULL THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF v_game.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Game already archived'; END IF;
  IF v_game.ends_at < now() THEN RAISE EXCEPTION 'Game already ended'; END IF;
  IF v_game.organizer_id = v_uid THEN RAISE EXCEPTION 'You are the organizer'; END IF;
  IF v_game.is_private THEN RAISE EXCEPTION 'Private game — use invite link'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.game_participants
    WHERE game_id = p_game_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'You are already a participant';
  END IF;

  SELECT count(*) INTO v_taken FROM public.game_participants WHERE game_id = p_game_id;
  IF v_taken >= v_game.slots_total THEN RAISE EXCEPTION 'Game is full'; END IF;

  SELECT id INTO v_existing FROM public.game_join_requests
  WHERE game_id = p_game_id AND user_id = v_uid AND status = 'pending';
  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('ok', true, 'request_id', v_existing, 'already_pending', true);
  END IF;

  INSERT INTO public.game_join_requests (game_id, user_id, message)
  VALUES (p_game_id, v_uid, NULLIF(trim(COALESCE(p_message, '')), ''))
  RETURNING id INTO v_new_id;

  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  VALUES (
    v_game.organizer_id,
    'join_request',
    'Новая заявка · ' || v_game.sport,
    'Игрок хочет присоединиться к матчу',
    '/games/' || p_game_id::text,
    jsonb_build_object('game_id', p_game_id, 'request_id', v_new_id, 'from_user_id', v_uid)
  );

  RETURN json_build_object('ok', true, 'request_id', v_new_id);
END;
$fn$;

-- Триггер: запрещаем direct INSERT в game_participants для открытых игр
-- (кроме организатора и кроме SECURITY DEFINER из approve_join).
CREATE OR REPLACE FUNCTION public.block_direct_join_when_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_is_private boolean;
  v_organizer uuid;
BEGIN
  SELECT is_private, organizer_id INTO v_is_private, v_organizer
  FROM public.games WHERE id = NEW.game_id;
  IF NOT v_is_private AND NEW.user_id <> COALESCE(v_organizer, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Open game — submit a join request';
  END IF;
  RETURN NEW;
END;
$fn$;
