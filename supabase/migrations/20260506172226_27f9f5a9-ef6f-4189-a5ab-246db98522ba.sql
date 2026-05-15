ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'verify',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own codes" ON public.phone_verifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user inserts own codes" ON public.phone_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user updates own codes" ON public.phone_verifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS phone_verifications_user_idx ON public.phone_verifications(user_id, created_at DESC);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_ru_check
  CHECK (phone IS NULL OR phone ~ '^\+7[0-9]{10}$') NOT VALID;