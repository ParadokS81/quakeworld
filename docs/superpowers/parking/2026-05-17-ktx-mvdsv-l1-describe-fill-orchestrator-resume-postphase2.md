# KTX/MVDSV L1 describe-fill -- orchestrator RESUME (post-Phase-2, Phase 3 dispatched)

**For:** a fresh terminal resuming the `arc-orchestrator` role. Created
2026-05-17 at the Phase-2 boundary close (NOT a smell-zone wrap -- a
clean-boundary trail refresh; the prior session had budget). Phase 3 is
dispatched (prompt generated, not yet opened/running). This SUPERSEDES
`2026-05-17-ktx-mvdsv-l1-describe-fill-orchestrator-resume-postphase1.md`
(that one said "Phase 2 RUNNING" -- now stale; kept only as git trail).

---

## THE HOLISTIC GATE IS CLEAN AND CONSUMED. DO NOT RE-RUN IT. DO NOT RE-READ THE 9,300-LINE PLAN.

Once-per-arc, ran to verdict (3 findings -> Corrections 1+2+3 landed +
verified), consumed. Any future "re-run the gate" is a FOCUSED re-check
of a specific corrected surface, NEVER a whole-plan re-read.

## Where things are

- Arc dir: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/`.
  PLAN COMPLETE; all phase MDs approved; gate CLEAN.
- **Phases 0 + 1 + 2: SHIPPED + orchestrator-boundary-verified.** See
  `apps/qw-oracle/docs/arc-history.md` top entry for the per-phase
  detail (do NOT re-derive it).
- **Phase 2 just closed (this session), independently re-verified by the
  orchestrator -- the executor "PASS" treated as hypothesis (the arc's
  8th catch-or-confirm).** Executor halted DONE_WITH_CONCERNS, committed
  `953fa0cd` (pushed). Independently re-run + PASS: count 260; idempotent
  F1==F2==`837f3875401d1ab73359759d9c657ac0`; 3 C5 probes [PASS]; D9 seam
  0; F-D9a CRLF leak 0; `k_short_gib` `synthesized|2|1` byte-identical;
  **the non-negotiable F-D4a `shipped_doc` re-derive-safe proof: owned
  fingerprint `5253de8f3f21352ea52457cd5d679b46` byte-identical before
  AND after a real `re-derive --project ktx --type cvar` (260 entities)
  -- the guard's `shipped_doc` leg, load-bearing for the first time,
  holds.** 102 `shipped_doc`; 103/260 covered; 157 residue enumerated in
  `apps/qw-oracle/scripts/describe-fill/output/describe-fill/ktx-mechanical-report.txt`.
- **Two Phase-2 concerns surfaced + orchestrator-RATIFIED into the
  ledger (the F-D9a Phase-routing pattern, dated, not silent):**
  - **F-D11c** -- the live `structured_choices` is the FLAT
    `[{value,label}]` Phase-1-locked type (`review-gate.ts:83-89` +
    D11 Amendment), NOT the stale phase-MD `{enum?,bitmask?}` sub-shape.
    Phase 3's D6 packet + the D7 D11/D15 serializer + Phase 5's
    public-projection serializer MUST consume FLAT.
  - **F-D9b** -- the Phase-2 loader clobber-guard is a whole-record
    skip for terminal owned rows (the only implementation consistent
    with the non-negotiable F-D4a gate, orchestrator-proven). Phase 3
    OWNS provenance integrity once it stamps a verdict (the Phase-2
    loader will not re-touch terminal rows).
  Neither needs a `decisions.md` change (faithful realizations; the D11
  amendment already authorizes additive `structured_choices`).
- **Phase 3: DISPATCHED, not yet running.** Executor prompt generated
  this session at
  `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-3-executor-prompt.md`
  (carries F-C3c / F-D11c / F-D9b / F-C2a-D10 / the Opus-4.7-MAX D6+D7
  spec-lock / anchor convention / smell-zone note / the 157-residue
  hand-off). Awaiting the operator to open a fresh executor terminal.
- Tree: this session's orchestrator-layer captures (review-findings,
  README, arc-history, phase-3-executor-prompt, this resume) committed +
  pushed on `main`. The parallel `enforce-L1` arc + sidecar drift is
  NOT ours -- never sweep it in.

## Reads required (MINIMAL -- this is the point)

1. This handoff (consume the captured state; do NOT re-derive it).
2. The arc `README.md` -- status + locked slicing + phase index (Phase
   2 row = SHIPPED; Phase 3 row = NEXT).
3. `review-findings.md` -- the ledger you OWN. In play for Phase 3:
   F-C2a, F-C3c, **F-D11c**, **F-D9b**, F-D10c, F-C3b + the
   anchor_version convention + the ownership table.
4. `decisions.md` -- ONLY the dated blocks if a specific question needs
   them (D5 + D5 amendment, D6, D7 + D7 clarification, D10, C1-C5). Do
   NOT re-read it whole.
5. `phase-3-ktx-source-synthesis.md` + `phase-3-executor-prompt.md` --
   what Phase 3 was told to do (to verify its report against).
6. When Phases 4/5 come up: their phase MD + generate their executor
   prompt from the `phase-{0,1,2,3}-executor-prompt.md` pattern.
7. Invoke the `arc-orchestrator` skill. Confirm the captured state
   WITHOUT re-deriving (tell-tale scope: F-D4a owned-row guard,
   `k_short_gib` `synthesized|2|1`, M=260, 102 `shipped_doc` / 157
   residue, F-D11c flat `structured_choices`, F-C3c cmdlist blind to
   KTX `cmds[]`). A sibling-arc (`enforce-L1`) misdirection means STOP.

## The psql verification recipe (bake this in -- do not rediscover it)

`psql` runs in the docker container `qw-oracle-postgres-dev`; user
`qworacle`, db `qw_oracle` (local-socket trust auth -- no password
needed for the dev container). From `apps/qw-oracle/`:
`docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "<SQL>"`

The real derive-tail (the F-D4a proof path, idempotent, safe on dev):
`cd apps/qw-oracle && bun scripts/load-knowledge/index.ts re-derive --project ktx --type cvar`

Owned-rows aggregate fingerprint (BEFORE == AFTER is the proof; scope =
the F-D4a guard predicate exactly, NO anchor conjunct):
```
SELECT md5(string_agg(canonical_id || '::' || md5(
  coalesce(description,'')||'|'||coalesce(description_origin,'')||'|'||
  coalesce(description_anchor_version,'')||'|'||
  coalesce(description_provenance::text,'')||'|'||
  coalesce(description_verdict,'')||'|'||
  coalesce(description_confidence::text,'')||'|'||
  coalesce(description_reasoning,'')||'|'||
  coalesce(description_proposed,'')), ',' ORDER BY canonical_id))
FROM entities WHERE project='ktx' AND type='cvar'
  AND description_origin IN ('synthesized','shipped_doc');
```

## When Phase 3 halts -- the boundary verification (run it YOURSELF)

A dispatched terminal's "PASS" is a HYPOTHESIS (8x this arc). Run,
verbatim:

1. **NON-NEGOTIABLE -- F-D4a at volume.** Phase 3 writes `synthesized`
   owned rows + stamps verdicts. Fingerprint owned rows BEFORE; run the
   real `re-derive --project ktx --type cvar`; fingerprint AFTER --
   byte-identical, `k_short_gib` still byte-identical `synthesized`. If
   anything changed -> the arc is corrupting its own record; HALT.
2. **Coverage vs the POST-Phase-0 M (260, recon live).** Every in-scope
   KTX entity ends affirmed-or-synthesized OR an enumerated
   C1-outreach-residue row (D6 confabulation guard: never a
   NULL-everything row). Residue tracked, NEVER importance-cut (C1).
3. **D7 tier-1 ran on every synthesized row** (independent Opus-4.7-MAX
   automated re-check before commit). The operator-run D7 tier-2 tail
   (hedged + residue + meaning-conflicts + sampled affirm bulk) is
   handed off, not skipped.
4. **F-C3c held:** zero KTX commands D6-dead-stamped (they carry NO
   Phase-0 C3 signal -- described from source, not death-stamped).
5. **F-C2a/D10:** `k_noframechecks`-class polarity-inversion
   meaning-conflicts resolved INLINE at the D7 tail with KTX source as
   tiebreaker; value-differences routed to L3, NOT L1-flagged.
6. **F-D11c:** the D6 packet + D7 serializer consumed the FLAT
   `structured_choices` shape (no `{enum?,bitmask?}` regression).
7. **C5 probes still GREEN; idempotent re-run byte-identical (C4).**
   CLEAN -> ratify, capture dated cross-phase memory + arc-history,
   generate the Phase 4 executor prompt (the `mvdsv.6` D9 sibling
   parser; sized by the Phase-0 ezquake.com shape; F-D12a no NN/NN
   ratio; F-C1a recon POST-Phase-0 M live), report to the operator in
   plain English with a decisive recommendation, dispatch Phase 4. ANY
   finding -> HALT, surface dated, never silent.

## Remaining sequence

Phase 3 (dispatched) -> **Phase 4** (MVDSV fill; `mvdsv.6` D9 sibling
parser; sized by the Phase-0 ezquake.com shape; F-D12a no NN/NN ratio;
heaviest single-engine phase, subagent-heavy holds the ~200-400k lower
bound, Tasks 1-3/4-8 separable for a mid-phase handoff) -> **Phase 5**
(D4 staleness walk + projections; **F-C3d: explicit
fetch+SHA-pin+`--commit`**; F-D13a MCP contract no-new-tool; F-D11b
ignore discipline; **F-D11c: the public-projection serializer consumes
FLAT `structured_choices`**; tag `arc-ktx-mvdsv-l1-describe-fill-shipped`).
Phase 6 deferrable, non-gating (arc complete + useful at end of P5; D16).
Generate each executor prompt from the `phase-{0,1,2,3}-executor-prompt.md`
pattern; Phases 3/4 are subagent-heavy (flag the smell-zone fresh-
terminal handoff in their prompts -- already in the Phase-3 one).

## Critical rules (locked; carried -- do not relitigate)

- The holistic gate is once-per-arc, CLEAN, consumed. Verify corrected
  surfaces focused, never whole-plan. Phases 0+1+2
  orchestrator-verified -- do not re-verify them.
- **F-D4a sequencing (non-negotiable).** The owned-row guard is LIVE +
  orchestrator-proven through Phase 2's `shipped_doc` leg. Re-confirm
  the guard green at every subsequent fill-phase boundary (Phase 3
  `synthesized`-at-volume next).
- **D6 + D7 = Opus 4.7 MAX, spec-locked (D7), NOT lowerable.** The
  executor honours the per-task dials baked into the phase MD; it does
  not choose them. D7 "cheap" = effort-routing, never a cheaper model.
- Spec is source of truth; a dated amendment GOVERNS its original C/D
  text (the spec's `## Amendment precedence` clause). Never silently
  override a lock; never silently comply against one -- dated
  amendment, surfaced (the F-C5b / F-C3c / F-D9a / F-D11c pattern).
- Verification discipline highest priority: re-derive load-bearing
  numbers/paths via the psql recipe / grep / ls. Prior "verified" is a
  hypothesis.
- Coverage = POST-Phase-0 N/M, recon live; residue tracked, NEVER
  importance-cut.
- Operator: non-coder, conceptually fluent; NOT the technical gate (you
  are). Plain-English-first; be decisive (recommend, do not poll); one
  question at a time; momentum over ceremony; ASCII committed docs;
  main-tree git, commit-on-main, push at checkpoints, no worktree/PR
  ceremony (Claude runs git silently); commit ONLY this arc's files
  (the parallel `enforce-L1` + sidecar drift is not ours).
- The arc is complete + useful at end of Phase 5; Phase 6 is the
  deferrable tail (routes to arc-reviewer post-arc, fresh terminal).

## First actions (fresh terminal)

1. Read this handoff + the arc README; invoke `arc-orchestrator`;
   confirm the captured state WITHOUT re-deriving (scope tell-tale
   above). Sibling-arc misdirection -> STOP.
2. If Phase 3 has halted: run the boundary verification YOURSELF (the
   recipe above; the F-D4a proof is non-negotiable). If still running:
   wait; do not poll the executor. If not yet opened: surface the
   Phase-3 executor prompt path to the operator to dispatch.
3. CLEAN -> ratify + capture dated cross-phase memory + arc-history +
   generate the Phase 4 executor prompt + report to the operator with a
   decisive plain-English recommendation + dispatch instruction.
4. Track your own context budget. At ~350k, wrap at the cleanest phase
   boundary and write the next orchestrator-resume (this shape).

## When in doubt

The gate is CLEAN, consumed -- do not re-derive it. Phases 0+1+2 are
orchestrator-verified -- do not re-verify them. Verify Phase 3's
boundary against live source before trusting it. A lock conflict
surfaces as a dated amendment, never silent. Genuine decisions route to
the operator with a decisive plain-English recommendation, one question
at a time. Do not execute phase code as the orchestrator -- verify, own
the cross-phase memory, dispatch the next executor.
