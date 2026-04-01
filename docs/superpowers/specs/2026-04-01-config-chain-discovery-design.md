# Config Chain Discovery

**Date:** 2026-04-01
**Status:** Approved
**Scope:** New Rust Tauri command + data structures for discovering and returning the full config file chain

## Problem

The current `read_ezquake_config` command reads a single config file and extracts structured data (name, sensitivity, binds, etc.) plus `raw_cvars`. It follows exec references for aliases and binds but drops cvars from exec'd files entirely. The Config viewer in Slipgate shows an incomplete picture of the player's configuration.

Players organize their configs across multiple files:
- `config.cfg` — primary config with core settings
- `exec` directives — inline references to other configs (e.g., `exec configs/slackers_tp.cfg`)
- `autoexec.cfg` — engine-loaded after config.cfg
- `cl_onload` — cvar containing commands run after initialization
- Bound/aliased execs — `bind t "exec teamplay.cfg"`, loaded manually per situation (maps, modes)

All of these are part of the player's configuration and should be discoverable.

## Design

### New Command: `read_config_chain`

A new Tauri command that discovers the full config file tree starting from the primary config. Returns each file individually with its parsed contents and relationship metadata. Does not merge files — the frontend decides how to present them.

The existing `read_ezquake_config` stays untouched. It serves the profile tab (name, colors, movement, weapons). The new command serves the Config section under My Quake.

### Data Structures

```rust
#[derive(Serialize, Clone)]
pub enum ConfigSource {
    Primary,      // config.cfg (or whatever cfg_load specifies)
    Exec,         // top-level exec statement in a config file
    AutoExec,     // autoexec.cfg (loaded by engine after config.cfg)
    ClOnload,     // exec inside cl_onload cvar value
    BoundExec,    // exec inside a bind command string
    AliasExec,    // exec inside an alias command string
}

#[derive(Serialize, Clone)]
pub struct ExecReference {
    pub file: String,       // which file contains the reference
    pub context: String,    // human-readable: "exec", "cl_onload", "bind t", "alias loadtp"
}

#[derive(Serialize, Clone)]
pub struct ConfigFile {
    pub name: String,                       // "slackers_tp.cfg"
    pub relative_path: String,              // "configs/slackers_tp.cfg"
    pub source: ConfigSource,
    pub referenced_by: Option<ExecReference>,
    pub cvars: HashMap<String, String>,
    pub binds: Vec<(String, String)>,
    pub aliases: HashMap<String, String>,
    pub exec_refs: Vec<String>,             // raw exec references found in this file
    pub line_count: u32,
}

#[derive(Serialize, Clone)]
pub struct UnresolvedExec {
    pub raw_ref: String,                    // "$mapname.cfg"
    pub referenced_by: ExecReference,
}

#[derive(Serialize, Clone)]
pub struct ConfigChain {
    pub files: Vec<ConfigFile>,             // ordered by discovery sequence
    pub unresolved: Vec<UnresolvedExec>,    // variable-based exec refs
    pub other_cfgs: Vec<OtherConfig>,       // .cfg files not in the chain
}

#[derive(Serialize, Clone)]
pub struct OtherConfig {
    pub name: String,
    pub relative_path: String,
    pub size_bytes: u64,
}
```

### Discovery Algorithm

**Phase 1 — Walk the primary config tree**

1. Parse primary config file (e.g., `config.cfg`). Add as first entry with `source: Primary`.
2. Follow its top-level `exec_refs` in order. For each:
   - Resolve the file path (try game dir, config dir, strip `configs/` prefix).
   - If found: read, parse, add to chain with `source: Exec`.
   - Recurse into that file's own `exec_refs`.
   - If the ref contains `$` or `%` (variable substitution): add to `unresolved` list.
   - If file not found: skip (could optionally add to unresolved as "missing").

**Phase 2 — autoexec.cfg**

3. Check for `autoexec.cfg` in the ezquake directory (same as engine: look in game dir root).
   - If exists: read, parse, add to chain with `source: AutoExec`.
   - Follow its exec refs recursively (same as phase 1).

**Phase 3 — cl_onload**

4. Read `cl_onload` from the primary config's cvars.
   - Split on `;`, scan each segment for `exec <path>`.
   - For each exec found: resolve, read, parse, add with `source: ClOnload`.
   - Recurse into each file's exec refs.

**Phase 4 — Exec refs inside binds and aliases**

5. Scan all files already in the chain:
   - For each bind value: scan for `exec <path>` in the command string.
   - For each alias value: scan for `exec <path>` in the command string.
   - Any new files found: resolve, read, parse, add with `source: BoundExec` or `AliasExec`.
   - Recurse into their exec refs.

**Phase 5 — Other configs**

6. Scan the config directory (and `configs/` subdirectory) for all `.cfg` files.
   - Any file not already in the chain: add to `other_cfgs` with name, path, size.

### Cycle and Safety Protection

- **Seen-paths set**: Track canonical file paths. Skip any file already discovered.
- **Security boundary**: Only follow paths within the ezquake directory tree.
- **No depth limit**: Cycle detection prevents infinite recursion.
- **Missing files**: Silently skipped (not an error — configs reference files that may not exist on every install).

### Exec Extraction from Command Strings

Binds and aliases contain semicolon-separated command strings. The extraction scans for the pattern `exec <path>` within these strings:

```
bind t "exec configs/teamplay.cfg"           → "configs/teamplay.cfg"
bind F1 "echo loading; exec dm4.cfg"         → "dm4.cfg"
alias loadtp "exec tp.cfg; exec msg.cfg"     → ["tp.cfg", "msg.cfg"]
alias mapsetup "exec configs/$mapname.cfg"   → unresolved ("configs/$mapname.cfg")
```

### ezQuake Load Order (reference)

From `host.c` in the ezQuake source:

```
1. default.cfg        — Cfg_ExecuteDefaultConfig() [from pak0.pak, usually skipped]
2. config.cfg         — cfg_load config.cfg [primary config]
   └→ inline execs   — processed as they appear in the file
3. autoexec.cfg       — if exists, exec'd after config.cfg
4. cl_onload          — executed as command buffer after initialization
```

Last definition wins for conflicting cvars/binds/aliases.

### File Resolution

Reuses the existing resolution strategy from `read_ezquake_config`:

```rust
let candidates = [
    game_dir.join(exec_path),
    cfg_dir.join(exec_path),
    game_dir.join(exec_path.trim_start_matches("configs/")),
];
```

Where `game_dir` is the parent of the config directory (the ezquake root) and `cfg_dir` is the `configs/` subdirectory.

### What This Does Not Do

- **No merging**: Files are returned individually. The frontend decides if/when to show a merged view.
- **No pak/pk3 reading**: Only plain files on disk. Packed configs (default.cfg in pak0.pak, nquake.pk3 bundles) are a future enhancement.
- **No runtime variable resolution**: `$mapname.cfg` is flagged as unresolved, not guessed at.
- **No modification of existing commands**: `read_ezquake_config` and `EzQuakeConfig` remain unchanged.

### Frontend Consumption (overview)

The Config section under My Quake will call `read_config_chain` and display:

1. **Chain tree view**: Shows load order and relationships between files.
2. **Individual file view**: Click any file to see its cvars/binds/aliases.
3. **Other configs list**: Browse files not in the active chain.
4. **Optional merged view**: Future — combine chain files with proper override order.

Detailed frontend design is out of scope for this spec.
