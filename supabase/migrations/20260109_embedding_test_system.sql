-- Embedding Test System Migration
-- Created: 2026-01-09

-- 1. Extend ai_usage_logs with context field for filtering test usage
ALTER TABLE ai_usage_logs 
ADD COLUMN IF NOT EXISTS context TEXT DEFAULT 'production' 
CHECK (context IN ('production', 'embedding_test', 'embedding_regeneration', 'debug'));

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_context ON ai_usage_logs(context);

-- 2. Embedding model configurations
CREATE TABLE IF NOT EXISTS embedding_model_configs (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'openai', 'other')),
    
    -- Rate limiting
    requests_per_minute INT DEFAULT 60,
    recommended_delay_ms INT DEFAULT 500,
    
    -- Costs (per 1M tokens)
    cost_per_million_tokens_usd DECIMAL(10, 4) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default models
INSERT INTO embedding_model_configs (id, display_name, provider, requests_per_minute, recommended_delay_ms, cost_per_million_tokens_usd) VALUES
('gemini-text-embedding-004', 'Gemini Text Embedding 004', 'google', 1500, 100, 0.00),
('text-embedding-3-large', 'OpenAI Embedding 3 Large', 'openai', 3000, 50, 0.13),
('text-embedding-3-small', 'OpenAI Embedding 3 Small', 'openai', 3000, 50, 0.02)
ON CONFLICT (id) DO NOTHING;

-- 3. Test runs table
CREATE TABLE IF NOT EXISTS embedding_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'running', 'completed', 'aborted', 'failed')),
    
    -- Embedding configuration
    embedding_model TEXT NOT NULL,
    group_enrichment_prompt TEXT,
    query_rewriter_prompt TEXT,
    use_sample_groups BOOLEAN DEFAULT FALSE,
    
    -- AI Tester configuration
    tester_model TEXT NOT NULL,
    tester_temperature FLOAT DEFAULT 0.7 CHECK (tester_temperature BETWEEN 0 AND 2),
    difficulty_mode TEXT DEFAULT 'medium' 
        CHECK (difficulty_mode IN ('easy', 'medium', 'hard', 'mixed')),
    
    -- MVS weights
    mvs_weight_identity FLOAT DEFAULT 0.5 CHECK (mvs_weight_identity BETWEEN 0 AND 1),
    mvs_weight_physical FLOAT DEFAULT 0.3 CHECK (mvs_weight_physical BETWEEN 0 AND 1),
    mvs_weight_context FLOAT DEFAULT 0.2 CHECK (mvs_weight_context BETWEEN 0 AND 1),
    match_threshold FLOAT DEFAULT 0.4 CHECK (match_threshold BETWEEN 0 AND 1),
    
    -- Rate limiting
    delay_between_queries_ms INT DEFAULT 500,
    
    -- Progress
    target_query_count INT NOT NULL CHECK (target_query_count > 0),
    completed_query_count INT DEFAULT 0,
    
    -- Costs (separate from production stats)
    total_embedding_cost_usd DECIMAL(10, 6) DEFAULT 0,
    total_tester_cost_usd DECIMAL(10, 6) DEFAULT 0,
    
    -- Re-embedding tracking
    requires_reembedding BOOLEAN DEFAULT FALSE,
    reembedding_status TEXT DEFAULT 'not_started'
        CHECK (reembedding_status IN ('not_started', 'running', 'completed', 'failed')),
    reembedding_progress INT DEFAULT 0,
    reembedding_total INT DEFAULT 0,
    reembedding_cost_usd DECIMAL(10, 6) DEFAULT 0,
    
    -- Error tracking
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_test_runs_status ON embedding_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_created_at ON embedding_test_runs(created_at DESC);

-- 4. Test results table
CREATE TABLE IF NOT EXISTS embedding_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES embedding_test_runs(id) ON DELETE CASCADE,
    
    -- Source (correct answer)
    source_group_id UUID NOT NULL REFERENCES groups(id),
    source_group_name TEXT NOT NULL,
    
    -- Generated query
    generated_query TEXT NOT NULL,
    reasoning TEXT,
    
    -- Search results (Top 10 with ranking)
    top_results JSONB NOT NULL,
    
    -- Metrics
    correct_rank INT CHECK (correct_rank >= 1),
    
    -- Costs for this query
    embedding_cost_usd DECIMAL(10, 6) DEFAULT 0,
    tester_cost_usd DECIMAL(10, 6) DEFAULT 0,
    latency_ms INT,
    
    -- Error tracking
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON embedding_test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_correct_rank ON embedding_test_results(correct_rank);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON embedding_test_results(created_at DESC);

-- 5. Prompt templates (for reusability)
CREATE TABLE IF NOT EXISTS embedding_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('group_enrichment', 'query_rewriter')),
    prompt_text TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default prompts
INSERT INTO embedding_prompt_templates (name, type, prompt_text, is_default) VALUES
(
    'Default Group Enrichment (Multi-Vector)',
    'group_enrichment',
    'Jesteś starym rekwizytorem teatralnym. Twoim zadaniem jest opisanie przedmiotu "{name}" dla systemu wyszukiwania.

Musisz rozdzielić opis na 3 precyzyjne kategorie, aby uniknąć błędów wyszukiwania (np. żeby "ostre" nie szukało owoców w kuchni).

KATEGORIE:
1. IDENTITY (Tożsamość): Co to dokładnie jest? Synonimy, nazwy, kategoria główna.
   (np. "Brzytwa: brzytwa, nóż fryzjerski, golarka, ostrze")

2. PHYSICAL (Styl/Fizyczne): Cechy widoczne i namacalne. Materiał, stan, cechy fizyczne.
   (np. "Fizyczne: metalowe, ostre, stalowe, srebrne, składane, zardzewiałe")
   WAŻNE: Tu wpisuj przymiotniki (drewniany, szklany, ostry).

3. CONTEXT (Kontekst/Użycie): Gdzie to występuje? Do czego służy? KONIECZNIE dodaj frazy z "do" i "używane do".
   (np. "Kontekst: fryzjer, salon, golenie, DO GOLENIA, UŻYWANE DO GOLENIA, UŻYWANE PRZEZ FRYZJERA, łazienka, męskie, retro")
   WAŻNE: Dodaj frazy akcji/celu: "do X", "używane do X", "służy do X", "potrzebne do X".

ZADANIE: Wygeneruj JSON dla grupy: "{name}"

Format odpowiedzi JSON:
{
  "identity": "...",
  "physical": "...",
  "context": "..."
}',
    TRUE
),
(
    'No Query Rewriting',
    'query_rewriter',
    '{query}',
    TRUE
)
ON CONFLICT DO NOTHING;

-- 6. Helper function: Calculate test metrics
CREATE OR REPLACE FUNCTION calculate_test_metrics(test_run_id UUID)
RETURNS TABLE (
    accuracy_at_1 DECIMAL,
    accuracy_at_5 DECIMAL,
    accuracy_at_10 DECIMAL,
    mean_reciprocal_rank DECIMAL,
    average_rank DECIMAL,
    total_queries INT,
    successful_queries INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROUND(
            COUNT(*) FILTER (WHERE correct_rank = 1)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 
            2
        ) as accuracy_at_1,
        ROUND(
            COUNT(*) FILTER (WHERE correct_rank <= 5)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 
            2
        ) as accuracy_at_5,
        ROUND(
            COUNT(*) FILTER (WHERE correct_rank <= 10)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 
            2
        ) as accuracy_at_10,
        ROUND(
            AVG(1.0 / NULLIF(correct_rank, 0)), 
            4
        ) as mean_reciprocal_rank,
        ROUND(
            AVG(correct_rank), 
            2
        ) as average_rank,
        COUNT(*)::INT as total_queries,
        COUNT(*) FILTER (WHERE correct_rank IS NOT NULL)::INT as successful_queries
    FROM embedding_test_results
    WHERE run_id = test_run_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Update timestamp trigger
CREATE OR REPLACE FUNCTION update_embedding_test_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_embedding_test_runs_updated_at
    BEFORE UPDATE ON embedding_test_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_embedding_test_runs_updated_at();

-- Grant permissions (adjust as needed for your RLS setup)
-- These tables are admin-only, so we'll handle permissions in the app layer
