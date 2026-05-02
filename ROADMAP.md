# DevDeck.ai Roadmap

This document outlines the vision and development stages for **DevDeck.ai**. We work in "Waves" (Olas) to progressively build the core infrastructure, the capture network, and the AI intelligence.

[Leer en español](ROADMAP.es.md)

---

## ✅ Waves 1–4: Core Foundation (Complete)

- [x] **Wave 1:** Core Go API, Auth (GitHub), and basic Items CRUD.
- [x] **Wave 2:** Enrichment engine (Open Graph metadata, screenshot capture).
- [x] **Wave 3:** Frontend redesign (Neo-brutalist / Dark mode).
- [x] **Wave 4:** Monorepo transition (pnpm workspaces) and shared `@devdeck/features` package.

---

## 🚧 Wave 4.5: Hardening & Capture (Current)

> **Goal:** Create a safety net (testing) and open the "capture floodgates" via different channels.

### Phase 16 — Testing & CI
- [ ] Backend: Integration tests with `testcontainers-go`.
- [ ] Frontend: Vitest + React Testing Library for shared components.
- [ ] E2E: Playwright for critical flows (Login -> Capture -> Search).
- [ ] CI: GitHub Actions for automated linting and testing.

### Phase 17 — The Capture Network
- [ ] **CLI:** `devdeck add <url>` for terminal-first users.
- [ ] **Extension:** Browser extension (Chrome/Firefox) for one-click saving.
- [ ] **Paste Interceptor:** "Smart paste" detection in the desktop app.
- [ ] **Share Extension:** Basic implementation for future mobile apps.

---

## 🌊 Wave 5: General Items + Real AI

> **Goal:** Support non-URL items (CLIs, Snippets, Prompts) and leverage LLMs for deep organization.

### Phase 18 — Polymorphic Items
- Support for: `Repo`, `CLI`, `Plugin`, `Cheatsheet`, `Shortcut`, `Snippet`, `Agent`, `Prompt`, `Workflow`.
- Custom schemas per type (e.g., `Shortcut` has a `keys` field, `CLI` has an `install` command).

### Phase 19 — AI Semantic Brain
- **Embeddings:** Vectorize items using OpenAI or local Ollama.
- **Semantic Search:** Find items by intent: *"That tool for resizing images I saved last month"* instead of exact tags.
- **Auto-tagging:** AI suggests categories and tags during capture.
- **Ask DevDeck:** RAG-based chat to query your own knowledge base.

---

## 🌊 Wave 6: Offline-first + Sync + Multi-user

> **Goal:** Make DevDeck work everywhere, even without internet, and enable community sharing.

### Phase 20 — Offline-first Architecture
- **Desktop:** Local SQLite with sync logic.
- **Web:** PWA support with OPFS persistence.
- **Sync Engine:** Conflict resolution (last-write-wins) and background synchronization.

### Phase 21 — Decks & Community
- **Public Decks:** Curate and share a collection of tools (e.g., *"My 2026 Go Stack"*).
- **Importing:** One-click import from a public deck to your personal vault.
- **Social Metadata:** Stars, forks, and trending tools within the DevDeck ecosystem.

---

## Tech Stack (Current)

| Layer | Technology |
|------|-----------|
| **Monorepo** | pnpm workspaces |
| **Desktop** | Electron + React 18 + TS |
| **Web** | Vite + React 18 + TS |
| **Styling** | Tailwind CSS + Framer Motion |
| **Backend** | Go (Chi) + pgx |
| **Database** | Postgres 16 + pgvector |
| **IA** | OpenAI / Ollama (Roadmap) |

---

*Last updated: May 2026*
