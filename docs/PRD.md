# Product Requirements Document (PRD)

**Project:** DevDeck.ai  
**Version:** 1.0.0 (Stable)  
**Status:** Released  
**Owner:** tfurt  
**Last Updated:** May 2026

[Leer en español](PRD.es.md)

---

## 0. Name and Domain

**DevDeck** is the definitive name. "Deck" evokes a personal deck of tools: organized, extensible, and curated by the developer.

**Domain:** [devdeck.ai](https://devdeck.ai)

| Subdomain | Purpose |
|------------|-----------|
| `devdeck.ai` | Landing page + marketing + downloads |
| `app.devdeck.ai` | Web app (React 18 — shared pages with desktop via monorepo) |
| `api.devdeck.ai` | REST Backend + sync engine |
| `docs.devdeck.ai` | Documentation |
| `download.devdeck.ai` | Desktop app downloads |

The `.ai` domain is **not decorative**. DevDeck uses AI to classify, summarize, retrieve by intent, and suggest related items — making everything you save **findable when you need it**. Without these features, the domain wouldn't be justified.

---

## 1. Vision

> **DevDeck is your AI-assisted external memory for development work.**

An **offline-first, multi-user, and multi-platform** app to save, organize, and rediscover everything useful a developer finds: repos, CLIs, plugins, cheatsheets, shortcuts, snippets, agents, prompts, and workflows. Powered by AI that classifies, summarizes, and retrieves by intent — not just exact tags.

---

## 5. Roadmap and Status

### ✅ All 17 Waves Complete

DevDeck has transitioned from a simple bookmark manager to a **Knowledge Operating System** for developers.

- **Wave 1-4:** Core Foundation and Web/Desktop parity.
- **Wave 5-6:** Polymorphic Items and Semantic Brain.
- **Wave 7-12:** Sync, Collaboration, and Social Discovery.
- **Wave 13-16:** Global Scalability, Enterprise Identity, and Autonomous Agents.
- **Wave 17:** Public Release and Onboarding.

---

## 6. Core Pillars (v1.0.0)

### 6.1 Autonomous AI Agents
Multi-step orchestration with tool-calling capabilities. Agents can search your vault, create items, and propose terminal commands for **Hybrid Local Execution** (secure "Human-in-the-loop" model).

### 6.2 Team Intelligence
Collective discovery and adoption analytics for organizations. Enterprise-ready features including **SAML 2.0 SSO**, **SCIM 2.0 Provisioning**, and **RBAC**.

### 6.3 Global Scalability
Multi-region active-active synchronization with regional read replicas. Conflict-free concurrent editing using **CRDTs (Yjs)**.

### 6.4 Offline-First Resilience
Permanent local storage using **SQLite/OPFS** on Web and native storage on Desktop. Full bidirectional synchronization.

---

## 7. Success Metrics (v1.0.0)

- **Retention:** Saving at least 10 items per week.
- **Automation:** Agent performing at least 5 tool calls per user/day.
- **Teams:** Reducing "knowledge silos" by surfacing trending topics within organizations.

---

*Mission Accomplished: May 2026 (v1.0.0 Stable)*
