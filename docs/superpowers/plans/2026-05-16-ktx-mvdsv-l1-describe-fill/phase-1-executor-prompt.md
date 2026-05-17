# EXECUTE Phase 1 -- The discipline, built once (2026-05-16 KTX/MVDSV L1 describe-fill)

You are the **arc-executor** for **Phase 1** of the
**2026-05-16 KTX / MVDSV Layer-1 describe-fill** arc. This phase is
APPROVED + carries a dated F-D4a scope-amendment. You EXECUTE it -- build
the engine-agnostic describe-fill spine once. You are NOT drafting; the
phase MD plus its top AMENDMENT block is the contract.

Invoke the `arc-executor` skill as your first action. Working directory:
`/home/paradoks/projects/quakeworld`.

## Scope check -- you are in the RIGHT arc only if these hold

Tell-tale this is the right arc/phase: the D2/D11 provenance+staleness
schema migration, the D6 guardrailed synthesis skill, the D7 two-tier
Opus-MAX review gate, the D11/D15 audit-review HTML serializer, the C5 F1
probes, the **owned-row guard at the shared
`derive-entity-description.ts` tail (F-D4a)**, and the D19 one-cvar smoke
on `k_short_gib`. STOP if your goal looks like a sibling arc (qw-oracle
Arc 1 embedding pipeline, game-mode L3 prose, libclang reachability
classification, dusty-* fork extraction, name-fold case-fidelity mini-arc,
or re-authoring the doc-landscape probes). A sibling-arc misdirection
(wrong finding numbers / handler names) means STOP.

## Required reading (all, before executing)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-1-discipline.md`
   -- THE phase contract. **Read its top blocks FIRST**, in this order:
   the drafter-checklist, the RESOLVED recon note, and especially the
   **AMENDMENT 2026-05-17 (F-D4a) block** -- it adds the owned-row-guard
   task and declares the phase body stale-pending its integration. Then
   the Goal, Tasks 1-6, Recon facts, Files-touched, phase-boundary.
2. `.../decisions.md` -- C1-C5, P1-P5, D1-D19. Read every DATED block in
   full; the **D4 amendment 2026-05-17 (F-D4a) is THE most load-bearing**
   and is the authority for the guard. Also D2 clarification, D11
   amendment, D7 clarification.
3. `.../review-findings.md` -- your Phase 1 rows: **F-D4a (Grave -- the
   owned-row guard; build it FIRST)**, F-C5a (Grave -- the 4 new-shape
   probes), F-D11a (Substantive -- no prior audit-HTML generator exists;
   build a NEW emitter, do not hunt a phantom).
4. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- SOURCE OF TRUTH. **Read the new `## Amendment precedence` clause
   near the top FIRST.** The spec's original D2/D4/D7/D9/D11 text now
   carries mirrored dated 2026-05-17 amendment blocks; where original
   text predates a dated amendment, **the amendment GOVERNS**. "Spec
   wins" resolves spec-vs-distillation only -- it is NEVER "original wins
   over amended". In particular: spec D4's pre-amendment text has no
   owned-row guard; the mirrored D4 amendment block (and decisions.md D4
   amendment + the Phase-1 MD AMENDMENT block) govern. Do not revert the
   guard by reading un-amended D4.
5. `phase-template.md` -- the mandatory phase shape + the verification
   sub-agent brief (item 8: canonical KTX AND MVDSV are BOTH libclang/C;
   the D9 siblings are NEW non-libclang text handlers, NOT tree-sitter --
   tree-sitter is the out-of-scope dusty-ktx fork only).
6. `apps/qw-oracle/SCHEMA.md` + `db/migrations/` + the existing
   `scripts/load-knowledge/quality-grid.ts` -- live recon (verify, do
   not trust the MD's numbers blind).

## Orchestrator augmentations (carry these)

- **The pre-dispatch holistic gate has run and is CLEAN.** Verdict +
  3-finding history + sound-list captured in
  `docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-orchestrator-resume.md`.
  Corrections 1+2+3 landed + committed (`d0bd2068`, `a39fd609`). Do NOT
  re-run the gate.
- **F-D4a IS YOUR FIRST JOB -- non-negotiable, execution-critical.**
  Before ANY owned describe-fill write anywhere in the arc, the owned-row
  guard MUST be live in
  `apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts`.
  In EACH of the four arc-bucket derivers (cvar / command /
  cmdline_param / info_key) add a WHERE-clause exclusion: a row with
  `description_origin IN ('synthesized','shipped_doc')` is NOT
  recomputed -- owned-track membership ALONE, **NO
  `description_anchor_version` conjunct** (a staged `shipped_doc` row
  carries no anchor until Phase 3 and MUST still be protected).
  ezquake/fte/qwcl + affirmed-`source_inline` rows are unaffected (not
  owned-track; source rows re-derive idempotently and a newly changed
  source comment is D4 trigger (e)). Comment WHY (P5). Execution mode:
  `subagent (Opus 4.7 medium)` -- it touches the shared derive tail and
  must not regress ezquake/fte/qwcl; NOT inline, NOT Opus MAX. Authority:
  decisions.md D4 amendment 2026-05-17 + the Phase-1 MD AMENDMENT block.
  The Phase-1 body is stale-pending this task -- execute from the
  amendment, not the un-amended body text.
- **The Phase-1 boundary is GATED on the guard being live + verified.**
  The D19 `k_short_gib` smoke (Task 6) must additionally assert: a
  simulated re-derive does NOT clobber the one filled cvar, and a re-run
  twice produces a byte-identical owned record. The phase does NOT pass
  the boundary without the guard live AND that assertion green. Verify
  it yourself with psql, not by trusting the smoke's self-report.
- **Opus-MAX dials are spec-locked, not lowerable.** Task 3 (D6
  synthesis skill) and Task 4 (D7 two-tier review gate) are Opus 4.7
  MAX. Record the dial; do not lower it (D7 + D7 clarification).
- **F-D11a -- no prior audit-HTML generator exists** anywhere in the
  tree (re-verified). Task 5 builds a NEW emitter against the D11/D15
  column family (`name / source_file / verdict / confidence / reasoning
  / proposed_desc`, sortable+filterable, inline before/after/why per
  row). Do not search for a phantom file.
- **Phase 0 runs in PARALLEL** (independent). Your D19 smoke is
  self-contained on one real KTX cvar with ZERO Phase 0/2/3 dependency.
  Watch item: Phase 0's Task-2 forward re-extract runs the same derive
  tail -- once your guard is live it protects owned rows on every walk;
  that is exactly why the guard is your FIRST job.
- **Context budget -- you will likely need a mid-phase fresh-terminal
  handoff.** Phase 1 is subagent-heavy mandatory (Tasks 3/4/5 are
  Opus/Sonnet MAX subagents). If your context enters the ~350k smell
  zone, wrap the current task cleanly and write a standard fresh-terminal
  resume handoff at
  `docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-phase1-executor-resume.md`
  (Where things are / Reads required / Critical rules / First actions /
  When in doubt). Do NOT push the highest-judgment work past the smell
  zone.

## Critical rules (locked; do not relitigate)

- **Verification discipline -- highest priority, proven 6x.** Re-derive
  every load-bearing number/path/shape (the `k_short_gib` baseline, the
  schema columns, the F1 floor counts) via psql/grep/ls against live
  source. A prior session's "verified" / "approved" is a hypothesis. The
  gate caught F-D4a (Grave) at the final phase -- per-phase confidence
  is not a guarantee.
- The dated amendment GOVERNS its original C/D text (the spec now says
  this explicitly -- the Amendment-precedence clause). Never silently
  override a lock; never silently comply with a direction that
  contradicts one -- surface a dated amendment to the operator.
- C5 / F-C5a: the two new-shape F1 probes (Task 2) land in THIS phase
  and must be GREEN at the boundary -- not deferred.
- Origin tag vocabulary is EXACTLY `source_inline` / `synthesized` /
  `shipped_doc` (plus pre-existing ezQuake `help_json`). No other tag,
  no tag-per-file. Migration is append-only `db/migrations/<NNN>.sql` +
  `SCHEMA.md` in the same task (P1). JSONB columns receive JS values,
  never pre-stringified (P2). `source_ref` reuses the existing citation
  mechanism (P3).
- ASCII only in committed docs/code. Main-tree git, commit-on-main, push
  at checkpoints, no worktree/PR ceremony (you run git silently; the
  operator does not touch git).

## Halt-and-report contract

Execute each task per its declared Execution mode (subagent at the named
model+effort, or inline -- do not silently inline a subagent task).
F-D4a guard FIRST. Run the phase-boundary verification YOURSELF and
include the ACTUAL probe outputs (the D19 round-trip, the guard
re-derive-twice byte-identical check, the two C5 probe results, the
schema/migration confirmation) verbatim -- a "PASS" claim without the
probe output is not acceptable. Halt at the phase boundary with one
status: **DONE** / **DONE_WITH_CONCERNS** / **NEEDS_CONTEXT** /
**BLOCKED**. Report: artifacts produced (paths), the guard-live +
re-derive-safe proof, the D19 smoke output, the C5 probe results, any
open questions for the operator, and a one-line recommendation. Do NOT
proceed to Phase 2. Do NOT re-run the holistic gate.
