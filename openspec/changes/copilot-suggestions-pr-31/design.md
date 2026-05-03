# Design: Addressing Copilot Technical Suggestions (PR 31)

## Technical Approach
The implementation focuses on three areas: data safety (UTF-8), reporting accuracy (enrichment status), and code maintainability (magic strings). We will use Go's `rune` type for character-safe string manipulation and centralized constants in the frontend.

## Architecture Decisions

### Decision: UTF-8 Safe Truncation
**Choice**: Convert `string` to `[]rune` before slicing in `backend/internal/ai/heuristic.go`.
**Alternatives considered**: Using `utf8.DecodeRuneInString` in a loop.
**Rationale**: Converting to `[]rune` is more readable and less error-prone for simple truncation, even if it performs a full string copy. For 160 characters, the performance impact is negligible.

### Decision: Enrichment Status Priority
**Choice**: In `backend/internal/jobs/enrich.go`, check `hadError` before `processed` when determining the final status.
**Alternatives considered**: Reporting partial success (e.g., "metadata_ok_ai_error").
**Rationale**: The `enrichment_status` column is a simple enum. Reporting "error" if *any* part failed is safer for the UI to trigger retries or show warnings.

### Decision: Centralized Frontend Status Constants
**Choice**: Export a `const EnrichmentStatus` object from `@devdeck/api-client`.
**Alternatives considered**: Using a TypeScript `enum`.
**Rationale**: Constant objects with `as const` are preferred in this project's style for better tree-shaking and compatibility with the polymorphic nature of the API.

## Data Flow

    [Enrichment Worker]
          │
          ├─(1) Fetch Metadata ───┐
          │                       │ (Error?) ──→ set hadError = true
          ├─(2) AI Enrichment ────┤
          │                       │ (Error?) ──→ set hadError = true
          └─(3) Update Status ────┘
                  │
                  └─ IF hadError THEN "error" ELSE IF processed THEN "ok"

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/internal/ai/heuristic.go` | Modify | Update `truncate` to use `[]rune`. |
| `backend/internal/jobs/enrich.go` | Modify | Update `run` to prioritize `hadError`. |
| `packages/api-client/src/features/capture/types.ts` | Modify | Export `EnrichmentStatus` constant. |
| `packages/features/src/components/ItemCard.tsx` | Modify | Replace magic strings with `EnrichmentStatus` constants. |
| `docs/TECHNICAL_ROADMAP_AI_OFFLINE.md` | Modify | Replace tabs with 2 spaces. |

## Interfaces / Contracts

### Go (Internal)
```go
func truncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	// ... safe slicing of runes ...
}
```

### TypeScript (Shared)
```typescript
export const EnrichmentStatus = {
  Pending: 'pending',
  Queued: 'queued',
  Ok: 'ok',
  Error: 'error',
  Skipped: 'skipped',
} as const
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (Go) | `truncate` function | Test with "👋 Hello", "Año", and standard ASCII. |
| Unit (Go) | `enrich` worker logic | Mock store and enricher to simulate partial failures. |
| Unit (TS) | `ItemCard` rendering | Verify correct labels for each status constant. |

## Migration / Rollout
No migration required. Existing data in the database already uses these string values.

## Open Questions
None.
