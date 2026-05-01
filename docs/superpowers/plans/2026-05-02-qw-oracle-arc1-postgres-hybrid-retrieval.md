# QW Oracle Arc 1: Postgres + Hybrid Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move qw-oracle's authoritative store from SQLite to Postgres 16 + pgvector + tsvector, port all three layers, add hybrid retrieval with new `search_concepts` tool and bidirectional concept graph, and deploy as a public MCP at `oracle.slipgate.me`.

**Architecture:** Single-engine Postgres replaces both `knowledge.db` (SQLite + better-sqlite3) and `qw.db` (SQLite + FTS5). pgvector handles semantic vectors; tsvector + GIN handles lexical search. Reciprocal Rank Fusion (RRF) merges the two retrievers. Voyage v4 embeddings (`voyage-4-large` at build, `voyage-4-lite` at query, shared embedding space). MCP server runs as a Docker container on Unraid behind Cloudflare Tunnel.

**Tech Stack:**
- Postgres 16 + pgvector extension (image: `pgvector/pgvector:pg16`)
- `postgres-js` client (replaces `better-sqlite3` + `bun:sqlite` — Workers-compatible)
- TypeScript + Bun for the MCP server (existing convention)
- TypeScript + Node 20 / tsx for the loader (existing convention)
- `@modelcontextprotocol/sdk` (existing)
- Voyage AI API for embeddings
- Docker Compose (dev + Unraid)
- nginx reverse proxy + Cloudflare Tunnel (Unraid existing)

**Spec:** `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`

**Convention notes:**
- Plan touches files under `apps/qw-oracle/`. All paths in this plan are relative to `apps/qw-oracle/` unless absolute.
- Tests use `bun:test` (existing pattern, see `serve/mcp/src/tools/maps.test.ts`).
- Migrations are hand-rolled `.sql` files run by a tiny Node migrator (per spec open-question default).
- ASCII-only output; no emoji in code or docs (operator preference, captured in memory).
- Commit after each task per project convention; one-line message describing what + why.

---

## File Structure

### New files

```
apps/qw-oracle/
  db/
    docker-compose.dev.yml             # Dev Postgres container
    docker-compose.prod.yml            # Unraid Postgres + MCP server container
    migrate.ts                         # Migrator CLI (run all .sql in order, idempotent)
    migrations/
      001_init.sql                     # extensions + schema_meta + embedding_metadata
      002_layer1_entities.sql          # entities + *_versions + source_lines
      003_layer1_qw_namespace.sql      # qw maps + entity_defs + mechanics
      004_layer1_assets.sql            # asset relation tables (engine ports)
      005_layer2_chat.sql              # messages + sessions + message_labels + tsv
      006_layer3_concepts.sql          # concepts + concept_chunks + graph + redirect_targets
      007_observability.sql            # query_log + embedding_api_log
  shared/
    db.ts                              # postgres-js client singleton
    embedding.ts                       # Voyage API client + retry/log
    chunking.ts                        # Markdown-heading chunker
    rrf.ts                             # Reciprocal Rank Fusion helper
  scripts/
    load-knowledge/                    # Existing dir, see "Modify" below
    load-concepts/
      index.ts                         # CLI: load-concepts [--force]
      parse.ts                         # YAML frontmatter + body chunking
      upsert.ts                        # Per-slug atomic upsert
    load-chat/
      import-discord.ts                # Replaces scripts/import-discord.mjs
      import-irc.ts                    # Replaces scripts/import-irc.mjs (raw port)
      build-search.ts                  # Materialised view refresh (or no-op if on-the-fly)
    embed/
      embed-entities.ts                # Pass over Layer 1 entities, hash-based incremental
      embed-chunks.ts                  # Called by load-concepts; can also run standalone
      voyage.ts                        # Shared Voyage call wrapper
    db-up.sh                           # One-shot: docker compose up + migrate + seed minimum
  serve/mcp/
    src/
      tools/
        search-concepts.ts             # NEW
        redirect-to-human.ts           # NEW
        # (existing tools modified, see below)
      orientation.ts                   # Server-level orientation instructions
      query-log.ts                     # Observability writer
  eval/
    queries.json                       # 15-20 hand-picked eval queries with expected hits
    eval.ts                            # Runner script: npm run eval
    calibrate.ts                       # Threshold calibration helper
  Dockerfile                           # MCP server container build
  .env.example                         # Documented env vars
docs/superpowers/specs/                  (existing dir)
contracts/
  active/
    snapshot-manifest-schema.md        # Promoted from this spec (Arc 2 prep, but referenced)
```

### Modified files

```
apps/qw-oracle/
  package.json                         # Add postgres-js, voyage-ai client (or fetch), node-pg-migrate? (no, hand-rolled), drop better-sqlite3
  CLAUDE.md                            # Retire "SQLite over Postgres" rule
  README.md                            # Update tech-stack section
  serve/mcp/
    src/
      db.ts                            # Replace bun:sqlite with postgres-js
      index.ts                         # Wire new tools, orientation, query log
      types.ts                         # Add SearchConceptResult, RedirectTarget types
      tools/
        lookup-entity.ts               # Add related_concepts to response, switch to postgres-js
        lookup-map.ts                  # Switch to postgres-js
        lookup-mechanic.ts             # Switch to postgres-js
        lookup-gameplay-entity.ts      # Switch to postgres-js
        get-concept-note.ts            # Read from Postgres (was Map at startup)
        search-entities.ts             # Upgrade to hybrid (RRF lexical+vector)
        search-maps.ts                 # Switch to postgres-js
        search-mechanics.ts            # Switch to postgres-js
        search-gameplay-entities.ts    # Switch to postgres-js
        search-solved-issues.ts        # Switch from FTS5 to tsvector + GIN
      concept-loader.ts                # Delete (responsibility moves to load-concepts loader writing to DB)
  scripts/load-knowledge/
    db.ts                              # Replace better-sqlite3 with postgres-js
    schema.ts                          # Delete (replaced by migrations/)
    types.ts                           # Keep, but move to shared/types.ts if cleaner
    natural-keys.ts                    # Switch to postgres-js
    load-version.ts                    # Switch to postgres-js
    diff-versions.ts                   # Switch to postgres-js
    enrich.ts                          # Switch to postgres-js
    build-snapshot.ts                  # Switch to postgres-js (Arc 2 will rebuild this; v1 keeps current behaviour)
    # ... all other adapter files (see existing structure)
  scripts/import-discord.mjs           # Delete (replaced by scripts/load-chat/import-discord.ts)
  scripts/import-irc.mjs               # Delete (replaced by scripts/load-chat/import-irc.ts)
  scripts/db.mjs                       # Delete
  scripts/build-search-index.mjs       # Delete (tsvector is GENERATED ALWAYS)
  scripts/search.mjs                   # Delete (use psql for ad-hoc queries instead)
  scripts/stats.mjs                    # Port to .ts, postgres-js
  scripts/process-tier1.mjs            # Delete (Arc 3 territory; out of scope)
  scripts/sample-*.mjs                 # Delete (POC scratchpads)
  scripts/helpdesk-benchmark.mjs       # Delete (succeeded by eval/eval.ts)
  scripts/helpdesk-coverage.mjs        # Delete (succeeded by eval/eval.ts)
```

---

## Phases & cumulative deliverables

| Phase | Deliverable | Working software at the end? |
|---|---|---|
| 1. Foundation | Postgres running, migrator works, smoke test passes | DB only |
| 2. Layer 1 port | `entities` + version arc + qw namespace populated from extractor JSON | DB has L1 data |
| 3. Layer 2 port | Messages + sessions + tsvector populated from Discord/IRC dumps | DB has all 3 layers' raw data |
| 4. Layer 3 + graph | Concept notes, chunks, graph tables populated | DB has all data; vectors empty |
| 5. Embedding pipeline | Voyage v4 vectors written; metadata + log tables populated | DB is fully built |
| 6. MCP server rewrite | All tools running on Postgres; new tools (search_concepts, redirect_to_human); RRF; orientation | MCP works locally end-to-end |
| 7. Observability | Query log + API log writes; operator SQL doc | MCP self-monitors |
| 8. Eval + deploy | Eval set, calibrated thresholds, container build, Unraid deploy, public DNS | Public MCP live at `oracle.slipgate.me` |

Each phase commits a coherent unit. Phases 1-4 are mostly mechanical (schema + loader port). Phase 5 introduces external API dependency. Phase 6 is the largest (MCP rewrite). Phases 7-8 are operationalisation.

---

# Phase 1 — Foundation

## Task 1: Add Postgres deps, drop SQLite deps from `package.json`

**Files:**
- Modify: `apps/qw-oracle/package.json`

- [ ] **Step 1: Edit `apps/qw-oracle/package.json` dependencies**

```json
{
  "dependencies": {
    "@qw/version-resolution": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "gray-matter": "^4.0.3",
    "js-yaml": "^4.1.1",
    "postgres": "^3.4.5",
    "ulid": "^2.4.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.19.39",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  }
}
```

(Drop `better-sqlite3`, `@types/better-sqlite3`. The MCP server's Bun runtime gets `postgres-js` from the same install.)

- [ ] **Step 2: Update scripts in `package.json`**

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "db:up": "docker compose -f db/docker-compose.dev.yml up -d",
    "db:down": "docker compose -f db/docker-compose.dev.yml down",
    "db:logs": "docker compose -f db/docker-compose.dev.yml logs -f postgres",
    "db:psql": "docker compose -f db/docker-compose.dev.yml exec postgres psql -U qworacle -d qw_oracle",
    "migrate": "tsx db/migrate.ts",
    "migrate:reset": "tsx db/migrate.ts --reset",
    "load-knowledge": "tsx scripts/load-knowledge/index.ts",
    "load-concepts": "tsx scripts/load-concepts/index.ts",
    "load-chat:discord": "tsx scripts/load-chat/import-discord.ts",
    "load-chat:irc": "tsx scripts/load-chat/import-irc.ts",
    "embed:entities": "tsx scripts/embed/embed-entities.ts",
    "embed:chunks": "tsx scripts/embed/embed-chunks.ts",
    "stats": "tsx scripts/stats.ts",
    "eval": "tsx eval/eval.ts",
    "calibrate": "tsx eval/calibrate.ts"
  }
}
```

- [ ] **Step 3: Install with the monorepo's npm-no-workspaces convention**

Run: `npm install --no-workspaces` from `apps/qw-oracle/`
Expected: lockfile updates, no errors. (Operator may need to set up monorepo-root npm hoisting separately if `tsx` resolution misbehaves — that's a one-shot, not a recurring task.)

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/package.json apps/qw-oracle/package-lock.json
git commit -m "qw-oracle: switch deps to postgres-js, drop better-sqlite3"
```

---

## Task 2: Create `docker-compose.dev.yml` for local Postgres

**Files:**
- Create: `apps/qw-oracle/db/docker-compose.dev.yml`
- Create: `apps/qw-oracle/.env.example`

- [ ] **Step 1: Create `db/docker-compose.dev.yml`**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: qw-oracle-postgres-dev
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_DB: qw_oracle
      POSTGRES_USER: qworacle
      POSTGRES_PASSWORD: dev
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - qw-oracle-pgdata-dev:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U qworacle -d qw_oracle"]
      interval: 5s
      timeout: 3s
      retries: 5
volumes:
  qw-oracle-pgdata-dev:
```

(Bind to `127.0.0.1` so dev DB never accidentally exposes to the network.)

- [ ] **Step 2: Create `.env.example` documenting all env vars**

```
# qw-oracle environment configuration
# Copy to .env (gitignored) and fill in real values.

# Database
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle

# Voyage AI (sign up at console.anthropic.com or voyageai.com)
VOYAGE_API_KEY=

# Embedding models (Voyage v4 series; same shared embedding space)
EMBEDDING_MODEL_BUILD=voyage-4-large
EMBEDDING_MODEL_QUERY=voyage-4-lite
EMBEDDING_DIMENSION=1024

# Public-facing config (production only)
PUBLIC_BASE_URL=http://localhost:3000
SNAPSHOT_DIR=./snapshots

# Match quality thresholds — placeholder values; calibrated as deploy-gate step.
# Run `npm run calibrate` after eval set is loaded to compute real values.
MATCH_QUALITY_STRONG_THRESHOLD=0.50
MATCH_QUALITY_WEAK_THRESHOLD=0.20

# Rate limiting (production only; CF handles edge rate limiting too)
RATE_LIMIT_PER_MINUTE=60
```

- [ ] **Step 3: Add `.env` to `.gitignore` (verify already present)**

Run: `grep -q '^\.env$' apps/qw-oracle/.gitignore || echo '.env' >> apps/qw-oracle/.gitignore`

- [ ] **Step 4: Bring up Postgres and verify**

Run: `cd apps/qw-oracle && npm run db:up`
Expected: container starts, `docker ps` shows `qw-oracle-postgres-dev` healthy.

Run: `cd apps/qw-oracle && npm run db:psql -- -c 'SELECT version();'`
Expected: prints PostgreSQL 16.x output.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/db/docker-compose.dev.yml apps/qw-oracle/.env.example apps/qw-oracle/.gitignore
git commit -m "qw-oracle: add docker-compose dev Postgres + env vars template"
```

---

## Task 3: Implement migrator CLI

**Files:**
- Create: `apps/qw-oracle/db/migrate.ts`
- Create: `apps/qw-oracle/db/migrations/001_init.sql`
- Test: `apps/qw-oracle/db/migrate.test.ts`

- [ ] **Step 1: Write failing test for `migrate.ts`**

```ts
// apps/qw-oracle/db/migrate.test.ts
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import postgres from 'postgres';
import { runMigrations, resetDb } from './migrate.ts';

const TEST_URL = process.env.DATABASE_URL ?? 'postgresql://qworacle:dev@localhost:5432/qw_oracle';

describe('migrator', () => {
  const sql = postgres(TEST_URL, { onnotice: () => {} });

  beforeAll(async () => {
    await resetDb(sql);
  });

  afterAll(async () => {
    await sql.end();
  });

  test('runs all migrations in order', async () => {
    await runMigrations(sql);
    const rows = await sql<{ filename: string }[]>`SELECT filename FROM schema_meta ORDER BY applied_at`;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].filename).toBe('001_init.sql');
  });

  test('is idempotent on re-run', async () => {
    await runMigrations(sql);
    await runMigrations(sql);   // second run is no-op
    const before = (await sql`SELECT count(*)::int as c FROM schema_meta`)[0].c;
    await runMigrations(sql);
    const after = (await sql`SELECT count(*)::int as c FROM schema_meta`)[0].c;
    expect(after).toBe(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/qw-oracle && bun test db/migrate.test.ts`
Expected: FAIL — `migrate.ts` doesn't exist.

- [ ] **Step 3: Implement `db/migrate.ts`**

```ts
// apps/qw-oracle/db/migrate.ts
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, 'migrations');

export async function runMigrations(sql: postgres.Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_meta (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      sha256 TEXT NOT NULL
    )
  `;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    const path = resolve(MIGRATIONS_DIR, filename);
    const text = readFileSync(path, 'utf8');
    const sha = await hash(text);

    const existing = await sql<{ sha256: string }[]>`
      SELECT sha256 FROM schema_meta WHERE filename = ${filename}
    `;
    if (existing.length > 0) {
      if (existing[0].sha256 !== sha) {
        throw new Error(
          `Migration ${filename} was modified after it was applied. ` +
          `Migrations must be append-only. Create a new migration file instead.`,
        );
      }
      continue;
    }

    console.log(`[migrate] applying ${filename}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`INSERT INTO schema_meta(filename, sha256) VALUES (${filename}, ${sha})`;
    });
  }
  console.log(`[migrate] all migrations applied (${files.length} files)`);
}

export async function resetDb(sql: postgres.Sql): Promise<void> {
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`GRANT ALL ON SCHEMA public TO public`;
}

async function hash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const sql = postgres(url);
  try {
    if (process.argv.includes('--reset')) {
      await resetDb(sql);
      console.log('[migrate] schema reset');
    }
    await runMigrations(sql);
  } finally {
    await sql.end();
  }
}
```

- [ ] **Step 4: Create initial migration `001_init.sql`**

```sql
-- apps/qw-oracle/db/migrations/001_init.sql
-- Foundation: extensions + cross-cutting metadata.

CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding model + dimension metadata. One row, source of truth.
-- Loader writes here on every successful build pass. MCP startup verifies that
-- the configured EMBEDDING_MODEL_QUERY shares dimension with whatever was
-- written here, otherwise it refuses to start.
CREATE TABLE embedding_metadata (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  model_name      TEXT NOT NULL,
  model_version   TEXT NOT NULL,
  dimension       INTEGER NOT NULL,
  embedded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  rows_embedded   INTEGER NOT NULL DEFAULT 0
);

-- Schema-level oracle metadata: project version, last full rebuild, etc.
CREATE TABLE oracle_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO oracle_meta (key, value) VALUES ('schema_version', '19') ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 5: Run test to verify pass**

Run: `cd apps/qw-oracle && bun test db/migrate.test.ts`
Expected: PASS, both tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/qw-oracle/db/migrate.ts apps/qw-oracle/db/migrate.test.ts apps/qw-oracle/db/migrations/001_init.sql
git commit -m "qw-oracle: add hand-rolled migrator CLI + 001_init migration"
```

---

## Task 4: Shared `db.ts` postgres-js singleton

**Files:**
- Create: `apps/qw-oracle/shared/db.ts`
- Test: `apps/qw-oracle/shared/db.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// apps/qw-oracle/shared/db.test.ts
import { describe, expect, test } from 'bun:test';
import { db, closeDb } from './db.ts';

describe('shared db client', () => {
  test('connects and runs a trivial query', async () => {
    const result = await db<{ one: number }[]>`SELECT 1::int as one`;
    expect(result[0].one).toBe(1);
    await closeDb();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd apps/qw-oracle && bun test shared/db.test.ts`
Expected: FAIL — `shared/db.ts` doesn't exist.

- [ ] **Step 3: Implement `shared/db.ts`**

```ts
// apps/qw-oracle/shared/db.ts
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set');
}

export const db = postgres(url, {
  // Suppress NOTICE output; we want errors only.
  onnotice: () => {},
  // Reasonable defaults for a single-instance MCP server + loader.
  max: 16,
  idle_timeout: 30,
  connect_timeout: 10,
});

export async function closeDb(): Promise<void> {
  await db.end();
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `cd apps/qw-oracle && bun test shared/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/shared/db.ts apps/qw-oracle/shared/db.test.ts
git commit -m "qw-oracle: add shared postgres-js client singleton"
```

---

## Task 5: Smoke-test integration: db:up → migrate → connect

**Files:**
- Create: `apps/qw-oracle/scripts/db-up.sh`

- [ ] **Step 1: Create `scripts/db-up.sh`**

```bash
#!/usr/bin/env bash
# Convenience: spin up dev DB, run migrations, exit clean.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker ps --format '{{.Names}}' | grep -q '^qw-oracle-postgres-dev$'; then
  echo "[db-up] starting Postgres..."
  npm run db:up
fi

echo "[db-up] waiting for Postgres healthcheck..."
for i in {1..30}; do
  if docker compose -f db/docker-compose.dev.yml exec -T postgres pg_isready -U qworacle -d qw_oracle > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[db-up] running migrations..."
DATABASE_URL=${DATABASE_URL:-postgresql://qworacle:dev@localhost:5432/qw_oracle} npm run migrate

echo "[db-up] ready."
```

- [ ] **Step 2: chmod +x and test**

Run: `chmod +x apps/qw-oracle/scripts/db-up.sh && cd apps/qw-oracle && ./scripts/db-up.sh`
Expected: Postgres up, `001_init.sql` applied, clean exit.

- [ ] **Step 3: Verify schema_meta has the migration**

Run: `cd apps/qw-oracle && npm run db:psql -- -c 'SELECT filename FROM schema_meta'`
Expected: row with `001_init.sql`.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/scripts/db-up.sh
git commit -m "qw-oracle: add db-up.sh convenience script"
```

---

# Phase 2 — Layer 1 port

## Task 6: Migration `002_layer1_entities.sql` — entities + version arc

**Files:**
- Create: `apps/qw-oracle/db/migrations/002_layer1_entities.sql`

This task ports the existing Layer 1 SQLite schema (entities, *_versions, source_lines) to Postgres. The shape comes from `apps/qw-oracle/scripts/load-knowledge/schema.ts`. We replace SQLite's CHECK-widening pattern with Postgres CHECK constraints; add embedding columns up-front per spec; and add the description tsvector + GIN.

- [ ] **Step 1: Read existing schema.ts to extract row shapes**

Run: `cat apps/qw-oracle/scripts/load-knowledge/schema.ts | head -200`
Note: capture the exact column names and types for each `*_versions` table; the migration must mirror them so consumer code that previously read them continues to work.

- [ ] **Step 2: Write `002_layer1_entities.sql`**

```sql
-- apps/qw-oracle/db/migrations/002_layer1_entities.sql
-- Layer 1: engine entities + per-version arc + per-field blame + embeddings.

CREATE TABLE entities (
  canonical_id        TEXT PRIMARY KEY,         -- e.g. "ezquake:cvar:cl_bob"
  project             TEXT NOT NULL CHECK (project IN ('ezquake','fte','qwcl','mvdsv','ktx')),
  type                TEXT NOT NULL CHECK (type IN ('cvar','command','macro','cmdline_param','keyname','hud_element','ruleset','token_primitive','asset_consumption','flag_bit','protocol_message','info_key','log_template','qc_builtin','cross_engine_alias')),
  name                TEXT NOT NULL,
  description         TEXT,
  source_state        TEXT NOT NULL CHECK (source_state IN ('active','retired','doc_only','source_retired')),
  first_seen_version  TEXT,
  last_seen_version   TEXT,
  retired_at_version  TEXT,
  description_embedding         vector(1024),
  description_embedding_sha256  TEXT,
  description_embedding_stale   BOOLEAN NOT NULL DEFAULT FALSE,
  description_tsv     tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(description, ''))) STORED
);
CREATE INDEX entities_project_type ON entities(project, type);
CREATE INDEX entities_name ON entities(lower(name));
CREATE INDEX entities_desc_tsv_gin ON entities USING GIN (description_tsv);
CREATE INDEX entities_desc_embedding_hnsw ON entities USING hnsw (description_embedding vector_cosine_ops);

-- Per-version snapshots for each entity type. One table per type so schema
-- can vary without polluting a giant union row. We mirror the SQLite design.
-- Columns deliberately match scripts/load-knowledge/schema.ts; add new
-- columns by adding new migrations, not by rewriting this one.

CREATE TABLE cvar_versions (
  canonical_id  TEXT NOT NULL REFERENCES entities(canonical_id) ON DELETE CASCADE,
  version       TEXT NOT NULL,
  default_value TEXT,
  flags_raw     TEXT,
  description   TEXT,
  source_file   TEXT,
  source_line   INTEGER,
  PRIMARY KEY (canonical_id, version)
);
CREATE INDEX cvar_versions_version ON cvar_versions(version);

CREATE TABLE command_versions (
  canonical_id  TEXT NOT NULL REFERENCES entities(canonical_id) ON DELETE CASCADE,
  version       TEXT NOT NULL,
  description   TEXT,
  source_file   TEXT,
  source_line   INTEGER,
  category      TEXT,
  PRIMARY KEY (canonical_id, version)
);

CREATE TABLE macro_versions (
  canonical_id   TEXT NOT NULL REFERENCES entities(canonical_id) ON DELETE CASCADE,
  version        TEXT NOT NULL,
  expansion      TEXT,
  description    TEXT,
  source_file    TEXT,
  source_line    INTEGER,
  PRIMARY KEY (canonical_id, version)
);

-- (continue with the remaining *_versions tables: cmdline_param_versions, keyname_versions,
--  hud_element_versions, ruleset_versions, token_primitive_versions, asset_consumption_versions,
--  flag_bit_versions, protocol_message_versions, info_key_versions, log_template_versions,
--  qc_builtin_versions, cross_engine_alias_versions. Each mirrors the SQLite shape from
--  scripts/load-knowledge/schema.ts. The implementation engineer reads schema.ts and
--  writes the remaining CREATE TABLE blocks; do NOT skip any type.)

-- Per-field blame: which source-file/line introduced or last touched each field
-- of a per-version row. This is what powers `lookup_entity` blame display.
CREATE TABLE source_lines (
  canonical_id      TEXT NOT NULL REFERENCES entities(canonical_id) ON DELETE CASCADE,
  version           TEXT NOT NULL,
  field             TEXT NOT NULL,
  source_file       TEXT NOT NULL,
  source_line       INTEGER NOT NULL,
  override_kind     TEXT,
  PRIMARY KEY (canonical_id, version, field)
);

-- Diff/blame events: per-field changes between consecutive versions.
CREATE TABLE entity_change_events (
  id                BIGSERIAL PRIMARY KEY,
  canonical_id      TEXT NOT NULL REFERENCES entities(canonical_id) ON DELETE CASCADE,
  from_version      TEXT,
  to_version        TEXT NOT NULL,
  field             TEXT NOT NULL,
  from_value        TEXT,
  to_value          TEXT,
  pr_number         INTEGER,
  pr_url            TEXT,
  commit_sha        TEXT
);
CREATE INDEX entity_change_events_canonical ON entity_change_events(canonical_id);
CREATE INDEX entity_change_events_pr ON entity_change_events(pr_number) WHERE pr_number IS NOT NULL;
```

NOTE: the SQL above stops at `macro_versions` for brevity. The implementation engineer must write CREATE TABLE for all 14 entity types, mirroring `apps/qw-oracle/scripts/load-knowledge/schema.ts`. Take the time. Do not skip any type. The plan author estimates ~200 additional lines of CREATE TABLE.

- [ ] **Step 3: Run migrator and verify**

Run: `cd apps/qw-oracle && npm run migrate`
Expected: `002_layer1_entities.sql` applied. No errors.

- [ ] **Step 4: Verify all 14 *_versions tables exist**

Run: `cd apps/qw-oracle && npm run db:psql -- -c "\dt *_versions"`
Expected: 14 tables listed (one per entity type).

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/db/migrations/002_layer1_entities.sql
git commit -m "qw-oracle: migration 002 - Layer 1 entities + version arc + embedding column"
```

---

## Task 7: Migration `003_layer1_qw_namespace.sql` — game content

**Files:**
- Create: `apps/qw-oracle/db/migrations/003_layer1_qw_namespace.sql`

The `qw` namespace is flat per-domain tables (no version arc, no `entities` row, sentinel version `static`). Maps + game mechanics today; future game-content domains land here.

- [ ] **Step 1: Read existing schema for qw namespace**

Run: `grep -A 30 'CREATE TABLE.*maps\|CREATE TABLE.*entity_defs\|CREATE TABLE.*mechanics' apps/qw-oracle/scripts/load-knowledge/schema.ts`

- [ ] **Step 2: Write the migration mirroring the SQLite shape**

```sql
-- apps/qw-oracle/db/migrations/003_layer1_qw_namespace.sql
-- The qw namespace: game content (maps, gameplay entity defs, mechanics).
-- Flat tables, no version arc.

CREATE TABLE qw_maps (
  canonical_name           TEXT PRIMARY KEY,
  file_name                TEXT NOT NULL,
  display_name             TEXT,
  author                   TEXT,
  bsp_version              TEXT NOT NULL,
  bsp_size_bytes           INTEGER NOT NULL,
  bsp_sha256               TEXT NOT NULL,
  worldspawn_json          JSONB NOT NULL,
  entity_count             INTEGER NOT NULL,
  class_counts_json        JSONB NOT NULL,
  item_summary_json        JSONB NOT NULL,
  spawn_summary_json       JSONB NOT NULL,
  features_json            JSONB NOT NULL,
  wads_referenced_json     JSONB NOT NULL,
  inferred_gamemodes_json  JSONB NOT NULL,
  popularity_total         INTEGER,
  popularity_by_mode_json  JSONB,
  popularity_rank          INTEGER,
  notes                    TEXT,
  source_bsp_url           TEXT NOT NULL,
  extracted_at             TIMESTAMPTZ NOT NULL
);
CREATE INDEX qw_maps_display_name ON qw_maps(lower(display_name));

CREATE TABLE qw_entity_defs (
  classname                TEXT PRIMARY KEY,
  category                 TEXT NOT NULL,
  description              TEXT,
  fields_json              JSONB,
  source_ref               TEXT
);
CREATE INDEX qw_entity_defs_category ON qw_entity_defs(category);

CREATE TABLE qw_mechanics (
  slug                     TEXT PRIMARY KEY,
  title                    TEXT NOT NULL,
  category                 TEXT NOT NULL,
  description              TEXT NOT NULL,
  source_ref               TEXT
);
CREATE INDEX qw_mechanics_category ON qw_mechanics(category);
```

- [ ] **Step 3: Migrate, verify**

Run: `cd apps/qw-oracle && npm run migrate && npm run db:psql -- -c "\dt qw_*"`
Expected: 3 tables listed.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/db/migrations/003_layer1_qw_namespace.sql
git commit -m "qw-oracle: migration 003 - qw namespace (maps, entity_defs, mechanics)"
```

---

## Task 8: Migration `004_layer1_assets.sql` — asset relation tables

**Files:**
- Create: `apps/qw-oracle/db/migrations/004_layer1_assets.sql`

The asset relation tables (categories, extensions, path rules, cvar bindings, loader sites) are referenced by FTE per the spec's domain inventory.

- [ ] **Step 1: Read existing asset schema**

Run: `grep -B 2 -A 30 'CREATE TABLE.*asset' apps/qw-oracle/scripts/load-knowledge/schema.ts`

- [ ] **Step 2: Write the migration mirroring the SQLite shape**

```sql
-- apps/qw-oracle/db/migrations/004_layer1_assets.sql
-- Layer 1 asset relation tables (currently FTE-populated).
-- Mirror SQLite shapes from scripts/load-knowledge/schema.ts.

-- (CREATE TABLE for: asset_categories, asset_extensions, asset_path_rules,
--  asset_cvar_bindings, asset_loader_sites. Engineer copies shapes from
--  schema.ts; ~80 additional lines. Each table has project + version columns
--  to fit the per-version arc model.)
```

- [ ] **Step 3: Migrate + verify**

Run: `cd apps/qw-oracle && npm run migrate && npm run db:psql -- -c "\dt asset_*"`
Expected: 5 tables.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/db/migrations/004_layer1_assets.sql
git commit -m "qw-oracle: migration 004 - Layer 1 asset relation tables"
```

---

## Task 9: Port `load-knowledge` loader from better-sqlite3 to postgres-js

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/db.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/diff-versions.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/enrich.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/index.ts`
- Delete: `apps/qw-oracle/scripts/load-knowledge/schema.ts` (replaced by migrations/)
- Modify: every other `load-*.ts` adapter (per existing dispatcher in index.ts)

This is mechanical but extensive — the loader has ~15 adapter files. Each one currently does prepared `db.prepare(...)` calls against better-sqlite3; they need to use postgres-js template literals or unsafe queries with parameter arrays.

- [ ] **Step 1: Replace `db.ts`**

```ts
// apps/qw-oracle/scripts/load-knowledge/db.ts
// Re-export the shared client so the rest of the loader doesn't need to know.
export { db, closeDb } from '../../shared/db.ts';
```

- [ ] **Step 2: Delete `schema.ts` and `applySchema` calls**

The migrator owns schema now. Find and delete all imports of `applySchema` / `SCHEMA_VERSION` / `SCHEMA_V*_MIGRATION_SQL` / `migrateV*ToV*`. The migrator runs as a separate step before any loader command.

Run: `grep -rln 'applySchema\|SCHEMA_VERSION\|SCHEMA_V[0-9]_MIGRATION_SQL\|migrateV' apps/qw-oracle/scripts/load-knowledge/` to find all callers, then delete each import + call site.

- [ ] **Step 3: Port `natural-keys.ts`**

This file has the `upsertEntity` / `upsertSourceOverride` helpers. Each becomes a postgres-js template-literal call. Pattern:

```ts
// before (better-sqlite3)
const stmt = db.prepare('INSERT INTO entities ... ON CONFLICT ... DO UPDATE ...');
stmt.run(canonicalId, project, type, name, description, sourceState);

// after (postgres-js)
import { db } from './db.ts';
export async function upsertEntity(row: EntityRow): Promise<void> {
  await db`
    INSERT INTO entities (canonical_id, project, type, name, description, source_state)
    VALUES (${row.canonicalId}, ${row.project}, ${row.type}, ${row.name},
            ${row.description}, ${row.sourceState})
    ON CONFLICT (canonical_id) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        source_state = EXCLUDED.source_state
  `;
}
```

Engineer ports each helper; the work is rote.

- [ ] **Step 4: Port `load-version.ts`**

This is the dispatcher entry. Convert the top-level transaction wrapper:

```ts
// before
const tx = db.transaction(() => { ... });
tx();

// after
await db.begin(async (tx) => {
  // pass tx into adapters instead of importing db at module scope
});
```

Each adapter's signature gains a `tx: postgres.Sql` parameter.

- [ ] **Step 5: Port `diff-versions.ts` (per-field diff hot loop)**

The Map preload pattern stays, but reads switch to postgres-js. Likely the only file where performance matters — keep the bulk-fetch shape:

```ts
const all = await tx<DiffRow[]>`
  SELECT canonical_id, version, default_value, flags_raw, description, source_file, source_line
  FROM cvar_versions
  WHERE canonical_id = ANY(${canonicalIds})
`;
const byKey = new Map(all.map((r) => [`${r.canonical_id}:${r.version}`, r]));
```

- [ ] **Step 6: Port `enrich.ts`, every `load-*.ts` adapter, `build-snapshot.ts`**

Same pattern: prepared statements become template-literal awaits; transactions become `db.begin(async (tx) => ...)`. Engineer works through the dispatcher in `index.ts`, follows imports, ports each.

- [ ] **Step 7: Run typecheck**

Run: `cd apps/qw-oracle && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Re-run extractor outputs through the loader against an empty DB to verify the port**

Run:
```bash
cd apps/qw-oracle
npm run db:up
npm run migrate:reset && npm run migrate
npm run load-knowledge -- load-version --project ezquake --tag v3.6.9
```
Expected: load completes without error; entity counts match what the SQLite version produced (compare against `docs/arc-history.md` recorded numbers if available).

- [ ] **Step 9: Spot-check a known entity**

Run: `cd apps/qw-oracle && npm run db:psql -- -c "SELECT canonical_id, source_state FROM entities WHERE canonical_id = 'ezquake:cvar:cl_bob'"`
Expected: one row, `source_state = 'active'`.

- [ ] **Step 10: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/
git commit -m "qw-oracle: port load-knowledge loader to postgres-js"
```

---

## Task 10: Re-run all loaded versions to populate L1

This is data-restoration, not code: walk every committed extractor output and re-run the loader so the new Postgres has the same content the old SQLite had.

- [ ] **Step 1: List all loaded versions from prior runs**

Run: `git log --all --pretty=format:'%s' apps/qw-oracle/scripts/extractors | grep -iE 'load|tag' | head -30`
(Or just inspect `apps/qw-oracle/docs/arc-history.md` for the canonical list of loaded tags.)

- [ ] **Step 2: Run `load-version` for each project/tag pair**

For ezQuake: `v3.0` through `v3.6.9` plus `head`.
For FTE: `build-6698`.
For QWCL: `2.33`.
For MVDSV: `head`.

```bash
cd apps/qw-oracle
for tag in v3.0 v3.0.5 ... v3.6.9 head; do
  npm run load-knowledge -- load-version --project ezquake --tag "$tag"
done
npm run load-knowledge -- load-version --project fte --tag build-6698
npm run load-knowledge -- load-version --project qwcl --tag 2.33
npm run load-knowledge -- load-version --project mvdsv --tag head
```

- [ ] **Step 3: Run `qw`-namespace loaders (maps + mechanics + entity_defs)**

```bash
cd apps/qw-oracle
npm run load-knowledge -- load-qw-maps
npm run load-knowledge -- load-qw-mechanics
npm run load-knowledge -- load-qw-entity-defs
```

(Subcommand names should match the existing dispatcher in `scripts/load-knowledge/index.ts`. If they differ, use the actual names.)

- [ ] **Step 4: Verify counts match historical numbers**

Run: `cd apps/qw-oracle && npm run db:psql -- -c "SELECT project, COUNT(*) FROM entities GROUP BY project"`
Expected: ezquake=4042, fte=3279, qwcl=380, mvdsv=1236, qw=254 maps + 78 game-content rows. (If counts differ by more than ~5%, stop and investigate before continuing.)

- [ ] **Step 5: No commit** — this task produces DB state, not files.

---

# Phase 3 — Layer 2 port

## Task 11: Migration `005_layer2_chat.sql` — messages, sessions, message_labels

**Files:**
- Create: `apps/qw-oracle/db/migrations/005_layer2_chat.sql`

The existing SQLite schema is in `apps/qw-oracle/scripts/db.mjs` (about to be deleted). Mirror the table shapes.

- [ ] **Step 1: Read existing Layer 2 schema**

Run: `cat apps/qw-oracle/scripts/db.mjs | head -200`

- [ ] **Step 2: Write `005_layer2_chat.sql`**

```sql
-- apps/qw-oracle/db/migrations/005_layer2_chat.sql
-- Layer 2: chat corpus (Discord + IRC).
-- v1: port-only. tsvector + GIN replaces SQLite FTS5.
-- Arc 3 will add session_summaries with embeddings.

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,           -- platform-specific message id
  platform        TEXT NOT NULL CHECK (platform IN ('discord', 'irc')),
  channel_name    TEXT NOT NULL,
  author_name     TEXT NOT NULL,
  author_id       TEXT,                       -- discord user id or irc nick
  created_at      TIMESTAMPTZ NOT NULL,
  content         TEXT,
  is_bot          BOOLEAN NOT NULL DEFAULT FALSE,
  reply_to_id     TEXT,                       -- for thread reconstruction
  raw_json        JSONB,                      -- preserved per "raw is immutable" rule
  content_tsv     tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED
);
CREATE INDEX messages_channel_created ON messages(channel_name, created_at);
CREATE INDEX messages_author ON messages(lower(author_name));
CREATE INDEX messages_content_tsv_gin ON messages USING GIN (content_tsv);

CREATE TABLE discord_channels (
  channel_name    TEXT PRIMARY KEY,
  channel_id      TEXT NOT NULL,              -- discord snowflake
  guild_id        TEXT NOT NULL
);

CREATE TABLE sessions (
  id                    BIGSERIAL PRIMARY KEY,
  platform              TEXT NOT NULL,
  channel_name          TEXT NOT NULL,
  started_at            TIMESTAMPTZ NOT NULL,
  ended_at              TIMESTAMPTZ NOT NULL,
  chat_message_count    INTEGER NOT NULL DEFAULT 0,
  participants_json     JSONB
);
CREATE INDEX sessions_channel_started ON sessions(channel_name, started_at);

CREATE TABLE message_labels (
  message_id      TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  session_id      BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,              -- 'chat', 'system', 'bot', 'reaction'
  PRIMARY KEY (message_id, session_id, category)
);
CREATE INDEX message_labels_session_cat ON message_labels(session_id, category);

-- Replicates the FTS5-backed `session_search` virtual table behaviour as a
-- Postgres view over messages + message_labels + sessions. Implementation plan
-- decides materialised-view-with-refresh vs on-the-fly query as a follow-up;
-- the plain view ships first, materialisation comes if measured latency
-- demands it.
CREATE VIEW session_search AS
  SELECT
    s.id AS session_id,
    s.channel_name,
    s.platform,
    s.started_at,
    s.ended_at,
    s.chat_message_count,
    -- aggregated content tsvector for ranking
    (
      SELECT to_tsvector('english',
                         string_agg(coalesce(m.content, ''), ' ' ORDER BY m.created_at))
      FROM messages m
      JOIN message_labels ml ON ml.message_id = m.id
      WHERE ml.session_id = s.id AND ml.category = 'chat'
    ) AS session_tsv
  FROM sessions s;
```

- [ ] **Step 3: Migrate + verify**

Run: `cd apps/qw-oracle && npm run migrate && npm run db:psql -- -c "\dt messages sessions message_labels discord_channels"`
Expected: 4 tables.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/db/migrations/005_layer2_chat.sql
git commit -m "qw-oracle: migration 005 - Layer 2 chat corpus (port from FTS5 to tsvector)"
```

---

## Task 12: Replace `import-discord.mjs` with `import-discord.ts`

**Files:**
- Create: `apps/qw-oracle/scripts/load-chat/import-discord.ts`
- Delete: `apps/qw-oracle/scripts/import-discord.mjs`
- Delete: `apps/qw-oracle/scripts/db.mjs`
- Delete: `apps/qw-oracle/scripts/build-search-index.mjs`

The existing `.mjs` script is throwaway POC code; the spec authorises rewrite. New version writes to Postgres directly.

- [ ] **Step 1: Read the existing script for reference**

Run: `cat apps/qw-oracle/scripts/import-discord.mjs`

Note the source data location (`/home/paradoks/projects/quake/quad/exports/*.json` per the operator) and the per-channel JSON shape.

- [ ] **Step 2: Write `scripts/load-chat/import-discord.ts`**

```ts
// apps/qw-oracle/scripts/load-chat/import-discord.ts
// Imports Discord channel exports into Postgres `messages` + `discord_channels`.
// Idempotent: re-running with same input is a no-op (ON CONFLICT DO NOTHING on
// message id). Bulk-loads in batches of 1000 rows per transaction.
//
// Usage:
//   npm run load-chat:discord -- --dump /path/to/quakeworld.json
//   npm run load-chat:discord -- --dir /home/paradoks/projects/quake/quad/exports

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { db } from '../../shared/db.ts';

interface DiscordExport {
  guild: { id: string };
  channel: { id: string; name: string };
  messages: DiscordMessage[];
}
interface DiscordMessage {
  id: string;
  type: string;
  timestamp: string;
  content: string;
  author: { id: string; name: string; isBot: boolean };
  reference?: { messageId: string };
}

const BATCH = 1000;

async function importFile(path: string): Promise<void> {
  console.log(`[import-discord] reading ${path}`);
  const text = readFileSync(path, 'utf8');
  const data = JSON.parse(text) as DiscordExport;

  const channelName = data.channel.name;
  await db`
    INSERT INTO discord_channels (channel_name, channel_id, guild_id)
    VALUES (${channelName}, ${data.channel.id}, ${data.guild.id})
    ON CONFLICT (channel_name) DO UPDATE SET channel_id = EXCLUDED.channel_id,
                                             guild_id = EXCLUDED.guild_id
  `;

  let inserted = 0;
  for (let i = 0; i < data.messages.length; i += BATCH) {
    const batch = data.messages.slice(i, i + BATCH);
    await db.begin(async (tx) => {
      for (const m of batch) {
        await tx`
          INSERT INTO messages (id, platform, channel_name, author_name, author_id,
                                created_at, content, is_bot, reply_to_id, raw_json)
          VALUES (${m.id}, 'discord', ${channelName}, ${m.author.name}, ${m.author.id},
                  ${m.timestamp}, ${m.content ?? ''}, ${m.author.isBot ?? false},
                  ${m.reference?.messageId ?? null}, ${JSON.stringify(m)}::jsonb)
          ON CONFLICT (id) DO NOTHING
        `;
        inserted++;
      }
    });
    console.log(`[import-discord] ${path}: ${inserted}/${data.messages.length}`);
  }
}

async function importDir(dir: string): Promise<void> {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'backfill-progress.json')
    .map((f) => resolve(dir, f));
  for (const f of files) await importFile(f);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dumpIdx = args.indexOf('--dump');
  const dirIdx = args.indexOf('--dir');
  if (dumpIdx >= 0) {
    await importFile(args[dumpIdx + 1]);
  } else if (dirIdx >= 0) {
    await importDir(args[dirIdx + 1]);
  } else {
    console.error('usage: import-discord --dump <file.json> | --dir <dir>');
    process.exit(1);
  }
  await db.end();
}

if (import.meta.main) {
  await main();
}
```

- [ ] **Step 3: Run the importer for the helpdesk channel as smoke test**

Run: `cd apps/qw-oracle && npm run load-chat:discord -- --dump /home/paradoks/projects/quake/quad/exports/helpdesk.json`
Expected: completes without error; row count matches existing helpdesk POC count.

- [ ] **Step 4: Run full import for all Discord channels**

Run: `cd apps/qw-oracle && npm run load-chat:discord -- --dir /home/paradoks/projects/quake/quad/exports`
Expected: ~717K Discord messages imported across the configured channels.

- [ ] **Step 5: Delete the .mjs originals**

Run: `cd apps/qw-oracle && rm scripts/import-discord.mjs scripts/db.mjs scripts/build-search-index.mjs`

- [ ] **Step 6: Verify counts**

Run: `cd apps/qw-oracle && npm run db:psql -- -c "SELECT platform, COUNT(*) FROM messages GROUP BY platform"`
Expected: discord ~717K, irc 0 (until next task).

- [ ] **Step 7: Commit**

```bash
git add apps/qw-oracle/scripts/load-chat/ apps/qw-oracle/scripts
git commit -m "qw-oracle: replace import-discord.mjs with TypeScript Postgres importer"
```

---

## Task 13: Replace `import-irc.mjs` with `import-irc.ts`

**Files:**
- Create: `apps/qw-oracle/scripts/load-chat/import-irc.ts`
- Delete: `apps/qw-oracle/scripts/import-irc.mjs`

mIRC log parsing is non-trivial (encoding quirks, multiline events). Take the existing parser as reference. Output rows with `platform = 'irc'`.

- [ ] **Step 1: Read existing IRC parser**

Run: `cat apps/qw-oracle/scripts/import-irc.mjs`

- [ ] **Step 2: Port to TypeScript writing to Postgres**

```ts
// apps/qw-oracle/scripts/load-chat/import-irc.ts
// Port of import-irc.mjs to TypeScript + postgres-js.
// IRC messages get synthetic ids: `irc:${channel}:${created_at}:${author}` to
// preserve idempotency (ON CONFLICT id DO NOTHING). raw_json stores original
// log line for re-parsing if needed.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from '../../shared/db.ts';

// (Engineer copies parsing logic from import-irc.mjs verbatim, adjusting the
// row shape to match the Postgres `messages` table. Encoding caveat from the
// memory note `project_qw_oracle_irc_encoding_gap.md` — re-import with correct
// codepage if reviewing pre-2016 non-English content. v1 ships with whatever
// the existing .mjs script produced.)
```

- [ ] **Step 3: Run on one IRC channel as smoke test**

Run: `cd apps/qw-oracle && npm run load-chat:irc -- --file /path/to/ezQuake.log`
Expected: rows added to `messages` with `platform = 'irc'`.

- [ ] **Step 4: Optionally run full IRC import — operator's call given the spec defers IRC enrichment to Arc 3**

If running: `npm run load-chat:irc -- --dir /home/paradoks/projects/quake/quad/exports/`
If skipping: leave IRC imports for a future operator-initiated run.

- [ ] **Step 5: Delete the .mjs original**

Run: `cd apps/qw-oracle && rm scripts/import-irc.mjs`

- [ ] **Step 6: Commit**

```bash
git add apps/qw-oracle/scripts/load-chat/import-irc.ts apps/qw-oracle/scripts
git commit -m "qw-oracle: replace import-irc.mjs with TypeScript Postgres importer"
```

---

## Task 14: Sessions + message_labels recompute

The current `qw.db` has a sessions/message_labels build pipeline that derives sessions from messages by gap-in-time + reply tree. v1 reproduces the same derivation but writes to Postgres.

**Files:**
- Create: `apps/qw-oracle/scripts/load-chat/build-sessions.ts`

- [ ] **Step 1: Read existing session-building logic**

Run: `grep -rln 'sessions\|message_labels' apps/qw-oracle/scripts/*.mjs`

- [ ] **Step 2: Port the derivation to TypeScript writing Postgres**

```ts
// apps/qw-oracle/scripts/load-chat/build-sessions.ts
// Recomputes sessions and message_labels from messages.
// Idempotent: TRUNCATE sessions + message_labels then rebuild.

import { db } from '../../shared/db.ts';

const SESSION_GAP_MINUTES = 30;   // existing convention; adjust if scripts/*.mjs uses a different gap

async function rebuild(): Promise<void> {
  await db`TRUNCATE sessions RESTART IDENTITY CASCADE`;
  // (Engineer ports the gap-segmentation logic. Output: one INSERT into sessions
  //  per session boundary, then one INSERT into message_labels per message
  //  classifying it as 'chat' / 'system' / 'bot' / 'reaction'.)
}

if (import.meta.main) {
  await rebuild();
  await db.end();
}
```

- [ ] **Step 3: Run, verify session count**

Run: `cd apps/qw-oracle && tsx scripts/load-chat/build-sessions.ts && npm run db:psql -- -c "SELECT COUNT(*) FROM sessions"`
Expected: tens of thousands of sessions (matches POC numbers).

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/scripts/load-chat/build-sessions.ts
git commit -m "qw-oracle: add build-sessions.ts (sessions + message_labels recompute)"
```

---

# Phase 4 — Layer 3 + bidirectional graph

## Task 15: Migration `006_layer3_concepts.sql`

**Files:**
- Create: `apps/qw-oracle/db/migrations/006_layer3_concepts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- apps/qw-oracle/db/migrations/006_layer3_concepts.sql
-- Layer 3: concept notes + chunked embeddings + bidirectional graph + redirect targets.

CREATE TABLE concepts (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL,
  body         TEXT NOT NULL,
  shape        TEXT,
  frontmatter  JSONB NOT NULL,
  body_sha256  TEXT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE concept_chunks (
  id                BIGSERIAL PRIMARY KEY,
  concept_slug      TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  chunk_index       INTEGER NOT NULL,
  text              TEXT NOT NULL,
  text_sha256       TEXT NOT NULL,
  embedding         vector(1024),
  embedding_stale   BOOLEAN NOT NULL DEFAULT FALSE,
  tsv               tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  UNIQUE (concept_slug, chunk_index)
);
CREATE INDEX concept_chunks_embedding_hnsw ON concept_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX concept_chunks_tsv_gin ON concept_chunks USING GIN (tsv);

CREATE TABLE concept_entities (
  concept_slug         TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  entity_canonical_id  TEXT NOT NULL,        -- not FK because L1 may lag L3
  weight               INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (concept_slug, entity_canonical_id)
);
CREATE INDEX concept_entities_entity ON concept_entities(entity_canonical_id);

CREATE TABLE concept_concepts (
  source_slug TEXT NOT NULL REFERENCES concepts(slug) ON DELETE CASCADE,
  target_slug TEXT NOT NULL,                  -- not FK; allow forward references during authoring
  PRIMARY KEY (source_slug, target_slug)
);

CREATE TABLE redirect_targets (
  topic        TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  url          TEXT NOT NULL,
  description  TEXT
);
```

- [ ] **Step 2: Migrate + verify**

Run: `cd apps/qw-oracle && npm run migrate && npm run db:psql -- -c "\dt concept* redirect_targets"`
Expected: 5 tables.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/db/migrations/006_layer3_concepts.sql
git commit -m "qw-oracle: migration 006 - concepts + chunks + graph + redirect targets"
```

---

## Task 16: Markdown chunker

**Files:**
- Create: `apps/qw-oracle/shared/chunking.ts`
- Test: `apps/qw-oracle/shared/chunking.test.ts`

Default chunking strategy per spec open-question: split on `##` headings, max 500 tokens per chunk, split further if a section exceeds the cap.

- [ ] **Step 1: Write failing test**

```ts
// apps/qw-oracle/shared/chunking.test.ts
import { describe, expect, test } from 'bun:test';
import { chunkMarkdown } from './chunking.ts';

describe('chunkMarkdown', () => {
  test('splits a multi-section note into one chunk per ## heading', () => {
    const md = `# Top\nintro\n\n## A\nbody A\n\n## B\nbody B`;
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBe(3);  // top intro + A + B
    expect(chunks[1].text).toContain('## A');
    expect(chunks[1].text).toContain('body A');
  });

  test('further splits a section that exceeds the 500-token cap', () => {
    const longBody = 'word '.repeat(800);   // ~800 tokens
    const md = `# Top\n\n## Big\n${longBody}`;
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBeGreaterThanOrEqual(3);  // top + at least 2 sub-chunks of "Big"
  });

  test('chunks are stable under no-op re-chunking', () => {
    const md = `# T\n\n## A\nfoo\n\n## B\nbar`;
    const a = chunkMarkdown(md);
    const b = chunkMarkdown(md);
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Implement `shared/chunking.ts`**

```ts
// apps/qw-oracle/shared/chunking.ts
// Markdown-aware chunker. Splits primarily on `##` headings; secondary split
// on sentence boundaries when a section exceeds MAX_TOKENS.
//
// Token estimate is the cheap "1 token ~= 4 chars" heuristic, fine for
// chunk-budgeting at this granularity. Real Voyage tokens are computed by the
// embedding API; we just keep chunks roughly within budget.

const MAX_TOKENS = 500;
const APPROX_CHARS_PER_TOKEN = 4;

export interface Chunk {
  index: number;
  text: string;
}

export function chunkMarkdown(md: string): Chunk[] {
  const sections: string[] = [];
  let current = '';
  for (const line of md.split('\n')) {
    if (/^##\s/.test(line) && current.trim().length > 0) {
      sections.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current.trim().length > 0) sections.push(current);

  const chunks: Chunk[] = [];
  let idx = 0;
  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length === 0) continue;
    const estTokens = Math.ceil(trimmed.length / APPROX_CHARS_PER_TOKEN);
    if (estTokens <= MAX_TOKENS) {
      chunks.push({ index: idx++, text: trimmed });
    } else {
      for (const sub of splitBySentence(trimmed, MAX_TOKENS)) {
        chunks.push({ index: idx++, text: sub });
      }
    }
  }
  return chunks;
}

function splitBySentence(text: string, maxTokens: number): string[] {
  const out: string[] = [];
  const max = maxTokens * APPROX_CHARS_PER_TOKEN;
  let buf = '';
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (buf.length + sentence.length > max && buf.length > 0) {
      out.push(buf.trim());
      buf = '';
    }
    buf += sentence + ' ';
  }
  if (buf.trim().length > 0) out.push(buf.trim());
  return out;
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 3: Run test**

Run: `cd apps/qw-oracle && bun test shared/chunking.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/shared/chunking.ts apps/qw-oracle/shared/chunking.test.ts
git commit -m "qw-oracle: add markdown-heading chunker (max 500 tokens per chunk)"
```

---

## Task 17: `load-concepts` loader (no embeddings yet)

**Files:**
- Create: `apps/qw-oracle/scripts/load-concepts/index.ts`
- Create: `apps/qw-oracle/scripts/load-concepts/parse.ts`
- Create: `apps/qw-oracle/scripts/load-concepts/upsert.ts`
- Test: `apps/qw-oracle/scripts/load-concepts/upsert.test.ts`

This task lands the concept loader without embedding integration. Embedding gets bolted on in Phase 5; the loader needs to work end-to-end first so we can verify graph derivation.

- [ ] **Step 1: Write parse helper**

```ts
// apps/qw-oracle/scripts/load-concepts/parse.ts
import matter from 'gray-matter';
import { chunkMarkdown, sha256, Chunk } from '../../shared/chunking.ts';

export interface ParsedConcept {
  slug: string;
  title: string;
  summary: string;
  body: string;
  bodySha256: string;
  shape: string | null;
  frontmatter: Record<string, unknown>;
  relatedEntities: string[];
  relatedConcepts: string[];
  chunks: Array<Chunk & { sha256: string }>;
}

export async function parseConceptFile(text: string, filename: string): Promise<ParsedConcept | null> {
  const parsed = matter(text);
  const fm = parsed.data as Record<string, unknown>;
  const slug = fm.slug;
  if (typeof slug !== 'string' || slug.length === 0) return null;

  const body = parsed.content.trim();
  const bodySha = await sha256(body);
  const rawChunks = chunkMarkdown(body);
  const chunks = await Promise.all(
    rawChunks.map(async (c) => ({ ...c, sha256: await sha256(c.text) })),
  );

  const relatedEntities = Array.isArray(fm.related_entities)
    ? (fm.related_entities as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  const relatedConcepts = Array.isArray(fm.related_concepts)
    ? (fm.related_concepts as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  return {
    slug,
    title: typeof fm.title === 'string' ? fm.title : slug,
    summary: typeof fm.summary === 'string' ? fm.summary : '',
    body,
    bodySha256: bodySha,
    shape: typeof fm.shape === 'string' ? fm.shape : null,
    frontmatter: fm,
    relatedEntities,
    relatedConcepts,
    chunks,
  };
}
```

- [ ] **Step 2: Write failing test for `upsert`**

```ts
// apps/qw-oracle/scripts/load-concepts/upsert.test.ts
import { describe, expect, test, beforeEach } from 'bun:test';
import { db } from '../../shared/db.ts';
import { upsertConcept } from './upsert.ts';
import type { ParsedConcept } from './parse.ts';

const sample: ParsedConcept = {
  slug: 'test-note',
  title: 'Test',
  summary: 'A test note.',
  body: '## A\nbody',
  bodySha256: 'abc',
  shape: 'r7-best-practice',
  frontmatter: { slug: 'test-note', summary: 'A test note.', title: 'Test', shape: 'r7-best-practice' },
  relatedEntities: ['ezquake:cvar:cl_bob'],
  relatedConcepts: ['weapon-scripts'],
  chunks: [{ index: 0, text: '## A\nbody', sha256: 'def' }],
};

describe('upsertConcept', () => {
  beforeEach(async () => {
    await db`DELETE FROM concepts WHERE slug = 'test-note'`;
  });

  test('inserts a new concept with chunks and graph rows', async () => {
    await upsertConcept(sample);
    const c = await db`SELECT * FROM concepts WHERE slug = 'test-note'`;
    expect(c.length).toBe(1);
    const ch = await db`SELECT * FROM concept_chunks WHERE concept_slug = 'test-note'`;
    expect(ch.length).toBe(1);
    const e = await db`SELECT * FROM concept_entities WHERE concept_slug = 'test-note'`;
    expect(e.length).toBe(1);
    expect(e[0].entity_canonical_id).toBe('ezquake:cvar:cl_bob');
    const cc = await db`SELECT * FROM concept_concepts WHERE source_slug = 'test-note'`;
    expect(cc.length).toBe(1);
    expect(cc[0].target_slug).toBe('weapon-scripts');
  });

  test('skips chunk re-write when body sha unchanged', async () => {
    await upsertConcept(sample);
    await upsertConcept(sample);
    const ch = await db`SELECT * FROM concept_chunks WHERE concept_slug = 'test-note'`;
    expect(ch.length).toBe(1);     // still one chunk, no duplicates
  });
});
```

- [ ] **Step 3: Run test, verify FAIL**

Run: `cd apps/qw-oracle && bun test scripts/load-concepts/upsert.test.ts`

- [ ] **Step 4: Implement `upsert.ts`**

```ts
// apps/qw-oracle/scripts/load-concepts/upsert.ts
import { db } from '../../shared/db.ts';
import type { ParsedConcept } from './parse.ts';

export async function upsertConcept(c: ParsedConcept): Promise<void> {
  await db.begin(async (tx) => {
    // Concept row
    const existing = await tx<{ body_sha256: string }[]>`
      SELECT body_sha256 FROM concepts WHERE slug = ${c.slug}
    `;
    const skipChunks = existing.length > 0 && existing[0].body_sha256 === c.bodySha256;

    await tx`
      INSERT INTO concepts (slug, title, summary, body, shape, frontmatter, body_sha256, updated_at)
      VALUES (${c.slug}, ${c.title}, ${c.summary}, ${c.body}, ${c.shape},
              ${JSON.stringify(c.frontmatter)}::jsonb, ${c.bodySha256}, now())
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        body = EXCLUDED.body,
        shape = EXCLUDED.shape,
        frontmatter = EXCLUDED.frontmatter,
        body_sha256 = EXCLUDED.body_sha256,
        updated_at = now()
    `;

    // Graph rows always rebuilt (cheap, makes drift impossible)
    await tx`DELETE FROM concept_entities WHERE concept_slug = ${c.slug}`;
    for (const eid of c.relatedEntities) {
      await tx`
        INSERT INTO concept_entities (concept_slug, entity_canonical_id)
        VALUES (${c.slug}, ${eid})
      `;
    }
    await tx`DELETE FROM concept_concepts WHERE source_slug = ${c.slug}`;
    for (const target of c.relatedConcepts) {
      await tx`
        INSERT INTO concept_concepts (source_slug, target_slug)
        VALUES (${c.slug}, ${target})
      `;
    }

    if (!skipChunks) {
      await tx`DELETE FROM concept_chunks WHERE concept_slug = ${c.slug}`;
      for (const ch of c.chunks) {
        await tx`
          INSERT INTO concept_chunks (concept_slug, chunk_index, text, text_sha256)
          VALUES (${c.slug}, ${ch.index}, ${ch.text}, ${ch.sha256})
        `;
      }
    }
  });
}
```

- [ ] **Step 5: Run test, verify PASS**

Run: `cd apps/qw-oracle && bun test scripts/load-concepts/upsert.test.ts`
Expected: both tests PASS.

- [ ] **Step 6: Implement CLI dispatcher**

```ts
// apps/qw-oracle/scripts/load-concepts/index.ts
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../../shared/db.ts';
import { parseConceptFile } from './parse.ts';
import { upsertConcept } from './upsert.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCEPTS_DIR = resolve(__dirname, '..', '..', 'concept-notes');

async function main(): Promise<void> {
  const files = readdirSync(CONCEPTS_DIR).filter((f) => f.endsWith('.md'));
  let loaded = 0, skipped = 0;
  for (const f of files) {
    const text = readFileSync(resolve(CONCEPTS_DIR, f), 'utf8');
    const parsed = await parseConceptFile(text, f);
    if (!parsed) {
      skipped++;
      continue;
    }
    await upsertConcept(parsed);
    loaded++;
  }
  console.log(`[load-concepts] loaded ${loaded}, skipped ${skipped}`);
  await db.end();
}

if (import.meta.main) await main();
```

- [ ] **Step 7: Run, verify graph rows**

Run: `cd apps/qw-oracle && npm run load-concepts && npm run db:psql -- -c "SELECT COUNT(*) FROM concept_entities"`
Expected: nonzero count (sum of all `related_entities` lists across notes).

- [ ] **Step 8: Commit**

```bash
git add apps/qw-oracle/scripts/load-concepts/
git commit -m "qw-oracle: add load-concepts loader (parse + upsert; embeddings come next phase)"
```

---

## Task 18: Body-link drift check (pre-flight warning)

**Files:**
- Modify: `apps/qw-oracle/scripts/load-concepts/parse.ts` (add helper)
- Modify: `apps/qw-oracle/scripts/load-concepts/index.ts` (call helper, warn)

The spec specifies that body links to other concept slugs must be reflected in `related_concepts:` frontmatter. Loader pre-flight warns on drift.

- [ ] **Step 1: Add helper `extractBodyConceptLinks(body: string): string[]` to `parse.ts`**

```ts
// Append to parse.ts
const CONCEPT_LINK_RE = /\(concept-notes\/([a-z0-9-]+)\.md\)/g;

export function extractBodyConceptLinks(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(CONCEPT_LINK_RE)) {
    out.add(m[1]);
  }
  return [...out];
}
```

- [ ] **Step 2: Call helper from `index.ts`, warn on drift**

```ts
// in main() in index.ts, after parseConceptFile:
const bodyLinks = extractBodyConceptLinks(parsed.body);
const declared = new Set(parsed.relatedConcepts);
for (const link of bodyLinks) {
  if (!declared.has(link)) {
    console.warn(`[load-concepts] WARN ${parsed.slug} body links concept "${link}" but does not declare it in related_concepts:`);
  }
}
```

- [ ] **Step 3: Run, observe warnings (if any)**

Run: `cd apps/qw-oracle && npm run load-concepts`
Expected: completes; any drift between body links and frontmatter prints a WARN.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/scripts/load-concepts/
git commit -m "qw-oracle: warn on concept body-link / related_concepts drift"
```

---

# Phase 5 — Embedding pipeline

## Task 19: Voyage API client wrapper

**Files:**
- Create: `apps/qw-oracle/shared/embedding.ts`
- Test: `apps/qw-oracle/shared/embedding.test.ts`

- [ ] **Step 1: Write failing test (uses real API; gated by env var)**

```ts
// apps/qw-oracle/shared/embedding.test.ts
import { describe, expect, test } from 'bun:test';
import { embedTexts } from './embedding.ts';

const HAS_KEY = !!process.env.VOYAGE_API_KEY;

describe.skipIf(!HAS_KEY)('voyage embedding client', () => {
  test('embeds a batch and returns vectors of the right shape', async () => {
    const out = await embedTexts(['hello world', 'second sentence'], 'voyage-4-large');
    expect(out.vectors.length).toBe(2);
    expect(out.vectors[0].length).toBe(1024);
    expect(out.tokensInput).toBeGreaterThan(0);
  });

  test('gracefully fails on bad API key', async () => {
    const oldKey = process.env.VOYAGE_API_KEY;
    process.env.VOYAGE_API_KEY = 'sk-bogus';
    try {
      await expect(embedTexts(['test'], 'voyage-4-large')).rejects.toThrow();
    } finally {
      process.env.VOYAGE_API_KEY = oldKey;
    }
  });
});
```

- [ ] **Step 2: Implement client**

```ts
// apps/qw-oracle/shared/embedding.ts
// Voyage AI embedding client. Single function, no fancy retry logic.
// Caller is responsible for batching and for logging into embedding_api_log.

export interface EmbedResult {
  vectors: number[][];
  tokensInput: number;
  model: string;
  latencyMs: number;
}

export async function embedTexts(
  texts: string[],
  model: string,
  inputType: 'document' | 'query' = 'document',
): Promise<EmbedResult> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('VOYAGE_API_KEY is not set');

  const start = Date.now();
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model,
      input_type: inputType,
    }),
  });
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage API ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    data: { embedding: number[]; index: number }[];
    usage: { total_tokens: number };
    model: string;
  };
  const sorted = data.data.slice().sort((a, b) => a.index - b.index);
  return {
    vectors: sorted.map((d) => d.embedding),
    tokensInput: data.usage.total_tokens,
    model: data.model,
    latencyMs,
  };
}
```

- [ ] **Step 3: Run test (with API key)**

Run: `cd apps/qw-oracle && VOYAGE_API_KEY=$(cat .env | grep VOYAGE_API_KEY | cut -d= -f2) bun test shared/embedding.test.ts`
Expected: PASS (if no key, tests skip).

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/shared/embedding.ts apps/qw-oracle/shared/embedding.test.ts
git commit -m "qw-oracle: add Voyage embedding API client"
```

---

## Task 20: Migration `007_observability.sql`

**Files:**
- Create: `apps/qw-oracle/db/migrations/007_observability.sql`

- [ ] **Step 1: Write migration**

```sql
-- apps/qw-oracle/db/migrations/007_observability.sql
-- Observability tables. Loader + MCP server log into these on every API call /
-- tool call. Operator queries them via psql or simple SQL probes.

CREATE TABLE query_log (
  id              BIGSERIAL PRIMARY KEY,
  queried_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  tool            TEXT NOT NULL,
  query_text      TEXT,
  result_count    INTEGER,
  top_score       REAL,
  match_quality   TEXT,
  latency_ms      INTEGER,
  error           TEXT,
  consumer_hint   TEXT
);
CREATE INDEX query_log_queried_at ON query_log(queried_at);
CREATE INDEX query_log_match_quality ON query_log(match_quality)
  WHERE match_quality IN ('weak', 'none');

CREATE TABLE embedding_api_log (
  id            BIGSERIAL PRIMARY KEY,
  called_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  source        TEXT NOT NULL CHECK (source IN ('loader', 'mcp-query')),
  model         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL,
  latency_ms    INTEGER,
  error         TEXT
);
CREATE INDEX embedding_api_log_called_at ON embedding_api_log(called_at);
CREATE INDEX embedding_api_log_source ON embedding_api_log(source);
```

- [ ] **Step 2: Migrate**

Run: `cd apps/qw-oracle && npm run migrate`

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/db/migrations/007_observability.sql
git commit -m "qw-oracle: migration 007 - observability (query_log, embedding_api_log)"
```

---

## Task 21: `embed-entities` script (Layer 1 entity descriptions)

**Files:**
- Create: `apps/qw-oracle/scripts/embed/embed-entities.ts`

- [ ] **Step 1: Implement**

```ts
// apps/qw-oracle/scripts/embed/embed-entities.ts
// Batch-embed Layer 1 entity descriptions. Hash-based incremental: skip rows
// whose description sha256 matches description_embedding_sha256.
//
// Logs to embedding_api_log on every Voyage call.

import { db } from '../../shared/db.ts';
import { embedTexts } from '../../shared/embedding.ts';
import { sha256 } from '../../shared/chunking.ts';

const BUILD_MODEL = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';
const BATCH = 64;

async function main(): Promise<void> {
  const startAt = Date.now();
  const candidates = await db<{ canonical_id: string; description: string | null; current_sha: string | null; existing_sha: string | null }[]>`
    SELECT canonical_id, description, description_embedding_sha256 AS existing_sha,
           encode(digest(coalesce(description, ''), 'sha256'), 'hex') AS current_sha
    FROM entities
    WHERE description IS NOT NULL AND length(description) > 0
  `;
  // Postgres pgcrypto for digest -- ensure CREATE EXTENSION pgcrypto in 001_init.sql.
  // (If pgcrypto not present, hash in JS instead. Defaulting to JS for portability:)

  const stale: { canonical_id: string; description: string; sha: string }[] = [];
  for (const row of candidates) {
    const desc = row.description ?? '';
    const sha = await sha256(desc);
    if (sha !== row.existing_sha) stale.push({ canonical_id: row.canonical_id, description: desc, sha });
  }

  console.log(`[embed-entities] ${stale.length} stale rows out of ${candidates.length}`);

  for (let i = 0; i < stale.length; i += BATCH) {
    const batch = stale.slice(i, i + BATCH);
    const texts = batch.map((r) => r.description);
    let result;
    try {
      result = await embedTexts(texts, BUILD_MODEL, 'document');
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error(`[embed-entities] batch ${i} failed: ${errMsg}`);
      await db`
        INSERT INTO embedding_api_log (source, model, input_tokens, error)
        VALUES ('loader', ${BUILD_MODEL}, 0, ${errMsg})
      `;
      // Mark stale, don't write vector
      for (const r of batch) {
        await db`UPDATE entities SET description_embedding_stale = TRUE WHERE canonical_id = ${r.canonical_id}`;
      }
      continue;
    }
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('loader', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
    await db.begin(async (tx) => {
      for (let j = 0; j < batch.length; j++) {
        const r = batch[j];
        const v = result.vectors[j];
        await tx`
          UPDATE entities
          SET description_embedding = ${`[${v.join(',')}]`}::vector,
              description_embedding_sha256 = ${r.sha},
              description_embedding_stale = FALSE
          WHERE canonical_id = ${r.canonical_id}
        `;
      }
    });
    console.log(`[embed-entities] ${Math.min(i + BATCH, stale.length)}/${stale.length} embedded`);
  }

  // Update embedding_metadata
  const totalEmbedded = (await db<{ c: number }[]>`SELECT count(*)::int as c FROM entities WHERE description_embedding IS NOT NULL`)[0].c;
  await db`
    INSERT INTO embedding_metadata (id, model_name, model_version, dimension, embedded_at, rows_embedded)
    VALUES (1, ${BUILD_MODEL}, ${result?.model ?? BUILD_MODEL}, 1024, now(), ${totalEmbedded})
    ON CONFLICT (id) DO UPDATE SET
      model_name = EXCLUDED.model_name,
      model_version = EXCLUDED.model_version,
      dimension = EXCLUDED.dimension,
      embedded_at = now(),
      rows_embedded = EXCLUDED.rows_embedded
  `;

  console.log(`[embed-entities] done in ${Date.now() - startAt}ms; ${totalEmbedded} entities have embeddings`);
  await db.end();
}

if (import.meta.main) await main();
```

- [ ] **Step 2: Run**

Run: `cd apps/qw-oracle && npm run embed:entities`
Expected: ~9000 entity descriptions embedded; ~150 batches; total tokens ~500K (well within free tier).

- [ ] **Step 3: Verify embedding_metadata + sample query**

Run: `cd apps/qw-oracle && npm run db:psql -- -c "SELECT * FROM embedding_metadata; SELECT canonical_id FROM entities WHERE description_embedding IS NOT NULL LIMIT 5"`
Expected: metadata row populated; sample canonical_ids printed.

- [ ] **Step 4: Re-run, verify hash-skip**

Run: `cd apps/qw-oracle && npm run embed:entities`
Expected: `0 stale rows out of N` — second run is a no-op (proves hash-skip works).

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/scripts/embed/embed-entities.ts
git commit -m "qw-oracle: add embed-entities script (hash-based incremental, logs to api log)"
```

---

## Task 22: `embed-chunks` script + integration into `load-concepts`

**Files:**
- Create: `apps/qw-oracle/scripts/embed/embed-chunks.ts`
- Modify: `apps/qw-oracle/scripts/load-concepts/index.ts` (call embed-chunks after upsert)

- [ ] **Step 1: Implement standalone embed-chunks**

```ts
// apps/qw-oracle/scripts/embed/embed-chunks.ts
// Embed concept_chunks rows whose embedding is NULL or stale.

import { db } from '../../shared/db.ts';
import { embedTexts } from '../../shared/embedding.ts';

const BUILD_MODEL = process.env.EMBEDDING_MODEL_BUILD ?? 'voyage-4-large';
const BATCH = 64;

export async function embedPendingChunks(): Promise<void> {
  const stale = await db<{ id: number; text: string }[]>`
    SELECT id, text FROM concept_chunks
    WHERE embedding IS NULL OR embedding_stale = TRUE
    ORDER BY id
  `;
  console.log(`[embed-chunks] ${stale.length} stale chunks`);

  for (let i = 0; i < stale.length; i += BATCH) {
    const batch = stale.slice(i, i + BATCH);
    let result;
    try {
      result = await embedTexts(batch.map((r) => r.text), BUILD_MODEL, 'document');
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error(`[embed-chunks] batch ${i} failed: ${errMsg}`);
      await db`
        INSERT INTO embedding_api_log (source, model, input_tokens, error)
        VALUES ('loader', ${BUILD_MODEL}, 0, ${errMsg})
      `;
      for (const r of batch) {
        await db`UPDATE concept_chunks SET embedding_stale = TRUE WHERE id = ${r.id}`;
      }
      continue;
    }
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('loader', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
    await db.begin(async (tx) => {
      for (let j = 0; j < batch.length; j++) {
        const r = batch[j];
        const v = result.vectors[j];
        await tx`
          UPDATE concept_chunks
          SET embedding = ${`[${v.join(',')}]`}::vector,
              embedding_stale = FALSE
          WHERE id = ${r.id}
        `;
      }
    });
  }
  console.log(`[embed-chunks] done`);
}

if (import.meta.main) {
  await embedPendingChunks();
  await db.end();
}
```

- [ ] **Step 2: Hook into `load-concepts` so authoring-loop is one command**

In `scripts/load-concepts/index.ts`, after the upsert loop:

```ts
import { embedPendingChunks } from '../embed/embed-chunks.ts';
// at end of main(), before db.end():
await embedPendingChunks();
```

- [ ] **Step 3: Run, verify chunks have embeddings**

Run: `cd apps/qw-oracle && npm run load-concepts`
Expected: all chunks embedded.

Run: `cd apps/qw-oracle && npm run db:psql -- -c "SELECT count(*) FROM concept_chunks WHERE embedding IS NULL"`
Expected: 0.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/scripts/embed/ apps/qw-oracle/scripts/load-concepts/
git commit -m "qw-oracle: add embed-chunks; hook into load-concepts authoring loop"
```

---

# Phase 6 — MCP server rewrite

## Task 23: Port `serve/mcp/src/db.ts` to postgres-js

**Files:**
- Modify: `apps/qw-oracle/serve/mcp/src/db.ts`
- Delete: `apps/qw-oracle/serve/mcp/src/concept-loader.ts` (responsibility moves to DB)

- [ ] **Step 1: Replace `db.ts`**

```ts
// apps/qw-oracle/serve/mcp/src/db.ts
// Single Postgres client used by all MCP tools.
export { db, closeDb } from '../../../shared/db.ts';

// Backwards-compat aliases — many tools import knowledgeDb / corpusDb today.
// Both now resolve to the same Postgres handle.
export { db as knowledgeDb, db as corpusDb } from '../../../shared/db.ts';
```

- [ ] **Step 2: Delete the in-memory concept loader**

Run: `rm apps/qw-oracle/serve/mcp/src/concept-loader.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/serve/mcp/src/db.ts apps/qw-oracle/serve/mcp/src/concept-loader.ts
git commit -m "qw-oracle/mcp: port db.ts to postgres-js; concepts now live in DB"
```

---

## Task 24: Port existing MCP tools (`lookup-*`, `search-*`)

**Files:**
- Modify: `apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-entities.ts` (will be upgraded to hybrid in Task 26; this task does the postgres-js port only)
- Modify: `apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-maps.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-mechanics.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.ts`

This is mechanical: every `db.prepare(...)` becomes a tagged-template-literal `await db<T[]>\`...\``. The response shapes stay identical so consumers don't notice. Existing tests (`maps.test.ts`) continue to pass once they're updated to set up Postgres state instead of bun:sqlite.

- [ ] **Step 1: Port `search-solved-issues.ts` (the FTS5 → tsvector switch)**

This one has the most semantic change. Replace the FTS5 MATCH query with tsvector:

```ts
// New SQL inside searchSolvedIssues:
const ftsRows = await db<FtsHitRow[]>`
  SELECT s.id AS session_id,
         ts_rank(ss.session_tsv, websearch_to_tsquery('english', ${args.query})) AS rank
  FROM session_search ss
  JOIN sessions s ON s.id = ss.session_id
  WHERE ss.session_tsv @@ websearch_to_tsquery('english', ${args.query})
    AND s.chat_message_count >= 5
  ORDER BY rank DESC
  LIMIT ${limit}
`;
```

`ts_rank` is positive (higher = more relevant), so the sort flips from ascending (FTS5 negative bm25) to descending. Fix the rank polarity in the response shape if existing consumers depend on it.

- [ ] **Step 2: Port `get-concept-note.ts` to read from `concepts` table**

```ts
// apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts
import { db } from '../db.ts';
import type { ConceptNote, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface GetConceptNoteArgs {
  id: string;
}

export async function getConceptNote(args: GetConceptNoteArgs): Promise<ToolResponse<ConceptNote>> {
  const slug = args.id.startsWith('concept:') ? args.id.slice('concept:'.length) : args.id;
  const rows = await db<{ slug: string; title: string; summary: string; body: string; frontmatter: Record<string, unknown> }[]>`
    SELECT slug, title, summary, body, frontmatter FROM concepts WHERE slug = ${slug}
  `;
  const now = new Date().toISOString();
  if (rows.length === 0) {
    const all = (await db<{ slug: string }[]>`SELECT slug FROM concepts`).map((r) => `concept:${r.slug}`);
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No concept note with id "${args.id}". Available ids: ${all.join(', ')}`,
      meta: { tool: 'get_concept_note', server_version: SERVER_VERSION, queried_at: now },
    };
  }
  const r = rows[0];
  const relatedEntities = await db<{ entity_canonical_id: string }[]>`
    SELECT entity_canonical_id FROM concept_entities WHERE concept_slug = ${r.slug}
  `;
  const relatedConcepts = await db<{ target_slug: string }[]>`
    SELECT target_slug FROM concept_concepts WHERE source_slug = ${r.slug}
  `;
  return {
    results: [{
      id: `concept:${r.slug}`,
      title: r.title,
      body: r.body,
      related_entities: relatedEntities.map((e) => e.entity_canonical_id),
      external_refs: [],   // legacy field; kept for response-shape compat
      frontmatter: r.frontmatter,
    }],
    match_quality: 'strong',
    suggested_fallback: null,
    meta: { tool: 'get_concept_note', server_version: SERVER_VERSION, queried_at: now },
  };
}
```

- [ ] **Step 3: Port `lookup-entity.ts` and add `related_concepts` to response**

```ts
// excerpt — engineer keeps the existing tool's response envelope and just
// switches the SQL to postgres-js. After fetching the entity, fetch the
// reverse graph:

const linkedConcepts = await db<{ concept_slug: string }[]>`
  SELECT concept_slug FROM concept_entities WHERE entity_canonical_id = ${canonicalId}
`;
// Add `linked_concepts: linkedConcepts.map(c => c.concept_slug)` to response.
```

- [ ] **Step 4: Port the remaining tools mechanically**

For each of `lookup-map.ts`, `search-maps.ts`, `lookup-mechanic.ts`, `search-mechanics.ts`, `lookup-gameplay-entity.ts`, `search-gameplay-entities.ts`, `search-entities.ts`: convert `db.prepare(...)` calls to template literals. Response shape unchanged.

- [ ] **Step 5: Update `serve/mcp/src/tools/maps.test.ts` to use Postgres**

The test currently sets up an in-memory bun:sqlite DB and inlines `MAPS_TABLE_SQL`. Update it to:
- Connect to a TEST database URL (e.g. `qw_oracle_test`).
- Run migrations 001-007 against it.
- Insert sample rows.
- Tear down with TRUNCATE.

This is involved. Engineer either ports the existing test or replaces it with a simpler integration test that asserts the tool returns expected hits given seeded data.

- [ ] **Step 6: Run typecheck + all tool tests**

Run: `cd apps/qw-oracle && npm run typecheck && bun test serve/mcp/src/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/qw-oracle/serve/mcp/src/tools/
git commit -m "qw-oracle/mcp: port all existing tools to postgres-js; FTS5 -> tsvector for search-solved-issues"
```

---

## Task 25: RRF helper

**Files:**
- Create: `apps/qw-oracle/shared/rrf.ts`
- Test: `apps/qw-oracle/shared/rrf.test.ts`

- [ ] **Step 1: Failing test**

```ts
// apps/qw-oracle/shared/rrf.test.ts
import { describe, expect, test } from 'bun:test';
import { reciprocalRankFusion } from './rrf.ts';

describe('reciprocalRankFusion', () => {
  test('merges two ranked lists; items in both rank higher than items in one', () => {
    const lex = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const sem = [{ id: 'b' }, { id: 'c' }, { id: 'd' }];
    const fused = reciprocalRankFusion([lex, sem], (r) => r.id);
    // 'b' is in both at high ranks -> fused #1
    expect(fused[0].item.id).toBe('b');
    expect(fused.length).toBe(4);   // a, b, c, d unioned
  });

  test('respects k parameter for tail dampening', () => {
    const list = [{ id: 'a' }, { id: 'b' }];
    const fused1 = reciprocalRankFusion([list], (r) => r.id, { k: 1 });
    const fused60 = reciprocalRankFusion([list], (r) => r.id, { k: 60 });
    // Higher k flattens scores; rankings stay the same but score differential shrinks.
    expect(fused1[0].score - fused1[1].score).toBeGreaterThan(fused60[0].score - fused60[1].score);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// apps/qw-oracle/shared/rrf.ts
// Reciprocal Rank Fusion. Stateless, parameter-free fusion of N ranked lists.
// Used by every hybrid-retrieval MCP tool to merge lexical (tsvector) and
// semantic (pgvector) results into a single ranked output.
//
// score(item) = sum over lists L of [ 1 / (k + rank_in_L(item)) ]
// k=60 is the standard literature default.

export interface FusedHit<T> {
  item: T;
  score: number;
  ranks: number[];   // per-input rank, -1 if missing from that list
}

export function reciprocalRankFusion<T>(
  rankedLists: T[][],
  keyOf: (item: T) => string,
  opts: { k?: number } = {},
): FusedHit<T>[] {
  const k = opts.k ?? 60;
  const accum = new Map<string, FusedHit<T>>();

  rankedLists.forEach((list, listIdx) => {
    list.forEach((item, rank) => {
      const key = keyOf(item);
      let slot = accum.get(key);
      if (!slot) {
        slot = { item, score: 0, ranks: rankedLists.map(() => -1) };
        accum.set(key, slot);
      }
      slot.ranks[listIdx] = rank;
      slot.score += 1 / (k + rank + 1);   // +1 because rank is 0-indexed
    });
  });
  return [...accum.values()].sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 3: Run test**

Run: `cd apps/qw-oracle && bun test shared/rrf.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/shared/rrf.ts apps/qw-oracle/shared/rrf.test.ts
git commit -m "qw-oracle: add reciprocal rank fusion helper"
```

---

## Task 26: New tool — `search_concepts`

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/types.ts` (add `SearchConceptResult`)
- Test: `apps/qw-oracle/serve/mcp/src/tools/search-concepts.test.ts`

- [ ] **Step 1: Add type**

```ts
// types.ts addition
export interface SearchConceptResult {
  slug: string;
  title: string;
  summary: string;
  match_score: number;
  match_quality: 'strong' | 'weak' | 'none';
  snippet: string;
  related_entities: string[];
  related_concepts: string[];
}
```

- [ ] **Step 2: Failing test (integration; sets up Postgres state)**

```ts
// apps/qw-oracle/serve/mcp/src/tools/search-concepts.test.ts
// Integration test: requires a populated DB. The test runner expects the
// monorepo's dev DB to have load-concepts already run; otherwise this test
// skips with a clear message.

import { describe, expect, test } from 'bun:test';
import { db } from '../db.ts';
import { searchConcepts } from './search-concepts.ts';

const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)('searchConcepts', () => {
  test('finds weapon-scripts from a vague query', async () => {
    const result = await searchConcepts({ query: 'weapon switching script' });
    expect(result.results.length).toBeGreaterThan(0);
    const slugs = result.results.map((r) => r.slug);
    expect(slugs).toContain('weapon-scripts');
  });

  test('returns match_quality none for genuinely out-of-corpus queries', async () => {
    const result = await searchConcepts({ query: 'how to deploy kubernetes' });
    expect(result.match_quality === 'none' || result.match_quality === 'weak').toBe(true);
  });
});
```

- [ ] **Step 3: Implement**

```ts
// apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts
import { db } from '../db.ts';
import { embedTexts } from '../../../shared/embedding.ts';
import { reciprocalRankFusion } from '../../../shared/rrf.ts';
import { SERVER_VERSION } from '../version.ts';
import type { SearchConceptResult } from '../types.ts';

const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';
const STRONG_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_STRONG_THRESHOLD ?? '0.05');
const WEAK_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_WEAK_THRESHOLD ?? '0.02');
// Note: thresholds operate on RRF score (1/(k+rank+1) summed), not on raw similarity.
// Calibrated against eval set per spec.

interface Args {
  query: string;
  limit?: number;
}

interface LexHit { id: number; slug: string; rank_pos: number; }
interface SemHit { id: number; slug: string; rank_pos: number; distance: number; }

export async function searchConcepts(args: Args) {
  const limit = args.limit ?? 5;
  const start = Date.now();
  const now = () => new Date().toISOString();

  let queryVector: number[];
  let semBlocked = false;
  try {
    const result = await embedTexts([args.query], QUERY_MODEL, 'query');
    queryVector = result.vectors[0];
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('mcp-query', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
  } catch (err) {
    semBlocked = true;
    queryVector = [];
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, error)
      VALUES ('mcp-query', ${QUERY_MODEL}, 0, ${(err as Error).message})
    `;
  }

  // Lexical
  const lex = await db<{ id: number; concept_slug: string; chunk_index: number }[]>`
    SELECT id, concept_slug, chunk_index
    FROM concept_chunks
    WHERE tsv @@ websearch_to_tsquery('english', ${args.query})
    ORDER BY ts_rank(tsv, websearch_to_tsquery('english', ${args.query})) DESC
    LIMIT ${limit * 4}
  `;

  // Semantic
  let sem: { id: number; concept_slug: string; chunk_index: number; distance: number }[] = [];
  if (!semBlocked) {
    const vec = `[${queryVector.join(',')}]`;
    sem = await db<{ id: number; concept_slug: string; chunk_index: number; distance: number }[]>`
      SELECT id, concept_slug, chunk_index, embedding <=> ${vec}::vector AS distance
      FROM concept_chunks
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vec}::vector
      LIMIT ${limit * 4}
    `;
  }

  // Fuse
  const fused = reciprocalRankFusion([lex, sem], (r) => `${r.concept_slug}:${r.chunk_index}`);
  const top = fused.slice(0, limit);

  // Materialise: need full rows for snippet + related lookups
  const results: SearchConceptResult[] = [];
  for (const hit of top) {
    const chunkRow = (await db<{ id: number; concept_slug: string; text: string }[]>`
      SELECT id, concept_slug, text FROM concept_chunks WHERE id = ${hit.item.id}
    `)[0];
    if (!chunkRow) continue;
    const conceptRow = (await db<{ slug: string; title: string; summary: string }[]>`
      SELECT slug, title, summary FROM concepts WHERE slug = ${chunkRow.concept_slug}
    `)[0];
    if (!conceptRow) continue;
    const ents = (await db<{ entity_canonical_id: string }[]>`
      SELECT entity_canonical_id FROM concept_entities WHERE concept_slug = ${conceptRow.slug}
    `).map((e) => e.entity_canonical_id);
    const cons = (await db<{ target_slug: string }[]>`
      SELECT target_slug FROM concept_concepts WHERE source_slug = ${conceptRow.slug}
    `).map((c) => c.target_slug);

    const snippet = truncateAroundQuery(chunkRow.text, args.query, 600);   // ~150 tokens

    results.push({
      slug: conceptRow.slug,
      title: conceptRow.title,
      summary: conceptRow.summary,
      match_score: hit.score,
      match_quality: hit.score >= STRONG_THRESHOLD ? 'strong' : hit.score >= WEAK_THRESHOLD ? 'weak' : 'none',
      snippet,
      related_entities: ents,
      related_concepts: cons,
    });
  }

  // Overall match quality (max of result match_qualities)
  const qualities = results.map((r) => r.match_quality);
  const overall: 'strong' | 'weak' | 'none' =
    qualities.includes('strong') ? 'strong' :
    qualities.includes('weak') ? 'weak' : 'none';

  await db`
    INSERT INTO query_log (tool, query_text, result_count, top_score, match_quality, latency_ms)
    VALUES ('search_concepts', ${args.query}, ${results.length}, ${results[0]?.match_score ?? null}, ${overall}, ${Date.now() - start})
  `;

  return {
    results,
    match_quality: overall,
    suggested_fallback: overall === 'none'
      ? `No strong matches for "${args.query}". Consider redirect_to_human or asking in #ezquake on Discord.`
      : null,
    meta: { tool: 'search_concepts', server_version: SERVER_VERSION, queried_at: now() },
  };
}

function truncateAroundQuery(text: string, query: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase().split(/\s+/).find((w) => w.length > 3) ?? query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return text.slice(0, maxChars) + '...';
  const start = Math.max(0, idx - Math.floor(maxChars / 2));
  const end = Math.min(text.length, start + maxChars);
  return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
}
```

- [ ] **Step 4: Run test**

Run: `cd apps/qw-oracle && bun test serve/mcp/src/tools/search-concepts.test.ts`
Expected: both tests PASS (assuming Voyage key is set and concepts loaded).

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts apps/qw-oracle/serve/mcp/src/tools/search-concepts.test.ts apps/qw-oracle/serve/mcp/src/types.ts
git commit -m "qw-oracle/mcp: add search_concepts tool (hybrid RRF over chunks)"
```

---

## Task 27: Upgrade `search_entities` to hybrid retrieval

**Files:**
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-entities.ts`

- [ ] **Step 1: Replace the body of search-entities to follow the search-concepts pattern**

The signature stays the same. Internally, run lexical (tsvector on `entities.description_tsv`) + semantic (pgvector on `entities.description_embedding`), fuse via RRF, return existing response shape with new `match_quality` flag and `match_score` field added per row.

```ts
// pseudocode of the change — engineer follows search-concepts.ts as the pattern.
// Lexical query:
const lex = await db<...>`
  SELECT canonical_id, project, type, name, description
  FROM entities
  WHERE description_tsv @@ websearch_to_tsquery('english', ${query})
    AND ${typeFilter}
  ORDER BY ts_rank(description_tsv, websearch_to_tsquery('english', ${query})) DESC
  LIMIT ${limit * 4}
`;
// Semantic:
const sem = await db<...>`
  SELECT canonical_id, project, type, name, description, description_embedding <=> ${vec}::vector AS distance
  FROM entities
  WHERE description_embedding IS NOT NULL AND ${typeFilter}
  ORDER BY description_embedding <=> ${vec}::vector
  LIMIT ${limit * 4}
`;
// RRF fuse, return.
```

- [ ] **Step 2: Run typecheck**

Run: `cd apps/qw-oracle && npm run typecheck`

- [ ] **Step 3: Spot-check via psql**

Run: `cd apps/qw-oracle && bun -e "import('./serve/mcp/src/tools/search-entities.ts').then(m => m.searchEntities({query: 'screen wobble', limit: 5}).then(console.log))"`
Expected: includes `cl_bob` near top (the test the operator did manually that triggered this whole arc).

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/serve/mcp/src/tools/search-entities.ts
git commit -m "qw-oracle/mcp: upgrade search_entities to hybrid retrieval (RRF lexical+vector)"
```

---

## Task 28: New tool — `redirect_to_human`

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.ts`
- Create: `apps/qw-oracle/db/migrations/008_redirect_seed.sql`

- [ ] **Step 1: Seed redirect targets**

```sql
-- apps/qw-oracle/db/migrations/008_redirect_seed.sql
INSERT INTO redirect_targets (topic, display_name, url, description) VALUES
  ('discord-helpdesk', 'Quake.World Discord #helpdesk',
   'https://discord.com/channels/.../helpdesk',
   'Active community helpdesk for ezQuake / FTE / general configuration questions.'),
  ('discord-dev-corner', 'Quake.World Discord #dev-corner',
   'https://discord.com/channels/.../dev-corner',
   'Engine and tooling development discussion.'),
  ('ezquake-docs', 'ezQuake Documentation',
   'https://ezquake.com/docs/',
   'Authoritative ezQuake feature guides.'),
  ('quakeworld-wiki', 'wiki.quakeworld.nu',
   'https://wiki.quakeworld.nu/',
   'Community wiki: maps, configs, history.'),
  ('expert-spoike', 'Spoike (FTE engine maintainer)',
   'https://discord.com/users/...',
   'Authoritative on FTE-specific behaviour.'),
  ('expert-meag', 'meag (ezQuake maintainer)',
   'https://discord.com/users/...',
   'Authoritative on ezQuake recent versions.')
ON CONFLICT (topic) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  url = EXCLUDED.url,
  description = EXCLUDED.description;
```

(Operator fills in real Discord channel/user URLs on first deploy.)

- [ ] **Step 2: Implement tool**

```ts
// apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.ts
import { db } from '../db.ts';
import { SERVER_VERSION } from '../version.ts';

interface Args {
  topic_hint?: string;   // e.g. 'fte', 'helpdesk', 'config'
}

export async function redirectToHuman(args: Args) {
  const targets = await db<{ topic: string; display_name: string; url: string; description: string | null }[]>`
    SELECT topic, display_name, url, description FROM redirect_targets ORDER BY topic
  `;
  // Operator can refine later; v1 returns all targets, lets the consumer LLM pick.
  return {
    results: targets,
    match_quality: 'strong' as const,
    suggested_fallback: null,
    meta: { tool: 'redirect_to_human', server_version: SERVER_VERSION, queried_at: new Date().toISOString() },
  };
}
```

- [ ] **Step 3: Migrate, verify**

Run: `cd apps/qw-oracle && npm run migrate && npm run db:psql -- -c "SELECT count(*) FROM redirect_targets"`
Expected: 6 rows (or however many seeds).

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/db/migrations/008_redirect_seed.sql apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.ts
git commit -m "qw-oracle/mcp: add redirect_to_human tool with seed targets"
```

---

## Task 29: Server orientation instructions + tool registration

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/orientation.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/index.ts`

- [ ] **Step 1: Author orientation text**

```ts
// apps/qw-oracle/serve/mcp/src/orientation.ts
export const ORIENTATION_INSTRUCTIONS = `
QW Oracle is a knowledge service for QuakeWorld engine ports, game content, and community history.

Three layers:
- Layer 1 (engine + game-content facts): cvars, commands, macros, command-line params, maps,
  gameplay mechanics. Use lookup_entity / search_entities / lookup_map / search_maps /
  lookup_mechanic / search_mechanics for definitive engine facts.
- Layer 3 (curated patterns and how-tos): use search_concepts for vague how-to questions.
  Concept notes synthesise Layer 1 facts into actionable guidance and reference related
  entities. Returned snippet + summary is the focused signal; call get_concept_note for the
  full body if the snippet alone isn't enough.
- Layer 2 (chat history): use search_solved_issues for "has this been debugged before"
  questions. Returns raw chat sessions for citation.

Recommended iteration:
- Start with search_concepts for how-to / pattern questions ("how do I configure X").
- Start with search_entities for fact questions ("what does X do") or use lookup_entity
  if the canonical ID is known.
- Use search_solved_issues for historical / community questions.

Honest failure: every search response includes match_quality (strong / weak / none).
- match_quality = 'none' or 'weak': do NOT synthesise an answer from training data.
  Either redirect (call redirect_to_human) or state that the corpus does not cover this.
- match_quality = 'strong': synthesise from the returned snippets and cite by entity
  canonical_id, concept slug, or session_id.

Citation discipline: every claim should trace back to a Layer 1 entity (cite canonical_id),
a Layer 3 concept note (cite slug), or a Layer 2 chat session (cite session_id). "The AI
says" is not a valid citation.
`.trim();
```

- [ ] **Step 2: Wire into server `initialize`**

In `serve/mcp/src/index.ts`, when constructing the `Server`:

```ts
const server = new Server(
  { name: 'qw-oracle-mcp', version: SERVER_VERSION },
  {
    capabilities: { tools: {} },
    instructions: ORIENTATION_INSTRUCTIONS,
  },
);
```

Also: register the new tools (`search_concepts`, `redirect_to_human`) in the tool list and the `CallToolRequestSchema` handler.

- [ ] **Step 3: Run typecheck + smoke test the server starts**

Run: `cd apps/qw-oracle && npm run typecheck && bun serve/mcp/src/index.ts < /dev/null &`
Expected: server prints `[qw-oracle-mcp] loaded N concept notes...` (now from DB) and stays up. Kill it.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/serve/mcp/src/orientation.ts apps/qw-oracle/serve/mcp/src/index.ts
git commit -m "qw-oracle/mcp: add orientation instructions; register search_concepts + redirect_to_human"
```

---

## Task 30: HTTP/SSE transport for public MCP

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/transports/http.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/index.ts` (transport choice via env var)

The MCP SDK supports stdio (existing) and HTTP/SSE. Public consumers connect over HTTP; local Claude Code sessions stay on stdio.

- [ ] **Step 1: Add HTTP transport entrypoint**

```ts
// apps/qw-oracle/serve/mcp/src/transports/http.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from 'node:http';

export function startHttpServer(server: Server, port: number): void {
  const httpServer = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/sse') {
      const transport = new SSEServerTransport('/messages', res);
      await server.connect(transport);
    } else if (req.method === 'POST' && req.url === '/messages') {
      // SSE message back-channel; SDK helper handles wire-up.
      // (Engineer follows MCP SDK examples; current API may have evolved
      // since this plan was written.)
    } else if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  httpServer.listen(port, '127.0.0.1', () => {
    console.error(`[qw-oracle-mcp] HTTP/SSE listening on 127.0.0.1:${port}`);
  });
}
```

- [ ] **Step 2: Modify `index.ts` to pick transport**

```ts
// At the bottom of index.ts:
const transport = process.env.MCP_TRANSPORT ?? 'stdio';
if (transport === 'http') {
  const port = parseInt(process.env.MCP_PORT ?? '3000', 10);
  startHttpServer(server, port);
} else {
  await server.connect(new StdioServerTransport());
}
```

- [ ] **Step 3: Manual smoke test**

Run: `cd apps/qw-oracle && MCP_TRANSPORT=http MCP_PORT=3000 bun serve/mcp/src/index.ts &`
Then: `curl -s http://127.0.0.1:3000/health`
Expected: `ok`. Kill the server.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/serve/mcp/src/transports/http.ts apps/qw-oracle/serve/mcp/src/index.ts
git commit -m "qw-oracle/mcp: add HTTP/SSE transport (env: MCP_TRANSPORT=http)"
```

---

# Phase 7 — Observability wire-up

## Task 31: Query log on every tool call

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/query-log.ts`
- Modify: every tool in `serve/mcp/src/tools/` (wrap response logging)

Most tools already write to query_log inside their bodies (search_concepts already does). Standardise via a wrapper.

- [ ] **Step 1: Create wrapper helper**

```ts
// apps/qw-oracle/serve/mcp/src/query-log.ts
import { db } from './db.ts';

export async function logQuery(opts: {
  tool: string;
  queryText?: string;
  resultCount: number;
  topScore?: number;
  matchQuality?: string;
  latencyMs: number;
  error?: string;
  consumerHint?: string;
}): Promise<void> {
  await db`
    INSERT INTO query_log (tool, query_text, result_count, top_score, match_quality, latency_ms, error, consumer_hint)
    VALUES (${opts.tool}, ${opts.queryText ?? null}, ${opts.resultCount}, ${opts.topScore ?? null},
            ${opts.matchQuality ?? null}, ${opts.latencyMs}, ${opts.error ?? null}, ${opts.consumerHint ?? null})
  `;
}
```

- [ ] **Step 2: Replace inline INSERTs with `logQuery()` calls in every tool**

Every tool's response should be wrapped in `try/finally` that logs.

- [ ] **Step 3: Run typecheck + smoke test query_log populates**

Run: ad-hoc invocation of a tool through the MCP, then `npm run db:psql -- -c "SELECT tool, latency_ms, match_quality FROM query_log ORDER BY id DESC LIMIT 5"`
Expected: rows present.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/serve/mcp/src/query-log.ts apps/qw-oracle/serve/mcp/src/tools/
git commit -m "qw-oracle/mcp: standardise query_log writes via shared wrapper"
```

---

## Task 32: Operator observability cheatsheet

**Files:**
- Create: `apps/qw-oracle/docs/OBSERVABILITY.md`

- [ ] **Step 1: Write doc with copy-paste SQL**

```markdown
# QW Oracle Observability — operator cheatsheet

All observability lives in two Postgres tables: `query_log` (every MCP tool call)
and `embedding_api_log` (every Voyage call from loader or MCP).

## Common queries

### What failed retrieval recently?
SELECT queried_at, tool, query_text, match_quality, latency_ms
FROM query_log
WHERE match_quality IN ('weak', 'none')
ORDER BY queried_at DESC
LIMIT 50;

### Latency p95 per tool, last 24h
SELECT tool,
       count(*) AS n,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95
FROM query_log
WHERE queried_at > now() - INTERVAL '24 hours'
GROUP BY tool
ORDER BY p95 DESC;

### Voyage spend trajectory (token consumption per day)
SELECT date_trunc('day', called_at) AS day,
       source,
       sum(input_tokens) AS tokens,
       count(*) AS calls,
       sum(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) AS errors
FROM embedding_api_log
GROUP BY day, source
ORDER BY day DESC;

### Concept-note coverage gaps (queries that returned 'none' grouped)
SELECT query_text, count(*) AS hits
FROM query_log
WHERE tool = 'search_concepts' AND match_quality = 'none'
GROUP BY query_text
ORDER BY hits DESC
LIMIT 20;
-- These are concept-note authoring leads.

### Most-called tools last 7d
SELECT tool, count(*) AS n
FROM query_log
WHERE queried_at > now() - INTERVAL '7 days'
GROUP BY tool ORDER BY n DESC;
```

- [ ] **Step 2: Commit**

```bash
git add apps/qw-oracle/docs/OBSERVABILITY.md
git commit -m "qw-oracle: add observability cheatsheet for operators"
```

---

# Phase 8 — Eval set + deploy

## Task 33: Author eval set

**Files:**
- Create: `apps/qw-oracle/eval/queries.json`

This task is operator-driven; the agent prepares the file shape and seeds with example queries the operator then refines.

- [ ] **Step 1: Create scaffold with example queries**

```json
[
  {
    "id": 1,
    "category": "concept-anchored",
    "query": "how do I bind weapons with a priority chain",
    "expected_top_3": ["concept:weapon-scripts", "ezquake:cvar:cl_weaponpreselect", "ezquake:command:weapon"],
    "tools": ["search_concepts", "search_entities"]
  },
  {
    "id": 2,
    "category": "vague-natural-language",
    "query": "screen wobbles when running",
    "expected_top_3": ["ezquake:cvar:cl_bob", "ezquake:cvar:v_idlescale"],
    "tools": ["search_entities"]
  },
  {
    "id": 3,
    "category": "exact-name",
    "query": "cl_bob",
    "expected_top_3": ["ezquake:cvar:cl_bob"],
    "tools": ["lookup_entity"]
  },
  {
    "id": 4,
    "category": "out-of-corpus",
    "query": "how do I deploy kubernetes pods",
    "expected_top_3": [],
    "tools": ["search_concepts", "search_entities", "search_solved_issues"]
  }
]
```

- [ ] **Step 2: Operator extends to 15-20 entries**

Operator authors the remaining entries by browsing #helpdesk; agent should not invent these. If running this plan in subagent mode, the eval-set authoring step should be operator-driven, not subagent-driven.

- [ ] **Step 3: Commit (with whatever the operator has)**

```bash
git add apps/qw-oracle/eval/queries.json
git commit -m "qw-oracle: add eval-set scaffold (operator extends to 15-20 entries)"
```

---

## Task 34: Eval runner script

**Files:**
- Create: `apps/qw-oracle/eval/eval.ts`

- [ ] **Step 1: Implement runner**

```ts
// apps/qw-oracle/eval/eval.ts
// Runs every query in queries.json against the local MCP tools, reports
// recall@1, recall@3, per-question pass/fail.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../shared/db.ts';
import { searchConcepts } from '../serve/mcp/src/tools/search-concepts.ts';
import { searchEntities } from '../serve/mcp/src/tools/search-entities.ts';
import { searchSolvedIssues } from '../serve/mcp/src/tools/search-solved-issues.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface EvalQuery {
  id: number;
  category: string;
  query: string;
  expected_top_3: string[];
  tools: string[];
}

function ranksOfExpected(returnedIds: string[], expected: string[]): number[] {
  return expected.map((e) => returnedIds.indexOf(e));
}

async function main(): Promise<void> {
  const queries: EvalQuery[] = JSON.parse(
    readFileSync(resolve(__dirname, 'queries.json'), 'utf8'),
  );

  let pass1 = 0, pass3 = 0;
  for (const q of queries) {
    const allHits: string[] = [];
    if (q.tools.includes('search_concepts')) {
      const r = await searchConcepts({ query: q.query, limit: 10 });
      allHits.push(...r.results.map((h) => `concept:${h.slug}`));
    }
    if (q.tools.includes('search_entities')) {
      const r = await searchEntities({ query: q.query, limit: 10 });
      allHits.push(...r.results.map((h: any) => h.canonical_id));
    }
    if (q.tools.includes('search_solved_issues')) {
      const r = await searchSolvedIssues({ query: q.query, limit: 10 });
      allHits.push(...r.results.map((h) => h.session_id));
    }

    const ranks = ranksOfExpected(allHits, q.expected_top_3);
    const top1Hit = q.expected_top_3.length === 0
      ? allHits.length === 0   // out-of-corpus: success means empty
      : ranks.some((r) => r === 0);
    const top3Hit = q.expected_top_3.length === 0
      ? allHits.length === 0
      : ranks.some((r) => r >= 0 && r < 3);

    if (top1Hit) pass1++;
    if (top3Hit) pass3++;
    const status = top3Hit ? 'PASS' : 'FAIL';
    console.log(`[${status}] q${q.id} (${q.category}) "${q.query}" -> top3=${ranks.map((r) => (r >= 0 ? r : '-')).join(',')}`);
  }

  const N = queries.length;
  console.log(`\nrecall@1: ${pass1}/${N} = ${((pass1 / N) * 100).toFixed(1)}%`);
  console.log(`recall@3: ${pass3}/${N} = ${((pass3 / N) * 100).toFixed(1)}%`);
  await db.end();
  if (pass3 < Math.ceil(N * 0.7)) {
    console.error('FAIL: recall@3 below 70% threshold');
    process.exit(1);
  }
}

if (import.meta.main) await main();
```

- [ ] **Step 2: Run, verify it produces metrics**

Run: `cd apps/qw-oracle && npm run eval`
Expected: prints per-question PASS/FAIL + recall@1/recall@3.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/eval/eval.ts
git commit -m "qw-oracle: add eval-runner with recall@1/recall@3 reporting + 70% gate"
```

---

## Task 35: Threshold calibration script

**Files:**
- Create: `apps/qw-oracle/eval/calibrate.ts`

- [ ] **Step 1: Implement calibrator**

```ts
// apps/qw-oracle/eval/calibrate.ts
// Sweeps possible (strong, weak) threshold pairs against eval set, picks the
// pair that maximises agreement between match_quality labels and operator's
// expected outcomes.
//
// Run after concepts + entities are embedded and eval set is authored.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../shared/db.ts';
import { searchConcepts } from '../serve/mcp/src/tools/search-concepts.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface EvalQuery {
  id: number;
  category: string;
  query: string;
  expected_top_3: string[];
}

async function main(): Promise<void> {
  const queries: EvalQuery[] = JSON.parse(
    readFileSync(resolve(__dirname, 'queries.json'), 'utf8'),
  );

  // For each query, get raw RRF scores
  const observations: { isInCorpus: boolean; topScore: number }[] = [];
  for (const q of queries) {
    const r = await searchConcepts({ query: q.query, limit: 5 });
    observations.push({
      isInCorpus: q.expected_top_3.length > 0,
      topScore: r.results[0]?.match_score ?? 0,
    });
  }

  // Sweep thresholds
  let best = { strong: 0.05, weak: 0.02, accuracy: 0 };
  const candidates = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08];
  for (const strong of candidates) {
    for (const weak of candidates) {
      if (weak >= strong) continue;
      let correct = 0;
      for (const o of observations) {
        const label = o.topScore >= strong ? 'strong' : o.topScore >= weak ? 'weak' : 'none';
        const inCorpus = o.isInCorpus;
        // Accuracy heuristic: in-corpus -> not 'none'; out-of-corpus -> 'none' or 'weak'
        if (inCorpus && label !== 'none') correct++;
        else if (!inCorpus && (label === 'none' || label === 'weak')) correct++;
      }
      const accuracy = correct / observations.length;
      if (accuracy > best.accuracy) best = { strong, weak, accuracy };
    }
  }

  console.log(`Best thresholds: STRONG=${best.strong}, WEAK=${best.weak}, accuracy=${(best.accuracy * 100).toFixed(1)}%`);
  console.log(`\nWrite these to .env:`);
  console.log(`MATCH_QUALITY_STRONG_THRESHOLD=${best.strong}`);
  console.log(`MATCH_QUALITY_WEAK_THRESHOLD=${best.weak}`);
  await db.end();
}

if (import.meta.main) await main();
```

- [ ] **Step 2: Run + write the produced thresholds back into `.env`**

Run: `cd apps/qw-oracle && npm run calibrate`
Expected: prints best thresholds. Operator updates `.env` with the printed values.

- [ ] **Step 3: Re-run eval, confirm thresholds yield expected match_quality labels**

Run: `cd apps/qw-oracle && npm run eval`
Expected: PASSes don't regress; out-of-corpus queries now report `match_quality = none`.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/eval/calibrate.ts
git commit -m "qw-oracle: add threshold calibration sweep (deploy-gate step)"
```

---

## Task 36: Production Docker setup

**Files:**
- Create: `apps/qw-oracle/Dockerfile`
- Create: `apps/qw-oracle/db/docker-compose.prod.yml`
- Create: `apps/qw-oracle/db/nginx.conf`

- [ ] **Step 1: Write Dockerfile for MCP server**

```dockerfile
# apps/qw-oracle/Dockerfile
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-workspaces --omit=dev

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3000
EXPOSE 3000
CMD ["bun", "serve/mcp/src/index.ts"]
```

- [ ] **Step 2: Write `compose.prod.yml`**

```yaml
# apps/qw-oracle/db/docker-compose.prod.yml
# Unraid deployment: Postgres + MCP server + nginx behind CF Tunnel.
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: qw-oracle-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: qw_oracle
      POSTGRES_USER: qworacle
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - /mnt/user/appdata/qw-oracle/postgres-data:/var/lib/postgresql/data
    networks: [qworacle-net]

  mcp:
    image: ghcr.io/paradoks81/qw-oracle-mcp:latest
    container_name: qw-oracle-mcp
    restart: unless-stopped
    depends_on: [postgres]
    environment:
      DATABASE_URL: postgresql://qworacle:${POSTGRES_PASSWORD}@postgres:5432/qw_oracle
      VOYAGE_API_KEY: ${VOYAGE_API_KEY}
      EMBEDDING_MODEL_BUILD: voyage-4-large
      EMBEDDING_MODEL_QUERY: voyage-4-lite
      EMBEDDING_DIMENSION: 1024
      MATCH_QUALITY_STRONG_THRESHOLD: ${MATCH_QUALITY_STRONG_THRESHOLD}
      MATCH_QUALITY_WEAK_THRESHOLD: ${MATCH_QUALITY_WEAK_THRESHOLD}
      MCP_TRANSPORT: http
      MCP_PORT: 3000
      PUBLIC_BASE_URL: https://oracle.slipgate.me
    networks: [qworacle-net]

  nginx:
    image: nginx:1.27-alpine
    container_name: qw-oracle-nginx
    restart: unless-stopped
    depends_on: [mcp]
    ports:
      - "127.0.0.1:8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /mnt/user/appdata/qw-oracle/snapshots:/var/oracle/snapshots:ro
    networks: [qworacle-net]

networks:
  qworacle-net:
    driver: bridge
```

- [ ] **Step 3: Write nginx config**

```nginx
# apps/qw-oracle/db/nginx.conf
server {
  listen 80;
  server_name _;

  location /mcp/ {
    proxy_pass http://mcp:3000/;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_set_header Cache-Control 'no-cache';
    proxy_set_header X-Accel-Buffering 'no';
    proxy_buffering off;
    proxy_read_timeout 86400;
  }

  location /snapshots/ {
    alias /var/oracle/snapshots/;
    add_header Cache-Control "public, max-age=300";
    autoindex off;
  }

  location /health {
    return 200 'ok';
    add_header Content-Type text/plain;
  }
}
```

- [ ] **Step 4: Build + push image to GHCR**

Run (operator-driven, requires `gh auth`):
```bash
cd apps/qw-oracle
docker build -t ghcr.io/paradoks81/qw-oracle-mcp:latest .
docker push ghcr.io/paradoks81/qw-oracle-mcp:latest
```

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/Dockerfile apps/qw-oracle/db/docker-compose.prod.yml apps/qw-oracle/db/nginx.conf
git commit -m "qw-oracle: add production Dockerfile + compose + nginx config"
```

---

## Task 37: Unraid deploy + CF Tunnel route + DNS

**Files:**
- This task is operator-driven; no source files. Document the deploy commands.

- [ ] **Step 1: Operator copies compose to Unraid**

```bash
# from operator's WSL
scp apps/qw-oracle/db/docker-compose.prod.yml apps/qw-oracle/db/nginx.conf \
    unraid:/mnt/user/appdata/qw-oracle/
```

- [ ] **Step 2: Operator authors `.env` on Unraid with real secrets**

```bash
ssh unraid 'cat > /mnt/user/appdata/qw-oracle/.env <<EOF
POSTGRES_PASSWORD=...
VOYAGE_API_KEY=...
MATCH_QUALITY_STRONG_THRESHOLD=...   # from calibration
MATCH_QUALITY_WEAK_THRESHOLD=...
EOF'
```

- [ ] **Step 3: Bring up the stack**

```bash
ssh unraid 'cd /mnt/user/appdata/qw-oracle && docker compose -f docker-compose.prod.yml up -d'
```

- [ ] **Step 4: Migrate the production DB and load corpus**

```bash
ssh unraid 'cd /mnt/user/appdata/qw-oracle && docker compose -f docker-compose.prod.yml exec mcp tsx db/migrate.ts'
# Then run loaders for L1, L2 (Discord), L3, embed-entities, embed-chunks
```

(Or alternative: dump/restore the dev DB into prod via `pg_dump | pg_restore` over Tailscale.)

- [ ] **Step 5: Configure CF Tunnel route**

In Cloudflare dashboard, add route to existing Unraid tunnel:
- Hostname: `oracle.slipgate.me`
- Service: `http://localhost:8080`

- [ ] **Step 6: Add DNS CNAME**

`oracle.slipgate.me CNAME <existing-tunnel-cname>` (proxied).

- [ ] **Step 7: Smoke-test public endpoint**

Run from any machine: `curl -s https://oracle.slipgate.me/health`
Expected: `ok`.

Run: `curl -s https://oracle.slipgate.me/snapshots/` (if any snapshots exist)
Expected: 404 or directory hidden — content depends on Arc 2 work.

- [ ] **Step 8: Wire Claude Desktop to the public MCP and run a manual smoke query**

In Claude Desktop config: add MCP server pointing at `https://oracle.slipgate.me/mcp/sse`. Restart Claude Desktop. In a new chat: ask "how do I make my screen stop wobbling in QuakeWorld?" — verify the answer cites `cl_bob` from a search_concepts or search_entities hit.

- [ ] **Step 9: No commit** (this task is operational; no files change).

---

## Task 38: Public-MCP deploy gate — eval set must pass

**Files:** none (procedural)

- [ ] **Step 1: Run eval against the production DB**

```bash
ssh unraid 'cd /mnt/user/appdata/qw-oracle && docker compose -f docker-compose.prod.yml exec mcp tsx eval/eval.ts'
```
Expected: recall@3 ≥ 70% (the eval gate); calibrated thresholds yield correct match_quality labels.

If FAIL: do not announce the public MCP. Investigate, retune thresholds via `npm run calibrate` on prod, redeploy.

- [ ] **Step 2: Update CLAUDE.md to retire the SQLite rule**

Edit `apps/qw-oracle/CLAUDE.md`:
- Remove "SQLite over Postgres" line.
- Add note: "Authoritative store is Postgres 16 + pgvector + tsvector; SQLite remains acceptable for genuinely-derived artefacts (test fixtures, etc.). See `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`."

- [ ] **Step 3: Update `apps/qw-oracle/OVERVIEW.md` Layer 2 attestation paragraph**

Replace the "state unknown" paragraph with the new state: "Layer 2 ported to Postgres in Arc 1 (2026-05-XX); enrichment pipeline (segment / classify / summarise / embed) deferred to Arc 3."

- [ ] **Step 4: Update `OVERVIEW.md` integration map**

The knowledge-service ecosystem diagram in root `OVERVIEW.md` should annotate the public MCP endpoint at `oracle.slipgate.me/mcp` and note that snapshots will be served via the same domain after Arc 2.

- [ ] **Step 5: Commit doc updates**

```bash
git add apps/qw-oracle/CLAUDE.md apps/qw-oracle/OVERVIEW.md OVERVIEW.md
git commit -m "qw-oracle: docs after Arc 1 ship (Postgres single-engine, public MCP live)"
```

---

# Self-review

This is the section where the plan author looks at the spec with fresh eyes and checks coverage.

## Spec coverage check

| Spec section | Plan task(s) | Coverage |
|---|---|---|
| Storage: Postgres + pgvector + tsvector single engine | Task 1-7, 11, 15, 20 | ✓ |
| Considered alternative (sqlite-vec rejection) | n/a — defended in spec, no action needed | ✓ |
| Voyage v4 build-large + query-lite + nano fallback | Task 19-22, env config in Task 2 | ✓ |
| Token-budget walkthrough | env limits documented in Task 2; ops doc in Task 32 | ✓ |
| Hybrid retrieval (RRF) | Task 25-27 | ✓ |
| `search_concepts` tool | Task 26 | ✓ |
| Bidirectional graph (frontmatter source-of-truth, body-link drift check) | Task 17-18 | ✓ |
| Honest-failure machinery (orientation + match_quality + redirect_to_human) | Task 28-29 | ✓ |
| Snapshot manifest + delta fetch | NOT IN ARC 1 — Arc 2 | (correct deferral) |
| Schema (concepts, chunks, graph, redirect, query_log, embedding_api_log) | Task 6-7, 11, 15, 20, 28 | ✓ |
| Authoring loop (3-layer-symmetric, hash incremental) | Task 17, 21, 22 | ✓ |
| Eval set (15-20 questions, deploy-gate calibration) | Task 33-35, 38 | ✓ |
| Observability (query_log, embedding_api_log, ops cheatsheet) | Task 20, 31, 32 | ✓ |
| Deploy (Unraid + CF Tunnel + oracle.slipgate.me) | Task 36-38 | ✓ |
| Endgame migration story (pg_dump → Hetzner) | Documented in spec Risks; Task 36's compose is portable | ✓ |
| CLAUDE.md retire SQLite rule | Task 38 step 2 | ✓ |

## Placeholder scan

Scanned for: TBD, TODO, "implement later", "fill in details", "add appropriate error handling", references to undefined types/functions.

Findings:
- Task 6 has the comment "(continue with the remaining *_versions tables...)" — this is a deliberate plan-author note flagging that the engineer must port all 14 tables. The plan calls out the work explicitly rather than handwaving with "...".
- Task 8 is similarly truncated for asset tables.
- Task 13 IRC parser logic is "Engineer copies parsing logic from import-irc.mjs verbatim" — this is acceptable because the source file exists and the engineer can copy it. Naming the source is actionable.
- Task 14 session-building "Engineer ports the gap-segmentation logic" — same pattern; source exists.
- Task 24 "(Engineer keeps the existing tool's response envelope and just switches the SQL to postgres-js)" — acceptable for a port task.
- Task 30 "(Engineer follows MCP SDK examples; current API may have evolved...)" — flagged honestly because the SDK API surface evolves; engineer references current SDK docs.

These are not placeholders in the no-placeholder sense — they're explicit "here is the source you copy from" pointers. The plan would be longer if every CREATE TABLE and every parser function were inlined; given the spec's 800-line ceiling, the pointers are pragmatic.

## Type consistency check

Quick scan for naming drift across tasks:
- `concept_slug` used consistently across `concept_chunks`, `concept_entities`, `concept_concepts`. ✓
- `entity_canonical_id` matches `entities.canonical_id` join target. ✓
- `embedding` column name consistent across `entities` and `concept_chunks`. (entity uses `description_embedding`; chunks use `embedding`. Different tables; no collision.) ✓
- `match_quality` literal type 'strong' | 'weak' | 'none' consistent across types.ts addition + tool implementations + eval runner. ✓
- `EMBEDDING_MODEL_BUILD` / `EMBEDDING_MODEL_QUERY` / `EMBEDDING_DIMENSION` env vars used consistently in Task 2 (.env.example), Task 21 (embed-entities), Task 22 (embed-chunks), Task 26 (search_concepts), Task 36 (compose.prod). ✓
- `voyage-4-large` / `voyage-4-lite` model names consistent. ✓

## Open questions resolved in plan

The spec listed 8 open questions for the implementation plan. Resolutions:

1. **Chunking strategy:** markdown headings, max 500 tokens, secondary sentence-split if over cap. (Task 16.) Token-window-with-overlap left as future tuning.
2. **RRF k:** standard 60 (Task 25 default).
3. **Match-quality thresholds:** placeholder values in `.env.example`; calibrated by `npm run calibrate` against eval set as deploy gate (Task 35).
4. **Migrator tool:** hand-rolled `.sql` runner (Task 3).
5. **MCP transport:** both — stdio default, HTTP/SSE via `MCP_TRANSPORT=http` (Task 30).
6. **Redirect targets seed list:** seeded in migration 008 (Task 28).
7. **Layer 2 port granularity:** rewrite-and-port (Task 12-13 — `.mjs` scripts deleted, replaced by typed `.ts` writing to Postgres).
8. **Materialised view vs on-the-fly:** `session_search` shipped as a plain VIEW in Task 11; materialisation deferred to "if measured latency demands it."

## Final notes

This plan is large. Arc 1 covers a lot of ground because the spec's "single engine" decision means the Postgres migration, vector pipeline, new tools, and deploy all ship together. Splitting into multiple plans was considered and rejected: any subset of the work would leave the system in an awkward intermediate state (two engines simultaneously, or vectors without a tool to expose them, etc.).

Phase boundaries are natural checkpoints. Subagent-driven execution should pause between phases for operator review.

---

*End of plan.*
