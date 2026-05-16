-- 0031_webhooks.sql
-- Fase 37: Outbound Event Webhooks

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '[]', -- subscribed event actions: ["item.created", ...]
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- An enricher must belong to either an org or a user
    CONSTRAINT webhooks_owner_check CHECK (
        (org_id IS NOT NULL AND user_id IS NULL) OR
        (org_id IS NULL AND user_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id) WHERE user_id IS NOT NULL;
