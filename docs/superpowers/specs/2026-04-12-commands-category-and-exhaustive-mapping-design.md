# Commands Category and Exhaustive Source Mapping

**Date:** 2026-04-12
**Status:** Draft
**Scope:** `packages/qw-config/`, `apps/slipgate-app/src-tauri/src/commands/ezquake.rs`, `apps/slipgate-app/src/components/`

## Problem

The config viewer has five working data categories (cvars, aliases, macros, triggers, binds) but is missing a sixth: **commands**. These are named actions registered via `Cmd_AddCommand` in ezQuake source — things like `floodprot 4 4 10`, `mapgroup clear`, `hud_recalculate`, and the `+/-` press/release pairs. They appear in `cfg_save` output but our Rust parser explicitly discards them via a hardcoded `skip_commands` list.

Related gaps discovered during investigation:

- The `KNOWN_ENGINE_COMMANDS` set added earlier for unresolved bind detection is a hand-picked list of ~65 entries. The authoritative ezQuake source has ~472 `Cmd_AddCommand` calls. False positives surface regularly (`sizeup`, `sizedown`, `cvar_reset`, `menu_slist`, `+cl_wp_stats` were flagged as unresolved despite being real ezQuake commands).
- `packages/qw-config/src/data/ezquake-commands.json` exists with 511 entries but was built from the stale `help_commands.json` (which still contains removed commands like `mp3_*`) and is never loaded by any code.
- Built-in runtime macros (`%health`, `%ammo`, `%location`, etc. — 68 in `help_macros.json`) are not surfaced anywhere in the viewer.
- KTX mod stuff-aliases (`rpickup`, `autotrack`, `scores`, `list`, `next_best`, etc. — 300+) are injected by the server on connect and get flagged as unresolved. Users cleaning up configs cannot distinguish server-dependent binds from broken ones.
- Verbose `KP_*` key names (`KP_DOWNARROW`, `KP_LEFTARROW`) overflow the weapon bind keycap boxes in the viewer.
- Command-line parameters (71 in `help_cmdline_params.json`) are not mapped. Low priority for now, but inexpensive to extract alongside the other source scraping so a future launcher-parsing feature can consume the database.

This spec fixes all of these in one pass because they share the same infrastructure: authoritative extraction scripts that produce JSON files in `qw-config/src/data/`, loaders that expose them, and parser/UI updates that consume them.

## Design

### 1. Source extraction scripts

A new `packages/qw-config/scripts/` directory with Node scripts that read the committed research repos and produce JSON files. Scripts are idempotent and run manually when the source repos are updated.

**`extract-ezquake-commands.mjs`**
- Reads `research/repos/ezquake-source/src/*.c`, greps for `Cmd_AddCommand("name", ...)` calls
- For each command, pulls description from `research/repos/ezquake-source/help_commands.json` if present
- Assigns a logical group based on name prefix patterns (see Group Mapping below)
- Writes `packages/qw-config/src/data/ezquake-commands.json` with schema:
  ```json
  {
    "groups": [{ "id": "action", "name": "Press/Release Actions" }, ...],
    "commands": {
      "+attack": { "group-id": "action", "desc": "Begin firing the current weapon." },
      "floodprot": { "group-id": "stateful", "desc": "Configure chat flood protection." },
      ...
    }
  }
  ```
- Replaces the existing stale file

**`extract-ezquake-macros.mjs`**
- Reads `research/repos/ezquake-source/help_macros.json`
- Writes `packages/qw-config/src/data/ezquake-macros.json` with:
  ```json
  {
    "macros": {
      "health": { "desc": "Current health." },
      "ammo": { "desc": "Current weapon ammo." },
      ...
    }
  }
  ```

**`extract-ezquake-cmdline.mjs`**
- Reads `research/repos/ezquake-source/help_cmdline_params.json`
- Writes `packages/qw-config/src/data/ezquake-cmdline-params.json`
- Scaffolding only for this spec; no viewer UI consumes it yet

**`extract-ktx-commands.mjs`**
- Reads `research/repos/ktx/src/commands.c`, parses the `cmds[]` static array definition
- Extracts command names (first string field of each struct entry)
- Writes `packages/qw-config/src/data/ktx-commands.json` with schema:
  ```json
  {
    "commands": {
      "rpickup": { "desc": "KTX: random team pickup" },
      "autotrack": { "desc": "KTX: auto-track best player" },
      ...
    }
  }
  ```
- Descriptions are best-effort (pulled from surrounding `CD_*` defines where available); not a blocker if missing

### 2. Group mapping for ezQuake commands

Since `ezquake-commands.json` has no group field in source, the extraction script assigns groups using name-prefix rules applied in order (first match wins):

| Group ID | Name | Rule |
|---|---|---|
| `action` | Press/Release Actions | Starts with `+` or `-` |
| `teamplay` | Teamplay | Starts with `tp_` |
| `demo` | Demo & Recording | Starts with `demo_`, or in `{record, stop, playdemo, timedemo, easyrecord, stopdemo}` |
| `hud` | HUD | Starts with `hud_` or `hud262_`, or in `{sizeup, sizedown, hud_editor, hud_recalculate, hud_planmode, loadcharset}` |
| `video` | Video & Display | Starts with `vid_`, or in `{screenshot, bf, r_restart}` |
| `menu` | Menu | Starts with `menu_`, or in `{togglemenu}` |
| `sb` | Server Browser | Starts with `sb_`, or in `{serverinfo, status, who, whoami, whonot, ping}` |
| `stateful` | Stateful State | `floodprot`, `mapgroup`, `skygroup`, `filter`, `sb_sourcemark`, `sb_sourceunmarkall` |
| `game` | Game Actions | `kill`, `god`, `noclip`, `fly`, `give`, `pause`, `quit`, `disconnect`, `connect`, `reconnect`, `changing`, `notify`, `join`, `observe`, `ready`, `break`, `noready`, `vwep` |
| `config` | Config Management | `exec`, `alias`, `unalias`, `unalias_re`, `unaliasall`, `bind`, `unbind`, `unbindall`, `set`, `seta`, `unset`, `toggle`, `inc`, `dec`, `reset`, `resetall`, `cvar_reset`, `cfg_save`, `cfg_load`, `cfg_reset`, `wait`, `if`, `echo` |
| `comm` | Communication | `say`, `say_team`, `messagemode`, `messagemode2`, `rcon`, `name`, `team`, `color` |
| `dev` | Developer | Starts with `dev_`, or in `{cmdlist, cvarlist, apropos, snd_restart, dumpent}` |
| `deprecated` | Deprecated | `mp3_*` (documented in help but no `Cmd_AddCommand` call in source — flag via a separate check) |
| `misc` | Miscellaneous | Everything else |

These 14 groups become sub-group filter pills under the Commands category in the sidebar, matching the existing Graphics/HUD sub-group pattern.

### 3. qw-config loaders

New exports from `packages/qw-config/src/loaders/ezquake.ts`:

```typescript
export function loadEzQuakeCommands(): EzQuakeCommandDatabase;
export function loadEzQuakeMacros(): EzQuakeMacroDatabase;
export function loadEzQuakeCmdlineParams(): EzQuakeCmdlineDatabase;
```

New file `packages/qw-config/src/loaders/ktx.ts`:

```typescript
export function loadKtxCommands(): KtxCommandDatabase;
```

Each loader caches its result (same pattern as `loadDatabase`). Types defined in `packages/qw-config/src/types.ts`:

```typescript
interface EzQuakeCommandDatabase {
  groups: Array<{ id: string; name: string }>;
  commands: Map<string, { groupId: string; desc: string }>;
}

interface EzQuakeMacroDatabase {
  macros: Map<string, { desc: string }>;
}

interface EzQuakeCmdlineDatabase {
  params: Map<string, { desc: string }>;
}

interface KtxCommandDatabase {
  commands: Map<string, { desc: string }>;
}
```

Top-level re-exports from `packages/qw-config/src/index.ts`.

### 4. Rust parser update

**Remove** the hardcoded `skip_commands` list in `parse_config` (`apps/slipgate-app/src-tauri/src/commands/ezquake.rs:233-238`).

**Remove** the `+`/`-` skip at line 249.

**Add** a new field to `ParsedConfig`:

```rust
pub struct CommandInvocation {
    pub name: String,
    pub args: String,
}

pub struct ParsedConfig {
    pub cvars: HashMap<String, String>,
    pub user_created: HashSet<String>,
    pub bindings: Vec<(String, String)>,
    pub aliases: HashMap<String, String>,
    pub exec_refs: Vec<String>,
    pub command_invocations: Vec<CommandInvocation>,  // NEW
}
```

**Parsing rule:** After handling bind/alias/exec/set lines, any remaining line whose first token is not a known cvar name (from the qw-config database, which Rust doesn't have access to — so we defer this check) is captured as a command invocation. Since the Rust parser doesn't have qw-config context, use a simpler rule: if the line has a first token and a remainder, and the line isn't matched by the existing cvar-assignment logic (which currently treats anything with a value as a cvar), capture it.

**Concretely:** distinguish a cvar assignment from a command invocation using the following heuristic in the parser:
- Lines starting with `+` or `-` → command invocation (press/release action)
- Lines where the first token matches a command we know about → command invocation. Since Rust has no live database, we bundle a small set of known "stateful" commands in the Rust parser (`floodprot`, `mapgroup`, `skygroup`, `filter`, `hud_recalculate`, `sb_sourcemark`, `sb_sourceunmarkall`, `unbind`, `unbindall`, `unaliasall`, `tp_pickup`, `tp_took`, `tp_point`) and treat them as invocations
- Everything else → cvar assignment (current behavior)

This is not ideal (duplicates a tiny command list in Rust), but it avoids plumbing the qw-config database into the Rust side. Future work: replace the heuristic with a proper known-commands lookup once the Rust side gains access to the command database.

**Propagate** `command_invocations` up through `ConfigFile`, `ConfigChain`, `EzQuakeConfig`, and the Tauri IPC boundary so the TypeScript side receives the data.

**Source tracking:** Each command invocation needs a source file so the UI can show which file in the chain it came from. Use the same per-file tracking the parser already does for cvars.

### 5. Commands sidebar category in the viewer

Add a new section in `ConfigViewer.tsx` sidebar between Triggers and Binds:

```
SETTINGS
  HUD, Graphics, Sound, Input, Multiplayer, ...
DOMAINS
  Teamplay (Settings, Binds, Macros)
  Weapons (Settings, Binds)
OPTIONS
  Binds
  Aliases
  Macros
  Triggers
  Commands      ← NEW
```

The Commands pill behaves like other pills: clicking toggles the section on/off.

When active, the Commands section renders with sub-group pills at the top (the 14 groups from §2). The row layout follows the existing pattern used by Aliases and Macros sections:

- Chevron / expand indicator
- Command name (monospace, colored by group)
- Arguments (monospace, dim)
- Source file badge
- "Default" badge for invocations matching known ezQuake defaults (see §6)

Clicking a row expands it to show:
- Description from the commands database
- Alias chain resolution if the args reference an alias

### 6. Default command matching

A new `ezquake-default-commands.json` file, manually curated during Spec 1 implementation, listing the command invocations ezQuake outputs in a fresh `cfg_save`:

```json
{
  "defaults": [
    { "name": "-moveup", "args": "" },
    { "name": "-movedown", "args": "" },
    { "name": "-forward", "args": "" },
    ...
    { "name": "floodprot", "args": "4 4 10" },
    { "name": "mapgroup", "args": "clear" },
    { "name": "skygroup", "args": "clear" },
    { "name": "hud_recalculate", "args": "" }
  ]
}
```

The initial list covers the `-release` block (~17 entries) plus the common stateful commands (~8 entries). Produced manually by running `cfg_save` on a fresh ezQuake install and recording the output. Committable; if upstream changes the defaults, the file is updated the same way source-extracted files are.

The Commands section UI marks invocations matching this list as "default" and hides them when the existing "Hide Defaults" toggle is on — same pattern as cvars.

### 7. Bind detection rewrite

Update `categorizeBinds` in `apps/slipgate-app/src/components/configMerger.ts`:

**Remove** the hardcoded `KNOWN_ENGINE_COMMANDS` set and related helpers.

**New signature:**
```typescript
export function categorizeBinds(
  rawBinds: [string, string][],
  weaponBinds: WeaponBind[],
  teamsayBinds: TeamsayBind[],
  movement: MovementKeys,
  chain: ConfigChain,
  selectedIndices: Set<number>,
  aliases: Record<string, string>,
  cvarSet: Set<string>,
  ezquakeCommandSet: Set<string>,   // NEW
  ktxCommandSet: Set<string>,       // NEW
  compareClassification?: ChainBindClassification | null,
  compareRawCommands?: Record<string, string>,
): EnrichedBind[]
```

**Detection order** (each bind's first command token is checked in this sequence):
1. Weapon bind (from Rust classification) → `weapons`
2. Teamsay bind (from Rust classification) → `teamsay`
3. Movement key (matches `movement.*` struct) → `movement`
4. Rocket jump heuristic (attack + jump in resolved command) → `movement`
5. KTX command → `ktx`
6. ezQuake command → `misc` (normal known command, not broken)
7. Cvar assignment → `misc`
8. User-defined alias (in config chain) → `misc`
9. None of the above → `unresolved`

`ConfigViewer.tsx` builds both sets at memo time from the qw-config loaders and passes them to `categorizeBinds`.

**EnrichedBind category union extended:**
```typescript
category: "movement" | "weapons" | "teamsay" | "ktx" | "unresolved" | "misc";
```

### 8. KTX binds in the UI

`ConfigBindsSection.tsx`:

- Add `ktx: "oklch(0.7 0.15 310)"` (purple-magenta) to `CATEGORY_COLORS`
- Add KTX to the sort order: `{ movement: 0, weapons: 1, teamsay: 2, ktx: 3, unresolved: 4, misc: 5 }`
- KTX binds display with the purple color in the type column, label reads "KTX"
- Expanding a KTX bind shows a small info banner: "This command is injected by the KTX server mod when you join a KTX server. It will not work on vanilla servers."

### 9. Built-in macros reference section

New subsection in the existing Macros area (`ConfigMacrosSection.tsx` or a sibling component), showing all 68 `%`-prefixed runtime tokens from `ezquake-macros.json`:

- Name (`%health`, `%weapon`, etc. — monospace)
- Description from the database
- Read-only: these are engine-provided, not user-editable

Displayed as a distinct sub-group "Runtime Macros" alongside the existing "User Created", "Item Names", "Teamplay Communications", etc. sub-groups. The macros are not tied to any specific config file — they're always available.

### 10. KP_ key name shortening

Add a display-time mapping in `formatKeyName` (wherever key labels are rendered on keycaps). The underlying data (bind key name) is unchanged; only the display label is shortened:

| Full name | Display |
|---|---|
| `KP_UPARROW` | `KP_↑` |
| `KP_DOWNARROW` | `KP_↓` |
| `KP_LEFTARROW` | `KP_←` |
| `KP_RIGHTARROW` | `KP_→` |
| `KP_HOME` | `KP_Home` |
| `KP_END` | `KP_End` |
| `KP_PGUP` | `KP_PgUp` |
| `KP_PGDN` | `KP_PgDn` |
| `KP_INS` | `KP_Ins` |
| `KP_DEL` | `KP_Del` |
| `KP_ENTER` | `KP_Enter` |
| `KP_PLUS` | `KP_+` |
| `KP_MINUS` | `KP_-` |
| `KP_STAR` | `KP_*` |
| `KP_SLASH` | `KP_/` |

Applied only to weapon bind keycaps and the Binds view bind keycap — wherever the UI renders a key label.

## Scope boundaries

**In scope:**
- Source extraction scripts for ezQuake commands, macros, cmdline params, KTX commands
- qw-config loaders and types
- Rust parser: capture command invocations, propagate through IPC
- Commands sidebar category with sub-groups and default handling
- Bind detection rewrite using authoritative command sets
- KTX binds as distinct category with distinct styling
- Built-in macros reference section
- KP_ key name cosmetic shortening
- Cmdline params database extraction (no UI)

**Out of scope:**
- Launcher file (.bat/.lnk) parsing UI — separate future spec
- Launcher auto-detection — separate future spec
- Exhaustive default command matching beyond the ~25 curated entries
- Commands category in domain views (no "weapons:commands" pill) — commands are flat, not domain-scoped
- Config builder / writer integration — the mappings are prepared for this but the builder is a separate feature

## Testing

Manual verification after implementation:

1. Run extraction scripts, verify JSON outputs look sane (spot-check 10 random commands, compare to source)
2. Load a config with command invocations (user's own config with `floodprot`, `mapgroup`, etc.)
3. Verify Commands section appears in sidebar and shows the invocations
4. Verify sub-group pills filter correctly
5. Toggle "Hide Defaults" — verify `-release` block and default stateful commands disappear
6. Verify bind view no longer flags `sizeup`, `sizedown`, `cvar_reset`, `+cl_wp_stats`, `menu_slist`, `+showteamscores` as unresolved
7. Verify KTX-injected bind targets (`rpickup`, `autotrack`, `scores`, etc.) show as KTX category with purple styling
8. Verify genuine unresolved binds (typos, removed commands like `mp3_next`) still flag correctly
9. Verify Runtime Macros reference section appears in the Macros area
10. Verify KP_ keycap labels are shortened in weapon bind rows
11. Verify loadDatabase/loadEzQuakeCommands/loadKtxCommands/loadEzQuakeMacros all return populated data
12. Load HangTime's messy config — verify the unresolved count drops significantly and KTX binds are properly categorized
