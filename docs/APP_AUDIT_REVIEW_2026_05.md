# DevDeck — App Audit Review & Community Plan (May 2026)

> Date: 2026-05-23  
> Source audit: `docs/APP_AUDIT_2026_05.md`  
> Goal: verify that claimed P0/P1 work is not only present, but product-quality, then turn the social/community surface into a daily-use growth loop for developer communities.

## Executive Verdict

P0/P1 are mostly implemented, but they are not all equally “done done”. The core fixes compile and targeted tests pass, but the product strategy needs one correction: Circles should not be treated as a ghost feature anymore. It should become the community contribution loop, with progressive disclosure protecting solo users from noise.

## Verification Evidence

### P0.1 — Hide dead AI surfaces when provider is unavailable

**Verdict:** Done, acceptable.

Evidence:
- `packages/features/src/components/UnifiedCommandPalette.tsx` hides Ask AI when `ai_provider` is `disabled`, `heuristic`, or `local`.
- `packages/features/src/components/GlobalSearchModal.tsx` hides semantic/hybrid modes under the same condition and forces text search.
- Tests cover disabled, heuristic, and local provider states in:
  - `packages/features/src/components/UnifiedCommandPalette.test.tsx`
  - `packages/features/src/components/GlobalSearchModal.test.tsx`

Risk:
- The provider check is duplicated in two components. Extracting a shared `isInteractiveAiEnabled` helper would prevent drift.

### P0.2 — SyncStatusIndicator must not lie

**Verdict:** Done, product-honest for current backend state.

Evidence:
- `backend/internal/http/router.go` constructs `SystemConfigHandler` with `syncEnabled=false`.
- `packages/features/src/components/SyncStatusIndicator.tsx` renders “Cloud Mode” and does not poll local pending sync when sync is disabled.
- `packages/features/src/components/SyncStatusIndicator.test.tsx` verifies disabled sync ignores pending/offline states.

Risk:
- This is honest, but it also means offline-first remains disabled globally. The next step is not to show “Synced”; it is to graduate sync behind a real capability flag once local persistence is production-ready.

### P0.3 — Hide team/org features when user has no org

**Verdict:** Partially done.

Evidence:
- `packages/features/src/components/NavSidebar.tsx` hides the Team section unless `activeOrgId` exists.
- `packages/features/src/pages/TeamFeedPage.tsx` and `packages/features/src/pages/TeamReviewPage.tsx` guard direct route access with an org-required empty state.
- `packages/features/src/pages/SettingsPage.tsx` hides SAML, SCIM, and Org Insights unless `prefs.activeOrgId` exists.

Gap:
- Routes still exist for direct access, which is fine, but the empty states are generic. They should explain how to create/join an org when that becomes a real user path.

### P0.UX — Navigation and information architecture overhaul

**Verdict:** Implemented, but the OpenSpec task file is stale.

Evidence:
- `packages/features/src/components/AppShell.tsx` now uses a two-column shell with `NavSidebar` and simplified `Topbar`.
- `packages/features/src/components/NavSidebar.tsx` includes grouped Vault, Tools, Social, Team, and System navigation.
- `packages/features/src/components/Topbar.tsx` is simplified to search, capture, sync status, notifications, profile, and mobile menu.
- Targeted tests pass for `NavSidebar`, `Topbar`-adjacent surfaces, and key P0 components.

Gap:
- `openspec/changes/navigation-ux-overhaul/tasks.md` still has all tasks unchecked. This creates false evidence. Update it or archive the change.
- Desktop routes did not include Circles pages while Web routes did. This review added Desktop route parity in `apps/desktop/src/renderer/src/App.tsx`.
- P2 navigation entries are still incomplete: Runbooks, Explore/Trending, and Deck workflows are not first-class enough.

### P1.4 — Improve heuristic AI tagger

**Verdict:** Done, acceptable for current scope.

Evidence:
- `backend/internal/ai/heuristic.go` uses URL ecosystem tags, technology keyword mapping, metadata topics/language, `why_saved`, and item type fallbacks.
- `backend/internal/ai/heuristic_test.go` covers crates, Vitest/testing, GitHub metadata, CLI command extraction, shortcuts, and summaries.
- `go test ./internal/ai/...` passes.

Risk:
- Keyword matching uses substring checks, so short tokens like `ai`, `ts`, or `go` can over-match inside unrelated words. This is acceptable for MVP but should move to token-aware matching.

### P1.5 — Decide on Circles

**Verdict:** Documented, but under-leveraged.

Evidence:
- `ROADMAP.es.md` has “Ola 12 — Colaboración Social y Curación Pública” with Circles, Following, feed, notifications, discovery, ranking, and gamification.
- `ROADMAP.md` top-level checklist mentions collaborative Circles.
- Backend, API client, migrations, and frontend pages exist for Circles.

Gap:
- English roadmap lacks the same detailed Circles section visible in Spanish.
- Desktop route parity for Circles was added during this review.
- Circles currently look like a feature, not a habit loop. The product needs contribution prompts, group digest, and “share finding to Circle” as a primary flow.

### P1.6 — Refactor WorkbenchPage

**Verdict:** Done, good.

Evidence:
- `packages/features/src/pages/WorkbenchPage.tsx` is down to ~143 lines.
- Tools live in `packages/features/src/components/Workbench/`.
- `packages/features/src/pages/WorkbenchPage.test.tsx` passes.

Next improvement:
- Add “Share output to Circle” and “Save as community finding” for tools where output is useful to a group.

### P1.7 — Refactor ProfilePage

**Verdict:** Mostly done, but not fully simplified.

Evidence:
- `packages/features/src/pages/ProfilePage.tsx` is down to ~340 lines.
- Extracted components exist under `packages/features/src/components/Profile/`.

Gap:
- Profile still owns achievements/reputation calculation and several presentation concerns. Good enough for maintainability, but not yet a clean domain/presenter split.
- `CropModal.tsx` exists but is nested under `EditProfileModal`; that is fine, but tests should cover avatar/crop flow if profile becomes community-facing.

## Community Strategy: Make Circles the Daily Developer Loop

The product should position Circles as “private collective memory for dev communities”. The killer loop is:

1. A developer finds a repo, command, article, plugin, workflow, or Workbench result.
2. They capture it into their vault with `why_saved`.
3. DevDeck suggests a concise summary and tags.
4. They share it to a Circle with context.
5. The Circle receives a digest/feed of useful findings.
6. Other members save, fork, star, comment, or convert it into a runbook/deck.
7. High-signal findings become public/community showcase material.

This turns DevDeck from “my bookmark vault” into “our community’s reusable engineering memory”.

## Development Plan

### Phase 0 — Evidence cleanup and parity

- Update `openspec/changes/navigation-ux-overhaul/tasks.md` to match completed work or archive the change. **Done in this review; full workspace test + manual mobile drawer audit still remain.**
- Add Circles routes to `apps/desktop/src/renderer/src/App.tsx` for parity with Web. **Done in this review.**
- Align English roadmap with Spanish detailed Circles/social roadmap. **Started in this review by adding Wave 12 details to `ROADMAP.md`.**
- Add a short product note in docs explaining Circles as the community contribution model.

### Phase 1 — Make community sharing useful, not noisy

- Add direct “Share to Circle” affordances to Workbench outputs, runbooks, commands, cheatsheets, repos, and captured items.
- Require/encourage a short “why this matters” note when sharing to a Circle.
- Show shared context in Circle detail: who shared, why, tags, source, and save/fork actions.
- Keep Social nav visible as a strategic entry point, but add empty states that guide the user to create/join a Circle instead of showing dead lists.

### Phase 2 — Circle feed and digest

- Create a Circle activity feed combining shared items, comments/reactions, decks, and runbooks.
- Add weekly Circle digest notifications once notification generation is reliable.
- Add filters by tag, item type, and contributor.
- Make “best finds this week” easy to export/share externally.

### Phase 3 — Contribution and reputation with signal

- Score contributions by saves/forks/usefulness, not raw posting volume.
- Add lightweight reactions: useful, tried, needs-review.
- Add member expertise badges based on accepted/high-signal contributions.
- Surface trusted contributors in public profiles and launch/community pages.

### Phase 4 — Public visibility loop

- Let Circles publish selected findings/decks publicly.
- Add SEO-friendly public pages for curated community collections.
- Build launch assets around real community use: “what this Circle found this week”.
- Keep enterprise/org features separate from community Circles; do not confuse team compliance with community discovery.

## Immediate Next PR Recommendation

Start with a small, reviewable PR:

1. Add the Circles/community product note in English and Spanish docs.
2. Add/adjust tests for Desktop route parity and NavSidebar social behavior.
3. Complete manual responsive drawer audit.
4. Decide whether Runbooks, Explore/Trending, and Decks need first-class sidebar entries or contextual entry points.

This is the right foundation before adding more social behavior. Architecture first, velocity second.

## Verified Commands

- `go test ./internal/ai/...` — passed after running outside sandbox because Go build cache was blocked.
- `./node_modules/.bin/tsc --noEmit -p packages/features/tsconfig.json` — passed.
- `./node_modules/.bin/tsc --noEmit -p apps/desktop/tsconfig.json` — passed after adding Desktop Circles routes.
- `./node_modules/.bin/vitest run src/components/NavSidebar.test.tsx src/components/SyncStatusIndicator.test.tsx src/components/UnifiedCommandPalette.test.tsx src/components/GlobalSearchModal.test.tsx src/pages/WorkbenchPage.test.tsx` — 5 files / 30 tests passed.

## Current Working Tree Note

There was already an unstaged change in `apps/desktop/src/main/index.ts` adding `webSecurity: !process.env.ELECTRON_RENDERER_URL`. This review did not modify that line.
