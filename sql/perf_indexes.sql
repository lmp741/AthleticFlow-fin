-- =============================================================
-- Athletic Flow — индексы под нагрузку
-- =============================================================
-- Применять в Supabase SQL Editor.
-- Все индексы создаются CONCURRENTLY, чтобы не лочить таблицу
-- на проде. Если CONCURRENTLY не доступен (например, в transaction
-- supabase'a), убери ключевое слово и применяй в часы низкой нагрузки.
-- =============================================================

-- ---------- GAMES ----------
-- Главный hot-path: /games и главная читают
--   WHERE is_private = false AND starts_at >= now() ORDER BY starts_at
CREATE INDEX IF NOT EXISTS games_public_starts_idx
  ON public.games (starts_at)
  WHERE is_private = false;

-- Игры по стадиону + время (страница стадиона + страница игры)
CREATE INDEX IF NOT EXISTS games_stadium_starts_idx
  ON public.games (stadium_id, starts_at);

-- Игры пользователя — /my, /profile
CREATE INDEX IF NOT EXISTS games_organizer_idx
  ON public.games (organizer_id, starts_at DESC);

-- ---------- GAME_PARTICIPANTS ----------
-- Дедупликация: один пользователь — одна запись на игру.
-- Без этого через REST API можно записаться несколько раз.
CREATE UNIQUE INDEX IF NOT EXISTS game_participants_game_user_uniq
  ON public.game_participants (game_id, user_id);

-- Список «мои игры» — все игры, где я участник
CREATE INDEX IF NOT EXISTS game_participants_user_joined_idx
  ON public.game_participants (user_id, joined_at DESC);

-- ---------- FRIENDSHIPS ----------
-- Уникальность пары (requester, addressee) — не дубли заявок
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_uniq
  ON public.friendships (requester_id, addressee_id);

-- «Кто мне отправил заявки»
CREATE INDEX IF NOT EXISTS friendships_addressee_idx
  ON public.friendships (addressee_id, status);

-- ---------- CONVERSATION_MESSAGES ----------
-- Загрузка чата: WHERE conversation_id = ? ORDER BY created_at DESC LIMIT N
CREATE INDEX IF NOT EXISTS conversation_messages_conv_created_idx
  ON public.conversation_messages (conversation_id, created_at DESC);

-- ---------- DIRECT_MESSAGES ----------
-- Личная переписка
CREATE INDEX IF NOT EXISTS direct_messages_pair_created_idx
  ON public.direct_messages (sender_id, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS direct_messages_recipient_idx
  ON public.direct_messages (recipient_id, created_at DESC)
  WHERE read_at IS NULL;

-- ---------- GAME_MESSAGES ----------
CREATE INDEX IF NOT EXISTS game_messages_game_created_idx
  ON public.game_messages (game_id, created_at DESC);

-- ---------- PROFILES ----------
-- Поиск по @username (UserSearch в шапке)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_uniq
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- Опционально: trgm для нечёткого поиска
-- (если расширение pg_trgm включено)
-- CREATE INDEX IF NOT EXISTS profiles_display_name_trgm
--   ON public.profiles USING gin (display_name gin_trgm_ops);

-- ---------- USER_RATINGS ----------
-- Среднее по ratee — в карточке игрока
CREATE INDEX IF NOT EXISTS user_ratings_ratee_idx
  ON public.user_ratings (ratee_id);

-- Уникальность одного рейтинга на пару (rater, ratee, game)
CREATE UNIQUE INDEX IF NOT EXISTS user_ratings_triple_uniq
  ON public.user_ratings (rater_id, ratee_id, game_id);

-- ---------- STADIUMS ----------
-- Геопоиск по bbox в каталоге стадионов
CREATE INDEX IF NOT EXISTS stadiums_lat_idx ON public.stadiums (lat);
CREATE INDEX IF NOT EXISTS stadiums_lng_idx ON public.stadiums (lng);

-- =============================================================
-- После применения — проверь:
--   SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;
--   SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public';
-- =============================================================
