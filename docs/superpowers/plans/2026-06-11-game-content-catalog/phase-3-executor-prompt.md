You are EXECUTING Phase 3 of the game-content-catalog completion arc
(2026-06-11). Invoke the `arc-executor` skill first; this prompt is your
phase-execution input.

ARC IDENTIFICATION -- read before anything else. This is the 2026-06-11
game-content-catalog arc: completing the qw-oracle gameplay_* L1 layer (id1
audit + monsters + KTX overlay + join keys). You are in the WRONG arc if you
see yourself working on: L3 concept notes / weapon-pair notes (that is the
demand-driven-l3 arc), VitePress or apps/docs-web (docs.quake.world arc),
match_event or log_template extraction AS NEW WORK (KTX onboarding arc --
but note this phase DOES make one surgical fix inside the existing
taxonomies extractor, F11 below; that is sanctioned), or Postgres migration
SQL (qw-oracle Arc 1). If the task in front of you looks like one of those,
HALT and tell the operator.

This is an EXECUTION session: you fix the F11 emit sites, run two Workflow
fan-outs over the KTX C source, write ktx-gameplay.yaml, run loads and
probes, and commit. Planning is complete; do NOT redraft the phase MD or
relitigate decisions.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (in order; do not skip):

1. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-3-ktx-overlay.md
   -- THE phase plan. Tasks 1+2 (fan-outs, may run concurrently) -> 3 (SME
   HALT) -> 4 (inline assembler) -> 5 (disjointness + F1). Its Verification
   section is your exit gate. Read its top "Decisions surfaced at drafting"
   block carefully (D22 cvar-gate form; F9 data-join-not-tool-envelope).
2. docs/superpowers/plans/2026-06-11-game-content-catalog/decisions.md
   -- all 22; D3, D4, D5, D8, D9, D10, D11, D12, D13, D16 (incl. 2026-06-12
   amendment), D17, D18, D19, D22 bind this phase directly.
3. docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md
   -- this phase owns F3, F11 (fix settled -- see augmentation 1), F15
   (carry-forward floor item); F9/F10 context.
4. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-1-findings.md
   section F + docs/superpowers/plans/2026-06-11-game-content-catalog/phase-2-findings.md
   -- the KTX carry-forward notes and the id1 monster baseline you diff against.
5. Operator memories: reference_workflow_rate_limit_and_args (Sonnet, waves
   of 3-5, ~2s pacing, retry pass, honest counts, args may arrive as a JSON
   STRING -- normalize), feedback_idempotency_before_staleness,
   feedback_repair_by_reextract_not_sql_update, feedback_verify_git_staging.

ORCHESTRATOR AUGMENTATIONS (2026-06-12, post-Phase-2 boundary; facts
verified live by the orchestrator):

1. TASK 0 (NEW -- runs BEFORE everything; F11 fix, settled form): the MD's
   boundary check 1 (citation-gate --source ktx, unresolved=0) CANNOT pass
   today -- 32 pre-existing ktx refs are broken (27 death_rule citing
   deathtype.h:N + 5 election_type citing progs.h:N; the files live at
   research/repos/ktx/include/, not under the src/ source_root). The fix is
   SETTLED (review-findings F11, orchestrator 2026-06-12):
   - Edit scripts/extractors/ktx/_handler_gameplay_taxonomies.py -- the
     f-string at :283 becomes f"../include/deathtype.h:{line_no}" and the
     one at :346 becomes f"../include/progs.h:{line}". Source_root-relative
     form (D7 default); do NOT use leading-slash; do NOT touch source_root.
   - Check scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py
     for assertions pinning the old bare form; update them in the same edit.
     Run the extractor tests.
   - Regenerate the output: read scripts/extractors/ktx/extract.py usage and
     re-run the gameplay_taxonomies handler against research/repos/ktx;
     confirm output/ktx-gameplay-taxonomies-ast.json now carries the
     ../include/ refs.
   - Re-load taxonomies via the load-knowledge dispatcher (find the
     subcommand in index.ts; the loader is load-gameplay-taxonomies.ts).
   - Gate: `bun run load-knowledge -- citation-gate --source ktx` goes
     32 -> 0 unresolved BEFORE you start Task 1. Anchors unchanged by the
     reload: death_rule=27, election_type=5 (SQL recount).
   These extractor files JOIN this phase's git scope (D17): the handler .py,
   its test file, and the regenerated output JSON are staged alongside the
   MD's four named paths.
2. EXECUTION GATE: LIFTED (D16 amendment, operator-signed 2026-06-12) --
   supersedes the phase MD's Inputs line about Track-A notes. Recount
   discipline stands: enumerate id1 baseline names and game_mode tokens from
   the LIVE DB at execution (the MD already says this).
3. LIVE STATE (verified today): id1 baseline is 52 entities (incl. the 15
   monsters, your Task 2 diff baseline) / 53 mechanics; ktx extractor
   anchors are monster_bloodfest=13, death_rule=27, mode_default=317,
   game_mode=27 -- exactly the MD's disjointness expectations.
4. F15 FLOOR ADDITION (carry-forward from Phase 1): add to Task 1's known
   floor list -- rocket direct-hit damage: id1 weapons.qc:385
   (100 + random()*20) vs KTX weapons.c:986 (fixed 110, comment "110 dmg on
   direct hits for all other cases"; a 55-damage branch sits just above at
   ~:981 for the shambler case -- read the enclosing branch, F10 lesson).
   This divergence appears UNGATED (KTX always behaves this way). The MD's
   sweep schema enums gate_kind mode|dm|cvar -- EXTEND it with
   gate_kind: "always" mapping to gate {} (mirrors the MD's own
   monster-overlay default for unconditional reimplementation deltas).
   Present all gate_kind=always candidates as their OWN group at the Task 3
   SME gate -- unconditional KTX-vs-id1 deltas are a judgment call the
   operator makes per delta (D12 surface 2).
5. F10 lesson (already baked into the MD's locked axe exemplar): verifying a
   gated value means reading the ENCLOSING branch. Your Task 1 Stage-2
   prompt asks for the gating condition explicitly -- reject any candidate
   whose two derivations disagree on the GATE, not just the value.
6. F18 (Phase 2 env finding): the session's connected qw-oracle MCP is
   remote prod -- it does NOT see the dev DB. Phase 3's boundary checks are
   all SQL/CLI (good); do not "verify" anything against the connected MCP.
7. Findings numbering: review-findings.md is at F18. Material findings you
   append start at F19 (sequential); update the ownership table. The
   per-delta ledger goes to phase-3-findings.md, NOT review-findings.md.
8. Workflow dials (D10 + memory): per-agent Sonnet, schema-enforced output
   with REQUIRED citation fields (D11), low concurrency (waves of 3-5, ~2s
   pacing), retry pass for nulls, honest counts -- never a silent
   catch-to-null. The Task 1 files are big (weapons.c 60KB); trial ONE file
   end-to-end (sweep + verify) before dispatching the rest. Fan-outs are
   read-only; re-dispatch dead items; never assemble from partials.
9. Process lessons (Phases 0-2): gates run against the FINAL tree state, in
   YOUR main thread, immediately before the halt -- never inherited from an
   earlier task, never relayed from a subagent or Workflow self-report.
   Paste actual outputs. Lockstep (D8): ktx-gameplay.yaml's expected_counts
   and the new/bumped F1 probe expecteds are the same live counts read
   twice, set AFTER the reload, in the same commit.
10. Git scope (D17): the MD's four paths (ktx-gameplay.yaml,
    quality-grid.ts, phase-3-findings.md, review-findings.md) PLUS the three
    Task 0 files (_handler_gameplay_taxonomies.py, its test file,
    output/ktx-gameplay-taxonomies-ast.json). `git diff --cached --stat`
    between add and commit; nothing else staged. Fresh commits, never
    --amend. Two commits are sensible (Task 0 fix; then the overlay) --
    executor's call. Do not push; the orchestrator pushes after boundary
    verification.

HALT-AND-REPORT SHAPE (end your session with exactly this):

- STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- Task 0 record: the two emit-site diffs, extractor test result, re-extract
  + re-load output, citation-gate --source ktx before/after (32 -> 0),
  anchor recounts.
- Fan-out honesty counts: Task 1 (3 files) and Task 2 (15 monsters)
  dispatched / returned / re-dispatched; candidates found / id1-native
  filtered / disputes; per-monster faithful-vs-deviates tally.
- SME gate record: the consolidated delta table as presented + the
  operator's accept/reject per delta (incl. the cvar-gated and
  gate_kind=always sub-lists).
- Phase boundary verification: each of the MD's 7 checks with the ACTUAL
  command output pasted (citation-gate --source ktx, both seed loads,
  ktx seed-idempotency, disjointness static scan + the four-anchor SQL,
  quality-grid --project ktx, the mode-join UNION SQL result, git diff
  --cached --stat).
- Commits made (SHAs + messages).
- New findings appended (F-numbers + one-line each).
- Open questions for the orchestrator/operator, if any.

Do NOT start Phase 4. Do NOT touch id1 rows, describe-mode.ts, or any MCP
tool code (F9 is deferred; D14 forbids new MCP surface). The 13 bloodfest
monster rows and the extractor's taxonomy rows are NOT yours to edit beyond
the sanctioned Task 0 ref fix.
