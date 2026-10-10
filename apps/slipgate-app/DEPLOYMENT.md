# Slipgate App -- Deployment Reference

> **Doc type: current** -- What a release of the desktop app is and where it can be built, as of 2026-10-10. The distribution story is not finalized: nothing is published for download yet.

## Infrastructure

| Property | Value |
|----------|-------|
| Platform | Windows desktop (Tauri v2, WebView2) |
| Artifacts | MSI + NSIS installers from `bun run tauri build` (`bundle.targets: "all"` in `tauri.conf.json`); portable `.zip` from `scripts/build-portable.sh` |
| Version | `0.1.0`, held in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `package.json` (three copies; bump together) |
| CI/CD | none. The repo's `.github/workflows/` holds only quad's two Docker workflows |
| Self-update | none. No `tauri-plugin-updater`; the "updater" inside the app manages ezQuake installs, not Slipgate |
| Source of truth | this monorepo on the dev cockpit; remote `ParadokS81/quakeworld` on GitHub |
| Build machine | a Windows machine with MSVC Build Tools, Rust (MSVC), Bun and WebView2; none is wired to the cockpit today |

## Release build

On the Windows machine, in a clone of the monorepo (setup in `docs/DEVELOPMENT.md`, "The Windows side", including the `src-tauri/resources/` bundle copy the build needs):

```powershell
cd quakeworld\apps\slipgate-app
bun install
bun run tauri build          # -> src-tauri\target\release\bundle\{msi,nsis}\
.\scripts\build-portable.sh  # bash (Git for Windows); -> src-tauri\target\release\slipgate-portable-0.1.0.zip
```

Run the frontend checks on the cockpit first (`bun test`, `bunx tsc --noEmit`, `bun run build`); only the Rust side needs Windows (`docs/DEVELOPMENT.md`).

The sequence above has not been run since the WSL workstation retired (2026-07). The earlier arrangement (Vite in WSL, Cargo on a Windows mirror synced by `scripts/sync-rust.sh`, launched by `scripts/slipgate-dev.sh` through `cmd.exe`) is gone; the scripts remain in the tree and `docs/DEVELOPMENT.md` says what each still does.

## What is not built

- No installer or portable zip is published anywhere; building from source is the only path (README).
- No code signing, no auto-update feed, no GitHub Release of Slipgate itself.
- Non-Windows builds: Tauri would build on Linux (webkit2gtk) and macOS (WKWebView), but the hardware scan, the SetupAPI walk and the mailslot IPC are Windows-only with stub branches elsewhere (`docs/SYSTEM-SPECS.md`).

## Architecture note

Tauri v2 builds a native binary around the OS webview (WebView2 on Windows), roughly 5-10 MB with low memory use next to Electron. Bundle targets and window settings live in `src-tauri/tauri.conf.json`.
