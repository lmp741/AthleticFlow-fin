-- Сид-данные для стадиона «Луч» (партнёрский контракт).
-- Все цены и размеры — с сайта https://stadion-luch.ru/.
-- Если стадион с name='Луч' ещё не создан в public.stadiums — INSERT.

DO $$
DECLARE
  v_stadium_id uuid;
  v_big uuid; v_mid uuid; v_small uuid; v_manege uuid; v_hall uuid;
BEGIN
  -- 1. Сам стадион.
  SELECT id INTO v_stadium_id FROM public.stadiums WHERE name = 'Луч' LIMIT 1;

  IF v_stadium_id IS NULL THEN
    INSERT INTO public.stadiums (
      name, address, city, lat, lng,
      sports, price_per_hour, description, phone, email, website,
      is_partner
    )
    VALUES (
      'Луч',
      'Москва, Волоколамское ш., 88, корп. 9, стр. 1',
      'Москва',
      55.8228, 37.4435,
      ARRAY['Футбол','Мини-футбол','Волейбол','Теннис'],
      5500,
      'Спортивный комплекс «Луч» — универсальная площадка в районе Тушино (7 минут от метро Тушинская, напротив стадиона «Открытие Арена»). Открытые футбольные поля с искусственным покрытием, крытый манеж и универсальный зал. Подходит для тренировок, турниров, корпоративных мероприятий и детских школ.',
      '+7 (965) 374-35-66',
      'luch_2026@mail.ru',
      'https://stadion-luch.ru/',
      true
    )
    RETURNING id INTO v_stadium_id;
  ELSE
    UPDATE public.stadiums
    SET
      is_partner = true,
      description = COALESCE(description,
        'Спортивный комплекс «Луч» — универсальная площадка в районе Тушино (7 минут от метро Тушинская, напротив стадиона «Открытие Арена»). Открытые футбольные поля с искусственным покрытием, крытый манеж и универсальный зал.'),
      phone = COALESCE(phone, '+7 (965) 374-35-66'),
      email = COALESCE(email, 'luch_2026@mail.ru'),
      website = COALESCE(website, 'https://stadion-luch.ru/'),
      sports = ARRAY['Футбол','Мини-футбол','Волейбол','Теннис']
    WHERE id = v_stadium_id;
  END IF;

  -- 2. Площадки. Если уже есть с таким же name+stadium_id — пропускаем.

  -- Большое поле 100×64
  INSERT INTO public.stadium_venues (stadium_id, name, size_width, size_length, surface, sports, allow_split, sort_order, cover_url, description)
  SELECT v_stadium_id, 'Большое поле', 64, 100, 'Искусственная трава',
    ARRAY['Футбол'], true, 10,
    'https://admin.stadion-luch.ru/uploads/bolshoe_3_1_7515af284c.png',
    'Полноразмерное поле 100×64 м для футбола 11×11. Аренда доступна целиком или по 2/3 / 1/3.'
  WHERE NOT EXISTS (SELECT 1 FROM public.stadium_venues WHERE stadium_id = v_stadium_id AND name = 'Большое поле')
  RETURNING id INTO v_big;
  IF v_big IS NULL THEN SELECT id INTO v_big FROM public.stadium_venues WHERE stadium_id = v_stadium_id AND name = 'Большое поле'; END IF;

  INSERT INTO public.venue_size_options (venue_id, size_code, label, price_per_hour, parallel_count, sort_order)
  VALUES
    (v_big, 'full', 'Всё поле', 16200, 1, 10),
    (v_big, 'two_thirds', '2/3 поля', 10800, 1, 20),
    (v_big, 'one_third', '1/3 поля', 5400, 3, 30)
  ON CONFLICT (venue_id, size_code) DO UPDATE
    SET price_per_hour = EXCLUDED.price_per_hour,
        parallel_count = EXCLUDED.parallel_count;

  -- Среднее поле 96×54
  INSERT INTO public.stadium_venues (stadium_id, name, size_width, size_length, surface, sports, allow_split, sort_order, cover_url, description)
  SELECT v_stadium_id, 'Среднее поле', 54, 96, 'Искусственная трава',
    ARRAY['Футбол'], true, 20,
    'https://admin.stadion-luch.ru/uploads/srednee1_c541a06cd2.jpg',
    'Поле 96×54 м для футбола 8×8 / 9×9. Тоже делится на 2/3 и 1/3.'
  WHERE NOT EXISTS (SELECT 1 FROM public.stadium_venues WHERE stadium_id = v_stadium_id AND name = 'Среднее поле')
  RETURNING id INTO v_mid;
  IF v_mid IS NULL THEN SELECT id INTO v_mid FROM public.stadium_venues WHERE stadium_id = v_stadium_id AND name = 'Среднее поле'; END IF;

  INSERT INTO public.venue_size_options (venue_id, size_code, label, price_per_hour, parallel_count, sort_order)
  VALUES
    (v_mid, 'full', 'Всё поле', 13200, 1, 10),
    (v_mid, 'two_thirds', '2/3 поля', 8800, 1, 20),
    (v_mid, 'one_third', '1/3 поля', 4400, 3, 30)
  ON CONFLICT (venue_id, size_code) DO UPDATE
    SET price_per_hour = EXCLUDED.price_per_hour,
        parallel_count = EXCLUDED.parallel_count;

  -- Малое поле 60×30
  INSERT INTO public.stadium_venues (stadium_id, name, size_width, size_length, surface, sports, allow_split, sort_order, cover_url, description)
  SELECT v_stadium_id, 'Малое поле', 30, 60, 'Искусственная трава',
    ARRAY['Футбол','Мини-футбол'], false, 30,
    'https://admin.stadion-luch.ru/uploads/maloe_blizhnee_f065e8f494.jpg',
    'Поле 60×30 м для мини-футбола и тренировок. Деление не предусмотрено.'
  WHERE NOT EXISTS (SELECT 1 FROM public.stadium_venues WHERE stadium_id = v_stadium_id AND name = 'Малое поле')
  RETURNING id INTO v_small;
  IF v_small IS NULL THEN SELECT id INTO v_small FROM public.stadium_venues WHERE stadium_id = v_stadium_id AND name = 'Малое поле'; END IF;

  INSERT INTO public.venue_size_options (venue_id, size_code, label, price_per_hour, parallel_count, sort_order)
  VALUES (v_small, 'full', 'Всё поле', 5500, 1, 10)
  ON CONFLICT (venue_id, size_code) DO UPDATE
    SET price_per_hour = EXCLUDED.price_per_hour;

  -- Футбольный манеж (крытый)
  INSERT INTO public.stadium_venues (stadium_id, name, surface, sports, allow_split, sort_order, cover_url, description)
  SELECT v_stadium_id, 'Футбольный манеж', 'Искусственная трава (крытый)',
    ARRAY['Футбол','Мини-футбол'], false, 40,
    'https://admin.stadion-luch.ru/uploads/manezh_1_3aba1c4ce1.jpg',
    'Крытый манеж — игры в любую погоду и в любое время года.'
  WHERE NOT EXISTS (SELECT 1 FROM public.stadium_venues WHERE stadium_id = v_stadium_id AND name = 'Футбольный манеж')
  RETURNING id INTO v_manege;
  IF v_manege IS NULL THEN SELECT id INTO v_manege FROM public.stadium_venues WHERE stadium_id = v_stadium_id AND name = 'Футбольный манеж'; END IF;

  INSERT INTO public.venue_size_options (venue_id, size_code, label, price_per_hour, parallel_count, sort_order)
  VALUES (v_manege, 'full', 'Полный манеж', 16000, 1, 10)
  ON CONFLICT (venue_id, size_code) DO UPDATE
    SET price_per_hour = EXCLUDED.price_per_hour;

  -- Универсальный зал
  INSERT INTO public.stadium_venues (stadium_id, name, surface, sports, allow_split, sort_order, cover_url, description)
  SELECT v_stadium_id, 'Универсальный зал', 'Спортивное покрытие (крытый)',
    ARRAY['Мини-футбол','Волейбол','Теннис'], false, 50,
    'https://admin.stadion-luch.ru/uploads/IMG_0820_095727e3cf.JPG',
    'Универсальный зал — волейбол, теннис, мини-футбол. Подходит для разных форматов.'
  WHERE NOT EXISTS (SELECT 1 FROM public.stadium_venues WHERE stadium_id = v_stadium_id AND name = 'Универсальный зал')
  RETURNING id INTO v_hall;
  IF v_hall IS NULL THEN SELECT id INTO v_hall FROM public.stadium_venues WHERE stadium_id = v_stadium_id AND name = 'Универсальный зал'; END IF;

  INSERT INTO public.venue_size_options (venue_id, size_code, label, price_per_hour, parallel_count, sort_order)
  VALUES (v_hall, 'full', 'Зал', 5500, 1, 10)
  ON CONFLICT (venue_id, size_code) DO UPDATE
    SET price_per_hour = EXCLUDED.price_per_hour;

  -- 3. Дефолтное расписание Луча: каждый день 8:00–23:00 (уточним у менеджера).
  -- Если уже есть запись для weekday — не дублируем.
  INSERT INTO public.stadium_schedules (stadium_id, weekday, open_time, close_time)
  SELECT v_stadium_id, w, '08:00'::time, '23:00'::time
  FROM generate_series(0, 6) AS w
  WHERE NOT EXISTS (
    SELECT 1 FROM public.stadium_schedules
    WHERE stadium_id = v_stadium_id AND weekday = w
  );

  RAISE NOTICE 'Seed Луча выполнен. stadium_id=%', v_stadium_id;
END $$;

NOTIFY pgrst, 'reload schema';
