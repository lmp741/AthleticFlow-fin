import { jsxs, jsx } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import * as React from 'react';
import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Search, Loader2, Navigation, MapPin, ChevronDown, Check, Calendar as Calendar$1, X, Clock, Users, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react';
import { D as DropdownMenu, c as DropdownMenuTrigger, a as DropdownMenuContent, b as DropdownMenuItem } from './dropdown-menu-DzAqYcNu.mjs';
import { h as SiteHeader, g as SiteFooter, P as Popover, b as PopoverTrigger, a as PopoverContent } from './SiteShell-n-2GeoU1.mjs';
import { getDefaultClassNames, DayPicker } from 'react-day-picker';
import { R as Route$j, s as supabase, B as Button, o as cn, n as buttonVariants } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { toast } from 'sonner';
import '@radix-ui/react-dropdown-menu';
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

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames();
  return /* @__PURE__ */ jsx(
    DayPicker,
    {
      showOutsideDays,
      className: cn(
        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      ),
      captionLayout,
      formatters: {
        formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" }),
        ...formatters
      },
      classNames: {
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-(--cell-size) w-(--cell-size) select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-(--cell-size) w-(--cell-size) select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn("bg-popover absolute inset-0 opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label" ? "text-sm" : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem]",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day
        ),
        range_start: cn("bg-accent rounded-l-md", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-accent rounded-r-md", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames
      },
      components: {
        Root: ({ className: className2, rootRef, ...props2 }) => {
          return /* @__PURE__ */ jsx("div", { "data-slot": "calendar", ref: rootRef, className: cn(className2), ...props2 });
        },
        Chevron: ({ className: className2, orientation, ...props2 }) => {
          if (orientation === "left") {
            return /* @__PURE__ */ jsx(ChevronLeftIcon, { className: cn("size-4", className2), ...props2 });
          }
          if (orientation === "right") {
            return /* @__PURE__ */ jsx(ChevronRightIcon, { className: cn("size-4", className2), ...props2 });
          }
          return /* @__PURE__ */ jsx(ChevronDownIcon, { className: cn("size-4", className2), ...props2 });
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props2 }) => {
          return /* @__PURE__ */ jsx("td", { ...props2, children: /* @__PURE__ */ jsx("div", { className: "flex size-(--cell-size) items-center justify-center text-center", children }) });
        },
        ...components
      },
      ...props
    }
  );
}
function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef(null);
  React.useEffect(() => {
    var _a;
    if (modifiers.focused) (_a = ref.current) == null ? void 0 : _a.focus();
  }, [modifiers.focused]);
  return /* @__PURE__ */ jsx(
    Button,
    {
      ref,
      variant: "ghost",
      size: "icon",
      "data-day": day.date.toLocaleDateString(),
      "data-selected-single": modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle,
      "data-range-start": modifiers.range_start,
      "data-range-end": modifiers.range_end,
      "data-range-middle": modifiers.range_middle,
      className: cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square h-auto w-full min-w-(--cell-size) flex-col gap-1 font-normal leading-none data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      ),
      ...props
    }
  );
}
const StadiumsMap = lazy(() => import('./StadiumsMap-BVQuvNgP.mjs'));
const sports = ["\u0412\u0441\u0435", "\u0424\u0443\u0442\u0431\u043E\u043B", "\u0424\u0443\u0442\u0437\u0430\u043B", "\u0411\u0430\u0441\u043A\u0435\u0442\u0431\u043E\u043B", "\u0412\u043E\u043B\u0435\u0439\u0431\u043E\u043B", "\u041F\u043B\u044F\u0436\u043D\u044B\u0439 \u0432\u043E\u043B\u0435\u0439\u0431\u043E\u043B", "\u0425\u043E\u043A\u043A\u0435\u0439", "\u0425\u043E\u043A\u043A\u0435\u0439 \u043D\u0430 \u0442\u0440\u0430\u0432\u0435", "\u0420\u0435\u0433\u0431\u0438", "\u0410\u043C\u0435\u0440\u0438\u043A\u0430\u043D\u0441\u043A\u0438\u0439 \u0444\u0443\u0442\u0431\u043E\u043B", "\u0413\u0430\u043D\u0434\u0431\u043E\u043B", "\u0411\u0435\u0439\u0441\u0431\u043E\u043B", "\u0412\u043E\u0434\u043D\u043E\u0435 \u043F\u043E\u043B\u043E", "\u0424\u043B\u043E\u0440\u0431\u043E\u043B", "\u0424\u0440\u0438\u0441\u0431\u0438", "\u041F\u0430\u0434\u0435\u043B", "\u0422\u0435\u043D\u043D\u0438\u0441"];
const levels = ["\u041B\u044E\u0431\u043E\u0439", "\u041D\u043E\u0432\u0438\u0447\u043E\u043A", "\u041B\u044E\u0431\u0438\u0442\u0435\u043B\u044C", "\u041F\u043E\u043B\u0443\u043F\u0440\u043E\u0444\u0438", "\u041F\u0440\u043E\u0444\u0438"];
const timeSlots = [{
  id: "any",
  label: "\u041B\u044E\u0431\u043E\u0435 \u0432\u0440\u0435\u043C\u044F",
  h: [0, 24]
}, {
  id: "morning",
  label: "\u0423\u0442\u0440\u043E 6\u201312",
  h: [6, 12]
}, {
  id: "day",
  label: "\u0414\u0435\u043D\u044C 12\u201317",
  h: [12, 17]
}, {
  id: "evening",
  label: "\u0412\u0435\u0447\u0435\u0440 17\u201323",
  h: [17, 23]
}];
async function geocodeMoscow(text, signal) {
  const looksLikeMoscow = /москв|moscow/i.test(text);
  const queries = [looksLikeMoscow ? text : `\u041C\u043E\u0441\u043A\u0432\u0430, ${text}`, text];
  for (const q of queries) {
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
        headers: {
          Accept: "application/json"
        },
        signal
      });
      if (!r.ok) continue;
      const data = await r.json();
      if (Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        return {
          lat: data.lat,
          lng: data.lng
        };
      }
    } catch {
    }
  }
  return null;
}
const moscowSpots = [{
  name: "\u0426\u0435\u043D\u0442\u0440 (\u041A\u0440\u0435\u043C\u043B\u044C)",
  lat: 55.752,
  lng: 37.6175
}, {
  name: "\u0421\u043E\u043A\u043E\u043B\u044C\u043D\u0438\u043A\u0438",
  lat: 55.7942,
  lng: 37.677
}, {
  name: "\u041B\u0443\u0436\u043D\u0438\u043A\u0438",
  lat: 55.7158,
  lng: 37.5536
}, {
  name: "\u041A\u0440\u044B\u043B\u0430\u0442\u0441\u043A\u043E\u0435",
  lat: 55.757,
  lng: 37.4253
}, {
  name: "\u0427\u0435\u0440\u043A\u0438\u0437\u043E\u0432\u0441\u043A\u0430\u044F",
  lat: 55.8045,
  lng: 37.7448
}, {
  name: "\u0412\u0414\u041D\u0425",
  lat: 55.8294,
  lng: 37.6325
}, {
  name: "\u0422\u0443\u0448\u0438\u043D\u043E",
  lat: 55.8267,
  lng: 37.4364
}, {
  name: "\u0427\u0435\u0440\u0442\u0430\u043D\u043E\u0432\u043E",
  lat: 55.624,
  lng: 37.6112
}];
function formatDate(iso) {
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
function distKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const LOC_KEY = "af.userLoc";
function GamesPage() {
  var _a;
  const {
    when,
    stadium: stadiumParam,
    sport: sportParam,
    q: qParam
  } = Route$j.useSearch();
  const initialSport = (() => {
    if (sportParam && sports.includes(sportParam)) {
      return sportParam;
    }
    return "\u0412\u0441\u0435";
  })();
  const [sport, setSport] = useState(initialSport);
  const [level, setLevel] = useState("\u041B\u044E\u0431\u043E\u0439");
  const [timeId, setTimeId] = useState("any");
  useEffect(() => {
    if (sportParam && sports.includes(sportParam)) {
      setSport(sportParam);
    }
  }, [sportParam]);
  const [untilDate, setUntilDate] = useState(() => {
    if (!when) return void 0;
    const daysMap = {
      today: 0,
      tomorrow: 1,
      week: 7,
      "2weeks": 14
    };
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysMap[when]);
    return d;
  });
  useEffect(() => {
    if (!when) return;
    const daysMap = {
      today: 0,
      tomorrow: 1,
      week: 7,
      "2weeks": 14
    };
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysMap[when]);
    setUntilDate(d);
  }, [when]);
  const [q, setQ] = useState((_a = qParam != null ? qParam : stadiumParam) != null ? _a : "");
  useEffect(() => {
    if (stadiumParam) setQ(stadiumParam);
    else if (qParam) setQ(qParam);
  }, [stadiumParam, qParam]);
  const [games, setGames] = useState(null);
  const [allStadiums, setAllStadiums] = useState([]);
  const [loc, setLoc] = useState(null);
  const [radiusKm, setRadiusKm] = useState(15);
  const [showMap, setShowMap] = useState(true);
  const [osmSpots, setOsmSpots] = useState([]);
  const [osmLoading, setOsmLoading] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOC_KEY);
      if (raw) setLoc(JSON.parse(raw));
    } catch {
    }
  }, []);
  useEffect(() => {
    if (!loc) return;
    (async () => {
      const {
        data,
        error
      } = await supabase.from("games").select("id, sport, level, starts_at, ends_at, price_per_player, slots_total, stadium:stadiums(id,name,address,lat,lng), participants:game_participants(count)").gte("starts_at", new Date(Date.now() - 60 * 60 * 1e3).toISOString()).order("starts_at", {
        ascending: true
      });
      if (!error && data) setGames(data);
      else setGames([]);
    })();
  }, [loc]);
  useEffect(() => {
    (async () => {
      const {
        data
      } = await supabase.from("stadiums").select("id,name,address,lat,lng");
      setAllStadiums(data != null ? data : []);
    })();
  }, []);
  useEffect(() => {
    if (!loc) return;
    const ctrl = new AbortController();
    setOsmLoading(true);
    const r = Math.max(2e3, radiusKm * 1e3);
    (async () => {
      var _a2;
      try {
        const res = await fetch(`/api/pitches?lat=${loc.lat}&lng=${loc.lng}&radius=${r}`, {
          signal: ctrl.signal,
          headers: {
            Accept: "application/json"
          }
        });
        if (!res.ok) {
          setOsmSpots([]);
          return;
        }
        const json = await res.json();
        setOsmSpots((_a2 = json.items) != null ? _a2 : []);
      } catch {
      } finally {
        setOsmLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [loc, radiusKm]);
  const enriched = useMemo(() => {
    if (!games || !loc) return [];
    const slot = timeSlots.find((t) => t.id === timeId);
    return games.map((g) => {
      const s = g.stadium;
      const dist = s && s.lat != null && s.lng != null ? distKm({
        lat: loc.lat,
        lng: loc.lng
      }, {
        lat: s.lat,
        lng: s.lng
      }) : Number.POSITIVE_INFINITY;
      return {
        g,
        dist
      };
    }).filter(({
      g,
      dist
    }) => {
      var _a2, _b;
      if (dist > radiusKm) return false;
      const startsAt = new Date(g.starts_at);
      const h = startsAt.getHours();
      if (h < slot.h[0] || h >= slot.h[1]) return false;
      if (untilDate) {
        const end = new Date(untilDate);
        end.setHours(23, 59, 59, 999);
        if (startsAt > end) return false;
      }
      if (sport !== "\u0412\u0441\u0435" && g.sport !== sport) return false;
      if (level !== "\u041B\u044E\u0431\u043E\u0439" && g.level !== level) return false;
      if (q && !((_b = (_a2 = g.stadium) == null ? void 0 : _a2.name) != null ? _b : "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).sort((a, b) => a.dist - b.dist);
  }, [games, loc, sport, level, q, timeId, radiusKm, untilDate]);
  const mapStadiums = useMemo(() => {
    if (!loc) return [];
    const gamesByStadium = /* @__PURE__ */ new Map();
    enriched.forEach(({
      g
    }) => {
      var _a2;
      if (!g.stadium) return;
      const stadiumGames = (_a2 = gamesByStadium.get(g.stadium.id)) != null ? _a2 : [];
      stadiumGames.push({
        id: g.id,
        sport: g.sport,
        level: g.level,
        starts_at: g.starts_at,
        price_per_player: g.price_per_player
      });
      gamesByStadium.set(g.stadium.id, stadiumGames);
    });
    const query = q.trim().toLowerCase();
    const dbStadiums = allStadiums.filter((s) => s.lat != null && s.lng != null).map((s) => {
      var _a2, _b;
      return {
        id: s.id,
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        gamesPreview: ((_a2 = gamesByStadium.get(s.id)) != null ? _a2 : []).slice(0, 3),
        gamesTotal: ((_b = gamesByStadium.get(s.id)) != null ? _b : []).length
      };
    });
    const osmExtra = osmSpots.filter((o) => !dbStadiums.some((d) => distKm({
      lat: d.lat,
      lng: d.lng
    }, {
      lat: o.lat,
      lng: o.lng
    }) < 0.12)).map((o) => ({
      id: o.id,
      name: o.name,
      address: o.address,
      lat: o.lat,
      lng: o.lng,
      gamesPreview: [],
      gamesTotal: 0
    }));
    return [...dbStadiums, ...osmExtra].filter((s) => query ? s.name.toLowerCase().includes(query) || s.address.toLowerCase().includes(query) : true).map((s) => {
      const dist = distKm({
        lat: loc.lat,
        lng: loc.lng
      }, {
        lat: s.lat,
        lng: s.lng
      });
      return {
        id: s.id,
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        dist,
        inRadius: dist <= radiusKm,
        games: s.gamesPreview,
        gamesCount: s.gamesTotal
      };
    }).sort((a, b) => a.dist - b.dist);
  }, [allStadiums, osmSpots, enriched, loc, q, radiusKm]);
  const setUserLoc = (next) => {
    setLoc(next);
    try {
      localStorage.setItem(LOC_KEY, JSON.stringify(next));
    } catch {
    }
  };
  if (!loc) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsx(LocationGate, { onPick: setUserLoc }),
      /* @__PURE__ */ jsx(SiteFooter, {})
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden bg-gradient-hero py-10 md:py-14", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,white,transparent_50%)] opacity-15" }),
      /* @__PURE__ */ jsxs("div", { className: "relative container mx-auto px-4 sm:px-6", children: [
        /* @__PURE__ */ jsxs(Badge, { className: "mb-3 border-white/30 bg-white/10 text-white", children: [
          "\u041C\u043E\u0441\u043A\u0432\u0430 \xB7 ",
          loc.label
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl", children: "\u0418\u0433\u0440\u044B \u0440\u044F\u0434\u043E\u043C \u0441 \u0442\u043E\u0431\u043E\u0439" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2 max-w-xl text-sm text-white/80 sm:text-base", children: [
          "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u2014 \u043E\u0442\u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u044B \u043F\u043E \u0440\u0430\u0441\u0441\u0442\u043E\u044F\u043D\u0438\u044E \u043E\u0442 \u0442\u043E\u0447\u043A\u0438 \xAB",
          loc.label,
          "\xBB."
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl text-xs text-white/70", children: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0448\u044C VPN \u0438\u043B\u0438 \u0433\u0435\u043E\u043B\u043E\u043A\u0430\u0446\u0438\u044F \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u043D\u0435 \u0442\u0443\u0434\u0430? \u0412\u0432\u0435\u0434\u0438 \u0441\u0432\u043E\u0439 \u0430\u0434\u0440\u0435\u0441 \u0438\u043B\u0438 \u0440\u0430\u0439\u043E\u043D \u0432\u0440\u0443\u0447\u043D\u0443\u044E." }),
        /* @__PURE__ */ jsx(ManualLocationBar, { onPick: setUserLoc, onReset: () => setLoc(null) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 py-8 sm:px-6 sm:py-10", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-4 shadow-card sm:p-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-3 lg:grid-cols-[1fr_auto_auto]", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
            /* @__PURE__ */ jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "\u0421\u0442\u0430\u0434\u0438\u043E\u043D, \u0440\u0430\u0439\u043E\u043D\u2026", className: "h-11 pl-10" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap", children: "\u0420\u0430\u0434\u0438\u0443\u0441" }),
            /* @__PURE__ */ jsx("input", { type: "range", min: 2, max: 40, step: 1, value: radiusKm, onChange: (e) => setRadiusKm(Number(e.target.value)), className: "accent-primary" }),
            /* @__PURE__ */ jsxs("span", { className: "w-12 text-right font-display text-sm font-bold", children: [
              radiusKm,
              " \u043A\u043C"
            ] })
          ] }),
          /* @__PURE__ */ jsx(Button, { asChild: true, className: "bg-gradient-brand text-primary-foreground hover:opacity-90 h-11", children: /* @__PURE__ */ jsx(Link, { to: "/create", children: "+ \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443" }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: [{
          label: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F",
          days: 0
        }, {
          label: "\u0417\u0430\u0432\u0442\u0440\u0430",
          days: 1
        }, {
          label: "\u041D\u0430 \u043D\u0435\u0434\u0435\u043B\u0435",
          days: 7
        }, {
          label: "2 \u043D\u0435\u0434\u0435\u043B\u0438",
          days: 14
        }].map((p) => {
          const target = /* @__PURE__ */ new Date();
          target.setHours(0, 0, 0, 0);
          target.setDate(target.getDate() + p.days);
          const active = untilDate && untilDate.toDateString() === target.toDateString();
          return /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setUntilDate(active ? void 0 : target), className: cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all", active ? "border-transparent bg-gradient-brand text-primary-foreground shadow-glow" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"), children: p.label }, p.label);
        }) }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-wrap gap-3", children: [
          /* @__PURE__ */ jsx(FilterDropdown, { label: "\u0412\u0440\u0435\u043C\u044F", items: timeSlots.map((t) => t.label), value: timeSlots.find((t) => t.id === timeId).label, onChange: (v) => {
            var _a2, _b;
            return setTimeId((_b = (_a2 = timeSlots.find((t) => t.label === v)) == null ? void 0 : _a2.id) != null ? _b : "any");
          } }),
          /* @__PURE__ */ jsx(FilterDropdown, { label: "\u0412\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430", items: sports, value: sport, onChange: (v) => setSport(v) }),
          /* @__PURE__ */ jsx(FilterDropdown, { label: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C", items: levels, value: level, onChange: (v) => setLevel(v) }),
          /* @__PURE__ */ jsx(DateUntilFilter, { value: untilDate, onChange: setUntilDate })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4 px-5 py-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary", children: "\u041A\u0430\u0440\u0442\u0430" }),
            /* @__PURE__ */ jsxs("h3", { className: "font-display text-lg font-semibold", children: [
              "\u0421\u0442\u0430\u0434\u0438\u043E\u043D\u044B \u0432 \u0440\u0430\u0434\u0438\u0443\u0441\u0435 ",
              radiusKm,
              " \u043A\u043C"
            ] })
          ] }),
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => setShowMap((v) => !v), children: showMap ? "\u0421\u043A\u0440\u044B\u0442\u044C" : "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C" })
        ] }),
        showMap && /* @__PURE__ */ jsxs("div", { className: "px-3 pb-4", children: [
          /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(Skeleton, { className: "h-[480px] w-full rounded-3xl" }), children: /* @__PURE__ */ jsx(StadiumsMap, { user: loc, radiusKm, stadiums: mapStadiums }) }),
          /* @__PURE__ */ jsxs("p", { className: "mt-3 px-2 text-xs text-muted-foreground", children: [
            "\u041D\u0430 \u043A\u0430\u0440\u0442\u0435 \u2014 \u043D\u0430\u0448\u0438 \u0441\u0442\u0430\u0434\u0438\u043E\u043D\u044B \u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u0433\u043E\u0440\u043E\u0434\u0441\u043A\u0438\u0435 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0438 (\u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0435 \u0434\u0432\u043E\u0440\u043E\u0432\u044B\u0435) \u0438\u0437 OpenStreetMap. \u042F\u0440\u043A\u0438\u0435 \u043C\u0430\u0440\u043A\u0435\u0440\u044B \u2014 \u0432 \u0442\u0432\u043E\u0451\u043C \u0440\u0430\u0434\u0438\u0443\u0441\u0435, \u043F\u0440\u0438\u0433\u043B\u0443\u0448\u0451\u043D\u043D\u044B\u0435 \u2014 \u0437\u0430 \u0435\u0433\u043E \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u043C\u0438.",
            osmLoading ? " \u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0434\u0432\u043E\u0440\u043E\u0432\u044B\u0435 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0438\u2026" : ""
          ] })
        ] })
      ] }),
      games === null ? /* @__PURE__ */ jsx("div", { className: "mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3", children: Array.from({
        length: 3
      }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-64 rounded-3xl" }, i)) }) : enriched.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-12 text-center", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
          "\u0412 \u0440\u0430\u0434\u0438\u0443\u0441\u0435 ",
          radiusKm,
          " \u043A\u043C \u0438 \u043F\u043E\u0434 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0435 \u0432\u0440\u0435\u043C\u044F \u0438\u0433\u0440 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u0420\u0430\u0441\u0448\u0438\u0440\u044C \u0440\u0430\u0434\u0438\u0443\u0441 \u0438\u043B\u0438 \u0441\u043E\u0437\u0434\u0430\u0439 \u0441\u0432\u043E\u044E."
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-6 flex justify-center gap-3", children: /* @__PURE__ */ jsx(Button, { asChild: true, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsx(Link, { to: "/create", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443" }) }) })
      ] }) : /* @__PURE__ */ jsx("div", { className: "mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3", children: enriched.map(({
        g,
        dist
      }) => /* @__PURE__ */ jsx(GameRowCard, { g, dist }, g.id)) })
    ] }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
function LocationGate({
  onPick
}) {
  const [busy, setBusy] = useState(null);
  const [query, setQuery] = useState("");
  const useGps = () => {
    if (!navigator.geolocation) {
      toast.error("\u0413\u0435\u043E\u043B\u043E\u043A\u0430\u0446\u0438\u044F \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u043C");
      return;
    }
    setBusy("gps");
    navigator.geolocation.getCurrentPosition((pos) => {
      setBusy(null);
      onPick({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: "\u041C\u043E\u0451 \u043C\u0435\u0441\u0442\u043E\u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435"
      });
    }, (err) => {
      setBusy(null);
      toast.error(err.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0433\u0435\u043E\u043B\u043E\u043A\u0430\u0446\u0438\u044E");
    }, {
      enableHighAccuracy: true,
      timeout: 1e4
    });
  };
  const searchAddress = async (e) => {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;
    setBusy("search");
    try {
      const hit = await geocodeMoscow(text);
      if (!hit) {
        toast.error("\u041D\u0435 \u043D\u0430\u0448\u043B\u0438 \u0442\u0430\u043A\u043E\u0439 \u0430\u0434\u0440\u0435\u0441. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u044C \u0443\u043B\u0438\u0446\u0443 \u0438 \u0434\u043E\u043C.");
        return;
      }
      onPick({
        lat: hit.lat,
        lng: hit.lng,
        label: text.length > 30 ? text.slice(0, 30) + "\u2026" : text
      });
    } catch {
      toast.error("\u0421\u0435\u0440\u0432\u0438\u0441 \u0430\u0434\u0440\u0435\u0441\u043E\u0432 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u0412\u044B\u0431\u0435\u0440\u0438 \u0440\u0430\u0439\u043E\u043D \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430.");
    } finally {
      setBusy(null);
    }
  };
  return /* @__PURE__ */ jsx("section", { className: "container mx-auto px-4 sm:px-6 py-16", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-elegant md:p-12", children: [
    /* @__PURE__ */ jsx(Badge, { className: "mb-4", children: "\u0428\u0430\u0433 1" }),
    /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl font-bold md:text-4xl", children: "\u041E\u0442\u043A\u0443\u0434\u0430 \u0442\u0435\u0431\u0435 \u0443\u0434\u043E\u0431\u043D\u043E \u0438\u0433\u0440\u0430\u0442\u044C?" }),
    /* @__PURE__ */ jsx("p", { className: "mt-3 text-muted-foreground", children: "\u0423\u043A\u0430\u0436\u0438 \u0442\u043E\u0447\u043A\u0443 \u0432 \u041C\u043E\u0441\u043A\u0432\u0435 \u2014 \u043C\u044B \u043F\u043E\u043A\u0430\u0436\u0435\u043C \u0438\u0433\u0440\u044B \u0440\u044F\u0434\u043E\u043C \u0438 \u0443\u0434\u043E\u0431\u043D\u044B\u0435 \u043F\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438." }),
    /* @__PURE__ */ jsxs(Button, { onClick: useGps, disabled: busy !== null, size: "lg", className: "mt-8 w-full bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
      busy === "gps" ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Navigation, { className: "mr-2 h-4 w-4" }),
      "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043C\u043E\u0451 \u043C\u0435\u0441\u0442\u043E\u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "my-6 flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" }),
      /* @__PURE__ */ jsx("span", { className: "text-xs uppercase tracking-widest text-muted-foreground", children: "\u0438\u043B\u0438" }),
      /* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: searchAddress, className: "flex gap-2", children: [
      /* @__PURE__ */ jsx(Input, { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\u0410\u0434\u0440\u0435\u0441 \u0438\u043B\u0438 \u043C\u0435\u0442\u0440\u043E \u0432 \u041C\u043E\u0441\u043A\u0432\u0435", maxLength: 120, className: "h-11" }),
      /* @__PURE__ */ jsx(Button, { type: "submit", disabled: busy !== null || !query.trim(), className: "h-11", children: busy === "search" ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "\u041D\u0430\u0439\u0442\u0438" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-8", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-widest text-muted-foreground", children: "\u0418\u043B\u0438 \u0432\u044B\u0431\u0435\u0440\u0438 \u0440\u0430\u0439\u043E\u043D" }),
      /* @__PURE__ */ jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: moscowSpots.map((s) => /* @__PURE__ */ jsxs("button", { onClick: () => onPick({
        lat: s.lat,
        lng: s.lng,
        label: s.name
      }), className: "rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground", children: [
        /* @__PURE__ */ jsx(MapPin, { className: "mr-1 inline h-3 w-3" }),
        " ",
        s.name
      ] }, s.name)) })
    ] })
  ] }) });
}
function ManualLocationBar({
  onPick,
  onReset
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;
    setBusy(true);
    try {
      const hit = await geocodeMoscow(text);
      if (!hit) {
        toast.error("\u041D\u0435 \u043D\u0430\u0448\u043B\u0438 \u0442\u0430\u043A\u043E\u0439 \u0430\u0434\u0440\u0435\u0441. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u044C \u0443\u043B\u0438\u0446\u0443 \u0438 \u0434\u043E\u043C.");
        return;
      }
      onPick({
        lat: hit.lat,
        lng: hit.lng,
        label: text.length > 30 ? text.slice(0, 30) + "\u2026" : text
      });
      setQuery("");
      toast.success("\u041C\u0435\u0441\u0442\u043E\u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
    } catch {
      toast.error("\u0421\u0435\u0440\u0432\u0438\u0441 \u0430\u0434\u0440\u0435\u0441\u043E\u0432 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D");
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "mt-5 flex flex-col gap-2 sm:flex-row sm:items-center", children: [
    /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "flex flex-1 gap-2 sm:max-w-md", children: [
      /* @__PURE__ */ jsx(Input, { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\u0410\u0434\u0440\u0435\u0441 \u0438\u043B\u0438 \u043C\u0435\u0442\u0440\u043E \u0432 \u041C\u043E\u0441\u043A\u0432\u0435", maxLength: 120, className: "h-10 border-white/30 bg-white/10 text-white placeholder:text-white/60" }),
      /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", disabled: busy || !query.trim(), className: "h-10 bg-white text-primary hover:bg-white/90", children: busy ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "\u0423\u043A\u0430\u0437\u0430\u0442\u044C" })
    ] }),
    /* @__PURE__ */ jsxs(Button, { variant: "secondary", size: "sm", className: "h-10 bg-white/15 text-white hover:bg-white/25", onClick: onReset, children: [
      /* @__PURE__ */ jsx(Navigation, { className: "mr-1 h-4 w-4" }),
      " \u0421\u043C\u0435\u043D\u0438\u0442\u044C \u0442\u043E\u0447\u043A\u0443"
    ] })
  ] });
}
function GameRowCard({
  g,
  dist
}) {
  var _a, _b, _c, _d, _e;
  const taken = (_c = (_b = (_a = g.participants) == null ? void 0 : _a[0]) == null ? void 0 : _b.count) != null ? _c : 0;
  const full = taken >= g.slots_total;
  const pct = Math.round(taken / g.slots_total * 100);
  const distLabel = isFinite(dist) ? `${dist.toFixed(dist < 10 ? 1 : 0)} \u043A\u043C` : null;
  const needed = g.slots_total - taken;
  const startsIn = new Date(g.starts_at).getTime() - Date.now();
  const soon = startsIn > 0 && startsIn < 1e3 * 60 * 60 * 6;
  const almostFull = !full && needed <= 2 && taken > 0;
  const status = full ? {
    label: "\u0417\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E",
    cls: "bg-muted text-muted-foreground"
  } : almostFull ? {
    label: `\u041D\u0443\u0436\u043D\u043E \u0435\u0449\u0451 ${needed}`,
    cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400"
  } : soon ? {
    label: "\u0421\u043A\u043E\u0440\u043E \u0441\u0442\u0430\u0440\u0442",
    cls: "bg-primary/15 text-primary"
  } : taken === 0 ? {
    label: "\u041D\u043E\u0432\u0430\u044F \u0438\u0433\u0440\u0430",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
  } : null;
  return /* @__PURE__ */ jsxs(Link, { to: "/games/$gameId", params: {
    gameId: g.id
  }, className: "group relative block overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-elegant", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-orb opacity-20 blur-2xl transition-opacity group-hover:opacity-40" }),
    status && /* @__PURE__ */ jsx("span", { className: `absolute left-4 top-4 z-10 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.cls}`, children: status.label }),
    /* @__PURE__ */ jsxs("div", { className: `flex items-start justify-between gap-4 ${status ? "mt-7" : ""}`, children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow", children: /* @__PURE__ */ jsx(Calendar$1, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-base font-semibold leading-tight", children: (_d = g.stadium) == null ? void 0 : _d.name }),
          /* @__PURE__ */ jsxs("p", { className: "mt-0.5 flex items-center gap-1 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsx(MapPin, { className: "h-3 w-3" }),
            " ",
            (_e = g.stadium) == null ? void 0 : _e.address
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-1", children: [
        /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "bg-accent text-accent-foreground", children: g.sport }),
        distLabel && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary", children: distLabel })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-5 grid grid-cols-2 gap-3 text-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [
        /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4 text-primary" }),
        formatDate(g.starts_at),
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
    /* @__PURE__ */ jsxs("div", { className: "mt-5 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "\u0437\u0430 \u0438\u0433\u0440\u043E\u043A\u0430" }),
        /* @__PURE__ */ jsxs("p", { className: "font-display text-xl font-bold", children: [
          g.price_per_player,
          " \u20BD"
        ] })
      ] }),
      /* @__PURE__ */ jsx("span", { className: "inline-flex h-10 items-center rounded-md bg-gradient-brand px-4 text-sm font-medium text-primary-foreground", children: full ? "\u041C\u0435\u0441\u0442 \u043D\u0435\u0442" : "\u041E\u0442\u043A\u0440\u044B\u0442\u044C" })
    ] })
  ] });
}
function FilterDropdown({
  label,
  items,
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs("button", { type: "button", className: "inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/40 data-[state=open]:border-primary data-[state=open]:shadow-glow", children: [
      /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4 text-muted-foreground" }),
      /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
        label,
        ":"
      ] }),
      /* @__PURE__ */ jsx("span", { className: "font-display font-bold", children: value }),
      /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 text-muted-foreground" })
    ] }) }),
    /* @__PURE__ */ jsx(DropdownMenuContent, { align: "start", className: "min-w-[200px]", children: items.map((it) => /* @__PURE__ */ jsxs(DropdownMenuItem, { onSelect: () => onChange(it), className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsx("span", { children: it }),
      value === it && /* @__PURE__ */ jsx(Check, { className: "h-4 w-4 text-primary" })
    ] }, it)) })
  ] });
}
function DateUntilFilter({
  value,
  onChange
}) {
  const [open, setOpen] = useState(false);
  const label = value ? value.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }) : "\u041A\u043E\u0433\u0434\u0430 \u0443\u0433\u043E\u0434\u043D\u043E";
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  return /* @__PURE__ */ jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs("button", { type: "button", className: cn("inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/40 data-[state=open]:border-primary data-[state=open]:shadow-glow", value && "border-primary/60"), children: [
      /* @__PURE__ */ jsx(Calendar$1, { className: "h-4 w-4 text-muted-foreground" }),
      /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "\u0414\u043E:" }),
      /* @__PURE__ */ jsx("span", { className: "font-display font-bold", children: label }),
      value && /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5 text-muted-foreground hover:text-foreground", onClick: (e) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(void 0);
      } }),
      /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 text-muted-foreground" })
    ] }) }),
    /* @__PURE__ */ jsxs(PopoverContent, { align: "start", className: "w-auto p-0", children: [
      /* @__PURE__ */ jsx(Calendar, { mode: "single", selected: value, onSelect: (d) => {
        onChange(d);
        setOpen(false);
      }, disabled: (d) => d < today, initialFocus: true, className: cn("p-3 pointer-events-auto") }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 border-t border-border p-2", children: [
        /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: [{
          label: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F",
          days: 0
        }, {
          label: "+3 \u0434\u043D\u044F",
          days: 3
        }, {
          label: "\u041D\u0435\u0434\u0435\u043B\u044F",
          days: 7
        }, {
          label: "2 \u043D\u0435\u0434\u0435\u043B\u0438",
          days: 14
        }, {
          label: "\u041C\u0435\u0441\u044F\u0446",
          days: 30
        }].map((p) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
          const d = /* @__PURE__ */ new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + p.days);
          onChange(d);
          setOpen(false);
        }, className: "rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:border-primary/40 hover:bg-primary/5", children: p.label }, p.label)) }),
        value && /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
          onChange(void 0);
          setOpen(false);
        }, children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C" })
      ] })
    ] })
  ] });
}

export { GamesPage as component };
//# sourceMappingURL=games-DK-YKAre.mjs.map
