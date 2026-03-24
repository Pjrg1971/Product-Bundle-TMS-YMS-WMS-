#!/usr/bin/env bash
# ============================================================
# Database Reset Script
# Drops and recreates all schemas, then runs migrations
# ============================================================
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/cowork_logistics}"

echo "=== Cowork Logistics — Database Reset ==="
echo "WARNING: This will drop ALL data in schemas: shared, tms, wms, yms"
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Dropping schemas..."
psql "$DB_URL" -c "DROP SCHEMA IF EXISTS shared CASCADE;"
psql "$DB_URL" -c "DROP SCHEMA IF EXISTS tms CASCADE;"
psql "$DB_URL" -c "DROP SCHEMA IF EXISTS wms CASCADE;"
psql "$DB_URL" -c "DROP SCHEMA IF EXISTS yms CASCADE;"
echo "Done."
echo ""

echo "Running migrations..."
bash "$(dirname "$0")/migrate.sh"

echo "=== Database reset complete ==="
