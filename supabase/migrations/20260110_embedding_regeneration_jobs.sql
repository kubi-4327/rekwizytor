-- Create dedicated table for embedding regeneration jobs
CREATE TABLE embedding_regeneration_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending',
    -- pending, running, completed, failed, aborted
    
    -- Configuration
    embedding_model TEXT NOT NULL,
    enrichment_model TEXT NOT NULL,
    use_sample_groups BOOLEAN DEFAULT false,
    
    -- Progress tracking
    total_groups INTEGER NOT NULL,
    processed_groups INTEGER DEFAULT 0,
    current_group_id UUID,
    current_group_name TEXT,
    
    -- Current enrichment details (live preview)
    current_enrichment JSONB,
    -- { identity: "...", physical: "...", context: "..." }
    
    -- Costs
    total_cost_usd NUMERIC DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    failed_groups JSONB DEFAULT '[]'::jsonb
    -- array of { group_id, group_name, error }
);

-- Add index for status queries
CREATE INDEX idx_regeneration_jobs_status ON embedding_regeneration_jobs(status);
CREATE INDEX idx_regeneration_jobs_created_at ON embedding_regeneration_jobs(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_embedding_regeneration_jobs_updated_at
    BEFORE UPDATE ON embedding_regeneration_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Clean up embedding_test_runs table (remove regeneration-specific columns)
ALTER TABLE embedding_test_runs 
    DROP COLUMN IF EXISTS reembedding_status,
    DROP COLUMN IF EXISTS reembedding_progress,
    DROP COLUMN IF EXISTS reembedding_total,
    DROP COLUMN IF EXISTS reembedding_cost_usd,
    DROP COLUMN IF EXISTS enrichment_model;

-- Add comment
COMMENT ON TABLE embedding_regeneration_jobs IS 'Tracks background jobs for regenerating group embeddings with different models';
