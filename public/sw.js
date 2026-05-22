/* eslint-disable no-restricted-globals */
/**
 * Athletic Flow — Service Worker для Web Push + PWA offline shell.
 *
 * Файл лежит в public/, отдаётся как /sw.js (scope: '/').
 * Регистрируется из src/lib/push.ts.
 *
 * Стратегия кэширования: Network-first с offline-fallback.
 * Кэшируем app shell (HTML навигации), чтобы iOS PWA не показывал
 * "сервер недоступен" при холодном старте без сети.
 * Статику (JS/CSS/шрифты/изображения) кэшируем по Cache-first.
 */

const CACHE_NAME = "af-v1";

// Минимальная offline-заглушка (inline, чтобы не зависеть от сети)
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
  <title>Athletic Flow — офлайн</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Inter,-apple-system,sans-serif;background:#0a0a0b;color:#e4e4e7;
      display:flex;align-items:center;justify-content:center;min-height:100dvh;padding:24px}
    .card{text-align:center;max-width:340px}
    .icon{font-size:48px;margin-bottom:16px}
    h1{font-size:20px;font-weight:600;margin-bottom:8px}
    p{font-size:14px;color:#a1a1aa;line-height:1.5;margin-bottom:24px}
    button{background:#22c55e;color:#fff;border:none;border-radius:12px;
      padding:12px 24px;font-size:15px;font-weight:600;cursor:pointer}
    button:active{opacity:.8}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Нет подключения</h1>
    <p>Проверь интернет и попробуй снова. Приложение заработает, как только появится сеть.</p>
    <button onclick="location.reload()">Обновить</button>
  </div>
</body>
</html>`;

self.addEventListener("install", (event) => {
  // Активируемся немедленно, не ждём перезагрузки страницы.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Кэшируем offline-заглушку как Response
      return cache.put(
        new Request("/_offline"),
        new Response(OFFLINE_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Удаляем старые кэши при обновлении SW
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

/**
 * Fetch handler:
 * - Навигация (HTML): network-first → offline fallback
 * - Статика (JS/CSS/шрифты/картинки): stale-while-revalidate
 * - API/Supabase: только network (не кэшируем)
 */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Не трогаем запросы к Supabase, аналитике и прочим внешним API
  if (url.origin !== self.location.origin) return;

  // Навигационные запросы (HTML-страницы)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Кэшируем успешный ответ для будущего offline
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          // Сначала пробуем кэш, потом offline-заглушку
          caches.match(event.request).then(
            (cached) => cached || caches.match("/_offline")
          )
        )
    );
    return;
  }

  // Статика (JS, CSS, шрифты, изображения) — stale-while-revalidate
  if (
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    event.request.destination === "font" ||
    event.request.destination === "image"
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});

// ============================================================
// Push notifications
// ============================================================
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Athletic Flow", body: event.data.text() };
  }

  const title = payload.title || "Athletic Flow";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon.png",
    badge: payload.badge || "/favicon.png",
    data: {
      url: payload.url || "/",
      // Произвольные данные пробрасываем, могут пригодиться в click handler.
      ...(payload.data || {}),
    },
    tag: payload.tag,           // для группировки/замены одинаковых
    renotify: !!payload.renotify,
    requireInteraction: !!payload.requireInteraction,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Если открыта вкладка с приложением — переиспользуем её.
      for (const client of allClients) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* старые браузеры — игнор */
            }
          }
          return;
        }
      }
      // Иначе открываем новое окно.
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
