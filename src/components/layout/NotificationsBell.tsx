import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, UserPlus, Check, X, Calendar, Users, Loader2 } from "lucide-react";
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

export function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friendReqs, setFriendReqs] = useState<FriendReq[]>([]);
  const [convInvites, setConvInvites] = useState<ConvInvite[]>([]);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);

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


  const total = friendReqs.length + convInvites.length + gameInvites.length;

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Уведомления">
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {total > 9 ? "9+" : total}
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
