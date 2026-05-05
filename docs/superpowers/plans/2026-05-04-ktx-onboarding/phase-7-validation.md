# Phase 7 -- Validation (F1 quality-grid probes + JSONB regression gate + validation runbook + cross-project audit)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` for the spec commitment behind this phase.
> 4. Source-walk the relevant KTX files at `research/repos/ktx/` -- spec sketches drift; live source wins. Reproduce the count anchors locked in `review-findings.md`.
> 5. Read the analogous prior-engine F1 probe shape at `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (probe naming, `makeFloorCountProbe` helper, the `probeJsonbNotStrings` cross-project gate). Read `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` for the per-engine section format. Read `docs/superpowers/reviews/2026-04-28-cross-extractor-audit-report.md` for the cross-project audit shape.
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Phase 7 closes the auditability loop. Three deliverables:

1. **F1 quality-grid probes for all 14 KTX kinds** in `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`. Mirrors the prior-engine pattern: per-kind floor count probes (entities-table types via `makeFloorCountProbe`; gameplay-table kinds via a new `makeGameplayKindProbe` helper), plus per-loader anchor probes for invariants (positions length=10, hp_for_kill non-null, fish first array_position, dual-row design verification).
2. **JSONB-binding regression gate extension** -- `F1.jsonb_columns_not_strings` extends to KTX-relevant JSONB columns per D14: `match_event_versions.attributes_json`, `match_event_versions.emission_call_sites_json`, `gameplay_mechanics.props_json`, `gameplay_entity_defs.props_json`. Plus per-migration validation probes (insert/delete stub rows for the 10 CHECK widenings + new table: 1 channel + 1 entity type + 1 gameplay_entity_defs.kind + 7 gameplay_mechanics.kind) and per-loader idempotency probes.
3. **Validation runbook + cross-project audit.** Add a KTX section to `VALIDATION-RUNBOOK.md` mirroring the existing per-engine sections (Sections 1-8 adapted: per-kind row-count probes, JSONB regression cross-reference, cross-project sibling-handler audit). Run a cross-project audit (Opus medium subagent, 5 engines now) and write the report under `docs/superpowers/reviews/`. Confirms KTX onboarding doesn't break prior-engine probes and surfaces any new sibling-handler divergences.

Runnable state at phase boundary: every KTX kind has equality-assertion F1 probes that fail loudly on count drift; the JSONB regression gate covers every KTX JSONB column; the validation runbook documents the KTX validation workflow; the cross-project audit report sits under `docs/superpowers/reviews/` ready for arc-reviewer consumption. KTX onboarding now has the same auditability as the four prior engines.

## Inputs from previous phase

Phase 6 complete:

- Phase 0 doctrine fixes shipped including the F22 corrections at `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` lines 5 (scope statement) + 373 (out-of-scope KTX bullet). If Phase 0 missed VALIDATION-RUNBOOK.md, Task 7 escalates and the operator returns to Phase 0 for the fix before Phase 7 boundary verification can pass.
- `entities` table contains 7 KTX `match_event` rows (1 per XSD complexType: pick_mapitem, pick_backpack, drop_backpack, pick_powerup, drop_powerup, damage, death).
- `match_event_versions` table contains 7 rows (one per match_event entity at the active KTX version) with non-NULL `attributes_json` (JSONB object describing per-event XSD attributes) and non-NULL `emission_call_sites_json` (JSONB array of 13 emission call sites grouped by complexType: 6 pick_mapitem, 1 each for pick_powerup / drop_powerup / pick_backpack / drop_backpack, 2 damage, 1 death).
- `gameplay_entity_defs` table contains 13 KTX `monster` rows from `bloodfest_monster_array[]` with `gameplay_source_id='ktx'`; each row's `props_json` carries `hp_for_kill` (per the F9 amendment), `count_per_wave`, `boss_able`, `array_position`, `is_first_required`.
- `gameplay_mechanics` table contains the Phase 3-5 rows: 27 `game_mode`, ~309 `mode_default`, 5 `election_type`, 27 `death_rule`, 3 `score_system`, 31 `drop_item`, 15 `loc_macro`, 21 `teamplay_message` (all with `gameplay_source_id='ktx'`).
- `log_template_versions` table contains KTX rows with `channel='logfile'` (~28 source-line emissions for `log_printf`; per-format-string dedup yields >=7 unique format strings whose `format_string` starts with the per-event tab-prefix shape `\t\t\t<`).
- `oracle_meta` reflects the Phase 6 ship.
- `bun --version` >= 1.3 in `apps/qw-oracle/`.
- Postgres dev container running and reachable.
- Latest applied migration is the gameplay-kinds widening migration (per Phase 1); all three KTX migrations are recorded in `schema_migrations`.

## Files touched

### Created

```
docs/superpowers/reviews/2026-05-XX-ktx-onboarding-cross-project-audit.md     # cross-project audit report
```

### Modified

```
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts                         # add KTX F1 floor probes (entity-table types) + KTX gameplay-table kind probes + KTX anchor probes; extend probeJsonbNotStrings targets array
apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts                    # add tests for the new KTX probe shapes (mirror existing test patterns)
apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md                       # add per-engine "KTX" section mirroring ezQuake / FTE / QWCL / MVDSV format; remove the "tree-sitter (KTX) gets a separate runbook" carve-out (already removed in Phase 0 per F22, verify here)
```

### Deleted

```
(none -- Phase 7 is purely additive to the validation surface)
```

## Tasks

### Task 1: Author KTX F1 floor probes for entity-table types in `quality-grid.ts`

**Goal:** Add equality-assertion floor probes for the five KTX entity-table types (cvar / command / info_key / log_template / match_event) using the existing `makeFloorCountProbe` + `makeFloorSourceStateProbe` helpers. Mirror the existing `MVDSV_FLOOR_PROBES` shape; register the new `KTX_FLOOR_PROBES` array in `REGRESSION_PROBES`.

**Note on "floor" naming vs equality semantics:** the helper is named `makeFloorCountProbe` but implements equality (`actual === expected`). Per the `quality-grid.ts` line 86 comment, "post-v17, all F1.*.count probes are equality assertions, not floors." Phase 7 follows that convention. For source-harvested KTX kinds where the live count may drift legitimately (cvar / command / info_key / log_template), the probe FAILs on first run if the post-Phase-2 count differs from the value shipped here; the operator updates the `expected` constant to the live count in a follow-up commit before proceeding to Phase 7 boundary verification. This is the same operator-update pattern used in MVDSV's Phase 2e ship.

**Files:**

- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (modified -- add new probe array + registry entry)

**Steps:**

- [ ] Locate the per-engine floor-probe arrays in `quality-grid.ts` (search for `EZQUAKE_FLOOR_PROBES`, `FTE_FLOOR_PROBES`, `MVDSV_FLOOR_PROBES`, `QWCL_FLOOR_PROBES`). Note: each array spreads into the `REGRESSION_PROBES` registry (search for `...EZQUAKE_FLOOR_PROBES,`).
- [ ] Add a new `KTX_FLOOR_PROBES` array immediately after `QWCL_FLOOR_PROBES`. Content (KTX has 5 entity-table types: cvar / command / info_key / log_template / match_event; counts use the locked F1-F4 + F14 anchors with `>=` floor semantics for source-harvested types and equality for fixed counts):

```ts
const KTX_FLOOR_PROBES: Probe[] = [
  // Pass 1 entity-table types (Phase 2). Counts reproduce the F1-F4 anchor
  // floors at canonical-1.46 (master HEAD); F1.ktx.cvars_count for example
  // is the live `RegisterCvar*` registration count, harvested-from-source.
  // Equality assertion against the post-execution snapshot per the post-v17
  // probe convention; bump the expected value when KTX source legitimately
  // gains/loses entries (verified by source-walk).
  makeFloorCountProbe('ktx', 'cvar', 192),
  makeFloorSourceStateProbe('ktx', 'cvar', { source_backed: 192 }),
  makeFloorCountProbe('ktx', 'command', 356),
  makeFloorSourceStateProbe('ktx', 'command', { source_backed: 356 }),
  makeFloorCountProbe('ktx', 'info_key', 7),
  makeFloorSourceStateProbe('ktx', 'info_key', { source_backed: 7 }),
  makeFloorCountProbe('ktx', 'log_template', 1500),
  makeFloorSourceStateProbe('ktx', 'log_template', { source_backed: 1500 }),
  // Pass 4.5 entity-table type (Phase 6) -- match_event lives in entities
  // table with per-version body in match_event_versions.
  makeFloorCountProbe('ktx', 'match_event', 7),
  makeFloorSourceStateProbe('ktx', 'match_event', { source_backed: 7 }),
];
```

- [ ] Register the new array in `REGRESSION_PROBES` by adding `...KTX_FLOOR_PROBES,` immediately after `...QWCL_FLOOR_PROBES,`.
- [ ] Update the comment block at lines 1378-1399 (the per-project floor-probe count snapshot) to add the KTX row:

```
  ktx:     command=356, cvar=192, info_key=7, log_template=1500,
           match_event=7  (5 types)
  total: 31 (project, type) pairs -> 62 floor probes (count + source_state).
```

(adjust the totals; the KTX count is provisional pending Phase 2/6 execution -- the operator updates the `expected` values to live counts in a follow-up commit if drift surfaces.)

**Verification:**

```bash
# After-task: list the registered floor probes; expect 62 entries (was 52).
bun -e "import('./apps/qw-oracle/scripts/load-knowledge/quality-grid.js').then(m => console.log(m.listProbes().filter(p => p.name.includes('floor.')).length))"
# PASS condition: returns 62
# FAIL condition: returns 52 (KTX_FLOOR_PROBES not registered) or any other value (count drift)
```

```bash
# Static check: Project type admits 'ktx'.
grep -n "type Project" apps/qw-oracle/scripts/load-knowledge/types.ts
# PASS condition: line 8 shows `'ktx'` in the union; otherwise the probe target rejects.
```

**Execution mode:** subagent (Sonnet medium) -- 5 entity-type probes + 1 array registration + 1 comment block update; clear spec; mirrors existing FTE / MVDSV pattern. Sonnet medium floor per `feedback_model_effort_range.md`.

---

### Task 2: Author KTX gameplay-table kind probes (new `makeGameplayKindProbe` helper)

**Goal:** Add per-kind equality-assertion probes for the eight new gameplay-table kinds (1 in `gameplay_entity_defs` for `monster`; 7 in `gameplay_mechanics` for `game_mode` / `mode_default` / `election_type` / `score_system` / `drop_item` / `loc_macro` / `teamplay_message`). Mirror `makeFloorCountProbe`'s shape via a new helper that queries the gameplay tables.

**Note on `death_rule`:** `death_rule` is already in `gameplay_mechanics.kind` enum (not added by KTX migration); but Phase 4 emits 27 `death_rule` rows scoped to KTX. The probe still needs a count anchor, so `death_rule` ships as a KTX kind probe even though the enum widening isn't a KTX delta.

**Files:**

- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (modified -- add new helper + per-kind probe array + registry entries)
- `apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts` (modified -- add tests for the new helper mirroring the existing `makeFloorCountProbe` test patterns)

**Steps:**

- [ ] Add the new helper immediately after `makeFloorSourceStateProbe` in `quality-grid.ts`. Mirror that helper's shape (skip-when-not-target-project sentinel + equality assertion; `name = F1.${gameplay_source_id}.gameplay_kind.${kind}_count`):

```ts
export function makeGameplayKindProbe(
  gameplay_source_id: string,
  table: 'gameplay_entity_defs' | 'gameplay_mechanics',
  kind: string,
  expected: number,
): Probe {
  const name = `F1.${gameplay_source_id}.gameplay_kind.${kind}_count`;
  return {
    name,
    family: 'regression',
    description: `Gameplay-kind probe: ${table}[gameplay_source_id=${gameplay_source_id}, kind=${kind}] equals ${expected}.`,
    run: async (ctx: ProbeContext): Promise<ProbeResult> => {
      // Gameplay rows are project-scoped via gameplay_source_id; we want this
      // probe to run when ctx.project matches gameplay_source_id semantically
      // OR when running cross-project (we expose under the 'ktx' project tag
      // by convention; runs only under ctx.project === gameplay_source_id to
      // avoid duplicate execution per project).
      if (ctx.project !== gameplay_source_id) {
        return {
          name,
          family: 'regression',
          description: '',
          status: 'PASS',
          count: 0,
          summary: `skipped (not ${gameplay_source_id} project)`,
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

- [ ] Add a `KTX_GAMEPLAY_KIND_PROBES` array immediately after `KTX_FLOOR_PROBES`. Content reproduces the F5-F13 anchors (game_mode=27, mode_default=309, election_type=5, death_rule=27, score_system=3, drop_item=31, loc_macro=15, teamplay_message=21, monster=13):

```ts
const KTX_GAMEPLAY_KIND_PROBES: Probe[] = [
  // gameplay_entity_defs (Phase 5: monster only; per migration 010 widening).
  makeGameplayKindProbe('ktx', 'gameplay_entity_defs', 'monster', 13),
  // gameplay_mechanics (Phases 3 / 4 / 5; counts from F5-F13 anchors).
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'game_mode', 27),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'mode_default', 309),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'election_type', 5),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'death_rule', 27),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'score_system', 3),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'drop_item', 31),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'loc_macro', 15),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'teamplay_message', 21),
];
```

(`mode_default=309` is the locked F6 anchor; if the live count drifts within the [280, 360] band per Phase 3's tolerance comment, the operator updates the `expected` value.)

- [ ] Register `...KTX_GAMEPLAY_KIND_PROBES,` in `REGRESSION_PROBES` immediately after `...KTX_FLOOR_PROBES,`.
- [ ] Add a parallel test block to `quality-grid.test.ts` mirroring the existing `describe('makeFloorCountProbe', ...)` shape:

```ts
describe('makeGameplayKindProbe', () => {
  beforeEach(async () => { await seed(); });

  it('uses canonical probe name', () => {
    const probe = makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'game_mode', 27);
    expect(probe.name).toBe('F1.ktx.gameplay_kind.game_mode_count');
    expect(probe.family).toBe('regression');
  });

  it('skips when project does not match the probe gameplay_source_id', async () => {
    const probe = makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'game_mode', 27);
    const result = await probe.run({ sql, project: 'fte' });
    expect(result.status).toBe('PASS');
    expect(result.summary).toMatch(/skipped/);
  });
});
```

(seed values for gameplay tables aren't required for the basic name + skip-tests; if the existing `seed()` doesn't populate gameplay rows, only name + skip checks are testable here. PASS / FAIL semantics are exercised live during phase-boundary verification.)

- [ ] Add `makeGameplayKindProbe` to the imports at the top of `quality-grid.test.ts`.

**Verification:**

```bash
# After-task: 9 new probe names registered.
bun -e "import('./apps/qw-oracle/scripts/load-knowledge/quality-grid.js').then(m => console.log(m.listProbes().filter(p => p.name.startsWith('F1.ktx.gameplay_kind.')).length))"
# PASS condition: returns 9
# FAIL condition: any other value
```

```bash
# Tests pass.
cd apps/qw-oracle && bunx --bun vitest run scripts/load-knowledge/quality-grid.test.ts 2>/dev/null || true
bunx --bun bun test scripts/load-knowledge/quality-grid.test.ts
# PASS condition: all tests pass (existing + the 2 new makeGameplayKindProbe tests).
# FAIL condition: any failure.
```

**Execution mode:** subagent (Sonnet medium) -- new helper function (~25 lines) + 9-entry probe array + 2 test cases; clear spec; mirrors `makeFloorCountProbe` exactly. Sonnet medium floor.

---

### Task 3: Author KTX anchor probes (per-kind invariants)

**Goal:** Add five anchor probes for KTX-specific load-bearing invariants that go beyond raw row counts. Mirrors the existing `F1.ezquake.anchor.*`, `F1.fte.anchor.*`, `F1.qwcl.anchor.*` pattern (per-project anchors at lines 1565-1660 of `quality-grid.ts`).

**Anchors to ship:**

1. **`F1.ktx.anchor.score_system_positions_length_10`** (per F10 invariant): every KTX `score_system` row's `props_json -> 'positions'` array has exactly 10 elements.
2. **`F1.ktx.anchor.monsters_have_hp_for_kill`** (per F9 amendment): every KTX `monster` row's `props_json -> 'hp_for_kill'` is non-NULL.
3. **`F1.ktx.anchor.fish_first_in_monsters`** (per F9 source comment "FISH _MUST_ BE _FIRST_"): the KTX `monster` row named `fish` has `props_json -> 'array_position' = '0'` AND `props_json -> 'is_first_required' = 'true'`.
4. **`F1.ktx.anchor.match_event_count_7_with_attributes`** (per F14 anchor): exactly 7 KTX `match_event` entities exist; every one has a `match_event_versions` row with non-NULL `attributes_json` (jsonb_typeof = 'object') AND non-NULL `emission_call_sites_json` (jsonb_typeof = 'array').
5. **`F1.ktx.anchor.dual_row_design_log_template_match_event`** (per D10 dual-row design + F17): every KTX `match_event` entity's set of emission call sites in `emission_call_sites_json` has at least one corresponding `log_template_versions` row with `channel='logfile'` AND `format_string` starting with the per-event tab-prefix shape (`\t\t\t<`). Verifies the dual-row design holds end-to-end.

**Files:**

- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (modified -- add 5 anchor probes + registry entries)

**Steps:**

- [ ] Add the 5 new `probeKtx*` functions after the existing per-project anchor probes (after `probeFteEngineVsPluginEzhudSplit` at line 1660). Each function follows the canonical anchor shape (skip-when-not-ktx sentinel; SQL query against the relevant table; PASS/FAIL on the invariant). Full content for each:

```ts
async function probeKtxScoreSystemPositionsLength10(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ktx.anchor.score_system_positions_length_10';
  if (ctx.project !== 'ktx') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ktx project)', examples: [] };
  }
  const rows = await ctx.sql<{ name: string; n: number }[]>`
    SELECT name, jsonb_array_length(props_json -> 'positions')::int AS n
    FROM gameplay_mechanics
    WHERE gameplay_source_id='ktx' AND kind='score_system'
  `;
  const violations = rows.filter(r => r.n !== 10);
  return {
    name,
    family: 'regression',
    description: 'every KTX score_system row has positions array length=10 (F10 invariant)',
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    count: violations.length,
    summary: violations.length === 0 ? `all ${rows.length} score_system rows have positions length=10` : `${violations.length} violations`,
    examples: violations.slice(0, 5).map(r => `${r.name}: positions length=${r.n}`),
  };
}

async function probeKtxMonstersHaveHpForKill(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ktx.anchor.monsters_have_hp_for_kill';
  if (ctx.project !== 'ktx') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ktx project)', examples: [] };
  }
  const rows = await ctx.sql<{ name: string }[]>`
    SELECT name FROM gameplay_entity_defs
    WHERE gameplay_source_id='ktx' AND kind='monster'
      AND (props_json -> 'hp_for_kill') IS NULL
  `;
  return {
    name,
    family: 'regression',
    description: 'every KTX monster row has props_json.hp_for_kill non-NULL (F9 amended source-faithful field name)',
    status: rows.length === 0 ? 'PASS' : 'FAIL',
    count: rows.length,
    summary: rows.length === 0 ? 'all monster rows carry hp_for_kill' : `${rows.length} monster rows missing hp_for_kill`,
    examples: rows.slice(0, 5).map(r => r.name),
  };
}

async function probeKtxFishFirstInMonsters(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ktx.anchor.fish_first_in_monsters';
  if (ctx.project !== 'ktx') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ktx project)', examples: [] };
  }
  const rows = await ctx.sql<{ array_position: string | null; is_first_required: string | null }[]>`
    SELECT (props_json ->> 'array_position') AS array_position,
           (props_json ->> 'is_first_required') AS is_first_required
    FROM gameplay_entity_defs
    WHERE gameplay_source_id='ktx' AND kind='monster' AND name='fish'
  `;
  const row = rows[0];
  const ok = !!row && row.array_position === '0' && row.is_first_required === 'true';
  const summary = ok
    ? "fish is first (array_position=0, is_first_required=true)"
    : `fish row got array_position='${row?.array_position ?? '<missing>'}' is_first_required='${row?.is_first_required ?? '<missing>'}'`;
  return {
    name,
    family: 'regression',
    description: 'fish monster row is at array_position=0 AND is_first_required=true (sp_monsters.c:62 source comment "FISH _MUST_ BE _FIRST_")',
    status: ok ? 'PASS' : 'FAIL',
    count: ok ? 0 : 1,
    summary,
    examples: [],
  };
}

async function probeKtxMatchEventCount7WithAttributes(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ktx.anchor.match_event_count_7_with_attributes';
  if (ctx.project !== 'ktx') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ktx project)', examples: [] };
  }
  const rows = await ctx.sql<{
    entity_count: number;
    versions_with_attrs: number;
    versions_with_sites: number;
  }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM entities WHERE project='ktx' AND type='match_event') AS entity_count,
      (SELECT COUNT(*)::int FROM match_event_versions
        WHERE attributes_json IS NOT NULL AND jsonb_typeof(attributes_json)='object') AS versions_with_attrs,
      (SELECT COUNT(*)::int FROM match_event_versions
        WHERE emission_call_sites_json IS NOT NULL AND jsonb_typeof(emission_call_sites_json)='array') AS versions_with_sites
  `;
  const r = rows[0]!;
  const ok = r.entity_count === 7 && r.versions_with_attrs >= 7 && r.versions_with_sites >= 7;
  return {
    name,
    family: 'regression',
    description: 'KTX match_event count=7 (F14 anchor) AND every match_event_versions row has attributes_json + emission_call_sites_json (D14 JSONB shape)',
    status: ok ? 'PASS' : 'FAIL',
    count: ok ? 0 : 1,
    summary: `entities=${r.entity_count} (expected 7), versions with attrs object=${r.versions_with_attrs} (>=7), versions with sites array=${r.versions_with_sites} (>=7)`,
    examples: [],
  };
}

async function probeKtxDualRowLogTemplateMatchEvent(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ktx.anchor.dual_row_design_log_template_match_event';
  if (ctx.project !== 'ktx') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ktx project)', examples: [] };
  }
  // Per D10: every match_event has at least one log_template peer with
  // channel='logfile' AND format_string starting with the per-event tab-prefix
  // shape (\t\t\t<). The dual rows must coexist; deduplication is forbidden.
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM log_template_versions lv
    JOIN entities e ON lv.entity_id=e.id
    WHERE e.project='ktx' AND e.type='log_template'
      AND lv.channel='logfile'
      AND lv.format_string LIKE E'\\t\\t\\t<%'
  `;
  const n = rows[0]!.n;
  const ok = n >= 7;
  return {
    name,
    family: 'regression',
    description: 'dual-row design holds: at least 7 KTX log_template rows with channel=logfile + tab-prefix-event format string (D10 + F17)',
    status: ok ? 'PASS' : 'FAIL',
    count: n,
    summary: ok ? `${n} dual-row peers present` : `only ${n} dual-row peers (expected >=7)`,
    examples: [],
  };
}
```

- [ ] Register the 5 new probes in `REGRESSION_PROBES` immediately after the existing `F1.fte.anchor.engine_vs_plugin_ezhud_split` entry:

```ts
  // KTX anchor probes (added <DATE>) -- per-project load-bearing invariants
  // for KTX onboarding (F5-F14 anchors + D10 dual-row design + D14 JSONB shape).
  { name: 'F1.ktx.anchor.score_system_positions_length_10', family: 'regression', description: '', run: probeKtxScoreSystemPositionsLength10 },
  { name: 'F1.ktx.anchor.monsters_have_hp_for_kill', family: 'regression', description: '', run: probeKtxMonstersHaveHpForKill },
  { name: 'F1.ktx.anchor.fish_first_in_monsters', family: 'regression', description: '', run: probeKtxFishFirstInMonsters },
  { name: 'F1.ktx.anchor.match_event_count_7_with_attributes', family: 'regression', description: '', run: probeKtxMatchEventCount7WithAttributes },
  { name: 'F1.ktx.anchor.dual_row_design_log_template_match_event', family: 'regression', description: '', run: probeKtxDualRowLogTemplateMatchEvent },
```

**Verification:**

```bash
# 5 anchor probes registered.
bun -e "import('./apps/qw-oracle/scripts/load-knowledge/quality-grid.js').then(m => console.log(m.listProbes().filter(p => p.name.startsWith('F1.ktx.anchor.')).length))"
# PASS condition: returns 5
# FAIL condition: any other value
```

```bash
# Run the KTX anchor probes against the live dev DB.
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project ktx --family regression
# PASS condition: all 5 KTX anchor probes return PASS.
# FAIL condition: any FAIL or ERROR; recovery section consulted.
```

**Execution mode:** subagent (Sonnet medium) -- 5 anchor probe functions (~30 lines each) + 5 registry entries; clear spec; mirrors existing per-project anchor pattern. Sonnet medium floor.

---

### Task 4: Extend `F1.jsonb_columns_not_strings` probe with KTX-relevant columns

**Goal:** Per D14 + F21: extend `probeJsonbNotStrings` (lines 215-266 of `quality-grid.ts`) to include the four new KTX-relevant JSONB columns. The probe target list adds:

- `match_event_versions.attributes_json` (Phase 6)
- `match_event_versions.emission_call_sites_json` (Phase 6)
- `gameplay_mechanics.props_json` (Phases 3 / 4 / 5)
- `gameplay_entity_defs.props_json` (Phase 5 monster handler)

(`log_template_versions.all_call_sites_json`, `gameplay_mechanics.ruleset_gate_json`, `gameplay_entity_defs.ruleset_gate_json` are already in the target list -- no changes needed there.)

**Files:**

- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (modified -- 4 new entries in the `targets` array inside `probeJsonbNotStrings`)

**Steps:**

- [ ] Edit `probeJsonbNotStrings` (line 215). Add four new entries to the `targets` array (between the existing `release_notes.author_handles_json` line and the `gameplay_entity_defs.ruleset_gate_json` line, OR just append at the end -- order is irrelevant since the probe iterates):

```ts
    { table: 'match_event_versions', column: 'attributes_json' },
    { table: 'match_event_versions', column: 'emission_call_sites_json' },
    { table: 'gameplay_mechanics', column: 'props_json' },
    { table: 'gameplay_entity_defs', column: 'props_json' },
```

- [ ] Update the docstring above `probeJsonbNotStrings` (lines 207-214) to reference the KTX additions:

```ts
// JSONB-shape regression: every JSONB column intended to hold an array or
// object must NOT contain a JSONB string scalar. Pre-fix loaders called
// JSON.stringify before binding to JSONB params; postgres-js then JSON-encoded
// the string a second time, storing a JSONB string-of-JSON instead of the
// intended structure. Failure here means a loader regressed to the legacy
// SQLite-era TEXT-with-stringify pattern. The probe runs cross-project on a
// single anchor (ezquake) so it doesn't quadruple-count when invoked per
// project; other-project runs no-op. Phase 7 (KTX onboarding) extends the
// target list with match_event_versions.{attributes_json,emission_call_sites_json}
// + gameplay_{mechanics,entity_defs}.props_json (D14 + F21).
```

**Verification:**

```bash
# Inspect the targets list for the four KTX additions.
grep -n "match_event_versions\|gameplay_mechanics.*props_json\|gameplay_entity_defs.*props_json" apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
# PASS condition: returns >= 4 distinct match lines for the 4 KTX additions.
# FAIL condition: returns < 4 (one or more KTX columns missing).
```

```bash
# Live probe run against the dev DB (after Phase 6 ship).
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project ezquake --probe F1.jsonb_columns_not_strings
# PASS condition: status PASS; total=0.
# FAIL condition: status FAIL with examples naming the offending KTX columns -- the loader regressed to the SQLite-era TEXT-with-stringify pattern.
```

**Execution mode:** inline -- small edit to existing predicate; full file content shipped above; no logic synthesis. Per D18 inline rule.

---

### Task 5: Author per-loader idempotency probes

**Goal:** Per D15 (idempotent loaders + regression guards stay armed) + F21: ship a per-loader idempotency check that the operator runs at phase boundary and that the validation runbook references. The check re-runs each KTX loader and asserts no row count delta + no content drift on the second run.

**Loaders to probe (8 total -- 4 Pass 1 reuse + 4 Pass 5 new):**

- `load-cvars` (KTX dispatch added in Phase 2)
- `load-commands` (KTX dispatch added in Phase 2)
- `load-info-keys` (KTX dispatch added in Phase 2)
- `load-log-templates` (KTX dispatch added in Phase 2)
- `load-modes` (NEW in Phase 3)
- `load-gameplay-taxonomies` (NEW in Phase 4)
- `load-gameplay-tables` (NEW in Phase 5)
- `load-match-events` (NEW in Phase 6)

**Strategy:** ship a single `idempotency-ktx.sh` script under `apps/qw-oracle/scripts/extractors/ktx/` that captures pre-run row counts + content hashes, re-runs the KTX dispatch end-to-end (`extract-tag --project ktx --version <head> --ordinal <head_ordinal> --force` -- `--force` bypasses the >50% drop guard since we expect zero drift), captures post-run counts + hashes, and asserts identity. Mirrors the prior-engine validation runbook Section 1.3 idempotency convention.

**Files:**

- `apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh` (created -- shell script for the operator)

**Steps:**

- [ ] Create `apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh` with the following content. The script captures `(table, count, content_hash)` triples for each KTX-scoped table set; runs the loader; captures again; diffs. Three explicit table sets keep the WHERE clauses simple and table-shape-specific (the `entities` table joins on `project`; `*_versions` tables join through `entities` on `entity_id`; `gameplay_*` tables join on `gameplay_source_id`). Adding a new KTX table later is a one-line addition to the relevant set.

```bash
#!/usr/bin/env bash
#
# Phase 7 idempotency probe: re-run KTX extract-tag end-to-end and assert
# zero row-count drift + zero content-hash drift across every KTX-scoped
# table. Per decisions.md D15: every loader is idempotent by construction;
# bug manifests as count-inflation false positives (re-run doubles rows)
# or silent JSONB drift (stringification on second load). This script
# gates both classes.
#
# Usage:
#   bash apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh
#
# Exit codes:
#   0 -- idempotent (no drift across all KTX-scoped tables)
#   1 -- count drift OR content-hash drift detected; review the diff output

set -euo pipefail

cd "$(dirname "$0")/../../../.."

DB_URL="${DATABASE_URL:?DATABASE_URL must be set to the qw_oracle dev DB}"

# Three table sets, each with its own scoping convention:
#   ENTITIES_TABLE: filter directly on project='ktx'.
#   VERSIONS_TABLES: join entities on entity_id, filter project='ktx'.
#   GAMEPLAY_TABLES: filter on gameplay_source_id='ktx'.
ENTITIES_TABLE="entities"
VERSIONS_TABLES=(
  cvar_versions
  command_versions
  info_key_versions
  log_template_versions
  match_event_versions
)
GAMEPLAY_TABLES=(
  gameplay_mechanics
  gameplay_entity_defs
)

snapshot() {
  local label="$1"
  local outfile="/tmp/ktx-idempotency-${label}.txt"
  : > "$outfile"

  # entities table: scoped by project='ktx'.
  psql "$DB_URL" -At -c "
    SELECT 'entities', COUNT(*),
           COALESCE(MD5(string_agg(t::text, '|' ORDER BY t::text)), 'EMPTY')
    FROM (SELECT * FROM ${ENTITIES_TABLE} WHERE project='ktx' ORDER BY id) t
  " >> "$outfile"

  # *_versions tables: join entities on entity_id, filter project='ktx'.
  for t in "${VERSIONS_TABLES[@]}"; do
    psql "$DB_URL" -At -c "
      SELECT '${t}', COUNT(*),
             COALESCE(MD5(string_agg(v::text, '|' ORDER BY v::text)), 'EMPTY')
      FROM (
        SELECT v.*
        FROM ${t} v
        JOIN entities e ON v.entity_id = e.id
        WHERE e.project = 'ktx'
      ) v
    " >> "$outfile"
  done

  # gameplay_* tables: scoped by gameplay_source_id='ktx'.
  for t in "${GAMEPLAY_TABLES[@]}"; do
    psql "$DB_URL" -At -c "
      SELECT '${t}', COUNT(*),
             COALESCE(MD5(string_agg(g::text, '|' ORDER BY g::text)), 'EMPTY')
      FROM (SELECT * FROM ${t} WHERE gameplay_source_id='ktx' ORDER BY id) g
    " >> "$outfile"
  done

  echo "$outfile"
}

echo "=== KTX idempotency probe ==="
echo
echo "[1/3] Pre-run snapshot..."
PRE=$(snapshot pre)

echo "[2/3] Re-run KTX dispatch (--force bypasses >50% drop guard) ..."
HEAD_ORDINAL=$(npm --prefix apps/qw-oracle --no-workspaces --silent run load-knowledge -- show-head-ordinal 2>/dev/null | tail -1)
HEAD_VERSION="head"  # KTX dispatch resolves head per Arc 1's existing convention
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project ktx --version "$HEAD_VERSION" --ordinal "$HEAD_ORDINAL" --force 2>&1 | tail -20

echo "[3/3] Post-run snapshot..."
POST=$(snapshot post)

echo
echo "Diff (pre vs post):"
DIFF_OUT=$(diff "$PRE" "$POST" || true)
if [ -z "$DIFF_OUT" ]; then
  echo "  (no drift; idempotent)"
  rm -f "$PRE" "$POST"
  exit 0
fi
echo "$DIFF_OUT"
echo
echo "FAIL: idempotency violated. Pre-run snapshot at $PRE, post-run at $POST."
exit 1
```

- [ ] `chmod +x apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh`.

**Verification:**

```bash
# Script exists + executable.
test -x apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh && echo OK
# PASS condition: prints OK
# FAIL condition: anything else
```

```bash
# Run the probe against the live dev DB (post-Phase-6 ship).
bash apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh
# PASS condition: exits 0 with "(no drift; idempotent)" output.
# FAIL condition: exits 1 with a diff showing count or hash drift on any KTX table; recovery consulted.
```

**Execution mode:** subagent (Sonnet medium) -- shell script (~70 lines) with embedded SQL + tabular snapshotting; mirrors existing prior-engine idempotency convention; Sonnet medium floor for code synthesis.

---

### Task 6: Author KTX section in `VALIDATION-RUNBOOK.md` (includes per-migration validation probes inline)

**Goal:** Add a per-engine "KTX" section to `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` mirroring the existing per-engine sections. The KTX section walks Sections 1-8 of the runbook adapted to KTX content (per-kind row counts including the gameplay tables; JSONB regression cross-reference; cross-project sibling-handler audit). The section also ships per-migration validation probes inline (per spec section 5.5 + D5): insert/delete stub-row tests for each of the three KTX migrations covering all 10 CHECK widenings + the new `match_event_versions` table.

**Per-migration probe coverage (10 widenings + 1 table + 2 indexes):**

- **Migration "log_template_versions.channel widening" (admits `'logfile'`):** 1 positive insert + 1 negative-shape rejection.
- **Migration "entities.type widening + match_event_versions table" (admits `'match_event'` + creates the table):** 1 positive insert (entities + paired versions row) + 1 negative-shape rejection + 1 table-existence check (`to_regclass('match_event_versions')`) + 1 index-count check (2 indexes per spec section 5.5).
- **Migration "gameplay-kind widenings" (1 in `gameplay_entity_defs.kind` + 7 in `gameplay_mechanics.kind`):** 8 positive inserts (one per new kind value) + 2 negative-shape rejections (one per table).

Total: 10 positive + 4 negative + 1 table-existence + 1 index-count = 16 SQL probes shipped inline in the runbook.

**Coverage notes:**
- KTX is a libclang-based extractor (per D2), so its validation lives in this runbook (NOT a separate `VALIDATION-RUNBOOK-KTX.md`). The previous "KTX (tree-sitter) gets a separate runbook" carve-out at lines 5 + 373 was already corrected in Phase 0 per F22; verify the correction survives.
- KTX is the first engine to ship gameplay-content rows (modes / taxonomies / tables / match_event); the runbook's KTX section establishes the validation pattern for future KTX-shape ports.

**Files:**

- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` (modified -- new "KTX-specific validation" section near the end; verify F22 doctrine fix at lines 5 + 373)

**Steps:**

- [ ] Verify the F22 doctrine fix at line 5 (the runbook scope statement) survived Phase 0 -- the line should now say `Tree-sitter extractors get a separate runbook (none currently exist)` or equivalent neutral framing. If the line still says `Tree-sitter extractors (KTX) get a separate runbook when KTX ships`, escalate to operator -- Phase 0 recovery needed.
- [ ] Verify the F22 doctrine fix at line 373 (the "Out of scope" section) survived Phase 0 -- the KTX (tree-sitter) bullet should be deleted or replaced with a libclang-affirming line. If still present, escalate.
- [ ] Add a new section "KTX-specific validation" near the end (between the existing "Forks" and "Out of scope" sections, OR within the existing per-engine pattern -- match whatever convention prior engines have if a per-engine inventory exists). Section content (full markdown, ASCII only):

```markdown
## KTX-specific validation

KTX is a libclang-based cross-codebase port (per `decisions.md` D2 + D3) -- not a fork. Extraction methodology mirrors ezQuake / FTE / QWCL / MVDSV (Sections 1-8 above apply); the differences below capture KTX-specific surfaces.

### Per-kind row counts

KTX exposes 14 kinds across the entities-table types and the qw-namespace gameplay tables. Counts are locked anchors per `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` (F1-F14):

**Entities-table types (canonical-1.46 master HEAD):**

| Kind | Count | Anchor | F1 probe |
|---|---:|---|---|
| cvar | 192 | F1 | F1.ktx.floor.cvar_count + F1.ktx.floor.cvar_source_state |
| command | 356 | F2 amended | F1.ktx.floor.command_count + F1.ktx.floor.command_source_state |
| info_key | 7 | F3 amended | F1.ktx.floor.info_key_count + F1.ktx.floor.info_key_source_state |
| log_template | ~1500 | F4 (1500-2000 unique format strings) | F1.ktx.floor.log_template_count + F1.ktx.floor.log_template_source_state |
| match_event | 7 | F14 | F1.ktx.floor.match_event_count + F1.ktx.floor.match_event_source_state + F1.ktx.anchor.match_event_count_7_with_attributes |

**Gameplay-table kinds (`gameplay_source_id='ktx'`):**

| Kind | Table | Count | Anchor | F1 probe |
|---|---|---:|---|---|
| monster | gameplay_entity_defs | 13 | F9 amended (hp_for_kill) | F1.ktx.gameplay_kind.monster_count + F1.ktx.anchor.monsters_have_hp_for_kill + F1.ktx.anchor.fish_first_in_monsters |
| game_mode | gameplay_mechanics | 27 | F5 | F1.ktx.gameplay_kind.game_mode_count |
| mode_default | gameplay_mechanics | 309 | F6 (~309) | F1.ktx.gameplay_kind.mode_default_count |
| election_type | gameplay_mechanics | 5 | F7 | F1.ktx.gameplay_kind.election_type_count |
| death_rule | gameplay_mechanics | 27 | F8 | F1.ktx.gameplay_kind.death_rule_count |
| score_system | gameplay_mechanics | 3 | F10 | F1.ktx.gameplay_kind.score_system_count + F1.ktx.anchor.score_system_positions_length_10 |
| drop_item | gameplay_mechanics | 31 | F11 amended (was 30) | F1.ktx.gameplay_kind.drop_item_count |
| loc_macro | gameplay_mechanics | 15 | F12 | F1.ktx.gameplay_kind.loc_macro_count |
| teamplay_message | gameplay_mechanics | 21 | F13 | F1.ktx.gameplay_kind.teamplay_message_count |

Run probe family on the dev DB after every KTX extract:

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project ktx --family both
```

PASS condition: every F1.ktx.* probe returns PASS; F2 anomaly probes either CLEAN or carry a tracked HANDOVER deferral.

### JSONB-binding regression gate

D14 + F21: every JSONB column written by a KTX loader passes its JS value directly (or wrapped with `tx.json(...)`) -- no `JSON.stringify(...)` followed by TEXT bind. The regression gate `F1.jsonb_columns_not_strings` runs cross-project with KTX-relevant target columns:

- `match_event_versions.attributes_json`
- `match_event_versions.emission_call_sites_json`
- `gameplay_mechanics.props_json`
- `gameplay_mechanics.ruleset_gate_json`
- `gameplay_entity_defs.props_json`
- `gameplay_entity_defs.ruleset_gate_json`
- `log_template_versions.all_call_sites_json` (Pass 1 reuse; KTX rows must respect)

A FAIL means a KTX loader regressed to the legacy SQLite-era TEXT-with-stringify pattern. Diagnose by:

1. Run `SELECT table_name, column_name, COUNT(*) FROM (...)` for each target with `jsonb_typeof(col)='string'`; identify the offending loader.
2. Inspect the loader's `tx.json(...)` / direct-JS-value usage; fix the binding pattern.
3. Re-run the loader; re-run the probe.

### Idempotency

Per D15, every KTX loader is idempotent by construction. Re-run `extract-tag --project ktx --version <head> --ordinal <head_ordinal> --force` and confirm zero row-count delta + zero content-hash drift across all KTX-scoped tables (entities, cvar_versions, command_versions, info_key_versions, log_template_versions, match_event_versions, gameplay_mechanics, gameplay_entity_defs).

Operator runs the probe via:

```bash
bash apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh
```

Exit 0 = idempotent. Exit 1 + diff output = drift; see Recovery (Section 7-style adapted for KTX) below.

### Per-migration validation probes

Three migrations land KTX schema deltas. Each migration ships positive insert + negative-shape rejection probes. (Migration filenames may be 008/009/010 OR 009/010/011 depending on Phase 1's resolution of the existing 008_community_schema.sql collision; verify the actual filenames from `apps/qw-oracle/db/migrations/` before running the probes.)

**Migration "log_template_versions.channel widening" (admits `'logfile'`):**

```sql
-- Positive insert: 'logfile' admitted.
BEGIN;
INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
  VALUES ('ktx', 'log_template', 'STUB_LF_POS', 'ktx:log_template:STUB_LF_POS', 'source_backed', 'head', 'head', NOW(), NOW())
  RETURNING id;  -- :id1
INSERT INTO log_template_versions (entity_id, version, channel, format_string, source_file, source_line, all_call_sites_json)
  VALUES (:id1, 'head', 'logfile', 'STUB', 'stub.c', 1, '[]'::jsonb);
-- PASS: both inserts succeed.
ROLLBACK;

-- Negative shape: 'nonexistent_channel' rejected.
BEGIN;
INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
  VALUES ('ktx', 'log_template', 'STUB_LF_NEG', 'ktx:log_template:STUB_LF_NEG', 'source_backed', 'head', 'head', NOW(), NOW())
  RETURNING id;  -- :id1
INSERT INTO log_template_versions (entity_id, version, channel, format_string, source_file, source_line, all_call_sites_json)
  VALUES (:id1, 'head', 'nonexistent_channel', 'STUB', 'stub.c', 1, '[]'::jsonb);
-- PASS: second insert raises CHECK violation.
ROLLBACK;
```

**Migration "entities.type widening + match_event_versions table" (admits `'match_event'` + creates the new table):**

```sql
-- Table exists.
SELECT to_regclass('match_event_versions') IS NOT NULL AS exists;
-- PASS: returns t.

-- 2 indexes exist (verify names against the 009 migration; they may be named
-- idx_match_event_versions_complex_type + idx_match_event_versions_xsd_version
-- per spec section 5.5 but Phase 1 may have settled different names).
SELECT indexname FROM pg_indexes
WHERE tablename='match_event_versions'
ORDER BY indexname;
-- PASS: returns 2 indexnames matching the 009 migration content.

-- Positive insert: type='match_event' admitted; paired versions row inserts.
BEGIN;
INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
  VALUES ('ktx', 'match_event', 'STUB_ME_POS', 'ktx:match_event:STUB_ME_POS', 'source_backed', 'head', 'head', NOW(), NOW())
  RETURNING id;  -- :id1
INSERT INTO match_event_versions (entity_id, version, complex_type, xsd_version, attributes_json, emission_call_sites_json)
  VALUES (:id1, 'head', 'pick_mapitem', '0.1', '{"name":"item_health"}'::jsonb, '[]'::jsonb);
-- PASS: both inserts succeed.
ROLLBACK;

-- Negative shape: type='nonexistent_type' rejected.
BEGIN;
INSERT INTO entities (project, type, name, canonical_id, source_state, first_seen_version, last_seen_version, created_at, updated_at)
  VALUES ('ktx', 'nonexistent_type', 'STUB_ME_NEG', 'ktx:nonexistent_type:STUB_ME_NEG', 'source_backed', 'head', 'head', NOW(), NOW());
-- PASS: insert raises CHECK violation.
ROLLBACK;
```

**Migration "gameplay-kind widenings" (admits 1 + 7 new kind values):**

```sql
-- Pre-flight: gameplay_sources['ktx'] row exists (Phase 1 obligation).
SELECT id FROM gameplay_sources WHERE id='ktx';
-- PASS: returns 1 row.

-- Positive inserts: 1 monster row in gameplay_entity_defs.
BEGIN;
INSERT INTO gameplay_entity_defs (gameplay_source_id, kind, name, ruleset_gate_json, props_json)
  VALUES ('ktx', 'monster', 'STUB_MONSTER', '{}'::jsonb, '{}'::jsonb);
-- PASS: insert succeeds.
ROLLBACK;

-- Positive inserts: 7 stub rows for new gameplay_mechanics.kind values.
DO $$
DECLARE k text;
BEGIN
  FOR k IN VALUES ('game_mode'),('mode_default'),('election_type'),('score_system'),('drop_item'),('loc_macro'),('teamplay_message')
  LOOP
    BEGIN
      INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, ruleset_gate_json, props_json)
        VALUES ('ktx', k, 'STUB_'||k, '{}'::jsonb, '{}'::jsonb);
      RAISE NOTICE 'OK: %', k;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FAIL: %', k;
    END;
  END LOOP;
  ROLLBACK;
END $$;
-- PASS: 7 NOTICE OK lines.

-- Negative shape: kind='nonexistent_kind' rejected in both tables.
BEGIN;
INSERT INTO gameplay_entity_defs (gameplay_source_id, kind, name, ruleset_gate_json, props_json)
  VALUES ('ktx', 'nonexistent_kind', 'STUB_ED_NEG', '{}'::jsonb, '{}'::jsonb);
-- PASS: insert raises CHECK violation.
ROLLBACK;

BEGIN;
INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, ruleset_gate_json, props_json)
  VALUES ('ktx', 'nonexistent_kind', 'STUB_GM_NEG', '{}'::jsonb, '{}'::jsonb);
-- PASS: insert raises CHECK violation.
ROLLBACK;
```

### Cross-project audit (KTX-aware)

Run Section 4.4 (cross-project sibling-handler shape audit) with KTX added to the lineup. Five projects now: ezquake, fte, qwcl, mvdsv, ktx. Per D3, KTX handlers inherit only from `Visitor`; KTX is a port, not a fork. Verify:

- KTX `_handler_*.py` files extend `Visitor` only (per D3 + D6 -- match_events handler is the documented carve-out per the 2026-05-05 D3 amendment).
- No KTX handler subclasses an ezQuake / FTE / MVDSV / QWCL handler.
- Per-pattern lift candidates (Pattern 6 cross-header lift in `extractor_lib._source` from Phase 1; any new helpers introduced) are correctly placed in `extractor_lib/`, not duplicated under `ktx/`.

Cross-project audit report at `docs/superpowers/reviews/2026-05-XX-ktx-onboarding-cross-project-audit.md` produced by Task 7 of Phase 7. The report documents the 5-engine lineup post-KTX, surfaces any new shape divergences, and confirms no prior-engine probe regressions.
```

(Section ends. Indentation intentional; mirrors VALIDATION-RUNBOOK's existing per-engine convention.)

- [ ] Update the runbook's "Revision history" section at the bottom with a 2026-05-XX entry naming Phase 7 + the KTX section addition.

**Verification:**

```bash
# F22 doctrine fix at line 5 survived (KTX is libclang-based, no separate runbook).
grep -in "tree-sitter" apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
# PASS condition: zero matches OR matches that NEUTRALLY say "tree-sitter extractors (none currently exist)" or similar (case-insensitive grep catches both "Tree-sitter" line-5 capitalisation and "tree-sitter" line-373 capitalisation).
# FAIL condition: any match that calls KTX a tree-sitter extractor or asserts a separate runbook for KTX.
```

```bash
# KTX section landed.
grep -n "## KTX-specific validation" apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
# PASS condition: returns one match.
```

```bash
# KTX kind probes documented in the runbook.
grep -c "F1.ktx" apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
# PASS condition: returns >= 14 (one anchor per KTX kind).
```

**Execution mode:** inline -- markdown content shipped inline; mirror existing per-engine format; no logic synthesis; no code. Per D18.

---

### Task 7: Cross-project audit (5-engine post-KTX)

**Dependency:** Task 6 (VALIDATION-RUNBOOK.md KTX section) MUST land BEFORE this task dispatches. The audit subagent reads the post-Phase-7 runbook as part of its inputs; running the audit against a stale runbook would produce a misaligned report.

**Goal:** Run the cross-project audit per F21 + decisions.md D3. Confirms KTX onboarding doesn't break prior-engine probes; surfaces any new sibling-handler divergences (with KTX as the 5th engine in the lineup); produces a report under `docs/superpowers/reviews/`.

**Scope:** lighter than the 2026-04-28 cross-extractor audit (`docs/superpowers/reviews/2026-04-28-cross-extractor-audit-report.md`) -- we're confirming the audit's invariants survive KTX, not re-litigating shape questions. The new audit checks:

1. **F1 + F2 grids for all 5 projects** -- every F1 probe returns PASS or skipped; every F2 returns CLEAN or carries a tracked HANDOVER deferral. Catch any prior-engine probe that breaks because a schema migration or new helper subtly changed the upstream shape.
2. **Architecture invariants survive KTX** -- per the 2026-04-28 audit's D.5 invariants: `extractor_lib/` Tier-1 list grew (Pattern 6 lift adds the depth-1 #include walker; Phase 1 carve-out); per-project handler counts now include KTX (=8 handlers); no project subclasses another project's handler.
3. **Sibling-handler shape divergences** -- check the four KTX libclang handlers (cvars, commands, info_keys, log_templates) against the analogous prior-engine handlers (MVDSV is the closest cross-codebase-port template per D3). Surface any new divergences as findings. The match_event handler is the documented carve-out per D3 amendment; not part of the cross-handler comparison.
4. **Schema CHECK reachability** -- the new KTX widenings (1 entity type + 8 gameplay kinds + 1 channel) all reach from KTX handlers. Confirm via grep against handler emissions.
5. **valid* carve-outs** survive: `validInfoKey` regex + `validLogTemplate` regex still admit KTX outputs (the `*at` / `*is` / `*ml` / `*mm` / `*mp` / `*mt` / `*mu` userinfo keys per F3 amendment; `logfile` channel value).
6. **Idempotency + reproducibility** -- KTX extraction is byte-reproducible across runs (Section 1.1 of VALIDATION-RUNBOOK); KTX loaders are idempotent (D15). Confirms via the Task 5 idempotency-ktx.sh probe.

**Files:**

- `docs/superpowers/reviews/2026-05-XX-ktx-onboarding-cross-project-audit.md` (created -- the audit report)

**Steps:**

- [ ] Dispatch a cross-project audit subagent. Subagent prompt:

```
You are the Phase 7 cross-project audit subagent for KTX onboarding. Mode: lightweight cross-project audit (5 engines now: ezquake, fte, qwcl, mvdsv, ktx). Read these documents end-to-end:

1. docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md (full spec, focus on Pass 5 + Pass 4.5 + Pass 1)
2. docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md (D2/D3/D4/D5/D6/D14/D15)
3. docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md (F1-F22)
4. docs/superpowers/reviews/2026-04-28-cross-extractor-audit-report.md (the prior 4-engine cross-project audit; the format we're mirroring with adjustments for KTX)
5. apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md (post-Phase-7 with KTX section)
6. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md (handler patterns + tier model)

Then walk these dimensions, producing a report at docs/superpowers/reviews/2026-05-XX-ktx-onboarding-cross-project-audit.md (replace XX with the actual day-of-month for the run date):

D.1 -- F1 + F2 grid status across all 5 projects.
  For each project, run the regression and anomaly probes; tabulate PASS / FAIL / CLEAN / FOUND counts.
  Any prior-engine probe that breaks post-KTX is a finding (severity: critical if regression, important if anomaly newly tripped).

D.2 -- Architecture invariants survive KTX.
  - extractor_lib/ Tier-1 file list (was 5 pre-KTX; Phase 1 lift adds the depth-1 #include walker -- still Tier-1; expect same 5 files OR 5 with widened internals).
  - Per-project handler counts: ezquake=8, fte=8, qwcl=3, mvdsv=7, ktx=8 (4 Pass 1 + 4 Pass 5).
  - Class-name convention: every KTX handler class name follows <Type>KtxHandler.
  - Tier-1 invariants: every KTX handler extends Visitor only (per D3); match_events is the documented carve-out (per the 2026-05-05 D3 amendment).

D.3 -- Sibling-handler shape divergences (KTX as 5th engine).
  Compare KTX cvars / commands / info_keys / log_templates handlers against the closest cross-codebase-port template (MVDSV). Surface any shape divergences that don't match a documented justification. Check:
  - flag_raw / default_value normalization (post-v17 contract).
  - on_change handler emission (KTX uses RegisterCvar*; mvdsv uses Cvar_Register*).
  - source_state assignment.
  - dedup conventions (per-file _seen_in_file, full canonical name post-Pattern-14 suffix).
  - Pattern 14 suffix application (KTX uses :frogbot:std + :frogbot:editor + :userinfo).
  - JSONB column population (per D14; pass JS values directly).

D.4 -- Schema CHECK reachability for new KTX widenings.
  - log_template_versions.channel admits 'logfile' AND KTX handler emits it. Verified in Phase 2 + Phase 7 Task 6.
  - entities.type admits 'match_event' AND KTX handler emits it. Verified in Phase 6 + Phase 7 Task 6.
  - gameplay_entity_defs.kind admits 'monster' AND KTX handler emits it. Verified in Phase 5 + Phase 7 Task 6.
  - gameplay_mechanics.kind admits 7 new values + KTX handler emits each. Verified in Phases 3-5 + Phase 7 Task 6.

D.5 -- valid* carve-outs survive.
  - validInfoKey admits KTX userinfo keys (*at, *is, *ml, *mm, *mp, *mt, *mu).
  - validLogTemplate admits 'logfile' channel.

D.6 -- Idempotency + reproducibility.
  - KTX extraction byte-reproducible across runs (libclang Section 1.1 of VALIDATION-RUNBOOK).
  - KTX loaders idempotent per Task 5 idempotency-ktx.sh probe.

D.7 -- HANDOVER deferrals from F22 + D4 amendment + F11 amendment.
  Confirm the depth-N Pattern 6 revisit (parked in D4 amendment + F11 amendment) is captured in HANDOVER.md as a future-arc sidequest. Confirm the F22 doctrine fix survived Phase 0 + Phase 8 verification.

Severity legend: C (critical -- silent data loss / regression / shipping wrong content); I (important -- representation gap / new divergence); N (nit -- style inconsistency).

Report shape per finding (mirror the 2026-04-28 audit shape):

| ID | Sev | Projects | Description | Disposition |
|---|:-:|---|---|---|
| D.X.Y | C/I/N | <projects> | <one-paragraph description> | drain-now / drain-in-arc / HANDOVER / informational |

Disposition summary at the end (counts per disposition); architecture verdict.

Length: under ~600 lines. Lighter than the 2026-04-28 audit (which was 4-engine pre-consolidation, surfaced 27 findings); KTX onboarding's audit should be <15 findings if Phases 0-6 land cleanly.
```

- [ ] After the subagent returns, review the report. If CRITICAL findings surface, the phase MD's "Open questions / deferred items" section captures them and operator decides whether they block phase boundary or land as Phase 8 carry-overs.
- [ ] Commit the report file to `docs/superpowers/reviews/`.

**Verification:**

```bash
# Audit report exists.
ls -la docs/superpowers/reviews/2026-05-*-ktx-onboarding-cross-project-audit.md
# PASS condition: returns one file (the audit ships with a date stamp).
# FAIL condition: zero files (subagent didn't produce the report) or multiple files (drafter accidentally created copies).
```

```bash
# Audit covers all 5 engines.
grep -c "ezquake\|fte\|qwcl\|mvdsv\|ktx" docs/superpowers/reviews/2026-05-*-ktx-onboarding-cross-project-audit.md
# PASS condition: returns >= 50 (every dimension table mentions every engine).
```

```bash
# Disposition summary present.
grep -n "## Disposition summary\|^- \*\*Drain-now\|^- \*\*Drain-in-arc\|^- \*\*HANDOVER" docs/superpowers/reviews/2026-05-*-ktx-onboarding-cross-project-audit.md
# PASS condition: returns >= 4 lines (Disposition summary header + at least 3 disposition categories).
```

**Execution mode:** subagent (Opus medium) -- breadth across 5 engines; report-shaped output; the qw-oracle Arc 1 had this kind of audit at 4-engine scale. Opus medium per `feedback_model_effort_range.md`'s "cross-cutting review / post-arc analysis" rule. NOT Opus MAX -- this is lightweight (no spec design, no architecture re-think).

---

### Task 8: Single commit landing all Phase 7 changes

**Goal:** Single commit on main per D20. Message names Phase 7 + the validation surfaces added.

**Files:**

- (all files modified / created in Tasks 1-8)

**Steps:**

- [ ] Stage all Phase 7 changes (verify no stray files):

```bash
git status --short
# expect: M apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
#         M apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts
#         M apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
#         A apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh
#         A docs/superpowers/reviews/2026-05-XX-ktx-onboarding-cross-project-audit.md
```

- [ ] Verify no security-flag triggers (no .env / no service-account files staged).
- [ ] Confirm `bunx tsc --noEmit` from `apps/qw-oracle/` returns clean.
- [ ] Commit:

```bash
git add apps/qw-oracle/scripts/load-knowledge/quality-grid.ts \
        apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts \
        apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md \
        apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh \
        docs/superpowers/reviews/2026-05-*-ktx-onboarding-cross-project-audit.md

git commit -m "$(cat <<'EOF'
feat(qw-oracle): KTX Phase 7 -- F1 quality-grid probes + JSONB regression gate + validation runbook + 5-engine cross-project audit

- 5 KTX entity-type floor probes + 9 KTX gameplay-kind probes (new makeGameplayKindProbe helper) + 5 anchor probes for invariants (positions length=10 / hp_for_kill / fish first / match_event 7+attrs / dual-row design)
- F1.jsonb_columns_not_strings extends to match_event_versions.{attributes,emission_call_sites}_json + gameplay_{mechanics,entity_defs}.props_json (D14)
- Per-loader idempotency probe (idempotency-ktx.sh) covers all 8 KTX loaders
- VALIDATION-RUNBOOK.md gains a "KTX-specific validation" section with per-kind row-count probes + JSONB regression cross-reference + per-migration validation probes (positive insert + negative-shape rejection for each CHECK widening)
- Cross-project audit report (5-engine lineup post-KTX) lands at docs/superpowers/reviews/

Resolves F21. Phase ownership: per `docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-7-validation.md`.
EOF
)"
```

- [ ] `git push origin main` per D20 (push at phase boundaries).

**Verification:**

```bash
git log --oneline -1
# PASS condition: commit message names Phase 7 + the validation surfaces.
```

**Execution mode:** inline -- pure git operations. Per D18.

---

## Verification (phase boundary)

The operator runs the following probes after Task 8 commit lands. PASS / FAIL gate phase exit.

**1. F1 grid PASS for KTX.**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project ktx --family regression
```

PASS condition: every F1.ktx.* probe returns PASS. FAIL condition: any FAIL or ERROR. Recovery section consulted.

**2. F1 grid PASS for prior 4 engines.**

```bash
for proj in ezquake fte qwcl mvdsv; do
  echo "=== $proj ==="
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family regression
done
```

PASS condition: every prior-engine probe returns PASS or skipped (cross-project probes only run under their target project). FAIL condition: any prior-engine FAIL -- a Phase 7 change broke a prior-engine invariant.

**3. F1.jsonb_columns_not_strings PASS post-KTX.**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project ezquake --probe F1.jsonb_columns_not_strings
```

PASS condition: status PASS, total=0. FAIL condition: any KTX column appears in the examples list -- a KTX loader pre-stringified JSONB and shipped string scalars; the offending loader needs the `tx.json(...)` fix per D14.

**4. Idempotency probe PASS.**

```bash
bash apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh
```

PASS condition: exit 0 with "(no drift; idempotent)" output. FAIL condition: exit 1 + diff output -- a loader is non-idempotent; recovery consulted.

**5. Per-migration validation probes PASS.**

```bash
psql "$DATABASE_URL" -f /tmp/ktx-migration-probes.sql
```

(operator extracts the SQL fixtures from `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`'s "Per-migration validation probes" subsection and saves to `/tmp/ktx-migration-probes.sql` -- 10 widening tests + 4 negative-shape rejections + 1 table-existence + 1 index-count check.)

PASS condition: all positive inserts succeed; all negative-shape inserts raise CHECK violations; `to_regclass('match_event_versions')` returns non-NULL; index count = 2.

**6. Cross-project audit report present + complete.**

```bash
test -f docs/superpowers/reviews/2026-05-*-ktx-onboarding-cross-project-audit.md && \
  grep -c "## Disposition summary\|^| D\." docs/superpowers/reviews/2026-05-*-ktx-onboarding-cross-project-audit.md
```

PASS condition: returns >= 8 (Disposition summary header + at least 7 finding rows in the dimension tables). FAIL condition: file missing or counts well below threshold -- subagent didn't complete the audit; recovery consulted.

**7. F22 doctrine fix survived in VALIDATION-RUNBOOK.md.**

```bash
grep -in "tree-sitter (KTX)\|tree-sitter extractors (KTX)\|tree-sitter (KTX) get\|KTX (tree-sitter)" apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
```

PASS condition: zero matches (case-insensitive grep catches both line-5 and line-373 capitalisations). FAIL condition: any match -- Phase 0 doctrine fix regressed OR was never applied to the runbook; Phase 7 corrects in-line (touches the same lines per F22); the runbook ship is otherwise blocked.

**Phase boundary PASS:** all 7 probes return PASS. The operator updates the phase index in `README.md` Status column from `not started` -> `in execution` -> `shipped`.

**Phase boundary FAIL:** any probe returns FAIL. Consult Recovery section. Do NOT proceed to Phase 8 until Phase 7 verification is green.

## Outputs to next phase

State Phase 8 inherits:

- F1 quality-grid probes for all 14 KTX kinds; equality-assertion floor + 5 anchor probes; registered in `quality-grid.ts`.
- `F1.jsonb_columns_not_strings` extends to KTX-relevant JSONB columns (4 new targets); regression gate covers all 14 KTX columns.
- Per-loader idempotency probe (`apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh`) gates re-run drift across 8 KTX loaders.
- `VALIDATION-RUNBOOK.md` has a "KTX-specific validation" section mirroring the per-engine pattern; per-migration probes ship inline; F22 doctrine fix verified surviving.
- Cross-project audit report at `docs/superpowers/reviews/2026-05-XX-ktx-onboarding-cross-project-audit.md` covers the 5-engine post-KTX lineup; any open findings carry tracked dispositions.

Phase 8 obligations (per `decisions.md` D17 + the Phase 8 drafter prompt) consume the runbook's KTX section, re-verify the F22 + F19 doctrine fixes survived the arc, absorb the HANDOVER `qw-oracle slim-doc Arc 1 refresh sweep` backlog item (per F20), and add the EXTRACTOR-PLAYBOOK additions (Pre-Port Discovery Sweep, Pre-Commit Discovery Cross-Check, Handler-grouping rationale, Pattern 15 STRING_LITERAL-array walker, dual-row design note per F17).

## Open questions / deferred items

- **Question:** Migration filenames (Phase 1's "008/009/010" semantic labels collide with the existing `008_community_schema.sql` from the qwiki community arc). Phase 1 may have settled on 009/010/011 OR renamed the community migration; the runbook's per-migration probes reference filenames Phase 7 doesn't author.
  **Default chosen for now:** Phase 7 ships the runbook section using the semantic labels ("log_template_versions.channel widening" rather than "008") and asks the operator to map to the actual filenames during execution. The probe SQL works regardless of filename; only the runbook's intro paragraph needs the actual filenames.
  **Who can resolve:** Phase 1 executor; Phase 7 operator updates the runbook intro after Phase 1 ships.

- **Question:** F1.ktx.floor.log_template_count expected value is provisional (1500 floor; live source has 1823 raw call sites with ~1500-2000 unique post-dedup format strings per F4 amendment). Phase 7 probes ship `expected = 1500` as a floor; if the live count post-Phase-2 is materially different, the probe FAILs and the operator updates.
  **Default chosen for now:** ship `expected = 1500` and document the floor framing in a comment block above `KTX_FLOOR_PROBES`. Operator updates to live count in a follow-up commit if drift surfaces during Phase 7 boundary verification.
  **Who can resolve:** Phase 7 operator at boundary verification.

- **Question:** F1.ktx.gameplay_kind.mode_default_count is `expected = 309` (locked F6 anchor) but live count may drift in [280, 360] band per Phase 3's tolerance comment. The post-v17 equality probe convention conflicts with the band semantics.
  **Default chosen for now:** ship `expected = 309` with equality semantics; operator updates to the live post-Phase-3 count if drift surfaces during boundary verification. Document the band in a comment.
  **Who can resolve:** Phase 7 operator at boundary verification.

- **Question:** Cross-project audit's report date stamp -- the filename uses `2026-05-XX` placeholder. The actual day-of-month gets filled in at execution time (Phase 7 ships paper plan; the drafter doesn't know the run date).
  **Default chosen for now:** the Task 7 subagent prompt says "replace XX with the actual day-of-month for the run date." Operator monitors filename creation.
  **Who can resolve:** Phase 7 operator at execution time.

## Recovery (if verification fails)

- **If Probe 1 fails (F1.ktx.* FAIL):** identify the failing probe; trace to the extractor handler that produces the row count or the loader that writes it. Most likely cause: source-walked anchor drift (live source moved since Phase 2-6 source-walks). If drift is real, update the `expected` value in `quality-grid.ts` to the live count + amend the relevant F-anchor in `review-findings.md` with a dated block. If drift is a real regression, the relevant phase needs re-execution.

- **If Probe 2 fails (prior-engine probe FAIL):** Phase 7's changes broke a prior-engine invariant. Most likely cause: the new `makeGameplayKindProbe` helper has a SQL bug that pollutes shared state (e.g., wrong table reference); OR the extension to `probeJsonbNotStrings`'s targets array introduced a syntax error that broke the probe registration. Inspect the failing probe; revert the relevant Phase 7 task; re-run.

- **If Probe 3 fails (F1.jsonb_columns_not_strings):** the example list names the offending KTX column. Trace to the loader (e.g., `load-match-events.ts` for `match_event_versions.attributes_json`); check the binding -- expect direct JS value pass OR `tx.json(...)` wrap; reject any `JSON.stringify(...)` followed by TEXT bind. Fix the loader; re-run extract; re-run probe.

- **If Probe 4 fails (idempotency):** the diff output names the table with drift. Two likely causes: (a) the loader's UPSERT key is wrong (re-run produces new rows instead of UPDATE), (b) the loader pre-stringifies JSONB on second run (caught also by Probe 3 -- both fire). Fix the loader; re-run.

- **If Probe 5 fails (per-migration validation):** the failing SQL output names the migration / CHECK. Two likely causes: (a) Phase 1's migration didn't widen the CHECK (revert, re-author), (b) the runbook's SQL has a typo (fix the runbook). Distinguish by checking the actual `pg_constraint` definition: `\d+ <table>` -- compare the CHECK against the migration source.

- **If Probe 6 fails (audit report missing/incomplete):** the Task 7 subagent didn't complete. Re-dispatch with a stricter prompt: "produce the report file or HALT with NEEDS_CONTEXT explaining what blocked you." If the subagent reports a CRITICAL finding, surface to operator; the operator decides whether the finding blocks Phase 7 boundary OR carries to Phase 8.

- **If Probe 7 fails (F22 doctrine recursion):** Phase 0 + the doctrine fix didn't survive. Phase 7 fixes in-line by updating the offending lines (5 + 373 + any new recursion) in `VALIDATION-RUNBOOK.md`. Re-commit; re-verify.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F21** (Validation runbook obligation per KTX onboarding). Resolved by Tasks 1 + 2 + 3 (F1 probes for all 14 KTX kinds: 5 entity-table types via `makeFloorCountProbe` + 9 gameplay-table kinds via `makeGameplayKindProbe` + 5 anchor probes for invariants), Task 4 (JSONB-binding regression gate extends to KTX-relevant columns per D14), Task 5 (per-loader idempotency probe gates re-run drift), Task 6 (VALIDATION-RUNBOOK.md gains a "KTX-specific validation" section + per-migration validation probes shipped inline as positive insert + negative-shape rejection for each of the 10 CHECK widenings + the new `match_event_versions` table), Task 7 (cross-project audit report covers the 5-engine post-KTX lineup).

(Phase 7 touches no other findings -- F22 doctrine fix is verified-surviving via Probe 7 of phase boundary verification, but the actual fix lives in Phase 0; Phase 7 is the safety net against recursion.)

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

After the phase MD is drafted, the drafter spawns a sub-agent with the `Agent` tool, `subagent_type=Explore`, model: Sonnet medium, and the following brief shape:

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-7-validation.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
Read the design spec section relevant to this phase:
  /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
  (relevant sections: Pass 1 + Pass 5 + spec preamble's "Doctrine fixes deferred to end-of-arc" block + section 5.5 per-migration validation probes + Pass 4.5 match_event)

Then verify, file-by-file:

1. Every locked count anchor in review-findings.md (F1-F14 with amendments) -- verify the phase MD's F1 probes reproduce the count exactly. If the phase plans to extract more or fewer rows, flag CRITICAL.

2. The full 14-KTX-kind probe coverage:
   - 5 entity-table types (cvar, command, info_key, log_template, match_event) -- ship via makeFloorCountProbe + makeFloorSourceStateProbe.
   - 9 gameplay-table kinds (monster in gameplay_entity_defs; game_mode, mode_default, election_type, death_rule, score_system, drop_item, loc_macro, teamplay_message in gameplay_mechanics) -- ship via the new makeGameplayKindProbe helper.
   - 5 anchor probes for invariants (positions length=10 / hp_for_kill / fish first / match_event 7+attrs / dual-row design).
   Confirm: 5 + 9 + 5 = 19 KTX-specific probes; all 14 kinds have at least one count probe.

3. JSONB-binding regression gate extension (Task 4) -- confirm the four new targets named in the phase MD (match_event_versions.{attributes,emission_call_sites}_json + gameplay_{mechanics,entity_defs}.props_json) match the D14 list verbatim. The existing target list (log_template_versions.all_call_sites_json + gameplay_{mechanics,entity_defs}.ruleset_gate_json) is preserved.

4. Per-migration probes (Task 6, shipped inline in the VALIDATION-RUNBOOK.md KTX section):
   - 10 CHECK widenings covered: 1 channel widening + 1 entity-type widening + 1 gameplay_entity_defs.kind widening + 7 gameplay_mechanics.kind widenings = 10 total per D5. Flag if the runbook section misses any.
   - 4 negative-shape rejections covered (one per CHECK target table).
   - new table existence (match_event_versions via to_regclass) + 2 index checks (via pg_indexes): confirm both probes present.

5. Idempotency probe (Task 5) covers all KTX-scoped tables:
   - 4 Pass 1 reuse: load-cvars / load-commands / load-info-keys / load-log-templates.
   - 4 Pass 5 new: load-modes / load-gameplay-taxonomies / load-gameplay-tables / load-match-events.
   Confirm: idempotency-ktx.sh covers all 8 loaders' target tables.

6. Cross-project audit (Task 7):
   - Subagent prompt is complete + correctly scopes the audit to 5 engines.
   - Audit report path matches docs/superpowers/reviews/<date>-ktx-onboarding-cross-project-audit.md.
   - Severity legend matches the 2026-04-28 cross-extractor audit precedent.

7. VALIDATION-RUNBOOK.md edits (Task 6):
   - F22 doctrine fix verified surviving at lines 5 + 373.
   - KTX section ships per-kind row counts + JSONB cross-reference + per-migration probes.

8. Every JSONB column write reference -- confirm the loader passes the JS value directly (or wraps with tx.json(...)). The phase MD itself doesn't write loaders; it verifies. Flag any reference in phase MD prose suggesting JSON.stringify would be acceptable.

9. Every file path mentioned in "Files touched":
   - For Modified: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF is expected NOT to exist yet -- this is a paper plan, not executed code. Do NOT flag a Created file's non-existence as CRITICAL.

10. Per-task "Execution mode" declaration -- confirm rationale matches D18:
   - Task 1: subagent (Sonnet medium) -- code synthesis across quality-grid.ts; OK.
   - Task 2: subagent (Sonnet medium) -- new helper + tests; OK.
   - Task 3: subagent (Sonnet medium) -- 5 anchor probes; OK.
   - Task 4: inline -- small edit to existing predicate; OK.
   - Task 5: subagent (Sonnet medium) -- shell script; OK.
   - Task 6: inline -- markdown content + per-migration SQL stubs shipped inline in the runbook section; OK.
   - Task 7: subagent (Opus medium) -- cross-project audit; OK per "cross-cutting review" rule.
   - Task 8: inline -- git operations; OK.
   Flag if any inline task involves logic synthesis (>70% inline for code-shape phase is the qw-oracle Arc 1 inline-execution defect).

11. Every shell command -- does it use `bun` or `npm --prefix apps/qw-oracle --no-workspaces` (per project CLAUDE.md "bun install for adding/installing deps; Bun is the runtime")? Inspect the migration-probe SQL for `psql` invocation correctness.

12. "Engineer ports X" / "fills in details" / TODO smell -- list any.

13. Tables, columns, fields, or kinds the phase introduces that aren't in decisions.md and aren't in the design spec -- flag as potential drift. Particularly: makeGameplayKindProbe is a NEW helper; verify decisions.md / design spec doesn't already prescribe a different shape.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings to the phase MD before declaring the phase ready for operator review. If a sub-agent finding contradicts `decisions.md`, decisions.md wins and the finding is rejected with a one-line rationale in this MD's "Open questions" section.
