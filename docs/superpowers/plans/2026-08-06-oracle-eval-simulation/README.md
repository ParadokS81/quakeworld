# oracle-eval-simulation -- arc plan (full arc)

**Date:** 2026-08-06. **Weight class:** full arc (standalone spec D1-D11, 9
phases, net-new machinery, spend + Max-quota gates; cold adversarial plan
review + arc-end cold review).
**Spec:** `docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md`
(D1-D11, DESIGN COMPLETE 2026-08-06).
**Parent:** `docs/superpowers/parking/2026-08-06-oracle-eval-simulation.md`.
**Ledger:** `decisions.md` (E1-E15). **Findings:** `review-findings.md`
(F1-F40; F1-F16 pre-draft sweep, F17-F22 Phase 1 + checker, F23-F26 Phase 2,
F27-F31 Phase 3, F32-F36 Phase 3 checker, F37-F40 Phase 2 checker, F41-F42
Phase 3 revision, F43 Phase 2 revision, F44-F48 Phase 4, F49-F50 Phase 1 revisions
-- all before a line of code exists).

## Where we are right now

- **Stage:** planning -- scaffold committed; slicing RATIFIED by the operator
  2026-08-06 (7 phases -> 9, splitting answering/grading and
  analysis/showcase); phases 1-3 LANDED; phase 4 drafted, awaiting checker + a phase-1 producer revision (F44)
- **Last action:** Phase 1 independent checker returned 19 defects (6 MAJOR) and
  re-derived F17 with worse numbers than the draft; routed back to the original
  drafter as a continuation, ledger-side fixes applied here (E2, E7, E8
  amendments + 9 stale phase refs from the 7->9 renumber)
- **Next action:** Phase 1 LANDED (revised against 19 checker defects). Draft waves 2+3 / 4 /
  5+6 / 7+8+9 with a checker per doc, then the cross-doc coherence pass, then
  the cold adversarial plan review (`REVIEW-BRIEF.md` is written and waiting)

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
  (sample freeze) and Phase 7 (last answering pass) invalidates records
  mid-flight. Either hold the harvest until the arc's answering passes are
  done, or push the calendar date. Operator's call; the plan assumes held.
- [ ] **DeepSeek spend acknowledgement (E10).** Projected well under the Arc A
  corpus re-fence (~$31); the pilot reports a measured per-question cost before
  the bulk run commits to it. No approval gate beyond the Phase 5 GO.
- [ ] **A Max-quota evening for Phase 7.** ~80 answering passes + ~40 judgment
  passes run as Claude sessions, paced (E11). Not parallelizable at will -- an
  Opus burst tripped the account-wide throttle on the last arc that tried.
- [ ] Nothing else. DeepSeek API, the dev twin DB, and the oracle tool code are
  all inside the dev lane and verified reachable 2026-08-06.

## Sequencing

| Phase | Ships | Depends on | Archetype / verification floor |
|---|---|---|---|
| 1 | Scope + leave-one-out in the retrieval path (server-side, agent-invisible) behind an explicit ctx param; spawnable dev MCP over stdio against the twin; **run-record schema** | -- | contract + retrieval change -- automated (SQL probes, ListTools diff) |
| 2 | Answering skeleton: the DeepSeek tool-calling loop + cells A/B/C + incremental JSONL records + resume, proven end-to-end on the 12 existing phase-8 questions. **No grading.** | 1 | external API integration -- automated |
| 3 | Frozen sample manifest (~500 threads, proportional-with-floor over 24 domains) + DeepSeek key extraction filling `truth` | 1 | sampling + data prep -- automated (allocation probes) + operator spot-read |
| 4 | Grading machinery: the D6 rubric prompt, the blind toolless compare-grader, the `divergent` flag, agreement measured against a Claude hand-graded fixture slice | 2, 3 | eval machinery -- automated (agreement vs hand-graded fixtures) |
| 5 | **Pilot + calibration gate**: 30-50 threads through the FULL pipeline, Claude re-grades, >=90% match/miss agreement; explorer Runs tab lands so the operator can browse | 4 | eval gate -- operator-run (this is the arc's GO/NO-GO) |
| 6 | Bulk run: ~500 x 3 cells, resumable; post-bulk 5-10% re-grade + all divergents | 5 | batch execution -- automated + operator review of the divergent pile |
| 7 | Claude-side samples: D8 calibration (~40 q, cells A+C) + D7 unresolved judgment (~40, cell C) | 5, 6 | external integration -- operator-run (quota-paced) |
| 8 | Findings doc (headline, per-domain, dilution verdict, era window, routed findings, contributors) + explorer final data bake | 6, 7 | analysis + doc -- operator-run only |
| 9 | Showcase nomination (3-4 clear A-miss -> C-match wins) + operator captures made fresh in claude.ai + capture files handed to oracle-web | 8 | operator ritual + handoff -- operator-run only |

**Slicing rationale.** Tracer bullet through the dominant technical risk. The
arc's one genuinely unknown thing is whether a cheap model can drive the oracle
in a tool loop at all -- and there is **zero tool-calling prior art anywhere in
the repo** (F5). So Phase 2 pushes questions end-to-end through all three cells
before any sampling or bulk spend, using the 12 existing phase-8 questions so
it needs nothing from Phase 3 to prove itself.

Phase 1 is the arc's single contract owner: it defines both the retrieval
semantics every later cell depends on (scope, exclusion) and the run-record
shape every later phase reads or writes.

**Answering and grading are separate phases (2 and 4), by operator decision
2026-08-06.** They are separate machines that fail in unrelated ways -- a tool
loop fails mechanically and visibly, a rubric fails silently and statistically
-- and folding them together would have let the grader's only gate be the
pilot, where a bad rubric is expensive to discover. Phase 4 measures grader
agreement against a Claude hand-graded fixture slice before the pilot depends
on it. Phase 2 therefore ships records with an empty `grade` field, which the
Phase 1 schema must permit.

Phase 5 is the deliberate hinge -- everything before it is cheap and reversible,
everything after it spends money and quota at scale. It is the only phase whose
NO-GO is planned for (re-rubric and re-pilot, per spec D6).

**Analysis and showcase are separate phases (8 and 9), same decision.** Phase 8
is a committed internal deliverable; Phase 9 is an operator ritual in a
different client (claude.ai, per D10) whose output is a content drop into
another arc. Different failure modes, different reviewers, and Phase 9 can slip
without holding Phase 8's findings hostage.

**Verification-regime check:** every phase proves itself with what it ships.
Phase 1 proves scope/exclusion with SQL probes against the twin (no harness
needed). Phase 2 proves the loop on questions that already have keys (no sample
needed). Phase 3 proves allocation arithmetically (no answering needed). Phases
4-9 each consume only prior-phase outputs. No phase's probe requires a later
phase to exist.

## Phase docs

- `phase-1-eval-surface-contract.md` (contract owner -- drafted first)
- `phase-2-answering-skeleton.md`
- `phase-3-sample-and-keys.md`
- `phase-4-grader.md`
- `phase-5-pilot-gate.md`
- `phase-6-bulk-run.md`
- `phase-7-claude-samples.md`
- `phase-8-findings.md`
- `phase-9-showcase-captures.md`

Drafting waves (dependency-ordered, parallel only within a wave): **1** alone
(contract owner), then **2 + 3**, then **4**, then **5 + 6**, then **7 + 8 + 9**.

## Arc-end review

Full arc: cold subagent spec-vs-shipped walkthrough (arc-run owns the
mechanics) + operator walkthrough of the findings doc and the explorer.
