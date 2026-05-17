#!/usr/bin/env bash
# Front 2: cmdline_param liveness for ezQuake HEAD (deterministic, no runtime dump).
# A help-JSON cmdline param is LIVE iff it has a real source consumer via EITHER
#   (modern) its generated enum id  cmdline_param_<sym>  referenced in a .c file, OR
#   (legacy) a literal  COM_CheckParm("-str")  call.
# DEAD = declared in help-JSON but no consumer in HEAD source -> code-bug / help-JSON
# cleanup candidate (route to nano/slime), NOT a documentation verdict.
set -euo pipefail
SRC=/home/paradoks/projects/quakeworld/research/repos/ezquake-source
cd "$SRC"
IDS=src/cmdline_params_ids.h
HELP=help_cmdline_params.json

# string -> ALL enum symbols (a -string can be defined for >1 symbol, e.g. -democache)
declare -A STR2SYMS
while IFS= read -r line; do
  sym=$(sed -E 's/.*CMDLINE_DEF\(\s*([A-Za-z0-9_]+)\s*,.*/\1/' <<<"$line")
  str=$(sed -E 's/.*,\s*"([^"]+)".*/\1/' <<<"$line")
  [ -n "$sym" ] && [ -n "$str" ] && STR2SYMS["$str"]="${STR2SYMS[$str]:-} $sym"
done < <(grep -E 'CMDLINE_DEF\(' "$IDS")

mapfile -t HJ < <(jq -r 'keys[]' "$HELP")
echo "X-macro strings: ${#STR2SYMS[@]}   help-JSON params: ${#HJ[@]}"

live=0; dead=0; DEADLIST=()
for p in "${HJ[@]}"; do
  hit=0
  for sym in ${STR2SYMS[$p]:-}; do
    if grep -rqE "\bcmdline_param_${sym}\b" src/ --include=*.c; then hit=1; break; fi
  done
  if [ "$hit" -eq 0 ] && grep -rqE "COM_CheckParm(Offset)? ?\( ?\"${p}\"" src/ --include=*.c; then hit=1; fi
  if [ "$hit" -eq 1 ]; then live=$((live+1)); else dead=$((dead+1)); DEADLIST+=("$p"); fi
done

echo "LIVE: $live   DEAD (no HEAD-source consumer): $dead"
echo "---- DEAD candidates: documented in help-JSON, zero source consumer ----"
for d in "${DEADLIST[@]}"; do echo "  $d   (enum:${STR2SYMS[$d]:-<not-in-xmacro>} )"; done
