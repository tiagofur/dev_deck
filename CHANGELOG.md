# Changelog

All notable changes to DevDeck will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

## [0.6.0] - 2026-06-14

Quality & security hardening pass across the whole monorepo (web, desktop,
extension, backend, landing) to make DevDeck contribution-ready as an
open-source project.

### Added

- **Spanish (es) runtime locale**: complete `es` translation (full key parity
  with `en`) with automatic language detection and a language switcher in
  Settings. The app previously shipped only English at runtime.
- **ESLint + Prettier** for the whole web frontend (shared flat config); the
  root `lint` script was previously a no-op. `pnpm lint` reports 0 errors.
- **golangci-lint** gate for the Go backend (config + CI step, includes
  `gosec`); CI previously ran only `go vet`.
- **Tests for `apps/web`** (Vitest: router reachability + page smoke tests);
  it had none before.
- **CI now runs the frontend unit tests, lint, and the web/landing builds**,
  plus backend `golangci-lint` — none of which ran before.
- **Configurable server URL for the browser extension** (options page,
  persisted) replacing hardcoded localhost.
- **Desktop 404 page** + catch-all route (unknown routes rendered blank).
- Project scaffolding: `.github/dependabot.yml`, `CODEOWNERS`,
  `apps/web/.env.example`, and `AUTH_RATE_LIMIT_PER_MINUTE` config.

### Changed

- **Web bundle is code-split** (vendor chunks); the main chunk dropped from
  ~1.57 MB to ~440 KB.
- **Dependency updates**: Go modules (pgx, x/net, x/crypto, testcontainers,
  …), JS dev/prod groups (TanStack Query, Playwright, …) and framer-motion 12.
  CI Go toolchain bumped to 1.25.
- Replaced 48 `any` usages in the data layer with accurate types; removed dead
  code; `gofmt`'d the backend tree.

### Fixed

- **Stored XSS** in the README viewer (remote markdown was rendered with
  `rehype-raw` and no sanitizer) — added `rehype-sanitize`.
- Silent failures surfaced to users (waitlist submit, workspace switch); a
  conditional-`useEffect` hooks bug in the mascot; the extension's hardcoded
  `localhost` API/web URLs; the landing's broken (404) Open Graph image.
- Backend: internal/DB error text leaked to clients; unbounded pagination
  (memory-exhaustion DoS); insecure logout cookie.
- ~190 lint warnings and keyboard-accessibility gaps across the frontend.

### Security

- **Removed a tracked `deploy/.env`** (committed secrets) and rotated its
  local values.
- **Rate-limited the unauthenticated `/auth` endpoints** (login/register/
  refresh) — they had no limiter, allowing brute-force.
- Fixed a non-functional AI rate limiter; constant-time static-token compare;
  sanitized remote README (see Fixed); pagination caps; insecure-cookie fix.
- Hardened the desktop Electron shell (validate external-URL schemes,
  `will-navigate` guard).
- _Known follow-up_: web/extension auth tokens still live in `localStorage`
  (XSS-exposed); migrating to HttpOnly cookies needs coordinated backend work.

---

## [0.5.0] - 2026-06-04

### Added

- **Public beta positioning**: DevDeck is now presented honestly as a functional open-source public beta, not a stable 1.0 product.
- **Developer memory loop**: Public docs now explain the capture → context → retrieval → Workbench → Circles workflow.
- **Circles community flow**: Circle sharing now includes context notes, attribution, source metadata, tags, and empty-state contribution guidance.
- **Developer Workbench direction**: Docs describe the Workbench as a daily-use surface for reusable developer utilities, requests, snippets, runbooks, and project context.
- **Contributor path**: README and contributing docs now call out launch-readiness contribution areas and small-PR expectations.
- **Community launch kit**: Added honest Reddit/forum/social copy, support messaging, and launch-readiness checklist.

### Changed

- **Version reset for honesty**: Workspace packages and extension version moved from premature `1.0.0` to `0.5.0`.
- **Launch copy**: Removed over-promising stable/enterprise/autonomous-agent claims from public launch materials.
- **README**: Reworked the public README around the rediscovery problem, product loop, current capabilities, setup, contribution, and support.

### Fixed

- **Public trust risk**: Corrected misleading `v1.0.0 Stable` language in versioning and launch docs.

---

## [0.1.0] - 2026-05-03

### Added

- **Stack filter**: Multi-select pills to filter items by stack (Go, Node, Python, Docker, etc.) — Issue #33
- **Smart tags**: Autocomplete dropdown with AI-generated tag suggestions
- **Keyboard shortcuts**: Global shortcuts for quick access — Cmd+K (search), Cmd+N (new item), Cmd+L (login), Cmd+/ (help)
- **Favorites system**: Star toggle on cards, `is_favorite` database field, Cmd+D in detail view
- **Mobile responsive**: Sidebar drawer mode, full-width search bar on mobile
- **Desktop MVP**: Electron app with OAuth, pages shared via monorepo
- **Capture modal**: Quick capture with keyboard shortcut — Cmd+Shift+N

### Changed

- Migrated client to React 18 (was Vue 3) — shared via pnpm monorepo
- OAuth callback now separates frontend redirect URLs

### Fixed

- CI: Migration robustness improvements
- Debug: Include actual error in 500 responses
- Config: Separate OAuth callback from frontend redirect URLs
- Goose: Remove Down section that deletes test user

### Security

- Production Dockerfile with multi-stage build
- Health checks endpoint for deployments

---

## [0.0.5] - 2026-04-XX

> Earlier releases predate the changelog. See git history for details.

- Core Go API with PostgreSQL
- GitHub OAuth authentication
- Items CRUD (repos, commands, cheatsheets)
- Enrichment engine (OG scraping, metadata)
- Cheatsheets with global search
- Web + Desktop clients (React 18 via monorepo)

---

[Unreleased]: https://github.com/tiagofur/dev_deck/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/tiagofur/dev_deck/compare/v0.1.0...v0.5.0
[0.1.0]: https://github.com/tiagofur/dev_deck/compare/v0.0.5...v0.1.0
[0.0.5]: https://github.com/tiagofur/dev_deck/releases/tag/v0.0.5
