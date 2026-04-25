# E2E verification queries - Phase 2b

Run against `apps/qw-oracle/data/knowledge.db` after loading ezQuake 3.6.9 and head.

## Schema populated

```sql
SELECT 'entities' AS t, COUNT(*) FROM entities
UNION ALL SELECT 'cvar_versions (3.6.9)', COUNT(*) FROM cvar_versions WHERE version='3.6.9'
UNION ALL SELECT 'cvar_versions (head)',  COUNT(*) FROM cvar_versions WHERE version='head'
UNION ALL SELECT 'change_events',         COUNT(*) FROM change_events
UNION ALL SELECT 'transitions',           COUNT(*) FROM source_state_transitions
UNION ALL SELECT 'schema_meta',           COUNT(*) FROM schema_meta;
```

Expected shape (counts approximate):
- entities: 2900+
- cvar_versions 3.6.9: ~2700
- cvar_versions head: ~2900
- change_events: low hundreds (depends on real delta)
- transitions: matches initial entity count + some re-added/removed
- schema_meta: 6+ keys

## cl_fakeshaft default change (spike fact)

```sql
SELECT ce.from_version, ce.to_version, ce.old_value, ce.new_value,
       ce.commit_sha, ce.pr_number, ce.pr_title
FROM change_events ce
JOIN entities e ON e.id = ce.entity_id
WHERE e.canonical_id = 'ezquake:cvar:cl_fakeshaft'
  AND ce.field_name = 'default_value';
```

Expected: at least one row with `old_value='0'`, `new_value='1'`, `commit_sha` populated, `pr_number` populated after enrichment.

## Creations in head not present in 3.6.9

```sql
SELECT e.canonical_id, ce.to_version, ce.commit_sha, ce.pr_title
FROM change_events ce
JOIN entities e ON e.id = ce.entity_id
WHERE e.project='ezquake' AND ce.change_kind='created' AND ce.to_version='head'
ORDER BY e.canonical_id;
```

Expected: the set of new cvars added since 3.6.9. Spot-check at least one against the ezQuake commit log.

## Cvar history of cl_bob

```sql
SELECT cv.version, cv.default_value, cv.source_file, cv.source_line
FROM cvar_versions cv
JOIN entities e ON e.id = cv.entity_id
WHERE e.canonical_id = 'ezquake:cvar:cl_bob'
ORDER BY cv.version;
```

Expected: two rows, one per version, likely identical default values.

## Source-state audit trail

```sql
SELECT reason, COUNT(*)
FROM source_state_transitions
GROUP BY reason;
```

Expected: `initial_observation` >> everything else; small number of `re_added` or `removed_from_head` if the delta shows them.

## schema_meta keys

```sql
SELECT key, value FROM schema_meta ORDER BY key;
```

Expected keys: `schema_version`, `extractor_version`, `last_extraction_run_at`, `last_enrichment_run_at`, `ezquake:source_repo_commit`, `ezquake:source_repo_tag`.

---

# E2E verification - Phase 2c (four-type ezQuake load)

Phase 2c extends the loader to handle `command`, `macro`, and `cmdline_param`
types in addition to `cvar`. After running all four `load-version` calls
against ezQuake head, the DB should contain the full engine-feature surface.

## Commands used (ezQuake head, 2026-04-19)

```bash
# Extract (from packages/qw-config/)
python3 scripts/extract-ezquake-cvars-clang.py
python3 scripts/extract-ezquake-commands-clang.py
python3 scripts/extract-ezquake-macros-clang.py
python3 scripts/extract-ezquake-cmdline-clang.py

# Load (from apps/qw-oracle/)
HEAD_SHA=$(git -C ../../research/repos/ezquake-source rev-parse HEAD)
for T in cvar command macro cmdline_param; do
  case $T in
    cvar)           JSON=ezquake-variables-ast.json ;;
    command)        JSON=ezquake-commands-ast.json ;;
    macro)          JSON=ezquake-macros-ast.json ;;
    cmdline_param)  JSON=ezquake-cmdline-params-ast.json ;;
  esac
  npm run load-knowledge -- load-version \
    --project ezquake --version head --type $T \
    --json ../../packages/qw-config/src/data/$JSON \
    --commit $HEAD_SHA --ordinal 999999
done
```

## Per-type counts

```sql
SELECT project, type, COUNT(*) FROM entities GROUP BY project, type;
```

Expected at head:
- ezquake / cvar: **2901**
- ezquake / command: **522** (523 JSON entries minus 1 case-duplicate `loadFragfile`/`loadfragfile` collapsed via lowercase)
- ezquake / macro: **68**
- ezquake / cmdline_param: **71** (72 JSON entries minus 1 case-duplicate `-forceTextureReload`/`-forcetexturereload` collapsed)
- Total: **3562 ezQuake entities**.

## Spot-check queries

```sql
-- Command
SELECT cv.handler_fn, cv.source_file, cv.source_line, cv.registration_file
FROM command_versions cv JOIN entities e ON e.id = cv.entity_id
WHERE e.canonical_id = 'ezquake:command:say_team';
-- Expected: CL_Say_f | cl_cmd.c | 939 | CL_InitCommands

-- Macro
SELECT mv.handler_fn, mv.source_file, mv.source_line, mv.teamplay_restricted
FROM macro_versions mv JOIN entities e ON e.id = mv.entity_id
WHERE e.canonical_id = 'ezquake:macro:health';
-- Expected: Macro_Health | teamplay.c | 1205 | 0
--   (health is not teamplay-restricted despite being registered via
--    Cmd_AddMacroEx with a teamplay arg -- the help JSON authoritatively
--    says restricted=false, which we honour.)

-- Cmdline param
SELECT cp.source_file, cp.source_line, cp.help_desc
FROM cmdline_param_versions cp JOIN entities e ON e.id = cp.entity_id
WHERE e.canonical_id = 'ezquake:cmdline_param:-basedir';
-- Expected: fs.c | 736 | (full description from help_cmdline_params.json)
```

## Data-quality signals surfaced by Phase 2c

Phase 2c's extractors flag several things the legacy scrapers silently
tolerated. These are features, not bugs -- they're the whole point of
moving to AST-backed extraction:

- **2 macros declared in `macro_ids.h` but never wired via `Cmd_AddMacro[Ex]`:** `mp3_volume`, `mp3info`. Likely gated on a disabled MP3 build flag.
- **8 cmdline params declared in `cmdline_params_ids.h` but with zero `COM_CheckParm` usage:** e.g., `-showliberrors`, `-gl_ext`. Declared-but-never-consulted.
- **1 source-only undeclared cmdline param:** `-noerrormsgbox` in `sv_sys_win.c` is checked but missing from the manifest.
- **Case-duplicate help entries** (`loadFragfile`/`loadfragfile`, `-forceTextureReload`/`-forcetexturereload`): the lowercase canonical key collapses them, which is the right call -- QuakeWorld command names are case-insensitive.

---

# E2E verification - Phase 2c.5 (eight-type ezQuake load)

Phase 2c.5 extends the loader to `keyname`, `hud_element`, `ruleset`, and
`token_primitive` types. Schema bumped to v2. After all eight `load-version`
calls against ezQuake head the DB contains the full engine-feature surface.

## Commands used (ezQuake head, 2026-04-19)

```bash
# Extract (from packages/qw-config/)
python3 scripts/extract-ezquake-cvars-clang.py
python3 scripts/extract-ezquake-commands-clang.py
python3 scripts/extract-ezquake-macros-clang.py
python3 scripts/extract-ezquake-cmdline-clang.py
python3 scripts/extract-ezquake-keynames-clang.py
python3 scripts/extract-ezquake-hud-elements-clang.py
python3 scripts/extract-ezquake-rulesets-clang.py
python3 scripts/extract-ezquake-token-primitives-clang.py

# Load (from apps/qw-oracle/)
HEAD_SHA=$(git -C ../../research/repos/ezquake-source rev-parse HEAD)
for T in \
    cvar:ezquake-variables-ast.json \
    command:ezquake-commands-ast.json \
    macro:ezquake-macros-ast.json \
    cmdline_param:ezquake-cmdline-params-ast.json \
    keyname:ezquake-keynames-ast.json \
    hud_element:ezquake-hud-elements-ast.json \
    ruleset:ezquake-rulesets-ast.json \
    token_primitive:ezquake-token-primitives-ast.json ; do
  TYPE=${T%:*}; JSON=${T#*:}
  npm run load-knowledge -- load-version \
    --project ezquake --version head --type $TYPE \
    --json ../../packages/qw-config/src/data/$JSON \
    --commit $HEAD_SHA --ordinal 999999
done
```

## Per-type counts

```sql
SELECT project, type, COUNT(*) FROM entities GROUP BY project, type;
```

Expected at head:
- ezquake / cvar: **2901**
- ezquake / command: **522**
- ezquake / macro: **68**
- ezquake / cmdline_param: **71**
- ezquake / keyname: **148**
- ezquake / hud_element: **83**
- ezquake / ruleset: **6**
- ezquake / token_primitive: **33**
- **Total: 3832 ezQuake entities.**

## Spot-check queries (Phase 2c.5 types)

```sql
-- Keyname
SELECT kv.key_code, kv.key_code_ident FROM keyname_versions kv
JOIN entities e ON e.id = kv.entity_id
WHERE e.canonical_id = 'ezquake:keyname:f1';
-- Expected: 145 | K_F1

-- HUD element (parent -> owned cvars linkage)
SELECT hv.draw_fn, hv.source_file, hv.owned_cvars_json FROM hud_element_versions hv
JOIN entities e ON e.id = hv.entity_id
WHERE e.canonical_id = 'ezquake:hud_element:fps';
-- Expected: SCR_HUD_DrawFPS | hud_performance.c | JSON array of hud_fps_* cvars

-- Ruleset policy bundle
SELECT rv.maxfps, rv.restrict_triggers, rv.restrict_exec, rv.locked_cvars_json FROM ruleset_versions rv
JOIN entities e ON e.id = rv.entity_id
WHERE e.canonical_id = 'ezquake:ruleset:smackdown';
-- Expected: 77.0 | 1 | 1 | [{"cvar_ident":"allow_scripts","value":"0"}, ...]

-- Token primitive case-sensitivity ($B blue LED != $b glyph)
SELECT e.canonical_id, tv.byte_value, tv.category FROM token_primitive_versions tv
JOIN entities e ON e.id = tv.entity_id
WHERE e.canonical_id IN ('ezquake:token_primitive:$B', 'ezquake:token_primitive:$b')
ORDER BY e.canonical_id;
-- Expected:
--   ezquake:token_primitive:$B | 137 | led
--   ezquake:token_primitive:$b | 139 | glyph
```

## Data-quality signals surfaced by Phase 2c.5

- **6 keynames Apple-only** (COMMAND, PARA, F13-F15, KP_EQUAL) tagged with `build_variant="apple"`. They only materialise in `-D__APPLE__` builds.
- **Keyname aliases preserved with correct codes**: SCROLLLOCK / SCROLLOCK / SCRLCK all map to 130.
- **83 HUD elements own 1404 synthesized hud_\* cvars** between them (parent->child linkage via `owned_cvars_json`).
- **All 6 rulesets resolved with full policy bundles.** Locked-cvar counts: default 0, smackdown 6, qcon 5, thunderdome 4, mtfl 6, smackdrive 5.
- **Case-sensitive token primitives preserved** at the entity level (`canonical_id` retains raw case for `token_primitive` only). Enables `$B`=blue LED (byte 137) vs `$b`=glyph (byte 139) to coexist as distinct entities.

---

# E2E verification - Phase 2c.6 (asset consumption model)

Phase 2c.6 adds the engine's filesystem-consumption surface: what files
ezQuake reads, under what search-path rules, and which cvars drive which
asset paths. Schema bumped to v3. Adds one new entity type
(`asset_category`) and four relation tables.

## Commands used (ezQuake head, 2026-04-20)

```bash
# Extract (from packages/qw-config/)
python3 scripts/extract-ezquake-asset-loader-sites-clang.py
python3 scripts/extract-ezquake-asset-cvar-bindings-clang.py
python3 scripts/extract-ezquake-asset-path-rules-verify.py

# Build bundle + load (from apps/qw-oracle/)
HEAD_SHA=$(git -C ../../research/repos/ezquake-source rev-parse HEAD)
bunx tsx scripts/load-knowledge/build-asset-bundle.ts --project ezquake --version head

npm run load-knowledge -- load-version \
  --project ezquake --version head --type asset_category \
  --json ../../packages/qw-config/src/data/ezquake-asset-bundle.json \
  --commit $HEAD_SHA --ordinal 999999 \
  --extractor-version clang-ezquake-assets@1.0.0

npm run load-knowledge -- load-assets \
  --project ezquake --version head \
  --json ../../packages/qw-config/src/data/ezquake-asset-bundle.json \
  --commit $HEAD_SHA --ordinal 999999 \
  --extractor-version clang-ezquake-assets@1.0.0
```

## Per-table counts

```sql
SELECT 'asset_category entities'  AS what, COUNT(*) FROM entities WHERE type='asset_category'
UNION ALL SELECT 'asset_category_versions',  COUNT(*) FROM asset_category_versions
UNION ALL SELECT 'asset_extensions',         COUNT(*) FROM asset_extensions
UNION ALL SELECT 'asset_path_rules',         COUNT(*) FROM asset_path_rules
UNION ALL SELECT 'asset_cvar_bindings',      COUNT(*) FROM asset_cvar_bindings
UNION ALL SELECT 'asset_loader_sites',       COUNT(*) FROM asset_loader_sites;
```

Expected at head:
- asset_category entities:  **17**
- asset_category_versions:  **17**
- asset_extensions:         **25**
- asset_path_rules:         **14**  (all `source_verified=1`)
- asset_cvar_bindings:      **26**  (23 seed + 1 auto_confirms_seed + 2 auto_orphans)
- asset_loader_sites:       **110** (19 certain + 66 heuristic + 25 unclassified)
- **Total ezQuake entities: 3849** (3832 from 2c.5 + 17 new `asset_category`).

## Spot-check queries

```sql
-- Which cvars bind to the skin category?
SELECT SUBSTR(cvar_canonical_id, INSTR(cvar_canonical_id,':cvar:')+6) AS cvar,
       path_pattern, load_trigger, confidence
FROM asset_cvar_bindings
WHERE category_id='ezquake:asset_category:skin'
  AND project='ezquake' AND version='head'
ORDER BY cvar;
-- Expected: 9 rows (baseskin, team/enemy skin + quad/pent/both variants),
-- all with path_pattern 'skins/{value}.pcx', load_trigger=on_connect,
-- confidence=seed.

-- Which sound loaders fire during entity init? (CL_InitTEnts precaches
-- weapon impact sounds, etc.) load_trigger classifies as on_demand --
-- CL_InitTEnts is not in the startup-rule watchlist.
SELECT source_file||':'||source_line AS at, path_literal, enclosing_function
FROM asset_loader_sites
WHERE function_name='S_PrecacheSound' AND project='ezquake' AND version='head'
ORDER BY source_file, source_line LIMIT 5;
-- Expected: 5 rows from cl_tent.c (hit sounds) and cl_parse.c / cl_nqdemo.c
-- (server-info sound precache).

-- Search-path rules in precedence order.
SELECT rule_kind, ordinal, canonical_id, source_verified
FROM asset_path_rules
WHERE project='ezquake' AND version='head'
ORDER BY rule_kind, ordinal;
-- Expected: 14 rules across 4 rule_kinds:
--   search_path:         2 (id1_qw_base_stack, searchpath_lifo_lookup)
--   archive_precedence:  5 (pak_numbered_ascending_load ... pak_lst_disables_wildcards)
--   gamedir_behavior:    2 (gamedir_unwinds_to_base, gamedir_fallthrough_to_base)
--   cmdline_override:    5 (basedir, nohome, data, userdir, game)
-- All with source_verified=1.

-- Does r_skyname resolve to a path template?
SELECT cvar_canonical_id, category_id, path_pattern, load_trigger, confidence
FROM asset_cvar_bindings WHERE cvar_canonical_id='ezquake:cvar:r_skyname';
-- Expected: 1 row, category=skybox, path_pattern='env/{value}_{face}.tga',
-- load_trigger=on_map_load, confidence=seed.
```

## Data-quality signals surfaced by Phase 2c.6

- **Seed remains source of truth for cvar bindings.** 24 seed entries
  hand-authored; AST auto-pass corroborates only 1 (`scr_conpicture`)
  because most ezQuake cvar-to-loader flows cross statement boundaries
  via intermediate strings, which the single-compound-scope auto-pass
  can't see. 2 auto_orphans surfaced (`mapname` in radar + conback
  sites) -- seed-expansion candidates, not misses.

- **Loader-site classification rate 77%.** 19/110 rows `certain` (literal
  path + specific category known from function name), 66 `heuristic`
  (partial hints via extension, enclosing function, or function name
  mapping to `other`), 25 `unclassified` (generic `FS_OpenVFS` /
  `FS_LoadFile` with local-variable arg[0] and no categorising hint).
  **Schema v8 update (2026-04-22):** the 25 `unclassified` rows were
  reclassified to `intentionally_generic` after the extractor learned
  to recognise the four FS-layer primitives. See the v8 section below
  for the new bucket and counts.

- **Path rules all pass source verification.** 14/14 rows resolve to
  plausible `fs.c` functions (`FS_InitFilesystemEx`, `FS_AddPathHandle`,
  `FS_SetGamedir`, `FS_AddGameDirectory`, `FS_AddDataFiles`).

- **Dev-only detection returned 0** because the extractor's dev-regex
  (`Dev_*`, `_Debug_f$`, etc.) didn't match anything in the default
  build variant. Not a bug -- ezQuake's debug surface is largely gated
  by preprocessor rather than naming convention.

- **Reconciliation stats emitted by build-asset-bundle.ts:**
  `{ seedRetained: 24, seedUpgradedToAutoConfirms: 1, seedNotCorroborated: 23, autoOrphans: 2 }`.
  Future seed tuning should watch the `seedNotCorroborated` count drop
  as either the seed or the auto-pass improves; today's high number
  reflects the data-flow gap rather than seed inaccuracy.

---

# E2E verification - schema v7 (asset_extensions verification audit)

Schema v7 lifts the per-row hygiene audit on `asset_extensions` out of
`apps/qw-oracle/docs/entity-types.md` prose and into two queryable columns:
`verification_status` (one of four buckets) plus a free-text
`verification_reason`. The migration is pure-additive (`ALTER TABLE ADD
COLUMN` with literal DEFAULT and self-column CHECK), so existing rows
default to `ast_verified` and only explicit seed entries deviate.

```sql
-- Which extension rows are NOT ast_verified, and why?
SELECT extension, path_hint, verification_status,
       SUBSTR(verification_reason, 1, 80) AS reason_preview
FROM asset_extensions
WHERE project='ezquake' AND version='head'
  AND verification_status != 'ast_verified'
ORDER BY extension;
-- Expected at head: 2 rows.
--   .dll  -> seed_only_no_ast_support  (FTE-only construct)
--   .kmap -> orphaned_historical       (loader removed in commit 46b5046)
```

```sql
-- Counts by status (sanity check after each reload).
SELECT verification_status, COUNT(*) FROM asset_extensions
WHERE project='ezquake' AND version='head'
GROUP BY verification_status;
-- Expected at head:
--   ast_verified              268
--   orphaned_historical         1
--   seed_only_no_ast_support    1
```

The four-bucket meaning is documented in
`apps/qw-oracle/docs/entity-types.md` § Verification statuses. Adding a
new exception is two lines of YAML in
`packages/qw-config/seeds/ezquake-asset-extensions.yaml`
(`verification_status` + `verification_reason`); rebuild the bundle and
re-run `load-assets` to populate.

---

# E2E verification - schema v8 (asset_loader_sites.intentionally_generic)

Schema v8 widens the `asset_loader_sites.confidence` CHECK to add a fourth
value: `intentionally_generic`. The extractor (`handler_asset_loader_sites.py`,
`GENERIC_FS_PRIMITIVES`) stamps any call to `FS_OpenVFS`, `FS_LoadFile`,
`FS_LoadHunkFile`, or `FS_WriteFile` with this confidence when `path_source`
is `unknown` and no category resolves. These are the FS layer itself (or
runtime-filename consumers like QuakeC builtins), not asset loaders. The
distinction matters for the future review skill: a NEW `unclassified` row in
a future tag-pair is now a real novelty, not noise from FS internals.

```sql
-- Confidence distribution (sanity check after each tag reload).
SELECT confidence, COUNT(*) FROM asset_loader_sites
WHERE project='ezquake' AND version='head'
GROUP BY confidence
ORDER BY confidence;
-- Expected at head:
--   certain                  24
--   heuristic                80
--   intentionally_generic    24
--   (unclassified absent)
```

```sql
-- The 24 generic FS-primitive sites (formerly 'unclassified' under v7).
SELECT function_name, source_file, source_line, enclosing_function
FROM asset_loader_sites
WHERE project='ezquake' AND version='head'
  AND confidence='intentionally_generic'
ORDER BY source_file, source_line;
-- Expected: 24 rows. function_name is one of FS_OpenVFS / FS_LoadFile /
-- FS_LoadHunkFile / FS_WriteFile. enclosing_function names FS-internal
-- helpers (FS_LoadHeapFile, FS_DiffFile_f), QuakeC builtins
-- (PF2_FS_OpenFile), or runtime-filename consumers (CL_Download_Accept).
```

Migration is a table rebuild because SQLite can't ALTER a CHECK in place.
The rebuild preserves rows + ids; same pattern as the entities-table v3/v5
rebuilds. v3 SQL block (the canonical fresh-DB definition) is also updated,
so fresh DBs land on the widened CHECK without traversing the migration.

---

# E2E verification - Phase 2f Batch 2 (schema v5: flag_bit + relation_changes)

Batch 2 adds a 10th entity type (`flag_bit`) and a parallel diff stream
(`relation_changes`) for the four asset relation tables. Schema bumped
to v5.

## flag_bit head load verification

```sql
SELECT COUNT(*) FROM entities WHERE type='flag_bit' AND project='ezquake';
-- expect: 50 at head (26 cvar_flag + 7 fpd_flag + 17 stat_const)

SELECT bitmask_family, COUNT(*) FROM flag_bit_versions
WHERE version = 'head'
GROUP BY bitmask_family;
-- expect: cvar_flag 26, fpd_flag 7, stat_const 17
```

## flag_bit spot-check

```sql
SELECT e.name, fv.bitmask_family, fv.value_raw, fv.value_numeric,
       fv.source_file, fv.source_line
FROM entities e JOIN flag_bit_versions fv ON fv.entity_id = e.id
WHERE e.name IN ('cvar_archive','fpd_no_timers','stat_health');
-- expect:
--   cvar_archive   cvar_flag   (1<<0)  1  cvar.h       31
--   fpd_no_timers  fpd_flag    2       2  teamplay.h  107
--   stat_health    stat_const  0       0  common.h     86
```

## flag_bit diff coverage

A1 (3.6.8 -> 3.6.9) observed: 1 created (`fpd_enable_player_count` --
a genuinely new FPD flag), 0 modified, 0 deleted.
A2 (3.6.5 -> 3.6.6) observed: 0 changes (families stable).

```sql
SELECT ce.change_kind, e.name FROM change_events ce
JOIN entities e ON e.id = ce.entity_id
WHERE e.type='flag_bit' AND ce.to_version='3.6.9'
ORDER BY ce.change_kind, e.name;
-- expect: 1 row: created | fpd_enable_player_count
```

## relation_changes coverage

```sql
SELECT relation_table, change_kind, COUNT(*) FROM relation_changes
WHERE to_version IN ('3.6.9','3.6.6')
GROUP BY relation_table, change_kind, to_version;
```

Observed on A1 / A2 validation runs: `asset_loader_sites` emits
created/deleted pairs where upstream edits shifted source_line numbers
(the loader-site canonical_id embeds the line). Underlying row counts
are stable at 110/110; the diff is surfacing a natural-key coupling
issue in the loader-site extractor, not real churn. Batch 3 item. The
other three relation tables (asset_extensions, asset_path_rules,
asset_cvar_bindings) correctly emit 0 rows as expected.

## Data-quality signals surfaced by Phase 2f Batch 2

- **Loader-site natural-key fragility.** `asset_loader_sites.canonical_id`
  is `<function>_<basename>_<source_line>`. Any edit above a loader site
  shifts the line and produces a spurious (created, deleted) pair in
  relation_changes even when the site itself is unchanged. Row counts
  remain stable; the noise is purely in the diff stream. Batch 3
  candidate fix: change the canonical_id formula to be line-independent
  (e.g. `<function>_<basename>_<nth-call-in-function>`) or add a
  secondary key that survives line shifts.
- **flag_bit diff runs green.** The new entity type flows through the
  full pipeline (extractor -> load-version -> diff -> change_events)
  without friction. Single real creation on A1 validates end-to-end.

## E2E verification - Phase 2f Batch 3

Batch 3 landed the `source_overrides` blame index (schema v6) so `diff-versions.ts`
consults per-field / per-call-site source locations when generating change_events,
rather than always anchoring blame on the entity's primary source_ref. The effect is
a more semantically-correct commit attribution for fields that live on a shared
struct (rulesets, hud_elements) or are set via call-site rather than declaration
(cvar default_value).

### Schema v6 migration sanity

```sql
SELECT value FROM schema_meta WHERE key='schema_version';
-- expect: 6

.schema source_overrides
-- expect: PK (entity_id, version, field_name), CHECK on override_kind
-- in ('struct_field_decl','call_site','header_declaration').
```

### source_overrides population by kind

```sql
SELECT override_kind, COUNT(*) FROM source_overrides
GROUP BY override_kind;
-- post-Batch3 observed (ezQuake head + 3.6.5/3.6.6/3.6.8/3.6.9 loaded):
--   header_declaration | 2478   (hud_element HUD_Register call sites)
--   struct_field_decl  |  341   (ruleset rulesetDef_t field declarations)
--   call_site          |    5   (cvar Cvar_SetDefault / Cvar_ForceSet anchors)
```

### source_overrides population by version

```sql
SELECT version, COUNT(*) FROM source_overrides
GROUP BY version ORDER BY version;
-- expect a row per loaded historical tag; head populated last.
```

### Override spot-checks

```sql
-- Ruleset: maxfps field declared in struct
SELECT e.name, so.override_kind, so.source_file, so.source_line
FROM source_overrides so JOIN entities e ON e.id = so.entity_id
WHERE so.version='3.6.6' AND so.field_name='maxfps'
ORDER BY e.name;
-- expect: all rulesets map to rulesets.c struct line (same line for each, because
-- the struct field declaration is a single site shared across all rulesets of the
-- same type -- that's the point).

-- HUD element: flags_raw from HUD_Register header call
SELECT COUNT(*) FROM source_overrides
WHERE version='3.6.6' AND field_name='flags_raw';
-- expect: 82 (one per HUD element).

-- Cvar: default_value from Cvar_SetDefault call site
SELECT e.name, so.source_file, so.source_line
FROM source_overrides so JOIN entities e ON e.id = so.entity_id
WHERE so.version='3.6.6' AND so.field_name='default_value'
  AND so.override_kind='call_site'
LIMIT 10;
-- expect: handful of cvars whose defaults are set via Cvar_SetDefault /
-- Cvar_ForceSet / Cvar_LockDefault rather than the initial declaration.
```

### Blame attribution improvement (A2 ruleset mods)

```sql
-- Pre-Batch3 baseline (from knowledge.db.bak-pre-v6): 4 distinct commits + 5 UNKNOWN
-- Post-Batch3: 1 distinct commit, 0 UNKNOWN.
-- The single commit (2dbb3f1d...) is the one that added the restrict_* fields to
-- the rulesetDef_t struct. All 5 rulesets legitimately share the same semantic
-- author for those fields.
SELECT commit_sha, COUNT(*) FROM change_events ce
JOIN entities e ON e.id = ce.entity_id
WHERE e.type='ruleset' AND ce.to_version='3.6.6' AND ce.change_kind='modified'
GROUP BY commit_sha ORDER BY COUNT(*) DESC;
```

### Loader-site natural-key stability (resolved gap 11)

```sql
SELECT change_kind, COUNT(*) FROM relation_changes
WHERE relation_table='asset_loader_sites' AND to_version='3.6.6'
GROUP BY change_kind;
-- post-Batch3 expect: 0 created / 0 deleted spurious pairs (down from 11+11 before
-- the ordinal-based canonical_id fix). Underlying row counts stable at 110/110.
```

### Data-quality signals surfaced by Phase 2f Batch 3

- **Blame override is only as granular as the extractor emits.** For rulesets the
  struct_field_decl is the authoritative author of the field; all rulesets share
  the same struct line because the struct is shared. That's the correct blame. If
  a future extractor wants per-instance assignment-site blame it can emit both
  kinds (struct_field_decl + call_site) and the resolver's kind priority picks
  the more specific one.
- **`owned_cvars_json` has no field_source_lines entry.** HUD element changes to
  `owned_cvars_json` (the JSON-stringified list of owned cvars) fall back to the
  loader function anchor; the field is synthesized by the adapter, not declared
  in a struct. Low-priority to resolve; the loader function is a reasonable
  blame target for schema changes driven by cvar additions.
- **Cvar default_value override is best-effort regex.** Anchored on `&cvar_name`
  literal matches for Cvar_SetDefault / Cvar_ForceSet / Cvar_LockDefault. Macro-
  expanded or array-subscript forms (`&cvars[i]`) won't match; those fall back to
  the cvar declaration blame. YAGNI until evidence demands an AST walk.
