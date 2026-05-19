import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Loader2, Star, ShieldCheck, User, Upload, Plus, CreditCard, Check, Trash2, X, Sparkles, Video, Trophy, MapPin, Calendar, Phone, Minus } from 'lucide-react';
import { h as SiteHeader, g as SiteFooter } from './SiteShell-n-2GeoU1.mjs';
import { u as useAuth, s as supabase, B as Button, D as Dialog, c as DialogContent, f as DialogHeader, g as DialogTitle, d as DialogDescription, e as DialogFooter, o as cn } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { L as Label } from './label-C6ng35E5.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { R as RequireAuth } from './RequireAuth-D6K_CCtb.mjs';
import { toast } from 'sonner';
import { i as isValidRuPhone, f as formatRuPhone, t as toE164Ru } from './phone-BjxCDanq.mjs';
import { OTPInput, OTPInputContext } from 'input-otp';
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
import '@radix-ui/react-label';

const InputOTP = React.forwardRef(({ className, containerClassName, ...props }, ref) => /* @__PURE__ */ jsx(
  OTPInput,
  {
    ref,
    containerClassName: cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      containerClassName
    ),
    className: cn("disabled:cursor-not-allowed", className),
    ...props
  }
));
InputOTP.displayName = "InputOTP";
const InputOTPGroup = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("flex items-center", className), ...props }));
InputOTPGroup.displayName = "InputOTPGroup";
const InputOTPSlot = React.forwardRef(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref,
      className: cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className
      ),
      ...props,
      children: [
        char,
        hasFakeCaret && /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsx("div", { className: "h-4 w-px animate-caret-blink bg-foreground duration-1000" }) })
      ]
    }
  );
});
InputOTPSlot.displayName = "InputOTPSlot";
const InputOTPSeparator = React.forwardRef(({ ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, role: "separator", ...props, children: /* @__PURE__ */ jsx(Minus, {}) }));
InputOTPSeparator.displayName = "InputOTPSeparator";
const RESEND_SECONDS = 60;
function PhoneVerifyDialog({
  open,
  onOpenChange,
  userId,
  phone,
  purpose = "verify",
  onVerified
}) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [devCode, setDevCode] = useState(null);
  useEffect(() => {
    if (!open) {
      setCode("");
      setDevCode(null);
      setSecondsLeft(0);
    }
  }, [open]);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1e3);
    return () => clearInterval(t);
  }, [secondsLeft]);
  const sendCode = async () => {
    const e164 = toE164Ru(phone);
    if (!e164) {
      toast.error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440. \u0424\u043E\u0440\u043C\u0430\u0442: +7 (XXX) XXX-XX-XX");
      return;
    }
    setSending(true);
    const generated = String(Math.floor(1e5 + Math.random() * 9e5));
    const { error } = await supabase.from("phone_verifications").insert({
      user_id: userId,
      phone: e164,
      code: generated,
      purpose
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSecondsLeft(RESEND_SECONDS);
    setDevCode(generated);
    toast.success("\u041A\u043E\u0434 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D. SMS-\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 \u043F\u043E\u043A\u0430 \u0432 \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435.");
  };
  const verify = async () => {
    const e164 = toE164Ru(phone);
    if (!e164) return;
    if (code.length !== 6) {
      toast.error("\u0412\u0432\u0435\u0434\u0438 6 \u0446\u0438\u0444\u0440 \u043A\u043E\u0434\u0430");
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.from("phone_verifications").select("id, code, expires_at, consumed_at").eq("user_id", userId).eq("phone", e164).eq("purpose", purpose).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !data) {
      setVerifying(false);
      toast.error("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0438 \u043A\u043E\u0434");
      return;
    }
    if (data.consumed_at) {
      setVerifying(false);
      toast.error("\u042D\u0442\u043E\u0442 \u043A\u043E\u0434 \u0443\u0436\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D, \u0437\u0430\u043F\u0440\u043E\u0441\u0438 \u043D\u043E\u0432\u044B\u0439");
      return;
    }
    if (new Date(data.expires_at).getTime() < Date.now()) {
      setVerifying(false);
      toast.error("\u041A\u043E\u0434 \u0438\u0441\u0442\u0451\u043A, \u0437\u0430\u043F\u0440\u043E\u0441\u0438 \u043D\u043E\u0432\u044B\u0439");
      return;
    }
    if (data.code !== code) {
      setVerifying(false);
      toast.error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043E\u0434");
      return;
    }
    await supabase.from("phone_verifications").update({ consumed_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", data.id);
    if (purpose === "verify") {
      await supabase.from("profiles").update({ phone: e164, phone_verified: true }).eq("id", userId);
    }
    setVerifying(false);
    toast.success(purpose === "verify" ? "\u041D\u043E\u043C\u0435\u0440 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D" : "\u041A\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D");
    onVerified();
    onOpenChange(false);
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(ShieldCheck, { className: "h-5 w-5 text-primary" }),
        "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043D\u043E\u043C\u0435\u0440\u0430"
      ] }),
      /* @__PURE__ */ jsxs(DialogDescription, { children: [
        "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u043C SMS \u0441 6-\u0437\u043D\u0430\u0447\u043D\u044B\u043C \u043A\u043E\u0434\u043E\u043C \u043D\u0430",
        " ",
        /* @__PURE__ */ jsx("span", { className: "font-display font-bold text-foreground", children: formatRuPhone(phone) }),
        ". \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440 \u043C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0434\u043B\u044F \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u0430\u0440\u043E\u043B\u044F."
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsx(Phone, { className: "h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "SMS-\u043A\u043E\u0434" })
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "sm",
            variant: "outline",
            onClick: sendCode,
            disabled: sending || secondsLeft > 0,
            children: sending ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : secondsLeft > 0 ? `\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0447\u0435\u0440\u0435\u0437 ${secondsLeft}\u0441` : devCode ? "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0435\u0449\u0451 \u0440\u0430\u0437" : "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u0434"
          }
        )
      ] }),
      devCode && /* @__PURE__ */ jsxs("p", { className: "rounded-xl border border-dashed border-amber-400/60 bg-amber-50 p-2 text-center text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200", children: [
        "\u0422\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0440\u0435\u0436\u0438\u043C: \u0440\u0435\u0430\u043B\u044C\u043D\u0430\u044F SMS \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430. \u0422\u0432\u043E\u0439 \u043A\u043E\u0434:",
        " ",
        /* @__PURE__ */ jsx("span", { className: "font-mono text-base font-bold", children: devCode })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsx(InputOTP, { maxLength: 6, value: code, onChange: setCode, children: /* @__PURE__ */ jsxs(InputOTPGroup, { children: [
        /* @__PURE__ */ jsx(InputOTPSlot, { index: 0 }),
        /* @__PURE__ */ jsx(InputOTPSlot, { index: 1 }),
        /* @__PURE__ */ jsx(InputOTPSlot, { index: 2 }),
        /* @__PURE__ */ jsx(InputOTPSlot, { index: 3 }),
        /* @__PURE__ */ jsx(InputOTPSlot, { index: 4 }),
        /* @__PURE__ */ jsx(InputOTPSlot, { index: 5 })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => onOpenChange(false), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
      /* @__PURE__ */ jsx(
        Button,
        {
          onClick: verify,
          disabled: verifying || code.length !== 6,
          className: "bg-gradient-brand text-primary-foreground hover:opacity-90",
          children: verifying ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C"
        }
      )
    ] })
  ] }) });
}
const levels = ["\u041D\u043E\u0432\u0438\u0447\u043E\u043A", "\u041B\u044E\u0431\u0438\u0442\u0435\u043B\u044C", "\u041F\u043E\u043B\u0443\u043F\u0440\u043E\u0444\u0438", "\u041F\u0440\u043E\u0444\u0438"];
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function ProfilePage() {
  var _a, _b, _c, _d, _e;
  const {
    user
  } = useAuth();
  const [profile, setProfile] = useState({
    display_name: "",
    avatar_url: null,
    phone: "",
    phone_verified: false,
    phone_public: false,
    level: "\u041B\u044E\u0431\u0438\u0442\u0435\u043B\u044C",
    username: "",
    numeric_id: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [raters, setRaters] = useState({});
  const [verifyOpen, setVerifyOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const {
        data
      } = await supabase.from("profiles").select("display_name, avatar_url, phone, level, username, phone_verified, phone_public, numeric_id").eq("id", user.id).maybeSingle();
      if (data) setProfile(data);
      setLoading(false);
      const {
        data: parts
      } = await supabase.from("game_participants").select("game:games(id, sport, starts_at, ends_at, stadium:stadiums(name,address))").eq("user_id", user.id);
      const now = Date.now();
      const games = (parts != null ? parts : []).map((p) => p.game).filter(Boolean);
      setUpcoming(games.filter((g) => new Date(g.starts_at).getTime() >= now).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)));
      setPast(games.filter((g) => new Date(g.ends_at).getTime() < now).sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at)));
      const {
        data: rs
      } = await supabase.from("user_ratings").select("id, rater_id, score, comment, created_at").eq("ratee_id", user.id).order("created_at", {
        ascending: false
      });
      const list = rs != null ? rs : [];
      setRatings(list);
      const ids = Array.from(new Set(list.map((r) => r.rater_id)));
      if (ids.length) {
        const {
          data: ps
        } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids);
        const map = {};
        (ps != null ? ps : []).forEach((p) => map[p.id] = p);
        setRaters(map);
      }
    })();
  }, [user]);
  const save = async () => {
    var _a2, _b2, _c2, _d2;
    if (!user) return;
    const uname = ((_a2 = profile.username) == null ? void 0 : _a2.trim()) || null;
    if (uname && !/^[A-Za-z0-9_]{3,24}$/.test(uname)) {
      toast.error("\u041D\u0438\u043A\u043D\u0435\u0439\u043C: 3\u201324 \u0441\u0438\u043C\u0432\u043E\u043B\u0430, \u043B\u0430\u0442\u0438\u043D\u0438\u0446\u0430, \u0446\u0438\u0444\u0440\u044B \u0438\u043B\u0438 _");
      return;
    }
    const rawPhone = ((_b2 = profile.phone) == null ? void 0 : _b2.trim()) || "";
    let phoneToSave = null;
    if (rawPhone) {
      const e164 = toE164Ru(rawPhone);
      if (!e164) {
        toast.error("\u0422\u0435\u043B\u0435\u0444\u043E\u043D \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0440\u043E\u0441\u0441\u0438\u0439\u0441\u043A\u0438\u043C: +7 (XXX) XXX-XX-XX");
        return;
      }
      phoneToSave = e164;
    }
    setSaving(true);
    const phoneChanged = phoneToSave !== ((_c2 = toE164Ru(profile.phone)) != null ? _c2 : null) || false;
    const {
      error
    } = await supabase.from("profiles").update({
      display_name: ((_d2 = profile.display_name) == null ? void 0 : _d2.trim()) || null,
      phone: phoneToSave,
      phone_verified: phoneChanged ? false : profile.phone_verified,
      phone_public: profile.phone_public,
      level: profile.level,
      username: uname
    }).eq("id", user.id);
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("\u042D\u0442\u043E\u0442 \u043D\u0438\u043A\u043D\u0435\u0439\u043C \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442");
      else toast.error(error.message);
    } else {
      setProfile((p) => ({
        ...p,
        phone: phoneToSave
      }));
      toast.success("\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D");
    }
  };
  const uploadAvatar = async (file) => {
    var _a2;
    if (!user) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 3 \u041C\u0411");
      return;
    }
    setUploading(true);
    const ext = (_a2 = file.name.split(".").pop()) != null ? _a2 : "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const {
      error: upErr
    } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true
    });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const {
      data: pub
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from("profiles").update({
      avatar_url: url
    }).eq("id", user.id);
    setProfile((p) => ({
      ...p,
      avatar_url: url
    }));
    setUploading(false);
    toast.success("\u0410\u0432\u0430\u0442\u0430\u0440 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D");
  };
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsx("div", { className: "container mx-auto p-12", children: /* @__PURE__ */ jsx(Loader2, { className: "mx-auto h-6 w-6 animate-spin text-muted-foreground" }) })
    ] });
  }
  const avgRating = ratings.length === 0 ? null : ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
  const completedCount = past.length;
  const upcomingCount = upcoming.length;
  const attendanceStreak = completedCount;
  const reliability = completedCount === 0 ? null : Math.min(100, Math.round(completedCount / (completedCount + 0) * 100));
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsx("section", { className: "bg-gradient-hero py-12", children: /* @__PURE__ */ jsxs("div", { className: "container mx-auto px-4 sm:px-6", children: [
      /* @__PURE__ */ jsx(Badge, { className: "mb-3 border-white/30 bg-white/10 text-white", children: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C" }),
      /* @__PURE__ */ jsx("h1", { className: "font-display text-4xl font-bold text-white md:text-5xl", children: profile.display_name || "\u0418\u0433\u0440\u043E\u043A" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-white/80", children: user == null ? void 0 : user.email }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm text-white", children: [
          /* @__PURE__ */ jsx(Star, { className: "h-4 w-4 fill-white" }),
          avgRating === null ? "\u041F\u043E\u043A\u0430 \u0431\u0435\u0437 \u043E\u0446\u0435\u043D\u043E\u043A" : `${avgRating.toFixed(1)} / 5 \xB7 ${ratings.length} ${ratings.length === 1 ? "\u043E\u0446\u0435\u043D\u043A\u0430" : "\u043E\u0446\u0435\u043D\u043E\u043A"}`
        ] }),
        profile.phone_verified && /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-sm text-white ring-1 ring-emerald-200/40", children: [
          /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4" }),
          " \u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u0438\u0433\u0440\u043E\u043A"
        ] }),
        profile.username && /* @__PURE__ */ jsx(Link, { to: "/u/$username", params: {
          username: profile.username
        }, className: "rounded-full bg-white/15 px-3 py-1 text-sm text-white hover:bg-white/25", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u2192" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/15", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wider text-white/70", children: "\u0421\u044B\u0433\u0440\u0430\u043D\u043E" }),
          /* @__PURE__ */ jsx("p", { className: "font-display text-2xl font-bold text-white", children: completedCount })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/15", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wider text-white/70", children: "\u0412\u043F\u0435\u0440\u0435\u0434\u0438" }),
          /* @__PURE__ */ jsx("p", { className: "font-display text-2xl font-bold text-white", children: upcomingCount })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/15", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wider text-white/70", children: "\u0421\u0435\u0440\u0438\u044F" }),
          /* @__PURE__ */ jsxs("p", { className: "font-display text-2xl font-bold text-white", children: [
            attendanceStreak,
            /* @__PURE__ */ jsx("span", { className: "ml-1 text-sm", children: "\u{1F525}" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/15", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wider text-white/70", children: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C" }),
          /* @__PURE__ */ jsx("p", { className: "font-display text-lg font-bold text-white", children: profile.level || "\u2014" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [
        completedCount >= 1 && /* @__PURE__ */ jsx(Badge, { className: "border-white/20 bg-white/15 text-white", children: "\u{1F3AF} \u041F\u0435\u0440\u0432\u0430\u044F \u0438\u0433\u0440\u0430" }),
        completedCount >= 5 && /* @__PURE__ */ jsx(Badge, { className: "border-white/20 bg-white/15 text-white", children: "\u26A1 5 \u043C\u0430\u0442\u0447\u0435\u0439" }),
        completedCount >= 10 && /* @__PURE__ */ jsx(Badge, { className: "border-white/20 bg-white/15 text-white", children: "\u{1F3C6} 10 \u043C\u0430\u0442\u0447\u0435\u0439" }),
        avgRating !== null && avgRating >= 4.5 && /* @__PURE__ */ jsx(Badge, { className: "border-white/20 bg-white/15 text-white", children: "\u2B50 \u041B\u044E\u0431\u0438\u043C\u0435\u0446 \u043A\u043E\u043C\u0430\u043D\u0434\u044B" }),
        profile.phone_verified && /* @__PURE__ */ jsx(Badge, { className: "border-white/20 bg-white/15 text-white", children: "\u2705 \u0412\u0435\u0440\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u043D" }),
        reliability !== null && reliability >= 90 && completedCount >= 3 && /* @__PURE__ */ jsx(Badge, { className: "border-white/20 bg-white/15 text-white", children: "\u{1F4C5} \u041D\u0430\u0434\u0451\u0436\u043D\u0430\u044F \u044F\u0432\u043A\u0430" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto grid gap-8 px-6 py-12 lg:grid-cols-[360px_1fr]", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-elegant", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            profile.avatar_url ? /* @__PURE__ */ jsx("img", { src: profile.avatar_url, alt: "avatar", className: "h-32 w-32 rounded-full object-cover shadow-glow" }) : /* @__PURE__ */ jsx("div", { className: "flex h-32 w-32 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground shadow-glow", children: /* @__PURE__ */ jsx(User, { className: "h-12 w-12" }) }),
            /* @__PURE__ */ jsxs("label", { className: "absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-card hover:opacity-90", children: [
              uploading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }),
              /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", className: "hidden", onChange: (e) => {
                var _a2;
                const f = (_a2 = e.target.files) == null ? void 0 : _a2[0];
                if (f) uploadAvatar(f);
              } })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-4 text-xs uppercase tracking-widest text-muted-foreground", children: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B" }),
          /* @__PURE__ */ jsx("p", { className: "font-display text-lg font-bold", children: profile.level || "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-8 space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "numeric_id", children: "ID" }),
            /* @__PURE__ */ jsx(Input, { id: "numeric_id", value: (_a = profile.numeric_id) != null ? _a : "", readOnly: true, disabled: true, className: "mt-1 h-11 font-mono" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "\u041F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440, \u043F\u0440\u0438\u0441\u0432\u043E\u0435\u043D \u043F\u0440\u0438 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438. \u0415\u0433\u043E \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C." })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "username", children: "\u041D\u0438\u043A (@)" }),
            /* @__PURE__ */ jsxs("div", { className: "mt-1 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "font-display text-base font-bold text-muted-foreground", children: "@" }),
              /* @__PURE__ */ jsx(Input, { id: "username", value: (_b = profile.username) != null ? _b : "", onChange: (e) => setProfile({
                ...profile,
                username: e.target.value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 24)
              }), placeholder: "timur_07", className: "h-11", maxLength: 24 })
            ] }),
            profile.username ? /* @__PURE__ */ jsxs(Link, { to: "/u/$username", params: {
              username: profile.username
            }, className: "mt-1 inline-block text-xs text-primary hover:underline", children: [
              "\u0422\u0432\u043E\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430: /u/",
              profile.username
            ] }) : /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "3\u201324 \u0441\u0438\u043C\u0432\u043E\u043B\u0430: \u043B\u0430\u0442\u0438\u043D\u0438\u0446\u0430, \u0446\u0438\u0444\u0440\u044B \u0438\u043B\u0438 _. \u041F\u043E \u043D\u0435\u043C\u0443 \u0442\u0435\u0431\u044F \u043D\u0430\u0439\u0434\u0443\u0442 \u0434\u0440\u0443\u0437\u044C\u044F." })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "\u0418\u043C\u044F" }),
            /* @__PURE__ */ jsx(Input, { id: "name", value: (_c = profile.display_name) != null ? _c : "", onChange: (e) => setProfile({
              ...profile,
              display_name: e.target.value
            }), placeholder: "\u0410\u043B\u0435\u043A\u0441\u0430\u043D\u0434\u0440", className: "mt-1 h-11", maxLength: 60 })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "phone", children: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }),
              profile.phone_verified && isValidRuPhone(profile.phone) ? /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400", children: [
                /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3" }),
                " \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D"
              ] }) : isValidRuPhone(profile.phone) ? /* @__PURE__ */ jsx("span", { className: "text-[11px] font-medium text-amber-600 dark:text-amber-400", children: "\u041D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D" }) : null
            ] }),
            /* @__PURE__ */ jsx(Input, { id: "phone", inputMode: "tel", value: formatRuPhone((_d = profile.phone) != null ? _d : ""), onChange: (e) => setProfile({
              ...profile,
              phone: e.target.value
            }), placeholder: "+7 (999) 000-00-00", className: "mt-1 h-11", maxLength: 20 }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "\u0422\u043E\u043B\u044C\u043A\u043E \u0440\u043E\u0441\u0441\u0438\u0439\u0441\u043A\u0438\u0435 \u043D\u043E\u043C\u0435\u0440\u0430. \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0439 \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u043C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0434\u043B\u044F \u0432\u0445\u043E\u0434\u0430 \u0438 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u0430\u0440\u043E\u043B\u044F." }),
            isValidRuPhone(profile.phone) && /* @__PURE__ */ jsxs("label", { className: "mt-3 flex items-start gap-3 rounded-xl border border-border bg-background p-3 cursor-pointer", children: [
              /* @__PURE__ */ jsx("input", { type: "checkbox", className: "mt-0.5 h-4 w-4 accent-primary", checked: profile.phone_public, onChange: (e) => setProfile({
                ...profile,
                phone_public: e.target.checked
              }) }),
              /* @__PURE__ */ jsxs("div", { className: "text-xs", children: [
                /* @__PURE__ */ jsx("p", { className: "font-semibold text-foreground", children: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0432 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u0435" }),
                /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
                  "\u041B\u044E\u0431\u043E\u0439 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441\u043C\u043E\u0436\u0435\u0442 \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0442\u0432\u043E\u0439 \u043D\u043E\u043C\u0435\u0440 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 /u/",
                  profile.username || "\u2026"
                ] })
              ] })
            ] }),
            isValidRuPhone(profile.phone) && !profile.phone_verified && /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", size: "sm", className: "mt-2", onClick: async () => {
              const e164 = toE164Ru(profile.phone);
              if (!e164 || !user) return;
              await supabase.from("profiles").update({
                phone: e164,
                phone_verified: false
              }).eq("id", user.id);
              setProfile((p) => ({
                ...p,
                phone: e164
              }));
              setVerifyOpen(true);
            }, children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043D\u043E\u043C\u0435\u0440 \u043F\u043E SMS" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0438\u0433\u0440\u044B" }),
            /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: levels.map((lv) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setProfile({
              ...profile,
              level: lv
            }), className: `rounded-full border px-4 py-2 text-sm font-medium transition-all ${profile.level === lv ? "border-transparent bg-gradient-brand text-primary-foreground shadow-glow" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"}`, children: lv }, lv)) })
          ] }),
          /* @__PURE__ */ jsx(Button, { onClick: save, disabled: saving, size: "lg", className: "w-full bg-gradient-brand text-primary-foreground hover:opacity-90", children: saving ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
        /* @__PURE__ */ jsx(CardReminder, {}),
        /* @__PURE__ */ jsx(RatingsSection, { ratings, raters }),
        user && /* @__PURE__ */ jsx(MediaSection, { userId: user.id, isOwner: true }),
        user && /* @__PURE__ */ jsx(GoalsSection, { userId: user.id, pastGames: past }),
        /* @__PURE__ */ jsx(HistorySection, { title: "\u041F\u0440\u0435\u0434\u0441\u0442\u043E\u044F\u0449\u0438\u0435 \u0438\u0433\u0440\u044B", empty: "\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043D\u044B\u0445 \u0438\u0433\u0440", items: upcoming }),
        /* @__PURE__ */ jsx(HistorySection, { title: "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0438\u0433\u0440", empty: "\u0421\u044B\u0433\u0440\u0430\u043D\u043D\u044B\u0445 \u0438\u0433\u0440 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442", items: past, muted: true })
      ] })
    ] }),
    user && isValidRuPhone(profile.phone) && /* @__PURE__ */ jsx(PhoneVerifyDialog, { open: verifyOpen, onOpenChange: setVerifyOpen, userId: user.id, phone: (_e = profile.phone) != null ? _e : "", purpose: "verify", onVerified: () => setProfile((p) => ({
      ...p,
      phone_verified: true
    })) }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
function RatingsSection({
  ratings,
  raters
}) {
  const avg = ratings.length === 0 ? null : ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
  return /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "font-display text-xl font-bold", children: "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u0438 \u043E\u0442\u0437\u044B\u0432\u044B" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u041E\u0446\u0435\u043D\u043A\u0438 \u043E\u0442 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u043E\u0432 \u043F\u043E\u0441\u043B\u0435 \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u043D\u044B\u0445 \u0438\u0433\u0440." })
      ] }),
      avg !== null && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-primary-foreground shadow-glow", children: [
        /* @__PURE__ */ jsx(Star, { className: "h-4 w-4 fill-current" }),
        /* @__PURE__ */ jsx("span", { className: "font-display text-sm font-bold", children: avg.toFixed(1) }),
        /* @__PURE__ */ jsxs("span", { className: "text-xs opacity-80", children: [
          "/ 5 \xB7 ",
          ratings.length
        ] })
      ] })
    ] }),
    ratings.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "\u041F\u043E\u043A\u0430 \u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u043E\u0446\u0435\u043D\u0438\u043B. \u0421\u044B\u0433\u0440\u0430\u0439 \u0438\u0433\u0440\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0441\u0438 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u043E\u0432 \u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043E\u0442\u0437\u044B\u0432." }) : /* @__PURE__ */ jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: ratings.slice(0, 6).map((r) => {
      var _a;
      const rp = raters[r.rater_id];
      return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border bg-background p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          (rp == null ? void 0 : rp.username) ? /* @__PURE__ */ jsxs(Link, { to: "/u/$username", params: {
            username: rp.username
          }, className: "text-sm font-semibold hover:underline", children: [
            "@",
            rp.username
          ] }) : /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: (_a = rp == null ? void 0 : rp.display_name) != null ? _a : "\u0418\u0433\u0440\u043E\u043A" }),
          /* @__PURE__ */ jsx("span", { className: "inline-flex items-center gap-0.5 text-amber-500", children: Array.from({
            length: 5
          }).map((_, i) => /* @__PURE__ */ jsx(Star, { className: `h-3.5 w-3.5 ${i < r.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}` }, i)) })
        ] }),
        r.comment && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: r.comment })
      ] }, r.id);
    }) })
  ] });
}
const STORAGE_KEY = "af_cards_v2";
function detectBrand(digits) {
  if (/^4/.test(digits)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^(2200|2201|2202|2203|2204)/.test(digits)) return "\u041C\u0418\u0420";
  return "\u041A\u0430\u0440\u0442\u0430";
}
function CardReminder() {
  var _a;
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState(() => {
    return [];
  });
  const [activeId, setActiveId] = useState(() => {
    return null;
  });
  const persist = (next, nextActive) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (nextActive) localStorage.setItem("af_card_active", nextActive);
    else localStorage.removeItem("af_card_active");
    setCards(next);
    setActiveId(nextActive);
  };
  const formatNumber = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };
  const resetForm = () => {
    setNumber("");
    setHolder("");
    setExpiry("");
    setCvc("");
  };
  const submit = async (e) => {
    e.preventDefault();
    const digits = number.replace(/\s/g, "");
    if (digits.length < 13) return toast.error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043D\u043E\u043C\u0435\u0440 \u043A\u0430\u0440\u0442\u044B");
    if (!holder.trim()) return toast.error("\u0423\u043A\u0430\u0436\u0438 \u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043B\u044F \u043A\u0430\u0440\u0442\u044B");
    if (expiry.length < 5) return toast.error("\u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u0439");
    if (cvc.length < 3) return toast.error("CVC \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u0439");
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    const card = {
      id: crypto.randomUUID(),
      last4: digits.slice(-4),
      holder: holder.trim().toUpperCase(),
      expiry,
      brand: detectBrand(digits)
    };
    const next = [...cards, card];
    persist(next, activeId != null ? activeId : card.id);
    setSaving(false);
    setAdding(false);
    resetForm();
    toast.success("\u041A\u0430\u0440\u0442\u0430 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430");
  };
  const removeCard = (id) => {
    var _a2, _b;
    const next = cards.filter((c) => c.id !== id);
    let nextActive = activeId;
    if (activeId === id) nextActive = (_b = (_a2 = next[0]) == null ? void 0 : _a2.id) != null ? _b : null;
    persist(next, nextActive);
    toast.success("\u041A\u0430\u0440\u0442\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0430");
  };
  const setActive = (id) => {
    persist(cards, id);
    toast.success("\u041A\u0430\u0440\u0442\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u0430 \u0434\u043B\u044F \u043E\u043F\u043B\u0430\u0442\u044B");
  };
  (_a = cards.find((c) => c.id === activeId)) != null ? _a : null;
  const hasCards = cards.length > 0;
  if (dismissed && !hasCards) return null;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    hasCards ? /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-xl font-bold", children: "\u0421\u043F\u043E\u0441\u043E\u0431\u044B \u043E\u043F\u043B\u0430\u0442\u044B" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u0412\u0441\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u043A\u0430\u0440\u0442\u044B. \u0412\u044B\u0431\u0435\u0440\u0438 \u043E\u0434\u043D\u0443 \u0430\u043A\u0442\u0438\u0432\u043D\u0443\u044E \u0434\u043B\u044F \u043E\u043F\u043B\u0430\u0442\u044B \u0438\u0433\u0440." })
        ] }),
        /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => {
          setAdding(true);
          setOpen(true);
        }, children: [
          /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
          " \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: cards.map((c) => {
        const isActive = c.id === activeId;
        return /* @__PURE__ */ jsxs("div", { className: `group relative overflow-hidden rounded-2xl border p-4 transition ${isActive ? "border-primary bg-gradient-to-br from-primary/15 via-card to-accent/30 shadow-elegant" : "border-border bg-background hover:border-primary/40"}`, children: [
          /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => !isActive && setActive(c.id), className: "flex w-full items-center gap-3 text-left", children: [
            /* @__PURE__ */ jsx("div", { className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow", children: /* @__PURE__ */ jsx(CreditCard, { className: "h-5 w-5" }) }),
            /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxs("p", { className: "font-display text-sm font-bold", children: [
                  c.brand,
                  " \u2022\u2022\u2022\u2022 ",
                  c.last4
                ] }),
                isActive && /* @__PURE__ */ jsxs(Badge, { className: "h-5 bg-primary px-1.5 text-[10px] text-primary-foreground", children: [
                  /* @__PURE__ */ jsx(Check, { className: "mr-0.5 h-3 w-3" }),
                  " \u0410\u043A\u0442\u0438\u0432\u043D\u0430"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("p", { className: "truncate text-xs text-muted-foreground", children: [
                c.holder,
                " \xB7 ",
                c.expiry
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => removeCard(c.id), "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043A\u0430\u0440\u0442\u0443", className: "absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive", children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
        ] }, c.id);
      }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-start gap-2 rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsx(ShieldCheck, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }),
        "\u041F\u043B\u0430\u0442\u0435\u0436\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u0449\u0438\u0449\u0435\u043D\u044B. \u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u043A\u0430\u0440\u0442\u043E\u0439 \u0431\u0443\u0434\u0443\u0442 \u043E\u043F\u043B\u0430\u0447\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u0438\u0433\u0440\u044B \u0432 \u043E\u0434\u0438\u043D \u043A\u043B\u0438\u043A."
      ] })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/30 p-6 shadow-elegant", children: [
      /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setDismissed(true), "aria-label": "\u0421\u043A\u0440\u044B\u0442\u044C", className: "absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-background/60 hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-5 md:flex-row md:items-center md:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
          /* @__PURE__ */ jsx("div", { className: "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsxs("div", { className: "max-w-xl", children: [
            /* @__PURE__ */ jsx(Badge, { className: "mb-2 bg-primary/15 text-primary hover:bg-primary/20", children: "\u0421\u043E\u0432\u0435\u0442" }),
            /* @__PURE__ */ jsx("h3", { className: "font-display text-xl font-bold leading-tight", children: "\u041F\u0440\u0438\u0432\u044F\u0436\u0438 \u043A\u0430\u0440\u0442\u0443 \u2014 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0439\u0441\u044F \u043D\u0430 \u0438\u0433\u0440\u044B \u0432 \u043E\u0434\u0438\u043D \u043A\u043B\u0438\u043A" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "\u041C\u043E\u0436\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043A\u0430\u0440\u0442 \u0438 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043E\u0434\u043D\u0443 \u0440\u0430\u0431\u043E\u0447\u0443\u044E. \u0412\u043E\u0437\u0432\u0440\u0430\u0442\u044B \u2014 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0430 \u0442\u0443 \u0436\u0435 \u043A\u0430\u0440\u0442\u0443." }),
            /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center gap-2 text-xs text-muted-foreground", children: [
              /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5 text-primary" }),
              "\u0414\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u0449\u0438\u0449\u0435\u043D\u044B, \u0442\u043E\u043A\u0435\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u043E \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u0443 PCI DSS"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Button, { onClick: () => {
          setAdding(true);
          setOpen(true);
        }, size: "lg", className: "bg-gradient-brand text-primary-foreground hover:opacity-90", children: [
          /* @__PURE__ */ jsx(CreditCard, { className: "mr-2 h-4 w-4" }),
          " \u041F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0443"
        ] })
      ] })
    ] }),
    open && /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-50 flex justify-end", children: [
      /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", onClick: () => {
        setOpen(false);
        setAdding(false);
        resetForm();
      }, className: "absolute inset-0 bg-foreground/40 backdrop-blur-sm" }),
      /* @__PURE__ */ jsxs("div", { className: "relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-background p-6 shadow-elegant animate-in slide-in-from-right", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-6 flex items-start justify-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Badge, { className: "mb-2 bg-primary/15 text-primary hover:bg-primary/20", children: "\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E" }),
            /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl font-bold", children: adding ? "\u041D\u043E\u0432\u0430\u044F \u043A\u0430\u0440\u0442\u0430" : "\u0421\u043F\u043E\u0441\u043E\u0431\u044B \u043E\u043F\u043B\u0430\u0442\u044B" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: adding ? "\u041A\u0430\u0440\u0442\u0430 \u0431\u0443\u0434\u0435\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u043A \u0442\u0432\u043E\u0435\u043C\u0443 \u043F\u0440\u043E\u0444\u0438\u043B\u044E." : "\u0412\u044B\u0431\u0435\u0440\u0438 \u043A\u0430\u0440\u0442\u0443 \u0434\u043B\u044F \u043E\u043F\u043B\u0430\u0442\u044B \u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u044C \u043D\u043E\u0432\u0443\u044E." })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
            setOpen(false);
            setAdding(false);
            resetForm();
          }, "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", className: "rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5" }) })
        ] }),
        !adding && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
            cards.length === 0 && /* @__PURE__ */ jsx("p", { className: "rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground", children: "\u041A\u0430\u0440\u0442 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u0414\u043E\u0431\u0430\u0432\u044C \u043F\u0435\u0440\u0432\u0443\u044E." }),
            cards.map((c) => {
              const isActive = c.id === activeId;
              return /* @__PURE__ */ jsxs("div", { className: `relative overflow-hidden rounded-2xl border p-4 transition ${isActive ? "border-primary bg-gradient-to-br from-primary/15 via-card to-accent/30 shadow-elegant" : "border-border bg-card hover:border-primary/40"}`, children: [
                /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => setActive(c.id), className: "flex w-full items-center gap-4 text-left", children: [
                  /* @__PURE__ */ jsx("div", { className: "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow", children: /* @__PURE__ */ jsx(CreditCard, { className: "h-5 w-5" }) }),
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsxs("p", { className: "font-display text-sm font-bold", children: [
                      c.brand,
                      " \u2022\u2022\u2022\u2022 ",
                      c.last4
                    ] }),
                    /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                      c.holder,
                      " \xB7 ",
                      c.expiry
                    ] })
                  ] }),
                  isActive ? /* @__PURE__ */ jsxs(Badge, { className: "bg-primary text-primary-foreground", children: [
                    /* @__PURE__ */ jsx(Check, { className: "mr-1 h-3 w-3" }),
                    " \u0410\u043A\u0442\u0438\u0432\u043D\u0430"
                  ] }) : /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-muted-foreground", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C" })
                ] }),
                /* @__PURE__ */ jsx("button", { type: "button", onClick: (e) => {
                  e.stopPropagation();
                  removeCard(c.id);
                }, "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043A\u0430\u0440\u0442\u0443", className: "absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive", children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
              ] }, c.id);
            })
          ] }),
          /* @__PURE__ */ jsxs(Button, { onClick: () => setAdding(true), variant: "outline", size: "lg", className: "mt-5 w-full border-dashed", children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
            " \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043D\u043E\u0432\u0443\u044E \u043A\u0430\u0440\u0442\u0443"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-6 flex items-start gap-2 rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsx(ShieldCheck, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary" }),
            "\u041F\u043B\u0430\u0442\u0435\u0436\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u044E\u0442\u0441\u044F \u043F\u043E \u0437\u0430\u0449\u0438\u0449\u0435\u043D\u043D\u043E\u043C\u0443 \u043A\u0430\u043D\u0430\u043B\u0443 \u0438 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u043D\u0430 \u043D\u0430\u0448\u0438\u0445 \u0441\u0435\u0440\u0432\u0435\u0440\u0430\u0445."
          ] })
        ] }),
        adding && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-6 rounded-2xl bg-gradient-brand p-5 text-primary-foreground shadow-glow", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx(CreditCard, { className: "h-6 w-6" }),
              /* @__PURE__ */ jsx("span", { className: "text-xs uppercase tracking-widest opacity-80", children: detectBrand(number.replace(/\s/g, "")) })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "mt-6 font-mono text-lg tracking-widest", children: number || "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022" }),
            /* @__PURE__ */ jsxs("div", { className: "mt-4 flex justify-between text-xs uppercase opacity-90", children: [
              /* @__PURE__ */ jsx("span", { children: holder || "\u0418\u043C\u044F \u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043B\u044F" }),
              /* @__PURE__ */ jsx("span", { children: expiry || "\u041C\u041C/\u0413\u0413" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "cardnum", children: "\u041D\u043E\u043C\u0435\u0440 \u043A\u0430\u0440\u0442\u044B" }),
              /* @__PURE__ */ jsx(Input, { id: "cardnum", inputMode: "numeric", autoComplete: "cc-number", placeholder: "1234 5678 9012 3456", className: "mt-1 h-11 font-mono tracking-wider", value: number, onChange: (e) => setNumber(formatNumber(e.target.value)) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "holder", children: "\u0414\u0435\u0440\u0436\u0430\u0442\u0435\u043B\u044C \u043A\u0430\u0440\u0442\u044B" }),
              /* @__PURE__ */ jsx(Input, { id: "holder", autoComplete: "cc-name", placeholder: "ALEKSANDR IVANOV", className: "mt-1 h-11 uppercase", value: holder, onChange: (e) => setHolder(e.target.value.toUpperCase()), maxLength: 40 })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "exp", children: "\u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F" }),
                /* @__PURE__ */ jsx(Input, { id: "exp", inputMode: "numeric", autoComplete: "cc-exp", placeholder: "\u041C\u041C/\u0413\u0413", className: "mt-1 h-11 font-mono", value: expiry, onChange: (e) => setExpiry(formatExpiry(e.target.value)) })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "cvc", children: "CVC" }),
                /* @__PURE__ */ jsx(Input, { id: "cvc", inputMode: "numeric", autoComplete: "cc-csc", placeholder: "\u2022\u2022\u2022", className: "mt-1 h-11 font-mono", value: cvc, onChange: (e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4)) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              hasCards && /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", size: "lg", className: "flex-1", onClick: () => {
                setAdding(false);
                resetForm();
              }, children: "\u041D\u0430\u0437\u0430\u0434" }),
              /* @__PURE__ */ jsx(Button, { type: "submit", size: "lg", disabled: saving, className: "flex-1 bg-gradient-brand text-primary-foreground hover:opacity-90", children: saving ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043A\u0430\u0440\u0442\u0443" })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function HistorySection({
  title,
  items,
  empty,
  muted
}) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl font-bold", children: title }),
    items.length === 0 ? /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: empty }) : /* @__PURE__ */ jsx("div", { className: "mt-4 grid gap-3 md:grid-cols-2", children: items.map((g) => {
      var _a, _b;
      return /* @__PURE__ */ jsxs(Link, { to: "/games/$gameId", params: {
        gameId: g.id
      }, className: `rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elegant ${muted ? "opacity-80" : ""}`, children: [
        /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "bg-accent text-accent-foreground", children: g.sport }),
        /* @__PURE__ */ jsx("h3", { className: "mt-3 font-display text-base font-semibold", children: (_a = g.stadium) == null ? void 0 : _a.name }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 flex items-center gap-1 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(MapPin, { className: "h-3 w-3" }),
          " ",
          (_b = g.stadium) == null ? void 0 : _b.address
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "mt-3 flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsx(Calendar, { className: "h-4 w-4 text-primary" }),
          " ",
          fmtDate(g.starts_at)
        ] })
      ] }, g.id);
    }) })
  ] });
}
function MediaSection({
  userId,
  isOwner
}) {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const load = async () => {
    const {
      data
    } = await supabase.from("profile_media").select("id, url, kind, storage_path, created_at").eq("user_id", userId).order("created_at", {
      ascending: false
    });
    setItems(data != null ? data : []);
  };
  useEffect(() => {
    load();
  }, [userId]);
  const upload = async (file) => {
    var _a, _b;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("\u0422\u043E\u043B\u044C\u043A\u043E \u0444\u043E\u0442\u043E \u0438\u043B\u0438 \u0432\u0438\u0434\u0435\u043E");
      return;
    }
    const maxMb = isVideo ? 50 : 8;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 ${maxMb} \u041C\u0411`);
      return;
    }
    setUploading(true);
    const ext = (_b = (_a = file.name.split(".").pop()) == null ? void 0 : _a.toLowerCase()) != null ? _b : isVideo ? "mp4" : "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const {
      error: upErr
    } = await supabase.storage.from("profile-media").upload(path, file, {
      upsert: false,
      contentType: file.type
    });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const {
      data: pub
    } = supabase.storage.from("profile-media").getPublicUrl(path);
    const {
      error: insErr
    } = await supabase.from("profile_media").insert({
      user_id: userId,
      url: pub.publicUrl,
      storage_path: path,
      kind: isVideo ? "video" : "image"
    });
    setUploading(false);
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    toast.success(isVideo ? "\u0412\u0438\u0434\u0435\u043E \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E" : "\u0424\u043E\u0442\u043E \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E");
    load();
  };
  const remove = async (m) => {
    const {
      error
    } = await supabase.from("profile_media").delete().eq("id", m.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (m.storage_path) {
      await supabase.storage.from("profile-media").remove([m.storage_path]);
    }
    toast.success("\u0423\u0434\u0430\u043B\u0435\u043D\u043E");
    load();
  };
  return /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "font-display text-xl font-bold", children: "\u041C\u0435\u0434\u0438\u0430" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u0424\u043E\u0442\u043E \u0438 \u0432\u0438\u0434\u0435\u043E \u0434\u043B\u044F \u0442\u0432\u043E\u0435\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F. \u0414\u043E 8 \u041C\u0411 \u0434\u043B\u044F \u0444\u043E\u0442\u043E \u0438 50 \u041C\u0411 \u0434\u043B\u044F \u0432\u0438\u0434\u0435\u043E." })
      ] }),
      isOwner && /* @__PURE__ */ jsxs("label", { className: "inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90", children: [
        uploading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }),
        "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C",
        /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*,video/*", className: "hidden", disabled: uploading, onChange: (e) => {
          var _a;
          const f = (_a = e.target.files) == null ? void 0 : _a[0];
          if (f) upload(f);
          e.currentTarget.value = "";
        } })
      ] })
    ] }),
    items.length === 0 ? /* @__PURE__ */ jsx("p", { className: "rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground", children: "\u041F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E. \u041F\u043E\u043A\u0430\u0436\u0438 \u0441\u0432\u043E\u0438 \u043C\u043E\u043C\u0435\u043D\u0442\u044B \u0441 \u0438\u0433\u0440." }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3", children: items.map((m) => /* @__PURE__ */ jsxs("div", { className: "group relative overflow-hidden rounded-2xl border border-border bg-background", children: [
      /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setPreview(m), className: "block aspect-square w-full", children: m.kind === "image" ? /* @__PURE__ */ jsx("img", { src: m.url, alt: "media", className: "h-full w-full object-cover transition group-hover:scale-105" }) : /* @__PURE__ */ jsxs("div", { className: "relative h-full w-full", children: [
        /* @__PURE__ */ jsx("video", { src: m.url, className: "h-full w-full object-cover", muted: true, preload: "metadata" }),
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-foreground/30 text-background", children: /* @__PURE__ */ jsx(Video, { className: "h-8 w-8" }) })
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "absolute left-2 top-2 rounded-full bg-foreground/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background", children: m.kind === "image" ? "\u0424\u043E\u0442\u043E" : "\u0412\u0438\u0434\u0435\u043E" }),
      isOwner && /* @__PURE__ */ jsx("button", { type: "button", onClick: () => remove(m), "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", className: "absolute right-2 top-2 rounded-full bg-foreground/70 p-1.5 text-background opacity-0 transition hover:bg-destructive group-hover:opacity-100", children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
    ] }, m.id)) }),
    preview && /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4 backdrop-blur-sm", onClick: () => setPreview(null), children: [
      /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", className: "absolute right-4 top-4 rounded-full bg-background/90 p-2 text-foreground hover:bg-background", onClick: (e) => {
        e.stopPropagation();
        setPreview(null);
      }, children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5" }) }),
      /* @__PURE__ */ jsx("div", { className: "max-h-[90vh] max-w-[90vw]", onClick: (e) => e.stopPropagation(), children: preview.kind === "image" ? /* @__PURE__ */ jsx("img", { src: preview.url, alt: "", className: "max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" }) : /* @__PURE__ */ jsx("video", { src: preview.url, controls: true, autoPlay: true, className: "max-h-[90vh] max-w-[90vw] rounded-2xl" }) })
    ] })
  ] });
}
function GoalsSection({
  userId,
  pastGames
}) {
  const [claims, setClaims] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [count, setCount] = useState("1");
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const {
      data: cs
    } = await supabase.from("goal_claims").select("id, game_id, count, status, created_at, game:games(sport, starts_at, stadium:stadiums(name))").eq("user_id", userId).order("created_at", {
      ascending: false
    });
    const list = cs != null ? cs : [];
    if (list.length) {
      const ids = list.map((c) => c.id);
      const {
        data: ap
      } = await supabase.from("goal_claim_approvals").select("claim_id").in("claim_id", ids);
      const counts = /* @__PURE__ */ new Map();
      (ap != null ? ap : []).forEach((a) => {
        var _a;
        return counts.set(a.claim_id, ((_a = counts.get(a.claim_id)) != null ? _a : 0) + 1);
      });
      list.forEach((c) => {
        var _a;
        return c.approvals = (_a = counts.get(c.id)) != null ? _a : 0;
      });
    }
    setClaims(list);
  };
  useEffect(() => {
    load();
  }, [userId]);
  const total = claims.filter((c) => c.status === "approved").reduce((s, c) => s + c.count, 0);
  const claimedGameIds = new Set(claims.map((c) => c.game_id));
  const availableGames = pastGames.filter((g) => !claimedGameIds.has(g.id));
  const submit = async () => {
    const n = parseInt(count, 10);
    if (!selectedGameId) {
      toast.error("\u0412\u044B\u0431\u0435\u0440\u0438 \u0438\u0433\u0440\u0443");
      return;
    }
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      toast.error("\u041E\u0442 1 \u0434\u043E 50 \u0433\u043E\u043B\u043E\u0432");
      return;
    }
    setSaving(true);
    const {
      error
    } = await supabase.from("goal_claims").insert({
      user_id: userId,
      game_id: selectedGameId,
      count: n
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u0417\u0430\u044F\u0432\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430. \u041D\u0443\u0436\u043D\u043E 3 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043E\u0442 \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u043E\u0432.");
    setAdding(false);
    setSelectedGameId("");
    setCount("1");
    load();
  };
  const cancel = async (claimId) => {
    const {
      error
    } = await supabase.from("goal_claims").delete().eq("id", claimId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("\u0417\u0430\u044F\u0432\u043A\u0430 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430");
    load();
  };
  return /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-6 shadow-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow", children: /* @__PURE__ */ jsx(Trophy, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-xl font-bold", children: "\u0417\u0430\u0431\u0438\u0442\u044B\u0435 \u0433\u043E\u043B\u044B" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442\u0441\u044F \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u0430\u043C\u0438 \u043F\u043E \u0438\u0433\u0440\u0435. \u041D\u0443\u0436\u043D\u043E \u2265 3 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u0439." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-widest text-muted-foreground", children: "\u0412\u0441\u0435\u0433\u043E" }),
        /* @__PURE__ */ jsx("p", { className: "font-display text-3xl font-bold", children: total })
      ] })
    ] }),
    !adding ? /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", onClick: () => setAdding(true), disabled: availableGames.length === 0, children: [
      /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
      availableGames.length === 0 ? "\u041D\u0435\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0445 \u0438\u0433\u0440" : "\u0417\u0430\u044F\u0432\u0438\u0442\u044C \u0433\u043E\u043B\u044B"
    ] }) : /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border bg-background p-4", children: [
      /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "\u0418\u0433\u0440\u0430" }),
      /* @__PURE__ */ jsxs("select", { value: selectedGameId, onChange: (e) => setSelectedGameId(e.target.value), className: "mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm", children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "\u2014 \u0432\u044B\u0431\u0435\u0440\u0438 \u0438\u0433\u0440\u0443 \u2014" }),
        availableGames.map((g) => {
          var _a, _b;
          return /* @__PURE__ */ jsxs("option", { value: g.id, children: [
            g.sport,
            " \xB7 ",
            (_b = (_a = g.stadium) == null ? void 0 : _a.name) != null ? _b : "\u0418\u0433\u0440\u0430",
            " \xB7 ",
            new Date(g.starts_at).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short"
            })
          ] }, g.id);
        })
      ] }),
      /* @__PURE__ */ jsx(Label, { className: "mt-3 block text-xs", children: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0433\u043E\u043B\u043E\u0432" }),
      /* @__PURE__ */ jsx(Input, { type: "number", min: 1, max: 50, value: count, onChange: (e) => setCount(e.target.value), className: "mt-1 h-11" }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex gap-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => setAdding(false), className: "flex-1", children: "\u041E\u0442\u043C\u0435\u043D\u0430" }),
        /* @__PURE__ */ jsx(Button, { size: "sm", onClick: submit, disabled: saving, className: "flex-1 bg-gradient-brand text-primary-foreground hover:opacity-90", children: saving ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C" })
      ] })
    ] }),
    claims.length > 0 && /* @__PURE__ */ jsx("ul", { className: "mt-5 space-y-2", children: claims.map((c) => {
      var _a, _b, _c;
      return /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "font-display text-lg font-bold", children: c.count }),
            /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
              (_a = c.game) == null ? void 0 : _a.sport,
              " \xB7 ",
              (_c = (_b = c.game) == null ? void 0 : _b.stadium) == null ? void 0 : _c.name
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: c.game ? new Date(c.game.starts_at).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long"
          }) : "" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: c.status === "approved" ? /* @__PURE__ */ jsxs(Badge, { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", children: [
          /* @__PURE__ */ jsx(Check, { className: "mr-1 h-3 w-3" }),
          " \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E"
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
            c.approvals,
            "/3"
          ] }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => cancel(c.id), children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }) })
        ] }) })
      ] }, c.id);
    }) })
  ] });
}
const SplitComponent = () => /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(ProfilePage, {}) });

export { SplitComponent as component };
//# sourceMappingURL=profile-C1PuJbuc.mjs.map
