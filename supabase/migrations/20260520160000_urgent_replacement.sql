-- «Срочная замена»: организатор (или участник) кричит в эфир,
-- что нужен игрок. Рассылка тем, кто играл на этом стадионе в том же
-- виде спорта за последние 60 дней.

-- Лог вызовов для антиспама — не чаще 1 раза в час на игру.
CREATE TABLE IF NOT EXISTS public.urgent_replacement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipients_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_urgent_log_game_recent
  ON public.urgent_replacement_log(game_id, created_at DESC);

ALTER TABLE public.urgent_replacement_log ENABLE ROW LEVEL SECURITY;

-- Никаких клиентских политик (только RPC пишет/читает через SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.request_urgent_replacement(p_game_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_game record;
  v_recent timestamptz;
  v_targets uuid[];
  v_count int;
  v_url text;
  v_title text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT g.id, g.sport, g.stadium_id, g.starts_at, g.organizer_id, g.slots_total, g.is_private,
         s.name AS stadium_name
  INTO v_game
  FROM public.games g
  LEFT JOIN public.stadiums s ON s.id = g.stadium_id
  WHERE g.id = p_game_id;

  IF v_game.id IS NULL THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  -- Право вызвать: organizer или участник
  IF v_uid <> v_game.organizer_id
     AND NOT EXISTS (
       SELECT 1 FROM public.game_participants p
       WHERE p.game_id = p_game_id AND p.user_id = v_uid
     ) THEN
    RAISE EXCEPTION 'Only organizer or participant can request replacement';
  END IF;

  -- Игра должна быть в будущем
  IF v_game.starts_at < now() THEN
    RAISE EXCEPTION 'Game already started or finished';
  END IF;

  -- Антиспам: не чаще 1 раза в час
  SELECT MAX(created_at) INTO v_recent
  FROM public.urgent_replacement_log
  WHERE game_id = p_game_id;
  IF v_recent IS NOT NULL AND v_recent > now() - interval '1 hour' THEN
    RAISE EXCEPTION 'Replacement was requested recently. Try again later.';
  END IF;

  -- Находим кандидатов: играли на этом стадионе в том же спорте за 60 дней,
  -- исключаем текущих участников и организатора.
  SELECT array_agg(DISTINCT gp.user_id) INTO v_targets
  FROM public.game_participants gp
  JOIN public.games g2 ON g2.id = gp.game_id
  WHERE g2.stadium_id = v_game.stadium_id
    AND g2.sport = v_game.sport
    AND g2.starts_at > now() - interval '60 days'
    AND gp.user_id <> v_game.organizer_id
    AND NOT EXISTS (
      SELECT 1 FROM public.game_participants cur
      WHERE cur.game_id = p_game_id AND cur.user_id = gp.user_id
    );

  v_count := COALESCE(array_length(v_targets, 1), 0);

  IF v_count > 0 THEN
    v_url := '/games/' || p_game_id::text;
    v_title := 'Нужна замена · ' || v_game.sport;

    INSERT INTO public.notifications (user_id, type, title, body, url, payload)
    SELECT
      t,
      'urgent_replacement',
      v_title,
      'На «' || COALESCE(v_game.stadium_name, 'стадионе') || '» ищут игрока · ' ||
        to_char(v_game.starts_at AT TIME ZONE 'Europe/Moscow', 'DD.MM HH24:MI'),
      v_url,
      jsonb_build_object('game_id', p_game_id, 'sport', v_game.sport, 'stadium_id', v_game.stadium_id)
    FROM unnest(v_targets) AS t;
  END IF;

  INSERT INTO public.urgent_replacement_log (game_id, requested_by, recipients_count)
  VALUES (p_game_id, v_uid, v_count);

  RETURN json_build_object('recipients_count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_urgent_replacement(uuid) TO authenticated;
