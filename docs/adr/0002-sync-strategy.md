# ADR 0002: Offline-First Sync Strategy

**Status:** DECIDED
**Date:** April 2026

[Leer en español](0002-sync-strategy.es.md)

---

## Context
DevDeck must work offline in the desktop app. Changes made while offline must sync to the backend when a connection is restored.

## Decision
We will use an **Operation-based Sync Queue** with **Last-Write-Wins (LWW)** conflict resolution.

### Rationale
- **Simplicity:** CRDTs are too complex for our current needs.
- **User Intent:** Most of our data is additive (saving items), so conflicts are rare.
- **Optimistic UI:** Users see their changes immediately in the local DB.

## Implementation Details
1. **Local DB:** SQLite (Desktop) / OPFS (Web).
2. **Sync Queue:** A table in the local DB stores every `mutation` (Create, Update, Delete).
3. **Background Sync:** A worker drains the queue via `POST /api/sync/batch`.
4. **Conflicts:** Backend uses `updated_at` timestamps to resolve field-level conflicts.

## Consequences
- **Positive:** Full offline support, high perceived performance.
- **Negative:** Requires handling network state and batch error recovery in the client.
