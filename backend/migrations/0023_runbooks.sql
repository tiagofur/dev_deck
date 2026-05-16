-- 0023_runbooks.sql
-- Fase 25: Operational context with Runbooks

CREATE TABLE IF NOT EXISTS runbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runbook_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    runbook_id UUID NOT NULL REFERENCES runbooks(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    command TEXT,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runbooks_item ON runbooks(item_id);
CREATE INDEX IF NOT EXISTS idx_runbook_steps_runbook ON runbook_steps(runbook_id, position);
