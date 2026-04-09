-- DevDeck — Wave 1 initial schema
-- Run with: psql "$DB_URL" -f migrations/0001_init.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS repos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url             TEXT NOT NULL UNIQUE,
  source          TEXT NOT NULL CHECK (source IN ('github','generic')),
  owner           TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  language        TEXT,
  language_color  TEXT,
  stars           INT  DEFAULT 0,
  forks           INT  DEFAULT 0,
  avatar_url      TEXT,
  og_image_url    TEXT,
  homepage        TEXT,
  topics          TEXT[] NOT NULL DEFAULT '{}',
  notes           TEXT NOT NULL DEFAULT '',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  archived        BOOLEAN NOT NULL DEFAULT FALSE,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ,
  last_seen_at    TIMESTAMPTZ
);

-- Helper: array_to_string is STABLE, not IMMUTABLE, so PostgreSQL rejects
-- it inside expression-based indexes. This thin IMMUTABLE wrapper makes
-- it usable in GIN trigram indexes.
CREATE OR REPLACE FUNCTION immutable_array_to_string(arr TEXT[], sep TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT array_to_string(arr, sep);
$$;

CREATE INDEX IF NOT EXISTS idx_repos_search ON repos USING gin (
  (name || ' ' || COALESCE(description,'') || ' ' || COALESCE(immutable_array_to_string(tags,' '),''))
  gin_trgm_ops
);
CREATE INDEX IF NOT EXISTS idx_repos_lang     ON repos(language);
CREATE INDEX IF NOT EXISTS idx_repos_tags     ON repos USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_repos_archived ON repos(archived);

CREATE TABLE IF NOT EXISTS app_state (
  k TEXT PRIMARY KEY,
  v JSONB NOT NULL
);
