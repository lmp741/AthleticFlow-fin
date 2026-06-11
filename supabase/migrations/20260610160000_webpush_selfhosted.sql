-- ============================================================
-- Web Push на self-hosted (#5 + #21).
--
-- Архитектура: ОДИН триггер на INSERT INTO notifications шлёт пуш
-- через pg_net → Node endpoint /api/internal/send-push (web-push, VAPID).
-- Это автоматически покрывает ВСЕ типы уведомлений — текущие и будущие
-- (booking_created, series_*, game_cancelled, заявки, MVP-плашки и т.д.):
-- любой INSERT в notifications = bell + push.
--
-- Плюс отдельный триггер на direct_messages (DM не пишут в notifications).
--
-- Старый invoke_send_push (стучался в Cloud Edge Function) переведён
-- в no-op: его вызывающие триггеры сами вставляют строки в notifications,
-- так что пуш уйдёт через новый общий триггер — без дублей.
--
-- КОНФИГ (один раз, под psql на VPS; значения см. .env):
--   ALTER DATABASE postgres SET app.push_secret   = '<PUSH_INTERNAL_SECRET>';
--   ALTER DATABASE postgres SET app.push_endpoint = 'https://af-sport.ru/api/internal/send-push';
-- Без app.push_secret триггеры тихо пропускают отправку (bell работает).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- 1. Хелпер: отправить пуш одному пользователю через Node endpoint
-- ============================================================
CREATE OR REPLACE FUNCTION public.push_to_user(
  p_user_id uuid,
  p_title text,
  p_body text DEFAULT NULL,
  p_url text DEFAULT '/',
  p_tag text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_secret text;
  v_endpoint text;
BEGIN
  v_secret := current_setting('app.push_secret', true);
  IF v_secret IS NULL OR v_secret = '' THEN
    -- Пуш не настроен — не ошибка: bell-уведомления работают без него.
    RETURN;
  END IF;
  v_endpoint := COALESCE(
    NULLIF(current_setting('app.push_endpoint', true), ''),
    'https://af-sport.ru/api/internal/send-push'
  );

  BEGIN
    PERFORM net.http_post(
      url     := v_endpoint,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Push-Secret', v_secret
      ),
      body    := jsonb_build_object(
        'user_id', p_user_id,
        'title',   p_title,
        'body',    COALESCE(p_body, ''),
        'url',     COALESCE(p_url, '/'),
        'tag',     p_tag
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'push_to_user failed: %', SQLERRM;
  END;
END;
$fn$;

-- ============================================================
-- 2. Триггер: каждая строка notifications → пуш
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_notifications_push()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM public.push_to_user(
    NEW.user_id,
    NEW.title,
    NEW.body,
    COALESCE(NEW.url, '/'),
    NEW.type  -- tag = тип: одинаковые уведомления группируются в ОС
  );
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_notifications_push ON public.notifications;
CREATE TRIGGER trg_notifications_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notifications_push();

-- ============================================================
-- 3. Триггер: личное сообщение → пуш получателю
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_dm_push()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_sender text;
  v_preview text;
BEGIN
  SELECT COALESCE(display_name, username, 'Сообщение') INTO v_sender
  FROM public.profiles WHERE id = NEW.sender_id;

  v_preview := CASE
    WHEN NEW.body IS NOT NULL AND length(trim(NEW.body)) > 0
      THEN left(trim(NEW.body), 120)
    WHEN NEW.image_url IS NOT NULL THEN '📷 Фото'
    WHEN NEW.video_url IS NOT NULL THEN '🎥 Видео'
    WHEN NEW.document_url IS NOT NULL THEN '📎 Документ'
    WHEN NEW.location_lat IS NOT NULL THEN '📍 Геолокация'
    ELSE 'Новое сообщение'
  END;

  PERFORM public.push_to_user(
    NEW.recipient_id,
    v_sender,
    v_preview,
    '/friends/' || NEW.sender_id,
    'dm-' || NEW.sender_id  -- tag: новые сообщения от того же человека заменяют старый пуш
  );
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_dm_push ON public.direct_messages;
CREATE TRIGGER trg_dm_push
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_dm_push();

-- ============================================================
-- 4. invoke_send_push → no-op (deprecated)
-- ============================================================
-- Старые триггеры (trg_game_message_notify, trg_rating_received_notify)
-- вставляют строки в notifications САМИ и затем зовут invoke_send_push.
-- Пуш теперь уходит через trg_notifications_push — повторная отправка
-- из invoke дала бы дубли, поэтому гасим её.
CREATE OR REPLACE FUNCTION public.invoke_send_push(
  p_user_ids uuid[],
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_url text DEFAULT '/',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  -- DEPRECATED 10.06.2026: пуш шлёт trg_notifications_push.
  RETURN;
END;
$fn$;

-- ============================================================
-- 5. Разовая чистка: все существующие подписки подписаны СТАРЫМ
-- VAPID-ключом (Cloud-эра) — доставка на них невозможна (403),
-- и автоочистка по 404/410 их не словит. Сносим; клиент при включении
-- пушей в профиле пересоздаст подписку новым ключом (lib/push.ts
-- дополнительно сам пересоздаёт подписку при смене ключа).
-- ============================================================
DELETE FROM public.push_subscriptions;

NOTIFY pgrst, 'reload schema';
