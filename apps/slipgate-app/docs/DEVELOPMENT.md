# Development Environment — Slipgate App

## How Dev Works (Split-Process Model)

Slipgate App uses a split-process workflow: **Vite runs in WSL** (where the source files live), and **Cargo/Tauri runs on Windows** (where the Windows toolchain lives). WSL2's localhost sharing bridges them — the Tauri WebView2 window loads the frontend from WSL's Vite server.

```
WSL (Ubuntu)                          Windows
─────────────────────────────         ──────────────────────────────────
apps/slipgate-app/  (git repo)        C:\Users\Administrator\projects\
  src/              ◄── edit here       slipgate-app\  (build-only mirror)
  src-tauri/  ──rsync──────────────►    src-tauri\  (synced from WSL)
                                        node_modules\  (Windows copy)
                                        target\        (Rust build cache)
  scripts/
    slipgate-dev.sh  ──launches──►    dev-no-vite.cmd
                                        bun run tauri dev --config tauri.dev.conf.json
         │
         ▼
  Vite dev server (localhost:1420)
         │
         │  WSL2 localhost sharing
         ▼
  WebView2 window (Windows)
```

- **Frontend changes** (SolidJS/CSS): Hot reload via Vite, instant
- **Rust changes**: rsync triggered by Claude Code hook → Cargo recompiles (~5-15s) → window refreshes
- **Tauri config changes**: Require restarting the dev session

The Windows copy is **not a git repo**. All git history lives in the WSL monorepo.

---

## Prerequisites

### WSL (Ubuntu)

**Bun** — JavaScript runtime and package manager (installed via npm):
```bash
npm install -g bun
```

**rsync** — for syncing Rust source to Windows (usually pre-installed):
```bash
sudo apt install rsync
```

### Windows

#### 1. Microsoft C++ Build Tools
Required by Rust for compiling native code.

- Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Select **"Desktop development with C++"** workload
- This installs MSVC compiler, Windows SDK, and CMake

#### 2. WebView2 Runtime
Tauri uses Edge's WebView2 for rendering the frontend.

- **Windows 10 (v1803+) and Windows 11:** Pre-installed. No action needed.
- Verify: Search "WebView2" in Windows settings → Apps

#### 3. Rust
```powershell
winget install Rustlang.Rustup
# Or download from: https://rustup.rs
# Choose option 1 (default) — installs the MSVC toolchain
```

After install, restart your terminal, then verify:
```powershell
rustc --version
cargo --version
```

#### 4. Bun
```powershell
winget install Oven-sh.Bun
# Or: powershell -c "irm bun.sh/install.ps1 | iex"
```

---

## One-Time Setup (Reference)

These steps were done once to establish the split-process workflow. Documented here in case it ever needs to be rebuilt.

**In Windows CMD/PowerShell:**
```powershell
# Create the Windows build mirror
mkdir C:\Users\Administrator\projects\slipgate-app
cd C:\Users\Administrator\projects\slipgate-app

# Copy package.json and other JS config files from WSL (e.g. via Windows Explorer at \\wsl$\Ubuntu\...)
# Then install Windows-native node_modules:
bun install
```

**In WSL:**
```bash
# Initial Rust sync
~/projects/quakeworld/apps/slipgate-app/scripts/sync-rust.sh
```

The batch file `dev-no-vite.cmd` lives in the Windows mirror at
`C:\Users\Administrator\projects\slipgate-app\dev-no-vite.cmd`. It runs:
```bat
@echo off
cd /d C:\Users\Administrator\projects\slipgate-app
bun run tauri dev --config tauri.dev.conf.json
```

The `--config tauri.dev.conf.json` flag points to a dev-only config override that sets the `devUrl` to `http://localhost:1420` instead of running Vite internally.

Note: CMD shows a UNC path warning when launched from WSL — this is cosmetic, the `cd /d` handles it.

---

## Daily Workflow

```bash
# From WSL, in the monorepo root or the app directory:
~/projects/quakeworld/apps/slipgate-app/scripts/slipgate-dev.sh
```

This script:
1. Runs `sync-rust.sh` to push the current Rust source to Windows
2. Starts `bun run dev` (Vite) in WSL, waits for localhost:1420
3. Launches the Windows batch file via `cmd.exe` (foreground — blocks until the Tauri window closes)
4. On exit/Ctrl+C, kills the Vite process cleanly

Edit files normally in WSL. Frontend changes hot-reload instantly. Rust changes trigger auto-sync (see below) and Cargo recompiles on the Windows side.

---

## How Rust Sync Works

### Automatic (Claude Code hook)

A `PostToolUse` hook in `.claude/settings.json` watches for edits to any file under `slipgate-app/src-tauri/` and runs `sync-rust.sh` automatically after each save. No manual steps needed when working with Claude Code.

### Manual fallback

```bash
~/projects/quakeworld/apps/slipgate-app/scripts/sync-rust.sh
```

This rsyncs `src-tauri/` from the WSL monorepo to the Windows mirror, excluding `target/` (the Windows Rust build cache stays on Windows).

---

## Frontend-Only Development

For UI work that doesn't need the Tauri window (no Rust commands, no system APIs):

```bash
cd ~/projects/quakeworld/apps/slipgate-app
bun run dev
```

Opens at `http://localhost:1420` in any browser. Hot reload works. Faster iteration cycle — no Windows involvement at all.

Note: Calls to `invoke()` (Tauri commands) will fail in browser mode. Use mocks or guard with `window.__TAURI__` checks for pure UI work.

---

## Other Commands

```bash
# Lint with Biome
bun run lint

# Run tests
bun test
```

Release builds are handled by GitHub Actions (see CI/CD section below) — no local release builds needed.

---

## Project Structure

```
slipgate-app/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── lib.rs          # Tauri app builder, command registration
│   │   └── commands/       # Tauri command handlers
│   ├── Cargo.toml          # Rust dependencies
│   ├── tauri.conf.json     # Tauri configuration (window, tray, plugins)
│   ├── tauri.dev.conf.json # Dev config override (devUrl → WSL Vite server)
│   ├── icons/              # App icons (all sizes)
│   └── capabilities/       # Tauri v2 permission capabilities
├── src/                    # SolidJS frontend
│   ├── App.tsx
│   ├── index.tsx           # Entry point
│   └── styles/
├── scripts/
│   ├── slipgate-dev.sh     # Startup script (WSL Vite + Windows Cargo)
│   └── sync-rust.sh        # Rsync src-tauri/ to Windows mirror
├── index.html              # Vite entry HTML
├── package.json            # JS dependencies + scripts
├── vite.config.ts          # Vite config with SolidJS plugin
├── tsconfig.json           # TypeScript config
└── biome.json              # Linter config
```

---

## Tauri v2 Key Concepts

### Commands (Rust ↔ Frontend communication)
Rust functions exposed to the frontend via `#[tauri::command]`:

```rust
// src-tauri/src/commands/system.rs
#[tauri::command]
fn get_cpu_info() -> String {
    "AMD Ryzen 7 5800X".to_string()
}
```

```typescript
// src/App.tsx
import { invoke } from '@tauri-apps/api/core';

const cpuInfo = await invoke<string>('get_cpu_info');
```

### Plugins
Tauri v2 uses a plugin system for extended functionality:
- `tauri-plugin-store` — Persistent key-value storage (for auth tokens)
- `tauri-plugin-shell` — Open URLs in browser (for OAuth)
- `tauri-plugin-notification` — Desktop notifications
- `tauri-plugin-updater` — Auto-update from GitHub Releases
- `tauri-plugin-autostart` — Start on login

Plugins are added in `Cargo.toml` (Rust) and `package.json` (JS bindings).

### Capabilities (Permissions)
Tauri v2 uses a capability-based permission system. Each capability grants the frontend access to specific APIs. Defined in `src-tauri/capabilities/`.

---

## GitHub Actions (CI/CD)

Cross-platform builds are handled by `tauri-action`:

- **Trigger:** Push to `main` or create a git tag
- **Matrix:** Windows, Linux (Ubuntu), macOS (ARM + Intel)
- **Output:** Binaries + installers uploaded to GitHub Releases
- **Auto-updater:** Generates `latest.json` for the Tauri updater plugin

Signing keys for the auto-updater are stored as GitHub Secrets:
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

---

## Troubleshooting

### Port 1420 already in use
A previous Vite process may still be running:
```bash
lsof -i :1420
kill <PID>
```

### Vite not starting / exits immediately
```bash
cd ~/projects/quakeworld/apps/slipgate-app
bun run dev
```
Run Vite directly to see the error. Common causes: missing `node_modules` (run `bun install`) or a syntax error in `vite.config.ts`.

### Cargo not connecting to Vite (blank or error window)
- Confirm Vite is up: `curl http://localhost:1420` from WSL should return HTML
- Check WSL2 localhost sharing is enabled (Windows Settings → WSL → "localhost forwarding")
- Verify `tauri.dev.conf.json` has `"devUrl": "http://localhost:1420"`

### Rust changes not appearing after edit
The Claude Code hook should run `sync-rust.sh` automatically. If it didn't:
```bash
~/projects/quakeworld/apps/slipgate-app/scripts/sync-rust.sh
```
Then the Windows Cargo process should detect the file change and recompile.

### Stale processes after Ctrl+C
If `slipgate-dev.sh` didn't clean up cleanly:
```bash
# Kill Vite in WSL
lsof -i :1420 | grep LISTEN | awk '{print $2}' | xargs kill
```
The Windows Tauri process can be killed from Task Manager or by closing the window.

### WebView2 not found
Should be pre-installed on Windows 10/11. If missing:
- Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- Install the "Evergreen Bootstrapper"

### Rust compilation is slow
First compile downloads and builds all dependencies. Subsequent builds use cache and are much faster. If consistently slow:
- Check antivirus isn't scanning the `target\` directory — add an exclusion for the project folder
