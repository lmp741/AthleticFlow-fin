import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { B as Button, s as supabase, D as Dialog, c as DialogContent, f as DialogHeader, g as DialogTitle, d as DialogDescription, e as DialogFooter } from './ssr.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { L as Label } from './label-C6ng35E5.mjs';
import { toast } from 'sonner';
import { Search, ShieldCheck, ShieldAlert, Crown, Pencil, UserCheck, UserX } from 'lucide-react';
import '@tanstack/react-router';
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

const PAGE_SIZE = 30;
function UsersAdmin() {
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const load = async () => {
    let q = supabase.from("admin_users_view").select("id, username, display_name, phone, phone_verified, level, created_at, banned_at, ban_reason, is_admin, games_organized, games_joined").order("created_at", {
      ascending: false
    }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    const s = search.trim().replace(/^@/, "");
    if (s) {
      const safe = s.replace(/[%_]/g, "\\$&");
      q = q.or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
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
    setUsers(list.slice(0, PAGE_SIZE));
  };
  useEffect(() => {
    load();
  }, [page, search]);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-primary", children: "\u0410\u0434\u043C\u0438\u043D\u043A\u0430" }),
      /* @__PURE__ */ jsx("h1", { className: "mt-1 font-display text-2xl font-bold sm:text-3xl", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative max-w-md", children: [
      /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
      /* @__PURE__ */ jsx(Input, { value: search, onChange: (e) => {
        setPage(0);
        setSearch(e.target.value);
      }, maxLength: 64, placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E @username, \u0438\u043C\u0435\u043D\u0438 \u0438\u043B\u0438 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0443\u2026", className: "h-10 pl-10" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "overflow-x-auto rounded-3xl border border-border bg-card shadow-card", children: /* @__PURE__ */ jsxs("table", { className: "w-full min-w-[720px] text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-left", children: "\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-right", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: users === null ? Array.from({
        length: 6
      }).map((_, i) => /* @__PURE__ */ jsx("tr", { className: "border-t border-border", children: /* @__PURE__ */ jsx("td", { colSpan: 5, className: "px-4 py-3", children: /* @__PURE__ */ jsx(Skeleton, { className: "h-6 w-full rounded" }) }) }, i)) : users.length === 0 ? /* @__PURE__ */ jsx("tr", { className: "border-t border-border", children: /* @__PURE__ */ jsx("td", { colSpan: 5, className: "px-4 py-10 text-center text-muted-foreground", children: "\u041D\u0438\u043A\u043E\u0433\u043E \u043D\u0435 \u043D\u0430\u0448\u043B\u0438" }) }) : users.map((u) => /* @__PURE__ */ jsx(UserRowItem, { u, onChanged: load }, u.id)) })
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
function UserRowItem({
  u,
  onChanged
}) {
  var _a, _b, _c;
  const [banOpen, setBanOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const fullName = (_a = u.display_name) != null ? _a : u.username ? `@${u.username}` : "\u0411\u0435\u0437 \u0438\u043C\u0435\u043D\u0438";
  const banned = !!u.banned_at;
  const unban = async () => {
    const {
      error
    } = await supabase.rpc("admin_unban_user", {
      p_target: u.id
    });
    if (error) toast.error(error.message);
    else {
      toast.success("\u0420\u0430\u0437\u0431\u0430\u043D\u0435\u043D");
      onChanged();
    }
  };
  const toggleAdmin = async () => {
    if (u.is_admin) {
      const ok = window.confirm(`\u0421\u043D\u044F\u0442\u044C \u043F\u0440\u0430\u0432\u0430 admin \u0443 ${fullName}?`);
      if (!ok) return;
      const {
        error
      } = await supabase.rpc("admin_revoke_role", {
        p_target: u.id,
        p_role: "admin"
      });
      if (error) toast.error(error.message);
      else {
        toast.success("\u0420\u043E\u043B\u044C admin \u0441\u043D\u044F\u0442\u0430");
        onChanged();
      }
    } else {
      const ok = window.confirm(`\u0412\u044B\u0434\u0430\u0442\u044C \u043F\u0440\u0430\u0432\u0430 admin \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E ${fullName}?`);
      if (!ok) return;
      const {
        error
      } = await supabase.rpc("admin_grant_role", {
        p_target: u.id,
        p_role: "admin"
      });
      if (error) toast.error(error.message);
      else {
        toast.success("\u0420\u043E\u043B\u044C admin \u0432\u044B\u0434\u0430\u043D\u0430");
        onChanged();
      }
    }
  };
  return /* @__PURE__ */ jsxs("tr", { className: "border-t border-border align-top", children: [
    /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
      /* @__PURE__ */ jsx("p", { className: "font-semibold", children: fullName }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
        u.username ? `@${u.username}` : "\u2014",
        " \xB7 ",
        (_b = u.level) != null ? _b : "\u2014"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
        "\u0421 ",
        new Date(u.created_at).toLocaleDateString("ru-RU")
      ] })
    ] }),
    /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
      /* @__PURE__ */ jsx("p", { children: (_c = u.phone) != null ? _c : "\u2014" }),
      /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground", children: u.phone_verified ? /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400", children: [
        /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3" }),
        " \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D"
      ] }) : "\u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D" })
    ] }),
    /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1", children: [
        banned ? /* @__PURE__ */ jsxs(Badge, { className: "gap-1 bg-destructive/15 text-destructive", children: [
          /* @__PURE__ */ jsx(ShieldAlert, { className: "h-3 w-3" }),
          " \u0411\u0430\u043D"
        ] }) : /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "\u0410\u043A\u0442\u0438\u0432\u0435\u043D" }),
        u.is_admin && /* @__PURE__ */ jsxs(Badge, { className: "gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400", children: [
          /* @__PURE__ */ jsx(Crown, { className: "h-3 w-3" }),
          " admin"
        ] })
      ] }),
      banned && u.ban_reason && /* @__PURE__ */ jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: u.ban_reason })
    ] }),
    /* @__PURE__ */ jsxs("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: [
      "\u0418\u0433\u0440 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u043E\u0432\u0430\u043D\u043E: ",
      /* @__PURE__ */ jsx("b", { className: "text-foreground", children: u.games_organized }),
      /* @__PURE__ */ jsx("br", {}),
      "\u0418\u0433\u0440 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E: ",
      /* @__PURE__ */ jsx("b", { className: "text-foreground", children: u.games_joined })
    ] }),
    /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-end gap-1", children: [
        /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => setEditOpen(true), "aria-label": "\u041F\u0440\u0430\u0432\u0438\u0442\u044C", children: /* @__PURE__ */ jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
        /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: toggleAdmin, "aria-label": "\u0420\u043E\u043B\u044C admin", children: /* @__PURE__ */ jsx(Crown, { className: "h-3.5 w-3.5" }) }),
        banned ? /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: unban, children: [
          /* @__PURE__ */ jsx(UserCheck, { className: "mr-1 h-3.5 w-3.5" }),
          " \u0420\u0430\u0437\u0431\u0430\u043D"
        ] }) : /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "destructive", onClick: () => setBanOpen(true), children: [
          /* @__PURE__ */ jsx(UserX, { className: "mr-1 h-3.5 w-3.5" }),
          " \u0411\u0430\u043D"
        ] })
      ] }),
      /* @__PURE__ */ jsx(BanDialog, { open: banOpen, onOpenChange: setBanOpen, userId: u.id, userName: fullName, onSuccess: onChanged }),
      /* @__PURE__ */ jsx(EditUserDialog, { open: editOpen, onOpenChange: setEditOpen, user: u, onSuccess: onChanged })
    ] })
  ] });
}
function BanDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    const safeReason = reason.trim().slice(0, 500);
    setSaving(true);
    const {
      error
    } = await supabase.rpc("admin_ban_user", {
      p_target: userId,
      p_reason: safeReason || null
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("\u0417\u0430\u0431\u0430\u043D\u0435\u043D");
      onOpenChange(false);
      setReason("");
      onSuccess();
    }
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxs(DialogTitle, { children: [
        "\u0417\u0430\u0431\u0430\u043D\u0438\u0442\u044C ",
        userName,
        "?"
      ] }),
      /* @__PURE__ */ jsx(DialogDescription, { children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u043B\u043E\u0433\u0438\u043D\u0438\u0442\u044C\u0441\u044F \u0438 \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0441 \u0441\u0435\u0440\u0432\u0438\u0441\u043E\u043C. \u041C\u043E\u0436\u043D\u043E \u0440\u0430\u0437\u0431\u0430\u043D\u0438\u0442\u044C \u043F\u043E\u0437\u0436\u0435." })
    ] }),
    /* @__PURE__ */ jsx(Label, { children: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430 (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E, \u0432\u0438\u0434\u043D\u0430 \u0434\u0440\u0443\u0433\u0438\u043C \u0430\u0434\u043C\u0438\u043D\u0430\u043C)" }),
    /* @__PURE__ */ jsx(Input, { value: reason, onChange: (e) => setReason(e.target.value), maxLength: 500, placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u0441\u043F\u0430\u043C, \u043C\u043E\u0448\u0435\u043D\u043D\u0438\u0447\u0435\u0441\u0442\u0432\u043E, \u043E\u0441\u043A\u043E\u0440\u0431\u043B\u0435\u043D\u0438\u044F\u2026" }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
      /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: submit, disabled: saving, children: saving ? "..." : "\u0417\u0430\u0431\u0430\u043D\u0438\u0442\u044C" })
    ] })
  ] }) });
}
function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess
}) {
  var _a, _b, _c;
  const [displayName, setDisplayName] = useState((_a = user.display_name) != null ? _a : "");
  const [username, setUsername] = useState((_b = user.username) != null ? _b : "");
  const [level, setLevel] = useState((_c = user.level) != null ? _c : "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    var _a2, _b2, _c2;
    if (open) {
      setDisplayName((_a2 = user.display_name) != null ? _a2 : "");
      setUsername((_b2 = user.username) != null ? _b2 : "");
      setLevel((_c2 = user.level) != null ? _c2 : "");
    }
  }, [open, user.id]);
  const save = async () => {
    setSaving(true);
    const cleanDisplay = displayName.trim().slice(0, 100);
    const cleanUsername = username.trim().replace(/^@/, "").slice(0, 24);
    const cleanLevel = level.trim().slice(0, 32);
    if (cleanUsername && !/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
      toast.error("Username: 3-24 \u0441\u0438\u043C\u0432\u043E\u043B\u0430, \u043B\u0430\u0442\u0438\u043D\u0438\u0446\u0430/\u0446\u0438\u0444\u0440\u044B/_");
      setSaving(false);
      return;
    }
    const {
      error
    } = await supabase.from("profiles").update({
      display_name: cleanDisplay || null,
      username: cleanUsername || null,
      level: cleanLevel || null
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E");
      onOpenChange(false);
      onSuccess();
    }
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsx(DialogTitle, { children: "\u041F\u0440\u0430\u0432\u0438\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" }),
      /* @__PURE__ */ jsx(DialogDescription, { children: "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u0432 \u0411\u0414 \u0438 \u043F\u043E\u043F\u0430\u0434\u0443\u0442 \u0432 \u0430\u0443\u0434\u0438\u0442-\u043B\u043E\u0433." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Display name" }),
        /* @__PURE__ */ jsx(Input, { value: displayName, onChange: (e) => setDisplayName(e.target.value), maxLength: 100 })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Username" }),
        /* @__PURE__ */ jsx(Input, { value: username, onChange: (e) => setUsername(e.target.value), maxLength: 24 })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C" }),
        /* @__PURE__ */ jsx(Input, { value: level, onChange: (e) => setLevel(e.target.value), maxLength: 32 })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
      /* @__PURE__ */ jsx(Button, { onClick: save, disabled: saving, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: saving ? "..." : "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })
    ] })
  ] }) });
}

export { UsersAdmin as component };
//# sourceMappingURL=admin.users-DShS2Wsv.mjs.map
