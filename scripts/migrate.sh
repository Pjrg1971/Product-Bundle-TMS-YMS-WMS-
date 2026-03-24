#!/usr/bin/env bash
# ============================================================
# Database Migration Script
# Runs all SQL migrations in order against the PostgreSQL database
# ============================================================
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/cowork_logistics}"
MIGRATION_DIR="$(dirname "$0")/../db/migrations"

echo "=== Cowork Logistics — Database Migration ==="
echo "Database: $DB_URL"
echo ""

# Run migrations in alphabetical order
for file in "$MIGRATION_DIR"/*.sql; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "Running: $filename"
    psql "$DB_URL" -f "$file" 2>&1 | while read -r line; do
      echo "  $line"
    done
    echo "  Done."
    echo ""
  fi
done

echo "=== All migrations complete ==="
