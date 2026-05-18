-- 0035_saml_configs.sql
-- Fase 45: SAML 2.0 Identity Provider configuration

CREATE TABLE IF NOT EXISTS saml_configs (
    org_id UUID PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
    idp_entity_id TEXT NOT NULL,
    idp_sso_url TEXT NOT NULL,
    idp_x509_cert TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for domain-based routing (Email Homeing)
CREATE INDEX IF NOT EXISTS idx_saml_configs_domain ON saml_configs(domain);

-- Add sso_provider to users to track JIT provisioning
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider TEXT;
