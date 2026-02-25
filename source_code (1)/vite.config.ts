import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { youwareVitePlugin } from "@youware/vite-plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    youwareVitePlugin(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "来财 · RichUp",
        short_name: "来财",
        description: "个人现金流管理 · 财富增长追踪",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0a1628",
        theme_color: "#0a1628",
        lang: "zh-CN",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Cache all assets on first visit
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Cache strategy: StaleWhileRevalidate for JS/CSS, CacheFirst for images
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    sourcemap: true,
  },
});
