
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','organizer','stadium_owner','player');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable by all" ON public.user_roles FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Stadiums
CREATE TABLE public.stadiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Москва',
  cover_gradient TEXT,
  sports TEXT[] NOT NULL DEFAULT '{}',
  price_per_hour INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stadiums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stadiums readable by all" ON public.stadiums FOR SELECT USING (true);
CREATE POLICY "owners manage own stadium" ON public.stadiums FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Games
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stadium_id UUID NOT NULL REFERENCES public.stadiums ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sport TEXT NOT NULL DEFAULT 'Футбол',
  level TEXT NOT NULL DEFAULT 'Любитель',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  price_per_player INTEGER NOT NULL DEFAULT 0,
  slots_total INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "games readable by all" ON public.games FOR SELECT USING (true);
CREATE POLICY "auth users create games" ON public.games FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "organizer updates game" ON public.games FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "organizer deletes game" ON public.games FOR DELETE USING (auth.uid() = organizer_id);

-- Participants
CREATE TABLE public.game_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  paid BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants readable by all" ON public.game_participants FOR SELECT USING (true);
CREATE POLICY "user joins" ON public.game_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user leaves" ON public.game_participants FOR DELETE USING (auth.uid() = user_id);

-- Chat
CREATE TABLE public.game_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages readable by participants and organizer" ON public.game_messages FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.game_participants p WHERE p.game_id = game_messages.game_id AND p.user_id = auth.uid())
  OR EXISTS(SELECT 1 FROM public.games g WHERE g.id = game_messages.game_id AND g.organizer_id = auth.uid())
);
CREATE POLICY "participants send messages" ON public.game_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS(SELECT 1 FROM public.game_participants p WHERE p.game_id = game_messages.game_id AND p.user_id = auth.uid())
    OR EXISTS(SELECT 1 FROM public.games g WHERE g.id = game_messages.game_id AND g.organizer_id = auth.uid())
  )
);

-- Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'player');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime for chat & participants
ALTER TABLE public.game_messages REPLICA IDENTITY FULL;
ALTER TABLE public.game_participants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_participants;

-- Indexes
CREATE INDEX idx_games_starts_at ON public.games(starts_at);
CREATE INDEX idx_participants_game ON public.game_participants(game_id);
CREATE INDEX idx_messages_game ON public.game_messages(game_id, created_at);
