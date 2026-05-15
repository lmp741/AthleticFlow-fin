import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/log")({
  head: () => ({
    meta: [
      { title: "Админка · Аудит — Athletic Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LogAdmin,
});

interface ActionRow {
  id: string;
  actor_id: string;
  target_kind: string;
  target_id: string | null;
  action: string;
  reason: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  actor: { username: string | null; display_name: string | null } | null;
}

const PAGE_SIZE = 50;

function LogAdmin() {
  const [rows, setRows] = useState<ActionRow[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("admin_actions")
      .select("id, actor_id, target_kind, target_id, action, reason, payload, created_at")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    if (error) {
      // Не падаем — просто покажем пустой лог
      setRows([]);
      return;
    }
    const list = (data ?? []) as Omit<ActionRow, "actor">[];
    if (list.length === 0) {
      setRows([]);
      setHasMore(false);
      return;
    }
    const actorIds = Array.from(new Set(list.map((r) => r.actor_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", actorIds);
    const pMap = new Map((profs ?? []).map((p) => [p.id, p]));
    const enriched = list.map((r) => ({
      ...r,
      actor: (pMap.get(r.actor_id) as ActionRow["actor"]) ?? null,
    }));
    setHasMore(enriched.length > PAGE_SIZE);
    setRows(enriched.slice(0, PAGE_SIZE));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Админка</p>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Аудит-лог</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Все действия админов. Запись делается через триггеры/RPC автоматически.
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Когда</th>
              <th className="px-4 py-3 text-left">Кто</th>
              <th className="px-4 py-3 text-left">Действие</th>
              <th className="px-4 py-3 text-left">Цель</th>
              <th className="px-4 py-3 text-left">Детали</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td colSpan={5} className="px-4 py-3">
                    <Skeleton className="h-6 w-full rounded" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr className="border-t border-border">
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Лог пуст
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {r.actor?.display_name ?? (r.actor?.username ? `@${r.actor.username}` : r.actor_id.slice(0, 8))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{r.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.target_kind} · <span className="text-muted-foreground">{r.target_id?.slice(0, 8) ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.reason && <span className="text-muted-foreground">{r.reason}</span>}
                    {r.payload && (
                      <pre className="overflow-x-auto rounded bg-muted/40 p-1 text-[10px]">
                        {JSON.stringify(r.payload)}
                      </pre>
                    )}
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
