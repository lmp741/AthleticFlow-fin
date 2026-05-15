ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS chat_display text NOT NULL DEFAULT 'name';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_chat_display_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_chat_display_check CHECK (chat_display IN ('name','nickname'));