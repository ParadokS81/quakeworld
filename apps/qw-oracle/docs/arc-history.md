# QW Oracle -- Arc history

Append-only chronicle of shipped arcs. One paragraph per arc, oldest at the bottom. New arcs prepend at the top.

For current state, see `OVERVIEW.md` (living map) and `HANDOVER.md` (active backlog). For why arcs shipped in the order they did, read backwards from the top.

---

## 2026-04-29 -- Zero-debt-before-KTX arc

Six-phase qw-oracle hygiene arc. Trailing-comment look-ahead misattribution fixed (Phase 1, ~34% of ezquake cvar trailing comments were wrong; 281->145 non-empty rows at HEAD); 14-tag historical re-walk under post-Phase-6 + post-Phase-1 handlers (Phase 3); Phase 6 ezquake exemptions (1) + (3) closed (source_state two-level model documented as intentional, historical-tag stale shapes resolved). Cross-project byte-reproducibility check: FTE / QWCL / MVDSV all clean; ezquake clean within-day, one cross-day non-determinism on `variables-ast.json` (140-line swap, HANDOVER follow-up). Foundation clean for KTX onboarding. Memory: `project_zero_debt_before_ktx_arc.md`.

## 2026-04-28 -- Cross-extractor Phase 6 (FTE convergence + grid uplift)

Recovers 1085 FTE source-backed cvars from `flags_raw IS NULL` to empty-string sentinel; lifts ezhud merge + commands to use `_normalize_flags_raw`; refreshes 56 quality-grid probes; closes 2 of 3 ezquake structural exemptions (the third -- `r_bloom_*` legacy boolean shape -- defers as joint QWCL-shape positive-contract arc). Plan: `docs/superpowers/plans/2026-04-28-cross-extractor-phase6-fte-convergence-grid-uplift.md`.

## 2026-04-28 -- Per-project Mode B validation (ezQuake / FTE / QWCL)

Three deep validations in parallel via the `validate-extractor` skill against `VALIDATION-RUNBOOK.md`. 0 critical, 6 important, 13 nits. Surfaced S-01 (FTE Phase 2 normalization gap), S-03 (uneven F1 probe coverage), F-EZQ-01 (trailing-comment misattribution -- closed by Zero-debt arc 2026-04-29), F-EZQ-03 / F-QWCL-06 (`registration_file` column misnamed). Synthesis report: `docs/superpowers/reviews/2026-04-28-per-project-validation-synthesis.md`.

## 2026-04-28 -- Cross-extractor pattern audit follow-up arc

Five phases shipped (`566c5be` -> `1a00704`). `resolve_fn_ref` lifted to `extractor_lib/_resolve.py` across 6 private copies; `extractor_lib/_cvar_shared.py` created (`unescape_c_string`, `normalize_flags_raw`, `parse_flag_names`); `extractor_lib/_source.py` created (string-shape helpers, 19 handler files converted, net -402 LOC); FTE cmdline single-prefix policy documented; `INFO_KEY_SCOPES` + `LOG_TEMPLATE_CHANNELS` exported from `schema.ts`. Schema bumped to **v18** (qc_builtin canonical name carries `:<table_name>` suffix). Two follow-ups deferred to HANDOVER.

## 2026-04-28 -- Architecture consolidation

ezQuake handlers relocated from `extractor_lib/handler_*.py` to `ezquake/_handler_*.py` so all four projects share the canonical project-private shape. `extractor_lib/` reduced to Tier-1 infrastructure only. Three-tier handler architecture (shared / family-base / project-private) documented in `EXTRACTOR-PLAYBOOK.md`; fork-vs-port branch added. Fork-override hooks exposed on ezQuake + MVDSV handlers for unezQuake / antilag-mvdsv onboarding via subclassing. Plan: `docs/superpowers/plans/2026-04-28-extractor-architecture-consolidation.md`.

## 2026-04-28 -- Phase 2e MVDSV follow-up arc

5 commits `f7b2a7a` -> `72a1630`. Schema v15 -> **v17**: info_key canonical name carries `<bare>:<scope>` suffix (cross-scope dups survive); protocol_message kind taxonomy widens 6 -> 13; log_template gains `all_call_sites_json`; cvar `flags_raw` canonicalises to empty string for absent / `0` / `CVAR_NONE` (1417 historical rows normalised); cvar `default_value` interprets standard C escapes (16 rows touched). F1.*.count probes converted from floor checks to equality assertions.

## 2026-04-27 -- Phase 2e MVDSV Layer 1

Server-side Layer 1 SHIPPED at 2026-01-04 mvdsv head snapshot (`f816d28`). Schema v13 -> **v15** (4 new entity types: `protocol_message`, `info_key`, `log_template`, `qc_builtin`). 1235 entities loaded; all source_backed (MVDSV ships no help-JSON). Three-variant TU dispatch (server-base + server+Win + server+Linux). Runtime-validated against Ciscon's 1.20-dev nicotinelounge.com dump: zero extractor gaps. New patterns 9-13 added to playbook. 26 commits `320f5de` -> `c158da5`. Plan: `docs/superpowers/plans/2026-04-27-mvdsv-layer1-extraction.md`.

## 2026-04-27 -- Game mechanics Layer 1 arc 1 (id1 baseline)

Schema v13 -> **v14** (gameplay_sources / gameplay_entity_defs / gameplay_mechanics; `qw` namespace, no version arc). 37 entity defs + 41 mechanic rows from `qwcl-original/QW/progs/`; every row source_ref-cited. 4 new MCP tools (`lookup_gameplay_entity`, `lookup_mechanic`, `search_gameplay_entities`, `search_mechanics`). Snapshot at `apps/slipgate-app/src/lib/config/data/qw-gameplay.json`. KTX overrides + sub_select_spawn_point + clan_arena algorithmic mechanics queued as arc 2.

## 2026-04-27 -- Map knowledge layer

Schema v12 -> **v13** (pure-additive `maps` table). 254 maps loaded (38 id1 stock from pak0/pak1 + 216 from maps.qw.nu/base/). Two new MCP tools (`lookup_map`, `search_maps`). Snapshot at `apps/slipgate-app/src/lib/config/data/qw-maps.json`. Plan: `docs/superpowers/plans/2026-04-26-qw-oracle-map-knowledge.md`.

## 2026-04-27 -- FTE Phase 2d-bundle

Asset extraction at FTE build-6698. 28 asset_category + 61 extensions + 13 path_rules + 25 cvar_bindings + 717 loader_sites. Five hand-authored seed YAMLs at `apps/qw-oracle/scripts/extractors/fte/seeds/` + two AST handlers + path-rules verifier. Quality grid 30/30 (16 regression + 14 anomaly). Three Path-1 fixtures green. Plan: `docs/superpowers/plans/2026-04-26-fte-phase-2d-bundle.md`.

## 2026-04-26 -- FTE Phase 2d-core

build-6698 (SHA `35843773`). Schema v10 -> **v11** (additive `source_root` TEXT column on cvar/command/macro version tables). Entities: 2482 cvar (1397 engine + 1085 `plugin:ezhud`) / 556 command / 67 macro / 108 cmdline_param. Pass 1 runtime cvarlist diff closed: 217 runtime-only cvars recovered via Pattern 3 fix (cvar_t nested inside container struct/array initializers); residual 114 all explained (non-ezhud plugins, dynamic registration, runtime-synthesized names). Plan: `docs/superpowers/plans/2026-04-26-fte-layer1-extraction-2d-core.md`.

## 2026-04-26 -- Cross-engine alias schema (ezscript)

Schema v11 -> **v12** (CHECK widening on `entities.type` to admit `cvar_alias`; new `cvar_alias_versions` table). 38 alias entities loaded at FTE@build-6698 from `plugins/ezscript/ezscript.c`: 25 alive / 7 lhs_gone / 4 doc_only / 1 both_gone / 1 rhs_gone. Field set: `target_project / target_kind / target_name / value_transform / default_drift_status / freshness_state / verified_target_version / verified_mimics_version`. Spec: `docs/superpowers/specs/2026-04-26-cross-engine-alias-schema-design.md`.

## 2026-04-25 -- QWCL 2.33 (first cross-codebase port)

Schema v9 -> **v10** (project CHECK widened across 8 tables). 380 entities (187 cvar / 121 command / 72 cmdline_param). Three QWCL-specific handlers under `apps/qw-oracle/scripts/extractors/qwcl/` reuse the shared Visitor + walk_tu_dispatch from `extractor_lib`. Foundational for slipgate-app's planned config converter ("pandoc for configs"). Loader gates established: `PROJECT_VERSION_ALIASES`, `PROJECT_HAS_ASSET_BUNDLE`, per-project `ENTITY_JSON_FILES`.

## 2026-04-25 -- qw-config dissolution (Half 1 + Half 2)

Extractors relocated from `packages/qw-config/scripts/` to `apps/qw-oracle/scripts/extractors/<project>/`. Slipgate consumer reads `apps/slipgate-app/src/lib/config/data/<project>-*.json` directly via the new `build-snapshot` CLI (replaces the legacy slipgate-via-`packages/qw-config/` path). Seed YAMLs follow extractors. `packages/qw-config/` retired.

## 2026-04-25 -- ezQuake deep-time walk to v3.0 floor

14 ezQuake versions clean: v3.0, v3.0.1, 3.1, 3.2, 3.2.1, 3.2.2, 3.2.3, 3.6.0, 3.6.1, 3.6.2, 3.6.5, 3.6.6, 3.6.8, 3.6.9, plus head. Pre-3.0 era explicitly de-scoped (community-security framing -- pre-3.6 has known attack vectors). Walk infrastructure shipped: `extract-tag --skip-prune` + `prune-cross-type-orphans` finalize CLI + per-version `backfill_match` detection. Schema v8 -> **v9** (`source_retired_at_version` added to transitions reason CHECK).

## 2026-04-25 -- Layer 3 concept notes bootstrap

`concept-notes/` directory established with template (`README.md`) + stewardship playbook (`OPERATIONS.md`). Provenance frontmatter schema, two-path curation framing (community-curated imports vs newly-earned authoring), 6 recognized note shapes, tiered voice table. Four note bodies landed during the 3.6.5->3.6.6 shakedown walk: `client-side-server-exec-allowlist`, `skywind-animated-skyboxes`, `completing-legacy-fte-protocol-extensions`, `ruleset-anti-script-restriction-pattern`. Concept-notes count: 6 (now 9 with subsequent additions).

## 2026-04-23 -- Extraction-review skill + CLI

Stateless findings generator over Layer 1 tables. Five finding modules (additions / retirements / semantic-crossings / unclassified / source-invisible). User-global `extraction-review` skill drives interactive walk; CLI emits findings JSON + draft markdown at `docs/reviews/`. Spec: `docs/superpowers/specs/2026-04-23-extraction-review-design.md`. Workstream A tweaks (cluster detection / cross-walk / semantic-match / cross-codebase): `docs/superpowers/specs/2026-04-24-extraction-review-skill-tweaks.md`.

## 2026-04-22 -- Knowledge-service realignment roadmap

Pass 1 + Pass 2 shipped: per-entity-type doc (`docs/entity-types.md`), verification-status field as first-class concept (`ast_verified` / `seed_only_with_ast_support` / `seed_only_no_ast_support` / `orphaned_historical`). Asset reference-resolution graph design (research-foundation, not yet implemented). Roadmap spec: `docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md`.

## 2026-04-18 -- Knowledge-service Layer 1 schema + loader

Schema v1 -> v8 across the 2c / 2c.5 / 2c.6 sub-phases. ezQuake fully loaded at head across 10 entity types (3849 entities at the time). Loader pipeline (`scripts/load-knowledge/`) with `load-version`, `load-assets`, `diff`, `enrich` CLIs. Seed-first + AST auto-pass reconciliation. Spec: `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md`. Plan: `docs/superpowers/plans/2026-04-18-qw-knowledge-loader-phase-2b.md`.

## 2026-04-14 -- Knowledge service POC

Initial design: three data layers (Layer 1 source-extracted facts, Layer 2 chat corpus, Layer 3 curated concept notes), MCP serving surface, snapshot distribution to slipgate-app. Spec: `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`. Plan: `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md`. POC validated libclang extraction path; full implementation followed.
