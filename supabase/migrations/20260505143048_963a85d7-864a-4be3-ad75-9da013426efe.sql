
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT;

CREATE POLICY "user updates own paid"
ON public.game_participants
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "organizer updates participant paid"
ON public.game_participants
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_participants.game_id AND g.organizer_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_participants.game_id AND g.organizer_id = auth.uid()));

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "users upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
