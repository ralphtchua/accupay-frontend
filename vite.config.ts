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
    // When the C# API is exposed via ngrok, point VITE_API_URL at the tunnel
    // (see src/lib/api.ts). Until then the app runs against the mock layer.
  },
});
