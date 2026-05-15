import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * Server route: GET /api/pitches?lat=&lng=&radius=
 *
 * Логика:
 *   1. Считаем «ячейку сетки» (bucket_lat, bucket_lng) для точки запроса.
 *   2. Если для этой ячейки lastFetched > 30 дней назад (или нет вовсе) —
 *      дёргаем Overpass, пишем в public_pitches + pitches_fetch_log.
 *   3. Отдаём из public_pitches все точки в bbox вокруг (lat, lng) радиусом radius.
 *   4. Дальше клиент сам фильтрует по haversine.
 *
 * ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (или anon).
 *
 * Зачем: Overpass — внешний throttled API. На 5К пользователей он точно ляжет.
 * После 1-2 недель работы все Москва уже в кэше — запросы к Overpass становятся
 * редкими (только когда пользователь ушёл в район, который мы ещё не загрузили).
 */

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const BUCKET_TTL_DAYS = 30;
const BUCKET_PRECISION = 20; // floor(lat * 20) → ячейка 0.05° (~5 км)

function bucketOf(lat: number, lng: number) {
  return {
    bucket_lat: Math.floor(lat * BUCKET_PRECISION),
    bucket_lng: Math.floor(lng * BUCKET_PRECISION),
  };
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

async function askOverpass(lat: number, lng: number, radiusMeters: number) {
  const query = `[out:json][timeout:25];
(
  node["leisure"~"pitch|sports_centre|stadium"](around:${radiusMeters},${lat},${lng});
  way["leisure"~"pitch|sports_centre|stadium"](around:${radiusMeters},${lat},${lng});
);
out center 200;`;
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: query,
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { elements: OverpassElement[] };
      return json.elements;
    } catch {
      /* try next */
    }
  }
  return [] as OverpassElement[];
}

function elementToPitch(el: OverpassElement) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  const t = el.tags ?? {};
  const sportTag = (t.sport ?? "").toLowerCase();
  // отсекаем экзотику
  if (
    t.leisure === "pitch" &&
    sportTag &&
    !/soccer|football|basketball|volleyball|tennis|multi/.test(sportTag)
  ) {
    return null;
  }
  const name =
    t.name ??
    (t.leisure === "pitch"
      ? `Площадка${sportTag ? ` (${sportTag})` : ""}`
      : t.leisure === "stadium"
        ? "Стадион"
        : "Спорткомплекс");
  const addrParts = [t["addr:street"], t["addr:housenumber"]].filter(Boolean);
  const address = addrParts.length
    ? addrParts.join(", ")
    : (t["addr:full"] ?? "Открытая городская площадка");
  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    address,
    lat,
    lng,
    leisure: t.leisure ?? "pitch",
    sport_tag: sportTag || null,
  };
}

export const Route = createFileRoute("/api/pitches")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const lat = parseFloat(u.searchParams.get("lat") ?? "");
        const lng = parseFloat(u.searchParams.get("lng") ?? "");
        const radius = Math.min(40000, Math.max(500, parseInt(u.searchParams.get("radius") ?? "15000", 10) || 15000));
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return new Response(JSON.stringify({ error: "bad coords" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const supa = getSupabaseAdmin();
        if (!supa) {
          // Fallback — без БД сразу к Overpass (не должно случаться в prod).
          const els = await askOverpass(lat, lng, radius);
          const list = els.map(elementToPitch).filter(Boolean);
          return new Response(JSON.stringify({ items: list, cached: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const b = bucketOf(lat, lng);

        // Проверяем log: нужно ли перезаливать Overpass для этой ячейки.
        const { data: logRow } = await supa
          .from("pitches_fetch_log")
          .select("fetched_at")
          .eq("bucket_lat", b.bucket_lat)
          .eq("bucket_lng", b.bucket_lng)
          .maybeSingle();

        const stale =
          !logRow ||
          Date.now() - new Date(logRow.fetched_at as string).getTime() >
            BUCKET_TTL_DAYS * 24 * 3600 * 1000;

        if (stale) {
          // Дёргаем Overpass, обновляем БД.
          const els = await askOverpass(lat, lng, radius);
          const list = els
            .map(elementToPitch)
            .filter(Boolean) as Array<NonNullable<ReturnType<typeof elementToPitch>>>;
          if (list.length > 0) {
            // upsert
            await supa.from("public_pitches").upsert(
              list.map((p) => ({
                ...p,
                fetched_at: new Date().toISOString(),
                source: "osm",
              })),
              { onConflict: "id" },
            );
          }
          await supa.from("pitches_fetch_log").upsert(
            {
              bucket_lat: b.bucket_lat,
              bucket_lng: b.bucket_lng,
              fetched_at: new Date().toISOString(),
              count: list.length,
            },
            { onConflict: "bucket_lat,bucket_lng" },
          );
        }

        // Отдаём по bbox примерно радиусом radius (1° lat ≈ 111 км).
        const dLat = radius / 111000;
        const dLng = radius / (111000 * Math.cos((lat * Math.PI) / 180));
        const { data } = await supa
          .from("public_pitches")
          .select("id, name, address, lat, lng")
          .gte("lat", lat - dLat)
          .lte("lat", lat + dLat)
          .gte("lng", lng - dLng)
          .lte("lng", lng + dLng)
          .limit(500);

        return new Response(JSON.stringify({ items: data ?? [], cached: !stale }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
