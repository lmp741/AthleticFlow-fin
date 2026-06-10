import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Video,
  Paperclip,
  MapPin,
  Loader2,
  Users,
  UserPlus,
  LogOut,
  Check,
  Pencil,
  Trash2,
  Crown,
  UserMinus,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteShell";
import {
  PrivateChatImage,
  PrivateChatVideo,
  PrivateChatDocument,
} from "@/components/media/PrivateMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { compressImage } from "@/lib/image";
import { uploadToBucket } from "@/lib/upload";
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
import { MessageActions } from "@/components/chat/MessageActions";

export const Route = createFileRoute("/chats_/$conversationId")({
  head: () => ({ meta: [{ title: "Беседа — Athletic Flow" }] }),
  component: () => (
    <RequireAuth>
      <ConversationPage />
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

interface ConvMsg {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  video_url: string | null;
  document_url: string | null;
  document_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const myId = user?.id;

  const [loading, setLoading] = useState(true);
  const [convName, setConvName] = useState<string | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, ProfileLite>>({});
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<ConvMsg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState<null | "image" | "video" | "document">(null);
  const [sendingLocation, setSendingLocation] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadAll = async () => {
    if (!myId) return;
    const [{ data: conv }, { data: mems }] = await Promise.all([
      supabase
        .from("conversations")
        .select("id, name, created_by")
        .eq("id", conversationId)
        .maybeSingle(),
      supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId),
    ]);

    if (!conv) {
      setLoading(false);
      setIsMember(false);
      return;
    }
    setConvName(conv.name);
    setCreatedBy(conv.created_by);

    const ids = (mems ?? []).map((m) => m.user_id);
    setMemberIds(ids);
    setIsMember(ids.includes(myId));

    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, nickname, chat_display")
        .in("id", ids);
      const map: Record<string, ProfileLite> = {};
      for (const p of (profs ?? []) as ProfileLite[]) map[p.id] = p;
      setMembers(map);
    }
    setLoading(false);
  };

  const PAGE = 50;
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMessages = async () => {
    if (!myId) return;
    const { data } = await supabase
      .from("conversation_messages")
      .select(
        "id, conversation_id, sender_id, body, image_url, video_url, document_url, document_name, location_lat, location_lng, created_at, edited_at, deleted_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    const rows = ((data ?? []) as ConvMsg[]).slice().reverse();
    setMessages(rows);
    setHasMore((data ?? []).length === PAGE);
  };

  const loadEarlier = async () => {
    if (!myId || messages.length === 0 || loadingMore) return;
    setLoadingMore(true);
    const oldest = messages[0].created_at;
    const { data } = await supabase
      .from("conversation_messages")
      .select(
        "id, conversation_id, sender_id, body, image_url, video_url, document_url, document_name, location_lat, location_lng, created_at, edited_at, deleted_at"
      )
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    const rows = ((data ?? []) as ConvMsg[]).slice().reverse();
    setMessages((prev) => [...rows, ...prev]);
    setHasMore((data ?? []).length === PAGE);
    setLoadingMore(false);
  };


  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, conversationId]);

  useEffect(() => {
    if (!myId || !isMember) return;
    loadMessages();
    const ch = supabase
      .channel(`conv-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as ConvMsg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as ConvMsg;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversationId}` },
        () => loadAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, conversationId, isMember]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (extra?: Partial<ConvMsg>) => {
    if (!myId) return;
    const txt = body.trim();
    const payload = {
      conversation_id: conversationId,
      sender_id: myId,
      body: extra?.body ?? (txt || null),
      image_url: extra?.image_url ?? null,
      video_url: extra?.video_url ?? null,
      document_url: extra?.document_url ?? null,
      document_name: extra?.document_name ?? null,
      location_lat: extra?.location_lat ?? null,
      location_lng: extra?.location_lng ?? null,
    };
    if (
      !payload.body &&
      !payload.image_url &&
      !payload.video_url &&
      !payload.document_url &&
      payload.location_lat === null
    ) {
      return;
    }
    setSending(true);
    // .select() — добавим сообщение локально, не дожидаясь realtime broadcast.
    const { data: inserted, error } = await supabase
      .from("conversation_messages")
      .insert(payload)
      .select()
      .single();
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (inserted) {
      const newRow = inserted as ConvMsg;
      setMessages((prev) => (prev.some((x) => x.id === newRow.id) ? prev : [...prev, newRow]));
    }
    if (!extra) setBody("");
  };

  const uploadAndSend = async (file: File, kind: "image" | "video" | "document") => {
    if (!myId) return;
    const limits = { image: 20, video: 50, document: 20 };
    const maxMb = limits[kind];
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Файл больше ${maxMb} МБ`);
      return;
    }
    setUploading(kind);
    let toUpload: File = file;
    if (kind === "image") {
      try {
        toUpload = await compressImage(file, { maxDim: 1920, maxSizeMB: 2 });
      } catch {
        /* upload original on compression error */
      }
    }
    const ext = toUpload.name.split(".").pop()?.toLowerCase() ?? "bin";
    const safe = toUpload.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
    const path = `${myId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe || `file.${ext}`}`;
    // Локальный аплоадер вместо Supabase Storage — см. src/lib/upload.ts.
    let publicUrl: string;
    try {
      const res = await uploadToBucket("dm-media", path, toUpload);
      publicUrl = res.url;
    } catch (e) {
      setUploading(null);
      toast.error(`Не удалось загрузить файл: ${e instanceof Error ? e.message : "ошибка"}`);
      return;
    }
    await send({
      image_url: kind === "image" ? publicUrl : null,
      video_url: kind === "video" ? publicUrl : null,
      document_url: kind === "document" ? publicUrl : null,
      document_name: kind === "document" ? file.name : null,
    });
    setUploading(null);
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Геолокация недоступна");
      return;
    }
    setSendingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await send({
          location_lat: pos.coords.latitude,
          location_lng: pos.coords.longitude,
        });
        setSendingLocation(false);
      },
      (err) => {
        setSendingLocation(false);
        toast.error(err.message || "Не удалось получить координаты");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const leave = async () => {
    if (!myId) return;
    const { error } = await supabase
      .from("conversation_members")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", myId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Вы покинули беседу");
    navigate({ to: "/chats" });
  };

  const grouped = useMemo(() => {
    const out: { day: string; items: ConvMsg[] }[] = [];
    for (const m of messages) {
      const day = fmtDay(m.created_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

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

  if (!isMember) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Нет доступа</h1>
          <p className="mt-2 text-muted-foreground">
            Эта беседа недоступна или вы больше не её участник.
          </p>
          <Button asChild className="mt-4">
            <Link to="/chats">К беседам</Link>
          </Button>
        </div>
      </div>
    );
  }

  const title =
    convName?.trim() ||
    memberIds
      .filter((id) => id !== myId)
      .slice(0, 3)
      .map((id) => (members[id] ? displayLabel(members[id]) : "Игрок"))
      .join(", ") ||
    "Беседа";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <header className="sticky-sub-header z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto flex items-center gap-3 px-6 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/chats" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">
              Участников: {memberIds.length}
            </p>
          </div>
          <MembersDialog
            members={memberIds.map((id) => members[id]).filter(Boolean) as ProfileLite[]}
            myId={myId!}
            createdBy={createdBy}
            conversationId={conversationId}
            convName={convName}
            onChanged={loadAll}
            onDeleted={() => navigate({ to: "/chats" })}
          />
          <Button variant="ghost" size="sm" onClick={leave} title="Покинуть">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <div className="flex-1 space-y-4">
          {hasMore && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadEarlier}
                disabled={loadingMore}
              >
                {loadingMore ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                Загрузить ранее
              </Button>
            </div>
          )}
          {grouped.length === 0 && (
            <p className="mt-12 text-center text-sm text-muted-foreground">
              Сообщений пока нет. Напишите первое!
            </p>
          )}
          {grouped.map((g) => (
            <div key={g.day} className="space-y-2">
              <div className="my-2 flex items-center justify-center">
                <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {g.day}
                </span>
              </div>
              {g.items.map((m) => {
                const mine = m.sender_id === myId;
                const author = members[m.sender_id];
                const authorName = author ? displayLabel(author) : "Игрок";
                const isDeleted = !!m.deleted_at;
                return (
                  <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"} gap-2`}>
                    {!mine && (
                      <Avatar className="mt-auto h-7 w-7">
                        {author?.avatar_url ? <AvatarImage src={author.avatar_url} /> : null}
                        <AvatarFallback className="text-[10px]">{initials(authorName)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-3 py-2 shadow-card ${
                        mine
                          ? "bg-gradient-brand text-primary-foreground"
                          : "bg-card text-foreground border border-border"
                      } ${isDeleted ? "italic opacity-70" : ""}`}
                    >
                      {!mine && (
                        <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                          {authorName}
                        </p>
                      )}
                      {isDeleted ? (
                        <p className="text-sm">Сообщение удалено</p>
                      ) : (
                        <>
                          {m.image_url && <PrivateChatImage src={m.image_url} />}
                          {m.video_url && <PrivateChatVideo src={m.video_url} />}
                          {m.document_url && (
                            <PrivateChatDocument
                              src={m.document_url}
                              name={m.document_name}
                              mine={mine}
                            />
                          )}
                          {m.location_lat !== null && m.location_lng !== null && (
                            <a
                              href={`https://www.google.com/maps?q=${m.location_lat},${m.location_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`mb-1 flex items-center gap-2 rounded-xl px-3 py-2 ${
                                mine ? "bg-white/15" : "bg-muted"
                              }`}
                            >
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span className="text-sm">
                                Геолокация · {m.location_lat.toFixed(5)}, {m.location_lng.toFixed(5)}
                              </span>
                            </a>
                          )}
                          {m.body && (
                            <p
                              className="whitespace-pre-wrap text-sm"
                              style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                            >
                              {m.body}
                            </p>
                          )}
                        </>
                      )}
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        mine ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}>
                        {!isDeleted && m.edited_at && <span>(изм.)</span>}
                        <span>{fmtTime(m.created_at)}</span>
                        {mine && !isDeleted && (
                          <MessageActions
                            canEdit={!!m.body && !m.image_url && !m.video_url && !m.document_url && m.location_lat === null}
                            initialText={m.body ?? ""}
                            variant={mine ? "dark" : "light"}
                            onEdit={async (next) => {
                              const { error } = await supabase
                                .from("conversation_messages")
                                .update({ body: next, edited_at: new Date().toISOString() })
                                .eq("id", m.id);
                              if (error) toast.error(error.message);
                            }}
                            onDelete={async () => {
                              const { error } = await supabase
                                .from("conversation_messages")
                                .update({ deleted_at: new Date().toISOString(), body: null, image_url: null, video_url: null, document_url: null, document_name: null, location_lat: null, location_lng: null })
                                .eq("id", m.id);
                              if (error) toast.error(error.message);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="sticky bottom-0 mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-elegant"
        >
          <AttachButton
            accept="image/*"
            disabled={!!uploading}
            uploading={uploading === "image"}
            onFile={(f) => uploadAndSend(f, "image")}
            label="Фото"
            Icon={ImageIcon}
          />
          <AttachButton
            accept="video/*"
            disabled={!!uploading}
            uploading={uploading === "video"}
            onFile={(f) => uploadAndSend(f, "video")}
            label="Видео"
            Icon={Video}
          />
          <AttachButton
            accept="*/*"
            disabled={!!uploading}
            uploading={uploading === "document"}
            onFile={(f) => uploadAndSend(f, "document")}
            label="Документ"
            Icon={Paperclip}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={shareLocation}
            disabled={sendingLocation}
            aria-label="Геолокация"
          >
            {sendingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          </Button>
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Сообщение…"
            className="h-10 flex-1 border-none bg-transparent shadow-none focus-visible:ring-0"
            maxLength={2000}
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || (!body.trim() && !uploading)}
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            aria-label="Отправить"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </main>
    </div>
  );
}

function MembersDialog({
  members,
  myId,
  createdBy,
  conversationId,
  convName,
  onChanged,
  onDeleted,
}: {
  members: ProfileLite[];
  myId: string;
  createdBy: string | null;
  conversationId: string;
  convName: string | null;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<ProfileLite[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const isCreator = createdBy === myId;
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(convName ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [transferTo, setTransferTo] = useState<ProfileLite | null>(null);
  const [kickTarget, setKickTarget] = useState<ProfileLite | null>(null);

  useEffect(() => {
    setNameDraft(convName ?? "");
  }, [convName, open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: rows } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
        .eq("status", "accepted");
      const ids = (rows ?? []).map((r) =>
        r.requester_id === myId ? r.addressee_id : r.requester_id
      );
      const existing = new Set(members.map((m) => m.id));
      const candidates = ids.filter((id) => !existing.has(id));
      if (candidates.length === 0) {
        setFriends([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, nickname, chat_display")
        .in("id", candidates);
      setFriends((profs ?? []) as ProfileLite[]);
    })();
  }, [open, myId, members]);

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

  const invite = async () => {
    if (picked.size === 0) return;
    setBusy(true);
    const rows = Array.from(picked).map((uid) => ({
      conversation_id: conversationId,
      user_id: uid,
    }));
    const { error } = await supabase.from("conversation_members").insert(rows);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Приглашения отправлены");
    setPicked(new Set());
    setQ("");
    onChanged();
  };

  const saveName = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("conversations")
      .update({ name: nameDraft.trim() || null })
      .eq("id", conversationId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Название обновлено");
    setEditingName(false);
    onChanged();
  };

  const kickMember = async () => {
    if (!kickTarget) return;
    setBusy(true);
    const { error } = await supabase
      .from("conversation_members")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", kickTarget.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Участник удалён");
    setKickTarget(null);
    onChanged();
  };

  const transferOwnership = async () => {
    if (!transferTo) return;
    setBusy(true);
    const { error } = await supabase
      .from("conversations")
      .update({ created_by: transferTo.id })
      .eq("id", conversationId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Права создателя переданы");
    setTransferTo(null);
    onChanged();
  };

  const deleteConversation = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Беседа удалена");
    setConfirmDelete(false);
    setOpen(false);
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Участники">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Беседа</DialogTitle>
          <DialogDescription>
            {isCreator
              ? "Вы создатель беседы. Вам доступны управление участниками и настройки."
              : "Список участников и приглашение друзей."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isCreator && (
            <div>
              <p className="mb-2 text-sm font-semibold">Название</p>
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Без названия"
                    maxLength={120}
                  />
                  <Button size="sm" onClick={saveName} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "OK"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingName(false);
                      setNameDraft(convName ?? "");
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                  <p className="truncate text-sm">{convName?.trim() || "Без названия"}</p>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(true)}>
                    <Pencil className="mr-1 h-3 w-3" /> Изменить
                  </Button>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold">Участники ({members.length})</p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {members.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-2 py-1.5">
                  <Avatar className="h-7 w-7">
                    {p.avatar_url ? <AvatarImage src={p.avatar_url} /> : null}
                    <AvatarFallback className="text-[10px]">{initials(displayLabel(p))}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{displayLabel(p)}</p>
                  </div>
                  {createdBy === p.id && (
                    <span className="flex items-center gap-1 text-[10px] uppercase text-amber-600 dark:text-amber-400">
                      <Crown className="h-3 w-3" /> создатель
                    </span>
                  )}
                  {p.id === myId && p.id !== createdBy && (
                    <span className="text-[10px] uppercase text-muted-foreground">вы</span>
                  )}
                  {isCreator && p.id !== myId && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Передать права создателя"
                        onClick={() => setTransferTo(p)}
                      >
                        <Crown className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Удалить из беседы"
                        onClick={() => setKickTarget(p)}
                      >
                        <UserMinus className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Пригласить друзей</p>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск среди друзей"
              className="mb-2"
            />
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {friends.length === 0 && (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  Все друзья уже в беседе или список пуст.
                </p>
              )}
              {filtered.map((f) => {
                const checked = picked.has(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggle(f.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
                      checked ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <Avatar className="h-7 w-7">
                      {f.avatar_url ? <AvatarImage src={f.avatar_url} /> : null}
                      <AvatarFallback className="text-[10px]">{initials(displayLabel(f))}</AvatarFallback>
                    </Avatar>
                    <p className="min-w-0 flex-1 truncate text-sm">{displayLabel(f)}</p>
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
            <Button
              onClick={invite}
              disabled={busy || picked.size === 0}
              className="mt-2 w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}
              Пригласить ({picked.size})
            </Button>
          </div>

          {isCreator && (
            <div className="border-t border-border pt-3">
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Удалить беседу
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={!!kickTarget} onOpenChange={(v) => !v && setKickTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить участника?</DialogTitle>
            <DialogDescription>
              {kickTarget ? displayLabel(kickTarget) : ""} больше не сможет читать и писать в этой беседе.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setKickTarget(null)} disabled={busy}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={kickMember} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserMinus className="mr-1 h-4 w-4" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transferTo} onOpenChange={(v) => !v && setTransferTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Передать права создателя?</DialogTitle>
            <DialogDescription>
              {transferTo ? displayLabel(transferTo) : ""} станет создателем беседы и получит все админские права. Вы останетесь обычным участником.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTransferTo(null)} disabled={busy}>
              Отмена
            </Button>
            <Button onClick={transferOwnership} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Crown className="mr-1 h-4 w-4" />}
              Передать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить беседу?</DialogTitle>
            <DialogDescription>
              Беседа и все сообщения будут удалены безвозвратно для всех участников.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={deleteConversation} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function AttachButton({
  accept,
  onFile,
  disabled,
  uploading,
  label,
  Icon,
}: {
  accept: string;
  onFile: (file: File) => void;
  disabled?: boolean;
  uploading?: boolean;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label
      className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
      aria-label={label}
      title={label}
    >
      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}
