import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Users, Wallet, Lock, Globe, Eye, Clock as ClockIcon, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { FormationPreview } from "@/components/game/FormationPreview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { DatePicker, TimePicker } from "@/components/ui/date-time-picker";

export const Route = createFileRoute("/create")({
  // С карточки стадиона прилетают параметры: ?stadium=X&venue=Y&size=Z&sport=...
  // Все опциональные; невалидные просто игнорируются.
  validateSearch: (search: Record<string, unknown>) => {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pick = (k: string) =>
      typeof search[k] === "string" && uuidRe.test(search[k] as string) ? (search[k] as string) : undefined;
    return {
      stadium: pick("stadium"),
      venue: pick("venue"),
      size: pick("size"),
      sport: typeof search.sport === "string" ? (search.sport as string) : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Создать игру — Athletic Flow" },
      { name: "description", content: "Собери команду и забронируй стадион за 3 клика." },
    ],
  }),
  component: () => (<RequireAuth><CreateGamePage /></RequireAuth>),
});

// Только спорты которые реально доступны на наших партнёрских стадионах.
const sports = ["Футбол", "Мини-футбол", "Волейбол", "Теннис"];
const levels = ["Новичок", "Любитель", "Полупрофи", "Профи"];

interface StadiumOpt {
  id: string;
  name: string;
  address: string;
  is_partner?: boolean;
}

// Площадка партнёрского стадиона + варианты аренды с ценами.
interface VenueWithOptions {
  id: string;
  name: string;
  sports: string[];
  size_width: number | null;
  size_length: number | null;
  size_options: {
    id: string;
    size_code: string;
    label: string;
    price_per_hour: number;
    parallel_count: number;
  }[];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function CreateGamePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  // Параметры из URL (с карточки стадиона). Используются для предзаполнения.
  const searchParams = Route.useSearch();

  const [sport, setSport] = useState(searchParams.sport && sports.includes(searchParams.sport) ? searchParams.sport : "Футбол");
  const [level, setLevel] = useState("Любитель");
  const [date, setDate] = useState(todayISO());
  const [timeStart, setTimeStart] = useState("19:00");
  const [timeEnd, setTimeEnd] = useState("20:30");
  // Партнёрский режим: длительность аренды (мин) и факт выбора свободного слота.
  // Время в партнёрском режиме выбирается ТОЛЬКО из сетки get_free_slots.
  const [durationMin, setDurationMin] = useState(90);
  const [slotPicked, setSlotPicked] = useState(false);
  // Серия: «каждый четверг в 17:00» — заявка менеджеру через request_series.
  const [seriesEnabled, setSeriesEnabled] = useState(false);
  const [seriesWeeks, setSeriesWeeks] = useState(4);
  // Интервал повтора в днях: 7 = еженедельно, 14 = раз в две недели.
  const [seriesIntervalDays, setSeriesIntervalDays] = useState(7);
  // Слайдер хранит РАЗМЕР КОМАНДЫ (5 = "играем 5 на 5"). Общее число
  // участников — players[0] * 2. Это привычнее футболистам и совпадает
  // с FORMATIONS_A в FormationPreview (там size — это сколько в команде).
  const [players, setPlayers] = useState([5]);
  const [stadiums, setStadiums] = useState<StadiumOpt[]>([]);
  const [stadiumId, setStadiumId] = useState(searchParams.stadium ?? "");
  // Партнёрские поля: список площадок выбранного стадиона + выбранная площадка + выбранный размер.
  const [venues, setVenues] = useState<VenueWithOptions[]>([]);
  const [venueId, setVenueId] = useState<string>(searchParams.venue ?? "");
  const [sizeOptionId, setSizeOptionId] = useState<string>(searchParams.size ?? "");
  // Модель оплаты:
  //   "split" — вводим общую аренду, делим на участников (price/чел = floor(rent/N))
  //   "fixed" — вводим фикс. сумму с каждого, общая = price × N
  const [payMode, setPayMode] = useState<"split" | "fixed">("split");
  const [rentTotal, setRentTotal] = useState("5000");
  const [fixedPrice, setFixedPrice] = useState("500");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("stadiums")
        .select("id, name, address, is_partner")
        .order("name");
      if (data) {
        setStadiums(data);
        // Стадион НЕ автоселектим: пользователь выбирает сам (или приходит
        // с карточки стадиона с ?stadium=). Иначе партнёрский UI с площадками
        // выскакивает до того, как человек вообще выбрал Луч.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // При смене стадиона подтягиваем его площадки + варианты аренды.
  // Партнёрский (is_partner=true) → есть venues. Остальные — пусто, идёт по
  // старой логике (свой rent/fixed расчёт).
  useEffect(() => {
    if (!stadiumId) {
      setVenues([]);
      return;
    }
    // Пока список стадионов не загрузился — НИЧЕГО не сбрасываем.
    // Иначе на маунте (stadiums=[]) ветка "не партнёр" затирала venue/size,
    // пришедшие из URL с карточки стадиона.
    if (!stadiums.length) return;
    const partner = stadiums.find((s) => s.id === stadiumId)?.is_partner;
    if (!partner) {
      setVenues([]);
      // Если стадион сменили на не-партнёрский — сбросим venue/size.
      setVenueId("");
      setSizeOptionId("");
      return;
    }
    (async () => {
      const { data: vs } = await supabase
        .from("stadium_venues")
        .select("id, name, sports, size_width, size_length")
        .eq("stadium_id", stadiumId)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      const ids = (vs ?? []).map((v) => v.id);
      let optsByVenue: Record<string, VenueWithOptions["size_options"]> = {};
      if (ids.length) {
        const { data: opts } = await supabase
          .from("venue_size_options")
          .select("id, venue_id, size_code, label, price_per_hour, parallel_count")
          .in("venue_id", ids)
          .eq("active", true)
          .order("sort_order", { ascending: true });
        (opts ?? []).forEach((o) => {
          optsByVenue[o.venue_id] = optsByVenue[o.venue_id] ?? [];
          optsByVenue[o.venue_id].push({
            id: o.id,
            size_code: o.size_code,
            label: o.label,
            price_per_hour: o.price_per_hour,
            parallel_count: o.parallel_count,
          });
        });
      }
      const list: VenueWithOptions[] = (vs ?? []).map((v) => ({
        ...(v as Omit<VenueWithOptions, "size_options">),
        size_options: optsByVenue[v.id] ?? [],
      }));
      setVenues(list);

      // Авто-выбор: если venueId был из URL и существует — оставим, иначе первая.
      const validVenue = venueId && list.find((v) => v.id === venueId);
      if (!validVenue) setVenueId(list[0]?.id ?? "");
      // Авто-цена: если sizeOptionId не валиден — берём первую опцию выбранной площадки.
      const targetVenue = validVenue ?? list[0];
      const validOpt = sizeOptionId && targetVenue?.size_options.find((o) => o.id === sizeOptionId);
      if (!validOpt) setSizeOptionId(targetVenue?.size_options[0]?.id ?? "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stadiumId, stadiums]);

  // Реалтайм на цены: если менеджер изменил price_per_hour в админке,
  // на фронте пересчитается без F5. Подписка лёгкая (одна таблица, фильтр по venue).
  useEffect(() => {
    if (!venueId) return;
    const ch = supabase
      .channel(`venue-options-${venueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_size_options", filter: `venue_id=eq.${venueId}` },
        async () => {
          const { data: opts } = await supabase
            .from("venue_size_options")
            .select("id, venue_id, size_code, label, price_per_hour, parallel_count")
            .eq("venue_id", venueId)
            .eq("active", true)
            .order("sort_order", { ascending: true });
          setVenues((prev) =>
            prev.map((v) =>
              v.id === venueId
                ? { ...v, size_options: (opts ?? []).map((o) => ({
                    id: o.id,
                    size_code: o.size_code,
                    label: o.label,
                    price_per_hour: o.price_per_hour,
                    parallel_count: o.parallel_count,
                  })) }
                : v,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [venueId]);

  // Смена площадки/размера/даты/длительности инвалидирует выбранный слот.
  useEffect(() => {
    setSlotPicked(false);
  }, [venueId, sizeOptionId, date, durationMin]);

  // Текущая выбранная площадка и текущая опция размера (если партнёрский режим).
  const selectedVenue = venues.find((v) => v.id === venueId);
  const selectedOption = selectedVenue?.size_options.find((o) => o.id === sizeOptionId);
  const isPartnerMode = venues.length > 0;

  // Комиссия 10% — внутреннее правило, в UI не показываем.
  // split:  игрок платит ceil(rent × 1.1 / N) — наценка покрывает сервисный сбор.
  // fixed:  игрок платит ceil(fixed × 1.1) — то же правило, но от введённой суммы.
  // Организатор видит только цену, которую увидит игрок; распределение между
  // владельцем стадиона и сервисом — внутренний механизм.
  const COMMISSION = 0.1;
  // players[0] — это размер команды (например 5). Полное число мест — *2.
  const teamSize = Math.max(1, players[0]);
  const slots = teamSize * 2;
  const rentNum = Math.max(0, Number(rentTotal) || 0);
  const fixedNum = Math.max(0, Number(fixedPrice) || 0);
  // Длительность брони в часах (для расчёта суммы аренды партнёрской площадки).
  const durationHours = useMemo(() => {
    const [h1, m1] = timeStart.split(":").map(Number);
    const [h2, m2] = timeEnd.split(":").map(Number);
    const mins = h2 * 60 + m2 - (h1 * 60 + m1);
    return Math.max(0, mins / 60);
  }, [timeStart, timeEnd]);
  // В партнёрском режиме аренда = price_per_hour × часов. Перекрывает rentNum.
  const partnerRent = selectedOption ? Math.round(selectedOption.price_per_hour * durationHours) : 0;
  const effectiveRent = isPartnerMode ? partnerRent : rentNum;
  const splitPrice = Math.ceil((effectiveRent * (1 + COMMISSION)) / slots);
  const fixedPriceFinal = Math.ceil(fixedNum * (1 + COMMISSION));
  // В партнёрском режиме всегда split (цена аренды фиксирована, делим на участников).
  const pricePerPlayer = isPartnerMode ? splitPrice : (payMode === "split" ? splitPrice : fixedPriceFinal);
  const totalPlan = pricePerPlayer * slots;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!stadiumId) {
      toast.error("Выбери стадион");
      return;
    }
    // В партнёрском режиме нужно обязательно выбрать площадку и размер аренды.
    if (isPartnerMode && (!venueId || !sizeOptionId)) {
      toast.error("Выбери площадку и размер аренды");
      return;
    }
    // ...и свободный слот из сетки (занятое время выбрать невозможно).
    if (isPartnerMode && !slotPicked) {
      toast.error("Выбери свободное время в блоке «Когда»");
      return;
    }

    // Серия: не создаём игру сразу, а отправляем заявку менеджеру.
    // После approve_series игры и брони сгенерируются на свободные даты.
    if (isPartnerMode && seriesEnabled) {
      setSubmitting(true);
      const dates = Array.from({ length: seriesWeeks }, (_, i) => {
        const d = new Date(`${date}T00:00:00`);
        d.setDate(d.getDate() + i * seriesIntervalDays);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      });
      const { error: serErr } = await supabase.rpc("request_series", {
        p_venue_id: venueId,
        p_size_option_id: sizeOptionId,
        p_dates: dates,
        p_start_time: timeStart,
        p_end_time: timeEnd,
        p_sport: sport,
        p_level: level,
        p_slots_total: slots,
        p_notes: description || null,
      });
      setSubmitting(false);
      if (serErr) {
        toast.error(serErr.message);
        return;
      }
      toast.success("Заявка на серию отправлена менеджеру стадиона");
      navigate({ to: "/my" });
      return;
    }
    setSubmitting(true);
    const starts_at = new Date(`${date}T${timeStart}:00`).toISOString();
    const ends_at = new Date(`${date}T${timeEnd}:00`).toISOString();
    const { data, error } = await supabase
      .from("games")
      .insert({
        stadium_id: stadiumId,
        organizer_id: user.id,
        sport,
        level,
        starts_at,
        ends_at,
        // В БД храним именно общее количество мест.
        slots_total: slots,
        price_per_player: pricePerPlayer,
        // В партнёрском режиме rent_total = эффективная цена аренды (price × часы).
        // В обычном — старая логика (только split).
        rent_total: isPartnerMode ? effectiveRent : (payMode === "split" ? rentNum : null),
        description: description || null,
        is_private: isPrivate,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSubmitting(false);
      toast.error(error?.message ?? "Не удалось создать игру");
      return;
    }

    // Партнёрский режим — бронируем venue для игры. Если занят — откатываем
    // (удалим только что созданную игру, чтобы не висела без брони).
    if (isPartnerMode) {
      const { error: bookErr } = await supabase.rpc("book_venue", {
        p_venue_id: venueId,
        p_size_option_id: sizeOptionId,
        p_starts_at: starts_at,
        p_ends_at: ends_at,
        p_source: "game",
        p_game_id: data.id,
      });
      if (bookErr) {
        await supabase.from("games").delete().eq("id", data.id);
        setSubmitting(false);
        toast.error("Слот уже занят: " + bookErr.message);
        return;
      }
    }

    // Auto-join organizer.
    await supabase.from("game_participants").insert({ game_id: data.id, user_id: user.id });
    setSubmitting(false);
    toast.success("Игра создана!");
    navigate({ to: "/games/$gameId", params: { gameId: data.id } });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden bg-gradient-hero py-10 md:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white,transparent_55%)] opacity-20" />
        <div className="relative container mx-auto px-4 sm:px-6">
          <h1 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
            Создать тренировку
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
            Заполни условия — мы соберём команду и поделим оплату.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 py-8 md:py-12">
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card title="Вид спорта">
              <Chips items={sports} value={sport} onChange={setSport} />
            </Card>

            {/* «Локация» теперь ВЫШЕ «Когда»: для партнёрского стадиона свободное
                время зависит от выбранной площадки и размера аренды. */}
            <Card title="Локация" icon={MapPin}>
              <Label>Стадион</Label>
              <Select value={stadiumId} onValueChange={setStadiumId}>
                <SelectTrigger className="mt-1 h-11 w-full">
                  <SelectValue placeholder="Выбери стадион" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="max-h-[60vh] w-[var(--radix-select-trigger-width)]"
                >
                  {stadiums.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="block truncate">
                        <span className="font-medium">{s.name}</span>
                        {s.is_partner && (
                          <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            Партнёр
                          </span>
                        )}
                        <span className="ml-1 text-xs text-muted-foreground">— {s.address}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Партнёрский режим: выбор площадки + вариант аренды */}
              {isPartnerMode && (
                <div className="mt-5 space-y-3">
                  <div>
                    <Label>Площадка</Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {venues.map((v) => {
                        const active = v.id === venueId;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setVenueId(v.id);
                              setSizeOptionId(v.size_options[0]?.id ?? "");
                            }}
                            className={`flex flex-col gap-1 rounded-2xl border p-3 text-left transition ${
                              active
                                ? "border-primary bg-primary/5 shadow-glow"
                                : "border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{v.name}</span>
                              {v.size_width && v.size_length && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono">
                                  {v.size_length}×{v.size_width}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {v.sports.map((sp) => (
                                <span key={sp} className="rounded-full bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                                  {sp}
                                </span>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedVenue && selectedVenue.size_options.length > 0 && (
                    <div>
                      <Label>Размер аренды</Label>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {selectedVenue.size_options.map((opt) => {
                          const active = opt.id === sizeOptionId;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setSizeOptionId(opt.id)}
                              className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${
                                active
                                  ? "border-primary bg-primary/5 shadow-glow"
                                  : "border-border bg-background hover:border-primary/40"
                              }`}
                            >
                              <span className="text-sm font-semibold">{opt.label}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {opt.price_per_hour.toLocaleString("ru-RU")} ₽/ч
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedOption && durationHours > 0 && slotPicked && (
                    <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Аренда {Math.round(durationHours * 10) / 10} ч ·{" "}
                      <b className="text-foreground">
                        {partnerRent.toLocaleString("ru-RU")} ₽
                      </b>
                      {" "}— делится между участниками.
                    </p>
                  )}
                </div>
              )}
            </Card>

            <Card title="Когда" icon={Calendar}>
              {isPartnerMode ? (
                /* Партнёрский режим: дата + длительность + сетка СВОБОДНОГО времени.
                   Занятые слоты задизейблены — выбрать физически нельзя. */
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Дата</Label>
                      <div className="mt-1">
                        <DatePicker
                          value={date}
                          onChange={setDate}
                          minDate={(() => {
                            const d = new Date();
                            d.setHours(0, 0, 0, 0);
                            return d;
                          })()}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Длительность</Label>
                      <Select
                        value={String(durationMin)}
                        onValueChange={(v) => setDurationMin(Number(v))}
                      >
                        <SelectTrigger className="mt-1 h-11 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">1 час</SelectItem>
                          <SelectItem value="90">1,5 часа</SelectItem>
                          <SelectItem value="120">2 часа</SelectItem>
                          <SelectItem value="150">2,5 часа</SelectItem>
                          <SelectItem value="180">3 часа</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {venueId && sizeOptionId ? (
                    <PartnerSlotPicker
                      venueId={venueId}
                      sizeOptionId={sizeOptionId}
                      date={date}
                      durationMin={durationMin}
                      selectedStart={slotPicked ? timeStart : null}
                      onPick={(s, e) => {
                        setTimeStart(s);
                        setTimeEnd(e);
                        setSlotPicked(true);
                      }}
                      onInvalidate={() => setSlotPicked(false)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Сначала выбери площадку и размер аренды — покажем свободное время.
                    </p>
                  )}

                  {/* Серия: повтор еженедельно с аппрувом менеджера. */}
                  {slotPicked && (
                    <div className="rounded-2xl border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Повторять</p>
                          <p className="text-xs text-muted-foreground">
                            Например «каждый четверг в {timeStart}». Заявку подтверждает менеджер стадиона.
                          </p>
                        </div>
                        <Switch checked={seriesEnabled} onCheckedChange={setSeriesEnabled} />
                      </div>
                      {seriesEnabled && (
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="w-full sm:w-56">
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                Как часто
                              </p>
                              <Select
                                value={String(seriesIntervalDays)}
                                onValueChange={(v) => setSeriesIntervalDays(Number(v))}
                              >
                                <SelectTrigger className="h-10 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="7">Каждую неделю</SelectItem>
                                  <SelectItem value="14">Раз в две недели</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-full sm:w-56">
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                Сколько игр в серии
                              </p>
                              <Select
                                value={String(seriesWeeks)}
                                onValueChange={(v) => setSeriesWeeks(Number(v))}
                              >
                                <SelectTrigger className="h-10 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="2">2 игры</SelectItem>
                                  <SelectItem value="4">4 игры</SelectItem>
                                  <SelectItem value="8">8 игр</SelectItem>
                                  <SelectItem value="12">12 игр</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Даты:{" "}
                            {Array.from({ length: seriesWeeks }, (_, i) => {
                              const d = new Date(`${date}T00:00:00`);
                              d.setDate(d.getDate() + i * seriesIntervalDays);
                              return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
                            }).join(", ")}
                            . Занятые даты менеджер пропустит при подтверждении.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Дата</Label>
                    <div className="mt-1">
                      <DatePicker
                        value={date}
                        onChange={setDate}
                        minDate={(() => {
                          const d = new Date();
                          d.setHours(0, 0, 0, 0);
                          return d;
                        })()}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Начало</Label>
                    <div className="mt-1">
                      <TimePicker value={timeStart} onChange={setTimeStart} />
                    </div>
                  </div>
                  <div>
                    <Label>Окончание</Label>
                    <div className="mt-1">
                      <TimePicker value={timeEnd} onChange={setTimeEnd} />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Условия" icon={Users}>
              <div>
                <Label>Уровень</Label>
                <div className="mt-2">
                  <Chips items={levels} value={level} onChange={setLevel} />
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <Label>Формат игры</Label>
                  <span className="font-display text-lg font-bold">
                    {players[0]}×{players[0]}
                  </span>
                </div>
                <Slider value={players} onValueChange={setPlayers} min={2} max={11} step={1} className="mt-3" />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Размер команды: {players[0]}. Всего соберём {teamSize * 2} человек.
                </p>
              </div>

              {/* Превью формации команды — только футбол. Размер = teamSize. */}
              {sport === "Футбол" && (
                <div className="mt-4">
                  <FormationPreview size={teamSize} sport={sport} />
                </div>
              )}
              <div className="mt-6">
                <Label>Комментарий (необязательно)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='Например: "Берите щитки"'
                  className="mt-1 min-h-24"
                />
              </div>
            </Card>

            <Card title="Доступ" icon={isPrivate ? Lock : Globe}>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    !isPrivate ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Globe className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold">Открытая</div>
                    <div className="text-xs text-muted-foreground">Видна всем в поиске и каталоге</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    isPrivate ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Lock className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold">Приватная</div>
                    <div className="text-xs text-muted-foreground">Только по приглашению или ссылке</div>
                  </div>
                </button>
              </div>

              {/* В открытых играх запись всегда через заявку с аппрувом организатора.
                  В приватных — прямой вход по инвайт-ссылке. Без отдельной галки. */}
              <p className="mt-3 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                {isPrivate
                  ? "В приватной игре участники заходят прямо по ссылке-приглашению."
                  : "В открытой игре игроки подают заявку — ты подтверждаешь или отклоняешь."}
              </p>
            </Card>
          </div>

          <aside className="min-w-0 space-y-4">
            <div className="sticky top-24 space-y-4">
              {/* Live preview */}
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3">
                  <Eye className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Превью карточки
                  </p>
                </div>
                <div className="relative h-28 overflow-hidden bg-gradient-brand">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white,transparent_55%)] opacity-25" />
                  <div className="relative flex h-full items-end justify-between p-5">
                    <Badge className="border-white/30 bg-white/15 text-white">{sport}</Badge>
                    <Badge className="border-white/30 bg-white/20 text-white">
                      {isPrivate ? <><Lock className="mr-1 h-3 w-3" /> Приватная</> : <><Globe className="mr-1 h-3 w-3" /> Открытая</>}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <h3 className="font-display text-lg font-bold leading-tight line-clamp-1">
                    {stadiums.find((s) => s.id === stadiumId)?.name ?? "Выбери стадион"}
                  </h3>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {stadiums.find((s) => s.id === stadiumId)?.address ?? "—"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-muted/50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Когда</p>
                      <p className="font-semibold">
                        {date ? new Date(`${date}T${timeStart}`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "—"}
                        <span className="ml-1 text-muted-foreground">· {timeStart}</span>
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Уровень</p>
                      <p className="font-semibold">{level}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> 1/{slots} игроков
                    </span>
                    <span className="font-display text-base font-bold">
                      {pricePerPlayer === 0 ? "Бесплатно" : `${pricePerPlayer} ₽`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Блок «Оплата» в партнёрском режиме не нужен — цена аренды
                  уже задана через выбранный размер площадки. Показываем мини-сводку. */}
              {isPartnerMode ? (
                <Card title="Оплата" icon={Wallet}>
                  <div className="rounded-2xl bg-muted p-4">
                    <p className="text-xs text-muted-foreground">С каждого игрока</p>
                    <p className="font-display text-2xl font-bold">{pricePerPlayer} ₽</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Аренда {partnerRent.toLocaleString("ru-RU")} ₽ за {Math.round(durationHours * 10) / 10} ч,
                      делится между {slots} участниками. Цена обновится автоматически если менеджер
                      изменит тариф.
                    </p>
                  </div>
                </Card>
              ) : (
              <Card title="Оплата" icon={Wallet}>
                {/* Toggle модели оплаты */}
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1">
                  <button
                    type="button"
                    onClick={() => setPayMode("split")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                      payMode === "split"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Аренда / на участников
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode("fixed")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                      payMode === "fixed"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Фикс. с каждого
                  </button>
                </div>

                {payMode === "split" ? (
                  <>
                    <Label className="mt-4 block">Стоимость аренды стадиона, ₽</Label>
                    <Input
                      type="number"
                      min={0}
                      value={rentTotal}
                      onChange={(e) => setRentTotal(e.target.value)}
                      className="mt-1"
                    />
                    <div className="mt-4 rounded-2xl bg-muted p-4 text-sm">
                      <p className="text-muted-foreground">С каждого игрока</p>
                      <p className="font-display text-2xl font-bold">{pricePerPlayer} ₽</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Аренда делится между участниками. Если игроков станет меньше — цена пересчитается.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Label className="mt-4 block">Сумма с каждого игрока, ₽</Label>
                    <Input
                      type="number"
                      min={0}
                      value={fixedPrice}
                      onChange={(e) => setFixedPrice(e.target.value)}
                      className="mt-1"
                    />
                    <div className="mt-4 rounded-2xl bg-muted p-4 text-sm">
                      <p className="text-muted-foreground">С каждого игрока</p>
                      <p className="font-display text-2xl font-bold">{pricePerPlayer} ₽</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Фиксированная цена с каждого. Всего соберём: {totalPlan} ₽ ({pricePerPlayer} ₽ × {slots} игроков).
                      </p>
                    </div>
                  </>
                )}
              </Card>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={submitting || !stadiumId}
                className="w-full bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90"
              >
                <Sparkles className="mr-1 h-4 w-4" />
                {submitting
                  ? "Публикуем…"
                  : isPartnerMode && seriesEnabled
                    ? "Отправить заявку на серию"
                    : "Опубликовать игру"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {isPartnerMode && seriesEnabled
                  ? "Игры появятся после подтверждения менеджером стадиона."
                  : "Игра сразу появится в каталоге и соберёт команду."}
              </p>
            </div>
          </aside>
        </form>
      </section>

      <SiteFooter />
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  // На мобилке p-4 (16px), на десктопе p-6. Прежний p-6 на 360px экране съедал
  // 48px из ~340px рабочих, что критично — input'ы и заголовки начинали выпирать.
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h2 className="font-display text-base font-semibold sm:text-lg">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Chips({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={it}
          type="button"
          onClick={() => onChange(it)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
            value === it
              ? "border-transparent bg-gradient-brand text-primary-foreground shadow-glow"
              : "border-border hover:border-primary/40"
          }`}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Сетка свободного времени партнёрской площадки.
// Источник — RPC get_free_slots (учитывает график работы, override'ы,
// существующие брони и parallel_count). Занятые слоты задизейблены.
// Realtime: если кто-то бронирует параллельно — сетка обновляется сама,
// а выбранный слот, ставший занятым, сбрасывается через onInvalidate.
// ============================================================
type FreeSlot = { startISO: string; start: string; end: string; busy: boolean };

function PartnerSlotPicker({
  venueId,
  sizeOptionId,
  date,
  durationMin,
  selectedStart,
  onPick,
  onInvalidate,
}: {
  venueId: string;
  sizeOptionId: string;
  date: string;
  durationMin: number;
  selectedStart: string | null;
  onPick: (start: string, end: string) => void;
  onInvalidate: () => void;
}) {
  const [slots, setSlots] = useState<FreeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fmt = (iso: string) =>
      new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const load = async () => {
      const { data, error } = await supabase.rpc("get_free_slots", {
        p_venue_id: venueId,
        p_date: date,
        p_size_option_id: sizeOptionId,
        p_duration_min: durationMin,
      });
      if (!alive) return;
      setLoading(false);
      if (error) {
        toast.error("Не удалось загрузить свободное время");
        return;
      }
      setSlots(
        ((data ?? []) as { slot_start: string; slot_end: string; busy: boolean }[]).map((r) => ({
          startISO: r.slot_start,
          start: fmt(r.slot_start),
          end: fmt(r.slot_end),
          busy: r.busy,
        })),
      );
    };
    setLoading(true);
    void load();
    const ch = supabase
      .channel(`free-slots-${venueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_bookings", filter: `venue_id=eq.${venueId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [venueId, sizeOptionId, date, durationMin]);

  // Прошедшее время на сегодня не предлагаем.
  const now = Date.now();
  const visible = slots.filter((s) => new Date(s.startISO).getTime() > now);

  // Выбранный слот стал занят/исчез (кто-то успел забронировать) — сброс.
  useEffect(() => {
    if (!selectedStart) return;
    const sel = visible.find((s) => s.start === selectedStart);
    if (!sel || sel.busy) onInvalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  if (loading && !slots.length) {
    return <p className="text-sm text-muted-foreground">Загружаем свободное время…</p>;
  }
  if (!visible.length) {
    return (
      <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        На эту дату свободного времени нет — попробуй другой день или меньшую длительность.
      </p>
    );
  }

  return (
    <div>
      <Label>Свободное время (начало игры)</Label>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {visible.map((s) => {
          const active = selectedStart === s.start;
          return (
            <button
              key={s.startISO}
              type="button"
              disabled={s.busy}
              onClick={() => onPick(s.start, s.end)}
              className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${
                s.busy
                  ? "cursor-not-allowed border-border/40 bg-muted/40 text-muted-foreground/50 line-through"
                  : active
                    ? "border-transparent bg-gradient-brand text-primary-foreground shadow-glow"
                    : "border-border bg-background hover:border-primary/50"
              }`}
            >
              {s.start}
            </button>
          );
        })}
      </div>
      {selectedStart ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Выбрано: {selectedStart}–{visible.find((s) => s.start === selectedStart)?.end}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Зачёркнутое время уже занято.
        </p>
      )}
    </div>
  );
}
