-- =============================================================
-- Athletic Flow — включаем Realtime для нужных таблиц
-- =============================================================
-- Без этого чат, уведомления и live-обновления не работают.
-- Применять в Supabase SQL Editor.
-- =============================================================

-- Добавляем таблицы в публикацию supabase_realtime.
-- DO блок — потому что ALTER PUBLICATION ADD TABLE не идемпотентен
-- (падает с "table already in publication"), а ALTER ... DROP TABLE может не существовать.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'public.game_messages',
    'public.conversation_messages',
    'public.direct_messages',
    'public.game_participants',
    'public.conversation_members',
    'public.friendships',
    'public.goal_claims',
    'public.goal_claim_approvals'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', t);
      RAISE NOTICE 'Added to realtime: %', t;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Already in realtime: %', t;
      WHEN OTHERS THEN
        RAISE NOTICE 'Skip %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ВАЖНО: на games НЕ включаем realtime (см. REPORT_PERFORMANCE.md).
-- Главная страница использует polling 30s — это намеренно.

-- =============================================================
-- Проверь после применения:
--   SELECT schemaname, tablename
--   FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime'
--   ORDER BY 1, 2;
-- Должны быть видны все добавленные таблицы.
-- =============================================================
