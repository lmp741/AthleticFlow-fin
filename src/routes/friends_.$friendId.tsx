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
  X,
  Phone,
  Video as VideoCallIcon,
} from "lucide-react";
import { useCall } from "@/components/calls/CallProvider";
import {
  PrivateChatImage,
  PrivateChatVideo,
  PrivateChatDocument,
} from "@/components/media/PrivateMedia";
import { SiteHeader } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImage } from "@/lib/image";
import { uploadToBucket } from "@/lib/upload";
import { Textarea } from "@/components/ui/textarea";

function wrapToWidth(s: string, width = 54): string {
  const paragraphs = s.split("\n");
  const out: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= width) { out.push(p); continue; }
    let rest = p;
    while (rest.length > width) {
      let idx = rest.lastIndexOf(" ", width);
      if (idx <= 0) idx = width;
      out.push(rest.slice(0, idx));
      rest = rest.slice(idx).replace(/^ +/, "");
    }
    out.push(rest);
  }
  return out.join("\n");
}
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { toast } from "sonner";
import { MessageActions } from "@/components/chat/MessageActions";

export const Route = createFileRoute("/friends_/$friendId")({
  head: () => ({ meta: [{ title: "Чат — Athletic Flow" }] }),
  component: () => (
    <RequireAuth>
      <ChatPage />
    </RequireAuth>
  ),
});

interface ProfileLite {
  id: string;
  username: string | null;
  display_name: string | null;
  nickname?: string | null;
  chat_display?: string | null;
  avatar_url: string | null;
}

interface DM {
  id: string;
  sender_id: string;
  recipient_id: string;
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

function ChatPage() {
  const { friendId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startCall } = useCall();
  const [friend, setFriend] = useState<ProfileLite | null>(null);
  const [areFriends, setAreFriends] = useState(false);
  // Состояние заявки в друзья — нужно чтобы на экране «вы пока не друзья»
  // показать правильную кнопку (отправить / ждать / принять).
  const [friendship, setFriendship] = useState<{
    id: string;
    status: string;
    requester_id: string;
    addressee_id: string;
  } | null>(null);
  const [friendActionBusy, setFriendActionBusy] = useState(false);
  // Связь менеджер↔организатор: DM разрешён и без дружбы (RLS-политика
  // "friends or manager relation send dm" + RPC can_dm_with).
  const [managerRelation, setManagerRelation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<DM[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState<null | "image" | "video" | "document">(null);
  const [sendingLocation, setSendingLocation] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const myId = user?.id;

  useEffect(() => {
    if (!myId) return;
    (async () => {
      const [{ data: prof }, { data: fr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, nickname, chat_display")
          .eq("id", friendId)
          .maybeSingle(),
        supabase
          .from("friendships")
          .select("id, status, requester_id, addressee_id")
          .or(
            `and(requester_id.eq.${myId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${myId})`
          )
          .maybeSingle(),
      ]);
      setFriend(prof as ProfileLite | null);
      const accepted = !!fr && fr.status === "accepted";
      setAreFriends(accepted);
      setFriendship((fr as typeof friendship) ?? null);
      if (!accepted) {
        // Не друзья — возможно, это пара менеджер↔организатор.
        const { data: rel } = await supabase.rpc("can_dm_with", { p_other: friendId });
        setManagerRelation(!!rel);
      }
      setLoading(false);
    })();
  }, [myId, friendId]);

  // Обработчики для экрана «вы пока не друзья» — без редиректа в /friends.
  const sendFriendRequest = async () => {
    if (!myId) return;
    setFriendActionBusy(true);
    const { data, error } = await supabase
      .from("friendships")
      .insert({ requester_id: myId, addressee_id: friendId, status: "pending" })
      .select("id, status, requester_id, addressee_id")
      .single();
    setFriendActionBusy(false);
    if (error) {
      if (error.code === "23505") toast.error("Заявка уже отправлена");
      else toast.error(error.message);
      return;
    }
    if (data) setFriendship(data as typeof friendship);
    toast.success("Заявка отправлена");
  };
  const acceptFriendRequest = async () => {
    if (!friendship) return;
    setFriendActionBusy(true);
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendship.id);
    setFriendActionBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setFriendship({ ...friendship, status: "accepted" });
    setAreFriends(true);
    toast.success("Заявка принята — теперь можно переписываться");
  };

  const PAGE = 50;
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMessages = async () => {
    if (!myId) return;
    const { data } = await supabase
      .from("direct_messages")
      .select(
        "id, sender_id, recipient_id, body, image_url, video_url, document_url, document_name, location_lat, location_lng, created_at, edited_at, deleted_at"
      )
      .or(
        `and(sender_id.eq.${myId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${myId})`
      )
      .order("created_at", { ascending: false })
      .limit(PAGE);
    const rows = ((data ?? []) as DM[]).slice().reverse();
    setMessages(rows);
    setHasMore((data ?? []).length === PAGE);
  };

  const loadEarlier = async () => {
    if (!myId || messages.length === 0 || loadingMore) return;
    setLoadingMore(true);
    const oldest = messages[0].created_at;
    const { data } = await supabase
      .from("direct_messages")
      .select(
        "id, sender_id, recipient_id, body, image_url, video_url, document_url, document_name, location_lat, location_lng, created_at, edited_at, deleted_at"
      )
      .or(
        `and(sender_id.eq.${myId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${myId})`
      )
      .lt("created_at", oldest)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    const rows = ((data ?? []) as DM[]).slice().reverse();
    setMessages((prev) => [...rows, ...prev]);
    setHasMore((data ?? []).length === PAGE);
    setLoadingMore(false);
  };

  useEffect(() => {
    // БАГ-ФИКС: раньше гейт был только по areFriends — для пары
    // менеджер↔организатор (managerRelation) сообщения не грузились вообще
    // и realtime не подписывался: написать можно, увидеть нельзя.
    if (!myId || (!areFriends && !managerRelation)) return;
    loadMessages();
    // Отмечаем входящие прочитанными — иначе счётчик непрочитанных
    // в /manager/chats не сбрасывается никогда.
    void supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", myId)
      .eq("sender_id", friendId)
      .is("read_at", null);
    const onInsert = (payload: { new: DM }) => {
      const m = payload.new;
      const involves =
        (m.sender_id === myId && m.recipient_id === friendId) ||
        (m.sender_id === friendId && m.recipient_id === myId);
      if (involves) setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    };
    const onUpdate = (payload: { new: DM }) => {
      const m = payload.new;
      setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
    };
    const ch = supabase
      .channel(`dm-${myId}-${friendId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `sender_id=eq.${myId}` }, onInsert)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `sender_id=eq.${friendId}` }, onInsert)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages", filter: `sender_id=eq.${myId}` }, onUpdate)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages", filter: `sender_id=eq.${friendId}` }, onUpdate)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, friendId, areFriends, managerRelation]);


  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (extra?: Partial<DM>) => {
    if (!myId) return;
    const txt = body.trim();
    const payload = {
      sender_id: myId,
      recipient_id: friendId,
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
    // .select() возвращает вставленную строку — добавляем её в state сразу,
    // не дожидаясь broadcast от realtime. Это закрывает баг «не вижу пока не обновлю»,
    // даже если realtime-канал отвалился из-за гонки при пересоздании.
    const { data: inserted, error } = await supabase
      .from("direct_messages")
      .insert(payload)
      .select()
      .single();
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (inserted) {
      const newRow = inserted as DM;
      setMessages((prev) => (prev.some((x) => x.id === newRow.id) ? prev : [...prev, newRow]));
    }
    if (!extra) setBody("");
  };

  const uploadAndSend = async (file: File, kind: "image" | "video" | "document") => {
    if (!myId) return;
    // Видео не сжимаем в браузере, document любого типа — тоже. Фото пропускаем
    // через compressImage, поэтому принимаем оригинал крупнее (resize выровняет).
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
        /* загружаем оригинал, если сжатие сломалось */
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

  const grouped = useMemo(() => {
    const out: { day: string; items: DM[] }[] = [];
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

  if (!friend) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto p-12 text-center">
          <p className="text-muted-foreground">Пользователь не найден</p>
          <Button asChild className="mt-4"><Link to="/friends">К друзьям</Link></Button>
        </div>
      </div>
    );
  }

  if (!areFriends && !managerRelation) {
    // 3 состояния: нет заявки / отправил я (жду) / отправил он (могу принять).
    const haveOutgoing =
      friendship && friendship.status === "pending" && friendship.requester_id === myId;
    const haveIncoming =
      friendship && friendship.status === "pending" && friendship.addressee_id === myId;
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 sm:px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Вы пока не друзья</h1>
          <p className="mt-2 text-muted-foreground">
            Чтобы начать переписку, нужно быть в друзьях.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {!friendship && (
              <Button
                onClick={sendFriendRequest}
                disabled={friendActionBusy}
                className="bg-gradient-brand text-primary-foreground hover:opacity-90"
              >
                {friendActionBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Добавить в друзья
              </Button>
            )}
            {haveOutgoing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground">
                Заявка отправлена · ждём ответа
              </span>
            )}
            {haveIncoming && (
              <Button
                onClick={acceptFriendRequest}
                disabled={friendActionBusy}
                className="bg-gradient-brand text-primary-foreground hover:opacity-90"
              >
                {friendActionBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Принять заявку
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/friends">Все мои друзья</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const pref = friend.chat_display === "nickname" ? "nickname" : "name";
  const name = (pref === "nickname"
    ? (friend.nickname?.trim() || friend.display_name?.trim())
    : (friend.display_name?.trim() || friend.nickname?.trim()))
    || (friend.username ? `@${friend.username}` : "Игрок");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <header className="sticky-sub-header z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto flex items-center gap-3 px-6 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/friends" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10">
            {friend.avatar_url ? <AvatarImage src={friend.avatar_url} /> : null}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {friend.username ? (
              <Link
                to="/u/$username"
                params={{ username: friend.username }}
                className="truncate text-sm font-semibold hover:underline"
              >
                {name}
              </Link>
            ) : (
              <span className="truncate text-sm font-semibold">{name}</span>
            )}
            <p className="text-xs text-muted-foreground">
              {friend.username ? `@${friend.username}` : "Личный чат"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Аудиозвонок"
              onClick={() => startCall({ id: friend.id, name, avatarUrl: friend.avatar_url }, "audio")}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Видеозвонок"
              onClick={() => startCall({ id: friend.id, name, avatarUrl: friend.avatar_url }, "video")}
            >
              <VideoCallIcon className="h-4 w-4" />
            </Button>
          </div>
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
              Поздоровайся первым — отправь сообщение или фото.
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
                const isDeleted = !!m.deleted_at;
                return (
                  <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-3 py-2 shadow-card ${
                        mine
                          ? "bg-gradient-brand text-primary-foreground"
                          : "bg-card text-foreground border border-border"
                      } ${isDeleted ? "italic opacity-70" : ""}`}
                    >
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
                            <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                          )}
                        </>
                      )}
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                        mine ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}>
                        {!isDeleted && m.edited_at && <span>(изм.)</span>}
                        <span>{fmtTime(m.created_at)}</span>
                        {!isDeleted && (
                          <MessageActions
                            canEdit={mine && !!m.body && !m.image_url && !m.video_url && !m.document_url && m.location_lat === null}
                            initialText={m.body ?? ""}
                            variant={mine ? "dark" : "light"}
                            onEdit={async (next) => {
                              const { error } = await supabase
                                .from("direct_messages")
                                .update({ body: next, edited_at: new Date().toISOString() })
                                .eq("id", m.id);
                              if (error) toast.error(error.message);
                            }}
                            onDelete={async () => {
                              const { error } = await supabase
                                .from("direct_messages")
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
            kind="image"
            accept="image/*"
            disabled={!!uploading}
            uploading={uploading === "image"}
            onFile={(f) => uploadAndSend(f, "image")}
            label="Фото"
            Icon={ImageIcon}
          />
          <AttachButton
            kind="video"
            accept="video/*"
            disabled={!!uploading}
            uploading={uploading === "video"}
            onFile={(f) => uploadAndSend(f, "video")}
            label="Видео"
            Icon={Video}
          />
          <AttachButton
            kind="document"
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
          <Textarea
            value={body}
            onChange={(e) => setBody(wrapToWidth(e.target.value, 54))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
              }
            }}
            placeholder="Сообщение…"
            rows={Math.min(3, Math.max(1, body.split("\n").length))}
            className="min-h-10 max-h-[4.75rem] flex-1 resize-none border-none bg-transparent py-2 shadow-none focus-visible:ring-0"
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

function AttachButton({
  kind,
  accept,
  onFile,
  disabled,
  uploading,
  label,
  Icon,
}: {
  kind: "image" | "video" | "document";
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
