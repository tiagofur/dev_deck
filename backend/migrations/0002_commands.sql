-- DevDeck — Wave 2: per-repo commands
-- Run with: psql "$DB_URL" -f migrations/0002_commands.sql

CREATE TABLE IF NOT EXISTS repo_commands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id     UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  command     TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT,
  position    INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compound index supports the most common query: list commands of a
-- given repo, ordered by position.
CREATE INDEX IF NOT EXISTS idx_repo_commands_repo_pos
  ON repo_commands(repo_id, position);
