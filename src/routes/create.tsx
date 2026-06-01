import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Wallet, Lock, Globe, Eye, Clock as ClockIcon, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
  head: () => ({
    meta: [
      { title: "Создать игру — Athletic Flow" },
      { name: "description", content: "Собери команду и забронируй стадион за 3 клика." },
    ],
  }),
  component: () => (<RequireAuth><CreateGamePage /></RequireAuth>),
});

const sports = [
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
const levels = ["Новичок", "Любитель", "Полупрофи", "Профи"];

interface StadiumOpt {
  id: string;
  name: string;
  address: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function CreateGamePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [sport, setSport] = useState("Футбол");
  const [level, setLevel] = useState("Любитель");
  const [date, setDate] = useState(todayISO());
  const [timeStart, setTimeStart] = useState("19:00");
  const [timeEnd, setTimeEnd] = useState("20:30");
  const [players, setPlayers] = useState([10]);
  const [stadiums, setStadiums] = useState<StadiumOpt[]>([]);
  const [stadiumId, setStadiumId] = useState("");
  // Модель оплаты:
  //   "split" — вводим общую аренду, делим на участников (price/чел = floor(rent/N))
  //   "fixed" — вводим фикс. сумму с каждого, общая = price × N
  const [payMode, setPayMode] = useState<"split" | "fixed">("split");
  const [rentTotal, setRentTotal] = useState("5000");
  const [fixedPrice, setFixedPrice] = useState("500");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  // Требовать одобрение заявок организатором перед попаданием в состав.
  // Когда включено — игроки видят кнопку «Подать заявку», а не «Записаться».
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("stadiums")
        .select("id, name, address")
        .order("name");
      if (data) {
        setStadiums(data);
        if (data[0]) setStadiumId(data[0].id);
      }
    })();
  }, []);

  // Комиссия 10% — внутреннее правило, в UI не показываем.
  // split:  игрок платит ceil(rent × 1.1 / N) — наценка покрывает сервисный сбор.
  // fixed:  игрок платит ceil(fixed × 1.1) — то же правило, но от введённой суммы.
  // Организатор видит только цену, которую увидит игрок; распределение между
  // владельцем стадиона и сервисом — внутренний механизм.
  const COMMISSION = 0.1;
  const slots = Math.max(1, players[0]);
  const rentNum = Math.max(0, Number(rentTotal) || 0);
  const fixedNum = Math.max(0, Number(fixedPrice) || 0);
  const splitPrice = Math.ceil((rentNum * (1 + COMMISSION)) / slots);
  const fixedPriceFinal = Math.ceil(fixedNum * (1 + COMMISSION));
  const pricePerPlayer = payMode === "split" ? splitPrice : fixedPriceFinal;
  const totalPlan = pricePerPlayer * slots;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !stadiumId) return;
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
        slots_total: players[0],
        price_per_player: pricePerPlayer,
        // rent_total сохраняем только в split-модели — на странице игры её используем
        // для пересчёта при редактировании slots.
        rent_total: payMode === "split" ? rentNum : null,
        description: description || null,
        is_private: isPrivate,
        requires_approval: requiresApproval,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error(error?.message ?? "Не удалось создать игру");
      return;
    }
    // Auto-join organizer
    await supabase.from("game_participants").insert({ game_id: data.id, user_id: user.id });
    toast.success("Игра создана!");
    navigate({ to: "/games/$gameId", params: { gameId: data.id } });
  };

  return (
    <div className="min-h-screen bg-background">
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
          <div className="space-y-6 lg:col-span-2">
            <Card title="Вид спорта">
              <Chips items={sports} value={sport} onChange={setSport} />
            </Card>

            <Card title="Когда" icon={Calendar}>
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
            </Card>

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
                        <span className="ml-1 text-xs text-muted-foreground">— {s.address}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <Label>Кол-во игроков</Label>
                  <span className="font-display text-lg font-bold">{players[0]}</span>
                </div>
                <Slider value={players} onValueChange={setPlayers} min={4} max={22} step={1} className="mt-3" />
              </div>
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

              {/* Аппрув заявок: имеет смысл и для открытых, и для приватных. */}
              <button
                type="button"
                onClick={() => setRequiresApproval((v) => !v)}
                className={`mt-3 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                  requiresApproval ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                    requiresApproval ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                  }`}
                >
                  {requiresApproval && <Check className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <div className="font-semibold">Принимать игроков по заявкам</div>
                  <div className="text-xs text-muted-foreground">
                    Игроки подают заявку — ты подтверждаешь или отклоняешь. Удобно, если хочешь собрать
                    однородный состав.
                  </div>
                </div>
              </button>
            </Card>
          </div>

          <aside className="space-y-4">
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
                      <Users className="h-3.5 w-3.5" /> 1/{players[0]} игроков
                    </span>
                    <span className="font-display text-base font-bold">
                      {pricePerPlayer === 0 ? "Бесплатно" : `${pricePerPlayer} ₽`}
                    </span>
                  </div>
                </div>
              </div>

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

              <Button
                type="submit"
                size="lg"
                disabled={submitting || !stadiumId}
                className="w-full bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90"
              >
                <Sparkles className="mr-1 h-4 w-4" />
                {submitting ? "Публикуем…" : "Опубликовать игру"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Игра сразу появится в каталоге и соберёт команду.
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
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h2 className="font-display text-lg font-semibold">{title}</h2>
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
