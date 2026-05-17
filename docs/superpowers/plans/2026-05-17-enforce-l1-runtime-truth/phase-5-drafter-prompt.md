=============================================================================
ORCHESTRATOR AUGMENTATION -- session 5, 2026-05-17 (READ FIRST; mandatory)
This block is prepended by the arc-orchestrator. It carries the Phase-4
cross-phase learnings that did NOT exist when the canonical prompt below was
pre-generated at planning Step 4. The canonical prompt is unchanged below and
still authoritative for shape; this block OVERRIDES it on any conflict.
=============================================================================

Phases 1-4 are ALL APPROVED. Phase 5 is the LAST draft. Apply these
Phase-4-shipped facts -- they are the contract you CONSUME, not rebuild:

1. route_by_level IS SHIPPED + TESTED (Phase 4, `extractor_lib/_acceptance.py`).
   Phase 5 CALLS `route_by_level(dump_confirmation)` to generate the
   level-3-only delete-list and scope the level-2 assistant surface. Phase 5
   does NOT re-implement level routing, does NOT re-run the dump cross-check,
   does NOT re-decide genuine-dead. The dump cross-check ALREADY HAPPENED in
   Phase 4 (the dump is D19's overriding answer key; Phase 4 consulted it and
   stamped). A Phase-5 re-derivation of the level is the SAME X2/R5
   composition violation the whole arc forbids (Phase 4 consuming Phase-1/2
   probes is the worked precedent) -- if the draft does this, it is a
   deviation: surface it, do not let it pass.

2. The dump_confirmation STAMP is already written by Phase 4's loader:
   `dump-confirmed` (level-3) for EXACTLY the dump-confirmed pool/HUD rows;
   every other populated row stays Phase-3's `high-confidence-generalized`
   (level-2). Phase 5 FILTERS on this stamp (via route_by_level). It is read,
   never recomputed.

3. F7 (review-findings) EXISTS and is RESOLVED. The runtime dump
   self-certifies its commit via the embedded `<build>~<sha>` (dump line
   3347 `ezQuake 3.7.0-dev 8084~3f9e724fa`); prerequisites item-4 provenance
   is CLOSED (triple corroboration). Phase 4 owns/owned the version-pin proxy
   + the detection-README correction -- Phase 5 does NOT touch them. The
   level-3 rows in your regenerated artifact are the Phase-4 loader's stamp,
   NOT a Phase-5 dump re-derivation. The live artifact's existing "How these
   were found" prose ("commit verified == source HEAD, zero version skew")
   already reflects the embedded-SHA truth -- preserve that shape.

4. build-excluded is PERMANENTLY level-2 -- NEVER in the delete-list at ANY
   level (D20 + Phase-4 OQ-3, operator-ratified 2026-05-17). A single-build
   runtime dump cannot carry a cross-build "reachable in some other variant"
   verdict, so build-excluded (incl. D5 address-taken residue) can never
   reach the autonomous list. The delete-list is ONLY the level-3
   dump-confirmed "unreachable everywhere compiled" core + the
   commented-register subclass. It lives ONLY in the always-on L1 signal.

5. D21 NOTHING WITHHELD (reinforced under the Phase-4 lens): level-2
   recovered commands ARE emitted as first-class entities. The level gates
   AUTONOMOUS SHIP only, never first-class EXISTENCE. Do not gate the entity
   on dump-confirmation.

6. R4 BYTE-SHAPE REFERENCE CARRIES A KNOWN-STALE NUMBER. The live
   `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`
   "How these were found" section says "97 cvars / 74 commands". The 97 is
   the PRE-mini-arc figure; F2-authoritative is 74 commands / 92 cvars /
   ~129 reverse (post `8093e42f`, X7). R4 = regenerate the SHAPE (sections,
   per-entry feeder tagging, the Class-1/2/3 + Attribution layout) byte-
   consistent -- it is NOT a license to reproduce the stale 97. The
   regenerated artifact's pool figure MUST be the F2-authoritative number,
   re-verified vs the live DB at draft time (X8/W2). Match shape; correct
   the stale count. State this explicitly in "Recon facts (verified)".

7. ARCHETYPE FLOOR -- Phase 5 is a MIXED archetype. The signal-population
   half is loader-port/backfill (automated floor). The delete-list regen
   ships to nano/slime UNSEEN (the strict-bar autonomous consumer --
   `reference_rigor_bar_follows_consumer`); it is a published-artifact whose
   floor is OPERATOR-RUN. Mixed phase -> the boundary takes the HIGHER floor.
   The Phase-5 Verification section MUST include the operator eyeballing the
   regenerated `ezquake-runtime-dead-entities.md` before it is trusted; the
   automated byte-shape-diff probe stacks ON TOP, it does NOT replace the
   operator review. A purely-automated Phase-5 verification is a finding --
   draft it with the operator-run review as the floor.

The arc COMPLETES at Phase 5 (both North-Star directions met for ezQuake).
The ezQuake help-JSON doc-gap arc and the FTE/QWCL/MVDSV ship are SEPARATE
sequenced follow-ons -- do NOT start them. Halt-and-handback unchanged: you
halt, the operator + orchestrator gate, no auto-proceed.

=============================================================================
END ORCHESTRATOR AUGMENTATION -- canonical pre-generated prompt follows
=============================================================================

You are drafting Phase 5 of the arc:
  2026-05-17-enforce-l1-runtime-truth
  ("enforce L1 runtime-truth"; ghost elimination + hidden-command recovery)

Phase 5 = APPLICATION OUTPUTS (the final phase; the arc is complete + useful
at its boundary).

This is a STRUCTURED PLANNING task. Your output is ONE markdown file:
  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-5-application-outputs.md
You do NOT execute anything. Drafting is paper-only.

SELF-CHECK -- WRONG arc if you see "describe-fill / probe-0 N/M" (ktx-mvdsv)
or "RRF / pgvector" (qw-oracle-arc1). HALT and tell the operator. This arc's
tells: D1-D22 + X1-X10, two Track-A outputs, delete-list regenerating
ezquake-runtime-dead-entities.md, first-class recovered HUD commands.

## Working directory

```
Repo root: /home/paradoks/projects/quakeworld
Scaffold:  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/
```

## Required reading (numbered; read ALL before drafting)

```
1. .../decisions.md  (IN FULL; Phase 5 is governed by D1, D13, D16, D20,
   D21 and X1-X10. D20 = Track-A TWO outputs (always-on per-version L1
   signal over the 74/92 pool + the narrow level-3-only feeder-tagged
   delete-list; build-excluded NEVER in the delete-list). D21 = Track-B
   recovered commands first-class, element-linked, level-stamped, NOTHING
   withheld.)
2. .../review-findings.md  (Phase 5 owns role "APP": R4 the delete-list
   regenerates the in-repo artifact byte-shape.)
3. .../phase-template.md  (follow exactly; verification sub-agent brief at
   the bottom.)
4. .../prerequisites.md  (items 2-4 underlie Phase 5; the dump-confirmed
   level-3 stamping comes from Phase 4.)
5. docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md
   (D20-D21 WHY.)
6. LIVE source recon (verify, do not copy from spec):
   - apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md  (READ
     IT -- the delete-list REGENERATES this exact artifact shape: its
     sections, the existing sb_qtvlist_url / gl_outline_scale_world / cmdline
     ghost layout, the feeder tagging per entry. Match it byte-shape -- R4.)
   - the APPROVED Phase 3 MD (the two provenance fields + element link the
     signal populates) and the APPROVED Phase 4 MD (the D13 level stamping
     + the level-3 routing the delete-list reads).
   - the loader path that writes the L1 signal over the banked pool
     (74 cmd / 92 cvar -- F2; re-run the sanity gate, X8).
```

## What Phase 5 delivers (from the locked phase index)

Track A two outputs (D20): (1) the always-on per-version L1 signal populated
over the WHOLE banked pool (74 commands + 92 cvars at HEAD `3f9e724f`) --
every member gets its Track-A provenance (D15 conclusion + feeder-tagged
per-variant evidence + D13 level), sparse, per-version; (2) the narrow
autonomous delete-list = ONLY the level-3 dump-confirmed "unreachable
everywhere compiled" core + the commented-register subclass, PR-ready to
nano/slime as a REGENERATION of `apps/qw-oracle/docs/upstream-prs/
ezquake-runtime-dead-entities.md` (same artifact shape, each entry
feeder-tagged; build-excluded incl. D5 residue lives ONLY in the signal,
NEVER in the delete-list). Track B (D21): each recovered command -- bare
`<name>`, `+hud_<name>`, `-hud_<name>` -- a first-class L1 `command` entity,
distinguished only by its Track-B provenance (recovery origin + D16 element
link), emitted at every version the passenger ran, level-3 where the pinned
dump confirms, level-2 elsewhere, NOTHING withheld (D8's "dump-confirmed
only" is correctly scoped to the level-3 autonomous tier, not a gate on
level-2 existence).

Runnable state at the boundary: the L1 signal is populated over the full
banked pool with correct provenance + levels; the delete-list regenerates
byte-shape-consistent with the in-repo artifact and contains ONLY level-3
feeder-tagged entries; the recovered commands are first-class entities at
level-2/3; F1 quality-grid GREEN. Both directions of the North Star are met
for ezQuake -- the arc is complete.

## Drafting rules (arc-specific; full list in handoff-prompt.md)

```
- Follow phase-template.md exactly incl. "Recon facts (verified)". ASCII
  only (X10).
- R4: regenerate ezquake-runtime-dead-entities.md byte-shape. READ the live
  in-repo file; match its sections/layout/feeder tagging. Mechanism-
  generated, not hand-written. Build-excluded (incl. D5 address-taken
  residue) NEVER appears in it (D20). Each entry feeder-tagged (D7.1/D15) so
  a reviewer sees WHY it is dead.
- D21 NOTHING withheld: level-2 recovered commands ARE emitted as first-
  class entities (level-2 is the defined assistant-usable state). Do NOT
  gate first-class existence on dump-confirmation -- only autonomous SHIP is
  level-3-gated.
- D20 two consumers: the always-on signal spans the full 74/92 pool every
  member; the delete-list is the narrow level-3-only subset. Do not conflate
  them; no undifferentiated "these are dead" list.
- X3/X9: emission must not corrupt existing entities; recovery is re-run the
  corrected extract+load, never UPDATE rows.
- Self-contained verification (X2): byte-shape regen vs the in-repo
  artifact + signal populated over the full banked pool + first-class
  entities present at level-2/3 + F1 GREEN. All inputs exist (Phases 1-4
  approved). This is the terminal phase -- nothing depends on it.
- Execution-mode per task; the delete-list generator + signal-population
  loader synthesis Sonnet medium; near-zero inline (a generator is NOT
  inline-shaped; the regenerated .md is an OUTPUT of code, not an inline
  doc edit).
- Stay in scope: this arc ends here. The help-JSON doc-gap arc is the NEXT
  (separate) arc -- do NOT start it. No FTE/QWCL/MVDSV. No detection re-run.
```

## Step-by-step

```
1. Read all required files (1-6), incl. the live dead-entities artifact and
   the APPROVED Phase 3 + 4 MDs.
2. Recon live: the artifact byte-shape; the signal loader path; re-run the
   sanity gate; the level-3 routing from Phase 4. Record in "Recon facts".
3. Draft phase-5-application-outputs.md per phase-template.md.
4. Dispatch the verification sub-agent (Explore) with the bottom brief.
5. Apply findings; decision beats a contradicting finding; surface a
   wrong-looking decision.
6. Halt with the structured status report. This is the LAST phase -- note
   arc completion (both North-Star directions met for ezQuake) and that the
   ezQuake help-JSON doc-gap arc is the sequenced next arc, not this one.
```

## Halt-and-handback

Report STATUS; MD path; sub-agent CRITICAL/SUBSTANTIVE/ADVISORY + resolution;
any decisions.md deviation; open questions. Then STOP. Operator reviews + runs
the YES/NO verification, flips to approved (the arc plan is then fully drafted
-> arc-orchestrator drives execution) or returns this MD here;
fundamentally-wrong -> NEW fresh terminal for redraft.
