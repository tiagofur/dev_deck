# ADR 0003: Monorepo with pnpm Workspaces

**Status:** DECIDED
**Date:** April 2026

[Leer en español](0003-monorepo-pnpm-workspaces.es.md)

---

## Context
The project was originally split into separate repositories (Desktop and Backend). This made it hard to share logic and maintain UI consistency.

## Decision
Consolidate all components into a single repository using **pnpm workspaces**.

### Rationale
- **Code Sharing:** 100% of the domain logic (pages, components, API hooks) is shared between Web and Desktop via `@devdeck/features`.
- **Atomic Commits:** A single PR can update the API, the client SDK, and the UI.
- **Dependency Management:** pnpm is fast and handles symlinking efficiently.

## Structure
```
dev_deck/
├── apps/
│   ├── desktop/ # Electron
│   └── web/     # Vite
├── packages/
│   ├── features/ # Shared Pages & Domain Logic
│   ├── ui/       # Shared Design System
│   └── api-client/ # Shared SDK & Hooks
└── backend/      # Go API
```

## Consequences
- **Positive:** Massive reduction in duplicated code, unified design system.
- **Negative:** Slightly more complex initial setup for contributors.
