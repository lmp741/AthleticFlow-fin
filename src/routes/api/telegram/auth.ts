import { createServerFileRoute } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

/**
 * Server route: POST /api/telegram/auth
 *
 * Тело: { initData: string } — подписанная Telegram строка из Mini App
 * (window.Telegram.WebApp.initData).
 *
 * Что делает:
 *  1. Проверяет подпись initData секретом бота (HMAC-SHA256 по спеке Telegram).
 *  2. Находит/создаёт пользователя Supabase (email = tg<id>@telegram.af-sport.ru).
 *  3. Через admin.generateLink получает одноразовый OTP и отдаёт его клиенту.
 *     Клиент вызывает supabase.auth.verifyOtp(...) и получает нормальную сессию.
 *
 * OTP возвращается клиенту ТОЛЬКО после успешной проверки подписи Telegram.
 */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Проверка подписи initData по спецификации Telegram Mini Apps. */
function verifyInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, params };
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  // secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return { ok: computed === hash, params };
}

export const ServerRoute = createServerFileRoute("/api/telegram/auth").methods({
  POST: async ({ request }) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!botToken || !supabaseUrl || !serviceKey) {
        console.error("[tg/auth] env missing (token/url/serviceKey)");
        return json({ error: "not configured" }, 500);
      }

      let body: { initData?: string } = {};
      try {
        body = (await request.json()) as { initData?: string };
      } catch {
        return json({ error: "bad body" }, 400);
      }
      const initData = body.initData;
      if (!initData || typeof initData !== "string") return json({ error: "no initData" }, 400);

      // 1. Подпись
      const { ok, params } = verifyInitData(initData, botToken);
      if (!ok) {
        console.error("[tg/auth] BAD SIGNATURE");
        return json({ error: "bad signature" }, 401);
      }

      // Свежесть (не старше суток)
      const authDate = Number(params.get("auth_date") ?? "0");
      if (!authDate || Date.now() / 1000 - authDate > 86400) {
        return json({ error: "expired" }, 401);
      }

      const userRaw = params.get("user");
      if (!userRaw) return json({ error: "no user" }, 400);
      let tg: {
        id: number;
        first_name?: string;
        last_name?: string;
        username?: string;
        photo_url?: string;
      };
      try {
        tg = JSON.parse(userRaw);
      } catch {
        return json({ error: "bad user json" }, 400);
      }
      if (!tg?.id) return json({ error: "bad user" }, 400);

      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const email = `tg${tg.id}@telegram.af-sport.ru`;
      const displayName =
        [tg.first_name, tg.last_name].filter(Boolean).join(" ") || tg.username || "Игрок";

      // 2. Создаём пользователя, если ещё нет (идемпотентно).
      // Профиль (display_name, avatar_url) наполняет триггер handle_new_user из user_metadata.
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          full_name: displayName,
          avatar_url: tg.photo_url ?? null,
          telegram_id: tg.id,
          telegram_username: tg.username ?? null,
        },
      });
      if (createErr && !/already|registered|exist/i.test(createErr.message)) {
        console.error("[tg/auth] createUser", createErr.message);
        return json({ error: "db" }, 500);
      }

      // Для НОВОГО юзера пытаемся проставить @username из Telegram.
      // Ограничения profiles.username: латиница/цифры/_, 3–24 символа, уникально.
      // Если ник длиннее/некорректен/занят — оставляем пустым (юзер задаст сам).
      const newUserId = created?.user?.id;
      if (newUserId && tg.username && /^[A-Za-z0-9_]{3,24}$/.test(tg.username)) {
        const { error: unameErr } = await admin
          .from("profiles")
          .update({ username: tg.username })
          .eq("id", newUserId);
        if (unameErr) {
          // ник занят или не прошёл валидацию — не критично, оставляем NULL
          console.warn("[tg/auth] username not set:", unameErr.message);
        }
      }

      // 3. Одноразовый OTP для входа
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      const otp = link?.properties?.email_otp;
      if (linkErr || !otp) {
        console.error("[tg/auth] generateLink", linkErr?.message);
        return json({ error: "link" }, 500);
      }

      return json({ email, otp });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[tg/auth] unhandled", msg);
      return json({ error: "crashed", detail: msg }, 500);
    }
  },
});
