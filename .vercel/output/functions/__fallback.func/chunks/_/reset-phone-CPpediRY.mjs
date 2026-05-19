import { jsxs, jsx } from 'react/jsx-runtime';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, ShieldCheck, Phone } from 'lucide-react';
import { L as Logo } from './Logo-DDLL_UOB.mjs';
import { B as Button } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { L as Label } from './label-C6ng35E5.mjs';
import { f as formatRuPhone, i as isValidRuPhone } from './phone-BjxCDanq.mjs';
import { toast } from 'sonner';
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

function ResetByPhonePage() {
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (!isValidRuPhone(phone)) {
      toast.error("\u0412\u0432\u0435\u0434\u0438 \u0440\u043E\u0441\u0441\u0438\u0439\u0441\u043A\u0438\u0439 \u043D\u043E\u043C\u0435\u0440: +7 (XXX) XXX-XX-XX");
      return;
    }
    setSubmitted(true);
    toast.success("\u0415\u0441\u043B\u0438 \u043D\u043E\u043C\u0435\u0440 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D, \u043C\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u043C SMS \u0441 \u043A\u043E\u0434\u043E\u043C.");
  };
  return /* @__PURE__ */ jsxs("div", { className: "relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-soft px-4 py-12", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.85_0.13_220/0.4),transparent_50%)]" }),
    /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-elegant", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx(Logo, {}),
        /* @__PURE__ */ jsxs(Link, { to: "/auth", className: "inline-flex items-center text-xs text-muted-foreground hover:text-foreground", children: [
          /* @__PURE__ */ jsx(ArrowLeft, { className: "mr-1 h-3 w-3" }),
          " \u041A \u0432\u0445\u043E\u0434\u0443"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("h1", { className: "mt-8 flex items-center gap-2 font-display text-2xl font-bold", children: [
        /* @__PURE__ */ jsx(ShieldCheck, { className: "h-6 w-6 text-primary" }),
        "\u0421\u0431\u0440\u043E\u0441 \u043F\u043E SMS"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "\u0415\u0441\u043B\u0438 \u0442\u044B \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043B \u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B \u0442\u0435\u043B\u0435\u0444\u043E\u043D \u0432 \u043F\u0440\u043E\u0444\u0438\u043B\u0435, \u043C\u044B \u043F\u0440\u0438\u0448\u043B\u0451\u043C SMS-\u043A\u043E\u0434 \u0434\u043B\u044F \u0441\u0431\u0440\u043E\u0441\u0430 \u043F\u0430\u0440\u043E\u043B\u044F." }),
      submitted ? /* @__PURE__ */ jsxs("div", { className: "mt-8 space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border bg-muted/40 p-4 text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 font-display font-bold", children: [
            /* @__PURE__ */ jsx(Phone, { className: "h-4 w-4" }),
            " ",
            formatRuPhone(phone)
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-muted-foreground", children: "\u041A\u043E\u0434 \u0431\u044B\u043B \u0431\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u0441\u044E\u0434\u0430. \u0420\u0435\u0430\u043B\u044C\u043D\u0430\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 SMS \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u043A \u043F\u0440\u043E\u0435\u043A\u0442\u0443 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0442 SMS-\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440. \u041F\u043E\u043A\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0432\u0445\u043E\u0434 \u043F\u043E email \u0438 \u043F\u0430\u0440\u043E\u043B\u044E." })
        ] }),
        /* @__PURE__ */ jsx(Button, { asChild: true, variant: "outline", className: "w-full", children: /* @__PURE__ */ jsx(Link, { to: "/auth", children: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043A\u043E \u0432\u0445\u043E\u0434\u0443" }) })
      ] }) : /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "mt-8 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "phone", children: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D" }),
          /* @__PURE__ */ jsx(Input, { id: "phone", inputMode: "tel", value: formatRuPhone(phone), onChange: (e) => setPhone(e.target.value), placeholder: "+7 (999) 000-00-00", className: "mt-1 h-11", maxLength: 20 })
        ] }),
        /* @__PURE__ */ jsx(Button, { type: "submit", size: "lg", className: "w-full bg-gradient-brand text-primary-foreground hover:opacity-90", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u0434" })
      ] })
    ] })
  ] });
}

export { ResetByPhonePage as component };
//# sourceMappingURL=reset-phone-CPpediRY.mjs.map
