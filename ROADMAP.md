# DevDeck.ai Roadmap

This document outlines the vision and development stages for **DevDeck.ai**. We worked in "Waves" (Olas) to progressively build the core infrastructure, the capture network, and the collective AI intelligence.

[Leer en español](ROADMAP.es.md)

---

## Product Direction

DevDeck is moving from external memory toward a **Developer Workbench**: saved developer knowledge that can be retrieved by intent and reused as commands, snippets, requests, runbooks, and local utility workflows.

See [docs/DEV_WORKBENCH.md](docs/DEV_WORKBENCH.md) for the current product proposal.

---

## ✅ Waves 1–4: Core Foundation

- [x] **Wave 1:** Core Go API, Auth (GitHub), and basic Items CRUD.
- [x] **Wave 2:** Enrichment engine (Open Graph metadata, screenshot capture).
- [x] **Wave 3:** Frontend redesign (Neo-brutalist / Dark mode).
- [x] **Wave 4:** Monorepo transition (pnpm workspaces) and shared components.

## ✅ Wave 5: General Items + Real AI

- [x] **Phase 18:** Polymorphic Items (CLIs, Snippets, Prompts, Workflows).
- [x] **Phase 19:** AI Semantic Brain (Embeddings, Semantic Search, RAG).

## ✅ Wave 6: Offline-first + Sync

- [x] **Phase 20:** Offline-first Architecture (Local SQLite, OPFS, Atomic Sync).
- [x] **Phase 21:** Public Decks & Community sharing.

## Waves 7–12: Advanced Features

- [x] **Wave 7:** Versioning and Multi-device management.
- [x] **Wave 8:** Smart Notifications, Social Following, and collaborative Circles (share repos, tools, bash, etc. with friends).
- [x] **Wave 9:** Real-time Collaboration (Yjs, WebSockets, CRDTs).
- [x] **Wave 10:** Plugin SDK and Outbound Webhooks (HMAC signatures).
- [x] **Wave 11:** Mobile Bridge (PWA Share Target, Progressive Sync).
- [x] **Wave 12:** Social Gamification and Reputation System.

## Waves 13–16: Enterprise & Agents

- [x] **Wave 13:** Global Scalability (Read Replicas, Multi-region Sync).
- [x] **Wave 14:** Enterprise Core (SAML 2.0 SSO, SCIM 2.0 Provisioning).
- [x] **Wave 15:** Collective Intelligence (Team Insights, Trending Tags).
- [x] **Wave 16:** AI Agents (Autonomous Tool Calling, Hybrid Local Execution).

## Wave 17: Public Launch

- [x] **Phase 51:** Onboarding Wizard and Starter Kits.
- [x] **Phase 52:** v1.0 Landing Page and Documentation.
- [x] **Phase 53:** Production Hardening, Team Alerts (Webhooks), and Stable v1.0 Release.

---

## Tech Stack (v1.0)

| Layer | Technology |
|------|-----------|
| **Monorepo** | pnpm workspaces (100% shared domain logic) |
| **Desktop** | Electron 32 + Native Shell support + safeStorage |
| **Web** | Vite + React 18 + PWA (Workbox) + OPFS |
| **Backend** | Go 1.22+ with Multi-Pool architecture (Reader/Writer) |
| **Database** | Postgres 16 + pgvector + Regional Replicas |
| **AI** | Autonomous Agents (SSE + Tool Calling) + OpenAI/Ollama |
| **Identity** | SAML 2.0 (SSO) + SCIM 2.0 + RBAC |
| **Sync** | Bidirectional Atomic Sync with LWW + CRDTs |
| **Styling** | Tailwind CSS (Neo-Brutalist design system) |
| **Real-time** | Yjs + WebSockets |

---

*Last updated: May 2026*
