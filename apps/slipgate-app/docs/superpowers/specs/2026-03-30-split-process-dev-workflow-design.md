# Split-Process Dev Workflow for Slipgate App

**Date:** 2026-03-30
**Status:** Approved
**Problem:** slipgate-app (Tauri v2) needs the Windows toolchain but lives in a WSL monorepo. `bun run tauri dev` can't run from WSL.

## Architecture

Two processes connected via localhost. Vite runs in WSL on the monorepo source files, serving the SolidJS frontend on `localhost:1420`. Cargo/Tauri runs on Windows from a build-only mirror copy, opening a WebView2 window that loads from that same localhost URL. WSL2 shares localhost with Windows automatically.

```
WSL                                         Windows
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Claude Code                  │    │ cargo tauri dev               │
│   edits src/ and src-tauri/  │    │   builds Rust backend         │
│                              │    │   watches src-tauri/src/       │
│ Vite (bun run dev)           │    │   opens WebView2              │
│   serves on localhost:1420 ──┼────┼─► loads localhost:1420        │
└──────────────────────────────┘    └──────────────────────────────┘
```

**Source of truth:** WSL monorepo (`apps/slipgate-app/`)
**Windows copy:** Build-only mirror at `C:\Users\Administrator\projects\slipgate-app\`. Not a git repo.

## Startup

A single shell script (`scripts/slipgate-dev.sh`) run from WSL:

1. Syncs `src-tauri/` to the Windows copy via rsync (catches any changes since last session)
2. Starts Vite in WSL background (`bun run dev`)
3. Waits for `localhost:1420` to respond
4. Launches `cargo tauri dev` on Windows via `cmd.exe`, using a config override that sets `beforeDevCommand` to empty string (skips Vite, since it's already running in WSL)
5. On exit (Ctrl+C or window close), kills the Vite process

### Windows-side files

**`dev-no-vite.cmd`** — Batch file that runs Cargo with the config override:
```cmd
cd /d C:\Users\Administrator\projects\slipgate-app
cargo tauri dev --config tauri.dev.conf.json
```

**`tauri.dev.conf.json`** — Merged with `tauri.conf.json` at runtime, overrides only `beforeDevCommand`:
```json
{
  "build": {
    "beforeDevCommand": ""
  }
}
```

## Rust Sync

Frontend changes (`src/`) need no sync — Vite reads them directly from WSL. Rust changes (`src-tauri/`) must reach the Windows copy for Cargo to recompile.

**`scripts/sync-rust.sh`** syncs `src-tauri/` (excluding `target/`) via rsync. Fast (<100ms, ~5-10 source files).

**Triggered by:**
- A Claude Code post-edit hook that fires on any `src-tauri/` file change (automatic, zero manual steps)
- The startup script (initial sync before launching)
- Manual invocation as fallback

**Dependency changes:**
- `Cargo.toml` changes are covered by the rsync (syncs the whole `src-tauri/` directory minus `target/`)
- `package.json` changes (rare) require `bun install` on both sides — Claude flags this and runs the Windows install via `cmd.exe`

## One-Time Setup

### Windows (`C:\Users\Administrator\projects\slipgate-app\`)

1. Remove `.git/` directory — this copy is a build mirror, not a repo
2. Create `dev-no-vite.cmd` (startup batch file)
3. Create `tauri.dev.conf.json` (config override)
4. Verify `bun install` and `cargo build` work (should already be current)

### WSL monorepo

5. Create `scripts/slipgate-dev.sh` (startup script, make executable)
6. Create `scripts/sync-rust.sh` (Rust sync helper, make executable)
7. Add Claude Code post-edit hook for auto-sync on `src-tauri/` changes
8. Update `docs/DEVELOPMENT.md` to document the split-process workflow

## What doesn't change

- Monorepo git structure (all commits in WSL)
- How other apps work
- CI/GitHub Actions plans (builds from source as normal)
- `vite.config.ts` (already has `usePolling: true`)
- `tauri.conf.json` in the monorepo (unchanged; the Windows override is a separate file)

## Daily Workflow

1. Run `./apps/slipgate-app/scripts/slipgate-dev.sh`
2. Tauri window appears. Claude Code edits files in WSL.
3. Frontend edits → instant hot reload via Vite
4. Rust edits → auto-synced to Windows → Cargo recompiles (~5-15s)
5. Close window or Ctrl+C to stop everything
