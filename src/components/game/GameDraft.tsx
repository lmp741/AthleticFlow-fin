import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Loader2, RotateCcw, Trophy, Users, Zap, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// =============== Типы ===============

// Profile shape as it comes from useEffect.loadParticipants on the parent.
export interface DraftParticipant {
  user_id: string;
  paid: boolean;
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface DraftSlot {
  id: string;
  team: "A" | "B";
  x: number; // 0..1
  y: number; // 0..1
  player_id: string | null;
}

interface DraftRow {
  game_id: string;
  status: "pending" | "active" | "completed" | "cancelled";
  proposed_by: string | null;
  approved_by: string[];
  slots: DraftSlot[];
  turn_team: "A" | "B" | null;
  formation_size: number;
  started_at: string | null;
  completed_at: string | null;
}

interface CaptainRow {
  team: "A" | "B";
  user_id: string;
}

// Внутренние координаты «логического» поля. Реальный размер берётся из контейнера.
const PITCH_W = 720;
const PITCH_H = 320;

// Хелпер: инициал из имени.
function initial(p: DraftParticipant | undefined | null): string {
  if (!p) return "?";
  const s = p.profile?.display_name ?? p.profile?.username ?? "?";
  return s.slice(0, 1).toUpperCase();
}

function displayName(p: DraftParticipant | undefined | null): string {
  if (!p) return "Игрок";
  return p.profile?.display_name ?? p.profile?.username ?? "Игрок";
}

// =============== Главный компонент ===============

export function GameDraft({
  gameId,
  currentUserId,
  isOrganizer,
  participants,
  slotsTotal,
  allPaid,
  isArchived,
  gameStarted,
  onStatusChange,
}: {
  gameId: string;
  currentUserId: string | null;
  isOrganizer: boolean;
  participants: DraftParticipant[];
  slotsTotal: number;
  allPaid: boolean;
  isArchived: boolean;
  gameStarted: boolean;
  onStatusChange?: (status: "pending" | "active" | "completed" | "cancelled" | null) => void;
}) {
  const [draft, setDraft] = useState<DraftRow | null>(null);
  const [captains, setCaptains] = useState<CaptainRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // ---- 1) Подгрузка начальных данных ----
  const load = useCallback(async () => {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("game_drafts").select("*").eq("game_id", gameId).maybeSingle(),
      supabase.from("game_captains").select("team, user_id").eq("game_id", gameId),
    ]);
    const row = (d as DraftRow | null) ?? null;
    setDraft(row);
    setCaptains(((c as CaptainRow[]) ?? []));
    // Уведомляем родителя о смене статуса — без этого блок «Команда» не флипнется
    // в режим поля, пока пользователь не обновит страницу.
    onStatusChange?.(row?.status ?? null);
  }, [gameId, onStatusChange]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- 2) Realtime подписка на драфт + капитанов ----
  useEffect(() => {
    const ch = supabase
      .channel(`draft-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_drafts", filter: `game_id=eq.${gameId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_captains", filter: `game_id=eq.${gameId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId, load]);

  // ---- Вспомогательные вычисления ----
  const capA = captains.find((c) => c.team === "A") ?? null;
  const capB = captains.find((c) => c.team === "B") ?? null;
  const isCapA = !!currentUserId && capA?.user_id === currentUserId;
  const isCapB = !!currentUserId && capB?.user_id === currentUserId;
  const myTeam: "A" | "B" | null = isCapA ? "A" : isCapB ? "B" : null;
  const canPropose = isOrganizer || isCapA || isCapB;

  const participantById = useMemo(() => {
    const m = new Map<string, DraftParticipant>();
    participants.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [participants]);

  // ---- Действия ----
  // ВАЖНО: после каждого RPC явно дёргаем load(), не доверяя только realtime.
  // Realtime publication может быть отключён в Supabase Dashboard, и тогда подписка
  // молчит. Оптимистичный re-fetch — гарант что UI обновится сразу после клика.
  const propose = async (force: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("propose_draft", { p_game_id: gameId, p_force: force });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Предложение отправлено — ждём подтверждения");
    load();
  };

  const accept = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_draft", { p_game_id: gameId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const allIn = (data as { all_in?: boolean } | null)?.all_in;
    if (allIn) toast.success("Драфт начался!");
    else toast.info("Подтвердил. Ждём остальных.");
    load();
  };

  const cancel = async () => {
    if (!confirm("Сбросить драфт? Все расставленные пики удалятся.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("cancel_draft", { p_game_id: gameId });
    setBusy(false);
    if (error) toast.error(error.message);
    load();
  };

  // ---- Рендер по фазам ----

  // Игра уже архивная — компонент драфта прячется (есть свой summary).
  if (isArchived) return null;

  // Игра ещё не созрела для драфта.
  // Раньше — показывали блок только когда allPaid && !gameStarted, но
  // оставим всегда видимыми инструменты админа (назначение кэпов) + тест-кнопку.

  const phase: "idle" | "pending" | "active" | "completed" =
    !draft || draft.status === "cancelled"
      ? "idle"
      : (draft.status as "pending" | "active" | "completed");

  return (
    <div className="rounded-3xl border border-border bg-card shadow-card overflow-hidden">
      {/* === IDLE: до старта === */}
      {phase === "idle" && (
        <IdleHeader
          isOrganizer={isOrganizer}
          canPropose={canPropose}
          allPaid={allPaid}
          gameStarted={gameStarted}
          capA={capA && participantById.get(capA.user_id)}
          capB={capB && participantById.get(capB.user_id)}
          onAssign={() => setAssignOpen(true)}
          onPropose={() => propose(false)}
          busy={busy}
        />
      )}

      {/* === PENDING: ждём подтверждений === */}
      {phase === "pending" && draft && (
        <PendingHeader
          draft={draft}
          capA={capA}
          capB={capB}
          isOrganizer={isOrganizer}
          currentUserId={currentUserId}
          participantById={participantById}
          onAccept={accept}
          onCancel={cancel}
          busy={busy}
        />
      )}

      {/* === ACTIVE / COMPLETED: поле === */}
      {(phase === "active" || phase === "completed") && draft && (
        <DraftBoard
          draft={draft}
          participants={participants}
          participantById={participantById}
          myTeam={myTeam}
          capA={capA}
          capB={capB}
          isOrganizer={isOrganizer}
          onCancel={cancel}
          busy={busy}
          gameId={gameId}
          onChanged={load}
        />
      )}

      <AssignCaptainsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        gameId={gameId}
        participants={participants}
        currentCapA={capA?.user_id ?? null}
        currentCapB={capB?.user_id ?? null}
        onSaved={load}
      />
    </div>
  );
}

// =============== Idle: до старта ===============

function IdleHeader({
  isOrganizer,
  canPropose,
  allPaid,
  gameStarted,
  capA,
  capB,
  onAssign,
  onPropose,
  busy,
}: {
  isOrganizer: boolean;
  canPropose: boolean;
  allPaid: boolean;
  gameStarted: boolean;
  capA: DraftParticipant | null | undefined;
  capB: DraftParticipant | null | undefined;
  onAssign: () => void;
  onPropose: () => void;
  busy: boolean;
}) {
  // Условия для старта в боевом режиме: все оплатили + оба кэпа назначены + игра ещё не идёт.
  const ready = allPaid && capA && capB && !gameStarted;
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold sm:text-xl">Расстановка состава</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Когда все оплатят, два капитана по очереди расставят игроков на поле.
          </p>
        </div>
        <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
      </div>

      {/* Капитаны */}
      <div className="grid gap-2 sm:grid-cols-2">
        <CaptainSlot label="Капитан A" color="blue" cap={capA} />
        <CaptainSlot label="Капитан B" color="red" cap={capB} />
      </div>

      {isOrganizer && (
        <Button variant="outline" size="sm" onClick={onAssign} className="w-full">
          <Crown className="mr-1 h-3.5 w-3.5" /> {capA || capB ? "Изменить капитанов" : "Назначить капитанов"}
        </Button>
      )}

      {/* Условия / CTA */}
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs">
        <p className="flex items-center gap-2">
          <span className={allPaid ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
            {allPaid ? <Check className="inline h-3 w-3" /> : <span className="inline-block h-3 w-3" />}
          </span>
          Все участники оплатили
        </p>
        <p className="mt-1 flex items-center gap-2">
          <span className={capA && capB ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
            {capA && capB ? <Check className="inline h-3 w-3" /> : <span className="inline-block h-3 w-3" />}
          </span>
          Назначены оба капитана
        </p>
      </div>

      {canPropose && (
        <Button
          onClick={onPropose}
          disabled={!ready || busy}
          size="lg"
          className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Начать расстановку"}
        </Button>
      )}
    </div>
  );
}

function CaptainSlot({
  label,
  color,
  cap,
}: {
  label: string;
  color: "blue" | "red";
  cap: DraftParticipant | null | undefined;
}) {
  const ring = color === "blue" ? "border-blue-500/40 bg-blue-500/5" : "border-rose-500/40 bg-rose-500/5";
  const txt = color === "blue" ? "text-blue-700 dark:text-blue-300" : "text-rose-700 dark:text-rose-300";
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-2.5 ${cap ? ring : "border-dashed border-border bg-background"}`}>
      <Avatar className="h-9 w-9">
        {cap?.profile?.avatar_url ? <AvatarImage src={cap.profile.avatar_url} /> : null}
        <AvatarFallback className={`text-xs ${cap ? "" : "bg-muted"}`}>{initial(cap)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${txt}`}>{label}</p>
        <p className="truncate text-sm font-semibold">{cap ? displayName(cap) : "Не назначен"}</p>
      </div>
    </div>
  );
}

// =============== Pending: ждём аппрува ===============

function PendingHeader({
  draft,
  capA,
  capB,
  isOrganizer,
  currentUserId,
  participantById,
  onAccept,
  onCancel,
  busy,
}: {
  draft: DraftRow;
  capA: CaptainRow | null;
  capB: CaptainRow | null;
  isOrganizer: boolean;
  currentUserId: string | null;
  participantById: Map<string, DraftParticipant>;
  onAccept: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const requiredUserIds = new Set<string>([capA?.user_id, capB?.user_id].filter(Boolean) as string[]);
  // proposed_by — он тоже organizer/captain; считаем что он approved.
  const alreadyApproved = new Set(draft.approved_by);
  const iApproved = currentUserId ? alreadyApproved.has(currentUserId) : false;
  const proposer = draft.proposed_by ? participantById.get(draft.proposed_by) : null;
  const proposerName = proposer ? displayName(proposer) : "Кто-то";

  const showAccept = currentUserId && (isOrganizer || requiredUserIds.has(currentUserId)) && !iApproved;
  return (
    <div className="space-y-3 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <h2 className="font-display text-lg font-bold sm:text-xl">Подтверди старт драфта</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        <b>{proposerName}</b> предлагает начать расстановку состава ({draft.formation_size}×{draft.formation_size}). Нужны подтверждения от обоих капитанов и админа.
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        {Array.from(requiredUserIds).map((uid) => {
          const ok = alreadyApproved.has(uid);
          const p = participantById.get(uid);
          return (
            <span
              key={uid}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
                ok ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
              }`}
            >
              {ok ? <Check className="h-3 w-3" /> : <span className="inline-block h-3 w-3 rounded-full border border-current" />}
              {displayName(p)}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {showAccept && (
          <Button onClick={onAccept} disabled={busy} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
            <Check className="mr-1 h-4 w-4" /> Подтвердить старт
          </Button>
        )}
        {isOrganizer && (
          <Button onClick={onCancel} disabled={busy} variant="outline">
            <X className="mr-1 h-4 w-4" /> Отменить
          </Button>
        )}
      </div>
    </div>
  );
}

// =============== Active board: поле ===============

function DraftBoard({
  draft,
  participants,
  participantById,
  myTeam,
  capA,
  capB,
  isOrganizer,
  onCancel,
  busy,
  gameId,
  onChanged,
}: {
  draft: DraftRow;
  participants: DraftParticipant[];
  participantById: Map<string, DraftParticipant>;
  myTeam: "A" | "B" | null;
  capA: CaptainRow | null;
  capB: CaptainRow | null;
  isOrganizer: boolean;
  onCancel: () => void;
  busy: boolean;
  gameId: string;
  onChanged?: () => void;
}) {
  // Драг-н-дроп: «активный игрок» = тот, кого тянем.
  const [drag, setDrag] = useState<{ playerId: string; x: number; y: number } | null>(null);
  // Дев-режим (только для админа): drag разрешён даже если не мой ход или не моя команда.
  // RPC force_pick_slot обходит проверку turn_team на сервере.
  const [forceMode, setForceMode] = useState(false);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pitchRef = useRef<HTMLDivElement | null>(null);
  const camRef = useRef<HTMLDivElement | null>(null);

  // Мобильная камера.
  const [cw, setCw] = useState(0);
  useEffect(() => {
    if (!camRef.current) return;
    const ro = new ResizeObserver((e) => setCw(e[0].contentRect.width));
    ro.observe(camRef.current);
    return () => ro.disconnect();
  }, []);
  const isMobile = cw > 0 && cw < 640;
  const [overview, setOverview] = useState(false);
  // На мобиле показываем половину активной команды (моей или текущего хода).
  const focusTeam = myTeam ?? draft.turn_team ?? "A";
  const viewW = isMobile && !overview ? PITCH_W / 2 : PITCH_W;
  const scale = cw > 0 ? cw / viewW : 1;
  const fieldH = PITCH_H * scale;
  const panX = isMobile && !overview && focusTeam === "B" ? -(PITCH_W / 2) * scale : 0;

  // Кого можно тащить: я кэп и сейчас мой ход, ЛИБО force-режим у админа.
  const myTurn = myTeam !== null && draft.turn_team === myTeam && draft.status === "active";
  const canDrag = (myTurn || (forceMode && isOrganizer)) && draft.status === "active";

  // Игроки на скамейке = участники, которых ещё нет в slots.
  const placedIds = new Set(draft.slots.map((s) => s.player_id).filter(Boolean) as string[]);
  const bench = participants.filter((p) => !placedIds.has(p.user_id));

  // Drop: к ближайшему свободному слоту любой команды (в force-режиме) или своей.
  const onPlayerDrop = useCallback(
    async (playerId: string, x: number, y: number) => {
      if (!canDrag) return;
      let best: DraftSlot | null = null;
      let bestD = Infinity;
      draft.slots.forEach((s) => {
        if (s.player_id) return;
        // В обычном режиме — только своя команда. В force-режиме — любая.
        if (!forceMode && s.team !== myTeam) return;
        const el = slotRefs.current[s.id];
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      });
      if (!best || bestD > 80) return;
      // В force-режиме зовём force_pick_slot (организатор может тыкать любой
      // слот), в обычном — стандартный pick_slot с проверкой turn.
      const rpc = forceMode ? "force_pick_slot" : "pick_slot";
      const { error } = await supabase.rpc(rpc, {
        p_game_id: gameId,
        p_slot_id: best.id,
        p_player_id: playerId,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      onChanged?.();
    },
    [draft.slots, gameId, myTeam, canDrag, forceMode, onChanged],
  );

  const unpick = async (slotId: string) => {
    if (!myTeam) return;
    const slot = draft.slots.find((s) => s.id === slotId);
    if (!slot || slot.team !== myTeam || !slot.player_id) return;
    const { error } = await supabase.rpc("unpick_slot", { p_game_id: gameId, p_slot_id: slotId });
    if (error) {
      toast.error(error.message);
      return;
    }
    onChanged?.();
  };

  // Стартуем перетаскивание (pointer events работают и на тач, и на мыши).
  const startDrag = (playerId: string, e: React.PointerEvent) => {
    if (!canDrag) return;
    e.preventDefault();
    const move = (ev: PointerEvent) => setDrag({ playerId, x: ev.clientX, y: ev.clientY });
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onPlayerDrop(playerId, ev.clientX, ev.clientY);
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    setDrag({ playerId, x: e.clientX, y: e.clientY });
  };

  const filledA = draft.slots.filter((s) => s.team === "A" && s.player_id).length;
  const filledB = draft.slots.filter((s) => s.team === "B" && s.player_id).length;
  const totalPerTeam = draft.formation_size;

  return (
    <div className="space-y-0">
      {/* Шапка — табы капитанов + чей ход */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
        <CaptainTab
          color="blue"
          active={draft.turn_team === "A"}
          isMe={myTeam === "A"}
          label={`A · ${filledA}/${totalPerTeam}`}
          name={capA ? displayName(participantById.get(capA.user_id)) : "—"}
        />
        <CaptainTab
          color="red"
          active={draft.turn_team === "B"}
          isMe={myTeam === "B"}
          label={`B · ${filledB}/${totalPerTeam}`}
          name={capB ? displayName(participantById.get(capB.user_id)) : "—"}
        />
        <span className="flex-1" />
        {isMobile && (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setOverview((v) => !v)}>
            {overview ? "Половина" : "Обзор"}
          </Button>
        )}
        {isOrganizer && draft.status === "active" && (
          <button
            type="button"
            onClick={() => setForceMode((v) => !v)}
            className={`h-7 rounded-full border px-2 text-[10px] font-bold uppercase tracking-wider transition ${
              forceMode
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
            title="Дев-режим: тащи игроков за обе команды"
          >
            <Zap className="mr-0.5 inline h-3 w-3" /> Force
          </button>
        )}
        {isOrganizer && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onCancel} disabled={busy}>
            <RotateCcw className="mr-1 h-3 w-3" /> Сбросить
          </Button>
        )}
      </div>

      {/* Чей ход / готово / force-режим */}
      <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-center text-xs sm:px-4">
        {forceMode ? (
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            <Zap className="mr-1 inline h-3 w-3" /> Force-режим: ты тащишь за обе команды
          </span>
        ) : draft.status === "completed" ? (
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="mr-1 inline h-3 w-3" /> Расстановка завершена
          </span>
        ) : myTurn ? (
          <span className="font-semibold text-primary">Твой ход — перетащи игрока на точку</span>
        ) : (
          <span className="text-muted-foreground">
            Ход капитана {draft.turn_team === "A" ? "A" : "B"}
          </span>
        )}
      </div>

      {/* Камера → поле */}
      <div ref={camRef} className="relative overflow-hidden bg-[#0b3d22]" style={{ height: fieldH || 200 }}>
        <div
          ref={pitchRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: PITCH_W,
            height: PITCH_H,
            transform: `translateX(${panX}px) scale(${scale})`,
            transition: "transform .55s cubic-bezier(.65,0,.35,1)",
            background: "linear-gradient(90deg,#15803d, #16a34a 50%, #15803d)",
          }}
        >
          <PitchMarkings dimmedSide={isMobile && !overview ? (focusTeam === "A" ? "B" : "A") : null} />
          {draft.slots.map((s) => {
            const left = s.x * PITCH_W;
            const top = s.y * PITCH_H;
            const droppable = !!drag && (forceMode || s.team === myTeam) && !s.player_id;
            const player = s.player_id ? participantById.get(s.player_id) : null;
            return (
              <div
                key={s.id}
                ref={(el) => {
                  slotRefs.current[s.id] = el;
                }}
                onClick={() => player && (forceMode || s.team === myTeam) && unpick(s.id)}
                className="absolute flex items-center justify-center rounded-full transition-shadow"
                style={{
                  left,
                  top,
                  width: 38,
                  height: 38,
                  transform: "translate(-50%,-50%)",
                  border: player ? "none" : `2px dashed ${s.team === "A" ? "#93c5fd" : "#fca5a5"}`,
                  background: player ? "transparent" : "rgba(255,255,255,.12)",
                  boxShadow: droppable
                    ? `0 0 0 4px ${s.team === "A" ? "rgba(37,99,235,.5)" : "rgba(220,38,38,.5)"}`
                    : "none",
                  opacity: s.team === focusTeam || overview || !isMobile ? 1 : 0.4,
                  cursor: player && s.team === myTeam ? "pointer" : "default",
                }}
              >
                {player && (
                  <Avatar className="h-9 w-9 ring-2 ring-white/90">
                    {player.profile?.avatar_url ? <AvatarImage src={player.profile.avatar_url} /> : null}
                    <AvatarFallback className="bg-gradient-brand text-xs font-bold text-primary-foreground">
                      {initial(player)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Скамейка */}
      <div className="border-t border-border bg-muted/30 px-3 py-3 sm:px-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Users className="mr-1 inline h-3 w-3" /> Скамейка
          </p>
          {canDrag && (
            <p className="text-[10px] text-muted-foreground">
              {forceMode
                ? "force: тащи в любую точку"
                : `перетащи на половину «${myTeam === "A" ? "Команды A" : "Команды B"}»`}
            </p>
          )}
        </div>
        <div className="-mx-1 flex gap-3 overflow-x-auto pb-1">
          {bench.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">Все расставлены</p>
          ) : (
            bench.map((p) => (
              <div
                key={p.user_id}
                onPointerDown={(e) => startDrag(p.user_id, e)}
                className={`flex shrink-0 flex-col items-center gap-1 px-1 ${
                  canDrag ? "cursor-grab" : "cursor-default opacity-70"
                }`}
                style={{ touchAction: "none" }}
              >
                <Avatar className={`h-12 w-12 ring-2 ${drag?.playerId === p.user_id ? "ring-primary opacity-40" : "ring-white/0"}`}>
                  {p.profile?.avatar_url ? <AvatarImage src={p.profile.avatar_url} /> : null}
                  <AvatarFallback className="bg-gradient-brand text-sm font-bold text-primary-foreground">
                    {initial(p)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[64px] truncate text-[10px] font-semibold text-foreground">
                  {displayName(p)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Призрак перетаскивания — плавает за курсором */}
      {drag && (
        <div
          className="pointer-events-none fixed z-[60]"
          style={{ left: drag.x, top: drag.y, transform: "translate(-50%,-50%)" }}
        >
          <Avatar className="h-12 w-12 ring-2 ring-primary shadow-lg">
            {(() => {
              const p = participantById.get(drag.playerId);
              return p?.profile?.avatar_url ? <AvatarImage src={p.profile.avatar_url} /> : null;
            })()}
            <AvatarFallback className="bg-gradient-brand text-sm font-bold text-primary-foreground">
              {initial(participantById.get(drag.playerId))}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}

function CaptainTab({
  color,
  active,
  isMe,
  label,
  name,
}: {
  color: "blue" | "red";
  active: boolean;
  isMe: boolean;
  label: string;
  name: string;
}) {
  const baseTxt = color === "blue" ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400";
  const baseBg = color === "blue" ? "bg-blue-600" : "bg-rose-600";
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
        active ? `${baseBg} text-white` : `border border-current bg-transparent ${baseTxt}`
      }`}
    >
      {isMe && <Crown className="h-3 w-3" />}
      <span>{label}</span>
      <span className={`hidden sm:inline ${active ? "text-white/80" : "text-muted-foreground"}`}>· {name}</span>
    </div>
  );
}

function PitchMarkings({ dimmedSide }: { dimmedSide: "A" | "B" | null }) {
  return (
    <>
      {dimmedSide && (
        <div
          className="absolute top-0 bottom-0"
          style={{
            [dimmedSide === "A" ? "left" : "right"]: 0,
            width: PITCH_W / 2,
            background: "rgba(0,0,0,.18)",
          }}
        />
      )}
      <div className="absolute inset-2 rounded-sm border-[2px] border-white/70" />
      <div
        className="absolute top-2 bottom-2 bg-white/70"
        style={{ left: PITCH_W / 2 - 1, width: 2 }}
      />
      <div
        className="absolute rounded-full border-[2px] border-white/70"
        style={{
          left: PITCH_W / 2 - 35,
          top: PITCH_H / 2 - 35,
          width: 70,
          height: 70,
        }}
      />
      <div
        className="absolute border-[2px] border-white/60"
        style={{ left: 8, top: PITCH_H / 2 - 60, width: 80, height: 120 }}
      />
      <div
        className="absolute border-[2px] border-white/60"
        style={{ right: 8, top: PITCH_H / 2 - 60, width: 80, height: 120 }}
      />
    </>
  );
}

// =============== Назначение капитанов ===============

function AssignCaptainsDialog({
  open,
  onOpenChange,
  gameId,
  participants,
  currentCapA,
  currentCapB,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  gameId: string;
  participants: DraftParticipant[];
  currentCapA: string | null;
  currentCapB: string | null;
  onSaved?: () => void;
}) {
  const [a, setA] = useState<string | null>(currentCapA);
  const [b, setB] = useState<string | null>(currentCapB);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setA(currentCapA);
    setB(currentCapB);
  }, [currentCapA, currentCapB, open]);

  const save = async () => {
    setBusy(true);
    if (a !== currentCapA) {
      const { error } = await supabase.rpc("set_captain", { p_game_id: gameId, p_team: "A", p_user_id: a });
      if (error) {
        setBusy(false);
        toast.error("Кэп A: " + error.message);
        return;
      }
    }
    if (b !== currentCapB) {
      const { error } = await supabase.rpc("set_captain", { p_game_id: gameId, p_team: "B", p_user_id: b });
      if (error) {
        setBusy(false);
        toast.error("Кэп B: " + error.message);
        return;
      }
    }
    setBusy(false);
    toast.success("Капитаны сохранены");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Капитаны команд</DialogTitle>
          <DialogDescription>
            Один игрок не может быть кэпом обеих команд. Кэпы расставят игроков по очереди.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <CaptainPicker
            label="Капитан A (синие)"
            color="blue"
            value={a}
            otherValue={b}
            onChange={setA}
            participants={participants}
          />
          <CaptainPicker
            label="Капитан B (красные)"
            color="red"
            value={b}
            otherValue={a}
            onChange={setB}
            participants={participants}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Отмена
          </Button>
          <Button onClick={save} disabled={busy} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CaptainPicker({
  label,
  color,
  value,
  otherValue,
  onChange,
  participants,
}: {
  label: string;
  color: "blue" | "red";
  value: string | null;
  otherValue: string | null;
  onChange: (v: string | null) => void;
  participants: DraftParticipant[];
}) {
  return (
    <div>
      <p className={`mb-1 text-[11px] font-bold uppercase tracking-wider ${color === "blue" ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
        {label}
      </p>
      <div className="max-h-44 overflow-y-auto rounded-xl border border-border">
        <ul>
          <li>
            <button
              type="button"
              onClick={() => onChange(null)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/40 ${
                value === null ? "bg-muted font-semibold" : ""
              }`}
            >
              <span>— не назначен —</span>
              {value === null && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          </li>
          {participants.map((p) => {
            const isOther = otherValue === p.user_id;
            return (
              <li key={p.user_id}>
                <button
                  type="button"
                  disabled={isOther}
                  onClick={() => onChange(p.user_id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40 disabled:opacity-40 ${
                    value === p.user_id ? "bg-muted font-semibold" : ""
                  }`}
                >
                  <Avatar className="h-7 w-7">
                    {p.profile?.avatar_url ? <AvatarImage src={p.profile.avatar_url} /> : null}
                    <AvatarFallback className="text-[10px]">{initial(p)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{displayName(p)}</span>
                  {value === p.user_id && <Check className="h-3.5 w-3.5 text-primary" />}
                  {isOther && <span className="text-[10px] text-muted-foreground">занят</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

