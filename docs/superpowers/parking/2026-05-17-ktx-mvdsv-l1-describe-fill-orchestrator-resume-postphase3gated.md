# KTX/MVDSV L1 describe-fill -- orchestrator RESUME (Phase 3 mid-loop, GATED on the family-lane D6 amendment)

**For:** a fresh terminal resuming the `arc-orchestrator` role. Created
2026-05-17 after a desync-recovery realignment (the operator was on
remote desktop and did not relay Phase-3 reports in real time; the
orchestrator re-verified live and re-aligned). SUPERSEDES
`2026-05-17-ktx-mvdsv-l1-describe-fill-orchestrator-resume-postphase2.md`
(that said "Phase 3 dispatched, not yet running" -- now stale; kept only
as git trail).

---

## THE HOLISTIC GATE IS CLEAN AND CONSUMED. DO NOT RE-RUN IT. DO NOT RE-READ THE 9,300-LINE PLAN.

Once-per-arc, consumed. Phases 0+1+2 SHIPPED + orchestrator-verified --
do not re-verify them.

## Where things are (verified live 2026-05-17 -- not relayed)

- **Phase 2: SHIPPED + boundary-verified** (`953fa0cd`); F-D11c + F-D9b
  ratified into the ledger; orchestrator-layer captures at `a091221d`.
- **Phase 3: IN PROGRESS, mid-volume-loop, GATED.** ~26-27/624 evaluated
  (Task 1 + Task 2 machinery DONE + calibration proven; 20 KTX commands
  persisted across 2 clean batches). Idempotent + resumable (the DB is
  the source of truth). Commits `546610a2`/`54b27d0f`/`c8a17cd3`/
  `b1b3ddfc`/`1991cd1d`/`34328a96`/`40b520ce`/`7874a392`. Live ktx
  origin dist (verified): command `source_inline:299 NULL:37
  synthesized:22` (=358); cvar `NULL:110 shipped_doc:100 source_inline:45
  synthesized:5` (=260); info_key `source_inline:7`; 27 verdict-stamped.
- **F-D4a re-confirmed HOLDING at the mid-Phase-3 state (orchestrator,
  not relayed):** owned-rows fingerprint
  `a37eb98acf636293ca2fd0b0ddc0c3c0` byte-identical before AND after a
  real `re-derive --project ktx --type cvar` AND `--type command`
  (260+358 entities); 134 owned rows survived; `k_short_gib`
  `synthesized|2|synthesized` intact. The guard protects Phase-3's
  synthesized volume writes. The desync did ZERO data harm.
- **GATE (operator-directed):** the naive 1-knob-per-Opus volume loop is
  STOPPED. The fan-out cost on parameterized-family knobs (`Nfav_go` /
  `Nfav_add` / `XonY` presets / 38 `k_fbskill_*`; ~80-120 twins) is
  being re-shaped via the **parameterized-family lane**. Intent capture:
  `docs/superpowers/parking/2026-05-17-phase3-family-lane-amendment.md`.
  The gated executor resume:
  `docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-phase3-executor-resume.md`.
- **`7874a392` correctly recognized: the family-lane D6 amendment is
  cross-phase, ORCHESTRATOR-OWNED.** It is the open loop. NOT a fresh
  executor's to self-draft (a D6 amendment is cross-phase memory).
- **F-D6a curated 2026-05-17** (orchestrator): the D6 fan-out sub-agent
  can fabricate line/conflict claims (a real batch-1 off-by-one
  fabrication, caught by independent grep BEFORE persist, zero bad data;
  batch-2 0 re-dispatches proved the fix). Phase 4 inherits the
  grep-verify-before-persist gate + the sharpened dispatch prompt.

## The orchestrator-owned next action (decisive)

1. **Draft the dated D6 amendment** (the orchestrator owns this):
   a `decisions.md` D6 dated block + a Phase-3-MD recon note defining
   the **parameterized-family lane** -- identical-handler families get
   ONE family-level Opus-4.7-MAX eval establishing shared behaviour +
   the parameter axis, then per-member records by parameter substitution
   with **each member's source binding verified cheaply/mechanically**.
   Heterogeneous knobs keep per-knob Opus-4.7-MAX (unchanged). Faithful
   to D5 (effort-routing, NOT scope-cut); D6/D7 Opus-MAX is NOT lowered.
   Enumerate the REAL families from the Task-1 manifest (not the
   ~80-120 estimate).
2. **The false-twin divergence-catch is a HARD GATE, not a formality.**
   A family member whose source binding diverges (a `7fav_go` that
   secretly points at a different handler; a sibling with its own real
   shipped comment) MUST be ejected back to per-knob Opus-MAX. The
   amendment must specify this as a blocking gate; do not let it soften
   to "looks like the family, ship it." This is the load-bearing risk,
   not tokens.
3. **Operator ratifies** (one plain-English sign-off; the operator
   already directionally chose "amendment first").
4. **A fresh executor terminal** then builds the family-dispatch
   mechanism, proves it on ONE real family (with the divergence-catch
   ejecting a planted false-twin), then resumes the volume loop SPLIT:
   heterogeneous -> the proven per-knob loop; family twins -> the new
   lane. The ~26 done are correct + carried; nothing redone.

## Reads required (MINIMAL)

1. This handoff.
2. `docs/superpowers/parking/2026-05-17-phase3-family-lane-amendment.md`
   -- the design intent (operator-directed); the amendment's source.
3. `.../review-findings.md` -- F-D6a (NEW), F-D11c, F-D9b, F-C3c, F-C2a,
   F-D10c + ownership table.
4. `.../decisions.md` D5 + D5 amendment + D6 + D7 + D7 clarification
   (the amendment lands as a dated D6 block).
5. `.../phase-3-ktx-source-synthesis.md` + the gated
   `...-phase3-executor-resume.md` (the per-knob recipe + batch-loop
   learnings stay valid for heterogeneous knobs).
6. Invoke `arc-orchestrator`. Confirm captured state WITHOUT re-deriving
   (tell-tale: F-D4a fingerprint `a37eb98a...`, 26/624, the family-lane
   gate, F-D6a). Sibling-arc (`enforce-L1`) misdirection -> STOP.

## When Phase 3 eventually halts at its REAL boundary (post-family-lane, post-volume)

Run YOURSELF (a dispatched "PASS" is a hypothesis -- 8x this arc): the
non-negotiable F-D4a owned-rows re-derive-safe proof (both types);
coverage vs POST-Phase-0 M with the C1-outreach residue enumerated; D7
tier-1 ran on every synthesized row; F-C3c (zero KTX commands
dead-stamped); F-C2a/D10 meaning-conflicts at the D7 tail; F-D11c flat
`structured_choices`; idempotent re-run byte-identical; C5 probes GREEN.
Then ratify + capture cross-phase memory + arc-history + generate the
Phase 4 executor prompt (carry **F-D6a** -- the grep-verify gate + the
hardened dispatch prompt; F-D12a no NN/NN; F-C1a recon POST-Phase-0 M
live; the `mvdsv.6` D9 sibling parser; F-C3d Phase-5 fetch+SHA-pin).

## Critical rules (locked; carried)

- F-D4a non-negotiable: the owned-row guard is LIVE + orchestrator-
  proven through Phase-2 shipped_doc AND Phase-3 synthesized-at-volume.
  Re-confirm green at every fill-phase boundary.
- D6 + D7 = Opus 4.7 MAX, spec-locked (D7), NOT lowerable. The
  family-lane is effort-routing at the family level, NOT a model
  downgrade and NOT a scope cut (D5-faithful).
- Spec is source of truth; a dated amendment GOVERNS its original C/D
  text. Never silently override/comply a lock -- dated amendment,
  surfaced (the F-C5b/F-C3c/F-D9a/F-D11c/F-D6a pattern).
- Verification discipline highest priority: re-derive load-bearing
  numbers via psql/grep/ls (`docker exec qw-oracle-postgres-dev psql -U
  qworacle -d qw_oracle -tAc "<SQL>"`; `bun
  scripts/load-knowledge/index.ts re-derive --project ktx --type
  <cvar|command>`). Prior "verified" is a hypothesis.
- Capture cross-phase memory IMMEDIATELY (the desync lesson: a stale
  resume / un-ledgered finding is how alignment is lost). Operator:
  non-coder, conceptually fluent, NOT the technical gate (you are);
  plain-English-first; be decisive (recommend, don't poll); momentum
  over ceremony; commit ONLY this arc's files (parallel `enforce-L1` +
  sidecar drift is not ours).

## First actions (fresh terminal)

1. Read this + the family-lane intent doc; invoke `arc-orchestrator`;
   confirm state WITHOUT re-deriving (tell-tale above).
2. Draft the dated D6 family-lane amendment + Phase-3-MD recon note
   (real families from the manifest; the false-twin catch a HARD gate);
   bring it to the operator for ratification (one plain-English
   decision).
3. On ratification: generate/refresh the fresh Phase-3 executor prompt
   for the split loop; dispatch; stand by (do not poll).
4. Track context budget. At ~350k wrap at the cleanest boundary, write
   the next resume (this shape). Drafting the locked amendment is the
   single highest-judgment artifact left -- do NOT do it degraded.

## When in doubt

The gate is CLEAN/consumed. Phases 0+1+2 verified. F-D4a holds
mid-Phase-3 (proven). The family-lane amendment is orchestrator-owned
and the false-twin catch is the real risk (not tokens). Genuine
decisions route to the operator with a decisive plain-English
recommendation, one question at a time.
