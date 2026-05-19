import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { B as Button, s as supabase } from './ssr.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import '@tanstack/react-router';
import 'sonner';
import '@supabase/supabase-js';
import 'lucide-react';
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

const PAGE_SIZE = 50;
function LogAdmin() {
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const load = async () => {
    const {
      data,
      error
    } = await supabase.from("admin_actions").select("id, actor_id, target_kind, target_id, action, reason, payload, created_at").order("created_at", {
      ascending: false
    }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    if (error) {
      setRows([]);
      return;
    }
    const list = data != null ? data : [];
    if (list.length === 0) {
      setRows([]);
      setHasMore(false);
      return;
    }
    const actorIds = Array.from(new Set(list.map((r) => r.actor_id)));
    const {
      data: profs
    } = await supabase.from("profiles").select("id, username, display_name").in("id", actorIds);
    const pMap = new Map((profs != null ? profs : []).map((p) => [p.id, p]));
    const enriched = list.map((r) => {
      var _a;
      return {
        ...r,
        actor: (_a = pMap.get(r.actor_id)) != null ? _a : null
      };
    });
    setHasMore(enriched.length > PAGE_SIZE);
    setRows(enriched.slice(0, PAGE_SIZE));
  };
  useEffect(() => {
    load();
  }, [page]);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary", children: "\u0410\u0434\u043C\u0438\u043D\u043A\u0430" }),
      /* @__PURE__ */ jsx("h1", { className: "mt-1 font-display text-2xl font-bold sm:text-3xl", children: "\u0410\u0443\u0434\u0438\u0442-\u043B\u043E\u0433" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "\u0412\u0441\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0430\u0434\u043C\u0438\u043D\u043E\u0432. \u0417\u0430\u043F\u0438\u0441\u044C \u0434\u0435\u043B\u0430\u0435\u0442\u0441\u044F \u0447\u0435\u0440\u0435\u0437 \u0442\u0440\u0438\u0433\u0433\u0435\u0440\u044B/RPC \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "overflow-x-auto rounded-3xl border border-border bg-card shadow-card", children: /* @__PURE__ */ jsxs("table", { className: "w-full min-w-[640px] text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u041A\u043E\u0433\u0434\u0430" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u041A\u0442\u043E" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0426\u0435\u043B\u044C" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0414\u0435\u0442\u0430\u043B\u0438" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: rows === null ? Array.from({
        length: 8
      }).map((_, i) => /* @__PURE__ */ jsx("tr", { className: "border-t border-border", children: /* @__PURE__ */ jsx("td", { colSpan: 5, className: "px-4 py-3", children: /* @__PURE__ */ jsx(Skeleton, { className: "h-6 w-full rounded" }) }) }, i)) : rows.length === 0 ? /* @__PURE__ */ jsx("tr", { className: "border-t border-border", children: /* @__PURE__ */ jsx("td", { colSpan: 5, className: "px-4 py-10 text-center text-muted-foreground", children: "\u041B\u043E\u0433 \u043F\u0443\u0441\u0442" }) }) : rows.map((r) => {
        var _a, _b, _c, _d, _e;
        return /* @__PURE__ */ jsxs("tr", { className: "border-t border-border align-top", children: [
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: new Date(r.created_at).toLocaleString("ru-RU", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          }) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: (_c = (_a = r.actor) == null ? void 0 : _a.display_name) != null ? _c : ((_b = r.actor) == null ? void 0 : _b.username) ? `@${r.actor.username}` : r.actor_id.slice(0, 8) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(Badge, { variant: "outline", children: r.action }) }),
          /* @__PURE__ */ jsxs("td", { className: "px-4 py-3 text-xs", children: [
            r.target_kind,
            " \xB7 ",
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: (_e = (_d = r.target_id) == null ? void 0 : _d.slice(0, 8)) != null ? _e : "\u2014" })
          ] }),
          /* @__PURE__ */ jsxs("td", { className: "px-4 py-3 text-xs", children: [
            r.reason && /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: r.reason }),
            r.payload && /* @__PURE__ */ jsx("pre", { className: "overflow-x-auto rounded bg-muted/40 p-1 text-[10px]", children: JSON.stringify(r.payload) })
          ] })
        ] }, r.id);
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

export { LogAdmin as component };
//# sourceMappingURL=admin.log-CNZ-_woM.mjs.map
