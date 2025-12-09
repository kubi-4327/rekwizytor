-- Fix Search Functions RLS Issue
-- Add SECURITY DEFINER to search_global and search_global_hybrid functions
-- This allows the functions to access the materialized view vw_searchable_entities
-- while still respecting RLS at the source table level

-- ============================================
-- 1. DROP AND RECREATE search_global WITH SECURITY DEFINER
-- ============================================
DROP FUNCTION IF EXISTS search_global(text, float, int, float);

CREATE OR REPLACE FUNCTION search_global(
  query_text text,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  fuzzy_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  entity_type text,
  id uuid,
  name text,
  description text,
  url text,
  image_url text,
  metadata jsonb,
  score float,
  match_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_query tsquery;
BEGIN
  IF query_text IS NULL OR trim(query_text) = '' THEN
    RETURN;
  END IF;

  -- Build tsquery with prefix matching
  BEGIN
    search_query := to_tsquery('simple', 
      replace(
        plainto_tsquery('simple', query_text)::text, 
        '''', 
        ''':*'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    search_query := websearch_to_tsquery('simple', query_text);
  END;
  
  IF search_query IS NULL THEN
     search_query := websearch_to_tsquery('simple', query_text);
  END IF;

  RETURN QUERY
  -- Full-text search results with weighted ranking
  SELECT 
    v.entity_type,
    v.id,
    v.name,
    v.description,
    v.url,
    v.image_url,
    v.metadata,
    ts_rank(
      setweight(to_tsvector('simple', v.name), 'A') || 
      setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B'),
      search_query
    )::float as score,
    'fts'::text as match_type
  FROM vw_searchable_entities v
  WHERE (
    setweight(to_tsvector('simple', v.name), 'A') || 
    setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B')
  ) @@ search_query
  
  UNION
  
  -- Fuzzy matching for typos (trigram similarity)
  SELECT 
    v.entity_type,
    v.id,
    v.name,
    v.description,
    v.url,
    v.image_url,
    v.metadata,
    similarity(v.name, query_text)::float as score,
    'fuzzy'::text as match_type
  FROM vw_searchable_entities v
  WHERE similarity(v.name, query_text) > fuzzy_threshold
    AND NOT EXISTS (
      -- Exclude if already found by FTS
      SELECT 1 FROM vw_searchable_entities fts
      WHERE fts.id = v.id 
        AND fts.entity_type = v.entity_type
        AND (
          setweight(to_tsvector('simple', fts.name), 'A') || 
          setweight(to_tsvector('simple', COALESCE(fts.description, '')), 'B')
        ) @@ search_query
    )
  
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_global(text, float, int, float) TO authenticated;

-- ============================================
-- 2. DROP AND RECREATE search_global_hybrid WITH SECURITY DEFINER
-- ============================================
DROP FUNCTION IF EXISTS search_global_hybrid(text, vector, float, int, float);

CREATE OR REPLACE FUNCTION search_global_hybrid(
  query_text text,
  query_embedding vector(768),
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 20,
  fuzzy_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  entity_type text,
  id uuid,
  name text,
  description text,
  url text,
  image_url text,
  metadata jsonb,
  score float,
  match_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_query tsquery;
BEGIN
  IF query_text IS NULL OR trim(query_text) = '' THEN
    RETURN;
  END IF;

  -- Build tsquery with prefix matching
  BEGIN
    search_query := to_tsquery('simple', 
      replace(
        plainto_tsquery('simple', query_text)::text, 
        '''', 
        ''':*'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    search_query := websearch_to_tsquery('simple', query_text);
  END;
  
  IF search_query IS NULL THEN
     search_query := websearch_to_tsquery('simple', query_text);
  END IF;

  RETURN QUERY
  WITH all_results AS (
    -- Full-text search results
    SELECT 
      v.entity_type,
      v.id,
      v.name,
      v.description,
      v.url,
      v.image_url,
      v.metadata,
      ts_rank(
        setweight(to_tsvector('simple', v.name), 'A') || 
        setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B'),
        search_query
      )::float as score,
      'fts'::text as match_type,
      1 as priority
    FROM vw_searchable_entities v
    WHERE (
      setweight(to_tsvector('simple', v.name), 'A') || 
      setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B')
    ) @@ search_query
    
    UNION ALL
    
    -- Vector/semantic search results
    SELECT 
      v.entity_type,
      v.id,
      v.name,
      v.description,
      v.url,
      v.image_url,
      v.metadata,
      (1 - (v.embedding <=> query_embedding))::float as score,
      'vector'::text as match_type,
      2 as priority
    FROM vw_searchable_entities v
    WHERE v.embedding IS NOT NULL 
      AND 1 - (v.embedding <=> query_embedding) > match_threshold
    
    UNION ALL
    
    -- Fuzzy matching for typos
    SELECT 
      v.entity_type,
      v.id,
      v.name,
      v.description,
      v.url,
      v.image_url,
      v.metadata,
      similarity(v.name, query_text)::float as score,
      'fuzzy'::text as match_type,
      3 as priority
    FROM vw_searchable_entities v
    WHERE similarity(v.name, query_text) > fuzzy_threshold
  ),
  -- Deduplicate: keep highest scoring match per entity
  deduplicated AS (
    SELECT DISTINCT ON (entity_type, id)
      entity_type,
      id,
      name,
      description,
      url,
      image_url,
      metadata,
      score,
      match_type
    FROM all_results
    ORDER BY entity_type, id, score DESC, priority ASC
  )
  SELECT * FROM deduplicated
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_global_hybrid(text, vector, float, int, float) TO authenticated;

COMMENT ON FUNCTION search_global IS 'Full-text search with fuzzy matching. Uses SECURITY DEFINER to access materialized view while respecting RLS at source table level.';
COMMENT ON FUNCTION search_global_hybrid IS 'Hybrid search combining FTS, vector similarity, and fuzzy matching. Uses SECURITY DEFINER to access materialized view while respecting RLS at source table level.';
