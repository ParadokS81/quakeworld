#!/usr/bin/env bash
# Phase 1 smoke-test convenience: start dev Postgres, wait for healthy, migrate.
# Idempotent - re-running on an already-up container is a no-op (besides
# applying any new migrations that happen to be on disk).
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker ps --format '{{.Names}}' | grep -q '^qw-oracle-postgres-dev$'; then
  echo "[db-up] starting Postgres..."
  docker compose -f db/docker-compose.dev.yml up -d
fi

echo "[db-up] waiting for Postgres healthcheck..."
for _ in $(seq 1 30); do
  if docker compose -f db/docker-compose.dev.yml exec -T postgres \
       pg_isready -U qworacle -d qw_oracle > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[db-up] running migrations against qw_oracle..."
DATABASE_URL="${DATABASE_URL:-postgresql://qworacle:dev@localhost:5432/qw_oracle}" bun db/migrate.ts

echo "[db-up] running migrations against qw_oracle_test..."
DATABASE_URL="postgresql://qworacle:dev@localhost:5432/qw_oracle_test" bun db/migrate.ts

echo "[db-up] ready."
