-- ============================================================
-- #31: фильтр стадионов по свободному времени.
--
-- find_available_stadiums(date, time?, duration) — id партнёрских
-- стадионов, у которых есть хотя бы одна активная площадка со
-- свободным временем. Поверх get_free_slots, т.е. учитывает график
-- работы, override'ы, брони и модель ёмкости.
--
--   p_start IS NULL  → «любое время»: хоть один свободный слот за день.
--   p_start задан    → нужен свободный слот, начинающийся ровно в это
--                      время (UI даёт время с шагом 30 мин — совпадает
--                      с сеткой get_free_slots).
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_available_stadiums(
  p_date date,
  p_start time DEFAULT NULL,
  p_duration_min int DEFAULT 60
)
RETURNS TABLE(stadium_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT DISTINCT s.id
  FROM public.stadiums s
  JOIN public.stadium_venues v ON v.stadium_id = s.id AND v.active
  WHERE s.is_partner
    AND EXISTS (
      SELECT 1
      FROM public.get_free_slots(v.id, p_date, NULL, p_duration_min) fs
      WHERE NOT fs.busy
        AND (
          p_start IS NULL
          OR fs.slot_start = (p_date + p_start) AT TIME ZONE 'Europe/Moscow'
        )
    );
$fn$;

GRANT EXECUTE ON FUNCTION public.find_available_stadiums(date, time, int) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
