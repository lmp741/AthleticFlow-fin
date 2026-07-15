import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";

/**
 * Страница, куда PayKeeper возвращает клиента после УСПЕШНОЙ оплаты.
 * Сам факт оплаты подтверждает webhook /api/paykeeper/callback — эта страница
 * только сообщает результат человеку (PayKeeper не передаёт сюда номер заказа).
 */
export const Route = createFileRoute("/pay/success")({
  head: () => ({
    meta: [
      { title: "Оплата прошла — Athletic Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaySuccessPage,
});

function PaySuccessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-card sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold sm:text-3xl">Оплата прошла</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Спасибо! Участие оплачено, чек отправлен на вашу почту. Отметка «Оплачено» появится
            в игре в течение минуты.
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
