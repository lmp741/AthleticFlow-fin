import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, Star, Check, ChevronsUpDown } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import manegeImg from "@/assets/stadiums/manege.jpg";
import cageImg from "@/assets/stadiums/cage.jpg";
import stadiumImg from "@/assets/stadiums/stadium.jpg";
import parkImg from "@/assets/stadiums/park.jpg";
import turfImg from "@/assets/stadiums/turf.jpg";
import arenaImg from "@/assets/stadiums/arena.jpg";

function stadiumImageFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("манеж") || n.includes("феникс") || n.includes("пионер") || n.includes("мегаполис")) return manegeImg;
  if (n.includes("ангар")) return arenaImg;
  if (n.includes("стадион") || n.includes("динамо") || n.includes("лужники")) return stadiumImg;
  if (n.includes("парк") || n.includes("красная пресня") || n.includes("мещерский")) return parkImg;
  if (n.includes("арена") || n.includes("дабл")) return arenaImg;
  if (n.includes("cityfootball") || n.includes("игра") || n.includes("дельфин")) return cageImg;
  return turfImg;
}


const ALL_SPORTS = [
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
];

export const Route = createFileRoute("/stadiums")({
  // Быстрый поиск с главной: /stadiums?date=2026-06-12&time=19:00&dur=90
  validateSearch: (search: Record<string, unknown>) => ({
    date:
      typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : undefined,
    time:
      typeof search.time === "string" && /^\d{2}:\d{2}$/.test(search.time)
        ? search.time
        : undefined,
    dur:
      typeof search.dur === "number"
        ? search.dur
        : typeof search.dur === "string" && /^\d+$/.test(search.dur)
          ? Number(search.dur)
          : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Стадионы — Athletic Flow" },
      { name: "description", content: "Футбольные площадки и стадионы Москвы для аренды: фильтры по виду спорта, карте и доступности." },
      { property: "og:title", content: "Стадионы — Athletic Flow" },
      { property: "og:description", content: "Площадки Москвы для аренды по 15+ видам спорта." },
      { property: "og:url", content: "https://af-sport.ru/stadiums" },
    ],
    links: [{ rel: "canonical", href: "https://af-sport.ru/stadiums" }],
  }),
  component: StadiumsPage,
});

interface Stadium {
  id: string;
  name: string;
  address: string;
  cover_gradient: string | null;
  sports: string[];
  price_per_hour: number;
  rating: number | null;
  is_partner: boolean;
}

/** Времена для фильтра доступности: 08:00–22:30 шагом 30 мин (= сетка get_free_slots). */
const TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

function StadiumsPage() {
  const searchParams = Route.useSearch();
  const [list, setList] = useState<Stadium[] | null>(null);
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState<string | null>(null);
  // Фильтр доступности (#31): дата обязательна для активации, время опционально.
  const [availDate, setAvailDate] = useState(searchParams.date ?? "");
  const [availTime, setAvailTime] = useState(searchParams.time ?? "any");
  const [availDur, setAvailDur] = useState(searchParams.dur ?? 90);
  // null = фильтр неактивен; Set = id партнёрских стадионов со свободным временем.
  const [availIds, setAvailIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("stadiums")
        .select("id, name, address, cover_gradient, sports, price_per_hour, rating, is_partner")
        .order("rating", { ascending: false });
      setList((data ?? []) as Stadium[]);
    })();
  }, []);

  // Запрос доступности при изменении фильтра.
  useEffect(() => {
    if (!availDate) {
      setAvailIds(null);
      return;
    }
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc("find_available_stadiums", {
        p_date: availDate,
        p_start: availTime === "any" ? null : availTime,
        p_duration_min: availDur,
      });
      if (!alive) return;
      if (error) {
        setAvailIds(new Set());
        return;
      }
      setAvailIds(
        new Set(((data ?? []) as { stadium_id: string }[]).map((r) => r.stadium_id)),
      );
    })();
    return () => {
      alive = false;
    };
  }, [availDate, availTime, availDur]);

  const [sportPickerOpen, setSportPickerOpen] = useState(false);

  const sportsInList = useMemo(() => {
    const set = new Set<string>();
    (list ?? []).forEach((s) => s.sports.forEach((sp) => set.add(sp)));
    return set;
  }, [list]);

  // Полный список: сначала виды, у которых уже есть площадки, затем остальные
  const allSports = useMemo(() => {
    const present = ALL_SPORTS.filter((s) => sportsInList.has(s));
    const rest = ALL_SPORTS.filter((s) => !sportsInList.has(s));
    return [...present, ...rest];
  }, [sportsInList]);

  // Быстрые чипы — самые популярные
  const quickSports = useMemo(() => allSports.slice(0, 5), [allSports]);

  const filtered = useMemo(() => {
    if (!list) return null;
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
      const matchS = !sport || s.sports.includes(sport);
      // Фильтр доступности применим только к партнёрским (у остальных нет
      // онлайн-брони и расписания) — при активном фильтре их скрываем.
      const matchAvail = availIds === null || (s.is_partner && availIds.has(s.id));
      return matchQ && matchS && matchAvail;
    });
  }, [list, query, sport, availIds]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden bg-gradient-hero py-10 md:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,white,transparent_55%)] opacity-20" />
        <div className="relative container mx-auto px-4 sm:px-6">
          <Badge className="mb-3 border-white/30 bg-white/10 text-white">Москва</Badge>
          <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
            Стадионы Москвы
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
            Выбирай площадку, бронируй слот, собирай команду.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 sm:px-6 sm:py-10 md:py-12">
        <div className="mb-8 flex flex-col gap-4">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию или адресу"
              className="h-11 pl-10"
            />
          </div>

          {/* #31: фильтр по свободному времени (партнёрские стадионы) */}
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Дата</p>
              <Input
                type="date"
                value={availDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setAvailDate(e.target.value)}
                className="h-10 w-40"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Время</p>
              <Select value={availTime} onValueChange={setAvailTime}>
                <SelectTrigger className="h-10 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="any">Любое</SelectItem>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Длительность</p>
              <Select value={String(availDur)} onValueChange={(v) => setAvailDur(Number(v))}>
                <SelectTrigger className="h-10 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1 час</SelectItem>
                  <SelectItem value="90">1,5 часа</SelectItem>
                  <SelectItem value="120">2 часа</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {availDate && (
              <Button variant="ghost" size="sm" className="h-10" onClick={() => setAvailDate("")}>
                Сбросить
              </Button>
            )}
            {availIds !== null && (
              <p className="w-full text-xs text-muted-foreground sm:w-auto sm:self-center">
                Показаны стадионы со свободным временем (онлайн-бронь).
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSport(null)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                sport === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              Все виды
            </button>
            {quickSports.map((sp) => (
              <button
                key={sp}
                onClick={() => setSport(sp)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  sport === sp
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {sp}
              </button>
            ))}

            <Popover open={sportPickerOpen} onOpenChange={setSportPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sportPickerOpen}
                  className={cn(
                    "h-auto rounded-full border px-4 py-1.5 text-sm font-normal",
                    sport && !quickSports.includes(sport)
                      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {sport && !quickSports.includes(sport) ? sport : "Все виды спорта"}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Найти вид спорта…" />
                  <CommandList>
                    <CommandEmpty>Ничего не найдено</CommandEmpty>
                    <CommandGroup>
                      {allSports.map((sp) => (
                        <CommandItem
                          key={sp}
                          value={sp}
                          onSelect={() => {
                            setSport(sp);
                            setSportPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              sport === sp ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="flex-1">{sp}</span>
                          {!sportsInList.has(sp) && (
                            <span className="ml-2 text-xs text-muted-foreground">скоро</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {filtered === null ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">Ничего не найдено</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <article
                key={s.id}
                className="group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-elegant"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={stadiumImageFor(s.name)}
                    alt={s.name}
                    loading="lazy"
                    width={1024}
                    height={640}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-smooth group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                      <Star className="h-3 w-3 fill-white" /> {s.rating ?? "—"}
                    </div>
                    <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-primary">
                      от {s.price_per_hour} ₽/час
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {s.address}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.sports.map((sp) => (
                      <Badge key={sp} variant="secondary">{sp}</Badge>
                    ))}
                  </div>
                  <Button asChild className="mt-5 w-full bg-gradient-brand text-primary-foreground hover:opacity-90">
                    <Link to="/stadiums/$stadiumId" params={{ stadiumId: s.id }}>Смотреть игры</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
