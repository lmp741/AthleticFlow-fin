import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { CallProvider } from "@/components/calls/CallProvider";

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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
      // Favicon — квадратный SVG из public/. Если нужен .ico — сгенери отдельно.
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "mask-icon", href: "/favicon.svg", color: "#2b39b8" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Athletic Flow",
          url: "https://httpsaf-sport.lovable.app",
          description:
            "Платформа любительского спорта в Москве: найди игру, собери команду, забронируй стадион.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Athletic Flow",
          url: "https://httpsaf-sport.lovable.app",
        }),
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
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <CallProvider>
        <Outlet />
      </CallProvider>
    </AuthProvider>
  );
}
