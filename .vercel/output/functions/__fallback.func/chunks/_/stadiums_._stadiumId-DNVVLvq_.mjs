import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, CalendarPlus, Star, MapPin, Users, Navigation, CheckCircle2, Trophy, Lock, Clock, Calendar, Info } from 'lucide-react';
import { h as SiteHeader, g as SiteFooter } from './SiteShell-n-2GeoU1.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { j as Route$a, s as supabase, B as Button } from './ssr.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { m as manegeImg, a as arenaImg, s as stadiumImg, p as parkImg, c as cageImg, t as turfImg } from './arena-86WF60rn.mjs';
import './input-Dzp1k4d4.mjs';
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

const BASE_URL = "https://af-sport.ru";
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
function buildStadiumDescription(stadium) {
  const sportsLine = stadium.sports.length > 0 ? stadium.sports.slice(0, 4).join(", ") : "\u0444\u0443\u0442\u0431\u043E\u043B\u0430 \u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u0438\u0433\u0440 \u0441 \u043C\u044F\u0447\u043E\u043C";
  return `\u0421\u0442\u0430\u0434\u0438\u043E\u043D \xAB${stadium.name}\xBB \u0432 \u041C\u043E\u0441\u043A\u0432\u0435 (${stadium.address}). \u041F\u043B\u043E\u0449\u0430\u0434\u043A\u0438 \u0434\u043B\u044F ${sportsLine}. \u0410\u0440\u0435\u043D\u0434\u0430 \u043E\u0442 ${stadium.price_per_hour} \u20BD/\u0447\u0430\u0441, \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043E\u043D\u043B\u0430\u0439\u043D, \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u043B\u044E\u0431\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0435 \u0438\u0433\u0440\u044B \u2014 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u043A \u043A\u043E\u043C\u0430\u043D\u0434\u0435 \u0438\u043B\u0438 \u0441\u043E\u0431\u0438\u0440\u0430\u0439 \u0441\u0432\u043E\u044E.`.slice(0, 250);
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
function StadiumPage() {
  const {
    stadiumId
  } = Route$a.useParams();
  const [stadium, setStadium] = useState(null);
  const [games, setGames] = useState(null);
  const isOsm = stadiumId.startsWith("osm-");
  useEffect(() => {
    if (isOsm) {
      setStadium(null);
      setGames([]);
      return;
    }
    (async () => {
      const [{
        data: s
      }, {
        data: g
      }] = await Promise.all([supabase.from("stadiums").select("id, name, address, sports, price_per_hour, rating, lat, lng").eq("id", stadiumId).maybeSingle(), supabase.from("games").select("id, sport, level, starts_at, ends_at, price_per_player, slots_total, is_private, participants:game_participants(count)").eq("stadium_id", stadiumId).eq("is_private", false).gte("starts_at", new Date(Date.now() - 60 * 60 * 1e3).toISOString()).order("starts_at", {
        ascending: true
      })]);
      setStadium(s);
      setGames(g != null ? g : []);
    })();
  }, [stadiumId, isOsm]);
  const nextGame = useMemo(() => {
    if (!games || games.length === 0) return null;
    return games[0];
  }, [games]);
  const jsonLd = useMemo(() => {
    if (!stadium) return null;
    const blob = {
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      name: stadium.name,
      description: buildStadiumDescription(stadium),
      url: `${BASE_URL}/stadiums/${stadium.id}`,
      image: `${BASE_URL}${stadiumImageFor(stadium.name)}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: stadium.address,
        addressLocality: "\u041C\u043E\u0441\u043A\u0432\u0430",
        addressCountry: "RU"
      },
      areaServed: {
        "@type": "City",
        name: "\u041C\u043E\u0441\u043A\u0432\u0430"
      },
      priceRange: `\u043E\u0442 ${stadium.price_per_hour} \u20BD/\u0447\u0430\u0441`,
      sport: stadium.sports
    };
    if (stadium.lat != null && stadium.lng != null) {
      blob.geo = {
        "@type": "GeoCoordinates",
        latitude: stadium.lat,
        longitude: stadium.lng
      };
    }
    if (stadium.rating != null) {
      blob.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: stadium.rating,
        bestRating: 5,
        ratingCount: 1
      };
    }
    return blob;
  }, [stadium]);
  const faqLd = useMemo(() => {
    if (!stadium) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: `\u041A\u0430\u043A \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0438\u0433\u0440\u0443 \u043D\u0430 \u0441\u0442\u0430\u0434\u0438\u043E\u043D \xAB${stadium.name}\xBB?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0438\u0433\u0440 \u043D\u0430 \u044D\u0442\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0430\u0442\u0447 \u043F\u043E \u0432\u0438\u0434\u0443 \u0441\u043F\u043E\u0440\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u0435\u043D\u0438, \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041E\u0442\u043A\u0440\u044B\u0442\u044C\xBB \u0438 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u0435\u0441\u044C \u043A \u043A\u043E\u043C\u0430\u043D\u0434\u0435. \u0415\u0441\u043B\u0438 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0445 \u0438\u0433\u0440 \u043D\u0435\u0442, \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443\xBB \u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044D\u0442\u043E\u0442 \u0441\u0442\u0430\u0434\u0438\u043E\u043D \u043F\u0440\u0438 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0438.`
        }
      }, {
        "@type": "Question",
        name: `\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u043E\u0438\u0442 \u0430\u0440\u0435\u043D\u0434\u0430 \u0441\u0442\u0430\u0434\u0438\u043E\u043D\u0430 \xAB${stadium.name}\xBB?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `\u0411\u0430\u0437\u043E\u0432\u0430\u044F \u0446\u0435\u043D\u0430 \u0430\u0440\u0435\u043D\u0434\u044B \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0438 \u043D\u0430 \xAB${stadium.name}\xBB \u2014 \u043E\u0442 ${stadium.price_per_hour} \u20BD \u0432 \u0447\u0430\u0441. \u0418\u0442\u043E\u0433\u043E\u0432\u0430\u044F \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0434\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430 \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0430 \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0432 \u043A\u043E\u043C\u0430\u043D\u0434\u0435 \u0438 \u0447\u0430\u0441\u043E\u0432 \u0430\u0440\u0435\u043D\u0434\u044B \u2014 \u043E\u043D\u0430 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0434\u0435\u043B\u0438\u0442\u0441\u044F \u043C\u0435\u0436\u0434\u0443 \u0432\u0441\u0435\u043C\u0438, \u043A\u0442\u043E \u0437\u0430\u043F\u0438\u0441\u0430\u043B\u0441\u044F \u0432 \u043C\u0430\u0442\u0447.`
        }
      }, {
        "@type": "Question",
        name: `\u041A\u0430\u043A\u0438\u0435 \u0432\u0438\u0434\u044B \u0441\u043F\u043E\u0440\u0442\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u043D\u0430 \xAB${stadium.name}\xBB?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: stadium.sports.length > 0 ? `\u041D\u0430 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B: ${stadium.sports.join(", ")}.` : "\u041D\u0430 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0431\u0430\u0437\u043E\u0432\u044B\u0435 \u0432\u0438\u0434\u044B \u0441\u043F\u043E\u0440\u0442\u0430 \u0441 \u043C\u044F\u0447\u043E\u043C \u2014 \u0443\u0442\u043E\u0447\u043D\u044F\u0439\u0442\u0435 \u0443 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u0430."
        }
      }, {
        "@type": "Question",
        name: "\u0427\u0442\u043E \u0432\u0437\u044F\u0442\u044C \u0441 \u0441\u043E\u0431\u043E\u0439 \u043D\u0430 \u043B\u044E\u0431\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u0443\u044E \u0438\u0433\u0440\u0443?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "\u0421\u043F\u043E\u0440\u0442\u0438\u0432\u043D\u0430\u044F \u0444\u043E\u0440\u043C\u0430 \u0438 \u043E\u0431\u0443\u0432\u044C \u043F\u043E\u0434 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0438, \u0431\u0443\u0442\u044B\u043B\u043A\u0430 \u0432\u043E\u0434\u044B, \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0434\u043B\u044F \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u0438. \u041C\u044F\u0447 \u0438 \u043C\u0430\u043D\u0438\u0448\u043A\u0438 \u043E\u0431\u044B\u0447\u043D\u043E \u0435\u0441\u0442\u044C \u0443 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u0430 \u2014 \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0432 \u0447\u0430\u0442\u0435 \u0438\u0433\u0440\u044B."
        }
      }, {
        "@type": "Question",
        name: "\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u043D\u0430 \u0438\u0433\u0440\u0443?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "\u0414\u0430, \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u043C\u043E\u0436\u043D\u043E \u0438\u0437 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u0438\u0433\u0440\u044B \u0434\u043E \u0435\u0451 \u043D\u0430\u0447\u0430\u043B\u0430. \u0415\u0441\u043B\u0438 \u043E\u043F\u043B\u0430\u0442\u0430 \u0443\u0436\u0435 \u043F\u0440\u043E\u0448\u043B\u0430 \u2014 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 \u0437\u0430\u0432\u0438\u0441\u044F\u0442 \u043E\u0442 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u0430 \u043C\u0430\u0442\u0447\u0430."
        }
      }]
    };
  }, [stadium]);
  if (isOsm) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 py-12 sm:px-6", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/stadiums", className: "mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground", children: [
          /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }),
          " \u041A \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443 \u0441\u0442\u0430\u0434\u0438\u043E\u043D\u043E\u0432"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8", children: [
          /* @__PURE__ */ jsx("h1", { className: "font-display text-2xl font-bold sm:text-3xl", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u0430\u044F \u0433\u043E\u0440\u043E\u0434\u0441\u043A\u0430\u044F \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0430" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-muted-foreground", children: "\u042D\u0442\u043E \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u0430\u044F \u043E\u0431\u0449\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430\u044F \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0430 \u0438\u0437 OpenStreetMap. \u0417\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0438\u0433\u0440 \u043D\u0430 \u043D\u0435\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u2014 \u0441\u043E\u0437\u0434\u0430\u0439 \u0441\u0432\u043E\u044E \u0438 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0430\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u0443." }),
          /* @__PURE__ */ jsx(Button, { asChild: true, className: "mt-6 bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsxs(Link, { to: "/create", children: [
            /* @__PURE__ */ jsx(CalendarPlus, { className: "mr-1 h-4 w-4" }),
            " \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443"
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx(SiteFooter, {})
    ] });
  }
  if (stadium === null && games !== null && games.length === 0) ;
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden", children: [
      stadium && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("img", { src: stadiumImageFor(stadium.name), alt: stadium.name, className: "absolute inset-0 h-full w-full object-cover", loading: "eager" }),
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" }),
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative container mx-auto px-4 pb-8 pt-10 sm:px-6 sm:pt-14 md:pb-12", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/stadiums", className: "mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground", children: [
          /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }),
          " \u041A \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443 \u0441\u0442\u0430\u0434\u0438\u043E\u043D\u043E\u0432"
        ] }),
        stadium ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsx(Badge, { className: "bg-gradient-brand text-primary-foreground", children: "\u041C\u043E\u0441\u043A\u0432\u0430" }),
            stadium.rating != null && /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "gap-1", children: [
              /* @__PURE__ */ jsx(Star, { className: "h-3 w-3 fill-current" }),
              stadium.rating.toFixed(1)
            ] }),
            /* @__PURE__ */ jsxs(Badge, { variant: "outline", children: [
              "\u043E\u0442 ",
              stadium.price_per_hour,
              " \u20BD/\u0447\u0430\u0441"
            ] })
          ] }),
          /* @__PURE__ */ jsx("h1", { className: "mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl md:text-5xl", children: stadium.name }),
          /* @__PURE__ */ jsxs("p", { className: "mt-2 flex items-center gap-2 text-sm text-muted-foreground sm:text-base", children: [
            /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4" }),
            " ",
            stadium.address
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap gap-3", children: [
            nextGame ? /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsxs(Link, { to: "/games/$gameId", params: {
              gameId: nextGame.id
            }, children: [
              /* @__PURE__ */ jsx(Users, { className: "mr-1 h-4 w-4" }),
              " \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0443\u044E \u0438\u0433\u0440\u0443"
            ] }) }) : /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsxs(Link, { to: "/create", children: [
              /* @__PURE__ */ jsx(CalendarPlus, { className: "mr-1 h-4 w-4" }),
              " \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443 \u0437\u0434\u0435\u0441\u044C"
            ] }) }),
            stadium.lat != null && stadium.lng != null && /* @__PURE__ */ jsx(Button, { asChild: true, size: "lg", variant: "outline", children: /* @__PURE__ */ jsxs("a", { href: `https://yandex.ru/maps/?pt=${stadium.lng},${stadium.lat}&z=16&l=map`, target: "_blank", rel: "noopener noreferrer", children: [
              /* @__PURE__ */ jsx(Navigation, { className: "mr-1 h-4 w-4" }),
              " \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u042F.\u041A\u0430\u0440\u0442\u0430\u0445"
            ] }) })
          ] })
        ] }) : /* @__PURE__ */ jsx(Skeleton, { className: "h-32 w-full max-w-2xl rounded-3xl" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "container mx-auto px-4 py-8 sm:px-6 sm:py-10", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-6 lg:grid-cols-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-5 lg:col-span-2", children: [
        stadium && /* @__PURE__ */ jsxs("article", { className: "rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6", children: [
          /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-bold sm:text-2xl", children: "\u041E \u0441\u0442\u0430\u0434\u0438\u043E\u043D\u0435" }),
          /* @__PURE__ */ jsxs("p", { className: "mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base", children: [
            "\u0421\u0442\u0430\u0434\u0438\u043E\u043D ",
            /* @__PURE__ */ jsxs("b", { className: "text-foreground", children: [
              "\xAB",
              stadium.name,
              "\xBB"
            ] }),
            " \u0440\u0430\u0441\u043F\u043E\u043B\u043E\u0436\u0435\u043D \u043F\u043E \u0430\u0434\u0440\u0435\u0441\u0443",
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-foreground", children: stadium.address }),
            " \u0432 \u041C\u043E\u0441\u043A\u0432\u0435. \u042D\u0442\u043E \u043E\u0434\u043D\u0430 \u0438\u0437 \u043F\u043B\u043E\u0449\u0430\u0434\u043E\u043A Athletic Flow: \u0437\u0434\u0435\u0441\u044C \u0440\u0435\u0433\u0443\u043B\u044F\u0440\u043D\u043E \u043F\u0440\u043E\u0445\u043E\u0434\u044F\u0442 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u043B\u044E\u0431\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0435 \u0438\u0433\u0440\u044B \u2014",
            stadium.sports.length > 0 ? ` ${stadium.sports.slice(0, 3).join(", ").toLowerCase()} ` : " \u0438\u0433\u0440\u044B \u0441 \u043C\u044F\u0447\u043E\u043C, ",
            "\u0438 \u0434\u0440. \u0411\u0430\u0437\u043E\u0432\u0430\u044F \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0430\u0440\u0435\u043D\u0434\u044B \u043F\u043E\u043B\u044F \u2014 ",
            /* @__PURE__ */ jsxs("b", { className: "text-foreground", children: [
              "\u043E\u0442 ",
              stadium.price_per_hour,
              " \u20BD \u0432 \u0447\u0430\u0441"
            ] }),
            ", \u0438\u0442\u043E\u0433\u043E\u0432\u0430\u044F \u0446\u0435\u043D\u0430 \u0434\u043B\u044F \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430 \u0434\u0435\u043B\u0438\u0442\u0441\u044F \u043C\u0435\u0436\u0434\u0443 \u0432\u0441\u0435\u043C\u0438, \u043A\u0442\u043E \u0437\u0430\u043F\u0438\u0441\u0430\u043B\u0441\u044F \u043D\u0430 \u043C\u0430\u0442\u0447."
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base", children: "\u0415\u0441\u043B\u0438 \u0442\u044B \u0438\u0449\u0435\u0448\u044C, \u0433\u0434\u0435 \u0441\u044B\u0433\u0440\u0430\u0442\u044C \u0432 \u041C\u043E\u0441\u043A\u0432\u0435 \u0432 \u0432\u044B\u0445\u043E\u0434\u043D\u044B\u0435 \u0438\u043B\u0438 \u0432\u0435\u0447\u0435\u0440\u043E\u043C \u043F\u043E\u0441\u043B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B \u2014 \u043E\u0442\u043A\u0440\u043E\u0439 \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0438\u0436\u0435, \u0432\u044B\u0431\u0435\u0440\u0438 \u043C\u0430\u0442\u0447 \u043F\u043E \u0443\u0440\u043E\u0432\u043D\u044E (\u043D\u043E\u0432\u0438\u0447\u043E\u043A / \u043B\u044E\u0431\u0438\u0442\u0435\u043B\u044C / \u043F\u0440\u043E\u0444\u0438) \u0438 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u043A \u043A\u043E\u043C\u0430\u043D\u0434\u0435 \u0432 3 \u043A\u043B\u0438\u043A\u0430. \u0415\u0441\u043B\u0438 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0435\u0439 \u0438\u0433\u0440\u044B \u043D\u0435\u0442 \u2014 \u0441\u043E\u0437\u0434\u0430\u0439 \u0441\u0432\u043E\u044E \u0438 \u043F\u0440\u0438\u0433\u043B\u0430\u0441\u0438 \u0434\u0440\u0443\u0437\u0435\u0439." })
        ] }),
        stadium && stadium.sports.length > 0 && /* @__PURE__ */ jsxs("article", { className: "rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6", children: [
          /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-bold sm:text-2xl", children: "\u0412\u0438\u0434\u044B \u0441\u043F\u043E\u0440\u0442\u0430 \u043D\u0430 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0435" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "\u0414\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0432\u0438\u0434\u0430 \u0441\u043F\u043E\u0440\u0442\u0430 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0430 \u0441\u0432\u043E\u044F \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0430 \u043F\u043E\u0434 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435 \u0438 \u0440\u0430\u0437\u043C\u0435\u0442\u043A\u0443." }),
          /* @__PURE__ */ jsx("ul", { className: "mt-4 grid gap-2 sm:grid-cols-2", children: stadium.sports.map((sp) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2.5", children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 shrink-0 text-primary" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: sp }),
            /* @__PURE__ */ jsx(Link, { to: "/games", search: {
              sport: sp
            }, className: "ml-auto text-xs font-medium text-primary hover:underline", children: "\u0418\u0433\u0440\u044B \u2192" })
          ] }, sp)) })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end justify-between gap-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-bold sm:text-2xl", children: "\u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0438\u0433\u0440" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "\u0422\u043E\u043B\u044C\u043A\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u043B\u044E\u0431\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0435 \u043C\u0430\u0442\u0447\u0438, \u043D\u0430 \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0435\u0449\u0451 \u043C\u043E\u0436\u043D\u043E \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F." })
            ] }),
            /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", variant: "outline", children: /* @__PURE__ */ jsxs(Link, { to: "/create", children: [
              /* @__PURE__ */ jsx(CalendarPlus, { className: "mr-1 h-4 w-4" }),
              " \u0421\u043E\u0437\u0434\u0430\u0442\u044C"
            ] }) })
          ] }),
          games === null ? /* @__PURE__ */ jsx("div", { className: "mt-4 grid gap-3", children: Array.from({
            length: 3
          }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-24 rounded-2xl" }, i)) }) : games.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-2xl border border-dashed border-border bg-background p-6 text-center", children: [
            /* @__PURE__ */ jsx(Trophy, { className: "mx-auto h-8 w-8 text-muted-foreground" }),
            /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm font-medium", children: "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0438\u0433\u0440" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "\u0411\u0443\u0434\u044C \u043F\u0435\u0440\u0432\u044B\u043C \u2014 \u0441\u043E\u0437\u0434\u0430\u0439 \u043C\u0430\u0442\u0447 \u0438 \u043F\u0440\u0438\u0433\u043B\u0430\u0441\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u0443." })
          ] }) : /* @__PURE__ */ jsx("ul", { className: "mt-4 grid gap-3", children: games.map((g) => {
            var _a, _b, _c;
            const joined = (_c = (_b = (_a = g.participants) == null ? void 0 : _a[0]) == null ? void 0 : _b.count) != null ? _c : 0;
            const full = joined >= g.slots_total;
            return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, { to: "/games/$gameId", params: {
              gameId: g.id
            }, className: "block rounded-2xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsx(Badge, { className: "bg-gradient-brand text-primary-foreground", children: g.sport }),
                /* @__PURE__ */ jsx(Badge, { variant: "outline", children: g.level }),
                g.is_private && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "gap-1", children: [
                  /* @__PURE__ */ jsx(Lock, { className: "h-3 w-3" }),
                  " \u041F\u0440\u0438\u0432\u0430\u0442\u043D\u0430\u044F"
                ] }),
                full && /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: "\u0417\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043E" })
              ] }),
              /* @__PURE__ */ jsx("h3", { className: "mt-3 font-display text-base font-semibold capitalize", children: fmtDate(g.starts_at) }),
              /* @__PURE__ */ jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm", children: [
                /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
                  /* @__PURE__ */ jsx(Clock, { className: "h-3.5 w-3.5" }),
                  " ",
                  fmtTime(g.starts_at),
                  "\u2013",
                  fmtTime(g.ends_at)
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
                  /* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5" }),
                  " ",
                  joined,
                  "/",
                  g.slots_total
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
                  /* @__PURE__ */ jsx(Calendar, { className: "h-3.5 w-3.5" }),
                  " ",
                  g.price_per_player,
                  " \u20BD"
                ] })
              ] })
            ] }) }, g.id);
          }) })
        ] }),
        stadium && /* @__PURE__ */ jsxs("article", { className: "rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6", children: [
          /* @__PURE__ */ jsx("h2", { className: "font-display text-xl font-bold sm:text-2xl", children: "\u0427\u0430\u0441\u0442\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B" }),
          /* @__PURE__ */ jsxs("dl", { className: "mt-4 space-y-4 text-sm sm:text-base", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("dt", { className: "font-semibold", children: [
                "\u041A\u0430\u043A \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0438\u0433\u0440\u0443 \u043D\u0430 \u0441\u0442\u0430\u0434\u0438\u043E\u043D \xAB",
                stadium.name,
                "\xBB?"
              ] }),
              /* @__PURE__ */ jsx("dd", { className: "mt-1 text-muted-foreground", children: "\u0412 \u0431\u043B\u043E\u043A\u0435 \xAB\u0420\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0438\u0433\u0440\xBB \u0432\u044B\u0448\u0435 \u0432\u044B\u0431\u0435\u0440\u0438 \u043C\u0430\u0442\u0447 \u043F\u043E \u0432\u0438\u0434\u0443 \u0441\u043F\u043E\u0440\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u0435\u043D\u0438, \u043D\u0430\u0436\u043C\u0438 \u043D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0438 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0441\u044C \u043A \u043A\u043E\u043C\u0430\u043D\u0434\u0435. \u0415\u0441\u043B\u0438 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0445 \u043C\u0430\u0442\u0447\u0435\u0439 \u043D\u0435\u0442 \u2014 \u043D\u0430\u0436\u043C\u0438 \xAB\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443\xBB \u0438 \u0432\u044B\u0431\u0435\u0440\u0438 \u044D\u0442\u043E\u0442 \u0441\u0442\u0430\u0434\u0438\u043E\u043D." })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "font-semibold", children: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u043E\u0438\u0442 \u0430\u0440\u0435\u043D\u0434\u0430?" }),
              /* @__PURE__ */ jsxs("dd", { className: "mt-1 text-muted-foreground", children: [
                "\u041E\u0442 ",
                /* @__PURE__ */ jsxs("b", { className: "text-foreground", children: [
                  stadium.price_per_hour,
                  " \u20BD \u0432 \u0447\u0430\u0441"
                ] }),
                ". \u0412 \u043B\u044E\u0431\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0445 \u0438\u0433\u0440\u0430\u0445 \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0430\u0440\u0435\u043D\u0434\u044B \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0434\u0435\u043B\u0438\u0442\u0441\u044F \u043C\u0435\u0436\u0434\u0443 \u0432\u0441\u0435\u043C\u0438 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430\u043C\u0438 \u2014 \u043A\u0430\u0436\u0434\u044B\u0439 \u0432\u0438\u0434\u0438\u0442 \u0441\u0432\u043E\u044E \u0446\u0435\u043D\u0443 \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u043C\u0430\u0442\u0447\u0430."
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "font-semibold", children: "\u041A\u0430\u043A\u0438\u0435 \u0432\u0438\u0434\u044B \u0441\u043F\u043E\u0440\u0442\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B?" }),
              /* @__PURE__ */ jsx("dd", { className: "mt-1 text-muted-foreground", children: stadium.sports.length > 0 ? `\u041D\u0430 \u043F\u043B\u043E\u0449\u0430\u0434\u043A\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B: ${stadium.sports.join(", ")}.` : "\u0411\u0430\u0437\u043E\u0432\u044B\u0435 \u0432\u0438\u0434\u044B \u0441\u043F\u043E\u0440\u0442\u0430 \u0441 \u043C\u044F\u0447\u043E\u043C \u2014 \u0443\u0442\u043E\u0447\u043D\u044F\u0439 \u0443 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u0430 \u043C\u0430\u0442\u0447\u0430." })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "font-semibold", children: "\u0427\u0442\u043E \u0432\u0437\u044F\u0442\u044C \u0441 \u0441\u043E\u0431\u043E\u0439?" }),
              /* @__PURE__ */ jsx("dd", { className: "mt-1 text-muted-foreground", children: "\u0421\u043F\u043E\u0440\u0442\u0438\u0432\u043D\u0443\u044E \u0444\u043E\u0440\u043C\u0443 \u0438 \u043E\u0431\u0443\u0432\u044C \u043F\u043E\u0434 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435, \u0431\u0443\u0442\u044B\u043B\u043A\u0443 \u0432\u043E\u0434\u044B, \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442. \u041C\u044F\u0447 \u0438 \u043C\u0430\u043D\u0438\u0448\u043A\u0438 \u043E\u0431\u044B\u0447\u043D\u043E \u0435\u0441\u0442\u044C \u0443 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u0430 \u2014 \u0443\u0442\u043E\u0447\u043D\u0438 \u0432 \u0447\u0430\u0442\u0435 \u0438\u0433\u0440\u044B." })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { className: "font-semibold", children: "\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C?" }),
              /* @__PURE__ */ jsx("dd", { className: "mt-1 text-muted-foreground", children: "\u0414\u0430, \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u043C\u043E\u0436\u043D\u043E \u0438\u0437 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u0438\u0433\u0440\u044B \u0434\u043E \u0435\u0451 \u043D\u0430\u0447\u0430\u043B\u0430. \u0415\u0441\u043B\u0438 \u043E\u043F\u043B\u0430\u0442\u0430 \u0443\u0436\u0435 \u043F\u0440\u043E\u0448\u043B\u0430 \u2014 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440." })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("aside", { className: "space-y-4 lg:sticky lg:top-24 lg:self-start", children: [
        stadium && /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary", children: "\u041A\u0440\u0430\u0442\u043A\u0430\u044F \u0441\u0432\u043E\u0434\u043A\u0430" }),
          /* @__PURE__ */ jsxs("ul", { className: "mt-3 space-y-2.5 text-sm", children: [
            /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsx(MapPin, { className: "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" }),
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: stadium.address })
            ] }),
            /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsx(Trophy, { className: "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" }),
              /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                stadium.sports.length,
                " ",
                pluralize(stadium.sports.length, ["\u0432\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430", "\u0432\u0438\u0434\u0430 \u0441\u043F\u043E\u0440\u0442\u0430", "\u0432\u0438\u0434\u043E\u0432 \u0441\u043F\u043E\u0440\u0442\u0430"])
              ] })
            ] }),
            /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsx(Calendar, { className: "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" }),
              /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                "\u043E\u0442 ",
                stadium.price_per_hour,
                " \u20BD/\u0447\u0430\u0441"
              ] })
            ] }),
            stadium.rating != null && /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsx(Star, { className: "mt-0.5 h-4 w-4 shrink-0 fill-amber-400 text-amber-400" }),
              /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                stadium.rating.toFixed(1),
                " / 5"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Button, { asChild: true, className: "mt-4 w-full bg-gradient-brand text-primary-foreground hover:opacity-90", children: nextGame ? /* @__PURE__ */ jsx(Link, { to: "/games/$gameId", params: {
            gameId: nextGame.id
          }, children: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F" }) : /* @__PURE__ */ jsx(Link, { to: "/create", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443" }) }),
          /* @__PURE__ */ jsxs("p", { className: "mt-2 text-center text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Info, { className: "mr-1 inline h-3 w-3" }),
            "\u0426\u0435\u043D\u0430 \u0434\u0435\u043B\u0438\u0442\u0441\u044F \u043C\u0435\u0436\u0434\u0443 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0430\u043C\u0438"
          ] })
        ] }),
        stadium && stadium.lat != null && stadium.lng != null && /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-base font-semibold", children: "\u041A\u0430\u043A \u0434\u043E\u0431\u0440\u0430\u0442\u044C\u0441\u044F" }),
          /* @__PURE__ */ jsxs("p", { className: "mt-2 text-sm text-muted-foreground", children: [
            stadium.address,
            ". \u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B: ",
            stadium.lat.toFixed(4),
            ", ",
            stadium.lng.toFixed(4),
            "."
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-col gap-2", children: [
            /* @__PURE__ */ jsx(Button, { asChild: true, variant: "outline", size: "sm", children: /* @__PURE__ */ jsx("a", { href: `https://yandex.ru/maps/?pt=${stadium.lng},${stadium.lat}&z=16&l=map`, target: "_blank", rel: "noopener noreferrer", children: "\u042F.\u041A\u0430\u0440\u0442\u044B" }) }),
            /* @__PURE__ */ jsx(Button, { asChild: true, variant: "outline", size: "sm", children: /* @__PURE__ */ jsx("a", { href: `https://www.google.com/maps?q=${stadium.lat},${stadium.lng}`, target: "_blank", rel: "noopener noreferrer", children: "Google Maps" }) })
          ] })
        ] })
      ] })
    ] }) }),
    jsonLd && /* @__PURE__ */ jsx(
      "script",
      {
        type: "application/ld+json",
        dangerouslySetInnerHTML: {
          __html: JSON.stringify(jsonLd)
        }
      }
    ),
    faqLd && /* @__PURE__ */ jsx(
      "script",
      {
        type: "application/ld+json",
        dangerouslySetInnerHTML: {
          __html: JSON.stringify(faqLd)
        }
      }
    ),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
function pluralize(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export { StadiumPage as component };
//# sourceMappingURL=stadiums_._stadiumId-DNVVLvq_.mjs.map
