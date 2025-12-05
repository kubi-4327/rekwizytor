-- Create a unified view for searchable entities
-- We use explicit casting to vector(768) to match items.embedding dimensions
CREATE OR REPLACE VIEW vw_searchable_entities AS
SELECT 
  'performance' AS entity_type,
  id,
  title AS name,
  notes AS description,
  NULL::vector(768) AS embedding,
  updated_at,
  '/performances/' || id AS url
FROM performances
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'item' AS entity_type,
  id,
  name,
  COALESCE(ai_description, notes) AS description,
  embedding::vector(768), -- Explicit cast to ensure dimensions match
  updated_at,
  '/items/' || id AS url
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
  '/items?groupId=' || id AS url
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
  '/items?locationId=' || id AS url
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
  '/notes/' || id AS url
FROM notes;

-- Drop the view to create materialized view (if we want to switch)
DROP VIEW IF EXISTS vw_searchable_entities;

CREATE MATERIALIZED VIEW vw_searchable_entities AS
SELECT 
  'performance' AS entity_type,
  id,
  title AS name,
  notes AS description,
  NULL::vector(768) AS embedding,
  updated_at,
  '/performances/' || id AS url
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
  '/items/' || id AS url
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
  '/items?groupId=' || id AS url
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
  '/items?locationId=' || id AS url
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
  '/notes/' || id AS url
FROM notes;

-- Unique index is required for concurrent refreshes
CREATE UNIQUE INDEX idx_searchable_entities_unique ON vw_searchable_entities (entity_type, id);

-- GIN index for Full Text Search
CREATE INDEX idx_searchable_entities_fts 
ON vw_searchable_entities 
USING gin(to_tsvector('simple', name || ' ' || COALESCE(description, '')));

-- Index for Vector Search (IVFFlat)
CREATE INDEX IF NOT EXISTS idx_searchable_entities_embedding 
ON vw_searchable_entities 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to refresh the view
CREATE OR REPLACE FUNCTION refresh_searchable_entities()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vw_searchable_entities;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to refresh the view
DROP TRIGGER IF EXISTS refresh_search_performances ON performances;
CREATE TRIGGER refresh_search_performances
AFTER INSERT OR UPDATE OR DELETE ON performances
FOR EACH STATEMENT EXECUTE FUNCTION refresh_searchable_entities();

DROP TRIGGER IF EXISTS refresh_search_items ON items;
CREATE TRIGGER refresh_search_items
AFTER INSERT OR UPDATE OR DELETE ON items
FOR EACH STATEMENT EXECUTE FUNCTION refresh_searchable_entities();

DROP TRIGGER IF EXISTS refresh_search_groups ON groups;
CREATE TRIGGER refresh_search_groups
AFTER INSERT OR UPDATE OR DELETE ON groups
FOR EACH STATEMENT EXECUTE FUNCTION refresh_searchable_entities();

DROP TRIGGER IF EXISTS refresh_search_locations ON locations;
CREATE TRIGGER refresh_search_locations
AFTER INSERT OR UPDATE OR DELETE ON locations
FOR EACH STATEMENT EXECUTE FUNCTION refresh_searchable_entities();

DROP TRIGGER IF EXISTS refresh_search_notes ON notes;
CREATE TRIGGER refresh_search_notes
AFTER INSERT OR UPDATE OR DELETE ON notes
FOR EACH STATEMENT EXECUTE FUNCTION refresh_searchable_entities();


-- Search Function (RPC)
CREATE OR REPLACE FUNCTION search_global(
  query_text text,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  entity_type text,
  id uuid,
  name text,
  description text,
  url text,
  score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.entity_type,
    v.id,
    v.name,
    v.description,
    v.url,
    ts_rank(to_tsvector('simple', v.name || ' ' || COALESCE(v.description, '')), websearch_to_tsquery('simple', query_text))::float as score
  FROM vw_searchable_entities v
  WHERE to_tsvector('simple', v.name || ' ' || COALESCE(v.description, '')) @@ websearch_to_tsquery('simple', query_text)
  ORDER BY score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Improved Hybrid Search Function
CREATE OR REPLACE FUNCTION search_global_hybrid(
  query_text text,
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  entity_type text,
  id uuid,
  name text,
  description text,
  url text,
  score float
) AS $$
BEGIN
  RETURN QUERY
  WITH fts_results AS (
    SELECT 
      v.entity_type,
      v.id,
      v.name,
      v.description,
      v.url,
      ts_rank(to_tsvector('simple', v.name || ' ' || COALESCE(v.description, '')), websearch_to_tsquery('simple', query_text))::float as score
    FROM vw_searchable_entities v
    WHERE to_tsvector('simple', v.name || ' ' || COALESCE(v.description, '')) @@ websearch_to_tsquery('simple', query_text)
    ORDER BY score DESC
    LIMIT match_count
  ),
  vector_results AS (
    SELECT 
      v.entity_type,
      v.id,
      v.name,
      v.description,
      v.url,
      (1 - (v.embedding <=> query_embedding))::float as score
    FROM vw_searchable_entities v
    WHERE v.embedding IS NOT NULL 
      AND 1 - (v.embedding <=> query_embedding) > match_threshold
    ORDER BY score DESC
    LIMIT match_count
  )
  SELECT * FROM fts_results
  UNION ALL
  SELECT * FROM vector_results
  ORDER BY score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
