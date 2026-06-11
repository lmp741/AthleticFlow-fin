import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Banknote, CalendarCheck, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useManager,
  fetchManagerBookings,
  fmtMoney,
  SOURCE_LABEL,
  type ManagerBooking,
} from "@/components/manager/manager-data";

export const Route = createFileRoute("/manager/finance")({
  component: ManagerFinance,
});

const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

/** Сколько последних месяцев показываем. */
const WINDOW = 6;

type MonthAgg = {
  key: string; // "2026-06"
  label: string; // "июн 26"
  total: number;
  game: number;
  external: number;
  count: number;
};

function ManagerFinance() {
  const { venues } = useManager();
  const [bookings, setBookings] = useState<ManagerBooking[] | null>(null);

  const load = useCallback(async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (WINDOW - 1), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    try {
      setBookings(await fetchManagerBookings(from.toISOString(), to.toISOString()));
    } catch {
      toast.error("Не удалось загрузить данные");
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("manager-finance-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "venue_bookings" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  // Только подтверждённые: cancelled RPC и так не отдаёт, maintenance — не выручка.
  const revenue = useMemo(
    () => (bookings ?? []).filter((b) => b.status === "confirmed" && b.source !== "maintenance"),
    [bookings],
  );

  // Агрегация по месяцам (включая пустые — для ровного графика).
  const byMonth = useMemo<MonthAgg[]>(() => {
    const now = new Date();
    const out: MonthAgg[] = [];
    for (let i = WINDOW - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        total: 0,
        game: 0,
        external: 0,
        count: 0,
      });
    }
    const idx = new Map(out.map((m) => [m.key, m]));
    for (const b of revenue) {
      const d = new Date(b.starts_at);
      const m = idx.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      if (!m) continue;
      const sum = b.price_total ?? 0;
      m.total += sum;
      m.count += 1;
      if (b.source === "game") m.game += sum;
      else m.external += sum;
    }
    return out;
  }, [revenue]);

  // Разбивка по площадкам за весь период.
  const byVenue = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const b of revenue) {
      const v = map.get(b.venue_id) ?? { name: b.venue_name, total: 0, count: 0 };
      v.total += b.price_total ?? 0;
      v.count += 1;
      map.set(b.venue_id, v);
    }
    // Площадки без броней тоже показываем — менеджеру видно, что простаивает.
    for (const v of venues) {
      if (!map.has(v.id)) map.set(v.id, { name: v.name, total: 0, count: 0 });
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [revenue, venues]);

  const current = byMonth[byMonth.length - 1];
  const previous = byMonth[byMonth.length - 2];
  const periodTotal = byMonth.reduce((s, m) => s + m.total, 0);
  const maxMonth = Math.max(1, ...byMonth.map((m) => m.total));

  if (bookings === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Финансы</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Расчётная выручка по подтверждённым броням (аренда, без сервисной комиссии).
          Фактические расчёты — вне сервиса, пока не подключён эквайринг.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          icon={Banknote}
          value={fmtMoney(current?.total ?? 0)}
          label={`Этот месяц · ${current?.count ?? 0} брон.`}
        />
        <StatTile
          icon={TrendingUp}
          value={fmtMoney(previous?.total ?? 0)}
          label={`Прошлый месяц · ${previous?.count ?? 0} брон.`}
        />
        <StatTile
          icon={CalendarCheck}
          value={fmtMoney(periodTotal)}
          label={`За ${WINDOW} месяцев`}
        />
      </div>

      {/* Бар-чарт по месяцам */}
      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle className="text-base">Выручка по месяцам</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
            {byMonth.map((m) => (
              <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {m.total > 0 ? `${Math.round(m.total / 1000)}к` : ""}
                </span>
                <div
                  className="w-full max-w-12 rounded-t-lg bg-gradient-brand transition-all"
                  style={{ height: `${Math.max(m.total > 0 ? 6 : 2, (m.total / maxMonth) * 100)}%` }}
                  title={`${m.label}: ${fmtMoney(m.total)}`}
                />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {SOURCE_LABEL.game}: <b className="text-foreground">{fmtMoney(byMonth.reduce((s, m) => s + m.game, 0))}</b>
            </span>
            <span>
              {SOURCE_LABEL.external}: <b className="text-foreground">{fmtMoney(byMonth.reduce((s, m) => s + m.external, 0))}</b>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* По площадкам */}
      <Card>
        <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <CardTitle className="text-base">По площадкам · {WINDOW} мес.</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 sm:p-6">
          {byVenue.map((v) => (
            <div
              key={v.name}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">{v.name}</span>
                {v.count === 0 && <Badge variant="outline">нет броней</Badge>}
              </div>
              <div className="shrink-0 text-right text-sm">
                <p className="font-display font-bold">{fmtMoney(v.total)}</p>
                <p className="text-xs text-muted-foreground">{v.count} брон.</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Banknote;
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
