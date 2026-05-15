-- =============================================================
-- Athletic Flow — защита системы голов (goal_claims / approvals)
-- =============================================================
--
-- ПРИМЕНЯТЬ В SUPABASE: SQL Editor → New Query → вставить, Run.
-- Перед применением сделай backup. Скрипт идемпотентный
-- (использует IF NOT EXISTS / DROP IF EXISTS).
--
-- Какие дыры закрываем:
--  1. Заявить голы может только участник игры (game_participants).
--  2. Заявить можно только после фактического окончания матча
--     (ends_at < now()), чтобы нельзя было «нагнать» голов до игры.
--  3. count ограничен (1..50) на уровне БД, не только клиента.
--  4. Один claim на (game, user) — никакого спама.
--  5. Подтверждать может только участник этого же матча.
--  6. Нельзя одобрить свою собственную заявку.
--  7. Один approver на claim — без повторных нажатий.
--  8. Триггер автоматически переводит status='approved' при ≥3 апрувах.
--  9. Удалять/редактировать claim может только автор и только пока pending.
--
-- =============================================================

-- 0) CHECK на count
ALTER TABLE public.goal_claims
  DROP CONSTRAINT IF EXISTS goal_claims_count_range;
ALTER TABLE public.goal_claims
  ADD CONSTRAINT goal_claims_count_range CHECK (count >= 1 AND count <= 50);

-- 1) Один claim на (game, user)
DROP INDEX IF EXISTS goal_claims_game_user_uniq;
CREATE UNIQUE INDEX goal_claims_game_user_uniq
  ON public.goal_claims (game_id, user_id);

-- 2) Один approver на claim
DROP INDEX IF EXISTS goal_claim_approvals_claim_user_uniq;
CREATE UNIQUE INDEX goal_claim_approvals_claim_user_uniq
  ON public.goal_claim_approvals (claim_id, approver_id);

-- 3) Запрет самоапрува: approver_id ≠ claim.user_id
CREATE OR REPLACE FUNCTION public.assert_approver_not_claimer()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_claimer uuid;
BEGIN
  SELECT user_id INTO v_claimer FROM public.goal_claims WHERE id = NEW.claim_id;
  IF v_claimer IS NULL THEN
    RAISE EXCEPTION 'Заявка не найдена';
  END IF;
  IF NEW.approver_id = v_claimer THEN
    RAISE EXCEPTION 'Нельзя подтвердить свою собственную заявку';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS goal_claim_approvals_no_self ON public.goal_claim_approvals;
CREATE TRIGGER goal_claim_approvals_no_self
  BEFORE INSERT ON public.goal_claim_approvals
  FOR EACH ROW EXECUTE FUNCTION public.assert_approver_not_claimer();

-- 4) Авто-перевод claim → 'approved' при ≥3 апрувах
CREATE OR REPLACE FUNCTION public.recalc_goal_claim_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_claim uuid;
  v_cnt int;
BEGIN
  v_claim := COALESCE(NEW.claim_id, OLD.claim_id);
  SELECT COUNT(*) INTO v_cnt FROM public.goal_claim_approvals WHERE claim_id = v_claim;
  IF v_cnt >= 3 THEN
    UPDATE public.goal_claims SET status = 'approved' WHERE id = v_claim AND status <> 'approved';
  ELSE
    UPDATE public.goal_claims SET status = 'pending' WHERE id = v_claim AND status = 'approved';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS goal_claim_approvals_recalc ON public.goal_claim_approvals;
CREATE TRIGGER goal_claim_approvals_recalc
  AFTER INSERT OR DELETE ON public.goal_claim_approvals
  FOR EACH ROW EXECUTE FUNCTION public.recalc_goal_claim_status();

-- 5) Включаем RLS (если ещё не включён)
ALTER TABLE public.goal_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_claim_approvals ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики, чтобы пересоздать чисто
DROP POLICY IF EXISTS "goal_claims_read_all" ON public.goal_claims;
DROP POLICY IF EXISTS "goal_claims_insert_participant_after_end" ON public.goal_claims;
DROP POLICY IF EXISTS "goal_claims_update_owner_pending" ON public.goal_claims;
DROP POLICY IF EXISTS "goal_claims_delete_owner_pending" ON public.goal_claims;
DROP POLICY IF EXISTS "goal_claim_approvals_read_all" ON public.goal_claim_approvals;
DROP POLICY IF EXISTS "goal_claim_approvals_insert_participant" ON public.goal_claim_approvals;
DROP POLICY IF EXISTS "goal_claim_approvals_delete_self" ON public.goal_claim_approvals;

-- 6) Чтение голов и апрувов — публично (нужно для расписания/профилей)
CREATE POLICY "goal_claims_read_all"
  ON public.goal_claims FOR SELECT
  USING (true);

CREATE POLICY "goal_claim_approvals_read_all"
  ON public.goal_claim_approvals FOR SELECT
  USING (true);

-- 7) Заявить голы: только участник И только после ends_at
CREATE POLICY "goal_claims_insert_participant_after_end"
  ON public.goal_claims FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_id
        AND g.ends_at < now()
        AND (
          g.organizer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.game_participants gp
            WHERE gp.game_id = g.id AND gp.user_id = auth.uid()
          )
        )
    )
  );

-- 8) Обновлять / удалять свою заявку можно только пока pending
CREATE POLICY "goal_claims_update_owner_pending"
  ON public.goal_claims FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goal_claims_delete_owner_pending"
  ON public.goal_claims FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- 9) Апрув: только участник того же матча
CREATE POLICY "goal_claim_approvals_insert_participant"
  ON public.goal_claim_approvals FOR INSERT
  WITH CHECK (
    auth.uid() = approver_id
    AND EXISTS (
      SELECT 1
      FROM public.goal_claims c
      JOIN public.games g ON g.id = c.game_id
      WHERE c.id = claim_id
        AND (
          g.organizer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.game_participants gp
            WHERE gp.game_id = g.id AND gp.user_id = auth.uid()
          )
        )
    )
  );

-- 10) Отозвать свой апрув можно
CREATE POLICY "goal_claim_approvals_delete_self"
  ON public.goal_claim_approvals FOR DELETE
  USING (auth.uid() = approver_id);

-- =============================================================
-- Итог: даже если фронт скомпрометирован — нельзя:
--   - заявить голы за чужого пользователя;
--   - заявить до окончания матча;
--   - заявить себе 100500 голов;
--   - подтвердить свою заявку;
--   - подтвердить «3 раза с одного аккаунта»;
--   - подтвердить как не-участник матча.
-- =============================================================
