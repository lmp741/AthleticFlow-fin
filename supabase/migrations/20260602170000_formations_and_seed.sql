-- Обновляем формации для драфта по советам тренера (см. чат с Ваней Кудиновым):
--   5×5: 1 вратарь + 2 защ + 2 ПЗ (роли крайне условные, "сами разберутся")
--   6×6: 1 вр + 1 ЦЗ + 2 крайних защитника (= крайние ПЗ) + 1 ЦПЗ + 1 НАП  (самое популярное)
--   7×7: 6×6 + ещё 1 центральный полузащитник
--   8×8: 1 вр + 3 защ + 3 ПЗ + 1 НАП
--   9×9: 8×8 + 1 НАП (становится 2 нападающих)
--   10×10: 1 вр + 4 защ + 3 ПЗ + 2 НАП
--   11×11: классика 4-3-3 (1 вр + 4 защ + 3 ПЗ + 3 НАП)
-- Команда B — зеркало по x (см. формула в propose_draft).
-- Сохраняем JSON с типом точки (`role`) — на UI можно подсвечивать ЦЗ/ВР/НАП.

CREATE OR REPLACE FUNCTION public.build_draft_slots(p_size int)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE v jsonb; i int;
BEGIN
  CASE p_size
  WHEN 5 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.06,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"DF","x":0.22,"y":0.32,"player_id":null},
    {"id":"A2","team":"A","role":"DF","x":0.22,"y":0.68,"player_id":null},
    {"id":"A3","team":"A","role":"MF","x":0.40,"y":0.32,"player_id":null},
    {"id":"A4","team":"A","role":"MF","x":0.40,"y":0.68,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.94,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"DF","x":0.78,"y":0.32,"player_id":null},
    {"id":"B2","team":"B","role":"DF","x":0.78,"y":0.68,"player_id":null},
    {"id":"B3","team":"B","role":"MF","x":0.60,"y":0.32,"player_id":null},
    {"id":"B4","team":"B","role":"MF","x":0.60,"y":0.68,"player_id":null}
  ]'::jsonb;
  WHEN 6 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.06,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"CB","x":0.20,"y":0.5,"player_id":null},
    {"id":"A2","team":"A","role":"LB","x":0.28,"y":0.22,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.28,"y":0.78,"player_id":null},
    {"id":"A4","team":"A","role":"CM","x":0.40,"y":0.5,"player_id":null},
    {"id":"A5","team":"A","role":"ST","x":0.50,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.94,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"CB","x":0.80,"y":0.5,"player_id":null},
    {"id":"B2","team":"B","role":"LB","x":0.72,"y":0.22,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.72,"y":0.78,"player_id":null},
    {"id":"B4","team":"B","role":"CM","x":0.60,"y":0.5,"player_id":null},
    {"id":"B5","team":"B","role":"ST","x":0.50,"y":0.5,"player_id":null}
  ]'::jsonb;
  WHEN 7 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.05,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"CB","x":0.18,"y":0.5,"player_id":null},
    {"id":"A2","team":"A","role":"LB","x":0.26,"y":0.24,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.26,"y":0.76,"player_id":null},
    {"id":"A4","team":"A","role":"CM","x":0.40,"y":0.36,"player_id":null},
    {"id":"A5","team":"A","role":"CM","x":0.40,"y":0.64,"player_id":null},
    {"id":"A6","team":"A","role":"ST","x":0.52,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.95,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"CB","x":0.82,"y":0.5,"player_id":null},
    {"id":"B2","team":"B","role":"LB","x":0.74,"y":0.24,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.74,"y":0.76,"player_id":null},
    {"id":"B4","team":"B","role":"CM","x":0.60,"y":0.36,"player_id":null},
    {"id":"B5","team":"B","role":"CM","x":0.60,"y":0.64,"player_id":null},
    {"id":"B6","team":"B","role":"ST","x":0.48,"y":0.5,"player_id":null}
  ]'::jsonb;
  WHEN 8 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.05,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.20,"y":0.22,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.20,"y":0.5,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.20,"y":0.78,"player_id":null},
    {"id":"A4","team":"A","role":"LM","x":0.36,"y":0.22,"player_id":null},
    {"id":"A5","team":"A","role":"CM","x":0.36,"y":0.5,"player_id":null},
    {"id":"A6","team":"A","role":"RM","x":0.36,"y":0.78,"player_id":null},
    {"id":"A7","team":"A","role":"ST","x":0.50,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.95,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.80,"y":0.22,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.80,"y":0.5,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.80,"y":0.78,"player_id":null},
    {"id":"B4","team":"B","role":"LM","x":0.64,"y":0.22,"player_id":null},
    {"id":"B5","team":"B","role":"CM","x":0.64,"y":0.5,"player_id":null},
    {"id":"B6","team":"B","role":"RM","x":0.64,"y":0.78,"player_id":null},
    {"id":"B7","team":"B","role":"ST","x":0.50,"y":0.5,"player_id":null}
  ]'::jsonb;
  WHEN 9 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.05,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.18,"y":0.22,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.18,"y":0.5,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.18,"y":0.78,"player_id":null},
    {"id":"A4","team":"A","role":"LM","x":0.32,"y":0.22,"player_id":null},
    {"id":"A5","team":"A","role":"CM","x":0.32,"y":0.5,"player_id":null},
    {"id":"A6","team":"A","role":"RM","x":0.32,"y":0.78,"player_id":null},
    {"id":"A7","team":"A","role":"ST","x":0.48,"y":0.36,"player_id":null},
    {"id":"A8","team":"A","role":"ST","x":0.48,"y":0.64,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.95,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.82,"y":0.22,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.82,"y":0.5,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.82,"y":0.78,"player_id":null},
    {"id":"B4","team":"B","role":"LM","x":0.68,"y":0.22,"player_id":null},
    {"id":"B5","team":"B","role":"CM","x":0.68,"y":0.5,"player_id":null},
    {"id":"B6","team":"B","role":"RM","x":0.68,"y":0.78,"player_id":null},
    {"id":"B7","team":"B","role":"ST","x":0.52,"y":0.36,"player_id":null},
    {"id":"B8","team":"B","role":"ST","x":0.52,"y":0.64,"player_id":null}
  ]'::jsonb;
  WHEN 10 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.04,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.16,"y":0.18,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.16,"y":0.4,"player_id":null},
    {"id":"A3","team":"A","role":"CB","x":0.16,"y":0.6,"player_id":null},
    {"id":"A4","team":"A","role":"RB","x":0.16,"y":0.82,"player_id":null},
    {"id":"A5","team":"A","role":"LM","x":0.32,"y":0.25,"player_id":null},
    {"id":"A6","team":"A","role":"CM","x":0.32,"y":0.5,"player_id":null},
    {"id":"A7","team":"A","role":"RM","x":0.32,"y":0.75,"player_id":null},
    {"id":"A8","team":"A","role":"ST","x":0.48,"y":0.4,"player_id":null},
    {"id":"A9","team":"A","role":"ST","x":0.48,"y":0.6,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.96,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.84,"y":0.18,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.84,"y":0.4,"player_id":null},
    {"id":"B3","team":"B","role":"CB","x":0.84,"y":0.6,"player_id":null},
    {"id":"B4","team":"B","role":"RB","x":0.84,"y":0.82,"player_id":null},
    {"id":"B5","team":"B","role":"LM","x":0.68,"y":0.25,"player_id":null},
    {"id":"B6","team":"B","role":"CM","x":0.68,"y":0.5,"player_id":null},
    {"id":"B7","team":"B","role":"RM","x":0.68,"y":0.75,"player_id":null},
    {"id":"B8","team":"B","role":"ST","x":0.52,"y":0.4,"player_id":null},
    {"id":"B9","team":"B","role":"ST","x":0.52,"y":0.6,"player_id":null}
  ]'::jsonb;
  WHEN 11 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.04,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.15,"y":0.15,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.15,"y":0.38,"player_id":null},
    {"id":"A3","team":"A","role":"CB","x":0.15,"y":0.62,"player_id":null},
    {"id":"A4","team":"A","role":"RB","x":0.15,"y":0.85,"player_id":null},
    {"id":"A5","team":"A","role":"LM","x":0.30,"y":0.25,"player_id":null},
    {"id":"A6","team":"A","role":"CM","x":0.30,"y":0.5,"player_id":null},
    {"id":"A7","team":"A","role":"RM","x":0.30,"y":0.75,"player_id":null},
    {"id":"A8","team":"A","role":"LW","x":0.46,"y":0.22,"player_id":null},
    {"id":"A9","team":"A","role":"ST","x":0.46,"y":0.5,"player_id":null},
    {"id":"A10","team":"A","role":"RW","x":0.46,"y":0.78,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.96,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.85,"y":0.15,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.85,"y":0.38,"player_id":null},
    {"id":"B3","team":"B","role":"CB","x":0.85,"y":0.62,"player_id":null},
    {"id":"B4","team":"B","role":"RB","x":0.85,"y":0.85,"player_id":null},
    {"id":"B5","team":"B","role":"LM","x":0.70,"y":0.25,"player_id":null},
    {"id":"B6","team":"B","role":"CM","x":0.70,"y":0.5,"player_id":null},
    {"id":"B7","team":"B","role":"RM","x":0.70,"y":0.75,"player_id":null},
    {"id":"B8","team":"B","role":"LW","x":0.54,"y":0.22,"player_id":null},
    {"id":"B9","team":"B","role":"ST","x":0.54,"y":0.5,"player_id":null},
    {"id":"B10","team":"B","role":"RW","x":0.54,"y":0.78,"player_id":null}
  ]'::jsonb;
  ELSE
    -- Запасной для нестандартных: линейная сетка без ролей
    v := '[]'::jsonb;
    FOR i IN 0..(p_size - 1) LOOP
      v := v || jsonb_build_array(
        jsonb_build_object('id','A' || i, 'team','A', 'role','??', 'x', 0.1 + 0.3*i::float/p_size, 'y', 0.2 + 0.6*i::float/p_size, 'player_id', null),
        jsonb_build_object('id','B' || i, 'team','B', 'role','??', 'x', 0.9 - 0.3*i::float/p_size, 'y', 0.2 + 0.6*i::float/p_size, 'player_id', null)
      );
    END LOOP;
  END CASE;
  RETURN v;
END;
$fn$;

-- ============================================================
-- Тестовый посев: одной кнопкой создаёт N фейковых игроков,
-- засылает их в game_participants со статусом paid=true.
-- Используется ТОЛЬКО для отладки драфта одним аккаунтом-админом.
-- Все юзеры с email '%@af-sport.local' — это тестовые.
-- Очищать через cleanup_test_users().
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_test_participants(
  p_game_id uuid,
  p_count int
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_game record;
  v_taken int;
  v_to_add int;
  v_new_uid uuid;
  v_seeded int := 0;
  v_email text;
  v_display text;
  v_first_names text[] := ARRAY['Артём','Дэн','Кирилл','Лёха','Макс','Никита','Олег','Паша','Рома','Серёга','Тимур','Влад','Жека','Костя','Игорь','Толя','Гена','Витя','Антон','Слава'];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, organizer_id, slots_total FROM games WHERE id = p_game_id INTO v_game;
  IF v_game.id IS NULL THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF v_game.organizer_id <> v_uid THEN RAISE EXCEPTION 'Only organizer can seed'; END IF;
  IF p_count IS NULL OR p_count <= 0 OR p_count > 30 THEN
    RAISE EXCEPTION 'Bad p_count (1..30)';
  END IF;

  SELECT count(*) INTO v_taken FROM game_participants WHERE game_id = p_game_id;
  v_to_add := LEAST(p_count, v_game.slots_total - v_taken);
  IF v_to_add <= 0 THEN
    RETURN json_build_object('ok', true, 'seeded', 0, 'reason', 'Full');
  END IF;

  FOR i IN 1..v_to_add LOOP
    v_new_uid := gen_random_uuid();
    v_email := 'test_' || replace(v_new_uid::text, '-', '') || '@af-sport.local';
    v_display := v_first_names[1 + ((random()*array_length(v_first_names,1))::int % array_length(v_first_names,1))]
                 || ' #' || (1000 + (random()*9000)::int)::text;

    -- 1) auth.users
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data,
      created_at, updated_at,
      is_super_admin, is_sso_user
    ) VALUES (
      v_new_uid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated', 'authenticated', v_email,
      crypt('testpass_' || v_new_uid::text, gen_salt('bf')),
      now(),
      jsonb_build_object('display_name', v_display),
      '{"provider":"email","providers":["email"]}'::jsonb,
      now(), now(),
      false, false
    );
    -- Триггер handle_new_user должен сам создать profile,
    -- но на всякий случай — INSERT с ON CONFLICT.
    INSERT INTO public.profiles (id, display_name)
    VALUES (v_new_uid, v_display)
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

    -- 2) game_participants с paid=true
    INSERT INTO public.game_participants (game_id, user_id, paid)
    VALUES (p_game_id, v_new_uid, true);

    v_seeded := v_seeded + 1;
  END LOOP;

  RETURN json_build_object('ok', true, 'seeded', v_seeded);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.seed_test_participants(uuid, int) TO authenticated;

-- ============================================================
-- Очистка всех тестовых юзеров. Безопасно: удаляет только
-- юзеров с email '%@af-sport.local'. Их participants/profiles
-- уйдут каскадом по FK.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_test_users()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_uid uuid := auth.uid(); v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  -- Доступ — любому залогиненному админу игры
  -- (тонкая защита не критична — тестовая утилита).
  DELETE FROM auth.users WHERE email LIKE '%@af-sport.local';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('ok', true, 'deleted', v_count);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.cleanup_test_users() TO authenticated;
