import { createServerFileRoute } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";

/**
 * Server route: POST /api/upload
 *
 * Локальное хранилище файлов на VPS вместо Supabase Storage.
 *
 * ЗАЧЕМ: РФ-ISP (ТСПУ) режет большие исходящие потоки от российских VPS
 * к серверам Supabase Storage в США (IP 8.6.x, 8.47.x). Маленькие запросы
 * проходят (auth/select), большие multipart upload-ы — нет (upstream prematurely
 * closed connection). После нескольких раундов Nginx-настроек (proxy_request_buffering,
 * TLS 1.2 only, динамический resolver) ситуация не меняется — единственный
 * надёжный путь хранить файлы локально и раздавать через Nginx.
 *
 * Формат запроса:
 *   POST /api/upload
 *   Headers: Authorization: Bearer <user JWT>
 *   Body: multipart/form-data
 *     bucket: "chat-images" | "dm-media" | "avatars" | "profile-media"
 *     path: "<subpath>"   — обычно "<gameId>/<userId>/<filename>" или "<userId>/<filename>"
 *     file: File          — собственно файл
 *
 * Возвращает:
 *   { ok: true, url: "https://af-sport.ru/uploads/<bucket>/<path>" }
 *
 * Безопасность:
 *   - Требует валидный JWT (auth.getUser)
 *   - Проверяет, что path содержит user_id вызывающего (как в storage RLS)
 *   - Размер ≤ 50 МБ
 *   - MIME prefix должен быть image/ video/ или application/pdf
 *
 * Каталог на VPS: /var/www/af-sport/uploads/<bucket>/<path>
 * Создать перед первым запросом:
 *   mkdir -p /var/www/af-sport/uploads/{chat-images,dm-media,avatars,profile-media}
 *   chown -R root:root /var/www/af-sport/uploads
 *   chmod -R 755 /var/www/af-sport/uploads
 *
 * Nginx должен раздавать /uploads/ напрямую с диска — см. конфиг в DEPLOY_VPS.md.
 */

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? "/var/www/af-sport/uploads";
const PUBLIC_URL_BASE = process.env.UPLOAD_PUBLIC_BASE ?? ""; // если пусто — отдаём относительный путь
const MAX_BYTES = 50 * 1024 * 1024; // 50 МБ
const ALLOWED_BUCKETS = new Set(["chat-images", "dm-media", "avatars", "profile-media"]);
const ALLOWED_MIME_PREFIXES = ["image/", "video/", "application/pdf"];

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function sanitizePathSegment(seg: string): string {
  // Только UUID-сегменты, имя файла или его части. Никаких ../, абсолютных путей и т.д.
  return seg.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
}

function safePath(rawPath: string): string | null {
  // Разрешаем только: <a>/<b>/<filename> или <a>/<filename> без ".." и абсолютов.
  if (!rawPath || rawPath.includes("..") || rawPath.startsWith("/")) return null;
  const parts = rawPath.split("/").map(sanitizePathSegment).filter(Boolean);
  if (parts.length < 1 || parts.length > 4) return null;
  return parts.join("/");
}

export const ServerRoute = createServerFileRoute("/api/upload").methods({
  POST: async ({ request }) => {
    try {
      const auth = request.headers.get("authorization") ?? "";
      const m = auth.match(/^Bearer\s+(.+)$/i);
      if (!m) {
        return new Response(JSON.stringify({ error: "no auth" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const jwt = m[1];

      const supa = getSupabaseAdmin();
      if (!supa) {
        return new Response(JSON.stringify({ error: "server misconfigured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: userData, error: userErr } = await supa.auth.getUser(jwt);
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "bad token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const userId = userData.user.id;

      // multipart parsing — Web API formData
      let form: FormData;
      try {
        form = await request.formData();
      } catch (e) {
        return new Response(JSON.stringify({ error: "bad multipart", detail: String(e) }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const bucket = String(form.get("bucket") ?? "");
      const rawPath = String(form.get("path") ?? "");
      const file = form.get("file");

      if (!ALLOWED_BUCKETS.has(bucket)) {
        return new Response(JSON.stringify({ error: "bad bucket" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const safePathStr = safePath(rawPath);
      if (!safePathStr) {
        return new Response(JSON.stringify({ error: "bad path" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Проверка: путь должен содержать user_id вызывающего хотя бы в одном сегменте.
      // Это аналог RLS-проверки в Supabase Storage.
      if (!safePathStr.split("/").includes(userId)) {
        return new Response(JSON.stringify({ error: "path must include your user id" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!(file instanceof File)) {
        return new Response(JSON.stringify({ error: "no file" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (file.size === 0) {
        return new Response(JSON.stringify({ error: "empty file" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (file.size > MAX_BYTES) {
        return new Response(JSON.stringify({ error: "too large" }), {
          status: 413,
          headers: { "Content-Type": "application/json" },
        });
      }
      const mime = (file.type || "application/octet-stream").toLowerCase();
      if (!ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
        return new Response(JSON.stringify({ error: "bad mime", mime }), {
          status: 415,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Запись на диск
      const targetDir = join(UPLOAD_ROOT, bucket, ...safePathStr.split("/").slice(0, -1));
      const fileName = sanitizePathSegment(basename(safePathStr));
      const fullPath = join(targetDir, fileName);
      try {
        await mkdir(targetDir, { recursive: true });
        const buf = Buffer.from(await file.arrayBuffer());
        await writeFile(fullPath, buf);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "write failed", detail: e instanceof Error ? e.message : String(e) }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      const publicPath = `/uploads/${bucket}/${safePathStr}`;
      const url = PUBLIC_URL_BASE ? `${PUBLIC_URL_BASE}${publicPath}` : publicPath;
      return new Response(JSON.stringify({ ok: true, url, path: publicPath }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[upload] unhandled", msg);
      return new Response(JSON.stringify({ error: "handler crashed", detail: msg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
