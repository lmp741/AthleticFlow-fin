import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Search, Calendar as CalendarIcon, Clock, MapPin, Users, Navigation, Loader2, ChevronDown, Check, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const StadiumsMap = lazy(() => import("@/components/maps/StadiumsMap"));
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

import { toast } from "sonner";

export const Route = createFileRoute("/games")({
  validateSearch: (search: Record<string, unknown>) => {
    const when = search.when;
    const allowed = ["today", "tomorrow", "week", "2weeks"] as const;
    const stadium = typeof search.stadium === "string" ? search.stadium : undefined;
    const sport = typeof search.sport === "string" ? search.sport : undefined;
    const q = typeof search.q === "string" ? search.q : undefined;
    return {
      when: (allowed as readonly string[]).includes(when as string)
        ? (when as (typeof allowed)[number])
        : undefined,
      stadium,
      sport,
      q,
    };
  },
  head: () => ({
    meta: [
      { title: "Игры — Athletic Flow" },
      {
        name: "description",
        content:
          "Каталог любительских игр в Москве: футбол, баскетбол, волейбол и ещё 15+ видов. Выбирай дату, уровень и стадион рядом с тобой.",
      },
      { property: "og:title", content: "Игры — Athletic Flow" },
      { property: "og:description", content: "Каталог любительских игр в Москве по 15+ видам спорта." },
      { property: "og:url", content: "https://af-sport.ru/games" },
    ],
    links: [{ rel: "canonical", href: "https://af-sport.ru/games" }],
  }),
  component: GamesPage,
});

const sports = [
  "Все",
  "Футбол",
  "Футзал",
  "Баскетбол",
  "Волейбол",
  "Пляжный волейбол",
  "Хоккей",
  "Хоккей на траве",
  "Регби",
  "Американский футбол",
  "Гандбол",
  "Бейсбол",
  "Водное поло",
  "Флорбол",
  "Фрисби",
  "Падел",
  "Теннис",
] as const;
const levels = ["Любой", "Новичок", "Любитель", "Полупрофи", "Профи"] as const;
const timeSlots = [
  { id: "any", label: "Любое время", h: [0, 24] as [number, number] },
  { id: "morning", label: "Утро 6–12", h: [6, 12] as [number, number] },
  { id: "day", label: "День 12–17", h: [12, 17] as [number, number] },
  { id: "evening", label: "Вечер 17–23", h: [17, 23] as [number, number] },
] as const;

async function geocodeMoscow(
  text: string,
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number } | null> {
  // Через наш server route (/api/geocode) — кэш в supabase + Я.Геокодер.
  // Никаких прямых обращений к Nominatim — там лимит 1 req/sec и быстрый бан.
  const looksLikeMoscow = /москв|moscow/i.test(text);
  const queries = [
    looksLikeMoscow ? text : `Москва, ${text}`,
    text,
  ];
  for (const q of queries) {
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
        headers: { Accept: "application/json" },
        signal,
      });
      if (!r.ok) continue;
      const data = (await r.json()) as { lat: number; lng: number; label?: string };
      if (Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        return { lat: data.lat, lng: data.lng };
      }
    } catch {
      // try next variant
    }
  }
  return null;
}

interface SuggestItem {
  lat: number;
  lng: number;
  label: string;
}

/**
 * Запрос автодополнения адреса. Если в строке нет «москва» — префиксуем,
 * чтобы Я.Геокодер не отдавал результаты из других городов.
 */
async function suggestMoscow(text: string, signal?: AbortSignal): Promise<SuggestItem[]> {
  const t = text.trim();
  if (t.length < 3) return [];
  const looksLikeMoscow = /москв|moscow/i.test(t);
  const q = looksLikeMoscow ? t : `Москва, ${t}`;
  try {
    const r = await fetch(`/api/geocode-suggest?q=${encodeURIComponent(q)}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!r.ok) return [];
    const data = (await r.json()) as { items?: SuggestItem[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

/**
 * Хук с дебаунсом для автодополнения. 350ms — комфорт между «инстант» и «не сожрать квоту».
 */
function useAddressSuggest(input: string, enabled: boolean) {
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }
    const t = input.trim();
    if (t.length < 3) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const id = window.setTimeout(async () => {
      const list = await suggestMoscow(t, ctrl.signal);
      if (!ctrl.signal.aborted) {
        setItems(list);
        setLoading(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(id);
      ctrl.abort();
    };
  }, [input, enabled]);
  return { items, loading };
}

const moscowSpots: { name: string; lat: number; lng: number }[] = [
  { name: "Центр (Кремль)", lat: 55.752, lng: 37.6175 },
  { name: "Сокольники", lat: 55.7942, lng: 37.677 },
  { name: "Лужники", lat: 55.7158, lng: 37.5536 },
  { name: "Крылатское", lat: 55.757, lng: 37.4253 },
  { name: "Черкизовская", lat: 55.8045, lng: 37.7448 },
  { name: "ВДНХ", lat: 55.8294, lng: 37.6325 },
  { name: "Тушино", lat: 55.8267, lng: 37.4364 },
  { name: "Чертаново", lat: 55.624, lng: 37.6112 },
];

interface GameRow {
  id: string;
  sport: string;
  level: string;
  starts_at: string;
  ends_at: string;
  price_per_player: number;
  slots_total: number;
  stadium: {
    id: string;
    name: string;
    address: string;
    lat: number | null;
    lng: number | null;
  } | null;
  participants: { count: number }[];
}

interface MapGamePreview {
  id: string;
  sport: string;
  level: string;
  starts_at: string;
  price_per_player: number;
}

interface MapStadiumRow {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  dist: number;
  inRadius: boolean;
  games: MapGamePreview[];
  gamesCount: number;
}

interface UserLoc {
  lat: number;
  lng: number;
  label: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Сегодня";
  if (same(d, tomorrow)) return "Завтра";
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// Haversine distance, km
function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const LOC_KEY = "af.userLoc";

function GamesPage() {
  const { when, stadium: stadiumParam, sport: sportParam, q: qParam } = Route.useSearch();
  const initialSport = ((): (typeof sports)[number] => {
    if (sportParam && (sports as readonly string[]).includes(sportParam)) {
      return sportParam as (typeof sports)[number];
    }
    return "Все";
  })();
  const [sport, setSport] = useState<(typeof sports)[number]>(initialSport);
  const [level, setLevel] = useState<(typeof levels)[number]>("Любой");
  const [timeId, setTimeId] = useState<(typeof timeSlots)[number]["id"]>("any");
  // Если sport приходит в URL, подменяем при изменении (например, юзер ткнул чип «Футбол» на главной)
  useEffect(() => {
    if (sportParam && (sports as readonly string[]).includes(sportParam)) {
      setSport(sportParam as (typeof sports)[number]);
    }
  }, [sportParam]);
  const [untilDate, setUntilDate] = useState<Date | undefined>(() => {
    if (!when) return undefined;
    const daysMap = { today: 0, tomorrow: 1, week: 7, "2weeks": 14 } as const;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysMap[when as keyof typeof daysMap]);
    return d;
  });
  useEffect(() => {
    if (!when) return;
    const daysMap = { today: 0, tomorrow: 1, week: 7, "2weeks": 14 } as const;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysMap[when as keyof typeof daysMap]);
    setUntilDate(d);
  }, [when]);
  const [q, setQ] = useState(qParam ?? stadiumParam ?? "");
  useEffect(() => {
    if (stadiumParam) setQ(stadiumParam);
    else if (qParam) setQ(qParam);
  }, [stadiumParam, qParam]);
  const [games, setGames] = useState<GameRow[] | null>(null);
  const [allStadiums, setAllStadiums] = useState<
    { id: string; name: string; address: string; lat: number | null; lng: number | null }[]
  >([]);
  const [loc, setLoc] = useState<UserLoc | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [showMap, setShowMap] = useState<boolean>(true);
  const [osmSpots, setOsmSpots] = useState<
    { id: string; name: string; address: string; lat: number; lng: number }[]
  >([]);
  const [osmLoading, setOsmLoading] = useState(false);

  // restore saved location
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOC_KEY);
      if (raw) setLoc(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!loc) return;
    (async () => {
      const { data, error } = await supabase
        .from("games")
        .select(
          "id, sport, level, starts_at, ends_at, price_per_player, slots_total, stadium:stadiums(id,name,address,lat,lng), participants:game_participants(count)",
        )
        .gte("starts_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order("starts_at", { ascending: true });
      if (!error && data) setGames(data as unknown as GameRow[]);
      else setGames([]);
    })();
  }, [loc]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("stadiums").select("id,name,address,lat,lng");
      setAllStadiums(data ?? []);
    })();
  }, []);

  // Public OSM-площадки — через наш бэк /api/pitches (кэш в supabase + Overpass).
  // Раньше клиент дёргал Overpass напрямую → rate-limit + лёгкая мишень для 5К.
  useEffect(() => {
    if (!loc) return;
    const ctrl = new AbortController();
    setOsmLoading(true);
    const r = Math.max(2000, radiusKm * 1000);
    (async () => {
      try {
        const res = await fetch(
          `/api/pitches?lat=${loc.lat}&lng=${loc.lng}&radius=${r}`,
          { signal: ctrl.signal, headers: { Accept: "application/json" } },
        );
        if (!res.ok) {
          setOsmSpots([]);
          return;
        }
        const json = (await res.json()) as {
          items: Array<{ id: string; name: string; address: string; lat: number; lng: number }>;
        };
        setOsmSpots(json.items ?? []);
      } catch {
        // aborted or network — ignore
      } finally {
        setOsmLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [loc, radiusKm]);

  const enriched = useMemo(() => {
    if (!games || !loc) return [];
    const slot = timeSlots.find((t) => t.id === timeId)!;
    return games
      .map((g) => {
        const s = g.stadium;
        const dist =
          s && s.lat != null && s.lng != null
            ? distKm({ lat: loc.lat, lng: loc.lng }, { lat: s.lat, lng: s.lng })
            : Number.POSITIVE_INFINITY;
        return { g, dist };
      })
      .filter(({ g, dist }) => {
        if (dist > radiusKm) return false;
        const startsAt = new Date(g.starts_at);
        const h = startsAt.getHours();
        if (h < slot.h[0] || h >= slot.h[1]) return false;
        if (untilDate) {
          const end = new Date(untilDate);
          end.setHours(23, 59, 59, 999);
          if (startsAt > end) return false;
        }
        if (sport !== "Все" && g.sport !== sport) return false;
        if (level !== "Любой" && g.level !== level) return false;
        if (q) {
          // Поиск ищет одновременно в названии стадиона, адресе и виде спорта.
          // Раньше совпадал только по name — поэтому набор «Тверская» ничего не давал,
          // хотя адреса с этим словом есть.
          const haystack = [
            g.stadium?.name ?? "",
            g.stadium?.address ?? "",
            g.sport,
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => a.dist - b.dist);
  }, [games, loc, sport, level, q, timeId, radiusKm, untilDate]);

  // Stadiums for map: all stadiums in radius, with count of upcoming games
  const mapStadiums = useMemo<MapStadiumRow[]>(() => {
    if (!loc) return [];
    const gamesByStadium = new Map<string, MapGamePreview[]>();
    enriched.forEach(({ g }) => {
      if (!g.stadium) return;
      const stadiumGames = gamesByStadium.get(g.stadium.id) ?? [];
      stadiumGames.push({
        id: g.id,
        sport: g.sport,
        level: g.level,
        starts_at: g.starts_at,
        price_per_player: g.price_per_player,
      });
      gamesByStadium.set(g.stadium.id, stadiumGames);
    });

    const query = q.trim().toLowerCase();

    const dbStadiums = allStadiums
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        lat: s.lat as number,
        lng: s.lng as number,
        gamesPreview: (gamesByStadium.get(s.id) ?? []).slice(0, 3),
        gamesTotal: (gamesByStadium.get(s.id) ?? []).length,
      }));

    // Add OSM spots that are not already in DB (dedupe by ~120 m proximity)
    const osmExtra = osmSpots
      .filter(
        (o) =>
          !dbStadiums.some(
            (d) => distKm({ lat: d.lat, lng: d.lng }, { lat: o.lat, lng: o.lng }) < 0.12,
          ),
      )
      .map((o) => ({
        id: o.id,
        name: o.name,
        address: o.address,
        lat: o.lat,
        lng: o.lng,
        gamesPreview: [] as MapGamePreview[],
        gamesTotal: 0,
      }));

    return [...dbStadiums, ...osmExtra]
      .filter((s) =>
        query
          ? s.name.toLowerCase().includes(query) || s.address.toLowerCase().includes(query)
          : true,
      )
      .map((s) => {
        const dist = distKm({ lat: loc.lat, lng: loc.lng }, { lat: s.lat, lng: s.lng });
        return {
          id: s.id,
          name: s.name,
          address: s.address,
          lat: s.lat,
          lng: s.lng,
          dist,
          inRadius: dist <= radiusKm,
          games: s.gamesPreview,
          gamesCount: s.gamesTotal,
        };
      })
      .sort((a, b) => a.dist - b.dist);
  }, [allStadiums, osmSpots, enriched, loc, q, radiusKm]);

  const setUserLoc = (next: UserLoc) => {
    setLoc(next);
    try {
      localStorage.setItem(LOC_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  if (!loc) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <LocationGate onPick={setUserLoc} />
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden bg-gradient-hero py-10 md:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,white,transparent_50%)] opacity-15" />
        <div className="relative container mx-auto px-4 sm:px-6">
          <Badge className="mb-3 border-white/30 bg-white/10 text-white">
            Москва · {loc.label}
          </Badge>
          <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
            Игры рядом с тобой
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
            Сначала ближайшие — отсортированы по расстоянию от точки «{loc.label}».
          </p>
          <p className="mt-2 max-w-xl text-xs text-white/70">
            Используешь VPN или геолокация показывает не туда? Введи свой адрес или район вручную.
          </p>
          <ManualLocationBar onPick={setUserLoc} onReset={() => setLoc(null)} />
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-card sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Стадион, район…"
                className="h-11 pl-10"
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Радиус
              </span>
              <input
                type="range"
                min={2}
                max={40}
                step={1}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="accent-primary"
              />
              <span className="w-12 text-right font-display text-sm font-bold">{radiusKm} км</span>
            </div>
            <Button
              asChild
              className="bg-gradient-brand text-primary-foreground hover:opacity-90 h-11"
            >
              <Link to="/create">+ Создать игру</Link>
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Сегодня", days: 0 },
              { label: "Завтра", days: 1 },
              { label: "На неделе", days: 7 },
              { label: "2 недели", days: 14 },
            ].map((p) => {
              const target = new Date();
              target.setHours(0, 0, 0, 0);
              target.setDate(target.getDate() + p.days);
              const active =
                untilDate &&
                untilDate.toDateString() === target.toDateString();
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setUntilDate(active ? undefined : target)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                    active
                      ? "border-transparent bg-gradient-brand text-primary-foreground shadow-glow"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <FilterDropdown
              label="Время"
              items={timeSlots.map((t) => t.label)}
              value={timeSlots.find((t) => t.id === timeId)!.label}
              onChange={(v) =>
                setTimeId((timeSlots.find((t) => t.label === v)?.id ?? "any") as typeof timeId)
              }
            />
            <FilterDropdown
              label="Вид спорта"
              items={sports as readonly string[]}
              value={sport}
              onChange={(v) => setSport(v as typeof sport)}
            />
            <FilterDropdown
              label="Уровень"
              items={levels as readonly string[]}
              value={level}
              onChange={(v) => setLevel(v as typeof level)}
            />
            <DateUntilFilter value={untilDate} onChange={setUntilDate} />
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Карта</p>
              <h3 className="font-display text-lg font-semibold">
                Стадионы в радиусе {radiusKm} км
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowMap((v) => !v)}>
              {showMap ? "Скрыть" : "Показать"}
            </Button>
          </div>
          {showMap && (
            <div className="px-3 pb-4">
              <Suspense fallback={<Skeleton className="h-[480px] w-full rounded-3xl" />}>
                <StadiumsMap user={loc} radiusKm={radiusKm} stadiums={mapStadiums} />
              </Suspense>
              <p className="mt-3 px-2 text-xs text-muted-foreground">
                На карте — наши стадионы и открытые городские площадки (включая бесплатные
                дворовые) из OpenStreetMap. Яркие маркеры — в твоём радиусе, приглушённые — за его
                пределами.{osmLoading ? " Загружаем дворовые площадки…" : ""}
              </p>
            </div>
          )}
        </div>

        {games === null ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-3xl" />
            ))}
          </div>
        ) : enriched.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              В радиусе {radiusKm} км и под выбранное время игр пока нет. Расширь радиус или создай
              свою.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                asChild
                className="bg-gradient-brand text-primary-foreground hover:opacity-90"
              >
                <Link to="/create">Создать игру</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enriched.map(({ g, dist }) => (
              <GameRowCard key={g.id} g={g} dist={dist} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function LocationGate({ onPick }: { onPick: (loc: UserLoc) => void }) {
  const [busy, setBusy] = useState<"gps" | "search" | null>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  // Suggest активен только когда инпут в фокусе. После клика/Enter — скрываем.
  const { items: suggestions, loading: suggestLoading } = useAddressSuggest(query, focused);

  const pickSuggestion = (s: SuggestItem) => {
    setFocused(false);
    onPick({
      lat: s.lat,
      lng: s.lng,
      label: s.label.length > 40 ? s.label.slice(0, 40) + "…" : s.label,
    });
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      toast.error("Геолокация не поддерживается браузером");
      return;
    }
    setBusy("gps");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(null);
        onPick({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Моё местоположение",
        });
      },
      (err) => {
        setBusy(null);
        toast.error(err.message || "Не удалось получить геолокацию");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const searchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;
    setBusy("search");
    try {
      const hit = await geocodeMoscow(text);
      if (!hit) {
        toast.error("Не нашли такой адрес. Попробуй уточнить улицу и дом.");
        return;
      }
      onPick({
        lat: hit.lat,
        lng: hit.lng,
        label: text.length > 30 ? text.slice(0, 30) + "…" : text,
      });
    } catch {
      toast.error("Сервис адресов недоступен. Выбери район из списка.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="container mx-auto px-4 sm:px-6 py-16">
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-elegant md:p-12">
        <Badge className="mb-4">Шаг 1</Badge>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Откуда тебе удобно играть?</h1>
        <p className="mt-3 text-muted-foreground">
          Укажи точку в Москве — мы покажем игры рядом и удобные по времени.
        </p>

        <Button
          onClick={useGps}
          disabled={busy !== null}
          size="lg"
          className="mt-8 h-auto min-h-12 w-full whitespace-normal break-words px-4 py-3 text-center leading-tight bg-gradient-brand text-primary-foreground hover:opacity-90"
        >
          {busy === "gps" ? (
            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Navigation className="mr-2 h-4 w-4 shrink-0" />
          )}
          <span className="block">Использовать моё местоположение</span>
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">или</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={searchAddress} className="relative flex gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              // Маленький delay перед blur — иначе клик по подсказке не успеет отработать.
              onBlur={() => window.setTimeout(() => setFocused(false), 150)}
              placeholder="Адрес или метро в Москве"
              maxLength={120}
              className="h-11"
              autoComplete="off"
            />
            {focused && query.trim().length >= 3 && (suggestLoading || suggestions.length > 0) && (
              <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-xl border border-border bg-popover shadow-elegant">
                {suggestLoading && suggestions.length === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ищу варианты…
                  </div>
                )}
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.lat}-${s.lng}-${i}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(s)}
                    className="flex w-full items-center gap-2 border-b border-border/40 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="submit" disabled={busy !== null || !query.trim()} className="h-11">
            {busy === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Найти"}
          </Button>
        </form>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Или выбери район
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {moscowSpots.map((s) => (
              <button
                key={s.name}
                onClick={() => onPick({ lat: s.lat, lng: s.lng, label: s.name })}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              >
                <MapPin className="mr-1 inline h-3 w-3" /> {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ManualLocationBar({
  onPick,
  onReset,
}: {
  onPick: (loc: UserLoc) => void;
  onReset: () => void;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const { items: suggestions, loading: suggestLoading } = useAddressSuggest(query, focused);

  const pickSuggestion = (s: SuggestItem) => {
    setFocused(false);
    setQuery("");
    onPick({
      lat: s.lat,
      lng: s.lng,
      label: s.label.length > 30 ? s.label.slice(0, 30) + "…" : s.label,
    });
    toast.success("Местоположение обновлено");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;
    setBusy(true);
    try {
      const hit = await geocodeMoscow(text);
      if (!hit) {
        toast.error("Не нашли такой адрес. Попробуй уточнить улицу и дом.");
        return;
      }
      onPick({
        lat: hit.lat,
        lng: hit.lng,
        label: text.length > 30 ? text.slice(0, 30) + "…" : text,
      });
      setQuery("");
      toast.success("Местоположение обновлено");
    } catch {
      toast.error("Сервис адресов недоступен");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-start">
      <form onSubmit={submit} className="relative flex flex-1 gap-2 sm:max-w-md">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            placeholder="Адрес или метро в Москве"
            maxLength={120}
            autoComplete="off"
            className="h-10 border-white/30 bg-white/10 text-white placeholder:text-white/60"
          />
          {focused && query.trim().length >= 3 && (suggestLoading || suggestions.length > 0) && (
            <div className="absolute left-0 right-0 top-11 z-30 overflow-hidden rounded-xl border border-border bg-popover text-foreground shadow-elegant">
              {suggestLoading && suggestions.length === 0 && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ищу варианты…
                </div>
              )}
              {suggestions.map((s, i) => (
                <button
                  key={`${s.lat}-${s.lng}-${i}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(s)}
                  className="flex w-full items-center gap-2 border-b border-border/40 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={busy || !query.trim()}
          className="h-10 bg-white text-primary hover:bg-white/90"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Указать"}
        </Button>
      </form>
      <Button
        variant="secondary"
        size="sm"
        className="h-10 bg-white/15 text-white hover:bg-white/25"
        onClick={onReset}
      >
        <Navigation className="mr-1 h-4 w-4" /> Сменить точку
      </Button>
    </div>
  );
}

function GameRowCard({ g, dist }: { g: GameRow; dist: number }) {
  const taken = g.participants?.[0]?.count ?? 0;
  const full = taken >= g.slots_total;
  const pct = Math.round((taken / g.slots_total) * 100);
  const distLabel = isFinite(dist) ? `${dist.toFixed(dist < 10 ? 1 : 0)} км` : null;
  const needed = g.slots_total - taken;
  const startsIn = new Date(g.starts_at).getTime() - Date.now();
  const soon = startsIn > 0 && startsIn < 1000 * 60 * 60 * 6;
  const almostFull = !full && needed <= 2 && taken > 0;
  const status: { label: string; cls: string } | null = full
    ? { label: "Заполнено", cls: "bg-muted text-muted-foreground" }
    : almostFull
      ? { label: `Нужно ещё ${needed}`, cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400" }
      : soon
        ? { label: "Скоро старт", cls: "bg-primary/15 text-primary" }
        : taken === 0
          ? { label: "Новая игра", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" }
          : null;
  return (
    <Link
      to="/games/$gameId"
      params={{ gameId: g.id }}
      className="group relative block overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-elegant"
    >
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-orb opacity-20 blur-2xl transition-opacity group-hover:opacity-40" />
      {status && (
        <span className={`absolute left-4 top-4 z-10 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.cls}`}>
          {status.label}
        </span>
      )}
      <div className={`flex items-start justify-between gap-4 ${status ? "mt-7" : ""}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold leading-tight">
              {g.stadium?.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {g.stadium?.address}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary" className="bg-accent text-accent-foreground">
            {g.sport}
          </Badge>
          {distLabel && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {distLabel}
            </span>
          )}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          {formatDate(g.starts_at)}, {formatTime(g.starts_at)}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          {taken}/{g.slots_total} · {g.level}
        </div>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">за игрока</p>
          <p className="font-display text-xl font-bold">{g.price_per_player} ₽</p>
        </div>
        <span className="inline-flex h-10 items-center rounded-md bg-gradient-brand px-4 text-sm font-medium text-primary-foreground">
          {full ? "Мест нет" : "Открыть"}
        </span>
      </div>
    </Link>
  );
}

function FilterChips({
  items,
  value,
  onChange,
}: {
  items: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={it}
          onClick={() => onChange(it)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ease-smooth ${
            value === it
              ? "border-transparent bg-gradient-brand text-primary-foreground shadow-glow"
              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

function FilterDropdown({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/40 data-[state=open]:border-primary data-[state=open]:shadow-glow"
        >
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-display font-bold">{value}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {items.map((it) => (
          <DropdownMenuItem
            key={it}
            onSelect={() => onChange(it)}
            className="flex items-center justify-between gap-3"
          >
            <span>{it}</span>
            {value === it && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DateUntilFilter({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (v: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value
    ? value.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
    : "Когда угодно";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/40 data-[state=open]:border-primary data-[state=open]:shadow-glow",
            value && "border-primary/60",
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">До:</span>
          <span className="font-display font-bold">{label}</span>
          {value && (
            <X
              className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onChange(undefined);
              }}
            />
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
          disabled={(d) => d < today}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
        <div className="flex items-center justify-between gap-2 border-t border-border p-2">
          <div className="flex flex-wrap gap-1">
            {[
              { label: "Сегодня", days: 0 },
              { label: "+3 дня", days: 3 },
              { label: "Неделя", days: 7 },
              { label: "2 недели", days: 14 },
              { label: "Месяц", days: 30 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  d.setDate(d.getDate() + p.days);
                  onChange(d);
                  setOpen(false);
                }}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:border-primary/40 hover:bg-primary/5"
              >
                {p.label}
              </button>
            ))}
          </div>
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Сбросить
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
