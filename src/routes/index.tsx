import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Trophy,
  Users,
  MapPin,
  Clock,
  Search,
  ShieldCheck,
  Flame,
  Star,
  Sparkles,
  Calendar as CalendarIcon,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

interface NextGame {
  id: string;
  starts_at: string;
  price_per_player: number;
  slots_total: number;
  stadium: { name: string; address: string } | null;
  participants: { count: number }[];
}

function formatNearDate(iso: string) {
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Athletic Flow — найди игру и собери команду рядом" },
      {
        name: "description",
        content:
          "Платформа любительского спорта: футбол, баскетбол, волейбол и ещё 15+ видов. Найди игру рядом, собери команду и присоединись в 3 клика.",
      },
      { property: "og:title", content: "Athletic Flow — спорт без поиска соперников" },
      {
        property: "og:description",
        content: "Поиск игроков, бронирование площадок и оплата за 3 клика.",
      },
      { property: "og:url", content: "https://httpsaf-sport.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://httpsaf-sport.lovable.app/" }],
  }),
  component: HomePage,
});

const POPULAR_SPORTS = [
  { name: "Футбол", emoji: "⚽" },
  { name: "Баскетбол", emoji: "🏀" },
  { name: "Волейбол", emoji: "🏐" },
  { name: "Теннис", emoji: "🎾" },
  { name: "Падел", emoji: "🏓" },
  { name: "Футзал", emoji: "⚽" },
  { name: "Хоккей", emoji: "🏒" },
  { name: "Регби", emoji: "🏉" },
];

// Список известных видов спорта на сайте — для определения, что ввёл юзер:
// вид спорта или текстовый запрос (стадион/район).
const KNOWN_SPORTS = new Set([
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
]);

function resolveSport(input: string): string | null {
  const trim = input.trim();
  if (!trim) return null;
  // Точное совпадение (case-insensitive)
  const exact = Array.from(KNOWN_SPORTS).find(
    (s) => s.toLowerCase() === trim.toLowerCase(),
  );
  return exact ?? null;
}

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const search: { sport?: string; q?: string; stadium?: string } = {};
    const sport = resolveSport(q);
    const trimmedQ = q.trim();
    const trimmedCity = city.trim();
    if (sport) {
      search.sport = sport;
    } else if (trimmedQ) {
      // Передаём в /games как «стадион/район» — там это попадёт в поиск по названию стадиона.
      search.stadium = trimmedQ;
    }
    if (trimmedCity && !search.stadium) {
      // Город/район — если поле «спорт/стадион» уже занято — кладём как q, иначе как stadium.
      search.q = trimmedCity;
    } else if (trimmedCity) {
      search.q = trimmedCity;
    }
    navigate({ to: "/games", search });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)] opacity-20" />

        <div className="relative container mx-auto grid gap-10 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-12 md:gap-12 md:pb-20 md:pt-20 lg:pb-24">
          <div className="md:col-span-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Сейчас идут игры в 12 районах
            </div>

            <h1 className="font-display text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Найди игру.{" "}
              <span className="text-white/70">Собери команду.</span>{" "}
              Выходи на поле.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-white/80 sm:text-base">
              Любительский спорт рядом с домом. Футбол, баскетбол, волейбол и ещё 15+ видов —
              присоединяйся к игре или собирай свою за 3 клика.
            </p>

            {/* SEARCH */}
            <form
              onSubmit={submitSearch}
              className="mt-6 flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-xl shadow-elegant sm:flex-row"
            >
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Вид спорта или стадион"
                  className="h-11 border-0 bg-transparent px-0 text-sm shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Район или метро"
                  className="h-11 border-0 bg-transparent px-0 text-sm shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-11 bg-gradient-brand px-6 text-primary-foreground hover:opacity-90"
              >
                Найти игру
              </Button>
            </form>

            {/* QUICK CHIPS */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: "Сегодня", icon: Zap, when: "today" as const },
                { label: "Завтра", icon: CalendarIcon, when: "tomorrow" as const },
                { label: "На этой неделе", icon: CalendarIcon, when: "week" as const },
                { label: "Рядом со мной", icon: MapPin, when: undefined },
              ].map((c) => (
                <Link
                  key={c.label}
                  to="/games"
                  search={c.when ? { when: c.when } : {}}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition hover:bg-white/20"
                >
                  <c.icon className="h-3.5 w-3.5" /> {c.label}
                </Link>
              ))}
            </div>

            {/* PRIMARY CTAS */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-elegant"
              >
                <Link to="/games">
                  Найти игру <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
              >
                <Link to="/friends">
                  <Users className="mr-2 h-4 w-4" /> Найти команду
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
              >
                <Link to="/create">Создать игру</Link>
              </Button>
            </div>

            {/* TRUST METRICS */}
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-white">
              {[
                { v: "120+", l: "площадок" },
                { v: "3 клика", l: "до игры" },
                { v: "4.9★", l: "рейтинг" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 backdrop-blur-sm">
                  <p className="font-display text-2xl font-bold md:text-3xl">{s.v}</p>
                  <p className="text-xs text-white/70">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative md:col-span-5">
            <div className="absolute -inset-8 rounded-[3rem] bg-white/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/30 bg-white/10 p-2 backdrop-blur-xl shadow-elegant">
              <div className="rounded-[2rem] bg-background p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Ближайшая игра
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3 w-3" /> Проверено
                  </span>
                </div>
                <GameCardEmbedded />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SPORTS TILES */}
      <section className="container mx-auto px-4 pt-12 sm:px-6 md:pt-16">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Виды спорта</p>
            <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">Выбери свою игру</h2>
          </div>
          <Link to="/games" className="text-sm font-medium text-primary hover:underline">
            Все виды →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
          {POPULAR_SPORTS.map((s) => (
            <Link
              key={s.name}
              to="/games"
              search={{ sport: s.name }}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card sm:flex-col sm:items-center sm:gap-2 sm:p-4 sm:text-center"
            >
              <span className="text-2xl transition-transform group-hover:scale-110 sm:text-3xl">
                {s.emoji}
              </span>
              <span className="text-sm font-medium leading-tight">{s.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* GAMES NEAR YOU */}
      <section className="container mx-auto px-4 py-12 sm:px-6 md:py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Тренировки в городе
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-bold md:text-3xl">Ближайшие игры</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Подобрано по времени и активности — свежие матчи появляются первыми.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/games">
              Все игры <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <UpcomingGamesList />
      </section>

      {/* SOCIAL PROOF */}
      <section className="container mx-auto px-4 pb-16 sm:px-6 md:pb-20">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {[
            { v: "12 800+", l: "матчей сыграно", icon: Trophy },
            { v: "5 400+", l: "активных игроков", icon: Users },
            { v: "320+", l: "проверенных организаторов", icon: ShieldCheck },
            { v: "4.9 / 5", l: "средний рейтинг", icon: Star },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-2xl font-bold md:text-3xl">{s.v}</p>
              <p className="text-sm text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="container mx-auto px-4 pb-16 sm:px-6 md:pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-hero px-6 py-12 text-center shadow-elegant md:px-10 md:py-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,white,transparent_50%)] opacity-15" />
            <div className="relative mx-auto max-w-2xl">
              <Flame className="mx-auto h-8 w-8 text-white" />
              <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                Готов выйти на поле?
              </h2>
              <p className="mt-3 text-sm text-white/80 sm:text-base">
                Регистрация занимает минуту. Первая игра — уже сегодня.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Link to="/auth">Начать бесплатно</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
                >
                  <Link to="/games">Смотреть игры</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
      <SiteFooter />
    </div>
  );
}

function GameCardEmbedded() {
  const [game, setGame] = useState<NextGame | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const nowIso = new Date().toISOString();
    const select =
      "id, starts_at, price_per_player, slots_total, stadium:stadiums(name,address), participants:game_participants(count)";
    // Сначала ближайшая предстоящая
    let { data } = await supabase
      .from("games")
      .select(select)
      .eq("is_private", false)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!data) {
      // Fallback — последняя созданная
      const fallback = await supabase
        .from("games")
        .select(select)
        .eq("is_private", false)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      data = fallback.data;
    }
    setGame((data as unknown as NextGame) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (!alive) return;
    })();
    // Polling 30s — дешевле широкого realtime на games для 5К пользователей.
    // Realtime бы значил 5К открытых WS и broadcast на каждое INSERT;
    // polling прозрачно кэшируется CDN и даёт linear cost.
    const intId = window.setInterval(() => {
      if (alive) load();
    }, 30_000);
    const onFocus = () => {
      if (alive) load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      window.clearInterval(intId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <Skeleton className="mt-3 h-44 rounded-2xl" />;
  }

  if (!game) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
          <Trophy className="h-4 w-4" />
        </div>
        <p className="mt-3 font-display text-base font-semibold">Игр пока нет</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Создай первую — и она появится здесь.
        </p>
        <Link
          to="/create"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-brand px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
        >
          Создать игру
        </Link>
      </div>
    );
  }

  const taken = game.participants?.[0]?.count ?? 0;
  return (
    <div>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-base font-semibold">{game.stadium?.name}</p>
          <p className="text-xs text-muted-foreground">{game.stadium?.address}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-muted px-3 py-2">
          <p className="text-xs text-muted-foreground">Когда</p>
          <p className="font-medium">
            {formatNearDate(game.starts_at)}, {formatTime(game.starts_at)}
          </p>
        </div>
        <div className="rounded-xl bg-muted px-3 py-2">
          <p className="text-xs text-muted-foreground">Состав</p>
          <p className="font-medium">
            {taken}/{game.slots_total}
          </p>
        </div>
      </div>
      <Link
        to="/games/$gameId"
        params={{ gameId: game.id }}
        className="mt-4 flex items-center justify-between rounded-xl bg-gradient-brand px-4 py-3 text-primary-foreground transition-opacity hover:opacity-90"
      >
        <span className="text-sm">Записаться</span>
        <span className="font-display font-bold">{game.price_per_player} ₽</span>
      </Link>
    </div>
  );
}

interface UpcomingGame {
  id: string;
  sport: string;
  level: string;
  starts_at: string;
  price_per_player: number;
  slots_total: number;
  stadium: { name: string; address: string } | null;
  participants: { count: number }[];
}

function UpcomingGamesList() {
  const [items, setItems] = useState<UpcomingGame[] | null>(null);
  const [sportFilter, setSportFilter] = useState<string>("Все");

  const load = async () => {
    const { data } = await supabase
      .from("games")
      .select(
        "id, sport, level, starts_at, price_per_player, slots_total, stadium:stadiums(name,address), participants:game_participants(count)",
      )
      .eq("is_private", false)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(12);
    setItems((data as unknown as UpcomingGame[]) ?? []);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (!alive) return;
    })();
    // Polling 30s + focus-refetch — capacity-friendly альтернатива realtime.
    const intId = window.setInterval(() => {
      if (alive) load();
    }, 30_000);
    const onFocus = () => {
      if (alive) load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      window.clearInterval(intId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sportsInList = useMemo(() => {
    if (!items) return [];
    return Array.from(new Set(items.map((g) => g.sport))).slice(0, 6);
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return null;
    return sportFilter === "Все" ? items.slice(0, 6) : items.filter((g) => g.sport === sportFilter).slice(0, 6);
  }, [items, sportFilter]);

  if (items === null) {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/50 px-8 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
          <Trophy className="h-6 w-6" />
        </div>
        <h3 className="mt-6 font-display text-2xl font-semibold">Будь первым на поле</h3>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Создай игру — пригласим игроков и поможем собрать состав.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="bg-gradient-brand text-primary-foreground hover:opacity-90">
            <Link to="/create">Создать игру</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/friends">Найти команду</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {sportsInList.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {["Все", ...sportsInList].map((s) => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sportFilter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {(filtered ?? []).map((g) => {
          const taken = g.participants?.[0]?.count ?? 0;
          const full = taken >= g.slots_total;
          const needed = g.slots_total - taken;
          const startsIn = new Date(g.starts_at).getTime() - Date.now();
          const soon = startsIn > 0 && startsIn < 1000 * 60 * 60 * 6;
          const status = full
            ? { label: "Заполнено", cls: "bg-muted text-muted-foreground" }
            : needed <= 2 && taken > 0
              ? { label: `Нужно ещё ${needed}`, cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400" }
              : soon
                ? { label: "Скоро старт", cls: "bg-primary/15 text-primary" }
                : taken === 0
                  ? { label: "Новая игра", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" }
                  : { label: "Идёт набор", cls: "bg-accent text-accent-foreground" };
          const pct = Math.round((taken / g.slots_total) * 100);
          return (
            <Link
              key={g.id}
              to="/games/$gameId"
              params={{ gameId: g.id }}
              className="group relative block overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-orb opacity-20 blur-2xl transition-opacity group-hover:opacity-40" />
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.cls}`}>
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  {status.label}
                </span>
                <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                  {g.sport}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold leading-tight">
                {g.stadium?.name ?? "Стадион"}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {g.stadium?.address}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  {formatNearDate(g.starts_at)}, {formatTime(g.starts_at)}
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
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">за игрока</p>
                  <p className="font-display text-xl font-bold">{g.price_per_player} ₽</p>
                </div>
                <span className="inline-flex h-9 items-center rounded-md bg-gradient-brand px-4 text-sm font-medium text-primary-foreground">
                  {full ? "Мест нет" : "Записаться"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
