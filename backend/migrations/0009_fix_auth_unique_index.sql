-- +goose Up
-- Fix auth: restore full unique index and NOT NULL for github_id (back to GitHub-only).

-- 1. Restore NOT NULL
UPDATE users SET github_id = 0 WHERE github_id IS NULL; -- Should not happen in Wave 5 cleanup but safe
ALTER TABLE users ALTER COLUMN github_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN login SET NOT NULL;

-- 2. Drop partial index and restore full unique index
DROP INDEX IF EXISTS idx_users_github_id_unique;
CREATE UNIQUE INDEX idx_users_github_id_unique ON users(github_id);

-- +goose Down
ALTER TABLE users ALTER COLUMN github_id DROP NOT NULL;
ALTER TABLE users ALTER COLUMN login DROP NOT NULL;
DROP INDEX IF EXISTS idx_users_github_id_unique;
CREATE UNIQUE INDEX idx_users_github_id_unique ON users(github_id) WHERE github_id IS NOT NULL;
