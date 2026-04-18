# QW Knowledge Loader - Phase 2b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the TypeScript loader that turns the ezQuake AST extractor JSON into a populated `knowledge.db`, end to end, against two real versions of ezQuake (tag `3.6.9` and `head`).

**Architecture:** TypeScript + `better-sqlite3` + `tsx` runner, living under `apps/qw-oracle/scripts/load-knowledge/`. Three pipeline stages (load-version, diff, enrich) wired through a single `load-knowledge <subcommand>` CLI. Schema is exactly as defined in `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md`. Transitions and change events are emitted as side effects of load-version and diff. No test framework; each task ends with a compile step and a manual verification against a small on-disk fixture.

**Tech Stack:** TypeScript 5.x, Node.js 20+, `tsx` for direct TS execution, `better-sqlite3` v11 (already in qw-oracle), `ulid` for extractor_run_id, SQLite 3.x, git CLI via `spawnSync` for blame, GitHub REST API for enrichment (PAT required).

**Spec compliance:** Every section in `2026-04-18-qw-knowledge-extraction-schema.md` is implemented here. Out of scope for Phase 2b (and NOT implemented in this plan): commands / macros / cmdline-param extractors (Phase 2c), FTE / MVDSV / KTX (Phase 2d-2e), full historical backfill (Phase 2f), MCP tool upgrades (Phase 2g), Slipgate refactor (deferred track).

**Testing posture:** Per `/home/paradoks/projects/quakeworld/CLAUDE.md` -> "Compile and build first. Manual verification second. Automated tests only when the project already has them or when explicitly asked." The existing qw-oracle has no test framework. Each task ends with `npm run typecheck` (runs `tsc --noEmit`) to verify types compile, followed by a manual inspection step (sqlite CLI query or small script run).

**Verification repo:** the loader blames and enriches against a git repo that must exist at `/home/paradoks/projects/quakeworld/research/repos/ezquake-source`. Confirm this before starting with `ls -d /home/paradoks/projects/quakeworld/research/repos/ezquake-source`.

---

## Task 1: TypeScript scaffolding

Add TypeScript + tsx + ulid to qw-oracle. No test framework. Keep the scaffolding small.

**Files:**
- Modify: `apps/qw-oracle/package.json`
- Create: `apps/qw-oracle/tsconfig.json`
- Create: `apps/qw-oracle/scripts/load-knowledge/.gitkeep`

- [ ] **Step 1: Install TypeScript + tsx + ulid**

Run from `/home/paradoks/projects/quakeworld/apps/qw-oracle/`:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm install --save-dev typescript@^5.4.0 tsx@^4.7.0 @types/node@^20.0.0
npm install ulid@^2.3.0
```

Expected: `package.json` gains `typescript`, `tsx`, `@types/node` under `devDependencies` and `ulid` under `dependencies`. `node_modules` populated.

- [ ] **Step 2: Create `apps/qw-oracle/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["scripts/load-knowledge/**/*"],
  "exclude": ["node_modules", "data"]
}
```

- [ ] **Step 3: Add npm scripts in `apps/qw-oracle/package.json`**

Edit the `"scripts"` block so it includes:

```json
"scripts": {
  "import:discord": "node scripts/import-discord.mjs",
  "import:irc": "node scripts/import-irc.mjs",
  "stats": "node scripts/stats.mjs",
  "typecheck": "tsc --noEmit",
  "load-knowledge": "tsx scripts/load-knowledge/index.ts"
}
```

- [ ] **Step 4: Create the empty loader subdirectory placeholder**

```bash
mkdir -p /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge
touch /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge/.gitkeep
```

- [ ] **Step 5: Verify TypeScript compiles an empty project**

Run:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit code 0, no output (no TS files yet).

- [ ] **Step 6: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/package.json apps/qw-oracle/package-lock.json apps/qw-oracle/tsconfig.json apps/qw-oracle/scripts/load-knowledge/.gitkeep
git commit -m "feat(qw-oracle): scaffold TypeScript + tsx for load-knowledge pipeline"
```

---

## Task 2: Schema + migrations (`schema.ts`)

Translate the spec's SQL directly into a schema module that can initialize or migrate a sqlite database idempotently.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/schema.ts`

- [ ] **Step 1: Create `schema.ts` with all 9 CREATE TABLE statements + indexes**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/schema.ts
//
// v1 schema for the QW Knowledge Service Layer 1 store.
// Mirrors docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md.

import type Database from 'better-sqlite3';

export const SCHEMA_VERSION = 1;

const SCHEMA_V1_SQL = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS versions (
  id             INTEGER PRIMARY KEY,
  project        TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  version        TEXT NOT NULL,
  commit_sha     TEXT NOT NULL,
  tag_date       TEXT,
  ordinal        INTEGER NOT NULL,
  parse_state    TEXT NOT NULL DEFAULT 'ok' CHECK (parse_state IN ('ok','partial')),
  notes          TEXT,
  extracted_at   TEXT NOT NULL,
  UNIQUE (project, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_versions_ordinal ON versions(project, ordinal);

CREATE TABLE IF NOT EXISTS entities (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  type                  TEXT NOT NULL CHECK (type IN ('cvar','command','macro','cmdline_param')),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(project, type);

CREATE TABLE IF NOT EXISTS cvar_versions (
  entity_id               INTEGER NOT NULL REFERENCES entities(id),
  version                 TEXT NOT NULL,
  help_desc               TEXT,
  help_remarks            TEXT,
  help_values             TEXT,
  help_group_id           TEXT,
  help_type               TEXT,
  default_value           TEXT,
  flags_raw               TEXT,
  flag_names              TEXT,
  on_change               TEXT,
  min_bound               TEXT,
  max_bound               TEXT,
  source_file             TEXT,
  source_line             INTEGER,
  source_column           INTEGER,
  storage_class           TEXT,
  group_name_in_source    TEXT,
  trailing_comment        TEXT,
  server_only             INTEGER NOT NULL DEFAULT 0,
  raw_ast_hash            TEXT,
  extracted_at            TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_cvar_versions_source ON cvar_versions(source_file, source_line);

CREATE TABLE IF NOT EXISTS command_versions (
  entity_id         INTEGER NOT NULL REFERENCES entities(id),
  version           TEXT NOT NULL,
  help_desc         TEXT,
  help_remarks      TEXT,
  help_group_id     TEXT,
  handler_fn        TEXT,
  source_file       TEXT,
  source_line       INTEGER,
  source_column     INTEGER,
  registration_file TEXT,
  raw_ast_hash      TEXT,
  extracted_at      TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS macro_versions (
  entity_id            INTEGER NOT NULL REFERENCES entities(id),
  version              TEXT NOT NULL,
  help_desc            TEXT,
  macro_type           TEXT,
  teamplay_restricted  INTEGER NOT NULL DEFAULT 0,
  related_cvars_json   TEXT,
  handler_fn           TEXT,
  source_file          TEXT,
  source_line          INTEGER,
  source_column        INTEGER,
  registration_file    TEXT,
  raw_ast_hash         TEXT,
  extracted_at         TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS cmdline_param_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,
  help_desc        TEXT,
  help_remarks     TEXT,
  arguments        TEXT,
  flags_json       TEXT,
  systems_json     TEXT,
  source_file      TEXT,
  source_line      INTEGER,
  source_column    INTEGER,
  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS change_events (
  id                       INTEGER PRIMARY KEY,
  entity_id                INTEGER NOT NULL REFERENCES entities(id),
  from_version             TEXT,
  to_version               TEXT NOT NULL,
  change_kind              TEXT NOT NULL CHECK (change_kind IN ('created','modified','deleted')),
  field_name               TEXT NOT NULL DEFAULT '',
  old_value                TEXT,
  new_value                TEXT,
  commit_sha               TEXT NOT NULL,
  commit_message_excerpt   TEXT,
  pr_number                INTEGER,
  pr_title                 TEXT,
  pr_body_excerpt          TEXT,
  linked_issues_json       TEXT,
  enrichment_source        TEXT CHECK (enrichment_source IN ('git','github_api')),
  extracted_at             TEXT NOT NULL,
  UNIQUE (entity_id, to_version, field_name, change_kind)
);
CREATE INDEX IF NOT EXISTS idx_change_events_to_version    ON change_events(to_version);
CREATE INDEX IF NOT EXISTS idx_change_events_entity_field  ON change_events(entity_id, field_name);
CREATE INDEX IF NOT EXISTS idx_change_events_commit        ON change_events(commit_sha);

CREATE TABLE IF NOT EXISTS source_state_transitions (
  id                 INTEGER PRIMARY KEY,
  entity_id          INTEGER NOT NULL REFERENCES entities(id),
  from_state         TEXT NOT NULL,
  to_state           TEXT NOT NULL,
  reason             TEXT NOT NULL CHECK (reason IN (
                       'initial_observation',
                       'removed_from_head',
                       're_added',
                       'backfill_match',
                       'manual_update'
                     )),
  version_context    TEXT,
  extractor_run_id   TEXT NOT NULL,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sst_entity ON source_state_transitions(entity_id);
CREATE INDEX IF NOT EXISTS idx_sst_run    ON source_state_transitions(extractor_run_id);
`;

export function applySchema(db: Database.Database): void {
  db.exec(SCHEMA_V1_SQL);

  const existing = db
    .prepare(`SELECT value FROM schema_meta WHERE key = 'schema_version'`)
    .get() as { value: string } | undefined;

  if (!existing) {
    db.prepare(
      `INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?)`
    ).run(String(SCHEMA_VERSION));
  } else if (Number(existing.value) !== SCHEMA_VERSION) {
    throw new Error(
      `schema_meta.schema_version=${existing.value}; loader expects ${SCHEMA_VERSION}. Add a migration.`
    );
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/schema.ts
git commit -m "feat(qw-oracle): v1 knowledge-db schema (9 tables, 9 indexes)"
```

---

## Task 3: DB wrapper (`db.ts`)

Thin wrapper that opens the knowledge DB, runs migrations, and returns a handle. Sets sane pragmas. Also provides an in-memory variant for fast ad-hoc verification.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/db.ts`

- [ ] **Step 1: Create `db.ts`**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/db.ts
//
// Opens the knowledge DB at apps/qw-oracle/data/knowledge.db,
// applies migrations, returns a better-sqlite3 handle.
// Gitignored - regenerable from extractor JSON.

import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { applySchema } from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = join(__dirname, '..', '..', 'data', 'knowledge.db');

export function openKnowledgeDb(options: { path?: string; inMemory?: boolean } = {}): Database.Database {
  const target = options.inMemory ? ':memory:' : (options.path ?? DEFAULT_DB_PATH);

  if (!options.inMemory) {
    mkdirSync(dirname(target), { recursive: true });
  }

  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  applySchema(db);
  return db;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Manual verification - schema applies cleanly**

Run an inline tsx check:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npx tsx -e "
import { openKnowledgeDb } from './scripts/load-knowledge/db.js';
const db = openKnowledgeDb({ inMemory: true });
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").all();
console.log('Tables:', tables.map((t) => t.name).join(', '));
const v = db.prepare(\"SELECT value FROM schema_meta WHERE key='schema_version'\").get();
console.log('schema_version:', v?.value);
"
```

Expected output (tables alphabetical; schema_version=1):

```
Tables: change_events, cmdline_param_versions, command_versions, cvar_versions, entities, macro_versions, schema_meta, source_state_transitions, versions
schema_version: 1
```

- [ ] **Step 4: Gitignore `data/knowledge.db`**

Check whether `apps/qw-oracle/data/` is already gitignored. Run:

```bash
grep -n "knowledge.db\|apps/qw-oracle/data" /home/paradoks/projects/quakeworld/.gitignore
```

If `apps/qw-oracle/data/` is broadly ignored already, do nothing. Otherwise append:

```bash
echo "apps/qw-oracle/data/knowledge.db" >> /home/paradoks/projects/quakeworld/.gitignore
echo "apps/qw-oracle/data/knowledge.db-journal" >> /home/paradoks/projects/quakeworld/.gitignore
echo "apps/qw-oracle/data/knowledge.db-wal" >> /home/paradoks/projects/quakeworld/.gitignore
echo "apps/qw-oracle/data/knowledge.db-shm" >> /home/paradoks/projects/quakeworld/.gitignore
```

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/db.ts .gitignore
git commit -m "feat(qw-oracle): openKnowledgeDb() wrapper + gitignore knowledge.db"
```

---

## Task 4: AST JSON types (`types.ts`)

Declare TS types that mirror the exact shape of `packages/qw-config/src/data/ezquake-variables-ast.json` so the loader can parse it without surprises. Also declare narrower DB-row types used by upsert helpers downstream.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/types.ts`

- [ ] **Step 1: Sample-check the JSON shape**

Confirm the fields. From the command line:

```bash
python3 -c "
import json
with open('/home/paradoks/projects/quakeworld/packages/qw-config/src/data/ezquake-variables-ast.json') as f:
    d = json.load(f)
print('top keys:', list(d.keys()))
print('first var:')
name = list(d['vars'].keys())[0]
print(name, json.dumps(d['vars'][name], indent=2))
"
```

Expected keys on every variable entry: `type`, `group-id`, `default`, `server-only`, `ast`, `desc`, and optionally `remarks`, `values`. `ast` is `null` for help-only entries, otherwise contains: `c_ident`, `source_file`, `source_line`, `source_column`, `storage_class`, `flags_raw`, `flag_names`, `on_change`, `group_name_in_source`, `min_bound`, `max_bound`, `trailing_comment`.

- [ ] **Step 2: Create `types.ts`**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/types.ts
//
// Mirrors the extractor JSON format produced by
// packages/qw-config/scripts/extract-ezquake-cvars-clang.py
// (output: packages/qw-config/src/data/ezquake-variables-ast.json).

export type Project = 'ezquake' | 'fte' | 'mvdsv' | 'ktx';
export type EntityType = 'cvar' | 'command' | 'macro' | 'cmdline_param';
export type SourceState =
  | 'source_backed'
  | 'source_retired'
  | 'doc_only'
  | 'dynamically_registered';
export type ChangeKind = 'created' | 'modified' | 'deleted';
export type EnrichmentSource = 'git' | 'github_api';
export type TransitionReason =
  | 'initial_observation'
  | 'removed_from_head'
  | 're_added'
  | 'backfill_match'
  | 'manual_update';

export interface AstBlock {
  c_ident: string;
  source_file: string;
  source_line: number;
  source_column: number;
  storage_class: string | null;
  flags_raw: string | null;
  flag_names: string[];
  on_change: string | null;
  group_name_in_source: string | null;
  min_bound: string | null;
  max_bound: string | null;
  trailing_comment: string | null;
}

export interface VariableEntry {
  type?: string;
  'group-id'?: string;
  default?: string | number | boolean;
  'server-only'?: boolean;
  ast: AstBlock | null;
  desc?: string;
  remarks?: string;
  values?: unknown;
}

export interface GroupDef {
  id: string;
  'major-group'?: string;
  name?: string;
}

export interface ExtractorOutput {
  groups: GroupDef[];
  vars: Record<string, VariableEntry>;
  _stats?: Record<string, unknown>;
}

export interface EntityRow {
  project: Project;
  type: EntityType;
  name: string;
  canonical_id: string;
  first_seen_version: string;
  last_seen_version: string;
  source_state: SourceState;
  predecessor_id: number | null;
}

export interface CvarVersionRow {
  entity_id: number;
  version: string;

  help_desc: string | null;
  help_remarks: string | null;
  help_values: string | null;
  help_group_id: string | null;
  help_type: string | null;

  default_value: string | null;
  flags_raw: string | null;
  flag_names: string | null;
  on_change: string | null;
  min_bound: string | null;
  max_bound: string | null;
  source_file: string | null;
  source_line: number | null;
  source_column: number | null;
  storage_class: string | null;
  group_name_in_source: string | null;
  trailing_comment: string | null;
  server_only: number;

  raw_ast_hash: string | null;
  extracted_at: string;
}

export interface VersionRow {
  project: Project;
  version: string;
  commit_sha: string;
  tag_date: string | null;
  ordinal: number;
  parse_state: 'ok' | 'partial';
  notes: string | null;
  extracted_at: string;
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/types.ts
git commit -m "feat(qw-oracle): TS types for AST extractor output + DB rows"
```

---

## Task 5: Natural-key upsert helpers (`natural-keys.ts`)

Small pure functions for idempotent INSERT OR REPLACE on entities, versions, and cvar_versions. Callers pass a db handle; helpers own nothing.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts`

- [ ] **Step 1: Create `natural-keys.ts`**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/natural-keys.ts
//
// Idempotent upsert helpers. Natural keys per spec:
//   versions           (project, version)
//   entities           (project, type, name)
//   cvar_versions      (entity_id, version)

import type Database from 'better-sqlite3';
import type {
  CvarVersionRow,
  EntityType,
  Project,
  SourceState,
  VersionRow,
} from './types.js';

export function canonicalIdFor(project: Project, type: EntityType, name: string): string {
  return `${project}:${type}:${name.toLowerCase()}`;
}

export function upsertVersion(
  db: Database.Database,
  row: VersionRow,
): { id: number } {
  const stmt = db.prepare(`
    INSERT INTO versions (project, version, commit_sha, tag_date, ordinal, parse_state, notes, extracted_at)
    VALUES (@project, @version, @commit_sha, @tag_date, @ordinal, @parse_state, @notes, @extracted_at)
    ON CONFLICT(project, version) DO UPDATE SET
      commit_sha = excluded.commit_sha,
      tag_date = excluded.tag_date,
      ordinal = excluded.ordinal,
      parse_state = excluded.parse_state,
      notes = excluded.notes,
      extracted_at = excluded.extracted_at
    RETURNING id
  `);
  const result = stmt.get(row) as { id: number };
  return result;
}

export interface UpsertEntityInput {
  project: Project;
  type: EntityType;
  name: string;
  first_seen_version: string;
  last_seen_version: string;
  source_state: SourceState;
}

export interface UpsertEntityResult {
  id: number;
  isNew: boolean;
  prevSourceState: SourceState | null;
}

export function upsertEntity(
  db: Database.Database,
  input: UpsertEntityInput,
): UpsertEntityResult {
  const lowercaseName = input.name.toLowerCase();
  const canonical = canonicalIdFor(input.project, input.type, lowercaseName);
  const now = new Date().toISOString();

  const existing = db
    .prepare(`SELECT id, source_state, first_seen_version, last_seen_version FROM entities
              WHERE project = ? AND type = ? AND name = ?`)
    .get(input.project, input.type, lowercaseName) as
      | { id: number; source_state: SourceState; first_seen_version: string; last_seen_version: string }
      | undefined;

  if (existing) {
    db.prepare(`
      UPDATE entities
      SET last_seen_version = ?,
          updated_at = ?
      WHERE id = ?
    `).run(input.last_seen_version, now, existing.id);
    return { id: existing.id, isNew: false, prevSourceState: existing.source_state };
  }

  const insertResult = db.prepare(`
    INSERT INTO entities (project, type, name, canonical_id, first_seen_version, last_seen_version, source_state, predecessor_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    RETURNING id
  `).get(
    input.project,
    input.type,
    lowercaseName,
    canonical,
    input.first_seen_version,
    input.last_seen_version,
    input.source_state,
    now,
    now,
  ) as { id: number };

  return { id: insertResult.id, isNew: true, prevSourceState: null };
}

export function setEntitySourceState(
  db: Database.Database,
  entityId: number,
  newState: SourceState,
): void {
  const now = new Date().toISOString();
  db.prepare(`UPDATE entities SET source_state = ?, updated_at = ? WHERE id = ?`).run(newState, now, entityId);
}

export function extendFirstSeenVersion(
  db: Database.Database,
  entityId: number,
  earlierVersion: string,
): void {
  const now = new Date().toISOString();
  db.prepare(`UPDATE entities SET first_seen_version = ?, updated_at = ? WHERE id = ?`).run(earlierVersion, now, entityId);
}

export function upsertCvarVersion(db: Database.Database, row: CvarVersionRow): void {
  db.prepare(`
    INSERT OR REPLACE INTO cvar_versions (
      entity_id, version,
      help_desc, help_remarks, help_values, help_group_id, help_type,
      default_value, flags_raw, flag_names, on_change, min_bound, max_bound,
      source_file, source_line, source_column, storage_class, group_name_in_source,
      trailing_comment, server_only, raw_ast_hash, extracted_at
    ) VALUES (
      @entity_id, @version,
      @help_desc, @help_remarks, @help_values, @help_group_id, @help_type,
      @default_value, @flags_raw, @flag_names, @on_change, @min_bound, @max_bound,
      @source_file, @source_line, @source_column, @storage_class, @group_name_in_source,
      @trailing_comment, @server_only, @raw_ast_hash, @extracted_at
    )
  `).run(row);
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Manual verification - upsert idempotency smoke test**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npx tsx -e "
import { openKnowledgeDb } from './scripts/load-knowledge/db.js';
import { upsertVersion, upsertEntity, upsertCvarVersion } from './scripts/load-knowledge/natural-keys.js';

const db = openKnowledgeDb({ inMemory: true });
const now = new Date().toISOString();

upsertVersion(db, { project: 'ezquake', version: 'head', commit_sha: 'abc', tag_date: null, ordinal: 99, parse_state: 'ok', notes: null, extracted_at: now });

const first = upsertEntity(db, { project: 'ezquake', type: 'cvar', name: 'cl_bob', first_seen_version: 'head', last_seen_version: 'head', source_state: 'source_backed' });
const second = upsertEntity(db, { project: 'ezquake', type: 'cvar', name: 'cl_bob', first_seen_version: 'head', last_seen_version: 'head', source_state: 'source_backed' });

console.log('first:', first);
console.log('second:', second);
console.log('entity count:', db.prepare('SELECT COUNT(*) AS n FROM entities').get());
"
```

Expected: first.isNew=true, second.isNew=false, entity count=1.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/natural-keys.ts
git commit -m "feat(qw-oracle): natural-key upsert helpers for entities + versions"
```

---

## Task 6: Source-state transition logger (`transitions.ts`)

Append-only writer for `source_state_transitions`. Called by load-version (initial observation, backfill match) and diff stages (removed_from_head, re_added).

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/transitions.ts`

- [ ] **Step 1: Create `transitions.ts`**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/transitions.ts

import type Database from 'better-sqlite3';
import type { SourceState, TransitionReason } from './types.js';

export interface TransitionInput {
  entity_id: number;
  from_state: SourceState | '';
  to_state: SourceState;
  reason: TransitionReason;
  version_context: string | null;
  extractor_run_id: string;
}

export function logTransition(db: Database.Database, input: TransitionInput): void {
  db.prepare(`
    INSERT INTO source_state_transitions
      (entity_id, from_state, to_state, reason, version_context, extractor_run_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.entity_id,
    input.from_state,
    input.to_state,
    input.reason,
    input.version_context,
    input.extractor_run_id,
    new Date().toISOString(),
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/transitions.ts
git commit -m "feat(qw-oracle): source_state_transitions append-only logger"
```

---

## Task 7: Load-version stage (`load-version.ts`) + CLI entry

Reads an AST extractor JSON, upserts `versions`, `entities`, `cvar_versions`, writes `initial_observation` transitions. No change events.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`
- Create: `apps/qw-oracle/scripts/load-knowledge/index.ts`

- [ ] **Step 1: Create `load-version.ts`**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/load-version.ts
//
// Stage 1 of the loader pipeline: ingest one (project, version) pair's
// JSON output into the knowledge DB.
//
// Per spec:
//   - Upsert versions row
//   - Upsert entities rows (preserve first_seen_version on creation;
//     extend last_seen_version to this version if ordinal is later)
//   - Upsert cvar_versions rows
//   - Emit source_state_transitions rows on initial observation
//   - Write schema_meta operational keys
//   - NO change events - that is the diff stage's job.

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import Database from 'better-sqlite3';
import { ulid } from 'ulid';
import {
  extendFirstSeenVersion,
  setEntitySourceState,
  upsertCvarVersion,
  upsertEntity,
  upsertVersion,
} from './natural-keys.js';
import { logTransition } from './transitions.js';
import type {
  CvarVersionRow,
  EntityType,
  ExtractorOutput,
  Project,
  SourceState,
  VariableEntry,
} from './types.js';

export interface LoadVersionOptions {
  db: Database.Database;
  project: Project;
  version: string;
  type: EntityType;
  jsonPath: string;
  commitSha: string;
  tagDate: string | null;
  ordinal: number;
  parseState?: 'ok' | 'partial';
  notes?: string | null;
  extractorVersion: string;
  forceOverwrite?: boolean;
}

export interface LoadVersionResult {
  extractorRunId: string;
  entitiesUpserted: number;
  versionsUpserted: number;
  transitionsLogged: number;
  entityCount: number;
  parseState: 'ok' | 'partial';
}

const PARTIAL_DROP_GUARD_RATIO = 0.5;

export function loadVersion(options: LoadVersionOptions): LoadVersionResult {
  if (options.type !== 'cvar') {
    throw new Error(`Phase 2b load-version only handles type=cvar; got ${options.type}`);
  }

  const extractorRunId = ulid();
  const now = new Date().toISOString();

  const raw = readFileSync(options.jsonPath, 'utf-8');
  const payload = JSON.parse(raw) as ExtractorOutput;

  const entryCount = Object.keys(payload.vars).length;

  const priorRowCount = options.db.prepare(`
    SELECT COUNT(*) AS n FROM cvar_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND cv.version = ?
  `).get(options.project, options.version) as { n: number };

  if (priorRowCount.n > 0 && entryCount === 0 && !options.forceOverwrite) {
    throw new Error(
      `Regression: prior run populated ${priorRowCount.n} rows for ${options.project}@${options.version}, ` +
      `current JSON has zero. Aborting. Use --force to override.`
    );
  }

  let parseStateFinal: 'ok' | 'partial' = options.parseState ?? 'ok';
  if (priorRowCount.n > 0 && entryCount < priorRowCount.n * PARTIAL_DROP_GUARD_RATIO) {
    if (!options.forceOverwrite) {
      throw new Error(
        `Entity count dropped from ${priorRowCount.n} to ${entryCount} ` +
        `(>${(1 - PARTIAL_DROP_GUARD_RATIO) * 100}% drop). Aborting without --force.`
      );
    }
    parseStateFinal = 'partial';
    console.warn(
      `[load-version] entity count drop from ${priorRowCount.n} to ${entryCount}; ` +
      `marking version.parse_state='partial'.`
    );
  }

  const txn = options.db.transaction(() => {
    upsertVersion(options.db, {
      project: options.project,
      version: options.version,
      commit_sha: options.commitSha,
      tag_date: options.tagDate,
      ordinal: options.ordinal,
      parse_state: parseStateFinal,
      notes: options.notes ?? null,
      extracted_at: now,
    });

    let upserted = 0;
    let transitions = 0;

    for (const [nameRaw, entry] of Object.entries(payload.vars)) {
      const name = nameRaw.toLowerCase();
      if (!/^[a-z0-9_.]+$/.test(name)) {
        console.warn(`[load-version] skipping entity with invalid name: ${nameRaw}`);
        continue;
      }

      const sourceBacked = entry.ast !== null;
      const initialSourceState: SourceState = sourceBacked ? 'source_backed' : 'doc_only';

      const upsertResult = upsertEntity(options.db, {
        project: options.project,
        type: options.type,
        name,
        first_seen_version: options.version,
        last_seen_version: options.version,
        source_state: initialSourceState,
      });

      if (upsertResult.isNew) {
        logTransition(options.db, {
          entity_id: upsertResult.id,
          from_state: '',
          to_state: initialSourceState,
          reason: 'initial_observation',
          version_context: options.version,
          extractor_run_id: extractorRunId,
        });
        transitions += 1;
      } else if (upsertResult.prevSourceState === 'doc_only' && sourceBacked) {
        setEntitySourceState(options.db, upsertResult.id, 'source_backed');
        logTransition(options.db, {
          entity_id: upsertResult.id,
          from_state: 'doc_only',
          to_state: 'source_backed',
          reason: 'backfill_match',
          version_context: options.version,
          extractor_run_id: extractorRunId,
        });
        transitions += 1;

        const ent = options.db.prepare(`SELECT first_seen_version FROM entities WHERE id = ?`).get(upsertResult.id) as { first_seen_version: string };
        if (ent.first_seen_version > options.version) {
          extendFirstSeenVersion(options.db, upsertResult.id, options.version);
        }
      }

      upsertCvarVersion(options.db, cvarVersionRowFromEntry(upsertResult.id, options.version, entry, now));
      upserted += 1;
    }

    const setMeta = options.db.prepare(`
      INSERT INTO schema_meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    setMeta.run('last_extraction_run_at', now);
    setMeta.run('extractor_version', options.extractorVersion);
    setMeta.run(`${options.project}:source_repo_commit`, options.commitSha);
    setMeta.run(`${options.project}:source_repo_tag`, options.tagDate ? options.version : '');

    return { upserted, transitions };
  });

  const { upserted, transitions } = txn();

  return {
    extractorRunId,
    entitiesUpserted: upserted,
    versionsUpserted: 1,
    transitionsLogged: transitions,
    entityCount: entryCount,
    parseState: parseStateFinal,
  };
}

function cvarVersionRowFromEntry(
  entityId: number,
  version: string,
  entry: VariableEntry,
  now: string,
): CvarVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,

    help_desc: entry.desc ?? null,
    help_remarks: entry.remarks ?? null,
    help_values: entry.values == null ? null : JSON.stringify(entry.values),
    help_group_id: entry['group-id'] ?? null,
    help_type: entry.type ?? null,

    default_value: entry.default == null ? null : String(entry.default),
    flags_raw: ast?.flags_raw ?? null,
    flag_names: ast?.flag_names ? JSON.stringify(ast.flag_names) : null,
    on_change: ast?.on_change ?? null,
    min_bound: ast?.min_bound ?? null,
    max_bound: ast?.max_bound ?? null,
    source_file: ast?.source_file ?? null,
    source_line: ast?.source_line ?? null,
    source_column: ast?.source_column ?? null,
    storage_class: ast?.storage_class ?? null,
    group_name_in_source: ast?.group_name_in_source ?? null,
    trailing_comment: ast?.trailing_comment ?? null,
    server_only: entry['server-only'] ? 1 : 0,

    raw_ast_hash,
    extracted_at: now,
  };
}
```

- [ ] **Step 2: Create CLI entry `index.ts`**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/index.ts
//
// CLI dispatcher: load-knowledge <subcommand> [...args]
// Subcommands: load-version, diff, enrich

import { parseArgs } from 'util';
import { openKnowledgeDb } from './db.js';
import { loadVersion } from './load-version.js';
import type { EntityType, Project } from './types.js';

async function main(): Promise<void> {
  const [, , subcommand, ...rest] = process.argv;

  if (!subcommand) {
    usageAndExit();
  }

  if (subcommand === 'load-version') {
    await runLoadVersion(rest);
    return;
  }

  if (subcommand === 'diff' || subcommand === 'enrich' || subcommand === 'full') {
    throw new Error(`subcommand '${subcommand}' is implemented in a later task of this plan.`);
  }

  usageAndExit();
}

function usageAndExit(): never {
  console.error(`
load-knowledge <subcommand> [...args]

Subcommands:
  load-version  --project <p> --version <v> --type <cvar> --json <path>
                --commit <sha> --ordinal <n> [--tag-date <iso8601>]
                [--extractor-version <s>] [--force]
  diff          --project <p> --from <v1> --to <v2>
  enrich        --project <p> --github-token <token> [--limit <n>]
`.trim());
  process.exit(2);
}

async function runLoadVersion(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      version: { type: 'string' },
      type: { type: 'string' },
      json: { type: 'string' },
      commit: { type: 'string' },
      ordinal: { type: 'string' },
      'tag-date': { type: 'string' },
      'extractor-version': { type: 'string' },
      force: { type: 'boolean' },
    },
  });

  for (const required of ['project', 'version', 'type', 'json', 'commit', 'ordinal'] as const) {
    if (!values[required]) {
      throw new Error(`--${required} is required`);
    }
  }

  const db = openKnowledgeDb();
  try {
    const result = loadVersion({
      db,
      project: values.project as Project,
      version: values.version!,
      type: values.type as EntityType,
      jsonPath: values.json!,
      commitSha: values.commit!,
      tagDate: values['tag-date'] ?? null,
      ordinal: Number(values.ordinal),
      extractorVersion: values['extractor-version'] ?? 'clang-ezquake-cvars@1.0.0',
      forceOverwrite: values.force ?? false,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Manual verification - load the HEAD JSON into a fresh DB**

From the qw-oracle directory:

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
# Remove any prior run, start fresh
rm -f data/knowledge.db data/knowledge.db-journal data/knowledge.db-wal data/knowledge.db-shm

# Grab current ezquake HEAD commit
HEAD_SHA=$(git -C /home/paradoks/projects/quakeworld/research/repos/ezquake-source rev-parse HEAD)

npm run load-knowledge -- load-version \
  --project ezquake \
  --version head \
  --type cvar \
  --json /home/paradoks/projects/quakeworld/packages/qw-config/src/data/ezquake-variables-ast.json \
  --commit $HEAD_SHA \
  --ordinal 1000
```

Expected output (shape, not exact numbers):

```json
{
  "extractorRunId": "01HX...",
  "entitiesUpserted": 2902,
  "versionsUpserted": 1,
  "transitionsLogged": 2902,
  "entityCount": 2902,
  "parseState": "ok"
}
```

- [ ] **Step 5: Hand-query the populated DB**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
sqlite3 data/knowledge.db "
SELECT 'entities' AS tbl, COUNT(*) AS n FROM entities
UNION ALL SELECT 'cvar_versions', COUNT(*) FROM cvar_versions
UNION ALL SELECT 'versions', COUNT(*) FROM versions
UNION ALL SELECT 'transitions', COUNT(*) FROM source_state_transitions
UNION ALL SELECT 'schema_meta', COUNT(*) FROM schema_meta;

SELECT source_state, COUNT(*) FROM entities GROUP BY source_state;

SELECT * FROM cvar_versions WHERE entity_id=(SELECT id FROM entities WHERE canonical_id='ezquake:cvar:cl_bob');
"
```

Expected: `entities` and `cvar_versions` both ~2902, `versions`=1, `transitions` ~2902, `schema_meta` ~6 keys. `source_state` split roughly 2715 source_backed / 187 doc_only. `cl_bob` row shows default_value `0` (or current HEAD value), source_file `cl_view.c`, help_desc populated.

- [ ] **Step 6: Test idempotency**

Re-run the same load command from Step 4. Expected: no duplicates (entity count unchanged), `entitiesUpserted` should still report 2902 (the upserts fired again but rows are replaced in place). Verify via sqlite:

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db "SELECT COUNT(*) FROM entities"
```

Expected: same number as after Step 4.

- [ ] **Step 7: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/load-version.ts apps/qw-oracle/scripts/load-knowledge/index.ts
git commit -m "feat(qw-oracle): load-version stage + CLI for cvar ingestion"
```

---

## Task 8: Git blame wrapper (`git.ts`)

Small module that invokes the `git` CLI via `spawnSync` to resolve the commit SHA that introduced a specific source line. Used by the diff stage. Uses argv array form (no shell), so user input cannot be injected.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/git.ts`

- [ ] **Step 1: Create `git.ts`**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/git.ts
//
// Thin wrapper around the `git` CLI. Uses spawnSync with an argv array
// (no shell interpolation), so repo paths and file names cannot be
// interpreted as shell commands.

import { spawnSync } from 'child_process';

export interface BlameResult {
  commit_sha: string;
  commit_message_excerpt: string;
}

function runGit(repoPath: string, args: string[]): { stdout: string; ok: boolean } {
  const result = spawnSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    return { stdout: '', ok: false };
  }
  return { stdout: result.stdout, ok: true };
}

export function blameLine(
  repoPath: string,
  revision: string,
  filePath: string,
  lineNumber: number,
): BlameResult | null {
  const blame = runGit(repoPath, [
    'blame',
    '-L', `${lineNumber},${lineNumber}`,
    '--porcelain',
    revision,
    '--',
    filePath,
  ]);
  if (!blame.ok) return null;

  const firstLine = blame.stdout.split('\n')[0] ?? '';
  const sha = firstLine.split(' ')[0] ?? '';
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    return null;
  }

  const log = runGit(repoPath, ['log', '-1', '--format=%s%n%b', sha]);
  if (!log.ok) {
    return { commit_sha: sha, commit_message_excerpt: '' };
  }

  return {
    commit_sha: sha,
    commit_message_excerpt: log.stdout.slice(0, 300),
  };
}

export function headCommit(repoPath: string): string {
  const result = runGit(repoPath, ['rev-parse', 'HEAD']);
  if (!result.ok) throw new Error(`git rev-parse HEAD failed in ${repoPath}`);
  return result.stdout.trim();
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Manual verification - blame a known line**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npx tsx -e "
import { blameLine, headCommit } from './scripts/load-knowledge/git.js';
const repo = '/home/paradoks/projects/quakeworld/research/repos/ezquake-source';
console.log('HEAD:', headCommit(repo));
console.log('blame cl_view.c line 46:', blameLine(repo, 'HEAD', 'src/cl_view.c', 46));
"
```

Expected: HEAD prints a 40-char SHA. The blame result prints `{ commit_sha: '...', commit_message_excerpt: '...' }` with a SHA and the first line of the commit that most recently touched `cl_view.c:46` (the cl_bob cvar declaration).

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/git.ts
git commit -m "feat(qw-oracle): git blame wrapper for change-event provenance"
```

---

## Task 9: Diff stage (`diff-versions.ts`) + CLI

Reads cvar_versions for two loaded versions of a project, walks entities in parallel by `entity_id`, emits change_events rows per field delta, and handles creation/deletion with source_state transitions.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/diff-versions.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/index.ts`

- [ ] **Step 1: Create `diff-versions.ts`**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/diff-versions.ts
//
// Stage 2 of the loader pipeline: compute change_events between two
// already-loaded versions of the same project.
//
// Per spec Section 3 + Section 4:
//   - Modification emits one row per changed substantive field.
//   - Creation emits one row with change_kind='created'; re-added entities
//     also flip source_state back to source_backed and log transition.
//   - Deletion emits one row with change_kind='deleted'; loader flips
//     source_state to source_retired and logs transition.
//   - commit_sha populated via git blame at the to-version source_file:source_line.
//     (Falls back to 'UNKNOWN' if blame fails; real lines always resolve.)

import type Database from 'better-sqlite3';
import { ulid } from 'ulid';
import { blameLine } from './git.js';
import { setEntitySourceState } from './natural-keys.js';
import { logTransition } from './transitions.js';
import type { ChangeKind, Project } from './types.js';

export interface DiffOptions {
  db: Database.Database;
  project: Project;
  fromVersion: string;
  toVersion: string;
  ezquakeRepoPath: string;
}

export interface DiffResult {
  extractorRunId: string;
  changeEventsInserted: number;
  creationsEmitted: number;
  modificationsEmitted: number;
  deletionsEmitted: number;
  transitionsLogged: number;
}

const DIFFABLE_CVAR_FIELDS = [
  'default_value',
  'flags_raw',
  'flag_names',
  'on_change',
  'min_bound',
  'max_bound',
  'help_desc',
  'help_remarks',
  'help_values',
  'help_type',
  'source_file',
  'server_only',
  'group_name_in_source',
  'trailing_comment',
] as const;

interface CvarRow {
  entity_id: number;
  version: string;
  [col: string]: unknown;
}

export function diffVersions(options: DiffOptions): DiffResult {
  const extractorRunId = ulid();
  const now = new Date().toISOString();

  const fromRows = options.db.prepare(`
    SELECT cv.*, e.id AS entity_id
    FROM cvar_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND cv.version = ?
  `).all(options.project, options.fromVersion) as CvarRow[];

  const toRows = options.db.prepare(`
    SELECT cv.*, e.id AS entity_id
    FROM cvar_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND cv.version = ?
  `).all(options.project, options.toVersion) as CvarRow[];

  if (fromRows.length === 0 && toRows.length === 0) {
    throw new Error(
      `Neither version has cvar rows. Did you run load-version for --from ${options.fromVersion} and --to ${options.toVersion}?`
    );
  }

  const fromByEntity = new Map<number, CvarRow>();
  const toByEntity = new Map<number, CvarRow>();
  for (const r of fromRows) fromByEntity.set(r.entity_id, r);
  for (const r of toRows) toByEntity.set(r.entity_id, r);

  const allIds = new Set<number>([...fromByEntity.keys(), ...toByEntity.keys()]);

  const insertEvent = options.db.prepare(`
    INSERT OR REPLACE INTO change_events (
      entity_id, from_version, to_version, change_kind, field_name,
      old_value, new_value, commit_sha, commit_message_excerpt,
      enrichment_source, extracted_at
    ) VALUES (
      @entity_id, @from_version, @to_version, @change_kind, @field_name,
      @old_value, @new_value, @commit_sha, @commit_message_excerpt,
      'git', @extracted_at
    )
  `);

  let creations = 0;
  let modifications = 0;
  let deletions = 0;
  let transitions = 0;

  const txn = options.db.transaction(() => {
    for (const entityId of allIds) {
      const fromRow = fromByEntity.get(entityId);
      const toRow = toByEntity.get(entityId);

      if (!fromRow && toRow) {
        const blame = resolveBlame(options, toRow);
        insertEvent.run({
          entity_id: entityId,
          from_version: null,
          to_version: options.toVersion,
          change_kind: 'created' as ChangeKind,
          field_name: '',
          old_value: null,
          new_value: null,
          commit_sha: blame.commit_sha,
          commit_message_excerpt: blame.commit_message_excerpt,
          extracted_at: now,
        });
        creations += 1;

        const prev = options.db.prepare(`SELECT source_state FROM entities WHERE id = ?`).get(entityId) as { source_state: string };
        if (prev.source_state === 'source_retired') {
          setEntitySourceState(options.db, entityId, 'source_backed');
          logTransition(options.db, {
            entity_id: entityId,
            from_state: 'source_retired',
            to_state: 'source_backed',
            reason: 're_added',
            version_context: options.toVersion,
            extractor_run_id: extractorRunId,
          });
          transitions += 1;
        }
        continue;
      }

      if (fromRow && !toRow) {
        const blame = resolveBlame(options, fromRow);
        insertEvent.run({
          entity_id: entityId,
          from_version: options.fromVersion,
          to_version: options.toVersion,
          change_kind: 'deleted' as ChangeKind,
          field_name: '',
          old_value: null,
          new_value: null,
          commit_sha: blame.commit_sha,
          commit_message_excerpt: blame.commit_message_excerpt,
          extracted_at: now,
        });
        deletions += 1;

        setEntitySourceState(options.db, entityId, 'source_retired');
        logTransition(options.db, {
          entity_id: entityId,
          from_state: 'source_backed',
          to_state: 'source_retired',
          reason: 'removed_from_head',
          version_context: options.toVersion,
          extractor_run_id: extractorRunId,
        });
        transitions += 1;
        continue;
      }

      if (fromRow && toRow) {
        for (const field of DIFFABLE_CVAR_FIELDS) {
          const oldRaw = fromRow[field];
          const newRaw = toRow[field];
          if (!valuesDiffer(oldRaw, newRaw)) continue;
          const blame = resolveBlame(options, toRow);
          insertEvent.run({
            entity_id: entityId,
            from_version: options.fromVersion,
            to_version: options.toVersion,
            change_kind: 'modified' as ChangeKind,
            field_name: field,
            old_value: stringifyOrNull(oldRaw),
            new_value: stringifyOrNull(newRaw),
            commit_sha: blame.commit_sha,
            commit_message_excerpt: blame.commit_message_excerpt,
            extracted_at: now,
          });
          modifications += 1;
        }
      }
    }
  });

  txn();

  return {
    extractorRunId,
    changeEventsInserted: creations + modifications + deletions,
    creationsEmitted: creations,
    modificationsEmitted: modifications,
    deletionsEmitted: deletions,
    transitionsLogged: transitions,
  };
}

function resolveBlame(options: DiffOptions, row: CvarRow): { commit_sha: string; commit_message_excerpt: string | null } {
  const file = row.source_file as string | null;
  const line = row.source_line as number | null;
  if (!file || !line) {
    return { commit_sha: 'UNKNOWN', commit_message_excerpt: null };
  }
  const result = blameLine(options.ezquakeRepoPath, 'HEAD', `src/${file}`, line);
  if (!result) {
    return { commit_sha: 'UNKNOWN', commit_message_excerpt: null };
  }
  return result;
}

function valuesDiffer(a: unknown, b: unknown): boolean {
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return false;
  if (aNull !== bNull) return true;
  return String(a) !== String(b);
}

function stringifyOrNull(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}
```

- [ ] **Step 2: Extend `index.ts` with the `diff` subcommand**

Replace the block that currently throws `subcommand '${subcommand}' is implemented in a later task of this plan.` with:

```ts
  if (subcommand === 'diff') {
    await runDiff(rest);
    return;
  }

  if (subcommand === 'enrich' || subcommand === 'full') {
    throw new Error(`subcommand '${subcommand}' is implemented in a later task of this plan.`);
  }
```

Then add a new function below `runLoadVersion`:

```ts
async function runDiff(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      'ezquake-repo': { type: 'string' },
    },
  });

  for (const required of ['project', 'from', 'to'] as const) {
    if (!values[required]) {
      throw new Error(`--${required} is required`);
    }
  }

  const { diffVersions } = await import('./diff-versions.js');
  const db = openKnowledgeDb();
  try {
    const result = diffVersions({
      db,
      project: values.project as Project,
      fromVersion: values.from!,
      toVersion: values.to!,
      ezquakeRepoPath: values['ezquake-repo'] ?? '/home/paradoks/projects/quakeworld/research/repos/ezquake-source',
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/diff-versions.ts apps/qw-oracle/scripts/load-knowledge/index.ts
git commit -m "feat(qw-oracle): diff stage - change_events + state transitions"
```

---

## Task 10: GitHub API client (`github.ts`)

Minimal fetch client for `GET /repos/{owner}/{repo}/commits/{sha}/pulls`. Tracks rate-limit headers. Requires a PAT. No third-party HTTP library; Node 20's built-in `fetch` handles it.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/github.ts`

- [ ] **Step 1: Create `github.ts`**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/github.ts
//
// Narrow client for the GitHub REST API endpoints we need for PR enrichment.
// Requires a personal access token (passed via --github-token or GITHUB_TOKEN).

export interface PrInfo {
  pr_number: number;
  pr_title: string;
  pr_body: string;
  linked_issues: number[];
}

export interface RateLimitSnapshot {
  limit: number;
  remaining: number;
  reset_at_unix: number;
}

export class GitHubClient {
  private readonly token: string;
  private lastRateLimit: RateLimitSnapshot | null = null;

  constructor(token: string) {
    if (!token) {
      throw new Error('GitHub token is required; set --github-token or GITHUB_TOKEN');
    }
    this.token = token;
  }

  getRateLimit(): RateLimitSnapshot | null {
    return this.lastRateLimit;
  }

  async getPrsForCommit(owner: string, repo: string, sha: string): Promise<PrInfo | null> {
    if (sha === 'UNKNOWN') return null;
    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/pulls`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'qw-oracle-loader',
      },
    });

    this.updateRateLimit(response.headers);

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status} for ${url}: ${await response.text()}`);
    }

    const pulls = await response.json() as Array<{ number: number; title: string; body: string | null }>;
    if (pulls.length === 0) return null;

    const pull = pulls[0]!;
    const body = pull.body ?? '';
    return {
      pr_number: pull.number,
      pr_title: pull.title,
      pr_body: body,
      linked_issues: parseLinkedIssues(body),
    };
  }

  private updateRateLimit(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining');
    const limit = headers.get('x-ratelimit-limit');
    const reset = headers.get('x-ratelimit-reset');
    if (remaining && limit && reset) {
      this.lastRateLimit = {
        limit: Number(limit),
        remaining: Number(remaining),
        reset_at_unix: Number(reset),
      };
    }
  }
}

function parseLinkedIssues(body: string): number[] {
  const pattern = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  const out: number[] = [];
  for (const match of body.matchAll(pattern)) {
    if (match[1]) out.push(Number(match[1]));
  }
  return [...new Set(out)];
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/github.ts
git commit -m "feat(qw-oracle): GitHub REST client for PR enrichment"
```

---

## Task 11: Enrich stage (`enrich-prs.ts`) + CLI

Loops unenriched change_events grouped by commit_sha, calls GitHub once per unique commit, updates all rows sharing that SHA in one transaction. Pauses when rate-limit remaining drops below 10% of limit.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/enrich-prs.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/index.ts`

- [ ] **Step 1: Create `enrich-prs.ts`**

Content:

```ts
// apps/qw-oracle/scripts/load-knowledge/enrich-prs.ts
//
// Stage 3 of the loader: populate PR metadata on existing change_events rows.
// Groups by commit_sha, calls GitHub once per unique commit, updates all
// rows sharing that SHA in a single transaction.

import type Database from 'better-sqlite3';
import { GitHubClient } from './github.js';
import type { Project } from './types.js';

const PROJECT_REPOS: Record<Project, { owner: string; repo: string }> = {
  ezquake: { owner: 'QW-Group', repo: 'ezquake-source' },
  fte:     { owner: 'fte-team', repo: 'fteqw' },
  mvdsv:   { owner: 'QW-Group', repo: 'mvdsv' },
  ktx:     { owner: 'QW-Group', repo: 'ktx' },
};

export interface EnrichOptions {
  db: Database.Database;
  project: Project;
  githubToken: string;
  limit?: number;
  rateLimitGuardPct?: number;
}

export interface EnrichResult {
  commitsAttempted: number;
  commitsEnriched: number;
  rowsUpdated: number;
  commitsSkipped: number;
  pausedDueToRateLimit: boolean;
  rateLimitRemaining: number | null;
}

export async function enrichPrs(options: EnrichOptions): Promise<EnrichResult> {
  const repoInfo = PROJECT_REPOS[options.project];
  if (!repoInfo) throw new Error(`Unknown project: ${options.project}`);

  const gh = new GitHubClient(options.githubToken);
  const guardPct = options.rateLimitGuardPct ?? 10;

  const limitClause = options.limit ? 'LIMIT ?' : '';
  const query = `
    SELECT DISTINCT ce.commit_sha
    FROM change_events ce
    JOIN entities e ON e.id = ce.entity_id
    WHERE e.project = ?
      AND ce.enrichment_source = 'git'
      AND ce.pr_number IS NULL
      AND ce.commit_sha <> 'UNKNOWN'
    ${limitClause}
  `;
  const commits = options.limit
    ? options.db.prepare(query).all(options.project, options.limit)
    : options.db.prepare(query).all(options.project);

  const updateStmt = options.db.prepare(`
    UPDATE change_events
    SET pr_number = @pr_number,
        pr_title = @pr_title,
        pr_body_excerpt = @pr_body_excerpt,
        linked_issues_json = @linked_issues_json,
        enrichment_source = 'github_api'
    WHERE commit_sha = @commit_sha
  `);

  const markUnlinkedStmt = options.db.prepare(`
    UPDATE change_events
    SET enrichment_source = 'github_api'
    WHERE commit_sha = @commit_sha
  `);

  let attempted = 0;
  let enriched = 0;
  let skipped = 0;
  let rowsUpdated = 0;
  let paused = false;

  for (const row of commits as Array<{ commit_sha: string }>) {
    attempted += 1;

    const rl = gh.getRateLimit();
    if (rl && rl.limit > 0 && (rl.remaining / rl.limit) * 100 < guardPct) {
      paused = true;
      break;
    }

    const pr = await gh.getPrsForCommit(repoInfo.owner, repoInfo.repo, row.commit_sha);

    if (!pr) {
      const result = markUnlinkedStmt.run({ commit_sha: row.commit_sha });
      rowsUpdated += Number(result.changes);
      skipped += 1;
      continue;
    }

    const result = updateStmt.run({
      commit_sha: row.commit_sha,
      pr_number: pr.pr_number,
      pr_title: pr.pr_title,
      pr_body_excerpt: pr.pr_body.slice(0, 500),
      linked_issues_json: JSON.stringify(pr.linked_issues),
    });
    rowsUpdated += Number(result.changes);
    enriched += 1;
  }

  return {
    commitsAttempted: attempted,
    commitsEnriched: enriched,
    rowsUpdated,
    commitsSkipped: skipped,
    pausedDueToRateLimit: paused,
    rateLimitRemaining: gh.getRateLimit()?.remaining ?? null,
  };
}
```

- [ ] **Step 2: Wire `enrich` into `index.ts`**

In `index.ts`, replace the remaining throw-else block:

```ts
  if (subcommand === 'enrich') {
    await runEnrich(rest);
    return;
  }

  if (subcommand === 'full') {
    throw new Error(`subcommand 'full' is out of scope for Phase 2b; run load-version + diff + enrich manually.`);
  }
```

Add the function at the bottom of `index.ts`:

```ts
async function runEnrich(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      'github-token': { type: 'string' },
      limit: { type: 'string' },
    },
  });

  const token = values['github-token'] ?? process.env.GITHUB_TOKEN;
  if (!values.project) throw new Error('--project is required');
  if (!token) throw new Error('--github-token or GITHUB_TOKEN environment variable is required');

  const { enrichPrs } = await import('./enrich-prs.js');
  const db = openKnowledgeDb();
  try {
    const result = await enrichPrs({
      db,
      project: values.project as Project,
      githubToken: token,
      limit: values.limit ? Number(values.limit) : undefined,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/enrich-prs.ts apps/qw-oracle/scripts/load-knowledge/index.ts
git commit -m "feat(qw-oracle): enrich stage - PR metadata from GitHub API"
```

---

## Task 12: End-to-end verification - ezQuake 3.6.9 -> head

Generate a second JSON for tag 3.6.9 (the existing HEAD JSON covers one end of the diff), load both versions, diff them, enrich via GitHub, then hand-verify against known facts from the spike report.

**Facts from the spike report (load-bearing for verification):**
- `cl_fakeshaft` default `0 -> 1` is literally the latest commit on HEAD.
- `cl_pext_lagteleport` default also changed between 3.6.6 and HEAD.
- ~41 new cvars added between 3.6.6 and HEAD, 0 removed.

Between 3.6.9 and HEAD specifically, the deltas are smaller than the 3.6.6 -> HEAD window in the spike but include `cl_fakeshaft`.

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md`
- Modify: `packages/qw-config/scripts/extract-ezquake-cvars-clang.py` (add `--repo-root` arg)

### Sub-step A: Teach the extractor to accept a `--repo-root` argument

- [ ] **Step 1: Patch `packages/qw-config/scripts/extract-ezquake-cvars-clang.py`**

Change the top-of-file path constants section (currently `EZQ_REPO = REPO_ROOT / "research/repos/ezquake-source"`) so the repo and output paths respect CLI flags. Locate the block after `REPO_ROOT = HERE.parent.parent.parent` and replace the hard-coded constants with:

```python
# CLI flags: --repo-root <path>    (default: research/repos/ezquake-source under REPO_ROOT)
#            --output <json-path>  (default: packages/qw-config/src/data/ezquake-variables-ast.json)
import argparse

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = EZQ_REPO / "src"
HELP_JSON = EZQ_REPO / "help_variables.json"
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-variables-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-spike-diagnostics.log"
```

This preserves default behaviour (no flags = same as before), so existing invocations continue to work.

- [ ] **Step 2: Verify the extractor still runs against HEAD with no flags**

```bash
python3 /home/paradoks/projects/quakeworld/packages/qw-config/scripts/extract-ezquake-cvars-clang.py | tail -5
```

Expected: similar tail output to the existing spike (group count, entity count, flag histogram). No errors.

- [ ] **Step 3: Commit the extractor flag**

```bash
cd /home/paradoks/projects/quakeworld
git add packages/qw-config/scripts/extract-ezquake-cvars-clang.py
git commit -m "feat(qw-config): extractor accepts --repo-root and --output flags"
```

### Sub-step B: Generate the 3.6.9 snapshot via git worktree

- [ ] **Step 4: Add a temporary worktree at tag 3.6.9**

```bash
WORKTREE=/tmp/ezquake-3.6.9
git -C /home/paradoks/projects/quakeworld/research/repos/ezquake-source worktree add $WORKTREE 3.6.9
```

Expected: `Preparing worktree (detached HEAD 3.6.9)` and a directory at `/tmp/ezquake-3.6.9`.

- [ ] **Step 5: Run the extractor against 3.6.9**

```bash
python3 /home/paradoks/projects/quakeworld/packages/qw-config/scripts/extract-ezquake-cvars-clang.py \
  --repo-root /tmp/ezquake-3.6.9 \
  --output /home/paradoks/projects/quakeworld/packages/qw-config/src/data/ezquake-variables-ast-3.6.9.json
```

Expected: similar summary output, ~2700 cvars extracted, output file written.

- [ ] **Step 6: Remove the worktree**

```bash
git -C /home/paradoks/projects/quakeworld/research/repos/ezquake-source worktree remove /tmp/ezquake-3.6.9
```

### Sub-step C: Feed both JSONs through the loader

- [ ] **Step 7: Reset knowledge.db and load both versions**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle

# Fresh DB
rm -f data/knowledge.db data/knowledge.db-journal data/knowledge.db-wal data/knowledge.db-shm

# Grab commit SHAs + dates for each version
HEAD_SHA=$(git -C /home/paradoks/projects/quakeworld/research/repos/ezquake-source rev-parse HEAD)
TAG_SHA=$(git -C /home/paradoks/projects/quakeworld/research/repos/ezquake-source rev-list -n 1 3.6.9)
TAG_DATE=$(git -C /home/paradoks/projects/quakeworld/research/repos/ezquake-source log -1 --format=%cI 3.6.9)

# Load 3.6.9 (ordinal 369)
npm run load-knowledge -- load-version \
  --project ezquake --version 3.6.9 --type cvar \
  --json /home/paradoks/projects/quakeworld/packages/qw-config/src/data/ezquake-variables-ast-3.6.9.json \
  --commit $TAG_SHA --ordinal 369 --tag-date $TAG_DATE

# Load head (ordinal 9999)
npm run load-knowledge -- load-version \
  --project ezquake --version head --type cvar \
  --json /home/paradoks/projects/quakeworld/packages/qw-config/src/data/ezquake-variables-ast.json \
  --commit $HEAD_SHA --ordinal 9999
```

Expected: two successful JSON result blobs, each with `entitiesUpserted` ~2700+ and `transitionsLogged` matching on the first run. The second run should log FEWER new transitions (only newly-added entities between 3.6.9 and head).

- [ ] **Step 8: Diff 3.6.9 -> head**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run load-knowledge -- diff \
  --project ezquake --from 3.6.9 --to head
```

Expected: JSON with `changeEventsInserted > 0`, some modifications, some creations. Numbers depend on real delta between 3.6.9 and HEAD.

- [ ] **Step 9: Enrich with a GitHub PAT**

First, if a PAT is not already available:
- Generate one at https://github.com/settings/tokens (classic) with `public_repo` scope.
- Export as env var: `export GITHUB_TOKEN=ghp_...` (do not commit it).

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run load-knowledge -- enrich --project ezquake
```

Expected: commits processed, PRs matched where present, `rateLimitRemaining` printed.

- [ ] **Step 10: Create `e2e-verify.md` with queries + expected shapes**

Write `/home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` with:

````markdown
# E2E verification queries - Phase 2b

Run against `apps/qw-oracle/data/knowledge.db` after loading ezQuake 3.6.9 and head.

## Schema populated

```sql
SELECT 'entities' AS t, COUNT(*) FROM entities
UNION ALL SELECT 'cvar_versions (3.6.9)', COUNT(*) FROM cvar_versions WHERE version='3.6.9'
UNION ALL SELECT 'cvar_versions (head)',  COUNT(*) FROM cvar_versions WHERE version='head'
UNION ALL SELECT 'change_events',         COUNT(*) FROM change_events
UNION ALL SELECT 'transitions',           COUNT(*) FROM source_state_transitions
UNION ALL SELECT 'schema_meta',           COUNT(*) FROM schema_meta;
```

Expected shape (counts approximate):
- entities: 2900+
- cvar_versions 3.6.9: ~2700
- cvar_versions head: ~2900
- change_events: low hundreds (depends on real delta)
- transitions: matches initial entity count + some re-added/removed
- schema_meta: 6+ keys

## cl_fakeshaft default change (spike fact)

```sql
SELECT ce.from_version, ce.to_version, ce.old_value, ce.new_value,
       ce.commit_sha, ce.pr_number, ce.pr_title
FROM change_events ce
JOIN entities e ON e.id = ce.entity_id
WHERE e.canonical_id = 'ezquake:cvar:cl_fakeshaft'
  AND ce.field_name = 'default_value';
```

Expected: at least one row with `old_value='0'`, `new_value='1'`, `commit_sha` populated, `pr_number` populated after enrichment.

## Creations in head not present in 3.6.9

```sql
SELECT e.canonical_id, ce.to_version, ce.commit_sha, ce.pr_title
FROM change_events ce
JOIN entities e ON e.id = ce.entity_id
WHERE e.project='ezquake' AND ce.change_kind='created' AND ce.to_version='head'
ORDER BY e.canonical_id;
```

Expected: the set of new cvars added since 3.6.9. Spot-check at least one against the ezQuake commit log.

## Cvar history of cl_bob

```sql
SELECT cv.version, cv.default_value, cv.source_file, cv.source_line
FROM cvar_versions cv
JOIN entities e ON e.id = cv.entity_id
WHERE e.canonical_id = 'ezquake:cvar:cl_bob'
ORDER BY cv.version;
```

Expected: two rows, one per version, likely identical default values.

## Source-state audit trail

```sql
SELECT reason, COUNT(*)
FROM source_state_transitions
GROUP BY reason;
```

Expected: `initial_observation` >> everything else; small number of `re_added` or `removed_from_head` if the delta shows them.

## schema_meta keys

```sql
SELECT key, value FROM schema_meta ORDER BY key;
```

Expected keys: `schema_version`, `extractor_version`, `last_extraction_run_at`, `last_enrichment_run_at`, `ezquake:source_repo_commit`, `ezquake:source_repo_tag`.
````

- [ ] **Step 11: Run the verification queries against the live DB**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
sqlite3 data/knowledge.db <<'SQL'
.mode column
.headers on

SELECT 'entities' AS t, COUNT(*) AS n FROM entities
UNION ALL SELECT 'cvar_versions 3.6.9', COUNT(*) FROM cvar_versions WHERE version='3.6.9'
UNION ALL SELECT 'cvar_versions head',  COUNT(*) FROM cvar_versions WHERE version='head'
UNION ALL SELECT 'change_events',        COUNT(*) FROM change_events
UNION ALL SELECT 'transitions',          COUNT(*) FROM source_state_transitions;

SELECT ce.from_version, ce.to_version, ce.old_value, ce.new_value, ce.commit_sha, ce.pr_number, ce.pr_title
FROM change_events ce JOIN entities e ON e.id = ce.entity_id
WHERE e.canonical_id='ezquake:cvar:cl_fakeshaft' AND ce.field_name='default_value';

SELECT key, value FROM schema_meta ORDER BY key;
SQL
```

Confirm:
- cvar_versions 3.6.9 has a plausible row count (~2700)
- cvar_versions head is larger than 3.6.9 count
- change_events has a non-zero count
- transitions has rows
- `cl_fakeshaft` change event shows `0 -> 1`
- All expected schema_meta keys present

- [ ] **Step 12: Commit the verification doc**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/e2e-verify.md packages/qw-config/src/data/ezquake-variables-ast-3.6.9.json
git commit -m "feat(qw-oracle): Phase 2b e2e verification doc + 3.6.9 snapshot"
```

- [ ] **Step 13: Final gitignore check**

Confirm `data/knowledge.db` is NOT in the commit (should be gitignored) and that the only committed binary-ish artifact is the 3.6.9 JSON (text, diff-able).

```bash
git log --stat -1
```

Expected: file list includes `e2e-verify.md` and `ezquake-variables-ast-3.6.9.json`, NOT `knowledge.db`.

---

## Phase 2b complete - success criteria

All of the following must be true at the end of Task 12:

1. `npm run typecheck` in `apps/qw-oracle/` passes with zero errors.
2. `apps/qw-oracle/data/knowledge.db` contains populated data for two ezQuake versions (`3.6.9` and `head`).
3. `e2e-verify.md` queries return results matching the spec's intent and the spike report's known facts (notably `cl_fakeshaft` default change 0 -> 1).
4. The loader's three stages (load-version, diff, enrich) each completed at least once against real data.
5. `source_state_transitions` has rows for initial observations, plus (optional) `removed_from_head` / `re_added` / `backfill_match` if the delta produced any.
6. `schema_meta` has keys: `schema_version`, `extractor_version`, `last_extraction_run_at`, `last_enrichment_run_at`, `ezquake:source_repo_commit`, `ezquake:source_repo_tag`.

Next phases (NOT in this plan):
- **Phase 2c:** port ezQuake `commands`, `macros`, `cmdline_params` extractors using the libclang pattern; reuse the loader as-is (the JSON-in / SQL-out contract is already abstracted over `type`).
- **Phase 2d:** FTE cvar extractor + synthetic monthly version walk.
- **Phase 2e:** MVDSV + KTX extractors.
- **Phase 2f:** full historical backfill driven by `load-knowledge full`.
- **Phase 2g:** MCP tool upgrades (`get_entity_history`, `version` param on `lookup_entity`).
- **Phase 2h:** scheduled automation watching upstream tags.
