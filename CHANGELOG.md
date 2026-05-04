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

[Unreleased]: https://github.com/tiagofur/dev_deck/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/tiagofur/dev_deck/releases/tag/v0.1.0
[0.0.5]: https://github.com/tiagofur/dev_deck/releases/tag/v0.0.5