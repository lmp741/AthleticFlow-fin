-- Приватные игры по invite-ссылке: каждой игре — постоянный токен.
-- Цель: ссылка вида /games/{id}?invite={token} даёт доступ ЛЮБОМУ
-- (включая неавторизованных) увидеть карточку приватной игры.
-- Чтобы записаться/писать в чат — всё равно нужна авторизация.

-- 1. Столбец invite_token
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS invite_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS games_invite_token_uniq
  ON public.games(invite_token);

-- 2. RPC: получить игру по токену (SECURITY DEFINER — обходит RLS,
--    но фильтрует по токену → доступ только если знаешь токен).
--    Возвращаем поля карточки + краткие данные стадиона + кол-во участников.
CREATE OR REPLACE FUNCTION public.get_game_by_invite(p_token uuid)
RETURNS TABLE (
  id uuid,
  sport text,
  level text,
  starts_at timestamptz,
  ends_at timestamptz,
  price_per_player numeric,
  slots_total int,
  description text,
  organizer_id uuid,
  is_private boolean,
  stadium_id uuid,
  stadium_name text,
  stadium_address text,
  participants_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id,
    g.sport,
    g.level,
    g.starts_at,
    g.ends_at,
    g.price_per_player,
    g.slots_total,
    g.description,
    g.organizer_id,
    g.is_private,
    s.id AS stadium_id,
    s.name AS stadium_name,
    s.address AS stadium_address,
    COALESCE((
      SELECT count(*)::int
      FROM public.game_participants p
      WHERE p.game_id = g.id
    ), 0) AS participants_count
  FROM public.games g
  LEFT JOIN public.stadiums s ON s.id = g.stadium_id
  WHERE g.invite_token = p_token
  LIMIT 1;
$$;

-- Разрешаем дёргать RPC всем (вкл. anon) — токен сам по себе capability.
REVOKE ALL ON FUNCTION public.get_game_by_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_game_by_invite(uuid) TO anon, authenticated;

-- 3. (Опционально) RPC для проверки приглашения и записи на игру.
--    Пока не делаем — у нас есть существующий join-flow, который требует
--    auth.uid(). Анонимный юзер сначала логинится, потом по ссылке
--    автоматически прокинется параметр invite — он всё равно остаётся в URL.
