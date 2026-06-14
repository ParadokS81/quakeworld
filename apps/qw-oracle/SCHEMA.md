# QW Oracle - Layer 1 Schema Reference

Cumulative reference for the Postgres `qw_oracle` database (Layer 1 + the `qw` game-content namespace + the new KTX additions). Organized topically (not chronologically). If you want the *why* of a specific migration, see the matching `db/migrations/<NNN>_<name>.sql` file's header comment, the per-migration spec linked in that section, or `docs/arc-history.md` for the chronological chain. If you want to verify a load, run the F1 quality-grid (`npm run load-knowledge -- quality-grid --project <project>`; `scripts/load-knowledge/quality-grid.ts`). The authoritative shape is the live database + the SQL files in `db/migrations/`.

Layer 2 (the chat corpus -- Discord-only) is out of scope for this doc; see `OVERVIEW.md` Section "Layer 2" for that surface.

> **Doc-currency note (post-KTX-onboarding 2026-05-06):** the preamble + table map below reflect the live Postgres schema after the KTX onboarding arc shipped (which added the `match_event` entity type plus 10 CHECK widenings -- `log_template_versions.channel += 'logfile'`, `entities.type += 'match_event'`, `gameplay_entity_defs.kind += 'monster'`, `gameplay_mechanics.kind += 'game_mode' / 'mode_default' / 'election_type' / 'score_system' / 'drop_item' / 'loc_macro' / 'teamplay_message'`). The per-table sections that follow document tables back through Arc 1 with mostly-current detail; per-table "Count at head" figures and some `Populated by:` paths are pre-KTX. Body refresh is queued (HANDOVER: "SCHEMA.md doc-style inconsistency" -- separate sidequest from the slim-doc sweep). Trust the live DB + the migration files over per-table prose when they conflict.

> **Post-migration-020 note (2026-06-05):** `qwfwd` (C UDP forwarder, qqshka) and `qtv` (Go streaming proxy, QW-Group) added as projects 6-7. Migration `020_qtv_qwfwd_projects.sql` widens all 10 project CHECK clauses across 9 tables. Entity rows and versions rows load in Phase 1 (QWFWD) and Phase 2 (QTV) of the QTV + QWFWD L1 extraction arc.

## Conventions

- **PostgreSQL 16 + pgvector + tsvector** (image: `pgvector/pgvector:pg16`). Schema is defined by SQL files under `db/migrations/<NNN>_<name>.sql`, applied by `bun db/migrate.ts`. Migration filenames are sequential and append-only -- never edit an applied migration. Architecturally-significant changes additionally get a dated spec under root `docs/superpowers/specs/`. Schema state is tracked in the `schema_migrations` table (filename + applied_at), not in a single integer version counter -- the SQLite-era `SCHEMA_VERSION` model retired with Arc 1.
- **Versions** are strings, per-project convention. ezQuake uses upstream tags (`3.6.9`) plus synthetic `head`. FTE has only `build-6698`. QWCL has only `2.33` (single-commit repo; canonical label aliased to commit `bf4ac42`). MVDSV has only `head` (2026-01-04 snapshot, `f816d28`). KTX uses upstream tags (`1.46` is the latest stable as of 2025-09-14). `project` is one of `ezquake`, `fte`, `mvdsv`, `ktx`, `qwcl`, `qwfwd`, `qtv` (CHECK-constrained; migration 020 added `qwfwd` and `qtv` as projects 6-7; all seven accepted post-migration). The `qw` namespace means "the game itself" -- content that exists outside any engine version arc. The `qw` tables (`maps`, `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics`) have no `project` column; `qw` appears only in the `Project` TS union.
- **Natural keys** are called out per table. All loader upserts go through `scripts/load-knowledge/natural-keys.ts`; that is the one place idempotent-insert logic lives. Postgres `INSERT ... ON CONFLICT ... DO UPDATE` is the canonical upsert shape.
- **Canonical IDs** are `<project>:<type>:<name>`, lowercased for everything except `token_primitive` (case-sensitive -- `$B` blue LED vs `$b` glyph). MVDSV-introduced types carry compound name suffixes for cross-scope disambiguation: `info_key` uses `<bare>:<scope>` (e.g. `*z_ext:serverinfo`); `qc_builtin` uses `<bare>:<table_name>`. KTX commands extend the same convention with sub-namespace suffixes: `<name>:frogbot:std` and `<name>:frogbot:editor` for the bot-subcommand tables (per the KTX onboarding arc D7).
- **JSONB columns receive JS values, not pre-stringified JSON** -- pass the JS array/object directly (or wrap with `tx.json(...)` for postgres-js type compliance); pre-stringifying stores a JSONB string scalar (the legacy SQLite-era TEXT bug). Probe `F1.jsonb_columns_not_strings` is the regression gate; KTX adds per-handler probes per the Phase 7 validation work.
- **Timestamps** are `TIMESTAMPTZ` columns with ISO 8601 string display. `extracted_at` is "most recent extraction for this row" -- overwritten on re-run.
- **`source_ref` discipline** -- every row that can carry a `source_file` / `source_line` does, even when blame is best-effort. The diff pipeline and MCP tools both consult these.

## Table map at a glance

| Group | Tables |
|---|---|
| Identity | `versions`, `entities` |
| Per-type snapshots (engine, per-version arc) | `cvar_versions`, `command_versions`, `macro_versions`, `cmdline_param_versions`, `keyname_versions`, `hud_element_versions`, `ruleset_versions`, `token_primitive_versions`, `asset_category_versions`, `flag_bit_versions`, `cvar_alias_versions`, `protocol_message_versions`, `info_key_versions`, `log_template_versions`, `qc_builtin_versions`, `match_event_versions` |
| Relations | `asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`, `release_notes` |
| qw namespace (game content, no version arc) | `maps`, `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics` |
| Change tracking | `change_events`, `relation_changes`, `source_overrides` |
| Audit | `source_state_transitions`, `schema_migrations` |
| Community (qwiki community-reference arc) | `community.players`, `community.clans`, `community.tournaments`, `community.player_clan_eras`, `community.tournament_results` |

**Total: 37 L1 + community tables post-KTX onboarding (32 L1 engine including `match_event_versions` + 5 community).** Migration history is captured per file under `db/migrations/`; high-level chain via the `schema_migrations` table -- no monolithic version counter. The KTX onboarding arc landed three migrations (`009_ktx_log_template_logfile_channel.sql` / `010_ktx_match_event_type.sql` / `011_ktx_gameplay_kinds.sql`, renumbered from D5's original 008/009/010 slot at execution time when the QWiki community-reference arc claimed slot 008): a `log_template_versions.channel` widening adding `'logfile'`, an `entities.type` widening adding `'match_event'` plus the new `match_event_versions` table, and a gameplay-kinds widening adding `'monster'` to `gameplay_entity_defs.kind` and seven new values to `gameplay_mechanics.kind`. See per-section bodies below for shape details.

---

## Identity layer

### `versions`

One row per (project, version) pair loaded. The "have I seen this tag?" answer.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `project` | TEXT CHECK | `ezquake` / `fte` / `mvdsv` / `ktx` / `qwcl` / `qwfwd` / `qtv` (migration 020) |
| `version` | TEXT | Upstream tag string, or `head` |
| `commit_sha` | TEXT | Resolved git SHA for the tag |
| `tag_date` | TEXT nullable | ISO date of the tag |
| `ordinal` | INTEGER | Monotone per-project ordering; drives diff "walk forward". Released tags use a semver-encoded number (3.6.1 -> 361, 3.6.6 -> 366). The `head` row uses sentinel `HEAD_ORDINAL = 999999` (exported from `schema.ts`) so it sorts after every release. CLI `--ordinal` is auto-defaulted to `HEAD_ORDINAL` when `--version=head`. |
| `parse_state` | TEXT CHECK | `ok` / `partial` -- extractor health for this version |
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
| `type` | TEXT CHECK | 11 values -- see table map above |
| `name` | TEXT | Source case -- the exact capitalization the engine registered (`loadFragfile`, `cl_independentPhysics`, `K_ENTER`). The case-insensitive fold is enforced structurally by `name_fold`, never by lowercasing `name`. |
| `name_fold` | TEXT GENERATED STORED | Migration 013. `lower(name)` for every type except `token_primitive` (case-significant: `$B` blue-LED vs `$b` glyph). The structural fold key -- existence checks, alias resolution, cross-type-orphan prune, and `lookup_entity` all match on this. |
| `canonical_id` | TEXT UNIQUE | `<project>:<type>:<name>`, lowercased except for `token_primitive`. Unchanged by migration 013 (same fold), so versioned tables / snapshots / MCP keys stay stable. |
| `first_seen_version` | TEXT | Oldest version still carrying this row |
| `last_seen_version` | TEXT | Most recent version carrying this row |
| `source_state` | TEXT CHECK | `source_backed` / `source_retired` / `doc_only` / `dynamically_registered` |
| `predecessor_id` | INTEGER nullable | Manual rename bridge (FK to self) |
| `description` | TEXT nullable | Migration 012. The owned Layer 1 description text for this entity. NULL for types with no audience for prose (ruleset, keyname, ...). |
| `description_origin` | TEXT nullable | Migration 012. Provenance label for `description`: where the text came from. Unconstrained TEXT on purpose (012 kept it loose so new origins need no migration); the vocabulary is enforced by the F1 probe `F1.describe_fill.origin_vocabulary`, not a CHECK. See "Description-provenance family" below for the value set. |
| `description_anchor_version` | TEXT nullable | Migration 014. The version string a `synthesized` description was authored against -- the D2/D4 staleness anchor. NULL for non-synthesized rows. |
| `description_rereview` | BOOLEAN NOT NULL DEFAULT FALSE | Migration 014. D4 walk-time staleness flag. When the walk-time report flags a synthesized description as possibly drifted this is set TRUE; the description keeps serving, stamped "may be stale as of version X" (stale-but-present beats a hole). |
| `description_provenance` | JSONB nullable | Migration 014. D11 retained multi-source provenance: a JSON array, one object per contributing shipped file -- `{source_file, source_line, shipped_value, raw_comment}` (a later phase additively widens the element with an optional `structured_choices` field; JSONB is schemaless so no migration). The committed description's `source_ref` points at the authoritative entry; losing/alternate sources are retained as data, never discarded, so a config-vs-config conflict stays flaggable. NULL when no shipped-file contributor. |
| `description_verdict` | TEXT nullable | Migration 014. D11 decision trail: the D5-D8 evaluation verdict. |
| `description_confidence` | TEXT nullable | Migration 014. D11 decision trail: the synthesis / evaluation confidence. |
| `description_reasoning` | TEXT nullable | Migration 014. D11 decision trail: D6's reasoning, stored not just logged (reviewed at the D7 tail). |
| `description_proposed` | TEXT nullable | Migration 014. D11 decision trail: the proposed description as it stood before the D7 gate, so the D15 audit-review page can show before/after even after commit. |
| `created_at` / `updated_at` | TEXT | ISO timestamps |

**Natural key:** `(project, type, name_fold)` (migration 013; was `(project, type, name)` back when `name` held the lowercased form). `name` carries source case; all matching goes via `name_fold`, so a case-sensitive compare is impossible at the data layer. `canonical_id` is a secondary UNIQUE and is the join key for every `_versions` table via `entity_id`.

**Source-state semantics:**
- `source_backed` -- present in the current extraction pass.
- `source_retired` -- was seen in an older version, dropped from head. Kept for historical queries.
- `doc_only` -- help-text entry with no source-code counterpart (help JSON documents a feature the extractor cannot find).
- `dynamically_registered` -- registered at runtime rather than compile-time; the extractor can see the registration site but not a static declaration.

**Populated by:** every per-type loader adapter (`load-cvars.ts`, etc.) calls `upsertEntity` before writing its `*_versions` row.

**Consumed by:** every downstream query. Every `*_versions` row FK-references `entity_id`; every `source_overrides` row too.

**CHECK widening history:** The `type` CHECK started at 4 values in v1 and has been widened four times (v1->v2, v2->v3, v4->v5, v11->v12) via full table-rebuild migrations. See `ENTITIES_V2_MIGRATION_SQL`, `ENTITIES_V3_MIGRATION_SQL`, `ENTITIES_V5_MIGRATION_SQL`, `ENTITIES_V12_MIGRATION_SQL` in `schema.ts`. Fresh DBs stamp the widest CHECK directly on the v1 CREATE -- the comment at the top of `SCHEMA_V1_SQL` documents why that is deliberate.

**Description-provenance family:** `description` + `description_origin` (migration 012) and the seven migration-014 columns (`description_anchor_version`, `description_rereview`, `description_provenance`, `description_verdict`, `description_confidence`, `description_reasoning`, `description_proposed`) together form one coherent description-provenance/staleness/decision-trail family. `description` is the owned Layer 1 text; `description_origin` records where it came from; migration 014 adds the D2/D4 staleness anchor + re-review flag, the D11 retained multi-source provenance (JSONB), and the D5-D8 decision trail (verdict / confidence / reasoning / proposed). The KTX/MVDSV describe-fill arc (spec `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`) is the first writer of the 014 columns; FTE/QWCL are later arcs on the same pattern.

The `description_origin` vocabulary:

- **Column-wide superset:** `help_json` / `source_inline` / `inherited` / `synthesized` / NULL. (`shipped_doc` RETIRED 2026-06-04 -- see below.)
  - `help_json` -- from external dev-curated metadata (help-JSON for ezQuake/FTE; asset YAML for asset_category). ezQuake/FTE-only -- KTX/MVDSV have no help-JSON track, which is exactly the gap the describe-fill arc closes.
  - `source_inline` -- from source code (trailing-comment harvest, struct-init fields, templated derivers).
  - `inherited` -- borrowed from another entity's description. Reserved-unused: the QWCL cross-engine borrow arc's slot, not yet written by any loader.
  - `synthesized` -- LLM/operator prose authored from code behavior, not present in source or external curation. Carries `description_anchor_version` (D2/D4).
  - `shipped_doc` -- **RETIRED 2026-06-04 (D11 amendment).** Was "mechanically lifted from a shipped human-authored artifact." The arc's model is always-synthesize: a shipped-config comment is reference evidence we source-verify, never a served origin (0 rows ever final -- Phase-2 lifts were recast to `synthesized`). The lifted text is retained in `description_provenance` (raw_comment), which is the evidence layer, not an origin.
  - `NULL` -- `description` IS NULL.
- **KTX/MVDSV configurable buckets this arc fills** are restricted to `source_inline` / `synthesized` (D2/D11; `shipped_doc` retired 2026-06-04). `help_json` is ezQuake/FTE-only; `inherited` is the reserved-unused QWCL slot.
- **Enforcement:** the vocabulary is enforced by the F1 quality-grid probe `F1.describe_fill.origin_vocabulary`, NOT a CHECK constraint. Migration 012 deliberately left `description_origin` an unconstrained TEXT so new origins can be added without a heavyweight CHECK-rebuild migration; per C5 the honesty guarantee is made real by the probe (it fails loudly at the phase-boundary gate on any out-of-vocabulary tag), not by the schema. The probe's column-wide guard permits the four-set `{help_json, source_inline, inherited, synthesized}` (NULL only where `description` IS NULL); its arc-scoped guard restricts the KTX/MVDSV configurable buckets to the two this arc writes (`source_inline` / `synthesized`).

**Embedding freshness (entities + concept_chunks):** Two booleans named `*_stale` exist but play **opposite** roles -- a TRUE flag does **not** mean the vector is out of date, so do not query the boolean to decide what needs re-embedding. The embedding columns themselves (`description_embedding vector(1024)`, `description_embedding_sha256`, `description_embedding_stale`) were added by migration 003 (`layer1_entities_search`); the hnsw index is `idx_entities_description_embedding`.

- **`entities`:** the authoritative re-embed signal is the content hash `description_embedding_sha256`. `embed-entities.ts` re-embeds a row iff `sha256(description)` differs from the stored hash, and **ignores** `description_embedding_stale`. Many write paths (`re-derive`, describe-fill synthesize/format-unify, ktx recasts, help-json synthesis) set the boolean TRUE whenever they touch a row, even when the resulting text is byte-identical, so it over-reports heavily (8092 flagged vs 1026 actually stale-by-hash, measured 2026-06-05). Nothing reads it as a decision (`serve/` never reads it); it is observability/legacy and a safe drop candidate.
- **`concept_chunks`:** here the flag **is** functional. `embed-chunks.ts` re-embeds `WHERE embedding IS NULL OR embedding_stale = TRUE`. The loader's primary path is DELETE+INSERTing chunks when `concepts.body_sha256` changes (so a changed chunk arrives with a NULL embedding); `embedding_stale = TRUE` is the secondary Voyage-failure retry signal. Cleared FALSE on successful embed.

Both columns carry a `COMMENT ON COLUMN` recording this (migration 019), so `\d+` / information_schema state it at the point a reader meets the column.

---

## Per-type snapshot tables

One table per entity type. Each carries (entity_id, version) as PK and holds the per-version state. These are the "what did this look like in 3.6.6?" tables.

All ten share the same shape skeleton:
- PK `(entity_id, version)`
- `extracted_at TEXT NOT NULL`
- At least one source-location trio: `source_file`, `source_line`, (sometimes `source_column`)
- `raw_ast_hash TEXT` -- fingerprint of the AST subtree used for change detection

What differs is the type-specific payload columns.

### `cvar_versions`

Extracted from `var_t`/`cvar_t` struct initializers. Schema v1.

Type-specific columns: `help_desc`, `help_remarks`, `help_values`, `help_group_id`, `help_type`, `default_value`, `flags_raw`, `flag_names`, `on_change`, `min_bound`, `max_bound`, `storage_class`, `group_name_in_source`, `trailing_comment`, `server_only`, `source_root` (nullable, schema v11 -- see `source_root` reference below), `track_a_reachability` (JSONB nullable, migration 015 -- v18 runtime fidelity, see below), `category_inferred` (TEXT nullable, migration 016 -- v19 LLM-derived category, see below), `category_inferred_origin` (TEXT nullable, migration 016 -- v19 provenance sibling, see below).

**Populated by:** `load-cvars.ts` <- `packages/qw-config/scripts/extract-ezquake-cvars-clang.py` -> `ezquake-variables-ast.json`.

**Count at ezQuake head:** 2901.

**Help sources:** `help_cvars.json` (from ezQuake), merged with AST-discovered `Cvar_RegisterVariable` / `Cvar_Register` sites by name. `help_*` columns come from JSON; `source_*` / `default_value` / `flags_*` come from AST.

Index: `idx_cvar_versions_source ON (source_file, source_line)`.

### `command_versions`

Extracted from `Cmd_AddCommand` registration sites. Schema v1.

Type-specific: `help_desc`, `help_remarks`, `help_group_id`, `handler_fn`, `registration_file`, `source_root` (nullable, schema v11 -- see `source_root` reference below), `track_a_reachability` (JSONB nullable, migration 015 -- v18 runtime fidelity, see below), `track_b_hud_recovery` (JSONB nullable, migration 015 -- v18 runtime fidelity, see below), `category_inferred` (TEXT nullable, migration 016 -- v19 LLM-derived category, see below), `category_inferred_origin` (TEXT nullable, migration 016 -- v19 provenance sibling, see below), `legacy_alias_of` (TEXT nullable, migration 017 -- canonical command name this entity aliases via `Cmd_AddLegacyCommand`; NULL for normal `Cmd_AddCommand` registrations).

**Populated by:** `load-commands.ts` <- `extract-ezquake-commands-clang.py` -> `ezquake-commands-ast.json`.

**Count at ezQuake head:** 522. (One case-duplicate `loadFragfile` / `loadfragfile` collapses in canonical lowercase -- QW command names are case-insensitive.)

### `macro_versions`

ezQuake `$macro` registrations via `Cmd_AddMacro` / `Cmd_AddMacroEx`. Schema v1.

Type-specific: `help_desc`, `macro_type`, `teamplay_restricted`, `related_cvars_json`, `handler_fn`, `registration_file`, `source_root` (nullable, schema v11 -- see `source_root` reference below).

**Populated by:** `load-macros.ts` <- `extract-ezquake-macros-clang.py` -> `ezquake-macros-ast.json`.

**Count at ezQuake head:** 68. 2 declared-but-never-wired ones (`mp3_volume`, `mp3info` -- gated on a disabled MP3 build flag) are recorded with source_state reflecting that gap.

### `cmdline_param_versions`

Command-line arguments consumed via `COM_CheckParm`. Schema v1.

Type-specific: `help_desc`, `help_remarks`, `arguments`, `flags_json`, `systems_json`.

**Populated by:** `load-cmdline-params.ts` <- `extract-ezquake-cmdline-clang.py` -> `ezquake-cmdline-params-ast.json`.

**Count at ezQuake head:** 71. Data-quality surfaces: 8 declared-but-never-consulted params and 1 source-only undeclared (`-noerrormsgbox`).

### `keyname_versions`

Key-code / key-name table (for bind validation and display). Schema v2.

Type-specific: `key_code`, `key_code_ident`, `build_variant` (e.g., `apple` for COMMAND / PARA / F13-F15 / KP_EQUAL -- only in `-D__APPLE__` builds).

**Populated by:** `load-keynames.ts` <- `extract-ezquake-keynames-clang.py` -> `ezquake-keynames-ast.json`.

**Count at ezQuake head:** 148. Aliases (SCROLLLOCK / SCROLLOCK / SCRLCK all mapping to 130) preserved as separate rows with the same `key_code`.

**Spec:** Phase 2c.5 plan, `docs/superpowers/plans/2026-04-19-qw-knowledge-phase-2c5.md`.

### `hud_element_versions`

HUD_Register call sites -- every named HUD element. Schema v2.

Type-specific: `help_desc`, `hud_alias`, `flags_raw`, `min_state_raw`, `draw_order_raw`, `draw_fn`, `enclosing_function`, `owned_cvars_json` (JSON array of the `hud_*` cvars synthesized for this element).

**Populated by:** `load-hud-elements.ts` <- `extract-ezquake-hud-elements-clang.py` -> `ezquake-hud-elements-ast.json`.

**Count at ezQuake head:** 83. Between them they own 1404 synthesized `hud_*` cvars via `owned_cvars_json`.

**Spec:** Phase 2c.5 plan (same as keyname).

### `ruleset_versions`

Policy bundles -- the full `rulesetDef_t` struct for each ruleset (default, smackdown, qcon, thunderdome, mtfl, smackdrive). Schema v2.

Type-specific: `enum_ident`, `loader_fn`, `maxfps`, plus 10 `restrict_*` bit flags (`restrict_triggers`, `restrict_packet`, `restrict_particles`, `restrict_play`, `restrict_logging`, `restrict_rollangle`, `restrict_ipc`, `restrict_exec`, `restrict_setcalc`, `restrict_seteval`, `restrict_setex`), `locked_cvars_json` (list of `{cvar_ident, value}` pairs that the ruleset pins).

**Populated by:** `load-rulesets.ts` <- `extract-ezquake-rulesets-clang.py` -> `ezquake-rulesets-ast.json`.

**Count at ezQuake head:** 6. Per-field blame for ruleset struct fields is what drove the v6 `source_overrides` work -- the extractor emits per-field `field_source_lines` and the loader writes `source_overrides` rows so diff blame attributes each field to its struct-declaration commit, not the generic loader site.

**Spec:** Phase 2c.5 plan.

### `token_primitive_versions`

Single-character `$x` / `^x` tokens (the primitive building blocks of teamsay macros and name/chat color codes). Schema v2.

Type-specific: `form` (e.g., `$x`, `^x`), `suffix_char` (the character after `$`/`^`), `byte_value` (the conchars grid index), `category` (`led` / `glyph` / etc.), `case_style`.

**Populated by:** `load-token-primitives.ts` <- `extract-ezquake-token-primitives-clang.py` -> `ezquake-token-primitives-ast.json`.

**Count at ezQuake head:** 33. Case-sensitive canonical IDs (only type where this applies -- see `canonicalIdFor` in `natural-keys.ts`).

**Spec:** Phase 2c.5 plan.

### `asset_category_versions`

Content categories for the engine's filesystem-consumption model (skin / crosshair / skybox / map / etc.). Each `asset_*` relation table FK-references `category_id` pointing into `entities.canonical_id` of a `type='asset_category'` entity. Schema v3.

Type-specific: `display_name`, `description`, `notes`.

**Populated by:** `load-asset-categories.ts` <- hand-authored seed YAML at `packages/qw-config/seeds/ezquake-asset-taxonomy.yaml`, merged with AST passes by `build-asset-bundle.ts` -> `ezquake-asset-bundle.json`.

**Count at ezQuake head:** 17.

**Spec:** `docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md`.

### `flag_bit_versions`

Individual bits inside engine bitmask families -- `CVAR_*` (cvar flags), `FPD_*` (FPD fragility flags), `STAT_*` (stat-index constants). Schema v5.

Type-specific: `bitmask_family` (one of `cvar_flag` / `fpd_flag` / `stat_const`), `value_raw` (e.g., `(1<<0)` or `0`), `value_numeric` (integer).

**Populated by:** `load-flag-bits.ts` <- `extract-ezquake-flag-bits-clang.py` -> `ezquake-flag-bits-ast.json`. Families configurable via `FAMILY_TARGETS` in the extractor -- extensible (PEXT / FTE_PEXT will pick up naturally in FTE).

**Count at ezQuake head:** 50 (26 `cvar_flag` + 7 `fpd_flag` + 17 `stat_const`).

Index: `idx_flag_bit_versions_family ON (bitmask_family)`.

**Spec:** `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v5-flag-bits-and-relation-changes.md`.

### `cvar_alias_versions`

Cross-engine and intra-engine cvar aliases. Schema v12. One row per (entity_id, version); LHS is the alias name registered in the host project, RHS is the actual entity it redirects to.

Type-specific: `target_project` (CHECK), `target_kind` (CHECK `cvar` / `command` / `macro` / `serverinfo` / `userinfo`), `target_name`, `target_canonical_id` (nullable FK to `entities.canonical_id`; NULL when target isn't loaded yet or kind isn't an entity type), `mimics_project` (nullable; the namespace this alias bridges from -- `ezquake` for ezscript, NULL for internal-engine aliases), `value_transform` (CHECK `identity` / `bool_flip` / `scale` / `enum_remap` / `needs_review`), `value_transform_params_json` (free-form JSON for parametric transforms), `default_drift_status` (CHECK `same` / `differ_safe` / `differ_dangerous` / `unknown`), `semantic_confidence` (CHECK `high` / `medium` / `low` / `needs_review`), `verified_target_version`, `verified_mimics_version`, `freshness_state` (CHECK `alive` / `target_gone` / `mimics_lhs_gone` / `both_gone` / `unknown`), `source_root` (nullable, mirrors v11 cvar_versions semantics).

**Populated by:** `load-cvar-aliases.ts` <- `_handler_ezscript.py` (FTE plugin) -> `fte-aliases-ast.json`. The handler joins drift / freshness fields from a checked-in TSV seed at `scripts/extractors/fte/seeds/ezscript-drift-369-vs-build-6698.tsv`. Future broad-scope alias research lands in the same table tagged with its own `source_root`.

**Count at FTE build-6698:** 38 (36 cvar redirects + 2 serverinfo redirects, all `mimics_project='ezquake'`, `source_root='fte:plugin:ezscript'`).

**Existence semantics:** `freshness_state` owns existence, not `default_drift_status`. When `freshness_state IN ('target_gone', 'both_gone')`, drift is meaningless and `default_drift_status` is `unknown`.

**Loader validation:** `load-cvar-aliases.ts` calls `parseVersionSpec` from `@qw/version-resolution` against `verified_target_version` and `verified_mimics_version` at upsert time; non-canonical strings (e.g., underscore-separated typos) are rejected before insert.

Indexes: `idx_cvar_alias_versions_target ON (target_project, target_kind, target_name)`, `idx_cvar_alias_versions_canonical ON (target_canonical_id)`.

**Spec:** `docs/superpowers/specs/2026-04-26-cross-engine-alias-schema-design.md`.

---

## Relation tables

These are not per-entity snapshots -- they are cross-row relations that exist per-(project, version) but are not keyed through `entities`. Four of them describe the asset-consumption model; one captures GitHub release narrative.

### `asset_extensions`

"This file extension belongs to this category in this project/version." Schema v3; v7 added per-row hygiene audit.

Columns: `project`, `version`, `extension`, `path_hint` (nullable -- path fragment that refines ambiguous extensions like `.tga` -> skin vs texture vs skybox), `category_id` (FK to `entities.canonical_id`), `notes`, `verification_status` (CHECK `ast_verified` / `seed_only_with_ast_support` / `seed_only_no_ast_support` / `orphaned_historical`, default `ast_verified`, schema v7), `verification_reason` (free-text justification for any non-default status, schema v7), `raw_ast_hash`, `extracted_at`.

**Natural key:** `(project, version, extension, path_hint)`.

**Count at ezQuake head:** 270 rows total -- 268 `ast_verified`, 1 `orphaned_historical` (`.kmap` -- loader removed in commit `46b5046`, files persist via nQuake bundle), 1 `seed_only_no_ast_support` (`.dll` -- intentional FTE cross-engine signal). Per-row stamps live in the seed YAML under optional `verification_status` / `verification_reason` keys; rebuild bundle + reload to populate.

Indexes: `idx_asset_ext_cat ON (category_id)`, `idx_asset_ext_verif ON (verification_status)`.

### `asset_path_rules`

Filesystem-discipline rules the engine enforces: search-path order, archive precedence, cmdline overrides, gamedir behavior. Schema v3.

Columns: `rule_kind` (CHECK `search_path` / `archive_precedence` / `cmdline_override` / `gamedir_behavior`), `ordinal` (precedence order within kind), `canonical_id` (rule slug), `description`, `source_ref`, `source_verified` (0/1 -- whether the rule was traced to a real `fs.c` site).

**Natural key:** `(project, version, canonical_id)`.

**Count at ezQuake head:** 14 -- 2 search_path + 5 archive_precedence + 2 gamedir_behavior + 5 cmdline_override. All `source_verified=1`.

### `asset_cvar_bindings`

"This cvar, when set, causes the engine to load assets of this category from this path pattern." Schema v3.

Columns: `cvar_canonical_id` (FK), `category_id` (FK), `path_pattern` (e.g., `skins/{value}.pcx`), `load_trigger` (CHECK `startup` / `on_demand` / `on_connect` / `on_map_load` / `unknown`), `confidence` (CHECK `seed` / `auto` / `auto_confirms_seed` / `auto_orphan`), `source_ref`.

**Natural key:** `(project, version, cvar_canonical_id, category_id, path_pattern)`.

**Count at ezQuake head:** 26 -- 23 seed entries + 1 `auto_confirms_seed` + 2 `auto_orphan`s. Seed is hand-authored at `packages/qw-config/seeds/ezquake-asset-cvar-bindings.yaml`; the AST pass corroborates where visible (most ezQuake flows cross statement boundaries so the single-compound-scope auto-pass only catches 1).

Indexes: `idx_asset_cvar_bind_cvar ON (cvar_canonical_id)`, `idx_asset_cvar_bind_cat ON (category_id)`.

### `asset_loader_sites`

Every concrete callsite in engine C that loads an asset -- function name, location, classifier. Schema v3; v8 widened the confidence CHECK.

Columns: `canonical_id`, `function_name`, `source_file`, `source_line`, `enclosing_function`, `reads_category_id` (nullable FK), `load_trigger`, `path_source` (CHECK `literal` / `cvar` / `computed` / `unknown`), `path_literal` (if literal), `path_cvar_id` (FK if cvar-driven), `confidence` (CHECK `certain` / `heuristic` / `intentionally_generic` / `unclassified`, schema v8), `dev_only` (0/1).

**Natural key:** `(project, version, canonical_id)` where `canonical_id = <function>_<basename>_<ordinal-in-function>` (ordinal-based since Batch 3 -- was line-embedded before, which produced spurious diff pairs on unrelated edits above).

**Count at ezQuake head:** 128 -- 24 certain + 80 heuristic + 24 intentionally_generic + 0 unclassified. The `intentionally_generic` bucket (schema v8, 2026-04-22) covers calls to the four FS-layer primitives (`FS_OpenVFS` / `FS_LoadFile` / `FS_LoadHunkFile` / `FS_WriteFile`) with `path_source='unknown'` -- these are the FS layer itself rather than asset loaders. Zero `unclassified` at head means a future tag-pair surfacing one would be a real novelty, not FS-internals noise.

Indexes: `idx_asset_loader_category`, `idx_asset_loader_cvar`, `idx_asset_loader_fn`.

### `release_notes`

One row per parsed bullet from a tag's GitHub release body. Captures version-level narrative that entity diffs can't see (code-only fixes, bitmask-flag additions, high-level feature notes). Schema v4.

Columns: `section` (e.g., `new features`, `fixes`), `ordinal` (position within section), `body_md` (bullet's markdown), `referenced_entity_ids_json` (JSON array of canonical_ids mentioned), `commit_urls_json`, `pr_numbers_json`, `author_handles_json`, `raw_body_hash`.

**Natural key:** `(project, version, section, ordinal)`.

**Populated by:** `load-release-notes.ts` <- `release-notes` CLI subcommand, which fetches the release body from the GitHub API.

Index: `idx_release_notes_version ON (project, version)`.

**Spec:** n/a -- added directly as schema v4 during Phase 2f stress-test prep. See HANDOVER "Knowledge schema spec behind code (v2-v4 undocumented)".

---

## Change tracking

Three append-only tables that capture what changed when. `change_events` is the entity-row diff stream; `relation_changes` is the asset-relation-row diff stream; `source_overrides` is the blame index that teaches both where to attribute a field.

### `change_events`

Entity-scoped, field-level diff events. One row per (entity, from->to version, field). Schema v1.

Columns: `entity_id`, `from_version` (nullable for `created`), `to_version`, `change_kind` (CHECK `created` / `modified` / `deleted`), `field_name` (empty string for created/deleted -- holds the struct-field key for `modified`), `old_value`, `new_value`, `commit_sha`, `commit_message_excerpt`, `pr_number`, `pr_title`, `pr_body_excerpt`, `linked_issues_json`, `enrichment_source` (CHECK `git` / `github_api`).

**Natural key:** `(entity_id, to_version, field_name, change_kind)`.

**Populated by:** `diff-versions.ts` -- walks every type via `TYPE_DIFF_CONFIGS`, compares the from-version and to-version `*_versions` rows for each entity, emits one row per field-level divergence. Subsequent `enrich` pass hydrates `pr_*` columns from the GitHub API.

**Consumed by:** timeline queries ("when did cl_bob's default last change?"), the Oracle Bot's "what changed in 3.6.9?" path, MCP tools.

Indexes: `idx_change_events_to_version`, `idx_change_events_entity_field`, `idx_change_events_commit`.

### `relation_changes`

Same idea as `change_events` but for the four `asset_*` relation tables (rows without an `entity_id`). Keyed by relation table name + deterministic row-key JSON. Schema v5.

Columns: `relation_table` (CHECK the four asset_* tables), `project`, `from_version`, `to_version`, `change_kind`, `row_key_json` (canonical JSON of the natural-key columns -- stable across re-extraction), `field_name`, `old_value`, `new_value`, `commit_sha`, `commit_message_excerpt`.

**Natural key:** `(relation_table, project, to_version, row_key_json, field_name, change_kind)`.

**Populated by:** `diff-versions.ts` -- relation-diff code path, separately from the entity-diff path.

**Known limitation:** blame attribution is currently `commit_sha='UNKNOWN'` for all rows -- relation rows don't always carry `source_file` / `source_line`, so there is nowhere to `git blame`. Proper blame is deferred; when a relation blame strategy exists, it will reuse the `source_overrides` table.

Indexes: `idx_relation_changes_to_version`, `idx_relation_changes_table`.

**Spec:** `2026-04-21-qw-knowledge-schema-v5-flag-bits-and-relation-changes.md`.

### `source_overrides`

Per-(entity, version, field) blame index. The answer to "where does the *value* of this field actually come from?" when the answer isn't "the entity's primary `source_file:source_line`." Schema v6.

Columns: `entity_id`, `version`, `field_name`, `source_file`, `source_line`, `source_column`, `override_kind` (CHECK `struct_field_decl` / `call_site` / `header_declaration`), `extracted_at`.

**Natural key:** `(entity_id, version, field_name)`.

**Why this exists:** Most fields blame correctly to the entity's own `source_file:source_line`. But some don't:
- **Ruleset `restrict_*` / `maxfps` / `locked_cvars_json`** -- declared in `rulesetDef_t` struct fields at a single site. The "semantic author" of a field change is the commit that edited the struct layout, not the commit that last touched the loader-site where the ruleset entity is registered. Extractor emits `struct_field_decl` overrides; loader writes them.
- **HUD element `flags_raw` / `min_state_raw` / `draw_order_raw`** -- set via positional args in the `HUD_Register(...)` header call. Extractor emits `header_declaration` overrides keyed per-field.
- **Cvar `default_value` set via `Cvar_SetDefault` / `Cvar_ForceSet` / `Cvar_LockDefault`** -- re-set at a call site rather than in the struct initializer. Extractor emits `call_site` overrides (best-effort regex anchored on `&cvar_name`; macro-expanded forms fall back to entity anchor).

**Populated by:** per-type loader adapters (`load-rulesets.ts`, `load-hud-elements.ts`, `load-cvars.ts`) consume extractor payloads (`field_source_lines` / `default_overrides`) and call `upsertSourceOverride`. Every `load-version` call populates `source_overrides` as a side effect for the tags that know about them.

**Consumed by:** `diff-versions.ts` preloads all overrides for the from/to versions into a Map at diff start, then for every `change_events` row with a matching override, replaces the entity's primary source anchor with the field-level one. That Map is the zero-SQL-per-event hot-loop optimization from commit `d949108`.

**Observed population at ezQuake head + 4 tags:** 2478 `header_declaration` + 341 `struct_field_decl` + 5 `call_site` = 2824 rows. Most rows are HUD_Register headers because ezQuake has 83 HUD elements x many fields.

Index: `idx_source_overrides_entity ON (entity_id, version)`.

**Spec:** `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v6-source-overrides.md`.

---

## Audit

### `source_state_transitions`

Append-only log of every `source_state` transition on every entity. The "receipt" layer. Schema v1.

Columns: `entity_id`, `from_state`, `to_state`, `reason` (CHECK `initial_observation` / `removed_from_head` / `re_added` / `backfill_match` / `source_retired_at_version` / `manual_update`), `version_context` (nullable -- which version triggered the transition), `extractor_run_id` (ULID so you can group a single extraction run), `created_at`.

**Populated by:** every `upsertEntity` call that transitions state emits a row. `initial_observation` fires on first insert; `removed_from_head` fires from two paths -- (a) the cross-version diff in `diff-versions.ts` when an entity present in `fromVersion` is absent in `toVersion`, and (b) the entity-state retreat block in `load-version.ts` (added 2026-05-15) when post-prune entity-row reconciliation moves an entity to `source_retired` because its latest version-row is below `HEAD_ORDINAL`; `re_added` fires when `diff-versions.ts` sees a previously `source_retired` entity come back at `toVersion`; `backfill_match` fires from two paths -- (a) the original single-state-flip path where an entity's entity-level state goes from `doc_only` to `source_backed` because a later load surfaced AST evidence, and (b) the per-entity transition scan in `load-version.ts` (added 2026-04-25 alongside the symmetric retirement scan) which detects the same null->non-null citation flip going forward in version-ordinal space even when the entity-level state is already `source_backed` -- e.g. `cl_voip_*` family help-JSON-listed at v3.0.1 but only source-defined from 3.1 onward; `source_retired_at_version` fires from the same scan whenever per-version citation flips from non-null to null going forward (the entity was retired in source between two loaded tags; `to_state='doc_only'` at the HEAD row, `to_state='source_retired'` at earlier rows per the 2026-05-15 fix); `manual_update` is for operator annotations. The transition scan is idempotent on `(entity_id, reason, version_context)`.

**Consumed by:** read by the F2.source_backed_missing_citation probe in `quality-grid.ts` to filter out NULL-citation rows that are explained by a transition (retirement at-or-before, or backfill_match strictly-after). Walk the rows for an entity ordered by `version_context.ordinal` and you reconstruct that entity's full source-presence biography. Otherwise rarely queried directly; it exists so that `source_state` on `entities` is not a trust-me field.

Indexes: `idx_sst_entity`, `idx_sst_run`.

### `schema_meta`

Key/value scratchpad for loader state. Schema v1.

Expected keys:
- `schema_version` -- current integer (matches `SCHEMA_VERSION` in `schema.ts`)
- `extractor_version` -- last-run extractor version string (e.g., `clang-ezquake-cvars@1.0.0`)
- `last_extraction_run_at` -- ISO timestamp
- `last_enrichment_run_at` -- ISO timestamp
- `<project>:source_repo_commit` -- last-seen commit SHA of the upstream repo
- `<project>:source_repo_tag` -- last-seen tag

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

Drop-guard compares `entityCount` (total `*_versions` rows expected) not `_versions` row count. This is self-consistent: help-only entries DO become rows in `_versions` (as `doc_only`). Catalog Tier-4 item #10 was rejected after re-examination -- not a bug.

### Fresh DB vs migrated DB

On a fresh DB, `applySchema` stamps `SCHEMA_VERSION = 11` directly and runs *all* `SCHEMA_V*_ADDITIONS_SQL` blocks (idempotent `CREATE IF NOT EXISTS`). The v1 `entities` CHECK already lists the full v5 type set, the v1 `source_state_transitions.reason` CHECK already lists the full v9 reason set, the v1 `project` CHECK already lists the full v10 project set including `qwcl` and `fte`, and the v1 `cvar_versions` / `command_versions` / `macro_versions` CREATE TABLE definitions already include `source_root TEXT` (v11) -- this is the same "pre-widen the base CREATE TABLE to skip migration on fresh DBs" pattern used for all prior additive columns. On a migrated DB, `applySchema` walks the migration chain v1->v2->...->v11 one step at a time. Both paths converge on the same shape.

### v10: project CHECK widening for QWCL

2026-04-25 (Arc 1 of QWCL extraction). Adds `qwcl` to the `project` CHECK on every project-keyed table: `versions`, `entities`, `asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`, `release_notes`, `relation_changes` -- eight tables rebuilt via the standard CREATE-NEW + INSERT-SELECT + DROP + RENAME pattern. `foreign_keys = OFF` outside the txn so the entities-table drop is allowed (entities is FK-targeted by every per-type version table plus `source_state_transitions`, `change_events`, `source_overrides`). `migrateV9ToV10` in `schema.ts`. Verified on the live ezQuake DB: 4041 entities + 40k+ per-version rows preserved, no FK violations.

### v11: `source_root` column on cvar/command/macro version tables

2026-04-26 (Task 2 of FTE Layer 1 extraction). Adds nullable `source_root TEXT` to `cvar_versions`, `command_versions`, `macro_versions`. Pure-additive `ALTER TABLE ADD COLUMN` -- no table rebuild, no CHECK constraint, no DEFAULT. `migrateV10ToV11` in `schema.ts`.

### `source_root` (v11+)

Optional column on `cvar_versions`, `command_versions`, `macro_versions`. Identifies which source root the entity row came from when the project has multiple sources (e.g., FTE engine + plugins).

Values:
- `NULL` -- backwards compat for pre-v11 rows; semantically equivalent to `"engine"`.
- `"engine"` -- entity was registered in the project's main engine source tree.
- `"plugin:<name>"` -- entity was registered inside a named plugin under the project's plugin directory (e.g., `"plugin:ezhud"` for FTE's ezQuake-HUD plugin).

`cmdline_param_versions`, `keyname_versions`, `hud_element_versions`, `ruleset_versions`, `token_primitive_versions`, `asset_category_versions`, and `flag_bit_versions` do NOT carry this field -- they are engine-only by definition (plugins do not register cmdline params, key bindings, HUD elements, or rulesets).

---

## Map knowledge layer

### `maps`

The `qw` namespace -- facts about QuakeWorld maps as game content (not engine entities). One row per canonical map name. Schema v13. Distinct from the entity/version model -- maps don't change across engine versions.

| Column | Type | Notes |
|---|---|---|
| `canonical_name` | TEXT PK | lowercased BSP basename (`dm3`, `aerowalk`) |
| `file_name` | TEXT | full filename (`dm3.bsp`) |
| `display_name` | TEXT NULL | from `worldspawn.message`, with `\n` literals collapsed to spaces |
| `author` | TEXT NULL | heuristic from message + manual seed override; NULL = unknown |
| `bsp_version` | TEXT | `V29` or `BSP2` |
| `bsp_size_bytes` | INTEGER | |
| `bsp_sha256` | TEXT | full hex |
| `worldspawn_json` | TEXT | full worldspawn property dump (classname stripped) |
| `entity_count` | INTEGER | total entity count incl. worldspawn |
| `class_counts_json` | TEXT | `{classname: count}` for every classname in the map |
| `item_summary_json` | TEXT | normalized 20-key dict, all-lowercase keys (ga/ra/ya | mh/h25/h15/bio | quad/pent/ring | cells/shells/spikes/rockets | gl/lg/ng/rl/sng/ssg). Joined to the gameplay catalog via each item row's map_summary_key prop -- see "Gameplay conventions". |
| `spawn_summary_json` | TEXT | `{dm,team1,team2,coop,start,intermission}` |
| `features_json` | TEXT | `{teleporters,has_water,has_lava,has_slime}` |
| `wads_referenced_json` | TEXT | parsed WAD basenames |
| `inferred_gamemodes_json` | TEXT | one or more of `1on1`/`2on2`/`4on4`/`ffa` |
| `popularity_total` | INTEGER NULL | from stats.quakeworld.nu |
| `popularity_by_mode_json` | TEXT NULL | `{1on1, 2on2, 4on4, ffa}` |
| `popularity_rank` | INTEGER NULL | 1 = most popular |
| `notes` | TEXT NULL | seed-curated free-form |
| `source_bsp_url` | TEXT | where extracted from |
| `extracted_at` | TEXT | ISO timestamp |

**Natural key:** `canonical_name`. Re-running the loader is idempotent (INSERT ... ON CONFLICT DO UPDATE).

**Populated by:** `load-maps.ts` <- `apps/qw-oracle/scripts/extractors/qw/extract.py` -> `qw-maps-ast.json`. Inputs: BSP files in `data/bsp-cache/` (downloaded from `https://maps.quakeworld.nu/base/` via `download_maps.py`) plus `data/pak-cache/` (extracted from operator's pak0/pak1 via `pak_extract.py`); popularity from `seeds/qw-stats-cache.json` (refreshed by `fetch_stats.py`); manual overrides from `seeds/qw-map-seed.yaml`.

**Consumed by:** MCP tools `lookup_map` + `search_maps`; slipgate via `qw-maps.json` snapshot file emitted by `build-snapshot.ts`.

**Project namespace `qw`:** New as of v13. Distinct from engine project codes (`ezquake`/`fte`/`mvdsv`/`ktx`/`qwcl`). Means "the game itself" -- content that lives outside any engine version arc. The `maps` table has no `project` column; the `qw` namespace appears only in the `Project` TS union for the build-snapshot dispatcher.

**Spec:** `docs/superpowers/specs/2026-04-26-qw-oracle-map-knowledge-design.md`. Plan: `docs/superpowers/plans/2026-04-26-qw-oracle-map-knowledge.md`.

Indexes: `idx_maps_popularity_rank ON (popularity_rank)`, `idx_maps_author ON (author)`.

---

## v14 (2026-04-27): game-mechanics tables (id1 baseline)

Adds three flat tables (no `qw_` prefix to match the existing `maps` precedent). Outside the entities/per-version model.

- **`gameplay_sources`** - registry of gameplay sources (`id1` baseline, `ktx` overrides in arc 2, future mods). Stable string ID, display name, source-tree root, free-form notes.

- **`gameplay_entity_defs`** - polymorphic table for game entities. `kind in (item, weapon, projectile, monster)` (the `monster` value added by the KTX onboarding arc's gameplay-kinds migration; KTX `bloodfest_monster_array[]` carries 13 rows under that kind). Indexable common columns (damage, splash_damage, splash_radius, refire_seconds, respawn_seconds, pickup_amount, max_carry, duration_seconds, classname). `props_json` carries kind-specific fields. `source_ref` is the file:line citation.

- **`gameplay_mechanics`** - polymorphic table for game rules. `kind in (constant, env_hazard, player_stat, powerup_behavior, armor_model, death_rule, spawn_rule, dm_mode_rule, game_mode, mode_default, election_type, score_system, drop_item, loc_macro, teamplay_message)` (the seven values from `game_mode` onward added by the KTX onboarding arc; `game_mode` carries 27 catalog rows + `mode_default` carries 317 per-line overlays + `election_type` 5 + `score_system` 3 + `drop_item` 31 + `loc_macro` 15 + `teamplay_message` 21). Indexable common columns (value_numeric, value_text). Same source_ref discipline. `ruleset_gate_json` is load-bearing for KTX overlays per the arc's D8 single-key gate convention -- e.g. `{"mode":"bloodfest"}` for monster rows, `{"mode":"<token>"}` for per-mode overlays.

Both polymorphic tables share `ruleset_gate_json TEXT NOT NULL DEFAULT '{}'`. The default empty object is used by id1 baseline rows and by KTX rows that apply unconditionally; KTX overrides with mode/yawnmode/dmm gates serialise as JSON like `{"yawn":true,"dm":3}` and join into the same row identity. The `NOT NULL DEFAULT` is load-bearing: SQLite treats NULL columns in unique indexes as distinct, which would defeat upsert idempotency. By keeping the column always non-NULL, `ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE` works as expected for re-runs.

Migration is pure-additive (no rebuilds, no FK toggling). Function: `migrateV13ToV14`. Pattern: new `SCHEMA_V14_ADDITIONS_SQL` constant + appended `db.exec(...)` in `applySchema`, mirroring `SCHEMA_V13_ADDITIONS_SQL`.

Engine-tunable cvars (`sv_maxspeed`, `sv_friction`, `sv_accelerate`, etc.) are deliberately NOT in `gameplay_mechanics`. They live in the `cvars` table (engine-config track) once each engine's extraction tags surface them. Only QC-defined gameplay constants (e.g. `sv_gravity` set in worldspawn QC at world.qc:182) belong here.

Rationale, primary-source inventory, and KTX schema-fitness check: see `apps/qw-oracle/docs/game-mechanics-preplan.md` (Appendices A and B).

---

## v15 (2026-04-27): MVDSV server-side entity types

Phase 2e of the QW knowledge service rollout. Widens the `entities.type` CHECK from 11 to 15 values via the standard entities-rebuild pattern (`ENTITIES_V15_MIGRATION_SQL`, mirroring v11 -> v12) and adds four new per-version tables in `SCHEMA_V15_ADDITIONS_SQL`. Pure-additive: every pre-v15 entity row is preserved, no per-version rows are touched.

The four new types describe the server-side surface that MVDSV (the QuakeWorld dedicated server) exposes -- the wire protocol, the userinfo/serverinfo string-key namespace, the print/log channels that drive game-event broadcasting, and the QuakeC builtin function table that bridges engine code into the QC VM. Once MVDSV Layer 1 extraction lands, these tables become the foundation for two downstream consumers:

- The upcoming **KTX cvars/commands arc (Phase 2e-KTX)** -- KTX is a QC mod hosted by MVDSV; KTX needs the protocol_message + qc_builtin tables to make sense of mod-side cvar registrations and event broadcasts.
- The **qw_event_log validation oracle** -- the parser is currently frozen at `/home/paradoks/projects/qw-event-log-handoff/` (commit `2c584b4`). It carries an obit-string -> cause taxonomy and WeaponType enum that need to be cross-checked against engine source. Activates after KTX gameplay overrides ship; the validation harness joins the parser's enums against `protocol_message_versions` (svc/clc kinds) and `log_template_versions` (broadcast channel, obit format strings).

### New entity types

| Type | Represents |
|---|---|
| `protocol_message` | Wire-protocol byte constants -- server-to-client (`svc_*`), client-to-server (`clc_*`), legacy NetQuake-protocol carry-overs, FTE/MVD protocol-extension bits, `PROTOCOL_VERSION` constants. The defines that govern message parsing on either end of the connection. |
| `info_key` | userinfo / serverinfo / localinfo string keys read or written via the `Info_*` API family. The namespace through which clients and the server expose mutable string-keyed metadata (`name`, `team`, `*gamedir`, etc.). |
| `log_template` | Server-side print / log format-string templates from `SV_BroadcastPrintf`, `SV_ClientPrintf`, `Con_Printf`, `Sys_Printf`, etc. Channel-discriminated. The format strings that drive obit lines, status banners, and console output -- the substrate the qw_event_log parser consumes. |
| `qc_builtin` | QuakeC builtin functions exposed via the `std_builtins[]` / `ext_builtins[]` (and possibly `ext_syscalls[]`) tables in MVDSV's PR2 layer. The engine-side counterparts of QC primitives like `makevectors`, `setorigin`, `centerprint`. |

### `protocol_message_versions`

```sql
CREATE TABLE IF NOT EXISTS protocol_message_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,
  kind             TEXT NOT NULL CHECK (kind IN ('svc','clc','nq','pext_fte','pext_mvd','protocol_version')),
  value            TEXT,
  value_kind       TEXT,
  source_file      TEXT,
  source_line      INTEGER,
  trailing_comment TEXT,
  raw_ast_hash     TEXT,
  source_root      TEXT,
  extracted_at     TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_protocol_message_versions_source ON protocol_message_versions(source_file, source_line);
```

Type-specific columns: `kind` (discriminator -- see table below), `value` (the literal byte / int constant, e.g. `1`, `0x80`, `(1<<3)`), `value_kind` (free-form tag for how the value is expressed -- decimal int, hex int, shift expression, etc.), `trailing_comment` (preserves `// initial connection` style annotation that often documents protocol intent more than the macro name itself).

`kind` discriminator:

| Value | Meaning |
|---|---|
| `svc` | Server-to-client message byte. The dispatch byte the client reads to decide what kind of update follows. |
| `clc` | Client-to-server message byte. Symmetric: the byte the server reads to demux client commands. |
| `nq` | NetQuake-protocol legacy. Constants carried over from id Software's original Quake protocol that QuakeWorld either reuses or maps around. |
| `pext_fte` | FTE protocol-extension bit. Bits in the extension bitmask FTE engines negotiate at connect to enable post-id1 features. |
| `pext_mvd` | MVD protocol-extension bit. Bits negotiated specifically for MVD demo recording / playback channels. |
| `protocol_version` | Top-level `PROTOCOL_VERSION` integer constants. The protocol-rev numbers themselves, distinct from the per-message dispatch bytes. |

Index: `idx_protocol_message_versions_source ON (source_file, source_line)` -- supports `git blame`-style queries where a tag-pair diff needs to attribute a constant change back to its declaration site.

### `info_key_versions`

```sql
CREATE TABLE IF NOT EXISTS info_key_versions (
  entity_id           INTEGER NOT NULL REFERENCES entities(id),
  version             TEXT NOT NULL,
  scope               TEXT NOT NULL CHECK (scope IN ('userinfo','serverinfo','localinfo')),
  operations          TEXT,
  source_file         TEXT,
  source_line         INTEGER,
  containing_function TEXT,
  call_sites_json     TEXT,
  raw_ast_hash        TEXT,
  source_root         TEXT,
  extracted_at        TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_info_key_versions_source ON info_key_versions(source_file, source_line);
```

Type-specific columns: `scope` (discriminator -- see table below; informs whether the key is per-client, server-global, or non-public), `operations` (which `Info_*` operations the engine performs on this key -- read / write / remove -- expressed as a compact text tag), `containing_function` (the C function the primary call site sits in -- helps disambiguate keys that appear across many sites), `call_sites_json` (full list of `Info_*` call sites for this key as a JSON array; the primary `source_file:source_line` is one entry, the rest live here).

`scope` discriminator:

| Value | Meaning |
|---|---|
| `userinfo` | Per-client info string. Keys clients send up via `setinfo` (e.g. `name`, `team`, `topcolor`) -- the public per-player metadata visible to other clients. |
| `serverinfo` | Server-global info string. Keys the server exposes globally (e.g. `*gamedir`, `maxclients`, `*version`) -- visible to every connected client. |
| `localinfo` | Server-local info string. Server-side non-public keys not broadcast to clients. Used for operator-side state that should not leak. |

Index: `idx_info_key_versions_source ON (source_file, source_line)` -- same rationale as `protocol_message_versions`.

### `log_template_versions`

```sql
CREATE TABLE IF NOT EXISTS log_template_versions (
  entity_id                INTEGER NOT NULL REFERENCES entities(id),
  version                  TEXT NOT NULL,
  channel                  TEXT NOT NULL CHECK (channel IN ('broadcast','client','console','system','logfile')),
  format_string            TEXT NOT NULL,
  format_string_normalized TEXT NOT NULL,
  source_file              TEXT,
  source_line              INTEGER,
  containing_function      TEXT,
  raw_ast_hash             TEXT,
  source_root              TEXT,
  extracted_at             TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_log_template_versions_source ON log_template_versions(source_file, source_line);
CREATE INDEX IF NOT EXISTS idx_log_template_versions_channel ON log_template_versions(channel);
```

Type-specific columns: `channel` (discriminator -- see table below; identifies which print API funneled the template), `format_string` NOT NULL (the verbatim format string passed to the print call -- e.g. `"%s entered the game\n"`), `format_string_normalized` NOT NULL (a canonicalized form -- `%`-specifiers collapsed, whitespace stabilised -- so two textually different but semantically equivalent strings dedupe to the same entity), `containing_function` (the C function holding the print call -- locates obit emitters vs status emitters vs cvar-error emitters).

`channel` discriminator:

| Value | Meaning |
|---|---|
| `broadcast` | Sent to all connected clients (`SV_BroadcastPrintf`). The channel obit lines, public chat relays, and round-start banners ride. |
| `client` | Sent to one specific client (`SV_ClientPrintf`). Per-player feedback -- ruleset rejections, kicked-message reasons, vote prompts. |
| `console` | Server console / `Con_Printf`. Operator-facing diagnostic output. |
| `system` | System stdout / `Sys_Printf`. Pre-init or fatal-error output that bypasses the normal console. |
| `logfile` | Server-side logfile output via `log_printf` (`SV_Write_Log` / KTX `logs.c` channel). The channel KTX's extralog XML emissions ride; the format strings here include the multi-line XML wrapper shape that the dual-row design (D10 of the KTX onboarding arc) bridges to the `match_event_versions` table. |

Indexes: `idx_log_template_versions_source ON (source_file, source_line)` (blame queries) and `idx_log_template_versions_channel ON (channel)` (the qw_event_log validation oracle filters to `channel='broadcast'` to scan obit candidates -- a dedicated index keeps that hot path fast across thousands of templates).

**Escape-preservation contract.** `format_string` is stored in raw source-code form -- the literal text that appeared between the C double-quotes, with backslash escapes left intact (`\n`, `\"`, `\\`, etc.). Consumers handle escape interpretation themselves. This contrasts with `cvar_versions.default_value`, which has C escapes interpreted at extraction time (post-v17 contract; see `extractor_lib._cvar_shared.unescape_c_string`). The asymmetry is intentional: log-template format strings carry semantically meaningful `%`-specifiers and `\n`-line-breaks that downstream consumers (the qw_event_log validation oracle, format-string analysis tooling) need to inspect per call site, while cvar default values are runtime string values whose escapes must already be resolved before they reach the loader.

### `qc_builtin_versions`

```sql
CREATE TABLE IF NOT EXISTS qc_builtin_versions (
  entity_id        INTEGER NOT NULL REFERENCES entities(id),
  version          TEXT NOT NULL,
  table_name       TEXT NOT NULL,
  builtin_index    INTEGER NOT NULL,
  handler_fn       TEXT NOT NULL,
  qc_signature     TEXT,
  source_file      TEXT,
  source_line      INTEGER,
  trailing_comment TEXT,
  raw_ast_hash     TEXT,
  source_root      TEXT,
  extracted_at     TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_qc_builtin_versions_source ON qc_builtin_versions(source_file, source_line);
```

Type-specific columns: `table_name` NOT NULL (free-form -- expected MVDSV values are `std_builtins`, `ext_builtins`, possibly `ext_syscalls` for PR2 string-keyed dispatch; left free-form so other engines can declare their own tables without a CHECK rebuild), `builtin_index` INTEGER NOT NULL (the slot the handler occupies in the table -- the actual integer the QC VM dispatches on), `handler_fn` NOT NULL (the C function name the slot points to -- e.g. `PF_makevectors`), `qc_signature` (best-effort QC-side type signature -- `void(vector ang) makevectors`), `trailing_comment` (preserves contextual annotations from the table-initializer source).

No discriminator enum -- `table_name` is free-form to admit future tables without a schema migration.

Index: `idx_qc_builtin_versions_source ON (source_file, source_line)` -- standard blame index.

### Migration shape

`migrateV14ToV15` follows the same pattern as `migrateV11ToV12`: `foreign_keys = OFF` outside the transaction so the entities-table DROP is allowed (every per-type version table FK-references `entities.id`); inside the transaction, drop the entity indexes, run `ENTITIES_V15_MIGRATION_SQL` (rebuild with the widened CHECK + INSERT-SELECT preserves all existing entity rows), run `SCHEMA_V15_ADDITIONS_SQL` (idempotent CREATE IF NOT EXISTS for the four new tables), bump `schema_meta.schema_version` to 15.

On a fresh DB the v1 `entities` CHECK already lists the full v15 type set (the comment at the top of `SCHEMA_V1_SQL` documents this "pre-widen the base CREATE to skip migration on fresh DBs" pattern), so fresh installs stamp v15 directly without running `migrateV14ToV15`. Both paths converge on the same shape.

**Spec:** `docs/superpowers/specs/2026-04-27-mvdsv-extraction-design.md`. Plan: `docs/superpowers/plans/2026-04-27-mvdsv-layer1-extraction.md`. Task 1 inventory notes: `apps/qw-oracle/scripts/extractors/mvdsv/notes-pass-1.md`.

---

## v16 (2026-04-28): info_key cross-scope split + protocol_message kind taxonomy

Phase B + Phase C of the MVDSV Phase 2e follow-up. Two changes ride one schema bump because they share the migration step.

### Phase B: info_key canonical name carries the scope suffix

The `entities` table's `UNIQUE(project, type, name)` constraint collapsed cross-scope registrations of the same info-string key. `*z_ext` registers in MVDSV as both serverinfo (via `SV_InitLocal` at `src/sv_main.c:3685`) and userinfo (via `SVC_DirectConnect` at `src/sv_main.c:1425`). At v15 only the serverinfo row survived; the userinfo registration was silently dropped.

Phase B fixes this by making the canonical info_key name `<bare>:<scope>` (e.g. `*z_ext:serverinfo`, `*z_ext:userinfo`). The unsuffixed form is preserved on the JSON entry as `bare_name` so MCP `lookup_entity` can fall back to a `name LIKE '<bare>:%' COLLATE NOCASE` prefix match when type=info_key and the queried name has no `:`.

Where the change lives:
- `_handler_info_keys.py::finalize` emits `name = "<bare>:<scope>"` and adds `bare_name` at the top level of the entry.
- `InfoKeyEntry` (TS) gains a `bare_name: string` field.
- `load-version.ts` array-to-dict normalization warns on duplicate names (belt-and-braces; should not fire today).
- `lookup-entity.ts` adds the prefix-match fallback for type=info_key bare lookups.

The migration backfills v15 info_key entity names to the suffixed form via a one-shot `UPDATE entities ... SET name = name || ':' || (SELECT scope FROM info_key_versions ...) WHERE project='mvdsv' AND type='info_key' AND name NOT LIKE '%:%'`. The next `extract-tag --project mvdsv --version head` idempotently re-upserts: the existing 44 entities renamed match the extracted suffixed names, and the missing `*z_ext:userinfo` row is INSERTed fresh. After re-extraction the table holds 45 info_key rows.

### Phase C: protocol_message kinds widen from 6 to 13

The v15 kind discriminator on `protocol_message_versions` lumped heterogeneous-bag classifications under single labels:
- `protocol_version` mixed the wire-protocol revision integer (`PROTOCOL_VERSION = 28`) with three FTE/MVD extension-id macros (`PROTOCOL_VERSION_FTE/FTE2/MVD1`).
- `pext_mvd` mixed bit flags (`MVD_PEXT1_FLOATCOORDS = (1 << 0)`), plain ints (`MVD_PEXT1_ANTILAG_CLIENTPOS = 128`), aliases (`MVD_PEXT1_INCLUDEINMVD = ( MVD_PEXT1_HIDDEN_MESSAGES )`), and empty markers (`MVD_PEXT1_DEBUG`).
- Same heterogeneity affected `pext_fte` (12 entries; all hex consts at HEAD but the type system should still discriminate body shape symmetrically with pext_mvd for future builds).

Phase C splits the kind discriminator into 13 values:

| v15 kind | v16 kind(s) | Discriminator |
|---|---|---|
| `svc` | `svc` | unchanged |
| `clc` | `clc` | unchanged |
| `nq` | `nq` | unchanged |
| `pext_fte` | `pext_fte_bit` / `pext_fte_const` / `pext_fte_alias` / `pext_fte_marker` | macro body shape |
| `pext_mvd` | `pext_mvd_bit` / `pext_mvd_const` / `pext_mvd_alias` / `pext_mvd_marker` | macro body shape |
| `protocol_version` | `protocol_version` (PROTOCOL_VERSION exact) / `protocol_extension_id` (PROTOCOL_VERSION_*) | name shape |

The pext_* body-shape discriminator:
- `_bit`: `( 1 << N )` bitshift expressions (bit flags negotiated in the extension bitmask).
- `_const`: integer or hex literal bodies (plain numeric constants).
- `_alias`: identifier-in-parens bodies (one macro reusing another's value).
- `_marker`: empty body (`#define MVD_PEXT1_DEBUG`) -- reserved slot, no value committed yet.

Today's distribution at the 2026-01-04 mvdsv head snapshot (105 rows total):
- `svc=52`, `clc=20`, `nq=9` (unchanged)
- `pext_fte_const=12` (all 12 FTE entries are hex consts at HEAD; the other three `pext_fte_*` kinds have zero rows but are reserved)
- `pext_mvd_bit=5`, `pext_mvd_const=1`, `pext_mvd_alias=1`, `pext_mvd_marker=1`
- `protocol_version=1`, `protocol_extension_id=3`

### Migration shape

`migrateV15ToV16` rebuilds `protocol_message_versions` with the widened CHECK using the standard FK-safety pattern (`foreign_keys = OFF` outside the txn). The kind transform happens INLINE during the rebuild's `INSERT INTO ... SELECT` step rather than as a pre-rebuild `UPDATE` -- the OLD `CHECK` on `protocol_message_versions.kind` still rejects the new 13-value vocabulary, so any pre-rebuild `UPDATE` would fail. Mapping the values during the `INSERT` lands them directly in the new table whose CHECK accepts them.

The rebuild order:

1. `CREATE TABLE protocol_message_versions_v16` with the widened 13-value `kind` CHECK.
2. `INSERT INTO protocol_message_versions_v16 SELECT ...` from the old table, mapping `kind` via a `CASE` expression that subdivides `pext_fte` / `pext_mvd` by `value_kind` and splits `protocol_version` by entity name. `svc` / `clc` / `nq` pass through unchanged. Already-widened values (re-run safety) pass through via the `ELSE pmv.kind` arm.
3. `DROP TABLE protocol_message_versions` (the old shape).
4. `ALTER TABLE protocol_message_versions_v16 RENAME TO protocol_message_versions`.
5. Recreate `idx_protocol_message_versions_source`.

The mapping inside the `INSERT`:

```sql
INSERT INTO protocol_message_versions_v16 (...)
SELECT
  pmv.entity_id, pmv.version,
  CASE pmv.kind
    WHEN 'svc' THEN 'svc'
    WHEN 'clc' THEN 'clc'
    WHEN 'nq'  THEN 'nq'
    WHEN 'pext_fte' THEN
      CASE pmv.value_kind
        WHEN 'bitshift'   THEN 'pext_fte_bit'
        WHEN 'integer'    THEN 'pext_fte_const'
        WHEN 'hex'        THEN 'pext_fte_const'
        WHEN 'expression' THEN 'pext_fte_alias'
        ELSE                   'pext_fte_marker'
      END
    WHEN 'pext_mvd' THEN
      CASE pmv.value_kind
        WHEN 'bitshift'   THEN 'pext_mvd_bit'
        WHEN 'integer'    THEN 'pext_mvd_const'
        WHEN 'hex'        THEN 'pext_mvd_const'
        WHEN 'expression' THEN 'pext_mvd_alias'
        ELSE                   'pext_mvd_marker'
      END
    WHEN 'protocol_version' THEN
      CASE
        WHEN (SELECT name FROM entities WHERE id = pmv.entity_id) = 'PROTOCOL_VERSION'
          THEN 'protocol_version'
        ELSE 'protocol_extension_id'
      END
    ELSE pmv.kind
  END AS kind,
  pmv.value, pmv.value_kind, pmv.source_file, pmv.source_line, ...
FROM protocol_message_versions pmv;
```

The Phase B info_key name `UPDATE entities ... SET name = name || ':' || ...` rides the same transaction (data-only, no schema change). The `WHERE ... name NOT LIKE '%:%'` guard makes it idempotent; re-running the migration on an already-migrated DB is a no-op.

`SCHEMA_V15_ADDITIONS_SQL`'s inline `protocol_message_versions.kind` CHECK has been widened to the v16 13-kind list so fresh DBs land on the v16 shape directly via the `CREATE IF NOT EXISTS` path -- the documented "fresh DB vs migrated DB" pattern (mirrors `SCHEMA_V1_SQL`'s `entities.type` CHECK already listing the full v15 type set).

### MCP and quality-grid wiring

- `lookup_entity` adds a bare-name prefix fallback for type=info_key (described above). Tool description updated.
- `verify-rewrite.ts` adds a cross-scope smoke that calls `lookup_entity({name: '*z_ext', type: 'info_key', project: 'mvdsv'})` and asserts 2 rows with scopes serverinfo + userinfo.
- `F1.mvdsv.info_keys_count` expected count bumped 44 -> 45.
- `F2.mvdsv.protocol_message_kinds_distribution` expected list widened to 13 kinds. The probe asserts that every observed kind is in the expected set (rather than that every expected kind has rows) since some kinds may have zero rows at HEAD.

### Spec / plan

- Plan: `docs/superpowers/plans/2026-04-28-mvdsv-phase2e-followups.md` (Phase B + Phase C).

---

## v17 (2026-04-28): log_template_versions gains all_call_sites_json

Phase D of the MVDSV Phase 2e follow-up arc. Single-column additive migration -- pure ALTER, no rebuild required.

The Phase 2e v15 schema stored only the first registration site for each `(channel, format_string)` log_template tuple in `log_template_versions.source_file` / `source_line` / `containing_function`. High-fanout templates -- e.g. the `Log_FlushSafe`-style `"%s\n"` console template registered from dozens of call sites -- collapsed into a single citation, hiding the call-site fanout that actually exists in the source.

v17 adds parity with `info_key_versions.all_call_sites_json`: a JSON array column on `log_template_versions` capturing every `(source_file, source_line, containing_function)` triple that registered the template at this version. The original three top-level columns continue to carry the first / canonical citation for backward compatibility.

```sql
ALTER TABLE log_template_versions ADD COLUMN all_call_sites_json TEXT;
```

NULL is allowed for v16-era rows that pre-date the column; the next `extract-tag` re-upsert populates the JSON for any re-loaded version. `_handler_log_templates.py` emits the array; `load-log-templates.ts` carries it through to the natural-keys upsert.

The migration step is a single line in `migrateV16ToV17`. No FK rebuild, no `INSERT ... SELECT`, no CHECK changes -- just one `ALTER TABLE`.

- Plan: `docs/superpowers/plans/2026-04-28-mvdsv-phase2e-followups.md` (Phase D).

---

## KTX onboarding arc (2026-05-04): three migrations + `match_event_versions` new table

The KTX onboarding arc (canonical KTX 1.46 onboarded into Layer 1) ships three migration files plus one new entity type with its per-version table. All migrations are pure-additive at the value-set level (CHECK widenings via PostgreSQL `ALTER TABLE ... DROP CONSTRAINT ... + ADD CONSTRAINT ...`). No table rewrites required.

Filename note: D5 of the arc decisions named the migrations `008_ktx_log_template_logfile_channel.sql` / `009_ktx_match_event_type.sql` / `010_ktx_gameplay_kinds.sql`. Phase 1 of the arc renumbered to `009_ktx_log_template_logfile_channel.sql` / `010_ktx_match_event_type.sql` / `011_ktx_gameplay_kinds.sql` at execution time because the QWiki community-reference arc had already taken slot 008 (`008_community_schema.sql`). Refer to the live `db/migrations/` directory for the authoritative filenames; the schema deltas described below are stable regardless of slot assignment.

### Migration A: `log_template_versions.channel` widening (`+= 'logfile'`)

The `log_template_versions.channel` CHECK widens from 4 values (`broadcast` / `client` / `console` / `system`) to 5 (`+= 'logfile'`). KTX's `log_printf` API at `src/logs.c` emits XML-shaped extralog payloads to a server-side logfile channel; pre-KTX engines did not surface this channel. Per F4 of the arc's review-findings: 28 raw `log_printf` call sites; format strings include both bare-text logs and the multi-line XML wrappers the dual-row design (D10) bridges to `match_event_versions`.

### Migration B: `entities.type` widening (`+= 'match_event'`) + new `match_event_versions` table

Adds `'match_event'` as the 16th value of `entities.type`. New per-version table:

```sql
CREATE TABLE IF NOT EXISTS match_event_versions (
  entity_id                 INTEGER NOT NULL REFERENCES entities(id),
  version                   TEXT NOT NULL,
  complex_type              TEXT NOT NULL,
  xsd_version               TEXT NOT NULL,
  attributes_json           JSONB NOT NULL,
  emission_call_sites_json  JSONB NOT NULL,
  raw_xsd_hash              TEXT,
  extracted_at              TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (entity_id, version)
);
CREATE INDEX IF NOT EXISTS idx_match_event_versions_complex_type
  ON match_event_versions(complex_type);
CREATE INDEX IF NOT EXISTS idx_match_event_versions_xsd_version
  ON match_event_versions(xsd_version);
```

Type-specific columns: `complex_type` (XSD complexType name -- one of `pick_mapitem`, `pick_backpack`, `drop_backpack`, `pick_powerup`, `drop_powerup`, `damage`, `death`); `xsd_version` (the XSD file's namespace version, e.g. `0.1` for `ktxlog_0.1.xsd`); `attributes_json` (per-event attribute schema -- attribute names + types per XSD); `emission_call_sites_json` (full list of `(source_file, source_line, containing_function)` triples where the engine emits this event type via `log_printf`).

Per F14 of the arc's review-findings: 7 entity rows (one per XSD complexType) + 13 emission call sites mapped across `items.c` / `combat.c` / `client.c` / `logs.c`. Per-event attribute counts: `pick_mapitem=4`, backpack-events=7, `pick_powerup`/`drop_powerup`=4, `damage`=8, `death`=8.

Indexes: `idx_match_event_versions_complex_type` (filter by event type) and `idx_match_event_versions_xsd_version` (filter across XSD revisions if KTX ships a `ktxlog_0.2.xsd` later).

### Migration C: `gameplay_*` kind widenings

Two parallel widenings:

- `gameplay_entity_defs.kind` adds `'monster'` (4th value: `item` / `weapon` / `projectile` / `monster`). KTX's `bloodfest_monster_array[]` at `src/sp_monsters.c:60-76` carries 13 rows.
- `gameplay_mechanics.kind` adds 7 values (`game_mode` / `mode_default` / `election_type` / `score_system` / `drop_item` / `loc_macro` / `teamplay_message`). Per-kind row counts at canonical 1.46:
  - `game_mode`: 27 catalog rows (17 `um_list[]` peers + race + bloodfest + 8 mutators -- per arc D11 two-axis discriminator).
  - `mode_default`: 317 per-line overlays (F6: an earlier spec-time estimate undercounted this; Phase 3 + 5.5 retrofit confirmed 317 across parallel + serial runs. 54 `common_um_init` baseline + per-mode initstring overlays -- per arc D12 per-line granularity).
  - `election_type`: 5 rows (skip `etNone` sentinel from the 6-value `electType_t` enum).
  - `score_system`: 3 rows (Win Only / Scaled / Formula1; positions array length=10 invariant).
  - `drop_item`: 31 rows from `commands.c:9075-9108`'s `dropitem_spawn_t` array (Pass 5.4 source-walk corrected from spec-time estimate of 30; F11 amendment).
  - `loc_macro`: 15 rows from `teamplay.c:1491-1508`.
  - `teamplay_message`: 21 rows from `teamplay.c:1645-1668`, with Pattern 9 banner-comment harvest of handler-function descriptions.

Per-row gate convention (D8): `ruleset_gate_json = {"mode":"<token>"}` (single-key, user-facing token). Catalog rows themselves use `{}` (catalog rows DEFINE modes; they aren't gated by them).

### Migration shape

All three migrations follow the canonical Postgres pattern:

```sql
ALTER TABLE <table> DROP CONSTRAINT <table>_<column>_check;
ALTER TABLE <table> ADD CONSTRAINT <table>_<column>_check
  CHECK (<column> IN (<full new value set>));
```

Re-run idempotency: each `DROP CONSTRAINT` is wrapped in `IF EXISTS` so re-applying the migration on an already-widened DB is a no-op. The `match_event_versions` table CREATE uses `CREATE TABLE IF NOT EXISTS` to mirror the convention.

### Cross-arc downstream consumers

- The `qw_event_log` parser (`/home/paradoks/projects/qw-event-log-handoff/`) becomes unblocked at the schema level: its WeaponType + obit-string -> cause taxonomies cross-validate against `match_event_versions` (per-event schema) + `log_template_versions` filtered to `channel='logfile'` (per-call-site format strings).
- Layer 3 concept-note candidates (parked at `docs/superpowers/parking/2026-05-04-ktx-layer3-concept-note-candidates.md`) consume KTX's first-class entity rows + gameplay_mechanics catalog + match_event entity table for the game-modes index, matchlog format, and mutators notes.

### Spec / plan

- Spec: `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` (five-pass arc-brainstormer).
- Plan: `docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md` (9 phases).

---

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

## v18 (2026-05-18): L1 runtime fidelity provenance (enforce-L1 arc)

Migration `015_l1_runtime_fidelity_provenance.sql`. Pure-additive: three nullable JSONB columns, no backfill, no index, no FK change.

### Two physically separate JSONB columns

D12 structural no-blend: there is NO single `runtime_fidelity` wrapper column and NO cross-track `kind` discriminator. Track separation is PHYSICAL -- two independent columns, each covering different tables and different population scopes. `evidence.feeder` is an INTRA-Track-A tag that disambiguates Track A's own two feeders (callgraph vs commented-register -- D7.1/D15); it is structurally never a cross-track discriminator.

**`track_a_reachability`** -- on `cvar_versions` AND `command_versions` (JSONB nullable).

Track-A reachability verdict. Populated only for the banked HEAD pool (92 cvars + 74 commands -- D20). NULL elsewhere is D13 level-1 "no signal".

D14 three-slot spine: `{conclusion, evidence, dump_confirmation}`. Two Track-A feeders (D7.1/D15):

- Callgraph feeder: `{ "conclusion":"genuine-dead"|"build-excluded", "evidence":{ "feeder":"callgraph", "per_variant":{"client":S,"server":S,"win":S,"apple":S}, "address_taken_residue":bool }, "dump_confirmation":"high-confidence-generalized" }`
- Commented-register feeder: `{ "conclusion":"genuine-dead"|"build-excluded", "evidence":{ "feeder":"commented-register", "register_site":{"source_file":str,"source_line":int} }, "dump_confirmation":"high-confidence-generalized" }`

where `S` in `"reachable"|"unreachable"|"not-compiled"`. The string `"not-compiled"` is DISTINCT -- never collapsed into `"unreachable"` (D5 three-valued per-variant signal).

**`track_b_hud_recovery`** -- on `command_versions` ONLY (JSONB nullable). NOT on `cvar_versions` (D11 amended / D21, commands-only).

Recovered-HUD-command origin. Populated only for the recovered hidden HUD commands the Phase-2 Track-B handler emits in `ezquake-hud-commands-ast.json` (bare `<name>` + `+hud_<name>`/`-hud_<name>` -- D21; the ~129-command reverse-diff set per X7 -- a DIFFERENT set from the Track-A 74-command D20 banked pool; these are commands the literal extractor never saw). NULL elsewhere is D13 level-1.

D14 three-slot spine: `{ "conclusion":"bare-command"|"plus-minus-pair", "evidence":{ "hud_element":str, "hud_family":"bare"|"plus"|"minus", "registration_api":"Cmd_AddCommand"|"Cmd_AddRemCommand", "handler_fn":"HUD_Func_f"|"HUD_Plus_f"|"HUD_Minus_f", "site":{"source_file":str,"source_line":int} }, "dump_confirmation":"high-confidence-generalized" }`.

### D13 slot-3 representation boundary

The loader writes `"high-confidence-generalized"` (level-2) for EVERY populated row in Phase 3. `"dump-confirmed"` (level-3) is a valid enum value the columns MAY hold but Phase 3 NEVER writes it -- Phase 4 owns the runtime-dump cross-check (D19). NULL whole column == level-1 "mechanism did not run".

### Population

Loader-driven -- NOT a migration backfill. Re-run the Phase-3 loader against the Phase-1/2 extractor output to populate. No UPDATE or INSERT in the migration (X9 pure-schema discipline, mirroring 013).

### F1 regression gate

These three columns join the `F1.jsonb_columns_not_strings` regression-gate target set. The loader binds them via `tx.json(...)`, never `JSON.stringify`, and `F1.jsonb_columns_not_strings` + the new `F1.runtime_fidelity_shape` probe (Phase-3 Task-4) gate their shape on every load.

### Spec / plan

- Spec: `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
- Arc: `enforce-L1-runtime-truth` (2026-05-17)

---

## v19 (2026-05-22): KTX L1 categorize -- category_inferred + provenance sibling

Migration `016_l1_inferred_category.sql`. Pure-additive: two nullable TEXT columns on `cvar_versions` and on `command_versions`, no backfill, no index, no constraint.

### `category_inferred`

LLM-derived function-based category (e.g. `"Admin & permissions"`, `"Voting"`). NULL for ezQuake (which uses source-truth `group_name_in_source`); populated for KTX (and later MVDSV / QWCL) via the b6-categorize fan-out described in `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/README.md`. Value space at v2 (LOCKED 2026-05-22) is a 14-category list: the 13 from Phase 2 calibration plus `Player communication` (added at Phase 3 amendment after fan-out surfaced a recurring messaging cluster -- see `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-overrides.md` for the v2 list and amendment rationale).

### `category_inferred_origin`

Provenance sibling for `category_inferred`. Format: `{model}|{prompt_version}`, e.g. `claude-sonnet-4-6|b6-categorize-v1`. NULL iff `category_inferred` is NULL (XOR invariant gated by `F1.category_inferred_provenance_integrity`).

### F1 regression gate

`F1.category_inferred_provenance_integrity` enforces the XOR invariant across `cvar_versions` and `command_versions`: every populated `category_inferred` has a matching populated `category_inferred_origin`, and vice versa.

### Spec / plan

- Spec: `docs/superpowers/specs/2026-05-22-ktx-l1-audit-visualization-design.md`
- Plan: `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/README.md`
- Arc: `arc-ktx-categorize` (2026-05-22)

---

## Related

- Schema code: `scripts/load-knowledge/schema.ts`
- Per-table idempotent upserts: `scripts/load-knowledge/natural-keys.ts`
- Per-type row-shape interfaces: `scripts/load-knowledge/types.ts`
- Loader adapters (one per entity type): `scripts/load-knowledge/load-<type>.ts`
- CLI entry point: `scripts/load-knowledge/index.ts`
- Load verification: F1 quality-grid (`scripts/load-knowledge/quality-grid.ts`, run via `load-knowledge -- quality-grid --project <p>`)
- Per-migration specs: see each section above.

---

## Community schema

Separate schema from L1 (D2: different lifecycle -- L1 regenerates from engine-source extractions; community is durable curated reference refreshed on wiki re-scrape or human edit). Five tables. All migrations for this schema are append-only under `db/migrations/` (next: 008).

Tables: `community.players`, `community.clans`, `community.tournaments`, `community.player_clan_eras`, `community.tournament_results`.

Note: `community.tournaments` is placeholder-only pending Phase 4 pilot (D9). Tournament-specific columns (year, mode, format, prize_pool, organizer, dates, status) land in migration 009 after pilot surfaces template variants.

Note: `source` CHECK values on cross-link tables (`player_clan_eras`, `tournament_results`) are fixed per D10.

### `community.players`

One row per known QW player. Populated by the wiki scraper from QWiki player articles.

**Live counts (Phase 2, snapshot 2026-05-04):** 5,896 rows; 570 markdown notes under `curated/player-notes/`; 2,004 `is_substantive=TRUE`.

| Column | Type | Notes |
|---|---|---|
| `slug` | TEXT PK | URL-safe identifier derived from article title |
| `title` | TEXT NOT NULL | Article title as scraped |
| `display_name` | TEXT | Primary in-game name |
| `aliases` | TEXT[] | Additional known names |
| `real_name` | TEXT | |
| `nationality` | TEXT | Display string (e.g. "Sweden") |
| `nationality_iso` | TEXT | ISO 3166-1 alpha-2 code (e.g. "SE") |
| `current_clan` | TEXT | Current clan name |
| `active_year_start` | INT | |
| `active_year_end` | INT | NULL = still active |
| `status` | TEXT | CHECK: Active / Retired / Inactive / Quit / unknown or NULL |
| `community_roles` | TEXT[] | e.g. caster, admin, developer |
| `has_note` | BOOLEAN NOT NULL DEFAULT FALSE | Layer 3 concept note exists for this player |
| `is_substantive` | BOOLEAN NOT NULL DEFAULT FALSE | Article has meaningful content beyond stubs |
| `is_stub` | BOOLEAN NOT NULL DEFAULT TRUE | Article is a stub |
| `source_template` | TEXT | CHECK: infobox_player / player_info / bullet_prose / none or NULL |
| `source_categories` | TEXT[] | QWiki categories the article belongs to |
| `wiki_revision_id` | BIGINT | QWiki revision ID at time of scrape |
| `wiki_fetched_at` | TIMESTAMPTZ | When this row was last refreshed from the wiki |

**No FKs.**

Indexes: `status`, `nationality_iso`, partial on `is_substantive WHERE is_substantive = TRUE`.

### `community.clans`

One row per known QW clan. Populated by the wiki scraper from QWiki clan articles.

| Column | Type | Notes |
|---|---|---|
| `slug` | TEXT PK | URL-safe identifier derived from article title |
| `title` | TEXT NOT NULL | Article title as scraped |
| `prefix` | TEXT | Clan tag / prefix (e.g. "ae.") |
| `nationality` | TEXT | Display string |
| `nationality_iso` | TEXT | ISO 3166-1 alpha-2 code |
| `founded_year` | INT | |
| `founded_month` | INT | |
| `founded_day` | INT | |
| `founded_by` | TEXT | Founding member(s) |
| `disbanded` | TEXT | Free-form disbandment note or date |
| `status` | TEXT | CHECK: Active / Inactive / Disbanded / unknown or NULL |
| `irc_channel` | TEXT | |
| `irc_network` | TEXT | |
| `website` | TEXT | |
| `has_note` | BOOLEAN NOT NULL DEFAULT FALSE | Layer 3 concept note exists for this clan |
| `is_substantive` | BOOLEAN NOT NULL DEFAULT FALSE | Article has meaningful content beyond stubs |
| `is_stub` | BOOLEAN NOT NULL DEFAULT TRUE | Article is a stub |
| `source_template` | TEXT | CHECK: infobox_clan / clan_info / infobox_4on4team / bullet_prose / none or NULL |
| `source_categories` | TEXT[] | QWiki categories the article belongs to |
| `wiki_revision_id` | BIGINT | QWiki revision ID at time of scrape |
| `wiki_fetched_at` | TIMESTAMPTZ | When this row was last refreshed from the wiki |

**No FKs.**

Indexes: `status`, `nationality_iso`, partial on `is_substantive WHERE is_substantive = TRUE`.

Populated by Phase 3 clan loader (`scripts/load-community/clans/index.ts`). Row count: 822 (Category:Clans articles in 2026-05-04 snapshot). Distribution: clan_info 450, bullet_prose 326, infobox_4on4team 44, infobox_clan 2, none 0. Clan notes emitted to `curated/clan-notes/`; tuned count 350 (Phase 3 T8 review: Option 2 boilerplate-strip on `external_links_section` template lines, then F27 follow-up extends the strip to standalone `[[Category:...]]` lines that survive `extractSectionBody` trailing-meta-trim when interrupted by HTML comments).

### `community.tournaments`

Placeholder-only per D9. Tournament-specific columns land in migration 009 after Phase 4 pilot surfaces template variants.

| Column | Type | Notes |
|---|---|---|
| `slug` | TEXT PK | URL-safe identifier derived from article title |
| `title` | TEXT NOT NULL | Article title as scraped |
| `has_note` | BOOLEAN NOT NULL DEFAULT FALSE | Layer 3 concept note exists for this tournament |
| `is_substantive` | BOOLEAN NOT NULL DEFAULT FALSE | |
| `is_stub` | BOOLEAN NOT NULL DEFAULT TRUE | |
| `source_template` | TEXT | Template name observed on the article |
| `source_categories` | TEXT[] | QWiki categories the article belongs to |
| `wiki_revision_id` | BIGINT | |
| `wiki_fetched_at` | TIMESTAMPTZ | |

**No FKs. No indexes (placeholder table).**

### `community.player_clan_eras`

One row per player-clan membership span. Surrogate PK because requiring `start_year NOT NULL` as part of a composite PK would block year-absent bullet-list rows (F9).

| Column | Type | Notes |
|---|---|---|
| `id` | BIGSERIAL PK | Surrogate -- see note above |
| `player_slug` | TEXT NOT NULL | FK to `community.players(slug)` |
| `clan_slug` | TEXT | Nullable -- unrecognized clan names are preserved in `clan_title` |
| `clan_title` | TEXT NOT NULL | Clan name as it appears in the article |
| `start_year` | INT | Nullable -- bullet-list clan history sections often lack year information |
| `end_year` | INT | |
| `era_seq` | INT | List-order preservation for year-absent rows |
| `source` | TEXT NOT NULL | CHECK: wiki_TH / wiki_bullet / tournament-archive / manual |

**FK:** `player_slug REFERENCES community.players(slug)`.

**UNIQUE:** `(player_slug, clan_title, start_year, source)` -- idempotency on re-load.

Indexes: `player_slug`, partial `clan_slug WHERE clan_slug IS NOT NULL`, partial `start_year WHERE start_year IS NOT NULL`.

### `community.tournament_results`

One row per player tournament result. Soft reference to `community.tournaments` (no FK) because Phase 5 backfill loads cross-link rows before Phase 4 populates `community.tournaments`, so a hard FK would cause insertion failures (F8).

| Column | Type | Notes |
|---|---|---|
| `id` | BIGSERIAL PK | Surrogate |
| `player_slug` | TEXT NOT NULL | FK to `community.players(slug)` |
| `tournament_slug` | TEXT | Nullable soft reference -- no FK; see note above |
| `tournament_title` | TEXT NOT NULL | Tournament name as it appears in the article |
| `year` | INT | |
| `place` | TEXT | e.g. "1st", "Top 8" |
| `mode` | TEXT | e.g. "1on1", "4on4" |
| `team` | TEXT | Team name if applicable |
| `team_flag` | TEXT | Country code for team flag |
| `source` | TEXT NOT NULL | CHECK: wiki_achievement / wiki_TH / tournament-archive / manual |

**FK:** `player_slug REFERENCES community.players(slug)`.

**No FK on `tournament_slug`** -- soft reference; Phase 5 backfill loads cross-link rows before Phase 4 populates `community.tournaments`, so a hard FK would cause insertion failures (F8).

Indexes: `player_slug`, partial `tournament_slug WHERE tournament_slug IS NOT NULL`, `year`.

---

## Layer 2 thread corpus (migration 021, 2026-06-06)

Reconstructed conversation threads over the Layer 2 Discord message corpus. Two tables: `chat_threads` (one row per reconstructed thread) and `thread_messages` (many-to-many junction linking threads to their constituent `messages` rows).

Migration file: `db/migrations/021_layer2_threads.sql`. Spec decisions D3/D4/D7 (corpus reconstruction arc).

### `chat_threads`

One row per reconstructed conversation thread. The `thread_key` column is the idempotency anchor: the reconstruction loader always produces the same key for the same source messages, so re-runs are safe upserts. `content` is the raw concatenated member messages (D3 -- not a summary), which drives both the FTS column (`content_tsv`) and the semantic embedding column (`topic_embedding`).

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT IDENTITY PK | Surrogate key |
| `thread_key` | TEXT NOT NULL UNIQUE | Idempotency anchor -- deterministic key produced by the reconstruction loader from source message IDs / channel / time range |
| `channel_name` | TEXT NOT NULL | Discord channel the thread originates from |
| `platform` | TEXT NOT NULL CHECK = 'discord' | Locked to `'discord'`; same pattern as `messages.platform` |
| `date_range_start` | TIMESTAMPTZ NOT NULL | Timestamp of the earliest message in the thread |
| `date_range_end` | TIMESTAMPTZ NOT NULL | Timestamp of the latest message in the thread |
| `participant_count` | INTEGER NOT NULL | Number of distinct authors; always computable at reconstruction time |
| `participants_json` | JSONB nullable | Array of participant author names / IDs; nullable for sparse threads |
| `message_count` | INTEGER NOT NULL | Number of member messages; always computable at reconstruction time |
| `topic_label` | TEXT NOT NULL | Short human-readable topic label assigned by the reconstruction loader |
| `content` | TEXT NOT NULL | Raw concatenated member messages (D3) -- the embedded and FTS-indexed body |
| `content_tsv` | tsvector GENERATED STORED | `to_tsvector('simple', coalesce(content, ''))`. Config `'simple'` (D7): corpus is mixed-language Discord content; English stemming would mangle non-English tokens. |
| `topic_embedding` | vector(1024) nullable | voyage-4-large embedding of `content`. NULL until the embedding worker fills it. Dimension matches `concept_chunks.embedding` (005_layer3_concepts.sql). |
| `embedding_stale` | BOOLEAN NOT NULL DEFAULT FALSE | Voyage API retry signal: set TRUE on embedding failure, cleared FALSE on success. Same convention as `concept_chunks.embedding_stale`. |
| `resolution_status` | TEXT nullable CHECK | One of `'solved'` / `'unresolved'` / `'informational'`. NULL until the LLM classification phase fills it (later arc phase). |
| `buckets_question` | JSONB nullable | Question-bucket classification output. NULL until the classification phase fills it. |
| `buckets_answer` | JSONB nullable | Answer-bucket classification output. NULL until the classification phase fills it. |
| `reconstruction_version` | TEXT NOT NULL | Version string of the reconstruction script / prompt that produced this row |
| `reconstructed_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | When this thread was reconstructed |

**Natural key:** `thread_key` (UNIQUE). Loader upserts on `ON CONFLICT (thread_key)`.

**Populated by:** corpus reconstruction loader (later arc phase). `topic_embedding` filled by the embedding worker after reconstruction.

**Consumed by:** Layer 2 hybrid retrieval (FTS via `content_tsv_gin`, vector ANN via `embedding_hnsw`); MCP `search_solved_issues` (future widening); downstream classification phases that fill `resolution_status` / `buckets_*`.

Indexes:
- `chat_threads_channel_started ON (channel_name, date_range_start)` -- channel-scoped time-range queries
- `chat_threads_status ON (resolution_status)` -- filter by classification outcome
- `chat_threads_embedding_hnsw USING hnsw (topic_embedding vector_cosine_ops)` -- ANN semantic retrieval; cosine metric matches voyage-4-large normalised embedding space
- `chat_threads_content_tsv_gin USING GIN (content_tsv)` -- lexical FTS over raw thread content
- `chat_threads_thread_key_key` (implicit from UNIQUE) -- idempotency lookups

### `thread_messages`

Many-to-many junction between `chat_threads` and `messages`. One row per (thread, message) pair.

Many-to-many (not a direct FK on `messages`) because a message can participate in multiple reconstructed threads: a seed message that anchors two overlapping threads, or a message in a cross-channel reply chain. The junction lets `chat_threads` own the thread-level aggregate while `messages` retains the canonical per-message record intact (raw-is-immutable principle from CLAUDE.md).

| Column | Type | Notes |
|---|---|---|
| `thread_id` | BIGINT NOT NULL FK | References `chat_threads(id) ON DELETE CASCADE` |
| `message_id` | TEXT NOT NULL FK | References `messages(id) ON DELETE CASCADE` |

**PK:** `(thread_id, message_id)`.

**ON DELETE CASCADE on both FKs:** deleting a thread prunes its junction rows; deleting a message prunes its junction rows.

**Populated by:** corpus reconstruction loader alongside `chat_threads` rows.

**Consumed by:** reverse lookups ("which threads contain this message?") and thread hydration ("fetch the raw messages for this thread").

Indexes:
- `thread_messages_message ON (message_id)` -- reverse lookup: which threads reference a given message ID
