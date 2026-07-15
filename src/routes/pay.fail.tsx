import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";

/**
 * Страница, куда PayKeeper возвращает клиента при НЕУДАЧНОЙ оплате
 * (отмена, отказ банка и т.п.). Деньги не списаны, участие не оплачено.
 */
export const Route = createFileRoute("/pay/fail")({
  head: () => ({
    meta: [
      { title: "Оплата не прошла — Athletic Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PayFailPage,
});

function PayFailPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-card sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15">
            <XCircle className="h-9 w-9 text-rose-600 dark:text-rose-400" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold sm:text-3xl">Оплата не прошла</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Платёж не завершён — деньги не списаны. Можно вернуться в игру и попробовать оплатить ещё раз.
          </p>
          <div className="mt-8 flex flex-col gap-2">
            <Button asChild size="lg" className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90">
              <Link to="/my">Мои игры</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link to="/games">К каталогу игр</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
