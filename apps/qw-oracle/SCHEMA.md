# QW Oracle - Layer 1 Schema Reference

Cumulative reference for `apps/qw-oracle/data/knowledge.db`. This is the whole shape at schema v8, organized topically (not chronologically). If you want the *why* of a specific migration, see the per-migration spec linked in that section. If you want verification queries, see `scripts/load-knowledge/e2e-verify.md`.

Layer 2 (`data/qw.db`, the chat corpus) is out of scope for this doc.

## Conventions

- **SQLite** via `better-sqlite3`. Schema lives in `scripts/load-knowledge/schema.ts` as the `SCHEMA_V*_ADDITIONS_SQL` blocks plus rebuild blocks for CHECK widening (entities table at v2/v3/v5; asset_loader_sites at v8). Fresh DBs stamp the current `SCHEMA_VERSION` directly; older DBs run through `migrateV1ToV2` ... `migrateV7ToV8` in order.
- **Versions** are strings, per-project convention. ezQuake uses upstream tags (`3.6.9`) plus synthetic `head`. `project` is one of `ezquake`, `fte`, `mvdsv`, `ktx` (CHECK-constrained; only `ezquake` is populated today).
- **Natural keys** are called out per table. All loader upserts go through `scripts/load-knowledge/natural-keys.ts`; that is the one place idempotent-insert logic lives.
- **Canonical IDs** are `<project>:<type>:<name>`, lowercased for everything except `token_primitive` (which is case-sensitive — `$B` blue LED vs `$b` glyph).
- **Timestamps** are ISO 8601 strings. `extracted_at` is "most recent extraction for this row" — overwritten on re-run. Git history of `knowledge.db` is not recoverable from the row itself (it is gitignored).
- **`source_ref` discipline** - every row that can carry a `source_file` / `source_line` does, even when blame is best-effort. The diff pipeline and MCP tools both consult these.

## Table map at a glance

| Group | Tables |
|---|---|
| Identity | `versions`, `entities` |
| Per-type snapshots | `cvar_versions`, `command_versions`, `macro_versions`, `cmdline_param_versions`, `keyname_versions`, `hud_element_versions`, `ruleset_versions`, `token_primitive_versions`, `asset_category_versions`, `flag_bit_versions` |
| Relations | `asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`, `release_notes` |
| Change tracking | `change_events`, `relation_changes`, `source_overrides` |
| Audit | `source_state_transitions`, `schema_meta` |

Total: 20 tables at schema v8.

---

## Identity layer

### `versions`

One row per (project, version) pair loaded. The "have I seen this tag?" answer.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `project` | TEXT CHECK | `ezquake` / `fte` / `mvdsv` / `ktx` |
| `version` | TEXT | Upstream tag string, or `head` |
| `commit_sha` | TEXT | Resolved git SHA for the tag |
| `tag_date` | TEXT nullable | ISO date of the tag |
| `ordinal` | INTEGER | Monotone per-project ordering; drives diff "walk forward". Released tags use a semver-encoded number (3.6.1 → 361, 3.6.6 → 366). The `head` row uses sentinel `HEAD_ORDINAL = 999999` (exported from `schema.ts`) so it sorts after every release. CLI `--ordinal` is auto-defaulted to `HEAD_ORDINAL` when `--version=head`; tagged versions must pass `--ordinal` explicitly. |
| `parse_state` | TEXT CHECK | `ok` / `partial` — extractor health for this version |
| `notes` | TEXT nullable | Free-form extractor notes |
| `extracted_at` | TEXT | ISO timestamp |

**Natural key:** `(project, version)`. Also `UNIQUE (project, ordinal)` so the diff walker can pick the predecessor by arithmetic.

**Populated by:** every `load-version` and `load-assets` call upserts the (project, version) row before touching type-specific tables.

**Consumed by:** `diff-versions.ts` (walk from ordinal N to N+1), `release_notes` loader, every MCP tool that scopes by version.

**Spec:** `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md`.

### `entities`

The shared identity table: one row per canonical engine feature across all its observed versions. Per-version detail lives in the type-specific `*_versions` tables.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `project` | TEXT CHECK | |
| `type` | TEXT CHECK | 10 values — see table map above |
| `name` | TEXT | Raw name as used in-game (case preserved) |
| `canonical_id` | TEXT UNIQUE | `<project>:<type>:<name>`, lowercased except for `token_primitive` |
| `first_seen_version` | TEXT | Oldest version still carrying this row |
| `last_seen_version` | TEXT | Most recent version carrying this row |
| `source_state` | TEXT CHECK | `source_backed` / `source_retired` / `doc_only` / `dynamically_registered` |
| `predecessor_id` | INTEGER nullable | Manual rename bridge (FK to self) |
| `created_at` / `updated_at` | TEXT | ISO timestamps |

**Natural key:** `(project, type, name)`. `canonical_id` is a secondary UNIQUE and is the join key for every `_versions` table via `entity_id`.

**Source-state semantics:**
- `source_backed` — present in the current extraction pass.
- `source_retired` — was seen in an older version, dropped from head. Kept for historical queries.
- `doc_only` — help-text entry with no source-code counterpart (help JSON documents a feature the extractor cannot find).
- `dynamically_registered` — registered at runtime rather than compile-time; the extractor can see the registration site but not a static declaration.

**Populated by:** every per-type loader adapter (`load-cvars.ts`, etc.) calls `upsertEntity` before writing its `*_versions` row.

**Consumed by:** every downstream query. Every `*_versions` row FK-references `entity_id`; every `source_overrides` row too.

**CHECK widening history:** The `type` CHECK started at 4 values in v1 and has been widened three times (v1→v2, v2→v3, v4→v5) via full table-rebuild migrations. See `ENTITIES_V2_MIGRATION_SQL`, `ENTITIES_V3_MIGRATION_SQL`, `ENTITIES_V5_MIGRATION_SQL` in `schema.ts`. Fresh DBs stamp the v5-wide CHECK directly on the v1 CREATE — the comment at the top of `SCHEMA_V1_SQL` documents why that is deliberate.

---

## Per-type snapshot tables

One table per entity type. Each carries (entity_id, version) as PK and holds the per-version state. These are the "what did this look like in 3.6.6?" tables.

All ten share the same shape skeleton:
- PK `(entity_id, version)`
- `extracted_at TEXT NOT NULL`
- At least one source-location trio: `source_file`, `source_line`, (sometimes `source_column`)
- `raw_ast_hash TEXT` — fingerprint of the AST subtree used for change detection

What differs is the type-specific payload columns.

### `cvar_versions`

Extracted from `var_t`/`cvar_t` struct initializers. Schema v1.

Type-specific columns: `help_desc`, `help_remarks`, `help_values`, `help_group_id`, `help_type`, `default_value`, `flags_raw`, `flag_names`, `on_change`, `min_bound`, `max_bound`, `storage_class`, `group_name_in_source`, `trailing_comment`, `server_only`.

**Populated by:** `load-cvars.ts` ← `packages/qw-config/scripts/extract-ezquake-cvars-clang.py` → `ezquake-variables-ast.json`.

**Count at ezQuake head:** 2901.

**Help sources:** `help_cvars.json` (from ezQuake), merged with AST-discovered `Cvar_RegisterVariable` / `Cvar_Register` sites by name. `help_*` columns come from JSON; `source_*` / `default_value` / `flags_*` come from AST.

Index: `idx_cvar_versions_source ON (source_file, source_line)`.

### `command_versions`

Extracted from `Cmd_AddCommand` registration sites. Schema v1.

Type-specific: `help_desc`, `help_remarks`, `help_group_id`, `handler_fn`, `registration_file`.

**Populated by:** `load-commands.ts` ← `extract-ezquake-commands-clang.py` → `ezquake-commands-ast.json`.

**Count at ezQuake head:** 522. (One case-duplicate `loadFragfile` / `loadfragfile` collapses in canonical lowercase — QW command names are case-insensitive.)

### `macro_versions`

ezQuake `$macro` registrations via `Cmd_AddMacro` / `Cmd_AddMacroEx`. Schema v1.

Type-specific: `help_desc`, `macro_type`, `teamplay_restricted`, `related_cvars_json`, `handler_fn`, `registration_file`.

**Populated by:** `load-macros.ts` ← `extract-ezquake-macros-clang.py` → `ezquake-macros-ast.json`.

**Count at ezQuake head:** 68. 2 declared-but-never-wired ones (`mp3_volume`, `mp3info` — gated on a disabled MP3 build flag) are recorded with source_state reflecting that gap.

### `cmdline_param_versions`

Command-line arguments consumed via `COM_CheckParm`. Schema v1.

Type-specific: `help_desc`, `help_remarks`, `arguments`, `flags_json`, `systems_json`.

**Populated by:** `load-cmdline-params.ts` ← `extract-ezquake-cmdline-clang.py` → `ezquake-cmdline-params-ast.json`.

**Count at ezQuake head:** 71. Data-quality surfaces: 8 declared-but-never-consulted params and 1 source-only undeclared (`-noerrormsgbox`).

### `keyname_versions`

Key-code / key-name table (for bind validation and display). Schema v2.

Type-specific: `key_code`, `key_code_ident`, `build_variant` (e.g., `apple` for COMMAND / PARA / F13-F15 / KP_EQUAL — only in `-D__APPLE__` builds).

**Populated by:** `load-keynames.ts` ← `extract-ezquake-keynames-clang.py` → `ezquake-keynames-ast.json`.

**Count at ezQuake head:** 148. Aliases (SCROLLLOCK / SCROLLOCK / SCRLCK all mapping to 130) preserved as separate rows with the same `key_code`.

**Spec:** Phase 2c.5 plan, `docs/superpowers/plans/2026-04-19-qw-knowledge-phase-2c5.md`.

### `hud_element_versions`

HUD_Register call sites — every named HUD element. Schema v2.

Type-specific: `help_desc`, `hud_alias`, `flags_raw`, `min_state_raw`, `draw_order_raw`, `draw_fn`, `enclosing_function`, `owned_cvars_json` (JSON array of the `hud_*` cvars synthesized for this element).

**Populated by:** `load-hud-elements.ts` ← `extract-ezquake-hud-elements-clang.py` → `ezquake-hud-elements-ast.json`.

**Count at ezQuake head:** 83. Between them they own 1404 synthesized `hud_*` cvars via `owned_cvars_json`.

**Spec:** Phase 2c.5 plan (same as keyname).

### `ruleset_versions`

Policy bundles — the full `rulesetDef_t` struct for each ruleset (default, smackdown, qcon, thunderdome, mtfl, smackdrive). Schema v2.

Type-specific: `enum_ident`, `loader_fn`, `maxfps`, plus 10 `restrict_*` bit flags (`restrict_triggers`, `restrict_packet`, `restrict_particles`, `restrict_play`, `restrict_logging`, `restrict_rollangle`, `restrict_ipc`, `restrict_exec`, `restrict_setcalc`, `restrict_seteval`, `restrict_setex`), `locked_cvars_json` (list of `{cvar_ident, value}` pairs that the ruleset pins).

**Populated by:** `load-rulesets.ts` ← `extract-ezquake-rulesets-clang.py` → `ezquake-rulesets-ast.json`.

**Count at ezQuake head:** 6. Per-field blame for ruleset struct fields is what drove the v6 `source_overrides` work — the extractor emits per-field `field_source_lines` and the loader writes `source_overrides` rows so diff blame attributes each field to its struct-declaration commit, not the generic loader site.

**Spec:** Phase 2c.5 plan.

### `token_primitive_versions`

Single-character `$x` / `^x` tokens (the primitive building blocks of teamsay macros and name/chat color codes). Schema v2.

Type-specific: `form` (e.g., `$x`, `^x`), `suffix_char` (the character after `$`/`^`), `byte_value` (the conchars grid index), `category` (`led` / `glyph` / etc.), `case_style`.

**Populated by:** `load-token-primitives.ts` ← `extract-ezquake-token-primitives-clang.py` → `ezquake-token-primitives-ast.json`.

**Count at ezQuake head:** 33. Case-sensitive canonical IDs (only type where this applies — see `canonicalIdFor` in `natural-keys.ts`).

**Spec:** Phase 2c.5 plan.

### `asset_category_versions`

Content categories for the engine's filesystem-consumption model (skin / crosshair / skybox / map / etc.). Each `asset_*` relation table FK-references `category_id` pointing into `entities.canonical_id` of a `type='asset_category'` entity. Schema v3.

Type-specific: `display_name`, `description`, `notes`.

**Populated by:** `load-asset-categories.ts` ← hand-authored seed YAML at `packages/qw-config/seeds/ezquake-asset-taxonomy.yaml`, merged with AST passes by `build-asset-bundle.ts` → `ezquake-asset-bundle.json`.

**Count at ezQuake head:** 17.

**Spec:** `docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md`.

### `flag_bit_versions`

Individual bits inside engine bitmask families — `CVAR_*` (cvar flags), `FPD_*` (FPD fragility flags), `STAT_*` (stat-index constants). Schema v5.

Type-specific: `bitmask_family` (one of `cvar_flag` / `fpd_flag` / `stat_const`), `value_raw` (e.g., `(1<<0)` or `0`), `value_numeric` (integer).

**Populated by:** `load-flag-bits.ts` ← `extract-ezquake-flag-bits-clang.py` → `ezquake-flag-bits-ast.json`. Families configurable via `FAMILY_TARGETS` in the extractor — extensible (PEXT / FTE_PEXT will pick up naturally in FTE).

**Count at ezQuake head:** 50 (26 `cvar_flag` + 7 `fpd_flag` + 17 `stat_const`).

Index: `idx_flag_bit_versions_family ON (bitmask_family)`.

**Spec:** `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v5-flag-bits-and-relation-changes.md`.

---

## Relation tables

These are not per-entity snapshots — they are cross-row relations that exist per-(project, version) but are not keyed through `entities`. Four of them describe the asset-consumption model; one captures GitHub release narrative.

### `asset_extensions`

"This file extension belongs to this category in this project/version." Schema v3; v7 added per-row hygiene audit.

Columns: `project`, `version`, `extension`, `path_hint` (nullable — path fragment that refines ambiguous extensions like `.tga` → skin vs texture vs skybox), `category_id` (FK to `entities.canonical_id`), `notes`, `verification_status` (CHECK `ast_verified` / `seed_only_with_ast_support` / `seed_only_no_ast_support` / `orphaned_historical`, default `ast_verified`, schema v7), `verification_reason` (free-text justification for any non-default status, schema v7), `raw_ast_hash`, `extracted_at`.

**Natural key:** `(project, version, extension, path_hint)`.

**Count at ezQuake head:** 270 rows total — 268 `ast_verified`, 1 `orphaned_historical` (`.kmap` — loader removed in commit `46b5046`, files persist via nQuake bundle), 1 `seed_only_no_ast_support` (`.dll` — intentional FTE cross-engine signal). Per-row stamps live in the seed YAML under optional `verification_status` / `verification_reason` keys; rebuild bundle + reload to populate.

Indexes: `idx_asset_ext_cat ON (category_id)`, `idx_asset_ext_verif ON (verification_status)`.

### `asset_path_rules`

Filesystem-discipline rules the engine enforces: search-path order, archive precedence, cmdline overrides, gamedir behavior. Schema v3.

Columns: `rule_kind` (CHECK `search_path` / `archive_precedence` / `cmdline_override` / `gamedir_behavior`), `ordinal` (precedence order within kind), `canonical_id` (rule slug), `description`, `source_ref`, `source_verified` (0/1 — whether the rule was traced to a real `fs.c` site).

**Natural key:** `(project, version, canonical_id)`.

**Count at ezQuake head:** 14 — 2 search_path + 5 archive_precedence + 2 gamedir_behavior + 5 cmdline_override. All `source_verified=1`.

### `asset_cvar_bindings`

"This cvar, when set, causes the engine to load assets of this category from this path pattern." Schema v3.

Columns: `cvar_canonical_id` (FK), `category_id` (FK), `path_pattern` (e.g., `skins/{value}.pcx`), `load_trigger` (CHECK `startup` / `on_demand` / `on_connect` / `on_map_load` / `unknown`), `confidence` (CHECK `seed` / `auto` / `auto_confirms_seed` / `auto_orphan`), `source_ref`.

**Natural key:** `(project, version, cvar_canonical_id, category_id, path_pattern)`.

**Count at ezQuake head:** 26 — 23 seed entries + 1 `auto_confirms_seed` + 2 `auto_orphan`s. Seed is hand-authored at `packages/qw-config/seeds/ezquake-asset-cvar-bindings.yaml`; the AST pass corroborates where visible (most ezQuake flows cross statement boundaries so the single-compound-scope auto-pass only catches 1).

Indexes: `idx_asset_cvar_bind_cvar ON (cvar_canonical_id)`, `idx_asset_cvar_bind_cat ON (category_id)`.

### `asset_loader_sites`

Every concrete callsite in engine C that loads an asset — function name, location, classifier. Schema v3; v8 widened the confidence CHECK.

Columns: `canonical_id`, `function_name`, `source_file`, `source_line`, `enclosing_function`, `reads_category_id` (nullable FK), `load_trigger`, `path_source` (CHECK `literal` / `cvar` / `computed` / `unknown`), `path_literal` (if literal), `path_cvar_id` (FK if cvar-driven), `confidence` (CHECK `certain` / `heuristic` / `intentionally_generic` / `unclassified`, schema v8), `dev_only` (0/1).

**Natural key:** `(project, version, canonical_id)` where `canonical_id = <function>_<basename>_<ordinal-in-function>` (ordinal-based since Batch 3 — was line-embedded before, which produced spurious diff pairs on unrelated edits above).

**Count at ezQuake head:** 128 — 24 certain + 80 heuristic + 24 intentionally_generic + 0 unclassified. The `intentionally_generic` bucket (schema v8, 2026-04-22) covers calls to the four FS-layer primitives (`FS_OpenVFS` / `FS_LoadFile` / `FS_LoadHunkFile` / `FS_WriteFile`) with `path_source='unknown'` — these are the FS layer itself rather than asset loaders. Zero `unclassified` at head means a future tag-pair surfacing one would be a real novelty, not FS-internals noise.

Indexes: `idx_asset_loader_category`, `idx_asset_loader_cvar`, `idx_asset_loader_fn`.

### `release_notes`

One row per parsed bullet from a tag's GitHub release body. Captures version-level narrative that entity diffs can't see (code-only fixes, bitmask-flag additions, high-level feature notes). Schema v4.

Columns: `section` (e.g., `new features`, `fixes`), `ordinal` (position within section), `body_md` (bullet's markdown), `referenced_entity_ids_json` (JSON array of canonical_ids mentioned), `commit_urls_json`, `pr_numbers_json`, `author_handles_json`, `raw_body_hash`.

**Natural key:** `(project, version, section, ordinal)`.

**Populated by:** `load-release-notes.ts` ← `release-notes` CLI subcommand, which fetches the release body from the GitHub API.

Index: `idx_release_notes_version ON (project, version)`.

**Spec:** n/a — added directly as schema v4 during Phase 2f stress-test prep. See HANDOVER "Knowledge schema spec behind code (v2-v4 undocumented)".

---

## Change tracking

Three append-only tables that capture what changed when. `change_events` is the entity-row diff stream; `relation_changes` is the asset-relation-row diff stream; `source_overrides` is the blame index that teaches both where to attribute a field.

### `change_events`

Entity-scoped, field-level diff events. One row per (entity, from→to version, field). Schema v1.

Columns: `entity_id`, `from_version` (nullable for `created`), `to_version`, `change_kind` (CHECK `created` / `modified` / `deleted`), `field_name` (empty string for created/deleted — holds the struct-field key for `modified`), `old_value`, `new_value`, `commit_sha`, `commit_message_excerpt`, `pr_number`, `pr_title`, `pr_body_excerpt`, `linked_issues_json`, `enrichment_source` (CHECK `git` / `github_api`).

**Natural key:** `(entity_id, to_version, field_name, change_kind)`.

**Populated by:** `diff-versions.ts` — walks every type via `TYPE_DIFF_CONFIGS`, compares the from-version and to-version `*_versions` rows for each entity, emits one row per field-level divergence. Subsequent `enrich` pass hydrates `pr_*` columns from the GitHub API.

**Consumed by:** timeline queries ("when did cl_bob's default last change?"), the Oracle Bot's "what changed in 3.6.9?" path, MCP tools.

Indexes: `idx_change_events_to_version`, `idx_change_events_entity_field`, `idx_change_events_commit`.

### `relation_changes`

Same idea as `change_events` but for the four `asset_*` relation tables (rows without an `entity_id`). Keyed by relation table name + deterministic row-key JSON. Schema v5.

Columns: `relation_table` (CHECK the four asset_* tables), `project`, `from_version`, `to_version`, `change_kind`, `row_key_json` (canonical JSON of the natural-key columns — stable across re-extraction), `field_name`, `old_value`, `new_value`, `commit_sha`, `commit_message_excerpt`.

**Natural key:** `(relation_table, project, to_version, row_key_json, field_name, change_kind)`.

**Populated by:** `diff-versions.ts` — relation-diff code path, separately from the entity-diff path.

**Known limitation:** blame attribution is currently `commit_sha='UNKNOWN'` for all rows — relation rows don't always carry `source_file` / `source_line`, so there is nowhere to `git blame`. Proper blame is deferred; when a relation blame strategy exists, it will reuse the `source_overrides` table.

Indexes: `idx_relation_changes_to_version`, `idx_relation_changes_table`.

**Spec:** `2026-04-21-qw-knowledge-schema-v5-flag-bits-and-relation-changes.md`.

### `source_overrides`

Per-(entity, version, field) blame index. The answer to "where does the *value* of this field actually come from?" when the answer isn't "the entity's primary `source_file:source_line`." Schema v6.

Columns: `entity_id`, `version`, `field_name`, `source_file`, `source_line`, `source_column`, `override_kind` (CHECK `struct_field_decl` / `call_site` / `header_declaration`), `extracted_at`.

**Natural key:** `(entity_id, version, field_name)`.

**Why this exists:** Most fields blame correctly to the entity's own `source_file:source_line`. But some don't:
- **Ruleset `restrict_*` / `maxfps` / `locked_cvars_json`** — declared in `rulesetDef_t` struct fields at a single site. The "semantic author" of a field change is the commit that edited the struct layout, not the commit that last touched the loader-site where the ruleset entity is registered. Extractor emits `struct_field_decl` overrides; loader writes them.
- **HUD element `flags_raw` / `min_state_raw` / `draw_order_raw`** — set via positional args in the `HUD_Register(...)` header call. Extractor emits `header_declaration` overrides keyed per-field.
- **Cvar `default_value` set via `Cvar_SetDefault` / `Cvar_ForceSet` / `Cvar_LockDefault`** — re-set at a call site rather than in the struct initializer. Extractor emits `call_site` overrides (best-effort regex anchored on `&cvar_name`; macro-expanded forms fall back to entity anchor).

**Populated by:** per-type loader adapters (`load-rulesets.ts`, `load-hud-elements.ts`, `load-cvars.ts`) consume extractor payloads (`field_source_lines` / `default_overrides`) and call `upsertSourceOverride`. Every `load-version` call populates `source_overrides` as a side effect for the tags that know about them.

**Consumed by:** `diff-versions.ts` preloads all overrides for the from/to versions into a Map at diff start, then for every `change_events` row with a matching override, replaces the entity's primary source anchor with the field-level one. That Map is the zero-SQL-per-event hot-loop optimization from commit `d949108`.

**Observed population at ezQuake head + 4 tags:** 2478 `header_declaration` + 341 `struct_field_decl` + 5 `call_site` = 2824 rows. Most rows are HUD_Register headers because ezQuake has 83 HUD elements × many fields.

Index: `idx_source_overrides_entity ON (entity_id, version)`.

**Spec:** `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v6-source-overrides.md`.

---

## Audit

### `source_state_transitions`

Append-only log of every `source_state` transition on every entity. The "receipt" layer. Schema v1.

Columns: `entity_id`, `from_state`, `to_state`, `reason` (CHECK `initial_observation` / `removed_from_head` / `re_added` / `backfill_match` / `manual_update`), `version_context` (nullable — which version triggered the transition), `extractor_run_id` (ULID so you can group a single extraction run), `created_at`.

**Populated by:** every `upsertEntity` call that transitions state emits a row. `initial_observation` fires on first insert; `removed_from_head` / `re_added` fire when the extractor's drop-guard sees an entity come and go across versions; `backfill_match` is reserved for the still-future historical-backfill work; `manual_update` is for operator annotations.

**Consumed by:** rarely queried directly; it exists so that `source_state` on `entities` is not a trust-me field. `source_state = 'source_retired'` on the entity row should always be explainable by a matching `removed_from_head` transition row.

Indexes: `idx_sst_entity`, `idx_sst_run`.

### `schema_meta`

Key/value scratchpad for loader state. Schema v1.

Expected keys:
- `schema_version` — current integer (matches `SCHEMA_VERSION` in `schema.ts`)
- `extractor_version` — last-run extractor version string (e.g., `clang-ezquake-cvars@1.0.0`)
- `last_extraction_run_at` — ISO timestamp
- `last_enrichment_run_at` — ISO timestamp
- `<project>:source_repo_commit` — last-seen commit SHA of the upstream repo
- `<project>:source_repo_tag` — last-seen tag

Consulted by: `applySchema` on open (to drive migrations), `enrich-prs.ts` on run (to stamp `last_enrichment_run_at`).

---

## Cross-cutting notes

### Idempotence

Every loader pass is idempotent by natural key:
- `versions` by `(project, version)`
- `entities` by `(project, type, name)`
- Every `*_versions` by `(entity_id, version)`
- Every `asset_*` relation by its `UNIQUE` tuple
- `change_events` / `relation_changes` / `source_overrides` by their natural keys

Re-running the same extractor+loader against the same tag produces the same rows. That is why HANDOVER can say "re-loading pre-Batch-2 tags will backfill source_overrides for them" with confidence.

### Regression guard

`load-version` aborts when entity counts drop >50% without `--force`. The `dropGuard` check lives in `load-version.ts`. Bypass only when the drop is known-real (extractor widened its filter, a type was retired, etc.).

### Drop-guard semantics

Drop-guard compares `entityCount` (total `*_versions` rows expected) not `_versions` row count. This is self-consistent: help-only entries DO become rows in `_versions` (as `doc_only`). Catalog Tier-4 item #10 was rejected after re-examination — not a bug.

### Fresh DB vs migrated DB

On a fresh DB, `applySchema` stamps `SCHEMA_VERSION = 6` directly and runs *all* `SCHEMA_V*_ADDITIONS_SQL` blocks (idempotent `CREATE IF NOT EXISTS`). The v1 `entities` CHECK already lists the full v5 type set — the comment at the top of `SCHEMA_V1_SQL` documents why. On a migrated DB, `applySchema` walks the migration chain v1→v2→...→v6 one step at a time. Both paths converge on the same shape.

---

## Related

- Schema code: `scripts/load-knowledge/schema.ts`
- Per-table idempotent upserts: `scripts/load-knowledge/natural-keys.ts`
- Per-type row-shape interfaces: `scripts/load-knowledge/types.ts`
- Loader adapters (one per entity type): `scripts/load-knowledge/load-<type>.ts`
- CLI entry point: `scripts/load-knowledge/index.ts`
- Verification queries per phase: `scripts/load-knowledge/e2e-verify.md`
- Per-migration specs: see each section above.
