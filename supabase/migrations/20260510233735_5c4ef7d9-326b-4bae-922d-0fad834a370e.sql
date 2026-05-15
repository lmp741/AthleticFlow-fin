
-- ============ friendships ============
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
CREATE INDEX idx_friendships_req ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addr ON public.friendships(addressee_id);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendship visible to parties"
ON public.friendships FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "user sends friend request"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = requester_id AND requester_id <> addressee_id);

CREATE POLICY "either party updates friendship"
ON public.friendships FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "either party deletes friendship"
ON public.friendships FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER trg_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ are_friends helper ============
CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a)
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;

-- ============ direct_messages ============
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text,
  image_url text,
  video_url text,
  document_url text,
  document_name text,
  location_lat double precision,
  location_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX idx_dm_pair ON public.direct_messages(sender_id, recipient_id, created_at);
CREATE INDEX idx_dm_recipient ON public.direct_messages(recipient_id, created_at);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm visible to parties"
ON public.direct_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "friends can send dm"
ON public.direct_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.are_friends(sender_id, recipient_id)
);

CREATE POLICY "recipient marks read"
ON public.direct_messages FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "sender deletes own dm"
ON public.direct_messages FOR DELETE
USING (auth.uid() = sender_id);

-- ============ realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;

-- ============ storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-media', 'dm-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "dm-media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'dm-media');

CREATE POLICY "dm-media user upload own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dm-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "dm-media user delete own folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'dm-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
