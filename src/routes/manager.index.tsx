import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CalendarCheck,
  Banknote,
  Users,
  Phone,
  Mail,
  MapPin,
  Check,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useManager,
  fetchManagerBookings,
  fmtMoney,
  fmtDate,
  type ManagerBooking,
  type ManagerSeries,
} from "@/components/manager/manager-data";
import { BookingRow, initials } from "@/components/manager/BookingRow";

export const Route = createFileRoute("/manager/")({
  component: ManagerHome,
});

function ManagerHome() {
  const { stadium, venues } = useManager();
  const [loading, setLoading] = useState(true);
  const [monthBookings, setMonthBookings] = useState<ManagerBooking[]>([]);
  const [upcoming, setUpcoming] = useState<ManagerBooking[]>([]);
  const [series, setSeries] = useState<ManagerSeries[]>([]);
  const [seriesProfiles, setSeriesProfiles] = useState<
    Record<string, { display_name: string | null; avatar_url: string | null }>
  >({});
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  const venueIds = useMemo(() => venues.map((v) => v.id), [venues]);

  const load = useCallback(async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const horizon = new Date(now.getTime() + 14 * 86400_000);

    try {
      const [month, up] = await Promise.all([
        fetchManagerBookings(monthStart.toISOString(), monthEnd.toISOString()),
        fetchManagerBookings(now.toISOString(), horizon.toISOString()),
      ]);
      setMonthBookings(month);
      setUpcoming(up);
    } catch {
      toast.error("Не удалось загрузить записи");
    }

    if (venueIds.length) {
      const { data: ss } = await supabase
        .from("game_series")
        .select(
          "id, organizer_id, venue_id, size_option_id, dates, start_time, end_time, sport, level, slots_total, status, notes, created_at",
        )
        .in("venue_id", venueIds)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      const list = (ss ?? []) as ManagerSeries[];
      setSeries(list);
      const uids = [...new Set(list.map((s) => s.organizer_id))];
      if (uids.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", uids);
        setSeriesProfiles(
          Object.fromEntries((ps ?? []).map((p) => [p.id, p])),
        );
      }
    }
    setLoading(false);
  }, [venueIds]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: новые брони и заявки серий.
  useEffect(() => {
    const ch = supabase
      .channel("manager-home-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "venue_bookings" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_series" }, () => load())
      // Статус оплаты: записи/оплаты участников меняют paid_count.
      .on("postgres_changes", { event: "*", schema: "public", table: "game_participants" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const stats = useMemo(() => {
    const confirmed = monthBookings.filter((b) => b.status === "confirmed");
    const today = new Date().toDateString();
    return {
      total: confirmed.length,
      income: confirmed.reduce((s, b) => s + (b.price_total ?? 0), 0),
      todayCount: confirmed.filter((b) => new Date(b.starts_at).toDateString() === today).length,
    };
  }, [monthBookings]);

  const venueName = (id: string) => venues.find((v) => v.id === id)?.name ?? "—";
  const sizeLabel = (venueId: string, optId: string) =>
    venues.find((v) => v.id === venueId)?.size_options.find((o) => o.id === optId)?.label ?? "";

  const approveSeries = async (id: string) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("approve_series", { p_series_id: id });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const created = (data as { created?: number } | null)?.created;
    toast.success(`Серия одобрена${created ? `, создано игр: ${created}` : ""}`);
    void load();
  };

  const rejectSeries = async () => {
    if (!rejectId) return;
    setBusy(true);
    const { error } = await supabase.rpc("reject_series", {
      p_series_id: rejectId,
      p_reason: rejectReason || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Заявка отклонена");
    setRejectId(null);
    setRejectReason("");
    void load();
  };

  const cancelBooking = async (id: string) => {
    const { error } = await supabase.rpc("cancel_booking", { p_booking_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Бронь отменена");
    void load();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Карточка стадиона */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4 sm:p-6">
          <Avatar className="h-14 w-14 rounded-2xl">
            <AvatarImage src={stadium.cover_url ?? undefined} className="object-cover" />
            <AvatarFallback className="rounded-2xl">{initials(stadium.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-bold sm:text-xl">{stadium.name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {stadium.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {stadium.address}
                </span>
              )}
              {stadium.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {stadium.phone}
                </span>
              )}
              {stadium.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {stadium.email}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика за месяц */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={CalendarCheck} value={String(stats.total)} label="Броней за месяц" />
        <StatTile icon={Banknote} value={fmtMoney(stats.income)} label="Доход за месяц" />
        <StatTile icon={Users} value={String(stats.todayCount)} label="Броней сегодня" />
      </div>

      {/* Заявки на серии */}
      {series.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <CardTitle className="text-base">Заявки на серии игр</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {series.map((s) => {
              const p = seriesProfiles[s.organizer_id];
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={p?.avatar_url ?? undefined} />
                      <AvatarFallback>{initials(p?.display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-sm">
                      <p className="truncate font-medium">{p?.display_name ?? "Игрок"}</p>
                      <p className="text-xs text-muted-foreground">
                        {venueName(s.venue_id)}
                        {sizeLabel(s.venue_id, s.size_option_id) &&
                          ` · ${sizeLabel(s.venue_id, s.size_option_id)}`}
                        {" · "}
                        {s.dates.length} дат · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                        {" · "}
                        {s.sport} · {s.slots_total} чел.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Даты: {s.dates.map((d) => fmtDate(d)).join(", ")}
                      </p>
                      {s.notes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">«{s.notes}»</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => setRejectId(s.id)}
                    >
                      <X className="mr-1 h-4 w-4" /> Отклонить
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                      onClick={() => approveSeries(s.id)}
                    >
                      <Check className="mr-1 h-4 w-4" /> Подтвердить
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Ближайшие записи */}
      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle className="text-base">Ближайшие записи (14 дней)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 sm:p-6">
          {upcoming.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Записей на ближайшие 14 дней нет.
            </p>
          )}
          {upcoming.map((b) => (
            <BookingRow key={b.booking_id} b={b} onCancel={() => cancelBooking(b.booking_id)} />
          ))}
        </CardContent>
      </Card>

      {/* Диалог отклонения серии */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2">
          <DialogHeader>
            <DialogTitle>Отклонить заявку на серию</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Причина (увидит организатор)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectId(null)}>
              Отмена
            </Button>
            <Button variant="destructive" disabled={busy} onClick={rejectSeries}>
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
