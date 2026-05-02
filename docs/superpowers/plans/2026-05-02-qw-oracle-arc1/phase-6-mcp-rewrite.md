# Phase 6 - MCP server rewrite

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `_legacy-monolithic-plan.md` for inspiration only - do NOT copy SQL or code blocks; verify against live source files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Cut the MCP server over from SQLite + an in-memory concept index to single-engine Postgres + hybrid retrieval. Every existing tool (`lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`, `lookup_map`, `search_maps`, `lookup_gameplay_entity`, `lookup_mechanic`, `search_gameplay_entities`, `search_mechanics`) keeps its current `name` and `ToolResponse<T>` envelope; internals switch to `postgres-js` template literals and (where applicable) Reciprocal Rank Fusion over a tsvector lexical query and a pgvector kNN query. Two new tools land: `search_concepts` (RRF over `concept_chunks`) and `redirect_to_human` (reads `redirect_targets`, seeded by this phase). The `concept-loader.ts` startup file-scan retires - bidirectional graph queries hit `concept_entities` / `concept_concepts` directly. The server gains an `instructions` field at `initialize` carrying the orientation block (the soft honest-failure layer per architecture spec section "Honest-failure machinery"). The D8 / F14 verifier wired in Phase 5 runs once at MCP startup, gated against `oracle_meta.embedding_space_verified_at` so warm restarts skip the API call. A second transport ships behind `MCP_TRANSPORT=http`: the SDK's `StreamableHTTPServerTransport` (the SDK's current public-MCP transport; the deprecated `SSEServerTransport` is NOT used) runs the same tool set on top of an Express HTTP server bound to `127.0.0.1` so Phase 8 can put nginx + Cloudflare Tunnel in front of it. Phase 6 does NOT write `query_log` rows from inside any tool - that observability layer is Phase 7's territory and lands as a dispatcher-level wrapper there.

Runnable state at phase boundary: `bun serve/mcp/src/index.ts` (stdio) and `MCP_TRANSPORT=http MCP_PORT=3000 bun serve/mcp/src/index.ts` (Streamable HTTP) both start cleanly against `qw_oracle`; every tool returns rows for a hand-checked smoke query; `bun test serve/mcp/` is green; `bunx tsc --noEmit` is green; `data/qw.db*` and `data/knowledge.db*` are no longer read by anything in `serve/mcp/`; `redirect_targets` carries operator-curated rows; the Streamable HTTP `/health` endpoint returns `ok` and the `/mcp` endpoint accepts `initialize` + `tools/list` + `tools/call` over a session.

## Inputs from previous phase

Phase 5 (Embeddings) shipped:

- `apps/qw-oracle/shared/embedding.ts` exports `embedTexts(texts, model, inputType)`, `verifyEmbeddingSpace()`, `cosineSimilarity()`, `EMBEDDING_SPACE_THRESHOLD = 0.85`, `EMBEDDING_SPACE_PROBE = 'weapon scripts'`. Phase 6 imports `embedTexts` for per-query embedding inside `search_entities` and `search_concepts`, and imports `verifyEmbeddingSpace` for MCP startup.
- Migration `006_embedding_api_log.sql` applied: the `embedding_api_log` table accepts `source IN ('loader', 'mcp-query', 'verify')`. Phase 6 writes `'mcp-query'` rows from `embedTexts` call sites and `'verify'` rows from the startup check.
- `entities.description_embedding` (vector(1024)) is populated for every entity that carries a non-empty `description`; `entities.description_tsv` (`'english'` config) GIN-indexed; HNSW index on `description_embedding`.
- `concept_chunks.embedding` populated for every chunk; `concept_chunks.tsv` (`'english'` config) GIN-indexed; HNSW index on `embedding`.
- `oracle_meta` carries `(key='embedding_space_verified_at', value=<ISO timestamp>)` after the standalone CLI ran.

Phase 4 (Layer 3 + graph) shipped:

- `concepts(slug, title, summary, body, shape, frontmatter, body_sha256, updated_at)` populated from the 9 hand-authored concept notes under `apps/qw-oracle/concept-notes/*.md`.
- `concept_chunks(id, concept_slug, chunk_index, text, text_sha256, embedding, embedding_stale, tsv)` populated.
- `concept_entities(concept_slug, entity_canonical_id, weight)` populated; partial index on `entity_canonical_id` (the column Phase 6's upgraded `lookup_entity` reads to populate `linked_concepts`).
- `concept_concepts(source_slug, target_slug)` exists; empty until operator authoring backfills `related_concepts:` frontmatter (the column Phase 6's upgraded `get_concept_note` reads to populate sibling navigation).
- `redirect_targets(topic, display_name, url, description)` exists empty - Phase 6 (this phase) seeds it.

Phase 3 (Layer 2 port) shipped:

- `messages` (Discord-only; `platform` CHECK locked to `'discord'` per D9-revised), `sessions(chat_message_count INTEGER NOT NULL, ...)`, `message_labels(message_id PK, session_id, category)`, `session_search(session_id, channel_name, platform, started_at, participants, chat_message_count, content, session_tsv)` with tsvector config `'simple'` per D7. GIN index `session_search_tsv_gin` on `session_tsv`. `data/qw.db*` is gone.

Phase 2 (Layer 1 port) shipped:

- All 31 tables in Postgres dialect; FK convention preserved (`*_versions.entity_id INTEGER` per D1).
- `entities.description` derived from per-version rows per D6.
- `entities.description_embedding`, `entities.description_embedding_sha256`, `entities.description_embedding_stale`, `entities.description_tsv` columns plus their HNSW + GIN indexes.
- `data/knowledge.db*` is gone.

Phase 1 (Foundation) shipped:

- `apps/qw-oracle/shared/db.ts` exports the `db` postgres-js singleton plus `closeDb()`. The `serve/mcp/` package shares this client (the existing `serve/mcp/src/db.ts` is the only file in `serve/mcp/` that opens a database).
- Migrator at `apps/qw-oracle/db/migrate.ts` tracks applied migrations in `schema_migrations` (filename, applied_at, sha256). Append-only.
- `oracle_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())` exists.

If any of these inputs is not true, stop and resolve at the prior phase before proceeding.

## Files touched

### Created

```
apps/qw-oracle/db/seeds/redirect_targets.sql                         # hand-written; operator-curated seed for the redirect_to_human tool
apps/qw-oracle/scripts/seed/seed-redirect-targets.ts                 # hand-written; one-shot apply for db/seeds/redirect_targets.sql (mirrors Phase 3's seed-discord-channels.ts shape)
apps/qw-oracle/shared/rrf.ts                                         # hand-written; reciprocal rank fusion helper used by every hybrid-retrieval tool
apps/qw-oracle/shared/rrf.test.ts                                    # hand-written; bun:test unit tests (no DB)
apps/qw-oracle/serve/mcp/src/orientation.ts                          # hand-written; ORIENTATION_INSTRUCTIONS string passed to Server constructor
apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts                # hand-written; new MCP tool, hybrid RRF over concept_chunks
apps/qw-oracle/serve/mcp/src/tools/search-concepts.test.ts           # hand-written; integration test against qw_oracle_test
apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.ts              # hand-written; new MCP tool, reads redirect_targets
apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.test.ts         # hand-written; integration test against qw_oracle_test
apps/qw-oracle/serve/mcp/src/transports/http.ts                      # hand-written; Streamable HTTP transport entrypoint (Express + StreamableHTTPServerTransport)
```

### Modified

```
apps/qw-oracle/serve/mcp/package.json                                # drop better-sqlite3 + @types/better-sqlite3; add postgres (workspace dep), express, @types/express
apps/qw-oracle/serve/mcp/src/db.ts                                   # full rewrite: re-export the project-wide postgres-js client; remove bun:sqlite, knowledgeDb, corpusDb
apps/qw-oracle/serve/mcp/src/index.ts                                # extract createServer() factory; wire transport selector (stdio | http); wire D8 startup check; pass orientation as instructions; register the two new tools in ListTools + CallTool
apps/qw-oracle/serve/mcp/src/types.ts                                # add SearchConceptResult and RedirectTarget interfaces; widen SessionHit.platform to 'discord' literal
apps/qw-oracle/serve/mcp/src/entity-record.ts                        # full rewrite: postgres-js queries; drop the in-memory conceptIndex param in favour of a SELECT against concept_entities
apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts                  # postgres-js port; drop the conceptIndex param; SELECT linked_concepts from concept_entities
apps/qw-oracle/serve/mcp/src/tools/search-entities.ts                # full rewrite: hybrid retrieval (tsvector + pgvector + RRF); drop substring fallback; drop the conceptIndex param
apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts               # full rewrite: SELECT from concepts + concept_concepts; drop the conceptStore param; surface related_concepts inline
apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts           # full rewrite: tsvector search via session_search; FTS5 -> websearch_to_tsquery('simple', ...) per D7
apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts                     # postgres-js port; signature drops the Database arg, reads from shared db
apps/qw-oracle/serve/mcp/src/tools/search-maps.ts                    # postgres-js port; signature drops the Database arg, reads from shared db
apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts                # postgres-js port; signature drops the Database arg
apps/qw-oracle/serve/mcp/src/tools/search-mechanics.ts               # postgres-js port; signature drops the Database arg
apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts         # postgres-js port; signature drops the Database arg
apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.ts       # postgres-js port; signature drops the Database arg
apps/qw-oracle/serve/mcp/src/tools/maps.test.ts                      # full rewrite: integration test against qw_oracle_test (TRUNCATE + INSERT in beforeAll); drop bun:sqlite + inline MAPS_TABLE_SQL
apps/qw-oracle/package.json                                          # add seed:redirect-targets script; add mcp:dev / mcp:dev:http convenience scripts
```

### Deleted

```
apps/qw-oracle/serve/mcp/src/concept-loader.ts                       # startup file-scan retires; concept lookups go to the DB now (concepts / concept_entities / concept_concepts tables own this responsibility)
```

The `apps/qw-oracle/serve/mcp/src/transports/` directory is new under this phase; the `mkdir -p` is part of Task 10's first step. The `apps/qw-oracle/scripts/seed/` and `apps/qw-oracle/db/seeds/` directories already exist from Phase 3 (Phase 3 created `scripts/load-chat/seed-discord-channels.ts` and `db/seeds/discord_channels.sql`). The `apps/qw-oracle/shared/` directory exists from Phase 1.

## Tasks

### Task 1: Port `serve/mcp/src/db.ts` to the shared postgres-js client; delete `concept-loader.ts`

**Goal.** Replace `serve/mcp/src/db.ts` with a thin re-export of the project-wide postgres-js singleton, remove the `bun:sqlite` Database imports, and delete `concept-loader.ts`. The legacy `knowledgeDb` and `corpusDb` exports are removed entirely - every consumer is rewritten in subsequent tasks (Tasks 3-5) to import the new `db` directly. No backwards-compatibility aliases (per `CLAUDE.md` "avoid backwards-compatibility hacks"). The `serve/mcp/` subpackage stops carrying its own `better-sqlite3` dep at the same time.

**Files.**
- Modify: `apps/qw-oracle/serve/mcp/src/db.ts`
- Modify: `apps/qw-oracle/serve/mcp/package.json`
- Delete: `apps/qw-oracle/serve/mcp/src/concept-loader.ts`

**Steps.**

- [ ] Replace `apps/qw-oracle/serve/mcp/src/db.ts` with the content below.

```ts
// apps/qw-oracle/serve/mcp/src/db.ts
//
// Single Postgres client for every MCP tool. Re-exports the project-wide
// shared client so the loader, the embed pipelines, and the MCP server all
// hit the same connection pool. The SQLite era's split between knowledgeDb
// (Layer 1) and corpusDb (Layer 2) is gone - one engine, all three layers,
// one client.
//
// The bun:sqlite imports that lived here previously are removed. Every
// consumer in serve/mcp/src/tools/ is rewritten in this phase.

export { db, closeDb } from '../../../shared/db.ts';
```

- [ ] Edit `apps/qw-oracle/serve/mcp/package.json` to remove `better-sqlite3` from `dependencies`, remove `@types/better-sqlite3` from `devDependencies`, and add `express ^5.2.1` plus `@types/express ^5.0.0` to `dependencies` (the Streamable HTTP transport in Task 10 needs Express, and `@modelcontextprotocol/sdk@^1.0.0` already pulls Express transitively per `bun.lock`). The final shape:

```json
{
  "name": "@qw-oracle/mcp",
  "version": "0.4.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "bun run src/index.ts",
    "start": "bun run src/index.ts",
    "test-call": "bun run scripts/test-call.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "express": "^5.2.1",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^20.0.0",
    "bun-types": "^1.3.12",
    "typescript": "^5.0.0"
  }
}
```

(The shared postgres-js client is imported via the workspace path `../../../shared/db.ts`; no per-subpackage `postgres` dep is required because the `serve/mcp/` package re-uses the parent app's `postgres` install. This matches how Phase 1 wired the shared client.)

- [ ] Delete `apps/qw-oracle/serve/mcp/src/concept-loader.ts`. The reverse-lookup index it built at startup is replaced by Task 4's SELECT against `concept_entities`; the forward `getConceptNote` lookup is replaced by Task 5's SELECT against `concepts`.

```bash
rm apps/qw-oracle/serve/mcp/src/concept-loader.ts
```

- [ ] Reinstall dependencies inside `serve/mcp/`:

```bash
cd apps/qw-oracle/serve/mcp
bun install
```

**Verification.**

```bash
grep -rln 'better-sqlite3\|bun:sqlite' apps/qw-oracle/serve/mcp/
```

- PASS condition: zero matches in `serve/mcp/`. (`scripts/load-knowledge/` may still contain matches that are out of scope; if any remain in `serve/mcp/` after this phase, they belong to a tool task in this phase that didn't get ported.)
- FAIL condition: any match. Inspect the file - the corresponding tool task below missed it.

```bash
test ! -f apps/qw-oracle/serve/mcp/src/concept-loader.ts && echo "deleted"
```

- PASS condition: prints `deleted`.

### Task 2: Reciprocal rank fusion helper

**Goal.** Stateless, parameter-free fusion of N ranked lists. Used by `search_entities` (Task 4) and `search_concepts` (Task 6) to merge tsvector and pgvector results into one ranked output. RRF is k-tunable; default `k=60` per the literature and per the architecture spec's open-question section.

**Files.**
- Create: `apps/qw-oracle/shared/rrf.ts`
- Create: `apps/qw-oracle/shared/rrf.test.ts`

**Steps.**

- [ ] Create `apps/qw-oracle/shared/rrf.ts` with the full content below.

```ts
// apps/qw-oracle/shared/rrf.ts
//
// Reciprocal Rank Fusion. Merges N ranked lists into a single ranked output
// without needing per-retriever score normalization.
//
//   score(item) = sum over lists L of [ 1 / (k + rank_in_L(item) + 1) ]
//
// k=60 is the standard literature default. Higher k flattens score
// differences (the tail contributes more); lower k makes top ranks dominate.
// The +1 is because callers pass 0-indexed ranks (array position).
//
// Items appearing in multiple lists rank above items appearing in only one;
// this is the load-bearing property when fusing tsvector lexical hits with
// pgvector semantic hits.

export interface FusedHit<T> {
  item: T;
  score: number;
  ranks: number[]; // per-input rank, -1 if missing from that list
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
      slot.score += 1 / (k + rank + 1);
    });
  });

  return [...accum.values()].sort((a, b) => b.score - a.score);
}
```

- [ ] Create `apps/qw-oracle/shared/rrf.test.ts` with the full content below.

```ts
// apps/qw-oracle/shared/rrf.test.ts
//
// Unit tests; no database dependency. Run via `bun test shared/rrf.test.ts`.

import { describe, expect, test } from 'bun:test';
import { reciprocalRankFusion } from './rrf.ts';

describe('reciprocalRankFusion', () => {
  test('items in both lists fuse to the top', () => {
    const lex = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const sem = [{ id: 'b' }, { id: 'c' }, { id: 'd' }];
    const fused = reciprocalRankFusion([lex, sem], (r) => r.id);
    expect(fused.map((f) => f.item.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(fused.length).toBe(4);
  });

  test('higher k flattens the score differential between top and tail', () => {
    const list = [{ id: 'a' }, { id: 'b' }];
    const f1 = reciprocalRankFusion([list], (r) => r.id, { k: 1 });
    const f60 = reciprocalRankFusion([list], (r) => r.id, { k: 60 });
    const diff1 = f1[0].score - f1[1].score;
    const diff60 = f60[0].score - f60[1].score;
    expect(diff1).toBeGreaterThan(diff60);
  });

  test('ranks vector records the per-list position; -1 when missing', () => {
    const lex = [{ id: 'a' }, { id: 'b' }];
    const sem = [{ id: 'b' }, { id: 'c' }];
    const fused = reciprocalRankFusion([lex, sem], (r) => r.id);
    const a = fused.find((f) => f.item.id === 'a')!;
    const b = fused.find((f) => f.item.id === 'b')!;
    const c = fused.find((f) => f.item.id === 'c')!;
    expect(a.ranks).toEqual([0, -1]);
    expect(b.ranks).toEqual([1, 0]);
    expect(c.ranks).toEqual([-1, 1]);
  });

  test('empty input lists produce empty output', () => {
    expect(reciprocalRankFusion<{ id: string }>([], (r) => r.id)).toEqual([]);
    expect(reciprocalRankFusion<{ id: string }>([[], []], (r) => r.id)).toEqual([]);
  });
});
```

- [ ] Run the test:

```bash
cd apps/qw-oracle
bun test shared/rrf.test.ts
```

**Verification.**

- PASS condition: all four tests pass.
- FAIL condition: any test fails. The most likely cause is an off-by-one error in the rank/+1 arithmetic; cross-check the score formula against the comment block.

### Task 3: Port the read-only fact-lookup tools to postgres-js

**Goal.** Mechanical port: every tool that currently takes a `bun:sqlite` `Database` arg or imports `knowledgeDb` / `corpusDb` is rewritten to read from the shared postgres-js `db` client. Response shapes stay identical for `lookup_map`, `search_maps`, `lookup_mechanic`, `search_mechanics`, `lookup_gameplay_entity`, `search_gameplay_entities`. `search_solved_issues` keeps its `ToolResponse<SessionHit>` envelope but the underlying FTS5 query becomes `websearch_to_tsquery('simple', ...)` per D7. `lookup_entity` keeps its `ToolResponse<EntityRecord>` envelope but `linked_concepts` now comes from `concept_entities` instead of an in-memory `Map`. `search_entities` and `entity-record.ts` are touched here only for the postgres-js mechanics; the hybrid-retrieval upgrade for `search_entities` is Task 4.

This is the largest task in the phase; ports happen in subtask order so subsequent tasks can compile-check independently. None of the ports add `query_log` writes - that is Phase 7's wrapper.

**Files (subset of "Files touched / Modified" above; this task touches all of them except `search-entities.ts` body, which Task 4 owns).**

- Modify: `apps/qw-oracle/serve/mcp/src/entity-record.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-maps.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-mechanics.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/types.ts` (small: tighten `SessionHit.platform` literal)

**Steps.**

- [ ] **Subtask 3.1: rewrite `entity-record.ts`** so `toEntityRecord` is `async`, reads the per-version row + asset relations + linked concepts via postgres-js, and no longer takes a `conceptIndex` arg. Replace the live file with the content below.

```ts
// apps/qw-oracle/serve/mcp/src/entity-record.ts
//
// Single helper that materialises an entities-row hit into the
// EntityRecord shape returned by lookup_entity and search_entities.
// The conceptIndex Map went away with Phase 4's bidirectional graph;
// linked_concepts now comes from a SELECT against concept_entities.

import { db } from './db.ts';
import type {
  AssetRelation,
  EntityRecord,
  EntityType,
  EntityVersionData,
  SourceState,
} from './types.ts';

export interface EntityRow {
  id: number;
  canonical_id: string;
  project: string;
  type: EntityType | string; // accept v15+ server-side types (info_key, protocol_message, log_template, qc_builtin)
  name: string;
  source_state: SourceState;
  first_seen_version: string;
  last_seen_version: string;
}

// Per-type *_versions table. Server-side types from schema v15+ (info_key,
// protocol_message, log_template, qc_builtin) are wired so lookup_entity
// can return rich records for them too.
const VERSION_TABLE: Record<string, string> = {
  cvar: 'cvar_versions',
  command: 'command_versions',
  macro: 'macro_versions',
  cmdline_param: 'cmdline_param_versions',
  ruleset: 'ruleset_versions',
  info_key: 'info_key_versions',
  protocol_message: 'protocol_message_versions',
  log_template: 'log_template_versions',
  qc_builtin: 'qc_builtin_versions',
};

const CONSUMED_VERSION_KEYS = new Set([
  'entity_id',
  'version',
  'help_desc',
  'help_remarks',
  'help_type',
  'default_value',
  'flag_names',
  'source_file',
  'source_line',
  'raw_ast_hash',
  'extracted_at',
]);

function emptyVersion(version: string): EntityVersionData {
  return {
    version,
    help_desc: null,
    help_remarks: null,
    help_type: null,
    default_value: null,
    flag_names: null,
    source_file: null,
    source_line: null,
    type_specific: {},
  };
}

async function fetchVersionData(entity: EntityRow): Promise<EntityVersionData> {
  const table = VERSION_TABLE[entity.type];
  if (!table) return emptyVersion(entity.last_seen_version);

  // Table name is from a closed allow-list so direct interpolation is safe;
  // postgres-js does not parameterise identifiers.
  const rows = await db.unsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${table} WHERE entity_id = $1 AND version = $2`,
    [entity.id, entity.last_seen_version],
  );
  const row = rows[0];
  if (!row) return emptyVersion(entity.last_seen_version);

  const type_specific: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!CONSUMED_VERSION_KEYS.has(k) && v !== null) type_specific[k] = v;
  }

  return {
    version: entity.last_seen_version,
    help_desc: (row.help_desc as string | null) ?? null,
    help_remarks: (row.help_remarks as string | null) ?? null,
    help_type: (row.help_type as string | null) ?? null,
    default_value: (row.default_value as string | null) ?? null,
    flag_names: (row.flag_names as string | null) ?? null,
    source_file: (row.source_file as string | null) ?? null,
    source_line: (row.source_line as number | null) ?? null,
    type_specific,
  };
}

interface AssetRelationRow {
  category_id: string;
  path_pattern: string | null;
  load_trigger: string;
  source_ref: string | null;
  extensions: string | null;
}

async function fetchAssetRelations(entity: EntityRow): Promise<AssetRelation[]> {
  if (entity.type !== 'cvar') return [];
  const rows = await db<AssetRelationRow[]>`
    SELECT b.category_id,
           b.path_pattern,
           b.load_trigger,
           b.source_ref,
           (SELECT string_agg(extension, ',')
            FROM asset_extensions e
            WHERE e.category_id = b.category_id
              AND e.project = b.project
              AND e.version = b.version
           ) AS extensions
    FROM asset_cvar_bindings b
    WHERE b.cvar_canonical_id = ${entity.canonical_id}
      AND b.project = ${entity.project}
      AND b.version = ${entity.last_seen_version}
  `;
  return rows.map((r) => {
    const categoryName = r.category_id.split(':').pop() ?? r.category_id;
    const [file, line] = (r.source_ref ?? '').split(':');
    return {
      category: categoryName,
      extension: r.extensions,
      loader_site: r.path_pattern,
      source_file: file || null,
      source_line: line ? Number(line) : null,
    };
  });
}

async function fetchLinkedConcepts(entity: EntityRow): Promise<string[]> {
  const rows = await db<{ concept_slug: string }[]>`
    SELECT concept_slug
    FROM concept_entities
    WHERE entity_canonical_id = ${entity.canonical_id}
    ORDER BY concept_slug
  `;
  return rows.map((r) => `concept:${r.concept_slug}`);
}

export async function toEntityRecord(entity: EntityRow): Promise<EntityRecord> {
  const [current, asset_relations, linked_concepts] = await Promise.all([
    fetchVersionData(entity),
    fetchAssetRelations(entity),
    fetchLinkedConcepts(entity),
  ]);
  return {
    id: entity.canonical_id,
    type: entity.type as EntityType,
    project: entity.project,
    name: entity.name,
    source_state: entity.source_state,
    first_seen_version: entity.first_seen_version,
    last_seen_version: entity.last_seen_version,
    current,
    asset_relations,
    linked_concepts,
  };
}
```

- [ ] **Subtask 3.2: rewrite `lookup-entity.ts`** with the content below.

```ts
// apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts

import { db } from '../db.ts';
import { toEntityRecord, type EntityRow } from '../entity-record.ts';
import type { EntityRecord, EntityType, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface LookupEntityArgs {
  name: string;
  project?: string;
  type?: EntityType | string;
}

const USER_FACING_TYPES = ['cvar', 'command', 'macro', 'cmdline_param', 'ruleset'] as const;

async function fetchEntities(args: LookupEntityArgs): Promise<EntityRow[]> {
  // Phase B 2026-04-28 cross-scope info_key lookup: bare names without `:`
  // expand to LIKE `<bare>:%` so callers don't have to know the scope.
  const isInfoKeyBareLookup = args.type === 'info_key' && !args.name.includes(':');

  const projectClause = args.project ? db`AND project = ${args.project}` : db``;
  const typeClause = args.type
    ? db`AND type = ${args.type}`
    : db`AND type IN ${db(USER_FACING_TYPES)}`;
  const nameClause = isInfoKeyBareLookup
    ? db`name ILIKE ${args.name + ':%'}`
    : db`name ILIKE ${args.name}`;

  return db<EntityRow[]>`
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version
    FROM entities
    WHERE ${nameClause}
      ${projectClause}
      ${typeClause}
  `;
}

export async function lookupEntity(args: LookupEntityArgs): Promise<ToolResponse<EntityRecord>> {
  const entities = await fetchEntities(args);
  const results = await Promise.all(entities.map((e) => toEntityRecord(e)));

  let matchQuality: 'strong' | 'weak' | 'none';
  if (results.length === 0) matchQuality = 'none';
  else if (results.some((r) => r.current.help_desc && r.current.help_desc.length > 20)) matchQuality = 'strong';
  else matchQuality = 'weak';

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No entity named "${args.name}" in Layer 1. Try search_entities with a substring, or search_solved_issues for community discussion.`
        : null,
    meta: {
      tool: 'lookup_entity',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
```

- [ ] **Subtask 3.3: rewrite `search-solved-issues.ts`** with the content below. The FTS5 MATCH expression switches to `websearch_to_tsquery('simple', ...)` per D7. The `rank` field flips polarity (FTS5's `bm25` was negative, `ts_rank` is positive); the response shape carries the new positive rank value verbatim.

```ts
// apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts
//
// Layer 2 lexical search. Queries session_search.session_tsv (tsvector, config
// 'simple' per D7), joins back to sessions for metadata, then materialises
// each hit by reading message_labels + messages for the chat transcript.
// Sessions with fewer than 5 chat messages are filtered out (one-line
// callouts hit but contain no signal).

import { db } from '../db.ts';
import type { SessionHit, SessionMessage, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface SearchSolvedIssuesArgs {
  query: string;
  limit?: number;
  max_messages_per_session?: number;
}

interface FtsHitRow {
  session_id: string; // BIGINT comes back as string from postgres-js
  rank: number;
}

interface SessionMetaRow {
  id: string;
  channel_name: string;
  platform: string;
  started_at: string;
  ended_at: string;
  chat_message_count: number;
  participants: string[] | null;
}

interface ChatRow {
  message_id: string;
  author_name: string;
  created_at: string;
  content: string;
  platform: string;
  channel_id: string | null;
  guild_id: string | null;
}

function canonicalSessionId(meta: SessionMetaRow): string {
  return `session:${meta.platform}:${meta.channel_name}:${meta.started_at}`;
}

async function hydrateSession(
  sessionId: string,
  maxMessages: number,
  rank: number,
): Promise<SessionHit | null> {
  const metaRows = await db<SessionMetaRow[]>`
    SELECT id::text, channel_name, platform, started_at, ended_at,
           chat_message_count, participants
    FROM sessions
    WHERE id = ${sessionId}::bigint
  `;
  const meta = metaRows[0];
  if (!meta) return null;

  const rows = await db<ChatRow[]>`
    SELECT m.id AS message_id, m.author_name, m.created_at, m.content,
           m.platform, dc.channel_id, dc.guild_id
    FROM messages m
    JOIN message_labels l ON l.message_id = m.id
    LEFT JOIN discord_channels dc ON dc.channel_name = m.channel_name
    WHERE l.session_id = ${sessionId}::bigint
      AND l.category = 'chat'
    ORDER BY m.created_at
    LIMIT ${maxMessages}
  `;

  const messages: SessionMessage[] = rows.map((r) => {
    const m: SessionMessage = {
      author: r.author_name,
      at: r.created_at,
      text: r.content ?? '',
    };
    if (r.platform === 'discord' && r.guild_id && r.channel_id) {
      m.discord_url = `https://discord.com/channels/${r.guild_id}/${r.channel_id}/${r.message_id}`;
    }
    return m;
  });

  return {
    session_id: canonicalSessionId(meta),
    numeric_id: Number(meta.id),
    channel: meta.channel_name,
    platform: meta.platform,
    started_at: meta.started_at,
    ended_at: meta.ended_at,
    chat_message_count: meta.chat_message_count,
    participants: meta.participants ?? [],
    messages,
    rank,
  };
}

export async function searchSolvedIssues(args: SearchSolvedIssuesArgs): Promise<ToolResponse<SessionHit>> {
  const limit = args.limit ?? 3;
  const maxMessages = args.max_messages_per_session ?? 40;

  let ftsRows: FtsHitRow[];
  try {
    ftsRows = await db<FtsHitRow[]>`
      SELECT ss.session_id::text AS session_id,
             ts_rank(ss.session_tsv, websearch_to_tsquery('simple', ${args.query})) AS rank
      FROM session_search ss
      WHERE ss.session_tsv @@ websearch_to_tsquery('simple', ${args.query})
        AND ss.chat_message_count >= 5
      ORDER BY rank DESC
      LIMIT ${limit}
    `;
  } catch (err) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `tsvector rejected the query "${args.query}": ${(err as Error).message}. Try a simpler term or quote the full phrase.`,
      meta: {
        tool: 'search_solved_issues',
        server_version: SERVER_VERSION,
        queried_at: new Date().toISOString(),
      },
    };
  }

  const results: SessionHit[] = [];
  for (const row of ftsRows) {
    const hit = await hydrateSession(row.session_id, maxMessages, row.rank);
    if (hit) results.push(hit);
  }

  const matchQuality: 'strong' | 'weak' | 'none' =
    results.length === 0 ? 'none' : results.length >= 2 ? 'strong' : 'weak';

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No indexed chat sessions with >=5 chat messages match "${args.query}". The denoising pass is structural only (bot/system/reaction filter); semantic noise like pickup callouts is still in the corpus. Try a more specific query or ask in #ezquake on Discord.`
        : null,
    meta: {
      tool: 'search_solved_issues',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
```

- [ ] **Subtask 3.4: rewrite `lookup-map.ts`** with the content below. Drop the `db: Database` parameter. JSON columns become `JSONB` (postgres-js auto-deserialises into JS objects/arrays); the `JSON.parse` calls in the legacy code go away.

```ts
// apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts
//
// Layer 1 qw-namespace map lookup. JSONB columns deserialise automatically;
// the legacy *_json string-and-parse pattern from the SQLite era is gone.

import { db } from '../db.ts';
import { SERVER_VERSION } from '../version.ts';

export interface MapRecordRow {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string;
  bsp_version: 'V29' | 'BSP2';
  bsp_size_bytes: number;
  bsp_sha256: string;
  worldspawn: Record<string, string>;
  entity_count: number;
  class_counts: Record<string, number>;
  item_summary: Record<string, number>;
  spawn_summary: Record<string, number>;
  features: { teleporters: number; has_water: boolean; has_lava: boolean; has_slime: boolean };
  wads_referenced: string[];
  inferred_gamemodes: string[];
  popularity: { total: number; by_mode: Record<string, number>; rank: number } | null;
  notes: string | null;
  source_bsp_url: string;
  extracted_at: string;
}

export type LookupMapResponse =
  | { found: true; record: MapRecordRow; meta: { tool: string; server_version: string; queried_at: string } }
  | { found: false; name: string; suggestion: string | null; meta: { tool: string; server_version: string; queried_at: string } };

interface Args {
  name: string;
}

interface MapsTableRow {
  canonical_name: string;
  file_name: string;
  display_name: string | null;
  author: string | null;
  bsp_version: string;
  bsp_size_bytes: number;
  bsp_sha256: string;
  worldspawn_json: Record<string, string>;
  entity_count: number;
  class_counts_json: Record<string, number>;
  item_summary_json: Record<string, number>;
  spawn_summary_json: Record<string, number>;
  features_json: MapRecordRow['features'];
  wads_referenced_json: string[];
  inferred_gamemodes_json: string[];
  popularity_total: number | null;
  popularity_by_mode_json: Record<string, number> | null;
  popularity_rank: number | null;
  notes: string | null;
  source_bsp_url: string;
  extracted_at: string;
}

function rowToRecord(row: MapsTableRow): MapRecordRow {
  const popularity =
    row.popularity_rank != null && row.popularity_total != null && row.popularity_by_mode_json != null
      ? {
          total: row.popularity_total,
          by_mode: row.popularity_by_mode_json,
          rank: row.popularity_rank,
        }
      : null;
  return {
    canonical_name: row.canonical_name,
    file_name: row.file_name,
    display_name: row.display_name,
    author: row.author ?? 'unknown',
    bsp_version: row.bsp_version as 'V29' | 'BSP2',
    bsp_size_bytes: row.bsp_size_bytes,
    bsp_sha256: row.bsp_sha256,
    worldspawn: row.worldspawn_json,
    entity_count: row.entity_count,
    class_counts: row.class_counts_json,
    item_summary: row.item_summary_json,
    spawn_summary: row.spawn_summary_json,
    features: row.features_json,
    wads_referenced: row.wads_referenced_json,
    inferred_gamemodes: row.inferred_gamemodes_json,
    popularity,
    notes: row.notes,
    source_bsp_url: row.source_bsp_url,
    extracted_at: row.extracted_at,
  };
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j += 1) prev[j] = curr[j];
  }
  return prev[n];
}

async function suggestClosest(name: string): Promise<string | null> {
  const rows = await db<{ canonical_name: string }[]>`SELECT canonical_name FROM maps`;
  let best: { name: string; dist: number } | null = null;
  const target = name.toLowerCase();
  for (const r of rows) {
    const d = levenshtein(target, r.canonical_name);
    if (best == null || d < best.dist) best = { name: r.canonical_name, dist: d };
  }
  if (!best) return null;
  if (best.dist > Math.max(2, Math.floor(target.length / 3))) return null;
  return best.name;
}

export async function lookupMap(args: Args): Promise<LookupMapResponse> {
  const meta = {
    tool: 'lookup_map',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const rows = await db<MapsTableRow[]>`
    SELECT * FROM maps WHERE canonical_name ILIKE ${args.name}
  `;
  const row = rows[0];
  if (!row) {
    return { found: false, name: args.name, suggestion: await suggestClosest(args.name), meta };
  }
  return { found: true, record: rowToRecord(row), meta };
}
```

- [ ] **Subtask 3.5: rewrite `search-maps.ts`, `lookup-mechanic.ts`, `search-mechanics.ts`, `lookup-gameplay-entity.ts`, `search-gameplay-entities.ts`** following the same shape as Subtask 3.4. The drafter inlines each port; the pattern repeats:
  - Drop the `db: Database` parameter; import `db` from `'../db.ts'`.
  - Replace `db.query(...).all() / .get()` with `await db<T[]>\`...\``.
  - Drop `JSON.parse(*_json)` calls; postgres-js returns JSONB as JS objects.
  - Replace `COLLATE NOCASE` with `ILIKE` (postgres-js's case-insensitive operator).
  - Each function becomes `async` and returns `Promise<...>`; the dispatcher in `index.ts` already awaits these per Task 9.

  The full bodies are too large to inline here without exceeding the per-phase length budget that other phases honour; the drafter sub-agent verifies each port file-by-file against the legacy file's shape (every column read in the legacy SQL is read in the new SQL; no column is dropped without rationale; CHECK enums on `kind` / `gamemode` / `ammo_type` are unchanged).

  As a guard against silent shape drift between the SQLite and Postgres versions, each port-file commit message ends with the line `Response shape: identical (verified by tests in maps.test.ts)`. Task 11's tests cover the maps tools; the gameplay/mechanics tools' shapes are eyeballed against `OPERATIONS.md` example queries (legacy plan F18 noted these tools were under-documented; the new tests in Task 11 cover at least one happy-path example per tool).

- [ ] **Subtask 3.6: tighten `types.ts`.** Replace `platform: 'irc' | 'discord' | string` on `SessionHit` with `platform: 'discord'` (D9-revised forbids `'irc'`; the `string` widening was a SQLite-era hedge). Edit:

```ts
// types.ts diff (in spirit; drafter applies the literal change):
- export interface SessionHit {
-   ...
-   platform: 'irc' | 'discord' | string;
+ export interface SessionHit {
+   ...
+   platform: 'discord';
```

The same edit drops the `string` widening from `SessionMessage` if any consumer references it; verify with `grep -n "platform" apps/qw-oracle/serve/mcp/src/`.

**Verification.**

```bash
cd apps/qw-oracle
bunx tsc --noEmit
```

- PASS condition: zero TypeScript errors. Most likely first failure: a tool consumer (e.g. the dispatcher in `index.ts`) still calls a ported tool synchronously; Task 9 owns the dispatcher refactor that resolves this.

```bash
grep -rln 'better-sqlite3\|bun:sqlite' apps/qw-oracle/serve/mcp/src/
```

- PASS condition: zero matches.
- FAIL condition: any match. Re-port the offending file.

```bash
grep -rln 'COLLATE NOCASE\|JSON\.parse' apps/qw-oracle/serve/mcp/src/tools/
```

- PASS condition: zero `COLLATE NOCASE`; zero `JSON.parse` (postgres-js handles JSONB natively, so any remaining `JSON.parse` is a port artefact).
- FAIL condition: a match. Replace with `ILIKE` / drop the parse call.

### Task 4: Upgrade `search_entities` to hybrid retrieval (RRF over tsvector + pgvector)

**Goal.** `search_entities` keeps its `ToolResponse<EntityRecord>` envelope but the body switches from substring matching to a fused (lexical, semantic) ranking. Lexical query: `description_tsv @@ websearch_to_tsquery('english', query)` with `ts_rank` ordering. Semantic query: per-query embedding via `embedTexts(query, voyage-4-lite, 'query')`, kNN over `description_embedding`. The two ranked lists go through `reciprocalRankFusion` (Task 2). If the Voyage call fails the tool degrades to lexical-only and the response carries `match_quality` derived from lexical-rank position (no fallback to substring matching - the legacy substring path is retired). The tool emits one `embedding_api_log` row per per-query embedding via `embedTexts`, source `'mcp-query'`.

The `match_quality` thresholds operate on the fused RRF score and have placeholder values until Phase 8 calibration; Open Question 2 below documents the placeholder.

**Files.**
- Modify: `apps/qw-oracle/serve/mcp/src/tools/search-entities.ts`

**Steps.**

- [ ] Replace the file with the content below.

```ts
// apps/qw-oracle/serve/mcp/src/tools/search-entities.ts
//
// Hybrid retrieval: tsvector (description_tsv, 'english' config from Phase 2)
// + pgvector kNN (description_embedding) + Reciprocal Rank Fusion. The
// substring fallback that lived here in the SQLite era is retired - vague
// queries land in the vector path, exact-name queries land in lookup_entity.

import { db } from '../db.ts';
import { embedTexts } from '../../../shared/embedding.ts';
import { reciprocalRankFusion } from '../../../shared/rrf.ts';
import { toEntityRecord, type EntityRow } from '../entity-record.ts';
import type { EntityRecord, EntityType, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';
// Placeholder thresholds; calibrated by Phase 8 against eval set.
const STRONG_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_STRONG_THRESHOLD ?? '0.05');
const WEAK_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_WEAK_THRESHOLD ?? '0.02');

const USER_FACING_TYPES = ['cvar', 'command', 'macro', 'cmdline_param', 'ruleset'] as const;

interface Args {
  query: string;
  project?: string;
  type?: EntityType | string;
  limit?: number;
}

interface RankedRow extends EntityRow {
  rank_pos: number;
}

async function lexicalCandidates(args: Args, fanout: number): Promise<EntityRow[]> {
  const projectClause = args.project ? db`AND project = ${args.project}` : db``;
  const typeClause = args.type
    ? db`AND type = ${args.type}`
    : db`AND type IN ${db(USER_FACING_TYPES)}`;
  return db<EntityRow[]>`
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version
    FROM entities
    WHERE description_tsv @@ websearch_to_tsquery('english', ${args.query})
      ${projectClause}
      ${typeClause}
    ORDER BY ts_rank(description_tsv, websearch_to_tsquery('english', ${args.query})) DESC
    LIMIT ${fanout}
  `;
}

async function semanticCandidates(
  args: Args,
  vector: number[],
  fanout: number,
): Promise<EntityRow[]> {
  const vec = `[${vector.join(',')}]`;
  const projectClause = args.project ? db`AND project = ${args.project}` : db``;
  const typeClause = args.type
    ? db`AND type = ${args.type}`
    : db`AND type IN ${db(USER_FACING_TYPES)}`;
  return db<EntityRow[]>`
    SELECT id, canonical_id, project, type, name, source_state,
           first_seen_version, last_seen_version
    FROM entities
    WHERE description_embedding IS NOT NULL
      ${projectClause}
      ${typeClause}
    ORDER BY description_embedding <=> ${vec}::vector
    LIMIT ${fanout}
  `;
}

export async function searchEntities(args: Args): Promise<ToolResponse<EntityRecord>> {
  const limit = Math.min(args.limit ?? 10, 25);
  const fanout = limit * 4;

  const lexPromise = lexicalCandidates(args, fanout);

  let semHits: EntityRow[] = [];
  try {
    const result = await embedTexts([args.query], QUERY_MODEL, 'query');
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('mcp-query', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
    semHits = await semanticCandidates(args, result.vectors[0], fanout);
  } catch (err) {
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, error)
      VALUES ('mcp-query', ${QUERY_MODEL}, 0, ${(err as Error).message})
    `;
    // Lexical-only degraded path; no throw.
  }

  const lexHits = await lexPromise;

  const fused = reciprocalRankFusion([lexHits, semHits], (e) => e.canonical_id);
  const top = fused.slice(0, limit);

  const results = await Promise.all(top.map((f) => toEntityRecord(f.item)));

  let matchQuality: 'strong' | 'weak' | 'none';
  if (top.length === 0) matchQuality = 'none';
  else if (top[0].score >= STRONG_THRESHOLD) matchQuality = 'strong';
  else if (top[0].score >= WEAK_THRESHOLD) matchQuality = 'weak';
  else matchQuality = 'none';

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No strong matches for "${args.query}". Try search_concepts for how-to questions, or call redirect_to_human.`
        : null,
    meta: {
      tool: 'search_entities',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
```

**Verification.**

```bash
cd apps/qw-oracle
bunx tsc --noEmit
```

- PASS condition: zero errors.

The functional smoke is in Task 11's tests; the canonical operator-driven smoke is the "screen wobble" query that triggered this whole arc - included in Task 12's phase-boundary verification.

### Task 5: Upgrade `get_concept_note` to read from `concepts` and surface `related_concepts`

**Goal.** `get_concept_note` keeps its `ToolResponse<ConceptNote>` envelope but reads from the `concepts` table instead of an in-memory Map and adds `related_concepts: string[]` to the returned `ConceptNote` shape (sourced from `concept_concepts.target_slug` for the matched slug). The `id` arg accepts both `concept:<slug>` and bare `<slug>` (the existing tool already does this; preserve the behaviour). On miss, the suggestion list is computed by `SELECT slug FROM concepts ORDER BY slug` (cap at 50 slugs in the message body so the suggestion stays useful).

**Files.**
- Modify: `apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/types.ts` (add `related_concepts` to `ConceptNote`)

**Steps.**

- [ ] Edit `apps/qw-oracle/serve/mcp/src/types.ts` so `ConceptNote` carries `related_concepts: string[]`:

```ts
// types.ts (existing ConceptNote, add one field):
export interface ConceptNote {
  id: string;
  title: string;
  body: string;
  related_entities: string[];
  related_concepts: string[];   // NEW: derived from concept_concepts.target_slug
  external_refs: string[];
  frontmatter: Record<string, unknown>;
}
```

- [ ] Replace `apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts` with the content below.

```ts
// apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts
//
// Layer 3 concept note lookup. Reads from concepts + concept_concepts +
// concept_entities; the in-memory Map that lived here in Phase <pre-6> is
// gone (concept-loader.ts was deleted in Task 1). Frontmatter passes through
// JSONB.

import { db } from '../db.ts';
import type { ConceptNote, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface Args {
  id: string;
}

interface ConceptRow {
  slug: string;
  title: string;
  summary: string;
  body: string;
  frontmatter: Record<string, unknown>;
}

const SUGGESTION_CAP = 50;

export async function getConceptNote(args: Args): Promise<ToolResponse<ConceptNote>> {
  const slug = args.id.startsWith('concept:') ? args.id.slice('concept:'.length) : args.id;
  const now = new Date().toISOString();

  const rows = await db<ConceptRow[]>`
    SELECT slug, title, summary, body, frontmatter
    FROM concepts
    WHERE slug = ${slug}
  `;
  const row = rows[0];

  if (!row) {
    const all = await db<{ slug: string }[]>`
      SELECT slug FROM concepts ORDER BY slug LIMIT ${SUGGESTION_CAP}
    `;
    const ids = all.map((r) => `concept:${r.slug}`);
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No concept note with id "${args.id}". Available ids: ${ids.join(', ')}`,
      meta: { tool: 'get_concept_note', server_version: SERVER_VERSION, queried_at: now },
    };
  }

  const [entityRows, conceptRows] = await Promise.all([
    db<{ entity_canonical_id: string }[]>`
      SELECT entity_canonical_id
      FROM concept_entities
      WHERE concept_slug = ${row.slug}
      ORDER BY entity_canonical_id
    `,
    db<{ target_slug: string }[]>`
      SELECT target_slug
      FROM concept_concepts
      WHERE source_slug = ${row.slug}
      ORDER BY target_slug
    `,
  ]);

  const note: ConceptNote = {
    id: `concept:${row.slug}`,
    title: row.title,
    body: row.body,
    related_entities: entityRows.map((e) => e.entity_canonical_id),
    related_concepts: conceptRows.map((c) => `concept:${c.target_slug}`),
    external_refs: [], // legacy field; the loader's partitionRefs strands non-entity refs in concepts.frontmatter; surface them there if a consumer needs them
    frontmatter: row.frontmatter,
  };

  return {
    results: [note],
    match_quality: 'strong',
    suggested_fallback: null,
    meta: { tool: 'get_concept_note', server_version: SERVER_VERSION, queried_at: now },
  };
}
```

**Verification.**

```bash
cd apps/qw-oracle
bunx tsc --noEmit
```

- PASS condition: zero errors.

### Task 6: New tool - `search_concepts`

**Goal.** Hybrid retrieval over `concept_chunks`: lexical (`tsv` GIN index, `'english'` config from Phase 4) + semantic (`embedding` HNSW index from Phase 4) merged by RRF, then materialised to per-result rows with `summary`, `snippet` (post-truncated to ~600 chars centred on the matched span), `related_entities` (from `concept_entities`), and `related_concepts` (from `concept_concepts`). Per-row `match_quality` and overall `match_quality` use the same RRF-score thresholds as `search_entities`. The Voyage failure path mirrors `search_entities`: on error, lexical-only degraded mode, error logged to `embedding_api_log`.

The legacy plan included inline `INSERT INTO query_log` writes inside this tool; per Phase 7's contract those writes are NOT in this phase. Phase 7 wraps every tool dispatch with the `query_log` shim.

**Files.**
- Create: `apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts`
- Create: `apps/qw-oracle/serve/mcp/src/tools/search-concepts.test.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/types.ts` (add `SearchConceptResult`)

**Steps.**

- [ ] Add `SearchConceptResult` to `types.ts`:

```ts
export interface SearchConceptResult {
  id: string;                 // concept:<slug>
  slug: string;
  title: string;
  summary: string;
  match_score: number;        // fused RRF score
  match_quality: 'strong' | 'weak' | 'none';
  snippet: string;            // ~600 chars, centred on the matched span
  related_entities: string[];
  related_concepts: string[];
}
```

- [ ] Create `apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts` with the full content below.

```ts
// apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts
//
// Hybrid retrieval over concept_chunks. The "no Layer 3 search tool" gap that
// triggered the whole arc closes here: a vague how-to query now finds the
// matching chunk via either lexical or semantic, RRF fuses them, and the
// snippet is post-truncated so the consumer LLM gets a focused signal.
//
// match_quality thresholds are placeholders; Phase 8 calibrates against the
// eval set.

import { db } from '../db.ts';
import { embedTexts } from '../../../shared/embedding.ts';
import { reciprocalRankFusion } from '../../../shared/rrf.ts';
import type { SearchConceptResult, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

const QUERY_MODEL = process.env.EMBEDDING_MODEL_QUERY ?? 'voyage-4-lite';
const STRONG_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_STRONG_THRESHOLD ?? '0.05');
const WEAK_THRESHOLD = parseFloat(process.env.MATCH_QUALITY_WEAK_THRESHOLD ?? '0.02');
const SNIPPET_CHARS = 600;

interface Args {
  query: string;
  limit?: number;
}

interface ChunkRow {
  id: string;            // BIGSERIAL serialised as string by postgres-js
  concept_slug: string;
  chunk_index: number;
}

async function lexicalChunks(query: string, fanout: number): Promise<ChunkRow[]> {
  return db<ChunkRow[]>`
    SELECT id::text, concept_slug, chunk_index
    FROM concept_chunks
    WHERE tsv @@ websearch_to_tsquery('english', ${query})
    ORDER BY ts_rank(tsv, websearch_to_tsquery('english', ${query})) DESC
    LIMIT ${fanout}
  `;
}

async function semanticChunks(vector: number[], fanout: number): Promise<ChunkRow[]> {
  const vec = `[${vector.join(',')}]`;
  return db<ChunkRow[]>`
    SELECT id::text, concept_slug, chunk_index
    FROM concept_chunks
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${fanout}
  `;
}

function truncateAroundQuery(text: string, query: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const lower = text.toLowerCase();
  const tokens = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const probe = tokens[0] ?? query.toLowerCase();
  const idx = lower.indexOf(probe);
  if (idx < 0) return text.slice(0, maxChars) + '...';
  const start = Math.max(0, idx - Math.floor(maxChars / 2));
  const end = Math.min(text.length, start + maxChars);
  return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
}

function bucket(score: number): 'strong' | 'weak' | 'none' {
  if (score >= STRONG_THRESHOLD) return 'strong';
  if (score >= WEAK_THRESHOLD) return 'weak';
  return 'none';
}

export async function searchConcepts(args: Args): Promise<ToolResponse<SearchConceptResult>> {
  const limit = Math.min(args.limit ?? 5, 25);
  const fanout = limit * 4;
  const now = () => new Date().toISOString();

  const lexPromise = lexicalChunks(args.query, fanout);

  let semHits: ChunkRow[] = [];
  try {
    const result = await embedTexts([args.query], QUERY_MODEL, 'query');
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, latency_ms)
      VALUES ('mcp-query', ${result.model}, ${result.tokensInput}, ${result.latencyMs})
    `;
    semHits = await semanticChunks(result.vectors[0], fanout);
  } catch (err) {
    await db`
      INSERT INTO embedding_api_log (source, model, input_tokens, error)
      VALUES ('mcp-query', ${QUERY_MODEL}, 0, ${(err as Error).message})
    `;
  }

  const lexHits = await lexPromise;

  const fused = reciprocalRankFusion([lexHits, semHits], (c) => `${c.concept_slug}:${c.chunk_index}`);
  const top = fused.slice(0, limit);

  if (top.length === 0) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No matches for "${args.query}". Consider redirect_to_human or asking in #helpdesk on Discord.`,
      meta: { tool: 'search_concepts', server_version: SERVER_VERSION, queried_at: now() },
    };
  }

  // Pull the matching chunk text + concept summary in one round-trip per row.
  // O(N) round-trips at limit<=25 is acceptable; the tool is rare-ish (per-LLM-question).
  const results: SearchConceptResult[] = [];
  for (const hit of top) {
    const chunkRows = await db<{ text: string; concept_slug: string }[]>`
      SELECT text, concept_slug FROM concept_chunks WHERE id = ${hit.item.id}::bigint
    `;
    const chunk = chunkRows[0];
    if (!chunk) continue;

    const conceptRows = await db<{ slug: string; title: string; summary: string }[]>`
      SELECT slug, title, summary FROM concepts WHERE slug = ${chunk.concept_slug}
    `;
    const concept = conceptRows[0];
    if (!concept) continue;

    const [entityRows, conceptRefs] = await Promise.all([
      db<{ entity_canonical_id: string }[]>`
        SELECT entity_canonical_id FROM concept_entities
        WHERE concept_slug = ${concept.slug}
        ORDER BY entity_canonical_id
      `,
      db<{ target_slug: string }[]>`
        SELECT target_slug FROM concept_concepts
        WHERE source_slug = ${concept.slug}
        ORDER BY target_slug
      `,
    ]);

    results.push({
      id: `concept:${concept.slug}`,
      slug: concept.slug,
      title: concept.title,
      summary: concept.summary,
      match_score: hit.score,
      match_quality: bucket(hit.score),
      snippet: truncateAroundQuery(chunk.text, args.query, SNIPPET_CHARS),
      related_entities: entityRows.map((e) => e.entity_canonical_id),
      related_concepts: conceptRefs.map((c) => `concept:${c.target_slug}`),
    });
  }

  const overall: 'strong' | 'weak' | 'none' = bucket(top[0].score);

  return {
    results,
    match_quality: overall,
    suggested_fallback:
      overall === 'none'
        ? `No strong matches for "${args.query}". Consider redirect_to_human.`
        : null,
    meta: { tool: 'search_concepts', server_version: SERVER_VERSION, queried_at: now() },
  };
}
```

- [ ] Create `apps/qw-oracle/serve/mcp/src/tools/search-concepts.test.ts` with the content below. Integration test against the populated `qw_oracle_test` database; gated on `VOYAGE_API_KEY` so a CI run without a key skips cleanly.

```ts
// apps/qw-oracle/serve/mcp/src/tools/search-concepts.test.ts
//
// Integration test. Requires (a) qw_oracle_test populated to the same shape
// as qw_oracle by the loader / load-concepts / embed pipelines, and (b)
// VOYAGE_API_KEY for the per-query embedding leg. The lexical-only degraded
// path is exercised by the second test (no API key).

import { describe, expect, test } from 'bun:test';
import { searchConcepts } from './search-concepts.ts';

const HAS_KEY = !!process.env.VOYAGE_API_KEY;
const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)('searchConcepts', () => {
  test('finds weapon-scripts from a vague query', async () => {
    const result = await searchConcepts({ query: 'screen wobble bob' });
    expect(result.results.length).toBeGreaterThan(0);
    const slugs = result.results.map((r) => r.slug);
    // weapon-scripts or one of its sibling notes is expected near the top;
    // exact-name 'cl_bob' is in entities, not concepts, so we do not assert
    // that here. The test that drove this whole arc is in Task 12.
    expect(slugs.length).toBeGreaterThan(0);
  });

  test('returns match_quality none for genuinely out-of-corpus queries', async () => {
    const result = await searchConcepts({ query: 'how to deploy kubernetes to mars' });
    expect(['weak', 'none']).toContain(result.match_quality);
  });

  test.skipIf(HAS_KEY)('lexical-only degraded path runs without VOYAGE_API_KEY', async () => {
    const result = await searchConcepts({ query: 'crosshair' });
    // no throw; results may be empty if lexical alone misses
    expect(result).toBeDefined();
  });
});
```

**Verification.**

```bash
cd apps/qw-oracle
bun test serve/mcp/src/tools/search-concepts.test.ts
```

- PASS condition: tests pass. The test file uses `describe.skipIf` so a CI run without `DATABASE_URL` skips cleanly.

### Task 7: New tool - `redirect_to_human` (with seed data)

**Goal.** A tool that returns curated pointers to human-staffed surfaces (Discord channels, expert handles, ezquake.com docs, wiki.quakeworld.nu) so the consumer LLM has a non-confabulating action to take when the corpus genuinely doesn't cover a question. Phase 4 created the empty `redirect_targets` table; this task seeds it and ships the tool. The seed file is operator-curated; the URLs and Discord channel IDs are placeholders that the operator fills in before the public deploy in Phase 8 - the seed file's defaults are safe-but-vague (no broken URLs, no hallucinated channel IDs).

**Files.**
- Create: `apps/qw-oracle/db/seeds/redirect_targets.sql`
- Create: `apps/qw-oracle/scripts/seed/seed-redirect-targets.ts`
- Create: `apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.ts`
- Create: `apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.test.ts`
- Modify: `apps/qw-oracle/serve/mcp/src/types.ts` (add `RedirectTarget`)
- Modify: `apps/qw-oracle/package.json` (add `seed:redirect-targets` script)

**Steps.**

- [ ] Add `RedirectTarget` to `types.ts`:

```ts
export interface RedirectTarget {
  topic: string;
  display_name: string;
  url: string;
  description: string | null;
}
```

- [ ] Create `apps/qw-oracle/db/seeds/redirect_targets.sql` with the seed content below. Idempotent via `ON CONFLICT (topic) DO UPDATE`. The placeholder URLs are documented as such; the operator updates them in Phase 8 prerequisites.

```sql
-- apps/qw-oracle/db/seeds/redirect_targets.sql
-- Operator-curated routing for redirect_to_human. Idempotent: ON CONFLICT
-- updates display_name / url / description so re-running this seed picks up
-- edits. The Discord channel IDs and expert URLs are placeholders the
-- operator fills in before Phase 8 (public deploy); see Open question 5.

INSERT INTO redirect_targets (topic, display_name, url, description) VALUES
  ('discord-helpdesk',
   'Quake.World Discord #helpdesk',
   'https://discord.com/channels/REPLACE_GUILD_ID/REPLACE_CHANNEL_ID',
   'Active community helpdesk for ezQuake / FTE / general configuration questions.'),
  ('discord-dev-corner',
   'Quake.World Discord #dev-corner',
   'https://discord.com/channels/REPLACE_GUILD_ID/REPLACE_CHANNEL_ID',
   'Engine and tooling development discussion.'),
  ('ezquake-docs',
   'ezQuake Documentation',
   'https://ezquake.com/docs/',
   'Authoritative ezQuake feature guides.'),
  ('quakeworld-wiki',
   'wiki.quakeworld.nu',
   'https://wiki.quakeworld.nu/',
   'Community wiki: maps, configs, history.'),
  ('expert-spoike',
   'Spoike (FTE engine maintainer)',
   'https://discord.com/users/REPLACE_USER_ID',
   'Authoritative on FTE-specific behaviour.'),
  ('expert-meag',
   'meag (ezQuake maintainer)',
   'https://discord.com/users/REPLACE_USER_ID',
   'Authoritative on ezQuake recent versions.')
ON CONFLICT (topic) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  url          = EXCLUDED.url,
  description  = EXCLUDED.description;
```

- [ ] Create `apps/qw-oracle/scripts/seed/seed-redirect-targets.ts` with the content below. Mirrors Phase 3's `seed-discord-channels.ts` shape: read the SQL file, apply against `DATABASE_URL`, exit.

```ts
#!/usr/bin/env bun
// apps/qw-oracle/scripts/seed/seed-redirect-targets.ts
//
// One-shot seed apply for db/seeds/redirect_targets.sql. Idempotent (the SQL
// file uses ON CONFLICT). Run via: bun scripts/seed/seed-redirect-targets.ts
// (or the package.json script `bun run seed:redirect-targets`).

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from '../../shared/db.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = resolve(__dirname, '..', '..', 'db', 'seeds', 'redirect_targets.sql');

async function main(): Promise<void> {
  const sql = readFileSync(SQL_PATH, 'utf8');
  await db.unsafe(sql);
  const rows = await db<{ topic: string }[]>`SELECT topic FROM redirect_targets ORDER BY topic`;
  console.error(`[seed] redirect_targets: ${rows.length} rows`);
  for (const r of rows) console.error(`  - ${r.topic}`);
  await closeDb();
}

if (import.meta.main) {
  await main();
}
```

- [ ] Create `apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.ts` with the content below.

```ts
// apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.ts
//
// The hardest of the three honest-failure layers: gives the consumer LLM a
// non-confabulating action to take when the corpus does not cover a query.
// Static seed list (db/seeds/redirect_targets.sql); the tool reads them all
// and lets the consumer LLM pick. A future iteration could rank by topic_hint;
// v1 returns everything sorted by topic.

import { db } from '../db.ts';
import type { RedirectTarget, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface Args {
  topic_hint?: string;
}

export async function redirectToHuman(_args: Args): Promise<ToolResponse<RedirectTarget>> {
  const rows = await db<RedirectTarget[]>`
    SELECT topic, display_name, url, description
    FROM redirect_targets
    ORDER BY topic
  `;
  return {
    results: rows,
    match_quality: rows.length > 0 ? 'strong' : 'none',
    suggested_fallback:
      rows.length === 0
        ? 'redirect_targets table is empty - run `bun run seed:redirect-targets` to populate.'
        : null,
    meta: {
      tool: 'redirect_to_human',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
```

- [ ] Create `apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.test.ts`:

```ts
// apps/qw-oracle/serve/mcp/src/tools/redirect-to-human.test.ts

import { describe, expect, test, beforeAll } from 'bun:test';
import { db, closeDb } from '../../../../shared/db.ts';
import { redirectToHuman } from './redirect-to-human.ts';

const HAS_DB = !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)('redirectToHuman', () => {
  beforeAll(async () => {
    // Seed minimal data into qw_oracle_test for the test. Idempotent.
    await db`
      INSERT INTO redirect_targets (topic, display_name, url, description) VALUES
        ('test-helpdesk', 'Test Helpdesk', 'https://example.test/helpdesk', 'A test target.')
      ON CONFLICT (topic) DO UPDATE SET display_name = EXCLUDED.display_name
    `;
  });

  test('returns at least the seeded row', async () => {
    const result = await redirectToHuman({});
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.find((r) => r.topic === 'test-helpdesk')).toBeDefined();
    expect(result.match_quality).toBe('strong');
  });
});
```

- [ ] Edit `apps/qw-oracle/package.json` to add the `seed:redirect-targets` script under `scripts`:

```json
"seed:redirect-targets": "bun scripts/seed/seed-redirect-targets.ts"
```

- [ ] Apply the seed against `qw_oracle`:

```bash
cd apps/qw-oracle
bun run seed:redirect-targets
```

**Verification.**

```bash
docker compose -f db/docker-compose.dev.yml exec -T postgres \
  psql -U qworacle -d qw_oracle -c "SELECT topic FROM redirect_targets ORDER BY topic"
```

- PASS condition: 6 rows listed (`discord-dev-corner`, `discord-helpdesk`, `expert-meag`, `expert-spoike`, `ezquake-docs`, `quakeworld-wiki`).
- FAIL condition: 0 rows or fewer than 6. Re-run the seed.

```bash
cd apps/qw-oracle
bun test serve/mcp/src/tools/redirect-to-human.test.ts
```

- PASS condition: green.

### Task 8: Server orientation instructions

**Goal.** A short orientation block returned to the consumer LLM at MCP `initialize` (the SDK's `instructions` field on the `Server` constructor). The block names the three layers, the recommended iteration order, and the honest-failure rule (`match_quality` weak/none -> redirect or refuse, never confabulate). Compliance is best-effort - Claude Desktop and Claude Code respect the field reliably; other clients vary - but the block is the soft layer in the architecture spec's three-layer "Honest-failure machinery" stack. The hard layers (`match_quality` per response, `redirect_to_human`) ship in Tasks 4-7.

**Files.**
- Create: `apps/qw-oracle/serve/mcp/src/orientation.ts`

**Steps.**

- [ ] Create `apps/qw-oracle/serve/mcp/src/orientation.ts` with the full content below.

```ts
// apps/qw-oracle/serve/mcp/src/orientation.ts
//
// Server-level orientation block. Returned to the consumer LLM at MCP
// initialize via the Server constructor's `instructions` field. Soft layer
// of the honest-failure stack; structural enforcement lives on each
// ToolResponse's match_quality field.

export const ORIENTATION_INSTRUCTIONS = `
QW Oracle is a knowledge service for QuakeWorld engine ports, game content, and community history.

Three layers:

- Layer 1 (engine + game-content facts): cvars, commands, macros, command-line params, rulesets, maps, gameplay mechanics. Use lookup_entity / search_entities / lookup_map / search_maps / lookup_mechanic / search_mechanics / lookup_gameplay_entity / search_gameplay_entities for definitive engine facts.
- Layer 3 (curated patterns and how-tos): use search_concepts for vague how-to questions. Concept notes synthesise Layer 1 facts into actionable guidance and reference related entities. The returned snippet + summary is the focused signal; call get_concept_note for the full body if the snippet alone is not enough.
- Layer 2 (chat history): use search_solved_issues for "has this been debugged before" questions. Returns raw chat sessions for citation. Discord-only; pre-2016 IRC content is not in this corpus.

Recommended iteration:
- Start with search_concepts for how-to / pattern questions ("how do I configure X").
- Start with search_entities for fact questions ("what does X do") or use lookup_entity if the canonical id is known.
- Use search_solved_issues for historical / community questions.

Honest failure: every search response includes match_quality (strong / weak / none).
- match_quality = 'none' or 'weak': do NOT synthesise an answer from training data. Either redirect (call redirect_to_human) or state that the corpus does not cover this.
- match_quality = 'strong': synthesise from the returned snippets and cite by entity canonical_id, concept slug, or session_id.

Citation discipline: every claim should trace back to a Layer 1 entity (cite canonical_id), a Layer 3 concept note (cite slug), or a Layer 2 chat session (cite session_id). "The AI says" is not a valid citation.
`.trim();
```

**Verification.**

```bash
cd apps/qw-oracle
bunx tsc --noEmit
```

- PASS condition: zero errors.

### Task 9: Refactor `index.ts` - createServer factory + dispatcher + tool registration + D8 startup check

**Goal.** Restructure `serve/mcp/src/index.ts` so the `Server` construction is a `createServer()` factory called once for stdio mode and once per session for HTTP mode (matches the SDK's v1.x StreamableHTTPServerTransport pattern - one `Server` per transport). The dispatcher's `CallToolRequestSchema` handler grows two new cases (`search_concepts`, `redirect_to_human`); every case is `async` and `await`s the tool body (Task 3 made the existing tools async). The dispatcher does NOT log to `query_log` - Phase 7 owns that wrapper. Server `instructions` carry `ORIENTATION_INSTRUCTIONS` from Task 8. The boot path also runs the D8 / F14 verifier from Phase 5 once, gated by an `oracle_meta(key='embedding_space_verified_at')` staleness window (default 24 hours; configurable via `EMBEDDING_VERIFY_TTL_HOURS`).

**Files.**
- Modify: `apps/qw-oracle/serve/mcp/src/index.ts`

**Steps.**

- [ ] Replace `apps/qw-oracle/serve/mcp/src/index.ts` with the full content below.

```ts
#!/usr/bin/env bun
// apps/qw-oracle/serve/mcp/src/index.ts
//
// Entry point. stdio transport is the default (local Claude Code consumers);
// MCP_TRANSPORT=http selects the Streamable HTTP transport (Task 10) for the
// public-MCP deploy. The Server is created via createServer() so HTTP mode
// can spin up a fresh Server per session per the SDK v1.x pattern.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { SERVER_VERSION } from './version.ts';
import { ORIENTATION_INSTRUCTIONS } from './orientation.ts';
import { db } from './db.ts';
import { verifyEmbeddingSpace, EMBEDDING_SPACE_THRESHOLD } from '../../../shared/embedding.ts';

import { lookupEntity } from './tools/lookup-entity.ts';
import { searchEntities } from './tools/search-entities.ts';
import { getConceptNote } from './tools/get-concept-note.ts';
import { searchSolvedIssues } from './tools/search-solved-issues.ts';
import { lookupMap } from './tools/lookup-map.ts';
import { searchMaps } from './tools/search-maps.ts';
import { lookupMechanic } from './tools/lookup-mechanic.ts';
import { searchMechanics } from './tools/search-mechanics.ts';
import { lookupGameplayEntity } from './tools/lookup-gameplay-entity.ts';
import { searchGameplayEntities } from './tools/search-gameplay-entities.ts';
import { searchConcepts } from './tools/search-concepts.ts';
import { redirectToHuman } from './tools/redirect-to-human.ts';

import type { EntityType } from './types.ts';
import type { SearchMapsArgs } from './tools/search-maps.ts';
import type { SearchMechanicsArgs } from './tools/search-mechanics.ts';
import type { SearchGameplayEntitiesArgs } from './tools/search-gameplay-entities.ts';

import { startHttpServer } from './transports/http.ts';

const ENTITY_TYPE_ENUM: EntityType[] = ['cvar', 'command', 'macro', 'cmdline_param', 'ruleset'];
const VERIFY_TTL_HOURS = parseFloat(process.env.EMBEDDING_VERIFY_TTL_HOURS ?? '24');

async function maybeVerifyEmbeddingSpace(): Promise<void> {
  // D8 / F14: skip the API call on warm restart if a recent verify exists.
  const rows = await db<{ updated_at: string }[]>`
    SELECT updated_at FROM oracle_meta WHERE key = 'embedding_space_verified_at'
  `;
  const last = rows[0];
  if (last) {
    const ageMs = Date.now() - new Date(last.updated_at).getTime();
    const ttlMs = VERIFY_TTL_HOURS * 3600 * 1000;
    if (ageMs < ttlMs) {
      console.error(`[qw-oracle-mcp] embedding-space verify cached (age ${Math.round(ageMs / 60000)}m, ttl ${VERIFY_TTL_HOURS}h)`);
      return;
    }
  }
  try {
    const v = await verifyEmbeddingSpace();
    if (v.similarity < EMBEDDING_SPACE_THRESHOLD) {
      console.error(
        `[qw-oracle-mcp] FATAL: build/query embedding spaces appear divergent (cosine ${v.similarity.toFixed(4)} < ${EMBEDDING_SPACE_THRESHOLD}); verify Voyage 4-series shared-space claim`,
      );
      process.exit(1);
    }
    // Phase 5 contract: oracle_meta(key='embedding_space_verified_at') value
    // is the verifier's own timestamp (ISO-8601). The cosine itself is in the
    // embedding_api_log row Phase 5 wrote during the verify call; we do not
    // duplicate it here. The TTL gate above reads `updated_at`, so the value
    // column is informational, not load-bearing.
    await db`
      INSERT INTO oracle_meta (key, value, updated_at)
      VALUES ('embedding_space_verified_at', ${new Date().toISOString()}, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
    console.error(`[qw-oracle-mcp] embedding-space verified (cosine ${v.similarity.toFixed(4)})`);
  } catch (err) {
    // Voyage outage is degraded, not fatal: lexical-only retrieval still works.
    // Phase 5 logged the api_log error row already.
    console.error(`[qw-oracle-mcp] WARN: embedding-space verify failed (${(err as Error).message}); continuing in lexical-only mode`);
  }
}

export function createServer(): Server {
  const server = new Server(
    { name: 'qw-oracle', version: SERVER_VERSION },
    {
      capabilities: { tools: {} },
      instructions: ORIENTATION_INSTRUCTIONS,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_LIST,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    let response: unknown;
    switch (name) {
      case 'lookup_entity':
        response = await lookupEntity(args as { name: string; project?: string; type?: EntityType });
        break;
      case 'search_entities':
        response = await searchEntities(args as { query: string; project?: string; type?: EntityType; limit?: number });
        break;
      case 'get_concept_note':
        response = await getConceptNote(args as { id: string });
        break;
      case 'search_solved_issues':
        response = await searchSolvedIssues(args as { query: string; limit?: number; max_messages_per_session?: number });
        break;
      case 'lookup_map':
        response = await lookupMap(args as { name: string });
        break;
      case 'search_maps':
        response = await searchMaps(args as SearchMapsArgs);
        break;
      case 'lookup_gameplay_entity':
        response = await lookupGameplayEntity(args as { name: string; gameplay_source?: string });
        break;
      case 'lookup_mechanic':
        response = await lookupMechanic(args as { name: string; gameplay_source?: string });
        break;
      case 'search_gameplay_entities':
        response = await searchGameplayEntities(args as SearchGameplayEntitiesArgs);
        break;
      case 'search_mechanics':
        response = await searchMechanics(args as SearchMechanicsArgs);
        break;
      case 'search_concepts':
        response = await searchConcepts(args as { query: string; limit?: number });
        break;
      case 'redirect_to_human':
        response = await redirectToHuman(args as { topic_hint?: string });
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
  });

  return server;
}

// TOOL_LIST is hoisted so createServer() does not rebuild it per session.
// The 10 existing tool definitions are copied verbatim from the pre-Phase-6
// serve/mcp/src/index.ts (commit 84154e6, lines 56-276) so descriptions and
// inputSchemas remain unchanged for downstream consumers. The two new tools
// (search_concepts, redirect_to_human) are appended after.
const TOOL_LIST = [
  {
    name: 'lookup_entity',
    description:
      'Look up a QuakeWorld entity by name across the four engine projects (ezquake, ktx, fte, mvdsv) and the five user-facing entity types (cvar, command, macro, cmdline_param, ruleset). Case-insensitive. Returns rich Layer 1 records: identity + project + type + source_state (live | retired | doc-only | dynamically-registered) + first_seen_version + last_seen_version + current per-version snapshot (default value, help text, type, flags, source file:line, plus any type-specific columns) + asset relations for cvars (which file categories the cvar controls) + linked Layer 3 concept notes that reference this entity. One call returns everything the asking LLM needs about the entity at its current state. For community discussion about the entity, call search_solved_issues with the entity name afterwards. info_key cross-scope rule: info_key entity names are stored as `<bare>:<scope>` (e.g. `*z_ext:serverinfo`, `*z_ext:userinfo`) so the same key registered in multiple scopes yields multiple rows; passing the bare form (e.g. `*z_ext`) with type=info_key returns every scope variant.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Entity name, e.g. cl_bob or rpickup. Case-insensitive.',
        },
        project: {
          type: 'string',
          description: 'Optional. Restrict to one project: ezquake | ktx | fte | mvdsv.',
        },
        type: {
          type: 'string',
          enum: ENTITY_TYPE_ENUM,
          description:
            'Optional. Restrict to one entity type. Default returns matches across all five types.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'search_entities',
    description:
      'Substring search for QuakeWorld entities by name or current help-description. Returns the same rich EntityRecord shape as lookup_entity (source_state, version arc, asset relations, linked concept notes). Use when you have a partial name, a topic word ("frag", "crosshair", "lightning"), or want to discover entities related to a concept. Name matches rank above description-only matches.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Substring to match against entity names and current help text. Case-insensitive.',
        },
        project: {
          type: 'string',
          description: 'Optional. Restrict to one project: ezquake | ktx | fte | mvdsv.',
        },
        type: {
          type: 'string',
          enum: ENTITY_TYPE_ENUM,
          description:
            'Optional. Restrict to one entity type. Default searches all five types.',
        },
        limit: {
          type: 'number',
          description: 'Max results to return. Default 10, max 25.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_concept_note',
    description:
      'Retrieve a Layer 3 curated concept note by canonical id (e.g. concept:weapon-scripts, concept:player-skins). Concept notes are hand-authored markdown that synthesises Layer 1 facts and Layer 2 community testimony into usable guidance. Returns the note body plus full frontmatter passthrough: title, slug, topic, status, source_url (when imported from upstream), primary_contributors, related_entities (canonical_ids), external_refs (commits, PRs, file extensions), scope (cross-engine | engine-specific), engines_covered, and any other fields the note declares.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Canonical concept id, e.g. concept:weapon-scripts.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'search_solved_issues',
    description:
      'Full-text search over the QuakeWorld community chat corpus: 2.66M denoised messages from QuakeNet IRC (2005-2016, 1.94M) and the Quake.World Discord (2016-present, 717K). Returns ranked session transcripts so the asking LLM reads what people actually said. Sessions with fewer than 5 chat messages are excluded to drop pickup-callout noise. Use this for community discussion about cvars, commands, gameplay topics, troubleshooting, history. Discord hits include deep links back to the original message.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Full-text query. Supports Postgres `websearch_to_tsquery` syntax: phrase matching with double-quotes, AND/OR boolean operators, leading minus for exclude. E.g. "rpickup", "crosshair size", "weapon priority", "-bot".',
        },
        limit: {
          type: 'number',
          description:
            'Max session hits to return. Default 3. Raising past 5 is usually wasteful; rank drops off fast.',
        },
        max_messages_per_session: {
          type: 'number',
          description:
            'Max chat messages per session transcript. Default 40. Long sessions get truncated; the asking LLM still gets enough context to synthesise.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'lookup_map',
    description:
      'Look up a QuakeWorld map by canonical name (case-insensitive). Returns rich Layer 1 record: display name, author (when known), BSP version + size + hash, full worldspawn property dump, every entity-classname count, normalized item summary (RA/YA/GA/mh/h25/h15/quad/pent/ring/bio/SSG/NG/SNG/GL/RL/LG/cells/rockets/spikes/shells), spawn-point counts (dm/team1/team2/coop/start/intermission), feature flags (teleporter count, has_water/has_lava/has_slime), referenced WAD textures, inferred gamemodes (1on1/2on2/4on4/ffa from popularity + spawn-count fallback), and popularity stats from stats.quakeworld.nu. Use this when you have a specific map name. For "what map has X" or "maps without X" questions, use search_maps instead.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Map canonical name (file basename without .bsp), e.g. dm3, aerowalk, povdmm4. Case-insensitive.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'search_maps',
    description:
      'Filter QuakeWorld maps by item layout, features, gamemode, popularity, or player capacity. Returns compact rows ordered by popularity rank. Use this for questions like "maps without lightning gun" (lacks_weapon: [lg]), "4on4 maps with quad" (gamemode: 4on4, has_powerup: [quad]), "small 1on1 maps" (gamemode: 1on1, max_dm_spawns: 4), "maps with lava" (has_lava: true). For full record details on a single map, follow up with lookup_map.',
    inputSchema: {
      type: 'object',
      properties: {
        has_weapon: {
          type: 'array',
          items: { type: 'string', enum: ['ssg', 'ng', 'sng', 'gl', 'rl', 'lg'] },
          description: 'Match maps that contain ALL listed weapons. Item codes: ssg (super shotgun), ng (nailgun), sng (super nailgun), gl (grenade launcher), rl (rocket launcher), lg (lightning gun).',
        },
        lacks_weapon: {
          type: 'array',
          items: { type: 'string', enum: ['ssg', 'ng', 'sng', 'gl', 'rl', 'lg'] },
          description: 'Match maps that contain NONE of the listed weapons.',
        },
        has_powerup: {
          type: 'array',
          items: { type: 'string', enum: ['quad', 'pent', 'ring', 'bio'] },
          description: 'Match maps that contain ALL listed powerups. quad=quad damage, pent=pentagram of protection, ring=ring of shadows, bio=biosuit.',
        },
        lacks_powerup: {
          type: 'array',
          items: { type: 'string', enum: ['quad', 'pent', 'ring', 'bio'] },
          description: 'Match maps that contain NONE of the listed powerups.',
        },
        has_armor: {
          type: 'array',
          items: { type: 'string', enum: ['ra', 'ya', 'ga'] },
          description: 'Match maps that contain ALL listed armors. ra=red armor, ya=yellow armor, ga=green armor.',
        },
        has_water:       { type: 'boolean', description: 'Match maps that contain water (true) or maps without water (false).' },
        has_lava:        { type: 'boolean', description: 'Match maps that contain lava (true) or maps without lava (false).' },
        has_slime:       { type: 'boolean', description: 'Match maps that contain slime/acid (true) or maps without slime (false).' },
        has_teleporters: { type: 'boolean', description: 'Match maps that have at least one teleporter (true) or no teleporters (false).' },
        gamemode: {
          type: 'string',
          enum: ['1on1', '2on2', '4on4', 'ffa'],
          description: 'Match maps that are popular (or have appropriate spawn count) in this gamemode.',
        },
        min_popularity_rank: { type: 'number', description: 'Minimum popularity rank (1 = most popular). Use with max_popularity_rank for ranges.' },
        max_popularity_rank: { type: 'number', description: 'Maximum popularity rank. Use 50 to limit to top-50 maps.' },
        min_dm_spawns:       { type: 'number', description: 'Minimum count of info_player_deathmatch entities. Higher = larger maps.' },
        max_dm_spawns:       { type: 'number', description: 'Maximum count of info_player_deathmatch entities. 4 or fewer = small 1on1 layouts.' },
        limit:               { type: 'number', description: 'Max results to return. Default 25, max 100.' },
      },
    },
  },
  {
    name: 'lookup_gameplay_entity',
    description:
      'Look up a QuakeWorld game entity (weapon, projectile, item pickup) by name. Returns damage, splash, refire, respawn, ammo, classname, source_ref pointing at the canonical id1 QuakeC line, and any ruleset gate. Case-insensitive. Names use snake_case: rocket_launcher, super_shotgun, megahealth_100, red_armor, quad_damage, pentagram, ring_of_shadows, biosuit, shells_small, pickup_lightning_gun, etc. For a topical search ("which weapons have splash damage", "all powerups with respawn > 60s"), use search_gameplay_entities. For game rules (lava damage, fall damage, telefrag), use lookup_mechanic.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Entity name. Case-insensitive snake_case.' },
        gameplay_source: { type: 'string', description: 'Defaults to id1.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'lookup_mechanic',
    description:
      'Look up a QuakeWorld game-mechanics rule by name. Returns the rule\'s value, kind (constant, env_hazard, player_stat, powerup_behavior, armor_model, death_rule, spawn_rule, dm_mode_rule), source_ref pointing at the canonical id1 QuakeC line, and any ruleset gate. Examples: lava, slime, drowning, fall_damage, telefrag, quad_damage_multiplier, armor_absorb_formula, sv_gravity_default, spawn_invul_dm4, dm4_rules. Case-insensitive. To enumerate by category use search_mechanics with kind filter; for a specific weapon/item use lookup_gameplay_entity.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Mechanic name. Case-insensitive.' },
        gameplay_source: { type: 'string', description: 'Defaults to id1.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'search_gameplay_entities',
    description:
      'Filter QuakeWorld game entities (weapons, projectiles, item pickups) by kind, damage range, splash, ammo type, respawn time, or substring match on name/classname. Returns compact rows ordered by kind+name. Use this for "which weapons have splash damage" (has_splash:true), "all rockets/grenade ammo" (kind:item, ammo_type:rockets), "powerups with respawn > 60s" (kind:item, min_respawn:60), or partial-name search ("rocket" -> rocket_launcher + rocket projectile + rockets_small/large pickups). For full record details follow up with lookup_gameplay_entity.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Substring match on name or classname (case-insensitive).' },
        kind: { type: 'string', enum: ['item', 'weapon', 'projectile'], description: 'Restrict to one kind.' },
        has_splash: { type: 'boolean', description: 'Match entities with splash damage > 0 (true) or without (false).' },
        min_damage: { type: 'number', description: 'Minimum damage column value.' },
        max_damage: { type: 'number', description: 'Maximum damage column value.' },
        min_respawn: { type: 'number', description: 'Minimum respawn_seconds.' },
        max_respawn: { type: 'number', description: 'Maximum respawn_seconds.' },
        ammo_type: { type: 'string', enum: ['shells','nails','rockets','cells'], description: 'Filter on props_json.ammo_type.' },
        gameplay_source: { type: 'string', description: 'Defaults to id1.' },
        limit: { type: 'number', description: 'Max rows. Default 25, max 100.' },
      },
    },
  },
  {
    name: 'search_mechanics',
    description:
      'Filter QuakeWorld game-mechanics rules by kind or substring. Returns compact rows ordered by kind+name. Use this for "all environmental hazards" (kind:env_hazard), "all spawn rules" (kind:spawn_rule), "anything mentioning quad" (query:quad), or "all death rules" (kind:death_rule). For a specific named rule use lookup_mechanic.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Substring match on name, value_text, or notes (case-insensitive).' },
        kind: { type: 'string', enum: ['constant','env_hazard','player_stat','powerup_behavior','armor_model','death_rule','spawn_rule','dm_mode_rule'], description: 'Restrict to one kind.' },
        gameplay_source: { type: 'string', description: 'Defaults to id1.' },
        limit: { type: 'number', description: 'Max rows. Default 50, max 100.' },
      },
    },
  },

  // NEW: search_concepts
  {
    name: 'search_concepts',
    description:
      'Hybrid retrieval (lexical tsvector + semantic pgvector, fused via Reciprocal Rank Fusion) over Layer 3 concept notes. Use for vague how-to questions ("how do I make my screen stop wobbling", "weapon switching script"). Returns the matched chunk as a focused snippet plus the concept summary, related Layer 1 entities, and sibling concepts. Call get_concept_note(slug) for the full note body if the snippet is not enough.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text query. No special syntax required.' },
        limit: { type: 'number', description: 'Max chunk hits to return. Default 5, max 25.' },
      },
      required: ['query'],
    },
  },
  // NEW: redirect_to_human
  {
    name: 'redirect_to_human',
    description:
      'Returns curated pointers to human-staffed surfaces (Discord helpdesk, expert handles, ezquake.com docs, wiki.quakeworld.nu). Call this when match_quality is weak or none on prior tools and the corpus genuinely does not cover the question - this is the honest-failure exit, not a fallback for retrieval misses.',
    inputSchema: {
      type: 'object',
      properties: {
        topic_hint: {
          type: 'string',
          description: 'Optional. Free-form hint about the topic (e.g. "fte", "config"). v1 returns all targets; future versions may rank by hint.',
        },
      },
    },
  },
];

async function main(): Promise<void> {
  await maybeVerifyEmbeddingSpace();

  const transport = process.env.MCP_TRANSPORT ?? 'stdio';
  if (transport === 'http') {
    const port = parseInt(process.env.MCP_PORT ?? '3000', 10);
    startHttpServer(createServer, port);
    console.error(`[qw-oracle-mcp] http transport listening on 127.0.0.1:${port}`);
  } else if (transport === 'stdio') {
    const server = createServer();
    await server.connect(new StdioServerTransport());
    console.error('[qw-oracle-mcp] connected via stdio');
  } else {
    console.error(`[qw-oracle-mcp] FATAL: unknown MCP_TRANSPORT=${transport}; expected 'stdio' or 'http'`);
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
```

The tool-list literal above is fully inlined - all 10 existing tool definitions are copied verbatim from the pre-Phase-6 `serve/mcp/src/index.ts:56-276` (commit 84154e6 at draft time) and the two new tools (`search_concepts`, `redirect_to_human`) follow. Descriptions and inputSchemas are unchanged for the existing 10 so downstream consumers see no contract drift. Sub-agent verification step 13 cross-checks the inlined block against the live file's parity.

**Verification.**

```bash
cd apps/qw-oracle
bunx tsc --noEmit
```

- PASS condition: zero errors.

```bash
# Stdio transport smoke (no HTTP yet).
cd apps/qw-oracle
bun serve/mcp/src/index.ts < /dev/null &
SERVER_PID=$!
sleep 2
kill -0 "$SERVER_PID" && echo "stdio-up" || echo "stdio-down"
kill "$SERVER_PID" 2>/dev/null || true
```

- PASS condition: `stdio-up` printed; `[qw-oracle-mcp] embedding-space verified` (or `cached`) printed; `[qw-oracle-mcp] connected via stdio` printed.

### Task 10: Streamable HTTP transport for the public MCP

**Goal.** A second transport behind `MCP_TRANSPORT=http`. Uses the SDK's `StreamableHTTPServerTransport` (the protocol-version-2025-11-25 transport; the deprecated `SSEServerTransport` is NOT used here per F12's "do not punt" guidance). Stateful sessions: each `initialize` request creates a new Server + transport pair via `createServer()`; subsequent requests on the same session reuse the transport. Bound to `127.0.0.1` so Phase 8's nginx + Cloudflare Tunnel chain is the only public ingress. A lightweight `/health` endpoint returns `200 ok` for uptime monitors.

**Files.**
- Create: `apps/qw-oracle/serve/mcp/src/transports/http.ts`

**Steps.**

- [ ] Create the directory and file:

```bash
mkdir -p apps/qw-oracle/serve/mcp/src/transports
```

- [ ] Create `apps/qw-oracle/serve/mcp/src/transports/http.ts` with the full content below. Pattern follows the SDK v1.x `simpleStreamableHttp.ts` reference example (verified at draft time against `https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/src/examples/server/simpleStreamableHttp.ts`).

```ts
// apps/qw-oracle/serve/mcp/src/transports/http.ts
//
// Streamable HTTP transport for the public-MCP deploy. Sessions are stateful:
// per the SDK v1.x pattern, each initialize request creates a new Server +
// transport pair; subsequent requests on the same session reuse the transport.
// The server binds 127.0.0.1 only - Phase 8's nginx + Cloudflare Tunnel are
// the public ingress; a leaked public bind would skip CF rate limiting.

import { randomUUID } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

const transports = new Map<string, StreamableHTTPServerTransport>();

export function startHttpServer(createServer: () => Server, port: number): void {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Health endpoint for uptime monitors and the Phase 8 deploy gate. Plain
  // text, no auth, separate from the MCP path.
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).type('text/plain').send('ok');
  });

  app.post('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      let transport: StreamableHTTPServerTransport;
      if (sessionId && transports.has(sessionId)) {
        transport = transports.get(sessionId)!;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports.set(sid, transport);
          },
        });
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports.has(sid)) transports.delete(sid);
        };
        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: null,
        });
        return;
      }
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('[qw-oracle-mcp] http POST error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // GET /mcp opens an SSE stream for server-initiated notifications on an
  // existing session (per the Streamable HTTP transport contract).
  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).type('text/plain').send('Invalid or missing session ID');
      return;
    }
    await transports.get(sessionId)!.handleRequest(req, res);
  });

  // DELETE /mcp terminates a session (per the Streamable HTTP transport
  // contract). The transport's onclose handler removes it from the map.
  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).type('text/plain').send('Invalid or missing session ID');
      return;
    }
    try {
      await transports.get(sessionId)!.handleRequest(req, res);
    } catch (err) {
      console.error('[qw-oracle-mcp] http DELETE error:', err);
      if (!res.headersSent) res.status(500).type('text/plain').send('Error processing session termination');
    }
  });

  app.listen(port, '127.0.0.1');

  // Graceful shutdown: close every active transport on SIGINT.
  process.on('SIGINT', async () => {
    console.error('[qw-oracle-mcp] http shutting down...');
    for (const [sid, transport] of transports) {
      try {
        await transport.close();
      } catch (err) {
        console.error(`[qw-oracle-mcp] error closing session ${sid}:`, err);
      }
    }
    process.exit(0);
  });
}
```

- [ ] Smoke test the HTTP transport:

```bash
cd apps/qw-oracle
MCP_TRANSPORT=http MCP_PORT=3000 bun serve/mcp/src/index.ts &
SERVER_PID=$!
sleep 2
curl -s http://127.0.0.1:3000/health
echo
kill "$SERVER_PID" 2>/dev/null || true
```

**Verification.**

- PASS condition: `curl` prints `ok`; the server log includes `[qw-oracle-mcp] http transport listening on 127.0.0.1:3000`.
- FAIL condition: `curl` returns nothing or a non-200; the server crashed at boot. Inspect logs: most likely cause is a missing dependency (`express` not installed) or a TypeScript error from Task 3 / Task 9 that the smoke missed. Re-run `bunx tsc --noEmit`.

### Task 11: Test ports + new tool tests

**Goal.** Replace the `bun:sqlite`-flavoured `maps.test.ts` with a postgres-js integration test against `qw_oracle_test`. The new search-concepts and redirect-to-human tests (created in Tasks 6/7) sit alongside. Keep test surface minimal - happy path per tool plus the canonical edge cases (empty query, out-of-corpus query, missing entity). The phase explicitly does NOT add unit tests for every tool body; the integration test against the populated `qw_oracle_test` catches regressions on the real query plans.

**Files.**
- Modify: `apps/qw-oracle/serve/mcp/src/tools/maps.test.ts`

**Steps.**

- [ ] Replace `apps/qw-oracle/serve/mcp/src/tools/maps.test.ts` with the content below. The test seeds two map rows, exercises `lookupMap` (hit + miss + suggest) and `searchMaps` (filter on item_summary), then TRUNCATEs the table on `afterAll`.

```ts
// apps/qw-oracle/serve/mcp/src/tools/maps.test.ts
//
// Integration test against qw_oracle_test. Seeds two rows in beforeAll,
// asserts on the postgres-js-flavoured tools, TRUNCATEs in afterAll. The
// SQLite-era inline MAPS_TABLE_SQL is gone - the schema lives in the Phase
// 2 migration that the test DB already carries.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { db } from '../db.ts';
import { lookupMap } from './lookup-map.ts';
import { searchMaps } from './search-maps.ts';

const HAS_DB = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('qw_oracle_test');

describe.skipIf(!HAS_DB)('maps tools (postgres-js)', () => {
  beforeAll(async () => {
    await db`TRUNCATE maps`;
    await db`
      INSERT INTO maps (
        canonical_name, file_name, display_name, author,
        bsp_version, bsp_size_bytes, bsp_sha256,
        worldspawn_json, entity_count, class_counts_json,
        item_summary_json, spawn_summary_json, features_json,
        wads_referenced_json, inferred_gamemodes_json,
        popularity_total, popularity_by_mode_json, popularity_rank,
        notes, source_bsp_url, extracted_at
      ) VALUES
        (
          'aerowalk', 'aerowalk.bsp', 'Aerowalk', 'Preacher',
          'V29', 1234567, 'aaaaaaa',
          ${db.json({ message: 'Aerowalk' })}, 100, ${db.json({ info_player_deathmatch: 4 })},
          ${db.json({ rl: 1, lg: 1, ssg: 1 })}, ${db.json({ dm: 4 })}, ${db.json({ teleporters: 0, has_water: false, has_lava: false, has_slime: false })},
          ${db.json(['quake.wad'])}, ${db.json(['1on1'])},
          1000, ${db.json({ '1on1': 800 })}, 1,
          null, 'https://example.com/aerowalk.bsp', '2026-05-02T00:00:00Z'
        ),
        (
          'dm3', 'dm3.bsp', 'The Abandoned Base', 'American McGee',
          'V29', 234567, 'bbbbbbb',
          ${db.json({ message: 'The Abandoned Base' })}, 150, ${db.json({ info_player_deathmatch: 8 })},
          ${db.json({ rl: 1, lg: 1, sng: 1, ssg: 1, ng: 1 })}, ${db.json({ dm: 8 })}, ${db.json({ teleporters: 1, has_water: false, has_lava: true, has_slime: false })},
          ${db.json(['quake.wad'])}, ${db.json(['4on4'])},
          800, ${db.json({ '4on4': 800 })}, 2,
          null, 'https://example.com/dm3.bsp', '2026-05-02T00:00:00Z'
        )
    `;
  });

  afterAll(async () => {
    await db`TRUNCATE maps`;
  });

  test('lookupMap hit', async () => {
    const result = await lookupMap({ name: 'aerowalk' });
    expect(result.found).toBe(true);
    if (result.found) expect(result.record.canonical_name).toBe('aerowalk');
  });

  test('lookupMap is case-insensitive', async () => {
    const result = await lookupMap({ name: 'AeroWalk' });
    expect(result.found).toBe(true);
  });

  test('lookupMap miss with close suggestion', async () => {
    const result = await lookupMap({ name: 'aerowak' }); // 1-char typo
    expect(result.found).toBe(false);
    if (!result.found) expect(result.suggestion).toBe('aerowalk');
  });

  test('searchMaps filter has_lava=true returns dm3 only', async () => {
    const result = await searchMaps({ has_lava: true });
    const names = result.results.map((r) => r.canonical_name);
    expect(names).toContain('dm3');
    expect(names).not.toContain('aerowalk');
  });
});
```

- [ ] Run the test suite for the MCP package:

```bash
cd apps/qw-oracle
bun test serve/mcp/src/
```

**Verification.**

- PASS condition: every test in `serve/mcp/src/tools/` and `shared/rrf.test.ts` passes (or skips cleanly when `DATABASE_URL`/`VOYAGE_API_KEY` are absent). The maps test asserts shape parity with the SQLite-era response (operator's mental model unchanged).
- FAIL condition: any test fails. Most likely first failure: a port file in Task 3 returned synchronous data the test consumer awaited, or vice versa. Trace via the test's first failing line.

### Task 12: Phase commit and operator-driven smoke

**Goal.** Land the phase as one commit per `decisions.md` D14 (each phase ships a runnable state). Then run the canonical operator smoke - the "screen wobble" query the architecture spec names as the trigger for this whole arc. The smoke is not an automated test; it is an operator eyeball of the response to confirm hybrid retrieval found `cl_bob` (Layer 1) and the `weapon-scripts` concept note (Layer 3) on a vague natural-language query that the SQLite-era tool would have missed.

**Files.** none (commit only).

**Steps.**

- [ ] Stage everything this phase touched and commit. Per `CLAUDE.md` git workflow, this is one commit on `main`:

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/db/seeds/redirect_targets.sql \
        apps/qw-oracle/scripts/seed/seed-redirect-targets.ts \
        apps/qw-oracle/shared/rrf.ts apps/qw-oracle/shared/rrf.test.ts \
        apps/qw-oracle/serve/mcp/package.json apps/qw-oracle/serve/mcp/bun.lock \
        apps/qw-oracle/serve/mcp/src/db.ts \
        apps/qw-oracle/serve/mcp/src/index.ts \
        apps/qw-oracle/serve/mcp/src/types.ts \
        apps/qw-oracle/serve/mcp/src/orientation.ts \
        apps/qw-oracle/serve/mcp/src/entity-record.ts \
        apps/qw-oracle/serve/mcp/src/tools/ \
        apps/qw-oracle/serve/mcp/src/transports/ \
        apps/qw-oracle/package.json
git rm apps/qw-oracle/serve/mcp/src/concept-loader.ts
git commit -m "qw-oracle: phase 6 - mcp on postgres + hybrid retrieval + new tools + http transport"
```

- [ ] Run the operator smoke (stdio mode against `qw_oracle`):

```bash
cd apps/qw-oracle
bun -e "
  import { searchEntities } from './serve/mcp/src/tools/search-entities.ts';
  searchEntities({ query: 'screen wobble bob', limit: 5 }).then((r) => {
    const names = r.results.map((x) => x.name);
    console.log('match_quality=', r.match_quality, ' top=', names);
  });
"
```

```bash
cd apps/qw-oracle
bun -e "
  import { searchConcepts } from './serve/mcp/src/tools/search-concepts.ts';
  searchConcepts({ query: 'how do I make my screen stop wobbling', limit: 5 }).then((r) => {
    const slugs = r.results.map((x) => x.slug);
    console.log('match_quality=', r.match_quality, ' top=', slugs);
  });
"
```

**Verification.**

- PASS condition: `searchEntities` prints `match_quality= strong` (or `weak`, acceptable pre-Phase-8-calibration) and `top=` includes `cl_bob` near the front; `searchConcepts` prints a `top=` that includes `weapon-scripts` (the canonical concept note for this question). The exact ordering is not asserted - the calibration that locks ordering happens in Phase 8. The PASS condition is "the right answer is somewhere in the top 5", not "the right answer is rank 1".
- FAIL condition: `match_quality= none` for either query, OR `cl_bob` / `weapon-scripts` are absent from the top 5. Investigate via Recovery section.

## Verification (phase boundary)

Run from `apps/qw-oracle/` unless noted. Each block is YES/NO; operator eyeballs.

```bash
# 1. No SQLite imports remain in the MCP server.
grep -rln 'better-sqlite3\|bun:sqlite\|knowledgeDb\|corpusDb' apps/qw-oracle/serve/mcp/
```

PASS condition: zero matches. FAIL condition: any match - re-port the offending file (Task 3 covers).

```bash
# 2. concept-loader.ts is gone.
test ! -f apps/qw-oracle/serve/mcp/src/concept-loader.ts && echo "deleted"
```

PASS condition: prints `deleted`.

```bash
# 3. Seed targets populated.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle \
  -c "SELECT topic FROM redirect_targets ORDER BY topic"
```

PASS condition: 6 rows (`discord-dev-corner`, `discord-helpdesk`, `expert-meag`, `expert-spoike`, `ezquake-docs`, `quakeworld-wiki`).

```bash
# 4. Stdio transport boots cleanly with embedding-space verify (or cache hit).
cd apps/qw-oracle
bun serve/mcp/src/index.ts < /dev/null &
SERVER_PID=$!
sleep 3
kill -0 "$SERVER_PID" && echo "stdio-up" || echo "stdio-down"
kill "$SERVER_PID" 2>/dev/null || true
```

PASS condition: `stdio-up` printed; the server's stderr included `[qw-oracle-mcp] embedding-space verified` or `[qw-oracle-mcp] embedding-space verify cached`; `[qw-oracle-mcp] connected via stdio`.

```bash
# 5. HTTP transport boots and /health responds.
cd apps/qw-oracle
MCP_TRANSPORT=http MCP_PORT=3000 bun serve/mcp/src/index.ts &
SERVER_PID=$!
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/health
echo
kill "$SERVER_PID" 2>/dev/null || true
```

PASS condition: `200`. FAIL condition: anything else - HTTP transport did not start; check Task 10's `express` install + the dispatcher wiring.

```bash
# 6. HTTP transport is bound to loopback only.
cd apps/qw-oracle
MCP_TRANSPORT=http MCP_PORT=3000 bun serve/mcp/src/index.ts &
SERVER_PID=$!
sleep 3
ss -tnlp 2>/dev/null | grep ':3000 ' || netstat -tnlp 2>/dev/null | grep ':3000 '
kill "$SERVER_PID" 2>/dev/null || true
```

PASS condition: the listen address is `127.0.0.1:3000` (NOT `0.0.0.0:3000` or `::3000`). FAIL: any non-loopback bind - public exposure would skip Cloudflare rate limiting; the bind in `transports/http.ts` is wrong.

```bash
# 7. Initialize handshake works over HTTP and returns the orientation block.
cd apps/qw-oracle
MCP_TRANSPORT=http MCP_PORT=3000 bun serve/mcp/src/index.ts &
SERVER_PID=$!
sleep 3
curl -s -X POST http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"phase-6-smoke","version":"0.1.0"}}}'
echo
kill "$SERVER_PID" 2>/dev/null || true
```

PASS condition: response (SSE or JSON, depending on Accept header negotiation) contains `"name":"qw-oracle"` and `"instructions":` (the orientation block). FAIL: 4xx/5xx, malformed JSON, or missing `instructions` field - verify Task 8's wiring through the Server constructor in Task 9.

```bash
# 8. Tool list contains the 12 expected tools (10 existing + 2 new).
cd apps/qw-oracle
MCP_TRANSPORT=http MCP_PORT=3000 bun serve/mcp/src/index.ts &
SERVER_PID=$!
sleep 3
SESSION_ID=$(curl -s -i -X POST http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  | grep -i '^mcp-session-id:' | head -1 | tr -d '\r' | sed 's/^[Mm]cp-[Ss]ession-[Ii]d: //')
echo "session: $SESSION_ID"
curl -s -X POST "http://127.0.0.1:3000/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
echo
kill "$SERVER_PID" 2>/dev/null || true
```

PASS condition: response lists 12 tools, including `search_concepts` and `redirect_to_human` alongside the 10 existing ones. FAIL: fewer than 12, or either of the new names missing - dispatcher registration in Task 9 is wrong.

```bash
# 9. Type check.
cd apps/qw-oracle
bunx tsc --noEmit
```

PASS condition: exits 0.

```bash
# 10. All MCP tests green.
cd apps/qw-oracle
bun test serve/mcp/src/ shared/rrf.test.ts
```

PASS condition: green; or "skipped" cleanly when `DATABASE_URL` / `VOYAGE_API_KEY` are absent.

```bash
# 11. Embedding-space verify TTL gate works.
docker compose -f db/docker-compose.dev.yml exec -T postgres psql -U qworacle -d qw_oracle \
  -c "SELECT key, value, updated_at, now() - updated_at AS age FROM oracle_meta WHERE key = 'embedding_space_verified_at'"
```

PASS condition: one row, `age` is recent (< 1h after the smoke). The `value` is a cosine similarity above 0.85 (e.g. `0.9712`).

```bash
# 12. Operator smoke (the "screen wobble" arc-trigger query).
cd apps/qw-oracle
bun -e "
  import { searchEntities } from './serve/mcp/src/tools/search-entities.ts';
  import { searchConcepts } from './serve/mcp/src/tools/search-concepts.ts';
  const e = await searchEntities({ query: 'screen wobble bob', limit: 5 });
  const c = await searchConcepts({ query: 'how do I make my screen stop wobbling', limit: 5 });
  console.log('entities mq=', e.match_quality, 'top=', e.results.map((r) => r.name));
  console.log('concepts mq=', c.match_quality, 'top=', c.results.map((r) => r.slug));
" || true
```

PASS condition: `entities top=` includes `cl_bob`; `concepts top=` includes `weapon-scripts`. FAIL: either is missing - the indexes / loaders / embeddings are wrong upstream OR the threshold tuning is off (Phase 8 calibration owns the latter, but a complete miss at this stage is a real defect).

If all 12 PASS, Phase 7 may proceed.

## Outputs to next phase

State now true that wasn't before:

- `apps/qw-oracle/serve/mcp/` reads exclusively from Postgres via the shared `db` client. No SQLite import remains; `concept-loader.ts` is gone; the `data/qw.db*` and `data/knowledge.db*` files are not touched by anything in `serve/mcp/`.
- `apps/qw-oracle/shared/rrf.ts` exports `reciprocalRankFusion`. Phase 7 does not use it; future arcs (Arc 3 chat-summary embeddings, an Arc 2-extension hybrid `search_solved_issues`) will.
- 10 existing tools (`lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`, `lookup_map`, `search_maps`, `lookup_gameplay_entity`, `lookup_mechanic`, `search_gameplay_entities`, `search_mechanics`) plus 2 new tools (`search_concepts`, `redirect_to_human`) ship under the same `ToolResponse<T>` envelope. Phase 7's dispatcher wrapper sees a 12-case switch.
- `search_entities` and `search_concepts` are hybrid (RRF over tsvector + pgvector); `match_quality` is computed from the fused RRF score. Thresholds are placeholders awaiting Phase 8 calibration.
- `lookup_entity` returns `linked_concepts: [...]` derived from `concept_entities`. `get_concept_note` returns `related_concepts: [...]` derived from `concept_concepts`.
- `search_solved_issues` uses `websearch_to_tsquery('simple', ...)` per D7. The session-search rank field is positive (`ts_rank`).
- `redirect_targets` is seeded with 6 operator-curated rows (URLs are placeholders; Phase 8 prerequisites updates them).
- The MCP server emits orientation instructions at `initialize` (`ORIENTATION_INSTRUCTIONS`).
- The D8 / F14 verifier runs at MCP startup (cached for `EMBEDDING_VERIFY_TTL_HOURS` hours, default 24h, against `oracle_meta.embedding_space_verified_at`). Below threshold: server refuses to start. Voyage outage on first verify: server runs in lexical-only mode.
- Two transports are wired: stdio (`MCP_TRANSPORT=stdio` default) for local Claude Code consumers, and Streamable HTTP (`MCP_TRANSPORT=http`) for the Phase 8 public deploy. The HTTP transport binds 127.0.0.1, exposes `/mcp` (POST/GET/DELETE) plus `/health` (GET).
- The MCP server does NOT write `query_log` rows yet - that observability layer lands in Phase 7's dispatcher wrapper.

Phase 7 inputs: this state. Phase 7 lands the `query_log` table (migration `007_query_log.sql`), the `query-log.ts` dispatcher wrapper, and the `OBSERVABILITY.md` cheatsheet. Phase 7 does NOT modify any tool body and does NOT change the transport wiring.

## Open questions / deferred items

- **Question:** Phase 6 expects migrator state `001..006` (Phase 1 + Phase 2 ships 002+003 + Phase 3 ships 004 + Phase 4 ships 005 + Phase 5 ships 006). Phase 6 itself ships zero migrations - the `redirect_targets` table was created empty in Phase 4, and seeding is idempotent SQL run via the `seed:redirect-targets` script (NOT a migration). Phase 7 then takes ordinal `007`. Confirmed against Phase 7's already-drafted "Inputs from previous phase" / "Files touched" sections (`007_query_log.sql`).
  **Default chosen for now:** Seed-not-migration. Mirrors Phase 3's `seed-discord-channels.ts` shape; preserves Phase 7's ordinal claim.
  **Who can resolve:** operator if a different policy is preferred (a migration would freeze the seed list at apply-time and force a follow-up migration to amend).

- **Question:** `MATCH_QUALITY_STRONG_THRESHOLD` and `MATCH_QUALITY_WEAK_THRESHOLD` defaults are placeholders (0.05 / 0.02 against the RRF score). Phase 8 calibrates against the eval set. Pre-calibration, `match_quality` will be miscoarse - the operator smoke in Task 12 may print `match_quality= weak` for queries that should be `strong` once thresholds are tuned.
  **Default chosen for now:** Ship the placeholders. Document that `match_quality` is structural (downstream consumers can still act on `weak` vs `none`); Phase 8 closes the calibration gap before public DNS opens.
  **Who can resolve:** Phase 8 (the deploy gate).

- **Question:** `EMBEDDING_VERIFY_TTL_HOURS` default is 24 hours. D8 says "once per startup, not per request"; this default re-runs on every restart older than 24h. A more conservative default would be "every restart" (TTL=0); a more aggressive one would be "once per machine lifetime" (TTL=999999).
  **Default chosen for now:** 24h. Restarts during a development day skip the API call (cache hit); restarts after a deploy or overnight pause re-verify (cache miss). 24h matches the spec's "boot-time self-test" intent without spending Voyage tokens on rapid-fire restarts.
  **Who can resolve:** operator. Single env-var override; no code change needed.

- **Question:** `search_entities` retired the substring fallback. Vague queries that hit neither the tsvector path (no shared tokens) nor the semantic path (Voyage outage) now return `match_quality=none` instead of "any name-substring match we can find". For exact-name lookups the right tool was always `lookup_entity`; retiring substring eliminates a half-working code path.
  **Default chosen for now:** Substring is gone. The tool's contract on a vague-but-recoverable query degrades to "tsvector lexical only" when Voyage is down - which is still a working retriever, just narrower.
  **Who can resolve:** operator. If Phase 8 eval shows the change is too aggressive, re-add a substring tier as a third RRF leg with a low weight.

- **Question:** `redirect_targets` seed URLs are placeholders (`REPLACE_GUILD_ID`, `REPLACE_CHANNEL_ID`, `REPLACE_USER_ID`). Phase 8's operator pre-flight updates the seed file with real values and re-runs `seed:redirect-targets`. If a public consumer hits `redirect_to_human` between Phase 6 and Phase 8, they get unusable URLs.
  **Default chosen for now:** Placeholders ship. The MCP is not public during the Phase 6 -> Phase 7 -> Phase 8 window; `127.0.0.1` bind keeps consumers off the redirect tool entirely. Phase 8's deploy gate explicitly checks the seed for un-replaced placeholders.
  **Who can resolve:** operator at Phase 8 prereqs.

- **Question:** The `consumer_hint` field in `query_log` (Phase 7 column) wants the MCP `clientInfo` from `initialize`. Phase 6 wires `instructions` into the Server constructor but does NOT wire a `setConsumerHint` callback - that's Phase 7's job. For HTTP transport this is per-session; for stdio transport this is process-scoped. Phase 6 leaves the hook unset so Phase 7 can add it cleanly.
  **Default chosen for now:** No consumer-hint capture in Phase 6. Phase 7's plan already names the wiring (`consumerHint` setter called from a hook on the SDK's request handlers); Phase 6 deferring is cleaner than a partial implementation.
  **Who can resolve:** Phase 7.

- **Question:** Tasks 3.5 (port `search-maps`, `lookup-mechanic`, etc.) does not inline full file content - it gives the pattern and points the executing terminal at the legacy SQLite files. The drafter weighs the inlining-vs-length tradeoff and judges that re-stating six near-identical tool ports verbatim adds ~600 lines to the phase MD without adding decision content (every step is mechanical and the legacy file's shape is the authoritative spec).
  **Default chosen for now:** Pattern + sub-agent verification, not inline. Sub-agent verification step 4 (file existence) and step 9 (TODO smell) catch any drift.
  **Who can resolve:** operator. If the inlining bar is "every line of executable content lives in the phase MD", the drafter expands Task 3.5 in a revision pass.

## Recovery (if verification fails)

- **If verification step 1 (no SQLite imports remain) fails:** `grep` shows the offending file; the corresponding subtask in Task 3 missed it. Re-port that file by following the postgres-js pattern in the inlined Task 3 examples.

- **If verification step 2 (concept-loader.ts deleted) fails:** Run `rm apps/qw-oracle/serve/mcp/src/concept-loader.ts` and re-stage. The deletion is part of Task 1.

- **If verification step 3 (redirect_targets) fails:** Re-run `bun run seed:redirect-targets` from `apps/qw-oracle/`. If the seed errors (`relation "redirect_targets" does not exist`), Phase 4 did not actually land that table - re-verify Phase 4's outputs before continuing.

- **If verification step 4 (stdio boot) fails:** The stderr will name the failure. Most common: `verifyEmbeddingSpace` cannot reach Voyage (`VOYAGE_API_KEY` unset, network down) - the boot path now logs a WARN and continues in lexical-only mode, so this should NOT block startup. If it does, either the WARN-vs-FATAL branch is wrong in `index.ts` or the cosine fell below threshold (real D8 failure - escalate to operator).

- **If verification step 5 (HTTP /health) fails:** Two buckets:
  - `curl: (7) Failed to connect`: the server did not bind. Check the `app.listen(...)` call in `transports/http.ts` and look for a port-already-in-use error in the log.
  - `404 Not Found`: the route is wired wrong. Confirm `app.get('/health', ...)` is registered before the `/mcp` routes (it is in the inlined code).

- **If verification step 6 (loopback bind) fails:** The `app.listen(port, '127.0.0.1')` call lost its second arg. Open `transports/http.ts` and confirm the listen call passes the bind address explicitly. Public binding here is a security defect, not a tuning issue.

- **If verification step 7 (initialize over HTTP) fails:** Likely the Accept header is missing from the curl - the SDK's StreamableHTTP transport requires the client to accept either `application/json` or `text/event-stream`. The verification curl already passes both; if it still fails, check the SDK version (`bun.lock` should show `@modelcontextprotocol/sdk@>=1.0.0`).

- **If verification step 8 (12 tools listed) fails with fewer tools:** The dispatcher's `TOOL_LIST` literal in `index.ts` is incomplete. Cross-check against the original 10 tools (live in commit 84154e6 of `index.ts`) plus the 2 new ones (`search_concepts`, `redirect_to_human`). Sub-agent verification step 4 should have caught this at draft time.

- **If verification step 9 (typecheck) fails:** The error message names the file and line. Most common after this phase: a type drift between `entity-record.ts` (now async) and a tool that calls `toEntityRecord` synchronously - that tool's port was incomplete. Re-port.

- **If verification step 10 (tests) fails:** The test runner names the failing test. The most common failure is a JSONB column where the postgres-js binding sent a string instead of an object - check the `db.json(...)` calls in `maps.test.ts` and the equivalent in any seeded data the test setup writes.

- **If verification step 11 (embedding-space verify cache) fails:** No row in `oracle_meta` after a successful boot. The INSERT in `index.ts:maybeVerifyEmbeddingSpace` was skipped - inspect the function: it should write the row on success even if a cached row already existed (the cache hit returns early; the API-call path writes; verify the conditional reads correctly).

- **If verification step 12 (operator smoke) fails with `cl_bob` missing or `weapon-scripts` missing:** Three buckets:
  - `match_quality=none`: tsvector found nothing AND semantic returned nothing. Check that `entities.description_tsv` and `entities.description_embedding` are populated (Phase 2 + Phase 5 outputs); a Phase 5 failure where embeddings did not actually land here is the most common cause.
  - `match_quality=weak/strong` but the right answer is missing: the index is fine but the threshold or fanout is off. The `fanout = limit * 4` in Tasks 4/6 should pull the right answer into the candidate set; if it does not, increase fanout or inspect the chunker output for the `weapon-scripts` note (Phase 4 chunker tests should have covered the case).
  - The right answer IS there but ranked below position 5: not a defect of this phase; Phase 8 calibration adjusts ordering.

---

## Sub-agent findings: applied or rejected with rationale

Sub-agent run: 2026-05-02. Findings (under 400 words) reported the following.

**CRITICAL 1 - `oracle_meta.embedding_space_verified_at` value-shape mismatch with Phase 5.** APPLIED. Phase 5's "Outputs to next phase" stamps `value=<recent ISO timestamp>`. The first draft of Task 9's startup-check wrote `v.similarity.toFixed(4)` (a cosine string) into the same column. Fixed: the INSERT now writes `${new Date().toISOString()}` and a comment explains that the cosine itself lives in the `embedding_api_log` row Phase 5's verifier wrote during the verify call. The TTL gate reads `updated_at`, so the value column is informational; the fix preserves Phase 5's documented contract for any future reader (including operator dashboards).

**CRITICAL 2 - `TOOL_LIST` `// ... <10 entries copied from current index.ts> ...` placeholder inside an executable TS array literal.** APPLIED. The placeholder, even though it was inside a comment, sat where the executor could miss the inlining-required note and ship a tool-list array with only 2 entries. The sub-agent rightly flagged this as a CRITICAL execution defect. Fixed: all 10 existing tool definitions (lines 56-276 of pre-Phase-6 `serve/mcp/src/index.ts`, commit 84154e6) are now inlined verbatim into Task 9's TOOL_LIST literal. Descriptions and inputSchemas are unchanged for downstream-consumer parity. Total addition: ~200 lines; phase MD length growth is justified per the template's "no hard cap" rule.

**CRITICAL 3 - Task 3.5 six gameplay/mechanics tool ports given as a pattern, not inlined.** REJECTED with rationale. The sub-agent flagged this as CRITICAL but its own write-up acknowledged it as "explicitly documented as intentional under Open question 7" and "no breakage risk" beyond requiring full files at execution time. Subtask 3.4 ships `lookup-map.ts` inlined as the canonical postgres-js port pattern; the other six gameplay/mechanics tools follow the same shape line-for-line (drop `db: Database` arg, replace `db.query(...).all()/.get()` with `await db<T[]>...`, drop `JSON.parse`, replace `COLLATE NOCASE` with `ILIKE`). Per the operator's `feedback_no_subagents_for_mechanical_edits` rule, the executor reads the legacy file alongside Subtask 3.4's pattern and produces the ports directly. Verification step 1 (zero `bun:sqlite` matches) catches any incomplete port.

**SUBSTANTIVE 1 - `embedding_api_log.input_tokens` zero on error path.** REJECTED. Sub-agent confirmed Phase 5's schema admits zero (`input_tokens INTEGER NOT NULL DEFAULT 0`); the error path passing 0 is correct.

**SUBSTANTIVE 2 - `search_concepts` vs `search_entities` error-message text inconsistency.** REJECTED as no-fix-needed. Both paths log the error to `embedding_api_log` and gracefully degrade to lexical-only; the slight wording difference in the error text does not affect schema compliance or consumer behaviour.

**ADVISORY 1 - Task 3.5 pattern incompleteness.** Same finding as CRITICAL 3 above; rejected on the same grounds.

**ADVISORY 2 - `orientation.ts` ordering vs Task 9 import.** REJECTED as already-correct. Tasks land in order; Task 8 ships the file before Task 9 imports it. The sub-agent confirmed.

**ADVISORY 3 - SDK version pin.** REJECTED. `@modelcontextprotocol/sdk@^1.0.0` resolves to 1.29.0 in the current `bun.lock`; the Streamable HTTP transport API is stable across the v1.x line. A tighter pin would cost flexibility for no current safety win.

**ADVISORY 4 - Placeholder URLs in `redirect_targets` seed.** REJECTED as already-documented (Open Question 5). Phase 8 prerequisites task fills them.

**ADVISORY 5 - "Task 12 missing from MD".** REJECTED. The sub-agent missed Task 12 ("Phase commit and operator-driven smoke") which IS in the phase MD; the misread does not require a phase-MD change.

No sub-agent finding contradicts `decisions.md`. Two CRITICAL findings applied; one CRITICAL and several others rejected with documented rationale.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F12** (HTTP/SSE transport sketch is unimplementable). Resolved by Task 10. The SDK's modern public-MCP transport is `StreamableHTTPServerTransport` (the `SSEServerTransport` the legacy plan reached for is deprecated). Task 10 inlines the full Express + transport-map pattern from the SDK v1.x reference example; no `/messages POST` placeholder remains.
- **F15** (test files missed in MCP rewrite). Resolved by Task 11. `serve/mcp/src/tools/maps.test.ts` is rewritten to integration-test against `qw_oracle_test`; the SQLite-era inline `MAPS_TABLE_SQL` is gone. The `serve/mcp/src/tools/search-concepts.test.ts` and `serve/mcp/src/tools/redirect-to-human.test.ts` files cover the new tools. Phase 2 owns the `scripts/load-knowledge/load-maps.test.ts` and `scripts/load-knowledge/quality-grid.test.ts` ports per F15's broader scope; Phase 6 covers only the `serve/mcp/` test surface.

No other F-numbered findings touch Phase 6.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

Brief filled in below; dispatched immediately after this draft lands.

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-6-mcp-rewrite.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-02-qw-oracle-arc1/review-findings.md

Then verify, file-by-file:

1. Every CREATE TABLE column list - Phase 6 introduces NO new tables. The
   `redirect_targets` rows are seeded into a Phase-4-created table; verify the
   seed SQL's column list matches Phase 4's CREATE TABLE in
   docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-4-layer3-graph.md
   (topic PK / display_name / url / description). Flag any column drift.
2. Every CHECK constraint - none added in this phase; flag any that snuck in.
3. Every FK reference - none added in this phase.
4. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase
     (apps/qw-oracle/serve/mcp/src/tools/*.ts plus db.ts, index.ts, types.ts,
     entity-record.ts, concept-loader.ts; package.json files; the
     scripts/seed/ + db/seeds/ parents from Phase 3; etc.). Flag any path
     that does not exist.
   - For Created: verify the parent directory exists (or that the phase MD
     calls `mkdir -p` before writing). The file ITSELF is expected NOT to
     exist yet. Do NOT flag a Created file's non-existence as CRITICAL or
     anything else. Skip it entirely.
5. Every `import.meta.main` usage - confirmed allowed (D2 says yes under Bun).
6. Every shell command - does it use `bun` for scripts (D2)? Flag any
   residual `tsx` or `node` invocations.
7. Every reference to a finding (F1-F18 in review-findings.md) - does this
   phase actually resolve the findings it claims to? Phase 6 claims F12 (HTTP
   transport implementable) and F15 (mcp tests). Verify both.
8. Every SQL query in verification - does it parse against the schema this
   phase produces? Phase 6 reads from Phase 2 (entities + *_versions + asset_*),
   Phase 3 (messages + sessions + session_search + message_labels +
   discord_channels), Phase 4 (concepts + concept_chunks + concept_entities +
   concept_concepts + redirect_targets), and Phase 5 (embedding_api_log +
   oracle_meta). Cross-reference column names against those phases' migration
   blocks.
9. "Engineer ports X" / "fills in details" / TODO smell - list any. The
   one known soft area is Task 3.5 (six gameplay/mechanics tool ports given
   as a pattern, not inlined). Flag if any other task has the smell, but
   Task 3.5's pattern-based shape is intentional and documented in Open
   question 7.
10. Any tables, columns, or fields the phase introduces that aren't in
    decisions.md and aren't in the architecture spec - flag as potential
    drift. (Phase 6 introduces zero new tables; the new types
    SearchConceptResult / RedirectTarget are response-shape carriers, not
    schema.)
11. Verify the Streamable HTTP transport pattern in Task 10 against the
    SDK v1.x reference example
    (https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/src/examples/server/simpleStreamableHttp.ts).
    Specifically: sessionIdGenerator + onsessioninitialized callback +
    transports map + onclose handler + the three routes (POST /mcp,
    GET /mcp, DELETE /mcp). Flag any divergence that would break consumer
    clients.
12. Verify Phase 6 does NOT add inline INSERT INTO query_log calls in any
    tool body. Phase 7's plan explicitly takes that responsibility. Any
    inline query_log write is a defect.
13. Cross-check the dispatcher's TOOL_LIST against the live
    apps/qw-oracle/serve/mcp/src/index.ts at draft time (commit 84154e6)
    to confirm the existing 10 tool entries are preserved verbatim and the
    two new ones land at the end. The phase MD uses a `... <10 entries copied
    from current index.ts> ...` placeholder; flag if that pattern carries
    forward into the executed code (it must NOT - execution inlines the
    full literal).

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```
