# UI Components Specification

## Purpose
Define standards and behaviors for frontend UI components.

## Requirements

### Requirement: Standardized Status Labels
The `ItemCard` component MUST use exported constants/enums for enrichment status checks and labels instead of hardcoded strings.

#### Scenario: Display status label
- GIVEN an item with enrichment status "queued"
- WHEN the ItemCard is rendered
- THEN it MUST show the label "Analizando…"
- AND the logic MUST check against `EnrichmentStatus.Queued` (or equivalent constant).

#### Scenario: Display error label
- GIVEN an item with enrichment status "error"
- WHEN the ItemCard is rendered
- THEN it MUST show the label "Análisis pendiente"
- AND the logic MUST check against `EnrichmentStatus.Error` (or equivalent constant).
