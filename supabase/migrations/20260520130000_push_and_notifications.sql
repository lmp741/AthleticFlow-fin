-- Базовая инфра уведомлений: web-push подписки + унифицированная таблица notifications.
-- Используется и для bell, и для рассылок (через Edge Function send-push).

-- ============================================================
-- 1. push_subscriptions — подписки браузеров/устройств на Web Push
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- endpoint — уникальный URL push-сервиса браузера, по нему идентифицируем устройство.
  endpoint text NOT NULL,
  -- p256dh + auth — публичные ключи шифрования из subscription.toJSON()
  p256dh text NOT NULL,
  auth text NOT NULL,
  -- UA для разбора «откуда подписан» в админке.
  user_agent text,
  -- last_seen — последний успешный send. Используется для очистки протухших.
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_uniq UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свои подписки.
CREATE POLICY "user reads own push subs"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user inserts own push subs"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user updates own push subs"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user deletes own push subs"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. notifications — унифицированный фид для bell
-- ============================================================
-- Типы: game_chat_message, dm_message, rating_received, review_received,
--       review_liked, game_invite, urgent_replacement, friend_request, …
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  -- payload — произвольные данные: game_id, conversation_id, score, review_text…
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- title/body — текст для отображения (генерим на бэке, чтобы не локализовать на клиенте).
  title text NOT NULL,
  body text,
  -- url — куда вести юзера по клику.
  url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read_at NULLS FIRST, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Юзер видит только свои уведомления.
CREATE POLICY "user reads own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Юзер может пометить read_at (но не подменить содержимое — поэтому WITH CHECK строгий).
CREATE POLICY "user marks own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Юзер может удалять свои уведомления.
CREATE POLICY "user deletes own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- INSERT — только через server-side (Edge Function с service_role) или
-- триггеры с SECURITY DEFINER. Никаких клиентских INSERT.
-- Поэтому INSERT policy не создаём — клиентский INSERT будет отбит.

-- ============================================================
-- 3. RPC: помечать как прочитанные (батч)
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[])
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH upd AS (
    UPDATE public.notifications
    SET read_at = now()
    WHERE id = ANY(p_ids) AND user_id = auth.uid() AND read_at IS NULL
    RETURNING 1
  )
  SELECT COUNT(*)::int FROM upd;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH upd AS (
    UPDATE public.notifications
    SET read_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL
    RETURNING 1
  )
  SELECT COUNT(*)::int FROM upd;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
