import { jsx, jsxs } from 'react/jsx-runtime';
import { Link, useNavigate } from '@tanstack/react-router';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Menu, Plus, LogOut, LogIn, User, Search, Bell, Loader2, UserPlus, Check, X, Users, Calendar } from 'lucide-react';
import { u as useAuth, B as Button, A as Avatar, b as AvatarImage, a as AvatarFallback, p as displayLabel, o as cn, s as supabase } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { L as Logo } from './Logo-DDLL_UOB.mjs';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { toast } from 'sonner';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva } from 'class-variance-authority';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(PopoverPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  PopoverPrimitive.Content,
  {
    ref,
    align,
    sideOffset,
    className: cn(
      "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
function fmtDate(iso) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friendReqs, setFriendReqs] = useState([]);
  const [convInvites, setConvInvites] = useState([]);
  const [gameInvites, setGameInvites] = useState([]);
  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: fr } = await supabase.from("friendships").select("id, requester_id, created_at").eq("addressee_id", user.id).eq("status", "pending").order("created_at", { ascending: false });
    const requesterIds = (fr != null ? fr : []).map((r) => r.requester_id);
    let profMap = {};
    if (requesterIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url, nickname, chat_display").in("id", requesterIds);
      (profs != null ? profs : []).forEach((p) => profMap[p.id] = p);
    }
    setFriendReqs(
      (fr != null ? fr : []).map((r) => {
        var _a;
        return {
          id: r.id,
          requester_id: r.requester_id,
          created_at: r.created_at,
          profile: (_a = profMap[r.requester_id]) != null ? _a : null
        };
      })
    );
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1e3).toISOString();
    const { data: cms } = await supabase.from("conversation_members").select("id, conversation_id, joined_at").eq("user_id", user.id).gt("joined_at", since).order("joined_at", { ascending: false });
    const convIds = (cms != null ? cms : []).map((m) => m.conversation_id);
    let convMap = {};
    if (convIds.length) {
      const { data: cs } = await supabase.from("conversations").select("id, name, created_by").in("id", convIds);
      (cs != null ? cs : []).forEach((c) => convMap[c.id] = { name: c.name, created_by: c.created_by });
    }
    setConvInvites(
      (cms != null ? cms : []).filter((m) => convMap[m.conversation_id] && convMap[m.conversation_id].created_by !== user.id).map((m) => {
        var _a, _b;
        return {
          id: m.id,
          conversation_id: m.conversation_id,
          joined_at: m.joined_at,
          name: (_b = (_a = convMap[m.conversation_id]) == null ? void 0 : _a.name) != null ? _b : null
        };
      })
    );
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const in14 = new Date(Date.now() + 14 * 24 * 3600 * 1e3).toISOString();
    const { data: parts } = await supabase.from("game_participants").select("game_id").eq("user_id", user.id);
    const gameIds = (parts != null ? parts : []).map((p) => p.game_id);
    if (gameIds.length) {
      const { data: gs } = await supabase.from("games").select("id, sport, starts_at, stadium_id").in("id", gameIds).gt("starts_at", nowIso).lt("starts_at", in14).order("starts_at", { ascending: true });
      const stadiumIds = Array.from(new Set((gs != null ? gs : []).map((g) => g.stadium_id)));
      let stadiumMap = {};
      if (stadiumIds.length) {
        const { data: st } = await supabase.from("stadiums").select("id, name").in("id", stadiumIds);
        (st != null ? st : []).forEach((s) => stadiumMap[s.id] = s.name);
      }
      setGameInvites(
        (gs != null ? gs : []).map((g) => {
          var _a;
          return {
            id: g.id,
            sport: g.sport,
            starts_at: g.starts_at,
            stadium_name: (_a = stadiumMap[g.stadium_id]) != null ? _a : null
          };
        })
      );
    } else {
      setGameInvites([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    if (!user) return;
    let alive = true;
    load();
    const intId = window.setInterval(() => {
      if (alive) load();
    }, 45e3);
    const onFocus = () => {
      if (alive && document.visibilityState !== "hidden") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      window.clearInterval(intId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user == null ? void 0 : user.id]);
  const total = friendReqs.length + convInvites.length + gameInvites.length;
  const accept = async (f) => {
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", f.id);
    if (error) toast.error(error.message);
    else {
      toast.success("\u0417\u0430\u044F\u0432\u043A\u0430 \u043F\u0440\u0438\u043D\u044F\u0442\u0430");
      load();
    }
  };
  const decline = async (f) => {
    const { error } = await supabase.from("friendships").delete().eq("id", f.id);
    if (error) toast.error(error.message);
    else load();
  };
  if (!user) return null;
  return /* @__PURE__ */ jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "icon", className: "relative", "aria-label": "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F", children: [
      /* @__PURE__ */ jsx(Bell, { className: "h-5 w-5" }),
      total > 0 && /* @__PURE__ */ jsx("span", { className: "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground", children: total > 9 ? "9+" : total })
    ] }) }),
    /* @__PURE__ */ jsxs(PopoverContent, { align: "end", className: "w-[360px] p-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-border px-4 py-3", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold", children: "\u041D\u043E\u0432\u043E\u0441\u0442\u0438" }),
        loading && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin text-muted-foreground" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "max-h-[480px] overflow-y-auto", children: [
        total === 0 && !loading && /* @__PURE__ */ jsx("p", { className: "px-4 py-8 text-center text-sm text-muted-foreground", children: "\u041D\u0435\u0442 \u043D\u043E\u0432\u044B\u0445 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439" }),
        friendReqs.length > 0 && /* @__PURE__ */ jsxs("div", { className: "px-2 py-2", children: [
          /* @__PURE__ */ jsxs("p", { className: "px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", children: [
            /* @__PURE__ */ jsx(UserPlus, { className: "mr-1 inline h-3 w-3" }),
            " \u0417\u0430\u044F\u0432\u043A\u0438 \u0432 \u0434\u0440\u0443\u0437\u044C\u044F"
          ] }),
          /* @__PURE__ */ jsx("ul", { className: "space-y-1", children: friendReqs.map((f) => {
            var _a, _b;
            return /* @__PURE__ */ jsxs(
              "li",
              {
                className: "flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/40",
                children: [
                  /* @__PURE__ */ jsxs(Avatar, { className: "h-9 w-9", children: [
                    ((_a = f.profile) == null ? void 0 : _a.avatar_url) ? /* @__PURE__ */ jsx(AvatarImage, { src: f.profile.avatar_url }) : null,
                    /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[10px]", children: initials(f.profile ? displayLabel(f.profile) : "?") })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium", children: f.profile ? displayLabel(f.profile) : "\u0418\u0433\u0440\u043E\u043A" }),
                    /* @__PURE__ */ jsxs("p", { className: "truncate text-[11px] text-muted-foreground", children: [
                      ((_b = f.profile) == null ? void 0 : _b.username) ? `@${f.profile.username} \xB7 ` : "",
                      fmtDate(f.created_at)
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "icon",
                      className: "h-7 w-7 bg-gradient-brand text-primary-foreground hover:opacity-90",
                      onClick: () => accept(f),
                      "aria-label": "\u041F\u0440\u0438\u043D\u044F\u0442\u044C",
                      children: /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" })
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "icon",
                      variant: "ghost",
                      className: "h-7 w-7",
                      onClick: () => decline(f),
                      "aria-label": "\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C",
                      children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" })
                    }
                  )
                ]
              },
              f.id
            );
          }) })
        ] }),
        convInvites.length > 0 && /* @__PURE__ */ jsxs("div", { className: "border-t border-border px-2 py-2", children: [
          /* @__PURE__ */ jsxs("p", { className: "px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Users, { className: "mr-1 inline h-3 w-3" }),
            " \u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F \u0432 \u0431\u0435\u0441\u0435\u0434\u044B"
          ] }),
          /* @__PURE__ */ jsx("ul", { className: "space-y-1", children: convInvites.map((c) => {
            var _a;
            return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
              Link,
              {
                to: "/chats/$conversationId",
                params: { conversationId: c.conversation_id },
                onClick: () => setOpen(false),
                className: "flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40",
                children: [
                  /* @__PURE__ */ jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground", children: /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" }) }),
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium", children: (_a = c.name) != null ? _a : "\u041D\u043E\u0432\u0430\u044F \u0431\u0435\u0441\u0435\u0434\u0430" }),
                    /* @__PURE__ */ jsxs("p", { className: "truncate text-[11px] text-muted-foreground", children: [
                      "\u0414\u043E\u0431\u0430\u0432\u0438\u043B\u0438 ",
                      fmtDate(c.joined_at)
                    ] })
                  ] })
                ]
              }
            ) }, c.id);
          }) })
        ] }),
        gameInvites.length > 0 && /* @__PURE__ */ jsxs("div", { className: "border-t border-border px-2 py-2", children: [
          /* @__PURE__ */ jsxs("p", { className: "px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Calendar, { className: "mr-1 inline h-3 w-3" }),
            " \u0411\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F"
          ] }),
          /* @__PURE__ */ jsx("ul", { className: "space-y-1", children: gameInvites.map((g) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
            Link,
            {
              to: "/games/$gameId",
              params: { gameId: g.id },
              onClick: () => setOpen(false),
              className: "flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40",
              children: [
                /* @__PURE__ */ jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground", children: /* @__PURE__ */ jsx(Calendar, { className: "h-4 w-4" }) }),
                /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxs("p", { className: "truncate text-sm font-medium", children: [
                    g.sport,
                    g.stadium_name ? ` \xB7 ${g.stadium_name}` : ""
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "truncate text-[11px] text-muted-foreground", children: fmtDate(g.starts_at) })
                ] })
              ]
            }
          ) }, g.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t border-border px-3 py-2 text-xs", children: [
        /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", variant: "ghost", onClick: () => setOpen(false), children: /* @__PURE__ */ jsx(Link, { to: "/friends", children: "\u041A \u0434\u0440\u0443\u0437\u044C\u044F\u043C" }) }),
        /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", variant: "ghost", onClick: () => setOpen(false), children: /* @__PURE__ */ jsx(Link, { to: "/my", children: "\u041A \u043C\u043E\u0438\u043C \u0438\u0433\u0440\u0430\u043C" }) })
      ] })
    ] })
  ] });
}
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetPortal = DialogPrimitive.Portal;
const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Overlay,
  {
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props,
    ref
  }
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
      }
    },
    defaultVariants: {
      side: "right"
    }
  }
);
const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SheetPortal, { children: [
  /* @__PURE__ */ jsx(SheetOverlay, {}),
  /* @__PURE__ */ jsxs(DialogPrimitive.Content, { ref, className: cn(sheetVariants({ side }), className), ...props, children: [
    /* @__PURE__ */ jsxs(DialogPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary", children: [
      /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
      /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
    ] }),
    children
  ] })
] }));
SheetContent.displayName = DialogPrimitive.Content.displayName;
const SheetHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("flex flex-col space-y-2 text-center sm:text-left", className), ...props });
SheetHeader.displayName = "SheetHeader";
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold text-foreground", className),
    ...props
  }
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;
const baseNav = [
  { to: "/games", label: "\u0418\u0433\u0440\u044B" },
  { to: "/stadiums", label: "\u0421\u0442\u0430\u0434\u0438\u043E\u043D\u044B" }
];
const authedNav = [
  { to: "/my", label: "\u041C\u043E\u0438 \u0438\u0433\u0440\u044B" },
  { to: "/friends", label: "\u0414\u0440\u0443\u0437\u044C\u044F" },
  { to: "/chats", label: "\u041E\u0431\u0449\u0435\u043D\u0438\u0435" },
  { to: "/profile", label: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C" }
];
function UserSearch({ onSubmit }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return /* @__PURE__ */ jsxs(
    "form",
    {
      onSubmit: (e) => {
        e.preventDefault();
        const u = q.trim().replace(/^@/, "");
        if (!u) return;
        navigate({ to: "/u/$username", params: { username: u } });
        setQ("");
        onSubmit == null ? void 0 : onSubmit();
      },
      className: "relative w-full",
      children: [
        /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            value: q,
            onChange: (e) => setQ(e.target.value),
            placeholder: "@\u043D\u0438\u043A\u043D\u0435\u0439\u043C",
            className: "h-9 w-full pl-8 text-sm",
            maxLength: 24
          }
        )
      ]
    }
  );
}
const navLinkClass = "relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:-bottom-[22px] after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity";
const navLinkActiveClass = "!text-primary font-semibold after:!opacity-100";
function SiteHeader() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = user ? [...baseNav, ...authedNav] : baseNav;
  const closeSheet = () => setOpen(false);
  return /* @__PURE__ */ jsx("header", { className: "sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl", children: /* @__PURE__ */ jsxs("div", { className: "container mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6", children: [
    /* @__PURE__ */ jsx(Logo, {}),
    /* @__PURE__ */ jsx("nav", { className: "hidden items-center gap-7 md:flex lg:gap-8", children: nav.map((n) => /* @__PURE__ */ jsx(
      Link,
      {
        to: n.to,
        className: navLinkClass,
        activeOptions: { exact: false },
        activeProps: { className: navLinkActiveClass },
        children: n.label
      },
      n.to
    )) }),
    /* @__PURE__ */ jsxs("div", { className: "hidden items-center gap-2 md:flex", children: [
      user && /* @__PURE__ */ jsx("div", { className: "hidden lg:block", children: /* @__PURE__ */ jsx(UserSearch, {}) }),
      user && /* @__PURE__ */ jsx(NotificationsBell, {}),
      user ? /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => signOut(), children: "\u0412\u044B\u0439\u0442\u0438" }) : /* @__PURE__ */ jsx(Button, { variant: "ghost", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/auth", children: "\u0412\u043E\u0439\u0442\u0438" }) }),
      /* @__PURE__ */ jsx(Button, { asChild: true, className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsx(Link, { to: "/create", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 md:hidden", children: [
      user && /* @__PURE__ */ jsx(NotificationsBell, {}),
      /* @__PURE__ */ jsxs(Sheet, { open, onOpenChange: setOpen, children: [
        /* @__PURE__ */ jsx(SheetTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            "aria-label": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043C\u0435\u043D\u044E",
            className: "h-10 w-10",
            children: /* @__PURE__ */ jsx(Menu, { className: "h-5 w-5" })
          }
        ) }),
        /* @__PURE__ */ jsxs(
          SheetContent,
          {
            side: "right",
            className: "flex w-[88vw] max-w-sm flex-col gap-0 p-0",
            children: [
              /* @__PURE__ */ jsx(SheetHeader, { className: "border-b border-border/60 px-5 py-4 text-left", children: /* @__PURE__ */ jsx(SheetTitle, { className: "font-display text-base font-semibold", children: "\u041C\u0435\u043D\u044E" }) }),
              /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-1 px-3 py-3", children: nav.map((n) => /* @__PURE__ */ jsx(
                Link,
                {
                  to: n.to,
                  onClick: closeSheet,
                  className: "rounded-xl px-3 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  activeOptions: { exact: false },
                  activeProps: {
                    className: "!bg-primary/10 !text-primary !font-semibold"
                  },
                  children: n.label
                },
                n.to
              )) }),
              user && /* @__PURE__ */ jsxs("div", { className: "border-t border-border/60 px-5 py-3", children: [
                /* @__PURE__ */ jsx("p", { className: "mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground", children: "\u041F\u043E\u0438\u0441\u043A \u0438\u0433\u0440\u043E\u043A\u0430" }),
                /* @__PURE__ */ jsx(UserSearch, { onSubmit: closeSheet })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "mt-auto flex flex-col gap-2 border-t border-border/60 p-4", children: [
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    asChild: true,
                    className: "bg-gradient-brand text-primary-foreground hover:opacity-90",
                    onClick: closeSheet,
                    children: /* @__PURE__ */ jsxs(Link, { to: "/create", children: [
                      /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
                      "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443"
                    ] })
                  }
                ),
                user ? /* @__PURE__ */ jsxs(
                  Button,
                  {
                    variant: "outline",
                    onClick: () => {
                      signOut();
                      closeSheet();
                    },
                    children: [
                      /* @__PURE__ */ jsx(LogOut, { className: "mr-1 h-4 w-4" }),
                      "\u0412\u044B\u0439\u0442\u0438"
                    ]
                  }
                ) : /* @__PURE__ */ jsx(Button, { variant: "outline", asChild: true, onClick: closeSheet, children: /* @__PURE__ */ jsxs(Link, { to: "/auth", children: [
                  /* @__PURE__ */ jsx(LogIn, { className: "mr-1 h-4 w-4" }),
                  "\u0412\u043E\u0439\u0442\u0438"
                ] }) }),
                user && /* @__PURE__ */ jsx(Button, { variant: "ghost", asChild: true, onClick: closeSheet, children: /* @__PURE__ */ jsxs(Link, { to: "/profile", children: [
                  /* @__PURE__ */ jsx(User, { className: "mr-1 h-4 w-4" }),
                  "\u041F\u0440\u043E\u0444\u0438\u043B\u044C"
                ] }) })
              ] })
            ]
          }
        )
      ] })
    ] })
  ] }) });
}
function SiteFooter() {
  return /* @__PURE__ */ jsxs("footer", { className: "border-t border-border/60 bg-gradient-soft", children: [
    /* @__PURE__ */ jsxs("div", { className: "container mx-auto grid gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 md:gap-10 md:py-12", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Logo, { variant: "horizontal" }),
        /* @__PURE__ */ jsx("p", { className: "max-w-sm text-sm text-muted-foreground", children: "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430 \u0434\u043B\u044F \u043B\u044E\u0431\u0438\u0442\u0435\u043B\u044C\u0441\u043A\u043E\u0433\u043E \u0441\u043F\u043E\u0440\u0442\u0430: \u043D\u0430\u0445\u043E\u0434\u0438 \u0438\u0433\u0440\u044B, \u0441\u043E\u0431\u0438\u0440\u0430\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u0443, \u0438\u0433\u0440\u0430\u0439." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm text-muted-foreground md:col-span-2 md:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "\u0421\u0435\u0440\u0432\u0438\u0441" }),
          /* @__PURE__ */ jsxs("ul", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/games", className: "hover:text-foreground", children: "\u0418\u0433\u0440\u044B" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/stadiums", className: "hover:text-foreground", children: "\u0421\u0442\u0430\u0434\u0438\u043E\u043D\u044B" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/create", className: "hover:text-foreground", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B" }),
          /* @__PURE__ */ jsxs("ul", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/privacy", className: "hover:text-foreground", children: "\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to: "/personal-data", className: "hover:text-foreground", children: "\u0421\u043E\u0433\u043B\u0430\u0441\u0438\u0435 \u043D\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 \u041F\u0414" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B" }),
          /* @__PURE__ */ jsx("ul", { className: "space-y-1.5", children: /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "mailto:hello@athleticflow.app", className: "hover:text-foreground", children: "hello@athleticflow.app" }) }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "border-t border-border/60", children: /* @__PURE__ */ jsxs("div", { className: "container mx-auto flex flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between", children: [
      /* @__PURE__ */ jsxs("p", { children: [
        "\xA9 ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " \u041E\u041E\u041E \xAB\u0410\u0422\u041B\u0415\u0422\u0418\u041A \u0424\u041B\u041E\u0423\xBB. \u0412\u0441\u0435 \u043F\u0440\u0430\u0432\u0430 \u0437\u0430\u0449\u0438\u0449\u0435\u043D\u044B."
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-[11px] leading-relaxed", children: "\u0418\u041D\u041D 5024259241 \xB7 \u041A\u041F\u041F 502401001 \xB7 143442, \u041C\u043E\u0441\u043A\u043E\u0432\u0441\u043A\u0430\u044F \u043E\u0431\u043B., \u041A\u0440\u0430\u0441\u043D\u043E\u0433\u043E\u0440\u0441\u043A\u0438\u0439 \u0440-\u043D, \u0434. \u041E\u0442\u0440\u0430\u0434\u043D\u043E\u0435, \u0443\u043B. \u041F\u044F\u0442\u043D\u0438\u0446\u043A\u0430\u044F, \u0434. 14, \u043A\u0432. 443" })
    ] }) })
  ] });
}

export { Popover as P, Sheet as S, PopoverContent as a, PopoverTrigger as b, SheetContent as c, SheetHeader as d, SheetTitle as e, SheetTrigger as f, SiteFooter as g, SiteHeader as h };
//# sourceMappingURL=SiteShell-n-2GeoU1.mjs.map
