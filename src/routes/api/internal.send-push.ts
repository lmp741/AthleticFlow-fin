import { createServerFileRoute } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

/**
 * Server route: POST /api/internal/send-push
 *
 * Внутренний endpoint рассылки Web Push (#5). Вызывается ИЗ ПОСТГРЕСА
 * (pg_net, триггеры на notifications / direct_messages), не клиентом.
 *
 * Защита: заголовок X-Push-Secret должен совпадать с PUSH_INTERNAL_SECRET.
 *
 * Запрос: { user_id: uuid, title: string, body?: string, url?: string, tag?: string }
 * Ответ:  { ok: true, sent: n, removed: m }
 *
 * Протухшие подписки (404/410 от пуш-сервиса) удаляются автоматически.
 *
 * ENV (.env на VPS):
 *   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY  — npx web-push generate-vapid-keys
 *   VITE_VAPID_PUBLIC_KEY                 — тот же public, для клиента
 *   PUSH_INTERNAL_SECRET                  — openssl rand -hex 32
 *   PUSH_CONTACT                          — mailto для VAPID (default hello@af-sport.ru)
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

let vapidConfigured = false;
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    process.env.PUSH_CONTACT ?? "mailto:hello@af-sport.ru",
    pub,
    priv,
  );
  vapidConfigured = true;
  return true;
}

export const ServerRoute = createServerFileRoute("/api/internal/send-push").methods({
  POST: async ({ request }) => {
    try {
      const secret = process.env.PUSH_INTERNAL_SECRET;
      if (!secret) return json({ error: "push not configured" }, 503);
      if (request.headers.get("x-push-secret") !== secret) {
        return json({ error: "forbidden" }, 403);
      }
      if (!ensureVapid()) return json({ error: "vapid not configured" }, 503);

      const supa = getSupabaseAdmin();
      if (!supa) return json({ error: "server misconfigured" }, 500);

      let body: {
        user_id?: string;
        title?: string;
        body?: string;
        url?: string;
        tag?: string;
      };
      try {
        body = await request.json();
      } catch {
        return json({ error: "bad json" }, 400);
      }
      const userId = body.user_id;
      const title = (body.title ?? "").trim();
      if (!userId || !/^[0-9a-f-]{36}$/i.test(userId) || !title) {
        return json({ error: "bad payload" }, 400);
      }

      const { data: subs, error } = await supa
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", userId);
      if (error) return json({ error: error.message }, 500);
      if (!subs || subs.length === 0) return json({ ok: true, sent: 0, removed: 0 });

      const payload = JSON.stringify({
        title,
        body: body.body ?? "",
        url: body.url ?? "/",
        tag: body.tag,
      });

      let sent = 0;
      const dead: string[] = [];
      await Promise.all(
        subs.map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload,
              { TTL: 3600 },
            );
            sent += 1;
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            // 404/410 — подписка мертва (браузер отписался/переустановлен).
            if (code === 404 || code === 410) dead.push(s.id);
          }
        }),
      );

      if (dead.length) {
        await supa.from("push_subscriptions").delete().in("id", dead);
      }
      if (sent > 0) {
        await supa
          .from("push_subscriptions")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("user_id", userId);
      }

      return json({ ok: true, sent, removed: dead.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[send-push] unhandled", msg);
      return json({ error: "handler crashed", detail: msg }, 500);
    }
  },
});
