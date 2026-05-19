// Supabase client — с проксированием через Vercel для обхода блокировок
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * В продакшн-браузере Supabase (AWS) заблокирован российскими ISP.
 * Решение: браузер обращается к /sb/* на нашем домене (Vercel),
 * а Vercel rewrite перенаправляет запрос к supabase.co на сервере.
 *
 * - Браузер prod:  /sb  (проксируется через vercel.json rewrite)
 * - SSR / dev:     прямой URL https://…supabase.co
 */
function getSupabaseUrl(): string {
  const isBrowser = typeof window !== 'undefined';
  const isProd = import.meta.env.PROD; // true в production-билде

  if (isBrowser && isProd) {
    // Абсолютный URL через наш домен — браузер пойдёт на наш же домен,
    // Vercel rewrite переправит на supabase.co
    // (Supabase JS требует полный https:// URL)
    return `${window.location.origin}/sb`;
  }

  // Сервер или локальная разработка — прямой доступ
  return import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

function createSupabaseClient() {
  const SUPABASE_URL = getSupabaseUrl();
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

