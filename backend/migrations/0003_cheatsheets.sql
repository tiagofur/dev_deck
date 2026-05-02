-- +goose Up
-- Cheatsheets global + entries + repo links (Wave 3)

CREATE TABLE cheatsheets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  icon        TEXT,
  color       TEXT,
  description TEXT DEFAULT '',
  is_seed     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cheatsheets_category ON cheatsheets(category);
CREATE INDEX idx_cheatsheets_slug     ON cheatsheets(slug);

CREATE TABLE cheatsheet_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cheatsheet_id  UUID NOT NULL REFERENCES cheatsheets(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  command        TEXT NOT NULL,
  description    TEXT DEFAULT '',
  tags           TEXT[] DEFAULT '{}',
  position       INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_entries_cheat ON cheatsheet_entries(cheatsheet_id, position);
CREATE INDEX idx_entries_search ON cheatsheet_entries USING gin (
  (label || ' ' || command || ' ' || COALESCE(description,'') || ' ' || COALESCE(immutable_array_to_string(tags,' '),''))
  gin_trgm_ops
);

-- Many-to-many: a repo can link to relevant cheatsheets.
CREATE TABLE repo_cheatsheet_links (
  repo_id        UUID REFERENCES repos(id)        ON DELETE CASCADE,
  cheatsheet_id  UUID REFERENCES cheatsheets(id)  ON DELETE CASCADE,
  PRIMARY KEY (repo_id, cheatsheet_id)
);
