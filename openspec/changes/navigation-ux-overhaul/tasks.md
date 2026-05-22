# Tasks: Navigation & Information Architecture Overhaul (P0.UX)

## Phase 1: Global Shell & Component Infrastructure
- [ ] **Task 1.1:** Create new `NavSidebar.tsx` in `packages/features/src/components/` with complete link list, icons, active tab styling, and progressive disclosure (hiding social/team options by default).
- [ ] **Task 1.2:** Refactor `AppShell.tsx` in `packages/features/src/components/` to implement two-column layout using Tailwind flex/grid, and integrate `NavSidebar` (with mobile drawer state).
- [ ] **Task 1.3:** Simplify `Topbar.tsx` in `packages/features/src/components/` to remove the redundant primary/secondary nav links and include the mobile menu toggle callback.

## Phase 2: Page Integrations & Layout Unification
- [ ] **Task 2.1:** Refactor `HomePage.tsx` (Repos list) to remove its manual `Topbar`/`Sidebar` mounts and wrap the entire screen inside the new `<AppShell>`.
- [ ] **Task 2.2:** Update `ItemsPage.tsx` to ensure layout structure sits perfectly inside the new two-column `AppShell`.
- [ ] **Task 2.3:** Refactor `CheatsheetsListPage.tsx` and `CheatsheetDetailPage.tsx` to wrap inside `<AppShell>`.
- [ ] **Task 2.4:** Refactor `DiscoveryPage.tsx` to integrate inside `<AppShell>` (removing its manual header container).
- [ ] **Task 2.5:** Wrap other authenticated pages (`SettingsPage.tsx`, `ProfilePage.tsx`, `AdminDashboardPage.tsx`) cleanly under `<AppShell>`.

## Phase 3: Testing & Quality Assurance
- [ ] **Task 3.1:** Run typescript type checking: `pnpm typecheck` to guarantee all layout/page props are valid.
- [ ] **Task 3.2:** Execute test suites: `pnpm test` and fix any broken component rendering or shell mock configurations.
- [ ] **Task 3.3:** Manually audit responsive drawer sliding on mobile viewports.
