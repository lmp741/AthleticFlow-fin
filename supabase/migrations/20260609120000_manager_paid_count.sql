-- ============================================================
-- Менеджер должен видеть статус оплаты по игровым броням:
-- добавляем game_paid_count (сколько участников оплатило) в
-- manager_list_bookings. Меняется состав RETURNS TABLE —
-- поэтому DROP + CREATE (CREATE OR REPLACE тип результата не меняет).
-- ============================================================

DROP FUNCTION IF EXISTS public.manager_list_bookings(timestamptz, timestamptz, boolean);

CREATE FUNCTION public.manager_list_bookings(
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
  game_paid_count int,
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
    (SELECT count(*)::int FROM public.game_participants gp WHERE gp.game_id = g.id AND gp.paid),
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
