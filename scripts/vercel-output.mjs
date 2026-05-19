/**
 * Конвертирует Vite SSR build (dist/) в Vercel Build Output API v3 (.vercel/output/).
 *
 * Стандарт: https://vercel.com/docs/build-output-api/v3
 *
 * Запускается автоматически после `vite build` через postbuild-скрипт в package.json.
 *
 * Структура на выходе:
 *   .vercel/output/
 *     config.json              — роутинг
 *     static/                  — клиентские assets (копия dist/client)
 *     functions/
 *       _ssr.func/
 *         .vc-config.json      — { runtime: nodejs20.x, handler: index.mjs }
 *         index.mjs            — обёртка над dist/server/server.js
 *         server/              — копия dist/server/
 */
import { cp, mkdir, writeFile, rm, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, ".vercel", "output");
const FUNC = join(OUT, "functions", "_ssr.func");

async function main() {
  if (!existsSync(DIST)) {
    throw new Error(
      `dist/ не найден. Сначала отработай vite build, потом этот скрипт.`,
    );
  }

  // 1. Чистим старый .vercel/output
  if (existsSync(OUT)) await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // 2. Копируем dist/client -> .vercel/output/static
  const clientSrc = join(DIST, "client");
  if (existsSync(clientSrc)) {
    await cp(clientSrc, join(OUT, "static"), { recursive: true });
    console.log("✓ static/ копирован из dist/client");
  } else {
    console.warn("⚠ dist/client не найден, статика будет пустой");
    await mkdir(join(OUT, "static"), { recursive: true });
  }

  // 3. Создаём SSR-функцию
  await mkdir(FUNC, { recursive: true });

  // 3.1 Копируем dist/server в функцию
  const serverSrc = join(DIST, "server");
  if (!existsSync(serverSrc)) {
    throw new Error("dist/server не найден — vite build не собрал SSR");
  }
  await cp(serverSrc, join(FUNC, "server"), { recursive: true });

  // 3.2 .vc-config.json (Vercel function config)
  await writeFile(
    join(FUNC, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs20.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
        shouldAddHelpers: true,
      },
      null,
      2,
    ),
  );

  // 3.3 index.mjs — обёртка, конвертирует Node IncomingMessage в Web Request
  //    и вызывает Hattip/Vite handler из dist/server/server.js.
  await writeFile(
    join(FUNC, "index.mjs"),
    `import handler from "./server/server.js";

/**
 * Vercel Node handler. Конвертирует req/res в Web Request/Response и вызывает SSR.
 */
export default async function vercelHandler(req, res) {
  try {
    const proto = req.headers["x-forwarded-proto"] ?? "https";
    const host = req.headers["x-forwarded-host"] ?? req.headers.host;
    const url = new URL(req.url, \`\${proto}://\${host}\`);

    // Собираем тело для POST/PUT/PATCH
    let body = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv));
      else if (v !== undefined) headers.set(k, String(v));
    }

    const webReq = new Request(url, {
      method: req.method,
      headers,
      body,
    });

    const webRes = await handler({ request: webReq });

    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => res.setHeader(key, value));

    if (webRes.body) {
      const reader = webRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error("SSR handler failed:", err);
    res.statusCode = 500;
    res.end("Internal server error");
  }
}
`,
  );

  // 4. config.json — роутинг Vercel Build Output API
  await writeFile(
    join(OUT, "config.json"),
    JSON.stringify(
      {
        version: 3,
        routes: [
          // Файлы из static/ отдаём как есть
          { handle: "filesystem" },
          // Всё остальное (не файл) — в SSR-функцию
          { src: "/.*", dest: "/_ssr" },
        ],
      },
      null,
      2,
    ),
  );

  console.log("✓ .vercel/output/ готов к деплою на Vercel");
}

main().catch((err) => {
  console.error("Build adapter failed:", err);
  process.exit(1);
});
