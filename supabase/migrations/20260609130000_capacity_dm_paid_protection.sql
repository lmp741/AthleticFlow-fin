-- ============================================================
-- Три фикса по итогам теста с Лучом (09.06.2026):
--
-- 1) МОДЕЛЬ ЁМКОСТИ ПОЛЯ. Раньше get_free_slots/book_venue проверяли
--    пересечение броней только ВНУТРИ одного размера: full на 19:00 не
--    мешал брони 1/3 на 19:00 — физический конфликт. Теперь поле имеет
--    ёмкость 6 юнитов: full=6, two_thirds=4, half=3, one_third=2.
--    Слот занят, если сумма весов броней в любой 30-мин отрезок + вес
--    запрошенного размера > 6.
--
-- 2) DM менеджер ↔ организатор без дружбы: новая ветка в RLS-политике
--    direct_messages + RPC can_dm_with для UI.
--
-- 3) Защита оплаченных игр: DELETE games с paid-участниками запрещён
--    всем кроме менеджера стадиона и админа. Отмена — только через
--    manager_cancel_game (архивирует игру, снимает брони, шлёт
--    нотификации о возврате).
-- ============================================================

-- ============================================================
-- 1а. Вес размера аренды (ёмкость поля = 6 юнитов)
-- ============================================================
CREATE OR REPLACE FUNCTION public.venue_size_weight(p_size_code text)
RETURNS int LANGUAGE sql IMMUTABLE
AS $fn$
  SELECT CASE p_size_code
    WHEN 'full' THEN 6
    WHEN 'two_thirds' THEN 4
    WHEN 'half' THEN 3
    WHEN 'one_third' THEN 2
    ELSE 6  -- неизвестный размер считаем эксклюзивным (безопасный дефолт)
  END;
$fn$;

GRANT EXECUTE ON FUNCTION public.venue_size_weight(text) TO authenticated, anon;

-- ============================================================
-- 1б. Проверка конфликта ёмкости на интервале
-- ============================================================
-- Идём по интервалу шагом 30 минут; в каждом отрезке суммируем веса
-- всех подтверждённых броней ЛЮБОГО размера. Если где-то сумма + вес
-- запрошенного > 6 — конфликт. Пошаговая проверка нужна, чтобы брони,
-- не пересекающиеся между собой, не давали ложный отказ.
CREATE OR REPLACE FUNCTION public.venue_capacity_conflict(
  p_venue_id uuid,
  p_starts timestamptz,
  p_ends timestamptz,
  p_req_weight int
)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  t timestamptz := p_starts;
  v_used int;
BEGIN
  WHILE t < p_ends LOOP
    SELECT COALESCE(SUM(public.venue_size_weight(so.size_code)), 0) INTO v_used
    FROM public.venue_bookings b
    JOIN public.venue_size_options so ON so.id = b.size_option_id
    WHERE b.venue_id = p_venue_id
      AND b.status = 'confirmed'
      AND b.starts_at < t + interval '30 minutes'
      AND b.ends_at > t;
    IF v_used + p_req_weight > 6 THEN
      RETURN true;
    END IF;
    t := t + interval '30 minutes';
  END LOOP;
  RETURN false;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.venue_capacity_conflict(uuid, timestamptz, timestamptz, int) TO authenticated, anon;

-- ============================================================
-- 1в. get_free_slots — busy через модель ёмкости
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_free_slots(
  p_venue_id uuid,
  p_date date,
  p_size_option_id uuid DEFAULT NULL,
  p_duration_min int DEFAULT 60
)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz, busy boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_stadium_id uuid;
  v_weekday smallint;
  v_open time;
  v_close time;
  v_override record;
  v_step interval := '30 minutes';
  v_cur timestamptz;
  v_end timestamptz;
  v_req_weight int;
BEGIN
  SELECT stadium_id INTO v_stadium_id FROM public.stadium_venues WHERE id = p_venue_id;
  IF v_stadium_id IS NULL THEN RETURN; END IF;

  v_weekday := EXTRACT(DOW FROM p_date)::smallint;

  SELECT open_time, close_time INTO v_override
  FROM public.stadium_schedule_overrides
  WHERE stadium_id = v_stadium_id AND override_date = p_date;
  IF FOUND THEN
    v_open := v_override.open_time;
    v_close := v_override.close_time;
    IF v_open IS NULL THEN RETURN; END IF;
  ELSE
    SELECT open_time, close_time INTO v_open, v_close
    FROM public.stadium_schedules
    WHERE stadium_id = v_stadium_id AND weekday = v_weekday
      AND (active_from IS NULL OR active_from <= p_date)
      AND (active_to IS NULL OR active_to >= p_date)
    ORDER BY id LIMIT 1;
    IF v_open IS NULL THEN
      v_open := '08:00';
      v_close := '23:00';
    END IF;
  END IF;

  -- Вес запрошенного размера. Без размера — минимальный вес активных
  -- опций площадки (оптимистичная доступность для фильтров каталога).
  IF p_size_option_id IS NOT NULL THEN
    SELECT public.venue_size_weight(size_code) INTO v_req_weight
    FROM public.venue_size_options WHERE id = p_size_option_id;
  END IF;
  IF v_req_weight IS NULL THEN
    SELECT COALESCE(MIN(public.venue_size_weight(size_code)), 6) INTO v_req_weight
    FROM public.venue_size_options
    WHERE venue_id = p_venue_id AND active;
  END IF;

  v_cur := (p_date + v_open) AT TIME ZONE 'Europe/Moscow';
  v_end := (p_date + v_close) AT TIME ZONE 'Europe/Moscow';

  WHILE v_cur + (p_duration_min || ' minutes')::interval <= v_end LOOP
    slot_start := v_cur;
    slot_end := v_cur + (p_duration_min || ' minutes')::interval;
    busy := public.venue_capacity_conflict(p_venue_id, slot_start, slot_end, v_req_weight);
    RETURN NEXT;
    v_cur := v_cur + v_step;
  END LOOP;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_free_slots(uuid, date, uuid, int) TO authenticated, anon;

-- ============================================================
-- 1г. book_venue — проверка через модель ёмкости
-- ============================================================
CREATE OR REPLACE FUNCTION public.book_venue(
  p_venue_id uuid,
  p_size_option_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_source text DEFAULT 'game',
  p_game_id uuid DEFAULT NULL,
  p_external_name text DEFAULT NULL,
  p_external_phone text DEFAULT NULL,
  p_external_notes text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_stadium_id uuid;
  v_manager_id uuid;
  v_venue_name text;
  v_price int;
  v_size_code text;
  v_id uuid;
  v_hours numeric;
  v_rent int;
  v_slots int;
  v_game_organizer uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_source NOT IN ('game','external','maintenance') THEN RAISE EXCEPTION 'Bad source'; END IF;
  IF p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'Bad time range'; END IF;

  SELECT v.stadium_id, s.manager_id, v.name INTO v_stadium_id, v_manager_id, v_venue_name
  FROM public.stadium_venues v JOIN public.stadiums s ON s.id = v.stadium_id
  WHERE v.id = p_venue_id;
  IF v_stadium_id IS NULL THEN RAISE EXCEPTION 'Venue not found'; END IF;

  IF p_source IN ('external','maintenance') AND v_manager_id <> v_uid THEN
    RAISE EXCEPTION 'Only manager';
  END IF;

  IF p_source = 'game' AND p_game_id IS NOT NULL THEN
    SELECT organizer_id, slots_total INTO v_game_organizer, v_slots
    FROM public.games WHERE id = p_game_id;
    IF v_game_organizer IS NULL THEN RAISE EXCEPTION 'Game not found'; END IF;
    IF v_game_organizer <> v_uid THEN RAISE EXCEPTION 'Only game organizer'; END IF;
  END IF;

  SELECT price_per_hour, size_code INTO v_price, v_size_code
  FROM public.venue_size_options WHERE id = p_size_option_id;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Size option not found'; END IF;

  -- Конфликт ёмкости: учитываются брони ВСЕХ размеров (full vs 1/3 и т.д.).
  IF public.venue_capacity_conflict(
    p_venue_id, p_starts_at, p_ends_at, public.venue_size_weight(v_size_code)
  ) THEN
    RAISE EXCEPTION 'Time slot is full';
  END IF;

  v_hours := EXTRACT(EPOCH FROM (p_ends_at - p_starts_at)) / 3600.0;
  v_rent := CEIL(v_price * v_hours)::int;

  INSERT INTO public.venue_bookings (
    venue_id, size_option_id, starts_at, ends_at, source,
    game_id, external_name, external_phone, external_notes,
    created_by, price_total, status
  )
  VALUES (
    p_venue_id, p_size_option_id, p_starts_at, p_ends_at, p_source,
    p_game_id, NULLIF(trim(COALESCE(p_external_name,'')),''),
    NULLIF(trim(COALESCE(p_external_phone,'')),''),
    NULLIF(trim(COALESCE(p_external_notes,'')),''),
    v_uid, v_rent, 'confirmed'
  )
  RETURNING id INTO v_id;

  IF p_source = 'game' AND p_game_id IS NOT NULL AND COALESCE(v_slots, 0) > 0 THEN
    UPDATE public.games
    SET rent_total = v_rent,
        price_per_player = CEIL(v_price * v_hours * 1.1 / v_slots)::int
    WHERE id = p_game_id;
  END IF;

  IF v_manager_id IS NOT NULL AND v_manager_id <> v_uid THEN
    INSERT INTO public.notifications (user_id, type, title, body, url, payload)
    VALUES (
      v_manager_id, 'booking_created',
      'Новая бронь',
      v_venue_name || ': ' || to_char(p_starts_at AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY HH24:MI')
        || '–' || to_char(p_ends_at AT TIME ZONE 'Europe/Moscow', 'HH24:MI'),
      '/manager',
      jsonb_build_object('booking_id', v_id, 'venue_id', p_venue_id, 'game_id', p_game_id)
    );
  END IF;

  RETURN v_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.book_venue(uuid, uuid, timestamptz, timestamptz, text, uuid, text, text, text) TO authenticated;

-- ============================================================
-- 2. DM менеджер ↔ организатор
-- ============================================================
-- Связь есть, если у одного из пары есть игра на стадионе, которым
-- управляет второй. Живёт через games (игры архивируются, не удаляются —
-- переписка о возврате остаётся доступной).
CREATE OR REPLACE FUNCTION public.has_manager_relation(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.games g
    JOIN public.stadiums s ON s.id = g.stadium_id
    WHERE (g.organizer_id = _a AND s.manager_id = _b)
       OR (g.organizer_id = _b AND s.manager_id = _a)
  );
$fn$;

REVOKE EXECUTE ON FUNCTION public.has_manager_relation(uuid, uuid) FROM PUBLIC, anon;

-- Для UI: можно ли мне в DM с этим пользователем (друг ИЛИ менеджер-связь).
CREATE OR REPLACE FUNCTION public.can_dm_with(p_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT auth.uid() IS NOT NULL AND (
    public.are_friends(auth.uid(), p_other)
    OR public.has_manager_relation(auth.uid(), p_other)
  );
$fn$;

GRANT EXECUTE ON FUNCTION public.can_dm_with(uuid) TO authenticated;

DROP POLICY IF EXISTS "friends can send dm" ON public.direct_messages;
CREATE POLICY "friends or manager relation send dm"
ON public.direct_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    public.are_friends(sender_id, recipient_id)
    OR public.has_manager_relation(sender_id, recipient_id)
  )
);

-- ============================================================
-- 3а. Запрет удаления игры с оплатами
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_delete_paid_game()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Нет оплат — удалять можно (старое поведение).
  IF NOT EXISTS (
    SELECT 1 FROM public.game_participants
    WHERE game_id = OLD.id AND paid
  ) THEN
    RETURN OLD;
  END IF;

  -- Админ — можно.
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'admin') THEN
    RETURN OLD;
  END IF;

  -- Менеджер стадиона этой игры — можно (manager_cancel_game архивирует,
  -- но прямое удаление менеджером тоже не блокируем).
  IF EXISTS (
    SELECT 1 FROM public.stadiums s
    WHERE s.id = OLD.stadium_id AND s.manager_id = v_uid
  ) THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Game has paid participants — cancellation only via stadium manager';
END;
$fn$;

DROP TRIGGER IF EXISTS trg_block_delete_paid_game ON public.games;
CREATE TRIGGER trg_block_delete_paid_game
BEFORE DELETE ON public.games
FOR EACH ROW EXECUTE FUNCTION public.block_delete_paid_game();

-- ============================================================
-- 3б. manager_cancel_game — отмена игры менеджером с «возвратом»
-- ============================================================
-- Не удаляет, а архивирует: история и чат сохраняются, DM-связь
-- менеджер-организатор продолжает работать. Брони снимаются (слот
-- освобождается), все участники получают нотификацию о возврате.
CREATE OR REPLACE FUNCTION public.manager_cancel_game(p_game_id uuid, p_reason text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_g record;
  v_notified int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT g.id, g.starts_at, g.archived_at, g.stadium_id, s.manager_id, s.name AS stadium_name
  INTO v_g
  FROM public.games g
  JOIN public.stadiums s ON s.id = g.stadium_id
  WHERE g.id = p_game_id;
  IF v_g.id IS NULL THEN RAISE EXCEPTION 'Game not found'; END IF;
  IF v_g.manager_id IS NULL OR v_g.manager_id <> v_uid THEN
    RAISE EXCEPTION 'Only stadium manager';
  END IF;
  IF v_g.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Game already archived'; END IF;

  -- Нотификации всем участникам (включая организатора).
  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  SELECT
    gp.user_id, 'game_cancelled',
    'Игра отменена менеджером',
    'Игра ' || to_char(v_g.starts_at AT TIME ZONE 'Europe/Moscow', 'DD.MM HH24:MI')
      || ' на «' || v_g.stadium_name || '» отменена.'
      || CASE WHEN NULLIF(trim(COALESCE(p_reason,'')),'') IS NOT NULL
              THEN ' Причина: ' || trim(p_reason) || '.' ELSE '' END
      || ' Оплата будет возвращена.',
    '/my',
    jsonb_build_object('game_id', p_game_id)
  FROM public.game_participants gp
  WHERE gp.game_id = p_game_id;
  GET DIAGNOSTICS v_notified = ROW_COUNT;

  -- Снимаем брони (слот освобождается) ДО архивации.
  UPDATE public.venue_bookings
  SET status = 'cancelled'
  WHERE game_id = p_game_id AND status = 'confirmed';

  -- Архивируем игру: дальнейшие мутации режет block_mutations_on_archived.
  UPDATE public.games SET archived_at = now() WHERE id = p_game_id;

  RETURN json_build_object('ok', true, 'notified', v_notified);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.manager_cancel_game(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
