# Phase 1 - Foundation

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `_legacy-monolithic-plan.md` for inspiration only - do NOT copy SQL or code blocks; verify against live source files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Stand up the Postgres 16 + pgvector dev container, hand-rolled migrator, and shared `postgres-js` client, all running under Bun. Layer 1's existing SQLite path (`scripts/load-knowledge/`) and the live MCP server (`serve/mcp/`) are not touched yet - they keep working unchanged. At phase boundary the dev container is up at `127.0.0.1:5432`, both the dev DB (`qw_oracle`) and the test DB (`qw_oracle_test`) exist, the migrator's `schema_migrations` tracking table is populated with `001_init.sql` (which has installed the `vector` extension and seeded `oracle_meta` + `embedding_metadata`), and `bun test` passes for the migrator and the shared db client.

## Inputs from previous phase

This is Phase 1; the operator-side prerequisites in `prerequisites.md` are the only inputs:

- Docker Desktop on Windows with WSL integration; `docker ps` works from WSL.
- `bun --version` >= 1.3 in WSL (verified at draft time: 1.3.11 at `/home/paradoks/.nvm/versions/node/v20.20.0/bin/bun`).
- `apps/qw-oracle/.env` populated with at least `DATABASE_URL` and `VOYAGE_API_KEY`. (`.env.example` is created by this phase; operator copies + fills.)
- `.env` is in `apps/qw-oracle/.gitignore` (verified at draft time: line 6 of the existing file is `.env`).
- The four Layer 1 entity counts are recorded in `prerequisites.md` for use as Phase 2's regression gate. Verified at draft time against the live `data/knowledge.db`: `ezquake=4042, fte=3279, mvdsv=1236, qwcl=380`.

## Files touched

### Created

```
apps/qw-oracle/db/docker-compose.dev.yml          # hand-written
apps/qw-oracle/db/init/01-create-test-db.sql      # hand-written; mounted into pg init dir
apps/qw-oracle/db/migrate.ts                      # hand-written
apps/qw-oracle/db/migrate.test.ts                 # hand-written
apps/qw-oracle/db/migrations/001_init.sql         # hand-written
apps/qw-oracle/shared/db.ts                       # hand-written
apps/qw-oracle/shared/db.test.ts                  # hand-written
apps/qw-oracle/scripts/db-up.sh                   # hand-written
apps/qw-oracle/.env.example                       # hand-written
```

### Modified

```
apps/qw-oracle/package.json                       # add postgres + bun-types; drop tsx; switch script runners to bun; add db:* / migrate / test scripts
```

### Deleted

```
(none)
```

`better-sqlite3`, `@types/better-sqlite3`, and the existing `import:discord` / `import:irc` / `stats` / `load-knowledge` scripts must remain functional - the SQLite-backed loader and MCP server are still load-bearing through Phases 2-6. Per `decisions.md` D14 each phase commits a working state; Phase 1 adds Postgres infra without removing SQLite infra.

## Tasks

### Task 1: Switch `package.json` to Bun, add postgres-js, drop tsx

**Goal.** Add the Postgres client + Bun typings, drop the Node-only `tsx` runner, route every existing script through `bun`, and register the new `db:*` / `migrate` / `test` scripts. Keeps `better-sqlite3` and the existing entry points; only the runner changes.

**Files.** `apps/qw-oracle/package.json`.

**Steps.**

- [ ] Replace the contents of `apps/qw-oracle/package.json` with the block below. The pre-existing description string carries an em-dash; preserved verbatim to avoid drift unrelated to this phase (see Open questions).

```json
{
  "name": "qw-oracle",
  "version": "0.1.0",
  "description": "QuakeWorld community knowledge base — IRC + Discord chat intelligence",
  "type": "module",
  "scripts": {
    "import:discord": "bun scripts/import-discord.mjs",
    "import:irc": "bun scripts/import-irc.mjs",
    "stats": "bun scripts/stats.mjs",
    "typecheck": "tsc --noEmit",
    "load-knowledge": "bun scripts/load-knowledge/index.ts",
    "db:up": "docker compose -f db/docker-compose.dev.yml up -d",
    "db:down": "docker compose -f db/docker-compose.dev.yml down",
    "db:logs": "docker compose -f db/docker-compose.dev.yml logs -f postgres",
    "db:psql": "docker compose -f db/docker-compose.dev.yml exec postgres psql -U qworacle -d qw_oracle",
    "migrate": "bun db/migrate.ts",
    "migrate:reset": "bun db/migrate.ts --reset",
    "test": "DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test"
  },
  "dependencies": {
    "@qw/version-resolution": "workspace:*",
    "better-sqlite3": "^11.0.0",
    "js-yaml": "^4.1.1",
    "postgres": "^3.4.5",
    "ulid": "^2.4.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.19.39",
    "bun-types": "^1.3.12",
    "typescript": "^5.9.3"
  }
}
```

- [ ] Install per the project rule (npm `--no-workspaces` is required in this directory):

```
cd apps/qw-oracle
npm install --no-workspaces
```

- [ ] Sanity check: `bun --version` resolves >= 1.3, and `bun scripts/load-knowledge/index.ts` (no args) prints the usage stub the existing CLI emits when called without a subcommand. (Existing `index.ts` uses a top-level `main().catch(...)` rather than `import.meta.main`, so swapping the runner from `tsx` to `bun` is a no-op for behavior.)

**Verification.**

```
cd apps/qw-oracle
test -f node_modules/postgres/package.json && echo "postgres installed: YES" || echo "postgres installed: NO"
test -f node_modules/tsx/package.json && echo "tsx still present: YES" || echo "tsx still present: NO"
grep -q '"postgres":' package.json && echo "postgres listed in package.json: YES" || echo "NO"
grep -q '"tsx":' package.json && echo "tsx listed in package.json: YES" || echo "NO"
```

- PASS condition: `postgres installed: YES`, `tsx still present: NO`, `postgres listed in package.json: YES`, `tsx listed in package.json: NO`.
- FAIL condition: any of those four lines reports the wrong half.

### Task 2: Add `docker-compose.dev.yml`, `.env.example`, and the test-DB init script

**Goal.** A single-container Postgres 16 + pgvector dev environment bound to `127.0.0.1:5432`, with both `qw_oracle` (dev) and `qw_oracle_test` (Bun test target per D13) created at first boot.

**Files.** `apps/qw-oracle/db/docker-compose.dev.yml`, `apps/qw-oracle/db/init/01-create-test-db.sql`, `apps/qw-oracle/.env.example`.

**Steps.**

- [ ] Create `apps/qw-oracle/db/docker-compose.dev.yml`:

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
      - ./init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U qworacle -d qw_oracle"]
      interval: 5s
      timeout: 3s
      retries: 5
volumes:
  qw-oracle-pgdata-dev:
```

The `127.0.0.1` bind keeps the dev DB off the LAN. The init-dir mount runs every `.sql` file in `db/init/` once on a fresh data volume - that is where the test DB gets created without polluting `001_init.sql`.

- [ ] Create `apps/qw-oracle/db/init/01-create-test-db.sql`:

```sql
-- Runs once on first container boot via /docker-entrypoint-initdb.d/.
-- Creates the test database used by `bun test` (per decisions.md D13).
-- The dev database `qw_oracle` is created by POSTGRES_DB env on entrypoint.
CREATE DATABASE qw_oracle_test;
```

The pgvector image extends the official `postgres:16` image; both inherit the entrypoint's init-dir scan. `CREATE EXTENSION vector` is NOT run here because the extension is per-database, and the migrator (Task 3) is the one place that owns extension setup.

- [ ] Create `apps/qw-oracle/.env.example` (operator copies to `.env` and fills real values; `.env` is already in `.gitignore`):

```
# qw-oracle environment configuration. Copy to apps/qw-oracle/.env and fill in.
# Phase 1 only needs DATABASE_URL; later phases consume the rest.

DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle

# Voyage AI (sign up at https://www.voyageai.com/). Free tier covers Arc 1.
VOYAGE_API_KEY=

# Embedding models. Voyage 4-series shares an embedding space across sizes,
# so build/query split is safe (see decisions.md D8 for the startup check).
EMBEDDING_MODEL_BUILD=voyage-4-large
EMBEDDING_MODEL_QUERY=voyage-4-lite
EMBEDDING_DIMENSION=1024

# Public-facing config (production only; placeholder values for dev).
PUBLIC_BASE_URL=http://localhost:3000
SNAPSHOT_DIR=./snapshots

# Match quality thresholds. Calibrated as a Phase 8 deploy gate; not used in Phase 1.
MATCH_QUALITY_STRONG_THRESHOLD=0.50
MATCH_QUALITY_WEAK_THRESHOLD=0.20

# Production-only: per-IP rate limit (Cloudflare also rate-limits at the edge).
RATE_LIMIT_PER_MINUTE=60
```

- [ ] Bring up the container and confirm both DBs exist:

```
cd apps/qw-oracle
npm run db:up
docker compose -f db/docker-compose.dev.yml exec postgres psql -U qworacle -d postgres \
  -c "SELECT datname FROM pg_database WHERE datname IN ('qw_oracle','qw_oracle_test') ORDER BY datname"
```

**Verification.**

```
cd apps/qw-oracle
docker ps --format '{{.Names}} {{.Status}}' | grep qw-oracle-postgres-dev
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT version();"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_test -c "SELECT 1;"
```

- PASS condition: container status reads `Up ... (healthy)`, `SELECT version()` prints `PostgreSQL 16.x`, the `qw_oracle_test` SELECT returns `1` without `database does not exist`.
- FAIL condition: container exits, no `(healthy)` after 30s, or `qw_oracle_test` is missing (init script did not fire because the volume already existed - see Recovery).

### Task 3: Hand-rolled migrator + `001_init.sql`

**Goal.** A 100-line migrator that creates a `schema_migrations(filename, applied_at, sha256)` tracking table, applies every `db/migrations/*.sql` file in lexicographic order in a single transaction each, refuses to re-apply a migration whose body hash has changed since it was first applied (catches mid-arc edits), and is idempotent on re-run. Migration `001_init.sql` installs the `vector` extension and the two cross-cutting metadata tables (`oracle_meta`, `embedding_metadata`); per-domain tables land in Phase 2+.

**Files.** `apps/qw-oracle/db/migrate.ts`, `apps/qw-oracle/db/migrate.test.ts`, `apps/qw-oracle/db/migrations/001_init.sql`.

**Steps.**

- [ ] Create `apps/qw-oracle/db/migrate.ts`:

```ts
// apps/qw-oracle/db/migrate.ts
//
// Hand-rolled migrator. SQL files in db/migrations/ run in lexicographic
// order, each in its own transaction, tracked in schema_migrations by sha256.
// Append-only by design: editing an already-applied migration is rejected.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, 'migrations');

export async function runMigrations(sql: postgres.Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      sha256      TEXT NOT NULL
    )
  `;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let applied = 0;
  for (const filename of files) {
    const path = resolve(MIGRATIONS_DIR, filename);
    const text = readFileSync(path, 'utf8');
    const sha = await sha256(text);

    const existing = await sql<{ sha256: string }[]>`
      SELECT sha256 FROM schema_migrations WHERE filename = ${filename}
    `;
    if (existing.length > 0) {
      if (existing[0]!.sha256 !== sha) {
        throw new Error(
          `Migration ${filename} was modified after it was applied. ` +
          `Migrations are append-only; create a new migration file instead of editing this one.`,
        );
      }
      continue;
    }

    console.log(`[migrate] applying ${filename}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`INSERT INTO schema_migrations(filename, sha256) VALUES (${filename}, ${sha})`;
    });
    applied += 1;
  }
  console.log(`[migrate] up-to-date (${files.length} migration(s) total, ${applied} newly applied)`);
}

export async function resetDb(sql: postgres.Sql): Promise<void> {
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`GRANT ALL ON SCHEMA public TO public`;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = postgres(url, { onnotice: () => {} });
  try {
    if (process.argv.includes('--reset')) {
      console.log('[migrate] resetting public schema');
      await resetDb(sql);
    }
    await runMigrations(sql);
  } finally {
    await sql.end();
  }
}
```

The `import.meta.main` guard is Bun-supported and used here per `decisions.md` D2. `crypto.subtle` is available under both Node 20 and Bun, so the hash helper is portable.

- [ ] Create `apps/qw-oracle/db/migrations/001_init.sql`:

```sql
-- apps/qw-oracle/db/migrations/001_init.sql
-- Foundation migration. Domain tables (entities + version arc, qw namespace,
-- assets, Layer 2, Layer 3, observability) land in 002+ migrations.

-- pgvector. HNSW indexes (Phase 2+) require the operators registered here.
CREATE EXTENSION IF NOT EXISTS vector;

-- One-row metadata describing the embedding model the corpus was built with.
-- Loader writes here at the end of every successful build pass; MCP startup
-- reads here to assert that the configured EMBEDDING_MODEL_QUERY shares
-- dimension with the build model (see decisions.md D8).
CREATE TABLE embedding_metadata (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  model_name      TEXT NOT NULL,
  model_version   TEXT NOT NULL,
  dimension       INTEGER NOT NULL,
  embedded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  rows_embedded   INTEGER NOT NULL DEFAULT 0
);

-- Cross-cutting key/value metadata, the Postgres equivalent of the SQLite
-- schema_meta table. Kept distinct from schema_migrations (which the migrator
-- owns) per decisions.md D4. Seeds with schema_version 18 to mirror the
-- live SQLite schema (apps/qw-oracle/scripts/load-knowledge/schema.ts:8).
-- Phase 2 will bump this when the entity arc lands.
CREATE TABLE oracle_meta (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO oracle_meta (key, value) VALUES ('schema_version', '18');
```

- [ ] Create `apps/qw-oracle/db/migrate.test.ts`:

```ts
// apps/qw-oracle/db/migrate.test.ts
//
// Integration test against the qw_oracle_test database (per decisions.md D13).
// Refuses to run unless DATABASE_URL is the test DB - this prevents an
// accidental `bun test` from wiping the dev DB.

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import postgres from 'postgres';
import { runMigrations, resetDb } from './migrate.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
if (!url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run migrate.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url}`,
  );
}

describe('migrator', () => {
  const sql = postgres(url, { onnotice: () => {} });

  beforeAll(async () => { await resetDb(sql); });
  afterAll(async () => { await sql.end(); });

  test('first run applies 001_init and records it in schema_migrations', async () => {
    await runMigrations(sql);
    const rows = await sql<{ filename: string }[]>`
      SELECT filename FROM schema_migrations ORDER BY applied_at
    `;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]!.filename).toBe('001_init.sql');
  });

  test('vector extension is installed', async () => {
    const rows = await sql<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    expect(rows.length).toBe(1);
  });

  test('oracle_meta seeded with schema_version', async () => {
    const rows = await sql<{ value: string }[]>`
      SELECT value FROM oracle_meta WHERE key = 'schema_version'
    `;
    expect(rows[0]!.value).toBe('18');
  });

  test('embedding_metadata table exists and accepts the singleton row', async () => {
    await sql`
      INSERT INTO embedding_metadata (id, model_name, model_version, dimension)
      VALUES (1, 'voyage-4-large', 'arc1-bootstrap', 1024)
      ON CONFLICT (id) DO NOTHING
    `;
    const rows = await sql<{ dimension: number }[]>`
      SELECT dimension FROM embedding_metadata WHERE id = 1
    `;
    expect(rows[0]!.dimension).toBe(1024);
  });

  test('re-running migrations is idempotent', async () => {
    const before = (await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM schema_migrations`)[0]!.c;
    await runMigrations(sql);
    await runMigrations(sql);
    const after = (await sql<{ c: number }[]>`SELECT count(*)::int AS c FROM schema_migrations`)[0]!.c;
    expect(after).toBe(before);
  });
});
```

- [ ] Run the test to confirm green:

```
cd apps/qw-oracle
bun test db/migrate.test.ts
```

**Verification.**

```
cd apps/qw-oracle
bun test db/migrate.test.ts
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT filename FROM schema_migrations"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT extname FROM pg_extension WHERE extname='vector'"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "SELECT key, value FROM oracle_meta"
```

- PASS condition: `bun test` reports 5 tests passing, `schema_migrations` lists `001_init.sql`, `pg_extension` query returns one row, `oracle_meta` row reads `schema_version | 18`.
- FAIL condition: any failing test, missing `vector` row, or empty `schema_migrations`.

### Task 4: Shared `postgres-js` client + connectivity test

**Goal.** A singleton `postgres-js` client at `apps/qw-oracle/shared/db.ts` that every Phase 2+ script imports. Centralises pool sizing, NOTICE suppression, and the `DATABASE_URL` fail-fast.

**Files.** `apps/qw-oracle/shared/db.ts`, `apps/qw-oracle/shared/db.test.ts`.

**Steps.**

- [ ] Create `apps/qw-oracle/shared/db.ts`:

```ts
// apps/qw-oracle/shared/db.ts
//
// Single postgres-js client for every loader/script/MCP consumer in Arc 1+.
// Imported lazily by callers; the connection pool is process-scoped.

import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set');
}

export const db = postgres(url, {
  // Quiet the NOTICE channel; loader output is already chatty enough.
  onnotice: () => {},
  // Sized for one MCP server + one loader process running concurrently.
  max: 16,
  idle_timeout: 30,
  connect_timeout: 10,
});

export async function closeDb(): Promise<void> {
  await db.end();
}
```

- [ ] Create `apps/qw-oracle/shared/db.test.ts`:

```ts
// apps/qw-oracle/shared/db.test.ts
//
// Integration test - runs against qw_oracle_test (set by the npm test script).
import { describe, expect, test, afterAll } from 'bun:test';
import { db, closeDb } from './db.ts';

const url = process.env.DATABASE_URL;
if (!url || !url.includes('qw_oracle_test')) {
  throw new Error(
    `Refusing to run shared/db.test.ts against a non-test database. ` +
    `DATABASE_URL must include "qw_oracle_test"; got: ${url ?? '<unset>'}`,
  );
}

describe('shared db client', () => {
  afterAll(async () => { await closeDb(); });

  test('connects and runs a trivial query', async () => {
    const rows = await db<{ one: number }[]>`SELECT 1::int AS one`;
    expect(rows[0]!.one).toBe(1);
  });

  test('vector extension is reachable via the shared client', async () => {
    const rows = await db<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    expect(rows.length).toBe(1);
  });
});
```

**Verification.**

```
cd apps/qw-oracle
bun test shared/db.test.ts
```

- PASS condition: both tests green.
- FAIL condition: `DATABASE_URL is not set` (the npm `test` script forgot to export the env var) or connection refused (container not up).

### Task 5: `db-up.sh` smoke-test convenience script

**Goal.** One command from `apps/qw-oracle/` that brings up the container, waits for healthy, runs migrations, and exits clean. The end-to-end smoke check for the phase.

**Files.** `apps/qw-oracle/scripts/db-up.sh`.

**Steps.**

- [ ] Create `apps/qw-oracle/scripts/db-up.sh`:

```bash
#!/usr/bin/env bash
# Phase 1 smoke-test convenience: start dev Postgres, wait for healthy, migrate.
# Idempotent - re-running on an already-up container is a no-op (besides
# applying any new migrations that happen to be on disk).
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker ps --format '{{.Names}}' | grep -q '^qw-oracle-postgres-dev$'; then
  echo "[db-up] starting Postgres..."
  docker compose -f db/docker-compose.dev.yml up -d
fi

echo "[db-up] waiting for Postgres healthcheck..."
for _ in $(seq 1 30); do
  if docker compose -f db/docker-compose.dev.yml exec -T postgres \
       pg_isready -U qworacle -d qw_oracle > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[db-up] running migrations against qw_oracle..."
DATABASE_URL="${DATABASE_URL:-postgresql://qworacle:dev@localhost:5432/qw_oracle}" bun db/migrate.ts

echo "[db-up] running migrations against qw_oracle_test..."
DATABASE_URL="postgresql://qworacle:dev@localhost:5432/qw_oracle_test" bun db/migrate.ts

echo "[db-up] ready."
```

The script migrates BOTH `qw_oracle` and `qw_oracle_test` so the test DB carries the same schema the dev DB does. Without this, `bun test` against a fresh test DB would skip the schema and the migrate.test.ts pre-flight `resetDb` would leave it bare for shared/db.test.ts.

- [ ] Make it executable:

```
chmod +x apps/qw-oracle/scripts/db-up.sh
```

- [ ] End-to-end smoke run:

```
cd apps/qw-oracle
./scripts/db-up.sh
```

**Verification.**

```
cd apps/qw-oracle
./scripts/db-up.sh
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle      -c "SELECT filename FROM schema_migrations"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_test -c "SELECT filename FROM schema_migrations"
```

- PASS condition: script exits 0, both DBs list `001_init.sql`.
- FAIL condition: non-zero exit, or either DB is missing `001_init.sql`.

## Verification (phase boundary)

Run from `apps/qw-oracle/`. Each block is YES/NO; operator eyeballs.

```
# 1. Container healthy.
docker ps --format '{{.Names}} {{.Status}}' | grep qw-oracle-postgres-dev
```
PASS condition: line ends with `(healthy)`.

```
# 2. pgvector + the two metadata tables present in the dev DB.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "\dx vector"
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle -c "\dt oracle_meta embedding_metadata schema_migrations"
```
PASS condition: `\dx` lists `vector` with a non-null version; `\dt` lists all three tables.

```
# 3. Migrator idempotency + tests.
bun test db/migrate.test.ts
bun test shared/db.test.ts
```
PASS condition: both invocations report all tests passing, exit 0.

```
# 4. Test DB carries the same schema as dev DB.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle_test -c "SELECT filename FROM schema_migrations ORDER BY applied_at"
```
PASS condition: lists `001_init.sql`.

```
# 5. F5 verification: no script entry point silently no-ops.
grep -rn "import.meta.main" apps/qw-oracle/db apps/qw-oracle/shared
```
PASS condition: every match is in a file we just created and runs under `bun` per package.json (currently only `db/migrate.ts:88`-ish).

```
# 6. Existing SQLite-backed paths still work (no regression).
bun scripts/load-knowledge/index.ts
```
PASS condition: prints the existing CLI usage stub. (No subcommand provided -> exit nonzero, but the stub must print, proving Bun can still drive the legacy loader.)

If all six PASS, Phase 2 may proceed.

## Outputs to next phase

State now true that wasn't before:

- Postgres 16 + pgvector container `qw-oracle-postgres-dev` runs on `127.0.0.1:5432`. Volume `qw-oracle-pgdata-dev` persists data across container restarts.
- Two databases exist: `qw_oracle` (dev) and `qw_oracle_test` (D13 test target). Both have `001_init.sql` applied.
- `apps/qw-oracle/db/migrate.ts` is the canonical migration runner. New migrations land at `db/migrations/NNN_*.sql` and are append-only (sha256-tracked).
- `apps/qw-oracle/shared/db.ts` is the canonical postgres-js client. Phase 2+ scripts import `db` from there.
- `bun test` is the project test runner per D13, scoped to the test DB via the `test` package.json script.
- `tsx` is no longer a dependency. All `.ts` scripts run under Bun. `import.meta.main` guards are now safe to write per D2.

Phase 2 inputs: this state, plus the Phase 2 generator (which reads `apps/qw-oracle/scripts/load-knowledge/schema.ts` and emits `db/migrations/002_*.sql` per D3).

## Open questions / deferred items

- **Question:** Pre-existing em-dash in `package.json` "description" violates D12 (ASCII output discipline).
  **Default chosen for now:** Preserved verbatim. Rationale: the description was authored before the discipline locked, and editing it widens Phase 1's blast radius beyond the migration foundation. A one-line fix can ride a later phase.
  **Who can resolve:** operator. If the call is "fix it now", it is a one-character edit to the file shipped in Task 1.

- **Question:** F16 - the runtime constants currently exported from `scripts/load-knowledge/schema.ts` (`SCHEMA_VERSION`, `HEAD_ORDINAL`, `INFO_KEY_SCOPES`, `LOG_TEMPLATE_CHANNELS`) need a non-SQLite home before `schema.ts` becomes a generator-input-only file.
  **Default chosen for now:** No relocation in Phase 1. The constants stay in `schema.ts` and continue to feed the still-running SQLite loader (`scripts/load-knowledge/index.ts:11`, `quality-grid.ts:22`, `load-version.ts:113`, `build-snapshot.ts:37`). Verified at draft time: only those four call sites consume the exports outside `schema.ts` itself.
  **Who can resolve:** Phase 2. Phase 2's generator pulls schema definitions out of `schema.ts`; that is the natural moment to relocate the runtime constants to `db/constants.ts` (or wherever Phase 2 picks) and rewrite the four call sites in one commit.

- **Question:** Initial value for `oracle_meta.schema_version`. Phase 1 seeds `'18'` to mirror the live SQLite schema version.
  **Default chosen for now:** `'18'`. This is a documented pointer for the Phase 2 drafter, not load-bearing logic - nothing in the migrator or shared client reads it.
  **Who can resolve:** Phase 2 (when entity arc lands and the value bumps to `'19'`).

- **Question:** `oracle_meta` carries an `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` column. D4 prose says "(key, value)", but the same paragraph endorses the legacy plan's `oracle_meta` shape, which included `updated_at`. Flagged ADVISORY by the verification sub-agent.
  **Default chosen for now:** Keep `updated_at`. Rationale: (1) D4 endorses the legacy shape verbatim, (2) the column is additive on a ~5-row table with zero downstream callers, (3) it gives the operator a free audit trail when poking at metadata under psql.
  **Who can resolve:** operator. If strict D4 literal compliance is preferred, drop the column and the `DEFAULT now()` clause in `001_init.sql` before approving the phase.

- **Question:** Should the Bun test runner pick a per-file env file? Currently `package.json` `test` script hard-codes the test `DATABASE_URL`.
  **Default chosen for now:** Hard-coded. Rationale: the test DB credentials are dev-defaults (`qworacle:dev`); leaking them into git is fine. A `.env.test` file would add config surface for zero benefit at this stage.
  **Who can resolve:** operator if a real CI ever runs these tests against a non-default credential.

## Recovery (if verification fails)

- **Container will not start.** `docker compose -f db/docker-compose.dev.yml logs postgres`. Common cause: a previously-running Postgres on `localhost:5432` (qw-stats?) holds the port. Stop it or re-bind the new compose service to a free port (and update `.env`, `db-up.sh`, package.json scripts).
- **`qw_oracle_test` is missing after `db:up`.** The init script only fires on a *fresh* data volume. If the volume already existed from a prior dev run that did not have the init mount, recreate the volume:

  ```
  cd apps/qw-oracle
  docker compose -f db/docker-compose.dev.yml down -v
  docker compose -f db/docker-compose.dev.yml up -d
  ```

  `-v` removes the named volume; a fresh boot then runs `01-create-test-db.sql`. Destroys any local state, but Phase 1 has not yet loaded any.
- **Migrator complains about `Migration ... was modified after it was applied`.** Means `001_init.sql` changed on disk relative to its recorded sha256. Either revert the on-disk edit, or `npm run migrate:reset` (drops and recreates the public schema; safe in Phase 1 because no domain data lives in it yet).
- **`bun test` fails with `DATABASE_URL is not set`.** Caller invoked `bun test` directly instead of via the `test` script. Use `npm run test`, or export the env var manually: `DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test`.
- **`shared/db.test.ts` fails because `oracle_meta` does not exist in the test DB.** `db-up.sh` was not run, or only migrated the dev DB. Re-run `./scripts/db-up.sh`; the script migrates both DBs explicitly.
- **Loader regression: `bun scripts/load-knowledge/index.ts` errors on a require/module mismatch.** Bun should run the existing TS code unchanged; if it does not, surface the error to the operator. Do NOT attempt to patch the loader in Phase 1 - that's Phase 2's job. As an interim, re-add `tsx` to devDependencies and revert the `load-knowledge` script to `tsx scripts/load-knowledge/index.ts` until Phase 2 ports the loader properly.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F5** (Bun runtime, `import.meta.main` works). Resolved: `tsx` is dropped; every `.ts` script (existing and new) runs under Bun. The new `db/migrate.ts` uses `import.meta.main` per D2. The legacy `scripts/load-knowledge/index.ts` does not use the guard and so was unaffected by F5; nothing regresses.
- **F16** (constants beyond schema). Acknowledged as deferred to Phase 2 with rationale and call-site evidence captured under Open questions.

No other F-numbered findings touch Phase 1.
