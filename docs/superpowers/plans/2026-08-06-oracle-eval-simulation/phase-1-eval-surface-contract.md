# Phase 1 -- eval surface contract (contract owner)

**Arc:** oracle-eval-simulation. **Ledger:** `decisions.md` E1-E14 (this phase
owns E2's and E5's contracts). **Spec:**
`docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md` D1/D2/D3/D6
+ the 2026-08-06 amendment. **Findings consumed:** F6, F7, F8, F9, F10, F13,
F14, F16. **Findings raised here:** F17-F20 (see the arc findings ledger).
**Lane:** worktree `/home/dev/projects/quakeworld-eval`, branch
`eval-oracle-sim`.

## Goal

Lock the two contracts every later phase cites, and prove both against the dev
twin. Contract (a) is retrieval semantics: `search_solved_issues` gains
server-side, agent-invisible channel scoping and leave-one-out thread
exclusion, applied inside the SQL of BOTH retrieval paths (E5, F8), carried by
an explicit retrieval-context parameter that the tool's `inputSchema` never
mentions -- with two consumers sharing one implementation (the in-process
harness passes the context directly per E6; the MCP dispatch fills it from env
so a spawned stdio server honours it per E11/F7). Contract (b) is the run
record: a typed module, a committed fixture, and a validator, with the verdict
enum pinned to spec D6's `match | partial | miss` (never the faq-gate
vocabulary, F10). The phase ends with the worktree runnable (`.env` present,
deps installed, `bun run typecheck` green), a dev MCP instance provably
spawnable over stdio against the twin with no container / Cloudflare /
Tailscale involved (F6), SQL probes showing scope and exclusion take effect in
both the lexical and the vector path, and a committed telemetry baseline so
every later phase's `query_log` / `embedding_api_log` volume is attributable
(E3, F9).

## Contract (a) -- retrieval semantics (normative)

### The carrier

New module `apps/qw-oracle/serve/mcp/src/tools/retrieval-context.ts`:

```ts
// Server-side retrieval scoping for the eval simulation (arc plan E5).
// NEVER surfaced on any tool's inputSchema: the agent-visible surface must be
// byte-identical across conditions B and C (spec D2), so this rides as a
// second function parameter, structurally out of reach of anything the model
// can put in `arguments`.
export interface RetrievalContext {
  /** Restrict thread retrieval to these chat_threads.channel_name values.
   *  Undefined or empty = whole corpus (cell C / production default). */
  channels?: string[];
  /** chat_threads.id values (as strings, matching ThreadHit.thread_id) removed
   *  from BOTH retrieval paths before fanout. Leave-one-out per spec D6. */
  excludeThreadIds?: string[];
}
```

Same module exports the env-derived instance, parsed once at import time
(module-level const; process-lifetime by construction, which is exactly what
F7 says makes per-question exclusion correct only across a process boundary):

```ts
export const ENV_RETRIEVAL_CONTEXT: RetrievalContext = parseEnvContext();
```

Env var names, following the file's existing `L2_` prefix convention
(`L2_RRF_STRONG_THRESHOLD` / `L2_RRF_WEAK_THRESHOLD` in
`search-solved-issues.ts`):

| Var | Shape | Empty/unset means |
|---|---|---|
| `L2_RETRIEVAL_CHANNELS` | comma-separated channel names, e.g. `#helpdesk` | whole corpus |
| `L2_RETRIEVAL_EXCLUDE_THREADS` | comma-separated decimal thread ids, e.g. `14475` | exclude nothing |

**Parse failures throw at import.** A channel string that is not one of the
four known names, or an exclude entry that is not `/^[0-9]+$/`, aborts the
process before the transport binds. Silent fallback to unscoped is the one
failure mode that would produce a plausible-looking but fictional cell-B
number, so the module refuses to degrade. (Same reasoning as F9's live hazard:
fail loudly rather than quietly score the wrong thing.)

### The two SQL fragments

`searchSolvedIssues` gains an optional second parameter. Existing callers are
unchanged and keep compiling -- verified by repo-wide grep at drafting time:
`apps/qw-oracle/eval/eval.ts:71`, `serve/mcp/scripts/verify-rewrite.ts:136`,
`serve/mcp/src/index.ts:157`, plus the non-running
`scripts/calibration/faq-gate/faq-gate-retrieve.ts:118` (F4).

```ts
export async function searchSolvedIssues(
  args: Args,
  ctx: RetrievalContext = {},
): Promise<ToolResponse<ThreadHit>> {
```

Fragments follow the repo idiom verbatim -- a `db\`AND ...\`` fragment or an
empty `db\`\``, exactly as `search-entities.ts:32-36` builds `projectClause` /
`typeClause`:

```ts
const channelClause = ctx.channels?.length
  ? db`AND channel_name IN ${db(ctx.channels)}`
  : db``;
const excludeClause = ctx.excludeThreadIds?.length
  ? db`AND id <> ALL(${ctx.excludeThreadIds}::bigint[])`
  : db``;
```

Both fragments are interpolated into BOTH `lexicalCandidates` and
`semanticCandidates`, between the existing `WHERE` predicate and the
`ORDER BY`. Both fragment shapes were executed through postgres-js against the
twin at drafting time and return the expected rows (see Phase-boundary probe
3/4).

**`fanout` stays `limit * 4`, hardcoded, and nothing filters after fusion**
(F8). The filters go in the SQL so an excluded or off-channel thread never
consumes one of the 12 candidate slots; post-fusion filtering would shrink the
result set and, for channel scope, destroy the B-vs-C experiment whose whole
mechanism is candidate-slot crowding.

### The pgvector filter hazard and its fix (F17 -- answers REVIEW-BRIEF R4)

The vector path is NOT safe under a filter by default, and this is measured,
not assumed:

- `chat_threads_embedding_hnsw` is an unfiltered
  `USING hnsw (topic_embedding vector_cosine_ops)` index -- there is no
  partial, channel-scoped variant. (`pg_indexes` on the twin, run at drafting
  time.)
- pgvector on the twin is **0.8.2**, with `hnsw.ef_search = 40` and
  `hnsw.iterative_scan = off` (all three read live via `SHOW`).
- With `iterative_scan = off`, the HNSW scan yields at most ~`ef_search`
  candidates and the `channel_name` predicate is applied to those, so a
  channel-scoped query can return FEWER rows than `LIMIT`. Measured against
  the twin: with `#dev-corner` query vectors, a `#helpdesk`-scoped
  `LIMIT 12` returned **1** row where the unscoped query returned 12; over 8
  `#quakeworld` query vectors it returned 0-5 rows. With realistic
  `#helpdesk` query vectors (40 solved threads, self-excluded) it starved on
  **4 of 40** queries, min 5 rows of 12, mean 11.60.
- With `hnsw.iterative_scan = strict_order`, the same 40 queries returned
  12/12 every time (mean 12.00), and the scoped `EXPLAIN ANALYZE` cost
  2.7 ms.

Left unfixed this is not a cosmetic recall dip: it silently starves cell B's
semantic candidate list on roughly a tenth of questions, which would read out
as "scoping hurts" when the cause is index mechanics, not corpus dilution.
That is precisely the confound R4 asks for a probe against.

**Ruling:** `semanticCandidates` runs inside a transaction that sets
`hnsw.iterative_scan = strict_order` for that statement only, ALWAYS (not
conditionally on the context), using the postgres-js transaction form -- verified
end to end through postgres-js at drafting time (1 row without it, 12 with it):

```ts
return db.begin(async (sql) => {
  // pgvector 0.8 iterative scan. Without it an HNSW scan stops after
  // ~hnsw.ef_search (40) candidates and applies the channel/exclusion filter
  // to those, silently returning fewer than `fanout` rows on ~10% of scoped
  // queries (arc finding F17, measured on the twin). strict_order, not
  // relaxed_order: RRF fuses on rank, so exact distance ordering is load-bearing.
  await sql`SET LOCAL hnsw.iterative_scan = strict_order`;
  return sql<ThreadRow[]>`
    SELECT ...
  `;
});
```

Why always, not only when a filter is present: cell C also carries the
leave-one-out predicate, so both cells are filtered queries; and the unscoped
top-12 is byte-identical under `off` and `strict_order` (same 12 ids, same
order -- checked at drafting time) with no latency cost (1.07 ms vs 0.60 ms
unscoped). One code path, no cell-conditional execution shape, nothing for E7
symmetry to leak through.

### The two consumers

1. **In-process (E6, Phases 2-5):** the harness imports `searchSolvedIssues`
   from `serve/mcp/src/tools/search-solved-issues.ts` and passes a
   `RetrievalContext` object per question. No env involved.
2. **Spawned stdio server (E11, Phase 6):** `serve/mcp/src/index.ts`'s
   `search_solved_issues` dispatch case passes `ENV_RETRIEVAL_CONTEXT`:

   ```ts
   case 'search_solved_issues':
     return dispatchAndLog(
       { tool: 'search_solved_issues', queryText: typeof args.query === 'string' ? args.query : null },
       () => searchSolvedIssues(
         args as { query: string; limit?: number; max_messages_per_session?: number },
         ENV_RETRIEVAL_CONTEXT,
       ),
     );
   ```

   The `args as {...}` cast is unchanged, so nothing the model puts in
   `arguments` can reach the context. `TOOL_LIST`'s `search_solved_issues`
   `inputSchema` is NOT touched -- probe 2 enforces that mechanically.

Neither consumer reimplements the filter. A phase that needs different scoping
passes a different `RetrievalContext`; a phase that needs a different FILTER is
an amendment to this section.

## Contract (b) -- the run record (normative)

One record per (question x condition x answering model). Machine-readable form
is the exported `RunRecord` interface in `apps/qw-oracle/eval/sim/run-record.ts`;
this section is the normative prose. Phases 2-7 never invent fields (E2); a
needed-but-missing field is a finding routed back here as a dated amendment
plus a re-derive of anything computed from it.

```ts
export type Condition = 'A' | 'B' | 'C';
export type Verdict = 'match' | 'partial' | 'miss';   // spec D6. NOT NAILED/PARTIAL/WRONG (F10).
export type Grader = 'deepseek' | 'claude' | 'operator';
export type Stage = 'answered' | 'graded';

export interface ToolCallRound {
  round: number;                 // 1-based. F16: DeepSeek issues PARALLEL calls per round,
  calls: ToolCall[];             // so round structure is preserved, never flattened.
}

export interface ToolCall {
  tool: string;                  // MCP tool name, e.g. 'search_solved_issues'
  arguments: Record<string, unknown>;
  result_count: number | null;   // ToolResponse.results.length; null when the call threw
  match_quality: 'strong' | 'weak' | 'none' | null;
  error: string | null;
}

export interface Usage {
  // Field names copied verbatim from the DeepSeek response envelope as read by
  // scripts/load-chat/fence-external.ts:279-312, so there is no translation
  // layer to get wrong. Zeros in the Claude cells (no usage envelope, E11).
  prompt_tokens: number;
  prompt_cache_hit_tokens: number;
  prompt_cache_miss_tokens: number;   // priced differently from cache hits -- E10 needs both
  completion_tokens: number;
  reasoning_tokens: number;           // completion_tokens_details.reasoning_tokens; 93% of
                                      // completion on the corpus fence -- invisible without this
  cost_usd: number;                   // from the pricing table pinned in one module (E10)
}

export interface Grade {
  verdict: Verdict;
  by: Grader;
  spot_checked: boolean;
  rationale: string | null;
  graded_at: string;                  // ISO-8601
}

export interface RunRecord {
  schema_version: 'eval-run-record-v1';
  run_id: string;                     // ULID, one per harness invocation (pilot vs bulk must not pool)
  record_id: string;                  // `${thread_id}:${condition}:${answering_model}` -- the resume key (E9)
  stage: Stage;                       // 'answered' then 'graded'; see log-structure note below

  // Question identity
  thread_id: string;                  // chat_threads.id as string (ThreadHit.thread_id convention)
  thread_key: string;                 // chat_threads.thread_key -- survives an id re-fence (E4, F1)
  domain: string;                     // faq-domains-resolve.ts key, e.g. 'weapon-scripts'
  era: number;                        // date_range_start year, 2020-2025 (F2)
  question: string;                   // the player's opening message(s), verbatim

  // What was run
  condition: Condition;
  answering_model: string;            // e.g. 'deepseek-v4-flash'
  retrieval_context: {                // what the server was ACTUALLY told, not what was intended
    channels: string[] | null;
    exclude_thread_ids: string[];
  };

  // What came back
  tool_calls: ToolCallRound[];        // [] in cell A by construction (no tools attached, D8)
  answer: string;
  truth: string;                      // D6 stage 1 key extraction
  grade: Grade | null;                // null while stage === 'answered'
  divergent: boolean;                 // D6: differs from the thread's fix but looks plausibly correct

  // Accounting
  usage: Usage;
  latency_ms: number;
  started_at: string;                 // ISO-8601
  error: string | null;               // non-null = the pass failed; answer/grade are not comparable
}
```

**Log structure (reconciles E2 with E9).** E2 says one record per (question x
condition); E9 says one JSONL line per (question x condition x stage). Both
hold: the JSONL is append-only and log-structured -- the answering pass appends
a line with `stage: 'answered'` and `grade: null`, the grading pass appends a
line with the same `record_id` and `stage: 'graded'` carrying the filled
`grade`. The record for a `record_id` is the LAST line bearing it. Resume
(E9) skips on the `(record_id, stage)` pair, so a crash between answering and
grading loses neither. Recorded as F19 because it is a reading later phases
must share, not a free choice.

**Grading input is a projection, and the projection is part of the contract.**
E8 requires the grader to be condition-blind. `run-record.ts` therefore also
exports:

```ts
export interface GradingInput { question: string; answer: string; truth: string; }
export function toGradingInput(r: RunRecord): GradingInput;
```

The function returns exactly those three fields -- no `condition`, no
`retrieval_context`, no `tool_calls`, no `answering_model`, no `domain`.
Phase 2's E8 probe then reduces to asserting that the grader payload is
`toGradingInput`'s output, which probe 7 already pins here.

**Validator.** `validateRunRecord(value: unknown)` returns
`{ ok: true; record: RunRecord } | { ok: false; errors: string[] }`.
Hand-rolled -- the repo has no schema library anywhere (`zod` appears in no
`package.json`; checked at drafting time), and adding one for a nine-field
check is exactly the complexity grug says no to. It must reject, by name and
with a message, at least: an unknown `verdict` string (in particular
`NAILED` / `PARTIAL` / `WRONG`, the F10 trap), a `condition` outside `A|B|C`,
a missing `thread_key`, a non-integer `era`, and a `stage: 'graded'` record
with `grade: null`.

**Fixture.** `apps/qw-oracle/eval/sim/fixtures/run-record.example.json` -- one
realistic cell-C record with two tool-call rounds (the second round having two
parallel calls, per F16), a filled grade, and non-zero reasoning tokens. It is
committed, and probe 7 round-trips it through the validator.

## Inputs from previous phase

Phase 1 is the arc's first phase. These are preconditions, each probed
read-only at drafting time (2026-08-06) unless marked otherwise:

- **`.env` is absent from the worktree and must be brought in.**
  `/home/dev/projects/quakeworld/apps/qw-oracle/.env` exists (mode 600) and its
  `DATABASE_URL` host is `qw-oracle-postgres-dev:5432/qw_oracle` -- the twin,
  not prod. `/home/dev/projects/quakeworld-eval/apps/qw-oracle/.env` does not
  exist; `.gitignore` lines 19-20 (`.env`, `.env.*`) are why. `VOYAGE_API_KEY`
  is present and non-empty.
- **`node_modules` is absent from the worktree**, at the root AND under
  `apps/qw-oracle/serve/mcp/`. The monorepo root declares
  `workspaces: ["apps/*", "packages/*"]`, which does NOT cover the nested
  `apps/qw-oracle/serve/mcp` package -- it carries its own `package.json` and
  `bun.lock`, and `@modelcontextprotocol/sdk` resolves ONLY from
  `apps/qw-oracle/serve/mcp/node_modules`. Two installs are required.
- **Bun loads `.env` from the CWD, and only from the CWD.** Probed: `bun -e`
  from `apps/qw-oracle/` sees `DATABASE_URL`; from `apps/qw-oracle/serve/mcp/`
  and from the monorepo root it does not. Running the server from
  `serve/mcp/` throws `DATABASE_URL is not set` at `shared/db.ts:10` before any
  DB contact (confirmed by running it -- it fails at import, so no write and no
  connection occurred).
- **Dev twin reachable and shaped as expected.** `psql` is at `/usr/bin/psql`;
  PostgreSQL 16.13, `vector` extension 0.8.2. `chat_threads` = 40,219 rows,
  0 with a NULL `topic_embedding`; per channel `#quakeworld` 22,073 / 5,316
  solved, `#dev-corner` 10,359 / 3,714, `#helpdesk` 6,772 / 3,694, `#antilag`
  1,015 / 410 -- matching the spec's prod figures exactly (twin parity holds).
  `reconstruction_version` is `fence-sonnet-v2` for all rows.
- **Indexes:** `chat_threads_channel_started` btree `(channel_name,
  date_range_start)`, `chat_threads_content_tsv_gin`,
  `chat_threads_embedding_hnsw` (unfiltered), `chat_threads_thread_key_key`
  unique on `thread_key`.
- **Telemetry tables exist with pre-run counts** `query_log` 199,
  `embedding_api_log` 2,017, `oracle_meta` 19.
  `oracle_meta.embedding_space_verified_at` is 55.3 h old, past the 24 h TTL,
  so the FIRST server start of this phase will make one Voyage call and one
  `oracle_meta` upsert -- expected, inside E3's F9 carve-out.
- **Baseline typecheck is green.** `tsc --noEmit` under
  `apps/qw-oracle/tsconfig.json` exits 0 today (run in the main checkout,
  read-only, no emit), so any failure after this phase's include change is
  attributable to this phase.
- **MCP SDK 1.30.0** is what `serve/mcp` pins. `StdioServerParameters` carries
  both `cwd` and `env`; when `env` is omitted the child gets
  `getDefaultEnvironment()`, whose Linux allowlist is exactly
  `HOME, LOGNAME, PATH, SHELL, TERM, USER` -- so `DATABASE_URL` and the
  `L2_RETRIEVAL_*` vars are NOT inherited and must be supplied deliberately
  (read from `node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js`).
- **Frozen frame inputs exist and are read-only to this arc:**
  `scripts/calibration/faq-gate/faq-clusters.json` and
  `faq-domains-resolve.ts` (exports `loadSortedClusters`, `resolveDomainThreads`,
  `META`). Nothing in this phase writes into `faq-gate/` (E12, F14).

## Files touched

**Created:**
- `apps/qw-oracle/serve/mcp/src/tools/retrieval-context.ts`
- `apps/qw-oracle/eval/sim/run-record.ts`
- `apps/qw-oracle/eval/sim/fixtures/run-record.example.json`
- `apps/qw-oracle/eval/sim/validate-run-record.ts` (CLI over the validator)
- `apps/qw-oracle/eval/sim/probe-retrieval.ts` (in-process candidate-level probe)
- `apps/qw-oracle/eval/sim/probe-stdio-scope.ts` (spawned-server probe, F6 + E11)
- `apps/qw-oracle/eval/sim/telemetry-baseline.json`
- `apps/qw-oracle/.env` (symlink to the main checkout's file; gitignored, not committed)

**Modified:**
- `apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts` (ctx param, two
  fragments in both paths, `SET LOCAL` on the vector path, two candidate
  functions exported for the boundary probe)
- `apps/qw-oracle/serve/mcp/src/index.ts` (one dispatch case gains a second
  argument; `TOOL_LIST` untouched)
- `apps/qw-oracle/tsconfig.json` (`include` gains `eval/sim/**/*` -- see Task 4
  for why NOT `eval/**/*`)
- `apps/qw-oracle/.gitignore` (one line for run artifacts, E13)

**Deleted:** none.

## Tasks

### Task 1 -- Worktree bring-up: env + deps · `inline`

**Goal:** the worktree can run Bun and reach the twin.

**Files:** `apps/qw-oracle/.env` (symlink), two `node_modules` trees (not in git).

**Steps:**
1. Symlink rather than copy, so a key rotation in the main checkout does not
   leave a stale secret behind in a second place:

       ln -sfn /home/dev/projects/quakeworld/apps/qw-oracle/.env /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env

   Verified at drafting time that both Bun's `.env` loader and shell `.` source
   follow the symlink.
2. Install both packages (the nested MCP package is not a workspace member):

       cd /home/dev/projects/quakeworld-eval && bun install
       cd /home/dev/projects/quakeworld-eval/apps/qw-oracle/serve/mcp && bun install

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'console.log((process.env.DATABASE_URL||"").split("@")[1])'
    ls -d /home/dev/projects/quakeworld-eval/node_modules /home/dev/projects/quakeworld-eval/apps/qw-oracle/serve/mcp/node_modules/@modelcontextprotocol

Expect `qw-oracle-postgres-dev:5432/qw_oracle` and both paths listed.

### Task 2 -- Retrieval context: the carrier and the two SQL fragments · `agent (session-tier, high)` -- ARC CONTRACT OWNER

**Goal:** scope and exclusion take effect inside both retrieval paths, the
agent-visible surface is unchanged, and the vector path no longer starves under
a filter.

**Files:** `serve/mcp/src/tools/retrieval-context.ts` (new),
`serve/mcp/src/tools/search-solved-issues.ts` (modify),
`serve/mcp/src/index.ts` (modify).

**Steps:**
1. Write `retrieval-context.ts` per Contract (a): the `RetrievalContext`
   interface, `parseEnvContext()` reading `L2_RETRIEVAL_CHANNELS` and
   `L2_RETRIEVAL_EXCLUDE_THREADS`, and the module-level `ENV_RETRIEVAL_CONTEXT`
   const. Throw on any unparsable value; validate channel names against the
   four known values (`#quakeworld`, `#dev-corner`, `#helpdesk`, `#antilag`)
   and exclude ids against `/^[0-9]+$/`. Match the file-header comment style of
   its siblings in `tools/`.
2. In `search-solved-issues.ts`, add the optional `ctx: RetrievalContext = {}`
   second parameter to `searchSolvedIssues` and thread it into both candidate
   functions (`lexicalCandidates(query, fanout, ctx)` /
   `semanticCandidates(vec, fanout, ctx)`). Build `channelClause` and
   `excludeClause` exactly as shown in Contract (a); place them between the
   existing `WHERE` predicate and `ORDER BY` in both queries, matching the
   indentation `search-entities.ts:41-45` uses for its clauses.
3. Wrap the `semanticCandidates` query in `db.begin` with
   `SET LOCAL hnsw.iterative_scan = strict_order`, carrying the comment from
   Contract (a) (it is a why-comment: the code cannot say that omitting it
   silently starves 10% of scoped queries). Leave `lexicalCandidates` outside a
   transaction -- the GIN path has no `ef_search` analogue and does not starve
   (measured: helpdesk-scoped lexical returns every matching row up to
   `fanout`).
4. Do NOT touch `fanout` (`limit * 4`), the RRF call, the threshold constants,
   or anything post-fusion (F8).
5. Export `lexicalCandidates` and `semanticCandidates` with a one-line comment
   saying they are exported for the Phase 1 boundary probe and are not part of
   the MCP surface. This is a deliberate, minimal interface widening: the
   starvation bug is invisible at the tool's output level (the lexical path
   still supplies enough candidates to fill `limit`), so candidate-level
   observability is the only way to prove the fix without duplicating the SQL
   in a probe and inviting drift.
6. In `index.ts`, import `ENV_RETRIEVAL_CONTEXT` and pass it as the second
   argument in the `search_solved_issues` dispatch case (~L154-158). Change
   nothing else -- in particular not `TOOL_LIST`.
7. Write `eval/sim/probe-retrieval.ts`: for a handful of `#helpdesk` solved
   threads, call the exported candidate functions with and without a
   `{ channels: ['#helpdesk'], excludeThreadIds: [<self>] }` context at
   `fanout = 12`, and assert (a) scoped results are all `#helpdesk`, (b) the
   excluded id never appears, (c) the scoped semantic path returns 12 rows on
   every probed question. Print one `PASS`/`FAIL` line per assertion and exit
   non-zero on any FAIL.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-retrieval.ts

Expect all PASS and exit 0. Cross-check the same semantics at the raw-SQL level
with Phase-boundary probes 3, 4 and 5.

### Task 3 -- Dev MCP over stdio, against the twin · `agent (workhorse, medium)`

**Goal:** discharge F6 -- a dev MCP instance is one `bun` invocation, no
container, no Cloudflare, no Tailscale -- and prove E11's env carrier end to end.

**Files:** `eval/sim/probe-stdio-scope.ts` (new).

**Steps:**
1. Model the client on `serve/mcp/scripts/test-call.ts` (`Client` +
   `StdioClientTransport`, `bun run <abs path to serve/mcp/src/index.ts>`), with
   two deliberate differences that file does not have:
   - pass `cwd: <abs path to apps/qw-oracle>` so the child finds `.env`
     (without it the child inherits the parent's cwd and throws
     `DATABASE_URL is not set`; see F20);
   - pass `env: { ...getDefaultEnvironment(), L2_RETRIEVAL_CHANNELS: '#helpdesk',
     L2_RETRIEVAL_EXCLUDE_THREADS: '<chosen id>' }`, importing
     `getDefaultEnvironment` from
     `@modelcontextprotocol/sdk/client/stdio.js` -- the SDK does NOT inherit the
     parent env, only a six-name allowlist.
2. Assert, in order:
   - `listTools()` returns 13 tools (the current `TOOL_LIST` length);
   - the `search_solved_issues` entry's `inputSchema.properties` key set is
     exactly `query`, `limit`, `max_messages_per_session` -- no scope, no
     exclusion, nothing new (E5's agent-invisibility, mechanically);
   - a `search_solved_issues` call with a query whose unscoped top hits are
     known to span channels returns only `#helpdesk` threads and never the
     excluded `thread_id`.
3. Set `stderr: 'pipe'` on the transport and echo the child's stderr on
   failure -- the embedding-space verifier runs BEFORE transport bind and can
   `process.exit(1)`, and a silent spawn failure would look like an empty
   result set (F9's live hazard).
4. Print `PASS`/`FAIL` per assertion; exit non-zero on any FAIL.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-stdio-scope.ts

Expect all PASS and exit 0. Note this run writes telemetry rows (one
`query_log` + one `embedding_api_log` per tool call, plus one `oracle_meta`
upsert on the first start past the 24 h TTL) -- expected under E3's carve-out
and the reason Task 5 records the baseline first.

### Task 4 -- The run-record module, fixture, and validator · `agent (workhorse, high)`

**Goal:** the record shape exists in code, is typechecked, and a committed
fixture proves it round-trips.

**Files:** `eval/sim/run-record.ts` (new),
`eval/sim/fixtures/run-record.example.json` (new),
`eval/sim/validate-run-record.ts` (new), `apps/qw-oracle/tsconfig.json`
(modify), `apps/qw-oracle/.gitignore` (modify).

**Steps:**
1. Write `run-record.ts` exactly as Contract (b) specifies -- types,
   `validateRunRecord`, `GradingInput`, `toGradingInput`. Comments explain why
   a field exists (which decision or finding put it there), not what it holds.
2. Write the fixture: one cell-C record, `stage: 'graded'`, two tool-call
   rounds with the second carrying two parallel calls (F16), non-zero
   `reasoning_tokens` and `prompt_cache_hit_tokens`, a real `domain` key from
   `faq-domains-resolve.ts`'s `META`, and an `era` in 2020-2025 (F2).
3. Write `validate-run-record.ts` as a CLI: reads a path (default: the
   fixture), validates, prints `OK <record_id>` or the error list, exits 0/1.
4. `tsconfig.json`: add `"eval/sim/**/*"` to `include`. **Not `"eval/**/*"`:**
   `eval/eval.ts:75` reads `h.session_id` off a `ThreadHit`, which has no such
   field, so widening to the whole `eval/` tree turns today's green
   `bun run typecheck` red on a pre-existing defect this arc did not cause and
   does not own (F18 -- routed to HANDOVER, not fixed here).
5. `.gitignore`: append, under a why-comment, `eval/sim/records/` (E13 --
   conclusions are committed, evidence is regenerated). The fixture lives
   outside that directory, so no negation pattern is needed.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo TYPECHECK_OK
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/validate-run-record.ts

Expect `TYPECHECK_OK` and `OK <record_id>`.

### Task 5 -- Telemetry baseline · `inline`

**Goal:** later phases' telemetry volume is attributable (E3, F9).

**Files:** `eval/sim/telemetry-baseline.json` (new).

**Steps:** run the SQL below BEFORE Task 2's and Task 3's probes make any tool
call, and commit the output verbatim as the file's contents.

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT json_build_object('captured_at', now(), 'query_log', (SELECT count(*) FROM query_log), 'embedding_api_log', (SELECT count(*) FROM embedding_api_log), 'oracle_meta', (SELECT count(*) FROM oracle_meta), 'chat_threads', (SELECT count(*) FROM chat_threads))"

Drafting-time values for comparison (2026-08-06, will have drifted by
execution): `query_log` 199, `embedding_api_log` 2,017, `oracle_meta` 19,
`chat_threads` 40,219.

**Verification probe:**

    jq -e '.query_log >= 0 and .embedding_api_log >= 0 and .chat_threads == 40219' /home/dev/projects/quakeworld-eval/apps/qw-oracle/eval/sim/telemetry-baseline.json && echo YES

Expect `true` + `YES`. A `chat_threads` count other than 40,219 means the
corpus moved between drafting and execution -- stop and check E4 / F3 (a
harvest re-fence) before proceeding, because the frozen frame Phase 3 depends
on would have shifted.

## Phase-boundary verification

Every probe below runs as written from a shell in the worktree, after Task 1.
Probes 3-6 and 8 were executed verbatim at drafting time against the twin (with
the main checkout's `.env` path, which Task 1 makes identical) and their
expected values are the observed ones. Probes 1, 2 and 7 exercise code this
phase creates and are stated with their exact expected stdout.

**1. Toolchain and env.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo TYPECHECK_OK
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'console.log((process.env.DATABASE_URL||"").split("@")[1])'

Expect `TYPECHECK_OK` then `qw-oracle-postgres-dev:5432/qw_oracle` -- YES/NO.

**2. Agent-visible surface unchanged, and the spawned server honours the env
carrier** (E5 + E11 + F6 + F7 in one):

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-stdio-scope.ts

Expect every line `PASS` and exit 0: 13 tools listed (counted in `TOOL_LIST` at
drafting time: lookup_entity, search_entities, get_concept_note,
search_solved_issues, lookup_map, search_maps, lookup_gameplay_entity,
lookup_mechanic, search_gameplay_entities, search_mechanics, describe_mode,
search_concepts, redirect_to_human); `search_solved_issues`
`inputSchema.properties` key set exactly `query,limit,max_messages_per_session`;
all returned threads `#helpdesk`; excluded `thread_id` absent -- YES/NO.

**3. Channel scope bites in the LEXICAL path** (raw SQL, mirrors the shipped
fragment):

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT channel_name, count(*) FROM (SELECT id, channel_name FROM chat_threads WHERE content_tsv @@ websearch_to_tsquery('simple','rpickup') ORDER BY ts_rank(content_tsv, websearch_to_tsquery('simple','rpickup')) DESC LIMIT 12) s GROUP BY 1 ORDER BY 2 DESC;"
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM (SELECT id FROM chat_threads WHERE content_tsv @@ websearch_to_tsquery('simple','rpickup') AND channel_name='#helpdesk' ORDER BY ts_rank(content_tsv, websearch_to_tsquery('simple','rpickup')) DESC LIMIT 12) s;"

Observed 2026-08-06: unscoped top-12 is `#quakeworld` 7 / `#dev-corner` 5 and
contains ZERO `#helpdesk` threads; scoped returns 3 (which is every helpdesk
row matching that tsquery, not a truncation). Expect: the unscoped set is
mixed-channel, the scoped set is helpdesk-only -- YES/NO. The exact split is a
drafting-time baseline and may drift; the mixed-vs-scoped contrast is the
assertion. (It is also the dilution mechanism D1 names, visible in one query.)

**4. Leave-one-out frees the slot it vacates** (raw SQL; base and excluded
lists must be the SAME LENGTH, which is what proves the filter runs before
`LIMIT` rather than after fusion -- F8):

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "WITH base AS (SELECT id FROM chat_threads WHERE content_tsv @@ websearch_to_tsquery('simple','gl_outline ruleset') ORDER BY ts_rank(content_tsv, websearch_to_tsquery('simple','gl_outline ruleset')) DESC LIMIT 12), excl AS (SELECT id FROM chat_threads WHERE content_tsv @@ websearch_to_tsquery('simple','gl_outline ruleset') AND id <> 14475 ORDER BY ts_rank(content_tsv, websearch_to_tsquery('simple','gl_outline ruleset')) DESC LIMIT 12) SELECT (SELECT count(*) FROM base) AS base_n, (SELECT count(*) FROM excl) AS excl_n, (SELECT count(*) FROM base WHERE id=14475) AS base_has, (SELECT count(*) FROM excl WHERE id=14475) AS excl_has;"

Expect `12|12|1|0` -- YES/NO. (Thread 14475 is a `#helpdesk` thread that ranks
first for that tsquery; confirmed at drafting time.)

**5. F17 regression guard -- the vector path does not starve under a filter:**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SET hnsw.iterative_scan = off; WITH q AS (SELECT id, topic_embedding FROM chat_threads WHERE channel_name='#helpdesk' AND topic_embedding IS NOT NULL AND resolution_status='solved' ORDER BY id LIMIT 40) SELECT count(*) FILTER (WHERE got < 12) AS starved, min(got) AS min_rows FROM (SELECT (SELECT count(*) FROM (SELECT t.id FROM chat_threads t WHERE t.topic_embedding IS NOT NULL AND t.channel_name='#helpdesk' AND t.id <> q.id ORDER BY t.topic_embedding <=> q.topic_embedding LIMIT 12) s) AS got FROM q) x;"
    psql "$DATABASE_URL" -Atc "SET hnsw.iterative_scan = strict_order; WITH q AS (SELECT id, topic_embedding FROM chat_threads WHERE channel_name='#helpdesk' AND topic_embedding IS NOT NULL AND resolution_status='solved' ORDER BY id LIMIT 40) SELECT count(*) FILTER (WHERE got < 12) AS starved, min(got) AS min_rows FROM (SELECT (SELECT count(*) FROM (SELECT t.id FROM chat_threads t WHERE t.topic_embedding IS NOT NULL AND t.channel_name='#helpdesk' AND t.id <> q.id ORDER BY t.topic_embedding <=> q.topic_embedding LIMIT 12) s) AS got FROM q) x;"

Each command prints psql's `SET` echo and then one result row. Observed
2026-08-06: result row `4|5` under `off`, `0|12` under `strict_order`. The
assertion is the SECOND command's result row reading `0|12`. If the first
command's row ever reads `0|12` too, the twin's `hnsw.ef_search` /
`iterative_scan` defaults changed; record a finding rather than dropping the
`SET LOCAL` (the fix costs nothing and a server default is not ours to rely
on) -- YES/NO.

**6. Cell C is unchanged by the fix** (the `SET LOCAL` must not perturb the
unscoped path, or E7 symmetry breaks in the SQL layer):

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    VEC=$(psql "$DATABASE_URL" -Atc "SELECT topic_embedding::text FROM chat_threads WHERE channel_name='#dev-corner' AND topic_embedding IS NOT NULL ORDER BY id LIMIT 1;")
    A=$(psql "$DATABASE_URL" -Atc "SET hnsw.iterative_scan = off; SELECT string_agg(id::text, ',') FROM (SELECT id FROM chat_threads WHERE topic_embedding IS NOT NULL ORDER BY topic_embedding <=> '$VEC'::vector LIMIT 12) s;" | tail -1)
    B=$(psql "$DATABASE_URL" -Atc "SET hnsw.iterative_scan = strict_order; SELECT string_agg(id::text, ',') FROM (SELECT id FROM chat_threads WHERE topic_embedding IS NOT NULL ORDER BY topic_embedding <=> '$VEC'::vector LIMIT 12) s;" | tail -1)
    test "$A" = "$B" && echo IDENTICAL

Expect `IDENTICAL` -- YES/NO. (Observed identical, same 12 ids in the same
order, at drafting time.)

**7. The record contract holds and the grading projection is condition-free:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/validate-run-record.ts
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'import { validateRunRecord, toGradingInput } from "./eval/sim/run-record.ts"; const r = await Bun.file("eval/sim/fixtures/run-record.example.json").json(); const ok = validateRunRecord(r); if (!ok.ok) { console.log("FAIL", ok.errors); process.exit(1); } const bad = validateRunRecord({ ...r, grade: { ...r.grade, verdict: "NAILED" } }); console.log("rejects NAILED:", bad.ok === false); console.log("grading keys:", Object.keys(toGradingInput(ok.record)).sort().join(","));'

Expect `OK <record_id>`, then `rejects NAILED: true` and
`grading keys: answer,question,truth` -- exactly three keys, none of them
`condition` -- YES/NO.

**8. Telemetry baseline committed and the corpus has not moved:**

    jq -e '.chat_threads == 40219' /home/dev/projects/quakeworld-eval/apps/qw-oracle/eval/sim/telemetry-baseline.json && echo YES
    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM chat_threads;"

Expect `true` + `YES` and `40219` from the live query -- YES/NO. A mismatch is
an E4 / F3 event, not a probe bug.

## Outputs to next phase

Phases 2-7 may rely on exactly these:

- **`RetrievalContext`** (`serve/mcp/src/tools/retrieval-context.ts`): the
  `{ channels?: string[]; excludeThreadIds?: string[] }` shape, and the rule
  that both fields are applied inside the SQL of BOTH retrieval paths of
  `search_solved_issues` before `fanout`. Cell B is
  `{ channels: ['#helpdesk'], excludeThreadIds: [threadId] }`; cell C is
  `{ excludeThreadIds: [threadId] }`; production/no-eval is `{}`.
- **`searchSolvedIssues(args, ctx?)`** -- the in-process entry point for E6's
  cells (Phases 2, 4, 5). The first parameter is unchanged, so every existing
  call site still compiles.
- **`ENV_RETRIEVAL_CONTEXT` and the two env vars**
  (`L2_RETRIEVAL_CHANNELS`, `L2_RETRIEVAL_EXCLUDE_THREADS`) -- E11's per-question
  carrier for Phase 6's spawned servers. Env is read once at import, so one
  server process per question is required for per-question exclusion (F7);
  unparsable values abort the process rather than silently unscoping.
- **A spawnable dev MCP recipe** (Phase 6): `bun run <repo>/apps/qw-oracle/serve/mcp/src/index.ts`
  with `cwd` set to `<repo>/apps/qw-oracle` and `env` merged over
  `getDefaultEnvironment()`. No container, no Cloudflare, no Tailscale, no
  auth. `eval/sim/probe-stdio-scope.ts` is the working reference.
- **`RunRecord` + `validateRunRecord` + `toGradingInput` + the committed
  fixture** (`eval/sim/run-record.ts`, `eval/sim/fixtures/run-record.example.json`).
  Phase 2 writes records through this module; Phase 4's explorer generator and
  Phase 7's findings doc read it. Verdict vocabulary is `match | partial | miss`
  and nothing else. Records are log-structured JSONL: append per
  `(record_id, stage)`, last line wins, resume skips completed pairs (E9).
  Run artifacts live under `eval/sim/records/` and are gitignored (E13).
- **The telemetry baseline** (`eval/sim/telemetry-baseline.json`): pre-run
  `query_log` / `embedding_api_log` / `oracle_meta` / `chat_threads` counts, so
  Phase 5 and Phase 7 can attribute row growth to the arc.
- **What this phase does NOT ship**, so no later phase plans on it: `TOOL_LIST`
  is not exported from `index.ts` (F20b), so E6's "import the tool schemas, do
  not hand-write them" needs a one-word `export` that Phase 2 adds; the DeepSeek
  client, the pricing table, the JSONL writer, and the resume logic are all
  Phase 2's; `faq-domains-resolve.ts` is untouched and stays Phase 3's input.

## Open questions

1. **`hnsw.iterative_scan = strict_order` vs `relaxed_order` vs raising
   `ef_search`.** Default: `strict_order`, set per-statement via `SET LOCAL`
   inside `db.begin`. Reason: RRF fuses on RANK, so exact distance ordering is
   load-bearing and `relaxed_order`'s reordering would inject noise into
   precisely the comparison being measured; and raising `ef_search` needs a
   value tuned to filter selectivity, which varies per question, whereas
   iterative scan is self-limiting (`hnsw.max_scan_tuples` 20,000 on the twin).
   Measured cost of `strict_order`: 2.7 ms scoped, 0.60 ms unscoped -- cheaper
   than `off` on the unscoped path. Overrule: operator, or a Phase 2/5 finding
   showing a latency problem at bulk scale.
2. **Apply the iterative-scan setting always, or only when the context carries
   a filter.** Default: always -- both cells carry the leave-one-out predicate
   anyway, and one code path means no cell-conditional SQL shape for an E7
   asymmetry to hide in. The unscoped top-12 is identical either way (probe 6).
   Overrule: operator.
3. **`channels: string[]` vs a single `channel: string`.** Default: array.
   Reason: spec D1 explicitly parks "localizing the source channel is a cheap
   follow-up on the same harness" -- with an array that follow-up is a caller
   change and no contract amendment. The SQL fragment is the same either way.
   Overrule: operator.
4. **Exporting `lexicalCandidates` / `semanticCandidates` for the boundary
   probe.** Default: export them. Reason: the starvation defect is invisible at
   the tool's output level, so the alternative is a probe that re-types the SQL
   and drifts away from the implementation it is supposed to guard. Cost: two
   more names in a module's surface, both marked test-only. Overrule: operator,
   or a reviewer who prefers a `__debug` field on the response (rejected here
   because that WOULD change the agent-visible payload).
5. **`stage` on the record.** Default: present, with log-structured
   last-line-wins semantics (F19). Reason: it is the only reading that satisfies
   E2 (one record per question x condition) and E9 (one line per stage) at the
   same time, and it makes resume exact. Overrule: operator; any change here is
   a contract amendment because Phase 2's writer and Phase 4's reader both key
   on it.
6. **Symlink vs copy for the worktree `.env`.** Default: symlink. Reason: one
   copy of the secret on disk, and a rotation in the main checkout propagates.
   Risk: deleting the main checkout breaks the worktree. Overrule: operator.

## Recovery

- **`bun install` fails at the worktree root or under `serve/mcp/`.** Both
  packages have committed lockfiles (`bun.lock` at the root and at
  `apps/qw-oracle/serve/mcp/`), so a network-flaky install is a retry, not a
  resolution problem. Do NOT delete a lockfile to "fix" it -- a re-resolution
  would drift the MCP SDK version away from the 1.30.0 this phase's stdio
  behaviour was verified against.
- **The server exits immediately when spawned.** Two known causes, in order of
  likelihood. (1) Wrong cwd: the child gets only
  `HOME/LOGNAME/PATH/SHELL/TERM/USER` from the parent, so `DATABASE_URL` comes
  from `.env` in its cwd and nowhere else -- the stderr line will be
  `DATABASE_URL is not set` from `shared/db.ts:10`. (2) The embedding-space
  verifier: it runs BEFORE transport bind and calls `process.exit(1)` when the
  build/query cosine falls under threshold. Its stderr line names the cosine.
  A Voyage OUTAGE is not fatal -- it warns and continues lexical-only -- which is
  its own hazard, because a lexical-only cell is a silently different cell.
  Piping the child's stderr (Task 3 step 3) is what makes all three
  distinguishable.
- **A retrieval probe returns zero rows.** Check `L2_RETRIEVAL_CHANNELS`
  spelling first: the channel names carry a leading `#`
  (`#helpdesk`, not `helpdesk`), and a value that survives the parser but
  matches no rows would look like a scoping success and produce an empty cell
  B. The parser's known-name validation is what prevents this; if it was
  loosened, tighten it back rather than debugging downstream.
- **`bun run typecheck` goes red after the tsconfig change.** Almost certainly
  the include pattern was widened to `eval/**/*` instead of `eval/sim/**/*`;
  the error will be `eval/eval.ts(75,46): Property 'session_id' does not exist
  on type 'ThreadHit'` -- a pre-existing defect (F18) that this arc does not
  own. Narrow the pattern back; do not fix `eval.ts` here (E14: findings are
  routed, not fixed in-arc).
- **`chat_threads` count differs from 40,219 at probe 8.** Stop. That is a
  corpus move (E4 / F3), and Phase 3's frozen frame plus every record taken
  either side of it become incomparable. Confirm against
  `.claude/calendar-checks.txt` whether the monthly harvest ran, record it as a
  finding, and get the operator's call before any later phase proceeds -- this
  is the failure that quietly invalidates the arc's numbers rather than
  breaking anything visibly.
- **Telemetry volume looks alarming mid-phase.** It is expected: one `query_log`
  row and one `embedding_api_log` row per tool call, plus an `oracle_meta`
  upsert on the first server start past the 24 h TTL. E3's carve-out covers it
  and the Task 5 baseline makes the growth attributable. What is NOT expected is
  growth in `chat_threads` / `thread_messages` / `messages` / `entities` /
  `concepts` -- any of those means something wrote to the corpus and the phase
  has broken E3.
