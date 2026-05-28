import { supabase } from "@/integrations/supabase/client";

/**
 * Универсальный аплоадер файлов.
 *
 * Из-за проблем с прохождением больших multipart-потоков от российских VPS
 * к Supabase Storage (ТСПУ режет соединения к 8.6.x/8.47.x) файлы хранятся
 * локально на VPS, в `/var/www/af-sport/uploads/`. Endpoint `/api/upload`
 * принимает multipart, кладёт файл на диск, отдаёт публичный URL `/uploads/...`.
 *
 * Использование:
 *   const { url } = await uploadToBucket("chat-images", `${gameId}/${userId}/${name}`, file);
 *   // url = "/uploads/chat-images/<gameId>/<userId>/<name>"
 */
export async function uploadToBucket(
  bucket: "chat-images" | "dm-media" | "avatars" | "profile-media",
  path: string,
  file: File,
): Promise<{ url: string; path: string }> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const fd = new FormData();
  fd.set("bucket", bucket);
  fd.set("path", path);
  fd.set("file", file);

  const r = await fetch("/api/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // ВАЖНО: НЕ задавай Content-Type сам — браузер должен прописать boundary.
      Accept: "application/json",
    },
    body: fd,
  });

  const text = await r.text();
  let data: { ok?: boolean; url?: string; path?: string; error?: string; detail?: string } = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* server вернул не-JSON, fallback ниже */
  }
  if (!r.ok || !data.ok || !data.url) {
    const msg = data.error ?? `HTTP ${r.status}`;
    throw new Error(data.detail ? `${msg}: ${data.detail}` : msg);
  }
  return { url: data.url, path: data.path ?? data.url };
}
