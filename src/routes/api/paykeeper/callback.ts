import { createServerFileRoute } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

/**
 * Server route: POST /api/paykeeper/callback
 *
 * Сюда PayKeeper шлёт POST (application/x-www-form-urlencoded) после оплаты.
 * Поля: id, sum, clientid, orderid, key.
 *
 *   key = md5(id + sum + clientid + orderid + СЕКРЕТНОЕ_СЛОВО)
 *
 * Мы:
 *  1. Проверяем подпись секретным словом.
 *  2. Сверяем сумму с той, что записали при создании платежа.
 *  3. Ставим game_payments.status='paid' и game_participants.paid=true.
 *  4. Отвечаем строкой "OK <md5(id + СЕКРЕТНОЕ_СЛОВО)>" — иначе PayKeeper
 *     будет присылать уведомление повторно.
 *
 * ВАЖНО: порядок склейки в формуле подписи нужно подтвердить тестовым платежом
 * (тестовый режим PayKeeper). Если у конкретной версии порядок иной — правится
 * только функция expectedKey() ниже.
 */

const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");

function expectedKey(
  p: { id: string; sum: string; clientid: string; orderid: string },
  secret: string,
) {
  return md5(p.id + p.sum + p.clientid + p.orderid + secret);
}

function textResponse(body: string) {
  // PayKeeper читает тело ответа; успех — если начинается с "OK".
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export const ServerRoute = createServerFileRoute("/api/paykeeper/callback").methods({
  POST: async ({ request }) => {
    try {
      const secret = process.env.PAYKEEPER_SECRET;
      const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!secret || !supabaseUrl || !serviceKey) {
        console.error("[pk/callback] env missing (secret/url/serviceKey)");
        return textResponse("Error: server misconfigured");
      }

      const raw = await request.text();
      const params = new URLSearchParams(raw);
      const id = params.get("id") ?? "";
      const sum = params.get("sum") ?? "";
      const clientid = params.get("clientid") ?? "";
      const orderid = params.get("orderid") ?? "";
      const key = (params.get("key") ?? "").toLowerCase();

      if (!id || !orderid || !key) {
        console.error("[pk/callback] missing fields", { id, orderid, hasKey: !!key });
        return textResponse("Error: bad request");
      }

      // 1. Подпись
      const expect = expectedKey({ id, sum, clientid, orderid }, secret);
      if (expect !== key) {
        console.error("[pk/callback] BAD SIGNATURE for order", orderid);
        return textResponse("Error: bad signature");
      }

      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

      // Находим наш платёж (orderid = game_payments.id)
      const { data: payment, error: readErr } = await admin
        .from("game_payments")
        .select("id, participant_id, amount, status")
        .eq("id", orderid)
        .maybeSingle();
      if (readErr) {
        console.error("[pk/callback] payment read", readErr.message);
        return textResponse("Error: db");
      }
      if (!payment) {
        console.error("[pk/callback] payment not found", orderid);
        return textResponse("Error: order not found");
      }

      // Идемпотентность: если уже оплачено — просто подтверждаем.
      if (payment.status === "paid") {
        return textResponse(`OK ${md5(id + secret)}`);
      }

      // 2. Сверяем сумму (защита от подмены суммы в ссылке формы).
      const paidSum = parseFloat(sum.replace(",", "."));
      if (!Number.isFinite(paidSum) || paidSum + 0.01 < payment.amount) {
        console.error("[pk/callback] AMOUNT MISMATCH", {
          orderid,
          expected: payment.amount,
          got: sum,
        });
        await admin
          .from("game_payments")
          .update({ status: "failed", pk_payment_id: id })
          .eq("id", orderid)
          .eq("status", "pending");
        // Деньги у PayKeeper приняты — не заставляем ретраить, но НЕ засчитываем.
        return textResponse(`OK ${md5(id + secret)}`);
      }

      // 3. Отмечаем оплату
      const nowIso = new Date().toISOString();
      const { error: upErr } = await admin
        .from("game_payments")
        .update({ status: "paid", paid_at: nowIso, pk_payment_id: id })
        .eq("id", orderid)
        .eq("status", "pending");
      if (upErr) {
        console.error("[pk/callback] payment update", upErr.message);
        return textResponse("Error: db");
      }

      if (payment.participant_id) {
        const { error: partErr } = await admin
          .from("game_participants")
          .update({ paid: true })
          .eq("id", payment.participant_id);
        if (partErr) {
          console.error("[pk/callback] participant update", partErr.message);
          // платёж записан как paid, но галка участника не встала — залогируем громко
        }
      }

      // 4. Подтверждение PayKeeper
      return textResponse(`OK ${md5(id + secret)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[pk/callback] unhandled", msg);
      return textResponse("Error: crashed");
    }
  },
});
