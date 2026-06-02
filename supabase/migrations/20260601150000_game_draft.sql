-- Драфт игроков. Капитанов A и B назначает организатор.
-- Когда все оплатили — админ или один из кэпов жмёт «Начать расстановку»,
-- другие подтверждают, и поочерёдно ставят игроков из общего пула на
-- свои точки. Слоты храним jsonb в одной строке game_drafts —
-- realtime подписка минимальна.

-- ============================================================
-- 1. game_captains
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_captains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team text NOT NULL CHECK (team IN ('A','B')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_captains_team_uniq UNIQUE (game_id, team),
  CONSTRAINT game_captains_user_uniq UNIQUE (game_id, user_id)
);
ALTER TABLE public.game_captains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads captains" ON public.game_captains;
CREATE POLICY "anyone reads captains" ON public.game_captains FOR SELECT USING (true);

-- ============================================================
-- 2. game_drafts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_drafts (
  game_id uuid PRIMARY KEY REFERENCES public.games(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','completed','cancelled')),
  proposed_by uuid REFERENCES auth.users(id),
  -- кого из админа/кэпов нам уже одобрил предложение
  approved_by uuid[] NOT NULL DEFAULT '{}',
  slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  turn_team text CHECK (turn_team IN ('A','B')),
  formation_size int NOT NULL DEFAULT 5,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads drafts" ON public.game_drafts;
CREATE POLICY "anyone reads drafts" ON public.game_drafts FOR SELECT USING (true);

-- ============================================================
-- 3. RPC: set_captain
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_captain(p_game_id uuid, p_team text, p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_uid uuid := auth.uid(); v_organizer uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_team NOT IN ('A','B') THEN RAISE EXCEPTION 'Bad team'; END IF;
  SELECT organizer_id INTO v_organizer FROM games WHERE id = p_game_id;
  IF v_organizer IS NULL THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF v_organizer <> v_uid THEN RAISE EXCEPTION 'Only organizer'; END IF;
  IF p_user_id IS NULL THEN
    DELETE FROM game_captains WHERE game_id = p_game_id AND team = p_team;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM game_participants WHERE game_id = p_game_id AND user_id = p_user_id) THEN
      RAISE EXCEPTION 'User is not a participant';
    END IF;
    -- Снять с другой команды, если кэп там уже.
    DELETE FROM game_captains WHERE game_id = p_game_id AND user_id = p_user_id AND team <> p_team;
    INSERT INTO game_captains(game_id, team, user_id) VALUES (p_game_id, p_team, p_user_id)
      ON CONFLICT (game_id, team) DO UPDATE SET user_id = EXCLUDED.user_id;
  END IF;
  RETURN json_build_object('ok', true);
END;
$fn$;

-- ============================================================
-- 4. Хелпер: построение слотов для размеров 5/6/7. Для нестандартных
-- размеров — линейная раскладка (запасной вариант).
-- ============================================================
CREATE OR REPLACE FUNCTION public.build_draft_slots(p_size int)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE v jsonb;
BEGIN
  CASE p_size
  WHEN 5 THEN v := '[
    {"id":"A0","team":"A","x":0.06,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","x":0.2,"y":0.28,"player_id":null},
    {"id":"A2","team":"A","x":0.2,"y":0.72,"player_id":null},
    {"id":"A3","team":"A","x":0.4,"y":0.34,"player_id":null},
    {"id":"A4","team":"A","x":0.4,"y":0.66,"player_id":null},
    {"id":"B0","team":"B","x":0.94,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","x":0.8,"y":0.28,"player_id":null},
    {"id":"B2","team":"B","x":0.8,"y":0.72,"player_id":null},
    {"id":"B3","team":"B","x":0.6,"y":0.34,"player_id":null},
    {"id":"B4","team":"B","x":0.6,"y":0.66,"player_id":null}
  ]'::jsonb;
  WHEN 6 THEN v := '[
    {"id":"A0","team":"A","x":0.06,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","x":0.18,"y":0.3,"player_id":null},
    {"id":"A2","team":"A","x":0.18,"y":0.7,"player_id":null},
    {"id":"A3","team":"A","x":0.34,"y":0.5,"player_id":null},
    {"id":"A4","team":"A","x":0.45,"y":0.32,"player_id":null},
    {"id":"A5","team":"A","x":0.45,"y":0.68,"player_id":null},
    {"id":"B0","team":"B","x":0.94,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","x":0.82,"y":0.3,"player_id":null},
    {"id":"B2","team":"B","x":0.82,"y":0.7,"player_id":null},
    {"id":"B3","team":"B","x":0.66,"y":0.5,"player_id":null},
    {"id":"B4","team":"B","x":0.55,"y":0.32,"player_id":null},
    {"id":"B5","team":"B","x":0.55,"y":0.68,"player_id":null}
  ]'::jsonb;
  WHEN 7 THEN v := '[
    {"id":"A0","team":"A","x":0.06,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","x":0.18,"y":0.28,"player_id":null},
    {"id":"A2","team":"A","x":0.18,"y":0.72,"player_id":null},
    {"id":"A3","team":"A","x":0.32,"y":0.5,"player_id":null},
    {"id":"A4","team":"A","x":0.45,"y":0.3,"player_id":null},
    {"id":"A5","team":"A","x":0.45,"y":0.5,"player_id":null},
    {"id":"A6","team":"A","x":0.45,"y":0.7,"player_id":null},
    {"id":"B0","team":"B","x":0.94,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","x":0.82,"y":0.28,"player_id":null},
    {"id":"B2","team":"B","x":0.82,"y":0.72,"player_id":null},
    {"id":"B3","team":"B","x":0.68,"y":0.5,"player_id":null},
    {"id":"B4","team":"B","x":0.55,"y":0.3,"player_id":null},
    {"id":"B5","team":"B","x":0.55,"y":0.5,"player_id":null},
    {"id":"B6","team":"B","x":0.55,"y":0.7,"player_id":null}
  ]'::jsonb;
  ELSE
    -- Запасной: линейный ряд по 0.2 шагу
    v := '[]'::jsonb;
    FOR i IN 0..(p_size - 1) LOOP
      v := v || jsonb_build_array(
        jsonb_build_object('id', 'A' || i, 'team','A', 'x', 0.1 + 0.3*i::float/p_size, 'y', 0.2 + 0.6*i::float/p_size, 'player_id', null),
        jsonb_build_object('id', 'B' || i, 'team','B', 'x', 0.9 - 0.3*i::float/p_size, 'y', 0.2 + 0.6*i::float/p_size, 'player_id', null)
      );
    END LOOP;
  END CASE;
  RETURN v;
END;
$fn$;

-- ============================================================
-- 5. RPC: propose_draft  (admin/captain; p_force=true для теста)
-- ============================================================
CREATE OR REPLACE FUNCTION public.propose_draft(p_game_id uuid, p_force boolean DEFAULT false)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_game record;
  v_capA uuid; v_capB uuid;
  v_already record;
  v_size int;
  v_slots jsonb;
  v_paid int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, organizer_id, slots_total, archived_at, sport INTO v_game FROM games WHERE id = p_game_id;
  IF v_game.id IS NULL THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF v_game.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Game archived'; END IF;

  SELECT user_id INTO v_capA FROM game_captains WHERE game_id = p_game_id AND team='A';
  SELECT user_id INTO v_capB FROM game_captains WHERE game_id = p_game_id AND team='B';

  IF v_uid <> v_game.organizer_id AND v_uid <> v_capA AND v_uid <> v_capB THEN
    RAISE EXCEPTION 'Only organizer or captains can propose';
  END IF;

  IF NOT p_force THEN
    SELECT count(*) INTO v_paid FROM game_participants WHERE game_id = p_game_id AND paid = true;
    IF v_paid < v_game.slots_total THEN
      RAISE EXCEPTION 'Not all participants paid yet';
    END IF;
    IF v_capA IS NULL OR v_capB IS NULL THEN
      RAISE EXCEPTION 'Captains not assigned';
    END IF;
  END IF;

  SELECT * INTO v_already FROM game_drafts WHERE game_id = p_game_id;
  IF v_already.game_id IS NOT NULL AND v_already.status IN ('pending', 'active') THEN
    RAISE EXCEPTION 'Draft already %', v_already.status;
  END IF;

  v_size := v_game.slots_total / 2;
  v_slots := public.build_draft_slots(v_size);

  INSERT INTO game_drafts(game_id, status, proposed_by, approved_by, slots, turn_team, formation_size)
    VALUES (p_game_id, 'pending', v_uid, ARRAY[v_uid], v_slots, 'A', v_size)
    ON CONFLICT (game_id) DO UPDATE SET
      status='pending', proposed_by=v_uid, approved_by=ARRAY[v_uid],
      slots=v_slots, turn_team='A', formation_size=v_size,
      started_at=NULL, completed_at=NULL, updated_at=now();

  -- Нотификации остальным капитанам и админу.
  INSERT INTO notifications(user_id, type, title, body, url, payload)
  SELECT DISTINCT u, 'draft_proposed', 'Расстановка состава · ' || v_game.sport,
    'Кто-то предлагает начать драфт. Подтверди для старта.',
    '/games/' || p_game_id::text,
    jsonb_build_object('game_id', p_game_id)
  FROM unnest(ARRAY[v_game.organizer_id, v_capA, v_capB]) AS u
  WHERE u IS NOT NULL AND u <> v_uid;

  RETURN json_build_object('ok', true);
END;
$fn$;

-- ============================================================
-- 6. RPC: accept_draft
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_draft(p_game_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_d record;
  v_organizer uuid;
  v_capA uuid; v_capB uuid;
  v_required uuid[];
  v_new_approved uuid[];
  v_all_in boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_d FROM game_drafts WHERE game_id = p_game_id;
  IF v_d.game_id IS NULL THEN RAISE EXCEPTION 'Draft not found'; END IF;
  IF v_d.status <> 'pending' THEN RAISE EXCEPTION 'Draft already %', v_d.status; END IF;
  SELECT organizer_id INTO v_organizer FROM games WHERE id = p_game_id;
  SELECT user_id INTO v_capA FROM game_captains WHERE game_id = p_game_id AND team='A';
  SELECT user_id INTO v_capB FROM game_captains WHERE game_id = p_game_id AND team='B';

  v_required := ARRAY(SELECT DISTINCT u FROM unnest(ARRAY[v_organizer, v_capA, v_capB]) AS u WHERE u IS NOT NULL);

  IF NOT (v_uid = ANY(v_required)) THEN RAISE EXCEPTION 'Only organizer or captains'; END IF;
  IF v_uid = ANY(v_d.approved_by) THEN
    RETURN json_build_object('ok', true, 'already', true);
  END IF;

  v_new_approved := v_d.approved_by || v_uid;
  v_all_in := (SELECT bool_and(u = ANY(v_new_approved)) FROM unnest(v_required) AS u);

  IF v_all_in THEN
    UPDATE game_drafts SET status='active', approved_by=v_new_approved, started_at=now(), updated_at=now()
      WHERE game_id=p_game_id;
  ELSE
    UPDATE game_drafts SET approved_by=v_new_approved, updated_at=now() WHERE game_id=p_game_id;
  END IF;

  RETURN json_build_object('ok', true, 'all_in', v_all_in);
END;
$fn$;

-- ============================================================
-- 7. RPC: pick_slot
-- ============================================================
CREATE OR REPLACE FUNCTION public.pick_slot(p_game_id uuid, p_slot_id text, p_player_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_d record;
  v_capA uuid; v_capB uuid;
  v_my_team text;
  v_slot jsonb;
  v_new_slots jsonb;
  v_other_team text;
  v_total int;
  v_filled int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_d FROM game_drafts WHERE game_id = p_game_id;
  IF v_d.game_id IS NULL OR v_d.status <> 'active' THEN RAISE EXCEPTION 'Draft not active'; END IF;
  SELECT user_id INTO v_capA FROM game_captains WHERE game_id = p_game_id AND team='A';
  SELECT user_id INTO v_capB FROM game_captains WHERE game_id = p_game_id AND team='B';
  IF v_uid = v_capA THEN v_my_team := 'A';
  ELSIF v_uid = v_capB THEN v_my_team := 'B';
  ELSE RAISE EXCEPTION 'Only captains can pick';
  END IF;
  IF v_my_team <> v_d.turn_team THEN RAISE EXCEPTION 'Not your turn'; END IF;

  SELECT s INTO v_slot FROM jsonb_array_elements(v_d.slots) AS s WHERE s->>'id' = p_slot_id;
  IF v_slot IS NULL THEN RAISE EXCEPTION 'Slot not found'; END IF;
  IF v_slot->>'team' <> v_my_team THEN RAISE EXCEPTION 'Cannot pick into other team slot'; END IF;
  IF v_slot->>'player_id' IS NOT NULL AND v_slot->>'player_id' <> 'null' THEN
    RAISE EXCEPTION 'Slot already occupied';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM game_participants WHERE game_id = p_game_id AND user_id = p_player_id) THEN
    RAISE EXCEPTION 'Player is not a participant';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_d.slots) AS s
    WHERE s->>'player_id' = p_player_id::text
  ) THEN
    RAISE EXCEPTION 'Player already placed';
  END IF;

  v_new_slots := (
    SELECT jsonb_agg(
      CASE WHEN s->>'id' = p_slot_id
        THEN jsonb_set(s, '{player_id}', to_jsonb(p_player_id::text))
        ELSE s
      END
    ) FROM jsonb_array_elements(v_d.slots) AS s
  );
  v_other_team := CASE WHEN v_my_team='A' THEN 'B' ELSE 'A' END;

  SELECT jsonb_array_length(v_new_slots),
         (SELECT count(*) FROM jsonb_array_elements(v_new_slots) AS s
          WHERE s->>'player_id' IS NOT NULL AND s->>'player_id' <> 'null')
  INTO v_total, v_filled;

  UPDATE game_drafts SET
    slots = v_new_slots,
    turn_team = CASE WHEN v_filled >= v_total THEN NULL ELSE v_other_team END,
    status = CASE WHEN v_filled >= v_total THEN 'completed' ELSE 'active' END,
    completed_at = CASE WHEN v_filled >= v_total THEN now() ELSE NULL END,
    updated_at = now()
  WHERE game_id = p_game_id;

  RETURN json_build_object('ok', true, 'completed', v_filled >= v_total);
END;
$fn$;

-- ============================================================
-- 8. RPC: unpick_slot
-- ============================================================
CREATE OR REPLACE FUNCTION public.unpick_slot(p_game_id uuid, p_slot_id text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_d record;
  v_capA uuid; v_capB uuid;
  v_my_team text;
  v_slot jsonb;
  v_new_slots jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_d FROM game_drafts WHERE game_id = p_game_id;
  IF v_d.game_id IS NULL OR v_d.status NOT IN ('active','completed') THEN RAISE EXCEPTION 'Draft not active'; END IF;
  SELECT user_id INTO v_capA FROM game_captains WHERE game_id = p_game_id AND team='A';
  SELECT user_id INTO v_capB FROM game_captains WHERE game_id = p_game_id AND team='B';
  IF v_uid = v_capA THEN v_my_team := 'A';
  ELSIF v_uid = v_capB THEN v_my_team := 'B';
  ELSE RAISE EXCEPTION 'Only captains can unpick';
  END IF;

  SELECT s INTO v_slot FROM jsonb_array_elements(v_d.slots) AS s WHERE s->>'id' = p_slot_id;
  IF v_slot IS NULL THEN RAISE EXCEPTION 'Slot not found'; END IF;
  IF v_slot->>'team' <> v_my_team THEN RAISE EXCEPTION 'Cannot unpick other team slot'; END IF;

  v_new_slots := (
    SELECT jsonb_agg(
      CASE WHEN s->>'id' = p_slot_id THEN jsonb_set(s, '{player_id}', 'null'::jsonb) ELSE s END
    ) FROM jsonb_array_elements(v_d.slots) AS s
  );

  UPDATE game_drafts SET slots=v_new_slots, status='active', completed_at=NULL, turn_team=v_my_team, updated_at=now()
    WHERE game_id=p_game_id;
  RETURN json_build_object('ok', true);
END;
$fn$;

-- ============================================================
-- 9. RPC: cancel_draft (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_draft(p_game_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_uid uuid := auth.uid(); v_organizer uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT organizer_id INTO v_organizer FROM games WHERE id = p_game_id;
  IF v_organizer <> v_uid THEN RAISE EXCEPTION 'Only organizer'; END IF;
  DELETE FROM game_drafts WHERE game_id = p_game_id;
  RETURN json_build_object('ok', true);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.set_captain(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_draft(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_draft(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pick_slot(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpick_slot(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_draft(uuid) TO authenticated;
