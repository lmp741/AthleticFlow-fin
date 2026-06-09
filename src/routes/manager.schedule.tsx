import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useManager, fmtDate } from "@/components/manager/manager-data";

export const Route = createFileRoute("/manager/schedule")({
  component: ManagerSchedule,
});

// Порядок отображения: Пн..Вс. В БД weekday — Postgres DOW (0=Вс..6=Сб).
const DAYS: { dow: number; label: string }[] = [
  { dow: 1, label: "Понедельник" },
  { dow: 2, label: "Вторник" },
  { dow: 3, label: "Среда" },
  { dow: 4, label: "Четверг" },
  { dow: 5, label: "Пятница" },
  { dow: 6, label: "Суббота" },
  { dow: 0, label: "Воскресенье" },
];

type DayState = { open: string; close: string; enabled: boolean };
type Override = {
  id: string;
  override_date: string;
  open_time: string | null;
  close_time: string | null;
  reason: string | null;
};

function ManagerSchedule() {
  const { stadium } = useManager();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<Record<number, DayState>>({});
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [saving, setSaving] = useState(false);
  const [ovDialog, setOvDialog] = useState(false);

  const load = useCallback(async () => {
    // Базовые строки графика (бессрочные).
    const { data: rows } = await supabase
      .from("stadium_schedules")
      .select("id, weekday, open_time, close_time, active_from, active_to")
      .eq("stadium_id", stadium.id)
      .is("active_from", null)
      .is("active_to", null);
    const next: Record<number, DayState> = {};
    for (const d of DAYS) {
      const r = (rows ?? []).find((x) => x.weekday === d.dow);
      next[d.dow] = r
        ? { open: r.open_time.slice(0, 5), close: r.close_time.slice(0, 5), enabled: true }
        : { open: "08:00", close: "23:00", enabled: !rows?.length ? true : false };
      // Если графика нет вообще — действует дефолт 08-23 (см. get_free_slots),
      // показываем все дни включёнными с дефолтным временем.
    }
    setDays(next);

    const { data: ovs } = await supabase
      .from("stadium_schedule_overrides")
      .select("id, override_date, open_time, close_time, reason")
      .eq("stadium_id", stadium.id)
      .gte("override_date", new Date().toISOString().slice(0, 10))
      .order("override_date", { ascending: true });
    setOverrides((ovs ?? []) as Override[]);
    setLoading(false);
  }, [stadium.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDay = (dow: number, patch: Partial<DayState>) =>
    setDays((p) => ({ ...p, [dow]: { ...p[dow], ...patch } }));

  const saveWeekly = async () => {
    // Валидация.
    for (const d of DAYS) {
      const s = days[d.dow];
      if (s.enabled && s.close <= s.open) {
        toast.error(`${d.label}: закрытие должно быть позже открытия`);
        return;
      }
    }
    setSaving(true);
    // MVP-стратегия: сносим базовые строки и пишем заново (мало строк, атомарность не критична).
    const { error: delErr } = await supabase
      .from("stadium_schedules")
      .delete()
      .eq("stadium_id", stadium.id)
      .is("active_from", null)
      .is("active_to", null);
    if (delErr) {
      setSaving(false);
      toast.error(delErr.message);
      return;
    }
    const rows = DAYS.filter((d) => days[d.dow].enabled).map((d) => ({
      stadium_id: stadium.id,
      weekday: d.dow,
      open_time: days[d.dow].open,
      close_time: days[d.dow].close,
    }));
    if (rows.length) {
      const { error: insErr } = await supabase.from("stadium_schedules").insert(rows);
      if (insErr) {
        setSaving(false);
        toast.error(insErr.message);
        return;
      }
    }
    setSaving(false);
    toast.success("График сохранён");
    void load();
  };

  const deleteOverride = async (id: string) => {
    const { error } = await supabase.from("stadium_schedule_overrides").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Удалено");
    void load();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">График работы</h1>

      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle className="text-base">Еженедельное расписание</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 sm:p-6">
          {DAYS.map((d) => {
            const s = days[d.dow];
            return (
              <div
                key={d.dow}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={(v) => setDay(d.dow, { enabled: v })}
                  />
                  <span className={`w-28 text-sm font-medium ${s.enabled ? "" : "text-muted-foreground"}`}>
                    {d.label}
                  </span>
                </div>
                {s.enabled ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="w-28"
                      value={s.open}
                      onChange={(e) => setDay(d.dow, { open: e.target.value })}
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                      type="time"
                      className="w-28"
                      value={s.close}
                      onChange={(e) => setDay(d.dow, { close: e.target.value })}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Выходной</span>
                )}
              </div>
            );
          })}
          <div className="pt-2">
            <Button
              disabled={saving}
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
              onClick={saveWeekly}
            >
              Сохранить график
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle className="text-base">Исключения (праздники, ремонт)</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOvDialog(true)}>
            <Plus className="mr-1 h-4 w-4" /> Добавить
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 p-4 sm:p-6">
          {overrides.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Исключений нет — действует еженедельный график.
            </p>
          )}
          {overrides.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 p-3"
            >
              <div className="min-w-0 text-sm">
                <p className="font-medium">{fmtDate(o.override_date)}</p>
                <p className="text-xs text-muted-foreground">
                  {o.open_time
                    ? `${o.open_time.slice(0, 5)}–${o.close_time?.slice(0, 5)}`
                    : "Закрыто весь день"}
                  {o.reason && ` · ${o.reason}`}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Удалить"
                onClick={() => deleteOverride(o.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <AddOverrideDialog
        open={ovDialog}
        onOpenChange={setOvDialog}
        stadiumId={stadium.id}
        onCreated={() => {
          setOvDialog(false);
          void load();
        }}
      />
    </div>
  );
}

function AddOverrideDialog({
  open,
  onOpenChange,
  stadiumId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stadiumId: string;
  onCreated: () => void;
}) {
  const [date, setDate] = useState("");
  const [closed, setClosed] = useState(true);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("23:00");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!date) {
      toast.error("Укажи дату");
      return;
    }
    if (!closed && closeTime <= openTime) {
      toast.error("Закрытие должно быть позже открытия");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("stadium_schedule_overrides").upsert(
      {
        stadium_id: stadiumId,
        override_date: date,
        open_time: closed ? null : openTime,
        close_time: closed ? null : closeTime,
        reason: reason || null,
      },
      { onConflict: "stadium_id,override_date" },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Исключение добавлено");
    setDate("");
    setReason("");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Исключение на дату</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Дата</Label>
            <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={closed} onCheckedChange={setClosed} />
            <span className="text-sm">Закрыто весь день</span>
          </div>
          {!closed && (
            <div className="flex items-center gap-2">
              <Input type="time" className="w-28" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
              <span className="text-muted-foreground">—</span>
              <Input type="time" className="w-28" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Причина</Label>
            <Input
              className="mt-1"
              placeholder="Праздник, ремонт, турнир..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
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
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
