import { jsx, jsxs } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, UserPlus, Clock, Check, MessageCircle, X, Users } from 'lucide-react';
import { h as SiteHeader, g as SiteFooter } from './SiteShell-n-2GeoU1.mjs';
import { u as useAuth, s as supabase, B as Button, A as Avatar, b as AvatarImage, a as AvatarFallback, o as cn, n as buttonVariants } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
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

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AlertDialogPrimitive.Overlay,
  {
    className: cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props,
    ref
  }
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;
const AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxs(AlertDialogPortal, { children: [
  /* @__PURE__ */ jsx(AlertDialogOverlay, {}),
  /* @__PURE__ */ jsx(
    AlertDialogPrimitive.Content,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      ),
      ...props
    }
  )
] }));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;
const AlertDialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("flex flex-col space-y-2 text-center sm:text-left", className), ...props });
AlertDialogHeader.displayName = "AlertDialogHeader";
const AlertDialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
    ...props
  }
);
AlertDialogFooter.displayName = "AlertDialogFooter";
const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AlertDialogPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold", className),
    ...props
  }
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;
const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AlertDialogPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;
const AlertDialogAction = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(AlertDialogPrimitive.Action, { ref, className: cn(buttonVariants(), className), ...props }));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;
const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AlertDialogPrimitive.Cancel,
  {
    ref,
    className: cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className),
    ...props
  }
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;
function displayLabel(p) {
  var _a, _b, _c, _d;
  const pref = p.chat_display === "nickname" ? "nickname" : "name";
  if (pref === "nickname") {
    return ((_a = p.nickname) == null ? void 0 : _a.trim()) || ((_b = p.display_name) == null ? void 0 : _b.trim()) || (p.username ? `@${p.username}` : "\u0418\u0433\u0440\u043E\u043A");
  }
  return ((_c = p.display_name) == null ? void 0 : _c.trim()) || ((_d = p.nickname) == null ? void 0 : _d.trim()) || (p.username ? `@${p.username}` : "\u0418\u0433\u0440\u043E\u043A");
}
function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
function FriendsPage() {
  const {
    user
  } = useAuth();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from("friendships").select("id, requester_id, addressee_id, status, created_at").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).order("created_at", {
      ascending: false
    });
    const rows = data != null ? data : [];
    setFriendships(rows);
    const ids = Array.from(new Set(rows.flatMap((r) => [r.requester_id, r.addressee_id]).filter((id) => id !== user.id)));
    if (ids.length) {
      const {
        data: ps
      } = await supabase.from("profiles").select("id, username, display_name, avatar_url, level, nickname, chat_display").in("id", ids);
      const map = {};
      (ps != null ? ps : []).forEach((p) => map[p.id] = p);
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
    if (!user) return;
    let timer = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => load(), 400);
    };
    const ch = supabase.channel(`friends-${user.id}`).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "friendships",
      filter: `requester_id=eq.${user.id}`
    }, debounced).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "friendships",
      filter: `addressee_id=eq.${user.id}`
    }, debounced).subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [user == null ? void 0 : user.id]);
  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.addressee_id === (user == null ? void 0 : user.id));
  const outgoing = friendships.filter((f) => f.status === "pending" && f.requester_id === (user == null ? void 0 : user.id));
  const friendshipFor = (otherId) => friendships.find((f) => f.requester_id === (user == null ? void 0 : user.id) && f.addressee_id === otherId || f.addressee_id === (user == null ? void 0 : user.id) && f.requester_id === otherId);
  const doSearch = async (e) => {
    e == null ? void 0 : e.preventDefault();
    const q = query.trim().replace(/^@/, "");
    if (!q || !user) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const {
      data
    } = await supabase.from("profiles").select("id, username, display_name, avatar_url, level, nickname, chat_display").or(`username.ilike.%${q}%,display_name.ilike.%${q}%,nickname.ilike.%${q}%`).neq("id", user.id).limit(20);
    setSearchResults(data != null ? data : []);
    setSearching(false);
  };
  const sendRequest = async (other) => {
    if (!user) return;
    const {
      error
    } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: other.id,
      status: "pending"
    });
    if (error) {
      if (error.code === "23505") toast.error("\u0417\u0430\u043F\u0440\u043E\u0441 \u0443\u0436\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D");
      else toast.error(error.message);
      return;
    }
    toast.success("\u0417\u0430\u044F\u0432\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430");
    load();
  };
  const accept = async (f) => {
    const {
      error
    } = await supabase.from("friendships").update({
      status: "accepted"
    }).eq("id", f.id);
    if (error) toast.error(error.message);
    else {
      toast.success("\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u044B \u0434\u0440\u0443\u0437\u044C\u044F");
      load();
    }
  };
  const remove = async (f) => {
    const {
      error
    } = await supabase.from("friendships").delete().eq("id", f.id);
    if (error) toast.error(error.message);
    else load();
  };
  const otherIdOf = (f) => f.requester_id === (user == null ? void 0 : user.id) ? f.addressee_id : f.requester_id;
  const filteredAccepted = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (!q) return accepted;
    return accepted.filter((f) => {
      var _a, _b, _c;
      const p = profiles[otherIdOf(f)];
      if (!p) return false;
      return ((_a = p.username) != null ? _a : "").toLowerCase().includes(q) || ((_b = p.display_name) != null ? _b : "").toLowerCase().includes(q) || ((_c = p.nickname) != null ? _c : "").toLowerCase().includes(q);
    });
  }, [accepted, profiles, query]);
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
      /* @__PURE__ */ jsx("h1", { className: "font-display text-4xl font-bold text-white md:text-5xl", children: "\u0414\u0440\u0443\u0437\u044C\u044F" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-2xl text-white/80", children: "\u041D\u0430\u0445\u043E\u0434\u0438 \u0437\u043D\u0430\u043A\u043E\u043C\u044B\u0445 \u043F\u043E \u043D\u0438\u043A\u043D\u0435\u0439\u043C\u0443 \u0438\u043B\u0438 \u0438\u043C\u0435\u043D\u0438, \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0439 \u0432 \u0434\u0440\u0443\u0437\u044C\u044F \u0438 \u043E\u0431\u0449\u0430\u0439\u0441\u044F \u0432 \u043B\u0438\u0447\u043D\u044B\u0445 \u0447\u0430\u0442\u0430\u0445." })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 sm:px-6 py-10", children: [
      /* @__PURE__ */ jsxs("form", { onSubmit: doSearch, className: "relative max-w-2xl", children: [
        /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
        /* @__PURE__ */ jsx(Input, { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E @\u043D\u0438\u043A\u043D\u0435\u0439\u043C\u0443 \u0438\u043B\u0438 \u0438\u043C\u0435\u043D\u0438", className: "h-12 pl-10" }),
        /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", className: "absolute right-1.5 top-1.5 h-9 bg-gradient-brand text-primary-foreground hover:opacity-90", disabled: searching, children: searching ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "\u041D\u0430\u0439\u0442\u0438" })
      ] }),
      searchResults.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-3xl border border-border bg-card p-6 shadow-card", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-lg font-bold", children: "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u043F\u043E\u0438\u0441\u043A\u0430" }),
        /* @__PURE__ */ jsx("ul", { className: "mt-4 grid gap-2 md:grid-cols-2", children: searchResults.map((p) => {
          const f = friendshipFor(p.id);
          return /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3", children: [
            /* @__PURE__ */ jsx(PersonRow, { person: p }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              !f && /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => sendRequest(p), className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
                /* @__PURE__ */ jsx(UserPlus, { className: "mr-1 h-4 w-4" }),
                " \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"
              ] }),
              (f == null ? void 0 : f.status) === "pending" && f.requester_id === (user == null ? void 0 : user.id) && /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
                /* @__PURE__ */ jsx(Clock, { className: "mr-1 inline h-3 w-3" }),
                " \u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435"
              ] }),
              (f == null ? void 0 : f.status) === "pending" && f.addressee_id === (user == null ? void 0 : user.id) && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => accept(f), children: [
                /* @__PURE__ */ jsx(Check, { className: "mr-1 h-4 w-4" }),
                " \u041F\u0440\u0438\u043D\u044F\u0442\u044C"
              ] }),
              (f == null ? void 0 : f.status) === "accepted" && /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", variant: "outline", children: /* @__PURE__ */ jsxs(Link, { to: "/friends/$friendId", params: {
                friendId: p.id
              }, children: [
                /* @__PURE__ */ jsx(MessageCircle, { className: "mr-1 h-4 w-4" }),
                " \u0427\u0430\u0442"
              ] }) })
            ] })
          ] }, p.id);
        }) })
      ] }),
      incoming.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-3xl border border-border bg-card p-6 shadow-card", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-lg font-bold", children: "\u0412\u0445\u043E\u0434\u044F\u0449\u0438\u0435 \u0437\u0430\u044F\u0432\u043A\u0438" }),
        /* @__PURE__ */ jsx("ul", { className: "mt-4 space-y-2", children: incoming.map((f) => {
          const p = profiles[f.requester_id];
          if (!p) return null;
          return /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3", children: [
            /* @__PURE__ */ jsx(PersonRow, { person: p }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => accept(f), className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
                /* @__PURE__ */ jsx(Check, { className: "mr-1 h-4 w-4" }),
                " \u041F\u0440\u0438\u043D\u044F\u0442\u044C"
              ] }),
              /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => remove(f), children: [
                /* @__PURE__ */ jsx(X, { className: "mr-1 h-4 w-4" }),
                " \u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C"
              ] })
            ] })
          ] }, f.id);
        }) })
      ] }),
      outgoing.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-3xl border border-border bg-card p-6 shadow-card", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-lg font-bold", children: "\u0418\u0441\u0445\u043E\u0434\u044F\u0449\u0438\u0435 \u0437\u0430\u044F\u0432\u043A\u0438" }),
        /* @__PURE__ */ jsx("ul", { className: "mt-4 space-y-2", children: outgoing.map((f) => {
          const p = profiles[f.addressee_id];
          if (!p) return null;
          return /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3", children: [
            /* @__PURE__ */ jsx(PersonRow, { person: p }),
            /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "ghost", onClick: () => remove(f), children: [
              /* @__PURE__ */ jsx(X, { className: "mr-1 h-4 w-4" }),
              " \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C"
            ] })
          ] }, f.id);
        }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-3xl border border-border bg-card p-6 shadow-card", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between gap-3", children: /* @__PURE__ */ jsxs("h2", { className: "font-display text-lg font-bold", children: [
          /* @__PURE__ */ jsx(Users, { className: "mr-1 inline h-5 w-5" }),
          " \u041C\u043E\u0438 \u0434\u0440\u0443\u0437\u044C\u044F \xB7 ",
          accepted.length
        ] }) }),
        filteredAccepted.length === 0 ? /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm text-muted-foreground", children: "\u041F\u043E\u043A\u0430 \u043D\u0438\u043A\u043E\u0433\u043E. \u041D\u0430\u0439\u0434\u0438 \u0437\u043D\u0430\u043A\u043E\u043C\u044B\u0445 \u043F\u043E \u043D\u0438\u043A\u043D\u0435\u0439\u043C\u0443 \u0438\u043B\u0438 \u0438\u043C\u0435\u043D\u0438 \u0432\u044B\u0448\u0435." }) : /* @__PURE__ */ jsx("ul", { className: "mt-4 grid gap-2 md:grid-cols-2", children: filteredAccepted.map((f) => {
          const otherId = otherIdOf(f);
          const p = profiles[otherId];
          if (!p) return null;
          return /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3", children: [
            /* @__PURE__ */ jsx(PersonRow, { person: p }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsxs(Link, { to: "/friends/$friendId", params: {
                friendId: p.id
              }, children: [
                /* @__PURE__ */ jsx(MessageCircle, { className: "mr-1 h-4 w-4" }),
                " \u0427\u0430\u0442"
              ] }) }),
              /* @__PURE__ */ jsxs(AlertDialog, { children: [
                /* @__PURE__ */ jsx(AlertDialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u0434\u0440\u0443\u0437\u0435\u0439", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) }) }),
                /* @__PURE__ */ jsxs(AlertDialogContent, { children: [
                  /* @__PURE__ */ jsxs(AlertDialogHeader, { children: [
                    /* @__PURE__ */ jsx(AlertDialogTitle, { children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u0434\u0440\u0443\u0437\u0435\u0439?" }),
                    /* @__PURE__ */ jsxs(AlertDialogDescription, { children: [
                      displayLabel(p),
                      " \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043B\u0451\u043D(\u0430) \u0438\u0437 \u0432\u0430\u0448\u0438\u0445 \u0434\u0440\u0443\u0437\u0435\u0439. \u0412\u044B \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442\u0435 \u043E\u0431\u043C\u0435\u043D\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u043B\u0438\u0447\u043D\u044B\u043C\u0438 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F\u043C\u0438, \u043F\u043E\u043A\u0430 \u0441\u043D\u043E\u0432\u0430 \u043D\u0435 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u0435 \u0434\u0440\u0443\u0433 \u0434\u0440\u0443\u0433\u0430."
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs(AlertDialogFooter, { children: [
                    /* @__PURE__ */ jsx(AlertDialogCancel, { children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
                    /* @__PURE__ */ jsx(AlertDialogAction, { onClick: () => remove(f), className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })
                  ] })
                ] })
              ] })
            ] })
          ] }, f.id);
        }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
function PersonRow({
  person
}) {
  const name = displayLabel(person);
  const inner = /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
    /* @__PURE__ */ jsxs(Avatar, { className: "h-10 w-10", children: [
      person.avatar_url ? /* @__PURE__ */ jsx(AvatarImage, { src: person.avatar_url }) : null,
      /* @__PURE__ */ jsx(AvatarFallback, { children: initials(name) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
      /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-semibold", children: name }),
      /* @__PURE__ */ jsxs("p", { className: "truncate text-xs text-muted-foreground", children: [
        person.username ? `@${person.username}` : "",
        person.level ? ` \xB7 ${person.level}` : ""
      ] })
    ] })
  ] });
  return person.username ? /* @__PURE__ */ jsx(Link, { to: "/u/$username", params: {
    username: person.username
  }, className: "min-w-0 flex-1 hover:opacity-90", children: inner }) : /* @__PURE__ */ jsx("div", { className: "min-w-0 flex-1", children: inner });
}
const SplitComponent = () => /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(FriendsPage, {}) });

export { SplitComponent as component, displayLabel };
//# sourceMappingURL=friends-CQWcuG80.mjs.map
