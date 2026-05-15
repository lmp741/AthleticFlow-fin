import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Trash2, Lock, Globe, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/games")({
  head: () => ({
    meta: [
      { title: "Админка · Игры — Athletic Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GamesAdmin,
});

interface GameRow {
  id: string;
  sport: string;
  level: string;
  starts_at: string;
  ends_at: string;
  price_per_player: number;
  slots_total: number;
  is_private: boolean;
  status: string;
  organizer_id: string;
  stadium: { id: string; name: string } | null;
  participants: { count: number }[];
}

const PAGE_SIZE = 30;

function GamesAdmin() {
  const [games, setGames] = useState<GameRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [scope, setScope] = useState<"upcoming" | "past" | "all">("upcoming");

  const load = async () => {
    const nowIso = new Date().toISOString();
    let q = supabase
      .from("games")
      .select(
        "id, sport, level, starts_at, ends_at, price_per_player, slots_total, is_private, status, organizer_id, stadium:stadiums(id,name), participants:game_participants(count)",
        { count: "exact" },
      )
      .order("starts_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    if (scope === "upcoming") q = q.gte("starts_at", nowIso);
    if (scope === "past") q = q.lt("starts_at", nowIso);
    const s = search.trim();
    if (s) {
      const safe = s.replace(/[%_]/g, "\\$&").slice(0, 64);
      q = q.or(`sport.ilike.%${safe}%,level.ilike.%${safe}%`);
    }
    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = (data ?? []) as unknown as GameRow[];
    setHasMore(list.length > PAGE_SIZE);
    setGames(list.slice(0, PAGE_SIZE));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, scope]);

  const onDelete = async (id: string) => {
    const ok = window.confirm("Удалить игру? Это безвозвратно — будут потеряны участники, чаты, голы.");
    if (!ok) return;
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Удалено");
      // Аудит
      await supabase.from("admin_actions").insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        target_kind: "game",
        target_id: id,
        action: "delete_game",
      });
      load();
    }
  };

  const onCancel = async (id: string) => {
    const ok = window.confirm("Отменить игру (status=cancelled)? Участники увидят что матч отменён.");
    if (!ok) return;
    const { error } = await supabase.from("games").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Игра отменена");
      await supabase.from("admin_actions").insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        target_kind: "game",
        target_id: id,
        action: "cancel_game",
      });
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Админка</p>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Игры</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            maxLength={64}
            placeholder="Поиск по виду спорта или уровню…"
            className="h-10 pl-10"
          />
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {(["upcoming", "past", "all"] as const).map((s) => (
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
              {s === "upcoming" ? "Будущие" : s === "past" ? "Прошедшие" : "Все"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Когда</th>
              <th className="px-4 py-3 text-left">Спорт · Уровень</th>
              <th className="px-4 py-3 text-left">Стадион</th>
              <th className="px-4 py-3 text-left">Состав</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {games === null ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td colSpan={6} className="px-4 py-3">
                    <Skeleton className="h-6 w-full rounded" />
                  </td>
                </tr>
              ))
            ) : games.length === 0 ? (
              <tr className="border-t border-border">
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Ничего не нашли
                </td>
              </tr>
            ) : (
              games.map((g) => (
                <tr key={g.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    {new Date(g.starts_at).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {g.sport} <span className="text-xs text-muted-foreground">· {g.level}</span>
                  </td>
                  <td className="px-4 py-3">{g.stadium?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {(g.participants?.[0]?.count ?? 0)}/{g.slots_total} · {g.price_per_player} ₽
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {g.status === "cancelled" ? (
                        <Badge variant="outline" className="text-destructive">Отменена</Badge>
                      ) : (
                        <Badge variant="secondary">{g.status || "active"}</Badge>
                      )}
                      {g.is_private ? (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" /> Приватная
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" /> Открытая
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/games/$gameId" params={{ gameId: g.id }} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {g.status !== "cancelled" && (
                        <Button size="sm" variant="outline" onClick={() => onCancel(g.id)}>
                          Отменить
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => onDelete(g.id)}>
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
