#!/bin/bash
# Sync src-tauri/ from WSL monorepo to Windows build mirror.
# Excludes target/ (build artifacts) — Windows has its own cargo cache.
set -euo pipefail

MONOREPO="$HOME/projects/quakeworld/apps/slipgate-app"
WINDOWS="/mnt/c/Users/Administrator/projects/slipgate-app"

rsync -a --delete \
  --exclude 'target/' \
  "$MONOREPO/src-tauri/" \
  "$WINDOWS/src-tauri/"

echo "src-tauri/ synced to Windows"
