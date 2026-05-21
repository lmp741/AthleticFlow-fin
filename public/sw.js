/* eslint-disable no-restricted-globals */
/**
 * Athletic Flow — Service Worker для Web Push.
 *
 * Файл лежит в public/, отдаётся как /sw.js (scope: '/').
 * Регистрируется из src/lib/push.ts.
 *
 * Минимальный SW: только push + клик. Никаких offline-кэшей, чтобы не ломать
 * SSR-страницы TanStack Start и не мешать обновлению ассетов.
 */

self.addEventListener("install", (event) => {
  // Активируемся немедленно, не ждём перезагрузки страницы.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

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
