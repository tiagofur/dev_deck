-- +goose Up
-- Fix auth: restore full unique index and NOT NULL for github_id (back to GitHub-only).

-- 1. Restore NOT NULL. Backfills must produce per-row unique values or the
--    unique indexes below (and login's in 0019) fail on duplicates:
--    github_ids below -1000000 stay clear of real GitHub IDs (always positive)
--    and of the seed test user's reserved github_id=-1 (0010 deletes it);
--    login embeds the row's UUID so it is unique by construction.
WITH backfill AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM users
  WHERE github_id IS NULL
)
UPDATE users u
SET github_id = -1000000 - b.rn
FROM backfill b
WHERE u.id = b.id;

UPDATE users SET login = 'unknown::' || id WHERE login IS NULL;
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
