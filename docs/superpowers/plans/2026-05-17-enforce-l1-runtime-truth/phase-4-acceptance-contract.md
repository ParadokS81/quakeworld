# Phase 4 -- Acceptance contract (the gate that earns the word "confidence")

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` IN FULL (D1-D22 + the D7/D11 amendments + X1-X10 +
>    non-goals). The brainstorm is closed -- do NOT re-open a D; if a D looks
>    wrong, surface a deviation block and STOP. -- DONE; no D looks wrong.
>    Phase 4 is governed by D1, D2, D13, D17, D18, D19, D22 + X1-X10; it owns
>    review-findings role "ACC": R5 (harness = composition), R6 (version-pin
>    proxy reuse), W1 (durable-dump dependency).
> 2. Read `review-findings.md`; identify the F/R/W rows whose owning phase
>    role is this phase. Phase 4 = role "ACC": F2 (use 74/92/129), R5, R6,
>    W1, W2, W4. -- DONE.
> 3. Recon the LIVE source before inlining anything. -- DONE; see "Recon
>    facts (verified)". The R6 proxy was RE-RUN against the in-repo dump +
>    live DB (X8/W2) and the pin re-confirmed.
> 4. After drafting, dispatch the verification sub-agent. -- DONE; findings
>    applied, see "Open questions".

> **No deviation -- all Phase-4 premises re-verified TRUE 2026-05-17.**
> The prior-phase discipline (a refuted premise -> dated `decisions.md`
> amendment + operator ratification, NEVER a silent phase-MD override -- the
> D7/D11 worked examples) was applied. Phase 4's load-bearing premises were
> checked against live source and do NOT fire a deviation:
> - **D18/R5 (harness = COMPOSITION of Phase-1/2 probes) holds.** The APPROVED
>   Phase-1 MD ships `ezquake/verify-callgraph-probes.py` (the 3-gate, exit
>   non-zero + per-gate GREEN/RED) and the APPROVED Phase-2 MD ships
>   `ezquake/verify-hud-probes.py` (3 anchors + R7 + R1, same shape). Phase 4
>   COMPOSES these as subprocesses -- it authors NO new validation logic
>   (X2/R5). The two scripts do not yet exist on disk (Phases 1-3 are
>   APPROVED plans, not yet executed) -- that is expected; Phase 4 is the
>   PLAN that composes the plans' deliverables. A missing probe at execution
>   time is a Phase-1/2 gap, surfaced LOUD, NOT patched here (R5/X2).
> - **D19/R6 (version-pin sanity proxy is the banked `front1-diff.sh:33-36`)
>   holds and was RE-RUN.** The proxy logic was re-executed this drafting
>   against the in-repo dump + the live DB (X8/W2): SANITY GATE both legs
>   PASS at the pin; the candidate pool re-derived EXACTLY 74 cmd / 92 cvar /
>   129 reverse (F2 confirmed live, not asserted). R6 = reuse this banked
>   predicate path-portably; do NOT reinvent it.
> - **W1 (durable dump) CLOSED.** prerequisites item 4 is SECURED in-repo at
>   `apps/qw-oracle/data/detection/` (the triple + README, all git-tracked,
>   dump byte-identical `cmp`-clean to the Windows source). This MD draws
>   LOAD-BEARING detail (NOT paper-only). Three items remain as a Phase-4
>   EXECUTOR-time precondition + a drafter proposal, NOT a draft-time blocker
>   -- see "Inputs from previous phase" and OQ-1.
> If any premise had been refuted this block would be a DEVIATION and the
> phase would STOP for an operator amendment. None was.

> **F12 + F14 DATED MD-CORRECTION 2026-05-18 (orchestrator-applied at the
> Phase-4 gate; F6/F10/F12 narrative-preserved precedent -- no redraft, no
> `decisions.md` D-amendment; the SHIPPED code is correct, only this MD's
> literal text was wrong; review-findings F12 [carry-forward, confirmed] +
> F14 [new] are the authoritative record).** Two literal-text defects in
> this MD's verification commands + wiring-site names were caught by the
> Phase-4 executor at execution (it ran the CORRECT forms and surfaced both,
> did NOT silently edit the locked MD -- operator-not-technical-gate) and
> independently orchestrator-verified vs primary source at the gate:
> - **F12 (the F6/F10/F12 copy-run hazard family).** Task-4 Verification
>   step 1 literally `bun scripts/load-knowledge/index.ts load-version
>   --project ezquake --version head --force` is the WRONG subcommand
>   (`load-version` requires `--type/--json/--commit` and ingests ONE
>   single-type JSON; a verbatim copy-run HARD-THROWS and is the wrong
>   semantics for a real extract+load+post-loop round-trip). The CORRECT
>   entrypoint is `bun scripts/load-knowledge/index.ts extract-tag --project
>   ezquake --version head --force --skip-release-notes`. Task-4 step-5 +
>   phase-boundary Verification 8 literally `bun test
>   scripts/load-knowledge/quality-grid.test.ts` FAILS the `qw_oracle_test`
>   DB safety guard (a bare `bun test` inherits the dev DB and the guard
>   correctly refuses); the canonical form is
>   `DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test
>   bun test scripts/load-knowledge/quality-grid.test.ts`. The executor ran
>   both correct forms at execution; these literal lines below carry an
>   inline `[F12 ...]` marker pointing here.
> - **F14 (same F6/F10/F12 family -- wrong wiring-site name).** Task-4
>   step "Wire in `load-version.ts`" + the Files-touched / X9-grep
>   `load-knowledge/load-version.ts` name the WRONG file: live,
>   `load-version.ts` has zero overlay/adapter references and is byte
>   UNTOUCHED by Phase 4; the real stage-2 stamp-set wiring site is
>   `scripts/load-knowledge/extract-tag.ts` (the additive
>   `resolveStageTwoStampSet`, gated, threaded into the Track-A overlay 3f
>   + Track-B adapter 3e). The executor wired the correct live site;
>   `load-version.ts` was correctly left untouched. Read every
>   `load-version.ts` occurrence below as `extract-tag.ts` per this note.
> Both are MD-literal-only defects (the F6 wrong-stems / F10 missing-OFF /
> F12 wrong-subcommand class); the Phase-4 deliverable code + data are
> correct and were independently orchestrator-verified GREEN at the gate.

## Goal

This phase delivers the acceptance contract: ONE shared three-stage shape
(D17), instantiated for ezQuake ONLY (D2/D22), that earns the word
"confidence" the North Star rests on. **Stage 1 (D18):** a hard,
all-or-nothing, LOUD, one-time-per-fork mechanism-validation gate that
COMPOSES (X2/R5 -- never re-authors) the APPROVED Phase-1 3-gate
(`ezquake/verify-callgraph-probes.py`) and the APPROVED Phase-2 3-anchor +
R7 + R1 (`ezquake/verify-hud-probes.py`) probes, run ONCE at ezQuake's
pinned validation commit `3f9e724f`; ANY probe RED -> the fork emits NO
signal, the pipeline falls back to exactly today's output, the failure is
LOUD (visible pipeline error, operator alerted) -- NOT per-gate soft
degradation, NEVER a per-version output comparison. **Stage 2 (D19):** the
runtime dump is the overriding answer key -- static proposes, the dump
disposes; every static-vs-dump disagreement resolves the conservative
direction (Track A drops the accusation -- D3; Track B does not autonomously
ship the name -- D8); the version-pin sanity proxy (the banked
`front1-diff.sh:33-36`, R6 reuse) is a HARD sub-gate -- a broken pin yields
ZERO level-3 stamps for that dump and everything stays Phase-3's level-2.
Phase 4 mutates ONLY slot-3 (`dump_confirmation`) -- conclusion and evidence
are Phase-3-written and READ-ONLY here. **Stage 3:** route by the D13 level,
identically for both tracks -- level-3 (`dump-confirmed`) is
autonomously-shippable; level-2 (`high-confidence-generalized`) is
assistant/MCP-usable, never auto-shipped; level-1 (NULL) is no-signal. The
off-by-default per-fork, per-track toggle (D22) is wired here as the
structural enforcement: the Phase-1/2 toggle seam in `ezquake/extract.py`
(the two booleans) plus the Phase-3 emit/loader seam are gated on a durable
per-fork validation record; absent / RED / wrong-commit -> NO signal -> today's
pipeline (fail-safe). **Runnable, verifiable state at the phase boundary:**
the ezQuake acceptance harness runs at HEAD `3f9e724f` and is GREEN; a
deliberately-broken pin demonstrably yields ZERO level-3 stamps (all rows
stay level-2); a deliberately-failed probe demonstrably falls the fork back
LOUD with no signal; the toggle off == today's pipeline byte-for-byte
(X3/X4); and slot-3 is the ONLY field Phase 4 changes (conclusion/evidence
byte-identical to the Phase-3 write). Verification reads ONLY Phases 1-3
shipped artifacts + this phase's own output -- never Phase 5 (X2; the
routing predicate is SHIPPED and TESTED here, Phase 5 CONSUMES it).

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

- **Pin holds (prerequisites 2 / X8 -- RE-CHECKED this drafting).**
  `git -C research/repos/ezquake-source log -1` =
  `3f9e724fa608e516040f02b9557808ff3efda53e` ("Merge pull request #1120 ...
  cleanup/help-json-drift") AND `oracle_meta ezquake:source_repo_commit` =
  the same hash. L1 `head` was extracted at the dump's commit; the
  version-pin holds at drafting time. A moved pin at execution invalidates
  the dump cross-check (X8/W2) -- STOP and re-pin/re-extract with the
  operator.
- **R6 version-pin sanity proxy RE-RUN live (X8/W2 -- the load-bearing
  re-check).** The banked `front1-diff.sh:33-36` predicate was re-executed
  this drafting against the in-repo dump
  (`apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt`) + the
  live DB. Result: `[PASS] sb_qtvlist_url IN cvar candidate pool` AND
  `[PASS] no known-live cvar in candidate pool`
  (`bottomcolor|bgmvolume|cl_bobhead|zombietime|cl_cmdline|name` -- none
  leaked). The diff product re-derived EXACTLY: cvar CANDIDATES 92, command
  CANDIDATES 74, command reverse 129, macro 0 -- the F2-authoritative
  74/92/129 confirmed LIVE (not asserted, not copied from spec; X8/W2/X7
  satisfied). The proxy is runnable and GREEN at the pin NOW.
- **The banked dump's internal contract (verified byte-faithful).**
  `apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt`: 3350
  lines, CRLF (`^M$` confirmed on every line). Section line ranges match the
  detection README exactly: `cmdlist` 7-564 (tail `557/557 commands` @ 565),
  `cvarlist` 571-3272 (tail `2700/2700 variables` @ 3273), `macrolist`
  3276-3344 (tail `68/68 macros` @ 3345). `front1-diff.sh` strips `\r`
  itself (`norm()`); the CRLF is the faithful capture -- do NOT normalize
  the stored file (the detection README's hard rule). The 74/92 candidate
  pools are the DIFF PRODUCT (L1-source MINUS the 557/2700 runtime names),
  not raw dump counts.
- **The dump SELF-CERTIFIES its commit -- embedded `<build>~<sha>` banner
  (F7; orchestrator primary-source-verified 2026-05-17; corrects the prior
  false Recon claim AND the upstream detection README).** The dump's
  `version`-command OUTPUT (post-macrolist tail) is
  `ezQuake 3.7.0-dev 8084~3f9e724fa` -- `~3f9e724fa` is a direct embedded
  commit prefix, an EXACT prefix of the pin
  `3f9e724fa608e516040f02b9557808ff3efda53e` and of `oracle_meta
  ezquake:source_repo_commit` (both legs orchestrator-re-checked live). It
  sits OUTSIDE all three `front1-diff.sh` extraction ranges (7-564 /
  571-3272 / 3276-3344) so it never polluted the 74/92/129 diff. The
  detection README author saw only the `version` command NAME in the
  cmdlist and missed its OUTPUT in the tail -- same
  `feedback_parking_verified_state_is_hypothesis` shape as F4/D7.1 and the
  D11 strike. The pin therefore now has an EXACT embedded-SHA signal as the
  proxy's PRIMARY hard sub-gate (S2/Task 2) PLUS the `front1-diff.sh:33-36`
  heuristic legs as corroborators -- it does NOT rest entirely on the
  heuristic proxy. D19 still makes the proxy a HARD sub-gate and level-3
  still exists ONLY at a pinned-dump commit (by design -- D19, not a gap);
  the SHA leg makes that gate EXACT rather than heuristic. See
  review-findings F7 (the authoritative record + its operator-ratified
  resolution).
- **Durable home is git-tracked (prerequisites item 4 / W1 -- CLOSED).**
  `git ls-files apps/qw-oracle/data/detection/` returns all four:
  `README.md`, `entities-runtime-dump-3f9e724f.txt`, `front1-diff.sh`,
  `cmdline-liveness.sh`; `git check-ignore` confirms the dump is NOT ignored
  (the README's "verified trackable" claim holds). The canonical Phase-4
  home for the answer key + proxy IS `apps/qw-oracle/data/detection/`
  (proposal, OQ-1). The banked `.sh` files keep their hardcoded `/mnt/c` +
  `/tmp` paths AS-IS (the detection README: "Adapting them ... is the
  Phase-4 drafter/executor's job (R6: reuse the banked proxy, do NOT
  reinvent it)"); path-portability is Phase 4's Task 2.
- **Phase-1 probe contract (from the APPROVED Phase-1 MD).**
  `apps/qw-oracle/scripts/extractors/ezquake/verify-callgraph-probes.py`:
  Gate 1 `sb_qtvlist_url` -> conclusion `genuine-dead`, feeder `callgraph`,
  per-variant unreachable everywhere-compiled; Gate 2
  `gl_outline_scale_world` -> `genuine-dead`, feeder `commented-register`,
  textual cite `r_rmain.c:730`; Gate 3 `cl_bobhead` -> `build-excluded`,
  feeder `callgraph`, reachable client/win/apple + `reachable` server +
  `address_taken_residue == false` [F9 DATED CORRECTION 2026-05-17: was
  `not-compiled` server -- refuted premise; decisions.md D5 AMENDMENT +
  review-findings F9; conclusion `build-excluded` UNCHANGED, load-bearing;
  Phase-4 reads conclusion+level so its outputs are unaffected].
  "Exit non-zero with a LOUD per-gate
  report on any RED ... prints `GATE 1 GREEN / GATE 2 GREEN / GATE 3
  GREEN`." Explicitly: "this is the probe LOGIC -- Phase 4 composes it into
  the combined one-time-per-fork gate, this script does NOT wire that."
- **Phase-2 probe contract (from the APPROVED Phase-2 MD).**
  `apps/qw-oracle/scripts/extractors/ezquake/verify-hud-probes.py`: Anchor 1
  `radar` bare/element=radar/HUD_Func_f/Cmd_AddCommand; Anchor 2
  `+hud_radar`+`-hud_radar` element=radar/plus|minus/HUD_Plus_f|HUD_Minus_f/
  Cmd_AddRemCommand; Anchor 3 `togglehud` NOT emitted + no orphan `+/-`; R7
  zero `type=cvar`; R1 `r1.nonliteral_count == 0`. "Exit 0 only when all 3
  anchors GREEN + R7 GREEN + R1 GREEN; print `ANCHOR 1/2/3 GREEN / R7 GREEN
  / R1 GREEN`. Any RED -> non-zero + per-probe report." Same explicit
  "Phase 4 COMPOSES it ... this script does NOT wire the combined harness."
- **Phase-3 slot-3 contract (from the APPROVED Phase-3 MD + CARRY-FORWARD
  1).** Phase-3's migration (executor-derived ordinal -- review-findings
  F8; NOT `014`, which the parallel ktx-mvdsv arc consumed post-freeze)
  landed three nullable JSONB columns:
  `cvar_versions.track_a_reachability`,
  `command_versions.track_a_reachability`,
  `command_versions.track_b_hud_recovery`. Each conforms to the D14
  three-slot spine `{conclusion, evidence, dump_confirmation}`. The
  Phase-3 loader writes `dump_confirmation = "high-confidence-generalized"`
  (level-2) for EVERY populated row; `"dump-confirmed"` (level-3) is a VALID
  enum value the column may hold but Phase 3 NEVER writes it -- "it is
  stamped exclusively by Phase 4's runtime-dump cross-check (D14 slot-3 ...
  / D19)". The Phase-3 F1 probe `F1.runtime_fidelity_shape` asserts shape +
  that level-3 is well-formed IF present, and EXPLICITLY defers to Phase 4:
  "Phase 4 will later add the 'level-3 only at a pinned-dump commit'
  cross-check ... Phase 3's probe ... does NOT assert the dump linkage."
  Phase 4 mutates ONLY slot-3 (`dump_confirmation`); conclusion + evidence
  are Phase-3-written and READ-ONLY here (CARRY-FORWARD 1).
- **The L1 version key is `head`; the pinned-dump commit is `3f9e724f`.**
  `front1-diff.sh` queries `versions v ... v.version='head'`. The dump
  cross-check applies to the `head`-version rows IFF the pin holds
  (`oracle_meta ezquake:source_repo_commit == 3f9e724f`, re-checked above).
  "level-3 only at a pinned-dump commit" = only `head` (while pinned at
  `3f9e724f`) + future deliberately-pinned releases; every other extracted
  version is permanently level-2 (D19, by design).
- **Probe-script house idiom (consistency target).**
  `ezquake/verify-unified-output.py` is the established shape Phase-1/2's
  `verify-*-probes.py` mirror: `#!/usr/bin/env python3` + module docstring;
  `HERE = Path(__file__).resolve().parent`;
  `REPO_ROOT = HERE.parent.parent.parent.parent.parent`; `argparse`;
  `def main() -> int`; `if __name__ == "__main__": sys.exit(main())`;
  `PASS:`/`FAIL:` prints + return 0/1. Phase 4's composed harness mirrors
  this (Ousterhout consistency: do not reinvent the house pattern).
- **No pre-existing acceptance/gate/onboard module (introduce, per the
  shared-module convention).** `extractor_lib/` holds `_visitor.py`,
  `clang_config.py`, `_resolve.py`, `_source.py`, `_cvar_shared.py`,
  `_help_json_*` -- NO `_acceptance.py`; a repo-wide grep for
  one-time/per-fork/acceptance/onboard returns nothing. Phase 4 introduces
  the shared contract as `extractor_lib/_acceptance.py` + the ezQuake
  instantiation `ezquake/accept-runtime-truth.py` -- the SAME shared-Tier-1
  + ezQuake-instantiation split Phase 1 used (`extractor_lib/_callgraph.py`
  + `ezquake/verify-callgraph-probes.py`). D17 "one shared shape,
  per-track/per-fork instantiation" realized structurally.
- **Pool numbers are banked context, NOT re-derived (F2/X7/X8).** 74
  commands + 92 cvars banked HEAD pool; ~129 Track-B reverse-diff. Phase 4
  does NOT re-run `cvarlist`/`cmdlist` detection and does NOT re-derive the
  pools (X7). The re-run above was the X8/W2 sanity-gate re-check (it
  exercises the BANKED proxy against the BANKED dump -- it is NOT a fresh
  detection capture; detection capture is out of scope -- X7). Phase 4's
  correctness rests on the composed Phase-1/2 self-validated probes + the
  proxy hard sub-gate + the conservative cross-check, all on Phases-1-3
  shipped artifacts + this phase's own output (X2).
- **Environment (prerequisites 1-3).** libclang extractor toolchain
  SATISFIED (Phases 1-2 self-validate on extractor JSON; Phase 4 invokes
  their shipped probe scripts). `qw-oracle-postgres-dev` REQUIRED by Phase 4
  (the slot-3 stamping + F1 + SQL probes run against it via
  `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`).
  Item 4 (durable dump) CLOSED in-repo (above).

## Inputs from previous phase

Phases 1, 2, 3 are APPROVED and shipped before this phase starts. Phase 4
COMPOSES their deliverables; it shares NO mechanism code and authors NO new
validation logic (D1/X2/R5). Hard inputs:

- From `prerequisites.md`: item 1 (extractor toolchain) SATISFIED -- confirm
  the Phase-1/2 probe scripts run; item 2 (ezquake-source pinned
  `3f9e724f`) SATISFIED -- re-confirm at execution (STOP if moved -- X8/W2,
  it invalidates the dump cross-check); item 3 (Postgres dev container)
  REQUIRED -- confirm `qw-oracle-postgres-dev` up; **item 4 (durable pinned
  runtime dump) CLOSED** -- the triple + README are SECURED git-tracked at
  `apps/qw-oracle/data/detection/`, the dump `cmp`-clean to the Windows
  source, the R6 proxy re-run GREEN this drafting. The three remaining
  prerequisites-item-4 sub-items are this phase's EXECUTOR-time precondition
  + a drafter proposal, NOT a draft-time blocker (this MD is load-bearing,
  not paper-only): **(a)** the R6 version-pin proxy is RE-RUN against the
  live DB at the Phase-4 execution boundary (X8/W2 -- this MD did the
  drafting-time re-run; the executor re-runs at execution and the operator
  attests provenance); **(b)** the operator blesses provenance (they ran the
  `3f9e724f` build that produced the dump -- a human attestation, OQ-1);
  **(c)** the canonical path + wiring is proposed here (Task 2 / OQ-1) --
  `apps/qw-oracle/data/detection/` (already the git-tracked home).
- From Phase 1: the shipped `ezquake/verify-callgraph-probes.py` (the
  3-gate, exit-non-zero-on-RED, GREEN per-gate report) + the
  `ENABLE_CALLGRAPH_PASSENGER` toggle boolean in `ezquake/extract.py`.
- From Phase 2: the shipped `ezquake/verify-hud-probes.py` (3 anchors + R7 +
  R1, same shape) + the `ENABLE_HUD_COMMANDS_HANDLER` toggle boolean in
  `ezquake/extract.py`.
- From Phase 3: the Phase-3 migration applied (executor-derived ordinal
  -- F8, not a frozen `014`); the three nullable JSONB columns
  populated by the loader with `dump_confirmation = high-confidence-
  generalized` (level-2) for every pool/HUD row; the Phase-3-created
  `emit_callgraph_signal.py`, `load-callgraph-reachability.ts`,
  `load-hud-commands.ts`; the F1 `runtime_fidelity_shape` probe (which
  defers the level-3-pinned-only assertion to Phase 4).

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/extractor_lib/_acceptance.py
    # Tier-1 SHARED acceptance contract (D17 one shared shape; the same
    # shared-module convention as Phase-1's _callgraph.py). Engine-general;
    # parameterized by a per-fork "instantiation descriptor". Contains:
    #  (1) run_stage1(descriptor) -> the all-or-nothing COMPOSITION runner:
    #      invokes the descriptor's probe scripts as subprocesses (X2/R5 --
    #      NO re-authored validation logic), aggregates exit codes, ALL-green
    #      or LOUD-fail; writes the durable per-fork validation record.
    #  (2) run_stage2(descriptor) -> the version-pin proxy invocation (R6
    #      reuse) + the conservative dump cross-check producing the additive
    #      level-3 stamp-set artifact (slot-3 only; D19/D3/D8).
    #  (3) route_by_level(dump_confirmation) -> the stage-3 routing predicate
    #      (pure function; D13/D17 stage 3), TESTED here, CONSUMED by Phase 5.
    #  (4) validation_record_ok(fork, pin) -> the D22 structural-gate query
    #      the Phase-3 emit/loader seam consults (fail-safe-closed).
apps/qw-oracle/scripts/extractors/ezquake/accept-runtime-truth.py
    # ezQuake INSTANTIATION (D17 per-fork; D22 ezQuake-ONLY this arc).
    # Sibling of verify-callgraph-probes.py / verify-hud-probes.py; mirrors
    # the verify-unified-output.py house idiom. Wires the ezQuake descriptor:
    # probe scripts = the two Phase-1/2 verify-*-probes.py; dump = the
    # in-repo pinned dump; pin = 3f9e724f; tracks = [A, B]. Runs the shared
    # _acceptance stages 1->2->3 for ezQuake. No other fork is instantiated
    # (D2/D22 -- the absence of a descriptor IS the off-by-default toggle).
apps/qw-oracle/data/detection/version-pin-proxy.sh
    # R6 path-portable version-pin proxy. REUSE-not-reinvent: the predicate
    # is front1-diff.sh:33-36 verbatim in substance (sb_qtvlist_url in cvar
    # candidate pool AND no known-live cvar leaked) plus the minimal
    # norm()+line-range rt-cvars/cand-cvar derivation those 4 lines need.
    # ONLY the hardcoded paths change: F -> the in-repo dump; /tmp/* -> a
    # repo-relative work dir; the `docker exec ... psql` DB line unchanged.
    # The banked front1-diff.sh stays AS-IS (immutable provenance record).
apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_acceptance.py
    # Unit test for the PURE stage-3 routing predicate + the stage-1
    # all-or-nothing aggregation + the stage-2 conservative-direction
    # mapping (Track A genuine-dead-absent->L3 / present->stay-L2;
    # build-excluded->stay-L2; Track B present->L3 / absent->stay-L2).
    # Sibling of extractor_lib/tests/test_help_json_blame.py (house test
    # location). The broken-pin and failed-probe NEGATIVE scenarios are
    # operator-run runnable commands in "Verification (phase boundary)"
    # (acceptance/gate archetype = OPERATOR-RUN), not CI-only.
```

Generated at run time (NOT hand-authored; listed for completeness):

```
apps/qw-oracle/data/detection/acceptance-validated-ezquake.json
    # The durable per-fork validation record (stage-1 output). Schema:
    # {fork, validation_commit, status: GREEN|RED, probes:{callgraph:...,
    # hud:...}, validated_at}. Git-trackable so a GREEN validation is
    # durable across sessions (consistent with the detection durable-home
    # pattern). Written by accept-runtime-truth.py; read by the D22 gate.
apps/qw-oracle/data/detection/level3-stamp-set-3f9e724f.json
    # The stage-2 cross-check output (the additive artifact the loader
    # reads -- X9-consistent; analogous to Phase-3's 10th signal file).
    # Schema: {validated_commit, proxy:PASS|FAIL, track_a_dump_confirmed:[
    # names], track_b_dump_confirmed:[names], static_dead_overridden_by_dump:
    # [names], counts:{...}}. proxy:FAIL => both confirmed lists EMPTY (the
    # broken-pin -> zero-level-3 hard sub-gate, materialized).
```

### Modified

```
apps/qw-oracle/scripts/extractors/ezquake/emit_callgraph_signal.py
    # (Phase-3-created.) Add the D22 structural-gate precondition: emit the
    # 10th signal file ONLY when validation_record_ok('ezquake', <pin>) is
    # GREEN at the current pin; absent/RED/wrong-commit -> emit NOTHING +
    # LOUD. ADDITIVE guard that reuses the EXISTING Phase-1 fail-safe path
    # (no new exception machinery -- the Phase-2-Task-2 consistency
    # discipline). Cross-phase additive touch -- flagged OQ-2 (analogous to
    # Phase-3 OQ-1's additive touch of Phase-1's extract.py).
apps/qw-oracle/scripts/load-knowledge/load-callgraph-reachability.ts
apps/qw-oracle/scripts/load-knowledge/load-hud-commands.ts
    # (Phase-3-created.) The Track-A overlay + Track-B adapter additionally
    # consult the stage-2 level3-stamp-set (only at the pinned-dump version,
    # only when the validation record is GREEN + proxy PASS) and write
    # dump_confirmation = "dump-confirmed" for the named rows via the SAME
    # ON CONFLICT idempotent path Phase 3 used (X9 -- NOT an in-place
    # UPDATE). conclusion + evidence are re-written verbatim from the
    # Phase-1/2 source (slot-3 is the ONLY field that differs L2 vs L3 --
    # CARRY-FORWARD 1). Default (no stamp-set / proxy FAIL / not pinned) =
    # Phase-3's level-2 unchanged.
apps/qw-oracle/scripts/load-knowledge/load-version.ts
    # Wire the stage-2 level3-stamp-set as an additive input to the Track-A
    # overlay + Track-B adapter, gated on the validation record. One wiring
    # site; the per-type loaders + ordering are Phase-3's, unchanged.
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts
    # (Phase-3-extended.) Extend F1.runtime_fidelity_shape with the Phase-3-
    # deferred assertion: a dump_confirmation = "dump-confirmed" (level-3)
    # row is well-formed ONLY at a pinned-dump commit (the pin recorded in
    # the validation record); a level-3 stamp at a non-pinned version FAILS.
    # Test: a level-3-at-non-pinned row FAILs; a level-3-at-pinned PASSes.
```

### Deleted

```
n/a -- purely additive. The banked front1-diff.sh / cmdline-liveness.sh are
NOT deleted (immutable provenance records -- detection README). A deletion
touching an existing handler stem, an existing entity row, or the Phase-1/2
mechanism would violate X3/D1.
```

## Tasks

### Task 1 -- Lock the shared three-stage acceptance-contract shape (the architectural design)

- **Goal:** Produce the single authoritative contract shape so Tasks 2-4
  synthesize against a locked spec, not a sketch: the per-fork instantiation
  descriptor, the stage-1 all-or-nothing composition + LOUD-fallback + the
  validation-record schema, the stage-2 version-pin-proxy-gated conservative
  cross-check (the exact per-conclusion slot-3 mapping) + the stamp-set
  schema, the stage-3 routing predicate, and the D22 structural-gate
  binding-point -- all validated against the REAL APPROVED Phase-1/2/3
  contracts + live schema.
- **Files:** none written in this task -- it produces the locked block this
  MD already states (below) and that the subagent re-validates against the
  live Phase-1/2/3 MD "Outputs" + live schema.
- **Steps:**
  - [ ] Re-read the APPROVED Phase-1/2/3 MD "Outputs" sections; confirm
    verbatim: the two probe scripts' exit/print contract (exit non-zero on
    any RED; GREEN-per-gate/anchor print); the three JSONB columns + the
    D14 three-slot spine; that Phase 3 writes `high-confidence-generalized`
    ONLY and Phase 4 owns the level-3 stamp (CARRY-FORWARD 1).
  - [ ] Lock the **per-fork instantiation descriptor** (D17 one shared
    shape, per-fork instantiation; D2/D22 ezQuake-only this arc):
    ```
    {
      "fork": "ezquake",
      "validation_commit": "3f9e724f",            # the fork's pinned validation pin
      "probe_scripts": [                          # COMPOSED, never re-authored (X2/R5)
        "ezquake/verify-callgraph-probes.py",     # Phase-1 (Track A)
        "ezquake/verify-hud-probes.py"            # Phase-2 (Track B)
      ],
      "tracks": ["A", "B"],                       # MVDSV would be ["A"] (server-only, no HUD -- D22 per-track)
      "dump": "apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt",
      "proxy": "apps/qw-oracle/data/detection/version-pin-proxy.sh"
    }
    ```
    The ABSENCE of a descriptor for a fork IS the off-by-default toggle
    (D22): FTE/QWCL/MVDSV have no descriptor this arc -> never validated ->
    their Phase-1/2 booleans never legitimately on -> no signal. No phase
    onboards another fork.
  - [ ] Lock the **stage-1 validation record** (the durable per-fork
    mechanism-validated fact -- D13/D18/D22):
    ```
    {
      "fork": "ezquake",
      "validation_commit": "3f9e724f",
      "status": "GREEN" | "RED",                  # ALL probes green => GREEN; ANY red => RED
      "probes": { "callgraph": {"exit":0,"report":"..."},
                  "hud":       {"exit":0,"report":"..."} },
      "validated_at": "<iso8601>"
    }
    ```
    Stage 1 is HARD / all-or-nothing / LOUD / one-time-per-fork (D18): run
    the descriptor's probe scripts ONCE at `validation_commit`; ANY
    non-zero exit -> `status:RED` -> the fork emits NO signal -> the
    pipeline falls back to exactly today's output -> LOUD (non-zero harness
    exit + an explicit operator-facing error line). NOT per-gate soft
    degradation; NEVER a per-version comparison (a new version legitimately
    yields its own anomaly set -- D13; the harness validates the MECHANISM
    at the pin, not any version's output). A MISSING probe script is a
    Phase-1/2 gap -> LOUD, surface, do NOT patch here (R5/X2).
  - [ ] Lock the **stage-2 conservative cross-check** (D19 dump overrides;
    D3/D8 conservative; the proxy is the HARD sub-gate; slot-3 ONLY --
    CARRY-FORWARD 1). Precondition: stage-1 GREEN AND the R6 proxy PASS.
    Compute the runtime name sets once from the in-repo dump by SHELLING
    OUT to the Task-2 banked extraction (`front1-diff.sh`'s `norm()` +
    line-range pipeline, path-repointed -- NEVER a Python reimplementation;
    R6 reuse-not-reinvent; cmdlist 7-564 -> command names, cvarlist
    571-3272 -> cvar names). For each Phase-3-populated row at the
    pinned-dump version, mutate ONLY `dump_confirmation`:
    ```
    Track A (track_a_reachability):
      conclusion "genuine-dead":
        name ABSENT from dump set  -> dump CONFIRMS dead -> dump-confirmed (L3)
        name PRESENT in dump set   -> DISAGREEMENT -> conservative D3
                                      ("drop the accusation") -> stay L2
                                      + count into static_dead_overridden_by_dump
      conclusion "build-excluded": -> stay L2  (human-gated bucket, never the
                                      autonomous delete-list -- D20; a single
                                      runtime dump cannot confirm a cross-build
                                      verdict -- D15; L3 would over-claim. OQ-3)
    Track B (track_b_hud_recovery):
      name PRESENT in dump cmdlist -> dump CONFIRMS -> dump-confirmed (L3)
      name ABSENT  from dump       -> conservative D8 ("do not autonomously
                                      ship the name") -> stay L2 (still a
                                      first-class entity -- D21 nothing
                                      withheld; just not autonomously trusted)
    ```
    A static-dead-overridden-by-dump count is OPERATOR SIGNAL reported
    LOUD-but-non-fatal -- it is stage-2 doing its job (D3 "the runtime dump
    mops residue"), NOT a stage-1 all-or-nothing failure. conclusion +
    evidence are NEVER mutated (CARRY-FORWARD 1); the conservative "drop
    the accusation" is realized purely as "withhold level-3" -- Phase 5's
    level-3-only delete-list is what makes that structurally safe.
  - [ ] Lock the **stage-2 stamp-set artifact** (`level3-stamp-set-
    3f9e724f.json`, additive -- the X9-consistent loader input, analogous
    to Phase-3's 10th signal file): `{validated_commit, proxy:PASS|FAIL,
    track_a_dump_confirmed:[names], track_b_dump_confirmed:[names],
    static_dead_overridden_by_dump:[names], counts:{...}}`. `proxy:FAIL`
    => BOTH confirmed lists EMPTY (the broken-pin -> ZERO-level-3 HARD
    sub-gate, materialized: nothing to stamp -> every row stays Phase-3's
    level-2 -- D19).
  - [ ] Lock the **stage-3 routing predicate** (D13/D17 stage 3 -- identical
    for both tracks): pure function `route_by_level(dump_confirmation) ->`
    `"autonomous-eligible"` (level-3 `dump-confirmed`) | `"assistant-only"`
    (level-2 `high-confidence-generalized`) | `"no-signal"` (NULL /
    level-1). It reads ONLY slot-3; it does NOT branch on track or feeder
    (stages 1-2 carried the track/feeder specifics; stage 3 is uniform).
    SHIPPED + TESTED here; Phase 5 CONSUMES it (the level-3-only delete-list
    + the level-2 assistant surface) -- Phase 4 does NOT build Phase 5's
    outputs (X2; scope).
  - [ ] Lock the **D22 structural-gate binding-point**:
    `validation_record_ok(fork, current_pin)` returns True ONLY when the
    record exists AND `status:GREEN` AND `validation_commit == current_pin`.
    The Phase-3 `emit_callgraph_signal.py` (Track-A signal emit) +
    the Track-A/B loaders consult it; False -> emit/populate NOTHING + LOUD
    -> exactly today's pipeline (fail-safe-closed -- D22/X4). It reuses the
    EXISTING Phase-1 fail-safe path / Phase-2 per-handler isolation (no new
    exception machinery -- the Phase-2-Task-2 consistency discipline).
- **Verification:** the subagent (dispatch brief at the scaffold bottom)
  independently re-derives the descriptor / record / cross-check / stamp-set
  / routing shapes from the live APPROVED Phase-1/2/3 MD "Outputs" + live
  schema and produces a STRUCTURED shape-match report: per locked shape, a
  PASS/FAIL line + the live-contract-vs-locked-shape diff (mirrors the
  Phase-3 Task-1 schema-design re-derivation -- prose alone is not the
  deliverable). PASS: every locked shape FAIL-free; the subagent confirms
  the shapes match the APPROVED contracts + D17/D18/D19/D13/D22 with no
  CRITICAL/SUBSTANTIVE.
- **Execution mode:** `subagent (Opus MAX)` -- THE cross-cutting
  contract-shape design the drafter prompt names Opus-MAX-shaped (X6): the
  shared-vs-instantiation factoring (D17), the all-or-nothing one-time-per-
  fork semantics (D18), the conservative slot-3-only cross-check
  (D19/D3/D8), the D22 structural-gate binding. A wrong shape ships a false
  level-3 -> a wrong autonomous delete PR to nano/slime (the strict-bar
  consumer -- `reference_rigor_bar_follows_consumer`). Architecturally
  load-bearing and correctness-critical.

### Task 2 -- The R6 version-pin sanity proxy, path-portable (reuse-not-reinvent)

- **Goal:** A path-portable `version-pin-proxy.sh` with a PRIMARY hard leg
  -- the dump's embedded `version`-command commit banner asserted to be a
  prefix of `oracle_meta ezquake:source_repo_commit` (F7/S2; ordered
  FIRST) --
  followed by the banked `front1-diff.sh:33-36` heuristic legs verbatim in
  substance as SECONDARY corroborators, reading the in-repo dump + the live
  DB, so stage 2 can invoke it as the HARD sub-gate without the banked
  file's `/mnt/c` + `/tmp` hardcoding. It ALSO exposes the cmdlist +
  cvarlist runtime name-sets (the same banked `norm()` + line-range
  extraction, path-repointed) for stage-2's cross-check to consume by
  shell-reuse. This is an F7-authorized strengthening of the R6 version-pin
  PROXY (a stage-2 sub-gate) -- NOT new stage-1 mechanism-validation logic
  (stage 1 stays a pure COMPOSITION of the Phase-1/2 probes; R5/X2
  untouched). `front1-diff.sh` stays byte-immutable throughout (the SHA leg
  lives only in this new file).
- **Files:** `apps/qw-oracle/data/detection/version-pin-proxy.sh` (created).
- **Steps:**
  - [ ] **PRIMARY hard leg -- embedded-SHA banner (F7/S2; ordered BEFORE
    the :33-36 heuristic legs).** `norm()` the dump (strips the CRLF `\r`
    -- the dump is Windows-written), match the `version`-command output
    line by the pattern `^ezQuake <ver> <build>~<hex>$` (e.g.
    `ezQuake 3.7.0-dev 8084~3f9e724fa`) -- do NOT hardcode a line number
    (robust to recapture / future forks); extract the `<hex>` token after
    `~`. Query the pin via the SAME `docker exec ... psql` invocation
    (`-tAc "SELECT value FROM oracle_meta WHERE
    key='ezquake:source_repo_commit'"`). Assert `<hex>` is a prefix of that
    value. Absent banner OR prefix mismatch -> `[FAIL]` leg -> proxy
    non-zero -> ZERO level-3 (the SAME HARD sub-gate semantics D19 already
    specifies; the broken-pin -> zero-level-3 materialization). This is an
    EXACT signal (the dump self-certifies its commit -- F7), strictly
    stronger than the heuristic legs; it is an F7-authorized strengthening
    of the R6 version-pin PROXY (a stage-2 sub-gate) and adds NO new stage-1
    mechanism-validation logic (R5/X2 untouched -- stated so the gate /
    sub-agent do not mis-flag it as an R5/X2 violation).
  - [ ] Lift, verbatim in substance, from the banked
    `apps/qw-oracle/data/detection/front1-diff.sh` as SECONDARY
    corroborator legs (kept, NOT removed): the `export LC_ALL=C`, the
    `norm()` function (`sed -E 's/\r//g; s/&c[0-9a-fA-F]{3}//g; s/&r//g'`),
    the cvar runtime-set derivation (`sed -n '571,3272p' "$F" | norm |
    awk 'NF{print $NF}' | grep -E '^[A-Za-z_][A-Za-z0-9_]*$' | sort -u`),
    the L1-source cvar query (`docker exec -i qw-oracle-postgres-dev psql
    -U qworacle -d qw_oracle -tA -c "SELECT DISTINCT e.name FROM entities e
    JOIN cvar_versions cv ... WHERE e.project='ezquake' AND e.type='cvar'
    AND v.version='head'"`), the `comm -23` candidate derivation, and the
    SANITY GATE lines 33-36 (`grep -qxF sb_qtvlist_url` PASS/FAIL + the
    known-live leak grep
    `bottomcolor|bgmvolume|cl_bobhead|zombietime|cl_cmdline|name`). The two
    SANITY-GATE legs stay cvar-only (unchanged). The macro front is NOT
    needed (R6: reuse the proxy, not the whole front-1 diff; X7: no
    detection re-run).
  - [ ] **Additionally expose the cmdlist runtime name-set for stage-2
    (S1).** Stage 2's conservative cross-check needs the COMMAND set as
    well as the cvar set. This script (or a sibling beside it) MUST expose
    the cmdlist `sed -n '7,564p' "$F" | norm | sed -E 's/^[[:space:]]+//;
    s/[[:space:]]+$//' | grep -E '^[+-]?[A-Za-z_][A-Za-z0-9_]*$' | sort -u`
    name-set via the SAME verbatim-in-substance shell-reuse of the banked
    `front1-diff.sh` pipeline (path-repointed only) -- so stage-2 consumes
    BOTH runtime name-sets by shelling out, NEVER a Python reimplementation
    (S1; R6 reuse-not-reinvent). This is exposure for stage-2 consumption,
    NOT a third SANITY-GATE leg (the two SANITY-GATE legs stay cvar-only).
  - [ ] Repoint ONLY the paths: `F` = a script arg defaulting to
    `<repo>/apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt`
    (resolve `<repo>` relative to the script location, not a hardcoded
    home); the `/tmp/rt-cvars.txt` / `/tmp/cand-cvar.txt` work files ->
    `"$(mktemp -d)"`-scoped paths cleaned on exit. The `docker exec ... psql`
    DB invocation is UNCHANGED (it is already environment-portable; reused
    as-is for BOTH the L1-source cvar query AND the SHA-leg `oracle_meta`
    query). The `set -o pipefail` + `LC_ALL=C` + the predicate text are
    UNCHANGED.
  - [ ] Exit contract: print `[PASS]`/`[FAIL]` for the PRIMARY SHA leg
    FIRST, then for each of the two SECONDARY SANITY GATE legs (mirroring
    the banked output) and exit 0 ONLY when the SHA leg AND both SANITY
    legs PASS; non-zero otherwise. This is the HARD sub-gate stage 2
    invokes (D19): non-zero -> ZERO level-3 (the stamp-set's confirmed
    lists empty).
  - [ ] **Correct the detection README (F7; draft-then-execute -- this MD
    PLANS the edit, the Phase-4 executor APPLIES it).** The
    `apps/qw-oracle/data/detection/README.md` "Version-pin provenance (R6)"
    section is the UPSTREAM source of the false "dump carries NO embedded
    version banner / commit-pinning rests entirely on the SANITY GATE"
    claim; it must be corrected -- the dump's `version`-command output DOES
    self-certify its commit (`<build>~<sha>`), so the pin now has an EXACT
    embedded-SHA primary sub-gate plus the heuristic legs as corroborators
    (cross-reference review-findings F7). The actual README edit is a
    Phase-4 EXECUTION action tracked by F7.
  - [ ] Leave the banked `front1-diff.sh` byte-unchanged (immutable
    provenance record -- the detection README; the orchestrator deliberately
    did not rewrite it to avoid perturbing the verified answer key; S2's
    SHA leg lives ONLY in `version-pin-proxy.sh`, never in
    `front1-diff.sh`).
- **Verification (the actual commands -- not prose):**
  ```
  cd /home/paradoks/projects/quakeworld
  bash apps/qw-oracle/data/detection/version-pin-proxy.sh ; echo "exit=$?"
  # tamper A (truncated dump -- secondary legs trip): expect FAIL+nonzero
  head -c 4000 apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt \
    > /tmp/broken-dump.txt
  bash apps/qw-oracle/data/detection/version-pin-proxy.sh /tmp/broken-dump.txt ; echo "exit=$?"
  # tamper B (mismatched SHA -- PRIMARY leg trips independently): flip the
  # embedded banner hex, leave every line range structurally intact
  sed -E 's/(ezQuake [0-9.]+(-dev)? [0-9]+~)[0-9a-fA-F]+/\1deadbeef/' \
    apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt \
    > /tmp/sha-mismatch-dump.txt
  bash apps/qw-oracle/data/detection/version-pin-proxy.sh /tmp/sha-mismatch-dump.txt ; echo "exit=$?"
  git diff --quiet apps/qw-oracle/data/detection/front1-diff.sh && echo "front1-diff.sh BYTE-IMMUTABLE"
  ```
  PASS condition: the in-repo-dump run prints `[PASS]` for the PRIMARY SHA
  leg AND both `[PASS]` SANITY legs and `exit=0`; tamper A prints a
  `[FAIL]` leg + non-zero; tamper B prints `[FAIL]` on the PRIMARY SHA leg
  + non-zero (the embedded-SHA sub-gate trips on a mismatched SHA even with
  all line ranges structurally intact -- F7/S2/D19); `front1-diff.sh
  BYTE-IMMUTABLE` prints. FAIL condition: the in-repo run is not GREEN, OR
  either tamper still exits 0 (the HARD sub-gate did not trip -- D19
  violated), OR `git diff --quiet` fails (banked provenance perturbed --
  the SHA leg must live only in `version-pin-proxy.sh`).
- **Execution mode:** `subagent (Sonnet medium)` -- bounded path-port of a
  banked predicate against a locked reuse constraint; reasoning (the
  repo-relative path resolution, the mktemp scoping) but not architectural.
  Sonnet-medium floor per X6.

### Task 3 -- Build the shared `_acceptance.py` + the ezQuake `accept-runtime-truth.py`

- **Depends on:** Task 1's subagent-validated locked shape (the tasks are
  sequential within the phase -- Task 3 does NOT start before Task 1's lock
  is subagent-confirmed; Task 2's proxy is invoked by stage 2). Not
  auto-parallelizable.
- **Goal:** Implement the Task-1-locked shape: the stage-1 all-or-nothing
  composition runner (subprocess-invokes the Phase-1/2 probe scripts -- NO
  re-authored logic, X2/R5), the stage-2 proxy-gated conservative
  cross-check writing the additive stamp-set, the pure stage-3 routing
  predicate, and the D22 `validation_record_ok` query -- engine-general in
  `_acceptance.py`, instantiated for ezQuake in `accept-runtime-truth.py`.
- **Files:** `extractor_lib/_acceptance.py`,
  `ezquake/accept-runtime-truth.py` (created).
- **Steps:**
  - [ ] `_acceptance.py` `run_stage1(descriptor) -> record`: for each
    `descriptor.probe_scripts` entry, `subprocess.run([sys.executable,
    <script>], ...)` capturing exit + stdout (COMPOSITION -- it does NOT
    import or re-implement probe logic; X2/R5). `status = GREEN` iff EVERY
    exit == 0; else `RED`. If a script path does not exist -> `RED` + an
    explicit `PHASE-1/2 GAP: <script> missing -- not patched here (R5/X2)`
    line. Write the validation record (locked schema) to
    `data/detection/acceptance-validated-<fork>.json`. On RED: print a LOUD
    operator-facing banner + return non-zero up the call chain (the D18
    LOUD-fallback; the D22 gate then suppresses signal).
  - [ ] `_acceptance.py` `run_stage2(descriptor) -> stamp_set`: precondition
    `run_stage1` GREEN (else stamp_set has empty confirmed lists + a LOUD
    "stage-1 RED -> zero level-3" line and return). Invoke
    `descriptor.proxy` (the Task-2 script) as a subprocess; non-zero ->
    `proxy:FAIL` -> EMPTY confirmed lists (the broken-pin -> zero-level-3
    HARD sub-gate -- D19) + a LOUD sub-gate line. Proxy PASS: build the
    runtime cmdlist/cvarlist name sets by SHELLING OUT to the BANKED
    extraction the Task-2 `version-pin-proxy.sh` exposes (the
    `front1-diff.sh` `norm()` + line-range pipeline, path-repointed exactly
    as Task 2) -- NEVER a Python reimplementation of those sed/awk/grep
    lines (R6 reuse-not-reinvent; the detection README's "do NOT reinvent
    it" is decisive; no different parser); for each Phase-3-populated row at
    the pinned-dump version apply the Task-1-locked conservative mapping;
    write
    `level3-stamp-set-<pin>.json` (locked schema). Mutate NOTHING in the DB
    here (the loader applies the stamp-set -- X9 loader-path; Task 4).
  - [ ] `_acceptance.py` `route_by_level(dump_confirmation: str|None) ->
    str`: pure, total, no I/O -- the Task-1-locked three-way predicate.
    Identical for both tracks (no track/feeder branch).
  - [ ] `_acceptance.py` `validation_record_ok(fork, current_pin) -> bool`:
    read `acceptance-validated-<fork>.json`; True ONLY iff present AND
    `status==GREEN` AND `validation_commit==current_pin`. Any read failure
    -> False (fail-safe-closed -- D22/X4). Pure read; no write.
  - [ ] `accept-runtime-truth.py` (the ezQuake instantiation): mirror the
    `verify-unified-output.py` house idiom (shebang + docstring, `HERE` /
    `REPO_ROOT` path constants, `argparse`, `def main() -> int`,
    `sys.exit(main())`). Build the ezQuake descriptor (Task-1-locked),
    `--stage` arg (`1` | `2` | `all`, default `all`), run the shared
    stages, print `STAGE 1 GREEN`/`STAGE 2 GREEN`/`STAGE 3 OK` (or the LOUD
    RED/FAIL banner) mirroring the Phase-1/2 GREEN-print idiom. Exit 0 only
    when every requested stage is GREEN. This is the SINGLE ezQuake
    instantiation; no other fork is wired (D2/D22).
  - [ ] `extractor_lib/tests/test_acceptance.py`: unit-test the PURE
    pieces -- `route_by_level` (all three inputs incl. None);
    `run_stage1`'s all-or-nothing aggregation (mock two probe exits:
    0+0->GREEN, 0+1->RED, missing-script->RED); the stage-2 conservative
    mapping (Track A genuine-dead absent->L3 / present->stay-L2 +
    overridden-count; build-excluded->stay-L2; Track B present->L3 /
    absent->stay-L2). Sibling of
    `extractor_lib/tests/test_help_json_blame.py` (house test location).
- **Verification (X2 -- this phase's own output + Phases-1-3 shipped
  artifacts only; NEVER Phase 5):**
  ```
  cd /home/paradoks/projects/quakeworld/apps/qw-oracle
  python3 -c "import sys; sys.path.insert(0,'scripts/extractors');
   import extractor_lib._acceptance as a;
   print(a.route_by_level('dump-confirmed')=='autonomous-eligible',
         a.route_by_level('high-confidence-generalized')=='assistant-only',
         a.route_by_level(None)=='no-signal')"
  python3 -m pytest scripts/extractors/extractor_lib/tests/test_acceptance.py -q
  # full ezQuake harness at the pin (requires Phase-1/2 probe scripts shipped):
  python3 scripts/extractors/ezquake/accept-runtime-truth.py --stage all ; echo "exit=$?"
  ```
  PASS condition: the routing print is `True True True`; the pytest passes
  incl. the all-or-nothing + conservative-mapping cases; the harness exits 0
  with `STAGE 1 GREEN` / `STAGE 2 GREEN` / `STAGE 3 OK` and writes
  `acceptance-validated-ezquake.json` (status GREEN, commit `3f9e724f`) +
  `level3-stamp-set-3f9e724f.json` (proxy PASS, non-empty confirmed lists).
  FAIL condition: any pytest failure; the harness re-implements probe logic
  instead of subprocess-composing it (X2/R5 violated); a stage-2 DB
  mutation here (must be loader-path -- X9); a level-3 stamp written when
  the proxy FAILed.
- **Execution mode:** `subagent (Opus medium)` -- multi-file judgment-dense
  synthesis against the Task-1 LOCKED shape (not architecturally open --
  Task 1 locked it; the Phase-1 shared-module + ezQuake-harness split is the
  precedent to mirror). Correctness-critical (a wrong all-or-nothing lets a
  broken mechanism ship; a wrong cross-check stamps a false level-3 ->
  autonomous-published-verdict consumer) and knowledge-breadth over the
  recon facts > raw speed. Opus medium per X6 ("Opus medium when knowledge
  breadth matters more"; mirrors the approved Phase-3 Task-3 grading
  rationale exactly).

### Task 4 -- Wire the D22 structural enforcement + the stage-2 level-3 stamp into the loader + the F1 level-3-pinned-only probe

- **Depends on:** Task 3 (`_acceptance.validation_record_ok` + the stamp-set
  artifact must exist before the loader can consult them). Sequential within
  the phase; not auto-parallelizable.
- **Goal:** Bind the acceptance gate to the pipeline structurally: the
  Phase-3 emit/loader seam consults the validation record (RED/absent ->
  NO signal, LOUD, today's pipeline), and the Track-A/B loaders apply the
  stage-2 stamp-set (slot-3 -> `dump-confirmed`) idempotently at the
  pinned-dump version; the F1 grid gains the level-3-pinned-only assertion
  Phase 3 deferred.
- **Files:** `ezquake/emit_callgraph_signal.py`,
  `load-knowledge/load-callgraph-reachability.ts`,
  `load-knowledge/load-hud-commands.ts`, `load-knowledge/load-version.ts`,
  `load-knowledge/quality-grid.ts`, `load-knowledge/quality-grid.test.ts`
  (all modified -- Phase-3-created/extended).
- **Steps:**
  - [ ] **D22 gate in `emit_callgraph_signal.py`.** Before the additive
    10th-file write, call the equivalent of
    `_acceptance.validation_record_ok('ezquake', <current pin from
    oracle_meta>)`. True -> proceed exactly as Phase 3 (additive, X3-safe).
    False -> write NOTHING + a LOUD `D22 GATE: ezquake not mechanism-
    validated at <pin> -> NO Track-A signal (today's pipeline). status=
    <RED|absent|wrong-commit>` line. This REUSES the existing Phase-1
    fail-safe path (the passenger already disables on exception biasing to
    today's pipeline -- Phase-1 Task 2); it adds NO new exception machinery
    (Phase-2-Task-2 consistency). The 8 F6 byte-identical stems are
    untouched either way (X3).
  - [ ] **Stage-2 stamp in `load-callgraph-reachability.ts`.** When (and
    only when) `validation_record_ok` is GREEN AND
    `level3-stamp-set-<pin>.json` exists with `proxy:PASS` AND the loaded
    version is the pinned-dump version: for each name in
    `track_a_dump_confirmed`, write `dump_confirmation = "dump-confirmed"`;
    every other Track-A row keeps Phase-3's `high-confidence-generalized`.
    Re-write `conclusion` + `evidence` VERBATIM from the same Phase-1
    source (slot-3 is the ONLY field that differs L2 vs L3 --
    CARRY-FORWARD 1) through the SAME `upsertCvarVersion`/
    `upsertCommandVersion` ON CONFLICT path Phase 3 used (X9 -- NOT an
    in-place `UPDATE ... SET dump_confirmation`). `tx.json(...)` bind (the
    F1 gate -- never JSON.stringify).
  - [ ] **Stage-2 stamp in `load-hud-commands.ts`.** Same, for
    `track_b_dump_confirmed` -> `track_b_hud_recovery.dump_confirmation =
    "dump-confirmed"`; absent-from-dump rows stay level-2 (D21 nothing
    withheld -- still a first-class command entity, just not autonomously
    trusted). Commands only (R7 -- unchanged from Phase 3).
  - [ ] **Wire in `extract-tag.ts`.** [F14 DATED CORRECTION 2026-05-18:
    was `load-version.ts` -- WRONG site; the live stamp-set wiring is
    `scripts/load-knowledge/extract-tag.ts` (`resolveStageTwoStampSet`, 3e
    Track-B / 3f Track-A); `load-version.ts` is byte-untouched. See the
    F12+F14 dated block at the top of this MD.] One additive site: pass the
    stamp-set (when the gate is GREEN + the version is pinned) into the
    Track-A overlay + Track-B adapter. The per-type loader order +
    overlay-after-per-type-loaders ordering are Phase-3's -- unchanged.
  - [ ] **F1 level-3-pinned-only in `quality-grid.ts`.** Extend
    `F1.runtime_fidelity_shape` (do NOT add a competing probe -- Phase 3
    owns it; extend it per the Phase-3 explicit deferral): any row with
    `dump_confirmation = 'dump-confirmed'` is well-formed ONLY when its
    version is the pinned-dump commit recorded in
    `acceptance-validated-ezquake.json`; a `dump-confirmed` at a non-pinned
    version FAILS. Pure read-only SQL + the validation-record pin; the
    established probe shape.
  - [ ] **F1 test in `quality-grid.test.ts`.** Add: a `dump-confirmed`-at-
    pinned row PASSes; a `dump-confirmed`-at-non-pinned row FAILs; a
    Phase-3-style level-2 row still PASSes (no regression to Phase-3's
    cases).
- **Verification (the actual commands -- not prose; X2 -- own output +
  Phases-1-3 only):**
  ```
  cd /home/paradoks/projects/quakeworld/apps/qw-oracle
  # 1. GREEN path: harness + extract + load, then stage-2 stamped L3
  python3 scripts/extractors/ezquake/accept-runtime-truth.py --stage all
  # [F12 DATED CORRECTION 2026-05-18: was `index.ts load-version ...` --
  #  WRONG subcommand (hard-throws). Correct working invocation below;
  #  see the F12+F14 dated block at the top of this MD.]
  bun scripts/load-knowledge/index.ts extract-tag --project ezquake --version head --force --skip-release-notes
  PSQL="docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc"
  $PSQL "SELECT DISTINCT track_a_reachability->>'dump_confirmation'
         FROM cvar_versions WHERE track_a_reachability IS NOT NULL;"
  $PSQL "SELECT e.name, cv.track_a_reachability->>'conclusion',
         cv.track_a_reachability->>'dump_confirmation'
         FROM cvar_versions cv JOIN entities e ON e.id=cv.entity_id
         WHERE e.project='ezquake' AND e.name_fold IN
           ('sb_qtvlist_url','gl_outline_scale_world','cl_bobhead');"
  # 2. slot-3-only: conclusion/evidence byte-identical to the Phase-3 write
  #    (capture Phase-3-state JSONB before Task-4 load; diff after; the only
  #     changed key is dump_confirmation -- CARRY-FORWARD 1)
  # 3. broken-pin -> ZERO level-3
  cp apps/qw-oracle/data/detection/level3-stamp-set-3f9e724f.json /tmp/ok-stamp.json
  head -c 4000 apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt > /tmp/bd.txt
  # (run accept-runtime-truth.py stage 2 against /tmp/bd.txt via the descriptor
  #  override; expect proxy FAIL -> empty confirmed lists), then re-load:
  $PSQL "SELECT count(*) FROM cvar_versions
         WHERE track_a_reachability->>'dump_confirmation'='dump-confirmed';"
  # 4. failed-probe -> LOUD no-signal
  #  (force one Phase-1/2 probe RED, run accept-runtime-truth.py, re-extract+load)
  $PSQL "SELECT count(*) FROM cvar_versions WHERE track_a_reachability IS NOT NULL;"
  # 5. F1 + X3
  npm run load-knowledge -- quality-grid --project ezquake
  # [F12 DATED CORRECTION 2026-05-18: bare `bun test` fails the
  #  qw_oracle_test DB guard -- canonical form below; see the F12+F14
  #  dated block at the top of this MD.]
  DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test scripts/load-knowledge/quality-grid.test.ts
  # 6. X9 PATH probe -- the stamp routes through the upsert ON CONFLICT
  #    path, NOT a bare in-place UPDATE (a state check alone cannot tell
  #    them apart -- this grep is the positive X9 evidence):
  ! grep -nE "UPDATE[[:space:]]+(cvar_versions|command_versions)[[:space:]]+SET" \
      scripts/load-knowledge/load-callgraph-reachability.ts \
      scripts/load-knowledge/load-hud-commands.ts \
      scripts/load-knowledge/extract-tag.ts \
    && grep -qE "upsert(Cvar|Command)Version" \
      scripts/load-knowledge/load-callgraph-reachability.ts \
    && echo "X9 PATH OK (no bare UPDATE; routes through upsert ON CONFLICT)"
  # [F14 DATED CORRECTION 2026-05-18: third grep target was
  #  load-version.ts -> extract-tag.ts (the real wiring site); see the
  #  F12+F14 dated block at the top of this MD.]
  ```
  PASS condition: (1) `dump_confirmation` is a MIX of
  `high-confidence-generalized` + `dump-confirmed` (level-3 exists, and
  ONLY for dump-present names); the 3-gate entities carry the Phase-1
  self-validated conclusions UNCHANGED with the correct stamped level
  (`sb_qtvlist_url` genuine-dead, level-3 IFF the dump confirms it absent --
  it is, per the proxy; `cl_bobhead` build-excluded, level-2);
  (2) only `dump_confirmation` differs vs the Phase-3 write -- conclusion +
  evidence byte-identical (CARRY-FORWARD 1); (3) broken pin -> the
  `dump-confirmed` count is `0` (the HARD sub-gate -- D19); (4)
  failed-probe -> `track_a_reachability` count is `0` (NO signal -> today's
  pipeline -- D18) AND a LOUD `D22 GATE` line was printed; (5)
  `F1.runtime_fidelity_shape PASS` incl. the level-3-pinned-only assertion;
  `bun test` passes; the 8 F6 stems still byte-identical (re-run the
  Phase-2 X3 `diff -q` loop); (6) `X9 PATH OK` prints (no bare
  `UPDATE <versions-table> SET` in the three loader files; the stamp routes
  through `upsert{Cvar,Command}Version`). FAIL condition: any in-place
  `UPDATE ... SET dump_confirmation` (X9 violated -- probe 6 catches it as a
  grep, not only as a state check); conclusion/evidence changed
  (CARRY-FORWARD 1 violated); a level-3 surviving a broken pin (D19
  violated); signal surviving a RED probe (D18 violated); any F6-stem diff
  (X3 violated).
- **Execution mode:** `subagent (Opus medium)` -- multi-file judgment-dense
  synthesis against the Task-1 locked shape + the live Phase-3 loader
  pattern: the cross-phase additive D22 gate (reuse the Phase-1/2 fail-safe;
  no new machinery), the X9 ON CONFLICT slot-3-only idempotent stamp, the
  conservative L3-vs-L2 discipline, the F1 extension. Correctness-critical
  (a wrong gate leaks signal on RED or suppresses it on GREEN; a wrong stamp
  ships a false autonomous level-3). Opus medium per X6 (mirrors the
  approved Phase-3 Task-3 grading rationale).

## Verification (phase boundary)

Operator runs, YES/NO. The acceptance/gate archetype verification FLOOR is
OPERATOR-RUN (not CI-only): each probe below is a copy-paste command the
operator executes at the phase boundary. All checks read ONLY Phases-1-3
shipped artifacts + this phase's own output -- never Phase 5 (X2; the
routing predicate is SHIPPED + TESTED here, Phase 5 CONSUMES it -- W4
guarded).

1. **Pin re-confirmed (prerequisites 2 / X8 -- run FIRST):**
   ```
   git -C research/repos/ezquake-source log -1 --format='%H'
   docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
     "SELECT value FROM oracle_meta WHERE key='ezquake:source_repo_commit';"
   ```
   PASS: both print `3f9e724fa608e516040f02b9557808ff3efda53e`. FAIL: they
   differ -- the dump cross-check is version-noise; STOP and re-pin/
   re-extract with the operator (do NOT proceed -- X8/W2).
2. **R6 version-pin proxy GREEN at the pin + trips on a broken pin (D19
   HARD sub-gate, R6 reuse):** run the Task-2 Verification block. PASS: the
   in-repo-dump run prints both `[PASS]` legs + `exit=0`; the broken-dump
   run prints a `[FAIL]` leg + non-zero exit; `front1-diff.sh` unmodified
   (`git diff --quiet apps/qw-oracle/data/detection/front1-diff.sh`). FAIL:
   the in-repo run not GREEN, the broken-dump run still exit 0, or the
   banked file perturbed.
3. **Harness GREEN at HEAD `3f9e724f` (D18 stage 1 + stage 2 + stage 3):**
   `python3 apps/qw-oracle/scripts/extractors/ezquake/accept-runtime-truth.py
   --stage all ; echo exit=$?` PASS: `STAGE 1 GREEN`, `STAGE 2 GREEN`,
   `STAGE 3 OK`, `exit=0`; `acceptance-validated-ezquake.json` has
   `status:GREEN` + `validation_commit:3f9e724f`;
   `level3-stamp-set-3f9e724f.json` has `proxy:PASS` + non-empty
   `track_a_dump_confirmed`/`track_b_dump_confirmed`. FAIL: any non-zero
   exit, any RED/FAIL banner, or the harness re-implements probe logic
   instead of subprocess-composing the Phase-1/2 scripts (X2/R5).
4. **Deliberately-failed probe -> LOUD fallback, NO signal (D18
   all-or-nothing):** temporarily make one Phase-1/2 probe exit non-zero
   (e.g. an env/arg the probe honors, or a copy with one assertion
   inverted -- do NOT edit the shipped probe), run
   `accept-runtime-truth.py`, then re-extract+re-load.
   `docker exec ... psql ... -tAc "SELECT count(*) FROM cvar_versions WHERE
   track_a_reachability IS NOT NULL;"` PASS: the harness exits non-zero with
   a LOUD banner; the validation record is `status:RED`; the count is `0`
   (NO signal -- exactly today's pipeline); the 8 F6 stems byte-identical.
   FAIL: signal populated despite a RED probe, or no LOUD banner, or soft
   per-gate degradation (NOT all-or-nothing).
5. **Deliberately-broken pin -> ZERO level-3 (D19 HARD sub-gate):** run
   stage 2 against a tampered dump (Task-4 Verification step 3), re-load.
   `docker exec ... psql ... -tAc "SELECT count(*) FROM cvar_versions WHERE
   track_a_reachability->>'dump_confirmation'='dump-confirmed' UNION ALL
   SELECT count(*) FROM command_versions WHERE
   track_b_hud_recovery->>'dump_confirmation'='dump-confirmed';"` PASS: both
   counts `0` (every row stays Phase-3's level-2). FAIL: any `dump-confirmed`
   survives a broken pin.
6. **Slot-3 ONLY -- conclusion/evidence byte-identical to the Phase-3 write
   (CARRY-FORWARD 1):** capture `track_a_reachability` / `track_b_hud_
   recovery` for the 3-gate + radar entities AFTER a Phase-3-only load and
   AFTER the Phase-4 load; the ONLY differing JSON key is
   `dump_confirmation`. PASS: `conclusion` + `evidence` identical pre/post;
   only slot-3 changed. FAIL: any conclusion/evidence mutation (Phase 4 must
   never rewrite slots 1-2).
7. **Toggle-off == today's pipeline byte-for-byte (X3/X4):** with the
   Phase-1/2 booleans forced off, re-run extract+load; re-run the Phase-2
   X3 `diff -q` loop over the 8 F6 stems + `SELECT count(*) FROM
   cvar_versions WHERE track_a_reachability IS NOT NULL;` PASS: the loop
   prints nothing (8 stems byte-identical) and the count is `0` (no signal
   when off). FAIL: any stem diff or any populated signal when off.
8. **F1 GREEN incl. level-3-pinned-only + no regression:**
   `npm run load-knowledge -- quality-grid --project ezquake` and
   `DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun
   test scripts/load-knowledge/quality-grid.test.ts`. [F12 DATED CORRECTION
   2026-05-18: bare `bun test` fails the qw_oracle_test DB guard --
   canonical form above; see the F12+F14 dated block at the top of this MD.]
   PASS: `F1.runtime_fidelity_shape PASS` (incl. the new
   level-3-only-at-pinned assertion), `F1.jsonb_columns_not_strings PASS`,
   the test passes incl. the level-3-at-non-pinned FAIL case. [F15 DATED
   SCOPING 2026-05-18: the literal "no regression FAIL" is RECONCILED with
   Phase-4 scope exactly as F13 reconciled check-5, but with the OPPOSITE
   disposition. Phase-4's mandated `extract-tag --force` re-load (the
   first-ever re-load of tag `3f9e724f` since Phase-3 clean-loaded it)
   surfaces a PRE-EXISTING Phase-3-loader source_state idempotency
   divergence: exactly 12 Track-B bare-HUD commands flip
   `source_backed -> doc_only` (`F1.ezquake.floor.command_source_state`
   612/19/62 vs 624/7/62; `F1.ezquake.anchor.doc_only_count` 69 vs 57;
   `F1.cross_type_orphans` 12; command COUNT unchanged at 693). Orchestrator
   independently primary-source-verified NOT Task-4-caused (`natural-keys.ts
   upsertEntity` -- the source_state machine -- is NOT in the Phase-4 diff;
   `load-hud-commands.ts`'s `source_state:'source_backed'` write is
   byte-unchanged; the per-type command loader is untouched; the 12 names
   are simultaneously per-type-command-loader + Track-B-adapter targets on
   the same entity row, so the final state is clean-load-vs-reload
   order-dependent) and NOT a stale calibration (unlike F13's legitimate
   D21 growth -- this is a genuine violation of the "L1 extractors are
   idempotent" always-on rule). Disposition (operator-routed at the gate):
   do NOT recalibrate the floor to 612/19 (that bakes in the non-idempotent
   state); route as a separate Phase-3-loader-idempotency follow-up
   (review-findings F15; X9 re-extract not SQL UPDATE). The 3 F15-family
   regression FAILs are therefore SCOPED OUT of the Phase-4 boundary as a
   routed pre-existing blocker, NOT a Phase-4 defect; Phase 5 is BLOCKED
   until F15 is fixed + Phase-4 re-verified on a clean idempotent DB.] PASS
   for Phase-4's OWN F1 deliverables: `F1.runtime_fidelity_shape` (incl.
   level-3-pinned-only) + `F1.jsonb_columns_not_strings` GREEN +
   `command_count` 693. FAIL: the new assertion absent, OR any regression
   FAIL OUTSIDE the enumerated F15-family set (`cross_type_orphans`,
   `ezquake.floor.command_source_state`, `ezquake.anchor.doc_only_count`).
9. **X9 write-path -- the stamp is loader-path, not a bare UPDATE (a state
   check alone cannot tell them apart):**
   ```
   cd /home/paradoks/projects/quakeworld/apps/qw-oracle
   ! grep -nE "UPDATE[[:space:]]+(cvar_versions|command_versions)[[:space:]]+SET" \
       scripts/load-knowledge/load-callgraph-reachability.ts \
       scripts/load-knowledge/load-hud-commands.ts \
       scripts/load-knowledge/extract-tag.ts \
     && grep -qE "upsert(Cvar|Command)Version" \
       scripts/load-knowledge/load-callgraph-reachability.ts \
     && echo "X9 PATH OK"
   # [F14 DATED CORRECTION 2026-05-18: third grep target was
   #  load-version.ts -> extract-tag.ts (the real wiring site); see the
   #  F12+F14 dated block at the top of this MD.]
   ```
   PASS: `X9 PATH OK` prints (no bare `UPDATE <versions-table> SET` in the
   three loader files; the slot-3 stamp routes through the Phase-3
   `upsert{Cvar,Command}Version` ON CONFLICT path). FAIL: any bare
   `UPDATE ... SET` of a versions table -- the X9 in-place-repair instinct
   (re-run the corrected accept+extract+load, never UPDATE the rows).

If all PASS, operator proceeds to Phase 5. If any FAIL, consult Recovery.

## Outputs to next phase

State now true that was not before:

- `extractor_lib/_acceptance.py` exists: the SHARED three-stage contract
  (D17) -- stage-1 all-or-nothing composition runner, stage-2 proxy-gated
  conservative cross-check, the pure stage-3 `route_by_level` predicate, the
  D22 `validation_record_ok` gate. `ezquake/accept-runtime-truth.py` is the
  SINGLE ezQuake instantiation (D2/D22 -- no other fork wired).
- `data/detection/version-pin-proxy.sh` exists: the R6 path-portable
  reuse of `front1-diff.sh:33-36` (banked file unmodified); the HARD
  sub-gate D19 invokes.
- At HEAD `3f9e724f` with the toggles on: the harness is GREEN; the
  validation record is `status:GREEN`; the stamp-set has the
  dump-confirmed names; the loader has stamped `dump_confirmation =
  "dump-confirmed"` (level-3) for exactly the dump-confirmed pool/HUD rows
  and left every other populated row at Phase-3's `high-confidence-
  generalized` (level-2); conclusion + evidence are byte-identical to the
  Phase-3 write (CARRY-FORWARD 1). 8 F6 stems byte-identical (X3); toggle
  off == today's pipeline (X4).
- The D13 three-level spine is now FULLY realized in L1: level-1 (NULL),
  level-2 (mechanism ran, not dump-confirmed), level-3 (pinned-dump
  confirmed). `route_by_level` is SHIPPED + TESTED.
- Phase 5 (application outputs) CONSUMES: `route_by_level` -- Phase 5 calls
  it to GENERATE the level-3-only autonomous delete-list (D20 output 2) and
  to scope the level-2 assistant surface (D21); the stamped
  `dump_confirmation` it filters on; the feeder tag (D7.1/D15) Phase 5 tags
  each delete-list entry by. Phase 4 ships the routing PREDICATE only -- it
  does NOT generate the delete-list, makes NO first-class-emission change,
  does NO detection re-run (X7), does NO FTE/QWCL/MVDSV onboarding (D2/D22).
  Delete-list generation, first-class application, and any other-fork
  onboarding are Phase 5 / future arcs (X2/W4 / scope held).

## Open questions / deferred items

- **OQ-1 (prerequisites item 4 -- provenance) -- RESOLVED 2026-05-17
  (operator-ratified; provenance CLOSED via the F7 embedded-commit match,
  NOT a deferred human bless; orchestrator independently re-verified the
  embedded `~<sha>` vs `oracle_meta` + the R6 re-run vs primary source).
  Narrative below preserved as the record of the path.**
  - **Question:** item 4 is SECURED in-repo and the R6 proxy re-ran GREEN
    this drafting, but three sub-items were framed as Phase-4 boundary
    actions (prerequisites.md item 4 UPDATE): (a) re-run the R6 proxy vs
    the live DB at execution; (b) provenance attestation; (c) the drafter
    proposes the canonical path + wiring.
  - **Default chosen for now:** (a) is Verification probe 1+2 (the executor
    re-runs at execution -- this MD did the drafting-time re-run, recorded
    in Recon facts). (b) was originally framed as a human-only attestation
    on the (mistaken) premise that the dump carries no version banner --
    REFUTED by F7. (c) PROPOSED: the canonical home is
    `apps/qw-oracle/data/detection/` (already the git-tracked durable home;
    confirmed `git ls-files`); the wiring is Task 2 (`version-pin-proxy.sh`
    path-portable) + the descriptor `dump`/`proxy` paths (Task 1).
  - **Resolution (2026-05-17, operator-ratified):** **(b)** provenance is
    CONFIRMED via the embedded-commit match -- it is NOT a deferred human
    bless. prerequisites item 4 provenance is CLOSED, corroborated THREE
    independent ways: the embedded `~<sha>` self-certification (F7;
    orchestrator primary-source-verified) + the orchestrator R6 re-run
    GREEN 74/92/129 (both pin legs = `3f9e724f`) + the session-3
    byte-identical `cmp` of the dump vs its Windows source. The dump
    self-certifies its commit; the operator's "I ran the `3f9e724f` build"
    remains a welcome corroboration but is no longer the SOLE provenance
    basis. **(a)** the executor re-runs the proxy at execution
    (Verification 1+2) -- unchanged. **(c)** canonical path =
    `apps/qw-oracle/data/detection/` -- unchanged, adopted.
  - **Who can resolve:** RESOLVED -- operator-ratified (provenance CLOSED
    via F7 + the triple corroboration). (a) remains the Phase-4 executor's
    Verification 1+2 re-run.
- **OQ-2 (cross-phase additive touch of the Phase-3 emit/loader seam) --
  RESOLVED 2026-05-17 (operator-ratified; same precedent/shape as the
  operator-ratified Phase-3 OQ-1). Narrative below preserved as the record
  of the path.**
  - **Question:** Task 4 modifies the 6 Phase-3-created/extended files
    (`emit_callgraph_signal.py`, `load-callgraph-reachability.ts`,
    `load-hud-commands.ts`, `load-version.ts`, `quality-grid.ts`,
    `quality-grid.test.ts`) to add the D22 gate + the stage-2 stamp. It
    touches a prior phase's files.
  - **Default chosen for now:** ADDITIVE only -- the D22 gate is a
    fail-safe-closed precondition that, GREEN (as for ezQuake this arc), is
    a transparent pass-through (Phase-3 behaviour unchanged); the stage-2
    stamp is a slot-3-only ON CONFLICT write through the SAME idempotent
    path Phase 3 used (X9). It reuses the EXISTING Phase-1 fail-safe path /
    Phase-2 isolation -- no new exception machinery (the Phase-2-Task-2
    consistency discipline). This is the SAME shape Phase-3's OQ-1 took
    (additively touching Phase-1's `extract.py` through Phase-1's public
    contract, operator-ratified). The 8 F6 stems stay byte-identical (X3 --
    Verification 7 is the gate); toggle off == today's pipeline (X4).
  - **Resolution (2026-05-17, operator-ratified):** the cross-phase
    additive touch of the 6 Phase-3-created files is RATIFIED -- same
    precedent and shape as the operator-ratified Phase-3 OQ-1 (additive
    touch through the prior phase's public contract). Verification 7 (the
    X3 8-stem `diff -q` loop) is the structural guard; toggle off ==
    today's pipeline (X4). NO `decisions.md` amendment -- it is the
    acceptance CONTRACT's own enforcement seam (D17/D18/D22), inherently
    the seam Phase 4 owns.
  - **Who can resolve:** RESOLVED -- operator-ratified at the gate (flagged
    for transparency, not because a decision looked wrong).
- **OQ-3 (build-excluded stays level-2 -- the conservative cross-check
  reading of D20) -- RESOLVED 2026-05-17 (operator-ratified the
  conservative D3/D19 reading; NO decisions.md amendment). Narrative below
  preserved as the record of the path.**
  - **Question:** D20 output-1 says "every member [of the banked pool] gets
    its Track-A provenance populated (D15 conclusion + ... + D13 level)".
    Does a `build-excluded` member ever get stamped level-3 when the dump
    confirms its absence from THIS runtime?
  - **Default chosen for now:** NO -- `build-excluded` stays level-2. A
    single runtime dump is one build's runtime; it cannot confirm a
    cross-build "reachable in some other variant" verdict (D15: "D13 makes
    most versions level-2 where the breakdown is the only trust"). level-3
    is reserved for the autonomously-actionable direction (Track A
    genuine-dead the dump confirms absent; Track B name the dump confirms
    present). build-excluded is the human-gated bucket, NEVER the autonomous
    delete-list (D20) -- so its level does not change any autonomous
    behaviour; over-stamping it level-3 would be a confidence claim the
    single dump cannot support. This is the conservative reading (D3/D19);
    it does NOT contradict D20 (the member IS populated -- conclusion +
    feeder-tagged evidence + a D13 level; the level is 2, which is a valid
    populated level).
  - **Resolution (2026-05-17, operator-ratified):** build-excluded stays
    level-2 is RATIFIED -- the conservative D3/D19 reading. A single-build
    runtime dump cannot carry a cross-build verdict, so it cannot stamp a
    build-excluded member level-3. NO `decisions.md` amendment (the D13/D19
    level vocabulary is unchanged; this is the conservative READING of the
    existing lock, not a new semantic).
  - **Who can resolve:** RESOLVED -- operator-ratified the conservative
    reading at the gate. (Had the operator wanted build-excluded
    dump-confirmed at level-3, that would have been a dated `decisions.md`
    D13/D19 amendment -- it was not requested.)
- **OQ-4 (keep the banked `front1-diff.sh` vs rewrite it in place) --
  RESOLVED in-phase 2026-05-17 (the detection README's explicit "banked
  AS-IS, adapting is the Phase-4 job" + "do NOT reinvent" is decisive; S2
  reinforces it, does not perturb it). Unchanged by the round-2 delta.**
  - **Question:** R6 says reuse-not-reinvent the banked proxy; Task 2
    creates a NEW path-portable `version-pin-proxy.sh` and leaves
    `front1-diff.sh` byte-unchanged.
  - **Default chosen for now:** KEEP `front1-diff.sh` immutable (the
    detection README frames it as the lineage/provenance record; the
    orchestrator "deliberately did not rewrite [it] -- that would pre-empt a
    Phase-4 decision and risk perturbing a verified answer key"). The new
    proxy LIFTS its `:33-36` predicate verbatim in substance (reuse), it
    does not reinvent it. Verification 2 asserts `front1-diff.sh` unmodified.
    **S2 reinforces this:** the new PRIMARY embedded-SHA leg lives ONLY in
    `version-pin-proxy.sh`, NEVER in `front1-diff.sh` -- the banked file
    stays byte-immutable even as the proxy gets strictly stronger
    (Verification 2's `git diff --quiet` is the guard).
  - **Who can resolve:** RESOLVED in-phase (the detection README's explicit
    "banked AS-IS, adapting is the Phase-4 job" + "do NOT reinvent"
    instruction is decisive; S2 does not perturb it). Recorded for
    transparency.
- **Verification sub-agent outcome (Explore, run after drafting --
  2026-05-17; run FOR REAL, actual findings reported, no polished clean).**
  CRITICAL: none. SUBSTANTIVE: 2, both APPLIED (not rejected; neither
  contradicted `decisions.md`): (1) the X9 no-in-place-UPDATE intent was
  asserted but had no POSITIVE probe -- a state check cannot tell an ON
  CONFLICT write from a bare `UPDATE ... SET`; resolved by adding an X9
  PATH grep probe to Task 4 Verification step 6 + phase-boundary
  Verification 9 (no bare `UPDATE <versions-table> SET` in the three loader
  files; routes through `upsert{Cvar,Command}Version`). (2) Task 3's
  Opus-medium grade is correct ONLY if Task 1's Opus-MAX lock is complete
  first; resolved by adding explicit `Depends on:` gates to Task 3 (on Task
  1) and Task 4 (on Task 3) -- the grade itself stands (the sub-agent
  agreed; mirrors the approved Phase-3 Task-3 rationale). ADVISORY: 4 -- (1)
  Task-1 subagent output format unspecified -> added "structured PASS/FAIL
  shape-match report" to Task 1 Verification; (2) "RE-CHECKED this drafting"
  language confirmed correctly distinguished drafting-time vs executor-time
  (no action); (3) CARRY-FORWARD 1 repeated 13x is load-bearing, not a
  consistency defect (no action); (4) Goal/Outputs wording -> clarified
  Phase 4 ships the routing PREDICATE only, Phase 5 CONSUMES it to GENERATE
  the delete-list. The sub-agent independently re-verified against LIVE
  source: the pin `3f9e724f`, the dump line ranges
  (cmdlist 7-564 / cvarlist 571-3272 / macrolist 3276-3344),
  `front1-diff.sh:33-36` is the exact SANITY GATE claimed, the
  `verify-unified-output.py` house idiom, the three Phase-3 columns +
  slot-3 vocabulary + Phase-3's explicit level-3 deferral, 74/92/129,
  ASCII (no em/en-dash/emoji), and boundary scope (no Phase-5 / detection
  re-run / other-fork onboarding) -- all clean. No sub-agent finding
  contradicted `decisions.md`; no finding was rejected; no decision looked
  wrong; no deviation surfaced. Per `feedback_verify_dispatched_terminal_claims`
  the sub-agent's clean re-verification is a HYPOTHESIS, not the trust
  anchor -- the orchestrator independently re-verifies vs primary source at
  the phase boundary (the Phase-3 worked example: a sub-agent "confirmed"
  claim grep could not reproduce, settled only by a primary-source Read).
- **Verification sub-agent outcome -- ROUND 2 (bounded revision; Explore,
  FOCUSED re-verification of the delta only -- S1/S2/Recon/README/OQ; the
  round-1 clean sections were NOT re-litigated, per the revision prompt's
  drafting rules).** CRITICAL: none. SUBSTANTIVE: none. ADVISORY: 2 -- (1)
  the Task-2 Goal "asserted a prefix" could read as a design assertion ->
  APPLIED (reworded "asserted to be a prefix of"); (2) a slight redundancy
  in the ROUND-1 sub-agent-outcome block -> REJECTED as out-of-bounded-
  scope (that block is a clean round-1 section; the revision prompt forbids
  redrafting clean sections -- it is the record of round 1 and harmless).
  The sub-agent independently re-confirmed against LIVE source: S1 leaves
  stage 1 a pure COMPOSITION (the shell-out is stage-2-only; no re-authored
  probe logic; no Python parser reinvention -- R5/X2 intact); the S2 SHA
  leg is fail-closed (absent banner OR prefix-mismatch -> proxy FAIL ->
  ZERO level-3; the same D19 HARD sub-gate), ordered FIRST, the :33-36
  legs KEPT as secondary corroborators, framed as an F7-authorized
  R6-proxy strengthening NOT new stage-1 logic, pattern
  `ezQuake <ver> <build>~<hex>` with NO hardcoded line; `front1-diff.sh`
  byte-immutable (the `git diff --quiet` guard present); no D1-D22
  re-opened; the Recon bullet matches F7; the README-correction is
  draft-then-execute (planned, not executed); the OQ blocks do not
  over-claim or silently amend `decisions.md`; the other 8 operator-run
  probes unperturbed; ASCII clean; no Phase-5 / detection / other-fork
  creep. No finding contradicted `decisions.md`; none rejected on decision
  grounds; no decision looked wrong (a tightening, as expected). Per
  `feedback_verify_dispatched_terminal_claims` this clean re-verification
  is a HYPOTHESIS -- the orchestrator re-gates the DELTA at primary source
  (next block).
- **Orchestrator independent re-verification (2026-05-17; the trust anchor
  for this gate -- NOT the sub-agent's clean sweep).** Per
  `feedback_verify_dispatched_terminal_claims` the sub-agent's clean
  re-verification is a hypothesis until grep/SQL'd, so the load-bearing
  facts were re-checked against primary source (the X8/W2 discipline -- do
  NOT blind-trust the revision prompt): the R6 proxy independently re-run
  GREEN -- cvar CANDIDATES 92 / command CANDIDATES 74 / command reverse
  129 (dump 557/2700/68 runtime names), both pin legs = `3f9e724f`
  (`git -C research/repos/ezquake-source log -1` AND `oracle_meta
  ezquake:source_repo_commit` BOTH
  `3f9e724fa608e516040f02b9557808ff3efda53e`, re-checked live this
  revision); the F7 embedded banner re-confirmed against the live dump
  tail -- `ezQuake 3.7.0-dev 8084~3f9e724fa` in the post-macrolist tail
  (after `68/68 macros`), `~3f9e724fa` an EXACT prefix of both pin legs,
  sitting OUTSIDE all three `front1-diff.sh` ranges (7-564 / 571-3272 /
  3276-3344; macrolist ends 3344, dump is 3350 lines) so it never polluted
  the 74/92/129 diff; `front1-diff.sh:33-36` is the exact SANITY GATE the
  proxy lifts; no pre-existing acceptance module (`extractor_lib/` clean --
  no `_acceptance.py`); the `verify-unified-output.py` house idiom
  confirmed. The F7 embedded-banner finding is the gate catching what the
  detection README + the drafter Recon + the drafter (round-1) sub-agent
  ALL inherited unchecked -- the
  `feedback_verification_layer_catches_lift_residuals` shape (a
  verification gate's value is catching what every prior layer propagated
  without re-checking). S1 was routed-back-and-tightened (the Python-port
  escape hatch struck; shell-reuse of the banked extraction mandated). S2
  is operator-ratified (F7) -- the embedded-SHA banner is the proxy's
  PRIMARY hard sub-gate, an EXACT D19 leg strictly stronger than the
  heuristic legs, an R6-proxy strengthening NOT new stage-1 logic. No
  D1-D22 was amended; this is a tightening, no decision looked wrong.

## Recovery (if verification fails)

Per failure mode (X9: recovery is re-run the corrected accept+extract+load
pipeline end-to-end, NEVER an in-place SQL UPDATE of the bad rows -- the
slot-3 stamp is loader-populated; `UPDATE ... SET dump_confirmation` as a
repair is automatically the wrong instinct):

- **Pin moved (Verification 1 FAIL):** `git log -1` != `oracle_meta
  ezquake:source_repo_commit`. The dump cross-check is version-noise. STOP.
  Do NOT proceed -- re-pin `research/repos/ezquake-source` to the dump's
  commit OR re-capture the dump at the new pin (detection capture is out of
  scope -- X7; HAVING the matched dump is the precondition) with the
  operator. This is not a code bug.
- **Proxy not GREEN at the pin, or does not trip on a broken pin
  (Verification 2 FAIL):** the R6 path-port changed the predicate (it must
  be `front1-diff.sh:33-36` verbatim in substance -- only paths change). Or
  the banked `front1-diff.sh` was perturbed (provenance). Restore the exact
  banked predicate; re-point ONLY paths; re-run. Never weaken the SANITY
  GATE to make it pass.
- **Harness re-implements probe logic (Verification 3 FAIL, X2/R5):** the
  composition runner inlined Track-A/B assertions instead of
  subprocess-invoking the shipped `verify-*-probes.py`. Replace with
  subprocess composition; the probe LOGIC is Phase-1/2's, immutable here. A
  MISSING probe script is a Phase-1/2 gap -- surface LOUD, do NOT author the
  probe here (R5/X2 -- bounce to the owning phase).
- **Signal survives a RED probe (Verification 4 FAIL, D18):** the D22 gate
  is not fail-safe-closed -- `validation_record_ok` returned True on a RED
  record, or the emit/loader seam did not consult it. The gate must reuse
  the existing Phase-1 fail-safe path (disable -> today's pipeline) and be
  closed by default. Fix the gate; re-run accept+extract+load; re-verify.
  Never "soft-degrade per gate" -- D18 is all-or-nothing.
- **level-3 survives a broken pin (Verification 5 FAIL, D19):** stage 2
  stamped despite `proxy:FAIL`. The proxy is a HARD sub-gate -- `proxy:FAIL`
  MUST yield empty confirmed lists. Fix the stage-2 precondition; re-run;
  re-verify. Never stamp without a PASS proxy.
- **conclusion/evidence mutated (Verification 6 FAIL, CARRY-FORWARD 1):**
  Phase 4 rewrote slots 1-2. The stage-2 loader write must re-emit
  conclusion + evidence VERBATIM from the Phase-1/2 source and change ONLY
  `dump_confirmation`. Fix the loader mapping; re-run extract+load (X9);
  re-verify. Never patch the JSONB in place.
- **X3 stem diff / unrelated row mutated (Verification 7 FAIL):** the D22
  gate or the stage-2 stamp wrote into an existing F6 stem or a non-signal
  row. The gate is additive-only (the 10th file / the slot-3 column); the
  per-type adapters change nothing else. Find the write, make it
  additive/slot-3-only, re-run accept+extract+load, re-diff. Do NOT
  post-process the JSON or patch the row.
- **F1 regression (Verification 8 FAIL):** a JSON.stringify slipped before
  a JSONB bind (use `tx.json(...)` -- `reference_postgres_js_jsonb_binding`)
  OR the level-3-pinned-only assertion is mis-scoped. Fix; re-run the
  loader; re-grid. Never lower the probe.
- **Unanticipated failure:** route to operator with the exact command,
  output, the validation record, the stamp-set, and the stored JSONB for
  the 3-gate + radar entities -- do not improvise a fix that mutates
  existing rows, the 8 byte-identical stems, or the Phase-1/2 mechanism.
