import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useNavigate, Link } from '@tanstack/react-router';
import { Search, MapPin, Zap, Calendar, ArrowRight, Users, ShieldCheck, Trophy, Star, Flame, Sparkles, Clock } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { u as useAuth, B as Button, s as supabase } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { h as SiteHeader, g as SiteFooter } from './SiteShell-n-2GeoU1.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import 'sonner';
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
import './Logo-DDLL_UOB.mjs';
import '@radix-ui/react-popover';

function formatNearDate(iso) {
  const d = new Date(iso);
  const today = /* @__PURE__ */ new Date();
  const tomorrow = /* @__PURE__ */ new Date();
  tomorrow.setDate(today.getDate() + 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "\u0421\u0435\u0433\u043E\u0434\u043D\u044F";
  if (same(d, tomorrow)) return "\u0417\u0430\u0432\u0442\u0440\u0430";
  return d.toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
const POPULAR_SPORTS = [{
  name: "\u0424\u0443\u0442\u0431\u043E\u043B",
  emoji: "\u26BD"
}, {
  name: "\u0411\u0430\u0441\u043A\u0435\u0442\u0431\u043E\u043B",
  emoji: "\u{1F3C0}"
}, {
  name: "\u0412\u043E\u043B\u0435\u0439\u0431\u043E\u043B",
  emoji: "\u{1F3D0}"
}, {
  name: "\u0422\u0435\u043D\u043D\u0438\u0441",
  emoji: "\u{1F3BE}"
}, {
  name: "\u041F\u0430\u0434\u0435\u043B",
  emoji: "\u{1F3D3}"
}, {
  name: "\u0424\u0443\u0442\u0437\u0430\u043B",
  emoji: "\u26BD"
}, {
  name: "\u0425\u043E\u043A\u043A\u0435\u0439",
  emoji: "\u{1F3D2}"
}, {
  name: "\u0420\u0435\u0433\u0431\u0438",
  emoji: "\u{1F3C9}"
}];
const KNOWN_SPORTS = /* @__PURE__ */ new Set(["\u0424\u0443\u0442\u0431\u043E\u043B", "\u0424\u0443\u0442\u0437\u0430\u043B", "\u0411\u0430\u0441\u043A\u0435\u0442\u0431\u043E\u043B", "\u0412\u043E\u043B\u0435\u0439\u0431\u043E\u043B", "\u041F\u043B\u044F\u0436\u043D\u044B\u0439 \u0432\u043E\u043B\u0435\u0439\u0431\u043E\u043B", "\u0425\u043E\u043A\u043A\u0435\u0439", "\u0425\u043E\u043A\u043A\u0435\u0439 \u043D\u0430 \u0442\u0440\u0430\u0432\u0435", "\u0420\u0435\u0433\u0431\u0438", "\u0410\u043C\u0435\u0440\u0438\u043A\u0430\u043D\u0441\u043A\u0438\u0439 \u0444\u0443\u0442\u0431\u043E\u043B", "\u0413\u0430\u043D\u0434\u0431\u043E\u043B", "\u0411\u0435\u0439\u0441\u0431\u043E\u043B", "\u0412\u043E\u0434\u043D\u043E\u0435 \u043F\u043E\u043B\u043E", "\u0424\u043B\u043E\u0440\u0431\u043E\u043B", "\u0424\u0440\u0438\u0441\u0431\u0438", "\u041F\u0430\u0434\u0435\u043B", "\u0422\u0435\u043D\u043D\u0438\u0441"]);
function resolveSport(input) {
  const trim = input.trim();
  if (!trim) return null;
  const exact = Array.from(KNOWN_SPORTS).find((s) => s.toLowerCase() === trim.toLowerCase());
  return exact != null ? exact : null;
}
function HomePage() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const submitSearch = (e) => {
    e.preventDefault();
    const search = {};
    const sport = resolveSport(q);
    const trimmedQ = q.trim();
    const trimmedCity = city.trim();
    if (sport) {
      search.sport = sport;
    } else if (trimmedQ) {
      search.stadium = trimmedQ;
    }
    if (trimmedCity && !search.stadium) {
      search.q = trimmedCity;
    } else if (trimmedCity) {
      search.q = trimmedCity;
    }
    navigate({
      to: "/games",
      search
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-hero" }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)] opacity-20" }),
      /* @__PURE__ */ jsxs("div", { className: "relative container mx-auto grid gap-10 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-12 md:gap-12 md:pb-20 md:pt-20 lg:pb-24", children: [
        /* @__PURE__ */ jsxs("div", { className: "md:col-span-7", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-md", children: [
            /* @__PURE__ */ jsxs("span", { className: "relative flex h-2 w-2", children: [
              /* @__PURE__ */ jsx("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" }),
              /* @__PURE__ */ jsx("span", { className: "relative inline-flex h-2 w-2 rounded-full bg-emerald-400" })
            ] }),
            "\u0421\u0435\u0439\u0447\u0430\u0441 \u0438\u0434\u0443\u0442 \u0438\u0433\u0440\u044B \u0432 12 \u0440\u0430\u0439\u043E\u043D\u0430\u0445"
          ] }),
          /* @__PURE__ */ jsxs("h1", { className: "font-display text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl", children: [
            "\u041D\u0430\u0439\u0434\u0438 \u0438\u0433\u0440\u0443.",
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-white/70", children: "\u0421\u043E\u0431\u0435\u0440\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u0443." }),
            " ",
            "\u0412\u044B\u0445\u043E\u0434\u0438 \u043D\u0430 \u043F\u043E\u043B\u0435."
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-xl text-sm text-white/80 sm:text-base", children: "\u041B\u044E\u0431\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0439 \u0441\u043F\u043E\u0440\u0442 \u0440\u044F\u0434\u043E\u043C \u0441 \u0434\u043E\u043C\u043E\u043C. \u0424\u0443\u0442\u0431\u043E\u043B, \u0431\u0430\u0441\u043A\u0435\u0442\u0431\u043E\u043B, \u0432\u043E\u043B\u0435\u0439\u0431\u043E\u043B \u0438 \u0435\u0449\u0451 15+ \u0432\u0438\u0434\u043E\u0432 \u2014 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u043A \u0438\u0433\u0440\u0435 \u0438\u043B\u0438 \u0441\u043E\u0431\u0438\u0440\u0430\u0439 \u0441\u0432\u043E\u044E \u0437\u0430 3 \u043A\u043B\u0438\u043A\u0430." }),
          /* @__PURE__ */ jsxs("form", { onSubmit: submitSearch, className: "mt-6 flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-xl shadow-elegant sm:flex-row", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-1 items-center gap-2 rounded-xl bg-white px-3", children: [
              /* @__PURE__ */ jsx(Search, { className: "h-4 w-4 shrink-0 text-muted-foreground" }),
              /* @__PURE__ */ jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "\u0412\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430 \u0438\u043B\u0438 \u0441\u0442\u0430\u0434\u0438\u043E\u043D", className: "h-11 border-0 bg-transparent px-0 text-sm shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-1 items-center gap-2 rounded-xl bg-white px-3", children: [
              /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4 shrink-0 text-muted-foreground" }),
              /* @__PURE__ */ jsx(Input, { value: city, onChange: (e) => setCity(e.target.value), placeholder: "\u0420\u0430\u0439\u043E\u043D \u0438\u043B\u0438 \u043C\u0435\u0442\u0440\u043E", className: "h-11 border-0 bg-transparent px-0 text-sm shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" })
            ] }),
            /* @__PURE__ */ jsx(Button, { type: "submit", size: "lg", className: "h-11 bg-gradient-brand px-6 text-primary-foreground hover:opacity-90", children: "\u041D\u0430\u0439\u0442\u0438 \u0438\u0433\u0440\u0443" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: [{
            label: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F",
            icon: Zap,
            when: "today"
          }, {
            label: "\u0417\u0430\u0432\u0442\u0440\u0430",
            icon: Calendar,
            when: "tomorrow"
          }, {
            label: "\u041D\u0430 \u044D\u0442\u043E\u0439 \u043D\u0435\u0434\u0435\u043B\u0435",
            icon: Calendar,
            when: "week"
          }, {
            label: "\u0420\u044F\u0434\u043E\u043C \u0441\u043E \u043C\u043D\u043E\u0439",
            icon: MapPin,
            when: void 0
          }].map((c) => /* @__PURE__ */ jsxs(Link, { to: "/games", search: c.when ? {
            when: c.when
          } : {}, className: "inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition hover:bg-white/20", children: [
            /* @__PURE__ */ jsx(c.icon, { className: "h-3.5 w-3.5" }),
            " ",
            c.label
          ] }, c.label)) }),
          /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap gap-3", children: [
            /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", className: "bg-white text-primary hover:bg-white/90 shadow-elegant", children: /* @__PURE__ */ jsxs(Link, { to: "/games", children: [
              "\u041D\u0430\u0439\u0442\u0438 \u0438\u0433\u0440\u0443 ",
              /* @__PURE__ */ jsx(ArrowRight, { className: "ml-2 h-4 w-4" })
            ] }) }),
            /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", variant: "outline", className: "border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20", children: /* @__PURE__ */ jsxs(Link, { to: "/friends", children: [
              /* @__PURE__ */ jsx(Users, { className: "mr-2 h-4 w-4" }),
              " \u041D\u0430\u0439\u0442\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u0443"
            ] }) }),
            /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", variant: "outline", className: "border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20", children: /* @__PURE__ */ jsx(Link, { to: "/create", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443" }) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-10 grid max-w-lg grid-cols-3 gap-4 text-white", children: [{
            v: "120+",
            l: "\u043F\u043B\u043E\u0449\u0430\u0434\u043E\u043A"
          }, {
            v: "3 \u043A\u043B\u0438\u043A\u0430",
            l: "\u0434\u043E \u0438\u0433\u0440\u044B"
          }, {
            v: "4.9\u2605",
            l: "\u0440\u0435\u0439\u0442\u0438\u043D\u0433"
          }].map((s) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/15 bg-white/5 px-3 py-2 backdrop-blur-sm", children: [
            /* @__PURE__ */ jsx("p", { className: "font-display text-2xl font-bold md:text-3xl", children: s.v }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-white/70", children: s.l })
          ] }, s.l)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative md:col-span-5", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute -inset-8 rounded-[3rem] bg-white/10 blur-3xl" }),
          /* @__PURE__ */ jsx("div", { className: "relative overflow-hidden rounded-[2.5rem] border border-white/30 bg-white/10 p-2 backdrop-blur-xl shadow-elegant", children: /* @__PURE__ */ jsxs("div", { className: "rounded-[2rem] bg-background p-6", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs font-medium uppercase tracking-widest text-muted-foreground", children: "\u0411\u043B\u0438\u0436\u0430\u0439\u0448\u0430\u044F \u0438\u0433\u0440\u0430" }),
              /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400", children: [
                /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3" }),
                " \u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E"
              ] })
            ] }),
            /* @__PURE__ */ jsx(GameCardEmbedded, {})
          ] }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 pt-12 sm:px-6 md:pt-16", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-6 flex items-end justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary", children: "\u0412\u0438\u0434\u044B \u0441\u043F\u043E\u0440\u0442\u0430" }),
          /* @__PURE__ */ jsx("h2", { className: "mt-2 font-display text-2xl font-bold md:text-3xl", children: "\u0412\u044B\u0431\u0435\u0440\u0438 \u0441\u0432\u043E\u044E \u0438\u0433\u0440\u0443" })
        ] }),
        /* @__PURE__ */ jsx(Link, { to: "/games", className: "text-sm font-medium text-primary hover:underline", children: "\u0412\u0441\u0435 \u0432\u0438\u0434\u044B \u2192" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8", children: POPULAR_SPORTS.map((s) => /* @__PURE__ */ jsxs(Link, { to: "/games", search: {
        sport: s.name
      }, className: "group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card sm:flex-col sm:items-center sm:gap-2 sm:p-4 sm:text-center", children: [
        /* @__PURE__ */ jsx("span", { className: "text-2xl transition-transform group-hover:scale-110 sm:text-3xl", children: s.emoji }),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-medium leading-tight", children: s.name })
      ] }, s.name)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 py-12 sm:px-6 md:py-16", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary", children: "\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438 \u0432 \u0433\u043E\u0440\u043E\u0434\u0435" }),
          /* @__PURE__ */ jsx("h2", { className: "mt-1.5 font-display text-2xl font-bold md:text-3xl", children: "\u0411\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0438\u0433\u0440\u044B" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "\u041F\u043E\u0434\u043E\u0431\u0440\u0430\u043D\u043E \u043F\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438 \u2014 \u0441\u0432\u0435\u0436\u0438\u0435 \u043C\u0430\u0442\u0447\u0438 \u043F\u043E\u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u043F\u0435\u0440\u0432\u044B\u043C\u0438." })
        ] }),
        /* @__PURE__ */ jsx(Button, { asChild: true, variant: "outline", children: /* @__PURE__ */ jsxs(Link, { to: "/games", children: [
          "\u0412\u0441\u0435 \u0438\u0433\u0440\u044B ",
          /* @__PURE__ */ jsx(ArrowRight, { className: "ml-2 h-4 w-4" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(UpcomingGamesList, {})
    ] }),
    /* @__PURE__ */ jsx("section", { className: "container mx-auto px-4 pb-16 sm:px-6 md:pb-20", children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4", children: [{
      v: "12 800+",
      l: "\u043C\u0430\u0442\u0447\u0435\u0439 \u0441\u044B\u0433\u0440\u0430\u043D\u043E",
      icon: Trophy
    }, {
      v: "5 400+",
      l: "\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0438\u0433\u0440\u043E\u043A\u043E\u0432",
      icon: Users
    }, {
      v: "320+",
      l: "\u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0445 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u043E\u0432",
      icon: ShieldCheck
    }, {
      v: "4.9 / 5",
      l: "\u0441\u0440\u0435\u0434\u043D\u0438\u0439 \u0440\u0435\u0439\u0442\u0438\u043D\u0433",
      icon: Star
    }].map((s) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border bg-card p-5 shadow-card", children: [
      /* @__PURE__ */ jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary", children: /* @__PURE__ */ jsx(s.icon, { className: "h-5 w-5" }) }),
      /* @__PURE__ */ jsx("p", { className: "mt-4 font-display text-2xl font-bold md:text-3xl", children: s.v }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: s.l })
    ] }, s.l)) }) }),
    !user && /* @__PURE__ */ jsx("section", { className: "container mx-auto px-4 pb-16 sm:px-6 md:pb-20", children: /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-3xl bg-gradient-hero px-6 py-12 text-center shadow-elegant md:px-10 md:py-16", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,white,transparent_50%)] opacity-15" }),
      /* @__PURE__ */ jsxs("div", { className: "relative mx-auto max-w-2xl", children: [
        /* @__PURE__ */ jsx(Flame, { className: "mx-auto h-8 w-8 text-white" }),
        /* @__PURE__ */ jsx("h2", { className: "mt-3 font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl", children: "\u0413\u043E\u0442\u043E\u0432 \u0432\u044B\u0439\u0442\u0438 \u043D\u0430 \u043F\u043E\u043B\u0435?" }),
        /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-white/80 sm:text-base", children: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0437\u0430\u043D\u0438\u043C\u0430\u0435\u0442 \u043C\u0438\u043D\u0443\u0442\u0443. \u041F\u0435\u0440\u0432\u0430\u044F \u0438\u0433\u0440\u0430 \u2014 \u0443\u0436\u0435 \u0441\u0435\u0433\u043E\u0434\u043D\u044F." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap justify-center gap-3", children: [
          /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", className: "bg-white text-primary hover:bg-white/90", children: /* @__PURE__ */ jsx(Link, { to: "/auth", children: "\u041D\u0430\u0447\u0430\u0442\u044C \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E" }) }),
          /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", variant: "outline", className: "border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20", children: /* @__PURE__ */ jsx(Link, { to: "/games", children: "\u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0438\u0433\u0440\u044B" }) })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
function GameCardEmbedded() {
  var _a, _b, _c, _d, _e;
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const select = "id, starts_at, price_per_player, slots_total, stadium:stadiums(name,address), participants:game_participants(count)";
    let {
      data
    } = await supabase.from("games").select(select).eq("is_private", false).gte("starts_at", nowIso).order("starts_at", {
      ascending: true
    }).limit(1).maybeSingle();
    if (!data) {
      const fallback = await supabase.from("games").select(select).eq("is_private", false).order("starts_at", {
        ascending: false
      }).limit(1).maybeSingle();
      data = fallback.data;
    }
    setGame(data != null ? data : null);
    setLoading(false);
  };
  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (!alive) return;
    })();
    const intId = window.setInterval(() => {
      if (alive) load();
    }, 3e4);
    const onFocus = () => {
      if (alive) load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      window.clearInterval(intId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
  if (loading) {
    return /* @__PURE__ */ jsx(Skeleton, { className: "mt-3 h-44 rounded-2xl" });
  }
  if (!game) {
    return /* @__PURE__ */ jsxs("div", { className: "mt-3 rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground", children: /* @__PURE__ */ jsx(Trophy, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsx("p", { className: "mt-3 font-display text-base font-semibold", children: "\u0418\u0433\u0440 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "\u0421\u043E\u0437\u0434\u0430\u0439 \u043F\u0435\u0440\u0432\u0443\u044E \u2014 \u0438 \u043E\u043D\u0430 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C." }),
      /* @__PURE__ */ jsx(Link, { to: "/create", className: "mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-brand px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443" })
    ] });
  }
  const taken = (_c = (_b = (_a = game.participants) == null ? void 0 : _a[0]) == null ? void 0 : _b.count) != null ? _c : 0;
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground", children: /* @__PURE__ */ jsx(Trophy, { className: "h-5 w-5" }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "font-display text-base font-semibold", children: (_d = game.stadium) == null ? void 0 : _d.name }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: (_e = game.stadium) == null ? void 0 : _e.address })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4 grid grid-cols-2 gap-3 text-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-muted px-3 py-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u041A\u043E\u0433\u0434\u0430" }),
        /* @__PURE__ */ jsxs("p", { className: "font-medium", children: [
          formatNearDate(game.starts_at),
          ", ",
          formatTime(game.starts_at)
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-muted px-3 py-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u0421\u043E\u0441\u0442\u0430\u0432" }),
        /* @__PURE__ */ jsxs("p", { className: "font-medium", children: [
          taken,
          "/",
          game.slots_total
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Link, { to: "/games/$gameId", params: {
      gameId: game.id
    }, className: "mt-4 flex items-center justify-between rounded-xl bg-gradient-brand px-4 py-3 text-primary-foreground transition-opacity hover:opacity-90", children: [
      /* @__PURE__ */ jsx("span", { className: "text-sm", children: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F" }),
      /* @__PURE__ */ jsxs("span", { className: "font-display font-bold", children: [
        game.price_per_player,
        " \u20BD"
      ] })
    ] })
  ] });
}
function UpcomingGamesList() {
  const [items, setItems] = useState(null);
  const [sportFilter, setSportFilter] = useState("\u0412\u0441\u0435");
  const load = async () => {
    const {
      data
    } = await supabase.from("games").select("id, sport, level, starts_at, price_per_player, slots_total, stadium:stadiums(name,address), participants:game_participants(count)").eq("is_private", false).gte("starts_at", (/* @__PURE__ */ new Date()).toISOString()).order("starts_at", {
      ascending: true
    }).limit(12);
    setItems(data != null ? data : []);
  };
  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (!alive) return;
    })();
    const intId = window.setInterval(() => {
      if (alive) load();
    }, 3e4);
    const onFocus = () => {
      if (alive) load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      window.clearInterval(intId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
  const sportsInList = useMemo(() => {
    if (!items) return [];
    return Array.from(new Set(items.map((g) => g.sport))).slice(0, 6);
  }, [items]);
  const filtered = useMemo(() => {
    if (!items) return null;
    return sportFilter === "\u0412\u0441\u0435" ? items.slice(0, 6) : items.filter((g) => g.sport === sportFilter).slice(0, 6);
  }, [items, sportFilter]);
  if (items === null) {
    return /* @__PURE__ */ jsx("div", { className: "grid gap-5 md:grid-cols-2 lg:grid-cols-3", children: Array.from({
      length: 3
    }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-56 rounded-3xl" }, i)) });
  }
  if (items.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-dashed border-border bg-card/50 px-8 py-20 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow", children: /* @__PURE__ */ jsx(Trophy, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-6 font-display text-2xl font-semibold", children: "\u0411\u0443\u0434\u044C \u043F\u0435\u0440\u0432\u044B\u043C \u043D\u0430 \u043F\u043E\u043B\u0435" }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto mt-3 max-w-md text-muted-foreground", children: "\u0421\u043E\u0437\u0434\u0430\u0439 \u0438\u0433\u0440\u0443 \u2014 \u043F\u0440\u0438\u0433\u043B\u0430\u0441\u0438\u043C \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0438 \u043F\u043E\u043C\u043E\u0436\u0435\u043C \u0441\u043E\u0431\u0440\u0430\u0442\u044C \u0441\u043E\u0441\u0442\u0430\u0432." }),
      /* @__PURE__ */ jsxs("div", { className: "mt-8 flex flex-wrap justify-center gap-3", children: [
        /* @__PURE__ */ jsx(Button, { asChild: true, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsx(Link, { to: "/create", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443" }) }),
        /* @__PURE__ */ jsx(Button, { asChild: true, variant: "outline", children: /* @__PURE__ */ jsx(Link, { to: "/friends", children: "\u041D\u0430\u0439\u0442\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u0443" }) })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    sportsInList.length > 1 && /* @__PURE__ */ jsx("div", { className: "mb-6 flex flex-wrap gap-2", children: ["\u0412\u0441\u0435", ...sportsInList].map((s) => /* @__PURE__ */ jsx("button", { onClick: () => setSportFilter(s), className: `rounded-full border px-3 py-1.5 text-xs font-medium transition ${sportFilter === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"}`, children: s }, s)) }),
    /* @__PURE__ */ jsx("div", { className: "grid gap-5 md:grid-cols-2 lg:grid-cols-3", children: (filtered != null ? filtered : []).map((g) => {
      var _a, _b, _c, _d, _e, _f;
      const taken = (_c = (_b = (_a = g.participants) == null ? void 0 : _a[0]) == null ? void 0 : _b.count) != null ? _c : 0;
      const full = taken >= g.slots_total;
      const needed = g.slots_total - taken;
      const startsIn = new Date(g.starts_at).getTime() - Date.now();
      const soon = startsIn > 0 && startsIn < 1e3 * 60 * 60 * 6;
      const status = full ? {
        label: "\u0417\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E",
        cls: "bg-muted text-muted-foreground"
      } : needed <= 2 && taken > 0 ? {
        label: `\u041D\u0443\u0436\u043D\u043E \u0435\u0449\u0451 ${needed}`,
        cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400"
      } : soon ? {
        label: "\u0421\u043A\u043E\u0440\u043E \u0441\u0442\u0430\u0440\u0442",
        cls: "bg-primary/15 text-primary"
      } : taken === 0 ? {
        label: "\u041D\u043E\u0432\u0430\u044F \u0438\u0433\u0440\u0430",
        cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      } : {
        label: "\u0418\u0434\u0451\u0442 \u043D\u0430\u0431\u043E\u0440",
        cls: "bg-accent text-accent-foreground"
      };
      const pct = Math.round(taken / g.slots_total * 100);
      return /* @__PURE__ */ jsxs(Link, { to: "/games/$gameId", params: {
        gameId: g.id
      }, className: "group relative block overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-elegant", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-orb opacity-20 blur-2xl transition-opacity group-hover:opacity-40" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("span", { className: `rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.cls}`, children: [
            /* @__PURE__ */ jsx(Sparkles, { className: "mr-1 inline h-3 w-3" }),
            status.label
          ] }),
          /* @__PURE__ */ jsx("span", { className: "rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground", children: g.sport })
        ] }),
        /* @__PURE__ */ jsx("h3", { className: "mt-4 font-display text-lg font-semibold leading-tight", children: (_e = (_d = g.stadium) == null ? void 0 : _d.name) != null ? _e : "\u0421\u0442\u0430\u0434\u0438\u043E\u043D" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 flex items-center gap-1 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(MapPin, { className: "h-3 w-3" }),
          " ",
          (_f = g.stadium) == null ? void 0 : _f.address
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 grid grid-cols-2 gap-3 text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4 text-primary" }),
            formatNearDate(g.starts_at),
            ", ",
            formatTime(g.starts_at)
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Users, { className: "h-4 w-4 text-primary" }),
            taken,
            "/",
            g.slots_total,
            " \xB7 ",
            g.level
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsx("div", { className: "h-full rounded-full bg-gradient-brand transition-all duration-500", style: {
          width: `${pct}%`
        } }) }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground", children: "\u0437\u0430 \u0438\u0433\u0440\u043E\u043A\u0430" }),
            /* @__PURE__ */ jsxs("p", { className: "font-display text-xl font-bold", children: [
              g.price_per_player,
              " \u20BD"
            ] })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "inline-flex h-9 items-center rounded-md bg-gradient-brand px-4 text-sm font-medium text-primary-foreground", children: full ? "\u041C\u0435\u0441\u0442 \u043D\u0435\u0442" : "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F" })
        ] })
      ] }, g.id);
    }) })
  ] });
}

export { HomePage as component };
//# sourceMappingURL=index-WpKLdo-X.mjs.map
