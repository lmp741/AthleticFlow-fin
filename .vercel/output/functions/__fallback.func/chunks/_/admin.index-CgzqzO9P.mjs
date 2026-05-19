import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { s as supabase } from './ssr.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { Users, ShieldAlert, Gamepad2, Trophy } from 'lucide-react';
import '@tanstack/react-router';
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

function Dashboard() {
  const [c, setC] = useState({
    users: null,
    banned: null,
    games: null,
    pendingGoals: null
  });
  useEffect(() => {
    let alive = true;
    (async () => {
      const [{
        count: users
      }, {
        count: banned
      }, {
        count: games
      }, {
        count: pending
      }] = await Promise.all([
        supabase.from("profiles").select("id", {
          count: "exact",
          head: true
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.from("profiles").select("id", {
          count: "exact",
          head: true
        }).not("banned_at", "is", null),
        supabase.from("games").select("id", {
          count: "exact",
          head: true
        }).gte("starts_at", (/* @__PURE__ */ new Date()).toISOString()),
        supabase.from("goal_claims").select("id", {
          count: "exact",
          head: true
        }).eq("status", "pending")
      ]);
      if (!alive) return;
      setC({
        users: users != null ? users : 0,
        banned: banned != null ? banned : 0,
        games: games != null ? games : 0,
        pendingGoals: pending != null ? pending : 0
      });
    })();
    return () => {
      alive = false;
    };
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary", children: "\u0410\u0434\u043C\u0438\u043D\u043A\u0430" }),
      /* @__PURE__ */ jsx("h1", { className: "mt-1 font-display text-2xl font-bold sm:text-3xl", children: "\u0414\u0430\u0448\u0431\u043E\u0440\u0434" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "\u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0438 \u0438 \u0441\u0441\u044B\u043B\u043A\u0438." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4", children: [
      /* @__PURE__ */ jsx(Counter, { label: "\u042E\u0437\u0435\u0440\u043E\u0432", value: c.users, icon: Users }),
      /* @__PURE__ */ jsx(Counter, { label: "\u0417\u0430\u0431\u0430\u043D\u0435\u043D\u043E", value: c.banned, icon: ShieldAlert, tone: "destructive" }),
      /* @__PURE__ */ jsx(Counter, { label: "\u0418\u0433\u0440 (\u043F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0435)", value: c.games, icon: Gamepad2 }),
      /* @__PURE__ */ jsx(Counter, { label: "\u0413\u043E\u043B\u043E\u0432 (pending)", value: c.pendingGoals, icon: Trophy, tone: "warning" })
    ] })
  ] });
}
function Counter({
  label,
  value,
  icon: Icon,
  tone = "default"
}) {
  const iconCls = tone === "destructive" ? "bg-destructive/15 text-destructive" : tone === "warning" ? "bg-orange-500/15 text-orange-600 dark:text-orange-400" : "bg-primary/10 text-primary";
  return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5", children: [
    /* @__PURE__ */ jsx("div", { className: `flex h-9 w-9 items-center justify-center rounded-xl ${iconCls}`, children: /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4" }) }),
    /* @__PURE__ */ jsx("p", { className: "mt-3 text-xs uppercase tracking-wider text-muted-foreground", children: label }),
    value === null ? /* @__PURE__ */ jsx(Skeleton, { className: "mt-1 h-7 w-16 rounded" }) : /* @__PURE__ */ jsx("p", { className: "font-display text-2xl font-bold leading-tight sm:text-3xl", children: value.toLocaleString("ru-RU") })
  ] });
}

export { Dashboard as component };
//# sourceMappingURL=admin.index-CgzqzO9P.mjs.map
