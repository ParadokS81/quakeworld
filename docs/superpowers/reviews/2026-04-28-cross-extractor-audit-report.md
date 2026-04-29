# Cross-Extractor Pattern Audit Report

**Date:** 2026-04-28
**Mode:** cross-project (Mode C in `validate-extractor` skill)
**Schema baseline:** v17
**Architecture baseline:** post-consolidation (commits 5b943d4 -> 8115b48, 2026-04-28)
**Working tree:** main, post-consolidation. Slipgate-app uncommitted changes orthogonal.
**Validator:** Claude (validate-extractor skill, Mode C)
**Spec:** `docs/superpowers/specs/2026-04-28-cross-extractor-pattern-audit.md`

## Summary

Audit covered all four libclang-based extractors (ezQuake, FTE, QWCL, MVDSV) and `extractor_lib/`. The post-consolidation invariants on directory shape and per-project handler counts hold (extractor_lib has 5 Tier-1 files, ezquake=8 / fte=8 / qwcl=3 / mvdsv=7 project-private handlers). The audit surfaces **27 findings: 4 critical, 16 important, 7 nits.** The largest cross-cutting issue is that the v17 lift prototype (`resolve_fn_ref` to `extractor_lib/_resolve.py`) was applied only to MVDSV; ezquake / fte / qwcl carry six private copies under a stricter policy. Nine other lift candidates surfaced (read_extent x13, strip_quotes x8, asset-handler helpers x17, etc.) plus one dead-code regression (`extractor_lib/_base.py`) and a previously-HANDOVER-tracked qc_builtin cross-scope collision now escalated to Critical (latent silent data loss on re-load, same shape as the pre-v17 info_key bug). The recommended follow-up arc is a "shared-lib pass 2" of moderate scope (5 phases) before per-project deep validations run.

## Architecture inventory

### A.1 Per-project extractor architecture

All four projects pass post-consolidation invariants (D.5 verified):

| Project | extract.py LOC | handler count | handlers (alphabetized) |
|---|---:|---:|---|
| ezquake | 385 | 8 | asset_cvar_bindings, asset_loader_sites, cmdline, commands, cvars, hud_elements, keynames, macros |
| fte | 434 | 8 | asset_cvar_bindings, asset_loader_sites, cmdline, commands, cvars, ezhud, ezscript, macros |
| qwcl | 167 | 3 | cmdline, commands, cvars |
| mvdsv | 380 | 7 | cmdline, commands, cvars, info_keys, log_templates, protocol, qc_builtins |

Handler counts match spec exactly (8/8/3/7).

**Class-name convention** (`<Type><Project>Handler`):
- All 25 handler classes follow the convention EXCEPT three deliberate / accidental divergences:
  - `KeynamesEzquakeHandler` (ezquake/_handler_keynames.py:146) does NOT extend `Visitor` -- justified in the docstring (keys.c needs its own libclang Index + `-D__APPLE__` variant + minimal CLANG_ARGS that don't match the common one). Documented divergence; valid.
  - `AssetCvarBindingsHandler` (fte/_handler_asset_cvar_bindings.py:95) -- missing the `Fte` project tag.
  - `AssetLoaderSitesHandler` (fte/_handler_asset_loader_sites.py:490) -- missing the `Fte` project tag.
  The two FTE class names predate the consolidation arc's class-name convention codification. Cosmetic; no behavioral consequence.

### A.2 extractor_lib inventory

Five files, all Tier-1 infrastructure. No `handler_*.py` (consolidation invariant holds).

| File | LOC | Surface | Consumers |
|---|---:|---|---|
| `__init__.py` | 12 | docstring only; no re-exports | (none -- dotted imports throughout) |
| `_base.py` | 74 | `Handler` Protocol (process_file/finalize/setup) | **NONE** (dead -- see D.2.10 below) |
| `_visitor.py` | 162 | `Visitor` base class + `walk_tu_dispatch` | every `_handler_*.py` + every `extract.py` |
| `_resolve.py` | 47 | `resolve_fn_ref` (permissive policy) | mvdsv/_handler_commands.py + mvdsv/_handler_qc_builtins.py only |
| `clang_config.py` | 291 | per-engine `clang_args_*_for` flag profiles + `PARSE_OPTS` + `_STUBS_WINDOWS` | every `extract.py` |

Tier-2 (`extractor_lib/handler_<family>_*.py`) is intentionally empty pending fork onboarding.

### A.3 load-version.ts inventory

`apps/qw-oracle/scripts/load-knowledge/load-version.ts` (726 lines):

- `ADAPTERS` (line 173-282): full adapter dispatch table. All 15 entity types from `entities.type` CHECK are wired (cvar / command / macro / cmdline_param / keyname / hud_element / ruleset / token_primitive / asset_category / flag_bit / cvar_alias / protocol_message / info_key / log_template / qc_builtin). buildOverrides only on cvar / hud_element / ruleset.
- Array-to-dict normalization (line 308-333, post-Phase 2e MVDSV): handles new-shape Array<{name, ast, ...}> emitters from MVDSV's four new types. Belt-and-braces "dropped duplicate name" warning at line 325 fires on cross-shape collisions; cur today this catches the qc_builtin cross-scope collision pattern documented as a HANDOVER residual.
- `caseFoldMergeEntries` (line 689-726): merges AST-bearing source-truth name with help-JSON-lowercased name. Excludes `token_primitive` (case-sensitive `$G != $g`).
- `valid*` carve-outs (line 442-455): four predicates gated by `options.type ===`. See D.4 below.

### A.4 schema.ts CHECK constraint inventory

Captured by line; full enum sets cross-referenced with handler emissions in dimension D.3 below.

| Table.column | Allowed values | Schema line |
|---|---|---:|
| `entities.type` | cvar / command / macro / cmdline_param / keyname / hud_element / ruleset / token_primitive / asset_category / flag_bit / cvar_alias / protocol_message / info_key / log_template / qc_builtin (15) | 50 + 542 + 806 |
| `entities.source_state` | source_backed / source_retired / doc_only / dynamically_registered | 61 + 552 + 816 + 847 |
| `versions.parse_state` | ok / partial | 34 + 528 |
| `change_events.change_kind` | created / modified / deleted | 158 + 472 + 702 |
| `change_events.enrichment_source` | git / github_api | 168 |
| `source_state_transitions.reason` | initial_observation / removed_from_head / re_added / backfill_match / source_retired_at_version / manual_update | 181 + 728 |
| `asset_extensions.verification_status` | ast_verified / seed_only_with_ast_support / seed_only_no_ast_support / orphaned_historical | 336 + 574 |
| `asset_path_rules.rule_kind` | search_path / archive_precedence / cmdline_override / gamedir_behavior | 355 + 597 |
| `asset_cvar_bindings.load_trigger` | startup / on_demand / on_connect / on_map_load / unknown | 375 + 621 |
| `asset_cvar_bindings.confidence` | seed / auto / auto_confirms_seed / auto_orphan | 378 + 624 |
| `asset_loader_sites.load_trigger` | startup / on_demand / on_connect / on_map_load / unknown | 401 + 651 |
| `asset_loader_sites.path_source` | literal / cvar / computed / unknown | 404 + 654 + 765 |
| `asset_loader_sites.confidence` | certain / heuristic / intentionally_generic / unclassified | 407 + 657 + 768 |
| `relation_table` (source_overrides for asset surface) | asset_extensions / asset_path_rules / asset_cvar_bindings / asset_loader_sites | 465 + 695 |
| `source_overrides.override_kind` | struct_field_decl / call_site / header_declaration | 499 |
| `cvar_alias_versions.target_kind` | cvar / command / macro / serverinfo / userinfo | 1012 |
| `cvar_alias_versions.value_transform` | identity / bool_flip / scale / enum_remap / needs_review | 1019 |
| `cvar_alias_versions.default_drift_status` | same / differ_safe / differ_dangerous / unknown | 1024 |
| `cvar_alias_versions.semantic_confidence` | high / medium / low / needs_review | 1028 |
| `cvar_alias_versions.freshness_state` | alive / target_gone / mimics_lhs_gone / both_gone / unknown | 1034 |
| `gameplay_entity_defs.kind` | item / weapon / projectile (qw namespace; out of audit scope) | 1101 |
| `gameplay_mechanics.kind` | constant / env_hazard / player_stat / powerup_behavior / armor_model / death_rule / spawn_rule / dm_mode_rule (qw namespace; out of audit scope) | 1125 |
| `protocol_message_versions.kind` | svc / clc / nq / pext_fte_{bit,const,alias,marker} / pext_mvd_{bit,const,alias,marker} / protocol_version / protocol_extension_id (13) | 1219 + 1321 |
| `info_key_versions.scope` | userinfo / serverinfo / localinfo | 1240 |
| `log_template_versions.channel` | broadcast / client / console / system | 1256 |

## Findings

Findings are grouped by audit dimension (D.1-D.8) per the spec. Severity legend: **C** = critical (silent data loss / wrong DB content / byte-reproducibility violation / schema drift); **I** = important (representation gap / undocumented divergence / lift candidate with policy drift); **N** = nit (style inconsistency / small redundancy / no behavioural consequence).

### D.1 -- Sibling-handler shape divergences (Subagent 2)

| ID | Sev | Projects | Description | Disposition |
|---|:-:|---|---|---|
| D.1.1 | I | fte | `_handler_cvars.py:496-498`: `flags_raw` emits `None` when no flag tokens collected; post-v17 rule says empty string `""`. Cross-project sentinel-form contract broken; consumer queries `WHERE flags_raw = ''` skip FTE rows. | drain-in-arc (Phase 2 of follow-up) |
| D.1.2 | I | qwcl | `_handler_cvars.py:101,123`: `default_value` only `_strip_quotes`-ed (C escapes `\n`/`\t`/`\\`/`\"` survive verbatim); `flags_raw` emits `None` for empty. Two related normalization gaps. | drain-in-arc (Phase 2) |
| D.1.3 | C | ezquake, fte, qwcl | `_handler_commands.py:144`/`70`/`70` carry private strict-policy `_resolve_fn_ref`; mvdsv imports the lifted permissive `resolve_fn_ref` from `extractor_lib._resolve`. Strict copies return `None` on unresolved decl, lifted version falls back to cursor.spelling -- silent data divergence on the same source pattern. (Also surfaced as D.2.1; consolidate during follow-up.) | drain-in-arc (Phase 1) |
| D.1.4 | C | ezquake | `_handler_cvars.py:763-765`: `terminator_idx = max(l.rfind(";"), l.rfind(","))` -- the same `;`-or-`,` anchor pattern that MVDSV's `_handler_cvars.py:171-180` docstring explicitly warns against after fixing it at commit `8747ad9`. Trailing comments containing commas (e.g. `// example: "59.3327,18.0656"`) are silently truncated. Documented bug in a sibling not ported back. | drain-in-arc (Phase 2) |
| D.1.5 | I | fte, qwcl | Registration-API hoisting (`REGISTRATION_APIS` / `DETECTION_APIS` / `GROUP_CALL_NAMES` class tuples) present on ezquake + mvdsv (have named consumer forks: unezQuake, antilag-mvdsv); fte + qwcl bury API names in regex literals or string equality checks. Undocumented divergence rather than a bug -- but speculative hoisting violates "don't generalize without a concrete second consumer." | HANDOVER |
| D.1.6 | I | fte | `_handler_cmdline.py:105`: `name.startswith("-")` hard-coded; mvdsv exposes `PARAM_PREFIXES = ("-", "+")` to handle Quake-engine `+gamedir`-style switches. Verify whether FTE source has `+`-prefixed COM_CheckParm calls; if hits exist, widen filter. | drain-in-arc (Phase 4) -- verification first, then either widen or close as nit |
| D.1.7 | N | mvdsv | `_handler_cmdline.py:143` emits `containing_function`; ezquake / qwcl emit `enclosing_function`; fte emits `None`. Field-name divergence, same semantic content. | drain-now (small) |
| D.1.8 | N | fte | `_handler_commands.py` lacks `enter_function`/`exit_function` lifecycle hooks; `_handler_cmdline.py` emits `enclosing_function: None` always. Feature-coverage gap relative to siblings; not data loss. | HANDOVER |
| D.1.9 | N | ezquake | `_handler_cvars.py:617-620` finalize uses last-wins overwrite; ezquake commands and all other projects' cvars use first-wins. Per-file `_seen_names` collapses most cases, but the cross-file divergence is rarely-triggered. Inconsistent with sibling. | HANDOVER (verify identical output on current corpus first) |
| D.1.10 | C | mvdsv | `_handler_qc_builtins.py:387-406` dedups primitive rows by `(table_name, builtin_index)` but emits the per-version row's `name` as the comment-parsed `qc_name` (or prefix-stripped handler_fn). HANDOVER residual notes 4 names span `std_builtins` / `ext_builtins` / `ext_syscalls`. The `entities` table has UNIQUE(project, type, name) -- on upsert the SECOND qc_builtin row with a colliding `qc_name` gets silently dropped. Same shape as the pre-v17 info_key `*z_ext` bug; the handler does NOT use the Phase B `<bare>:<scope>` canonicalization that info_keys adopted (line 271 of `_handler_info_keys.py`). Today's loaded count (93) may be hiding 4 dropped variants. | drain-in-arc (Phase 2 -- pair with a schema migration if changing the entity name shape) |
| D.1.11 | I | mvdsv | `_handler_log_templates.py:42-44, 167` documents that format strings keep escapes in raw source-code form and consumers handle interpretation. This contradicts the post-v17 cvar `default_value` rule (cvars interpret C escapes at extraction time). The asymmetry may be intentional (log_template format strings carry semantically-meaningful `%`/`\n`) but is undocumented in the schema spec or SCHEMA.md. | drain-in-arc (Phase 5) -- document the asymmetry explicitly OR normalize. Decide based on consumer requirements. |
| D.1.12 | N | mvdsv | `_handler_protocol.py:77` `_kind_for` lives at module level instead of as a class-level dispatch table. Other MVDSV handlers hoist API tables to class-level (`API_OP_MAP`, `CHANNEL_TABLE`, `BUILTIN_TABLES`) for fork-override discoverability. Acknowledged in docstring (lines 167-169). | HANDOVER (defer until antilag-mvdsv pressures the override path) |
| D.1.13 | N | fte | `_handler_ezhud.py:97-123` `_resolve_default` walks tokens and stores the identifier name as-is when not in `DEFINE_CONSTANTS` (lines 53-65). No flag distinguishes a resolved-from-define from an unresolved identifier -- subtle data-quality issue if a future SPEED_-style #define is added but missed in DEFINE_CONSTANTS. | HANDOVER (re-scan plugins/ezhud for new #define constants on each FTE bump) |

### D.2 -- extractor_lib lift candidates (Subagent 1)

| ID | Sev | Projects | Description | Disposition |
|---|:-:|---|---|---|
| D.2.1 | C | ezquake (3), fte (2), qwcl (1) | Six private `_resolve_fn_ref` copies, three policy variants (FUNCTION_DECL-only / FUNCTION_DECL+VAR_DECL strict / FUNCTION_DECL+VAR_DECL+spelling-fallback permissive). Only mvdsv adopted the v17 lift. Locations: ezquake (commands:144 + macros:36 + hud_elements:93), fte (commands:70 + macros:87), qwcl (commands:70). Lifted `extractor_lib/_resolve.py:25` documents the permissive policy. (Same root finding as D.1.3.) | drain-in-arc (Phase 1, top priority) |
| D.2.2 | I | all 4 | `_read_extent` byte-identical across 13 live handlers (ezquakex6, ftex2, qwclx2, mvdsvx3+2 with trivial defensive guard variants). Lowest-risk highest-volume win. | drain-in-arc (Phase 3) |
| D.2.3 | I | ezquake, fte | `_handler_asset_loader_sites.py` and `_handler_asset_cvar_bindings.py` ~90% structurally identical between ezquake and fte. 17 helper functions byte-identical: `_classify_load_trigger`, `_is_dev_only`, `_category_from_extension`, `_category_from_enclosing`, `_conversion_slots`, `_extension_from_template`, `_resolve_semantic`, `_classify_parameterized_call`, `_extract_expression_snippet`, `_unary_op_token`, `_binary_op_token`, `_drill_to_decl_ref`, `_lookup_buffer_write_in_compound`, `_lookup_deref_assignment_in_compound`, `_classify_first_arg`, `_resolve_cvar_ref`, `_resolve_cvar_string_ref`. ~300 LOC duplication. Single largest reduction available. | drain-in-arc (Phase 3) -- biggest mechanical win |
| D.2.4 | I | all 4 | `_strip_quotes` byte-identical 4-line body across 8 live copies (ezquakex3, ftex1, qwclx1, mvdsvx3). | drain-in-arc (Phase 3) |
| D.2.5 | I | ezquake, fte, qwcl | `_literal_string` drifted across two policies: L-prefix-tolerant (admits `L"..."`) on ezquakex4 + ftex1 + ezquake/fte cmdline; L-prefix-rejecting on qwclx2 + ezquake commands + fte cmdline. The L-prefix path is a no-op on codebases without wide strings -- superset variant is safe to unify on. | drain-in-arc (Phase 3) -- verify outputs unchanged first |
| D.2.6 | I | ezquake, mvdsv | `_unescape_c_string` duplicated; mvdsv copy carries a stale "Mirrors extractor_lib/handler_cvars._unescape_c_string" docstring referring to a path that no longer exists post-consolidation. The "tiny payoff to share" rationale is now invalidated by the v17 default_value contract. | drain-in-arc (Phase 3) |
| D.2.7 | I | ezquake, mvdsv | `_normalize_flags_raw` + `_FLAG_NAME_RE` (`\bCVAR_[A-Z0-9_]+\b`) + (mvdsv-only) `_parse_flag_names` split between ezquake and mvdsv. Schema-v17 normalization is a cross-project contract -- keeping two copies invites drift. Adopting fte / qwcl onto the lifted version closes D.1.1 + D.1.2 as a side-effect. | drain-in-arc (Phase 2 -- bundles with D.1.1 + D.1.2) |
| D.2.8 | N | ezquake | `_resolve_enum_constant` duplicated within ezquake (macros + cmdline). Single-project; below the lift bar. | HANDOVER |
| D.2.9 | I | ezquake, mvdsv | `_strip_array_and_qualifiers` byte-identical across 3 copies (ezquake cvars + commands, mvdsv commands). | drain-in-arc (Phase 3) |
| D.2.10 | C | extractor_lib | `extractor_lib/_base.py` (74 lines) is dead code: zero importers (verified `grep -rn "from extractor_lib._base"` returns no matches). Only `__init__.py` and `extractor_lib/README.md` reference its existence. README claims `KeynamesEzquakeHandler` uses the `Handler` Protocol -- false; that handler extends `Visitor`. The post-consolidation "Tier 1 only" invariant is technically violated by carrying dead code in extractor_lib's published surface. | drain-now (delete + clean docstring) |
| D.2.11 | N | extractor_lib | `__init__.py` exports nothing; every importer uses dotted form. Adding re-exports would invite a second canonical import path. Current pattern is deliberate. | (no action -- informational) |

### D.3 -- Schema CHECK reachability (in-terminal + Subagent 3)

Cross-reference of CHECK enums against handler emissions. Verified end-to-end:

| Table.column | CHECK values | Reachable from handlers | Dead allow? |
|---|---|---|---|
| `entities.type` | 15 values | All 15 wired in ADAPTERS (load-version.ts:173-282) | None |
| `entities.source_state` | source_backed / source_retired / doc_only / dynamically_registered | source_backed + doc_only (handlers); source_retired (transitions); dynamically_registered (manual / unused today) | dynamically_registered may be dead-from-handler; reachable only through manual update |
| `protocol_message_versions.kind` | 13 values | All 13 from `_handler_protocol.py` `_kind_for` + `_handle_macro` (lines 233-261). Subdivides pext_fte/pext_mvd into `_marker`/`_bit`/`_const`/`_alias` via value_kind. | None |
| `info_key_versions.scope` | userinfo / serverinfo / localinfo | All 3 from `_handler_info_keys.py` `_classify_scope`. | None |
| `log_template_versions.channel` | broadcast / client / console / system | All 4 from `_handler_log_templates.py` `CHANNEL_TABLE` (line 110). | None |
| `asset_loader_sites.path_source` | literal / cvar / computed / unknown | All 4 reachable from both ezquake + fte handlers (`_handler_asset_loader_sites.py:611`/`631`). | None |
| `asset_loader_sites.confidence` | certain / heuristic / intentionally_generic / unclassified | All 4 reachable. | None |
| `asset_loader_sites.load_trigger` | startup / on_demand / on_connect / on_map_load / unknown | All 5 reachable from `_classify_load_trigger`. | None |
| `asset_cvar_bindings.confidence` | seed / auto / auto_confirms_seed / auto_orphan | Handlers emit `auto` only; `seed`/`auto_confirms_seed`/`auto_orphan` reachable from loader-side reconciliation (`build-asset-bundle.ts`). | None -- split is intentional |
| `cvar_alias_versions.target_kind` | cvar / command / macro / serverinfo / userinfo | ezscript handler emits `cvar`/`serverinfo`/`userinfo`. `command`/`macro` not yet emitted but ezscript is the only current emitter. | command/macro reachable from future extractors; not dead today |
| `cvar_alias_versions.value_transform` | identity / bool_flip / scale / enum_remap / needs_review | ezscript hardcodes `"identity"`. | bool_flip / scale / enum_remap / needs_review may be dead-from-extractor today; reachable only manually |
| `cvar_alias_versions.default_drift_status` | same / differ_safe / differ_dangerous / unknown | ezscript emits 3: `same`/`differ_dangerous`/`unknown`. **`differ_safe` is DEAD** at extraction layer (handler is conservative; manual review can promote per docstring lines 99-110). | **YES -- `differ_safe` reachable only via manual review** (D.3.1 below) |
| `cvar_alias_versions.semantic_confidence` | high / medium / low / needs_review | Manual; no extractor emits. | All 4 may be dead from extractors today |
| `cvar_alias_versions.freshness_state` | alive / target_gone / mimics_lhs_gone / both_gone / unknown | ezscript emits all 5. | None |
| `qw` namespace gameplay enums | (`gameplay_entity_defs.kind` 3 values; `gameplay_mechanics.kind` 8 values) | (out of audit scope -- separate extractor pipeline) | (not audited) |

| ID | Sev | Description | Disposition |
|---|:-:|---|---|
| D.3.1 | I | `cvar_alias_versions.default_drift_status` schema CHECK admits `differ_safe` but no extractor emits it (FTE `_handler_ezscript.py:99-110` documents the conservative policy: manual review can promote `differ_dangerous` -> `differ_safe`). If a manual-review tooling exists or is planned, leave as-is + add a comment in schema.ts referencing the operator-promotion contract. If no, remove from CHECK in a future revision. | HANDOVER (verify operator-promotion path; either document or remove) |

### D.4 -- `valid*` carve-outs in load-version.ts (in-terminal)

| ID | Sev | Description | Disposition |
|---|:-:|---|---|
| D.4.1 | I | `validInfoKey` (line 448) hardcodes the scope alphabet `(userinfo|serverinfo|localinfo)`. The same alphabet is duplicated in the schema CHECK on `info_key_versions.scope` (schema.ts:1240). If the schema widens (e.g., adding `extendedinfo` for some future fork), the regex must also widen -- and nothing enforces the synchronisation. | drain-in-arc (Phase 5) -- extract the alphabet to a constant exported by schema.ts and consume from load-version.ts |
| D.4.2 | I | `validLogTemplate` (line 454) hardcodes the channel alphabet `(broadcast|client|console|system)`. Same drift-risk pattern as D.4.1, schema CHECK on `log_template_versions.channel` (schema.ts:1256). | drain-in-arc (Phase 5) -- pair with D.4.1 |
| D.4.3 | I | `validIdentifier` (line 443) regex `/^[a-z0-9_.+\-]+$/` does NOT admit `:` separator -- blocks the future `<bare>:<scope>` canonical fix for qc_builtin (HANDOVER residual: 4 cross-scope name collisions). The `:` separator works for info_key today only because `validInfoKey` carves out a separate path; an analogous `validQcBuiltin` would need to be added before fixing the qc_builtin collisions. | HANDOVER (drain when qc_builtin canonicalisation arc lands) |

### D.5 -- Architecture invariants (in-terminal + Subagent 3)

Post-consolidation invariants verified:
- [ok] `extractor_lib/` contains exactly 5 files: `__init__.py`, `_base.py`, `_resolve.py`, `_visitor.py`, `clang_config.py`. NO `handler_*.py`.
- [ok] Per-project handler counts: ezquake=8, fte=8, qwcl=3, mvdsv=7 (matches spec exactly).
- ⚠ Class-name convention: 2 fte classes lack project tag (D.5.1, D.5.2 below -- same as A.1 footnote).
- [ok] All handlers extend `Visitor` except `KeynamesEzquakeHandler` (deliberate, justified in docstring).
- ⚠ `extractor_lib/_base.py` is dead code; structural invariant holds but the file is unused (D.2.10).

| ID | Sev | Projects | Description | Disposition |
|---|:-:|---|---|---|
| D.5.1 | N | fte | `AssetCvarBindingsHandler` (fte/_handler_asset_cvar_bindings.py:95) missing `Fte` project tag in class name. | drain-now (rename) |
| D.5.2 | N | fte | `AssetLoaderSitesHandler` (fte/_handler_asset_loader_sites.py:490) missing `Fte` project tag in class name. | drain-now (rename) |

### D.6 -- Driver shape divergences (in-terminal)

| ID | Sev | Projects | Description | Disposition |
|---|:-:|---|---|---|
| D.6.1 | N | ezquake, qwcl | `Config.set_library_file("libclang-18.so.1")` called in fte/extract.py:42 + mvdsv/extract.py:42 but NOT in ezquake/extract.py or qwcl/extract.py. Functional today on WSL via libclang's default resolution; convergence is hygiene only. | HANDOVER |
| D.6.2 | N | all 4 | Two patterns for handler registry: module-level dict literal `ALL_HANDLERS = {h.name: h for h in [...]}` (ezquake, qwcl) vs `collect_handlers(names="all")` function with lazy imports (fte, mvdsv). Both work. Convergence is code-hygiene. | HANDOVER |
| D.6.3 | N | ezquake | `_split_handlers` + dual-path code in `_process_one_file` (extract.py:97-160) retained for the keynames handler (the only one still using `process_file` instead of Visitor). One-consumer legacy path; could be lifted into Visitor with custom variant args. | HANDOVER |
| D.6.4 | N | mvdsv vs fte/ezquake | MVDSV chunk_size minimum is 1 (extract.py:338); FTE/ezquake use `max(4, ...)`. Reflects the smaller MVDSV file count (~50 .c). Functional. | (no action -- informational) |
| D.6.5 | N | qwcl | Serial-only (167 lines). Documented in docstring (small repo, no need for parallelism). Working as designed. | (no action -- informational) |

### D.7 -- Idempotency / determinism (smoke check, in-terminal)

Spec-prescribed scope: do not fully run Section 1 of the runbook. Smoke check via verification of post-consolidation invariants + recent F1 grid pass (per CLAUDE.md, MVDSV F1 grid all PASS/CLEAN as of 2026-04-27). Working tree DB carries post-v17 markers (info_key cross-scope `*z_ext:serverinfo` + `*z_ext:userinfo` both present; count 45). No regressions surfaced.

(no findings)

### D.8 -- OUT_OF_SCOPE.md and validation-fixtures (in-terminal)

| ID | Sev | Projects | Description | Disposition |
|---|:-:|---|---|---|
| D.8.1 | N | all 4 | `OUT_OF_SCOPE.md` present in all four projects (ezquake 61 lines / fte 93 / qwcl 51 / mvdsv 150). Last reviewed dates: ezquake/fte/qwcl 2026-04-26; mvdsv 2026-04-28. ezquake / fte / qwcl precede the consolidation arc -- content still valid (consolidation didn't change extraction surface) but the reviewed date should refresh on next per-project deep validation. | HANDOVER (refresh dates as part of per-project deep validations) |
| D.8.2 | I | ezquake, fte, qwcl | Only mvdsv has `validation-fixtures/` (allowlists, prefixes, runtime dump from Ciscon's 1.20-dev nicotinelounge.com). ezquake / fte / qwcl have no equivalent. ezquake's runtime cross-validation already happened pre-consolidation (Pass 1 closure documented in CLAUDE.md memory note); the absence of a `validation-fixtures/` directory means that Pass 1's allowlist + reference dump are not reproducible from the current tree. | HANDOVER (capture per-project Pass-1 runtime dumps as part of per-project deep validations) |

## Disposition summary

27 findings:

- **Drain-now (3):** D.1.7 (mvdsv field-name rename), D.2.10 (delete dead `_base.py`), D.5.1 + D.5.2 (rename two FTE classes -- count as one drain-now patch).
- **Drain-in-arc (17):** D.1.1, D.1.2, D.1.3, D.1.4, D.1.6, D.1.10, D.1.11, D.2.1, D.2.2, D.2.3, D.2.4, D.2.5, D.2.6, D.2.7, D.2.9, D.4.1, D.4.2.
- **HANDOVER (10):** D.1.5, D.1.8, D.1.9, D.1.12, D.1.13, D.2.8, D.3.1, D.4.3, D.6.1, D.6.2, D.6.3, D.8.1, D.8.2.
- **Informational (3):** D.2.11, D.6.4, D.6.5.

The follow-up arc spans 5 phases (see `docs/superpowers/plans/2026-04-28-cross-extractor-shared-lib-arc.md`):

1. **Phase 1 -- `resolve_fn_ref` lift adoption** (D.2.1 / D.1.3): swap 6 private copies with the lifted permissive version. Verify per-version row counts unchanged on resolved decls; capture any new rows (unresolved decls now surfacing as `cursor.spelling`).
2. **Phase 2 -- cvars normalization convergence + qc_builtin canonical-name fix** (D.1.1 / D.1.2 / D.1.4 / D.1.10 / D.2.6 / D.2.7): lift `_unescape_c_string` + `_normalize_flags_raw` + `_FLAG_NAME_RE` to extractor_lib; adopt across all four projects' cvars handlers; fix ezquake trailing-comment anchor bug; canonicalize qc_builtin name to `<bare>:<table_name>` (parallels info_key Phase B fix) -- schema migration territory.
3. **Phase 3 -- string-shape helper lifts** (D.2.2 / D.2.3 / D.2.4 / D.2.5 / D.2.9): lift `_read_extent`, `_strip_quotes`, `_literal_string` (L-tolerant), `_strip_array_and_qualifiers`; lift the 17 asset-handler helpers to a dedicated `extractor_lib/_asset.py`.
4. **Phase 4 -- FTE cmdline param-prefix verification** (D.1.6): grep + decide widen vs HANDOVER.
5. **Phase 5 -- schema/loader alphabet sync + log_template escape doc** (D.4.1 / D.4.2 / D.1.11): export the scope and channel alphabets from schema.ts; consume in load-version.ts. Document the log_template raw-escape preservation contract in SCHEMA.md (or normalize, depending on consumer requirements).

Plus 4 small drain-now patches before the arc: D.1.7, D.2.10, D.5.1+D.5.2.

## Architecture verdict

The post-consolidation arc (commits 5b943d4 -> 8115b48) achieved its structural goal: all four projects share the same canonical `<project>/_handler_*.py` shape, and `extractor_lib/` is correctly lean. But the lift prototype that motivated v17 (`resolve_fn_ref` lift after MVDSV's commands/qc_builtins divergence) was applied only to MVDSV; six private copies remain across the other three projects. That's the audit's central finding. Layering the consolidation completion arc (this audit's follow-up plan) is the correct sequencing -- it lands the "shared-lib pass 2" before the per-project deep validations run, so each per-project pass starts from a cleaner shared baseline rather than re-discovering the same lift candidates four times.

Architecturally, no findings indicate the post-consolidation invariants are wrong. The remaining work is extending v17's "lift-on-second-consumer" rule to its natural end-state across the helpers that have always been duplicated, plus completing the half-finished `_resolve_fn_ref` migration. Nothing in the audit suggests the three-tier (shared / family-base / project-private) model is misshapen; Tier-2 is correctly empty pending unezQuake / antilag-mvdsv onboarding.
