import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { ShieldAlert } from "lucide-react";

/**
 * Guard для админских страниц.
 * Делает запрос к user_roles. Если роли admin нет — показывает 403, без редиректа.
 *
 * ВАЖНО: проверка только на клиенте — это UX. Реальная защита — RLS политики
 * в supabase (см. sql/admin.sql). Даже если кто-то подменит локальный стейт,
 * мутации против БД пройдут только если has_role('admin') — а это серверная проверка.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      setIsAdmin(!error && !!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-10 sm:px-6">
          <Skeleton className="h-10 w-64 rounded-2xl" />
          <Skeleton className="mt-4 h-64 w-full rounded-3xl" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 sm:px-6">
          <ShieldAlert className="h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Требуется вход</h1>
          <p className="mt-2 text-sm text-muted-foreground">Для доступа в админку войди в аккаунт.</p>
          <Button asChild className="mt-6 bg-gradient-brand text-primary-foreground hover:opacity-90">
            <Link to="/auth">Войти</Link>
          </Button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!isAdmin) {
    // Не показываем существование /admin страниц — рендерим обычное 404-подобное окно.
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 sm:px-6 text-center">
          <h1 className="font-display text-7xl font-bold text-muted-foreground">404</h1>
          <p className="mt-2 text-sm text-muted-foreground">Страница не найдена.</p>
          <Button asChild className="mt-6 bg-gradient-brand text-primary-foreground hover:opacity-90">
            <Link to="/">На главную</Link>
          </Button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return <>{children}</>;
}
