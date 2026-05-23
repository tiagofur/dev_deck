# DevDeck — App Audit (May 2026)

> **Date:** 2026-05-21
> **Scope:** Full feature inventory, gap analysis, and UX improvement recommendations.
> **Goal:** Balance feature count vs. real user utility. No new features — improve what exists.

---

## 1. Feature Inventory — What Exists Today

### ✅ Fully Functional (Core, tested, complete UI)

| Feature | Backend | Frontend | Tests | Notes |
|---------|---------|----------|-------|-------|
| **Repos CRUD** | ✅ handlers + store | ✅ HomePage, RepoDetailPage | ✅ | Foundational. Solid. |
| **GitHub Enricher** | ✅ stars, lang, avatar, description, topics | ✅ RepoCard shows metadata | ✅ | Refresh cron works. |
| **Commands per repo** | ✅ CRUD + reorder + batch | ✅ CommandsList + dnd-kit | ✅ | Includes package.json script import. |
| **Cheatsheets** | ✅ CRUD + entries + search + seed (10 included) | ✅ CheatsheetsListPage, CheatsheetDetailPage | ✅ | Very solid. Explore, fork, star, export, badge, SVG card. |
| **Polymorphic Items** | ✅ 11 types, capture endpoint, CRUD | ✅ ItemsPage + ItemDetailPage + ItemCard | ✅ | Unified table works. |
| **Capture Modal** | ✅ POST /api/items/capture | ✅ CaptureModal, type detection, dedupe | ✅ | Complete capture UX. |
| **Global Search** | ✅ GET /api/search cross-entity | ✅ UnifiedCommandPalette (Ctrl+K) | ✅ | Textual search functional. |
| **Auth JWT + GitHub OAuth** | ✅ login/callback/refresh/logout/me + multi-provider | ✅ LoginPage, RegisterPage, AuthCallback, ForgotPassword | ✅ | Local password + GitHub OAuth. |
| **Discovery mode** | ✅ GET /api/discovery/next | ✅ DiscoveryPage with SwipeCard | — | Works but questionable engagement. |
| **Mascot Snarkel** | ✅ GET /api/stats (mood) | ✅ 5 moods, rioplatense phrases, framer-motion | — | Product identity. Keep. |
| **Settings** | — | ✅ SettingsPage (26KB, substantial) | — | Extensive configuration surface. |
| **Paste interceptor** | — (client-only) | ✅ PasteInterceptor (Electron) | ✅ | Desktop only. |
| **Shortcuts modal** | — | ✅ ShortcutsModal with documented keys | — | Good UX. |
| **i18n** | — | ✅ `@devdeck/i18n` package | — | Translations used throughout the app. |
| **Toaster + Confirm** | — | ✅ singletons in `@devdeck/ui` | — | UX infrastructure. |

---

### 🟡 Programmed but Incomplete or Shallow

Code exists (backend + frontend) but depth/utility for the 90% user is questionable, or it needs polish.

| Feature | Backend | Frontend | Real State | Verdict |
|---------|---------|----------|-------------|---------|
| **AI Auto-tagging + Summary** | ✅ heuristic + OpenAI + Ollama + DeepSeek + Qwen + LMStudio (6 providers) | ✅ ItemCard shows `ai_summary` and `ai_tags` | MVP works but: how many users will configure an AI provider? Heuristic is weak. | **Improve heuristic** — it's what 90% who DON'T configure AI will use. |
| **Ask DevDeck (RAG)** | ✅ POST /api/ask | ✅ AskResults component | Requires embeddings + configured provider. Without it, dead feature. | **Hide if no provider** — don't show a dead button. |
| **Agent Chat** | ✅ POST /api/agent/chat | ✅ AgentChat.tsx (9KB) | Requires AI provider. | **Same logic: hide if no provider.** |
| **Semantic Search** | ✅ migration 0012, embeddings.go | ✅ toggle in search | Requires pgvector + provider. Fallback to textual exists. | OK — fallback exists. But toggle shouldn't show without embeddings. |
| **Offline Sync** | ✅ sync handlers, delta, batch, migrations 0013-0014, 0020-0021 | ✅ SyncStatusIndicator + sync engine + queue | Engine exists but: is it active? Does local-db actually persist? `schema.ts` is 2KB — a skeleton. | **Validate it works end-to-end** before showing the indicator. |
| **Shareable Decks** | ✅ CRUD + public + star + import (migrations 0015) | ✅ PublicDeckPage, Deck components | Works, but: who uses it at this stage? Social feature without user base. | **Keep but don't prioritize.** Code is there, doesn't hurt. |
| **Public Profile** | ✅ GET /users/:username/public + decks | ✅ PublicProfilePage, ProfilePage (42KB!) | ProfilePage is ENORMOUS (42KB). Too much surface for current utility. | **Simplify.** Public profile needs less than it has. |
| **Circles** | ✅ CRUD + join + share + members (migration 0041) | ✅ CirclesPage, CircleDetailPage, CircleJoinPage | Complete social/collaborative feature. NOT in roadmap. | **Ghost feature.** Not documented in any wave. Evaluate if it makes sense now. |
| **Following/Social feed** | ✅ follow/unfollow + feed (migration 0032) | ✅ FollowingFeedPage | Social feature. Same problem as Decks: no user base. | **Keep, don't make prominent.** |
| **Team Feed** | ✅ orgs feed endpoint | ✅ TeamFeedPage | Requires configured organization. | **Only visible if user has org.** |
| **Team Review** | — (seems client-only) | ✅ TeamReviewPage + TeamReviewCard | What does it review exactly? Orphan concept without configured team. | **Hide if no org.** |
| **Runbooks** | ✅ CRUD + steps + reorder (migration 0023) | ✅ in ItemDetailPage (tabs) | Solid backend. Lives inside ItemDetail as a tab. | **Good feature, needs visibility.** |
| **Workbench** | — (client-only utils) | ✅ WorkbenchPage (46KB!) with 12 tools | 12 local tools: JSON, JWT, Base64, URL, UUID, Timestamp, Hash, Regex, Secrets, API tester, Project Context, Aliases. Each with Save to vault. | **Star feature** but 46KB in one file is a code smell. |
| **Notifications** | ✅ CRUD + count (migration 0026) | ✅ NotificationCenter (bell icon) | Backend generates notifications. For what events? Seems enrichment_done + weekly_digest. | **OK, but is there a digest cron?** If nothing generates, bell is always empty. |
| **Onboarding** | ✅ kits + install + complete | ✅ OnboardingPage, OnboardingChecklist | Onboarding flow with wizard and starter kits. | **Good feature.** Critical for retention. |
| **Admin Dashboard** | ✅ admin users/waitlist/invites | ✅ AdminDashboardPage | Admin only. Functional. | **Necessary.** Admin-only visibility — OK. |
| **Plugin Gallery** | ✅ GET /plugins/featured + enrichers + webhooks | ✅ PluginGallery | Static plugin catalog (enricher and webhook templates). | **Useful but how many plugins?** If 4, the gallery is overkill. |
| **Webhooks** | ✅ CRUD (migration 0031) | ✅ WebhookManager | Create webhooks for events. Power user feature. | **Keep, don't make prominent.** |
| **API Keys** | ✅ CRUD (migration 0029) | — (probably in Settings) | API keys for programmatic access. | **Power user. OK in Settings.** |
| **Workspace Switcher** | — | ✅ WorkspaceSwitcher component | When is it used? Switching between orgs? | **Validate real usage.** |
| **Custom Enrichers** | ✅ CRUD (migration 0030) | — (via PluginGallery) | Custom enrichers by URL pattern. | **Power user only.** |
| **SAML SSO** | ✅ login/metadata/ACS (migration 0035) | — (LoginStep1 in auth flow) | Enterprise feature. Are there enterprise users? | **Premature for current stage.** |
| **SCIM 2.0** | ✅ /scim/v2 endpoints (migration 0036) | — | Automatic user provisioning. Enterprise. | **Premature.** |
| **Realtime (WebSocket)** | ✅ realtime handler | ✅ realtime-client package | For what? Collaborative editing? Roadmap says CRDTs with Yjs for Wave 9. | **Premature skeleton.** |
| **Reputation** | ✅ store (migration 0033) | — | Points system. Visible anywhere? | **Premature.** Without user base, gamification is meaningless. |
| **Organizations** | ✅ CRUD + members + insights + SCIM token (migration 0027) | ✅ OrgInsights component | Multi-org support. Enterprise feature. | **Premature for current stage, but backend is there.** |
| **Invites/Waitlist** | ✅ CRUD (migration 0025) | ✅ WaitlistPage | Controlled registration. | **Useful for controlled launch.** |
| **Explore/Trending** | ✅ discovery/trending + leaderboard | ✅ ExplorePage | Community discovery. Needs content. | **Empty without community.** |
| **Landing Page** | — | ✅ LandingPage (22KB) | Landing inside the app. | **Should be standalone, not embedded.** |

---

## 2. Documented in Roadmap but NOT Implemented

| Feature | Wave | Notes |
|---------|------|-------|
| **Offline-first local SQLite** | Wave 6, Phase 21 | `local-db/schema.ts` exists (2KB skeleton), sync engine has queue. But NO real SQLite or OPFS. Sync indicator shows status but doesn't persist locally. |
| **Multi-device conflict resolution** | Wave 6, Phase 22 | Version + device migrations exist, but field-level LWW is not implemented. |
| **Collaborative editing CRDTs (Yjs)** | Wave 9, Phase 34 | `realtime-client` package exists as skeleton. No Yjs. |
| **Weekly digest (AI cron)** | Wave 8, Phase 32 | Backend has notification handler, but no digest cron. Bell may always be empty. |
| **Local command execution** | Wave 8, Phase 30 | Runbooks exist, but don't execute anything. Roadmap says "IPC bridge in Electron". Not implemented. |
| **PWA with Service Workers** | Wave 11, Phase 39 | No service worker configured. |
| **Mobile Share Target** | Wave 11, Phase 39 | Not implemented. |
| **Complete Starter Kit gallery** | Wave 17, Phase 51 | Onboarding has kits, but how many? Needs content. |

---

## 3. User Impact Classification

### 🟢 CORE — 90% of users need this daily

1. Items (capture + list + detail)
2. Repos + Enricher
3. Commands per repo
4. Cheatsheets
5. Global Search (Ctrl+K)
6. Capture Modal
7. Settings
8. Auth (login/register)
9. Workbench (12 dev tools)
10. Mascot Snarkel
11. Keyboard shortcuts

### 🔵 POWER USER — 30% uses it, but it matters A LOT to them

12. AI auto-tagging/summary (heuristic needs improvement)
13. Discovery mode (questionable engagement)
14. Runbooks (good concept, low visibility)
15. API Keys (needed for CLI/extension advanced usage)
16. Webhooks (automation)
17. Plugin Gallery (depends on catalog size)
18. Shareable Decks (useful when community exists)
19. Onboarding wizard (critical for retention)

### 🟣 ENTERPRISE / SOCIAL — Premature without user base

20. Circles (NOT in roadmap — ghost feature)
21. Organizations + Insights
22. SAML SSO
23. SCIM 2.0
24. Team Feed / Team Review (requires org)
25. Following Feed
26. Explore/Trending/Leaderboard (empty without community)
27. Public Profile
28. Reputation/Gamification
29. Realtime WebSocket skeleton

### 🔴 NOISE — Features that add complexity without clear return

30. Ask DevDeck without configured provider → dead button
31. Agent Chat without configured provider → dead button
32. Semantic search toggle without embeddings → dead toggle
33. Sync indicator without real offline-first → misleading indicator
34. Embedded Landing Page → should be external
35. CaptureSharePage → 1.6KB skeleton, seems unused

---

## 4. Prioritized Recommendations (no new features)

### 🔥 P0 — Fix NOW (Features that lie to the user)

| # | Improvement | Why |
|---|-------------|-----|
| 1 | **Hide Ask/Agent/Semantic toggle when no AI provider is configured** | Dead buttons = frustration. Feature flags based on `AI_PROVIDER !== disabled`. |
| 2 | **Validate SyncStatusIndicator doesn't lie** | If local-db doesn't actually persist, the "Synced" indicator is false. Hide or show "Cloud only" honestly. |
| 3 | **Hide Team Feed/Team Review/Org Insights if user has no org** | Routes leading to empty screens without context. |

### ⚡ P1 — Improve what already works

| # | Improvement | Why |
|---|-------------|-----|
| 4 | **Improve AI tagging heuristic** | Default provider. If it generates bad tags, the entire feature looks broken. Invest in smarter rules based on URL patterns, content, and item type. |
| 5 | **Circles: document in roadmap or deprecate** | Ghost feature — complete code (backend + frontend + migration + i18n) but not in any roadmap wave. If keeping, document it. If not, mark as experimental. |
| 6 | **WorkbenchPage: extract tools to separate files** | 46KB / 1313 lines in one file. Each tool should be its own component. Improves maintainability without changing functionality. |
| 7 | **ProfilePage: simplify** | 42KB is ENORMOUS for a profile. Likely contains editing, decks, stats, social — all in one. Separate into tabs/sub-components. |

### 🎯 P2 — Visibility and discoverability

| # | Improvement | Why |
|---|-------------|-----|
| 8 | **Make Runbooks more visible** | Complete backend, but hidden as a tab inside ItemDetail. Should have its own navigation entry or at least be mentioned in onboarding. |
| 9 | **Sidebar navigation review** | Current sidebar filters by tags/langs. But the app has: Items, Repos, Cheatsheets, Workbench, Discovery, Circles, Decks, Profile, Settings, Admin. How does the user navigate between all these sections? Verify Topbar covers everything. |
| 10 | **NotificationCenter: ensure it generates content** | If the digest cron doesn't exist and enrichment notification is rare, the bell is always empty. That feels like a "broken feature". |

---

## 5. Executive Summary

| Metric | Value |
|--------|-------|
| **CORE features working** | 11 |
| **POWER USER features** | 8 |
| **ENTERPRISE/SOCIAL premature features** | 10 |
| **Noisy features (dead buttons / false data)** | ~5 |
| **DB Migrations** | 41 |
| **Backend handlers** | 36 files |
| **Frontend pages** | 29 files |
| **Frontend components** | 31+ files |

### The Balance

The app has **~35 visible features**. For a new user, that's overwhelming.

The **11 core features are excellent**. The capture → organize → search → workbench loop is solid and differentiating.

The problem isn't that there are too many features — it's that **enterprise/social features are visible to everyone**. An individual user sees Team Feed, Circles, Following, Org Insights, SAML — none of which serve them. This dilutes the value proposition.

### Main Recommendation

Apply **progressive disclosure**. Enterprise/social features should be visible ONLY when the user has an org/team. AI features should be visible ONLY when a provider is configured. This reduces the perceived surface from ~35 to ~15 features — exactly what 90% of users need.

---

## 6. Action Items for Tomorrow

- [x] P0.1 — Feature flags: hide AI features when `AI_PROVIDER === disabled`
- [x] P0.2 — SyncStatusIndicator: validate or replace with honest "Cloud only" state
- [x] P0.3 — Conditional nav: hide Team/Org routes for users without org
- [ ] P1.4 — Improve heuristic AI tagger (`internal/ai/heuristic.go`)
- [ ] P1.5 — Decide on Circles: add to roadmap or mark experimental
- [x] P1.6 — Refactor WorkbenchPage into per-tool components
- [/] P1.7 — Refactor ProfilePage into sub-components
- [ ] P2.8 — Add Runbooks entry point in sidebar or Topbar
- [ ] P2.9 — Navigation audit: ensure all sections are reachable
- [ ] P2.10 — Verify NotificationCenter actually receives events
- [ ] **P0.UX — UX Overhaul: redesign navigation and information architecture** (see §7)

---

## 7. UX Overhaul — Critical

> **Visual design is excellent. User experience is not.**

The neo-brutalist aesthetic, color palette, typography, and animations are strong — that's NOT the problem. The problem is **information architecture and navigation**.

### What's wrong

| Problem | Where | Impact |
|---------|-------|--------|
| **Topbar is overloaded** | `Topbar.tsx` (8.7KB) | Too many actions competing for attention. A new user can't tell what's primary vs. secondary. |
| **No clear navigation hierarchy** | Topbar + Sidebar + page-level nav | The app has Items, Repos, Cheatsheets, Workbench, Discovery, Circles, Decks, Following, Feed, Profile, Settings, Admin — but there's no obvious grouping or priority. |
| **Sidebar only filters, doesn't navigate** | `Sidebar.tsx` (5.1KB) | Sidebar shows tags and languages, but NOT sections. User has to rely on Topbar for ALL navigation. |
| **Features for different audiences are mixed** | Everywhere | Individual user sees Team Feed, Circles, Org Insights next to their personal Items. No context separation. |
| **AppShell is minimal** | `AppShell.tsx` (1.2KB) | The shell that wraps all pages is just Topbar + content. No persistent sidebar navigation, no breadcrumbs, no section awareness. |

### Diagnosis

The root cause is that **navigation was built incrementally** — each wave added buttons to the Topbar. At 11 features it was fine. At 35 features, it's chaos.

This is an **information architecture** problem, not a visual design problem:
- Good IA with bad visuals → usable but ugly
- Bad IA with good visuals → pretty but confusing ← **DevDeck is here**

### Recommended approach

1. **Redesign AppShell** — persistent left sidebar for primary navigation (sections), Topbar for contextual actions (search, capture, notifications, profile)
2. **Group navigation into sections:**
   - **Vault** (primary): Items, Repos, Cheatsheets, Capture
   - **Tools**: Workbench, Discovery
   - **Social** (if applicable): Circles, Following, Decks, Explore
   - **Team** (if has org): Feed, Review, Insights
   - **System**: Settings, Admin (if admin), Profile
3. **Progressive disclosure in nav:** sections 3 and 4 hidden unless user has social connections or org membership
4. **Topbar simplification:** only Search (Ctrl+K), Capture (+), Notifications (🔔), Profile avatar. Everything else moves to sidebar.

### Scope

This is NOT a small fix. It touches `AppShell.tsx`, `Topbar.tsx`, `Sidebar.tsx`, and potentially all pages that assume the current layout. It deserves a dedicated planning session (`/sdd-new`) to avoid breaking things.

### Files involved

- `packages/features/src/components/AppShell.tsx` (1.2KB — needs expansion)
- `packages/features/src/components/Topbar.tsx` (8.7KB — needs simplification)
- `packages/features/src/components/Sidebar.tsx` (5.1KB — needs to become navigation, not just filters)
- `apps/desktop/src/renderer/src/App.tsx` (routes)
- `apps/web/src/App.tsx` (routes)
- All pages that use `AppShell`
