import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Popup,
  Circle,
  CircleMarker,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "@tanstack/react-router";

export interface MapStadium {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  dist: number;
  inRadius: boolean;
  gamesCount: number;
  games: {
    id: string;
    sport: string;
    level: string;
    starts_at: string;
    price_per_player: number;
  }[];
}

interface Props {
  user: { lat: number; lng: number; label: string };
  radiusKm: number;
  stadiums: MapStadium[];
}

function FitBounds({
  user,
  stadiums,
}: {
  user: { lat: number; lng: number };
  stadiums: MapStadium[];
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [
      [user.lat, user.lng],
      ...stadiums.map((s) => [s.lat, s.lng] as [number, number]),
    ];
    if (points.length < 2) {
      map.setView([user.lat, user.lng], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, user.lat, user.lng, stadiums]);
  return null;
}

function formatGameDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPinIcon(opts: { count: number; muted: boolean }) {
  const { count, muted } = opts;
  const label = count > 0 ? (count > 99 ? "99+" : String(count)) : "";
  const gradId = `pinGrad-${muted ? "m" : "b"}`;
  const stops = muted
    ? '<stop offset="0%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#94a3b8"/>'
    : '<stop offset="0%" stop-color="#A6E1FF"/><stop offset="100%" stop-color="#3FA9FF"/>';
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
    popupAnchor: [0, -40],
  });
}

export default function StadiumsMap({ user, radiusKm, stadiums }: Props) {
  // Avoid SSR
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  // Дополнительная подстраховка: если Leaflet/OSM tile-провайдер всё же впихнули
  // флаг или svg в attribution-контрол — удаляем их рукой через MutationObserver.
  useEffect(() => {
    if (!ready) return;
    const clean = () => {
      document.querySelectorAll(".leaflet-control-attribution").forEach((el) => {
        el.querySelectorAll("svg, img, .leaflet-attribution-flag").forEach((node) => node.remove());
        // Эмодзи-флаги в текстовых нодах
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const toUpdate: Text[] = [];
        while (walker.nextNode()) toUpdate.push(walker.currentNode as Text);
        toUpdate.forEach((tn) => {
          // 🇺🇦 = 🇺🇦
          if (tn.nodeValue) tn.nodeValue = tn.nodeValue.replace(/🇺🇦/g, "");
        });
      });
    };
    clean();
    const observer = new MutationObserver(clean);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [ready]);

  if (!ready) return null;

  return (
    <MapContainer
      center={[user.lat, user.lng]}
      zoom={12}
      scrollWheelZoom
      className="h-[480px] w-full rounded-3xl"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds user={user} stadiums={stadiums} />
      <Circle
        center={[user.lat, user.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.06 }}
      />
      <CircleMarker
        center={[user.lat, user.lng]}
        radius={8}
        pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}
      >
        <Popup>{user.label}</Popup>
      </CircleMarker>
      {stadiums.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={buildPinIcon({ count: s.gamesCount, muted: !s.inRadius })}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{s.address}</div>
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                Расстояние от тебя: {s.dist.toFixed(s.dist < 10 ? 1 : 0)} км
              </div>
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                {s.inRadius
                  ? s.gamesCount > 0
                    ? `Игр в ближайшее время: ${s.gamesCount}`
                    : "В твоём радиусе пока нет ближайших игр"
                  : "Площадка вне выбранного радиуса"}
              </div>
              {s.games.length > 0 ? (
                <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                  {s.games.map((game) => (
                    <Link
                      key={game.id}
                      to="/games/$gameId"
                      params={{ gameId: game.id }}
                      style={{
                        display: "block",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        padding: "8px 10px",
                        background: "#f8fafc",
                        textDecoration: "none",
                        color: "#0f172a",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                        {game.sport} · {game.level}
                      </div>
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {formatGameDate(game.starts_at)} · {game.price_per_player} ₽
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
              <Link
                to="/stadiums/$stadiumId"
                params={{ stadiumId: s.id }}
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "linear-gradient(135deg,#3B82F6,#7CC5F4)",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                К списку игр
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
