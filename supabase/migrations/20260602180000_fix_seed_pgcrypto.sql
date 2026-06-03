-- Чиним seed_test_participants: в self-hosted Supabase gen_salt/crypt
-- лежат в extensions схеме. SECURITY DEFINER с SET search_path=public
-- их не находит. Решение: extensions в search_path + страховочный
-- CREATE EXTENSION для случая если pgcrypto где-то выключен.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.seed_test_participants(
  p_game_id uuid,
  p_count int
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
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
      -- crypt/gen_salt теперь подхватываются из extensions
      extensions.crypt('testpass_' || v_new_uid::text, extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('display_name', v_display),
      '{"provider":"email","providers":["email"]}'::jsonb,
      now(), now(),
      false, false
    );
    INSERT INTO public.profiles (id, display_name)
    VALUES (v_new_uid, v_display)
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

    INSERT INTO public.game_participants (game_id, user_id, paid)
    VALUES (p_game_id, v_new_uid, true);

    v_seeded := v_seeded + 1;
  END LOOP;

  RETURN json_build_object('ok', true, 'seeded', v_seeded);
END;
$fn$;

-- cleanup_test_users — добавим тот же расширенный search_path для единообразия.
CREATE OR REPLACE FUNCTION public.cleanup_test_users()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE v_uid uuid := auth.uid(); v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM auth.users WHERE email LIKE '%@af-sport.local';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('ok', true, 'deleted', v_count);
END;
$fn$;

-- Просим PostgREST перечитать кэш функций (на всякий случай).
NOTIFY pgrst, 'reload schema';
