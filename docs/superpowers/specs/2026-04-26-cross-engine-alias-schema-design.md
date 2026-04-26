---
title: Cross-Engine Alias Schema (Schema v12)
date: 2026-04-26
status: draft
supersedes: none
superseded_by: none
---

# Cross-Engine Alias Schema (Schema v12)

## Status

Draft. Closes sub-thread #2 of the umbrella entry "Cross-engine alias scaffolding + slipgate version-awareness" in `HANDOVER.md`. Blocks sub-thread #3 (ezscript extract handler). Operator review of this spec is the gate before schema migration code lands.

## Related docs

- `HANDOVER.md` -- "Cross-engine alias scaffolding + slipgate version-awareness" umbrella entry. Today's investigation, sub-thread map, verification commands.
- `docs/superpowers/specs/2026-04-21-layer1-identity-model-design.md` -- identity-model framing. This spec slots a new source-derived entity type into Track 1.
- `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v6-source-overrides.md` -- precedent for an additive schema bump that creates a new table and stays compatible with existing rows.
- `apps/qw-oracle/SCHEMA.md` -- cumulative schema reference. Will receive a v12 section alongside this spec.
- `apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py` -- sibling AST-walk handler. The ezscript handler will mirror its shape and reuse `extractor_lib`.
- `research/repos/fteqw/plugins/ezscript/ezscript.c` -- canonical ezscript source. Single C file; `Plug_ExecuteCommand` strcmp branches at L30 onward.
- `/tmp/ezscript-audit/aliases.tsv` -- 38 raw alias pairs. Regeneratable from ezscript.c via grep.
- `/tmp/ezscript-audit/drift-369.tsv` -- 38 rows with `ez_def_369` / `fte_def_6698` / `def_match` / `ez_state` / `fte_state` columns. Drives initial `default_drift_status` and `freshness_state` population.

## Motivation

Today's investigation surfaced 38 ezscript-registered cvar aliases. Each redirects an ezQuake-shaped name typed in an FTE config to FTE's actual cvar / serverinfo / userinfo target. The drift sweep at ezQuake 3.6.9 vs FTE build-6698 produced four buckets: 25 A_LIVE (both sides `source_backed`), 7 B_LHS_GONE (ezQuake LHS retired but alias still functions), 4 F_DOC_ONLY (LHS only in ezQuake help-JSON), 1 D_BOTH_GONE (`in_m_mwhook` -> `in_mwhook`), 1 C_RHS_GONE (`vid_vsync` -> `_vid_wait_override`). 13 A_LIVE rows show non-trivial default drift (`bgmvolume` 1 vs `musicvolume` 0.3, `cl_bonusflash` 0 vs `v_bonusflash` 1, etc.) that the schema must capture as triage state, not silently lose.

Layer 1's existing entity model handles per-version richness (first_seen / last_seen / source_state / default_history) but has no shape for "this name in project X redirects to this name in project Y, with these semantic caveats verified against this version pair." The structural gap is the immediate blocker for the ezscript extract handler. The same shape will host future broader alias research output (FTE -> MVDSV serverinfo bridges, internal-engine aliases like `cl_truelightning` -> `cl_fakeshaft`).

This spec defines that shape.

## Requirements distilled from today's findings

The schema must support:

- **N-to-1 mappings.** `r_skycolor` and `fps_skycolor` both -> `r_fastskycolour`. Multiple LHS rows pointing at the same RHS.
- **Heterogeneous target kinds.** ezscript has 36 cvar redirects + 2 serverinfo redirects (`sv_maxpitch` -> `serverinfo maxpitch`, `sv_minpitch` -> `serverinfo minpitch`). A future plugin could redirect to userinfo or commands. `target_kind` is open-ended within a known enum.
- **Value transforms beyond identity.** `bgmvolume` 1 -> `musicvolume` 0.3 is likely a 0-1 vs 0-1 with different conventions; some rows will need bool_flip / scale / enum_remap; some flag for `needs_review` on first import.
- **Drift status per row, version-pair-stamped.** `same` / `differ_safe` / `differ_dangerous` / `unknown`. A verification-pair stamp documents which versions were checked. Existence is owned by `freshness_state`, not `default_drift_status` -- when one side is gone, drift is not a meaningful question.
- **Semantic confidence.** Not all aliases are equally trusted. ezscript hardcodes its 38 mappings; cross-engine aliases discovered later (e.g., from documentation or community memory) will have lower confidence.
- **Per-row freshness.** Today's A_LIVE / B_LHS_GONE / C_RHS_GONE / D_BOTH_GONE buckets must persist alongside the alias row, not just exist in /tmp/.
- **Plugin-vs-engine origin.** ezscript is an FTE plugin, not the FTE engine. The v11 `source_root` field already distinguishes. The alias schema must inherit that shape (`source_root='fte:plugin:ezscript'`).
- **Internal-engine aliases at the same scope.** `cl_truelightning` -> `cl_fakeshaft` is a same-project alias today registered via `Cmd_AddLegacyCommand`. The schema should not preclude this case. Today it lives as a `command` entity (P1 from doc_only audit). Migration of that row to the new shape is deferred but should remain possible.

## Approaches considered

Three shapes were on the table. The dispatch prompt names "alias entities" and the layer-1 identity model treats all source-derived facts as Track-1 entities, which biases toward Option A. Options B and C are documented for completeness and to record why they were rejected.

### Option A -- New entity type `cvar_alias` plus a per-version table (recommended)

Widen `entities.type` CHECK to admit `cvar_alias`. Each LHS becomes one entity row in the host project, keyed `(project, type, name)` exactly like every other Track-1 fact. A new `cvar_alias_versions` table mirrors the cvar_versions / command_versions shape and carries target descriptors, transforms, drift status, confidence, freshness, and the verified-against target version.

Pros:
- Zero new identity machinery. `first_seen_version`, `last_seen_version`, `source_state`, `predecessor_id`, `change_events`, `source_state_transitions`, the loader, `extract-tag`, `build-snapshot`, the diff pipeline -- everything works out of the box.
- One row per LHS, so N-to-1 falls out automatically.
- `source_root` already distinguishes plugin from engine. ezscript's 38 rows get `source_root='fte:plugin:ezscript'`; future broad-scope aliases land in their own source_root.
- Slipgate's "user typed `cl_fakeshaft` in their FTE+ezscript config" lookup answers from `entities` directly, joined with `cvar_alias_versions`. Same pattern as cvar.
- Consistent with the layer-1 identity-model framing: "an alias declaration in source code is a fact, keyed by project+type+name+version." That's the Track-1 contract.

Cons:
- Adds a new entity type to the CHECK constraint, which requires the same SQLite-rebuild dance the v2/v3/v5 migrations did. Cost is mechanical, not architectural.
- Conceptually, an alias is "between two things" -- a relation. Treating it as an entity puts the relation's source side into the entity table and pushes the target side into the per-version columns. That asymmetry is the same one cvars have for `default_value` (a single cvar's "value" is the cvar plus its bound default). Acceptable.

### Option B -- Cross-cutting relation table only

Skip the entity type. Add a `cross_project_aliases` table with FK references to two `entities.canonical_id` rows (or string fields when the target's project is not loaded). No new entity rows.

Pros:
- Models "alias is a relation between two things" honestly.
- Smaller schema delta -- no CHECK widening.

Cons:
- The LHS does not appear in `entities` at all. Slipgate's lookup_entity('cl_fakeshaft', project='fte') returns nothing unless we teach it to fall back to the alias table. Two lookup paths now.
- `first_seen_version` / `last_seen_version` / `source_state` need ad-hoc reimplementation on the relation table. ezscript's 7 B_LHS_GONE rows still ship in current ezscript source; "this LHS still works in FTE+ezscript" is a per-version fact that wants the existing version-table machinery.
- `change_events` and `source_state_transitions` either get extended to cover relation tables or alias-specific change tracking gets duplicated.
- Gets harder, not easier, when broad-scope alias research adds rows that are LHS-only (no target known yet) or target-only (no LHS observed yet).

Rejected because the entity machinery exists and works; reimplementing it on a relation table is ceremony.

### Option C -- LHS as a regular cvar entity plus a relation table (hybrid)

ezscript handler emits LHS as a normal cvar entity (`type='cvar'`, `source_root='fte:plugin:ezscript'`). A separate `cvar_aliases` relation table attaches alias metadata (target descriptors, transform, drift, confidence) to the cvar entity.

Pros:
- LHS shows up natively in any "list FTE cvars" query. Slipgate doesn't need a special path.
- Future plugin-registered cvars that aren't aliases (real new cvars) fit the same `type='cvar'` entity row.

Cons:
- Two writes per alias (entity row + cvar_versions + cvar_aliases) and two read joins for any "is this an alias?" question.
- The cvar_versions row carries fields (default_value, on_change, min_bound, max_bound) that are meaningless for an alias declaration. Either populate them by inspecting the target (introducing implicit dependency on the target being loaded) or leave them NULL (introducing rows where most columns are NULL, which is exactly what a separate type would solve).
- Conceptual split between "this is a cvar but actually it's an alias" requires every consumer to consult the alias table to know which it is. Option A's `type='cvar_alias'` is self-documenting at row scan time.
- Layer-1's identity contract is "type tells you the shape." Hybrid violates it.

Rejected. The honesty wins of Option C are real but the consumer-side cost outweighs them. Option A keeps the "type tells you the shape" contract intact.

## Recommendation

**Option A.** New entity type `cvar_alias`, new per-version table `cvar_alias_versions`. Schema bump v11 -> v12. Migration is a CHECK-widening rebuild on `entities` plus `CREATE TABLE cvar_alias_versions`. Existing rows are untouched.

## Design

### Entities CHECK widening

Add `cvar_alias` to the entities.type enum. Following the v2/v3/v5 precedent, schema.ts ships a `SCHEMA_V12_REBUILD_SQL` block that creates `entities_v12`, copies over, drops the old, renames. Fresh DBs stamp v12 directly via the widened v1 CHECK that `applySchema` already maintains.

```sql
-- Widen entities.type CHECK to include 'cvar_alias'
CREATE TABLE entities_v12 (
  id                    INTEGER PRIMARY KEY,
  project               TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  type                  TEXT NOT NULL CHECK (type IN (
                          'cvar','command','macro','cmdline_param',
                          'keyname','hud_element','ruleset','token_primitive',
                          'asset_category','flag_bit','cvar_alias'
                        )),
  name                  TEXT NOT NULL,
  canonical_id          TEXT NOT NULL,
  first_seen_version    TEXT NOT NULL,
  last_seen_version     TEXT NOT NULL,
  source_state          TEXT NOT NULL DEFAULT 'source_backed'
                          CHECK (source_state IN ('source_backed','source_retired','doc_only','dynamically_registered')),
  predecessor_id        INTEGER REFERENCES entities(id),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (project, type, name),
  UNIQUE (canonical_id)
);
INSERT INTO entities_v12 SELECT * FROM entities;
DROP TABLE entities;
ALTER TABLE entities_v12 RENAME TO entities;
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(project, type);
```

Canonical-id pattern stays `<project>:<type>:<name>` (lowercased for cvar_alias; same convention as cvar). Example: `fte:cvar_alias:cl_fakeshaft`.

### `cvar_alias_versions` table

```sql
CREATE TABLE IF NOT EXISTS cvar_alias_versions (
  entity_id                       INTEGER NOT NULL REFERENCES entities(id),
  version                         TEXT NOT NULL,
  -- Target identity
  target_project                  TEXT NOT NULL CHECK (target_project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  target_kind                     TEXT NOT NULL CHECK (target_kind IN (
                                    'cvar','command','macro','serverinfo','userinfo'
                                  )),
  target_name                     TEXT NOT NULL,
  target_canonical_id             TEXT REFERENCES entities(canonical_id),
  -- Cross-namespace bridge (NULL for pure internal aliases)
  mimics_project                  TEXT CHECK (mimics_project IN ('ezquake','fte','mvdsv','ktx','qwcl')),
  -- Semantic mapping
  value_transform                 TEXT NOT NULL DEFAULT 'identity'
                                    CHECK (value_transform IN (
                                      'identity','bool_flip','scale','enum_remap','needs_review'
                                    )),
  value_transform_params_json     TEXT,
  default_drift_status            TEXT NOT NULL DEFAULT 'unknown'
                                    CHECK (default_drift_status IN (
                                      'same','differ_safe','differ_dangerous','unknown'
                                    )),
  semantic_confidence             TEXT NOT NULL DEFAULT 'needs_review'
                                    CHECK (semantic_confidence IN (
                                      'high','medium','low','needs_review'
                                    )),
  -- Verification stamp. Host side is implicit (this row's project + version).
  -- target version: which target_project version drift was checked against.
  -- mimics version: which mimics_project version LHS-existence was checked against.
  -- Both nullable; SQL-filterable directly without json_extract.
  verified_target_version TEXT,
  verified_mimics_version TEXT,
  -- Cross-namespace freshness as of the version pair recorded in verified_against_version_pair_json
  freshness_state                 TEXT NOT NULL DEFAULT 'alive'
                                    CHECK (freshness_state IN (
                                      'alive','target_gone','mimics_lhs_gone','both_gone','unknown'
                                    )),
  -- Standard source-citation block
  source_file                     TEXT,
  source_line                     INTEGER,
  source_column                   INTEGER,
  source_root                     TEXT,
  raw_ast_hash                    TEXT,
  extracted_at                    TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_cvar_alias_versions_target
  ON cvar_alias_versions(target_project, target_kind, target_name);
CREATE INDEX IF NOT EXISTS idx_cvar_alias_versions_canonical
  ON cvar_alias_versions(target_canonical_id);
```

### Field semantics

**`target_project` / `target_kind` / `target_name`.** The redirect destination as the alias source code declares it. `target_name` is a string literal extracted from ezscript.c -- whatever the plugin actually emits. Lowercased to match the `<project>:<type>:<name>` convention. For ezscript's two serverinfo redirects (`sv_maxpitch` -> `serverinfo maxpitch`), `target_kind='serverinfo'` and `target_name='maxpitch'`. Since serverinfo isn't currently an entity type, `target_canonical_id` stays NULL for those rows; the columns still capture the redirect.

**`target_canonical_id`.** Optional FK to `entities.canonical_id`. Populated when the target entity exists in the DB at extraction time. For ezscript at FTE build-6698: 35 of 38 rows resolve (cvar targets in the FTE engine), 2 are NULL (serverinfo redirects), 1 is NULL (the D_BOTH_GONE `in_m_mwhook` -> `in_mwhook` row where the FTE-side cvar doesn't exist). Resolution policy: best-effort lookup at load time; never fail if missing. A nightly resolver can re-link rows when target projects load.

**`mimics_project`.** The namespace this alias is migrating users *from*, not the target. ezscript bridges old ezQuake configs into FTE, so `mimics_project='ezquake'`. NULL for pure internal aliases (`cl_truelightning` -> `cl_fakeshaft` would be NULL since both LHS and RHS live in ezQuake's own namespace). Drives the cross-namespace freshness check: `mimics_lhs_gone` is computable only when `mimics_project IS NOT NULL`.

**`value_transform`.** Five-valued enum. `identity` is the default and covers same-name same-meaning bridges (most ezscript rows). `bool_flip` is for `0`/`1` semantics inverted (e.g., `cl_bonusflash` 0=off in ezQuake but `v_bonusflash` 1=on in FTE -- needs research before stamping). `scale` is for unit-scale differences (`bgmvolume` 0-1 might map to `musicvolume` 0-0.3 or similar). `enum_remap` is for non-numeric value spaces (`sshot_format` ezQuake's `DEFAULT_SSHOT_FORMAT` macro vs FTE's `png` literal). `needs_review` is the safe default when the handler can't classify; downstream tooling treats it as "do not transform automatically; surface to user."

**`value_transform_params_json`.** Free-form JSON for parametric transforms. `{"factor": 0.3}` for scale, `{"map": {"tga": "tga", "png": "png", "DEFAULT_SSHOT_FORMAT": "png"}}` for enum_remap, etc. NULL for identity / bool_flip / needs_review (they don't carry parameters). Schema deliberately doesn't enforce param shape per transform -- consumer-side validation owns that contract because it varies with use case.

**`default_drift_status`.** Captures the drift sweep's per-row finding *when both sides exist*. `same` if defaults match at the verified version pair. `differ_safe` when defaults differ but both produce equivalent runtime behavior (e.g., color triplets that differ visually but neither is "wrong"). `differ_dangerous` when blindly applying the LHS value to the RHS would break user expectation (e.g., `cl_physfps` 0=auto vs `cl_netfps` 150=hardcoded). `unknown` is the safe default for rows the handler can't classify automatically. Existence questions ("we couldn't check because the RHS doesn't exist") are owned by `freshness_state`, not duplicated here. When `freshness_state IN ('target_gone', 'both_gone')`, `default_drift_status` is meaningless; importers should set it to `unknown` and consumers should ignore it.

**`semantic_confidence`.** Trust level for the alias as a whole. ezscript rows ship at `medium` by default (the plugin author declared the mapping, but we haven't verified semantics ourselves). Manual review can promote to `high`. Inferred or community-sourced aliases land at `low` or `needs_review`. The handler should never auto-promote rows past `medium`.

**`verified_target_version` / `verified_mimics_version`.** The verification stamp has three axes: the *host* project + version (the row's own project + version columns; FTE @ build-6698 for ezscript), the *target* project + version (where drift was checked against the RHS; same as host for ezscript since the target is also FTE), and the *mimics* project + version (where the LHS-existence check was done; ezQuake @ 3.6.9 for ezscript's drift sweep). Host is implicit. Target and mimics each get a nullable text column so they're SQL-filterable directly (no `json_extract` needed for "show me all rows verified against ezQuake 3.6.9"). For ezscript today: `verified_target_version='build-6698'`, `verified_mimics_version='3.6.9'`. For internal-engine aliases (`mimics_project IS NULL`): `verified_mimics_version IS NULL`. Future third axis would land via `ALTER TABLE ADD COLUMN`, not via JSON shape evolution.

Strings must round-trip through `parseVersionSpec` from `@qw/version-resolution` (Path A's shared lib). The loader for `cvar_alias` rows must call the parser to validate every incoming version string at load time so we can't drift between `build-6698` and `build_6698` style differences across producers.

**`freshness_state`.** Five-valued, computed at extraction time:
- `alive` -- LHS exists in mimics_project at its checked version (or mimics_project is NULL), AND target exists in target_project at its checked version. 25 of 38 ezscript rows today.
- `mimics_lhs_gone` -- target exists, but the mimics-side LHS is retired in mimics_project. The alias still functions in the host project; it just isn't useful for anyone migrating from a current mimics version. 7 of 38 ezscript rows.
- `target_gone` -- target doesn't exist in target_project at its checked version. The alias is broken. 1 of 38 (`vid_vsync` -> `_vid_wait_override`).
- `both_gone` -- neither side resolves. 1 of 38 (`in_m_mwhook` -> `in_mwhook`).
- `unknown` -- couldn't compute. Default for newly-imported rows where verification hasn't run.

Note: the 4 F_DOC_ONLY rows from today's audit aren't a separate freshness_state. They map to `mimics_lhs_gone` because doc_only means "in ezQuake help-JSON only, not source-backed there" -- effectively retired-from-source. Captured via the underlying mimics-side `source_state`, surfaced through this enum.

**`source_root`.** Mirrors v11 cvar_versions / command_versions / macro_versions. `'fte:plugin:ezscript'` for ezscript-extracted rows. `'ezquake:engine'` for any future internal-engine alias migration.

### N-to-1 mappings

Each LHS is one entity row. Two LHS pointing at the same RHS = two entity rows + two cvar_alias_versions rows, both with `target_canonical_id` set to the same target. `r_skycolor` (entity `fte:cvar_alias:r_skycolor`) and `fps_skycolor` (entity `fte:cvar_alias:fps_skycolor`) both have rows pointing at `target_canonical_id='fte:cvar:r_fastskycolour'`. The shared-target relationship is queryable directly:

```sql
SELECT e.name FROM entities e
JOIN cvar_alias_versions v ON v.entity_id = e.id
WHERE v.target_canonical_id = 'fte:cvar:r_fastskycolour'
  AND v.version = 'build-6698';
-- returns ['r_skycolor', 'fps_skycolor']
```

### Internal-engine aliases (deferred)

`cl_truelightning` -> `cl_fakeshaft` is registered in ezQuake's `host.c:580` via `Cmd_AddLegacyCommand`. It currently lives in the DB as a `command` entity (`source_backed`, ezQuake project). Two paths once this schema lands:

1. **Migrate.** Drop the `command` row, emit a `cvar_alias` row for `cl_truelightning` with `target_project='ezquake'`, `target_kind='cvar'`, `target_name='cl_fakeshaft'`, `mimics_project=NULL`, `source_root='ezquake:engine'`. Slipgate's CvarRow / search UI surfaces it inline with cvars. This is the cleaner end state and matches how users mentally model `cl_truelightning` (it's a cvar-shaped knob, not a command).
2. **Parallel.** Keep the `command` entity for backwards compatibility, additionally emit a `cvar_alias` row. Two rows for the same name in the same project with different types is allowed (entity uniqueness is on `(project, type, name)`). Useful if anything depends on `cl_truelightning` showing up as a command.

Decision deferred. Schema supports both. Sub-thread for this is the "cl_truelightning slipgate search gap" parked thread in the umbrella entry.

### Lookup integration

Three consumers will eventually want to read `cvar_alias` rows:

- **MCP `lookup_entity`.** Today it queries cvar/command/macro/cmdline_param/ruleset by name. Add `cvar_alias` to the query set so `lookup_entity('cl_fakeshaft', project='fte')` returns the alias row plus, by joining `cvar_alias_versions.target_canonical_id`, the target cvar's record. Tool description should mention "alias targets are followed in the same call" so the librarian volunteers them.
- **Slipgate config viewer.** A user's config containing `cl_fakeshaft 1` lookups against the FTE snapshot. With cvar_aliases in the snapshot, the viewer can render "this is an alias for `cl_truelightning` -- value applied as identity transform" inline. The build-snapshot CLI will need a small extension to emit alias rows; out of scope for this spec.
- **FTE converter.** Translating an ezQuake config to FTE benefits from the aliases as explicit "ezQuake name -> FTE name" lookup, reading `mimics_project='ezquake'` rows. Same data model already covers this case.

None of these consumer changes are part of this spec. They fall out naturally once the schema and the ezscript handler ship.

## Population: ezscript extract handler

Sub-thread #3 (out of scope for this spec, but the population shape is committed here so the handler has explicit guidance).

The handler at `apps/qw-oracle/scripts/extractors/fte/_handler_ezscript.py` follows the sibling-handler pattern:

1. Walk `research/repos/fteqw/plugins/ezscript/ezscript.c` with libclang.
2. Find `Plug_ExecuteCommand` (function decl).
3. Walk every `if (!strcmp(args[0], "<lhs>")) { Plug_Cbuf_AddText("<rhs> ", ...); }` branch. Two string literals per branch (LHS and RHS). The RHS may be `serverinfo <name>`, in which case parse out target_kind + target_name.
4. Emit one row per branch with:
   - `name` = LHS string literal
   - `target_project` = `'fte'`
   - `target_kind` = `'cvar'` for plain `<rhs>`, `'serverinfo'` if RHS starts with `serverinfo `, etc.
   - `target_name` = the RHS literal (with prefix stripped if applicable)
   - `mimics_project` = `'ezquake'` (hardcoded for ezscript; future plugins might bridge other namespaces and would set their own)
   - `value_transform` = `'identity'` (handler default; manual review can promote)
   - `default_drift_status`, `freshness_state` = filled from the today-shipped sweep at first import; set to `unknown` for any LHS the sweep didn't cover
   - `semantic_confidence` = `'medium'` (default for source-extracted aliases)
   - `verified_against_version_pair_json` = `{"target": "build-6698", "mimics": "3.6.9"}` (filled at the time the drift sweep ran; subsequent extractions update if a newer sweep ran)
   - `source_file` = `'plugins/ezscript/ezscript.c'`, `source_line` = the strcmp branch line
   - `source_root` = `'fte:plugin:ezscript'`

The drift / freshness data lives in `/tmp/ezscript-audit/drift-369.tsv` today. It will move into a permanent fixture (probably `apps/qw-oracle/scripts/extractors/fte/seeds/ezscript-drift-369-vs-build-6698.tsv`) the handler reads alongside the AST walk. That seed gets refreshed when either side cuts a new sanity-check version pair.

Expected output: 38 alias entities at FTE build-6698 after `extract-tag --project fte --version build-6698` + `load-version --type cvar_alias`.

## Migration: v11 -> v12

Standard pattern. `schema.ts`:

```typescript
export const SCHEMA_VERSION = 12;

const SCHEMA_V12_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS cvar_alias_versions (
  ... -- as above
);
CREATE INDEX IF NOT EXISTS idx_cvar_alias_versions_target
  ON cvar_alias_versions(target_project, target_kind, target_name);
CREATE INDEX IF NOT EXISTS idx_cvar_alias_versions_canonical
  ON cvar_alias_versions(target_canonical_id);
`;

const ENTITIES_V12_REBUILD_SQL = `
... -- CHECK widening as above
`;

function migrateV11ToV12(db: Database) {
  db.exec(SCHEMA_V12_ADDITIONS_SQL);
  db.exec(ENTITIES_V12_REBUILD_SQL);
  db.prepare(`UPDATE schema_meta SET value=? WHERE key='schema_version'`).run('12');
}
```

`applySchema` runs the v1 widened CHECK on fresh DBs (already includes the v5 type set; widen the literal in the v1 CHECK to add `cvar_alias`). Old DBs run through `migrateV1ToV2` ... `migrateV11ToV12` in order. Mirror in `apps/qw-oracle/SCHEMA.md` with a new "Per-type snapshots" row for `cvar_alias_versions` and a section under "Identity layer" describing the new `type='cvar_alias'` shape.

`scripts/load-knowledge/types.ts` adds a `CvarAliasVersionRow` type.

`scripts/load-knowledge/load-version.ts` adds `cvar_alias` to its dispatch.

`scripts/load-knowledge/load-cvar-aliases.ts` (new file, ~50 lines per sibling-loader pattern) handles upserts.

`scripts/load-knowledge/natural-keys.ts` gets a `cvarAliasNaturalKey` entry.

None of this is implementation for this spec; called out so the operator sees the full surface before approving.

## Open questions

- **Should serverinfo / userinfo become first-class entity types?** Today they're just target_kind labels. ezQuake registers serverinfo keys in source (`Cvar_RegisterVariable` is one path; serverinfo strings are sometimes literals). If a future Layer 1 pass extracts those, the alias rows can backfill `target_canonical_id`. Defer until there's a concrete reason to extract them.
- **`cl_truelightning` migration timing.** Schema ships now; the actual `command` -> `cvar_alias` migration of that row depends on the slipgate search-gap UX work. Not blocking.
- **Drift seed location and refresh cadence.** The `ezscript-drift-369-vs-build-6698.tsv` seed file location is proposed but not committed. Handler can read it from `/tmp` for the first import and we move it on the second pass. Operator's call.
- **value_transform_params_json shape per transform.** Schema doesn't enforce. We'll learn the shapes empirically as more transforms get classified. First-pass importer uses identity / needs_review; everything else is manual.
- **Deletion/retire semantics for cvar_alias entities.** If a future ezscript version drops a strcmp branch, the entity transitions to `source_retired` via the standard mechanism. No special handling needed.

## Out of scope

- Sub-thread #3 implementation (ezscript handler + load-cvar-aliases.ts + types.ts + tests). Population shape committed above; code is not.
- Sub-thread #4 (FTE asset bundle extraction). Adjacent track, separate plan.
- Sub-thread #5 (slipgate consumer version-awareness). Driven by the Quake Dir Control plan in the orchestrator session. This spec does not touch slipgate-app.
- `cl_truelightning` migration to `cvar_alias`. Schema permits; decision deferred to the slipgate search-gap work.
- Broad-scope alias research (FTE -> MVDSV serverinfo bridges, MVDSV -> KTX user-defined macros, etc.). Schema is general enough; concrete imports come later.
- Build-snapshot extension to emit alias rows into slipgate's data dir. Falls out once the rows exist; not designed here.

## Pressure / sequencing

This spec unblocks sub-thread #3 (~30 min coding + tests). Sub-thread #5 is independently driven and does not depend on this. Sub-thread #4 is unrelated.

The ezscript handler is bounded and shippable in a single session once the schema lands. After that, the alias data is queryable, slipgate's lookup_entity can find aliased names, and the broader cross-engine alias surface (FTE serverinfo bridges, internal-engine aliases) has a home.
