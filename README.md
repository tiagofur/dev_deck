# DevDeck.ai

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/tiagofur)

> **Your AI-assisted external memory for development work.**

[Leer en español](README.es.md)

An **offline-first, multi-user, and multi-platform** app to save, organize, and rediscover everything useful a developer finds: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agents, prompts, and workflows. Powered by AI that classifies, summarizes, and retrieves by intent — not just exact tags.

Domain: **[devdeck.ai](https://devdeck.ai)**

---

## Why DevDeck?

The real problem isn't "saving repos." It's being unable to find what you already discovered: a useful CLI shared in a chat, an IDE plugin whose name you forgot, a macOS shortcut that took hours to learn, or a repo that solved exactly your current problem.

DevDeck is your **curated collection of dev knowledge** — with AI that makes everything you save findable weeks later, even if you don't remember what you called it.

---

## Stack

- **Desktop:** Electron + React 18 + TypeScript + Tailwind + Framer Motion
- **Web:** React 18 + Vite + React Router + TanStack Query (shares 100% of pages and components with Desktop)
- **Backend:** Go + Chi + pgx + pgvector
- **DB:** Postgres 16 (with `pg_trgm` + `pgvector` for fuzzy and semantic search)
- **AI:** OpenAI API / Ollama (local)
- **Offline:** Local SQLite (Electron) + sql.js/OPFS (Web)
- **Deploy:** Self-hosted VPS · Docker Compose · Caddy (Automatic TLS)
- **Domain:** [devdeck.ai](https://devdeck.ai) · `app.devdeck.ai` · `api.devdeck.ai`

### Repo Layout (pnpm workspaces monorepo)

```
dev_deck/
├── apps/
│   ├── desktop/          # Electron app (React renderer)
│   └── web/              # Web app (React + BrowserRouter)
├── packages/
│   ├── ui/               # Design system: Button, TagChip, Toaster, tailwind-preset
│   ├── api-client/       # Fetch wrapper + TanStack Query hooks + auth adapters
│   └── features/         # Pages + domain components (shared between apps)
├── backend/              # Go API
├── cli/                  # `devdeck` CLI (Go)
├── extension/            # Browser extension (Manifest v3)
├── deploy/               # Docker Compose + Caddy
└── docs/                 # Documentation
```

Both apps import pages and components from the `@devdeck/features` package — they only differ in the shell (HashRouter + PasteInterceptor on desktop, BrowserRouter + AuthGuard on web). See [docs/adr/0003-monorepo-pnpm-workspaces.md](docs/adr/0003-monorepo-pnpm-workspaces.md).

---

## Screenshots

> 📸 _TODO: Add GIFs/screenshots of Home, RepoDetail, Discovery, and Cheatsheets. Part of Phase 16.5._

---

## Documentation

### Product & Vision
| Doc | Content |
|-----|-----------|
| [docs/VISION.md](docs/VISION.md) | Vision, positioning, differentiators |
| [docs/PRD.md](docs/PRD.md) | Product, features, user stories, scope by waves |
| [docs/COMPETITIVE_ANALYSIS.md](docs/COMPETITIVE_ANALYSIS.md) | Detailed competitive analysis |
| [docs/LANDING.md](docs/LANDING.md) · [docs/LANDING_COPY.md](docs/LANDING_COPY.md) | Landing copy (ES / EN) |

### Architecture & Decisions
| Doc | Content |
|-----|-----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagram, stack, DB schema |
| [docs/API.md](docs/API.md) | OpenAPI spec |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, palette, typography |
| [docs/TECHNICAL_ROADMAP_AI_OFFLINE.md](docs/TECHNICAL_ROADMAP_AI_OFFLINE.md) | Technical roadmap: offline, sync, AI |
| [docs/adr/0001-items-polymorphism.md](docs/adr/0001-items-polymorphism.md) | ADR: polymorphic items model |
| [docs/adr/0002-sync-strategy.md](docs/adr/0002-sync-strategy.md) | ADR: offline-first sync strategy |
| [docs/adr/0003-monorepo-pnpm-workspaces.md](docs/adr/0003-monorepo-pnpm-workspaces.md) | ADR: pnpm workspaces monorepo + React on web |

### Operation & Contribution
| Doc | Content |
|-----|-----------|
| [cli/README.md](cli/README.md) | Real installation and usage of the `devdeck` CLI (P0) |
| [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) | Step-by-step self-hosting guide |
| [docs/CAPTURE.md](docs/CAPTURE.md) | Capture channels spec (extension, CLI, paste, share) |
| [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) | Test plan and CI |
| [docs/REVIEW_2026_04.md](docs/REVIEW_2026_04.md) | **April 2026 Technical Review** — motivates Wave 4.5 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [SECURITY.md](SECURITY.md) | Security policy |

---

## Status

✅ **Waves 1–6 complete.** **Wave 7 (Collaboration & Advanced IA) in progress**.
The project has evolved from a simple directory to an offline-first knowledge OS with semantic search, multi-device synchronization, and public shareable decks.

Full roadmap at [ROADMAP.md](ROADMAP.md).
