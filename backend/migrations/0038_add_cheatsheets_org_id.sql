-- 0038_add_cheatsheets_org_id.sql
-- Align cheatsheets ownership scope with org-aware ownerClause.

ALTER TABLE cheatsheets
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES orgs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_cheatsheets_org
  ON cheatsheets(org_id)
  WHERE org_id IS NOT NULL;
