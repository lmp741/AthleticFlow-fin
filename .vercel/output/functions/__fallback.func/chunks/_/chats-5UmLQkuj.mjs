import { jsx, jsxs } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, MessageCircle, Users, Plus, Check, X } from 'lucide-react';
import { h as SiteHeader, g as SiteFooter } from './SiteShell-n-2GeoU1.mjs';
import { u as useAuth, s as supabase, A as Avatar, b as AvatarImage, a as AvatarFallback, p as displayLabel, D as Dialog, h as DialogTrigger, B as Button, c as DialogContent, f as DialogHeader, g as DialogTitle, d as DialogDescription, e as DialogFooter } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { R as RequireAuth } from './RequireAuth-D6K_CCtb.mjs';
import { toast } from 'sonner';
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

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
function previewOf(m) {
  var _a;
  if ((_a = m.body) == null ? void 0 : _a.trim()) return m.body.trim();
  if (m.image_url) return "\u{1F4F7} \u0424\u043E\u0442\u043E";
  if (m.video_url) return "\u{1F3AC} \u0412\u0438\u0434\u0435\u043E";
  if (m.document_url) return "\u{1F4CE} \u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442";
  if (m.location_lat !== null) return "\u{1F4CD} \u0413\u0435\u043E\u043B\u043E\u043A\u0430\u0446\u0438\u044F";
  return "\u2014";
}
function fmtWhen(iso) {
  const d = new Date(iso);
  const today = /* @__PURE__ */ new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short"
  });
}
function ChatsPage() {
  const {
    user
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dmThreads, setDmThreads] = useState([]);
  const [convs, setConvs] = useState([]);
  const [friends, setFriends] = useState([]);
  const load = async () => {
    var _a;
    if (!user) return;
    setLoading(true);
    const {
      data: dms
    } = await supabase.from("direct_messages").select("id, sender_id, recipient_id, body, image_url, video_url, document_url, location_lat, created_at").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at", {
      ascending: false
    }).limit(500);
    const dmList = dms != null ? dms : [];
    const partnerLast = /* @__PURE__ */ new Map();
    for (const m of dmList) {
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!partnerLast.has(other)) partnerLast.set(other, m);
    }
    const partnerIds = Array.from(partnerLast.keys());
    const {
      data: friendsRows
    } = await supabase.from("friendships").select("requester_id, addressee_id, status").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq("status", "accepted");
    const friendIds = (friendsRows != null ? friendsRows : []).map((r) => r.requester_id === user.id ? r.addressee_id : r.requester_id);
    const {
      data: myMemberRows
    } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", user.id);
    const convIds = (myMemberRows != null ? myMemberRows : []).map((r) => r.conversation_id);
    const [{
      data: convsData
    }, {
      data: allMembers
    }] = await Promise.all([convIds.length ? supabase.from("conversations").select("id, name, created_by, updated_at").in("id", convIds).order("updated_at", {
      ascending: false
    }) : Promise.resolve({
      data: []
    }), convIds.length ? supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", convIds) : Promise.resolve({
      data: []
    })]);
    const lastByConv = /* @__PURE__ */ new Map();
    if (convIds.length) {
      const {
        data: msgs
      } = await supabase.from("conversation_messages").select("conversation_id, sender_id, body, image_url, video_url, document_url, location_lat, created_at").in("conversation_id", convIds).order("created_at", {
        ascending: false
      }).limit(1e3);
      for (const m of msgs != null ? msgs : []) {
        if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
      }
    }
    const allIds = /* @__PURE__ */ new Set([...partnerIds, ...friendIds, ...(allMembers != null ? allMembers : []).map((m) => m.user_id)]);
    allIds.delete(user.id);
    let profMap = /* @__PURE__ */ new Map();
    if (allIds.size) {
      const {
        data: profs
      } = await supabase.from("profiles").select("id, username, display_name, avatar_url, nickname, chat_display").in("id", Array.from(allIds));
      for (const p of profs != null ? profs : []) profMap.set(p.id, p);
    }
    setFriends(friendIds.map((id) => profMap.get(id)).filter(Boolean));
    setDmThreads(partnerIds.map((pid) => ({
      partner: profMap.get(pid),
      last: partnerLast.get(pid)
    })).filter((x) => x.partner));
    const membersByConv = /* @__PURE__ */ new Map();
    for (const m of allMembers != null ? allMembers : []) {
      if (m.user_id === user.id) continue;
      const p = profMap.get(m.user_id);
      if (!p) continue;
      const arr = (_a = membersByConv.get(m.conversation_id)) != null ? _a : [];
      arr.push(p);
      membersByConv.set(m.conversation_id, arr);
    }
    setConvs((convsData != null ? convsData : []).map((c) => {
      var _a2, _b;
      return {
        conv: c,
        members: (_a2 = membersByConv.get(c.id)) != null ? _a2 : [],
        last: (_b = lastByConv.get(c.id)) != null ? _b : null
      };
    }));
    setLoading(false);
  };
  useEffect(() => {
    load();
    if (!user) return;
    let timer = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => load(), 500);
    };
    const ch = supabase.channel(`chats-${user.id}`).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "direct_messages",
      filter: `sender_id=eq.${user.id}`
    }, debounced).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "direct_messages",
      filter: `recipient_id=eq.${user.id}`
    }, debounced).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "conversation_members",
      filter: `user_id=eq.${user.id}`
    }, debounced).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "conversation_messages"
    }, debounced).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "conversations"
    }, debounced).subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [user == null ? void 0 : user.id]);
  const merged = useMemo(() => {
    const items = [...dmThreads.map((t) => ({
      kind: "dm",
      ts: t.last.created_at,
      partner: t.partner,
      last: t.last
    })), ...convs.map((c) => {
      var _a, _b;
      return {
        kind: "group",
        ts: (_b = (_a = c.last) == null ? void 0 : _a.created_at) != null ? _b : c.conv.updated_at,
        conv: c.conv,
        members: c.members,
        last: c.last
      };
    })];
    items.sort((a, b) => a.ts < b.ts ? 1 : -1);
    return items;
  }, [dmThreads, convs]);
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsx("div", { className: "container mx-auto p-12 text-center", children: /* @__PURE__ */ jsx(Loader2, { className: "mx-auto h-6 w-6 animate-spin text-muted-foreground" }) })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsx("section", { className: "bg-gradient-hero py-12", children: /* @__PURE__ */ jsxs("div", { className: "container mx-auto px-4 sm:px-6", children: [
      /* @__PURE__ */ jsx(Badge, { className: "mb-3 border-white/30 bg-white/10 text-white", children: "\u0421\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u043E" }),
      /* @__PURE__ */ jsx("h1", { className: "font-display text-4xl font-bold text-white md:text-5xl", children: "\u041E\u0431\u0449\u0435\u043D\u0438\u0435" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-2xl text-white/80", children: "\u0412\u0441\u0435 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0438 \u0441 \u0434\u0440\u0443\u0437\u044C\u044F\u043C\u0438 \u0438 \u0433\u0440\u0443\u043F\u043F\u043E\u0432\u044B\u0435 \u0431\u0435\u0441\u0435\u0434\u044B \u0432 \u043E\u0434\u043D\u043E\u043C \u043C\u0435\u0441\u0442\u0435." })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 sm:px-6 py-10", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-6 flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("h2", { className: "font-display text-lg font-bold", children: [
          "\u0427\u0430\u0442\u044B \xB7 ",
          merged.length
        ] }),
        /* @__PURE__ */ jsx(NewConversationDialog, { friends, onCreated: load })
      ] }),
      merged.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-dashed border-border bg-card/40 p-10 text-center", children: [
        /* @__PURE__ */ jsx(MessageCircle, { className: "mx-auto h-8 w-8 text-muted-foreground" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-3 text-sm text-muted-foreground", children: [
          "\u041F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E. \u0421\u043E\u0437\u0434\u0430\u0439 \u0431\u0435\u0441\u0435\u0434\u0443 \u0438\u043B\u0438 \u043D\u0430\u0447\u043D\u0438 \u043B\u0438\u0447\u043D\u044B\u0439 \u0447\u0430\u0442 \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/friends", className: "text-foreground underline", children: "\u0434\u0440\u0443\u0437\u0435\u0439" }),
          "."
        ] })
      ] }) : /* @__PURE__ */ jsx("ul", { className: "grid gap-2", children: merged.map((it) => {
        var _a;
        return it.kind === "dm" ? /* @__PURE__ */ jsx("li", { className: "min-w-0", children: /* @__PURE__ */ jsxs(Link, { to: "/friends/$friendId", params: {
          friendId: it.partner.id
        }, className: "flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 transition hover:bg-muted/40", children: [
          /* @__PURE__ */ jsxs(Avatar, { className: "h-11 w-11 shrink-0", children: [
            it.partner.avatar_url ? /* @__PURE__ */ jsx(AvatarImage, { src: it.partner.avatar_url }) : null,
            /* @__PURE__ */ jsx(AvatarFallback, { children: initials(displayLabel(it.partner)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-semibold", children: displayLabel(it.partner) }),
              /* @__PURE__ */ jsx("span", { className: "shrink-0 text-[11px] text-muted-foreground", children: fmtWhen(it.last.created_at) })
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "truncate text-xs text-muted-foreground", children: [
              it.last.sender_id === user.id ? "\u0412\u044B: " : "",
              previewOf(it.last).replace(/\s*\n\s*/g, " ")
            ] })
          ] })
        ] }) }, `dm-${it.partner.id}`) : /* @__PURE__ */ jsx("li", { className: "min-w-0", children: /* @__PURE__ */ jsxs(Link, { to: "/chats/$conversationId", params: {
          conversationId: it.conv.id
        }, className: "flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 transition hover:bg-muted/40", children: [
          /* @__PURE__ */ jsx("div", { className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground", children: /* @__PURE__ */ jsx(Users, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-semibold", children: ((_a = it.conv.name) == null ? void 0 : _a.trim()) || it.members.slice(0, 3).map((m) => displayLabel(m)).join(", ") || "\u0411\u0435\u0441\u0435\u0434\u0430" }),
              /* @__PURE__ */ jsx("span", { className: "shrink-0 text-[11px] text-muted-foreground", children: fmtWhen(it.ts) })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "truncate text-xs text-muted-foreground", children: it.last ? `${it.last.sender_id === user.id ? "\u0412\u044B: " : ""}${previewOf(it.last).replace(/\s*\n\s*/g, " ")}` : `\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432: ${it.members.length + 1}` })
          ] })
        ] }) }, `g-${it.conv.id}`);
      }) })
    ] }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
function NewConversationDialog({
  friends,
  onCreated
}) {
  const {
    user
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState(/* @__PURE__ */ new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
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
  const create = async () => {
    var _a;
    if (!user) return;
    if (picked.size === 0) {
      toast.error("\u0412\u044B\u0431\u0435\u0440\u0438 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E\u0433\u043E \u0434\u0440\u0443\u0433\u0430");
      return;
    }
    setBusy(true);
    const {
      data: conv,
      error: cErr
    } = await supabase.from("conversations").insert({
      name: name.trim() || null,
      created_by: user.id
    }).select("id").single();
    if (cErr || !conv) {
      setBusy(false);
      toast.error((_a = cErr == null ? void 0 : cErr.message) != null ? _a : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0431\u0435\u0441\u0435\u0434\u0443");
      return;
    }
    const {
      error: meErr
    } = await supabase.from("conversation_members").insert({
      conversation_id: conv.id,
      user_id: user.id
    });
    if (meErr) {
      setBusy(false);
      toast.error(meErr.message);
      return;
    }
    const invites = Array.from(picked).map((uid) => ({
      conversation_id: conv.id,
      user_id: uid
    }));
    const {
      error: invErr
    } = await supabase.from("conversation_members").insert(invites);
    setBusy(false);
    if (invErr) {
      toast.error(invErr.message);
      return;
    }
    toast.success("\u0411\u0435\u0441\u0435\u0434\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430");
    setOpen(false);
    setName("");
    setPicked(/* @__PURE__ */ new Set());
    setQ("");
    onCreated();
  };
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
      /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
      " \u041D\u043E\u0432\u0430\u044F \u0431\u0435\u0441\u0435\u0434\u0430"
    ] }) }),
    /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "\u041D\u043E\u0432\u0430\u044F \u0431\u0435\u0441\u0435\u0434\u0430" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "\u0414\u0430\u0439 \u0431\u0435\u0441\u0435\u0434\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0432\u044B\u0431\u0435\u0440\u0438 \u0434\u0440\u0443\u0437\u0435\u0439, \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0445\u043E\u0447\u0435\u0448\u044C \u043F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u044C." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx(Input, { value: name, onChange: (e) => setName(e.target.value), placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)", maxLength: 60 }),
        /* @__PURE__ */ jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A \u0441\u0440\u0435\u0434\u0438 \u0434\u0440\u0443\u0437\u0435\u0439" }),
        /* @__PURE__ */ jsxs("div", { className: "max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border p-2", children: [
          friends.length === 0 && /* @__PURE__ */ jsxs("p", { className: "p-4 text-center text-sm text-muted-foreground", children: [
            "\u0423 \u0442\u0435\u0431\u044F \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0434\u0440\u0443\u0437\u0435\u0439. \u0414\u043E\u0431\u0430\u0432\u044C \u043A\u043E\u0433\u043E-\u043D\u0438\u0431\u0443\u0434\u044C \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435",
            " ",
            /* @__PURE__ */ jsx(Link, { to: "/friends", className: "underline", children: "\u0434\u0440\u0443\u0437\u0435\u0439" }),
            "."
          ] }),
          filtered.map((f) => {
            const checked = picked.has(f.id);
            return /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => toggle(f.id), className: `flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${checked ? "bg-primary/10" : "hover:bg-muted/50"}`, children: [
              /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8", children: [
                f.avatar_url ? /* @__PURE__ */ jsx(AvatarImage, { src: f.avatar_url }) : null,
                /* @__PURE__ */ jsx(AvatarFallback, { children: initials(displayLabel(f)) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium", children: displayLabel(f) }),
                f.username && /* @__PURE__ */ jsxs("p", { className: "truncate text-xs text-muted-foreground", children: [
                  "@",
                  f.username
                ] })
              ] }),
              /* @__PURE__ */ jsx("span", { className: `flex h-5 w-5 items-center justify-center rounded-full border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`, children: checked ? /* @__PURE__ */ jsx(Check, { className: "h-3 w-3" }) : null })
            ] }, f.id);
          })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
          "\u0412\u044B\u0431\u0440\u0430\u043D\u043E: ",
          picked.size
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxs(Button, { variant: "ghost", onClick: () => setOpen(false), disabled: busy, children: [
          /* @__PURE__ */ jsx(X, { className: "mr-1 h-4 w-4" }),
          " \u041E\u0442\u043C\u0435\u043D\u0430"
        ] }),
        /* @__PURE__ */ jsxs(Button, { onClick: create, disabled: busy || picked.size === 0, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
          busy ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
          "\u0421\u043E\u0437\u0434\u0430\u0442\u044C"
        ] })
      ] })
    ] })
  ] });
}
const SplitComponent = () => /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(ChatsPage, {}) });

export { SplitComponent as component };
//# sourceMappingURL=chats-5UmLQkuj.mjs.map
