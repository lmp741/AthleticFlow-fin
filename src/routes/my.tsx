import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Users, Trash2, ChevronDown, UserMinus, Download, FileText } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "Мои игры — Athletic Flow" }] }),
  component: () => (<RequireAuth><MyPage /></RequireAuth>),
});

interface MyGame {
  id: string;
  sport: string;
  level: string;
  starts_at: string;
  ends_at: string;
  price_per_player: number;
  slots_total: number;
  status: string;
  stadium: { name: string; address: string } | null;
  taken: number;
  paid: number;
  role: "organizer" | "player";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function MyPage() {
  const { user } = useAuth();
  const [organized, setOrganized] = useState<MyGame[]>([]);
  const [joined, setJoined] = useState<MyGame[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: org }, { data: parts }] = await Promise.all([
      supabase
        .from("games")
        .select("id, sport, level, starts_at, ends_at, price_per_player, slots_total, status, stadium:stadiums(name,address)")
        .eq("organizer_id", user.id)
        .order("starts_at", { ascending: true }),
      supabase
        .from("game_participants")
        .select("game_id")
        .eq("user_id", user.id),
    ]);

    const joinedIds = (parts ?? []).map((p) => p.game_id).filter((id) => !(org ?? []).some((g) => g.id === id));
    let joinedGames: any[] = [];
    if (joinedIds.length > 0) {
      const { data } = await supabase
        .from("games")
        .select("id, sport, level, starts_at, ends_at, price_per_player, slots_total, status, stadium:stadiums(name,address)")
        .in("id", joinedIds)
        .order("starts_at", { ascending: true });
      joinedGames = data ?? [];
    }

    const allIds = [...(org ?? []).map((g) => g.id), ...joinedGames.map((g) => g.id)];
    const counts = new Map<string, { taken: number; paid: number }>();
    if (allIds.length > 0) {
      const { data: ps } = await supabase
        .from("game_participants")
        .select("game_id, paid")
        .in("game_id", allIds);
      (ps ?? []).forEach((p) => {
        const c = counts.get(p.game_id) ?? { taken: 0, paid: 0 };
        c.taken += 1;
        if (p.paid) c.paid += 1;
        counts.set(p.game_id, c);
      });
    }

    const enrich = (g: any, role: "organizer" | "player"): MyGame => ({
      ...g,
      taken: counts.get(g.id)?.taken ?? 0,
      paid: counts.get(g.id)?.paid ?? 0,
      role,
    });

    setOrganized((org ?? []).map((g) => enrich(g, "organizer")));
    setJoined(joinedGames.map((g) => enrich(g, "player")));
    setLoading(false);
  };

  // Загрузка моих игр.
  // Polling 30s + focus-refetch вместо realtime — пользователь обычно держит
  // открытым максимум одну вкладку «Мои игры», а realtime на 5+ таблиц
  // (games, game_participants для всех моих) был бы дороже периодического опроса.
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const safeLoad = async () => {
      if (!alive) return;
      await load();
    };
    safeLoad();
    const intId = window.setInterval(() => {
      if (alive) safeLoad();
    }, 30_000);
    const onFocus = () => {
      if (alive && document.visibilityState !== "hidden") safeLoad();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      window.clearInterval(intId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const removeGame = async (id: string) => {
    if (!confirm("Удалить игру? Это действие нельзя отменить.")) return;
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Игра удалена");
      load();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Мои игры</h1>
        <p className="mt-2 text-muted-foreground">Управляй созданными играми и следи за теми, в которые ты записан.</p>

        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold">Я организатор</h2>
          <p className="text-sm text-muted-foreground">Игры, которые ты создал. Можешь смотреть статус, чат и удалять.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}
            {!loading && organized.length === 0 && (
              <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground md:col-span-2 xl:col-span-3">
                Ты ещё не создал ни одной игры.{" "}
                <Link to="/create" className="font-semibold text-primary underline">Создать первую</Link>
              </div>
            )}
            {organized.map((g) => (
              <GameCard key={g.id} game={g} onDelete={() => removeGame(g.id)} />
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h2 className="font-display text-2xl font-bold">Я в команде</h2>
          <p className="text-sm text-muted-foreground">Игры, в которые ты записан как игрок.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {!loading && joined.length === 0 && (
              <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground md:col-span-2 xl:col-span-3">
                Пока нет записей.{" "}
                <Link to="/games" className="font-semibold text-primary underline">Найти игру</Link>
              </div>
            )}
            {joined.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function GameCard({ game, onDelete }: { game: MyGame; onDelete?: () => void }) {
  const collected = game.paid * game.price_per_player;
  const target = game.slots_total * game.price_per_player;
  return (
    <article className="group relative flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card transition hover:shadow-elegant">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="secondary" className="mb-2">{game.sport}</Badge>
          <h3 className="font-display text-lg font-bold leading-tight">{game.stadium?.name ?? "Стадион"}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {game.stadium?.address}
          </p>
        </div>
        {game.role === "organizer" ? (
          <Badge className="bg-gradient-brand text-primary-foreground">Организатор</Badge>
        ) : (
          <Badge variant="outline">Игрок</Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" /> {fmtDate(game.starts_at)}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" /> {fmtTime(game.starts_at)}–{fmtTime(game.ends_at)}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" /> {game.taken}/{game.slots_total}
        </div>
        <div className="text-muted-foreground">
          💰 {collected} / {target} ₽
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Button asChild size="sm" className="flex-1 bg-gradient-brand text-primary-foreground hover:opacity-90">
          <Link to="/games/$gameId" params={{ gameId: game.id }}>Открыть</Link>
        </Button>
        {onDelete && (
          <Button onClick={onDelete} variant="outline" size="icon" aria-label="Удалить">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {game.role === "organizer" && <ParticipantsPanel gameId={game.id} game={game} />}
    </article>
  );
}

interface PRow {
  id: string;
  user_id: string;
  paid: boolean;
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

function ParticipantsPanel({ gameId, game }: { gameId: string; game: MyGame }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("game_participants")
      .select("id, user_id, paid, joined_at")
      .eq("game_id", gameId)
      .order("joined_at", { ascending: true });
    const ids = Array.from(new Set((data ?? []).map((p) => p.user_id)));
    const map = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      (profs ?? []).forEach((p) => map.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url }));
    }
    setRows(
      (data ?? []).map((p) => ({
        ...p,
        display_name: map.get(p.user_id)?.display_name ?? null,
        avatar_url: map.get(p.user_id)?.avatar_url ?? null,
      }))
    );
  };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    // При открытии аккордеона — первый load, потом realtime на game_participants
    // конкретной игры. Когда юзер закрывает — отписываемся, чтобы не плодить WS.
    if (rows === null) load();
    const ch = supabase
      .channel(`my-participants-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_participants", filter: `game_id=eq.${gameId}` },
        () => alive && load(),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const kick = async (p: PRow) => {
    if (!confirm(`Выгнать ${p.display_name ?? "игрока"}?`)) return;
    setBusy(p.id);
    const { error } = await supabase
      .from("game_participants")
      .delete()
      .eq("id", p.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Игрок удалён");
      setRows((r) => (r ? r.filter((x) => x.id !== p.id) : r));
    }
  };

  const ensureRows = async (): Promise<PRow[]> => {
    if (rows) return rows;
    const { data } = await supabase
      .from("game_participants")
      .select("id, user_id, paid, joined_at")
      .eq("game_id", gameId)
      .order("joined_at", { ascending: true });
    const ids = Array.from(new Set((data ?? []).map((p) => p.user_id)));
    const map = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      (profs ?? []).forEach((p) => map.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url }));
    }
    const enriched = (data ?? []).map((p) => ({
      ...p,
      display_name: map.get(p.user_id)?.display_name ?? null,
      avatar_url: map.get(p.user_id)?.avatar_url ?? null,
    }));
    setRows(enriched);
    return enriched;
  };

  const fileBase = `participants_${(game.stadium?.name ?? "game").replace(/[^a-zа-я0-9]+/gi, "_")}_${game.starts_at.slice(0, 10)}`;

  const exportCSV = async () => {
    const data = await ensureRows();
    if (data.length === 0) {
      toast.info("Нет участников для экспорта");
      return;
    }
    const header = ["#", "Имя", "Оплачено", "Записан"];
    const lines = [
      header.join(","),
      ...data.map((p, i) =>
        [
          i + 1,
          `"${(p.display_name ?? "Игрок").replace(/"/g, '""')}"`,
          p.paid ? "да" : "нет",
          new Date(p.joined_at).toLocaleString("ru-RU"),
        ].join(",")
      ),
    ];
    const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `${fileBase}.csv`);
    toast.success("CSV скачан");
  };

  const exportPDF = async () => {
    const data = await ensureRows();
    if (data.length === 0) {
      toast.info("Нет участников для экспорта");
      return;
    }
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    // Cyrillic-safe approach: render text via canvas as image (jsPDF default fonts lack cyrillic)
    const canvas = document.createElement("canvas");
    const W = 800;
    const lineH = 22;
    const top = 110;
    const H = top + (data.length + 2) * lineH + 40;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#0a0a0a";
    ctx.font = "bold 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("Список участников", 30, 40);

    ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillStyle = "#444";
    ctx.fillText(`${game.sport} · ${game.stadium?.name ?? ""}`, 30, 64);
    ctx.fillText(
      `${fmtDate(game.starts_at)}, ${fmtTime(game.starts_at)}–${fmtTime(game.ends_at)} · ${data.length}/${game.slots_total}`,
      30,
      84
    );

    // Header row
    ctx.fillStyle = "#f1f1f1";
    ctx.fillRect(30, top - 16, W - 60, lineH);
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "bold 13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("#", 40, top);
    ctx.fillText("Имя", 80, top);
    ctx.fillText("Оплачено", 420, top);
    ctx.fillText("Записан", 560, top);

    ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    data.forEach((p, i) => {
      const y = top + (i + 1) * lineH;
      if (i % 2 === 1) {
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(30, y - 16, W - 60, lineH);
      }
      ctx.fillStyle = "#0a0a0a";
      ctx.fillText(String(i + 1), 40, y);
      ctx.fillText(p.display_name ?? "Игрок", 80, y);
      ctx.fillStyle = p.paid ? "#0a8a3a" : "#a83232";
      ctx.fillText(p.paid ? "да" : "нет", 420, y);
      ctx.fillStyle = "#444";
      ctx.fillText(new Date(p.joined_at).toLocaleString("ru-RU"), 560, y);
    });

    const img = canvas.toDataURL("image/png");
    const pageW = doc.internal.pageSize.getWidth();
    const ratio = (pageW - 40) / W;
    doc.addImage(img, "PNG", 20, 20, W * ratio, H * ratio);
    doc.save(`${fileBase}.pdf`);
    toast.success("PDF скачан");
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
      >
        <span>Участники</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div className="mt-3 flex gap-2">
        <Button onClick={exportCSV} variant="outline" size="sm" className="flex-1">
          <Download className="mr-1 h-4 w-4" /> CSV
        </Button>
        <Button onClick={exportPDF} variant="outline" size="sm" className="flex-1">
          <FileText className="mr-1 h-4 w-4" /> PDF
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {rows === null && <p className="text-xs text-muted-foreground">Загрузка…</p>}
          {rows && rows.length === 0 && (
            <p className="text-xs text-muted-foreground">Пока никто не записался.</p>
          )}
          {rows?.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-brand font-display text-xs font-bold text-primary-foreground">
                  {(p.display_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.display_name ?? "Игрок"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.paid ? "Оплачено" : "Не оплачено"}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => kick(p)}
                disabled={busy === p.id}
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <UserMinus className="mr-1 h-4 w-4" /> Выгнать
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
