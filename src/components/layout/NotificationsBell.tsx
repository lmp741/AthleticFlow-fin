import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, UserPlus, Check, X, Calendar, Users, Loader2, MessageCircle, Star, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { displayLabel } from "@/routes/friends";

interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  nickname: string | null;
  chat_display: string | null;
  avatar_url: string | null;
}
interface FriendReq {
  id: string;
  requester_id: string;
  created_at: string;
  profile: ProfileLite | null;
}
interface ConvInvite {
  id: string;
  conversation_id: string;
  joined_at: string;
  name: string | null;
}
interface GameInvite {
  id: string;
  sport: string;
  starts_at: string;
  stadium_name: string | null;
}
// Уведомление из таблицы notifications — генерится сервером (send-push, триггеры).
interface NotifRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  created_at: string;
  payload: Record<string, unknown>;
}

// Иконка под тип уведомления. Если нет в карте — общий Sparkles.
function iconForType(type: string) {
  if (type.startsWith("game_chat") || type === "dm_message") return MessageCircle;
  if (type === "rating_received" || type === "review_received" || type === "review_liked") return Star;
  if (type === "urgent_replacement") return Zap;
  if (type === "game_invite") return Calendar;
  if (type === "friend_request") return UserPlus;
  return Sparkles;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Ключ под last-seen хранится по user.id, чтобы у разных аккаунтов в одном
// браузере не смешивался счётчик «новых».
function lastSeenKey(userId: string) {
  return `af.notif.lastSeen.${userId}`;
}

function readLastSeen(userId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(lastSeenKey(userId));
    if (!raw) return 0;
    const v = Number(raw);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function writeLastSeen(userId: string, ts: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(lastSeenKey(userId), String(ts));
  } catch {
    /* noop */
  }
}

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friendReqs, setFriendReqs] = useState<FriendReq[]>([]);
  const [convInvites, setConvInvites] = useState<ConvInvite[]>([]);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  // Метка времени «последнего просмотра колокольчика».
  // Всё, у чего created_at/joined_at новее этой метки — считается непрочитанным
  // и показывается красным бейджем. Открытие popover сдвигает метку на now().
  const [lastSeenAt, setLastSeenAt] = useState<number>(0);

  // При смене пользователя (или первом монтировании) подтягиваем метку из localStorage.
  useEffect(() => {
    if (!user) {
      setLastSeenAt(0);
      return;
    }
    setLastSeenAt(readLastSeen(user.id));
  }, [user?.id]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    // Friend requests addressed to me
    const { data: fr } = await supabase
      .from("friendships")
      .select("id, requester_id, created_at")
      .eq("addressee_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const requesterIds = (fr ?? []).map((r) => r.requester_id);
    let profMap: Record<string, ProfileLite> = {};
    if (requesterIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, nickname, chat_display")
        .in("id", requesterIds);
      (profs ?? []).forEach((p) => (profMap[p.id] = p as ProfileLite));
    }
    setFriendReqs(
      (fr ?? []).map((r) => ({
        id: r.id,
        requester_id: r.requester_id,
        created_at: r.created_at,
        profile: profMap[r.requester_id] ?? null,
      }))
    );

    // Conversation invitations (memberships added by someone else, last 7 days)
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: cms } = await supabase
      .from("conversation_members")
      .select("id, conversation_id, joined_at")
      .eq("user_id", user.id)
      .gt("joined_at", since)
      .order("joined_at", { ascending: false });
    const convIds = (cms ?? []).map((m) => m.conversation_id);
    let convMap: Record<string, { name: string | null; created_by: string }> = {};
    if (convIds.length) {
      const { data: cs } = await supabase
        .from("conversations")
        .select("id, name, created_by")
        .in("id", convIds);
      (cs ?? []).forEach((c) => (convMap[c.id] = { name: c.name, created_by: c.created_by }));
    }
    setConvInvites(
      (cms ?? [])
        .filter((m) => convMap[m.conversation_id] && convMap[m.conversation_id].created_by !== user.id)
        .map((m) => ({
          id: m.id,
          conversation_id: m.conversation_id,
          joined_at: m.joined_at,
          name: convMap[m.conversation_id]?.name ?? null,
        }))
    );

    // Upcoming games where I'm a participant (next 14 days)
    const nowIso = new Date().toISOString();
    const in14 = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
    const { data: parts } = await supabase
      .from("game_participants")
      .select("game_id")
      .eq("user_id", user.id);
    const gameIds = (parts ?? []).map((p) => p.game_id);
    if (gameIds.length) {
      const { data: gs } = await supabase
        .from("games")
        .select("id, sport, starts_at, stadium_id")
        .in("id", gameIds)
        .gt("starts_at", nowIso)
        .lt("starts_at", in14)
        .order("starts_at", { ascending: true });
      const stadiumIds = Array.from(new Set((gs ?? []).map((g) => g.stadium_id)));
      let stadiumMap: Record<string, string> = {};
      if (stadiumIds.length) {
        const { data: st } = await supabase
          .from("stadiums")
          .select("id, name")
          .in("id", stadiumIds);
        (st ?? []).forEach((s) => (stadiumMap[s.id] = s.name));
      }
      setGameInvites(
        (gs ?? []).map((g) => ({
          id: g.id,
          sport: g.sport,
          starts_at: g.starts_at,
          stadium_name: stadiumMap[g.stadium_id] ?? null,
        }))
      );
    } else {
      setGameInvites([]);
    }

    // Notifications из новой унифицированной таблицы — chat, ratings, invites
    // через send-push и триггеры. Берём последние 20, неважно read/unread —
    // отдадим в UI и подсветим непрочитанные.
    const { data: nrows } = await supabase
      .from("notifications")
      .select("id, type, title, body, url, read_at, created_at, payload")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifs((nrows ?? []) as NotifRow[]);

    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    let alive = true;
    load();
    // Polling 45s + focus-refetch вместо широкого realtime.
    // Realtime тут падал на быстром логине/StrictMode:
    //   "cannot add postgres_changes callbacks for realtime:notifs-..."
    // Это известная гонка в supabase-js при пересоздании канала с тем же name.
    const intId = window.setInterval(() => {
      if (alive) load();
    }, 45_000);
    const onFocus = () => {
      if (alive && document.visibilityState !== "hidden") load();
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


  // Всего элементов в фиде (для пустого состояния).
  const total = friendReqs.length + convInvites.length + gameInvites.length + notifs.length;
  // Непрочитанных — две составляющие:
  //  1. notifications.read_at IS NULL — серверные уведомления (chat, rating, etc)
  //  2. friend reqs + conv invites, появившиеся после lastSeenAt
  // Game invites не считаем — это «предстоящие игры», а не новое событие.
  const unreadNotifs = notifs.filter((n) => !n.read_at).length;
  const unread =
    unreadNotifs +
    friendReqs.filter((r) => new Date(r.created_at).getTime() > lastSeenAt).length +
    convInvites.filter((c) => new Date(c.joined_at).getTime() > lastSeenAt).length;

  // Открытие колокольчика → метка «прочитано» = сейчас + батч-update read_at.
  // Закрытие ничего не меняет (всё уже отмечено при открытии).
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && user) {
      const now = Date.now();
      setLastSeenAt(now);
      writeLastSeen(user.id, now);
      // Помечаем все непрочитанные notifications как read на сервере.
      // RPC обновляет только свои строки (auth.uid()) и только непрочитанные.
      if (unreadNotifs > 0) {
        supabase.rpc("mark_all_notifications_read").then(() => {
          // Локально обновим read_at чтобы UI сразу отразил.
          setNotifs((prev) =>
            prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
          );
        });
      }
    }
  };

  // Клик по нотификации → переход и помечаем прочитанной (если ещё не).
  const handleNotifClick = async (n: NotifRow) => {
    setOpen(false);
    if (!n.read_at) {
      // Оптимистично обновляем локально, RPC отрабатывает асинхронно.
      setNotifs((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)),
      );
      supabase.rpc("mark_notifications_read", { p_ids: [n.id] });
    }
    if (n.url) {
      navigate({ to: n.url });
    }
  };

  const accept = async (f: FriendReq) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", f.id);
    if (error) toast.error(error.message);
    else { toast.success("Заявка принята"); load(); }
  };
  const decline = async (f: FriendReq) => {
    const { error } = await supabase.from("friendships").delete().eq("id", f.id);
    if (error) toast.error(error.message);
    else load();
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Уведомления">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Новости</h3>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {total === 0 && !loading && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Нет новых уведомлений
            </p>
          )}

          {notifs.length > 0 && (
            <div className="px-2 py-2">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="mr-1 inline h-3 w-3" /> События
              </p>
              <ul className="space-y-1">
                {notifs.map((n) => {
                  const Icon = iconForType(n.type);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleNotifClick(n)}
                        className={`flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-muted/40 ${
                          n.read_at ? "" : "bg-primary/5"
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm ${n.read_at ? "font-medium" : "font-semibold"}`}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="line-clamp-2 text-[12px] text-muted-foreground">{n.body}</p>
                          )}
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {fmtDate(n.created_at)}
                          </p>
                        </div>
                        {!n.read_at && (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive"
                            aria-label="Не прочитано"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {friendReqs.length > 0 && (
            <div className="px-2 py-2">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <UserPlus className="mr-1 inline h-3 w-3" /> Заявки в друзья
              </p>
              <ul className="space-y-1">
                {friendReqs.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/40"
                  >
                    <Avatar className="h-9 w-9">
                      {f.profile?.avatar_url ? <AvatarImage src={f.profile.avatar_url} /> : null}
                      <AvatarFallback className="text-[10px]">
                        {initials(f.profile ? displayLabel(f.profile) : "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {f.profile ? displayLabel(f.profile) : "Игрок"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {f.profile?.username ? `@${f.profile.username} · ` : ""}{fmtDate(f.created_at)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      className="h-7 w-7 bg-gradient-brand text-primary-foreground hover:opacity-90"
                      onClick={() => accept(f)}
                      aria-label="Принять"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => decline(f)}
                      aria-label="Отклонить"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {convInvites.length > 0 && (
            <div className="border-t border-border px-2 py-2">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="mr-1 inline h-3 w-3" /> Приглашения в беседы
              </p>
              <ul className="space-y-1">
                {convInvites.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/chats/$conversationId"
                      params={{ conversationId: c.conversation_id }}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name ?? "Новая беседа"}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          Добавили {fmtDate(c.joined_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gameInvites.length > 0 && (
            <div className="border-t border-border px-2 py-2">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="mr-1 inline h-3 w-3" /> Ближайшие события
              </p>
              <ul className="space-y-1">
                {gameInvites.map((g) => (
                  <li key={g.id}>
                    <Link
                      to="/games/$gameId"
                      params={{ gameId: g.id }}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {g.sport}{g.stadium_name ? ` · ${g.stadium_name}` : ""}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {fmtDate(g.starts_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
          <Button asChild size="sm" variant="ghost" onClick={() => setOpen(false)}>
            <Link to="/friends">К друзьям</Link>
          </Button>
          <Button asChild size="sm" variant="ghost" onClick={() => setOpen(false)}>
            <Link to="/my">К моим играм</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
