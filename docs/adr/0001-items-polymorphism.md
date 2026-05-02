# ADR 0001: Polymorphic Items Model

**Status:** Accepted  
**Date:** March 2026  
**Context:** Wave 5 (General Items)

[Leer en español](0001-items-polymorphism.es.md)

---

## Context and Problem Statement

Initially, DevDeck was focused exclusively on **Repositories**. The data model was rigid, centered around the `repos` table. As we moved towards Wave 5, the need to support other developer assets (CLIs, Plugins, Snippets, Shortcuts, Prompts) became evident.

The challenge was: how do we store these diverse entities while maintaining a unified search experience (especially for AI semantic search) without creating a fragmented schema that is hard to maintain?

## Considered Options

1.  **Separate Tables for Every Type**: Create `clis`, `plugins`, `snippets`, etc.
    - **Pros**: Clean schema for type-specific fields.
    - **Cons**: Extremely hard to perform global search, paging, and cross-entity filtering. AI embeddings would need to be handled separately.
2.  **Single Monolithic Table**: One `items` table with many nullable columns.
    - **Pros**: Simple global search and paging.
    - **Cons**: "Sparse table" problem. The table grows wide and messy as new types are added.
3.  **Polymorphic Base Table + JSONB Metadata (Selected)**: A central `items` table for common fields with a `metadata` JSONB column for type-specific data.

## Decision Outcome

We chose **Option 3**. All developer assets are stored in a single `items` table.

### Data Structure

```sql
CREATE TABLE items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  item_type    TEXT NOT NULL, -- 'repo', 'cli', 'snippet', 'prompt', etc.
  url          TEXT,          -- Optional for non-web items
  title        TEXT NOT NULL,
  description  TEXT,
  tags         TEXT[] DEFAULT '{}',
  content      TEXT,          -- Raw content for snippets/notes
  metadata     JSONB,         -- Type-specific data (e.g., CLI install command)
  embedding    vector(1536),  -- AI semantic representation
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### Consequences

- **Pros**:
    - **Unified Search**: Global search (fuzzy and semantic) works out of the box for all items.
    - **Extensibility**: Adding a new type (e.g., "Agent") doesn't require a database migration.
    - **Simplicity**: One set of CRUD endpoints and one TanStack Query cache.
- **Cons**:
    - **Validation**: Enforcing type-specific rules (e.g., a "Repo" must have a URL) moves from the DB layer to the application logic (Go).
    - **SQL Complexity**: Querying deep into the JSONB metadata can be slightly slower (mitigated by GIN indexes if needed).

---

*Part of the DevDeck Architecture Decision Records*
