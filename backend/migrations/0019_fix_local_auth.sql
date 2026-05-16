-- +goose Up
-- Allow local users by making github_id nullable again and making login unique.

-- 1. Make github_id nullable and restore partial index
ALTER TABLE users ALTER COLUMN github_id DROP NOT NULL;

DROP INDEX IF EXISTS idx_users_github_id_unique;
CREATE UNIQUE INDEX idx_users_github_id_unique ON users(github_id) WHERE github_id IS NOT NULL;

-- 2. Make login unique so ON CONFLICT (login) works
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_unique ON users(login);
ALTER TABLE users ADD CONSTRAINT users_login_key UNIQUE USING INDEX idx_users_login_unique;


