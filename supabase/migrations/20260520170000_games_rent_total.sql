-- Сохраняем общую стоимость аренды для модели «делим аренду на участников».
-- Нужно для:
--  1) Корректного «собрано X / total ₽» на странице игры — total = rent_total
--     (если задан) или slots_total * price_per_player (если нет).
--  2) Автопересчёта price_per_player при редактировании slots_total —
--     если есть rent_total, новый price = floor(rent_total / new_slots).

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS rent_total numeric NULL;

COMMENT ON COLUMN public.games.rent_total IS
  'Стоимость аренды поля. NULL = фиксированная цена с каждого (price_per_player фиксирован), NOT NULL = делится на slots_total.';
