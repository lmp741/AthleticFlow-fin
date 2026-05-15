-- =============================================================
-- Athletic Flow — кэш геокодирования
-- =============================================================
-- Создаёт таблицу для server-side кэша Я.Геокодера.
-- Применять в Supabase SQL Editor. Скрипт идемпотентный.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.geocode_cache (
  query_norm  text PRIMARY KEY,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  label       text,
  provider    text NOT NULL DEFAULT 'yandex',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Для статистики (что чаще всего ищут)
CREATE INDEX IF NOT EXISTS geocode_cache_created_idx
  ON public.geocode_cache (created_at DESC);

-- RLS: читает только сервер (service_role). Никаких политик не нужно —
-- по умолчанию таблица закрыта от anon/authenticated.
-- ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;
-- (включай RLS если хочешь параною; server route ходит через service_role и обходит её)
