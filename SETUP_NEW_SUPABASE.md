# Подключение нового Supabase-проекта

Пошагово. Ничего не пропускай.

---

## 1. Создаём проект в Supabase

1. Зайди в [supabase.com](https://supabase.com) → войди.
2. **New project** → имя `athletic-flow-dev` (или как удобнее) → пароль БД (запиши в менеджер паролей, без него не восстановишь) → регион **Frankfurt** или **Stockholm** (ближе к РФ из доступных EU) → Create.
3. Подожди 1-2 минуты пока поднимется.

---

## 2. Достаём ключи

В дашборде проекта → **Settings** → **API**:

| Что | Где взять | Куда положить |
|---|---|---|
| `Project URL` | сверху, типа `https://abcde.supabase.co` | `VITE_SUPABASE_URL` и `SUPABASE_URL` |
| `anon public` ключ | Project API keys → `anon` | `VITE_SUPABASE_PUBLISHABLE_KEY` и `SUPABASE_ANON_KEY` |
| `service_role` ключ | Project API keys → `service_role` (нажми на eye-icon чтобы показать) | `SUPABASE_SERVICE_ROLE_KEY` |

⚠️ **service_role обходит RLS — никогда не отдавай его на клиент**. Vite пропускает в браузер только переменные с префиксом `VITE_`. Если префикса нет — переменная только на сервере.

---

## 3. Прописываем `.env` в корне проекта

```env
# ---- CLIENT (Vite, попадает в браузер) ----
VITE_SUPABASE_URL=https://abcde.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJh...anon...

# ---- SERVER (только для server routes, в браузер не попадает) ----
SUPABASE_URL=https://abcde.supabase.co
SUPABASE_ANON_KEY=eyJh...anon...
SUPABASE_SERVICE_ROLE_KEY=eyJh...service_role...

# ---- Опционально, но рекомендую сразу ----
# Получи на developer.tech.yandex.ru → JS API и Геокодер → бесплатный тариф
YANDEX_GEOCODER_KEY=

# Свой UUID (узнаешь после регистрации, см. ниже)
ADMIN_USER_IDS=
```

---

## 4. Применяем SQL-миграции — СТРОГО В ЭТОМ ПОРЯДКЕ

Заходишь в дашборд supabase → **SQL Editor** → **New query**. Для каждого файла: открой локально, скопируй всё содержимое, вставь в SQL Editor, нажми **Run**.

| Порядок | Файл | Что делает |
|---|---|---|
| **1** | `sql/00_base_schema.sql` | Создаёт все таблицы (profiles, games, stadiums, friendships, conversations, ratings, goals и т.д.), enum `app_role`, базовые RLS политики, helper-функции (`has_role`, `are_friends`, `can_rate_after_game`, `is_conversation_member`, `username_available`). Включает триггер автосоздания profile при регистрации. |
| **2** | `sql/perf_indexes.sql` | Композитные и уникальные индексы под нагрузку. |
| **3** | `sql/goals_security.sql` | Защита голов: CHECK, UNIQUE, триггер запрета самоапрува, RLS. |
| **4** | `sql/geocode_cache.sql` | Таблица кэша Я.Геокодера. |
| **5** | `sql/public_pitches.sql` | Таблицы кэша OSM-площадок. |
| **6** | `sql/admin.sql` | Админка: бан-поля, audit-log, view, RPC, RLS для admin. |

**Если какой-то файл ругнётся** — скрин ошибки → разберёмся прицельно. Чаще всего ошибка «relation does not exist» — значит порядок нарушен.

---

## 5. Регистрируемся в новом приложении

1. Запусти dev локально:
   ```
   bun install   # или npm install
   bun run dev   # или npm run dev
   ```
2. Открой `http://localhost:3000` (или порт, который выведет Vite).
3. **Sign Up** через нормальный flow (телефон или email — зависит от настроек supabase auth).
4. Подтверди свой профиль.

---

## 6. Узнаём свой UUID и назначаем себе admin

В supabase → **SQL Editor**:

```sql
-- Узнать свой uuid (подставь свой email или phone)
SELECT id, email, phone FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Назначить себе admin (подставь свой uuid из верхнего запроса)
INSERT INTO public.user_roles (user_id, role)
VALUES ('твой-uuid-здесь', 'admin')
ON CONFLICT DO NOTHING;
```

**Альтернативно** — добавить uuid в `ADMIN_USER_IDS` в `.env` и перезапустить dev. Тогда ты «super-admin», и можешь выдавать роль admin кому угодно через `/api/admin/grant-role`.

---

## 7. Заводим тестовые стадионы

Сейчас БД пустая — нет ни одного стадиона. Без них нельзя создать игру. Через **SQL Editor**:

```sql
INSERT INTO public.stadiums (name, address, sports, price_per_hour, rating, lat, lng) VALUES
  ('Campus Водный', 'ул. Смольная, 12 (м. Водный стадион)', ARRAY['Футбол','Футзал'], 5000, 4.8, 55.838, 37.482),
  ('CityFootball Сокольники', 'ул. Короленко, 1а (м. Сокольники)', ARRAY['Футбол','Футзал'], 4500, 4.7, 55.794, 37.677),
  ('Манеж Феникс', 'ул. Дубининская, 68с11 (м. Павелецкая)', ARRAY['Футбол','Футзал','Баскетбол'], 6000, 4.9, 55.713, 37.633),
  ('Лужники', 'ул. Лужники, 24 (м. Спортивная)', ARRAY['Футбол','Регби'], 8000, 4.9, 55.716, 37.554),
  ('РФЛ-Арена Митино', 'Волоцкой переулок, 7к1 (м. Митино)', ARRAY['Футбол','Футзал'], 4000, 4.6, 55.840, 37.367);
```

Можешь добавить свои.

---

## 8. Проверяем что всё работает

1. Открой `/` — главная должна показать «120+ площадок», «4.9★» и пустой список игр (без игр в БД).
2. Открой `/stadiums` — должны появиться 5 стадионов из шага 7.
3. Открой `/create` — попробуй создать игру. После создания она должна появиться на главной.
4. Открой `/admin` — должна загрузиться админка (потому что ты в `user_roles` с ролью `admin`).

Если 4 не работает, а 1-3 работают — проверь:
- Применил ли `sql/admin.sql`.
- Назначил ли себе admin в `user_roles`.
- Залогинен ли с тем же аккаунтом, что в `user_roles.user_id`.

---

## 9. Что ещё нужно настроить в Supabase Dashboard

### Authentication → Settings

- **Site URL**: `http://localhost:3000` для dev, твой прод-домен потом.
- **Redirect URLs**: добавь все домены откуда возможны редиректы (localhost, prod).
- **Email Auth** или **Phone Auth** — что у тебя в продукте используется. Если телефон — настрой SMS-провайдер (Twilio / MessageBird / Vonage). На MVP можно поставить **Test phone numbers** с фиксированным OTP-кодом для разработки.

### Storage (если будут аватары/фото)

- **Storage → Buckets** → создай buckets:
  - `avatars` — public read
  - `game-photos` — public read
  - `chat-media` — authenticated read
- Политики доступа (минимум):
  ```sql
  -- Пример для avatars: владелец загружает в свою папку
  CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  ```

### Realtime

- **Database → Replication** → включи realtime для тех таблиц, где это нужно. Из моего кода: `game_participants`, `game_messages`, `conversation_messages`. **НЕ включай для `games` без острой необходимости** — это бьёт по производительности (см. `REPORT_PERFORMANCE.md`).

### Database → Backups

- На Pro плане автоматические daily backups уже есть. Проверь что включены. На Free — backups нет, бэкап делай руками через `pg_dump`.

---

## 10. Сделать рабочим первого админа быстро (TL;DR)

```bash
# 1. .env заполнен из шага 3
# 2. Применил все 6 SQL миграций из шага 4
# 3. Зарегался в приложении (шаг 5)
# 4. В SQL Editor supabase:
SELECT id FROM auth.users WHERE email = 'твой@email';
INSERT INTO public.user_roles (user_id, role) VALUES ('<тот-uuid>', 'admin');
# 5. Открыл http://localhost:3000/admin
```

Готово. Если что-то отвалится — кидай скрин ошибки.
