# Athletic Flow (af-sport.ru) — Handover

> Документ для Claude Code: контекст проекта, архитектура, конвенции, статус задач.
> Дата: 03.06.2026.

---

## 1. О проекте

**Athletic Flow** — платформа для любительского спорта в Москве (футбол / мини-футбол / волейбол / теннис). Прод: `https://af-sport.ru`.

Пользовательские сценарии:
- Найти открытую игру в каталоге и присоединиться.
- Создать свою игру: выбрать стадион → дату/время → размер команды → собрать состав.
- Платить за участие (комиссия 10% зашита в `price_per_player`).
- После матча — финализация (счёт, голы, MVP) → архивация.
- Драфт расстановки игроков по полю (drag&drop) перед стартом.
- Чаты игр + личные DM.
- Заявки на участие в открытых играх с аппрувом организатора.

**Контракт-партнёр** (с 03.06.2026): СК «Луч» (Волоколамское ш., 88).
Своя карточка стадиона с описанием/фото/полями, своя ценовая модель (за час × кол-во часов × +10% комиссия), брони слотов с проверкой занятости.

---

## 2. Tech Stack

| Слой | Что |
| --- | --- |
| Frontend | **TanStack Start 1.131** (SSR + client), React, Tailwind, shadcn/ui |
| State / data | Supabase JS (auth, postgres, realtime), без React Query |
| Mobile | Capacitor (iOS/Android из той же кодовой базы) |
| Backend | **Self-hosted Supabase** на reg.ru VPS (с 02.06.2026, ради 152-ФЗ локализации ПДн) |
| Сервер запросов | TanStack Start server-routes для `/api/*` (upload, geocode, pitches) + PM2 Node.js |
| Web server | nginx (reverse proxy на Node.js + Kong/Supabase) |
| Карта | Leaflet + react-leaflet (OSM tiles) |

**Сборка:** Vite. Билд содержит `client-dist/` (статика) и `server/` (SSR + API routes).

---

## 3. Инфраструктура

**VPS reg.ru** — `91.229.8.235` (Москва-2, Ubuntu 26.04 LTS, 8 vCPU / 8 GB RAM / 120 GB NVMe).

| Что | Где | Как запущено |
| --- | --- | --- |
| Node.js приложение | `/var/www/af-sport/current` | PM2 (`af-sport`) на `:3000` |
| nginx | `/etc/nginx/sites-available/af-sport` (+ `api-af-sport`) | systemd |
| Self-hosted Supabase | `/opt/supabase/docker` | docker compose |
| Локальные uploads | `/var/www/af-sport/uploads/` | nginx alias `/uploads/` |
| Деплой-скрипт | `/var/www/af-sport/deploy.sh` | стэш+pull+build+pm2 restart |

**Домены:**
- `af-sport.ru` — фронт (nginx → Node.js :3000).
- `api.af-sport.ru` — Supabase REST/auth/realtime (nginx → Kong :8000).
- `www.af-sport.ru` → 301 на `af-sport.ru`.

**SSL:** Let's Encrypt через certbot (`/etc/letsencrypt/live/...`).

**Безопасность:**
- iptables INPUT по умолчанию DROP, разрешены 22/80/443.
- DOCKER-USER chain режет наружу 5432/6543/8000/8443/4000.

**Supabase Docker секреты:** `/root/.supabase-secrets` (JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, POSTGRES_PASSWORD, DASHBOARD_PASSWORD, SECRET_KEY_BASE, VAULT_ENC_KEY).

---

## 4. Клиент: ENV и подключение к Supabase

`.env` в корне (коммитится в git — anon ключ публичный):

```
SUPABASE_URL="https://api.af-sport.ru"
VITE_SUPABASE_URL="https://api.af-sport.ru"
SUPABASE_PUBLISHABLE_KEY="<JWT role=anon, до 2036>"
VITE_SUPABASE_PUBLISHABLE_KEY="<тот же>"
SUPABASE_SERVICE_ROLE_KEY="<JWT role=service_role>"  # не expose клиенту!
VITE_SUPABASE_PROJECT_ID="af-selfhosted"
YANDEX_GEOCODER_KEY="..."
ADMIN_USER_IDS="a3d8a1a1-2332-4c9d-8a4e-3fd76873a187"  # uuid Миши
```

Клиент создаётся в `src/integrations/supabase/client.ts` — singleton через `new Proxy`, ленивая инициализация для SSR.

---

## 5. Структура проекта

```
app_mvp/
├── src/
│   ├── routes/                  # TanStack Start file-routes
│   │   ├── index.tsx            # Главная
│   │   ├── games.tsx            # Каталог игр
│   │   ├── games_.$gameId.tsx   # Страница игры (3500+ строк, мегафайл)
│   │   ├── create.tsx           # Создание игры
│   │   ├── my.tsx               # Мои игры (организованные + участник)
│   │   ├── profile.tsx          # Мой профиль
│   │   ├── u.$username.tsx      # Публичный профиль игрока
│   │   ├── friends.tsx, friends_.$friendId.tsx  # Друзья + DM
│   │   ├── chats.tsx, chats_.$conversationId.tsx  # Беседы
│   │   ├── stadiums.tsx, stadiums_.$stadiumId.tsx  # Стадионы
│   │   ├── auth.tsx             # Логин/регистрация
│   │   ├── admin*.tsx           # Старая админ-панель Миши
│   │   └── api/                 # Server routes
│   │       ├── upload.ts        # Локальное хранилище (S3 заменяет)
│   │       ├── geocode.ts, geocode-suggest.ts
│   │       └── pitches.ts       # OSM Overpass прокси
│   ├── components/
│   │   ├── ui/                  # shadcn/ui
│   │   ├── layout/
│   │   │   ├── SiteShell.tsx    # Шапка + футер
│   │   │   └── NotificationsBell.tsx  # Колокольчик
│   │   ├── game/
│   │   │   ├── GameDraft.tsx    # Драфт расстановки (drag&drop)
│   │   │   └── FormationPreview.tsx  # Превью формации в /create
│   │   ├── maps/
│   │   │   └── StadiumsMap.tsx  # Leaflet карта
│   │   ├── chat/                # Чат-компоненты
│   │   └── auth/                # RequireAuth, PhoneVerifyDialog
│   ├── lib/
│   │   ├── image.ts             # compressImage (canvas + JPEG quality loop)
│   │   ├── upload.ts            # uploadToBucket — наш wrapper
│   │   └── feature-flags.ts     # FEATURES.PHONE_VERIFICATION = false
│   ├── integrations/supabase/
│   │   ├── client.ts            # Singleton supabase
│   │   └── types.ts             # Сгенерённые типы (`supabase gen types`)
│   └── styles.css               # Tailwind + кастомные правила (no-spinner inputs, no-leaflet-flag)
├── supabase/
│   └── migrations/              # Все SQL-миграции, упорядочены по дате
├── .env                         # ENV переменные
├── deploy.sh                    # Локальная копия деплоя
└── HANDOVER.md                  # Этот файл
```

---

## 6. База данных (Postgres 15.8 self-hosted)

### Основные таблицы

| Таблица | Что хранит |
| --- | --- |
| `auth.users` | Стандартная GoTrue |
| `public.profiles` | Профиль (display_name, avatar_url, username, level, numeric_id) |
| `public.user_roles` | Enum `app_role`: `admin`, `organizer`, `stadium_owner`, `player`, `stadium_manager` |
| `public.stadiums` | Стадион + поля партнёра: `manager_id`, `description`, `cover_url`, `phone`, `email`, `website`, `is_partner` |
| `public.stadium_venues` | Площадки внутри стадиона (Большое поле №1, Манеж, ...) |
| `public.venue_size_options` | Варианты аренды площадки (full / two_thirds / one_third) с ценой/час и parallel_count |
| `public.stadium_schedules` | График работы стадиона (weekday + open/close time) |
| `public.stadium_schedule_overrides` | Override на конкретную дату (праздники, ремонт) |
| `public.venue_bookings` | Брони слотов: source = game / external / maintenance |
| `public.game_series` | Серии игр (повторяющиеся брони) с аппрувом менеджера |
| `public.games` | Игра (sport, level, starts_at, ends_at, slots_total, price_per_player, rent_total, is_private, invite_token, archived_at) |
| `public.game_participants` | Состав (game_id, user_id, paid, joined_at) |
| `public.game_messages` | Чат игры (текст + image_url) |
| `public.game_results` | Счёт финализированной игры |
| `public.game_player_stats` | Личная стата игрока в матче (team A/B, goals, assists, is_mvp) |
| `public.game_join_requests` | Заявки на участие (pending/approved/rejected) |
| `public.game_drafts` | Драфт расстановки (status, slots jsonb, turn_team) |
| `public.game_captains` | Капитаны драфта (game_id, team A/B, user_id) |
| `public.notifications` | Унифицированные нотификации (type, title, body, url, payload, read_at) |
| `public.push_subscriptions` | Web Push endpoints |
| `public.profile_media` | Фото/видео профиля |
| `public.conversations`, `conversation_members`, `conversation_messages`, `direct_messages` | DM + групповые чаты |
| `public.friendships` | Дружба (status: pending/accepted) |
| `public.user_ratings` | Оценки игроков |
| `public.rating_review_votes` | Лайки/дизлайки отзывов |
| `public.goal_claims`, `goal_claim_approvals` | Заявки на голы с аппрувом партнёра |
| `public.urgent_replacement_log` | Антиспам для «срочной замены» |
| `public.geocode_suggest_cache` | Кэш геокодера |

### Ключевые RPC (все SECURITY DEFINER, search_path = public[+extensions])

| RPC | Что делает |
| --- | --- |
| `finalize_game(game_id, score_a, score_b, stats jsonb, notes)` | Закрывает игру: пишет результаты, ставит archived_at, шлёт нотификации, триггер режет дальнейшие мутации |
| `request_join(game_id, message)` | Подать заявку на участие в открытой игре (для приватных запрещено) |
| `approve_join(request_id)` / `reject_join(request_id, reason)` | Аппрув/реджект менеджером заявки |
| `set_captain(game_id, team, user_id)` | Назначение кэпа драфта (organizer-only) |
| `propose_draft(game_id, force)` / `accept_draft(game_id)` / `cancel_draft(game_id)` | Жизненный цикл драфта |
| `pick_slot(game_id, slot_id, player_id)` / `unpick_slot(game_id, slot_id)` | Расстановка в драфте (current turn) |
| `force_pick_slot(...)` | Дев-режим: организатор пикает за любую команду (UI кнопка `⚡ FORCE`) |
| `start_draft_test(game_id, cap_a, cap_b)` | Дев: запустить активный драфт минуя pending |
| `seed_test_participants(game_id, count)` | Дев: создать N фейковых auth.users + добавить в game_participants с paid=true |
| `cleanup_test_users()` | Дев: удалить всех `*@af-sport.local` |
| `build_draft_slots(p_size)` | Возвращает jsonb с координатами слотов для размера команды 2..11 (по реф. тренерской доски COACH FOOTBALL) |
| `get_free_slots(venue_id, date, size_option_id, duration_min)` | Возвращает свободные/занятые временные слоты для конкретного venue+даты (учитывает расписание, override, существующие брони, parallel_count) |
| `book_venue(venue_id, size_option_id, starts_at, ends_at, source, game_id, ...)` | Универсальная бронь. Проверяет overlap по parallel_count. Возвращает UUID booking |
| `cancel_booking(booking_id)` | Отмена брони (автор брони / менеджер / организатор игры) |
| `request_series(...)`, `approve_series(series_id)` | Серии игр с аппрувом менеджера. Approve генерирует N игр + N броней + auto-join организатора |
| `request_urgent_replacement(game_id)` | Срочная замена — нотификация игрокам из той же геозоны |
| `mark_notifications_read(ids)` / `mark_all_notifications_read()` | Колокольчик |
| `get_game_by_invite(token)` | RPC fallback для гостей на приватные игры через invite-token |
| `vote_rating_review(rating_id, vote)` | Лайк/дизлайк отзыва |
| `request_join_to_game(...)`, `block_direct_join_when_approval()` | Триггер: на открытой игре прямой INSERT в `game_participants` запрещён (кроме организатора и через approve_join) |
| `block_mutations_on_archived()` | Триггер: после `archived_at IS NOT NULL` нельзя INSERT в чат/состав/UPDATE на game |

**Realtime publication `supabase_realtime`** включает: `game_participants`, `game_messages`, `game_drafts`, `game_captains`, `game_join_requests`, `game_results`, `game_player_stats`, `notifications`, `conversations`, `conversation_members`, `direct_messages`, `friendships`. Для контракта стоит проверить и добавить: `venue_size_options`, `venue_bookings`, `stadium_venues`, `stadium_schedules`, `stadium_schedule_overrides`.

---

## 7. Frontend конвенции

### Real-time pattern

Везде после переезда работает один из двух подходов:

1. **Realtime подписка** на конкретную строку/таблицу:
   ```ts
   const ch = supabase
     .channel(`game-${gameId}-live`)
     .on("postgres_changes", { event: "*", schema: "public", table: "X", filter: `id=eq.${gameId}` }, () => load())
     .subscribe();
   return () => supabase.removeChannel(ch);
   ```
   Используется в: `games_.$gameId.tsx`, `GameDraft.tsx`, `chats_.$conversationId.tsx`, `friends.tsx`, `friends_.$friendId.tsx`, `my.tsx` (ParticipantsPanel).

2. **Polling 30s + focus-refetch** (для каталогов и страниц, которые много кто видит — экономнее чем broadcasting):
   ```ts
   useEffect(() => {
     let alive = true;
     const safe = () => alive && load();
     safe();
     const id = setInterval(safe, 30_000);
     const onFocus = () => alive && document.visibilityState !== "hidden" && safe();
     window.addEventListener("focus", onFocus);
     document.addEventListener("visibilitychange", onFocus);
     return () => { alive = false; clearInterval(id); /* ... */ };
   }, [...]);
   ```
   Используется в: `games.tsx`, `my.tsx`, `index.tsx`, `profile.tsx`, `u.$username.tsx`, `NotificationsBell.tsx`.

**Оптимистичный re-fetch** обязательно после каждого RPC если страница не имеет realtime-подписки — иначе UI не обновится после собственного действия.

### Inputs

- `<input type="number">` спиннеры **скрыты глобально** через `src/styles.css`. Не нужно везде ставить кастомные классы.
- Все диалоги (`<Dialog>`): на мобиле фиксируем сверху через `!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2` чтобы клавиатура не закрывала textarea.

### Адаптив

Стандартные брейкпойнты Tailwind. Важно:
- Card-компоненты: `p-4 sm:p-6` (мобила тесная).
- Grid-children: `min-w-0` обязательно, иначе колонки растягиваются и появляется горизонтальный скролл.
- Главная обёртка страницы — `overflow-x-hidden` как страховка.

### Avatar

```tsx
<Avatar className="h-10 w-10">
  <AvatarImage src={profile?.avatar_url ?? undefined} />
  <AvatarFallback>{initials(profile?.display_name)}</AvatarFallback>
</Avatar>
```

Аватарки в `game_participants` берут `avatar_url` из join'а с `profiles`. Если показывают placeholder без картинки — баг в загрузке `avatar_url`, не в Avatar.

### Url params для динамических маршрутов

TanStack Router **не умеет** навигировать на динамический путь как plain string `/games/<uuid>`. Используем `navigate({ to: "/games/$gameId", params: { gameId } })` ИЛИ `window.location.assign(url)`. В `NotificationsBell` используется второй вариант.

### Search params (query string)

Декларируются через `validateSearch` в `createFileRoute`. Пример из `/create`:
```ts
validateSearch: (search) => {
  const uuidRe = /^[0-9a-f]{8}-.../i;
  return {
    stadium: typeof search.stadium === "string" && uuidRe.test(search.stadium) ? search.stadium : undefined,
    ...
  };
}
```

### Маршруты с динамическим сегментом

Файл должен называться с `_.$param` (например `stadiums_.$stadiumId.tsx`) — это синтаксис TanStack Start.

---

## 8. Контракт с «Лучом»

**Стадион:** Луч, Волоколамское ш., 88 корп. 9 стр. 1. `is_partner = true`. Менеджер — `manager_id` указан.

**5 площадок (после фикса будет 6 — два больших поля):**

| Название | Размер | Покрытие | Виды спорта | Цены/ч |
| --- | --- | --- | --- | --- |
| Большое поле №1 | 100×64 | Искусств. трава | Футбол | 16200 / 10800 / 5400 |
| Большое поле №2 (миграция 20260603120000) | 100×64 | Искусств. трава | Футбол | 16200 / 10800 / 5400 |
| Среднее поле | 96×54 | Искусств. трава | Футбол | 13200 / 8800 / 4400 |
| Малое поле | 60×30 | Искусств. трава | Футбол, мини-футбол | 5500 (без деления) |
| Манеж | крытый | Искусств. трава | Футбол, мини-футбол | 16000 (без деления) |
| Универсальный зал | крытый | Спорт. покрытие | Мини-футбол, волейбол, теннис | 5500 (без деления) |

**Расписание дефолтное:** Пн–Вс 08:00–23:00 (уточнить у менеджера).

**Flow бронирования:**
1. Юзер на `/stadiums/<луч>` видит карточки полей + цены.
2. Жмёт «Забронировать» под полем → `/create?stadium=X&venue=Y&size=Z&sport=...`.
3. `/create` детектит партнёрский стадион (`is_partner=true`), показывает выбор площадки + размера. Скрывает обычный блок «Оплата».
4. Цена = `price_per_hour × durationHours`, плюс комиссия 10%, делится на участников.
5. На submit: INSERT в `games` → RPC `book_venue(...)`. Если занято — игра удаляется (no orphan).

**Realtime цен:** `/create` подписан на `venue_size_options` через канал `venue-options-{venueId}`. Если менеджер меняет цену — пересчёт без F5.

---

## 9. Что сделано (за всю историю)

(тасклист в репо + Cowork. Ниже — крупные фичи.)

### Платформа
- ✅ Переезд с Supabase Cloud на self-hosted (152-ФЗ). Полностью.
- ✅ Local-file storage `/uploads/<bucket>/<userId>/<file>` через `/api/upload` (Plan B — TSPU блокировал Supabase Storage).
- ✅ iptables + ufw-эквивалент защита, docker-портов на 127.0.0.1 нет (открыты по факту, режутся DOCKER-USER правилом).
- ✅ Realtime audit на всех экранах — `games`, `my`, `profile`, `u.$username`, `games_.$gameId` (5 каналов), `NotificationsBell`, `GoalClaimsBlock`.

### Игры
- ✅ Создание игры (split/fixed модель оплаты, комиссия 10% зашита).
- ✅ Каталог игр с фильтрами (sport, level, время, поиск).
- ✅ Запись/выход, оплата (мок «прошло 900ms»).
- ✅ Заявки на участие в открытых играх (request_join → approve/reject от организатора). В приватных играх — прямой вход по invite-token.
- ✅ Чат игры с фото-аплоадом.
- ✅ Срочная замена (только organizer, антиспам 1ч).
- ✅ Финализация: счёт, голы, ассисты, MVP → архивация → история в профиле.
- ✅ Капитаны + Драфт расстановки (drag&drop по полю). Размеры команд 2–11, формации по тренерской доске COACH FOOTBALL.
- ✅ Force-режим для тестирования драфта одним аккаунтом.
- ✅ Тестовый посев игроков (`seed_test_participants`) — создаёт N фейков с paid=true.
- ✅ FormationPreview на `/create` — мини-схема расстановки.

### Социал
- ✅ Профили, никнеймы, аватарки, фото-альбомы, оценки/отзывы, лайки.
- ✅ Друзья (заявки + accept/decline).
- ✅ DM (личные сообщения).
- ✅ Беседы (групповые чаты с приглашениями).
- ✅ Колокольчик с unified `notifications` таблицей.
- ✅ Голы — заявки в матче с аппрувом партнёра.

### Контракт со стадионом (НОВОЕ 03.06.2026)
- ✅ Роль `stadium_manager`.
- ✅ Таблицы: `stadium_venues`, `venue_size_options`, `stadium_schedules`, `stadium_schedule_overrides`, `venue_bookings`, `game_series`.
- ✅ RPC: `get_free_slots`, `book_venue`, `cancel_booking`, `request_series`, `approve_series`.
- ✅ Seed Луча с 5 (→ 6) площадками, ценами с сайта stadion-luch.ru.
- ✅ Карточка партнёрского стадиона с фото, описанием, контактами, всеми полями и кнопкой «Забронировать».
- ✅ `/create` принимает `?stadium=&venue=&size=&sport=` и показывает выбор площадки + размера.
- ✅ После создания игры — `book_venue` с rollback при конфликте.
- ✅ Realtime цен (если менеджер меняет тариф).
- ✅ Главная: оставлены только 4 реальных спорта (Футбол, Мини-футбол, Волейбол, Теннис).
- ✅ Фикс украинского флага в leaflet attribution.

### Админка менеджера стадиона (НОВОЕ 09.06.2026)
- ✅ Маршрут `/manager` (layout `manager.tsx`, guard по `stadiums.manager_id = uid`, 404 для чужих).
- ✅ Вкладка «Записи» (`manager.index.tsx`): карточка стадиона, статистика месяца, заявки серий (approve/reject), ближайшие брони 14 дней. Realtime на `venue_bookings` + `game_series`.
- ✅ Вкладка «Календарь» (`manager.calendar.tsx`): месячная сетка с метками, список дня, создание external/maintenance брони через `book_venue`, отмена через `cancel_booking`.
- ✅ Вкладка «График работы» (`manager.schedule.tsx`): еженедельный график (delete+insert базовых строк), overrides на даты (upsert по `stadium_id,override_date`).
- ✅ Вкладка «Цены» (`manager.prices.tsx`): инлайн-редактирование `price_per_hour` + active, realtime-синхронизация.
- ✅ RPC: `manager_list_bookings(from,to,include_cancelled)` (миграция 20260609110000), `reject_series(id,reason)`.
- ✅ `book_venue` шлёт нотификацию менеджеру о новой брони (type `booking_created`).
- Финансы/Безопасность/Настройки из референса — отложены (см. #28b ниже).

---

## 10. Что НЕ сделано (открытые задачи)

| # | Задача | Подробнее |
| --- | --- | --- |
| #5 | Web Push авто-fire | Триггеры PG → `pg_net` → `send-push` Edge Function (старая была на Cloud). На self-hosted нужно: 1) сгенерить новые VAPID-ключи; 2) поднять `send-push` как Deno-функцию в self-hosted Edge Runtime ИЛИ как server-route в нашем Node.js (`/api/internal/send-push`); 3) переписать триггеры `trg_game_message_notify`, `trg_rating_received_notify` чтобы `pg_net` стучался на новый endpoint; 4) попросить юзеров переподписаться (VAPID-ключи новые). |
| #21 | Расширенные нотификации | Новые типы: новое сообщение в чате, MVP-плашка, аппрув заявки. Часть уже работает (запись в `notifications`), не хватает push. |
| #28 | ~~Админка менеджера стадиона~~ | ✅ СДЕЛАНО 09.06.2026 (ядро: Записи / Календарь / График / Цены). См. §9. |
| #28b | Админка менеджера: Финансы/Безопасность/Настройки | Баланс + заявка на вывод средств (нужна финансовая модель), PIN/смена пароля, реквизиты компании. По референсу. |
| #31 | Фильтр свободных стадионов по дате/времени | На `/games`, `/stadiums`, главной — единый фильтр date + time + duration, через `get_free_slots` отсекать стадионы где нет свободных слотов. |
| #32 | ~~UI для серий игр~~ | ✅ СДЕЛАНО 09.06.2026: тоггл «Повторять еженедельно» в /create (заявка через request_series), блок «Мои серии» в /my (статус, отзыв pending), аппрув/реджект в /manager. approve_series пропускает занятые даты (модель ёмкости). У менеджера повтор external-броней в календаре. |

---

## 11. Деплой workflow

**Локально:**
```bash
git add -A
git commit -m "..."
git push
```

**На VPS:**
```bash
ssh root@91.229.8.235 "/var/www/af-sport/deploy.sh"
# Что внутри: git stash, git pull, rm -rf .output .tanstack, npm run build, pm2 restart af-sport
```

**Применение миграций:**
```bash
# Скопировать .sql на VPS
scp supabase\migrations\<file>.sql root@91.229.8.235:/tmp/

# Применить
ssh root@91.229.8.235 "docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/<file>.sql"

# Если добавили RPC — PostgREST не подхватит без перезапуска
ssh root@91.229.8.235 "cd /opt/supabase/docker && docker compose restart rest"
```

**Studio (Dashboard) — через SSH-туннель:**
```bash
ssh -L 8000:127.0.0.1:8000 root@91.229.8.235
# Потом в браузере: http://localhost:8000
# Логин: admin / Пароль: см. /root/.supabase-secrets DASHBOARD_PASSWORD
```

---

## 12. Известные нюансы / грабли

1. **TanStack Start API routes (`src/routes/api/*.ts`)** требуют чтобы `.output/` и `.tanstack/` были очищены при изменении. Иначе старые роуты могут отдавать 404 на новые методы. `deploy.sh` это делает.

2. **Realtime publication** — после добавления новой таблицы, **руками** добавь её в `supabase_realtime` через Studio → Database → Publications, иначе подписки молчат. ✅ Контрактные таблицы добавлены миграцией 20260609100000 (идемпотентно).

3. **PostgREST schema cache** — после `CREATE FUNCTION` через psql PostgREST не видит новую RPC до `NOTIFY pgrst, 'reload schema';` + рестарт `rest` контейнера. Все наши SQL миграции уже включают NOTIFY в конце, но рестарт лучше делать вручную после применения.

4. **Push не работает** — VAPID-ключи остались от Cloud, новые ещё не сгенерены. См. #5.

5. ~~Цена при создании игры в партнёрском режиме считается на клиенте~~ — ✅ исправлено миграцией 20260609100000: `book_venue` при source='game' сам пересчитывает `rent_total` и `price_per_player` (×1.1, CEIL) и перезаписывает в `games`. Клиентский расчёт остался только как превью. Также `book_venue` теперь проверяет, что бронь под игру создаёт её организатор.

6. **/games каталог** — polling 30s. Если кто-то создал игру — она появится через ≤30 секунд. Это намеренно (экономия Realtime).

7. **`supabase-pooler` (Supavisor)** — иногда падает на старте если `VAULT_ENC_KEY` не строго 32 hex. Если рестартится — `docker compose stop supavisor` (нам он не нужен, мы ходим через Kong).

8. **Размер слайдера в /create** — это **размер КОМАНДЫ** (1–11), не общее число. `slots_total = teamSize × 2`. Для футбола превью формации.

9. ~~Висячие game_captains~~ — ✅ старые записи вычищены миграцией 20260609100000 (удалены captains без живого драфта). `cancel_draft` чистит за собой с 20260602190000.

10. **`/sb/` блок в nginx** — старая Plan B-проксь на Cloud-Supabase, **уже не используется**, можно удалить, но я оставил на всякий случай (откат если что-то сломается). После боевой проверки удалить.

11. **На мобиле клавиатура** закрывает диалоги — все Dialog'и где есть `<input>`/`<textarea>` должны иметь `!top-4 !translate-y-0 sm:!top-1/2 sm:!-translate-y-1/2` на DialogContent. Иначе будет жалоба.

12. **CSP / CORS** — Kong сам управляет, у нас ничего кастомного.

---

## 13. Доменные термины (чтобы не путаться)

- **slot** в коде — это **позиция игрока в драфте** (точка на поле). Не путать с временным интервалом аренды.
- **booking** / **venue_booking** — бронь времени на конкретной площадке.
- **venue** — площадка внутри стадиона (Большое поле, Манеж).
- **size_option** — вариант аренды площадки (full / two_thirds / one_third).
- **stadium** — сам спорткомплекс (Луч).
- **partner stadium** — `is_partner=true`, есть venues и расписание, бронирование через `book_venue`.
- **game_series** — серия повторяющихся игр (каждый четверг октября).
- **drafting** — расстановка игроков по полю перед игрой.
- **captain** — назначен организатором, ходит по очереди в драфте.

---

## 14. Ключевые секреты (нужно поменять при необходимости)

- `JWT_SECRET` Supabase: `/root/.supabase-secrets` на VPS.
- VAPID-ключи для push: пока нет (сгенерить когда поднимем send-push).
- SMTP для GoTrue писем: пока нет, регистрация-подтверждение по дефолтному. Настроить в Studio → Authentication → SMTP, чтобы письма были `noreply@af-sport.ru`. См. https://docs.supabase.com/guides/self-hosting/auth#smtp-configuration.

---

## 15. Следующие приоритеты по моему мнению

1. ~~#28 Админка менеджера~~ — ✅ сделано 09.06.2026, см. DEPLOY_MANAGER.md для деплоя.
2. **#31 Фильтр свободных слотов везде** — улучшит UX поиска.
3. **#5 + #21 Push-нотификации** — есть `notifications` таблица, нужен только мост в Web Push.
4. **#32 UI серий игр** — RPC готов, только форма (а у менеджера аппрув серий уже есть в /manager).
5. **#28b Финансы/Безопасность/Настройки менеджера** — после определения финансовой модели.

Удачи в Code!
