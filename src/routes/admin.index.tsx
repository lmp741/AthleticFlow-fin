import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Gamepad2, ShieldAlert, Trophy } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Админка · Дашборд — Athletic Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

interface Counts {
  users: number | null;
  banned: number | null;
  games: number | null;
  pendingGoals: number | null;
}

function Dashboard() {
  const [c, setC] = useState<Counts>({ users: null, banned: null, games: null, pendingGoals: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ count: users }, { count: banned }, { count: games }, { count: pending }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("profiles") as any)
          .select("id", { count: "exact", head: true })
          .not("banned_at", "is", null),
        supabase
          .from("games")
          .select("id", { count: "exact", head: true })
          .gte("starts_at", new Date().toISOString()),
        supabase
          .from("goal_claims")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      if (!alive) return;
      setC({ users: users ?? 0, banned: banned ?? 0, games: games ?? 0, pendingGoals: pending ?? 0 });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Админка</p>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Дашборд</h1>
        <p className="mt-1 text-sm text-muted-foreground">Быстрые счётчики и ссылки.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Counter label="Юзеров" value={c.users} icon={Users} />
        <Counter label="Забанено" value={c.banned} icon={ShieldAlert} tone="destructive" />
        <Counter label="Игр (предстоящие)" value={c.games} icon={Gamepad2} />
        <Counter label="Голов (pending)" value={c.pendingGoals} icon={Trophy} tone="warning" />
      </div>
    </div>
  );
}

function Counter({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | null;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "destructive" | "warning";
}) {
  const iconCls =
    tone === "destructive"
      ? "bg-destructive/15 text-destructive"
      : tone === "warning"
        ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
        : "bg-primary/10 text-primary";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      {value === null ? (
        <Skeleton className="mt-1 h-7 w-16 rounded" />
      ) : (
        <p className="font-display text-2xl font-bold leading-tight sm:text-3xl">{value.toLocaleString("ru-RU")}</p>
      )}
    </div>
  );
}
