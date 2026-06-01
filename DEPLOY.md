# Деплой Athletic Flow

Два пути — Cloudflare Pages (рекомендую, уже в стеке) и Vercel (если хочешь). Оба бесплатные для MVP.

---

## Вариант A — Cloudflare Pages (РЕКОМЕНДУЮ)

В `package.json` уже подключён `@cloudflare/vite-plugin` — проект подготовлен.

### Шаг 1. Подготовь репозиторий

Залей код на GitHub / GitLab:
```powershell
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/<lmp741>/athleticflow.git
git push -u origin main
```

⚠️ Перед коммитом проверь, что `.env` в `.gitignore` (он там должен быть). Никогда не коммить ключи.

### Шаг 2. Подключи к Cloudflare Pages

1. Зайди в [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create**.
2. **Pages** → **Connect to Git** → выбери репозиторий.
3. Build settings:
   - **Framework preset**: `TanStack Start` (если есть) или `None`.
   - **Build command**: `npm run build` (или `bun run build`).
   - **Build output directory**: `dist`.
   - **Root directory**: `/` (если проект в корне).
4. **Environment variables** — добавь все из локального `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `YANDEX_GEOCODER_KEY`
   - `ADMIN_USER_IDS` (если используешь)
5. **Save and Deploy** → подожди 1-3 минуты.

После — получишь URL `https://athleticflow.pages.dev` (или похожий). Открой → должно работать.

### Шаг 3. (Опционально) Свой домен

В Cloudflare Pages → **Custom domains** → **Set up a custom domain**. Введи свой домен (купленный отдельно или через Cloudflare). DNS прописывается автоматически если домен на Cloudflare.

### Шаг 4. Cloudflare Access для /admin (КРИТИЧНО для безопасности)

1. В Cloudflare Dashboard → **Zero Trust** → **Access** → **Applications** → **Add an application** → **Self-hosted**.
2. **Application name**: Athletic Flow Admin
3. **Application domain**: `athleticflow.pages.dev` (или твой домен)
4. **Path**: `/admin/*`
5. **Identity providers**: Email (One-time PIN) — простейший.
6. **Policies** → **Add a policy**:
   - Name: Admin allowed emails
   - Action: Allow
   - Include: Emails → введи свой email и email коллеги.
7. Save.

Теперь любой заход на `https://athleticflow.pages.dev/admin/...` будет требовать ввести email и подтвердить OTP-кодом. После 1 раза — кука держится 24 часа.

**Это +90% к безопасности админки. Делается за 10 минут. Бесплатно до 50 пользователей.**

---

## Вариант B — Vercel

Если хочешь Vercel — тоже работает. Но придётся отключить cloudflare-плагин.

### Шаг 1. `vite.config.ts` — отключить CF-плагин

Найди строку с `@cloudflare/vite-plugin` и закомментируй (или удали). Тебе всё равно нужно будет править build adapter, потому что TanStack Start под CF и под Vercel разный.

### Шаг 2. Установи Vercel adapter
```powershell
npm install @vercel/edge
```

В `vite.config.ts` замени `@cloudflare/vite-plugin` на `@vercel/edge` или `node`.

### Шаг 3. Деплой
1. [vercel.com](https://vercel.com) → New Project → Import Git Repo.
2. Framework: TanStack Start (если есть) или Vite.
3. Build command: `npm run build`, Output: `dist`.
4. Environment Variables — все из `.env`.
5. Deploy.

### Про "Vercel ломанули"
В 2024 у клиентов Vercel были утечки **env vars**, которые они сами неправильно настроили (например, экспортировали `service_role` в client bundle). Сам Vercel как платформа не был скомпрометирован. Если соблюдаешь правило «server-only env без VITE_ префикса» — безопасно.

---

## После деплоя (любой вариант)

### Обнови URL в коде

Найди и замени `httpsaf-sport.lovable.app` на свой новый URL в 14 местах:

```powershell
# В корне проекта найти все упоминания
findstr /s /i "httpsaf-sport.lovable.app" src\*.tsx src\*.ts public\*.txt
```

Замени на свой `athleticflow.pages.dev` (или свой домен).

### Supabase Auth — Redirect URLs

В Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://athleticflow.pages.dev`
- **Redirect URLs**: добавь:
  - `https://athleticflow.pages.dev/**`
  - `http://localhost:3000/**` (для dev)

Без этого после login супабейс не пустит обратно.

### Я.Вебмастер + Google Search Console

После того, как припаркуешь свой домен:
1. [webmaster.yandex.ru](https://webmaster.yandex.ru) → **Добавить сайт** → введи домен.
2. Подтверждение через meta-тег — Я.Вебмастер даст строку вида `<meta name="yandex-verification" content="abc..." />`. Вставь её в `src/routes/__root.tsx` в meta-теги.
3. После подтверждения → **Индексирование → Файл Sitemap** → добавь `https://твой-домен/sitemap.xml`.
4. То же для Google Search Console через [search.google.com/search-console](https://search.google.com/search-console).

---

## Cost summary

| Сервис | Free план | Хватит до |
|---|---|---|
| Cloudflare Pages | безлимит requests, 500 builds/мес | прод-уровень |
| Supabase Free | 50K MAU | ~1K активных юзеров |
| Я.Геокодер | 1000 req/сутки | ~500 уникальных адресов/день |
| Cloudflare Access | 50 юзеров | админов 50 человек хватит |
| Я.Вебмастер | бесплатно | всегда |
| **ИТОГО для MVP** | **0 ₽/мес** | до запуска промо |

При запуске промо → Supabase Pro $25/мес + платная Я.Карты квота.

---

## Чеклист готовности к проду

- [ ] SQL миграции применены: 00_base_schema, perf_indexes, goals_security, geocode_cache, public_pitches, admin
- [ ] .env заполнен (см. SETUP_NEW_SUPABASE.md)
- [ ] Себе назначена роль admin (через user_roles)
- [ ] Тестовые стадионы в БД
- [ ] Замена `httpsaf-sport.lovable.app` на свой URL
- [ ] Supabase Auth URLs обновлены
- [ ] Реквизиты юрлица в /privacy и /personal-data
- [ ] Уведомление в Роскомнадзор подано (pd.rkn.gov.ru)
- [ ] Cloudflare Access для /admin/*
- [ ] OG image — нормальная картинка 1200×630
- [ ] Yandex.Метрика подключена
- [ ] Sentry для error tracking
- [ ] Я.Вебмастер verification
- [ ] Daily backups включены в Supabase Pro
