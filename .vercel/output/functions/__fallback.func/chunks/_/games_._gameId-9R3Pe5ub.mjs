import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useNavigate, Link } from '@tanstack/react-router';
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Lock, Star, Globe, MapPin, AlertTriangle, Flame, Zap, Calendar, Clock, Users, ShieldCheck, Trophy, MessageCircle, CheckCircle2, CreditCard, RefreshCw, CalendarClock, Loader2, UserPlus, Search, Copy, X, ImagePlus, Send, Check } from 'lucide-react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { k as Route$9, u as useAuth, s as supabase, B as Button, A as Avatar, b as AvatarImage, a as AvatarFallback, D as Dialog, c as DialogContent, f as DialogHeader, g as DialogTitle, d as DialogDescription, e as DialogFooter, o as cn } from './ssr.mjs';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { L as Label } from './label-C6ng35E5.mjs';
import { h as SiteHeader, g as SiteFooter } from './SiteShell-n-2GeoU1.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { toast } from 'sonner';
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
import '@radix-ui/react-label';
import './Logo-DDLL_UOB.mjs';
import '@radix-ui/react-popover';

const Checkbox = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  CheckboxPrimitive.Root,
  {
    ref,
    className: cn(
      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsx(CheckboxPrimitive.Indicator, { className: cn("grid place-content-center text-current"), children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) })
  }
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  ScrollAreaPrimitive.Root,
  {
    ref,
    className: cn("relative overflow-hidden", className),
    ...props,
    children: [
      /* @__PURE__ */ jsx(ScrollAreaPrimitive.Viewport, { className: "h-full w-full rounded-[inherit]", children }),
      /* @__PURE__ */ jsx(ScrollBar, {}),
      /* @__PURE__ */ jsx(ScrollAreaPrimitive.Corner, {})
    ]
  }
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;
const ScrollBar = React.forwardRef(({ className, orientation = "vertical", ...props }, ref) => /* @__PURE__ */ jsx(
  ScrollAreaPrimitive.ScrollAreaScrollbar,
  {
    ref,
    orientation,
    className: cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsx(ScrollAreaPrimitive.ScrollAreaThumb, { className: "relative flex-1 rounded-full bg-border" })
  }
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;
function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long"
  });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
function GamePage() {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const {
    gameId
  } = Route$9.useParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [game, setGame] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [organizer, setOrganizer] = useState(null);
  const loadGame = async () => {
    const {
      data,
      error
    } = await supabase.from("games").select("id, sport, level, starts_at, ends_at, price_per_player, slots_total, description, organizer_id, is_private, stadium:stadiums(id,name,address)").eq("id", gameId).maybeSingle();
    if (error || !data) {
      setLoading(false);
      return;
    }
    setGame(data);
    setLoading(false);
  };
  const loadOrganizer = async (organizerId) => {
    const [{
      data: prof
    }, {
      data: ratings
    }, {
      count: gamesCount
    }] = await Promise.all([supabase.from("profiles").select("id, display_name, username, avatar_url, phone_verified").eq("id", organizerId).maybeSingle(), supabase.from("user_ratings").select("score").eq("ratee_id", organizerId), supabase.from("games").select("id", {
      count: "exact",
      head: true
    }).eq("organizer_id", organizerId).lt("ends_at", (/* @__PURE__ */ new Date()).toISOString())]);
    if (!prof) return;
    const scores = (ratings != null ? ratings : []).map((r) => r.score);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    setOrganizer({
      id: prof.id,
      display_name: prof.display_name,
      username: prof.username,
      avatar_url: prof.avatar_url,
      phone_verified: !!prof.phone_verified,
      rating: avg,
      ratings_count: scores.length,
      games_count: gamesCount != null ? gamesCount : 0
    });
  };
  const loadParticipants = async () => {
    const {
      data,
      error
    } = await supabase.from("game_participants").select("id, user_id, paid").eq("game_id", gameId).order("joined_at", {
      ascending: true
    });
    if (error || !data) {
      setParticipants([]);
      return;
    }
    const ids = Array.from(new Set(data.map((p) => p.user_id)));
    let profilesMap = /* @__PURE__ */ new Map();
    if (ids.length > 0) {
      const {
        data: profs
      } = await supabase.from("profiles").select("id, display_name, avatar_url, username").in("id", ids);
      (profs != null ? profs : []).forEach((p) => profilesMap.set(p.id, {
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        username: p.username
      }));
    }
    setParticipants(data.map((p) => {
      var _a2;
      return {
        ...p,
        profile: (_a2 = profilesMap.get(p.user_id)) != null ? _a2 : null
      };
    }));
  };
  useEffect(() => {
    loadGame();
    loadParticipants();
    const ch = supabase.channel(`game-${gameId}-participants`).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "game_participants",
      filter: `game_id=eq.${gameId}`
    }, () => loadParticipants()).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId]);
  useEffect(() => {
    if (game == null ? void 0 : game.organizer_id) loadOrganizer(game.organizer_id);
  }, [game == null ? void 0 : game.organizer_id]);
  const isJoined = !!user && participants.some((p) => p.user_id === user.id);
  const isOrganizer = !!user && (game == null ? void 0 : game.organizer_id) === user.id;
  const myEntry = (_a = participants.find((p) => p.user_id === (user == null ? void 0 : user.id))) != null ? _a : null;
  const myPaid = !!(myEntry == null ? void 0 : myEntry.paid);
  const taken = participants.length;
  const paidCount = participants.filter((p) => p.paid).length;
  const full = !!game && taken >= game.slots_total;
  const pct = game ? Math.round(taken / game.slots_total * 100) : 0;
  const needed = game ? Math.max(0, game.slots_total - taken) : 0;
  const startMs = game ? new Date(game.starts_at).getTime() : 0;
  const hoursToStart = game ? (startMs - Date.now()) / 36e5 : Infinity;
  const startingSoon = hoursToStart > 0 && hoursToStart <= 6;
  const almostFull = !full && needed > 0 && needed <= 2;
  const isFree = !!game && game.price_per_player === 0;
  const status = full ? {
    label: "\u0421\u043E\u0441\u0442\u0430\u0432 \u0441\u043E\u0431\u0440\u0430\u043D",
    cls: "bg-muted text-muted-foreground"
  } : almostFull ? {
    label: `\u041D\u0443\u0436\u043D\u043E \u0435\u0449\u0451 ${needed}`,
    cls: "bg-orange-500/20 text-orange-100 border-orange-300/40"
  } : startingSoon ? {
    label: "\u0421\u043A\u043E\u0440\u043E \u0441\u0442\u0430\u0440\u0442",
    cls: "bg-amber-400/20 text-amber-50 border-amber-200/40"
  } : taken === 0 ? {
    label: "\u041D\u043E\u0432\u0430\u044F \u0438\u0433\u0440\u0430",
    cls: "bg-emerald-500/20 text-emerald-50 border-emerald-300/40"
  } : {
    label: "\u0418\u0434\u0451\u0442 \u043D\u0430\u0431\u043E\u0440",
    cls: "bg-white/15 text-white border-white/30"
  };
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [makePublicOpen, setMakePublicOpen] = useState(false);
  const [makingPublic, setMakingPublic] = useState(false);
  const confirmMakePublic = async () => {
    if (!game) return;
    setMakingPublic(true);
    const {
      error
    } = await supabase.from("games").update({
      is_private: false
    }).eq("id", game.id);
    setMakingPublic(false);
    setMakePublicOpen(false);
    if (error) toast.error(error.message);
    else {
      toast.success("\u0418\u0433\u0440\u0430 \u0442\u0435\u043F\u0435\u0440\u044C \u043E\u0431\u0449\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
      setGame({
        ...game,
        is_private: false
      });
    }
  };
  const payForMe = async () => {
    if (!myEntry) return;
    setPaying(true);
    await new Promise((r) => setTimeout(r, 900));
    const {
      error
    } = await supabase.from("game_participants").update({
      paid: true
    }).eq("id", myEntry.id);
    setPaying(false);
    setPayOpen(false);
    if (error) toast.error(error.message);
    else {
      toast.success("\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u0440\u043E\u0448\u043B\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u2713");
      loadParticipants();
    }
  };
  const join = async () => {
    if (!user) {
      navigate({
        to: "/auth"
      });
      return;
    }
    if (!game) return;
    setJoining(true);
    const {
      error
    } = await supabase.from("game_participants").insert({
      game_id: game.id,
      user_id: user.id
    });
    setJoining(false);
    if (error) toast.error(error.message);
    else toast.success("\u0422\u044B \u0432 \u043A\u043E\u043C\u0430\u043D\u0434\u0435!");
  };
  const leave = async () => {
    if (!user || !game) return;
    setJoining(true);
    const {
      error
    } = await supabase.from("game_participants").delete().eq("game_id", game.id).eq("user_id", user.id);
    setJoining(false);
    if (error) toast.error(error.message);
    else toast.info("\u0422\u044B \u0432\u044B\u0448\u0435\u043B \u0438\u0437 \u043A\u043E\u043C\u0430\u043D\u0434\u044B");
  };
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsx("div", { className: "container mx-auto p-6", children: /* @__PURE__ */ jsx(Skeleton, { className: "h-64 w-full rounded-3xl" }) })
    ] });
  }
  if (!game) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsxs("div", { className: "container mx-auto p-12 text-center", children: [
        /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "\u0418\u0433\u0440\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsx(Button, { asChild: true, className: "mt-4", children: /* @__PURE__ */ jsx(Link, { to: "/games", children: "\u041A \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443" }) })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden bg-gradient-hero pb-10 pt-8 md:pb-16 md:pt-12", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,white,transparent_55%)] opacity-20" }),
      /* @__PURE__ */ jsxs("div", { className: "relative container mx-auto max-w-full px-4 sm:px-6", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/games", className: "inline-flex items-center gap-2 text-sm text-white/80 hover:text-white", children: [
          /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }),
          " \u041A \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 md:mt-6 md:flex md:items-end md:justify-between md:gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "mb-2 flex flex-wrap items-center gap-1.5 md:mb-3 md:gap-2", children: [
              isOrganizer && /* @__PURE__ */ jsx(Badge, { className: "border-white/30 bg-white/20 text-white", children: "\u0422\u044B \u2014 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440" }),
              /* @__PURE__ */ jsx(Badge, { className: "border-white/30 bg-white/10 text-white", children: game.sport }),
              /* @__PURE__ */ jsx(Badge, { className: `border ${status.cls}`, children: status.label }),
              isFree && /* @__PURE__ */ jsx(Badge, { className: "border-emerald-300/40 bg-emerald-500/20 text-emerald-50", children: "\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E" }),
              game.is_private && /* @__PURE__ */ jsxs(Badge, { className: "gap-1 border-white/30 bg-white/20 text-white", children: [
                /* @__PURE__ */ jsx(Lock, { className: "h-3 w-3" }),
                " \u041F\u0440\u0438\u0432\u0430\u0442\u043D\u0430\u044F"
              ] }),
              /* @__PURE__ */ jsxs(Badge, { className: "border-white/30 bg-white/15 text-white md:hidden", children: [
                /* @__PURE__ */ jsx(Star, { className: "mr-1 h-3 w-3 fill-current" }),
                " ",
                game.level
              ] }),
              isOrganizer && game.is_private && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "secondary", className: "h-7 gap-1 rounded-full bg-white/90 px-3 text-xs text-foreground hover:bg-white", onClick: () => setMakePublicOpen(true), children: [
                /* @__PURE__ */ jsx(Globe, { className: "h-3 w-3" }),
                " \u0421\u0434\u0435\u043B\u0430\u0442\u044C \u043E\u0431\u0449\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439"
              ] })
            ] }),
            /* @__PURE__ */ jsx("h1", { className: "break-words font-display text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl lg:text-5xl", children: (_b = game.stadium) == null ? void 0 : _b.name }),
            /* @__PURE__ */ jsxs("p", { className: "mt-2 flex items-start gap-2 text-sm text-white/80 sm:items-center sm:text-base", children: [
              /* @__PURE__ */ jsx(MapPin, { className: "mt-0.5 h-4 w-4 shrink-0 sm:mt-0" }),
              /* @__PURE__ */ jsx("span", { className: "min-w-0 break-words", children: (_c = game.stadium) == null ? void 0 : _c.address })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "hidden shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-white backdrop-blur-md md:flex", children: [
            /* @__PURE__ */ jsx(Star, { className: "h-4 w-4 fill-white" }),
            " ",
            game.level
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 sm:px-6 pb-12 pt-6 md:pb-16 md:pt-10", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid gap-8 lg:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-6 lg:col-span-2", children: [
          (almostFull || startingSoon || full) && !isOrganizer && !isJoined && /* @__PURE__ */ jsxs("div", { className: `flex items-center gap-3 rounded-2xl border p-4 ${full ? "border-border bg-muted/40 text-muted-foreground" : almostFull ? "border-orange-300/60 bg-orange-500/10 text-orange-700 dark:text-orange-300" : "border-amber-300/60 bg-amber-500/10 text-amber-800 dark:text-amber-200"}`, children: [
            full ? /* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5" }) : almostFull ? /* @__PURE__ */ jsx(Flame, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(Zap, { className: "h-5 w-5" }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: full ? "\u0421\u043E\u0441\u0442\u0430\u0432 \u0443\u0436\u0435 \u0441\u043E\u0431\u0440\u0430\u043D" : almostFull ? `\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0432\u0441\u0435\u0433\u043E ${needed} ${needed === 1 ? "\u043C\u0435\u0441\u0442\u043E" : "\u043C\u0435\u0441\u0442\u0430"} \u2014 \u0443\u0441\u043F\u0435\u0439 \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F` : `\u0418\u0433\u0440\u0430 \u043D\u0430\u0447\u043D\u0451\u0442\u0441\u044F \u0447\u0435\u0440\u0435\u0437 ${Math.max(1, Math.round(hoursToStart))} \u0447 \u2014 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u0441\u043A\u043E\u0440\u0435\u0435` }),
              /* @__PURE__ */ jsx("p", { className: "text-xs opacity-80", children: full ? "\u0417\u0430\u0433\u043B\u044F\u043D\u0438 \u0432 \u043F\u043E\u0445\u043E\u0436\u0438\u0435 \u0438\u0433\u0440\u044B \u043D\u0438\u0436\u0435." : "\u0418\u0433\u0440\u043E\u043A\u0438 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0431\u044B\u0441\u0442\u0440\u043E." })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-4 shadow-elegant sm:p-6", children: [
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4", children: [
              /* @__PURE__ */ jsx(Stat, { icon: Calendar, label: "\u0414\u0430\u0442\u0430", value: fmtDate(game.starts_at) }),
              /* @__PURE__ */ jsx(Stat, { icon: Clock, label: "\u0412\u0440\u0435\u043C\u044F", value: `${fmtTime(game.starts_at)}\u2013${fmtTime(game.ends_at)}` }),
              /* @__PURE__ */ jsx(Stat, { icon: Users, label: "\u0421\u043E\u0441\u0442\u0430\u0432", value: `${taken}/${game.slots_total}` }),
              /* @__PURE__ */ jsx(Stat, { icon: Star, label: "\u0421\u043E\u0431\u0440\u0430\u043D\u043E", value: `${paidCount * game.price_per_player} / ${game.slots_total * game.price_per_player} \u20BD` })
            ] }),
            (isJoined || isOrganizer) && /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0438\u0433\u0440\u043E\u043A\u043E\u0432? \u041F\u0440\u0438\u0433\u043B\u0430\u0441\u0438 \u0434\u0440\u0443\u0433\u0430 \u043F\u043E \u043D\u0438\u043A\u043D\u0435\u0439\u043C\u0443." }),
              /* @__PURE__ */ jsx(InviteFriendButton, { gameId: game.id, userId: user.id })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card", children: [
            /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-bold", children: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430" }),
            /* @__PURE__ */ jsx("div", { className: "mt-5 h-2 w-full overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsx("div", { className: "h-full rounded-full bg-gradient-brand transition-all", style: {
              width: `${pct}%`
            } }) }),
            /* @__PURE__ */ jsxs("ul", { className: "mt-6 space-y-2", children: [
              participants.map((p) => {
                var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j2, _k, _l, _m;
                const mine = p.user_id === (user == null ? void 0 : user.id);
                const canTogglePaid = mine || isOrganizer;
                const gameOver = new Date(game.ends_at).getTime() < Date.now();
                const canRate = !mine && !!user && (isJoined || isOrganizer) && gameOver;
                const nameNode = ((_a2 = p.profile) == null ? void 0 : _a2.username) ? /* @__PURE__ */ jsx(Link, { to: "/u/$username", params: {
                  username: p.profile.username
                }, className: "text-sm font-semibold hover:underline", children: (_c2 = (_b2 = p.profile) == null ? void 0 : _b2.display_name) != null ? _c2 : `@${p.profile.username}` }) : /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: (_e2 = (_d2 = p.profile) == null ? void 0 : _d2.display_name) != null ? _e2 : "\u0418\u0433\u0440\u043E\u043A" });
                return /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-brand font-display text-sm font-bold text-primary-foreground", children: ((_i2 = (_h2 = (_f2 = p.profile) == null ? void 0 : _f2.display_name) != null ? _h2 : (_g2 = p.profile) == null ? void 0 : _g2.username) != null ? _i2 : "?").slice(0, 1).toUpperCase() }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsxs("p", { children: [
                        nameNode,
                        mine && /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: " (\u0442\u044B)" })
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: p.paid ? "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E" : "\u041D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E" })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    canRate && /* @__PURE__ */ jsx(RatePlayerButton, { gameId: game.id, rateeId: p.user_id, rateeName: (_m = (_l = (_j2 = p.profile) == null ? void 0 : _j2.display_name) != null ? _l : (_k = p.profile) == null ? void 0 : _k.username) != null ? _m : "\u0438\u0433\u0440\u043E\u043A\u0430" }),
                    canTogglePaid && /* @__PURE__ */ jsx(Button, { size: "sm", variant: p.paid ? "outline" : "default", className: p.paid ? "" : "bg-gradient-brand text-primary-foreground hover:opacity-90", onClick: async () => {
                      const {
                        error
                      } = await supabase.from("game_participants").update({
                        paid: !p.paid
                      }).eq("id", p.id);
                      if (error) toast.error(error.message);
                      else {
                        toast.success(p.paid ? "\u041E\u043F\u043B\u0430\u0442\u0430 \u0441\u043D\u044F\u0442\u0430" : isOrganizer && !mine ? "\u0414\u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u0437\u0430 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430" : "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E");
                        loadParticipants();
                      }
                    }, children: p.paid ? "\u0421\u043D\u044F\u0442\u044C \u043E\u0442\u043C\u0435\u0442\u043A\u0443" : isOrganizer && !mine ? "\u0414\u043E\u043F\u043B\u0430\u0442\u0438\u0442\u044C" : "\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C" })
                  ] })
                ] }, p.id);
              }),
              Array.from({
                length: Math.max(0, game.slots_total - taken)
              }).map((_, i) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground", children: [
                /* @__PURE__ */ jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-dashed border-border", children: "+" }),
                "\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u0435 \u043C\u0435\u0441\u0442\u043E"
              ] }, `e${i}`))
            ] })
          ] }),
          organizer && /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card", children: [
            /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-bold", children: "\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440" }),
            /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center gap-4", children: [
              /* @__PURE__ */ jsxs(Avatar, { className: "h-14 w-14", children: [
                /* @__PURE__ */ jsx(AvatarImage, { src: (_d = organizer.avatar_url) != null ? _d : void 0 }),
                /* @__PURE__ */ jsx(AvatarFallback, { className: "bg-gradient-brand font-display text-base font-bold text-primary-foreground", children: initials((_e = organizer.display_name) != null ? _e : organizer.username) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                  organizer.username ? /* @__PURE__ */ jsx(Link, { to: "/u/$username", params: {
                    username: organizer.username
                  }, className: "font-display text-base font-semibold hover:underline", children: (_f = organizer.display_name) != null ? _f : `@${organizer.username}` }) : /* @__PURE__ */ jsx("span", { className: "font-display text-base font-semibold", children: (_g = organizer.display_name) != null ? _g : "\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440" }),
                  organizer.phone_verified && /* @__PURE__ */ jsxs(Badge, { className: "gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400", children: [
                    /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3" }),
                    " \u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", children: [
                  /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
                    /* @__PURE__ */ jsx(Star, { className: "h-3.5 w-3.5 fill-amber-400 text-amber-400" }),
                    organizer.ratings_count > 0 ? `${organizer.rating.toFixed(1)} \xB7 ${organizer.ratings_count} \u043E\u0442\u0437\u044B\u0432${organizer.ratings_count === 1 ? "" : organizer.ratings_count < 5 ? "\u0430" : "\u043E\u0432"}` : "\u0411\u0435\u0437 \u043E\u0442\u0437\u044B\u0432\u043E\u0432"
                  ] }),
                  /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
                    /* @__PURE__ */ jsx(Trophy, { className: "h-3.5 w-3.5 text-primary" }),
                    organizer.games_count,
                    " \u043F\u0440\u043E\u0432\u0435\u0434."
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "mt-4 text-xs text-muted-foreground", children: "\u041E\u043F\u044B\u0442\u043D\u044B\u0435 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u044B \u0434\u0435\u0440\u0436\u0430\u0442 \u0441\u043E\u0441\u0442\u0430\u0432 \u0438 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0430\u044E\u0442 \u043E\u0431 \u043E\u0442\u043C\u0435\u043D\u0435 \u0437\u0430\u0440\u0430\u043D\u0435\u0435." }),
            user && !isOrganizer && organizer.id && /* @__PURE__ */ jsx(Button, { asChild: true, variant: "outline", size: "sm", className: "mt-4 w-full sm:w-auto", children: /* @__PURE__ */ jsxs(Link, { to: "/friends/$friendId", params: {
              friendId: organizer.id
            }, children: [
              /* @__PURE__ */ jsx(MessageCircle, { className: "mr-1.5 h-4 w-4" }),
              "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u0443"
            ] }) })
          ] }),
          game.description && /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card", children: [
            /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-bold", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }),
            /* @__PURE__ */ jsx("p", { className: "mt-3 whitespace-pre-line text-sm text-muted-foreground", children: game.description })
          ] }),
          (isJoined || isOrganizer) && new Date(game.ends_at).getTime() < Date.now() && /* @__PURE__ */ jsx(GoalClaimsBlock, { gameId: game.id, userId: user.id, participants, organizerId: game.organizer_id }),
          (isJoined || isOrganizer) && /* @__PURE__ */ jsx(GameChat, { gameId: game.id, userId: user.id })
        ] }),
        /* @__PURE__ */ jsxs("aside", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "sticky top-24 rounded-3xl border border-border bg-card p-6 shadow-elegant", children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-widest text-muted-foreground", children: "\u0437\u0430 \u0438\u0433\u0440\u043E\u043A\u0430" }),
            /* @__PURE__ */ jsxs("p", { className: "mt-1 font-display text-4xl font-bold", children: [
              game.price_per_player,
              " ",
              /* @__PURE__ */ jsx("span", { className: "text-2xl", children: "\u20BD" })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "\u0421\u0443\u043C\u043C\u0430 \u0434\u0435\u043B\u0438\u0442\u0441\u044F \u043C\u0435\u0436\u0434\u0443 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430\u043C\u0438. \u041E\u043F\u043B\u0430\u0442\u0430 \u0443\u0445\u043E\u0434\u0438\u0442 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0441\u0442\u0430\u0434\u0438\u043E\u043D\u0430." }),
            !user ? /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", className: "mt-6 w-full bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsx(Link, { to: "/auth", children: "\u0412\u043E\u0439\u0442\u0438 \u0438 \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F" }) }) : isJoined ? /* @__PURE__ */ jsxs("div", { className: "mt-6 space-y-2", children: [
              myPaid ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary", children: [
                /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4" }),
                " \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E"
              ] }) : /* @__PURE__ */ jsxs(Button, { onClick: () => setPayOpen(true), size: "lg", className: "w-full bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
                /* @__PURE__ */ jsx(CreditCard, { className: "h-4 w-4" }),
                " \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C ",
                game.price_per_player,
                " \u20BD"
              ] }),
              /* @__PURE__ */ jsx(Button, { onClick: leave, disabled: joining, variant: "outline", size: "sm", className: "w-full", children: "\u0412\u044B\u0439\u0442\u0438 \u0438\u0437 \u043A\u043E\u043C\u0430\u043D\u0434\u044B" })
            ] }) : isOrganizer ? /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", variant: "outline", className: "mt-6 w-full", children: /* @__PURE__ */ jsx(Link, { to: "/games", children: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043A \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443" }) }) : /* @__PURE__ */ jsx(Button, { onClick: join, disabled: joining || full, size: "lg", className: "mt-6 w-full bg-gradient-brand text-primary-foreground hover:opacity-90", children: full ? "\u041C\u0435\u0441\u0442 \u043D\u0435\u0442" : "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F" }),
            /* @__PURE__ */ jsx("p", { className: "mt-3 text-center text-xs text-muted-foreground", children: "\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u0430\u044F \u0441\u0434\u0435\u043B\u043A\u0430 \xB7 \u0412\u043E\u0437\u0432\u0440\u0430\u0442 \u043F\u0440\u0438 \u043E\u0442\u043C\u0435\u043D\u0435" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-5 shadow-card", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-display text-sm font-bold uppercase tracking-wider text-muted-foreground", children: "\u0413\u0430\u0440\u0430\u043D\u0442\u0438\u0438" }),
            /* @__PURE__ */ jsxs("ul", { className: "mt-3 space-y-3 text-sm", children: [
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(ShieldCheck, { className: "mt-0.5 h-4 w-4 shrink-0 text-emerald-600" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "font-semibold", children: "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0435 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u044B" }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D \u0438 \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u0438\u0433\u0440 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u044B." })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(RefreshCw, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "font-semibold", children: "\u0412\u043E\u0437\u0432\u0440\u0430\u0442 \u043F\u0440\u0438 \u043E\u0442\u043C\u0435\u043D\u0435" }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "100% \u0432\u043E\u0437\u0432\u0440\u0430\u0442, \u0435\u0441\u043B\u0438 \u0438\u0433\u0440\u0430 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u043E\u043C \u0438\u043B\u0438 \u0437\u0430 6+ \u0447\u0430\u0441\u043E\u0432 \u0434\u043E \u0441\u0442\u0430\u0440\u0442\u0430." })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsx(CalendarClock, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "font-semibold", children: "\u041D\u0430\u0434\u0451\u0436\u043D\u0430\u044F \u044F\u0432\u043A\u0430" }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u0418\u0433\u0440\u043E\u043A\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044E\u0442 \u0443\u0447\u0430\u0441\u0442\u0438\u0435 \u043E\u043F\u043B\u0430\u0442\u043E\u0439." })
                ] })
              ] })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(SimilarGames, { currentGameId: game.id, sport: game.sport, city: (_i = (_h = game.stadium) == null ? void 0 : _h.city) != null ? _i : null })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "sticky bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl shadow-elegant lg:hidden", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground", children: full ? "\u0421\u043E\u0441\u0442\u0430\u0432 \u0441\u043E\u0431\u0440\u0430\u043D" : `\u0421\u0432\u043E\u0431\u043E\u0434\u043D\u043E ${game.slots_total - taken} \u043C\u0435\u0441\u0442` }),
        /* @__PURE__ */ jsxs("p", { className: "font-display text-xl font-bold leading-none", children: [
          game.price_per_player,
          " \u20BD",
          /* @__PURE__ */ jsx("span", { className: "ml-1 text-xs font-medium text-muted-foreground", children: "/ \u0438\u0433\u0440\u043E\u043A" })
        ] })
      ] }),
      !user ? /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsx(Link, { to: "/auth", children: "\u0412\u043E\u0439\u0442\u0438" }) }) : isJoined ? myPaid ? /* @__PURE__ */ jsxs(Button, { disabled: true, size: "lg", variant: "outline", className: "gap-1", children: [
        /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4" }),
        " \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E"
      ] }) : /* @__PURE__ */ jsxs(Button, { onClick: () => setPayOpen(true), size: "lg", className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
        /* @__PURE__ */ jsx(CreditCard, { className: "h-4 w-4" }),
        " \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C"
      ] }) : isOrganizer ? /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", variant: "outline", children: /* @__PURE__ */ jsx(Link, { to: "/games", children: "\u041A \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443" }) }) : /* @__PURE__ */ jsx(Button, { onClick: join, disabled: joining || full, size: "lg", className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: full ? "\u041C\u0435\u0441\u0442 \u043D\u0435\u0442" : "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F" })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: makePublicOpen, onOpenChange: setMakePublicOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { className: "font-display text-2xl", children: "\u0421\u0434\u0435\u043B\u0430\u0442\u044C \u0438\u0433\u0440\u0443 \u043E\u0431\u0449\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439?" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "\u0418\u0433\u0440\u0430 \u0441\u0442\u0430\u043D\u0435\u0442 \u0432\u0438\u0434\u043D\u0430 \u0432\u0441\u0435\u043C \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u0438 \u043F\u043E\u0438\u0441\u043A\u0435. \u041B\u044E\u0431\u043E\u0439 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441\u043C\u043E\u0436\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F. \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u044D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u043B\u044C\u0437\u044F." })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { className: "gap-2 sm:gap-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setMakePublicOpen(false), disabled: makingPublic, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsxs(Button, { onClick: confirmMakePublic, disabled: makingPublic, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
          makingPublic ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Globe, { className: "h-4 w-4" }),
          "\u0421\u0434\u0435\u043B\u0430\u0442\u044C \u043E\u0431\u0449\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0439"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: payOpen, onOpenChange: setPayOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { className: "font-display text-2xl", children: "\u041E\u043F\u043B\u0430\u0442\u0430 \u0443\u0447\u0430\u0441\u0442\u0438\u044F" }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          (_j = game.stadium) == null ? void 0 : _j.name,
          " \xB7 ",
          fmtDate(game.starts_at),
          " \xB7 ",
          fmtTime(game.starts_at)
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4 py-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-baseline justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3", children: [
          /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "\u041A \u043E\u043F\u043B\u0430\u0442\u0435" }),
          /* @__PURE__ */ jsxs("span", { className: "font-display text-2xl font-bold", children: [
            game.price_per_player,
            " \u20BD"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "card", children: "\u041D\u043E\u043C\u0435\u0440 \u043A\u0430\u0440\u0442\u044B" }),
          /* @__PURE__ */ jsx(Input, { id: "card", placeholder: "4242 4242 4242 4242", defaultValue: "4242 4242 4242 4242" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "exp", children: "\u0421\u0440\u043E\u043A" }),
            /* @__PURE__ */ jsx(Input, { id: "exp", placeholder: "12/28", defaultValue: "12/28" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "cvc", children: "CVC" }),
            /* @__PURE__ */ jsx(Input, { id: "cvc", placeholder: "123", defaultValue: "123" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-center text-xs text-muted-foreground", children: "\u042D\u0442\u043E \u0434\u0435\u043C\u043E-\u043E\u043F\u043B\u0430\u0442\u0430. \u0420\u0435\u0430\u043B\u044C\u043D\u043E\u0435 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0435 \u043F\u0440\u043E\u0438\u0437\u043E\u0439\u0434\u0451\u0442." })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setPayOpen(false), disabled: paying, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsx(Button, { onClick: payForMe, disabled: paying, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: paying ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }),
          " \u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430\u2026"
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(CreditCard, { className: "h-4 w-4" }),
          " \u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C"
        ] }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
function Stat({
  icon: Icon,
  label,
  value
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 sm:gap-3", children: [
    /* @__PURE__ */ jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow sm:h-11 sm:w-11 sm:rounded-2xl", children: /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4 sm:h-5 sm:w-5" }) }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
      /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs", children: label }),
      /* @__PURE__ */ jsx("p", { className: "break-words font-display text-sm font-semibold leading-tight sm:text-base", children: value })
    ] })
  ] });
}
function GameChat({
  gameId,
  userId
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const load = async () => {
    const {
      data,
      error
    } = await supabase.from("game_messages").select("id, user_id, body, image_url, created_at").eq("game_id", gameId).order("created_at", {
      ascending: true
    });
    if (error || !data) {
      setMessages([]);
      return;
    }
    const ids = Array.from(new Set(data.map((m) => m.user_id)));
    const map = /* @__PURE__ */ new Map();
    if (ids.length > 0) {
      const {
        data: profs
      } = await supabase.from("profiles").select("id, display_name, avatar_url, username").in("id", ids);
      (profs != null ? profs : []).forEach((p) => map.set(p.id, {
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        username: p.username
      }));
    }
    setMessages(data.map((m) => {
      var _a;
      return {
        ...m,
        profile: (_a = map.get(m.user_id)) != null ? _a : null
      };
    }));
  };
  useEffect(() => {
    load();
    const ch = supabase.channel(`game-${gameId}-chat`).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "game_messages",
      filter: `game_id=eq.${gameId}`
    }, () => load()).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId]);
  useEffect(() => {
    var _a;
    (_a = scrollRef.current) == null ? void 0 : _a.scrollTo({
      top: scrollRef.current.scrollHeight
    });
  }, [messages.length]);
  const pickImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("\u0422\u043E\u043B\u044C\u043A\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 (\u043C\u0430\u043A\u0441. 5 \u041C\u0411)");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };
  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const send = async (e) => {
    var _a;
    e.preventDefault();
    const body = text.trim();
    if (!body && !imageFile) return;
    setUploading(true);
    let image_url = null;
    try {
      if (imageFile) {
        const ext = ((_a = imageFile.name.split(".").pop()) == null ? void 0 : _a.toLowerCase()) || "jpg";
        const path = `${gameId}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const {
          error: upErr
        } = await supabase.storage.from("chat-images").upload(path, imageFile, {
          contentType: imageFile.type,
          upsert: false
        });
        if (upErr) {
          toast.error(upErr.message);
          setUploading(false);
          return;
        }
        image_url = supabase.storage.from("chat-images").getPublicUrl(path).data.publicUrl;
      }
      const {
        error
      } = await supabase.from("game_messages").insert({
        game_id: gameId,
        user_id: userId,
        body: body || null,
        image_url
      });
      if (error) {
        toast.error(error.message);
      } else {
        setText("");
        clearImage();
      }
    } finally {
      setUploading(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(MessageCircle, { className: "h-5 w-5 text-primary" }),
      /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-bold", children: "\u0427\u0430\u0442 \u0438\u0433\u0440\u044B" })
    ] }),
    /* @__PURE__ */ jsxs("div", { ref: scrollRef, className: "mt-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-muted/40 p-4", children: [
      messages.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-center text-sm text-muted-foreground", children: "\u041D\u0430\u043F\u0438\u0448\u0438 \u043F\u0435\u0440\u0432\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u0435 \u{1F44B}" }),
      messages.map((m) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const mine = m.user_id === userId;
        const name = (_d = (_c = (_a = m.profile) == null ? void 0 : _a.display_name) != null ? _c : (_b = m.profile) == null ? void 0 : _b.username) != null ? _d : "\u0418\u0433\u0440\u043E\u043A";
        const handle = ((_e = m.profile) == null ? void 0 : _e.username) ? `@${m.profile.username}` : null;
        return /* @__PURE__ */ jsxs("div", { className: `flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`, children: [
          !mine && /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8 shrink-0", children: [
            ((_f = m.profile) == null ? void 0 : _f.avatar_url) && /* @__PURE__ */ jsx(AvatarImage, { src: m.profile.avatar_url, alt: name }),
            /* @__PURE__ */ jsx(AvatarFallback, { className: "text-xs", children: initials(name) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: `min-w-0 max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-gradient-brand text-primary-foreground" : "bg-card border border-border"}`, style: {
            overflowWrap: "anywhere",
            wordBreak: "break-word"
          }, children: [
            /* @__PURE__ */ jsxs("p", { className: `text-xs font-semibold ${mine ? "opacity-80" : "opacity-70"}`, children: [
              mine ? "\u0412\u044B" : name,
              handle && !mine && /* @__PURE__ */ jsx("span", { className: "ml-1 font-normal opacity-70", children: handle })
            ] }),
            m.image_url && /* @__PURE__ */ jsx("a", { href: m.image_url, target: "_blank", rel: "noopener noreferrer", className: "mt-1 block", children: /* @__PURE__ */ jsx("img", { src: m.image_url, alt: "\u0424\u043E\u0442\u043E \u0432 \u0447\u0430\u0442\u0435", className: "max-h-64 w-auto max-w-full rounded-xl border border-border/50 object-cover", loading: "lazy" }) }),
            m.body && /* @__PURE__ */ jsx("p", { className: "mt-0.5 whitespace-pre-wrap text-[13px] leading-snug", style: {
              overflowWrap: "anywhere",
              wordBreak: "break-word"
            }, children: m.body })
          ] }),
          mine && /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8 shrink-0", children: [
            ((_g = m.profile) == null ? void 0 : _g.avatar_url) && /* @__PURE__ */ jsx(AvatarImage, { src: m.profile.avatar_url, alt: name }),
            /* @__PURE__ */ jsx(AvatarFallback, { className: "text-xs", children: initials(name) })
          ] })
        ] }, m.id);
      })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: send, className: "mt-4 space-y-2", children: [
      imagePreview && /* @__PURE__ */ jsxs("div", { className: "relative inline-block", children: [
        /* @__PURE__ */ jsx("img", { src: imagePreview, alt: "\u041F\u0440\u0435\u0432\u044C\u044E", className: "max-h-32 rounded-xl border border-border" }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: clearImage, className: "absolute -right-2 -top-2 rounded-full bg-background p-1 shadow-md ring-1 ring-border hover:bg-muted", "aria-label": "\u0423\u0431\u0440\u0430\u0442\u044C \u0444\u043E\u0442\u043E", children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-2", children: [
        /* @__PURE__ */ jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", className: "hidden", onChange: (e) => {
          var _a, _b;
          return pickImage((_b = (_a = e.target.files) == null ? void 0 : _a[0]) != null ? _b : null);
        } }),
        /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", size: "lg", onClick: () => {
          var _a;
          return (_a = fileInputRef.current) == null ? void 0 : _a.click();
        }, disabled: uploading, "aria-label": "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0444\u043E\u0442\u043E", children: /* @__PURE__ */ jsx(ImagePlus, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), onKeyDown: (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(e);
          }
        }, placeholder: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u0435\u2026", rows: 1, className: "flex min-h-11 max-h-[8.25rem] w-full resize-none overflow-y-auto rounded-md border border-input bg-background px-3 py-2.5 font-mono text-[13px] leading-snug ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" }),
        /* @__PURE__ */ jsx(Button, { type: "submit", size: "lg", disabled: uploading || !text.trim() && !imageFile, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: uploading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Send, { className: "h-4 w-4" }) })
      ] })
    ] })
  ] });
}
function RatePlayerButton({
  gameId,
  rateeId,
  rateeName
}) {
  const {
    user
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!open || !user || loaded) return;
    (async () => {
      var _a;
      const {
        data
      } = await supabase.from("user_ratings").select("id, score, comment").eq("rater_id", user.id).eq("ratee_id", rateeId).eq("game_id", gameId).maybeSingle();
      if (data) {
        setExisting(data);
        setScore(data.score);
        setComment((_a = data.comment) != null ? _a : "");
      }
      setLoaded(true);
    })();
  }, [open, user, rateeId, gameId, loaded]);
  const submit = async () => {
    if (!user) return;
    setSaving(true);
    if (existing) {
      const {
        error
      } = await supabase.from("user_ratings").update({
        score,
        comment: comment.trim() || null
      }).eq("id", existing.id);
      setSaving(false);
      if (error) toast.error(error.message);
      else {
        toast.success("\u041E\u0446\u0435\u043D\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0430");
        setOpen(false);
      }
    } else {
      const {
        error
      } = await supabase.from("user_ratings").insert({
        rater_id: user.id,
        ratee_id: rateeId,
        game_id: gameId,
        score,
        comment: comment.trim() || null
      });
      setSaving(false);
      if (error) toast.error(error.message);
      else {
        toast.success("\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u043E\u0446\u0435\u043D\u043A\u0443!");
        setExisting({
          id: "tmp",
          score,
          comment: comment.trim() || null
        });
        setOpen(false);
      }
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => setOpen(true), children: [
      /* @__PURE__ */ jsx(Star, { className: "mr-1 h-3.5 w-3.5" }),
      " \u041E\u0446\u0435\u043D\u0438\u0442\u044C"
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxs(DialogTitle, { children: [
          "\u041E\u0446\u0435\u043D\u0438\u0442\u044C ",
          rateeName
        ] }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "\u041F\u043E\u0441\u0442\u0430\u0432\u044C \u043E\u0446\u0435\u043D\u043A\u0443 \u043E\u0442 1 \u0434\u043E 5 \u2014 \u044D\u0442\u043E \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 \u0440\u0435\u0439\u0442\u0438\u043D\u0433 \u0438\u0433\u0440\u043E\u043A\u0430." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex justify-center gap-1 py-2", children: [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setScore(n), "aria-label": `${n} \u0437\u0432\u0451\u0437\u0434`, children: /* @__PURE__ */ jsx(Star, { className: `h-8 w-8 transition ${n <= score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}` }) }, n)) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "rate-comment", children: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }),
        /* @__PURE__ */ jsx(Input, { id: "rate-comment", value: comment, onChange: (e) => setComment(e.target.value.slice(0, 280)), placeholder: "\u0427\u0442\u043E \u043F\u043E\u043D\u0440\u0430\u0432\u0438\u043B\u043E\u0441\u044C \u0438\u043B\u0438 \u0447\u0442\u043E \u0441\u0442\u043E\u0438\u0442 \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C", className: "mt-1 h-11", maxLength: 280 })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsx(Button, { onClick: submit, disabled: saving, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: saving ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : existing ? "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C" : "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })
      ] })
    ] }) })
  ] });
}
function InviteFriendButton({
  gameId,
  userId
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [friends, setFriends] = useState(null);
  const [friendQuery, setFriendQuery] = useState("");
  const [selected, setSelected] = useState({});
  const inviteLink = `/games/${gameId}`;
  useEffect(() => {
    if (!open || friends !== null) return;
    (async () => {
      const {
        data: rows
      } = await supabase.from("friendships").select("requester_id, addressee_id, status").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).eq("status", "accepted");
      const ids = Array.from(new Set((rows != null ? rows : []).map((r) => r.requester_id === userId ? r.addressee_id : r.requester_id).filter((id) => id !== userId)));
      if (!ids.length) {
        setFriends([]);
        return;
      }
      const {
        data: ps
      } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids);
      setFriends(ps != null ? ps : []);
    })();
  }, [open, friends, userId]);
  const filteredFriends = (friends != null ? friends : []).filter((f) => {
    var _a, _b;
    const q = friendQuery.trim().toLowerCase();
    if (!q) return true;
    return ((_a = f.display_name) != null ? _a : "").toLowerCase().includes(q) || ((_b = f.username) != null ? _b : "").toLowerCase().includes(q);
  });
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("\u0421\u0441\u044B\u043B\u043A\u0430 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0430");
    } catch {
      toast.error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C");
    }
  };
  const sendBatchInvite = async (targets) => {
    if (!targets.length) return;
    setBusy(true);
    const rows = targets.map((t) => {
      var _a;
      return {
        game_id: gameId,
        user_id: userId,
        body: `@${(_a = t.username) != null ? _a : ""} \u2014 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0430\u044E \u0442\u0435\u0431\u044F \u0432 \u0438\u0433\u0440\u0443! ${inviteLink}`
      };
    });
    const {
      error
    } = await supabase.from("game_messages").insert(rows);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(targets.length === 1 ? `\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0432 \u0447\u0430\u0442 \u0438\u0433\u0440\u044B` : `\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0439: ${targets.length}`);
    setSelected({});
  };
  const sendInvite = async () => {
    var _a;
    const picked = (friends != null ? friends : []).filter((f) => selected[f.id]);
    if (picked.length) {
      await sendBatchInvite(picked);
      if (!username.trim()) {
        setOpen(false);
        return;
      }
    }
    const handle = username.trim().replace(/^@/, "");
    if (!handle) {
      if (picked.length) setOpen(false);
      return;
    }
    setBusy(true);
    const {
      data: prof,
      error
    } = await supabase.from("profiles").select("id, display_name, username").ilike("username", handle).maybeSingle();
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    if (!prof) {
      setBusy(false);
      toast.error("\u0418\u0433\u0440\u043E\u043A \u0441 \u0442\u0430\u043A\u0438\u043C \u043D\u0438\u043A\u043D\u0435\u0439\u043C\u043E\u043C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
      return;
    }
    if (prof.id === userId) {
      setBusy(false);
      toast.error("\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u044C \u0441\u0430\u043C\u043E\u0433\u043E \u0441\u0435\u0431\u044F");
      return;
    }
    const {
      error: msgErr
    } = await supabase.from("game_messages").insert({
      game_id: gameId,
      user_id: userId,
      body: `@${prof.username} \u2014 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0430\u044E \u0442\u0435\u0431\u044F \u0432 \u0438\u0433\u0440\u0443! ${inviteLink}`
    });
    setBusy(false);
    if (msgErr) {
      toast.error(msgErr.message);
      return;
    }
    toast.success(`\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u0434\u043B\u044F ${(_a = prof.display_name) != null ? _a : "@" + prof.username} \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0432 \u0447\u0430\u0442 \u0438\u0433\u0440\u044B`);
    setUsername("");
    setOpen(false);
  };
  const initialsOf = (name, fallback) => {
    var _a;
    const src = ((_a = name != null ? name : fallback) != null ? _a : "?").trim();
    return src.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => setOpen(true), className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
      /* @__PURE__ */ jsx(UserPlus, { className: "mr-1 h-4 w-4" }),
      " \u041F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u044C \u0434\u0440\u0443\u0433\u0430"
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "\u041F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u044C \u0434\u0440\u0443\u0437\u0435\u0439" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "\u041E\u0442\u043C\u0435\u0442\u044C \u0434\u0440\u0443\u0437\u0435\u0439 \u0433\u0430\u043B\u043E\u0447\u043A\u0430\u043C\u0438 \u0438\u043B\u0438 \u0432\u0432\u0435\u0434\u0438 \u043D\u0438\u043A\u043D\u0435\u0439\u043C \u0438\u0433\u0440\u043E\u043A\u0430 \u2014 \u043C\u044B \u043E\u0441\u0442\u0430\u0432\u0438\u043C \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u0432 \u0447\u0430\u0442\u0435 \u0438\u0433\u0440\u044B." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4 py-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx(Label, { children: "\u041C\u043E\u0438 \u0434\u0440\u0443\u0437\u044C\u044F" }),
            selectedCount > 0 && /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
              "\u0412\u044B\u0431\u0440\u0430\u043D\u043E: ",
              selectedCount
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
            /* @__PURE__ */ jsx(Input, { value: friendQuery, onChange: (e) => setFriendQuery(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A \u0441\u0440\u0435\u0434\u0438 \u0434\u0440\u0443\u0437\u0435\u0439", className: "h-9 pl-9" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-border", children: friends === null ? /* @__PURE__ */ jsx("div", { className: "p-4 text-center text-sm text-muted-foreground", children: /* @__PURE__ */ jsx(Loader2, { className: "mx-auto h-4 w-4 animate-spin" }) }) : filteredFriends.length === 0 ? /* @__PURE__ */ jsx("p", { className: "p-4 text-center text-xs text-muted-foreground", children: friends.length === 0 ? "\u0423 \u0442\u0435\u0431\u044F \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0434\u0440\u0443\u0437\u0435\u0439. \u041D\u0430\u0439\u0434\u0438 \u0438\u0445 \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0414\u0440\u0443\u0437\u044C\u044F\xBB." : "\u041D\u0438\u043A\u043E\u0433\u043E \u043D\u0435 \u043D\u0430\u0448\u043B\u0438" }) : /* @__PURE__ */ jsx(ScrollArea, { className: "h-48", children: /* @__PURE__ */ jsx("ul", { className: "divide-y divide-border", children: filteredFriends.map((f) => {
            var _a, _b, _c;
            const checked = !!selected[f.id];
            return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("label", { className: "flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent/40", children: [
              /* @__PURE__ */ jsx(Checkbox, { checked, onCheckedChange: (v) => setSelected((prev) => ({
                ...prev,
                [f.id]: !!v
              })) }),
              /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8", children: [
                /* @__PURE__ */ jsx(AvatarImage, { src: (_a = f.avatar_url) != null ? _a : void 0 }),
                /* @__PURE__ */ jsx(AvatarFallback, { children: initialsOf(f.display_name, f.username) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium", children: (_c = (_b = f.display_name) != null ? _b : f.username) != null ? _c : "\u0418\u0433\u0440\u043E\u043A" }),
                f.username && /* @__PURE__ */ jsxs("p", { className: "truncate text-xs text-muted-foreground", children: [
                  "@",
                  f.username
                ] })
              ] })
            ] }) }, f.id);
          }) }) }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "invite-username", children: "\u0418\u043B\u0438 \u043F\u043E \u043D\u0438\u043A\u043D\u0435\u0439\u043C\u0443" }),
          /* @__PURE__ */ jsx(Input, { id: "invite-username", value: username, onChange: (e) => setUsername(e.target.value), placeholder: "@nickname", onKeyDown: (e) => {
            if (e.key === "Enter") sendInvite();
          } })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "\u0418\u043B\u0438 \u043F\u043E\u0434\u0435\u043B\u0438\u0441\u044C \u0441\u0441\u044B\u043B\u043A\u043E\u0439" }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(Input, { readOnly: true, value: inviteLink, className: "font-mono text-xs" }),
            /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: copyLink, children: /* @__PURE__ */ jsx(Copy, { className: "h-4 w-4" }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setOpen(false), disabled: busy, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsx(Button, { onClick: sendInvite, disabled: busy || selectedCount === 0 && !username.trim(), className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: busy ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : selectedCount > 0 ? `\u041F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u044C (${selectedCount + (username.trim() ? 1 : 0)})` : "\u041F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u0442\u044C" })
      ] })
    ] }) })
  ] });
}
function GoalClaimsBlock({
  gameId,
  userId,
  participants,
  organizerId
}) {
  const [claims, setClaims] = useState([]);
  const [adding, setAdding] = useState(false);
  const [count, setCount] = useState("1");
  const [saving, setSaving] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const teamUserIds = /* @__PURE__ */ new Set([organizerId, ...participants.map((p) => p.user_id)]);
  const isTeammate = teamUserIds.has(userId);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data
      } = await supabase.from("games").select("ends_at").eq("id", gameId).maybeSingle();
      if (cancelled) return;
      const ended = !!(data == null ? void 0 : data.ends_at) && new Date(data.ends_at).getTime() < Date.now();
      setMatchEnded(ended);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);
  const load = async () => {
    const {
      data: cs
    } = await supabase.from("goal_claims").select("id, user_id, count, status, created_at").eq("game_id", gameId).order("created_at", {
      ascending: true
    });
    const list = cs != null ? cs : [];
    if (list.length === 0) {
      setClaims([]);
      return;
    }
    const claimIds = list.map((c) => c.id);
    const userIds = Array.from(new Set(list.map((c) => c.user_id)));
    const [{
      data: aps
    }, {
      data: profs
    }] = await Promise.all([supabase.from("goal_claim_approvals").select("claim_id, approver_id").in("claim_id", claimIds), supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", userIds)]);
    const apMap = /* @__PURE__ */ new Map();
    (aps != null ? aps : []).forEach((a) => {
      var _a;
      const arr = (_a = apMap.get(a.claim_id)) != null ? _a : [];
      arr.push(a.approver_id);
      apMap.set(a.claim_id, arr);
    });
    const pMap = new Map((profs != null ? profs : []).map((p) => [p.id, {
      display_name: p.display_name,
      username: p.username,
      avatar_url: p.avatar_url
    }]));
    list.forEach((c) => {
      var _a, _b;
      c.approvals = (_a = apMap.get(c.id)) != null ? _a : [];
      c.profile = (_b = pMap.get(c.user_id)) != null ? _b : null;
    });
    setClaims([...list]);
  };
  useEffect(() => {
    load();
  }, [gameId, participants.length]);
  const myClaim = claims.find((c) => c.user_id === userId);
  const submit = async () => {
    if (!matchEnded) {
      toast.error("\u0413\u043E\u043B\u044B \u043C\u043E\u0436\u043D\u043E \u0437\u0430\u044F\u0432\u0438\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043C\u0430\u0442\u0447\u0430");
      return;
    }
    if (!isTeammate) {
      toast.error("\u0417\u0430\u044F\u0432\u0438\u0442\u044C \u0433\u043E\u043B\u044B \u043C\u043E\u0433\u0443\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u043C\u0430\u0442\u0447\u0430");
      return;
    }
    const n = parseInt(count, 10);
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      toast.error("\u041E\u0442 1 \u0434\u043E 50 \u0433\u043E\u043B\u043E\u0432");
      return;
    }
    setSaving(true);
    const {
      error
    } = await supabase.from("goal_claims").insert({
      user_id: userId,
      game_id: gameId,
      count: n
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u0417\u0430\u044F\u0432\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430. \u041F\u0430\u0440\u0442\u043D\u0451\u0440\u044B \u043C\u043E\u0433\u0443\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C.");
    setAdding(false);
    setCount("1");
    load();
  };
  const approve = async (claimId) => {
    const claim = claims.find((c) => c.id === claimId);
    if (claim && claim.user_id === userId) {
      toast.error("\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0441\u0432\u043E\u044E \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u0443\u044E \u0437\u0430\u044F\u0432\u043A\u0443");
      return;
    }
    if (!isTeammate) {
      toast.error("\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0442\u044C \u043C\u043E\u0433\u0443\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u043C\u0430\u0442\u0447\u0430");
      return;
    }
    const {
      error
    } = await supabase.from("goal_claim_approvals").insert({
      claim_id: claimId,
      approver_id: userId
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E");
    load();
  };
  const unapprove = async (claimId) => {
    const {
      error
    } = await supabase.from("goal_claim_approvals").delete().eq("claim_id", claimId).eq("approver_id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };
  const cancel = async (claimId) => {
    const {
      error
    } = await supabase.from("goal_claims").delete().eq("id", claimId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u0417\u0430\u044F\u0432\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0430");
    load();
  };
  return /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-bold", children: "\u0417\u0430\u0431\u0438\u0442\u044B\u0435 \u0433\u043E\u043B\u044B" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u041F\u0430\u0440\u0442\u043D\u0451\u0440\u044B \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044E\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442. \u041D\u0443\u0436\u043D\u043E \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 3 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0439." })
      ] }),
      isTeammate && !myClaim && !adding && matchEnded && /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => setAdding(true), className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
        /* @__PURE__ */ jsx(Star, { className: "mr-1 h-4 w-4" }),
        " \u0417\u0430\u044F\u0432\u0438\u0442\u044C \u0441\u0432\u043E\u0438 \u0433\u043E\u043B\u044B"
      ] }),
      isTeammate && !matchEnded && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u0417\u0430\u044F\u0432\u0438\u0442\u044C \u0433\u043E\u043B\u044B \u043C\u043E\u0436\u043D\u043E \u043F\u043E\u0441\u043B\u0435 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043C\u0430\u0442\u0447\u0430." })
    ] }),
    adding && /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-2xl border border-border bg-background p-4", children: [
      /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0442\u044B \u0437\u0430\u0431\u0438\u043B \u0433\u043E\u043B\u043E\u0432" }),
      /* @__PURE__ */ jsx(Input, { type: "number", min: 1, max: 50, value: count, onChange: (e) => setCount(e.target.value), className: "mt-1 h-11" }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 flex gap-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => setAdding(false), className: "flex-1", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsx(Button, { size: "sm", onClick: submit, disabled: saving, className: "flex-1 bg-gradient-brand text-primary-foreground hover:opacity-90", children: saving ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C" })
      ] })
    ] }),
    claims.length === 0 ? /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm text-muted-foreground", children: "\u041F\u043E\u043A\u0430 \u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u0437\u0430\u044F\u0432\u043B\u044F\u043B \u0433\u043E\u043B\u044B." }) : /* @__PURE__ */ jsx("ul", { className: "mt-4 space-y-2", children: claims.map((c) => {
      var _a, _b, _c, _d, _e;
      const mine = c.user_id === userId;
      const iApproved = c.approvals.includes(userId);
      const canApprove = isTeammate && !mine && c.status === "pending";
      const name = (_c = (_a = c.profile) == null ? void 0 : _a.display_name) != null ? _c : ((_b = c.profile) == null ? void 0 : _b.username) ? `@${c.profile.username}` : "\u0418\u0433\u0440\u043E\u043A";
      return /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
          /* @__PURE__ */ jsxs(Avatar, { className: "h-9 w-9", children: [
            ((_d = c.profile) == null ? void 0 : _d.avatar_url) ? /* @__PURE__ */ jsx(AvatarImage, { src: c.profile.avatar_url }) : null,
            /* @__PURE__ */ jsx(AvatarFallback, { children: initials(name) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxs("p", { className: "truncate text-sm font-semibold", children: [
              ((_e = c.profile) == null ? void 0 : _e.username) ? /* @__PURE__ */ jsx(Link, { to: "/u/$username", params: {
                username: c.profile.username
              }, className: "hover:underline", children: name }) : name,
              mine && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: " (\u0442\u044B)" })
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
              "\u0413\u043E\u043B\u043E\u0432: ",
              /* @__PURE__ */ jsx("span", { className: "font-bold text-foreground", children: c.count }),
              c.status === "approved" ? " \xB7 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E" : ` \xB7 ${c.approvals.length}/3`
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: c.status === "approved" ? /* @__PURE__ */ jsxs(Badge, { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", children: [
          /* @__PURE__ */ jsx(CheckCircle2, { className: "mr-1 h-3 w-3" }),
          " \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E"
        ] }) : canApprove ? /* @__PURE__ */ jsx(Button, { size: "sm", variant: iApproved ? "outline" : "default", className: iApproved ? "" : "bg-gradient-brand text-primary-foreground hover:opacity-90", onClick: () => iApproved ? unapprove(c.id) : approve(c.id), children: iApproved ? "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E \u0442\u043E\u0431\u043E\u0439" : "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C" }) : mine && c.status === "pending" ? /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => cancel(c.id), children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C" }) : null })
      ] }, c.id);
    }) })
  ] });
}
function SimilarGames({
  currentGameId,
  sport,
  city
}) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      let q = supabase.from("games").select("id, sport, starts_at, price_per_player, slots_total, stadium:stadiums!inner(name,address,city), participants:game_participants(count)").eq("is_private", false).eq("sport", sport).neq("id", currentGameId).gte("starts_at", (/* @__PURE__ */ new Date()).toISOString()).order("starts_at", {
        ascending: true
      }).limit(3);
      if (city) q = q.eq("stadium.city", city);
      const {
        data
      } = await q;
      setGames(data != null ? data : []);
      setLoading(false);
    })();
  }, [currentGameId, sport, city]);
  if (loading) return null;
  if (games.length === 0) return null;
  return /* @__PURE__ */ jsxs("div", { className: "mt-10", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-5 flex items-end justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl font-bold", children: "\u041F\u043E\u0445\u043E\u0436\u0438\u0435 \u0438\u0433\u0440\u044B \u0440\u044F\u0434\u043E\u043C" }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
          sport,
          city ? ` \xB7 ${city}` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsx(Button, { asChild: true, variant: "ghost", size: "sm", children: /* @__PURE__ */ jsx(Link, { to: "/games", children: "\u0412\u0441\u0435 \u0438\u0433\u0440\u044B \u2192" }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid gap-4 md:grid-cols-3", children: games.map((g) => {
      var _a, _b, _c, _d, _e;
      const taken = (_c = (_b = (_a = g.participants) == null ? void 0 : _a[0]) == null ? void 0 : _b.count) != null ? _c : 0;
      const needed = Math.max(0, g.slots_total - taken);
      const pct = Math.round(taken / g.slots_total * 100);
      return /* @__PURE__ */ jsxs(Link, { to: "/games/$gameId", params: {
        gameId: g.id
      }, className: "group rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elegant", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: g.sport }),
          /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
            new Date(g.starts_at).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short"
            }),
            " \xB7 ",
            fmtTime(g.starts_at)
          ] })
        ] }),
        /* @__PURE__ */ jsx("h3", { className: "mt-3 line-clamp-1 font-display text-lg font-bold group-hover:text-primary", children: (_d = g.stadium) == null ? void 0 : _d.name }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 line-clamp-1 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(MapPin, { className: "mr-1 inline h-3 w-3" }),
          (_e = g.stadium) == null ? void 0 : _e.address
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsx("div", { className: "h-full rounded-full bg-gradient-brand", style: {
          width: `${pct}%`
        } }) }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center justify-between text-sm", children: [
          /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5" }),
            " ",
            taken,
            "/",
            g.slots_total,
            needed > 0 && needed <= 2 && /* @__PURE__ */ jsxs("span", { className: "ml-1 text-orange-600", children: [
              "\xB7 \u043D\u0443\u0436\u043D\u043E \u0435\u0449\u0451 ",
              needed
            ] })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "font-display font-bold", children: g.price_per_player === 0 ? "\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E" : `${g.price_per_player} \u20BD` })
        ] })
      ] }, g.id);
    }) })
  ] });
}

export { GamePage as component };
//# sourceMappingURL=games_._gameId-9R3Pe5ub.mjs.map
