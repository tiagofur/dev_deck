-- +goose Up
-- Extend user profiles with stack_tags, website, location, github_url

ALTER TABLE users ADD COLUMN IF NOT EXISTS stack_tags TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url TEXT;

-- Recreate the user_public_profile view to include the new fields
DROP VIEW IF EXISTS user_public_profile;
CREATE OR REPLACE VIEW user_public_profile AS
SELECT 
    u.id,
    u.username,
    u.bio,
    u.avatar_url,
    u.created_at,
    u.stack_tags,
    u.website,
    u.location,
    u.github_url,
    u.reputation_points,
    (SELECT count(*) FROM decks d WHERE d.user_id = u.id AND d.is_public = true) as public_decks_count,
    (SELECT count(*) FROM follows f WHERE f.following_id = u.id) as followers_count,
    (SELECT count(*) FROM follows f WHERE f.follower_id = u.id) as following_count,
    (SELECT count(*) FROM items i WHERE i.user_id = u.id) as total_items
FROM users u
WHERE u.username IS NOT NULL
GROUP BY u.id, u.username, u.bio, u.avatar_url, u.created_at, u.stack_tags, u.website, u.location, u.github_url, u.reputation_points;

-- +goose Down
DROP VIEW IF EXISTS user_public_profile;
CREATE OR REPLACE VIEW user_public_profile AS
SELECT 
    u.id,
    u.username,
    u.bio,
    u.avatar_url,
    u.created_at,
    COUNT(DISTINCT d.id) FILTER (WHERE d.is_public) as public_decks_count,
    COUNT(DISTINCT i.id) as total_items
FROM users u
LEFT JOIN decks d ON d.user_id = u.id
LEFT JOIN items i ON i.user_id = u.id
WHERE u.username IS NOT NULL
GROUP BY u.id, u.username, u.bio, u.avatar_url, u.created_at;

ALTER TABLE users DROP COLUMN IF EXISTS stack_tags;
ALTER TABLE users DROP COLUMN IF EXISTS website;
ALTER TABLE users DROP COLUMN IF EXISTS location;
ALTER TABLE users DROP COLUMN IF EXISTS github_url;
