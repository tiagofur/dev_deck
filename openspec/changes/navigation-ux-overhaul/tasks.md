# Tasks: Navigation & Information Architecture Overhaul (P0.UX)

## Phase 1: Global Shell & Component Infrastructure
- [x] **Task 1.1:** Create new `NavSidebar.tsx` in `packages/features/src/components/` with complete link list, icons, active tab styling, and progressive disclosure (Team hidden without an active organization; Social intentionally remains visible as the Circles/community entry point).
- [x] **Task 1.2:** Refactor `AppShell.tsx` in `packages/features/src/components/` to implement two-column layout using Tailwind flex/grid, and integrate `NavSidebar` (with mobile drawer state).
- [x] **Task 1.3:** Simplify `Topbar.tsx` in `packages/features/src/components/` to remove the redundant primary/secondary nav links and include the mobile menu toggle callback.

## Phase 2: Page Integrations & Layout Unification
- [x] **Task 2.1:** Refactor `HomePage.tsx` (Repos list) to remove its manual `Topbar`/`Sidebar` mounts and wrap the entire screen inside the new `<AppShell>`.
- [x] **Task 2.2:** Update `ItemsPage.tsx` to ensure layout structure sits perfectly inside the new two-column `AppShell`.
- [x] **Task 2.3:** Refactor `CheatsheetsListPage.tsx` and `CheatsheetDetailPage.tsx` to wrap inside `<AppShell>`.
- [x] **Task 2.4:** Refactor `DiscoveryPage.tsx` to integrate inside `<AppShell>` (removing its manual header container).
- [x] **Task 2.5:** Wrap other authenticated pages (`SettingsPage.tsx`, `ProfilePage.tsx`, `AdminDashboardPage.tsx`) cleanly under `<AppShell>`.

## Phase 3: Testing & Quality Assurance
- [x] **Task 3.1:** Run typescript type checking: `./node_modules/.bin/tsc --noEmit -p packages/features/tsconfig.json` passed on 2026-05-23.
- [/] **Task 3.2:** Execute test suites: targeted feature tests passed on 2026-05-23 (`NavSidebar`, `SyncStatusIndicator`, `UnifiedCommandPalette`, `GlobalSearchModal`, `WorkbenchPage`). Full workspace `pnpm test` still needs a clean pnpm/corepack run.
- [ ] **Task 3.3:** Manually audit responsive drawer sliding on mobile viewports.
