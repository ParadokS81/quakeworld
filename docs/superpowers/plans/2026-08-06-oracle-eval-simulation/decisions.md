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
Phase 3's sample freeze through Phase 6's last answering pass. The monthly L2
harvest is held for that window (README prerequisite). Phase 3 records the
corpus baseline -- total `chat_threads`, per-channel splits,
`reconstruction_version`, and the resolved sample's `thread_key` values -- and
Phase 5 re-asserts it before the bulk run.
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

## E8 -- No stage grades its own work; the grader is blind and toolless

**Decision:** the D6 four-stage pipeline is preserved as separate calls: key
extraction, answering, compare-grading, review. The grader sees question +
answer + key only -- never the condition label, never the tool calls, never a
database or tool handle.
**Why:** grader retrieval errors would correlate with the exact quantity being
measured.
**Implication:** the harness must be able to emit a grading input that is
provably condition-free; Phase 2's probe asserts the grader payload contains no
condition marker. Records are joined back to conditions only after grading.

## E9 -- Records are written incrementally and are crash-resumable

**Decision:** one JSONL line appended per completed (question x condition x
stage), with a resume that re-reads completed keys and skips them. Not a single
whole-file write at the end.
**Why:** the house rig (`fence-external.ts`) writes once at the end -- a crash
at minute 200 of a 232-minute run yields zero reusable work (F15). Phase 5 runs
~1,500 answering passes plus grading; that failure mode is unacceptable at this
scale.
**Implication:** every long-running phase (3, 5, 6) is restartable from disk,
and Phase 2 proves resume with a deliberate mid-run kill.

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
**Implication:** Phase 6 is wall-clock bound by pacing, not by token cost.
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
