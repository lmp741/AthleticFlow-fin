-- Лайки/дизлайки на отзывы в user_ratings + RPC для отправки уведомления
-- получателю оценки.

-- ============================================================
-- 1. rating_review_votes — голоса на отзывы
-- ============================================================
-- value: +1 (лайк) или -1 (дизлайк). UNIQUE по (rating_id, voter_id) —
-- один человек может голосовать только один раз, повторное голосование
-- перезаписывает значение.
CREATE TABLE IF NOT EXISTS public.rating_review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id uuid NOT NULL REFERENCES public.user_ratings(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rating_review_votes_uniq UNIQUE (rating_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_rating_votes_rating
  ON public.rating_review_votes(rating_id);

ALTER TABLE public.rating_review_votes ENABLE ROW LEVEL SECURITY;

-- Голоса видят все авторизованные (нужны агрегаты на UI).
CREATE POLICY "authenticated reads votes"
  ON public.rating_review_votes FOR SELECT
  TO authenticated
  USING (true);

-- Голосовать может любой авторизованный, но не сам за себя:
-- проверка через подзапрос — voter не должен быть rater исходной оценки.
CREATE POLICY "user inserts own vote"
  ON public.rating_review_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_ratings ur
      WHERE ur.id = rating_id AND ur.rater_id = auth.uid()
    )
  );

CREATE POLICY "user updates own vote"
  ON public.rating_review_votes FOR UPDATE
  USING (auth.uid() = voter_id)
  WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "user deletes own vote"
  ON public.rating_review_votes FOR DELETE
  USING (auth.uid() = voter_id);

-- ============================================================
-- 2. RPC: помочь клиенту проголосовать одним вызовом (upsert)
-- ============================================================
CREATE OR REPLACE FUNCTION public.vote_rating_review(
  p_rating_id uuid,
  p_value smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rater uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_value NOT IN (-1, 0, 1) THEN
    RAISE EXCEPTION 'Bad value';
  END IF;

  SELECT rater_id INTO v_rater FROM public.user_ratings WHERE id = p_rating_id;
  IF v_rater IS NULL THEN
    RAISE EXCEPTION 'Rating not found';
  END IF;
  IF v_rater = v_uid THEN
    RAISE EXCEPTION 'Cannot vote on own review';
  END IF;

  IF p_value = 0 THEN
    -- Отмена голоса
    DELETE FROM public.rating_review_votes
    WHERE rating_id = p_rating_id AND voter_id = v_uid;
  ELSE
    INSERT INTO public.rating_review_votes (rating_id, voter_id, value)
    VALUES (p_rating_id, v_uid, p_value)
    ON CONFLICT (rating_id, voter_id) DO UPDATE SET value = EXCLUDED.value, created_at = now();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_rating_review(uuid, smallint) TO authenticated;

-- ============================================================
-- 3. RPC: вставить уведомление другому пользователю
-- ============================================================
-- Универсальный «шлёпни в notifications за меня» — клиент использует, когда
-- хочет уведомить кого-то о действии (оставил оценку, поставил лайк отзыву,
-- пригласил в игру). Внутри проверяем что вызывающий имеет право —
-- сейчас МVP-проверка: not_to_self + только разрешённые типы.
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

  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  VALUES (p_user_id, p_type, p_title, p_body, p_url, p_payload)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_notification(uuid, text, text, text, text, jsonb) TO authenticated;
