-- Intent Classification System Migration
-- Created: 2026-01-22
-- Purpose: Self-learning hybrid system for classifying search query intent (identity vs physical)

-- 1. Rule-based keyword dictionary (auto-expanding)
CREATE TABLE IF NOT EXISTS intent_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL UNIQUE,
    identity_weight FLOAT NOT NULL DEFAULT 0.5 CHECK (identity_weight BETWEEN 0 AND 1),
    physical_weight FLOAT NOT NULL DEFAULT 0.5 CHECK (physical_weight BETWEEN 0 AND 1),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto-learned', 'seed')),
    confidence INT NOT NULL DEFAULT 0, -- how many times seen in LLM logs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_keywords_keyword ON intent_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_intent_keywords_source ON intent_keywords(source);

-- 2. Log LLM classification decisions for pattern extraction
CREATE TABLE IF NOT EXISTS intent_classification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    tokens TEXT[] NOT NULL, -- tokenized query (lowercase words)
    identity_score FLOAT NOT NULL CHECK (identity_score BETWEEN 0 AND 1),
    physical_score FLOAT NOT NULL CHECK (physical_score BETWEEN 0 AND 1),
    source TEXT NOT NULL DEFAULT 'llm' CHECK (source IN ('rules', 'llm', 'hybrid')),
    model_name TEXT, -- e.g. 'gemini-2.0-flash', 'gpt-4o-mini'
    latency_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_logs_created ON intent_classification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_logs_source ON intent_classification_logs(source);

-- 3. Stats table for monitoring rules vs LLM usage
CREATE TABLE IF NOT EXISTS intent_classification_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    total_classifications INT DEFAULT 0,
    rule_based_count INT DEFAULT 0,
    llm_fallback_count INT DEFAULT 0,
    avg_latency_ms INT DEFAULT 0,
    total_cost_usd DECIMAL(10, 6) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_stats_date ON intent_classification_stats(date DESC);

-- 4. Seed initial keywords (Polish language focused)
INSERT INTO intent_keywords (keyword, identity_weight, physical_weight, source) VALUES
-- Physical descriptors - Colors
('czerwony', 0.1, 0.9, 'seed'),
('niebieski', 0.1, 0.9, 'seed'),
('zielony', 0.1, 0.9, 'seed'),
('żółty', 0.1, 0.9, 'seed'),
('czarny', 0.1, 0.9, 'seed'),
('biały', 0.1, 0.9, 'seed'),
('szary', 0.1, 0.9, 'seed'),
('brązowy', 0.1, 0.9, 'seed'),

-- Physical descriptors - Size
('duży', 0.1, 0.9, 'seed'),
('mały', 0.1, 0.9, 'seed'),
('wysoki', 0.1, 0.9, 'seed'),
('niski', 0.1, 0.9, 'seed'),
('długi', 0.1, 0.9, 'seed'),
('krótki', 0.1, 0.9, 'seed'),
('szeroki', 0.1, 0.9, 'seed'),
('wąski', 0.1, 0.9, 'seed'),

-- Physical descriptors - Material
('drewniany', 0.1, 0.9, 'seed'),
('metalowy', 0.1, 0.9, 'seed'),
('plastikowy', 0.1, 0.9, 'seed'),
('szklany', 0.1, 0.9, 'seed'),
('tkanina', 0.1, 0.9, 'seed'),
('skórzany', 0.1, 0.9, 'seed'),

-- Physical descriptors - Condition/State
('nowy', 0.2, 0.8, 'seed'),
('stary', 0.2, 0.8, 'seed'),
('zniszczony', 0.1, 0.9, 'seed'),
('odrestaurowany', 0.1, 0.9, 'seed'),

-- Physical descriptors - Measurements
('cm', 0.0, 1.0, 'seed'),
('kg', 0.0, 1.0, 'seed'),
('metr', 0.0, 1.0, 'seed'),
('gram', 0.0, 1.0, 'seed'),
('litr', 0.0, 1.0, 'seed'),

-- Identity descriptors - Ownership/Relation
('kto', 0.9, 0.1, 'seed'),
('czyj', 0.9, 0.1, 'seed'),
('czyja', 0.9, 0.1, 'seed'),
('czyje', 0.9, 0.1, 'seed'),
('należy', 0.9, 0.1, 'seed'),
('używa', 0.9, 0.1, 'seed'),
('właściciel', 0.9, 0.1, 'seed'),

-- Identity descriptors - Roles/Characters
('rola', 0.9, 0.1, 'seed'),
('postać', 0.9, 0.1, 'seed'),
('aktor', 0.9, 0.1, 'seed'),
('bohater', 0.9, 0.1, 'seed'),
('protagonist', 0.9, 0.1, 'seed'),

-- Identity descriptors - Theater specific
('scena', 0.9, 0.1, 'seed'),
('akt', 0.9, 0.1, 'seed'),
('sztuka', 0.8, 0.2, 'seed'),
('spektakl', 0.8, 0.2, 'seed'),
('przedstawienie', 0.8, 0.2, 'seed')

ON CONFLICT (keyword) DO NOTHING;

-- 5. Update timestamp trigger
CREATE OR REPLACE FUNCTION update_intent_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_intent_keywords_updated_at
    BEFORE UPDATE ON intent_keywords
    FOR EACH ROW
    EXECUTE FUNCTION update_intent_keywords_updated_at();

-- 6. Stats update trigger function
CREATE OR REPLACE FUNCTION update_intent_classification_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO intent_classification_stats (date, total_classifications, rule_based_count, llm_fallback_count)
    VALUES (CURRENT_DATE, 0, 0, 0)
    ON CONFLICT (date) DO NOTHING;
    
    UPDATE intent_classification_stats
    SET 
        total_classifications = total_classifications + 1,
        rule_based_count = rule_based_count + CASE WHEN NEW.source = 'rules' THEN 1 ELSE 0 END,
        llm_fallback_count = llm_fallback_count + CASE WHEN NEW.source = 'llm' THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE date = CURRENT_DATE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_intent_stats
    AFTER INSERT ON intent_classification_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_intent_classification_stats();

-- 7. Helper function: Get classification stats
CREATE OR REPLACE FUNCTION get_intent_classification_stats(days INT DEFAULT 7)
RETURNS TABLE (
    date DATE,
    total_classifications INT,
    rule_based_count INT,
    llm_fallback_count INT,
    rule_percentage DECIMAL,
    llm_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.date,
        s.total_classifications,
        s.rule_based_count,
        s.llm_fallback_count,
        ROUND((s.rule_based_count::DECIMAL / NULLIF(s.total_classifications, 0) * 100), 2) as rule_percentage,
        ROUND((s.llm_fallback_count::DECIMAL / NULLIF(s.total_classifications, 0) * 100), 2) as llm_percentage
    FROM intent_classification_stats s
    WHERE s.date >= CURRENT_DATE - days
    ORDER BY s.date DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your RLS setup)
-- These tables should be accessible by authenticated users for logging
-- and by admins for pattern extraction/dictionary updates
