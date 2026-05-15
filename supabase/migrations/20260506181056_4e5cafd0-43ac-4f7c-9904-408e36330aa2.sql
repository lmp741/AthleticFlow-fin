-- Add image support to chat messages
ALTER TABLE public.game_messages ADD COLUMN image_url text;
ALTER TABLE public.game_messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE public.game_messages ADD CONSTRAINT game_messages_body_or_image CHECK (
  (body IS NOT NULL AND length(btrim(body)) > 0) OR image_url IS NOT NULL
);

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Chat images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- Authenticated users upload to their own folder /{game_id}/{user_id}/...
CREATE POLICY "Users upload own chat images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users update own chat images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users delete own chat images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);