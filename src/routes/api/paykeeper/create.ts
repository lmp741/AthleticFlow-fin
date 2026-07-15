import { createServerFileRoute } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Server route: POST /api/paykeeper/create
 *
 * Тело: { game_id: string }
 * Заголовок: Authorization: Bearer <supabase access token>
 *
 * Что делает:
 *  1. По токену определяет пользователя.
 *  2. Сам берёт цену игры из БД (клиенту НЕ доверяем — иначе можно "заплатить 1 ₽").
 *  3. Создаёт строку game_payments (status=pending).
 *  4. Возвращает ссылку на платёжную форму PayKeeper с предзаполненными полями.
 *
 * Реальная отметка "оплачено" ставится только в /api/paykeeper/callback,
 * после того как PayKeeper подтвердит платёж своей подписью.
 */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return undefined;
}

const SPORT_RU: Record<string, string> = {
  football: "футбол",
  futsal: "мини-футбол",
  mini_football: "мини-футбол",
  volleyball: "волейбол",
  tennis: "теннис",
};

export const ServerRoute = createServerFileRoute("/api/paykeeper/create").methods({
  POST: async ({ request }) => {
    try {
      const supabaseUrl = getEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
      const anonKey = getEnv(
        "SUPABASE_ANON_KEY",
        "VITE_SUPABASE_ANON_KEY",
        "SUPABASE_PUBLISHABLE_KEY",
        "VITE_SUPABASE_PUBLISHABLE_KEY",
      );
      const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
      const pkUrl = getEnv("PAYKEEPER_URL");
      if (!supabaseUrl || !anonKey || !serviceKey) {
        console.error("[pk/create] supabase env missing");
        return json({ error: "server misconfigured" }, 500);
      }
      if (!pkUrl) {
        console.error("[pk/create] PAYKEEPER_URL not set");
        return json({ error: "payment not configured" }, 500);
      }

      // 1. Пользователь по Bearer-токену
      const authHeader = request.headers.get("Authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (!token) return json({ error: "unauthorized" }, 401);

      const supaUser = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await supaUser.auth.getUser();
      const user = userData?.user;
      if (userErr || !user) return json({ error: "unauthorized" }, 401);

      // 2. Тело
      let body: { game_id?: string } = {};
      try {
        body = (await request.json()) as { game_id?: string };
      } catch {
        return json({ error: "bad body" }, 400);
      }
      const gameId = body.game_id;
      if (!gameId || typeof gameId !== "string") return json({ error: "game_id required" }, 400);

      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

      // 3. Игра + цена (из БД, не от клиента)
      const { data: game, error: gErr } = await admin
        .from("games")
        .select("id, sport, starts_at, price_per_player, archived_at")
        .eq("id", gameId)
        .maybeSingle();
      if (gErr) {
        console.error("[pk/create] game read", gErr.message);
        return json({ error: "db error" }, 500);
      }
      if (!game) return json({ error: "game not found" }, 404);
      if (game.archived_at) return json({ error: "game finished" }, 409);

      const amount = Math.round(Number(game.price_per_player));
      if (!Number.isFinite(amount) || amount <= 0) {
        return json({ error: "bad price" }, 409);
      }

      // Пользователь должен быть участником игры
      const { data: part, error: pErr } = await admin
        .from("game_participants")
        .select("id, paid")
        .eq("game_id", gameId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (pErr) {
        console.error("[pk/create] participant read", pErr.message);
        return json({ error: "db error" }, 500);
      }
      if (!part) return json({ error: "not a participant" }, 403);
      if (part.paid) return json({ alreadyPaid: true }, 200);

      // Данные плательщика для чека
      const { data: profile } = await admin
        .from("profiles")
        .select("display_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      // 4. Строка платежа
      const { data: payment, error: insErr } = await admin
        .from("game_payments")
        .insert({
          game_id: gameId,
          user_id: user.id,
          participant_id: part.id,
          amount,
          status: "pending",
        })
        .select("id")
        .single();
      if (insErr || !payment) {
        console.error("[pk/create] payment insert", insErr?.message);
        return json({ error: "db error" }, 500);
      }

      // 5. Ссылка на форму PayKeeper
      const sportRu = SPORT_RU[String(game.sport)] ?? "игре";
      const dt = new Date(game.starts_at);
      const dateRu = Number.isNaN(dt.getTime())
        ? ""
        : ` ${dt.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
      const serviceName = `Athletic Flow — участие в ${sportRu}${dateRu}`;

      const form = new URL("/order/inline/", pkUrl);
      form.searchParams.set("sum", String(amount));
      form.searchParams.set("orderid", payment.id);
      form.searchParams.set("clientid", profile?.display_name || user.email || "Игрок");
      if (user.email) form.searchParams.set("client_email", user.email);
      if (profile?.phone) form.searchParams.set("client_phone", profile.phone);
      form.searchParams.set("service_name", serviceName);

      return json({ url: form.toString(), payment_id: payment.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[pk/create] unhandled", msg);
      return json({ error: "handler crashed", detail: msg }, 500);
    }
  },
});
