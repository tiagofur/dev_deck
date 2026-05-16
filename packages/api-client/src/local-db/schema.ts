/**
 * Local SQLite schema for Phase 21.
 * This is a subset of the backend schema, optimized for local execution.
 */
export const LOCAL_SCHEMA = `
-- Items table (polymorphic vault)
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    description TEXT,
    notes TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    ai_summary TEXT NOT NULL DEFAULT '',
    ai_tags TEXT NOT NULL DEFAULT '[]',
    why_saved TEXT NOT NULL DEFAULT '',
    when_to_use TEXT NOT NULL DEFAULT '',
    enrichment_status TEXT NOT NULL DEFAULT 'pending',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_seen_at TEXT,
    -- Sync metadata
    server_version INTEGER DEFAULT 0,
    local_updated_at TEXT NOT NULL
);

-- Sync Queue
CREATE TABLE IF NOT EXISTS sync_operations (
    id TEXT PRIMARY KEY, -- operation_id
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    op TEXT NOT NULL, -- create, update, delete
    payload TEXT NOT NULL, -- JSON string
    created_at TEXT NOT NULL,
    synced_at TEXT -- NULL if pending
);

-- Repos
CREATE TABLE IF NOT EXISTS repos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    language TEXT,
    stars INTEGER DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Runbooks
CREATE TABLE IF NOT EXISTS runbooks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Runbook Steps
CREATE TABLE IF NOT EXISTS runbook_steps (
    id TEXT PRIMARY KEY,
    runbook_id TEXT NOT NULL,
    label TEXT NOT NULL,
    command TEXT,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
`;
