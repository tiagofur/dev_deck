# DevDeck Skill Registry

## Project Standards

### Tech Stack
- **Backend:** Go 1.23 (Chi router, pgx, pgvector, JWT).
- **Frontend:** React 18, TypeScript, Tailwind CSS, TanStack Query v5, Framer Motion.
- **Desktop:** Electron 32 (shares components with Web).
- **Storage:** PostgreSQL 16, pgvector for semantic search.
- **Tooling:** pnpm workspaces, Docker Compose, Caddy.

### Architecture
- **Monorepo:** Managed with pnpm. Shared logic in `packages/features` and `packages/api-client`.
- **Backend Architecture:** Hexagonal-lite / Port-and-Adapter style.
- **Frontend Architecture:** Feature-based organization in `packages/features`.

### Testing & Quality
- **Backend Testing:** `go test ./...` using `testify` and `testcontainers-go`.
- **Frontend Testing:** `pnpm test` (Vitest) in `apps/desktop` and `apps/web`.
- **E2E Testing:** Playwright in `apps/desktop/tests`.
- **Type Checking:** `pnpm typecheck` (tsc).
- **Linting:** `pnpm lint` (golangci-lint for Go, eslint for TS).
- **Commit Style:** Conventional Commits enforced via `commitlint` and `husky`.

### Conventions
- **Neo-brutalist UI:** Follow tokens in `docs/DESIGN_SYSTEM.md`.
- **Polymorphic Items:** Central `Item` table for various content types.
- **Strict TDD:** Enabled for this project.

## Skill Triggers

| Skill | Trigger | Context |
|---|---|---|
| **go-testing** | `*.go` | Go tests, testify, testcontainers |
| **react-patterns** | `*.tsx`, `*.ts` | React 18, TanStack Query, hooks |
| **electron-dev** | `apps/desktop/*` | Electron main/preload/renderer |
| **sql-migrations** | `backend/migrations/*.sql` | Postgres, pgvector, pg_trgm |
| **work-unit-commits** | `git commit` | Conventional Commits |
