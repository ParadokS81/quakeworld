# Slipgate App — Overview

> **Doc type: current** — Living map. Update when features land. This is the source of truth for "what's in the app today."

**What this document is:** A plain-English map of what the app actually is and does right now. It's the answer to "what does Slipgate App have in it today?" — written so a non-coder can read it and form a mental model.

When in doubt, the code is the source of truth; this is the map.

> ⚠️ The older `ROADMAP.md`, `FEATURES.md`, and the "Project Structure" section of `CLAUDE.md` describe a much earlier version of the app (3 tabs, a handful of components, system-specs-only MVP). That ship sailed. This document is the current picture.

---

## What the app is

A **Windows-first desktop companion for QuakeWorld players**. Built with Tauri v2 (Rust backend + SolidJS frontend, rendered in the OS webview). Ships as a small native app that lives in the system tray.

It does four things a web browser can't:
1. **Reads your hardware and peripherals** (CPU, GPU, RAM, monitor, mouse, keyboard, audio devices)
2. **Reads and compares ezQuake configs** (your `config.cfg` and everything it execs)
3. **Manages your ezQuake install** (version detection, updater, launcher, stable + snapshot channels)
4. **Is your gear/setup profile** (what you play on, linked to your Discord identity)

It does NOT yet do: match scheduling, desktop notifications, `qw://` protocol handler, cloud config sync, or tournament mode. Those are ideas, not features.

---

## The 6 tabs

The app opens to a 6-tab vertical sidebar (`SideNav.tsx`). What you see in each tab:

### 1. Schedule 📅 — *placeholder*
`ScheduleTab.tsx` (11 lines). Just a heading. Future home for schedule/availability.

### 2. Profile 👤 — *fully functional, richest tab*
`ProfileTab.tsx` (874 lines).
- **WHO banner** — QW scoreboard-style identity header with mapshot backdrop, jersey colors from your `topcolor`/`bottomcolor`, player name with real QW color codes
- **Input visualization** — a full TKL keyboard layout with your movement/weapon/teamsay binds colored and labeled, plus a mouse SVG overlay showing your movement keys and weapon rebinds
- **Gear grid** — real product photos of your mouse (from EloShapes CDN), mousepad card, grip-style + aim-style illustrations
- **Mouse data row** — brand/model/weight/wireless, cm/360 calculated from DPI + sens + m_yaw, LG-specific sensitivity, inverted-Y + accel flags
- **System specs cards** — CPU/GPU/RAM/OS, monitor & resolution, DPI/sens inputs, m_yaw override
- **Output section** — "res @ Hz @ FOV" single-liner + screenshot placeholders
- Inline-editable gear selector modals (searchable across 1,441 mice + 647 mousepads)

### 3. Tools 🔧 — *fully functional*
`ToolsTab.tsx` (361 lines). Three local calculators:
- **FPS optimizer** — ranks FPS values by alignment to QW's 77 Hz server tick, color-coded (green <0.5% off, yellow <1.5%, red >3%)
- **Sensitivity recalculator** — DPI change → new in-game sens that preserves cm/360
- **FOV recalculator** — resolution change → new FOV that preserves visual field

All pure client-side math. No Tauri calls.

### 4. Clients 🖥️ — *fully functional*
`ClientsTab.tsx` (674 lines). Install management, updater, launcher.
- **ezQuake path picker** — browse for `ezquake.exe`, validates it, extracts Windows PE version
- **Config dropdown** — select which `.cfg` to parse
- **Live parsed display** — player name, sens, m_yaw, m_pitch, raw input, accel, FOV, effective resolution, max FPS
- **Updater** — 4 tabs (ezQuake, KTX, MVDSV, QWFWD):
  - ezQuake + unezQuake are installable (stable + snapshot channels)
  - KTX/MVDSV/QWFWD are changelog-browsing only (server-side projects)
  - Parallel "check all" button, release notes accordion, download progress bar, SHA256 verification (stable) or MD5 (snapshots), rename-backup install flow
- **Launcher** — server IP input + Join / Spec / Launch buttons
- **Screenshot POC** — internal-only, hardcoded to `C:/Users/Administrator/projects/slipgate-app/assets/screenshots`, not user-facing

### 5. My Quake 📁 — *hosts the ConfigViewer*
`MyQuakeTab.tsx` (244 lines). Three horizontal sub-tabs:
- **Config** — active. Hosts the full ConfigViewer (see next section)
- **Visuals** — disabled, placeholder. **Planned purpose:** asset browser for custom Quake content — textures, model skins, sounds, paks. Part of a "better explorer for your quake dir than Windows Explorer" vision. Not yet built.
- **Matches** — disabled, placeholder. **Planned purpose:** browser for your own recorded demos + screenshots with stats. Not yet built.

Drag-drop zone for `.cfg`, `.zip`, `.pak`, `.pk3`. Dropping a file loads it as the comparison config; dropping again prompts "replace current comparison?" modal.

### 6. Settings ⚙️ — *fully functional*
`SettingsTab.tsx` (231 lines).
- **Account** — Discord OAuth sign-in/out (localhost:17420 callback → Firebase custom token)
- **Profile** — nationality + residence country dropdowns (46 countries)
- **Banner** — map backdrop picker (dm2/dm3/dm4/dm6/e1m2/ztndm3/aerowalk/skull/povdmm4)

---

## The ConfigViewer subsystem

This is the **biggest feature in the app** by far — 20+ components, ~3,000 lines. Lives in `src/components/Config*.tsx` + `CvarRow.tsx` + `CvarTooltip.tsx` + `configMerger.ts` + `AliasChainResolver.tsx` + `SectionMinimap.tsx`. Rendered inside MyQuakeTab's "Config" sub-tab.

**What a user can do:**

### Single-config view
- See every cvar from the config chain (primary + everything it `exec`s), categorized into HUD / Graphics / Sound / Input / Multiplayer / Misc / Demos / Server / Unknown / Obsolete
- Sidebar category filter with "All" toggle + visual grouping gaps
- Search across cvar names and descriptions
- "Hide defaults" toggle to suppress cvars at engine defaults (ezQuake's `cfg_save_unchanged 0` leaves these out anyway, so the parser fills them in from a known-defaults table in `ezquake.rs`)
- Click any cvar → expandable detail view: description, type, enum values, FTE/QWCL equivalents, remarks
- Hover any cvar → 200ms-delayed tooltip with the same info
- Customized cvars rendered in bright text, obsolete ones struck through

### Compare mode
- Drop a second config → two-column side-by-side view (yours vs theirs)
- Five filter pills with live counts: **All / Different / Same / Only yours / Only theirs**
- "Other configs" panel lets you swap either side with other configs found in the same archive/install
- Works on loose `.cfg`, on zip/pak/pk3 archives, and on the local install's `configs/` folder

### Config chain panel
- Expandable list of every file in the exec chain — primary config, autoexec, `cl_onload` targets, `exec` refs inside other files, bound-exec, alias-exec
- Checkbox per file → toggle on/off to include/exclude from the merged view (last-write-wins merge)
- Unresolved exec refs (files the parser couldn't find) shown as warnings
- "Other configs" list — alt configs found in the same install/archive, clickable to load as primary or compare

### Domain-curated views
Curated sections beyond the raw cvar dump:
- **Teamplay Settings** — `tp_*`, `loc_*` cvars
- **Teamplay Binds** — teamsay keys (F1 → report armor, Mouse4 → enemy, etc.) categorized (status/death/movement/items/enemy/orders/powerups/confirm/custom), expandable to alias chains
- **Teamplay Macros** — `$armor`, `$location`, `$health` etc. variable references extracted by scanning aliases reachable from teamsay binds, plus `set`-declared user variables
- **Weapons Settings** — weapon-related cvars
- **Weapons Binds** — **per-key rows** (one row per key-weapon pair, not grouped) with **quickfire** vs **manual** classification, modifier-combo synthesis, and a filter that excludes rocket jumps (`+attack`+`+jump` patterns) and moveup/movedown as movement rather than weapon binds. Unbound weapons show as dimmed placeholder rows. See `2026-04-13-weapon-bind-classifier-rewrite-handoff.md` for known edge cases and the classifier rewrite plan.

### Raw sections
- **Binds** — every key with category color coding (movement/weapons/teamsay/**ktx**/**unresolved**/misc), alias chain expansion up to 8 levels deep. KTX binds (commands like `rpickup`, `autotrack`, `scores` injected by the KTX server mod on connect) show with a purple banner explaining they only work on KTX servers. Unresolved binds (commands not found in aliases, ezQuake commands, or cvars) show with a yellow warning triangle and explanation.
- **Aliases** — all aliases as Name | Command | Source File
- **Macros** — built-in teamplay cvars + user-created `set` variables + **runtime `%`-prefix macros reference** (the 68 engine-provided tokens like `%health`, `%ammo`, `%location` used in say/say_team messages, loaded from `qw-config/src/data/ezquake-macros.json`)
- **Triggers** — `f_*` (client-side) and `on_*` (server-side) triggers with inline guide on how they work, "restricted under competitive rulesets" badges, and an **infoset event decoder** (parses `cmd info ev X` bitmasks to show which on_triggers are active)
- **Commands** — stateful command invocations captured from configs (e.g. `floodprot 4 4 10`, `mapgroup clear`, `hud_recalculate`, `-moveup`/`-movedown` release block). Grouped into 14 sub-groups (Press/Release Actions, Teamplay, HUD, Video, Stateful State, Game Actions, Config Management, etc.). Default invocations marked with a "default" badge and hidden when "Hide Defaults" is on. Uses the same typography and grid as the Settings section.

### FTE converter
Click "Convert to FTE" → report view:
- Big stat cards: **transferred** / **mapped** / **no equivalent** / **binds kept**
- Per-cvar status list with filters
- Copy buttons: "Copy fte.cfg" (generated config text) and "Copy gap report" (commented list of unmapped cvars)

### UX helpers
- **Scroll minimap** on the right edge — vertical track with section labels, viewport indicator, click to smooth-scroll
- Drag-drop overlay with error toasts
- Color scheme uses OKLCH tokens matching the Slipgate web design system

**The two pure-logic files to know:**
- `configMerger.ts` (484 lines) — the comparison brain. Exports `mergeSelectedFiles`, `categorizeBinds`, `synthesizeModifierWeaponBinds`, `synthesizeModifierTeamsayBinds`, `mergeAliases`. Pure functions, no side effects, easy to test.
- `AliasChainResolver.tsx` (74 lines) — recursive alias expansion with depth cap.

---

## The Rust backend — Tauri commands

Everything the frontend calls into. Lives in `src-tauri/src/commands/`. Total ~5,200 lines.

### `system.rs` (451 lines) — hardware detection
- `get_all_specs()` → CPU, GPU, RAM, OS, monitor, audio devices, mouse, keyboard
- Uses WMI for GPU/RAM/audio/monitor, SetupAPI for USB HID (mice & keyboards by real product name, not "HID-compliant mouse"), sysinfo for CPU/OS/RAM basics
- Sub-500ms full scan on a decent CPU. Previous PowerShell approach was ~5s — don't regress

### `ezquake.rs` (2,124 lines — the beast) — config parser
The largest file in the project. Handles everything ezQuake-related:
- `validate_ezquake_path(exe_path)` — is this an ezQuake/FTE/unezQuake install? Extract version.
- `read_ezquake_config(exe_path, config_name)` — parse a single config → structured `EzQuakeConfig`
- `read_config_chain(exe_path, config_name)` — **follows exec refs recursively** with cycle detection, builds the full file dependency tree
- `launch_ezquake(options)` — spawn with custom args/configs
- `classify_chain_binds(chain)` — weapon + teamsay classification across the whole chain

Knows about:
- The `absent = default` problem (ezQuake only saves non-default cvars) — `default_cvars()` table fills in what's missing
- Quickfire vs manual weapon bind detection
- Teamsay category inference (status/death/movement/items/enemy/orders/powerups/confirm/custom)
- LG-specific sensitivity (scanning aliases for weapon 8 sens changes)
- Resolution three-layer resolution model — see `EZQUAKE-RESOLUTION.md` for the full story
- QW color codes (`$x`, `^x`) → Unicode styled chars

### `scanner.rs` (709 lines) — config source discovery
- `scan_local_install(exe_path, config_name)` — primary chain + all other configs in the install
- `scan_dropped_input(paths)` — classify dropped files (loose / archive), extract configs, auto-detect primary (prefers `config.cfg`, else the one with most exec refs pointing to other dropped files), return a `ConfigSourceBundle`
- `load_config_from_source(...)` — load a config by bundle reference (local, archive entry, or dropped path)

### `archive.rs` (427 lines) — PAK/ZIP/PK3 reader
- Custom PAK parser (Quake-style archives)
- ZIP/PK3 via the `zip` crate
- Has real unit tests with in-memory archive builders (only Rust module with tests)

### `updater.rs` (886 lines) — client updater
- Generic `ClientDef` supports 5 clients (ezQuake, unezQuake installable; KTX/MVDSV/QWFWD read-only)
- Stable channel via GitHub Releases API; snapshot channel scrapes `builds.quakeworld.nu`
- Version detection via Windows PE `FileVersionRaw`
- Lenient version parser handles `3.6.9`, `v1.46`, `v1.00`
- Download → verify (SHA256 stable / MD5 snapshot) → rename-backup → atomic replace
- Progress events streamed to frontend via Tauri events
- `fetch_commits_since_stable()` — GitHub compare API, shows commits between latest stable and current snapshot

### `watcher.rs` (166 lines) — config file watcher
- `start_config_watch` / `stop_config_watch` — watches configs dir + outlier files (files in the chain that live outside `configs/`)
- Emits `config-changed` events to the frontend on `.cfg` file changes
- 500ms debounce

### `auth.rs` (122 lines) — Discord OAuth callback
- `await_oauth_callback()` — listens on `127.0.0.1:17420` for the Discord redirect, returns auth code to frontend
- 300s timeout, themed success/failure HTML pages
- Frontend opens the Discord URL; Rust catches the callback

### `screenshot.rs` (278 lines) — **POC**, not production
- `capture_screenshot(options)` — launches ezQuake with a demo, uses Windows mailslot IPC (`\\.\mailslot\ezquake`) to puppet it
- Sends baseline cvars (gl_gamma/gl_contrast/polyblend/v_dlightcshift/cshiftpercent) to normalize output
- `cfg_save_onquit 0` to prevent baseline leaking into user's real config
- Jumps to 5s, pauses, screenshots, quits
- See full design in `project_slipgate_screenshot_automation` memory — not yet wired into the UI

---

## App shell & data flow

### Root
- `index.tsx` (17 lines) — SolidJS mount + WebView2 hibernation recovery (detects >30s hidden window, forces reload to kill white-screen-on-wake bug)
- `App.tsx` (236 lines) — tab router (Switch/Match over `activeTab` signal), system specs fetch on mount, profile load, config auto-load, `config-changed` event listener

### Store — `store.ts` (269 lines)
Persisted via `tauri-plugin-store` → `profile.json` (auto-save).

```
ProfileData {
  identity:     { discord_id, discord_username, discord_avatar, qw_name, team,
                  nationality, residence, topcolor, bottomcolor }
  setups:       [ Setup ]             // currently only setups[0] used
  equipment_history: [ { type, name, from, to } ]
  prefs:        { map_backdrop }
}

Setup {
  name, primary,
  client:   { name, exe_path, config_name, version, update_channel }
  hardware: { dpi, mouse_model, mousepad_model, keyboard_name,
              grip_style, aim_style,
              display_res_override, display_hz_override,
              audio_out_override, audio_in_override }
}
```

**Merge priority** (high → low): override > config-parsed > auto-detected > null.
- Auto-detected (specs) — re-scanned every launch, never saved
- Config-derived (sens, fov, name, colors) — re-parsed every launch
- User input (DPI, gear, grip, aim) — saved, never auto-overwritten
- Overrides (display res/Hz, audio) — saved, take priority over auto-detected

`migrateProfile()` handles v1 → v2 schema migration + rescues `ezquake_exe_path` from old `localStorage`.

### Auth — `auth.ts` (75 lines) + `firebase.ts` (33 lines)
- Firebase project: `matchscheduler-dev` (shared with MatchScheduler web)
- Discord client ID: `1465332663152808031`
- Cloud function: `discordOAuthExchange` at europe-west3
- Flow: frontend opens Discord URL → Rust awaits callback → frontend exchanges code → Firebase custom token → signed in

### Data files — `src/data/`
- `mice.json` — 1,439 records from EloShapes
- `mice-supplement.json` — 2 local additions
- `mousepads.json` — 623 records from EloShapes
- `mousepads-supplement.json` — 24 local additions
- Merged at import time in ProfileTab. Total: 1,441 mice + 647 mousepads.

---

## Tauri integration — frontend ↔ backend

### Commands the frontend calls
| Command | Caller | Purpose |
|---|---|---|
| `get_all_specs` | App.tsx | Full hardware scan on mount |
| `validate_ezquake_path` | ClientsTab | Verify exe + version |
| `read_ezquake_config` | App.tsx, ClientsTab | Parse single config |
| `scan_local_install` | App.tsx | Walk config chain on load |
| `scan_dropped_input` | MyQuakeTab | Parse dropped files |
| `load_config_from_source` | MyQuakeTab, ConfigViewer | Load config from bundle |
| `classify_chain_binds` | ConfigViewer | Weapon + teamsay classification |
| `start_config_watch` / `stop_config_watch` | App.tsx | File watcher lifecycle |
| `check_for_update` | ClientsTab | Query releases + snapshots |
| `get_release_changelog` | ClientsTab | Fetch KTX/MVDSV/QWFWD changelogs |
| `download_and_install_update` | ClientsTab | Run the update |
| `check_client_running` | ClientsTab | Is ezquake.exe running? |
| `launch_ezquake` | ClientsTab | Spawn game with args |
| `capture_screenshot` | ClientsTab (POC) | Demo → screenshot automation |
| `await_oauth_callback` | auth.ts | Discord OAuth callback |

### Events Rust → frontend
- `config-changed` → `{ exe_path, config_name }` — listened by App.tsx, triggers re-parse
- `update-progress` → `UpdateProgress { stage, percent, message }` — listened by ClientsTab

### Tauri lifecycle hooks (in `lib.rs`)
- **System tray** — show/hide/quit menu, left-click toggles window, right-click menu
- **Close-to-tray** — `CloseRequested` → `prevent_close()` + `hide()`
- **Keep alive** — `ExitRequested` with `code.is_none()` → `prevent_exit()`
- **Sleep recovery** — `Resumed` → force `window.location.reload()` to fix WebView2 white-screen-on-wake

---

## External integration map

| Target | How | What |
|---|---|---|
| **Firebase (matchscheduler-dev)** | Firebase SDK + cloud function | Discord auth → user profile |
| **EloShapes CDN** | HTTPS | Mouse product photos |
| **GitHub Releases API** | reqwest | Stable updater for ezQuake/unezQuake/KTX/MVDSV/QWFWD |
| **builds.quakeworld.nu** | HTML scraping | Snapshot channel for ezQuake |
| **ezQuake (local)** | filesystem + process + mailslot IPC | Configs, demos, version, screenshot puppet |
| **a.quake.world/mapshots** | HTTPS | Map backdrop images |

No filesystem dependencies on sibling monorepo apps. All sibling integration is network-based.

> **Note on "Slipgate web":** The `VISION.md` and `DESIGN.md` docs reference a Slipgate web hub as if it exists. It doesn't yet — it's in the planning phase and gated on infiniti's OKLCH Harmonizer ramp. The app is intentionally being built first; some features may eventually migrate to the web, others will stay desktop-only. Treat "Slipgate web" in older docs as aspirational, not live.

---

## Stubs, POCs, and planned-but-unbuilt

Things that exist in the codebase but aren't fully alive:

### Parked with real purpose (not dead code)
| Item | Where | Status / intent |
|---|---|---|
| Schedule tab | `ScheduleTab.tsx` | Placeholder (11 lines). Key future feature — ties to Slipgate web scheduler + desktop notifications + quick availability toggle |
| MyQuake → Visuals subtab | `MyQuakeTab.tsx:174-194` | Placeholder. Asset browser for custom textures/skins/sounds/paks. "Better explorer for your quake dir" vision |
| MyQuake → Matches subtab | `MyQuakeTab.tsx:174-194` | Placeholder. Demos + screenshots browser with stats |
| Screenshot automation | `screenshot.rs`, `ClientsTab` trigger | POC works end-to-end but has hardcoded Administrator path + fragile timings. Active goal: one-button → 3-5 perfect identical screenshots |
| `equipment_history` field + `addEquipmentHistory()` | `store.ts` | Intentionally parked for future community gear-discussion feature — members can check in with each other about brand/model experience |
| "View as Primary" for in-archive configs | `ConfigViewer.tsx:555-558` | Known limitation, warns on console. Needs full pak path in `ConfigEntry` to implement |
| Linux/macOS parity | `system.rs` non-Windows branches | Returns `None`/empty for GPU, display, audio, HID, DDR gen. Windows-only by design |

### True cruft (safe to delete — confirmed with user)
| Item | Where | Reason |
|---|---|---|
| `greet` command | `lib.rs:9-12` | Tauri scaffolding leftover, unused |
| `TabNav.tsx` | `components/TabNav.tsx` | 29 lines, imported nowhere. User doesn't remember what it was for |
| `ConfigCategoryBar.tsx` | `components/ConfigCategoryBar.tsx` | 156 lines, imported nowhere. Pre-dates the current sidebar |
| `md-5` crate + `verify_md5` function | `Cargo.toml`, `updater.rs:468-485` | Function defined but never called — snapshot MD5 verification was written but never wired up |
| Debug `console.log` dump | `App.tsx:113-123` | Prints MOVEMENT/WEAPONS/LG_SENS on every config load |

---

## Code landmarks — where to find things

**"I want to change how configs are parsed"** → `src-tauri/src/commands/ezquake.rs` (the 2,124-line beast)

**"I want to change the config comparison UI"** → `src/components/ConfigViewer.tsx` for orchestration, `src/components/configMerger.ts` for the merge logic, individual `Config*Section.tsx` files for display

**"I want to add/change a cvar's description or category"** → the `qw-config` package imported by `CvarTooltip.tsx` — not in this repo, it's a separate shared package

**"I want to change the updater behavior"** → `src-tauri/src/commands/updater.rs`

**"I want to add a hardware detection field"** → `src-tauri/src/commands/system.rs` (add to struct, add to WMI/SetupAPI query, add to `types.ts`, display in `ProfileTab.tsx`)

**"I want to change the Profile tab layout"** → `src/components/ProfileTab.tsx` (874 lines) + `WhoBanner.tsx`, `KeyboardLayout.tsx`, `MouseLayout.tsx`, `WeaponBindViz.tsx`, `GearSelector.tsx`

**"I want to add a tab"** → add to `SideNav.tsx`, add a `*Tab.tsx` component, add a Switch/Match arm in `App.tsx`

**"I want to change the store schema"** → `src/store.ts` + extend `migrateProfile()` for backward compatibility

**"I want to change how ezQuake is launched"** → `launch_ezquake` in `ezquake.rs`

**"I want to fix something on Discord auth"** → `src/auth.ts` (frontend flow) + `src-tauri/src/commands/auth.rs` (localhost listener)

---

## What this doc intentionally does NOT cover

- **Code quality, duplication, tech debt, fragile spots** — that's the Health Report (pass 2)
- **Product intent / parked vs alive features / priorities** — that's the Gaps Q&A (pass 3)
- **How to set up the dev environment** — see `docs/DEVELOPMENT.md`
- **Design system / OKLCH / theming** — see `docs/DESIGN.md`
- **Deployment / release process** — see `DEPLOYMENT.md`

---

*Last synthesized: 2026-04-10. Update this doc when you ship something new that changes the map above.*
