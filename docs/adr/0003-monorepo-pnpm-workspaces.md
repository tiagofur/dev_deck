# ADR 0003: Monorepo with pnpm workspaces & React Migration

**Status:** Accepted  
**Date:** April 2026  
**Context:** Wave 4.5 (Hardening)

[Leer en español](0003-monorepo-pnpm-workspaces.es.md)

---

## Context and Problem Statement

Originally, DevDeck had two separate repositories for the frontend:
1.  **Desktop App**: Built with Electron + React 18.
2.  **Web App**: Built with Vue 3 + Vite.

As we reached Wave 4.5, the "feature drift" became unsustainable. Every new feature (like Cheatsheets or the Mascot animations) had to be implemented twice. Styles were duplicated, and the shared design system was just a CSS file copied back and forth.

We needed a way to:
- Share 100% of the domain logic and components.
- Maintain a single Design System.
- Simplify the deployment and release process.

## Considered Options

1.  **Keep separate repos but use a shared UI library (NPM package)**: 
    - **Pros**: Kept Vue and React separate.
    - **Cons**: High friction for development (link/publish cycle). Vue/React compatibility for complex components (like the Mascot) was a nightmare.
2.  **Monorepo with Vue and React**:
    - **Pros**: Centralized code.
    - **Cons**: Still needed dual implementation for every page. No real code reuse at the component level.
3.  **Monorepo + React Migration for Web (Selected)**: Migrate the Web app from Vue 3 to React 18 and use **pnpm workspaces**.

## Decision Outcome

We chose **Option 3**. We unified the stack on **React 18** and moved everything into a single monorepo managed by **pnpm workspaces**.

### New Structure

```
dev_deck/
├── apps/
│   ├── desktop/      # Electron (React)
│   └── web/          # Vite (React)
├── packages/
│   ├── ui/           # Design System (Tailwind + Framer Motion)
│   ├── api-client/   # SDK + TanStack Query hooks
│   └── features/     # SHARED PAGES AND COMPONENTS
```

## Consequences

- **Pros**:
    - **100% Feature Parity**: A change in `@devdeck/features` immediately updates both the Web and Desktop apps.
    - **Single Source of Truth**: The design system (`@devdeck/ui`) and API logic (`@devdeck/api-client`) are centralized.
    - **Developer Velocity**: No more double implementation. Testing is unified.
- **Cons**:
    - **Migration Cost**: The Vue 3 codebase was abandoned (archived).
    - **Bundle Size**: Desktop app (Electron) is still heavy, but the development benefit outweighs the size concern for this project.

---

*Part of the DevDeck Architecture Decision Records*
