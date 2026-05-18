-- 0036_scim_and_groups.sql
-- Fase 46: SCIM 2.0 Provisioning and Organizational Groups

-- 1. SCIM Access Tokens per Organization
CREATE TABLE IF NOT EXISTS scim_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scim_tokens_org ON scim_tokens(org_id);

-- 2. Organizational Groups
CREATE TABLE IF NOT EXISTS org_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    external_id TEXT, -- ID from Okta/Azure AD
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_groups_name ON org_groups(org_id, name);

-- 3. Group Members
CREATE TABLE IF NOT EXISTS org_group_members (
    group_id UUID NOT NULL REFERENCES org_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_group_members_user ON org_group_members(user_id);
