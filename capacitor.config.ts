import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.httpsafsport",
  appName: "AF Sport",
  webDir: "dist",
  server: {
    // Hot-reload с live-сайта Lovable. Для финальной сборки в App Store
    // закомментируй блок server и используй локальный билд из webDir.
    url: "https://4d250271-ea5d-4807-874a-e57cab4db334.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
};

export default config;
