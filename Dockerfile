# =====================================================================
#  Production image — multi-stage.
#  Stage 1 builds the static bundle with Node 24 LTS.
#  Stage 2 serves it with nginx (tiny, fast, no Node at runtime).
#  Use this later for staging/production; for daily work use Dockerfile.dev.
# =====================================================================

# ---- Stage 1: build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build          # outputs to /app/dist

# ---- Stage 2: serve ----
FROM nginx:1.27-alpine
# SPA routing: unknown paths fall back to index.html so React Router works.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
