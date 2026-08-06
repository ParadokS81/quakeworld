# oracle-eval-simulation -- cross-cutting decisions ledger

Commitments that bind more than one phase. Sourced from the design spec
(`docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md`, D1-D11),
the parking doc, and the 2026-08-06 planning verification sweep. Amendments are
dated blocks under the original entry, never silent edits. Implementation
briefs cite entries by number.

Spec decisions (D1-D11) are NOT relitigated here. An E-entry either implements
a D-entry, or records something the spec left to arc-plan.

---

## E1 -- The design spec is the measurement contract

**Decision:** D1-D11 define what is measured and what the numbers mean. This
plan owns only HOW. Where implementation reality contradicts a spec figure, the
correction lands as a dated amendment to the spec plus a finding here -- never
as a silent drift in a phase doc. (Already exercised once: F1.)
**Why:** a bad rubric or a moved goalpost silently invalidates every downstream
number, and this arc's whole output is numbers.
**Implication:** any phase that wants to change a sample size, a cell
definition, a verdict scale, or a grading stage is out of scope by
construction until the spec is amended.

## E2 -- The run record is the arc's one data contract

**Decision:** one JSON record per (question x condition), schema owned by Phase
1 as a typed module plus a committed fixture. Fields per spec D3 --
`thread_id`, `domain`, `condition`, `question`, `tool_calls`, `answer`,
`truth`, `grade{verdict, by, spot_checked}` -- extended at Phase 1 with the
fields later phases provably need: `answering_model`, `era`
(`date_range_start` year, per the spec's staleness carry-forward),
`thread_key`, `divergent`, and token/latency accounting.
**Why:** the grader, the explorer's Runs tab, the findings doc, and the
showcase nomination all read this one shape; a single staleness surface.
**Implication:** phases 2-9 never invent fields. A needed-but-missing field is
a finding routed back to the Phase 1 contract with a dated amendment and a
full re-derive of anything computed from it.

**Amendment 2026-08-06 (operator ratified the answering/grading split).**
Answering (Phase 2) and grading (Phase 4) are now separate phases, so a record
is written UNGRADED and graded later, in place. The Phase 1 schema must
therefore make `grade` explicitly nullable/absent-valid rather than required,
and the validator must accept both states -- an ungraded record is a legal
intermediate, not a malformed one. Grading is an in-place update keyed by
(`thread_id`, `condition`, `answering_model`); that triple is the record's
identity and must be unique. Phase 4's grader reads records, writes verdicts
back, and never re-runs answering. Blast radius re-derived: the E9 resume key
is that same triple; the Phase 2 boundary probe asserts records validate WITH
an empty grade; the Phase 4 probe asserts every record it touched moved from
ungraded to graded with no other field mutated.

**Amendment 2026-08-06 (Phase 1 checker, MAJOR-3) -- the graded line is a full
copy, not a delta.** Under E9's log-structured reading (F19), reconstruction is
last-line-wins FULL REPLACEMENT, so "no other field mutated" has a mechanical
meaning that must be stated or it is unenforceable: the `stage: 'graded'` line
is a byte-copy of the `stage: 'answered'` line with exactly `grade` and `stage`
changed. A delta line carrying only `{record_id, stage, grade}` reads as
compliant and would DESTROY `answer`, `tool_calls`, `usage`, `latency_ms`, and
`truth` on reconstruction. The validator rejects a `graded` line missing any
field its `answered` predecessor carried, and Phase 4's boundary probe diffs
the two lines field by field. Also settled here: an ABSENT `grade` key is
equivalent to `null`, for `grade` only and no other field.

**Amendment 2026-08-06 (Phase 1 checker, MAJOR-4) -- records are scoped per
run.** `record_id` is `(thread_id, condition, answering_model)` and does NOT
carry `run_id`, yet the pilot's threads (Phase 5) are a subset of the bulk's
(Phase 6). Sharing one JSONL would both merge the two runs under last-line-wins
AND make the bulk's resume SKIP every pilot thread, quietly promoting pilot
answers into the headline. Records therefore live in one file per run, keyed by
`run_id`; resume never crosses a run boundary; and the headline number is
computed over the bulk run's file alone, with the pilot's kept only as
calibration evidence.

## E3 -- Read-only against the corpus; the dev twin only; prod never

**Decision:** no writes to `chat_threads`, `thread_messages`, `messages`,
`entities`, or `concepts`; no `submit_resolution`; no corpus repair even if the
eval finds bad data. Every answering and grading pass targets the dev twin
(`qw-oracle-postgres-dev`). Prod Postgres is unreachable from the cockpit by
design and stays that way.
**Carve-out (verified, F9):** the oracle's own per-call telemetry DOES write --
`query_log` and `embedding_api_log` take one row per tool call, and
`maybeVerifyEmbeddingSpace()` writes `oracle_meta` on a 24h TTL. Those are
expected, land on the twin, and are not corpus mutations. Phase 1 records the
pre-run row counts so the volume is attributable afterwards.
**Why:** parking-doc scope lock; a twin is cattle, prod is not.
**Implication:** a phase proposing any corpus write is out of scope. Findings
about bad corpus data route to their own track (E14).

## E4 -- The corpus is frozen for the arc's answering window

**Decision:** the sampling frame and the retrieval corpus are pinned from
Phase 3's sample freeze through Phase 7's last answering pass. The monthly L2
harvest is held for that window (README prerequisite). Phase 3 records the
corpus baseline -- total `chat_threads`, per-channel splits,
`reconstruction_version`, and the resolved sample's `thread_key` values -- and
Phase 6 re-asserts it before the bulk run.
**Why:** re-fencing REGENERATES `chat_threads.id`. This is not hypothetical:
234 of 4,456 frozen non-noise IDs are already gone (F1), in one contiguous ID
band, and the harvest ritual re-fences the current year every month.
**Implication:** records taken on either side of a harvest are not comparable.
If a harvest lands mid-arc anyway, the affected cells are re-run, not
reconciled.

## E5 -- Scope and exclusion are server-side and agent-invisible

**Decision:** channel scope (D2's B-vs-C axis) and leave-one-out exclusion
(D6 stage 2) are applied **inside the retrieval SQL**, in both the lexical and
vector paths of `search_solved_issues`, carried by an explicit retrieval-context
parameter that the tool's `inputSchema` does not mention. The agent-visible
tool surface is byte-identical across cells B and C.
**Why:** spec D1/D2 intent recorded in Verified facts ("never an agent-visible
tool param"). Post-fusion filtering is wrong on both counts: `fanout = limit*4`
is applied per path BEFORE fusion, so filtering afterwards silently shrinks the
result set -- and for channel scope it would defeat the dilution experiment
entirely, since crowding-out of helpdesk hits from the candidate slots IS the
mechanism D1 names.
**Implication:** two consumers share one implementation -- the in-process
harness passes the context directly (E6), and the stdio MCP server fills it
from env for the Claude cells (E11). Neither may reimplement the filter.

## E6 -- The DeepSeek cells call the oracle's tool functions in-process

**Decision:** cells A/B/C execute tools by importing the real handlers from
`serve/mcp/src/tools/`, not by speaking MCP over a wire. The tool *schemas* and
the server `instructions` are imported from `serve/mcp/src/index.ts`
(`TOOL_LIST`) and `serve/mcp/src/orientation.ts` -- never hand-written -- so the
agent sees the production tool surface and the production orientation text
(including the anti-confabulation rule).
**Why:** MCP is transport; the tool functions are the product. Prior art
exists and worked (the June 11-thread hypothesis test did exactly this). It
removes the Cloudflare rate limit, the missing dev MCP container, the Tailscale
route, and per-request-context plumbing from the critical path in one move.
**Cost, stated plainly:** this does NOT exercise MCP serialization, session
handling, or the HTTP transport. The eval measures knowledge-service quality,
not protocol integrity. Phase 2's boundary probe asserts the imported schema
list matches the served `ListTools` output so the two cannot silently diverge.
**Implication:** the parked HANDOVER item "MCP Tailscale direct-route for batch
jobs" is NOT discharged by this arc, contrary to the parking doc's expectation.
It returns to HANDOVER unchanged (F6).

**Amendment 2026-08-06 (Phase 2 checker, F37) -- the semantic retrieval path
must be asserted LIVE, every run.** `search_solved_issues` wraps its embedding
call in a catch that logs to `embedding_api_log` and continues lexical-only,
and `shared/embedding.ts` throws when `VOYAGE_API_KEY` is unset. So a `.env`
that lost its Voyage key would run this entire arc on lexical retrieval alone
-- half of the hybrid gone, no error anywhere, every cell degraded together so
even the A-vs-C delta would look plausible. It would also silently void the
F17 pgvector work, since there would be no vector path to starve. Every phase
that answers therefore (a) checks `VOYAGE_API_KEY` and
`EMBEDDING_MODEL_QUERY` in its entry probe, and (b) asserts that
`embedding_api_log` gained a row with `error IS NULL` during the run. A
degraded run is a hard failure, never a quiet datum.

## E15 -- The shared DeepSeek client is a cross-phase contract

**Decision:** `apps/qw-oracle/eval/sim/deepseek-client.ts` is owned by Phase 2
and imported unchanged by Phase 3 (key extraction) and Phase 4 (grading). No
phase writes a second client. Three provider rules bind every consumer and are
stated here because discovering them per-phase costs a paid run each time:
1. **JSON mode requires the literal word "json" in the prompt.** Verified live:
   a `response_format: json_object` request whose prompt lacks it returns HTTP
   400 (`Prompt must contain the word 'json' in some form`). `chatJson` asserts
   this locally and throws before spending, so the failure is a clear local
   error rather than a provider 400 in the middle of a bulk run.
2. **`max_tokens` must leave room for reasoning.** These are reasoning models;
   a measured 7-run sample of one small prompt consumed 9-53 reasoning tokens
   against a 64-token budget, and the same prompt at 32 returned
   `finish_reason=length`. Probes and passes budget 512+.
3. **`finish_reason === 'length'` fails the pass everywhere**, including the
   forced-termination turn (see E7's amendment).
**Why:** the seam was already drafted three ways in parallel; two of the three
`TBD(phase-2-client:)` tokens resolved cleanly and the third did not, which is
what a shared contract is for.
**Implication:** a phase needing a capability the client does not expose files
a finding and Phase 2 amends the client. It never forks one -- two pricing
tables would make E10's dollar total meaningless.

## E7 -- Cell symmetry is enforced in code, not by convention

**Decision:** one runner, one system prompt, one temperature, one loop budget,
one model across cells A/B/C (spec D8). The only permitted differences: cell A
attaches no tools and its prompt contains no tool section at all; B and C differ
only in the retrieval context's channel scope. Phase 2 ships a probe that diffs
the three assembled request payloads and asserts the delta is exactly those two
things.
**Why:** every asymmetry is a confound that lands directly in the headline
number, and "no phantom tool instructions, no baseline coaching" is a spec lock.
**Implication:** any per-cell prompt tuning is a spec amendment, not a phase
decision.

**Amendment 2026-08-06 (Phase 1 checker, MAJOR-6) -- `limit` is PINNED.**
Symmetry was assumed to follow from `fanout = limit * 4` being hardcoded. It
does not: `limit` is a declared property of the tool's `inputSchema`, so the
MODEL chooses it, and with it the candidate-slot budget that IS the B-vs-C
dilution mechanism (F8). A model asking `limit: 3` in one cell and `limit: 5`
in another silently changes the thing being measured. It also changes the
starvation rate materially -- measured `#helpdesk`-scoped over 200 random query
vectors: 11.0% starved at fanout 12, **51.5% at fanout 20**. The harness
therefore pins `limit` to one value for every cell and every question, records
the pinned value in each run record, and treats a differing `limit` in a record
as a defect rather than a datum. (`strict_order` per F17 holds at both budgets,
so the pin and the fix are independent.)

**Amendment 2026-08-06 (Phase 2 checker, D15/D7) -- request-payload equality is
a regression guard, NOT a symmetry measurement.** Phase 2's headline assertion
`JSON.stringify(reqB) === JSON.stringify(reqC)` is true BY CONSTRUCTION on the
day it is written -- the request builder takes no retrieval context, so nothing
cell-specific can enter the payload. It is worth keeping as a guard against a
future per-cell branch, but it must not be described as establishing symmetry.
Four asymmetry channels live downstream of it, all real and none visible to
that probe:
1. **The forcing-turn nudge is a condition-correlated treatment.** The backstop
   fires only on budget exhaustion, and the exhaustion rate is exactly the kind
   of thing that differs between a scoped and an unscoped corpus. One cell
   systematically receives an extra user message the other does not.
2. **Truncation acceptance differs.** Cell A has no backstop, so only B and C
   can bank a truncated forced answer (measured: 2 of 4 forced turns returned
   `finish_reason=length`). The forcing turn therefore fails on `length` like
   every other turn -- that is now normative.
3. **Failure exclusion is a selection effect.** Excluding `error !== null`
   records from every rate makes the MECHANISM symmetric but not the
   DENOMINATOR: a cell that fails more often has its rate computed over a
   survivor subset.
4. **Tool-result payload size diverges from round 2 onward.** Pinned `limit: 3`
   in both, but scoped and unscoped hits differ in transcript length, so prompt
   growth, cache-hit fraction, and `length`-truncation risk all diverge.
   Turn-1 byte equality says nothing about turns 2-4.
**Implication:** every run summary prints the per-cell forcing-turn rate and
the per-cell failure count, and Phase 8 reports them alongside the headline. A
material gap in either is a confound to disclose, not a footnote.

## E8 -- No stage grades its own work; the grader is blind and toolless

**Decision:** the D6 four-stage pipeline is preserved as separate calls: key
extraction, answering, compare-grading, review. The grader sees question +
answer + key only -- never the condition label, never the tool calls, never a
database or tool handle.
**Why:** grader retrieval errors would correlate with the exact quantity being
measured.
**Implication:** the harness must be able to emit a grading input that is
provably condition-free; the grading phase's probe asserts the grader payload
contains no condition marker. Records are joined back to conditions only after
grading.

**Amendment 2026-08-06 (renumber re-point).** This implication originally
named "Phase 2's probe". With the answering/grading split, the grader and its
blindness probe live in **Phase 4**; Phase 2 only emits records whose
`toGradingInput()` projection exists. Recorded as an amendment rather than
patched silently, per E1.

**Amendment 2026-08-06 (leakage honesty).** Field-level blindness is
structural -- the grading input carries `question`, `answer`, `truth` and
nothing else. It is NOT total: a condition marker can survive inside the
`answer` prose itself ("according to a #helpdesk thread from 2021..."), which
is inherent to D6 stage 3 and not fixable at this layer. Phase docs state this
rather than claiming blindness is complete, and the Phase 5 pilot's review
slice is where it would be caught if it mattered.

## E9 -- Records are written incrementally and are crash-resumable

**Decision:** one JSONL line appended per completed (question x condition x
stage), with a resume that re-reads completed keys and skips them. Not a single
whole-file write at the end.
**Why:** the house rig (`fence-external.ts`) writes once at the end -- a crash
at minute 200 of a 232-minute run yields zero reusable work (F15). Phase 6 runs
~1,500 answering passes plus grading; that failure mode is unacceptable at this
scale.
**Implication:** every long-running phase (3, 6, 7) is restartable from disk,
and Phase 2 proves resume with a deliberate mid-run kill.

**Amendment 2026-08-06 (F19 -- granularity reconciled with E2).** E2's "one
record per (question x condition)" and this entry's "one line per (question x
condition x stage)" were read as contradictory during Phase 1 drafting. Ratified
reading: the store is **log-structured JSONL** -- one line per stage event, each
carrying `record_id` and `stage`, reconstructed last-line-wins into the single
logical record E2 describes. E2 governs the logical record's field set; E9
governs the on-disk line. Resume keys on `(record_id, stage)`. Every later
phase inherits this one reading; a phase that treats a line as the logical
record has misread the ledger.

## E10 -- Cost and quota are measured, not estimated

**Decision:** every DeepSeek call's `usage` (including reasoning and cache
tokens) lands in the record; each phase prints a per-phase token and dollar
total using a pricing table pinned in one module. The pilot reports measured
cost-per-question before the bulk run commits.
**Why:** the arc's premise is token economics (Claude for judgment, DeepSeek
for bulk). Reasoning tokens were 93% of completion on the corpus fence -- the
dominant cost driver, and invisible without accounting. The repo has no dollar
arithmetic anywhere today.
**Implication:** "it was cheap" is a number in the findings doc, not a vibe.

## E11 -- Claude-side passes are per-question fresh sessions, paced

**Decision:** D8's calibration sample and D7's unresolved judgment run as
separate Claude sessions, one question each, with the oracle attached as a
spawned stdio MCP server whose env carries that question's scope and exclusion.
Concurrency stays low and paced.
**Why:** the oracle's env config is read at module import, so it is a
process-lifetime setting -- one process per question is what makes per-question
leave-one-out correct (F7). Session-per-question also matches the spec's
capture hygiene. Pacing is not optional: an Opus burst tripped the
account-wide throttle on the last arc that fanned out this way.
**Implication:** Phase 7 is wall-clock bound by pacing, not by token cost.
Budget it as an evening, not a batch job.

## E12 -- The harness lives in a new sibling tree, not in `faq-gate/`

**Decision:** new code lands under `apps/qw-oracle/eval/sim/`. The existing
`scripts/calibration/faq-gate/` tree is read-from (its cluster JSON and domain
resolver are the frozen frame) but never written into.
**Why:** that directory carries a hard architectural ban -- no provider SDK, no
API key, no outbound provider call anywhere in it, enforced by a boundary probe
that greps for provider import literals. This arc's harness is a DeepSeek
client by definition; putting it there would break the probe and the invariant
it protects. Separately, `faq-gate-retrieve.ts` imports through hardcoded
`/home/paradoks/...` paths and does not run on this box at all (F4).
**Implication:** shared logic is imported from `faq-domains-resolve.ts`, not
copied; anything that must be fixed in `faq-gate/` is a finding, not an edit
of convenience.

**Amendment 2026-08-06 (Phase 1 checker, MAJOR-1) -- one documented exception:
SDK-importing files live in `serve/mcp/scripts/`.** `@modelcontextprotocol/sdk`
resolves ONLY from `apps/qw-oracle/serve/mcp/node_modules` -- neither the repo
root nor `apps/qw-oracle` carries it, and module resolution from `eval/sim/`
walks past both. Verified: the import fails from `apps/qw-oracle` and resolves
from `serve/mcp`. So any harness file that imports the MCP SDK directly lives
in `serve/mcp/scripts/` beside the existing `test-call.ts` and
`verify-rewrite.ts`; everything else stays under `eval/sim/`. Rejected:
duplicating the SDK dependency into `apps/qw-oracle/package.json` (version
skew against the server's own pin) and making `serve/mcp` a workspace member
(changes the monorepo install while a concurrent arc holds the main checkout).
Consequence to carry forward: this **pre-decides Phase 7** -- the E11
per-question spawn loop is an SDK client, so it lives in `serve/mcp/scripts/`
too, and is covered by `serve/mcp`'s own typecheck rather than the
`apps/qw-oracle` one.

## E13 -- Run artifacts are gitignored; conclusions are committed

**Decision:** JSONL records, per-run scratch, and grading intermediates are
gitignored (house convention: `scripts/calibration/scratch/`,
`faq-gate/outputs/`). Committed: the sample manifest, the rubric prompts, the
harness code, the findings doc, and the explorer with its data baked in.
**Why:** the explorer is opened from disk and published as an artifact; a
`file://` page cannot fetch a sibling JSON, so its data is inlined by a
generator script -- which also fixes the fact that today's explorer data was
hand-embedded with no generator (F11).
**Implication:** the findings doc quotes numbers; the explorer holds the
evidence; neither depends on an un-committed file to be readable later.

## E14 -- Findings are routed, never fixed in-arc

**Decision:** every gap the eval surfaces -- weak domain, retrieval failure,
missing L3 note, RRF miscalibration, corpus defect -- gets one line in the
findings doc pointing at the track that owns it. This arc fixes none of them.
**Why:** parking-doc scope lock; the eval's credibility depends on it
measuring, not tuning, the thing it measures.
**Implication:** a phase that "just fixes" a retrieval weakness it found has
contaminated its own measurement and the finding must be re-run.
