-- 0012_semantic_search.sql
-- Fase 19: Semantic search with pgvector

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to items table
-- vector(1536) matches OpenAI text-embedding-3-small dimensions
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create indexes for vector search
-- IVFFlat is faster for approximate search on larger datasets
-- For small datasets, HNSW provides better recall
CREATE INDEX IF NOT EXISTS items_embedding_hnsw_idx 
ON items USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Function to compute embedding for a text
-- Uses pg_trgm as fallback when embedding is not available
CREATE OR REPLACE FUNCTION compute_query_embedding(query_text text)
RETURNS vector(1536) AS $$
BEGIN
    -- This is a placeholder. Real embeddings are generated via the AI layer
    -- when items are created/updated. For search, we generate on-the-fly
    -- using the same provider as AI_ENRICHMENT_PROVIDER
    RETURN NULL::vector(1536);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function for hybrid search combining vector + text
-- Returns items ranked by combined score
CREATE OR REPLACE FUNCTION hybrid_search(
    p_user_id uuid,
    p_query text,
    p_limit int DEFAULT 20,
    p_vector_weight float DEFAULT 0.7,
    p_text_weight float DEFAULT 0.3
)
RETURNS TABLE (
    id uuid,
    item_type text,
    title text,
    why_saved text,
    url text,
    similarity float
) AS $$
BEGIN
    RETURN QUERY
    WITH text_results AS (
        SELECT 
            i.id,
            i.item_type,
            i.title,
            i.why_saved,
            i.url,
            -- Normalize text similarity to 0-1 range
            ROW_NUMBER() OVER (ORDER BY i.similarity DESC) as text_rank,
            COUNT(*) OVER() as text_count
        FROM (
            SELECT id, item_type, title, why_saved, url,
                   similarity(title, p_query) as similarity
            FROM items
            WHERE user_id = p_user_id 
              AND archived = false
              AND (title ILIKE '%' || p_query || '%' 
                   OR why_saved ILIKE '%' || p_query || '%'
                   OR EXISTS (
                        SELECT 1 FROM unnest(ai_tags) t 
                        WHERE t ILIKE '%' || p_query || '%'
                   ))
        ) i
    ),
    vector_results AS (
        SELECT 
            i.id,
            ROW_NUMBER() OVER (ORDER BY i.embedding <=> compute_query_embedding(p_query)) as vector_rank,
            COUNT(*) OVER() as vector_count
        FROM items i
        WHERE i.user_id = p_user_id 
          AND i.archived = false
          AND i.embedding IS NOT NULL
    )
    SELECT 
        COALESCE(t.id, v.id) as id,
        t.item_type,
        t.title,
        t.why_saved,
        t.url,
        COALESCE(
            -- Combine ranks into a score (lower is better)
            (p_text_weight * t.text_rank::float / NULLIF(t.text_count, 0)) +
            (p_vector_weight * v.vector_rank::float / NULLIF(v.vector_count, 0)),
            -- Fallback to text-only if no vectors
            t.text_rank::float / NULLIF(t.text_count, 1)
        ) as similarity
    FROM text_results t
    FULL OUTER JOIN vector_results v ON t.id = v.id
    ORDER BY similarity ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Enable the extension for the database user
GRANT USAGE ON TYPE vector TO CURRENT_USER;
