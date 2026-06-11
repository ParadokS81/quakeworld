# Phase 1 -- id1 audit + gap sweep

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full) and `review-findings.md` -- this phase owns no
>    pre-flight finding; audit/gap findings APPEND to `review-findings.md` with
>    new F-numbers + ownership-table update.
> 2. Read spec sections D4 (audit), M2 (workflow shape), M3 (validation).
> 3. Read the live source this phase touches -- verified 2026-06-11 against the
>    tree, NOT the spec's claims: `id1-gameplay.yaml` (37 entity + 41 mechanic
>    rows; baseline still 37/41, no Track-A backfill landed yet per git log),
>    `research/repos/qwcl-original/QW/progs/` (17 .qc files, NOT ~20),
>    `combat.qc:252-323` (T_RadiusDamage + T_BeamDamage -- the two gap seeds),
>    `quality-grid.ts:2459-2503` (makeGameplayKindProbe) + `:2650-2665` (ktx
>    gameplay probes) + `:2993` (ALL_PROBES spread), `load-gameplay.ts:74-83`
>    (MECHANIC_KIND_BY_LIST), live `gameplay_mechanics_kind_check` (15 kinds, no
>    `combat_rule`), `types.ts:8` (Project union -- `id1` is NOT a member).
> 4. After drafting, dispatch the verification sub-agent before declaring ready.

## Goal

Convert the April id1 baseline from "authored carefully" into "verified under
the current regime," and close the known value-coverage gaps. Two read-only
Workflow fan-outs run against the canonical QuakeC source
(`research/repos/qwcl-original/QW/progs/`): (1) an exhaustive re-verification of
every cited value across the live 37 entity + 41 mechanic rows by independent
cold re-derivation (D4, D11), and (2) an exhaustive per-file gap sweep over all
17 .qc files for gameplay-relevant constants/behaviors that have no row (D4).
One operator SME gate triages the gap candidates ("gameplay-relevant or engine
plumbing?", D12). One inline assembler applies the confirmed corrections and the
accepted new mechanics rows to `id1-gameplay.yaml`, bumps `expected_counts` in
the same edit (D8), and reloads. Finally, the missing id1 per-kind F1 probes are
added -- which requires decoupling the gameplay probe's run-project from its
`gameplay_source_id` (id1 content rides the `qw` namespace run, not a
nonexistent `id1` project). No schema migration; no new MCP surface (D14).
**Runnable state at boundary:** the id1 baseline is verified-under-regime; the
new mechanics rows are queryable (`search_mechanics` / SQL); `load-knowledge --
quality-grid --project qw` runs the id1 per-kind grid green; the citation gate
and seed double-load pass on the grown seed.

## Inputs from previous phase

Phase 0 delivered and must be in place:

- The loader accepts a `monsters` section and tolerates an absent `mechanics`
  key (not exercised here -- Phase 1 only touches existing entity/mechanic
  clusters), and the count STOP-gate is per-seed `expected_counts` (D8). Phase 1
  bumps `expected_counts.mechanics` when gap rows are accepted.
- `load-knowledge -- citation-gate` and `load-knowledge -- seed-idempotency`
  exist as dispatcher subcommands (Phase 0 Tasks 4-6). Phase 1 RUNS them at its
  boundary; it does not re-implement them.
- The dev DB `qw-oracle-postgres-dev` holds the live id1 baseline (37/41).
- **Execution gate (plan D16 / spec M4):** the first Track-A weapon-pair notes
  have shipped. Drafting did not wait; execution does. At execution time the
  live YAML may carry Track-A inline backfills beyond 37/41 -- the audit fan-out
  enumerates rows from the LIVE file, never from any list frozen in this MD.

## Files touched

### Created

- `docs/superpowers/plans/2026-06-11-game-content-catalog/phase-1-findings.md`
  -- the detailed audit ledger: every confirmed correction (row, prop, old
  value+ref, new value+ref), the full gap-candidate list with accept/reject +
  operator reason, and any unresolved audit disputes. Written inline by the
  executor from the Workflow structured output (Workflow agents cannot write
  files). The raw per-value verdicts are too granular for `review-findings.md`;
  this is their committed home. Arc file (D17 -- staged with the rest).

### Modified

- `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` -- confirmed
  audit corrections applied in place (value + corrected source_ref); accepted
  new mechanics rows appended to their kind's sublist; `expected_counts.mechanics`
  bumped to the post-gate live count in the same edit (D8).
- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` -- `makeGameplayKindProbe`
  gains a leading `project: Project` parameter (decouples run-project from
  `gameplay_source_id`); the 9 existing ktx call sites updated to pass explicit
  `'ktx'` (behavior unchanged -- ktx is both project and source); new
  `ID1_GAMEPLAY_KIND_PROBES` array (11 probes today, run under `project=qw`)
  spread into `ALL_PROBES`.
- `docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md`
  -- material findings appended as sequential F-numbers (e.g. "audit found N
  citation errors", "splash is not flat -- falloff gradient row added") + the
  phase-ownership table updated. NOT the per-value ledger (that is
  `phase-1-findings.md`).

### Deleted

n/a -- no deletions. Audit corrections are in-place value/ref repairs (re-extract
semantics, `feedback_repair_by_reextract_not_sql_update`), not row removals.

## Tasks

Task order: 1 (audit) and 2 (gap sweep) are independent read-only fan-outs over
the same source and MAY run concurrently; 3 (SME gate) consumes 2's output and
any unresolved disputes from 1; 4 (assemble + reload) consumes 1 and 3; 5
(probes) runs after 4 so predicates are verified against the post-reload live DB
(F29 discipline).

### Task 1 -- Audit re-verify fan-out (every cited value)

- **Goal:** Re-derive every cited value across the live entity + mechanic rows
  by independent cold read of the QC source; produce a confirmed-corrections
  list. Agreement auto-passes; discrepancies are confirmed by a second agent
  before any correction is trusted (D11).
- **Files:** none written by the fan-out (read-only); output feeds Task 4.
- **Execution mode:** `workflow fan-out (Sonnet high, low concurrency)` per D10.
  An inline pre-step parses the LIVE YAML into groups (D16); the Workflow fans
  out one agent per group, then confirms each discrepancy.
- **Inline pre-step (executor main thread, before the Workflow):**
  - [ ] Read + parse the LIVE `id1-gameplay.yaml`. Build groups:
    `weapons` (1 group), `projectiles` (1 group), `items` chunked into groups of
    <= 6 rows (today 25 -> 5 groups), and the 8 mechanics sublists
    (`constants`, `env_hazards`, `player_stats`, `powerup_behaviors`,
    `armor_models`, `death_rules`, `spawn_rules`, `dm_mode_rules`) as 1 group
    each. **Today: 15 groups; recompute from the live file -- a Track-A backfill
    raises the item-chunk count.** No silent cap: every row in the file lands in
    exactly one group.
  - [ ] Pass the parsed groups to the Workflow as `args` (JSON; if `args`
    arrives stringified, `JSON.parse` it -- `reference_workflow_rate_limit_and_args`).
- **Workflow shape:** `pipeline(groups, reDerive, confirmDiscrepancies)`.
  - **Stage 1 `reDerive`** -- one `agent()` per group, Sonnet high, schema-enforced.
    Per-agent prompt shape:
    ```
    You are re-verifying cited gameplay values against the original QuakeWorld
    QuakeC source. Read files with the Read tool at absolute paths under
    /home/paradoks/projects/quakeworld/research/repos/qwcl-original/QW/progs/.

    You are given a GROUP of catalog rows. Each row has a top-level value backed
    by `source_ref`, and props where a value `<x>` is backed by a sibling
    `<x>_source_ref`. For EVERY cited value (the row's source_ref target AND
    every prop that has a paired *_source_ref):
      1. Open the cited file at the cited line; read enough surrounding context.
      2. Independently re-derive what the source actually says. Do NOT assume the
         claimed value is correct -- read first, then compare.
      3. Emit a verdict:
         - "agree": the source at/near the cited ref yields the claimed value.
         - "discrepancy": the source yields a DIFFERENT value, OR the cited line
           does not contain the claimed fact (wrong ref). Provide corrected_value
           AND corrected_source_ref (the line that actually backs the value).
         - "unresolvable": cannot find the fact near the ref; explain.
    Uncited descriptor props (e.g. ammo_type, damage_kind -- no *_source_ref
    sibling) are taxonomic, not source-derived: do NOT verify them.
    Citations are REQUIRED: every verdict carries the source_ref you actually read.

    Rows (JSON): <this group's rows, verbatim from the live YAML>
    ```
  - **Stage 2 `confirmDiscrepancies`** -- for each Stage-1 `discrepancy`, one
    `agent()` cold-reads ONLY that single (row, prop, claimed_ref) and
    re-derives independently (NOT told Stage 1's corrected value). The assembler
    (Task 4) compares: Stage 1 and Stage 2 agree on a corrected value that
    differs from the row -> confirmed correction; they disagree -> unresolved
    dispute (-> Task 3 / operator). Prompt shape:
    ```
    Cold-read one disputed value. Row <name>, prop <prop>, claimed value <v>,
    claimed ref <ref> (file under the progs/ root above). Read the source and
    state independently what the value is and the exact line that backs it.
    Do not assume the claimed value is right or wrong.
    ```
- **Stage 1 schema (per verdict item; citations REQUIRED):** `row_name` (str),
  `cluster` (str), `prop` (str), `claimed_value` (str), `claimed_source_ref`
  (str), `source_says` (str), `verdict` (`agree`|`discrepancy`|`unresolvable`),
  `corrected_value` (str|null), `corrected_source_ref` (str|null; REQUIRED when
  verdict=`discrepancy`), `note` (str).
- **Stage 2 schema:** `row_name` (str), `prop` (str), `independent_value` (str),
  `independent_source_ref` (str), `reasoning` (str).
- **Steps:**
  - [ ] Run the inline pre-step; dispatch the Workflow; collect structured output.
  - [ ] Partition Stage-1 verdicts: agreements (record count only), confirmed
    corrections (Stage 1 + Stage 2 agree, differs from row), unresolved disputes.
  - [ ] Hold the corrections + disputes for Tasks 3-4. Do NOT edit the YAML here.
- **Verification:** every row in the live file appears in exactly one group and
  every cited value yields exactly one verdict. PASS: verdict count >= cited-value
  count (no row silently skipped); every `discrepancy` has a Stage-2 confirmation.
  FAIL: any group returned null (agent died) -> re-dispatch that group; any
  `discrepancy` missing `corrected_source_ref` -> reject the verdict (citation
  required, D11).

### Task 2 -- Exhaustive gap sweep fan-out (per .qc file)

- **Goal:** Find gameplay-relevant value constants/behaviors with no catalog row,
  exhaustively across all 17 .qc files (D4 -- the sweep is the boundary, Track-A
  demands are only prioritization input).
- **Files:** none written by the fan-out; output feeds Task 3.
- **Execution mode:** `workflow fan-out (Sonnet high, low concurrency)` per D10.
- **Item list (the 17 .qc files -- pinned by `ls` 2026-06-11; re-`ls` at
  execution in case the tree changed):** `buttons.qc, client.qc, combat.qc,
  defs.qc, doors.qc, items.qc, misc.qc, models.qc, plats.qc, player.qc,
  server.qc, spectate.qc, sprites.qc, subs.qc, triggers.qc, weapons.qc,
  world.qc`. One agent per file (17 agents). No silent cap -- infrastructure
  files (buttons/models/sprites/subs/spectate/server) are expected to return
  empty, which is a valid answer, not a skip.
- **Per-agent prompt shape:**
  ```
  You are hunting for gameplay-relevant VALUE constants/behaviors in ONE
  QuakeWorld QuakeC file that are NOT yet in the catalog.

  File: /home/paradoks/projects/quakeworld/research/repos/qwcl-original/QW/progs/<file>.qc
  Already-cataloged facts that cite this file (do NOT re-report these):
    <digest: name -> source_ref for every existing row whose source_ref or any
     *_source_ref points into <file>; built inline from the live YAML>
  Allowed mechanics kinds -- propose proposed_kind ONLY from this set:
    constant, env_hazard, player_stat, powerup_behavior, armor_model,
    death_rule, spawn_rule, dm_mode_rule.
  (Entity kinds weapon/projectile/item exist too but the entity clusters are
  believed complete; monsters are OUT of scope this phase -- Phase 2.)

  Read the whole file. Identify gameplay VALUES a player or server admin would
  care about (damage, timings, thresholds, formulas, multipliers, gates) with NO
  catalog row. Engine plumbing (rendering, network protocol, model/sound
  indices, entity bookkeeping) is NOT gameplay -- skip it, or mark it low
  confidence with a rationale. If a candidate genuinely needs a kind not in the
  allowed set, set needs_new_kind=true and explain (this is a flag, not a row).
  An empty result is correct for infrastructure files.
  ```
- **Schema (per candidate; citation REQUIRED):** `proposed_name` (str), `value`
  (str), `source_ref` (str, `<file>.qc:<line>`), `proposed_kind` (one of the 8
  allowed), `rationale` (str), `confidence` (`high`|`medium`|`low`),
  `needs_new_kind` (bool).
- **Known gap seeds (verified against combat.qc 2026-06-11 -- the MD pins these
  so they are GUARANTEED in the Task 3 list even if the combat.qc agent
  under-reports; merge by source_ref, do not duplicate):**

  | proposed_name | value | source_ref | proposed_kind | rationale |
  |---|---|---|---|---|
  | `splash_falloff_gradient` | points = damage - 0.5*distance | combat.qc:275 | constant | radius damage falls off linearly with distance from the blast center (T_RadiusDamage); nuances the existing "splash flat 120" -- 120 is the max at zero distance. Beam twin (LG discharge) at combat.qc:312. |
  | `self_splash_half_damage` | 0.5 (attacker takes 0.5x own radius damage) | combat.qc:278 | constant | the radius damage you take from your own rocket/grenade is half an equidistant enemy's; what makes rocket-jumping survivable. Beam twin at combat.qc:314. |

- **Steps:**
  - [ ] Build the per-file already-cataloged digest inline from the live YAML
    (group every existing `source_ref` / `*_source_ref` by filename).
  - [ ] Dispatch the Workflow (17 agents); collect candidates.
  - [ ] Merge the two known seeds in by source_ref (dedup); carry the union to
    Task 3.
- **Verification:** all 17 files returned a result (possibly empty). PASS: 17
  results, both known seeds present in the merged list. FAIL: any file null ->
  re-dispatch; either known seed absent -> the merge step failed, re-add.

### Task 3 -- Operator SME gate (HALT)

- **Goal:** Triage gap candidates to accepted rows; surface any unresolved audit
  disputes. This is D12 operator surface (1) ("gameplay-relevant or engine
  plumbing?") -- NOT per-citation review.
- **Files:** none (decisions recorded into `phase-1-findings.md` in Task 4).
- **Execution mode:** `inline` -- a HALT step; the executor presents the list and
  waits.
- **Steps:**
  - [ ] **HALT. Present the gap-candidate list in this exact format** (one row
    per candidate, the two known seeds first, then the sweep's, sorted by
    confidence then file):

    ```
    ## Phase 1 gap-sweep candidates -- gameplay-relevant, or engine plumbing?
    Mark each: accept (-> catalog row) / reject (+ one-line reason).

    | # | proposed_name | value | source_ref | proposed_kind | confidence | rationale |
    |---|---|---|---|---|---|---|
    | 1 | splash_falloff_gradient | points = damage - 0.5*distance | combat.qc:275 | constant | high | radius damage is not flat; falls off with distance |
    | 2 | self_splash_half_damage | 0.5 | combat.qc:278 | constant | high | self radius damage halved; enables rocket jumps |
    | 3.. | <from sweep> | ... | ... | ... | ... | ... |
    ```
  - [ ] If any candidate has `needs_new_kind=true`: present it as a SEPARATE
    flagged line -- accepting it implies a `gameplay_mechanics.kind` CHECK
    migration, which is a **D14 deviation** (no schema migration). Default:
    reject / re-home under an allowed kind. Operator decides; if the operator
    wants the new kind, STOP and escalate to the planner (amend `decisions.md`)
    before assembling.
  - [ ] If Task 1 produced unresolved disputes (Stage 1 vs Stage 2 disagree),
    present them as a short second list: row, prop, claimed value+ref, the two
    re-derived values. Operator adjudicates (the QC source is the arbiter for
    id1; the pak `progs.dat` is reserved for Phase 2 monster fidelity).
  - [ ] Record accept/reject + reason per candidate; carry accepted rows +
    resolved disputes to Task 4.
- **Verification:** every candidate has an accept/reject decision with a reason
  on rejects; no `needs_new_kind=true` candidate is silently accepted. PASS:
  decision list complete. FAIL: any candidate undecided -> re-present.

### Task 4 -- Assemble corrections + accepted rows; reload (inline assembler)

- **Goal:** Apply confirmed corrections and accepted new rows to
  `id1-gameplay.yaml`, bump `expected_counts.mechanics` in the same edit (D8),
  reload, and write the findings ledger.
- **Files:** `id1-gameplay.yaml`, `phase-1-findings.md` (created),
  `review-findings.md`.
- **Execution mode:** `inline` -- the YAML assembler is ALWAYS inline (D5/D19);
  subagents never write seed files.
- **Steps:**
  - [ ] Apply each confirmed correction in place: set the prop's value and its
    `*_source_ref` (or the row's `source_ref`) to the corrected pair. Re-extract
    semantics -- replace the cited pair, do not patch a value while leaving a
    stale ref.
  - [ ] Append accepted gap rows to the sublist matching their `proposed_kind`.
    The two known seeds (if accepted) land under `mechanics.constants` as the
    following LOCKED rows (style verified against the live cluster -- per-prop
    `*_source_ref` siblings, folded `notes`, ASCII only, D18):

    ```yaml
        - name: splash_falloff_gradient
          value_text: points_eq_damage_minus_half_distance_from_blast_center
          source_ref: combat.qc:275
          props:
            scope: global_combat_rule
            falloff_formula: points = damage - 0.5 * distance(blast_origin, target_center)
            distance_term_source_ref: combat.qc:272
            radius_formula: damage_plus_40
            radius_source_ref: combat.qc:258
            negative_points_gate: damage_delivered_only_if_points_gt_0
            negative_points_gate_source_ref: combat.qc:279
            applies_to: [rocket_launcher, grenade_launcher, rocket, grenade]
            beam_twin_source_ref: combat.qc:312
            beam_twin_note: T_BeamDamage (LG discharge) uses the same linear falloff (distance term combat.qc:309)
          notes: >
            Radius damage is NOT flat. T_RadiusDamage delivers
            points = damage - 0.5*distance from the blast center; targets whose
            points come out non-positive simply take nothing (delivery is gated
            on points > 0 at combat.qc:279). NOTE the source order: the clamp at
            combat.qc:273-274 bounds the DISTANCE TERM before the subtraction
            (dead code in practice -- vlen is non-negative); it is NOT a
            delivered-damage clamp. The per-weapon splash_damage (e.g. RL 120)
            is the MAXIMUM at zero distance; delivered splash decreases linearly
            to the edge of the damage+40 radius. The "splash flat 120" wording
            on the rocket and grenade rows is the nominal max, not the value
            delivered at range.

        - name: self_splash_half_damage
          value_numeric: 0.5
          source_ref: combat.qc:278
          props:
            scope: global_combat_rule
            rule: if target_eq_attacker_then_points_times_0.5
            applies_to: rocket_jump_and_self_splash
            beam_twin_source_ref: combat.qc:314
            beam_twin_note: T_BeamDamage applies the same self-halving
            interaction_with_rj: separate_from_rocket_jump_multiplier_infokey_rj
          notes: >
            The radius damage you take from your own rocket or grenade is half
            what an enemy at the same distance takes (combat.qc:278). This is the
            QC-side self-damage reduction that makes rocket-jumping survivable;
            the rj infokey knockback multiplier (constant
            rocket_jump_multiplier_default) is a separate scalar.
    ```
    Sweep-accepted rows beyond the two seeds are shaped to the same template from
    the Task 3 output (name, value_numeric|value_text, source_ref, props with
    cited siblings, notes). If a sweep row's `proposed_kind` is NOT `constant`,
    append it to that kind's sublist instead.
  - [ ] Bump `expected_counts.mechanics` by the number of accepted rows (today's
    baseline 41; both seeds accepted -> 43). Entities are unchanged (the audit
    corrects values/refs in place; it adds no entity rows) so
    `expected_counts.entities` is untouched unless a sweep row was an ENTITY kind
    (none expected). Same edit as the row append (D8 tripwire).
  - [ ] Reload: `cd apps/qw-oracle && bun run load-knowledge -- load-gameplay`.
    PASS: `total mechanics=<41+accepted>`, no STOP line. FAIL: STOP -> the
    declared count != the row count you wrote; recount.
  - [ ] Write `phase-1-findings.md`: the corrections ledger (row/prop/old->new),
    the full gap-candidate list with accept/reject + reason, unresolved-dispute
    resolutions. Append material F-numbers to `review-findings.md` (e.g.
    "F7 -- audit corrected N citation refs"; "F8 -- splash is not flat, falloff
    gradient row added") + update the ownership table.
- **Verification:** reload clean; `phase-1-findings.md` exists and lists every
  correction and every gap decision. PASS: clean load + complete ledger. FAIL:
  STOP line (recount) or missing ledger entries.

### Task 5 -- id1 per-kind F1 probes (run-project decoupling)

- **Goal:** Add the absent id1 per-kind F1 probes (D13) -- which requires
  decoupling the gameplay probe's run-project from its `gameplay_source_id`,
  because `id1` is a `gameplay_source` but NOT a `Project` (`types.ts:8`); the
  current helper would guard `ctx.project === 'id1'`, which never fires.
- **Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`.
- **Execution mode:** `inline` -- fully-locked TS diffs; deterministic edits to
  known code (D19).
- **Steps:**
  - [ ] **`makeGameplayKindProbe`** (quality-grid.ts:2459-2503) -- add a leading
    `project: Project` parameter and guard on it; the name still derives from
    `gameplay_source_id`. Replace the signature + the guard:

    ```ts
    export function makeGameplayKindProbe(
      project: Project,
      gameplay_source_id: string,
      table: 'gameplay_entity_defs' | 'gameplay_mechanics',
      kind: string,
      expected: number,
    ): Probe {
      const name = `F1.${gameplay_source_id}.gameplay_kind.${kind}_count`;
      return {
        name,
        family: 'regression',
        description: `Gameplay-kind probe: ${table}[gameplay_source_id=${gameplay_source_id}, kind=${kind}] equals ${expected} (runs under project=${project}).`,
        run: async (ctx: ProbeContext): Promise<ProbeResult> => {
          // Run-project is decoupled from the row's gameplay_source_id: ktx
          // gameplay rides the ktx engine run (project=ktx, source=ktx); id1
          // game content rides the qw namespace run (project=qw, source=id1).
          // 'id1' is a gameplay_source, not a Project (types.ts), so guarding on
          // the source-id directly would never fire for id1.
          if (ctx.project !== project) {
            return {
              name,
              family: 'regression',
              description: '',
              status: 'PASS',
              count: 0,
              summary: `skipped (not ${project} project)`,
              examples: [],
            };
          }
          const rows = await ctx.sql<{ n: number }[]>`
            SELECT COUNT(*)::int AS n FROM ${ctx.sql(table)}
            WHERE gameplay_source_id=${gameplay_source_id} AND kind=${kind}
          `;
          const actual = rows[0]!.n;
          const status: ProbeStatus = actual === expected ? 'PASS' : 'FAIL';
          return {
            name,
            family: 'regression',
            description: '',
            status,
            count: actual,
            summary: `${kind}: actual=${actual}, expected=${expected}`,
            examples: [],
          };
        },
      };
    }
    ```
  - [ ] **Update the 9 ktx call sites** (quality-grid.ts:2656-2664) to pass an
    explicit `'ktx'` project (behavior unchanged -- ktx is both project and
    source; the probe names stay `F1.ktx.gameplay_kind.*`):

    ```ts
    const KTX_GAMEPLAY_KIND_PROBES: Probe[] = [
      // Phase 7 (KTX onboarding) -- per-kind equality probes for the gameplay
      // tables. Counts are LIVE values at Phase 6 ship; mode_default=317 is the
      // shipped count (F6 had ~309 estimate; Phase 3 + Phase 5.5 retrofit
      // confirmed 317 across parallel + serial runs). Bump expected when KTX
      // source legitimately gains/loses entries (verified by source-walk).
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_entity_defs', 'monster', 13),
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_mechanics', 'game_mode', 27),
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_mechanics', 'mode_default', 317),
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_mechanics', 'election_type', 5),
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_mechanics', 'death_rule', 27),
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_mechanics', 'score_system', 3),
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_mechanics', 'drop_item', 31),
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_mechanics', 'loc_macro', 15),
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_mechanics', 'teamplay_message', 21),
    ];
    ```
  - [ ] **Add `ID1_GAMEPLAY_KIND_PROBES`** immediately after the ktx array.
    Expected counts are TODAY's live values (entity weapon=8/projectile=4/item=25;
    mechanic constant=2/env_hazard=7/player_stat=12/powerup_behavior=3/armor_model=1/
    death_rule=7/spawn_rule=5/dm_mode_rule=4). The executor sets each `expected`
    to the POST-reload live count and verifies it before shipping (F29) -- if
    both gap seeds were accepted under `constant`, bump `constant` 2 -> 4 here;
    if a sweep row landed in another kind, bump that kind too:

    ```ts
    const ID1_GAMEPLAY_KIND_PROBES: Probe[] = [
      // Phase 1 (game-content-catalog) -- per-kind equality probes for the id1
      // gameplay baseline. id1 is a gameplay_source, not an engine Project, so
      // these ride the 'qw' game-content namespace run:
      //   load-knowledge -- quality-grid --project qw
      // Counts are LIVE at Phase 1 ship -- bump in the SAME commit that adds or
      // removes rows (mirrors the seed expected_counts D8 tripwire). Verify each
      // expected against the live dev DB before shipping (F29).
      makeGameplayKindProbe('qw', 'id1', 'gameplay_entity_defs', 'weapon', 8),
      makeGameplayKindProbe('qw', 'id1', 'gameplay_entity_defs', 'projectile', 4),
      makeGameplayKindProbe('qw', 'id1', 'gameplay_entity_defs', 'item', 25),
      makeGameplayKindProbe('qw', 'id1', 'gameplay_mechanics', 'constant', 2),
      makeGameplayKindProbe('qw', 'id1', 'gameplay_mechanics', 'env_hazard', 7),
      makeGameplayKindProbe('qw', 'id1', 'gameplay_mechanics', 'player_stat', 12),
      makeGameplayKindProbe('qw', 'id1', 'gameplay_mechanics', 'powerup_behavior', 3),
      makeGameplayKindProbe('qw', 'id1', 'gameplay_mechanics', 'armor_model', 1),
      makeGameplayKindProbe('qw', 'id1', 'gameplay_mechanics', 'death_rule', 7),
      makeGameplayKindProbe('qw', 'id1', 'gameplay_mechanics', 'spawn_rule', 5),
      makeGameplayKindProbe('qw', 'id1', 'gameplay_mechanics', 'dm_mode_rule', 4),
    ];
    ```
  - [ ] **Spread into `ALL_PROBES`** -- add one line after `...KTX_GAMEPLAY_KIND_PROBES,`
    (quality-grid.ts:2993):

    ```ts
      ...KTX_GAMEPLAY_KIND_PROBES,
      ...ID1_GAMEPLAY_KIND_PROBES,
    ```
  - [ ] Set each id1 `expected` to the live count (`SELECT COUNT(*) FROM
    gameplay_mechanics WHERE gameplay_source_id='id1' AND kind=<k>` etc.) AFTER
    Task 4's reload, then `cd apps/qw-oracle && bun run typecheck`. **These TS
    `expected` values and Task 4's `expected_counts.mechanics` are the SAME live
    counts read twice -- keep them in lockstep: e.g. both seeds accepted under
    `constant` means `expected_counts.mechanics=43` (Task 4) AND the `constant`
    probe `expected=4` (here). A divergence between the two is the bug the F1
    grid will catch.**
  - [ ] Apply the four sub-steps IN ORDER (signature change first, then the ktx
    sites, then the id1 array, then the `ALL_PROBES` spread) so tsc never sees a
    5-arg call against the old 4-arg signature.
- **Verification:** `bun run typecheck` exits 0; `bun run load-knowledge --
  quality-grid --project qw` runs the 11 `F1.id1.gameplay_kind.*` probes and all
  are PASS; `--project ktx` still shows the 9 ktx gameplay probes PASS (no
  regression from the signature change). PASS: tsc clean, 11 id1 probes PASS, 9
  ktx probes PASS. FAIL: any tsc error (the diffs are exact -- re-check), or any
  probe FAIL (expected != live count -> recount, suspect idempotency before
  staleness).

## Verification (phase boundary)

Run from `apps/qw-oracle/`. Each ends with PASS/FAIL.

1. **Citation gate green (dev DB).** `bun run load-knowledge -- citation-gate --source id1`
   PASS: `unresolved=0` across all id1 refs, including the new rows' refs
   (combat.qc:275, :278, :272, :258, :279, :309, :312, :314) and every
   corrected ref.
   FAIL: any unresolved ref -> the offending list is the work queue (a corrected
   ref points at a nonexistent line, or a new row's ref is wrong).
2. **id1 F1 grid green (dev DB).** `bun run load-knowledge -- quality-grid --project qw`
   PASS: the 11 `F1.id1.gameplay_kind.*` regression probes all PASS; no ERROR
   row. FAIL: any id1 gameplay probe FAIL (expected != live; recount) or ERROR
   (a non-gameplay global probe that does not handle project=qw -> record as a
   finding and re-run scoped: `--probe F1.id1.gameplay_kind`; it is not a Phase 1
   data bug).
3. **Seed double-load idempotent (dev DB).** `bun run load-knowledge -- seed-idempotency --yaml scripts/extractors/qw/seeds/id1-gameplay.yaml`
   PASS: `pass=true`, identical counts + content hash across both loads. FAIL:
   any divergence (suspect a re-run idempotency bug before staleness,
   `feedback_idempotency_before_staleness`).
4. **expected_counts honored (dev DB).** `bun run load-knowledge -- load-gameplay`
   PASS: `total mechanics=<41+accepted>` equal to `expected_counts.mechanics`,
   no STOP line, exit 0. FAIL: STOP line -> declared count != live file count.
5. **New rows queryable (dev DB).** `docker exec qw-oracle-postgres-dev psql -U
   qworacle -d qw_oracle -t -c "SELECT name, source_ref FROM gameplay_mechanics
   WHERE gameplay_source_id='id1' AND name IN ('splash_falloff_gradient',
   'self_splash_half_damage');"`
   PASS: 2 rows (assuming both accepted), refs combat.qc:275 / combat.qc:278.
   FAIL: missing row -> the assembler dropped it; re-apply.
6. **Findings recorded.** `phase-1-findings.md` lists every correction + every
   gap decision; `review-findings.md` has the new F-numbers + ownership update.
   PASS: both present. FAIL: missing ledger -> incomplete.
7. **Git scope (D17).** `git add` names ONLY: `id1-gameplay.yaml`,
   `quality-grid.ts`, `phase-1-findings.md`, `review-findings.md`. `git diff
   --cached --stat` shows exactly those four paths. PASS: only arc files staged.
   FAIL: any sibling-arc or `-A` staging.

## Outputs to next phase

- The id1 baseline is verified-under-the-current-regime: every cited value
  cold-re-derived, citation errors corrected in place, the known value gaps
  (falloff gradient, self-splash) closed. Prior verified-state is now actual
  (D1 / `feedback_parking_verified_state_is_hypothesis`).
- `makeGameplayKindProbe` now takes an explicit `project` param. Phase 2 adds the
  id1 monster probe as `makeGameplayKindProbe('qw', 'id1', 'gameplay_entity_defs',
  'monster', <N>)` and bumps `expected_counts.entities`; the `--project qw` grid
  is the established home for id1 content.
- `expected_counts.mechanics` is at the post-audit live count; Phase 2/4 bump it
  further in their own commits (D8).
- `phase-1-findings.md` is the durable audit record; `review-findings.md` carries
  the material F-numbers Phase 4's doc deliverable (D20) can cite.

## Open questions / deferred items

- **Q: which `kind` do the combat-rule gap rows take?** The live
  `gameplay_mechanics_kind_check` allows 15 kinds; none is `combat_rule`. A new
  kind needs a CHECK migration -- a D14 deviation. **Default chosen for now:**
  `constant` -- the kind already holds `rocket_jump_multiplier_default`, a global
  combat self-damage rule, so "global gameplay constant/rule" is the established
  reading (alt considered: `armor_model`, the damage-formula sibling, rejected as
  more misleadingly named). **Who can resolve:** operator at the Task 3 SME gate
  (proposed_kind is in the candidate list; a `needs_new_kind` candidate escalates
  to the planner, not auto-accepted).
- **Q: id1 F1 probe wiring -- add a `project` param (Option A) or run under an
  `id1` pseudo-project (Option B)?** **Default chosen for now:** Option A
  (Task 5) -- run under `--project qw`, decouple project from source, update the
  9 ktx sites (behavior unchanged). It uses the real `qw` game-content namespace
  and avoids inventing an `id1` token outside the `Project` union; it also sets
  up the eventual maps-under-qw probes. **Fallback:** Option B -- leave the
  helper alone, call `makeGameplayKindProbe('id1', ...)`, run `--project id1`
  (works only because `runQualityGridCli` casts `--project` without validating);
  one-arg-per-probe, zero churn to ktx, but introduces a pseudo-project. **Who
  can resolve:** executor/operator; A recommended.
- **Q: do audit corrections ever change row COUNTS?** **Default:** no --
  corrections fix value/ref in place (re-extract semantics). If the audit finds a
  row that should split or merge (changing identity under
  `(source_id, kind, name, gate)`), that is escalated as an unresolved dispute to
  Task 3, never auto-applied. **Who can resolve:** operator.
- **Q: where do unresolved audit disputes go (Stage 1 vs Stage 2 disagree)?**
  **Default:** the Task 3 SME gate's second list; the QC source is the arbiter
  for id1. This is an exceptional escalation, outside the three routine D12 gates
  -- not a new standing operator surface. **Who can resolve:** operator.

## Recovery (if verification fails)

- **Citation gate reports an unresolved ref:** the unresolved list is the work
  queue. A new row's ref or a corrected ref points at a nonexistent file/line ->
  re-read combat.qc (or the corrected file) and fix the line number. Not a probe
  bug -- a real data error introduced this phase; fix it before re-running.
- **id1 F1 probe FAIL (count mismatch):** diff expected vs live
  (`SELECT COUNT(*) ... WHERE gameplay_source_id='id1' AND kind=<k>`). Most
  likely the probe `expected` was not bumped to the post-gate count, OR a re-run
  idempotency bug inflated the count -- suspect idempotency before staleness
  (`feedback_idempotency_before_staleness`); the loader is idempotent, so a
  doubled count means a natural-key collision, not a stale snapshot.
- **load-gameplay STOPs at the boundary:** `expected_counts.mechanics` != the
  live row count -- you accepted N gap rows but bumped by a different number, or a
  Track-A backfill landed mid-phase (D16). Recount the file's mechanic rows and
  set the declared count to match; do not force-pass.
- **`--project qw` run ERRORs on a non-gameplay probe:** a global anomaly/floor
  probe that assumes an engine project and does not guard `project=qw`. Record it
  as a finding (likely pre-existing, surfaced by the first-ever `qw` run), and
  scope the F1 check to the gameplay probes (`--probe F1.id1.gameplay_kind`). It
  is not a Phase 1 data bug; do not bend the data to it.
- **An audit Workflow agent died (group returned null):** re-dispatch only that
  group (the fan-out is read-only and idempotent). Do not assemble from a partial
  result -- a missing group means unverified rows.
- **A `discrepancy` lacks a `corrected_source_ref`:** reject the verdict (D11 --
  citations required); re-dispatch that single value to Stage 2. Never apply a
  correction without the line that backs it.
- **Unanticipated failure:** route to the operator with the command, the output,
  and the task it blocks.
