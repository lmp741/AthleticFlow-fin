import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from '@tanstack/react-router';

function FitBounds({
  user,
  stadiums
}) {
  const map = useMap();
  useEffect(() => {
    const points = [
      [user.lat, user.lng],
      ...stadiums.map((s) => [s.lat, s.lng])
    ];
    if (points.length < 2) {
      map.setView([user.lat, user.lng], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, user.lat, user.lng, stadiums]);
  return null;
}
function formatGameDate(iso) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function buildPinIcon(opts) {
  const { count, muted } = opts;
  const label = count > 0 ? count > 99 ? "99+" : String(count) : "";
  const gradId = `pinGrad-${muted ? "m" : "b"}`;
  const stops = muted ? '<stop offset="0%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#94a3b8"/>' : '<stop offset="0%" stop-color="#A6E1FF"/><stop offset="100%" stop-color="#3FA9FF"/>';
  const opacity = muted ? 0.85 : 1;
  const html = `
    <div style="position:relative;width:34px;height:46px;filter:drop-shadow(0 4px 6px rgba(15,23,42,0.35));opacity:${opacity}">
      <svg width="34" height="46" viewBox="0 0 34 46" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>
        </defs>
        <path d="M17 1 C8 1 1.5 7.5 1.5 16.2 C1.5 27 17 45 17 45 C17 45 32.5 27 32.5 16.2 C32.5 7.5 26 1 17 1 Z"
              fill="url(#${gradId})" stroke="#ffffff" stroke-width="2"/>
        <circle cx="17" cy="16" r="8" fill="#ffffff"/>
      </svg>
      <span style="position:absolute;left:0;top:8px;width:34px;text-align:center;font:700 11px/16px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${muted ? "#475569" : "#1E73C8"};">${label}</span>
    </div>`;
  return L.divIcon({
    html,
    className: "stadium-pin-icon",
    iconSize: [34, 46],
    iconAnchor: [17, 45],
    popupAnchor: [0, -40]
  });
}
function StadiumsMap({ user, radiusKm, stadiums }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return /* @__PURE__ */ jsxs(
    MapContainer,
    {
      center: [user.lat, user.lng],
      zoom: 12,
      scrollWheelZoom: true,
      className: "h-[480px] w-full rounded-3xl",
      style: { zIndex: 0 },
      children: [
        /* @__PURE__ */ jsx(
          TileLayer,
          {
            attribution: '\xA9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        ),
        /* @__PURE__ */ jsx(FitBounds, { user, stadiums }),
        /* @__PURE__ */ jsx(
          Circle,
          {
            center: [user.lat, user.lng],
            radius: radiusKm * 1e3,
            pathOptions: { color: "#2563eb", weight: 1, fillOpacity: 0.06 }
          }
        ),
        /* @__PURE__ */ jsx(
          CircleMarker,
          {
            center: [user.lat, user.lng],
            radius: 8,
            pathOptions: { color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 },
            children: /* @__PURE__ */ jsx(Popup, { children: user.label })
          }
        ),
        stadiums.map((s) => /* @__PURE__ */ jsx(
          Marker,
          {
            position: [s.lat, s.lng],
            icon: buildPinIcon({ count: s.gamesCount, muted: !s.inRadius }),
            children: /* @__PURE__ */ jsx(Popup, { children: /* @__PURE__ */ jsxs("div", { style: { minWidth: 200 }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 2 }, children: s.name }),
              /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "#64748b", marginBottom: 8 }, children: s.address }),
              /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, marginBottom: 8 }, children: [
                "\u0420\u0430\u0441\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043E\u0442 \u0442\u0435\u0431\u044F: ",
                s.dist.toFixed(s.dist < 10 ? 1 : 0),
                " \u043A\u043C"
              ] }),
              /* @__PURE__ */ jsx("div", { style: { fontSize: 12, marginBottom: 8 }, children: s.inRadius ? s.gamesCount > 0 ? `\u0418\u0433\u0440 \u0432 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0432\u0440\u0435\u043C\u044F: ${s.gamesCount}` : "\u0412 \u0442\u0432\u043E\u0451\u043C \u0440\u0430\u0434\u0438\u0443\u0441\u0435 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0445 \u0438\u0433\u0440" : "\u041F\u043B\u043E\u0449\u0430\u0434\u043A\u0430 \u0432\u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0440\u0430\u0434\u0438\u0443\u0441\u0430" }),
              s.games.length > 0 ? /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 6, marginBottom: 10 }, children: s.games.map((game) => /* @__PURE__ */ jsxs(
                Link,
                {
                  to: "/games/$gameId",
                  params: { gameId: game.id },
                  style: {
                    display: "block",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    padding: "8px 10px",
                    background: "#f8fafc",
                    textDecoration: "none",
                    color: "#0f172a"
                  },
                  children: [
                    /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, fontWeight: 700, marginBottom: 2 }, children: [
                      game.sport,
                      " \xB7 ",
                      game.level
                    ] }),
                    /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "#475569" }, children: [
                      formatGameDate(game.starts_at),
                      " \xB7 ",
                      game.price_per_player,
                      " \u20BD"
                    ] })
                  ]
                },
                game.id
              )) }) : null,
              /* @__PURE__ */ jsx(
                Link,
                {
                  to: "/stadiums/$stadiumId",
                  params: { stadiumId: s.id },
                  style: {
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "linear-gradient(135deg,#3B82F6,#7CC5F4)",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none"
                  },
                  children: "\u041A \u0441\u043F\u0438\u0441\u043A\u0443 \u0438\u0433\u0440"
                }
              )
            ] }) })
          },
          s.id
        ))
      ]
    }
  );
}

export { StadiumsMap as default };
//# sourceMappingURL=StadiumsMap-BVQuvNgP.mjs.map
