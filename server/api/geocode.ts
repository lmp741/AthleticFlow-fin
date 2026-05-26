// Nitro server route: GET /api/geocode?q=<строка>
//
// Файл лежит в server/api/ — это нативный путь Nitro, минующий
// TanStack Start SSR-pipeline. Если положить роут в src/routes/api/,
// он будет регистрироваться как страница SSR и выдавать HTML вместо JSON
// (что и наблюдалось в проде до этой переделки).
//
// Логика та же что и раньше: Я.Геокодер + кэш в supabase.geocode_cache.

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

async function askYandex(q: string): Promise<{ lat: number; lng: number; label: string } | null> {
  const apiKey = process.env.YANDEX_GEOCODER_KEY;
  if (!apiKey) {
    console.error("[geocode] YANDEX_GEOCODER_KEY not set");
    return null;
  }
  const bbox = "37.30,55.50~37.95,56.00";
  const url = new URL("https://geocode-maps.yandex.ru/v1/");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("geocode", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "ru_RU");
  url.searchParams.set("results", "1");
  url.searchParams.set("bbox", bbox);
  url.searchParams.set("rspn", "1");

  const r = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) {
    console.error("[geocode] yandex http", r.status);
    return null;
  }
  const json = (await r.json()) as YandexGeocodeResponse;
  const member = json.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
  const pos = member?.Point?.pos;
  if (!pos) return null;
  const [lonStr, latStr] = pos.split(" ");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const label = member?.metaDataProperty?.GeocoderMetaData?.text ?? q;
  return { lat, lng, label };
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Content-Type", "application/json");

  try {
    const query = getQuery(event);
    const raw = typeof query.q === "string" ? query.q : "";
    const q = normalizeQuery(raw);
    if (q.length < 2 || q.length > 200) {
      setResponseStatus(event, 400);
      return { error: "bad query" };
    }

    const supa = getSupabaseAdmin();

    // 1) Cache lookup — обёрнут в try, чтобы упавший supabase не валил handler.
    if (supa) {
      try {
        const { data, error } = await supa
          .from("geocode_cache")
          .select("lat, lng, label")
          .eq("query_norm", q)
          .maybeSingle();
        if (error) {
          console.error("[geocode] cache read failed", error.message);
        } else if (data) {
          setResponseHeader(event, "Cache-Control", "public, max-age=86400");
          return { lat: data.lat, lng: data.lng, label: data.label ?? raw, cached: true };
        }
      } catch (e) {
        console.error("[geocode] cache read exception", e);
      }
    }

    // 2) Ask Yandex
    const hit = await askYandex(q);
    if (!hit) {
      setResponseStatus(event, 404);
      return { error: "not found" };
    }

    // 3) Save to cache
    if (supa) {
      try {
        await supa.from("geocode_cache").upsert(
          {
            query_norm: q,
            lat: hit.lat,
            lng: hit.lng,
            label: hit.label,
            provider: "yandex",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "query_norm" },
        );
      } catch (err) {
        console.error("[geocode] cache write failed", err);
      }
    }

    setResponseHeader(event, "Cache-Control", "public, max-age=86400");
    return { lat: hit.lat, lng: hit.lng, label: hit.label, cached: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[geocode] unhandled", msg);
    setResponseStatus(event, 500);
    return { error: "handler crashed", detail: msg };
  }
});
