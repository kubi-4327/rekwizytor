-- Database Schema Cleanup Migration
-- Removes unused tables and columns, replaces cost tracking with token counts

-- Drop unused tables
DROP TABLE IF EXISTS embedding_prompt_templates CASCADE;
DROP TABLE IF EXISTS embedding_model_configs CASCADE;

-- Clean embedding_test_results
ALTER TABLE embedding_test_results
    DROP COLUMN IF EXISTS reasoning,
    DROP COLUMN IF EXISTS latency_ms,
    DROP COLUMN IF EXISTS embedding_cost_usd,
    DROP COLUMN IF EXISTS tester_cost_usd,
    ADD COLUMN IF NOT EXISTS search_tokens INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tester_tokens INTEGER DEFAULT 0;

-- Clean embedding_test_runs
ALTER TABLE embedding_test_runs
    DROP COLUMN IF EXISTS group_enrichment_prompt,
    DROP COLUMN IF EXISTS query_rewriter_prompt,
    DROP COLUMN IF EXISTS total_embedding_cost_usd,
    DROP COLUMN IF EXISTS total_tester_cost_usd,
    ADD COLUMN IF NOT EXISTS total_search_tokens INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tester_tokens INTEGER DEFAULT 0;

-- Update embedding_regeneration_jobs
ALTER TABLE embedding_regeneration_jobs
    DROP COLUMN IF EXISTS total_cost_usd,
    ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;

-- Add helpful comments
COMMENT ON COLUMN embedding_test_results.search_tokens IS 'Tokens used for embedding generation during search';
COMMENT ON COLUMN embedding_test_results.tester_tokens IS 'Tokens used by AI to generate test query';
COMMENT ON COLUMN embedding_test_runs.total_search_tokens IS 'Sum of all search_tokens from test results';
COMMENT ON COLUMN embedding_test_runs.total_tester_tokens IS 'Sum of all tester_tokens from test results';
COMMENT ON COLUMN embedding_regeneration_jobs.total_tokens IS 'Total tokens used for enrichment + embedding generation';
