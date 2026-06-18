-- +goose Up
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
        u.id, u.username::TEXT, u.bio, u.avatar_url, u.created_at,
        (SELECT count(*) FROM decks d WHERE d.user_id = u.id AND d.is_public = true) as public_decks_count,
        (SELECT count(*) FROM follows f WHERE f.following_id = u.id) as followers_count,
        (SELECT count(*) FROM follows f WHERE f.follower_id = u.id) as following_count,
        u.reputation_points
    FROM users u
    WHERE u.username = p_username;
END;
$$ LANGUAGE plpgsql;

-- +goose Down
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
