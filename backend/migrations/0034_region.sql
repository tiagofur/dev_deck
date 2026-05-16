-- 0034_region.sql
-- Fase 44: Multi-region support and Global Sync

-- 1. Add region to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR(20) NOT NULL DEFAULT 'us-east';

-- 2. Add region to sync_operations
ALTER TABLE sync_operations ADD COLUMN IF NOT EXISTS region VARCHAR(20) NOT NULL DEFAULT 'us-east';

-- 3. Indexes for routing and observability
CREATE INDEX IF NOT EXISTS idx_users_region ON users(region);
CREATE INDEX IF NOT EXISTS idx_sync_operations_region ON sync_operations(region);
