-- Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Members
CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_conv_members_conv ON public.conversation_members(conversation_id);
CREATE INDEX idx_conv_members_user ON public.conversation_members(user_id);
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- Helper: is member?
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conv AND user_id = _user
  );
$$;

-- Conversations policies
CREATE POLICY "conv visible to members" ON public.conversations
FOR SELECT USING (public.is_conversation_member(id, auth.uid()));

CREATE POLICY "user creates conversation" ON public.conversations
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "creator deletes conversation" ON public.conversations
FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "member updates conversation" ON public.conversations
FOR UPDATE USING (public.is_conversation_member(id, auth.uid()))
WITH CHECK (public.is_conversation_member(id, auth.uid()));

-- Members policies
CREATE POLICY "members visible to members" ON public.conversation_members
FOR SELECT USING (public.is_conversation_member(conversation_id, auth.uid()));

-- Creator inserts themselves on creation; existing members invite friends
CREATE POLICY "creator adds self" ON public.conversation_members
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND c.created_by = auth.uid()
  )
);

CREATE POLICY "member invites friend" ON public.conversation_members
FOR INSERT WITH CHECK (
  public.is_conversation_member(conversation_id, auth.uid())
  AND public.are_friends(auth.uid(), user_id)
);

CREATE POLICY "user leaves conversation" ON public.conversation_members
FOR DELETE USING (auth.uid() = user_id);

-- Messages
CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text,
  image_url text,
  video_url text,
  document_url text,
  document_name text,
  location_lat double precision,
  location_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_conv_msgs_conv_created ON public.conversation_messages(conversation_id, created_at);
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msgs visible to members" ON public.conversation_messages
FOR SELECT USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "members send messages" ON public.conversation_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "sender deletes own message" ON public.conversation_messages
FOR DELETE USING (auth.uid() = sender_id);

-- Touch updated_at on new message
CREATE OR REPLACE FUNCTION public.touch_conversation_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_touch_conv_on_msg
AFTER INSERT ON public.conversation_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;