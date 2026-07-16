// Доступ к Telegram Mini App SDK (public/telegram-web-app.js).
// Вне Telegram window.Telegram?.WebApp?.initData — пустая строка.

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
    start_param?: string;
  };
  ready: () => void;
  expand?: () => void;
  colorScheme?: "light" | "dark";
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

/** true только если приложение реально открыто внутри Telegram (есть подписанный initData). */
export function isInTelegram(): boolean {
  const wa = getTelegramWebApp();
  return !!wa && typeof wa.initData === "string" && wa.initData.length > 0;
}
