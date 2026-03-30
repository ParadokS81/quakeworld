#!/bin/bash
# Start slipgate-app dev environment.
# Runs Vite in WSL + Cargo/Tauri on Windows, connected via localhost:1420.
set -euo pipefail

MONOREPO="$HOME/projects/quakeworld/apps/slipgate-app"
WINDOWS_CMD="C:\\Users\\Administrator\\projects\\slipgate-app\\dev-no-vite.cmd"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "${VITE_PID:-}" ] && kill "$VITE_PID" 2>/dev/null
  wait "$VITE_PID" 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# 1. Sync Rust source to Windows
echo "Syncing src-tauri/ to Windows..."
"$SCRIPT_DIR/sync-rust.sh"

# 2. Start Vite
cd "$MONOREPO"
echo "Starting Vite..."
bun run dev &
VITE_PID=$!

# 3. Wait for Vite
echo "Waiting for localhost:1420..."
for i in $(seq 1 30); do
  if curl -s http://localhost:1420 >/dev/null 2>&1; then
    echo "Vite ready."
    break
  fi
  if ! kill -0 "$VITE_PID" 2>/dev/null; then
    echo "ERROR: Vite exited unexpectedly."
    exit 1
  fi
  sleep 1
done

if ! curl -s http://localhost:1420 >/dev/null 2>&1; then
  echo "ERROR: Vite did not start within 30 seconds."
  exit 1
fi

# 4. Launch Tauri on Windows (foreground — blocks until closed)
echo "Starting Tauri (Windows)..."
cmd.exe /c "$WINDOWS_CMD"
