-- 0017_fix_deck_slug_function.sql
-- Fix deck slug generation parameter scoping and volatility

CREATE OR REPLACE FUNCTION generate_deck_slug(title_text TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    new_slug TEXT;
    cnt INTEGER := 0;
BEGIN
    base_slug := LOWER(REGEXP_REPLACE(title_text, '[^a-z0-9]+', '-', 'g'));
    base_slug := TRIM(BOTH '-' FROM base_slug);
    IF base_slug = '' OR base_slug IS NULL THEN
        base_slug := 'deck';
    END IF;

    LOOP
        IF cnt = 0 THEN
            new_slug := base_slug;
        ELSE
            new_slug := base_slug || '-' || cnt;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM decks d
            WHERE d.slug = new_slug
              AND d.user_id = $2
        ) THEN
            RETURN new_slug;
        END IF;

        cnt := cnt + 1;
        IF cnt > 100 THEN
            RETURN substr(md5(gen_random_uuid()::text), 1, 10);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;
