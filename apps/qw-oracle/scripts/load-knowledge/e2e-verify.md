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
    --commit $HEAD_SHA --ordinal 2
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
