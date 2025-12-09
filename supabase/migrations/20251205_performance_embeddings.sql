-- Performance Embeddings Migration
-- Adds embedding column to performances and creates trigger for embedding generation

-- ============================================
-- 1. ADD EMBEDDING COLUMN TO PERFORMANCES
-- ============================================
ALTER TABLE performances 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create index for vector search
CREATE INDEX IF NOT EXISTS performances_embedding_idx 
ON performances 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- 2. UPDATE MATERIALIZED VIEW TO INCLUDE PERFORMANCE EMBEDDINGS
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS vw_searchable_entities;

CREATE MATERIALIZED VIEW vw_searchable_entities AS
SELECT 
  'performance' AS entity_type,
  id,
  title AS name,
  notes AS description,
  embedding::vector(768) AS embedding,  -- Now using actual embedding!
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

-- Recreate indexes
CREATE UNIQUE INDEX idx_searchable_entities_unique 
ON vw_searchable_entities (entity_type, id);

CREATE INDEX idx_searchable_entities_fts 
ON vw_searchable_entities 
USING gin(
  (setweight(to_tsvector('simple', name), 'A') || 
   setweight(to_tsvector('simple', COALESCE(description, '')), 'B'))
);

CREATE INDEX idx_searchable_entities_trgm 
ON vw_searchable_entities 
USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_searchable_entities_embedding 
ON vw_searchable_entities 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
