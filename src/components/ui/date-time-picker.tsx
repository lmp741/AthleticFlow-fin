import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronDown, Clock as ClockIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Date + Time picker через shadcn Calendar + два <select>.
 *
 * Зачем: нативные <input type="date">/"time" на десктопе ведут себя
 * непредсказуемо — особенно в Firefox/Safari без чёткой иконки и без понятного
 * способа открыть picker. У Misha на Windows Chrome бывает, что popup не вылазит.
 *
 * Этот компонент даёт одинаковый UX на десктопе и мобиле:
 *   - Дата: клик → Popover с календарём, выбор → Popover закрывается.
 *   - Время: два <select>, часы 0-23, минуты с шагом 5.
 *
 * Value-формат:
 *   date — "YYYY-MM-DD"  (как у <input type="date">)
 *   time — "HH:mm"       (как у <input type="time">)
 * Чтобы можно было drop-in заменить старые инпуты.
 */
export function DatePicker({
  value,
  onChange,
  className,
  minDate,
  placeholder = "Выбрать дату",
}: {
  value: string; // "YYYY-MM-DD"
  onChange: (next: string) => void;
  className?: string;
  minDate?: Date;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => {
    if (!value) return undefined;
    const d = new Date(value + "T00:00:00");
    return Number.isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  const label = selected
    ? selected.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "short",
      })
    : placeholder;

  const isoOf = (d: Date) => {
    // toISOString даст UTC — а нам нужен локальный день.
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) onChange(isoOf(d));
            setOpen(false);
          }}
          disabled={minDate ? (d) => d < minDate : undefined}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Time picker — кнопка с текущим временем, по клику открывается popover
 * с двумя scrollable-колонками: часы и минуты. Тап по числу подсвечивает
 * и записывает в state, popover остаётся открыт — можно поменять обе части
 * и закрыть кликом наружу.
 *
 * Лучше нативного <input type="time"> (плохо открывается на десктопе),
 * лучше двух <select> (старый и неудобный UI).
 */
export function TimePicker({
  value,
  onChange,
  className,
  step = 5,
}: {
  value: string; // "HH:mm"
  onChange: (next: string) => void;
  className?: string;
  step?: number;
}) {
  const [open, setOpen] = useState(false);
  const [hh = "19", mm = "00"] = (value ?? "").split(":");

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);
  const minutes = useMemo(
    () => Array.from({ length: Math.ceil(60 / step) }, (_, i) => String(i * step).padStart(2, "0")),
    [step],
  );

  const setHH = (h: string) => onChange(`${h}:${mm}`);
  const setMM = (m: string) => onChange(`${hh}:${m}`);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <span className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-mono tabular-nums">{hh}:{mm}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex">
          <TimeColumn
            label="Часы"
            items={hours}
            value={hh}
            onPick={setHH}
          />
          <div className="w-px self-stretch bg-border" />
          <TimeColumn
            label="Мин"
            items={minutes}
            value={mm}
            onPick={setMM}
          />
        </div>
        <div className="border-t border-border px-2 py-1.5 text-center">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Готово
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Внутренний компонент колонки часов/минут — scrollable список с подсветкой выбранного.
 */
function TimeColumn({
  label,
  items,
  value,
  onPick,
}: {
  label: string;
  items: string[];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex w-16 flex-col">
      <div className="border-b border-border px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="max-h-56 overflow-y-auto py-1">
        {items.map((it) => (
          <button
            key={it}
            type="button"
            onClick={() => onPick(it)}
            className={cn(
              "block w-full px-3 py-1.5 text-center font-mono text-sm tabular-nums transition",
              value === it
                ? "bg-primary text-primary-foreground font-bold"
                : "hover:bg-accent",
            )}
          >
            {it}
          </button>
        ))}
      </div>
    </div>
  );
}
