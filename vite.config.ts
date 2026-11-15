/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api/debug": {
        target: "http://localhost:8000",
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ""),
      },
      "/api": {
        target: "https://backend-okil-project.onrender.com",
        changeOrigin: true,
        ws: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    globals: true,
  },
});
