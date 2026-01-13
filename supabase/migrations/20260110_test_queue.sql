-- Test queue items - stores tests waiting to be executed
CREATE TABLE embedding_test_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'paused', 'failed', 'cancelled')),
    config JSONB NOT NULL,
    run_id UUID REFERENCES embedding_test_runs(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Global queue state (single row)
CREATE TABLE embedding_queue_state (
    id TEXT PRIMARY KEY DEFAULT 'global',
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused')),
    current_queue_item_id UUID REFERENCES embedding_test_queue(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default state
INSERT INTO embedding_queue_state (id, status) VALUES ('global', 'idle');

-- Indexes for performance
CREATE INDEX idx_embedding_test_queue_position ON embedding_test_queue(position);
CREATE INDEX idx_embedding_test_queue_status ON embedding_test_queue(status);
