-- 0028_activity_log.sql
-- Fase 35: Audit Log and Activity Feed for Organizations

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- e.g. 'item.created', 'item.updated_notes', 'runbook.created'
    entity_type TEXT NOT NULL, -- 'item', 'runbook', 'deck'
    entity_id UUID NOT NULL,
    metadata JSONB, -- Contextual data like item title
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_org_created ON activity_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC);
