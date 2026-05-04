-- +goose Up
-- Add is_favorite to items for favorites system

ALTER TABLE items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_items_is_favorite ON items(is_favorite) WHERE is_favorite = TRUE;

-- +goose Down
ALTER TABLE items DROP COLUMN IF EXISTS is_favorite;