# QW Knowledge Service POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-layer QuakeWorld knowledge service (extracted facts + interpreted claims + curated concepts) exposed through a local MCP server, wired into Claude Code, demonstrating end-to-end cross-layer retrieval with a single demo query. Serves as the proof-of-concept for a dev-server presentation to domain experts.

**Architecture:** Polyglot persistence inside `apps/qw-oracle/`. Layer 1 (facts) imports existing pre-extracted JSON from `packages/qw-config/src/data/` into SQLite tables with canonical IDs. Layer 2 (claims) reuses the existing 2.66M-message chat corpus in `qw-oracle/data/qw.db`, summarizes a narrow slice via the Anthropic API into a new session-summary table. Layer 3 (concepts) is 3 hand-authored markdown files. An MCP server written in TypeScript exposes three tools (`lookup_entity`, `search_solved_issues`, `get_concept_note`) that query the three layers and return responses with explicit match-quality signals. Claude Code loads the MCP locally for the demo.

**Tech Stack:** Node.js 20+, TypeScript (new for the MCP server), `better-sqlite3`, `@modelcontextprotocol/sdk`, `@anthropic-ai/sdk` (for Layer 2 summarization). Existing qw-oracle scripts remain `.mjs`. No test framework dependency — verification is script-and-query.

**Spec:** `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`

**Branch:** Recommend creating a fresh branch `feature/qw-oracle-poc` from `main` before starting. The current session is on `fix/slipgate-ts-cleanup` which is unrelated. Do not execute this plan on top of unrelated work.

**Testing philosophy:** Per monorepo CLAUDE.md, no TDD and no speculative test infrastructure. Each task has a manual-verification step: run the script, query the DB, call the tool, check the output is sensible. Parser-ish tasks use one-shot verification scripts (`scripts/verify-*.mjs`) that print sample rows for visual check, not test suites.

**Major efficiency finding:** Layer 1 extraction is already done. `packages/qw-config/src/data/ezquake-variables.json` contains 2892 cvars with type/group-id/description. `ezquake-commands.json` contains 523 commands. `ktx-commands.json` contains 326 KTX commands. `fte-variables.json` has FTE cvars. The POC imports these directly into SQLite. **Caveat flagged by user:** these JSON files were produced by iterative scrapers, not a proper AST extractor, and may have gaps. The POC accepts this because it is only proving the *pattern*; a rewrite of the extraction layer with real AST tooling is phase 2 work (see spec open question #2 and `project_extraction_pipeline_vision.md` memory). For the POC demo, imported-JSON is indistinguishable from extracted-from-source.

---

## Context for the executing agent

Read the spec first: `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`. It explains the three-layer model (rigid facts / interpreted claims / curated concepts), the LLM-agnostic serve principle, the canonical ID scheme (`project:type:name[@version]`), and why this POC exists.

**Current state of `apps/qw-oracle/`** (as of this plan, check for drift before starting):

- `CLAUDE.md` describes qw-oracle as "a knowledge base and intelligence system built from 20 years of QuakeWorld community chat history." Existing scope is Layer 2 only. This plan expands it to all three layers without discarding the existing content.
- `VISION.md` already describes the broader multi-source vision — it is ahead of the implementation. Light edits needed to promote the three-layer framing.
- `data/qw.db` is a 1.1 GB SQLite database with 2.66M imported messages (1.94M IRC + 717K Discord), an FTS5 index across 123K conversation sessions, and an `import_log` table tracking idempotent imports.
- `scripts/` has `.mjs` files: `db.mjs` (schema + connection), `import-discord.mjs`, `import-irc.mjs`, `stats.mjs`. These stay.
- No TypeScript yet. This plan introduces TypeScript for the MCP server only; existing `.mjs` stays untouched.
- No MCP server yet.

**External data sources the plan uses:**

- `packages/qw-config/src/data/ezquake-variables.json` — shape: `{groups: [...], vars: {varname: {type, group-id, desc}}}`, 2892 entries
- `packages/qw-config/src/data/ezquake-commands.json` — shape: `{groups: [...], commands: {cmdname: {group-id, desc}}}`, 523 entries
- `packages/qw-config/src/data/ktx-commands.json` — shape: `{commands: {cmdname: {desc}}}`, 326 entries (many with `"desc": "no desc"`)
- `packages/qw-config/src/data/fte-variables.json` — FTE vars, similar shape
- The existing `messages` table in `data/qw.db` for Layer 2 chat slice

**Out of scope for this POC (per spec):** FTE/MVDSV/QWCL full imports beyond FTE vars, processing all 2.66M messages, weighted trust model, identity unification, vector/semantic search, correction feedback loop, pretty frontend, Slipgate helper panel UI wiring, Quad bot integration, web chatbot. Do NOT build any of these. If a task feels like it's pulling in one of these, stop and flag it.

**Non-negotiables from `apps/qw-oracle/CLAUDE.md`:** Raw data is immutable (do not modify existing `messages` rows). All processing is regenerable from raw (new tables are populated from import scripts, not hand-edited). Tag every generated output with model + prompt version (Layer 2 summaries carry `summarizer_model` and `summarizer_prompt_version` columns). SQLite over Postgres. Local-first processing. Source citation on every answer.

---

## File structure

**New files (created by this plan):**

```
apps/qw-oracle/
|-- layers/
|   |-- facts/
|   |   |-- schema.sql                     # Layer 1 SQL schema
|   |   |-- import-from-qw-config.mjs      # JSON -> SQLite importer
|   |-- claims/
|   |   |-- schema.sql                     # Layer 2 SQL schema (additive to existing qw.db)
|   |   |-- pick-slice.mjs                 # Select the chat slice
|   |   |-- summarize-slice.mjs            # Call Anthropic API, write summaries
|   |   |-- prompts/
|   |       |-- session-summary-v1.md      # The summarization prompt
|   |-- concepts/
|       |-- README.md                      # How concept notes work
|       |-- _schema.md                     # Frontmatter schema reference
|       |-- ktx_matchstart_injection.md    # The cross-link demo note
|       |-- ezquake_cvar_anatomy.md
|       |-- qw_command_vs_cvar.md
|-- serve/
|   |-- mcp/
|       |-- package.json                   # TS deps for the MCP server
|       |-- tsconfig.json
|       |-- src/
|       |   |-- index.ts                   # MCP server entry + tool dispatch
|       |   |-- db.ts                      # Shared SQLite connection
|       |   |-- concept-loader.ts          # Reads layers/concepts/*.md
|       |   |-- tools/
|       |   |   |-- lookup-entity.ts
|       |   |   |-- search-solved-issues.ts
|       |   |   |-- get-concept-note.ts
|       |   |-- types.ts                   # Shared response shapes
|       |-- README.md                      # How to run + Claude Code integration
|-- docs/
|   |-- poc-demo-script.md                 # Rehearsed demo query + expected output
|-- scripts/
    |-- verify-layer1.mjs                  # One-shot SQL verification after import
    |-- verify-layer2.mjs                  # One-shot SQL verification after summarize
    |-- verify-concepts.mjs                # Lint concept-note frontmatter
```

**Modified files:**

- `apps/qw-oracle/CLAUDE.md` — restructure around three-layer model, existing chat content becomes Layer 2 section
- `apps/qw-oracle/VISION.md` — promote three-layer framing to top, preserve existing prose
- `apps/qw-oracle/package.json` — add `@anthropic-ai/sdk` as a runtime dep (for Layer 2 summarization)

**Unchanged (do not touch):**

- `apps/qw-oracle/scripts/db.mjs`, `import-discord.mjs`, `import-irc.mjs`, `stats.mjs`
- `apps/qw-oracle/data/qw.db` existing tables (`messages`, `import_log`). New tables are added additively.
- Everything outside `apps/qw-oracle/` except reading from `packages/qw-config/src/data/`

---

## Task map

| Phase | Tasks | What |
|---|---|---|
| A. Scaffolding | 1 | Repurpose qw-oracle: CLAUDE.md, VISION.md, directory structure |
| B. Layer 1 | 2-3 | Schema + import ezQuake/KTX/FTE JSON into SQLite with canonical IDs |
| C. Layer 2 | 4-5 | Schema + pick slice + summarize chat sessions |
| D. Layer 3 | 6 | Concept-note directory + 3 hand-written notes |
| E. MCP serve | 7-9 | Server skeleton + 3 tools (lookup_entity, search_solved_issues, get_concept_note) |
| F. Integration | 10-11 | Claude Code MCP config + demo query rehearsal |

Expected total effort: ~6-10 hours of agentic work, split across 2-4 sessions depending on how stable the summarization prompt is on first pass.

---

## Phase A: Scaffolding

### Task 1: Repurpose qw-oracle for three-layer model

**Files:**
- Modify: `apps/qw-oracle/CLAUDE.md`
- Modify: `apps/qw-oracle/VISION.md`
- Create: `apps/qw-oracle/layers/README.md`
- Create: `apps/qw-oracle/serve/README.md`

- [ ] **Step 1: Create fresh branch from main**

```bash
cd /home/paradoks/projects/quakeworld
git checkout main
git pull
git checkout -b feature/qw-oracle-poc
```

Expected: on a clean `feature/qw-oracle-poc` branch.

- [ ] **Step 2: Read the current `apps/qw-oracle/CLAUDE.md`** so you understand what's there before editing. Do not paraphrase from memory — read the file.

- [ ] **Step 3: Rewrite `apps/qw-oracle/CLAUDE.md`** to reflect the three-layer model. The new structure:

```markdown
# QW Oracle — QuakeWorld Knowledge Service

## Status

Active development. POC phase as of 2026-04-14. See spec: `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md` and plan: `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md`.

## What This Is

A polyglot knowledge service for QuakeWorld. One foundation with three layers, served over MCP so any LLM client can consume it.

- **Layer 1 — Extracted facts.** Deterministic ground truth from source code and structured files. Cvars, commands, macros, match records. SQLite. `layers/facts/`
- **Layer 2 — Interpreted claims.** What the community said, distilled from 2.66M chat messages (IRC + Discord). SQLite + FTS5. `layers/claims/`
- **Layer 3 — Curated concepts.** Hand-written markdown notes that cross-link Layers 1 and 2. Human expertise, LLM-multiplied. `layers/concepts/`
- **Serve layer.** MCP server exposing tools over all three layers. `serve/mcp/`

## Three-layer model

| Layer | Nature | Source | Pipeline | Storage |
|---|---|---|---|---|
| 1. Facts | Rigid | Source code, APIs | Parser -> normalize -> SQL | SQLite |
| 2. Claims | Soft | Chat logs, forums | Filter -> session -> LLM summarize | SQLite + FTS5 |
| 3. Concepts | Curated | Human + LLM | Hand-written | Markdown |

## Canonical IDs

Every entity has a stable ID of the form `<project>:<type>:<name>[@<version>]`:

- `ezquake:cvar:cl_bob`
- `ezquake:cmd:say_team`
- `ktx:cmd:k_matchlock`
- `fte:cvar:cl_rollspeed`
- `session:2020-10-19-helpdesk-ciscon-001`
- `concept:ktx_matchstart_injection`

Layer 2 and Layer 3 reference Layer 1 IDs in their metadata so cross-layer joins work at query time.

## Project Structure

    qw-oracle/
    |-- CLAUDE.md                  # This file
    |-- VISION.md                  # Long-form vision
    |-- data/
    |   |-- qw.db                  # SQLite: messages (raw) + Layer 1 tables + Layer 2 tables (~1.1 GB)
    |-- layers/
    |   |-- facts/                 # Layer 1: extractors, schema, imports
    |   |-- claims/                # Layer 2: chat slice selection, summarization, prompts
    |   |-- concepts/              # Layer 3: hand-written markdown concept notes
    |-- serve/
    |   |-- mcp/                   # MCP server (TypeScript) exposing tools over all 3 layers
    |-- scripts/                   # Legacy imports + new verification scripts
    |   |-- db.mjs                 # Shared DB connection (legacy, Layer 2)
    |   |-- import-discord.mjs     # Discord JSON -> messages
    |   |-- import-irc.mjs         # mIRC logs -> messages
    |   |-- stats.mjs              # DB stats
    |   |-- verify-layer1.mjs      # Post-import Layer 1 sanity check
    |   |-- verify-layer2.mjs      # Post-summarize Layer 2 sanity check
    |   |-- verify-concepts.mjs    # Lint concept-note frontmatter
    |-- docs/                      # Research docs + demo script

## Commands

    # Existing (Layer 2 raw import)
    node scripts/import-discord.mjs ../quad/exports
    node scripts/import-irc.mjs ../quad/exports/mirc-logs
    node scripts/stats.mjs

    # Layer 1: import pre-extracted cvar/command data
    node layers/facts/import-from-qw-config.mjs

    # Layer 2: summarize the POC chat slice
    node layers/claims/pick-slice.mjs
    node layers/claims/summarize-slice.mjs

    # Verification
    node scripts/verify-layer1.mjs
    node scripts/verify-layer2.mjs
    node scripts/verify-concepts.mjs

    # MCP server (see serve/mcp/README.md)
    cd serve/mcp && bun install && bun run dev

## Non-Negotiable Rules

1. Raw data is immutable — never modify imported messages or imported facts
2. All processing is regenerable from the raw layer
3. Tag every generated output with model + prompt version (Layer 2 summaries, MCP tool responses)
4. Keep it simple — scripts over frameworks, SQLite over Postgres
5. Local-first processing — minimize API costs, maximize iteration speed
6. Source citation — every MCP tool response carries canonical IDs pointing to origin

## Tech Stack

- Node.js 20+ with ES modules (Layer 1 importer, Layer 2 summarizer, verification scripts)
- `better-sqlite3` — DB access for both layers
- TypeScript + `@modelcontextprotocol/sdk` (MCP server only)
- `@anthropic-ai/sdk` (Layer 2 summarization pass; model name and prompt version captured in every summary row)
- Ollama on the RTX 4090 is the future path for Layer 2 bulk processing; not used in the POC

## What's NOT in the POC

FTE/MVDSV/QWCL full extractors beyond imported JSON, processing all 2.66M messages, weighted trust model, identity unification, vector search, correction feedback, web/Discord outlet integration, pretty frontend. See the spec for the deferred roadmap.

Layer 1 data provenance note: The JSON in packages/qw-config/src/data/ is the
output of iterative scrapers, not a proper AST-based extractor. It is known
to be incomplete. The POC imports it as-is because it is sufficient to prove
the pattern. The extraction pipeline rewrite with real AST tooling is
tracked as spec open question #2 and `project_extraction_pipeline_vision`
memory — phase-2 work.
```

Notes:
- Keep the existing "Identity Problem" and "Key Stats" sections from the old CLAUDE.md by moving them under a `## Layer 2 — Chat Corpus (Existing)` section at the bottom of the rewrite. Do not lose the 2.66M message stats or the IRC/Discord table.
- Keep the existing "Database Schema" section but rename it to `## Existing raw schema` and note that new Layer 1 and Layer 2 tables are added additively in later tasks.

- [ ] **Step 4: Light-edit `apps/qw-oracle/VISION.md`**. Add a new section near the top titled `## The three-layer model` with a one-paragraph summary of Layer 1 / Layer 2 / Layer 3 and a pointer to the spec. Do not rewrite the existing prose about chat corpus, design intent, and three paths (Oracle Bot / Digest / Time Machine) — those stay.

- [ ] **Step 5: Create subdirectories with placeholder READMEs**

```bash
cd apps/qw-oracle
mkdir -p layers/facts layers/claims/prompts layers/concepts serve/mcp
```

Create `layers/README.md`:

```markdown
# Layers

The three knowledge layers. See `../CLAUDE.md` and `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`.

- `facts/` — Layer 1. Deterministic extraction from source code. SQLite tables.
- `claims/` — Layer 2. LLM-interpreted community claims from chat logs. SQLite + FTS5.
- `concepts/` — Layer 3. Hand-written markdown cross-link notes.
```

Create `serve/README.md`:

```markdown
# Serve

Consumer-facing interfaces. See `../CLAUDE.md`.

- `mcp/` — MCP server in TypeScript, exposes tools over Layers 1-3.
```

- [ ] **Step 6: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/CLAUDE.md apps/qw-oracle/VISION.md apps/qw-oracle/layers apps/qw-oracle/serve
git commit -m "refactor(qw-oracle): reframe as three-layer knowledge service

Restructures CLAUDE.md around Layers 1/2/3 (facts/claims/concepts) + MCP
serve layer. Existing chat corpus becomes Layer 2. Adds layers/ and serve/
subdirectories. No data or code changes yet — this is scaffolding for the
POC implementation plan.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Phase B: Layer 1 — Extracted facts

### Task 2: Layer 1 schema and importer for ezQuake vars + commands + KTX + FTE

**Files:**
- Create: `apps/qw-oracle/layers/facts/schema.sql`
- Create: `apps/qw-oracle/layers/facts/import-from-qw-config.mjs`
- Create: `apps/qw-oracle/scripts/verify-layer1.mjs`

**Why `.mjs` not `.ts`:** Consistency with existing `scripts/*.mjs`. TypeScript is introduced only in `serve/mcp/` where the MCP SDK types add real value. Importers are short and do not need it.

- [ ] **Step 1: Write the Layer 1 schema to `apps/qw-oracle/layers/facts/schema.sql`**

```sql
-- Layer 1: Extracted facts. Deterministic ground truth.
-- All tables prefixed kb_ (knowledge base) to keep them clearly separate from
-- the existing raw `messages` and `import_log` tables.

CREATE TABLE IF NOT EXISTS kb_cvars (
  id                 TEXT PRIMARY KEY,   -- canonical: 'ezquake:cvar:cl_bob'
  project            TEXT NOT NULL,      -- 'ezquake' | 'ktx' | 'fte' | 'mvdsv' | 'qwcl'
  name               TEXT NOT NULL,      -- 'cl_bob'
  type               TEXT,               -- 'float' | 'int' | 'string' | 'bool' | NULL
  group_id           TEXT,               -- upstream group id from source JSON (e.g. '31')
  group_name         TEXT,               -- resolved human-readable group
  major_group        TEXT,               -- resolved top-level category
  default_value      TEXT,               -- raw string default (nullable; source JSON may not provide)
  description        TEXT,               -- from source comment / docs
  source_file        TEXT,               -- NULL for POC (JSON does not carry this yet)
  source_line        INTEGER,            -- NULL for POC
  source_version     TEXT,               -- 'poc' for now; future: pipeline commit SHA
  extraction_method  TEXT NOT NULL,      -- 'scraped-json' | 'ast-extractor' | 'hand-curated' — tells consumers the confidence level of this row
  imported_at        TEXT NOT NULL       -- ISO 8601 UTC
);

CREATE INDEX IF NOT EXISTS idx_kb_cvars_name              ON kb_cvars(name);
CREATE INDEX IF NOT EXISTS idx_kb_cvars_project           ON kb_cvars(project);
CREATE INDEX IF NOT EXISTS idx_kb_cvars_major_group       ON kb_cvars(major_group);
CREATE INDEX IF NOT EXISTS idx_kb_cvars_extraction_method ON kb_cvars(extraction_method);

CREATE TABLE IF NOT EXISTS kb_commands (
  id                 TEXT PRIMARY KEY,   -- canonical: 'ezquake:cmd:say_team'
  project            TEXT NOT NULL,
  name               TEXT NOT NULL,
  group_id           TEXT,
  group_name         TEXT,
  description        TEXT,
  source_file        TEXT,
  source_line        INTEGER,
  source_version     TEXT,
  extraction_method  TEXT NOT NULL,      -- 'scraped-json' | 'ast-extractor' | 'hand-curated'
  imported_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kb_commands_name              ON kb_commands(name);
CREATE INDEX IF NOT EXISTS idx_kb_commands_project           ON kb_commands(project);
CREATE INDEX IF NOT EXISTS idx_kb_commands_extraction_method ON kb_commands(extraction_method);

-- Track each Layer 1 import so re-running is idempotent
CREATE TABLE IF NOT EXISTS kb_facts_import_log (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  project            TEXT NOT NULL,      -- 'ezquake' | 'ktx' | 'fte'
  entity_type        TEXT NOT NULL,      -- 'cvar' | 'cmd'
  source_file        TEXT NOT NULL,      -- path to JSON file
  source_version     TEXT,
  extraction_method  TEXT NOT NULL,      -- matches the rows it produced
  rows_inserted      INTEGER NOT NULL,
  rows_updated       INTEGER NOT NULL,
  imported_at        TEXT NOT NULL
);
```

- [ ] **Step 2: Write the importer at `apps/qw-oracle/layers/facts/import-from-qw-config.mjs`**

Note the hardcoded `SOURCE_VERSION = 'poc'`. A future phase-2 extractor rewrite will pin this to the real extractor commit SHA. For the POC, we do not invoke any shell commands from the script — keeps it simple and avoids flagging security hooks.

```javascript
// Imports pre-extracted ezQuake and FTE vars + ezQuake and KTX commands
// from packages/qw-config/src/data/ into Layer 1 tables with canonical IDs.
//
// Idempotent: re-running replaces rows for the same (project, entity_type).
// Tracks each run in kb_facts_import_log.
//
// KNOWN LIMITATION: the source JSON is from iterative scrapers, not a proper
// AST-based extractor. Data may be incomplete. See spec open question #2 and
// the project_extraction_pipeline_vision memory.

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QW_ORACLE_ROOT = resolve(__dirname, '..', '..');
const MONOREPO_ROOT = resolve(QW_ORACLE_ROOT, '..', '..');
const DATA_DIR = resolve(MONOREPO_ROOT, 'packages', 'qw-config', 'src', 'data');
const DB_PATH = resolve(QW_ORACLE_ROOT, 'data', 'qw.db');
const SCHEMA_PATH = resolve(__dirname, 'schema.sql');

const SOURCE_VERSION = 'poc';
const EXTRACTION_METHOD = 'scraped-json'; // see spec open question #2 and the AST-extractor phase-2 note; this signals row confidence to MCP consumers

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(readFileSync(SCHEMA_PATH, 'utf8'));

const now = () => new Date().toISOString();

function groupLookup(groups) {
  // Builds id -> {name, major_group} from the JSON's groups array.
  const map = new Map();
  for (const g of groups ?? []) {
    map.set(String(g.id ?? g['group-id']), {
      name: g.name ?? null,
      major_group: g['major-group'] ?? null,
    });
  }
  return map;
}

function importCvars({ project, filePath }) {
  const json = JSON.parse(readFileSync(filePath, 'utf8'));
  const groups = groupLookup(json.groups);
  const vars = json.vars ?? {};

  const upsert = db.prepare(`
    INSERT INTO kb_cvars (id, project, name, type, group_id, group_name, major_group, default_value, description, source_file, source_line, source_version, extraction_method, imported_at)
    VALUES (@id, @project, @name, @type, @group_id, @group_name, @major_group, @default_value, @description, @source_file, @source_line, @source_version, @extraction_method, @imported_at)
    ON CONFLICT(id) DO UPDATE SET
      type             = excluded.type,
      group_id         = excluded.group_id,
      group_name       = excluded.group_name,
      major_group      = excluded.major_group,
      default_value    = excluded.default_value,
      description      = excluded.description,
      source_file      = excluded.source_file,
      source_line      = excluded.source_line,
      source_version   = excluded.source_version,
      extraction_method= excluded.extraction_method,
      imported_at      = excluded.imported_at
  `);

  let inserted = 0;
  let updated = 0;
  const existing = new Set(
    db.prepare(`SELECT id FROM kb_cvars WHERE project = ?`).all(project).map(r => r.id)
  );

  const txn = db.transaction(() => {
    for (const [name, data] of Object.entries(vars)) {
      const id = `${project}:cvar:${name}`;
      const groupInfo = groups.get(String(data['group-id'])) ?? { name: null, major_group: null };
      const row = {
        id,
        project,
        name,
        type: data.type ?? null,
        group_id: data['group-id'] ?? null,
        group_name: groupInfo.name,
        major_group: groupInfo.major_group,
        default_value: data.default ?? data['default-value'] ?? null,
        description: data.desc ?? data.description ?? null,
        source_file: null,
        source_line: null,
        source_version: SOURCE_VERSION,
        extraction_method: EXTRACTION_METHOD,
        imported_at: now(),
      };
      upsert.run(row);
      if (existing.has(id)) updated++; else inserted++;
    }
  });
  txn();

  db.prepare(`
    INSERT INTO kb_facts_import_log (project, entity_type, source_file, source_version, extraction_method, rows_inserted, rows_updated, imported_at)
    VALUES (?, 'cvar', ?, ?, ?, ?, ?, ?)
  `).run(project, filePath, SOURCE_VERSION, EXTRACTION_METHOD, inserted, updated, now());

  console.log(`[${project}:cvar] ${inserted} inserted, ${updated} updated (${inserted + updated} total) from ${filePath}`);
}

function importCommands({ project, filePath }) {
  const json = JSON.parse(readFileSync(filePath, 'utf8'));
  // ezquake-commands.json has groups: [...]; ktx-commands.json does not.
  const groups = groupLookup(json.groups);
  const commands = json.commands ?? {};

  const upsert = db.prepare(`
    INSERT INTO kb_commands (id, project, name, group_id, group_name, description, source_file, source_line, source_version, extraction_method, imported_at)
    VALUES (@id, @project, @name, @group_id, @group_name, @description, @source_file, @source_line, @source_version, @extraction_method, @imported_at)
    ON CONFLICT(id) DO UPDATE SET
      group_id         = excluded.group_id,
      group_name       = excluded.group_name,
      description      = excluded.description,
      source_file      = excluded.source_file,
      source_line      = excluded.source_line,
      source_version   = excluded.source_version,
      extraction_method= excluded.extraction_method,
      imported_at      = excluded.imported_at
  `);

  let inserted = 0;
  let updated = 0;
  const existing = new Set(
    db.prepare(`SELECT id FROM kb_commands WHERE project = ?`).all(project).map(r => r.id)
  );

  const txn = db.transaction(() => {
    for (const [name, data] of Object.entries(commands)) {
      const id = `${project}:cmd:${name}`;
      const groupInfo = groups.get(String(data['group-id'])) ?? { name: null, major_group: null };
      const row = {
        id,
        project,
        name,
        group_id: data['group-id'] ?? null,
        group_name: groupInfo.name,
        description: data.desc ?? data.description ?? null,
        source_file: null,
        source_line: null,
        source_version: SOURCE_VERSION,
        extraction_method: EXTRACTION_METHOD,
        imported_at: now(),
      };
      upsert.run(row);
      if (existing.has(id)) updated++; else inserted++;
    }
  });
  txn();

  db.prepare(`
    INSERT INTO kb_facts_import_log (project, entity_type, source_file, source_version, extraction_method, rows_inserted, rows_updated, imported_at)
    VALUES (?, 'cmd', ?, ?, ?, ?, ?, ?)
  `).run(project, filePath, SOURCE_VERSION, EXTRACTION_METHOD, inserted, updated, now());

  console.log(`[${project}:cmd] ${inserted} inserted, ${updated} updated (${inserted + updated} total) from ${filePath}`);
}

importCvars({ project: 'ezquake', filePath: resolve(DATA_DIR, 'ezquake-variables.json') });
importCvars({ project: 'fte',     filePath: resolve(DATA_DIR, 'fte-variables.json')     });
importCommands({ project: 'ezquake', filePath: resolve(DATA_DIR, 'ezquake-commands.json') });
importCommands({ project: 'ktx',     filePath: resolve(DATA_DIR, 'ktx-commands.json')     });

db.close();
console.log('\nLayer 1 import complete.');
```

- [ ] **Step 3: Write the verifier at `apps/qw-oracle/scripts/verify-layer1.mjs`**

```javascript
import Database from 'better-sqlite3';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'data', 'qw.db');
const db = new Database(DB_PATH, { readonly: true });

console.log('=== kb_cvars counts ===');
for (const row of db.prepare(`SELECT project, COUNT(*) AS n FROM kb_cvars GROUP BY project ORDER BY project`).all()) {
  console.log(`  ${row.project}: ${row.n}`);
}

console.log('\n=== kb_commands counts ===');
for (const row of db.prepare(`SELECT project, COUNT(*) AS n FROM kb_commands GROUP BY project ORDER BY project`).all()) {
  console.log(`  ${row.project}: ${row.n}`);
}

console.log('\n=== sample rows (expected to include common cvars) ===');
const samples = [
  'ezquake:cvar:cl_bob',
  'ezquake:cvar:crosshair',
  'ezquake:cvar:sensitivity',
  'ezquake:cmd:say_team',
  'ezquake:cmd:+attack',
];
for (const id of samples) {
  const type = id.includes(':cvar:') ? 'kb_cvars' : 'kb_commands';
  const row = db.prepare(`SELECT id, name, type, major_group, group_name, substr(description, 1, 80) AS desc FROM ${type} WHERE id = ?`).get(id);
  console.log(' ', row ?? `NOT FOUND: ${id}`);
}

console.log('\n=== import log (latest 6 runs) ===');
for (const row of db.prepare(`SELECT * FROM kb_facts_import_log ORDER BY id DESC LIMIT 6`).all()) {
  console.log(`  [${row.imported_at}] ${row.project}:${row.entity_type} ${row.rows_inserted}+${row.rows_updated} from ${row.source_file}`);
}

db.close();
```

- [ ] **Step 4: Run the importer and verify output**

```bash
cd apps/qw-oracle
node layers/facts/import-from-qw-config.mjs
```

Expected output (rough):
```
[ezquake:cvar] 2892 inserted, 0 updated (2892 total) from .../ezquake-variables.json
[fte:cvar] ~2100 inserted, 0 updated from .../fte-variables.json
[ezquake:cmd] 523 inserted, 0 updated from .../ezquake-commands.json
[ktx:cmd] 326 inserted, 0 updated from .../ktx-commands.json
Layer 1 import complete.
```

FTE count is approximate; any non-zero number is fine for the POC.

Then:

```bash
node scripts/verify-layer1.mjs
```

Expected: counts per project, a few sample rows printed. Some samples may show NOT FOUND if the specific ids do not exist in the scraped data — verify manually with `sqlite3 data/qw.db 'SELECT * FROM kb_cvars WHERE name = "cl_bob"'` and pick different sample ids for Task 3's demo audit.

- [ ] **Step 5: Re-run the importer once** to confirm idempotency. Expected: `0 inserted, N updated` on the second run. If you see duplicate inserts or rows growing, the ON CONFLICT clause is wrong — fix before committing.

- [ ] **Step 6: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/layers/facts apps/qw-oracle/scripts/verify-layer1.mjs
git commit -m "feat(qw-oracle): Layer 1 schema + import from qw-config JSON

Imports pre-extracted ezQuake vars/commands, FTE vars, and KTX commands
into new kb_cvars and kb_commands tables with canonical IDs. Idempotent
upsert, tracked in kb_facts_import_log. Verification script prints per-
project counts and sample rows.

Known limitation: source JSON is from iterative scrapers, may be
incomplete. AST-based extractor rewrite is deferred to phase 2.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 3: Quick audit of the imported data + lock in the demo query

**Purpose:** Confirm the Layer 1 data supports the intended demo before building Layers 2 and 3. The demo is "ask about a KTX-injected command and watch the MCP reveal that it's owned by KTX, not ezQuake, with a concept note explaining how it got there." The verified data supports this: `break`, `ready`, `next_map`, `rpickup`, `mapcycle`, `next_best`, `shownick`, `scores`, and roughly 300 other command names live in `ktx-commands.json` and will land in `kb_commands` with `project='ktx'`. These are exactly the names Slipgate's existing `ConfigViewer` already flags as "injected by the server on connect" (see `apps/slipgate-app/src/components/ConfigViewer.tsx:435`).

**Files:**
- Create: `apps/qw-oracle/docs/poc-demo-candidates.md`

- [ ] **Step 1: Verify the KTX-only command set landed correctly**

```bash
cd apps/qw-oracle
sqlite3 data/qw.db <<'SQL'
-- Commands that exist in KTX but not in ezQuake (the pure KTX-injected set).
-- This is the primary demo pattern: these look like normal commands to a player
-- but have no ezQuake definition.
SELECT k.id, substr(k.description, 1, 60) AS d
FROM kb_commands k
WHERE k.project = 'ktx'
  AND NOT EXISTS (SELECT 1 FROM kb_commands e WHERE e.project = 'ezquake' AND e.name = k.name)
  AND k.name IN ('break','ready','next_map','rpickup','mapcycle','next_best','shownick','scores','list','maplist')
ORDER BY k.name;

-- Cross-project name collisions: same name, command in both ezquake and ktx.
-- Secondary demo pattern: same name, different behavior depending on who runs it.
SELECT e.id AS ezquake_id, k.id AS ktx_id
FROM kb_commands e
JOIN kb_commands k ON k.name = e.name AND k.project = 'ktx'
WHERE e.project = 'ezquake'
ORDER BY e.name;
SQL
```

**Expected result:** the first query returns ~5-10 rows for the KTX-only command set. The second query returns 5 rows (roughly `autotrack`, `kick`, `kill`, `pause`, `speed` — names that exist as ezQuake commands AND as KTX commands, with different semantics).

If the KTX set is empty, the Layer 1 importer didn't hit `ktx-commands.json` — go back and fix Task 2 before proceeding.

- [ ] **Step 2: Record findings in `apps/qw-oracle/docs/poc-demo-candidates.md`**

```markdown
# POC demo candidates (scratch)

Run: 2026-04-14

## Primary demo pattern: pure KTX-injected commands

Commands that exist as `ktx:cmd:*` but have no ezQuake counterpart. Players
see these in their configs (bound to keys) but cannot find them in ezQuake
source or docs.

Verified present in kb_commands (fill in real descriptions from Step 1):
- ktx:cmd:break — (paste desc)
- ktx:cmd:ready — (paste desc)
- ktx:cmd:next_map — (paste desc)
- ktx:cmd:rpickup — (paste desc)
- ktx:cmd:mapcycle — (paste desc)
- ktx:cmd:scores — (paste desc)
- ktx:cmd:next_best — (paste desc)

Pick ONE as the primary demo target. `break` and `next_map` are both strong
candidates because they sound ambiguous to a player who doesn't know KTX.

## Secondary demo pattern: cross-project name collisions

Same name in both `ezquake:cmd:*` and `ktx:cmd:*`, different semantics.
Verified from Step 1:
- ezquake:cmd:autotrack <-> ktx:cmd:autotrack
- ezquake:cmd:kick     <-> ktx:cmd:kick
- ezquake:cmd:kill     <-> ktx:cmd:kill
- ezquake:cmd:pause    <-> ktx:cmd:pause
- ezquake:cmd:speed    <-> ktx:cmd:speed

Use this as a bonus demo if time allows, or as a fallback if Layer 2 didn't
catch any sessions about the primary target.

## Chosen primary demo query

"What does the bind `END rpickup` do in my ezquake config, and why can't I
find `rpickup` in the ezQuake source?"

Expected MCP round-trip:
  1. lookup_entity(name='rpickup') -> empty on ezquake rows, one hit on ktx:cmd:rpickup with linked_concepts including concept:ktx_matchstart_injection
  2. get_concept_note(id='concept:ktx_matchstart_injection') -> returns the concept body explaining KTX stuffcmd injection
  3. Optional search_solved_issues(query='rpickup') -> may or may not hit; POC slice is narrow

Final answer cites: ktx:cmd:rpickup row + concept body + any chat sessions.

Replace `rpickup` with another name from the primary set if preferred.
```

- [ ] **Step 3: Commit the scratch doc**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/docs/poc-demo-candidates.md
git commit -m "docs(qw-oracle): lock in POC demo query from Layer 1 audit

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Phase C: Layer 2 — Interpreted claims

### Task 4: Layer 2 schema + chat slice selector

**Files:**
- Create: `apps/qw-oracle/layers/claims/schema.sql`
- Create: `apps/qw-oracle/layers/claims/pick-slice.mjs`
- Create: `apps/qw-oracle/scripts/verify-layer2.mjs`

- [ ] **Step 1: Write the Layer 2 schema to `apps/qw-oracle/layers/claims/schema.sql`**

```sql
-- Layer 2: Interpreted claims. LLM-summarized conversation sessions.
-- Added to the existing qw.db alongside the raw `messages` table and Layer 1 kb_* tables.

CREATE TABLE IF NOT EXISTS kb_sessions (
  id                        TEXT PRIMARY KEY,   -- canonical: 'session:2020-10-19-helpdesk-NNN'
  platform                  TEXT NOT NULL,       -- 'discord' | 'irc'
  channel_name              TEXT NOT NULL,       -- '#helpdesk'
  start_message_id          TEXT NOT NULL,
  end_message_id            TEXT NOT NULL,
  start_at                  TEXT NOT NULL,       -- ISO 8601 UTC
  end_at                    TEXT NOT NULL,
  message_count             INTEGER NOT NULL,
  participants_json         TEXT NOT NULL,       -- JSON array of author names
  topic                     TEXT,                -- short topic (<=100 chars)
  summary                   TEXT,                -- longer prose summary
  mentioned_cvar_ids_json   TEXT,                -- JSON array of Layer 1 cvar IDs
  mentioned_cmd_ids_json    TEXT,                -- JSON array of Layer 1 cmd IDs
  tags_json                 TEXT,                -- JSON array of free-form tags
  quality                   TEXT NOT NULL,       -- 'strong' | 'weak' | 'unknown'
  summarizer_model          TEXT NOT NULL,
  summarizer_prompt_version TEXT NOT NULL,
  summarized_at             TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kb_sessions_channel  ON kb_sessions(channel_name);
CREATE INDEX IF NOT EXISTS idx_kb_sessions_start_at ON kb_sessions(start_at);

-- FTS5 virtual table for full-text search over session topic + summary + tags
CREATE VIRTUAL TABLE IF NOT EXISTS kb_sessions_fts USING fts5(
  id UNINDEXED,
  topic,
  summary,
  tags_json,
  content='kb_sessions',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS kb_sessions_ai AFTER INSERT ON kb_sessions BEGIN
  INSERT INTO kb_sessions_fts(rowid, id, topic, summary, tags_json)
  VALUES (new.rowid, new.id, new.topic, new.summary, new.tags_json);
END;

CREATE TRIGGER IF NOT EXISTS kb_sessions_ad AFTER DELETE ON kb_sessions BEGIN
  INSERT INTO kb_sessions_fts(kb_sessions_fts, rowid, id, topic, summary, tags_json)
  VALUES ('delete', old.rowid, old.id, old.topic, old.summary, old.tags_json);
END;

CREATE TRIGGER IF NOT EXISTS kb_sessions_au AFTER UPDATE ON kb_sessions BEGIN
  INSERT INTO kb_sessions_fts(kb_sessions_fts, rowid, id, topic, summary, tags_json)
  VALUES ('delete', old.rowid, old.id, old.topic, old.summary, old.tags_json);
  INSERT INTO kb_sessions_fts(rowid, id, topic, summary, tags_json)
  VALUES (new.rowid, new.id, new.topic, new.summary, new.tags_json);
END;

-- Table mapping session -> raw messages (so we can retrieve the actual conversation)
CREATE TABLE IF NOT EXISTS kb_session_messages (
  session_id  TEXT NOT NULL,
  message_id  TEXT NOT NULL,
  ord         INTEGER NOT NULL,    -- position within session (0-indexed)
  PRIMARY KEY (session_id, message_id),
  FOREIGN KEY (session_id) REFERENCES kb_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_kb_session_messages_session ON kb_session_messages(session_id);

-- Idempotent session selection tracking
CREATE TABLE IF NOT EXISTS kb_session_selection_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slice_name     TEXT NOT NULL,
  sessions_found INTEGER NOT NULL,
  params_json    TEXT NOT NULL,
  created_at     TEXT NOT NULL
);
```

- [ ] **Step 2: Write `apps/qw-oracle/layers/claims/pick-slice.mjs`**

```javascript
// Picks the POC chat slice: ~50 sessions from ezquake/helpdesk channels
// that mention cvars or commands. Writes session boundaries into kb_sessions
// as empty stubs (no summary yet — that is the next task).
//
// Re-running is safe: existing sessions with the same id are left alone.

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QW_ORACLE_ROOT = resolve(__dirname, '..', '..');
const DB_PATH = resolve(QW_ORACLE_ROOT, 'data', 'qw.db');
const SCHEMA_PATH = resolve(__dirname, 'schema.sql');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(readFileSync(SCHEMA_PATH, 'utf8'));

const SLICE_NAME = 'poc-v1';
const TARGET_SESSION_COUNT = 50;
const SESSION_GAP_MS = 15 * 60 * 1000; // 15 minutes
const MIN_SESSION_MESSAGES = 5;
const CHANNELS = ['#ezquake', '#helpdesk'];

// Build a simple "mentions cvar or command" filter from Layer 1 names
// (top ~500 most distinctive names, to keep the in-process check manageable).
const triggerNames = [
  ...db.prepare(`SELECT name FROM kb_cvars WHERE project = 'ezquake' AND length(name) >= 4 ORDER BY name LIMIT 300`).all().map(r => r.name),
  ...db.prepare(`SELECT name FROM kb_commands WHERE project = 'ezquake' AND length(name) >= 4 ORDER BY name LIMIT 200`).all().map(r => r.name),
];
console.log(`Loaded ${triggerNames.length} Layer 1 names as triggers.`);

const candidateMessages = db.prepare(`
  SELECT id, channel_name, author_name, content, created_at
  FROM messages
  WHERE channel_name IN (${CHANNELS.map(() => '?').join(',')})
    AND message_type = 'message'
    AND content IS NOT NULL
    AND length(content) >= 20
  ORDER BY channel_name, created_at
`).all(...CHANNELS);

console.log(`Fetched ${candidateMessages.length} raw candidate messages from ${CHANNELS.join(', ')}.`);

const triggerSet = new Set(triggerNames.map(n => n.toLowerCase()));
function mentionsTrigger(content) {
  const lower = content.toLowerCase();
  for (const t of triggerSet) {
    if (lower.includes(t)) return true;
  }
  return false;
}

// Group into sessions by channel + 15-minute gap.
const sessions = [];
let current = null;

for (const msg of candidateMessages) {
  const ts = new Date(msg.created_at).getTime();
  if (!current || current.channel !== msg.channel_name || ts - current.last_ts > SESSION_GAP_MS) {
    if (current && current.messages.length >= MIN_SESSION_MESSAGES && current.has_trigger) {
      sessions.push(current);
    }
    current = {
      channel: msg.channel_name,
      platform: 'discord',
      messages: [],
      has_trigger: false,
      last_ts: ts,
    };
  }
  current.messages.push(msg);
  current.last_ts = ts;
  if (!current.has_trigger && mentionsTrigger(msg.content)) {
    current.has_trigger = true;
  }
}
if (current && current.messages.length >= MIN_SESSION_MESSAGES && current.has_trigger) {
  sessions.push(current);
}

console.log(`Grouped into ${sessions.length} candidate sessions with trigger mentions.`);

sessions.sort((a, b) => b.last_ts - a.last_ts || b.messages.length - a.messages.length);
const picked = sessions.slice(0, TARGET_SESSION_COUNT);

console.log(`Picked top ${picked.length} sessions.`);

const insertSession = db.prepare(`
  INSERT OR IGNORE INTO kb_sessions (
    id, platform, channel_name, start_message_id, end_message_id,
    start_at, end_at, message_count, participants_json,
    topic, summary, mentioned_cvar_ids_json, mentioned_cmd_ids_json, tags_json,
    quality, summarizer_model, summarizer_prompt_version, summarized_at
  ) VALUES (
    @id, @platform, @channel_name, @start_message_id, @end_message_id,
    @start_at, @end_at, @message_count, @participants_json,
    NULL, NULL, NULL, NULL, NULL,
    'unknown', 'pending', 'pending', @created_at
  )
`);
const insertMsgLink = db.prepare(`
  INSERT OR IGNORE INTO kb_session_messages (session_id, message_id, ord) VALUES (?, ?, ?)
`);

let wrote = 0;
const now = new Date().toISOString();
const txn = db.transaction(() => {
  for (const s of picked) {
    const first = s.messages[0];
    const last = s.messages[s.messages.length - 1];
    const datePart = first.created_at.slice(0, 10);
    const channelSlug = s.channel.replace(/^#/, '');
    const shortHash = first.id.slice(-6);
    const id = `session:${datePart}-${channelSlug}-${shortHash}`;
    const participants = [...new Set(s.messages.map(m => m.author_name).filter(Boolean))];

    const result = insertSession.run({
      id,
      platform: s.platform,
      channel_name: s.channel,
      start_message_id: first.id,
      end_message_id: last.id,
      start_at: first.created_at,
      end_at: last.created_at,
      message_count: s.messages.length,
      participants_json: JSON.stringify(participants),
      created_at: now,
    });
    if (result.changes === 0) continue;

    for (let i = 0; i < s.messages.length; i++) {
      insertMsgLink.run(id, s.messages[i].id, i);
    }
    wrote++;
  }
});
txn();

db.prepare(`
  INSERT INTO kb_session_selection_log (slice_name, sessions_found, params_json, created_at)
  VALUES (?, ?, ?, ?)
`).run(SLICE_NAME, wrote, JSON.stringify({
  channels: CHANNELS,
  target_count: TARGET_SESSION_COUNT,
  gap_ms: SESSION_GAP_MS,
  min_messages: MIN_SESSION_MESSAGES,
}), now);

console.log(`\nWrote ${wrote} new session stubs (summaries pending).`);
db.close();
```

- [ ] **Step 3: Write `apps/qw-oracle/scripts/verify-layer2.mjs`**

```javascript
import Database from 'better-sqlite3';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'data', 'qw.db');
const db = new Database(DB_PATH, { readonly: true });

console.log('=== kb_sessions counts ===');
const total = db.prepare(`SELECT COUNT(*) AS n FROM kb_sessions`).get();
console.log(`  total: ${total.n}`);

const byQuality = db.prepare(`SELECT quality, COUNT(*) AS n FROM kb_sessions GROUP BY quality`).all();
for (const row of byQuality) console.log(`  quality=${row.quality}: ${row.n}`);

console.log('\n=== kb_sessions by channel ===');
for (const row of db.prepare(`SELECT channel_name, COUNT(*) AS n FROM kb_sessions GROUP BY channel_name ORDER BY n DESC`).all()) {
  console.log(`  ${row.channel_name}: ${row.n}`);
}

console.log('\n=== sample session (newest) ===');
const sample = db.prepare(`SELECT id, channel_name, message_count, start_at, substr(topic, 1, 80) AS topic, substr(summary, 1, 120) AS summary FROM kb_sessions ORDER BY start_at DESC LIMIT 1`).get();
console.log(JSON.stringify(sample, null, 2));

console.log('\n=== FTS5 smoke test ===');
try {
  const hit = db.prepare(`SELECT id, rank FROM kb_sessions_fts WHERE kb_sessions_fts MATCH ? LIMIT 3`).all('cvar');
  console.log(`  MATCH 'cvar' returned ${hit.length} rows`);
  for (const h of hit) console.log(`   - ${h.id} (rank ${h.rank})`);
} catch (err) {
  console.log(`  FTS5 query failed: ${err.message}`);
}

console.log('\n=== selection log ===');
for (const row of db.prepare(`SELECT * FROM kb_session_selection_log ORDER BY id DESC LIMIT 3`).all()) {
  console.log(`  [${row.created_at}] slice=${row.slice_name} found=${row.sessions_found}`);
}

db.close();
```

- [ ] **Step 4: Run and verify**

```bash
cd apps/qw-oracle
node layers/claims/pick-slice.mjs
node scripts/verify-layer2.mjs
```

Expected: `pick-slice.mjs` ends with "Wrote N new session stubs" where N is ~30-50. `verify-layer2.mjs` shows total sessions all with `quality=unknown`, sample row with `topic=null, summary=null`, and an empty FTS5 smoke test (FTS is empty until summaries land, expected).

If N == 0, your trigger-matching heuristic is off — inspect candidate messages and adjust `MIN_SESSION_MESSAGES` or the channel list.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/layers/claims/schema.sql apps/qw-oracle/layers/claims/pick-slice.mjs apps/qw-oracle/scripts/verify-layer2.mjs
git commit -m "feat(qw-oracle): Layer 2 schema + chat slice picker

Adds kb_sessions + kb_sessions_fts + kb_session_messages + selection log.
pick-slice.mjs groups messages from #ezquake/#helpdesk into sessions on
15-minute gaps, keeps those mentioning Layer 1 names, writes stubs with
quality='unknown' awaiting summarization.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 5: Layer 2 summarization pass

**Files:**
- Create: `apps/qw-oracle/layers/claims/prompts/session-summary-v1.md`
- Create: `apps/qw-oracle/layers/claims/summarize-slice.mjs`

**Prerequisites:** `ANTHROPIC_API_KEY` environment variable set. Cost estimate: 50 sessions at Haiku 4.5 pricing is well under $1. Use `claude-haiku-4-5-20251001` by default.

- [ ] **Step 1: Write the prompt at `apps/qw-oracle/layers/claims/prompts/session-summary-v1.md`**

```markdown
# Session Summary Prompt v1

You are summarizing a QuakeWorld community chat session for a knowledge base.
The goal is to produce a compact, citation-ready summary that a downstream
LLM can use to answer player questions.

## Input

A conversation session from a QuakeWorld Discord channel. Participants discuss
QuakeWorld gameplay, engine cvars, server commands, configuration, bugs,
strategy, or community topics. Each message has: author_name, content, created_at.

## Output

Return ONLY a JSON object matching this schema (no prose, no markdown):

    {
      "topic": "string, <= 100 chars, the central question or theme of the session",
      "summary": "string, 2-5 sentences, what was discussed and what (if anything) was concluded",
      "mentioned_cvars": ["array of ezquake or fte cvar names explicitly discussed, without project prefix"],
      "mentioned_commands": ["array of ezquake or ktx command names explicitly discussed, without project prefix"],
      "tags": ["array of short free-form tags like 'rendering', 'match-config', 'input', 'debugging'"],
      "quality": "strong | weak",
      "quality_reason": "one short sentence explaining why"
    }

## Quality rubric

- **strong**: The session contains a clear question that was answered, a concrete bug that was diagnosed, or a substantive explanation of how something works. A future reader looking for this information would find it useful.
- **weak**: Off-topic chatter, banter, greetings, incomplete discussions, or technical content too vague to cite. Still include it in the knowledge base but mark it weak so policy-based outlets can filter it out.

## QuakeWorld slang glossary

QW players use shorthand in chat. Use this mini-glossary only to recognize
entities behind jargon — do not infer beyond what the session says:

- `LG` or `lg` = lightning gun
- `RL` or `rl` = rocket launcher
- `GL` or `gl` = grenade launcher
- `SG` or `sg` = super shotgun
- `SNG` or `sng` = super nailgun
- `quad` = quad damage (powerup)
- `pent` = pentagram (invulnerability)
- `ring` = ring of shadows (invisibility)
- `MH` or `mh` = mega health
- `RA` / `YA` / `GA` = red / yellow / green armor
- `tp` = teamplay
- `ez` or `ezq` = ezQuake client
- `fte` = FTE client
- `ktx` = KTX server mod
- `mvdsv` = MVDSV server
- `stuffcmd` = server-injected command pushed to a connected client
- `cfg` = config file, usually autoexec.cfg or fresh.cfg
- `bind` = a key binding (keyname -> command or alias)

If a session mentions `LG`, that's a reference to the lightning gun family
— but only include `lg_*` or other concrete cvar/command names in
`mentioned_cvars`/`mentioned_commands` if they literally appear in the
messages. Do not invent canonical names from slang.

## Rules

1. Use only information present in the session. Do not add general QuakeWorld knowledge from your training data.
2. Cvar and command names are lowercase identifiers (e.g. `cl_bob`, `+attack`, `rpickup`). Include them only if they appear literally in the messages.
3. Authors are participants in the conversation, not sources of ground truth. "X said Y" is acceptable if X clearly asserts Y in the session.
4. If the session is ambiguous, prefer `weak` with a one-sentence reason.
5. Return valid JSON only. No preamble, no explanation, no markdown fences.

## Input session

Channel: {{channel}}
Start: {{start_at}}
Message count: {{message_count}}
Participants: {{participants}}

Messages:
{{messages}}
```

- [ ] **Step 2: Write `apps/qw-oracle/layers/claims/summarize-slice.mjs`**

```javascript
// Fills in topic/summary/mentioned_*/tags/quality for every kb_sessions row
// whose summarizer_model = 'pending'. Uses Anthropic API.
// Idempotent: only processes rows that are still pending.

import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QW_ORACLE_ROOT = resolve(__dirname, '..', '..');
const DB_PATH = resolve(QW_ORACLE_ROOT, 'data', 'qw.db');
const PROMPT_PATH = resolve(__dirname, 'prompts', 'session-summary-v1.md');

const MODEL = 'claude-haiku-4-5-20251001';
const PROMPT_VERSION = 'v1';

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const anthropic = new Anthropic();
const promptTemplate = readFileSync(PROMPT_PATH, 'utf8');

const pending = db.prepare(`
  SELECT id, channel_name, start_at, message_count, participants_json
  FROM kb_sessions
  WHERE summarizer_model = 'pending'
  ORDER BY start_at DESC
`).all();

console.log(`${pending.length} sessions pending summarization.`);

const fetchMessages = db.prepare(`
  SELECT m.author_name, m.content, m.created_at
  FROM kb_session_messages sm
  JOIN messages m ON m.id = sm.message_id
  WHERE sm.session_id = ?
  ORDER BY sm.ord
`);

const update = db.prepare(`
  UPDATE kb_sessions
  SET topic = @topic,
      summary = @summary,
      mentioned_cvar_ids_json = @mentioned_cvar_ids_json,
      mentioned_cmd_ids_json  = @mentioned_cmd_ids_json,
      tags_json = @tags_json,
      quality = @quality,
      summarizer_model = @model,
      summarizer_prompt_version = @prompt_version,
      summarized_at = @summarized_at
  WHERE id = @id
`);

// Helpers to turn bare names into canonical IDs
const knownCvars = new Map(
  db.prepare(`SELECT name, id FROM kb_cvars`).all().map(r => [r.name.toLowerCase(), r.id])
);
const knownCommands = new Map(
  db.prepare(`SELECT name, id FROM kb_commands`).all().map(r => [r.name.toLowerCase(), r.id])
);

function toCanonicalCvars(names) {
  const out = [];
  for (const n of names ?? []) {
    const id = knownCvars.get(String(n).toLowerCase());
    if (id) out.push(id);
  }
  return [...new Set(out)];
}
function toCanonicalCommands(names) {
  const out = [];
  for (const n of names ?? []) {
    const id = knownCommands.get(String(n).toLowerCase());
    if (id) out.push(id);
  }
  return [...new Set(out)];
}

function renderPrompt(session, messages) {
  const msgBlock = messages
    .map(m => `[${m.created_at}] ${m.author_name}: ${m.content}`)
    .join('\n');
  return promptTemplate
    .replace('{{channel}}', session.channel_name)
    .replace('{{start_at}}', session.start_at)
    .replace('{{message_count}}', String(session.message_count))
    .replace('{{participants}}', (JSON.parse(session.participants_json) || []).join(', '))
    .replace('{{messages}}', msgBlock);
}

async function summarizeOne(session) {
  const messages = fetchMessages.all(session.id);
  const prompt = renderPrompt(session, messages);

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = resp.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();

  const cleaned = text.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error(`  FAIL parse ${session.id}: ${err.message}`);
    console.error(`  raw: ${text.slice(0, 300)}`);
    return false;
  }

  update.run({
    id: session.id,
    topic: String(parsed.topic ?? '').slice(0, 200),
    summary: String(parsed.summary ?? ''),
    mentioned_cvar_ids_json: JSON.stringify(toCanonicalCvars(parsed.mentioned_cvars)),
    mentioned_cmd_ids_json: JSON.stringify(toCanonicalCommands(parsed.mentioned_commands)),
    tags_json: JSON.stringify(Array.isArray(parsed.tags) ? parsed.tags : []),
    quality: parsed.quality === 'strong' ? 'strong' : 'weak',
    model: MODEL,
    prompt_version: PROMPT_VERSION,
    summarized_at: new Date().toISOString(),
  });

  return true;
}

let ok = 0;
let fail = 0;
for (const [i, session] of pending.entries()) {
  process.stdout.write(`[${i + 1}/${pending.length}] ${session.id} ... `);
  try {
    const success = await summarizeOne(session);
    if (success) {
      ok++;
      console.log('ok');
    } else {
      fail++;
    }
  } catch (err) {
    fail++;
    console.log(`error: ${err.message}`);
  }
}

console.log(`\nDone. ok=${ok} fail=${fail} pending=${pending.length}`);
db.close();
```

- [ ] **Step 3: Add dependencies to qw-oracle package.json**

```bash
cd apps/qw-oracle
npm install @anthropic-ai/sdk
```

Verify `@anthropic-ai/sdk` is now in `dependencies` in `package.json`.

- [ ] **Step 4: Run the summarizer**

```bash
cd apps/qw-oracle
node layers/claims/summarize-slice.mjs
```

Expected: progress lines ending with `Done. ok=~48 fail=~2 pending=50`. Some failures are acceptable; failed rows stay `pending` and can be re-run.

If ALL rows fail, stop and debug. Likely causes: bad prompt, missing API key, wrong model name, JSON parse error. Add a `console.log(text)` temporarily to inspect a raw response.

- [ ] **Step 5: Verify**

```bash
node scripts/verify-layer2.mjs
```

Expected: totals now include `quality=strong` and `quality=weak` counts. Sample row shows populated topic/summary. FTS5 smoke test for `MATCH 'cvar'` returns >0 rows.

- [ ] **Step 6: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/layers/claims/prompts apps/qw-oracle/layers/claims/summarize-slice.mjs apps/qw-oracle/package.json apps/qw-oracle/package-lock.json
git commit -m "feat(qw-oracle): Layer 2 summarization via Anthropic SDK

Summarizes pending kb_sessions rows using session-summary-v1 prompt
with Claude Haiku 4.5. Resolves mentioned cvar/command names to
canonical Layer 1 IDs. Stores topic/summary/quality plus provenance
(summarizer_model + summarizer_prompt_version). Idempotent on retry.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Phase D: Layer 3 — Curated concepts

### Task 6: Write 3 concept notes with canonical cross-links

**Files:**
- Create: `apps/qw-oracle/layers/concepts/README.md`
- Create: `apps/qw-oracle/layers/concepts/_schema.md`
- Create: `apps/qw-oracle/layers/concepts/ktx_matchstart_injection.md`
- Create: `apps/qw-oracle/layers/concepts/ezquake_cvar_anatomy.md`
- Create: `apps/qw-oracle/layers/concepts/qw_command_vs_cvar.md`
- Create: `apps/qw-oracle/scripts/verify-concepts.mjs`

The KTX injection note is the demo-anchor. It MUST cross-link real Layer 1 rows. Use the findings from Task 3's `poc-demo-candidates.md` — the `ktx:cmd:*` IDs for `break`, `ready`, `next_map`, `rpickup`, `mapcycle`, `next_best`, `shownick`, `scores` are all verified present in `kb_commands`. Reference at least 3-5 of these directly so the concept note's `references.commands` array resolves at startup.

- [ ] **Step 1: Write `layers/concepts/README.md`**

```markdown
# Layer 3 — Curated concept notes

Hand-written markdown that cross-links Layer 1 (facts) and Layer 2 (claims)
into human-level explanations. Each file is one concept. See `_schema.md` for
the required frontmatter shape.

Concept notes are the glue layer. Their job is to say the thing the raw
tables cannot: "these two rows in different projects are actually the same
feature," "this cvar is a historical artifact from 2005 and you should not
touch it," "this command only matters during match mode."

Authoring rules:

1. One concept per file. Filename matches the canonical id suffix (e.g.
   `ktx_matchstart_injection.md` for `concept:ktx_matchstart_injection`).
2. Frontmatter must validate against `_schema.md`.
3. Every `references` entry must be a real canonical id that exists in the
   database (or is a link to another concept file). Run
   `node scripts/verify-concepts.mjs` after editing.
4. Keep the body focused. 200-600 words is the typical range. Longer means
   you probably have two concepts mashed into one.
```

- [ ] **Step 2: Write `layers/concepts/_schema.md`**

```markdown
# Concept note frontmatter schema

Every `.md` file in `layers/concepts/` (except `README.md` and files prefixed
with `_`) must begin with YAML frontmatter matching this shape:

    ---
    id: concept:<slug>                    # required, must match filename stem
    title: <short title>                  # required
    description: <one-line description>   # required, used by MCP get_concept_note
    tags: [tag1, tag2]                    # required, can be empty list
    references:
      cvars:      [ezquake:cvar:..., ...]   # Layer 1 cvar canonical ids
      commands:   [ezquake:cmd:..., ktx:cmd:..., ...]  # Layer 1 command canonical ids
      sessions:   [session:..., ...]        # Layer 2 session ids (optional)
      concepts:   [concept:other_note, ...] # Other concept notes (optional)
    authored_by: <author>                 # required (e.g. ParadokS)
    authored_at: YYYY-MM-DD               # required
    confidence: high | medium | low       # required
    ---

All `references.*` arrays may be empty but must be present. The verifier
script checks that every non-concept id in `references` exists in the
database and warns on dead links.
```

- [ ] **Step 3: Write `layers/concepts/ktx_matchstart_injection.md`** using real canonical IDs from Task 3 findings.

```markdown
---
id: concept:ktx_matchstart_injection
title: KTX server-injected commands
description: How KTX servers register commands on connected clients via stuffcmd, making server-owned actions look like native client commands that users can bind to keys.
tags: [ktx, ezquake, server, stuffcmd, binds]
references:
  cvars: []
  commands:
    - ktx:cmd:break
    - ktx:cmd:ready
    - ktx:cmd:next_map
    - ktx:cmd:rpickup
    - ktx:cmd:mapcycle
    - ktx:cmd:scores
  sessions: []
  concepts:
    - concept:qw_command_vs_cvar
authored_by: ParadokS
authored_at: 2026-04-14
confidence: high
---

# KTX server-injected commands

When you connect to a QuakeWorld server running KTX, the server pushes a set
of named commands onto your client using the `stuffcmd` network primitive.
From your client's point of view these commands appear as if they were
built-in: you can bind them to keys, type them in the console, and they work
the same way a native command does. But they are not in ezQuake's source.
They live in KTX's `commands.c` and only exist on your client for as long
as you are connected to a KTX server.

Examples you will see in QW configs:

- `break` — match-mode command: give up / forfeit during an organized match
- `ready` — signal to the server that you're ready to start the match
- `next_map` — vote for the next map in the map cycle
- `rpickup` — random team pickup (used during pickup matches)
- `mapcycle` / `next_best` — map rotation controls
- `scores` — bring up the score overlay
- `shownick` — show the player's nickname on screen

These are bound in many players' configs. Without context, someone cleaning
up their config sees an unresolved command and has no idea whether it is a
typo, a deprecated feature, a third-party plugin, or a real thing. It is a
real thing — owned by KTX, not ezQuake.

## Why this is confusing

Config debugging runs into this regularly:

- Grepping the ezQuake source for `rpickup` returns nothing. The command
  genuinely does not exist in ezQuake.
- In the ezQuake console, `rpickup` works when connected to a KTX server
  and fails otherwise. Its presence is conditional on the server.
- Config tools that only know ezQuake's command set (like naive config
  linters) flag these as broken binds. They are not broken; they are
  server-dependent.

The practical rule: if you see a command in a config that is not in
ezQuake's source, and the config came from someone who plays on KTX
servers, try KTX first before assuming it is a typo.

## Where Slipgate already handles this

`apps/slipgate-app/src/components/ConfigViewer.tsx` loads the same
`ktx-commands.json` file that Layer 1 imports and uses it to classify
binds in the viewer. A bind to `rpickup` is tagged `KTX` and shown with
the label "Command is a KTX server mod command. It is injected by the
server on connect and only works when playing on a KTX server."

This concept note captures that same knowledge in a format an LLM can
retrieve and cite, independent of the Slipgate UI.

## Related

See the `qw_command_vs_cvar` concept note for why Quake keeps commands
and cvars in separate namespaces. See also the `kb_commands` table where
each of the referenced `ktx:cmd:*` rows carries its own short description.

## Known data limitation

Layer 1 imports from `packages/qw-config/src/data/ktx-commands.json`,
which is produced by a pattern-based scraper of KTX's `commands.c`. Not
every command registered at runtime via `stuffcmd` is captured this way
— only those declared in the static `cmds[]` array. Phase-2 AST-based
extraction will close this gap. See spec open question #2.
```

- [ ] **Step 4: Write `layers/concepts/ezquake_cvar_anatomy.md`**

```markdown
---
id: concept:ezquake_cvar_anatomy
title: Anatomy of an ezQuake cvar
description: How to read an ezQuake cvar row — name, type, default, group, flags — and what the major groups mean.
tags: [ezquake, cvars, reference]
references:
  cvars:
    - ezquake:cvar:cl_bob
    - ezquake:cvar:crosshair
    - ezquake:cvar:sensitivity
  commands: []
  sessions: []
  concepts:
    - concept:qw_command_vs_cvar
authored_by: ParadokS
authored_at: 2026-04-14
confidence: high
---

# Anatomy of an ezQuake cvar

Every cvar in ezQuake has a `name`, a `type` (float / int / string / bool),
a `default` value, and belongs to a `group` that organizes the client's
settings UI. The group hierarchy has two levels: a `major_group` like
"Graphics" or "Input" and a specific `group_name` like "Input - Keyboard".

For knowledge-base purposes, the canonical id of a cvar is
`ezquake:cvar:<name>` — e.g. `ezquake:cvar:cl_bob` is the canonical id
for the classic view-bob cvar. Version-pinned ids (e.g.
`ezquake:cvar:cl_bob@v4.0.1`) are used when behavior changed across
releases; the un-suffixed id always refers to the latest known definition.

## Reading a row

The `kb_cvars` table holds these columns:

- `name` — the literal cvar identifier used in console and configs
- `type` — declared type, guides UI and validation
- `default_value` — what fresh installs start with
- `major_group` / `group_name` — settings UI hierarchy
- `description` — the human-readable explanation from the source

Not every column is populated. `source_file` and `source_line` are often
null in the POC import because the upstream JSON does not carry them.

## When a cvar has no ezQuake source

See `concept:ktx_matchstart_injection` — some cvars that appear in an
ezQuake client are actually set by the server via stuffcmd and have no
ezQuake definition.
```

- [ ] **Step 5: Write `layers/concepts/qw_command_vs_cvar.md`**

```markdown
---
id: concept:qw_command_vs_cvar
title: Commands vs cvars in QuakeWorld
description: Why QuakeWorld clients distinguish commands (actions) from cvars (state) and why both share a flat console namespace.
tags: [quakeworld, reference, console]
references:
  cvars:
    - ezquake:cvar:cl_bob
  commands:
    - ezquake:cmd:say_team
    - ezquake:cmd:+attack
  sessions: []
  concepts: []
authored_by: ParadokS
authored_at: 2026-04-14
confidence: high
---

# Commands vs cvars in QuakeWorld

The QuakeWorld console has two kinds of identifiers sharing a single
namespace: commands and cvars. Both are typed at the same prompt, both
are bound to keys the same way, but they behave differently.

A **command** is an action. `say_team hi` sends a team message; `+attack`
starts firing; `disconnect` leaves the server. Commands take arguments on
the same line, have no persistent state, and often pair with a counterpart
(e.g. `+attack` / `-attack` for press-and-release).

A **cvar** is a value. `sensitivity 3.5` sets the mouse sensitivity; the
cvar then holds that value until something else changes it. Cvars can be
archived (saved across sessions), read-only, or latched. Setting a cvar
with `set cvar_name value` auto-creates it even if the client does not
recognize the name — which is how servers inject cvars via stuffcmd.

## Why they share a namespace

Quake's console came from Quake 1 in 1996. The flat namespace made the
console simple: one parser, one dispatch table per kind. Binding a key
to `+attack` is the same kind of thing as binding a key to
`echo hello world`, even though one is a command and the other is a
console builtin.

For knowledge-base purposes, we store them in separate tables
(`kb_commands` and `kb_cvars`) because the schema differs — commands
have no default value or type, cvars have both. Canonical ids are
distinguished by the middle segment: `ezquake:cvar:sensitivity` vs
`ezquake:cmd:say_team`.
```

- [ ] **Step 6: Write `apps/qw-oracle/scripts/verify-concepts.mjs`**

```javascript
// Lints every concept note: parses frontmatter, checks required fields,
// confirms every cvar/command reference resolves to a real row in kb_*.
// Exits 1 on any failure so the step is easy to gate on.

import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QW_ORACLE_ROOT = resolve(__dirname, '..');
const DB_PATH = resolve(QW_ORACLE_ROOT, 'data', 'qw.db');
const CONCEPTS_DIR = resolve(QW_ORACLE_ROOT, 'layers', 'concepts');

const db = new Database(DB_PATH, { readonly: true });
const existingCvarIds = new Set(db.prepare(`SELECT id FROM kb_cvars`).all().map(r => r.id));
const existingCmdIds = new Set(db.prepare(`SELECT id FROM kb_commands`).all().map(r => r.id));

// Very small YAML frontmatter parser (avoids pulling a dep for the POC).
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  let currentKey = null;
  let currentList = null;
  for (const rawLine of body.split('\n')) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const topMatch = rawLine.match(/^([a-z_]+):\s*(.*)$/);
    if (topMatch) {
      currentKey = topMatch[1];
      const val = topMatch[2];
      if (val === '') {
        out[currentKey] = {};
        currentList = null;
      } else if (val.startsWith('[') && val.endsWith(']')) {
        const inner = val.slice(1, -1).trim();
        out[currentKey] = inner ? inner.split(',').map(s => s.trim()) : [];
        currentList = null;
      } else {
        out[currentKey] = val.replace(/^"(.*)"$/, '$1');
        currentList = null;
      }
      continue;
    }
    const nestedMatch = rawLine.match(/^  ([a-z_]+):\s*(.*)$/);
    if (nestedMatch) {
      const nestedKey = nestedMatch[1];
      const val = nestedMatch[2];
      if (val === '') {
        out[currentKey][nestedKey] = [];
        currentList = out[currentKey][nestedKey];
      } else if (val.startsWith('[') && val.endsWith(']')) {
        const inner = val.slice(1, -1).trim();
        out[currentKey][nestedKey] = inner ? inner.split(',').map(s => s.trim()) : [];
        currentList = null;
      }
      continue;
    }
    const listMatch = rawLine.match(/^    - (.*)$/);
    if (listMatch && currentList) {
      currentList.push(listMatch[1].trim());
      continue;
    }
  }
  return out;
}

const REQUIRED = ['id', 'title', 'description', 'tags', 'references', 'authored_by', 'authored_at', 'confidence'];

let errors = 0;
let warnings = 0;
let ok = 0;

const files = readdirSync(CONCEPTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md');

for (const file of files) {
  const path = resolve(CONCEPTS_DIR, file);
  const text = readFileSync(path, 'utf8');
  const fm = parseFrontmatter(text);
  if (!fm) {
    console.error(`  ERROR ${file}: no frontmatter`);
    errors++;
    continue;
  }

  const missing = REQUIRED.filter(k => !(k in fm));
  if (missing.length) {
    console.error(`  ERROR ${file}: missing required fields: ${missing.join(', ')}`);
    errors++;
    continue;
  }

  const stem = basename(file, extname(file));
  const expectedId = `concept:${stem}`;
  if (fm.id !== expectedId) {
    console.error(`  ERROR ${file}: id mismatch. frontmatter=${fm.id} expected=${expectedId}`);
    errors++;
    continue;
  }

  const refs = fm.references ?? {};
  for (const id of refs.cvars ?? []) {
    if (id.startsWith('<REPLACE')) {
      console.error(`  ERROR ${file}: unresolved placeholder ${id}`);
      errors++;
      continue;
    }
    if (!existingCvarIds.has(id)) {
      console.error(`  ERROR ${file}: dead cvar reference ${id}`);
      errors++;
    }
  }
  for (const id of refs.commands ?? []) {
    if (id.startsWith('<REPLACE')) {
      console.error(`  ERROR ${file}: unresolved placeholder ${id}`);
      errors++;
      continue;
    }
    if (!existingCmdIds.has(id)) {
      console.error(`  ERROR ${file}: dead command reference ${id}`);
      errors++;
    }
  }
  for (const id of refs.sessions ?? []) {
    const hit = db.prepare(`SELECT 1 FROM kb_sessions WHERE id = ?`).get(id);
    if (!hit) {
      console.warn(`  WARN ${file}: session reference ${id} not in kb_sessions (slice may not include it)`);
      warnings++;
    }
  }
  for (const id of refs.concepts ?? []) {
    const otherFile = resolve(CONCEPTS_DIR, id.replace(/^concept:/, '') + '.md');
    try { readFileSync(otherFile); }
    catch { console.warn(`  WARN ${file}: concept cross-ref ${id} does not exist yet`); warnings++; }
  }

  if (errors === 0) ok++;
  console.log(`  ${errors ? 'ERR ' : 'ok  '} ${file}`);
}

console.log(`\nConcepts: ${ok} ok, ${warnings} warnings, ${errors} errors`);
db.close();
process.exit(errors > 0 ? 1 : 0);
```

- [ ] **Step 7: Replace the placeholder ids in `ktx_matchstart_injection.md`**

Open the file and replace both `<REPLACE_WITH_REAL_ID>` strings with ids that exist in the database. Use Task 3's findings. If the KTX injection story did not have real data, adapt the note to a cross-project story that does.

- [ ] **Step 8: Run the verifier and fix anything it flags**

```bash
cd apps/qw-oracle
node scripts/verify-concepts.mjs
```

Expected: each file shown with `ok`, final line `Concepts: 3 ok, 0 warnings, 0 errors`. Session warnings are acceptable; dead cvar/command references are NOT. Exit code 0.

- [ ] **Step 9: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/layers/concepts apps/qw-oracle/scripts/verify-concepts.mjs
git commit -m "feat(qw-oracle): Layer 3 concept notes with canonical cross-links

Adds README + schema reference + 3 hand-authored concept notes:
ktx_matchstart_injection (cross-project demo anchor), ezquake_cvar_anatomy,
qw_command_vs_cvar. Verifier script validates frontmatter shape and
resolves every cvar/command reference against Layer 1.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Phase E: Serve layer — MCP server

### Task 7: MCP server skeleton + lookup_entity tool

**Files:**
- Create: `apps/qw-oracle/serve/mcp/package.json`
- Create: `apps/qw-oracle/serve/mcp/tsconfig.json`
- Create: `apps/qw-oracle/serve/mcp/.gitignore`
- Create: `apps/qw-oracle/serve/mcp/src/index.ts`
- Create: `apps/qw-oracle/serve/mcp/src/db.ts`
- Create: `apps/qw-oracle/serve/mcp/src/types.ts`
- Create: `apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts`
- Create: `apps/qw-oracle/serve/mcp/src/concept-loader.ts`
- Create: `apps/qw-oracle/serve/mcp/README.md`

**Runtime:** The MCP server uses Bun for dev execution (runs TS directly). If Bun is not available, fall back to `tsx` via npm — code is portable.

- [ ] **Step 1: Write `serve/mcp/package.json`**

```json
{
  "name": "@qw-oracle/mcp",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "bun run src/index.ts",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^11.0.0",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Write `serve/mcp/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Write `serve/mcp/.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 4: Write `serve/mcp/src/types.ts`**

```typescript
// Shared MCP tool response shapes.
// The match_quality + suggested_fallback fields let consumer-side outlets
// implement their own fallback policy without the server knowing about it.

export type MatchQuality = 'strong' | 'weak' | 'none';

export interface ToolResponse<T = unknown> {
  results: T[];
  match_quality: MatchQuality;
  suggested_fallback: string | null;
  meta: {
    tool: string;
    server_version: string;
    queried_at: string;
  };
}

// Unified entity record: a cvar or a command. The `type` discriminator lets
// consumer LLMs render them differently (cvars have default values, commands
// don't). Same MCP tool returns both; the demo query often hits one of each.
export interface EntityRecord {
  id: string;
  type: 'cvar' | 'command';
  project: string;
  name: string;
  value_type: string | null;       // cvar only: 'float' | 'int' | 'string' | 'bool'
  default_value: string | null;    // cvar only
  description: string | null;
  group_name: string | null;
  major_group: string | null;      // cvar only (commands don't have a major group in current schema)
  extraction_method: string;       // 'scraped-json' etc — signals row confidence
  linked_sessions: string[];
  linked_concepts: string[];
}

export interface SessionHit {
  id: string;
  channel_name: string;
  start_at: string;
  topic: string | null;
  summary: string | null;
  quality: string;
  mentioned_cvar_ids: string[];
  mentioned_cmd_ids: string[];
  tags: string[];
  rank: number;
}

export interface ConceptNote {
  id: string;
  title: string;
  description: string;
  body: string;
  tags: string[];
  references: {
    cvars: string[];
    commands: string[];
    sessions: string[];
    concepts: string[];
  };
  authored_by: string;
  authored_at: string;
  confidence: string;
}
```

- [ ] **Step 5: Write `serve/mcp/src/db.ts`**

```typescript
import Database from 'better-sqlite3';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// serve/mcp/src -> apps/qw-oracle -> data/qw.db
const DB_PATH = resolve(__dirname, '..', '..', '..', 'data', 'qw.db');

export const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
db.pragma('journal_mode = WAL');
```

- [ ] **Step 6: Write `serve/mcp/src/concept-loader.ts`**

```typescript
import matter from 'gray-matter';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import type { ConceptNote } from './types.ts';

export function loadAllConcepts(conceptsDir: string): Map<string, ConceptNote> {
  const out = new Map<string, ConceptNote>();
  const files = readdirSync(conceptsDir).filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md');

  for (const file of files) {
    const text = readFileSync(resolve(conceptsDir, file), 'utf8');
    const parsed = matter(text);
    const fm = parsed.data as Partial<ConceptNote> & { references?: ConceptNote['references'] };
    const id = fm.id ?? `concept:${basename(file, extname(file))}`;
    const note: ConceptNote = {
      id,
      title: fm.title ?? id,
      description: fm.description ?? '',
      body: parsed.content.trim(),
      tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
      references: {
        cvars:    fm.references?.cvars    ?? [],
        commands: fm.references?.commands ?? [],
        sessions: fm.references?.sessions ?? [],
        concepts: fm.references?.concepts ?? [],
      },
      authored_by: fm.authored_by ?? 'unknown',
      authored_at: fm.authored_at ?? 'unknown',
      confidence: fm.confidence ?? 'medium',
    };
    out.set(id, note);
  }
  return out;
}
```

- [ ] **Step 7: Write `serve/mcp/src/tools/lookup-entity.ts`**

Unified lookup across both `kb_cvars` and `kb_commands`. The demo query is about a command (`rpickup`), so a cvar-only tool would miss it; an entity tool hits both tables and returns whichever rows exist. Keeps the POC at 3 MCP tools total (per the scope guardrail).

```typescript
import { db } from '../db.ts';
import type { EntityRecord, ToolResponse } from '../types.ts';

const SERVER_VERSION = '0.1.0';

interface LookupEntityArgs {
  name: string;
  project?: string;
  type?: 'cvar' | 'command'; // optional filter; default returns both
}

// Row shape returned by the SELECTs below — a common subset of kb_cvars and kb_commands.
// Unused fields are hydrated to null by the per-query mapping.
interface RawCvarRow {
  id: string; project: string; name: string;
  type: string | null; default_value: string | null;
  description: string | null; group_name: string | null; major_group: string | null;
  extraction_method: string;
}
interface RawCmdRow {
  id: string; project: string; name: string;
  description: string | null; group_name: string | null;
  extraction_method: string;
}

const selectCvarsByNameAndProject = db.prepare<[string, string], RawCvarRow>(`
  SELECT id, project, name, type, default_value, description, group_name, major_group, extraction_method
  FROM kb_cvars WHERE name = ? AND project = ?
`);
const selectCvarsByName = db.prepare<[string], RawCvarRow>(`
  SELECT id, project, name, type, default_value, description, group_name, major_group, extraction_method
  FROM kb_cvars WHERE name = ?
`);
const selectCmdsByNameAndProject = db.prepare<[string, string], RawCmdRow>(`
  SELECT id, project, name, description, group_name, extraction_method
  FROM kb_commands WHERE name = ? AND project = ?
`);
const selectCmdsByName = db.prepare<[string], RawCmdRow>(`
  SELECT id, project, name, description, group_name, extraction_method
  FROM kb_commands WHERE name = ?
`);

// NOTE(scaling): this JSON-LIKE pattern is O(n*m) over kb_sessions and will
// become a bottleneck at phase-2 scale (10K+ summarized sessions). Phase 2
// should replace this with a junction table kb_entity_mentions(session_id,
// entity_id) indexed on entity_id. See spec deferred roadmap. For the POC's
// ~50-session slice this is instant.
const findLinkedSessionsByCvarJson = db.prepare<[string], { id: string }>(`
  SELECT id FROM kb_sessions WHERE mentioned_cvar_ids_json LIKE ?
`);
const findLinkedSessionsByCmdJson = db.prepare<[string], { id: string }>(`
  SELECT id FROM kb_sessions WHERE mentioned_cmd_ids_json LIKE ?
`);

function cvarToEntity(r: RawCvarRow, conceptIndex: Map<string, string[]>): EntityRecord {
  return {
    id: r.id,
    type: 'cvar',
    project: r.project,
    name: r.name,
    value_type: r.type,
    default_value: r.default_value,
    description: r.description,
    group_name: r.group_name,
    major_group: r.major_group,
    extraction_method: r.extraction_method,
    linked_sessions: findLinkedSessionsByCvarJson.all(`%"${r.id}"%`).map(x => x.id),
    linked_concepts: conceptIndex.get(r.id) ?? [],
  };
}

function cmdToEntity(r: RawCmdRow, conceptIndex: Map<string, string[]>): EntityRecord {
  return {
    id: r.id,
    type: 'command',
    project: r.project,
    name: r.name,
    value_type: null,
    default_value: null,
    description: r.description,
    group_name: r.group_name,
    major_group: null,
    extraction_method: r.extraction_method,
    linked_sessions: findLinkedSessionsByCmdJson.all(`%"${r.id}"%`).map(x => x.id),
    linked_concepts: conceptIndex.get(r.id) ?? [],
  };
}

export function lookupEntity(args: LookupEntityArgs, conceptIndex: Map<string, string[]>): ToolResponse<EntityRecord> {
  const wantCvars = args.type !== 'command';
  const wantCmds  = args.type !== 'cvar';

  const results: EntityRecord[] = [];

  if (wantCvars) {
    const cvarRows = args.project
      ? selectCvarsByNameAndProject.all(args.name, args.project)
      : selectCvarsByName.all(args.name);
    for (const r of cvarRows) results.push(cvarToEntity(r, conceptIndex));
  }

  if (wantCmds) {
    const cmdRows = args.project
      ? selectCmdsByNameAndProject.all(args.name, args.project)
      : selectCmdsByName.all(args.name);
    for (const r of cmdRows) results.push(cmdToEntity(r, conceptIndex));
  }

  let matchQuality: 'strong' | 'weak' | 'none';
  if (results.length === 0) {
    matchQuality = 'none';
  } else if (results.some(r => r.description && r.description.length > 20)) {
    matchQuality = 'strong';
  } else {
    matchQuality = 'weak';
  }

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback: matchQuality === 'none'
      ? `No entity named "${args.name}" in Layer 1 across cvars or commands. Consider search_solved_issues for Layer 2 mentions, or asking in #ezquake on Discord.`
      : null,
    meta: {
      tool: 'lookup_entity',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
```

- [ ] **Step 8: Write `serve/mcp/src/index.ts`**

```typescript
#!/usr/bin/env bun
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadAllConcepts } from './concept-loader.ts';
import { lookupEntity } from './tools/lookup-entity.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCEPTS_DIR = resolve(__dirname, '..', '..', '..', 'layers', 'concepts');

const conceptStore = loadAllConcepts(CONCEPTS_DIR);

// Reverse index: entity_id -> [concept_id, ...]
const conceptIndex = new Map<string, string[]>();
for (const [conceptId, note] of conceptStore) {
  for (const cvarId of note.references.cvars) {
    const list = conceptIndex.get(cvarId) ?? [];
    list.push(conceptId);
    conceptIndex.set(cvarId, list);
  }
  for (const cmdId of note.references.commands) {
    const list = conceptIndex.get(cmdId) ?? [];
    list.push(conceptId);
    conceptIndex.set(cmdId, list);
  }
}

console.error(`[qw-oracle-mcp] loaded ${conceptStore.size} concept notes, ${conceptIndex.size} cross-ref entries`);

const server = new Server(
  { name: 'qw-oracle', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'lookup_entity',
      description: 'Look up a QuakeWorld cvar OR command by name across all known projects (ezquake, ktx, fte, mvdsv). Returns Layer 1 rows (cvars and/or commands with type discriminator) plus linked Layer 2 chat sessions and Layer 3 concept notes. Use this when you have a name from a config or a user question and want to know what it is and where it comes from.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Entity name, e.g. cl_bob or rpickup. Literal match, case-sensitive.' },
          project: { type: 'string', description: 'Optional. Restrict to one project: ezquake | ktx | fte | mvdsv | qwcl.' },
          type: { type: 'string', enum: ['cvar', 'command'], description: 'Optional. Restrict to cvars only or commands only. Default returns both.' },
        },
        required: ['name'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case 'lookup_entity': {
      const response = lookupEntity(args as { name: string; project?: string; type?: 'cvar' | 'command' }, conceptIndex);
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[qw-oracle-mcp] connected via stdio');
```

- [ ] **Step 9: Write `serve/mcp/README.md`**

```markdown
# qw-oracle MCP server

Exposes Layers 1-3 of the QW knowledge service over the Model Context Protocol.
Any MCP-capable LLM client can load it as a tool server.

## Tools

- `lookup_entity(name, project?, type?)` — Layer 1 cvar/command lookup with linked sessions/concepts
- `search_solved_issues(query)` — Layer 2 FTS5 search across summarized sessions
- `get_concept_note(id)` — Layer 3 concept note retrieval

All tools return a response envelope with `match_quality` ('strong' | 'weak' | 'none')
and an optional `suggested_fallback` string. Outlet policy decides what to do on
'none' or 'weak' matches.

## Run locally

    cd apps/qw-oracle/serve/mcp
    bun install
    bun run dev

The server speaks MCP over stdio. To use it from Claude Code, add this to
`~/.claude.json` under the `mcpServers` section:

    {
      "mcpServers": {
        "qw-oracle": {
          "command": "bun",
          "args": ["run", "/absolute/path/to/apps/qw-oracle/serve/mcp/src/index.ts"]
        }
      }
    }

Or via `claude mcp add` if your Claude Code version supports it.

## Data dependencies

The server reads `apps/qw-oracle/data/qw.db` and `apps/qw-oracle/layers/concepts/*.md`.
Run the Layer 1, Layer 2, and Layer 3 import/authoring steps first, otherwise tools return empty.
```

- [ ] **Step 10: Install dependencies and smoke-test**

```bash
cd apps/qw-oracle/serve/mcp
bun install
```

Expected: installs MCP SDK, better-sqlite3, gray-matter.

- [ ] **Step 11: Write and run a test client**

Create `apps/qw-oracle/serve/mcp/scripts/test-call.ts`:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, '..', 'src', 'index.ts');

const transport = new StdioClientTransport({
  command: 'bun',
  args: ['run', serverPath],
});
const client = new Client({ name: 'test-call', version: '0.0.1' }, { capabilities: {} });
await client.connect(transport);

const tools = await client.listTools();
console.log('tools:', tools.tools.map(t => t.name));

// Cvar case: look up a well-known ezQuake cvar
const res = await client.callTool({ name: 'lookup_entity', arguments: { name: 'cl_bob' } });
console.log('lookup_entity(cl_bob):');
for (const block of res.content ?? []) {
  if ((block as { type: string }).type === 'text') {
    console.log((block as { text: string }).text);
  }
}

// Command case: look up a KTX-injected command (the demo pattern)
const resCmd = await client.callTool({ name: 'lookup_entity', arguments: { name: 'rpickup' } });
console.log('\nlookup_entity(rpickup):');
for (const block of resCmd.content ?? []) {
  if ((block as { type: string }).type === 'text') {
    console.log((block as { text: string }).text);
  }
}

await client.close();
```

Run:

```bash
cd apps/qw-oracle/serve/mcp
bun run scripts/test-call.ts
```

Expected: `tools: [ 'lookup_entity' ]` followed by two JSON responses. The cl_bob call returns `{type: 'cvar', project: 'ezquake', ...}` with `match_quality: 'strong'`. The rpickup call returns `{type: 'command', project: 'ktx', ...}` — and if the concept note has already been authored (Task 6 runs before this in the sequence; if executed out of order, `linked_concepts` will be empty until the server restarts with the note in place), `linked_concepts` includes `'concept:ktx_matchstart_injection'`.

- [ ] **Step 12: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/serve/mcp
git commit -m "feat(qw-oracle): MCP server skeleton with lookup_entity tool

TypeScript MCP server that exposes unified Layer 1 lookups across cvars
AND commands (single tool, type discriminator in results) with
match-quality signals and linked-session/linked-concept cross-references.
Loads concept notes via gray-matter at startup. Includes a test client
in scripts/test-call.ts for smoke verification outside Claude Code.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 8: search_solved_issues tool

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/index.ts`
- Modify: `apps/qw-oracle/serve/mcp/scripts/test-call.ts`

- [ ] **Step 1: Write `serve/mcp/src/tools/search-solved-issues.ts`**

```typescript
import { db } from '../db.ts';
import type { SessionHit, ToolResponse } from '../types.ts';

const SERVER_VERSION = '0.1.0';

interface SearchSolvedIssuesArgs {
  query: string;
  limit?: number;
  min_quality?: 'strong' | 'weak';
}

interface SessionRow {
  id: string;
  channel_name: string;
  start_at: string;
  topic: string | null;
  summary: string | null;
  quality: string;
  mentioned_cvar_ids_json: string | null;
  mentioned_cmd_ids_json: string | null;
  tags_json: string | null;
  rank: number;
}

const searchFts = db.prepare<[string, number], SessionRow>(`
  SELECT s.id, s.channel_name, s.start_at, s.topic, s.summary, s.quality,
         s.mentioned_cvar_ids_json, s.mentioned_cmd_ids_json, s.tags_json,
         f.rank AS rank
  FROM kb_sessions_fts f
  JOIN kb_sessions s ON s.rowid = f.rowid
  WHERE kb_sessions_fts MATCH ?
  ORDER BY f.rank
  LIMIT ?
`);

function parseJsonList(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export function searchSolvedIssues(args: SearchSolvedIssuesArgs): ToolResponse<SessionHit> {
  const limit = args.limit ?? 10;
  const rows = searchFts.all(args.query, limit);

  let results: SessionHit[] = rows.map(r => ({
    id: r.id,
    channel_name: r.channel_name,
    start_at: r.start_at,
    topic: r.topic,
    summary: r.summary,
    quality: r.quality,
    mentioned_cvar_ids: parseJsonList(r.mentioned_cvar_ids_json),
    mentioned_cmd_ids: parseJsonList(r.mentioned_cmd_ids_json),
    tags: parseJsonList(r.tags_json),
    rank: r.rank,
  }));

  if (args.min_quality === 'strong') {
    results = results.filter(r => r.quality === 'strong');
  }

  let matchQuality: 'strong' | 'weak' | 'none';
  if (results.length === 0) {
    matchQuality = 'none';
  } else if (results.some(r => r.quality === 'strong')) {
    matchQuality = 'strong';
  } else {
    matchQuality = 'weak';
  }

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback: matchQuality === 'none'
      ? `No indexed chat sessions match "${args.query}". The POC chat slice is narrow; a miss does not mean the topic was never discussed.`
      : null,
    meta: {
      tool: 'search_solved_issues',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
```

- [ ] **Step 2: Wire the new tool into `serve/mcp/src/index.ts`**

Add import:

```typescript
import { searchSolvedIssues } from './tools/search-solved-issues.ts';
```

Add to the `ListToolsRequestSchema` tools array:

```typescript
{
  name: 'search_solved_issues',
  description: 'Full-text search across Layer 2 summarized chat sessions from the QuakeWorld community. Returns topic, summary, and any Layer 1 cvar/command references extracted during summarization. Chat corpus is a narrow POC slice; a "none" match does not mean the topic was never discussed.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'FTS5 query. Supports phrase matching, prefix, AND/OR. E.g. "cvar AND crosshair".' },
      limit: { type: 'number', description: 'Max results. Default 10.' },
      min_quality: { type: 'string', enum: ['strong', 'weak'], description: 'Minimum session quality to include.' },
    },
    required: ['query'],
  },
},
```

Add case to the `CallToolRequestSchema` switch:

```typescript
case 'search_solved_issues': {
  const response = searchSolvedIssues(args as { query: string; limit?: number; min_quality?: 'strong' | 'weak' });
  return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
}
```

- [ ] **Step 3: Extend `scripts/test-call.ts`** — after the existing `lookup_entity` calls, add:

```typescript
const res2 = await client.callTool({ name: 'search_solved_issues', arguments: { query: 'cvar', limit: 3 } });
console.log('\nsearch_solved_issues(cvar, limit=3):');
for (const block of res2.content ?? []) {
  if ((block as { type: string }).type === 'text') {
    console.log((block as { text: string }).text);
  }
}
```

- [ ] **Step 4: Run**

```bash
cd apps/qw-oracle/serve/mcp
bun run scripts/test-call.ts
```

Expected: both lookup_entity calls still work; search_solved_issues returns up to 3 `SessionHit` entries. `match_quality` should not be `none` unless Layer 2 is empty.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts apps/qw-oracle/serve/mcp/src/index.ts apps/qw-oracle/serve/mcp/scripts/test-call.ts
git commit -m "feat(qw-oracle): MCP search_solved_issues tool over Layer 2 FTS

Adds full-text search over kb_sessions_fts with optional min_quality
filter and match-quality envelope. Test client exercises it alongside
lookup_entity.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 9: get_concept_note tool

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/index.ts`
- Modify: `apps/qw-oracle/serve/mcp/scripts/test-call.ts`

- [ ] **Step 1: Write `serve/mcp/src/tools/get-concept-note.ts`**

```typescript
import type { ConceptNote, ToolResponse } from '../types.ts';

const SERVER_VERSION = '0.1.0';

interface GetConceptNoteArgs {
  id: string;
}

export function getConceptNote(args: GetConceptNoteArgs, conceptStore: Map<string, ConceptNote>): ToolResponse<ConceptNote> {
  const note = conceptStore.get(args.id);
  if (!note) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No concept note with id "${args.id}". Available ids: ${[...conceptStore.keys()].join(', ')}`,
      meta: {
        tool: 'get_concept_note',
        server_version: SERVER_VERSION,
        queried_at: new Date().toISOString(),
      },
    };
  }

  return {
    results: [note],
    match_quality: 'strong',
    suggested_fallback: null,
    meta: {
      tool: 'get_concept_note',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
```

- [ ] **Step 2: Wire into `serve/mcp/src/index.ts`**

Add import:

```typescript
import { getConceptNote } from './tools/get-concept-note.ts';
```

Add to tools listing:

```typescript
{
  name: 'get_concept_note',
  description: 'Retrieve a Layer 3 curated concept note by canonical id (e.g. concept:ktx_matchstart_injection). Concept notes cross-link Layer 1 facts and Layer 2 chat sessions into human-authored explanations.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Canonical concept id, e.g. concept:ktx_matchstart_injection.' },
    },
    required: ['id'],
  },
},
```

Add switch case:

```typescript
case 'get_concept_note': {
  const response = getConceptNote(args as { id: string }, conceptStore);
  return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
}
```

- [ ] **Step 3: Extend `scripts/test-call.ts`**:

```typescript
const res3 = await client.callTool({ name: 'get_concept_note', arguments: { id: 'concept:ktx_matchstart_injection' } });
console.log('\nget_concept_note(concept:ktx_matchstart_injection):');
for (const block of res3.content ?? []) {
  if ((block as { type: string }).type === 'text') {
    console.log((block as { text: string }).text);
  }
}
```

- [ ] **Step 4: Run and verify all three tools**

```bash
cd apps/qw-oracle/serve/mcp
bun run scripts/test-call.ts
```

Expected: `lookup_entity(cl_bob)` returns a cvar row; `lookup_entity(rpickup)` returns a `type: 'command'` row with `project: 'ktx'` and `linked_concepts: ['concept:ktx_matchstart_injection']`; `search_solved_issues` returns session hits; `get_concept_note` returns the KTX note with body populated and `match_quality: 'strong'`.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts apps/qw-oracle/serve/mcp/src/index.ts apps/qw-oracle/serve/mcp/scripts/test-call.ts
git commit -m "feat(qw-oracle): MCP get_concept_note tool

Exposes Layer 3 concept notes over MCP. Third of three POC tools.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Phase F: Integration + demo

### Task 10: Wire the MCP server into Claude Code

**Files:**
- Create: `apps/qw-oracle/docs/poc-demo-script.md`

**Note:** This task touches user environment (Claude Code config). If executing as an agent without permission to modify `~/.claude.json`, stop and ask the user to do steps 1-3 manually.

- [ ] **Step 1: Locate the Claude Code MCP config**

```bash
claude mcp --help 2>&1 | head -20
```

- [ ] **Step 2: Register the server via CLI (preferred)**

```bash
claude mcp add qw-oracle bun run /home/paradoks/projects/quakeworld/apps/qw-oracle/serve/mcp/src/index.ts
```

Or edit `~/.claude.json` directly, adding to the `mcpServers` section:

```json
{
  "mcpServers": {
    "qw-oracle": {
      "command": "bun",
      "args": ["run", "/home/paradoks/projects/quakeworld/apps/qw-oracle/serve/mcp/src/index.ts"]
    }
  }
}
```

- [ ] **Step 3: Restart Claude Code session and verify**

In a fresh Claude Code session, run:

```
/mcp
```

Expected: `qw-oracle` listed with three tools: `lookup_entity`, `search_solved_issues`, `get_concept_note`.

Debug path if missing: run `bun run src/index.ts` manually in the mcp dir to see stderr, confirm the path in `~/.claude.json` is absolute, confirm Bun is on PATH.

- [ ] **Step 4: Write `apps/qw-oracle/docs/poc-demo-script.md`**

```markdown
# POC demo script

The rehearsed demo for the dev-server presentation. The goal is to show
Claude Code using the qw-oracle MCP to answer a question that exercises
all three layers in a single turn.

## Setup

1. Claude Code session with the `qw-oracle` MCP registered.
2. `apps/qw-oracle/data/qw.db` populated with Layer 1 and Layer 2 data.
3. `apps/qw-oracle/layers/concepts/` has at least the `ktx_matchstart_injection` note.
4. `/mcp` shows three tools exposed by `qw-oracle`.

## Primary demo query

Paste this into Claude Code:

> I am looking at a QuakeWorld config that binds the END key to `rpickup`. I cannot find `rpickup` anywhere in the ezQuake source. What is it and where does it come from?

Expected behavior:

1. Claude Code recognizes this as a QW-specific question and reaches for the `qw-oracle` MCP.
2. It calls `lookup_entity` with `name: "rpickup"`.
3. The response has one result: `{type: 'command', project: 'ktx', id: 'ktx:cmd:rpickup', ...}` with `linked_concepts: ["concept:ktx_matchstart_injection"]` and (if the slice caught it) one or more `linked_sessions`.
4. Claude Code calls `get_concept_note` with id `concept:ktx_matchstart_injection`. The note body explains KTX stuffcmd injection and references the other KTX commands (`break`, `next_map`, `ready`, etc.) in the same family.
5. Optionally, Claude Code calls `search_solved_issues` with something like `query: "rpickup"` or `"ktx stuffcmd"`.
6. Claude Code composes an answer citing: the `ktx:cmd:rpickup` row (with `extraction_method: 'scraped-json'` for honesty), the concept note body, and any chat sessions.

The key moment is when Claude Code says "this command doesn't exist in ezQuake — it's a KTX server mod command, injected into your client at match start" and cites the concept note. That's the librarian feeling.

## Secondary demo query (cross-project collision)

> In QuakeWorld, what does the `kick` command do? Is it a client thing or a server thing?

Expected behavior: `lookup_entity(name: "kick")` returns TWO rows — one `ezquake:cmd:kick` (client) and one `ktx:cmd:kick` (server). Claude Code explains that the name exists in both projects with different semantics. This is the "same name, two meanings" demo — useful if the dev-server audience wants to see cross-project linking without the injection framing.

## Fallback demo queries

If neither primary nor secondary lands well:

- "What does `cl_bob` do in ezQuake?" — exercises the cvar path
- "Give me the concept note on ezquake cvar anatomy." — exercises get_concept_note directly
- "Search the chat archive for discussions about crosshair settings." — exercises search_solved_issues alone

## What to say during the pitch

1. Show the query.
2. Let Claude Code call the MCP. Narrate the tool calls as they happen.
3. Highlight the citations in the answer.
4. Explain the pattern: same MCP, same three layers, works from any LLM outlet.

## Known rough edges (acknowledge in the pitch)

- Layer 2 is a narrow slice; answers about unindexed topics return `match_quality: none`.
- Concept notes are 3 files; coverage is almost nothing.
- No FTE/MVDSV/match data.
- No hosted outlet; everything runs locally.
- Layer 1 data is from iterative scrapers, not AST-based extraction — may have gaps.

The pitch is "this proves the pattern, not the product."
```

- [ ] **Step 5: Rehearse the demo once end-to-end**

In a fresh Claude Code session:

1. Run `/mcp` — confirm tools listed.
2. Paste the primary demo query.
3. Watch the tool calls fire.
4. Confirm the answer cites at least one Layer 1 row, the concept note, and (ideally) a Layer 2 session.
5. If fallback is needed, note the reason in `poc-demo-candidates.md`.

Capture the final answer text into `poc-demo-script.md` under a `## Rehearsed output` section.

- [ ] **Step 6: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/docs/poc-demo-script.md
git commit -m "docs(qw-oracle): POC demo script with rehearsed output

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

### Task 11: Final audit and handoff to presentation phase

- [ ] **Step 1: Run every verifier script**

```bash
cd apps/qw-oracle
node scripts/verify-layer1.mjs
node scripts/verify-layer2.mjs
node scripts/verify-concepts.mjs
```

All three pass cleanly; session-ref warnings acceptable.

- [ ] **Step 2: Run the MCP test client**

```bash
cd serve/mcp
bun run scripts/test-call.ts
```

All three tool calls return sensible JSON.

- [ ] **Step 3: Update `apps/qw-oracle/CLAUDE.md`** with a POC status block:

```markdown
### POC status (2026-04-14)

- Layer 1: N cvars, M commands imported (ezquake + fte + ktx)
- Layer 2: K sessions summarized from `#ezquake`/`#helpdesk` slice
- Layer 3: 3 concept notes (ktx_matchstart_injection, ezquake_cvar_anatomy, qw_command_vs_cvar)
- Serve: MCP server exposes lookup_entity + search_solved_issues + get_concept_note
- Consumer: Claude Code via `~/.claude.json` mcpServers entry
- Demo: `docs/poc-demo-script.md`

Next step: present to dev-server experts. See the design spec's
"Presentation plan" section.
```

Fill in the actual N/M/K counts.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/CLAUDE.md
git commit -m "docs(qw-oracle): POC status summary and handoff to presentation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Report to the user**

Summarize:

- Counts per layer
- Whether the demo query worked live or needed a fallback
- Any known rough edges to mention in the dev-server pitch
- Pointer to `apps/qw-oracle/docs/poc-demo-script.md`
- Reminder that the presentation plan lives in the spec under "Presentation plan"

---

## Out-of-scope guardrails (do NOT do these during POC execution)

If any of the following feel tempting mid-execution, STOP and flag to the user instead:

- Writing a real AST extractor for ezQuake/FTE/KTX source. JSON import is the POC.
- Processing more than ~50 selected chat sessions in Layer 2.
- Adding vector/semantic search in addition to FTS5.
- Building a weighted trust model for Layer 2 claims.
- Identity unification across IRC/Discord/in-game names.
- Adding a fourth MCP tool.
- Wiring the MCP into Quad, Slipgate helper panel, or any other outlet.
- Building any kind of frontend.
- Processing forum archives, match data, or documentation.
- Adding tests or test infrastructure.

All of these are on the deferred roadmap and are answered during the dev-server presentation phase.
