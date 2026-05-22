-- Автоматическая отправка Web Push для продуктовых событий.
-- Использует pg_net для HTTP POST к Edge Function send-push.
--
-- ВАЖНО: pg_net должен быть включён в
-- Supabase Dashboard → Database → Extensions → pg_net → Enable.
--
-- Если pg_net НЕ включён — триггеры создадутся, bell-уведомления будут
-- работать, но Web Push НЕ полетит (тихий RAISE NOTICE).

-- ============================================================
-- 0. pg_net extension
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- 1. Хелпер: вызвать send-push через pg_net
-- ============================================================
-- Общая функция, которую вызывают все триггеры и RPC.
-- Принимает массив user_ids и контент уведомления.
-- skip_notification_insert=true, потому что INSERT в notifications
-- делается вызывающим кодом (триггер/RPC) ДО вызова этой функции.

CREATE OR REPLACE FUNCTION public.invoke_send_push(
  p_user_ids uuid[],
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_url text DEFAULT '/',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_body jsonb;
  v_user_ids_jsonb jsonb;
BEGIN
  -- Попытка получить URL и ключ из настроек
  BEGIN
    v_supabase_url := COALESCE(
      current_setting('app.settings.supabase_url', true),
      current_setting('supabase.url', true)
    );
    v_service_role_key := COALESCE(
      current_setting('app.settings.service_role_key', true),
      current_setting('supabase.service_role_key', true)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'invoke_send_push: cannot read config, skipping';
    RETURN;
  END;

  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE NOTICE 'invoke_send_push: supabase_url or service_role_key not set';
    RETURN;
  END IF;

  -- Конвертируем uuid[] в jsonb array строк
  SELECT jsonb_agg(u::text) INTO v_user_ids_jsonb FROM unnest(p_user_ids) AS u;

  v_body := jsonb_build_object(
    'user_ids', v_user_ids_jsonb,
    'type',     p_type,
    'title',    p_title,
    'body',     COALESCE(p_body, ''),
    'url',      COALESCE(p_url, '/'),
    'payload',  COALESCE(p_payload, '{}'::jsonb),
    'skip_notification_insert', true
  );

  BEGIN
    PERFORM net.http_post(
      url     := v_supabase_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_role_key,
        'Content-Type',  'application/json'
      ),
      body    := v_body
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'invoke_send_push: pg_net failed: %', SQLERRM;
  END;
END;
$$;

-- ============================================================
-- 2. Триггер на game_messages → уведомить участников чата
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_game_message_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_game record;
  v_targets uuid[];
BEGIN
  SELECT COALESCE(display_name, username, 'Игрок') INTO v_sender_name
  FROM public.profiles WHERE id = NEW.user_id;

  SELECT g.sport, g.organizer_id INTO v_game
  FROM public.games g WHERE g.id = NEW.game_id;

  IF v_game IS NULL THEN RETURN NEW; END IF;

  -- Все участники + организатор, кроме автора
  SELECT array_agg(DISTINCT uid) INTO v_targets
  FROM (
    SELECT user_id AS uid FROM public.game_participants WHERE game_id = NEW.game_id
    UNION ALL
    SELECT v_game.organizer_id AS uid
  ) AS all_users
  WHERE uid <> NEW.user_id;

  IF v_targets IS NULL OR array_length(v_targets, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bell (INSERT в notifications)
  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  SELECT
    t,
    'game_chat_message',
    v_sender_name || ' · чат игры',
    LEFT(COALESCE(NEW.body, '📷 Фото'), 120),
    '/games/' || NEW.game_id,
    jsonb_build_object('game_id', NEW.game_id, 'message_id', NEW.id)
  FROM unnest(v_targets) AS t;

  -- Web Push
  PERFORM public.invoke_send_push(
    v_targets,
    'game_chat_message',
    v_sender_name || ' · чат игры',
    LEFT(COALESCE(NEW.body, '📷 Фото'), 120),
    '/games/' || NEW.game_id,
    jsonb_build_object('game_id', NEW.game_id, 'message_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_game_message_notify ON public.game_messages;

CREATE TRIGGER trg_game_message_notify
  AFTER INSERT ON public.game_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_game_message_notify();

-- ============================================================
-- 3. Триггер на user_ratings → уведомить получателя оценки
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_rating_received_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rater_name text;
  v_title text;
  v_body text;
BEGIN
  IF NEW.rater_id = NEW.ratee_id THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Игрок') INTO v_rater_name
  FROM public.profiles WHERE id = NEW.rater_id;

  v_title := 'Тебя оценил партнёр — ' || NEW.score || ' ★';
  v_body  := CASE WHEN NEW.comment IS NOT NULL THEN LEFT(NEW.comment, 200) ELSE NULL END;

  -- Bell
  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  VALUES (
    NEW.ratee_id,
    'rating_received',
    v_title,
    v_body,
    '/profile',
    jsonb_build_object('game_id', NEW.game_id, 'score', NEW.score, 'rater_id', NEW.rater_id)
  );

  -- Web Push
  PERFORM public.invoke_send_push(
    ARRAY[NEW.ratee_id],
    'rating_received',
    v_title,
    v_body,
    '/profile',
    jsonb_build_object('game_id', NEW.game_id, 'score', NEW.score, 'rater_id', NEW.rater_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rating_received_notify ON public.user_ratings;

CREATE TRIGGER trg_rating_received_notify
  AFTER INSERT ON public.user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_rating_received_notify();

-- ============================================================
-- 4. Модифицируем request_urgent_replacement — добавить Web Push
-- ============================================================
-- Добавляем вызов invoke_send_push в конец RPC.
-- (INSERT в notifications там уже есть)
CREATE OR REPLACE FUNCTION public.request_urgent_replacement(p_game_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_game record;
  v_recent timestamptz;
  v_targets uuid[];
  v_count int;
  v_url text;
  v_title text;
  v_body_text text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT g.id, g.sport, g.stadium_id, g.starts_at, g.organizer_id, g.slots_total, g.is_private,
         s.name AS stadium_name
  INTO v_game
  FROM public.games g
  LEFT JOIN public.stadiums s ON s.id = g.stadium_id
  WHERE g.id = p_game_id;

  IF v_game.id IS NULL THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_uid <> v_game.organizer_id
     AND NOT EXISTS (
       SELECT 1 FROM public.game_participants p
       WHERE p.game_id = p_game_id AND p.user_id = v_uid
     ) THEN
    RAISE EXCEPTION 'Only organizer or participant can request replacement';
  END IF;

  IF v_game.starts_at < now() THEN
    RAISE EXCEPTION 'Game already started or finished';
  END IF;

  SELECT MAX(created_at) INTO v_recent
  FROM public.urgent_replacement_log
  WHERE game_id = p_game_id;
  IF v_recent IS NOT NULL AND v_recent > now() - interval '1 hour' THEN
    RAISE EXCEPTION 'Replacement was requested recently. Try again later.';
  END IF;

  SELECT array_agg(DISTINCT gp.user_id) INTO v_targets
  FROM public.game_participants gp
  JOIN public.games g2 ON g2.id = gp.game_id
  WHERE g2.stadium_id = v_game.stadium_id
    AND g2.sport = v_game.sport
    AND g2.starts_at > now() - interval '60 days'
    AND gp.user_id <> v_game.organizer_id
    AND NOT EXISTS (
      SELECT 1 FROM public.game_participants cur
      WHERE cur.game_id = p_game_id AND cur.user_id = gp.user_id
    );

  v_count := COALESCE(array_length(v_targets, 1), 0);

  IF v_count > 0 THEN
    v_url := '/games/' || p_game_id::text;
    v_title := 'Нужна замена · ' || v_game.sport;
    v_body_text := 'На «' || COALESCE(v_game.stadium_name, 'стадионе') || '» ищут игрока · ' ||
      to_char(v_game.starts_at AT TIME ZONE 'Europe/Moscow', 'DD.MM HH24:MI');

    -- Bell
    INSERT INTO public.notifications (user_id, type, title, body, url, payload)
    SELECT
      t,
      'urgent_replacement',
      v_title,
      v_body_text,
      v_url,
      jsonb_build_object('game_id', p_game_id, 'sport', v_game.sport, 'stadium_id', v_game.stadium_id)
    FROM unnest(v_targets) AS t;

    -- Web Push
    PERFORM public.invoke_send_push(
      v_targets,
      'urgent_replacement',
      v_title,
      v_body_text,
      v_url,
      jsonb_build_object('game_id', p_game_id, 'sport', v_game.sport, 'stadium_id', v_game.stadium_id)
    );
  END IF;

  INSERT INTO public.urgent_replacement_log (game_id, requested_by, recipients_count)
  VALUES (p_game_id, v_uid, v_count);

  RETURN json_build_object('recipients_count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_urgent_replacement(uuid) TO authenticated;

-- ============================================================
-- 5. Модифицируем enqueue_notification — добавить Web Push
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_url text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_user_id IS NULL OR p_user_id = v_uid THEN
    RAISE EXCEPTION 'Bad target';
  END IF;
  IF p_type NOT IN (
    'rating_received',
    'review_liked',
    'game_invite',
    'game_chat_message'
  ) THEN
    RAISE EXCEPTION 'Type not allowed';
  END IF;

  -- Bell
  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  VALUES (p_user_id, p_type, p_title, p_body, p_url, p_payload)
  RETURNING id INTO v_id;

  -- Web Push
  PERFORM public.invoke_send_push(
    ARRAY[p_user_id],
    p_type,
    p_title,
    p_body,
    p_url,
    p_payload
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_notification(uuid, text, text, text, text, jsonb) TO authenticated;
