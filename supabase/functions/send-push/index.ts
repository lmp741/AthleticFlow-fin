// deno-lint-ignore-file no-explicit-any
/**
 * Edge Function: send-push
 *
 * Принимает запрос на рассылку уведомлений: пишет в notifications + шлёт Web Push.
 *
 * Запрос:
 *   POST /functions/v1/send-push
 *   Headers:
 *     Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Body:
 *     {
 *       user_ids: string[];          // кому рассылать
 *       type: string;                // game_chat_message | rating_received | …
 *       title: string;
 *       body?: string;
 *       url?: string;                // куда вести по клику
 *       payload?: Record<string, unknown>;
 *       skip_push?: boolean;         // только bell, без Web Push (например, тихий режим)
 *     }
 *
 * ENV:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT  (обычно "mailto:admin@af-sport.ru")
 *
 * Деплой:
 *   supabase functions deploy send-push --no-verify-jwt
 *   (--no-verify-jwt чтобы пускать service_role; авторизацию проверяем сами)
 *
 * Зависимости: web-push через npm-compat Deno.
 */

import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@af-sport.ru";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PushPayload {
  user_ids: string[];
  type: string;
  title: string;
  body?: string;
  url?: string;
  payload?: Record<string, unknown>;
  skip_push?: boolean;
  skip_notification_insert?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Авторизация: только service_role (или admin-ключ). Пользователь не должен
  // напрямую слать пуши кому угодно — это обёртка для серверной логики.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.includes(SERVICE_ROLE_KEY)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let input: PushPayload;
  try {
    input = (await req.json()) as PushPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Bad JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(input.user_ids) || input.user_ids.length === 0 || !input.title || !input.type) {
    return new Response(JSON.stringify({ error: "Missing fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1. Пишем в notifications (по строке на user_id). Bell это сразу подхватит.
  //    Пропускаем INSERT, если вызвано из PG-триггера (уведомление уже вставлено).
  let notifCount = input.user_ids.length;
  if (!input.skip_notification_insert) {
    const notifRows = input.user_ids.map((uid) => ({
      user_id: uid,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      url: input.url ?? null,
      payload: input.payload ?? {},
    }));

    const { error: insErr } = await supabase.from("notifications").insert(notifRows);
    if (insErr) {
      console.error("Failed to insert notifications:", insErr.message);
      // Не падаем — пуш всё равно попробуем.
    }
  }

  // 2. Шлём Web Push на все подписки этих юзеров.
  let pushSent = 0;
  let pushFailed = 0;

  if (!input.skip_push) {
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", input.user_ids);

    if (subsErr) {
      console.error("Failed to load subs:", subsErr.message);
    } else if (subs && subs.length > 0) {
      const pushBody = JSON.stringify({
        title: input.title,
        body: input.body ?? "",
        url: input.url ?? "/",
        data: input.payload ?? {},
        tag: input.type,
      });

      const results = await Promise.allSettled(
        subs.map(async (s: any) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: s.endpoint,
                keys: { p256dh: s.p256dh, auth: s.auth },
              },
              pushBody,
              { TTL: 60 * 60 * 24 }, // 24h
            );
            return { ok: true, id: s.id };
          } catch (err: any) {
            // 410 Gone / 404 Not Found — подписка протухла, чистим.
            const statusCode = err?.statusCode ?? err?.status;
            if (statusCode === 410 || statusCode === 404) {
              await supabase.from("push_subscriptions").delete().eq("id", s.id);
            }
            throw err;
          }
        }),
      );

      pushSent = results.filter((r) => r.status === "fulfilled").length;
      pushFailed = results.filter((r) => r.status === "rejected").length;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      notifications_inserted: input.skip_notification_insert ? 0 : notifCount,
      push_sent: pushSent,
      push_failed: pushFailed,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
