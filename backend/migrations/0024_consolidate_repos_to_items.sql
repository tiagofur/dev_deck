-- 0024_consolidate_repos_to_items.sql
-- Wave 7: DB Consolidation (Merging repos into items)

-- 1. Migrate data from repos to items
-- We map legacy columns to the items.meta JSONB field.
INSERT INTO items (
  id, user_id, item_type, title, url, url_normalized, description, notes, tags, 
  archived, created_at, updated_at, last_seen_at, source_channel, enrichment_status, meta
)
SELECT 
  id, user_id, 'repo', name, url, url_normalized, description, notes, tags,
  archived, added_at, added_at, last_seen_at, 'legacy-repo', 'ok',
  jsonb_build_object(
    'source', source,
    'owner', owner,
    'language', language,
    'language_color', language_color,
    'stars', stars,
    'forks', forks,
    'avatar_url', avatar_url,
    'og_image_url', og_image_url,
    'homepage', homepage,
    'topics', topics,
    'last_fetched_at', last_fetched_at
  )
FROM repos
ON CONFLICT (id) DO NOTHING;

-- 2. Update deck_items constraint
-- In case it was pointing to repos.
ALTER TABLE deck_items DROP CONSTRAINT IF EXISTS deck_items_item_id_fkey;
ALTER TABLE deck_items ADD CONSTRAINT deck_items_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- 3. Update repo_commands to item_commands
ALTER TABLE IF EXISTS repo_commands RENAME TO item_commands;
ALTER TABLE IF EXISTS item_commands RENAME COLUMN repo_id TO item_id;
-- Update constraints
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repo_commands_repo_id_fkey') THEN
        ALTER TABLE item_commands DROP CONSTRAINT repo_commands_repo_id_fkey;
    END IF;
END $$;
ALTER TABLE item_commands ADD CONSTRAINT item_commands_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- 4. Update repo_cheatsheet_links to item_cheatsheet_links
ALTER TABLE IF EXISTS repo_cheatsheet_links RENAME TO item_cheatsheet_links;
ALTER TABLE IF EXISTS item_cheatsheet_links RENAME COLUMN repo_id TO item_id;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repo_cheatsheet_links_repo_id_fkey') THEN
        ALTER TABLE item_cheatsheet_links DROP CONSTRAINT repo_cheatsheet_links_repo_id_fkey;
    END IF;
END $$;
ALTER TABLE item_cheatsheet_links ADD CONSTRAINT item_cheatsheet_links_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- 5. Final cleanup: Drop legacy table
-- WARNING: This is destructive. We assume every repo is successfully migrated.
DROP TABLE IF EXISTS repos;
