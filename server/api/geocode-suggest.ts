// Nitro server route: GET /api/geocode-suggest?q=<строка>
// Возвращает массив до 5 вариантов от Я.Геокодера для автодополнения.
// См. также server/api/geocode.ts — те же причины переноса из src/routes/.

import { defineEventHandler, getQuery, setResponseHeader, setResponseStatus } from "h3";
import { createClient } from "@supabase/supabase-js";

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

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Content-Type", "application/json");

  try {
    const query = getQuery(event);
    const raw = typeof query.q === "string" ? query.q : "";
    const q = normalizeQuery(raw);
    if (q.length < 3 || q.length > 200) {
      setResponseHeader(event, "Cache-Control", "public, max-age=60");
      return { items: [] };
    }

    const supa = getSupabaseAdmin();

    // 1) Cache lookup
    if (supa) {
      try {
        const { data, error } = await supa
          .from("geocode_suggest_cache")
          .select("items")
          .eq("query_norm", q)
          .maybeSingle();
        if (error) {
          console.error("[geocode-suggest] cache read failed", error.message);
        } else if (data?.items) {
          setResponseHeader(event, "Cache-Control", "public, max-age=86400");
          return { items: data.items, cached: true };
        }
      } catch (e) {
        console.error("[geocode-suggest] cache read exception", e);
      }
    }

    // 2) Ask Yandex
    const items = await askYandex(q);

    // 3) Save to cache
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

    setResponseHeader(event, "Cache-Control", "public, max-age=86400");
    return { items, cached: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[geocode-suggest] unhandled", msg);
    setResponseStatus(event, 500);
    return { error: "handler crashed", detail: msg };
  }
});
