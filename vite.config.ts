import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * TanStack Start v1.131.x — стабильный API:
 *   target: 'vercel' | 'netlify' | 'cloudflare-pages' | 'node-server' | 'bun' | 'deno'
 *
 * При target: 'vercel' build генерирует .vercel/output/ (Vercel Build Output API v3),
 * который Vercel распознаёт автоматически без указания outputDirectory.
 *
 * customViteReactPlugin: true — отключает встроенный viteReact, чтобы мы могли
 * подключить его явно вторым плагином (так требует Tailwind v4).
 */
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      target: "vercel",
      customViteReactPlugin: true,
    }),
    viteReact(),
  ],
  server: {
    port: 3000,
    host: true,
  },
});
