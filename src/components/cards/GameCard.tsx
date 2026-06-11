import { Link } from "@tanstack/react-router";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Game } from "@/data/mock";

export function GameCard({ game }: { game: Game }) {
  const full = game.slotsTaken >= game.slotsTotal;
  const pct = Math.round((game.slotsTaken / game.slotsTotal) * 100);
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 ease-smooth hover:-translate-y-1 hover:shadow-elegant">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-orb opacity-20 blur-2xl transition-opacity group-hover:opacity-40" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold leading-tight">
              {game.stadiumName}
            </h3>
            <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="min-w-0">{game.address}</span>
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 bg-accent text-accent-foreground">
          {game.sport}
        </Badge>
      </div>

      {/* items-start + shrink-0 на иконках: при переносе текста на узких
          экранах иконка остаётся у первой строки, а не «плывёт» по центру. */}
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0">
            {game.date}, {game.timeStart}–{game.timeEnd}
          </span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0">
            {game.slotsTaken}/{game.slotsTotal} · {game.level}
          </span>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">за игрока</p>
          <p className="font-display text-xl font-bold">{game.pricePerPlayer} ₽</p>
        </div>
        <Button
          asChild
          disabled={full}
          className="bg-gradient-brand text-primary-foreground hover:opacity-90"
        >
          <Link to="/games/$gameId" params={{ gameId: game.id }}>
            {full ? "Мест нет" : "Записаться"}
          </Link>
        </Button>
      </div>
    </article>
  );
}
