-- Fix Classic Search - Remove ambiguous column references
-- Date: 2026-01-16
-- Purpose: Fix search_global_direct to use fully qualified column names

DROP FUNCTION IF EXISTS search_global_direct(text, float, int, float);

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
  -- 1. Search Performances (FTS)
  SELECT 
    'performance'::text AS entity_type,
    p.id,
    p.title AS name,
    p.notes AS description,
    '/performances/' || p.id AS url,
    p.image_url,
    jsonb_build_object(
      'color', p.color,
      'status', p.status,
      'next_show', (
        SELECT min(sc.show_date)
        FROM scene_checklists sc
        WHERE sc.performance_id = p.id
        AND sc.show_date > now()
      )
    ) AS metadata,
    ts_rank(
      setweight(to_tsvector('simple', p.title), 'A') || 
      setweight(to_tsvector('simple', COALESCE(p.notes, '')), 'B'),
      search_query
    )::float as score,
    'fts'::text as match_type
  FROM performances p
  WHERE (
    setweight(to_tsvector('simple', p.title), 'A') || 
    setweight(to_tsvector('simple', COALESCE(p.notes, '')), 'B')
  ) @@ search_query
  
  UNION ALL
  
  -- 2. Search Groups (FTS)
  SELECT 
    'group'::text AS entity_type,
    g.id,
    g.name,
    NULL AS description,
    '/groups?viewGroup=' || g.id AS url,
    NULL AS image_url,
    jsonb_build_object(
      'icon', g.icon, 
      'color', g.color,
      'location_name', (SELECT l.name FROM locations l WHERE l.id = g.location_id)
    ) AS metadata,
    ts_rank(
      to_tsvector('simple', g.name),
      search_query
    )::float as score,
    'fts'::text as match_type
  FROM groups g
  WHERE g.deleted_at IS NULL
    AND to_tsvector('simple', g.name) @@ search_query
  
  UNION ALL
  
  -- 3. Search Locations (FTS)
  SELECT 
    'location'::text AS entity_type,
    l.id,
    l.name,
    l.description,
    '/locations/' || l.id AS url,
    NULL AS image_url,
    jsonb_build_object('type', l.type) AS metadata,
    ts_rank(
      setweight(to_tsvector('simple', l.name), 'A') || 
      setweight(to_tsvector('simple', COALESCE(l.description, '')), 'B'),
      search_query
    )::float as score,
    'fts'::text as match_type
  FROM locations l
  WHERE l.deleted_at IS NULL
    AND (
      setweight(to_tsvector('simple', l.name), 'A') || 
      setweight(to_tsvector('simple', COALESCE(l.description, '')), 'B')
    ) @@ search_query
  
  UNION ALL
  
  -- 4. Search Notes (FTS)
  SELECT 
    'note'::text AS entity_type,
    n.id,
    n.title AS name,
    n.content::text AS description,
    '/notes/' || n.id AS url,
    NULL AS image_url,
    NULL AS metadata,
    ts_rank(
      setweight(to_tsvector('simple', n.title), 'A') || 
      setweight(to_tsvector('simple', COALESCE(n.content::text, '')), 'B'),
      search_query
    )::float as score,
    'fts'::text as match_type
  FROM notes n
  WHERE (
    setweight(to_tsvector('simple', n.title), 'A') || 
    setweight(to_tsvector('simple', COALESCE(n.content::text, '')), 'B')
  ) @@ search_query
  
  UNION ALL
  
  -- 5. Fuzzy matching (Performances)
  SELECT 
    'performance'::text AS entity_type,
    p.id,
    p.title AS name,
    p.notes AS description,
    '/performances/' || p.id AS url,
    p.image_url,
    jsonb_build_object(
      'color', p.color,
      'status', p.status,
      'next_show', (
        SELECT min(sc.show_date)
        FROM scene_checklists sc
        WHERE sc.performance_id = p.id
        AND sc.show_date > now()
      )
    ) AS metadata,
    similarity(p.title, query_text)::float as score,
    'fuzzy'::text as match_type
  FROM performances p
  WHERE similarity(p.title, query_text) > fuzzy_threshold
  
  UNION ALL
  
  -- 6. Fuzzy matching (Groups)
  SELECT 
    'group'::text AS entity_type,
    g.id,
    g.name,
    NULL AS description,
    '/groups?viewGroup=' || g.id AS url,
    NULL AS image_url,
    jsonb_build_object(
      'icon', g.icon, 
      'color', g.color,
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
    l.id,
    l.name,
    l.description,
    '/locations/' || l.id AS url,
    NULL AS image_url,
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
    n.id,
    n.title AS name,
    n.content::text AS description,
    '/notes/' || n.id AS url,
    NULL AS image_url,
    NULL AS metadata,
    similarity(n.title, query_text)::float as score,
    'fuzzy'::text as match_type
  FROM notes n
  WHERE similarity(n.title, query_text) > fuzzy_threshold
  
  -- Final Sort and Limit
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION search_global_direct(text, float, int, float) TO authenticated;

COMMENT ON FUNCTION search_global_direct IS 'Classic search using FTS and fuzzy matching. Searches: performances, groups, locations, notes. No materialized views or embeddings required.';
