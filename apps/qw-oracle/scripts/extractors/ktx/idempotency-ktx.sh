#!/usr/bin/env bash
#
# Phase 7 idempotency probe: re-run KTX extract-tag end-to-end and assert
# zero row-count drift + zero content-hash drift across every KTX-scoped
# table. Per decisions.md D15: every loader is idempotent by construction;
# bug manifests as count-inflation false positives (re-run doubles rows)
# or silent JSONB drift (stringification on second load). This script
# gates both classes.
#
# Usage:
#   bash apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh
#
# Exit codes:
#   0 -- idempotent (no drift across all KTX-scoped tables)
#   1 -- count drift OR content-hash drift detected; review the diff output

set -euo pipefail

cd "$(dirname "$0")/../../../.."

DB_URL="${DATABASE_URL:?DATABASE_URL must be set to the qw_oracle dev DB}"

# Three table sets, each with its own scoping convention:
#   ENTITIES_TABLE: filter directly on project='ktx'.
#   VERSIONS_TABLES: join entities on entity_id, filter project='ktx'.
#   GAMEPLAY_TABLES: filter on gameplay_source_id='ktx'.
ENTITIES_TABLE="entities"
VERSIONS_TABLES=(
  cvar_versions
  command_versions
  info_key_versions
  log_template_versions
  match_event_versions
)
GAMEPLAY_TABLES=(
  gameplay_mechanics
  gameplay_entity_defs
)

snapshot() {
  local label="$1"
  local outfile="/tmp/ktx-idempotency-${label}.txt"
  : > "$outfile"

  # entities table: scoped by project='ktx'.
  psql "$DB_URL" -At -c "
    SELECT 'entities', COUNT(*),
           COALESCE(MD5(string_agg(t::text, '|' ORDER BY t::text)), 'EMPTY')
    FROM (SELECT * FROM ${ENTITIES_TABLE} WHERE project='ktx' ORDER BY id) t
  " >> "$outfile"

  # *_versions tables: join entities on entity_id, filter project='ktx'.
  for t in "${VERSIONS_TABLES[@]}"; do
    psql "$DB_URL" -At -c "
      SELECT '${t}', COUNT(*),
             COALESCE(MD5(string_agg(v::text, '|' ORDER BY v::text)), 'EMPTY')
      FROM (
        SELECT v.*
        FROM ${t} v
        JOIN entities e ON v.entity_id = e.id
        WHERE e.project = 'ktx'
      ) v
    " >> "$outfile"
  done

  # gameplay_* tables: scoped by gameplay_source_id='ktx'.
  for t in "${GAMEPLAY_TABLES[@]}"; do
    psql "$DB_URL" -At -c "
      SELECT '${t}', COUNT(*),
             COALESCE(MD5(string_agg(g::text, '|' ORDER BY g::text)), 'EMPTY')
      FROM (SELECT * FROM ${t} WHERE gameplay_source_id='ktx' ORDER BY id) g
    " >> "$outfile"
  done

  echo "$outfile"
}

echo "=== KTX idempotency probe ==="
echo
echo "[1/3] Pre-run snapshot..."
PRE=$(snapshot pre)

echo "[2/3] Re-run KTX dispatch (--force bypasses >50% drop guard) ..."
HEAD_ORDINAL=$(npm --prefix apps/qw-oracle --no-workspaces --silent run load-knowledge -- show-head-ordinal 2>/dev/null | tail -1)
HEAD_VERSION="head"  # KTX dispatch resolves head per Arc 1's existing convention
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project ktx --version "$HEAD_VERSION" --ordinal "$HEAD_ORDINAL" --force 2>&1 | tail -20

echo "[3/3] Post-run snapshot..."
POST=$(snapshot post)

echo
echo "Diff (pre vs post):"
DIFF_OUT=$(diff "$PRE" "$POST" || true)
if [ -z "$DIFF_OUT" ]; then
  echo "  (no drift; idempotent)"
  rm -f "$PRE" "$POST"
  exit 0
fi
echo "$DIFF_OUT"
echo
echo "FAIL: idempotency violated. Pre-run snapshot at $PRE, post-run at $POST."
exit 1
