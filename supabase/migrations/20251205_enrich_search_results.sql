-- Update the view to include image_url and metadata
DROP MATERIALIZED VIEW IF EXISTS vw_searchable_entities;
DROP VIEW IF EXISTS vw_searchable_entities;

CREATE OR REPLACE VIEW vw_searchable_entities AS
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

-- Recreate Materialized View
CREATE MATERIALIZED VIEW vw_searchable_entities AS
SELECT * FROM vw_searchable_entities;

-- Recreate Indexes
CREATE UNIQUE INDEX idx_searchable_entities_unique ON vw_searchable_entities (entity_type, id);
CREATE INDEX idx_searchable_entities_fts ON vw_searchable_entities USING gin(to_tsvector('simple', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_searchable_entities_embedding ON vw_searchable_entities USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Update Search Function
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
  image_url text,
  metadata jsonb,
  score float
) AS $$
DECLARE
  search_query tsquery;
BEGIN
  IF query_text IS NULL OR trim(query_text) = '' THEN
    RETURN;
  END IF;

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
  SELECT 
    v.entity_type,
    v.id,
    v.name,
    v.description,
    v.url,
    v.image_url,
    v.metadata,
    ts_rank(to_tsvector('simple', v.name || ' ' || COALESCE(v.description, '')), search_query)::float as score
  FROM vw_searchable_entities v
  WHERE to_tsvector('simple', v.name || ' ' || COALESCE(v.description, '')) @@ search_query
  ORDER BY score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
