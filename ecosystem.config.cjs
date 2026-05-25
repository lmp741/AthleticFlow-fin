/**
 * PM2 ecosystem для node-server'а Athletic Flow.
 *
 * Зачем нужен:
 * - PM2 по умолчанию НЕ читает .env-файл. Без env_file у процесса не будет
 *   YANDEX_GEOCODER_KEY / SUPABASE_URL / VAPID_* и т.д.
 * - Все серверные API-роуты (TanStack Start /api/*) дёргают process.env.
 *   Если переменных нет — функции тихо возвращают пусто (видно на /api/geocode-suggest).
 *
 * Использование на VPS (один раз):
 *   cd /var/www/af-sport/current
 *   pm2 delete af-sport            # снести старый процесс без env
 *   pm2 start ecosystem.config.cjs # запустить с env_file
 *   pm2 save                       # запомнить, чтобы поднялся после reboot
 *   pm2 startup                    # сгенерит systemd-хук
 *
 * При деплое новой версии:
 *   git pull && npm ci && npm run build
 *   pm2 reload af-sport --update-env   # zero-downtime restart с подхватом нового .env
 *
 * Файл .env должен лежать рядом (/var/www/af-sport/current/.env) и содержать:
 *   VITE_SUPABASE_URL=...
 *   VITE_SUPABASE_PUBLISHABLE_KEY=...
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   YANDEX_GEOCODER_KEY=...
 *   VITE_VAPID_PUBLIC_KEY=...
 *   NODE_ENV=production
 *   PORT=3000
 */
module.exports = {
  apps: [
    {
      name: "af-sport",
      script: "./.output/server/index.mjs",
      cwd: "/var/www/af-sport/current",
      instances: 1,
      exec_mode: "fork",
      // КЛЮЧЕВОЕ: PM2 читает .env при старте/reload.
      // Без этой строки переменные в процесс не попадут.
      env_file: ".env",
      // Базовые env поверх .env — на случай если в .env не задано.
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOST: "0.0.0.0",
      },
      // Авторестарт на крашах + лимит на zombi-loop.
      max_restarts: 10,
      restart_delay: 3000,
      // Логи держим в одном месте.
      out_file: "/var/log/af-sport/out.log",
      error_file: "/var/log/af-sport/err.log",
      time: true,
    },
  ],
};
