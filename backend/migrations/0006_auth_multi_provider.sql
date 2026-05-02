-- +goose Up
-- Multi-provider auth + multi-user ownership.

-- ---------------------------------------------------------------------------
-- Users: move away from GitHub-only columns so Google/Apple users can exist.
-- Keep legacy columns nullable for backward compatibility/migration safety.
-- ---------------------------------------------------------------------------

ALTER TABLE users
  ALTER COLUMN github_id DROP NOT NULL,
  ALTER COLUMN login DROP NOT NULL,
  ALTER COLUMN avatar_url SET DEFAULT '',
  ALTER COLUMN display_name SET DEFAULT '';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS primary_email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_github_id_key;
DROP INDEX IF EXISTS idx_users_github_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id_unique
  ON users(github_id)
  WHERE github_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_primary_email_unique
  ON users(primary_email)
  WHERE primary_email IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Provider identities: one account can be linked to many OAuth providers.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS auth_identities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('github', 'google', 'apple')),
  provider_user_id TEXT NOT NULL,
  email            TEXT,
  email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  provider_login   TEXT,
  display_name     TEXT NOT NULL DEFAULT '',
  avatar_url       TEXT NOT NULL DEFAULT '',
  profile_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_identities_provider_subject
  ON auth_identities(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user
  ON auth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_email
  ON auth_identities(email);

INSERT INTO auth_identities (
  user_id,
  provider,
  provider_user_id,
  provider_login,
  display_name,
  avatar_url,
  created_at,
  updated_at,
  last_login_at
)
SELECT
  u.id,
  'github',
  u.github_id::TEXT,
  u.login,
  COALESCE(u.display_name, ''),
  COALESCE(u.avatar_url, ''),
  u.created_at,
  u.updated_at,
  NOW()
FROM users u
WHERE u.github_id IS NOT NULL
ON CONFLICT (provider, provider_user_id) DO NOTHING;

UPDATE users
SET last_login_at = COALESCE(last_login_at, NOW())
WHERE github_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- OAuth states: required for multi-provider callbacks and desktop deep links.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS oauth_states (
  state         TEXT PRIMARY KEY,
  provider      TEXT NOT NULL CHECK (provider IN ('github', 'google', 'apple')),
  redirect_uri  TEXT NOT NULL,
  code_verifier TEXT,
  nonce         TEXT,
  device        TEXT NOT NULL CHECK (device IN ('web', 'desktop')),
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires
  ON oauth_states(expires_at);

-- ---------------------------------------------------------------------------
-- Business data ownership: JWT requests scope by user_id. Token-mode legacy
-- rows keep user_id NULL so existing dev flows can keep working temporarily.
-- ---------------------------------------------------------------------------

ALTER TABLE repos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE cheatsheets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE repos DROP CONSTRAINT IF EXISTS repos_url_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_repos_user_url_unique
  ON repos(user_id, url)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_repos_global_url_unique
  ON repos(url)
  WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_repos_user_id
  ON repos(user_id);

DROP INDEX IF EXISTS idx_items_url_normalized;
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_user_url_normalized_unique
  ON items(user_id, url_normalized)
  WHERE user_id IS NOT NULL AND url_normalized IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_global_url_normalized_unique
  ON items(url_normalized)
  WHERE user_id IS NULL AND url_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_user_id
  ON items(user_id);

ALTER TABLE cheatsheets DROP CONSTRAINT IF EXISTS cheatsheets_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cheatsheets_user_slug_unique
  ON cheatsheets(user_id, slug)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cheatsheets_global_slug_unique
  ON cheatsheets(slug)
  WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cheatsheets_user_id
  ON cheatsheets(user_id);
