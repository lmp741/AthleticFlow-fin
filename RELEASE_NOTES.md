# Release Notes — большая правка от 14.05.2026

Это финальный отчёт по всем правкам в одной сессии. Без пафоса, по факту.

---

## Что сделано

### Бренд / шапка / навигация

- **Logo.tsx** — переехал на PNG-логотипы из `src/components/brand/`. Горизонтальный — десктоп, упрощённый — мобайл и favicon. Обёрнут в gradient-плашку (белый PNG виден на любой странице).
- **__root.tsx** — favicon, apple-touch-icon, mask-icon из упрощённого логотипа. Подключены meta для Яндекса (geo.region, geo.placename, geo.position, ICBM), Content-Language ru-RU.
- **SiteShell.tsx** — переписан:
  - Активный пункт меню теперь подсвечивается (`activeOptions={{ exact: false }}`) — работает и для вложенных роутов (`/games/<id>` подсвечивает «Игры»).
  - Добавлен мобильный гамбургер через Radix Sheet. Z-index: header z-40, Sheet overlay/content z-50 — конфликта нет.
  - Внутри гамбургера: навигация, поиск игрока, кнопки Войти/Выйти/Создать.
  - В футере — горизонтальный логотип и три ссылки.

### Главная страница (`/`)

- **Фикс главного бага с фильтрами**: hero-форма больше не делает `window.location.href = "/games"`. Теперь корректно передаёт параметры через `navigate({ to: "/games", search: { sport / stadium / q }})`. Если пользователь вписал известный вид спорта — определяется как `sport`, иначе — как `stadium`. Параметр обрабатывается на странице `/games` через расширенный `validateSearch` (добавил `sport` и `q`).
- **Передизайн hero**:
  - Заголовок text-4xl на мобайле, sm:text-5xl, lg:text-6xl (было text-[2.6rem] / md:text-7xl).
  - Убран один из трёх gradient-orb overlay'ов.
  - Уменьшены padding'и hero на мобайле.
- **Чипы видов спорта без эмодзи**: ⚽🏀🏐 заменены 2-буквенными плашками (ФБ/БК/ВБ) на gradient-brand-фоне. Каждый чип теперь ведёт на `/games?sport=...` с применённым фильтром.
- **Sync главной с играми (баг отображения)** — добавлены:
  - Supabase realtime подписка на `public.games` для `GameCardEmbedded` и `UpcomingGamesList`.
  - Refetch при `focus` и `visibilitychange`.
  - Перфоманс: эта realtime-подписка широкая (на все INSERT/UPDATE/DELETE по games). На 5К пользователей её надо заменить на polling 30s — подробности в `REPORT_PERFORMANCE.md`.

### Страницы стадионов

- **`/stadiums/<id>` — большой апгрейд под SEO/GEO** (`routes/stadiums_.$stadiumId.tsx`):
  - Расширенный head: title, description, keywords, OG (locale ru_RU), twitter:card, geo.region, canonical.
  - Hero с изображением стадиона, бейджами (Москва, рейтинг, цена/час), большим H1 и кнопками «Записаться на ближайшую игру» / «Создать игру» / «Открыть в Я.Картах».
  - Секция «О стадионе» — генерированное описание с упоминанием названия, адреса, видов спорта и цены — заточено под нейропоиск и AI Overviews.
  - Секция «Виды спорта» — каждый вид с дип-линком на `/games?sport=<вид>`.
  - Расписание игр (как было, но в красивых карточках).
  - **FAQ** — 5 вопросов с ответами, дублируется в JSON-LD `FAQPage`. Это даёт Яндексу и LLM-поисковикам структурированные ответы.
  - **JSON-LD** — `SportsActivityLocation` + `Place` + `FAQPage`. Структурированные данные для Schema.org, понятные Яндексу и Google.
  - Sticky-сайдбар «Краткая сводка» + «Как добраться» с кнопками в Я.Карты и Google Maps.
- **Каталог `/stadiums`** — кнопка «Смотреть игры» теперь ведёт на `/stadiums/<id>` (а не на `/games?stadium=...`).

### GEO-инфраструктура (под Яндекс + LLM-поисковики)

- **public/robots.txt** — переписан:
  - Disallow для приватных страниц (`/auth`, `/profile`, `/chats`, `/my`, `/friends/`).
  - Явный allow для YandexBot, YandexImages, GPTBot, ChatGPT-User, OAI-SearchBot, PerplexityBot, ClaudeBot, anthropic-ai, Claude-Web, Google-Extended, CCBot, Bytespider, Applebot и др.
  - Host + Clean-param для Яндекса (фильтрация utm-меток).
- **public/llms.txt** — обновлён с более развёрнутой структурой: краткое описание для нейропоисковиков, что делаем, страницы, FAQ. Это первое, что читают AI-краулеры.
- **routes/sitemap[.]xml.ts** — теперь динамически подмешивает страницы стадионов из supabase (если ENV доступен на сервере). Включены `<lastmod>` и приоритеты.

### Адаптив

- Mobile-friendly гамбургер с Sheet (z-50 поверх sticky header z-40).
- Все hero-секции с `text-4xl ... md:text-5xl` оставлены (нормальный размер на мобайле), но на главной, /games и /stadiums переключены на sm:text-4xl / md:text-5xl с `leading-tight`.
- На всех страницах роутов `container mx-auto px-6` → `container mx-auto px-4 sm:px-6` (10 файлов).
- Сетка популярных видов спорта: 2 кол. на мобайле → 4 на sm → 8 на lg.

### Защита от абуза голов

- **`sql/goals_security.sql`** — SQL-патч, который нужно применить в Supabase SQL Editor. Закрывает дыры:
  - CHECK constraint count 1..50 на уровне БД (не только клиент).
  - Уникальные индексы (game_id, user_id) для claims и (claim_id, approver_id) для approvals.
  - Триггер — нельзя одобрить свою собственную заявку.
  - Триггер — автоматический перевод claim → `approved` при ≥3 апрувах.
  - RLS — заявить голы может только участник матча И только после `ends_at`.
  - RLS — апрувить может только участник того же матча.
- **`routes/games_.$gameId.tsx`** — клиентский гейт: кнопка «Заявить голы» отображается только после окончания матча. Самоапрув блокируется.
- Подробное описание уязвимостей внутри SQL-файла.

### Аудит производительности

- **`REPORT_PERFORMANCE.md`** — честный отчёт. Короткий вывод: в текущей конфигурации сайт держит ~100–300 одновременных пользователей, не 5К. Узкие места: Nominatim, Overpass, Supabase Free MAU, отсутствие React Query, широкий realtime на главной. Чтобы держать 5К — нужен Supabase Pro/Team, замена Nominatim на Я.Геокодер, перенос OSM-площадок в собственную таблицу.
- **`scripts/loadtest.js`** — готовый k6-сценарий с поэтапным ramp-up 100 → 5000 VU. Запускается локально через `k6 run scripts/loadtest.js`. Бьёт по prod supabase — использовать только на staging.

---

## Что НЕ сделано / что нужно от тебя

1. **🔴 Применить `sql/goals_security.sql`** в Supabase SQL Editor — без этого фронтовая защита от абуза голов работает, но через REST API дыры остаются.
2. **🔴 Запустить нагрузочный тест** — `k6 run scripts/loadtest.js` на staging. Я не мог запустить в этой сессии (sandbox недоступен).
3. **🟠 Если нужен .ico-фавикон для legacy IE** — сгенерь сам из «Упрощенный логотип белый.png» (рекомендую [realfavicongenerator.net](https://realfavicongenerator.net)) и положи `public/favicon.ico`. Сейчас работает PNG-фавикон через `<link rel="icon" type="image/png">` — это понимают все современные браузеры.
4. **🟠 Заменить Nominatim на Я.Геокодер** — критично для нагрузки.
5. **🟡 React Query** — добавить на главной и /games, чтобы убрать дублирующие запросы.
6. **🟡 Композитные индексы Supabase** — `games(is_private, starts_at)`, `games(stadium_id, starts_at)`, `game_participants(game_id, user_id)` UNIQUE.
7. **🟡 Запустить `npx tsc --noEmit` и `npm run build`** — я не мог в этой сессии (sandbox недоступен). Если что-то отвалится — пиши, прицельно поправлю.

---

## Известные риски моих правок

- `httpEquiv` в meta TanStack Router — стандартный HTML-атрибут, но если TS-типы router'а его не примут, нужно cast `as any` в `__root.tsx`. Проверь при `tsc`.
- В `__root.tsx` неиспользованного импорта `ogImage` я удалил, но добавил `faviconPng` — должен корректно резолвиться через Vite-плагин.
- На главной я добавил supabase realtime подписку. На большой нагрузке её нужно заменить на polling — см. `REPORT_PERFORMANCE.md` пункт 1.3.
- Файл `Logo.tsx` использует `?url` импорт с кириллическим именем — Vite это должен пережёвывать, но если на CI что-то отвалится — переименуй файлы PNG в латиницу (`logo-horizontal.png`, `logo-mark.png`) и поправь импорт.

---

## Файлы изменены / созданы

**Изменены:**
- `src/components/brand/Logo.tsx`
- `src/components/layout/SiteShell.tsx`
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/routes/games.tsx`
- `src/routes/games_.$gameId.tsx`
- `src/routes/stadiums.tsx`
- `src/routes/stadiums_.$stadiumId.tsx` (полная переработка)
- `src/routes/sitemap[.]xml.ts`
- `src/routes/create.tsx`, `my.tsx`, `profile.tsx`, `friends.tsx`, `friends_.$friendId.tsx`, `chats.tsx`, `chats_.$conversationId.tsx`, `u.$username.tsx` (только адаптив padding)
- `public/robots.txt`
- `public/llms.txt`

**Созданы:**
- `sql/goals_security.sql`
- `scripts/loadtest.js`
- `REPORT_PERFORMANCE.md`
- `RELEASE_NOTES.md` (этот файл)
