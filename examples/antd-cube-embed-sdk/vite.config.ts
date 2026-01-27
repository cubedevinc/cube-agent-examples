import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const proxyUrl = "https://d3-ai-demo.cubecloud.dev";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["@cube-dev/embed-sdk", "@cube-dev/console-public-sdk"],
  },
  server: {
    proxy: {
      "^/api/v1/.*": proxyUrl,
    },
  },
  define: {
    "process.env": {},
    global: "globalThis",
  },
});
