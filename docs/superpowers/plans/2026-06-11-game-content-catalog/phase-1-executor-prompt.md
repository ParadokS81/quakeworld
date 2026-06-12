You are EXECUTING Phase 1 of the game-content-catalog completion arc
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

This is an EXECUTION session: you run Workflow fan-outs, edit the seed YAML
and quality-grid, run loads and probes, and commit. Planning is complete; do
NOT redraft the phase MD or relitigate decisions.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (in order; do not skip):

1. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-1-audit.md
   -- THE phase plan. Tasks 1+2 (fan-outs, may run concurrently) -> 3 (SME
   HALT) -> 4 (inline assembler) -> 5 (probes). Its Verification (phase
   boundary) section is your exit gate.
2. docs/superpowers/plans/2026-06-11-game-content-catalog/decisions.md
   -- all 22; D1, D4, D8, D10, D11, D12, D13, D16 (incl. 2026-06-12
   amendment), D17, D18, D19 bind this phase directly.
3. docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md
   -- F7 (this phase's drafting lesson: a citation can be line-accurate and
   role-wrong), F11 + F12 (Phase 0 execution findings; context below).
4. Operator memories: reference_workflow_rate_limit_and_args (Sonnet, waves
   of 3-5, ~2s pacing, retry pass, honest counts, args may arrive as a JSON
   STRING -- normalize with JSON.parse), feedback_model_effort_range,
   feedback_idempotency_before_staleness, feedback_verify_git_staging.

ORCHESTRATOR AUGMENTATIONS (2026-06-12, post-Phase-0 boundary; facts
verified live by the orchestrator):

- EXECUTION GATE: LIFTED. The D16 amendment (operator-signed 2026-06-12)
  supersedes the phase MD's Inputs line about Track-A notes. Everything else
  in D16 stands: enumerate rows/groups from the LIVE YAML, never from lists
  frozen in the MD.
- Phase 0 shipped (commits d5e8f8eb + bab08857, orchestrator-verified):
  the loader takes a monsters section + per-seed expected_counts gate;
  `load-knowledge -- citation-gate` and `-- seed-idempotency` exist and are
  green on the baseline. Live baseline is still 37 entities / 41 mechanics
  (verified today; no Track-A backfill has landed). expected_counts in
  id1-gameplay.yaml currently declares 37/41.
- F11 (KNOWN, not yours to fix): a FULL-scan `citation-gate` run exits 1
  with exactly 32 unresolved ktx refs (27 death_rule citing deathtype.h + 5
  election_type citing progs.h; the files live under ktx/include/ not the
  ktx source_root src/). Pre-existing extractor data; Phase 3 owns it. Your
  boundary check 1 is ALREADY scoped `--source id1` (expect unresolved=0
  there). Do not "fix" ktx refs; do not treat the unscoped exit 1 as a
  Phase 1 failure.
- F12 lesson (Phase 0): a tree/value can pass spot-greps and still be the
  wrong source -- verify the ROLE and CONTEXT of what you cite, not just
  that the line contains the value. Your audit Stage-1 prompt already asks
  for re-derivation with surrounding context; hold agents to it. NOTE: this
  phase audits against research/repos/qwcl-original/QW/progs/ (the id1
  source_root, 17 .qc files) -- NOT the v1.06 monsters tree Phase 0
  acquired (that is Phase 2's source). Do not cross the trees.
- Phase 0 process lesson (the executor's own): gates run against the FINAL
  tree state, in YOUR main thread, immediately before the halt -- never
  inherited from an intermediate checkpoint, never relayed from a subagent
  or Workflow self-report. Paste actual outputs in the halt report.
- Findings numbering: review-findings.md is now at F12. Material findings
  you append start at F13 (sequential; the example numbers inside the phase
  MD's Task 4 text, "F7/F8", are stale -- written before drafting-time
  findings took those numbers). Append + update the ownership table; do not
  renumber existing entries. The per-value audit ledger goes to
  phase-1-findings.md, NOT review-findings.md.
- Workflow dials (D10 + memory): per-agent Sonnet (default effort is right
  for read-and-rederive), schema-enforced output with REQUIRED citation
  fields (D11), low concurrency (waves of 3-5, ~2s pacing), a retry pass for
  transient nulls, honest success/fail counts in the result -- never a
  silent catch-to-null. Trial a small batch (2-3 groups) before the full
  fan-out. The fan-outs are read-only over the QC tree; re-dispatching a
  dead group is safe and required (never assemble from partial results).
- Task 3 is an OPERATOR HALT (D12 surface 1): present the gap-candidate
  table in the MD's exact format and STOP for the operator's accept/reject
  list. Any needs_new_kind=true candidate is flagged separately -- accepting
  one is a D14 deviation that escalates to the planner; default reject or
  re-home under an allowed kind.
- Lockstep rule (D8/F1-probe): Task 4's expected_counts.mechanics bump and
  Task 5's ID1 probe `expected` values are the SAME live counts read twice,
  set AFTER the reload, verified by SQL against the dev DB before commit
  (F29 discipline). A divergence between the two is a bug, not a tolerance.
- First-ever `--project qw` quality-grid run may ERROR on pre-existing
  non-gameplay global probes that assume an engine project. Per the MD's
  recovery: record it as a finding (F13+), re-run scoped
  `--probe F1.id1.gameplay_kind`, and do NOT bend data or probes to it.
- Git scope (D17): stage ONLY the four paths in Verification step 7
  (id1-gameplay.yaml, quality-grid.ts, phase-1-findings.md,
  review-findings.md). `git diff --cached --stat` between add and commit.
  Fresh commits, never --amend. Unrelated uncommitted files in the tree are
  normal; leave them. Do not push; the orchestrator pushes after boundary
  verification.

HALT-AND-REPORT SHAPE (end your session with exactly this):

- STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- Fan-out honesty counts: groups dispatched / returned / re-dispatched for
  Task 1 and Task 2 (17 files); verdict totals (agree / discrepancy
  confirmed / unresolved disputes); gap candidates found.
- SME gate record: the candidate list as presented + the operator's
  accept/reject decisions.
- Phase boundary verification: each of the MD's 7 checks with the ACTUAL
  command output pasted (citation-gate --source id1 summary, quality-grid
  --project qw probe lines, seed-idempotency pass+hashes, load totals vs
  expected_counts, the SQL row check, ledger existence, git diff --cached
  --stat).
- Commits made (SHAs + messages).
- New findings appended (F-numbers + one-line each).
- Open questions for the orchestrator/operator, if any.

Do NOT start Phase 2. Do NOT touch monster rows, ktx data, or MCP tool code.
