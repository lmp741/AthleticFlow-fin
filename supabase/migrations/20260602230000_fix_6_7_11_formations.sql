-- Уточняю формации 6×6, 7×7, 11×11 строго по пропорциям COACH FOOTBALL.
-- Остальные размеры (2/3/4/5/8/9/10) не трогаю — они согласованы.
-- Изменения через CREATE OR REPLACE одной функции — все формации сразу,
-- иначе функция теряет старые ветки.

CREATE OR REPLACE FUNCTION public.build_draft_slots(p_size int)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE v jsonb; i int;
BEGIN
  CASE p_size
  WHEN 2 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.05,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"ST","x":0.36,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.95,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"ST","x":0.64,"y":0.5,"player_id":null}
  ]'::jsonb;
  WHEN 3 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.05,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"DF","x":0.18,"y":0.5,"player_id":null},
    {"id":"A2","team":"A","role":"MF","x":0.30,"y":0.32,"player_id":null},
    {"id":"A2x","team":"A","role":"ST","x":0.40,"y":0.68,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.95,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"DF","x":0.82,"y":0.5,"player_id":null},
    {"id":"B2","team":"B","role":"MF","x":0.70,"y":0.32,"player_id":null},
    {"id":"B2x","team":"B","role":"ST","x":0.60,"y":0.68,"player_id":null}
  ]'::jsonb;
  WHEN 4 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.05,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"DF","x":0.16,"y":0.32,"player_id":null},
    {"id":"A2","team":"A","role":"DF","x":0.16,"y":0.68,"player_id":null},
    {"id":"A3","team":"A","role":"ST","x":0.36,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.95,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"DF","x":0.84,"y":0.32,"player_id":null},
    {"id":"B2","team":"B","role":"DF","x":0.84,"y":0.68,"player_id":null},
    {"id":"B3","team":"B","role":"ST","x":0.64,"y":0.5,"player_id":null}
  ]'::jsonb;
  -- 5×5 → 1-2-2 (не трогаю)
  WHEN 5 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.04,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"DF","x":0.14,"y":0.34,"player_id":null},
    {"id":"A2","team":"A","role":"DF","x":0.14,"y":0.66,"player_id":null},
    {"id":"A3","team":"A","role":"MF","x":0.32,"y":0.30,"player_id":null},
    {"id":"A4","team":"A","role":"MF","x":0.32,"y":0.70,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.96,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"DF","x":0.86,"y":0.34,"player_id":null},
    {"id":"B2","team":"B","role":"DF","x":0.86,"y":0.66,"player_id":null},
    {"id":"B3","team":"B","role":"MF","x":0.68,"y":0.30,"player_id":null},
    {"id":"B4","team":"B","role":"MF","x":0.68,"y":0.70,"player_id":null}
  ]'::jsonb;
  -- 6×6 → 1-2-1-2 ПРАВКА: фланговые ПЗ ближе к ЦПЗ (как на фото — все 5 полевых
  -- на нашей половине без длинных пропусков). ЦПЗ чуть ближе к защ.
  WHEN 6 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.04,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"DF","x":0.13,"y":0.32,"player_id":null},
    {"id":"A2","team":"A","role":"DF","x":0.13,"y":0.68,"player_id":null},
    {"id":"A3","team":"A","role":"CM","x":0.23,"y":0.5,"player_id":null},
    {"id":"A4","team":"A","role":"MF","x":0.31,"y":0.30,"player_id":null},
    {"id":"A5","team":"A","role":"MF","x":0.31,"y":0.70,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.96,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"DF","x":0.87,"y":0.32,"player_id":null},
    {"id":"B2","team":"B","role":"DF","x":0.87,"y":0.68,"player_id":null},
    {"id":"B3","team":"B","role":"CM","x":0.77,"y":0.5,"player_id":null},
    {"id":"B4","team":"B","role":"MF","x":0.69,"y":0.30,"player_id":null},
    {"id":"B5","team":"B","role":"MF","x":0.69,"y":0.70,"player_id":null}
  ]'::jsonb;
  -- 7×7 → 1-2-1-2-1 ПРАВКА: ЦПЗ и фланг.ПЗ сдвинуты ближе к защ, нап у круга
  -- (соответствует фото где 11 буквально внутри центрального круга).
  WHEN 7 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.04,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"DF","x":0.12,"y":0.32,"player_id":null},
    {"id":"A2","team":"A","role":"DF","x":0.12,"y":0.68,"player_id":null},
    {"id":"A3","team":"A","role":"CM","x":0.20,"y":0.5,"player_id":null},
    {"id":"A4","team":"A","role":"MF","x":0.28,"y":0.30,"player_id":null},
    {"id":"A5","team":"A","role":"MF","x":0.28,"y":0.70,"player_id":null},
    {"id":"A6","team":"A","role":"ST","x":0.43,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.96,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"DF","x":0.88,"y":0.32,"player_id":null},
    {"id":"B2","team":"B","role":"DF","x":0.88,"y":0.68,"player_id":null},
    {"id":"B3","team":"B","role":"CM","x":0.80,"y":0.5,"player_id":null},
    {"id":"B4","team":"B","role":"MF","x":0.72,"y":0.30,"player_id":null},
    {"id":"B5","team":"B","role":"MF","x":0.72,"y":0.70,"player_id":null},
    {"id":"B6","team":"B","role":"ST","x":0.57,"y":0.5,"player_id":null}
  ]'::jsonb;
  -- 8×8 → 1-3-3-1 (не трогаю)
  WHEN 8 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.04,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.13,"y":0.20,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.13,"y":0.5,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.13,"y":0.80,"player_id":null},
    {"id":"A4","team":"A","role":"LM","x":0.26,"y":0.22,"player_id":null},
    {"id":"A5","team":"A","role":"CM","x":0.26,"y":0.5,"player_id":null},
    {"id":"A6","team":"A","role":"RM","x":0.26,"y":0.78,"player_id":null},
    {"id":"A7","team":"A","role":"ST","x":0.42,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.96,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.87,"y":0.20,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.87,"y":0.5,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.87,"y":0.80,"player_id":null},
    {"id":"B4","team":"B","role":"LM","x":0.74,"y":0.22,"player_id":null},
    {"id":"B5","team":"B","role":"CM","x":0.74,"y":0.5,"player_id":null},
    {"id":"B6","team":"B","role":"RM","x":0.74,"y":0.78,"player_id":null},
    {"id":"B7","team":"B","role":"ST","x":0.58,"y":0.5,"player_id":null}
  ]'::jsonb;
  -- 9×9 → 1-3-3-2 (не трогаю)
  WHEN 9 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.04,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.13,"y":0.20,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.13,"y":0.5,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.13,"y":0.80,"player_id":null},
    {"id":"A4","team":"A","role":"LM","x":0.24,"y":0.22,"player_id":null},
    {"id":"A5","team":"A","role":"CM","x":0.24,"y":0.5,"player_id":null},
    {"id":"A6","team":"A","role":"RM","x":0.24,"y":0.78,"player_id":null},
    {"id":"A7","team":"A","role":"ST","x":0.40,"y":0.36,"player_id":null},
    {"id":"A8","team":"A","role":"ST","x":0.40,"y":0.64,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.96,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.87,"y":0.20,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.87,"y":0.5,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.87,"y":0.80,"player_id":null},
    {"id":"B4","team":"B","role":"LM","x":0.76,"y":0.22,"player_id":null},
    {"id":"B5","team":"B","role":"CM","x":0.76,"y":0.5,"player_id":null},
    {"id":"B6","team":"B","role":"RM","x":0.76,"y":0.78,"player_id":null},
    {"id":"B7","team":"B","role":"ST","x":0.60,"y":0.36,"player_id":null},
    {"id":"B8","team":"B","role":"ST","x":0.60,"y":0.64,"player_id":null}
  ]'::jsonb;
  -- 10×10 → 1-3-4-2 (не трогаю)
  WHEN 10 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.03,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.12,"y":0.20,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.12,"y":0.5,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.12,"y":0.80,"player_id":null},
    {"id":"A4","team":"A","role":"LM","x":0.23,"y":0.15,"player_id":null},
    {"id":"A5","team":"A","role":"CM","x":0.23,"y":0.4,"player_id":null},
    {"id":"A6","team":"A","role":"CM","x":0.23,"y":0.6,"player_id":null},
    {"id":"A7","team":"A","role":"RM","x":0.23,"y":0.85,"player_id":null},
    {"id":"A8","team":"A","role":"ST","x":0.40,"y":0.36,"player_id":null},
    {"id":"A9","team":"A","role":"ST","x":0.40,"y":0.64,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.97,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.88,"y":0.20,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.88,"y":0.5,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.88,"y":0.80,"player_id":null},
    {"id":"B4","team":"B","role":"LM","x":0.77,"y":0.15,"player_id":null},
    {"id":"B5","team":"B","role":"CM","x":0.77,"y":0.4,"player_id":null},
    {"id":"B6","team":"B","role":"CM","x":0.77,"y":0.6,"player_id":null},
    {"id":"B7","team":"B","role":"RM","x":0.77,"y":0.85,"player_id":null},
    {"id":"B8","team":"B","role":"ST","x":0.60,"y":0.36,"player_id":null},
    {"id":"B9","team":"B","role":"ST","x":0.60,"y":0.64,"player_id":null}
  ]'::jsonb;
  -- 11×11 → 1-4-4-2 ПРАВКА: y-координаты крайних чуть ближе к центру
  -- (0.18 вместо 0.14 — на фото LB/RB не у самой бровки). ПЗ сдвинуты вперёд
  -- (0.27 вместо 0.24), нап чуть ближе к центру (0.42 вместо 0.40).
  WHEN 11 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.03,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.13,"y":0.18,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.13,"y":0.40,"player_id":null},
    {"id":"A3","team":"A","role":"CB","x":0.13,"y":0.60,"player_id":null},
    {"id":"A4","team":"A","role":"RB","x":0.13,"y":0.82,"player_id":null},
    {"id":"A5","team":"A","role":"LM","x":0.27,"y":0.18,"player_id":null},
    {"id":"A6","team":"A","role":"CM","x":0.27,"y":0.40,"player_id":null},
    {"id":"A7","team":"A","role":"CM","x":0.27,"y":0.60,"player_id":null},
    {"id":"A8","team":"A","role":"RM","x":0.27,"y":0.82,"player_id":null},
    {"id":"A9","team":"A","role":"ST","x":0.42,"y":0.40,"player_id":null},
    {"id":"A10","team":"A","role":"ST","x":0.42,"y":0.60,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.97,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.87,"y":0.18,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.87,"y":0.40,"player_id":null},
    {"id":"B3","team":"B","role":"CB","x":0.87,"y":0.60,"player_id":null},
    {"id":"B4","team":"B","role":"RB","x":0.87,"y":0.82,"player_id":null},
    {"id":"B5","team":"B","role":"LM","x":0.73,"y":0.18,"player_id":null},
    {"id":"B6","team":"B","role":"CM","x":0.73,"y":0.40,"player_id":null},
    {"id":"B7","team":"B","role":"CM","x":0.73,"y":0.60,"player_id":null},
    {"id":"B8","team":"B","role":"RM","x":0.73,"y":0.82,"player_id":null},
    {"id":"B9","team":"B","role":"ST","x":0.58,"y":0.40,"player_id":null},
    {"id":"B10","team":"B","role":"ST","x":0.58,"y":0.60,"player_id":null}
  ]'::jsonb;
  ELSE
    v := '[]'::jsonb;
    FOR i IN 0..(p_size - 1) LOOP
      v := v || jsonb_build_array(
        jsonb_build_object('id','A' || i, 'team','A', 'role','??', 'x', 0.1 + 0.3*i::float/p_size, 'y', 0.2 + 0.6*i::float/p_size, 'player_id', null),
        jsonb_build_object('id','B' || i, 'team','B', 'role','??', 'x', 0.9 - 0.3*i::float/p_size, 'y', 0.2 + 0.6*i::float/p_size, 'player_id', null)
      );
    END LOOP;
  END CASE;
  RETURN v;
END;
$fn$;

NOTIFY pgrst, 'reload schema';
