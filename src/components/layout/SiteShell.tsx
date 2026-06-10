import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Menu, Plus, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = { to: string; label: string };

const baseNav: NavItem[] = [
  { to: "/games", label: "Игры" },
  { to: "/stadiums", label: "Стадионы" },
];

const authedNav: NavItem[] = [
  { to: "/my", label: "Мои игры" },
  { to: "/friends", label: "Друзья" },
  { to: "/chats", label: "Общение" },
  { to: "/profile", label: "Профиль" },
];

// Кэш ролей на сессию, чтобы хедер не дёргал БД на каждой странице.
let rolesCache: { uid: string; admin: boolean; manager: boolean } | null = null;

/** Ссылки «Админка»/«Менеджер» в хедере — для админа и менеджера стадиона. */
function useHeaderRoles(userId: string | undefined) {
  const [roles, setRoles] = useState<{ admin: boolean; manager: boolean }>(
    rolesCache && rolesCache.uid === userId
      ? { admin: rolesCache.admin, manager: rolesCache.manager }
      : { admin: false, manager: false },
  );

  useEffect(() => {
    if (!userId) {
      rolesCache = null;
      setRoles({ admin: false, manager: false });
      return;
    }
    if (rolesCache?.uid === userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: adminRow }, { data: managed }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle(),
        supabase.from("stadiums").select("id").eq("manager_id", userId).limit(1),
      ]);
      if (cancelled) return;
      const next = { uid: userId, admin: !!adminRow, manager: (managed ?? []).length > 0 };
      rolesCache = next;
      setRoles({ admin: next.admin, manager: next.manager });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return roles;
}

function UserSearch({ onSubmit }: { onSubmit?: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const u = q.trim().replace(/^@/, "");
        if (!u) return;
        navigate({ to: "/u/$username", params: { username: u } });
        setQ("");
        onSubmit?.();
      }}
      className="relative w-full"
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="@никнейм"
        className="h-9 w-full pl-8 text-sm"
        maxLength={24}
      />
    </form>
  );
}

/**
 * Стиль ссылки в десктопной навигации.
 * Подсвечивается через activeProps + activeOptions={{ exact: false }} —
 * чтобы /games/<id> тоже подсвечивал «Игры», а не только корневой путь.
 */
const navLinkClass =
  "relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:-bottom-[22px] after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity";

const navLinkActiveClass = "!text-primary font-semibold after:!opacity-100";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { admin, manager } = useHeaderRoles(user?.id);

  const roleNav: NavItem[] = [
    ...(manager ? [{ to: "/manager", label: "Менеджер" }] : []),
    ...(admin ? [{ to: "/admin", label: "Админка" }] : []),
  ];
  const nav = user ? [...baseNav, ...authedNav, ...roleNav] : baseNav;

  const closeSheet = () => setOpen(false);

  return (
    <header className="pwa-safe-top sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex lg:gap-8">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to as "/games"}
              className={navLinkClass}
              activeOptions={{ exact: false }}
              activeProps={{ className: navLinkActiveClass }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          {user && (
            <div className="hidden lg:block">
              <UserSearch />
            </div>
          )}
          {user && <NotificationsBell />}
          {user ? (
            <Button variant="ghost" onClick={() => signOut()}>
              Выйти
            </Button>
          ) : (
            <Button variant="ghost" asChild>
              <Link to="/auth">Войти</Link>
            </Button>
          )}
          <Button asChild className="bg-gradient-brand text-primary-foreground hover:opacity-90">
            <Link to="/create">Создать игру</Link>
          </Button>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-1 md:hidden">
          {user && <NotificationsBell />}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Открыть меню"
                className="h-10 w-10"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-[88vw] max-w-sm flex-col gap-0 p-0"
            >
              <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
                <SheetTitle className="font-display text-base font-semibold">
                  Меню
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-1 px-3 py-3">
                {nav.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to as "/games"}
                    onClick={closeSheet}
                    className="rounded-xl px-3 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    activeOptions={{ exact: false }}
                    activeProps={{
                      className:
                        "!bg-primary/10 !text-primary !font-semibold",
                    }}
                  >
                    {n.label}
                  </Link>
                ))}
              </div>

              {user && (
                <div className="border-t border-border/60 px-5 py-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Поиск игрока
                  </p>
                  <UserSearch onSubmit={closeSheet} />
                </div>
              )}

              <div className="mt-auto flex flex-col gap-2 border-t border-border/60 p-4">
                <Button
                  asChild
                  className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                  onClick={closeSheet}
                >
                  <Link to="/create">
                    <Plus className="mr-1 h-4 w-4" />
                    Создать игру
                  </Link>
                </Button>
                {user ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      signOut();
                      closeSheet();
                    }}
                  >
                    <LogOut className="mr-1 h-4 w-4" />
                    Выйти
                  </Button>
                ) : (
                  <Button variant="outline" asChild onClick={closeSheet}>
                    <Link to="/auth">
                      <LogIn className="mr-1 h-4 w-4" />
                      Войти
                    </Link>
                  </Button>
                )}
                {user && (
                  <Button variant="ghost" asChild onClick={closeSheet}>
                    <Link to="/profile">
                      <UserIcon className="mr-1 h-4 w-4" />
                      Профиль
                    </Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-gradient-soft">
      <div className="container mx-auto grid gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 md:gap-10 md:py-12">
        <div className="space-y-2">
          <Logo variant="horizontal" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Платформа для любительского спорта: находи игры, собирай команду, играй.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground md:col-span-2 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Сервис
            </p>
            <ul className="space-y-1.5">
              <li><Link to="/games" className="hover:text-foreground">Игры</Link></li>
              <li><Link to="/stadiums" className="hover:text-foreground">Стадионы</Link></li>
              <li><Link to="/create" className="hover:text-foreground">Создать игру</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Документы
            </p>
            <ul className="space-y-1.5">
              <li><Link to="/privacy" className="hover:text-foreground">Политика конфиденциальности</Link></li>
              <li><Link to="/personal-data" className="hover:text-foreground">Согласие на обработку ПД</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Контакты
            </p>
            <ul className="space-y-1.5">
              <li>
                <a href="mailto:hello@af-sport.ru" className="hover:text-foreground">
                  hello@af-sport.ru
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container mx-auto flex flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} ООО «АТЛЕТИК ФЛОУ». Все права защищены.
          </p>
          <p className="text-[11px] leading-relaxed">
            ИНН 5024259241 · КПП 502401001 ·
            143442, Московская обл., Красногорский р-н, д. Отрадное, ул. Пятницкая, д. 14, кв. 443
          </p>
        </div>
      </div>
    </footer>
  );
}
