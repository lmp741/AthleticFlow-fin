import { createServerFileRoute } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { Readable } from "node:stream";

/**
 * Server route: GET /api/media?p=<bucket/path>&e=<expiry unix>&s=<hmac hex>
 *
 * Раздаёт ПРИВАТНЫЕ медиа (chat-images, dm-media) по подписанной ссылке
 * от /api/media-sign. Прямой /uploads/ для этих бакетов закрыт в nginx.
 *
 * Проверки: бакет приватный, срок не истёк, HMAC-подпись валидна
 * (timingSafeEqual). Поддерживает Range (перемотка видео).
 */

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? "/var/www/af-sport/uploads";
const PRIVATE_BUCKETS = new Set(["chat-images", "dm-media"]);

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".pdf": "application/pdf",
};

function getSecret(): string | null {
  return process.env.MEDIA_SIGN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

function validPath(p: string): boolean {
  if (!p || p.includes("..") || p.includes("\\") || p.startsWith("/")) return false;
  if (!/^[A-Za-z0-9._/-]+$/.test(p)) return false;
  const parts = p.split("/");
  return parts.length >= 2 && PRIVATE_BUCKETS.has(parts[0]);
}

export const ServerRoute = createServerFileRoute("/api/media").methods({
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const p = url.searchParams.get("p") ?? "";
      const e = Number(url.searchParams.get("e") ?? 0);
      const s = url.searchParams.get("s") ?? "";

      const secret = getSecret();
      if (!secret) return new Response("server misconfigured", { status: 500 });

      if (!validPath(p) || !Number.isFinite(e) || !/^[0-9a-f]{64}$/.test(s)) {
        return new Response("bad request", { status: 400 });
      }
      if (e < Math.floor(Date.now() / 1000)) {
        return new Response("link expired", { status: 403 });
      }
      const expected = createHmac("sha256", secret).update(`${p}:${e}`).digest();
      const given = Buffer.from(s, "hex");
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        return new Response("bad signature", { status: 403 });
      }

      const fullPath = join(UPLOAD_ROOT, ...p.split("/"));
      let st;
      try {
        st = await stat(fullPath);
      } catch {
        return new Response("not found", { status: 404 });
      }
      if (!st.isFile()) return new Response("not found", { status: 404 });

      const mime = MIME[extname(fullPath).toLowerCase()] ?? "application/octet-stream";
      const baseHeaders: Record<string, string> = {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
        "Accept-Ranges": "bytes",
        // На случай SVG/HTML-подделок под другим расширением.
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      };

      // Range — нужен для перемотки <video>.
      const range = request.headers.get("range");
      if (range) {
        const m = range.match(/^bytes=(\d*)-(\d*)$/);
        if (m && (m[1] !== "" || m[2] !== "")) {
          let start = m[1] === "" ? st.size - Number(m[2]) : Number(m[1]);
          let end = m[1] !== "" && m[2] !== "" ? Number(m[2]) : st.size - 1;
          start = Math.max(0, start);
          end = Math.min(end, st.size - 1);
          if (start <= end) {
            const stream = Readable.toWeb(
              createReadStream(fullPath, { start, end }),
            ) as ReadableStream;
            return new Response(stream, {
              status: 206,
              headers: {
                ...baseHeaders,
                "Content-Range": `bytes ${start}-${end}/${st.size}`,
                "Content-Length": String(end - start + 1),
              },
            });
          }
        }
        return new Response("bad range", {
          status: 416,
          headers: { "Content-Range": `bytes */${st.size}` },
        });
      }

      const stream = Readable.toWeb(createReadStream(fullPath)) as ReadableStream;
      return new Response(stream, {
        status: 200,
        headers: { ...baseHeaders, "Content-Length": String(st.size) },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[media] unhandled", msg);
      return new Response("handler crashed", { status: 500 });
    }
  },
});
