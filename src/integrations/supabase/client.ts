// Supabase client — теперь self-hosted на нашем VPS reg.ru (api.af-sport.ru).
// До 02.06.2026 был на Supabase Cloud (Frankfurt) с обходным /sb прокси
// через Vercel/nginx из-за блокировок TSPU. Переехали ради 152-ФЗ
// (локализация ПДн в РФ) и чтобы избавиться от двойного прыжка.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Self-hosted Supabase URL. Можно переопределить через env для dev/stage,
// но по умолчанию — наш прод-endpoint (Kong за nginx + SSL).
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  process.env.SUPABASE_URL ||
  "https://api.af-sport.ru";

// ANON ключ — публичный JWT с role=anon, валиден до 2036 года.
// Это НЕ секрет: ключ виден любому пользователю в DevTools.
// Защита данных — на уровне RLS-политик в Postgres, не на уровне ключа.
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDEzNzcyLCJleHAiOjIwOTU3NzM3NzJ9.BvtyRNXRUk6QuWGywaNfE3R4zMisfsDRiPhD7qw9Uy8";

function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. " +
        "Should be hardcoded for self-hosted, or set via VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY env.",
    );
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      // localStorage только в браузере, в SSR его нет.
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        // Лимит чтобы не перегрузить WebSocket клиент при пуш-волне.
        eventsPerSecond: 10,
      },
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

/**
 * Singleton supabase-клиент. Импортировать так:
 *   import { supabase } from "@/integrations/supabase/client";
 *
 * Прокси-обёртка нужна чтобы инициализация была лениво — это полезно для SSR,
 * чтобы не пытаться создать клиент до того, как процесс полностью поднялся.
 */
export const supabase = new Proxy(
  {} as ReturnType<typeof createSupabaseClient>,
  {
    get(_, prop, receiver) {
      if (!_supabase) _supabase = createSupabaseClient();
      return Reflect.get(_supabase, prop, receiver);
    },
  },
);
