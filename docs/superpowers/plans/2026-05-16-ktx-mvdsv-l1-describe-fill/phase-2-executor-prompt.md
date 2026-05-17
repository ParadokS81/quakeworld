# EXECUTE Phase 2 -- KTX mechanical extract (2026-05-16 KTX/MVDSV L1 describe-fill)

You are the **arc-executor** for **Phase 2** of the
**2026-05-16 KTX / MVDSV Layer-1 describe-fill** arc. APPROVED +
PLAN-COMPLETE. You EXECUTE it -- build the D9 KTX shipped-config sibling
extractor + loader adapter that fills `shipped_doc` candidate descriptions
onto existing KTX cvar rows. You are NOT drafting; the phase MD is the
contract.

Invoke the `arc-executor` skill first. Working dir:
`/home/paradoks/projects/quakeworld`.

## Scope check -- right arc/phase only if these hold

Tell-tale: the D9 KTX shipped-config sibling extractor (in-repo + nQuake
`ktx.cfg` / `port_template.cfg`), one record per (cvar, source-file)
NEVER merged, `shipped_doc` origin, fills onto existing KTX cvar rows
(creates ZERO entities), M=260 the C1 gate. STOP if your goal looks like a
sibling arc (embedding pipeline, game-mode L3 prose, libclang reachability,
dusty-* fork, name-fold mini-arc, doc-landscape re-author) or like KTX
*source synthesis* / *command* description (that is Phase 3, D5-D8 -- NOT
Phase 2). A sibling-arc misdirection means STOP.

## Required reading (all, before executing)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-2-ktx-mechanical-extract.md`
   -- THE contract. Goal, Recon facts, Tasks 1-3, Files-touched,
   phase-boundary, C4 recovery. Read cold + critically.
2. `.../decisions.md` -- D9 (+ its 2026-05-17 amendment: the honest
   `shipped_doc` target is ~109/260, M=260 the C1 gate), D2, D10, D11 (+
   its 2026-05-17 amendment: additive `structured_choices`), C1-C5, P1-P5.
   Read every DATED block in full.
3. `.../review-findings.md` -- your Phase 2 rows: **F-C2a (Grave --
   preserve per (cvar,source-file), NEVER merge in-repo vs nQuake drift)**,
   **F-C5a (Grave -- ship the provenance-entry + jsonb-not-string C5
   probes)**, **F-C1a (recon the POST-Phase-0 M live; pre-Phase-0 260 is
   gate-SHAPE not a frozen number)**, **F-D9a (NEW -- see augmentations)**.
4. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- SOURCE OF TRUTH. Read the `## Amendment precedence` clause near the
   top FIRST: a dated 2026-05-17 amendment GOVERNS the original C/D text;
   "spec wins" is never "original wins over amended". The D9 + D11
   amendments are mirrored in-spec.
5. `phase-template.md` -- mandatory phase shape + the verification
   sub-agent brief (item 8: canonical KTX is libclang/C; the D9
   shipped-config sibling is a NEW non-libclang text handler distinct from
   the registration handler -- NOT tree-sitter).
6. Live recon (verify, do not trust the MD's numbers blind):
   `apps/qw-oracle/SCHEMA.md` + migration 014; the existing
   `quality-grid.ts` (`F1.jsonb_columns_not_strings` to extend); the
   Phase 1 spine + loader-adapter pattern at HEAD.

## Orchestrator augmentations (carry these -- verified by the orchestrator)

- **Pre-dispatch holistic gate CLEAN; Phases 0 + 1 SHIPPED + boundary-
  verified by the orchestrator against live source** (not relayed). The
  Phase-1 spine + the F-D4a owned-row guard are LIVE and independently
  re-proven: a real `re-derive --project ktx --type cvar` (260 entities
  touched) left the owned `k_short_gib` row byte-identical. Do NOT rebuild
  the spine; do NOT re-run the holistic gate (CLEAN, captured).
- **F-D9a (NEW, routed from Phase 1 -- substantive).** The shipped KTX
  configs (`ktx.cfg` in-repo + nQuake, `port_template.cfg`) use **CRLF**
  line endings. Your D9 extractor + loader MUST strip the trailing `\r`
  from every harvested config line BEFORE regex match and BEFORE persist.
  Phase 1's smoke proved this on one cvar; at your volume, skipping it puts
  a trailing `\r` in every harvested value + every `raw_comment` in
  `description_provenance` -- a silent defect the jsonb/provenance C5
  probes do NOT catch. This is a recon-note requirement; WHY-comment it.
- **You write the FIRST `shipped_doc` owned rows at volume -- the F-D4a
  guard's `shipped_doc` leg is now load-bearing for the first time.** The
  guard excludes `description_origin IN ('synthesized','shipped_doc')` with
  NO anchor conjunct (your `shipped_doc` rows carry NO anchor -- correct;
  anchor is stamped only at Phase 3 synthesis). At your phase boundary,
  prove (verbatim psql): a `re-derive --project ktx --type cvar` after
  your load leaves every `shipped_doc` row you wrote byte-identical AND
  does not regress Phase 1's `k_short_gib` (still `synthesized`, still its
  byte-identical owned record). This is the non-negotiable gate; the
  orchestrator re-runs it itself.
- **Coverage (F-C1a / D9 amendment / Correction 1).** Recon the
  POST-Phase-0 KTX-cvar M live from `phase-0-results.md` (it re-baselined
  to **260** this walk -- but recon it, do not hardcode; pre-Phase-0 260
  is the gate-SHAPE, not a frozen contract number). The honest D9
  `shipped_doc` write target is ~109/260; **M=260 is the C1 gate**, the
  ~151 residue tracked to Phase 3 / the C1 outreach track, NEVER
  importance-cut. ~109 is a verified order-of-magnitude, not a hit-target.
- **Idempotency vs the Phase-1 D19 row.** `ktx:cvar:k_short_gib` is filled
  (`synthesized`, 2-entry provenance). Phase 2 MUST treat it idempotently:
  do NOT clobber it, do NOT regress it to `shipped_doc`. Re-run your
  extract+load twice -> byte-identical (D9 idempotent re-extract; C4).
- **Phase 2 is liveness-agnostic.** It does NOT consume Phase 0's C3 pool.
  F-C3c ("do not dead-stamp KTX commands") is a **Phase 3** concern, not
  yours -- Phase 2 is mechanical cvar extract, zero quality verdict (the
  D9 seam: harvest + STOP; every candidate AND every comment-less cvar
  flows to the D5-D8 evaluation in Phase 3).
- **Context budget.** Phase 2 is subagent-heavy (Task 1 new parser
  Sonnet-4.7-MAX; Task 2 loader Opus-4.7-medium; Task 3 probes). If you
  enter the ~350k smell zone, wrap cleanly and write a standard
  fresh-terminal resume handoff at
  `docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-phase2-executor-resume.md`.
  Do NOT push the highest-judgment work past the smell zone.

## Critical rules (locked; do not relitigate)

- **Verification discipline -- highest priority.** Re-derive every
  load-bearing number/path/shape via psql/grep/ls. A prior session's
  "verified"/"approved" is a hypothesis.
- **F-C2a (Grave).** One record per (cvar, source-file). NEVER merge
  in-repo vs nQuake drift at extract time -- preserve every contributing
  file's value + raw comment in `description_provenance` (D9/D11/C2/D10).
  The extractor does NOT decide which file "wins".
- **D9 seam.** Harvest structured facts + candidate text + provenance and
  STOP. ZERO quality verdict; no parser "comment looks fine" affirmation.
  Structured choices kept structured (`{value,label}` enum + bitmask as
  DATA, never prose-flattened) via the additive `structured_choices`
  element (D11 amendment).
- **F-C5a (Grave).** Ship the provenance-entry-exists + jsonb-not-string
  C5 probes (extend `F1.jsonb_columns_not_strings`) in THIS phase; GREEN
  at the boundary. P2: JSONB columns receive JS values, never
  pre-stringified.
- The dated amendment GOVERNS its original C/D text. Never silently
  override a lock; never silently comply against one -- surface a dated
  amendment to the operator (the F-C5b / F-C3c / F-D9a handling pattern).
- ASCII only in committed docs/code. Bun runtime; append-only migrations +
  `SCHEMA.md` same task (P1). Main-tree git, commit-on-main, push at
  checkpoints, no worktree/PR ceremony (you run git silently; the operator
  does not touch git). Commit ONLY this arc's files (the pre-existing
  parallel-arc drift is not ours).

## Halt-and-report contract

Execute each task per its declared Execution mode (subagent at the named
model+effort, or inline -- do not silently inline a subagent task). Run
the phase-boundary verification YOURSELF with verbatim probe outputs
(coverage vs the POST-Phase-0 M; the two C5 probes; the F-D4a
`shipped_doc` re-derive-safe + k_short_gib-not-regressed proof; idempotent
re-run byte-identical). A "PASS" without the probe output is not
acceptable. Halt with one status: **DONE** / **DONE_WITH_CONCERNS** /
**NEEDS_CONTEXT** / **BLOCKED**. Report: artifacts (paths), the coverage
table vs M, the C5 probe outputs, the F-D4a `shipped_doc` proof verbatim,
any new findings (surface for orchestrator ledger curation -- do not
self-number unless trivial), open questions, and a one-line
recommendation. Do NOT proceed to Phase 3. Do NOT re-run the holistic
gate.
