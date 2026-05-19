import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * TanStack Start 1.131 использует Nitro под капотом. Nitro выбирает preset
 * по env-переменной NITRO_PRESET, либо детектит автоматически (Vercel ставит
 * VERCEL=1, и Nitro сам ставит preset: 'vercel').
 *
 * Локально мы ставим vercel preset руками — это даёт правильный .vercel/output/
 * для последующего деплоя.
 *
 * Чтобы запустить SSR локально как обычный Node-server — закомментируй строчку
 * с process.env.NITRO_PRESET (или поставь "node-server").
 */
process.env.NITRO_PRESET = process.env.NITRO_PRESET ?? "vercel";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      customViteReactPlugin: true,
    }),
    viteReact(),
  ],
  server: {
    port: 3000,
    host: true,
  },
});
