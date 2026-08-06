# Phase 2 -- answering skeleton (the tool loop, cells A/B/C, records, resume)

**Arc:** oracle-eval-simulation. **Ledger:** `decisions.md` E5, E6, E7, E9, E10,
E12, E13 (this phase owns the DeepSeek client, the tool-calling loop, the cell
definitions, the JSONL store, and the pricing table). **Spec:**
`docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md` D2, D8, and
D6 stage 2 only -- **no grading in this phase** (D6 stage 3 is Phase 4).
**Findings consumed:** F5, F8, F9, F15, F16, F21, F22.
**Findings raised here:** F23-F26. **Contract inherited:**
`phase-1-eval-surface-contract.md` -- Phase 2 conforms to it and redefines
nothing in it. **Lane:** worktree `/home/dev/projects/quakeworld-eval`, branch
`eval-oracle-sim`.

## Goal

Build the walking skeleton that pushes a question through all three conditions
and lands a legal, ungraded run record on disk for each pass. Net-new in this
phase: a DeepSeek tool-calling loop (there is no tool-calling prior art anywhere
in the repo, F5), an in-process tool executor that imports the real handlers and
the real tool schemas (E6), the three cell definitions with symmetry enforced by
a probe rather than by convention (E7), an append-only JSONL store with
crash-resume (E9), and dollar accounting off a pinned pricing table (E10). The
phase ends with the 12 existing phase-8 questions answered end-to-end in all
three cells -- 36 records, every one validating against Phase 1's
`validateRunRecord` with `stage: 'answered'` and `grade: null` -- a deliberate
`kill -9` mid-run proving resume loses nothing, the budget-exhausted forcing
turn proven on the real path rather than assumed (F16c), and a measured dollar
total printed for the phase.

Grading, the sample manifest, `truth` extraction, and the explorer are all
somebody else's phase. Nothing here reads or writes a `grade`.

## Inputs from previous phase

Phase 1 is LANDED. These are its shipped artifacts, quoted from
`phase-1-eval-surface-contract.md`'s "Outputs to next phase" section. **A
landed claim is a hypothesis until re-probed** -- Task 0's entry probe
re-verifies the five that are load-bearing here, and a miss is a finding routed
back to Phase 1, not a workaround.

| From Phase 1 | What Phase 2 does with it |
|---|---|
| `RunRecord`, `Usage`, `Condition`, `Verdict`, `Stage`, `ToolCallRound`, `ToolCall`, `validateRunRecord`, `toGradingInput` in `eval/sim/run-record.ts` | the record shape and the validator; `Usage` is the client's usage type, not a second declaration |
| Append rules: one line per stage event, `stage: 'answered'` with `grade: null`, reconstruction last-line-wins per `record_id`, resume on `(record_id, stage)` | the JSONL store's entire semantics |
| `record_id` = `${thread_id}:${condition}:${answering_model}`; `answering_model` must not contain `:` | record identity; `deepseek-v4-flash` is `:`-free |
| Records live at `eval/sim/records/<run_id>.jsonl`, one file per run, gitignored | the store's path convention |
| `searchSolvedIssues(args, ctx?)` -- second positional parameter, `RetrievalContext` | the executor passes the per-cell context here and nowhere else |
| `RetrievalContext = { channels?, excludeThreadIds?, pinnedLimit? }`; cell B `{ channels: ['#helpdesk'], excludeThreadIds: [threadId], pinnedLimit: 3 }`, cell C the same minus `channels`; `max_messages_per_session: 40` supplied explicitly by the caller | `cells.ts`'s `ctxFor()` |
| With a non-empty ctx the lexical path THROWS instead of returning `[]` (F22) | a retrieval throw is a FAILED pass, never an empty result |
| `eval/sim/tool-surface.pin.json` -- digest of the served `search_solved_issues` `inputSchema` | Task 1 hashes the IMPORTED schema against it (E6) |
| `eval/sim/telemetry-baseline.json` -- pre-run `query_log` / `embedding_api_log` / `oracle_meta` / `chat_threads` counts | Task 7's attribution probe subtracts from it |
| `apps/qw-oracle/tsconfig.json` `include` gains `eval/sim/**/*`; `serve/mcp/package.json` gains a `typecheck` script | both typechecks must stay green |
| `.env` symlinked into the worktree; both `node_modules` trees installed | every command below runs from `apps/qw-oracle` |
| `TOOL_LIST` is 13 tools and is **NOT exported** (F21) | Task 1 adds the one-word `export` |

Two Phase-1 facts this phase deliberately does NOT consume: the spawnable stdio
recipe (that is Phase 7's, E11) and `validateGradedDelta` (that is Phase 4's).

## Verified before drafting (2026-08-06)

Everything below was probed first-hand this date. Costs are the real billed
shape, not estimates.

**DeepSeek function calling, 10 live calls against
`https://api.deepseek.com/chat/completions`, `model=deepseek-v4-flash`, total
spend $0.0025** (probe scripts were scratch-only; no repo file was touched):

1. **The MCP `inputSchema` is the OpenAI `function.parameters`, verbatim.** The
   adapter is a projection, not a translation:
   `{ type: 'function', function: { name, description, parameters: inputSchema } }`.
   Round 1 of the loop returned `finish_reason=tool_calls` with two well-formed
   parallel calls whose arguments matched the schema.
2. **The awkward real schemas are accepted unchanged.** Probed with four
   transcribed verbatim from `TOOL_LIST`: `lookup_entity` (11-value enum),
   `search_maps` (**no `required` key at all**, array-of-enum items),
   `search_mechanics` (15-value enum), `redirect_to_human` (no required). HTTP
   200, `finish_reason=stop`. So no schema massaging is needed for any of the 13.
3. **The assistant message is pushed back verbatim and that works.** The message
   carries `["role","content","reasoning_content","tool_calls"]` --
   `reasoning_content` is present (243-373 chars in two samples) and echoing the
   whole message object back into `messages` was accepted both times. Do not
   strip fields; append the object as received.
4. **F16(c) DISCHARGED -- the forcing turn terminates, but only with the nudge.**
   `tools` present + `tool_choice: 'none'` + a one-line user message telling the
   model the budget is spent returned `finish_reason=stop`, 1,723 chars of clean
   prose, zero tool calls.
5. **F23 (NEW, MAJOR) -- `tool_choice: 'none'` WITHOUT the nudge message leaks
   raw tool-call markup as the answer.** Reproduced 2/2. `finish_reason` is
   `stop` and `tool_calls` is empty, so every structural check passes, but
   `message.content` is the model's internal invoke template -- sample heads:
   `<|DSML|tool_calls> <|DSML|invoke name="search_knowledge_base">` and
   `<|DSML|tool_calls> <|DSML|invoke name="bash"> ... curl -sL ...`. Both name
   tools that were never offered. Left undetected this writes a garbage `answer`
   into the record, the grader scores it a miss, and the headline reports an
   oracle failure caused by harness mechanics. Disposition: the nudge message is
   load-bearing AND the harness carries a leak sentinel regardless (below).
6. **Dropping the `tools` array entirely on the forcing turn is also accepted**
   (`finish_reason=stop`, clean prose) even though the history contains
   `tool_calls`. Two viable backstops; `tool_choice: 'none'` is chosen because it
   keeps the request payload identical to the loop's other turns except one
   field, which is what the E7 symmetry probe can assert mechanically.
7. **Cell A works with no `tools` key at all** -- one turn,
   `finish_reason=stop`, 2,004 chars.
8. **Usage envelope field names confirmed live:** `prompt_tokens`,
   `completion_tokens`, `prompt_cache_hit_tokens`, `prompt_cache_miss_tokens`,
   `completion_tokens_details.reasoning_tokens` (plus a redundant
   `prompt_tokens_details.cached_tokens`). Exactly the five Phase 1's `Usage`
   declares, so there is no translation layer.

**Repo facts (read first-hand, not inferred):**

- `serve/mcp/src/index.ts:212` is `const TOOL_LIST = [` -- module-local. The
  file's only export is `createServer` (line 105). F21 confirmed.
- `main()` is guarded by `import.meta.main` (line 496), so importing the module
  starts no server. Module-scope side effects are the `postgres()` client
  construction via `./db.ts` -> `shared/db.ts` (which THROWS if `DATABASE_URL`
  is unset) and an `express` import via `./transports/http.ts`. No connection is
  opened until a query runs.
- `dispatchAndLog` is exported from `serve/mcp/src/query-log.ts:38` and returns
  `{ content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] }` --
  byte-for-byte the payload an MCP client receives. `setConsumerHint` is
  exported alongside it and writes `query_log.consumer_hint` (column confirmed
  present on the twin).
- The 13 handlers are each exported from `serve/mcp/src/tools/*.ts`. The
  dispatch `switch` itself lives inside `createServer()`'s closure and is NOT
  exported -- so the harness must build its own name-to-handler map, which is
  the drift risk F24 covers.
- `describeMode`, `lookupMap`, `lookupMechanic`, `lookupGameplayEntity`,
  `searchMaps`, `searchMechanics` and `searchGameplayEntities` return their own
  named response interfaces rather than `ToolResponse<T>`; all seven are
  accepted by `dispatchAndLog`, whose bound is `R extends ToolResponse<unknown>`,
  so they are structurally compatible. The executor's map therefore needs one
  loose value type plus the same `args as {...}` casts `index.ts` already uses,
  not seven special cases.
- Three tools embed a query and write an `embedding_api_log` row per call:
  `search_solved_issues`, `search_entities`, `search_concepts`.
- `fence-external.ts` exports only `validateFence`. `waves` / `runGently` /
  `loadApiKey` are module-local, so the recipe is PORTED into
  `deepseek-client.ts`, not imported. Its persistence model is not ported (F15).
- Pricing, from the 2026-08-05 spike report's live-doc check
  (`docs/superpowers/parking/2026-08-05-contract-worker-spike-report.md:96-99`,
  source https://api-docs.deepseek.com/quick_start/pricing): `deepseek-v4-flash`
  **$0.14 / 1M input cache-miss, $0.0028 / 1M input cache-hit, $0.28 / 1M
  output**; `deepseek-v4-pro` $0.435 / $0.87. A **2x peak-hour surcharge is
  announced** for 03:00-06:00 and 08:00-12:00 CEST, effective date TBD.
- **Tool-payload size, measured on the twin** (read-only SQL over a
  deterministic 300-thread `#helpdesk` solved sample, `ORDER BY md5(id::text)`):
  16.3 messages per thread on average, and the top-40 message transcript is 906
  chars on average, 2,089 at p90, 4,698 worst. So a `search_solved_issues`
  response at the pinned `limit: 3` is roughly 9-15 KB of pretty-printed JSON,
  i.e. low single-digit thousands of tokens per call. The loop's prompt growth
  is bounded and mostly cache-hit.

## The shared client module (Phase 3 imports this -- contract)

**Phase 2 owns `apps/qw-oracle/eval/sim/deepseek-client.ts`.** Phase 3's key
extraction imports from it. The exported surface below is complete and
normative: Phase 3 may rely on exactly these names and no others, and a Phase 3
need that is not on this list is a `TBD(phase-2-client: <capability>)` token in
Phase 3's doc plus a finding here -- never an invented signature.

```ts
// apps/qw-oracle/eval/sim/deepseek-client.ts

// --- constants (pinned; E7 requires one value per axis for every cell) ------
export const DEEPSEEK_BASE_URL: string;   // 'https://api.deepseek.com'
export const DEEPSEEK_MODEL: string;      // 'deepseek-v4-flash'
export const CALL_TIMEOUT_MS: number;     // 300_000
export const MAX_OUTPUT_TOKENS: number;   // 16_384
export const MAX_ATTEMPTS: number;        // 3 (one call + two retries)

// --- types -----------------------------------------------------------------
// Usage is Phase 1's interface, re-exported so callers have one import path
// and there is never a second declaration to drift.
export type { Usage } from './run-record.ts';

export interface OpenAiTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}
export interface RawToolCall {
  id: string;
  type: string;                       // 'function'
  function: { name: string; arguments: string };  // arguments is a JSON STRING
}
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  reasoning_content?: string;         // present on assistant turns; echo it back untouched
  tool_calls?: RawToolCall[];
  tool_call_id?: string;              // required on role: 'tool'
}
export interface ChatRequest {
  messages: ChatMessage[];
  tools?: OpenAiTool[];               // omitted entirely in cell A (D8)
  tool_choice?: 'auto' | 'none';      // omitted when tools is omitted
  temperature: number;
  max_tokens: number;
  response_format?: { type: 'json_object' };   // Phase 3's key extraction uses this
}
export interface ChatResult {
  message: ChatMessage;               // the assistant message, as received
  finish_reason: string;              // 'stop' | 'tool_calls' | 'length' | ...
  usage: Usage;                       // cost_usd already filled from pricing.ts
  latency_ms: number;
  attempts: number;                   // 1 = first try succeeded
}
export class DeepSeekError extends Error {
  readonly status: number | null;     // HTTP status, or null for a network/timeout failure
  readonly attempts: number;
  readonly bodyHead: string | null;   // first 300 chars of the error body, key never included
}

// --- calls -----------------------------------------------------------------
/** One chat-completions call. Retries MAX_ATTEMPTS times on network failure,
 *  timeout, HTTP 429 and HTTP 5xx with a fixed backoff; throws DeepSeekError
 *  when attempts are exhausted or the status is a non-retryable 4xx. The retry
 *  policy is a single module constant so it cannot differ per cell (E7). */
export async function chatCompletion(
  req: ChatRequest,
  opts?: { model?: string; timeoutMs?: number; maxAttempts?: number },
): Promise<ChatResult>;

/** One-shot JSON-mode call. Sets response_format json_object, strips an
 *  accidental markdown fence (the lenient transport parse
 *  fence-external.ts:292-294 already performs), then JSON.parses. A parse
 *  failure throws DeepSeekError, so a malformed response is a counted,
 *  retryable failure rather than a silent null. This is the Phase 3 key
 *  extraction's entry point (and Phase 4's grader will want it too) -- the
 *  fence-stripping lives here once instead of in every caller. */
export async function chatJson(
  req: Omit<ChatRequest, 'response_format' | 'tools' | 'tool_choice'>,
  opts?: { model?: string; timeoutMs?: number; maxAttempts?: number },
): Promise<{ value: unknown; usage: Usage; finish_reason: string; latency_ms: number; attempts: number }>;

/** Paced concurrency, ported from fence-external.ts's runGently: waves of
 *  `conc` with a 500ms inter-wave pause, then one 8s-recovery retry pass over
 *  the nulls, honest counts. A permanently failing item stays null; the caller
 *  decides what that means. */
export async function runGently<T, R>(
  items: T[],
  conc: number,
  run: (item: T) => Promise<R>,
  tag: string,
): Promise<(R | null)[]>;

// --- accounting ------------------------------------------------------------
export function emptyUsage(): Usage;
export function addUsage(a: Usage, b: Usage): Usage;
/** One-line spend report: calls, prompt/cache-hit/cache-miss/completion/
 *  reasoning tokens, and the dollar total. Printed by every phase (E10). */
export function formatSpend(label: string, calls: number, u: Usage): string;
```

The key comes from `DEEPSEEK_API_KEY`, falling back to
`~/.secrets/llm-contract-worker.env` -- the loader is a private function copied
from `fence-external.ts:164-176` (verified present, `chmod 600`, one
`DEEPSEEK_API_KEY=` line). It is never exported, never logged, and never lands
in `DeepSeekError.bodyHead`.

Sibling module, deliberately separate so a phase can price records without
pulling the HTTP client:

```ts
// apps/qw-oracle/eval/sim/pricing.ts
export interface ModelPrice {
  input_cache_miss_per_mtok: number;
  input_cache_hit_per_mtok: number;
  output_per_mtok: number;
}
export const PRICING: Record<string, ModelPrice>;   // 'deepseek-v4-flash', 'deepseek-v4-pro'
export const PRICING_SOURCE: string;                // url + the date it was read
/** Throws on an unknown model rather than pricing it at zero -- a silent zero
 *  would make the arc's cost claim a fiction (E10). */
export function costUsd(u: Usage, model: string): number;
/** True when the ISO timestamp falls in DeepSeek's announced 2x surcharge
 *  window (03:00-06:00 and 08:00-12:00 CEST). Does NOT change the price --
 *  effective date is TBD and we cannot verify billing -- it only makes the run
 *  summary print a warning naming how many calls landed in the window. */
export function isPeakWindow(startedAtIso: string): boolean;
```

## The cell definitions (E7 -- symmetry is the measurement)

`apps/qw-oracle/eval/sim/cells.ts`:

```ts
export const ANSWERING_MODEL = DEEPSEEK_MODEL;   // 'deepseek-v4-flash'
export const TEMPERATURE = 0;
export const MAX_TOOL_ROUNDS = 4;
export const PINNED_LIMIT = 3;                   // Phase 1's ctx.pinnedLimit
export const PINNED_MAX_MESSAGES = 40;           // supplied explicitly, both cells

/** Shared persona, D8. Identical in all three cells. Contains no tool name and
 *  no reference to tools -- the tool section exists only where tools do. */
export const PERSONA: string;

/** Cells B and C: PERSONA + '\n\n' + ORIENTATION_INSTRUCTIONS, imported from
 *  serve/mcp/src/orientation.ts (E6: production orientation text, including the
 *  grounding-discipline rule, never hand-written). Cell A: PERSONA alone. */
export function systemPrompt(cell: Condition): string;

/** The retrieval context the executor passes as searchSolvedIssues' second
 *  parameter. Cell A never calls a tool, so it has none. */
export function ctxFor(cell: Condition, threadId: string | null): RetrievalContext | null;

/** The FIRST-turn request payload, assembled without calling anything. This is
 *  the function the symmetry probe diffs. */
export function buildInitialRequest(cell: Condition, question: string): ChatRequest;
```

`PERSONA` (draft; the exact wording is a task step, these properties are
normative): tells the model it is answering a QuakeWorld player's help-channel
question, asks for the specific setting / file / procedure that fixes it, asks
it to say plainly when it does not know, and caps the answer length. It names no
tool, mentions no retrieval, and coaches no cell.

**The symmetry contract, stated so it is mechanically checkable:**

| Pair | Permitted delta | Everything else |
|---|---|---|
| A vs B | `messages[0].content` (B is A's plus `'\n\n' + ORIENTATION_INSTRUCTIONS`), the presence of `tools`, the presence of `tool_choice` | byte-identical |
| B vs C | **nothing** -- `JSON.stringify(reqB) === JSON.stringify(reqC)` | the entire request |
| B vs C, server side | `ctxFor('B', t).channels` is `['#helpdesk']`, `ctxFor('C', t).channels` is undefined | `excludeThreadIds` and `pinnedLimit` equal |

B-vs-C request equality is the strongest form of E5's "agent-invisible": scope
lives only in the object handed to `searchSolvedIssues`, and the model's payload
cannot tell the cells apart. The probe asserts equality of the serialized
payload, not a field-by-field walk, so a future field added anywhere is covered
without editing the probe.

Three further symmetry rules, each of which the probe or the runner enforces
because each is a confound that would land straight in the headline:

1. **One retry policy.** `chatCompletion`'s retry constants are module-level and
   no call site overrides them. `probe-cell-symmetry.ts` asserts this by source
   inspection: it reads `eval/sim/run-answering.ts` as text, matches every
   `chatCompletion(` occurrence, and FAILS if any of them is followed by a
   second argument before the closing call. Crude, but the alternative is an
   unenforceable comment, and a per-cell retry budget is exactly the kind of
   asymmetry that reads out as a quality difference.
2. **One work queue.** The runner builds the flat product of
   (question x cell) as a single array ordered by (question index, cell) and
   hands it to ONE `runGently` call, so pacing, wave boundaries and
   time-of-day exposure are spread identically across cells. Cells are never
   run as three separate passes.
3. **One failure semantic.** A retrieval throw (F22), a `finish_reason` of
   `length`, an exhausted retry, an empty answer, or a leaked-markup answer
   (F23) all produce the same outcome: `error` non-null, `answer` whatever came
   back, and the pass excluded from any rate. This is identical in all three
   cells even though only B/C can hit the retrieval cases.

## The tool loop (net-new; F5 says there is no prior art to copy)

One pass, for a cell with tools:

```
messages = [system, user(question)]
for round = 1 .. MAX_TOOL_ROUNDS:
    r = chatCompletion({ messages, tools, tool_choice: 'auto', temperature, max_tokens })
    if r.finish_reason == 'length'          -> fail the pass ('truncated at max_tokens')
    if r.finish_reason != 'tool_calls'      -> answer = r.message.content; break
    messages.push(r.message)                            # verbatim, reasoning_content included
    execute r.message.tool_calls IN PARALLEL (F16b)     # an ARRAY per round, never flattened
    record one ToolCallRound { round, calls: [...] }
    for each call: messages.push({ role:'tool', tool_call_id, content })

# all MAX_TOOL_ROUNDS rounds ran and none produced an answer -> the backstop
if answer is still unset:
    messages.push({ role: 'user', content: BUDGET_EXHAUSTED_NUDGE })
    r = chatCompletion({ messages, tools, tool_choice: 'none', temperature, max_tokens })
    answer = r.message.content

# in every branch, including the failure branches above
if answer is empty/whitespace                -> fail the pass
if LEAK_SENTINEL.test(answer)                -> fail the pass (F23)
```

Cell A is the same function with `tools` omitted, `tool_choice` omitted, and the
loop trivially terminating at round 1 -- one code path, not a second runner.

`BUDGET_EXHAUSTED_NUDGE` is a single pinned string, appended only on the
exhausted branch, identical in B and C. F23 proves it is load-bearing: without
it, `tool_choice: 'none'` returns `finish_reason=stop` with the model's internal
invoke template as the answer, 2 out of 2 samples.

`LEAK_SENTINEL = /DSML|invoke name=/` -- verified: it matches both captured leak
samples and does not match a clean 160-char answer. It is deliberately crude;
its job is to convert a silent data-poisoning failure into a loud one, and a
false positive costs one re-run of one pass.

**Tool execution is in-process (E6).** `eval/sim/tool-executor.ts` holds an
explicit `Record<string, (args, ctx) => Promise<...>>` map over the 13 handlers
imported from `serve/mcp/src/tools/*.ts`, and each entry is invoked through
`dispatchAndLog` from `serve/mcp/src/query-log.ts` so that (a) the text the
model reads is the exact `JSON.stringify(response, null, 2)` envelope an MCP
client would receive, and (b) each call writes its `query_log` row, keeping E3's
telemetry story true for the in-process consumer. `setConsumerHint('eval-sim/'
+ run_id)` is called once at startup, which makes every row this arc writes
attributable by a single SQL predicate.

Only `search_solved_issues` receives the retrieval context; the other twelve
take one argument, exactly as `index.ts`'s switch does. `max_messages_per_session`
is forced to `PINNED_MAX_MESSAGES` on that one tool; `limit` is NOT rewritten in
the args -- Phase 1's `ctx.pinnedLimit` overrides it server-side, which is the
whole point of the pin. Consequence to state once so Phase 8 does not misread
it: **`tool_calls[].arguments` records what the MODEL asked for, verbatim from
the tool call; the budget actually executed is always
`retrieval_context.pinned_limit`.** A record showing `arguments.limit: 5` next
to `pinned_limit: 3` is correct data, not the defect E7's amendment warns about.

An unknown tool name, unparsable `arguments` JSON, or a handler throw produces a
`ToolCall` with `result_count: null` and `error` set, and a `role: 'tool'`
message carrying the error text -- the loop continues, because a model
recovering from a bad call is legitimate behaviour. What does NOT continue is a
retrieval throw from the F22 path: that means the measurement apparatus is
broken, so the pass fails.

## The record store (E9 + Phase 1's append rules)

`apps/qw-oracle/eval/sim/jsonl-store.ts`:

```ts
export function recordsPath(runId: string): string;   // eval/sim/records/<runId>.jsonl
/** Appends one line: JSON.stringify(record) + '\n', via a single appendFileSync.
 *  Validates with Phase 1's validateRunRecord FIRST and throws on a reject, so
 *  a malformed record can never reach disk. */
export function appendRecord(runId: string, rec: RunRecord): void;
/** Reads the file line by line. An unparsable line that is the LAST line is
 *  tolerated (reported on stderr, dropped) -- that is the SIGKILL-mid-write
 *  case. An unparsable line anywhere else is fatal. Reconstruction is
 *  last-line-wins per record_id (Phase 1 rule 3). */
export function readRecords(runId: string): { records: RunRecord[]; truncatedTail: boolean };
/** The resume key set: every (record_id, stage) pair present in the file,
 *  EXCLUDING pairs whose latest line has error !== null. */
export function completedKeys(runId: string): Set<string>;
/** How many failed lines the file already holds for this record_id. */
export function failureCount(runId: string, recordId: string): number;
```

Two rulings this phase makes, both because leaving them implicit would decide
themselves badly:

1. **A failed pass does not count as completed.** E9's resume "skips completed
   keys"; if a record written with `error` non-null counted as completed, one
   transient 500 would permanently bake a hole into the bulk run's coverage.
   Failed records are re-attempted on resume, and last-line-wins means a later
   success supersedes the failure with no cleanup.
2. **...but not forever.** `run-answering.ts` refuses to re-attempt a
   `record_id` that already carries 3 or more failed lines, and lists them in
   the run summary. A question that fails four times is an operator decision,
   not a retry loop.

A partial trailing line is possible: a record with a 2,000-char answer exceeds
`PIPE_BUF`, so a single `appendFileSync` is not atomic against `SIGKILL`. The
reader's tolerate-the-last-line rule is the answer, and Task 7's kill probe is
what proves it rather than assuming the write happened to be atomic.

## The fixture questions, and the honest cost of using them

The skeleton runs the 12 questions in `apps/qw-oracle/eval/eval-queries.json`
(ids 1-12, categories `concept-anchored` / `vague-natural-language` /
`exact-name` / `out-of-corpus`). They are hand-built deploy-gate queries, not
corpus threads -- so several `RunRecord` fields that mean something specific for
a real sampled thread have no true value here. **The fiction is named rather
than hidden** (raised as F25):

| Field | Fixture value | Why it is not a lie by omission |
|---|---|---|
| `thread_id` | `p8-01` .. `p8-12` | not a decimal `chat_threads.id`, so it can never be mistaken for one or collide with one |
| `thread_key` | `phase8-fixture-01` .. `-12` | same |
| `domain` | `phase8-fixture` | not a `faq-domains-resolve.ts` key |
| `era` | `0` | an integer, and obviously not a year |
| `truth` | `PHASE8_FIXTURE expected_top_3: <ids>` or `... (none -- out-of-corpus)` | non-empty, and self-identifying as not an extracted key |
| `retrieval_context.exclude_thread_ids` | `[]` | there is no own-thread to leave out; Phase 1's probes 3-6 already prove exclusion at SQL and stdio level, and Task 5's probe proves the in-process wiring separately |

The mechanical firewall already exists in Phase 1's contract: the headline is
computed over the BULK run's file alone, and the smoke run is its own `run_id`
file, gitignored. No phase pools it.

**If Phase 1's shipped `validateRunRecord` range-checks `era` to 2020-2025**,
`era: 0` will be rejected. That is an escalation, not a workaround: F25 becomes
a Phase 1 amendment request (an explicit fixture allowance), and the fixture
does NOT get given a plausible fake year to slip past the validator.

## Files touched

**Created (all under `apps/qw-oracle/eval/sim/`, E12 -- none of them import the
MCP SDK, so none belongs in `serve/mcp/scripts/`):**
- `pricing.ts`
- `deepseek-client.ts` (the Phase 3 seam)
- `tool-surface.ts`
- `tool-executor.ts`
- `jsonl-store.ts`
- `cells.ts`
- `run-answering.ts`
- `probe-tool-surface.ts`
- `probe-cell-symmetry.ts`
- `probe-jsonl-store.ts`
- `probe-tool-executor.ts`
- `probe-forcing-turn.ts`
- `probe-records.ts`

**Modified:**
- `apps/qw-oracle/serve/mcp/src/index.ts` -- one word: `export const TOOL_LIST`
  (F21). Nothing else in the file changes.

**Deleted:** none.

**Written but not committed** (gitignored by Phase 1's `.gitignore` line):
`apps/qw-oracle/eval/sim/records/<run_id>.jsonl`.

## Tasks

Ordering is backward-only: Task N consumes only Tasks 1..N-1 and Phase 1's
outputs. Checked deliberately, because a topology cycle is not a per-claim
error and no per-claim review finds it. Dependency edges, all pointing left:
T0 <- (nothing); T1 <- P1; T2 <- P1; T3 <- P1; T4 <- T1, T2; T5 <- T1;
T6 <- T2, T3, T4, T5; T7 <- T6.

### Task 0 -- Entry re-verification of Phase 1's outputs · `inline`

**Goal:** the five Phase-1 claims this phase builds on are true TODAY, not just
on the day Phase 1 landed.

**Files:** none.

**Steps:** run the probe below. Any FAIL stops the phase and routes back to
Phase 1 as a finding.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const fails = [];
    const ck = (ok, m) => { console.log((ok ? "PASS " : "FAIL ") + m); if (!ok) fails.push(m); };
    const rr = await import("./eval/sim/run-record.ts");
    ck(typeof rr.validateRunRecord === "function", "validateRunRecord exported");
    ck(typeof rr.toGradingInput === "function", "toGradingInput exported");
    const fx = await Bun.file("eval/sim/fixtures/run-record.answered.json").json();
    const v = rr.validateRunRecord(fx);
    ck(v.ok === true, "the answered fixture validates");
    ck(v.ok && v.record.grade === null, "absent grade normalises to null");
    const ss = await import("./serve/mcp/src/tools/search-solved-issues.ts");
    ck(ss.searchSolvedIssues.length >= 1, "searchSolvedIssues importable");
    ck(await Bun.file("eval/sim/tool-surface.pin.json").exists(), "tool-surface.pin.json present");
    ck(await Bun.file("eval/sim/telemetry-baseline.json").exists(), "telemetry-baseline.json present");
    ck((process.env.DATABASE_URL ?? "").includes("qw-oracle-postgres-dev:5432/"), "DATABASE_URL points at the twin");
    process.exit(fails.length ? 1 : 0);'

Expect every line `PASS` and exit 0.

### Task 1 -- The tool surface: export it, import it, hash it · `agent (workhorse, medium)`

**Goal:** the agent sees the production schemas and the production orientation
text, imported rather than transcribed, and an import-vs-serve divergence is
mechanical (E6).

**Files:** `serve/mcp/src/index.ts` (one word), `eval/sim/tool-surface.ts`
(new), `eval/sim/probe-tool-surface.ts` (new).

**Steps:**
1. `serve/mcp/src/index.ts:212`: `const TOOL_LIST = [` becomes
   `export const TOOL_LIST = [`. Change nothing else -- not a description, not a
   schema, not the dispatch switch. (F21.)
2. `eval/sim/tool-surface.ts`:
   - `import { TOOL_LIST } from '../../serve/mcp/src/index.ts'` and
     `import { ORIENTATION_INSTRUCTIONS } from '../../serve/mcp/src/orientation.ts'`,
     re-exporting both. Nothing in this arc ever writes a schema or an
     orientation string by hand.
   - `export function openAiTools(): OpenAiTool[]` -- the projection verified in
     drafting: `{ type: 'function', function: { name: t.name, description:
     t.description, parameters: t.inputSchema } }`. No key rewriting, no
     defaults injected, no `strict` flag.
   - `export function schemaDigest(toolName: string): string` --
     `sha256(JSON.stringify(<that tool's inputSchema>))`, hex, computed with
     `node:crypto` to match how Phase 1's probe computed the pin.
   - `export const TOOL_NAMES: string[]` -- the 13 names, derived from
     `TOOL_LIST`, never a literal array.
3. `eval/sim/probe-tool-surface.ts`, printing `PASS`/`FAIL` per line and
   `process.exit(failures ? 1 : 0)`:
   - **floor first:** `TOOL_LIST.length === 13` and every entry has a non-empty
     `name`, `description` and an object `inputSchema`;
   - `openAiTools()` has 13 entries and each `function.parameters` is
     REFERENTIALLY the same object as the source `inputSchema` (`===`), which is
     what proves it is a projection and not a copy that can drift;
   - `search_solved_issues`'s `inputSchema.properties` key set is exactly
     `query,limit,max_messages_per_session` (the same assertion Phase 1's stdio
     probe makes on the served side -- if these two ever disagree, the import
     and the wire have diverged);
   - the pinned digest: read `eval/sim/tool-surface.pin.json`, take the single
     value matching `/^[0-9a-f]{64}$/` (**do not guess the key name** -- Phase 1
     did not specify it; assert exactly one such value is found and FAIL with
     the file path if not), and compare to
     `schemaDigest('search_solved_issues')`.
   - **On a digest mismatch, print BOTH JSON strings** and fail. F26: a mismatch
     has two possible causes and the probe must not conflate them. Real drift
     means the imported and served schemas differ in content. Key-order
     normalisation means JSON-RPC plus the SDK's Zod parse re-ordered keys on
     the wire, so the two digests differ over identical content -- diagnose with
     `diff <(jq -S . a.json) <(jq -S . b.json)`; if the sorted forms are equal it
     is key order, and the fix is a Phase 1 amendment making the pin canonical
     (key-sorted), NOT a quiet relaxation of the check here.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-tool-surface.ts
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo APP_TYPECHECK_OK
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle/serve/mcp && bun run typecheck && echo MCP_TYPECHECK_OK

Expect all `PASS`, exit 0, and both typechecks green. The app typecheck is the
one at risk here: it is the first time `serve/mcp/src/index.ts` (and through it
the MCP SDK and express) is pulled into `apps/qw-oracle/tsconfig.json`'s graph,
which is stricter than the MCP package's own config (`noUncheckedIndexedAccess`,
`types: ["bun-types"]` with no `"node"`). If it goes red, see Recovery.

### Task 2 -- Pricing table and the shared DeepSeek client · `agent (workhorse, high)`

**Goal:** one HTTP client, one retry policy, one pricing table -- and the
export surface Phase 3 imports.

**Files:** `eval/sim/pricing.ts` (new), `eval/sim/deepseek-client.ts` (new).

**Steps:**
1. `pricing.ts` exactly as the contract section specifies. `PRICING_SOURCE`
   carries the URL and the date it was read. `costUsd` throws on an unknown
   model. Comments record the peak-hour surcharge and why `isPeakWindow` warns
   instead of re-pricing.
2. `deepseek-client.ts` exactly as the contract section specifies. Call shape is
   the house one, read from `fence-external.ts:261-315`: bare `fetch` to
   `${BASE}/chat/completions`, `authorization: Bearer`, `stream: false`,
   `signal: AbortSignal.timeout(...)`, `resp.ok` checked before `resp.json()`,
   body head truncated to 300 chars on failure. Usage is read with the exact
   field names verified live, `??  0` on each.
3. `runGently` / `waves` are PORTED from `fence-external.ts:321-353` (they are
   module-local there, not importable). `WAVE_PAUSE_MS = 500`,
   `RETRY_RECOVER_MS = 8000`, honest counts, a failed item stays `null`.
4. Do NOT port `fence-external.ts`'s persistence model -- it accumulates in
   memory and does one `Bun.write` at the end, which is exactly the failure E9
   forbids (F15). This module does no I/O beyond the HTTP call.

**Verification probe** (2 real API calls, roughly $0.0005):

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    import { chatCompletion, chatJson, emptyUsage, addUsage, formatSpend, DEEPSEEK_MODEL } from "./eval/sim/deepseek-client.ts";
    import { costUsd, PRICING, PRICING_SOURCE } from "./eval/sim/pricing.ts";
    const fails = [];
    const ck = (ok, m) => { console.log((ok ? "PASS " : "FAIL ") + m); if (!ok) fails.push(m); };
    ck(PRICING[DEEPSEEK_MODEL] !== undefined, "the default model is priced");
    ck(PRICING_SOURCE.length > 0, "pricing source recorded");
    let threw = false; try { costUsd(emptyUsage(), "no-such-model"); } catch { threw = true; }
    ck(threw, "costUsd throws on an unknown model rather than pricing it at zero");
    const r = await chatCompletion({ messages: [{ role: "user", content: "Reply with the single word OK." }], temperature: 0, max_tokens: 64 });
    ck(r.finish_reason === "stop", "no-tools call returns finish_reason=stop");
    ck((r.message.content ?? "").length > 0, "no-tools call returns non-empty content");
    ck(r.usage.prompt_tokens > 0 && r.usage.completion_tokens > 0, "usage populated");
    ck(r.usage.cost_usd > 0, "cost_usd computed and positive");
    ck(r.attempts >= 1 && r.latency_ms > 0, "attempts and latency recorded");
    const j = await chatJson({ messages: [{ role: "user", content: "Return {\"ok\":true} and nothing else." }], temperature: 0, max_tokens: 64 });
    ck(j.value !== null && typeof j.value === "object" && j.value.ok === true, "chatJson parses JSON mode (Phase 3 depends on it)");
    console.log(formatSpend("probe", 2, addUsage(r.usage, j.usage)));
    process.exit(fails.length ? 1 : 0);'

Expect all `PASS` and exit 0.

### Task 3 -- The JSONL store · `agent (workhorse, medium)`

**Goal:** append-only records with a resume that is exact and a reader that
survives a `SIGKILL` mid-write.

**Files:** `eval/sim/jsonl-store.ts` (new), `eval/sim/probe-jsonl-store.ts`
(new).

**Steps:**
1. Write the module per the contract section. `appendRecord` runs
   `validateRunRecord` first and throws on reject -- an invalid record never
   reaches disk, so the file is trustworthy by construction.
2. `readRecords` reads, splits on `\n`, drops empty strings, parses each line;
   an unparsable LAST line sets `truncatedTail` and is dropped with a stderr
   line naming the file and byte length; an unparsable line anywhere else
   throws. Reconstruction is last-line-wins keyed on `record_id` (Phase 1 rule
   3).
3. `completedKeys` returns `${record_id}|${stage}` for every record whose
   latest line has `error === null`. `failureCount` counts lines for a
   `record_id` with `error !== null`.
4. The probe exercises all of it on a scratch run id under
   `eval/sim/records/` (gitignored), building records from Phase 1's committed
   fixture so the shapes are real: append 3, assert 3 read back; append a
   superseding line for one and assert reconstruction yields 3 with the new
   content; append a failed record and assert `completedKeys` excludes it and
   `failureCount` is 1; hand-truncate the last line and assert `readRecords`
   returns the earlier records with `truncatedTail === true`; corrupt a middle
   line and assert it throws. Non-emptiness floor on every read. Delete the
   scratch file at the end.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-jsonl-store.ts

Expect all `PASS` and exit 0.

### Task 4 -- Cells, prompts, and the symmetry probe · `agent (workhorse, high)`

**Goal:** E7's "symmetry enforced in code, not by convention", with the delta
asserted mechanically.

**Files:** `eval/sim/cells.ts` (new), `eval/sim/probe-cell-symmetry.ts` (new).

**Steps:**
1. Write `cells.ts` per the contract section. `PERSONA` is authored here and is
   the only prompt text this arc writes; the tool section is
   `ORIENTATION_INSTRUCTIONS`, imported through `tool-surface.ts`.
2. `buildInitialRequest` returns a plain object and calls nothing. Cell A omits
   BOTH `tools` and `tool_choice` (omits the keys entirely -- does not set them
   to `undefined`, which would serialise differently).
3. `ctxFor('A', _)` returns `null`; `ctxFor('B', t)` returns
   `{ channels: ['#helpdesk'], excludeThreadIds: t ? [t] : [], pinnedLimit: PINNED_LIMIT }`;
   `ctxFor('C', t)` the same without `channels`.
4. `probe-cell-symmetry.ts` asserts, with `PASS`/`FAIL` per line and an explicit
   exit code:
   - **floor:** all three requests are non-null objects with a non-empty
     `messages` array;
   - `JSON.stringify(buildInitialRequest('B', q)) === JSON.stringify(buildInitialRequest('C', q))`
     -- byte-identical, the whole payload;
   - A's key set plus `{tools, tool_choice}` equals B's key set, and no other
     key differs;
   - `reqB.messages[0].content === reqA.messages[0].content + '\n\n' + ORIENTATION_INSTRUCTIONS`;
   - `reqA.messages[1]`, `temperature`, and `max_tokens` are equal across all
     three;
   - **no phantom instructions (D8):** for every name in `TOOL_NAMES`,
     `PERSONA` does not contain it; and `/\btools?\b/i` does not match `PERSONA`;
   - `ctxFor('B', 'X')` and `ctxFor('C', 'X')` differ ONLY in `channels`
     (compare the two objects with `channels` deleted, serialized);
   - `ctxFor('A', 'X') === null`;
   - `MAX_TOOL_ROUNDS`, `TEMPERATURE`, `PINNED_LIMIT`, `PINNED_MAX_MESSAGES` and
     `ANSWERING_MODEL` are each a single exported constant, and
     `ANSWERING_MODEL` contains no `:` (Phase 1's `record_id` rule).

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-cell-symmetry.ts

Expect all `PASS` and exit 0. No API call and no DB query -- this probe is pure.

### Task 5 -- The in-process tool executor · `agent (workhorse, medium)`

**Goal:** E6's "call the oracle's tool functions in-process", with the retrieval
context reaching the SQL and the model reading the production payload bytes.

**Files:** `eval/sim/tool-executor.ts` (new), `eval/sim/probe-tool-executor.ts`
(new).

**Steps:**
1. Build the name-to-handler map over the 13 handlers imported from
   `serve/mcp/src/tools/*.ts`, mirroring `index.ts`'s switch cases including its
   `args as {...}` casts and its `queryText` choices for `dispatchAndLog`
   (`args.name` for `lookup_*`, `args.query` for `search_*`, `args.id` for
   `get_concept_note`, `args.mode` for `describe_mode`,
   `args.topic_hint` for `redirect_to_human`, and a short summary for the three
   filter-shaped tools).
2. `export async function executeToolCall(call: RawToolCall, ctx: RetrievalContext | null): Promise<{ text: string; record: ToolCall }>`:
   parse `call.function.arguments` as JSON (a parse failure is a recorded error,
   not a throw); look up the handler (an unknown name is a recorded error);
   for `search_solved_issues` force `max_messages_per_session: PINNED_MAX_MESSAGES`
   and pass `ctx` as the second positional argument; run it through
   `dispatchAndLog`; return `content[0].text` plus the `ToolCall` record filled
   from the parsed response (`results.length`, `match_quality`). Record
   `arguments` as the MODEL sent them, before the
   `max_messages_per_session` forcing (which is noted in the module comment so a
   reader is not surprised).
3. `export function setRunConsumerHint(runId: string): void` -- calls
   `setConsumerHint('eval-sim/' + runId)` once, so every `query_log` row this
   arc writes is attributable by one predicate.
4. Re-throw, do not swallow, when the handler throws with a non-empty ctx: that
   is Phase 1's F22 signal and it means the measurement apparatus is broken.
5. `probe-tool-executor.ts`:
   - map coverage: the map's key set equals `TOOL_NAMES` exactly, both
     directions, so a tool added to `TOOL_LIST` cannot silently go unexecutable
     (F24);
   - a real `search_solved_issues` call with `ctxFor('B', null)` returns
     non-empty results (**floor**), all `channel === '#helpdesk'`, and at most
     `PINNED_LIMIT` hits even when the call passes `limit: 5` -- proving the pin
     overrides the model on the in-process path;
   - the exclusion PAIR on the in-process path: take the top `thread_id` T from
     the unexcluded call, re-run with `excludeThreadIds: [T]`, assert T was
     present in the first and is absent from the second and that the second is
     still non-empty. An absence alone proves nothing about the filter;
   - a call to a nonexistent tool name returns a recorded error rather than
     throwing;
   - the returned `text` parses as JSON and carries `results` and
     `match_quality` (the payload contract the model reads).

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-tool-executor.ts

Expect all `PASS` and exit 0. This probe makes ~4 tool calls, so it writes ~4
`query_log` and ~4 `embedding_api_log` rows on the twin -- expected under E3's
F9 carve-out, and attributable because step 3 set the consumer hint.

### Task 6 -- The answering runner · `agent (session-tier, high)`

**Goal:** one runner, one loop, all three cells, incremental records, resume,
and a printed dollar total.

**Files:** `eval/sim/run-answering.ts` (new), `eval/sim/probe-forcing-turn.ts`
(new).

**CLI contract** (Phase 5's pilot and Phase 6's bulk run drive this same file,
so the flags are part of the phase's output):

    bun eval/sim/run-answering.ts [--questions <path>] [--run-id <id>] [--conc N] [--cells ABC] [--limit N]

`--questions` defaults to `eval/eval-queries.json` (the phase-8 fixture);
`--run-id` omitted mints a new ULID, supplied resumes that file; `--conc`
defaults to 6; `--cells` defaults to `ABC`; `--limit` caps the question count
for smoke use.

**Steps:**
1. `export interface QuestionSpec { thread_id; thread_key; domain; era;
   question; truth }` -- exactly RunRecord's identity-plus-question subset. The
   runner consumes `QuestionSpec[]` and knows nothing about where they came
   from. `export function loadPhase8Fixture(path): QuestionSpec[]` applies the
   fixture conventions from the fixture section above. Phase 3's manifest gets
   its own loader in a later phase:
   `TBD(phase-3: sample-manifest -> QuestionSpec[] loader)`.
2. `export async function runAnsweringPass(q: QuestionSpec, cell: Condition,
   opts?: { maxToolRounds?: number }): Promise<RunRecord>` -- the loop exactly
   as the pseudocode above. `opts.maxToolRounds` exists ONLY so
   `probe-forcing-turn.ts` can drive the backstop; the runner never passes it,
   and the symmetry probe's "single exported constant" assertion is what keeps
   that true. Records `tool_calls` as `ToolCallRound[]` preserving round
   structure (F16b), `usage` accumulated with `addUsage` across every call in
   the pass, `latency_ms` wall time for the pass, `started_at` ISO, `stage:
   'answered'`, `grade: null`, `divergent: false`, and `error` per the failure
   semantics above.
3. Main: set the consumer hint; build the flat (question x cell) product in
   (question index, cell) order; subtract `completedKeys(runId)`; refuse any
   `record_id` with `failureCount >= 3` and list them; hand the remainder to ONE
   `runGently` call; `appendRecord` inside the per-item function so a line lands
   the moment a pass completes (E9 -- never a batch write at the end).
4. Summary on exit: passes attempted / succeeded / failed, per-cell counts,
   round-histogram, how many passes hit the forcing turn, `formatSpend` totals,
   and a warning line if any call started inside `isPeakWindow`.
5. `probe-forcing-turn.ts`: call `runAnsweringPass` for one fixture question in
   cell C with `maxToolRounds: 1`, which guarantees exhaustion (round 1 is
   always a tool round when tools are attached). Assert: exactly 1
   `ToolCallRound`, at least 1 call in it (**floor**), `error === null`,
   `answer.length > 0`, and `LEAK_SENTINEL` does not match the answer. Writes NO
   record to `records/` -- it returns the object and discards it, so an
   off-budget pass can never enter a run file.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-forcing-turn.ts

Expect all `PASS` and exit 0. This is F16(c) discharged on the real path with
the real tools -- the drafting probe proved the API semantics, this proves the
harness implements them.

### Task 7 -- End-to-end smoke, deliberate kill, resume, attribution · `inline`

**Goal:** 36 records on disk, a crash that costs nothing, and a measured bill.

**Files:** none created; writes `eval/sim/records/<run_id>.jsonl` (gitignored)
and `eval/sim/probe-records.ts` (new, written in this task).

**Steps:**
1. **Kill test first, on a small slice**, so the crash happens before the full
   run rather than to it:

       cd /home/dev/projects/quakeworld-eval/apps/qw-oracle
       bun eval/sim/run-answering.ts --run-id smoke-kill --limit 4 --conc 2 &
       PID=$!
       while [ "$(cat eval/sim/records/smoke-kill.jsonl 2>/dev/null | wc -l)" -lt 3 ]; do sleep 2; done
       kill -9 $PID; wait $PID 2>/dev/null || true
       cat eval/sim/records/smoke-kill.jsonl | wc -l

   (The `cat | wc -l` form rather than `wc -l < file` is deliberate: the
   redirect form's "No such file" comes from the shell itself and survives
   `2>/dev/null`, so the poll would print noise on every iteration before the
   first line lands. Both forms verified at drafting time.)

   Then resume the same run id and confirm it finishes without redoing the
   completed keys:

       bun eval/sim/run-answering.ts --run-id smoke-kill --limit 4 --conc 2

   The second run's summary must report the already-completed passes as skipped
   and end with 12 records (4 questions x 3 cells).
2. **Full smoke run** over all 12 questions:

       bun eval/sim/run-answering.ts --run-id smoke-full --conc 6

3. Write `eval/sim/probe-records.ts` -- the assertion body below, smoke-tested
   verbatim at drafting time against a synthetic 37-line file (36 records plus a
   superseding line) and observed to pass with `TOOL_CALLS_TOTAL 74`. It takes
   the run id as `argv[2]` and uses `readRecords` from Task 3 rather than
   re-implementing reconstruction.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-records.ts smoke-full

Assertions (each printed `PASS`/`FAIL`, explicit exit code): 36 reconstructed
records and a non-emptiness floor; 36 distinct `record_id`s; every record
`validateRunRecord`-valid with `stage === 'answered'` and `grade === null`; 12
per cell; cell A `tool_calls.length === 0` on all 12; cells B and C
`tool_calls.length >= 1` on every record whose `error` is null; cell B's
`retrieval_context.channels` is `['#helpdesk']` and cell C's is `null`;
`pinned_limit === 3` in B and C and `null` in A; no answer matches
`LEAK_SENTINEL` (F23); at least one record has `usage.reasoning_tokens > 0`
(F16d) and one has `usage.prompt_cache_hit_tokens > 0`; the dollar total is
positive; and it prints `TOOL_CALLS_TOTAL <n>` for the attribution probe below.

## Phase-boundary verification

Every command runs as written from a shell in the worktree, after Phase 1's
Task 1 left the tree runnable. Probes 1, 6 and 7 were executed verbatim at
drafting time; the rest exercise code this phase creates and are stated with
their exact expected stdout and exit status.

**1. Both typechecks still green.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo APP_TYPECHECK_OK
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle/serve/mcp && bun run typecheck && echo MCP_TYPECHECK_OK

Expect `APP_TYPECHECK_OK` and `MCP_TYPECHECK_OK` -- YES/NO. Both were green
before this phase, so either going red is this phase's regression.

**2. Tool surface imported, projected, and matching the pin (E6).**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-tool-surface.ts

Expect every line `PASS` and exit 0 -- YES/NO.

**3. Cell symmetry (E7 -- the measurement).**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-cell-symmetry.ts

Expect every line `PASS` and exit 0, in particular the B-vs-C byte-identical
payload line -- YES/NO.

**4. Executor coverage, the pinned budget, and the exclusion pair.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-tool-executor.ts

Expect every line `PASS` and exit 0 -- YES/NO.

**5. The forcing turn, on the real path (F16c).**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-forcing-turn.ts

Expect every line `PASS` and exit 0 -- YES/NO.

**6. Records, resume, and the crash (E9).**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-records.ts smoke-full
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-records.ts smoke-kill
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && test "$(wc -l < eval/sim/records/smoke-kill.jsonl)" -ge 12 && echo KILL_FILE_NONEMPTY

Expect every `PASS` and exit 0 from the first (36 records) and from the second
run with its 12, plus `KILL_FILE_NONEMPTY` -- YES/NO. The kill file legitimately
holds MORE lines than records if a pass was re-attempted after the kill; that is
last-line-wins working, not a defect.

**7. Telemetry attribution and no corpus mutation (E3 / F9).**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT json_build_object('arc_query_log',(SELECT count(*) FROM query_log WHERE consumer_hint LIKE 'eval-sim/%'),'query_log',(SELECT count(*) FROM query_log),'embedding_api_log',(SELECT count(*) FROM embedding_api_log),'chat_threads',(SELECT count(*) FROM chat_threads));"
    jq -e '.chat_threads == 40219' /home/dev/projects/quakeworld-eval/apps/qw-oracle/eval/sim/telemetry-baseline.json && echo BASELINE_OK

Expect `BASELINE_OK`; `chat_threads` still `40219` (a different number is an
E4 / F3 corpus move, not a probe bug -- stop and get the operator's call);
`arc_query_log` greater than zero and equal to the `TOOL_CALLS_TOTAL` printed by
probe 6 for `smoke-full`, plus the calls made by probes 4 and 5 -- YES/NO.
Column names and current counts (`query_log` 199, `embedding_api_log` 2,017,
`chat_threads` 40,219) were read live at drafting time, and `consumer_hint`
exists on `query_log`.

**8. The bill (E10).**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    import { readRecords } from "./eval/sim/jsonl-store.ts";
    const { records } = readRecords("smoke-full");
    if (records.length !== 36) { console.log("FAIL expected 36 records, got " + records.length); process.exit(1); }
    const t = records.reduce((a, r) => ({ p: a.p + r.usage.prompt_tokens, hit: a.hit + r.usage.prompt_cache_hit_tokens, c: a.c + r.usage.completion_tokens, rz: a.rz + r.usage.reasoning_tokens, usd: a.usd + r.usage.cost_usd }), { p: 0, hit: 0, c: 0, rz: 0, usd: 0 });
    console.log("PHASE2_SPEND prompt=" + t.p + " cache_hit=" + t.hit + " completion=" + t.c + " reasoning=" + t.rz + " usd=" + t.usd.toFixed(4));
    const ok = t.usd > 0 && t.rz > 0 && t.p > 0;
    console.log(ok ? "PASS spend accounted" : "FAIL spend not accounted");
    process.exit(ok ? 0 : 1);'

Expect one `PHASE2_SPEND` line and `PASS` -- YES/NO. The number is what the
findings doc quotes for this phase; from the measured per-call figures it should
land in the low tens of cents, but the phase reports the measured value, not
this expectation.

## Outputs to next phase

Phases 3-9 may rely on exactly these.

- **`eval/sim/deepseek-client.ts`** -- the export list in the contract section
  above, in full. That list is the seam **Phase 3 imports** for its key
  extraction. Phase 3's three `TBD(phase-2-client: ...)` tokens (drafted in
  parallel, read at drafting time) resolve as follows and no Phase 2 signature
  was bent to fit them:
  - "one-shot JSON-mode completion returning parsed content plus the usage
    envelope" -> **`chatJson`**, which returns `{ value, usage, finish_reason,
    latency_ms, attempts }`. `usage` carries all five token fields plus
    `cost_usd`. `value` is `unknown` -- the client parses JSON but validates
    nothing, because the output schema is Phase 3's.
  - "paced-wave concurrency runner with a retry pass and honest failure counts"
    -> **`runGently(items, conc, run, tag)`**, the `fence-external.ts` recipe
    ported verbatim; permanently failing items come back `null`.
  - "pricing table plus a cost_usd(usage) helper" -> **`pricing.ts`**'s
    `costUsd(usage, model)` (note the second parameter) plus `PRICING` and
    `PRICING_SOURCE`. Phase 3 usually needs neither, since `chatJson` already
    fills `usage.cost_usd`.

  Phase 3 designs its own prompt and its own output schema; it does not add to
  this module. Any further missing capability is a
  `TBD(phase-2-client: <capability>)` token plus a finding, never an invented
  signature.
- **`eval/sim/pricing.ts`** -- `PRICING`, `PRICING_SOURCE`, `costUsd`,
  `isPeakWindow`. The one place a dollar figure comes from (E10).
- **`eval/sim/jsonl-store.ts`** -- `recordsPath`, `appendRecord`, `readRecords`,
  `completedKeys`, `failureCount`. **Phase 4 appends its `stage: 'graded'` line
  through `appendRecord`**, which validates first; Phase 4 still owes the
  byte-copy delta discipline and `validateGradedDelta` (Phase 1's contract) --
  this module does not enforce it. Reconstruction is last-line-wins per
  `record_id`; resume keys on `(record_id, stage)` and treats an errored record
  as incomplete.
- **`eval/sim/cells.ts`** -- `PERSONA`, `systemPrompt`, `ctxFor`,
  `buildInitialRequest`, and the pinned constants `ANSWERING_MODEL`,
  `TEMPERATURE = 0`, `MAX_TOOL_ROUNDS = 4`, `PINNED_LIMIT = 3`,
  `PINNED_MAX_MESSAGES = 40`. Phases 5 and 6 reuse them unchanged; changing any
  of them mid-arc invalidates comparability and is a ledger amendment, not a
  phase decision.
- **`eval/sim/tool-executor.ts`** -- `executeToolCall`, `setRunConsumerHint`,
  and the name-to-handler map. Every `query_log` row this arc writes carries
  `consumer_hint = 'eval-sim/<run_id>'`.
- **`eval/sim/run-answering.ts`** -- `QuestionSpec`, `runAnsweringPass`,
  `loadPhase8Fixture`, and the CLI contract
  (`--questions --run-id --conc --cells --limit`). **Phase 5's pilot and Phase
  6's bulk run drive this same file**; what they supply is a different
  `--questions` source, and the loader that turns Phase 3's manifest into
  `QuestionSpec[]` is `TBD(phase-3: sample-manifest -> QuestionSpec[] loader)`.
- **Derivation rules later phases must not re-invent:**
  - "the budget was exhausted on this pass" is
    `tool_calls.length === MAX_TOOL_ROUNDS`. There is no dedicated field, and
    none is needed while the budget is a single arc-wide constant (E7).
  - `tool_calls[].arguments` is what the model asked for; the executed
    candidate budget is always `retrieval_context.pinned_limit`. A record where
    they differ is data, not a defect.
  - a record with `error !== null` is excluded from every rate. Phase 8 reports
    the failure count separately rather than folding it into a denominator.
- **The F23 leak sentinel** `/DSML|invoke name=/`, applied to every final
  answer. Phase 7's Claude cells produce no such markup, but Phase 4's grader
  should never see an answer that matched it, because such a pass never scores.
- **The smoke run's records** (`records/smoke-full.jsonl`, gitignored) are
  proof-of-machinery only. They use the `p8-*` fixture identities (F25) and are
  **never pooled into any rate** -- Phase 1 already pins the headline to the
  bulk run's file alone.
- **What this phase does NOT ship**, so no later phase plans on it: no grading
  of any kind, no rubric, no `truth` extraction, no sample manifest, no explorer
  generator, no Claude-side answering, and no MCP-over-the-wire path (E6's
  stated cost -- the eval measures knowledge-service quality, not protocol
  integrity).

## Open questions

1. **`export const TOOL_LIST` in `index.ts` vs extracting it to an SDK-free
   `serve/mcp/src/tool-list.ts`.** Default: the one-word export, because it is
   the minimal diff, it matches E6's literal wording ("imported from
   `serve/mcp/src/index.ts` (`TOOL_LIST`)") and F21's disposition, and it
   touches a file the concurrent oracle-web arc deploys as little as possible.
   The cost is that `eval/sim/` now drags the MCP SDK and express into
   `apps/qw-oracle/tsconfig.json`'s graph, which is stricter than the config
   those files are checked under today. **Trigger for the fallback:** Task 1's
   `bun run typecheck` in `apps/qw-oracle` reports TS2307 on
   `@modelcontextprotocol/sdk/...` or any error inside `serve/mcp/src/`. Then
   move the array into `serve/mcp/src/tool-list.ts` (no imports but
   `./types.ts`), have `index.ts` do `export { TOOL_LIST } from './tool-list.ts'`
   so E6's named path still resolves, and import the SDK-free module from
   `eval/sim/`. Overrule: operator, or a reviewer who prefers the extraction up
   front.
2. **`MAX_TOOL_ROUNDS = 4`.** Default 4. F16's grounded probe terminated
   naturally at round 2, so 4 gives two rounds of headroom before the backstop
   fires; each extra round replays a growing (mostly cache-hit) prompt, so the
   cost of headroom is small. Overrule: operator, or a Phase 5 pilot finding
   showing the backstop firing often enough to distort cell B/C answers -- in
   which case it is a ledger-level change (E7 pins one budget for the arc), not
   a per-phase tweak.
3. **The budget-exhausted nudge message.** Default: send it. F23 shows
   `tool_choice: 'none'` alone returns leaked invoke markup as the answer, 2/2.
   The honesty cost is that the exhausted branch has one message the other
   branch does not -- so the runner reports how many passes took it, and Phase 8
   reports that rate rather than letting it hide. Overrule: operator.
4. **Fixture identities `p8-NN` / `era: 0` / `domain: 'phase8-fixture'`
   (F25).** Default as tabled above. Escalation, not workaround, if Phase 1's
   validator range-checks `era`. Overrule: operator, or a Phase 1 amendment.
5. **Routing tool execution through `dispatchAndLog`.** Default: yes. It gives
   the model the exact bytes an MCP client receives and it keeps E3's "every
   tool call writes a `query_log` row" true for the in-process consumer, which
   makes the arc's telemetry volume attributable by one predicate. The cost is
   ~1,500 extra `query_log` rows on the twin at bulk scale -- inside E3's F9
   carve-out. Overrule: operator, or a reviewer who wants the in-process path to
   write no telemetry at all (in which case Phase 1's baseline arithmetic and
   probe 7 here both need re-deriving).
6. **`temperature: 0`.** Default 0, pinned for symmetry across cells (D8), NOT
   as a reproducibility claim -- a reasoning model at temperature 0 is not
   guaranteed deterministic and this plan does not assert that it is. Overrule:
   operator.
7. **`max_tokens: 16_384` and `finish_reason === 'length'` as a failed pass.**
   Default as stated. Billing is on tokens generated, so a generous cap costs
   nothing and a truncated answer is unscoreable. Overrule: operator.
8. **`--conc 6`.** Default 6 for DeepSeek (the house rig uses 10 against a
   2,500-concurrency model, and this arc's calls are longer). Not the same
   pacing question as E11's Claude quota. Overrule: operator, or a 429 rate in
   the run summary.

## Recovery

- **`bun run typecheck` red in `apps/qw-oracle` immediately after Task 1.**
  Read the error before anything else. `Cannot find module
  '@modelcontextprotocol/sdk/...'` or an error inside `serve/mcp/src/` means the
  index.ts import pulled the SDK into a stricter tsconfig -- that is Open
  question 1's trigger; take the `tool-list.ts` extraction, do not silence the
  check by widening `skipLibCheck` or by adding `eval/sim` to `exclude`. An
  error in `eval/eval.ts` about `session_id` means the include pattern was
  widened to `eval/**/*` instead of `eval/sim/**/*` -- that is F18, pre-existing,
  narrow the pattern back.
- **`DATABASE_URL is not set` from `shared/db.ts:10`.** The command was run from
  the wrong cwd. Bun reads `.env` from the cwd only; every command in this
  document runs from `apps/qw-oracle`. This bites `tool-surface.ts` too, because
  importing `index.ts` constructs the postgres client at module scope.
- **The loop never terminates / a pass burns the whole budget every time.** That
  is F16's thin-grounding behaviour, which is a real signal about the question,
  not a bug -- the backstop is what bounds it. Check the run summary's forcing-
  turn count. If it is high in BOTH B and C, the questions are hard; if it is
  high in only one cell, that is a retrieval finding and belongs in the findings
  doc (E14), not a harness fix.
- **An answer that is tool-call markup.** F23. The sentinel should already have
  failed the pass; if a record slipped through with markup in `answer`, the
  sentinel regex was weakened or the check was moved after the record was
  written. Both are regressions, and the affected records are re-run, not
  edited.
- **A retrieval throw fails passes in cell B or C.** That is Phase 1's F22
  change working as designed -- read the stderr line the lexical path logged
  before re-throwing. Do not restore the silent `[]`, and do not catch it in the
  executor to keep the run going: a cell that cannot retrieve must not score.
- **The kill test leaves a truncated last line.** Expected -- that is what it is
  testing. `readRecords` reports `truncatedTail` and drops it. If the parse
  failure is on an EARLIER line, something wrote concurrently to the same file;
  check that no second runner is running against the same `--run-id`.
- **Resume re-answers everything.** `completedKeys` is keyed on
  `(record_id, stage)`, and `record_id` embeds `answering_model` -- so a changed
  model string makes every key miss. Check that `ANSWERING_MODEL` was not
  edited between runs; if it was, that is a new run, not a resume, and it needs
  its own `run_id`.
- **HTTP 429 from DeepSeek.** `chatCompletion` retries it. A run summary showing
  many retried calls means `--conc` is too high for the moment; lower it rather
  than adding a per-cell delay, which would break E7.
- **A dollar total of zero or a `costUsd` throw.** `PRICING` is keyed by model
  string; a model name changed without a pricing entry throws by design (E10 --
  a silent zero would make the arc's cost claim a fiction). Add the entry with
  its source URL and date; never default an unknown model to free.
- **`chat_threads` is not 40,219 at boundary probe 7.** Stop. That is a corpus
  move (E4 / F3) and every record taken either side of it is incomparable.
  Confirm against `.claude/calendar-checks.txt` whether the monthly harvest ran,
  record a finding, and get the operator's call before Phase 3 freezes a frame.
