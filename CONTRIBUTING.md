# Contributing to DevDeck

Thank you for your interest in contributing to DevDeck! This is an indie project with a strong vision, so please read this guide before opening a Pull Request.

[Leer en español](CONTRIBUTING.es.md)

---

## Fast Path

If this is your first contribution, start with [docs/FIRST_CONTRIBUTION.md](docs/FIRST_CONTRIBUTION.md).

The short version:

1. Pick or open an issue.
2. Wait for `status:approved`.
3. Keep the PR focused on that one issue.
4. Run the smallest relevant verification command.
5. Open a PR with `Closes #...` and exactly one `type:*` label.

---

## Before You Start

1.  **Read the vision**: Check `docs/VISION.md` and `docs/PRD.md`. If your proposal doesn't align with the project's direction, we might decline it. Save yourself some time!
2.  **Issue first**: For code or docs changes, open or claim an issue and wait for `status:approved` before opening a PR.
3.  **Shape unclear ideas carefully**: If the idea is still rough, start in [GitHub Discussions](https://github.com/tiagofur/dev_deck/discussions) to ask questions, share context, and narrow the first useful step before opening an issue.
4.  **Reporting bugs**: Use the bug report template with clear reproduction steps, version, OS, and logs if applicable.

## Best First Contributions

DevDeck is currently preparing for a community launch. The most useful contributions are small, visible improvements that make the app easier to try, understand, and trust:

- Polish one empty/loading/error state.
- Improve one onboarding or README section.
- Add one focused test for an existing feature.
- Fix one Desktop/Web parity gap.
- Improve one Circle sharing or community-memory flow.
- Make local setup or self-hosting easier to follow.

If you are new here, look for issues labeled `good first issue` or ask for a small launch-readiness task in [GitHub Discussions](https://github.com/tiagofur/dev_deck/discussions). See [docs/DISCUSSIONS.md](docs/DISCUSSIONS.md) before opening rough proposals.

The best first issues are already scoped to fit a small PR. If a change starts growing, split it before opening the PR.

---

## Local Setup

DevDeck is a **pnpm workspaces monorepo**. A single `pnpm install` in the root installs all dependencies for all packages (`apps/desktop`, `apps/web`, `apps/extension`, `packages/ui`, `packages/api-client`, `packages/features`, `packages/realtime-client`).

```bash
# Run this once from the project root
pnpm install
```

### Backend (Go)
```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL and GITHUB_* credentials
docker compose -f ../deploy/docker-compose.local.yml up -d db
go run ./cmd/api
```
...
## Questions & Answers

**Can I use this commercially?**
Yes. DevDeck is released under the Apache 2.0 License. See the `LICENSE` file for details.

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
- Link an approved issue with `Closes #...`.
- Use [GitHub Discussions](https://github.com/tiagofur/dev_deck/discussions) for questions or rough proposals before opening a large PR.
- Add exactly one `type:*` label.
- Ensure the CI is green before requesting a review.
- A minimum of one maintainer approval is required for merging.
- Keep PRs small. Large PRs are harder to review, harder to debug, and more likely to be split.
- Do not add `Co-Authored-By` or AI attribution trailers.

---

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Be respectful, direct, and constructive. If you have an issue with another contributor, contact a maintainer privately.

---

*Part of the DevDeck Open Source Guidelines*
