# Slipgate App — Deployment Reference

## Infrastructure

| Property | Value |
|----------|-------|
| Platform | Windows desktop (Tauri v2) |
| Distribution | .exe installer / .msi |
| CI/CD | GitHub Actions (builds Win/Mac/Linux on push to main) |
| Source location | WSL monorepo (`apps/slipgate-app/`) |
| Build environment | Native Windows (Tauri needs Windows toolchain) |

## Prerequisites

- **Rust** — via `rustup` (MSVC toolchain)
- **Bun** — JavaScript runtime and package manager
- **Microsoft C++ Build Tools** — "Desktop development with C++" workload
- **WebView2** — pre-installed on Windows 10/11

See `docs/DEVELOPMENT.md` for full setup instructions.

## Deploy Workflow

### Manual build (Windows terminal)

```bash
cd \\wsl.localhost\Ubuntu\home\paradoks\projects\quakeworld\apps\slipgate-app
bun install
bun run tauri build
```

The built binary is in `src-tauri/target/release/`.

### CI build (GitHub Actions)

Pushing to `main` triggers a matrix build across Windows, macOS, and Linux. See `.github/workflows/` for configuration.

## WSL-to-Windows Dev Workflow

**Status: TBD**

Source lives in WSL monorepo for consistency with other projects, but Tauri needs the Windows toolchain. An automated mechanism for building from WSL and testing on Windows is not yet set up.

Current workaround: open a Windows terminal, navigate to the WSL path, and run build commands directly.

## Architecture Notes

Tauri v2 builds native desktop apps using the OS's own webview:
- On Windows: builds .exe using MSVC toolchain + WebView2
- On Linux: builds using system webkit2gtk
- On macOS: builds using WKWebView

The binary is ~5-10 MB with low memory usage compared to Electron.
