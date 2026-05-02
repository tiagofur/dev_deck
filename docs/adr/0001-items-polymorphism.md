# ADR 0001: Polymorphic Items Model

**Status:** DECIDED
**Date:** April 2026

[Leer en español](0001-items-polymorphism.es.md)

---

## Context
As we move to **Wave 5**, we need to support non-URL items such as CLIs, Snippets, IDE Plugins, and OS Shortcuts.

Options considered:
1. **Separate Tables:** One table per type (`repos`, `clis`, `snippets`).
2. **Polymorphic Table:** A single `items` table with a `type` column and a JSONB `payload` for type-specific data.

## Decision
We will use a **Single Polymorphic Table** (`items`).

### Rationale
- **Unified Search:** Semantic search and global search are much simpler to implement against a single table.
- **Shared Metadata:** All items share `title`, `description`, `created_at`, `user_id`, and `ai_summary`.
- **Flexibility:** Adding a new type (e.g., "Agent") is just adding a new value to the `type` enum.

## Implementation Details
```sql
CREATE TYPE item_type AS ENUM ('repo', 'cli', 'snippet', 'shortcut', 'plugin', 'note', 'prompt');

CREATE TABLE items (
  id           UUID PRIMARY KEY,
  user_id      UUID REFERENCES users(id),
  type         item_type NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  url          TEXT, -- NULL for non-URL items
  payload      JSONB, -- Type-specific data (e.g., keys, commands)
  ai_summary   TEXT,
  embedding    vector(1536),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

## Consequences
- **Positive:** Simpler backend code, faster global search.
- **Negative:** Type-specific validation must be handled in the application layer (Go/TypeScript) instead of DB constraints.
