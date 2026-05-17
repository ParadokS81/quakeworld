# Phase 5 -- Application outputs (the arc completes; both North-Star directions met for ezQuake)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` IN FULL (D1-D22 + the D7/D11 amendments + X1-X10 +
>    non-goals). The brainstorm is closed -- do NOT re-open a D; if a D looks
>    wrong, surface a deviation block and STOP. -- DONE; no D looks wrong.
>    Phase 5 is governed by D1, D2, D13, D16, D20, D21 + X1-X10 (drafter
>    prompt); it owns review-findings role "APP": R4 (delete-list
>    regenerates the in-repo artifact byte-shape), F2 (use 74/92/129),
>    W2, W4. -- DONE.
> 2. Read `review-findings.md`; identify the F/R/W rows whose owning phase
>    role is this phase. Phase 5 = role "APP": F2, F6 (X3 stems on the
>    end-to-end run), R4 (OWN), W2, W4. -- DONE.
> 3. Recon the LIVE source before inlining anything. -- DONE; see "Recon
>    facts (verified)". The X8/W2 sanity gate was RE-RUN against the live
>    DB this drafting and re-derived EXACTLY 74 cmd / 92 cvar / 129 reverse.
> 4. After drafting, dispatch the verification sub-agent. -- DONE; findings
>    applied, see "Open questions".

> **No deviation -- all Phase-5 premises re-verified TRUE 2026-05-17.**
> The prior-phase discipline (a refuted premise -> dated `decisions.md`
> amendment + operator ratification, NEVER a silent phase-MD override -- the
> D7/D11/Phase-4-OQ-3 worked examples) was applied. Phase 5's load-bearing
> premises were checked against live source and do NOT fire a deviation:
> - **`route_by_level` IS the Phase-4-SHIPPED predicate (augmentation pt 1).**
>   The APPROVED Phase-4 MD ships `extractor_lib/_acceptance.py` with the
>   pure total `route_by_level(dump_confirmation) -> "autonomous-eligible" |
>   "assistant-only" | "no-signal"`, TESTED in
>   `extractor_lib/tests/test_acceptance.py`, explicitly "CONSUMED by
>   Phase 5". Phase 5 CALLS it; it does NOT re-implement level routing, does
>   NOT re-run the dump cross-check, does NOT re-decide genuine-dead (the
>   dump cross-check ALREADY happened in Phase 4 -- a Phase-5 re-derivation
>   is the X2/R5 composition violation the arc forbids). The file does not
>   yet exist on disk (Phases 1-4 are APPROVED PLANS, not executed) -- that
>   is expected; Phase 5 is the PLAN that consumes the plans' deliverables,
>   exactly as Phase 4 drafted against the Phase-1/2/3 plans.
> - **The dump_confirmation STAMP is Phase-4-written, READ here (pt 2).**
>   Phase 4's loader writes `dump-confirmed` (level-3) for EXACTLY the
>   dump-confirmed pool/HUD rows and leaves every other populated row at
>   Phase-3's `high-confidence-generalized` (level-2). Phase 5 FILTERS on
>   this stamp via `route_by_level`; it is read, never recomputed.
> - **F2 74/92/129 RE-DERIVED LIVE this drafting (X8/W2 -- load-bearing).**
>   The banked `front1-diff.sh` predicate was re-executed against the
>   in-repo dump + the live DB: command CANDIDATES 74 / cvar CANDIDATES 92 /
>   command reverse 129; SANITY GATE both legs PASS. The live
>   `ezquake-runtime-dead-entities.md` "How these were found" prose carries
>   a KNOWN-STALE "97 cvars / 74 commands" (the pre-mini-arc figure -- F2 /
>   augmentation pt 6); the regenerated artifact MUST emit the
>   F2-authoritative re-verified figure (92 cvars / 74 commands), NOT 97.
> - **F7 embedded-SHA + the detection-README correction are Phase-4's, not
>   Phase 5's (pt 3).** The dump self-certifies its commit at line 3347
>   (`ezQuake 3.7.0-dev 8084~3f9e724fa`; `~3f9e724fa` an exact prefix of the
>   pin). Phase 4 owns the version-pin proxy + the detection-README "R6"
>   correction; Phase 5 does NOT touch them. The live artifact's "commit
>   verified == source HEAD, zero version skew" prose already reflects the
>   embedded-SHA truth -- the regenerated "How these were found" preserves
>   that shape.
> - **build-excluded is PERMANENTLY level-2, structurally absent from the
>   delete-list (pt 4 / D20 / Phase-4 OQ-3, operator-ratified).** A
>   single-build runtime dump cannot carry a cross-build verdict;
>   `route_by_level` returns `assistant-only` for every build-excluded row
>   (it never reaches level-3), so the level-3 filter alone excludes it --
>   no special case needed.
> - **D21 NOTHING WITHHELD (pt 5).** Level-2 recovered commands ARE
>   first-class entities; the level gates AUTONOMOUS SHIP only, never
>   first-class EXISTENCE. Phase 5 does not gate the entity on
>   dump-confirmation.
> If any premise had been refuted this block would be a DEVIATION and the
> phase would STOP for an operator amendment. None was. (Two in-scope
> design judgments -- the Class-3 cmdline carry-forward and the per-entry
> prose-fidelity boundary -- are surfaced as OQ-1/OQ-2 with recommended
> defaults for operator ratification; they are Phase-5-scoped application
> choices, NOT refuted premises.)

## Goal

This phase delivers the two D20 Track-A application outputs + the D21
Track-B first-class assurance, completing the arc: both directions of the
North Star are met for ezQuake. **Output 1 (D20 output 1 -- the always-on
signal as a consumable surface):** the L1 fidelity signal is populated over
the WHOLE banked pool (74 commands + 92 cvars at HEAD `3f9e724f`) -- every
member carries its Track-A provenance (D15 conclusion + feeder-tagged
per-variant evidence + D13 level), sparse, per-version. The population
itself is Phase-3's loader overlay + Phase-4's level-3 stamp (Phase 5 adds
NO emission code -- augmentation: consume, do not re-implement); Phase 5
ships the APPLICATION-boundary gate that certifies the signal is a
complete, correct, consumable surface over the full pool (the F1
pool-coverage probe, the loader-port/backfill automated floor of this mixed
archetype). **Output 2 (D20 output 2 -- the narrow autonomous delete-list,
R4):** a new mechanism generator (`build-runtime-dead-entities.py` +
`extractor_lib/_runtime_dead_entities.py`, mirroring the
`build-help-json-pr-digest.py` / `_help_json_pr_digest.py` house idiom)
that queries the L1 Track-A signal, CALLS the Phase-4-shipped
`route_by_level`, keeps ONLY `autonomous-eligible` (level-3 `dump-confirmed`)
rows whose `conclusion == genuine-dead`, feeder-tags each entry by the
D7.1/D15 `evidence.feeder` (callgraph -> Class 1; commented-register ->
Class 2), and REGENERATES
`apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`
byte-shape-consistent with the in-repo artifact -- mechanism-generated, not
hand-written; build-excluded (incl. D5 address-taken residue) NEVER appears
(structurally, via the level-3 filter -- Phase-4 OQ-3). **Output 3 (D21 --
Track-B first-class assurance):** each recovered HUD command (bare `<name>`,
`+hud_<name>`, `-hud_<name>`) is verified a first-class L1 `command` entity,
element-linked (D16), level-stamped (level-3 where the pinned dump confirms,
level-2 elsewhere), NOTHING withheld -- the F1 first-class probe + the
phase-boundary SQL (Phase 3 owns emission; Phase 5 makes NO
first-class-emission change, it certifies the application boundary).
**Runnable, verifiable state at the phase boundary:** the full ezQuake
pipeline runs end-to-end (extract with the toggles on -> the Phase-4
acceptance harness -> load-version); the L1 signal spans the full 74/92
pool with correct provenance + D13 levels (F1 GREEN); the delete-list
regenerates byte-shape-consistent with the in-repo artifact, carries the
live-re-derived 92/74 figure (NOT the stale 97), contains ONLY level-3
feeder-tagged genuine-dead entries (zero build-excluded), and is
operator-eyeballed (the mixed-archetype OPERATOR-RUN higher floor) with the
automated byte-shape-diff probe stacked on top; the recovered commands are
first-class entities at level-2/3 with nothing withheld; F1 quality-grid
GREEN. Verification reads ONLY Phases-1-4 shipped artifacts + this phase's
own output -- this is the TERMINAL phase, nothing depends on it (X2 by
construction; there is no Phase 6 to collide with -- W4 vacuous here).

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

- **Pin holds (prerequisites 2 / X8 -- RE-CHECKED this drafting).**
  `git -C research/repos/ezquake-source log -1 --format='%H %s'` =
  `3f9e724fa608e516040f02b9557808ff3efda53e Merge pull request #1120 ...
  cleanup/help-json-drift`; `docker exec qw-oracle-postgres-dev psql ...
  SELECT value FROM oracle_meta WHERE key='ezquake:source_repo_commit'` =
  the SAME hash. Both pin legs match at drafting time. A moved pin at
  execution invalidates the level-3 stamp Phase 5 filters on (X8/W2) --
  STOP and re-pin/re-extract with the operator.
- **F2 pool RE-DERIVED LIVE (X8/W2 -- the load-bearing re-check).** The
  banked `apps/qw-oracle/data/detection/front1-diff.sh` predicate
  (`norm()` + the cmdlist 7-564 / cvarlist 571-3272 line ranges) was
  re-executed this drafting against the in-repo dump
  (`apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt`) +
  the live DB (`v.version='head'`). Result: `command CANDIDATES 74 /
  cvar CANDIDATES 92 / command reverse 129` (cvar reverse 4, macro 0);
  `[PASS] sb_qtvlist_url IN cvar candidate pool` AND `[PASS] no known-live
  cvar in candidate pool`. The F2-authoritative 74/92/129 confirmed LIVE
  (not asserted, not copied from spec; X7 satisfied -- this exercises the
  BANKED proxy against the BANKED dump, it is NOT a fresh detection
  capture). The regenerated artifact's pool figure MUST be **92 cvars /
  74 commands** (the live re-derivation), NEVER the stale 97 the live
  artifact carries.
- **Live `ezquake-runtime-dead-entities.md` byte-shape (R4 -- READ
  verbatim 2026-05-17).** Sections in order: H1 title
  `# ezQuake runtime-dead entities (code-bug report -> nano/slime)`; a
  3-line bold `**Status:** / **Channel:** / **Routing:**` block; `## How
  these were found (so the evidence is trustable)` (one paragraph; carries
  the STALE "97 cvars / 74 commands" + the embedded-SHA framing
  "`ezQuake 3.7.0-dev 8084~3f9e724fa` (commit verified == source HEAD,
  zero version skew)"); `## Class 1 -- orphaned-init cvar (registered in a
  function nothing calls)` (entry `### \`sb_qtvlist_url\`` with Declared /
  Registered / Enclosing function / a bold unreachability line /
  Disposition bullets); `## Class 2 -- commented-out registration (cvar
  declared, register line disabled)` (entry `### \`gl_outline_scale_world\``
  with Declared / Sole registration / Effect / Disposition);
  `## Class 3 -- orphaned cmdline params (declared in the X-macro table,
  never consumed)` (a prose lead-in + an 8-row `| flag | enum symbol |
  cmdline_params_ids.h | note |` table + a "Bonus tidy-up" paragraph +
  Disposition); `## Attribution` (the `Assisted-by: Claude:<model-id>` /
  DCO convention block). Feeder mapping (D7.1/D15): Class 1 == `callgraph`
  feeder (genuine-dead, registrar unreachable everywhere-compiled);
  Class 2 == `commented-register` feeder (genuine-dead, register-site
  cite); Class 3 == cmdline-param liveness (NEITHER call-graph feeder --
  see OQ-1).
- **`route_by_level` consumption contract (from the APPROVED Phase-4 MD --
  SHIPPED + TESTED there, CONSUMED here).** `extractor_lib/_acceptance.py`
  `route_by_level(dump_confirmation: str|None) -> str`: pure, total, no
  I/O; `"dump-confirmed"` -> `"autonomous-eligible"` (level-3);
  `"high-confidence-generalized"` -> `"assistant-only"` (level-2);
  `None` -> `"no-signal"` (level-1). Reads ONLY slot-3; no track/feeder
  branch. Phase 4 Outputs: "Phase 5 calls it to GENERATE the level-3-only
  autonomous delete-list (D20 output 2) and to scope the level-2 assistant
  surface (D21)". Phase 4 explicitly does NOT generate the delete-list,
  makes NO first-class-emission change, does NO detection re-run -- those
  are Phase 5.
- **Phase-4 stamp semantics (the level-3 contract Phase 5 filters on).**
  Stage-2 conservative mapping: Track A `conclusion genuine-dead` + name
  ABSENT from dump -> `dump-confirmed` (L3); name PRESENT -> stay L2
  (counted into `static_dead_overridden_by_dump`). Track A `conclusion
  build-excluded` -> stay L2 (Phase-4 OQ-3 operator-ratified: a single
  runtime dump cannot confirm a cross-build verdict; NEVER the autonomous
  delete-list -- D20). Track B name PRESENT in dump cmdlist ->
  `dump-confirmed` (L3); ABSENT -> stay L2 (still first-class -- D21).
  proxy:FAIL or stage-1 RED -> ZERO level-3 (everything stays L2). So the
  Phase-5 level-3 filter is exactly "dump-confirmed genuine-dead" for
  Track A; build-excluded is structurally unreachable by the filter.
- **Phase-3 signal shape Phase 5 reads (from the APPROVED Phase-3 MD).**
  Migration `014`: nullable JSONB `cvar_versions.track_a_reachability`,
  `command_versions.track_a_reachability`,
  `command_versions.track_b_hud_recovery`; D14 three-slot spine
  `{conclusion, evidence, dump_confirmation}`. Track-A callgraph evidence
  `{feeder:"callgraph", per_variant:{client,server,win,apple in
  reachable|unreachable|not-compiled}, address_taken_residue:bool}`;
  commented-register evidence `{feeder:"commented-register",
  register_site:{source_file, source_line}}`. Track-B evidence
  element-linked `{hud_element, hud_family in bare|plus|minus,
  registration_api, handler_fn, site:{source_file, source_line}}`,
  conclusion `bare-command|plus-minus-pair`. The Phase-1 `reachable()`
  evidence (and thus Phase-3's stored evidence) does NOT persist the
  registrar/enclosing-function name or the declared-line -- ONLY
  per_variant + residue (callgraph) OR register_site (commented-register).
  Entity declaration cites live in the `*_versions` rows (Phase-3 recon:
  "cites live in the `*_versions` rows"). See OQ-2 (per-entry prose
  fidelity = mechanism-templated from signal + L1 cite, NOT the original
  hand-authored investigative narrative).
- **House generator idiom (consistency target -- Ousterhout / X10).**
  `apps/qw-oracle/scripts/build-help-json-pr-digest.py` is the established
  shape for a `docs/upstream-prs/` generator: `#!/usr/bin/env python3` +
  module docstring; `REPO_ROOT = Path(__file__).resolve().parents[3]`;
  `sys.path.insert(0, str(REPO_ROOT / "apps/qw-oracle/scripts/extractors"))`;
  imports a render helper from `extractor_lib/`; `argparse`; idempotent
  `out_path.write_text(md, encoding="utf-8")`; `def main() -> int` +
  `if __name__ == "__main__": sys.exit(main())`. The render logic is split
  into `extractor_lib/_help_json_pr_digest.py` (a `render_*` helper) with a
  house test `extractor_lib/tests/test_help_json_pr_digest.py`. Phase 5's
  generator + render helper + test mirror this split exactly (do NOT invent
  a new pattern). `apps/qw-oracle/CLAUDE.md` "Excluded paths" already
  classes `docs/upstream-prs/` as auto-generated regenerable digests --
  the dead-entities artifact joins that house consistently.
- **F1 grid idiom (the F1-GREEN deliverable).** `quality-grid.ts`:
  `async function probe<Name>(ctx: ProbeContext): Promise<ProbeResult>`
  returning `{name:'F1.<x>', family, status:'PASS'|'FAIL', count, summary,
  examples}`, registered in the probe list ("Adding a probe: write a
  function returning ProbeResult, register it"). Phase 3 created
  `F1.runtime_fidelity_shape`; Phase 4 extended it with the
  level-3-pinned-only assertion. Phase 5 ADDS new probes (does not
  compete with or rewrite the Phase-3/4 probe -- it adds the
  application-boundary coverage assertions).
- **DB query transport (consistency target).** The banked `front1-diff.sh`
  reads the live DB via `docker exec -i qw-oracle-postgres-dev psql -U
  qworacle -d qw_oracle -tA -c "<sql>"`. Phase 5's generator uses the SAME
  invocation for its read-only signal query (consistency; no new DB
  client). The generator performs ZERO DB writes (it SELECTs the signal,
  writes a `.md` file) -- X9 is structurally satisfied (nothing to
  in-place-UPDATE).
- **Detection-README pre-F7 claim is Phase-4's to correct, NOT Phase 5's.**
  `apps/qw-oracle/data/detection/README.md` still carries the pre-F7 false
  "the dump carries NO embedded version banner ... rests entirely on the
  SANITY GATE" at drafting time (Phase 4 has not executed -- it is an
  APPROVED plan). Phase 4 Task 2 owns that correction (F7); Phase 5 does
  NOT touch the detection README or the version-pin proxy (augmentation
  pt 3 -- scope held).
- **Environment (prerequisites 1-3).** libclang extractor toolchain
  SATISFIED; `qw-oracle-postgres-dev` Up 13 days (healthy) -- REQUIRED by
  Phase 5 (the generator's signal query + F1 + the phase-boundary SQL run
  against it). Item 4 (durable dump) CLOSED in-repo
  (`apps/qw-oracle/data/detection/`, git-tracked) -- needed because Phase 5
  RUNS the Phase-4 harness end-to-end as a precondition for the level-3
  stamp it filters on.

## Inputs from previous phase

Phases 1, 2, 3, 4 are APPROVED and shipped before this phase starts. Phase 5
CONSUMES their deliverables; it shares NO mechanism code, authors NO level
routing, runs NO dump cross-check, makes NO first-class-emission change
(D1/X2 -- composition only). Hard inputs:

- From `prerequisites.md`: item 1 (extractor toolchain) SATISFIED -- confirm
  the pipeline runs end-to-end; item 2 (ezquake-source pinned `3f9e724f`)
  SATISFIED -- re-confirm at execution (STOP if moved -- X8/W2, it
  invalidates the level-3 stamp Phase 5 filters); item 3 (Postgres dev
  container) REQUIRED -- confirm `qw-oracle-postgres-dev` up; item 4
  (durable pinned dump + proxy) CLOSED -- Phase 5 RUNS the Phase-4 harness
  which needs it.
- From Phase 1: `extractor_lib/_callgraph.py` `reachable()` (conclusion /
  feeder / feeder-tagged evidence), GREEN per
  `ezquake/verify-callgraph-probes.py`; the `ENABLE_CALLGRAPH_PASSENGER`
  toggle. Phase 5 does NOT touch the call-graph mechanism (D1 no-blend).
- From Phase 2: `ezquake/_handler_hud.py` -> `ezquake-hud-commands-ast.json`
  (first-class HUD commands, element-linked), GREEN per
  `ezquake/verify-hud-probes.py`; the `ENABLE_HUD_COMMANDS_HANDLER` toggle.
- From Phase 3: migration `014` applied; `track_a_reachability` (on
  `cvar_versions` + `command_versions`) + `track_b_hud_recovery` (on
  `command_versions`) populated by the loader for the banked pool / HUD
  commands, slot-3 = `high-confidence-generalized` (level-2) for every
  populated row; the first-class HUD `command` entities (D21); F1
  `runtime_fidelity_shape`.
- From Phase 4: `extractor_lib/_acceptance.py` with the SHIPPED + TESTED
  pure `route_by_level`; `ezquake/accept-runtime-truth.py` (the ezQuake
  harness, GREEN at `3f9e724f`); `data/detection/version-pin-proxy.sh`;
  `data/detection/level3-stamp-set-3f9e724f.json`; the loader stamped
  `dump_confirmation = "dump-confirmed"` (level-3) for exactly the
  dump-confirmed pool/HUD rows, every other populated row at level-2;
  conclusion + evidence byte-identical to the Phase-3 write
  (CARRY-FORWARD 1); the F1 level-3-pinned-only assertion.

## Files touched

### Created

```
apps/qw-oracle/scripts/build-runtime-dead-entities.py
    # The autonomous delete-list generator (D20 output 2; R4). Mirrors the
    # build-help-json-pr-digest.py house idiom + location EXACTLY: shebang +
    # docstring; REPO_ROOT = parents[3]; sys.path.insert the extractors dir;
    # argparse --project; idempotent out_path.write_text; main()->int +
    # sys.exit(main()). Imports route_by_level from extractor_lib._acceptance
    # (Phase-4 SHIPPED predicate -- CONSUMED, never re-implemented). Queries
    # the L1 Track-A signal read-only via the house `docker exec ... psql`
    # invocation; filters level-3 genuine-dead; feeder-tags; delegates
    # rendering to _runtime_dead_entities. ZERO DB writes (X9 structural).
apps/qw-oracle/scripts/extractors/extractor_lib/_runtime_dead_entities.py
    # The render helper (mirrors _help_json_pr_digest.py split). Pure
    # rendering: takes the level-3 genuine-dead rows (feeder-tagged) + the
    # live-re-derived pool figure + the carried editorial blocks; emits the
    # byte-shape-consistent markdown (H1 / Status-Channel-Routing / How-these
    # -were-found with the corrected 92-74 + embedded-SHA framing / Class 1
    # callgraph / Class 2 commented-register / Class 3 cmdline CARRIED
    # verbatim per OQ-1 / Attribution). No I/O, no DB, no route logic.
apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_runtime_dead_entities.py
    # House test location (sibling of test_help_json_pr_digest.py). Unit
    # tests the PURE render helper: byte-shape (section headings + order),
    # per-entry feeder-tag -> Class mapping, level-3-only filter (a level-2
    # / build-excluded row never renders), the corrected pool figure (92
    # not 97), Class-3 + Attribution carried verbatim, ASCII-only output.
```

Generated at run time (NOT hand-authored; listed for completeness):

```
apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md
    # REGENERATED by build-runtime-dead-entities.py. It pre-exists; the
    # generator OVERWRITES it byte-shape-consistent (idempotent
    # write_text). Listed under Modified because the path pre-exists, but
    # it is a code OUTPUT, never a hand-edit (drafter prompt: a generator
    # is NOT inline-shaped; the .md is an OUTPUT of code).
```

### Modified

```
apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md
    # Regenerated (see above) -- the stale "97 cvars" corrected to the
    # live-re-derived 92; Class 1/2 mechanism-derived from the level-3
    # Track-A signal; Class 3 + Attribution + Channel/Routing carried
    # verbatim (OQ-1). Mechanism-generated, not hand-written.
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
    # Two NEW probes (register in the probe list; do NOT rewrite the
    # Phase-3/4 F1.runtime_fidelity_shape): F1.callgraph_signal_pool_
    # coverage (the Track-A signal spans the full banked pool with a
    # well-formed D13 level on every member; build-excluded is level-2;
    # level-3 only dump-confirmed genuine-dead) + F1.hud_recovery_first_
    # class (each recovered HUD command is a first-class type='command'
    # entity, element-linked, level-2-or-3, NOTHING withheld -- D21).
    # Pure read-only SQL, the established probe idiom.
apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts
    # Test rows for the two new probes (well-formed PASS; a missing-pool-
    # member / a build-excluded-stamped-level-3 / a withheld-level-2-HUD
    # row FAIL).
```

### Deleted

```
n/a -- purely additive. The generator OVERWRITES its own output
(ezquake-runtime-dead-entities.md); that is regeneration, not deletion.
The banked detection assets + the front1-diff.sh / version-pin-proxy.sh
are NOT touched (Phase-4-owned; immutable here). A deletion touching an
existing handler stem, an existing entity row, or any Phase-1-4 mechanism
would violate X3/D1.
```

## Tasks

### Task 1 -- Lock the delete-list byte-shape + the consumption contract (the application-output design)

- **Goal:** Produce the single authoritative shape + consumption contract
  so Tasks 2-3 synthesize against a locked spec, not a sketch: the exact
  byte-shape of the regenerated `ezquake-runtime-dead-entities.md` (sections
  + order + per-entry feeder-tagged layout, from the LIVE in-repo artifact),
  the `route_by_level` consumption contract (level-3-only; genuine-dead-only;
  build-excluded structurally excluded), the `evidence.feeder` -> Class
  mapping (D7.1/D15), the corrected pool figure (92/74 live-re-derived, the
  embedded-SHA/zero-skew framing preserved -- F7/augmentation pt 3), the
  Class-3 cmdline carry-forward decision (OQ-1), and the per-entry
  prose-fidelity boundary (OQ-2) -- all validated against the LIVE artifact
  + the APPROVED Phase-3/4 contracts + the live signal shape.
- **Files:** none written in this task -- it produces the locked block this
  MD already states (below) and that the subagent re-validates against the
  live artifact + the APPROVED Phase-3/4 MD "Outputs" + live schema.
- **Steps:**
  - [ ] Re-read the LIVE `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-
    dead-entities.md` and the APPROVED Phase-3/4 MD "Outputs"; confirm
    verbatim: the section structure (Recon facts byte-shape bullet), the
    `route_by_level` enum contract, the Phase-3 evidence shape (per_variant
    + residue / register_site; NO persisted registrar -- OQ-2), the
    Phase-4 level-3-only-genuine-dead / build-excluded-stays-L2 stamp.
  - [ ] Lock the **regenerated byte-shape** (mechanism-generated; each
    Class-1/2 entry feeder-tagged D7.1/D15):
    ```
    H1: "# ezQuake runtime-dead entities (code-bug report -> nano/slime)"
    **Status:** Verified, ready to route upstream. <regen-date>.
    **Channel:** <carried editorial block -- verbatim from the shipped artifact>
    **Routing:** <carried editorial block -- verbatim>

    ## How these were found (so the evidence is trustable)
       <regenerated prose>: Source HEAD `3f9e724f` (#1120 merge);
       the embedded-SHA/zero-skew framing PRESERVED
       ("ezQuake 3.7.0-dev 8084~3f9e724fa (commit verified == source HEAD,
       zero version skew)" -- F7/augmentation pt 3); the broader candidate
       pool figure = the LIVE-re-derived "92 cvars / 74 commands"
       (NEVER the stale 97 -- F2/augmentation pt 6); states this report is
       the level-3 dump-confirmed genuine-dead subset, mechanism-generated
       from the L1 Track-A signal at the pin.

    ## Class 1 -- orphaned-init cvar (registered in a function nothing calls)
       per level-3 genuine-dead row with evidence.feeder=="callgraph":
       ### `<name>`
       - Declared: `<source_file>:<source_line>` (from the entity's
         `*_versions` cite -- the L1 row, NOT the signal)
       - Reachability: client=<S> server=<S> win=<S> apple=<S>
         (the D5 per_variant breakdown -- unreachable in every compiled
         variant; address-taken residue=<bool>)
       - Disposition (maintainer call): <templated per-feeder line>

    ## Class 2 -- commented-out registration (cvar declared, register line disabled)
       per level-3 genuine-dead row with evidence.feeder=="commented-register":
       ### `<name>`
       - Declared: `<source_file>:<source_line>` (L1 row cite)
       - Sole registration: `<register_site.source_file>:<register_site.
         source_line>` (commented out; from evidence.register_site)
       - Disposition: <templated per-feeder line>

    ## Class 3 -- orphaned cmdline params (declared in the X-macro table, never consumed)
       <CARRIED VERBATIM from the shipped artifact -- the prose lead-in,
       the 8-row table, the Bonus tidy-up, the Disposition; PLUS a one-line
       provenance note: "Class 3 is the cmdline-consumer-presence feeder
       (cmdline-liveness), a SEPARATE concern from the call-graph mechanism
       -- carried from the prior verified artifact, not call-graph-derived;
       see decisions.md non-goals / the cmdline-liveness parked sibling."
       -- OQ-1>

    ## Attribution
       <CARRIED VERBATIM -- the Assisted-by:/DCO convention block>
    ```
  - [ ] Lock the **`route_by_level` consumption contract** (augmentation
    pt 1 -- CONSUMED, never re-implemented): for each `track_a_reachability`
    row at the pinned version, the delete-list includes the entry IFF
    `route_by_level(row.dump_confirmation) == "autonomous-eligible"` AND
    `row.conclusion == "genuine-dead"`. `build-excluded` rows are
    structurally excluded (Phase-4 stamps them L2 -> `route_by_level`
    returns `"assistant-only"` -> the filter drops them; NO build-excluded
    special-case, NO build-excluded ever in the artifact -- D20 / Phase-4
    OQ-3 / augmentation pt 4). Track-B `track_b_hud_recovery` is NEVER
    consulted by the delete-list generator (D1/D20 -- the delete-list is
    Track-A ONLY; recovered commands are a separate first-class output,
    D21 -- the no-blend is structural: the generator's signal query
    SELECTs only `track_a_reachability`).
  - [ ] Lock the **feeder -> Class mapping** (D7.1/D15): `evidence.feeder
    == "callgraph"` -> Class 1 (orphaned-init / unreachable-everywhere-
    compiled); `evidence.feeder == "commented-register"` -> Class 2
    (commented-out registration). A level-3 genuine-dead row whose feeder
    is neither is an ERROR (loud) -- the two feeders are exhaustive for
    Track-A genuine-dead (D7.1).
  - [ ] Lock the **OQ-1 Class-3 carry-forward** (recommended default,
    operator-ratifiable): cmdline params are a SEPARATE entity type
    (`cmdline_param`, `ezquake-cmdline-params-ast.json`) with NO
    `track_a_reachability` column (D12/D15 -- the Track-A signal is on
    cvar/command versions ONLY); they are detected by the
    `cmdline-liveness` Front-2 consumer-presence pass which the detection
    README + decisions explicitly say is "NOT part of the call-graph
    mechanism -- do not fold it in". R4 (byte-shape, incl. the Class-1/2/3
    layout -- augmentation pt 6) requires the Class-3 section present;
    D20 scopes the AUTONOMOUS mechanism to feeder-a + feeder-b only;
    silently dropping shipped Class-3 content is a Chesterton's-fence
    violation. RESOLUTION: the render helper carries the Class-3 +
    Attribution + Channel/Routing editorial blocks as FIXED template
    constants (sourced once from the shipped artifact at this lock), with
    a one-line provenance note marking Class 3 a separate non-call-graph
    feeder. This satisfies R4 (byte-shape) AND D20 (autonomous mechanism =
    feeder-a/b only; Class 3 explicitly NOT a new autonomous claim) AND X7
    (no detection re-run, no new cmdline feeder) AND non-goals (the
    cmdline-liveness arc is a parked sibling). Surface for operator
    ratification (the D7/D11/Phase-4-OQ-3 worked precedent).
  - [ ] Lock the **OQ-2 per-entry prose-fidelity boundary** (recommended
    default, operator-ratifiable): the Phase-1 `reachable()` evidence (and
    thus Phase-3's stored evidence) persists ONLY per_variant + residue
    (callgraph) OR register_site (commented-register) -- it does NOT
    persist the registrar/enclosing-function name or the declared-line, and
    it does NOT persist the original artifact's hand-authored investigative
    narrative ("QTVList_Init appears exactly once ... dead since ~2010").
    RESOLUTION: the generator renders the byte-SHAPE (sections, per-entry
    feeder-tagged evidence, the Class-1/2/3 + Attribution layout --
    augmentation pt 6 "regenerate the SHAPE ... byte-consistent, NOT a
    license to reproduce the stale 97") from the signal + the entity's L1
    `*_versions` declaration cite + a TEMPLATED per-feeder disposition
    line; it does NOT fabricate or hand-copy the editorial investigative
    narrative (that would be inventing facts the signal does not carry).
    Faithfully reproducing the narrative would require Phase 3's evidence
    shape to additionally persist the registrar -- a Phase-3 schema change,
    OUT of Phase-5 scope (a decisions amendment + Phase-3 redraft), REJECTED
    not deferred (augmentation: Phase 5 consumes the shipped contract, does
    not rebuild it). The regenerated artifact is honest that it is
    mechanism-generated from the L1 signal at the pin; the operator
    eyeballs it at the mixed-archetype higher floor.
- **Verification:** the subagent (dispatch brief at the scaffold bottom)
  independently re-derives the byte-shape + the consumption contract from
  the LIVE artifact + the APPROVED Phase-3/4 MD "Outputs" + live schema and
  produces a STRUCTURED PASS/FAIL shape-match report (mirrors the Phase-3/4
  Task-1 re-derivation -- prose alone is not the deliverable). PASS: every
  locked shape FAIL-free; the subagent confirms the shape matches the live
  artifact + D20/D7.1/D15/D13/D21 + the Phase-4 `route_by_level` contract
  with no CRITICAL/SUBSTANTIVE.
- **Execution mode:** `subagent (Opus MAX)` -- THE cross-cutting
  application-output contract design (X6; the SAME Opus-MAX-lock precedent
  Phase-3 Task-1 + Phase-4 Task-1 used, both APPROVED + orchestrator-
  re-verified): the delete-list is an AUTONOMOUS PUBLISHED VERDICT consumed
  UNSEEN by nano/slime (the strict-bar consumer --
  `reference_rigor_bar_follows_consumer`); a wrong byte-shape, a wrong
  level filter, or a wrong Class-3/prose reconciliation ships a wrong
  "delete this" upstream PR. The drafter prompt's "Sonnet medium" is
  explicitly scoped to the generator+loader SYNTHESIS (Task 2-3) -- the
  same lock/synthesis split Phase 3/4 used; the contract DESIGN +
  R4-vs-D20/OQ reconciliation is architecturally load-bearing and
  correctness-critical.

### Task 2 -- Build the generator + the render helper (synthesis against the Task-1 locked shape)

- **Depends on:** Task 1's subagent-validated locked shape (sequential
  within the phase -- Task 2 does NOT start before Task 1's lock is
  subagent-confirmed; mirrors the Phase-4 Task-3 `Depends on:` gate).
- **Goal:** Implement the Task-1-locked shape: a read-only generator that
  CONSUMES `route_by_level`, queries the L1 Track-A signal, filters
  level-3 genuine-dead, feeder-tags, and regenerates the artifact
  byte-shape-consistent -- mirroring the `build-help-json-pr-digest.py` /
  `_help_json_pr_digest.py` house split exactly.
- **Files:** `apps/qw-oracle/scripts/build-runtime-dead-entities.py`,
  `apps/qw-oracle/scripts/extractors/extractor_lib/_runtime_dead_entities.py`
  (created).
- **Steps:**
  - [ ] `_runtime_dead_entities.py` (the PURE render helper, no I/O / no
    DB / no route logic): `render_dead_entities(level3_callgraph_rows,
    level3_commented_rows, pool_figure, regen_date) -> str`. Carries the
    Class-3 + Attribution + Channel/Routing editorial blocks as FIXED
    module-level template constants (the Task-1-locked verbatim text +
    the OQ-1 one-line provenance note). Emits the Task-1-locked byte-shape;
    per Class-1 entry: name + `Declared: file:line` + the D5 per_variant
    breakdown + `address_taken_residue` + the templated disposition; per
    Class-2 entry: name + Declared + `Sole registration: file:line`
    (commented out) + the templated disposition. ASCII only (X10): `--`
    for dashes, no em/en-dash, no emoji.
  - [ ] `build-runtime-dead-entities.py` (mirror the
    `build-help-json-pr-digest.py` idiom EXACTLY): shebang + module
    docstring; `REPO_ROOT = Path(__file__).resolve().parents[3]`;
    `sys.path.insert(0, str(REPO_ROOT / "apps/qw-oracle/scripts/extractors"))`;
    `from extractor_lib._acceptance import route_by_level`;
    `from extractor_lib._runtime_dead_entities import render_dead_entities`;
    `argparse` (`--project`, default `ezquake`; `--version`, default
    `head`); `def main() -> int`; `if __name__ == "__main__":
    sys.exit(main())`.
  - [ ] Generator body: query the L1 signal read-only via the house
    `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle
    -tA -c "<sql>"` (the front1-diff.sh transport -- consistency, no new
    DB client) -- SELECT name + `track_a_reachability` for
    `cvar_versions` and `command_versions` WHERE `track_a_reachability IS
    NOT NULL` at the requested version, JOINed to `entities` (project,
    type, name) + the entity's `*_versions` declaration cite. For each
    row: `keep = route_by_level(row.track_a_reachability['dump_confirmation'])
    == "autonomous-eligible" and row.track_a_reachability['conclusion'] ==
    "genuine-dead"`. Partition the kept rows by
    `track_a_reachability['evidence']['feeder']`: `"callgraph"` -> Class 1;
    `"commented-register"` -> Class 2; anything else -> raise LOUD (the
    two feeders are exhaustive -- D7.1). The generator NEVER SELECTs
    `track_b_hud_recovery` (D1/D20 structural no-blend).
  - [ ] Compute the pool figure: the generator does NOT re-run detection
    (X7). It states the F2-authoritative live-re-verified figure
    (`92 cvars / 74 commands`) as a constant sourced from the X8/W2 Recon
    re-run (the executor re-confirms it via the phase-boundary sanity-gate
    re-run -- the SAME X8/W2 discipline every phase applies; it is NOT a
    fresh detection capture). Pass it to `render_dead_entities`.
  - [ ] `out_path = REPO_ROOT / "apps/qw-oracle/docs/upstream-prs" /
    "ezquake-runtime-dead-entities.md"`; `out_path.write_text(md,
    encoding="utf-8")` (idempotent overwrite -- re-runs reproduce the
    same bytes from the same signal; the house pattern). Print a
    one-line stderr summary (entry counts per Class, pool figure).
- **Verification (X2 -- this phase's own output + Phases-1-4 shipped
  artifacts only; this is the TERMINAL phase, no later phase to collide):**
  ```
  cd /home/paradoks/projects/quakeworld/apps/qw-oracle
  # the generator is read-only; run it twice -- byte-stable (idempotent)
  python3 scripts/build-runtime-dead-entities.py --project ezquake
  cp docs/upstream-prs/ezquake-runtime-dead-entities.md /tmp/gen-1.md
  python3 scripts/build-runtime-dead-entities.py --project ezquake
  diff -q /tmp/gen-1.md docs/upstream-prs/ezquake-runtime-dead-entities.md \
    && echo "IDEMPOTENT (byte-stable re-run)"
  # ONLY level-3 genuine-dead; ZERO build-excluded; feeder-tagged sections
  grep -c '^### ' docs/upstream-prs/ezquake-runtime-dead-entities.md
  grep -nE '^## (Class 1|Class 2|Class 3|Attribution|How these)' \
    docs/upstream-prs/ezquake-runtime-dead-entities.md
  grep -n 'build-excluded' docs/upstream-prs/ezquake-runtime-dead-entities.md \
    && echo "FAIL: build-excluded leaked" || echo "PASS: no build-excluded"
  grep -n '92 cvars / 74 commands' docs/upstream-prs/ezquake-runtime-dead-entities.md \
    && echo "PASS: corrected pool figure"
  grep -n '97 cvars' docs/upstream-prs/ezquake-runtime-dead-entities.md \
    && echo "FAIL: stale 97 figure" || echo "PASS: not the stale 97"
  LC_ALL=C grep -nP '[^\x00-\x7F]' docs/upstream-prs/ezquake-runtime-dead-entities.md \
    && echo "FAIL: non-ASCII (em/en-dash/emoji -- X10)" || echo "PASS: ASCII clean"
  ```
  PASS condition: the second run is byte-identical to the first
  (idempotent); the section headings appear in the Task-1-locked order;
  every `### ` entry sits under Class 1 or Class 2; `no build-excluded`;
  `corrected pool figure` (92, never 97); ASCII clean. FAIL condition: a
  non-idempotent re-run; any `build-excluded` string; the stale 97; any
  non-ASCII; the generator re-implements `route_by_level` instead of
  importing it (X2/augmentation pt 1); any `track_b_hud_recovery` read in
  the generator (D1 blend).
- **Execution mode:** `subagent (Sonnet medium)` -- the drafter prompt's
  explicit grading ("the delete-list generator + signal-population loader
  synthesis Sonnet medium"); mechanical code synthesis against the Task-1
  LOCKED shape + the `build-help-json-pr-digest.py` house idiom (not
  architecturally open -- Task 1 locked it). Sonnet-medium floor per X6.

### Task 3 -- The F1 application-boundary probes + tests (signal pool-coverage + Track-B first-class)

- **Depends on:** Task 1's locked shape (the level vocabulary + pool the
  probes assert). Independent of Task 2 (probes read the DB signal, not the
  generated .md).
- **Goal:** Ship the F1 gates that certify the application surface: the
  Track-A signal spans the full banked pool with a well-formed D13 level on
  every member (build-excluded level-2; level-3 only dump-confirmed
  genuine-dead), and every recovered HUD command is a first-class
  level-2-or-3 entity with NOTHING withheld (D21). Extend the grid; do NOT
  rewrite the Phase-3/4 `F1.runtime_fidelity_shape`.
- **Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`,
  `apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts` (modified).
- **Steps:**
  - [ ] `F1.callgraph_signal_pool_coverage` (new probe, registered in the
    probe list -- the house idiom): assert every pool member's
    `track_a_reachability` at the pinned version has a `dump_confirmation`
    in `{high-confidence-generalized, dump-confirmed}`; NO
    `conclusion='build-excluded'` row carries `dump_confirmation=
    'dump-confirmed'` (build-excluded is permanently level-2 -- Phase-4
    OQ-3 / D20); a `dump-confirmed` row's `conclusion` is `genuine-dead`.
    Pure read-only SQL. (It does NOT re-run detection or assert the raw
    74/92 counts -- X7/X2; it asserts the shape + level discipline of
    whatever the Phase-3/4 loader populated. The 74/92 raw count is the
    phase-boundary X8/W2 sanity-gate re-run, not an F1 probe -- avoids
    importing the Phase-4 answer key into F1, W4.)
  - [ ] `F1.hud_recovery_first_class` (new probe): every entity that
    carries `track_b_hud_recovery` is `type='command'`,
    `source_state='source_backed'`, has a non-empty
    `evidence.hud_element`, and `dump_confirmation` in
    `{high-confidence-generalized, dump-confirmed}` (level-2 OR level-3 --
    NEVER NULL for a recovered command: D21 nothing withheld; a level-2
    recovered command is still first-class). NO `track_b_hud_recovery` on
    `cvar_versions` (structural D11/R7 -- the column does not exist there).
  - [ ] Extend `quality-grid.test.ts`: a well-formed pool member + a
    well-formed level-2 + level-3 HUD command PASS; a build-excluded-
    stamped-level-3 row, a pool member with NULL/garbage level, and a
    recovered-HUD-command with NULL `dump_confirmation` (withheld) each
    FAIL.
- **Verification:**
  ```
  cd /home/paradoks/projects/quakeworld/apps/qw-oracle
  npm run load-knowledge -- quality-grid --project ezquake
  bun test scripts/load-knowledge/quality-grid.test.ts
  ```
  PASS condition: the grid prints `F1.callgraph_signal_pool_coverage PASS`
  + `F1.hud_recovery_first_class PASS` + the Phase-3/4
  `F1.runtime_fidelity_shape PASS` + `F1.jsonb_columns_not_strings PASS`,
  no regression FAIL; the test file passes incl. the new FAIL cases. FAIL
  condition: any regression FAIL, the new probes absent from the grid
  output, or a new probe rewriting (not extending) the Phase-3/4 probe.
- **Execution mode:** `subagent (Sonnet medium)` -- probe + test authoring
  against the locked level vocabulary + the established `quality-grid.ts`
  idiom; reasoning, not architecture. Sonnet-medium per X6 (the same
  grading Phase-3 Task-4 / Phase-4 Task-4 F1 work used).

## Verification (phase boundary)

Operator runs, YES/NO. This is a MIXED archetype -- the signal-population
half is loader-port/backfill (automated floor), the delete-list regen ships
to nano/slime UNSEEN (the strict-bar autonomous consumer); the boundary
takes the HIGHER (OPERATOR-RUN) floor (augmentation pt 7). **The operator
eyeballing the regenerated artifact (check 6) is MANDATORY and is the
floor; the automated byte-shape-diff probe (check 5) stacks ON TOP -- it
does NOT replace the operator review.** All checks read ONLY Phases-1-4
shipped artifacts + this phase's own output -- this is the TERMINAL phase,
nothing depends on it (X2; no Phase 6 -- W4 vacuous).

1. **Pin re-confirmed (prerequisites 2 / X8 -- run FIRST):**
   ```
   git -C research/repos/ezquake-source log -1 --format='%H'
   docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
     "SELECT value FROM oracle_meta WHERE key='ezquake:source_repo_commit';"
   ```
   PASS: both print `3f9e724fa608e516040f02b9557808ff3efda53e`. FAIL: they
   differ -- the level-3 stamp Phase 5 filters is version-noise; STOP and
   re-pin/re-extract with the operator (X8/W2).
2. **X8/W2 sanity-gate re-run -> 74/92/129 (the pool figure the artifact
   states):** re-run the banked `front1-diff.sh` predicate against the
   in-repo dump + the live DB (the Recon-facts re-run; exercises the
   BANKED proxy against the BANKED dump -- NOT a fresh detection capture,
   X7). PASS: `command CANDIDATES 74 / cvar CANDIDATES 92 / command
   reverse 129`; SANITY GATE both legs `[PASS]`. FAIL: any other figure,
   or a SANITY GATE `[FAIL]` -- STOP (the pin/dump disagree; X8/W2).
3. **Full pipeline runs end-to-end + the L1 signal spans the full pool:**
   ```
   cd /home/paradoks/projects/quakeworld/apps/qw-oracle
   python3 scripts/extractors/ezquake/accept-runtime-truth.py --stage all
   bun scripts/load-knowledge/index.ts load-version --project ezquake --version head --force
   PSQL="docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc"
   $PSQL "SELECT count(*) FROM cvar_versions    WHERE track_a_reachability IS NOT NULL;"
   $PSQL "SELECT count(*) FROM command_versions WHERE track_a_reachability IS NOT NULL;"
   $PSQL "SELECT track_a_reachability->>'conclusion',
          track_a_reachability->>'dump_confirmation', count(*)
          FROM cvar_versions WHERE track_a_reachability IS NOT NULL GROUP BY 1,2
          UNION ALL SELECT track_a_reachability->>'conclusion',
          track_a_reachability->>'dump_confirmation', count(*)
          FROM command_versions WHERE track_a_reachability IS NOT NULL GROUP BY 1,2;"
   ```
   PASS: the harness exits 0 (`STAGE 1/2 GREEN`, `STAGE 3 OK`); the
   Track-A signal is populated over the banked pool on both tables (the
   counts are consistent with 74 commands + 92 cvars given the
   conservative cross-check; the figure is not asserted exactly here --
   check 2 owns the raw pool count, X2/W4); every `build-excluded` row is
   `high-confidence-generalized` (level-2); `dump-confirmed` rows are all
   `genuine-dead`. FAIL: the harness non-zero, the signal not populated
   over the pool, any build-excluded at level-3, or any non-genuine-dead
   at level-3.
4. **F1 GREEN incl. the application-boundary probes (Task 3):**
   `npm run load-knowledge -- quality-grid --project ezquake` and
   `bun test scripts/load-knowledge/quality-grid.test.ts`. PASS:
   `F1.callgraph_signal_pool_coverage PASS`,
   `F1.hud_recovery_first_class PASS`, `F1.runtime_fidelity_shape PASS`,
   `F1.jsonb_columns_not_strings PASS`, no regression FAIL; the test
   passes incl. the new FAIL cases. FAIL: any regression FAIL or a new
   probe absent.
5. **Delete-list regenerates byte-shape-consistent, level-3-only, ZERO
   build-excluded, corrected figure, ASCII (the automated probe -- stacks
   ON TOP of check 6, does not replace it):** run the Task-2 Verification
   block. PASS: idempotent byte-stable re-run; section headings in the
   Task-1-locked order; every `### ` entry under Class 1 or Class 2; no
   `build-excluded` string; `92 cvars / 74 commands` present and `97`
   absent; ASCII clean; the generator imports `route_by_level` (does not
   re-implement it) and never reads `track_b_hud_recovery`. FAIL: any of
   the Task-2 FAIL conditions.
6. **OPERATOR EYEBALLS the regenerated artifact (the mixed-archetype
   FLOOR -- MANDATORY, not replaceable by check 5):** the operator opens
   `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`
   and confirms, by reading it as nano/slime would: Class 1 + Class 2 are
   the level-3 dump-confirmed genuine-dead set with credible per-entry
   feeder-tagged evidence (the per-variant breakdown / the register-site
   cite) and source cites that resolve; Class 3 is the carried cmdline
   block with the OQ-1 provenance note; the "How these were found" prose
   is honest (mechanism-generated, the corrected 92/74, the embedded-SHA/
   zero-skew framing); nothing reads as a false "delete this" accusation.
   PASS: the operator signs off the artifact as PR-ready to nano/slime.
   FAIL: the operator flags any entry as a possible false accusation, any
   missing/incoherent section, or any dishonest prose -- the artifact is
   NOT trusted; Recovery is consulted (a purely-automated sign-off here is
   itself a FAIL -- augmentation pt 7).
7. **D21 nothing withheld -- recovered commands first-class at level-2/3:**
   ```
   docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
    "SELECT e.name, e.type, e.source_state,
            cv.track_b_hud_recovery->>'dump_confirmation'
     FROM command_versions cv JOIN entities e ON e.id=cv.entity_id
     WHERE e.project='ezquake' AND cv.track_b_hud_recovery IS NOT NULL
       AND e.name_fold IN ('radar','+hud_radar','-hud_radar') ORDER BY 1;"
   ```
   PASS: all three are `command` / `source_backed` with
   `dump_confirmation` in `{high-confidence-generalized, dump-confirmed}`
   (NEVER NULL -- a level-2 recovered command is still first-class; D21
   the level gates autonomous SHIP only, never EXISTENCE). FAIL: any
   recovered command missing, not `command`, or with NULL
   `dump_confirmation` (withheld -- D21 violated).
8. **X3 non-corruption -- existing emission unchanged (W3/X3):** re-run
   the Phase-2 X3 `diff -q` loop over the 8 F6 byte-identical stems
   (passenger toggled off vs prior-HEAD output). PASS: the loop prints
   nothing (8 stems byte-identical -- Phase 5 added a post-load generator
   + read-only F1 probes; it touches NO extractor handler, so the 8 stems
   cannot move -- but it is ASSERTED, not claimed). FAIL: any stem diff
   (a Phase-5 change leaked into the extractor walk -- impossible by
   design; investigate, do not patch the diff).

If all PASS (incl. the MANDATORY operator eyeball, check 6), the arc is
COMPLETE -- both North-Star directions met for ezQuake. If any FAIL,
consult Recovery.

## Outputs to next phase

**There is no next phase. This is the TERMINAL phase; the arc COMPLETES
here.** State now true that was not before:

- `apps/qw-oracle/scripts/build-runtime-dead-entities.py` +
  `extractor_lib/_runtime_dead_entities.py` + its house test exist: the
  autonomous delete-list generator (D20 output 2) that CONSUMES the
  Phase-4 `route_by_level` (never re-implements it), filters level-3
  genuine-dead, feeder-tags (D7.1/D15), and regenerates
  `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`
  byte-shape-consistent -- the stale 97 corrected to the live-re-derived
  92, build-excluded structurally absent, Class 3 carried (OQ-1),
  operator-eyeballed PR-ready to nano/slime.
- The L1 Track-A signal is certified (F1.callgraph_signal_pool_coverage)
  a complete consumable surface over the full banked pool (74 cmd + 92
  cvar) with correct provenance + D13 levels, per-version, sparse (D20
  output 1).
- The recovered HUD commands are certified (F1.hud_recovery_first_class +
  the phase-boundary SQL) first-class L1 `command` entities,
  element-linked (D16), level-2-or-3, NOTHING withheld (D21).
- F1 quality-grid GREEN incl. the two new application-boundary probes; the
  8 F6 stems byte-identical (X3); the full pipeline runs end-to-end.
- **Both directions of the North Star are met for ezQuake**: L1 no longer
  SHOWS non-working entities (the level-3 delete-list is the autonomous
  ghost-elimination output) and no longer HIDES working commands (the
  recovered HUD commands are first-class). The arc is complete and useful
  at its boundary.
- **SEPARATE sequenced follow-ons -- do NOT start them (scope held):** the
  ezQuake help-JSON documentation-gap arc
  (`docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`)
  is the NEXT arc (genuine dependency: this arc produces the true entity
  set it consumes) -- it is NOT this arc. The FTE/QWCL/MVDSV ship is a
  per-fork gated follow-on (D2/D22), off by default, a separate future
  arc. No phase here onboards another fork or starts the doc-gap arc.

## Open questions / deferred items

- **OQ-1 (Class-3 cmdline carry-forward -- R4 byte-shape vs D20
  "core + commented-register only") -- RESOLVED 2026-05-17
  (operator-ratified the recommended default; orchestrator independently
  re-verified the basis vs primary source: cmdline params have NO
  `track_a_reachability` column per the Phase-3 locked shape, and
  prerequisites.md W1 / decisions non-goals explicitly say the
  cmdline-liveness pass is "NOT part of the call-graph mechanism -- do not
  fold it in"). Narrative below preserved as the record of the path.**
  - **Question:** the live artifact's Class 3 is orphaned cmdline params
    (`cmdline_param` entities, detected by the `cmdline-liveness` Front-2
    consumer-presence pass). They have NO `track_a_reachability` column
    (D12/D15 -- the Track-A signal is on cvar/command versions ONLY) and
    the `cmdline-liveness` pass is explicitly "NOT part of the call-graph
    mechanism -- do not fold it in" (detection README / decisions
    non-goals / prerequisites W1). R4 (byte-shape, incl. the Class-1/2/3
    layout -- augmentation pt 6) requires the Class-3 section present; D20
    scopes the AUTONOMOUS mechanism to feeder-a + feeder-b only. The
    generator cannot mechanism-derive Class 3 from the Track-A signal.
  - **Default chosen for now:** the render helper carries the Class-3 +
    Attribution + Channel/Routing editorial blocks as FIXED template
    constants (verbatim from the shipped artifact at the Task-1 lock),
    with a one-line provenance note marking Class 3 a SEPARATE
    non-call-graph (cmdline-consumer-presence) feeder carried from the
    prior verified artifact. This satisfies R4 (byte-shape) AND D20
    (autonomous mechanism = feeder-a/b only; Class 3 explicitly not a new
    autonomous claim) AND X7 (no detection re-run / no new cmdline feeder)
    AND non-goals (the cmdline-liveness arc is a parked sibling).
    Dropping Class 3 (Chesterton's-fence violation of shipped content) and
    building a third cmdline feeder (X7 / non-goals scope creep) are both
    REJECTED, not deferred.
  - **Resolution (2026-05-17, operator-ratified):** the recommended
    default is RATIFIED -- the render helper carries Class 3 + Attribution
    + Channel/Routing as fixed template constants with the one-line
    provenance note marking Class 3 a separate non-call-graph feeder.
    Satisfies R4 (byte-shape) + D20 (autonomous mechanism = feeder-a/b
    only) + X7 (no detection re-run) + non-goals. NO `decisions.md`
    amendment (a Phase-5-scoped application choice, not a refuted premise;
    the cmdline-liveness arc remains a parked sibling). Drop-Class-3
    (Chesterton's-fence regression of shipped upstream content) and
    build-a-cmdline-feeder (X7/non-goals scope creep) were the rejected
    alternatives.
  - **Who can resolve:** RESOLVED -- operator-ratified at the gate
    (surfaced one-at-a-time with the recommended default + plain-English
    consequences; the D7/D11/Phase-4-OQ-3 worked precedent). No silent
    `decisions.md` override; none needed.
- **OQ-2 (per-entry prose-fidelity boundary -- mechanism-templated vs the
  original hand-authored investigative narrative) -- RESOLVED 2026-05-17
  (operator-ratified the recommended default; orchestrator independently
  re-verified the load-bearing premise vs the Phase-3 MD locked shape:
  the persisted Track-A evidence is EXACTLY `{feeder, per_variant{client,
  server,win,apple}, address_taken_residue}` (callgraph) OR `{feeder,
  register_site}` (commented-register) -- it does NOT persist the
  registrar/enclosing-function/declared-line/narrative; the premise is
  TRUE, not fabricated). Narrative below preserved as the record of the
  path.**
  - **Question:** the Phase-1 `reachable()` evidence (Phase-3-stored)
    persists ONLY per_variant + residue (callgraph) OR register_site
    (commented-register). It does NOT persist the registrar/enclosing-
    function name, the declared-line, or the original artifact's
    hand-authored narrative ("QTVList_Init appears exactly once ... dead
    since ~2010"). Can the generator reproduce the rich per-entry prose?
  - **Default chosen for now:** NO -- the generator renders the byte-SHAPE
    (sections, per-entry feeder-tagged evidence, the Class-1/2/3 +
    Attribution layout -- augmentation pt 6: "regenerate the SHAPE ...
    byte-consistent, NOT a license to reproduce the stale 97") from the
    signal + the entity's L1 `*_versions` declaration cite + a TEMPLATED
    per-feeder disposition line. It does NOT fabricate or hand-copy the
    editorial investigative narrative (inventing facts the signal does not
    carry would be the dishonest-KB failure this arc exists to prevent).
    The regenerated artifact is honest that it is mechanism-generated from
    the L1 signal at the pin; the operator eyeballs it at the
    mixed-archetype higher floor (check 6).
  - **Resolution (2026-05-17, operator-ratified):** the recommended
    default is RATIFIED -- the generator renders the byte-SHAPE + the
    per-variant signal evidence + the entity's L1 `*_versions` declaration
    cite + a templated per-feeder disposition; it does NOT fabricate or
    hand-copy the investigative narrative. This aligns with D15 (an
    auditable per-variant breakdown is a strictly stronger evidence form
    for a maintainer than bare prose). NO `decisions.md` amendment (a
    Phase-5-scoped application choice, not a refuted premise). Hand-copying
    the narrative (fabricated provenance -- the dishonest-KB failure this
    arc exists to prevent) and extending Phase-3 to persist the registrar
    (a Phase-3 schema change + decisions amendment + Phase-3 redraft, OUT
    of Phase-5 scope) were the rejected alternatives -- REJECTED not
    deferred.
  - **Who can resolve:** RESOLVED -- operator-ratified at the gate
    (surfaced one-at-a-time after the orchestrator verified the premise
    against the Phase-3 lock; recommended default + plain-English
    consequences). Phase 5 consumes the shipped contract, does not rebuild
    it.
- **Verification sub-agent outcome (Explore / Sonnet medium, run after
  drafting -- 2026-05-17; run FOR REAL, actual findings reported, no
  polished clean).** CRITICAL: none. SUBSTANTIVE: 1 -- APPLIED (not
  rejected; it did NOT contradict `decisions.md` -- it is an X10
  compliance defect in the draft itself): the Task-2 check-5 verification
  command embedded the literal em-dash + en-dash GLYPHS inside the grep
  pattern (to detect them) -- self-referentially non-ASCII in the MD
  source, an X10 violation. Resolved by splitting it into an ASCII
  `grep -n '97 cvars'` literal-figure check + a
  `LC_ALL=C grep -nP '[^\x00-\x7F]'` non-ASCII-byte check (the pattern is
  ASCII-only: `\x00-\x7F` is the ASCII range, anything outside is
  non-ASCII -- catches em/en-dash/emoji without embedding any). The drafter
  then independently re-ran `LC_ALL=C grep -nP '[^\x00-\x7F]'` over the
  WHOLE phase MD: PASS, fully ASCII-clean (the fix verified, and no other
  non-ASCII anywhere -- not trusting the sub-agent's single catch, per
  `feedback_verify_dispatched_terminal_claims`). ADVISORY: none (the
  sub-agent's "ADVISORY" list was 14 point-by-point CLEAN confirmations,
  not style findings). The sub-agent independently re-verified against
  LIVE source: the live artifact byte-shape (sections + order + the stale
  97 + the embedded-SHA framing), the `build-help-json-pr-digest.py` /
  `_help_json_pr_digest.py` / `test_help_json_pr_digest.py` house split
  (all three confirmed on disk), the `route_by_level` enum contract +
  Phase-4 level-3-only-genuine-dead / build-excluded-stays-L2 stamp, the
  Phase-3 evidence shape (no persisted registrar -- OQ-2 well-founded),
  74/92/129, the no-blend (generator never reads `track_b_hud_recovery`),
  the mixed-archetype operator-mandatory floor (check 6 not replaceable by
  check 5), execution-mode grades (Task 1 Opus MAX / Task 2-3 Sonnet
  medium, 0% inline), boundary scope (no help-JSON doc-gap arc start, no
  FTE/QWCL/MVDSV, no detection re-run, no `route_by_level` re-implement).
  No sub-agent finding contradicted `decisions.md`; the one SUBSTANTIVE
  was applied (a draft X10 defect, not a decision conflict); no decision
  looked wrong; no deviation surfaced (OQ-1/OQ-2 are Phase-5-scoped
  application choices with recommended defaults, NOT refuted premises).
  Per `feedback_verify_dispatched_terminal_claims` the sub-agent's clean
  re-verification is a HYPOTHESIS, not the trust anchor -- the operator +
  orchestrator independently re-verify vs primary source at the phase
  boundary (the Phase-3/4 worked example: a sub-agent "confirmed" claim
  grep could not reproduce, settled only by a primary-source Read).

## Recovery (if verification fails)

Per failure mode (X9: the generator is READ-ONLY on the DB -- it SELECTs
the signal and writes a `.md`; it performs ZERO DB writes, so an in-place
SQL UPDATE is never the repair. A wrong artifact = fix the generator/render
helper + re-run the deterministic generator. A wrong L1 signal = re-run the
corrected extract+accept+load pipeline end-to-end, NEVER an in-place SQL
UPDATE):

- **Pin moved (check 1 FAIL):** `git log -1` != `oracle_meta`. The level-3
  stamp Phase 5 filters is version-noise. STOP. Re-pin / re-capture with
  the operator (detection capture is out of scope -- X7; HAVING the
  matched dump is the precondition). Not a code bug.
- **Sanity gate not 74/92/129 (check 2 FAIL):** the pin/dump disagree, OR
  the banked predicate was perturbed. STOP -- this is the Phase-4 answer
  key; do NOT weaken the gate. Re-confirm the dump + pin with the operator
  (X8/W2).
- **Harness non-zero / signal not over the pool (check 3 FAIL):** a
  Phase-1-4 deliverable regressed, OR the toggles were off. Phase 5
  authors NO mechanism -- bounce to the owning phase (R5/X2). Re-run
  accept+extract+load; do NOT patch the signal here.
- **F1 regression (check 4 FAIL):** a new probe rewrote (not extended)
  the Phase-3/4 probe, or a JSON.stringify slipped before a JSONB read
  (`reference_postgres_js_jsonb_binding`). Fix the probe; re-grid. Never
  lower a probe.
- **Delete-list byte-shape / level / figure wrong (check 5 FAIL):** the
  generator filtered wrong (build-excluded leaked == the level-3 filter or
  `route_by_level` import is wrong), mis-tagged a feeder, emitted the
  stale 97, or is non-idempotent. Fix `build-runtime-dead-entities.py` /
  `_runtime_dead_entities.py`; RE-RUN the generator (it is deterministic
  from the signal). If `route_by_level` itself misbehaves, that is a
  Phase-4 bug -- bounce to Phase 4 (X2/R5); do NOT re-implement routing
  here (augmentation pt 1).
- **Operator flags a false accusation / incoherent artifact (check 6
  FAIL -- the mixed-archetype FLOOR):** a level-3 entry the operator does
  not trust means either the Phase-4 stamp is wrong (bounce to Phase 4 --
  the dump cross-check is Phase 4's, not Phase 5's) or the render is
  dishonest (fix the render helper; re-run). NEVER ship the artifact on a
  purely-automated sign-off (augmentation pt 7). NEVER hand-edit the
  generated `.md` to make the operator pass -- regenerate from a corrected
  generator.
- **A recovered command withheld / not first-class (check 7 FAIL):** a
  level-2 recovered command is missing or has NULL `dump_confirmation`.
  That is a Phase-3 emission / Phase-4 stamp bug (D21 nothing withheld) --
  bounce to the owning phase; re-run extract+accept+load. Phase 5 makes
  NO first-class-emission change.
- **X3 stem diff (check 8 FAIL):** impossible by design (Phase 5 touches
  no extractor handler) -- if it fires, a Phase-5 change unexpectedly
  reached the extractor walk. Find the write, make Phase 5 post-load /
  read-only again, re-run, re-diff. Do NOT patch the diff.
- **Unanticipated failure:** route to operator with the exact command,
  output, the generated `.md`, and the stored Track-A/B JSONB for the
  level-3 entities + the radar HUD commands -- do not improvise a fix that
  mutates existing rows, the 8 byte-identical stems, the Phase-1-4
  mechanism, or hand-edits the generated artifact.
