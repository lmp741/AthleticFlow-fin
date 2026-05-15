-- =============================================================
-- Athletic Flow — БАЗОВАЯ СХЕМА БД (с нуля)
-- =============================================================
-- Применять ПЕРВЫМ файлом на ЧИСТОМ supabase-проекте.
-- Создаёт enum, таблицы, helper-функции, базовые RLS политики.
-- ПОТОМ применять:
--   01: perf_indexes.sql
--   02: goals_security.sql
--   03: geocode_cache.sql
--   04: public_pitches.sql
--   05: admin.sql
-- =============================================================

-- pgcrypto для gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- pg_trgm для нечёткого поиска по username/display_name (опционально, но полезно)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Enum ролей
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','organizer','stadium_owner','player');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================
-- 2) PROFILES — расширение auth.users
-- =============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        text UNIQUE,
  display_name    text,
  nickname        text,
  chat_display    text NOT NULL DEFAULT 'display_name',
  avatar_url      text,
  level           text,
  phone           text,
  phone_public    boolean NOT NULL DEFAULT false,
  phone_verified  boolean NOT NULL DEFAULT false,
  numeric_id      bigserial NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Триггер на updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Автосоздание профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- 3) USER_ROLES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- =============================================================
-- 4) STADIUMS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.stadiums (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name            text NOT NULL,
  address         text NOT NULL,
  city            text NOT NULL DEFAULT 'Москва',
  lat             double precision,
  lng             double precision,
  sports          text[] NOT NULL DEFAULT '{}',
  price_per_hour  integer NOT NULL DEFAULT 0,
  rating          numeric(2,1),
  cover_gradient  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 5) GAMES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.games (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stadium_id        uuid NOT NULL REFERENCES public.stadiums(id) ON DELETE RESTRICT,
  sport             text NOT NULL DEFAULT 'Футбол',
  level             text NOT NULL DEFAULT 'Любитель',
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz NOT NULL,
  price_per_player  integer NOT NULL DEFAULT 0,
  slots_total       integer NOT NULL DEFAULT 10,
  description       text,
  is_private        boolean NOT NULL DEFAULT false,
  status            text NOT NULL DEFAULT 'active',
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (slots_total BETWEEN 2 AND 50),
  CHECK (price_per_player >= 0)
);

-- =============================================================
-- 6) GAME_PARTICIPANTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.game_participants (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id   uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paid      boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id)
);

-- =============================================================
-- 7) GAME_MESSAGES — чат внутри игры
-- =============================================================
CREATE TABLE IF NOT EXISTS public.game_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       text,
  image_url  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 8) FRIENDSHIPS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending', -- pending | accepted
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);

DROP TRIGGER IF EXISTS friendships_touch ON public.friendships;
CREATE TRIGGER friendships_touch BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a))
  );
$$;

-- =============================================================
-- 9) CONVERSATIONS + members + messages + direct
-- =============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  is_self    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS conv_touch ON public.conversations;
CREATE TRIGGER conv_touch BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conv AND user_id = _user
  );
$$;

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body              text,
  image_url         text,
  video_url         text,
  document_url      text,
  document_name     text,
  location_lat      double precision,
  location_lng      double precision,
  edited_at         timestamptz,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body            text,
  image_url       text,
  video_url       text,
  document_url    text,
  document_name   text,
  location_lat    double precision,
  location_lng    double precision,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_user_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  peer_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  alias           text,
  archived        boolean NOT NULL DEFAULT false,
  hidden          boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 10) USER_RATINGS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.user_ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ratee_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id    uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  score      smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (rater_id <> ratee_id)
);

CREATE OR REPLACE FUNCTION public.can_rate_after_game(_game uuid, _ratee uuid, _rater uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = _game AND g.ends_at < now()
      AND (g.organizer_id = _rater OR EXISTS (
        SELECT 1 FROM public.game_participants gp
        WHERE gp.game_id = g.id AND gp.user_id = _rater
      ))
      AND (g.organizer_id = _ratee OR EXISTS (
        SELECT 1 FROM public.game_participants gp
        WHERE gp.game_id = g.id AND gp.user_id = _ratee
      ))
  );
$$;

-- =============================================================
-- 11) PROFILE_MEDIA, PHONE_VERIFICATIONS, GOAL_CLAIMS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.profile_media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         text NOT NULL,
  url          text NOT NULL,
  storage_path text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       text NOT NULL,
  code        text NOT NULL,
  purpose     text NOT NULL DEFAULT 'verify',
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goal_claims (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id    uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  count      integer NOT NULL,
  status     text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goal_claim_approvals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id    uuid NOT NULL REFERENCES public.goal_claims(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 12) USERNAME helpers
-- =============================================================
CREATE OR REPLACE FUNCTION public.username_available(_username text, _exclude uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(_username)
      AND (_exclude IS NULL OR id <> _exclude)
  );
$$;

-- =============================================================
-- 13) RLS — базовые политики
-- =============================================================
-- profiles: читать всем (для карточек), писать только себе
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- stadiums: читать всем, создавать/редактировать только owner или admin (admin RLS добавит admin.sql)
ALTER TABLE public.stadiums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stadiums_read" ON public.stadiums;
DROP POLICY IF EXISTS "stadiums_owner_write" ON public.stadiums;
CREATE POLICY "stadiums_read" ON public.stadiums FOR SELECT USING (true);
CREATE POLICY "stadiums_owner_write" ON public.stadiums FOR ALL
  USING (owner_id IS NULL OR owner_id = auth.uid())
  WITH CHECK (owner_id IS NULL OR owner_id = auth.uid());

-- games: читать всем не-приватные / читать приватные только участникам и организатору / писать организатору
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "games_read" ON public.games;
DROP POLICY IF EXISTS "games_insert_organizer" ON public.games;
DROP POLICY IF EXISTS "games_update_organizer" ON public.games;
DROP POLICY IF EXISTS "games_delete_organizer" ON public.games;
CREATE POLICY "games_read" ON public.games FOR SELECT
  USING (
    is_private = false
    OR organizer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.game_participants gp WHERE gp.game_id = id AND gp.user_id = auth.uid())
  );
CREATE POLICY "games_insert_organizer" ON public.games FOR INSERT
  WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "games_update_organizer" ON public.games FOR UPDATE
  USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "games_delete_organizer" ON public.games FOR DELETE
  USING (organizer_id = auth.uid());

-- game_participants: чтение публичное (для счётчиков), запись только сам себя
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gp_read" ON public.game_participants;
DROP POLICY IF EXISTS "gp_insert_self" ON public.game_participants;
DROP POLICY IF EXISTS "gp_update_self" ON public.game_participants;
DROP POLICY IF EXISTS "gp_delete_self_or_organizer" ON public.game_participants;
CREATE POLICY "gp_read" ON public.game_participants FOR SELECT USING (true);
CREATE POLICY "gp_insert_self" ON public.game_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "gp_update_self" ON public.game_participants FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.organizer_id = auth.uid())
  );
CREATE POLICY "gp_delete_self_or_organizer" ON public.game_participants FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.organizer_id = auth.uid())
  );

-- game_messages: участники и организатор
ALTER TABLE public.game_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_access" ON public.game_messages;
CREATE POLICY "gm_access" ON public.game_messages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND (
      g.organizer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.game_participants gp WHERE gp.game_id = g.id AND gp.user_id = auth.uid())
    ))
  )
  WITH CHECK (user_id = auth.uid());

-- friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fr_read" ON public.friendships;
DROP POLICY IF EXISTS "fr_insert" ON public.friendships;
DROP POLICY IF EXISTS "fr_update" ON public.friendships;
DROP POLICY IF EXISTS "fr_delete" ON public.friendships;
CREATE POLICY "fr_read" ON public.friendships FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "fr_insert" ON public.friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "fr_update" ON public.friendships FOR UPDATE
  USING (addressee_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid() OR requester_id = auth.uid());
CREATE POLICY "fr_delete" ON public.friendships FOR DELETE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- conversations + members + messages
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conv_read" ON public.conversations;
DROP POLICY IF EXISTS "conv_insert" ON public.conversations;
CREATE POLICY "conv_read" ON public.conversations FOR SELECT
  USING (public.is_conversation_member(id, auth.uid()));
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT
  WITH CHECK (created_by = auth.uid());

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cm_read" ON public.conversation_members;
DROP POLICY IF EXISTS "cm_insert" ON public.conversation_members;
DROP POLICY IF EXISTS "cm_delete" ON public.conversation_members;
CREATE POLICY "cm_read" ON public.conversation_members FOR SELECT
  USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "cm_insert" ON public.conversation_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
  );
CREATE POLICY "cm_delete" ON public.conversation_members FOR DELETE
  USING (user_id = auth.uid());

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cmsg_read" ON public.conversation_messages;
DROP POLICY IF EXISTS "cmsg_insert" ON public.conversation_messages;
DROP POLICY IF EXISTS "cmsg_update" ON public.conversation_messages;
CREATE POLICY "cmsg_read" ON public.conversation_messages FOR SELECT
  USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "cmsg_insert" ON public.conversation_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "cmsg_update" ON public.conversation_messages FOR UPDATE
  USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dm_read" ON public.direct_messages;
DROP POLICY IF EXISTS "dm_insert" ON public.direct_messages;
DROP POLICY IF EXISTS "dm_update" ON public.direct_messages;
CREATE POLICY "dm_read" ON public.direct_messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "dm_insert" ON public.direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "dm_update" ON public.direct_messages FOR UPDATE
  USING (sender_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());

ALTER TABLE public.chat_user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cus_owner" ON public.chat_user_state;
CREATE POLICY "cus_owner" ON public.chat_user_state FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_ratings: чтение всем, запись только участникам после окончания игры
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ur_read" ON public.user_ratings;
DROP POLICY IF EXISTS "ur_insert" ON public.user_ratings;
DROP POLICY IF EXISTS "ur_update_self" ON public.user_ratings;
CREATE POLICY "ur_read" ON public.user_ratings FOR SELECT USING (true);
CREATE POLICY "ur_insert" ON public.user_ratings FOR INSERT
  WITH CHECK (rater_id = auth.uid() AND public.can_rate_after_game(game_id, ratee_id, rater_id));
CREATE POLICY "ur_update_self" ON public.user_ratings FOR UPDATE
  USING (rater_id = auth.uid()) WITH CHECK (rater_id = auth.uid());

-- profile_media
ALTER TABLE public.profile_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pm_read" ON public.profile_media;
DROP POLICY IF EXISTS "pm_owner" ON public.profile_media;
CREATE POLICY "pm_read" ON public.profile_media FOR SELECT USING (true);
CREATE POLICY "pm_owner" ON public.profile_media FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- phone_verifications — только сам
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pv_self" ON public.phone_verifications;
CREATE POLICY "pv_self" ON public.phone_verifications FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- goal_claims, goal_claim_approvals — базовый read all, остальное доточит goals_security.sql
ALTER TABLE public.goal_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gc_base_read" ON public.goal_claims;
CREATE POLICY "gc_base_read" ON public.goal_claims FOR SELECT USING (true);

ALTER TABLE public.goal_claim_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gca_base_read" ON public.goal_claim_approvals;
CREATE POLICY "gca_base_read" ON public.goal_claim_approvals FOR SELECT USING (true);

-- user_roles — базовое чтение, остальное в admin.sql
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ur_base_read" ON public.user_roles;
CREATE POLICY "ur_base_read" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================================
-- Готово. После этого файла применяй в порядке:
--   sql/perf_indexes.sql
--   sql/goals_security.sql
--   sql/geocode_cache.sql
--   sql/public_pitches.sql
--   sql/admin.sql
-- =============================================================
