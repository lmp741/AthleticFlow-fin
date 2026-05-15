
-- 1. chat_user_state
CREATE TABLE public.chat_user_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id uuid null references public.conversations(id) on delete cascade,
  peer_id uuid null,
  archived boolean not null default false,
  hidden boolean not null default false,
  alias text null,
  updated_at timestamptz not null default now(),
  CONSTRAINT chat_user_state_target_check CHECK ((conversation_id IS NULL) <> (peer_id IS NULL))
);
CREATE UNIQUE INDEX chat_user_state_conv_uniq
  ON public.chat_user_state(user_id, conversation_id)
  WHERE conversation_id IS NOT NULL;
CREATE UNIQUE INDEX chat_user_state_peer_uniq
  ON public.chat_user_state(user_id, peer_id)
  WHERE peer_id IS NOT NULL;

ALTER TABLE public.chat_user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own state"
  ON public.chat_user_state FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user inserts own state"
  ON public.chat_user_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user updates own state"
  ON public.chat_user_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user deletes own state"
  ON public.chat_user_state FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_chat_user_state_updated
  BEFORE UPDATE ON public.chat_user_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. conversations.is_self
ALTER TABLE public.conversations
  ADD COLUMN is_self boolean NOT NULL DEFAULT false;

-- 3. edited_at / deleted_at on messages
ALTER TABLE public.conversation_messages
  ADD COLUMN edited_at timestamptz NULL,
  ADD COLUMN deleted_at timestamptz NULL;

ALTER TABLE public.direct_messages
  ADD COLUMN edited_at timestamptz NULL,
  ADD COLUMN deleted_at timestamptz NULL;

-- 4. allow author to edit own messages
CREATE POLICY "sender updates own conv message"
  ON public.conversation_messages
  FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "sender updates own dm"
  ON public.direct_messages
  FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- 5. allow either party to delete a DM
CREATE POLICY "either party deletes dm"
  ON public.direct_messages
  FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- 6. unhide on new message
CREATE OR REPLACE FUNCTION public.dm_unhide_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_user_state
     SET hidden = false
   WHERE hidden = true
     AND (
       (user_id = NEW.sender_id    AND peer_id = NEW.recipient_id)
       OR
       (user_id = NEW.recipient_id AND peer_id = NEW.sender_id)
     );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dm_unhide
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.dm_unhide_on_new_message();

CREATE OR REPLACE FUNCTION public.conv_unhide_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_user_state
     SET hidden = false
   WHERE hidden = true
     AND conversation_id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_conv_unhide
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.conv_unhide_on_new_message();

-- 7. profiles.phone_public
ALTER TABLE public.profiles
  ADD COLUMN phone_public boolean NOT NULL DEFAULT false;
