-- 0016_user_profiles.sql
-- Fase 24: Public profile + multi-user

-- Add username and bio to users table (for public profiles)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add plan field
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free'; -- free, pro

-- Add rate limits per user (for AI protection)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_requests_monthly INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_requests_reset TIMESTAMPTZ;

-- Index for username lookup
CREATE INDEX IF NOT EXISTS users_username_idx ON users (username) WHERE username IS NOT NULL;

-- View for public user profile
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

-- Helper to find user by username (public)
CREATE OR REPLACE FUNCTION get_user_by_username(p_username TEXT)
RETURNS TABLE (
    id UUID,
    username TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ,
    public_decks_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.bio,
        u.avatar_url,
        u.created_at,
        COUNT(d.id)::BIGINT as public_decks_count
    FROM users u
    LEFT JOIN decks d ON d.user_id = u.id AND d.is_public = true
    WHERE u.username = p_username
    GROUP BY u.id, u.username, u.bio, u.avatar_url, u.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's public decks
CREATE OR REPLACE FUNCTION get_user_decks_public(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    slug TEXT,
    title TEXT,
    description TEXT,
    item_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.slug,
        d.title,
        d.description,
        COUNT(di.item_id)::BIGINT as item_count
    FROM decks d
    LEFT JOIN deck_items di ON di.deck_id = d.id
    WHERE d.user_id = p_user_id AND d.is_public = true
    GROUP BY d.id, d.slug, d.title, d.description
    ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql;