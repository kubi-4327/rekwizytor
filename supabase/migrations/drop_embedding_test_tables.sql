-- Drop embedding test tables from Supabase
-- These tables are now in PocketBase for local testing only

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS embedding_test_results CASCADE;
DROP TABLE IF EXISTS embedding_test_runs CASCADE;
DROP TABLE IF EXISTS embedding_test_queue CASCADE;
DROP TABLE IF EXISTS embedding_regeneration_jobs CASCADE;

-- Verify tables are dropped
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'embedding_%';
