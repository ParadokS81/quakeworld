You are EXECUTING Phase 0 of the game-content-catalog completion arc
(2026-06-11). Invoke the `arc-executor` skill first; this prompt is your
phase-execution input.

ARC IDENTIFICATION -- read before anything else. This is the 2026-06-11
game-content-catalog arc: completing the qw-oracle gameplay_* L1 layer (id1
audit + monsters + KTX overlay + join keys). You are in the WRONG arc if you
see yourself working on: L3 concept notes / weapon-pair notes (that is the
demand-driven-l3 arc), VitePress or apps/docs-web (docs.quake.world arc),
match_event or log_template extraction (KTX onboarding arc, 2026-05-04), or
Postgres migration SQL (qw-oracle Arc 1, 2026-05-02). If the task in front of
you looks like one of those, HALT and tell the operator.

This is an EXECUTION session: you modify code, run loads, run probes, and
commit. Planning is complete; do NOT redraft the phase MD or relitigate
decisions.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (in order; do not skip):

1. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-0-prereqs-loader.md
   -- THE phase plan. Execute its tasks 1-7 in order; its Verification
   (phase boundary) section is your exit gate.
2. docs/superpowers/plans/2026-06-11-game-content-catalog/decisions.md
   -- all 22; D7, D8, D13, D16 (incl. 2026-06-12 amendment), D17, D18, D19
   bind this phase directly.
3. docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md
   -- this phase owns F1 and F2.
4. Operator memories: feedback_no_subagents_for_mechanical_edits (annotations
   are content-conditional -- honor them BOTH ways),
   feedback_idempotency_before_staleness, feedback_verify_git_staging.

ORCHESTRATOR AUGMENTATIONS (2026-06-12 kickoff; facts verified live today):

- EXECUTION GATE: LIFTED. The D16 amendment (operator-signed 2026-06-12)
  supersedes the phase MD's Inputs line about waiting for Track-A notes.
  Treat that input as satisfied; everything else in D16 stands (recount
  discipline: enumerate from live files, never from MD-frozen lists).
- Environment pre-verified by the orchestrator today: qw-oracle-postgres-dev
  up (healthy), Jina reachable (200), git pulled clean, plan dir at its
  approved state (a109bf9f). Re-verify cheaply if anything smells off, but
  these are not your blockers.
- pak progs.dat: the prerequisite said data/pak-cache/ holds it; at kickoff
  it held only the maps-arc .bsp files. The orchestrator extracted progs.dat
  (v1.06, progs_crc=5927, byte-identical across both candidate paks) into
  apps/qw-oracle/data/pak-cache/progs.dat with a .provenance.txt sidecar.
  Phase 0 does not exercise it (confirm-only input); it is now present.
- id1-gameplay.yaml has NOT changed since the phase MD was drafted (last
  commit e1de1cff, the original 78-row inventory; no Track-A backfills).
  The 37/41 baseline is therefore likely still live -- but Task 2 says
  RECOUNT from the file, so recount anyway; do not assume.
- The hardcoded 37/41 gate was verified live in index.ts today, exactly as
  the MD's Deleted section describes. The MD's diffs match the tree.
- Task ordering trap: Task 2's verification step runs AFTER Task 3 lands
  (the MD says this explicitly) -- until the new gate exists, the OLD
  hardcoded gate is live and a recounted-higher number would STOP spuriously.
- Subagent outputs are hypotheses (feedback_verify_dispatched_terminal_claims):
  for Tasks 4, 5, 7 you re-run the probes/tests YOURSELF in the main thread
  after the subagent reports green, and you paste the actual outputs (scanned
  counts, hashes, test summary) into your halt report -- never relay a
  subagent's PASS claim as your own verification.
- Git scope (D17): stage ONLY the six paths named in Verification step 7.
  research/repos/ is gitignored -- never staged. Run
  `git diff --cached --stat` between add and commit. Fresh commits, never
  --amend (sibling arcs are live on main). Working tree will contain
  unrelated uncommitted files -- that is normal, not drift; leave them.
- Commit cadence: commit the phase as its coherent unit when boundary
  verification is green (one commit is fine; two if Task 1's research-repo
  README row wants separating -- but that file is gitignored, so in practice
  the code+YAML commit is the unit). Do not push; the orchestrator pushes at
  the phase boundary after its own verification.

HALT-AND-REPORT SHAPE (end your session with exactly this):

- STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- Phase boundary verification: each of the MD's 7 checks with the ACTUAL
  command output pasted (typecheck exit, bun test summary, load totals +
  declared counts, seed-idempotency pass+hashes, citation-gate scanned +
  unresolved, the two spot-verify grep lines, git diff --cached --stat).
- v1.06 acquisition record: mirror URL, commit SHA, acquisition date,
  directory name chosen.
- Commits made (SHAs + messages).
- New findings to append to review-findings.md (evidence + suggested
  F-number), if any. A baseline citation that fails the gate is a FINDING to
  report, not something to fix silently.
- Open questions for the orchestrator/operator, if any.
- Concerns (if DONE_WITH_CONCERNS): each with the evidence that raised it.

Do NOT start Phase 1. Do NOT touch describe_mode or MCP tool code (F9 is
deferred to the MCP-realignment backlog; D14 forbids new MCP surface).
