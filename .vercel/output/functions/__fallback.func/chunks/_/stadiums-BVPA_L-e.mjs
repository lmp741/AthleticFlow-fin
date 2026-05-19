import { jsxs, jsx } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronsUpDown, Check, Star, MapPin } from 'lucide-react';
import { h as SiteHeader, P as Popover, b as PopoverTrigger, a as PopoverContent, g as SiteFooter } from './SiteShell-n-2GeoU1.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { s as supabase, o as cn, B as Button } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { Command as Command$1 } from 'cmdk';
import { m as manegeImg, a as arenaImg, s as stadiumImg, p as parkImg, c as cageImg, t as turfImg } from './arena-86WF60rn.mjs';
import './Logo-DDLL_UOB.mjs';
import '@radix-ui/react-popover';
import 'sonner';
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

const Command = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Command$1,
  {
    ref,
    className: cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    ),
    ...props
  }
));
Command.displayName = Command$1.displayName;
const CommandInput = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxs("div", { className: "flex items-center border-b px-3", "cmdk-input-wrapper": "", children: [
  /* @__PURE__ */ jsx(Search, { className: "mr-2 h-4 w-4 shrink-0 opacity-50" }),
  /* @__PURE__ */ jsx(
    Command$1.Input,
    {
      ref,
      className: cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props
    }
  )
] }));
CommandInput.displayName = Command$1.Input.displayName;
const CommandList = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Command$1.List,
  {
    ref,
    className: cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className),
    ...props
  }
));
CommandList.displayName = Command$1.List.displayName;
const CommandEmpty = React.forwardRef((props, ref) => /* @__PURE__ */ jsx(Command$1.Empty, { ref, className: "py-6 text-center text-sm", ...props }));
CommandEmpty.displayName = Command$1.Empty.displayName;
const CommandGroup = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Command$1.Group,
  {
    ref,
    className: cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    ),
    ...props
  }
));
CommandGroup.displayName = Command$1.Group.displayName;
const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Command$1.Separator,
  {
    ref,
    className: cn("-mx-1 h-px bg-border", className),
    ...props
  }
));
CommandSeparator.displayName = Command$1.Separator.displayName;
const CommandItem = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Command$1.Item,
  {
    ref,
    className: cn(
      "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className
    ),
    ...props
  }
));
CommandItem.displayName = Command$1.Item.displayName;
function stadiumImageFor(name) {
  const n = name.toLowerCase();
  if (n.includes("\u043C\u0430\u043D\u0435\u0436") || n.includes("\u0444\u0435\u043D\u0438\u043A\u0441") || n.includes("\u043F\u0438\u043E\u043D\u0435\u0440") || n.includes("\u043C\u0435\u0433\u0430\u043F\u043E\u043B\u0438\u0441")) return manegeImg;
  if (n.includes("\u0430\u043D\u0433\u0430\u0440")) return arenaImg;
  if (n.includes("\u0441\u0442\u0430\u0434\u0438\u043E\u043D") || n.includes("\u0434\u0438\u043D\u0430\u043C\u043E") || n.includes("\u043B\u0443\u0436\u043D\u0438\u043A\u0438")) return stadiumImg;
  if (n.includes("\u043F\u0430\u0440\u043A") || n.includes("\u043A\u0440\u0430\u0441\u043D\u0430\u044F \u043F\u0440\u0435\u0441\u043D\u044F") || n.includes("\u043C\u0435\u0449\u0435\u0440\u0441\u043A\u0438\u0439")) return parkImg;
  if (n.includes("\u0430\u0440\u0435\u043D\u0430") || n.includes("\u0434\u0430\u0431\u043B")) return arenaImg;
  if (n.includes("cityfootball") || n.includes("\u0438\u0433\u0440\u0430") || n.includes("\u0434\u0435\u043B\u044C\u0444\u0438\u043D")) return cageImg;
  return turfImg;
}
const ALL_SPORTS = ["\u0424\u0443\u0442\u0431\u043E\u043B", "\u0424\u0443\u0442\u0437\u0430\u043B", "\u0411\u0430\u0441\u043A\u0435\u0442\u0431\u043E\u043B", "\u0412\u043E\u043B\u0435\u0439\u0431\u043E\u043B", "\u041F\u043B\u044F\u0436\u043D\u044B\u0439 \u0432\u043E\u043B\u0435\u0439\u0431\u043E\u043B", "\u0425\u043E\u043A\u043A\u0435\u0439", "\u0425\u043E\u043A\u043A\u0435\u0439 \u043D\u0430 \u0442\u0440\u0430\u0432\u0435", "\u0420\u0435\u0433\u0431\u0438", "\u0410\u043C\u0435\u0440\u0438\u043A\u0430\u043D\u0441\u043A\u0438\u0439 \u0444\u0443\u0442\u0431\u043E\u043B", "\u0413\u0430\u043D\u0434\u0431\u043E\u043B", "\u0411\u0435\u0439\u0441\u0431\u043E\u043B", "\u0412\u043E\u0434\u043D\u043E\u0435 \u043F\u043E\u043B\u043E", "\u0424\u043B\u043E\u0440\u0431\u043E\u043B", "\u0424\u0440\u0438\u0441\u0431\u0438", "\u041F\u0430\u0434\u0435\u043B", "\u0422\u0435\u043D\u043D\u0438\u0441"];
function StadiumsPage() {
  const [list, setList] = useState(null);
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState(null);
  useEffect(() => {
    (async () => {
      const {
        data
      } = await supabase.from("stadiums").select("id, name, address, cover_gradient, sports, price_per_hour, rating").order("rating", {
        ascending: false
      });
      setList(data != null ? data : []);
    })();
  }, []);
  const [sportPickerOpen, setSportPickerOpen] = useState(false);
  const sportsInList = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    (list != null ? list : []).forEach((s) => s.sports.forEach((sp) => set.add(sp)));
    return set;
  }, [list]);
  const allSports = useMemo(() => {
    const present = ALL_SPORTS.filter((s) => sportsInList.has(s));
    const rest = ALL_SPORTS.filter((s) => !sportsInList.has(s));
    return [...present, ...rest];
  }, [sportsInList]);
  const quickSports = useMemo(() => allSports.slice(0, 5), [allSports]);
  const filtered = useMemo(() => {
    if (!list) return null;
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
      const matchS = !sport || s.sports.includes(sport);
      return matchQ && matchS;
    });
  }, [list, query, sport]);
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden bg-gradient-hero py-10 md:py-14", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,white,transparent_55%)] opacity-20" }),
      /* @__PURE__ */ jsxs("div", { className: "relative container mx-auto px-4 sm:px-6", children: [
        /* @__PURE__ */ jsx(Badge, { className: "mb-3 border-white/30 bg-white/10 text-white", children: "\u041C\u043E\u0441\u043A\u0432\u0430" }),
        /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl", children: "\u0421\u0442\u0430\u0434\u0438\u043E\u043D\u044B \u041C\u043E\u0441\u043A\u0432\u044B" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl text-sm text-white/80 sm:text-base", children: "\u0412\u044B\u0431\u0438\u0440\u0430\u0439 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0443, \u0431\u0440\u043E\u043D\u0438\u0440\u0443\u0439 \u0441\u043B\u043E\u0442, \u0441\u043E\u0431\u0438\u0440\u0430\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u0443." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 py-8 sm:px-6 sm:py-10 md:py-12", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8 flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative max-w-xl", children: [
          /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsx(Input, { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E \u0438\u043B\u0438 \u0430\u0434\u0440\u0435\u0441\u0443", className: "h-11 pl-10" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setSport(null), className: cn("rounded-full border px-4 py-1.5 text-sm transition-colors", sport === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"), children: "\u0412\u0441\u0435 \u0432\u0438\u0434\u044B" }),
          quickSports.map((sp) => /* @__PURE__ */ jsx("button", { onClick: () => setSport(sp), className: cn("rounded-full border px-4 py-1.5 text-sm transition-colors", sport === sp ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"), children: sp }, sp)),
          /* @__PURE__ */ jsxs(Popover, { open: sportPickerOpen, onOpenChange: setSportPickerOpen, children: [
            /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "outline", role: "combobox", "aria-expanded": sportPickerOpen, className: cn("h-auto rounded-full border px-4 py-1.5 text-sm font-normal", sport && !quickSports.includes(sport) ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"), children: [
              sport && !quickSports.includes(sport) ? sport : "\u0412\u0441\u0435 \u0432\u0438\u0434\u044B \u0441\u043F\u043E\u0440\u0442\u0430",
              /* @__PURE__ */ jsx(ChevronsUpDown, { className: "ml-2 h-3.5 w-3.5 opacity-60" })
            ] }) }),
            /* @__PURE__ */ jsx(PopoverContent, { className: "w-72 p-0", align: "start", children: /* @__PURE__ */ jsxs(Command, { children: [
              /* @__PURE__ */ jsx(CommandInput, { placeholder: "\u041D\u0430\u0439\u0442\u0438 \u0432\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430\u2026" }),
              /* @__PURE__ */ jsxs(CommandList, { children: [
                /* @__PURE__ */ jsx(CommandEmpty, { children: "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" }),
                /* @__PURE__ */ jsx(CommandGroup, { children: allSports.map((sp) => /* @__PURE__ */ jsxs(CommandItem, { value: sp, onSelect: () => {
                  setSport(sp);
                  setSportPickerOpen(false);
                }, children: [
                  /* @__PURE__ */ jsx(Check, { className: cn("mr-2 h-4 w-4", sport === sp ? "opacity-100" : "opacity-0") }),
                  /* @__PURE__ */ jsx("span", { className: "flex-1", children: sp }),
                  !sportsInList.has(sp) && /* @__PURE__ */ jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: "\u0441\u043A\u043E\u0440\u043E" })
                ] }, sp)) })
              ] })
            ] }) })
          ] })
        ] })
      ] }),
      filtered === null ? /* @__PURE__ */ jsx("div", { className: "grid gap-6 md:grid-cols-2 lg:grid-cols-3", children: Array.from({
        length: 3
      }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-80 rounded-3xl" }, i)) }) : filtered.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-16 text-center text-muted-foreground", children: "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" }) : /* @__PURE__ */ jsx("div", { className: "grid gap-6 md:grid-cols-2 lg:grid-cols-3", children: filtered.map((s) => {
        var _a;
        return /* @__PURE__ */ jsxs("article", { className: "group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-elegant", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative h-48 overflow-hidden", children: [
            /* @__PURE__ */ jsx("img", { src: stadiumImageFor(s.name), alt: s.name, loading: "lazy", width: 1024, height: 640, className: "absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-smooth group-hover:scale-105" }),
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" }),
            /* @__PURE__ */ jsxs("div", { className: "absolute bottom-4 left-4 right-4 flex items-end justify-between", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md", children: [
                /* @__PURE__ */ jsx(Star, { className: "h-3 w-3 fill-white" }),
                " ",
                (_a = s.rating) != null ? _a : "\u2014"
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-primary", children: [
                "\u043E\u0442 ",
                s.price_per_hour,
                " \u20BD/\u0447\u0430\u0441"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "p-5", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-display text-lg font-semibold", children: s.name }),
            /* @__PURE__ */ jsxs("p", { className: "mt-1 flex items-center gap-1 text-xs text-muted-foreground", children: [
              /* @__PURE__ */ jsx(MapPin, { className: "h-3 w-3" }),
              " ",
              s.address
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-3 flex flex-wrap gap-1.5", children: s.sports.map((sp) => /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: sp }, sp)) }),
            /* @__PURE__ */ jsx(Button, { asChild: true, className: "mt-5 w-full bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsx(Link, { to: "/stadiums/$stadiumId", params: {
              stadiumId: s.id
            }, children: "\u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0438\u0433\u0440\u044B" }) })
          ] })
        ] }, s.id);
      }) })
    ] }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}

export { StadiumsPage as component };
//# sourceMappingURL=stadiums-BVPA_L-e.mjs.map
