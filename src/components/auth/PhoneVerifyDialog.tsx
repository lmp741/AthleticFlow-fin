import { useEffect, useState } from "react";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatRuPhone, toE164Ru } from "@/lib/phone";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  phone: string; // already in +7XXXXXXXXXX
  purpose?: "verify" | "recovery";
  onVerified: () => void;
}

const RESEND_SECONDS = 60;

export function PhoneVerifyDialog({
  open,
  onOpenChange,
  userId,
  phone,
  purpose = "verify",
  onVerified,
}: Props) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCode("");
      setDevCode(null);
      setSecondsLeft(0);
    }
  }, [open]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const sendCode = async () => {
    const e164 = toE164Ru(phone);
    if (!e164) {
      toast.error("Неверный номер. Формат: +7 (XXX) XXX-XX-XX");
      return;
    }
    setSending(true);
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await supabase.from("phone_verifications").insert({
      user_id: userId,
      phone: e164,
      code: generated,
      purpose,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSecondsLeft(RESEND_SECONDS);
    setDevCode(generated);
    toast.success("Код отправлен. SMS-провайдер пока в тестовом режиме.");
  };

  const verify = async () => {
    const e164 = toE164Ru(phone);
    if (!e164) return;
    if (code.length !== 6) {
      toast.error("Введи 6 цифр кода");
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase
      .from("phone_verifications")
      .select("id, code, expires_at, consumed_at")
      .eq("user_id", userId)
      .eq("phone", e164)
      .eq("purpose", purpose)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      setVerifying(false);
      toast.error("Сначала запроси код");
      return;
    }
    if (data.consumed_at) {
      setVerifying(false);
      toast.error("Этот код уже использован, запроси новый");
      return;
    }
    if (new Date(data.expires_at).getTime() < Date.now()) {
      setVerifying(false);
      toast.error("Код истёк, запроси новый");
      return;
    }
    if (data.code !== code) {
      setVerifying(false);
      toast.error("Неверный код");
      return;
    }
    await supabase
      .from("phone_verifications")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (purpose === "verify") {
      await supabase
        .from("profiles")
        .update({ phone: e164, phone_verified: true })
        .eq("id", userId);
    }
    setVerifying(false);
    toast.success(purpose === "verify" ? "Номер подтверждён" : "Код подтверждён");
    onVerified();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Подтверждение номера
          </DialogTitle>
          <DialogDescription>
            Отправим SMS с 6-значным кодом на{" "}
            <span className="font-display font-bold text-foreground">
              {formatRuPhone(phone)}
            </span>
            . Подтверждённый номер можно использовать для восстановления пароля.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">SMS-код</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={sendCode}
              disabled={sending || secondsLeft > 0}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : secondsLeft > 0 ? (
                `Повторить через ${secondsLeft}с`
              ) : devCode ? (
                "Отправить ещё раз"
              ) : (
                "Отправить код"
              )}
            </Button>
          </div>

          {devCode && (
            <p className="rounded-xl border border-dashed border-amber-400/60 bg-amber-50 p-2 text-center text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Тестовый режим: реальная SMS не отправлена. Твой код:{" "}
              <span className="font-mono text-base font-bold">{devCode}</span>
            </p>
          )}

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={verify}
            disabled={verifying || code.length !== 6}
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
