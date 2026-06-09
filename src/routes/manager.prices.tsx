import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useManager, type ManagerSizeOption } from "@/components/manager/manager-data";

export const Route = createFileRoute("/manager/prices")({
  component: ManagerPrices,
});

function ManagerPrices() {
  const { venues, reload } = useManager();

  // Realtime: если цену поменяли в другом окне/Studio — обновим контекст.
  useEffect(() => {
    const ch = supabase
      .channel("manager-prices-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_size_options" },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [reload]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Цены</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Изменение цены подхватывается на странице создания игры мгновенно (realtime),
          уже созданные брони не пересчитываются.
        </p>
      </div>

      {venues.map((v) => (
        <Card key={v.id}>
          <CardHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {v.name}
              {v.size_width && v.size_length && (
                <Badge variant="secondary">
                  {v.size_length}×{v.size_width} м
                </Badge>
              )}
              {!v.active && <Badge variant="outline">Скрыта</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 sm:p-6">
            {v.size_options.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет вариантов аренды.</p>
            )}
            {v.size_options.map((o) => (
              <PriceRow key={o.id} option={o} onSaved={reload} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PriceRow({ option, onSaved }: { option: ManagerSizeOption; onSaved: () => void }) {
  const [price, setPrice] = useState(String(option.price_per_hour));
  const [active, setActive] = useState(option.active);
  const [busy, setBusy] = useState(false);

  // Синхронизация при realtime-обновлении из контекста.
  useEffect(() => {
    setPrice(String(option.price_per_hour));
    setActive(option.active);
  }, [option.price_per_hour, option.active]);

  const dirty = Number(price) !== option.price_per_hour || active !== option.active;

  const save = async () => {
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) {
      toast.error("Некорректная цена");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("venue_size_options")
      .update({ price_per_hour: Math.round(p), active })
      .eq("id", option.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${option.label}: сохранено`);
    onSaved();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-3">
      <div className="flex items-center gap-3">
        <Switch checked={active} onCheckedChange={setActive} />
        <span className={`text-sm font-medium ${active ? "" : "text-muted-foreground"}`}>
          {option.label}
        </span>
        {option.parallel_count > 1 && (
          <Badge variant="secondary">×{option.parallel_count} параллельно</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            type="number"
            min="0"
            step="100"
            className="w-32 pr-10"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ₽/ч
          </span>
        </div>
        <Button size="sm" disabled={!dirty || busy} onClick={save}>
          Сохранить
        </Button>
      </div>
    </div>
  );
}
