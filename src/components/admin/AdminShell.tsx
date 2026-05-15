import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users as UsersIcon,
  Gamepad2,
  Star,
  Home,
  Menu,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/brand/Logo";

const nav = [
  { to: "/admin", label: "Дашборд", icon: Home, exact: true },
  { to: "/admin/users", label: "Пользователи", icon: UsersIcon },
  { to: "/admin/games", label: "Игры", icon: Gamepad2 },
  { to: "/admin/goals", label: "Голы", icon: Star },
  { to: "/admin/log", label: "Аудит", icon: ScrollText },
] as const;

const linkClass =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
const linkActive =
  "!bg-primary/10 !text-primary !font-semibold";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {nav.map((n) => (
        <Link
          key={n.to}
          to={n.to as "/admin"}
          onClick={onClick}
          className={linkClass}
          activeOptions={{ exact: !!n.exact }}
          activeProps={{ className: linkActive }}
        >
          <n.icon className="h-4 w-4" />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — отдельный от публичного SiteHeader */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Открыть меню"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
                  <SheetTitle className="font-display text-base font-semibold">
                    Админка
                  </SheetTitle>
                </SheetHeader>
                <div className="p-3">
                  <NavList onClick={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <Logo />
            <span className="hidden rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive sm:inline">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/" })}>
              К сайту
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Выйти
            </Button>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="container mx-auto grid gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Разделы
            </p>
            <NavList />
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
