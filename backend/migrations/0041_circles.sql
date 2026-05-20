-- +goose Up
-- Create tables for Circles (Lightweight Groups)

CREATE TABLE IF NOT EXISTS circles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text), 1, 8)),
    created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS circle_members (
    circle_id  UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS circle_items (
    circle_id  UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    item_id    UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    shared_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (circle_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_items_item ON circle_items(item_id);

-- +goose Down
DROP TABLE IF EXISTS circle_items;
DROP TABLE IF EXISTS circle_members;
DROP TABLE IF EXISTS circles;
