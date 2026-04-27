#!/usr/bin/env bash
# diff-runtime.sh -- Compare MVDSV runtime cvarlist+cmdlist against extracted DB.
# Usage:
#   ./diff-runtime.sh [--type cvar|command]
# Default: cvar
#
# Output: three sections to stdout
#   - runtime-only after KTX filter (potential extractor gaps)
#   - DB-only (head delta vs 1.20-dev, platform-specific, or over-detection)
#   - intersect count
#
# Exit code is always 0; this is a diagnostic tool, not a CI gate.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../../../../.." && pwd)"
DB="$REPO_ROOT/apps/qw-oracle/data/knowledge.db"
LOG="$HERE/validation-fixtures/ciscon-1.20-dev-2026-04-27.log"
PREFIXES="$HERE/validation-fixtures/ktx-progs-prefixes.txt"
ALLOWLIST="$HERE/validation-fixtures/ktx-progs-allowlist.txt"

TYPE="cvar"
if [ "${1:-}" = "--type" ]; then
  TYPE="$2"
fi

case "$TYPE" in
  cvar)
    LOG_HEADER="List of cvars:"
    LOG_FOOTER='[0-9]+/[0-9]+ variables'
    ;;
  command)
    LOG_HEADER="List of commands:"
    LOG_FOOTER='[0-9]+/[0-9]+ commands'
    ;;
  *)
    echo "Unknown type: $TYPE (use cvar or command)" >&2
    exit 1
    ;;
esac

TMP_RUNTIME=$(mktemp)
TMP_DB=$(mktemp)
TMP_FILTERED=$(mktemp)
ALLOWLIST_TMP=$(mktemp)
trap 'rm -f "$TMP_RUNTIME" "$TMP_DB" "$TMP_FILTERED" "$TMP_FILTERED.2" "$ALLOWLIST_TMP"' EXIT

# 1. Parse log into name list (lowercase, deduped, sorted).
#    awk default FS treats runs of whitespace as one separator, so after the
#    timestamp ("[YYYY-MM-DD" "HH:MM:SS]" = $1 + $2), real content starts at $3.
#    Cvar body shape per MVDSV cvar.c:386 -- "%c %s %s\n" (flag, name, value):
#      "[ts]   <name> <val>"      (no SERVERINFO flag) -> $3=name
#      "[ts] s <name> [val]"      (SERVERINFO flag)    -> $3="s", $4=name
#    Command body is just "[ts] <name>" -> $3=name.
#    Strategy: take $3 unless it's a single char (flag column), then take $4.
#    Also skip the "------------" separator line that precedes the footer.
awk -v hdr="$LOG_HEADER" -v ftr="$LOG_FOOTER" '
  $0 ~ hdr {flag=1; next}
  flag && $0 ~ ftr {flag=0}
  flag {
    if (NF < 3) next
    name = $3
    if (length(name) == 1 && NF >= 4) name = $4   # 1-char flag column ("s" or other), name in $4
    sub(/\r$/, "", name)
    if (name == "" || name ~ /^-+$/) next
    print name
  }
' "$LOG" | tr '[:upper:]' '[:lower:]' | sort -u > "$TMP_RUNTIME"

# 2. Strip KTX-progs prefixes via grep -Ev.
PREFIX_RE=""
while IFS= read -r prefix; do
  [ -z "$prefix" ] && continue
  PREFIX_RE="${PREFIX_RE}|^${prefix}"
done < "$PREFIXES"
PREFIX_RE="${PREFIX_RE#|}"

if [ -n "$PREFIX_RE" ]; then
  grep -Ev "$PREFIX_RE" "$TMP_RUNTIME" > "$TMP_FILTERED" || true
else
  cp "$TMP_RUNTIME" "$TMP_FILTERED"
fi

# 3. Filter out allowlist entries (exact-match, lowercased).
tr '[:upper:]' '[:lower:]' < "$ALLOWLIST" | sort -u > "$ALLOWLIST_TMP"
comm -23 "$TMP_FILTERED" "$ALLOWLIST_TMP" > "$TMP_FILTERED.2"
mv "$TMP_FILTERED.2" "$TMP_FILTERED"

# 4. Pull source_backed names from DB.
sqlite3 "$DB" \
  "SELECT name FROM entities WHERE project='mvdsv' AND type='$TYPE' AND source_state='source_backed'" \
  | tr '[:upper:]' '[:lower:]' | sort -u > "$TMP_DB"

# 5. Diff and report.
PRE_FILTER=$(wc -l < "$TMP_RUNTIME")
POST_FILTER=$(wc -l < "$TMP_FILTERED")
DB_COUNT=$(wc -l < "$TMP_DB")
INTERSECT=$(comm -12 "$TMP_FILTERED" "$TMP_DB" | wc -l)

echo "=== type=$TYPE ==="
echo "Runtime (pre-KTX-filter):  $PRE_FILTER"
echo "Runtime (post-KTX-filter): $POST_FILTER"
echo "DB (source_backed):        $DB_COUNT"
echo "Intersect:                 $INTERSECT"

echo ""
echo "--- Runtime-only (potential extractor gaps) ---"
comm -23 "$TMP_FILTERED" "$TMP_DB" | tee "/tmp/mvdsv-runtime-only-$TYPE.txt"

echo ""
echo "--- DB-only (head delta vs 1.20-dev, platform-specific, or over-detection) ---"
comm -13 "$TMP_FILTERED" "$TMP_DB" | tee "/tmp/mvdsv-db-only-$TYPE.txt"
