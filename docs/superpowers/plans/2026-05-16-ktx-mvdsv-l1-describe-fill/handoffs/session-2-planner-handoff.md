# KTX/MVDSV L1 describe-fill -- planner session 2 handoff (fresh terminal)

**For:** a fresh terminal resuming the arc-planner role. Created 2026-05-17 at
a deliberate context reset (prior planner session crossed the ~400k smell
zone; Phase 1 review needs fresh-context fidelity --
`feedback_fresh_context_for_execution`). The prior session did: scaffold +
slicing lock + Phase 0 review/approve + the OQ-3 correction. Phase 1 review is
the next task and is intentionally NOT done in the old context.

## Where things are

- Arc dir: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/`.
  Scaffold + slicing LOCKED. Tree clean, all committed.
- **Phase 0: APPROVED 2026-05-17.** `phase-0-probes.md`. Self-built
  reproducible C3 oracle (both engines C/CMake -- see OQ-3 lesson below).
  OQ-1 resolved, OQ-2 routed to Phase 1, OQ-3 fixed.
- **Phase 1: DRAFTED, awaiting review -- THIS IS THE IMMEDIATE TASK.**
  `phase-1-discipline.md` (committed `4122fac0`; the drafter ran it, its
  sub-agent verified clean, it halted awaiting operator review). Its drafter
  handback may be pasted by the operator into the fresh terminal; if not,
  review the MD cold -- it is on disk and committed.
- Phases 2-6: not started. Phase 2's drafter prompt is generated only AFTER
  Phase 1 is approved (its Inputs must mirror Phase 1's real Outputs --
  the schema shape + the chosen D19 smoke cvar).
- Commit chain (newest first): `c4c06bc3` OQ-3 fix + P0 approved; `1488e337`
  P0 self-built-oracle revision (drafter); `dd99ec99` C3 amendment;
  `30e6ad51` P0 review amendments; `4122fac0` P1 draft; `d40fe6f8` P0 draft;
  `258b28ed` slicing lock; `29d392c6` scaffold. (Unrelated parallel-arc
  commits from other terminals also land on `main`, e.g. `9f5cb145`
  enforce-L1 -- not this arc's concern.)

## Reads required (in order)

1. This handoff.
2. Arc `README.md` -- status, the locked "Slicing analysis" section, phase
   index, non-goals.
3. `decisions.md` -- C1-C5, P1-P5, D1-D19. Read the DATED AMENDMENTS in full:
   D2 clarification 2026-05-17 (description_origin already exists -- EXTEND
   not create), C3 amendment 2026-05-17 (self-built oracle), D19 (Phase 1
   smoke = one real simple KTX cvar).
4. `review-findings.md` -- risk ledger. F-C3a DISSOLVED, F-C3b STILL STANDS,
   F-C5a (Phase 1 owes the origin-tag + synthesized-anchor probes), F-D11a
   (audit HTML generator + artifact both absent; build from the D11/D15
   column family).
5. `phase-template.md` -- mandatory phase-MD shape incl the required
   "Recon facts (verified)" sub-block.
6. The spec `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- SOURCE OF TRUTH. C1-C5, D1-D18 + the dated C3 amendment.
7. `phase-0-probes.md` -- approved prior phase (context; does NOT gate
   Phase 1).
8. `phase-1-discipline.md` -- THE MD UNDER REVIEW. Read cold.
9. `phase-1-drafter-prompt.md` -- what the Phase 1 drafter was instructed
   (carries the corrected OQ-2 fact: `entities.description_origin` already
   holds `{help_json, source_inline, synthesized}`; Phase 1 EXTENDS to add
   `shipped_doc` + new fields, does NOT create from zero).
10. Memory: `feedback_verify_dispatched_terminal_claims`,
    `feedback_no_inference`, `feedback_inference_not_evidence`,
    `project_qw_dev_head_not_releases`, `feedback_scaffold_then_fanout_for_multi_phase_plans`,
    `feedback_model_effort_range`, `feedback_fresh_context_for_execution`,
    `project_arc_workflow_design`, `feedback_be_decisive`,
    `feedback_one_question_at_a_time`.
11. Invoke the `arc-planner` skill (Skill tool). Confirm locked state; do
    NOT relitigate.

## Critical rules (locked; do not relitigate)

- **THE OQ-3 LESSON (burned in this session -- highest priority).** The
  prior planner asserted "KTX is QuakeC via fteqcc -> qwprogs.dat" as fact
  from an inference (the KTX extractor uses tree-sitter, therefore QuakeC) --
  never `ls`-ed the repo -- and it propagated into 8 docs before a fresh
  Phase 0 terminal's recon + sub-agent caught it. Verified truth: KTX and
  MVDSV are BOTH C, BOTH CMake (KTX 111 .c / 0 .qc, `project(qwprogs C)` ->
  `qwprogs.so`; MVDSV -> `mvdsv` binary). Rule: **a dispatched terminal's
  factual claim is a hypothesis to verify against live source before
  approving/relaying/amending -- AND the planner's own assertions are held
  to the exact same bar.** Never assert a build/source/path/count/schema
  fact without grep/SQL/ls. Extractor toolchain != source language.
- C1-C5 + P1-P5 + D1-D19 are durable. Spec is source of truth; decisions.md
  distills it. Amendments land as dated blocks; never silently override,
  never silently comply with a planning direction that contradicts a lock --
  surface for explicit amendment.
- C3 self-built-oracle amendment (2026-05-17): Phase 0 self-builds both
  engines (C/CMake); `cmake` is a new Task-0 prereq (MISSING; apt-installable;
  documented fallback if not). F-C3a dissolved; F-C3b stands (detect, do not
  classify).
- D19: Phase 1's self-contained verification = the full describe-fill
  pipeline round-tripping ONE real simple KTX cvar (drafter's choice,
  recorded in the Phase 1 MD's Outputs). Phase 2/3 absorb it idempotently
  (C4) and count it once.
- D2 clarification / OQ-2: `entities.description_origin` ALREADY EXISTS with
  `{help_json, source_inline, synthesized}`; `description` and `name_fold`
  exist too. Phase 1 EXTENDS (add `shipped_doc` + anchor/re-review/retained-
  provenance/verdict-trail), does NOT create from zero. The C5
  origin-tag-vocabulary probe must permit the FULL 4-set incl `help_json`.
- The planner does NOT draft or edit phase MDs (fresh-terminal pattern). It
  reviews, verifies claims against live source, amends scaffold/decisions
  (dated), and generates the next per-phase drafter prompt. The planner is
  ALSO the reviewer here (the operator delegates by pasting drafter
  handbacks into the planner terminal).
- Operator: non-coder, conceptually fluent. Plain-English-first; be decisive
  (recommend, do not poll); one question at a time; momentum over ceremony;
  ASCII-only in committed docs; main-tree git, commit-on-main, no
  worktree/PR ceremony (Claude runs git silently).
- Draft order: Phase 1 review is the critical path. 2 -> 3 -> 4 sequential
  after; 5 after 1-4; 6 deferrable tail (does NOT gate arc completion).
  Phase 0 approved but does not gate Phase 1/2.

## First three actions

1. Do the reads in order (end by invoking the `arc-planner` skill; confirm
   the locked state without relitigating).
2. Review `phase-1-discipline.md` cold. Treat the drafter's handback and
   every load-bearing claim in the MD as a HYPOTHESIS -- verify against live
   source before any verdict (the OQ-3 discipline):
   - schema: the new fields land as an append-only `db/migrations/<NNN>.sql`
     + `SCHEMA.md` (P1); `description_origin` is EXTENDED not created;
     verify the live column set and existing vocabulary by SQL/`\d entities`.
   - the C5 probes Phase 1 owes (origin-tag-vocabulary incl `help_json`;
     synthesized-needs-anchor) are present and land in this phase.
   - the D6 synthesis skill + D7 two-tier gate + D11/D15 audit serializer
     are built here; verify the D6-skill precedent paths exist; the D7
     synthesis + review dials are Opus 4.7 MAX (spec-locked, not lowerable).
   - the D19 smoke cvar named in the MD is real, simple, single-reg-site,
     source-legible (verify it exists in live KTX source).
   - no fteqcc/QuakeC regression (KTX is C/CMake); no boundary creep
     (no public-projection/MCP work -- that is Phase 5/F-D13a; no wiki
     plumbing; no reachability classification).
3. Produce the phase-boundary verdict: if sound -> set README Phase 1 status
   to `approved`, then generate `phase-2-drafter-prompt.md` against Phase 1's
   REAL Outputs (mirror its schema shape + the chosen D19 cvar). If revisions
   needed -> write crisp paste-back feedback for the operator to return to
   the Phase 1 drafter terminal (same-terminal revision; fresh terminal only
   if context polluted). Surface any genuine decision to the operator with a
   decisive recommendation, one question at a time. Commit scaffold/decisions
   changes (dated); push at the natural checkpoint.

## When in doubt

Spec wins. Verify before asserting -- the OQ-3 incident is why. A lock
conflict surfaces as an explicit dated amendment, never a silent
override/comply. Genuine decisions route to the operator with a recommendation
(decisive, one question). The arc is complete + useful at end of Phase 5;
Phase 6 is the deferrable tail. Do not draft/edit phase MDs as the planner.
