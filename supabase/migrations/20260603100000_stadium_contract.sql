-- ============================================================
-- Контракт со стадионом «Луч». Закладываем фундамент:
--   1) Менеджерская роль.
--   2) Площадки внутри стадиона (большое поле / манеж / зал) + размеры
--      аренды 1/1, 2/3, 1/3 с разными ценами.
--   3) График работы стадиона (часы по дням недели + override на конкретные даты).
--   4) Брони временных интервалов — игровые (от пользователей) и внешние
--      (создаёт менеджер за тех, кто пришёл по телефону).
--   5) Серии игр с шаблоном повторения и аппрувом менеджера.
--
-- Терминологическая ловушка: слово "slot" в коде уже занято — это позиция
-- игрока в расстановке драфта (game_drafts.slots). Здесь время бронирования
-- называется "time_slot" / "booking" чтобы не перепутать.
-- ============================================================

-- ============================================================
-- 1. Роль stadium_manager
-- ============================================================
-- Расширяем существующий enum app_role новой ролью.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype
      AND enumlabel = 'stadium_manager'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'stadium_manager';
  END IF;
END $$;

-- ============================================================
-- 2. stadiums — расширяем под партнёрский контракт
-- ============================================================
ALTER TABLE public.stadiums
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  -- Партнёрский стадион получает приоритет в каталоге, видим админке менеджера.
  ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_stadiums_manager ON public.stadiums(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stadiums_partner ON public.stadiums(is_partner) WHERE is_partner = true;

-- Менеджер может редактировать СВОЙ стадион.
DROP POLICY IF EXISTS "manager edits own stadium" ON public.stadiums;
CREATE POLICY "manager edits own stadium"
  ON public.stadiums FOR UPDATE
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

-- ============================================================
-- 3. stadium_venues — площадки внутри стадиона
-- ============================================================
-- Пример для Луча: «Большое поле 100×64», «Среднее 96×54», «Малое 60×30»,
-- «Манеж», «Универсальный зал». На каждой могут играть свои виды спорта.
CREATE TABLE IF NOT EXISTS public.stadium_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stadium_id uuid NOT NULL REFERENCES public.stadiums(id) ON DELETE CASCADE,
  name text NOT NULL,
  size_width int,        -- метры
  size_length int,       -- метры
  surface text,          -- «искусственная трава», «паркет», ...
  sports text[] NOT NULL DEFAULT '{}',
  cover_url text,
  description text,
  -- Поле допускает деление: например большое = full/2-3/1-3, малое только full.
  allow_split boolean NOT NULL DEFAULT false,
  -- Порядок в каталоге.
  sort_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_venues_stadium ON public.stadium_venues(stadium_id, sort_order);

ALTER TABLE public.stadium_venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads venues" ON public.stadium_venues;
CREATE POLICY "anyone reads venues" ON public.stadium_venues FOR SELECT USING (true);
DROP POLICY IF EXISTS "manager edits venues" ON public.stadium_venues;
CREATE POLICY "manager edits venues" ON public.stadium_venues FOR ALL
  USING (EXISTS (SELECT 1 FROM public.stadiums s WHERE s.id = stadium_id AND s.manager_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stadiums s WHERE s.id = stadium_id AND s.manager_id = auth.uid()));

-- ============================================================
-- 4. venue_size_options — варианты аренды (1/1, 2/3, 1/3, ...)
-- ============================================================
-- На большое поле у Луча: 1/1 = 16200, 2/3 = 10800, 1/3 = 5400 ₽/час.
-- Менеджер меняет цену здесь — на фронте подтягивается realtime.
CREATE TABLE IF NOT EXISTS public.venue_size_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.stadium_venues(id) ON DELETE CASCADE,
  -- 'full' | 'two_thirds' | 'one_third' | 'half' | 'custom_X'
  size_code text NOT NULL,
  -- Человеко-читабельный label: «Всё поле», «2/3 поля», «1/3 поля».
  label text NOT NULL,
  price_per_hour int NOT NULL CHECK (price_per_hour >= 0),
  -- Сколько одновременно слотов такого размера доступно. На «1/1» обычно 1
  -- (только один full в момент времени), на «1/3» — обычно 3 параллельных слота.
  parallel_count int NOT NULL DEFAULT 1 CHECK (parallel_count >= 1),
  sort_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT venue_size_uniq UNIQUE (venue_id, size_code)
);
CREATE INDEX IF NOT EXISTS idx_size_options_venue ON public.venue_size_options(venue_id);

ALTER TABLE public.venue_size_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads size options" ON public.venue_size_options;
CREATE POLICY "anyone reads size options" ON public.venue_size_options FOR SELECT USING (true);
DROP POLICY IF EXISTS "manager edits size options" ON public.venue_size_options;
CREATE POLICY "manager edits size options" ON public.venue_size_options FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.stadium_venues v
    JOIN public.stadiums s ON s.id = v.stadium_id
    WHERE v.id = venue_id AND s.manager_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stadium_venues v
    JOIN public.stadiums s ON s.id = v.stadium_id
    WHERE v.id = venue_id AND s.manager_id = auth.uid()
  ));

-- ============================================================
-- 5. stadium_schedules — график работы
-- ============================================================
-- weekly: расписание по дню недели (Пн-Вс). active_from/to — период действия
-- (для сезонности). Override на конкретную дату — отдельная таблица ниже.
CREATE TABLE IF NOT EXISTS public.stadium_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stadium_id uuid NOT NULL REFERENCES public.stadiums(id) ON DELETE CASCADE,
  -- 0=Вс, 1=Пн, ..., 6=Сб (ISO weekday: 1..7 = Пн..Вс; используем как DOW в Postgres)
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  -- Время в формате 'HH:MM' (24h, локальное Москва).
  open_time time NOT NULL,
  close_time time NOT NULL,
  -- Период действия этого правила (NULL = бессрочно).
  active_from date,
  active_to date,
  CHECK (close_time > open_time)
);
CREATE INDEX IF NOT EXISTS idx_schedules_stadium ON public.stadium_schedules(stadium_id, weekday);

ALTER TABLE public.stadium_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads schedules" ON public.stadium_schedules;
CREATE POLICY "anyone reads schedules" ON public.stadium_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "manager edits schedules" ON public.stadium_schedules;
CREATE POLICY "manager edits schedules" ON public.stadium_schedules FOR ALL
  USING (EXISTS (SELECT 1 FROM public.stadiums s WHERE s.id = stadium_id AND s.manager_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stadiums s WHERE s.id = stadium_id AND s.manager_id = auth.uid()));

-- Override-расписание на конкретную дату (праздники, ремонт, спецсобытие).
CREATE TABLE IF NOT EXISTS public.stadium_schedule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stadium_id uuid NOT NULL REFERENCES public.stadiums(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  open_time time,    -- NULL = закрыто весь день
  close_time time,
  reason text,       -- «Праздник», «Ремонт», «Турнир»
  CONSTRAINT schedule_override_uniq UNIQUE (stadium_id, override_date),
  CHECK ((open_time IS NULL AND close_time IS NULL) OR close_time > open_time)
);
CREATE INDEX IF NOT EXISTS idx_overrides_stadium_date ON public.stadium_schedule_overrides(stadium_id, override_date);

ALTER TABLE public.stadium_schedule_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads overrides" ON public.stadium_schedule_overrides;
CREATE POLICY "anyone reads overrides" ON public.stadium_schedule_overrides FOR SELECT USING (true);
DROP POLICY IF EXISTS "manager edits overrides" ON public.stadium_schedule_overrides;
CREATE POLICY "manager edits overrides" ON public.stadium_schedule_overrides FOR ALL
  USING (EXISTS (SELECT 1 FROM public.stadiums s WHERE s.id = stadium_id AND s.manager_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stadiums s WHERE s.id = stadium_id AND s.manager_id = auth.uid()));

-- ============================================================
-- 6. venue_bookings — брони временных интервалов
-- ============================================================
-- Источники брони:
--   'game' — пользователь создал игру через /create
--   'external' — менеджер забронировал за человека, который пришёл по телефону
--   'maintenance' — закрыт по техобслуживанию
-- Связь с играми: если source = 'game', game_id ссылается на games.id.
CREATE TABLE IF NOT EXISTS public.venue_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.stadium_venues(id) ON DELETE CASCADE,
  size_option_id uuid NOT NULL REFERENCES public.venue_size_options(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  source text NOT NULL CHECK (source IN ('game', 'external', 'maintenance')),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE,
  -- Внешний клиент (имя/телефон) — только для source='external'.
  external_name text,
  external_phone text,
  external_notes text,
  -- Кто создал бронь.
  created_by uuid REFERENCES auth.users(id),
  -- Цена зафиксированная на момент бронирования (защита от изменения price_per_hour).
  price_total int,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_time ON public.venue_bookings(venue_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_bookings_game ON public.venue_bookings(game_id) WHERE game_id IS NOT NULL;

ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
-- Чтение публичное — нужно показывать «занято» в слот-пикере при создании игры.
DROP POLICY IF EXISTS "anyone reads bookings" ON public.venue_bookings;
CREATE POLICY "anyone reads bookings" ON public.venue_bookings FOR SELECT USING (true);
-- Запись только через RPC (book_venue / cancel_booking).

-- ============================================================
-- 7. game_series — серии игр
-- ============================================================
-- Пользователь хочет «каждый четверг октября в 19:00 на Малом 60×30».
-- Создаётся pending-серия → менеджер аппрувит → генерируется N игр и
-- N venue_bookings.
CREATE TABLE IF NOT EXISTS public.game_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.stadium_venues(id) ON DELETE CASCADE,
  size_option_id uuid NOT NULL REFERENCES public.venue_size_options(id),
  -- Параметры повтора: для MVP — массив будущих дат, генерируемый клиентом.
  -- На сервере можно валидировать что все даты в окне расписания.
  dates date[] NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  sport text NOT NULL,
  level text NOT NULL,
  slots_total int NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  reject_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_series_status ON public.game_series(status);
CREATE INDEX IF NOT EXISTS idx_series_organizer ON public.game_series(organizer_id);
CREATE INDEX IF NOT EXISTS idx_series_venue ON public.game_series(venue_id);

ALTER TABLE public.game_series ENABLE ROW LEVEL SECURITY;
-- Читают: автор серии, менеджер стадиона, админ.
DROP POLICY IF EXISTS "series read" ON public.game_series;
CREATE POLICY "series read" ON public.game_series FOR SELECT
  USING (
    organizer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.stadium_venues v
      JOIN public.stadiums s ON s.id = v.stadium_id
      WHERE v.id = venue_id AND s.manager_id = auth.uid()
    )
  );

-- ============================================================
-- 8. RPC: get_free_slots
-- ============================================================
-- Возвращает массив свободных интервалов на конкретный venue + дату.
-- Учитывает: расписание стадиона на этот weekday, override на дату,
-- существующие venue_bookings, parallel_count размера.
-- Шаг — 30 минут. Минимальная длина — duration_min минут.
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
  v_parallel int := 1;
BEGIN
  SELECT stadium_id INTO v_stadium_id FROM public.stadium_venues WHERE id = p_venue_id;
  IF v_stadium_id IS NULL THEN RETURN; END IF;

  -- Postgres dow: 0=Вс..6=Сб
  v_weekday := EXTRACT(DOW FROM p_date)::smallint;

  -- Override на дату приоритетнее обычного расписания.
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
      -- Дефолт: 8:00-23:00 если расписание не задано
      v_open := '08:00';
      v_close := '23:00';
    END IF;
  END IF;

  IF p_size_option_id IS NOT NULL THEN
    SELECT parallel_count INTO v_parallel FROM public.venue_size_options WHERE id = p_size_option_id;
    v_parallel := COALESCE(v_parallel, 1);
  END IF;

  v_cur := (p_date + v_open) AT TIME ZONE 'Europe/Moscow';
  v_end := (p_date + v_close) AT TIME ZONE 'Europe/Moscow';

  WHILE v_cur + (p_duration_min || ' minutes')::interval <= v_end LOOP
    slot_start := v_cur;
    slot_end := v_cur + (p_duration_min || ' minutes')::interval;
    -- Слот считается занятым, если параллельных бронирований ≥ parallel_count.
    busy := (
      SELECT count(*) >= v_parallel
      FROM public.venue_bookings b
      WHERE b.venue_id = p_venue_id
        AND b.status = 'confirmed'
        AND b.starts_at < slot_end
        AND b.ends_at > slot_start
        AND (p_size_option_id IS NULL OR b.size_option_id = p_size_option_id)
    );
    RETURN NEXT;
    v_cur := v_cur + v_step;
  END LOOP;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_free_slots(uuid, date, uuid, int) TO authenticated, anon;

-- ============================================================
-- 9. RPC: book_venue
-- ============================================================
-- Универсальная бронь venue. Используется и при создании игры
-- (source='game' + game_id), и менеджером (source='external').
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
  v_parallel int;
  v_overlap int;
  v_price int;
  v_id uuid;
  v_hours numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_source NOT IN ('game','external','maintenance') THEN RAISE EXCEPTION 'Bad source'; END IF;
  IF p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'Bad time range'; END IF;

  SELECT v.stadium_id, s.manager_id INTO v_stadium_id, v_manager_id
  FROM public.stadium_venues v JOIN public.stadiums s ON s.id = v.stadium_id
  WHERE v.id = p_venue_id;
  IF v_stadium_id IS NULL THEN RAISE EXCEPTION 'Venue not found'; END IF;

  -- external/maintenance можно создавать только менеджеру.
  IF p_source IN ('external','maintenance') AND v_manager_id <> v_uid THEN
    RAISE EXCEPTION 'Only manager';
  END IF;

  SELECT parallel_count, price_per_hour INTO v_parallel, v_price
  FROM public.venue_size_options WHERE id = p_size_option_id;
  IF v_parallel IS NULL THEN RAISE EXCEPTION 'Size option not found'; END IF;

  SELECT count(*) INTO v_overlap
  FROM public.venue_bookings
  WHERE venue_id = p_venue_id
    AND size_option_id = p_size_option_id
    AND status = 'confirmed'
    AND starts_at < p_ends_at AND ends_at > p_starts_at;
  IF v_overlap >= v_parallel THEN
    RAISE EXCEPTION 'Time slot is full';
  END IF;

  v_hours := EXTRACT(EPOCH FROM (p_ends_at - p_starts_at)) / 3600.0;

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
    v_uid, CEIL(v_price * v_hours)::int, 'confirmed'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.book_venue(uuid, uuid, timestamptz, timestamptz, text, uuid, text, text, text) TO authenticated;

-- ============================================================
-- 10. RPC: cancel_booking
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_b record;
  v_manager_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_b FROM public.venue_bookings WHERE id = p_booking_id;
  IF v_b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;

  SELECT s.manager_id INTO v_manager_id
  FROM public.stadium_venues v JOIN public.stadiums s ON s.id = v.stadium_id
  WHERE v.id = v_b.venue_id;

  -- Отменить может: тот кто создал, менеджер стадиона, организатор игры (если source='game').
  IF v_b.created_by <> v_uid
     AND COALESCE(v_manager_id, '00000000-0000-0000-0000-000000000000'::uuid) <> v_uid
     AND NOT EXISTS (SELECT 1 FROM public.games g WHERE g.id = v_b.game_id AND g.organizer_id = v_uid)
  THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.venue_bookings SET status='cancelled' WHERE id = p_booking_id;
  RETURN json_build_object('ok', true);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

-- ============================================================
-- 11. RPC: request_series  — пользователь подаёт серию
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_series(
  p_venue_id uuid,
  p_size_option_id uuid,
  p_dates date[],
  p_start_time time,
  p_end_time time,
  p_sport text,
  p_level text,
  p_slots_total int,
  p_notes text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_stadium_id uuid;
  v_manager_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_end_time <= p_start_time THEN RAISE EXCEPTION 'Bad time range'; END IF;
  IF array_length(p_dates, 1) IS NULL OR array_length(p_dates, 1) = 0 THEN
    RAISE EXCEPTION 'Empty dates';
  END IF;
  IF array_length(p_dates, 1) > 30 THEN RAISE EXCEPTION 'Too many dates (max 30)'; END IF;

  SELECT v.stadium_id, s.manager_id INTO v_stadium_id, v_manager_id
  FROM public.stadium_venues v JOIN public.stadiums s ON s.id = v.stadium_id
  WHERE v.id = p_venue_id;
  IF v_stadium_id IS NULL THEN RAISE EXCEPTION 'Venue not found'; END IF;

  INSERT INTO public.game_series (
    organizer_id, venue_id, size_option_id, dates, start_time, end_time,
    sport, level, slots_total, status, notes
  )
  VALUES (
    v_uid, p_venue_id, p_size_option_id, p_dates, p_start_time, p_end_time,
    p_sport, p_level, p_slots_total, 'pending', NULLIF(trim(COALESCE(p_notes,'')),'')
  )
  RETURNING id INTO v_id;

  -- Уведомление менеджеру.
  IF v_manager_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, url, payload)
    VALUES (
      v_manager_id, 'series_request',
      'Заявка на серию игр',
      'Игрок просит забронировать ' || array_length(p_dates,1) || ' дат подряд',
      '/manager/series',
      jsonb_build_object('series_id', v_id, 'venue_id', p_venue_id)
    );
  END IF;

  RETURN v_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.request_series(uuid, uuid, date[], time, time, text, text, int, text) TO authenticated;

-- ============================================================
-- 12. RPC: approve_series — менеджер одобряет, генерируются игры+брони
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_series(p_series_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_s record;
  v_stadium_id uuid;
  v_manager_id uuid;
  v_d date;
  v_starts timestamptz;
  v_ends timestamptz;
  v_game_id uuid;
  v_price int;
  v_hours numeric;
  v_created int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_s FROM public.game_series WHERE id = p_series_id;
  IF v_s.id IS NULL THEN RAISE EXCEPTION 'Series not found'; END IF;
  IF v_s.status <> 'pending' THEN RAISE EXCEPTION 'Series already %', v_s.status; END IF;

  SELECT v.stadium_id, s.manager_id INTO v_stadium_id, v_manager_id
  FROM public.stadium_venues v JOIN public.stadiums s ON s.id = v.stadium_id
  WHERE v.id = v_s.venue_id;
  IF v_manager_id <> v_uid THEN RAISE EXCEPTION 'Only manager can approve'; END IF;

  SELECT price_per_hour INTO v_price FROM public.venue_size_options WHERE id = v_s.size_option_id;

  FOREACH v_d IN ARRAY v_s.dates LOOP
    v_starts := (v_d + v_s.start_time) AT TIME ZONE 'Europe/Moscow';
    v_ends := (v_d + v_s.end_time) AT TIME ZONE 'Europe/Moscow';
    v_hours := EXTRACT(EPOCH FROM (v_ends - v_starts)) / 3600.0;

    -- Создаём игру.
    INSERT INTO public.games (
      stadium_id, organizer_id, sport, level, starts_at, ends_at,
      slots_total, price_per_player, rent_total, is_private
    )
    VALUES (
      v_stadium_id, v_s.organizer_id, v_s.sport, v_s.level, v_starts, v_ends,
      v_s.slots_total,
      CEIL(v_price * v_hours * 1.1 / v_s.slots_total)::int, -- комиссия 10%
      CEIL(v_price * v_hours)::int,
      false
    )
    RETURNING id INTO v_game_id;

    -- Создаём бронь venue. Через INSERT напрямую, без book_venue
    -- (мы уже под SECURITY DEFINER).
    INSERT INTO public.venue_bookings (
      venue_id, size_option_id, starts_at, ends_at, source, game_id,
      created_by, price_total, status
    )
    VALUES (
      v_s.venue_id, v_s.size_option_id, v_starts, v_ends, 'game', v_game_id,
      v_s.organizer_id, CEIL(v_price * v_hours)::int, 'confirmed'
    );

    -- Авто-запись организатора.
    INSERT INTO public.game_participants (game_id, user_id, paid)
    VALUES (v_game_id, v_s.organizer_id, false)
    ON CONFLICT (game_id, user_id) DO NOTHING;

    v_created := v_created + 1;
  END LOOP;

  UPDATE public.game_series
  SET status='approved', approved_by=v_uid, approved_at=now()
  WHERE id = p_series_id;

  -- Уведомление автору серии.
  INSERT INTO public.notifications (user_id, type, title, body, url, payload)
  VALUES (
    v_s.organizer_id, 'series_approved',
    'Серия игр одобрена',
    'Менеджер забронировал ' || v_created || ' слотов',
    '/my', jsonb_build_object('series_id', p_series_id)
  );

  RETURN json_build_object('ok', true, 'created', v_created);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.approve_series(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
