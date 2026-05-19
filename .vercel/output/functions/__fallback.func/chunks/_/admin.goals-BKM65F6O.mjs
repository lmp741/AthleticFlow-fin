import { jsxs, jsx } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { B as Button, s as supabase } from './ssr.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { toast } from 'sonner';
import { ExternalLink, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
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
function GoalsAdmin() {
  const [claims, setClaims] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [scope, setScope] = useState("pending");
  const load = async () => {
    let q = supabase.from("goal_claims").select("id, user_id, game_id, count, status, created_at").order("created_at", {
      ascending: false
    }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    if (scope !== "all") q = q.eq("status", scope);
    const {
      data: rows,
      error
    } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    const list = rows != null ? rows : [];
    if (list.length === 0) {
      setClaims([]);
      setHasMore(false);
      return;
    }
    const userIds = Array.from(new Set(list.map((c) => c.user_id)));
    const claimIds = list.map((c) => c.id);
    const [{
      data: profs
    }, {
      data: aps
    }] = await Promise.all([supabase.from("profiles").select("id, username, display_name").in("id", userIds), supabase.from("goal_claim_approvals").select("claim_id").in("claim_id", claimIds)]);
    const pMap = new Map((profs != null ? profs : []).map((p) => [p.id, p]));
    const apMap = /* @__PURE__ */ new Map();
    (aps != null ? aps : []).forEach((a) => {
      var _a;
      return apMap.set(a.claim_id, ((_a = apMap.get(a.claim_id)) != null ? _a : 0) + 1);
    });
    const enriched = list.map((c) => {
      var _a, _b;
      return {
        ...c,
        profile: (_a = pMap.get(c.user_id)) != null ? _a : null,
        approvals_count: (_b = apMap.get(c.id)) != null ? _b : 0
      };
    });
    setHasMore(enriched.length > PAGE_SIZE);
    setClaims(enriched.slice(0, PAGE_SIZE));
  };
  useEffect(() => {
    load();
  }, [page, scope]);
  const force = async (id, status) => {
    const {
      error
    } = await supabase.rpc("admin_force_goal_claim", {
      p_claim: id,
      p_status: status
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`\u0421\u0442\u0430\u0442\u0443\u0441: ${status}`);
      load();
    }
  };
  const remove = async (id) => {
    var _a;
    const ok = window.confirm("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443? \u042D\u0442\u043E \u0431\u0435\u0437\u0432\u043E\u0437\u0432\u0440\u0430\u0442\u043D\u043E.");
    if (!ok) return;
    const {
      error
    } = await supabase.from("goal_claims").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("\u0423\u0434\u0430\u043B\u0435\u043D\u043E");
      await supabase.from("admin_actions").insert({
        actor_id: (_a = (await supabase.auth.getUser()).data.user) == null ? void 0 : _a.id,
        target_kind: "goal_claim",
        target_id: id,
        action: "delete_claim"
      });
      load();
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary", children: "\u0410\u0434\u043C\u0438\u043D\u043A\u0430" }),
      /* @__PURE__ */ jsx("h1", { className: "mt-1 font-display text-2xl font-bold sm:text-3xl", children: "\u0413\u043E\u043B\u044B" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "\u041C\u043E\u0434\u0435\u0440\u0430\u0446\u0438\u044F \u0437\u0430\u044F\u0432\u043E\u043A \u043D\u0430 \u0437\u0430\u0431\u0438\u0442\u044B\u0435 \u0433\u043E\u043B\u044B. force-approve / reject \u0432\u044B\u0441\u0442\u0430\u0432\u043B\u044F\u044E\u0442 \u0441\u0442\u0430\u0442\u0443\u0441 \u043F\u0440\u0438\u043D\u0443\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex gap-1 rounded-full border border-border bg-card p-1 w-fit", children: ["pending", "approved", "rejected", "all"].map((s) => /* @__PURE__ */ jsx("button", { onClick: () => {
      setPage(0);
      setScope(s);
    }, className: `rounded-full px-3 py-1 text-xs font-medium transition-colors ${scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`, children: s === "pending" ? "\u041E\u0436\u0438\u0434\u0430\u044E\u0442" : s === "approved" ? "\u041E\u0434\u043E\u0431\u0440\u0435\u043D\u044B" : s === "rejected" ? "\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u044B" : "\u0412\u0441\u0435" }, s)) }),
    /* @__PURE__ */ jsx("div", { className: "overflow-x-auto rounded-3xl border border-border bg-card shadow-card", children: /* @__PURE__ */ jsxs("table", { className: "w-full min-w-[700px] text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0418\u0433\u0440\u043E\u043A" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0418\u0433\u0440\u0430" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0413\u043E\u043B\u043E\u0432" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0410\u043F\u043F\u0440\u0443\u0432\u044B" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u041A\u043E\u0433\u0434\u0430" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-right", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: claims === null ? Array.from({
        length: 6
      }).map((_, i) => /* @__PURE__ */ jsx("tr", { className: "border-t border-border", children: /* @__PURE__ */ jsx("td", { colSpan: 7, className: "px-4 py-3", children: /* @__PURE__ */ jsx(Skeleton, { className: "h-6 w-full rounded" }) }) }, i)) : claims.length === 0 ? /* @__PURE__ */ jsx("tr", { className: "border-t border-border", children: /* @__PURE__ */ jsx("td", { colSpan: 7, className: "px-4 py-10 text-center text-muted-foreground", children: "\u0417\u0430\u044F\u0432\u043E\u043A \u043D\u0435\u0442" }) }) : claims.map((c) => {
        var _a, _b, _c;
        return /* @__PURE__ */ jsxs("tr", { className: "border-t border-border align-top", children: [
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: (_c = (_a = c.profile) == null ? void 0 : _a.display_name) != null ? _c : ((_b = c.profile) == null ? void 0 : _b.username) ? `@${c.profile.username}` : "\u0418\u0433\u0440\u043E\u043A" }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs(Link, { to: "/games/$gameId", params: {
            gameId: c.game_id
          }, target: "_blank", className: "inline-flex items-center gap-1 text-primary hover:underline", children: [
            "\u041E\u0442\u043A\u0440\u044B\u0442\u044C ",
            /* @__PURE__ */ jsx(ExternalLink, { className: "h-3 w-3" })
          ] }) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-bold", children: c.count }),
          /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
            c.approvals_count,
            " / 3"
          ] }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsx(Badge, { variant: "outline", className: c.status === "approved" ? "border-emerald-300/60 text-emerald-700 dark:text-emerald-400" : c.status === "rejected" ? "border-destructive/60 text-destructive" : "", children: c.status }) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: new Date(c.created_at).toLocaleString("ru-RU", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          }) }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-end gap-1", children: [
            c.status !== "approved" && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => force(c.id, "approved"), children: [
              /* @__PURE__ */ jsx(CheckCircle2, { className: "mr-1 h-3.5 w-3.5" }),
              " Approve"
            ] }),
            c.status !== "rejected" && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => force(c.id, "rejected"), children: [
              /* @__PURE__ */ jsx(XCircle, { className: "mr-1 h-3.5 w-3.5" }),
              " Reject"
            ] }),
            /* @__PURE__ */ jsx(Button, { size: "sm", variant: "destructive", onClick: () => remove(c.id), children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
          ] }) })
        ] }, c.id);
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

export { GoalsAdmin as component };
//# sourceMappingURL=admin.goals-BKM65F6O.mjs.map
