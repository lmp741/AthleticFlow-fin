import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Calendar, Clock, MapPin, MessageCircle, Star, Users, ArrowLeft, Send, CreditCard, CheckCircle2, Loader2, UserPlus, Copy, ImagePlus, X, Lock, Globe, Link2, ShieldCheck, Trophy, Flame, AlertTriangle, RefreshCw, CalendarClock, Zap, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";


export const Route = createFileRoute("/games_/$gameId")({
  head: ({ params }) => {
    const url = `https://httpsaf-sport.lovable.app/games/${params.gameId}`;
    const title = "Игра — присоединиться к команде — Athletic Flow";
    const description =
      "Детали любительской игры: вид спорта, стадион, время, уровень, свободные слоты и стоимость. Присоединяйся к команде в 3 клика.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: GamePage,
});

interface GameDetail {
  id: string;
  sport: string;
  level: string;
  starts_at: string;
  ends_at: string;
  price_per_player: number;
  slots_total: number;
  description: string | null;
  organizer_id: string;
  is_private: boolean;
  stadium: { id: string; name: string; address: string } | null;
}

interface Participant {
  id: string;
  user_id: string;
  paid: boolean;
  profile: { display_name: string | null; avatar_url: string | null; username: string | null } | null;
}

interface Message {
  id: string;
  user_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null; username: string | null } | null;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function GamePage() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [organizer, setOrganizer] = useState<{
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    phone_verified: boolean;
    rating: number;
    ratings_count: number;
    games_count: number;
  } | null>(null);

  const loadGame = async () => {
    const { data, error } = await supabase
      .from("games")
      .select(
        "id, sport, level, starts_at, ends_at, price_per_player, slots_total, description, organizer_id, is_private, stadium:stadiums(id,name,address)"
      )
      .eq("id", gameId)
      .maybeSingle();
    if (error || !data) {
      setLoading(false);
      return;
    }
    setGame(data as unknown as GameDetail);
    setLoading(false);
  };

  const loadOrganizer = async (organizerId: string) => {
    const [{ data: prof }, { data: ratings }, { count: gamesCount }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, phone_verified")
        .eq("id", organizerId)
        .maybeSingle(),
      supabase.from("user_ratings").select("score").eq("ratee_id", organizerId),
      supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", organizerId)
        .lt("ends_at", new Date().toISOString()),
    ]);
    if (!prof) return;
    const scores = (ratings ?? []).map((r) => r.score);
    const avg =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    setOrganizer({
      id: prof.id,
      display_name: prof.display_name,
      username: prof.username,
      avatar_url: prof.avatar_url,
      phone_verified: !!prof.phone_verified,
      rating: avg,
      ratings_count: scores.length,
      games_count: gamesCount ?? 0,
    });
  };

  const loadParticipants = async () => {
    const { data, error } = await supabase
      .from("game_participants")
      .select("id, user_id, paid")
      .eq("game_id", gameId)
      .order("joined_at", { ascending: true });
    if (error || !data) {
      setParticipants([]);
      return;
    }
    const ids = Array.from(new Set(data.map((p) => p.user_id)));
    let profilesMap = new Map<string, { display_name: string | null; avatar_url: string | null; username: string | null }>();
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .in("id", ids);
      (profs ?? []).forEach((p) => profilesMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url, username: p.username }));
    }
    setParticipants(
      data.map((p) => ({ ...p, profile: profilesMap.get(p.user_id) ?? null })) as Participant[]
    );
  };

  useEffect(() => {
    loadGame();
    loadParticipants();
    const ch = supabase
      .channel(`game-${gameId}-participants`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_participants", filter: `game_id=eq.${gameId}` },
        () => loadParticipants()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    if (game?.organizer_id) loadOrganizer(game.organizer_id);
  }, [game?.organizer_id]);

  const isJoined = !!user && participants.some((p) => p.user_id === user.id);
  const isOrganizer = !!user && game?.organizer_id === user.id;
  const myEntry = participants.find((p) => p.user_id === user?.id) ?? null;
  const myPaid = !!myEntry?.paid;
  const taken = participants.length;
  const paidCount = participants.filter((p) => p.paid).length;
  const full = !!game && taken >= game.slots_total;
  const pct = game ? Math.round((taken / game.slots_total) * 100) : 0;
  const needed = game ? Math.max(0, game.slots_total - taken) : 0;
  const startMs = game ? new Date(game.starts_at).getTime() : 0;
  const hoursToStart = game ? (startMs - Date.now()) / 36e5 : Infinity;
  const startingSoon = hoursToStart > 0 && hoursToStart <= 6;
  const almostFull = !full && needed > 0 && needed <= 2;
  const isFree = !!game && game.price_per_player === 0;
  const status: { label: string; cls: string } = full
    ? { label: "Состав собран", cls: "bg-muted text-muted-foreground" }
    : almostFull
      ? { label: `Нужно ещё ${needed}`, cls: "bg-orange-500/20 text-orange-100 border-orange-300/40" }
      : startingSoon
        ? { label: "Скоро старт", cls: "bg-amber-400/20 text-amber-50 border-amber-200/40" }
        : taken === 0
          ? { label: "Новая игра", cls: "bg-emerald-500/20 text-emerald-50 border-emerald-300/40" }
          : { label: "Идёт набор", cls: "bg-white/15 text-white border-white/30" };
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [makePublicOpen, setMakePublicOpen] = useState(false);
  const [makingPublic, setMakingPublic] = useState(false);

  const confirmMakePublic = async () => {
    if (!game) return;
    setMakingPublic(true);
    const { error } = await supabase
      .from("games")
      .update({ is_private: false })
      .eq("id", game.id);
    setMakingPublic(false);
    setMakePublicOpen(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Игра теперь общедоступна");
      setGame({ ...game, is_private: false });
    }
  };

  const payForMe = async () => {
    if (!myEntry) return;
    setPaying(true);
    await new Promise((r) => setTimeout(r, 900));
    const { error } = await supabase
      .from("game_participants")
      .update({ paid: true })
      .eq("id", myEntry.id);
    setPaying(false);
    setPayOpen(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Оплата прошла успешно ✓");
      loadParticipants();
    }
  };

  const join = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!game) return;
    setJoining(true);
    const { error } = await supabase
      .from("game_participants")
      .insert({ game_id: game.id, user_id: user.id });
    setJoining(false);
    if (error) toast.error(error.message);
    else toast.success("Ты в команде!");
  };

  const leave = async () => {
    if (!user || !game) return;
    setJoining(true);
    const { error } = await supabase
      .from("game_participants")
      .delete()
      .eq("game_id", game.id)
      .eq("user_id", user.id);
    setJoining(false);
    if (error) toast.error(error.message);
    else toast.info("Ты вышел из команды");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto p-6">
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto p-12 text-center">
          <p className="text-muted-foreground">Игра не найдена</p>
          <Button asChild className="mt-4"><Link to="/games">К каталогу</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden bg-gradient-hero pb-10 pt-8 md:pb-16 md:pt-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,white,transparent_55%)] opacity-20" />
        <div className="relative container mx-auto max-w-full px-4 sm:px-6">
          <Link to="/games" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> К каталогу
          </Link>
          {/* На mobile «уровень» уезжает внутрь группы badge'ей. На md+ — справа отдельно. */}
          <div className="mt-4 md:mt-6 md:flex md:items-end md:justify-between md:gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-1.5 md:mb-3 md:gap-2">
                {isOrganizer && (
                  <Badge className="border-white/30 bg-white/20 text-white">Ты — организатор</Badge>
                )}
                <Badge className="border-white/30 bg-white/10 text-white">{game.sport}</Badge>
                <Badge className={`border ${status.cls}`}>{status.label}</Badge>
                {isFree && (
                  <Badge className="border-emerald-300/40 bg-emerald-500/20 text-emerald-50">Бесплатно</Badge>
                )}
                {game.is_private && (
                  <Badge className="gap-1 border-white/30 bg-white/20 text-white">
                    <Lock className="h-3 w-3" /> Приватная
                  </Badge>
                )}
                {/* На mobile «Любитель» — внутри badge-группы */}
                <Badge className="border-white/30 bg-white/15 text-white md:hidden">
                  <Star className="mr-1 h-3 w-3 fill-current" /> {game.level}
                </Badge>
                {isOrganizer && game.is_private && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 gap-1 rounded-full bg-white/90 px-3 text-xs text-foreground hover:bg-white"
                    onClick={() => setMakePublicOpen(true)}
                  >
                    <Globe className="h-3 w-3" /> Сделать общедоступной
                  </Button>
                )}
              </div>
              <h1 className="break-words font-display text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
                {game.stadium?.name}
              </h1>
              <p className="mt-2 flex items-start gap-2 text-sm text-white/80 sm:items-center sm:text-base">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
                <span className="min-w-0 break-words">{game.stadium?.address}</span>
              </p>
            </div>
            {/* «Уровень» отдельным блоком справа — только на md+ */}
            <div className="hidden shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-white backdrop-blur-md md:flex">
              <Star className="h-4 w-4 fill-white" /> {game.level}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 pb-12 pt-6 md:pb-16 md:pt-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {(almostFull || startingSoon || full) && !isOrganizer && !isJoined && (
              <div
                className={`flex items-center gap-3 rounded-2xl border p-4 ${
                  full
                    ? "border-border bg-muted/40 text-muted-foreground"
                    : almostFull
                      ? "border-orange-300/60 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                      : "border-amber-300/60 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                }`}
              >
                {full ? <AlertTriangle className="h-5 w-5" /> : almostFull ? <Flame className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {full
                      ? "Состав уже собран"
                      : almostFull
                        ? `Осталось всего ${needed} ${needed === 1 ? "место" : "места"} — успей записаться`
                        : `Игра начнётся через ${Math.max(1, Math.round(hoursToStart))} ч — присоединяйся скорее`}
                  </p>
                  <p className="text-xs opacity-80">
                    {full ? "Загляни в похожие игры ниже." : "Игроки записываются быстро."}
                  </p>
                </div>
              </div>
            )}
            <div className="rounded-3xl border border-border bg-card p-4 shadow-elegant sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <Stat icon={Calendar} label="Дата" value={fmtDate(game.starts_at)} />
                <Stat icon={Clock} label="Время" value={`${fmtTime(game.starts_at)}–${fmtTime(game.ends_at)}`} />
                <Stat icon={Users} label="Состав" value={`${taken}/${game.slots_total}`} />
                <Stat icon={Star} label="Собрано" value={`${paidCount * game.price_per_player} / ${game.slots_total * game.price_per_player} ₽`} />
              </div>
              {(isJoined || isOrganizer) && (
                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm text-muted-foreground">
                    Не хватает игроков? Пригласи друга по никнейму.
                  </p>
                  <InviteFriendButton gameId={game.id} userId={user!.id} />
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-xl font-bold">Команда</h2>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-6 space-y-2">
                {participants.map((p) => {
                  const mine = p.user_id === user?.id;
                  const canTogglePaid = mine || isOrganizer;
                  const gameOver = new Date(game.ends_at).getTime() < Date.now();
                  const canRate = !mine && !!user && (isJoined || isOrganizer) && gameOver;
                  const nameNode = p.profile?.username ? (
                    <Link
                      to="/u/$username"
                      params={{ username: p.profile.username }}
                      className="text-sm font-semibold hover:underline"
                    >
                      {p.profile?.display_name ?? `@${p.profile.username}`}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold">
                      {p.profile?.display_name ?? "Игрок"}
                    </span>
                  );
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-brand font-display text-sm font-bold text-primary-foreground">
                          {(p.profile?.display_name ?? p.profile?.username ?? "?").slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p>{nameNode}{mine && <span className="text-sm text-muted-foreground"> (ты)</span>}</p>
                          <p className="text-xs text-muted-foreground">{p.paid ? "Оплачено" : "Не оплачено"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canRate && (
                          <RatePlayerButton
                            gameId={game.id}
                            rateeId={p.user_id}
                            rateeName={p.profile?.display_name ?? p.profile?.username ?? "игрока"}
                          />
                        )}
                        {canTogglePaid && (
                          <Button
                            size="sm"
                            variant={p.paid ? "outline" : "default"}
                            className={p.paid ? "" : "bg-gradient-brand text-primary-foreground hover:opacity-90"}
                            onClick={async () => {
                              const { error } = await supabase
                                .from("game_participants")
                                .update({ paid: !p.paid })
                                .eq("id", p.id);
                              if (error) toast.error(error.message);
                              else {
                                toast.success(p.paid ? "Оплата снята" : isOrganizer && !mine ? "Доплачено за участника" : "Оплачено");
                                loadParticipants();
                              }
                            }}
                          >
                            {p.paid ? "Снять отметку" : isOrganizer && !mine ? "Доплатить" : "Оплатить"}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
                {Array.from({ length: Math.max(0, game.slots_total - taken) }).map((_, i) => (
                  <li
                    key={`e${i}`}
                    className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-dashed border-border">+</div>
                    Свободное место
                  </li>
                ))}
              </ul>
            </div>

            {organizer && (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <h2 className="font-display text-xl font-bold">Организатор</h2>
                <div className="mt-4 flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={organizer.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-brand font-display text-base font-bold text-primary-foreground">
                      {initials(organizer.display_name ?? organizer.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {organizer.username ? (
                        <Link
                          to="/u/$username"
                          params={{ username: organizer.username }}
                          className="font-display text-base font-semibold hover:underline"
                        >
                          {organizer.display_name ?? `@${organizer.username}`}
                        </Link>
                      ) : (
                        <span className="font-display text-base font-semibold">
                          {organizer.display_name ?? "Организатор"}
                        </span>
                      )}
                      {organizer.phone_verified && (
                        <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" /> Проверен
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {organizer.ratings_count > 0
                          ? `${organizer.rating.toFixed(1)} · ${organizer.ratings_count} отзыв${organizer.ratings_count === 1 ? "" : organizer.ratings_count < 5 ? "а" : "ов"}`
                          : "Без отзывов"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5 text-primary" />
                        {organizer.games_count} провед.
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Опытные организаторы держат состав и предупреждают об отмене заранее.
                </p>
              </div>
            )}

            {game.description && (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <h2 className="font-display text-xl font-bold">Описание</h2>
                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{game.description}</p>
              </div>
            )}

            {(isJoined || isOrganizer) && new Date(game.ends_at).getTime() < Date.now() && (
              <GoalClaimsBlock
                gameId={game.id}
                userId={user!.id}
                participants={participants}
                organizerId={game.organizer_id}
              />
            )}

            {(isJoined || isOrganizer) && <GameChat gameId={game.id} userId={user!.id} />}
          </div>

          <aside className="space-y-4">
            <div className="sticky top-24 rounded-3xl border border-border bg-card p-6 shadow-elegant">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">за игрока</p>
              <p className="mt-1 font-display text-4xl font-bold">
                {game.price_per_player} <span className="text-2xl">₽</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Сумма делится между участниками. Оплата уходит владельцу стадиона.
              </p>
              {!user ? (
                <Button asChild size="lg" className="mt-6 w-full bg-gradient-brand text-primary-foreground hover:opacity-90">
                  <Link to="/auth">Войти и записаться</Link>
                </Button>
              ) : isJoined ? (
                <div className="mt-6 space-y-2">
                  {myPaid ? (
                    <div className="flex items-center justify-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                      <CheckCircle2 className="h-4 w-4" /> Оплачено
                    </div>
                  ) : (
                    <Button
                      onClick={() => setPayOpen(true)}
                      size="lg"
                      className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
                    >
                      <CreditCard className="h-4 w-4" /> Оплатить {game.price_per_player} ₽
                    </Button>
                  )}
                  <Button onClick={leave} disabled={joining} variant="outline" size="sm" className="w-full">
                    Выйти из команды
                  </Button>
                </div>
              ) : isOrganizer ? (
                <Button asChild size="lg" variant="outline" className="mt-6 w-full">
                  <Link to="/games">Вернуться к каталогу</Link>
                </Button>
              ) : (
                <Button
                  onClick={join}
                  disabled={joining || full}
                  size="lg"
                  className="mt-6 w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
                >
                  {full ? "Мест нет" : "Записаться"}
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Безопасная сделка · Возврат при отмене
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Гарантии</h3>
              <ul className="mt-3 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Проверенные организаторы</p>
                    <p className="text-xs text-muted-foreground">Телефон и история игр подтверждены.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Возврат при отмене</p>
                    <p className="text-xs text-muted-foreground">100% возврат, если игра отменена организатором или за 6+ часов до старта.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">Надёжная явка</p>
                    <p className="text-xs text-muted-foreground">Игроки подтверждают участие оплатой.</p>
                  </div>
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <SimilarGames
          currentGameId={game.id}
          sport={game.sport}
          city={(game.stadium as unknown as { city?: string } | null)?.city ?? null}
        />
      </section>

      {/* Mobile sticky action bar */}
      <div className="sticky bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl shadow-elegant lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {full ? "Состав собран" : `Свободно ${game.slots_total - taken} мест`}
            </p>
            <p className="font-display text-xl font-bold leading-none">
              {game.price_per_player} ₽
              <span className="ml-1 text-xs font-medium text-muted-foreground">/ игрок</span>
            </p>
          </div>
          {!user ? (
            <Button asChild size="lg" className="bg-gradient-brand text-primary-foreground hover:opacity-90">
              <Link to="/auth">Войти</Link>
            </Button>
          ) : isJoined ? (
            myPaid ? (
              <Button disabled size="lg" variant="outline" className="gap-1">
                <CheckCircle2 className="h-4 w-4" /> Оплачено
              </Button>
            ) : (
              <Button
                onClick={() => setPayOpen(true)}
                size="lg"
                className="bg-gradient-brand text-primary-foreground hover:opacity-90"
              >
                <CreditCard className="h-4 w-4" /> Оплатить
              </Button>
            )
          ) : isOrganizer ? (
            <Button asChild size="lg" variant="outline">
              <Link to="/games">К каталогу</Link>
            </Button>
          ) : (
            <Button
              onClick={join}
              disabled={joining || full}
              size="lg"
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {full ? "Мест нет" : "Записаться"}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={makePublicOpen} onOpenChange={setMakePublicOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Сделать игру общедоступной?</DialogTitle>
            <DialogDescription>
              Игра станет видна всем в каталоге и поиске. Любой пользователь сможет записаться. Отменить это действие нельзя.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setMakePublicOpen(false)} disabled={makingPublic}>
              Отмена
            </Button>
            <Button
              onClick={confirmMakePublic}
              disabled={makingPublic}
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {makingPublic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              Сделать общедоступной
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Оплата участия</DialogTitle>
            <DialogDescription>
              {game.stadium?.name} · {fmtDate(game.starts_at)} · {fmtTime(game.starts_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-baseline justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">К оплате</span>
              <span className="font-display text-2xl font-bold">{game.price_per_player} ₽</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="card">Номер карты</Label>
              <Input id="card" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="exp">Срок</Label>
                <Input id="exp" placeholder="12/28" defaultValue="12/28" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" placeholder="123" defaultValue="123" />
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Это демо-оплата. Реальное списание не произойдёт.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={paying}>
              Отмена
            </Button>
            <Button
              onClick={payForMe}
              disabled={paying}
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Обработка…</> : <><CreditCard className="h-4 w-4" /> Оплатить</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow sm:h-11 sm:w-11 sm:rounded-2xl">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">{label}</p>
        <p className="break-words font-display text-sm font-semibold leading-tight sm:text-base">{value}</p>
      </div>
    </div>
  );
}

function GameChat({ gameId, userId }: { gameId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("game_messages")
      .select("id, user_id, body, image_url, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    if (error || !data) {
      setMessages([]);
      return;
    }
    const ids = Array.from(new Set(data.map((m) => m.user_id)));
    const map = new Map<string, { display_name: string | null; avatar_url: string | null; username: string | null }>();
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .in("id", ids);
      (profs ?? []).forEach((p) => map.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url, username: p.username }));
    }
    setMessages(data.map((m) => ({ ...m, profile: map.get(m.user_id) ?? null })) as Message[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`game-${gameId}-chat`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_messages", filter: `game_id=eq.${gameId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const pickImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Только изображения");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл слишком большой (макс. 5 МБ)");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body && !imageFile) return;
    setUploading(true);
    let image_url: string | null = null;
    try {
      if (imageFile) {
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${gameId}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("chat-images")
          .upload(path, imageFile, { contentType: imageFile.type, upsert: false });
        if (upErr) {
          toast.error(upErr.message);
          setUploading(false);
          return;
        }
        image_url = supabase.storage.from("chat-images").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("game_messages").insert({
        game_id: gameId,
        user_id: userId,
        body: body || null,
        image_url,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setText("");
        clearImage();
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Чат игры</h2>
      </div>
      <div ref={scrollRef} className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-muted/40 p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Напиши первое сообщение команде 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === userId;
          const name = m.profile?.display_name ?? m.profile?.username ?? "Игрок";
          const handle = m.profile?.username ? `@${m.profile.username}` : null;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && (
                <Avatar className="h-8 w-8 shrink-0">
                  {m.profile?.avatar_url && <AvatarImage src={m.profile.avatar_url} alt={name} />}
                  <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`min-w-0 max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? "bg-gradient-brand text-primary-foreground" : "bg-card border border-border"
                }`}
                style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
              >
                <p className={`text-xs font-semibold ${mine ? "opacity-80" : "opacity-70"}`}>
                  {mine ? "Вы" : name}
                  {handle && !mine && <span className="ml-1 font-normal opacity-70">{handle}</span>}
                </p>
                {m.image_url && (
                  <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="mt-1 block">
                    <img
                      src={m.image_url}
                      alt="Фото в чате"
                      className="max-h-64 w-auto max-w-full rounded-xl border border-border/50 object-cover"
                      loading="lazy"
                    />
                  </a>
                )}
                {m.body && (
                  <p
                    className="mt-0.5 whitespace-pre-wrap text-[13px] leading-snug"
                    style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                  >
                    {m.body}
                  </p>
                )}
              </div>
              {mine && (
                <Avatar className="h-8 w-8 shrink-0">
                  {m.profile?.avatar_url && <AvatarImage src={m.profile.avatar_url} alt={name} />}
                  <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="mt-4 space-y-2">
        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} alt="Превью" className="max-h-32 rounded-xl border border-border" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow-md ring-1 ring-border hover:bg-muted"
              aria-label="Убрать фото"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Прикрепить фото"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Сообщение команде…"
            rows={1}
            className="flex min-h-11 max-h-[8.25rem] w-full resize-none overflow-y-auto rounded-md border border-input bg-background px-3 py-2.5 font-mono text-[13px] leading-snug ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Button
            type="submit"
            size="lg"
            disabled={uploading || (!text.trim() && !imageFile)}
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RatePlayerButton({
  gameId,
  rateeId,
  rateeName,
}: {
  gameId: string;
  rateeId: string;
  rateeName: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<{ id: string; score: number; comment: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || !user || loaded) return;
    (async () => {
      const { data } = await supabase
        .from("user_ratings")
        .select("id, score, comment")
        .eq("rater_id", user.id)
        .eq("ratee_id", rateeId)
        .eq("game_id", gameId)
        .maybeSingle();
      if (data) {
        setExisting(data);
        setScore(data.score);
        setComment(data.comment ?? "");
      }
      setLoaded(true);
    })();
  }, [open, user, rateeId, gameId, loaded]);

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    if (existing) {
      const { error } = await supabase
        .from("user_ratings")
        .update({ score, comment: comment.trim() || null })
        .eq("id", existing.id);
      setSaving(false);
      if (error) toast.error(error.message);
      else {
        toast.success("Оценка обновлена");
        setOpen(false);
      }
    } else {
      const { error } = await supabase.from("user_ratings").insert({
        rater_id: user.id,
        ratee_id: rateeId,
        game_id: gameId,
        score,
        comment: comment.trim() || null,
      });
      setSaving(false);
      if (error) toast.error(error.message);
      else {
        toast.success("Спасибо за оценку!");
        setExisting({ id: "tmp", score, comment: comment.trim() || null });
        setOpen(false);
      }
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Star className="mr-1 h-3.5 w-3.5" /> Оценить
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оценить {rateeName}</DialogTitle>
            <DialogDescription>
              Поставь оценку от 1 до 5 — это влияет на рейтинг игрока.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-1 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                aria-label={`${n} звёзд`}
              >
                <Star
                  className={`h-8 w-8 transition ${
                    n <= score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="rate-comment">Комментарий (необязательно)</Label>
            <Input
              id="rate-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 280))}
              placeholder="Что понравилось или что стоит улучшить"
              className="mt-1 h-11"
              maxLength={280}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? "Обновить" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InviteFriendButton({ gameId, userId }: { gameId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  // Friend list
  type FriendLite = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
  const [friends, setFriends] = useState<FriendLite[] | null>(null);
  const [friendQuery, setFriendQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/games/${gameId}`
    : `/games/${gameId}`;

  // Load friends when dialog opens
  useEffect(() => {
    if (!open || friends !== null) return;
    (async () => {
      const { data: rows } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq("status", "accepted");
      const ids = Array.from(
        new Set(
          (rows ?? [])
            .map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id))
            .filter((id) => id !== userId),
        ),
      );
      if (!ids.length) {
        setFriends([]);
        return;
      }
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      setFriends((ps ?? []) as FriendLite[]);
    })();
  }, [open, friends, userId]);

  const filteredFriends = (friends ?? []).filter((f) => {
    const q = friendQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (f.display_name ?? "").toLowerCase().includes(q) ||
      (f.username ?? "").toLowerCase().includes(q)
    );
  });

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const sendBatchInvite = async (targets: FriendLite[]) => {
    if (!targets.length) return;
    setBusy(true);
    const rows = targets.map((t) => ({
      game_id: gameId,
      user_id: userId,
      body: `@${t.username ?? ""} — приглашаю тебя в игру! ${inviteLink}`,
    }));
    const { error } = await supabase.from("game_messages").insert(rows);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      targets.length === 1
        ? `Приглашение отправлено в чат игры`
        : `Отправлено приглашений: ${targets.length}`,
    );
    setSelected({});
  };

  const sendInvite = async () => {
    // If friends selected — invite them in batch
    const picked = (friends ?? []).filter((f) => selected[f.id]);
    if (picked.length) {
      await sendBatchInvite(picked);
      if (!username.trim()) {
        setOpen(false);
        return;
      }
    }
    const handle = username.trim().replace(/^@/, "");
    if (!handle) {
      if (picked.length) setOpen(false);
      return;
    }
    setBusy(true);
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .ilike("username", handle)
      .maybeSingle();
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    if (!prof) {
      setBusy(false);
      toast.error("Игрок с таким никнеймом не найден");
      return;
    }
    if (prof.id === userId) {
      setBusy(false);
      toast.error("Нельзя пригласить самого себя");
      return;
    }
    const { error: msgErr } = await supabase.from("game_messages").insert({
      game_id: gameId,
      user_id: userId,
      body: `@${prof.username} — приглашаю тебя в игру! ${inviteLink}`,
    });
    setBusy(false);
    if (msgErr) {
      toast.error(msgErr.message);
      return;
    }
    toast.success(`Приглашение для ${prof.display_name ?? "@" + prof.username} отправлено в чат игры`);
    setUsername("");
    setOpen(false);
  };

  const initialsOf = (name?: string | null, fallback?: string | null) => {
    const src = (name ?? fallback ?? "?").trim();
    return src.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-gradient-brand text-primary-foreground hover:opacity-90"
      >
        <UserPlus className="mr-1 h-4 w-4" /> Пригласить друга
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Пригласить друзей</DialogTitle>
            <DialogDescription>
              Отметь друзей галочками или введи никнейм игрока — мы оставим приглашение в чате игры.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Friend list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Мои друзья</Label>
                {selectedCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Выбрано: {selectedCount}
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={friendQuery}
                  onChange={(e) => setFriendQuery(e.target.value)}
                  placeholder="Поиск среди друзей"
                  className="h-9 pl-9"
                />
              </div>
              <div className="rounded-lg border border-border">
                {friends === null ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    {friends.length === 0
                      ? "У тебя пока нет друзей. Найди их в разделе «Друзья»."
                      : "Никого не нашли"}
                  </p>
                ) : (
                  <ScrollArea className="h-48">
                    <ul className="divide-y divide-border">
                      {filteredFriends.map((f) => {
                        const checked = !!selected[f.id];
                        return (
                          <li key={f.id}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent/40">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) =>
                                  setSelected((prev) => ({ ...prev, [f.id]: !!v }))
                                }
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={f.avatar_url ?? undefined} />
                                <AvatarFallback>
                                  {initialsOf(f.display_name, f.username)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {f.display_name ?? f.username ?? "Игрок"}
                                </p>
                                {f.username && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    @{f.username}
                                  </p>
                                )}
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-username">Или по никнейму</Label>
              <Input
                id="invite-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@nickname"
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendInvite();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Или поделись ссылкой</Label>
              <div className="flex gap-2">
                <Input readOnly value={inviteLink} className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Отмена
            </Button>
            <Button
              onClick={sendInvite}
              disabled={busy || (selectedCount === 0 && !username.trim())}
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : selectedCount > 0 ? (
                `Пригласить (${selectedCount + (username.trim() ? 1 : 0)})`
              ) : (
                "Пригласить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ====================== GoalClaimsBlock ======================

interface GoalClaimRow {
  id: string;
  user_id: string;
  count: number;
  status: "pending" | "approved";
  created_at: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
  approvals: string[]; // approver ids
}

function GoalClaimsBlock({
  gameId,
  userId,
  participants,
  organizerId,
}: {
  gameId: string;
  userId: string;
  participants: Participant[];
  organizerId: string;
}) {
  const [claims, setClaims] = useState<GoalClaimRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [count, setCount] = useState("1");
  const [saving, setSaving] = useState(false);
  const [matchEnded, setMatchEnded] = useState<boolean>(false);

  const teamUserIds = new Set<string>([organizerId, ...participants.map((p) => p.user_id)]);
  const isTeammate = teamUserIds.has(userId);

  // Голы можно заявить ТОЛЬКО после фактического окончания матча.
  // Полная проверка дублируется на бэке (RLS + триггеры из sql/goals_security.sql).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("games")
        .select("ends_at")
        .eq("id", gameId)
        .maybeSingle();
      if (cancelled) return;
      const ended = !!data?.ends_at && new Date(data.ends_at).getTime() < Date.now();
      setMatchEnded(ended);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const load = async () => {
    const { data: cs } = await supabase
      .from("goal_claims")
      .select("id, user_id, count, status, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });
    const list = (cs ?? []) as GoalClaimRow[];
    if (list.length === 0) {
      setClaims([]);
      return;
    }
    const claimIds = list.map((c) => c.id);
    const userIds = Array.from(new Set(list.map((c) => c.user_id)));
    const [{ data: aps }, { data: profs }] = await Promise.all([
      supabase.from("goal_claim_approvals").select("claim_id, approver_id").in("claim_id", claimIds),
      supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", userIds),
    ]);
    const apMap = new Map<string, string[]>();
    (aps ?? []).forEach((a) => {
      const arr = apMap.get(a.claim_id) ?? [];
      arr.push(a.approver_id);
      apMap.set(a.claim_id, arr);
    });
    const pMap = new Map(
      (profs ?? []).map((p) => [p.id, { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url }])
    );
    list.forEach((c) => {
      c.approvals = apMap.get(c.id) ?? [];
      c.profile = pMap.get(c.user_id) ?? null;
    });
    setClaims([...list]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, participants.length]);

  const myClaim = claims.find((c) => c.user_id === userId);

  const submit = async () => {
    if (!matchEnded) {
      toast.error("Голы можно заявить только после окончания матча");
      return;
    }
    if (!isTeammate) {
      toast.error("Заявить голы могут только участники матча");
      return;
    }
    const n = parseInt(count, 10);
    if (!Number.isFinite(n) || n < 1 || n > 50) { toast.error("От 1 до 50 голов"); return; }
    setSaving(true);
    const { error } = await supabase.from("goal_claims").insert({ user_id: userId, game_id: gameId, count: n });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Заявка отправлена. Партнёры могут подтвердить.");
    setAdding(false);
    setCount("1");
    load();
  };

  const approve = async (claimId: string) => {
    // Защита от самоапрува (бэк это тоже блокирует через триггер).
    const claim = claims.find((c) => c.id === claimId);
    if (claim && claim.user_id === userId) {
      toast.error("Нельзя подтвердить свою собственную заявку");
      return;
    }
    if (!isTeammate) {
      toast.error("Подтверждать могут только участники матча");
      return;
    }
    const { error } = await supabase.from("goal_claim_approvals").insert({ claim_id: claimId, approver_id: userId });
    if (error) { toast.error(error.message); return; }
    toast.success("Подтверждено");
    load();
  };

  const unapprove = async (claimId: string) => {
    const { error } = await supabase
      .from("goal_claim_approvals")
      .delete()
      .eq("claim_id", claimId)
      .eq("approver_id", userId);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const cancel = async (claimId: string) => {
    const { error } = await supabase.from("goal_claims").delete().eq("id", claimId);
    if (error) { toast.error(error.message); return; }
    toast.success("Заявка удалена");
    load();
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Забитые голы</h2>
          <p className="text-xs text-muted-foreground">
            Партнёры подтверждают результат. Нужно не менее 3 согласований.
          </p>
        </div>
        {isTeammate && !myClaim && !adding && matchEnded && (
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            <Star className="mr-1 h-4 w-4" /> Заявить свои голы
          </Button>
        )}
        {isTeammate && !matchEnded && (
          <p className="text-xs text-muted-foreground">
            Заявить голы можно после окончания матча.
          </p>
        )}
      </div>

      {adding && (
        <div className="mt-4 rounded-2xl border border-border bg-background p-4">
          <Label className="text-xs">Сколько ты забил голов</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="mt-1 h-11"
          />
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)} className="flex-1">Отмена</Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={saving}
              className="flex-1 bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отправить"}
            </Button>
          </div>
        </div>
      )}

      {claims.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Пока никто не заявлял голы.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {claims.map((c) => {
            const mine = c.user_id === userId;
            const iApproved = c.approvals.includes(userId);
            const canApprove = isTeammate && !mine && c.status === "pending";
            const name = c.profile?.display_name ?? (c.profile?.username ? `@${c.profile.username}` : "Игрок");
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    {c.profile?.avatar_url ? <AvatarImage src={c.profile.avatar_url} /> : null}
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {c.profile?.username ? (
                        <Link to="/u/$username" params={{ username: c.profile.username }} className="hover:underline">
                          {name}
                        </Link>
                      ) : name}
                      {mine && <span className="text-muted-foreground"> (ты)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Голов: <span className="font-bold text-foreground">{c.count}</span>
                      {c.status === "approved" ? " · подтверждено" : ` · ${c.approvals.length}/3`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === "approved" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Подтверждено
                    </Badge>
                  ) : canApprove ? (
                    <Button
                      size="sm"
                      variant={iApproved ? "outline" : "default"}
                      className={iApproved ? "" : "bg-gradient-brand text-primary-foreground hover:opacity-90"}
                      onClick={() => (iApproved ? unapprove(c.id) : approve(c.id))}
                    >
                      {iApproved ? "Подтверждено тобой" : "Подтвердить"}
                    </Button>
                  ) : mine && c.status === "pending" ? (
                    <Button size="sm" variant="ghost" onClick={() => cancel(c.id)}>
                      Отменить
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SimilarGames({ currentGameId, sport, city }: { currentGameId: string; sport: string; city: string | null }) {
  const [games, setGames] = useState<Array<{
    id: string;
    sport: string;
    starts_at: string;
    price_per_player: number;
    slots_total: number;
    stadium: { name: string; address: string; city: string } | null;
    participants: { count: number }[];
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("games")
        .select("id, sport, starts_at, price_per_player, slots_total, stadium:stadiums!inner(name,address,city), participants:game_participants(count)")
        .eq("is_private", false)
        .eq("sport", sport)
        .neq("id", currentGameId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(3);
      if (city) q = q.eq("stadium.city", city);
      const { data } = await q;
      setGames((data ?? []) as never);
      setLoading(false);
    })();
  }, [currentGameId, sport, city]);

  if (loading) return null;
  if (games.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Похожие игры рядом</h2>
          <p className="text-sm text-muted-foreground">{sport}{city ? ` · ${city}` : ""}</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/games">Все игры →</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {games.map((g) => {
          const taken = g.participants?.[0]?.count ?? 0;
          const needed = Math.max(0, g.slots_total - taken);
          const pct = Math.round((taken / g.slots_total) * 100);
          return (
            <Link
              key={g.id}
              to="/games/$gameId"
              params={{ gameId: g.id }}
              className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">{g.sport}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(g.starts_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} · {fmtTime(g.starts_at)}
                </span>
              </div>
              <h3 className="mt-3 line-clamp-1 font-display text-lg font-bold group-hover:text-primary">
                {g.stadium?.name}
              </h3>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                <MapPin className="mr-1 inline h-3 w-3" />
                {g.stadium?.address}
              </p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {taken}/{g.slots_total}
                  {needed > 0 && needed <= 2 && (
                    <span className="ml-1 text-orange-600">· нужно ещё {needed}</span>
                  )}
                </span>
                <span className="font-display font-bold">
                  {g.price_per_player === 0 ? "Бесплатно" : `${g.price_per_player} ₽`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
