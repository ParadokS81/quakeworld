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
- **Input visualization** — a full TKL keyboard with a swappable right-slot module (nav cluster, numpad, or mouse diagram), movement/weapon/teamsay binds colored and labeled, plus a mouse SVG overlay in the gear grid showing your movement keys and weapon rebinds. Profile has a single F-row toggle cell cycling nav/numpad
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

### 5. My Quake 📁 — *Browse + Domains*
`MyQuakeTab.tsx`. Two top-level mode buttons: **Browse** and **Domains**.

**Browse mode** — an Explorer-style three-pane view over the user's Quake directory:
- **Left: filter lens** — multi-select filter by client (ezQuake / FTE / etc.), gamedir (qw / id1 / fortress / etc.), and asset category (configs / demos / screenshots / maps / models / sounds / textures). The tree dims branches that don't match the current selection.
- **Center: file tree** — directory tree scoped to the quake dir. Non-matching branches are dimmed but still navigable. Clicking a file selects it and populates the detail pane.
- **Right: detail pane** — shows file category, image preview (PNG and JPG in v1 — PCX/TGA/WAD deferred to Phase 2), resolution chain / collision visualiser for configs, an "Open in Configs" shortcut for `.cfg` files, and an "Open containing folder" button.

Backed by a Rust scanner at `src-tauri/src/commands/browse.rs` that reads oracle's ezQuake asset-consumption bundle to drive category classification.

**Domains mode** — hosts domain-specific sub-tabs:
- **Configs** — active. Hosts the full ConfigViewer (see next section). Drag-drop zone for `.cfg`, `.zip`, `.pak`, `.pk3` files lives here. Dropping a file loads it as the comparison config; dropping again prompts "replace current comparison?" modal.
- **Maps** — disabled placeholder. Future phase.
- **Matches** — disabled placeholder. Future phase (demos + screenshots browser with stats).
- **Assets** — disabled placeholder. Future phase (textures, skins, sounds, paks browser).

The ConfigViewer itself is unchanged — it now lives inside Domains > Configs rather than at the top level of this tab.

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
- **Teamplay Macros** — all Teamplay-category cvars from the database (Item Names, Item Need Amounts, Location Names, Teamplay Communications) plus `set`-declared user variables. Same data source as Settings > Macros, minus Runtime Macros.
- **Weapons Settings** — weapon-related cvars
- **Weapons Binds** — per-weapon rows with full firing-path classification (quickfire / manual-select / manual-hold) rendered side-by-side across primary and compare configs. Backed by the weapon classifier v2 module (`weapon_classifier.rs`) which emits `FiringPath[]`, supports multiple paths per weapon, distinguishes generic vs weapon-specific fire keys, tags preselect-style binds, and filters rocket jumps, kill-me teamsays, announce-without-fire patterns, and long impulse scans. See `docs/superpowers/specs/2026-04-13-weapon-classifier-v2-design.md` and `packages/qw-knowledge/weapon-scripts/README.md` for the full algorithm and domain reference.

### Raw sections
- **Binds** — every key with category color coding (movement/weapons/teamsay/**ktx**/**unresolved**/misc), alias chain expansion up to 8 levels deep. KTX binds (commands like `rpickup`, `autotrack`, `scores` injected by the KTX server mod on connect) show with a purple banner explaining they only work on KTX servers. Unresolved binds (commands not found in aliases, ezQuake commands, or cvars) show with a yellow warning triangle and explanation.
- **Aliases** — all aliases as Name | Command | Source File
- **Macros** — built-in teamplay cvars + user-created `set` variables + **runtime `%`-prefix macros reference** (the 68 engine-provided tokens like `%health`, `%ammo`, `%location` used in say/say_team messages, loaded from `src/lib/config/data/ezquake-macros.json`)
- **Triggers** — `f_*` (client-side) and `on_*` (server-side) triggers with inline guide on how they work, "restricted under competitive rulesets" badges, and an **infoset event decoder** (parses `cmd info ev X` bitmasks to show which on_triggers are active)
- **Commands** — stateful command invocations captured from configs (e.g. `floodprot 4 4 10`, `mapgroup clear`, `hud_recalculate`, `-moveup`/`-movedown` release block). Grouped into 14 sub-groups (Press/Release Actions, Teamplay, HUD, Video, Stateful State, Game Actions, Config Management, etc.). Default invocations marked with a "default" badge and hidden when "Hide Defaults" is on. Uses the same typography and grid as the Settings section.

### FTE converter
Click "Convert to FTE" → report view:
- Big stat cards: **transferred** / **mapped** / **no equivalent** / **binds kept**
- Per-cvar status list with filters
- Copy buttons: "Copy fte.cfg" (generated config text) and "Copy gap report" (commented list of unmapped cvars)

### UX helpers
- **Scroll minimap** on the right edge — vertical track with section labels, viewport indicator, click to smooth-scroll
- **Right-rail panel** with a `Keyboard | State` mode toggle — tri-state: click an active button to hide everything, click an inactive button to switch to that view. Replaces the separate Hide/Show keyboard button. Persists mode + visibility to `ProfilePrefs`.
  - **Keyboard view** — when a Weapons/Teamplay/Movement Binds section is focused, renders the bound config as a full TKL keyboard SVG with a swappable right-slot module (nav cluster, numpad with double-height + and Enter, or mouse diagram). One keyboard in single view, two stacked in compare mode with owner-frame tints (teal/orange). Each side can auto-reveal a different module when the selected bind lives on different modules per config (e.g. primary binds kill-me to mouse4, compare to kp_7). Segmented control (Nav/Numpad/Mouse) at top syncs both; auto-reveal split is transient. Bind-labels toggle shows weapon/teamsay names on keycaps (quickfire priority, long teamsay names fall back to category). Movement/Weapons/Teamplay toggles persist to `ProfilePrefs`. Click-to-pin is bidirectional: clicking a key lights up the matching command on both keyboards, scrolls the matching row's category header into view, and expands the row. Clicking a row does the same in reverse. Alias chains in expanded rows are color-coded by owner (teal for primary, orange for compare). Multi-bind modifier combos (e.g. `F`=safe + `Ctrl+F`=lost) select both rows and light both keys. Esc clears selection.
  - **State view** — Player State Simulator panel (see Player State Simulator subsection below). Editable PlayerState (health, armor, weapons, ammo, powerups, location, match, LEDs, recent events) with live-derived readouts per section (`$bestweapon`, `$weapons`, `$powerups`, `$armortype`, `$colored_armor`, ...), inline `tp_need_*` threshold hints, influencing-cvar rows showing default vs user-config side-by-side, and a templates header (Save as... / Load / Delete / Reset).
- Drag-drop overlay with error toasts
- Color scheme uses OKLCH tokens matching the Slipgate web design system

**The two pure-logic files to know:**
- `configMerger.ts` — the comparison brain. Exports `mergeSelectedFiles`, `categorizeBinds`, `synthesizeModifierTeamsayBinds`, `mergeAliases`. Pure functions, no side effects, easy to test. (Weapon-bind modifier synthesis was moved into the Rust classifier — see `weapon_classifier.rs`.)
- `AliasChainResolver.tsx` — recursive alias expansion with depth cap, `$variable` macro ref extraction via regex, inline macro dependency rendering, and in Pretty mode a span-tree render path plus active-leaf highlighting via the simulator's `evaluateTeamsay` trace (see Alias Chain Pretty View subsystem below).

### Alias Chain Pretty View

A render mode for expanded alias chains that replaces raw ezQuake cfg syntax with a readable, chat-style preview. Shipped 2026-04-17 on top of the Player State Simulator. Two global toggles in the ConfigViewer left sidebar:
- **Alias chains: Pretty | Raw** — Pretty runs bodies through a span-tree builder (`src/lib/prettyRender.ts`); Raw preserves the pre-pretty display.
- **Tokens: Label | Simulator** — selects which `RuntimeResolver` resolves `%` runtime macros. Label maps `%a` → "armor" (human label, static). Simulator maps `%a` → the live value from the `PlayerState` signal that `StatePanel` edits, with resolved values re-parsed so color codes baked into tp_name_* cvars render correctly.

**Parser pipeline (`src/lib/prettyRender.ts`, pure TS):** four-stage builder — color-stack state machine for `&cRGB` / `&r` / `{...}` brace scopes → `$variable` substitution delegated to the simulator's `expandVars` → `%token` resolution via injected `RuntimeResolver` → `$X` single-char code expansion from `src/lib/charCodeTable.ts` (TS port of `ezquake.rs:432-523`). Output is a flat array of `PrettySpan` with `{text, color, origin, rawToken, tooltip, branchInactive}`. Rendered span-by-span by `AliasChainResolver.tsx`'s `PrettyCmd` with CSS classes `sg-span-{literal|variable|runtime|charcode|unresolved|branch-inactive}` + `qw-w/g/b/default` for color.

**Active-leaf highlighting:** the trace memo runs `evaluateTeamsay(root, state, cvars, aliases)` against the chain's root body and tints the alias row whose `say_team`-style leaf fires under the current PlayerState (`sg-alias-chain-entry-active`). Before evaluating, `$need` is preset from `deriveNeed(state, cvars)` to mirror ezQuake's `tp_msg_need` pre-exec behavior, outer `"..."` wrapping is stripped from alias bodies (ezQuake's lenient parser keeps those as literal chars in some storage paths, but for evaluation we match the stripped form), and `cl_onload` command chains are simulated via `applyOnloadChain(cvars, aliases)` so team-selector tempaliases (`sr.2` etc) have applied their `set tpname "{&cXXX$nick:&cfff}"` writes before the viewer reads the cvar map.

**Conditional branch dimming (tier 3):** when Simulator mode is on and the chain contains a top-level `if/then/else`, the inactive branch's spans are dimmed (`sg-span-branch-inactive`, 32% opacity). Correlates trace `condition` steps to span tree by condition-expression text.

**LabelResolver** (`src/lib/runtimeResolver.ts`) — static table of `%token` → human label + description. Authored here, no simulator dependency. **SimulatorResolver** — imported as-is from `@/lib/simulator`. Both match the `RuntimeResolver` interface defined in `simulator/resolver.ts`.

**Design / plan:** `docs/superpowers/specs/2026-04-16-alias-chain-pretty-view-design.md` and `docs/superpowers/plans/2026-04-17-alias-chain-pretty-view.md`. Parser and resolver tests colocated at `src/lib/{prettyRender,charCodeTable,runtimeResolver}.test.ts` plus fixture-driven integration at `prettyRender.fixtures.test.ts` against `assets/teamsays/*.cfg`.

---

## Player State Simulator

A pure-TS module at `src/lib/simulator/` that models a QuakeWorld player's in-game state and evaluates ezQuake `if` condition expressions against it. Two consumers today: the `StatePanel` in the ConfigViewer's right rail (interactive state editor), and any code that wants to ask "given this state, what does this bind actually emit?" Lives entirely in the webview — no Rust. Shipped 2026-04-17 across ~25 commits.

**Module layout** (`src/lib/simulator/`):
- `types.ts` — `PlayerState` interface (27 raw fields: health / armor / armorClass / ownedWeapons / currentWeapon / ammo counts / activePowerups / location / mapname / match* / leds / recent events), supporting union types (Weapon, Powerup, ArmorClass, MatchStatus, LedColor), and Issue / TraceStep / EvaluateTeamsayResult types.
- `defaults.ts` — `createDefaultPlayerState()` spawn-defaults factory (health 100, axe + sg, 25 shells, everything else zero).
- `derivations.ts` — pure functions computing ezQuake-equivalent derived tokens: `deriveWeaponsString`, `deriveBestWeapon` (walks `tp_weapon_order`, handles both space-separated and contiguous-digit formats), `derivePowerupsString`, `deriveArmortype`, `deriveColoredArmor` (health-band thresholds), `deriveWeaponNum`, `deriveAmmo`, `deriveBestAmmo`.
- `expander.ts` — `expandVars(text, state, cvars, positionalArgs?)` substitutes `$var` references using priority derived > raw > cvar, with recursion + depth cap 8 + `$qt` → `"` + `%1`..`%9` positional args + unresolved-var issue emission.
- `evaluator.ts` — `tokenize()` + recursive-descent parser + `evaluateExpression()`. Implements ezQuake's `Expr_Eval` grammar (parens, arithmetic `+-*/`, comparison `== = != <> < <= > >=`, `isin`/`!isin` substring, `&&`/`||`/`and`/`or`/`AND`/`OR` with short-circuit) minus regex `=~`/`!~` (flagged as unsupported-regex issue rather than silently failing). Matches `Cmd_If_Old` / `Cmd_If_New` dispatch in ezquake-source cmd.c.
- `resolver.ts` — three public entry points: (a) `createSimulatorResolver(state, cvars)` returns a `RuntimeResolver` shape (from the pretty-view spec section 3.5) with short-form token aliases (`%a` → armor etc.); (b) `evaluateCondition(expr, state, cvars)` returns `{result, issues}`; (c) `evaluateTeamsay(rawText, state, cvars, aliases)` walks `if/then/else` chains + recurses into alias bodies + skips side-effect commands (set/set_tp/inc/wait/alias/bind) + collects a trace with branch-active markers + caps depth at 8.
- `index.ts` — barrel. Consumers import from `@/lib/simulator`.
- Tests — colocated `*.test.ts` files under `bun test`. 92 tests across 7 files: unit (expander, evaluator, derivations, resolver, smoke), fixture-driven flip cases against `assets/teamsays/{bps,hangtime,locktar}.cfg`, and synthetic issue-kind tests. Fixture tests caught three real parser bugs during development (contiguous-digit tp_weapon_order, tokenizer discarding color-code braces, a test-regex style mismatch) all fixed in `f1d5e87`.

**UI consumer** — `src/components/StatePanel.tsx` renders PlayerState as a two-column sprite-first panel. Left column (primary) holds three always-visible sprite tiers: Vitals (face+HP, plus GA/YA/RA armor class slots as sprites that toggle mutex), Powerups (Q/P/R face sprites + BIOSUIT text tile, multi-toggle), and Weapons (two rows grouped by ammo family — 2+2 then 2+1+1 — with one ammo input per family and a current-weapon `EQ` chip inside each sprite's top-right corner). Right column (secondary) holds the templates header (`Load template ▼ | Save as... | Reset` with delete chips) and four collapsed disclosures (Location, Match, LEDs & pointing, Recent events). Sprites live in `public/wad/` (faces, armor, ammo from the Quake WAD) plus `public/weapons/` (the bright profile-tab weapon icons). Need-hints (`need < N`) are hover-revealed and stay visible only when the corresponding `tp_need_*` cvar is customized from its default. Each tier has a `Details` disclosure exposing the Derived / Influencing-cvars blocks underneath. The Location tier's Map and Location fields are combobox `<input list>` controls backed by a `<datalist>` populated from the `.loc` scanner (see Rust `locs.rs` below); location names resolve ezQuake `$loc_name_*` macros recursively through the loaded cvars so the dropdown shows `bridge·high` rather than `$loc_name_separator` literals.

**Persistence** — ProfilePrefs gained `simulator: { version, currentState, templates }` plus `config_right_panel_mode: keyboard | state`. Template CRUD helpers in store.ts. Set↔Array serialization shims wrap PlayerState writes/reads since `JSON.stringify` can't round-trip Sets. See STATE.md.

**Integration target** — the simulator's `createSimulatorResolver` exists specifically to plug into the pretty-view workstream (spec at `docs/superpowers/specs/2026-04-16-alias-chain-pretty-view-design.md` section 3.5's `RuntimeResolver` interface). That workstream is not yet implemented. When it ships, the pretty-view can swap its LabelResolver for the SimulatorResolver and render teamsay outputs with resolved values instead of placeholder labels. The simulator does NOT depend on any pretty-view file — clean boundary in both directions.

**Design & planning docs** — spec at `docs/superpowers/specs/2026-04-17-player-state-simulator-design.md`, implementation plan at `docs/superpowers/plans/2026-04-17-player-state-simulator.md`.

---

## The Rust backend — Tauri commands

Everything the frontend calls into. Lives in `src-tauri/src/commands/`. Total ~5,200 lines.

### `system.rs` (451 lines) — hardware detection
- `get_all_specs()` → CPU, GPU, RAM, OS, monitor, audio devices, mouse, keyboard
- Uses WMI for GPU/RAM/audio/monitor, SetupAPI for USB HID (mice & keyboards by real product name, not "HID-compliant mouse"), sysinfo for CPU/OS/RAM basics
- Sub-500ms full scan on a decent CPU. Previous PowerShell approach was ~5s — don't regress

### `ezquake.rs` — config parser
The largest file in the project. Handles everything ezQuake-related:
- `validate_ezquake_path(exe_path)` — is this an ezQuake/FTE/unezQuake install? Extract version.
- `read_ezquake_config(exe_path, config_name)` — parse a single config → structured `EzQuakeConfig`
- `read_config_chain(exe_path, config_name)` — **follows exec refs recursively** with cycle detection, builds the full file dependency tree
- `launch_ezquake(options)` — spawn with custom args/configs
- `classify_chain_binds(chain)` — delegates to `weapon_classifier.rs` for weapon paths, handles teamsay classification across the whole chain

Knows about:
- The `absent = default` problem (ezQuake only saves non-default cvars) — `default_cvars()` table fills in what's missing
- Teamsay category inference (status/death/movement/items/enemy/orders/powerups/confirm/custom)
- Per-weapon sensitivity modifiers — oldschool inline injection AND engine-triggered dispatch via `f_weaponchange` (see `weapon_triggers.rs` below). Feeds `lg_sensitivity` (LG is the detected weapon surfaced in the profile) and `sensitivity_baseline`
- Resolution three-layer resolution model — see `EZQUAKE-RESOLUTION.md` for the full story
- QW color codes (`$x`, `^x`) → Unicode styled chars

### `weapon_triggers.rs` — f_weaponchange parser
Added 2026-04-16. Parses ezQuake's `f_weaponchange` trigger alias — the engine runs this on every weapon change, and the Xantom pattern dispatches per-weapon modifier aliases (`if 8 == $weaponnum then __lg_settings else __default_settings`). Exposes `WeaponChangeDispatch { per_weapon, else_alias }` on both `EzQuakeConfig` and `ChainBindClassification`. The Config Viewer's "When {WEAPON} active" modifier block consumes this to surface every dispatched cvar override with baseline comparison. See `docs/CFG-PARSER.md` §3 "Per-weapon modifier triggers" for the full story.

### `weapon_classifier.rs` — weapon bind classifier v2
Extracted from `ezquake.rs` as its own module on 2026-04-13. Implements a causal-chain 4-pass model (resolve → fire keys → extract paths → exclusions) and emits a flat `Vec<FiringPath>` with three firing flavors (quickfire / manual-select / manual-hold). Distinguishes generic vs weapon-specific fire keys (the HangTime case), tags preselect-style binds, and filters 5 non-combat patterns (rocket jumps, kill-me alias names, kill-me say_team text, announce-without-fire, long-impulse scans). 39 inline unit and fixture tests live in the module. See `docs/superpowers/specs/2026-04-13-weapon-classifier-v2-design.md` and the shared domain reference at `packages/qw-knowledge/weapon-scripts/README.md`.

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

### `locs.rs` — `.loc` file scanner
Added 2026-04-18. Walks `<exe_dir>/qw/locs/` and `<exe_dir>/ezquake/locs/`, parses each `*.loc` file as plain-text `x y z name` lines (skips `//` comments and malformed rows), and returns `{ mapname: [LocEntry] }` keyed by lowercased file stem. Tauri command `scan_loc_files(exePath)`. Three unit tests cover simple parsing, comments/blanks, and malformed lines. Consumer is the StatePanel's Location combobox.

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

### Quake Dir Control subsystem
Multi-version client management. Three Rust modules under `commands/` plus a `quake-dir/` frontend namespace; full architecture in `docs/QUAKE-DIR-CONTROL.md`.

- `data_root.rs` — `get_data_root()` resolves portable mode (adjacent `data/portable.flag` marker) vs installed mode (`%APPDATA%/com.slipgate.app/`). Single source of truth for where slipgate stores state.
- `version_warehouse.rs` — content-addressed binary store under `<data-root>/binaries/`. Blobs at `blobs/<sha256>.exe`, per-version manifests at `<client>/<version>/manifest.json`, top-level `index.json` tracks active version per client. `register_version` (used by updater downloads), `list_warehoused_versions`, `read_warehouse_index`, `import_existing_install` (user-imported pre-existing installs).
- `warehouse_reconcile.rs` — `reconcile_active_version` hashes `<quake-dir>/<canonical_exe>` on launch, looks up the sha256 in the warehouse, and either marks the matching version active, returns a `foreign` result so the UI can offer to import, or clears `active` if the exe is missing.
- The updater registers freshly downloaded exes into the warehouse before its existing backup+rename swap (Phase 3 will retire the legacy swap and route everything through a single swap module).

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
| `get_data_root` | quake-dir/dataRoot.ts | Resolve portable vs installed data root |
| `list_warehoused_versions` | quake-dir/warehouse.ts | Enumerate registered version manifests |
| `read_warehouse_index` | quake-dir/warehouse.ts | Read the top-level `index.json` (active version per client + last_scan) |
| `import_existing_install` | quake-dir/warehouse.ts | Hash + register a user's existing exe into the warehouse |
| `reconcile_active_version` | quake-dir/firstRunImport.ts | Hash `<quake-dir>/<exe>` on launch, set/update `index.active` |

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
| MyQuake → Browse mode (PCX/TGA/WAD preview) | `browse.rs`, `MyQuakeTab.tsx` | Browse mode is live for PNG/JPG. PCX, TGA, WAD preview deferred to Phase 2 |
| MyQuake → Domains → Maps subtab | `MyQuakeTab.tsx` | Disabled placeholder. Future phase |
| MyQuake → Domains → Matches subtab | `MyQuakeTab.tsx` | Disabled placeholder. Demos + screenshots browser with stats. Future phase |
| MyQuake → Domains → Assets subtab | `MyQuakeTab.tsx` | Disabled placeholder. Textures, skins, sounds, paks browser. Future phase |
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

**"I want to add/change a cvar's description or category"** → `src/lib/config/data/ezquake-variables.json` (the snapshot consumed by `CvarTooltip.tsx` and the rest of ConfigViewer)

**"I want to change the updater behavior"** → `src-tauri/src/commands/updater.rs`

**"I want to add a hardware detection field"** → `src-tauri/src/commands/system.rs` (add to struct, add to WMI/SetupAPI query, add to `types.ts`, display in `ProfileTab.tsx`)

**"I want to change the Profile tab layout"** → `src/components/ProfileTab.tsx` (874 lines) + `WhoBanner.tsx`, `KeyboardLayout.tsx`, `MouseLayout.tsx`, `WeaponBindViz.tsx`, `GearSelector.tsx`

**"I want to add a tab"** → add to `SideNav.tsx`, add a `*Tab.tsx` component, add a Switch/Match arm in `App.tsx`

**"I want to change the store schema"** → `src/store.ts` + extend `migrateProfile()` for backward compatibility

**"I want to change how ezQuake is launched"** → `launch_ezquake` in `ezquake.rs`

**"I want to change how teamsay conditions are evaluated or tokens resolve"** → `src/lib/simulator/` (the six modules plus barrel). Pure TS, no Rust. Fixture tests in `src/lib/simulator/fixtures.test.ts` are the golden source of expected behavior across real configs.

**"I want to change the state editor panel"** → `src/components/StatePanel.tsx` (form controls, derived readouts, influencing-cvars rows, templates header). Styles under `sg-state-*` in `app.css`. Wired into the right-rail toggle via `useKeyboardPanelState.ts` and `ConfigKeyboardPanel.tsx`.

**"I want to change how the quake dir is scanned for Browse mode"** → `src-tauri/src/commands/browse.rs` (Rust scanner) + `MyQuakeTab.tsx` (Browse pane layout and filter lens)

**"I want to fix something on Discord auth"** → `src/auth.ts` (frontend flow) + `src-tauri/src/commands/auth.rs` (localhost listener)

---

## What this doc intentionally does NOT cover

- **Code quality, duplication, tech debt, fragile spots** — that's the Health Report (pass 2)
- **Product intent / parked vs alive features / priorities** — that's the Gaps Q&A (pass 3)
- **How to set up the dev environment** — see `docs/DEVELOPMENT.md`
- **Design system / OKLCH / theming** — see `docs/DESIGN.md`
- **Deployment / release process** — see `DEPLOYMENT.md`

---

*Last synthesized: 2026-04-20 (Browse mode added to MyQuake tab; Domains mode restructures ConfigViewer under Configs sub-tab; Maps/Matches/Assets disabled placeholders noted). Update this doc when you ship something new that changes the map above.*
