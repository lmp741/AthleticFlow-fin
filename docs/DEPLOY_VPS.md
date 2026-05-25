# Деплой на reg.ru VPS (PM2 + Nginx)

Пошагово, что нужно сделать на VPS после правок локально.

## TL;DR — обычный re-deploy

```bash
cd /var/www/af-sport/current
git pull
npm ci                 # только если поменялся package-lock.json
npm run build
pm2 reload af-sport --update-env
```

Если меняли `.env` — `--update-env` обязателен, иначе PM2 продолжит работать со старыми переменными.

## Первичная настройка (один раз)

### 1. Положить .env рядом с приложением

```bash
cat > /var/www/af-sport/current/.env <<'EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

VITE_SUPABASE_URL=https://ygbgvspnbbdmijnlwsfh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_URL=https://ygbgvspnbbdmijnlwsfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

YANDEX_GEOCODER_KEY=9c71bde3-aa1d-4f09-acd5-607e55910fe6

# Для Web Push (после генерации VAPID-пары через npx web-push generate-vapid-keys)
VITE_VAPID_PUBLIC_KEY=...
EOF

chmod 600 /var/www/af-sport/current/.env
```

`VITE_*` переменные нужны на этапе `npm run build` — они вкомпилены в клиентский бандл.
`SUPABASE_SERVICE_ROLE_KEY`, `YANDEX_GEOCODER_KEY` нужны рантайму node-server'а.

### 2. Заменить ручной `pm2 start` на ecosystem

В корне репозитория уже лежит `ecosystem.config.cjs` — он говорит PM2 читать `.env`.

```bash
cd /var/www/af-sport/current
pm2 delete af-sport       # снести старый процесс
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup               # один раз — генерит systemd-юнит, чтобы PM2 поднялся после reboot
```

Проверить, что env поднялся в процесс:

```bash
pm2 env af-sport | grep -E "YANDEX|SUPABASE"
# Должно показать YANDEX_GEOCODER_KEY, SUPABASE_URL и т.д.
```

### 3. Проверка серверных API

```bash
# Должен вернуть JSON с координатами Тверской улицы.
curl -i 'http://localhost:3000/api/geocode?q=Москва%20Тверская%201'

# Должен вернуть { items: [...] } с 5 вариантами.
curl -i 'http://localhost:3000/api/geocode-suggest?q=Москва%20Твер'
```

Если возвращает 404 — проблема в маршрутизации Nginx (см. пункт 4).
Если возвращает `{"items":[]}` — `YANDEX_GEOCODER_KEY` всё ещё не в env процесса.

### 4. Nginx — пропустить /api/* и /sb/* через node

Минимальный конфиг `/etc/nginx/sites-available/af-sport`:

```nginx
server {
    listen 443 ssl http2;
    server_name af-sport.ru www.af-sport.ru;

    ssl_certificate     /etc/letsencrypt/live/af-sport.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/af-sport.ru/privkey.pem;

    # Прокси Supabase (вместо Vercel rewrite).
    location /sb/ {
        proxy_pass https://ygbgvspnbbdmijnlwsfh.supabase.co/;
        proxy_set_header Host ygbgvspnbbdmijnlwsfh.supabase.co;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";    # для realtime WS
    }

    # Service Worker должен отдаваться с правильным Content-Type
    # и БЕЗ кэширования (иначе обновлённый sw.js не подтянется).
    location = /sw.js {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Service-Worker-Allowed "/";
    }

    # Всё остальное — в node-server (включая /api/*).
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";    # для HMR / WS
        proxy_read_timeout 90;
    }
}

server {
    listen 80;
    server_name af-sport.ru www.af-sport.ru;
    return 301 https://$host$request_uri;
}
```

После правок:

```bash
nginx -t && systemctl reload nginx
```

## Что важно проверить после переката

1. `pm2 env af-sport | grep YANDEX` — есть значение.
2. `curl /api/geocode-suggest?q=Москва%20Твер` — отдаёт массив, не пусто.
3. Открыть `https://af-sport.ru/games`, начать вводить адрес — появляются варианты под инпутом.
4. В Supabase Dashboard → SQL Editor применить все непримененные миграции из `supabase/migrations/`.
5. Если включаешь Web Push — `supabase functions deploy send-push --no-verify-jwt`.

## Частые грабли

- **PM2 reload без `--update-env`** — env остаётся старым. Обязательно `--update-env` после правок `.env`.
- **`npm run build` без env** — VITE_* переменные не попадают в клиент. Всегда `set -a; source .env; set +a` перед билдом, либо PM2 не вмешивается в этот этап.
- **`pm2 start ./.output/server/index.mjs` напрямую** — не подхватывает env, даже если в текущей шелл-сессии переменные есть. Используй `ecosystem.config.cjs`.
- **Nginx без `proxy_pass` на /api/*** — TanStack Start серверные роуты не работают, отдаётся либо index.html, либо 404.
- **Realtime через /sb** — нужен `Upgrade $http_upgrade` и `Connection "upgrade"`, иначе WebSocket рвётся.
