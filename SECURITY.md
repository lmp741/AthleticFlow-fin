# Безопасность Athletic Flow

Что защищено, что нет, и почему `/admin` — нормальный путь.

---

## Что уже защищено

### База данных (Supabase RLS)

Все мутации проверяются на бэке через **Row Level Security** политики:
- Юзер может править ТОЛЬКО свой профиль.
- Создать игру может только организатор (`organizer_id = auth.uid()`).
- Записаться может только сам себя (`user_id = auth.uid()`).
- Удалить игру — только организатор или admin.
- Заявить голы — только участник матча И только после окончания.
- Одобрить голы — только участник того же матча, не свою заявку.
- Любой admin-action идёт через RPC с проверкой `is_admin()` внутри функции.

**Это значит**: даже если хакер скомпрометирует клиентский JS и обойдёт UI-проверки, бэк всё равно отклонит запрос.

### Защита от инъекций

- **SQL injection**: все запросы через supabase-js (parametrized statements). Никакого raw SQL на клиенте.
- **XSS**: React авто-экранирует JSX. `dangerouslySetInnerHTML` использую только для JSON.stringify в JSON-LD — это безопасно.
- **PostgREST ilike escape**: в поиске экранирую `%` и `_` (`.replace(/[%_]/g, "\\$&")`), чтобы юзер не сломал запрос.
- **Input sanitize**: regex на username, length limits на все текстовые поля, trim.

### Аутентификация

- **JWT-based** (не session cookies) → CSRF-неуязвимо.
- Токены в localStorage, обновляются автоматически.
- Refresh token rotation встроен в supabase auth.

### Защита данных голов от абуза

См. `sql/goals_security.sql`:
- UNIQUE constraint (game_id, user_id) — нельзя заявить дважды.
- CHECK (count BETWEEN 1 AND 50) на уровне БД.
- Триггер запрета самоапрува.
- Триггер автоматического перевода в `approved` при 3+ голосах.
- RLS только участники матча могут заявлять, только участники могут одобрять.

### Защита админки

- `is_admin()` функция проверяет роль через `user_roles`.
- Все admin-операции — через `SECURITY DEFINER` RPC, что верифицируют роль внутри (даже без RLS).
- Триггер `assert_not_last_admin` — нельзя удалить последнего admin (защита от lock-out).
- RLS на `user_roles` — обычный юзер видит только свою роль.
- Аудит-лог — все действия admin фиксируются в `admin_actions` с actor_id, target, payload.

### Защита от перехвата

- HTTPS обязательно (на Cloudflare Pages — автоматически).
- `Authorization: Bearer <jwt>` в заголовках (не в URL).
- ENV vars без префикса `VITE_` НЕ попадают в client bundle (service_role не утечёт).

---

## Что НЕ защищено (планы)

### Brute force на login

Нет rate limiting на supabase auth login endpoint. Кто-то может перебирать пароли.

**Фикс:**
1. **Supabase Pro** — встроенный rate limit.
2. **Cloudflare WAF rules** — `/auth/v1/token` ограничить 10 req/min с одного IP.

### 2FA для админов

Сейчас admin защищён только паролем (+ telegram-OTP в supabase auth, если настроено). Нет TOTP (Google Authenticator).

**Фикс:** Supabase auth поддерживает MFA через TOTP. Включить в admin-аккаунте.

### IP whitelist для админки

Любой может стучаться на `/admin/users` (получит 403, но трафик идёт).

**Фикс:** Cloudflare Access (см. ниже).

### Bot fight mode

Не настроен. Боты могут сканировать сайт.

**Фикс:** Cloudflare → Security → Bot Fight Mode → On.

### Mass-scrape защита

Любой может через REST API supabase скачать **public read** таблицы (профили, открытые игры). Это не баг — фича supabase. Но для anti-scraping надо:

**Фикс:**
- Rate limit per anon-token (Cloudflare WAF).
- Кастомный proxy который кеширует ответы.

---

## Про путь `/admin` — это нормально?

### Короткий ответ: ДА, если есть нормальная защита.

`/admin` — стандартный, предсказуемый URL. Атакующие знают, что админка где-то на `/admin`, `/dashboard`, `/wp-admin`. Скрытие пути (`/control-x9b8j`) даёт +0.5% безопасности (отсекает только ленивых script kiddies).

### Что РЕАЛЬНО защищает

| Защита | Эффективность | Сложность |
|---|---|---|
| Скрытие URL | 🟢 +0.5% (отсечь ботов) | 5 мин |
| HTTPS + JWT | 🟢🟢🟢 база (must have) | 0 (есть) |
| RLS на бэке | 🟢🟢🟢🟢 главное | 0 (есть) |
| Cloudflare Access (email OTP) | 🟢🟢🟢🟢🟢 **топ** | 10 мин |
| 2FA TOTP для admin'ов | 🟢🟢🟢🟢 | 30 мин |
| IP whitelist | 🟢🟢🟢🟢 (если фикс IP) | 5 мин |
| Rate limit + WAF | 🟢🟢🟢 | 30 мин |

**Самый rop ROI = Cloudflare Access.** Делается за 10 минут, бесплатно до 50 юзеров, и даёт практически абсолютную защиту от стороннего доступа.

### Если совсем параноить — несколько слоёв

1. **Cloudflare Access** (главное) + email OTP.
2. **2FA TOTP** в supabase auth для admin аккаунтов.
3. **IP whitelist** — если работаешь из стабильного IP.
4. **Cloudflare Bot Fight Mode** + **WAF rule** на `/admin/*` с rate limit 10 req/min.

С этим набором — `/admin` URL может быть хоть на главной, реально не пройти.

### Если хочешь спрятать URL — как сделать правильно

Можно переименовать в `/m-panel-{случайная-строка}` через файл-роуты, например `m-panel-x9b8j2.tsx`. Но:
- Это путаница для тебя.
- Любой инсайдер всё равно знает URL.
- Cloudflare Access делает то же самое, но безопаснее.

**Не рекомендую.** Лучше Cloudflare Access.

---

## Cloudflare Access — пошагово

1. Купи домен (Reg.ru / Cloudflare Registrar).
2. Привяжи к Cloudflare (DNS → Add site).
3. Зайди в [Cloudflare Zero Trust](https://one.dash.cloudflare.com) → бесплатный план.
4. **Access → Applications → Add application → Self-hosted**.
5. Application domain: `athleticflow.pages.dev/admin/*` (или твой домен).
6. **Policies** → Add policy:
   - Name: Admin allowed
   - Action: Allow
   - Include: Emails (твой email + email коллег)
7. Save.

Готово. Теперь:
- Зайдёшь на `https://athleticflow.pages.dev/admin/users` — Cloudflare покажет форму ввода email.
- Ввёл email из whitelist → пришёл OTP-код на почту.
- Ввёл код → 24 часа доступ без повторного логина.
- Атакующему без твоего email — невозможно пройти даже если знает URL.

---

## Аудит-лог — что туда попадает

В таблицу `admin_actions` пишется на каждое admin-действие:
- `actor_id` — кто сделал (admin uuid)
- `target_kind` — что меняли (user / game / role / goal_claim)
- `target_id` — id целевой сущности
- `action` — что именно (ban / unban / grant_role / delete_game / force_status)
- `reason` — для бана: причина
- `payload` — доп. JSON (например, какая роль выдана)
- `created_at` — когда

Доступно в админке `/admin/log`. Это даёт:
- Историю кто-что-когда.
- Возможность откатить действие.
- Защиту от «admin сошёл с ума и всех забанил» — видно кто и когда.

---

## TL;DR

- `/admin` сам по себе **безопасен**, если есть RLS + JWT + Cloudflare Access.
- **Делай Cloudflare Access** — 10 минут, бесплатно, +90% к защите.
- НЕ переименовывай `/admin` в случайную строку — это слабая защита и путаница.
- Включи **2FA TOTP** в supabase для своего admin-аккаунта (Settings → Authentication).
- Перед продом — **rate limiting WAF** на `/auth/v1/token` (защита от brute force).
