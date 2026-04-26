# Quake Dir Control

Slipgate's multi-version client management subsystem. See plan: `docs/superpowers/plans/2026-04-26-quake-dir-control.md`.

## Portable vs installed mode

Slipgate detects mode at startup by checking for an adjacent `data/portable.flag` file:

- **Installed**: data root is `%APPDATA%/com.slipgate.app/` (or platform equivalent).
- **Portable**: data root is `<exe-dir>/data/`.

### Smoke-test protocol (Windows-only)

1. Build: `bun run tauri build && ./scripts/build-portable.sh`
2. Test installed: install the MSI, launch, devtools-call `invoke("get_data_root")`, confirm `mode: "installed"` and the AppData path.
3. Test portable: extract the portable .zip to `D:\Test\`, launch `D:\Test\slipgate-portable\slipgate-app.exe`, devtools-call `invoke("get_data_root")`, confirm `mode: "portable"` and `path` ending in `D:\Test\slipgate-portable\data`.
4. Side-by-side: confirm AppData state and portable state are independent (set a profile field in one, confirm the other doesn't see it).
