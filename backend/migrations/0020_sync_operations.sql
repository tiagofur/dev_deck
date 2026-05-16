-- 0020_sync_operations.sql
-- Fase 21: Offline-first sync operations

CREATE TABLE IF NOT EXISTS sync_operations (
    client_id UUID NOT NULL,
    operation_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity TEXT NOT NULL,
    entity_id UUID NOT NULL,
    op TEXT NOT NULL CHECK (op IN ('create', 'update', 'delete')),
    payload JSONB NOT NULL,
    client_updated_at TIMESTAMPTZ NOT NULL,
    server_applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (client_id, operation_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_operations_user_applied ON sync_operations(user_id, server_applied_at);
