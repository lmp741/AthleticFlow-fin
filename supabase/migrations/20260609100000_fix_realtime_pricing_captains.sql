-- ============================================================
-- Фиксы граблей из HANDOVER §12 (готовим почву под админку менеджера):
--   №2  Realtime publication: контрактные таблицы не были добавлены —
--       подписки на цены/брони молчали.
--   №5  Цена игры в партнёрском режиме считалась ТОЛЬКО на клиенте.
--       Теперь book_venue сам пересчитывает и пишет в games —
--       клиентская формула остаётся только для превью.
--   №9  Клинап висячих game_captains (остатки от старого cancel_draft).
-- ============================================================

-- ============================================================
-- 1. Realtime publication (идемпотентно)
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'venue_size_options',
    'venue_bookings',
    'stadium_venues',
    'stadium_schedules',
    'stadium_schedule_overrides',
    'game_series'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 2. book_venue: серверный расчёт цены игры
-- ============================================================
-- Было: клиент сам считал price_per_player = ceil(price × hours × 1.1 / slots)
-- и сервер ему верил. Теперь при source='game' book_venue после успешной
-- брони пересчитывает rent_total и price_per_player и пишет их в games.
-- Формула едина: комиссия 10%, округление вверх.
CREATE OR REPLACE FUNCTION public.book_venue(
  p_venue_id uuid,
  p_size_option_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_source text DEFAULT 'game',
  p_game_id uuid DEFAULT NULL,
  p_external_name text DEFAULT NULL,
  p_external_phone text DEFAULT NULL,
  p_external_notes text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_stadium_id uuid;
  v_manager_id uuid;
  v_venue_name text;
  v_parallel int;
  v_overlap int;
  v_price int;
  v_id uuid;
  v_hours numeric;
  v_rent int;
  v_slots int;
  v_game_organizer uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_source NOT IN ('game','external','maintenance') THEN RAISE EXCEPTION 'Bad source'; END IF;
  IF p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'Bad time range'; END IF;

  SELECT v.stadium_id, s.manager_id, v.name INTO v_stadium_id, v_manager_id, v_venue_name
  FROM public.stadium_venues v JOIN public.stadiums s ON s.id = v.stadium_id
  WHERE v.id = p_venue_id;
  IF v_stadium_id IS NULL THEN RAISE EXCEPTION 'Venue not found'; END IF;

  -- external/maintenance можно создавать только менеджеру.
  IF p_source IN ('external','maintenance') AND v_manager_id <> v_uid THEN
    RAISE EXCEPTION 'Only manager';
  END IF;

  -- Бронь под игру может создавать только организатор этой игры.
  IF p_source = 'game' AND p_game_id IS NOT NULL THEN
    SELECT organizer_id, slots_total INTO v_game_organizer, v_slots
    FROM public.games WHERE id = p_game_id;
    IF v_game_organizer IS NULL THEN RAISE EXCEPTION 'Game not found'; END IF;
    IF v_game_organizer <> v_uid THEN RAISE EXCEPTION 'Only game organizer'; END IF;
  END IF;

  SELECT parallel_count, price_per_hour INTO v_parallel, v_price
  FROM public.venue_size_options WHERE id = p_size_option_id;
  IF v_parallel IS NULL THEN RAISE EXCEPTION 'Size option not found'; END IF;

  SELECT count(*) INTO v_overlap
  FROM public.venue_bookings
  WHERE venue_id = p_venue_id
    AND size_option_id = p_size_option_id
    AND status = 'confirmed'
    AND starts_at < p_ends_at AND ends_at > p_starts_at;
  IF v_overlap >= v_parallel THEN
    RAISE EXCEPTION 'Time slot is full';
  END IF;

  v_hours := EXTRACT(EPOCH FROM (p_ends_at - p_starts_at)) / 3600.0;
  v_rent := CEIL(v_price * v_hours)::int;

  INSERT INTO public.venue_bookings (
    venue_id, size_option_id, starts_at, ends_at, source,
    game_id, external_name, external_phone, external_notes,
    created_by, price_total, status
  )
  VALUES (
    p_venue_id, p_size_option_id, p_starts_at, p_ends_at, p_source,
    p_game_id, NULLIF(trim(COALESCE(p_external_name,'')),''),
    NULLIF(trim(COALESCE(p_external_phone,'')),''),
    NULLIF(trim(COALESCE(p_external_notes,'')),''),
    v_uid, v_rent, 'confirmed'
  )
  RETURNING id INTO v_id;

  -- Серверный расчёт цены: перезаписываем то, что прислал клиент.
  IF p_source = 'game' AND p_game_id IS NOT NULL AND COALESCE(v_slots, 0) > 0 THEN
    UPDATE public.games
    SET rent_total = v_rent,
        price_per_player = CEIL(v_price * v_hours * 1.1 / v_slots)::int
    WHERE id = p_game_id;
  END IF;

  -- Нотификация менеджеру о новой брони на его стадионе.
  IF v_manager_id IS NOT NULL AND v_manager_id <> v_uid THEN
    INSERT INTO public.notifications (user_id, type, title, body, url, payload)
    VALUES (
      v_manager_id, 'booking_created',
      'Новая бронь',
      v_venue_name || ': ' || to_char(p_starts_at AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY HH24:MI')
        || '–' || to_char(p_ends_at AT TIME ZONE 'Europe/Moscow', 'HH24:MI'),
      '/manager',
      jsonb_build_object('booking_id', v_id, 'venue_id', p_venue_id, 'game_id', p_game_id)
    );
  END IF;

  RETURN v_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.book_venue(uuid, uuid, timestamptz, timestamptz, text, uuid, text, text, text) TO authenticated;

-- ============================================================
-- 3. Клинап висячих game_captains
-- ============================================================
-- Капитаны без живого драфта (драфт отменён или вовсе отсутствует) — мусор
-- от старой версии cancel_draft, которая не чистила за собой.
DELETE FROM public.game_captains gc
WHERE NOT EXISTS (
  SELECT 1 FROM public.game_drafts d
  WHERE d.game_id = gc.game_id
    AND d.status IN ('pending', 'active', 'completed')
);

NOTIFY pgrst, 'reload schema';
