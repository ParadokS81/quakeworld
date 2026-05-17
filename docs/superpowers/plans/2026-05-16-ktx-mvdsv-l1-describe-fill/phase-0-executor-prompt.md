# EXECUTE Phase 0 -- Probes + the free win (2026-05-16 KTX/MVDSV L1 describe-fill)

You are the **arc-executor** for **Phase 0** of the
**2026-05-16 KTX / MVDSV Layer-1 describe-fill** arc. This phase is
APPROVED and PLAN-COMPLETE. You EXECUTE it -- run the probes, the free
win, the self-built oracle. You are NOT drafting; the phase MD already
exists and is the contract.

Invoke the `arc-executor` skill as your first action. Working directory:
`/home/paradoks/projects/quakeworld`.

## Scope check -- you are in the RIGHT arc only if these hold

This arc fills provenance-stamped descriptions onto KTX/MVDSV configurable
entities (cvars/commands/cmdline/info_keys) that already exist in L1.
Tell-tale this is the right arc: probe-0 N/M denominators, the C3
runtime-dead suspect pool, `load-commands.ts` free win, the self-built
reproducible dev-head oracle, `cmake` build prereq. STOP and tell the
operator if your phase goal looks like: a Postgres/embedding pipeline
(qw-oracle Arc 1), game-mode concept-note prose (2026-05-09 L3 arc),
libclang call-graph reachability classification (parked arc), dusty-*
fork extraction (parked arc), or re-authoring probe/gap-findings
(2026-05-15 doc-landscape investigation -- you CONSUME it). A sibling-arc
misdirection means STOP.

## Required reading (all, before executing)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-probes.md`
   -- THE phase contract. Goal, the 3 tasks, recon facts, Files-touched,
   phase-boundary YES/NO, C4 recovery. Read it cold and critically.
2. `.../decisions.md` -- C1-C5, P1-P5, D1-D19. Read every DATED block in
   full (C3 amendment self-built reproducible oracle; D12). LOCKED.
3. `.../review-findings.md` -- your Phase 0 rows: F-C3a (DISSOLVED
   2026-05-17, trail only), F-D12a (substantive), F-D12b
   (substantive-positive), F-C3b (boundary -- STILL STANDS), and F-C1a
   (Phase 0 PRODUCES the re-baseline; see Critical rules).
4. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- SOURCE OF TRUTH. Read the new `## Amendment precedence` clause near
   the top FIRST: where the spec's original C/D text predates a dated
   2026-05-17 amendment, the amendment GOVERNS; "spec wins" is never
   "original wins over amended". The C3 amendment is mirrored in-spec.
5. The grounding evidence (consume, do not re-derive):
   `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/`
   gap-findings + coverage.ndjson + probe-*.md.

## Orchestrator augmentations (carry these)

- **The pre-dispatch holistic gate has run and is CLEAN.** Verdict +
  3-finding history + sound-list captured in
  `docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-orchestrator-resume.md`.
  Corrections 1+2+3 landed + committed (`d0bd2068`, `a39fd609`). Do NOT
  re-run the gate; do NOT re-derive its verdict.
- **`cmake` is MISSING (build prereq for Task 2).** The operator has been
  asked to `apt install cmake` before this terminal opens. At Task 2's
  build-prereq recon gate: if `cmake` is present, build mvdsv + ktx
  Linux-native and produce the full self-built reproducible oracle (the
  spec-intended C3 amendment path -- strengthens D4). If `cmake` is still
  absent and cannot be obtained in-loop, the documented Task-2 fallback
  fires (fetch-forward-source + the retained 2026-04-27 production dump
  under the original date-proximate caveat) -- the arc is NEVER blocked.
  Record which path ran in `phase-0-results.md` ("fallback fired: yes/no").
- **Phase 0 does NOT gate the KTX side** (Phase 2 KTX mechanical extract
  is liveness-agnostic and runs independent of Phase 0). Phase 0 IS a
  hard prerequisite for Phase 3/4 synthesis (C3) and the Phase-4 sizing
  input (F-D12a). Phase 1 runs in PARALLEL with you (independent).
- **Watch item (F-D4a sequencing).** Phase 1 builds the owned-row guard
  at the shared `derive-entity-description.ts` tail as its FIRST job.
  Your Task 2 forward re-extract runs that derive tail. In the normal
  sequence Phase 0 has ZERO owned rows to threaten (no describe-fill has
  written yet), so this is safe -- but do NOT let a Task-2 re-extract
  land after any owned describe-fill write while the Phase-1 guard is not
  yet live. If you ever observe owned rows (`description_origin IN
  ('synthesized','shipped_doc')`) present before your re-extract, HALT
  and report -- that is the F-D4a hazard.

## Critical rules (locked; do not relitigate)

- **Verification discipline -- highest priority, proven 6x.** Re-derive
  every load-bearing number/path/shape via psql/grep/ls against live
  source before asserting it. The spec's numbers are not trusted blind
  (the recon facts in the phase MD were verified 2026-05-17; re-confirm
  at execution -- a prior "verified" is a hypothesis, not a guarantee).
- **F-C1a -- Phase 0 PRODUCES the re-baseline (load-bearing).** Task 2's
  forward re-extract re-baselines the probe-0 N/M denominators. Record
  old-vs-new per bucket explicitly in `phase-0-results.md`. Phases
  1/2/3/4/5 recon the POST-Phase-0 denominators from that file -- the
  pre-Phase-0 numbers (KTX cvar 260 / command 358 / info_key 7; MVDSV
  cvar 183 / command 108 / cmdline 11 / info_key 45) are the gate-SHAPE,
  NOT frozen contract numbers. If you do not record old-vs-new, every
  downstream phase's coverage gate is unsound.
- **F-D12a -- Task 3 produces a SHAPE characterization, NEVER an NN/NN
  ratio.** No `124/183`-style metric in any artifact. A bucket is a
  named list or a described shape, not a headline count.
- **F-D12b -- Task 1 is idempotent reload only.** The `load-commands.ts`
  fix is the verified one-line `entry.ast?.description` mapping. No
  re-extract; do NOT restructure the builder/adapter/extractor
  (over-scoping guard). Counts byte-identical where the `??` fallback
  does not fire.
- **F-C3b STILL STANDS (boundary).** Phase 0 only DETECTS the C3 suspect
  pool (presence-in-source vs absence-from-running-build). It does NOT
  classify genuine-dead vs build/`#ifdef`-excluded -- that is the parked
  libclang call-graph reachability arc. Do not classify.
- **C1 -- residue is tracked, never importance-cut.** "Rare
  dedicated-server knob, skip it" is a C1 violation -- surface as a
  deviation, never silently comply.
- ASCII only in committed docs/artifacts (no em-dash/en-dash, no emoji,
  no marketing voice). Bun runtime. Main-tree git, commit-on-main, push
  at checkpoints, no worktree/PR ceremony (you run git silently). The
  operator does not touch git.
- A lock that looks wrong gets a dated amendment surfaced to the
  operator -- never a silent override, never a silent comply.

## Halt-and-report contract

Execute every task per its declared Execution mode in the phase MD
(subagent at the named model+effort, or inline). Run the phase-boundary
verification YOURSELF and include the ACTUAL probe outputs (counts, query
results, fixture diffs) in your halt message -- a "PASS" claim without
the probe output is not acceptable. Halt at the phase boundary with one
status: **DONE** / **DONE_WITH_CONCERNS** / **NEEDS_CONTEXT** /
**BLOCKED**. Report: the artifacts produced (paths), the
`phase-0-results.md` old-vs-new re-baseline table, which Task-2 path ran
(full oracle vs fallback), the verification probe outputs verbatim, any
open questions for the operator, and a one-line recommendation. Do NOT
proceed to another phase. Do NOT re-run the holistic gate.
