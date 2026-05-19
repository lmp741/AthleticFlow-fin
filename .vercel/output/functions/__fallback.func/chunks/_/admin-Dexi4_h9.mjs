import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { Outlet, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { u as useAuth, s as supabase, B as Button } from './ssr.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { h as SiteHeader, g as SiteFooter, S as Sheet, f as SheetTrigger, c as SheetContent, d as SheetHeader, e as SheetTitle } from './SiteShell-n-2GeoU1.mjs';
import { ShieldAlert, Menu, Home, Users, Gamepad2, Star, ScrollText } from 'lucide-react';
import { L as Logo } from './Logo-DDLL_UOB.mjs';
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
import './input-Dzp1k4d4.mjs';
import '@radix-ui/react-popover';

function RequireAdmin({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (cancelled) return;
      setIsAdmin(!error && !!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);
  if (authLoading || isAdmin === null) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsxs("div", { className: "container mx-auto px-4 py-10 sm:px-6", children: [
        /* @__PURE__ */ jsx(Skeleton, { className: "h-10 w-64 rounded-2xl" }),
        /* @__PURE__ */ jsx(Skeleton, { className: "mt-4 h-64 w-full rounded-3xl" })
      ] }),
      /* @__PURE__ */ jsx(SiteFooter, {})
    ] });
  }
  if (!user) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsxs("div", { className: "container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 sm:px-6", children: [
        /* @__PURE__ */ jsx(ShieldAlert, { className: "h-10 w-10 text-muted-foreground" }),
        /* @__PURE__ */ jsx("h1", { className: "mt-4 font-display text-2xl font-bold", children: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0432\u0445\u043E\u0434" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "\u0414\u043B\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u0432 \u0430\u0434\u043C\u0438\u043D\u043A\u0443 \u0432\u043E\u0439\u0434\u0438 \u0432 \u0430\u043A\u043A\u0430\u0443\u043D\u0442." }),
        /* @__PURE__ */ jsx(Button, { asChild: true, className: "mt-6 bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsx(Link, { to: "/auth", children: "\u0412\u043E\u0439\u0442\u0438" }) })
      ] }),
      /* @__PURE__ */ jsx(SiteFooter, {})
    ] });
  }
  if (!isAdmin) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsxs("div", { className: "container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 sm:px-6 text-center", children: [
        /* @__PURE__ */ jsx("h1", { className: "font-display text-7xl font-bold text-muted-foreground", children: "404" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430." }),
        /* @__PURE__ */ jsx(Button, { asChild: true, className: "mt-6 bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsx(Link, { to: "/", children: "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E" }) })
      ] }),
      /* @__PURE__ */ jsx(SiteFooter, {})
    ] });
  }
  return /* @__PURE__ */ jsx(Fragment, { children });
}
const nav = [
  { to: "/admin", label: "\u0414\u0430\u0448\u0431\u043E\u0440\u0434", icon: Home, exact: true },
  { to: "/admin/users", label: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", icon: Users },
  { to: "/admin/games", label: "\u0418\u0433\u0440\u044B", icon: Gamepad2 },
  { to: "/admin/goals", label: "\u0413\u043E\u043B\u044B", icon: Star },
  { to: "/admin/log", label: "\u0410\u0443\u0434\u0438\u0442", icon: ScrollText }
];
const linkClass = "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
const linkActive = "!bg-primary/10 !text-primary !font-semibold";
function AdminShell({ children }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const NavList = ({ onClick }) => /* @__PURE__ */ jsx("nav", { className: "flex flex-col gap-1", children: nav.map((n) => /* @__PURE__ */ jsxs(
    Link,
    {
      to: n.to,
      onClick,
      className: linkClass,
      activeOptions: { exact: !!n.exact },
      activeProps: { className: linkActive },
      children: [
        /* @__PURE__ */ jsx(n.icon, { className: "h-4 w-4" }),
        n.label
      ]
    },
    n.to
  )) });
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx("header", { className: "sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-xl", children: /* @__PURE__ */ jsxs("div", { className: "container mx-auto flex h-14 items-center justify-between gap-2 px-4 sm:px-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxs(Sheet, { open, onOpenChange: setOpen, children: [
          /* @__PURE__ */ jsx(SheetTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
            Button,
            {
              variant: "ghost",
              size: "icon",
              className: "lg:hidden",
              "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u043D\u044E",
              children: /* @__PURE__ */ jsx(Menu, { className: "h-5 w-5" })
            }
          ) }),
          /* @__PURE__ */ jsxs(SheetContent, { side: "left", className: "w-72 p-0", children: [
            /* @__PURE__ */ jsx(SheetHeader, { className: "border-b border-border/60 px-5 py-4 text-left", children: /* @__PURE__ */ jsx(SheetTitle, { className: "font-display text-base font-semibold", children: "\u0410\u0434\u043C\u0438\u043D\u043A\u0430" }) }),
            /* @__PURE__ */ jsx("div", { className: "p-3", children: /* @__PURE__ */ jsx(NavList, { onClick: () => setOpen(false) }) })
          ] })
        ] }),
        /* @__PURE__ */ jsx(Logo, {}),
        /* @__PURE__ */ jsx("span", { className: "hidden rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive sm:inline", children: "Admin" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => navigate({ to: "/" }), children: "\u041A \u0441\u0430\u0439\u0442\u0443" }),
        /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => signOut(), children: "\u0412\u044B\u0439\u0442\u0438" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "container mx-auto grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]", children: [
      /* @__PURE__ */ jsx("aside", { className: "hidden lg:block", children: /* @__PURE__ */ jsxs("div", { className: "sticky top-20", children: [
        /* @__PURE__ */ jsx("p", { className: "px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "\u0420\u0430\u0437\u0434\u0435\u043B\u044B" }),
        /* @__PURE__ */ jsx(NavList, {})
      ] }) }),
      /* @__PURE__ */ jsx("main", { className: "min-w-0", children })
    ] })
  ] });
}
function AdminLayout() {
  return /* @__PURE__ */ jsx(RequireAdmin, { children: /* @__PURE__ */ jsx(AdminShell, { children: /* @__PURE__ */ jsx(Outlet, {}) }) });
}

export { AdminLayout as component };
//# sourceMappingURL=admin-Dexi4_h9.mjs.map
