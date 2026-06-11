import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useManager,
  fetchManagerBookings,
  toDateKey,
  type ManagerBooking,
} from "@/components/manager/manager-data";
import { BookingRow } from "@/components/manager/BookingRow";

export const Route = createFileRoute("/manager/calendar")({
  component: ManagerCalendar,
});

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function ManagerCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [selected, setSelected] = useState<string>(toDateKey(today));
  const [bookings, setBookings] = useState<ManagerBooking[]>([]);
  // Pending-заявки на серии: показываем их даты в календаре жёлтым,
  // чтобы менеджер видел ожидающие решения прямо в сетке месяца.
  const [pendingSeriesDates, setPendingSeriesDates] = useState<
    Record<string, { venue: string; time: string }[]>
  >({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const { venues } = useManager();

  const load = useCallback(async () => {
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 1);
    try {
      setBookings(await fetchManagerBookings(from.toISOString(), to.toISOString()));
    } catch {
      toast.error("Не удалось загрузить брони");
    }

    // Даты pending-серий в видимом месяце.
    const venueIds = venues.map((v) => v.id);
    if (venueIds.length) {
      const { data: ss } = await supabase
        .from("game_series")
        .select("venue_id, dates, start_time, end_time")
        .in("venue_id", venueIds)
        .eq("status", "pending");
      const map: Record<string, { venue: string; time: string }[]> = {};
      for (const s of ss ?? []) {
        const vName = venues.find((v) => v.id === s.venue_id)?.name ?? "Площадка";
        const time = `${String(s.start_time).slice(0, 5)}–${String(s.end_time).slice(0, 5)}`;
        for (const d of s.dates as string[]) {
          (map[d] = map[d] ?? []).push({ venue: vName, time });
        }
      }
      setPendingSeriesDates(map);
    }
  }, [year, month, venues]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("manager-calendar-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "venue_bookings" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_series" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  // Брони по дням месяца.
  const byDay = useMemo(() => {
    const map: Record<string, ManagerBooking[]> = {};
    for (const b of bookings) {
      const key = toDateKey(new Date(b.starts_at));
      (map[key] = map[key] ?? []).push(b);
    }
    return map;
  }, [bookings]);

  const shiftMonth = (d: number) => {
    const next = new Date(year, month + d, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  // Сетка: Пн-первый. getDay(): 0=Вс.
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7; // сколько пустых перед 1-м числом
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(toDateKey(new Date(year, month, d)));
    return out;
  }, [year, month]);

  const dayBookings = byDay[selected] ?? [];
  const todayKey = toDateKey(today);

  const cancelBooking = async (b: ManagerBooking) => {
    // Игровая бронь = отмена ИГРЫ: архив, снятие брони, нотификации о возврате.
    if (b.source === "game" && b.game_id) {
      const reason = window.prompt(
        "Отменить игру? Участники получат уведомление о возврате оплаты.\nПричина (необязательно):",
      );
      if (reason === null) return;
      const { error } = await supabase.rpc("manager_cancel_game", {
        p_game_id: b.game_id,
        p_reason: reason || null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Игра отменена, участники уведомлены");
    } else {
      if (!window.confirm("Отменить бронь?")) return;
      const { error } = await supabase.rpc("cancel_booking", { p_booking_id: b.booking_id });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Бронь отменена");
    }
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Календарь брони</h1>
        <Button
          size="sm"
          className="bg-gradient-brand text-primary-foreground hover:opacity-90"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" /> Бронь
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
          <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="Назад">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-base">
            {MONTHS[month]} {year}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="Вперёд">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pb-2 text-xs font-semibold text-muted-foreground">
                {w}
              </div>
            ))}
            {cells.map((key, i) =>
              key === null ? (
                <div key={`x${i}`} />
              ) : (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={[
                    "relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-full text-sm transition-colors",
                    key === selected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : key === todayKey
                        ? "border border-primary/60 text-foreground"
                        : "hover:bg-muted",
                  ].join(" ")}
                >
                  {Number(key.slice(8))}
                  <span className="absolute bottom-1 flex gap-0.5">
                    {(byDay[key]?.length ?? 0) > 0 && (
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          key === selected ? "bg-primary-foreground" : "bg-primary",
                        ].join(" ")}
                      />
                    )}
                    {/* Жёлтая метка: на эту дату есть pending-заявка на серию */}
                    {(pendingSeriesDates[key]?.length ?? 0) > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                  </span>
                </button>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle className="text-base">
            {new Date(selected).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              weekday: "long",
            })}
            {" · "}
            {dayBookings.length} брон{dayBookings.length === 1 ? "ь" : dayBookings.length < 5 && dayBookings.length > 0 ? "и" : "ей"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 sm:p-6">
          {/* Ожидающие заявки на серии в этот день — решение в «Записях» */}
          {(pendingSeriesDates[selected] ?? []).map((p, i) => (
            <Link
              key={`ps-${i}`}
              to="/manager"
              className="flex items-center justify-between gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 transition-colors hover:bg-amber-500/20"
            >
              <div className="text-sm">
                <p className="font-medium">Заявка на серию · {p.venue}</p>
                <p className="text-xs text-muted-foreground">
                  {p.time} · ждёт решения — подтвердить или отклонить можно в «Записях»
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-amber-600">Решить →</span>
            </Link>
          ))}
          {dayBookings.length === 0 && (pendingSeriesDates[selected]?.length ?? 0) === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">На этот день броней нет.</p>
          )}
          {dayBookings.map((b) => (
            <BookingRow key={b.booking_id} b={b} onCancel={() => cancelBooking(b)} />
          ))}
        </CardContent>
      </Card>

      <AddBookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selected}
        onCreated={() => {
          setDialogOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function AddBookingDialog({
  open,
  onOpenChange,
  defaultDate,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultDate: string;
  onCreated: () => void;
}) {
  const { venues } = useManager();
  const activeVenues = venues.filter((v) => v.active);
  const [venueId, setVenueId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState("18:00");
  const [durationH, setDurationH] = useState("1");
  const [source, setSource] = useState<"external" | "maintenance">("external");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  // Повтор еженедельно: 1 = разовая бронь.
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [busy, setBusy] = useState(false);

  // При открытии — дефолты от выбранного дня и первой площадки.
  useEffect(() => {
    if (!open) return;
    setDate(defaultDate);
    const v = activeVenues[0];
    setVenueId(v?.id ?? "");
    setSizeId(v?.size_options.find((o) => o.active)?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate]);

  const venue = activeVenues.find((v) => v.id === venueId);

  const submit = async () => {
    if (!venueId || !sizeId || !date || !start) {
      toast.error("Заполни площадку, дату и время");
      return;
    }
    const hours = Math.max(0.5, Number(durationH) || 1);
    setBusy(true);
    // Повтор еженедельно: бронируем каждую дату отдельно; занятые пропускаем
    // и честно отчитываемся, сколько создано / сколько пропущено.
    let created = 0;
    const skipped: string[] = [];
    for (let week = 0; week < repeatWeeks; week++) {
      const starts = new Date(`${date}T${start}:00`);
      starts.setDate(starts.getDate() + week * 7);
      const ends = new Date(starts.getTime() + hours * 3600_000);
      const { error } = await supabase.rpc("book_venue", {
        p_venue_id: venueId,
        p_size_option_id: sizeId,
        p_starts_at: starts.toISOString(),
        p_ends_at: ends.toISOString(),
        p_source: source,
        p_external_name: source === "external" ? name : null,
        p_external_phone: source === "external" ? phone : null,
        p_external_notes: notes || null,
      });
      if (error) {
        if (error.message.includes("Time slot is full")) {
          skipped.push(starts.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }));
          continue;
        }
        setBusy(false);
        toast.error(error.message);
        return;
      }
      created += 1;
    }
    setBusy(false);
    if (created === 0) {
      toast.error("Все даты заняты — броней не создано");
      return;
    }
    toast.success(
      `Создано броней: ${created}` +
        (skipped.length ? `. Занято (пропущено): ${skipped.join(", ")}` : ""),
    );
    setName("");
    setPhone("");
    setNotes("");
    setRepeatWeeks(1);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новая бронь</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label>Площадка</Label>
              <Select
                value={venueId}
                onValueChange={(v) => {
                  setVenueId(v);
                  const ven = activeVenues.find((x) => x.id === v);
                  setSizeId(ven?.size_options.find((o) => o.active)?.id ?? "");
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выбери" />
                </SelectTrigger>
                <SelectContent>
                  {activeVenues.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Размер</Label>
              <Select value={sizeId} onValueChange={setSizeId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выбери" />
                </SelectTrigger>
                <SelectContent>
                  {(venue?.size_options ?? [])
                    .filter((o) => o.active)
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label} — {o.price_per_hour} ₽/ч
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Дата</Label>
              <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Начало</Label>
                <Input type="time" className="mt-1" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <Label>Часов</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="mt-1"
                  value={durationH}
                  onChange={(e) => setDurationH(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Повтор</Label>
            <Select value={String(repeatWeeks)} onValueChange={(v) => setRepeatWeeks(Number(v))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Без повтора</SelectItem>
                <SelectItem value="2">Еженедельно · 2 недели</SelectItem>
                <SelectItem value="4">Еженедельно · 4 недели</SelectItem>
                <SelectItem value="8">Еженедельно · 8 недель</SelectItem>
                <SelectItem value="12">Еженедельно · 12 недель</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Тип</Label>
            <Select value={source} onValueChange={(v) => setSource(v as "external" | "maintenance")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="external">Внешний клиент (по телефону)</SelectItem>
                <SelectItem value="maintenance">Техобслуживание (закрыть слот)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {source === "external" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Имя клиента</Label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Телефон</Label>
                <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>Заметка</Label>
            <Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            disabled={busy}
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            onClick={submit}
          >
            Забронировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
