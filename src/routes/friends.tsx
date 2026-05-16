import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Check, X, MessageCircle, Loader2, Users, Clock } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Друзья — Athletic Flow" },
      {
        name: "description",
        content:
          "Список друзей в Athletic Flow: добавляй спортивных партнёров, приглашай в игры одним кликом и собирай постоянную команду.",
      },
      { property: "og:title", content: "Друзья — Athletic Flow" },
      {
        property: "og:description",
        content: "Собирай постоянную команду: друзья, приглашения и быстрая запись на игры.",
      },
      { property: "og:url", content: "https://af-sport.ru/friends" },
    ],
    links: [{ rel: "canonical", href: "https://af-sport.ru/friends" }],
  }),
  component: () => (
    <RequireAuth>
      <FriendsPage />
    </RequireAuth>
  ),
});

interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: string | null;
  nickname?: string | null;
  chat_display?: string | null;
}

export function displayLabel(p: { display_name: string | null; nickname?: string | null; chat_display?: string | null; username?: string | null }): string {
  const pref = p.chat_display === "nickname" ? "nickname" : "name";
  if (pref === "nickname") {
    return p.nickname?.trim() || p.display_name?.trim() || (p.username ? `@${p.username}` : "Игрок");
  }
  return p.display_name?.trim() || p.nickname?.trim() || (p.username ? `@${p.username}` : "Игрок");
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function FriendsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ProfileLite[]>([]);
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status, created_at")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as FriendshipRow[];
    setFriendships(rows);
    const ids = Array.from(
      new Set(rows.flatMap((r) => [r.requester_id, r.addressee_id]).filter((id) => id !== user.id))
    );
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, level, nickname, chat_display")
        .in("id", ids);
      const map: Record<string, ProfileLite> = {};
      (ps ?? []).forEach((p) => (map[p.id] = p as ProfileLite));
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => load(), 400);
    };
    const ch = supabase
      .channel(`friends-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `requester_id=eq.${user.id}` }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `addressee_id=eq.${user.id}` }, debounced)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.addressee_id === user?.id);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.requester_id === user?.id);

  const friendshipFor = (otherId: string) =>
    friendships.find(
      (f) =>
        (f.requester_id === user?.id && f.addressee_id === otherId) ||
        (f.addressee_id === user?.id && f.requester_id === otherId)
    );

  const doSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim().replace(/^@/, "");
    if (!q || !user) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, level, nickname, chat_display")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%,nickname.ilike.%${q}%`)
      .neq("id", user.id)
      .limit(20);
    setSearchResults((data ?? []) as ProfileLite[]);
    setSearching(false);
  };

  const sendRequest = async (other: ProfileLite) => {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: other.id, status: "pending" });
    if (error) {
      if (error.code === "23505") toast.error("Запрос уже отправлен");
      else toast.error(error.message);
      return;
    }
    toast.success("Заявка отправлена");
    load();
  };

  const accept = async (f: FriendshipRow) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", f.id);
    if (error) toast.error(error.message);
    else { toast.success("Теперь вы друзья"); load(); }
  };

  const remove = async (f: FriendshipRow) => {
    const { error } = await supabase.from("friendships").delete().eq("id", f.id);
    if (error) toast.error(error.message);
    else load();
  };

  const otherIdOf = (f: FriendshipRow) =>
    f.requester_id === user?.id ? f.addressee_id : f.requester_id;

  const filteredAccepted = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (!q) return accepted;
    return accepted.filter((f) => {
      const p = profiles[otherIdOf(f)];
      if (!p) return false;
      return (
        (p.username ?? "").toLowerCase().includes(q) ||
        (p.display_name ?? "").toLowerCase().includes(q) ||
        (p.nickname ?? "").toLowerCase().includes(q)
      );
    });
  }, [accepted, profiles, query]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-gradient-hero py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <Badge className="mb-3 border-white/30 bg-white/10 text-white">Сообщество</Badge>
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl">Друзья</h1>
          <p className="mt-2 max-w-2xl text-white/80">
            Находи знакомых по никнейму или имени, добавляй в друзья и общайся в личных чатах.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 py-10">
        <form onSubmit={doSearch} className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по @никнейму или имени"
            className="h-12 pl-10"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1.5 top-1.5 h-9 bg-gradient-brand text-primary-foreground hover:opacity-90"
            disabled={searching}
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Найти"}
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-bold">Результаты поиска</h2>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {searchResults.map((p) => {
                const f = friendshipFor(p.id);
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                  >
                    <PersonRow person={p} />
                    <div className="flex items-center gap-2">
                      {!f && (
                        <Button
                          size="sm"
                          onClick={() => sendRequest(p)}
                          className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                        >
                          <UserPlus className="mr-1 h-4 w-4" /> Добавить
                        </Button>
                      )}
                      {f?.status === "pending" && f.requester_id === user?.id && (
                        <span className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" /> Ожидание
                        </span>
                      )}
                      {f?.status === "pending" && f.addressee_id === user?.id && (
                        <Button size="sm" variant="outline" onClick={() => accept(f)}>
                          <Check className="mr-1 h-4 w-4" /> Принять
                        </Button>
                      )}
                      {f?.status === "accepted" && (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/friends/$friendId" params={{ friendId: p.id }}>
                            <MessageCircle className="mr-1 h-4 w-4" /> Чат
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {incoming.length > 0 && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-bold">Входящие заявки</h2>
            <ul className="mt-4 space-y-2">
              {incoming.map((f) => {
                const p = profiles[f.requester_id];
                if (!p) return null;
                return (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                  >
                    <PersonRow person={p} />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => accept(f)}
                        className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                      >
                        <Check className="mr-1 h-4 w-4" /> Принять
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => remove(f)}>
                        <X className="mr-1 h-4 w-4" /> Отклонить
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {outgoing.length > 0 && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-bold">Исходящие заявки</h2>
            <ul className="mt-4 space-y-2">
              {outgoing.map((f) => {
                const p = profiles[f.addressee_id];
                if (!p) return null;
                return (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                  >
                    <PersonRow person={p} />
                    <Button size="sm" variant="ghost" onClick={() => remove(f)}>
                      <X className="mr-1 h-4 w-4" /> Отменить
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">
              <Users className="mr-1 inline h-5 w-5" /> Мои друзья · {accepted.length}
            </h2>
          </div>
          {filteredAccepted.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Пока никого. Найди знакомых по никнейму или имени выше.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {filteredAccepted.map((f) => {
                const otherId = otherIdOf(f);
                const p = profiles[otherId];
                if (!p) return null;
                return (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                  >
                    <PersonRow person={p} />
                    <div className="flex items-center gap-1">
                      <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground hover:opacity-90">
                        <Link to="/friends/$friendId" params={{ friendId: p.id }}>
                          <MessageCircle className="mr-1 h-4 w-4" /> Чат
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" aria-label="Удалить из друзей">
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить из друзей?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {displayLabel(p)} будет удалён(а) из ваших друзей. Вы больше не сможете обмениваться личными сообщениями, пока снова не добавите друг друга.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => remove(f)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function PersonRow({ person }: { person: ProfileLite }) {
  const name = displayLabel(person);
  const inner = (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="h-10 w-10">
        {person.avatar_url ? <AvatarImage src={person.avatar_url} /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {person.username ? `@${person.username}` : ""}
          {person.level ? ` · ${person.level}` : ""}
        </p>
      </div>
    </div>
  );
  return person.username ? (
    <Link to="/u/$username" params={{ username: person.username }} className="min-w-0 flex-1 hover:opacity-90">
      {inner}
    </Link>
  ) : (
    <div className="min-w-0 flex-1">{inner}</div>
  );
}
