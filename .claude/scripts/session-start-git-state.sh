#!/bin/bash
# Session-start git state banner.
# Mirrors docs-check Step 9.5 at session open so drift is caught before work begins.
# Uses local refs only (no fetch) to stay fast.
set -u

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

WORKTREE="$(pwd)"
BRANCH="$(git branch --show-current 2>/dev/null)"
[ -z "$BRANCH" ] && BRANCH="(detached)"
UNCOMMITTED="$(git status --porcelain | wc -l)"

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  AHEAD="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
  BEHIND="$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)"
  FILES_CHANGED="$(git diff --name-only origin/main...HEAD 2>/dev/null | wc -l)"
else
  AHEAD=0; BEHIND=0; FILES_CHANGED=0
fi

LAST_SUBJECT="$(git log -1 --format='%s' 2>/dev/null)"
LAST_AGE="$(git log -1 --format='%cr' 2>/dev/null)"

case "$WORKTREE" in
  */quakeworld)     ROLE=" [main tree: slipgate + shared docs]" ;;
  */quakeworld-poc) ROLE=" [POC worktree: qw-oracle]" ;;
  *)                ROLE="" ;;
esac

echo "=== git state ==="
echo "worktree : $WORKTREE$ROLE"
echo "branch   : $BRANCH"
echo "vs main  : $AHEAD ahead, $BEHIND behind ($FILES_CHANGED files diverged)"
echo "working  : $UNCOMMITTED uncommitted"
echo "last     : $LAST_SUBJECT ($LAST_AGE)"

WARN=()
[ "$AHEAD" -gt 5 ]          && WARN+=("branch is $AHEAD commits ahead of main")
[ "$FILES_CHANGED" -gt 20 ] && WARN+=("$FILES_CHANGED files diverged from main")
[ "$UNCOMMITTED" -gt 10 ]   && WARN+=("$UNCOMMITTED uncommitted changes present")

if [ "${#WARN[@]}" -gt 0 ]; then
  echo ""
  echo "!!! DRIFT WARNINGS !!!"
  for w in "${WARN[@]}"; do echo "  - $w"; done
fi

echo "================="
