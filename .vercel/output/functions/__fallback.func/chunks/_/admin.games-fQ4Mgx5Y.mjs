import { jsxs, jsx } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { B as Button, s as supabase } from './ssr.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { toast } from 'sonner';
import { Search, Lock, Globe, ExternalLink, Trash2 } from 'lucide-react';
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

const PAGE_SIZE = 30;
function GamesAdmin() {
  const [games, setGames] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [scope, setScope] = useState("upcoming");
  const load = async () => {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    let q = supabase.from("games").select("id, sport, level, starts_at, ends_at, price_per_player, slots_total, is_private, status, organizer_id, stadium:stadiums(id,name), participants:game_participants(count)", {
      count: "exact"
    }).order("starts_at", {
      ascending: false
    }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    if (scope === "upcoming") q = q.gte("starts_at", nowIso);
    if (scope === "past") q = q.lt("starts_at", nowIso);
    const s = search.trim();
    if (s) {
      const safe = s.replace(/[%_]/g, "\\$&").slice(0, 64);
      q = q.or(`sport.ilike.%${safe}%,level.ilike.%${safe}%`);
    }
    const {
      data,
      error
    } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = data != null ? data : [];
    setHasMore(list.length > PAGE_SIZE);
    setGames(list.slice(0, PAGE_SIZE));
  };
  useEffect(() => {
    load();
  }, [page, search, scope]);
  const onDelete = async (id) => {
    var _a;
    const ok = window.confirm("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0433\u0440\u0443? \u042D\u0442\u043E \u0431\u0435\u0437\u0432\u043E\u0437\u0432\u0440\u0430\u0442\u043D\u043E \u2014 \u0431\u0443\u0434\u0443\u0442 \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u044B \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438, \u0447\u0430\u0442\u044B, \u0433\u043E\u043B\u044B.");
    if (!ok) return;
    const {
      error
    } = await supabase.from("games").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("\u0423\u0434\u0430\u043B\u0435\u043D\u043E");
      await supabase.from("admin_actions").insert({
        actor_id: (_a = (await supabase.auth.getUser()).data.user) == null ? void 0 : _a.id,
        target_kind: "game",
        target_id: id,
        action: "delete_game"
      });
      load();
    }
  };
  const onCancel = async (id) => {
    var _a;
    const ok = window.confirm("\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0438\u0433\u0440\u0443 (status=cancelled)? \u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438 \u0443\u0432\u0438\u0434\u044F\u0442 \u0447\u0442\u043E \u043C\u0430\u0442\u0447 \u043E\u0442\u043C\u0435\u043D\u0451\u043D.");
    if (!ok) return;
    const {
      error
    } = await supabase.from("games").update({
      status: "cancelled"
    }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("\u0418\u0433\u0440\u0430 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430");
      await supabase.from("admin_actions").insert({
        actor_id: (_a = (await supabase.auth.getUser()).data.user) == null ? void 0 : _a.id,
        target_kind: "game",
        target_id: id,
        action: "cancel_game"
      });
      load();
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary", children: "\u0410\u0434\u043C\u0438\u043D\u043A\u0430" }),
      /* @__PURE__ */ jsx("h1", { className: "mt-1 font-display text-2xl font-bold sm:text-3xl", children: "\u0418\u0433\u0440\u044B" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative max-w-md flex-1", children: [
        /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
        /* @__PURE__ */ jsx(Input, { value: search, onChange: (e) => {
          setPage(0);
          setSearch(e.target.value);
        }, maxLength: 64, placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0432\u0438\u0434\u0443 \u0441\u043F\u043E\u0440\u0442\u0430 \u0438\u043B\u0438 \u0443\u0440\u043E\u0432\u043D\u044E\u2026", className: "h-10 pl-10" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex gap-1 rounded-full border border-border bg-card p-1", children: ["upcoming", "past", "all"].map((s) => /* @__PURE__ */ jsx("button", { onClick: () => {
        setPage(0);
        setScope(s);
      }, className: `rounded-full px-3 py-1 text-xs font-medium transition-colors ${scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`, children: s === "upcoming" ? "\u0411\u0443\u0434\u0443\u0449\u0438\u0435" : s === "past" ? "\u041F\u0440\u043E\u0448\u0435\u0434\u0448\u0438\u0435" : "\u0412\u0441\u0435" }, s)) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "overflow-x-auto rounded-3xl border border-border bg-card shadow-card", children: /* @__PURE__ */ jsxs("table", { className: "w-full min-w-[700px] text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u041A\u043E\u0433\u0434\u0430" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0421\u043F\u043E\u0440\u0442 \xB7 \u0423\u0440\u043E\u0432\u0435\u043D\u044C" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0421\u0442\u0430\u0434\u0438\u043E\u043D" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0421\u043E\u0441\u0442\u0430\u0432" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-right", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: games === null ? Array.from({
        length: 6
      }).map((_, i) => /* @__PURE__ */ jsx("tr", { className: "border-t border-border", children: /* @__PURE__ */ jsx("td", { colSpan: 6, className: "px-4 py-3", children: /* @__PURE__ */ jsx(Skeleton, { className: "h-6 w-full rounded" }) }) }, i)) : games.length === 0 ? /* @__PURE__ */ jsx("tr", { className: "border-t border-border", children: /* @__PURE__ */ jsx("td", { colSpan: 6, className: "px-4 py-10 text-center text-muted-foreground", children: "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0448\u043B\u0438" }) }) : games.map((g) => {
        var _a, _b, _c, _d, _e;
        return /* @__PURE__ */ jsxs("tr", { className: "border-t border-border align-top", children: [
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: new Date(g.starts_at).toLocaleString("ru-RU", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          }) }),
          /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
            g.sport,
            " ",
            /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
              "\xB7 ",
              g.level
            ] })
          ] }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: (_b = (_a = g.stadium) == null ? void 0 : _a.name) != null ? _b : "\u2014" }),
          /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
            (_e = (_d = (_c = g.participants) == null ? void 0 : _c[0]) == null ? void 0 : _d.count) != null ? _e : 0,
            "/",
            g.slots_total,
            " \xB7 ",
            g.price_per_player,
            " \u20BD"
          ] }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1", children: [
            g.status === "cancelled" ? /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-destructive", children: "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u0430" }) : /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: g.status || "active" }),
            g.is_private ? /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "gap-1", children: [
              /* @__PURE__ */ jsx(Lock, { className: "h-3 w-3" }),
              " \u041F\u0440\u0438\u0432\u0430\u0442\u043D\u0430\u044F"
            ] }) : /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "gap-1", children: [
              /* @__PURE__ */ jsx(Globe, { className: "h-3 w-3" }),
              " \u041E\u0442\u043A\u0440\u044B\u0442\u0430\u044F"
            ] })
          ] }) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-end gap-1", children: [
            /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", variant: "ghost", children: /* @__PURE__ */ jsx(Link, { to: "/games/$gameId", params: {
              gameId: g.id
            }, target: "_blank", children: /* @__PURE__ */ jsx(ExternalLink, { className: "h-3.5 w-3.5" }) }) }),
            g.status !== "cancelled" && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => onCancel(g.id), children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C" }),
            /* @__PURE__ */ jsx(Button, { size: "sm", variant: "destructive", onClick: () => onDelete(g.id), children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
          ] }) })
        ] }, g.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: page === 0, onClick: () => setPage((p) => Math.max(0, p - 1)), children: "\u041D\u0430\u0437\u0430\u0434" }),
      /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
        "\u0421\u0442\u0440. ",
        page + 1
      ] }),
      /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: !hasMore, onClick: () => setPage((p) => p + 1), children: "\u0414\u0430\u043B\u0435\u0435" })
    ] })
  ] });
}

export { GamesAdmin as component };
//# sourceMappingURL=admin.games-fQ4Mgx5Y.mjs.map
