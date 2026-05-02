# DevDeck Backend

Go API (Wave 5). Provides the core logic for capturing, organizing, and enriching development resources with AI.

## Quick Start

```bash
# 1. Start Postgres (via Docker Compose in the root)
cd ..
docker-compose up -d postgres

# 2. Copy env and configure GitHub OAuth
cd backend
cp .env.example .env
# Edit .env with your GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET

# 3. Apply migrations
make migrate-up

# 4. Run the server
make run
```

## Auth Strategy (GitHub-only)

DevDeck uses **GitHub OAuth** as the exclusive authentication provider.
- **Access Tokens:** Short-lived JWTs sent via `Authorization: Bearer <token>`.
- **Refresh Tokens:** Stored in secure `HttpOnly` cookies (Web) or secure storage (Desktop).
- **OAuth State:** Handled via encrypted/secure cookies to maintain statelessness.

## Directory Structure

```
cmd/api/main.go              # Entry point
internal/
  authctx/                   # Context-based user ID helpers
  authservice/               # JWT & Token logic
  config/                    # Environment & configuration
  domain/                    # Domain entities (auth, cheatsheets, repos, capture)
  http/
    handlers/                # HTTP route handlers (REST)
    middleware/              # JWT, Logging, CORS, Metrics
    router.go                # Chi router setup
  jobs/                      # Background workers (Enrichment, AI)
  store/                     # Database access layer (pgx)
migrations/                  # SQL schema migrations
```

## Key API Endpoints (Wave 5)

| Method | Path                        | Description |
|--------|-----------------------------|-------------|
| GET    | `/healthz`                  | Health check (Public) |
| GET    | `/api/auth/github/login`    | Start GitHub OAuth flow |
| GET    | `/api/auth/me`              | Get current authenticated user |
| POST   | `/api/items/capture`        | Unified capture endpoint (Wave 5) |
| GET    | `/api/cheatsheets`          | List/Search cheatsheets |
| POST   | `/api/cheatsheets/{id}/fork`| Fork a community cheatsheet |

## Development

- **Linting:** `make lint`
- **Testing:** `go test ./...` (Note: DB tests require Docker)
- **Migrations:** Use `make migrate-new name=...` to create a new migration.

---

*Last updated: May 2026 (Wave 5)*
