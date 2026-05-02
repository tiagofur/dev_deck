-- +goose Up
-- Auth: local password support (Wave 7)

-- ---------------------------------------------------------------------------
-- Users: add password storage
-- ---------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ---------------------------------------------------------------------------
-- Provider identities: add 'local' to allowed providers
-- ---------------------------------------------------------------------------
-- Note: Dropping the anonymous check constraint if it exists. 
-- In some environments this might need the specific name assigned by PG.
ALTER TABLE auth_identities DROP CONSTRAINT IF EXISTS auth_identities_provider_check;
ALTER TABLE auth_identities ADD CONSTRAINT auth_identities_provider_check 
  CHECK (provider IN ('github', 'google', 'apple', 'local'));

-- ---------------------------------------------------------------------------
-- Tokens for verification and reset
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- +goose Down
-- In standard practice we keep migrations additive, but for dev:
-- ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
-- DROP TABLE IF EXISTS email_verification_tokens;
-- DROP TABLE IF EXISTS password_reset_tokens;
-- ALTER TABLE auth_identities DROP CONSTRAINT IF EXISTS auth_identities_provider_check;
-- ALTER TABLE auth_identities ADD CONSTRAINT auth_identities_provider_check 
--   CHECK (provider IN ('github', 'google', 'apple'));
