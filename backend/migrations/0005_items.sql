-- +goose Up
-- Wave 4.5 §16.9 — Unified capture endpoint.
--
-- This migration introduces the polymorphic `items` table described in
-- ADR 0001, WITHOUT dropping the legacy `repos` table (that rename lands
-- in Ola 5 Fase 17 once every client is on the items model). The two
-- tables coexist: `/api/repos` keeps writing to `repos`, the new
-- `/api/items/capture` writes to `items`. Dedupe works across both via
-- the `url_normalized` column.

CREATE TABLE items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type        TEXT NOT NULL CHECK (item_type IN (
    'repo','cli','plugin','shortcut','snippet','agent','prompt',
    'article','tool','workflow','note'
  )),
  title            TEXT NOT NULL,
  url              TEXT,
  url_normalized   TEXT,
  description      TEXT,
  notes            TEXT NOT NULL DEFAULT '',
  tags             TEXT[] NOT NULL DEFAULT '{}',
  why_saved        TEXT NOT NULL DEFAULT '',
  when_to_use      TEXT NOT NULL DEFAULT '',
  source_channel   TEXT NOT NULL DEFAULT 'manual',
  meta             JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary       TEXT NOT NULL DEFAULT '',
  ai_tags          TEXT[] NOT NULL DEFAULT '{}',
  enrichment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (enrichment_status IN ('pending','queued','ok','error','skipped')),
  archived         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ
);

-- One row per normalized URL so the capture endpoint can dedupe in a single
-- query. Nullable because type=note/shortcut/snippet/prompt items might not
-- have a URL at all.
CREATE UNIQUE INDEX idx_items_url_normalized
  ON items(url_normalized)
  WHERE url_normalized IS NOT NULL;

CREATE INDEX idx_items_type ON items(item_type);
CREATE INDEX idx_items_type_created ON items(item_type, created_at DESC);
CREATE INDEX idx_items_tags ON items USING gin(tags);
CREATE INDEX idx_items_search ON items USING gin (
  (title || ' ' || COALESCE(description,'') || ' ' || COALESCE(array_to_string(tags,' '),''))
  gin_trgm_ops
);

-- Backfill `url_normalized` onto the legacy `repos` table so the dedupe
-- query in the capture handler can match against both tables with one
-- normalization rule. We recompute it from `url` here and let the handler
-- keep it in sync going forward.
ALTER TABLE repos ADD COLUMN IF NOT EXISTS url_normalized TEXT;

-- Naive canonicalisation: lowercase, strip trailing slash. The handler
-- also strips scheme/host/query, but that logic is too hairy for pure SQL,
-- so existing rows get the simplified version; new rows are normalised
-- properly by the Go helper.
UPDATE repos
SET url_normalized = lower(regexp_replace(url, '/+$', ''))
WHERE url_normalized IS NULL;

CREATE INDEX IF NOT EXISTS idx_repos_url_normalized ON repos(url_normalized);

-- +goose Down
DROP INDEX IF EXISTS idx_repos_url_normalized;
ALTER TABLE repos DROP COLUMN IF EXISTS url_normalized;
DROP INDEX IF EXISTS idx_items_search;
DROP INDEX IF EXISTS idx_items_tags;
DROP INDEX IF EXISTS idx_items_type_created;
DROP INDEX IF EXISTS idx_items_type;
DROP INDEX IF EXISTS idx_items_url_normalized;
DROP TABLE IF EXISTS items;
