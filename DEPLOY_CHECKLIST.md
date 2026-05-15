# Pre-Production Checklist — Athletic Flow

Что нужно сделать **руками**, прежде чем выкатывать на прод. Без воды, по приоритету.

---

## 🔴 БЛОКЕРЫ — без этого нельзя в прод

### 1. SQL-миграции (Supabase SQL Editor)

Применить в указанном порядке:

```
sql/perf_indexes.sql        — индексы под нагрузку (composite, unique)
sql/goals_security.sql      — защита системы голов (RLS, триггеры)
sql/geocode_cache.sql       — таблица кэша Я.Геокодера
sql/public_pitches.sql      — таблица кэша OSM-площадок + log
```

После применения проверить:
```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

Должны появиться: `games_public_starts_idx`, `game_participants_game_user_uniq`, `goal_claims_game_user_uniq` и т.д.

### 2. Environment variables (.env / Cloudflare Pages → Settings → Environment)

```env
# Клиент (Vite, прокидывается в браузер — это публичные значения)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJh...   # anon key

# Только server (NЕ прокидывать в браузер!)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...        # из Supabase → Settings → API → service_role
YANDEX_GEOCODER_KEY=...                  # из developer.tech.yandex.ru → JS API и Геокодер
```

⚠️ `SUPABASE_SERVICE_ROLE_KEY` обходит RLS — никогда не пускай его на клиент. Vite не прокидывает переменные без префикса `VITE_`, так что безопасно, если не делать `import.meta.env.SUPABASE_SERVICE_ROLE_KEY`.

### 3. Реквизиты юрлица (152-ФЗ)

В файлах `src/routes/privacy.tsx` и `src/routes/personal-data.tsx` найди TODO с реквизитами оператора. Замени на:
- Полное наименование ИП/ООО
- ИНН, ОГРН/ОГРНИП
- Юр. адрес
- Контактный email/телефон

Без этого Роскомнадзор может выкатить штраф (50K–300K ₽ для юрлица).

Также: до запуска **подать уведомление об обработке ПД в Роскомнадзор** через [pd.rkn.gov.ru](https://pd.rkn.gov.ru/) (бесплатно, форма онлайн, рассматривают ~7 дней). Без этого — штраф 30K–100K ₽.

### 4. Favicon .ico для legacy браузеров (опционально, но желательно)

Я сделал `public/favicon.svg` — современные браузеры понимают. Для совсем старых (IE/древние Edge) сгенерируй `favicon.ico` через [realfavicongenerator.net](https://realfavicongenerator.net) из своего упрощённого логотипа, положи в `public/`. В `__root.tsx` ничего менять не нужно — браузер сам подхватит `/favicon.ico` по умолчанию, если есть.

### 5. Yandex / Google verification

В Я.Вебмастер ([webmaster.yandex.ru](https://webmaster.yandex.ru)) добавить сайт, получить `<meta name="yandex-verification" content="..." />`. То же для Google Search Console. Прописать в `__root.tsx` в meta-теги.

После — добавить sitemap `https://<твой-домен>/sitemap.xml` в обоих кабинетах.

---

## 🟠 НАСТОЯТЕЛЬНО рекомендуется до запуска

### 6. Нагрузочный тест

```bash
brew install k6
SUPABASE_URL=https://staging.supabase.co SUPABASE_ANON_KEY=... k6 run scripts/loadtest.js
```

Запускать на **staging supabase** (не на проде!). По итогам — решение о тарифе.

### 7. Apply Supabase Pro план

Free план не выдержит 5К одновременных (см. `REPORT_PERFORMANCE.md`). Минимум — Pro ($25/мес):
- DB pool 200
- MAU 100K
- Egress 250GB
- Включить PgBouncer transaction mode в Settings → Database → Connection Pooling.

### 8. Domain + HTTPS + CDN

- Купить домен (Reg.ru, Beget, Cloudflare).
- Привязать к Cloudflare (для CDN и DDoS-защиты — бесплатно).
- В Cloudflare Pages — задать `VITE_*` и server-side ENV.
- Включить `Auto Minify` (HTML/CSS/JS) + `Brotli` в Cloudflare Speed.

### 9. Платёжный провайдер

Сейчас «оплата» это просто `paid: true` toggle в БД — без реальных денег. Для прода подключить:
- **Юкасса** (Сбер) — самый популярный в РФ, 3.5% эквайринг
- **Тинькофф Эквайринг** — 2.59-3.5%
- **CloudPayments**

Интеграция: создать `src/routes/api/payments/...` server routes + webhooks.

### 10. Backups Supabase

В Settings → Backups убедиться что включены daily backups. Pro план — 7 дней истории, Team — 14 дней. Без backups при ошибке = смерть данных.

---

## 🟡 До маркетинговой компании

### 11. Заменить `httpsaf-sport.lovable.app` на свой домен

В коде есть 14 мест с захардкоженным `httpsaf-sport.lovable.app`. Найди-замени по проекту (Cmd+Shift+F):
```
src/routes/__root.tsx
src/routes/index.tsx
src/routes/games.tsx
src/routes/games_.$gameId.tsx
src/routes/stadiums.tsx
src/routes/stadiums_.$stadiumId.tsx
src/routes/sitemap[.]xml.ts
src/routes/privacy.tsx
src/routes/personal-data.tsx
public/robots.txt
public/llms.txt
```

### 12. OG-картинка

Сейчас в `__root.tsx` стоит ссылка на `lovable.app` preview. Сгенерируй нормальную OG (1200×630px, под Telegram/VK/WhatsApp превью) — горизонтальный лого + слоган + 1-2 скриншота. Положи в R2/S3 или в `public/og.png`, прокинь в meta.

### 13. Аналитика

- **Яндекс.Метрика** — обязательно (поведенческая, регион Москва).
- Google Analytics — опционально (для забугорной аудитории, у тебя её мало).
- **PostHog / Amplitude** — для продуктовых событий (создание игры, запись, отмена).

Вставить tag в `__root.tsx` через scripts блок.

### 14. Service Worker / PWA (если хочешь установку на главный экран)

В Capacitor у тебя нативный мобильный, но для веба тоже стоит добавить:
- `manifest.json` в `public/`
- Service Worker для offline-кеша
- Кнопка «Установить приложение» через `beforeinstallprompt`

### 15. Sentry / Error tracking

Тестировать продукт через `console.error` — путь к боли. Включить Sentry:
```
npm install @sentry/react
```
Инициализировать в `__root.tsx`. Free план — 5K events/мес, для MVP хватит.

### 16. Replace `console.error` на нормальный logger

В коде есть console.error в `client.ts`, `geocode.ts`, `pitches.ts`. После Sentry — заменить на `Sentry.captureException()` или `pino` logger.

---

## 🟢 Хорошо бы, но не критично

- React Query / SWR для дедупликации запросов на страницах с множественными useEffect.
- Lazy load `framer-motion` (он сейчас на главной — 50KB gzip).
- Image optimization: WebP вместо JPG для фото стадионов (через @cloudflare/vite-plugin).
- Pre-rendering ключевых SEO-страниц (главная, /stadiums, /games) в build time для лучшего LCP.
- Lighthouse / PageSpeed Insights audit. Цель — 90+ на mobile.
- A/B-тесты конверсий через GrowthBook или PostHog feature flags.

---

# Self-hosted Postgres vs Supabase — экономика

Короткий ответ: **на старте оставить Supabase, после ~5К активных пользователей оценить переход.**

## Что даёт Supabase помимо Postgres

Это **не просто БД**. Это:
- Postgres + pooler (PgBouncer)
- Auth (signup, OTP, OAuth, JWT)
- Storage (S3-совместимый, для аватаров/превью)
- Realtime (WebSocket подписки на изменения)
- Edge Functions (Deno-функции)
- Auto-generated REST + GraphQL API
- Studio (web UI для БД)
- Backups
- Логирование, метрики

Если уходишь на свой Postgres, **всё это нужно поднять и поддерживать самому**.

## Цены 2026

| Решение | Цена / мес | Что внутри |
|---|---|---|
| **Supabase Free** | $0 | 500 MB DB, 50K MAU, 2GB egress, 500MB storage |
| **Supabase Pro** | $25 (~2 300 ₽) | 8GB DB, 100K MAU, 250GB egress, PgBouncer, backups 7 дней |
| **Supabase Team** | $599 (~55 000 ₽) | dedicated, поддержка, custom |
| **Self-host VDS** | ~3 500–6 000 ₽ | См. расклад ниже |

## Self-host расклад (для 5К одновременных, ~50–100К MAU)

| Компонент | Где | Цена/мес |
|---|---|---|
| Postgres + PgBouncer | VDS 8 CPU / 16 GB RAM / 200 GB SSD (Selectel/Timeweb/Beget) | 3 500–4 500 ₽ |
| Realtime (свой WebSocket: Centrifugo) | На том же VDS | 0 |
| Auth (Keycloak / Lucia / Better-Auth) | На том же VDS | 0 |
| Storage (S3-совместимый) | Selectel S3 / Yandex Object Storage | ~200 ₽ (за 50GB + traffic) |
| Бэкапы (pg_basebackup → S3 / Borg) | Селектел S3 | ~100 ₽ |
| Мониторинг (Prometheus + Grafana) | На том же VDS | 0 |
| SSL (Let's Encrypt) | Бесплатно | 0 |
| Дополнительный VDS для app-сервера | Cloudflare Pages (бесплатно) | 0 |
| Резервный (failover) VDS | для отказоустойчивости | +3 000 ₽ |
| **ИТОГО без failover** | | **~3 800–4 800 ₽** |
| **ИТОГО с failover** | | **~7 000–8 000 ₽** |

Supabase Pro = ~2 300 ₽/мес.
Self-host без failover ≈ 4–5К ₽/мес.
**Чисто по деньгам Supabase дешевле**, если ты ещё не платишь себе зарплату за DevOps.

## Что нужно сделать руками, если self-host

1. **Поднять VDS** (Selectel / Timeweb Cloud / RU-VDS). Желательно Ubuntu 22.04 LTS.
2. **Установить Postgres 16** + настроить `postgresql.conf` (shared_buffers, work_mem, max_connections).
3. **Установить PgBouncer** transaction-mode (без него > 100 одновременных запросов = смерть).
4. **Auth: переписать** `useAuth.tsx` под:
   - Свой signup/login через Keycloak / Lucia / Better-Auth + JWT
   - SMS OTP через SMSc.ru / SMS.ru API (~2-5 ₽ за SMS)
5. **Realtime: переписать** под Centrifugo (бесплатно, open source) или собственный WS-сервер. Все `supabase.channel(...)` нужно заменить.
6. **Storage: переписать** на upload в S3-bucket (Yandex Object Storage / Selectel S3) с presigned URL.
7. **REST API: написать** свой бэк (Hono / Fastify / Express на Node) или генерить через PostgREST (open source, как у Supabase под капотом).
8. **Backups: настроить** pg_basebackup ежедневно → S3 + WAL архивирование.
9. **Мониторинг: Grafana + Prometheus + node_exporter + postgres_exporter**.
10. **Alerts: Telegram-бот** на критические события (диск>80%, replication-lag, errors-rate).

Это **3–4 недели работы DevOps + ~50К ₽ затрат на запуск**.

## Когда переходить с Supabase на self-host

| Сигнал | Действие |
|---|---|
| <10К MAU | Не дёргайся. Supabase Pro и не парься. |
| 10К–50К MAU | Закрытый глаз на Supabase Team ($599). |
| >50К MAU и/или нужны кастомные расширения PG (PostGIS, TimescaleDB, pgvector) | Можно подумать о self-host. |
| Регуляторные требования (хранение ПД в РФ, ФЗ-152) | Юрист скажет, нужен ли self-host. На 2026 Supabase разрешён, но если у тебя гос. контракты — нужен Yandex Cloud Postgres или собственный VDS в РФ. |

## Моя рекомендация

1. Сейчас — **Supabase Free**. Прод оптимизация делается потом.
2. На запуске промо — **Supabase Pro ($25)**, PgBouncer transaction mode, индексы из `sql/perf_indexes.sql`.
3. Self-host рассматривать **не раньше 30К MAU**. До тех пор ROI отрицательный (твоё время дороже).

---

## Альтернатива: Yandex Cloud Managed PostgreSQL

Если боишься, что Supabase накроется по политическим причинам, или нужен сервер в РФ — есть [Yandex Cloud Managed PostgreSQL](https://yandex.cloud/services/managed-postgresql). Цены:
- s2.micro (2 vCPU / 8 GB) — ~2 500 ₽/мес
- s2.small (2 vCPU / 16 GB) — ~4 500 ₽/мес
- Бэкапы, мониторинг, failover — встроено.

Но: realtime, auth, storage всё равно нужно поднимать самому. Не такая «всё-в-одном» история как Supabase.

---

## Финальная честная оценка по экономике

**На горизонте до 1 года:** Supabase Pro + Cloudflare = ~2 300 ₽/мес → копейки, не парься.

**После 1 года и >30К MAU:** считать ROI. Скорее всего, всё ещё дешевле Supabase Team, чем нанимать DevOps на пол-ставки.

Self-host оправдан только когда:
- У тебя есть DevOps в команде (или ты сам им стал).
- Есть требования регулятора, которые не выполнить на Supabase.
- Нужны кастомные расширения Postgres, которых нет у Supabase.

Иначе — это самообман «я экономлю», который на деле стоит времени и нервов.
