import { jsx, jsxs } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, Users, Trash2, ChevronDown, Download, FileText, UserMinus } from 'lucide-react';
import { h as SiteHeader, g as SiteFooter } from './SiteShell-n-2GeoU1.mjs';
import { u as useAuth, s as supabase, B as Button } from './ssr.mjs';
import { B as Badge } from './badge-CxHUM3L8.mjs';
import { S as Skeleton } from './skeleton-DTPnu_Hh.mjs';
import { R as RequireAuth } from './RequireAuth-D6K_CCtb.mjs';
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

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long"
  });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
function MyPage() {
  const {
    user
  } = useAuth();
  const [organized, setOrganized] = useState([]);
  const [joined, setJoined] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{
      data: org
    }, {
      data: parts
    }] = await Promise.all([supabase.from("games").select("id, sport, level, starts_at, ends_at, price_per_player, slots_total, status, stadium:stadiums(name,address)").eq("organizer_id", user.id).order("starts_at", {
      ascending: true
    }), supabase.from("game_participants").select("game_id").eq("user_id", user.id)]);
    const joinedIds = (parts != null ? parts : []).map((p) => p.game_id).filter((id) => !(org != null ? org : []).some((g) => g.id === id));
    let joinedGames = [];
    if (joinedIds.length > 0) {
      const {
        data
      } = await supabase.from("games").select("id, sport, level, starts_at, ends_at, price_per_player, slots_total, status, stadium:stadiums(name,address)").in("id", joinedIds).order("starts_at", {
        ascending: true
      });
      joinedGames = data != null ? data : [];
    }
    const allIds = [...(org != null ? org : []).map((g) => g.id), ...joinedGames.map((g) => g.id)];
    const counts = /* @__PURE__ */ new Map();
    if (allIds.length > 0) {
      const {
        data: ps
      } = await supabase.from("game_participants").select("game_id, paid").in("game_id", allIds);
      (ps != null ? ps : []).forEach((p) => {
        var _a;
        const c = (_a = counts.get(p.game_id)) != null ? _a : {
          taken: 0,
          paid: 0
        };
        c.taken += 1;
        if (p.paid) c.paid += 1;
        counts.set(p.game_id, c);
      });
    }
    const enrich = (g, role) => {
      var _a, _b, _c, _d;
      return {
        ...g,
        taken: (_b = (_a = counts.get(g.id)) == null ? void 0 : _a.taken) != null ? _b : 0,
        paid: (_d = (_c = counts.get(g.id)) == null ? void 0 : _c.paid) != null ? _d : 0,
        role
      };
    };
    setOrganized((org != null ? org : []).map((g) => enrich(g, "organizer")));
    setJoined(joinedGames.map((g) => enrich(g, "player")));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [user == null ? void 0 : user.id]);
  const removeGame = async (id) => {
    if (!confirm("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0433\u0440\u0443? \u042D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u043B\u044C\u0437\u044F \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C.")) return;
    const {
      error
    } = await supabase.from("games").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("\u0418\u0433\u0440\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0430");
      load();
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxs("section", { className: "container mx-auto px-4 sm:px-6 py-12", children: [
      /* @__PURE__ */ jsx("h1", { className: "font-display text-4xl font-bold md:text-5xl", children: "\u041C\u043E\u0438 \u0438\u0433\u0440\u044B" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-muted-foreground", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u044F\u0439 \u0441\u043E\u0437\u0434\u0430\u043D\u043D\u044B\u043C\u0438 \u0438\u0433\u0440\u0430\u043C\u0438 \u0438 \u0441\u043B\u0435\u0434\u0438 \u0437\u0430 \u0442\u0435\u043C\u0438, \u0432 \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0442\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u043D." }),
      /* @__PURE__ */ jsxs("div", { className: "mt-10", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl font-bold", children: "\u042F \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "\u0418\u0433\u0440\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0442\u044B \u0441\u043E\u0437\u0434\u0430\u043B. \u041C\u043E\u0436\u0435\u0448\u044C \u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441, \u0447\u0430\u0442 \u0438 \u0443\u0434\u0430\u043B\u044F\u0442\u044C." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3", children: [
          loading && Array.from({
            length: 3
          }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-56 rounded-3xl" }, i)),
          !loading && organized.length === 0 && /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground md:col-span-2 xl:col-span-3", children: [
            "\u0422\u044B \u0435\u0449\u0451 \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043B \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u0438\u0433\u0440\u044B.",
            " ",
            /* @__PURE__ */ jsx(Link, { to: "/create", className: "font-semibold text-primary underline", children: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0435\u0440\u0432\u0443\u044E" })
          ] }),
          organized.map((g) => /* @__PURE__ */ jsx(GameCard, { game: g, onDelete: () => removeGame(g.id) }, g.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-14", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl font-bold", children: "\u042F \u0432 \u043A\u043E\u043C\u0430\u043D\u0434\u0435" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "\u0418\u0433\u0440\u044B, \u0432 \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0442\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u043D \u043A\u0430\u043A \u0438\u0433\u0440\u043E\u043A." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3", children: [
          !loading && joined.length === 0 && /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground md:col-span-2 xl:col-span-3", children: [
            "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439.",
            " ",
            /* @__PURE__ */ jsx(Link, { to: "/games", className: "font-semibold text-primary underline", children: "\u041D\u0430\u0439\u0442\u0438 \u0438\u0433\u0440\u0443" })
          ] }),
          joined.map((g) => /* @__PURE__ */ jsx(GameCard, { game: g }, g.id))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
function GameCard({
  game,
  onDelete
}) {
  var _a, _b, _c;
  const collected = game.paid * game.price_per_player;
  const target = game.slots_total * game.price_per_player;
  return /* @__PURE__ */ jsxs("article", { className: "group relative flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card transition hover:shadow-elegant", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "mb-2", children: game.sport }),
        /* @__PURE__ */ jsx("h3", { className: "font-display text-lg font-bold leading-tight", children: (_b = (_a = game.stadium) == null ? void 0 : _a.name) != null ? _b : "\u0421\u0442\u0430\u0434\u0438\u043E\u043D" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 flex items-center gap-1 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(MapPin, { className: "h-3 w-3" }),
          " ",
          (_c = game.stadium) == null ? void 0 : _c.address
        ] })
      ] }),
      game.role === "organizer" ? /* @__PURE__ */ jsx(Badge, { className: "bg-gradient-brand text-primary-foreground", children: "\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440" }) : /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "\u0418\u0433\u0440\u043E\u043A" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4 grid grid-cols-2 gap-3 text-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [
        /* @__PURE__ */ jsx(Calendar, { className: "h-4 w-4" }),
        " ",
        fmtDate(game.starts_at)
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [
        /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4" }),
        " ",
        fmtTime(game.starts_at),
        "\u2013",
        fmtTime(game.ends_at)
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [
        /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" }),
        " ",
        game.taken,
        "/",
        game.slots_total
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground", children: [
        "\u{1F4B0} ",
        collected,
        " / ",
        target,
        " \u20BD"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-5 flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", className: "flex-1 bg-gradient-brand text-primary-foreground hover:opacity-90", children: /* @__PURE__ */ jsx(Link, { to: "/games/$gameId", params: {
        gameId: game.id
      }, children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C" }) }),
      onDelete && /* @__PURE__ */ jsx(Button, { onClick: onDelete, variant: "outline", size: "icon", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
    ] }),
    game.role === "organizer" && /* @__PURE__ */ jsx(ParticipantsPanel, { gameId: game.id, game })
  ] });
}
function ParticipantsPanel({
  gameId,
  game
}) {
  var _a, _b;
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = async () => {
    const {
      data
    } = await supabase.from("game_participants").select("id, user_id, paid, joined_at").eq("game_id", gameId).order("joined_at", {
      ascending: true
    });
    const ids = Array.from(new Set((data != null ? data : []).map((p) => p.user_id)));
    const map = /* @__PURE__ */ new Map();
    if (ids.length > 0) {
      const {
        data: profs
      } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      (profs != null ? profs : []).forEach((p) => map.set(p.id, {
        display_name: p.display_name,
        avatar_url: p.avatar_url
      }));
    }
    setRows((data != null ? data : []).map((p) => {
      var _a2, _b2, _c, _d;
      return {
        ...p,
        display_name: (_b2 = (_a2 = map.get(p.user_id)) == null ? void 0 : _a2.display_name) != null ? _b2 : null,
        avatar_url: (_d = (_c = map.get(p.user_id)) == null ? void 0 : _c.avatar_url) != null ? _d : null
      };
    }));
  };
  useEffect(() => {
    if (open && rows === null) load();
  }, [open]);
  const kick = async (p) => {
    var _a2;
    if (!confirm(`\u0412\u044B\u0433\u043D\u0430\u0442\u044C ${(_a2 = p.display_name) != null ? _a2 : "\u0438\u0433\u0440\u043E\u043A\u0430"}?`)) return;
    setBusy(p.id);
    const {
      error
    } = await supabase.from("game_participants").delete().eq("id", p.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("\u0418\u0433\u0440\u043E\u043A \u0443\u0434\u0430\u043B\u0451\u043D");
      setRows((r) => r ? r.filter((x) => x.id !== p.id) : r);
    }
  };
  const ensureRows = async () => {
    if (rows) return rows;
    const {
      data
    } = await supabase.from("game_participants").select("id, user_id, paid, joined_at").eq("game_id", gameId).order("joined_at", {
      ascending: true
    });
    const ids = Array.from(new Set((data != null ? data : []).map((p) => p.user_id)));
    const map = /* @__PURE__ */ new Map();
    if (ids.length > 0) {
      const {
        data: profs
      } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      (profs != null ? profs : []).forEach((p) => map.set(p.id, {
        display_name: p.display_name,
        avatar_url: p.avatar_url
      }));
    }
    const enriched = (data != null ? data : []).map((p) => {
      var _a2, _b2, _c, _d;
      return {
        ...p,
        display_name: (_b2 = (_a2 = map.get(p.user_id)) == null ? void 0 : _a2.display_name) != null ? _b2 : null,
        avatar_url: (_d = (_c = map.get(p.user_id)) == null ? void 0 : _c.avatar_url) != null ? _d : null
      };
    });
    setRows(enriched);
    return enriched;
  };
  const fileBase = `participants_${((_b = (_a = game.stadium) == null ? void 0 : _a.name) != null ? _b : "game").replace(/[^a-zа-я0-9]+/gi, "_")}_${game.starts_at.slice(0, 10)}`;
  const exportCSV = async () => {
    const data = await ensureRows();
    if (data.length === 0) {
      toast.info("\u041D\u0435\u0442 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u0434\u043B\u044F \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430");
      return;
    }
    const header = ["#", "\u0418\u043C\u044F", "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E", "\u0417\u0430\u043F\u0438\u0441\u0430\u043D"];
    const lines = [header.join(","), ...data.map((p, i) => {
      var _a2;
      return [i + 1, `"${((_a2 = p.display_name) != null ? _a2 : "\u0418\u0433\u0440\u043E\u043A").replace(/"/g, '""')}"`, p.paid ? "\u0434\u0430" : "\u043D\u0435\u0442", new Date(p.joined_at).toLocaleString("ru-RU")].join(",");
    })];
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });
    triggerDownload(blob, `${fileBase}.csv`);
    toast.success("CSV \u0441\u043A\u0430\u0447\u0430\u043D");
  };
  const exportPDF = async () => {
    var _a2, _b2;
    const data = await ensureRows();
    if (data.length === 0) {
      toast.info("\u041D\u0435\u0442 \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u0434\u043B\u044F \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430");
      return;
    }
    const {
      jsPDF
    } = await import('jspdf');
    const doc = new jsPDF({
      unit: "pt",
      format: "a4"
    });
    const canvas = document.createElement("canvas");
    const W = 800;
    const lineH = 22;
    const top = 110;
    const H = top + (data.length + 2) * lineH + 40;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "bold 22px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("\u0421\u043F\u0438\u0441\u043E\u043A \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432", 30, 40);
    ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillStyle = "#444";
    ctx.fillText(`${game.sport} \xB7 ${(_b2 = (_a2 = game.stadium) == null ? void 0 : _a2.name) != null ? _b2 : ""}`, 30, 64);
    ctx.fillText(`${fmtDate(game.starts_at)}, ${fmtTime(game.starts_at)}\u2013${fmtTime(game.ends_at)} \xB7 ${data.length}/${game.slots_total}`, 30, 84);
    ctx.fillStyle = "#f1f1f1";
    ctx.fillRect(30, top - 16, W - 60, lineH);
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "bold 13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("#", 40, top);
    ctx.fillText("\u0418\u043C\u044F", 80, top);
    ctx.fillText("\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E", 420, top);
    ctx.fillText("\u0417\u0430\u043F\u0438\u0441\u0430\u043D", 560, top);
    ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    data.forEach((p, i) => {
      var _a3;
      const y = top + (i + 1) * lineH;
      if (i % 2 === 1) {
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(30, y - 16, W - 60, lineH);
      }
      ctx.fillStyle = "#0a0a0a";
      ctx.fillText(String(i + 1), 40, y);
      ctx.fillText((_a3 = p.display_name) != null ? _a3 : "\u0418\u0433\u0440\u043E\u043A", 80, y);
      ctx.fillStyle = p.paid ? "#0a8a3a" : "#a83232";
      ctx.fillText(p.paid ? "\u0434\u0430" : "\u043D\u0435\u0442", 420, y);
      ctx.fillStyle = "#444";
      ctx.fillText(new Date(p.joined_at).toLocaleString("ru-RU"), 560, y);
    });
    const img = canvas.toDataURL("image/png");
    const pageW = doc.internal.pageSize.getWidth();
    const ratio = (pageW - 40) / W;
    doc.addImage(img, "PNG", 20, 20, W * ratio, H * ratio);
    doc.save(`${fileBase}.pdf`);
    toast.success("PDF \u0441\u043A\u0430\u0447\u0430\u043D");
  };
  return /* @__PURE__ */ jsxs("div", { className: "mt-4 border-t border-border pt-4", children: [
    /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => setOpen((v) => !v), className: "flex w-full items-center justify-between text-sm font-semibold text-foreground", children: [
      /* @__PURE__ */ jsx("span", { children: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438" }),
      /* @__PURE__ */ jsx(ChevronDown, { className: `h-4 w-4 transition-transform ${open ? "rotate-180" : ""}` })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-3 flex gap-2", children: [
      /* @__PURE__ */ jsxs(Button, { onClick: exportCSV, variant: "outline", size: "sm", className: "flex-1", children: [
        /* @__PURE__ */ jsx(Download, { className: "mr-1 h-4 w-4" }),
        " CSV"
      ] }),
      /* @__PURE__ */ jsxs(Button, { onClick: exportPDF, variant: "outline", size: "sm", className: "flex-1", children: [
        /* @__PURE__ */ jsx(FileText, { className: "mr-1 h-4 w-4" }),
        " PDF"
      ] })
    ] }),
    open && /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-2", children: [
      rows === null && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026" }),
      rows && rows.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "\u041F\u043E\u043A\u0430 \u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043B\u0441\u044F." }),
      rows == null ? void 0 : rows.map((p) => {
        var _a2, _b2;
        return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-brand font-display text-xs font-bold text-primary-foreground", children: ((_a2 = p.display_name) != null ? _a2 : "?").slice(0, 1).toUpperCase() }),
            /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium", children: (_b2 = p.display_name) != null ? _b2 : "\u0418\u0433\u0440\u043E\u043A" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: p.paid ? "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E" : "\u041D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs(Button, { onClick: () => kick(p), disabled: busy === p.id, variant: "ghost", size: "sm", className: "text-destructive hover:bg-destructive/10 hover:text-destructive", children: [
            /* @__PURE__ */ jsx(UserMinus, { className: "mr-1 h-4 w-4" }),
            " \u0412\u044B\u0433\u043D\u0430\u0442\u044C"
          ] })
        ] }, p.id);
      })
    ] })
  ] });
}
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
const SplitComponent = () => /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(MyPage, {}) });

export { SplitComponent as component };
//# sourceMappingURL=my-BiDCr8XK.mjs.map
