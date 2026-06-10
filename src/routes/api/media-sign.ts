import { createServerFileRoute } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

/**
 * Server route: POST /api/media-sign
 *
 * Выдаёт подписанные временные ссылки на ПРИВАТНЫЕ медиа (чаты игр и DM).
 * Прямой доступ к /uploads/chat-images/ и /uploads/dm-media/ закрыт в nginx
 * (return 404) — файлы раздаются только через /api/media с валидной подписью.
 *
 * Запрос:
 *   POST /api/media-sign
 *   Headers: Authorization: Bearer <user JWT>
 *   Body: { "paths": ["chat-images/<gameId>/<userId>/<file>", ...] }   (≤ 200)
 *         Также принимает полные URL вида /uploads/<bucket>/<path>.
 *
 * Ответ: { ok: true, urls: { "<входной path>": "/api/media?p=...&e=...&s=..." } }
 *
 * Безопасность: подпись выдаётся любому АВТОРИЗОВАННОМУ пользователю.
 * Это закрывает главный риск (открытый интернет, индексация, шары без логина).
 * Проверка «участник конкретного чата» сознательно не делается на MVP —
 * пути содержат UUID и неугадываемы, а подпись живёт ограниченное время.
 *
 * Секрет подписи: MEDIA_SIGN_SECRET из .env (fallback — SERVICE_ROLE_KEY,
 * чтобы работало без новой переменной).
 */

const PRIVATE_BUCKETS = new Set(["chat-images", "dm-media"]);
const TTL_SECONDS = 6 * 60 * 60; // 6 часов — хватает на сессию чата
const MAX_PATHS = 200;

function getSecret(): string | null {
  return process.env.MEDIA_SIGN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Нормализует вход (path или URL) до "<bucket>/<subpath>" приватного бакета. */
export function normalizePrivatePath(raw: string): string | null {
  let path = raw.trim();
  try {
    if (/^https?:/i.test(path)) path = new URL(path).pathname;
  } catch {
    return null;
  }
  path = path.replace(/^\/uploads\//, "").replace(/^\/+/, "");
  if (path.includes("..") || path.includes("\\")) return null;
  if (!/^[A-Za-z0-9._/-]+$/.test(path)) return null;
  const bucket = path.split("/")[0];
  if (!PRIVATE_BUCKETS.has(bucket)) return null;
  if (path.split("/").length < 2) return null;
  return path;
}

export function signMediaPath(path: string, exp: number, secret: string): string {
  return createHmac("sha256", secret).update(`${path}:${exp}`).digest("hex");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const ServerRoute = createServerFileRoute("/api/media-sign").methods({
  POST: async ({ request }) => {
    try {
      const auth = request.headers.get("authorization") ?? "";
      const m = auth.match(/^Bearer\s+(.+)$/i);
      if (!m) return json({ error: "no auth" }, 401);

      const secret = getSecret();
      const supa = getSupabaseAdmin();
      if (!secret || !supa) return json({ error: "server misconfigured" }, 500);

      const { data: userData, error: userErr } = await supa.auth.getUser(m[1]);
      if (userErr || !userData.user) return json({ error: "bad token" }, 401);

      let body: { paths?: unknown };
      try {
        body = await request.json();
      } catch {
        return json({ error: "bad json" }, 400);
      }
      const rawPaths = Array.isArray(body.paths) ? body.paths : null;
      if (!rawPaths || rawPaths.length === 0 || rawPaths.length > MAX_PATHS) {
        return json({ error: "bad paths" }, 400);
      }

      const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
      const urls: Record<string, string> = {};
      for (const raw of rawPaths) {
        if (typeof raw !== "string") continue;
        const path = normalizePrivatePath(raw);
        if (!path) continue;
        const sig = signMediaPath(path, exp, secret);
        urls[raw] = `/api/media?p=${encodeURIComponent(path)}&e=${exp}&s=${sig}`;
      }

      return json({ ok: true, urls });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[media-sign] unhandled", msg);
      return json({ error: "handler crashed", detail: msg }, 500);
    }
  },
});
