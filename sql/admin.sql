-- =============================================================
-- Athletic Flow — админка: бан-поля, RLS, аудит, helper-функции
-- =============================================================
-- Применять в Supabase SQL Editor. Идемпотентно.
-- Зависит от уже существующих: user_roles, has_role(), profiles, games,
-- goal_claims, goal_claim_approvals.
-- =============================================================

-- 1) Бан-поля у профиля
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at  timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason text;

-- CHECK на длину причины — без огромных пейлоадов
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_ban_reason_len;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ban_reason_len
  CHECK (ban_reason IS NULL OR char_length(ban_reason) <= 500);

CREATE INDEX IF NOT EXISTS profiles_banned_idx
  ON public.profiles (banned_at)
  WHERE banned_at IS NOT NULL;

-- 2) Helper: is_admin() — обёртка над has_role('admin'). Используется в RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('admin'::app_role, auth.uid());
$$;

-- 3) Аудит-таблица: кто, кому, что, когда, payload
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL,                -- admin, который сделал действие
  target_kind text NOT NULL,                -- 'user' | 'game' | 'goal_claim' | 'role'
  target_id   uuid,                          -- ID того, над кем действовали
  action      text NOT NULL,                -- 'ban' | 'unban' | 'grant_role' | 'delete_game' | ...
  reason      text,
  payload     jsonb,                         -- произвольные доп. данные
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_actions_actor_idx ON public.admin_actions (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_actions_target_idx ON public.admin_actions (target_kind, target_id, created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_actions_read" ON public.admin_actions;
DROP POLICY IF EXISTS "admin_actions_insert" ON public.admin_actions;
CREATE POLICY "admin_actions_read"
  ON public.admin_actions FOR SELECT
  USING (public.is_admin());
-- Insert — только admin, и actor_id обязан совпадать с auth.uid()
CREATE POLICY "admin_actions_insert"
  ON public.admin_actions FOR INSERT
  WITH CHECK (public.is_admin() AND actor_id = auth.uid());

-- 4) RLS на profiles — admin может всё, обычный юзер как раньше
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Чтение профилей оставим публичным (нужно для карточек игроков). Если хочешь
-- ограничить — можно переписать. Сейчас просто разрешаем admin'у UPDATE.
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5) RLS на games — admin force update / delete
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "games_admin_update" ON public.games;
DROP POLICY IF EXISTS "games_admin_delete" ON public.games;
CREATE POLICY "games_admin_update"
  ON public.games FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "games_admin_delete"
  ON public.games FOR DELETE
  USING (public.is_admin());

-- 6) RLS на goal_claims — admin может force approve / reject
ALTER TABLE public.goal_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goal_claims_admin_update" ON public.goal_claims;
DROP POLICY IF EXISTS "goal_claims_admin_delete" ON public.goal_claims;
CREATE POLICY "goal_claims_admin_update"
  ON public.goal_claims FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "goal_claims_admin_delete"
  ON public.goal_claims FOR DELETE
  USING (public.is_admin());

-- 7) RLS на user_roles — управление ролями только админом, и нельзя
--    лишить роли admin'а через клиент (защита от перехвата сессии).
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_read" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_delete" ON public.user_roles;
CREATE POLICY "user_roles_read"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "user_roles_admin_insert"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin());
-- Удалять можно только не-admin роли, чтобы избежать lock-out
CREATE POLICY "user_roles_admin_delete"
  ON public.user_roles FOR DELETE
  USING (public.is_admin() AND role <> 'admin');

-- 8) Триггер: запрет «оголения» admin'ов. Если попытаться UPDATE user_roles
-- так, что у пользователя исчезает роль admin — RLS пропустил бы, но нет
-- такой операции в коде. Добавим safety через триггер DELETE:
--   нельзя удалить последний admin-row.
CREATE OR REPLACE FUNCTION public.assert_not_last_admin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_left integer;
BEGIN
  IF OLD.role = 'admin' THEN
    SELECT count(*) INTO v_left FROM public.user_roles WHERE role = 'admin';
    IF v_left <= 1 THEN
      RAISE EXCEPTION 'Нельзя удалить последнего admin (защита от lock-out)';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_assert_last_admin ON public.user_roles;
CREATE TRIGGER user_roles_assert_last_admin
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.assert_not_last_admin();

-- 9) Удобный VIEW для админки — список юзеров с агрегатами
CREATE OR REPLACE VIEW public.admin_users_view
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.phone,
  p.phone_verified,
  p.level,
  p.created_at,
  p.banned_at,
  p.ban_reason,
  COALESCE(ur.is_admin, false) AS is_admin,
  COALESCE(g.games_organized, 0) AS games_organized,
  COALESCE(gp.games_joined, 0) AS games_joined
FROM public.profiles p
LEFT JOIN (
  SELECT user_id, true AS is_admin
  FROM public.user_roles
  WHERE role = 'admin'
) ur ON ur.user_id = p.id
LEFT JOIN (
  SELECT organizer_id, count(*) AS games_organized
  FROM public.games
  GROUP BY organizer_id
) g ON g.organizer_id = p.id
LEFT JOIN (
  SELECT user_id, count(*) AS games_joined
  FROM public.game_participants
  GROUP BY user_id
) gp ON gp.user_id = p.id;

-- 10) RPC: один-в-одно действие БАН пользователя — атомарно + аудит.
CREATE OR REPLACE FUNCTION public.admin_ban_user(p_target uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Нет прав';
  END IF;
  IF p_target = auth.uid() THEN
    RAISE EXCEPTION 'Нельзя забанить самого себя';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_target AND role = 'admin') THEN
    RAISE EXCEPTION 'Нельзя забанить admin';
  END IF;
  IF p_reason IS NOT NULL AND char_length(p_reason) > 500 THEN
    RAISE EXCEPTION 'Слишком длинная причина (max 500)';
  END IF;
  UPDATE public.profiles
     SET banned_at = now(),
         ban_reason = p_reason
   WHERE id = p_target;
  INSERT INTO public.admin_actions (actor_id, target_kind, target_id, action, reason)
  VALUES (auth.uid(), 'user', p_target, 'ban', p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unban_user(p_target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Нет прав';
  END IF;
  UPDATE public.profiles
     SET banned_at = NULL,
         ban_reason = NULL
   WHERE id = p_target;
  INSERT INTO public.admin_actions (actor_id, target_kind, target_id, action)
  VALUES (auth.uid(), 'user', p_target, 'unban');
END;
$$;

-- 11) RPC: выдать/забрать роль с аудитом
CREATE OR REPLACE FUNCTION public.admin_grant_role(p_target uuid, p_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Нет прав';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target, p_role)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.admin_actions (actor_id, target_kind, target_id, action, payload)
  VALUES (auth.uid(), 'role', p_target, 'grant_role', jsonb_build_object('role', p_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(p_target uuid, p_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Нет прав';
  END IF;
  IF p_role = 'admin' AND p_target = auth.uid() THEN
    RAISE EXCEPTION 'Нельзя забрать у себя роль admin';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = p_target AND role = p_role;
  INSERT INTO public.admin_actions (actor_id, target_kind, target_id, action, payload)
  VALUES (auth.uid(), 'role', p_target, 'revoke_role', jsonb_build_object('role', p_role));
END;
$$;

-- 12) Force-approve / reject goal claim
CREATE OR REPLACE FUNCTION public.admin_force_goal_claim(p_claim uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Нет прав';
  END IF;
  IF p_status NOT IN ('approved','pending','rejected') THEN
    RAISE EXCEPTION 'Неверный статус';
  END IF;
  UPDATE public.goal_claims SET status = p_status WHERE id = p_claim;
  INSERT INTO public.admin_actions (actor_id, target_kind, target_id, action, payload)
  VALUES (auth.uid(), 'goal_claim', p_claim, 'force_status', jsonb_build_object('status', p_status));
END;
$$;

-- =============================================================
-- После применения — назначь первого admin'а вручную:
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('<твой-supabase-auth-uid>', 'admin');
-- =============================================================
