-- 0013_offline_sync.sql
-- Fase 21: Offline-first with sync support

-- Enum types
DO $$ BEGIN
    CREATE TYPE operation_type AS ENUM ('create', 'update', 'delete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM ('item', 'repo', 'cheatsheet', 'cheatsheet_entry', 'command', 'deck', 'deck_item');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- SyncLog: audit trail for all sync operations
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    client_id UUID NOT NULL,
    operation_id UUID NOT NULL,
    operation operation_type NOT NULL,
    entity_type entity_type NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB,
    server_version INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- Index for efficient delta queries
CREATE INDEX IF NOT EXISTS sync_log_user_synced 
ON sync_log (user_id, client_id, synced_at NULLS FIRST, created_at);

CREATE INDEX IF NOT EXISTS sync_log_entity 
ON sync_log (entity_type, entity_id);

-- Unique constraint to prevent duplicate operation processing
ALTER TABLE sync_log 
ADD CONSTRAINT sync_log_unique UNIQUE (user_id, client_id, operation_id);

-- Function to get delta changes since timestamp
CREATE OR REPLACE FUNCTION get_sync_delta(
    p_user_id UUID,
    p_client_id UUID,
    p_since TIMESTAMPTZ
)
RETURNS TABLE (
    operation_id UUID,
    operation operation_type,
    entity_type entity_type,
    entity_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.operation_id,
        sl.operation,
        sl.entity_type,
        sl.entity_id,
        sl.payload,
        sl.created_at
    FROM sync_log sl
    WHERE sl.user_id = p_user_id
      AND sl.client_id != p_client_id  -- don't echo back own changes
      AND (sl.synced_at IS NULL OR sl.synced_at > p_since)
    ORDER BY sl.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to process batch sync from client
CREATE OR REPLACE FUNCTION process_sync_batch(
    p_user_id UUID,
    p_client_id UUID,
    p_operations JSONB
)
RETURNS TABLE (
    operation_id UUID,
    status TEXT,
    error TEXT,
    server_version INTEGER
) AS $$
DECLARE
    op JSONB;
    op_id UUID;
    op_type operation_type;
    ent_type entity_type;
    ent_id UUID;
    payload JSONB;
    v_server_version INTEGER;
BEGIN
    FOR op IN SELECT * FROM jsonb_array_elements(p_operations)
    LOOP
        op_id := (op->>'operation_id')::UUID;
        op_type := (op->>'operation')::operation_type;
        ent_type := (op->>'entity_type')::entity_type;
        ent_id := (op->>'entity_id')::UUID;
        payload := op->'payload';

        BEGIN
            -- Check if already processed (idempotent)
            IF EXISTS (
                SELECT 1 FROM sync_log 
                WHERE user_id = p_user_id 
                  AND client_id = p_client_id 
                  AND operation_id = op_id
                  AND synced_at IS NOT NULL
            ) THEN
                -- Already synced, get server version
                SELECT server_version INTO v_server_version
                FROM sync_log 
                WHERE user_id = p_user_id AND operation_id = op_id
                LIMIT 1;
                
                RETURN QUERY SELECT op_id, 'already_synced', NULL, v_server_version;
                CONTINUE;
            END IF;

            -- Process based on operation type
            CASE op_type
            WHEN 'create' THEN
                PERFORM process_sync_create(p_user_id, ent_type, ent_id, payload);
            WHEN 'update' THEN
                PERFORM process_sync_update(p_user_id, ent_type, ent_id, payload);
            WHEN 'delete' THEN
                PERFORM process_sync_delete(p_user_id, ent_type, ent_id);
            END CASE;

            -- Mark as synced
            UPDATE sync_log 
            SET synced_at = NOW(), 
                server_version = server_version + 1
            WHERE user_id = p_user_id 
              AND client_id = p_client_id 
              AND operation_id = op_id;

            RETURN QUERY SELECT op_id, 'success', NULL, v_server_version;

        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT op_id, 'error', SQLERRM, NULL;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Helper functions (placeholder implementations)
CREATE OR REPLACE FUNCTION process_sync_create(
    p_user_id UUID,
    p_entity_type entity_type,
    p_entity_id UUID,
    p_payload JSONB
) RETURNS VOID AS $$
BEGIN
    -- Would dispatch to actual create functions based on entity_type
    NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_sync_update(
    p_user_id UUID,
    p_entity_type entity_type,
    p_entity_id UUID,
    p_payload JSONB
) RETURNS VOID AS $$
BEGIN
    NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_sync_delete(
    p_user_id UUID,
    p_entity_type entity_type,
    p_entity_id UUID
) RETURNS VOID AS $$
BEGIN
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
