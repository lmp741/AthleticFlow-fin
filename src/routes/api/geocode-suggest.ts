import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * Server route: GET /api/geocode-suggest?q=<строка>
 *
 * Автодополнение для поля адреса. Возвращает до 5 вариантов от Я.Геокодера.
 *
 * Логика:
 *   1. Нормализуем q (trim, lowercase, схлоп пробелов).
 *   2. Если q < 3 символов — отдаём пустой список (чтобы не тратить квоту).
 *   3. Cache lookup по нормализованному q → отдаём кэшированный список.
 *   4. Иначе — Я.Геокодер с results=5 (bbox Москвы, rspn=1), без типа объекта,
 *      чтобы попадались и улицы, и дома, и станции метро, и районы.
 *   5. Кладём массив в cache (geocode_suggest_cache) и отдаём.
 *
 * Формат ответа:
 *   { items: Array<{ lat, lng, label }> }
 *
 * Я.Геокодер: 1000 запросов / сутки на ключ. Suggest-вызовов будет много
 * (каждое слово при наборе), поэтому кэшируем агрессивно.
 */

interface YandexGeocodeResponse {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{
        GeoObject?: {
          Point?: { pos?: string };
          metaDataProperty?: { GeocoderMetaData?: { text?: string } };
        };
      }>;
    };
  };
}

interface SuggestItem {
  lat: number;
  lng: number;
  label: string;
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function askYandex(q: string): Promise<SuggestItem[]> {
  const apiKey = process.env.YANDEX_GEOCODER_KEY;
  if (!apiKey) {
    console.error("[geocode-suggest] YANDEX_GEOCODER_KEY not set");
    return [];
  }
  const bbox = "37.30,55.50~37.95,56.00";
  const url = new URL("https://geocode-maps.yandex.ru/v1/");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("geocode", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "ru_RU");
  url.searchParams.set("results", "5");
  url.searchParams.set("bbox", bbox);
  url.searchParams.set("rspn", "1");

  const r = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) {
    console.error("[geocode-suggest] yandex http", r.status);
    return [];
  }
  const json = (await r.json()) as YandexGeocodeResponse;
  const members = json.response?.GeoObjectCollection?.featureMember ?? [];
  const items: SuggestItem[] = [];
  for (const m of members) {
    const pos = m.GeoObject?.Point?.pos;
    if (!pos) continue;
    const [lonStr, latStr] = pos.split(" ");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lonStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const label = m.GeoObject?.metaDataProperty?.GeocoderMetaData?.text ?? q;
    items.push({ lat, lng, label });
  }
  return items;
}

export const Route = createFileRoute("/api/geocode-suggest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const raw = u.searchParams.get("q") ?? "";
        const q = normalizeQuery(raw);
        // < 3 символов — не дергаем платный API. Без этого autocomplete на каждом
        // нажатии «съел» бы суточный лимит за пару часов на 10 пользователях.
        if (q.length < 3 || q.length > 200) {
          return new Response(JSON.stringify({ items: [] }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60",
            },
          });
        }

        const supa = getSupabaseAdmin();

        // 1) Cache lookup
        if (supa) {
          const { data } = await supa
            .from("geocode_suggest_cache")
            .select("items")
            .eq("query_norm", q)
            .maybeSingle();
          if (data?.items) {
            return new Response(JSON.stringify({ items: data.items, cached: true }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=86400",
              },
            });
          }
        }

        // 2) Ask Yandex
        const items = await askYandex(q);

        // 3) Save to cache (даже если пусто — чтобы не дергать повторно тот же бессмысленный q).
        if (supa) {
          try {
            await supa.from("geocode_suggest_cache").upsert(
              {
                query_norm: q,
                items,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "query_norm" },
            );
          } catch (err) {
            console.error("[geocode-suggest] cache write failed", err);
          }
        }

        return new Response(JSON.stringify({ items, cached: false }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
