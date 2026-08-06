# REVIEW-BRIEF -- oracle-eval-simulation cold adversarial plan review

For readers who did not write this plan and inherit nothing from the planning
conversation. Attack the plan while it is still only documents.

Read first, in this order: the design spec
(`docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md`, D1-D11 +
the 2026-08-06 amendment), then `README.md`, `decisions.md` (E1-E14),
`review-findings.md` (F1-F16), then the seven phase docs.

**Scope rule:** the spec is the measurement contract and is NOT under review.
D1-D11 decide what is measured and what the numbers mean; they were locked
across four design passes with the operator. You are reviewing HOW -- the
slicing, the contracts, the gates, and whether the plan can actually produce
the numbers the spec promises.

---

## Where to attack

1. **The Phase 4 pilot gate.** This is the arc's only planned NO-GO and the
   hinge between cheap-and-reversible and expensive-at-scale. Construct the
   concrete scenario where the gate PASSES while the pipeline is broken: a
   >=90% grader-vs-Claude agreement that is high for the wrong reason
   (agreement on easy cases masking disagreement on the boundary that matters,
   a key-extraction failure that both graders inherit identically, a rubric
   that makes `partial` an attractor). Drafter-authored gates drift toward the
   case that works.
2. **The Outputs-to-Inputs chain, re-derived not re-read.** Walk phases 1 -> 7
   and check that each phase's declared Inputs are actually produced by a
   predecessor's Outputs. Do NOT trust the coherence pass's own account of this
   -- re-derive the chain yourself from the phase docs and report what you
   find, including agreements.
3. **Leave-one-out (E5, spec D6 stage 2).** The answer key lives inside the
   corpus being searched. If exclusion leaks anywhere -- a retrieval path that
   does not carry the context, a sibling thread that is a near-duplicate of the
   excluded one, the Claude cells' per-process env carrier (E11, F7), the key
   extraction step reading a thread the answering step also sees -- then cells
   B and C collapse into self-retrieval and the headline number is fiction.
   This is the single failure that would invalidate the entire arc while
   looking like a great result.
4. **Cell symmetry (E7).** Any asymmetry between A, B, and C that is not
   exactly "tools present/absent" and "channel scope" lands directly in the
   headline. Look for it in prompt assembly, retry behaviour, loop budgets,
   truncation, and error handling. An error path that silently returns a short
   answer in one cell only is a confound.
5. **World-facing claims.** Every assertion about pgvector recall under a
   filter, DeepSeek API semantics, MCP SDK behaviour, or Claude Code session
   mechanics must name a probe or cite documentation. F16 exists because the
   parking doc asserted DeepSeek function calling without either; assume more
   of that class survives.
6. **Runnable literals.** Every probe command in every phase doc should run as
   written. Spot-check the ones whose failure would be silent (a grep that
   matches nothing and exits 0, a SELECT against a column that does not exist,
   a `bun` invocation from the wrong cwd).

## Where NOT to bother

These were verified first-hand during planning, with the probe recorded. Do not
re-derive them unless you have positive evidence they are wrong:

- The live sampling pool (3,164 solved non-noise) and the frozen-frame decay
  (234 missing IDs, band 7420..7792) -- queried directly against the dev twin,
  and the root cause is closed with per-year id-block arithmetic (F1).
- DeepSeek function calling, parallel tool calls, and natural loop termination
  -- two live API probes (F16). Note what those probes did NOT establish: the
  `tool_choice: 'none'` forced-termination backstop was never exercised.
- The MCP server's transports, tool count, config mechanism, and the absence of
  auth and of a dev MCP container (F6, F7).
- The absence of any tool-calling prior art in the repo (F5).

## Contested rulings -- attack the reasoning, do not just agree

**R1 -- the DeepSeek cells call tool handlers in-process instead of speaking
MCP (E6).** Reasoning: MCP is transport; the tool handlers are the product. The
June hypothesis test already did this. It removes the Cloudflare rate limit,
the missing dev MCP container, the Tailscale route, and per-request context
plumbing from the critical path in one move. The admitted cost: the eval does
not exercise MCP serialization, session handling, or the HTTP transport, so it
measures knowledge-service quality rather than protocol integrity.
**Attack it:** is there a failure mode that only appears over the wire and that
a community member would actually hit -- orientation text delivered differently,
tool-result truncation at the transport layer, schema coercion -- such that the
in-process number overstates the real product? Phase 2's probe asserts the
imported schema list matches served `ListTools` output; is that assertion
sufficient, and does it actually catch divergence in the `instructions` text
too, or only in the tool schemas?

**R2 -- the plan is NINE phases, sliced as a tracer bullet through the
tool-loop risk (README).** History worth knowing: it was drafted as seven, and
the orchestrator flagged two phases as possibly overloaded -- the operator
ratified splitting both on 2026-08-06. Answering (P2) and grading (P4) are now
separate machines on the reasoning that a tool loop fails mechanically and
visibly while a rubric fails silently and statistically, so the grader gets its
own agreement gate against hand-graded fixtures before the pilot depends on it.
Analysis (P8) and showcase capture (P9) split because the second is an operator
ritual in a different client whose output feeds another arc.
**Attack it:** the split creates a new seam -- Phase 2 now emits records with an
EMPTY `grade` field, which the Phase 1 schema must permit and the Phase 4
grader must populate in place. Does that round-trip actually work as specified,
or does some phase quietly assume grade-at-write-time? Is Phase 4 a real phase
or a pass-through that only exists to hold a prompt (check that its
verification stands on its own)? And with nine phases, is any phase now thin
enough that its boundary costs more than it buys?

**R3 -- the Tailscale direct-route fold-in is withdrawn (F6).** Reasoning: the
parking doc assumed this arc would need and therefore fix the parked HANDOVER
item; R1 removes the need entirely, so the item returns undischarged.
**Attack it:** does anything else in the plan still need it -- the Claude cells
(E11), a future targeted re-run, the showcase captures (D10, which run in
claude.ai against PROD over Cloudflare)? If the captures hit CF rate limits at
any point, the withdrawal is wrong.

**R4 -- scope and exclusion are applied inside the SQL of both retrieval paths,
and `fanout` stays hardcoded (E5, F8).** Reasoning: `fanout = limit * 4` is
applied per path before RRF fusion, so post-fusion filtering would shrink
results and destroy the B-vs-C dilution experiment, whose mechanism is exactly
candidate-slot crowding. Keeping `fanout` fixed keeps the candidate budget
identical across cells.
**Attack it:** with no partial or channel-scoped HNSW index, does a
channel-scoped vector query actually return the same QUALITY of top-N as the
unscoped one, or does pgvector's over-fetch-then-filter degrade recall in cell
B specifically -- turning a retrieval artifact into a fake "scoping helps/hurts"
finding? What probe would distinguish the two?

**R5 -- the corpus freeze is an operator prerequisite rather than a mechanism
(E4, F3).** Reasoning: the harvest is the operator's monthly ritual and holding
it is a one-line calendar edit; the plan records the baseline and re-asserts it
before the bulk run.
**Attack it:** a prerequisite that depends on a human remembering is weaker
than a check. Should Phase 5 hard-fail on a corpus-baseline mismatch rather
than merely re-assert it? What exactly happens to already-collected records if
a harvest lands mid-arc anyway?

## The orchestrator's own error record from this planning run

Stated so you can aim at the same class of mistake elsewhere.

1. **I trusted a spec number that was never a live count.** D4/D5's "3,324
   solved non-noise pool" and "~2% coverage cost" read as measurements; they
   were June arithmetic. I only caught it because a subagent's live count
   disagreed and I re-ran the query myself. Assume other derived-looking
   figures in the spec and in the phase docs have the same provenance problem.
2. **My first root-cause hypothesis for the missing IDs was wrong.** I assumed
   current-year re-fencing and then saw the missing band was in the LOW id
   range, which appeared to contradict it. The correct explanation needed the
   per-year id-block layout. I nearly wrote the wrong cause into the ledger on
   the strength of a plausible story.
3. **I assumed a capability instead of probing it, until late.** The tool-loop
   architecture was already chosen before I verified DeepSeek function calling
   actually worked. It did -- but that ordering was luck, not method, and F16's
   parallel-tool-calls and loop-budget consequences would have changed Phase 2's
   shape had I found them after drafting rather than before.
4. **A harness hook blocked every commit in this arc's lane and I had to fix it
   mid-plan.** Unrelated to the arc's content, but it means the lane was never
   exercised before this arc claimed it. Check the phase docs for other
   assumptions about the worktree that were never tested -- notably the
   gitignored `.env` that does not ride the worktree.

## How to respond

Land your response as a committed file in this directory
(`cold-review-<topic>.md`). Number each finding, give it a severity
(MAJOR / minor / question), cite the file and section it attacks, and state
what you would change. Where you checked something and it held, say so briefly
-- silence reads as "not examined". The orchestrator applies your response as a
normal finding round before the operator's intent review.
