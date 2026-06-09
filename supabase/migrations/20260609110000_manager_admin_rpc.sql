-- ============================================================
-- RPC под админку менеджера стадиона (/manager), задача #28.
--
-- Что уже есть и НЕ дублируем:
--   - RLS: менеджер напрямую редактирует stadium_venues, venue_size_options,
--     stadium_schedules, stadium_schedule_overrides (политики "manager edits ...").
--   - book_venue (external/maintenance), cancel_booking, approve_series.
--
-- Чего не хватало:
--   1) reject_series — отклонение заявки на серию с причиной.
--   2) manager_list_bookings — лента записей с данными игры/организатора
--      одним запросом (PostgREST не умеет embed через auth.users).
-- ============================================================

-- ============================================================
-- 1. reject_series
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_series(p_series_id uuid, p_reason text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_s record;
  v_manager_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_s FROM public.game_series WHERE id = p_series_id;
  IF v_s.id IS NULL THEN RAISE EXCEPTION 'Series not found'; END IF;
  IF v_s.status <> 'pending' THEN RAISE EXCEPTION 'Series already %', v_s.status; END IF;

  SELECT s.manager_id INTO v_manager_id
  FROM public.stadium_venues v JOIN public.stadiums s ON s.id = v.stadium_id
  WHERE v.id = v_s.venue_id;
  IF v_manager_id IS NULL OR v_manager_id <> v_uid THEN
    RAISE EXCEPTION 'Only manager can reject';
  END IF;

  UPDATE public.game_series
  SET status = 'rejected',
      approved_by = v_uid,
      approved_at = now(),
      reject_reason = NULLIF(trim(COALESCE(p_reason,'')),'')
  WHERE id = p_series_id;

  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  VALUES (
    v_s.organizer_id, 'series_rejected',
    'Серия игр отклонена',
    COALESCE(NULLIF(trim(COALESCE(p_reason,'')),''), 'Менеджер отклонил заявку на серию'),
    '/my', jsonb_build_object('series_id', p_series_id)
  );

  RETURN json_build_object('ok', true);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.reject_series(uuid, text) TO authenticated;

-- ============================================================
-- 2. manager_list_bookings
-- ============================================================
-- Все брони стадионов, которыми управляет вызывающий, за период.
-- Включает данные игры и организатора (display_name/avatar) — для вкладок
-- «Записи» и «Календарь». Отменённые включаются опционально.
CREATE OR REPLACE FUNCTION public.manager_list_bookings(
  p_from timestamptz,
  p_to timestamptz,
  p_include_cancelled boolean DEFAULT false
)
RETURNS TABLE(
  booking_id uuid,
  venue_id uuid,
  venue_name text,
  size_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  source text,
  status text,
  price_total int,
  external_name text,
  external_phone text,
  external_notes text,
  game_id uuid,
  game_sport text,
  game_level text,
  game_slots_total int,
  game_participants int,
  organizer_id uuid,
  organizer_name text,
  organizer_avatar text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT
    b.id,
    b.venue_id,
    v.name,
    so.label,
    b.starts_at,
    b.ends_at,
    b.source,
    b.status,
    b.price_total,
    b.external_name,
    b.external_phone,
    b.external_notes,
    b.game_id,
    g.sport,
    g.level,
    g.slots_total,
    (SELECT count(*)::int FROM public.game_participants gp WHERE gp.game_id = g.id),
    g.organizer_id,
    p.display_name,
    p.avatar_url
  FROM public.venue_bookings b
  JOIN public.stadium_venues v ON v.id = b.venue_id
  JOIN public.stadiums s ON s.id = v.stadium_id
  LEFT JOIN public.venue_size_options so ON so.id = b.size_option_id
  LEFT JOIN public.games g ON g.id = b.game_id
  LEFT JOIN public.profiles p ON p.id = g.organizer_id
  WHERE s.manager_id = auth.uid()
    AND b.starts_at < p_to
    AND b.ends_at > p_from
    AND (p_include_cancelled OR b.status <> 'cancelled')
  ORDER BY b.starts_at;
$fn$;

GRANT EXECUTE ON FUNCTION public.manager_list_bookings(timestamptz, timestamptz, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
