-- Migration: Update search function with hierarchical deduplication
-- Date: 2026-01-06
-- Purpose: Prevent duplicate results across FTS, Fuzzy, and Vector searches

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
) AS $$
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
  WITH 
  -- 1. FTS results (highest priority)
  fts_results AS (
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
  ),
  
  -- 2. Fuzzy results (medium priority) - exclude FTS matches
  fuzzy_results AS (
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
        SELECT 1 FROM fts_results f 
        WHERE f.entity_type = v.entity_type AND f.id = v.id
      )
  ),
  
  -- 3. Vector results (lowest priority) - exclude FTS and Fuzzy matches
  vector_results AS (
    SELECT 
      v.entity_type,
      v.id,
      v.name,
      v.description,
      v.url,
      v.image_url,
      v.metadata,
      (1 - (v.embedding <=> query_embedding))::float as score,
      'vector'::text as match_type
    FROM vw_searchable_entities v
    WHERE v.embedding IS NOT NULL 
      AND 1 - (v.embedding <=> query_embedding) > match_threshold
      AND NOT EXISTS (
        SELECT 1 FROM fts_results f 
        WHERE f.entity_type = v.entity_type AND f.id = v.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM fuzzy_results fz 
        WHERE fz.entity_type = v.entity_type AND fz.id = v.id
      )
  )
  
  -- Combine all results with priority order
  SELECT * FROM fts_results
  UNION ALL
  SELECT * FROM fuzzy_results
  UNION ALL
  SELECT * FROM vector_results
  
  ORDER BY 
    CASE match_type
      WHEN 'fts' THEN 1
      WHEN 'fuzzy' THEN 2
      WHEN 'vector' THEN 3
    END,
    score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
