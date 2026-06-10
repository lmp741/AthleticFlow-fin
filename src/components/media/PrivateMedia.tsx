import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Приватные чат-медиа (#33).
 *
 * /uploads/chat-images/ и /uploads/dm-media/ закрыты в nginx — файлы
 * раздаются только через /api/media по подписанной ссылке от /api/media-sign.
 * В БД хранятся старые добрые /uploads/-URL — компоненты ниже прозрачно
 * меняют их на подписанные при рендере (старые сообщения работают как есть).
 *
 * Публичные бакеты (avatars, profile-media) проходят насквозь без подписи.
 */

const PRIVATE_RE = /^\/uploads\/((chat-images|dm-media)\/.+)$/;

function privatePath(url: string): string | null {
  let path = url;
  try {
    if (/^https?:/i.test(url)) path = new URL(url).pathname;
  } catch {
    return null;
  }
  const m = path.match(PRIVATE_RE);
  return m ? m[1] : null;
}

// Кэш подписей на сессию + дедупликация одновременных запросов.
const signedCache = new Map<string, string>();
const pendingSign = new Map<string, Promise<string | null>>();

async function requestSign(path: string): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) return null;
  try {
    const r = await fetch("/api/media-sign", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ paths: [path] }),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { urls?: Record<string, string> };
    const signed = data.urls?.[path] ?? null;
    if (signed) signedCache.set(path, signed);
    return signed;
  } catch {
    return null;
  }
}

/**
 * url → подписанный url (для приватных бакетов) или исходный (для публичных).
 * null пока подпись в полёте — рендерим плейсхолдер.
 */
export function useSignedMediaUrl(url: string | null | undefined): string | null {
  const [signed, setSigned] = useState<string | null>(() => {
    if (!url) return null;
    const p = privatePath(url);
    if (!p) return url;
    return signedCache.get(p) ?? null;
  });

  useEffect(() => {
    if (!url) {
      setSigned(null);
      return;
    }
    const p = privatePath(url);
    if (!p) {
      setSigned(url);
      return;
    }
    const cached = signedCache.get(p);
    if (cached) {
      setSigned(cached);
      return;
    }
    let alive = true;
    let promise = pendingSign.get(p);
    if (!promise) {
      promise = requestSign(p).finally(() => pendingSign.delete(p));
      pendingSign.set(p, promise);
    }
    promise.then((s) => {
      if (alive) setSigned(s);
    });
    return () => {
      alive = false;
    };
  }, [url]);

  return signed;
}

/** Картинка-сообщение: ссылка + превью (как в чатах). */
export function PrivateChatImage({
  src,
  linkClassName = "block",
  imgClassName = "mb-1 max-h-80 rounded-xl object-cover",
}: {
  src: string;
  linkClassName?: string;
  imgClassName?: string;
}) {
  const signed = useSignedMediaUrl(src);
  if (!signed) {
    return <div className="mb-1 h-40 w-48 animate-pulse rounded-xl bg-muted/60" />;
  }
  return (
    <a href={signed} target="_blank" rel="noopener noreferrer" className={linkClassName}>
      <img src={signed} alt="Фото в чате" loading="lazy" className={imgClassName} />
    </a>
  );
}

/** Видео-сообщение. */
export function PrivateChatVideo({ src }: { src: string }) {
  const signed = useSignedMediaUrl(src);
  if (!signed) {
    return <div className="mb-1 h-40 w-48 animate-pulse rounded-xl bg-muted/60" />;
  }
  return <video src={signed} controls className="mb-1 max-h-80 rounded-xl" />;
}

/** Документ-сообщение. */
export function PrivateChatDocument({
  src,
  name,
  mine,
}: {
  src: string;
  name: string | null;
  mine: boolean;
}) {
  const signed = useSignedMediaUrl(src);
  return (
    <a
      href={signed ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      download={name ?? undefined}
      className={`mb-1 flex items-center gap-2 rounded-xl px-3 py-2 ${
        mine ? "bg-white/15" : "bg-muted"
      } ${signed ? "" : "pointer-events-none opacity-60"}`}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm">{name ?? "Документ"}</span>
      <Download className="h-4 w-4 shrink-0 opacity-70" />
    </a>
  );
}
