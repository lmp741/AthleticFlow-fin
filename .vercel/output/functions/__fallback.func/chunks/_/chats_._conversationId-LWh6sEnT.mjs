import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useNavigate, Link } from '@tanstack/react-router';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, ArrowLeft, Users, LogOut, FileText, Download, MapPin, Image, Video, Paperclip, Send, Pencil, Crown, UserMinus, Check, UserPlus, Trash2 } from 'lucide-react';
import { h as SiteHeader } from './SiteShell-n-2GeoU1.mjs';
import { m as Route$7, u as useAuth, s as supabase, B as Button, p as displayLabel, A as Avatar, b as AvatarImage, a as AvatarFallback, D as Dialog, h as DialogTrigger, c as DialogContent, f as DialogHeader, g as DialogTitle, d as DialogDescription, e as DialogFooter } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { R as RequireAuth } from './RequireAuth-D6K_CCtb.mjs';
import { toast } from 'sonner';
import { M as MessageActions } from './MessageActions-DynuQ5sb.mjs';
import './Logo-DDLL_UOB.mjs';
import '@radix-ui/react-popover';
import '@radix-ui/react-dialog';
import 'class-variance-authority';
import '@supabase/supabase-js';
import '@radix-ui/react-avatar';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-slot';
import '@tanstack/history';
import '@tanstack/router-core/ssr/client';
import '@tanstack/router-core';
import '@tanstack/router-core/ssr/server';
import 'node:async_hooks';
import 'tiny-invariant';
import '@tanstack/react-router/ssr/server';
import './dropdown-menu-DzAqYcNu.mjs';
import '@radix-ui/react-dropdown-menu';
import './textarea-CI2Of91b.mjs';

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
function fmtDay(iso) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long"
  });
}
function ConversationPage() {
  const {
    conversationId
  } = Route$7.useParams();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const myId = user == null ? void 0 : user.id;
  const [loading, setLoading] = useState(true);
  const [convName, setConvName] = useState(null);
  const [createdBy, setCreatedBy] = useState(null);
  const [members, setMembers] = useState({});
  const [memberIds, setMemberIds] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [sendingLocation, setSendingLocation] = useState(false);
  const endRef = useRef(null);
  const loadAll = async () => {
    if (!myId) return;
    const [{
      data: conv
    }, {
      data: mems
    }] = await Promise.all([supabase.from("conversations").select("id, name, created_by").eq("id", conversationId).maybeSingle(), supabase.from("conversation_members").select("user_id").eq("conversation_id", conversationId)]);
    if (!conv) {
      setLoading(false);
      setIsMember(false);
      return;
    }
    setConvName(conv.name);
    setCreatedBy(conv.created_by);
    const ids = (mems != null ? mems : []).map((m) => m.user_id);
    setMemberIds(ids);
    setIsMember(ids.includes(myId));
    if (ids.length) {
      const {
        data: profs
      } = await supabase.from("profiles").select("id, username, display_name, avatar_url, nickname, chat_display").in("id", ids);
      const map = {};
      for (const p of profs != null ? profs : []) map[p.id] = p;
      setMembers(map);
    }
    setLoading(false);
  };
  const PAGE = 50;
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMessages = async () => {
    if (!myId) return;
    const {
      data
    } = await supabase.from("conversation_messages").select("id, conversation_id, sender_id, body, image_url, video_url, document_url, document_name, location_lat, location_lng, created_at, edited_at, deleted_at").eq("conversation_id", conversationId).order("created_at", {
      ascending: false
    }).limit(PAGE);
    const rows = (data != null ? data : []).slice().reverse();
    setMessages(rows);
    setHasMore((data != null ? data : []).length === PAGE);
  };
  const loadEarlier = async () => {
    if (!myId || messages.length === 0 || loadingMore) return;
    setLoadingMore(true);
    const oldest = messages[0].created_at;
    const {
      data
    } = await supabase.from("conversation_messages").select("id, conversation_id, sender_id, body, image_url, video_url, document_url, document_name, location_lat, location_lng, created_at, edited_at, deleted_at").eq("conversation_id", conversationId).lt("created_at", oldest).order("created_at", {
      ascending: false
    }).limit(PAGE);
    const rows = (data != null ? data : []).slice().reverse();
    setMessages((prev) => [...rows, ...prev]);
    setHasMore((data != null ? data : []).length === PAGE);
    setLoadingMore(false);
  };
  useEffect(() => {
    loadAll();
  }, [myId, conversationId]);
  useEffect(() => {
    if (!myId || !isMember) return;
    loadMessages();
    const ch = supabase.channel(`conv-${conversationId}`).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "conversation_messages",
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      const m = payload.new;
      setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
    }).on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "conversation_messages",
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      const m = payload.new;
      setMessages((prev) => prev.map((x) => x.id === m.id ? m : x));
    }).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "conversation_members",
      filter: `conversation_id=eq.${conversationId}`
    }, () => loadAll()).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId, conversationId, isMember]);
  useEffect(() => {
    var _a;
    (_a = endRef.current) == null ? void 0 : _a.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages.length]);
  const send = async (extra) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!myId) return;
    const txt = body.trim();
    const payload = {
      conversation_id: conversationId,
      sender_id: myId,
      body: (_a = extra == null ? void 0 : extra.body) != null ? _a : txt || null,
      image_url: (_b = extra == null ? void 0 : extra.image_url) != null ? _b : null,
      video_url: (_c = extra == null ? void 0 : extra.video_url) != null ? _c : null,
      document_url: (_d = extra == null ? void 0 : extra.document_url) != null ? _d : null,
      document_name: (_e = extra == null ? void 0 : extra.document_name) != null ? _e : null,
      location_lat: (_f = extra == null ? void 0 : extra.location_lat) != null ? _f : null,
      location_lng: (_g = extra == null ? void 0 : extra.location_lng) != null ? _g : null
    };
    if (!payload.body && !payload.image_url && !payload.video_url && !payload.document_url && payload.location_lat === null) {
      return;
    }
    setSending(true);
    const {
      error
    } = await supabase.from("conversation_messages").insert(payload);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!extra) setBody("");
  };
  const uploadAndSend = async (file, kind) => {
    var _a, _b;
    if (!myId) return;
    const limits = {
      image: 8,
      video: 50,
      document: 20
    };
    const maxMb = limits[kind];
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 ${maxMb} \u041C\u0411`);
      return;
    }
    setUploading(kind);
    const ext = (_b = (_a = file.name.split(".").pop()) == null ? void 0 : _a.toLowerCase()) != null ? _b : "bin";
    const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
    const path = `${myId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe || `file.${ext}`}`;
    const {
      error: upErr
    } = await supabase.storage.from("dm-media").upload(path, file, {
      upsert: false,
      contentType: file.type
    });
    if (upErr) {
      setUploading(null);
      toast.error(upErr.message);
      return;
    }
    const {
      data: pub
    } = supabase.storage.from("dm-media").getPublicUrl(path);
    await send({
      image_url: kind === "image" ? pub.publicUrl : null,
      video_url: kind === "video" ? pub.publicUrl : null,
      document_url: kind === "document" ? pub.publicUrl : null,
      document_name: kind === "document" ? file.name : null
    });
    setUploading(null);
  };
  const shareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("\u0413\u0435\u043E\u043B\u043E\u043A\u0430\u0446\u0438\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
      return;
    }
    setSendingLocation(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await send({
        location_lat: pos.coords.latitude,
        location_lng: pos.coords.longitude
      });
      setSendingLocation(false);
    }, (err) => {
      setSendingLocation(false);
      toast.error(err.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B");
    }, {
      enableHighAccuracy: true,
      timeout: 8e3
    });
  };
  const leave = async () => {
    if (!myId) return;
    const {
      error
    } = await supabase.from("conversation_members").delete().eq("conversation_id", conversationId).eq("user_id", myId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u0412\u044B \u043F\u043E\u043A\u0438\u043D\u0443\u043B\u0438 \u0431\u0435\u0441\u0435\u0434\u0443");
    navigate({
      to: "/chats"
    });
  };
  const grouped = useMemo(() => {
    const out = [];
    for (const m of messages) {
      const day = fmtDay(m.created_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({
        day,
        items: [m]
      });
    }
    return out;
  }, [messages]);
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsx("div", { className: "container mx-auto p-12 text-center", children: /* @__PURE__ */ jsx(Loader2, { className: "mx-auto h-6 w-6 animate-spin text-muted-foreground" }) })
    ] });
  }
  if (!isMember) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsxs("div", { className: "container mx-auto px-4 sm:px-6 py-16 text-center", children: [
        /* @__PURE__ */ jsx("h1", { className: "font-display text-2xl font-bold", children: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-muted-foreground", children: "\u042D\u0442\u0430 \u0431\u0435\u0441\u0435\u0434\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0432\u044B \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0435\u0451 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A." }),
        /* @__PURE__ */ jsx(Button, { asChild: true, className: "mt-4", children: /* @__PURE__ */ jsx(Link, { to: "/chats", children: "\u041A \u0431\u0435\u0441\u0435\u0434\u0430\u043C" }) })
      ] })
    ] });
  }
  const title = (convName == null ? void 0 : convName.trim()) || memberIds.filter((id) => id !== myId).slice(0, 3).map((id) => members[id] ? displayLabel(members[id]) : "\u0418\u0433\u0440\u043E\u043A").join(", ") || "\u0411\u0435\u0441\u0435\u0434\u0430";
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsx("header", { className: "sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-xl", children: /* @__PURE__ */ jsxs("div", { className: "container mx-auto flex items-center gap-3 px-6 py-3", children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => navigate({
        to: "/chats"
      }), children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground", children: /* @__PURE__ */ jsx(Users, { className: "h-5 w-5" }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-semibold", children: title }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
          "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432: ",
          memberIds.length
        ] })
      ] }),
      /* @__PURE__ */ jsx(MembersDialog, { members: memberIds.map((id) => members[id]).filter(Boolean), myId, createdBy, conversationId, convName, onChanged: loadAll, onDeleted: () => navigate({
        to: "/chats"
      }) }),
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: leave, title: "\u041F\u043E\u043A\u0438\u043D\u0443\u0442\u044C", children: /* @__PURE__ */ jsx(LogOut, { className: "h-4 w-4" }) })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "container mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-4", children: [
        hasMore && /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: loadEarlier, disabled: loadingMore, children: [
          loadingMore ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-3 w-3 animate-spin" }) : null,
          "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0440\u0430\u043D\u0435\u0435"
        ] }) }),
        grouped.length === 0 && /* @__PURE__ */ jsx("p", { className: "mt-12 text-center text-sm text-muted-foreground", children: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043F\u0435\u0440\u0432\u043E\u0435!" }),
        grouped.map((g) => /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("div", { className: "my-2 flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "rounded-full bg-muted px-3 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground", children: g.day }) }),
          g.items.map((m) => {
            var _a, _b, _c;
            const mine = m.sender_id === myId;
            const author = members[m.sender_id];
            const authorName = author ? displayLabel(author) : "\u0418\u0433\u0440\u043E\u043A";
            const isDeleted = !!m.deleted_at;
            return /* @__PURE__ */ jsxs("div", { className: `group flex ${mine ? "justify-end" : "justify-start"} gap-2`, children: [
              !mine && /* @__PURE__ */ jsxs(Avatar, { className: "mt-auto h-7 w-7", children: [
                (author == null ? void 0 : author.avatar_url) ? /* @__PURE__ */ jsx(AvatarImage, { src: author.avatar_url }) : null,
                /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[10px]", children: initials(authorName) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: `relative max-w-[80%] rounded-2xl px-3 py-2 shadow-card ${mine ? "bg-gradient-brand text-primary-foreground" : "bg-card text-foreground border border-border"} ${isDeleted ? "italic opacity-70" : ""}`, children: [
                !mine && /* @__PURE__ */ jsx("p", { className: "mb-0.5 text-[11px] font-semibold text-muted-foreground", children: authorName }),
                isDeleted ? /* @__PURE__ */ jsx("p", { className: "text-sm", children: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                  m.image_url && /* @__PURE__ */ jsx("a", { href: m.image_url, target: "_blank", rel: "noopener noreferrer", className: "block", children: /* @__PURE__ */ jsx("img", { src: m.image_url, alt: "image", className: "mb-1 max-h-80 rounded-xl object-cover" }) }),
                  m.video_url && /* @__PURE__ */ jsx("video", { src: m.video_url, controls: true, className: "mb-1 max-h-80 rounded-xl" }),
                  m.document_url && /* @__PURE__ */ jsxs("a", { href: m.document_url, target: "_blank", rel: "noopener noreferrer", download: (_a = m.document_name) != null ? _a : void 0, className: `mb-1 flex items-center gap-2 rounded-xl px-3 py-2 ${mine ? "bg-white/15" : "bg-muted"}`, children: [
                    /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 shrink-0" }),
                    /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1 truncate text-sm", children: (_b = m.document_name) != null ? _b : "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442" }),
                    /* @__PURE__ */ jsx(Download, { className: "h-4 w-4 shrink-0 opacity-70" })
                  ] }),
                  m.location_lat !== null && m.location_lng !== null && /* @__PURE__ */ jsxs("a", { href: `https://www.google.com/maps?q=${m.location_lat},${m.location_lng}`, target: "_blank", rel: "noopener noreferrer", className: `mb-1 flex items-center gap-2 rounded-xl px-3 py-2 ${mine ? "bg-white/15" : "bg-muted"}`, children: [
                    /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4 shrink-0" }),
                    /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
                      "\u0413\u0435\u043E\u043B\u043E\u043A\u0430\u0446\u0438\u044F \xB7 ",
                      m.location_lat.toFixed(5),
                      ", ",
                      m.location_lng.toFixed(5)
                    ] })
                  ] }),
                  m.body && /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-sm", style: {
                    overflowWrap: "anywhere",
                    wordBreak: "break-word"
                  }, children: m.body })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: `mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`, children: [
                  !isDeleted && m.edited_at && /* @__PURE__ */ jsx("span", { children: "(\u0438\u0437\u043C.)" }),
                  /* @__PURE__ */ jsx("span", { children: fmtTime(m.created_at) }),
                  mine && !isDeleted && /* @__PURE__ */ jsx(MessageActions, { canEdit: !!m.body && !m.image_url && !m.video_url && !m.document_url && m.location_lat === null, initialText: (_c = m.body) != null ? _c : "", variant: mine ? "dark" : "light", onEdit: async (next) => {
                    const {
                      error
                    } = await supabase.from("conversation_messages").update({
                      body: next,
                      edited_at: (/* @__PURE__ */ new Date()).toISOString()
                    }).eq("id", m.id);
                    if (error) toast.error(error.message);
                  }, onDelete: async () => {
                    const {
                      error
                    } = await supabase.from("conversation_messages").update({
                      deleted_at: (/* @__PURE__ */ new Date()).toISOString(),
                      body: null,
                      image_url: null,
                      video_url: null,
                      document_url: null,
                      document_name: null,
                      location_lat: null,
                      location_lng: null
                    }).eq("id", m.id);
                    if (error) toast.error(error.message);
                  } })
                ] })
              ] })
            ] }, m.id);
          })
        ] }, g.day)),
        /* @__PURE__ */ jsx("div", { ref: endRef })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: (e) => {
        e.preventDefault();
        send();
      }, className: "sticky bottom-0 mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-elegant", children: [
        /* @__PURE__ */ jsx(AttachButton, { accept: "image/*", disabled: !!uploading, uploading: uploading === "image", onFile: (f) => uploadAndSend(f, "image"), label: "\u0424\u043E\u0442\u043E", Icon: Image }),
        /* @__PURE__ */ jsx(AttachButton, { accept: "video/*", disabled: !!uploading, uploading: uploading === "video", onFile: (f) => uploadAndSend(f, "video"), label: "\u0412\u0438\u0434\u0435\u043E", Icon: Video }),
        /* @__PURE__ */ jsx(AttachButton, { accept: "*/*", disabled: !!uploading, uploading: uploading === "document", onFile: (f) => uploadAndSend(f, "document"), label: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442", Icon: Paperclip }),
        /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "icon", onClick: shareLocation, disabled: sendingLocation, "aria-label": "\u0413\u0435\u043E\u043B\u043E\u043A\u0430\u0446\u0438\u044F", children: sendingLocation ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsx(Input, { value: body, onChange: (e) => setBody(e.target.value), placeholder: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u2026", className: "h-10 flex-1 border-none bg-transparent shadow-none focus-visible:ring-0", maxLength: 2e3 }),
        /* @__PURE__ */ jsx(Button, { type: "submit", size: "icon", disabled: sending || !body.trim() && !uploading, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", "aria-label": "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C", children: sending ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Send, { className: "h-4 w-4" }) })
      ] })
    ] })
  ] });
}
function MembersDialog({
  members,
  myId,
  createdBy,
  conversationId,
  convName,
  onChanged,
  onDeleted
}) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [picked, setPicked] = useState(/* @__PURE__ */ new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const isCreator = createdBy === myId;
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(convName != null ? convName : "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [transferTo, setTransferTo] = useState(null);
  const [kickTarget, setKickTarget] = useState(null);
  useEffect(() => {
    setNameDraft(convName != null ? convName : "");
  }, [convName, open]);
  useEffect(() => {
    if (!open) return;
    (async () => {
      const {
        data: rows
      } = await supabase.from("friendships").select("requester_id, addressee_id, status").or(`requester_id.eq.${myId},addressee_id.eq.${myId}`).eq("status", "accepted");
      const ids = (rows != null ? rows : []).map((r) => r.requester_id === myId ? r.addressee_id : r.requester_id);
      const existing = new Set(members.map((m) => m.id));
      const candidates = ids.filter((id) => !existing.has(id));
      if (candidates.length === 0) {
        setFriends([]);
        return;
      }
      const {
        data: profs
      } = await supabase.from("profiles").select("id, username, display_name, avatar_url, nickname, chat_display").in("id", candidates);
      setFriends(profs != null ? profs : []);
    })();
  }, [open, myId, members]);
  const filtered = friends.filter((f) => {
    var _a, _b, _c;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return ((_a = f.display_name) != null ? _a : "").toLowerCase().includes(s) || ((_b = f.nickname) != null ? _b : "").toLowerCase().includes(s) || ((_c = f.username) != null ? _c : "").toLowerCase().includes(s);
  });
  const toggle = (id) => {
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
      user_id: uid
    }));
    const {
      error
    } = await supabase.from("conversation_members").insert(rows);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u044B");
    setPicked(/* @__PURE__ */ new Set());
    setQ("");
    onChanged();
  };
  const saveName = async () => {
    setBusy(true);
    const {
      error
    } = await supabase.from("conversations").update({
      name: nameDraft.trim() || null
    }).eq("id", conversationId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
    setEditingName(false);
    onChanged();
  };
  const kickMember = async () => {
    if (!kickTarget) return;
    setBusy(true);
    const {
      error
    } = await supabase.from("conversation_members").delete().eq("conversation_id", conversationId).eq("user_id", kickTarget.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A \u0443\u0434\u0430\u043B\u0451\u043D");
    setKickTarget(null);
    onChanged();
  };
  const transferOwnership = async () => {
    if (!transferTo) return;
    setBusy(true);
    const {
      error
    } = await supabase.from("conversations").update({
      created_by: transferTo.id
    }).eq("id", conversationId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u041F\u0440\u0430\u0432\u0430 \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044F \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u044B");
    setTransferTo(null);
    onChanged();
  };
  const deleteConversation = async () => {
    setBusy(true);
    const {
      error
    } = await supabase.from("conversations").delete().eq("id", conversationId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u0411\u0435\u0441\u0435\u0434\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0430");
    setConfirmDelete(false);
    setOpen(false);
    onDeleted();
  };
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", title: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438", children: /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" }) }) }),
    /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "\u0411\u0435\u0441\u0435\u0434\u0430" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: isCreator ? "\u0412\u044B \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044C \u0431\u0435\u0441\u0435\u0434\u044B. \u0412\u0430\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430\u043C\u0438 \u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438." : "\u0421\u043F\u0438\u0441\u043E\u043A \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u0438 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u0434\u0440\u0443\u0437\u0435\u0439." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        isCreator && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "mb-2 text-sm font-semibold", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }),
          editingName ? /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(Input, { value: nameDraft, onChange: (e) => setNameDraft(e.target.value), placeholder: "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F", maxLength: 120 }),
            /* @__PURE__ */ jsx(Button, { size: "sm", onClick: saveName, disabled: busy, children: busy ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "OK" }),
            /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => {
              setEditingName(false);
              setNameDraft(convName != null ? convName : "");
            }, children: "\u041E\u0442\u043C\u0435\u043D\u0430" })
          ] }) : /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2", children: [
            /* @__PURE__ */ jsx("p", { className: "truncate text-sm", children: (convName == null ? void 0 : convName.trim()) || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F" }),
            /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "ghost", onClick: () => setEditingName(true), children: [
              /* @__PURE__ */ jsx(Pencil, { className: "mr-1 h-3 w-3" }),
              " \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("p", { className: "mb-2 text-sm font-semibold", children: [
            "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 (",
            members.length,
            ")"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2", children: members.map((p) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-2 py-1.5", children: [
            /* @__PURE__ */ jsxs(Avatar, { className: "h-7 w-7", children: [
              p.avatar_url ? /* @__PURE__ */ jsx(AvatarImage, { src: p.avatar_url }) : null,
              /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[10px]", children: initials(displayLabel(p)) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsx("p", { className: "truncate text-sm", children: displayLabel(p) }) }),
            createdBy === p.id && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 text-[10px] uppercase text-amber-600 dark:text-amber-400", children: [
              /* @__PURE__ */ jsx(Crown, { className: "h-3 w-3" }),
              " \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044C"
            ] }),
            p.id === myId && p.id !== createdBy && /* @__PURE__ */ jsx("span", { className: "text-[10px] uppercase text-muted-foreground", children: "\u0432\u044B" }),
            isCreator && p.id !== myId && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", title: "\u041F\u0435\u0440\u0435\u0434\u0430\u0442\u044C \u043F\u0440\u0430\u0432\u0430 \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044F", onClick: () => setTransferTo(p), children: /* @__PURE__ */ jsx(Crown, { className: "h-3 w-3" }) }),
              /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u0431\u0435\u0441\u0435\u0434\u044B", onClick: () => setKickTarget(p), children: /* @__PURE__ */ jsx(UserMinus, { className: "h-3 w-3 text-destructive" }) })
            ] })
          ] }, p.id)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "mb-2 text-sm font-semibold", children: "\u041F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u044C \u0434\u0440\u0443\u0437\u0435\u0439" }),
          /* @__PURE__ */ jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A \u0441\u0440\u0435\u0434\u0438 \u0434\u0440\u0443\u0437\u0435\u0439", className: "mb-2" }),
          /* @__PURE__ */ jsxs("div", { className: "max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2", children: [
            friends.length === 0 && /* @__PURE__ */ jsx("p", { className: "p-3 text-center text-xs text-muted-foreground", children: "\u0412\u0441\u0435 \u0434\u0440\u0443\u0437\u044C\u044F \u0443\u0436\u0435 \u0432 \u0431\u0435\u0441\u0435\u0434\u0435 \u0438\u043B\u0438 \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0441\u0442." }),
            filtered.map((f) => {
              const checked = picked.has(f.id);
              return /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => toggle(f.id), className: `flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${checked ? "bg-primary/10" : "hover:bg-muted/50"}`, children: [
                /* @__PURE__ */ jsxs(Avatar, { className: "h-7 w-7", children: [
                  f.avatar_url ? /* @__PURE__ */ jsx(AvatarImage, { src: f.avatar_url }) : null,
                  /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[10px]", children: initials(displayLabel(f)) })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "min-w-0 flex-1 truncate text-sm", children: displayLabel(f) }),
                /* @__PURE__ */ jsx("span", { className: `flex h-5 w-5 items-center justify-center rounded-full border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`, children: checked ? /* @__PURE__ */ jsx(Check, { className: "h-3 w-3" }) : null })
              ] }, f.id);
            })
          ] }),
          /* @__PURE__ */ jsxs(Button, { onClick: invite, disabled: busy || picked.size === 0, className: "mt-2 w-full bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
            busy ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(UserPlus, { className: "mr-1 h-4 w-4" }),
            "\u041F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u044C (",
            picked.size,
            ")"
          ] })
        ] }),
        isCreator && /* @__PURE__ */ jsx("div", { className: "border-t border-border pt-3", children: /* @__PURE__ */ jsxs(Button, { variant: "outline", className: "w-full text-destructive hover:text-destructive", onClick: () => setConfirmDelete(true), children: [
          /* @__PURE__ */ jsx(Trash2, { className: "mr-2 h-4 w-4" }),
          " \u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0431\u0435\u0441\u0435\u0434\u0443"
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => setOpen(false), disabled: busy, children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: !!kickTarget, onOpenChange: (v) => !v && setKickTarget(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430?" }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          kickTarget ? displayLabel(kickTarget) : "",
          " \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u0447\u0438\u0442\u0430\u0442\u044C \u0438 \u043F\u0438\u0441\u0430\u0442\u044C \u0432 \u044D\u0442\u043E\u0439 \u0431\u0435\u0441\u0435\u0434\u0435."
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => setKickTarget(null), disabled: busy, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsxs(Button, { variant: "destructive", onClick: kickMember, disabled: busy, children: [
          busy ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(UserMinus, { className: "mr-1 h-4 w-4" }),
          "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: !!transferTo, onOpenChange: (v) => !v && setTransferTo(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "\u041F\u0435\u0440\u0435\u0434\u0430\u0442\u044C \u043F\u0440\u0430\u0432\u0430 \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044F?" }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          transferTo ? displayLabel(transferTo) : "",
          " \u0441\u0442\u0430\u043D\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u0435\u043C \u0431\u0435\u0441\u0435\u0434\u044B \u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u0442 \u0432\u0441\u0435 \u0430\u0434\u043C\u0438\u043D\u0441\u043A\u0438\u0435 \u043F\u0440\u0430\u0432\u0430. \u0412\u044B \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0435\u0441\u044C \u043E\u0431\u044B\u0447\u043D\u044B\u043C \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u043C."
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => setTransferTo(null), disabled: busy, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsxs(Button, { onClick: transferOwnership, disabled: busy, children: [
          busy ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Crown, { className: "mr-1 h-4 w-4" }),
          "\u041F\u0435\u0440\u0435\u0434\u0430\u0442\u044C"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: confirmDelete, onOpenChange: setConfirmDelete, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0431\u0435\u0441\u0435\u0434\u0443?" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "\u0411\u0435\u0441\u0435\u0434\u0430 \u0438 \u0432\u0441\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u044B \u0431\u0435\u0437\u0432\u043E\u0437\u0432\u0440\u0430\u0442\u043D\u043E \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432." })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => setConfirmDelete(false), disabled: busy, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsxs(Button, { variant: "destructive", onClick: deleteConversation, disabled: busy, children: [
          busy ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Trash2, { className: "mr-1 h-4 w-4" }),
          "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"
        ] })
      ] })
    ] }) })
  ] });
}
function AttachButton({
  accept,
  onFile,
  disabled,
  uploading,
  label,
  Icon
}) {
  return /* @__PURE__ */ jsxs("label", { className: `inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground ${disabled ? "pointer-events-none opacity-50" : ""}`, "aria-label": label, title: label, children: [
    uploading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4" }),
    /* @__PURE__ */ jsx("input", { type: "file", accept, className: "hidden", disabled, onChange: (e) => {
      var _a;
      const f = (_a = e.target.files) == null ? void 0 : _a[0];
      if (f) onFile(f);
      e.currentTarget.value = "";
    } })
  ] });
}
const SplitComponent = () => /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(ConversationPage, {}) });

export { SplitComponent as component };
//# sourceMappingURL=chats_._conversationId-LWh6sEnT.mjs.map
