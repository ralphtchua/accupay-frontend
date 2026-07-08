import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true, // listen on 0.0.0.0 so the port is reachable from outside the container
    watch: {
      usePolling: true, // reliable file-change detection across Docker bind mounts (WSL/macOS)
    },
    proxy: {
      // Forward all /api calls to the C# API so the browser only ever talks to
      // the same origin (avoids CORS + the self-signed dev-cert). secure:false
      // lets Vite accept the localhost https dev certificate.
      //
      // NOTE: this Vite server runs inside a Docker container, so "localhost"
      // here means the container itself. The C# API runs on the Windows HOST,
      // reachable from the container as host.docker.internal (Docker Desktop).
      // Override with VITE_API_PROXY_TARGET if the API lives elsewhere.
      "/api": {
        // Default assumes the API runs on this same machine (running Vite
        // locally with `npm run dev`). When running inside Docker, compose sets
        // VITE_API_PROXY_TARGET=https://host.docker.internal:5001 to reach the
        // API on the Windows host instead.
        target: process.env.VITE_API_PROXY_TARGET ?? "https://localhost:5001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
