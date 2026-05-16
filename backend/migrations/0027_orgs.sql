-- 0027_orgs.sql
-- Fase 33: Support for Teams and Organizations

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Organization members table
CREATE TABLE IF NOT EXISTS org_members (
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, user_id)
);

-- 3. Add org_id to core entities
ALTER TABLE items ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id) ON DELETE CASCADE;
ALTER TABLE runbooks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id) ON DELETE CASCADE;

-- 4. Indexes for org filtering
CREATE INDEX IF NOT EXISTS idx_items_org ON items(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decks_org ON decks(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_runbooks_org ON runbooks(org_id) WHERE org_id IS NOT NULL;

-- 5. Helper function for slug generation (simplified)
CREATE OR REPLACE FUNCTION generate_org_slug(p_name TEXT) 
RETURNS TEXT AS $$
DECLARE
    v_slug TEXT;
BEGIN
    v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    RETURN v_slug;
END;
$$ LANGUAGE plpgsql;
