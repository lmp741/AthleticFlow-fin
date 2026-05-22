-- Кэш для автодополнения геокодера (Yandex /v1/ с results=5).
-- Полностью аналогично geocode_cache, но хранит массив items, а не одну точку.

CREATE TABLE IF NOT EXISTS public.geocode_suggest_cache (
  query_norm  text PRIMARY KEY,
  -- items: jsonb массив { lat, lng, label } — до 5 вариантов от Я.Геокодера.
  items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider    text NOT NULL DEFAULT 'yandex',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS geocode_suggest_cache_updated_idx
  ON public.geocode_suggest_cache (updated_at DESC);

-- RLS не включаем — таблица закрыта от anon/authenticated по умолчанию,
-- к ней ходит только server route с service_role.
