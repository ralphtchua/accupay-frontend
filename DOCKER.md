# Running the frontend in Docker

You don't need Node.js on your computer — it runs inside the container.
The only thing you install on your machine is **Docker Desktop**.

---

## 1. Install Docker Desktop (one time)

Download and install Docker Desktop for your OS, then launch it and wait
until the whale icon shows "running":

- **Windows:** https://www.docker.com/products/docker-desktop/
  (On Windows it will ask to enable WSL 2 — accept; the installer handles it.)
- **macOS:** same link — pick the Apple Silicon or Intel build to match your Mac.
- **Linux:** install Docker Engine + the Compose plugin from
  https://docs.docker.com/engine/install/

Verify it works. Open a terminal (PowerShell on Windows, Terminal on
macOS/Linux) and run:

```bash
docker --version
docker compose version
```

Both should print a version number. If they do, Docker is ready.

---

## 2. Run the app (daily workflow)

From inside the `ao-web` folder (the one with `docker-compose.yml`):

```bash
docker compose up
```

The first run takes a few minutes — it downloads the Node image and
installs dependencies inside the container. When you see Vite print
`Local: http://localhost:5173/`, open that URL in your browser.

**Hot reload works:** edit any file under `src/` on your machine and the
browser updates automatically — the container sees your changes through a
bind mount.

To stop it: press `Ctrl + C`, then (optionally) `docker compose down` to
remove the container.

Run it in the background instead (frees up your terminal):

```bash
docker compose up -d        # start detached
docker compose logs -f      # watch logs
docker compose down         # stop
```

---

## 3. When you change dependencies

If you add or update a package (anything that touches `package.json`),
rebuild the image so the container picks it up:

```bash
docker compose up --build
```

---

## 4. Production build (later, optional)

For a deployable, optimized build served by nginx (no dev server, much
smaller), use the production `Dockerfile`:

```bash
docker build -t ao-web:prod .
docker run -p 8080:80 ao-web:prod
```

Then open http://localhost:8080. This is what you'd deploy to a server;
for day-to-day development stick with `docker compose up`.

---

## 5. Connecting the C# backend later

When the ASP.NET Core API is exposed through ngrok, tell the frontend
where it lives by setting `VITE_API_URL`. Edit `docker-compose.yml` and
uncomment the line under `environment:`:

```yaml
    environment:
      - CHOKIDAR_USEPOLLING=true
      - VITE_API_URL=https://your-subdomain.ngrok-free.app
```

Then `docker compose up --build`. No other change is needed — the app
reads that variable in `src/lib/api.ts`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `docker: command not found` | Docker Desktop isn't installed or not running. Launch it and wait for "running". |
| Port 5173 already in use | Something else is on that port. Stop it, or change `"5173:5173"` to e.g. `"5174:5173"` in `docker-compose.yml` and open `localhost:5174`. |
| Edits don't hot-reload | Already handled via polling, but make sure you're editing files inside the mounted project folder, not a copy. |
| "Cannot connect to the Docker daemon" | Docker Desktop isn't started yet. Open it first. |
| First build is slow | Normal — it caches afterward. Later runs start in seconds. |
