# Split-Process Dev Workflow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable slipgate-app development where Claude Code edits files in WSL while Tauri builds and runs on Windows, connected via localhost.

**Architecture:** Vite runs in WSL serving the SolidJS frontend on localhost:1420. Cargo/Tauri runs on Windows from a build-only mirror, loading the frontend from that URL via WSL2 localhost sharing. An rsync-based sync mechanism keeps Rust source in sync.

**Tech Stack:** Bash scripts, rsync, cmd.exe batch files, Tauri CLI `--config` override, Claude Code hooks

**Spec:** `docs/superpowers/specs/2026-03-30-split-process-dev-workflow-design.md`

---

### Task 1: Create Rust sync script

**Files:**
- Create: `apps/slipgate-app/scripts/sync-rust.sh`

- [ ] **Step 1: Create the scripts directory and sync script**

```bash
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
```

- [ ] **Step 2: Make it executable and test**

Run:
```bash
chmod +x apps/slipgate-app/scripts/sync-rust.sh
./apps/slipgate-app/scripts/sync-rust.sh
```
Expected: `src-tauri/ synced to Windows` and files at `/mnt/c/Users/Administrator/projects/slipgate-app/src-tauri/src/` match the WSL copy.

Verify:
```bash
diff <(md5sum apps/slipgate-app/src-tauri/src/*.rs | sort -k2) \
     <(cd /mnt/c/Users/Administrator/projects/slipgate-app && md5sum src-tauri/src/*.rs | sort -k2)
```
Expected: no output (files match).

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/scripts/sync-rust.sh
git commit -m "Add sync-rust.sh — rsync src-tauri/ to Windows build mirror"
```

---

### Task 2: Create Windows-side config override and batch file

**Files:**
- Create: `/mnt/c/Users/Administrator/projects/slipgate-app/tauri.dev.conf.json`
- Create: `/mnt/c/Users/Administrator/projects/slipgate-app/dev-no-vite.cmd`

These files live on the Windows filesystem only — they are not part of the monorepo.

- [ ] **Step 1: Create the Tauri config override**

Write to `/mnt/c/Users/Administrator/projects/slipgate-app/tauri.dev.conf.json`:
```json
{
  "build": {
    "beforeDevCommand": ""
  }
}
```

This is merged with `src-tauri/tauri.conf.json` at runtime by `cargo tauri dev --config`. It overrides only `beforeDevCommand` to skip Vite startup (Vite runs separately in WSL).

- [ ] **Step 2: Create the batch file**

Write to `/mnt/c/Users/Administrator/projects/slipgate-app/dev-no-vite.cmd`:
```cmd
@echo off
cd /d C:\Users\Administrator\projects\slipgate-app
cargo tauri dev --config tauri.dev.conf.json
```

- [ ] **Step 3: Verify the batch file runs**

Run from WSL:
```bash
cmd.exe /c "C:\Users\Administrator\projects\slipgate-app\dev-no-vite.cmd" &
DEV_PID=$!
sleep 5
kill $DEV_PID 2>/dev/null
```
Expected: Cargo output appears (compilation or "Compiling..." messages). It will fail to load localhost:1420 since Vite isn't running — that's fine, we just need to confirm Cargo starts.

Note: if this is the first run after a while, Cargo may need to compile dependencies. Let it run longer if needed. Kill with Ctrl+C.

---

### Task 3: Create startup script

**Files:**
- Create: `apps/slipgate-app/scripts/slipgate-dev.sh`

- [ ] **Step 1: Create the startup script**

```bash
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
```

- [ ] **Step 2: Make executable**

```bash
chmod +x apps/slipgate-app/scripts/slipgate-dev.sh
```

- [ ] **Step 3: Smoke test — verify Vite starts and becomes reachable**

Run:
```bash
cd ~/projects/quakeworld/apps/slipgate-app
bun run dev &
VITE_PID=$!
sleep 5
curl -s http://localhost:1420 | head -5
kill $VITE_PID
```
Expected: HTML output from Vite (the index.html with SolidJS app). This confirms the Vite half of the startup script works.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/scripts/slipgate-dev.sh
git commit -m "Add slipgate-dev.sh — single-command dev environment startup"
```

---

### Task 4: Add Claude Code hook for auto Rust sync

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/.claude/settings.json`

The hook fires after any Edit or Write to a file matching `*/src-tauri/*` and runs `sync-rust.sh` automatically.

- [ ] **Step 1: Add PostToolUse hook to project settings**

In `/home/paradoks/projects/quakeworld/.claude/settings.json`, add a `PostToolUse` entry to the existing `hooks` object:

```json
{
  "hooks": {
    "PreToolUse": [
      ... (existing — do not modify)
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "if echo \"$CLAUDE_FILE_PATHS\" | grep -q 'slipgate-app/src-tauri/'; then ~/projects/quakeworld/apps/slipgate-app/scripts/sync-rust.sh; fi"
          }
        ]
      }
    ]
  }
}
```

The `CLAUDE_FILE_PATHS` environment variable is set by Claude Code and contains the paths of files that were edited. The hook only fires the sync when a `src-tauri/` file was touched.

- [ ] **Step 2: Verify the hook fires**

Make a trivial edit to a Rust file (add a blank line, then remove it) and check that `sync-rust.sh` output appears. Then revert the edit.

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "Add post-edit hook: auto-sync src-tauri/ to Windows on Rust file changes"
```

---

### Task 5: Remove .git from Windows copy and install dependencies

**Files:**
- Remove: `/mnt/c/Users/Administrator/projects/slipgate-app/.git/`
- Run: `bun install` on Windows copy

The Windows copy had its own standalone git repo from before the monorepo migration. It's now a build mirror — git belongs in the WSL monorepo only.

- [ ] **Step 1: Remove the standalone .git directory**

Run from WSL:
```bash
rm -rf /mnt/c/Users/Administrator/projects/slipgate-app/.git
```

Verify:
```bash
ls /mnt/c/Users/Administrator/projects/slipgate-app/.git 2>&1
```
Expected: `No such file or directory`

- [ ] **Step 2: Install JS dependencies on Windows**

The Windows copy has `bun.lock` but no `node_modules/`. Run:
```bash
cd /mnt/c/Users/Administrator/projects/slipgate-app && bun.exe install
```
Expected: dependencies install successfully, `node_modules/` is created.

Note: `bun.exe` (not `bun`) — this invokes the Windows binary from WSL via interop.

- [ ] **Step 3: Verify Cargo dependencies are cached**

```bash
ls /mnt/c/Users/Administrator/projects/slipgate-app/src-tauri/target/debug/build/ | head -5
```
Expected: directories present from previous builds. Cargo will incrementally recompile — no full rebuild needed.

---

### Task 6: End-to-end test

No files to create — this validates the full workflow.

- [ ] **Step 1: Run the startup script**

```bash
./apps/slipgate-app/scripts/slipgate-dev.sh
```

Expected sequence:
1. "Syncing src-tauri/ to Windows..." → "src-tauri/ synced to Windows"
2. "Starting Vite..." → Vite output appears
3. "Waiting for localhost:1420..." → "Vite ready."
4. "Starting Tauri (Windows)..." → Cargo compilation output
5. A native Windows window appears showing the Slipgate app

- [ ] **Step 2: Test frontend hot reload**

With the dev environment running, make a visible change to a frontend file:

Edit `apps/slipgate-app/src/App.tsx` — change any visible text string (e.g., a tab label or heading). Save.

Expected: The Tauri window updates within 1-2 seconds without restarting. This confirms Vite HMR works through the WSL→localhost→WebView2 chain.

Revert the change after testing.

- [ ] **Step 3: Test Rust sync**

Edit `apps/slipgate-app/src-tauri/src/lib.rs` — add a comment line `// sync test` anywhere. Save.

Expected: If the Claude Code hook is active, `sync-rust.sh` fires automatically. If testing manually, run `./apps/slipgate-app/scripts/sync-rust.sh`. Then Cargo should recompile (visible in terminal output, ~5-15 seconds).

Revert the change after testing.

- [ ] **Step 4: Test shutdown**

Close the Tauri window (click X) or press Ctrl+C in the terminal.

Expected: "Shutting down..." → "Done." Both Vite and Tauri processes stop.

Verify nothing is left running:
```bash
lsof -i :1420 2>/dev/null; ps aux | grep -E "(vite|tauri)" | grep -v grep
```
Expected: no output.

---

### Task 7: Update DEVELOPMENT.md

**Files:**
- Modify: `apps/slipgate-app/docs/DEVELOPMENT.md`

- [ ] **Step 1: Rewrite DEVELOPMENT.md for split-process workflow**

Replace the current content with updated documentation that covers:
- The split-process architecture (WSL Vite + Windows Cargo)
- Prerequisites (same as before, plus rsync in WSL)
- One-time setup steps (what's already been done in previous tasks)
- Daily workflow: run `scripts/slipgate-dev.sh`, edit in Claude Code, hot reload works
- How Rust sync works (automatic via hook, manual fallback)
- The `bun run dev` fallback for frontend-only work (no Tauri window, browser only)
- Troubleshooting: port 1420 in use, Vite not starting, Cargo not connecting

Keep the existing sections that are still accurate:
- Tauri v2 key concepts (commands, plugins, capabilities)
- GitHub Actions CI/CD
- Troubleshooting tips that still apply

Remove:
- "Project Setup (First Time)" section that assumes cloning to Windows
- References to developing "on native Windows" as the primary workflow
- The "Differences from Other QW Projects" table (no longer accurate — slipgate-app now uses WSL too)

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/docs/DEVELOPMENT.md
git commit -m "Update DEVELOPMENT.md for split-process dev workflow (WSL Vite + Windows Cargo)"
```
