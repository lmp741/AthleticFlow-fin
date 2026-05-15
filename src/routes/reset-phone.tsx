import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ShieldCheck, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRuPhone, isValidRuPhone } from "@/lib/phone";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-phone")({
  head: () => ({ meta: [{ title: "Восстановление пароля по SMS — Athletic Flow" }] }),
  component: ResetByPhonePage,
});

function ResetByPhonePage() {
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidRuPhone(phone)) {
      toast.error("Введи российский номер: +7 (XXX) XXX-XX-XX");
      return;
    }
    setSubmitted(true);
    toast.success("Если номер привязан и подтверждён, мы отправим SMS с кодом.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-soft px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.85_0.13_220/0.4),transparent_50%)]" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-elegant">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to="/auth" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-3 w-3" /> К входу
          </Link>
        </div>

        <h1 className="mt-8 flex items-center gap-2 font-display text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Сброс по SMS
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Если ты привязал и подтвердил телефон в профиле, мы пришлём SMS-код для
          сброса пароля.
        </p>

        {submitted ? (
          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
              <div className="flex items-center gap-2 font-display font-bold">
                <Phone className="h-4 w-4" /> {formatRuPhone(phone)}
              </div>
              <p className="mt-2 text-muted-foreground">
                Код был бы отправлен сюда. Реальная отправка SMS включится, когда
                к проекту подключат SMS-провайдер. Пока используй вход по email и
                паролю.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">Вернуться ко входу</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                inputMode="tel"
                value={formatRuPhone(phone)}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 000-00-00"
                className="mt-1 h-11"
                maxLength={20}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              Отправить код
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
