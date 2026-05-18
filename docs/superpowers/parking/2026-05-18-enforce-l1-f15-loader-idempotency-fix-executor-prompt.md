# Execute the F15 Phase-3-loader source_state idempotency fix-cycle

You are an **arc-executor** in a FRESH terminal, EXECUTION mode. You are NOT
drafting. You are NOT arc-orchestrator. You are NOT executing Phase 5. The
unit of work is the **F15 fix-cycle**: make the enforce-L1 Phase-3 loader
source_state assignment re-load-idempotent so a re-load of tag `3f9e724f`
reproduces the clean-load result for the cross-type-orphan x Track-B-adapter
collision class. This is its OWN fix-cycle, NOT a phase, NOT a `decisions.md`
amendment.

Arc: `2026-05-17-enforce-l1-runtime-truth` (libclang call-graph reachability
+ HUD hidden-command recovery; Track A / Track B; D1-D22 + X1-X10;
ezQuake-only; 74 cmd / 92 cvar / ~129 reverse). SELF-CHECK -- wrong arc if
you see "describe-fill" / "C1-C5 / P1-P5" / KTX man-pages (that is the
SEPARATE still-active 2026-05-16-ktx-mvdsv-l1-describe-fill arc), or
"Postgres port / pgvector / 31-table" (that is 2026-05-02-qw-oracle-arc1).
HALT if so.

Repo root: `/home/paradoks/projects/quakeworld`
Scaffold:  `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/`

---

## Read COLD before touching anything (in this order)

1. The scaffold per README "read in this order": `prerequisites.md`,
   `decisions.md` (D1-D22 + the **D5/D7/D11 AMENDMENTS** + X1-X10 + non-goals
   IN FULL -- do NOT re-open a D), `review-findings.md` (**F15 the blocker**
   is the unit of work; F8 the cross-arc standing rule; F13 the F15-INVERSE
   precedent; F9/F11/F12/F14 RESOLVED context; X8/X9 family),
   `phase-template.md`, `README.md` (Phase 1-3 `shipped`, Phase 4
   `CHECKPOINT ... BLOCKED on F15` commit `702421a1`, Phase 5 pending).
2. The Phase-3 MD `phase-3-unified-schema-loader.md` IN FULL (the loader
   contract you are making idempotent) + the Phase-4 MD Verification-8 F15
   scoping note region (the gate this fix unblocks). P1/P2 SHIPPED contracts
   as needed.
3. The s4->s5 resume doc
   `docs/superpowers/parking/2026-05-18-enforce-l1-runtime-truth-execution-orchestrator-resume-s4-to-s5.md`
   (the operator-ratified F15 disposition; the prior handoff chain s1->s4 for
   cumulative rules).
4. The live loader source (the fix surface):
   `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts` (`upsertEntity`
   :106-159, `setEntitySourceState` :161-168), `load-version.ts` (the
   per-type orchestrator: the upsert loop :483-574, the cross-type prune
   call :580-595, the entity-level state-retreat block :711-826),
   `load-commands.ts` (per-type command adapter; `commandIsSourceBacked` =
   `entry.ast !== null`), `load-hud-commands.ts` (the Track-B adapter,
   `upsertHudCommandRow` :168-195 -- `source_state:'source_backed'`
   unconditional, NO `setEntitySourceState`), `prune-cross-type-orphans.ts`
   (the order-sensitive cross-type prune; its header documents the EXACT
   `radar` case), `extract-tag.ts` (the loader ORDER: step 3 per-type loop
   in `ENTITY_JSON_FILES` key order [`cvar, command, ..., hud_element, ...`]
   -> step 3e Track-B adapter -> step 3f Track-A overlay).
5. Memory (the lens): `feedback_idempotency_before_staleness` (THE F15 lens
   -- a changed re-load count is an idempotency bug, NOT a stale snapshot;
   F15 is F13-INVERSE), `feedback_repair_by_reextract_not_sql_update` (X9 --
   the recovery is fix-the-loader + re-extract+re-load, NEVER an in-place SQL
   UPDATE of the 12 rows), `feedback_cross_phase_audit_shared_file_drift` /
   F8 (THE load-bearing hazard -- `natural-keys.ts` is the source_state
   machine ALL Layer-1 entities + the STILL-ACTIVE ktx-mvdsv describe-fill
   arc flow through), `feedback_verify_dispatched_terminal_claims`,
   `feedback_parking_verified_state_is_hypothesis`,
   `reference_qw_oracle_floor_vs_clean_reload` (the F13/F15 family),
   `reference_destructive_rm_harness_gate` (`rm -rf` is harness-blocked --
   use `mktemp -d` / a throwaway test DB / drop+migrate).

---

## State the orchestrator independently verified vs LIVE (treat as a HYPOTHESIS -- re-verify; do not trust on faith)

Per `feedback_parking_verified_state_is_hypothesis` this block is the record
of the path, NOT a contract. Re-verify each before you rely on it.

- Pin BOTH legs = `3f9e724fa608e516040f02b9557808ff3efda53e` (git
  `research/repos/ezquake-source` HEAD + `oracle_meta
  ezquake:source_repo_commit`).
- The dev DB (`docker compose -f db/docker-compose.dev.yml exec -T postgres
  psql -U qworacle -d qw_oracle`) is in the **re-loaded BAD state**:
  `entities` ezquake/command source_state = `{source_backed:612,
  doc_only:19, source_retired:62}`, total 693.
- The 12 F15 names -- `radar, bar_armor, bar_health, itemsclock, netproblem,
  score_difference, score_enemy, score_position, speed, speed2, teamholdbar,
  teamholdinfo` -- are ALL currently `command doc_only` AND each carries
  `command_versions.track_b_hud_recovery` (conclusion `bare-command`).
- The 7 LEGIT doc_only (the F13-correct set, NOT F15-affected): `gl_checkmodels,
  gl_inferno, gl_setmode, in_evdevlist, legacyquake, mp3_volume,
  validate_clients`. 19 = these 7 + the 12 F15-flipped. `source_retired` 62
  is unchanged.
- Each of the 12 is SIMULTANEOUSLY: (a) `entities` `hud_element
  source_backed` (the cross-type-prune trigger -- all 12 confirmed); (b) in
  `scripts/extractors/ezquake/output/ezquake-commands-ast.json` with
  `ast=null` (per-type command loader -> `command doc_only`); (c) in
  `ezquake-hud-commands-ast.json` (Track-B adapter -> wants `command
  source_backed`).
- `source_state_transitions` for the 12 command entities = 0 rows.
- NOT-Task-4-caused (git): `natural-keys.ts` + `load-commands.ts` are ABSENT
  from the `702421a1` diff; `load-hud-commands.ts`
  `source_state:'source_backed'` write is byte-unchanged (the Phase-4 diff
  is purely additive `dumpConfirmed`/slot-3 stamping).
- The F13-ratified CORRECT clean-load expectation = `{doc_only:7,
  source_backed:624, source_retired:62}` (total 693). F15 is F13-INVERSE:
  the snapshot is RIGHT; the loader must make a re-load REPRODUCE it.

## Root-cause characterization (PARTIAL -- one OPEN diagnostic you must close)

VERIFIED at primary source: (1) `upsertEntity` sets `source_state` ONLY on
the INSERT path (`existing.length==0`); both re-load UPDATE branches never
touch `source_state`. (2) The per-type command loader promotes
`doc_only->source_backed` ONLY when `prevSourceState==='doc_only' &&
sourceBacked` -- for the 12, `ast=null` so `sourceBacked=false`, the
promotion never fires. (3) The Track-B adapter sets `source_state:
'source_backed'` but has NO `setEntitySourceState`, so on an existing row it
cannot promote. (4) `pruneCrossTypeOrphans` DELETEs `command doc_only`
entities (rows + transitions + overrides + entity) when a `source_backed`
same-name counterpart exists under another type; it runs at the end of EACH
per-type load scoped to that type; its header states "this prune is
order-sensitive"; on a re-load the `hud_element source_backed` counterpart
already exists when the command-load prune runs, on a clean load it does
not (hud_element loads after command). (5) `load-version.ts`'s entity-level
state-retreat block recomputes `source_state` from the latest
per-type-versions row's `source_file` (null -> `doc_only`), scoped to the
load's type, AFTER the prune and BEFORE Track-B's 3e re-write.

**OPEN (you must diagnose, do NOT assume the orchestrator's trace):** the
orchestrator's step-through produced `doc_only` for BOTH clean and re-load,
which contradicts the F13-ratified clean=`source_backed` ground truth -- so
the model is INCOMPLETE. The exact clean-load path that lands these 12 at
`source_backed` (the prune-order vs retreat-scan vs `caseFoldMergeEntries`
vs Track-B-3e-ordering interaction) is unresolved and is YOUR diagnosis.
Reproduce a real clean load (drop+migrate the dev DB or a `mktemp`/test DB,
then the loader path against the existing extractor JSONs) and a re-load,
SQL the 12 + the full `command_source_state` crosstab BOTH ways, and let the
empirical divergence -- not any prose trace -- drive the minimal fix.

---

## Hard constraints (cumulative -- all bind)

- **F13-INVERSE: do NOT recalibrate the floor.** `624/7/62` is the CORRECT
  clean-load expectation (operator-ratified at the s4 gate). The fix makes a
  re-load reproduce it. Changing `quality-grid.ts` to `612/19/62` bakes in
  the defect and is explicitly REJECTED. Do NOT touch the F13 calibrated
  snapshot.
- **X9: repair by re-extract, NEVER an in-place SQL UPDATE.** The recovery
  is: fix the loader source_state precedence/idempotency, then
  re-extract+re-load end-to-end (`extract-tag --project ezquake --version
  head --force`). An `UPDATE entities SET source_state` on the 12 is the
  wrong instinct -- do not do it even to "prove" the fix.
- **F8 / shared-substrate is the load-bearing hazard.** `natural-keys.ts`
  `upsertEntity` is the source_state machine EVERY Layer-1 entity (all 5
  engines) + the **STILL-ACTIVE ktx-mvdsv describe-fill arc** flow through.
  The fix MUST be re-load-idempotent for ezQuake WITHOUT changing the
  clean-load semantics any other project / the ktx-mvdsv arc depends on.
  Before AND after: `git log --oneline --since="2026-05-17" --
  apps/qw-oracle/scripts/load-knowledge/ apps/qw-oracle/db/migrations/` for
  sibling-arc drift. Post-fix gate: re-run the F1 quality-grid for ezQuake
  AND ktx AND every other project; the ktx-mvdsv `F1.describe_fill.*` and
  every `*.floor.*_source_state` must stay GREEN. NEVER `git add -A`; NEVER
  touch ktx-mvdsv files; NEVER touch `quality-grid.ts`'s F13 floor or the
  ktx `describe_fill` region.
- **NOT a `decisions.md` amendment.** This is a loader idempotency defect,
  not a refuted design premise (the X8/F8/F13 family; the s4 gate already
  ratified no D-amendment). Do NOT add a dated D-block. If you believe a D
  is genuinely wrong, HALT and surface to the operator -- do not amend.
- **`rm -rf` is harness-blocked.** For the clean-load proof use `mktemp -d`
  / a throwaway test DB / a drop+migrate of the dev DB -- never `rm -rf`.
- **Minimal correct fix, you choose among (diagnose first):** `upsertEntity`
  applies a source_state TRANSITION on the existing-row path; OR the Track-B
  adapter calls `setEntitySourceState` to promote its owned row; OR the
  per-type loader / retreat-scan must not demote a Track-B-owned (HUD
  source_file-bearing) row; OR the cross-type prune order is corrected.
  Grug 80/20: the smallest change that makes clean-load == re-load for the
  WHOLE class (any name that is both a per-type-loader target AND a
  Track-B-adapter target -- not just these 12 by name), without regressing
  any other project. Comments explain WHY (the idempotency invariant), not
  what.
- ASCII only (X10): `--` for dashes, no em/en-dash, no emoji, in code and
  any shipped doc.
- Commit cadence: scoped `git add` of ONLY the fix-cycle's shipped files +
  this arc's scaffold; NEVER `git add -A`. End commit messages with
  `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`. Do NOT push
  (operator's call at wrap). Do NOT flip README/arc-history -- the
  orchestrator owns the boundary flip after independently gating your halt.

---

## Execution-mode

This is code synthesis on shared substrate (X5/X6): subagent-default for the
fix synthesis is acceptable, but the DIAGNOSIS (reproduce clean-vs-reload,
read the loader interaction) and the cross-arc F8 gate are
correctness-critical -- run them with full effort (Opus-MAX-shaped
judgment), not a thin subagent. Near-zero inline only for trivial mechanical
edits with full content known.

## HALT contract (structured -- the orchestrator independently re-gates this)

Do NOT report "fixed". Report:

- **STATUS:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED.
- **Diagnosis:** the EXACT clean-load vs re-load code path that produces the
  divergence (close the orchestrator's OPEN gap), with file:line.
- **The fix:** which option, why it is minimal+correct for the whole
  collision class, the diff (files + hunks).
- **Empirical proof (the contract -- actual SQL output, not prose):** a
  clean load (drop+migrate+load) AND a re-load of tag `3f9e724f`, with the
  full `entities` ezquake/command `source_state` crosstab + the 12 names'
  individual source_state, BOTH ways -- they MUST be IDENTICAL and ==
  `{doc_only:7, source_backed:624, source_retired:62}`. Plus a 2nd and 3rd
  consecutive re-load showing the 12 stable (true idempotency, not a
  one-shot).
- **F8 cross-arc gate:** the F1 quality-grid output for ezQuake AND ktx AND
  the other projects (all GREEN; ktx `describe_fill.*` + every
  `floor.*_source_state` GREEN); `git log` sibling-arc-drift check before
  AND after; confirmation no ktx-mvdsv file / no F13 floor was touched.
- **Scope:** confirmation NOT a `decisions.md` amendment; the scoped
  `git add` file list; the commit SHA(s).
- Then STOP. The orchestrator independently re-runs the clean-vs-reload
  comparison + all-project grids (your "idempotent" is a hypothesis until
  it does), then dispatches the Phase-4 RE-VERIFY. Do NOT proceed to the
  Phase-4 re-verify or Phase 5 yourself.

## Recovery

If you corrupt the dev DB mid-diagnosis: it is fully reproducible via
`extract-tag --project ezquake --version head --force` (post-fix) or the
pre-fix loader (to reproduce the bad state) -- X9, never hand-SQL it back.
If the fix surfaces a deeper defect (e.g. the retreat-scan is wrong for ALL
Track-B/overlay-written rows, not just these 12), do NOT silently widen
scope -- HALT with the finding and the proposed wider fix for the
orchestrator+operator to route.
