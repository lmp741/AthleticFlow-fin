/**
 * Athletic Flow — синтетический load-test для k6.
 *
 * Запуск:
 *   1) Установи k6: https://k6.io/docs/get-started/installation/
 *      macOS:  brew install k6
 *      Linux:  sudo apt install k6 (через grafana repo)
 *      Win:    winget install k6
 *   2) Получи anon-key supabase из .env:
 *      export SUPABASE_URL="https://<your-project>.supabase.co"
 *      export SUPABASE_ANON_KEY="..."
 *   3) Запусти:
 *      k6 run --vus 1000 --duration 5m scripts/loadtest.js
 *      или поэтапно:
 *      k6 run scripts/loadtest.js
 *
 *  ⚠️ ВАЖНО: бьёт по prod, если SUPABASE_URL прод-инстанс.
 *  Используй staging или поднимай локальный supabase.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errors = new Rate('errors');
const gamesListTime = new Trend('games_list_time');
const stadiumsListTime = new Trend('stadiums_list_time');
const gameDetailTime = new Trend('game_detail_time');

const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY env vars');
}

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export const options = {
  // Поэтапный ramp-up: 100 → 500 → 1000 → 2500 → 5000 VU
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 500 },
    { duration: '2m', target: 1000 },
    { duration: '2m', target: 2500 },
    { duration: '3m', target: 5000 },
    { duration: '2m', target: 5000 }, // плато
    { duration: '1m', target: 0 }, // ramp-down
  ],
  thresholds: {
    // Проверяем что:
    // - 95% запросов укладываются в 1.5 сек
    // - доля ошибок меньше 1%
    http_req_duration: ['p(95)<1500'],
    errors: ['rate<0.01'],
  },
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

export default function () {
  // Распределение действий пользователя — приблизительно как на проде:
  //   60% — листают /games (запрос к games + stadiums + participants)
  //   25% — листают /stadiums
  //   10% — открывают карточку игры
  //    5% — открывают карточку стадиона
  const action = Math.random();

  if (action < 0.6) {
    // Каталог игр
    const nowIso = new Date().toISOString();
    const url = `${SUPABASE_URL}/rest/v1/games?select=id,sport,level,starts_at,ends_at,price_per_player,slots_total,stadium:stadiums(id,name,address,lat,lng),participants:game_participants(count)&is_private=eq.false&starts_at=gte.${encodeURIComponent(nowIso)}&order=starts_at.asc&limit=12`;
    const res = http.get(url, { headers });
    gamesListTime.add(res.timings.duration);
    const ok = check(res, { 'games list 200': (r) => r.status === 200 });
    if (!ok) errors.add(1);
  } else if (action < 0.85) {
    // Каталог стадионов
    const url = `${SUPABASE_URL}/rest/v1/stadiums?select=id,name,address,sports,price_per_hour,rating&order=rating.desc.nullslast&limit=24`;
    const res = http.get(url, { headers });
    stadiumsListTime.add(res.timings.duration);
    const ok = check(res, { 'stadiums list 200': (r) => r.status === 200 });
    if (!ok) errors.add(1);
  } else if (action < 0.95) {
    // Карточка игры (нужен реальный gameId — задаётся через env, или подставится случайно)
    const gameId = __ENV.SAMPLE_GAME_ID || '00000000-0000-0000-0000-000000000000';
    const url = `${SUPABASE_URL}/rest/v1/games?select=id,sport,level,starts_at,ends_at,price_per_player,slots_total,description,organizer_id,is_private,stadium:stadiums(id,name,address)&id=eq.${gameId}`;
    const res = http.get(url, { headers });
    gameDetailTime.add(res.timings.duration);
    check(res, { 'game detail 200': (r) => r.status === 200 });
  } else {
    // Карточка стадиона
    const stadiumId = __ENV.SAMPLE_STADIUM_ID || '00000000-0000-0000-0000-000000000000';
    const url = `${SUPABASE_URL}/rest/v1/stadiums?select=*&id=eq.${stadiumId}`;
    http.get(url, { headers });
  }

  // Имитация think-time
  sleep(rand(1, 5));
}

/*
 * Что смотреть в выводе k6:
 *
 * 1) http_req_failed — должно быть около нуля. Если >1% — узкое место на стороне Supabase.
 * 2) http_req_duration p(95) — должно быть <1500ms. Если выше — pool exhaustion / RLS slow.
 * 3) iterations — сколько раундов прошло.
 * 4) vus_max — реальное количество VU.
 * 5) checks — должно быть 100%.
 *
 * Что почти наверняка увидишь на supabase Free:
 *   - На ~300 concurrent VU — http_req_duration начнёт расти (pool exhaustion).
 *   - На ~600 VU — 502/504.
 *   - До 5K не дойдёт.
 */
