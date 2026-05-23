-- +goose Up
-- Persist the human context behind a Circle share.

ALTER TABLE circle_items
    ADD COLUMN IF NOT EXISTS share_context TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE circle_items
    DROP COLUMN IF EXISTS share_context;
