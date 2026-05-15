
-- ============ profile_media ============
CREATE TABLE public.profile_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  url text NOT NULL,
  storage_path text,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profile_media_user ON public.profile_media(user_id, created_at DESC);
ALTER TABLE public.profile_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile media readable by all"
ON public.profile_media FOR SELECT USING (true);

CREATE POLICY "user inserts own media"
ON public.profile_media FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user deletes own media"
ON public.profile_media FOR DELETE USING (auth.uid() = user_id);

-- ============ goal_claims ============
CREATE TABLE public.goal_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  count integer NOT NULL CHECK (count > 0 AND count <= 50),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id)
);
CREATE INDEX idx_goal_claims_user ON public.goal_claims(user_id);
CREATE INDEX idx_goal_claims_game ON public.goal_claims(game_id);
ALTER TABLE public.goal_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal claims readable by all"
ON public.goal_claims FOR SELECT USING (true);

CREATE POLICY "participant claims own goals after game"
ON public.goal_claims FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = game_id
      AND g.ends_at < now()
      AND (
        g.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.game_participants p WHERE p.game_id = g.id AND p.user_id = auth.uid())
      )
  )
);

CREATE POLICY "user deletes own pending claim"
ON public.goal_claims FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');

-- ============ goal_claim_approvals ============
CREATE TABLE public.goal_claim_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.goal_claims(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (claim_id, approver_id)
);
CREATE INDEX idx_goal_claim_approvals_claim ON public.goal_claim_approvals(claim_id);
ALTER TABLE public.goal_claim_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals readable by all"
ON public.goal_claim_approvals FOR SELECT USING (true);

CREATE POLICY "teammate approves claim"
ON public.goal_claim_approvals FOR INSERT
WITH CHECK (
  auth.uid() = approver_id
  AND EXISTS (
    SELECT 1
    FROM public.goal_claims c
    JOIN public.games g ON g.id = c.game_id
    WHERE c.id = claim_id
      AND c.user_id <> auth.uid()
      AND (
        g.organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.game_participants p WHERE p.game_id = g.id AND p.user_id = auth.uid())
      )
  )
);

CREATE POLICY "user removes own approval"
ON public.goal_claim_approvals FOR DELETE USING (auth.uid() = approver_id);

-- ============ auto-approve trigger ============
CREATE OR REPLACE FUNCTION public.check_goal_claim_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.goal_claim_approvals WHERE claim_id = NEW.claim_id;
  IF cnt >= 3 THEN
    UPDATE public.goal_claims SET status = 'approved' WHERE id = NEW.claim_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_goal_claim_approval
AFTER INSERT ON public.goal_claim_approvals
FOR EACH ROW EXECUTE FUNCTION public.check_goal_claim_approval();

-- ============ storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-media', 'profile-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "profile-media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-media');

CREATE POLICY "profile-media user upload own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "profile-media user delete own folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
