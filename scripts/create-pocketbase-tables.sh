#!/bin/bash

# Skrypt do automatycznego tworzenia tabel w PocketBase SQLite
# Na podstawie struktury z Supabase

set -e

CONTAINER_NAME="rekwizytor-pocketbase-test"
DB_PATH="/pb_data/data.db"

echo "🗄️  Tworzenie tabel w PocketBase SQLite..."
echo ""

# Sprawdź czy kontener działa
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ Kontener $CONTAINER_NAME nie działa!"
    echo "💡 Uruchom: npm run test:start"
    exit 1
fi

# SQL do utworzenia tabel
SQL=$(cat <<'EOF'
-- Tabela: groups (bez kolumn vector - tylko embeddings JSONB)
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    performance_id TEXT,
    location_id TEXT,
    short_id TEXT,
    embeddings TEXT,  -- JSONB jako TEXT w SQLite
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

-- Tabela: embedding_regeneration_jobs
CREATE TABLE IF NOT EXISTS embedding_regeneration_jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    embedding_model TEXT NOT NULL,
    enrichment_model TEXT NOT NULL,
    use_sample_groups INTEGER,  -- BOOLEAN jako INTEGER
    total_groups INTEGER NOT NULL,
    processed_groups INTEGER,
    current_group_id TEXT,
    current_group_name TEXT,
    current_enrichment TEXT,  -- JSONB jako TEXT
    error_message TEXT,
    failed_groups TEXT,  -- JSONB jako TEXT
    total_tokens INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: embedding_test_queue
CREATE TABLE IF NOT EXISTS embedding_test_queue (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    status TEXT NOT NULL,
    config TEXT NOT NULL,  -- JSONB jako TEXT
    run_id TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: embedding_test_results
CREATE TABLE IF NOT EXISTS embedding_test_results (
    id TEXT PRIMARY KEY,
    run_id TEXT,
    test_id TEXT,
    config TEXT NOT NULL,  -- JSONB jako TEXT
    metrics TEXT,  -- JSONB jako TEXT
    precision_at_1 REAL,
    precision_at_5 REAL,
    precision_at_10 REAL,
    recall_at_1 REAL,
    recall_at_5 REAL,
    recall_at_10 REAL,
    mrr REAL,
    ndcg_at_10 REAL,
    completed_query_count INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: embedding_test_runs
CREATE TABLE IF NOT EXISTS embedding_test_runs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    config TEXT NOT NULL,  -- JSONB jako TEXT
    embedding_model TEXT NOT NULL,
    enrichment_model TEXT NOT NULL,
    use_sample_groups INTEGER,  -- BOOLEAN jako INTEGER
    total_tests INTEGER,
    completed_tests INTEGER,
    failed_tests INTEGER,
    avg_precision_at_1 REAL,
    avg_precision_at_5 REAL,
    avg_precision_at_10 REAL,
    avg_recall_at_1 REAL,
    avg_recall_at_5 REAL,
    avg_recall_at_10 REAL,
    avg_mrr REAL,
    avg_ndcg_at_10 REAL,
    completed_query_count INTEGER,
    requires_reembedding INTEGER,  -- BOOLEAN jako INTEGER
    error_message TEXT,
    use_dynamic_weights INTEGER,  -- BOOLEAN jako INTEGER
    total_search_tokens INTEGER,
    total_tester_tokens INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups(deleted_at);
CREATE INDEX IF NOT EXISTS idx_groups_performance_id ON groups(performance_id);
CREATE INDEX IF NOT EXISTS idx_embedding_regen_jobs_status ON embedding_regeneration_jobs(status);
CREATE INDEX IF NOT EXISTS idx_embedding_test_queue_status ON embedding_test_queue(status);
CREATE INDEX IF NOT EXISTS idx_embedding_test_queue_run_id ON embedding_test_queue(run_id);
CREATE INDEX IF NOT EXISTS idx_embedding_test_results_run_id ON embedding_test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_embedding_test_runs_status ON embedding_test_runs(status);

EOF
)

# Wykonaj SQL w kontenerze
echo "📝 Tworzenie tabel..."
docker exec -i $CONTAINER_NAME sqlite3 $DB_PATH <<< "$SQL"

if [ $? -eq 0 ]; then
    echo "✅ Tabele utworzone pomyślnie!"
    echo ""
    echo "📊 Utworzone tabele:"
    echo "   • groups"
    echo "   • embedding_regeneration_jobs"
    echo "   • embedding_test_queue"
    echo "   • embedding_test_results"
    echo "   • embedding_test_runs"
    echo ""
    echo "💡 Możesz teraz zaimportować dane:"
    echo "   npm run import:pocketbase"
else
    echo "❌ Błąd podczas tworzenia tabel"
    exit 1
fi
