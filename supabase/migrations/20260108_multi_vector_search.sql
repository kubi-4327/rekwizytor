-- Migration: Implement Multi-Vector Search (Identity, Physical, Context)
-- Date: 2026-01-08
-- Purpose: Split embeddings into 3 vectors for better semantic precision and dynamic weighting

-- ============================================
-- 1. ADD MULTI-VECTOR COLUMNS TO GROUPS
-- ============================================

ALTER TABLE groups 
  ADD COLUMN IF NOT EXISTS embedding_identity vector(768),
  ADD COLUMN IF NOT EXISTS embedding_physical vector(768),
  ADD COLUMN IF NOT EXISTS embedding_context vector(768);

-- Create HNSW indexes for performance (better than IVFFlat for high dimensions)
-- Using vector_cosine_ops for cosine similarity
CREATE INDEX IF NOT EXISTS groups_embedding_identity_idx ON groups USING hnsw (embedding_identity vector_cosine_ops);
CREATE INDEX IF NOT EXISTS groups_embedding_physical_idx ON groups USING hnsw (embedding_physical vector_cosine_ops);
CREATE INDEX IF NOT EXISTS groups_embedding_context_idx ON groups USING hnsw (embedding_context vector_cosine_ops);

-- ============================================
-- 2. UPDATE MATERIALIZED VIEW
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS vw_searchable_entities CASCADE;

CREATE MATERIALIZED VIEW vw_searchable_entities AS
SELECT 
  'performance' AS entity_type,
  id,
  title AS name,
  notes AS description,
  -- Map standard embedding to Identity for entities without MV distinction
  embedding::vector(768) AS embedding_identity,
  NULL::vector(768) AS embedding_physical,
  NULL::vector(768) AS embedding_context,
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
  embedding::vector(768) AS embedding_identity,
  NULL::vector(768) AS embedding_physical,
  NULL::vector(768) AS embedding_context,
  updated_at,
  '/items/' || id AS url,
  image_url,
  jsonb_build_object(
    'status', status,
    'attributes', attributes,
    'group_id', group_id
  ) AS metadata
FROM items
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'group' AS entity_type,
  id,
  name,
  NULL AS description,
  -- For groups, we use the specific MV columns. 
  -- Fallback to old embedding if MV columns are null (during migration)
  COALESCE(embedding_identity, embedding) AS embedding_identity,
  embedding_physical,
  embedding_context,
  created_at AS updated_at,
  '/groups?viewGroup=' || id AS url,
  NULL AS image_url,
  jsonb_build_object(
    'icon', icon, 
    'color', color,
    'location_name', (SELECT name FROM locations WHERE id = groups.location_id)
  ) AS metadata
FROM groups
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'location' AS entity_type,
  id,
  name,
  description,
  embedding::vector(768) AS embedding_identity,
  NULL::vector(768) AS embedding_physical,
  NULL::vector(768) AS embedding_context,
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
  embedding::vector(768) AS embedding_identity,
  NULL::vector(768) AS embedding_physical,
  NULL::vector(768) AS embedding_context,
  updated_at,
  '/notes/' || id AS url,
  NULL AS image_url,
  NULL AS metadata
FROM notes;

-- ============================================
-- 3. RECREATE VIEW INDEXES
-- ============================================

CREATE UNIQUE INDEX idx_searchable_entities_unique 
ON vw_searchable_entities (entity_type, id);

-- FTS Index
CREATE INDEX idx_searchable_entities_fts 
ON vw_searchable_entities 
USING gin(
  (setweight(to_tsvector('simple', name), 'A') || 
   setweight(to_tsvector('simple', COALESCE(description, '')), 'B'))
);

-- Fuzzy Index
CREATE INDEX idx_searchable_entities_trgm 
ON vw_searchable_entities 
USING gin(name gin_trgm_ops);

-- Vector Indexes (HNSW)
CREATE INDEX IF NOT EXISTS idx_searchable_entities_identity 
ON vw_searchable_entities USING hnsw (embedding_identity vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_searchable_entities_physical 
ON vw_searchable_entities USING hnsw (embedding_physical vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_searchable_entities_context 
ON vw_searchable_entities USING hnsw (embedding_context vector_cosine_ops);


-- ============================================
-- 4. CREATE MULTI-VECTOR SEARCH FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION search_global_hybrid_mv(
  query_text text,
  query_embedding vector(768),
  weight_identity float DEFAULT 0.5,
  weight_physical float DEFAULT 0.3,
  weight_context float DEFAULT 0.2,
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

  -- Build tsquery
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
  -- 1. Full-text search results
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
  
  UNION ALL
  
  -- 2. Multi-Vector Semantic Search
  SELECT 
    v.entity_type,
    v.id,
    v.name,
    v.description,
    v.url,
    v.image_url,
    v.metadata,
    (
        -- Calculate weighted score
        COALESCE((1 - (v.embedding_identity <=> query_embedding)), 0) * weight_identity +
        COALESCE((1 - (v.embedding_physical <=> query_embedding)), 0) * weight_physical +
        COALESCE((1 - (v.embedding_context <=> query_embedding)), 0) * weight_context
    )::float as score,
    'vector'::text as match_type
  FROM vw_searchable_entities v
  WHERE 
    -- Ensure at least one embedding exists
    (v.embedding_identity IS NOT NULL OR v.embedding_physical IS NOT NULL OR v.embedding_context IS NOT NULL)
    AND
    (
        COALESCE((1 - (v.embedding_identity <=> query_embedding)), 0) * weight_identity +
        COALESCE((1 - (v.embedding_physical <=> query_embedding)), 0) * weight_physical +
        COALESCE((1 - (v.embedding_context <=> query_embedding)), 0) * weight_context
    ) > match_threshold
  
  UNION ALL
  
  -- 3. Fuzzy matching
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
  
  -- Final Sort
  ORDER BY score DESC
  LIMIT match_count * 3;
END;
$$ LANGUAGE plpgsql;
