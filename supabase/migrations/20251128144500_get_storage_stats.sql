CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS TABLE (
  category text,
  label text,
  size_bytes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- System Data
  RETURN QUERY SELECT 'System'::text, 'Categories (Groups)'::text, pg_total_relation_size('public.groups');
  RETURN QUERY SELECT 'System'::text, 'Locations'::text, pg_total_relation_size('public.locations');
  RETURN QUERY SELECT 'System'::text, 'Profiles'::text, pg_total_relation_size('public.profiles');

  -- Items Data
  RETURN QUERY SELECT 'Items'::text, 'All Items Data'::text, pg_total_relation_size('public.items');
  
  RETURN QUERY 
  SELECT 'Items'::text, 'AI Descriptions'::text, COALESCE(SUM(pg_column_size(ai_description)), 0)::bigint
  FROM public.items;

  RETURN QUERY 
  SELECT 'Items'::text, 'Item Notes'::text, COALESCE(SUM(pg_column_size(notes)), 0)::bigint
  FROM public.items;

  -- Notes Data
  RETURN QUERY 
  SELECT 'Notes'::text, 'Performance Notes'::text, COALESCE(SUM(pg_column_size(notes)), 0)::bigint
  FROM public.performances;
  
END;
$$;
