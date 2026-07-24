var _a;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
/**
 * Content-Security-Policy for the built app. Injected as a <meta> tag at BUILD
 * time only — the dev server (HMR) relies on inline scripts + eval + a ws
 * connection, which a strict policy would break, so we deliberately don't apply
 * it to `vite dev`.
 *
 * script-src is 'self' with no 'unsafe-inline'/'unsafe-eval' — the production
 * bundle emits a single external module script and no inline scripts, so nothing
 * is blocked. style-src keeps 'unsafe-inline' (React sets element styles via the
 * DOM style property, which CSP doesn't govern, but this stays permissive for
 * any runtime <style>) and allows the Google Fonts stylesheet; font files come
 * from fonts.gstatic.com. All API calls are same-origin (Vite proxy in dev, SPA
 * middleware in prod), so connect-src 'self' is sufficient — add the API origin
 * here if it's ever served from a different host.
 *
 * Note: frame-ancestors / X-Frame-Options must be sent as a real HTTP header by
 * the host (it's ignored inside a <meta> CSP), so clickjacking protection is a
 * server-side follow-up.
 */
var CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join("; ");
function cspMeta() {
    return {
        name: "inject-csp-meta",
        apply: "build",
        transformIndexHtml: function (html) {
            return html.replace("</title>", "</title>\n    <meta http-equiv=\"Content-Security-Policy\" content=\"".concat(CSP, "\" />"));
        },
    };
}
// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), cspMeta()],
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
                target: (_a = process.env.VITE_API_PROXY_TARGET) !== null && _a !== void 0 ? _a : "https://localhost:5001",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
