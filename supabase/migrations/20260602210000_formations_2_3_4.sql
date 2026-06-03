-- Расширяем build_draft_slots размерами 2, 3, 4 — теперь слайдер на /create
-- разрешает «2 на 2 ... 11 на 11». Без этого формации для мини-форматов
-- падали в ELSE-фолбэк (линейная сетка) и выглядели криво.

CREATE OR REPLACE FUNCTION public.build_draft_slots(p_size int)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE v jsonb; i int;
BEGIN
  CASE p_size
  WHEN 2 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.06,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"ST","x":0.35,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.94,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"ST","x":0.65,"y":0.5,"player_id":null}
  ]'::jsonb;
  WHEN 3 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.05,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"MF","x":0.22,"y":0.32,"player_id":null},
    {"id":"A2","team":"A","role":"ST","x":0.40,"y":0.62,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.95,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"MF","x":0.78,"y":0.32,"player_id":null},
    {"id":"B2","team":"B","role":"ST","x":0.60,"y":0.62,"player_id":null}
  ]'::jsonb;
  WHEN 4 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.05,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"DF","x":0.20,"y":0.30,"player_id":null},
    {"id":"A2","team":"A","role":"DF","x":0.20,"y":0.70,"player_id":null},
    {"id":"A3","team":"A","role":"ST","x":0.40,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.95,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"DF","x":0.80,"y":0.30,"player_id":null},
    {"id":"B2","team":"B","role":"DF","x":0.80,"y":0.70,"player_id":null},
    {"id":"B3","team":"B","role":"ST","x":0.60,"y":0.5,"player_id":null}
  ]'::jsonb;
  WHEN 5 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.05,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"DF","x":0.18,"y":0.30,"player_id":null},
    {"id":"A2","team":"A","role":"DF","x":0.18,"y":0.70,"player_id":null},
    {"id":"A3","team":"A","role":"MF","x":0.36,"y":0.30,"player_id":null},
    {"id":"A4","team":"A","role":"MF","x":0.36,"y":0.70,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.95,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"DF","x":0.82,"y":0.30,"player_id":null},
    {"id":"B2","team":"B","role":"DF","x":0.82,"y":0.70,"player_id":null},
    {"id":"B3","team":"B","role":"MF","x":0.64,"y":0.30,"player_id":null},
    {"id":"B4","team":"B","role":"MF","x":0.64,"y":0.70,"player_id":null}
  ]'::jsonb;
  WHEN 6 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.05,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"CB","x":0.16,"y":0.5,"player_id":null},
    {"id":"A2","team":"A","role":"LB","x":0.20,"y":0.22,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.20,"y":0.78,"player_id":null},
    {"id":"A4","team":"A","role":"CM","x":0.30,"y":0.5,"player_id":null},
    {"id":"A5","team":"A","role":"ST","x":0.41,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.95,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"CB","x":0.84,"y":0.5,"player_id":null},
    {"id":"B2","team":"B","role":"LB","x":0.80,"y":0.22,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.80,"y":0.78,"player_id":null},
    {"id":"B4","team":"B","role":"CM","x":0.70,"y":0.5,"player_id":null},
    {"id":"B5","team":"B","role":"ST","x":0.59,"y":0.5,"player_id":null}
  ]'::jsonb;
  WHEN 7 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.04,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"CB","x":0.14,"y":0.5,"player_id":null},
    {"id":"A2","team":"A","role":"LB","x":0.18,"y":0.22,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.18,"y":0.78,"player_id":null},
    {"id":"A4","team":"A","role":"CM","x":0.28,"y":0.34,"player_id":null},
    {"id":"A5","team":"A","role":"CM","x":0.28,"y":0.66,"player_id":null},
    {"id":"A6","team":"A","role":"ST","x":0.41,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.96,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"CB","x":0.86,"y":0.5,"player_id":null},
    {"id":"B2","team":"B","role":"LB","x":0.82,"y":0.22,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.82,"y":0.78,"player_id":null},
    {"id":"B4","team":"B","role":"CM","x":0.72,"y":0.34,"player_id":null},
    {"id":"B5","team":"B","role":"CM","x":0.72,"y":0.66,"player_id":null},
    {"id":"B6","team":"B","role":"ST","x":0.59,"y":0.5,"player_id":null}
  ]'::jsonb;
  WHEN 8 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.04,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.15,"y":0.20,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.15,"y":0.5,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.15,"y":0.80,"player_id":null},
    {"id":"A4","team":"A","role":"LM","x":0.28,"y":0.20,"player_id":null},
    {"id":"A5","team":"A","role":"CM","x":0.28,"y":0.5,"player_id":null},
    {"id":"A6","team":"A","role":"RM","x":0.28,"y":0.80,"player_id":null},
    {"id":"A7","team":"A","role":"ST","x":0.41,"y":0.5,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.96,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.85,"y":0.20,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.85,"y":0.5,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.85,"y":0.80,"player_id":null},
    {"id":"B4","team":"B","role":"LM","x":0.72,"y":0.20,"player_id":null},
    {"id":"B5","team":"B","role":"CM","x":0.72,"y":0.5,"player_id":null},
    {"id":"B6","team":"B","role":"RM","x":0.72,"y":0.80,"player_id":null},
    {"id":"B7","team":"B","role":"ST","x":0.59,"y":0.5,"player_id":null}
  ]'::jsonb;
  WHEN 9 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.04,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.14,"y":0.20,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.14,"y":0.5,"player_id":null},
    {"id":"A3","team":"A","role":"RB","x":0.14,"y":0.80,"player_id":null},
    {"id":"A4","team":"A","role":"LM","x":0.26,"y":0.20,"player_id":null},
    {"id":"A5","team":"A","role":"CM","x":0.26,"y":0.5,"player_id":null},
    {"id":"A6","team":"A","role":"RM","x":0.26,"y":0.80,"player_id":null},
    {"id":"A7","team":"A","role":"ST","x":0.40,"y":0.36,"player_id":null},
    {"id":"A8","team":"A","role":"ST","x":0.40,"y":0.64,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.96,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.86,"y":0.20,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.86,"y":0.5,"player_id":null},
    {"id":"B3","team":"B","role":"RB","x":0.86,"y":0.80,"player_id":null},
    {"id":"B4","team":"B","role":"LM","x":0.74,"y":0.20,"player_id":null},
    {"id":"B5","team":"B","role":"CM","x":0.74,"y":0.5,"player_id":null},
    {"id":"B6","team":"B","role":"RM","x":0.74,"y":0.80,"player_id":null},
    {"id":"B7","team":"B","role":"ST","x":0.60,"y":0.36,"player_id":null},
    {"id":"B8","team":"B","role":"ST","x":0.60,"y":0.64,"player_id":null}
  ]'::jsonb;
  WHEN 10 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.03,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.13,"y":0.16,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.13,"y":0.38,"player_id":null},
    {"id":"A3","team":"A","role":"CB","x":0.13,"y":0.62,"player_id":null},
    {"id":"A4","team":"A","role":"RB","x":0.13,"y":0.84,"player_id":null},
    {"id":"A5","team":"A","role":"LM","x":0.26,"y":0.25,"player_id":null},
    {"id":"A6","team":"A","role":"CM","x":0.26,"y":0.5,"player_id":null},
    {"id":"A7","team":"A","role":"RM","x":0.26,"y":0.75,"player_id":null},
    {"id":"A8","team":"A","role":"ST","x":0.40,"y":0.36,"player_id":null},
    {"id":"A9","team":"A","role":"ST","x":0.40,"y":0.64,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.97,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.87,"y":0.16,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.87,"y":0.38,"player_id":null},
    {"id":"B3","team":"B","role":"CB","x":0.87,"y":0.62,"player_id":null},
    {"id":"B4","team":"B","role":"RB","x":0.87,"y":0.84,"player_id":null},
    {"id":"B5","team":"B","role":"LM","x":0.74,"y":0.25,"player_id":null},
    {"id":"B6","team":"B","role":"CM","x":0.74,"y":0.5,"player_id":null},
    {"id":"B7","team":"B","role":"RM","x":0.74,"y":0.75,"player_id":null},
    {"id":"B8","team":"B","role":"ST","x":0.60,"y":0.36,"player_id":null},
    {"id":"B9","team":"B","role":"ST","x":0.60,"y":0.64,"player_id":null}
  ]'::jsonb;
  WHEN 11 THEN v := '[
    {"id":"A0","team":"A","role":"GK","x":0.03,"y":0.5,"player_id":null},
    {"id":"A1","team":"A","role":"LB","x":0.13,"y":0.14,"player_id":null},
    {"id":"A2","team":"A","role":"CB","x":0.13,"y":0.38,"player_id":null},
    {"id":"A3","team":"A","role":"CB","x":0.13,"y":0.62,"player_id":null},
    {"id":"A4","team":"A","role":"RB","x":0.13,"y":0.86,"player_id":null},
    {"id":"A5","team":"A","role":"LM","x":0.26,"y":0.14,"player_id":null},
    {"id":"A6","team":"A","role":"CM","x":0.26,"y":0.38,"player_id":null},
    {"id":"A7","team":"A","role":"CM","x":0.26,"y":0.62,"player_id":null},
    {"id":"A8","team":"A","role":"RM","x":0.26,"y":0.86,"player_id":null},
    {"id":"A9","team":"A","role":"ST","x":0.40,"y":0.38,"player_id":null},
    {"id":"A10","team":"A","role":"ST","x":0.40,"y":0.62,"player_id":null},
    {"id":"B0","team":"B","role":"GK","x":0.97,"y":0.5,"player_id":null},
    {"id":"B1","team":"B","role":"LB","x":0.87,"y":0.14,"player_id":null},
    {"id":"B2","team":"B","role":"CB","x":0.87,"y":0.38,"player_id":null},
    {"id":"B3","team":"B","role":"CB","x":0.87,"y":0.62,"player_id":null},
    {"id":"B4","team":"B","role":"RB","x":0.87,"y":0.86,"player_id":null},
    {"id":"B5","team":"B","role":"LM","x":0.74,"y":0.14,"player_id":null},
    {"id":"B6","team":"B","role":"CM","x":0.74,"y":0.38,"player_id":null},
    {"id":"B7","team":"B","role":"CM","x":0.74,"y":0.62,"player_id":null},
    {"id":"B8","team":"B","role":"RM","x":0.74,"y":0.86,"player_id":null},
    {"id":"B9","team":"B","role":"ST","x":0.60,"y":0.38,"player_id":null},
    {"id":"B10","team":"B","role":"ST","x":0.60,"y":0.62,"player_id":null}
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
