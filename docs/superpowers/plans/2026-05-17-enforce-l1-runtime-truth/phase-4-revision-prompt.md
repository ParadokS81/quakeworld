You are applying a BOUNDED REVISION (round 2) to Phase 4 of the arc:
  2026-05-17-enforce-l1-runtime-truth
  ("enforce L1 runtime-truth"; ghost elimination + hidden-command recovery)

Phase 4 = ACCEPTANCE CONTRACT (the gate that earns the word "confidence").

This is NOT a redraft. The Phase-4 MD was drafted, then orchestrator-GATED
at primary source (session 4, 2026-05-17). The structural design, the D17/
D18/D19/D22 instantiation, the 9 operator-run verification probes, the task
breakdown, and the execution modes ALL gated clean -- six handoff checks
held, cross-phase contract held, the R6 proxy was independently re-run GREEN
(74/92/129, both pin legs). Do NOT re-open or re-draft any of that. Apply
ONLY the bounded delta below, then halt.

SELF-CHECK -- WRONG arc if you see "describe-fill / probe-0 N/M" (ktx-mvdsv)
or "RRF / pgvector / eval recall@K" (qw-oracle-arc1). HALT and tell the
operator. This arc's tells: D1-D22 + X1-X10, one-time-per-fork hard gate,
dump-as-overriding-answer-key, version-pin proxy, three-level routing.

## Working directory

```
Repo root: /home/paradoks/projects/quakeworld
Scaffold:  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/
Target MD: .../phase-4-acceptance-contract.md  (revise in place)
```

## Required reading (numbered; read ALL before revising)

```
1. .../phase-4-acceptance-contract.md  -- the MD you are revising. Read it
   in full; it gated structurally clean. The delta below is surgical.
2. .../review-findings.md  -- READ THE NEW F7 (dump embedded commit banner;
   "rests entirely on proxy" is FALSE). F7 is the authoritative record of
   the S2 finding + its operator-ratified resolution. Phase 4 still owns
   role ACC: R5, R6, W1; now also F7.
3. .../decisions.md  -- D17/D18/D19/D22 + X2/R5/R6 are UNCHANGED. No
   decision was amended by this gate. Do NOT re-open a D. The S2 change is
   an F7-authorized R6 *strengthening* of the version-pin proxy, NOT new
   mechanism-validation logic (see "S2" below) -- R5/X2 stage-1 composition
   is untouched.
4. The APPROVED Phase-1/2/3 MDs -- their contracts are UNCHANGED; Phase 4
   still COMPOSES the Phase-1/2 probe scripts (R5/X2) and reads the Phase-3
   slot-3 representation. Re-confirm only that the delta does not perturb
   that composition.
5. apps/qw-oracle/data/detection/README.md + front1-diff.sh + the dump
   `entities-runtime-dump-3f9e724f.txt` (its TAIL, lines ~3344-3350) --
   the S2 / F7 primary-source evidence (cited verbatim below; re-confirm).
6. .../phase-template.md -- the shape is unchanged; you are editing within
   it, not re-shaping.
```

## Primary-source evidence (orchestrator-verified 2026-05-17; re-confirm, do not blind-trust)

- The dump's post-macrolist TAIL carries an embedded version banner the
  detection README + the current Phase-4 Recon fact both wrongly deny:
  ```
  3345  68/68 macros
  3346  ]/version
  3347  ezQuake 3.7.0-dev 8084~3f9e724fa
  3348  Exe: May 14 2026 10:44:51
  ```
  `~3f9e724fa` is the git commit prefix; it MATCHES the pin
  `3f9e724fa608e516040f02b9557808ff3efda53e` and `oracle_meta
  ezquake:source_repo_commit` (orchestrator re-checked both legs). It sits
  OUTSIDE all three `front1-diff.sh` extraction ranges (7-564 / 571-3272 /
  3276-3344), so it never polluted the 74/92/129 diff. Do NOT hardcode
  "line 3347" -- match the `ezQuake <ver> <build>~<hex>` pattern anywhere
  in the dump (robust to recapture / future forks).

## The bounded delta -- apply ALL, change NOTHING else

### S1 -- strike the R6 "reinvent" escape hatch (operator-ratified: route back, tighten)

- Task 3 `run_stage2` step: STRIKE `"or a faithful Python port of those
  exact sed/awk/grep lines"`. Mandate: stage-2 builds the cmdlist/cvarlist
  runtime name-sets by shelling out to the BANKED extraction, path-repointed
  exactly as Task 2 -- NEVER a Python reimplementation.
- Task 1 stage-2 lock: align the wording to match (shell-reuse of the
  Task-2 banked extraction, never a Python reimplementation).
- Task 2 scope: it correctly states the proxy's two SANITY-GATE legs are
  cvar-only. But stage-2's cross-check ALSO needs the COMMAND set. Add: the
  Task-2 `version-pin-proxy.sh` (or a sibling beside it) must additionally
  expose the cmdlist `sed -n '7,564p' | norm | ...` name-set via the SAME
  verbatim-in-substance shell-reuse, for stage-2 to consume. `front1-diff.sh`
  stays byte-immutable throughout.

### S2 -- embedded-SHA banner as the proxy's PRIMARY hard leg (operator-ratified; F7)

- Task 2: add a PRIMARY hard leg to `version-pin-proxy.sh`, ordered BEFORE
  the existing `front1-diff.sh:33-36` heuristic legs: extract the `~<sha>`
  token from the dump's `version`-command output line (match the
  `ezQuake <ver> <build>~<hex>` pattern; do NOT hardcode a line number),
  and assert that hex is a prefix of `oracle_meta ezquake:source_repo_commit`
  (the existing `docker exec ... psql` invocation). Absent banner OR
  prefix mismatch -> proxy FAIL -> zero level-3 (the same HARD sub-gate
  semantics D19 already specifies). Keep the existing sb_qtvlist_url +
  no-known-live-leak legs as SECONDARY corroborators (do not remove them).
- This is an F7-authorized strengthening of the R6 version-pin PROXY (a
  stage-2 sub-gate). It is NOT new stage-1 mechanism-validation logic --
  stage 1 stays pure COMPOSITION of the Phase-1/2 probes (R5/X2 untouched).
  State this distinction explicitly in the MD so it is not mis-flagged as
  an R5/X2 violation.
- Verification 2 (and Task-2 Verification): add an assertion that the
  SHA leg is GREEN at the pin AND trips (FAIL + non-zero) on a mismatched
  SHA. `git diff --quiet front1-diff.sh` stays (banked file immutable;
  the SHA leg lives only in `version-pin-proxy.sh`).

### Recon-fact + detection-README correction (F7)

- STRIKE the Phase-4 Recon fact "The dump carries NO version banner; the
  pin rests ENTIRELY on the proxy." Replace with the F7 truth: the dump's
  `version`-command output (post-macrolist tail) carries `<build>~<sha>`;
  the pin now has an EXACT embedded-SHA signal as the primary sub-gate plus
  the heuristic legs as corroborators. Cross-reference review-findings F7.
- Add a Task-2 STEP: "correct `apps/qw-oracle/data/detection/README.md`
  'Version-pin provenance (R6)' section -- it is the upstream source of the
  false claim; the dump DOES self-certify its commit." (The actual README
  edit is a Phase-4 EXECUTION action, tracked by F7 -- you are planning it,
  not executing it; draft-then-execute.)

### Record the operator-ratified resolutions (Phase-3 style: "RESOLVED 2026-05-17, operator-ratified")

In the MD's Open questions section, update the resolution blocks verbatim:
- **OQ-1(b):** provenance is CONFIRMED via the embedded-commit match (NOT
  a deferred human bless). prerequisites item 4 provenance CLOSED,
  corroborated three independent ways: the embedded `~<sha>` (F7) + the
  orchestrator R6 re-run GREEN 74/92/129 (both pin legs) + session-3
  byte-identical `cmp`. OQ-1(a) executor re-runs the proxy at execution;
  OQ-1(c) canonical path = `apps/qw-oracle/data/detection/` -- unchanged.
- **OQ-2:** the cross-phase additive touch of the 6 Phase-3-created files
  is RATIFIED (operator, 2026-05-17) -- same precedent/shape as the
  operator-ratified Phase-3 OQ-1; Verification 7 (X3 8-stem diff) is the
  guard.
- **OQ-3:** build-excluded stays level-2 is RATIFIED (operator,
  2026-05-17) -- the conservative D3/D19 reading; NO decisions.md
  amendment; a single-build dump cannot carry a cross-build verdict.
- **OQ-4:** unchanged (front1-diff.sh immutable) -- S2 reinforces it (the
  SHA leg lives in `version-pin-proxy.sh`, not in `front1-diff.sh`).

### Add an "Orchestrator independent re-verification" block (mirror the Phase-3 MD's)

Append a block to Open questions, in the Phase-3 MD's shape, recording the
gate's primary-source trust anchor: the R6 proxy independently re-run GREEN
(cvar 92 / command 74 / reverse 129; dump 557/2700/68; both pin legs =
3f9e724f); no pre-existing acceptance module (extractor_lib/ clean);
`verify-unified-output.py` house idiom confirmed; the F7 embedded-banner
finding (the gate caught what the README + the drafter Recon + the drafter
sub-agent all inherited unchecked -- `feedback_verification_layer_catches_
lift_residuals`); S1 routed-back-and-tightened; S2 ratified.

## Drafting rules

```
- ASCII only (X10): -- for dashes, no em/en-dash, no emoji.
- Do NOT redraft the clean sections. The delta above is the WHOLE change.
- Do NOT re-open D1-D22 (none was amended). The S2 SHA-leg is an
  F7-authorized R6 proxy strengthening, NOT a decision change and NOT new
  stage-1 logic -- say so in-MD so the gate/sub-agent do not mis-flag it.
- Stay in scope: no Phase-5 work, no detection re-run (X7), no other-fork
  onboarding (D2/D22).
```

## Step-by-step

```
1. Read 1-6 (incl. the NEW F7). Re-confirm the S2/F7 primary-source
   evidence against the live dump tail + oracle_meta (do not blind-trust
   this prompt -- X8/W2).
2. Apply S1, S2, the Recon/README correction, the OQ resolution blocks,
   and the orchestrator-re-verification block. Change nothing else.
3. Re-run the verification sub-agent (Explore, the template bottom brief)
   FOCUSED on the changed sections + their R5/R6/D18/D19/X2 interactions
   (does S1 still leave stage-1 as pure composition? is the S2 SHA-leg
   fail-closed and correctly framed as an R6 strengthening not new
   stage-1 logic? does the delta perturb the 9 operator-run probes?).
4. Apply findings; a decision beats a contradicting finding; surface a
   wrong-looking decision (none expected -- this is a tightening).
5. Halt with the structured status report. Do NOT start Phase 5.
```

## Halt-and-handback

Report STATUS; MD path; sub-agent CRITICAL/SUBSTANTIVE/ADVISORY +
resolution; any decisions.md deviation (none expected); the OQ statuses
(all resolved). Then STOP. The orchestrator re-gates the DELTA at primary
source (the SHA-leg is exact + fail-closed; no Python-port escape remains;
the OQ blocks match the ratified decisions; front1-diff.sh byte-immutable;
Recon + README-step corrected) -- a focused re-verification, then flips
Phase 4 -> approved and dispatches Phase 5.
