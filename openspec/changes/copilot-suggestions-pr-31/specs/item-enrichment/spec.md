# Item Enrichment Specification

## Purpose
Describe the background process of enriching captured items with metadata and AI-generated fields.

## Requirements

### Requirement: Enrichment Status Priority
The system MUST report the enrichment status accurately. If any stage of the enrichment process fails (e.g., metadata fetch or AI enrichment), the final status MUST be "error", even if other stages succeeded.

#### Scenario: Metadata success but AI failure
- GIVEN an enrichment job for an item
- WHEN metadata fetch succeeds
- AND AI enrichment fails
- THEN the item enrichment status MUST be set to "error".

#### Scenario: All stages success
- GIVEN an enrichment job for an item
- WHEN all stages succeed
- THEN the item enrichment status MUST be set to "ok".

#### Scenario: Metadata failure
- GIVEN an enrichment job for an item
- WHEN metadata fetch fails
- THEN the item enrichment status MUST be set to "error" (AI enrichment should be skipped or attempted but status remains error).
