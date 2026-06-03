-- Дев-помощники для тестирования драфта одним аккаунтом.
-- При применении через MCP к старому Cloud-проекту они были, в self-hosted
-- этот файл — единый источник правды.

-- ============================================================
-- start_draft_test (organizer): сразу активный драфт + кэпы
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_draft_test(
  p_game_id uuid,
  p_cap_a uuid,
  p_cap_b uuid
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_game record;
  v_size int;
  v_slots jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, organizer_id, slots_total, archived_at INTO v_game FROM games WHERE id = p_game_id;
  IF v_game.id IS NULL THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF v_game.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Game archived'; END IF;
  IF v_game.organizer_id <> v_uid THEN RAISE EXCEPTION 'Only organizer'; END IF;

  IF p_cap_a IS NULL OR p_cap_b IS NULL OR p_cap_a = p_cap_b THEN
    RAISE EXCEPTION 'Provide two distinct captains';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM game_participants WHERE game_id = p_game_id AND user_id = p_cap_a) THEN
    RAISE EXCEPTION 'Captain A is not a participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM game_participants WHERE game_id = p_game_id AND user_id = p_cap_b) THEN
    RAISE EXCEPTION 'Captain B is not a participant';
  END IF;

  DELETE FROM game_captains WHERE game_id = p_game_id;
  INSERT INTO game_captains(game_id, team, user_id)
    VALUES (p_game_id, 'A', p_cap_a), (p_game_id, 'B', p_cap_b);

  v_size := v_game.slots_total / 2;
  v_slots := public.build_draft_slots(v_size);

  INSERT INTO game_drafts(game_id, status, proposed_by, approved_by, slots, turn_team, formation_size, started_at)
    VALUES (p_game_id, 'active', v_uid, ARRAY[v_uid, p_cap_a, p_cap_b], v_slots, 'A', v_size, now())
    ON CONFLICT (game_id) DO UPDATE SET
      status='active', proposed_by=v_uid, approved_by=ARRAY[v_uid, p_cap_a, p_cap_b],
      slots=v_slots, turn_team='A', formation_size=v_size,
      started_at=now(), completed_at=NULL, updated_at=now();

  RETURN json_build_object('ok', true);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.start_draft_test(uuid, uuid, uuid) TO authenticated;

-- ============================================================
-- force_pick_slot (organizer-only): пикает за любую команду игнорируя
-- turn_team. Нужно когда тестируешь драфт в одном окне — иначе
-- после первого пика ход переходит к B-кэпу, за которого ты не залогинен.
-- В UI можно прятать за "режим разработчика".
-- ============================================================
CREATE OR REPLACE FUNCTION public.force_pick_slot(
  p_game_id uuid,
  p_slot_id text,
  p_player_id uuid
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_d record;
  v_organizer uuid;
  v_slot jsonb;
  v_new_slots jsonb;
  v_other_team text;
  v_total int;
  v_filled int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT organizer_id INTO v_organizer FROM games WHERE id = p_game_id;
  IF v_organizer <> v_uid THEN RAISE EXCEPTION 'Only organizer can force-pick'; END IF;

  SELECT * INTO v_d FROM game_drafts WHERE game_id = p_game_id;
  IF v_d.game_id IS NULL OR v_d.status <> 'active' THEN RAISE EXCEPTION 'Draft not active'; END IF;

  SELECT s INTO v_slot FROM jsonb_array_elements(v_d.slots) AS s WHERE s->>'id' = p_slot_id;
  IF v_slot IS NULL THEN RAISE EXCEPTION 'Slot not found'; END IF;
  IF v_slot->>'player_id' IS NOT NULL AND v_slot->>'player_id' <> 'null' THEN
    RAISE EXCEPTION 'Slot already occupied';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM game_participants WHERE game_id = p_game_id AND user_id = p_player_id) THEN
    RAISE EXCEPTION 'Player is not a participant';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_d.slots) AS s WHERE s->>'player_id' = p_player_id::text) THEN
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

  -- В отличие от pick_slot — turn_team просто переключаем (как раньше),
  -- но если все слоты заполнены — завершаем.
  v_other_team := CASE WHEN v_slot->>'team' = 'A' THEN 'B' ELSE 'A' END;

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

GRANT EXECUTE ON FUNCTION public.force_pick_slot(uuid, text, uuid) TO authenticated;

-- ============================================================
-- Также чиним cancel_draft: он должен сбрасывать и game_captains,
-- иначе после сброса остаются битые ссылки.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_draft(p_game_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE v_uid uuid := auth.uid(); v_organizer uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT organizer_id INTO v_organizer FROM games WHERE id = p_game_id;
  IF v_organizer <> v_uid THEN RAISE EXCEPTION 'Only organizer'; END IF;
  DELETE FROM game_drafts WHERE game_id = p_game_id;
  DELETE FROM game_captains WHERE game_id = p_game_id;
  RETURN json_build_object('ok', true);
END;
$fn$;

NOTIFY pgrst, 'reload schema';
