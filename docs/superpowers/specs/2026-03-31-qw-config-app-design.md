# QW Config — App Design Spec

**Date:** 2026-03-31
**Status:** Approved for implementation
**Builds on:** [QW Config Library Spec](2026-03-30-qw-config-design.md)
**Stakeholders:** ParadokS, vikpe (architecture), matrix (ezQuake internals), Spike (FTE)

## Vision

A "My Quake" tab in slipgate-app that gives players a rich, browsable experience of their Quake directory — starting with config visualization, comparison, and cross-client conversion. The config converter is the first tool, with a direct line to bridging the ezQuake → FTE gap and enabling competitive players to try FTE with a working config.

The broader tab will later host visual asset browsing (skins, textures, crosshairs) and a consolidated matches view (demos, screenshots, logs). Those are future work — this spec covers Config + Converter.

## Architecture

Two layers:

```
packages/qw-config/           <-- TypeScript library (data + conversion logic)
apps/slipgate-app/             <-- UI consumer (SolidJS + DaisyUI)
  src/components/MyQuake/      <-- new tab components
```

### Why two layers

The **existing Rust parser** in slipgate-app (`src-tauri/src/commands/ezquake.rs`, ~1600 lines) solves a different problem: extracting weapon binds, movement keys, teamsay binds, and alias chains for the Profile tab visualization. It answers "what is this player doing?"

The **new TypeScript library** (`packages/qw-config/`) answers "what do these settings mean and how do they translate?" It handles the cvar knowledge base, documentation, categorization, and cross-client conversion. The library runs everywhere — slipgate-app (bundled via Vite), future website, CLI.

They complement, not compete. The Rust parser stays as-is.

### N-client extensibility

The agnostic format is the hub — every client connects to it, not to each other. Adding a new client requires only:
1. A cvar data file (`newclient-variables.json`)
2. A parser (config text → agnostic)
3. A writer (agnostic → config text)
4. Mappings to shared cvar IDs

Once added, the new client automatically gets conversion to/from every other client already in the system. The viewer, compare view, and converter UI all work without changes. ezQuake and FTE are first, but the architecture is designed for any QW client.

### Package integration

`packages/qw-config/` is a workspace package. slipgate-app adds `"qw-config": "workspace:*"` to its package.json. Vite bundles it into the .exe at build time — no network calls, no publishing.

## Navigation

### New sidebar entry

Add a "My Quake" icon to the existing icon sidebar (alongside Profile, Clients, Tools, etc.).

### Sub-navigation

Horizontal tabs across the top of the content area (Option A from brainstorming). No secondary sidebar — horizontal space is precious for the keyboard/weapon visualizations in other tabs.

Tabs:
- **Config** — browse and explore your settings (Phase 1)
- **Visuals** — skins, crosshairs, HUDs, weapon textures (future placeholder)
- **Matches** — demos + screenshots + logs, consolidated per match (future placeholder)

The Converter is accessed via a "Convert to FTE" button in the Config view, not as a separate tab.

## Config Discovery

### How configs are found

The app already knows the active client and its install path (from the Clients tab). Config discovery works in layers:

1. **Primary config** — `config.cfg` (ezQuake) or `fte.cfg` (FTE). The root. Always loaded on startup.
2. **Exec tree** — configs referenced by the primary via `exec teamplay.cfg`, `exec gfx.cfg`, etc. The Rust parser already scans for these.
3. **Saved profiles** — files created via `cfg_save test1` → `test1.cfg`. Full snapshots sitting in the configs directory, not part of the active exec chain.
4. **Orphans** — other `.cfg` files in the quake directory not referenced by anything.

### Config file locations

| Client | Primary config | Location |
|--------|---------------|----------|
| ezQuake | `config.cfg` | `<gamedir>/ezquake/config.cfg` |
| FTE | `fte.cfg` | `<gamedir>/fte.cfg` |
| QWCL | `config.cfg` | `<gamedir>/id1/config.cfg` or `<gamedir>/qw/config.cfg` |

FTE load sequence: `default.cfg` → `quake.rc` → `fte.cfg` → `autoexec.cfg`.

### QWCL's role

QWCL is a museum piece — no one uses it competitively today. But it's the canonical baseline all clients inherit from. In the converter, QWCL serves as the Rosetta Stone: the shared heritage that helps map between ezQuake and FTE. The real conversion axis is **ezQuake ↔ FTE**.

## Config Viewer

### Unified top bar

One row, no wasted vertical space:

```
[ezQuake ▼] ▶ config.cfg · 263 cvars · 38 binds · 3 linked  [Compare] [+ Drop] [Convert to FTE]
```

- **Client picker** (dropdown) — inherited from Clients tab selection, changeable here
- **Config summary** (expandable) — collapsed by default showing filename + stats + linked count
- **Actions** — Compare, Drop config, Convert to FTE

### Expandable config tree

Click the collapsed row to expand. Shows:
- Primary config with detailed stats (cvars, binds, aliases)
- Linked configs as a checkable list — toggle each in/out of merged view
- "See all configs in directory →" link to browse saved profiles and orphans
- Conflict badge when two configs set the same cvar ("2 conflicts — last-loaded wins")

### Merged view conflicts

When multiple configs set the same cvar with different values (e.g., `color 12` in config.cfg, `color 11` in teamplay.cfg), the merged view shows the last-loaded value (matching engine behavior). A conflict indicator lets the user click to see which file overrides which.

### Cvar list

Columns: **Cvar** (monospace) | **Value** | **Description** | **Source** (which config file)

Visual states:
- **Changed from default** — cvar name in amber, full opacity
- **At default** — dimmed (reduced opacity)
- **Source badge** — color-coded per config file (config, gfx, teamplay, etc.)

### Filters and search

- **Category pills** — derived from ezQuake's 10 major groups (Input, Graphics, HUD, Sound, Network, Teamplay, etc.)
- **"Hide defaults" checkbox** — show only settings the player actively changed
- **Search** — wildcard, searches both cvar names and descriptions

### Cvar detail (expand/hover)

- **Hover** — quick tooltip with description, type, default
- **Click to expand** — full documentation, value type, valid range, default value, and the equivalent cvar name in FTE/QWCL (from the cross-client mappings)

## Compare View

Activated via the "Compare" button. Side-by-side synchronized scrolling.

### Layout

Two config headers at the top, each showing filename + player name + source (client or "dropped").

Rows show the same cvar from both configs side by side. Differences are highlighted.

### Diff filters

- **All** — every cvar from both configs
- **Differences (N)** — only cvars with different values between the two configs
- **Same** — only cvars with identical values
- **Only left / Only right** — cvars that exist in one config but not the other

Plus: "Hide defaults" checkbox and wildcard search, same as single view.

### Getting configs to compare

- Compare your active config against another config from your directory (via "See all")
- Drag-and-drop any config file from outside (e.g., a teammate's config)
- Browse to a file via file picker

## Converter View

Activated via "Convert to FTE" button. Shows a conversion report.

### Summary stats bar

Big numbers at a glance:
- **Transferred** (green) — cvars with the same name in both clients, copied directly
- **Mapped** (amber) — cvars with a different name but equivalent function, translated
- **No equivalent** (red) — source-only cvars with no target equivalent
- **Binds kept** — key bindings that transferred

Plus a coverage progress bar (green/amber/red segments).

### Conversion rows

Each cvar shows: source name → target name, with a status icon:
- ✓ Green — same name, copied
- ⇄ Amber — mapped to different name
- ✗ Red — no equivalent in target client

Click any row to see full documentation for the cvar.

### Exports

Two export actions:
- **Export fte.cfg** — the converted config file, ready to drop into the FTE directory
- **Export gap report** — the "No equivalent" list as a structured document. This is the FTE feature request artifact — a categorized list of what competitive players rely on that FTE doesn't have.

## Cvar Knowledge Base

### Data sources (unchanged from library spec)

- **ezQuake** — `help_variables.json` from ezQuake repo (2,554 vars, curated descriptions, typed, grouped into 54 groups / 10 major groups)
- **FTE** — extracted from C source via `CVARD`/`CVARFD` macros (~797 documented cvars). Nearly 100% have inline descriptions.
- **QWCL** — assembled from ezQuake docs (65% overlap), quakeworld.net archive, FTE source. 76% coverage, remaining 24% mostly debug/obsolete.

### Categorization

Use ezQuake's 54 groups (organized into 10 major groups) as the baseline taxonomy. Map FTE and QWCL cvars into the same groups.

For FTE cvars without an obvious group, use LLM assistance (Haiku) to read the source description and assign to the closest ezQuake-derived group. This is organizational only — no command names or descriptions are changed.

Categorization is open for community feedback. Grouping is UX organization, not a claim about the commands themselves.

### Descriptions

Descriptions come from the source repos, not curated by us:
1. **One-liner** — pulled from the best available source (usually ezQuake's curated text)
2. **Details** — full documentation, type, range, default
3. **Cross-client info** — equivalent cvar name in other clients, from `mappings.json`

### Cross-client mappings

The manual work: identifying "same feature, different name" cvars across clients. This is where vikpe and matrix's expertise is needed. The mapping file (`mappings.json`) grows over time as the community identifies equivalences.

Note: FTE has adopted ezQuake's HUD system (`hud_*` commands), so HUD cvars should map cleanly between them.

## Build Order

### Phase 1: Data library (`packages/qw-config/`)

Per the [library spec](2026-03-30-qw-config-design.md):
- Extract FTE cvars from source into `fte-variables.json`
- Assemble QWCL baseline from combined sources into `qwcl.json`
- Copy/reference ezQuake JSON files
- Define agnostic TypeScript types
- Build config parser (text → structured)
- Build client-specific parsers (structured → agnostic)
- Build client-specific writers (agnostic → config text)
- Build conversion report generator

### Phase 2: Config Viewer UI

- Add "My Quake" icon to sidebar + horizontal tab navigation
- Config discovery (primary + exec tree + "see all")
- Cvar list with categories, filters, search, hide defaults
- Cvar detail expansion (hover + click)
- Collapsible config tree with merge toggle

### Phase 3: Compare View

- Side-by-side layout with synced scrolling
- Diff highlighting and filters (differences/same/only-left/only-right)
- Drag-and-drop config input

### Phase 4: Converter View

- Conversion report with summary stats and coverage bar
- Three-state rows (transferred/mapped/no equivalent)
- Export fte.cfg
- Export gap report

### Phase 5: Future sections (out of scope for this spec)

- **Visuals** — crosshairs, skins, HUDs, weapon textures (requires pak file explorer for legacy `.pak` assets; `.pk3` is just zip)
- **Matches** — consolidated demos + screenshots + logs per match, filterable by game mode, thumbnail/list views, internal demo parser for rich stats

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Tab structure | Horizontal tabs in content area | Preserves horizontal space for keyboard/weapon viz in other tabs |
| Config tree | Collapsible, in unified top bar | Reduces vertical clutter, expandable when needed |
| Library language | TypeScript (`packages/qw-config/`) | Runs everywhere: app, web, CLI. Bundled via Vite. |
| Rust parser | Keep as-is, separate concern | Handles bind/weapon/alias analysis for Profile tab |
| Categorization | ezQuake's 10 major groups as baseline | Battle-tested by QW players, LLM-assisted for FTE mapping |
| Descriptions | Inherited from source repos | Not curated by us — ezQuake has excellent coverage |
| QWCL role | Baseline reference, not conversion target | Museum piece, but canonical shared heritage |
| Config file input | File picker / drag-and-drop first | Auto-detection is a later enhancement |
| Conflict resolution | Last-loaded wins (engine behavior) | Matches what actually happens in the game |

## External Dependencies

- **vikpe**: Architecture validated. Available to advise on cross-client mappings.
- **matrix**: ezQuake internals. Needed for "same feature, different name" mapping work.
- **Spike (FTE)**: Gap report is a communication tool — structured feature requests from competitive players.
- **ezQuake repo**: Source of truth for cvar documentation. Watch for updates.
- **FTE repo**: Source of truth for FTE cvars. Re-extract when updated.

## Visual Mockups

Brainstorming mockups saved in `.superpowers/brainstorm/` (not committed):
- Navigation options (icon sidebar + horizontal tabs)
- Config viewer (unified top bar, collapsed/expanded tree, cvar list)
- Compare view (side-by-side synced scroll with diff highlighting)
- Converter view (summary stats, three-state rows, exports)
