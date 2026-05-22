# Proposal: Core Navigation & Information Architecture Overhaul (P0.UX)

## Intent
Redesign the core navigation of DevDeck to reduce cognitive load and simplify the user interface. Currently, DevDeck exposes ~35 features directly to all users via an overloaded Topbar. The overhaul will introduce a persistent left navigation sidebar (`NavSidebar`) with progressive disclosure (hiding social/team features for individual users) and simplify the Topbar to hold only contextual actions.

## Scope

### In Scope
- Create a new persistent left-side navigation sidebar component (`NavSidebar`).
- Refactor `AppShell.tsx` to adopt a two-column sidebar layout.
- Simplify `Topbar.tsx` to contain only central/global contextual elements.
- Refactor pages (`HomePage`, `ItemsPage`, `DiscoveryPage`, `SettingsPage`, `CheatsheetsListPage`, etc.) to wrap properly inside the new layout.
- Implement progressive disclosure in navigation based on active organization and social context.

### Out of Scope
- Visual aesthetic modifications (neo-brutalist Tailwind styling remains unchanged).
- Modifying business logic or functional capabilities of individual pages.
- Restructuring the contents of individual pages (unless necessary for layout wrapper adjustments).

## Capabilities

### New Capabilities
- None (pure layout reorganization).

### Modified Capabilities
- **Navigation & Shell:** Persistently displays primary navigation links on desktop, while hiding/collapsing advanced social or team views when not applicable to reduce cognitive load.

## Approach
1. **NavSidebar Creation:** Build `NavSidebar.tsx` displaying:
   - Vault (Items, Repos, Cheatsheets)
   - Tools (Workbench, Discovery)
   - Social (Circles, Following - collapsed/hidden if empty)
   - Team (Feed, Review - visible only if `activeOrgId` is set)
   - System (Settings, Profile, Admin)
2. **AppShell Restructure:** Update `AppShell` with a modern grid/flex two-column wrapper:
   - Left: `NavSidebar`
   - Right: Flex flex-col container holding `Topbar` and child contents.
3. **Topbar Cleanup:** Remove inline links from `Topbar` and center the command palette search input.
4. **Layout Unification:** Wrap all page components consistently with `<AppShell>`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/features/src/components/NavSidebar.tsx` | New | Global navigation sidebar |
| `packages/features/src/components/AppShell.tsx` | Modified | Core layout wrapper structure |
| `packages/features/src/components/Topbar.tsx` | Modified | Cleanup top actions |
| `packages/features/src/pages/HomePage.tsx` | Modified | Replace legacy topbar/sidebar combination |
| `packages/features/src/pages/ItemsPage.tsx` | Modified | Wrap with unified layout |
| `packages/features/src/pages/CheatsheetsListPage.tsx` | Modified | Wrap with unified layout |
| `packages/features/src/pages/DiscoveryPage.tsx` | Modified | Wrap with unified layout |
| `packages/features/src/pages/SettingsPage.tsx` | Modified | Wrap with unified layout |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Layout breakages in highly custom pages | Medium | Test each screen manually at different viewport sizes |
| Duplicate topbar/sidebar keyboard listeners | Low | Consolidated global shortcuts are already handled in root `App.tsx` |

## Rollback Plan
- Revert commits in git: `git reset --hard HEAD~1` (or use git checkout).

## Success Criteria
- [ ] Unified `AppShell` with persistent `NavSidebar` is active across all screens.
- [ ] Overloaded links in `Topbar` are removed.
- [ ] Team features are hidden if the user does not belong to an active organization.
- [ ] All pages layout correctly on desktop and mobile viewports.
