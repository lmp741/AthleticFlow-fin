-- ============================================================
-- Серии игр (задача #32) + чаты менеджера с организаторами.
--
-- 1) manager_list_dialogs — список диалогов менеджера с организаторами
--    игр на его стадионах (последнее сообщение + непрочитанные).
-- 2) approve_series — пересоздана под модель ёмкости: занятые даты
--    пропускаются (не валим всю серию), отчёт created/skipped.
-- 3) Организатор может отозвать свою pending-серию (UPDATE policy).
-- ============================================================

-- ============================================================
-- 1. manager_list_dialogs
-- ============================================================
-- Собеседники: организаторы игр на стадионах менеджера (даже если
-- переписки ещё не было — чтобы менеджер мог написать первым).
CREATE OR REPLACE FUNCTION public.manager_list_dialogs()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  last_body text,
  last_at timestamptz,
  last_from_me boolean,
  unread_count int
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  WITH counterparts AS (
    SELECT DISTINCT g.organizer_id AS uid
    FROM public.games g
    JOIN public.stadiums s ON s.id = g.stadium_id
    WHERE s.manager_id = auth.uid()
      AND g.organizer_id <> auth.uid()
  )
  SELECT
    c.uid,
    p.display_name,
    p.avatar_url,
    lm.body,
    lm.created_at,
    lm.sender_id = auth.uid(),
    (
      SELECT count(*)::int FROM public.direct_messages d
      WHERE d.sender_id = c.uid AND d.recipient_id = auth.uid() AND d.read_at IS NULL
    )
  FROM counterparts c
  JOIN public.profiles p ON p.id = c.uid
  LEFT JOIN LATERAL (
    SELECT d.body, d.created_at, d.sender_id
    FROM public.direct_messages d
    WHERE (d.sender_id = auth.uid() AND d.recipient_id = c.uid)
       OR (d.sender_id = c.uid AND d.recipient_id = auth.uid())
    ORDER BY d.created_at DESC
    LIMIT 1
  ) lm ON true
  ORDER BY lm.created_at DESC NULLS LAST, p.display_name;
$fn$;

GRANT EXECUTE ON FUNCTION public.manager_list_dialogs() TO authenticated;

-- ============================================================
-- 2. approve_series — учёт ёмкости, пропуск занятых дат
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_series(p_series_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_s record;
  v_stadium_id uuid;
  v_manager_id uuid;
  v_d date;
  v_starts timestamptz;
  v_ends timestamptz;
  v_game_id uuid;
  v_price int;
  v_size_code text;
  v_weight int;
  v_hours numeric;
  v_rent int;
  v_created int := 0;
  v_skipped int := 0;
  v_skipped_dates text := '';
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_s FROM public.game_series WHERE id = p_series_id;
  IF v_s.id IS NULL THEN RAISE EXCEPTION 'Series not found'; END IF;
  IF v_s.status <> 'pending' THEN RAISE EXCEPTION 'Series already %', v_s.status; END IF;

  SELECT v.stadium_id, s.manager_id INTO v_stadium_id, v_manager_id
  FROM public.stadium_venues v JOIN public.stadiums s ON s.id = v.stadium_id
  WHERE v.id = v_s.venue_id;
  IF v_manager_id <> v_uid THEN RAISE EXCEPTION 'Only manager can approve'; END IF;

  SELECT price_per_hour, size_code INTO v_price, v_size_code
  FROM public.venue_size_options WHERE id = v_s.size_option_id;
  v_weight := public.venue_size_weight(v_size_code);

  FOREACH v_d IN ARRAY v_s.dates LOOP
    v_starts := (v_d + v_s.start_time) AT TIME ZONE 'Europe/Moscow';
    v_ends := (v_d + v_s.end_time) AT TIME ZONE 'Europe/Moscow';

    -- Занятые даты пропускаем, а не валим всю серию.
    IF public.venue_capacity_conflict(v_s.venue_id, v_starts, v_ends, v_weight) THEN
      v_skipped := v_skipped + 1;
      v_skipped_dates := v_skipped_dates
        || CASE WHEN v_skipped_dates = '' THEN '' ELSE ', ' END
        || to_char(v_d, 'DD.MM');
      CONTINUE;
    END IF;

    v_hours := EXTRACT(EPOCH FROM (v_ends - v_starts)) / 3600.0;
    v_rent := CEIL(v_price * v_hours)::int;

    INSERT INTO public.games (
      stadium_id, organizer_id, sport, level, starts_at, ends_at,
      slots_total, price_per_player, rent_total, is_private
    )
    VALUES (
      v_stadium_id, v_s.organizer_id, v_s.sport, v_s.level, v_starts, v_ends,
      v_s.slots_total,
      CEIL(v_price * v_hours * 1.1 / v_s.slots_total)::int,
      v_rent,
      false
    )
    RETURNING id INTO v_game_id;

    INSERT INTO public.venue_bookings (
      venue_id, size_option_id, starts_at, ends_at, source, game_id,
      created_by, price_total, status
    )
    VALUES (
      v_s.venue_id, v_s.size_option_id, v_starts, v_ends, 'game', v_game_id,
      v_s.organizer_id, v_rent, 'confirmed'
    );

    INSERT INTO public.game_participants (game_id, user_id, paid)
    VALUES (v_game_id, v_s.organizer_id, false)
    ON CONFLICT (game_id, user_id) DO NOTHING;

    v_created := v_created + 1;
  END LOOP;

  UPDATE public.game_series
  SET status = 'approved', approved_by = v_uid, approved_at = now()
  WHERE id = p_series_id;

  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  VALUES (
    v_s.organizer_id, 'series_approved',
    'Серия игр одобрена',
    'Создано игр: ' || v_created
      || CASE WHEN v_skipped > 0
          THEN '. Пропущено занятых дат: ' || v_skipped || ' (' || v_skipped_dates || ')'
          ELSE '' END,
    '/my', jsonb_build_object('series_id', p_series_id, 'created', v_created, 'skipped', v_skipped)
  );

  RETURN json_build_object('ok', true, 'created', v_created, 'skipped', v_skipped);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.approve_series(uuid) TO authenticated;

-- ============================================================
-- 3. Организатор отзывает свою pending-серию
-- ============================================================
DROP POLICY IF EXISTS "organizer cancels own pending series" ON public.game_series;
CREATE POLICY "organizer cancels own pending series"
ON public.game_series FOR UPDATE
USING (organizer_id = auth.uid() AND status = 'pending')
WITH CHECK (organizer_id = auth.uid() AND status = 'cancelled');

NOTIFY pgrst, 'reload schema';
