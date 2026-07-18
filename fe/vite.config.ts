import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  },
  plugins: [
    react({ tsDecorators: true }),
    mode === "development" && componentTagger(),
    VitePWA({
      // 'prompt': có bản mới → hiện thông báo cho người dùng bấm Tải lại (không tự reload giữa lúc nhập liệu).
      registerType: "prompt",
      // Tự đăng ký thủ công qua PWAUpdatePrompt (virtual:pwa-register) để kiểm soát thông báo cập nhật.
      injectRegister: false,
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "logo.jpg"],
      manifest: {
        name: "Master CEO",
        short_name: "Master CEO",
        description: "Phần mềm kế toán số Master CEO",
        lang: "vi",
        theme_color: "#1F3864",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell precache + SPA fallback; KHÔNG cache API (dữ liệu tài chính phải mới).
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
        ],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  optimizeDeps: {
    esbuildOptions: {
      tsconfig: "./tsconfig.json",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
