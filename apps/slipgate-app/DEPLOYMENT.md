# Slipgate App — Deployment Reference

## Infrastructure

| Property | Value |
|----------|-------|
| Platform | Windows desktop (Tauri v2) |
| Distribution | .exe installer / .msi |
| CI/CD | GitHub Actions (builds Win/Mac/Linux on push to main) |
| Source location | WSL monorepo (`apps/slipgate-app/`) |
| Build mirror | `C:\Users\Administrator\projects\slipgate-app` (Rust/Tauri only) |
| Build environment | Split: Vite in WSL, Cargo/Tauri on Windows |

## Prerequisites

- **WSL**: Bun (for Vite dev server), rsync
- **Windows**: Rust via `rustup` (MSVC toolchain), Bun, Microsoft C++ Build Tools, WebView2

See `docs/DEVELOPMENT.md` for full setup instructions.

## Dev Workflow

**One command from WSL:**
```bash
./apps/slipgate-app/scripts/slipgate-dev.sh
```

This script:
1. Syncs `src-tauri/` from WSL → Windows mirror via rsync
2. Starts Vite in WSL (localhost:1420)
3. Launches Tauri on Windows (loads from localhost:1420)

Frontend changes (SolidJS) → instant hot reload via Vite.
Rust changes → synced to Windows, Cargo rebuilds (~5-15s).

### How it works

```
WSL (monorepo)                    Windows (build mirror)
  src/ (SolidJS)                    src-tauri/ (synced via rsync)
  vite.config.ts                    node_modules/ (Windows-native)
  Vite on :1420 ─────────────────► Tauri WebView2 loads from :1420
```

Two separate node_modules installs — WSL gets Linux-native binaries, Windows gets Windows-native binaries. They can't be shared (platform-specific native modules like rollup, esbuild).

### Supporting files

| File | Location | Purpose |
|------|----------|---------|
| `scripts/slipgate-dev.sh` | WSL monorepo | Main dev entry point |
| `scripts/sync-rust.sh` | WSL monorepo | rsync src-tauri/ to Windows |
| `dev-no-vite.cmd` | Windows mirror | Launches Tauri without starting Vite |
| `tauri.dev.conf.json` | Windows mirror | Overrides beforeDevCommand to empty |

## Deploy Workflow

### Manual build (Windows terminal)

```powershell
cd C:\Users\Administrator\projects\slipgate-app
bun run tauri build
```

The built binary is in `src-tauri/target/release/`.

### CI build (GitHub Actions)

Pushing to `main` triggers a matrix build across Windows, macOS, and Linux. See `.github/workflows/` for configuration.

## Architecture Notes

Tauri v2 builds native desktop apps using the OS's own webview:
- On Windows: builds .exe using MSVC toolchain + WebView2
- On Linux: builds using system webkit2gtk
- On macOS: builds using WKWebView

The binary is ~5-10 MB with low memory usage compared to Electron.
