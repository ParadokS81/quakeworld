# Post-arc handoff -- game-content-catalog -> arc-reviewer (2026-06-14)

**For:** a FRESH terminal running **`arc-reviewer`**. The fresh-terminal
requirement is structural -- this handoff was written by the orchestrator
session that drove all five phases and is anchored on what executed; the
reviewer's value is reading the spec + shipped state COLD and rendering an
honest DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING verdict per spec
section. Do NOT trust this doc's "all green" framing -- re-derive it.

## What shipped (one line)

The qw-oracle `gameplay_*` Layer 1 catalog is complete: id1 baseline
audited + re-verified, 15 id1 monsters added, the KTX hardcoded-override
layer (26 rows) added, map join-keys wired, and the conventions documented in
SCHEMA.md + VALIDATION-RUNBOOK.md. SHIPPED 2026-06-14, tag
`arc-game-content-catalog-shipped`.

## Reads required (in order)

1. **Spec:** `docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md`
   (D1-D7 + M1-M5) -- the contract to grade against.
2. **Scaffold:** `docs/superpowers/plans/2026-06-11-game-content-catalog/`
   -- `README.md` (phase index, all `shipped`), `decisions.md` (22 decisions
   incl. the D22 cvar-gate amendment + the D16 gate-lift), `review-findings.md`
   (F1-F22 -- the trap catalog + execution findings), the five phase MDs, the
   five `phase-N-executor-prompt.md` files (the actual execution prompts, with
   the orchestrator's per-phase augmentations -- these show what was asked).
3. **Per-phase findings ledgers:** `phase-1-findings.md` (audit corrections +
   115-candidate gap disposition), `phase-2-findings.md` (per-monster stats +
   wiki cross-check), `phase-3-findings.md` (delta ledger). (Phase 0 + 4 have
   no separate ledger by design -- their record is the phase MD + review-findings.)
4. **Retrospective:** `apps/qw-oracle/docs/arc-history.md` top entry
   (2026-06-14) -- the orchestrator's narrative; grade it against the spec, do
   not adopt it.
5. **Arc-history precedent for the review shape:** the QTV+QWFWD post-arc
   analysis (`docs/superpowers/reviews/2026-06-06-qtv-qwfwd-l1-extraction-post-arc-analysis.md`).

## Shipped commits (data/code; orchestrator doc commits omitted)

- Phase 0: `d5e8f8eb` (loader + probes + v1.06 tree) + `bab08857` (bounce-back: RED typecheck + wrong-branch fix).
- Phase 1: `9853adfd` (audit + 12 Tier-1 gap rows + probe decoupling).
- Phase 2: `2e2a788a` (15 monster rows + wiki snapshot).
- Phase 3: `29f5605f` (F11 taxonomy-ref fix) + `7ffc240d` (26 override rows).
- Phase 4: `7b8789b7` (map_summary_key + conventions docs + verify-gameplay F4 + snapshot).

## Live end-state (verified by the orchestrator at each boundary -- RE-VERIFY COLD)

- id1: 52 entities (25 items / 15 monsters / 8 weapons / 4 projectiles) / 53 mechanics.
- ktx: 26 seed override rows (11 entity / 15 mechanic) + the extractor's 13 bloodfest monsters + taxonomies.
- citation-gate all-sources: `scanned=1025 unresolved=0`. Both seeds double-load idempotent. F1 grids 165/165 (`--project qw` + `--project ktx`). verify-gameplay.ts `all PASS`.
- The data-level mode-token join (catalog + mode_default + overrides under one token) works; `describe_mode` does NOT surface the override rows (F9, by design).

## Spec sections worth grading carefully (where shipped diverged or deferred)

- **Spec M4 / D16 (execution gate):** the spec gated execution on the first
  Track-A weapon-pair notes shipping. The operator LIFTED this 2026-06-12
  (D16 amendment) -- the arc executed without waiting. Grade as
  DELIVERED-DIFFERENT (the dependency was dropped by explicit operator
  decision, not skipped silently).
- **Spec M5 / D14 (surfacing, no new MCP):** Phase 4 regenerated the snapshot
  and confirmed the MCP surface needs nothing new -- BUT F9 found
  `describe_mode` does not include the new override rows. The arc asserts the
  data-level join instead (proven by raw SQL). Grade M5 as DELIVERED for what
  it scoped (verify, don't build) with F9 as a NAMED carry-forward, not a MISS.
- **Spec D2 (override scope):** D4 made the sweep exhaustive (deltas-not-knobs);
  the floor inventory was rediscovered + extended (31 candidates -> 26
  SME-gated rows, 2 dropped: k_classic_shotgun cosmetic, k_hitboxcheck_bullets
  `#ifdef HITBOXCHECK` dev plumbing). Check the drops match community reality.
- **Spec D1 (monsters):** 15 rows shipped. Note `monster_oldone` (Shub) carries
  live health 40000 (correct per `oldone.qc:283`, invulnerable-except-telefrag)
  where F17's prose said boss+oldone both null -- the DATA is right, the ledger
  prose simplified. Grade the data, flag the prose.

## Carry-forwards the reviewer must route (none blocked the ship)

1. **F9 -- describe_mode override surfacing.** Net-new MCP behavior (D14 forbade
   it this arc). Route to the OPEN HANDOVER entry "MCP realignment to KTX-era
   data (seeded 2026-05-30, fresh terminal not yet started)". **Disambiguation
   needed:** an `arc-mcp-ktx-realignment-shipped` git tag ALSO exists -- that was
   a PRIOR realignment (search_mechanics KTX-kind widening). Confirm the OPEN
   entry (not the shipped tag) is the right owner for describe_mode override
   surfacing, and that the open entry's scope explicitly absorbs it.
2. **F18 -- PROD MCP deploy.** The served `oracle.slipgate.me` MCP reads its own
   deployed DB, not the dev DB; the id1 monsters + ktx overrides + join keys are
   live in dev + the snapshot but NOT queryable via the connected remote MCP
   until a deploy. Out of arc scope (D14). This rides the same deploy as the
   standing QTV+QWFWD "MCP PROD-refresh" follow-up -- worth bundling.
3. **qw-maps.json staleness (adjacent, not arc scope).** The committed slipgate
   `qw-maps.json` is schema v14 / 2026-04-27; Phase 4 reverted its
   timestamp-only regen (no map data changed this arc). A separate maps-snapshot
   refresh is a clean small follow-up.
4. **research/repos/README.md.** Committed in the closeout with the v1.06 tree
   row (PRISTINE SHA `85ccafd2` anchor + the F12 "NOT id1-fixes-1.06" lesson).
   The Phase 0 MD mis-described this README as gitignored; it is tracked. No
   action -- noted so the reviewer does not flag it as stray.

## Verification posture (what the orchestrator actually did -- hold the same bar)

Every phase boundary: the orchestrator re-ran EVERY probe cold against live
source/DB and never trusted an executor "PASS." This caught real defects the
executors' own checks reported green: Phase 0's typecheck was RED (executor ran
it before the test file existed) and its v1.06 tree was the wrong branch
(`id1-fixes-1.06`, which mutates monster QC -- value spot-greps passed on BOTH
branches, so only the branch-semantics read caught it: F12). The role/enclosing-
branch discipline (F7/F10/F12) held throughout -- the reviewer should spot-check
that a sampled cited line plays the ROLE the row claims, not just contains the
value (the axe `{"dm":4}` overlay is the worked example: its `deathmatch > 3`
range lives in props, the single-key gate is a label).

## When in doubt

Grade against the SPEC, not the arc-history narrative. Technical claims resolve
against the live DB + decisions.md + the phase MDs (decisions win). The operator
gates only at SME level (community-reality of the KTX deltas, monster roster
realism) -- everything else is verifiable. The five executor prompts show
exactly what was asked of each phase; the review-findings F-ledger (F1-F22) is
the full trap + execution-finding catalog.
