# MVDSV Layer 1 Extraction - Design

**Date:** 2026-04-27
**Status:** Design draft, pending user review before implementation plan
**Related:** Phase 2e of the QW knowledge service rollout (per HANDOVER.md)
**Predecessors:** ezQuake extraction (head + deep-time walk v3.0 -> head, shipped 2026-04-25), QWCL 2.33 (first cross-codebase port, shipped 2026-04-25), FTE Phase 2d-core + 2d-bundle (shipped 2026-04-26 + 2026-04-27), Game-mechanics Layer 1 arc 1 (shipped 2026-04-27 evening)

## Goal

Load MVDSV Layer 1 entities into `apps/qw-oracle/data/knowledge.db` so the oracle gains server-side coverage. MVDSV is the QuakeWorld server every modern competitive QW match runs on; it hosts KTX (the dominant gametype mod), records MVD demos consumed by the parser ecosystem, and exposes the protocol surface the qw_event_log validation oracle will eventually cross-check against. Phase 2e ships the engine-side foundation that subsequent arcs (KTX cvars/commands, KTX gameplay overrides, validation harness) build on.

## Why MVDSV is structurally similar to existing ports

MVDSV is a server-side QuakeWorld engine descended from the same `qwsv` codebase QWCL extracted from. Same C language, same `cvar_t` struct, same `Cmd_AddCommand` API shape, same libclang+Visitor extraction toolchain. The differences are scope (server-only, no client/renderer/audio surfaces), some new entity types specific to server software (protocol messages, userinfo keys, log templates, QuakeC builtins), and a different preprocessor profile (always SERVERONLY, FTE protocol extensions, no client variants).

The proven ezQuake/FTE/QWCL playbook (`apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`) covers MVDSV's base cvar/command patterns without modification. The four new entity types each follow established detection shapes (struct-init iteration, call-site string-literal extraction, function-pointer table iteration). No new architectural patterns expected.

## Source landscape

Verified during brainstorming (2026-04-27):

- 60,152 lines across 88 source files in `research/repos/mvdsv/src/`
- Cvar API: `Cvar_Register` for static cvars, `Cvar_Create` for runtime registrations (Bucket 2, out of static reach)
- Command API: `Cmd_AddCommand` only - no `Cmd_AddCommandD`/`Cmd_AddLegacyCommand` variants in MVDSV
- No `help_*.json` files - MVDSV ships with no separate documentation JSON, so 100% of DB rows come from source extraction
- Trailing comments on roughly 50% of cvar declarations; commands carry Doom-style banner blocks above each `_f` handler with descriptions in some cases
- Active development: 2025 saw 75 commits; latest commit 2026-01-04
- Tags: pre-modern era v0.11-v0.30 (CVS-imported 2014), modern pre-v1 era 0.31-0.36 (2016-2023), v1.x era v1.00 + v1.10 + 1.11 (2024-2025)
- Reference production server: nicotinelounge.com running 1.20-dev (post-1.11 head), built 2026-04-11

## Locked scope decisions

Resolved during the 2026-04-27 brainstorming session. Do not re-litigate without a fresh trigger.

| Decision | Choice | Rationale |
|---|---|---|
| Approach | Approach 1: unified driver, single arc, all seven handlers ship together | Per-handler complexity is independent at the data level; bugs are local. Splitting the arc doubles ceremony without risk benefit. |
| Entity types | Seven: cvars, commands, cmdline_params, protocol_messages, info_keys, log_templates, qc_builtins | Layer 1 is foundational knowledge; extract everything that earns its keep as router data. |
| Variant model | V1: server-base + Win + Linux. Three TU parses per file. | Mirrors how production MVDSV actually compiles. SERVERONLY always defined; no client variants exist. |
| Protocol extensions | All FTE_PEXT_* and MVD_PEXT1_* enabled in clang_args | Matches what every modern QW server runs. The `1.11` shipped binary has them all on. |
| WITH_NQPROGS | Off | Verified absent from CMakeLists.txt and build_cmake.sh; not in shipped MVDSV binary. Including would extract a cvar (`sv_forcenqprogs`) that does not exist in any production server. Slime concurs: drop NQ. |
| Debug guards | PARANOID, DEBUG_VM, MVD_PEXT1_DEBUG: off | Developer-only; never on in production builds. |
| Versioning | Single `head` snapshot at the latest main commit | Matches FTE/QWCL precedent. Production servers track head (Ciscon's 1.20-dev confirms). |
| Deep-time | Out of scope this arc; queued as Phase 2e-deep-time follow-up | Reverse walk pattern from ezQuake (head shipped first, then walked back). Anchor selection consumes Ciscon/Slime input when it arrives. |
| Runtime validation | Required, against Ciscon's `qw-1.log` dump | 758 cvars + 107 commands captured 2026-04-27; closest available production reference. |
| Help-JSON authoring | Not done | MVDSV ships no help-JSON; trailing comments and banner descriptions are the only inline semantic source. |
| KTX-progs filter | Required for runtime validation diff | Cvar dump includes ~570 KTX-registered cvars (`k_*`, `_k_*`, `__k_*`, `add_q_*`, `dmm4_*`); these will not appear in MVDSV C source and must be filtered before gap analysis. |

## Out of scope

Explicitly deferred to later arcs or skipped permanently.

| Item | Status | Notes |
|---|---|---|
| Asset bundle (categories/extensions/path_rules/cvar_bindings/loader_sites) | Skipped | MVDSV is a server; asset categories barely apply (no client-side textures/sounds/models). Bundle pattern earns its keep on clients consumed by slipgate, not servers. |
| KTX cvars/commands extraction | Phase 2e-KTX (next arc after this one) | Different toolchain (py-tree-sitter for QuakeC), different pattern catalog. Does not bundle with MVDSV C extraction per Approach 1. |
| KTX gameplay overrides | Phase 2e-KTX-gameplay (after KTX cvars) | Fills `gameplay_source_id='ktx'` rows in the schema-v14 game-mechanics tables; mirrors id1 baseline arc. |
| qw_event_log validation harness | Validation-harness arc (after KTX gameplay overrides) | Wires the parser's obit corpus + WeaponType taxonomy to the oracle for cross-validation. |
| MVDSV deep-time walk | Phase 2e-deep-time (after KTX cvars) | Anchors decided per Ciscon/Slime input. Walk pattern is reusable from ezQuake. |
| QWFWD extraction | Future, separate phase | Source not yet cloned to `research/repos/qwfwd`. Add when cloned. |
| QC mod extraction (other than KTX) | Out of scope indefinitely | Custom mods are user-loaded; static analysis of arbitrary `progs.dat` is out of reach. |
| Server-internal log templates noise filtering | Captured but channel-discriminated | Con_Printf debug logs included as `channel='console'`; consumers can filter by channel. |

## Architecture

### File layout

All files under `apps/qw-oracle/scripts/extractors/mvdsv/` are new. Files under `extractor_lib/` and `load-knowledge/` are existing and extended per the loader section.

```
apps/qw-oracle/scripts/extractors/mvdsv/
+-- extract.py                     # driver: 3-variant TU dispatch, multiprocessing
+-- clang_config.py                # SERVERONLY+PEXT base; +Win and +Linux variants
+-- _handler_cvars.py              # cvar_t struct-init (Pattern 1), Cvar_Register call sites
+-- _handler_commands.py           # Cmd_AddCommand call sites + function-banner description harvest (NEW SUB-PATTERN)
+-- _handler_cmdline.py            # COM_CheckParm call sites
+-- _handler_protocol.py           # svc_*/clc_* enum constants + PEXT bit defines (NEW TYPE)
+-- _handler_info_keys.py          # Info_ValueForKey/Info_SetValueForKey call sites (NEW TYPE)
+-- _handler_log_templates.py      # SV_BroadcastPrintf/SV_ClientPrintf/Con_Printf/Sys_Printf format strings, channel-discriminated (NEW TYPE)
+-- _handler_qc_builtins.py        # pr_builtin function-pointer table iteration (NEW TYPE)
+-- validation-fixtures/
|   +-- ciscon-1.20-dev-2026-04-27.log    # Ciscon's nicotinelounge.com cvarlist + cmdlist
|   +-- ktx-progs-prefixes.txt            # filter list for runtime validation diff
+-- README.md                      # per-engine extraction notes (mirrors fte/README.md)
+-- output/                        # *-ast.json (committed to git)
    +-- mvdsv-variables-ast.json
    +-- mvdsv-commands-ast.json
    +-- mvdsv-cmdline-params-ast.json
    +-- mvdsv-protocol-messages-ast.json
    +-- mvdsv-info-keys-ast.json
    +-- mvdsv-log-templates-ast.json
    +-- mvdsv-qc-builtins-ast.json
```

### Variant matrix

Three libclang TU parses per source file:

```python
def clang_args_server_base(mvdsv_src: str) -> list[str]:
    return [
        "-x", "c",
        "-I", mvdsv_src,
        "-DSERVERONLY",
        # Protocol extensions ON (modern production server)
        "-DFTE_PEXT_FLOATCOORDS",
        "-DFTE_PEXT_TRANS",
        "-DFTE_PEXT_CSQC",
        "-DFTE_PEXT_COLOURMOD",
        "-DFTE_PEXT_CHUNKEDDOWNLOADS",
        "-DFTE_PEXT2_VOICECHAT",
        "-DMVD_PEXT1_SERVERSIDEWEAPON",
        "-DMVD_PEXT1_HIDDEN_MESSAGES",
        "-DPROTOCOL_VERSION_FTE",
        "-DPROTOCOL_VERSION_FTE2",
        "-DPROTOCOL_VERSION_MVD1",
        "-DUSE_PR2",
        "-DWWW_INTEGRATION",
        # NQPROGS, PARANOID, DEBUG_VM, MVD_PEXT1_DEBUG: NOT defined
    ]

def clang_args_server_win(mvdsv_src: str) -> list[str]:
    return clang_args_server_base(mvdsv_src) + [
        "-D_WIN32",
        "-D_MSC_VER=1900",  # synthetic; chosen to satisfy guards
        "-I", "research/stubs/windows-sdk",  # reuses ezQuake's Windows SDK stubs
    ]

def clang_args_server_linux(mvdsv_src: str) -> list[str]:
    return clang_args_server_base(mvdsv_src) + [
        "-D__linux__",
        "-D__unix__",
    ]
```

Protocol extension list to be confirmed by inventory of `#ifdef`/`#if defined` guards in MVDSV source; each PEXT flag observed in a registration site that gates a cvar/command/template gets added. The list above is the brainstorming-time inventory of high-frequency guards; the `extract.py` first-pass step will enumerate exhaustively.

All three variants dispatch as `variant="server"` to the handlers - MVDSV has no client/server toggle within itself, so the per-file dedup in handlers prevents Win+Linux double-counting via the standard `_seen_in_file` mechanism.

### Driver structure

`extract.py` mirrors `extract-ezquake-unified.py`:

```python
ALL_HANDLERS = {
    "cvars":          CvarsHandler(),
    "commands":       CommandsHandler(),
    "cmdline":        CmdlineHandler(),
    "protocol":       ProtocolHandler(),
    "info_keys":      InfoKeysHandler(),
    "log_templates":  LogTemplatesHandler(),
    "qc_builtins":    QcBuiltinsHandler(),
}
```

Multiprocessing parallelism: 12 workers, same as existing engines. Per-file dispatch:

```python
for source_file in mvdsv_src_files:
    tu_base   = parse(source_file, clang_args_server_base)
    tu_win    = parse(source_file, clang_args_server_win)
    tu_linux  = parse(source_file, clang_args_server_linux)

    for handler in ALL_HANDLERS.values():
        handler.start_file(source_file, source_bytes)

    for variant_name, tu in [("server", tu_base), ("server", tu_win), ("server", tu_linux)]:
        walk_tu_dispatch(tu, ALL_HANDLERS.values(), variant_name, source_file)

    for handler in ALL_HANDLERS.values():
        rows = handler.end_file()
        all_rows[handler.name].extend(rows)
```

`finalize()` per handler: dedup by canonical name, return final JSON dict.

## Per-handler detail

### Handler 1: cvars

**Detection patterns:** Pattern 1 (literal `cvar_t` struct-init). Pattern 3 (nested `cvar_t` in container struct) if any nested-table types surface; first-pass inventory will confirm. Pattern 7 (platform-guarded code) handled by the 3-variant matrix.

**Sample registrations:**

```c
cvar_t  sv_mintic = {"sv_mintic", "0.013"};
cvar_t  sv_maxfps = {"maxfps", "77", CVAR_SERVERINFO};
static cvar_t sys_select_timeout = {"sys_select_timeout", "10000", 0, OnChange_sysselecttimeout_var};
```

**Output fields** (mirrors ezQuake schema):

```json
{
  "name": "sv_maxfps",
  "ast": {
    "default_value": "77",
    "flags_raw": "CVAR_SERVERINFO",
    "flag_names": ["CVAR_SERVERINFO"],
    "on_change": null,
    "source_file": "src/sv_main.c",
    "source_line": 50,
    "source_column": 9,
    "storage_class": null,
    "trailing_comment": "It actually should be called maxpps (max packets per second). It was serverinfo variable for quite long time, lets legolize it as cvar.",
    "raw_ast_hash": "<sha256-prefix>"
  }
}
```

**Expected count:** ~180 cvars (per playbook estimate; Ciscon's runtime dump after KTX-progs filter shows ~178 candidates).

**Schema:** reuses existing `cvar_versions` table. No migration needed.

### Handler 2: commands

**Detection patterns:** `Cmd_AddCommand("name", Function_f)` call sites. Plus a NEW SUB-PATTERN: function-banner description harvest.

**Banner harvest rule:** for each command's registered handler function (e.g., `SV_Kick_f`), walk back from the function definition cursor to the immediately preceding comment block. Parse the banner using these rules:

1. Banner block is delimited by `/*` and `*/`
2. Decoration lines match `^[=]+$` and are skipped
3. The function name line (e.g., `SV_Kick_f`) is detected and skipped
4. Blank lines are skipped
5. Remaining text lines are joined with single spaces and emitted as `description`

```c
/*
==================
SV_Kick_f
 
Kick a user off of the server
==================
*/
void SV_Kick_f (void)  ->  description = "Kick a user off of the server"
```

**Sample registrations:**

```c
Cmd_AddCommand ("kick",   SV_Kick_f);
Cmd_AddCommand ("status", SV_Status_f);
Cmd_AddCommand ("rmdir",  SV_RemoveDirectory_f);
```

**Output fields:**

```json
{
  "name": "kick",
  "ast": {
    "handler_fn": "SV_Kick_f",
    "source_file": "src/sv_ccmds.c",
    "source_line": 1835,
    "description": "Kick a user off of the server",
    "raw_ast_hash": "<sha256-prefix>"
  }
}
```

**Expected count:** ~107 commands (Ciscon's runtime dump). Description coverage estimated 30-50%.

**Schema:** reuses existing `command_versions` table. The `description` field already exists in the schema (from ezQuake help-JSON merge); MVDSV populates it from the banner harvest instead.

### Handler 3: cmdline_params

**Detection patterns:** `COM_CheckParm("-param")` call sites. Same as ezQuake.

**Sample registrations:**

```c
if (COM_CheckParm("-port")) ...
if (COM_CheckParm("-ip")) ...
```

**Output fields:** mirrors ezQuake schema (`name`, `source_file`, `source_line`, `containing_function`).

**Expected count:** ~30-50 cmdline params (typical server-side surface).

**Schema:** reuses existing `cmdline_param_versions` table.

### Handler 4: protocol_messages (NEW TYPE)

**Detection patterns:** enum constants and #defines in `protocol.h` and related headers. Pattern shapes:

1. Enum-style `#define svc_print 8` - macro definition with integer literal
2. PEXT bit `#define MVD_PEXT1_SERVERSIDEWEAPON (1<<0)` - macro with bit-shift expression
3. Enum-block declarations `enum { svc_bad = 0, svc_nop = 1, ... }` if present

**Sample (from `src/protocol.h` and `src/qwsvdef.h`):**

```c
#define svc_print           8       // [byte] id [string] null terminated string
#define svc_damage          15      // [byte] save [byte] take [coord3] from
#define svc_setangle        10      // [angle3] set view angle to this absolute value
#define MVD_PEXT1_SERVERSIDEWEAPON  (1<<0)
#define MVD_PEXT1_HIDDEN_MESSAGES   (1<<3)
```

**Output fields:**

```json
{
  "name": "svc_print",
  "ast": {
    "kind": "svc",
    "value": "8",
    "value_kind": "integer_literal",
    "source_file": "src/protocol.h",
    "source_line": 234,
    "trailing_comment": "[byte] id [string] null terminated string",
    "raw_ast_hash": "<sha256-prefix>"
  }
}
```

`kind` discriminator values: `svc` (server-to-client), `clc` (client-to-server), `nq` (NQ-protocol legacy), `pext_fte` (FTE protocol extension bit), `pext_mvd` (MVD protocol extension bit), `protocol_version` (protocol version constants).

**Expected count:** ~40-80 protocol constants.

**Schema:** new entity type `protocol_message`. New per-version table:

```sql
CREATE TABLE protocol_message_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,
  kind             TEXT NOT NULL CHECK (kind IN ('svc','clc','nq','pext_fte','pext_mvd','protocol_version')),
  value            TEXT,
  value_kind       TEXT,
  source_file      TEXT,
  source_line      INTEGER,
  trailing_comment TEXT,
  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,
  source_root      TEXT,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX idx_protocol_message_versions_source ON protocol_message_versions(source_file, source_line);
```

**Migration target:** schema v15.

### Handler 5: info_keys (NEW TYPE)

**Detection patterns:** call sites of `Info_ValueForKey`, `Info_SetValueForKey`, `Info_RemoveKey`, with second argument being a string literal (the key name).

**Sample registrations:**

```c
Info_ValueForKey(cl->userinfo, "team");
Info_ValueForKey(cl->userinfo, "*spectator");
Info_SetValueForKey(svs.info, "maxclients", val, MAX_SERVERINFO_STRING);
```

**Output fields:**

```json
{
  "name": "team",
  "ast": {
    "scope": "userinfo",
    "operations": ["read"],
    "first_seen": {
      "source_file": "src/sv_user.c",
      "source_line": 567,
      "containing_function": "SV_ParseStringCmd"
    },
    "all_call_sites": [
      {"source_file": "src/sv_user.c", "source_line": 567, "operation": "read"},
      {"source_file": "src/sv_main.c", "source_line": 1234, "operation": "read"}
    ],
    "raw_ast_hash": "<sha256-prefix>"
  }
}
```

`scope` values: `userinfo` (per-client info), `serverinfo` (server-global info), `localinfo` (server-local non-public info). Detected by the first argument expression (`cl->userinfo` -> `userinfo`, `svs.info` -> `serverinfo`, `localinfo` -> `localinfo`).

**Expected count:** ~30-50 distinct info keys.

**Schema:** new entity type `info_key`. New per-version table:

```sql
CREATE TABLE info_key_versions (
  entity_id           INTEGER NOT NULL REFERENCES entities(id),
  version             TEXT NOT NULL,
  scope               TEXT NOT NULL CHECK (scope IN ('userinfo','serverinfo','localinfo')),
  operations          TEXT,  -- JSON array: ["read","write","remove"]
  source_file         TEXT,
  source_line         INTEGER,
  containing_function TEXT,
  call_sites_json     TEXT,  -- JSON array of {source_file, source_line, operation}
  raw_ast_hash        TEXT,
  extracted_at        TEXT NOT NULL,
  source_root         TEXT,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX idx_info_key_versions_source ON info_key_versions(source_file, source_line);
```

### Handler 6: log_templates (NEW TYPE, channel-discriminated)

**Detection patterns:** call sites of `SV_BroadcastPrintf`, `SV_BroadcastTPrintf`, `SV_ClientPrintf`, `SV_ClientTPrintf`, `Con_Printf`, `Sys_Printf` with first argument being a string literal.

**Sample registrations:**

```c
SV_BroadcastPrintf (PRINT_HIGH, "%s entered the game\n", host_client->name);
SV_ClientPrintf (cl, PRINT_HIGH, "You are now muted\n");
Con_Printf ("Couldn't resolve %s\n", ip);
Sys_Printf ("Quake Server starting...\n");
```

**Output fields:**

```json
{
  "name": "<canonical_key>",
  "ast": {
    "channel": "broadcast",
    "format_string": "%s entered the game\n",
    "format_string_normalized": "%s entered the game",
    "source_file": "src/sv_user.c",
    "source_line": 234,
    "containing_function": "SV_AcceptClient",
    "raw_ast_hash": "<sha256-prefix>"
  }
}
```

**Canonical key:** since multiple call sites may emit identical templates, the entity's canonical name is `<channel>:<format_string_normalized>` (e.g. `broadcast:%s entered the game`). This makes templates addressable and lets the loader dedup duplicates while preserving per-channel distinction.

`channel` values: `broadcast`, `client`, `console`, `system`.

**Expected count:** ~300-500 templates (broadcast: ~50-100, client: ~80-150, console: ~150-250, system: ~20-50).

**Schema:** new entity type `log_template`. New per-version table:

```sql
CREATE TABLE log_template_versions (
  entity_id                INTEGER NOT NULL REFERENCES entities(id),
  version                  TEXT NOT NULL,
  channel                  TEXT NOT NULL CHECK (channel IN ('broadcast','client','console','system')),
  format_string            TEXT NOT NULL,
  format_string_normalized TEXT NOT NULL,
  source_file              TEXT,
  source_line              INTEGER,
  containing_function      TEXT,
  raw_ast_hash             TEXT,
  extracted_at             TEXT NOT NULL,
  source_root              TEXT,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX idx_log_template_versions_source ON log_template_versions(source_file, source_line);
CREATE INDEX idx_log_template_versions_channel ON log_template_versions(channel);
```

### Handler 7: qc_builtins (NEW TYPE)

**Detection patterns:** `pr_builtin` and `pr2_builtin` function-pointer table iteration. This is Pattern 4 (struct-literal table) shape.

**Sample (from `src/pr_cmds.c`):**

```c
builtin_t pr_builtin[] = {
    PF_Fixme,         // 0
    PF_makevectors,   // 1   void(vector ang) makevectors
    PF_setorigin,     // 2   void(entity e, vector o) setorigin
    PF_setmodel,      // 3   void(entity e, string m) setmodel
    ...
};
```

**Detection:** locate the `pr_builtin[]` declaration. Walk the `INIT_LIST_EXPR` children, capturing each entry's:
- Function pointer name (the C function)
- Index in the array (the QC builtin number)
- Trailing comment (often contains the QC signature, e.g., `void(vector ang) makevectors`)

**Output fields:**

```json
{
  "name": "makevectors",
  "ast": {
    "table_name": "pr_builtin",
    "index": 1,
    "handler_fn": "PF_makevectors",
    "qc_signature": "void(vector ang) makevectors",
    "source_file": "src/pr_cmds.c",
    "source_line": 1820,
    "trailing_comment": "void(vector ang) makevectors",
    "raw_ast_hash": "<sha256-prefix>"
  }
}
```

**Canonical name:** the QC-side name (parsed from the trailing comment if present, otherwise derived from the C function name by stripping `PF_` prefix).

**Expected count:** ~100-150 builtins across `pr_builtin` and `pr2_builtin` tables.

**Schema:** new entity type `qc_builtin`. New per-version table:

```sql
CREATE TABLE qc_builtin_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,
  table_name       TEXT NOT NULL,
  builtin_index    INTEGER NOT NULL,
  handler_fn       TEXT NOT NULL,
  qc_signature     TEXT,
  source_file      TEXT,
  source_line      INTEGER,
  trailing_comment TEXT,
  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,
  source_root      TEXT,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX idx_qc_builtin_versions_source ON qc_builtin_versions(source_file, source_line);
```

## Schema migration: v14 -> v15

Single migration adding four new entity types to the `entities` CHECK constraint plus four new per-version tables.

```sql
-- schema.ts migration block

-- 1. Update entities type check
-- (SQLite cannot ALTER CHECK; use the standard rebuild pattern)
CREATE TABLE entities_new (
  id        INTEGER PRIMARY KEY,
  project   TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  type      TEXT NOT NULL CHECK (type IN (
    'cvar','command','macro','cmdline_param','keyname','hud_element',
    'ruleset','token_primitive','asset_category','flag_bit','cvar_alias',
    'protocol_message','info_key','log_template','qc_builtin'
  )),
  name      TEXT NOT NULL,
  source_state TEXT NOT NULL DEFAULT 'source_backed',
  -- ... other existing columns
  UNIQUE(project, type, name)
);

INSERT INTO entities_new SELECT * FROM entities;
DROP TABLE entities;
ALTER TABLE entities_new RENAME TO entities;
-- recreate indexes

-- 2. Add the four new per-version tables (DDL above per handler section)

-- 3. Stamp schema version
PRAGMA user_version = 15;
```

Migration is pure-additive. Existing rows (ezquake, fte, qwcl, mvdsv-cvars/commands, qw maps + game-mechanics) untouched. Pattern matches the v13 -> v14 game-mechanics addition that just shipped 2026-04-27.

## Loader adapters

Four new TypeScript adapters under `apps/qw-oracle/scripts/load-knowledge/`:

```
load-knowledge/
+-- load-protocol.ts          # protocol_message_versions adapter
+-- load-info-keys.ts         # info_key_versions adapter
+-- load-log-templates.ts     # log_template_versions adapter
+-- load-qc-builtins.ts       # qc_builtin_versions adapter
```

Each adapter is ~40-50 lines, mirroring the existing adapters (e.g. `load-cvars.ts`, `load-commands.ts`):

```typescript
// load-protocol.ts shape
export const protocolAdapter: TypeAdapter = {
  type: 'protocol_message',
  isSourceBacked: (entry) => entry.ast !== null,
  buildVersionRow: (entry, ctx) => ({
    entity_id: ctx.entityId,
    version: ctx.version,
    kind: entry.ast.kind,
    value: entry.ast.value,
    value_kind: entry.ast.value_kind,
    source_file: entry.ast.source_file,
    source_line: entry.ast.source_line,
    trailing_comment: entry.ast.trailing_comment,
    raw_ast_hash: entry.ast.raw_ast_hash,
    extracted_at: ctx.extractedAt,
    source_root: ctx.sourceRoot,
  }),
  upsertVersionRow: protocolMessageVersionsUpsert,
};
```

Register all four in `load-version.ts`'s ADAPTERS dict alongside the existing seven.

## Validation strategy

### Runtime validation against Ciscon's dump

**Source:** `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ciscon-1.20-dev-2026-04-27.log` (operator-supplied 2026-04-27, 758 cvars + 107 commands captured from nicotinelounge.com KTX #1).

**Server identity:** MVDSV 1.20-dev built 2026-04-11 (post-1.11, pre-1.21). Closest available production reference for HEAD extraction.

**KTX-progs filter:** before diffing, strip cvars/commands registered by KTX QuakeC (which will not appear in MVDSV C extraction). Filter list at `validation-fixtures/ktx-progs-prefixes.txt`:

```
k_*
_k_*
__k_*
add_q_*
dmm4_*
```

Plus a per-name allowlist for KTX cvars without those prefixes (initially: `dp`, `dq`, `dr`, `extralogname`, `frag_log_type`, `lock_practice`, `srv_practice_mode`, `timing_players_*`, `vip_password`, `vip_values`, `download_map_url`, `password`, `pausable`). Build the allowlist iteratively during validation.

**Procedure** (mirrors EXTRACTOR-PLAYBOOK.md runtime validation steps):

1. Parse `qw-1.log` into `runtime-mvdsv-cvars.txt` and `runtime-mvdsv-commands.txt` after KTX filtering
2. Pull source_backed names from DB:
   ```bash
   sqlite3 apps/qw-oracle/data/knowledge.db \
     "SELECT name FROM entities WHERE project='mvdsv' AND type='cvar' AND source_state='source_backed'" \
     | sort -u > db-mvdsv-cvars.txt
   ```
3. Diff:
   ```bash
   comm -23 runtime-mvdsv-cvars.txt db-mvdsv-cvars.txt   # runtime-only: extractor gaps to investigate
   comm -13 runtime-mvdsv-cvars.txt db-mvdsv-cvars.txt   # DB-only: head delta or platform-specific
   ```
4. Categorize runtime-only entries: Bucket 1 (out of scope), Bucket 2 (Cvar_Create dynamic), Bucket 3 (sprintf-built), or genuine extractor gap
5. Iterate on extractor until residual gap is fully categorized

**Pass criteria:**
- Zero genuine extractor gaps (uncategorized residual = 0)
- All Bucket 2/3 entries documented in `mvdsv/OUT_OF_SCOPE.md`
- Field-accuracy 20-row sample audit: all four fields (default, flags, on_change, trailing_comment) match source for every sampled row

### Compile/build validation

The extractor itself is run via:

```bash
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py \
  --repo-root research/repos/mvdsv \
  --output-dir apps/qw-oracle/scripts/extractors/mvdsv/output \
  --handlers all --workers 12
```

Loader integration via the existing `extract-tag` CLI:

```bash
npm --prefix apps/qw-oracle run load-knowledge -- extract-tag \
  --project mvdsv --version head --ordinal 1
```

`extract-tag` already handles the orchestration: git checkout -> run extractor -> load all type outputs -> stamp version row. No CLI changes needed.

### Quality grid

Add MVDSV probes to `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`. Mirror the existing FTE/ezquake probe families:

- **Regression family**: count assertions (cvar count >= N, command count >= N, protocol_message count >= N), source_backed ratio = 1.0 for all four new types (no doc_only complement for MVDSV), no orphan entity rows after load
- **Anomaly family**: trailing_comment coverage spot checks, log_template channel distribution sanity, qc_builtin index uniqueness within table_name

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Protocol extension flag inventory incomplete; some PEXT-gated cvars missed | Medium | First-pass `grep -rh '#ifdef\|#if defined' src/` enumerates all flags; add to clang_args until runtime validation closes the gap |
| `pr_builtin` table parsing fails on indirect entries (e.g., `#ifdef`-conditional builtins) | Low-Medium | Variant matrix covers Win/Linux conditionals; PARANOID/DEBUG_VM are off so debug-only builtins won't appear; iterate if the runtime validation surfaces gaps |
| Function-banner harvest false positives (banner "description" is just function-name decoration) | Medium | Skip lines matching `^[A-Z][A-Za-z0-9_]+_f$` (function name pattern) and `^[=]+$` (decoration). Empty result is preferable to garbage. |
| Log template volume blows up (>1000 templates) creating noise | Low | Channel-discriminated; consumers filter by channel. Volume is a quality concern only if specific consumer (e.g. validation harness) chokes; revisit then. |
| Info key detection missing call sites due to non-literal second argument | Medium | Mirror the ezQuake `#define`-resolution fallback (Pattern 6); document remaining Bucket 3 entries in OUT_OF_SCOPE.md |
| KTX-progs filter allowlist incomplete; runtime-validation diff produces noisy false positives | High initially | Iteratively build allowlist; classify each "runtime-only" name as MVDSV-real-gap, KTX-prog, or NQ-prog before declaring extractor gap |
| Ciscon's dump captures only one server's runtime profile; some PEXT-disabled servers may surface different cvars | Low | Solicit second dump from Slime (different server) once available; for Phase 2e shipping, Ciscon's dump is the operative reference |
| Schema migration fails on existing DBs | Low | Pure-additive migration; pattern proven from v9->v10->...->v14. Rollback is `PRAGMA user_version = 14` plus DROP TABLE on the four new tables |

## Cleanup and follow-ups

After ship:

1. Update HANDOVER.md: close Phase 2e MVDSV, open Phase 2e-deep-time as next backlog item, advance KTX cvars to next-priority
2. Update `apps/qw-oracle/CLAUDE.md` with MVDSV row counts and Schema v15 status
3. Update `EXTRACTOR-PLAYBOOK.md` with any new patterns surfaced (function-banner harvest, protocol-message handler shape)
4. Build slipgate snapshot: `npm run load-knowledge -- build-snapshot --project mvdsv` -> `apps/slipgate-app/src/lib/config/data/qw-mvdsv.json`
5. Stage Ciscon's dump filename and a per-engine validation README under `validation-fixtures/`
6. Memory: consolidate Phase 2e ship into the existing project memory rather than spawning a new one; update HANDOVER counter

## Cross-references

- Extractor playbook: `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`
- Schema documentation: `apps/qw-oracle/SCHEMA.md`
- ezQuake extraction precedent: `apps/qw-oracle/scripts/extractors/ezquake/`
- FTE extraction precedent: `apps/qw-oracle/scripts/extractors/fte/`
- QWCL extraction precedent: `apps/qw-oracle/scripts/extractors/qwcl/`
- Game-mechanics arc 1 precedent (v13->v14 schema): `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` + `apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts`
- libclang+Visitor reference: `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_libclang_ezquake_extraction.md`
- qw_event_log future validation harness: `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/reference_qw_event_log_parser.md`
- HANDOVER Phase 2e entry: `HANDOVER.md` "Phase 2d-2h: remaining QW knowledge rollout"

## Appendix A: Verified facts captured during brainstorming

- Source size: 60,152 lines across 88 .c/.h files in `research/repos/mvdsv/src/`
- Cmd_AddCommand is the only command-registration API in MVDSV (no Cmd_AddCommandD/Cmd_AddLegacyCommand variants)
- WITH_NQPROGS is NOT defined in `CMakeLists.txt` or `build_cmake.sh`; production binaries do not include it
- WITH_NQPROGS adds exactly one cvar (`sv_forcenqprogs`) when enabled; runtime translation patches NQ progs.dat memory layout to QW format
- Trailing comment coverage on cvars: ~50% based on first-page sample of `src/sv_main.c`
- Function-banner description coverage on commands: estimated 30-50% based on sample of 5 handlers (SV_Kick_f had a description; SV_Snap_f, SV_Restart_f, SV_Logfile_f had banner-only; SV_Map_f had no comment block)
- Existing schema verified: `cvar_versions` already has `source_file`, `source_line`, `trailing_comment` columns plus index on `(source_file, source_line)`. Same shape across `command_versions`, `cmdline_param_versions`, `macro_versions`. Router-via-source-location is the existing design.
- ezQuake at head: 2733/2899 cvars source-backed (94.3%), the remainder being doc_only orphans from help-JSON without source registrations
- FTE at build-6698: 2482/2482 cvars source-backed (100%), no help-JSON
- QWCL at 2.33: 187 cvars (~100% source-backed, no help-JSON)
- MVDSV will match FTE/QWCL pattern: no help-JSON, 100% of rows source-backed
- Ciscon's runtime dump captures 758/758 cvars and 107/107 commands at MVDSV 1.20-dev built 2026-04-11
- KTX-progs cvars in the dump: ~570 with `k_*`/`_k_*`/`__k_*`/`add_q_*` prefixes
- MVDSV-engine cvar candidates after KTX filter: ~178, matching the playbook's "189 cvars" estimate
