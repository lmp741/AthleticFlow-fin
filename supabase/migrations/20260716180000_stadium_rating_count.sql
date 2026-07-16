-- Реальное число оценок стадиона (например, с Яндекс.Карт) — для честной schema.org
-- разметки aggregateRating. Без этого числа рейтинг в разметку не попадает.

BEGIN;

ALTER TABLE public.stadiums ADD COLUMN IF NOT EXISTS rating_count integer;

-- СК «Луч»: реальный рейтинг с Яндекс.Карт на 16.07.2026 (4,9 / 3293 оценки).
UPDATE public.stadiums
   SET rating = 4.9,
       rating_count = 3293
 WHERE id = 'ca21528d-1ad2-450e-95f6-88f3fdb74273';

NOTIFY pgrst, 'reload schema';

COMMIT;
