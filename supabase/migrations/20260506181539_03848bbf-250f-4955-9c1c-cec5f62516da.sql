ALTER TABLE public.games ADD COLUMN is_private boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_games_is_private ON public.games(is_private);

-- Replace public read policy with privacy-aware one
DROP POLICY IF EXISTS "games readable by all" ON public.games;

-- Public games visible to everyone
CREATE POLICY "public games readable by all"
ON public.games FOR SELECT
USING (is_private = false);

-- Private games: organizer + participants can see them in lists
CREATE POLICY "private games readable by organizer"
ON public.games FOR SELECT
USING (is_private = true AND auth.uid() = organizer_id);

CREATE POLICY "private games readable by participants"
ON public.games FOR SELECT
USING (
  is_private = true
  AND EXISTS (
    SELECT 1 FROM public.game_participants p
    WHERE p.game_id = games.id AND p.user_id = auth.uid()
  )
);

-- Private games: any authenticated user can read by direct id (for invite links)
CREATE POLICY "private games readable by authenticated via link"
ON public.games FOR SELECT
TO authenticated
USING (is_private = true);