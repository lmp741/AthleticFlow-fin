-- Заявки на участие. Когда игра помечена requires_approval = true,
-- прямая запись в game_participants запрещена — игрок подаёт заявку,
-- организатор её принимает или отклоняет. На approve — INSERT в участники.

-- ============================================================
-- 1. games — поле requires_approval
-- ============================================================
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. game_join_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id)
);

-- Только одна pending-заявка на пару (game_id, user_id).
-- При повторной заявке отдадим существующую (см. RPC request_join).
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_join_requests_pending_uniq
  ON public.game_join_requests(game_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_game_join_requests_game
  ON public.game_join_requests(game_id);
CREATE INDEX IF NOT EXISTS idx_game_join_requests_user
  ON public.game_join_requests(user_id);

ALTER TABLE public.game_join_requests ENABLE ROW LEVEL SECURITY;

-- Читают только организатор игры или сам автор заявки.
CREATE POLICY "organizer or author reads requests"
  ON public.game_join_requests FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_id AND g.organizer_id = auth.uid()
    )
  );
-- INSERT / UPDATE / DELETE — только через RPC (SECURITY DEFINER).

-- ============================================================
-- 3. RPC: request_join
-- ============================================================
-- Игрок подаёт заявку на участие. Проверяем:
--   - игра существует, не архивная, не закончилась
--   - игрок ещё не участник
--   - есть свободные слоты
--   - игра требует аппрув
-- Если уже есть pending-заявка — возвращаем её ID без вставки новой.
CREATE OR REPLACE FUNCTION public.request_join(
  p_game_id uuid,
  p_message text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_game record;
  v_taken int;
  v_existing uuid;
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, organizer_id, requires_approval, archived_at, ends_at, slots_total, sport
  INTO v_game
  FROM public.games
  WHERE id = p_game_id;

  IF v_game.id IS NULL THEN
    RAISE EXCEPTION 'Game not found';
  END IF;
  IF v_game.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Game already archived';
  END IF;
  IF v_game.ends_at < now() THEN
    RAISE EXCEPTION 'Game already ended';
  END IF;
  IF v_game.organizer_id = v_uid THEN
    RAISE EXCEPTION 'You are the organizer';
  END IF;
  IF NOT v_game.requires_approval THEN
    RAISE EXCEPTION 'Game has open enrollment, no approval needed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.game_participants
    WHERE game_id = p_game_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'You are already a participant';
  END IF;

  SELECT count(*) INTO v_taken
  FROM public.game_participants
  WHERE game_id = p_game_id;
  IF v_taken >= v_game.slots_total THEN
    RAISE EXCEPTION 'Game is full';
  END IF;

  -- Если pending уже есть — отдаём её.
  SELECT id INTO v_existing FROM public.game_join_requests
  WHERE game_id = p_game_id AND user_id = v_uid AND status = 'pending';
  IF v_existing IS NOT NULL THEN
    RETURN json_build_object('ok', true, 'request_id', v_existing, 'already_pending', true);
  END IF;

  INSERT INTO public.game_join_requests (game_id, user_id, message)
  VALUES (p_game_id, v_uid, NULLIF(trim(COALESCE(p_message, '')), ''))
  RETURNING id INTO v_new_id;

  -- Уведомление организатору
  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  VALUES (
    v_game.organizer_id,
    'join_request',
    'Новая заявка · ' || v_game.sport,
    'Игрок хочет присоединиться к матчу',
    '/games/' || p_game_id::text,
    jsonb_build_object(
      'game_id', p_game_id,
      'request_id', v_new_id,
      'from_user_id', v_uid
    )
  );

  RETURN json_build_object('ok', true, 'request_id', v_new_id);
END;
$$;

-- ============================================================
-- 4. RPC: approve_join
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_join(
  p_request_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
  v_game record;
  v_taken int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_req FROM public.game_join_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already %', v_req.status;
  END IF;

  SELECT * INTO v_game FROM public.games WHERE id = v_req.game_id;
  IF v_game.organizer_id <> v_uid THEN
    RAISE EXCEPTION 'Only organizer can approve';
  END IF;
  IF v_game.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Game archived';
  END IF;

  SELECT count(*) INTO v_taken
  FROM public.game_participants
  WHERE game_id = v_req.game_id;
  IF v_taken >= v_game.slots_total THEN
    RAISE EXCEPTION 'Game is full';
  END IF;

  UPDATE public.game_join_requests
  SET status = 'approved', decided_at = now(), decided_by = v_uid
  WHERE id = p_request_id;

  INSERT INTO public.game_participants (game_id, user_id)
  VALUES (v_req.game_id, v_req.user_id)
  ON CONFLICT (game_id, user_id) DO NOTHING;

  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  VALUES (
    v_req.user_id,
    'join_approved',
    'Заявка одобрена · ' || v_game.sport,
    'Тебя добавили в состав. До встречи на поле.',
    '/games/' || v_req.game_id::text,
    jsonb_build_object('game_id', v_req.game_id)
  );

  RETURN json_build_object('ok', true);
END;
$$;

-- ============================================================
-- 5. RPC: reject_join
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_join(
  p_request_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
  v_game record;
  v_clean_reason text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_req FROM public.game_join_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already %', v_req.status;
  END IF;

  SELECT * INTO v_game FROM public.games WHERE id = v_req.game_id;
  IF v_game.organizer_id <> v_uid THEN
    RAISE EXCEPTION 'Only organizer can reject';
  END IF;

  v_clean_reason := NULLIF(trim(COALESCE(p_reason, '')), '');

  UPDATE public.game_join_requests
  SET status = 'rejected', decided_at = now(), decided_by = v_uid, reject_reason = v_clean_reason
  WHERE id = p_request_id;

  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  VALUES (
    v_req.user_id,
    'join_rejected',
    'Заявка отклонена · ' || v_game.sport,
    COALESCE(v_clean_reason, 'Организатор отклонил заявку.'),
    '/games/' || v_req.game_id::text,
    jsonb_build_object('game_id', v_req.game_id)
  );

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_join(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_join(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_join(uuid, text) TO authenticated;

-- ============================================================
-- 6. Гард на game_participants: если игра requires_approval = true,
-- прямой INSERT клиентом запрещён — только через approve_join (SECURITY DEFINER).
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_direct_join_when_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_requires boolean;
  v_organizer uuid;
BEGIN
  SELECT requires_approval, organizer_id INTO v_requires, v_organizer
  FROM public.games WHERE id = NEW.game_id;
  -- Организатор может добавлять напрямую (например, при создании себя в состав).
  IF v_requires AND NEW.user_id <> COALESCE(v_organizer, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    -- Если это сам approve_join, в нём мы вставляем под SECURITY DEFINER —
    -- в этой ветке current_setting('request.jwt.claim.role', true) = 'service_role'
    -- (или для SECURITY DEFINER current_user = postgres). Проще: пропускаем,
    -- если SESSION_USER = postgres / supabase_admin.
    IF current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Game requires approval — submit a join request';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_direct_join_when_approval ON public.game_participants;
CREATE TRIGGER trg_block_direct_join_when_approval
  BEFORE INSERT ON public.game_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.block_direct_join_when_approval();
