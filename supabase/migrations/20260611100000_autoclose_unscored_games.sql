-- ============================================================
-- Автозакрытие игр без счёта.
--
-- Правило:
--   • Игра закончилась ≥24ч назад, счёта нет → нотификация (= пуш через
--     trg_notifications_push) организатору и капитанам: «внесите счёт,
--     иначе игра закроется 0:0». Одноразово (дедуп по payload.game_id).
--   • Игра закончилась ≥3 дней назад, счёта нет → game_results 0:0
--     (notes 'auto…'), archived_at = now(), нотификация всем участникам.
--     Игра уходит из активных «Мои игры» в историю профилей.
--
-- Запуск: pg_cron, раз в час. pg_cron предзагружен в образе
-- supabase/postgres; job живёт в БД postgres.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- 1. Основная функция (вызывается кроном)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_unscored_games()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_reminded int := 0;
  v_closed int := 0;
  v_g record;
BEGIN
  -- ---- Напоминание (24ч, одноразово) ----
  WITH stale AS (
    SELECT g.id, g.organizer_id, g.starts_at
    FROM public.games g
    WHERE g.ends_at < now() - interval '1 day'
      AND g.archived_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.game_results r WHERE r.game_id = g.id)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.type = 'finalize_reminder'
          AND n.payload->>'game_id' = g.id::text
      )
  ),
  targets AS (
    -- Организатор + капитаны драфта (если были).
    SELECT DISTINCT s.id AS game_id, s.starts_at, u.uid
    FROM stale s
    CROSS JOIN LATERAL (
      SELECT s.organizer_id AS uid
      UNION
      SELECT c.user_id FROM public.game_captains c WHERE c.game_id = s.id
    ) u
  ),
  ins AS (
    INSERT INTO public.notifications (user_id, type, title, body, url, payload)
    SELECT
      t.uid,
      'finalize_reminder',
      'Внесите счёт игры',
      'Игра ' || to_char(t.starts_at AT TIME ZONE 'Europe/Moscow', 'DD.MM HH24:MI')
        || ' завершилась. Внесите счёт и оцените игроков — иначе через 2 дня игра '
        || 'закроется автоматически со счётом 0:0.',
      '/games/' || t.game_id,
      jsonb_build_object('game_id', t.game_id)
    FROM targets t
    RETURNING 1
  )
  SELECT count(*) INTO v_reminded FROM ins;

  -- ---- Автозакрытие (3 дня) ----
  FOR v_g IN
    SELECT g.id, g.organizer_id, g.starts_at
    FROM public.games g
    WHERE g.ends_at < now() - interval '3 days'
      AND g.archived_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.game_results r WHERE r.game_id = g.id)
  LOOP
    -- Результат 0:0 от имени организатора, с пометкой про авто.
    INSERT INTO public.game_results (game_id, score_team_a, score_team_b, finalized_by, notes)
    VALUES (v_g.id, 0, 0, v_g.organizer_id, 'auto: счёт не внесён в течение 3 дней')
    ON CONFLICT (game_id) DO NOTHING;

    -- Нотификация всем участникам ДО архивации.
    INSERT INTO public.notifications (user_id, type, title, body, url, payload)
    SELECT
      gp.user_id,
      'game_autoclosed',
      'Игра закрыта со счётом 0:0',
      'Счёт игры ' || to_char(v_g.starts_at AT TIME ZONE 'Europe/Moscow', 'DD.MM HH24:MI')
        || ' не был внесён за 3 дня — она ушла в историю со счётом 0:0.',
      '/games/' || v_g.id,
      jsonb_build_object('game_id', v_g.id)
    FROM public.game_participants gp
    WHERE gp.game_id = v_g.id;

    UPDATE public.games SET archived_at = now() WHERE id = v_g.id;
    v_closed := v_closed + 1;
  END LOOP;

  RETURN json_build_object('reminded', v_reminded, 'closed', v_closed);
END;
$fn$;

-- ============================================================
-- 2. Крон-задача: раз в час
-- ============================================================
DO $$
BEGIN
  PERFORM cron.unschedule('process-unscored-games');
EXCEPTION WHEN OTHERS THEN
  NULL; -- ещё не существовала
END $$;

SELECT cron.schedule(
  'process-unscored-games',
  '15 * * * *',
  $$SELECT public.process_unscored_games();$$
);

NOTIFY pgrst, 'reload schema';
