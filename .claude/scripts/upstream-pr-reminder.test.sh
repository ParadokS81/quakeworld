#!/usr/bin/env bash
# Regression harness for upstream-pr-reminder.sh.
# Feeds the hook the same JSON shape Claude Code's PreToolUse sends
# ({tool_input:{command}, cwd}) and asserts the exit code
# (0 = allow, 2 = block/remind).
#
# Cases 1 and 4 are the two bugs this guards against:
#   1 = false-BLOCK on a leading `cd <monorepo-root>` then git commit
#   4 = false-ALLOW on a commit into a nested upstream repo
# Both must pass. Run: bash .claude/scripts/upstream-pr-reminder.test.sh

HOOK="$(cd "$(dirname "$0")" && pwd)/upstream-pr-reminder.sh"
MONO="/home/paradoks/projects/quakeworld"
UPSTREAM="$MONO/research/repos/ezquake-source"

pass=0 fail=0

check() { # desc  expected_exit  command  cwd
  local desc="$1" want="$2" cmd="$3" cwd="$4" got
  jq -nc --arg c "$cmd" --arg w "$cwd" '{tool_input:{command:$c}, cwd:$w}' \
    | bash "$HOOK" >/dev/null 2>&1
  got=$?
  if [[ "$got" == "$want" ]]; then
    pass=$((pass+1)); printf '  PASS  %s (exit %s)\n' "$desc" "$got"
  else
    fail=$((fail+1)); printf '  FAIL  %s (want %s, got %s)\n' "$desc" "$want" "$got"
  fi
}

echo "=== upstream-pr-reminder regression ==="
check "1 leading-cd to monorepo root + commit -> allow" 0 \
  $'cd '"$MONO"$'\ngit add x\ngit commit -m y' "$MONO"
check "2 bare commit, persistent cwd in monorepo subdir -> allow" 0 \
  'git commit -m y' "$MONO/apps/qw-oracle"
check "3 git -C monorepo commit -> allow" 0 \
  "git -C $MONO commit -m y" "/tmp"
check "4 cd into nested upstream repo + commit -> block" 2 \
  "cd $UPSTREAM && git commit -m y" "$MONO"
check "5 git -C upstream push -> block" 2 \
  "git -C $UPSTREAM push" "$MONO"
check "6 gh pr create -> block" 2 \
  'gh pr create --title x --body z' "$MONO"
check "7 git status (not commit/push) -> allow" 0 \
  'git status' "$MONO"
check "8 unresolvable cwd, bare commit -> fail-open allow" 0 \
  'git commit -m y' "/nonexistent/xyz"

echo "=== $pass passed, $fail failed ==="
[[ $fail -eq 0 ]]
