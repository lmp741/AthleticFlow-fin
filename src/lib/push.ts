/**
 * Web Push: регистрация Service Worker, подписка/отписка пользователя.
 *
 * Использование:
 *   import { isPushSupported, getPushStatus, enablePush, disablePush } from "@/lib/push";
 *
 * Перед первым использованием в env должны быть:
 *   VITE_VAPID_PUBLIC_KEY=<base64url public key>
 *
 * Public key генерируется один раз через `npx web-push generate-vapid-keys`
 * (или на https://vapidkeys.com). Private key хранится в Supabase secrets
 * и используется только Edge Function send-push.
 */

import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const SW_URL = "/sw.js";

export type PushStatus =
  | "unsupported"        // нет SW / нет PushManager / нет Notification API
  | "not-configured"     // нет VITE_VAPID_PUBLIC_KEY в env
  | "denied"             // пользователь отказал в Notification permission
  | "subscribed"         // подписан, всё работает
  | "default";           // ничего не запрашивали (или permission='default')

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Текущее состояние пушей: пытается достать существующую подписку без
 * запроса разрешения.
 */
export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  if (Notification.permission === "denied") return "denied";

  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) return "subscribed";
  } catch {
    /* ignore */
  }
  return Notification.permission === "granted" ? "default" : "default";
}

/**
 * Включить пуши:
 *  1. Регистрирует SW
 *  2. Запрашивает permission
 *  3. Создаёт push subscription
 *  4. Сохраняет endpoint+keys в БД
 *
 * Возвращает true если успешно, false если отказ или ошибка (с тостом извне).
 */
export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "not-configured" };

  // 1. SW
  const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;

  // 2. permission
  if (Notification.permission === "default") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "denied" };
  } else if (Notification.permission === "denied") {
    return { ok: false, reason: "denied" };
  }

  // 3. subscription
  let sub = await reg.pushManager.getSubscription();
  // Если подписка существует, но подписана ДРУГИМ VAPID-ключом (остатки от
  // Cloud-эры) — пересоздаём: пуши на неё всё равно не доставятся (403).
  if (sub) {
    const currentKey = sub.options?.applicationServerKey
      ? btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey)))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "")
      : null;
    if (currentKey && currentKey !== VAPID_PUBLIC_KEY) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
      sub = null;
    }
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  // 4. сохраняем в БД (upsert по endpoint)
  const json = sub.toJSON();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    // Если пользователь вышел — подписка не нужна, отменяем
    await sub.unsubscribe();
    return { ok: false, reason: "not-authenticated" };
  }

  const endpoint = json.endpoint ?? sub.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, reason: "no-keys" };
  }

  // onConflict по endpoint — устройство переподписалось, обновляем владельца/last_seen
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userData.user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  if (error) {
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

/**
 * Отключить пуши: убираем подписку у браузера + удаляем строку из БД.
 */
export async function disablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: true };
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

/**
 * VAPID public key (base64url) → Uint8Array для PushManager.subscribe.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
