# Деплой: админка менеджера + фиксы граблей (09.06.2026)

## Что в этом релизе

**Миграции:**
- `20260609100000_fix_realtime_pricing_captains.sql` — realtime publication (6 таблиц), серверный расчёт цены в `book_venue`, нотификация менеджеру о новой брони, клинап висячих `game_captains`.
- `20260609110000_manager_admin_rpc.sql` — `reject_series(id, reason)`, `manager_list_bookings(from, to, include_cancelled)`.

**Код:**
- `/manager` — админка менеджера: Записи / Календарь / График работы / Цены.
  - `src/routes/manager.tsx` + `manager.index.tsx` + `manager.calendar.tsx` + `manager.schedule.tsx` + `manager.prices.tsx`
  - `src/components/manager/` — ManagerShell, BookingRow, manager-data.
- Фикс граблей №11: добавлен mobile-фикс `!top-4 ...` во все диалоги с полями ввода (chats, admin.users, games_.$gameId, MessageActions, PhoneVerifyDialog, chats_.$conversationId).

## Порядок деплоя

```bash
# 1. Локально: коммит и пуш
git add -A
git commit -m "feat: manager admin panel (/manager) + realtime/pricing/captains fixes"
git push

# 2. Миграции на VPS (строго по порядку)
scp supabase\migrations\20260609100000_fix_realtime_pricing_captains.sql root@91.229.8.235:/tmp/
scp supabase\migrations\20260609110000_manager_admin_rpc.sql root@91.229.8.235:/tmp/

ssh root@91.229.8.235 "docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/20260609100000_fix_realtime_pricing_captains.sql"
ssh root@91.229.8.235 "docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/20260609110000_manager_admin_rpc.sql"

# 3. Рестарт PostgREST (новые RPC) + realtime (новые таблицы в publication)
ssh root@91.229.8.235 "cd /opt/supabase/docker && docker compose restart rest realtime"

# 4. Деплой фронта
ssh root@91.229.8.235 "/var/www/af-sport/deploy.sh"
```

## Разовые действия на VPS (грабли №7 и №10)

```bash
# Supavisor не нужен (ходим через Kong) — выключить, чтобы не рестартился:
ssh root@91.229.8.235 "cd /opt/supabase/docker && docker compose stop supavisor"
# + закомментировать сервис supavisor в docker-compose.yml, иначе вернётся при следующем `up -d`.

# /sb/ блок в nginx — legacy-проксь на Cloud. После боевой проверки релиза:
#   1) убрать location /sb/ из /etc/nginx/sites-available/af-sport
#   2) nginx -t && systemctl reload nginx
```

## Smoke-тест после деплоя

1. **Роль менеджера**: убедиться, что у стадиона Луч заполнен `manager_id`
   (`SELECT id, name, manager_id FROM stadiums WHERE is_partner;`).
2. Под аккаунтом менеджера открыть `https://af-sport.ru/manager`:
   - Записи: видна карточка Луча, статистика, список броней.
   - Календарь: метки на днях с бронями; создать тестовую external-бронь → появилась; отменить.
   - График: сохранить 08:00–23:00 на все дни; добавить исключение на завтра «закрыто» →
     проверить что `/create` на завтра не даёт слотов (через `get_free_slots`).
   - Цены: поменять цену 1/3 поля → на открытой вкладке `/create` цена обновилась БЕЗ F5
     (это проверка пункта realtime publication!).
3. Под обычным аккаунтом: `/manager` → 404; создать игру на Луче →
   `SELECT price_per_player, rent_total FROM games ORDER BY created_at DESC LIMIT 1;` —
   значения совпадают с формулой ceil(price × hours × 1.1 / slots) (серверный расчёт).
4. У менеджера в колокольчике — нотификация «Новая бронь».
5. Висячие captains: `SELECT count(*) FROM game_captains gc WHERE NOT EXISTS
   (SELECT 1 FROM game_drafts d WHERE d.game_id = gc.game_id AND d.status IN ('pending','active','completed'));` → 0.

## Если что-то пошло не так

- RPC не видны (404 от PostgREST) → `NOTIFY pgrst, 'reload schema';` + `docker compose restart rest`.
- Realtime молчит → Studio → Database → Publications → проверить `supabase_realtime`
  содержит `venue_bookings`, `venue_size_options` и пр.; рестарт `realtime` контейнера.
- `/manager` отдаёт 404 менеджеру → проверить `stadiums.manager_id` = uuid аккаунта менеджера.
