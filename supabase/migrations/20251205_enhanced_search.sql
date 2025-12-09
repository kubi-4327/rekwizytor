-- Enhanced Search Functions Migration
-- Adds: weighted ranking, trigram fuzzy matching, improved hybrid search, scheduled refresh

-- ============================================
-- 1. TRIGRAM EXTENSION FOR FUZZY MATCHING
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 2. DROP OLD TRIGGERS (too aggressive for MV refresh)
-- ============================================
DROP TRIGGER IF EXISTS refresh_search_performances ON performances;
DROP TRIGGER IF EXISTS refresh_search_items ON items;
DROP TRIGGER IF EXISTS refresh_search_groups ON groups;
DROP TRIGGER IF EXISTS refresh_search_locations ON locations;
DROP TRIGGER IF EXISTS refresh_search_notes ON notes;

-- Drop the function too since we won't need statement-level refresh
DROP FUNCTION IF EXISTS refresh_searchable_entities();

-- ============================================
-- 3. RECREATE MATERIALIZED VIEW WITH OPTIMIZATIONS
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS vw_searchable_entities;

CREATE MATERIALIZED VIEW vw_searchable_entities AS
SELECT 
  'performance' AS entity_type,
  id,
  title AS name,
  notes AS description,
  NULL::vector(768) AS embedding,
  updated_at,
  '/performances/' || id AS url,
  image_url,
  jsonb_build_object(
    'color', color,
    'status', status,
    'next_show', (
        SELECT min(show_date)
        FROM scene_checklists
        WHERE performance_id = performances.id
        AND show_date > now()
    )
  ) AS metadata
FROM performances
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'item' AS entity_type,
  id,
  name,
  COALESCE(ai_description, notes) AS description,
  embedding::vector(768),
  updated_at,
  '/items/' || id AS url,
  image_url,
  jsonb_build_object(
    'status', status,
    'attributes', attributes
  ) AS metadata
FROM items
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'group' AS entity_type,
  id,
  name,
  NULL AS description,
  NULL::vector(768) AS embedding,
  created_at AS updated_at,
  '/items?groupId=' || id AS url,
  NULL AS image_url,
  jsonb_build_object('icon', icon, 'color', color) AS metadata
FROM groups
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'location' AS entity_type,
  id,
  name,
  description,
  NULL::vector(768) AS embedding,
  created_at AS updated_at,
  '/items?locationId=' || id AS url,
  NULL AS image_url,
  jsonb_build_object('type', type) AS metadata
FROM locations
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'note' AS entity_type,
  id,
  title AS name,
  content::text AS description,
  NULL::vector(768) AS embedding,
  updated_at,
  '/notes/' || id AS url,
  NULL AS image_url,
  NULL AS metadata
FROM notes;

-- ============================================
-- 4. RECREATE INDEXES
-- ============================================
-- Unique index for concurrent refreshes
CREATE UNIQUE INDEX idx_searchable_entities_unique 
ON vw_searchable_entities (entity_type, id);

-- GIN index for Full Text Search with weighted vectors
CREATE INDEX idx_searchable_entities_fts 
ON vw_searchable_entities 
USING gin(
  (setweight(to_tsvector('simple', name), 'A') || 
   setweight(to_tsvector('simple', COALESCE(description, '')), 'B'))
);

-- Trigram index for fuzzy matching (typo tolerance)
CREATE INDEX idx_searchable_entities_trgm 
ON vw_searchable_entities 
USING gin(name gin_trgm_ops);

-- Vector index for semantic search
CREATE INDEX IF NOT EXISTS idx_searchable_entities_embedding 
ON vw_searchable_entities 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- 5. ENHANCED SEARCH FUNCTION WITH WEIGHTED RANKING + FUZZY
-- ============================================
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
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. IMPROVED HYBRID SEARCH WITH DEDUPLICATION
-- ============================================
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
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. MANUAL REFRESH FUNCTION (for admin use)
-- ============================================
CREATE OR REPLACE FUNCTION refresh_search_index()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vw_searchable_entities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (admin check should be in app layer)
GRANT EXECUTE ON FUNCTION refresh_search_index() TO authenticated;

-- ============================================
-- 8. SCHEDULED REFRESH WITH pg_cron (every 5 minutes)
-- ============================================
-- Note: pg_cron must be enabled in Supabase dashboard first

-- Check if pg_cron extension exists and create job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old job if exists
    PERFORM cron.unschedule('refresh-search-index');
    
    -- Schedule new job every 5 minutes
    PERFORM cron.schedule(
      'refresh-search-index',
      '*/5 * * * *',
      'SELECT refresh_search_index()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available, will rely on manual refresh
  RAISE NOTICE 'pg_cron not available. Use refresh_search_index() manually.';
END $$;
