-- 0015_decks.sql
-- Fase 23: Shared decks

-- Decks table
CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    slug VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

-- Deck items (junction table)
CREATE TABLE IF NOT EXISTS deck_items (
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (deck_id, item_id)
);

-- Deck stars (for discovering popular decks)
CREATE TABLE IF NOT EXISTS deck_stars (
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    starred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (deck_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS decks_slug_idx ON decks (slug) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS decks_user_idx ON decks (user_id);
CREATE INDEX IF NOT EXISTS deck_items_deck_idx ON deck_items (deck_id);
CREATE INDEX IF NOT EXISTS deck_items_position_idx ON deck_items (deck_id, position);
CREATE INDEX IF NOT EXISTS deck_stars_deck_idx ON deck_stars (deck_id);

-- Helper to generate unique slug
CREATE OR REPLACE FUNCTION generate_deck_slug(title_text TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    new_slug TEXT;
    cnt INTEGER := 0;
BEGIN
    -- Create base slug from title
    base_slug := LOWER(REGEXP_REPLACE(title_text, '[^a-z0-9]+', '-', 'g'));
    base_slug := TRIM(BOTH '-' FROM base_slug);
    IF base_slug = '' OR base_slug IS NULL THEN
        base_slug := 'deck';
    END IF;
    
    -- Find unique slug
    LOOP
        IF cnt = 0 THEN
            new_slug := base_slug;
        ELSE
            new_slug := base_slug || '-' || cnt;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM decks 
            WHERE slug = new_slug AND user_id = generate_deck_slug.user_id
        ) THEN
            RETURN new_slug;
        END IF;
        
        cnt := cnt + 1;
        IF cnt > 100 THEN
            -- Fallback to random
            RETURN substr(md5(gen_random_uuid()::text), 1, 10);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get public deck by slug (no auth required)
CREATE OR REPLACE FUNCTION get_public_deck(p_slug TEXT)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    item_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        COUNT(di.item_id)::BIGINT as item_count
    FROM decks d
    LEFT JOIN deck_items di ON di.deck_id = d.id
    WHERE d.slug = p_slug AND d.is_public = true
    GROUP BY d.id, d.title, d.description;
END;
$$ LANGUAGE plpgsql;