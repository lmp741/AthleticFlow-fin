-- 1. Username on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

-- Unique case-insensitive index
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles ((lower(username)))
  WHERE username IS NOT NULL;

-- Format check via trigger (CHECK with regex is fine but trigger is more flexible)
CREATE OR REPLACE FUNCTION public.validate_profile_username()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    IF NEW.username !~ '^[A-Za-z0-9_]{3,24}$' THEN
      RAISE EXCEPTION 'Никнейм должен быть 3–24 символа: латиница, цифры, _';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validate_username ON public.profiles;
CREATE TRIGGER profiles_validate_username
BEFORE INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_username();

-- 2. Ratings table
CREATE TABLE IF NOT EXISTS public.user_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id uuid NOT NULL,
  ratee_id uuid NOT NULL,
  game_id uuid NOT NULL,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_ratings_no_self CHECK (rater_id <> ratee_id),
  CONSTRAINT user_ratings_unique UNIQUE (rater_id, ratee_id, game_id)
);

CREATE INDEX IF NOT EXISTS user_ratings_ratee_idx ON public.user_ratings(ratee_id);
CREATE INDEX IF NOT EXISTS user_ratings_game_idx ON public.user_ratings(game_id);

ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- Helper: check rater & ratee both linked to the game (organizer or participant), and game has ended
CREATE OR REPLACE FUNCTION public.can_rate_after_game(
  _rater uuid, _ratee uuid, _game uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = _game
      AND g.ends_at < now()
      AND (
        g.organizer_id = _rater
        OR EXISTS (SELECT 1 FROM public.game_participants p WHERE p.game_id = _game AND p.user_id = _rater)
      )
      AND (
        g.organizer_id = _ratee
        OR EXISTS (SELECT 1 FROM public.game_participants p WHERE p.game_id = _game AND p.user_id = _ratee)
      )
  );
$$;

CREATE POLICY "ratings readable by all"
ON public.user_ratings FOR SELECT
USING (true);

CREATE POLICY "rate after game"
ON public.user_ratings FOR INSERT
WITH CHECK (
  auth.uid() = rater_id
  AND public.can_rate_after_game(rater_id, ratee_id, game_id)
);

CREATE POLICY "update own rating"
ON public.user_ratings FOR UPDATE
USING (auth.uid() = rater_id)
WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "delete own rating"
ON public.user_ratings FOR DELETE
USING (auth.uid() = rater_id);

CREATE TRIGGER user_ratings_set_updated_at
BEFORE UPDATE ON public.user_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Username availability helper (case-insensitive)
CREATE OR REPLACE FUNCTION public.username_available(_username text, _exclude uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(_username)
      AND (_exclude IS NULL OR id <> _exclude)
  );
$$;
