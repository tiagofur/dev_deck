# Contributing to DevDeck

Thank you for your interest in contributing to DevDeck! This is an indie project with a strong vision, so please read this guide before opening a Pull Request.

[Leer en español](CONTRIBUTING.es.md)

---

## Before You Start

1.  **Read the vision**: Check `docs/VISION.md` and `docs/PRD.md`. If your proposal doesn't align with the project's direction, we might decline it. Save yourself some time!
2.  **Discussion first**: For new features, please open a **Discussion Issue** first. Do not send large PRs without prior acknowledgment.
3.  **Reporting bugs**: Open an issue with clear reproduction steps, version, OS, and stack traces if applicable.

---

## Local Setup

DevDeck is a **pnpm workspaces monorepo**. A single `pnpm install` in the root installs all dependencies for all packages (`apps/desktop`, `apps/web`, `packages/ui`, `packages/api-client`, `packages/features`).

```bash
# Run this once from the project root
pnpm install
```

### Backend (Go)
```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL and GITHUB_* credentials
docker compose -f ../deploy/docker-compose.dev.yml up -d db
go run ./cmd/api
```

### Desktop App (Electron + React)
```bash
pnpm dev:desktop
# Equivalent to: pnpm -F @devdeck/desktop dev
```

### Web App (React)
```bash
pnpm dev:web
# Equivalent to: pnpm -F @devdeck/web dev
# The dev server listens on http://localhost:5173 and proxies /api to :8080
```

### Tests and Typechecking
```bash
pnpm typecheck                    # Runs tsc --noEmit across all packages
pnpm test                         # Runs vitest in packages with unit tests
pnpm -F @devdeck/desktop test:e2e # Runs Playwright flows for the desktop app
```

---

## Monorepo Coding Patterns

- **UI Primitives** (no fetch, no domain logic): `packages/ui/src/`.
- **API logic, Domain types, Auth adapters**: `packages/api-client/src/`.
- **Shared Pages & Domain Logic**: `packages/features/src/`.
- **Desktop-only logic** (Electron main process, global shortcuts): `apps/desktop/src/`.
- **Web-only logic** (Routing shell, Web-specific guards): `apps/web/src/`.

We use internal aliases: `@devdeck/ui`, `@devdeck/api-client`, and `@devdeck/features`.

---

## Coding Style

### Go
- Use `gofmt` and `goimports`. The CI will fail if formatting is off.
- Packages should be organized by **Domain**, not by layer.
- Errors: Always wrap errors with context using `fmt.Errorf("context: %w", err)`.

### TypeScript & React
- Use **functional components and hooks** exclusively. No new class components.
- Strict typechecking is enabled in `tsconfig.base.json`.
- State management: Use **TanStack Query v5** for server state; `useState` for local UI state. Avoid Redux/Zustand unless discussed.

### Commit Messages
We follow **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`.
- Example: `feat(backend): add /api/items/capture endpoint`

---

## Pull Requests

- Branch from `main` with a descriptive name: `feat/capture-endpoint`.
- One PR = One concern.
- Ensure the CI is green before requesting a review.
- A minimum of one maintainer approval is required for merging.

---

## Code of Conduct

Be respectful. If you have an issue with another contributor, please contact a maintainer privately. We keep the drama out of public discussions.

---

*Part of the DevDeck Open Source Guidelines*
