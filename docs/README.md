# DevDeck — Documentation

> Documentation index for the project. All docs live in this folder (`docs/`).
>
> [Leer en español](README.es.md)

---

## Product documentation

| File | Description |
|------|-------------|
| [PRD.md](PRD.md) | **Product Requirements Document.** Vision, problem, layered solution (polymorphic vault + intelligent retrieval + reusable actions), pillars, scope (core + Workbench + out of scope), and success metrics. Main entry point to understand the product. |
| [VISION.md](VISION.md) | **Vision and positioning.** What DevDeck is (and is not), genuine differentiators, target audience, and current focus. |
| [DEV_WORKBENCH.md](DEV_WORKBENCH.md) | **Developer Workbench.** From memory to contextual action: local utilities, palette, reusable requests, product boundaries, and per-phase status. |
| [CIRCLES_COMMUNITY.md](CIRCLES_COMMUNITY.md) | **Circles and community contribution.** Product model for turning individual findings into reusable memory for groups/communities of developers. |
| [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md) | **Competitive analysis.** Comparison against GitHub Stars, Raindrop, Pocket, Notion, Obsidian, and Raycast. |
| [LIMITATIONS.md](LIMITATIONS.md) | **Known limitations.** Honest list of what the 0.5.0 Public Beta does not do yet. |

---

## Landing page documentation

| File | Description |
|------|-------------|
| [LANDING_COPY.md](LANDING_COPY.md) | **Landing copy in English.** Full copy for `devdeck.ai` (global developer audience): hero, features, AI section, platforms, pricing, CTA, SEO tags, and implementation notes. |
| [LANDING.md](LANDING.md) | **Landing copy in Spanish.** Same structure for the Spanish-speaking audience, plus extra micro-copy for the app UI. |

---

## Technical documentation

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **System architecture.** High-level diagram, stack (Go + Chi + Postgres + pgvector; pnpm monorepo with Electron + React desktop and React web sharing `@devdeck/ui` / `@devdeck/api-client` / `@devdeck/features`), architecture decisions, and database schema. |
| [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) | **Architecture map for contributors.** One-page orientation: request flow, monorepo layout, where to change what, and how to verify before a PR. |
| [VERSIONING.md](VERSIONING.md) | **Versioning and releases.** SemVer, release strategy, Conventional Commits, changelog, release scripts, and auto-release GitHub Actions. |
| [adr/0001-items-polymorphism.md](adr/0001-items-polymorphism.md) | **ADR 0001.** Polymorphic `items` model (single table + JSONB + generated columns). |
| [adr/0002-sync-strategy.md](adr/0002-sync-strategy.md) | **ADR 0002.** Offline-first sync strategy. |
| [adr/0003-monorepo-pnpm-workspaces.md](adr/0003-monorepo-pnpm-workspaces.md) | **ADR 0003.** pnpm workspaces monorepo + web client migration from Vue 3 to React 18. |
| [TECHNICAL_ROADMAP_AI_OFFLINE.md](TECHNICAL_ROADMAP_AI_OFFLINE.md) | **Detailed technical roadmap.** Implementation plan for offline-first (local SQLite + sync engine), embeddings + vector search, and multi-user. |
| [API.md](API.md) | **REST API reference.** Endpoint specification (`/api/repos`, `/api/cheatsheets`, `/api/search`, `/api/auth`, etc.). |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | **Design system.** CSS tokens, neo-brutalist palette, typography, components, Snarkel mascot states, and UI design principles. |
| [CAPTURE.md](CAPTURE.md) | **Multi-channel capture.** How capture works from the CLI, extension, paste interceptor, and the `/api/items/capture` endpoint. |
| [SELF_HOSTING.md](SELF_HOSTING.md) | **Self-hosting guide.** Docker Compose + Caddy deployment, environment variables, migrations, and verification. |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | **Testing and CI strategy.** Backend tests, frontend unit tests, E2E, and the GitHub Actions pipeline. |

---

## Community and launch

| File | Description |
|------|-------------|
| [FIRST_CONTRIBUTION.md](FIRST_CONTRIBUTION.md) | **First contribution.** Short path to a first issue-backed PR. |
| [DISCUSSIONS.md](DISCUSSIONS.md) | **GitHub Discussions guide.** Categories and how to participate. |
| [SUPPORT.md](SUPPORT.md) | **Support and sustainability.** What project support funds and future sustainability paths. |
| [LAUNCH_KIT.md](LAUNCH_KIT.md) | **Launch kit.** Per-channel copy, launch checklist, and follow-up plan. |

---

## Reviews and audits (historical)

> Dated snapshots. For current product state, always check the [ROADMAP](../ROADMAP.md).

| File | Description |
|------|-------------|
| [REVIEW_2026_04.md](REVIEW_2026_04.md) | **Technical review (April 2026).** Hardening, capture, and testing debt — origin of Wave 4.5. |
| [APP_AUDIT_2026_05.md](APP_AUDIT_2026_05.md) | **App audit (May 2026).** Full feature inventory, user-impact classification, and the P0–P2 progressive disclosure plan. |
| [APP_AUDIT_REVIEW_2026_05.md](APP_AUDIT_REVIEW_2026_05.md) | **Audit verification (May 2026).** Evidence for the P0/P1 work and the community plan around Circles. |
| [FEATURE_REVIEW_2026_06.md](FEATURE_REVIEW_2026_06.md) | **Product and docs review (June 2026).** Yes/no decision menu on app and docs improvements; origin of issues #113–#130. |

---

## How to read this documentation

If you are new here, the recommended order is:

1. **[README.md](../README.md)** — what DevDeck is in 2 minutes
2. **[VISION.md](VISION.md)** — why it exists and for whom
3. **[PRD.md](PRD.md)** — what it does and what was decided
4. **[DEV_WORKBENCH.md](DEV_WORKBENCH.md)** — memory + action, with per-phase status
5. **[CIRCLES_COMMUNITY.md](CIRCLES_COMMUNITY.md)** — how findings become community memory
6. **[ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md)** — how it is built, in one page
7. **[ROADMAP.md](../ROADMAP.md)** — what is done and what comes next

To contribute or extend the product:

- Start with [FIRST_CONTRIBUTION.md](FIRST_CONTRIBUTION.md) and pick an approved `good first issue`.
- Keep ROADMAP.md updated when you complete roadmap items.
- Keep ARCHITECTURE.md in sync with infra/schema changes.
