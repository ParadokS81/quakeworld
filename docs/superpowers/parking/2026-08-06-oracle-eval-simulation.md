---
date: 2026-08-06
type: parking (future arc, imminent)
arc-slug: oracle-eval-simulation
status: DESIGN COMPLETE 2026-08-06 (same-day arc-design run, all four passes). Spec:
  docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md (D1-D11). Next =
  arc-plan from the spec; work lives on worktree quakeworld-eval, branch eval-oracle-sim.
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

> **Correction 2026-08-06 (arc-plan verification sweep):** the fold-in is
> **withdrawn**. The bulk cells do not need MCP transport at all -- the harness
> imports the oracle's tool handlers in-process (proven by the June 11-thread
> hypothesis test, which did exactly this with self-thread exclusion), so
> Cloudflare, the missing dev MCP container, and the Tailscale route all leave
> the critical path. The Claude-side cells spawn the server over **stdio**
> against the twin, which also bypasses CF. The parked HANDOVER item therefore
> returns unchanged and un-discharged -- do not read this arc's completion as
> having closed it. Detail: arc plan `review-findings.md` F6, ledger E6.

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

## Pass status

DESIGN COMPLETE 2026-08-06 -- all four passes closed in one arc-design session.
Spec: `docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md`,
D1-D11. June topic-map research located and reused (spec `related:`) --
nothing re-derived. Explorer artifact shipped (demand map + contributors;
Runs tab dark until the sim feeds it). Next: arc-plan.

## Trigger

Operator-initiated, imminent: take this doc to a fresh terminal and open with
arc-design (direct mode). No external gate.

## Addendum (2026-08-11, chunk-6 migration repair): MCP Tailscale direct-route -- action detail

Extracted from quakeworld HANDOVER.md (pre-migration) at the chunk-6 W17 migration --
the concrete action detail behind the "fold in MCP Tailscale direct-route followup"
line above, which this doc only referenced at a summary level.

**Context:** bulk with-oracle runs for this eval must not go through the Cloudflare
front door -- `oracle.slipgate.me` trips CF error 1015 (rate limit) at roughly 10
parallel requests, a ceiling first hit during the ktx-l1 fan-out work. That history is
the reason a direct route matters for THIS arc specifically, not just as general
hygiene.

**Action items (~30 min total):**
- Teach `.mcp.json` / the dispatcher to prefer the Tailscale route
  (`100.114.81.91`) over the Cloudflare hostname for MCP calls.
- Expose and document the MCP port on Unraid so the direct route is reachable.
- Run a smoke test against the direct route before the bulk simulation run depends
  on it.

## Resume notes (2026-10-01/02) -- inputs for the fresh arc-plan

Written at the resume-orientation session; everything below is evidence for planning,
not a decision already taken.

- **Workflow.** Workflow v2 has been current since 2026-09-03 and is forward-only
  (harness-lab `workflow/migration.md`). The D1-D11 spec carries over; the 2026-08-06 V1
  plan (9 phases, 1-4 drafted, F1-F73, ledger E1-E15) is reference input to a fresh
  `arc-plan`, not an executable plan. Lane moved to `~/worktrees/quakeworld-eval`; main
  merged in 2026-10-01.
- **Freshness check (2026-10-01, read-only agent + re-verified after the harvest).** Every
  load-bearing premise holds: #helpdesk 6,772 / 3,694 solved; the frozen June frame resolves
  to 4,456 non-noise / 4,222 live / **3,164 solved**, unchanged; `search_solved_issues` and
  `serve/mcp/src/tools/` untouched on main since the merge-base (Phase 1's seams are still
  open); oracle-web's WhyCompare overlay still dark; the 12-question phase-8 set present. The
  June script `faq-gate-retrieve.ts` still imports dead `/home/paradoks/` paths (F4); its
  handler files exist, so in-process import is fine with relative paths.
- **Harvest and sequencing.** The monthly harvest ran 2026-10-01/02 (2026 only; chat_threads
  40,219 -> 40,943 on the twin; frame untouched -- the load is (channel, year)-scoped and the
  frame's threads all start 2020-05-11..2025-12-29). The next is due 2026-11-02; the calendar
  entry now carries a watch item: **do not run it while answering runs are in flight** (E4's
  intent, narrowed: only the 2026 batches move, but a harvest changes what the oracle
  searches mid-comparison). **Any re-fence of historical years regenerates their thread ids
  and orphans the whole frozen frame** -- such a re-fence must follow the eval, or the
  sampling must be redesigned around it.
- **Model landscape changed since August.** DeepSeek retired `deepseek-v4-flash`;
  `deepseek-flash` is V4.1 Flash, `deepseek-v4-pro` unchanged; peak 01-04 + 06-10 UTC
  weekdays at 2x. DeepSeek's API was down ~19:40-21:30 UTC on 2026-10-01 -- the answering
  harness wants a preflight and a provider switch (`fence-external.ts`'s `--provider`
  pattern is reusable). An OpenRouter account exists (key `~/projects/.secrets/openrouter.env`),
  which opens two plan options: (a) cheap answering/grading models beyond DeepSeek -- the
  fence bake-off found GPT-6 Luna and DeepSeek-via-OpenRouter on par with production
  DeepSeek at a fraction of the cost (spike report section 8); (b) **Claude via API,
  pay-per-use** (Sonnet 5.5 $2/$10 per M tokens), so D8's ~40-question Claude calibration
  sample need not run on Max quota as subagents -- price it at plan time.
- **Thread grain matters to this arc (bake-off finding).** Against an Opus reference, two
  strong splitters disagree mostly on grain (Sonnet cut 1.26x finer, precision 96 / recall
  52), and DeepSeek lumps on big chunks (~0.7x Opus's thread count on 500+ msg chunks;
  labels like "...and related banter" in the live corpus). Consequences to plan for:
  (1) **leave-one-out leaks when a conversation was split** -- the answer can sit in a
  sibling fragment the oracle may still retrieve; candidate fix: exclude every thread fenced
  from the same chunk and time window as the sampled thread, not just the thread itself;
  (2) key extraction from a lumped thread can pick up the wrong fix. Open operator question,
  asked and not yet answered: is "one complete help episode per thread" the target grain?
  Retrieval-side mitigation floated, not scoped: return a hit's neighbouring threads.
- **Why this arc matters more now.** The operator re-voiced support.quake.world (public
  ask-the-AI support surface on pre-built tickets); this eval is its proof, and its
  answer-key step is a 500-ticket pilot of the ticket rewrite (oracle-web direction doc,
  "Inputs added 2026-10-01").
