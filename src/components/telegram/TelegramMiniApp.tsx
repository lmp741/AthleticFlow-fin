import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getTelegramWebApp, isInTelegram } from "@/lib/telegram";

/**
 * Интеграция Telegram Mini App. Рендерит null, только эффекты.
 * Работает лишь когда приложение открыто внутри Telegram (isInTelegram()).
 *  - ready()/expand(): раскрываем на весь экран;
 *  - BackButton → навигация назад по истории роутера;
 *  - start_param (из ?startapp=…) → открываем конкретную игру;
 *  - авто-вход: initData → /api/telegram/auth → verifyOtp → сессия Supabase.
 */
export function TelegramMiniApp() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const triedLogin = useRef(false);
  const handledStart = useRef(false);

  // init + кнопка «назад»
  useEffect(() => {
    const wa = getTelegramWebApp();
    if (!wa || !isInTelegram()) return;
    try {
      wa.ready();
      wa.expand?.();
    } catch {
      /* noop */
    }
    const bb = wa.BackButton;
    const onBack = () => router.history.back();
    bb?.onClick?.(onBack);
    bb?.show?.();
    return () => bb?.offClick?.(onBack);
  }, [router]);

  // deep-link: ?startapp=game_<uuid> или ?startapp=<uuid> → открыть игру
  useEffect(() => {
    if (handledStart.current) return;
    const wa = getTelegramWebApp();
    if (!wa || !isInTelegram()) return;
    const sp = wa.initDataUnsafe?.start_param;
    if (!sp) return;
    handledStart.current = true;
    const id = sp.startsWith("game_") ? sp.slice(5) : sp;
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRe.test(id)) {
      router.navigate({ to: "/games/$gameId", params: { gameId: id } });
    }
  }, [router]);

  // авто-вход
  useEffect(() => {
    if (loading || session || triedLogin.current) return;
    const wa = getTelegramWebApp();
    if (!wa || !isInTelegram()) return;
    triedLogin.current = true;
    (async () => {
      try {
        const res = await fetch("/api/telegram/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: wa.initData }),
        });
        if (!res.ok) {
          console.error("[tg] auth failed", res.status);
          return;
        }
        const data = (await res.json()) as { email?: string; otp?: string };
        if (!data.email || !data.otp) return;
        const { error } = await supabase.auth.verifyOtp({
          email: data.email,
          token: data.otp,
          type: "email",
        });
        if (error) console.error("[tg] verifyOtp", error.message);
      } catch (e) {
        console.error("[tg] auto-login", e);
      }
    })();
  }, [loading, session]);

  return null;
}
