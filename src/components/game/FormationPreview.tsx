/**
 * Мини-схема расстановки команды на /create — рядом со слайдером количества
 * игроков. Координаты СИНХРОНИЗИРОВАНЫ с build_draft_slots в БД, но строго
 * для команды A (левая половина поля). Если поменяешь SQL — поправь и тут.
 *
 * Правило компоновки: команда A в x ≤ 0.42, B в x ≥ 0.58. Центр поля
 * (0.45–0.55) — нейтральная зона, никто туда не ставится, чтобы не было
 * "поцелуев" нападающих в центральном круге.
 */

interface SlotPreview {
  x: number;
  y: number;
  role: string;
}

const FORMATIONS_A: Record<number, SlotPreview[]> = {
  5: [
    { x: 0.05, y: 0.5, role: "GK" },
    { x: 0.18, y: 0.3, role: "DF" },
    { x: 0.18, y: 0.7, role: "DF" },
    { x: 0.36, y: 0.3, role: "MF" },
    { x: 0.36, y: 0.7, role: "MF" },
  ],
  6: [
    { x: 0.05, y: 0.5, role: "GK" },
    { x: 0.16, y: 0.5, role: "CB" },
    { x: 0.2, y: 0.22, role: "LB" },
    { x: 0.2, y: 0.78, role: "RB" },
    { x: 0.3, y: 0.5, role: "CM" },
    { x: 0.41, y: 0.5, role: "ST" },
  ],
  7: [
    { x: 0.04, y: 0.5, role: "GK" },
    { x: 0.14, y: 0.5, role: "CB" },
    { x: 0.18, y: 0.22, role: "LB" },
    { x: 0.18, y: 0.78, role: "RB" },
    { x: 0.28, y: 0.34, role: "CM" },
    { x: 0.28, y: 0.66, role: "CM" },
    { x: 0.41, y: 0.5, role: "ST" },
  ],
  8: [
    { x: 0.04, y: 0.5, role: "GK" },
    { x: 0.15, y: 0.2, role: "LB" },
    { x: 0.15, y: 0.5, role: "CB" },
    { x: 0.15, y: 0.8, role: "RB" },
    { x: 0.28, y: 0.2, role: "LM" },
    { x: 0.28, y: 0.5, role: "CM" },
    { x: 0.28, y: 0.8, role: "RM" },
    { x: 0.41, y: 0.5, role: "ST" },
  ],
  9: [
    { x: 0.04, y: 0.5, role: "GK" },
    { x: 0.14, y: 0.2, role: "LB" },
    { x: 0.14, y: 0.5, role: "CB" },
    { x: 0.14, y: 0.8, role: "RB" },
    { x: 0.26, y: 0.2, role: "LM" },
    { x: 0.26, y: 0.5, role: "CM" },
    { x: 0.26, y: 0.8, role: "RM" },
    { x: 0.4, y: 0.36, role: "ST" },
    { x: 0.4, y: 0.64, role: "ST" },
  ],
  10: [
    { x: 0.03, y: 0.5, role: "GK" },
    { x: 0.13, y: 0.16, role: "LB" },
    { x: 0.13, y: 0.38, role: "CB" },
    { x: 0.13, y: 0.62, role: "CB" },
    { x: 0.13, y: 0.84, role: "RB" },
    { x: 0.26, y: 0.25, role: "LM" },
    { x: 0.26, y: 0.5, role: "CM" },
    { x: 0.26, y: 0.75, role: "RM" },
    { x: 0.4, y: 0.36, role: "ST" },
    { x: 0.4, y: 0.64, role: "ST" },
  ],
  11: [
    { x: 0.03, y: 0.5, role: "GK" },
    { x: 0.13, y: 0.14, role: "LB" },
    { x: 0.13, y: 0.38, role: "CB" },
    { x: 0.13, y: 0.62, role: "CB" },
    { x: 0.13, y: 0.86, role: "RB" },
    { x: 0.26, y: 0.14, role: "LM" },
    { x: 0.26, y: 0.38, role: "CM" },
    { x: 0.26, y: 0.62, role: "CM" },
    { x: 0.26, y: 0.86, role: "RM" },
    { x: 0.4, y: 0.38, role: "ST" },
    { x: 0.4, y: 0.62, role: "ST" },
  ],
};

const DESCRIPTIONS: Record<number, string> = {
  5: "Вратарь + 2 защ + 2 ПЗ. Роли условные, разбираетесь по ходу",
  6: "Самый популярный. Вр + ЦЗ + 2 КЗ + ЦПЗ + нападающий",
  7: "6×6 + ещё один центральный полузащитник",
  8: "Вр + 3 защ + 3 ПЗ + 1 нападающий",
  9: "8×8 + второй нападающий",
  10: "Вр + 4 защ + 3 ПЗ + 2 нападающих",
  11: "Классика 4-4-2",
};

const ROLE_COLOR: Record<string, string> = {
  GK: "bg-amber-500",
  CB: "bg-blue-600",
  LB: "bg-blue-600",
  RB: "bg-blue-600",
  DF: "bg-blue-600",
  CM: "bg-emerald-600",
  LM: "bg-emerald-600",
  RM: "bg-emerald-600",
  MF: "bg-emerald-600",
  LW: "bg-rose-600",
  RW: "bg-rose-600",
  ST: "bg-rose-600",
};

export function FormationPreview({ size, sport }: { size: number; sport?: string }) {
  if (sport && sport !== "Футбол") return null;
  const slots = FORMATIONS_A[size];
  const desc = DESCRIPTIONS[size];

  if (!slots) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
        Для {size} игроков схема пока не задана. На драфте будет автоматическая раскладка.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Схема команды · {size} игроков
        </p>
        <span className="font-mono text-[10px] text-muted-foreground">A vs B</span>
      </div>

      <div
        className="relative h-32 w-full overflow-hidden rounded-lg sm:h-36"
        style={{
          background: "linear-gradient(90deg, #15803d, #16a34a 50%, #15803d)",
        }}
      >
        <div className="absolute inset-1 rounded-sm border-[1.5px] border-white/70" />
        <div className="absolute top-1 bottom-1 left-1/2 w-px -translate-x-1/2 bg-white/70" />
        <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white/70" />

        {/* Команда A — левая половина (x умножаем на 50%, потому что показываем
            только левую часть в виде квадрата под всё поле, тут поле 0..100%)
            На самом деле x уже в координатах целого поля (0..1), используем как есть. */}
        {slots.map((s, i) => {
          const cls = ROLE_COLOR[s.role] ?? "bg-blue-600";
          return (
            <div
              key={`A${i}`}
              className={`absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[8px] font-bold text-white ring-1 ring-white/80 ${cls}`}
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
              title={s.role}
            >
              {s.role}
            </div>
          );
        })}

        {/* Команда B — зеркало по x. Поблеклые, чтобы внимание было на A. */}
        {slots.map((s, i) => {
          const cls = ROLE_COLOR[s.role] ?? "bg-rose-600";
          return (
            <div
              key={`B${i}`}
              className={`absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[8px] font-bold text-white opacity-50 ring-1 ring-white/80 ${cls}`}
              style={{ left: `${(1 - s.x) * 100}%`, top: `${s.y * 100}%` }}
              title={`${s.role} (B)`}
            >
              {s.role}
            </div>
          );
        })}
      </div>

      {desc && (
        <p className="mt-2 text-center text-[11px] leading-tight text-muted-foreground">{desc}</p>
      )}
    </div>
  );
}
