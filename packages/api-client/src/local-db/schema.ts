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
    org_id TEXT,
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
    updated_at TEXT NOT NULL,
    local_updated_at TEXT
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
    updated_at TEXT NOT NULL,
    local_updated_at TEXT
);

-- Item Commands (per-repo quick commands)
CREATE TABLE IF NOT EXISTS item_commands (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    label TEXT NOT NULL,
    command TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    local_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_item_commands_item_id ON item_commands(item_id);

-- Cheatsheets (themed command collections)
CREATE TABLE IF NOT EXISTS cheatsheets (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    description TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'private',
    parent_id TEXT,
    is_official INTEGER NOT NULL DEFAULT 0,
    fork_count INTEGER NOT NULL DEFAULT 0,
    stars_count INTEGER NOT NULL DEFAULT 0,
    is_seed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    local_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cheatsheets_slug ON cheatsheets(slug);
CREATE INDEX IF NOT EXISTS idx_cheatsheets_user_id ON cheatsheets(user_id);

-- Cheatsheet Entries (commands within a cheatsheet)
CREATE TABLE IF NOT EXISTS cheatsheet_entries (
    id TEXT PRIMARY KEY,
    cheatsheet_id TEXT NOT NULL,
    label TEXT NOT NULL,
    command TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    position INTEGER NOT NULL DEFAULT 0,
    local_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cheatsheet_entries_cheatsheet_id ON cheatsheet_entries(cheatsheet_id);

-- Circles (lightweight groups)
CREATE TABLE IF NOT EXISTS circles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    invite_code TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    local_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_circles_created_by ON circles(created_by);

-- Circle Members
CREATE TABLE IF NOT EXISTS circle_members (
    circle_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL,
    local_updated_at TEXT,
    PRIMARY KEY (circle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);

-- Circle Items (shared items within a circle)
CREATE TABLE IF NOT EXISTS circle_items (
    circle_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    shared_by TEXT NOT NULL,
    share_context TEXT NOT NULL DEFAULT '',
    shared_at TEXT NOT NULL,
    local_updated_at TEXT,
    PRIMARY KEY (circle_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_items_item ON circle_items(item_id);

-- Notifications (pull-only from server)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Organizations (teams/workspaces)
CREATE TABLE IF NOT EXISTS orgs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    local_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_orgs_slug ON orgs(slug);

-- Organization Members (composite PK)
CREATE TABLE IF NOT EXISTS org_members (
    org_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL,
    local_updated_at TEXT,
    PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
`;

/**
 * Migrations for existing databases.
 * Applied in order on startup; each migration is idempotent.
 */
export const LOCAL_MIGRATIONS = [
  // Add org_id column to items if missing (2026-07-31)
  `ALTER TABLE items ADD COLUMN org_id TEXT`,
  // Add circles tables (2026-08-01)
  `CREATE TABLE IF NOT EXISTS circles (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', invite_code TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, local_updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS circle_members (circle_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL, local_updated_at TEXT, PRIMARY KEY (circle_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS circle_items (circle_id TEXT NOT NULL, item_id TEXT NOT NULL, shared_by TEXT NOT NULL, share_context TEXT NOT NULL DEFAULT '', shared_at TEXT NOT NULL, local_updated_at TEXT, PRIMARY KEY (circle_id, item_id))`,
  // Add indexes for circles tables (2026-08-02)
  `CREATE INDEX IF NOT EXISTS idx_circles_created_by ON circles(created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_circle_items_item ON circle_items(item_id)`,
  // Add notifications table (2026-08-10)
  `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, action_url TEXT, read_at TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)`,
  // Add orgs and org_members tables (2026-08-10)
  `CREATE TABLE IF NOT EXISTS orgs (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'free', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, local_updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS org_members (org_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL, local_updated_at TEXT, PRIMARY KEY (org_id, user_id))`,
  `CREATE INDEX IF NOT EXISTS idx_orgs_slug ON orgs(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id)`,
];
