# Phase 7 - Observability

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `_legacy-monolithic-plan.md` for inspiration only - do NOT copy SQL or code blocks; verify against live source files.
> 4. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

> **Orchestrator pre-execution amendment (2026-05-03).** Six fixes applied against this MD before kicking off the executor, after the orchestrator audit pass against live Phase 6 code:
>
> 1. **`query-log.ts` import path.** Plan shipped `import { db } from '../../shared/db.ts'` -- 2 levels up from `serve/mcp/src/` resolves to `serve/shared/` (does not exist). Corrected to `import { db } from './db.ts'`, matching the existing `serve/mcp/src/db.ts` re-export convention used elsewhere at this depth.
> 2. **`lookupEntity` signature drift.** Plan called `lookupEntity(args, conceptIndex)`. Phase 6 retired the in-memory concept index (`concept-loader.ts` deleted; `lookup-entity.ts:39` is single-arg). Dropped the `conceptIndex` arg in the dispatcher case body.
> 3. **`searchEntities` signature drift.** Same pattern; dropped trailing `conceptIndex`.
> 4. **`getConceptNote` signature drift.** Plan called `getConceptNote(args, conceptStore)`; Phase 6 ports it to single-arg postgres-js (`get-concept-note.ts:26`). Dropped `conceptStore`.
> 5. **`redirect_to_human` arg name.** Plan read `args.topic`; Phase 6 + the inputSchema use `topic_hint` (`index.ts:132`, `redirect-to-human.ts:14`, `index.ts:391` inputSchema). Corrected `queryText` extraction and the type cast.
> 6. **Verification compose-file paths.** Plan inlined `docker compose -f apps/qw-oracle/db/docker-compose.dev.yml exec -T postgres psql ...`. The package.json `db:psql` script uses `db/docker-compose.dev.yml` (relative to `apps/qw-oracle/`); the inlined verifications would have failed with the path mismatch. Replaced with `bun run --cwd apps/qw-oracle db:psql -- -c "..."` everywhere, matching Task 5's existing style.
>
> Plus two lighter amendments:
>
> - **OBSERVABILITY.md doc-index home.** Moved the doc-index row from `apps/qw-oracle/CLAUDE.md` (top-level) to `apps/qw-oracle/docs/CLAUDE.md` (the docs subsystem index, sibling to `arc-history.md` / `entity-types.md` / `layer1-extraction-roadmap.md`). Updated the verification grep target and the commit file list.
> - **Open Question 4 (SDK API) resolved at audit time.** Pinned SDK is `@modelcontextprotocol/sdk@1.29.0`; both `InitializedNotificationSchema` and `server.getClientVersion()` exist. No executor SDK-source-reading needed.
>
> Same orchestrator-audit ratchet that caught Phase 4's JSONB pre-stringify regression and Phase 6's path bugs. Executor: read this block, then proceed with Tasks 1-5 as written.

## Goal

Stand up the `query_log` table, route every MCP tool call through a single dispatcher-level wrapper that records `(tool, query_text, result_count, top_score, match_quality, latency_ms, error, consumer_hint)` for each invocation, capture the consumer identity from the MCP `initialize` handshake, and ship `apps/qw-oracle/docs/OBSERVABILITY.md` - the operator's copy-paste cheatsheet for asking "what failed retrieval", "what's the p95 per tool", "what's the Voyage spend trajectory", and "which queries are concept-note authoring leads". `embedding_api_log` is already in place from Phase 5; this phase wires the *query* side. At phase boundary the MCP server self-monitors: every dispatched tool call lands a row in `query_log` (including dispatch errors), `OBSERVABILITY.md` documents the operator's daily-driver SQL, and the relevant `bun test` suite passes against the test database.

## Inputs from previous phase

- Phase 1 (Foundation) shipped: Postgres dev container at `127.0.0.1:5432`, migrator (`bun db/migrate.ts`) tracking applied migrations by sha256 in `schema_migrations`, shared client at `apps/qw-oracle/shared/db.ts`, `oracle_meta` and `embedding_metadata` tables, dev DB `qw_oracle` and test DB `qw_oracle_test`.
- Phase 2 (Layer 1 port) shipped: every `*_versions` table FKs on `entity_id INTEGER` (D1); `entities.description` is derived from per-version rows (D6); the entities embedding + tsvector columns + HNSW + GIN indexes exist; the SQLite-equivalent constants relocated out of `schema.ts` into `db/constants.ts` (F16).
- Phase 3 (Layer 2 port) shipped: `messages`, `sessions`, `session_search`, `message_labels`, `discord_channels`, `import_log`, `processing_log` all in Postgres dialect with `'simple'` tsvector config (D7) and Discord-only platform CHECK (D9-revised).
- Phase 4 (Layer 3 + graph) shipped: `concepts`, `concept_chunks`, `concept_entities`, `concept_concepts`, `redirect_targets`.
- Phase 5 (Embeddings) shipped: Voyage client, entity- and chunk-level embedding pipelines, `embedding_metadata` populated, **`embedding_api_log` table created and written to on every Voyage call (loader and MCP-query side)**, embedding-space sanity check at MCP startup (D8).
- Phase 6 (MCP rewrite) shipped: every MCP tool ported to Postgres + RRF where applicable (`search_entities`, `search_concepts`); the existing 10 tools (`lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`, `lookup_map`, `search_maps`, `lookup_gameplay_entity`, `lookup_mechanic`, `search_gameplay_entities`, `search_mechanics`) retain their tool names and `ToolResponse<T>` envelope shape; the two new tools (`search_concepts`, `redirect_to_human`) ship with the same envelope; the dispatcher in `serve/mcp/src/index.ts` is `setRequestHandler(CallToolRequestSchema, ...)` with a `switch (name) { ... }` body, every case is `async`, and HTTP/SSE transport is wired alongside the existing stdio transport.
- Phase 6 did NOT add `query_log` writes inline in any tool. Tool bodies stay focused on retrieval; observability lives at the dispatcher layer. (If Phase 6 ships with inline `INSERT INTO query_log` calls inherited from the legacy plan's `search_concepts` sketch, see Open question 1 - those inline writes are removed by this phase.)
- Migrator state: `db/migrations/` contains `001_init.sql` (Phase 1), the Layer 1 migrations from Phase 2 (002, 003), the Layer 2 migration from Phase 3 (004), and the Layer 3 + embedding migrations from Phases 4-5 (005, 006). The next sequential file is `007_query_log.sql` (this phase).

## Files touched

### Created

```
apps/qw-oracle/db/migrations/007_query_log.sql                 # hand-written
apps/qw-oracle/serve/mcp/src/query-log.ts                      # hand-written (dispatcher wrapper + consumer-hint capture)
apps/qw-oracle/serve/mcp/src/query-log.test.ts                 # hand-written (integration test against qw_oracle_test)
apps/qw-oracle/docs/OBSERVABILITY.md                           # hand-written (operator cheatsheet)
```

The parent directories for all four files exist as of 2026-05-02 (`db/migrations/` from Phase 1, `serve/mcp/src/` from current main, `docs/` from current main).

### Modified

```
apps/qw-oracle/serve/mcp/src/index.ts                          # wrap every CallTool case in dispatchAndLog; capture consumer_hint at initialized notification
apps/qw-oracle/docs/CLAUDE.md                                  # add OBSERVABILITY.md row to docs-subsystem documentation index
```

### Deleted

```
(none)                                                          # Phase 6 ships clean tool bodies; no inline query_log INSERTs to remove
```

## Tasks

### Task 1: Migration `007_query_log.sql`

**Goal.** Create the `query_log` table and its three indexes; apply the migration via the migrator. The dispatcher wrapper (Task 2) writes here on every tool call.

**Files.**

- Create: `apps/qw-oracle/db/migrations/007_query_log.sql`

**Steps.**

- [ ] Create `apps/qw-oracle/db/migrations/007_query_log.sql` with the full content below. Two additions vs. the architecture spec's two-index sketch (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md:315-317`) and the legacy plan's `007_observability.sql` (lines 1953-1979 of `_legacy-monolithic-plan.md`), both intentional and named here so they don't read as drift: (a) the CHECK on `match_quality` rejects stray values - the same enum is already exposed as the `MatchQuality` TS union in `serve/mcp/src/types.ts:5`, so this aligns the SQL constraint with the type system; (b) the index scheme is three indexes instead of two - `query_log_queried_at` adds DESC ordering for the typical reverse-chronological operator queries documented in `OBSERVABILITY.md`, the partial index on `(weak, none)` is the spec's "what failed retrieval?" index, and a third index on `tool` accelerates per-tool breakdowns (latency p95, most-called tools) which are the highest-frequency `OBSERVABILITY.md` queries.

```sql
-- apps/qw-oracle/db/migrations/007_query_log.sql
-- Phase 7 (Arc 1): one row per MCP tool call. Loader-side observability lives
-- in embedding_api_log (Phase 5); this is the *query-side* journal. Written by
-- the dispatcher wrapper at serve/mcp/src/query-log.ts (this phase). Read by
-- the operator via the queries documented in apps/qw-oracle/docs/OBSERVABILITY.md.
--
-- BIGSERIAL on id keeps a long-running deployment safe from INTEGER overflow.
-- The match_quality CHECK mirrors the MatchQuality union in types.ts; nullable
-- because some failure paths log before any tool body runs (and so never
-- compute a match_quality).

CREATE TABLE query_log (
  id              BIGSERIAL PRIMARY KEY,
  queried_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  tool            TEXT NOT NULL,
  query_text      TEXT,
  result_count    INTEGER,
  top_score       REAL,
  match_quality   TEXT
                    CHECK (match_quality IS NULL
                           OR match_quality IN ('strong', 'weak', 'none')),
  latency_ms      INTEGER,
  error           TEXT,
  consumer_hint   TEXT
);

CREATE INDEX query_log_queried_at ON query_log (queried_at DESC);
CREATE INDEX query_log_tool ON query_log (tool);
-- Partial index for the most-asked operator question ("what failed retrieval?"):
-- the index is small because most rows have match_quality='strong' or NULL.
CREATE INDEX query_log_match_quality_weak_none
  ON query_log (queried_at DESC)
  WHERE match_quality IN ('weak', 'none');
```

- [ ] Apply against the dev DB: `bun db/migrate.ts`. Expected: the migrator logs `[migrate] applying 007_query_log.sql` once, then `[migrate] up-to-date`.
- [ ] Apply against the test DB: `DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun db/migrate.ts`. Expected: same shape.
- [ ] No commit yet; Task 5 commits the phase as one unit.

**Verification.**

```bash
bun run --cwd apps/qw-oracle db:psql -- -c "SELECT filename FROM schema_migrations WHERE filename = '007_query_log.sql'"
```

PASS condition: one row returned with `filename = 007_query_log.sql`.
FAIL condition: zero rows (migrator did not pick up the file - check filename ordering / file permissions).

```bash
bun run --cwd apps/qw-oracle db:psql -- -c "\d+ query_log"
```

PASS condition: output lists exactly the columns above (`id`, `queried_at`, `tool`, `query_text`, `result_count`, `top_score`, `match_quality`, `latency_ms`, `error`, `consumer_hint`), the three indexes (`query_log_queried_at`, `query_log_tool`, `query_log_match_quality_weak_none`), and the CHECK constraint on `match_quality`.
FAIL condition: any column or index missing; CHECK constraint absent.

### Task 2: `query-log.ts` wrapper module

**Goal.** Provide a single `dispatchAndLog<R>(opts, fn)` helper plus a `setConsumerHint(hint)` setter. The wrapper times the tool body, extracts `result_count` / `top_score` / `match_quality` from the returned `ToolResponse`, swallows any logging-INSERT failure (logs to stderr, never propagates), and returns the MCP-shaped `{ content: [...] }` envelope. The setter is called by the dispatcher (Task 3) when the MCP `initialized` notification arrives so subsequent dispatches carry a `consumer_hint`. The module is library-only - it is imported by `index.ts` and by the test file; no CLI entry point, so no `import.meta.main` guard is added (D2 says the guard is *allowed* under Bun, not *required*).

**Files.**

- Create: `apps/qw-oracle/serve/mcp/src/query-log.ts`
- Create: `apps/qw-oracle/serve/mcp/src/query-log.test.ts`

**Steps.**

- [ ] Create `apps/qw-oracle/serve/mcp/src/query-log.ts` with the full content below.

```ts
// apps/qw-oracle/serve/mcp/src/query-log.ts
//
// Phase 7 (Arc 1). Dispatcher-level wrapper for every MCP tool call.
// Writes one row to query_log per invocation. Failure to log NEVER affects
// the tool's response - the consumer is the source of truth, the journal is
// best-effort. The MCP handshake's clientInfo is captured via setConsumerHint
// from index.ts; for stdio transport that's a single global value, for
// HTTP/SSE Phase 6 owns whatever per-session capture it ships and calls the
// setter accordingly (see Open question 4).

import { db } from './db.ts';
import type { ToolResponse } from './types.ts';

let currentConsumerHint: string | null = null;

export function setConsumerHint(hint: string | null): void {
  currentConsumerHint = hint;
}

interface DispatchOptions {
  tool: string;
  // The most-relevant input string for this call. For lookup_*, args.name; for
  // search_*, args.query; for get_concept_note, args.id; for the filter-shaped
  // tools (search_maps / search_gameplay_entities / search_mechanics) pass a
  // JSON.stringify of the args envelope or a short structured summary so the
  // operator can read query_log without reconstructing the call. The
  // dispatcher decides; the wrapper is opinion-free here.
  queryText: string | null;
}

interface ScorableHit {
  match_score?: number;
}

// MCP content envelope shape returned to the SDK Server.
type CallToolResult = { content: { type: 'text'; text: string }[] };

export async function dispatchAndLog<R extends ToolResponse<unknown>>(
  opts: DispatchOptions,
  fn: () => Promise<R>,
): Promise<CallToolResult> {
  const start = Date.now();
  let response: R | null = null;
  let errorMessage: string | null = null;
  try {
    response = await fn();
    return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const resultCount = response?.results.length ?? 0;
    const topScore = response
      ? ((response.results[0] as ScorableHit | undefined)?.match_score ?? null)
      : null;
    const matchQuality = response?.match_quality ?? null;
    const latencyMs = Date.now() - start;
    try {
      await db`
        INSERT INTO query_log
          (tool, query_text, result_count, top_score, match_quality, latency_ms, error, consumer_hint)
        VALUES
          (${opts.tool}, ${opts.queryText}, ${resultCount}, ${topScore},
           ${matchQuality}, ${latencyMs}, ${errorMessage}, ${currentConsumerHint})
      `;
    } catch (logErr) {
      // Never throw from the logging path; the consumer already has its
      // response. Surface the failure to stderr so an operator running the
      // server interactively sees it.
      const m = logErr instanceof Error ? logErr.message : String(logErr);
      console.error(`[query-log] failed to record ${opts.tool}: ${m}`);
    }
  }
}
```

- [ ] Create `apps/qw-oracle/serve/mcp/src/query-log.test.ts` with the full content below. Tests are integration-style per D13: a real connection to `qw_oracle_test`. Each test resets `query_log` in `beforeEach` so order-dependence is impossible.

```ts
// apps/qw-oracle/serve/mcp/src/query-log.test.ts
//
// Integration tests for the dispatcher wrapper. Hits qw_oracle_test directly;
// no mocks (D13). Asserts: success path writes a populated row, error path
// writes a row with error + null match_quality + propagates the error,
// consumer_hint flows from setConsumerHint into the row, the wrapper extracts
// match_score from results[0] when present, and a failing INSERT (table
// dropped mid-test) does not break the tool's response.

import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import postgres from 'postgres';

import { dispatchAndLog, setConsumerHint } from './query-log.ts';
import type { ToolResponse } from './types.ts';

const url = process.env.DATABASE_URL;
if (!url || !url.includes('qw_oracle_test')) {
  throw new Error(
    'query-log.test.ts must run against qw_oracle_test; got DATABASE_URL=' + (url ?? '<unset>'),
  );
}
const sql = postgres(url, { onnotice: () => {} });

beforeEach(async () => {
  await sql`TRUNCATE TABLE query_log RESTART IDENTITY`;
  setConsumerHint(null);
});

afterAll(async () => {
  await sql.end();
});

interface FakeHit {
  id: string;
  match_score: number;
}

function fakeOk(results: FakeHit[], match: 'strong' | 'weak' | 'none'): ToolResponse<FakeHit> {
  return {
    results,
    match_quality: match,
    suggested_fallback: null,
    meta: { tool: 'fake', server_version: 'test', queried_at: '2026-05-02T00:00:00Z' },
  };
}

describe('dispatchAndLog', () => {
  it('writes a populated row on the success path', async () => {
    const result = await dispatchAndLog(
      { tool: 'fake_tool', queryText: 'rocket jump' },
      async () => fakeOk([{ id: 'a', match_score: 0.91 }, { id: 'b', match_score: 0.7 }], 'strong'),
    );
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('"match_quality": "strong"');

    const rows = await sql<
      { tool: string; query_text: string | null; result_count: number;
        top_score: number | null; match_quality: string | null;
        latency_ms: number; error: string | null; consumer_hint: string | null }[]
    >`SELECT tool, query_text, result_count, top_score, match_quality,
              latency_ms, error, consumer_hint
       FROM query_log`;
    expect(rows.length).toBe(1);
    expect(rows[0].tool).toBe('fake_tool');
    expect(rows[0].query_text).toBe('rocket jump');
    expect(rows[0].result_count).toBe(2);
    expect(rows[0].top_score).toBeCloseTo(0.91);
    expect(rows[0].match_quality).toBe('strong');
    expect(rows[0].error).toBeNull();
    expect(rows[0].consumer_hint).toBeNull();
    expect(rows[0].latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('writes a row with error and re-throws when the tool throws', async () => {
    let thrown: Error | null = null;
    try {
      await dispatchAndLog(
        { tool: 'broken_tool', queryText: 'q' },
        async () => { throw new Error('boom'); },
      );
    } catch (e) {
      thrown = e as Error;
    }
    expect(thrown?.message).toBe('boom');

    const rows = await sql<
      { tool: string; error: string | null; match_quality: string | null;
        result_count: number | null; top_score: number | null }[]
    >`SELECT tool, error, match_quality, result_count, top_score FROM query_log`;
    expect(rows.length).toBe(1);
    expect(rows[0].tool).toBe('broken_tool');
    expect(rows[0].error).toBe('boom');
    expect(rows[0].match_quality).toBeNull();
    expect(rows[0].result_count).toBe(0);
    expect(rows[0].top_score).toBeNull();
  });

  it('captures consumer_hint set via setConsumerHint', async () => {
    setConsumerHint('claude-code/1.2.3');
    await dispatchAndLog(
      { tool: 'fake_tool', queryText: null },
      async () => fakeOk([], 'none'),
    );
    const rows = await sql<{ consumer_hint: string | null }[]>`SELECT consumer_hint FROM query_log`;
    expect(rows[0].consumer_hint).toBe('claude-code/1.2.3');
  });

  it('records null top_score when results[0] has no match_score', async () => {
    interface PlainHit { id: string }
    const plain: ToolResponse<PlainHit> = {
      results: [{ id: 'x' }],
      match_quality: 'weak',
      suggested_fallback: null,
      meta: { tool: 'fake', server_version: 'test', queried_at: '2026-05-02T00:00:00Z' },
    };
    await dispatchAndLog(
      { tool: 'lookup_fake', queryText: 'x' },
      async () => plain,
    );
    const rows = await sql<{ top_score: number | null }[]>`SELECT top_score FROM query_log`;
    expect(rows[0].top_score).toBeNull();
  });
});
```

**Verification.**

```bash
DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test \
  bun test serve/mcp/src/query-log.test.ts
```

PASS condition: 4 tests pass, 0 failures.
FAIL condition: any failure - read the assertion message; the most likely causes are migration 007 not applied to `qw_oracle_test` or `consumer_hint` not threading through (re-check the `setConsumerHint` call in `beforeEach`).

### Task 3: Wire the dispatcher and capture `consumer_hint`

**Goal.** Modify `serve/mcp/src/index.ts` so every `CallToolRequestSchema` switch case routes its tool through `dispatchAndLog`, and the `initialized` notification handler calls `setConsumerHint` with the client's name+version.

**Files.**

- Modify: `apps/qw-oracle/serve/mcp/src/index.ts`

**Steps.**

- [ ] At the top of the file, add the imports (positioned next to the existing tool imports so the diff is minimal):

```ts
import { dispatchAndLog, setConsumerHint } from './query-log.ts';
import { InitializedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
```

- [ ] Immediately after the `Server` constructor and BEFORE `setRequestHandler(ListToolsRequestSchema, ...)`, register the initialized-notification handler. The MCP SDK's `Server` exposes the client's identity via `server.getClientVersion()` once the handshake completes; reading it on the `initialized` notification gives the canonical capture point. If the SDK API has shifted between the version Phase 6 pinned and the version this phase is wired against, see Open question 4.

```ts
server.setNotificationHandler(InitializedNotificationSchema, async () => {
  const info = server.getClientVersion();
  if (info && typeof info.name === 'string') {
    const version = typeof info.version === 'string' ? info.version : 'unknown';
    setConsumerHint(`${info.name}/${version}`);
  }
});
```

- [ ] Replace every `case '<tool>': { ... return { content: [...] }; }` body in the `setRequestHandler(CallToolRequestSchema, ...)` switch with a `return dispatchAndLog(...)` call. The full post-Phase-6 dispatcher (12 tools after Phase 6 adds `search_concepts` and `redirect_to_human`) ends up shaped like:

```ts
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  const args = (rawArgs ?? {}) as Record<string, unknown>;
  switch (name) {
    case 'lookup_entity':
      return dispatchAndLog(
        { tool: 'lookup_entity', queryText: typeof args.name === 'string' ? args.name : null },
        () => lookupEntity(args as { name: string; project?: string; type?: EntityType }),
      );
    case 'search_entities':
      return dispatchAndLog(
        { tool: 'search_entities', queryText: typeof args.query === 'string' ? args.query : null },
        () => searchEntities(args as { query: string; project?: string; type?: EntityType; limit?: number }),
      );
    case 'search_concepts':
      return dispatchAndLog(
        { tool: 'search_concepts', queryText: typeof args.query === 'string' ? args.query : null },
        () => searchConcepts(args as { query: string; limit?: number }),
      );
    case 'get_concept_note':
      return dispatchAndLog(
        { tool: 'get_concept_note', queryText: typeof args.id === 'string' ? args.id : null },
        () => getConceptNote(args as { id: string }),
      );
    case 'search_solved_issues':
      return dispatchAndLog(
        { tool: 'search_solved_issues', queryText: typeof args.query === 'string' ? args.query : null },
        () => searchSolvedIssues(args as { query: string; limit?: number; max_messages_per_session?: number }),
      );
    case 'lookup_map':
      return dispatchAndLog(
        { tool: 'lookup_map', queryText: typeof args.name === 'string' ? args.name : null },
        () => lookupMap(args as { name: string }),
      );
    case 'search_maps':
      return dispatchAndLog(
        { tool: 'search_maps', queryText: summariseFilterArgs(args) },
        () => searchMaps(args as SearchMapsArgs),
      );
    case 'lookup_gameplay_entity':
      return dispatchAndLog(
        { tool: 'lookup_gameplay_entity', queryText: typeof args.name === 'string' ? args.name : null },
        () => lookupGameplayEntity(args as { name: string; gameplay_source?: string }),
      );
    case 'lookup_mechanic':
      return dispatchAndLog(
        { tool: 'lookup_mechanic', queryText: typeof args.name === 'string' ? args.name : null },
        () => lookupMechanic(args as { name: string; gameplay_source?: string }),
      );
    case 'search_gameplay_entities':
      return dispatchAndLog(
        { tool: 'search_gameplay_entities', queryText: summariseFilterArgs(args) },
        () => searchGameplayEntities(args as SearchGameplayEntitiesArgs),
      );
    case 'search_mechanics':
      return dispatchAndLog(
        { tool: 'search_mechanics', queryText: summariseFilterArgs(args) },
        () => searchMechanics(args as SearchMechanicsArgs),
      );
    case 'redirect_to_human':
      return dispatchAndLog(
        { tool: 'redirect_to_human', queryText: typeof args.topic_hint === 'string' ? args.topic_hint : null },
        () => redirectToHuman(args as { topic_hint?: string }),
      );
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

- [ ] Add a small helper at the top of `index.ts` (or co-located with the other dispatch utilities Phase 6 introduced) that compresses filter-shaped args into a short summary string. Keeps `query_log.query_text` legible without storing the full JSON for every search call. If the args object is empty the helper returns `null`.

```ts
function summariseFilterArgs(args: Record<string, unknown>): string | null {
  const keys = Object.keys(args);
  if (keys.length === 0) return null;
  const compact = keys.map((k) => {
    const v = args[k];
    if (Array.isArray(v)) return `${k}=[${(v as unknown[]).map(String).join(',')}]`;
    if (typeof v === 'object' && v !== null) return `${k}=<obj>`;
    return `${k}=${String(v)}`;
  }).join(' ');
  return compact.length > 200 ? compact.slice(0, 197) + '...' : compact;
}
```

- [ ] Phase 6 ships `searchConcepts` and `redirectToHuman` imports. If Phase 6 named those imports differently or co-located them under a registry export, adapt this task's switch body to whatever Phase 6 actually exports. The wrapping pattern (`return dispatchAndLog(...)` per case) is invariant.
- [ ] If Phase 6 happens to ship inline `INSERT INTO query_log` writes inside any tool body (the legacy plan's `search_concepts` sketch did this), remove them now. The wrapper is the only writer; double-writes inflate the log and break per-tool latency math. List of tool files to grep before wrapping (catches any inline survivor):

```bash
grep -l "INSERT INTO query_log" apps/qw-oracle/serve/mcp/src/tools/
```

Expected output: zero files. If any file is listed, delete the inline INSERT block (and any unused `db` import that was only there to write it).

**Verification.**

```bash
cd apps/qw-oracle && bunx tsc --noEmit
```

PASS condition: zero TypeScript errors.
FAIL condition: any error - the most likely causes are an unimported tool function (Phase 6 dependency drift) or a stale arg-typecast.

```bash
grep -rln "INSERT INTO query_log" apps/qw-oracle/serve/mcp/src/
```

PASS condition: only `query-log.ts` and `query-log.test.ts` (the test references the table name in TRUNCATE/SELECT statements, which is fine; no INSERT outside `query-log.ts`).
FAIL condition: any tool body still contains `INSERT INTO query_log` - return to the inline-removal substep.

### Task 4: `OBSERVABILITY.md` - operator cheatsheet

**Goal.** Document the operator's daily-driver SQL against `query_log` and `embedding_api_log` so the operator can answer "what failed retrieval", "what's the p95 per tool", "is Voyage spend on track", and "which queries are concept-note authoring leads" without reconstructing the SQL each time. Lives at `apps/qw-oracle/docs/OBSERVABILITY.md`; linked from `apps/qw-oracle/CLAUDE.md`'s documentation index in Task 5.

**Files.**

- Create: `apps/qw-oracle/docs/OBSERVABILITY.md`

**Steps.**

- [ ] Create `apps/qw-oracle/docs/OBSERVABILITY.md` with the full content below. ASCII only, no emoji, ASCII hyphens (D12). The doc has six query blocks; each block leads with the operator's question in plain English, then the SQL, then a one-line note about how to read the output.

```markdown
# QW Oracle Observability - operator cheatsheet

Two Postgres tables back the entire observability surface:

- `query_log` - one row per MCP tool call. Written by the dispatcher wrapper at `serve/mcp/src/query-log.ts`. Columns: `id`, `queried_at`, `tool`, `query_text`, `result_count`, `top_score`, `match_quality` (`strong | weak | none | NULL`), `latency_ms`, `error`, `consumer_hint`.
- `embedding_api_log` - one row per Voyage API call. Written by the loader-side embed pipelines (Phase 5) and by the MCP query-side embedding step (Phase 5 / Phase 6). Columns: `id`, `called_at`, `source` (`'loader' | 'mcp-query'`), `model`, `input_tokens`, `latency_ms`, `error`.

Open `psql` against the dev DB with `bun run db:psql`, or against any deployed instance with the equivalent connection. Every query below is copy-paste; no scripting, no extensions.

## What failed retrieval recently?

Surface the queries the corpus did not cover (LLM iteration leads + concept-note authoring leads).

```sql
SELECT queried_at, tool, query_text, match_quality, latency_ms, consumer_hint
FROM query_log
WHERE match_quality IN ('weak', 'none')
ORDER BY queried_at DESC
LIMIT 50;
```

Read: rows are reverse chronological. The partial index on `(weak, none)` makes this fast even at a million rows. Vague queries with `match_quality = 'none'` are the strongest concept-note authoring leads.

## Latency p95 per tool, last 24 hours

```sql
SELECT tool,
       count(*) AS n,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms,
       percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_ms
FROM query_log
WHERE queried_at > now() - INTERVAL '24 hours'
GROUP BY tool
ORDER BY p95_ms DESC;
```

Read: tools are sorted slowest-tail-first. Anything where `p95_ms` exceeds `~1000` on a hybrid-retrieval tool is worth investigating; lookup tools should sit comfortably under 100ms p95.

## Voyage spend trajectory

```sql
SELECT date_trunc('day', called_at)::date AS day,
       source,
       sum(input_tokens) AS tokens,
       count(*) AS calls,
       sum(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) AS errors
FROM embedding_api_log
GROUP BY day, source
ORDER BY day DESC, source;
```

Read: separates loader-side spend (one-shot, large bursts at re-embed time) from query-side spend (steady drip per MCP query). Compare the running daily total against the 200M-token Voyage free-tier ceiling (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md:88`).

## Concept-note coverage gaps

Same as "what failed retrieval recently?" but grouped, so repeated misses cluster.

```sql
SELECT query_text, count(*) AS hits
FROM query_log
WHERE tool = 'search_concepts'
  AND match_quality = 'none'
  AND query_text IS NOT NULL
GROUP BY query_text
ORDER BY hits DESC
LIMIT 20;
```

Read: every row is a candidate concept-note title. Multiple users converging on the same query is high signal.

## Most-called tools, last 7 days

```sql
SELECT tool, count(*) AS n,
       count(*) FILTER (WHERE error IS NOT NULL) AS errors,
       round(100.0 * avg(CASE WHEN match_quality = 'strong' THEN 1.0 ELSE 0.0 END), 1) AS strong_pct
FROM query_log
WHERE queried_at > now() - INTERVAL '7 days'
GROUP BY tool
ORDER BY n DESC;
```

Read: shows which tools the consumer LLMs actually iterate to. A tool with high `n` and low `strong_pct` means the corpus is being asked questions it cannot answer; either the corpus needs to grow or the tool's docstring needs to better steer the consumer.

## Per-consumer breakdown

```sql
SELECT coalesce(consumer_hint, '<unknown>') AS consumer,
       count(*) AS calls,
       count(DISTINCT tool) AS distinct_tools,
       round(100.0 * avg(CASE WHEN match_quality IN ('weak', 'none') THEN 1.0 ELSE 0.0 END), 1) AS weak_or_none_pct
FROM query_log
WHERE queried_at > now() - INTERVAL '7 days'
GROUP BY consumer
ORDER BY calls DESC;
```

Read: tells the operator which clients are driving traffic and how well the corpus is serving each. Useful when comparing Claude Desktop vs. Claude Code vs. quad chatbot iteration patterns.

## Error spikes

```sql
SELECT date_trunc('hour', queried_at) AS hour,
       tool,
       count(*) AS errors,
       array_agg(DISTINCT substring(error from 1 for 80)) AS error_samples
FROM query_log
WHERE error IS NOT NULL
  AND queried_at > now() - INTERVAL '24 hours'
GROUP BY hour, tool
ORDER BY hour DESC, errors DESC;
```

Read: groups errors by hour-bucket so transient outages stand out. `error_samples` is the first 80 chars of each distinct error message for quick triage.

## Manual retention sweep

Arc 1 does not auto-purge `query_log`; the volume is small at expected v1 query rates (one row per tool call, mostly under a kilobyte). When the table genuinely grows large, the operator runs the purge on demand:

```sql
DELETE FROM query_log
WHERE queried_at < now() - INTERVAL '90 days';

VACUUM (ANALYZE) query_log;
```

The 90-day window matches the architecture spec (`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md:240`). An automated retention cron is out of scope for Arc 1; the spec marks it as endgame infrastructure (Grafana / OTel arrive with the platform graduation, not v1).

## Embedding model + corpus state

One-row sanity table that says what model the corpus is currently in:

```sql
SELECT * FROM embedding_metadata;
```

Read: `model_name`, `dimension`, `embedded_at`, `rows_embedded`. If the dimension mismatches `EMBEDDING_DIMENSION` from the env, the MCP startup check (D8) will refuse to start - this query is the operator's sanity probe.

## Observability schema reference

For shape-by-shape detail, read the migration files:

- `apps/qw-oracle/db/migrations/006_*.sql` - `embedding_api_log` (Phase 5).
- `apps/qw-oracle/db/migrations/007_query_log.sql` - `query_log` (Phase 7).

Both tables are append-only for v1. No triggers, no views, no materialised state. SQL above is the entire observability tooling.
```

- [ ] In `apps/qw-oracle/docs/CLAUDE.md`, add one row to the documentation-index table that points at the new doc. The docs-subsystem CLAUDE is the natural home (sibling to `arc-history.md`, `entity-types.md`, `layer1-extraction-roadmap.md`); the top-level `apps/qw-oracle/CLAUDE.md` index covers app-wide top docs (README/SCHEMA/OVERVIEW etc.) and does not need a row. Append at the bottom of the existing 3-row table:

```markdown
| Operator observability cheatsheet (query_log + embedding_api_log queries) | `OBSERVABILITY.md` |
```

(If the Phase 6 drafter already added this row, skip the edit.)

**Verification.**

```bash
test -f apps/qw-oracle/docs/OBSERVABILITY.md && echo OK || echo MISSING
```

PASS condition: prints `OK`.

```bash
grep -c "^## " apps/qw-oracle/docs/OBSERVABILITY.md
```

PASS condition: returns 10 (ten `##` section headings: seven query blocks - "What failed retrieval recently?", "Latency p95 per tool, last 24 hours", "Voyage spend trajectory", "Concept-note coverage gaps", "Most-called tools, last 7 days", "Per-consumer breakdown", "Error spikes" - plus "Manual retention sweep", "Embedding model + corpus state", "Observability schema reference").
FAIL condition: returns < 10 - a section was dropped.

```bash
grep -c "OBSERVABILITY.md" apps/qw-oracle/docs/CLAUDE.md
```

PASS condition: returns >= 1.
FAIL condition: returns 0 - the doc-index row didn't land.

### Task 5: Phase smoke test + commit

**Goal.** Confirm the wired-up dispatcher actually populates `query_log` end-to-end against the dev DB (manual probe), confirm typecheck + tests pass, then commit the phase as a single coherent unit per D14.

**Files.** None new; this task verifies and commits prior tasks.

**Steps.**

- [ ] Start the dev MCP server: `cd apps/qw-oracle && bun serve/mcp/src/index.ts &`. Wait for the `[qw-oracle-mcp] loaded N concept notes` line on stderr.
- [ ] Invoke a tool from a separate terminal. Two acceptable paths; pick whichever the operator finds most natural:
  - Via Claude Desktop / Claude Code with `qw-oracle` configured as an MCP server: ask "look up cl_bob" and "what does cl_bob do" so both `lookup_entity` and `search_entities` get hit.
  - Via direct stdio probe: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"lookup_entity","arguments":{"name":"cl_bob"}}}' | bun serve/mcp/src/index.ts` (one-shot; the server exits when stdin closes).
- [ ] Query `query_log` (note `--cwd` so the operator can run this from anywhere in the monorepo, not only from inside `apps/qw-oracle`):

```bash
bun run --cwd apps/qw-oracle db:psql -- -c "SELECT id, tool, query_text, result_count, top_score, match_quality, latency_ms, error, consumer_hint FROM query_log ORDER BY id DESC LIMIT 5;"
```

PASS condition: rows present, one per tool call. `match_quality` populated; `latency_ms > 0`; `consumer_hint` populated when invoked through Claude Desktop / Claude Code (`claude-code/<version>` or similar) and `NULL` when invoked via the raw stdio probe (no `initialized` notification was sent).
FAIL condition: no rows - the dispatcher wrap-up missed a case; re-check Task 3.

- [ ] Tear down the server: `kill %1` (or whatever job number `bun` was assigned).
- [ ] Run the type checker: `cd apps/qw-oracle && bunx tsc --noEmit`. Expected: zero errors.
- [ ] Run the test suite: `cd apps/qw-oracle && bun run test`. Expected: all tests pass, including `query-log.test.ts` and any Phase 6 MCP tests that should be untouched by this phase.
- [ ] Commit the phase as one unit:

```bash
git add apps/qw-oracle/db/migrations/007_query_log.sql \
        apps/qw-oracle/serve/mcp/src/query-log.ts \
        apps/qw-oracle/serve/mcp/src/query-log.test.ts \
        apps/qw-oracle/serve/mcp/src/index.ts \
        apps/qw-oracle/docs/OBSERVABILITY.md \
        apps/qw-oracle/docs/CLAUDE.md
git commit -m "qw-oracle: Phase 7 - observability (query_log + dispatcher wrapper + cheatsheet)"
```

**Verification.**

```bash
git log -1 --name-only
```

PASS condition: the commit lists the six files above.
FAIL condition: any file missing from the commit (`git status` shows the dropped file as still uncommitted).

## Verification (phase boundary)

Run all of these against the dev DB at the end of the phase. Each block is a copy-paste check.

### 1. Migration applied

```bash
bun run --cwd apps/qw-oracle db:psql -- -c "SELECT filename, sha256 FROM schema_migrations WHERE filename = '007_query_log.sql'"
```

PASS condition: one row, `sha256` non-empty.
FAIL condition: zero rows.

### 2. Table shape correct

```bash
bun run --cwd apps/qw-oracle db:psql -- -c "\d+ query_log"
```

PASS condition: columns are exactly `id` (BIGSERIAL/`bigint`), `queried_at` (`timestamp with time zone`), `tool` (`text NOT NULL`), `query_text` (`text`), `result_count` (`integer`), `top_score` (`real`), `match_quality` (`text`, nullable, with CHECK), `latency_ms` (`integer`), `error` (`text`), `consumer_hint` (`text`); three indexes (`query_log_queried_at`, `query_log_tool`, `query_log_match_quality_weak_none`); the partial index has the `WHERE match_quality IN ('weak', 'none')` predicate.
FAIL condition: any column missing, the CHECK constraint absent, or any index missing.

### 3. Tests pass

```bash
cd apps/qw-oracle && bun run test
```

PASS condition: 0 failures across the test suite. Phase-7-introduced tests: `query-log.test.ts` reports 4 passing.
FAIL condition: any failure - read the assertion message; do not bypass.

### 4. Typecheck clean

```bash
cd apps/qw-oracle && bunx tsc --noEmit
```

PASS condition: zero errors.

### 5. Smoke: live MCP populates `query_log`

After Task 5's manual probe, the most recent `query_log` row reflects the actual call:

```bash
bun run --cwd apps/qw-oracle db:psql -- -c \
  "SELECT tool, query_text, result_count, match_quality, latency_ms,
          (consumer_hint IS NOT NULL) AS has_consumer
   FROM query_log ORDER BY id DESC LIMIT 1;"
```

PASS condition: one row, `tool` matches the invocation, `latency_ms > 0`, `match_quality` non-NULL (or NULL only when the probed tool genuinely has no match - unlikely for the recommended `lookup_entity`/`search_entities` probes).
FAIL condition: zero rows or `latency_ms = 0`.

### 6. Inline `INSERT INTO query_log` purge

```bash
grep -rln "INSERT INTO query_log" apps/qw-oracle/serve/mcp/src/
```

PASS condition: only `query-log.ts` is listed (or only `query-log.ts` plus `query-log.test.ts` if a test references the table name in another statement form - the strict check is "no tool body").
FAIL condition: any file under `serve/mcp/src/tools/` is listed.

## Outputs to next phase

Phase 8 (Eval + deploy) starts from this state:

- `query_log` table exists, populated; `embedding_api_log` (from Phase 5) likewise.
- The dispatcher wrapper at `serve/mcp/src/query-log.ts` is the single writer for `query_log`.
- `consumer_hint` is captured for stdio clients via the `initialized` notification.
- `apps/qw-oracle/docs/OBSERVABILITY.md` documents the operator's daily-driver SQL.
- The MCP server runs end-to-end on Postgres with self-monitoring.
- `bun test` and `bunx tsc --noEmit` are green.

Phase 8 builds on this by:
- Wiring eval and calibration runs to read `match_quality` (D11 - eval scores out-of-corpus by `match_quality`, not by hit count; the wrapper already records this column on every call).
- Documenting the deploy-gate flow that uses `bun run eval` against `eval/eval-queries.json` (D10 - disjoint from `eval/calibration-queries.json`).
- Operator-facing health probes for the deployed instance read straight from `query_log`'s p95 / error queries documented in `OBSERVABILITY.md`; no new cheatsheet needed at deploy time.

## Open questions / deferred items

1. **Question:** Phase 6 might inadvertently land inline `INSERT INTO query_log` writes inside `search_concepts` or other tool bodies (legacy plan's `search_concepts` sketch did this). Phase 7's Task 3 includes a grep + remove substep, but if Phase 6 ships with that pattern as load-bearing, the wrapper may double-write.
   **Default chosen for now:** Phase 7 removes any inline INSERT during execution and treats the wrapper as the single writer. The grep check at the end of Task 3 catches any survivor.
   **Who can resolve:** operator at phase-boundary review. If the operator confirms Phase 6 was clean, no action; if Phase 6 was dirty, the inline removals are part of Phase 7's commit.

2. **Question:** Migration filename ordinal (`007_query_log.sql`) assumes Phase 4 used `005_*` and Phase 5 used `006_*`. If the prior phases pick different ordinals (e.g., Phase 5 uses two migration files for embedding columns + embedding_api_log + redirect_targets, landing at 005/006/007), Phase 7's filename shifts to the next available ordinal.
   **Default chosen for now:** assume `007_query_log.sql`. Adjust at execution time by listing `db/migrations/` and incrementing.
   **Who can resolve:** Phase 7 executor at task-time (mechanical: pick the next ordinal after the highest currently in `db/migrations/`).

3. **Question:** `query_text` for filter-shaped tools (`search_maps`, `search_gameplay_entities`, `search_mechanics`) is materialised via `summariseFilterArgs(args)`. Should the wrapper instead store the raw `JSON.stringify(args)` so the operator can replay the exact call?
   **Default chosen for now:** `summariseFilterArgs` produces a compact `key=value key=[a,b]` string capped at 200 chars. Reasoning: legible at a glance, replayable by reading the column, no JSON-quote noise in the operator's log queries. If a future incident needs exact-call replay, the dispatcher can be amended to store JSON in a sibling column.
   **Who can resolve:** operator if/when an incident shows the truncated form is insufficient.

4. **Question:** MCP SDK API for capturing client identity. The current SDK exposes `server.getClientVersion()` after the `initialize` request completes; Phase 6's pinned SDK version may have a different accessor (`server.getClientCapabilities()` returns capabilities but not name; the underlying `_clientVersion` field is private). The handler stub in Task 3 uses `server.getClientVersion()` and falls back to `null` if the call returns `undefined`.
   **Resolved 2026-05-03 (orchestrator pre-execution audit):** Pinned SDK is `@modelcontextprotocol/sdk@1.29.0` (see `apps/qw-oracle/serve/mcp/package.json`). Both `InitializedNotificationSchema` (re-exported from `dist/esm/types.js:556`) and `server.getClientVersion()` (`dist/esm/server/index.js:291`) exist. The handler shape in Task 3 works as written; no executor SDK-source-reading needed.

5. **Question:** HTTP/SSE consumer-hint scoping. For stdio, `consumer_hint` is a single global value set once on `initialized`. For HTTP/SSE, every session can be a different client, and the SDK's session-scoping mechanism is what Phase 6 ships. Phase 7's wrapper currently uses one global; under HTTP/SSE that means the *last* client to connect wins.
   **Default chosen for now:** ship with the global. Note in `OBSERVABILITY.md` that under HTTP/SSE the `consumer_hint` is best-effort and may misattribute under concurrent sessions until Phase 6's session-scoping is threaded into `dispatchAndLog`.
   **Who can resolve:** operator after observing whether the public-MCP traffic in Phase 8 actually has overlapping concurrent sessions; if yes, Phase 7's wrapper is amended to take a per-call `consumerHint` argument and the dispatcher passes it from the SDK's request context.

6. **Question:** `query_log` retention. Architecture spec says 90 days; the operator runs the purge manually. No cron in v1.
   **Default chosen for now:** documented in `OBSERVABILITY.md` as a manual SQL command. No scheduled job.
   **Who can resolve:** Arc-2-or-later; aligns with Grafana / OTel arrival in the endgame per the spec's Observability section.

## Recovery (if verification fails)

- **Verification 1 fails (migration not in `schema_migrations`):** the migrator did not pick up `007_query_log.sql`. Confirm the file is named correctly (`007_` prefix, lowercase, `.sql` suffix) and lives in `apps/qw-oracle/db/migrations/`. Re-run `bun db/migrate.ts`. If the migrator says the file is "out of order" (sha mismatch on a pre-existing row), the file was edited after first apply - revert the edit; migrations are append-only by design.

- **Verification 2 fails (table shape wrong):** drop the table on the dev DB and re-apply.

  ```sql
  DROP TABLE IF EXISTS query_log;
  DELETE FROM schema_migrations WHERE filename = '007_query_log.sql';
  ```

  Then `bun db/migrate.ts`. The schema in `007_query_log.sql` is the source of truth; if `\d+` still differs after re-apply, the migration file itself has the wrong definition - edit and re-apply.

- **Verification 3 fails (tests fail):** the most likely cause is the test DB missing the migration. Re-run with the test connection: `DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun db/migrate.ts`. Re-run the tests. If failures persist, read the assertion message in `query-log.test.ts` - do NOT bypass.

- **Verification 4 fails (typecheck fails):** read the error. Two likely causes:
  - Phase 6 named the new tool imports differently than this phase assumed (`searchConcepts` vs. `search_concepts` vs. registry export). Adapt the switch in `index.ts`.
  - The `args` typecast is wrong because the tool function signature changed. Update the cast in the relevant `case`.

- **Verification 5 fails (smoke probe writes no row):** the wrapper isn't actually wrapping. Confirm `index.ts` calls `dispatchAndLog` in every `case`; confirm the import at the top of the file resolved (`bunx tsc --noEmit` would have caught the import). If the import resolved but no row appears, the most likely cause is `db.end()` running before the `INSERT` resolved - check whether any teardown path closes the shared `db` before the dispatcher's `finally` block.

- **Verification 6 fails (inline INSERTs survived):** for each file the grep listed, delete the inline `INSERT INTO query_log` block. The dispatcher wrapper is the only writer; double-writes inflate the log and break per-tool latency math because each inline INSERT runs after the body but before the wrapper's `finally`, double-counting on success and not running on error.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

(Sub-agent brief is dispatched in the next operator-visible step. Findings - if any - are applied back into this MD before the operator review opens.)
