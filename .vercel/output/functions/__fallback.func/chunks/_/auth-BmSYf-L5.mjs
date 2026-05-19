import { jsxs, jsx } from 'react/jsx-runtime';
import { useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { L as Logo } from './Logo-DDLL_UOB.mjs';
import { u as useAuth, B as Button, s as supabase } from './ssr.mjs';
import { I as Input } from './input-Dzp1k4d4.mjs';
import { L as Label } from './label-C6ng35E5.mjs';
import { toast } from 'sonner';
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
import '@radix-ui/react-label';

function AuthPage() {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (user) navigate({
      to: "/games"
    });
  }, [user, navigate]);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const {
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: name || email.split("@")[0]
            }
          }
        });
        if (error) throw error;
        toast.success("\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0441\u043E\u0437\u0434\u0430\u043D!");
      } else {
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast.success("\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-soft px-4 py-12", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.85_0.13_220/0.4),transparent_50%)]" }),
    /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,oklch(0.7_0.18_260/0.3),transparent_55%)]" }),
    /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-elegant", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx(Logo, {}),
        /* @__PURE__ */ jsx(Link, { to: "/", className: "text-xs text-muted-foreground hover:text-foreground", children: "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E" })
      ] }),
      /* @__PURE__ */ jsx("h1", { className: "mt-8 font-display text-2xl font-bold", children: mode === "signin" ? "\u0412\u0445\u043E\u0434 \u0432 Athletic Flow" : "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: mode === "signin" ? "\u0412\u043E\u0439\u0434\u0438, \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C\u0441\u044F \u043D\u0430 \u0438\u0433\u0440\u0443" : "\u0421\u043E\u0437\u0434\u0430\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0437\u0430 \u043C\u0438\u043D\u0443\u0442\u0443" }),
      /* @__PURE__ */ jsxs("form", { className: "mt-8 space-y-4", onSubmit: submit, children: [
        mode === "signup" && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "\u0418\u043C\u044F" }),
          /* @__PURE__ */ jsx(Input, { id: "name", value: name, onChange: (e) => setName(e.target.value), placeholder: "\u0410\u043B\u0435\u043A\u0441\u0430\u043D\u0434\u0440", className: "mt-1 h-11" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
          /* @__PURE__ */ jsx(Input, { id: "email", type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", className: "mt-1 h-11" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "pass", children: "\u041F\u0430\u0440\u043E\u043B\u044C" }),
          /* @__PURE__ */ jsx(Input, { id: "pass", type: "password", required: true, minLength: 6, value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "mt-1 h-11" })
        ] }),
        /* @__PURE__ */ jsx(Button, { type: "submit", disabled: loading, size: "lg", className: "w-full bg-gradient-brand text-primary-foreground hover:opacity-90", children: loading ? "..." : mode === "signin" ? "\u0412\u043E\u0439\u0442\u0438" : "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442" }),
        mode === "signin" && /* @__PURE__ */ jsx("p", { className: "text-center text-xs", children: /* @__PURE__ */ jsx(Link, { to: "/reset-phone", className: "text-muted-foreground hover:text-primary", children: "\u0417\u0430\u0431\u044B\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C? \u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043F\u043E SMS \u2192" }) }),
        /* @__PURE__ */ jsxs("p", { className: "text-center text-sm text-muted-foreground", children: [
          mode === "signin" ? "\u041D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430?" : "\u0423\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442?",
          " ",
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setMode(mode === "signin" ? "signup" : "signin"), className: "font-semibold text-foreground hover:text-primary", children: mode === "signin" ? "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F" : "\u0412\u043E\u0439\u0442\u0438" })
        ] })
      ] })
    ] })
  ] });
}

export { AuthPage as component };
//# sourceMappingURL=auth-BmSYf-L5.mjs.map
