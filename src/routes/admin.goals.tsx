import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/goals")({
  head: () => ({
    meta: [
      { title: "Админка · Голы — Athletic Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GoalsAdmin,
});

interface ClaimRow {
  id: string;
  user_id: string;
  game_id: string;
  count: number;
  status: string;
  created_at: string;
  profile: { username: string | null; display_name: string | null } | null;
  approvals_count: number;
}

const PAGE_SIZE = 30;

function GoalsAdmin() {
  const [claims, setClaims] = useState<ClaimRow[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [scope, setScope] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const load = async () => {
    let q = supabase
      .from("goal_claims")
      .select("id, user_id, game_id, count, status, created_at")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    if (scope !== "all") q = q.eq("status", scope);
    const { data: rows, error } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = (rows ?? []) as Omit<ClaimRow, "profile" | "approvals_count">[];
    if (list.length === 0) {
      setClaims([]);
      setHasMore(false);
      return;
    }
    const userIds = Array.from(new Set(list.map((c) => c.user_id)));
    const claimIds = list.map((c) => c.id);
    const [{ data: profs }, { data: aps }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name").in("id", userIds),
      supabase.from("goal_claim_approvals").select("claim_id").in("claim_id", claimIds),
    ]);
    const pMap = new Map((profs ?? []).map((p) => [p.id, p]));
    const apMap = new Map<string, number>();
    (aps ?? []).forEach((a) => apMap.set(a.claim_id, (apMap.get(a.claim_id) ?? 0) + 1));
    const enriched = list.map((c) => ({
      ...c,
      profile: (pMap.get(c.user_id) as ClaimRow["profile"]) ?? null,
      approvals_count: apMap.get(c.id) ?? 0,
    }));
    setHasMore(enriched.length > PAGE_SIZE);
    setClaims(enriched.slice(0, PAGE_SIZE));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, scope]);

  const force = async (id: string, status: "approved" | "rejected" | "pending") => {
    const { error } = await supabase.rpc("admin_force_goal_claim", { p_claim: id, p_status: status });
    if (error) toast.error(error.message);
    else {
      toast.success(`Статус: ${status}`);
      load();
    }
  };

  const remove = async (id: string) => {
    const ok = window.confirm("Удалить заявку? Это безвозвратно.");
    if (!ok) return;
    const { error } = await supabase.from("goal_claims").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Удалено");
      await supabase.from("admin_actions").insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        target_kind: "goal_claim",
        target_id: id,
        action: "delete_claim",
      });
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Админка</p>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Голы</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Модерация заявок на забитые голы. force-approve / reject выставляют статус принудительно.
        </p>
      </div>

      <div className="flex gap-1 rounded-full border border-border bg-card p-1 w-fit">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setPage(0);
              setScope(s);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "pending" ? "Ожидают" : s === "approved" ? "Одобрены" : s === "rejected" ? "Отклонены" : "Все"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Игрок</th>
              <th className="px-4 py-3 text-left">Игра</th>
              <th className="px-4 py-3 text-left">Голов</th>
              <th className="px-4 py-3 text-left">Аппрувы</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-left">Когда</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {claims === null ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td colSpan={7} className="px-4 py-3">
                    <Skeleton className="h-6 w-full rounded" />
                  </td>
                </tr>
              ))
            ) : claims.length === 0 ? (
              <tr className="border-t border-border">
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Заявок нет
                </td>
              </tr>
            ) : (
              claims.map((c) => (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    {c.profile?.display_name ?? (c.profile?.username ? `@${c.profile.username}` : "Игрок")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/games/$gameId"
                      params={{ gameId: c.game_id }}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Открыть <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-bold">{c.count}</td>
                  <td className="px-4 py-3">{c.approvals_count} / 3</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={
                        c.status === "approved"
                          ? "border-emerald-300/60 text-emerald-700 dark:text-emerald-400"
                          : c.status === "rejected"
                            ? "border-destructive/60 text-destructive"
                            : ""
                      }
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {c.status !== "approved" && (
                        <Button size="sm" variant="outline" onClick={() => force(c.id, "approved")}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                      )}
                      {c.status !== "rejected" && (
                        <Button size="sm" variant="outline" onClick={() => force(c.id, "rejected")}>
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => remove(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          Назад
        </Button>
        <span className="text-xs text-muted-foreground">Стр. {page + 1}</span>
        <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
          Далее
        </Button>
      </div>
    </div>
  );
}
