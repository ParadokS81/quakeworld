# Development Environment -- Slipgate App

> **Doc type: current** -- How the app is developed from the dev cockpit as of 2026-10-10, and what still needs a Windows machine. Replaces the WSL + Windows split-process description that stood here until the WSL workstation retired (2026-07).

## Where the code runs

The source of truth is this monorepo checkout on the dev cockpit, a Linux container on the Unraid box (`/home/dev/projects/quakeworld/apps/slipgate-app`). Everything JavaScript-side runs there. The Rust/Tauri side cannot: a Tauri desktop build needs a Windows toolchain and WebView2, and the cockpit has neither, nor the GTK/WebKit libraries a Linux `cargo check` of the Tauri crate wants.

| On the cockpit | Works? | Checked |
|---|---|---|
| `bun install` | yes | `node_modules/` present |
| `bun test` | yes: 231 tests across 24 files | 2026-10-10 |
| `bunx tsc --noEmit` | yes, clean | 2026-10-10 |
| `bun run build` (Vite) | yes, ~20 s, one "chunk larger than 500 kB" warning | 2026-10-10 |
| `bun run dev` (Vite dev server) | yes, see "Frontend-only development" | 2026-10-10 |
| `cargo check` / `cargo build` in `src-tauri/` | no: `gtk+-3.0`, `webkit2gtk-4.1`, `javascriptcoregtk-4.1`, `libsoup-3.0` absent (`pkg-config --exists`) | 2026-10-10 |
| `bun run tauri dev` / `bun run tauri build` | no: Windows only | |

Rust edits are written here and compiled elsewhere. Nothing in the repo wires that "elsewhere" today; see "The Windows side".

## Frontend-only development

For UI work that does not need Rust commands:

```bash
cd /home/dev/projects/quakeworld/apps/slipgate-app
bun run dev -- --host 0.0.0.0 --port 5173
```

Then open `http://100.114.81.91:5173` from the operator's machine: the cockpit is reached over Tailscale, so a `localhost` URL is useless there. Vite's default port 1420 is not published from the cockpit; only 5173 and 5174 are, and both are shared with the traveldiary preview lanes, so pick whichever is free (5174 was serving that project's test pipeline on 2026-10-10). `--host` is required because `vite.config.ts` binds to localhost unless `TAURI_DEV_HOST` is set.

Calls to `invoke()` (Tauri commands) fail in a plain browser; guard with `window.__TAURI__` checks or mock for pure UI work. Hot reload works. `vite.config.ts` still polls the filesystem every 500 ms, a WSL-era setting for cross-filesystem watching; harmless here.

## Verification before claiming frontend work done

`bun run build` transpiles even when types are wrong; it is not a type check. Run all three:

```bash
bun run build
bunx tsc --noEmit
bun test
```

A `WeaponBind = FiringPath` type-alias shim once let two runtime crashes (`wb.key.toUpperCase()` on an object that only has `trigger_key`) through four green Vite builds and their reviewers; `tsc` caught them (weapon classifier v2, 2026-04). Flag new `tsc` errors in the task's own files as blockers; pre-existing errors elsewhere are tracked separately. Baseline on 2026-10-10: zero errors. When a final review runs, ask it explicitly to run `tsc`; per-task reviewers trust the build.

There is no linter wired: `CLAUDE.md` names Biome, but the app has no `biome.json`, no `lint` script and no Biome dependency (HANDOVER Small followups).

## Calling a Tauri command from devtools

`tauri.conf.json` does not set `app.withGlobalTauri`, so in a running app `window.__TAURI__.core.invoke(...)` is undefined in the devtools console, and Vite blocks a bare `await import("@tauri-apps/api/core")` there. To smoke a new command by hand, three options, cheapest first:

1. Trust the proxy signals (Cargo clean, `bun test` green, the app boots after handler registration) for trivial commands, and let the next phase that consumes the output verify the value. Picked for `get_data_root` on 2026-04-26.
2. Add a one-shot `invoke("<cmd>").then(console.log)` to `App.tsx`, reload (no rebuild in dev), read the output, revert in the same commit. About two minutes. Use when the return value is non-trivial.
3. A dev-only Tauri config overlay with `withGlobalTauri: true`, passed as `bun run tauri dev --config <overlay>`. Never in the main config: that would expose `__TAURI__` in shipped builds to extensions and userscripts, which is why Tauri v2 ships it off. Worth it only if devtools smoke tests become routine.

## The Rust side and the sync hook

### What the hook does today

The monorepo's `.claude/settings.json` has a `PostToolUse` hook: any Edit or Write under `slipgate-app/src-tauri/` runs `scripts/sync-rust.sh`. The script does two things:

1. Copies `src/lib/config/data/ezquake-asset-bundle.json` and `fte-asset-bundle.json` into `src-tauri/resources/` (gitignored). `browse.rs` embeds them with `include_str!`, so **a fresh checkout does not compile until this copy has run**, on any machine.
2. `rsync`s `src-tauri/` to the WSL-era Windows mirror at `/mnt/c/Users/$SLIPGATE_WIN_USER/projects/slipgate-app`.

On the cockpit step 1 succeeds and step 2 fails: `rsync` is not installed and `/mnt/c` does not exist. Expect a hook error after every Rust edit; it is harmless, and the bundle copy before it is the one thing the hook still does here. Making the script skip the rsync when the mirror is absent is a HANDOVER row, not done yet. `scripts/slipgate-dev.sh` (start Vite, launch Tauri through `cmd.exe`) and `create-shortcut.ps1` are from the same era and do not run here.

### The Windows side

A Tauri build or `bun run tauri dev` needs a Windows machine with:

- Microsoft C++ Build Tools ("Desktop development with C++" workload: MSVC, Windows SDK, CMake)
- Rust via `rustup` (the default MSVC toolchain)
- Bun
- WebView2 runtime (pre-installed on Windows 10 1803+ and Windows 11)

The repo no longer describes a wired path from the cockpit to such a machine. The former workflow (edit in WSL, rsync `src-tauri/` to a Windows mirror, Vite in WSL serving a Tauri window on Windows through WSL2 localhost sharing) ended when the WSL workstation retired in 2026-07; the operator's desktop is Linux. What is still true: the monorepo is on GitHub (`ParadokS81/quakeworld`), so a Windows machine can clone it and build in place:

```powershell
git clone git@github.com:ParadokS81/quakeworld.git
cd quakeworld\apps\slipgate-app
bun install
# the include_str! prerequisite (sync-rust.sh step 1), by hand on Windows:
mkdir src-tauri\resources
copy src\lib\config\data\ezquake-asset-bundle.json src-tauri\resources\
copy src\lib\config\data\fte-asset-bundle.json src-tauri\resources\
bun run tauri dev      # or: bun run tauri build
```

This sequence has not been exercised since the workstation retired; it is the documented expectation, not a verified run (HANDOVER Small followups). The app's `restart` slash command drives Windows processes through `powershell.exe` and says so when invoked from the cockpit.

## Project structure

```
slipgate-app/
├── src-tauri/                # Rust backend (Tauri v2)
│   ├── src/
│   │   ├── main.rs           # entry point
│   │   ├── lib.rs            # app builder, tray, generate_handler! command registration
│   │   └── commands/         # 20 command modules (mod.rs lists them)
│   ├── resources/            # gitignored; asset bundles copied in by sync-rust.sh (include_str!)
│   ├── capabilities/         # Tauri v2 permissions (default.json)
│   ├── icons/
│   ├── Cargo.toml
│   └── tauri.conf.json       # window, bundle targets, devUrl localhost:1420
├── src/                      # SolidJS frontend
│   ├── index.tsx, App.tsx    # entry + every signal (docs/STATE.md)
│   ├── components/           # tabs, the ConfigViewer family, Browse, Matches, quake-dir UI
│   ├── lib/
│   │   ├── config/           # parser, loaders, converter, writers + data/ (oracle snapshots)
│   │   ├── quake-dir/        # frontend half of Quake Dir Control (+ tests)
│   │   └── simulator/        # Player State Simulator (pure TS, 8 modules + 8 test files)
│   ├── data/                 # EloShapes mice / mousepads JSON
│   ├── store.ts, auth.ts, firebase.ts, types.ts
│   └── app.css
├── assets/                   # test configs (bps, ibsen, peppe, phrenic, sae), weapon-fixtures/, teamsays/, images
├── scripts/
│   ├── sync-rust.sh          # bundle copy + WSL-era rsync (above)
│   ├── slipgate-dev.sh       # WSL-era launcher, inert here
│   ├── build-portable.sh     # portable .zip from a release build
│   └── pak-extract.py        # extract a Quake .pak to a directory
├── create-shortcut.ps1       # WSL-era Windows desktop shortcut; hardcodes the old mirror path
├── visual/sample-style/      # static HTML/CSS style sample
└── index.html, vite.config.ts, tsconfig.json, package.json, bun.lock
```

No `biome.json`. No `.github/workflows/` for this app: the repo's two workflows are quad's.

## Tauri v2 key concepts

### Commands (Rust <-> frontend)

Rust functions marked `#[tauri::command]`, registered in the `generate_handler![]` macro in `src-tauri/src/lib.rs` (40 entries on 2026-10-10), called from TypeScript as `invoke<T>("snake_case_name", args)`. A new module also needs a `pub mod` line in `src-tauri/src/commands/mod.rs`.

### Plugins in use

`Cargo.toml` and `package.json` carry three Tauri plugins: `tauri-plugin-opener` (open URLs in the system browser; Discord OAuth), `tauri-plugin-dialog` (file pickers) and `tauri-plugin-store` (`profile.json` persistence). There is no updater, shell, notification or autostart plugin; the app does not update itself.

### Capabilities

Tauri v2's permission system. `src-tauri/capabilities/default.json` grants the frontend its API access.

## Troubleshooting

### Hook error after editing a Rust file
`sync-rust.sh` failed at its rsync step (no `rsync`, no `/mnt/c`). Expected on the cockpit; the bundle copy before it still ran.

### `include_str!` cannot find `resources/...`
Run `scripts/sync-rust.sh` (its first step does the copy) or copy the two bundles by hand; the folder is gitignored.

### The operator cannot open the dev server
Port 1420 is not published from the cockpit. Restart Vite with `--host 0.0.0.0 --port 5173` (or 5174) and hand over the Tailscale address.

### Port already in use
`ss` is not installed on the cockpit, so `ss -ltn | grep :<port>` says nothing even when the port is busy. Probe with `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:<port>/`: a 200 means something else is serving there. Stop only a Vite you started, by its pid.

## Building the portable artifact

Slipgate ships in two modes detected at startup by an adjacent `data/portable.flag` (`data_root.rs`). `bun run tauri build` produces MSI + NSIS installers under `src-tauri/target/release/bundle/`; the portable zip is a separate step:

```bash
bun run tauri build
./scripts/build-portable.sh
```

The script packages `src-tauri/target/release/slipgate-portable-<version>.zip` containing the release exe plus an empty `data/portable.flag`. Extracted anywhere, the exe uses the adjacent `data/` as its data root; without the flag it falls back to `%APPDATA%/com.slipgate.app/`. It reads from `target/release/`, so it runs on the Windows build machine (bash via Git for Windows) and needs `zip` on PATH.
