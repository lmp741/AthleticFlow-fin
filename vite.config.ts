import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * Native TanStack Start config (без @lovable.dev/vite-tanstack-config),
 * собирается под Vercel благодаря target: "vercel".
 *
 * Если когда-нибудь захочешь обратно на Cloudflare Pages —
 * поставь target: "cloudflare-pages" (нужно вернуть @cloudflare/vite-plugin).
 */
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      target: "vercel",
    }),
    viteReact(),
  ],
  server: {
    port: 3000,
    strictPort: false,
    host: true,
  },
});
