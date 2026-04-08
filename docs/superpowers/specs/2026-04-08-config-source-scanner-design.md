# Config Source Scanner — Design Spec

**Date:** 2026-04-08
**Status:** Approved for PoC
**Scope:** Archive reading, dual-source config viewer, drag-and-drop comparison

## Problem

The config viewer currently loads configs only from loose .cfg files on the local filesystem via the active config chain. Users can only compare by pasting raw text. This limits the tool to a narrow workflow — you can only see your own active config and paste-compare one config at a time.

## Goals

1. Accept drag-and-drop of .cfg files, .zip, .pak, and .pk3 archives
2. Auto-scan archives and gamedirs for config files (loose + inside paks)
3. Support a dual-source viewer where both sides can load any config source
4. Expose a "library" of all available configs in the user's quakedir beyond the active chain

## Non-Goals

- File-level config modularization (splitting config.cfg into domain sub-files)
- Write operations (editing configs, writing back to archives)
- Database-backed config history or publishing
- FTE client support (deferred — same architecture, separate implementation)

## Architecture Decision: Visual-Layer Modularization

Config organization happens in the application's visual layer, not at the filesystem level. The viewer categorizes, compares, and selectively applies settings from monolithic config.cfg files using the existing cvar database and domain tag system. This decision was reached after discussion with infiniti (2026-04-05) and aligns with how the QW community actually manages configs.

Rationale:
- `cfg_save` produces one file — file-level splits get destroyed by the engine
- Domain overlap (weapon visual effects: weapons or gfx?) is unsolvable at file level, trivial in the viewer
- The community uses config.cfg + opt-in modules (teamsays.cfg, servers.cfg, timer.cfg)
- A smart viewer works on every config that exists today without requiring adoption of a new convention

## Data Model

### ConfigSource (Rust)

The core abstraction representing any scannable config origin:

```
ConfigSource
  origin: SourceOrigin
    LocalInstall { exe_path, gamedir }
    DroppedFiles { filenames }
    Archive { path, format: zip|pak|pk3 }

  primary_chain: Option<ConfigChain>
    Auto-detected default chain (config.cfg -> exec refs -> autoexec.cfg)

  available_configs: Vec<ConfigEntry>
    All other .cfg files found that aren't part of the primary chain

  detected_client: Option<ezquake|fte>
```

### ConfigEntry

```
ConfigEntry
  filename: String
  relative_path: String
  size: u64
  location: Loose | InsidePak { pak_name: String }
```

### Frontend (TypeScript)

```typescript
interface ConfigSource {
  origin: {
    type: "local_install" | "dropped_files" | "archive";
    label: string;
  };
  primaryChain: ConfigChain | null;
  availableConfigs: ConfigEntry[];
  detectedClient: "ezquake" | "fte" | null;
}
```

Viewer state:
```typescript
const [sourceA, setSourceA] = createSignal<ConfigSource | null>(null);
const [sourceB, setSourceB] = createSignal<ConfigSource | null>(null);
// Compare mode = consequence of both being populated, not a toggle
```

## Scanner

### Two entry points, same pipeline

**scan_local_install(exe_path, config_name) -> ConfigSource**
- Resolve gamedir from exe path
- Scan gamedir for all .cfg files (loose + inside paks/pk3s in the gamedir)
- Resolve primary chain using existing `read_config_chain` logic
- Extended: when an exec ref doesn't resolve to a loose file, check inside pak/pk3 files (alphabetical order, later overrides earlier — matching ezQuake's load order)
- Return ConfigSource with chain + inventory

**scan_dropped_input(paths: Vec<Path>) -> ConfigSource**
- Classify input:
  - Single .cfg: ConfigSource with just that file, no chain
  - Multiple .cfg: attempt chain resolution (does any file have exec refs to others?), remainder in available_configs
  - Archive: extract index, filter to .cfg, attempt gamedir detection, resolve chain if gamedir found
  - Mixed: handle each file by type, merge results
- Return ConfigSource

### Archive Reading

| Format | Index Reading | Config Extraction |
|--------|--------------|-------------------|
| ZIP/PK3 | Central directory at EOF | Decompress matching entries (deflate) |
| PAK | 12-byte header -> file table (name + offset + size) | Read raw bytes at offset |
| Nested | Archive contains a .pak/.pk3 | Extract inner archive to temp, scan it. Max 2 levels deep. |

Index-only scan for enumeration. Only extract/decompress .cfg entries. Even large archives enumerate in milliseconds.

### Gamedir Detection (for archives)

```
1. Look for directories containing config.cfg or autoexec.cfg
2. Prefer qw/ if found
3. Fallback to id1/
4. Fallback to any directory with a config.cfg
5. No gamedir found -> treat all .cfg files as flat collection
```

When gamedir detected, resolve chain within the archive's virtual filesystem using the same exec-ref walking logic.

### Multiple Dropped Files — Chain Resolution

When multiple .cfg files are dropped:
1. Does any file have exec refs pointing to other dropped files?
2. Yes: that file becomes the chain primary. Referenced files join the chain. Remainder in available_configs.
3. No: all files listed as peers. First selected by default.

Example: drop config.cfg + teamsays.cfg + highquality.cfg. config.cfg has `exec teamsays.cfg`. Result:
- Chain: config.cfg (primary) -> teamsays.cfg (exec)
- Other: highquality.cfg

## Tauri Commands

```rust
// Replaces read_config_chain for the viewer
#[tauri::command]
fn scan_local_install(exe_path: String, config_name: String)
  -> Result<ConfigSource, String>

// Handle dropped files or archives
#[tauri::command]
fn scan_dropped_input(paths: Vec<String>)
  -> Result<ConfigSource, String>

// Load a specific config from a known source (user clicks "Other" item)
#[tauri::command]
fn load_config_from_source(
    source_origin: SourceOrigin,
    config_path: String
  ) -> Result<ConfigChain, String>
```

Existing `read_config_chain` and `read_ezquake_config` stay as internal functions. `scan_local_install` wraps them and adds inventory scanning.

## UI Changes

### Chain Panel — "Other Configs" Section

The expanded chain panel gains a new section listing all configs found outside the active chain:

```
CONFIG CHAIN (2 FILES)
|- [x] configs/config.cfg     primary  874 lines
|- [x] configs/slackers_tp.cfg         255 lines

OTHER CONFIGS (16)
  autoexec_old.cfg
  para_backup.cfg
  graphics_test.cfg
  tp_v2.cfg (pak0.pak)               <- inside a pak
  > 12 more...
```

Collapsed by default, expandable. Click to load. Configs inside paks are labeled with the pak name.

### Dual-Source Layout

When source B is populated, the content area shows two value columns with shared filtering:

```
+---------------------------+-----------------------+
| [Left source header]      | [Right source header] |
| Chain + Other configs     | Chain + Other configs |
+---------------------------+-----------------------+
| CVAR        | VALUE A     | VALUE B               |
| sensitivity | 3           | 2.5                   |
| tp_name_rl  | "rl"        | "rocket"              |
```

- One sidebar controls filtering for both sides (categories, domains, search, hide-defaults)
- Compare/diff highlighting activates automatically when both sources populated
- Existing compare filter pills (All, Different, Same, Only yours, Only theirs) work as-is
- Each side has its own chain panel with file checkboxes and "Other" list
- X button on right side header to close comparison and return to single view

### Drop Zone

On drag-over, a subtle overlay appears on the viewer:

```
Drop .cfg, .zip, .pak, .pk3 to compare
```

Drop always targets the right side.

### Re-drop Behavior

| Scenario | Behavior |
|----------|----------|
| Right side empty | Load dropped files |
| Right side populated, new files dropped | Show inline prompt: [Add to current] [Replace] |
| Right side has archive, new files dropped | Replace (mixing sources is confusing) |

Inline prompt appears as a bar at the top of the right panel. Defaults to replace if ignored.

Individual files in the right side's config list get an X button for removal.

### Accepted File Types

| Extension | Action |
|-----------|--------|
| .cfg | Parse directly |
| .zip | Scan index, extract .cfg entries |
| .pak | Read PAK file table, extract .cfg entries |
| .pk3 | Same as .zip (pk3 is a renamed zip) |
| Mixed drop | Handle each by type, merge results |
| Other | Ignore silently |

### Error Handling

- Corrupt archive or unreadable file: toast notification "Couldn't read [filename] — skipped"
- Archive with zero .cfg files: toast "No config files found in [filename]"
- Don't block other files in a multi-drop from loading

### Size Guardrails

- Index scan: always instant, no loading state
- Config extraction with > 5 configs: show "Extracting configs..." indicator
- No file size limit — we only extract text .cfg files (kilobytes even for 50 configs)

## Implementation Priority

Build bottom-up: loading layer first, then UI.

1. **Archive reader** — PAK and ZIP/PK3 index reading + .cfg extraction in Rust
2. **Gamedir scanner** — scan a directory for all .cfg files (loose + inside paks)
3. **ConfigSource assembly** — combine scanner results with chain resolution
4. **Tauri commands** — expose scan_local_install, scan_dropped_input, load_config_from_source
5. **Frontend dual-source model** — refactor viewer state from config+compareText to sourceA+sourceB
6. **Drag-and-drop** — accept files, call scan_dropped_input, populate right side
7. **Other Configs UI** — chain panel inventory section, source picker
8. **Polish** — re-drop behavior, error toasts, loading indicators

## Future Extensions (not in this spec)

- FTE client support (same scanner, different cvar database)
- Selective apply ("apply only HUD settings from this config")
- Domain snapshots saved under /ezquake/configs/slipgate/
- Mailslot integration for live-reloading configs into running ezQuake
- DB-backed config history and community sharing
