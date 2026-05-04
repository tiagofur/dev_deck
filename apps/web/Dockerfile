# ─────────────────────────────────────────────────────────────
# DevDeck Web — multi-stage build
#
# Stage 1: build the React app with Vite.
# Stage 2: serve static assets with nginx.
#
# Build:    docker build -t devdeck-web:latest -f apps/web/Dockerfile .
# Run:      docker run -p 3000:3000 --env-file .env devdeck-web:latest
# ─────────────────────────────────────────────────────────────

# Stage 1 — builder
FROM node:22-alpine AS builder

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /src

# Copy workspace config files first (better cache)
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./package.json

# Copy all package.json files
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/features/package.json ./packages/features/
COPY packages/ui/package.json ./packages/ui/
COPY packages/realtime-client/package.json ./packages/realtime-client/
COPY apps/web/package.json ./apps/web/
COPY apps/desktop/package.json ./apps/desktop/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source for web build
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/desktop ./apps/desktop

# Build the web app
WORKDIR /src/apps/web
RUN pnpm build

# Stage 2 — runtime
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY apps/web/deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /src/apps/web/dist /usr/share/nginx/html

# Custom error pages and static files
RUN mkdir -p /usr/share/nginx/html/static && \
    echo '{"error":"not_found"}' > /usr/share/nginx/html/404.html && \
    echo '{"error":"server_error"}' > /usr/share/nginx/html/50x.html

EXPOSE 3000

# nginx runs as nonroot by default in the alpine image
CMD ["nginx", "-g", "daemon off;"]