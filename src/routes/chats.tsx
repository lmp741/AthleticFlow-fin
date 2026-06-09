import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus, Users, Loader2, Check, X } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { toast } from "sonner";
import { displayLabel } from "@/routes/friends";

export const Route = createFileRoute("/chats")({
  head: () => ({ meta: [{ title: "Общение — Athletic Flow" }] }),
  component: () => (
    <RequireAuth>
      <ChatsPage />
    </RequireAuth>
  ),
});

interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  nickname: string | null;
  chat_display: string | null;
  avatar_url: string | null;
}

interface DMRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  image_url: string | null;
  video_url: string | null;
  document_url: string | null;
  location_lat: number | null;
  created_at: string;
}

interface ConversationRow {
  id: string;
  name: string | null;
  created_by: string;
  updated_at: string;
}

interface ConvMemberRow {
  conversation_id: string;
  user_id: string;
}

interface ConvLastMsg {
  conversation_id: string;
  body: string | null;
  image_url: string | null;
  video_url: string | null;
  document_url: string | null;
  location_lat: number | null;
  created_at: string;
  sender_id: string;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function previewOf(m: { body: string | null; image_url: string | null; video_url: string | null; document_url: string | null; location_lat: number | null }) {
  if (m.body?.trim()) return m.body.trim();
  if (m.image_url) return "📷 Фото";
  if (m.video_url) return "🎬 Видео";
  if (m.document_url) return "📎 Документ";
  if (m.location_lat !== null) return "📍 Геолокация";
  return "—";
}

function fmtWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function ChatsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dmThreads, setDmThreads] = useState<{ partner: ProfileLite; last: DMRow }[]>([]);
  const [convs, setConvs] = useState<
    { conv: ConversationRow; members: ProfileLite[]; last: ConvLastMsg | null }[]
  >([]);
  const [friends, setFriends] = useState<ProfileLite[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // DM threads
    const { data: dms } = await supabase
      .from("direct_messages")
      .select(
        "id, sender_id, recipient_id, body, image_url, video_url, document_url, location_lat, created_at"
      )
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);
    const dmList = (dms ?? []) as DMRow[];
    const partnerLast = new Map<string, DMRow>();
    for (const m of dmList) {
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!partnerLast.has(other)) partnerLast.set(other, m);
    }
    const partnerIds = Array.from(partnerLast.keys());

    // Friends (accepted)
    const { data: friendsRows } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id, status")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted");
    const friendIds = (friendsRows ?? []).map((r) =>
      r.requester_id === user.id ? r.addressee_id : r.requester_id
    );

    // Conversations I'm in
    const { data: myMemberRows } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);
    const convIds = (myMemberRows ?? []).map((r) => r.conversation_id);

    const [{ data: convsData }, { data: allMembers }] = await Promise.all([
      convIds.length
        ? supabase
            .from("conversations")
            .select("id, name, created_by, updated_at")
            .in("id", convIds)
            .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] as ConversationRow[] }),
      convIds.length
        ? supabase
            .from("conversation_members")
            .select("conversation_id, user_id")
            .in("conversation_id", convIds)
        : Promise.resolve({ data: [] as ConvMemberRow[] }),
    ]);

    // Last messages per conversation
    const lastByConv = new Map<string, ConvLastMsg>();
    if (convIds.length) {
      const { data: msgs } = await supabase
        .from("conversation_messages")
        .select(
          "conversation_id, sender_id, body, image_url, video_url, document_url, location_lat, created_at"
        )
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(1000);
      for (const m of (msgs ?? []) as ConvLastMsg[]) {
        if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
      }
    }

    // All needed profile ids
    const allIds = new Set<string>([
      ...partnerIds,
      ...friendIds,
      ...((allMembers ?? []) as ConvMemberRow[]).map((m) => m.user_id),
    ]);
    allIds.delete(user.id);
    let profMap = new Map<string, ProfileLite>();
    if (allIds.size) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, nickname, chat_display")
        .in("id", Array.from(allIds));
      for (const p of (profs ?? []) as ProfileLite[]) profMap.set(p.id, p);
    }

    setFriends(friendIds.map((id) => profMap.get(id)).filter(Boolean) as ProfileLite[]);

    setDmThreads(
      partnerIds
        .map((pid) => ({ partner: profMap.get(pid), last: partnerLast.get(pid)! }))
        .filter((x) => x.partner) as { partner: ProfileLite; last: DMRow }[]
    );

    const membersByConv = new Map<string, ProfileLite[]>();
    for (const m of ((allMembers ?? []) as ConvMemberRow[])) {
      if (m.user_id === user.id) continue;
      const p = profMap.get(m.user_id);
      if (!p) continue;
      const arr = membersByConv.get(m.conversation_id) ?? [];
      arr.push(p);
      membersByConv.set(m.conversation_id, arr);
    }

    setConvs(
      ((convsData ?? []) as ConversationRow[]).map((c) => ({
        conv: c,
        members: membersByConv.get(c.id) ?? [],
        last: lastByConv.get(c.id) ?? null,
      }))
    );

    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => load(), 500);
    };
    // direct_messages: only events involving me (RLS already enforces this,
    // but explicit filter keeps client traffic minimal)
    const ch = supabase
      .channel(`chats-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `sender_id=eq.${user.id}` }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${user.id}` }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_members", filter: `user_id=eq.${user.id}` }, debounced)
      // conversation_messages / conversations: RLS scopes to my conversations
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_messages" }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, debounced)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  const merged = useMemo(() => {
    type Item =
      | { kind: "dm"; ts: string; partner: ProfileLite; last: DMRow }
      | { kind: "group"; ts: string; conv: ConversationRow; members: ProfileLite[]; last: ConvLastMsg | null };
    const items: Item[] = [
      ...dmThreads.map((t) => ({ kind: "dm" as const, ts: t.last.created_at, partner: t.partner, last: t.last })),
      ...convs.map((c) => ({
        kind: "group" as const,
        ts: c.last?.created_at ?? c.conv.updated_at,
        conv: c.conv,
        members: c.members,
        last: c.last,
      })),
    ];
    items.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return items;
  }, [dmThreads, convs]);

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
          <h1 className="font-display text-4xl font-bold text-white md:text-5xl">Общение</h1>
          <p className="mt-2 max-w-2xl text-white/80">
            Все переписки с друзьями и групповые беседы в одном месте.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Чаты · {merged.length}</h2>
          <NewConversationDialog friends={friends} onCreated={load} />
        </div>

        {merged.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/40 p-10 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Пока пусто. Создай беседу или начни личный чат со страницы{" "}
              <Link to="/friends" className="text-foreground underline">друзей</Link>.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {merged.map((it) =>
              it.kind === "dm" ? (
                <li key={`dm-${it.partner.id}`} className="min-w-0">
                  <Link
                    to="/friends/$friendId"
                    params={{ friendId: it.partner.id }}
                    className="flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 transition hover:bg-muted/40"
                  >
                    <Avatar className="h-11 w-11 shrink-0">
                      {it.partner.avatar_url ? <AvatarImage src={it.partner.avatar_url} /> : null}
                      <AvatarFallback>{initials(displayLabel(it.partner))}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{displayLabel(it.partner)}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {fmtWhen(it.last.created_at)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {it.last.sender_id === user!.id ? "Вы: " : ""}{previewOf(it.last).replace(/\s*\n\s*/g, " ")}
                      </p>
                    </div>
                  </Link>
                </li>
              ) : (
                <li key={`g-${it.conv.id}`} className="min-w-0">
                  <Link
                    to="/chats/$conversationId"
                    params={{ conversationId: it.conv.id }}
                    className="flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 transition hover:bg-muted/40"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          {it.conv.name?.trim() ||
                            it.members.slice(0, 3).map((m) => displayLabel(m)).join(", ") ||
                            "Беседа"}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {fmtWhen(it.ts)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {it.last
                          ? `${it.last.sender_id === user!.id ? "Вы: " : ""}${previewOf(it.last).replace(/\s*\n\s*/g, " ")}`
                          : `Участников: ${it.members.length + 1}`}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            )}
          </ul>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function NewConversationDialog({
  friends,
  onCreated,
}: {
  friends: ProfileLite[];
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = friends.filter((f) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      (f.display_name ?? "").toLowerCase().includes(s) ||
      (f.nickname ?? "").toLowerCase().includes(s) ||
      (f.username ?? "").toLowerCase().includes(s)
    );
  });

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const create = async () => {
    if (!user) return;
    if (picked.size === 0) {
      toast.error("Выбери хотя бы одного друга");
      return;
    }
    setBusy(true);
    const { data: conv, error: cErr } = await supabase
      .from("conversations")
      .insert({ name: name.trim() || null, created_by: user.id })
      .select("id")
      .single();
    if (cErr || !conv) {
      setBusy(false);
      toast.error(cErr?.message ?? "Не удалось создать беседу");
      return;
    }
    // Add self first (required by RLS), then invitees
    const { error: meErr } = await supabase
      .from("conversation_members")
      .insert({ conversation_id: conv.id, user_id: user.id });
    if (meErr) {
      setBusy(false);
      toast.error(meErr.message);
      return;
    }
    const invites = Array.from(picked).map((uid) => ({
      conversation_id: conv.id,
      user_id: uid,
    }));
    const { error: invErr } = await supabase.from("conversation_members").insert(invites);
    setBusy(false);
    if (invErr) {
      toast.error(invErr.message);
      return;
    }
    toast.success("Беседа создана");
    setOpen(false);
    setName("");
    setPicked(new Set());
    setQ("");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-brand text-primary-foreground hover:opacity-90">
          <Plus className="mr-1 h-4 w-4" /> Новая беседа
        </Button>
      </DialogTrigger>
      <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Новая беседа</DialogTitle>
          <DialogDescription>
            Дай беседе название и выбери друзей, которых хочешь пригласить.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название (необязательно)"
            maxLength={60}
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск среди друзей"
          />
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {friends.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                У тебя пока нет друзей. Добавь кого-нибудь на странице{" "}
                <Link to="/friends" className="underline">друзей</Link>.
              </p>
            )}
            {filtered.map((f) => {
              const checked = picked.has(f.id);
              return (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => toggle(f.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                    checked ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    {f.avatar_url ? <AvatarImage src={f.avatar_url} /> : null}
                    <AvatarFallback>{initials(displayLabel(f))}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayLabel(f)}</p>
                    {f.username && (
                      <p className="truncate text-xs text-muted-foreground">@{f.username}</p>
                    )}
                  </div>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Выбрано: {picked.size}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            <X className="mr-1 h-4 w-4" /> Отмена
          </Button>
          <Button
            onClick={create}
            disabled={busy || picked.size === 0}
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
