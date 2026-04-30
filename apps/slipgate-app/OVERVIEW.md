# Slipgate App — Overview

> **Doc type: load-bearing slim** — parked-with-purpose attestation, design intent, code landmarks, integration boundaries. NOT a feature catalog. When a fact in this file changes, update it. When you need to learn what a feature does, read the source.

---

## What the app is

A **Windows-first desktop companion for QuakeWorld players**. Tauri v2 (Rust backend + SolidJS frontend, OS webview). Lives in the system tray.

It does four things a web browser can't:
1. **Reads your hardware and peripherals** (CPU, GPU, RAM, monitor, mouse, keyboard, audio devices)
2. **Reads and compares ezQuake configs** (your `config.cfg` and everything it execs)
3. **Manages your ezQuake install** (version detection, updater, launcher, stable + snapshot channels)
4. **Is your gear/setup profile** (what you play on, linked to your Discord identity)

It does NOT yet do: match scheduling, desktop notifications, `qw://` protocol handler, cloud config sync, or tournament mode. Those are ideas, not features.

---

## Map at a glance

The app opens to a 6-tab vertical sidebar (`SideNav.tsx` — Schedule / Profile / Tools / Feed / MyQuake / Settings). Each tab lives in `src/components/<Name>Tab.tsx`. The richest tab is Profile (`ProfileTab.tsx`, ~870 lines); the biggest *subsystem* by far is the **ConfigViewer** under MyQuake → Domains → Configs (20+ components in `src/components/Config*.tsx` plus `CvarRow.tsx`, `CvarTooltip.tsx`, `configMerger.ts`, `AliasChainResolver.tsx`, ~3,000 lines total). The **Player State Simulator** at `src/lib/simulator/` (pure TS, 7 modules + 92 tests) backs the State view in the ConfigViewer's right rail and the Alias Chain Pretty View. Rust commands live under `src-tauri/src/commands/` (~5,200 lines across `system.rs` / `ezquake.rs` / `weapon_classifier.rs` / `weapon_triggers.rs` / `scanner.rs` / `archive.rs` / `updater.rs` / `locs.rs` / `watcher.rs` / `auth.rs` / `screenshot.rs` plus the `quake-dir` cluster: `data_root.rs`, `version_warehouse.rs`, `warehouse_reconcile.rs`, `version_swap.rs`, `client_fingerprint.rs`, `release_cache.rs`, `bulk_import.rs`). Profile data persists via `tauri-plugin-store` → `profile.json` (`store.ts`, see `STATE.md`). Discord OAuth lands at `localhost:17420` then exchanges for a Firebase custom token (`auth.ts` + `commands/auth.rs`).

---

## Parked with real purpose (not dead code)

Things that exist in the codebase but aren't fully alive — kept for stated reasons.

| Item | Where | Status / intent |
|---|---|---|
| Schedule tab | `ScheduleTab.tsx` | Placeholder (11 lines). Key future feature — ties to Slipgate web scheduler + desktop notifications + quick availability toggle. |
| MyQuake → Browse mode (PCX/TGA/WAD preview) | `browse.rs`, `MyQuakeTab.tsx` | Browse mode is live for PNG/JPG. PCX, TGA, WAD preview deferred to Phase 2. |
| MyQuake → Domains → Maps subtab | `MyQuakeTab.tsx` | Disabled placeholder. Future phase. |
| MyQuake → Domains → Matches subtab | `MyQuakeTab.tsx` | Disabled placeholder. Demos + screenshots browser with stats. Future phase. |
| MyQuake → Domains → Assets subtab | `MyQuakeTab.tsx` | Disabled placeholder. Textures, skins, sounds, paks browser. Future phase. |
| Screenshot automation | `screenshot.rs` (Rust); UI surface dropped in Phase 3.5a | POC works end-to-end but has hardcoded Administrator path + fragile timings. Future home: Profile picture-generator (HANDOVER "Screenshot POC → Profile picture generator"). |
| `equipment_history` field + `addEquipmentHistory()` | `store.ts` | Intentionally parked for future community gear-discussion feature — members can check in with each other about brand/model experience. |
| `_dropped-clients-sections.tsx` (Input / Video / Launch / Screenshot POC code) | `src/components/_dropped-clients-sections.tsx` | Dropped from user-facing surface in Phase 3.5a; preserved for future arcs. The `launch_ezquake` and `capture_screenshot` Tauri commands stay callable from Rust. |
| "View as Primary" for in-archive configs | `ConfigViewer.tsx:555-558` | Known limitation, warns on console. Needs full pak path in `ConfigEntry` to implement. |
| Linux/macOS parity | `system.rs` non-Windows branches | Returns `None`/empty for GPU, display, audio, HID, DDR gen. Windows-only by design. |

---

## True cruft (safe to delete — confirmed with user)

| Item | Where | Reason |
|---|---|---|
| `greet` command | `lib.rs:9-12` | Tauri scaffolding leftover, unused. |
| `TabNav.tsx` | `components/TabNav.tsx` | 29 lines, imported nowhere. User doesn't remember what it was for. |
| `ConfigCategoryBar.tsx` | `components/ConfigCategoryBar.tsx` | 156 lines, imported nowhere. Pre-dates the current sidebar. |
| `md-5` crate + `verify_md5` function | `Cargo.toml`, `updater.rs:468-485` | Function defined but never called — snapshot MD5 verification was written but never wired up. |
| Debug `console.log` dump | `App.tsx:113-123` | Prints MOVEMENT/WEAPONS/LG_SENS on every config load. |

---

## Design intent — invariants that aren't grep-able

**Store merge priority (highest → lowest):** override > config-parsed > auto-detected > null. Auto-detected hardware specs re-scan every launch and are never saved. Config-derived values (sens, fov, name, colors) re-parse every launch. User input (DPI, gear, grip, aim) is saved and never auto-overwritten. Overrides (display res/Hz, audio) are saved and take priority over auto-detected. `migrateProfile()` handles v1 → v2 schema migration plus rescues `ezquake_exe_path` from old `localStorage`. Full schema lives in `STATE.md`.

**ezQuake's absent-default cvar pattern.** ezQuake only saves non-default cvars (`cfg_save_unchanged 0`); the parser fills in missing cvars from a known-defaults table in `ezquake.rs`. Full model in `EZQUAKE-RESOLUTION.md`.

**Resolution three-layer model.** See `EZQUAKE-RESOLUTION.md`.

**Quake Dir Control invariants.** Content-addressed binary store at `<data-root>/binaries/blobs/<sha256>.exe` with per-(client, version, variant) manifests. `swap_active_version` is the SINGLE swap path: foreign-exe backup heuristic (warehouse-known bytes don't get backed up; foreign bytes rename to `<stem>.bak.exe`), atomic-rename via `<canonical>.new`. Refuses if target client is running. Variant nesting under `<client>/<version>/variants/<variant>/manifest.json` keeps vanilla and glsl independent. Full architecture in `docs/QUAKE-DIR-CONTROL.md`.

**Slipgate is intentionally NOT a game launcher.** Per VISION: ezQuake handles launching. The app can launch ezQuake with arguments (Rust command stays callable), but the user-facing UI doesn't host a launcher surface. Tray menu launch is a documented future arc only.

---

## Code landmarks — where to find things

**"I want to change how configs are parsed"** → `src-tauri/src/commands/ezquake.rs` (the 2,124-line monolith — adding a second client will probably require splitting it; see HEALTH.md)

**"I want to change the config comparison UI"** → `src/components/ConfigViewer.tsx` for orchestration, `src/components/configMerger.ts` for the merge logic, individual `Config*Section.tsx` files for display

**"I want to add/change a cvar's description or category"** → `src/lib/config/data/ezquake-variables.json` (the snapshot consumed by `CvarTooltip.tsx` and the rest of ConfigViewer)

**"I want to change the updater behavior"** → `src-tauri/src/commands/updater.rs`

**"I want to add a hardware detection field"** → `src-tauri/src/commands/system.rs` (add to struct, add to WMI/SetupAPI query, add to `types.ts`, display in `ProfileTab.tsx`)

**"I want to change the Profile tab layout"** → `src/components/ProfileTab.tsx` plus `WhoBanner.tsx`, `KeyboardLayout.tsx`, `MouseLayout.tsx`, `WeaponBindViz.tsx`, `GearSelector.tsx`

**"I want to add a tab"** → `SideNav.tsx` + a `*Tab.tsx` component + a Switch/Match arm in `App.tsx`

**"I want to change the store schema"** → `src/store.ts` + extend `migrateProfile()` for backward compatibility

**"I want to change how ezQuake is launched"** → `launch_ezquake` in `ezquake.rs`

**"I want to change how teamsay conditions are evaluated or tokens resolve"** → `src/lib/simulator/` (pure TS). Fixture tests in `src/lib/simulator/fixtures.test.ts` are the golden source of expected behavior across real configs.

**"I want to change the state editor panel"** → `src/components/StatePanel.tsx`. Styles under `sg-state-*` in `app.css`. Wired into the right-rail toggle via `useKeyboardPanelState.ts` and `ConfigKeyboardPanel.tsx`.

**"I want to change the alias chain pretty view"** → `src/lib/prettyRender.ts` (parser pipeline, pure TS) + `src/lib/runtimeResolver.ts` (LabelResolver vs SimulatorResolver). Spec at `docs/superpowers/specs/2026-04-16-alias-chain-pretty-view-design.md`.

**"I want to change weapon-bind classification"** → `src-tauri/src/commands/weapon_classifier.rs` (Rust v2 module). Per-weapon modifier triggers (`f_weaponchange` dispatch) live in `weapon_triggers.rs`. Domain reference at `packages/qw-knowledge/weapon-scripts/README.md`.

**"I want to change how the quake dir is scanned for Browse mode"** → `src-tauri/src/commands/browse.rs` (Rust scanner) + `MyQuakeTab.tsx` (Browse pane layout and filter lens)

**"I want to change Quake Dir Control behavior"** → `src-tauri/src/commands/{data_root,version_warehouse,warehouse_reconcile,version_swap,client_fingerprint,release_cache,bulk_import}.rs`. Frontend mirror under `src/quake-dir/`. Architecture in `docs/QUAKE-DIR-CONTROL.md`.

**"I want to fix something on Discord auth"** → `src/auth.ts` (frontend flow) + `src-tauri/src/commands/auth.rs` (localhost listener)

---

## External integration map

All sibling integration is network-based — no filesystem coupling between monorepo apps.

| Target | How | What |
|---|---|---|
| **Firebase (matchscheduler-dev)** | Firebase SDK + cloud function | Discord auth → user profile |
| **EloShapes CDN** | HTTPS | Mouse + mousepad product photos |
| **GitHub Releases API** | reqwest | Stable updater for ezQuake/unezQuake/KTX/MVDSV/QWFWD |
| **builds.quakeworld.nu** | HTML scraping | Snapshot channel for ezQuake |
| **ezQuake (local)** | filesystem + process + mailslot IPC | Configs, demos, version, screenshot puppet |
| **a.quake.world/mapshots** | HTTPS | Map backdrop images |
| **qw-oracle snapshot bundles** | Build-time snapshot copy into `src/lib/config/data/*.json` | Version-aware cvar/command/macro/asset/map data |

> **"Slipgate web" status:** The `VISION.md` and `DESIGN.md` docs reference a Slipgate web hub as if it exists. It doesn't yet — gated on infiniti's OKLCH Harmonizer ramp. Treat "Slipgate web" in older docs as aspirational, not live.

---

## What this doc intentionally does NOT cover

- **Per-tab / per-component feature catalogs** → grep `src/components/*Tab.tsx` and the `Config*Section.tsx` family. The code is the source of truth.
- **Tauri command tables** → `src-tauri/src/lib.rs` `generate_handler!` macro is canonical; per-command details live in `API_CONTRACTS.md`.
- **Code quality, duplication, fragile spots** → `docs/HEALTH.md`
- **Dev environment setup** → `docs/DEVELOPMENT.md`
- **Design system / OKLCH / theming** → `docs/DESIGN.md`
- **Store shape and persistence rules** → `docs/STATE.md`
- **Deployment / release process** → `DEPLOYMENT.md`
- **ezQuake config parser architecture** → `docs/CFG-PARSER.md`
- **ezQuake resolution model** → `docs/EZQUAKE-RESOLUTION.md`
- **Quake Dir Control architecture** → `docs/QUAKE-DIR-CONTROL.md`
- **Discord OAuth flow** → `docs/AUTH.md`
- **Hardware scan internals** → `docs/SYSTEM-SPECS.md`
- **EloShapes / peripheral selector** → `docs/PERIPHERAL-SELECTOR.md`
- **QW weapon-script domain knowledge** → `packages/qw-knowledge/weapon-scripts/README.md`

---

*Last slimmed: 2026-04-29 per docs-system-redesign spec Plan 2 (apply litmus test; cut catalog narrative; keep parked-with-purpose attestation, cruft attestation, design intent, code landmarks, integration boundaries).*
