-- +goose Up
-- Auth: users + refresh sessions (Wave 4)

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id     BIGINT NOT NULL UNIQUE,
  login         TEXT NOT NULL,
  avatar_url    TEXT DEFAULT '',
  display_name  TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_github_id ON users(github_id);

CREATE TABLE refresh_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_refresh_sessions_user ON refresh_sessions(user_id);
CREATE INDEX idx_refresh_sessions_token ON refresh_sessions(token_hash);

-- +goose Down
DROP TABLE IF EXISTS refresh_sessions;
DROP TABLE IF EXISTS users;
