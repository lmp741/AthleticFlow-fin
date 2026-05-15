-- =============================================================
-- Athletic Flow — кэш OSM-площадок (Overpass)
-- =============================================================
-- Хранит «дворовые» спорт-точки из OpenStreetMap, чтобы не
-- дёргать Overpass API на каждом пользователе.
-- Применять в Supabase SQL Editor. Идемпотентно.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.public_pitches (
  id          text PRIMARY KEY,           -- "osm-node-123" / "osm-way-456"
  name        text NOT NULL,
  address     text NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  leisure     text NOT NULL,              -- 'pitch' | 'stadium' | 'sports_centre'
  sport_tag   text,                       -- soccer / basketball / multi / ...
  source      text NOT NULL DEFAULT 'osm',
  fetched_at  timestamptz NOT NULL DEFAULT now()
);

-- Bbox-фильтрация: btree-индексы на lat и lng.
-- Достаточно для bbox-запроса WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?.
CREATE INDEX IF NOT EXISTS public_pitches_lat_idx ON public.public_pitches (lat);
CREATE INDEX IF NOT EXISTS public_pitches_lng_idx ON public.public_pitches (lng);

-- Лог обновлений по «ячейкам сетки» Москвы — чтобы знать, когда последний
-- раз дёргали Overpass для данного куска города.
CREATE TABLE IF NOT EXISTS public.pitches_fetch_log (
  bucket_lat  integer NOT NULL,           -- floor(lat * 20)
  bucket_lng  integer NOT NULL,           -- floor(lng * 20)  (≈ ячейка 0.05° × 0.05°)
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  count       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_lat, bucket_lng)
);

-- RLS: только server (service role). Anon не нужно — приходят через server route.
-- (Можно ENABLE RLS если хочешь параною.)
-- =============================================================
-- Дальше: server route /api/pitches сам наполняет таблицу при первом
-- запросе по «ячейке», а потом отдаёт всегда из БД.
-- Для перезалива можно вручную:
--   DELETE FROM public.public_pitches WHERE fetched_at < now() - interval '30 days';
--   DELETE FROM public.pitches_fetch_log WHERE fetched_at < now() - interval '30 days';
-- =============================================================
