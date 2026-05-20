import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * TanStack Start 1.131 использует Nitro. Preset определяет формат выходных файлов:
 * - "node-server" — standalone Node.js сервер для VPS (по умолчанию)
 * - "vercel"      — для Vercel (можно поставить через env: NITRO_PRESET=vercel)
 */
process.env.NITRO_PRESET = process.env.NITRO_PRESET ?? "node-server";

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
