-- Migration: Add embeddings to all entities and update search
-- Date: 2026-01-06
-- Purpose: Enable semantic search for groups, locations, and notes

-- ============================================
-- 1. ADD EMBEDDING COLUMNS
-- ============================================

-- Groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Locations  
ALTER TABLE locations ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS embedding vector(768);

-- ============================================
-- 2. CREATE INDEXES FOR VECTOR SEARCH
-- ============================================

-- Groups embedding index
CREATE INDEX IF NOT EXISTS groups_embedding_idx 
ON groups 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Locations embedding index
CREATE INDEX IF NOT EXISTS locations_embedding_idx 
ON locations 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Notes embedding index
CREATE INDEX IF NOT EXISTS notes_embedding_idx 
ON notes 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- 3. UPDATE MATERIALIZED VIEW
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS vw_searchable_entities CASCADE;

CREATE MATERIALIZED VIEW vw_searchable_entities AS
SELECT 
  'performance' AS entity_type,
  id,
  title AS name,
  notes AS description,
  embedding::vector(768) AS embedding,
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
  embedding::vector(768) AS embedding,  -- ✅ Now with embedding!
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
  embedding::vector(768) AS embedding,  -- ✅ Now with embedding!
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
  embedding::vector(768) AS embedding,  -- ✅ Now with embedding!
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

-- Trigram index for fuzzy matching
CREATE INDEX idx_searchable_entities_trgm 
ON vw_searchable_entities 
USING gin(name gin_trgm_ops);

-- Vector index for semantic search
CREATE INDEX IF NOT EXISTS idx_searchable_entities_embedding 
ON vw_searchable_entities 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- 5. UPDATE HYBRID SEARCH FUNCTION
-- ============================================
-- Remove deduplication to show FTS and embedding results separately

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
    'fts'::text as match_type
  FROM vw_searchable_entities v
  WHERE (
    setweight(to_tsvector('simple', v.name), 'A') || 
    setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B')
  ) @@ search_query
  
  UNION ALL
  
  -- Vector/semantic search results (no deduplication)
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
  
  UNION ALL
  
  -- Fuzzy matching for typos (no deduplication)
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
  
  ORDER BY score DESC
  LIMIT match_count * 3;  -- Allow more results since we're not deduplicating
END;
$$ LANGUAGE plpgsql;
