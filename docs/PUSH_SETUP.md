# Web Push: одноразовая настройка

Подключение Web Push в Athletic Flow. Делается один раз, потом просто работает.

## 1. Сгенерировать VAPID-ключи

VAPID — это пара ключей, которыми сервер подписывает push-сообщения. Один раз генеришь, потом ничего не трогаешь (поменяешь — все существующие подписки протухнут).

Самый быстрый путь:

```bash
npx web-push generate-vapid-keys
```

Получишь:

```
Public Key:  BFLn… (87 символов, base64url)
Private Key: ts3… (43 символа, base64url)
```

Альтернатива без npm: открой <https://vapidkeys.com/> и нажми «Generate».

## 2. Положить ключи в env

### Клиент (Vercel → Project → Settings → Environment Variables)

| Имя                       | Значение     | Где видно                    |
| ------------------------- | ------------ | ---------------------------- |
| `VITE_VAPID_PUBLIC_KEY`   | Public Key   | В браузере (это нормально)   |

### Сервер (Supabase → Project Settings → Edge Functions → Secrets)

```bash
supabase secrets set VAPID_PUBLIC_KEY="<Public Key>"
supabase secrets set VAPID_PRIVATE_KEY="<Private Key>"
supabase secrets set VAPID_SUBJECT="mailto:admin@af-sport.ru"
```

`VAPID_SUBJECT` — любой `mailto:` или `https://` URL, нужен по спецификации push-сервисов.

## 3. Применить миграции БД

```bash
supabase db push
```

Должны примениться:

- `20260520120000_game_invite_token.sql` — приватные игры по ссылке
- `20260520130000_push_and_notifications.sql` — `push_subscriptions` и `notifications`

## 4. Задеплоить Edge Function

```bash
supabase functions deploy send-push --no-verify-jwt
```

`--no-verify-jwt` нужен, потому что функция сама проверяет, что в `Authorization` лежит `SUPABASE_SERVICE_ROLE_KEY`. Иначе Supabase будет пытаться валидировать JWT и резать вызовы с service_role.

## 5. Проверить, что всё работает

1. Открой `/profile` в браузере (Chrome/Firefox на десктопе или Android Chrome).
2. В правой колонке появится карточка «Уведомления» с переключателем.
3. Включи — браузер попросит разрешение. Подтверди.
4. Подёргай функцию руками:

```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["<YOUR_AUTH_USER_UUID>"],
    "type": "test",
    "title": "Тестовый пуш",
    "body": "Это сообщение от send-push",
    "url": "/profile"
  }' \
  "$SUPABASE_URL/functions/v1/send-push"
```

Должен прилететь системный нотиф + появиться запись в `notifications`.

## Подводные камни

- **iOS Safari**: Web Push работает только с iOS 16.4+ И только если сайт добавлен «На главный экран» (PWA). Без этого `isPushSupported()` вернёт false.
- **Локальная разработка**: Service Worker регистрируется только на `https://` или `http://localhost`. На IP-адресе локальной сети не сработает.
- **Российские ISP**: push-сервисы FCM/Mozilla работают штатно, в отличие от прямого Supabase. Web Push не страдает.
- **Tor / Brave shields**: пользователи могут полностью отключить SW — это нормально, обрабатываем как `unsupported`.

## Следующие шаги

После того как `send-push` задеплоен и пуши доходят, можно подключать его к продуктовым событиям:

- Новое сообщение в чате игры → `type: "game_chat_message"`
- Оценка / отзыв получены → `type: "rating_received"`
- Приглашение в игру → `type: "game_invite"`
- «Срочная замена» → `type: "urgent_replacement"`

Триггеры можно делать через PostgreSQL trigger + `pg_net.http_post` или из приложения после успешного INSERT.
