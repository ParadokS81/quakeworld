# MVDSV Layer 1 Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract MVDSV's seven Layer 1 entity types (cvars, commands, cmdline_params, protocol_messages, info_keys, log_templates, qc_builtins) at HEAD into qw-oracle's knowledge.db, matching the structure used by the existing ezQuake/FTE/QWCL ports, and validate against Ciscon's production-server cvarlist+cmdlist dump.

**Architecture:** Python+libclang AST extractor with three-variant TU dispatch (server-base / server+Win / server+Linux), each variant carrying FTE_PEXT_/MVD_PEXT1_ extensions enabled and NQPROGS off. Engine-private handlers under `apps/qw-oracle/scripts/extractors/mvdsv/_handler_*.py`, shared `walk_tu_dispatch` from `extractor_lib`. Schema v15 adds four new entity types. TypeScript loader gets four new adapters. Runtime validation diffs the extracted DB against Ciscon's dump after a KTX-progs prefix filter.

**Tech Stack:** Python 3.12, libclang 18, multiprocessing (12 workers), TypeScript 5 + Bun, better-sqlite3, SQLite (schema v15).

**Spec:** `docs/superpowers/specs/2026-04-27-mvdsv-extraction-design.md`

**Reference precedents:**
- `apps/qw-oracle/scripts/extractors/ezquake/extract.py` (canonical driver + shared handlers)
- `apps/qw-oracle/scripts/extractors/fte/extract.py` (engine-private handler convention `_handler_*.py`)
- `apps/qw-oracle/scripts/extractors/qwcl/` (smaller-scope cross-codebase port)
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` (8 patterns + 4 buckets)

---

## Phase A: Foundation

### Task 1: First-pass MVDSV inventory

Capture verified facts about MVDSV's registration APIs and preprocessor flags before writing handlers. The handler-specific patterns and clang_args list depend on this inventory.

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/notes-pass-1.md`
- Read-only: `research/repos/mvdsv/src/`

- [ ] **Step 1: Inventory cvar registration APIs**

```bash
cd /home/paradoks/projects/quakeworld/research/repos/mvdsv
grep -rhEo 'Cvar_[A-Za-z]+' src --include='*.c' --include='*.h' | sort -u > /tmp/mvdsv-cvar-apis.txt
cat /tmp/mvdsv-cvar-apis.txt
```

Capture each API as static (extractable: `Cvar_Register`) or dynamic (out of static reach: `Cvar_Create`, `Cvar_Find`, etc).

- [ ] **Step 2: Inventory command registration APIs**

```bash
grep -rhEo 'Cmd_Add[A-Za-z]*' src --include='*.c' --include='*.h' | sort -u > /tmp/mvdsv-cmd-apis.txt
cat /tmp/mvdsv-cmd-apis.txt
```

Expected: `Cmd_AddCommand` only (verified during brainstorming; confirm).

- [ ] **Step 3: Inventory preprocessor guards**

```bash
grep -rhE '^\s*#if(def)?\s+\w+|^\s*#if\s+defined' src --include='*.c' --include='*.h' \
  | grep -oE '\b[A-Z_][A-Z0-9_]{4,}\b' | sort | uniq -c | sort -rn > /tmp/mvdsv-guards.txt
head -60 /tmp/mvdsv-guards.txt
```

For each high-frequency flag, decide: ON (production), OFF (debug/dev), variant-specific (Win/Linux/etc).

- [ ] **Step 4: Inventory broadcast/log/info-key/qc-builtin call sites**

```bash
grep -rhEo 'SV_Broadcast[A-Za-z]+|SV_Client[A-Za-z]*Printf' src --include='*.c' | sort -u > /tmp/mvdsv-broadcast-apis.txt
grep -rhEo 'Info_[A-Za-z]+' src --include='*.c' --include='*.h' | sort -u > /tmp/mvdsv-info-apis.txt
grep -rE 'pr_builtin|pr2_builtin' src --include='*.c' --include='*.h' | head -20 > /tmp/mvdsv-builtin-tables.txt
cat /tmp/mvdsv-broadcast-apis.txt /tmp/mvdsv-info-apis.txt /tmp/mvdsv-builtin-tables.txt
```

Note exact spellings and argument shapes (which arg is the literal string, which is the channel/scope).

- [ ] **Step 5: Sample protocol-constant declarations**

```bash
grep -rn '^#define\s\+svc_\|^#define\s\+clc_\|^#define\s\+MVD_PEXT\|^#define\s\+FTE_PEXT\|^#define\s\+PROTOCOL_VERSION' src --include='*.h' | head -40
```

Note the value-kind variations (integer literal, bit-shift, hex).

- [ ] **Step 6: Write `notes-pass-1.md` capturing the inventory**

Create `apps/qw-oracle/scripts/extractors/mvdsv/notes-pass-1.md` with five sections corresponding to steps 1-5. Each section lists what was found, decisions taken, and any surprises that would alter handler design.

Required content shape:

```markdown
# MVDSV Pass 1 Inventory (2026-04-27)

## Registration APIs
- Cvar registration (static): `Cvar_Register` -- N call sites
- Cvar dynamic (Bucket 2, out of scope): `Cvar_Create`, `Cvar_Find`, `Cvar_FindOrCreate`
- Command registration: `Cmd_AddCommand` only (no D/legacy variants)
- Broadcast log: `SV_BroadcastPrintf`, `SV_BroadcastTPrintf` (count + sample)
- Per-client log: `SV_ClientPrintf`, `SV_ClientTPrintf` (count + sample)
- Console log: `Con_Printf` (count + sample)
- System log: `Sys_Printf` (count + sample)
- Info APIs: `Info_ValueForKey`, `Info_SetValueForKey`, `Info_RemoveKey` (count each)
- QC builtins: `pr_builtin[]` declared at `src/<file>:<line>`, `pr2_builtin[]` at ...

## Preprocessor flags (decisions)
| Flag | Decision | Rationale |
|---|---|---|
| SERVERONLY | Always ON | MVDSV is server-only |
| _WIN32 / _MSC_VER | Win variant | |
| __linux__ | Linux variant | |
| FTE_PEXT_FLOATCOORDS | ON | Production protocol extension |
| FTE_PEXT_TRANS | ON | |
| ... | | |
| WITH_NQPROGS | OFF | Not in production binary |
| DEBUG_VM, PARANOID, MVD_PEXT1_DEBUG | OFF | Developer-only |
| WITH_FTE_VFS | TBD | Decide based on default in CMakeLists |

## Confirmed PEXT inventory (full list to define in clang_config)
- FTE_PEXT_FLOATCOORDS, FTE_PEXT_TRANS, FTE_PEXT_CSQC, FTE_PEXT_COLOURMOD,
  FTE_PEXT_CHUNKEDDOWNLOADS
- FTE_PEXT2_VOICECHAT
- MVD_PEXT1_SERVERSIDEWEAPON, MVD_PEXT1_HIDDEN_MESSAGES
- PROTOCOL_VERSION_FTE, PROTOCOL_VERSION_FTE2, PROTOCOL_VERSION_MVD1
- (Add any newly-discovered flags from step 3.)

## QC builtin tables
- `pr_builtin[]` -- declared at src/pr_cmds.c:<line>; ~N entries
- `pr2_builtin[]` -- declared at src/pr2_cmds.c:<line>; ~M entries
- Trailing comments format: `void(vector ang) makevectors` style

## Surprises / open questions
- (List anything that changes the spec's handler design.)
```

- [ ] **Step 7: Commit pass-1 inventory**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/notes-pass-1.md
git commit -m "docs(qw-oracle): MVDSV Phase 2e pass-1 inventory of registration APIs and preprocessor flags"
```

---

### Task 2: Schema v15 migration

Add four new entity types and four per-version tables. Bump schema version to 15. Pure-additive table creation; entity CHECK constraint rebuild via the v12 pattern.

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/schema.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/types.ts:9` (EntityType union)

- [ ] **Step 1: Bump SCHEMA_VERSION constant**

In `apps/qw-oracle/scripts/load-knowledge/schema.ts:8`, change:

```typescript
export const SCHEMA_VERSION = 14;
```

to:

```typescript
export const SCHEMA_VERSION = 15;
```

- [ ] **Step 2: Update v1 SCHEMA_V1_SQL `entities` CHECK comment**

The header comment at `schema.ts:41-46` mentions `ENTITIES_V2/V3/V5_MIGRATION_SQL` - update to also mention `ENTITIES_V12/V15` for future readers. Replace the comment block with:

```typescript
-- The entities.type CHECK lists the full v15 type set (not just v1's four)
-- because applySchema stamps SCHEMA_VERSION directly on fresh DBs and skips
-- the migration chain. Migrated DBs rebuild this table via
-- ENTITIES_V2/V3/V5/V12/V15_MIGRATION_SQL, so the widened v1 CHECK is harmless
-- for them and correct for fresh ones. Keep this list in sync with
-- ENTITIES_V15_MIGRATION_SQL (and any future ENTITIES_V*_MIGRATION_SQL).
```

- [ ] **Step 3: Widen v1 entities.type CHECK to include four new types**

In `schema.ts:50-54` change:

```typescript
type                  TEXT NOT NULL CHECK (type IN (
                        'cvar','command','macro','cmdline_param',
                        'keyname','hud_element','ruleset','token_primitive',
                        'asset_category','flag_bit','cvar_alias'
                      )),
```

to:

```typescript
type                  TEXT NOT NULL CHECK (type IN (
                        'cvar','command','macro','cmdline_param',
                        'keyname','hud_element','ruleset','token_primitive',
                        'asset_category','flag_bit','cvar_alias',
                        'protocol_message','info_key','log_template','qc_builtin'
                      )),
```

- [ ] **Step 4: Add ENTITIES_V15_MIGRATION_SQL constant**

After the `ENTITIES_V12_MIGRATION_SQL` block in `schema.ts` (around line 1170), add:

```typescript
const ENTITIES_V15_MIGRATION_SQL = `
CREATE TABLE entities_v15 (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive',
                          'asset_category','flag_bit','cvar_alias',
                          'protocol_message','info_key','log_template','qc_builtin'
                        )),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities_v15(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
INSERT INTO entities_v15 SELECT * FROM entities;
DROP TABLE entities;
ALTER TABLE entities_v15 RENAME TO entities;
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(project, type);
`;
```

- [ ] **Step 5: Add SCHEMA_V15_ADDITIONS_SQL with four new per-version tables**

After the `SCHEMA_V14_ADDITIONS_SQL` block in `schema.ts`, add:

```typescript
const SCHEMA_V15_ADDITIONS_SQL = `
-- Phase 2e MVDSV: protocol_messages, info_keys, log_templates, qc_builtins.
-- Pure-additive per-version tables; the entities.type CHECK widening lives in
-- ENTITIES_V15_MIGRATION_SQL above.

CREATE TABLE IF NOT EXISTS protocol_message_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,
  kind             TEXT NOT NULL CHECK (kind IN ('svc','clc','nq','pext_fte','pext_mvd','protocol_version')),
  value            TEXT,
  value_kind       TEXT,
  source_file      TEXT,
  source_line      INTEGER,
  trailing_comment TEXT,
  raw_ast_hash     TEXT,
  source_root      TEXT,
  extracted_at     TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_protocol_message_versions_source ON protocol_message_versions(source_file, source_line);

CREATE TABLE IF NOT EXISTS info_key_versions (
  entity_id           INTEGER NOT NULL REFERENCES entities(id),
  version             TEXT NOT NULL,
  scope               TEXT NOT NULL CHECK (scope IN ('userinfo','serverinfo','localinfo')),
  operations          TEXT,
  source_file         TEXT,
  source_line         INTEGER,
  containing_function TEXT,
  call_sites_json     TEXT,
  raw_ast_hash        TEXT,
  source_root         TEXT,
  extracted_at        TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_info_key_versions_source ON info_key_versions(source_file, source_line);

CREATE TABLE IF NOT EXISTS log_template_versions (
  entity_id                INTEGER NOT NULL REFERENCES entities(id),
  version                  TEXT NOT NULL,
  channel                  TEXT NOT NULL CHECK (channel IN ('broadcast','client','console','system')),
  format_string            TEXT NOT NULL,
  format_string_normalized TEXT NOT NULL,
  source_file              TEXT,
  source_line              INTEGER,
  containing_function      TEXT,
  raw_ast_hash             TEXT,
  source_root              TEXT,
  extracted_at             TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_log_template_versions_source ON log_template_versions(source_file, source_line);
CREATE INDEX IF NOT EXISTS idx_log_template_versions_channel ON log_template_versions(channel);

CREATE TABLE IF NOT EXISTS qc_builtin_versions (
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
  source_root      TEXT,
  extracted_at     TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_qc_builtin_versions_source ON qc_builtin_versions(source_file, source_line);
`;
```

- [ ] **Step 6: Add migrateV14ToV15 function**

After the `migrateV13ToV14` function in `schema.ts`, add:

```typescript
function migrateV14ToV15(db: Database.Database): void {
  // Like v11->v12, the entities-table CHECK widening requires foreign_keys
  // OFF outside the transaction so the entities DROP can succeed (every
  // per-type version table FK-references entities.id).
  db.pragma('foreign_keys = OFF');
  try {
    const txn = db.transaction(() => {
      db.exec(`
        DROP INDEX IF EXISTS idx_entities_name;
        DROP INDEX IF EXISTS idx_entities_type;
      `);
      db.exec(ENTITIES_V15_MIGRATION_SQL);
      db.exec(SCHEMA_V15_ADDITIONS_SQL);
      db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('15');
    });
    txn();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}
```

- [ ] **Step 7: Wire migrateV14ToV15 into applySchema chain**

In `schema.ts` near the end of `applySchema` (after the `existingVersion === 13 && SCHEMA_VERSION >= 14` block), add:

```typescript
    if (existingVersion === 14 && SCHEMA_VERSION >= 15) {
      migrateV14ToV15(db);
      existingVersion = 15;
    }
```

- [ ] **Step 8: Add SCHEMA_V15_ADDITIONS_SQL to idempotent-additions block**

At the end of `applySchema` where the comment reads `// v2 / v3 / v4 / v5 / v6 / v12 / v13 / v14 additions are idempotent...`, update the comment and add the v15 exec:

```typescript
  // v2 / v3 / v4 / v5 / v6 / v12 / v13 / v14 / v15 additions are idempotent
  // CREATE IF NOT EXISTS -- safe on fresh DBs (where v1 SQL didn't have them)
  // and on migrated DBs.
  db.exec(SCHEMA_V2_ADDITIONS_SQL);
  db.exec(SCHEMA_V3_ADDITIONS_SQL);
  db.exec(SCHEMA_V4_ADDITIONS_SQL);
  db.exec(SCHEMA_V5_ADDITIONS_SQL);
  db.exec(SCHEMA_V6_ADDITIONS_SQL);
  db.exec(SCHEMA_V12_ADDITIONS_SQL);
  db.exec(SCHEMA_V13_ADDITIONS_SQL);
  db.exec(SCHEMA_V14_ADDITIONS_SQL);
  db.exec(SCHEMA_V15_ADDITIONS_SQL);
```

- [ ] **Step 9: Update EntityType union in types.ts**

In `apps/qw-oracle/scripts/load-knowledge/types.ts:9`, find the existing `EntityType` union (likely a TS string-literal union) and add the four new types:

```typescript
export type EntityType =
  | 'cvar'
  | 'command'
  | 'macro'
  | 'cmdline_param'
  | 'keyname'
  | 'hud_element'
  | 'ruleset'
  | 'token_primitive'
  | 'asset_category'
  | 'flag_bit'
  | 'cvar_alias'
  | 'protocol_message'
  | 'info_key'
  | 'log_template'
  | 'qc_builtin';
```

Read the existing definition first to preserve any inline comments or formatting.

- [ ] **Step 10: Run typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
bunx tsc --noEmit
```

Expected: PASS. ADAPTERS dict in `load-version.ts` is `Record<EntityType, TypeAdapter>` so adding to EntityType will surface a missing-keys error - that's expected and gets fixed in Tasks 13-16. For now, make ADAPTERS non-exhaustive temporarily by changing its type to `Partial<Record<EntityType, TypeAdapter>>`:

In `load-version.ts:149` change:

```typescript
const ADAPTERS: Record<EntityType, TypeAdapter> = {
```

to:

```typescript
const ADAPTERS: Partial<Record<EntityType, TypeAdapter>> = {
```

We will revert this `Partial` back to `Record` in Task 16 once all four new adapters are registered.

Re-run `bunx tsc --noEmit`. Expected: PASS now.

- [ ] **Step 11: Verify schema applies cleanly on a temporary DB**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
rm -f /tmp/test-v15.db
bunx tsx -e "
import Database from 'better-sqlite3';
import { applySchema } from './scripts/load-knowledge/schema';
const db = new Database('/tmp/test-v15.db');
applySchema(db);
const v = db.prepare(\"SELECT value FROM schema_meta WHERE key='schema_version'\").get() as any;
console.log('schema_version:', v.value);
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_versions' ORDER BY name\").all();
console.log('per-version tables:', tables.map((t: any) => t.name).join(', '));
"
```

Expected output includes `schema_version: 15` and the four new tables `protocol_message_versions, info_key_versions, log_template_versions, qc_builtin_versions` in the listing.

If the script complains about `tsx -e` and relative paths, write a temp file `/tmp/verify-v15.ts` with the same content and run `bunx tsx /tmp/verify-v15.ts` instead (per the qw-oracle toolchain memory).

- [ ] **Step 12: Verify schema applies cleanly when migrating from v14**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
cp data/knowledge.db /tmp/v14-backup.db
bunx tsx -e "
import Database from 'better-sqlite3';
import { applySchema } from './scripts/load-knowledge/schema';
const db = new Database('/tmp/v14-backup.db');
const before = db.prepare(\"SELECT value FROM schema_meta WHERE key='schema_version'\").get() as any;
console.log('before:', before.value);
applySchema(db);
const after = db.prepare(\"SELECT value FROM schema_meta WHERE key='schema_version'\").get() as any;
console.log('after:', after.value);
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_versions' ORDER BY name\").all();
console.log('per-version tables:', tables.map((t: any) => t.name).join(', '));
const ezq = db.prepare(\"SELECT COUNT(*) AS n FROM entities WHERE project='ezquake'\").get() as any;
console.log('ezquake entities preserved:', ezq.n);
"
```

Expected: before=14, after=15, four new tables present, ezquake entity count preserved.

- [ ] **Step 13: Commit schema v15 migration**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/schema.ts apps/qw-oracle/scripts/load-knowledge/types.ts apps/qw-oracle/scripts/load-knowledge/load-version.ts
git commit -m "feat(qw-oracle): schema v15 adds protocol_message + info_key + log_template + qc_builtin entity types

Pure-additive migration from v14: widens entities.type CHECK to include four
new server-side entity types and creates four corresponding per-version tables
(protocol_message_versions, info_key_versions, log_template_versions,
qc_builtin_versions). Reuses the v11->v12 entities-rebuild pattern. ADAPTERS
dict in load-version.ts marked Partial pending Tasks 13-16 wiring."
```

---

### Task 3: Update SCHEMA.md documentation

The qw-oracle CLAUDE.md mandates that schema changes update SCHEMA.md alongside the migration. v15 adds four entity types - document them.

**Files:**
- Modify: `apps/qw-oracle/SCHEMA.md`

- [ ] **Step 1: Read current SCHEMA.md to understand format**

```bash
head -100 /home/paradoks/projects/quakeworld/apps/qw-oracle/SCHEMA.md
```

- [ ] **Step 2: Add a "v15 (2026-04-27): MVDSV server-side entity types" section**

Append a new section to `SCHEMA.md` documenting:
- Entity type additions: `protocol_message`, `info_key`, `log_template`, `qc_builtin`
- Per-version table schemas (copy from `SCHEMA_V15_ADDITIONS_SQL`)
- Discriminator value enums for each (kind, scope, channel)
- The relationship to MVDSV Phase 2e and the validation oracle arc

Format should match how v14 was documented (find the v14 section as a reference).

- [ ] **Step 3: Commit SCHEMA.md update**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/SCHEMA.md
git commit -m "docs(qw-oracle): SCHEMA.md v15 documents protocol_message + info_key + log_template + qc_builtin"
```

---

### Task 4: clang_config additions for MVDSV

Add three clang_args functions to the shared extractor library: server-base (production protocol-extension surface), server+Win, server+Linux.

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py`

- [ ] **Step 1: Read current clang_config.py to understand existing functions**

```bash
head -100 /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py
```

Identify the existing function shapes for ezQuake (`clang_args_for`, `clang_args_server_for`, `clang_args_win_for`, `clang_args_apple_for`) and FTE (`clang_args_fte_for`, `clang_args_fte_server_for`, etc).

- [ ] **Step 2: Verify qwprot submodule is initialized**

Task 1 surfaced that `research/repos/mvdsv/src/qwprot/` is a git submodule that must be initialized before extraction so `protocol.h` (containing `svc_*`/`clc_*`/`FTE_PEXT_*`/`MVD_PEXT1_*`/`PROTOCOL_VERSION_FTE*` definitions) can be resolved by clang via `-I src/qwprot/src`. The controller already initialized it after Task 1 returned; this step verifies:

```bash
ls /home/paradoks/projects/quakeworld/research/repos/mvdsv/src/qwprot/src/protocol.h
```

Expected: file exists. If missing, run `cd /home/paradoks/projects/quakeworld/research/repos/mvdsv && git submodule update --init src/qwprot` to initialize.

- [ ] **Step 3: Add MVDSV functions**

At the bottom of `clang_config.py`, add. The flag list below is sourced from Task 1's `notes-pass-1.md` -- it reflects MVDSV's CMakeLists.txt `target_compile_definitions` plus an `-I src/qwprot/src` for protocol extension constants (defined as bit-shift values in `protocol.h`, not via -D).

```python
# ----------------------------------------------------------------------------
# MVDSV (apps/qw-oracle/scripts/extractors/mvdsv/) -- Phase 2e
# Server-only QuakeWorld engine. SERVERONLY is always defined; no
# client/server toggle within MVDSV itself. Three variants: server-base,
# server+Win, server+Linux. CMakeLists.txt-driven flags ON;
# NQPROGS / PARANOID / DEBUG_VM / MVD_PEXT1_DEBUG / experimental flags OFF.
# Protocol-extension bit-shift values (FTE_PEXT_*, MVD_PEXT1_*,
# PROTOCOL_VERSION_FTE*) come from src/qwprot/src/protocol.h via -I, not
# from explicit -D defines.
# ----------------------------------------------------------------------------

_MVDSV_CMAKE_DEFINES: list[str] = [
    # Sourced from research/repos/mvdsv/CMakeLists.txt:169-186
    "-DSERVERONLY",
    "-DUSE_PR2",
    "-DMVD_PEXT1_SERVERSIDEWEAPON",
    "-DMVD_PEXT1_SERVERSIDEWEAPON2",
    "-DFTE_PEXT2_VOICECHAT",
    "-DWWW_INTEGRATION",
]


def _mvdsv_qwprot_include(mvdsv_src_dir: str) -> list[str]:
    """Include path for the qwprot submodule providing protocol.h."""
    qwprot = str(Path(mvdsv_src_dir) / "qwprot" / "src")
    return ["-I", qwprot]


def clang_args_mvdsv_for(mvdsv_src_dir: str) -> list[str]:
    """Server-base variant: SERVERONLY + CMakeLists flags + protocol.h via -I."""
    return [
        "-x", "c",
        "-I", mvdsv_src_dir,
        *_mvdsv_qwprot_include(mvdsv_src_dir),
        *_MVDSV_CMAKE_DEFINES,
    ]


def clang_args_mvdsv_win_for(mvdsv_src_dir: str) -> list[str]:
    """Server+Win variant: server-base plus Windows platform flags. Reuses
    the ezQuake stub Windows SDK headers under research/stubs/windows-sdk/.
    """
    repo_root = _repo_root_from(mvdsv_src_dir)
    stubs_dir = str(Path(repo_root) / "research/stubs/windows-sdk")
    return clang_args_mvdsv_for(mvdsv_src_dir) + [
        "-D_WIN32",
        "-D_MSC_VER=1900",
        "-I", stubs_dir,
    ]


def clang_args_mvdsv_linux_for(mvdsv_src_dir: str) -> list[str]:
    """Server+Linux variant: server-base plus Linux platform flags."""
    return clang_args_mvdsv_for(mvdsv_src_dir) + [
        "-D__linux__",
        "-D__unix__",
    ]
```

If `_repo_root_from` does not already exist in the file, search ezQuake / FTE callers for how they derive the stub-headers path and replicate the same pattern. If a different idiom is used (e.g., the stubs dir is passed via a separate argument to the function), match that idiom instead.

- [ ] **Step 3: Verify the module still imports**

```bash
cd /home/paradoks/projects/quakeworld
python3 -c "
import sys
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors')
from extractor_lib.clang_config import (
    clang_args_mvdsv_for,
    clang_args_mvdsv_win_for,
    clang_args_mvdsv_linux_for,
)
print(clang_args_mvdsv_for('/tmp/x')[:5])
print(clang_args_mvdsv_linux_for('/tmp/x')[-2:])
"
```

Expected output shows the new functions importable and returning lists with the expected contents.

- [ ] **Step 4: Commit clang_config additions**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py
git commit -m "feat(qw-oracle): clang_config adds MVDSV server-base/win/linux variants"
```

---

### Task 5: Driver skeleton

Create the MVDSV extraction driver. Initial version dispatches no handlers (handlers added in Tasks 6-12); proves the multiprocessing + variant-matrix pipeline works.

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/extract.py`
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/output/.gitkeep`

- [ ] **Step 1: Create the output directory placeholder**

```bash
cd /home/paradoks/projects/quakeworld
mkdir -p apps/qw-oracle/scripts/extractors/mvdsv/output
touch apps/qw-oracle/scripts/extractors/mvdsv/output/.gitkeep
```

- [ ] **Step 2: Write the driver skeleton**

Create `apps/qw-oracle/scripts/extractors/mvdsv/extract.py`:

```python
#!/usr/bin/env python3
"""MVDSV Layer 1 AST extraction driver.

Walks src/*.c under three variants (server-base/server+win/server+linux) per
file, dispatching to per-type handlers. Mirrors the FTE driver's chunked-pool
shape; differs in: single source root (no plugin tree), all variants dispatch
as variant="server" (MVDSV is always server-only).

Architecture:
  - Per-handler setup() runs once in the parent (before Pool fork).
  - multiprocessing.Pool (fork mode) over pre-chunked task lists.
  - Inside each worker: iterates its chunk; per file does 3 TU parses (one
    per variant), dispatched through walk_tu_dispatch with variant="server".
  - --workers 1 falls back to serial loop for debugging.

Usage:
    python3 extract.py \\
        --repo-root research/repos/mvdsv \\
        --output-dir apps/qw-oracle/scripts/extractors/mvdsv/output \\
        --handlers all \\
        --workers 12
"""
from __future__ import annotations

import argparse
import json
import multiprocessing as mp
import os
import sys
import time
from pathlib import Path

from clang.cindex import Config, Index

Config.set_library_file("libclang-18.so.1")

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))

from extractor_lib.clang_config import (  # noqa: E402
    PARSE_OPTS,
    clang_args_mvdsv_for,
    clang_args_mvdsv_win_for,
    clang_args_mvdsv_linux_for,
)
from extractor_lib._visitor import walk_tu_dispatch  # noqa: E402

REPO_ROOT_DEFAULT = HERE.parent.parent.parent.parent.parent
MVDSV_REPO_DEFAULT = REPO_ROOT_DEFAULT / "research/repos/mvdsv"
OUTPUT_DIR_DEFAULT = HERE / "output"

VARIANT_FUNCS = [
    ("server", clang_args_mvdsv_for),
    ("server", clang_args_mvdsv_win_for),
    ("server", clang_args_mvdsv_linux_for),
]


def collect_handlers(names: str = "all") -> dict:
    """Lazy import handlers -- added one by one across Tasks 6-12.
    Returns dict[name, handler_instance] for the requested names (or all).
    """
    available: dict = {}
    # Tasks 6-12 will register handlers here as they ship.
    if names == "all":
        return available
    requested = {n.strip() for n in names.split(",") if n.strip()}
    return {k: v for k, v in available.items() if k in requested}


def _list_source_files(mvdsv_src: Path) -> list[Path]:
    """Return all .c files under src/ at the top level (no recursion into
    subdirs except qwprot if present)."""
    files = sorted(mvdsv_src.glob("*.c"))
    return files


def _process_one_file(
    source_file: Path,
    mvdsv_src: Path,
    handlers: list,
) -> dict[str, list]:
    """Parse + dispatch all variants for a single source file. Returns
    {handler_name: [rows]}.
    """
    if not handlers:
        return {}

    src_str = str(mvdsv_src)
    source_bytes = source_file.read_bytes()
    target_path_str = str(source_file)

    for h in handlers:
        h.start_file(target_path_str, source_bytes)

    index = Index.create()
    for variant_name, args_func in VARIANT_FUNCS:
        try:
            tu = index.parse(target_path_str, args=args_func(src_str), options=PARSE_OPTS)
        except Exception as exc:  # noqa: BLE001
            print(f"[mvdsv] parse failed {target_path_str} variant={variant_name}: {exc}", file=sys.stderr)
            continue
        walk_tu_dispatch(tu, handlers, variant_name, target_path_str)

    out: dict[str, list] = {}
    for h in handlers:
        out[h.name] = h.end_file()
    return out


def _worker_init(mvdsv_src_str: str) -> None:
    global _WORKER_MVDSV_SRC
    _WORKER_MVDSV_SRC = Path(mvdsv_src_str)


def _worker_process_chunk(file_paths: list[str]) -> dict[str, list]:
    """Process a chunk of files and return aggregated rows by handler name."""
    handlers = list(collect_handlers("all").values())
    aggregated: dict[str, list] = {h.name: [] for h in handlers}
    for fp_str in file_paths:
        per_file = _process_one_file(Path(fp_str), _WORKER_MVDSV_SRC, handlers)
        for name, rows in per_file.items():
            aggregated[name].extend(rows)
    return aggregated


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--repo-root", default=str(MVDSV_REPO_DEFAULT))
    p.add_argument("--output-dir", default=str(OUTPUT_DIR_DEFAULT))
    p.add_argument("--handlers", default="all")
    p.add_argument("--workers", type=int, default=12)
    args = p.parse_args()

    mvdsv_repo = Path(args.repo_root).resolve()
    mvdsv_src = mvdsv_repo / "src"
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    files = _list_source_files(mvdsv_src)
    print(f"[mvdsv] {len(files)} .c files under {mvdsv_src}")

    handlers = list(collect_handlers(args.handlers).values())
    if not handlers:
        print("[mvdsv] no handlers registered yet (Tasks 6-12 will add them)")
        return 0

    for h in handlers:
        h.setup(mvdsv_repo, mvdsv_src)

    t0 = time.time()
    chunk_size = max(1, len(files) // (args.workers * 2))
    chunks = [files[i:i+chunk_size] for i in range(0, len(files), chunk_size)]
    chunks_str = [[str(p) for p in c] for c in chunks]

    if args.workers == 1:
        results = []
        _WORKER_MVDSV_SRC_local = mvdsv_src  # noqa: F841
        global _WORKER_MVDSV_SRC
        _WORKER_MVDSV_SRC = mvdsv_src
        for chunk in chunks_str:
            results.append(_worker_process_chunk(chunk))
    else:
        ctx = mp.get_context("fork")
        with ctx.Pool(args.workers, initializer=_worker_init, initargs=(str(mvdsv_src),)) as pool:
            results = pool.map(_worker_process_chunk, chunks_str, chunksize=1)

    aggregated: dict[str, list] = {h.name: [] for h in handlers}
    for chunk_result in results:
        for name, rows in chunk_result.items():
            aggregated.setdefault(name, []).extend(rows)

    elapsed = time.time() - t0
    print(f"[mvdsv] extraction in {elapsed:.1f}s")

    for h in handlers:
        rows = aggregated.get(h.name, [])
        out_dict = h.finalize(rows, mvdsv_repo)
        out_path = output_dir / h.output_filename
        out_path.write_text(json.dumps(out_dict, indent=2, sort_keys=True))
        n = len(out_dict.get(getattr(h, "payload_field", h.name), []))
        print(f"[mvdsv] wrote {n} rows -> {out_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: Verify the driver runs (no handlers wired yet)**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 1
```

Expected output: `[mvdsv] 88 .c files under .../mvdsv/src` followed by `[mvdsv] no handlers registered yet (Tasks 6-12 will add them)`.

- [ ] **Step 4: Commit driver skeleton**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/extract.py apps/qw-oracle/scripts/extractors/mvdsv/output/.gitkeep
git commit -m "feat(qw-oracle): MVDSV extraction driver skeleton"
```

---

## Phase B: Per-handler implementation

Each handler task follows the same shape:
1. Read the relevant FTE/ezQuake handler as a template
2. Write the engine-private handler at `apps/qw-oracle/scripts/extractors/mvdsv/_handler_<type>.py`
3. Wire it into `extract.py`'s `collect_handlers`
4. Run extract.py and inspect the JSON output
5. Sanity-check row counts against expectations
6. Commit

The shared `Visitor` base class lives at `apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py`. Required overrides per handler: `name` (handler-local key), `output_filename` (the *-ast.json file), `setup`, `start_file`, `visit_cursor` (and optionally `enter_function`/`enter_compound`), `end_file`, `finalize`.

### Task 6: Cvars handler

**Files:**
- Read-only template: `apps/qw-oracle/scripts/extractors/extractor_lib/handler_cvars.py` (ezQuake-canonical), `apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py` (FTE adaptations)
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_cvars.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/extract.py:collect_handlers`

- [ ] **Step 1: Read both template handlers**

```bash
wc -l /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/extractor_lib/handler_cvars.py /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py
sed -n '1,80p' /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/extractor_lib/handler_cvars.py
```

Note Pattern 1 detection: `VAR_DECL` with type `cvar_t` and `INIT_LIST_EXPR` child whose first field is the name string literal. Trailing-comment harvest from source bytes.

- [ ] **Step 2: Write the MVDSV cvars handler**

Create `apps/qw-oracle/scripts/extractors/mvdsv/_handler_cvars.py`:

```python
"""Cvars handler for the MVDSV AST extractor.

Detects literal `cvar_t` struct-init declarations (Pattern 1):

    cvar_t  sv_mintic = {"sv_mintic", "0.013"};
    cvar_t  sv_maxfps = {"maxfps", "77", CVAR_SERVERINFO};
    static cvar_t sys_select_timeout = {"sys_select_timeout", "10000", 0, OnChange_sysselecttimeout_var};

MVDSV does NOT use macro-style registrations (FTE-style CVARD/CVARFD), so the
detection path is the simpler ezQuake variant of Pattern 1. No nested-struct
container types observed in MVDSV (verified Pass 1); if any surface during
runtime validation the playbook's Pattern 3 is the recipe.

Per-file dedup on cvar name applied across all 3 variants (server-base / win
/ linux all dispatch as variant="server"); cross-file (across all .c files)
dedup is first-wins by name in finalize().
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


def _read_extent(source_bytes: bytes, extent) -> str:
    """Return the source text for an AST extent."""
    if not extent or not extent.start or not extent.end:
        return ""
    return source_bytes[extent.start.offset:extent.end.offset].decode("utf-8", errors="replace")


def _trailing_comment(source_bytes: bytes, line: int) -> Optional[str]:
    """Find a trailing `// ...` or `/* ... */` comment on the same line as
    `line` in source_bytes, or NULL if absent. Multi-line trailing comments
    that continue on subsequent lines are joined with single spaces.
    """
    lines = source_bytes.decode("utf-8", errors="replace").splitlines()
    if line - 1 >= len(lines):
        return None
    raw = lines[line - 1]
    idx = raw.find("//")
    if idx >= 0:
        comment = raw[idx + 2:].strip()
        # Multi-line continuation: subsequent lines that are pure // comment
        # without code, indented to align with the trailing.
        i = line
        while i < len(lines):
            nxt = lines[i].strip()
            if nxt.startswith("//"):
                comment += " " + nxt[2:].strip()
                i += 1
            else:
                break
        return comment or None
    # /* ... */ trailing block.
    bidx = raw.find("/*")
    if bidx >= 0:
        e = raw.find("*/", bidx + 2)
        if e >= 0:
            return raw[bidx + 2:e].strip() or None
    return None


def _is_cvar_t_decl(cursor) -> bool:
    if cursor.kind != CursorKind.VAR_DECL:
        return False
    type_spelling = cursor.type.spelling.replace("const", "").strip()
    return type_spelling == "cvar_t" or type_spelling.startswith("cvar_t ")


class CvarsMvdsvHandler(Visitor):
    name = "cvars"
    output_filename = "mvdsv-variables-ast.json"
    payload_field = "variables"

    def setup(self, repo_root: Path, src_root: Path) -> None:
        self._repo_root = repo_root
        self._src_root = src_root

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._src_path = source_path
        self._src_bytes = source_bytes
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if not _is_cvar_t_decl(cursor):
            return
        # Find the INIT_LIST_EXPR child.
        init_list = None
        for child in cursor.get_children():
            if child.kind == CursorKind.INIT_LIST_EXPR:
                init_list = child
                break
        if init_list is None:
            return

        fields = list(init_list.get_children())
        if not fields:
            return

        name = self._extract_string_literal(fields[0])
        if not name:
            return
        if name in self._seen_in_file:
            return

        default_value = self._extract_string_literal(fields[1]) if len(fields) > 1 else None
        flags_raw = _read_extent(self._src_bytes, fields[2].extent) if len(fields) > 2 else None
        on_change = _read_extent(self._src_bytes, fields[3].extent) if len(fields) > 3 else None

        flag_names = self._parse_flag_names(flags_raw)
        location = cursor.location
        storage_class = "static" if "static " in _read_extent(self._src_bytes, cursor.extent)[:30] else None
        trailing = _trailing_comment(self._src_bytes, location.line)
        rel_file = self._relative_source(location.file.name)

        self._rows.append({
            "name": name,
            "ast": {
                "default_value": default_value,
                "flags_raw": flags_raw,
                "flag_names": flag_names,
                "on_change": on_change,
                "source_file": rel_file,
                "source_line": location.line,
                "source_column": location.column,
                "storage_class": storage_class,
                "trailing_comment": trailing,
            }
        })
        self._seen_in_file.add(name)

    def _extract_string_literal(self, cursor) -> Optional[str]:
        """Return the string-literal text without quotes, or None."""
        text = _read_extent(self._src_bytes, cursor.extent).strip()
        if text.startswith('"') and text.endswith('"'):
            return text[1:-1]
        return None

    def _parse_flag_names(self, flags_raw: Optional[str]) -> list[str]:
        if not flags_raw:
            return []
        names: list[str] = []
        for token in flags_raw.replace("(", " ").replace(")", " ").split("|"):
            t = token.strip()
            if t.startswith("CVAR_") and t.replace("_", "").isalnum():
                names.append(t)
        return names

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).relative_to(self._repo_root))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        return self._rows

    def finalize(self, all_rows: list[dict], repo_root: Path) -> dict:
        # First-wins dedup by canonical name across all files.
        seen: set[str] = set()
        unique: list[dict] = []
        for r in all_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)
        unique.sort(key=lambda r: r["name"])
        return {
            "variables": unique,
            "_stats": {"count": len(unique)},
        }
```

- [ ] **Step 3: Wire handler into driver**

In `apps/qw-oracle/scripts/extractors/mvdsv/extract.py`, modify `collect_handlers`:

```python
def collect_handlers(names: str = "all") -> dict:
    """Lazy import handlers -- added one by one across Tasks 6-12.
    Returns dict[name, handler_instance] for the requested names (or all).
    """
    from _handler_cvars import CvarsMvdsvHandler
    available: dict = {
        "cvars": CvarsMvdsvHandler(),
    }
    if names == "all":
        return available
    requested = {n.strip() for n in names.split(",") if n.strip()}
    return {k: v for k, v in available.items() if k in requested}
```

- [ ] **Step 4: Run extraction**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12
```

Expected: ~88 files processed in <30s, output `mvdsv-variables-ast.json` with ~150-200 rows.

- [ ] **Step 5: Sanity-check JSON output**

```bash
cd /home/paradoks/projects/quakeworld
jq '._stats, .variables[0:3]' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-variables-ast.json
jq '.variables | length' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-variables-ast.json
jq '.variables[] | select(.name == "sv_maxfps")' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-variables-ast.json
```

Expected:
- Count between 150-220
- `sv_maxfps` present with `default_value: "77"` and a `trailing_comment` mentioning `maxpps`
- `sv_mintic`, `sv_maxtic`, `developer`, `timeout` all present

- [ ] **Step 6: Commit cvars handler**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/_handler_cvars.py apps/qw-oracle/scripts/extractors/mvdsv/extract.py apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-variables-ast.json
git commit -m "feat(qw-oracle): MVDSV cvars handler (Pattern 1 literal cvar_t struct-init)"
```

---

### Task 7: Commands handler with banner-description harvest

**Files:**
- Read-only template: `apps/qw-oracle/scripts/extractors/extractor_lib/handler_commands.py`, `apps/qw-oracle/scripts/extractors/fte/_handler_commands.py`
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_commands.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/extract.py:collect_handlers`

- [ ] **Step 1: Read template handlers**

```bash
sed -n '1,120p' /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/extractor_lib/handler_commands.py
```

Identify the `Cmd_AddCommand` call-site detection. MVDSV uses Cmd_AddCommand only - no `Cmd_AddCommandD` / `Cmd_AddLegacyCommand` variants per Task 1's inventory.

- [ ] **Step 2: Write the MVDSV commands handler**

Create `apps/qw-oracle/scripts/extractors/mvdsv/_handler_commands.py`:

```python
"""Commands handler for the MVDSV AST extractor.

Detects `Cmd_AddCommand("name", Function_f)` call sites. MVDSV does NOT use
the `Cmd_AddCommandD` (description-bearing) or `Cmd_AddLegacyCommand` API
variants found in ezQuake/FTE.

NEW SUB-PATTERN: function-banner description harvest. For each registered
handler function, walk back from the function's definition cursor to the
immediately preceding comment block and parse the banner:

    /*
    ==================
    SV_Kick_f
     
    Kick a user off of the server
    ==================
    */
    void SV_Kick_f (void) ...

Lines matching `^[A-Za-z_][A-Za-z0-9_]*$` (function name) and `^[=]+$`
(decoration) are skipped; remaining text lines are joined with single spaces
and emitted as `description`. ~30-50% of MVDSV commands have descriptions.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


_DECORATION_RE = re.compile(r"^[=\-]+$")
_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _read_extent(source_bytes: bytes, extent) -> str:
    if not extent or not extent.start or not extent.end:
        return ""
    return source_bytes[extent.start.offset:extent.end.offset].decode("utf-8", errors="replace")


def _function_banner(source_bytes: bytes, fn_def_offset: int) -> Optional[str]:
    """Walk back from fn_def_offset to the immediately preceding `/* ... */`
    block and parse it. Return the description text or None.
    """
    text = source_bytes.decode("utf-8", errors="replace")
    # Find the most recent `*/` before fn_def_offset.
    end_idx = text.rfind("*/", 0, fn_def_offset)
    if end_idx < 0:
        return None
    # The comment block must be visually adjacent to the function definition
    # (only whitespace between).
    between = text[end_idx + 2:fn_def_offset]
    if between.strip():
        return None
    start_idx = text.rfind("/*", 0, end_idx)
    if start_idx < 0:
        return None
    block = text[start_idx + 2:end_idx]
    description_lines: list[str] = []
    for raw in block.splitlines():
        s = raw.strip()
        if not s:
            continue
        if _DECORATION_RE.match(s):
            continue
        if _IDENT_RE.match(s) and s.endswith("_f"):
            # function name
            continue
        description_lines.append(s)
    if not description_lines:
        return None
    return " ".join(description_lines).strip() or None


def _function_definition_cursor(tu, fn_name: str):
    """Find the FUNCTION_DECL cursor with the given name in the TU. Returns
    the *definition* (not just declaration) so we can get the source location
    of the implementation.
    """
    # Linear search; MVDSV has 88 files, function count is small per file.
    for cursor in tu.cursor.walk_preorder():
        if cursor.kind == CursorKind.FUNCTION_DECL and cursor.spelling == fn_name and cursor.is_definition():
            return cursor
    return None


class CommandsMvdsvHandler(Visitor):
    name = "commands"
    output_filename = "mvdsv-commands-ast.json"
    payload_field = "commands"

    def setup(self, repo_root: Path, src_root: Path) -> None:
        self._repo_root = repo_root
        self._src_root = src_root
        # Map of function-name -> source-byte offset. Populated as we walk.
        self._fn_def_offsets: dict[str, tuple[str, int, bytes, int]] = {}
        # rows accumulated globally with handler_fn names; banner harvest
        # happens in finalize after all files are walked.
        self._rows: list[dict] = []
        self._seen_names: set[str] = set()

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._src_path = source_path
        self._src_bytes = source_bytes
        self._file_rows: list[dict] = []
        self._seen_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        # Track function definitions for banner harvest.
        if cursor.kind == CursorKind.FUNCTION_DECL and cursor.is_definition():
            fn_name = cursor.spelling
            if fn_name and cursor.location.file:
                self._fn_def_offsets[fn_name] = (
                    cursor.location.file.name,
                    cursor.location.line,
                    self._src_bytes,
                    cursor.extent.start.offset,
                )

        # Detect Cmd_AddCommand call sites.
        if cursor.kind != CursorKind.CALL_EXPR or cursor.spelling != "Cmd_AddCommand":
            return
        args = list(cursor.get_arguments())
        if len(args) < 2:
            return
        name = self._extract_string_literal(args[0])
        if not name or name in self._seen_in_file:
            return
        handler_fn_text = _read_extent(self._src_bytes, args[1].extent).strip()
        # Strip & prefix if present.
        if handler_fn_text.startswith("&"):
            handler_fn_text = handler_fn_text[1:]

        location = cursor.location
        rel_file = self._relative_source(location.file.name)
        self._file_rows.append({
            "name": name,
            "ast": {
                "handler_fn": handler_fn_text,
                "source_file": rel_file,
                "source_line": location.line,
            }
        })
        self._seen_in_file.add(name)

    def _extract_string_literal(self, cursor) -> Optional[str]:
        text = _read_extent(self._src_bytes, cursor.extent).strip()
        if text.startswith('"') and text.endswith('"'):
            return text[1:-1]
        return None

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).relative_to(self._repo_root))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        # Append file-local rows to global, dedup by canonical name first-wins.
        for r in self._file_rows:
            if r["name"] in self._seen_names:
                continue
            self._seen_names.add(r["name"])
            self._rows.append(r)
        return []  # all rows accumulated globally; nothing to flush per file

    def finalize(self, all_rows: list[dict], repo_root: Path) -> dict:
        # all_rows from end_file is empty; rows live on self._rows.
        for r in self._rows:
            handler_fn = r["ast"]["handler_fn"]
            entry = self._fn_def_offsets.get(handler_fn)
            if entry is None:
                r["ast"]["description"] = None
                continue
            _file, _line, src_bytes, def_offset = entry
            r["ast"]["description"] = _function_banner(src_bytes, def_offset)
        self._rows.sort(key=lambda r: r["name"])
        return {
            "commands": self._rows,
            "_stats": {
                "count": len(self._rows),
                "with_description": sum(1 for r in self._rows if r["ast"].get("description")),
            },
        }
```

- [ ] **Step 3: Wire commands handler into driver**

In `apps/qw-oracle/scripts/extractors/mvdsv/extract.py`'s `collect_handlers`, add:

```python
    from _handler_commands import CommandsMvdsvHandler
    available["commands"] = CommandsMvdsvHandler()
```

- [ ] **Step 4: Run extraction**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12 --handlers commands
```

Expected: ~107 commands extracted; `_stats.with_description` between 30 and 60.

- [ ] **Step 5: Sanity-check**

```bash
jq '._stats' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-commands-ast.json
jq '.commands[] | select(.name == "kick")' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-commands-ast.json
jq '.commands[] | select(.name == "status")' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-commands-ast.json
```

Expected: `kick` has description "Kick a user off of the server"; `status` has handler_fn `SV_Status_f`.

- [ ] **Step 6: Commit commands handler**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/_handler_commands.py apps/qw-oracle/scripts/extractors/mvdsv/extract.py apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-commands-ast.json
git commit -m "feat(qw-oracle): MVDSV commands handler with function-banner description harvest"
```

---

### Task 8: Cmdline params handler

**Files:**
- Read-only template: `apps/qw-oracle/scripts/extractors/extractor_lib/handler_cmdline.py`
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_cmdline.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/extract.py:collect_handlers`

- [ ] **Step 1: Read template**

```bash
sed -n '1,80p' /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/extractor_lib/handler_cmdline.py
```

Pattern: detect `COM_CheckParm("-paramname")` call sites, extract first arg as the param name.

- [ ] **Step 2: Write MVDSV cmdline handler**

Create `apps/qw-oracle/scripts/extractors/mvdsv/_handler_cmdline.py`. Mirror the ezQuake handler with the engine-private import path adjustment. Detection logic:

```python
"""Cmdline params handler for the MVDSV AST extractor.

Detects `COM_CheckParm("-foo")` call sites. Same Pattern as ezQuake; copied
shape to keep MVDSV's handlers self-contained.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


def _read_extent(source_bytes: bytes, extent) -> str:
    if not extent or not extent.start or not extent.end:
        return ""
    return source_bytes[extent.start.offset:extent.end.offset].decode("utf-8", errors="replace")


class CmdlineMvdsvHandler(Visitor):
    name = "cmdline"
    output_filename = "mvdsv-cmdline-params-ast.json"
    payload_field = "cmdline_params"

    def setup(self, repo_root: Path, src_root: Path) -> None:
        self._repo_root = repo_root

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._src_bytes = source_bytes
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "<anon>")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR or cursor.spelling != "COM_CheckParm":
            return
        args = list(cursor.get_arguments())
        if not args:
            return
        text = _read_extent(self._src_bytes, args[0].extent).strip()
        if not (text.startswith('"') and text.endswith('"')):
            return
        name = text[1:-1]
        if name in self._seen_in_file:
            return
        location = cursor.location
        rel_file = self._relative_source(location.file.name)
        containing_fn = self._func_stack[-1] if self._func_stack else None
        self._rows.append({
            "name": name,
            "ast": {
                "source_file": rel_file,
                "source_line": location.line,
                "containing_function": containing_fn,
            }
        })
        self._seen_in_file.add(name)

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).relative_to(self._repo_root))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        return self._rows

    def finalize(self, all_rows: list[dict], repo_root: Path) -> dict:
        seen: set[str] = set()
        unique: list[dict] = []
        for r in all_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)
        unique.sort(key=lambda r: r["name"])
        return {
            "cmdline_params": unique,
            "_stats": {"count": len(unique)},
        }
```

- [ ] **Step 3: Wire into driver**

In `extract.py`'s `collect_handlers`:

```python
    from _handler_cmdline import CmdlineMvdsvHandler
    available["cmdline"] = CmdlineMvdsvHandler()
```

- [ ] **Step 4: Run + sanity-check**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12 --handlers cmdline
jq '._stats, .cmdline_params[0:5]' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-cmdline-params-ast.json
```

Expected: 30-50 cmdline params. Common ones: `-port`, `-ip`, `-game`, `-heapsize`.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/_handler_cmdline.py apps/qw-oracle/scripts/extractors/mvdsv/extract.py apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-cmdline-params-ast.json
git commit -m "feat(qw-oracle): MVDSV cmdline params handler (COM_CheckParm)"
```

---

### Task 9: Protocol messages handler (NEW TYPE)

Detects `#define` constants for `svc_*` (server-to-client), `clc_*` (client-to-server), protocol-version constants, and PEXT bit flags.

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_protocol.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/extract.py:collect_handlers`

- [ ] **Step 1: Sample protocol constants from source**

```bash
grep -n '^#define\s\+svc_\|^#define\s\+clc_\|^#define\s\+nq_\|^#define\s\+MVD_PEXT\|^#define\s\+FTE_PEXT\|^#define\s\+PROTOCOL_VERSION' \
  /home/paradoks/projects/quakeworld/research/repos/mvdsv/src/*.h | head -30
```

Note the regex shapes. Each capture: name, value (integer literal or `(1<<N)` bit-shift or hex), trailing comment.

- [ ] **Step 2: Write protocol handler**

Create `apps/qw-oracle/scripts/extractors/mvdsv/_handler_protocol.py`:

```python
"""Protocol messages handler for the MVDSV AST extractor.

Detects #define constants for protocol-message bytes and protocol-version
constants. libclang under PARSE_DETAILED_PROCESSING_RECORD exposes
MACRO_DEFINITION cursors; we filter by name prefix to one of:

  - 'svc_'                -> kind='svc'   (server-to-client message)
  - 'clc_'                -> kind='clc'   (client-to-server message)
  - 'nq_'                 -> kind='nq'    (NQ-protocol legacy constant)
  - 'FTE_PEXT_'           -> kind='pext_fte'
  - 'FTE_PEXT2_'          -> kind='pext_fte'
  - 'MVD_PEXT'            -> kind='pext_mvd'
  - 'PROTOCOL_VERSION'    -> kind='protocol_version'

Value extraction: read the macro tokens after the name and emit the raw text
plus a value_kind discriminator ('integer', 'bitshift', 'hex', 'expression').

Trailing comment harvest: same `_trailing_comment` helper used by cvars.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


_INTEGER_RE = re.compile(r"^-?\d+$")
_HEX_RE = re.compile(r"^0[xX][0-9a-fA-F]+$")
_BITSHIFT_RE = re.compile(r"^\(?\s*1\s*<<\s*\d+\s*\)?$")


def _kind_for(name: str) -> Optional[str]:
    if name.startswith("svc_"):
        return "svc"
    if name.startswith("clc_"):
        return "clc"
    if name.startswith("nq_"):
        return "nq"
    if name.startswith("FTE_PEXT_") or name.startswith("FTE_PEXT2_"):
        return "pext_fte"
    if name.startswith("MVD_PEXT"):
        return "pext_mvd"
    if name.startswith("PROTOCOL_VERSION"):
        return "protocol_version"
    return None


def _classify_value(raw: str) -> str:
    s = raw.strip()
    if _INTEGER_RE.match(s):
        return "integer"
    if _HEX_RE.match(s):
        return "hex"
    if _BITSHIFT_RE.match(s.replace(" ", "")):
        return "bitshift"
    return "expression"


def _trailing_comment(source_bytes: bytes, line: int) -> Optional[str]:
    lines = source_bytes.decode("utf-8", errors="replace").splitlines()
    if line - 1 >= len(lines):
        return None
    raw = lines[line - 1]
    idx = raw.find("//")
    if idx >= 0:
        return raw[idx + 2:].strip() or None
    bidx = raw.find("/*")
    if bidx >= 0:
        e = raw.find("*/", bidx + 2)
        if e >= 0:
            return raw[bidx + 2:e].strip() or None
    return None


class ProtocolMvdsvHandler(Visitor):
    name = "protocol"
    output_filename = "mvdsv-protocol-messages-ast.json"
    payload_field = "protocol_messages"

    def setup(self, repo_root: Path, src_root: Path) -> None:
        self._repo_root = repo_root

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._src_bytes = source_bytes
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.MACRO_DEFINITION:
            return
        name = cursor.spelling
        if not name:
            return
        kind = _kind_for(name)
        if kind is None:
            return
        if name in self._seen_in_file:
            return
        # Read the macro body: tokens after the name spelling.
        tokens = list(cursor.get_tokens())
        # First token is the macro name; remaining are body tokens.
        body_tokens = [t.spelling for t in tokens[1:]]
        value_raw = " ".join(body_tokens).strip() if body_tokens else None
        value_kind = _classify_value(value_raw) if value_raw else None
        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        trailing = _trailing_comment(self._src_bytes, location.line)
        self._rows.append({
            "name": name,
            "ast": {
                "kind": kind,
                "value": value_raw,
                "value_kind": value_kind,
                "source_file": rel_file,
                "source_line": location.line,
                "trailing_comment": trailing,
            }
        })
        self._seen_in_file.add(name)

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).relative_to(self._repo_root))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        return self._rows

    def finalize(self, all_rows: list[dict], repo_root: Path) -> dict:
        seen: set[str] = set()
        unique: list[dict] = []
        for r in all_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)
        unique.sort(key=lambda r: (r["ast"]["kind"], r["name"]))
        kinds_count: dict[str, int] = {}
        for r in unique:
            k = r["ast"]["kind"]
            kinds_count[k] = kinds_count.get(k, 0) + 1
        return {
            "protocol_messages": unique,
            "_stats": {
                "count": len(unique),
                "by_kind": kinds_count,
            },
        }
```

- [ ] **Step 3: Wire into driver**

```python
    from _handler_protocol import ProtocolMvdsvHandler
    available["protocol"] = ProtocolMvdsvHandler()
```

- [ ] **Step 4: Run + sanity-check**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12 --handlers protocol
jq '._stats' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-protocol-messages-ast.json
jq '.protocol_messages[] | select(.name == "svc_print" or .name == "svc_damage")' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-protocol-messages-ast.json
```

Expected: 40-100 protocol messages, mix of svc/clc/pext_fte/pext_mvd/protocol_version kinds. `svc_print` should appear with value `8`.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/_handler_protocol.py apps/qw-oracle/scripts/extractors/mvdsv/extract.py apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-protocol-messages-ast.json
git commit -m "feat(qw-oracle): MVDSV protocol_messages handler (svc/clc/pext/protocol_version)"
```

---

### Task 10: Info keys handler (NEW TYPE)

Detects `Info_ValueForKey`, `Info_SetValueForKey`, `Info_RemoveKey` call sites with literal-string second argument.

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_info_keys.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/extract.py:collect_handlers`

- [ ] **Step 1: Verify Info APIs and call sites**

```bash
grep -rn "Info_ValueForKey\|Info_SetValueForKey\|Info_RemoveKey" /home/paradoks/projects/quakeworld/research/repos/mvdsv/src --include='*.c' | head -20
```

Confirm the second-argument shape (literal string) and which expressions appear as the first argument (`cl->userinfo`, `svs.info`, `localinfo`).

- [ ] **Step 2: Write info_keys handler**

Create `apps/qw-oracle/scripts/extractors/mvdsv/_handler_info_keys.py`:

```python
"""Info keys handler for the MVDSV AST extractor.

Detects userinfo/serverinfo/localinfo string-key call sites:

  Info_ValueForKey(cl->userinfo, "team")        -> scope='userinfo', op='read'
  Info_SetValueForKey(svs.info, "maxclients", ...) -> scope='serverinfo', op='write'
  Info_RemoveKey(localinfo, "foo")              -> scope='localinfo', op='remove'

Detection: CALL_EXPR with spelling matching one of the three APIs, second
argument a string literal. The first-argument expression is matched textually
against known shapes to discriminate scope.

Per-key call sites are accumulated; canonical entity is by name + scope but
keys are universally case-sensitive in MVDSV (the `*team` key starts with
asterisk and is distinct from `team`). Operations across call sites are
unioned.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


_API_OP_MAP = {
    # Read APIs (Task 1 verified Info_Get is the dominant MVDSV-local wrapper, 62 sites)
    "Info_ValueForKey":         "read",
    "Info_Get":                 "read",
    # Write APIs
    "Info_SetValueForKey":      "write",
    "Info_SetValueForStarKey":  "write",
    "Info_SetStar":             "write",
    "Info_Set":                 "write",
    # Remove APIs
    "Info_RemoveKey":           "remove",
    "Info_Remove":              "remove",
}


def _read_extent(source_bytes: bytes, extent) -> str:
    if not extent or not extent.start or not extent.end:
        return ""
    return source_bytes[extent.start.offset:extent.end.offset].decode("utf-8", errors="replace")


def _classify_scope(first_arg_text: str) -> Optional[str]:
    """Map first-argument expression to scope. Heuristic, source-based."""
    s = first_arg_text.strip()
    if "userinfo" in s:
        return "userinfo"
    if "svs.info" in s or "serverinfo" in s:
        return "serverinfo"
    if "localinfo" in s:
        return "localinfo"
    return None


class InfoKeysMvdsvHandler(Visitor):
    name = "info_keys"
    output_filename = "mvdsv-info-keys-ast.json"
    payload_field = "info_keys"

    def setup(self, repo_root: Path, src_root: Path) -> None:
        self._repo_root = repo_root
        self._aggregated: dict[tuple[str, str], dict] = {}

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._src_bytes = source_bytes
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "<anon>")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        spelling = cursor.spelling
        if spelling not in _API_OP_MAP:
            return
        args = list(cursor.get_arguments())
        if len(args) < 2:
            return
        first_text = _read_extent(self._src_bytes, args[0].extent)
        scope = _classify_scope(first_text)
        if scope is None:
            return
        second_text = _read_extent(self._src_bytes, args[1].extent).strip()
        if not (second_text.startswith('"') and second_text.endswith('"')):
            return
        key_name = second_text[1:-1]
        if not key_name:
            return
        op = _API_OP_MAP[spelling]
        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        containing_fn = self._func_stack[-1] if self._func_stack else None

        agg_key = (key_name, scope)
        existing = self._aggregated.get(agg_key)
        site = {
            "source_file": rel_file,
            "source_line": location.line,
            "operation": op,
        }
        if existing is None:
            self._aggregated[agg_key] = {
                "name": key_name,
                "ast": {
                    "scope": scope,
                    "operations": [op],
                    "source_file": rel_file,
                    "source_line": location.line,
                    "containing_function": containing_fn,
                    "all_call_sites": [site],
                },
            }
        else:
            ops = existing["ast"]["operations"]
            if op not in ops:
                ops.append(op)
            existing["ast"]["all_call_sites"].append(site)

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).relative_to(self._repo_root))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        return []  # rows live in self._aggregated; emitted only at finalize

    def finalize(self, all_rows: list[dict], repo_root: Path) -> dict:
        rows = list(self._aggregated.values())
        rows.sort(key=lambda r: (r["ast"]["scope"], r["name"]))
        for r in rows:
            r["ast"]["operations"].sort()
        scope_count: dict[str, int] = {}
        for r in rows:
            sc = r["ast"]["scope"]
            scope_count[sc] = scope_count.get(sc, 0) + 1
        return {
            "info_keys": rows,
            "_stats": {
                "count": len(rows),
                "by_scope": scope_count,
            },
        }
```

- [ ] **Step 3: Wire into driver**

```python
    from _handler_info_keys import InfoKeysMvdsvHandler
    available["info_keys"] = InfoKeysMvdsvHandler()
```

- [ ] **Step 4: Run + sanity-check**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12 --handlers info_keys
jq '._stats' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-info-keys-ast.json
jq '.info_keys[] | select(.name == "team" or .name == "*spectator" or .name == "maxclients")' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-info-keys-ast.json
```

Expected: 30-50 keys split across the three scopes; `team` and `*spectator` should be userinfo-scope read.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/_handler_info_keys.py apps/qw-oracle/scripts/extractors/mvdsv/extract.py apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-info-keys-ast.json
git commit -m "feat(qw-oracle): MVDSV info_keys handler (Info_ValueForKey/SetValueForKey/RemoveKey)"
```

---

### Task 11: Log templates handler (NEW TYPE, channel-discriminated)

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/extract.py:collect_handlers`

- [ ] **Step 1: Sample broadcast/log call sites**

```bash
grep -rn "SV_BroadcastPrintf\|SV_BroadcastTPrintf\|SV_ClientPrintf\|SV_ClientTPrintf" /home/paradoks/projects/quakeworld/research/repos/mvdsv/src --include='*.c' | head -10
grep -rn "Con_Printf\|Sys_Printf" /home/paradoks/projects/quakeworld/research/repos/mvdsv/src --include='*.c' | head -10
```

Note: `SV_BroadcastPrintf(level, "fmt", ...)` has the format string at arg index 1, while `Con_Printf("fmt", ...)` has it at arg index 0. The handler must dispatch per API name.

- [ ] **Step 2: Write log_templates handler**

Create `apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py`:

```python
"""Log templates handler for the MVDSV AST extractor.

Detects format-string call sites for server-side log emission:

  channel='broadcast' -> SV_BroadcastPrintf(level, "fmt", ...)
                       SV_BroadcastTPrintf(level, "fmt", ...)
  channel='client'   -> SV_ClientPrintf(cl, level, "fmt", ...)
                       SV_ClientTPrintf(cl, level, "fmt", ...)
  channel='console'  -> Con_Printf("fmt", ...)
  channel='system'   -> Sys_Printf("fmt", ...)

Canonical entity name: '<channel>:<format_string_normalized>' to keep
identical templates from different channels distinct. format_string_normalized
strips the trailing newline so 'broadcast:%s entered the game' matches
regardless of \\n.

Per-call-site rows are deduped by canonical name (first-wins by source
location).
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


# Format-string argument index per API. Task 1 verified that
# SV_BroadcastTPrintf and SV_ClientTPrintf do NOT exist in MVDSV
# (the spec assumed them from ezQuake -- they are absent here).
_CHANNEL_TABLE: dict[str, tuple[str, int]] = {
    # broadcast: sent to all clients
    "SV_BroadcastPrintf":   ("broadcast", 1),  # (level, fmt, ...)
    "SV_BroadcastPrintfEx": ("broadcast", 2),  # (level, flags, fmt, ...)
    "SV_BroadcastCommand":  ("broadcast", 0),  # (fmt, ...)
    # client: sent to one client
    "SV_ClientPrintf":      ("client", 2),     # (cl, level, fmt, ...)
    # console + system: server-side log
    "Con_Printf":           ("console", 0),
    "Sys_Printf":           ("system", 0),
}


def _read_extent(source_bytes: bytes, extent) -> str:
    if not extent or not extent.start or not extent.end:
        return ""
    return source_bytes[extent.start.offset:extent.end.offset].decode("utf-8", errors="replace")


def _normalize_format(s: str) -> str:
    return s.rstrip("\n").strip()


class LogTemplatesMvdsvHandler(Visitor):
    name = "log_templates"
    output_filename = "mvdsv-log-templates-ast.json"
    payload_field = "log_templates"

    def setup(self, repo_root: Path, src_root: Path) -> None:
        self._repo_root = repo_root

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._src_bytes = source_bytes
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "<anon>")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        spelling = cursor.spelling
        cfg = _CHANNEL_TABLE.get(spelling)
        if cfg is None:
            return
        channel, fmt_idx = cfg
        args = list(cursor.get_arguments())
        if len(args) <= fmt_idx:
            return
        text = _read_extent(self._src_bytes, args[fmt_idx].extent).strip()
        if not (text.startswith('"') and text.endswith('"')):
            return
        # Strip outer quotes; do not unescape -- keep the raw form.
        format_string = text[1:-1]
        if not format_string:
            return
        normalized = _normalize_format(format_string)
        canonical = f"{channel}:{normalized}"
        if canonical in self._seen_in_file:
            return
        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        containing_fn = self._func_stack[-1] if self._func_stack else None
        self._rows.append({
            "name": canonical,
            "ast": {
                "channel": channel,
                "format_string": format_string,
                "format_string_normalized": normalized,
                "source_file": rel_file,
                "source_line": location.line,
                "containing_function": containing_fn,
            }
        })
        self._seen_in_file.add(canonical)

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).relative_to(self._repo_root))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        return self._rows

    def finalize(self, all_rows: list[dict], repo_root: Path) -> dict:
        seen: set[str] = set()
        unique: list[dict] = []
        for r in all_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)
        unique.sort(key=lambda r: (r["ast"]["channel"], r["name"]))
        ch_count: dict[str, int] = {}
        for r in unique:
            ch = r["ast"]["channel"]
            ch_count[ch] = ch_count.get(ch, 0) + 1
        return {
            "log_templates": unique,
            "_stats": {
                "count": len(unique),
                "by_channel": ch_count,
            },
        }
```

- [ ] **Step 3: Wire into driver**

```python
    from _handler_log_templates import LogTemplatesMvdsvHandler
    available["log_templates"] = LogTemplatesMvdsvHandler()
```

- [ ] **Step 4: Run + sanity-check**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12 --handlers log_templates
jq '._stats' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-log-templates-ast.json
jq '.log_templates[] | select(.ast.channel == "broadcast") | .name' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-log-templates-ast.json | head -20
```

Expected: 200-500 templates total, distributed across the four channels (broadcast: 50-100, client: 80-150, console: 100-250, system: 20-50).

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py apps/qw-oracle/scripts/extractors/mvdsv/extract.py apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-log-templates-ast.json
git commit -m "feat(qw-oracle): MVDSV log_templates handler (broadcast/client/console/system channels)"
```

---

### Task 12: QC builtins handler (NEW TYPE)

Iterates `pr_builtin[]` and `pr2_builtin[]` function-pointer tables, extracting each entry's index, C handler name, and trailing comment (often the QC signature).

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_qc_builtins.py`
- Modify: `apps/qw-oracle/scripts/extractors/mvdsv/extract.py:collect_handlers`

- [ ] **Step 1: Locate and inspect the builtin tables**

```bash
grep -n "pr_builtin\[\]\|pr2_builtin\[\]\|builtin_t pr_builtin\|builtin_t pr2_builtin" /home/paradoks/projects/quakeworld/research/repos/mvdsv/src/*.c
```

Identify the file and starting line for each table, then sample the first 20 entries:

```bash
# Replace path/line with the actual location:
sed -n '<line>,<line+30>p' /home/paradoks/projects/quakeworld/research/repos/mvdsv/src/pr_cmds.c
```

Confirm the structure: each entry is a function-pointer reference (`PF_makevectors,`) optionally followed by a `// void(vector ang) makevectors` style trailing comment.

- [ ] **Step 2: Write qc_builtins handler**

Create `apps/qw-oracle/scripts/extractors/mvdsv/_handler_qc_builtins.py`:

```python
"""QC builtins handler for the MVDSV AST extractor.

Detects MVDSV's two builtin tables and emits one row per entry. Task 1 verified
the actual table layout (the spec's pr2_builtin[] assumption was wrong):

  - `std_builtins[]` at src/pr_cmds.c:2682 -- 83 entries, index = builtin number,
    PF_Fixme fills unused slots
  - `ext_builtins[]` at src/pr_cmds.c:2779 -- sparse {int num, func} pairs,
    24 entries at non-contiguous numbers (#60-#62, #84-#86, #90-#91, ...)
  - PR2 system uses `ext_syscalls[]` at src/pr2_cmds.c:70 -- string-keyed
    extension dispatch, qualitatively different. Captured opportunistically
    if encountered; not the primary target.

Pattern shapes:
  std_builtins: VAR_DECL with type `builtin_t[]` and INIT_LIST_EXPR. Each
                child is a UNARY_OPERATOR(&)/DECL_REF_EXPR pointing at the
                handler function. Index = position in the array.
  ext_builtins: VAR_DECL with type `apifunc_t[]`/`std_func_t[]` and
                INIT_LIST_EXPR of struct-init pairs. First field = index
                literal, second field = function reference.

Canonical entity name: parsed from trailing comment if present (QC name --
the identifier after the close-paren in `void(vector ang) makevectors = #1`
style comments), otherwise the C handler name with PF_/PR2_ prefix stripped.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


_BUILTIN_TABLE_TYPES = {"builtin_t[]", "builtin_t [N]"}
_PREFIX_STRIP_RE = re.compile(r"^(PF_|PR2_)")
_QC_NAME_RE = re.compile(r"\)\s*(\w+)\s*$|\b(\w+)\s*=")


def _read_extent(source_bytes: bytes, extent) -> str:
    if not extent or not extent.start or not extent.end:
        return ""
    return source_bytes[extent.start.offset:extent.end.offset].decode("utf-8", errors="replace")


def _trailing_comment_at_line(source_bytes: bytes, line: int) -> Optional[str]:
    lines = source_bytes.decode("utf-8", errors="replace").splitlines()
    if line - 1 >= len(lines):
        return None
    raw = lines[line - 1]
    idx = raw.find("//")
    if idx >= 0:
        return raw[idx + 2:].strip() or None
    bidx = raw.find("/*")
    if bidx >= 0:
        e = raw.find("*/", bidx + 2)
        if e >= 0:
            return raw[bidx + 2:e].strip() or None
    return None


def _qc_name_from_comment(comment: Optional[str]) -> Optional[str]:
    if not comment:
        return None
    # Pattern: "void(vector ang) makevectors" -> "makevectors"
    m = re.search(r"\)\s+(\w+)\s*$", comment)
    if m:
        return m.group(1)
    # Pattern: "= setorigin(...) ..." -> "setorigin"
    m = re.search(r"=\s+(\w+)", comment)
    if m:
        return m.group(1)
    return None


def _is_builtin_table_decl(cursor) -> bool:
    if cursor.kind != CursorKind.VAR_DECL:
        return False
    spelling = cursor.spelling
    # Task 1 verified the actual table names in MVDSV.
    if spelling not in {"std_builtins", "ext_builtins", "ext_syscalls"}:
        return False
    return True


class QcBuiltinsMvdsvHandler(Visitor):
    name = "qc_builtins"
    output_filename = "mvdsv-qc-builtins-ast.json"
    payload_field = "qc_builtins"

    def setup(self, repo_root: Path, src_root: Path) -> None:
        self._repo_root = repo_root

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._src_bytes = source_bytes
        self._rows: list[dict] = []

    def visit_cursor(self, cursor, variant: str) -> None:
        if not _is_builtin_table_decl(cursor):
            return
        table_name = cursor.spelling
        # Find the INIT_LIST_EXPR child.
        init_list = None
        for child in cursor.get_children():
            if child.kind == CursorKind.INIT_LIST_EXPR:
                init_list = child
                break
        if init_list is None:
            return

        for index, entry in enumerate(init_list.get_children()):
            handler_fn = self._extract_function_ref(entry)
            if not handler_fn:
                continue
            entry_loc = entry.location
            rel_file = self._relative_source(entry_loc.file.name) if entry_loc.file else None
            trailing = _trailing_comment_at_line(self._src_bytes, entry_loc.line)
            qc_signature = trailing
            qc_name = _qc_name_from_comment(trailing)
            if not qc_name:
                qc_name = _PREFIX_STRIP_RE.sub("", handler_fn)
            self._rows.append({
                "name": qc_name,
                "ast": {
                    "table_name": table_name,
                    "builtin_index": index,
                    "handler_fn": handler_fn,
                    "qc_signature": qc_signature,
                    "source_file": rel_file,
                    "source_line": entry_loc.line,
                    "trailing_comment": trailing,
                }
            })

    def _extract_function_ref(self, cursor) -> Optional[str]:
        """Get the C function name from an INIT_LIST entry."""
        text = _read_extent(self._src_bytes, cursor.extent).strip().rstrip(",")
        # Strip address-of and parens.
        text = text.lstrip("&").strip()
        # Single identifier -> use it.
        if text and "(" not in text and " " not in text:
            return text
        return None

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).relative_to(self._repo_root))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        return self._rows

    def finalize(self, all_rows: list[dict], repo_root: Path) -> dict:
        # Dedup by (table_name, builtin_index): we want each slot once.
        seen: set[tuple[str, int]] = set()
        unique: list[dict] = []
        for r in all_rows:
            key = (r["ast"]["table_name"], r["ast"]["builtin_index"])
            if key in seen:
                continue
            seen.add(key)
            unique.append(r)
        unique.sort(key=lambda r: (r["ast"]["table_name"], r["ast"]["builtin_index"]))
        table_count: dict[str, int] = {}
        for r in unique:
            t = r["ast"]["table_name"]
            table_count[t] = table_count.get(t, 0) + 1
        return {
            "qc_builtins": unique,
            "_stats": {
                "count": len(unique),
                "by_table": table_count,
            },
        }
```

- [ ] **Step 3: Wire into driver**

```python
    from _handler_qc_builtins import QcBuiltinsMvdsvHandler
    available["qc_builtins"] = QcBuiltinsMvdsvHandler()
```

- [ ] **Step 4: Run + sanity-check**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12 --handlers qc_builtins
jq '._stats' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-qc-builtins-ast.json
jq '.qc_builtins[0:5]' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-qc-builtins-ast.json
jq '.qc_builtins[] | select(.name == "makevectors" or .name == "setorigin")' apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-qc-builtins-ast.json
```

Expected: 100-200 builtins across both tables. `makevectors` should be present at `pr_builtin` index 1.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/_handler_qc_builtins.py apps/qw-oracle/scripts/extractors/mvdsv/extract.py apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-qc-builtins-ast.json
git commit -m "feat(qw-oracle): MVDSV qc_builtins handler (pr_builtin + pr2_builtin tables)"
```

---

### Task 13: Full extraction smoke test

Run all seven handlers in one pass to confirm no inter-handler interference and reasonable wall time.

**Files:**
- No new files

- [ ] **Step 1: Run extraction with all handlers**

```bash
cd /home/paradoks/projects/quakeworld
time python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12
```

Expected: Wall time under 60s. Seven JSON output files written. Each `_stats.count` reasonable per the per-task expectations.

- [ ] **Step 2: Inspect aggregate counts**

```bash
for f in apps/qw-oracle/scripts/extractors/mvdsv/output/*.json; do
  echo "=== $(basename $f) ==="
  jq '._stats' "$f"
done
```

Capture all seven counts. Compare against the spec's expected ranges. Investigate any outlier (zero, dramatically too high) before proceeding.

- [ ] **Step 3: Commit aggregate output snapshot**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/output/
git commit -m "feat(qw-oracle): MVDSV full extraction smoke pass (7 entity types)"
```

---

## Phase C: Loader integration

### Task 14: load-protocol-messages.ts adapter

**Files:**
- Read-only template: `apps/qw-oracle/scripts/load-knowledge/load-cmdline-params.ts`
- Create: `apps/qw-oracle/scripts/load-knowledge/load-protocol-messages.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`

- [ ] **Step 1: Read template adapter**

```bash
sed -n '1,80p' /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge/load-cmdline-params.ts
```

Note the shape: `payloadField`, `versionsTable`, `isSourceBacked`, `buildRow`, `upsertRow`. Each <40 lines.

- [ ] **Step 2: Write the protocol_message adapter**

Create `apps/qw-oracle/scripts/load-knowledge/load-protocol-messages.ts`:

```typescript
// Loader adapter for protocol_message entities (Phase 2e MVDSV).
// Schema v15.

import type Database from 'better-sqlite3';

export const PROTOCOL_MESSAGE_PAYLOAD_FIELD = 'protocol_messages';

export function protocolMessageIsSourceBacked(entry: any): boolean {
  return entry?.ast != null;
}

export function buildProtocolMessageVersionRow(
  entityId: number,
  version: string,
  entry: any,
  now: string,
): Record<string, unknown> {
  const ast = entry.ast ?? {};
  return {
    entity_id: entityId,
    version,
    kind: ast.kind ?? null,
    value: ast.value ?? null,
    value_kind: ast.value_kind ?? null,
    source_file: ast.source_file ?? null,
    source_line: ast.source_line ?? null,
    trailing_comment: ast.trailing_comment ?? null,
    raw_ast_hash: ast.raw_ast_hash ?? null,
    source_root: ast.source_root ?? null,
    extracted_at: now,
  };
}

export function upsertProtocolMessageRow(db: Database.Database, row: Record<string, unknown>): void {
  db.prepare(`
    INSERT INTO protocol_message_versions (
      entity_id, version, kind, value, value_kind,
      source_file, source_line, trailing_comment, raw_ast_hash, source_root, extracted_at
    ) VALUES (
      @entity_id, @version, @kind, @value, @value_kind,
      @source_file, @source_line, @trailing_comment, @raw_ast_hash, @source_root, @extracted_at
    )
    ON CONFLICT(entity_id, version) DO UPDATE SET
      kind = excluded.kind,
      value = excluded.value,
      value_kind = excluded.value_kind,
      source_file = excluded.source_file,
      source_line = excluded.source_line,
      trailing_comment = excluded.trailing_comment,
      raw_ast_hash = excluded.raw_ast_hash,
      source_root = excluded.source_root,
      extracted_at = excluded.extracted_at
  `).run(row);
}
```

- [ ] **Step 3: Wire into load-version.ts ADAPTERS**

In `apps/qw-oracle/scripts/load-knowledge/load-version.ts`, import the new functions and add to ADAPTERS dict (find the existing ADAPTERS block; the imports go near the top alongside other `load-*` imports). After all four adapters are added in Tasks 14-17, the `Partial` from Task 2 Step 10 gets reverted in Task 17.

Add import:

```typescript
import {
  PROTOCOL_MESSAGE_PAYLOAD_FIELD,
  protocolMessageIsSourceBacked,
  buildProtocolMessageVersionRow,
  upsertProtocolMessageRow,
} from './load-protocol-messages';
```

Add to ADAPTERS dict:

```typescript
  protocol_message: {
    payloadField: PROTOCOL_MESSAGE_PAYLOAD_FIELD,
    versionsTable: 'protocol_message_versions',
    isSourceBacked: protocolMessageIsSourceBacked,
    buildRow: buildProtocolMessageVersionRow,
    upsertRow: upsertProtocolMessageRow,
  },
```

- [ ] **Step 4: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
bunx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/load-protocol-messages.ts apps/qw-oracle/scripts/load-knowledge/load-version.ts
git commit -m "feat(qw-oracle): load-protocol-messages.ts adapter for MVDSV protocol entities"
```

---

### Task 15: load-info-keys.ts adapter

Mirror Task 14's structure for info_key. Differences: `scope`, `operations` (JSON-stringified), `containing_function`, `call_sites_json`.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/load-info-keys.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`

- [ ] **Step 1: Write info_key adapter**

Create `apps/qw-oracle/scripts/load-knowledge/load-info-keys.ts`:

```typescript
import type Database from 'better-sqlite3';

export const INFO_KEY_PAYLOAD_FIELD = 'info_keys';

export function infoKeyIsSourceBacked(entry: any): boolean {
  return entry?.ast != null;
}

export function buildInfoKeyVersionRow(
  entityId: number,
  version: string,
  entry: any,
  now: string,
): Record<string, unknown> {
  const ast = entry.ast ?? {};
  return {
    entity_id: entityId,
    version,
    scope: ast.scope ?? null,
    operations: ast.operations ? JSON.stringify(ast.operations) : null,
    source_file: ast.source_file ?? null,
    source_line: ast.source_line ?? null,
    containing_function: ast.containing_function ?? null,
    call_sites_json: ast.all_call_sites ? JSON.stringify(ast.all_call_sites) : null,
    raw_ast_hash: ast.raw_ast_hash ?? null,
    source_root: ast.source_root ?? null,
    extracted_at: now,
  };
}

export function upsertInfoKeyRow(db: Database.Database, row: Record<string, unknown>): void {
  db.prepare(`
    INSERT INTO info_key_versions (
      entity_id, version, scope, operations,
      source_file, source_line, containing_function, call_sites_json,
      raw_ast_hash, source_root, extracted_at
    ) VALUES (
      @entity_id, @version, @scope, @operations,
      @source_file, @source_line, @containing_function, @call_sites_json,
      @raw_ast_hash, @source_root, @extracted_at
    )
    ON CONFLICT(entity_id, version) DO UPDATE SET
      scope = excluded.scope,
      operations = excluded.operations,
      source_file = excluded.source_file,
      source_line = excluded.source_line,
      containing_function = excluded.containing_function,
      call_sites_json = excluded.call_sites_json,
      raw_ast_hash = excluded.raw_ast_hash,
      source_root = excluded.source_root,
      extracted_at = excluded.extracted_at
  `).run(row);
}
```

- [ ] **Step 2: Wire into load-version.ts**

Add import:

```typescript
import {
  INFO_KEY_PAYLOAD_FIELD,
  infoKeyIsSourceBacked,
  buildInfoKeyVersionRow,
  upsertInfoKeyRow,
} from './load-info-keys';
```

Add to ADAPTERS:

```typescript
  info_key: {
    payloadField: INFO_KEY_PAYLOAD_FIELD,
    versionsTable: 'info_key_versions',
    isSourceBacked: infoKeyIsSourceBacked,
    buildRow: buildInfoKeyVersionRow,
    upsertRow: upsertInfoKeyRow,
  },
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && bunx tsc --noEmit
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/load-info-keys.ts apps/qw-oracle/scripts/load-knowledge/load-version.ts
git commit -m "feat(qw-oracle): load-info-keys.ts adapter for MVDSV userinfo/serverinfo/localinfo keys"
```

---

### Task 16: load-log-templates.ts adapter

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/load-log-templates.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`

- [ ] **Step 1: Write log_template adapter**

Create `apps/qw-oracle/scripts/load-knowledge/load-log-templates.ts`:

```typescript
import type Database from 'better-sqlite3';

export const LOG_TEMPLATE_PAYLOAD_FIELD = 'log_templates';

export function logTemplateIsSourceBacked(entry: any): boolean {
  return entry?.ast != null;
}

export function buildLogTemplateVersionRow(
  entityId: number,
  version: string,
  entry: any,
  now: string,
): Record<string, unknown> {
  const ast = entry.ast ?? {};
  return {
    entity_id: entityId,
    version,
    channel: ast.channel ?? null,
    format_string: ast.format_string ?? null,
    format_string_normalized: ast.format_string_normalized ?? null,
    source_file: ast.source_file ?? null,
    source_line: ast.source_line ?? null,
    containing_function: ast.containing_function ?? null,
    raw_ast_hash: ast.raw_ast_hash ?? null,
    source_root: ast.source_root ?? null,
    extracted_at: now,
  };
}

export function upsertLogTemplateRow(db: Database.Database, row: Record<string, unknown>): void {
  db.prepare(`
    INSERT INTO log_template_versions (
      entity_id, version, channel, format_string, format_string_normalized,
      source_file, source_line, containing_function, raw_ast_hash, source_root, extracted_at
    ) VALUES (
      @entity_id, @version, @channel, @format_string, @format_string_normalized,
      @source_file, @source_line, @containing_function, @raw_ast_hash, @source_root, @extracted_at
    )
    ON CONFLICT(entity_id, version) DO UPDATE SET
      channel = excluded.channel,
      format_string = excluded.format_string,
      format_string_normalized = excluded.format_string_normalized,
      source_file = excluded.source_file,
      source_line = excluded.source_line,
      containing_function = excluded.containing_function,
      raw_ast_hash = excluded.raw_ast_hash,
      source_root = excluded.source_root,
      extracted_at = excluded.extracted_at
  `).run(row);
}
```

- [ ] **Step 2: Wire into load-version.ts**

Add import:

```typescript
import {
  LOG_TEMPLATE_PAYLOAD_FIELD,
  logTemplateIsSourceBacked,
  buildLogTemplateVersionRow,
  upsertLogTemplateRow,
} from './load-log-templates';
```

Add to ADAPTERS:

```typescript
  log_template: {
    payloadField: LOG_TEMPLATE_PAYLOAD_FIELD,
    versionsTable: 'log_template_versions',
    isSourceBacked: logTemplateIsSourceBacked,
    buildRow: buildLogTemplateVersionRow,
    upsertRow: upsertLogTemplateRow,
  },
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle && bunx tsc --noEmit
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/load-log-templates.ts apps/qw-oracle/scripts/load-knowledge/load-version.ts
git commit -m "feat(qw-oracle): load-log-templates.ts adapter for MVDSV broadcast/client/console/system templates"
```

---

### Task 17: load-qc-builtins.ts adapter + revert Partial

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/load-qc-builtins.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`

- [ ] **Step 1: Write qc_builtin adapter**

Create `apps/qw-oracle/scripts/load-knowledge/load-qc-builtins.ts`:

```typescript
import type Database from 'better-sqlite3';

export const QC_BUILTIN_PAYLOAD_FIELD = 'qc_builtins';

export function qcBuiltinIsSourceBacked(entry: any): boolean {
  return entry?.ast != null;
}

export function buildQcBuiltinVersionRow(
  entityId: number,
  version: string,
  entry: any,
  now: string,
): Record<string, unknown> {
  const ast = entry.ast ?? {};
  return {
    entity_id: entityId,
    version,
    table_name: ast.table_name ?? null,
    builtin_index: ast.builtin_index ?? null,
    handler_fn: ast.handler_fn ?? null,
    qc_signature: ast.qc_signature ?? null,
    source_file: ast.source_file ?? null,
    source_line: ast.source_line ?? null,
    trailing_comment: ast.trailing_comment ?? null,
    raw_ast_hash: ast.raw_ast_hash ?? null,
    source_root: ast.source_root ?? null,
    extracted_at: now,
  };
}

export function upsertQcBuiltinRow(db: Database.Database, row: Record<string, unknown>): void {
  db.prepare(`
    INSERT INTO qc_builtin_versions (
      entity_id, version, table_name, builtin_index, handler_fn, qc_signature,
      source_file, source_line, trailing_comment, raw_ast_hash, source_root, extracted_at
    ) VALUES (
      @entity_id, @version, @table_name, @builtin_index, @handler_fn, @qc_signature,
      @source_file, @source_line, @trailing_comment, @raw_ast_hash, @source_root, @extracted_at
    )
    ON CONFLICT(entity_id, version) DO UPDATE SET
      table_name = excluded.table_name,
      builtin_index = excluded.builtin_index,
      handler_fn = excluded.handler_fn,
      qc_signature = excluded.qc_signature,
      source_file = excluded.source_file,
      source_line = excluded.source_line,
      trailing_comment = excluded.trailing_comment,
      raw_ast_hash = excluded.raw_ast_hash,
      source_root = excluded.source_root,
      extracted_at = excluded.extracted_at
  `).run(row);
}
```

- [ ] **Step 2: Wire into load-version.ts**

Add import:

```typescript
import {
  QC_BUILTIN_PAYLOAD_FIELD,
  qcBuiltinIsSourceBacked,
  buildQcBuiltinVersionRow,
  upsertQcBuiltinRow,
} from './load-qc-builtins';
```

Add to ADAPTERS:

```typescript
  qc_builtin: {
    payloadField: QC_BUILTIN_PAYLOAD_FIELD,
    versionsTable: 'qc_builtin_versions',
    isSourceBacked: qcBuiltinIsSourceBacked,
    buildRow: buildQcBuiltinVersionRow,
    upsertRow: upsertQcBuiltinRow,
  },
```

- [ ] **Step 3: Revert ADAPTERS to non-Partial**

In `load-version.ts`, change:

```typescript
const ADAPTERS: Partial<Record<EntityType, TypeAdapter>> = {
```

back to:

```typescript
const ADAPTERS: Record<EntityType, TypeAdapter> = {
```

- [ ] **Step 4: Typecheck verifies all four new types are present**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
bunx tsc --noEmit
```

Expected: PASS. If TypeScript complains "Property 'X' is missing in type", we have an unwired type - resolve before commit.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/load-qc-builtins.ts apps/qw-oracle/scripts/load-knowledge/load-version.ts
git commit -m "feat(qw-oracle): load-qc-builtins.ts adapter; ADAPTERS dict back to non-Partial Record"
```

---

### Task 18: Load all seven types into knowledge.db

**Files:**
- Modify: `apps/qw-oracle/data/knowledge.db` (loader writes here)

- [ ] **Step 1: Verify the latest mvdsv main commit SHA**

```bash
cd /home/paradoks/projects/quakeworld/research/repos/mvdsv
git fetch origin
git rev-parse origin/main
```

Capture the SHA - call it `<MVDSV_HEAD_SHA>` for the load commands.

- [ ] **Step 2: Load cvars**

```bash
cd /home/paradoks/projects/quakeworld
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- load-version \
  --project mvdsv --version head --type cvar \
  --json apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-variables-ast.json \
  --commit <MVDSV_HEAD_SHA> --ordinal 999999
```

Expected: `loaded N rows ... source_state distribution: source_backed=N`

- [ ] **Step 3: Load remaining six types**

```bash
for type_pair in command:commands cmdline_param:cmdline-params protocol_message:protocol-messages info_key:info-keys log_template:log-templates qc_builtin:qc-builtins; do
  type=${type_pair%%:*}
  fname=mvdsv-${type_pair##*:}-ast.json
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- load-version \
    --project mvdsv --version head --type $type \
    --json apps/qw-oracle/scripts/extractors/mvdsv/output/$fname \
    --commit <MVDSV_HEAD_SHA> --ordinal 999999
done
```

Expected: each load reports counts matching the JSON `_stats.count` from the extraction output.

- [ ] **Step 4: Sanity-check DB state**

```bash
cd /home/paradoks/projects/quakeworld
sqlite3 apps/qw-oracle/data/knowledge.db "SELECT type, COUNT(*) FROM entities WHERE project='mvdsv' GROUP BY type"
```

Expected output rows for each of the seven types with non-zero counts.

```bash
sqlite3 apps/qw-oracle/data/knowledge.db "SELECT * FROM entities WHERE project='mvdsv' AND name='sv_maxfps'"
sqlite3 apps/qw-oracle/data/knowledge.db "SELECT * FROM cvar_versions WHERE entity_id=(SELECT id FROM entities WHERE project='mvdsv' AND name='sv_maxfps') AND version='head'"
```

Expected: row exists with default_value `77`, flag_names containing `CVAR_SERVERINFO`.

- [ ] **Step 5: No commit yet** (binary DB is gitignored). Move to Phase D.

---

## Phase D: Validation

### Task 19: Stage validation fixtures

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ciscon-1.20-dev-2026-04-27.log`
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ktx-progs-prefixes.txt`
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ktx-progs-allowlist.txt`
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/README.md`

- [ ] **Step 1: Copy Ciscon's dump into the repo**

```bash
cd /home/paradoks/projects/quakeworld
mkdir -p apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures
cp /mnt/c/Users/Administrator/Downloads/qw-1.log \
  apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ciscon-1.20-dev-2026-04-27.log
```

- [ ] **Step 2: Write KTX-progs prefix filter**

Create `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ktx-progs-prefixes.txt`:

```
k_
_k_
__k_
add_q_
dmm4_
```

(One prefix per line. Lines starting with these prefixes belong to KTX QC and are not in MVDSV C source.)

- [ ] **Step 3: Write the seed allowlist for KTX cvars without prefixes**

Create `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ktx-progs-allowlist.txt`:

```
dp
dq
dr
extralogname
frag_log_type
lock_practice
srv_practice_mode
timing_players_action
timing_players_time
vip_password
vip_values
download_map_url
password
pausable
```

(Initial seed; expand iteratively in Task 21 as runtime-validation surfaces additional KTX-only entries that lack standard prefixes.)

- [ ] **Step 4: Write the README explaining the fixture set**

Create `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/README.md`:

```markdown
# MVDSV Validation Fixtures

## ciscon-1.20-dev-2026-04-27.log

Production server `cvarlist` + `cmdlist` dump from `nicotinelounge.com KTX #1`,
captured 2026-04-27 by operator. Server identity per the dump:

- Engine: MVDSV 1.20-dev (post-1.11 head, build date 2026-04-11)
- Mod: KTX 1.47-dev
- Platform: Linux ARM64

Total: 758/758 cvars, 107/107 commands.

## ktx-progs-prefixes.txt + ktx-progs-allowlist.txt

Filter list for the runtime-validation diff. Cvars/commands matching one of
the prefixes (or appearing on the allowlist) are KTX-progs registrations
visible in the live server but not in MVDSV C source. Filter them out before
declaring an extractor gap.

The allowlist starts as a seed; new entries get added when runtime-validation
surfaces them and source inspection confirms they are KTX-side.

## How to refresh the dump

For a fresh dump from any MVDSV server:

```
rcon <pw> log_file 1
rcon <pw> cvarlist
rcon <pw> cmdlist
rcon <pw> log_file 0
# fetch <gamedir>/qconsole.log
```

Save with the filename pattern `<server>-<engine-version>-YYYY-MM-DD.log`.
```

- [ ] **Step 5: Commit fixtures**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/
git commit -m "feat(qw-oracle): MVDSV validation fixtures from Ciscon's 1.20-dev nicotinelounge.com dump"
```

---

### Task 20: Build runtime-validation diff harness

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/diff-runtime.sh`

- [ ] **Step 1: Write the diff script**

Create `apps/qw-oracle/scripts/extractors/mvdsv/diff-runtime.sh`:

```bash
#!/usr/bin/env bash
# diff-runtime.sh -- Compare MVDSV runtime cvarlist+cmdlist against extracted DB.
# Usage:
#   ./diff-runtime.sh [--type cvar|command]
# Default: cvar
#
# Output: three sections to stdout
#   - runtime-only after KTX filter (potential extractor gaps)
#   - DB-only (head delta, platform-specific, or over-detection)
#   - intersect count

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../../../../.." && pwd)"
DB="$REPO_ROOT/apps/qw-oracle/data/knowledge.db"
LOG="$HERE/validation-fixtures/ciscon-1.20-dev-2026-04-27.log"
PREFIXES="$HERE/validation-fixtures/ktx-progs-prefixes.txt"
ALLOWLIST="$HERE/validation-fixtures/ktx-progs-allowlist.txt"

TYPE="cvar"
if [ "${1:-}" = "--type" ]; then
  TYPE="$2"
fi

case "$TYPE" in
  cvar)
    LOG_HEADER="List of cvars:"
    LOG_FOOTER='[0-9]+/[0-9]+ variables'
    NAME_RE='^[A-Za-z_+\-\$\.\*][A-Za-z0-9_\.\+\-\*]*$'
    ;;
  command)
    LOG_HEADER="List of commands:"
    LOG_FOOTER='[0-9]+/[0-9]+ commands'
    NAME_RE='^[A-Za-z_][A-Za-z0-9_]*$'
    ;;
  *)
    echo "Unknown type: $TYPE (use cvar or command)" >&2
    exit 1
    ;;
esac

TMP_RUNTIME=$(mktemp)
TMP_DB=$(mktemp)
TMP_FILTERED=$(mktemp)
trap 'rm -f $TMP_RUNTIME $TMP_DB $TMP_FILTERED' EXIT

# 1. Parse log into name list (lowercase, deduped, sorted).
awk -v hdr="$LOG_HEADER" -v ftr="$LOG_FOOTER" '
  $0 ~ hdr {flag=1; next}
  flag && $0 ~ ftr {flag=0}
  flag {
    sub(/^\[[0-9: -]+\] s? /, "")
    sub(/^[ \t]+/, "")
    sub(/[ \t].*$/, "")
    sub(/\r$/, "")
    if ($0 != "") print $0
  }
' "$LOG" | tr '[:upper:]' '[:lower:]' | sort -u > "$TMP_RUNTIME"

# 2. Strip KTX-progs prefixes + allowlist.
PREFIX_RE=""
while IFS= read -r prefix; do
  [ -z "$prefix" ] && continue
  PREFIX_RE="${PREFIX_RE}|^${prefix}"
done < "$PREFIXES"
PREFIX_RE="${PREFIX_RE#|}"

if [ -n "$PREFIX_RE" ]; then
  grep -Ev "$PREFIX_RE" "$TMP_RUNTIME" > "$TMP_FILTERED"
else
  cp "$TMP_RUNTIME" "$TMP_FILTERED"
fi

# Filter out allowlist entries (exact-match).
ALLOWLIST_TMP=$(mktemp)
sort -u "$ALLOWLIST" > "$ALLOWLIST_TMP"
comm -23 "$TMP_FILTERED" "$ALLOWLIST_TMP" > "$TMP_FILTERED.2"
mv "$TMP_FILTERED.2" "$TMP_FILTERED"
rm -f "$ALLOWLIST_TMP"

# 3. Pull source_backed names from DB.
sqlite3 "$DB" "SELECT name FROM entities WHERE project='mvdsv' AND type='$TYPE' AND source_state='source_backed'" \
  | tr '[:upper:]' '[:lower:]' | sort -u > "$TMP_DB"

# 4. Diff and report.
echo "=== type=$TYPE ==="
echo "Runtime (post-KTX-filter): $(wc -l < "$TMP_FILTERED")"
echo "DB (source_backed):        $(wc -l < "$TMP_DB")"
echo "Intersect:                 $(comm -12 "$TMP_FILTERED" "$TMP_DB" | wc -l)"

echo ""
echo "--- Runtime-only (potential extractor gaps) ---"
comm -23 "$TMP_FILTERED" "$TMP_DB" | tee /tmp/mvdsv-runtime-only-$TYPE.txt

echo ""
echo "--- DB-only (head delta vs 1.20-dev, platform-specific, or over-detection) ---"
comm -13 "$TMP_FILTERED" "$TMP_DB" | tee /tmp/mvdsv-db-only-$TYPE.txt
```

Make executable:

```bash
chmod +x apps/qw-oracle/scripts/extractors/mvdsv/diff-runtime.sh
```

- [ ] **Step 2: Run diff for cvars**

```bash
cd /home/paradoks/projects/quakeworld
apps/qw-oracle/scripts/extractors/mvdsv/diff-runtime.sh --type cvar
```

Capture the runtime-only and DB-only counts. Investigate.

- [ ] **Step 3: Run diff for commands**

```bash
apps/qw-oracle/scripts/extractors/mvdsv/diff-runtime.sh --type command
```

Capture and investigate.

- [ ] **Step 4: Commit the diff harness**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/diff-runtime.sh
git commit -m "feat(qw-oracle): MVDSV runtime-validation diff harness"
```

---

### Task 21: Iterate on extractor until residual gap is fully categorized

This is the playbook's "categorize the runtime-only list" step. Each unexplained runtime-only entry must be classified as: KTX-prog (add to allowlist), Bucket 2 (Cvar_Create dynamic), Bucket 3 (sprintf-built), or genuine extractor gap (fix the handler).

**Files:**
- May modify: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_*.py`
- May modify: `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ktx-progs-allowlist.txt`
- Create: `apps/qw-oracle/scripts/extractors/mvdsv/OUT_OF_SCOPE.md`

- [ ] **Step 1: Categorize each runtime-only cvar entry**

For each name in `/tmp/mvdsv-runtime-only-cvar.txt`, search MVDSV source:

```bash
for name in $(cat /tmp/mvdsv-runtime-only-cvar.txt); do
  echo "=== $name ==="
  grep -rn "\"$name\"\|^cvar_t $name\|^static cvar_t $name" /home/paradoks/projects/quakeworld/research/repos/mvdsv/src --include='*.c' --include='*.h' | head -3
done > /tmp/mvdsv-categorize-cvar.txt
less /tmp/mvdsv-categorize-cvar.txt
```

- For each name with a hit -> the extractor missed a real registration; fix the handler
- For each name with no hit -> KTX-prog (add to allowlist) or Bucket 2 (Cvar_Create) or Bucket 3 (sprintf-built)

- [ ] **Step 2: Update the KTX allowlist for KTX-only entries**

Append confirmed KTX-only names (no MVDSV source hit, no Cvar_Create) to `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ktx-progs-allowlist.txt`. Re-run the diff:

```bash
cd /home/paradoks/projects/quakeworld
apps/qw-oracle/scripts/extractors/mvdsv/diff-runtime.sh --type cvar
```

- [ ] **Step 3: Fix any genuine extractor gaps**

For each category-3 entry (real source registration the extractor missed), figure out why:
- Is it behind a preprocessor guard the variant matrix doesn't cover? Add a guard to `clang_args_mvdsv_*` and re-run extraction.
- Is it a new pattern? Add a sub-pattern to the relevant handler. Re-extract, re-load, re-diff.
- Is it `#define`-resolved like ezQuake's Pattern 6? Add the resolver fallback to the handler.

After each fix: rerun extract.py + load-version + diff-runtime.sh. Iterate until runtime-only is fully categorized.

- [ ] **Step 4: Document remaining Bucket 2 / Bucket 3 entries in OUT_OF_SCOPE.md**

Create `apps/qw-oracle/scripts/extractors/mvdsv/OUT_OF_SCOPE.md` listing:
- Bucket 2 (Cvar_Create dynamic): name + source location of the Cvar_Create call site
- Bucket 3 (sprintf-built): name pattern + source location of the sprintf call site
- Any KTX-side names that needed to be added to the allowlist with a brief explanation

Format mirrors `apps/qw-oracle/scripts/extractors/ezquake/OUT_OF_SCOPE.md`.

- [ ] **Step 5: Repeat steps 1-4 for commands**

```bash
apps/qw-oracle/scripts/extractors/mvdsv/diff-runtime.sh --type command
```

Same categorization loop. Add command-specific entries to OUT_OF_SCOPE.md.

- [ ] **Step 6: Final pass: zero genuine extractor gaps**

Pass criteria from spec:
- All runtime-only entries are KTX-allowlisted, Bucket 2, or Bucket 3
- Zero "I don't know what this is" entries remain

- [ ] **Step 7: Commit iterations**

After each handler fix or allowlist update:

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/mvdsv/
git commit -m "fix(qw-oracle): MVDSV extractor iteration -- <specific fix>"
```

Final commit when validation passes:

```bash
git add apps/qw-oracle/scripts/extractors/mvdsv/OUT_OF_SCOPE.md
git commit -m "docs(qw-oracle): MVDSV out-of-scope categorization (Bucket 2/3 + KTX allowlist)"
```

---

### Task 22: Field-accuracy 20-row sample audit

Coverage isn't correctness. Sample 20 random source_backed cvar rows and verify each field matches the literal source.

**Files:**
- Create (transient): `/tmp/mvdsv-sample-audit.json`

- [ ] **Step 1: Pull a 20-row random sample**

```bash
cd /home/paradoks/projects/quakeworld
sqlite3 -json apps/qw-oracle/data/knowledge.db "
  SELECT e.name, cv.default_value, cv.flags_raw, cv.on_change,
         cv.source_file, cv.source_line, cv.trailing_comment
  FROM entities e JOIN cvar_versions cv ON cv.entity_id=e.id
  WHERE e.project='mvdsv' AND e.type='cvar' AND e.source_state='source_backed'
    AND cv.version='head'
  ORDER BY RANDOM() LIMIT 20" > /tmp/mvdsv-sample-audit.json
cat /tmp/mvdsv-sample-audit.json | jq '.[] | "\(.name) @ \(.source_file):\(.source_line)"'
```

- [ ] **Step 2: For each sampled row, eyeball the source**

For each entry shown:

```bash
# Replace <file> and <line> per row:
sed -n '<line-1>,<line+1>p' /home/paradoks/projects/quakeworld/research/repos/mvdsv/<file>
```

Check that:
- `default_value` matches the literal in source
- `flags_raw` matches whatever appears in the third struct-init slot (or null if absent)
- `on_change` matches the fourth slot (or null)
- `trailing_comment` matches what's after `//` on that line (or merged multi-line continuation)

- [ ] **Step 3: Record the audit result**

If 20/20 match, document in commit message. If any mismatch, fix the handler then re-run extraction + load + audit.

- [ ] **Step 4: Commit field-accuracy result**

```bash
cd /home/paradoks/projects/quakeworld
# Only if a fix was needed during the audit; otherwise skip the commit and
# proceed to Task 23.
```

---

### Task 23: Quality grid probes for MVDSV

Add MVDSV-specific regression and anomaly probes to the quality grid so future regressions surface immediately.

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`

- [ ] **Step 1: Read current quality-grid structure**

```bash
sed -n '1,100p' /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
```

Identify how FTE/ezquake probes are organized (likely as objects with `family`, `name`, `query`, `assert`).

- [ ] **Step 2: Add MVDSV regression probes**

Add probes (counts may need adjustment to actual extraction results from Task 18):

```typescript
// MVDSV Phase 2e regression probes (2026-04-27)
// Counts derived from Phase 2e ship; adjust if extractor changes.
{
  family: 'regression',
  project: 'mvdsv',
  name: 'cvars-source-backed-count',
  query: `SELECT COUNT(*) AS n FROM entities WHERE project='mvdsv' AND type='cvar' AND source_state='source_backed'`,
  assertGte: 150,
},
{
  family: 'regression',
  project: 'mvdsv',
  name: 'commands-count',
  query: `SELECT COUNT(*) AS n FROM entities WHERE project='mvdsv' AND type='command' AND source_state='source_backed'`,
  assertGte: 90,
},
{
  family: 'regression',
  project: 'mvdsv',
  name: 'protocol-messages-count',
  query: `SELECT COUNT(*) AS n FROM entities WHERE project='mvdsv' AND type='protocol_message' AND source_state='source_backed'`,
  assertGte: 30,
},
{
  family: 'regression',
  project: 'mvdsv',
  name: 'info-keys-count',
  query: `SELECT COUNT(*) AS n FROM entities WHERE project='mvdsv' AND type='info_key' AND source_state='source_backed'`,
  assertGte: 25,
},
{
  family: 'regression',
  project: 'mvdsv',
  name: 'log-templates-count',
  query: `SELECT COUNT(*) AS n FROM entities WHERE project='mvdsv' AND type='log_template' AND source_state='source_backed'`,
  assertGte: 200,
},
{
  family: 'regression',
  project: 'mvdsv',
  name: 'qc-builtins-count',
  query: `SELECT COUNT(*) AS n FROM entities WHERE project='mvdsv' AND type='qc_builtin' AND source_state='source_backed'`,
  assertGte: 80,
},
{
  family: 'regression',
  project: 'mvdsv',
  name: 'all-source-backed',
  query: `SELECT COUNT(*) AS n FROM entities WHERE project='mvdsv' AND source_state != 'source_backed'`,
  assertEq: 0,
  description: 'MVDSV ships no help-JSON; no doc_only complement expected',
},
{
  family: 'anomaly',
  project: 'mvdsv',
  name: 'sv_maxfps-default-77',
  query: `SELECT cv.default_value FROM entities e JOIN cvar_versions cv ON cv.entity_id=e.id WHERE e.project='mvdsv' AND e.name='sv_maxfps' AND cv.version='head'`,
  assertEqStr: '77',
},
{
  family: 'anomaly',
  project: 'mvdsv',
  name: 'log-template-channels-all-four',
  query: `SELECT COUNT(DISTINCT channel) AS n FROM log_template_versions WHERE entity_id IN (SELECT id FROM entities WHERE project='mvdsv')`,
  assertEq: 4,
},
```

The exact `assertGte`/`assertEq`/`assertEqStr` field names may differ; adapt to whatever the existing probe interface uses (read existing probes to confirm).

- [ ] **Step 3: Run quality grid**

```bash
cd /home/paradoks/projects/quakeworld
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid \
  --project mvdsv --family both
```

Expected: all probes PASS.

- [ ] **Step 4: Commit quality grid additions**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
git commit -m "feat(qw-oracle): MVDSV quality grid probes (regression + anomaly families)"
```

---

## Phase E: Ship

### Task 24: Final extract-tag run + slipgate snapshot

Use the existing `extract-tag` orchestrator for an atomic re-run, then build the slipgate-shaped snapshot if applicable.

**Files:**
- Modify: `apps/slipgate-app/src/lib/config/data/qw-mvdsv.json` (if build-snapshot supports MVDSV)

- [ ] **Step 1: Re-run extract-tag for atomic provenance**

```bash
cd /home/paradoks/projects/quakeworld
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag \
  --project mvdsv --version head --ordinal 999999
```

Expected: identical output to manual loads in Task 18, plus a `versions` table row stamping the head commit SHA.

- [ ] **Step 2: Verify versions row**

```bash
sqlite3 apps/qw-oracle/data/knowledge.db "SELECT * FROM versions WHERE project='mvdsv' AND version='head'"
```

Expected: one row, ordinal 999999, commit_sha matching what `git -C research/repos/mvdsv rev-parse origin/main` returns.

- [ ] **Step 3: Try slipgate snapshot build**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- build-snapshot \
  --project mvdsv --version head
```

If `build-snapshot` errors due to missing MVDSV serializer: skip it; MVDSV is server-side and slipgate may not consume MVDSV directly (slipgate is the client). Document the skip in the commit. If it succeeds: a `qw-mvdsv.json` is written and committed.

- [ ] **Step 4: Commit any snapshot output**

```bash
cd /home/paradoks/projects/quakeworld
git status apps/slipgate-app/src/lib/config/data/qw-mvdsv.json 2>/dev/null && \
  git add apps/slipgate-app/src/lib/config/data/qw-mvdsv.json && \
  git commit -m "feat(slipgate-app): MVDSV layer1 snapshot for cross-engine config converter" \
  || echo "no snapshot built; MVDSV slipgate consumer not required"
```

---

### Task 25: HANDOVER + memory + CLAUDE.md updates

**Files:**
- Modify: `HANDOVER.md`
- Modify: `apps/qw-oracle/CLAUDE.md`
- Modify: `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`
- Modify: `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md` (per the auto-memory system)

- [ ] **Step 1: Update HANDOVER.md**

In `HANDOVER.md`, find the "Phase 2d-2h: remaining QW knowledge rollout" entry. Add MVDSV ship line, advance Phase 2e KTX cvars to next-priority, update the open-items count.

- [ ] **Step 2: Update apps/qw-oracle/CLAUDE.md**

Update the top-of-file status paragraph to:
- Note MVDSV Phase 2e shipped at HEAD
- List actual entity counts achieved (cvars, commands, cmdline, protocol, info_keys, log_templates, qc_builtins)
- Schema v15 status
- Reference the validation pass and Ciscon-dump fixture

- [ ] **Step 3: Update EXTRACTOR-PLAYBOOK.md**

Add MVDSV to the "Current counts per engine" table:

```markdown
| Engine | Total entities | Bucket 1 | Bucket 2 | Bucket 3 | Bucket 4 residual |
|---|---|---|---|---|---|
| ezQuake | ~3849 | 0 | ~4 cvars | ~5 HUD-synth | 0 |
| QWCL | 364 | 0 | unknown (small) | 0 | 2 cmdline_params |
| FTE | 3208 | ~26 | ~27 | ~56 | 0 |
| MVDSV | <ACTUAL> | 0 (no plugins) | <COUNT> | <COUNT> | 0 |
```

If new patterns surfaced during extraction (e.g., banner-description harvest as Pattern 9), add them to the Registration pattern catalog section.

- [ ] **Step 4: Update operator memory**

Per the auto-memory system at `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/`, find the project memory entry that points at "FTE Phase 2d-core shipped" and either extend it to mention MVDSV or write a new `project_mvdsv_phase2e.md`. Update `MEMORY.md` index.

- [ ] **Step 5: Commit doc updates**

```bash
cd /home/paradoks/projects/quakeworld
git add HANDOVER.md apps/qw-oracle/CLAUDE.md apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
git commit -m "docs(qw-oracle): MVDSV Phase 2e SHIPPED at HEAD with seven entity types"
```

Memory file updates happen via the Write tool to the memory directory; not git-committed.

---

### Task 26: Push to origin

- [ ] **Step 1: Push the entire arc**

```bash
cd /home/paradoks/projects/quakeworld
git push origin main
```

Expected: clean push.

---

## Self-review

Per the writing-plans skill: spec coverage check, placeholder scan, type consistency.

**Spec coverage:** Every locked decision in the spec maps to a task:
- Q1 (scope B - cvars/commands/cmdline) -> Tasks 6, 7, 8 (handlers) + Tasks 9, 10, 11, 12 (the four extra new types per Q3 expansion) + Task 13 (smoke)
- Q2 (V1 variant model) -> Task 4 (clang_config) + Task 5 (driver dispatches three variants)
- Q3 (seven entity types) -> Tasks 6-12 (one per type)
- Q3 add'l (banner harvest) -> Task 7 step 2 (function-banner harvest sub-pattern)
- Q4a (runtime validation) -> Tasks 19, 20, 21 (fixtures + harness + iteration)
- Q4b (head-only this arc) -> Task 24 (single head load, ordinal 999999)
- Q5 (post-arc sequence captured in HANDOVER) -> Task 25 step 1
- Schema v15 -> Tasks 2, 3 (migration + SCHEMA.md)
- Loader adapters -> Tasks 14, 15, 16, 17
- Quality grid additions -> Task 23

**Placeholder scan:** Searched for "TBD", "TODO", "implement later", "Add appropriate error handling". One spec-time placeholder remains in Task 1 (`<line>` for sed sample) and Task 12 (`<line>` for sed sample) - these are placeholders the operator fills from grep output during execution. Task 18 has `<MVDSV_HEAD_SHA>` placeholder filled from `git rev-parse` in Step 1. Task 23 step 2 says "counts may need adjustment" - that's not a placeholder, it's pragmatic acknowledgment that probe thresholds calibrate to actual extraction results from Task 18 before this task runs. Task 25's playbook table has `<ACTUAL>` and `<COUNT>` placeholders filled from Task 21's OUT_OF_SCOPE.md and Task 18's load output.

**Type consistency:** EntityType union members match across schema.ts, types.ts, and ADAPTERS dict. Handler class names follow `<Type>MvdsvHandler` pattern. Output JSON `payload_field` matches loader `payloadField` constants. Schema column names match adapter `buildRow` field names exactly.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-27-mvdsv-layer1-extraction.md`. Two execution options:

**1. Subagent-Driven (recommended)** -- I dispatch a fresh subagent per task, review between tasks, fast iteration. Especially good for this plan because per-handler tasks are independent and review can catch handler issues immediately.

**2. Inline Execution** -- Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

Which approach?
