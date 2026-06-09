import { createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// Типы данных админки менеджера. Контрактные таблицы могут
// отсутствовать в сгенерённых types.ts — поэтому свои типы здесь.
// ============================================================

export type ManagerStadium = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  cover_url: string | null;
};

export type ManagerSizeOption = {
  id: string;
  venue_id: string;
  size_code: string;
  label: string;
  price_per_hour: number;
  parallel_count: number;
  sort_order: number;
  active: boolean;
};

export type ManagerVenue = {
  id: string;
  name: string;
  sports: string[];
  size_width: number | null;
  size_length: number | null;
  active: boolean;
  sort_order: number;
  size_options: ManagerSizeOption[];
};

/** Строка из RPC manager_list_bookings. */
export type ManagerBooking = {
  booking_id: string;
  venue_id: string;
  venue_name: string;
  size_label: string | null;
  starts_at: string;
  ends_at: string;
  source: "game" | "external" | "maintenance";
  status: "confirmed" | "cancelled" | "pending";
  price_total: number | null;
  external_name: string | null;
  external_phone: string | null;
  external_notes: string | null;
  game_id: string | null;
  game_sport: string | null;
  game_level: string | null;
  game_slots_total: number | null;
  game_participants: number | null;
  game_paid_count: number | null;
  organizer_id: string | null;
  organizer_name: string | null;
  organizer_avatar: string | null;
};

export type ManagerSeries = {
  id: string;
  organizer_id: string;
  venue_id: string;
  size_option_id: string;
  dates: string[];
  start_time: string;
  end_time: string;
  sport: string;
  level: string;
  slots_total: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  notes: string | null;
  created_at: string;
};

// ============================================================
// Контекст: стадион менеджера + площадки. Заполняется в manager.tsx.
// ============================================================

export type ManagerCtx = {
  stadium: ManagerStadium;
  venues: ManagerVenue[];
  reload: () => Promise<void>;
};

export const ManagerContext = createContext<ManagerCtx | null>(null);

export function useManager(): ManagerCtx {
  const ctx = useContext(ManagerContext);
  if (!ctx) throw new Error("useManager outside /manager layout");
  return ctx;
}

// ============================================================
// Запросы
// ============================================================

export async function fetchManagerBookings(
  fromISO: string,
  toISO: string,
  includeCancelled = false,
): Promise<ManagerBooking[]> {
  const { data, error } = await supabase.rpc("manager_list_bookings", {
    p_from: fromISO,
    p_to: toISO,
    p_include_cancelled: includeCancelled,
  });
  if (error) throw error;
  return (data ?? []) as ManagerBooking[];
}

// ============================================================
// Форматирование
// ============================================================

const nf = new Intl.NumberFormat("ru-RU");

export function fmtMoney(v: number | null | undefined): string {
  return v == null ? "—" : `${nf.format(v)} ₽`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function fmtRange(startISO: string, endISO: string): string {
  return `${fmtDate(startISO)} ${fmtTime(startISO)}–${fmtTime(endISO)}`;
}

/** YYYY-MM-DD локальной даты (без UTC-сдвигов). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const SOURCE_LABEL: Record<ManagerBooking["source"], string> = {
  game: "Игра",
  external: "Внешняя",
  maintenance: "Тех. работы",
};
