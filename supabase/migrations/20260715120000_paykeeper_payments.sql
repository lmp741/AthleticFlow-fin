-- PayKeeper: история платежей + защита колонки game_participants.paid.
--
-- Идея: галку "оплачено" (game_participants.paid) имеет право выставить ТОЛЬКО
-- платёжный webhook (ходит под ролью service_role) или внутренние SECURITY DEFINER
-- функции (роль-владелец postgres). Клиент (authenticated/anon) — не может.
--
-- orderid, который мы отдаём в PayKeeper = game_payments.id. По нему в callback
-- находим, кто и за что заплатил.

BEGIN;

CREATE TABLE IF NOT EXISTS public.game_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_id  uuid REFERENCES public.game_participants(id) ON DELETE SET NULL,
  amount          integer NOT NULL CHECK (amount >= 0),   -- рубли, целые
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','failed')),
  pk_payment_id   text,                                   -- id платежа в PayKeeper (из callback)
  created_at      timestamptz NOT NULL DEFAULT now(),
  paid_at         timestamptz
);

CREATE INDEX IF NOT EXISTS game_payments_game_idx   ON public.game_payments(game_id);
CREATE INDEX IF NOT EXISTS game_payments_user_idx   ON public.game_payments(user_id);
CREATE INDEX IF NOT EXISTS game_payments_status_idx ON public.game_payments(status);

ALTER TABLE public.game_payments ENABLE ROW LEVEL SECURITY;

-- Клиент видит только свои платежи. Запись/апдейт делает только сервер:
-- service_role обходит RLS, поэтому write-политик нет специально.
DROP POLICY IF EXISTS game_payments_select_own ON public.game_payments;
CREATE POLICY game_payments_select_own ON public.game_payments
  FOR SELECT USING (user_id = auth.uid());

-- === Защита game_participants.paid ===
CREATE OR REPLACE FUNCTION public.guard_participant_paid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- сервер (webhook) и внутренние функции — можно всё
  IF current_user IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- клиент не может вступить в игру сразу "оплаченным"
    NEW.paid := false;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.paid IS DISTINCT FROM OLD.paid THEN
      RAISE EXCEPTION 'Оплата проставляется только через платёжный шлюз';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_participant_paid ON public.game_participants;
CREATE TRIGGER trg_guard_participant_paid
  BEFORE INSERT OR UPDATE ON public.game_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_participant_paid();

-- Realtime: чтобы страница игры видела смену статуса платежа без F5.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'game_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_payments;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
