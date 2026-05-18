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

## [1.0.0] - 2026-05-17

### Added

- **Autonomous AI Agents**: Multi-step orchestration with tool-calling capabilities. Agents can search the vault, create items, and propose shell commands (Fases 49-50).
- **Hybrid Execution**: Secure "Human-in-the-loop" model for executing terminal commands locally from the Desktop App.
- **Collective Intelligence**: Team insights, adoption analytics, and trending tags detection for organizations (Fases 47-48).
- **Enterprise Identity**: Full support for SAML 2.0 (SSO) and SCIM 2.0 (Automatic Provisioning) via Okta/Azure AD (Fases 45-46).
- **Global Scalability**: Multi-region active-active synchronization with read replicas and atomic conflict resolution (Fases 43-44).
- **Real-time Collaboration**: Conflict-free concurrent editing using Yjs and CRDTs over WebSockets (Fase 35).
- **Teams & RBAC**: Organization-level multi-tenancy with granular Role-Based Access Control (Owner, Admin, Editor, Viewer).
- **Plugin SDK**: Language-agnostic extensibility via HTTP-based custom enrichers and outbound webhooks (Fases 36-38).
- **Onboarding Wizard**: Guided product tour with "Starter Kits" to eliminate the empty vault problem (Fase 51).
- **Advanced Discovery**: Social feed for followers, team-wide search, and personalized tool recommendations.

### Changed

- **V1.0 Final Release**: Transitioned from a bookmark manager to a comprehensive **Knowledge OS for Developers**.
- **Brutalist Redesign**: Final polish of the neo-brutalist design system across all platforms.
- **Unified Search**: Refactored global search to prioritize team-validated knowledge.
- **Documentation**: Complete technical architecture guide and self-hosting documentation.

### Fixed

- **Stability**: Fixed memory management in Electron renderer and pointer handling in Go backend.
- **Security**: Hardened SSRF protection for OG scraping and refined PAT auditing.
- **Performance**: Aggregated analytics queries now run exclusively on read replicas.

### Security

- HMAC SHA-256 signatures for outbound webhooks.
- Dial-time IP validation for enrichment scraping.
- Encrypted credential storage in Desktop using OS-native safe storage.

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

[Unreleased]: https://github.com/tiagofur/dev_deck/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/tiagofur/dev_deck/releases/tag/v1.0.0
[0.1.0]: https://github.com/tiagofur/dev_deck/compare/v0.0.5...v0.1.0
[0.0.5]: https://github.com/tiagofur/dev_deck/releases/tag/v0.0.5