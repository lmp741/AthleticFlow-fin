import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { CallProvider } from "@/components/calls/CallProvider";

// Declare ym for TypeScript (Яндекс.Метрика)
declare global {
  interface Window {
    ym?: (counterId: number, eventName: string, ...rest: unknown[]) => void;
  }
}

const YM_COUNTER_ID = 109248844;

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Athletic Flow" },
      { name: "theme-color", content: "#2563eb" },
      { title: "Athletic Flow — найди игру и собери команду" },
      {
        name: "description",
        content:
          "Athletic Flow — платформа для любительского футбола в Москве: стадионы, команды, бронирование и оплата за 3 клика.",
      },
      { property: "og:title", content: "Athletic Flow — найди игру и собери команду" },
      {
        property: "og:description",
        content: "Поиск игроков, бронирование площадок и оплата за 3 клика.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Athletic Flow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Athletic Flow — найди игру и собери команду" },
      { name: "twitter:description", content: "Поиск игроков, бронирование площадок и оплата за 3 клика." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/379cce6c-926e-4852-bf74-95d95024545d/id-preview-6d5399b8--4d250271-ea5d-4807-874a-e57cab4db334.lovable.app-1777998887252.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/379cce6c-926e-4852-bf74-95d95024545d/id-preview-6d5399b8--4d250271-ea5d-4807-874a-e57cab4db334.lovable.app-1777998887252.png" },
      // Геолокация и язык — для Яндекса и СНГ
      { httpEquiv: "Content-Language", content: "ru-RU" },
      { name: "geo.region", content: "RU-MOW" },
      { name: "geo.placename", content: "Москва" },
      { name: "geo.position", content: "55.7558;37.6176" },
      { name: "ICBM", content: "55.7558, 37.6176" },
      // Подсказка для AI-краулеров (нестандартно, но безопасно)
      { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      // Favicon — PNG из public/favicon.png (заменил вручную).
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/icon-192.png" },
      { rel: "shortcut icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Athletic Flow",
          url: "https://af-sport.ru",
          description:
            "Платформа любительского спорта в Москве: найди игру, собери команду, забронируй стадион.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "ООО «АТЛЕТИК ФЛОУ»",
          legalName: "Общество с ограниченной ответственностью «АТЛЕТИК ФЛОУ»",
          url: "https://af-sport.ru",
          taxID: "5024259241",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Красногорский район, д. Отрадное",
            streetAddress: "ул. Пятницкая, д. 14, кв. 443",
            postalCode: "143442",
            addressRegion: "Московская область",
            addressCountry: "RU",
          },
        }),
      },
      // Яндекс.Метрика — счётчик 109248844, эталонный код из кабинета Метрики.
      // ssr:true — важно для TanStack Start (SSR-приложение).
      // referrer/url берутся из document/location на клиенте (script выполняется в браузере).
      {
        children: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=109248844', 'ym');ym(109248844, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
        {/* Яндекс.Метрика noscript-фоллбек (для пользователей с выключенным JS) */}
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/109248844"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
      </body>
    </html>
  );
}

function YmTracker() {
  // Отправляем hit в Я.Метрику при каждой смене роута (SPA-навигация).
  const location = useRouterState({ select: (s) => s.location });
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.ym !== "function") return;
    window.ym(YM_COUNTER_ID, "hit", window.location.href, {
      title: document.title,
      referer: document.referrer,
    });
  }, [location.pathname, location.searchStr]);
  return null;
}

function RootComponent() {
  // Регистрируем Service Worker при первом рендере для PWA-режима.
  // Это нужно даже без пушей — иначе iOS PWA не кэширует shell.
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      (window.location.protocol === "https:" || window.location.hostname === "localhost")
    ) {
      let cleanupVisibilityListener: (() => void) | undefined;

      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Проверяем обновления сразу при загрузке
          reg.update().catch(() => {});

          // Проверяем обновления при каждом переходе приложения на передний план (foreground)
          const checkUpdate = () => {
            if (document.visibilityState === "visible") {
              reg.update().catch(() => {});
            }
          };
          document.addEventListener("visibilitychange", checkUpdate);
          cleanupVisibilityListener = () => {
            document.removeEventListener("visibilitychange", checkUpdate);
          };
        })
        .catch(() => {
          /* SW не поддерживается или заблокирован — не критично */
        });

      // Автоматически перезагружаем страницу при активации новой версии Service Worker (skipWaiting)
      let refreshing = false;
      const onControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

      return () => {
        if (cleanupVisibilityListener) cleanupVisibilityListener();
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      };
    }
  }, []);

  return (
    <AuthProvider>
      <CallProvider>
        <YmTracker />
        <Outlet />
      </CallProvider>
    </AuthProvider>
  );
}
