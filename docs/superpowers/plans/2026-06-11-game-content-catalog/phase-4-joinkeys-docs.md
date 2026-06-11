# Phase 4 -- map join-keys, conventions docs, verify-gameplay fix, surfacing

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full) and `review-findings.md` -- this phase owns F4
>    (verify-gameplay), F5 (citation-form doc text), F6 (SCHEMA.md count drift).
> 2. Read spec sections D5 (join keys), D7 (SCHEMA.md conventions), M3
>    (verify-gameplay ride-along), M5 (surfacing).
> 3. Read the live source this phase touches -- verified 2026-06-11 against the
>    tree + dev DB, NOT the spec's claims: `id1-gameplay.yaml` item cluster
>    (25 item rows, lines 253-560; prop-block shape), the live `maps`
>    `item_summary_json` (JSONB, 20 ALL-LOWERCASE keys across 254 maps),
>    `serve/mcp/src/tools/search-mechanics.ts` + `search-gameplay-entities.ts`
>    (both accept `gameplay_source`; default = ALL sources -- the F4 bug),
>    `serve/mcp/scripts/verify-gameplay.ts` (70 lines), `build-snapshot.ts`
>    (`emitGameplay`, `--project qw` -> `qw-gameplay.json`), `SCHEMA.md`
>    (maps :496 case drift, v14 :530 + KTX-onboarding :881 mode_default "~309"
>    vs live 317), `VALIDATION-RUNBOOK.md` (KTX-specific section shape, 381-573).
> 4. After drafting, dispatch the verification sub-agent before declaring ready.

## Goal

Close the arc: wire the maps join keys onto the catalog, land the conventions
this arc relied on into the living manual, fix the stale MCP smoke test, and
confirm the data reaches its consumers. Concretely: (a) add a `map_summary_key`
props alias to the 24 keyed id1 item rows so `maps.item_summary_json`'s 20-key
vocabulary joins the catalog by the same word (D5/D21); (b) add a "Gameplay
conventions" section to `SCHEMA.md` documenting the eight tricks this arc locked
(gate vocabulary, three-layer model, props-variant convention, two-form
citation rule, `map_summary_key` aliasing, `expected_counts` gate, dual-writer
disjointness, registry model) and fix the F6 mode_default count drift in passing
(D7/D20); (c) add a `qw` gameplay validation section to `VALIDATION-RUNBOOK.md`
mirroring the per-engine + KTX-specific sections (D13/D20); (d) fix
`verify-gameplay.ts` so its assertions are `gameplay_source`-scoped and its
totals derive from per-source sums instead of frozen `37/41` literals that rot
(F4, folds the standing HANDOVER:43 verify-gameplay item); (e) regenerate the
slipgate `qw-gameplay.json` snapshot and spot-verify the MCP surface carries the
arc's new rows (M5/D14 -- verify, do not build); (f) run the full arc-closeout
checklist. No schema migration; no new MCP surface; no new gameplay rows (props
only, so counts are unchanged). Every task ships fully-locked content and runs
`inline` (D19) -- there is no synthesis in this phase, so no fan-out, no
subagent, no Workflow. **Runnable state at boundary:** every maps item key
resolves to a catalog row; `SCHEMA.md` + `VALIDATION-RUNBOOK.md` document the
conventions; `verify-gameplay.ts` is green and rot-proof; `qw-gameplay.json`
carries monsters + ktx overrides + `map_summary_key` props; the full F1 sweep
(`--project qw` + `--project ktx`) and both seed double-loads are green.

## Inputs from previous phase

Phases 0, 1, 2, 3 delivered and must be in place:

- **Phase 0:** the loader accepts the per-seed `expected_counts` STOP-gate (the
  hardcoded `37/41` is gone); `load-knowledge -- citation-gate` and
  `load-knowledge -- seed-idempotency` exist as dispatcher subcommands; the
  Quake v1.06 QC tree is acquired with provenance on `id1`'s
  `gameplay_source.notes`.
- **Phase 1:** the id1 baseline is verified-under-regime; `ID1_GAMEPLAY_KIND_PROBES`
  rides the `--project qw` grid; `expected_counts.mechanics` is at its
  post-audit value (>= 41).
- **Phase 2:** the id1 monster roster (~15 rows, `kind='monster'`, gate `{}`) is
  live and queryable; `expected_counts.entities` is at its post-monster value
  (>= 52).
- **Phase 3:** `ktx-gameplay.yaml` is live (KTX hardcoded override rows, joining
  the id1 baseline by name and the `game_mode` catalog by gate token); the ktx
  `gameplay_sources` row is owned by that seed; keyspace disjointness is proven;
  the ktx F1 grid covers every override kind.
- The dev DB `qw-oracle-postgres-dev` holds the full post-Phase-3 catalog, plus
  the `maps` table (254 maps, every one carrying a 20-key `item_summary_json`).
- **Execution gate (plan D16 / spec M4):** the first Track-A weapon-pair notes
  have shipped; Phases 0-3 have executed. The id1 item rows Phase 4 edits are
  enumerated from the LIVE file at execution, not from any list frozen here (the
  25 item rows are stable through Phases 1-3 -- the audit corrects values in
  place, monsters are a separate cluster -- but RECOUNT/re-read at execution).

## Files touched

### Created

n/a -- Phase 4 is deterministic locked-content; it adds no new files. There is
no `phase-4-findings.md`: no fan-out, no SME gate, no extraction. This MD plus
the doc deliverables are the record.

### Modified

- `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` -- a
  `map_summary_key` prop added to each of the 24 keyed item rows (D21); the items
  cluster header gains a one-line note; `expected_counts` UNTOUCHED (props, not
  rows -- D5).
- `apps/qw-oracle/SCHEMA.md` -- new "Gameplay conventions" section after the KTX
  onboarding arc section (D20); F6 fix at :530 + :881 (mode_default "~309" ->
  317); maps `item_summary_json` key-case fix at :496 (the 20 keys are lowercase
  in the live data, and the `map_summary_key` props this arc writes are
  lowercase).
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` -- new "qw gameplay
  validation" section before "Out of scope" (D13/D20) + a revision-history line.
- `apps/qw-oracle/serve/mcp/scripts/verify-gameplay.ts` -- F4 fix: per-kind and
  headline assertions become `gameplay_source`-scoped and DB-derived; the frozen
  `37/41` totals are replaced by a source-partition invariant.
- `apps/slipgate-app/src/lib/config/data/qw-gameplay.json` -- regenerated via
  `build-snapshot --project qw` (M5); carries the arc's monsters, ktx overrides,
  and `map_summary_key` props.
- `HANDOVER.md` -- the verify-gameplay clause stripped from the bundled
  Small-followups item at :43 (the unrelated `verify-rewrite.ts` env-propagation
  half stays).

### Deleted

n/a -- no deletions. The verify-gameplay edits replace assertion lines in place;
the HANDOVER edit trims a clause from a bundled item, not the whole item.

Note: `quality-grid.ts` is NOT touched. Phase 4 adds no rows (props only), so no
new F1 per-kind count probes. The closeout RUNS the existing `--project qw` +
`--project ktx` grids (Phases 1-3's probes) to confirm they still pass.

## Tasks

Task order is mostly independent; the only hard edge is Task 1 must precede
Task 5 (the snapshot must include the new props). Tasks 2/3 (docs) and Task 4
(verify-gameplay) are independent of each other and of Task 1's data change.
Task 6 (closeout) runs last.

### Task 1 -- map_summary_key props on id1 item rows (inline assembler, D5/D21)

- **Goal:** Alias `maps.item_summary_json`'s 20 keys onto the catalog so a map's
  item summary joins the catalog rows by the same word (D21 aliasing principle:
  names live ON the row, never in a consumer-side translation table).
- **Files:** `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml`.
- **Execution mode:** `inline` -- the YAML assembler is ALWAYS inline (D5/D19);
  the full mapping is locked below. The edit is mechanical (one `map_summary_key`
  line into each named row's `props:` block).
- **THE LOCKED 20-KEY MAPPING** (keys verified lowercase against the live
  `maps.item_summary_json` 2026-06-11; row names verified against the live id1
  item cluster). 1:1 for armors / health / powerups; weapon keys on the
  `pickup_*` rows; ammo keys shared by both small+large variant rows:

  | key | catalog row name(s) | cardinality |
  |---|---|---|
  | `ga` | `green_armor` | 1:1 |
  | `ra` | `red_armor` | 1:1 |
  | `ya` | `yellow_armor` | 1:1 |
  | `mh` | `megahealth_100` | 1:1 |
  | `h25` | `health_25_normal` | 1:1 |
  | `h15` | `health_15_rotten` | 1:1 |
  | `bio` | `biosuit` | 1:1 (envirosuit; grouped with health in the maps vocab) |
  | `quad` | `quad_damage` | 1:1 |
  | `pent` | `pentagram` | 1:1 |
  | `ring` | `ring_of_shadows` | 1:1 |
  | `cells` | `cells_small`, `cells_large` | shared (both rows get `cells`) |
  | `shells` | `shells_small`, `shells_large` | shared |
  | `spikes` | `nails_small`, `nails_large` | shared (nails ARE "spikes" -- classname `item_spikes`) |
  | `rockets` | `rockets_small`, `rockets_large` | shared |
  | `gl` | `pickup_grenade_launcher` | 1:1 |
  | `lg` | `pickup_lightning_gun` | 1:1 |
  | `ng` | `pickup_nailgun` | 1:1 |
  | `rl` | `pickup_rocket_launcher` | 1:1 |
  | `sng` | `pickup_super_nailgun` | 1:1 |
  | `ssg` | `pickup_super_shotgun` | 1:1 |

  20 keys -> 24 rows (16 one-to-one + 4 ammo keys x 2 variants). The 25th item
  row, `backpack`, is a death-drop, not a map-placed summary item -- it gets NO
  `map_summary_key`. `spikes` and `bio` are the two non-obvious mappings (nails
  internal name is "spikes"; biosuit is the envirosuit) -- the SCHEMA.md
  convention text calls them out.
- **Steps:**
  - [ ] Read the LIVE `id1-gameplay.yaml` item cluster (it begins `items:` ~line
    253; 25 `- name:` rows). Confirm the 25 row names match the mapping table
    above; if a Track-A backfill or Phase 1 audit renamed/added an item row,
    HALT and reconcile (the mapping is keyed by row name).
  - [ ] Add `map_summary_key: <key>` as the FIRST line of the `props:` block of
    each of the 24 keyed rows, with a one-line WHY comment on the first
    occurrence only. `map_summary_key` is an ALIAS, not a source-derived value --
    it carries NO `*_source_ref` sibling (it is not cited from the QC source; the
    citation gate ignores it -- the value does not match the ref shape and the key
    does not end in `_source_ref`). Worked exemplars (the exact YAML shape;
    indentation = 6 spaces under `props:`):

    ```yaml
      - name: green_armor
        classname: item_armor1
        pickup_amount: 100
        respawn_seconds: 20
        source_ref: items.qc:386
        props:
          map_summary_key: ga          # maps.item_summary_json join alias (plan D21); not a cited value
          armortype: 0.3
          armortype_source_ref: items.qc:386
          armorvalue_cap: 100
          armorvalue_cap_source_ref: items.qc:387
          classname_source_ref: items.qc:384
          respawn_source_ref: items.qc:412
        notes: absorbs 30% of damage up to 100 armor.
    ```

    Shared-ammo pair (BOTH variant rows carry the same key -- a join returning
    both small + large is the correct answer, D21):

    ```yaml
      - name: cells_small
        classname: item_cells
        pickup_amount: 6
        respawn_seconds: 30
        source_ref: items.qc:993
        props:
          map_summary_key: cells
          ammo_type: cells
          max_carry: 100
          max_carry_source_ref: items.qc:480
          respawn_dm3_dm5_seconds: 15
        notes: null

      - name: cells_large
        classname: item_cells
        pickup_amount: 12
        respawn_seconds: 30
        source_ref: items.qc:987
        props:
          map_summary_key: cells
          ammo_type: cells
          max_carry: 100
          respawn_dm3_dm5_seconds: 15
        notes: null
    ```

    Weapon pickup (the key rides the `pickup_*` ITEM row, not the weapon entity
    row -- map entities ARE pickups, D21):

    ```yaml
      - name: pickup_rocket_launcher
        classname: weapon_rocketlauncher
        pickup_amount: 5
        respawn_seconds: 30
        source_ref: items.qc:604
        props:
          map_summary_key: rl
          ammo_type: rockets
          dm_gate: dm_le_3
        notes: null
    ```

  - [ ] Append a one-line note to the items cluster header
    (`# Cluster 3: items (...)`, ~line 252):

    ```
    # map_summary_key prop (plan D21): aliases maps.item_summary_json's 20 lowercase
    # keys onto these rows (24 of 25; backpack has none). See SCHEMA.md "Gameplay conventions".
    ```
  - [ ] Do NOT touch `expected_counts` -- this task adds props, not rows (D5).
    State this in the commit message.
  - [ ] Reload: `cd apps/qw-oracle && bun run load-knowledge -- load-gameplay`.
    PASS: `total entities=<post-Phase-2 count>`, the SAME totals Phase 2 left,
    NO STOP line (props do not change counts). FAIL: a STOP line -> you changed a
    row count, or `expected_counts` drifted -- recount, do not edit the gate.
- **Verification:**
  - [ ] **Coverage (the D21 join-coverage probe).** Every distinct maps key
    resolves to >= 1 catalog row (case-insensitive):

    ```sql
    WITH map_keys AS (
      SELECT DISTINCT jsonb_object_keys(item_summary_json) AS k
      FROM maps WHERE item_summary_json <> '{}'::jsonb
    ),
    catalog_keys AS (
      SELECT DISTINCT lower(props_json->>'map_summary_key') AS k
      FROM gameplay_entity_defs
      WHERE gameplay_source_id='id1' AND props_json ? 'map_summary_key'
    )
    SELECT m.k AS unresolved_map_key
    FROM map_keys m LEFT JOIN catalog_keys c ON lower(m.k) = c.k
    WHERE c.k IS NULL;
    ```
    PASS: zero rows. FAIL: any `unresolved_map_key` -> a maps key with no catalog
    row (a missed row in the mapping, or a typo'd key value).
  - [ ] **Shape.** Exactly 24 keyed rows, 20 distinct keys:

    ```sql
    SELECT
      COUNT(*) FILTER (WHERE props_json ? 'map_summary_key')::int AS keyed_rows,
      COUNT(DISTINCT lower(props_json->>'map_summary_key'))::int AS distinct_keys
    FROM gameplay_entity_defs WHERE gameplay_source_id='id1' AND kind='item';
    ```
    PASS: `keyed_rows=24`, `distinct_keys=20`. FAIL: `keyed_rows=25` -> backpack
    was keyed (remove it); any other number -> a row was missed or double-keyed.

### Task 2 -- SCHEMA.md "Gameplay conventions" section + F6 + key-case fix (inline, D7/D20)

- **Goal:** Land the conventions this arc relied on into the living manual, and
  correct the F6 count drift + the maps key-case drift while in the file.
- **Files:** `apps/qw-oracle/SCHEMA.md`.
- **Execution mode:** `inline` -- locked doc text (D19); counts verified against
  the live DB at drafting (mode_default = 317).
- **Steps:**
  - [ ] **F6 fix #1 (v14 section, :530).** In the `gameplay_mechanics` bullet,
    change `mode_default carries ~309 per-line overlays` to
    `mode_default carries 317 per-line overlays`.
  - [ ] **F6 fix #2 (KTX onboarding Migration C, :881).** Change the line
    `- \`mode_default\`: ~309 per-line overlays (54 \`common_um_init\` baseline + ~255 per-mode initstring overlays -- per arc D12 per-line granularity).`
    to
    `- \`mode_default\`: 317 per-line overlays (F6: ~309 was the spec-time estimate; Phase 3 + 5.5 retrofit confirmed 317 across parallel + serial runs. 54 \`common_um_init\` baseline + per-mode initstring overlays -- per arc D12 per-line granularity).`
    (Mirrors the RUNBOOK:405 phrasing; drops the unverifiable `~255` sub-count
    rather than asserting a fresh wrong number.)
  - [ ] **Key-case fix (maps section, :496).** Change the `item_summary_json`
    Notes cell from
    `normalized 20-key dict (RA/YA/GA/mh/h25/h15/quad/pent/ring/bio/SSG/NG/SNG/GL/RL/LG/cells/rockets/spikes/shells)`
    to
    `normalized 20-key dict, all-lowercase keys (ga/ra/ya | mh/h25/h15/bio | quad/pent/ring | cells/shells/spikes/rockets | gl/lg/ng/rl/sng/ssg). Joined to the gameplay catalog via each item row's map_summary_key prop -- see "Gameplay conventions".`
    (The live data is lowercase; the catalog `map_summary_key` props this arc
    writes are lowercase. Ride-along: it is the exact vocabulary Task 1 wires --
    see Open questions.)
  - [ ] **Insert the conventions section** immediately AFTER the KTX onboarding
    arc section (after its closing `---`, ~line 912) and BEFORE
    `## v18 (2026-05-18)`. The exact locked content:

    ```markdown
    ## Gameplay conventions (game-content-catalog arc, 2026-06-11)

    The `gameplay_*` tables (defined at v14; kinds widened by the KTX onboarding
    arc) carry conventions that live nowhere else in the schema. This section is
    their durable home (game-content-catalog completion arc, spec D7). Seed files:
    `apps/qw-oracle/scripts/extractors/qw/seeds/{id1,ktx}-gameplay.yaml`, loaded by
    `load-gameplay.ts` (`load-knowledge -- load-gameplay [--yaml <path>]`),
    idempotent upsert keyed `(gameplay_source_id, kind, name, ruleset_gate_json)`.

    ### Three-layer override model

    A KTX gameplay value lives in exactly ONE of three layers; conflating them
    corrupts row identity:

    1. **Knob existence** -- that a cvar like `k_yawnmode` exists. Lives in the
       engine-config track (KTX cvar extraction into `entities`/`cvars`), NOT here.
    2. **What a mode sets a knob to** -- e.g. "ca sets `k_noitems` 1". Lives in
       `gameplay_mechanics.kind='mode_default'` (317 rows, KTX onboarding arc).
    3. **Hardcoded behavior deltas** -- a cvar/mode-gated VALUE in KTX's C code
       that DIVERGES from an id1 baseline row (yawnmode raises axe damage 20 -> 50).
       Lives in `ktx-gameplay.yaml` as ktx-source rows (this arc, Phase 3).

    id1-native deathmatch variants (Quake's own dm1-4 behavior) are NOT a KTX
    layer -- they ride the id1 row as props (see "id1 props-variant convention").

    ### Gate vocabulary (`ruleset_gate_json`)

    Single-key JSON object (KTX onboarding arc convention). Three forms, each
    joining a catalog by the same word:

    - `{"mode":"<token>"}` -- `<token>` is a `game_mode` catalog name (yawnmode /
      midair / instagib / bloodfest / ctf / ...). Joins the 27-row `game_mode`
      catalog + the `mode_default` overlays on the token.
    - `{"dm":N}` -- a deathmatch-number gate that is KTX-specific (not vanilla dmN).
    - `{"cvar":"<name>"}` -- a standalone cvar with no `game_mode` token (`k_dis`,
      `k_classic_shotgun`, ...); the cvar name joins the cvar catalog (plan D22,
      operator-ratified 2026-06-11).

    Catalog rows themselves use `{}` (they DEFINE modes; they aren't gated by
    them). id1 baseline rows and unconditional KTX rows also use `{}`. Compound
    conditions keep the single-key gate; the secondary condition goes in props
    (midair rocket boost: gate `{"mode":"midair"}`, props `requires_quad: true`).

    ### id1 props-variant convention

    id1-native deathmatch variants stay on the id1 row as props with a `*_dm*`
    suffix, NOT as separate gated rows: e.g. `damage_dm_gt_3`, `refire_seconds_dm4`,
    `respawn_dm3_dm5_seconds`, `damage_multiplier_dm4`. The base value is the
    indexable column; the variant is a prop with its own `*_source_ref` sibling.
    (KTX hardcoded deltas, by contrast, become separate ktx-source rows under a
    gate -- that is the three-layer boundary.)

    ### Citation forms (two-form rule, plan D7)

    `source_ref` / per-prop `*_source_ref` values resolve two ways:

    - **Default** (bare, e.g. `weapons.qc:385`) -- relative to the owning source's
      `gameplay_sources.source_root`.
    - **Leading slash** (e.g. `/research/repos/<v106-dir>/shambler.qc:54`) --
      relative to the monorepo root, ignoring `source_root`.

    id1 weapon/item/mechanic refs are bare (resolve under
    `research/repos/qwcl-original/QW/progs/`); id1 MONSTER refs use the
    leading-slash form (they cite the acquired Quake v1.06 tree, OUTSIDE the id1
    source_root, which holds no monster QC); ktx refs are bare (resolve under
    `/research/repos/ktx/src` -- the citation gate strips a leading slash from the
    `source_root` value too). The `citation-gate` probe
    (`load-knowledge -- citation-gate`) resolves every ref under this rule.

    ### `map_summary_key` (maps join alias, plan D21)

    `maps.item_summary_json` speaks 20 short, all-lowercase keys:
    `ga ra ya | mh h25 h15 bio | quad pent ring | cells shells spikes rockets | gl lg ng rl sng ssg`.
    Each id1 item row carries the matching key as a `map_summary_key` prop, so a
    map's item summary joins the catalog by the same word (aliasing principle:
    names live ON the row, never in a consumer-side translation table). 1:1 for
    armors / health / powerups; weapon keys ride the `pickup_*` item rows; ammo
    keys collapse small+large (both variant rows carry the same key -- a join
    returning both variants is the correct answer). Two non-obvious mappings:
    `spikes` = nails (internal classname `item_spikes`), `bio` = the envirosuit.
    24 of the 25 id1 item rows carry a key; `backpack` (a death-drop, not a
    map-placed summary item) carries none. The join is case-insensitive (lowercase
    both sides). `map_summary_key` is an ALIAS, not a cited value -- no
    `*_source_ref`. The pre-existing `maps.class_counts_json` -> `classname` join
    is unrelated and untouched.

    ### `expected_counts` STOP-gate (plan D8)

    Every seed YAML declares its own `expected_counts: {entities, mechanics}`
    block; the loader validates each load against the file's own declaration and
    STOPs (`process.exitCode=1`) on mismatch. The hardcoded `37/41` constants the
    loader carried pre-arc are gone -- they would brick every load that grows the
    catalog and mis-validate `ktx-gameplay.yaml` against id1 numbers. Bump the
    block IN THE SAME COMMIT that adds or removes rows -- a load failing on a stale
    count is the intended tripwire, not a bug. For `ktx-gameplay.yaml` the counts
    cover only the OVERRIDE rows in that file, NOT the extractor-written ktx rows.

    ### Dual-writer disjointness (plan D9 / finding F3)

    ktx gameplay rows have two writers: the extractor pipeline
    (`load-gameplay-tables` / `-taxonomies` / `-modes`, upsert-by-natural-key, no
    DELETE) and the `ktx-gameplay.yaml` seed loader. Both share the conflict target
    `(gameplay_source_id, kind, name, ruleset_gate_json)`; a seed key equal to an
    extractor key makes the two writers silently ping-pong on every re-run.
    Disjointness holds by construction: no seed row uses `kind='death_rule'`
    (extractor-owned, 27 ktx rows) and no seed monster row uses
    `{"mode":"bloodfest"}` (the extractor's 13 spawn-economy rows). Phase 3's
    disjointness probe verifies it.

    ### `gameplay_sources` registry model

    Each source's registry row (`display_name` / `description` / `source_root` /
    `notes`) is owned by that source's seed-file `gameplay_source:` block; the
    loader UPSERTs it. For ktx the extractor-path loaders only ASSERT the row
    exists -- `ktx-gameplay.yaml` is the canonical writer of the ktx registry row
    (finding F3). Live `source_root` forms differ (`id1` bare, `ktx`
    leading-slash); both intend repo-root-relative and the citation gate treats
    them identically.

    ---
    ```
- **Verification:**
  - [ ] `grep -n "~309" apps/qw-oracle/SCHEMA.md` returns NOTHING (both F6 spots
    fixed). `grep -n "317 per-line" apps/qw-oracle/SCHEMA.md` returns two lines.
  - [ ] `grep -n "Gameplay conventions" apps/qw-oracle/SCHEMA.md` returns the new
    heading; it sits between the KTX onboarding section and `## v18`.
  - [ ] `grep -n "RA/YA/GA" apps/qw-oracle/SCHEMA.md` returns NOTHING (the :496
    case fix landed). PASS: all three greps as described. FAIL: a stale `~309` or
    `RA/YA/GA` survives.

### Task 3 -- VALIDATION-RUNBOOK.md "qw gameplay validation" section (inline, D13/D20)

- **Goal:** Document the seed-loaded gameplay validation regime (the D13 probes
  Phase 0 shipped), mirroring the per-engine sections + the KTX-specific section.
- **Files:** `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`.
- **Execution mode:** `inline` -- locked doc text (D19). The qw gameplay content
  is SEED-loaded (not libclang-extracted), so it has no extractor-reproducibility
  / runtime-cross-validation sections; it documents the seed-load regime instead.
- **Steps:**
  - [ ] Insert before `## Out of scope` (~line 577), after the KTX-specific
    section's closing `---`. Locked content:

    ```markdown
    ## qw gameplay validation (game-content-catalog arc, 2026-06-11)

    The `qw`-namespace game content (`gameplay_entity_defs` / `gameplay_mechanics`,
    `gameplay_source_id IN ('id1','ktx')`) is SEED-loaded from
    `scripts/extractors/qw/seeds/{id1,ktx}-gameplay.yaml`, NOT libclang-extracted.
    Sections 1-8 above (extractor reproducibility, runtime cross-validation) do not
    apply; the seed-load regime below is the equivalent (plan D13). Run all checks
    from `apps/qw-oracle/`.

    ### Seed-load reproducibility (`expected_counts` STOP-gate)

    Each seed declares its own `expected_counts: {entities, mechanics}`; the loader
    STOPs on mismatch (plan D8). Reload each seed and confirm a clean load:

    ```bash
    bun run load-knowledge -- load-gameplay                                              # id1 (default)
    bun run load-knowledge -- load-gameplay --yaml scripts/extractors/qw/seeds/ktx-gameplay.yaml  # ktx overrides
    ```

    **Acceptance:** each reports `total entities=<E> mechanics=<M>` equal to that
    file's `expected_counts`, no `STOP` line, exit 0.

    ### Citation gate (two-form rule, plan D7)

    Every `source_ref` / per-prop `*_source_ref` resolves (file exists, line in
    range) under the D7 two-form rule (bare = source_root-relative; leading slash =
    repo-root-relative; the gate strips a leading slash from `source_root` too):

    ```bash
    bun run load-knowledge -- citation-gate            # all sources
    bun run load-knowledge -- citation-gate --source id1
    bun run load-knowledge -- citation-gate --source ktx
    ```

    **Acceptance:** `unresolved=0`. Any unresolved ref IS the work queue (semantic
    correctness is the extraction-verify stage's job, not the gate's).

    ### Seed double-load (idempotency)

    Each seed loads twice with identical counts + content hash (the seed-namespace
    analogue of `idempotency.ts`, which is extract-tag-scoped and excludes `qw`):

    ```bash
    bun run load-knowledge -- seed-idempotency --yaml scripts/extractors/qw/seeds/id1-gameplay.yaml
    bun run load-knowledge -- seed-idempotency --yaml scripts/extractors/qw/seeds/ktx-gameplay.yaml
    ```

    **Acceptance:** `pass=true` for each. A divergence is almost always a
    natural-key collision (re-run idempotency bug), not stale data -- suspect
    idempotency before staleness.

    ### F1 per-kind grid

    Per-(source, kind) equality probes. id1 content rides the `qw` namespace run;
    ktx content rides the `ktx` run (ktx is both project and source):

    ```bash
    bun run load-knowledge -- quality-grid --project qw    # F1.id1.gameplay_kind.*
    bun run load-knowledge -- quality-grid --project ktx   # F1.ktx.gameplay_kind.* (+ extractor taxonomy probes)
    ```

    The authoritative `expected` counts are the values in `ID1_GAMEPLAY_KIND_PROBES`
    (id1) and `KTX_GAMEPLAY_KIND_PROBES` (ktx) in `quality-grid.ts`, bumped in the
    same commit as the data (the D8 tripwire mirrored at the probe layer -- do NOT
    duplicate the numbers here, they rot). **Acceptance:** every
    `F1.{id1,ktx}.gameplay_kind.*` probe PASSes.

    ### Dual-writer disjointness (ktx only, plan D9 / F3)

    ktx gameplay rows have two writers (extractor + seed). The Phase 3 disjointness
    probe asserts no seed key collides with an extractor key: no seed
    `kind='death_rule'` row, no seed monster row gated `{"mode":"bloodfest"}`, and
    the live extractor anchors (`monster` bloodfest=13, `death_rule`=27,
    `mode_default`=317, `game_mode`=27) are intact after the seed load.
    **Acceptance:** the static YAML scan is clean AND all four anchors hold.
    ```
  - [ ] Add a revision-history bullet at the end of the file:

    ```
    - 2026-06-11: qw gameplay validation section added (game-content-catalog arc
      Phase 4). Seed-load reproducibility (expected_counts STOP-gate), citation
      gate (D7 two-form), seed double-load, F1 per-kind grid (id1 + ktx overlay
      kinds), dual-writer disjointness. The qw namespace is seed-loaded, not
      libclang-extracted -- Sections 1-8 do not apply.
    ```
- **Verification:** `grep -n "qw gameplay validation" VALIDATION-RUNBOOK.md`
  returns the heading; it sits before `## Out of scope`. PASS: heading present,
  ordered correctly, revision line added. FAIL: missing / misplaced.

### Task 4 -- verify-gameplay.ts F4 fix (inline, F4 + HANDOVER:43)

- **Goal:** Make the MCP smoke test `gameplay_source`-aware and rot-proof: scope
  the per-kind assertions to id1, and replace the frozen `37/41` totals with a
  source-partition invariant derived from the live DB. Row-count regression is
  the loader's `expected_counts` gate's job (D8); this script verifies the TOOL
  surface faithfully reflects the loaded data.
- **Files:** `apps/qw-oracle/serve/mcp/scripts/verify-gameplay.ts`.
- **Execution mode:** `inline` -- fully-locked TS (the tool signatures were
  live-verified at drafting: `searchMechanics` + `searchGameplayEntities` both
  accept `gameplay_source`, default = ALL sources). Ship the WHOLE file (changes
  concentrate in the tail; the per-entity pins are kept).
- **Locked replacement file** (the per-entity pins L1-44 are kept verbatim with a
  re-baseline note; the search/count tail is replaced):

  ```ts
  // Tier 1 in-process verification for the game-mechanics layer (schema v14+).
  // Imports tool functions directly and asserts data correctness, citation
  // regressions, case-insensitivity, and source-partitioned headline counts.
  // Exit 1 on failure. Run with: bun run scripts/verify-gameplay.ts (from serve/mcp/).
  //
  // Count discipline (game-content-catalog arc, F4): per-kind and headline
  // assertions are gameplay_source-scoped and DERIVED from the live DB, never
  // frozen literals. The catalog grows every phase (audit rows, id1 monsters, ktx
  // overrides), and an unscoped search returns id1 + ktx rows together. Row-count
  // regression is the loader's job (the seed expected_counts STOP-gate, plan D8);
  // this script verifies the TOOL surface faithfully reflects the loaded data.

  import { db } from '../src/db';
  import { lookupGameplayEntity } from '../src/tools/lookup-gameplay-entity';
  import { lookupMechanic } from '../src/tools/lookup-mechanic';
  import { searchGameplayEntities } from '../src/tools/search-gameplay-entities';
  import { searchMechanics } from '../src/tools/search-mechanics';

  let failures = 0;
  function assert(cond: boolean, label: string) {
    if (!cond) { console.error('FAIL', label); failures++; } else { console.log('PASS', label); }
  }

  // --- per-entity spot checks (citation-regression pins) ---------------------
  // These source_ref pins are deliberate regression anchors. Phase 1's audit may
  // have corrected some; at execution re-confirm each against the live id1 row and
  // update the literal to the post-audit ref if the audit moved it (a one-time
  // re-baseline, not rot). All values below were live-verified at Phase 4 drafting.
  const rl = await lookupGameplayEntity({ name: 'rocket_launcher' });
  assert(rl.match_quality === 'strong' && rl.results[0]?.damage === 110, 'lookup rocket_launcher damage=110');
  assert(rl.match_quality === 'strong' && rl.results[0]?.splash_damage === 120, 'lookup rocket_launcher splash=120');
  assert(rl.match_quality === 'strong' && rl.results[0]?.source_ref === 'weapons.qc:385', 'lookup rocket_launcher source_ref');

  const rlUpper = await lookupGameplayEntity({ name: 'ROCKET_LAUNCHER' });
  assert(rlUpper.match_quality === 'strong' && rlUpper.results[0]?.name === 'rocket_launcher', 'lookup case-insensitive');

  const missing = await lookupGameplayEntity({ name: 'nonexistent_xyz' });
  assert(missing.match_quality === 'none', 'lookup missing returns match_quality=none');

  const lava = await lookupMechanic({ name: 'lava' });
  assert(lava.match_quality === 'strong' && lava.results[0]?.kind === 'env_hazard', 'lookup lava is env_hazard');
  assert(lava.match_quality === 'strong' && lava.results[0]?.source_ref === 'client.qc:825', 'lookup lava source_ref');

  const gib = await lookupMechanic({ name: 'gib_threshold' });
  assert(gib.match_quality === 'strong' && gib.results[0]?.source_ref === 'player.qc:598', 'gib_threshold cites player.qc not client.qc');

  const telefrag = await lookupMechanic({ name: 'telefrag' });
  assert(telefrag.match_quality === 'strong' && telefrag.results[0]?.source_ref === 'triggers.qc:334',
    'telefrag cites triggers.qc:334 (real teleport-overlap mechanic)');
  const exitKill = await lookupMechanic({ name: 'exit_level_kill' });
  assert(exitKill.match_quality === 'strong' && exitKill.results[0]?.source_ref === 'client.qc:230',
    'exit_level_kill cites client.qc:230 (samelevel/noexit changelevel)');

  const triggerHurt = await lookupMechanic({ name: 'trigger_hurt' });
  assert(triggerHurt.match_quality === 'strong' && triggerHurt.results[0]?.source_ref === 'triggers.qc:548',
    'trigger_hurt cites triggers.qc:548 (mapper-controlled void-brush damage)');

  // --- source-scoped search filters (F4: assertions are gameplay_source-aware) -
  // search_* tools default to ALL sources; scope to id1 so ktx override rows
  // (axe / super_shotgun / rocket joins after Phase 3) never inflate id1 shapes.
  const splashWeapons = await searchGameplayEntities({ kind: 'weapon', has_splash: true, gameplay_source: 'id1' });
  const splashNames = splashWeapons.results.map(r => r.name).sort();
  assert(JSON.stringify(splashNames) === JSON.stringify(['grenade_launcher', 'rocket_launcher']),
    'search splash weapons (id1) = GL+RL only');

  // Per-kind counts: derive the id1 baseline from the DB, assert the tool (scoped
  // to id1) agrees. No frozen per-kind literal -> survives Phase 1 gap rows and
  // ktx's same-named kinds (id1 death_rule=7 vs ktx death_rule=27).
  const id1ByKind = new Map(
    (await db<{ kind: string; c: number }[]>`
       SELECT kind, COUNT(*)::int AS c FROM gameplay_mechanics
       WHERE gameplay_source_id = 'id1' GROUP BY kind`).map(r => [r.kind, r.c]));
  for (const kind of ['env_hazard', 'death_rule'] as const) {
    const scoped = await searchMechanics({ kind, gameplay_source: 'id1', limit: 100 });
    assert(scoped.results.length === id1ByKind.get(kind),
      `search_mechanics id1 ${kind}: tool=${scoped.results.length} db=${id1ByKind.get(kind)}`);
  }

  // --- headline totals: source partition, not frozen magic numbers (F4) -------
  // id1 + ktx are the only gameplay_sources this arc ships. Assert both
  // partitions are populated and the unscoped totals equal id1 + ktx (a surprise
  // third source, or either vanishing, is a real change that must update this).
  const entBySource = new Map(
    (await db<{ s: string; c: number }[]>`
       SELECT gameplay_source_id AS s, COUNT(*)::int AS c FROM gameplay_entity_defs GROUP BY 1`).map(r => [r.s, r.c]));
  const mechBySource = new Map(
    (await db<{ s: string; c: number }[]>`
       SELECT gameplay_source_id AS s, COUNT(*)::int AS c FROM gameplay_mechanics GROUP BY 1`).map(r => [r.s, r.c]));
  const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

  assert((entBySource.get('id1') ?? 0) > 0 && (entBySource.get('ktx') ?? 0) > 0,
    'entity partitions present: id1 + ktx');
  assert((mechBySource.get('id1') ?? 0) > 0 && (mechBySource.get('ktx') ?? 0) > 0,
    'mechanic partitions present: id1 + ktx');
  assert(sum(entBySource) === (entBySource.get('id1') ?? 0) + (entBySource.get('ktx') ?? 0),
    `entity total ${sum(entBySource)} = id1 + ktx (no unaccounted source)`);
  assert(sum(mechBySource) === (mechBySource.get('id1') ?? 0) + (mechBySource.get('ktx') ?? 0),
    `mechanic total ${sum(mechBySource)} = id1 + ktx (no unaccounted source)`);

  if (failures > 0) {
    console.error(`${failures} FAILURES`);
    process.exit(1);
  } else {
    console.log('all PASS');
  }
  ```
- **Steps:**
  - [ ] Replace the file with the locked content above.
  - [ ] **Re-baseline the per-entity pins (post-Phase-1).** For each pinned
    `source_ref` (rocket_launcher `weapons.qc:385`, lava `client.qc:825`,
    gib_threshold `player.qc:598`, telefrag `triggers.qc:334`, exit_level_kill
    `client.qc:230`, trigger_hurt `triggers.qc:548`) and `rocket_launcher`
    damage/splash 110/120: confirm against the live row
    (`SELECT name, source_ref FROM gameplay_mechanics WHERE gameplay_source_id='id1' AND name IN (...)`
    + the entity row). If Phase 1's audit corrected any ref, update the literal to
    the corrected value (read it from `phase-1-findings.md`). These are intentional
    citation pins; tracking the post-audit truth is correct, not rot.
  - [ ] `cd apps/qw-oracle && bun run typecheck` (the script is under the qw-oracle
    tsconfig). PASS: exit 0.
- **Verification:** `cd apps/qw-oracle/serve/mcp && bun run scripts/verify-gameplay.ts`
  prints `all PASS`, exit 0. PASS: all assertions green against the full
  post-Phase-3 catalog. FAIL: any `FAIL` line names the assertion -- a per-entity
  pin needs the post-audit ref (re-baseline), or a partition is empty (a source
  failed to load).

### Task 5 -- Surfacing: snapshot regen + MCP spot checks (inline, M5/D14)

- **Goal:** Confirm the arc's data reaches its consumers. Regenerate the slipgate
  snapshot; spot-verify the MCP surface needs nothing new (D14 -- verify, do not
  build).
- **Files:** `apps/slipgate-app/src/lib/config/data/qw-gameplay.json` (regenerated).
- **Execution mode:** `inline` -- mechanical regen + spot SQL/MCP (D19).
- **Steps:**
  - [ ] Regenerate: `cd apps/qw-oracle && bun run load-knowledge -- build-snapshot --project qw`.
    This emits `qw-maps.json` AND `qw-gameplay.json` into
    `apps/slipgate-app/src/lib/config/data/`. The real change is `qw-gameplay.json`
    (it now carries the id1 monsters, the ktx override rows, and the
    `map_summary_key` props -- `emitGameplay` selects `props_json`, so all flow).
    `qw-maps.json` changes ONLY in `generated_at` (no map data changed this arc) --
    discard it to avoid a timestamp-only commit:
    `git checkout -- apps/slipgate-app/src/lib/config/data/qw-maps.json`.
  - [ ] Confirm `qw-gameplay.json` carries the new content:

    ```bash
    cd apps/qw-oracle
    # monsters present:
    grep -c '"kind":"monster"' ../slipgate-app/src/lib/config/data/qw-gameplay.json   # >= 15 (id1 + 13 ktx bloodfest)
    # map_summary_key props present:
    grep -c 'map_summary_key' ../slipgate-app/src/lib/config/data/qw-gameplay.json     # 24
    # ktx override rows present (one of the Phase 3 names, e.g. yawnmode):
    grep -c 'yawnmode' ../slipgate-app/src/lib/config/data/qw-gameplay.json            # >= 1 (if Phase 3 shipped yawnmode deltas)
    ```
    PASS: monsters >= 15, map_summary_key = 24, override rows present per Phase 3's
    actual delta list. FAIL: a missing class -> the snapshot did not pick it up
    (re-run build-snapshot; confirm the data loaded).
  - [ ] **MCP spot check 1 -- monsters surface.** `search_gameplay_entities` with
    `kind=monster gameplay_source=id1` returns the id1 roster (it returned `[]`
    before Phase 2). PASS: the full roster, each with health in props.
  - [ ] **MCP spot check 2 -- describe_mode on an overlay-bearing token.**
    `describe_mode('yawnmode')` (or whichever mode Phase 3 gave override rows)
    returns its envelope WITHOUT error. NOTE: the envelope is catalog + mode_default
    + L3 note + activation cvars -- it does NOT include the new hardcoded override
    rows (F9, deferred to the MCP-realignment arc per D14/M5). This spot check
    confirms no REGRESSION, not override surfacing. PASS: a coherent envelope,
    no error.
  - [ ] **MCP spot check 3 -- lookup_map join sanity.** Pick a populated map
    (e.g. `aerowalk`): `lookup_map('aerowalk')` shows `item_summary` with keys
    (e.g. `rl`, `ra`, `quad`). Confirm each key resolves to a catalog row via
    `map_summary_key`:

    ```sql
    SELECT name FROM gameplay_entity_defs
    WHERE gameplay_source_id='id1' AND lower(props_json->>'map_summary_key')='rl';
    ```
    PASS: `rl` -> `pickup_rocket_launcher`, `ra` -> `red_armor`, etc. -- every key
    in the map's summary maps to a catalog row. FAIL: a key with no row -> Task 1's
    coverage probe should have caught it; re-run Task 1 verification.
- **Verification:** the three MCP spot checks pass; `qw-gameplay.json` carries
  monsters + overrides + map_summary_key. PASS: all green. FAIL: as noted per check.

### Task 6 -- Arc closeout (inline)

- **Goal:** Confirm the whole arc is green end-to-end, fold the HANDOVER item, and
  name the dashboard update (the orchestrator's job).
- **Files:** `HANDOVER.md`.
- **Execution mode:** `inline` -- mechanical (D19).
- **Steps:**
  - [ ] **Full F1 sweep green.** `bun run load-knowledge -- quality-grid --project qw`
    (id1 gameplay kinds) AND `bun run load-knowledge -- quality-grid --project ktx`
    (ktx gameplay + extractor taxonomy kinds). PASS: every
    `F1.{id1,ktx}.gameplay_kind.*` probe PASSes; no ERROR row.
  - [ ] **Both seeds double-load green.**
    `bun run load-knowledge -- seed-idempotency --yaml scripts/extractors/qw/seeds/id1-gameplay.yaml`
    AND `... --yaml scripts/extractors/qw/seeds/ktx-gameplay.yaml`. PASS: `pass=true`
    for both.
  - [ ] **Citation gate green, all sources.** `bun run load-knowledge -- citation-gate`.
    PASS: `unresolved=0`.
  - [ ] **HANDOVER edit (this arc's half ONLY).** The Small-followups item at :43
    BUNDLES two unrelated scripts. Strip the `verify-gameplay.ts` clause; keep the
    `verify-rewrite.ts` env-propagation clause (NOT this arc's). Change:

    `\`verify-gameplay.ts\` asserts stale hardcoded counts (entity 37 vs live 50; mechanic 41 vs live 487) on gameplay tables untouched by recent arcs. Neither is caused by the case-fidelity arc -- verified via an in-process \`lookup_entity\` test (9/9 green incl. case-insensitive resolution + \`$B\`/\`$b\` carve-out + ILIKE wildcard-bug fix). ~15 min each. [small followup]`

    to:

    `This is not caused by the case-fidelity arc -- verified via an in-process \`lookup_entity\` test (9/9 green incl. case-insensitive resolution + \`$B\`/\`$b\` carve-out + ILIKE wildcard-bug fix). ~15 min. [small followup] (The bundled \`verify-gameplay.ts\` stale-count half was fixed by the game-content-catalog arc, Phase 4 / F4 -- source-scoped, DB-derived assertions.)`

    (Re-read the live :43 line at execution -- it may have shifted; match on the
    `verify-gameplay.ts asserts stale hardcoded counts` substring, not the line
    number.)
  - [ ] **Name the dashboard update (orchestrator's job, NOT the executor's).**
    Flag to the orchestrator: the HANDOVER "Active arcs" game-content-catalog entry
    (~line 24, currently "planning: scaffold + slicing LOCKED") moves to SHIPPED;
    add an `arc-history.md` entry and the `arc-game-content-catalog-shipped` git tag
    (monorepo git-workflow ritual). The arc-reviewer carries the F9 describe_mode
    carry-forward to the MCP-realignment backlog entry. These cross-phase actions
    are explicitly the orchestrator's, per the drafter prompt -- the Phase 4
    executor does NOT touch the dashboard entry or arc-history.
- **Verification:** all four green checks pass; the HANDOVER :43 edit landed
  (verify-gameplay clause gone, verify-rewrite clause intact). PASS: arc is green
  end-to-end + HANDOVER folded. FAIL: any probe red (recover per the relevant
  phase) or the wrong HANDOVER half edited.

## Verification (phase boundary)

Run from `apps/qw-oracle/` unless noted. Each ends with PASS/FAIL. This phase has
BOTH an automated floor (data + probes) and an operator-run floor (the doc
deliverables) -- both appear below.

1. **map_summary_key coverage + shape (dev DB).** Task 1's two SQL probes:
   zero `unresolved_map_key`; `keyed_rows=24`, `distinct_keys=20`.
   PASS: both. FAIL: an unresolved key or wrong row/key count.
2. **Seed loads green; counts unchanged (dev DB).** `bun run load-knowledge -- load-gameplay`
   then `... --yaml scripts/extractors/qw/seeds/ktx-gameplay.yaml`.
   PASS: each `total` equals its `expected_counts`, no STOP (Task 1 added props,
   not rows -- id1 totals are unchanged from Phase 2). FAIL: a STOP -> a count
   drifted.
3. **Citation gate green, all sources (dev DB).** `bun run load-knowledge -- citation-gate`.
   PASS: `unresolved=0` (map_summary_key is not a citation -- the gate ignores it).
   FAIL: any unresolved ref.
4. **Both seed double-loads idempotent (dev DB).** `seed-idempotency --yaml` for
   id1 AND ktx. PASS: `pass=true` for both.
5. **Full F1 sweep green (dev DB).** `quality-grid --project qw` AND `--project ktx`.
   PASS: every `F1.{id1,ktx}.gameplay_kind.*` probe PASS, no ERROR.
6. **verify-gameplay.ts green (from serve/mcp/).**
   `cd apps/qw-oracle/serve/mcp && bun run scripts/verify-gameplay.ts`.
   PASS: `all PASS`, exit 0. FAIL: a per-entity pin needs re-baselining, or a
   partition is empty.
7. **typecheck (qw-oracle).** `bun run typecheck`. PASS: exit 0 (verify-gameplay
   edits compile).
8. **Snapshot carries the new content.** Task 5's three greps on
   `qw-gameplay.json` (monsters >= 15, map_summary_key = 24, override rows present).
   PASS: all three.
9. **MCP spot checks.** Task 5's three checks (monster roster; describe_mode on an
   overlay token returns an envelope without error -- overrides NOT expected, F9;
   lookup_map key -> catalog row). PASS: all three.
10. **Operator doc-walk (the doc-deliverable floor).** The operator reads the new
    SCHEMA.md "Gameplay conventions" section AND the RUNBOOK "qw gameplay
    validation" section top-to-bottom and confirms each convention matches what
    shipped (three gate forms, three-layer model, props-variant suffix, two-form
    citation, map_summary_key cardinality + the spikes/bio quirks, expected_counts
    semantics, disjointness rules, registry ownership). PASS: operator confirms
    accuracy. FAIL: any prose misstates the shipped data -> fix the text.
11. **Git scope (D17).** `git add` names ONLY: `id1-gameplay.yaml`, `SCHEMA.md`,
    `VALIDATION-RUNBOOK.md`, `serve/mcp/scripts/verify-gameplay.ts`,
    `apps/slipgate-app/src/lib/config/data/qw-gameplay.json`, `HANDOVER.md`.
    `qw-maps.json` was reverted (timestamp-only). The slipgate data dir holds
    unrelated sibling-arc changes (`ezquake-asset-bundle.json`,
    `fte-asset-bundle.json`) -- those are NOT staged. `git diff --cached --stat`
    shows exactly those six paths. PASS: only those six. FAIL: any sibling-arc
    file or `-A` staging, or qw-maps.json staged.

## Outputs to next phase

This is the last phase -- "outputs" is the arc-complete state the arc-reviewer
inherits:

- The maps join is live: every `maps.item_summary_json` key resolves to a catalog
  row via `map_summary_key`; the coverage probe is green.
- `SCHEMA.md` carries the "Gameplay conventions" section (the living manual now
  records the gate vocabulary, three-layer model, citation forms, map_summary_key
  aliasing, expected_counts, disjointness, registry model); the F6 + key-case
  drifts are corrected.
- `VALIDATION-RUNBOOK.md` carries the `qw` gameplay validation section.
- `verify-gameplay.ts` is green, source-aware, and rot-proof; the HANDOVER:43
  verify-gameplay half is folded.
- `qw-gameplay.json` reaches slipgate with the arc's monsters, ktx overrides, and
  join keys; the MCP surface is confirmed sufficient (no new tools).
- **Carry-forwards for the arc-reviewer:** F9 (describe_mode does not surface
  override rows -- routed to the standing MCP-realignment-to-KTX-era-data backlog
  entry, D14/M5); the dashboard update + arc-history entry + `arc-*-shipped` tag
  (orchestrator's job, named in Task 6).

## Open questions / deferred items

- **Q: SCHEMA.md conventions section placement -- after the KTX-onboarding section
  (chosen) or right after the v14 gameplay-tables section?** **Default chosen for
  now:** after the KTX-onboarding section (the drafter prompt's "lands nearby the
  KTX onboarding section"; the F6 count drift is corrected in the same region; it
  groups v14-tables -> KTX-kind-widenings -> conventions). **Alternative:** right
  after v14 (adjacent to the table definitions). Content is identical either way.
  **Who can resolve:** operator (trivial preference; flag only if a reviewer
  objects).
- **Q: the :496 maps key-case fix is a ride-along beyond the literal F4/F6/D20
  scope.** **Default:** include it -- it is the exact vocabulary Task 1 wires
  (lowercase props), and leaving :496 uppercase makes the maps section contradict
  the new conventions section. Low-risk one-line doc edit. **Who can resolve:**
  operator (drop it if SCHEMA.md:496 should be left alone; the map_summary_key
  props are unaffected).
- **Q: the join-coverage check as a one-time boundary SQL probe (chosen) vs a
  permanent F1 quality-grid probe?** **Default:** one-time boundary SQL (Task 1).
  Phase 4 adds no quality-grid plumbing (D14 spirit: verify, don't build); the
  pre-existing `class_counts_json -> classname` join is likewise unguarded by an
  F1 probe, so this matches the established bar. **Who can resolve:** post-arc /
  operator -- promoting it to a permanent probe is a clean small follow-up if the
  join later proves fragile.
- **Q: per-entity source_ref pins in verify-gameplay.ts (rocket_launcher
  weapons.qc:385, lava client.qc:825, ...) -- kept and re-baselined, or removed?**
  **Default:** keep them as citation-regression anchors; re-baseline to the
  post-Phase-1-audit refs at execution (Task 4 step). They are the "citation
  regressions" the file header names; deriving them would make the test
  tautological. **Who can resolve:** executor at Task 4 (read phase-1-findings.md;
  if the audit touched none of the six, no change needed).
- **Q: F9 (describe_mode does not surface override rows).** RESOLVED upstream
  (Phase 3 review): deferred this arc per D14 / spec M5; numbered F9; routed to the
  MCP-realignment backlog. Task 5 spot check 2 confirms describe_mode does not
  regress -- it does NOT assert override surfacing. **Who can resolve:** the
  MCP-realignment arc (future).

## Recovery (if verification fails)

- **map_summary_key coverage probe returns an unresolved key:** a maps key with no
  catalog row -> the mapping table missed a row, or a `map_summary_key` value has a
  typo. Cross-check the offending key against the locked 20-key table; the maps
  vocabulary is fixed (the live distinct-key set is exactly those 20).
- **`keyed_rows != 24` or `distinct_keys != 20`:** `keyed_rows=25` -> backpack was
  keyed (remove its prop). A lower count -> a row was missed (diff the 24 named
  rows against the live item cluster). A wrong distinct count -> an ammo pair got
  two different keys, or a 1:1 row got the wrong key.
- **load-gameplay STOPs after Task 1:** you changed a row count (props should not).
  Most likely a stray edit dropped/duplicated a row -- diff the YAML against the
  pre-Task-1 state; `expected_counts` is correct, do NOT bend it.
- **verify-gameplay.ts FAILs a per-entity pin:** Phase 1's audit corrected that
  ref. Read `phase-1-findings.md`, update the literal to the post-audit ref
  (re-baseline). NOT a code bug -- the pin tracking the corrected citation is the
  intended behavior.
- **verify-gameplay.ts FAILs a partition assertion (`id1 + ktx` empty or total
  mismatch):** a source failed to load (re-run its `load-gameplay`), or a THIRD
  gameplay_source appeared (legitimate future-mod -> update the assertion to
  include it; this arc ships only id1 + ktx).
- **F1 grid ERROR on a non-gameplay probe under `--project qw`:** a global
  anomaly/floor probe that does not guard `project=qw` -> scope the check to the
  gameplay probes (`--probe F1.id1.gameplay_kind`); record it as a pre-existing
  finding, do not bend the data to it (same pattern Phase 1 anticipated).
- **Snapshot greps miss a class:** build-snapshot ran against a DB that had not
  loaded the row -> reload the relevant seed, re-run `build-snapshot --project qw`.
- **Wrong HANDOVER half edited (verify-rewrite clause removed):** restore it -- the
  `verify-rewrite.ts` env-propagation issue is unrelated to this arc and stays open.
- **Unanticipated failure:** route to the operator with the command, the output,
  and the task it blocks.
