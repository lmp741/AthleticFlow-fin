-- Уточнение по факту: у «Луча» ДВА больших поля 100×64, не одно.
-- Переименовываем существующее «Большое поле» в «Большое поле №1»,
-- добавляем «Большое поле №2» с теми же параметрами и ценами.

DO $$
DECLARE
  v_stadium_id uuid;
  v_big2 uuid;
BEGIN
  SELECT id INTO v_stadium_id FROM public.stadiums WHERE name = 'Луч' LIMIT 1;
  IF v_stadium_id IS NULL THEN
    RAISE NOTICE 'Стадион Луч не найден, пропускаем';
    RETURN;
  END IF;

  -- Переименовываем существующее «Большое поле» → «Большое поле №1»
  UPDATE public.stadium_venues
  SET name = 'Большое поле №1', sort_order = 10
  WHERE stadium_id = v_stadium_id AND name = 'Большое поле';

  -- Добавляем «Большое поле №2» если ещё нет
  INSERT INTO public.stadium_venues
    (stadium_id, name, size_width, size_length, surface, sports, allow_split, sort_order, cover_url, description)
  SELECT v_stadium_id, 'Большое поле №2', 64, 100, 'Искусственная трава',
    ARRAY['Футбол'], true, 15,
    'https://admin.stadion-luch.ru/uploads/bolshoe_4_e08269d689.jpg',
    'Второе полноразмерное поле 100×64 м для футбола 11×11. Аренда целиком или по 2/3 / 1/3.'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.stadium_venues
    WHERE stadium_id = v_stadium_id AND name = 'Большое поле №2'
  )
  RETURNING id INTO v_big2;

  -- Если поле уже было — берём его id, иначе используем только что вставленный
  IF v_big2 IS NULL THEN
    SELECT id INTO v_big2 FROM public.stadium_venues
    WHERE stadium_id = v_stadium_id AND name = 'Большое поле №2';
  END IF;

  -- Варианты аренды (full / 2/3 / 1/3) — те же цены что и на №1
  INSERT INTO public.venue_size_options (venue_id, size_code, label, price_per_hour, parallel_count, sort_order)
  VALUES
    (v_big2, 'full', 'Всё поле', 16200, 1, 10),
    (v_big2, 'two_thirds', '2/3 поля', 10800, 1, 20),
    (v_big2, 'one_third', '1/3 поля', 5400, 3, 30)
  ON CONFLICT (venue_id, size_code) DO UPDATE
    SET price_per_hour = EXCLUDED.price_per_hour,
        parallel_count = EXCLUDED.parallel_count;

  RAISE NOTICE 'Большое поле №2 для Луча добавлено: %', v_big2;
END $$;

NOTIFY pgrst, 'reload schema';
