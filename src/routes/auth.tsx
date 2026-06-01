import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Вход — Athletic Flow" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  // После успешного signUp — фиксируем флаг, чтобы:
  //   1) Не редиректить на /games даже если Supabase отдал нам session
  //      (email confirmation off в проекте — это рабочий сценарий).
  //   2) Показать большую inline-плашку «Проверь почту» вместо формы.
  const [justSignedUp, setJustSignedUp] = useState(false);

  useEffect(() => {
    if (user && !justSignedUp) navigate({ to: "/games" });
  }, [user, navigate, justSignedUp]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Аккаунт создан!");
        setJustSignedUp(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Добро пожаловать!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка авторизации";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-soft px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.85_0.13_220/0.4),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,oklch(0.7_0.18_260/0.3),transparent_55%)]" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-elegant">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            На главную
          </Link>
        </div>

        {justSignedUp ? (
          <div className="mt-8 space-y-4 text-center">
            <h1 className="font-display text-2xl font-bold">Аккаунт создан</h1>
            <p className="text-sm text-muted-foreground">
              Мы отправили письмо на <b className="text-foreground">{email}</b>. Открой его и подтверди адрес,
              чтобы войти. Письмо может прийти через 1–2 минуты — проверь папку «Спам».
            </p>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                setJustSignedUp(false);
                setMode("signin");
                setPassword("");
              }}
            >
              Перейти ко входу
            </Button>
          </div>
        ) : (
        <>
        <h1 className="mt-8 font-display text-2xl font-bold">
          {mode === "signin" ? "Вход в Athletic Flow" : "Регистрация"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Войди, чтобы записаться на игру" : "Создай аккаунт за минуту"}
        </p>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Александр"
                className="mt-1 h-11"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 h-11"
            />
          </div>
          <div>
            <Label htmlFor="pass">Пароль</Label>
            <Input
              id="pass"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 h-11"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {loading ? "..." : mode === "signin" ? "Войти" : "Создать аккаунт"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-foreground hover:text-primary"
            >
              {mode === "signin" ? "Зарегистрироваться" : "Войти"}
            </button>
          </p>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
