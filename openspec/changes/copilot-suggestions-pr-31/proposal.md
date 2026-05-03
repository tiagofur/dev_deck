# Proposal: Addressing Copilot Technical Suggestions (PR 31)

## Intent
Resolve critical bugs and technical debt identified by Copilot during the review of PR #31. This includes fixing data corruption risks in AI summarization and ensuring accurate enrichment status reporting.

## Scope

### In Scope
- Fix unsafe byte-slicing in `ai/heuristic.go`.
- Correct status priority in `jobs/enrich.go`.
- Refactor `ItemCard.tsx` to use constants for enrichment status.
- Standardize indentation in `docs/TECHNICAL_ROADMAP_AI_OFFLINE.md`.

### Out of Scope
- Major architectural changes to the enrichment pipeline.
- New AI providers or features.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `item-enrichment`: Status reporting logic will be more accurate (errors prioritized).
- `ai-summarization`: Text truncation will be safe for international (multi-byte) characters.

## Approach
1. **UTF-8 Safety**: Update `truncate` in `heuristic.go` to use `[]rune` instead of byte-slicing.
2. **Priority Fix**: Reorder conditional checks in `enrich.go`'s `run` loop to ensure `hadError` flag sets the final status to `error` even if some stages succeeded.
3. **Magic String Removal**: Verify if `EnrichmentStatus` is exported in `@devdeck/api-client`. If not, export it and use it in `ItemCard.tsx`.
4. **Indentation**: Use `sed` or editor tools to convert all tabs to 2 spaces in `TECHNICAL_ROADMAP_AI_OFFLINE.md`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/ai/heuristic.go` | Modified | Truncation logic |
| `backend/internal/jobs/enrich.go` | Modified | Status calculation logic |
| `packages/features/src/components/ItemCard.tsx` | Modified | UI status labels |
| `docs/TECHNICAL_ROADMAP_AI_OFFLINE.md` | Modified | File formatting |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Regressions in truncation length | Low | Unit test for UTF-8 and ASCII strings |
| Status reporting mismatch | Low | Manual verification of enrichment worker |

## Rollback Plan
- Revert the specific commit using `git revert`.

## Success Criteria
- [ ] AI summaries with UTF-8 characters truncate without corruption.
- [ ] Failed enrichment jobs result in "error" status even if some stages succeeded.
- [ ] ItemCard UI uses exported constants for status labels.
- [ ] Technical roadmap file contains no tabs.
