-- 0021_devices.sql
-- Fase 22: Device management for multi-device sync

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT 'Unknown Device',
    device_type TEXT NOT NULL DEFAULT 'unknown',
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
