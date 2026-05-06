# 2026-05-06 -- KTX Onboarding Cross-Project Audit (5-engine post-KTX)

**Date:** 2026-05-06
**Mode:** Phase 7 cross-project audit (KTX onboarding arc)
**Schema baseline:** v18 + KTX migrations 009 / 010 / 011
**Architecture baseline:** post-KTX-Phase-6 (5-engine lineup; commit `e0133248` lands match_event handler)
**Working tree:** main; KTX phase-7 work in progress (quality-grid + JSONB extensions + idempotency-ktx.sh)
**Validator:** Claude (Phase 7 Task 7 dispatch)
**Spec:** `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` + `docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md`

## Context

KTX is the 5th engine onboarded into qw-oracle Layer 1 (after ezQuake / FTE / QWCL / MVDSV). Phases 0-6 of the KTX onboarding arc shipped: doctrine fixes (Phase 0), depth-1 #include lift (Phase 1), four Pass-1 entity handlers (Phase 2), modes handler with Phase 5.5 Pattern 13 retrofit (Phase 3), gameplay taxonomies (Phase 4), gameplay tables (Phase 5), and the XSD-driven match_event handler (Phase 6). This Phase 7 cross-project audit verifies KTX onboarding does not break prior-engine invariants and surfaces any new sibling-handler divergences. The 2026-04-28 4-engine audit produced 27 findings (4 critical / 16 important / 7 nits); this 5-engine post-KTX audit was scoped to <15 findings if Phases 0-6 landed cleanly.

## D.1 -- F1 + F2 grid status across 5 projects

| Project | F1 PASS | F1 FAIL | F2 CLEAN | F2 FOUND | Notes |
|---|---:|---:|---:|---:|---|
| ezquake | 122 | 1 | 4 | 4 | 1 pre-existing FAIL: `F1.ezquake.anchor.doc_only_count` actual=183, expected=194; F2 anomalies are pre-existing (s_stereo flickering / 11 missing-citation rows / gl_lightmode ping-pong / 183 informational doc_only crosstab) |
| fte | 123 | 0 | 19 | 0 | All clean. |
| qwcl | 123 | 0 | 19 | 0 | All clean. |
| mvdsv | 123 | 0 | 19 | 0 | All clean (F2.mvdsv.* probes informational with channel/scope/kinds counts). |
| ktx | 127 | 0 | 19 | 0 | All KTX F1 floor + gameplay_kind + anchor probes PASS at exact equality (cvar=260, command=358, info_key=7, log_template=1195, match_event=7; 13 monsters, 27 game_modes, 317 mode_defaults, 5 election_types, 27 death_rules, 3 score_systems, 31 drop_items, 15 loc_macros, 21 teamplay_messages). |

**Key findings:** No prior-engine F1 probe regressed post-KTX. The single ezquake FAIL is pre-existing baseline drift (probe `expected=194` hardcoded; live DB has 183). Verified via `git log apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` -- the doc_only_count probe predates the KTX arc. Anomalies on ezquake are all pre-existing.

Findings (severity): D.1.1 (I) ezquake doc_only_count FAIL is stale anchor.

## D.2 -- Architecture invariants

`extractor_lib/` contents (Tier-1 + Tier-2): 9 production files (`_visitor.py`, `_resolve.py`, `_source.py`, `_cvar_shared.py`, `_help_json_blame.py`, `_help_json_classification.py`, `_help_json_pr_digest.py`, `clang_config.py`, `__init__.py`). The Phase 1 KTX onboarding lift (`_source.py`) replaces the dead `_base.py` flagged in 2026-04-28 audit D.2.10. No KTX-named branches exist in `_visitor.py` / `_source.py` / `_resolve.py` / `_cvar_shared.py`; the only KTX presence in `extractor_lib/` is `clang_config.py:309` `clang_args_ktx_for(...)` -- standard per-engine pattern matching `clang_args_for` (ezquake) / `clang_args_qwcl_for` / `clang_args_fte_for` / `clang_args_mvdsv_for`.

Per-project handler counts (verified by `ls _handler_*.py`):

| Project | Handlers | Notes |
|---|---:|---|
| ezquake | 8 | matches 2026-04-28 audit |
| fte | 8 | matches |
| qwcl | 3 | matches |
| mvdsv | 7 | matches |
| ktx | 8 | new: cvars + commands + info_keys + log_templates + modes + gameplay_taxonomies + gameplay_tables + match_events |

**Class-name convention.** All 8 KTX handlers carry the `Ktx` project tag, but two distinct shapes are used:

- `<Type>KtxHandler`: `CvarsKtxHandler`, `InfoKeysKtxHandler`, `CommandsKtxHandler`, `LogTemplatesKtxHandler` (matches the established `<Type><Project>Handler` convention from 2026-04-28 D.5).
- `Ktx<Type>Handler`: `KtxModesHandler`, `KtxGameplayTaxonomiesHandler`, `KtxGameplayTablesHandler`, `KtxMatchEventsHandler` (Pass-5 / Pass-4.5 handlers).

Findings: D.2.1 (N) Within-KTX class-name shape divergence -- 4 follow `<Type>KtxHandler`, 4 follow `Ktx<Type>Handler`. Cosmetic; no behavioral consequence.

**Tier-1 invariant.** All 7 libclang KTX handlers extend `Visitor` per D3. `_handler_match_events.py` (line 120: `class KtxMatchEventsHandler:`) is the documented carve-out per D3 amendment 2026-05-05 (XSD-driven; standalone with duck-typed lifecycle stubs). Per F28, the carve-out implements 7 lifecycle methods + setup + finalize.

## D.3 -- Sibling-handler shape divergences (KTX as 5th engine)

Comparing KTX cvars / commands / info_keys / log_templates against MVDSV (closest cross-codebase port template per D3):

**`flag_raw` / `default_value` normalization (post-v17 contract).**
- KTX cvars (`_handler_cvars.py:162-163`) emit `flags_raw=None`, `flag_names=None` because KTX has no source-side flag system (`RegisterCvar*` API takes no flags arg). Justified divergence; documented in handler docstring lines 31-35. NOT a normalization gap -- it is correct absence.
- MVDSV cvars (`_handler_cvars.py:193-216`) emit `flags_raw=""` (empty string) on no-flags case via `normalize_flags_raw` per post-v17 contract.
- KTX `default_value`: `None` for `RegisterCvar` (no-default form, ~181 rows per F1 amendment); literal string for `RegisterCvarEx`. F1 amendment reframes `default_value IS NULL` as the COMMON case in KTX (~61% of cvars), not the diagnostic exception. No C-escape interpretation gap (KTX defaults are simple; the tactical raw-extent fallback at line 140-147 preserves source bytes).

**`on_change` handler emission.**
- KTX: not emitted (the `RegisterCvar*` API has no on_change parameter slot). Justified absence.
- MVDSV: emitted via `Cvar_Register*` 4th arg field-walk. Different API surface.

**`source_state` assignment.**
- All 5 projects route through `entity.source_state = 'source_backed'` in their loaders. KTX has no help-JSON (verified by handler docstring `_handler_cvars.py:52-54`); every KTX entity is source-backed by definition. No `doc_only` rows for KTX (confirmed in F2 anomaly grid: `doc_only_crosstab: no doc_only entities`).

**Dedup convention (per-file `_seen_in_file`, full canonical name post-Pattern-14).**
- KTX cvars: `_seen_in_file` set keyed on bare cvar name (handler docstring line 34). Matches MVDSV cvars (line 159).
- KTX commands: `_seen_in_file` keyed on FULL canonical name (post-D7 suffix); confirmed at `_handler_commands.py:35, 277, 297`. Matches the convention codified for cross-namespace commands.
- KTX log_templates: `_seen_in_file` set keyed on canonical (file + format-hash); confirmed at `_handler_log_templates.py:112-180`. Matches MVDSV log_templates.

**Pattern 14 suffix application.**
- KTX commands use `:frogbot:std` (39 rows verified) and `:frogbot:editor` per D7. F2 amendment: 0 live collisions at canonical-1.46 master HEAD between std and editor (was 25 in original Pass-2 sketch); suffixes are now defensive API-surface markers per the F2 amendment.
- KTX info_keys use `:userinfo` suffix (7 rows verified, all star-keys: `*at:userinfo`, `*is:userinfo`, `*ml:userinfo`, `*mm:userinfo`, `*mp:userinfo`, `*mt:userinfo`, `*mu:userinfo`).

**JSONB column population (D14).**
- All KTX loaders pass JS values directly. F1.jsonb_columns_not_strings probe extended to cover `match_event_versions.{attributes_json,emission_call_sites_json}`, `gameplay_mechanics.{props_json,ruleset_gate_json}`, `gameplay_entity_defs.{props_json,ruleset_gate_json}` (Phase 7 Task 4; quality-grid.ts:243-246). Probe runs in ezquake grid (cross-project anchor); returns PASS.

Findings: D.3.1 (N) `_stats.election_type.source_total` in `gameplay_taxonomies` handler is parallel-aggregator-naive (yields 4x under `--workers 4`; clean under `--workers 1`). Stat-only; the actual `count` field is correctly deduped to 5. The `match_events` handler is the documented carve-out and is not part of the cross-handler comparison.

## D.4 -- Schema CHECK reachability for new KTX widenings

Verified against dev DB:

| Widening | Handler emits | DB row count | Status |
|---|---|---:|---|
| `log_template_versions.channel` += `'logfile'` | `_handler_log_templates.py:7` (channel='logfile' for `log_printf`) | 16 | PASS |
| `entities.type` += `'match_event'` | `_handler_match_events.py` | 7 | PASS |
| `gameplay_entity_defs.kind` += `'monster'` | `_handler_gameplay_tables.py` | 13 | PASS |
| `gameplay_mechanics.kind` += `'game_mode'` | `_handler_modes.py` | 27 | PASS |
| `gameplay_mechanics.kind` += `'mode_default'` | `_handler_modes.py` | 317 | PASS |
| `gameplay_mechanics.kind` += `'election_type'` | `_handler_gameplay_taxonomies.py` | 5 | PASS |
| `gameplay_mechanics.kind` += `'score_system'` | `_handler_gameplay_tables.py` | 3 | PASS |
| `gameplay_mechanics.kind` += `'drop_item'` | `_handler_gameplay_tables.py` | 31 | PASS |
| `gameplay_mechanics.kind` += `'loc_macro'` | `_handler_gameplay_tables.py` | 15 | PASS |
| `gameplay_mechanics.kind` += `'teamplay_message'` | `_handler_gameplay_tables.py` | 21 | PASS |
| `death_rule` (already in enum pre-KTX) | `_handler_gameplay_taxonomies.py` | 27 | PASS |

All 7 new gameplay_mechanics kinds emitted by KTX handlers. `death_rule` was already in the enum pre-KTX (per F8); KTX adds the first 27 source-extracted rows. Migration files renamed at execution time per D5 amendment (slot collision with qwiki's `008_community_schema.sql`); shipped as 009 / 010 / 011.

Findings: none.

## D.5 -- valid* carve-outs survive

Phase 2 execution surfaced F24 (validCommand gap blocking `:frogbot:std` / `:frogbot:editor` Pattern-14 suffixes); fixed inline. Verified post-fix:

- `validInfoKey` carve-out: KTX info_keys with `*name:userinfo` shape -- 7 rows in dev DB (all 7 expected star-keys present). Match.
- `validLogTemplate`: dev DB has 16 KTX rows with channel='logfile'. Channel admits the new value.
- `validCommand` (added at F24 fix): dev DB has 39 KTX commands with `:frogbot:` suffix.

Findings: none.

## D.6 -- Idempotency + reproducibility

Section 1.1 reproducibility check (re-run extractor):
- `--workers 1` (serial): empty diff against HEAD. Clean.
- `--workers 4` (parallel): 1-byte diff in `ktx-gameplay-taxonomies-ast.json` -- `_stats.election_type.source_total: 5` (HEAD/serial) vs `20` (parallel). The actual `rows` array is byte-identical; only the pre-dedup stat metric differs. Verified twice against `--workers 4 --handlers gameplay_taxonomies`.

Idempotency probe artifact:
- `apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh` exists, executable (3265 bytes; `-rwxr-xr-x`). Asserts zero row-count drift + zero content-hash drift across all KTX-scoped tables (entities, cvar_versions / command_versions / info_key_versions / log_template_versions / match_event_versions, gameplay_entity_defs, gameplay_mechanics).

Findings: D.6.1 (I) `gameplay_taxonomies` handler `source_total` stat is parallel-naive. Specifically: under `--workers 4`, `len(raw_election_rows)` at line 385 of `_handler_gameplay_taxonomies.py` returns 20 (5 election rows x 4 workers, since `progs.h` is included by every TU). The `count` field correctly dedups to 5; the `source_total` field reflects pre-dedup totals. NOT a data correctness issue but breaks Section-1.1 byte-reproducibility under default `--workers 12`. Workaround today: serial-default for handlers that emit per-TU enum walks.

## D.7 -- F28 transition-scan exclusion-list regression probe

Per Critical Rule 6: enumerate every `*_versions` table; verify `source_file` column existence reconciles against `load-version.ts` exclusion list.

Dev DB has 16 `*_versions` tables. Per-table `source_file` column existence:

| Table | source_file column | In exclusion list? | Status |
|---|:---:|:---:|---|
| asset_category_versions | NO | YES | OK |
| cmdline_param_versions | YES | NO | OK |
| command_versions | YES | NO | OK |
| cvar_alias_versions | YES | NO | OK |
| cvar_versions | YES | NO | OK |
| flag_bit_versions | YES | NO | OK |
| hud_element_versions | YES | NO | OK |
| info_key_versions | YES | NO | OK |
| keyname_versions | YES | NO | OK |
| log_template_versions | YES | NO | OK |
| macro_versions | YES | NO | OK |
| match_event_versions | NO | YES | OK |
| protocol_message_versions | YES | NO | OK |
| qc_builtin_versions | YES | NO | OK |
| ruleset_versions | YES | NO | OK |
| token_primitive_versions | YES | NO | OK |

Exclusion list at `apps/qw-oracle/scripts/load-knowledge/load-version.ts:588`: `options.type !== 'asset_category' && options.type !== 'match_event'`. Both excluded types' versions tables lack `source_file`; all 14 included types' versions tables have `source_file`. **Reconciliation: PERFECT MATCH. No mismatch.**

Findings: none. Regression gate documented as ongoing watch -- any future entity type with non-C-source truth (XSD, JSON manifest, asset bundle, etc.) MUST add `source_file` column OR be added to the exclusion list to avoid `transitionScan` SELECT failures.

## D.8 -- HANDOVER deferrals

Confirmed:

- **Depth-N Pattern 6 revisit** (D4 amendment + F11 amendment + F26): captured at `HANDOVER.md:29` as small followup ("D4 depth-N Pattern 6 lift revisit"). Trigger: when a 2nd engine surfaces a depth-2+ macro dependency, OR when the Phase 5 fallback dict needs to grow beyond current 3 entries. Sized as small arc (~1-2 hour scope). PRESENT.

- **F22 doctrine fix survival** (Phase 0 obligation): verified at `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md:567` (dusty-ktx tree-sitter scoped to `qcsrc/`) and `:576` (revision history captures the F22 fix landing 2026-05-05). No `tree-sitter (KTX)` / `KTX (tree-sitter)` framing remains. F22 doctrine fix HOLDS.

- **F19 doctrine fix survival** at the four named sites:
  - `apps/qw-oracle/scripts/extractors/CLAUDE.md:25`: now reads "libclang for C/C++ ports (ezquake, fte, mvdsv, qwcl, KTX-canonical); tree-sitter is reserved for the dusty-ktx fork's qcsrc/" -- correct.
  - `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md:632`: now reads "the dusty-ktx fork includes a qcsrc/ QuakeC tree (canonical KTX is pure C)" -- correct.
  - `apps/qw-oracle/OVERVIEW.md`: not grep-checked here (scope creep); covered by Phase 8 obligation.
  - User-memory `project_extraction_pipeline_vision.md`: not grep-checked here (out of repo scope; covered by F19 phase ownership in Phase 0).

- **F23 / F27 / F29 probe-spec-drift class** (Phase 8 PLAYBOOK candidate per F29 disposition): all three findings document the same drift pattern (Phase MD probe wording vs live data). Disposition: F23 + F27 + F29 are deferred to Phase 8 EXTRACTOR-PLAYBOOK addition documenting "Anchor probe authors verify predicates against live dev DB before shipping." All three findings have phase ownership = Phase 8 in `review-findings.md` Phase ownership table.

Findings: D.8.1 (I) F19 site sweep at OVERVIEW.md not re-verified by this audit (Phase 8's obligation to verify). Recommended Phase 8 verification step: `grep -nE "tree-sitter" apps/qw-oracle/OVERVIEW.md` -- confirm zero KTX-tree-sitter references survive.

## Findings table

| ID | Sev | Projects | Description | Disposition |
|---|:-:|---|---|---|
| D.1.1 | I | ezquake | `F1.ezquake.anchor.doc_only_count` FAIL: live DB=183, probe `expected=194` (quality-grid.ts:1691). Pre-existing baseline drift; not a KTX regression. Probe expected value was set when ezquake doc_only count was 194; subsequent Layer-1-arc adjustments dropped 11 doc_only entities without updating the anchor. | drain-now (re-anchor probe to current count OR investigate why 11 entities were lost; recommended re-anchor since pre-existing) |
| D.2.1 | N | ktx | KTX handler class-name shape inconsistent: 4 use `<Type>KtxHandler`, 4 use `Ktx<Type>Handler`. Cosmetic only; no behavioral consequence. | HANDOVER (defer to a future cosmetic-cleanup pass; matches pattern from 2026-04-28 D.5.1 / D.5.2 FTE class-name nits) |
| D.3.1 | I | ktx | `_handler_gameplay_taxonomies.py:385` computes `source_total = len(raw_election_rows)` over pre-dedup data; under `--workers 4`, value is 4x correct (since `progs.h` is included by every TU). Actual `count` field is correctly deduped to 5. NOT a data correctness issue; breaks Section-1.1 byte-reproducibility for `_stats.election_type.source_total`. Phase 5.5 set the precedent for parallel-safe Pattern 13 emission; this stat slipped through. | drain-in-arc (Phase 7 inline fix candidate: switch source_total to count of unique rows pre-finalize, OR move stat collection to Pattern 13 typed pseudo-rows) OR HANDOVER (informational stat only; functional correctness unaffected) |
| D.6.1 | I | ktx | Same as D.3.1 -- duplicate ID for clarity at the reproducibility surface. The byte-diff in `ktx-gameplay-taxonomies-ast.json` under `--workers 4` is exactly the D.3.1 stat. | (rolled into D.3.1) |
| D.8.1 | I | ktx | F19 doctrine-fix sweep at `OVERVIEW.md` not re-verified by this audit; Phase 8 verification step recommended. | drain-in-arc (Phase 8 verifies; one grep) |

Total: 5 findings (1 critical, 3 important, 1 nit) -- one ID merged. **Effective unique findings: 4.**

## Disposition summary

- Drain-now: 1 (D.1.1 -- re-anchor ezquake doc_only_count probe expected value, OR investigate 11-row drift)
- Drain-in-arc: 2 (D.3.1 reproducibility fix in Phase 7 OR Phase 8; D.8.1 grep-verify in Phase 8)
- HANDOVER: 1 (D.2.1 KTX class-name shape consistency; cosmetic)
- Informational: 0

## Architecture verdict

KTX onboarding is clean. The 5-engine cross-project state holds: per-project handler counts are correct (ezquake=8 / fte=8 / qwcl=3 / mvdsv=7 / ktx=8); KTX adheres to D3 (Visitor-only) with the documented match_events carve-out; D4 (Pattern 6 lift) is correctly placed in `extractor_lib/_source.py` with no KTX-named branches; D5 migrations 009/010/011 widen schema additively; D14 JSONB-binding probe extends to KTX columns and PASSes; D15 idempotency artifact ships; F28 transition-scan exclusion list reconciles perfectly against schema. The only KTX-side regression surfaced is a stat-only parallel-aggregation bug in `gameplay_taxonomies` (D.3.1 / D.6.1) -- it does not affect emitted rows, only `_stats.source_total`. The single ezquake F1 FAIL is pre-existing baseline drift unrelated to the KTX arc.

## Phase 8 carry-forwards

Items the audit surfaces for Phase 8 attention:

1. **D.1.1 ezquake probe re-anchor.** `quality-grid.ts:1691` `expected=194` does not match live DB (183). Either re-anchor to live count OR open a sidequest to investigate the 11-row delta. Lightweight; Phase 8 candidate or HANDOVER drain-now.
2. **D.3.1 / D.6.1 gameplay_taxonomies parallel-stat fix.** Inline patch sized at <30 lines (move source_total to typed pseudo-row aggregation per Pattern 13 precedent from Phase 5.5 / F25). Optional for Phase 8; HANDOVER if deferred.
3. **D.8.1 F19 OVERVIEW.md verify.** One-line grep against `apps/qw-oracle/OVERVIEW.md` for `tree-sitter` references in KTX context. Phase 8's existing F19 + F22 verification step covers this.
4. **F23 / F27 / F29 PLAYBOOK addition.** Already captured per `review-findings.md` Phase 8 ownership: anchor probe authors verify predicates against live dev DB before shipping.
5. **F28 PLAYBOOK addition for non-Visitor handlers.** Full lifecycle stub list (7 methods + setup + finalize) + transition-scan exclusion convention. Phase 8 obligation.
6. **D.2.1 class-name shape consistency** (NIT). If a future cosmetic-cleanup pass lands, normalise KTX handler class names to a single shape. Defer indefinitely; not load-bearing.
