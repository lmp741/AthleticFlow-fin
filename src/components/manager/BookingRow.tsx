import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fmtMoney,
  fmtRange,
  SOURCE_LABEL,
  type ManagerBooking,
} from "@/components/manager/manager-data";

export const initials = (name?: string | null) =>
  (name ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function BookingRow({ b, onCancel }: { b: ManagerBooking; onCancel?: () => void }) {
  const name =
    b.source === "game"
      ? b.organizer_name ?? "Игрок"
      : b.source === "external"
        ? b.external_name ?? "Внешний клиент"
        : "Техобслуживание";
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={b.organizer_avatar ?? undefined} />
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{name}</p>
            <Badge variant={b.source === "maintenance" ? "destructive" : "secondary"}>
              {SOURCE_LABEL[b.source]}
            </Badge>
            {b.status === "cancelled" && <Badge variant="outline">Отменена</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {fmtRange(b.starts_at, b.ends_at)} · {b.venue_name}
            {b.size_label && ` (${b.size_label})`}
          </p>
          <p className="text-xs text-muted-foreground">
            {b.source === "game" &&
              b.game_slots_total != null &&
              `${b.game_participants ?? 0}/${b.game_slots_total} чел. · ${b.game_sport ?? ""} · `}
            {b.source === "external" && b.external_phone && `${b.external_phone} · `}
            {fmtMoney(b.price_total)}
          </p>
          {b.source === "game" && b.game_slots_total != null && (
            <p className="text-xs">
              {(b.game_paid_count ?? 0) >= (b.game_participants ?? 0) && (b.game_participants ?? 0) > 0 ? (
                <span className="font-medium text-emerald-600">
                  Оплачено: {b.game_paid_count}/{b.game_participants}
                </span>
              ) : (
                <span className="font-medium text-amber-600">
                  Оплачено: {b.game_paid_count ?? 0}/{b.game_participants ?? 0}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* DM организатору: RLS пускает менеджера без дружбы (has_manager_relation). */}
        {b.source === "game" && b.organizer_id && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/friends/$friendId" params={{ friendId: b.organizer_id }}>
              <MessageCircle className="mr-1 h-4 w-4" /> Написать
            </Link>
          </Button>
        )}
        {onCancel && b.status === "confirmed" && (
          <Button size="sm" variant="outline" onClick={onCancel}>
            {b.source === "game" ? "Отменить игру" : "Отменить"}
          </Button>
        )}
      </div>
    </div>
  );
}
