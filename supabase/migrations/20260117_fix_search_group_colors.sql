-- Fix Group Colors in Search (Classic + Hybrid)
-- Date: 2026-01-17

-- 1. Update Materialized View for Hybrid Search
DROP MATERIALIZED VIEW IF EXISTS vw_searchable_entities CASCADE;

CREATE MATERIALIZED VIEW vw_searchable_entities AS
SELECT 
  'performance' AS entity_type,
  id,
  title AS name,
  notes AS description,
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

-- Excluding 'items' as table does not exist and performance_props lacks embeddings
-- If items feature returns, restore this block with correct table/cols

SELECT 
  'group' AS entity_type,
  g.id,
  g.name,
  NULL AS description,
  COALESCE(g.embedding_identity, g.embedding) AS embedding_identity,
  g.embedding_physical,
  g.embedding_context,
  g.created_at AS updated_at,
  '/groups?viewGroup=' || g.id AS url,
  NULL AS image_url,
  jsonb_build_object(
    'icon', g.icon, 
    'color', g.color,
    'performance_color', (SELECT p.color FROM performances p WHERE p.id = g.performance_id),
    'location_name', (SELECT l.name FROM locations l WHERE l.id = g.location_id)
  ) AS metadata
FROM groups g
WHERE g.deleted_at IS NULL

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
  '/locations/' || id AS url,
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

-- Recreate indexes
CREATE UNIQUE INDEX idx_searchable_entities_unique ON vw_searchable_entities (entity_type, id);
CREATE INDEX idx_searchable_entities_fts ON vw_searchable_entities USING gin((setweight(to_tsvector('simple', name), 'A') || setweight(to_tsvector('simple', COALESCE(description, '')), 'B')));
CREATE INDEX idx_searchable_entities_trgm ON vw_searchable_entities USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_searchable_entities_identity ON vw_searchable_entities USING hnsw (embedding_identity vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_searchable_entities_physical ON vw_searchable_entities USING hnsw (embedding_physical vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_searchable_entities_context ON vw_searchable_entities USING hnsw (embedding_context vector_cosine_ops);

-- Restore function search_global_hybrid_mv (dropped cascade)
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

  BEGIN
    search_query := to_tsquery('simple', replace(plainto_tsquery('simple', query_text)::text, '''', ''':*'));
  EXCEPTION WHEN OTHERS THEN
    search_query := websearch_to_tsquery('simple', query_text);
  END;
  
  IF search_query IS NULL THEN
     search_query := websearch_to_tsquery('simple', query_text);
  END IF;

  RETURN QUERY
  SELECT 
    v.entity_type, v.id, v.name, v.description, v.url, v.image_url, v.metadata,
    ts_rank(setweight(to_tsvector('simple', v.name), 'A') || setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B'), search_query)::float as score,
    'fts'::text as match_type
  FROM vw_searchable_entities v
  WHERE (setweight(to_tsvector('simple', v.name), 'A') || setweight(to_tsvector('simple', COALESCE(v.description, '')), 'B')) @@ search_query
  
  UNION ALL
  
  SELECT 
    v.entity_type, v.id, v.name, v.description, v.url, v.image_url, v.metadata,
    (COALESCE((1 - (v.embedding_identity <=> query_embedding)), 0) * weight_identity +
     COALESCE((1 - (v.embedding_physical <=> query_embedding)), 0) * weight_physical +
     COALESCE((1 - (v.embedding_context <=> query_embedding)), 0) * weight_context)::float as score,
    'vector'::text as match_type
  FROM vw_searchable_entities v
  WHERE (v.embedding_identity IS NOT NULL OR v.embedding_physical IS NOT NULL OR v.embedding_context IS NOT NULL)
    AND (COALESCE((1 - (v.embedding_identity <=> query_embedding)), 0) * weight_identity +
         COALESCE((1 - (v.embedding_physical <=> query_embedding)), 0) * weight_physical +
         COALESCE((1 - (v.embedding_context <=> query_embedding)), 0) * weight_context) > match_threshold
  
  UNION ALL
  
  SELECT 
    v.entity_type, v.id, v.name, v.description, v.url, v.image_url, v.metadata,
    similarity(v.name, query_text)::float as score,
    'fuzzy'::text as match_type
  FROM vw_searchable_entities v
  WHERE similarity(v.name, query_text) > fuzzy_threshold
  
  ORDER BY score DESC
  LIMIT match_count * 3;
END;
$$ LANGUAGE plpgsql;

-- 2. Update Classic Search Function
CREATE OR REPLACE FUNCTION search_global_direct(
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

  BEGIN
    search_query := to_tsquery('simple', replace(plainto_tsquery('simple', query_text)::text, '''', ''':*'));
  EXCEPTION WHEN OTHERS THEN
    search_query := websearch_to_tsquery('simple', query_text);
  END;
  
  IF search_query IS NULL THEN
     search_query := websearch_to_tsquery('simple', query_text);
  END IF;

  RETURN QUERY
  -- 1. Search Performances (FTS)
  SELECT 
    'performance'::text AS entity_type,
    p.id, p.title AS name, p.notes AS description, '/performances/' || p.id AS url, p.image_url,
    jsonb_build_object(
      'color', p.color,
      'status', p.status,
      'next_show', (SELECT min(sc.show_date) FROM scene_checklists sc WHERE sc.performance_id = p.id AND sc.show_date > now())
    ) AS metadata,
    ts_rank(setweight(to_tsvector('simple', p.title), 'A') || setweight(to_tsvector('simple', COALESCE(p.notes, '')), 'B'), search_query)::float as score,
    'fts'::text as match_type
  FROM performances p
  WHERE (setweight(to_tsvector('simple', p.title), 'A') || setweight(to_tsvector('simple', COALESCE(p.notes, '')), 'B')) @@ search_query
  
  UNION ALL
  
  -- 2. Search Groups (FTS) - UPDATED
  SELECT 
    'group'::text AS entity_type,
    g.id, g.name, NULL AS description, '/groups?viewGroup=' || g.id AS url, NULL AS image_url,
    jsonb_build_object(
      'icon', g.icon, 
      'color', g.color,
      'performance_color', (SELECT p.color FROM performances p WHERE p.id = g.performance_id),
      'location_name', (SELECT l.name FROM locations l WHERE l.id = g.location_id)
    ) AS metadata,
    ts_rank(to_tsvector('simple', g.name), search_query)::float as score,
    'fts'::text as match_type
  FROM groups g
  WHERE g.deleted_at IS NULL
    AND to_tsvector('simple', g.name) @@ search_query
  
  UNION ALL
  
  -- 3. Search Locations (FTS)
  SELECT 
    'location'::text AS entity_type,
    l.id, l.name, l.description, '/locations/' || l.id AS url, NULL AS image_url,
    jsonb_build_object('type', l.type) AS metadata,
    ts_rank(setweight(to_tsvector('simple', l.name), 'A') || setweight(to_tsvector('simple', COALESCE(l.description, '')), 'B'), search_query)::float as score,
    'fts'::text as match_type
  FROM locations l
  WHERE l.deleted_at IS NULL
    AND (setweight(to_tsvector('simple', l.name), 'A') || setweight(to_tsvector('simple', COALESCE(l.description, '')), 'B')) @@ search_query
  
  UNION ALL
  
  -- 4. Search Notes (FTS)
  SELECT 
    'note'::text AS entity_type,
    n.id, n.title AS name, n.content::text AS description, '/notes/' || n.id AS url, NULL AS image_url, NULL AS metadata,
    ts_rank(setweight(to_tsvector('simple', n.title), 'A') || setweight(to_tsvector('simple', COALESCE(n.content::text, '')), 'B'), search_query)::float as score,
    'fts'::text as match_type
  FROM notes n
  WHERE (setweight(to_tsvector('simple', n.title), 'A') || setweight(to_tsvector('simple', COALESCE(n.content::text, '')), 'B')) @@ search_query
  
  UNION ALL
  
  -- 5. Fuzzy matching (Performances)
  SELECT 
    'performance'::text AS entity_type,
    p.id, p.title AS name, p.notes AS description, '/performances/' || p.id AS url, p.image_url,
    jsonb_build_object(
      'color', p.color,
      'status', p.status,
      'next_show', (SELECT min(sc.show_date) FROM scene_checklists sc WHERE sc.performance_id = p.id AND sc.show_date > now())
    ) AS metadata,
    similarity(p.title, query_text)::float as score,
    'fuzzy'::text as match_type
  FROM performances p
  WHERE similarity(p.title, query_text) > fuzzy_threshold
  
  UNION ALL
  
  -- 6. Fuzzy matching (Groups) - UPDATED
  SELECT 
    'group'::text AS entity_type,
    g.id, g.name, NULL AS description, '/groups?viewGroup=' || g.id AS url, NULL AS image_url,
    jsonb_build_object(
      'icon', g.icon, 
      'color', g.color,
      'performance_color', (SELECT p.color FROM performances p WHERE p.id = g.performance_id),
      'location_name', (SELECT l.name FROM locations l WHERE l.id = g.location_id)
    ) AS metadata,
    similarity(g.name, query_text)::float as score,
    'fuzzy'::text as match_type
  FROM groups g
  WHERE g.deleted_at IS NULL
    AND similarity(g.name, query_text) > fuzzy_threshold
  
  UNION ALL
  
  -- 7. Fuzzy matching (Locations)
  SELECT 
    'location'::text AS entity_type,
    l.id, l.name, l.description, '/locations/' || l.id AS url, NULL AS image_url,
    jsonb_build_object('type', l.type) AS metadata,
    similarity(l.name, query_text)::float as score,
    'fuzzy'::text as match_type
  FROM locations l
  WHERE l.deleted_at IS NULL
    AND similarity(l.name, query_text) > fuzzy_threshold
  
  UNION ALL
  
  -- 8. Fuzzy matching (Notes)
  SELECT 
    'note'::text AS entity_type,
    n.id, n.title AS name, n.content::text AS description, '/notes/' || n.id AS url, NULL AS image_url, NULL AS metadata,
    similarity(n.title, query_text)::float as score,
    'fuzzy'::text as match_type
  FROM notes n
  WHERE similarity(n.title, query_text) > fuzzy_threshold
  
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION search_global_direct(text, float, int, float) TO authenticated;
GRANT EXECUTE ON FUNCTION search_global_hybrid_mv(text, vector(768), float, float, float, float, int, float) TO authenticated;
