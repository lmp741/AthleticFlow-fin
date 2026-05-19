import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Loader2, User, Star, MessageCircle, Check, UserPlus, ArrowLeft, Video, Phone } from 'lucide-react';
import { h as SiteHeader, g as SiteFooter } from './SiteShell-n-2GeoU1.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { i as Route$b, u as useAuth, s as supabase, B as Button } from './ssr.mjs';
import { f as formatRuPhone } from './phone-BjxCDanq.mjs';
import { toast } from 'sonner';
import './input-Dzp1k4d4.mjs';
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

function PublicProfilePage() {
  var _a, _b, _c;
  const {
    username
  } = Route$b.useParams();
  const {
    user
  } = useAuth();
  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [raters, setRaters] = useState({});
  const [media, setMedia] = useState([]);
  const [preview, setPreview] = useState(null);
  const [friendStatus, setFriendStatus] = useState("none");
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  useEffect(() => {
    (async () => {
      const {
        data
      } = await supabase.from("profiles").select("id, username, display_name, avatar_url, level, phone, phone_public").ilike("username", username).maybeSingle();
      if (!data) {
        setNotFoundFlag(true);
        setLoading(false);
        return;
      }
      setProfile(data);
      const [{
        data: rs
      }, {
        data: ms
      }, {
        data: fr
      }] = await Promise.all([supabase.from("user_ratings").select("id, rater_id, score, comment, created_at").eq("ratee_id", data.id).order("created_at", {
        ascending: false
      }), supabase.from("profile_media").select("id, url, kind, created_at").eq("user_id", data.id).order("created_at", {
        ascending: false
      }), user ? supabase.from("friendships").select("status, requester_id, addressee_id").or(`and(requester_id.eq.${user.id},addressee_id.eq.${data.id}),and(requester_id.eq.${data.id},addressee_id.eq.${user.id})`).maybeSingle() : Promise.resolve({
        data: null
      })]);
      const list = rs != null ? rs : [];
      setRatings(list);
      setMedia(ms != null ? ms : []);
      if (fr) setFriendStatus(fr.status === "accepted" ? "accepted" : "pending");
      const ids = Array.from(new Set(list.map((r) => r.rater_id)));
      if (ids.length) {
        const {
          data: ps
        } = await supabase.from("profiles").select("id, username, display_name, avatar_url, level, phone, phone_public").in("id", ids);
        const map = {};
        (ps != null ? ps : []).forEach((p) => map[p.id] = p);
        setRaters(map);
      }
      setLoading(false);
    })();
  }, [username, user]);
  const sendFriendRequest = async () => {
    if (!user || !profile) return;
    const {
      error
    } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: profile.id,
      status: "pending"
    });
    if (error) toast.error(error.message);
    else {
      toast.success("\u0417\u0430\u044F\u0432\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430");
      setFriendStatus("pending");
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsx("div", { className: "container mx-auto p-12 text-center", children: /* @__PURE__ */ jsx(Loader2, { className: "mx-auto h-6 w-6 animate-spin text-muted-foreground" }) })
    ] });
  }
  if (notFoundFlag || !profile) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
      /* @__PURE__ */ jsx(SiteHeader, {}),
      /* @__PURE__ */ jsxs("div", { className: "container mx-auto px-4 sm:px-6 py-20 text-center", children: [
        /* @__PURE__ */ jsx("h1", { className: "font-display text-3xl font-bold", children: "\u0418\u0433\u0440\u043E\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2 text-muted-foreground", children: [
          "\u041D\u0438\u043A\u043D\u0435\u0439\u043C ",
          /* @__PURE__ */ jsxs("span", { className: "font-mono", children: [
            "@",
            username
          ] }),
          " \u0435\u0449\u0451 \u043D\u0435 \u0437\u0430\u043D\u044F\u0442."
        ] }),
        /* @__PURE__ */ jsx(Button, { asChild: true, className: "mt-6", children: /* @__PURE__ */ jsx(Link, { to: "/games", children: "\u041A \u0438\u0433\u0440\u0430\u043C" }) })
      ] })
    ] });
  }
  const isMe = (user == null ? void 0 : user.id) === profile.id;
  const avg = ratings.length === 0 ? null : Math.round(ratings.reduce((s, r) => s + r.score, 0) / ratings.length * 10) / 10;
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsx("section", { className: "bg-gradient-hero py-12", children: /* @__PURE__ */ jsxs("div", { className: "container mx-auto flex flex-col items-start gap-6 px-6 md:flex-row md:items-center", children: [
      profile.avatar_url ? /* @__PURE__ */ jsx("img", { src: profile.avatar_url, alt: (_b = (_a = profile.display_name) != null ? _a : profile.username) != null ? _b : "", className: "h-28 w-28 rounded-full object-cover shadow-glow" }) : /* @__PURE__ */ jsx("div", { className: "flex h-28 w-28 items-center justify-center rounded-full bg-white/15 text-white", children: /* @__PURE__ */ jsx(User, { className: "h-12 w-12" }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxs(Badge, { className: "mb-2 border-white/30 bg-white/10 text-white", children: [
          "@",
          profile.username
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "font-display text-4xl font-bold text-white md:text-5xl", children: (_c = profile.display_name) != null ? _c : "\u0418\u0433\u0440\u043E\u043A" }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-3 text-white/90", children: [
          profile.level && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-white/15 px-3 py-1 text-sm", children: profile.level }),
          /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm", children: [
            /* @__PURE__ */ jsx(Star, { className: "h-4 w-4 fill-white" }),
            avg !== null ? `${avg.toFixed(1)} \xB7 ${ratings.length} \u043E\u0446\u0435\u043D\u043E\u043A` : "\u043F\u043E\u043A\u0430 \u0431\u0435\u0437 \u043E\u0446\u0435\u043D\u043E\u043A"
          ] })
        ] })
      ] }),
      !isMe && user && /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: friendStatus === "accepted" ? /* @__PURE__ */ jsx(Button, { asChild: true, className: "bg-white text-foreground hover:bg-white/90", children: /* @__PURE__ */ jsxs(Link, { to: "/friends/$friendId", params: {
        friendId: profile.id
      }, children: [
        /* @__PURE__ */ jsx(MessageCircle, { className: "mr-1 h-4 w-4" }),
        " \u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C"
      ] }) }) : friendStatus === "pending" ? /* @__PURE__ */ jsxs(Button, { disabled: true, variant: "outline", className: "border-white/40 bg-white/10 text-white", children: [
        /* @__PURE__ */ jsx(Check, { className: "mr-1 h-4 w-4" }),
        " \u0417\u0430\u044F\u0432\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430"
      ] }) : /* @__PURE__ */ jsxs(Button, { onClick: sendFriendRequest, className: "bg-white text-foreground hover:bg-white/90", children: [
        /* @__PURE__ */ jsx(UserPlus, { className: "mr-1 h-4 w-4" }),
        " \u0412 \u0434\u0440\u0443\u0437\u044C\u044F"
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto grid gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", asChild: true, className: "-ml-2", children: /* @__PURE__ */ jsxs(Link, { to: "/games", children: [
          /* @__PURE__ */ jsx(ArrowLeft, { className: "mr-1 h-4 w-4" }),
          " \u041D\u0430\u0437\u0430\u0434 \u043A \u0438\u0433\u0440\u0430\u043C"
        ] }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl font-bold", children: "\u041C\u0435\u0434\u0438\u0430" }),
          media.length === 0 ? /* @__PURE__ */ jsx("p", { className: "mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground", children: "\u0418\u0433\u0440\u043E\u043A \u043F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B." }) : /* @__PURE__ */ jsx("div", { className: "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4", children: media.map((m) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setPreview(m), className: "group relative aspect-square overflow-hidden rounded-2xl border border-border bg-background", children: m.kind === "image" ? /* @__PURE__ */ jsx("img", { src: m.url, alt: "", className: "h-full w-full object-cover transition group-hover:scale-105" }) : /* @__PURE__ */ jsxs("div", { className: "relative h-full w-full", children: [
            /* @__PURE__ */ jsx("video", { src: m.url, className: "h-full w-full object-cover", muted: true, preload: "metadata" }),
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-foreground/30 text-background", children: /* @__PURE__ */ jsx(Video, { className: "h-8 w-8" }) })
          ] }) }, m.id)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl font-bold", children: "\u041E\u0442\u0437\u044B\u0432\u044B \u0438 \u043E\u0446\u0435\u043D\u043A\u0438" }),
          ratings.length === 0 ? /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "\u041F\u043E\u0441\u043B\u0435 \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u043D\u044B\u0445 \u0438\u0433\u0440 \u0434\u0440\u0443\u0433\u0438\u0435 \u0438\u0433\u0440\u043E\u043A\u0438 \u0441\u043C\u043E\u0433\u0443\u0442 \u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0437\u0434\u0435\u0441\u044C \u043E\u0446\u0435\u043D\u043A\u0443." }) : /* @__PURE__ */ jsx("div", { className: "mt-5 grid gap-3 md:grid-cols-2", children: ratings.map((r) => {
            var _a2;
            const rp = raters[r.rater_id];
            return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border bg-card p-4 shadow-card", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3", children: [
                (rp == null ? void 0 : rp.username) ? /* @__PURE__ */ jsxs(Link, { to: "/u/$username", params: {
                  username: rp.username
                }, className: "text-sm font-semibold hover:underline", children: [
                  "@",
                  rp.username
                ] }) : /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: (_a2 = rp == null ? void 0 : rp.display_name) != null ? _a2 : "\u0418\u0433\u0440\u043E\u043A" }),
                /* @__PURE__ */ jsx("span", { className: "inline-flex items-center gap-0.5 text-amber-500", children: Array.from({
                  length: 5
                }).map((_, i) => /* @__PURE__ */ jsx(Star, { className: `h-4 w-4 ${i < r.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}` }, i)) })
              ] }),
              r.comment && /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: r.comment }),
              /* @__PURE__ */ jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: new Date(r.created_at).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric"
              }) })
            ] }, r.id);
          }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("aside", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-5 shadow-card", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-lg font-bold", children: "\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u0438\u0433\u0440\u043E\u043A\u0430" }),
          avg !== null ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-baseline gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "font-display text-4xl font-bold", children: avg.toFixed(1) }),
              /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "\u0438\u0437 5" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-1 inline-flex items-center gap-0.5 text-amber-500", children: Array.from({
              length: 5
            }).map((_, i) => /* @__PURE__ */ jsx(Star, { className: `h-4 w-4 ${i < Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}` }, i)) }),
            /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: [
              "\u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 ",
              ratings.length,
              " ",
              ratings.length === 1 ? "\u043E\u0446\u0435\u043D\u043A\u0438" : "\u043E\u0446\u0435\u043D\u043E\u043A"
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-4 space-y-1.5", children: [5, 4, 3, 2, 1].map((star) => {
              const cnt = ratings.filter((r) => r.score === star).length;
              const pct = ratings.length ? cnt / ratings.length * 100 : 0;
              return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
                /* @__PURE__ */ jsx("span", { className: "w-3 text-muted-foreground", children: star }),
                /* @__PURE__ */ jsx(Star, { className: "h-3 w-3 fill-amber-400 text-amber-400" }),
                /* @__PURE__ */ jsx("div", { className: "h-1.5 flex-1 overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-amber-400", style: {
                  width: `${pct}%`
                } }) }),
                /* @__PURE__ */ jsx("span", { className: "w-6 text-right text-muted-foreground", children: cnt })
              ] }, star);
            }) })
          ] }) : /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043E\u0446\u0435\u043D\u043E\u043A." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-card p-5 shadow-card", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-display text-lg font-bold", children: "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B" }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 space-y-2 text-sm", children: profile.phone_public && profile.phone ? /* @__PURE__ */ jsxs("a", { href: `tel:${profile.phone}`, className: "flex items-center gap-2 rounded-xl border border-border px-3 py-2 hover:bg-muted/50", children: [
            /* @__PURE__ */ jsx(Phone, { className: "h-4 w-4 text-primary" }),
            /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatRuPhone(profile.phone) })
          ] }) : /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u0418\u0433\u0440\u043E\u043A \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043B \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0438\u043B\u0438 \u0441\u043A\u0440\u044B\u043B \u0435\u0433\u043E." }) })
        ] })
      ] })
    ] }),
    preview && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4 backdrop-blur-sm", onClick: () => setPreview(null), children: /* @__PURE__ */ jsx("div", { className: "max-h-[90vh] max-w-[90vw]", onClick: (e) => e.stopPropagation(), children: preview.kind === "image" ? /* @__PURE__ */ jsx("img", { src: preview.url, alt: "", className: "max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" }) : /* @__PURE__ */ jsx("video", { src: preview.url, controls: true, autoPlay: true, className: "max-h-[90vh] max-w-[90vw] rounded-2xl" }) }) }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}

export { PublicProfilePage as component };
//# sourceMappingURL=u._username-BxZupqPZ.mjs.map
