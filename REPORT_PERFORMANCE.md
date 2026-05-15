# Отчёт по производительности — Athletic Flow

**Дата**: 14.05.2026
**Вопрос**: «Сайт выдержит 5 000 одновременных пользователей?»
**Короткий ответ**: **Нет, не в текущей конфигурации.** Подробности — ниже без воды.

---

## TL;DR

| Слой              | Реальная capacity сегодня | Бутылочное горло                     |
|-------------------|---------------------------|---------------------------------------|
| Frontend (CF)     | 5 000 RPS уверенно         | ОК (если включен Cloudflare CDN)       |
| Supabase Free     | ~60 concurrent             | DB-pool, RLS, MAU-лимит 50K           |
| Supabase Pro $25  | ~200–400 concurrent        | DB-pool, RLS                           |
| Realtime          | 100 concurrent (Free)      | Лимит подписок Supabase                |
| Nominatim         | 1 req/sec                  | Внешний бан-лист, deal-breaker        |
| Overpass API      | shared, throttled          | Внешний rate limit                     |

Чтобы держать 5 000 одновременных пользователей (DAU ~25–50K, MAU ~150–300K), нужны:
1. **Supabase Team ($599/мес)** или собственный Postgres + PgBouncer.
2. **Свой геокодер** (Я.Геокодер или MapTiler, не Nominatim).
3. **Свой источник дворовых площадок** (один раз импортировать OSM в свою таблицу — не дергать Overpass на каждом запросе пользователя).
4. **Realtime — переключить с public.games на узкие channel'ы** (например, только конкретная игра, как уже сделано в /games/:id; на главной — заменить realtime на focus-refetch + 30-sec polling).
5. **React Query / SWR** для дедупликации и кеша.

---

## 1. Что я проверил по факту

### 1.1. Frontend / билд

- **Стек**: TanStack Start (SSR) + React 19 + Tailwind v4 + Vite + Capacitor (моб.) + Cloudflare deploy (видно по `@cloudflare/vite-plugin`).
- **Тяжёлые библиотеки**: framer-motion (для анимаций), leaflet + react-leaflet (карта, лениво), recharts (отчёты), embla-carousel, входит в bundle.
- **Lazy-загружено**: StadiumsMap (`lazy(() => import(...))`) — это правильно.
- **Не lazy**: framer-motion подключается на главной (`motion` сразу). Сейчас он есть на главной для hero-анимации. Это +~50KB gzip к initial bundle. Не критично.
- **SSR**: используется. Это плюс — Cloudflare кеширует HTML.

**Verdict frontend**: при включённом Cloudflare кешинге держит десятки тысяч RPS. ОК.

### 1.2. Supabase — это сердце узкого места

Все данные читаются с клиента напрямую через Supabase JS SDK. Каждый пользователь делает:

- На главной — 2 запроса к `games` + realtime подписка на `games`.
- На /games — 4–5 запросов: games, stadiums, OSM-Overpass (внешний!), Nominatim (внешний!).
- На /stadiums — 1 запрос.
- На /stadiums/:id — 2 запроса.
- На /games/:id — игра + участники + профили + рейтинги + сообщения + goal_claims + realtime подписка.

**Главные риски Supabase Free**:
- DB connection pool: **~60 одновременных запросов**. При 5 000 пользователей с pollingом по 1 запросу в секунду → 5 000 RPS → пул переполнен через 2 секунды.
- MAU лимит **50K**: 5 000 concurrent ≈ 150–300K MAU. **Free план снесёт раньше нагрузки.**
- Egress 2GB/мес: при ~5KB/запрос × 5К пользователей × 30 запросов/сессия × 30 дней ≈ **22GB**.

**Supabase Pro ($25/мес)**:
- Pool 200, MAU 100K, egress 250GB — комфортнее, но 5К concurrent потребует connection pooler (`pgbouncer transaction mode`).

**Чтобы реально держать 5К**: либо Supabase Team ($599), либо **самостоятельный Postgres + PgBouncer transaction-mode + PgHero для мониторинга**.

### 1.3. Внешние API — deal-breakers

| API           | Лимит                       | Где используется                  | Что будет при 5К       |
|---------------|------------------------------|------------------------------------|------------------------|
| Nominatim     | 1 req/sec на IP              | /games — поиск адреса вручную      | Бан/throttle           |
| Overpass API  | ~10 req/min на IP            | /games — поиск OSM-площадок        | 503/таймаут            |

При даже 100 одновременных пользователях, использующих ручной ввод адреса, Nominatim перестанет отвечать. **Это блокер.** Решение:
- **Геокодинг**: подключить [Я.Геокодер](https://yandex.ru/dev/geocode) (бесплатно до 25K/день, дальше платный) или MapTiler.
- **OSM-площадки**: единоразово прогнать Overpass → залить в supabase (`public_pitches` table) с PostGIS — потом отдавать out-of-the-box по радиусу.

### 1.4. Realtime подписки

- В `/games/:id` — подписка на `game_participants` с фильтром `game_id=eq.$id`. Это **дешёвый узкий канал**. ОК.
- На главной я только что добавил `home-upcoming-games` и `home-next-game` — **подписки без фильтра, на все изменения `games`**. При 5К пользователях это будет 5К открытых WebSocket'ов и broadcast каждому при каждом INSERT. ⚠️ **Нужно переключить главную на 30-sec polling вместо realtime, либо сузить фильтр** (например, `starts_at=gte.now` нельзя в Supabase Realtime — оно фильтрует только по equality. Тогда — polling).

→ **Action**: на главной заменить supabase realtime на `setInterval(load, 30_000)`. (См. рекомендации ниже.)

### 1.5. Отсутствие кеширования

- Нет React Query / SWR. Каждый useEffect при mount стреляет новый запрос. После создания игры нет инвалидации кеша — есть только тот же endpoint, который заново фетчится.
- На клиенте `import.meta.env` нормально, но **ENV-fallback на process.env в browser коде** (`client.ts`) — мёртвый, можно убрать.

### 1.6. Индексы и RLS

Я не вижу SQL миграций в репо, но по типам можно предположить:
- `games(starts_at)` — нужен индекс, есть `gte starts_at` в каждом запросе.
- `games(is_private, starts_at)` — нужен композитный индекс.
- `games(stadium_id)` — нужен (используется в stadium-by-id).
- `game_participants(game_id, user_id)` — должен быть unique.
- `goal_claim_approvals(claim_id, approver_id)` — unique (я добавил в `sql/goals_security.sql`).
- `profiles(username)` — unique с trgm для поиска по `@username`.

→ **Action**: запросить выгрузку `pg_indexes` из supabase и сверить.

---

## 2. Конкретные узкие места по приоритету

1. **🔴 BLOCKER — Nominatim / Overpass.** При >100 пользователях в час сервисы отбросят запросы. Это первое, что упадёт.
2. **🔴 BLOCKER — Supabase Free MAU/egress.** Сшибёт до 1К пользователей.
3. **🟠 HIGH — Realtime на главной без фильтра.** Я только что это добавил для фикса бага «не отображается игра». Нужно заменить на polling.
4. **🟠 HIGH — Connection pool.** Без PgBouncer transaction-mode у Supabase Pro пул кончится на ~300 одновременных запросах.
5. **🟡 MID — нет React Query.** Дублирующие запросы при перерендерах. На 5К → +30–50% лишней нагрузки.
6. **🟡 MID — `/games` делает 4–5 запросов параллельно при mount.** Если каждый пользователь это N раз делает — нагрузка x N.
7. **🟢 LOW — bundle size.** Влияет на cold start, не на capacity.

---

## 3. Что я готов сделать прямо сейчас (быстрые победы)

Файл `REPORT_PERFORMANCE.md` — это аудит. По коду я уже изменил то, что не ломает контракт:

- Главная (`routes/index.tsx`) — добавил realtime, но **рекомендую переключить на polling 30s + focus** для capacity (см. рекомендацию ниже, патч приложен).
- `sql/goals_security.sql` — закрыл дыры в системе голов (см. отдельный отчёт).

### Дополнительные правки (не сделаны, нужно решение пользователя):

- [ ] **Перенести Overpass-запросы на бэк** (server route + кеш в `public.public_pitches`). Один раз прогнать.
- [ ] **Заменить Nominatim на Я.Геокодер** через `/api/geocode?q=...` server route (с throttle + кешем).
- [ ] **Внедрить React Query** на главной и /games.
- [ ] **Композитные индексы** в Supabase.
- [ ] **Подключить PgBouncer transaction-mode** (settings → connection pooler).

---

## 4. Финальная честная оценка

В текущем виде сайт **держит максимум ~100–300 одновременных пользователей** до того, как:
- Nominatim начнёт банить,
- Supabase Free упрётся в MAU,
- Realtime поплывёт.

Чтобы держать **5 000 одновременных**:
- Минимум: Supabase Pro + Я.Геокодер + перенос Overpass на бэк + polling вместо realtime на главной + индексы.
- Бюджет: ~$50–100/мес инфраструктуры.
- Время на правки: 2–4 рабочих дня одного разработчика.

Если коллега говорит «выдержит 5К» — попроси показать пейпер: на каком плане Supabase, есть ли PgBouncer, есть ли свой геокодер, и где замерял (k6, artillery, locust). Без этого — слова.

---

## 5. Что сделать ТЕБЕ как заказчику

1. Запустить нагрузочный тест на staging (k6 / artillery) с 500–1000 VU. Если падает — 5К тем более.
2. Включить Cloudflare Cache для статики (Vite-плагин уже подключает, проверь в дашборде).
3. Заменить Nominatim/Overpass до запуска промо.
4. Применить `sql/goals_security.sql` в supabase.

---

*Аудит без воды. Если что-то выглядит как FUD — проверь сам метриками. Без замеров — это всё гипотезы.*
