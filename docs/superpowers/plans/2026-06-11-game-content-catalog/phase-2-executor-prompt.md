You are EXECUTING Phase 2 of the game-content-catalog completion arc
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

This is an EXECUTION session: you run the wiki snapshot prep, the per-monster
Workflow fan-out, edit the seed YAML and quality-grid, run loads and probes,
and commit. Planning is complete; do NOT redraft the phase MD or relitigate
decisions.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (in order; do not skip):

1. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-2-monsters.md
   -- THE phase plan. Tasks 1 (roster pin, HALT on drift) -> 2 (wiki snapshot)
   -> 3 (extract+verify fan-out) -> 4 (SME gate on mismatches) -> 5 (inline
   assembler) -> 6 (F1 probe). Its Verification section is your exit gate.
2. docs/superpowers/plans/2026-06-11-game-content-catalog/decisions.md
   -- all 22; D1, D2, D5, D6, D7, D8, D10, D11, D12, D13, D15, D16 (incl.
   2026-06-12 amendment), D17, D18, D19 bind this phase directly.
3. docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md
   -- F7+F10 (line-accurate-but-role-wrong lesson), F8 (fandom 403 design),
   F12 (wrong-branch lesson -- the tree you cite is now pinned), F11 context.
4. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-1-findings.md
   -- section F (KTX carry-forward context; not your scope, but explains F15).
5. Operator memories: reference_workflow_rate_limit_and_args (Sonnet, waves
   of 3-5, ~2s pacing, retry pass, honest counts, args may arrive as a JSON
   STRING -- normalize), feedback_idempotency_before_staleness,
   feedback_verify_git_staging.

ORCHESTRATOR AUGMENTATIONS (2026-06-12, post-Phase-1 boundary; facts
verified live by the orchestrator):

- EXECUTION GATE: LIFTED (D16 amendment, operator-signed 2026-06-12) --
  supersedes the phase MD's Inputs line about Track-A notes. Recount
  discipline stands: enumerate from live files.
- LIVE COUNTS have moved since the MD was drafted: Phase 1 shipped 12 new
  mechanics rows. expected_counts is now {entities: 37, mechanics: 53}; the
  mechanics cluster header reads "# Cluster 4: mechanics (53 rows total)" and
  sits at LINE 591 (not 562 as the MD says), immediately above "mechanics:"
  at line 592. Your cluster insert goes between the last item row and line
  591; the renumber target is the 53-row header. Phase 2 bumps ENTITIES only
  (37 -> 52 if all 15 land); mechanics stays 53.
- <v106-dir> RESOLVED: the v1.06 tree is research/repos/QuakeC-releases/
  with the QC files under its progs/ SUBDIRECTORY -- so substitute
  <v106-dir> = "QuakeC-releases/progs" everywhere in the MD's commands and
  citation forms. Citations: /research/repos/QuakeC-releases/progs/<file>.qc:N
  (leading-slash form, D7). Verified today: progs/ holds 36 .qc files incl.
  all roster files (boss.qc, demon.qc, ogre.qc, oldone.qc, shalrath.qc,
  shambler.qc, soldier.qc, ...).
- TREE IDENTITY (F12): the tree MUST be at commit
  85ccafd2652ec550a561849a6a5eb92e62cdc115 (branch id1-original, PRISTINE
  v1.06, no fixes applied). First action of Task 1: verify
  `git -C research/repos/QuakeC-releases rev-parse HEAD` equals that SHA.
  If it does not, HALT (do not re-clone on your own -- the F12 lesson is
  that branch names mislead; the SHA is the anchor).
- F7/F10/F12 lesson chain, now three instances: a citation can be
  line-accurate and ROLE-wrong, and a tree can pass value-greps and be the
  wrong release. Your Stage-2 verify agents must re-derive with enclosing
  context (the prompts already say so); your inline comparison must reject
  any value whose two derivations cite different mechanisms, not just
  different numbers.
- Jina reachability verified at arc kickoff (HTTP 200 on a quakewiki.org
  monster page). pak progs.dat is present at
  apps/qw-oracle/data/pak-cache/progs.dat (v1.06, crc 5927, provenance
  sidecar) -- the D1/D2 arbiter if a genuine source dispute reaches the
  SME gate.
- wiki-cache state verified today: apps/qw-oracle/data/wiki-cache/ does NOT
  exist yet and the path is NOT gitignored -- the MD's commit-the-snapshot
  default applies as written.
- F11 (KNOWN, not yours): a FULL-scan citation-gate run exits 1 with 32
  pre-existing ktx unresolved refs. Your boundary check 1 is scoped
  --source id1 (expect unresolved=0). Do not touch ktx data.
- Findings numbering: review-findings.md is at F16. Material findings you
  append start at F17 (sequential); update the ownership table. The
  per-monster ledger goes to phase-2-findings.md, NOT review-findings.md.
- Workflow dials (D10 + memory): per-agent Sonnet, schema-enforced output
  with REQUIRED citation fields (D11), low concurrency (waves of 3-5, ~2s
  pacing), retry pass for nulls, honest counts. Trial 2-3 monsters before
  the full 15. Fan-out is read-only; re-dispatching a dead item is safe and
  required (never assemble from partials).
- Task 4 fast-path: if there are NO discrepancies and NO wiki mismatches,
  say so and skip the HALT (the MD allows it). Otherwise present the two
  tables exactly as shaped and STOP for the operator.
- Phase 0/1 process lessons: gates run against the FINAL tree state, in
  YOUR main thread, immediately before the halt -- never inherited from an
  earlier task, never relayed from a subagent or Workflow self-report.
  Paste actual outputs. The lockstep rule applies to ENTITIES this phase:
  expected_counts.entities (seed gate) and the monster probe expected (F1)
  are read from the live file/DB AFTER the reload, in the same commit.
- Git scope (D17): stage ONLY the five paths in Verification step 7
  (id1-gameplay.yaml, quality-grid.ts, phase-2-findings.md,
  review-findings.md, data/wiki-cache/monsters/). research/repos/ is
  gitignored -- never staged. `git diff --cached --stat` between add and
  commit. Fresh commits, never --amend. Do not push; the orchestrator
  pushes after boundary verification.

HALT-AND-REPORT SHAPE (end your session with exactly this):

- STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- Roster pin record: resolved dir, file list confirmation, the three
  classname<->file pairing grep results, HEAD SHA check.
- Fan-out honesty counts: monsters dispatched / returned / re-dispatched
  for both stages; agreement vs discrepancy vs wiki-mismatch totals.
- SME gate record: the tables as presented + operator decisions (or the
  no-mismatch fast-path statement).
- Phase boundary verification: each of the MD's 7 checks with the ACTUAL
  command output pasted (citation-gate --source id1 summary, the monster
  F1 probe line + the Phase 1 probes still green, seed-idempotency
  pass+hashes, load totals vs expected_counts, the SQL roster + MCP
  search_gameplay_entities result, wiki-cache file count, git diff
  --cached --stat).
- Commits made (SHAs + messages).
- New findings appended (F-numbers + one-line each).
- Open questions for the orchestrator/operator, if any.

Do NOT start Phase 3. Do NOT touch ktx rows, mechanics rows, or MCP tool
code. The 13 ktx bloodfest monster rows are a DIFFERENT fact-family behind
a different gate -- leave them exactly as they are (the MD's FENCE comment).
