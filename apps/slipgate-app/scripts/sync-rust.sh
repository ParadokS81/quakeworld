#!/bin/bash
# Sync src-tauri/ from WSL monorepo to Windows build mirror.
# Excludes target/ (build artifacts) — Windows has its own cargo cache.
set -euo pipefail

MONOREPO="$HOME/projects/quakeworld/apps/slipgate-app"
QW_ROOT="$HOME/projects/quakeworld"
WINDOWS="/mnt/c/Users/Administrator/projects/slipgate-app"

# Copy bundle from packages/qw-config/ into src-tauri/resources/ so the include_str!
# in browse.rs stays self-contained inside src-tauri/ (the Windows mirror only syncs
# src-tauri/, so a monorepo-relative path would not resolve there).
mkdir -p "$MONOREPO/src-tauri/resources"
cp "$QW_ROOT/packages/qw-config/src/data/ezquake-asset-bundle.json" \
   "$MONOREPO/src-tauri/resources/ezquake-asset-bundle.json"

rsync -a --delete \
  --exclude 'target/' \
  "$MONOREPO/src-tauri/" \
  "$WINDOWS/src-tauri/"

echo "src-tauri/ synced to Windows"
