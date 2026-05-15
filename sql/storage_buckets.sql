-- =============================================================
-- Athletic Flow — Supabase Storage buckets + policies
-- =============================================================
-- Применять в Supabase SQL Editor.
-- Без этих buckets падает upload аватаров, фото в чате и медиа в личках.
-- Идемпотентно.
-- =============================================================

-- ВНИМАНИЕ: после применения зайди в Supabase Dashboard → Storage →
-- убедись что 4 bucket'а появились в списке.

-- 1) Создаём buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-media', 'profile-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-media', 'dm-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Политики доступа

-- AVATARS: все могут читать, но писать может только владелец в свою папку <user_id>/...
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_write" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;

CREATE POLICY "avatars_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- PROFILE-MEDIA: то же самое — папка <user_id>/...
DROP POLICY IF EXISTS "profile_media_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_media_owner_write" ON storage.objects;
DROP POLICY IF EXISTS "profile_media_owner_delete" ON storage.objects;

CREATE POLICY "profile_media_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-media');

CREATE POLICY "profile_media_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile_media_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- CHAT-IMAGES (в чате игры): структура папок <gameId>/<userId>/...
-- Писать может только участник этой игры. Читать — все (это public bucket).
DROP POLICY IF EXISTS "chat_images_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_participant_write" ON storage.objects;

CREATE POLICY "chat_images_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

CREATE POLICY "chat_images_participant_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = ((storage.foldername(name))[1])::uuid
        AND (
          g.organizer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.game_participants gp
            WHERE gp.game_id = g.id AND gp.user_id = auth.uid()
          )
        )
    )
  );

-- DM-MEDIA (личные сообщения / dm и conversation): папка <userId>/...
-- Любой залогиненный может загружать в свою папку. Читать — публично.
DROP POLICY IF EXISTS "dm_media_read" ON storage.objects;
DROP POLICY IF EXISTS "dm_media_owner_write" ON storage.objects;

CREATE POLICY "dm_media_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dm-media');

CREATE POLICY "dm_media_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dm-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================
-- ВАЖНО: storage policies должны быть в схеме storage и работать
-- с storage.objects. RLS уже включён на этой таблице из коробки.
-- =============================================================
