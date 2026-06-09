import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Calendar, Clock, MapPin, MessageCircle, Star, Users, ArrowLeft, Send, CreditCard, CheckCircle2, Loader2, UserPlus, Copy, ImagePlus, X, Lock, Globe, Link2, ShieldCheck, Trophy, Flame, AlertTriangle, RefreshCw, CalendarClock, Zap, Search, Crown, Pencil } from "lucide-react";
import { compressImage } from "@/lib/image";
import { uploadToBucket } from "@/lib/upload";
import { DatePicker, TimePicker } from "@/components/ui/date-time-picker";
import { FEATURES } from "@/lib/feature-flags";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GameDraft } from "@/components/game/GameDraft";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";


export const Route = createFileRoute("/games_/$gameId")({
  // ?invite=<uuid> — токен для доступа к приватной игре по ссылке (в т.ч. для гостей).
  validateSearch: (search: Record<string, unknown>) => {
    const inv = typeof search.invite === "string" ? search.invite : undefined;
    // Лёгкая валидация uuid — чтобы не плодить мусорные RPC-вызовы.
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return { invite: inv && uuidRe.test(inv) ? inv : undefined };
  },
  head: ({ params }) => {
    const url = `https://af-sport.ru/games/${params.gameId}`;
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
  invite_token: string | null;
  // NULL = фиксированная цена с каждого, NOT NULL = аренда делится на slots_total.
  rent_total: number | null;
  // Финализирована и заархивирована — игра только для просмотра, без чата и записи.
  archived_at: string | null;
  stadium: { id: string; name: string; address: string } | null;
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  message: string | null;
  reject_reason: string | null;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null; username: string | null } | null;
}

interface GameResult {
  score_team_a: number;
  score_team_b: number;
  finalized_at: string;
  notes: string | null;
}

interface PlayerStat {
  user_id: string;
  team: "A" | "B" | null;
  goals: number;
  assists: number;
  is_mvp: boolean;
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
  const { invite: inviteToken } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  // Результат финализированной игры — null если ещё не заархивирована.
  const [result, setResult] = useState<GameResult | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  // Заявка текущего пользователя на эту игру (для открытых игр — там запись через аппрув).
  // Хранится pending / rejected — approved не показываем (уже участник).
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  // Pending-заявки для организатора со склейкой профилей.
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  // Статус драфта расстановки — когда active/completed, флипаем «Команду»
  // на отрисовку футбольного поля внутри GameDraft.
  const [draftStatus, setDraftStatus] = useState<"pending" | "active" | "completed" | "cancelled" | null>(null);
  // Доступ через invite — карточка видна, но без чата/деталей участников.
  const [viaInvite, setViaInvite] = useState(false);
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
    // 1. Обычный select под текущей сессией (для авторизованных — работает
    //    и для приватных по RLS policy «private games readable by authenticated via link»).
    const { data, error } = await supabase
      .from("games")
      .select(
        "id, sport, level, starts_at, ends_at, price_per_player, slots_total, description, organizer_id, is_private, invite_token, rent_total, archived_at, stadium:stadiums(id,name,address)"
      )
      .eq("id", gameId)
      .maybeSingle();
    if (!error && data) {
      setGame(data as unknown as GameDetail);
      setLoading(false);
      return;
    }
    // 2. Fallback по invite-токену из URL — работает для гостей (anon).
    //    RPC обходит RLS, но фильтрует по uuid-токену, поэтому требует знание ссылки.
    if (inviteToken) {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_game_by_invite", {
        p_token: inviteToken,
      });
      if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        const row = rpcData[0] as {
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
          stadium_id: string | null;
          stadium_name: string | null;
          stadium_address: string | null;
        };
        setGame({
          id: row.id,
          sport: row.sport,
          level: row.level,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          price_per_player: row.price_per_player,
          slots_total: row.slots_total,
          description: row.description,
          organizer_id: row.organizer_id,
          is_private: row.is_private,
          invite_token: inviteToken,
          stadium: row.stadium_id
            ? {
                id: row.stadium_id,
                name: row.stadium_name ?? "",
                address: row.stadium_address ?? "",
              }
            : null,
        });
        setViaInvite(true);
        setLoading(false);
        return;
      }
    }
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

  // Загружаем итог игры (счёт + статистика) — только если игра уже архивная.
  // Раздельный select чтобы не нагружать запрос для всех остальных игр.
  const loadResult = async () => {
    const [{ data: res }, { data: stats }] = await Promise.all([
      supabase
        .from("game_results")
        .select("score_team_a, score_team_b, finalized_at, notes")
        .eq("game_id", gameId)
        .maybeSingle(),
      supabase
        .from("game_player_stats")
        .select("user_id, team, goals, assists, is_mvp")
        .eq("game_id", gameId),
    ]);
    setResult(res as GameResult | null);
    setPlayerStats((stats ?? []) as PlayerStat[]);
  };

  // Заявки на участие — две задачи в одном запросе:
  //   1) моя заявка (любого статуса), чтобы понимать что рисовать вместо кнопки «Записаться».
  //   2) если я организатор — список pending со склейкой профилей.
  // RLS пропустит только мои + организаторские строки, всё остальное отфильтрует БД.
  const loadJoinRequests = async () => {
    if (!user) {
      setMyRequest(null);
      setPendingRequests([]);
      return;
    }
    const { data } = await supabase
      .from("game_join_requests")
      .select("id, user_id, status, message, reject_reason, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as JoinRequest[];
    // Моя самая свежая заявка (она первая после сортировки desc).
    const mine = rows.find((r) => r.user_id === user.id) ?? null;
    setMyRequest(mine);

    // Pending-список для организатора — со склейкой профилей одним запросом.
    const pending = rows.filter((r) => r.status === "pending" && r.user_id !== user.id);
    if (pending.length > 0) {
      const userIds = Array.from(new Set(pending.map((r) => r.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .in("id", userIds);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      setPendingRequests(
        pending.map((r) => ({
          ...r,
          profile: map.get(r.user_id) ?? null,
        })),
      );
    } else {
      setPendingRequests([]);
    }
  };

  useEffect(() => {
    loadGame();
    loadParticipants();
    loadResult();
    loadJoinRequests();
    // Подписки на realtime:
    // - game_participants → кто-то вошёл / вышел / оплатил
    // - game_results       → организатор финализировал игру
    // - game_player_stats  → личная стата при финализации
    // - games              → редактирование (slots/level/время) или archived_at
    // Все привязаны к текущему gameId, минимум 4 канала, но они дешёвые
    // (один WS, разные подписки внутри).
    const ch = supabase
      .channel(`game-${gameId}-live`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_participants", filter: `game_id=eq.${gameId}` },
        () => loadParticipants(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_results", filter: `game_id=eq.${gameId}` },
        () => loadResult(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_player_stats", filter: `game_id=eq.${gameId}` },
        () => loadResult(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        () => loadGame(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_join_requests", filter: `game_id=eq.${gameId}` },
        () => loadJoinRequests(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Перезагружаем заявки когда юзер появляется (после логина) или меняется игра.
  useEffect(() => {
    loadJoinRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, gameId]);

  // Лёгкая подписка только на статус драфта — этого достаточно чтобы
  // флипать список «Команда» в режим поля. Сам контент драфта (slots, captains)
  // ведёт компонент GameDraft через свою подписку.
  useEffect(() => {
    let alive = true;
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("game_drafts")
        .select("status")
        .eq("game_id", gameId)
        .maybeSingle();
      if (!alive) return;
      setDraftStatus((data?.status as typeof draftStatus) ?? null);
    };
    fetchStatus();
    const ch = supabase
      .channel(`draft-status-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_drafts", filter: `game_id=eq.${gameId}` },
        () => fetchStatus(),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [gameId]);

  useEffect(() => {
    if (game?.organizer_id) loadOrganizer(game.organizer_id);
  }, [game?.organizer_id]);

  const isJoined = !!user && participants.some((p) => p.user_id === user.id);
  const isOrganizer = !!user && game?.organizer_id === user.id;
  const myEntry = participants.find((p) => p.user_id === user?.id) ?? null;
  const myPaid = !!myEntry?.paid;
  const taken = participants.length;
  // Игра завершена и зафиксирована → блокируем все мутации, показываем summary.
  const isArchived = !!game?.archived_at;
  // Игра физически закончилась по времени, но ещё не финализирована — показываем
  // организатору кнопку «Подвести итог».
  const gameOverNotArchived = !!game && new Date(game.ends_at).getTime() < Date.now() && !isArchived;
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
    if (game.archived_at) {
      toast.error("Игра завершена, запись невозможна");
      return;
    }
    setJoining(true);
    // .select().single() — забираем вставленную строку и сразу кладём в локальный state.
    // Иначе игрок появлялся в списке только после reload (realtime может опоздать).
    const { data: inserted, error } = await supabase
      .from("game_participants")
      .insert({ game_id: game.id, user_id: user.id })
      .select("id, user_id, paid")
      .single();
    setJoining(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ты в команде!");
    if (inserted) {
      // Подтягиваем профиль текущего пользователя для отображения.
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, username")
        .eq("id", user.id)
        .maybeSingle();
      const newRow = {
        ...inserted,
        profile: prof ?? null,
      } as Participant;
      setParticipants((prev) =>
        prev.some((p) => p.user_id === user.id) ? prev : [...prev, newRow],
      );
    }
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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.info("Ты вышел из команды");
    // Локально убираем себя из списка — realtime подтянет в фоне.
    setParticipants((prev) => prev.filter((p) => p.user_id !== user.id));
  };

  // Подача заявки на участие. Сообщение опционально (можно вызвать с null).
  const requestJoin = async (message: string | null) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!game) return;
    setJoining(true);
    const { error } = await supabase.rpc("request_join", {
      p_game_id: game.id,
      p_message: message,
    });
    setJoining(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Заявка отправлена. Жди подтверждения организатора.");
    loadJoinRequests();
  };

  // Одобрить заявку (для организатора). После approve игрок появится в составе.
  const approveRequest = async (requestId: string) => {
    const { error } = await supabase.rpc("approve_join", { p_request_id: requestId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Игрок добавлен в состав");
    loadJoinRequests();
    loadParticipants();
  };

  // Отклонить заявку (для организатора). reason опционален, попадёт в уведомление автору.
  const rejectRequest = async (requestId: string, reason: string | null) => {
    const { error } = await supabase.rpc("reject_join", {
      p_request_id: requestId,
      p_reason: reason,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.info("Заявка отклонена");
    loadJoinRequests();
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
            {isArchived && result && (
              <GameResultSummary
                result={result}
                stats={playerStats}
                participants={participants}
              />
            )}

            <div className="rounded-3xl border border-border bg-card p-4 shadow-elegant sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <Stat icon={Calendar} label="Дата" value={fmtDate(game.starts_at)} />
                <Stat icon={Clock} label="Время" value={`${fmtTime(game.starts_at)}–${fmtTime(game.ends_at)}`} />
                <Stat icon={Users} label="Состав" value={`${taken}/${game.slots_total}`} />
                <Stat
                  icon={Star}
                  label="Собрано"
                  value={`${paidCount * game.price_per_player} / ${
                    /* В split-режиме плановая сумма = аренда. В fixed = price × N. */
                    game.rent_total != null
                      ? game.rent_total
                      : game.slots_total * game.price_per_player
                  } ₽`}
                />
              </div>
              {(isJoined || isOrganizer) && !isArchived && (
                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm text-muted-foreground">
                    Не хватает игроков? Пригласи друга по никнейму.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <InviteFriendButton
                      gameId={game.id}
                      userId={user!.id}
                      inviteToken={game.invite_token}
                    />
                    {/* Срочная замена — рассылка по локальной базе игроков.
                        Доступна только организатору, иначе любой участник мог бы
                        спамить всех соседей по полю. */}
                    {isOrganizer && !full && (
                      <UrgentReplacementButton
                        gameId={game.id}
                        sport={game.sport}
                        stadiumName={game.stadium?.name ?? ""}
                      />
                    )}
                  </div>
                </div>
              )}
              {isOrganizer && !isArchived && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <EditGameButton game={game} onSaved={loadGame} />
                  {game.is_private && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                      onClick={() => setMakePublicOpen(true)}
                    >
                      <Globe className="mr-1 h-3.5 w-3.5" /> Сделать общедоступной
                    </Button>
                  )}
                  {gameOverNotArchived && (
                    <FinalizeGameButton
                      gameId={game.id}
                      participants={participants}
                      onFinalized={() => {
                        loadGame();
                        loadResult();
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Блок «Заявки на участие» — показываем только организатору живой
                открытой игры с хотя бы одной pending-заявкой. В приватных играх
                заявок не бывает — вход по инвайту прямой. */}
            {isOrganizer && !isArchived && !game.is_private && pendingRequests.length > 0 && (
              <JoinRequestsList
                requests={pendingRequests}
                onApprove={approveRequest}
                onReject={rejectRequest}
                full={full}
              />
            )}

            {/* Драфт расстановки. Сам компонент решает, что рисовать (idle/pending/active/completed). */}
            {!isArchived && user && participants.length > 0 && (
              <GameDraft
                gameId={game.id}
                currentUserId={user.id}
                isOrganizer={isOrganizer}
                participants={participants.map((p) => ({
                  user_id: p.user_id,
                  paid: p.paid,
                  profile: p.profile,
                }))}
                slotsTotal={game.slots_total}
                allPaid={full && paidCount >= game.slots_total}
                isArchived={isArchived}
                gameStarted={new Date(game.starts_at).getTime() <= Date.now()}
                onStatusChange={setDraftStatus}
              />
            )}

            {/* Когда драфт активен/закончен — прячем обычный список «Команда»:
                поле уже отрисовано внутри GameDraft. */}
            {!(draftStatus === "active" || draftStatus === "completed") && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-xl font-bold">Команда</h2>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-6 space-y-2">
                {participants.map((p) => {
                  const mine = p.user_id === user?.id;
                  const isAdmin = p.user_id === game.organizer_id;
                  const canTogglePaid = mine || isOrganizer;
                  const gameOver = new Date(game.ends_at).getTime() < Date.now();
                  // Оценивать может ТОЛЬКО организатор и только ПОСЛЕ окончания игры.
                  // (В будущей фиче «капитаны» — дополним вторым правом.)
                  const canRate = !mine && !!user && isOrganizer && gameOver;
                  // Кнопка «Написать» показывается всем участникам, кроме самого себя.
                  // Идёт в DM (через /friends/$userId) — если не друзья, экран сам покажет CTA-предложение.
                  const canDM = !mine && !!user;
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
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                        isAdmin
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-border bg-background/60"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative shrink-0">
                          {/* Раньше тут был просто div с инициалом — avatar_url подгружался,
                              но не отображался. Теперь — обычный Avatar с фолбэком. */}
                          <Avatar className="h-10 w-10 rounded-2xl">
                            <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                            <AvatarFallback className="rounded-2xl bg-gradient-brand font-display text-sm font-bold text-primary-foreground">
                              {(p.profile?.display_name ?? p.profile?.username ?? "?").slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isAdmin && (
                            <span
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm"
                              title="Организатор"
                            >
                              <Crown className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-1">
                            {nameNode}
                            {isAdmin && (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                Админ
                              </span>
                            )}
                            {mine && <span className="text-sm text-muted-foreground">(ты)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{p.paid ? "Оплачено" : "Не оплачено"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canDM && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5"
                            title="Написать"
                          >
                            <Link to="/friends/$friendId" params={{ friendId: p.user_id }}>
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="ml-1 hidden sm:inline">Написать</span>
                            </Link>
                          </Button>
                        )}
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
            )}

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
                      {FEATURES.PHONE_VERIFICATION && organizer.phone_verified && (
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
                {/* «Написать организатору» — для всех залогиненных, кроме самого организатора */}
                {user && !isOrganizer && organizer.id && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full sm:w-auto"
                  >
                    <Link to="/friends/$friendId" params={{ friendId: organizer.id }}>
                      <MessageCircle className="mr-1.5 h-4 w-4" />
                      Написать организатору
                    </Link>
                  </Button>
                )}
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

            {(isJoined || isOrganizer) && !isArchived && <GameChat gameId={game.id} userId={user!.id} />}
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
              {isArchived ? (
                <div className="mt-6 rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
                  <Trophy className="mr-1 inline h-4 w-4 text-amber-500" /> Игра завершена
                </div>
              ) : !user ? (
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
              ) : !game.is_private ? (
                // Открытая игра — запись только через заявку.
                <JoinRequestPanel
                  myRequest={myRequest}
                  full={full}
                  onRequest={requestJoin}
                  busy={joining}
                />
              ) : (
                // Приватная игра — пользователь попал сюда по инвайт-ссылке,
                // запись прямая (после подтверждения по invite_token RLS-ом).
                <Button
                  onClick={join}
                  disabled={joining || full}
                  size="lg"
                  className="mt-6 w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
                >
                  {full ? "Мест нет" : "Записаться"}
                </Button>
              )}
              {!isArchived && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Безопасная сделка · Возврат при отмене
                </p>
              )}
            </div>

            {/* Блок «Гарантии» убран — Misha счёл его юзлесс декорацией.
                Если решим вернуть — раскоментировать историю в git. */}
          </aside>
        </div>

        <SimilarGames
          currentGameId={game.id}
          sport={game.sport}
          city={(game.stadium as unknown as { city?: string } | null)?.city ?? null}
        />
      </section>

      {/* Mobile sticky action bar — скрыт на архивных играх (нечего платить/записываться). */}
      {!isArchived && (
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
          ) : !game.is_private ? (
            myRequest?.status === "pending" ? (
              <Button disabled size="lg" variant="outline" className="gap-1">
                <Clock className="h-4 w-4" /> На рассмотрении
              </Button>
            ) : (
              <Button
                onClick={() => requestJoin(null)}
                disabled={joining || full}
                size="lg"
                className="bg-gradient-brand text-primary-foreground hover:opacity-90"
              >
                {full ? "Мест нет" : "Подать заявку"}
              </Button>
            )
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
      )}

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
        <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2 sm:max-w-md">
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
            {/* Дисклеймер про fair play — не «правила», а человеческая просьба
                держаться в рамках. Полное саморегулирование сообщества. */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">Один момент</p>
              На поле просим вести себя уважительно: без мата, без агрессии, без оскорблений в адрес соперников и организатора. Athletic Flow — про спорт и хорошее настроение, а не конфликты. Спасибо.
            </div>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea по содержимому, как в Telegram.
  // Лимит сверху держим через max-h на css, чтобы не съесть весь экран.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 132) + "px";
  }, [text]);

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
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Файл слишком большой (макс. 20 МБ)");
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
        let toUpload: File = imageFile;
        try {
          toUpload = await compressImage(imageFile, { maxDim: 1920, maxSizeMB: 2 });
        } catch (compErr) {
          console.error("[game-chat] compress failed, uploading original", compErr);
        }
        const ext = toUpload.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${gameId}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        // Загружаем через свой /api/upload — Supabase Storage из РФ-VPS не работает (ТСПУ режет).
        try {
          const { url } = await uploadToBucket("chat-images", path, toUpload);
          image_url = url;
        } catch (e) {
          console.error("[game-chat] upload failed", e);
          toast.error(`Не удалось загрузить фото: ${e instanceof Error ? e.message : "ошибка"}`);
          setUploading(false);
          return;
        }
      }
      // .select().single() — забираем вставленную строку и сразу кладём в локальный
      // state без ожидания realtime. Это закрывает баг «не вижу своё сообщение/фото
      // пока не обновлю страницу» — особенно заметный для картинок.
      const { data: inserted, error } = await supabase
        .from("game_messages")
        .insert({
          game_id: gameId,
          user_id: userId,
          body: body || null,
          image_url,
        })
        .select("id, user_id, body, image_url, created_at")
        .single();
      if (error) {
        console.error("[game-chat] insert failed", error);
        toast.error(error.message);
      } else {
        setText("");
        clearImage();
        if (inserted) {
          // Подтягиваем свой профиль локально (он редко меняется, можно из имеющегося).
          const myMsg = inserted as Message;
          // Профиль авторового сообщения — берём из существующих или пустой:
          // realtime/load всё равно потом дозальёт.
          const existingProfile = messages.find((m) => m.user_id === userId)?.profile ?? null;
          setMessages((prev) =>
            prev.some((x) => x.id === myMsg.id)
              ? prev
              : [...prev, { ...myMsg, profile: existingProfile }],
          );
        }
      }
    } catch (e) {
      console.error("[game-chat] send crashed", e);
      toast.error("Не удалось отправить сообщение");
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
                <p
                  className={`mt-1 text-right text-[10px] ${mine ? "opacity-70" : "text-muted-foreground"}`}
                >
                  {new Date(m.created_at).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
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
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Прикрепить фото"
            className="h-11 w-11 shrink-0"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <textarea
            ref={textareaRef}
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
            className="block min-h-11 max-h-[8.25rem] w-full min-w-0 flex-1 resize-none overflow-y-auto rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-snug ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Button
            type="submit"
            size="icon"
            disabled={uploading || (!text.trim() && !imageFile)}
            aria-label="Отправить"
            className="h-11 w-11 shrink-0 bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * Редактирование игры организатором: slots, цена, время, уровень, описание, приватность.
 *
 * Автопересчёт: если игра создана с rent_total (модель «делим аренду»),
 * при изменении количества игроков цена/чел пересчитывается автоматически
 * (price = floor(rent_total / new_slots)).
 *
 * Если в игре есть участники с paid=true — изменение цены НЕ снимает их флаг.
 * Это сознательное упрощение: при росте цены организатор сам разрулит доплату,
 * при падении — никто не возражает.
 */
function EditGameButton({
  game,
  onSaved,
}: {
  game: GameDetail;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Локальный state формы — обнуляем при открытии диалога.
  const initialDate = new Date(game.starts_at);
  const initialEnd = new Date(game.ends_at);
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
  const toTimeStr = (d: Date) => d.toTimeString().slice(0, 5);

  const [slots, setSlots] = useState<number>(game.slots_total);
  const [level, setLevel] = useState<string>(game.level);
  const [date, setDate] = useState<string>(toDateStr(initialDate));
  const [timeStart, setTimeStart] = useState<string>(toTimeStr(initialDate));
  const [timeEnd, setTimeEnd] = useState<string>(toTimeStr(initialEnd));
  const [description, setDescription] = useState<string>(game.description ?? "");
  const [isPrivate, setIsPrivate] = useState<boolean>(game.is_private);
  // Если у игры был rent_total — это split-режим. Иначе fixed.
  const [payMode, setPayMode] = useState<"split" | "fixed">(
    game.rent_total != null ? "split" : "fixed",
  );
  const [rentTotal, setRentTotal] = useState<string>(
    game.rent_total != null ? String(game.rent_total) : String(game.price_per_player * game.slots_total),
  );
  const [fixedPrice, setFixedPrice] = useState<string>(String(game.price_per_player));

  // Сброс формы при каждом открытии — на случай изменения извне.
  useEffect(() => {
    if (!open) return;
    setSlots(game.slots_total);
    setLevel(game.level);
    setDate(toDateStr(new Date(game.starts_at)));
    setTimeStart(toTimeStr(new Date(game.starts_at)));
    setTimeEnd(toTimeStr(new Date(game.ends_at)));
    setDescription(game.description ?? "");
    setIsPrivate(game.is_private);
    setPayMode(game.rent_total != null ? "split" : "fixed");
    setRentTotal(game.rent_total != null ? String(game.rent_total) : String(game.price_per_player * game.slots_total));
    setFixedPrice(String(game.price_per_player));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const slotsSafe = Math.max(1, slots);
  const rentNum = Math.max(0, Number(rentTotal) || 0);
  const fixedNum = Math.max(0, Number(fixedPrice) || 0);
  // Главная формула автопересчёта: в split-режиме цена/чел всегда производная от rent/N.
  // Комиссия 10% — внутреннее правило, в UI не упоминаем.
  // В обоих режимах цена игрока = ceil(input × 1.1).
  const COMMISSION = 0.1;
  const computedPrice =
    payMode === "split"
      ? Math.ceil((rentNum * (1 + COMMISSION)) / slotsSafe)
      : Math.ceil(fixedNum * (1 + COMMISSION));
  const totalPlan = computedPrice * slotsSafe;

  const submit = async () => {
    if (!date || !timeStart || !timeEnd) {
      toast.error("Заполни дату и время");
      return;
    }
    const starts = new Date(`${date}T${timeStart}:00`);
    const ends = new Date(`${date}T${timeEnd}:00`);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      toast.error("Неверный формат даты/времени");
      return;
    }
    if (ends <= starts) {
      toast.error("Время окончания должно быть позже начала");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("games")
      .update({
        slots_total: slotsSafe,
        level,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        description: description.trim() || null,
        is_private: isPrivate,
        price_per_player: computedPrice,
        // Сохраняем rent_total только в split-режиме; в fixed обнуляем.
        rent_total: payMode === "split" ? rentNum : null,
      })
      .eq("id", game.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Игра обновлена");
    setOpen(false);
    onSaved();
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="mr-1 h-3.5 w-3.5" /> Редактировать
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2 max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать игру</DialogTitle>
            <DialogDescription>
              Изменения увидят все участники. Цена с игрока пересчитается автоматически в режиме «делим аренду».
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Кол-во игроков */}
            <div>
              <Label htmlFor="edit-slots">Количество игроков</Label>
              <Input
                id="edit-slots"
                type="number"
                min={2}
                max={50}
                value={slots}
                onChange={(e) => setSlots(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1 h-11"
              />
            </div>

            {/* Уровень */}
            <div>
              <Label htmlFor="edit-level">Уровень</Label>
              <select
                id="edit-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="mt-1 block h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {["Новичок", "Любитель", "Полупрофи", "Профи"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Дата / Время через shadcn Calendar + select — нативные пикеры
                плохо открывались на десктопе. Этот UX одинаковый везде. */}
            <div className="space-y-2">
              <div>
                <Label>Дата</Label>
                <div className="mt-1">
                  <DatePicker
                    value={date}
                    onChange={setDate}
                    minDate={(() => {
                      const d = new Date();
                      d.setHours(0, 0, 0, 0);
                      return d;
                    })()}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Начало</Label>
                  <div className="mt-1">
                    <TimePicker value={timeStart} onChange={setTimeStart} />
                  </div>
                </div>
                <div>
                  <Label>Конец</Label>
                  <div className="mt-1">
                    <TimePicker value={timeEnd} onChange={setTimeEnd} />
                  </div>
                </div>
              </div>
            </div>

            {/* Оплата */}
            <div>
              <Label>Оплата</Label>
              <div className="mt-1 grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setPayMode("split")}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    payMode === "split"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Аренда / N
                </button>
                <button
                  type="button"
                  onClick={() => setPayMode("fixed")}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    payMode === "fixed"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Фикс. с каждого
                </button>
              </div>
              {payMode === "split" ? (
                <div className="mt-2">
                  <Label htmlFor="edit-rent" className="text-xs">Стоимость аренды, ₽</Label>
                  <Input
                    id="edit-rent"
                    type="number"
                    min={0}
                    value={rentTotal}
                    onChange={(e) => setRentTotal(e.target.value)}
                    className="mt-1 h-11"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Игрок платит <b>{computedPrice} ₽</b>. Цена пересчитается, если изменишь количество игроков.
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <Label htmlFor="edit-fixed" className="text-xs">Сумма с каждого, ₽</Label>
                  <Input
                    id="edit-fixed"
                    type="number"
                    min={0}
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    className="mt-1 h-11"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Всего соберём: <b>{totalPlan} ₽</b> ({computedPrice} ₽ × {slotsSafe})
                  </p>
                </div>
              )}
            </div>

            {/* Описание */}
            <div>
              <Label htmlFor="edit-desc">Описание (необязательно)</Label>
              <Input
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Условия, экипировка и т.д."
                className="mt-1 h-11"
                maxLength={500}
              />
            </div>

            {/* Приватность */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <div className="text-sm">
                <p className="font-medium">Приватная игра</p>
                <p className="text-xs text-muted-foreground">
                  Не отображается в общем каталоге. Можно пригласить по ссылке, друзьями или поиском по нику.
                </p>
              </div>
            </label>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Отмена
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Кнопка «Срочная замена» — рассылает уведомление игрокам, которые играли
 * на этом стадионе в том же спорте за последние 60 дней.
 * Антиспам — 1 раз в час на игру (контролит RPC).
 */
/**
 * Summary финализированной игры: счёт, MVP, состав по командам с голами и передачами.
 * Показывается на странице архивной игры вместо обычных CTA.
 */
function GameResultSummary({
  result,
  stats,
  participants,
}: {
  result: GameResult;
  stats: PlayerStat[];
  participants: Participant[];
}) {
  const profileOf = (uid: string) => participants.find((p) => p.user_id === uid)?.profile ?? null;
  const labelOf = (uid: string) => {
    const p = profileOf(uid);
    return p?.display_name ?? (p?.username ? `@${p.username}` : "Игрок");
  };
  const teamA = stats.filter((s) => s.team === "A");
  const teamB = stats.filter((s) => s.team === "B");
  const unassigned = stats.filter((s) => !s.team);
  const mvp = stats.find((s) => s.is_mvp);

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-card to-card p-4 shadow-elegant sm:rounded-3xl sm:p-6">
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-600 sm:text-xs dark:text-amber-400">
        <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Игра завершена
      </div>
      <div className="mt-3 flex items-baseline justify-center gap-3 sm:mt-4 sm:gap-4">
        <span className="font-display text-4xl font-bold tabular-nums sm:text-5xl">{result.score_team_a}</span>
        <span className="font-display text-2xl font-bold text-muted-foreground sm:text-3xl">:</span>
        <span className="font-display text-4xl font-bold tabular-nums sm:text-5xl">{result.score_team_b}</span>
      </div>
      {mvp && (
        <p className="mt-3 text-center text-xs sm:mt-4 sm:text-sm">
          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-700 sm:px-3 dark:text-amber-300">
            <Star className="h-3 w-3 shrink-0 fill-current sm:h-3.5 sm:w-3.5" />
            <span className="truncate">MVP · {labelOf(mvp.user_id)}</span>
          </span>
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2">
        <ResultTeam label="Команда A" players={teamA} labelOf={labelOf} />
        <ResultTeam label="Команда B" players={teamB} labelOf={labelOf} />
      </div>
      {unassigned.length > 0 && (
        <div className="mt-3 sm:mt-4">
          <ResultTeam label="Без команды" players={unassigned} labelOf={labelOf} />
        </div>
      )}

      {result.notes && (
        <p className="mt-3 break-words rounded-xl border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground sm:mt-4 sm:text-sm">
          «{result.notes}»
        </p>
      )}
      <p className="mt-3 text-center text-[10px] text-muted-foreground sm:text-[11px]">
        Зафиксировано {new Date(result.finalized_at).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}

function ResultTeam({
  label,
  players,
  labelOf,
}: {
  label: string;
  players: PlayerStat[];
  labelOf: (uid: string) => string;
}) {
  if (players.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <ul className="space-y-1">
        {players.map((s) => (
          <li key={s.user_id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1 truncate">
              {s.is_mvp && <Star className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />}
              <span className="truncate">{labelOf(s.user_id)}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {s.goals > 0 && <span className="font-mono">⚽{s.goals}</span>}
              {s.goals > 0 && s.assists > 0 && <span className="mx-1">·</span>}
              {s.assists > 0 && <span className="font-mono">🅰{s.assists}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Кнопка «Подвести итог» — открывает диалог в котором организатор:
 *   1. Делит игроков на команды A / B (или оставляет без команды).
 *   2. Вводит счёт A:B.
 *   3. Каждому игроку проставляет голы и передачи.
 *   4. Выбирает одного MVP.
 *   5. Сохраняет — RPC finalize_game архивирует игру и шлёт уведомления.
 */
function FinalizeGameButton({
  gameId,
  participants,
  onFinalized,
}: {
  gameId: string;
  participants: Participant[];
  onFinalized: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [notes, setNotes] = useState("");
  // Локальная статистика по каждому игроку. Ключ — user_id.
  const [perPlayer, setPerPlayer] = useState<
    Record<string, { team: "A" | "B" | null; goals: number; assists: number; is_mvp: boolean }>
  >({});

  // При открытии диалога — инициализируем дефолтные значения для каждого участника.
  useEffect(() => {
    if (!open) return;
    const init: typeof perPlayer = {};
    participants.forEach((p) => {
      init[p.user_id] = { team: null, goals: 0, assists: 0, is_mvp: false };
    });
    setPerPlayer(init);
    setScoreA(0);
    setScoreB(0);
    setNotes("");
  }, [open, participants]);

  const setPlayer = (
    userId: string,
    patch: Partial<{ team: "A" | "B" | null; goals: number; assists: number; is_mvp: boolean }>,
  ) => {
    setPerPlayer((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], ...patch },
    }));
  };

  // Сделать данного игрока MVP — снимает флаг с остальных.
  const setMvp = (userId: string) => {
    setPerPlayer((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = { ...next[id], is_mvp: id === userId ? !next[id].is_mvp : false };
      });
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    const statsArray = Object.entries(perPlayer).map(([user_id, s]) => ({
      user_id,
      team: s.team,
      goals: s.goals,
      assists: s.assists,
      is_mvp: s.is_mvp,
    }));
    const { error } = await supabase.rpc("finalize_game", {
      p_game_id: gameId,
      p_score_a: scoreA,
      p_score_b: scoreB,
      p_stats: statsArray,
      p_notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Игра завершена и заархивирована");
    setOpen(false);
    onFinalized();
  };

  const mvpName = (() => {
    const entry = Object.entries(perPlayer).find(([, s]) => s.is_mvp);
    if (!entry) return null;
    const [uid] = entry;
    const p = participants.find((x) => x.user_id === uid);
    return p?.profile?.display_name ?? p?.profile?.username ?? "Игрок";
  })();

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="bg-gradient-brand text-primary-foreground hover:opacity-90"
      >
        <Trophy className="mr-1 h-3.5 w-3.5" /> Подвести итог
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2 max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Подведём итог матча</DialogTitle>
            <DialogDescription>
              Вы как организатор фиксируете счёт, разбиваете на команды, отмечаете голы/передачи и выбираете MVP. После сохранения игра уйдёт в архив — изменить будет нельзя.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Счёт */}
            <div>
              <Label>Счёт</Label>
              <div className="mt-1 flex items-center justify-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Команда A</span>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={scoreA}
                    onChange={(e) => setScoreA(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
                    className="h-16 w-20 text-center font-display text-3xl font-bold"
                  />
                </div>
                <span className="text-3xl font-bold text-muted-foreground">:</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Команда B</span>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={scoreB}
                    onChange={(e) => setScoreB(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
                    className="h-16 w-20 text-center font-display text-3xl font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Игроки */}
            <div>
              <Label>Игроки</Label>
              <ul className="mt-2 space-y-2">
                {participants.map((p) => {
                  const s = perPlayer[p.user_id] ?? { team: null, goals: 0, assists: 0, is_mvp: false };
                  const name = p.profile?.display_name ?? p.profile?.username ?? "Игрок";
                  return (
                    <li
                      key={p.id}
                      className={`rounded-xl border p-3 ${
                        s.is_mvp ? "border-amber-500/50 bg-amber-500/5" : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {name}
                          {s.is_mvp && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                              MVP
                            </span>
                          )}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setPlayer(p.user_id, { team: s.team === "A" ? null : "A" })}
                            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                              s.team === "A"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlayer(p.user_id, { team: s.team === "B" ? null : "B" })}
                            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                              s.team === "B"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary/40"
                            }`}
                          >
                            B
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1 text-xs">
                          Голы:
                          <Input
                            type="number"
                            min={0}
                            max={99}
                            value={s.goals}
                            onChange={(e) => setPlayer(p.user_id, { goals: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })}
                            className="h-8 w-14 text-center"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          Передачи:
                          <Input
                            type="number"
                            min={0}
                            max={99}
                            value={s.assists}
                            onChange={(e) => setPlayer(p.user_id, { assists: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })}
                            className="h-8 w-14 text-center"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setMvp(p.user_id)}
                          className={`ml-auto rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                            s.is_mvp
                              ? "border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-300"
                              : "border-border bg-background text-muted-foreground hover:border-amber-500/40"
                          }`}
                        >
                          <Star className="mr-1 inline h-3 w-3" /> MVP
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {mvpName && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  MVP матча: <b>{mvpName}</b>
                </p>
              )}
            </div>

            {/* Заметки */}
            <div>
              <Label htmlFor="finalize-notes">Комментарий (необязательно)</Label>
              <Input
                id="finalize-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 280))}
                placeholder="Например, краткий обзор матча"
                className="mt-1 h-11"
                maxLength={280}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Отмена
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Завершить и заархивировать
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Панель для не-участника на странице открытой игры — запись только через заявку.
 * 4 состояния:
 *   - заявки нет → кнопка «Подать заявку» с диалогом сообщения
 *   - pending → плашка «На рассмотрении»
 *   - rejected → плашка с причиной + кнопка «Подать ещё раз»
 *   - approved → не показывается (юзер уже в участниках)
 */
function JoinRequestPanel({
  myRequest,
  full,
  onRequest,
  busy,
}: {
  myRequest: JoinRequest | null;
  full: boolean;
  onRequest: (message: string | null) => Promise<void>;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    await onRequest(message.trim() || null);
    setOpen(false);
    setMessage("");
  };

  if (myRequest?.status === "pending") {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 rounded-md bg-amber-500/10 px-3 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
        <Clock className="h-4 w-4" /> Заявка на рассмотрении
      </div>
    );
  }
  if (myRequest?.status === "rejected") {
    return (
      <div className="mt-6 space-y-2">
        <div className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          <p className="font-semibold">Заявка отклонена</p>
          {myRequest.reject_reason && (
            <p className="mt-1 text-xs opacity-80">«{myRequest.reject_reason}»</p>
          )}
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={busy || full}
          size="lg"
          className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
        >
          {full ? "Мест нет" : "Подать ещё раз"}
        </Button>
        <RequestDialog open={open} setOpen={setOpen} message={message} setMessage={setMessage} submit={submit} busy={busy} />
      </div>
    );
  }
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={busy || full}
        size="lg"
        className="mt-6 w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
      >
        {full ? "Мест нет" : "Подать заявку"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Игра по аппруву — организатор подтверждает каждого игрока
      </p>
      <RequestDialog open={open} setOpen={setOpen} message={message} setMessage={setMessage} submit={submit} busy={busy} />
    </>
  );
}

function RequestDialog({
  open,
  setOpen,
  message,
  setMessage,
  submit,
  busy,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  message: string;
  setMessage: (v: string) => void;
  submit: () => Promise<void>;
  busy: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/*
        На мобилке системная клавиатура поднимается из нижней половины экрана
        и закрывает центрированный модал с textarea — пишешь и не видишь, что пишешь.
        Поэтому на маленьких экранах прибиваем диалог к верху (top-4),
        а на sm+ возвращаем привычное центрирование. !-важно, чтобы перебить
        собственные top-[50%]/-translate-y-1/2 у DialogContent из shadcn/ui.
      */}
      <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Заявка на участие</DialogTitle>
          <DialogDescription>
            Напиши пару слов о себе, если хочешь — это поможет организатору решить быстрее. Поле не обязательное.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 280))}
            placeholder='Например: "Играю на позиции защитника, опыт 3 года"'
            className="min-h-24"
            maxLength={280}
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">{message.length}/280</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Отмена
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отправить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Список pending-заявок для организатора. Кнопки Approve/Reject.
 * Reject открывает мини-диалог для опционального текста причины.
 */
function JoinRequestsList({
  requests,
  onApprove,
  onReject,
  full,
}: {
  requests: JoinRequest[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string | null) => Promise<void>;
  full: boolean;
}) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setBusy(id);
    await onApprove(id);
    setBusy(null);
  };
  const handleReject = async () => {
    if (!rejectingId) return;
    setBusy(rejectingId);
    await onReject(rejectingId, reason.trim() || null);
    setBusy(null);
    setRejectingId(null);
    setReason("");
  };

  return (
    <div className="rounded-3xl border border-amber-500/40 bg-amber-500/5 p-4 shadow-card sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold sm:text-xl">
          Заявки на участие
        </h2>
        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
          {requests.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Подтверди игроков — после approve они появятся в составе.
      </p>
      <ul className="mt-4 space-y-3">
        {requests.map((r) => {
          const name = r.profile?.display_name ?? r.profile?.username ?? "Игрок";
          return (
            <li
              key={r.id}
              className="rounded-2xl border border-border bg-background p-3"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  {r.profile?.username ? (
                    <Link
                      to="/u/$username"
                      params={{ username: r.profile.username }}
                      className="block truncate text-sm font-semibold hover:underline"
                    >
                      {name}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm font-semibold">{name}</span>
                  )}
                  {r.message && (
                    <p className="mt-1 break-words text-xs text-muted-foreground">«{r.message}»</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRejectingId(r.id);
                    setReason("");
                  }}
                  disabled={busy === r.id}
                >
                  Отклонить
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(r.id)}
                  disabled={busy === r.id || full}
                  className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                >
                  {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Принять"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {full && (
        <p className="mt-3 rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          Состав уже собран — принять новых нельзя. Освободи слот, отчислив кого-то, или увеличь количество мест.
        </p>
      )}

      <Dialog open={!!rejectingId} onOpenChange={(o) => !o && setRejectingId(null)}>
        <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отклонить заявку</DialogTitle>
            <DialogDescription>
              Можно написать короткую причину — она придёт игроку в уведомлении. Поле необязательное.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 280))}
            placeholder="Например: уровень не подходит"
            className="min-h-20"
            maxLength={280}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)} disabled={!!busy}>
              Отмена
            </Button>
            <Button onClick={handleReject} disabled={!!busy} variant="destructive">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отклонить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UrgentReplacementButton({
  gameId,
  sport,
  stadiumName,
}: {
  gameId: string;
  sport: string;
  stadiumName: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendRequest = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("request_urgent_replacement", {
      p_game_id: gameId,
    });
    setBusy(false);
    if (error) {
      // RPC raise EXCEPTION — текст оборачивается в error.message
      const msg = error.message ?? "Не удалось отправить";
      if (msg.includes("recently")) {
        toast.error("Уже отправлено в последний час. Подожди немного.");
      } else if (msg.includes("started")) {
        toast.error("Игра уже началась или закончилась.");
      } else {
        toast.error(msg);
      }
      return;
    }
    const count = (data as { recipients_count?: number } | null)?.recipients_count ?? 0;
    if (count === 0) {
      toast("Нет подходящих игроков рядом — попробуй пригласить друзей вручную.");
    } else {
      toast.success(`Уведомление отправлено · ${count} ${count === 1 ? "игроку" : "игрокам"}`);
    }
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
        onClick={() => setOpen(true)}
      >
        <Zap className="mr-1 h-3.5 w-3.5" /> Срочная замена
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Срочно нужна замена?</DialogTitle>
            <DialogDescription>
              Мы пришлём уведомление игрокам, которые играли в{" "}
              <b>{sport}</b>
              {stadiumName ? (
                <>
                  {" "}на «<b>{stadiumName}</b>»
                </>
              ) : null}{" "}за последние 60 дней. Кнопка работает не чаще одного раза в час.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Отмена
            </Button>
            <Button
              onClick={sendRequest}
              disabled={busy}
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
    const isUpdate = !!existing;
    if (existing) {
      const { error } = await supabase
        .from("user_ratings")
        .update({ score, comment: comment.trim() || null })
        .eq("id", existing.id);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Оценка обновлена");
      setOpen(false);
    } else {
      const { error } = await supabase.from("user_ratings").insert({
        rater_id: user.id,
        ratee_id: rateeId,
        game_id: gameId,
        score,
        comment: comment.trim() || null,
      });
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Спасибо за оценку!");
      setExisting({ id: "tmp", score, comment: comment.trim() || null });
      setOpen(false);
    }
    // Уведомление о новой оценке отправляется автоматически через
    // PG-триггер trg_rating_received_notify → notifications → send-push.
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Star className="mr-1 h-3.5 w-3.5" /> Оценить
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2">
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

function InviteFriendButton({
  gameId,
  userId,
  inviteToken,
}: {
  gameId: string;
  userId: string;
  inviteToken: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  // Friend list
  type FriendLite = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
  const [friends, setFriends] = useState<FriendLite[] | null>(null);
  const [friendQuery, setFriendQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // С токеном — ссылку откроет даже гость / неавторизованный.
  // Без токена (старые игры до миграции / публичные) — обычная ссылка.
  const inviteSuffix = inviteToken ? `?invite=${inviteToken}` : "";
  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/games/${gameId}${inviteSuffix}`
    : `/games/${gameId}${inviteSuffix}`;

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
    // 1) Точное совпадение (регистронезависимое). Главный кейс.
    let prof: { id: string; display_name: string | null; username: string | null } | null = null;
    const { data: exact, error: exactErr } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .ilike("username", handle)
      .maybeSingle();
    if (exactErr) {
      setBusy(false);
      toast.error(exactErr.message);
      return;
    }
    if (exact) {
      prof = exact;
    } else {
      // 2) Fallback: префиксный поиск, ровно один результат → пригласим его.
      //    Если несколько совпадений — просим уточнить, чтобы не пригласить не того.
      const { data: prefix } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .ilike("username", `${handle}%`)
        .limit(2);
      if (prefix && prefix.length === 1) {
        prof = prefix[0];
      } else if (prefix && prefix.length > 1) {
        setBusy(false);
        toast.error("Несколько игроков с похожим ником. Уточни никнейм полностью.");
        return;
      }
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
        <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2 sm:max-w-md">
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
    // Realtime на claims + approvals — партнёр одобрил мою заявку или сам
    // подал свою → счётчик approvals и сам список обновляются без F5.
    const ch = supabase
      .channel(`goal-claims-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goal_claims", filter: `game_id=eq.${gameId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goal_claim_approvals" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
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
