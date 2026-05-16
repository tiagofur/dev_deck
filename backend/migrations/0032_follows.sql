-- 0032_follows.sql
-- Fase 41: Social Follows system

CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Update profile function to include counts
-- We DROP first because CREATE OR REPLACE cannot change return types
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
    following_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id, u.username, u.bio, u.avatar_url, u.created_at,
        (SELECT count(*) FROM decks d WHERE d.user_id = u.id AND d.is_public = true) as public_decks_count,
        (SELECT count(*) FROM follows f WHERE f.following_id = u.id) as followers_count,
        (SELECT count(*) FROM follows f WHERE f.follower_id = u.id) as following_count
    FROM users u
    WHERE u.username = p_username;
END;
$$ LANGUAGE plpgsql;
