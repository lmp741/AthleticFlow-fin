-- Direct messages
CREATE INDEX IF NOT EXISTS idx_dm_sender_recipient_created
  ON public.direct_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_recipient_sender_created
  ON public.direct_messages(recipient_id, sender_id, created_at DESC);

-- Friendships
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status
  ON public.friendships(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester_status
  ON public.friendships(requester_id, status);

-- Game participants
CREATE INDEX IF NOT EXISTS idx_game_participants_user ON public.game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_game ON public.game_participants(game_id);

-- Goal claims/approvals
CREATE INDEX IF NOT EXISTS idx_goal_claim_approvals_claim ON public.goal_claim_approvals(claim_id);
CREATE INDEX IF NOT EXISTS idx_goal_claims_game ON public.goal_claims(game_id);
CREATE INDEX IF NOT EXISTS idx_goal_claims_user ON public.goal_claims(user_id);

-- Game messages
CREATE INDEX IF NOT EXISTS idx_game_messages_game_created
  ON public.game_messages(game_id, created_at);

-- Games browsing
CREATE INDEX IF NOT EXISTS idx_games_starts_at ON public.games(starts_at);
CREATE INDEX IF NOT EXISTS idx_games_organizer ON public.games(organizer_id);

-- Profiles search (trigram for ILIKE)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON public.profiles USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_nickname_trgm
  ON public.profiles USING gin (nickname gin_trgm_ops);

-- User ratings
CREATE INDEX IF NOT EXISTS idx_user_ratings_ratee ON public.user_ratings(ratee_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater ON public.user_ratings(rater_id);