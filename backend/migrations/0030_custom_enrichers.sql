-- 0030_custom_enrichers.sql
-- Fase 36: Custom Enrichers (Plugins via HTTP Webhooks)

CREATE TABLE IF NOT EXISTS custom_enrichers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url_pattern TEXT NOT NULL, -- Regex pattern to match URLs
    endpoint_url TEXT NOT NULL, -- Webhook to call for enrichment
    auth_header TEXT, -- Optional "Authorization" header value
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- An enricher must belong to either an org or a user
    CONSTRAINT custom_enrichers_owner_check CHECK (
        (org_id IS NOT NULL AND user_id IS NULL) OR
        (org_id IS NULL AND user_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_custom_enrichers_org ON custom_enrichers(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_enrichers_user ON custom_enrichers(user_id) WHERE user_id IS NOT NULL;
