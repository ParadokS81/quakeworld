You are drafting Phase 3 of the arc:
  2026-05-17-enforce-l1-runtime-truth
  ("enforce L1 runtime-truth"; ghost elimination + hidden-command recovery)

Phase 3 = UNIFIED L1 FIDELITY SCHEMA + LOADER.

This is a STRUCTURED PLANNING task. Your output is ONE markdown file:
  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-3-unified-schema-loader.md
You do NOT execute anything. Drafting is paper-only.

SELF-CHECK -- WRONG arc if you see "describe-fill / probe-0 N/M" (ktx-mvdsv)
or "schema-as-generator / 31-table inventory / pgvector" (qw-oracle-arc1).
HALT and tell the operator. This arc's tells: D1-D22 + X1-X10, two separate
provenance fields, three-slot spine, feeder-tagged, element-linked,
three-level coverage.

## Working directory

```
Repo root: /home/paradoks/projects/quakeworld
Scaffold:  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/
```

## Required reading (numbered; read ALL before drafting)

```
1. .../decisions.md  (IN FULL; Phase 3 is governed by D1, D12, D13, D14,
   D15, D16 and X1-X10. D12 = two PHYSICALLY SEPARATE nullable fields, NO
   discriminator. D14 = the shared three-slot spine. D15 = Track-A
   feeder-tagged per-variant evidence. D16 = Track-B element-link. D13 =
   three-level coverage, slot 3 is REPRESENTATION ONLY here.)
2. .../review-findings.md  (Phase 3 owns role "S": R2 D15/D12 field-shape
   decomposition, R3-store element-link storage, W2.)
3. .../phase-template.md  (follow exactly; verification sub-agent brief at
   the bottom.)
4. .../prerequisites.md  (item 3 -- the Postgres dev container -- is Phase
   3's precondition.)
5. docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md
   (D12-D16 WHY.)
6. LIVE source recon (verify, do not copy from spec):
   - apps/qw-oracle/SCHEMA.md  (the entities / *_versions shape; the
     existing provenance columns; where the two new fields fit).
   - apps/qw-oracle/db/migrations/  (the LATEST migration number; the
     append-only convention; the migration + SCHEMA.md-in-the-same-task
     discipline).
   - apps/qw-oracle/scripts/load-knowledge/  (the loader adapters --
     load-cvars.ts / load-commands.ts pattern; how a per-entity provenance
     field is stored; the F1 quality-grid quality-grid.ts).
   - the Phase 1 + Phase 2 phase MDs (APPROVED) -- their "Outputs to next
     phase" are Phase 3's real inputs (the reachable() verdict shape; the
     recovered-command + element-key shape).
```

## What Phase 3 delivers (from the locked phase index)

The unified L1 fidelity provenance: TWO physically separate,
independently-nullable fields (D12 -- one for Track A's verdict, one for
Track B's recovered-hidden origin; NO single column with a `kind`
discriminator), both conforming to the ONE shared three-slot spine (D14:
conclusion / evidence / dump-confirmation status). Track A's evidence slot is
FEEDER-TAGGED (D15: call-graph feeder -> per-variant breakdown over the 4
configs with the D5 three-valued state + the conservative-residue flag;
commented-register feeder -> a textual register-site cite). Track B's
provenance is element-LINKED (D16: each recovered command carries the
`HUD_Register` arg #1 element key). Slot 3 (dump-confirmation status) is the
D13 three-level state, REPRESENTATION ONLY here -- the actual runtime-dump
cross-check is Phase 4. An append-only migration + the matching SCHEMA.md
edit in the same task; the loader stores both fields; the F1 quality-grid
extends to the new shapes.

Runnable state at the boundary: migration applied + SCHEMA.md updated; the
real APPROVED Phase-1/2 output round-trips through the loader into the two
fields with the correct three-slot shape; F1 quality-grid GREEN incl. the
new shapes.

## Drafting rules (arc-specific; full list in handoff-prompt.md)

```
- Follow phase-template.md exactly incl. "Recon facts (verified)". ASCII
  only (X10).
- D12 STRUCTURAL no-blend: two separate nullable fields. NO discriminated
  container, NO shared `kind` column. A reader must never be able to
  mis-read a Track-B family as a Track-A verdict.
- D15 R2: decide exact variant identifiers (the 4 config names as stored),
  the conservative-residue flag encoding (D5 address-taken residue must be
  visible/auditable in the breakdown), and the evidence column-vs-JSONB
  decomposition. JSONB writes bind JS values directly / tx.json -- never a
  pre-stringified string (the postgres-js JSONB regression; extend
  F1.jsonb_columns_not_strings if a new JSONB shape is written).
- D16 R3-store: the element key is stored so the LLM is TOLD radar /
  +hud_radar / -hud_radar group to the `radar` element -- not inferred by
  string-prefix parsing.
- D13: slot 3 is representation only here; do NOT do the runtime-dump
  cross-check (that is Phase 4). Sparse, per-version, mechanism-derived.
- X3: a schema/loader change must not alter existing entity emission; ship
  the zero-diff check. X9: recovery is re-run the corrected extract+load,
  never UPDATE bad rows.
- Self-contained verification (X2): verify by real Phase-1/2 output
  round-tripping with the correct provenance shape + F1 GREEN. This DEPENDS
  on prior phases (allowed); it must NOT depend on Phase 4/5.
- Execution-mode per task; the two-field / three-slot schema DESIGN task is
  Opus MAX (X6); migration + loader synthesis Sonnet medium; near-zero
  inline (a migration/loader is NOT inline-shaped).
- Stay in scope: no cross-check (Phase 4), no delete-list / first-class
  emission (Phase 5), no FTE/QWCL/MVDSV.
```

## Step-by-step

```
1. Read all required files (1-6), incl. the APPROVED Phase 1 + 2 MDs.
2. Recon live: SCHEMA.md, the latest migration number, the loader pattern,
   F1; the real Phase-1/2 output shapes. Record in "Recon facts".
3. Draft phase-3-unified-schema-loader.md per phase-template.md.
4. Dispatch the verification sub-agent (Explore) with the bottom brief.
5. Apply findings; decision beats a contradicting finding; surface a
   wrong-looking decision.
6. Halt with the structured status report. Do NOT start Phase 4.
```

## Halt-and-handback

Report STATUS; MD path; sub-agent CRITICAL/SUBSTANTIVE/ADVISORY + resolution;
any decisions.md deviation; open questions. Then STOP. Operator reviews + runs
the YES/NO verification, flips to approved (opens the Phase 4 terminal) or
returns this MD here; fundamentally-wrong -> NEW fresh terminal for redraft.
