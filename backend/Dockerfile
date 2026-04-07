# ─────────────────────────────────────────────────────────────
# DevDeck API — multi-stage build
#
# Stage 1: build the static binary in a full Go image.
# Stage 2: copy only the binary into a distroless image (~5 MB total).
#
# IMPORTANT: run `go mod tidy` locally before building so go.sum exists.
#
# Build:    docker build -t devdeck-api:latest .
# Run:      docker run -p 8080:8080 --env-file .env devdeck-api:latest
# ─────────────────────────────────────────────────────────────

# Stage 1 — builder
FROM golang:1.23-alpine AS builder

WORKDIR /src

# Install git + ca-certificates (needed by go mod download for some modules)
RUN apk add --no-cache git ca-certificates tzdata

# Cache deps separately from source for faster rebuilds
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build static binary, no CGO, stripped, trimmed paths.
# GOOS/GOARCH explicit because we always target linux/amd64 on the VPS.
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
      -trimpath \
      -ldflags="-s -w" \
      -o /out/api \
      ./cmd/api

# Stage 2 — runtime
# distroless/static includes ca-certificates and runs as nonroot.
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

# Binary
COPY --from=builder /out/api /app/api

# Migrations bundled so you can run them via psql from anywhere
COPY --from=builder /src/migrations /app/migrations

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/app/api"]
