-- 0033_reputation.sql
-- Fase 42: Gamification and Community rankings

-- 1. Add reputation_points to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS reputation_points INTEGER NOT NULL DEFAULT 0;

-- 2. Index for leaderboard performance
CREATE INDEX IF NOT EXISTS idx_users_reputation ON users(reputation_points DESC);

-- 3. Update profile function to include reputation_points
-- We DROP first because return types change (adding columns)
DROP FUNCTION IF EXISTS get_user_by_username(TEXT);

CREATE OR REPLACE FUNCTION get_user_by_username(p_username TEXT)
RETURNS TABLE (
    id UUID,
    username TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ,
    public_decks_count BIGINT,
    followers_count BIGINT,
    following_count BIGINT,
    reputation_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id, u.username, u.bio, u.avatar_url, u.created_at,
        (SELECT count(*) FROM decks d WHERE d.user_id = u.id AND d.is_public = true) as public_decks_count,
        (SELECT count(*) FROM follows f WHERE f.following_id = u.id) as followers_count,
        (SELECT count(*) FROM follows f WHERE f.follower_id = u.id) as following_count,
        u.reputation_points
    FROM users u
    WHERE u.username = p_username;
END;
$$ LANGUAGE plpgsql;
