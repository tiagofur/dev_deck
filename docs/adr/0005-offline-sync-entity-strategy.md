# ADR 0005: Offline-First Sync — Entity Delta Strategy

**Status:** Accepted  
**Date:** August 2026  
**Supersedes:** ADR 0002 (partial — conflict resolution details refined)

[Leer en español](0005-offline-sync-entity-strategy.es.md)

---

## Context and Problem Statement

ADR 0002 established the high-level sync strategy: an operation-based sync queue with Last-Write-Wins (LWW) conflict resolution. Since that decision, the offline-first sync engine has been implemented and expanded to cover all P0 and P1 entities.

This ADR documents the **concrete entity-level strategy** as shipped, including:

1. Which entities are synced and their priority tier.
2. How `position` fields (ordered lists) are reconciled without full CRDTs.
3. The cascading-delete semantics for parent → child relationships.
4. The field-level LWW merge strategy and its trade-offs.
5. Tag and array serialization conventions.

## Entity Coverage Matrix

| Priority | Entity Type           | Local Table            | Parent Relationship    | Sync Direction |
|----------|-----------------------|------------------------|------------------------|----------------|
| P0       | `item`                | `items`                | — (root)               | Bidirectional  |
| P0       | `runbook`             | `runbooks`             | `item` (FK `item_id`)  | Bidirectional  |
| P0       | `runbook_step`        | `runbook_steps`        | `runbook` (FK)         | Bidirectional  |
| P1       | `command`             | `item_commands`        | `item` (FK `item_id`)  | Pull-only      |
| P1       | `cheatsheet`          | `cheatsheets`          | — (root, global)       | Pull-only      |
| P1       | `cheatsheet_entry`    | `cheatsheet_entries`   | `cheatsheet` (FK)      | Pull-only      |
| P1       | `circle`              | `circles`              | — (root)               | Bidirectional  |
| P1       | `circle_member`       | `circle_members`       | `circle` (composite PK)| Bidirectional  |
| P1       | `circle_item`         | `circle_items`         | `circle` (composite PK)| Bidirectional  |

## Conflict Resolution: Field-Level LWW

All entities use **Last-Write-Wins at the field level**, keyed on `updated_at` (or `created_at` for immutable fields).

### How it works

1. The backend stores a `sync_operations` log of every mutation with a server-assigned timestamp.
2. On pull, the client receives a delta feed (`GET /api/sync/delta?since=<ts>`) containing full payloads.
3. The client applies each delta via `INSERT … ON CONFLICT(id) DO UPDATE SET …`, overwriting all mutable fields unconditionally.
4. The backend resolves push conflicts by comparing `client_updated_at` against `updated_at`; the later timestamp wins.

### Why not full CRDTs?

- **Complexity budget:** Most fields are simple scalars (title, description, URL). CRDTs add significant implementation and testing overhead for minimal benefit.
- **Low conflict probability:** DevDeck is primarily a single-user tool with optional team sharing. Concurrent edits on the same field by two devices are rare.
- **Escape hatch:** For the `notes` field (free-form text), a CRDT layer (Yjs/Automerge) is planned for Wave 9 / Phase 34. This ADR does not cover that scope.

### Limitations accepted

| Scenario | Current behavior | Future improvement |
|----------|-----------------|-------------------|
| Two devices edit `title` simultaneously | Last writer wins entirely | Field-level CRDT merge |
| Offline edit + server edit on same field | Client overwrites server on next sync | Manual merge UI for conflicts |
| `position` reordering offline | Last reorder wins (see below) | Operational transform |

## Position Reordering Strategy

Several entities have ordered lists where `position` is an integer:

- `runbook_steps.position` — steps within a runbook
- `item_commands.position` — commands within an item
- `cheatsheet_entries.position` — entries within a cheatsheet

### The problem

Naive LWW on `position` is unsafe: if Device A moves step 3 to position 1, and Device B moves step 5 to position 2, a field-level overwrite produces a garbled order.

### The solution: server-authoritative positions

Positions are **not synced as independent fields**. Instead:

1. **Reorder is an explicit operation:** The client sends `POST /api/repos/{id}/commands/reorder` (or equivalent) with an ordered array of UUIDs.
2. **Server recomputes positions:** The backend runs `UPDATE … SET position = t.pos FROM unnest($1::uuid[], $2::int[])` to assign sequential positions based on the provided order.
3. **Delta payload carries final positions:** The resulting `position` values are included in the delta feed, so offline clients see the resolved order.

### Trade-off

- **Pro:** No position conflicts; the server is always the source of truth for ordering.
- **Con:** Reordering while fully offline means the change is local-only until sync. If another device reorders in the meantime, the offline reorder is overwritten. This is acceptable given the low probability of concurrent reordering.

### CRDT-lite alternative (not yet implemented)

A future enhancement could use a **fractional indexing** scheme (e.g., LexoRank) to allow offline reordering without server coordination. This would assign positions as strings (`"a"`, `"aV"`, `"b"`) that sort lexicographically, allowing insertions between any two items without renumbering. This is tracked in the roadmap but not required for current entity coverage.

## Cascading Deletes

Parent entities that own child entities use **explicit cascade deletes** in the sync engine, not database-level `ON DELETE CASCADE` (SQLite local DB lacks FK enforcement).

### Delete semantics by entity

| Parent Entity    | Child Entity       | Delete behavior                                              |
|------------------|--------------------|--------------------------------------------------------------|
| `item`           | (soft delete)      | `UPDATE items SET archived = 1` — never hard-deleted locally  |
| `runbook`        | `runbook_steps`    | `DELETE FROM runbook_steps WHERE runbook_id = ?` then `DELETE FROM runbooks WHERE id = ?` |
| `cheatsheet`     | `cheatsheet_entries` | `DELETE FROM cheatsheet_entries WHERE cheatsheet_id = ?` then `DELETE FROM cheatsheets WHERE id = ?` |
| `circle`         | `circle_members`, `circle_items` | `DELETE FROM circle_members WHERE circle_id = ?`, `DELETE FROM circle_items WHERE circle_id = ?`, then `DELETE FROM circles WHERE id = ?` |
| `command`        | — (leaf)           | `DELETE FROM item_commands WHERE id = ?`                      |
| `runbook_step`   | — (leaf)           | `DELETE FROM runbook_steps WHERE id = ?`                      |
| `cheatsheet_entry` | — (leaf)         | `DELETE FROM cheatsheet_entries WHERE id = ?`                 |
| `circle_member`  | — (leaf)           | `DELETE FROM circle_members WHERE circle_id = ? AND user_id = ?` |
| `circle_item`    | — (leaf)           | `DELETE FROM circle_items WHERE circle_id = ? AND item_id = ?` |

### Why explicit cascades instead of FK constraints?

1. **SQLite OPFS limitations:** The web OPFS storage backend does not reliably enforce foreign key constraints.
2. **Ordering matters:** Children must be deleted before parents to avoid orphaned rows if the engine crashes mid-operation.
3. **Auditability:** Explicit deletes in the sync engine make the cascade behavior visible and testable.

### Edge case: delete while offline

If a user deletes a parent while offline, the cascade happens locally immediately. When the delta arrives on another device, the same cascade logic runs. If the parent was already deleted, the `DELETE … WHERE id = ?` affects 0 rows — idempotent and safe.

## Tag and Array Serialization

Fields that store arrays (`tags`, `ai_tags`) are serialized as JSON strings in SQLite:

```sql
-- Stored as TEXT in SQLite
tags TEXT NOT NULL DEFAULT '[]'

-- Application layer handles serialization
JSON.stringify(tags)  -- write
JSON.parse(tags)      -- read
```

### Normalization on sync

The sync engine normalizes tags before writing to prevent double-serialization:

```typescript
const tags = Array.isArray(entry.tags)
    ? entry.tags
    : typeof entry.tags === 'string'
        ? (() => { try { JSON.parse(entry.tags); } catch { return []; } })()
        : [];
```

This handles three cases:
1. **Array** (already parsed) — used as-is.
2. **JSON string** (backend sends pre-serialized) — parsed first.
3. **Null/undefined** — defaults to empty array.

## Sync Engine Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend Client                    │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌───────────────┐ │
│  │ UI Layer │───▶│ SQLite   │───▶│ Sync Queue    │ │
│  │ (React)  │    │ (local)  │    │ (mutations)   │ │
│  └──────────┘    └──────────┘    └───────┬───────┘ │
│                                          │          │
│  ┌──────────────────────────────────────┐│          │
│  │         Sync Engine (engine.ts)      ││          │
│  │                                      ││          │
│  │  1. PUSH: drain queue → POST /batch  │◀┘          │
│  │  2. PULL: GET /delta → applyRemote   │           │
│  │  3. Backoff on failure               │           │
│  └──────────────────┬───────────────────┘           │
│                     │                               │
└─────────────────────┼───────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │   Backend API  │
              │  (Go + Postgres)│
              └───────────────┘
```

### Sync loop cadence

| Event                 | Interval        |
|-----------------------|-----------------|
| Initial sync          | 100ms after boot |
| Normal polling        | 10 seconds      |
| After successful sync with more data | 100ms (immediate re-sync) |
| On network reconnect  | Immediate       |
| On failure            | Exponential backoff (1s → 30s max) |

### Batch constraints

- **Push batch size:** Max 50 operations per `POST /api/sync/batch`.
- **Pull delta limit:** Max 500 operations per `GET /api/sync/delta`.
- If either limit is hit, the engine schedules an immediate re-sync.

## Local SQLite Schema (shipped)

```sql
-- Core tables
items                   (19 columns, PK: id)
sync_operations         (7 columns, PK: id)
repos                   (10 columns, PK: id)  -- legacy, being migrated

-- P0 entities
runbooks                (8 columns, PK: id)
runbook_steps           (10 columns, PK: id)

-- P1 entities
item_commands           (9 columns, PK: id)
cheatsheets             (17 columns, PK: id)
cheatsheet_entries      (8 columns, PK: id)
circles                 (8 columns, PK: id)
circle_members          (5 columns, composite PK: circle_id + user_id)
circle_items            (6 columns, composite PK: circle_id + item_id)
```

### Composite Primary Keys

Circles use composite primary keys for member and item relationships:

```sql
-- Circle Members: unique membership per circle-user pair
CREATE TABLE circle_members (
    circle_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL,
    local_updated_at TEXT,
    PRIMARY KEY (circle_id, user_id)
);

-- Circle Items: unique sharing per circle-item pair
CREATE TABLE circle_items (
    circle_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    shared_by TEXT NOT NULL,
    share_context TEXT NOT NULL DEFAULT '',
    shared_at TEXT NOT NULL,
    local_updated_at TEXT,
    PRIMARY KEY (circle_id, item_id)
);
```

The sync engine uses `ON CONFLICT(circle_id, user_id) DO UPDATE` for upserts, and extracts composite keys from `op.payload` (not from the top-level delta object) for deletes.

All tables include `local_updated_at` for tracking when the row was last modified by sync. Indexes are created on foreign keys (`item_id`, `runbook_id`, `cheatsheet_id`) and lookup fields (`slug`, `user_id`, `created_by`).

## Consequences

### Positive
- **Full offline support:** All P0/P1 entities work without network.
- **Deterministic merge:** LWW with server timestamps produces a single consistent state.
- **Simple implementation:** No CRDT library dependencies; standard SQL UPSERTs.
- **Testable:** Each entity handler is independently testable via the sync engine.

### Negative
- **Position conflicts:** Reordering offline can be overwritten. Accepted trade-off.
- **No field-level merge:** Simultaneous edits to different fields on the same entity lose one side. Acceptable for single-user primary use case.
- **Schema drift risk:** Local schema must stay in sync with backend via migrations in `LOCAL_MIGRATIONS`.

### Risks mitigated
- **Tag double-serialization:** Normalized on write (see § Tag Serialization).
- **Orphaned children on delete:** Explicit cascade in sync engine, not FK constraints.
- **Stale deltas:** `lastSyncAt` timestamp ensures only new operations are fetched.

---

## References

- [ADR 0002: Sync Strategy](0002-sync-strategy.md) — original high-level decision
- [ADR 0001: Polymorphic Items](0001-items-polymorphism.md) — items data model
- [ROADMAP Phase 22](../ROADMAP.md) — sync engine implementation plan
- [Sync Engine Source](../../packages/api-client/src/sync/engine.ts)
- [Local DB Schema](../../packages/api-client/src/local-db/schema.ts)

---

*Part of the DevDeck Architecture Decision Records*
