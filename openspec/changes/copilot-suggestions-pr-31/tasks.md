# Tasks: Addressing Copilot Technical Suggestions (PR 31)

## Phase 1: Foundation (Constants & Types)
- [x] 1.1 Export `EnrichmentStatus` constant object in `packages/api-client/src/features/capture/types.ts`.
- [x] 1.2 Verify `EnrichmentStatus` is re-exported in `packages/api-client/src/index.ts`.

## Phase 2: Backend Implementation
- [x] 2.1 Refactor `truncate` in `backend/internal/ai/heuristic.go` to be UTF-8 safe using `[]rune`.
- [x] 2.2 Update `run` method in `backend/internal/jobs/enrich.go` to check `hadError` before `processed`.

## Phase 3: Frontend Implementation
- [x] 3.1 Replace hardcoded status strings in `packages/features/src/components/ItemCard.tsx` with `EnrichmentStatus` constants.
- [x] 3.2 Update `ItemCard` status labels to use imported constants for comparisons.

## Phase 4: Cleanup & Verification
- [x] 4.1 Replace all tabs with 2 spaces in `docs/TECHNICAL_ROADMAP_AI_OFFLINE.md`.
- [x] 4.2 Add/run unit tests for `truncate` in `backend/internal/ai/heuristic_test.go` with UTF-8 strings.
- [x] 4.3 Verify enrichment status logic via `backend/internal/jobs/enrich_test.go`. (Verified via `internal/jobs/status_test.go`).
- [x] 4.4 Run `pnpm lint` and `pnpm typecheck` to ensure frontend integrity.
