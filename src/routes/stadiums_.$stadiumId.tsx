import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Lock,
  Star,
  CalendarPlus,
  CheckCircle2,
  Info,
  Navigation,
  Trophy,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import manegeImg from "@/assets/stadiums/manege.jpg";
import cageImg from "@/assets/stadiums/cage.jpg";
import stadiumImg from "@/assets/stadiums/stadium.jpg";
import parkImg from "@/assets/stadiums/park.jpg";
import turfImg from "@/assets/stadiums/turf.jpg";
import arenaImg from "@/assets/stadiums/arena.jpg";

const BASE_URL = "https://af-sport.ru";

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

function buildStadiumDescription(stadium: {
  name: string;
  address: string;
  sports: string[];
  price_per_hour: number;
}) {
  const sportsLine =
    stadium.sports.length > 0
      ? stadium.sports.slice(0, 4).join(", ")
      : "футбола и других игр с мячом";
  return `Стадион «${stadium.name}» в Москве (${stadium.address}). Площадки для ${sportsLine}. Аренда от ${stadium.price_per_hour} ₽/час, бронирование онлайн, открытые любительские игры — присоединяйся к команде или собирай свою.`.slice(
    0,
    250,
  );
}

export const Route = createFileRoute("/stadiums_/$stadiumId")({
  head: ({ params }) => {
    const url = `${BASE_URL}/stadiums/${params.stadiumId}`;
    const title = "Стадион в Москве — аренда и любительские игры — Athletic Flow";
    const description =
      "Подробное описание стадиона: виды спорта, цена аренды, расписание открытых игр. Записывайся в команду или арендуй площадку для своего матча. Москва.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: "аренда стадиона москва, любительский футбол москва, поле для футбола, мини-футбол, futsal, бронь площадки, любительские игры, найти команду" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "place" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "ru_RU" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "geo.region", content: "RU-MOW" },
        { name: "geo.placename", content: "Москва" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: StadiumPage,
});

interface StadiumRow {
  id: string;
  name: string;
  address: string;
  sports: string[];
  price_per_hour: number;
  rating: number | null;
  lat: number | null;
  lng: number | null;
  // Партнёрские поля (могут быть null для не-партнёрских стадионов)
  description?: string | null;
  cover_url?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  is_partner?: boolean;
}

// Площадка внутри стадиона: «Большое поле 100×64», «Манеж», ...
interface VenueRow {
  id: string;
  stadium_id: string;
  name: string;
  size_width: number | null;
  size_length: number | null;
  surface: string | null;
  sports: string[];
  cover_url: string | null;
  description: string | null;
  allow_split: boolean;
  sort_order: number;
  size_options: SizeOptionRow[];
}

interface SizeOptionRow {
  id: string;
  venue_id: string;
  size_code: string;
  label: string;
  price_per_hour: number;
  parallel_count: number;
  sort_order: number;
}

interface GameRow {
  id: string;
  sport: string;
  level: string;
  starts_at: string;
  ends_at: string;
  price_per_player: number;
  slots_total: number;
  is_private: boolean;
  participants: { count: number }[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// «1 площадка», «2 площадки», «5 площадок»
function pluralizeVenues(n: number) {
  const last = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "площадок";
  if (last === 1) return "площадка";
  if (last >= 2 && last <= 4) return "площадки";
  return "площадок";
}

/**
 * Карточка одной площадки внутри стадиона — фото, размер, покрытие, виды спорта,
 * варианты аренды с ценами и кнопки «Забронировать». Каждая кнопка ведёт в
 * /create?stadium=X&venue=Y&size=Z, чтобы форма создания игры предзаполнилась.
 */
function VenueCard({ venue, stadiumId }: { venue: VenueRow; stadiumId: string }) {
  const sizeStr =
    venue.size_width && venue.size_length
      ? `${venue.size_length}×${venue.size_width} м`
      : null;
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-background/60 transition hover:border-primary/40 hover:shadow-card">
      {venue.cover_url && (
        <div className="relative h-32 overflow-hidden bg-muted sm:h-40">
          <img
            src={venue.cover_url}
            alt={venue.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold sm:text-lg">{venue.name}</h3>
          {sizeStr && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
              {sizeStr}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 text-[11px]">
          {venue.sports.map((sp) => (
            <span key={sp} className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              {sp}
            </span>
          ))}
        </div>
        {venue.surface && <p className="text-[11px] text-muted-foreground">{venue.surface}</p>}
        {venue.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{venue.description}</p>
        )}

        <div className="mt-auto space-y-1.5 pt-2">
          {venue.size_options.length === 0 ? (
            <p className="text-xs text-muted-foreground">Цены уточняются у менеджера.</p>
          ) : (
            venue.size_options.map((opt) => (
              <Link
                key={opt.id}
                to="/create"
                search={{
                  stadium: stadiumId,
                  venue: venue.id,
                  size: opt.id,
                  sport: venue.sports[0],
                }}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs transition hover:border-primary/60 hover:bg-primary/5"
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono text-muted-foreground">
                    {opt.price_per_hour.toLocaleString("ru-RU")} ₽/ч
                  </span>
                </span>
                <span className="rounded-full bg-gradient-brand px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                  Забронировать
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StadiumPage() {
  const { stadiumId } = Route.useParams();
  const [stadium, setStadium] = useState<StadiumRow | null>(null);
  const [games, setGames] = useState<GameRow[] | null>(null);
  // Партнёрские стадионы (is_partner=true) подгружают список площадок
  // с вариантами аренды и ценами. Для остальных — пусто.
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const isOsm = stadiumId.startsWith("osm-");

  useEffect(() => {
    if (isOsm) {
      setStadium(null);
      setGames([]);
      setVenues([]);
      return;
    }
    (async () => {
      const [{ data: s }, { data: g }] = await Promise.all([
        supabase
          .from("stadiums")
          .select(
            "id, name, address, sports, price_per_hour, rating, lat, lng, description, cover_url, phone, email, website, is_partner",
          )
          .eq("id", stadiumId)
          .maybeSingle(),
        supabase
          .from("games")
          .select(
            "id, sport, level, starts_at, ends_at, price_per_player, slots_total, is_private, participants:game_participants(count)",
          )
          .eq("stadium_id", stadiumId)
          .eq("is_private", false)
          .gte("starts_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .order("starts_at", { ascending: true }),
      ]);
      setStadium(s as StadiumRow | null);
      setGames((g ?? []) as unknown as GameRow[]);

      // Подгружаем площадки только если стадион партнёрский — иначе они не настроены.
      if (s && (s as StadiumRow).is_partner) {
        const { data: v } = await supabase
          .from("stadium_venues")
          .select(
            "id, stadium_id, name, size_width, size_length, surface, sports, cover_url, description, allow_split, sort_order",
          )
          .eq("stadium_id", stadiumId)
          .eq("active", true)
          .order("sort_order", { ascending: true });
        const venueIds = (v ?? []).map((x) => x.id);
        let optionsByVenue: Record<string, SizeOptionRow[]> = {};
        if (venueIds.length) {
          const { data: opts } = await supabase
            .from("venue_size_options")
            .select("id, venue_id, size_code, label, price_per_hour, parallel_count, sort_order")
            .in("venue_id", venueIds)
            .eq("active", true)
            .order("sort_order", { ascending: true });
          (opts ?? []).forEach((o) => {
            optionsByVenue[o.venue_id] = optionsByVenue[o.venue_id] ?? [];
            optionsByVenue[o.venue_id].push(o as SizeOptionRow);
          });
        }
        setVenues(
          (v ?? []).map((x) => ({
            ...(x as Omit<VenueRow, "size_options">),
            size_options: optionsByVenue[x.id] ?? [],
          })),
        );
      } else {
        setVenues([]);
      }
    })();
  }, [stadiumId, isOsm]);

  const nextGame = useMemo(() => {
    if (!games || games.length === 0) return null;
    return games[0];
  }, [games]);

  // JSON-LD: SportsActivityLocation + Place + (опц.) FAQPage. Это даёт сигнал Яндексу и AI-краулерам.
  const jsonLd = useMemo(() => {
    if (!stadium) return null;
    const blob: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      name: stadium.name,
      description: buildStadiumDescription(stadium),
      url: `${BASE_URL}/stadiums/${stadium.id}`,
      image: `${BASE_URL}${stadiumImageFor(stadium.name)}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: stadium.address,
        addressLocality: "Москва",
        addressCountry: "RU",
      },
      areaServed: { "@type": "City", name: "Москва" },
      priceRange: `от ${stadium.price_per_hour} ₽/час`,
      sport: stadium.sports,
    };
    if (stadium.lat != null && stadium.lng != null) {
      blob.geo = { "@type": "GeoCoordinates", latitude: stadium.lat, longitude: stadium.lng };
    }
    if (stadium.rating != null) {
      blob.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: stadium.rating,
        bestRating: 5,
        ratingCount: 1,
      };
    }
    return blob;
  }, [stadium]);

  const faqLd = useMemo(() => {
    if (!stadium) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Как записаться на игру на стадион «${stadium.name}»?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Откройте расписание игр на этой странице, выберите матч по виду спорта и времени, нажмите «Открыть» и присоединитесь к команде. Если свободных игр нет, нажмите «Создать игру» и выберите этот стадион при оформлении.`,
          },
        },
        {
          "@type": "Question",
          name: `Сколько стоит аренда стадиона «${stadium.name}»?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Базовая цена аренды площадки на «${stadium.name}» — от ${stadium.price_per_hour} ₽ в час. Итоговая стоимость для каждого участника зависит от количества игроков в команде и часов аренды — она автоматически делится между всеми, кто записался в матч.`,
          },
        },
        {
          "@type": "Question",
          name: `Какие виды спорта доступны на «${stadium.name}»?`,
          acceptedAnswer: {
            "@type": "Answer",
            text:
              stadium.sports.length > 0
                ? `На площадке доступны: ${stadium.sports.join(", ")}.`
                : "На площадке доступны базовые виды спорта с мячом — уточняйте у организатора.",
          },
        },
        {
          "@type": "Question",
          name: "Что взять с собой на любительскую игру?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Спортивная форма и обувь под покрытие площадки, бутылка воды, документ для идентификации. Мяч и манишки обычно есть у организатора — уточните в чате игры.",
          },
        },
        {
          "@type": "Question",
          name: "Можно ли отменить запись на игру?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Да, отменить запись можно из карточки игры до её начала. Если оплата уже прошла — условия возврата зависят от организатора матча.",
          },
        },
      ],
    };
  }, [stadium]);

  if (isOsm) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <section className="container mx-auto px-4 py-12 sm:px-6">
          <Link
            to="/stadiums"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> К каталогу стадионов
          </Link>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Открытая городская площадка</h1>
            <p className="mt-2 text-muted-foreground">
              Это бесплатная общедоступная площадка из OpenStreetMap. Запланированных игр на ней пока нет —
              создай свою и приглашай команду.
            </p>
            <Button asChild className="mt-6 bg-gradient-brand text-primary-foreground hover:opacity-90">
              <Link to="/create">
                <CalendarPlus className="mr-1 h-4 w-4" /> Создать игру
              </Link>
            </Button>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  if (stadium === null && games !== null && games.length === 0) {
    // загрузка ещё идёт ИЛИ стадион не найден — упрощённый skeleton
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        {stadium && (
          <>
            <img
              src={stadiumImageFor(stadium.name)}
              alt={stadium.name}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />
          </>
        )}
        <div className="relative container mx-auto px-4 pb-8 pt-10 sm:px-6 sm:pt-14 md:pb-12">
          <Link
            to="/stadiums"
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> К каталогу стадионов
          </Link>

          {stadium ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-gradient-brand text-primary-foreground">Москва</Badge>
                {stadium.rating != null && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    {stadium.rating.toFixed(1)}
                  </Badge>
                )}
                <Badge variant="outline">от {stadium.price_per_hour} ₽/час</Badge>
              </div>

              <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
                {stadium.name}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground sm:text-base">
                <MapPin className="h-4 w-4" /> {stadium.address}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {nextGame ? (
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                  >
                    <Link to="/games/$gameId" params={{ gameId: nextGame.id }}>
                      <Users className="mr-1 h-4 w-4" /> Записаться на ближайшую игру
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                  >
                    <Link to="/create">
                      <CalendarPlus className="mr-1 h-4 w-4" /> Создать игру здесь
                    </Link>
                  </Button>
                )}
                {stadium.lat != null && stadium.lng != null && (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                  >
                    <a
                      href={`https://yandex.ru/maps/?pt=${stadium.lng},${stadium.lat}&z=16&l=map`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="mr-1 h-4 w-4" /> Открыть в Я.Картах
                    </a>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Skeleton className="h-32 w-full max-w-2xl rounded-3xl" />
          )}
        </div>
      </section>

      {/* MAIN GRID */}
      <section className="container mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT — описание, виды спорта, FAQ */}
          <div className="space-y-5 lg:col-span-2">
            {stadium && (
              <article className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
                <h2 className="font-display text-xl font-bold sm:text-2xl">О стадионе</h2>
                {/* Для партнёрских стадионов показываем кастомное описание (с сайта или
                    написанное менеджером). Для остальных — авто-генеренный текст. */}
                {stadium.description ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {stadium.description}
                  </p>
                ) : (
                  <>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      Стадион <b className="text-foreground">«{stadium.name}»</b> расположен по адресу{" "}
                      <span className="text-foreground">{stadium.address}</span> в Москве. Это одна из площадок Athletic Flow:
                      здесь регулярно проходят открытые любительские игры —
                      {stadium.sports.length > 0 ? ` ${stadium.sports.slice(0, 3).join(", ").toLowerCase()} ` : " игры с мячом, "}
                      и др. Базовая стоимость аренды поля — <b className="text-foreground">от {stadium.price_per_hour} ₽ в час</b>,
                      итоговая цена для участника делится между всеми, кто записался на матч.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      Если ты ищешь, где сыграть в Москве в выходные или вечером после работы — открой расписание ниже,
                      выбери матч по уровню (новичок / любитель / профи) и присоединяйся к команде в 3 клика. Если подходящей
                      игры нет — создай свою и пригласи друзей.
                    </p>
                  </>
                )}
                {/* Контакты партнёрского стадиона */}
                {(stadium.phone || stadium.email || stadium.website) && (
                  <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    {stadium.phone && (
                      <a href={`tel:${stadium.phone.replace(/[^+\d]/g, "")}`} className="hover:text-foreground">
                        📞 {stadium.phone}
                      </a>
                    )}
                    {stadium.email && (
                      <a href={`mailto:${stadium.email}`} className="hover:text-foreground">
                        ✉️ {stadium.email}
                      </a>
                    )}
                    {stadium.website && (
                      <a href={stadium.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                        🌐 Сайт
                      </a>
                    )}
                  </div>
                )}
              </article>
            )}

            {/* Партнёрские площадки внутри стадиона — каждая со своими размерами и
                ценами + кнопкой «Забронировать» (перенаправляет в /create). */}
            {venues.length > 0 && (
              <article className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
                <h2 className="font-display text-xl font-bold sm:text-2xl">Поля и площадки</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  У стадиона {venues.length} {pluralizeVenues(venues.length)}. Выбирай, что подходит — и сразу
                  бронируй слот.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {venues.map((v) => (
                    <VenueCard key={v.id} venue={v} stadiumId={stadium!.id} />
                  ))}
                </div>
              </article>
            )}

            {stadium && stadium.sports.length > 0 && (
              <article className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
                <h2 className="font-display text-xl font-bold sm:text-2xl">Виды спорта на площадке</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Для каждого вида спорта оборудована своя площадка под покрытие и разметку.
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {stadium.sports.map((sp) => (
                    <li
                      key={sp}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2.5"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm font-medium">{sp}</span>
                      <Link
                        to="/games"
                        search={{ sport: sp }}
                        className="ml-auto text-xs font-medium text-primary hover:underline"
                      >
                        Игры →
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            )}

            {/* SCHEDULE */}
            <article className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold sm:text-2xl">Расписание игр</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Только открытые любительские матчи, на которые ещё можно записаться.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/create">
                    <CalendarPlus className="mr-1 h-4 w-4" /> Создать
                  </Link>
                </Button>
              </div>

              {games === null ? (
                <div className="mt-4 grid gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : games.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-background p-6 text-center">
                  <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">Пока нет открытых игр</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Будь первым — создай матч и пригласи команду.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 grid gap-3">
                  {games.map((g) => {
                    const joined = g.participants?.[0]?.count ?? 0;
                    const full = joined >= g.slots_total;
                    return (
                      <li key={g.id}>
                        <Link
                          to="/games/$gameId"
                          params={{ gameId: g.id }}
                          className="block rounded-2xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-gradient-brand text-primary-foreground">{g.sport}</Badge>
                            <Badge variant="outline">{g.level}</Badge>
                            {g.is_private && (
                              <Badge variant="outline" className="gap-1">
                                <Lock className="h-3 w-3" /> Приватная
                              </Badge>
                            )}
                            {full && <Badge variant="secondary">Заполнено</Badge>}
                          </div>
                          <h3 className="mt-3 font-display text-base font-semibold capitalize">
                            {fmtDate(g.starts_at)}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {fmtTime(g.starts_at)}–{fmtTime(g.ends_at)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" /> {joined}/{g.slots_total}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" /> {g.price_per_player} ₽
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>

            {/* FAQ — для AI Overviews / Я.Нейро / нулевой выдачи */}
            {stadium && (
              <article className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
                <h2 className="font-display text-xl font-bold sm:text-2xl">Частые вопросы</h2>
                <dl className="mt-4 space-y-4 text-sm sm:text-base">
                  <div>
                    <dt className="font-semibold">Как записаться на игру на стадион «{stadium.name}»?</dt>
                    <dd className="mt-1 text-muted-foreground">
                      В блоке «Расписание игр» выше выбери матч по виду спорта и времени, нажми на карточку и
                      присоединись к команде. Если свободных матчей нет — нажми «Создать игру» и выбери этот стадион.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Сколько стоит аренда?</dt>
                    <dd className="mt-1 text-muted-foreground">
                      От <b className="text-foreground">{stadium.price_per_hour} ₽ в час</b>. В любительских играх
                      стоимость аренды автоматически делится между всеми участниками — каждый видит свою цену в карточке матча.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Какие виды спорта доступны?</dt>
                    <dd className="mt-1 text-muted-foreground">
                      {stadium.sports.length > 0
                        ? `На площадке доступны: ${stadium.sports.join(", ")}.`
                        : "Базовые виды спорта с мячом — уточняй у организатора матча."}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Что взять с собой?</dt>
                    <dd className="mt-1 text-muted-foreground">
                      Спортивную форму и обувь под покрытие, бутылку воды, документ. Мяч и манишки обычно есть у
                      организатора — уточни в чате игры.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Можно ли отменить запись?</dt>
                    <dd className="mt-1 text-muted-foreground">
                      Да, отменить запись можно из карточки игры до её начала. Если оплата уже прошла — условия возврата
                      определяет организатор.
                    </dd>
                  </div>
                </dl>
              </article>
            )}
          </div>

          {/* RIGHT — sticky карточка-CTA + локация */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {stadium && (
              <div className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Краткая сводка
                </p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{stadium.address}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {stadium.sports.length} {pluralize(stadium.sports.length, ["вид спорта", "вида спорта", "видов спорта"])}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">от {stadium.price_per_hour} ₽/час</span>
                  </li>
                  {stadium.rating != null && (
                    <li className="flex items-start gap-2">
                      <Star className="mt-0.5 h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                      <span className="text-muted-foreground">{stadium.rating.toFixed(1)} / 5</span>
                    </li>
                  )}
                </ul>
                <Button
                  asChild
                  className="mt-4 w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
                >
                  {nextGame ? (
                    <Link to="/games/$gameId" params={{ gameId: nextGame.id }}>
                      Записаться
                    </Link>
                  ) : (
                    <Link to="/create">Создать игру</Link>
                  )}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  <Info className="mr-1 inline h-3 w-3" />
                  Цена делится между участниками
                </p>
              </div>
            )}
            {stadium && stadium.lat != null && stadium.lng != null && (
              <div className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
                <h3 className="font-display text-base font-semibold">Как добраться</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {stadium.address}. Координаты: {stadium.lat.toFixed(4)}, {stadium.lng.toFixed(4)}.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`https://yandex.ru/maps/?pt=${stadium.lng},${stadium.lat}&z=16&l=map`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Я.Карты
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`https://www.google.com/maps?q=${stadium.lat},${stadium.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google Maps
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* JSON-LD */}
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {faqLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <SiteFooter />
    </div>
  );
}

function pluralize(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}
