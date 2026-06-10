# DevDeck — Architecture Map for Contributors

> One page to orient your first PR. For diagrams, schema, and decisions, see [ARCHITECTURE.md](ARCHITECTURE.md) and the [ADRs](adr/).

---

## The big picture

```txt
apps/web (React 18 + Vite) ──────┐
apps/desktop (Electron + React) ─┼──> packages/features ──> packages/api-client ──> backend (Go API) ──> Postgres 16
apps/extension (Manifest V3) ────┤      (pages + UI)        (fetch + TanStack       (Chi router)          (+ pg_trgm,
cli/ (devdeck, Go) ──────────────┘                            Query hooks)                                  pgvector)
```

Web and Desktop render the **same pages** from `packages/features`. The extension and CLI talk to the API directly. Most UI work happens in `packages/features`; most server work follows the `router → handler → store → Postgres` path.

## Backend (`backend/`)

| Path | What lives there |
|------|------------------|
| `cmd/api` | Entrypoint: config, wiring, cron scheduling |
| `internal/http` | `router.go` plus `handlers/` (one file per domain: items, repos, circles, …) |
| `internal/store` | All SQL data access (pgx). Handlers stay thin; queries live here |
| `internal/domain` | Domain types and params |
| `internal/ai` | AI providers + the heuristic tagger (`heuristic.go`) |
| `internal/enricher` | GitHub/OpenGraph enrichment (SSRF-guarded) |
| `internal/cron` | Scheduled jobs (e.g. weekly digest) |
| `internal/authservice`, `internal/authctx` | JWT auth and request user context |
| `migrations/` | Numbered SQL migrations — schema changes always go through a new migration |

Supporting packages: `cache`, `email`, `jobs`, `metrics`, `seed`, `webhooks`, `testutil` (testcontainers helpers).

## Frontend (pnpm monorepo)

| Path | What lives there |
|------|------------------|
| `packages/features` | **Shared pages and domain components used by both Web and Desktop.** Start here for UI changes |
| `packages/api-client` | API wrapper, TanStack Query hooks, preferences, sync scaffolding |
| `packages/ui` | Design system (neo-brutalist tokens and primitives) |
| `packages/i18n` | Locale resources (en/es) |
| `apps/web` | Web shell: routing + providers |
| `apps/desktop` | Electron shell. Main-process IPC: API tester sender, project detection, global shortcuts |
| `apps/extension` | Browser capture extension (Manifest V3 + Vite) |
| `cli/` | `devdeck` CLI (Go) |

## Where to change what

| I want to… | Touch |
|------------|-------|
| Change a page or component | `packages/features/src/pages` or `src/components` (check both Web and Desktop routes render it) |
| Add an API endpoint | `backend/internal/http/handlers` + `internal/store` (+ a migration if schema changes) → hook in `packages/api-client` → consume in `packages/features` |
| Add a Workbench tool | `packages/features/src/components/Workbench/` |
| Change design tokens/styles | `packages/ui` |
| Add/adjust translations | `packages/i18n` |

## Verify before opening a PR

```bash
pnpm typecheck
pnpm test
cd backend && go test ./...
```

CI runs workspace typecheck/tests, backend tests against Postgres, desktop and extension builds, and the CLI build. Keep PRs small, issue-backed (`Closes #...`), and include a test or a clear verification note — see [FIRST_CONTRIBUTION.md](FIRST_CONTRIBUTION.md).
