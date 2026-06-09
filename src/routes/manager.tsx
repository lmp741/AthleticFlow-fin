import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { ManagerShell } from "@/components/manager/ManagerShell";
import {
  ManagerContext,
  type ManagerStadium,
  type ManagerVenue,
  type ManagerSizeOption,
} from "@/components/manager/manager-data";

/**
 * Layout-роут /manager/*.
 * Guard: у пользователя должен быть стадион с manager_id = uid.
 * Клиентская проверка — UX; реальная защита — RLS-политики
 * "manager edits ..." и SECURITY DEFINER RPC с проверкой менеджера.
 */
export const Route = createFileRoute("/manager")({
  head: () => ({
    meta: [
      { title: "Менеджер стадиона — Athletic Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ManagerLayout,
});

function ManagerLayout() {
  const { user, loading: authLoading } = useAuth();
  // null = ещё грузим; false = стадиона нет (не менеджер).
  const [stadium, setStadium] = useState<ManagerStadium | null | false>(null);
  const [venues, setVenues] = useState<ManagerVenue[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: st, error } = await supabase
      .from("stadiums")
      .select("id, name, address, phone, email, website, cover_url")
      .eq("manager_id", user.id)
      .limit(1)
      .maybeSingle();
    if (error || !st) {
      setStadium(false);
      return;
    }
    setStadium(st as ManagerStadium);

    const { data: vs } = await supabase
      .from("stadium_venues")
      .select("id, name, sports, size_width, size_length, active, sort_order")
      .eq("stadium_id", st.id)
      .order("sort_order", { ascending: true });
    const ids = (vs ?? []).map((v) => v.id);
    let opts: ManagerSizeOption[] = [];
    if (ids.length) {
      const { data: os } = await supabase
        .from("venue_size_options")
        .select("id, venue_id, size_code, label, price_per_hour, parallel_count, sort_order, active")
        .in("venue_id", ids)
        .order("sort_order", { ascending: true });
      opts = (os ?? []) as ManagerSizeOption[];
    }
    setVenues(
      ((vs ?? []) as Omit<ManagerVenue, "size_options">[]).map((v) => ({
        ...v,
        size_options: opts.filter((o) => o.venue_id === v.id),
      })),
    );
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) setStadium(false);
    if (user) void load();
  }, [user, authLoading, load]);

  if (authLoading || stadium === null) {
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
          <p className="mt-2 text-sm text-muted-foreground">
            Для доступа в кабинет менеджера войди в аккаунт.
          </p>
          <Button asChild className="mt-6 bg-gradient-brand text-primary-foreground hover:opacity-90">
            <Link to="/auth">Войти</Link>
          </Button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (stadium === false) {
    // Не раскрываем существование /manager — обычное 404-подобное окно.
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center sm:px-6">
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

  return (
    <ManagerContext.Provider value={{ stadium, venues, reload: load }}>
      <ManagerShell stadiumName={stadium.name}>
        <Outlet />
      </ManagerShell>
    </ManagerContext.Provider>
  );
}
