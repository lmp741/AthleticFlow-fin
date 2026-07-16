import { createServerFileRoute } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Server route: GET /sitemap.xml
 *
 * Раньше был на createFileRoute().server.handlers — этот API не регистрировал
 * обработчик, и /sitemap.xml проваливался в SPA-заглушку (отдавал HTML).
 * Переписан на createServerFileRoute().methods() — как рабочие /api/* роуты.
 */

const BASE_URL = "https://af-sport.ru";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string; // ISO
}

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const ServerRoute = createServerFileRoute("/sitemap.xml").methods({
  GET: async () => {
    const staticEntries: SitemapEntry[] = [
      { path: "/", changefreq: "daily", priority: "1.0" },
      { path: "/games", changefreq: "hourly", priority: "0.9" },
      { path: "/stadiums", changefreq: "daily", priority: "0.9" },
      { path: "/create", changefreq: "monthly", priority: "0.6" },
      { path: "/friends", changefreq: "weekly", priority: "0.5" },
      { path: "/auth", changefreq: "yearly", priority: "0.3" },
    ];

    // Динамические страницы стадионов (если supabase доступен на сервере).
    // Никогда не падаем: если ENV не настроен — отдаём только статические записи.
    const dynamicEntries: SitemapEntry[] = [];
    try {
      const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
      const key =
        process.env.SUPABASE_ANON_KEY ??
        process.env.VITE_SUPABASE_ANON_KEY ??
        process.env.SUPABASE_PUBLISHABLE_KEY ??
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (url && key) {
        const supa = createClient(url, key, { auth: { persistSession: false } });
        const { data } = await supa
          .from("stadiums")
          .select("id, created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        (data ?? []).forEach((s: { id: string; created_at: string | null }) => {
          dynamicEntries.push({
            path: `/stadiums/${s.id}`,
            changefreq: "weekly",
            priority: "0.7",
            lastmod: s.created_at ?? undefined,
          });
        });
      }
    } catch {
      // не валим sitemap из-за БД
    }

    const entries = [...staticEntries, ...dynamicEntries];

    const urls = entries.map((e) =>
      [
        `  <url>`,
        `    <loc>${xmlEscape(BASE_URL + e.path)}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        `  </url>`,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...urls,
      `</urlset>`,
    ].join("\n");

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
});
