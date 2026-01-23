#!/bin/bash
# Add columns to groups table using SQLite directly

CONTAINER="rekwizytor-pocketbase-test"
DB_PATH="/pb_data/data.db"

echo "📝 Dodawanie kolumn do tabeli groups przez SQLite..."

# Get the table name for groups collection
docker exec $CONTAINER sqlite3 $DB_PATH "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%groups%';"

echo ""
echo "🔧 Dodawanie kolumn..."

# Add columns one by one
docker exec $CONTAINER sqlite3 $DB_PATH "ALTER TABLE groups ADD COLUMN original_id TEXT;"
docker exec $CONTAINER sqlite3 $DB_PATH "ALTER TABLE groups ADD COLUMN name TEXT NOT NULL DEFAULT '';"
docker exec $CONTAINER sqlite3 $DB_PATH "ALTER TABLE groups ADD COLUMN description TEXT;"
docker exec $CONTAINER sqlite3 $DB_PATH "ALTER TABLE groups ADD COLUMN color TEXT;"
docker exec $CONTAINER sqlite3 $DB_PATH "ALTER TABLE groups ADD COLUMN icon TEXT;"
docker exec $CONTAINER sqlite3 $DB_PATH "ALTER TABLE groups ADD COLUMN performance_id TEXT;"
docker exec $CONTAINER sqlite3 $DB_PATH "ALTER TABLE groups ADD COLUMN location_id TEXT;"
docker exec $CONTAINER sqlite3 $DB_PATH "ALTER TABLE groups ADD COLUMN short_id TEXT;"
docker exec $CONTAINER sqlite3 $DB_PATH "ALTER TABLE groups ADD COLUMN embeddings TEXT;"  # JSON as TEXT
docker exec $CONTAINER sqlite3 $DB_PATH "ALTER TABLE groups ADD COLUMN deleted_at TEXT;"  # DATE as TEXT

echo "✅ Kolumny dodane!"
echo ""
echo "📊 Sprawdzam strukturę tabeli..."
docker exec $CONTAINER sqlite3 $DB_PATH "PRAGMA table_info(groups);"
