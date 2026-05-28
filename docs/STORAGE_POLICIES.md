# Storage policies — диагностика и фикс upload-ов

Если фото зависают в pending или приходит 403 на загрузку — проблема в RLS на `storage.objects`.
Bucket'ы должны существовать и иметь правильные политики для роли `authenticated`.

## Шаг 1. Какие bucket'ы есть?

В Supabase Dashboard → SQL Editor:

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY id;
```

Должны быть как минимум:

| id | public | file_size_limit |
|---|---|---|
| `avatars` | true | NULL (или >= 5 МБ) |
| `chat-images` | true | NULL |
| `dm-media` | false (рекомендую) | NULL |
| `profile-media` | true | NULL |

Если каких-то нет — создать руками в Dashboard → Storage.

## Шаг 2. Какие политики уже стоят?

```sql
SELECT policyname, cmd, qual::text AS using_expr, with_check::text AS check_expr
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```

Должны быть политики на **INSERT** для роли `authenticated` для каждого bucket'а.

## Шаг 3. Накатить правильные политики (если не хватает)

Идемпотентный скрипт — можно прогонять несколько раз:

```sql
-- Утилитарная политика: авторизованный пользователь может писать ТОЛЬКО
-- в свою папку (первая часть пути = его user_id).
-- Применяется ко всем нашим bucket'ам, где паттерн ключа: <user_id>/<file>

-- 1. Helper: уже-залогиненный, и путь начинается с моего user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'authenticated insert own folder'
  ) THEN
    CREATE POLICY "authenticated insert own folder"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id IN ('avatars', 'chat-images', 'dm-media', 'profile-media')
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- 2. Чтение публичных bucket'ов всем
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'public read public buckets'
  ) THEN
    CREATE POLICY "public read public buckets"
      ON storage.objects FOR SELECT
      TO public
      USING (
        bucket_id IN ('avatars', 'chat-images', 'profile-media')
      );
  END IF;
END $$;

-- 3. Чтение dm-media — только если ты сам owner или recipient в direct_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'dm-media read by participants'
  ) THEN
    CREATE POLICY "dm-media read by participants"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'dm-media'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text  -- я загрузил
          OR EXISTS (
            SELECT 1 FROM public.direct_messages dm
            WHERE
              (dm.image_url LIKE '%' || name OR dm.video_url LIKE '%' || name)
              AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
          )
        )
      );
  END IF;
END $$;

-- 4. Делать DELETE можно только в своей папке
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'authenticated delete own files'
  ) THEN
    CREATE POLICY "authenticated delete own files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id IN ('avatars', 'chat-images', 'dm-media', 'profile-media')
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- 5. UPDATE (нужно для avatar upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'authenticated update own files'
  ) THEN
    CREATE POLICY "authenticated update own files"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id IN ('avatars', 'chat-images', 'dm-media', 'profile-media')
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id IN ('avatars', 'chat-images', 'dm-media', 'profile-media')
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
```

## Шаг 4. Проверить руками

```sql
-- Какие сейчас политики на storage.objects
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```

Должно быть 5 политик (или больше, если уже что-то было). Минимум:
- `authenticated insert own folder` (INSERT)
- `public read public buckets` (SELECT для avatars/chat-images/profile-media)
- `dm-media read by participants` (SELECT для dm-media)
- `authenticated delete own files` (DELETE)
- `authenticated update own files` (UPDATE)

## Шаг 5. Тест через curl

```bash
# Маленький бинарный файл (любая картинка)
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_USER_JWT" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@/path/to/test.jpg" \
  "$SUPABASE_URL/storage/v1/object/chat-images/$YOUR_USER_ID/test-$(date +%s).jpg"
```

Должен вернуть JSON с `Id` объекта. Если 403 — RLS блокирует, проверь политику INSERT.
Если ничего не возвращает (pending) — это Nginx прокси `/sb/`, см. предыдущий гайд.
