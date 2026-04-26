#!/usr/bin/env bash
# Builds a portable Windows .zip from the unbundled tauri output.
# Run after `bun run tauri build` produces the standard MSI/NSIS bundles.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$ROOT/src-tauri/target/release"
PORTABLE_NAME="slipgate-portable"
WORK_DIR="$(mktemp -d)"
PORTABLE_DIR="$WORK_DIR/$PORTABLE_NAME"

EXE_PATH=""
for cand in "$RELEASE_DIR/slipgate.exe" "$RELEASE_DIR/slipgate-app.exe"; do
  if [ -f "$cand" ]; then EXE_PATH="$cand"; break; fi
done

if [ -z "$EXE_PATH" ]; then
  echo "Error: no slipgate exe in $RELEASE_DIR. Run 'bun run tauri build' first." >&2
  exit 1
fi

mkdir -p "$PORTABLE_DIR/data"
cp "$EXE_PATH" "$PORTABLE_DIR/"
touch "$PORTABLE_DIR/data/portable.flag"

VERSION="$(grep '^version' "$ROOT/src-tauri/Cargo.toml" | head -1 | sed -E 's/version = "(.+)"/\1/')"
OUTPUT="$RELEASE_DIR/${PORTABLE_NAME}-${VERSION}.zip"

cd "$WORK_DIR" && zip -r "$OUTPUT" "$PORTABLE_NAME" >/dev/null
rm -rf "$WORK_DIR"

echo "Portable build: $OUTPUT"
