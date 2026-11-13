#!/usr/bin/env bash
# TradeOps Diagnostic Script — PostgreSQL Database Health Check
set -eo pipefail

DB_NAME="${PGDATABASE:-tradeops}"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"

echo "[*] Verifying PostgreSQL Connectivity ($DB_HOST:$DB_PORT/$DB_NAME)..."
pg_isready -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER"

echo -e "\n[*] Database size and active connections:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT current_database() as database,
         pg_size_pretty(pg_database_size(current_database())) as size,
         (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_backends;
"

