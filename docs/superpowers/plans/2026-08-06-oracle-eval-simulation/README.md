# oracle-eval-simulation -- arc plan (full arc)

**Date:** 2026-08-06. **Weight class:** full arc (standalone spec D1-D11, 7
phases, net-new machinery, spend + Max-quota gates; cold adversarial plan
review + arc-end cold review).
**Spec:** `docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md`
(D1-D11, DESIGN COMPLETE 2026-08-06).
**Parent:** `docs/superpowers/parking/2026-08-06-oracle-eval-simulation.md`.
**Ledger:** `decisions.md` (E1-E14). **Findings:** `review-findings.md` (F1-F15
surfaced at planning time, before any code).

## Where we are right now

- **Stage:** planning -- scaffold committed; slicing + lane awaiting operator
  intent review; phase docs not yet drafted
- **Last action:** pre-flight verification sweep (3 explorer agents + a
  first-hand read-only DB probe) landed 15 findings, two of which move the
  spec's own numbers -- see F1 and F6
- **Next action:** operator ratifies weight class + slicing + the F1/F6
  dispositions, then phase docs draft (P1 contract-owner first, then waves),
  checkers, coherence pass, cold adversarial plan review

## Lane

**Worktree** `/home/dev/projects/quakeworld-eval` on branch `eval-oracle-sim`
(already created 2026-08-06; carries the design spec commits).

Concurrent arc: **oracle-web-v1** holds the main checkout
(`/home/dev/projects/quakeworld`, branch `main`).

- **File seams are disjoint.** oracle-web touches
  `apps/qw-oracle/scripts/build-brain-manifest.ts`, `snapshots/`, and
  `deploy/nginx.conf`. This arc touches `serve/mcp/src/tools/`,
  `serve/mcp/src/index.ts`, a new `apps/qw-oracle/eval/sim/` tree, and
  `apps/qw-oracle/eval/sim-explorer.html`.
- **The deploy seam is NOT disjoint** and is the coordination point: both arcs
  change the `qw-oracle` stack. This arc's retrieval changes (E5) are
  additive and default-off, and the bulk run never touches prod (E3), so the
  merge order is free -- but whichever arc merges second re-verifies the other's
  live probes. Surfaced for the operator, not buried.
- Worktree setup note: `apps/qw-oracle/.env` is gitignored and does **not**
  ride the worktree. Phase 1 copies or symlinks it from the main checkout
  before any probe runs; `bun install` is per-worktree.

## Operator-side prerequisites

- [ ] **Corpus freeze for the arc's duration (E4).** The monthly L2 harvest
  (`.claude/calendar-checks.txt`, due **2026-09-06**) re-fences the current
  year's batches and **regenerates `chat_threads.id`** -- which is what already
  ate 234 threads out of the frozen June frame (F1). Running it between Phase 3
  (sample freeze) and Phase 6 (last answering pass) invalidates records
  mid-flight. Either hold the harvest until the arc's answering passes are
  done, or push the calendar date. Operator's call; the plan assumes held.
- [ ] **DeepSeek spend acknowledgement (E10).** Projected well under the Arc A
  corpus re-fence (~$31); the pilot reports a measured per-question cost before
  the bulk run commits to it. No approval gate beyond the Phase 4 GO.
- [ ] **A Max-quota evening for Phase 6.** ~80 answering passes + ~40 judgment
  passes run as Claude sessions, paced (E11). Not parallelizable at will -- an
  Opus burst tripped the account-wide throttle on the last arc that tried.
- [ ] Nothing else. DeepSeek API, the dev twin DB, and the oracle tool code are
  all inside the dev lane and verified reachable 2026-08-06.

## Sequencing

| Phase | Ships | Depends on | Archetype / verification floor |
|---|---|---|---|
| 1 | Scope + leave-one-out in the retrieval path (server-side, agent-invisible) behind an explicit ctx param; spawnable dev MCP over stdio against the twin; **run-record schema** | -- | contract + retrieval change -- automated (SQL probes, ListTools diff) |
| 2 | Walking skeleton: the DeepSeek tool-calling loop + cells A/B/C + grader + incremental JSONL records, proven end-to-end on the 12 existing phase-8 questions | 1 | external API integration + cross-cutting synthesis -- automated |
| 3 | Frozen sample manifest (~500 threads, proportional-with-floor over 24 domains) + DeepSeek key extraction filling `truth` | 1 | sampling + data prep -- automated (allocation probes) + operator spot-read |
| 4 | **Pilot + calibration gate**: 30-50 threads full pipeline, Claude re-grades, >=90% match/miss agreement; explorer Runs tab lands so the operator can browse | 2, 3 | eval gate -- operator-run (this is the arc's GO/NO-GO) |
| 5 | Bulk run: ~500 x 3 cells, resumable; post-bulk 5-10% re-grade + all divergents | 4 | batch execution -- automated + operator review of the divergent pile |
| 6 | Claude-side samples: D8 calibration (~40 q, cells A+C) + D7 unresolved judgment (~40, cell C) | 4, 5 | external integration -- operator-run (quota-paced) |
| 7 | Findings doc (headline, per-domain, dilution verdict, routed findings, contributors) + showcase nomination + operator captures handed to oracle-web | 5, 6 | analysis + doc -- operator-run only |

**Slicing rationale.** Tracer bullet through the dominant technical risk. The
arc's one genuinely unknown thing is whether a DeepSeek agent can drive the
oracle in a tool loop and produce answers a cheap grader can score against a
known fix -- and there is **zero tool-calling prior art anywhere in the repo**
(F5). So Phase 2 pushes one question end-to-end through all three cells,
grading included, before any sampling, any bulk spend, or any rubric tuning.
The 12 phase-8 eval questions already carry verified answer keys, so the
skeleton has a ground truth to prove itself against without waiting on Phase 3.

Phase 1 is the arc's single contract owner: it defines both the retrieval
semantics every later cell depends on (scope, exclusion) and the run-record
shape every later phase reads or writes.

Phase 4 is the deliberate hinge -- everything before it is cheap and reversible,
everything after it spends money and quota at scale. It is the only phase whose
NO-GO is planned for (re-rubric and re-pilot, per spec D6).

**Verification-regime check:** every phase proves itself with what it ships.
Phase 1 proves scope/exclusion with SQL probes against the twin (no harness
needed). Phase 2 proves the loop on questions that already have keys (no sample
needed). Phase 3 proves allocation arithmetically (no answering needed). Phases
4-7 each consume only prior-phase outputs. No phase's probe requires a later
phase to exist.

## Phase docs

- `phase-1-eval-surface-contract.md` (contract owner -- drafted first)
- `phase-2-walking-skeleton.md`
- `phase-3-sample-and-keys.md`
- `phase-4-pilot-gate.md`
- `phase-5-bulk-run.md`
- `phase-6-claude-samples.md`
- `phase-7-findings-and-showcase.md`

## Arc-end review

Full arc: cold subagent spec-vs-shipped walkthrough (arc-run owns the
mechanics) + operator walkthrough of the findings doc and the explorer.
