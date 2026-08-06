# Phase 1 -- eval surface contract (contract owner)

**Arc:** oracle-eval-simulation. **Ledger:** `decisions.md` E1-E14 (this phase
owns E2's and E5's contracts, and depends on E7's `limit`-pinning clause and
E2's delta-line invariant as amended 2026-08-06 -- mutable set
`{grade, stage, divergent, grade_usage}`, F44 + F49 -- and on E10's amendment
naming the three DeepSeek spend stages and their homes). **Spec:**
`docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md` D1/D2/D3/D6
+ the 2026-08-06 amendment. **Findings consumed:** F6, F7, F8, F9, F10, F13,
F14, F16, F44, F49. **Findings raised here:** F17-F22 (see the arc findings
ledger).
**Lane:** worktree `/home/dev/projects/quakeworld-eval`, branch
`eval-oracle-sim`.

## Goal

Lock the two contracts every later phase cites, and prove both against the dev
twin. Contract (a) is retrieval semantics: `search_solved_issues` gains
server-side, agent-invisible channel scoping, leave-one-out thread exclusion,
and a pinned candidate budget, all applied inside the SQL of BOTH retrieval
paths (E5, F8), carried by an explicit retrieval-context parameter that the
tool's `inputSchema` never mentions -- with two consumers sharing one
implementation (the in-process harness passes the context directly per E6; the
MCP dispatch fills it from env so a spawned stdio server honours it per
E11/F7). Contract (b) is the run record: a typed module, a committed fixture,
and a validator, with the verdict enum pinned to spec D6's
`match | partial | miss` (never the faq-gate vocabulary, F10). The phase ends
with the worktree runnable (`.env` present, deps installed, both typechecks
green), a committed telemetry baseline taken BEFORE any tool call, a dev MCP
instance provably spawnable over stdio against the twin with no container /
Cloudflare / Tailscale involved (F6), and SQL probes showing scope, exclusion
and budget take effect in both the lexical and the vector path.

## Contract (a) -- retrieval semantics (normative)

### The carrier

New module `apps/qw-oracle/serve/mcp/src/tools/retrieval-context.ts`:

```ts
// Server-side retrieval scoping for the eval simulation (arc plan E5).
// NEVER surfaced on any tool's inputSchema: the agent-visible surface must be
// byte-identical across conditions B and C (spec D2).
export interface RetrievalContext {
  /** Restrict thread retrieval to these chat_threads.channel_name values.
   *  Undefined or empty = whole corpus (cell C / production default). */
  channels?: string[];
  /** chat_threads.id values (as strings, matching ThreadHit.thread_id) removed
   *  from BOTH retrieval paths before fanout. Leave-one-out per spec D6. */
  excludeThreadIds?: string[];
  /** Overrides args.limit, and therefore fanout, regardless of what the model
   *  asked for. `limit` is a declared inputSchema property, so without this the
   *  candidate budget varies at the model's discretion and E7 cell symmetry is
   *  unenforced. See "The candidate budget is agent-controllable" below. */
  pinnedLimit?: number;
}
```

**What actually makes the context unreachable from tool `arguments`** (stated
precisely, because the obvious answer is wrong): it is NOT the `as` cast in the
dispatcher -- that is erased at compile time and the raw args object is
forwarded verbatim at runtime, so the cast provides zero protection. The
invariant is that the context is a **separate positional parameter, filled by
the dispatcher from a module-level const**, and the args object is only ever
passed as the first parameter. Nothing a model puts in `arguments` can land in
parameter two. A later phase "simplifying" `searchSolvedIssues(args, ctx)` to a
single options object would break this without touching any cast, so the
positional separation is the thing to protect, not the typing.

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
| `L2_RETRIEVAL_PINNED_LIMIT` | one positive integer, e.g. `3` | honour `args.limit ?? 3` |

**Parse failures throw at import.** A channel string that is not one of the
four known names, an exclude entry that is not `/^[0-9]+$/`, or a pinned limit
that is not a positive integer aborts the process before the transport binds.
Silent fallback to unscoped is the one failure mode that would produce a
plausible-looking but fictional cell-B number, so the module refuses to
degrade. (Same reasoning as F9's live hazard: fail loudly rather than quietly
score the wrong thing.)

### Full env census for a spawned server

Task 4 builds the child's environment by hand, so the census must be complete.
The SDK inherits only `HOME, LOGNAME, PATH, SHELL, TERM, USER`; everything else
either comes from `.env` in the child's cwd or must be passed explicitly.

| Var | Source | Value at drafting time | Why it matters here |
|---|---|---|---|
| `DATABASE_URL` | `.env` (cwd) | twin (`qw-oracle-postgres-dev:5432/qw_oracle`) | `shared/db.ts` throws at import without it |
| `MCP_TRANSPORT` | `.env` (cwd) | `stdio` | **assert it.** If it were `http` the server binds a port and never speaks stdio, and Task 4's probe hangs on a client handshake that can never complete |
| `VOYAGE_API_KEY` | `.env` (cwd) | present, non-empty | the semantic path degrades to lexical-only without it, which is a silently different cell |
| `EMBEDDING_MODEL_QUERY` | `.env` (cwd) | `voyage-4-lite` | query-side embedding model |
| `EMBEDDING_VERIFY_TTL_HOURS` | UNSET; code default `24` (`index.ts:63`) | 24 | governs the one Voyage call + `oracle_meta` upsert budgeted in Task 4 |
| `L2_RRF_STRONG_THRESHOLD` / `L2_RRF_WEAK_THRESHOLD` | UNSET; code defaults `0.02` / `0.005` | 0.02 / 0.005 | `match_quality` banding; must not differ between cells |
| `L2_RETRIEVAL_*` | passed explicitly by the probe | per question | this phase's carrier |

`MATCH_QUALITY_STRONG_THRESHOLD` / `MATCH_QUALITY_WEAK_THRESHOLD` are set in
`.env` (0.02 / 0.005) but belong to `search_entities`, not to this tool.

### The two SQL fragments

`searchSolvedIssues` gains an optional second parameter. Existing callers are
unchanged and keep compiling. The complete TS call-site enumeration, from a
repo-wide grep at drafting time:

| Call site | In tsconfig include? |
|---|---|
| `apps/qw-oracle/scripts/load-chat/gate-compare.ts:19` (import), `:192`, `:242` | **YES** (`scripts/load-chat/**/*`) -- the ones that would break a green typecheck |
| `apps/qw-oracle/eval/eval.ts:25` (import), `:71` | no (and see F18) |
| `apps/qw-oracle/serve/mcp/src/index.ts:26` (import), `:157` | via `serve/mcp/tsconfig.json` |
| `apps/qw-oracle/scripts/calibration/faq-gate/faq-gate-retrieve.ts:24`, `:118` | no (F13); does not run on this box at all (F4) |

`serve/mcp/scripts/verify-rewrite.ts:136` is NOT a TS call site -- it is an MCP
`client.callTool({ name: 'search_solved_issues', ... })` over the wire, so the
signature change cannot reach it.

```ts
export async function searchSolvedIssues(
  args: Args,
  ctx: RetrievalContext = {},
): Promise<ToolResponse<ThreadHit>> {
  const limit = ctx.pinnedLimit ?? args.limit ?? 3;
```

Fragments follow the repo idiom verbatim -- a ``db`AND ...` `` tagged-template
fragment, or an empty ``db`` `` template when the filter is absent, exactly as
`search-entities.ts:32-36` builds `projectClause` / `typeClause`:

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
`ORDER BY`. Both fragment shapes -- including a multi-element exclusion array,
the empty ``db`` `` path, and reuse of one outer-`db` fragment across several
queries and into a transaction's `sql` -- were executed through postgres-js
3.4.9 against the twin at drafting time and independently re-verified by the
checker. (This is a direct client-library check, not an inference from the
raw-`psql` phase-boundary probes, which exercise the SQL semantics rather than
the fragment builder.)

**`fanout` stays `limit * 4`, hardcoded, and nothing filters after fusion**
(F8). The filters go in the SQL so an excluded or off-channel thread never
consumes one of the candidate slots; post-fusion filtering would shrink the
result set and, for channel scope, destroy the B-vs-C experiment whose whole
mechanism is candidate-slot crowding.

### The candidate budget is agent-controllable, so the eval pins it

F8 says the candidate budget must be identical across cells B and C.
"`fanout = limit * 4` is hardcoded" describes the MULTIPLIER; `limit` is a
declared property of the tool's `inputSchema` ("Max thread hits to return.
Default 3."), so the budget itself varies at the model's discretion and today
nothing enforces F8's actual requirement.

It is not a theoretical gap -- the budget interacts directly with F17.
Measured on the twin, `#helpdesk`-scoped and self-excluded, over a
deterministic 200-thread sample (`ORDER BY md5(id::text)`):

| fanout | `iterative_scan = off` | `iterative_scan = strict_order` |
|---|---|---|
| 12 (`limit: 3`) | **22/200 starved (11.0%)**, min 1, mean 11.43 | 0/200, min 12, mean 12.00 |
| 20 (`limit: 5`) | **103/200 starved (51.5%)**, min 1, mean 16.93 | 0/200, min 20, mean 20.00 |

A model that asks for `limit: 5` in cell B and `limit: 3` in cell C would be
comparing two different experiments.

**Ruling:** the eval pins the budget server-side via `ctx.pinnedLimit`, set to
**3** (the production default, so the cells measure the product as shipped) for
BOTH cells B and C, supplied explicitly rather than relied upon as a default.
`max_messages_per_session` is likewise supplied explicitly as **40**. This is
agent-invisible (the schema still advertises `limit`, the model may still pass
it, the server simply overrides), and it is symmetric, so it cannot bias
B-vs-C. Server-side clamping is house-consistent: `search-entities.ts:72`
already does `Math.min(args.limit ?? 10, 25)`. Binding under E7's
`limit`-pinning clause. The honesty cost is recorded in Open question 5.

### The pgvector filter hazard and its fix (F17 -- answers REVIEW-BRIEF R4)

The vector path is NOT safe under a filter by default, and this is measured,
not assumed:

- `chat_threads_embedding_hnsw` is an unfiltered
  `USING hnsw (topic_embedding vector_cosine_ops)` index -- there is no
  partial, channel-scoped variant. (`pg_indexes` on the twin.)
- pgvector on the twin is **0.8.2**, with `hnsw.ef_search = 40`,
  `hnsw.iterative_scan = off`, `hnsw.max_scan_tuples = 20000` (all read live
  via `SHOW`).
- With `iterative_scan = off`, the HNSW scan yields at most ~`ef_search`
  candidates and the filter is applied to those, so a scoped query can return
  FEWER rows than `LIMIT`. Rate on a deterministic 200-thread random sample:
  **11.0% starved at fanout 12, 51.5% at fanout 20** (table above; min 1 row of
  12). Worst single case observed: a `#dev-corner` query vector against
  `#helpdesk` scope returned **1** row where unscoped returned 12.
- With `hnsw.iterative_scan = strict_order`, 0/200 starved at both fanouts,
  and the scoped `EXPLAIN ANALYZE` cost 2.4-2.7 ms.
- **It is planner-dependent, not selectivity-monotonic.** At `#antilag` scope
  (1,015 of 40,219 rows, 2.5%) the planner abandons HNSW for a
  `Bitmap Heap Scan` + `Sort` and returns 12/12 even under `off` (verified:
  0/50 starved, `EXPLAIN` shows the bitmap plan). So starvation is a
  mid-selectivity phenomenon that appears and disappears with the plan --
  which is precisely why the setting must be unconditional rather than reasoned
  about per cell.

Left unfixed this is not a cosmetic recall dip: it starves cell B's semantic
candidate list on roughly a tenth of questions at the pinned budget, which
would read out as "scoping hurts" when the cause is index mechanics, not corpus
dilution. That is the confound REVIEW-BRIEF R4 asks for a probe against.

**Ruling:** `semanticCandidates` runs inside a transaction that sets
`hnsw.iterative_scan = strict_order` for that statement only, ALWAYS (not
conditionally on the context). `SET LOCAL` inside `db.begin` is the correct
scope and was verified not to leak across the 16-connection pool. The shape
below compiles clean under the repo's real `compilerOptions` against
postgres-js 3.4.9 (`tsc --noEmit`, exit 0, including outer-`db` fragments
nested into the transaction's `sql`) -- no extra annotation is needed, so do
not add one:

```ts
const rows = await db.begin(async (sql) => {
  // pgvector 0.8 iterative scan. Without it an HNSW scan stops after
  // ~hnsw.ef_search (40) candidates and applies the channel/exclusion filter
  // to those, silently returning fewer than `fanout` rows on ~11% of scoped
  // queries at fanout 12 and ~52% at fanout 20 (arc finding F17, measured on
  // the twin). strict_order, not relaxed_order: pgvector documents relaxed
  // scans as permitting out-of-order results, and RRF fuses on rank.
  await sql`SET LOCAL hnsw.iterative_scan = strict_order`;
  return sql<ThreadRow[]>`
    SELECT ...
  `;
});
```

Why always, not only when a filter is present: cell C also carries the
leave-one-out predicate, so both cells are filtered queries; the plan can
switch under the planner's feet (the `#antilag` case above); and the unscoped
top-12 is identical under `off` and `strict_order` -- verified at n=100, id
lists AND order matching 100/100, including with the leave-one-out predicate
applied -- with no latency cost (0.60 ms vs 1.07 ms unscoped). One code path,
no cell-conditional execution shape, nothing for E7 symmetry to leak through.

### The lexical path's silent-`[]` swallow (F22)

`lexicalCandidates` wraps its entire query in `try { ... } catch { return []; }`,
justified in-file as "tsquery can reject malformed queries". The new fragments
go INSIDE that swallow, so any fragment defect -- a malformed `::bigint[]`
cast, a bad channel list, a connection fault -- degrades to an empty candidate
list that is indistinguishable from "no matches", in exactly the path this
phase is modifying.

The stated rationale does not hold for this function. `websearch_to_tsquery` is
forgiving by construction (unlike `to_tsquery`): probed at drafting time with
seven malformed inputs (`foo & | bar`, an unclosed quote, `!!!`, `:*`,
`a <-> b`, the empty string, a lone backslash) it threw on none of them, and
the full `content_tsv @@ websearch_to_tsquery(...)` query ran clean on the
unclosed-quote case. The catch is a carry-over from a `to_tsquery` era and
today protects against no known input class. Raised as **F22**.

**Ruling, deliberately minimal so production behaviour does not move** (the
concurrent oracle-web arc deploys this same stack):

1. The catch ALWAYS logs to stderr -- tool name, the query, and the error
   message. Never silent, in any mode.
2. It re-throws when `ctx` is non-empty, i.e. in eval mode. A cell that cannot
   retrieve must fail the pass, not score a zero-tool answer. This is
   symmetric across B and C (both carry a context), so it introduces no
   asymmetry; cell A has no tools at all.
3. With an empty `ctx` (production, and every existing caller) it still returns
   `[]`, so the live MCP server's behaviour is byte-unchanged.

Whether production should also re-throw is routed as F22, not decided here
(E14).

Independently, the Task 3 probe asserts a **non-emptiness floor** on every
lexical assertion. Without it, "all results are `#helpdesk`" and "the excluded
id never appears" are both vacuously true on `[]` -- the probe would pass
loudest exactly when the path is most broken.

### The two consumers

1. **In-process (E6, Phases 2, 5, 6):** the harness imports `searchSolvedIssues`
   from `serve/mcp/src/tools/search-solved-issues.ts` and passes a
   `RetrievalContext` object per question. No env involved.
2. **Spawned stdio server (E11, Phase 7):** `serve/mcp/src/index.ts`'s
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

   `TOOL_LIST`'s `search_solved_issues` `inputSchema` is NOT touched -- probe 2
   enforces that mechanically, by digest.

Neither consumer reimplements the filter. A phase that needs different scoping
passes a different `RetrievalContext`; a phase that needs a different FILTER is
an amendment to this section.

## Contract (b) -- the run record (normative)

One record per (question x condition x answering model), inside one run.
Machine-readable form is the exported `RunRecord` interface in
`apps/qw-oracle/eval/sim/run-record.ts`; this section is the normative prose.
Phases 2-9 never invent fields (E2); a needed-but-missing field is a finding
routed back here as a dated amendment plus a re-derive of anything computed
from it.

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
  run_id: string;                     // ULID, one per harness invocation; also names the file
  record_id: string;                  // `${thread_id}:${condition}:${answering_model}`
  stage: Stage;                       // 'answered' then 'graded'; see the append rules below

  // Question identity
  thread_id: string;                  // chat_threads.id as string (ThreadHit.thread_id convention)
  thread_key: string;                 // chat_threads.thread_key -- survives an id re-fence (E4, F1)
  domain: string;                     // faq-domains-resolve.ts key, e.g. 'weapon-scripts'
  era: number;                        // date_range_start year, 2020-2025 (F2)
  question: string;                   // the player's opening message(s), verbatim

  // What was run
  condition: Condition;
  answering_model: string;            // e.g. 'deepseek-v4-flash'. MUST NOT contain ':' (see below)
  retrieval_context: {                // what the server was ACTUALLY told, not what was intended
    channels: string[] | null;
    exclude_thread_ids: string[];
    pinned_limit: number | null;
  };

  // What came back
  tool_calls: ToolCallRound[];        // [] in cell A by construction (no tools attached, D8)
  answer: string;
  truth: string;                      // D6 stage 1 key extraction
  grade: Grade | null;                // null while stage === 'answered'; absent === null
  divergent: boolean;                 // D6. Phase 2 writes `false`; only GRADING can know it,
                                      // so Phase 4 may set it true on the graded line. One of
                                      // the four mutable keys (E2 amendment, F44).

  // Accounting
  usage: Usage;                       // the ANSWERING pass only. IMMUTABLE across the delta line.
  grade_usage: Usage | null;          // the COMPARE-GRADING call (D6 stage 3), same Usage type --
                                      // not a second one. null on the answered line; the grading
                                      // pass writes it. Mutable key (E2 amendment, F49): without
                                      // it ~1,500 bulk grading calls are unaccounted and the
                                      // pilot's cost-per-question -- the figure that authorises
                                      // the bulk spend -- under-reports (E10 amendment).
                                      // Key-extraction cost is NOT here: D6 stage 1 runs once per
                                      // THREAD and one `truth` is shared by all three cell
                                      // records, so it lives in Phase 3's sample-keys.json
                                      // `accounting` block and is amortised across the cells.
  latency_ms: number;
  started_at: string;                 // ISO-8601
  error: string | null;               // non-null = the pass failed; answer/grade are not comparable
}
```

### Append rules (reconciles E2 with E9, and pins the delta line)

E2 says one record per (question x condition); E9 says one JSONL line per
(question x condition x stage). Both hold, under an append-only log with
last-line-wins reconstruction. The rules are normative, not descriptive:

1. **The answered line is complete.** Phase 2 appends the full record with
   `stage: 'answered'`, `grade: null`, `divergent: false`, and
   `grade_usage: null`.
2. **The graded line is a byte-copy of the answered line with exactly four
   fields changed:** `grade` (null -> a `Grade`), `stage`
   (`'answered'` -> `'graded'`), `divergent` (`false` -> the grader's
   determination), and `grade_usage` (null -> the grading call's `Usage`).
   **No other field may differ.** This is E2's delta-line invariant as amended
   2026-08-06 (F44, then F49), and it is not pedantry in either direction:
   - too permissive, and a Phase 4 implementer who writes the intuitively
     obvious `{record_id, stage:'graded', grade}` produces a line that is
     compliant with "last line wins" and silently destroys `answer`,
     `tool_calls`, `usage`, `latency_ms`, `truth` and `question` on
     reconstruction -- taking the evidence for the headline number with it;
   - too strict, and the fields only grading can determine become unwritable
     and therefore dead. `divergent` is not a spare field: it is how spec D6
     absorbs the era problem F2 quantified (the sample is 2020-2025, zero 2026
     threads), so every answer that is *currently* correct but differs from a
     dated fix would score `miss` -- a downward bias concentrated on the oldest
     threads, exactly the ones the arc most needs to read honestly. And
     `grade_usage` is what keeps E10 honest: ~1,500 bulk grading calls would
     otherwise go unaccounted, and the pilot's cost-per-question figure --
     which is what authorises the bulk spend -- would under-report.
3. **Produce the graded line by SPREADING the answered record** --
   `{...answered, stage: 'graded', grade, divergent, grade_usage}` -- never by
   reconstructing it field by field. That is what makes "byte-copy" literally
   true, and it also keeps `validateGradedDelta` free of false positives:
   the checker compares nested fields (`retrieval_context`, `tool_calls`,
   `usage`) by deep equality, and a rebuilt object with the same content but a
   different key order can compare unequal. A false-positive delta would block
   a legitimate grading write and read like a contract violation. (F50.)
4. **Reconstruction** = for each `record_id`, the last line bearing it.
5. **Resume** (E9) skips on the `(record_id, stage)` pair within the run's own
   file, so a crash between answering and grading loses neither.

Enforcement, so rule 2 is not merely written down: `validateRunRecord` accepts
a single record, and a second exported function
`validateGradedDelta(answered: RunRecord, graded: RunRecord): string[]`
returns the list of fields that differ outside
`{grade, stage, divergent, grade_usage}` (empty = valid). It must ACCEPT a
change confined to any of those four, and still REJECT any change to `answer`,
`tool_calls`, `usage`, `latency_ms`, `truth`, or any identity field
(`record_id`, `run_id`, `thread_id`, `thread_key`, `domain`, `era`, `question`,
`condition`, `answering_model`, `retrieval_context`). Phase 4's boundary probe
runs it over its own output, and Phase 5's explorer generator runs it while
reconstructing.

**`usage` and `grade_usage` differ only by a prefix, and only one of them is
mutable.** `usage` is the answering pass's accounting and is IMMUTABLE across
the delta line; `grade_usage` is the grading call's and is mutable. An
implementer who widens the set by pattern-matching on the name -- or a diff
reviewer who skims it -- conflates them, and a mutable `usage` means Phase 4
can silently overwrite the answering cost that the headline's token economics
rest on. Probe 7 asserts both directions explicitly for this reason.

### Denylist, not allowlist -- ruling (2026-08-06)

The mutable set grew twice in one day (F44, F49), which is the pattern that
normally argues for inverting the check into an immutable-field allowlist.
**Keep the denylist** -- `validateGradedDelta` skips the mutable keys and
diffs everything else -- because the two shapes fail in opposite directions and
only one of those directions is survivable here:

- **Denylist fails CLOSED and LOUD.** A field added to `RunRecord` and not
  added to the mutable set is protected automatically. If it turns out to be
  legitimately grading-written, the probe fails immediately with a named field.
  That is precisely what happened twice today, and both times the mechanism
  worked: the defect surfaced while the contract was still a document, got a
  dated ledger amendment, and the contract came out stronger.
- **Allowlist fails OPEN and SILENT.** A field added to `RunRecord` and not
  added to the immutable list is unprotected forever, and nothing breaks to say
  so. Under an allowlist F49 would most likely never have surfaced at all --
  `grade_usage` would have been added, left off the list, silently mutable, and
  no probe would have complained.

The function exists to stop evidence being silently destroyed. A shape whose
own growth failure mode is silent unprotection defeats its purpose, and "it
made noise twice" is the mechanism working, not the mechanism straining.

The denylist's one real weakness -- an untyped string set drifting from the
interface -- is closed cheaply, and this part IS required:

```ts
export const MUTABLE_ON_GRADE = ['grade', 'stage', 'divergent', 'grade_usage'] as const;
// Compile-time guard: every mutable key must be a real RunRecord key, so a typo
// ('grade_usages') is a typecheck failure rather than a field that silently
// stops being protected.
const _mutableKeysAreRealFields: readonly (keyof RunRecord)[] = MUTABLE_ON_GRADE;
```

Revisit only if the set exceeds roughly half the record's fields, at which
point the record itself is the thing to redesign, not the checker.

Rejected alternative, recorded so it is not re-proposed: folding `divergent`
into the `Grade` object reads cleaner in isolation, but it relocates a field
Phase 2 already writes and Phase 8 already reads, so the blast radius exceeds
the fix. The same argument applies to folding `grade_usage` into `Grade`.

This is also what satisfies the README's requirement from the 2026-08-06
slicing ratification -- answering (Phase 2) and grading (Phase 4) are separate
phases, so "the Phase 1 schema must permit a record with an empty grade":
`grade: Grade | null` plus `stage: 'answered' | 'graded'` is that permission.

**Absent === null, and only for `grade`.** A line that omits the `grade` key
entirely is valid and reconstructs as `null`; the validator normalises it.
Every other field is required. This one exemption exists because it is the
single field whose absence is semantically meaningful (not yet graded), and
confining it to one field keeps "is this record complete?" a mechanical check
rather than a judgement call.

### Run scoping -- one file per run, and which set the headline uses

`record_id` deliberately excludes `run_id`: it is the identity of a
(question, condition, model) triple, and two runs answering the same triple are
two observations of the same thing, not one. Run separation is therefore
carried by the FILE, not by the key:

- Records live at `apps/qw-oracle/eval/sim/records/<run_id>.jsonl`, one file
  per harness invocation. Resume reads only that file.
- **The headline A/B/C rates are computed over the bulk run's file alone**
  (Phase 6's `run_id`). Pilot records (Phase 5) are retained for the gate's
  agreement arithmetic and for the explorer, and are NEVER pooled into the
  headline.
- Consequence, accepted deliberately: the bulk run re-answers the ~30-50 pilot
  threads from scratch. That is ~90-150 extra DeepSeek passes, single-digit
  dollars, and it is also the methodologically correct outcome -- a NO-GO
  pilot revises the rubric (spec D6), so pilot answers may have been graded
  under a rubric the headline no longer uses. Merging them would import a
  stale rubric into the top-line number.

The alternative -- one shared file -- was rejected on both branches: shared
plus last-line-wins silently merges the runs, and shared plus
resume-on-`(record_id, stage)` makes the bulk SKIP every pilot thread and reuse
pilot answers in the headline. Either is a quiet contamination of the arc's
only deliverable.

**`record_id` delimiter.** `answering_model` MUST NOT contain `:`, or the key
becomes ambiguous to parse. The validator rejects it. This matters at Phase 7,
where the Claude-side model string is not yet pinned and vendor ids of the form
`us.anthropic.claude-...` are plausible; pick a `:`-free label there.

### Grading input is a projection, and the projection is part of the contract

E8 requires the grader to be condition-blind. `run-record.ts` exports:

```ts
export interface GradingInput { question: string; answer: string; truth: string; }
export function toGradingInput(r: RunRecord): GradingInput;
```

Exactly those three fields -- no `condition`, no `retrieval_context`, no
`tool_calls`, no `answering_model`, no `domain`. Phase 4's E8 probe then
reduces to asserting that the grader payload is `toGradingInput`'s output,
which probe 7 already pins here.

**This buys field-level blindness, not total blindness.** Condition can still
leak through the ANSWER's prose -- "according to a #helpdesk thread from 2021,
..." names both retrieval and channel. That residue is inherent to D6 stage 3
(the grader must read the answer to grade it) and is not fixable at this layer;
the mitigations that exist are rubric wording (Phase 4) and the divergent /
spot-check pile (D6 stage 4). Do not claim the grader is blind, only that the
harness does not hand it the label.

### Validator

`validateRunRecord(value: unknown)` returns
`{ ok: true; record: RunRecord } | { ok: false; errors: string[] }`.
Hand-rolled -- the repo has no schema library anywhere (`zod` appears in no
`package.json`), and adding one for this check is exactly the complexity grug
says no to. It must reject, by name and with a message, at least: an unknown
`verdict` string (in particular `NAILED` / `PARTIAL` / `WRONG`, the F10 trap);
a `condition` outside `A|B|C`; a missing `thread_key`; a non-integer `era`; a
`stage: 'graded'` record with `grade: null`; a `stage: 'answered'` record with
a non-null `grade_usage` (the mirror rule -- grading has not run, so it cannot
have spent anything, and a violation means a Phase 4 writer targeted the wrong
stage); an `answering_model` containing
`:`; and any missing required field other than `grade`.

**Fixture.** `apps/qw-oracle/eval/sim/fixtures/run-record.example.json` -- one
realistic cell-C record with two tool-call rounds (the second having two
parallel calls, per F16), a filled grade, `divergent: true`, a populated
`grade_usage` (so the committed pair exercises all four mutable keys at once,
leaving none untested), and non-zero reasoning tokens in BOTH `usage` and
`grade_usage`. A sibling `run-record.answered.json` holds the same record at
`stage: 'answered'`, so probe 7 can exercise `validateGradedDelta` on a real
pair rather than on a synthetic one.

## Inputs from previous phase

Phase 1 is the arc's first phase. These are preconditions, each probed
read-only at drafting time (2026-08-06):

- **`.env` is absent from the worktree and must be brought in.**
  `/home/dev/projects/quakeworld/apps/qw-oracle/.env` exists (mode 600), its
  `DATABASE_URL` host is `qw-oracle-postgres-dev:5432/qw_oracle` (the twin, not
  prod), and `MCP_TRANSPORT=stdio`.
  `/home/dev/projects/quakeworld-eval/apps/qw-oracle/.env` does not exist;
  `.gitignore` lines 19-20 are why.
- **`node_modules` is absent from the worktree**, at the root AND under
  `apps/qw-oracle/serve/mcp/`. The monorepo root declares
  `workspaces: ["apps/*", "packages/*"]`, which does NOT cover the nested
  `apps/qw-oracle/serve/mcp` package -- it carries its own `package.json` and
  `bun.lock`. Two installs are required.
- **`@modelcontextprotocol/sdk` resolves ONLY from
  `apps/qw-oracle/serve/mcp/node_modules`.** Verified by import: it FAILS from
  `apps/qw-oracle`, RESOLVES from `apps/qw-oracle/serve/mcp`. Resolution walks
  up from the importing file, so a file in `eval/sim/` passes `apps/qw-oracle`
  and the repo root and finds neither. Note the contrast that makes this a
  narrow constraint rather than a broad one: importing
  `serve/mcp/src/index.ts` FROM `apps/qw-oracle` works fine, because
  `index.ts`'s own SDK import resolves from ITS directory. Only a file that
  imports the SDK *directly* is affected. This is what drives Task 4's
  location (MAJOR-1 remedy below).
- **Bun loads `.env` from the CWD, and only from the CWD.** Probed: `bun -e`
  from `apps/qw-oracle/` sees `DATABASE_URL`; from `apps/qw-oracle/serve/mcp/`
  and from the monorepo root it does not. Running the server from
  `serve/mcp/` throws `DATABASE_URL is not set` at `shared/db.ts:10` before any
  DB contact.
- **Dev twin reachable and shaped as expected.** `psql` at `/usr/bin/psql`;
  PostgreSQL 16.13, `vector` 0.8.2. `chat_threads` = 40,219 rows, 0 with a NULL
  `topic_embedding`; per channel `#quakeworld` 22,073 / 5,316 solved,
  `#dev-corner` 10,359 / 3,714, `#helpdesk` 6,772 / 3,694, `#antilag`
  1,015 / 410 -- matching the spec's prod figures exactly (twin parity holds).
  `reconstruction_version` is `fence-sonnet-v2` for all rows.
- **Indexes:** `chat_threads_channel_started` btree `(channel_name,
  date_range_start)`, `chat_threads_content_tsv_gin`,
  `chat_threads_embedding_hnsw` (unfiltered),
  `chat_threads_thread_key_key` unique on `thread_key`.
- **Telemetry pre-run counts** `query_log` 199, `embedding_api_log` 2,017,
  `oracle_meta` 19. `oracle_meta.embedding_space_verified_at` is 55.3 h old,
  past the 24 h TTL, so the FIRST server start of this phase will make one
  Voyage call and one `oracle_meta` upsert -- expected, inside E3's F9
  carve-out.
- **Both baseline typechecks are green.** `tsc --noEmit` exits 0 today under
  `apps/qw-oracle/tsconfig.json` AND under
  `apps/qw-oracle/serve/mcp/tsconfig.json` (run in the main checkout,
  read-only, no emit), so any failure after this phase is attributable to it.
- **MCP SDK 1.30.0.** `StdioServerParameters` carries both `cwd` and `env`;
  when `env` is omitted the child gets `getDefaultEnvironment()`, whose Linux
  allowlist is exactly `HOME, LOGNAME, PATH, SHELL, TERM, USER`.
- **Frozen frame inputs exist and are read-only to this arc:**
  `scripts/calibration/faq-gate/faq-clusters.json` and
  `faq-domains-resolve.ts`. Nothing here writes into `faq-gate/` (E12, F14).

## Files touched

**Created:**
- `apps/qw-oracle/serve/mcp/src/tools/retrieval-context.ts`
- `apps/qw-oracle/serve/mcp/scripts/probe-stdio-scope.ts` (NOT in `eval/sim/` -- see MAJOR-1 remedy in Task 4)
- `apps/qw-oracle/eval/sim/run-record.ts`
- `apps/qw-oracle/eval/sim/fixtures/run-record.example.json`
- `apps/qw-oracle/eval/sim/fixtures/run-record.answered.json`
- `apps/qw-oracle/eval/sim/validate-run-record.ts` (CLI over the validator)
- `apps/qw-oracle/eval/sim/probe-retrieval.ts` (in-process candidate-level probe)
- `apps/qw-oracle/eval/sim/telemetry-baseline.json`
- `apps/qw-oracle/eval/sim/tool-surface.pin.json` (inputSchema digest, produced by Task 4)
- `apps/qw-oracle/.env` (symlink to the main checkout's file; gitignored, not committed)

**Modified:**
- `apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts` (ctx param,
  pinned limit, two fragments in both paths, `SET LOCAL` on the vector path,
  the lexical catch's log/rethrow, two candidate functions exported for the
  boundary probe)
- `apps/qw-oracle/serve/mcp/src/index.ts` (one dispatch case gains a second
  argument; `TOOL_LIST` untouched)
- `apps/qw-oracle/serve/mcp/package.json` (one line: a `typecheck` script, so
  the relocated probe is actually typechecked)
- `apps/qw-oracle/tsconfig.json` (`include` gains `eval/sim/**/*` -- see Task 5
  for why NOT `eval/**/*`)
- `apps/qw-oracle/.gitignore` (one line for run artifacts, E13)

**Deleted:** none.

## Tasks

Task order is load-bearing: **Task 2 must complete before Tasks 3 and 4.**
Tasks 3 and 4 each drive real tool calls, and every tool call writes a
`query_log` row and an `embedding_api_log` row (plus an `oracle_meta` upsert on
the first server start past the TTL). A baseline taken after them measures
nothing, and E3/F9 attributability is gone for the whole arc.

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

**Verification probe** (fails loudly rather than printing `undefined` and
exiting 0):

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'const u = process.env.DATABASE_URL ?? ""; const host = u.split("@")[1] ?? ""; const ok = host.startsWith("qw-oracle-postgres-dev:5432/"); console.log(ok ? "DB_HOST_OK " + host : "DB_HOST_BAD " + JSON.stringify(host)); process.exit(ok ? 0 : 1);'
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle/serve/mcp && bun -e 'import("@modelcontextprotocol/sdk/client/stdio.js").then(() => { console.log("SDK_OK"); process.exit(0); }).catch((e) => { console.log("SDK_FAIL", e.message.split("\n")[0]); process.exit(1); });'

Expect `DB_HOST_OK qw-oracle-postgres-dev:5432/qw_oracle` and `SDK_OK`, both
exit 0.

### Task 2 -- Telemetry baseline (MUST run before Tasks 3 and 4) · `inline`

**Goal:** later phases' telemetry volume is attributable (E3, F9).

**Files:** `eval/sim/telemetry-baseline.json` (new).

**Steps:** run the SQL below BEFORE any tool call exists in this phase, and
commit the output verbatim as the file's contents.

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

### Task 3 -- Retrieval context: the carrier and the SQL changes · `agent (session-tier, high)` -- ARC CONTRACT OWNER

**Goal:** scope, exclusion and the pinned budget take effect inside both
retrieval paths; the agent-visible surface is unchanged; the vector path no
longer starves under a filter; the lexical path no longer fails silently.

**Files:** `serve/mcp/src/tools/retrieval-context.ts` (new),
`serve/mcp/src/tools/search-solved-issues.ts` (modify),
`serve/mcp/src/index.ts` (modify), `eval/sim/probe-retrieval.ts` (new).

**Steps:**
1. Write `retrieval-context.ts` per Contract (a): the `RetrievalContext`
   interface (three optional fields), `parseEnvContext()` reading
   `L2_RETRIEVAL_CHANNELS`, `L2_RETRIEVAL_EXCLUDE_THREADS` and
   `L2_RETRIEVAL_PINNED_LIMIT`, and the module-level `ENV_RETRIEVAL_CONTEXT`
   const. Throw on any unparsable value; validate channel names against the
   four known values (`#quakeworld`, `#dev-corner`, `#helpdesk`, `#antilag`),
   exclude ids against `/^[0-9]+$/`, and the pinned limit as a positive
   integer. Match the file-header comment style of its siblings in `tools/`.
2. In `search-solved-issues.ts`, add `ctx: RetrievalContext = {}` as the second
   parameter and change the limit line to
   `const limit = ctx.pinnedLimit ?? args.limit ?? 3;`. Thread `ctx` into both
   candidate functions. Build `channelClause` / `excludeClause` exactly as
   Contract (a) shows and place them between the existing `WHERE` predicate and
   `ORDER BY` in both queries, matching the indentation `search-entities.ts:41-45`
   uses.
3. Wrap the `semanticCandidates` query in `db.begin` with
   `SET LOCAL hnsw.iterative_scan = strict_order`, carrying the comment from
   Contract (a). Do not add a type annotation to the `db.begin` result -- the
   shape compiles as written. Leave `lexicalCandidates` outside a transaction:
   the GIN path has no `ef_search` analogue and does not starve.
4. Change the `lexicalCandidates` catch per the F22 ruling: always
   `console.error` the tool name, query and message; re-throw when `ctx` has
   any field set; otherwise keep returning `[]`.
5. Do NOT touch the `limit * 4` multiplier, the RRF call, the threshold
   constants, or anything post-fusion (F8).
6. Export `lexicalCandidates` and `semanticCandidates` with a one-line comment
   saying they are exported for the Phase 1 boundary probe and are not part of
   the MCP surface. Deliberate, minimal interface widening: the starvation bug
   is invisible at the tool's output level (the lexical path still supplies
   enough candidates to fill `limit`), so candidate-level observability is the
   only way to prove the fix without duplicating the SQL in a probe and
   inviting drift.
7. In `index.ts`, import `ENV_RETRIEVAL_CONTEXT` and pass it as the second
   argument in the `search_solved_issues` dispatch case (~L154-158). Change
   nothing else -- in particular not `TOOL_LIST`.
8. Write `eval/sim/probe-retrieval.ts`. **Query vectors come from the sampled
   thread's own `topic_embedding` column, read with a SELECT** -- never from
   `embedTexts`. Two reasons: a Voyage call costs money per question, and the
   `embedding_api_log` INSERT lives inside `searchSolvedIssues` rather than in
   `shared/embedding.ts`, so calling the embedder here would also write
   telemetry rows straight into the baseline Task 2 just captured. For ~20
   `#helpdesk` solved threads, call the exported candidate functions at
   `fanout = 12` with and without
   `{ channels: ['#helpdesk'], excludeThreadIds: [<self>], pinnedLimit: 3 }`,
   asserting:
   - **non-emptiness floor first** -- both paths return `> 0` rows in BOTH the
     scoped and unscoped calls (without this, every assertion below is
     vacuously true on `[]`; see F22);
   - scoped results are all `#helpdesk`;
   - the excluded id appears in the WITHOUT-exclusion call and is absent from
     the WITH-exclusion call (the pair, not just the absence -- an absence
     alone proves nothing about the filter);
   - the scoped semantic path returns 12 rows on every probed question.
   Print one `PASS`/`FAIL` line per assertion and `process.exit(failures ? 1 : 0)`.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-retrieval.ts

Expect all PASS and exit 0. Cross-check the same semantics at raw-SQL level
with Phase-boundary probes 3-6.

### Task 4 -- Dev MCP over stdio, against the twin · `agent (workhorse, medium)`

**Goal:** discharge F6 -- a dev MCP instance is one `bun` invocation, no
container, no Cloudflare, no Tailscale -- and prove E11's env carrier end to
end.

**Files:** `serve/mcp/scripts/probe-stdio-scope.ts` (new),
`serve/mcp/package.json` (one line), `eval/sim/tool-surface.pin.json` (new).

**MAJOR-1 remedy -- the probe lives in `serve/mcp/scripts/`, not in
`eval/sim/`.** The SDK resolves only from `serve/mcp/node_modules`, so an
SDK-importing file under `eval/sim/` fails at runtime AND, once Task 5 adds
`eval/sim/**/*` to the app tsconfig, fails `bun run typecheck` with TS2307.
`serve/mcp/scripts/` is where the two existing SDK clients already live
(`test-call.ts`, `verify-rewrite.ts`), it is inside `serve/mcp/tsconfig.json`'s
`include` (`scripts/**/*.ts`), and it needs no dependency duplication.

**Blast radius, stated:** (a) the probe is covered by the `serve/mcp`
typecheck, not the app one -- hence the one-line `"typecheck": "tsc --noEmit"`
script added to `serve/mcp/package.json`, and phase-boundary probe 1 runs BOTH;
(b) the probe sits outside `eval/sim/`, so E12's "new code lands under
`eval/sim/`" gains one documented exception, recorded here rather than
discovered later; (c) **this pre-decides Phase 7**: the Claude-side per-question
spawn loop (E11) is an SDK client, so it belongs in `serve/mcp/scripts/` too,
and Phase 7 should not plan to put it in `eval/sim/`. Rejected alternatives:
declaring the SDK in `apps/qw-oracle/package.json` (two installed copies, free
version skew between the server and its own probe), and making `serve/mcp` a
root workspace member (changes the monorepo install for a concurrent arc that
holds the main checkout).

**Steps:**
1. Model the client on `serve/mcp/scripts/test-call.ts` (`Client` +
   `StdioClientTransport`, `bun run <abs path to serve/mcp/src/index.ts>`), with
   three deliberate differences that file does not have:
   - `cwd: <abs path to apps/qw-oracle>` so the child finds `.env` (without it
     the child inherits the parent's cwd and throws `DATABASE_URL is not set`
     -- which is exactly why `bun run test-call` is broken today, F20);
   - `env: { ...getDefaultEnvironment(), MCP_TRANSPORT: 'stdio',
     L2_RETRIEVAL_CHANNELS: '#helpdesk', L2_RETRIEVAL_EXCLUDE_THREADS: '<id>',
     L2_RETRIEVAL_PINNED_LIMIT: '3' }`, importing `getDefaultEnvironment` from
     `@modelcontextprotocol/sdk/client/stdio.js`. `MCP_TRANSPORT` is passed
     explicitly AND asserted: it is not in the SDK's six-name allowlist, the
     child would otherwise read it from `.env`, and an `http` value binds a
     port and never speaks stdio -- the probe would hang on a handshake that
     can never complete rather than failing.
   - `stderr: 'pipe'`, echoing the child's stderr on failure -- the
     embedding-space verifier runs BEFORE transport bind and can
     `process.exit(1)`, and a silent spawn failure would look like an empty
     result set (F9's live hazard).
2. Assert, in order, printing `PASS`/`FAIL` per line and
   `process.exit(failures ? 1 : 0)`:
   - `listTools()` returns 13 tools;
   - the `search_solved_issues` `inputSchema.properties` key set is exactly
     `query`, `limit`, `max_messages_per_session` -- no scope, no exclusion,
     nothing new;
   - `sha256(JSON.stringify(inputSchema))` equals the digest committed in
     `eval/sim/tool-surface.pin.json`. The key-set check alone passes a
     description edit, which would silently change what the model is told
     between phases; the digest catches it. **The digest's VALUE is not
     knowable at drafting time** (it comes off the wire, through JSON-RPC
     serialisation): on first run the probe writes the pin file when it is
     absent and prints `PIN_CREATED <digest>`; every later run compares. Its
     purpose is drift detection from this phase forward, which is what Phase
     2's E6 schema-import check needs -- Phase 2 hashes its IMPORTED schema
     against the same pin, so an import/serve divergence surfaces mechanically.
     The key-set assertion above is what stops a first run from pinning a
     wrong schema.
   - a `search_solved_issues` call returns only `#helpdesk` threads, is
     non-empty, and returns at most 3 hits even when the call passes
     `limit: 5` (proving the pin overrides the model);
   - the exclusion PAIR: run the same query against a second spawned server
     whose `L2_RETRIEVAL_EXCLUDE_THREADS` is empty, assert the target
     `thread_id` IS present there and ABSENT in the excluded run. An
     absence-only assertion cannot distinguish "exclusion works" from "that
     thread never ranked".
3. Add `"typecheck": "tsc --noEmit"` to `serve/mcp/package.json`'s `scripts`.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle/serve/mcp && bun run scripts/probe-stdio-scope.ts

Expect all PASS and exit 0. This run writes telemetry rows (one `query_log` +
one `embedding_api_log` per tool call, plus one `oracle_meta` upsert on the
first start past the 24 h TTL) -- expected under E3's carve-out, and the reason
Task 2 ran first.

### Task 5 -- The run-record module, fixtures, and validator · `agent (workhorse, high)`

**Goal:** the record shape exists in code, is typechecked, and committed
fixtures prove both the record and the graded-delta invariant round-trip.

**Files:** `eval/sim/run-record.ts` (new),
`eval/sim/fixtures/run-record.example.json` (new),
`eval/sim/fixtures/run-record.answered.json` (new),
`eval/sim/validate-run-record.ts` (new), `apps/qw-oracle/tsconfig.json`
(modify), `apps/qw-oracle/.gitignore` (modify).

**Steps:**
1. Write `run-record.ts` exactly as Contract (b) specifies -- types, the
   `MUTABLE_ON_GRADE` constant with its `keyof RunRecord` compile-time guard,
   `validateRunRecord`, `validateGradedDelta`, `GradingInput`,
   `toGradingInput`. `grade_usage` reuses the existing `Usage` interface; do
   NOT declare a second one. `validateGradedDelta` skips `MUTABLE_ON_GRADE` and
   diffs the union of both records' keys -- so a field added to `RunRecord`
   later is protected by default (the fail-closed property probe 7 asserts).
   Comments explain why a field exists (which decision or finding put it
   there), not what it holds.
2. Write the two fixtures: `run-record.answered.json` (`stage: 'answered'`,
   `grade` key ABSENT so the absent-===-null rule is exercised by a real file,
   `divergent: false`, `grade_usage: null`) and `run-record.example.json` (the
   same record byte-for-byte with only `stage`, `grade`, `divergent` and
   `grade_usage` changed -- `divergent: true` and a populated `grade_usage`, so
   the committed pair covers the full four-key mutable set rather than leaving
   any of them untested). Give `grade_usage` visibly different token counts
   from `usage`, so a probe or a reader can tell at a glance which accounting
   block is which. One cell-C record, two tool-call rounds with
   the second carrying two parallel calls (F16), non-zero `reasoning_tokens`
   and `prompt_cache_hit_tokens`, a real `domain` key from
   `faq-domains-resolve.ts`'s `META`, an `era` in 2020-2025 (F2), and a
   `:`-free `answering_model`.
3. Write `validate-run-record.ts` as a CLI: reads a path (default: the graded
   fixture), validates, prints `OK <record_id>` or the error list, exits 0/1.
4. `tsconfig.json`: add `"eval/sim/**/*"` to `include`, so the harness IS
   typechecked by `bun run typecheck` (F13). **Not `"eval/**/*"`:**
   `eval/eval.ts:75` reads `h.session_id` off a `ThreadHit`, which has no such
   field, so widening to the whole `eval/` tree turns today's green typecheck
   red on a pre-existing defect this arc did not cause and does not own (F18 --
   routed to HANDOVER, not fixed here). Widening to cover
   `scripts/calibration/**` stays out of scope for the same reason (F13).
5. `.gitignore`: append, under a why-comment, `eval/sim/records/` (E13 --
   conclusions are committed, evidence is regenerated). The fixtures live
   outside that directory, so no negation pattern is needed.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo APP_TYPECHECK_OK
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/validate-run-record.ts

Expect `APP_TYPECHECK_OK` and `OK <record_id>`.

## Phase-boundary verification

Every probe runs as written from a shell in the worktree, after Task 1. Probes
3-6 and 8 were executed verbatim at drafting time against the twin (with the
main checkout's `.env` path, which Task 1 makes identical) and their expected
values are the observed ones. Probes 1, 2 and 7 exercise code this phase
creates and are stated with their exact expected stdout and exit status.

**1. Toolchain, env, and BOTH typechecks.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo APP_TYPECHECK_OK
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle/serve/mcp && bun run typecheck && echo MCP_TYPECHECK_OK
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'const u = process.env.DATABASE_URL ?? ""; const host = u.split("@")[1] ?? ""; const ok = host.startsWith("qw-oracle-postgres-dev:5432/"); console.log(ok ? "DB_HOST_OK " + host : "DB_HOST_BAD " + JSON.stringify(host)); process.exit(ok ? 0 : 1);'

Expect `APP_TYPECHECK_OK`, `MCP_TYPECHECK_OK`, `DB_HOST_OK
qw-oracle-postgres-dev:5432/qw_oracle` -- YES/NO. Both typechecks were green
before this phase, so either going red is this phase's regression.

**2. Agent-visible surface unchanged, env carrier honoured, budget pinned**
(E5 + E7 + E11 + F6 + F7 in one):

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle/serve/mcp && bun run scripts/probe-stdio-scope.ts

Expect every line `PASS` and exit 0: 13 tools listed (counted in `TOOL_LIST` at
drafting time: lookup_entity, search_entities, get_concept_note,
search_solved_issues, lookup_map, search_maps, lookup_gameplay_entity,
lookup_mechanic, search_gameplay_entities, search_mechanics, describe_mode,
search_concepts, redirect_to_human); `inputSchema.properties` key set exactly
`query,limit,max_messages_per_session`; digest matches
`eval/sim/tool-surface.pin.json`; results non-empty and all `#helpdesk`; at
most 3 hits despite `limit: 5`; excluded thread present in the unexcluded run
and absent in the excluded one -- YES/NO.

**3. Channel scope bites in the LEXICAL path:**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT channel_name, count(*) FROM (SELECT id, channel_name FROM chat_threads WHERE content_tsv @@ websearch_to_tsquery('simple','rpickup') ORDER BY ts_rank(content_tsv, websearch_to_tsquery('simple','rpickup')) DESC LIMIT 12) s GROUP BY 1 ORDER BY 2 DESC;"
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM (SELECT id FROM chat_threads WHERE content_tsv @@ websearch_to_tsquery('simple','rpickup') AND channel_name='#helpdesk' ORDER BY ts_rank(content_tsv, websearch_to_tsquery('simple','rpickup')) DESC LIMIT 12) s;"

Observed 2026-08-06: unscoped top-12 is `#quakeworld` 7 / `#dev-corner` 5 with
ZERO `#helpdesk` threads; scoped returns 3 (every helpdesk row matching that
tsquery, not a truncation). Expect: the unscoped set mixed-channel, the scoped
set helpdesk-only and non-zero -- YES/NO. The exact split is a drafting-time
baseline and may drift; the mixed-vs-scoped contrast is the assertion. It is
also the dilution mechanism D1 names, visible in one query.

**4. Leave-one-out frees the slot it vacates** (base and excluded lists must be
the SAME LENGTH, which is what proves the filter runs before `LIMIT` rather
than after fusion -- F8):

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "WITH base AS (SELECT id FROM chat_threads WHERE content_tsv @@ websearch_to_tsquery('simple','gl_outline ruleset') ORDER BY ts_rank(content_tsv, websearch_to_tsquery('simple','gl_outline ruleset')) DESC LIMIT 12), excl AS (SELECT id FROM chat_threads WHERE content_tsv @@ websearch_to_tsquery('simple','gl_outline ruleset') AND id <> 14475 ORDER BY ts_rank(content_tsv, websearch_to_tsquery('simple','gl_outline ruleset')) DESC LIMIT 12) SELECT (SELECT count(*) FROM base) AS base_n, (SELECT count(*) FROM excl) AS excl_n, (SELECT count(*) FROM base WHERE id=14475) AS base_has, (SELECT count(*) FROM excl WHERE id=14475) AS excl_has;"

Expect `12|12|1|0` -- YES/NO. (Thread 14475 is a `#helpdesk` thread that ranks
first for that tsquery; confirmed at drafting time.)

**5. F17 fixed regression guard.** This probe's 40 query vectors are
`ORDER BY id LIMIT 40`, which resolves to ids 6706..6771 -- a contiguous
2020-only window inside the F1 id block. It is NOT a representative sample and
must not be quoted as a rate; it is kept because it reproduces exactly and
therefore makes a good tripwire:

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SET hnsw.iterative_scan = off; WITH q AS (SELECT id, topic_embedding FROM chat_threads WHERE channel_name='#helpdesk' AND topic_embedding IS NOT NULL AND resolution_status='solved' ORDER BY id LIMIT 40) SELECT count(*) FILTER (WHERE got < 12) AS starved, min(got) AS min_rows FROM (SELECT (SELECT count(*) FROM (SELECT t.id FROM chat_threads t WHERE t.topic_embedding IS NOT NULL AND t.channel_name='#helpdesk' AND t.id <> q.id ORDER BY t.topic_embedding <=> q.topic_embedding LIMIT 12) s) AS got FROM q) x;"
    psql "$DATABASE_URL" -Atc "SET hnsw.iterative_scan = strict_order; WITH q AS (SELECT id, topic_embedding FROM chat_threads WHERE channel_name='#helpdesk' AND topic_embedding IS NOT NULL AND resolution_status='solved' ORDER BY id LIMIT 40) SELECT count(*) FILTER (WHERE got < 12) AS starved, min(got) AS min_rows FROM (SELECT (SELECT count(*) FROM (SELECT t.id FROM chat_threads t WHERE t.topic_embedding IS NOT NULL AND t.channel_name='#helpdesk' AND t.id <> q.id ORDER BY t.topic_embedding <=> q.topic_embedding LIMIT 12) s) AS got FROM q) x;"

Each command prints psql's `SET` echo then one result row. Observed
2026-08-06: `4|5` under `off`, `0|12` under `strict_order`. The assertion is
the SECOND command's row reading `0|12` -- YES/NO.

**5b. F17 rate probe (the figure to quote).** Deterministic 200-thread sample
across the whole `#helpdesk` id range, at both the pinned budget and the
`limit: 5` budget:

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    for MODE in off strict_order; do for FO in 12 20; do printf 'mode=%s fanout=%s -> ' "$MODE" "$FO"; psql "$DATABASE_URL" -Atc "SET hnsw.iterative_scan = $MODE; WITH q AS (SELECT id, topic_embedding FROM chat_threads WHERE channel_name='#helpdesk' AND topic_embedding IS NOT NULL AND resolution_status='solved' ORDER BY md5(id::text) LIMIT 200) SELECT count(*) FILTER (WHERE got < $FO) || ' starved / 200, min=' || min(got) FROM (SELECT (SELECT count(*) FROM (SELECT t.id FROM chat_threads t WHERE t.topic_embedding IS NOT NULL AND t.channel_name='#helpdesk' AND t.id <> q.id ORDER BY t.topic_embedding <=> q.topic_embedding LIMIT $FO) s) AS got FROM q) x;" | tail -1; done; done

Observed 2026-08-06: `off/12 -> 22 starved, min=1`; `off/20 -> 103 starved,
min=1`; `strict_order/12 -> 0 starved, min=12`; `strict_order/20 -> 0 starved,
min=20`. Expect both `strict_order` lines to read `0 starved` -- YES/NO. If a
line under `off` ever reads `0 starved`, the twin's HNSW defaults or the
planner's choice changed; record a finding rather than dropping the
`SET LOCAL` (the fix costs nothing and a server default is not ours to rely
on).

**6. Cell C is unchanged by the fix** (the `SET LOCAL` must not perturb the
unscoped path, or E7 symmetry breaks in the SQL layer):

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    VEC=$(psql "$DATABASE_URL" -Atc "SELECT topic_embedding::text FROM chat_threads WHERE channel_name='#dev-corner' AND topic_embedding IS NOT NULL ORDER BY id LIMIT 1;")
    A=$(psql "$DATABASE_URL" -Atc "SET hnsw.iterative_scan = off; SELECT string_agg(id::text, ',') FROM (SELECT id FROM chat_threads WHERE topic_embedding IS NOT NULL ORDER BY topic_embedding <=> '$VEC'::vector LIMIT 12) s;" | tail -1)
    B=$(psql "$DATABASE_URL" -Atc "SET hnsw.iterative_scan = strict_order; SELECT string_agg(id::text, ',') FROM (SELECT id FROM chat_threads WHERE topic_embedding IS NOT NULL ORDER BY topic_embedding <=> '$VEC'::vector LIMIT 12) s;" | tail -1)
    test "$A" = "$B" && echo IDENTICAL

Expect `IDENTICAL` -- YES/NO. (Observed identical at drafting time; the checker
independently re-derived it at n=100, id lists and order matching 100/100,
including with the leave-one-out predicate applied.)

**7. The record contract, the graded-delta invariant, and the grading
projection:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/validate-run-record.ts
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'import { validateRunRecord, validateGradedDelta, toGradingInput } from "./eval/sim/run-record.ts"; const fail=(m)=>{console.log("FAIL",m);process.exit(1)}; const g = await Bun.file("eval/sim/fixtures/run-record.example.json").json(); const a = await Bun.file("eval/sim/fixtures/run-record.answered.json").json(); const og = validateRunRecord(g), oa = validateRunRecord(a); if(!og.ok) fail(og.errors); if(!oa.ok) fail(oa.errors); if(oa.record.grade !== null) fail("absent grade did not normalise to null"); if(oa.record.divergent !== false || oa.record.grade_usage !== null) fail("answered fixture must carry divergent:false and grade_usage:null"); if(og.record.divergent !== true || og.record.grade_usage === null) fail("graded fixture must carry divergent:true and a populated grade_usage"); if(validateRunRecord({...g, grade:{...g.grade, verdict:"NAILED"}}).ok) fail("accepted NAILED"); if(validateRunRecord({...g, answering_model:"vendor:model"}).ok) fail("accepted colon in answering_model"); if(validateRunRecord({...a, grade_usage:g.grade_usage}).ok) fail("accepted an answered record carrying grade_usage"); if(validateGradedDelta(oa.record, og.record).length !== 0) fail("clean pair (all four mutable keys) reported a delta"); if(validateGradedDelta({...og.record, divergent:false}, og.record).length !== 0) fail("divergent-only change wrongly REJECTED -- F44"); if(validateGradedDelta({...og.record, grade_usage:null}, og.record).length !== 0) fail("grade_usage-only change wrongly REJECTED -- F49"); if(!validateGradedDelta(oa.record, {...og.record, usage:{...og.record.usage, cost_usd:99}}).includes("usage")) fail("answering usage became mutable -- set widened by name-matching"); if(validateGradedDelta(oa.record, {...og.record, answer:"tampered"}).length === 0) fail("tampered answer not detected"); if(validateGradedDelta(oa.record, {...og.record, thread_id:"999999"}).length === 0) fail("identity change not detected"); if(!validateGradedDelta(oa.record, {...og.record, future_field:1}).includes("future_field")) fail("unknown field unprotected -- the denylist must fail closed"); const k = Object.keys(toGradingInput(og.record)).sort().join(","); if(k !== "answer,question,truth") fail("grading keys: "+k); console.log("ALL_RECORD_ASSERTIONS_PASS"); process.exit(0);'

Expect `OK <record_id>` then `ALL_RECORD_ASSERTIONS_PASS`, both exit 0. The
script exits non-zero on every failure path, and each assertion has a named
wrong implementation it exists to catch. All four were run against deliberately
broken stubs at drafting time, and each failed at its own line:

| Wrong implementation | Fails at |
|---|---|
| conformant (control) | passes, exit 0 |
| mutable set `{grade, stage}` (F44's defect) | `clean pair (all four mutable keys) reported a delta` |
| mutable set `{grade, stage, divergent}` (pre-F49) | `clean pair (all four mutable keys) reported a delta` |
| set widened by name-matching to swallow `usage` too | `answering usage became mutable -- set widened by name-matching` |
| permits everything | `tampered answer not detected` |
| missing the answered-with-`grade_usage` mirror rule | `accepted an answered record carrying grade_usage` |
| immutable-field ALLOWLIST instead of the denylist | `unknown field unprotected -- the denylist must fail closed` |

Three of those deserve a word. The `usage` assertion checks that the returned
field list CONTAINS `usage` rather than merely being non-empty, because array
membership is exact -- `["grade_usage"].includes("usage")` is false -- so it
proves `usage` specifically is still protected and cannot be satisfied by some
other field's diff. The `future_field` assertion pins the fail-closed property
that the denylist ruling above rests on, and it is the line that actually
catches an allowlist rewrite. And the `divergent`-only and `grade_usage`-only
assertions are the backstop for fixtures drifting back to equal values on both
sides: then the clean-pair check would go quiet and only those lines would
catch the defect -- YES/NO.

**8. Telemetry baseline committed and the corpus has not moved:**

    jq -e '.chat_threads == 40219' /home/dev/projects/quakeworld-eval/apps/qw-oracle/eval/sim/telemetry-baseline.json && echo YES
    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM chat_threads;"

Expect `true` + `YES` and `40219` from the live query -- YES/NO. A mismatch is
an E4 / F3 event, not a probe bug.

## Outputs to next phase

Phases 2-9 may rely on exactly these:

- **`RetrievalContext`** (`serve/mcp/src/tools/retrieval-context.ts`): the
  `{ channels?, excludeThreadIds?, pinnedLimit? }` shape, and the rule that all
  three are applied inside the SQL of BOTH retrieval paths of
  `search_solved_issues` before fanout. Cell B is
  `{ channels: ['#helpdesk'], excludeThreadIds: [threadId], pinnedLimit: 3 }`;
  cell C is `{ excludeThreadIds: [threadId], pinnedLimit: 3 }`;
  production/no-eval is `{}`. `max_messages_per_session: 40` is supplied
  explicitly by the caller in both cells.
- **`searchSolvedIssues(args, ctx?)`** -- the in-process entry point for E6's
  cells (Phases 2, 5, 6). The first parameter is unchanged, so every existing
  call site still compiles. With a non-empty ctx the lexical path THROWS
  rather than returning `[]` on error (F22), so the harness must treat a
  retrieval throw as a failed pass, not as an empty result.
- **`ENV_RETRIEVAL_CONTEXT` and the three env vars**
  (`L2_RETRIEVAL_CHANNELS`, `L2_RETRIEVAL_EXCLUDE_THREADS`,
  `L2_RETRIEVAL_PINNED_LIMIT`) -- E11's per-question carrier for Phase 7's
  spawned servers. Env is read once at import, so one server process per
  question is required for per-question exclusion (F7); unparsable values abort
  the process rather than silently unscoping.
- **A spawnable dev MCP recipe** (Phase 7): `bun run <repo>/apps/qw-oracle/serve/mcp/src/index.ts`
  with `cwd` set to `<repo>/apps/qw-oracle`, `env` merged over
  `getDefaultEnvironment()` and including an explicit `MCP_TRANSPORT=stdio`,
  and `stderr: 'pipe'`. No container, no Cloudflare, no Tailscale, no auth.
  `serve/mcp/scripts/probe-stdio-scope.ts` is the working reference -- **and
  Phase 7's spawn loop belongs in `serve/mcp/scripts/` for the same
  SDK-resolution reason, not in `eval/sim/`.**
- **`eval/sim/tool-surface.pin.json`** -- the served `search_solved_issues`
  `inputSchema` digest. Phase 2's E6 check hashes its IMPORTED schema against
  this file, so an import/serve divergence is mechanical rather than a
  read-through.
- **`RunRecord` + `validateRunRecord` + `validateGradedDelta` +
  `toGradingInput` + two committed fixtures** (`eval/sim/run-record.ts`,
  `eval/sim/fixtures/`). Phase 2 writes lines with `stage: 'answered'`,
  `grade: null`, `divergent: false` and `grade_usage: null`; Phase 4 appends a
  byte-copy delta line changing ONLY those four keys (E2 amendment, F44 + F49
  -- only grading can determine `divergent`, which D6 needs to absorb the
  2020-2025 era spread F2 quantified, or `grade_usage`, without which E10's
  cost-per-question omits the grading pass). `usage` stays IMMUTABLE: it is the
  ANSWERING pass's accounting, and the two names differ only by a prefix.
  Phase 5's explorer generator and Phase 8's findings doc
  reconstruct last-line-wins. Verdict vocabulary is `match | partial | miss`
  and nothing else. Records live at `eval/sim/records/<run_id>.jsonl`, one file
  per run, gitignored (E13). **The headline is computed over the bulk run's
  file alone**; pilot records never pool into it.
- **The telemetry baseline** (`eval/sim/telemetry-baseline.json`): pre-run
  `query_log` / `embedding_api_log` / `oracle_meta` / `chat_threads` counts, so
  Phase 6 and Phase 8 can attribute row growth to the arc.
- **What this phase does NOT ship**, so no later phase plans on it: `TOOL_LIST`
  is declared `const` and is NOT exported from `index.ts` (F21), so E6's
  "import the tool schemas, never hand-write them" needs a one-word `export`
  that Phase 2 adds -- importing `index.ts` is otherwise safe, since its
  `main()` runs only under `import.meta.main`; the DeepSeek client, the pricing
  table, the JSONL writer, and the resume logic are all Phase 2's;
  `faq-domains-resolve.ts` is untouched and stays Phase 3's input.

## Open questions

1. **`strict_order` vs `relaxed_order` vs raising `ef_search`.** Default:
   `strict_order`, set per-statement via `SET LOCAL` inside `db.begin`.
   Attribution matters here: the reason is pgvector's DOCUMENTED contract --
   relaxed scans are specified to permit out-of-order results, and RRF fuses on
   rank -- **not** an observed difference on this corpus. Measured at drafting
   time, `relaxed_order` and `strict_order` returned identical id lists in
   identical order on 50/50 scoped self-excluded queries. `strict_order` is
   chosen because it is free (2.4-2.7 ms scoped, and 0.60 vs 1.07 ms unscoped
   -- cheaper than `off`) and does not depend on a behaviour the docs decline
   to guarantee. Raising `ef_search` is rejected: the required value depends on
   filter selectivity, which varies per question, whereas iterative scan is
   self-limiting (`hnsw.max_scan_tuples` 20,000). Overrule: operator, or a
   Phase 2/6 finding showing a latency problem at bulk scale.
2. **Apply the iterative-scan setting always, or only when the context carries
   a filter.** Default: always -- both cells carry the leave-one-out predicate;
   the planner switches strategies with selectivity (the `#antilag` bitmap-scan
   case), so no per-cell reasoning is reliable; and the unscoped top-12 is
   identical either way (probe 6). One code path means no cell-conditional SQL
   shape for an E7 asymmetry to hide in. Overrule: operator.
3. **`channels: string[]` vs a single `channel: string`.** Default: array.
   Spec D1 explicitly parks "localizing the source channel is a cheap follow-up
   on the same harness" -- with an array that follow-up is a caller change and
   no contract amendment. Overrule: operator.
4. **Exporting `lexicalCandidates` / `semanticCandidates` for the boundary
   probe.** Default: export them. The starvation defect is invisible at the
   tool's output level, so the alternative is a probe that re-types the SQL and
   drifts away from the implementation it guards. Cost: two more names in a
   module's surface, both marked test-only. Overrule: operator, or a reviewer
   who prefers a `__debug` field on the response (rejected here because that
   WOULD change the agent-visible payload).
5. **Pinning `limit` server-side overrides what the model asked for.**
   Default: pin at 3 for both B and C. It is symmetric so it cannot bias
   B-vs-C, and it is house-consistent (`search-entities.ts:72` already clamps).
   The honest cost: if a model would have chosen `limit: 5` in real use, the
   eval measures a slightly different product than a live consumer gets --
   and F17 shows that difference is not negligible (51.5% starvation at fanout
   20 under the old default). Overrule: operator; raising the pin is a
   one-constant change plus a re-run, not a contract amendment.
6. **`stage` on the record, plus the byte-copy delta line.** Default: present,
   with last-line-wins reconstruction and `validateGradedDelta` enforcement
   (F19), and a mutable set of exactly `{grade, stage, divergent, grade_usage}`
   (E2 amendment, F44 then F49), enforced as a DENYLIST rather than an
   immutable-field allowlist for the fail-closed reason argued in Contract (b).
   It is the only reading that satisfies E2 and E9 simultaneously, makes resume
   exact, and still lets grading write the things only grading can know.
   Overrule: operator; any change to the mutable set is a contract amendment
   because Phase 2's writer, Phase 4's grader, Phase 8's era cut and E10's
   cost arithmetic all key on it.
7. **One file per run, headline over the bulk file only.** Default as stated in
   Contract (b). Overrule: operator -- the alternative (pool pilot into the
   headline) is cheaper by ~90-150 DeepSeek passes but imports a possibly-stale
   rubric into the arc's top-line number.
8. **Symlink vs copy for the worktree `.env`.** Default: symlink -- one copy of
   the secret on disk, and a rotation in the main checkout propagates. Risk:
   deleting the main checkout breaks the worktree. Overrule: operator.

## Recovery

- **`bun install` fails at the worktree root or under `serve/mcp/`.** Both
  packages have committed lockfiles, so a network-flaky install is a retry, not
  a resolution problem. Do NOT delete a lockfile to "fix" it -- a
  re-resolution would drift the MCP SDK away from the 1.30.0 this phase's stdio
  behaviour was verified against.
- **`Cannot find module '@modelcontextprotocol/sdk/...'` at runtime, or TS2307
  at typecheck.** The file importing the SDK is outside
  `apps/qw-oracle/serve/mcp/`. The SDK is installed ONLY there and resolution
  walks up from the importing file, so nothing under `eval/sim/` can reach it.
  Move the file to `serve/mcp/scripts/` (Task 4's remedy) rather than adding
  the dependency elsewhere. This is the FIRST thing to check on a red
  typecheck.
- **`bun run typecheck` red for a different reason.** If the error is
  `eval/eval.ts(75,46): Property 'session_id' does not exist on type
  'ThreadHit'`, the include pattern was widened to `eval/**/*` instead of
  `eval/sim/**/*` -- narrow it back. That is a pre-existing defect (F18) this
  arc does not own; do not fix `eval.ts` here (E14: findings are routed, not
  fixed in-arc).
- **The spawned server exits immediately.** Three known causes, in order of
  likelihood. (1) Wrong cwd: the child gets only
  `HOME/LOGNAME/PATH/SHELL/TERM/USER`, so `DATABASE_URL` comes from `.env` in
  its cwd and nowhere else -- stderr reads `DATABASE_URL is not set` from
  `shared/db.ts:10`. (2) The embedding-space verifier: it runs BEFORE transport
  bind and calls `process.exit(1)` when the build/query cosine falls under
  threshold; its stderr line names the cosine. (3) `parseEnvContext()` threw on
  a malformed `L2_RETRIEVAL_*` value -- by design. A Voyage OUTAGE is not fatal
  (it warns and continues lexical-only), which is its own hazard because a
  lexical-only cell is a silently different cell. Piping the child's stderr
  (Task 4 step 1) is what makes all four distinguishable.
- **The spawned server HANGS instead of exiting.** Check `MCP_TRANSPORT` in the
  child env: an `http` value binds a port and never speaks stdio, so the client
  handshake waits forever. Task 4 passes and asserts `stdio` explicitly for
  exactly this reason.
- **A retrieval probe returns zero rows, or the lexical path throws.** Check
  `L2_RETRIEVAL_CHANNELS` spelling first: channel names carry a leading `#`
  (`#helpdesk`, not `helpdesk`). The parser's known-name validation prevents a
  value that survives parsing but matches nothing; if it was loosened, tighten
  it back rather than debugging downstream. A throw from the lexical path in
  eval mode is the F22 change working as designed -- read the stderr line it
  logged before re-throwing; do not restore the silent `[]`.
- **`chat_threads` count differs from 40,219 at probe 8.** Stop. That is a
  corpus move (E4 / F3), and Phase 3's frozen frame plus every record taken
  either side of it become incomparable. Confirm against
  `.claude/calendar-checks.txt` whether the monthly harvest ran, record it as a
  finding, and get the operator's call before any later phase proceeds -- this
  is the failure that quietly invalidates the arc's numbers rather than
  breaking anything visibly.
- **Telemetry volume looks alarming mid-phase.** Expected: one `query_log` row
  and one `embedding_api_log` row per tool call, plus an `oracle_meta` upsert
  on the first server start past the 24 h TTL. E3's carve-out covers it and the
  Task 2 baseline makes the growth attributable. NOT expected: growth in
  `chat_threads` / `thread_messages` / `messages` / `entities` / `concepts` --
  any of those means something wrote to the corpus and the phase has broken E3.
- **The baseline was taken after Tasks 3-4 ran.** It is not recoverable by
  re-running the SQL -- the rows are already written. Recover by subtracting
  the known volume: the probes' tool-call count is deterministic and printed,
  so record the corrected pre-run figure with a note. Better: do not let it
  happen; Task 2 exists before Tasks 3 and 4 for this reason alone.
