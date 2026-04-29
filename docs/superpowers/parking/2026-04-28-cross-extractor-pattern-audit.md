# Cross-extractor pattern audit follow-up arc

**Added:** 2026-04-28. **Status:** Five phases shipped 2026-04-28 (commits `566c5be` -> `1a00704`). Two follow-ups deferred: asset-helper lift (Task 3.5) and qc_builtin intra-table multi-index aggregation. See "Shipped" and "New deferred follow-ups" sections below.

Cross-project pattern audit ran 2026-04-28 against the post-consolidation baseline (architecture-consolidation arc 5b943d4 -> 8115b48). Three subagents in parallel covered:
- `extractor_lib/` end-to-end + lift candidates from project-private handlers (Subagent 1).
- cvar/command/cmdline triple across all four projects (Subagent 2).
- Project-specific handlers (FTE asset/ezhud/ezscript/macros, MVDSV info_keys/log_templates/protocol/qc_builtins, ezQuake macros/hud_elements/keynames/asset) + schema CHECK reachability (Subagent 3).

In-terminal: load-version.ts + schema.ts CHECK constraint mapping; `valid*` carve-outs; driver shape (extract.py); OUT_OF_SCOPE.md + validation-fixtures inventory.

### Findings

27 total. Severity split: 4 critical (D.1.3 / D.1.4 / D.1.10 / D.2.10), 16 important, 7 nits.

The full report is at `docs/superpowers/reviews/2026-04-28-cross-extractor-audit-report.md` with finding tables grouped by audit dimension (D.1 sibling-handler shape divergences; D.2 extractor_lib lift candidates; D.3 schema CHECK reachability; D.4 valid* carve-outs; D.5 architecture invariants; D.6 driver shape; D.7 idempotency smoke; D.8 OUT_OF_SCOPE / validation-fixtures).

### Plan

`docs/superpowers/plans/2026-04-28-cross-extractor-shared-lib-arc.md` -- five phases plus a Phase 0 of small drain-now patches:

- **Phase 0** -- drain-now: delete dead `extractor_lib/_base.py`; rename two FTE asset handler classes; rename mvdsv `containing_function` -> `enclosing_function`.
- **Phase 1** -- `resolve_fn_ref` lift adoption across 6 private copies in ezquake/fte/qwcl. Highest-correctness win; corner case (unresolved decls) surfaces as `cursor.spelling` instead of NULL.
- **Phase 2** -- cvars normalization convergence (lift `_unescape_c_string` + `_normalize_flags_raw`) + qc_builtin canonical-name fix to schema v18 (parallels v16 info_key Phase B). Recovers 4 silently-dropped cross-scope variants. Schema migration territory.
- **Phase 3** -- string-shape helper lifts (`_read_extent` x13, `_strip_quotes` x8, `_literal_string` L-tolerant x7, `_strip_array_and_qualifiers` x3, asset-handler bundle x17). Largest LOC reduction; no policy change.
- **Phase 4** -- FTE cmdline param-prefix verification: grep + decide widen vs document-as-design.
- **Phase 5** -- schema/loader alphabet sync (export `INFO_KEY_SCOPES` + `LOG_TEMPLATE_CHANNELS` from schema.ts); document log_template raw-escape preservation contract in SCHEMA.md.

### Sequencing

Drain this arc BEFORE the per-project deep validations (ezQuake / FTE / QWCL via `validate-extractor` skill in Mode B). Same logic that drove the MVDSV Phase 2e follow-up arc -> runbook+skill sequencing: cleaner shared baseline = smaller per-project plans = less duplicate work across the three.

### Deferred to HANDOVER (13 items, all low pressure)

These findings have explicit dispositions in the audit report. None warrant a phase of their own:

1. **D.1.5** -- FTE/QWCL handlers uniformly missing `Fork override hooks:` documentation. No concrete consumer fork target today; speculative hoisting violates "don't generalize without a second consumer." Revisit if/when a fork pressure surfaces.
2. **D.1.8** -- FTE `_handler_commands.py` lacks `enter_function`/`exit_function` lifecycle hooks; `_handler_cmdline.py:167` always emits `enclosing_function: None`. Feature-coverage gap, not data loss.
3. **D.1.9** -- ezquake cvars finalize uses last-wins overwrite; ezquake commands and all other projects use first-wins. Verify identical output on current corpus before harmonizing.
4. **D.1.12** -- `ProtocolMvdsvHandler._kind_for` lives at module level rather than as a class-attribute dispatch table. Acknowledged in docstring. Defer until antilag-mvdsv onboarding pressures the override path.
5. **D.1.13** -- FTE `_handler_ezhud.py:97-123` `_resolve_default` token heuristic stores unresolved identifier names as-is. Re-scan `plugins/ezhud/` for new SPEED_-style #defines on each FTE bump.
6. **D.2.8** -- ezquake `_resolve_enum_constant` duplicated within ezquake (macros + cmdline). Single-project; below the lift bar.
7. **D.3.1** -- `cvar_alias_versions.default_drift_status` schema CHECK admits `differ_safe` but no extractor emits it (FTE ezscript handler is conservative; manual review can promote `differ_dangerous` -> `differ_safe`). Verify operator-promotion path; either document or remove from CHECK in a future revision.
8. **D.4.3** -- `validIdentifier` regex in `load-version.ts:443` does NOT admit `:` separator. Blocks future `<bare>:<scope>` canonical fixes for entity types beyond info_key without coordinated regex work. Re-evaluate when the next cross-scope canonicalization arc lands (Phase 2 of the plan above kicks this for qc_builtin).
9. **D.6.1** -- `Config.set_library_file("libclang-18.so.1")` called in fte/extract.py + mvdsv/extract.py but NOT in ezquake/extract.py + qwcl/extract.py. Functional today on WSL via libclang's default resolution; convergence is hygiene only.
10. **D.6.2** -- Handler-registry pattern divergence (module-level `ALL_HANDLERS` dict literal in ezquake/qwcl vs `collect_handlers()` function with lazy imports in fte/mvdsv). Both work; convergence is code-hygiene.
11. **D.6.3** -- ezquake `_split_handlers` + dual-path code in `_process_one_file` (extract.py:97-160) retained for the keynames handler (the only one still using `process_file` instead of Visitor). One-consumer legacy path; could be lifted into Visitor with custom variant args.
12. **D.8.1** -- `OUT_OF_SCOPE.md` "last reviewed" dates: ezquake/fte/qwcl 2026-04-26 (precede the consolidation arc); mvdsv 2026-04-28 (current). Refresh dates as part of per-project deep validations.
13. **D.8.2** -- Only mvdsv has `validation-fixtures/` (allowlists, prefixes, runtime dump). ezquake/fte/qwcl have no equivalent -- ezquake's runtime cross-validation already happened pre-consolidation (Pass 1 closure documented in CLAUDE.md memory note); the absence of a `validation-fixtures/` directory means that Pass 1's allowlist + reference dump are not reproducible from the current tree. Capture per-project Pass-1 runtime dumps as part of per-project deep validations.

### Shipped

Five phases landed 2026-04-28:

- **Phase 0** (`566c5be`) -- deleted dead `extractor_lib/_base.py`; renamed two FTE asset handler classes to `*FteHandler`; renamed mvdsv cmdline `containing_function` -> `enclosing_function` for cross-project field-name consistency.
- **Phase 1** (`08aa5b1`) -- lifted `resolve_fn_ref` import across 6 private copies (ezquake commands/macros/hud_elements; fte commands/macros; qwcl commands). JSON outputs byte-identical at current heads (no corner-case unresolved decls fired); the lift's permissive fallback remains load-bearing for older tags or future codebase changes.
- **Phase 2** (`4a98573`) -- created `extractor_lib/_cvar_shared.py` with `unescape_c_string` / `normalize_flags_raw` / `parse_flag_names` / `FLAG_NAME_RE`; ezquake + mvdsv import from shared; fte + qwcl adopt `normalize_flags_raw` (and qwcl adopts `unescape_c_string`) so all four projects share the post-v17 sentinel-form contract. Fixed ezquake trailing-comment `};` anchor (D.1.4) -- comma-bearing comments like `// can be 0, 1, or 2` no longer truncate. Schema v18 migration: qc_builtin canonical name carries `:<table_name>` suffix mirroring info_key Phase B `:<scope>`. The audit's predicted 93 -> 97 recovery did NOT materialize (see "New deferred follow-ups" #2 below for why).
- **Phase 3** (`64e32e3`) -- created `extractor_lib/_source.py` with `read_extent` / `strip_quotes` / `literal_string` (L-prefix-tolerant superset) / `strip_array_and_qualifiers`. 19 handler files across all four projects converted to import the shared helpers. Net diff: -604 / +202 lines. JSON outputs byte-identical for all four projects. Task 3.5 (asset-handler 17-helper lift) deferred -- see "New deferred follow-ups" #1 below.
- **Phases 4 + 5** (`1a00704`) -- FTE cmdline single-prefix policy documented as intentional (zero `+`-prefixed `COM_CheckParm` calls in FTE engine source verified via grep). `INFO_KEY_SCOPES` + `LOG_TEMPLATE_CHANNELS` exported from `schema.ts`; consumed in `load-version.ts` via dynamic regex builders. SCHEMA.md updated with `log_template_versions` "Escape-preservation contract" section (raw form preserved; contrast with cvar `default_value` post-v17 escape interpretation).

### New deferred follow-ups

These two follow-ups surfaced during execution, not in the original audit. Both low pressure.

1. **Task 3.5 asset-handler lift (D.2.3) -- design work, not mechanical lift.** The audit's plan called for lifting 17 asset-handler helpers (`_classify_load_trigger`, `_is_dev_only`, `_category_from_extension`, `_category_from_enclosing`, `_resolve_cvar_ref`, `_conversion_slots`, `_extension_from_template`, `_resolve_semantic`, `_classify_parameterized_call`, `_extract_expression_snippet`, `_unary_op_token`, `_binary_op_token`, `_drill_to_decl_ref`, `_lookup_buffer_write_in_compound`, `_lookup_deref_assignment_in_compound`, `_classify_first_arg`, `_resolve_cvar_string_ref`) from ezquake + fte asset handlers to a shared `extractor_lib/_asset.py`. Inspection during Phase 3 found that several of these helpers close over project-specific module-level data tables (`TRIGGER_RULES`, `DEV_ONLY_RULES`, `EXT_TO_CATEGORY`, `ENCLOSING_FN_CATEGORY_RULES`, `LOADER_FUNCTIONS`, `FUNCTION_TO_CATEGORY`, `GENERIC_FS_PRIMITIVES`) whose contents differ between ezquake and fte (FTE has FTE-specific patterns like `Sh_RegisterShader_Init`, `R_LoadHL2Map`, `Shaders`, `Textures` that ezquake doesn't have). The lift requires either (a) parameterizing each helper with the project-specific data tables, (b) hoisting to a class with `self.<TABLE_NAME>` attributes, or (c) leaving the helpers per-project. Per-project today is the pragmatic state. Pressure: low -- the duplication is real but the LOC cost is bounded (only ezquake + fte have asset handlers; mvdsv + qwcl have none); the design question shouldn't block other work.

2. **qc_builtin intra-table multi-index aggregation (audit D.1.10 follow-up).** Phase 2's schema v18 lifted qc_builtin canonical names from `<bare>` to `<bare>:<table_name>` mirroring info_key's `:<scope>` shape. The audit predicted this would recover 4 previously-collided "cross-scope" entities (`cvar_string`, `precache_model`, `precache_sound`, `precache_file`) and bump qc_builtin count from 93 to 97. Inspection during Phase 2 found the 4 dups are NOT cross-table -- they're INTRA-table multi-index registrations (e.g., `cvar_string` registered TWICE in `ext_builtins` at indices 103 AND 448). The `:<table>` suffix doesn't disambiguate them; both rows still emit name=`cvar_string:ext_builtins` and the second is dropped at the loader's `rawEntries[item.name] === undefined` dedup (line 317-318 of load-version.ts). Recovery requires handler-side aggregation pre-emission: collapse multi-index registrations under the same name into one row with both indices recorded as a JSON list (mirrors info_key Phase B's `all_call_sites_json` pattern at line 270-281 of `mvdsv/_handler_info_keys.py`). The qc_builtin_versions table would need a new `all_indices_json TEXT` column added in a schema bump (v19?) and the handler emission would shift from per-(table, index) rows to per-(table, name) aggregated rows. Pressure: low -- the intra-table multi-index pattern is rare (4 entities total), and the second registration is typically a back-compat alias to the same handler function. Capturing both indices is correctness, not data integrity. Re-evaluate when the qw_event_log validation oracle arc lands (which depends on qc_builtin completeness).

### Pressure

Done. Drain-in-arc work shipped. Two follow-ups added back to HANDOVER above. Per-project deep validations (ezQuake / FTE / QWCL Mode B in `validate-extractor` skill) can now resume.

### Related

- **Audit report:** `docs/superpowers/reviews/2026-04-28-cross-extractor-audit-report.md`
- **Follow-up plan:** `docs/superpowers/plans/2026-04-28-cross-extractor-shared-lib-arc.md` (5 phases shipped + Phase 0)
- **Spec:** `docs/superpowers/specs/2026-04-28-cross-extractor-pattern-audit.md`
- **Predecessor:** `docs/superpowers/plans/2026-04-28-extractor-architecture-consolidation.md` (the consolidation arc that built the pre-condition for this audit)
- **MVDSV Phase 2e follow-up plan:** `docs/superpowers/plans/2026-04-28-mvdsv-phase2e-followups.md` (parallel-shape reference)
- **Shipped commits:** `566c5be` (P0) -> `08aa5b1` (P1) -> `4a98573` (P2 v18) -> `64e32e3` (P3) -> `1a00704` (P4+P5)
