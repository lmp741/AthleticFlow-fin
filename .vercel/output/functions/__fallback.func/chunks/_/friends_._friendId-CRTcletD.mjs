import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useNavigate, Link } from '@tanstack/react-router';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, ArrowLeft, Phone, Video, FileText, Download, MapPin, Image, Paperclip, Send } from 'lucide-react';
import { l as Route$8, u as useAuth, q as useCall, s as supabase, B as Button, A as Avatar, b as AvatarImage, a as AvatarFallback } from './ssr.mjs';
import { h as SiteHeader } from './SiteShell-n-2GeoU1.mjs';
import { T as Textarea } from './textarea-CI2Of91b.mjs';
import { R as RequireAuth } from './RequireAuth-D6K_CCtb.mjs';
import { toast } from 'sonner';
import { M as MessageActions } from './MessageActions-DynuQ5sb.mjs';
import '@supabase/supabase-js';
import '@radix-ui/react-avatar';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import '@radix-ui/react-dialog';
import '@tanstack/history';
import '@tanstack/router-core/ssr/client';
import '@tanstack/router-core';
import '@tanstack/router-core/ssr/server';
import 'node:async_hooks';
import 'tiny-invariant';
import '@tanstack/react-router/ssr/server';
import './input-Dzp1k4d4.mjs';
import './Logo-DDLL_UOB.mjs';
import '@radix-ui/react-popover';
import './dropdown-menu-DzAqYcNu.mjs';
import '@radix-ui/react-dropdown-menu';

function wrapToWidth(s, width = 54) {
  const paragraphs = s.split("\n");
  const out = [];
  for (const p of paragraphs) {
    if (p.length <= width) {
      out.push(p);
      continue;
    }
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
function ChatPage() {
  var _a, _b, _c, _d;
  const {
    friendId
  } = Route$8.useParams();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    startCall
  } = useCall();
  const [friend, setFriend] = useState(null);
  const [areFriends, setAreFriends] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [sendingLocation, setSendingLocation] = useState(false);
  const endRef = useRef(null);
  const myId = user == null ? void 0 : user.id;
  useEffect(() => {
    if (!myId) return;
    (async () => {
      const [{
        data: prof
      }, {
        data: fr
      }] = await Promise.all([supabase.from("profiles").select("id, username, display_name, avatar_url, nickname, chat_display").eq("id", friendId).maybeSingle(), supabase.from("friendships").select("id, status, requester_id, addressee_id").or(`and(requester_id.eq.${myId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${myId})`).maybeSingle()]);
      setFriend(prof);
      setAreFriends(!!fr && fr.status === "accepted");
      setLoading(false);
    })();
  }, [myId, friendId]);
  const PAGE = 50;
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMessages = async () => {
    if (!myId) return;
    const {
      data
    } = await supabase.from("direct_messages").select("id, sender_id, recipient_id, body, image_url, video_url, document_url, document_name, location_lat, location_lng, created_at, edited_at, deleted_at").or(`and(sender_id.eq.${myId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${myId})`).order("created_at", {
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
    } = await supabase.from("direct_messages").select("id, sender_id, recipient_id, body, image_url, video_url, document_url, document_name, location_lat, location_lng, created_at, edited_at, deleted_at").or(`and(sender_id.eq.${myId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${myId})`).lt("created_at", oldest).order("created_at", {
      ascending: false
    }).limit(PAGE);
    const rows = (data != null ? data : []).slice().reverse();
    setMessages((prev) => [...rows, ...prev]);
    setHasMore((data != null ? data : []).length === PAGE);
    setLoadingMore(false);
  };
  useEffect(() => {
    if (!myId || !areFriends) return;
    loadMessages();
    const onInsert = (payload) => {
      const m = payload.new;
      const involves = m.sender_id === myId && m.recipient_id === friendId || m.sender_id === friendId && m.recipient_id === myId;
      if (involves) setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
    };
    const onUpdate = (payload) => {
      const m = payload.new;
      setMessages((prev) => prev.map((x) => x.id === m.id ? m : x));
    };
    const ch = supabase.channel(`dm-${myId}-${friendId}`).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "direct_messages",
      filter: `sender_id=eq.${myId}`
    }, onInsert).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "direct_messages",
      filter: `sender_id=eq.${friendId}`
    }, onInsert).on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "direct_messages",
      filter: `sender_id=eq.${myId}`
    }, onUpdate).on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "direct_messages",
      filter: `sender_id=eq.${friendId}`
    }, onUpdate).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [myId, friendId, areFriends]);
  useEffect(() => {
    var _a2;
    (_a2 = endRef.current) == null ? void 0 : _a2.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages.length]);
  const send = async (extra) => {
    var _a2, _b2, _c2, _d2, _e, _f, _g;
    if (!myId) return;
    const txt = body.trim();
    const payload = {
      sender_id: myId,
      recipient_id: friendId,
      body: (_a2 = extra == null ? void 0 : extra.body) != null ? _a2 : txt || null,
      image_url: (_b2 = extra == null ? void 0 : extra.image_url) != null ? _b2 : null,
      video_url: (_c2 = extra == null ? void 0 : extra.video_url) != null ? _c2 : null,
      document_url: (_d2 = extra == null ? void 0 : extra.document_url) != null ? _d2 : null,
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
    } = await supabase.from("direct_messages").insert(payload);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!extra) setBody("");
  };
  const uploadAndSend = async (file, kind) => {
    var _a2, _b2;
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
    const ext = (_b2 = (_a2 = file.name.split(".").pop()) == null ? void 0 : _a2.toLowerCase()) != null ? _b2 : "bin";
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
  if (!friend) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsxs("div", { className: "container mx-auto p-12 text-center", children: [
        /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" }),
        /* @__PURE__ */ jsx(Button, { asChild: true, className: "mt-4", children: /* @__PURE__ */ jsx(Link, { to: "/friends", children: "\u041A \u0434\u0440\u0443\u0437\u044C\u044F\u043C" }) })
      ] })
    ] });
  }
  if (!areFriends) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsxs("div", { className: "container mx-auto px-4 sm:px-6 py-16 text-center", children: [
        /* @__PURE__ */ jsx("h1", { className: "font-display text-2xl font-bold", children: "\u0412\u044B \u043F\u043E\u043A\u0430 \u043D\u0435 \u0434\u0440\u0443\u0437\u044C\u044F" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-muted-foreground", children: "\u0427\u0442\u043E\u0431\u044B \u043D\u0430\u0447\u0430\u0442\u044C \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0443, \u043E\u0442\u043F\u0440\u0430\u0432\u044C \u0437\u0430\u044F\u0432\u043A\u0443 \u0432 \u0434\u0440\u0443\u0437\u044C\u044F \u0438 \u0434\u043E\u0436\u0434\u0438\u0441\u044C \u0435\u0451 \u043F\u0440\u0438\u043D\u044F\u0442\u0438\u044F." }),
        /* @__PURE__ */ jsx(Button, { asChild: true, className: "mt-4", children: /* @__PURE__ */ jsx(Link, { to: "/friends", children: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0434\u0440\u0443\u0437\u044C\u044F\u043C" }) })
      ] })
    ] });
  }
  const pref = friend.chat_display === "nickname" ? "nickname" : "name";
  const name = (pref === "nickname" ? ((_a = friend.nickname) == null ? void 0 : _a.trim()) || ((_b = friend.display_name) == null ? void 0 : _b.trim()) : ((_c = friend.display_name) == null ? void 0 : _c.trim()) || ((_d = friend.nickname) == null ? void 0 : _d.trim())) || (friend.username ? `@${friend.username}` : "\u0418\u0433\u0440\u043E\u043A");
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-screen flex-col bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsx("header", { className: "sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-xl", children: /* @__PURE__ */ jsxs("div", { className: "container mx-auto flex items-center gap-3 px-6 py-3", children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => navigate({
        to: "/friends"
      }), children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxs(Avatar, { className: "h-10 w-10", children: [
        friend.avatar_url ? /* @__PURE__ */ jsx(AvatarImage, { src: friend.avatar_url }) : null,
        /* @__PURE__ */ jsx(AvatarFallback, { children: initials(name) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        friend.username ? /* @__PURE__ */ jsx(Link, { to: "/u/$username", params: {
          username: friend.username
        }, className: "truncate text-sm font-semibold hover:underline", children: name }) : /* @__PURE__ */ jsx("span", { className: "truncate text-sm font-semibold", children: name }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: friend.username ? `@${friend.username}` : "\u041B\u0438\u0447\u043D\u044B\u0439 \u0447\u0430\u0442" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ml-auto flex items-center gap-1", children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", "aria-label": "\u0410\u0443\u0434\u0438\u043E\u0437\u0432\u043E\u043D\u043E\u043A", onClick: () => startCall({
          id: friend.id,
          name,
          avatarUrl: friend.avatar_url
        }, "audio"), children: /* @__PURE__ */ jsx(Phone, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", "aria-label": "\u0412\u0438\u0434\u0435\u043E\u0437\u0432\u043E\u043D\u043E\u043A", onClick: () => startCall({
          id: friend.id,
          name,
          avatarUrl: friend.avatar_url
        }, "video"), children: /* @__PURE__ */ jsx(Video, { className: "h-4 w-4" }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("main", { className: "container mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-4", children: [
        hasMore && /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: loadEarlier, disabled: loadingMore, children: [
          loadingMore ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-3 w-3 animate-spin" }) : null,
          "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0440\u0430\u043D\u0435\u0435"
        ] }) }),
        grouped.length === 0 && /* @__PURE__ */ jsx("p", { className: "mt-12 text-center text-sm text-muted-foreground", children: "\u041F\u043E\u0437\u0434\u043E\u0440\u043E\u0432\u0430\u0439\u0441\u044F \u043F\u0435\u0440\u0432\u044B\u043C \u2014 \u043E\u0442\u043F\u0440\u0430\u0432\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0438\u043B\u0438 \u0444\u043E\u0442\u043E." }),
        grouped.map((g) => /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("div", { className: "my-2 flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "rounded-full bg-muted px-3 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground", children: g.day }) }),
          g.items.map((m) => {
            var _a2, _b2, _c2;
            const mine = m.sender_id === myId;
            const isDeleted = !!m.deleted_at;
            return /* @__PURE__ */ jsx("div", { className: `group flex ${mine ? "justify-end" : "justify-start"}`, children: /* @__PURE__ */ jsxs("div", { className: `relative max-w-[80%] rounded-2xl px-3 py-2 shadow-card ${mine ? "bg-gradient-brand text-primary-foreground" : "bg-card text-foreground border border-border"} ${isDeleted ? "italic opacity-70" : ""}`, children: [
              isDeleted ? /* @__PURE__ */ jsx("p", { className: "text-sm", children: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                m.image_url && /* @__PURE__ */ jsx("a", { href: m.image_url, target: "_blank", rel: "noopener noreferrer", className: "block", children: /* @__PURE__ */ jsx("img", { src: m.image_url, alt: "image", className: "mb-1 max-h-80 rounded-xl object-cover" }) }),
                m.video_url && /* @__PURE__ */ jsx("video", { src: m.video_url, controls: true, className: "mb-1 max-h-80 rounded-xl" }),
                m.document_url && /* @__PURE__ */ jsxs("a", { href: m.document_url, target: "_blank", rel: "noopener noreferrer", download: (_a2 = m.document_name) != null ? _a2 : void 0, className: `mb-1 flex items-center gap-2 rounded-xl px-3 py-2 ${mine ? "bg-white/15" : "bg-muted"}`, children: [
                  /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 shrink-0" }),
                  /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1 truncate text-sm", children: (_b2 = m.document_name) != null ? _b2 : "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442" }),
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
                m.body && /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap break-words text-sm", children: m.body })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: `mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`, children: [
                !isDeleted && m.edited_at && /* @__PURE__ */ jsx("span", { children: "(\u0438\u0437\u043C.)" }),
                /* @__PURE__ */ jsx("span", { children: fmtTime(m.created_at) }),
                !isDeleted && /* @__PURE__ */ jsx(MessageActions, { canEdit: mine && !!m.body && !m.image_url && !m.video_url && !m.document_url && m.location_lat === null, initialText: (_c2 = m.body) != null ? _c2 : "", variant: mine ? "dark" : "light", onEdit: async (next) => {
                  const {
                    error
                  } = await supabase.from("direct_messages").update({
                    body: next,
                    edited_at: (/* @__PURE__ */ new Date()).toISOString()
                  }).eq("id", m.id);
                  if (error) toast.error(error.message);
                }, onDelete: async () => {
                  const {
                    error
                  } = await supabase.from("direct_messages").update({
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
            ] }) }, m.id);
          })
        ] }, g.day)),
        /* @__PURE__ */ jsx("div", { ref: endRef })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: (e) => {
        e.preventDefault();
        send();
      }, className: "sticky bottom-0 mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-elegant", children: [
        /* @__PURE__ */ jsx(AttachButton, { kind: "image", accept: "image/*", disabled: !!uploading, uploading: uploading === "image", onFile: (f) => uploadAndSend(f, "image"), label: "\u0424\u043E\u0442\u043E", Icon: Image }),
        /* @__PURE__ */ jsx(AttachButton, { kind: "video", accept: "video/*", disabled: !!uploading, uploading: uploading === "video", onFile: (f) => uploadAndSend(f, "video"), label: "\u0412\u0438\u0434\u0435\u043E", Icon: Video }),
        /* @__PURE__ */ jsx(AttachButton, { kind: "document", accept: "*/*", disabled: !!uploading, uploading: uploading === "document", onFile: (f) => uploadAndSend(f, "document"), label: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442", Icon: Paperclip }),
        /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "icon", onClick: shareLocation, disabled: sendingLocation, "aria-label": "\u0413\u0435\u043E\u043B\u043E\u043A\u0430\u0446\u0438\u044F", children: sendingLocation ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsx(Textarea, { value: body, onChange: (e) => setBody(wrapToWidth(e.target.value, 54)), onKeyDown: (e) => {
          var _a2;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            (_a2 = e.currentTarget.form) == null ? void 0 : _a2.requestSubmit();
          }
        }, placeholder: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u2026", rows: Math.min(3, Math.max(1, body.split("\n").length)), className: "min-h-10 max-h-[4.75rem] flex-1 resize-none border-none bg-transparent py-2 shadow-none focus-visible:ring-0", maxLength: 2e3 }),
        /* @__PURE__ */ jsx(Button, { type: "submit", size: "icon", disabled: sending || !body.trim() && !uploading, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", "aria-label": "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C", children: sending ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Send, { className: "h-4 w-4" }) })
      ] })
    ] })
  ] });
}
function AttachButton({
  kind,
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
const SplitComponent = () => /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(ChatPage, {}) });

export { SplitComponent as component };
//# sourceMappingURL=friends_._friendId-CRTcletD.mjs.map
