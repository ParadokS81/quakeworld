---
date: 2026-08-06
type: parking (future arc, imminent)
arc-slug: oracle-eval-simulation
status: PARKED 2026-08-06 -- captured mid oracle-web-v1 arc-plan session; operator intends to
  run this in a FRESH TERMINAL parallel to the oracle-web-v1 implementation arc. Entry =
  arc-design direct mode from this doc.
related:
  - docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md (consumer of the showcase
    byproduct; its why-comparison overlay ships dark until this arc feeds it -- see the
    2026-08-06 re-homing amendment there)
  - docs/superpowers/parking/2026-08-04-oracle-web-direction.md (parent direction doc)
  - docs/superpowers/parking/2026-08-05-contract-worker-spike-report.md (the DeepSeek rig
    this arc reuses: fence-external.ts + host-local wrapper; memory
    reference_contract_worker_llm_rig)
  - apps/qw-oracle/scripts/load-chat/backfill-ledger.md (corpus provenance; 40,219 threads,
    100% fence-sonnet-v2)
---

# Oracle effectiveness eval -- DeepSeek-run helpdesk simulation + showcase captures

## Why this is arc-shaped

- **Spec required**: eval methodology (sampling, rubric, ground-truth handling, model
  roles) must be designed before any harness code -- a bad rubric silently invalidates
  every downstream number.
- **Cross-cutting decisions**: model-role split, grading design, tool-loop architecture,
  honesty posture for anything that later goes public.
- **Multi-phase**: harness build -> pilot calibration -> full simulation -> analysis ->
  showcase capture. Each phase gates the next.
- **Verification regime per phase**: pilot-vs-spot-check calibration gate before the bulk
  run; grade spot-check sampling after it (DeepSeek is never sole judge where no ground
  truth exists).

## Scope sketch

Simulate the oracle against the real helpdesk corpus to answer two questions with one
machine:

1. **Product eval (primary):** how well does an agent WITH the oracle MCP answer the
   community's actual questions vs the same agent WITHOUT it -- measured across the
   helpdesk topic map. The killer metric: the L2 corpus now labels threads
   resolved vs unresolved (40,219 threads, backfill completed 2026-08-06), so
   **resolved threads carry free ground truth** (the human-verified resolution is the
   answer key -- grading is "did the with-oracle answer land on what actually fixed it",
   not squishy LLM preference). Unresolved threads have no key: "could the oracle have
   cracked it" is a judgment call, sampled and reviewed by Claude/operator, never
   bulk-auto-graded.
2. **Showcase byproduct (secondary):** the sim surfaces the questions where the oracle
   most visibly wins; the best 3-4 get re-captured CLEANLY for oracle.quake.world's
   "why do I need this" overlay. Integrity rule inherited from the oracle-web spec:
   published comparisons are verbatim captured answers, dated + model-labeled, no
   strawmen -- and the published captures should come from a client the community
   actually uses (Claude, not DeepSeek). The sim picks WHICH questions to capture; it
   does not produce the published captures.

**Model-role split (the token-economics premise):** Fable/Claude designs the harness,
rubric, and sampling, and spot-checks grades; DeepSeek (via the proven contract-worker
rig) runs the bulk -- hundreds of with/without answering passes + first-pass grading
against ground truth. Cost anchor: the entire Arc A corpus re-fence ran ~$31; this is
projected well under that. Claude tokens go to design + judgment only.

**New machinery (the real build):** the fencer is text-in/text-out; the with-oracle runs
need DeepSeek in a **tool-calling loop** against the MCP endpoint (DeepSeek supports
function calling). Bulk runs must NOT go through the Cloudflare front door
(`oracle.slipgate.me` trips CF 1015 at ~10 parallel requests -- known from ktx-l1
fan-outs); route direct on the local network / Tailscale. This finally gives HANDOVER's
parked "MCP Tailscale direct-route for batch jobs" followup its reason to get done --
fold it in.

**Prior operator research (input to sampling design):** before the US-trip pause the
operator researched mapping the helpdesk channel for topic threads / most-asked
questions, intending exactly this simulation. Locate that material at arc-design time
and feed it into the sampling pass rather than re-deriving the topic map cold.

## Open questions for the design passes

- Sampling design: how many threads, stratified how (topic domain x resolved/unresolved
  x era)? Does the operator's earlier topic-map research still hold, and where does it
  live?
- Rubric: grading scale for resolved threads (match-the-known-fix); criteria for the
  unresolved-thread judgment sample; what "the oracle could have managed it" means
  operationally.
- Without-oracle baseline: same DeepSeek model with tools stripped (clean symmetry for
  the bulk eval) -- confirm, and decide whether a small Claude-run sample calibrates the
  DeepSeek-vs-mainstream gap.
- Harness home: extend the fence-external.ts rig vs a sibling script in the same family.
- Output artifact: report shape (internal findings doc first; what subset ever feeds the
  website or a public writeup).
- Showcase capture protocol: which client(s), session hygiene, how the captures land in
  oracle-web (content drop, no redesign -- the overlay is already built dark-until-fed).

## NOT in scope

- Any oracle-web code or design changes (oracle-web-v1 arc owns the site; the overlay
  ships structurally present but dark until this arc feeds it).
- `submit_resolution` / any corpus writes -- read-only eval throughout.
- Publishing eval data publicly; the report is internal until the operator decides
  otherwise.
- Fixing gaps the eval finds (retrieval tuning, RRF recalibration, missing L3 notes) --
  those become findings routed to their own tracks, not scope creep here.

## Operator notes (2026-08-06)

- "The REAL value comes from the qualitative answers produced WITH the MCP as opposed to
  without" -- the eval is both product-quality drilling AND the source of representative
  showcase examples, and the two purposes stay separated in the design.
- Wary of burning Claude/Max tokens on bulk analysis; DeepSeek rig is the standing
  answer (proven on the Phase C backfill).
- Operator can run this arc simultaneously with the oracle-web-v1 implementation arc.

## Trigger

Operator-initiated, imminent: take this doc to a fresh terminal and open with
arc-design (direct mode). No external gate.
