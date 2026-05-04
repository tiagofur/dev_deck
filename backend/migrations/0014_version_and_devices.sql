-- 0014_version_and_devices.sql
-- Fase 22: Multi-device + versions

-- Add version column for optimistic locking
ALTER TABLE items ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add index for efficient version queries
CREATE INDEX IF NOT EXISTS items_version_idx ON items (user_id, version);

-- Create devices tracking table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255),
    client_id UUID NOT NULL UNIQUE,
    device_type VARCHAR(50) DEFAULT 'unknown', -- desktop, web, mobile, extension
    last_sync_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Index for user device lookup
CREATE INDEX IF NOT EXISTS devices_user_idx ON devices (user_id);

-- Enable updated_at with version auto-increment
-- This trigger handles version increment on update
CREATE OR REPLACE FUNCTION increment_item_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version := OLD.version + 1;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment version (commented out - can be enabled when ready)
-- DROP TRIGGER IF EXISTS item_version_trigger ON items;
-- CREATE TRIGGER item_version_trigger
--     BEFORE UPDATE ON items
--     FOR EACH ROW
--     WHEN (OLD.version IS NOT NULL)
--     EXECUTE FUNCTION increment_item_version();