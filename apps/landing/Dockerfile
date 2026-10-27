# ─────────────────────────────────────────────────────────────
# HeapDeck Landing — multi-stage build (static Astro site)
#
# Stage 1: build the Astro marketing site.
# Stage 2: serve static assets with nginx.
#
# Build:    docker build -t heapdeck-landing:latest -f apps/landing/Dockerfile .
# Run:      docker run -p 3000:3000 heapdeck-landing:latest
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
COPY tsconfig.base.json ./

# Copy all package.json files
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/features/package.json ./packages/features/
COPY packages/ui/package.json ./packages/ui/
COPY packages/realtime-client/package.json ./packages/realtime-client/
COPY packages/i18n/package.json ./packages/i18n/
COPY apps/web/package.json ./apps/web/
COPY apps/desktop/package.json ./apps/desktop/
COPY apps/landing/package.json ./apps/landing/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source needed by the landing build (@heapdeck/ui + landing itself)
COPY packages ./packages
COPY apps/landing ./apps/landing

# Build the landing (static output in apps/landing/dist)
WORKDIR /src/apps/landing
RUN pnpm build

# Stage 2 — runtime
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY apps/landing/deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /src/apps/landing/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
