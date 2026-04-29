# Per-project Mode B validation synthesis follow-ups

**Added:** 2026-04-28. **Status:** Three per-project deep validations shipped; drain-now items (F-QWCL-01 doc drift + D.8.1 OUT_OF_SCOPE.md date refresh) drained in synthesis commit. Two follow-up arcs queued.

Per-project Mode B deep validations ran in parallel as three subagents (one per project: ezQuake / FTE / QWCL) using the `validate-extractor` skill against the canonical `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`. Each agent walked Sections 1.1, 3, 4, 5, 7 end-to-end; Section 3.1 random sample size doubled to 40 rows per type per Mode B; Section 4.4 cross-project sibling audit required. The cleaner shared baseline established by the cross-extractor arc paid off: zero critical findings across 1,388 + 347 + 93 file-tasks (ezquake + fte + qwcl extractor reruns).

### Headline numbers

| Project | Verdict | Critical | Important | Nits | Total |
|---|---|---:|---:|---:|---:|
| ezQuake @ head | as-claimed-with-caveats | 0 | 2 | 3 | 6 |
| FTE @ build-6698 | as-claimed-with-caveats | 0 | 2 | 3 | 5 |
| QWCL @ 2.33 | as-claimed-with-caveats | 0 | 2 | 7 | 9 |
| **Total** | | **0** | **6** | **13** | **20** |

### Cross-cutting findings (S-NN)

- **S-01 (important, drain-in-arc): FTE Phase 2 normalization incompletely landed.** Two related gaps: 1085 source-backed FTE cvars carry `flags_raw IS NULL` instead of the post-v17 empty-string sentinel (all from `plugins/ezhud/hud_common.c`; QWCL 0/187 NULL, MVDSV 0/183 NULL, FTE 1085/2482 NULL -- discoverable because the runbook's Section 3.2 sentinel-form audit only checks `IN ('0', 'CVAR_NONE')`, not `IS NULL`); and FTE `_handler_cvars.py` uses a private `_concat_string_literals` instead of `extractor_lib._cvar_shared.unescape_c_string`, latent today (zero escape-bearing FTE defaults at build-6698) but silently wrong on the next FTE upstream tag that adds an escape-bearing default. Five FTE handlers carry near-identical `_concat_string_literals` clones. **Disposition:** Arc A "cross-extractor Phase 6: FTE convergence + grid uplift". Tighten runbook Section 3.2 to reject `IS NULL`; FTE handlers adopt `normalize_flags_raw` on no-flag-token paths and `unescape_c_string` for default extraction; re-run `extract-tag --project fte`; verify the 1085 NULL rows collapse to empty string.
- **S-02 (HANDOVER): cross-extractor audit's D.1.8 confirmed open for FTE.** FTE `_handler_commands.py`, `_handler_cmdline.py`, `_handler_macros.py` lack `enter_function`/`exit_function` lifecycle hooks. 556 FTE commands + 67 macros + 108 cmdline_params all carry `enclosing_function: None` -> `registration_file = NULL`. ezQuake + QWCL populate uniformly; MVDSV commands handler also lacks them. Pre-existing audit residual; no escalation.
- **S-03 (important, drain-in-arc): F1 quality-grid probe coverage uneven across projects.** qwcl-keyed F1 probes: 0 (vs mvdsv 22, fte 11, ezquake 6). The 58->72 cmdline_param drift QWCL agent discovered (F-QWCL-01) went undetected because no equality probe gates it. **Disposition:** Arc A bundles a probe-coverage uplift across all four projects; QWCL plan's 4 proposed qwcl-keyed equality probes drain-now-equivalent.

### Per-project unique findings

- **F-EZQ-01 (important, drain-in-arc): trailing-comment misattribution in ezquake cvars handler.** `_handler_cvars.py:_attach_trailing_comments` (lines 624-660) `+1`/`+2` look-ahead grabs neighboring cvar's trailing comment when origin cvar has no inline comment AND a later cvar within 2 lines does. **78 of 230 (~34%) cvar rows with non-empty `trailing_comment` at head are wrong.** Independent of the Phase 2 `};` literal anchor fix (`4a98573`); a different failure mode in the same helper. Concrete example: `scr_cursor_alpha` (cl_screen.c:122) carries `scr_showcrosshair`'s comment from line 124. Other affected: `cl_delay_packet_deviation`, `sys_command_line`, `cl_nofake`, `cl_camera_tpp_distance`, `con_notify`, `gl_lightning_size`, ~70 others. **Disposition:** Arc B Phase 1 -- local fix in one helper function, two-rule clamp (stop after first probe seeing `};`; abort on encountering fresh `cvar_t ... = {` line). High-value for data quality.
- **F-EZQ-03 (important, drain-in-arc): `command_versions.registration_file` + `macro_versions.registration_file` columns misnamed.** Columns store enclosing function names (e.g., `CL_InitInput`), not file paths. Handler-side field is `enclosing_function`; `hud_element_versions.enclosing_function` already uses correct name. QWCL agent surfaced same finding as F-QWCL-06 (nit). **Disposition:** Arc B Phase 2 schema migration (rename columns + loader INSERT list + SCHEMA.md). No data loss.
- **F-QWCL-01 (important, drain-now in synthesis commit): doc/code count drift.** `apps/qw-oracle/scripts/extractors/qwcl/OUT_OF_SCOPE.md` + `apps/qw-oracle/CLAUDE.md` both said "186/120/58 = 364"; live DB at v18 is 187/121/72 = 380. Drained 2026-04-28: qwcl OUT_OF_SCOPE.md + apps/qw-oracle/CLAUDE.md updated to 380.
- **D.8.1 (drain-now in synthesis commit): OUT_OF_SCOPE.md last-reviewed dates refreshed.** ezquake/fte/qwcl all bumped from 2026-04-26 to 2026-04-28. Closes the carry-forward from the cross-extractor audit.

### Recommended next-arc shape

- **Arc A -- "cross-extractor Phase 6: FTE convergence + grid uplift"** (small, ~2-3 phases): runbook Section 3.2 tightening (add `IS NULL` to sentinel-form audit); FTE cvars handler adoption of `normalize_flags_raw` + `unescape_c_string` (5 files); F1 probe coverage uplift (qwcl 4 probes drain-now from QWCL plan; +N ezquake probes); re-run extract-tag for fte and verify 1085 NULL collapse. Drains S-01 + S-03.
- **Arc B -- "ezquake trailing-comment + registration_file rename"** (small, ~2 phases): fix `_attach_trailing_comments` look-ahead misattribution; verify 78 misattributions resolve; schema migration v19 renames `command_versions.registration_file` + `macro_versions.registration_file` -> `enclosing_function`. Drains F-EZQ-01 + F-EZQ-03 + F-QWCL-06.

Sequence Arc A first (S-01's contract tightening updates the runbook Arc B will validate against). Both arcs are estimable at one focused session each.

### Pressure

Done for this session. Per-project plans live alongside reports under `docs/superpowers/{reviews,plans}/2026-04-28-<project>-validation*.md`. Doc drains shipped in synthesis commit; HANDOVER amendments shipped here. Arc A + Arc B sequenced for next session.

### Related

- **Synthesis report:** `docs/superpowers/reviews/2026-04-28-per-project-validation-synthesis.md`
- **ezQuake report + plan:** `docs/superpowers/reviews/2026-04-28-ezquake-validation.md` + `docs/superpowers/plans/2026-04-28-ezquake-validation-followups.md`
- **FTE report + plan:** `docs/superpowers/reviews/2026-04-28-fte-validation.md` + `docs/superpowers/plans/2026-04-28-fte-validation-followups.md`
- **QWCL report + plan:** `docs/superpowers/reviews/2026-04-28-qwcl-validation.md` + `docs/superpowers/plans/2026-04-28-qwcl-validation-followups.md`
- **Predecessor:** Cross-extractor pattern audit follow-up arc (above)

---
