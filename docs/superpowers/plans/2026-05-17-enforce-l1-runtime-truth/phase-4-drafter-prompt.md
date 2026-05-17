You are drafting Phase 4 of the arc:
  2026-05-17-enforce-l1-runtime-truth
  ("enforce L1 runtime-truth"; ghost elimination + hidden-command recovery)

Phase 4 = ACCEPTANCE CONTRACT (the gate that earns the word "confidence").

This is a STRUCTURED PLANNING task. Your output is ONE markdown file:
  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-4-acceptance-contract.md
You do NOT execute anything. Drafting is paper-only.

SELF-CHECK -- WRONG arc if you see "describe-fill / probe-0 N/M" (ktx-mvdsv)
or "RRF / pgvector / eval recall@K" (qw-oracle-arc1). HALT and tell the
operator. This arc's tells: D1-D22 + X1-X10, one-time-per-fork hard gate,
dump-as-overriding-answer-key, version-pin proxy, three-level routing.

## Working directory

```
Repo root: /home/paradoks/projects/quakeworld
Scaffold:  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/
```

## Required reading (numbered; read ALL before drafting)

```
1. .../decisions.md  (IN FULL; Phase 4 is governed by D1, D2, D13, D17, D18,
   D19, D22 and X1-X10. D17 = one shared 3-stage shape, per-track
   instantiation. D18 = stage 1, hard / all-or-nothing / LOUD /
   one-time-per-fork. D19 = stage 2, dump is the overriding answer key +
   version-pin hard sub-gate. D22 = per-fork per-track precondition +
   off-by-default toggle.)
2. .../review-findings.md  (Phase 4 owns role "ACC": R5 harness wiring =
   COMPOSITION of the Phase-1/2 probes, R6 version-pin sanity-proxy, W1 the
   durable-dump dependency.)
3. .../phase-template.md  (follow exactly; verification sub-agent brief at
   the bottom.)
4. .../prerequisites.md  (item 4 is Phase 4's HARD precondition -- the
   durable pinned HEAD runtime dump + version-pin proxy. Confirm with the
   operator it is closed before drafting load-bearing detail.)
5. docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md
   (D17-D22 WHY.)
6. LIVE source recon (verify, do not copy from spec):
   - the durable pinned HEAD `3f9e724f` runtime dump + the version-pin
     sanity-proxy logic (prerequisites item 4 -- confirm the path with the
     operator; reuse /tmp/front1-diff.sh's proxy, do NOT reinvent -- R6).
   - the APPROVED Phase 1 + Phase 2 phase MDs -- their known-answer probes
     (Track A 3-gate; Track B 3 anchors + zero-cvar) are what this phase
     COMPOSES into the one hard gate (R5). Do NOT invent new validation
     logic.
   - the APPROVED Phase 3 phase MD -- the D13 slot-3 representation this
     phase fills via the cross-check.
   - the single toggle seam from Phase 1/2 (X4 -- D22 enforcement).
```

## What Phase 4 delivers (from the locked phase index)

ONE shared 3-stage acceptance contract, instantiated per track (D17): (1)
stage 1 = the hard / all-or-nothing / LOUD / one-time-per-fork
mechanism-validation gate (D18) -- the COMPOSITION of Track A's 3 probes +
Track B's anchors, run once at ezQuake's pinned commit `3f9e724f`; ANY probe
wrong -> NO signal for that fork, fall back to exactly today's pipeline,
LOUD error, operator alerted (NOT per-gate soft degradation; NEVER a
per-version output comparison). (2) stage 2 = the runtime dump as the
overriding answer key (D19) -- static proposes, dump disposes, disagreement
resolves conservative (Track A drops the accusation; Track B does not ship
the name); the version-pin sanity proxy is a HARD sub-gate (broken pin ->
ZERO level-3 stamps for that dump, all to level-2). (3) stage 3 = route by
the D13 level, identically for both tracks. The off-by-default per-fork
per-track toggle (D22) is wired here as the structural enforcement (server-
only fork -> Track B N/A; ezQuake-only this arc).

Runnable state at the boundary: the harness runs at HEAD `3f9e724f` and is
GREEN; a deliberately-broken pin demonstrably yields ZERO level-3 stamps;
the toggle off == today's pipeline exactly (X3/X4); a deliberately-failed
probe demonstrably falls the fork back LOUD with no signal.

## Drafting rules (arc-specific; full list in handoff-prompt.md)

```
- Follow phase-template.md exactly incl. "Recon facts (verified)". ASCII
  only (X10).
- R5: the harness is COMPOSITION of the Phase-1/2 probes (X2). Do NOT
  re-author validation logic here -- wire what the mechanism phases already
  shipped, reading the feeder/family tags. If a probe is missing upstream,
  that is a Phase-1/2 gap -- surface it, do not patch it here.
- D18 semantics are HARD: all-or-nothing, LOUD, one-time-per-fork, NOT
  per-version. A new version legitimately yields its own anomaly set (D13);
  the harness does not run per-version and cannot be tripped by version
  drift -- only by deliberate re-validation where source genuinely moved.
- D19: dump is the OVERRIDING answer key; every disagreement resolves the
  conservative direction (D3 / D8 safety net). The version-pin proxy is a
  HARD sub-gate. Level-3 exists ONLY for pinned-dump commits -- by design,
  not a gap; every other version is permanently level-2 (valid, useful).
- R6: reuse the banked version-pin proxy (W1); do not reinvent it.
- W1 dependency: if prerequisites item 4 is not closed, the phase MD STILL
  drafts (paper plan) but flags the dump-path as an operator precondition in
  "Open questions" and "Inputs from previous phase".
- Self-contained verification (X2): the harness GREEN at the pinned commit +
  broken-pin -> zero level-3 + toggle-off parity + failed-probe LOUD
  fallback. All inputs exist (Phases 1-3 approved). Not dependent on Phase 5.
- Execution-mode per task; harness/cross-check synthesis Sonnet medium;
  the contract-shape design task Opus MAX (X6); near-zero inline.
- Stay in scope: no delete-list / first-class emission (Phase 5), no
  detection re-run (X7), no FTE/QWCL/MVDSV onboarding (D22 -- only the
  ezQuake instantiation + the toggle that keeps others off).
```

## Step-by-step

```
1. Read all required files (1-6), incl. the APPROVED Phase 1/2/3 MDs.
2. Confirm prerequisites item 4 status with the operator. Recon live: the
   dump + proxy path; the Phase-1/2 probe entry points; the toggle seam.
   Record in "Recon facts".
3. Draft phase-4-acceptance-contract.md per phase-template.md.
4. Dispatch the verification sub-agent (Explore) with the bottom brief.
5. Apply findings; decision beats a contradicting finding; surface a
   wrong-looking decision.
6. Halt with the structured status report. Do NOT start Phase 5.
```

## Halt-and-handback

Report STATUS; MD path; sub-agent CRITICAL/SUBSTANTIVE/ADVISORY + resolution;
any decisions.md deviation; open questions (incl. prerequisites item 4
status). Then STOP. Operator reviews + runs the YES/NO verification, flips to
approved (opens the Phase 5 terminal) or returns this MD here;
fundamentally-wrong -> NEW fresh terminal for redraft.
