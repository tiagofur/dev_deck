-- +goose Up
-- Google OAuth identity. OIDC 'sub' is a numeric-looking string that can
-- exceed int64, so it is stored as TEXT.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_users_google_id;
ALTER TABLE users DROP COLUMN IF EXISTS google_id;
