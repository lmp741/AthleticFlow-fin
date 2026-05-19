import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { useNavigate } from '@tanstack/react-router';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Lock, Globe, Eye, Wallet, Sparkles, ChevronDown, Check, ChevronUp } from 'lucide-react';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { h as SiteHeader, g as SiteFooter } from './SiteShell-n-2GeoU1.mjs';
import { u as useAuth, s as supabase, B as Button, o as cn } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { L as Label } from './label-C6ng35E5.mjs';
import { T as Textarea } from './textarea-CI2Of91b.mjs';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as SelectPrimitive from '@radix-ui/react-select';
import { toast } from 'sonner';
import { R as RequireAuth } from './RequireAuth-D6K_CCtb.mjs';
import 'class-variance-authority';
import './Logo-DDLL_UOB.mjs';
import '@radix-ui/react-popover';
import '@radix-ui/react-dialog';
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
import '@radix-ui/react-label';

const Slider = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxs(
  SliderPrimitive.Root,
  {
    ref,
    className: cn("relative flex w-full touch-none select-none items-center", className),
    ...props,
    children: [
      /* @__PURE__ */ jsx(SliderPrimitive.Track, { className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20", children: /* @__PURE__ */ jsx(SliderPrimitive.Range, { className: "absolute h-full bg-primary" }) }),
      /* @__PURE__ */ jsx(SliderPrimitive.Thumb, { className: "block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" })
    ]
  }
));
Slider.displayName = SliderPrimitive.Root.displayName;
const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  SelectPrimitive.Trigger,
  {
    ref,
    className: cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(SelectPrimitive.Icon, { asChild: true, children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 opacity-50" }) })
    ]
  }
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.ScrollUpButton,
  {
    ref,
    className: cn("flex cursor-default items-center justify-center py-1", className),
    ...props,
    children: /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" })
  }
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.ScrollDownButton,
  {
    ref,
    className: cn("flex cursor-default items-center justify-center py-1", className),
    ...props,
    children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" })
  }
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;
const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
  SelectPrimitive.Content,
  {
    ref,
    className: cn(
      "relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)",
      position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
      className
    ),
    position,
    ...props,
    children: [
      /* @__PURE__ */ jsx(SelectScrollUpButton, {}),
      /* @__PURE__ */ jsx(
        SelectPrimitive.Viewport,
        {
          className: cn(
            "p-1",
            position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          ),
          children
        }
      ),
      /* @__PURE__ */ jsx(SelectScrollDownButton, {})
    ]
  }
) }));
SelectContent.displayName = SelectPrimitive.Content.displayName;
const SelectLabel = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.Label,
  {
    ref,
    className: cn("px-2 py-1.5 text-sm font-semibold", className),
    ...props
  }
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;
const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  SelectPrimitive.Item,
  {
    ref,
    className: cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }) }),
      /* @__PURE__ */ jsx(SelectPrimitive.ItemText, { children })
    ]
  }
));
SelectItem.displayName = SelectPrimitive.Item.displayName;
const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.Separator,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-muted", className),
    ...props
  }
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
const sports = ["\u0424\u0443\u0442\u0431\u043E\u043B", "\u0424\u0443\u0442\u0437\u0430\u043B", "\u0411\u0430\u0441\u043A\u0435\u0442\u0431\u043E\u043B", "\u0412\u043E\u043B\u0435\u0439\u0431\u043E\u043B", "\u041F\u043B\u044F\u0436\u043D\u044B\u0439 \u0432\u043E\u043B\u0435\u0439\u0431\u043E\u043B", "\u0425\u043E\u043A\u043A\u0435\u0439", "\u0425\u043E\u043A\u043A\u0435\u0439 \u043D\u0430 \u0442\u0440\u0430\u0432\u0435", "\u0420\u0435\u0433\u0431\u0438", "\u0410\u043C\u0435\u0440\u0438\u043A\u0430\u043D\u0441\u043A\u0438\u0439 \u0444\u0443\u0442\u0431\u043E\u043B", "\u0413\u0430\u043D\u0434\u0431\u043E\u043B", "\u0411\u0435\u0439\u0441\u0431\u043E\u043B", "\u0412\u043E\u0434\u043D\u043E\u0435 \u043F\u043E\u043B\u043E", "\u0424\u043B\u043E\u0440\u0431\u043E\u043B", "\u0424\u0440\u0438\u0441\u0431\u0438", "\u041F\u0430\u0434\u0435\u043B", "\u0422\u0435\u043D\u043D\u0438\u0441"];
const levels = ["\u041D\u043E\u0432\u0438\u0447\u043E\u043A", "\u041B\u044E\u0431\u0438\u0442\u0435\u043B\u044C", "\u041F\u043E\u043B\u0443\u043F\u0440\u043E\u0444\u0438", "\u041F\u0440\u043E\u0444\u0438"];
function todayISO() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function CreateGamePage() {
  var _a, _b, _c, _d;
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const [sport, setSport] = useState("\u0424\u0443\u0442\u0431\u043E\u043B");
  const [level, setLevel] = useState("\u041B\u044E\u0431\u0438\u0442\u0435\u043B\u044C");
  const [date, setDate] = useState(todayISO());
  const [timeStart, setTimeStart] = useState("19:00");
  const [timeEnd, setTimeEnd] = useState("20:30");
  const [players, setPlayers] = useState([10]);
  const [stadiums, setStadiums] = useState([]);
  const [stadiumId, setStadiumId] = useState("");
  const [rentTotal, setRentTotal] = useState("5000");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!authLoading && !user) navigate({
      to: "/auth"
    });
  }, [user, authLoading, navigate]);
  useEffect(() => {
    (async () => {
      const {
        data
      } = await supabase.from("stadiums").select("id, name, address").order("name");
      if (data) {
        setStadiums(data);
        if (data[0]) setStadiumId(data[0].id);
      }
    })();
  }, []);
  const pricePerPlayer = Math.round((Number(rentTotal) || 0) / Math.max(1, players[0]));
  const submit = async (e) => {
    var _a2;
    e.preventDefault();
    if (!user || !stadiumId) return;
    setSubmitting(true);
    const starts_at = (/* @__PURE__ */ new Date(`${date}T${timeStart}:00`)).toISOString();
    const ends_at = (/* @__PURE__ */ new Date(`${date}T${timeEnd}:00`)).toISOString();
    const {
      data,
      error
    } = await supabase.from("games").insert({
      stadium_id: stadiumId,
      organizer_id: user.id,
      sport,
      level,
      starts_at,
      ends_at,
      slots_total: players[0],
      price_per_player: pricePerPlayer,
      description: description || null,
      is_private: isPrivate
    }).select("id").single();
    setSubmitting(false);
    if (error || !data) {
      toast.error((_a2 = error == null ? void 0 : error.message) != null ? _a2 : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0433\u0440\u0443");
      return;
    }
    await supabase.from("game_participants").insert({
      game_id: data.id,
      user_id: user.id
    });
    toast.success("\u0418\u0433\u0440\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430!");
    navigate({
      to: "/games/$gameId",
      params: {
        gameId: data.id
      }
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden bg-gradient-hero py-10 md:py-14", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white,transparent_55%)] opacity-20" }),
      /* @__PURE__ */ jsxs("div", { className: "relative container mx-auto px-4 sm:px-6", children: [
        /* @__PURE__ */ jsx("h1", { className: "font-display text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl lg:text-5xl", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl text-sm text-white/80 sm:text-base", children: "\u0417\u0430\u043F\u043E\u043B\u043D\u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u2014 \u043C\u044B \u0441\u043E\u0431\u0435\u0440\u0451\u043C \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \u0438 \u043F\u043E\u0434\u0435\u043B\u0438\u043C \u043E\u043F\u043B\u0430\u0442\u0443." })
      ] })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "container mx-auto px-4 sm:px-6 py-8 md:py-12", children: /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "grid gap-6 lg:grid-cols-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-6 lg:col-span-2", children: [
        /* @__PURE__ */ jsx(Card, { title: "\u0412\u0438\u0434 \u0441\u043F\u043E\u0440\u0442\u0430", children: /* @__PURE__ */ jsx(Chips, { items: sports, value: sport, onChange: setSport }) }),
        /* @__PURE__ */ jsx(Card, { title: "\u041A\u043E\u0433\u0434\u0430", icon: Calendar, children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "\u0414\u0430\u0442\u0430" }),
            /* @__PURE__ */ jsxs("div", { className: "relative mt-1", children: [
              /* @__PURE__ */ jsx(Calendar, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
              /* @__PURE__ */ jsx(Input, { type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "\u041D\u0430\u0447\u0430\u043B\u043E" }),
            /* @__PURE__ */ jsxs("div", { className: "relative mt-1", children: [
              /* @__PURE__ */ jsx(Clock, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
              /* @__PURE__ */ jsx(Input, { type: "time", value: timeStart, onChange: (e) => setTimeStart(e.target.value), className: "pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435" }),
            /* @__PURE__ */ jsxs("div", { className: "relative mt-1", children: [
              /* @__PURE__ */ jsx(Clock, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
              /* @__PURE__ */ jsx(Input, { type: "time", value: timeEnd, onChange: (e) => setTimeEnd(e.target.value), className: "pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxs(Card, { title: "\u041B\u043E\u043A\u0430\u0446\u0438\u044F", icon: MapPin, children: [
          /* @__PURE__ */ jsx(Label, { children: "\u0421\u0442\u0430\u0434\u0438\u043E\u043D" }),
          /* @__PURE__ */ jsxs(Select, { value: stadiumId, onValueChange: setStadiumId, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "mt-1 h-11 w-full", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438 \u0441\u0442\u0430\u0434\u0438\u043E\u043D" }) }),
            /* @__PURE__ */ jsx(SelectContent, { position: "popper", className: "max-h-[60vh] w-[var(--radix-select-trigger-width)]", children: stadiums.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s.id, children: /* @__PURE__ */ jsxs("span", { className: "block truncate", children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: s.name }),
              /* @__PURE__ */ jsxs("span", { className: "ml-1 text-xs text-muted-foreground", children: [
                "\u2014 ",
                s.address
              ] })
            ] }) }, s.id)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Card, { title: "\u0423\u0441\u043B\u043E\u0432\u0438\u044F", icon: Users, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C" }),
            /* @__PURE__ */ jsx("div", { className: "mt-2", children: /* @__PURE__ */ jsx(Chips, { items: levels, value: level, onChange: setLevel }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-6", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx(Label, { children: "\u041A\u043E\u043B-\u0432\u043E \u0438\u0433\u0440\u043E\u043A\u043E\u0432" }),
              /* @__PURE__ */ jsx("span", { className: "font-display text-lg font-bold", children: players[0] })
            ] }),
            /* @__PURE__ */ jsx(Slider, { value: players, onValueChange: setPlayers, min: 4, max: 22, step: 1, className: "mt-3" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-6", children: [
            /* @__PURE__ */ jsx(Label, { children: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }),
            /* @__PURE__ */ jsx(Textarea, { value: description, onChange: (e) => setDescription(e.target.value), placeholder: '\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: "\u0411\u0435\u0440\u0438\u0442\u0435 \u0449\u0438\u0442\u043A\u0438"', className: "mt-1 min-h-24" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(Card, { title: "\u0414\u043E\u0441\u0442\u0443\u043F", icon: isPrivate ? Lock : Globe, children: /* @__PURE__ */ jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => setIsPrivate(false), className: `flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${!isPrivate ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"}`, children: [
            /* @__PURE__ */ jsx(Globe, { className: "mt-0.5 h-5 w-5 text-primary" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "font-semibold", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u0430\u044F" }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "\u0412\u0438\u0434\u043D\u0430 \u0432\u0441\u0435\u043C \u0432 \u043F\u043E\u0438\u0441\u043A\u0435 \u0438 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => setIsPrivate(true), className: `flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${isPrivate ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"}`, children: [
            /* @__PURE__ */ jsx(Lock, { className: "mt-0.5 h-5 w-5 text-primary" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "font-semibold", children: "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u0430\u044F" }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "\u0422\u043E\u043B\u044C\u043A\u043E \u043F\u043E \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044E \u0438\u043B\u0438 \u0441\u0441\u044B\u043B\u043A\u0435" })
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("aside", { className: "space-y-4", children: /* @__PURE__ */ jsxs("div", { className: "sticky top-24 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "overflow-hidden rounded-3xl border border-border bg-card shadow-elegant", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3", children: [
            /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4 text-primary" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground", children: "\u041F\u0440\u0435\u0432\u044C\u044E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative h-28 overflow-hidden bg-gradient-brand", children: [
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white,transparent_55%)] opacity-25" }),
            /* @__PURE__ */ jsxs("div", { className: "relative flex h-full items-end justify-between p-5", children: [
              /* @__PURE__ */ jsx(Badge, { className: "border-white/30 bg-white/15 text-white", children: sport }),
              /* @__PURE__ */ jsx(Badge, { className: "border-white/30 bg-white/20 text-white", children: isPrivate ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Lock, { className: "mr-1 h-3 w-3" }),
                " \u041F\u0440\u0438\u0432\u0430\u0442\u043D\u0430\u044F"
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Globe, { className: "mr-1 h-3 w-3" }),
                " \u041E\u0442\u043A\u0440\u044B\u0442\u0430\u044F"
              ] }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-3 p-5", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-display text-lg font-bold leading-tight line-clamp-1", children: (_b = (_a = stadiums.find((s) => s.id === stadiumId)) == null ? void 0 : _a.name) != null ? _b : "\u0412\u044B\u0431\u0435\u0440\u0438 \u0441\u0442\u0430\u0434\u0438\u043E\u043D" }),
            /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1", children: [
              /* @__PURE__ */ jsx(MapPin, { className: "h-3.5 w-3.5" }),
              (_d = (_c = stadiums.find((s) => s.id === stadiumId)) == null ? void 0 : _c.address) != null ? _d : "\u2014"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [
              /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-muted/50 px-3 py-2", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground", children: "\u041A\u043E\u0433\u0434\u0430" }),
                /* @__PURE__ */ jsxs("p", { className: "font-semibold", children: [
                  date ? (/* @__PURE__ */ new Date(`${date}T${timeStart}`)).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short"
                  }) : "\u2014",
                  /* @__PURE__ */ jsxs("span", { className: "ml-1 text-muted-foreground", children: [
                    "\xB7 ",
                    timeStart
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-muted/50 px-3 py-2", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground", children: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C" }),
                /* @__PURE__ */ jsx("p", { className: "font-semibold", children: level })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t border-border pt-3", children: [
              /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-xs text-muted-foreground", children: [
                /* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5" }),
                " 1/",
                players[0],
                " \u0438\u0433\u0440\u043E\u043A\u043E\u0432"
              ] }),
              /* @__PURE__ */ jsx("span", { className: "font-display text-base font-bold", children: pricePerPlayer === 0 ? "\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E" : `${pricePerPlayer} \u20BD` })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Card, { title: "\u041E\u043F\u043B\u0430\u0442\u0430", icon: Wallet, children: [
          /* @__PURE__ */ jsx(Label, { children: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0430\u0440\u0435\u043D\u0434\u044B \u0441\u0442\u0430\u0434\u0438\u043E\u043D\u0430, \u20BD" }),
          /* @__PURE__ */ jsx(Input, { type: "number", value: rentTotal, onChange: (e) => setRentTotal(e.target.value), className: "mt-1" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-2xl bg-muted p-4 text-sm", children: [
            /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "\u0421 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0438\u0433\u0440\u043E\u043A\u0430" }),
            /* @__PURE__ */ jsxs("p", { className: "font-display text-2xl font-bold", children: [
              "\u2248 ",
              pricePerPlayer,
              " \u20BD"
            ] }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Split-payment: \u043E\u043F\u043B\u0430\u0442\u0430 \u0434\u0435\u043B\u0438\u0442\u0441\u044F \u043F\u043E\u0440\u043E\u0432\u043D\u0443 \u0438 \u0443\u0445\u043E\u0434\u0438\u0442 \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0441\u0442\u0430\u0434\u0438\u043E\u043D\u0430." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Button, { type: "submit", size: "lg", disabled: submitting || !stadiumId, className: "w-full bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-90", children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "mr-1 h-4 w-4" }),
          submitting ? "\u041F\u0443\u0431\u043B\u0438\u043A\u0443\u0435\u043C\u2026" : "\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u0438\u0433\u0440\u0443"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-center text-xs text-muted-foreground", children: "\u0418\u0433\u0440\u0430 \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u0438 \u0441\u043E\u0431\u0435\u0440\u0451\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u0443." })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
function Card({
  title,
  icon: Icon,
  children
}) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center gap-2", children: [
      Icon && /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5 text-primary" }),
      /* @__PURE__ */ jsx("h2", { className: "font-display text-lg font-semibold", children: title })
    ] }),
    children
  ] });
}
function Chips({
  items,
  value,
  onChange
}) {
  return /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: items.map((it) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => onChange(it), className: `rounded-full border px-4 py-2 text-sm font-medium transition-all ${value === it ? "border-transparent bg-gradient-brand text-primary-foreground shadow-glow" : "border-border hover:border-primary/40"}`, children: it }, it)) });
}
const SplitComponent = () => /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(CreateGamePage, {}) });

export { SplitComponent as component };
//# sourceMappingURL=create-Ce_aWM4r.mjs.map
