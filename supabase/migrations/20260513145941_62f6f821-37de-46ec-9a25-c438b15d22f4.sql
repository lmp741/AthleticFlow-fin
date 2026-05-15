
-- Numeric immutable ID for profiles
CREATE SEQUENCE IF NOT EXISTS public.profiles_numeric_id_seq START 100001;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS numeric_id BIGINT UNIQUE DEFAULT nextval('public.profiles_numeric_id_seq');

ALTER SEQUENCE public.profiles_numeric_id_seq OWNED BY public.profiles.numeric_id;

-- Backfill any existing NULLs
UPDATE public.profiles SET numeric_id = nextval('public.profiles_numeric_id_seq') WHERE numeric_id IS NULL;

ALTER TABLE public.profiles ALTER COLUMN numeric_id SET NOT NULL;

-- Prevent changing numeric_id after insert
CREATE OR REPLACE FUNCTION public.prevent_numeric_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.numeric_id IS DISTINCT FROM OLD.numeric_id THEN
    RAISE EXCEPTION 'numeric_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_numeric_id_immutable ON public.profiles;
CREATE TRIGGER profiles_numeric_id_immutable
BEFORE UPDATE OF numeric_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_numeric_id_change();

-- handle_new_user already inserts row; numeric_id is auto-assigned via DEFAULT.
