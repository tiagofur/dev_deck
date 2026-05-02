-- +goose Up
-- Social Deck: Public visibility, Forking, and Stars (Wave 7 Enhancement)

-- Visibility enumeration
-- Note: plain TEXT check is easier to migrate later than custom ENUM if we change it.
ALTER TABLE cheatsheets
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES cheatsheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fork_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stars_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cheatsheets_visibility ON cheatsheets(visibility);
CREATE INDEX IF NOT EXISTS idx_cheatsheets_parent ON cheatsheets(parent_id);

-- Stars table (Many-to-Many)
CREATE TABLE IF NOT EXISTS cheatsheet_stars (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cheatsheet_id UUID NOT NULL REFERENCES cheatsheets(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, cheatsheet_id)
);

CREATE INDEX IF NOT EXISTS idx_stars_sheet ON cheatsheet_stars(cheatsheet_id);

-- +goose Down
DROP TABLE IF EXISTS cheatsheet_stars;
ALTER TABLE cheatsheets
  DROP COLUMN IF EXISTS visibility,
  DROP COLUMN IF EXISTS parent_id,
  DROP COLUMN IF EXISTS is_official,
  DROP COLUMN IF EXISTS fork_count,
  DROP COLUMN IF EXISTS stars_count;
