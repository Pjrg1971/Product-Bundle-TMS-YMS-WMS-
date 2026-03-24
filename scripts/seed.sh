#!/usr/bin/env bash
# ============================================================
# Database Seed Script
# Populates shared tables with initial reference data
# ============================================================
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/cowork_logistics}"
SEED_DIR="$(dirname "$0")/../db/seeds"

echo "=== Cowork Logistics — Database Seed ==="

for file in "$SEED_DIR"/*.sql; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "Seeding: $filename"
    psql "$DB_URL" -f "$file" 2>&1 | while read -r line; do
      echo "  $line"
    done
    echo ""
  fi
done

echo "=== Seeding complete ==="
