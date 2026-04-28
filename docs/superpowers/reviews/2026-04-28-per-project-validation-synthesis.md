# Per-Project Validation Synthesis (ezQuake / FTE / QWCL)

**Date:** 2026-04-28
**Mode:** synthesis across three Mode B per-project deep validations
**Schema baseline:** v18
**Architecture baseline:** post-cross-extractor-arc (commits `566c5be` -> `1a00704`)
**Working tree HEAD:** f1e611d (main)
**Validator:** Claude (validate-extractor skill, orchestrator phase)

## Context

After the cross-extractor pattern audit shipped its five-phase shared-lib arc on 2026-04-28
(commits `566c5be` Phase 0 -> `1a00704` Phase 5), three Mode B per-project deep validations were
run in parallel: ezQuake@head, FTE@build-6698, QWCL@2.33. Each subagent walked the canonical
runbook (`apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`) sections 1.1, 3, 4, 5, 7
end-to-end, with Section 3.1 sample size doubled to 40 rows per entity type per Mode B and
Section 4.4 cross-project sibling audit required.

This synthesis stitches the three independent reports together, identifies cross-cutting vs
per-project findings, decides dispositions, and queues amendments to HANDOVER.

## Per-project verdicts

| Project | Verdict | Critical | Important | Nits | Total |
|---|---|---:|---:|---:|---:|
| ezQuake @ head | as-claimed-with-caveats | 0 | 2 | 3 | 6 |
| FTE @ build-6698 | as-claimed-with-caveats | 0 | 2 | 3 | 5 |
| QWCL @ 2.33 | as-claimed-with-caveats | 0 | 2 | 7 | 9 |
| **Total** | | **0** | **6** | **13** | **20** |

No critical findings. Six important findings split into a small cross-cutting bundle (3 items)
and three per-project items. Thirteen nits, mostly carry-overs from the cross-extractor audit's
HANDOVER residuals (D.1.7, D.6.1, D.6.2, D.8.1, D.8.2) plus three small hygiene items per project.

The full per-project reports are at:

- `docs/superpowers/reviews/2026-04-28-ezquake-validation.md`
- `docs/superpowers/reviews/2026-04-28-fte-validation.md`
- `docs/superpowers/reviews/2026-04-28-qwcl-validation.md`

Each report includes its own findings table with file:line, severity, disposition. Their
follow-up plans live at:

- `docs/superpowers/plans/2026-04-28-ezquake-validation-followups.md`
- `docs/superpowers/plans/2026-04-28-fte-validation-followups.md`
- `docs/superpowers/plans/2026-04-28-qwcl-validation-followups.md`

## Headline checks (all pass)

The fundamentals held across all three projects:

- **Section 1.1 byte-reproducibility:** all three extractors produced zero `git diff` against
  HEAD on re-run. Wall times: ezQuake 29.0s @ 12 workers, FTE 47.4s @ 12 workers (6m32s @ 1
  worker, byte-identical output), QWCL 21.4s serial.
- **Section 3.2 sentinel-form contract for `flags_raw` (post-v17):** zero rows in any of the
  four projects with `flags_raw IN ('0', 'CVAR_NONE')`. The Phase 2 normalization landed for
  what was checked. (See cross-cutting finding S-01 below for what the contract did NOT close.)
- **Section 4.4 cross-project sibling audit:** post-arc handler shape consistent. Phase 1
  (`resolve_fn_ref` lift), Phase 2 (`unescape_c_string` / `normalize_flags_raw` lifts),
  Phase 3 (`read_extent` / `strip_quotes` / `literal_string` / `strip_array_and_qualifiers`
  lifts) verified imported in ezQuake / QWCL / MVDSV handlers. Phase 5 (`INFO_KEY_SCOPES` +
  `LOG_TEMPLATE_CHANNELS` exports) verified in `schema.ts` + `load-version.ts`.
- **Section 7 determinism:** all three extractors produce byte-identical output across worker
  counts (verified explicitly for ezQuake and FTE; QWCL is serial-only by design).
- **Quality grid (orchestrator phase, all four projects post-reload):** 79 real probes; only
  the two pre-existing ezquake F2 anomalies fired (`F2.doc_only_crosstab` 194 doc_only;
  `F2.default_value_ping_pong` gl_lightmode oscillation). Both informational and tracked in
  HANDOVER.
- **Loader idempotency (Section 1.2 / 1.3, orchestrator phase):**
  - **ezQuake:** first re-load shifted entity counts (cvar 2899 -> 2901, command 536 -> 551,
    -15 help-JSON orphans pruned). Second pass produced identical counts. The shift was the
    DB transitioning from a pre-arc loaded state to the post-arc canonical state. Idempotent
    thereafter. The +2 cvars and +15 commands are recoveries the cross-extractor arc enabled
    (Phase 2 trailing-comment `};` literal anchor fix and orphan-pruning logic).
  - **FTE:** entity counts on re-load match DB pre-snapshot exactly. Already at canonical state.
  - **QWCL:** entity counts on re-load match DB pre-snapshot exactly. Already at canonical state.
- **Final integration (Section 8):** `bunx tsc --noEmit` clean from `apps/qw-oracle/`. MCP
  smoke test (`scripts/verify-rewrite.ts`) ALL PASS (24+ assertions, including the
  cross-scope info_key probe that drove the v17 schema bump).

## Cross-cutting findings (synthesis-level)

Three findings span more than one project and warrant a shared follow-up rather than three
parallel per-project drains. Naming: **S-NN** for cross-cutting synthesis findings (vs
F-EZQ / F-FTE / F-QWCL for per-project).

### S-01 (important, drain-in-arc): Phase 2 normalization is incompletely landed for FTE

The cross-extractor arc's Phase 2 (commit `4a98573`) was supposed to converge all four
projects on the post-v17 cvar normalization contract: `flags_raw` empty string for absent /
`0` / `CVAR_NONE`, `default_value` C-escapes interpreted at extraction time. ezQuake / QWCL /
MVDSV all adopted; FTE only partially did.

Two related gaps:

1. **`flags_raw IS NULL` for 1085 source-backed FTE cvars** (all from
   `plugins/ezhud/hud_common.c`). QWCL agent surfaced as F-QWCL-07 (logged-only). The Section
   3.2 sentinel-form check the runbook prescribes (`flags_raw IN ('0', 'CVAR_NONE')`) does
   NOT detect NULL -- both the prior cross-extractor audit and the per-project Section 3.2
   audit ran clean against these checks, but NULL is a third sentinel form not covered by the
   contract as written. QWCL: 0/187 NULL. MVDSV: 0/183 NULL. ezQuake: not checked here, but
   per audit D.1.1 ezquake was already the post-v17 reference point. **FTE: 1085/2482 NULL.**
2. **FTE `_handler_cvars.py` does NOT import `extractor_lib._cvar_shared.unescape_c_string`**
   (FTE agent surfaced as F-FTE-01). The handler has a private `_concat_string_literals`
   (lines 100-115) that strips outer quotes but does NOT interpret C escapes (`\\n`, `\\"`,
   `\\t`, `\\\\`). At build-6698 zero FTE cvar defaults contain escape sequences -- verified
   by both grep and DB scan -- so the gap produces no observable wrong rows today. The
   moment FTE upstream adds an escape-bearing default, the DB silently stores the wrong
   string. Same shape applies to four other FTE handlers that own private
   `_concat_string_literals` clones.

**Disposition:** drain-in-arc. Bundle into a "cross-extractor Phase 6: FTE convergence"
follow-up arc that:
1. Tightens the Phase 2 normalization contract: extend the runbook's Section 3.2 audit to
   include `flags_raw IS NULL` as a third sentinel form to reject across all four projects.
2. Updates FTE `_handler_cvars.py` (engine path) and `_handler_ezhud.py` to call
   `normalize_flags_raw` even when no flag tokens are collected (current behavior emits
   `None`). Per HANDOVER cross-extractor audit's D.1.1, this was Phase 2's intent for FTE;
   Phase 2 shipped the import but the call-site adoption looks incomplete.
3. Migrates the five FTE handlers from private `_concat_string_literals` to
   `extractor_lib._cvar_shared.unescape_c_string` (or whichever wrapper applies -- FTE may
   need a small adapter because it operates on libclang Token streams, not extracted source
   text; verify).
4. Re-runs `extract-tag --project fte --version build-6698` and confirms the 1085 NULL rows
   collapse to empty string. Quality grid F1 should pass; F2 may surface a one-time count
   shift if any rows now collide on natural keys (unlikely but verify).

Risk: post-v17 the schema CHECK constraint on `cvar_versions.flags_raw` does NOT enforce
non-NULL. Loaders accept NULL silently. The contract is documented in the runbook prose but
not the schema. Phase 6 should consider whether to add a NOT NULL DEFAULT '' constraint.

### S-02 (nit, HANDOVER): Cross-extractor audit's D.1.8 confirmed open for FTE

FTE `_handler_commands.py`, `_handler_cmdline.py`, and `_handler_macros.py` lack
`enter_function`/`exit_function` lifecycle hooks. Result: 556 commands + 67 macros + 108
cmdline_params for FTE all carry `enclosing_function: None` -> `registration_file = NULL` in
the DB. ezQuake and QWCL populate these fields uniformly; MVDSV `_handler_commands.py` is
similarly hookless (matches FTE) but the rest of MVDSV does have hooks. This is data-coverage
breadth, not data correctness.

The audit (D.1.8) deferred this with disposition HANDOVER; both per-project reports
(F-FTE-02 + F-QWCL-04 cross-project sibling note) confirm it is still the case post-arc.
Carry-forward; no escalation.

**Disposition:** HANDOVER (pre-existing, low pressure).

### S-03 (important, drain-in-arc): F1 quality-grid probe coverage is uneven across projects

| Project | qwcl-keyed F1 probes | mvdsv-keyed F1 probes | ezquake-keyed F1 probes | fte-keyed F1 probes |
|---|---:|---:|---:|---:|
| Equality count probes | 0 | 22 | 6 | 11 |

QWCL has zero project-keyed F1 equality probes. The 58 -> 72 cmdline_param drift QWCL agent
discovered (F-QWCL-01: live DB has 187/121/72 = 380 entities; OUT_OF_SCOPE.md + CLAUDE.md
both still claim 186/120/58 = 364) went undetected because no equality probe gates it.
ezQuake's coverage is also light (6 probes for the largest-surface project).

**Disposition:** drain-in-arc. The per-project follow-up plans each propose adding probes;
the orchestrator can drain the QWCL plan's 4 proposed probes immediately as a small
"drain-now-with-tests" patch. The broader probe coverage uplift across all four projects can
ride alongside Phase 6 (S-01) since both touch the runbook + grid contract.

## Per-project (genuinely unique) findings

These do not span projects; each project's follow-up plan owns the work.

### F-EZQ-01 (important, drain-in-arc): trailing-comment misattribution in ezQuake cvars handler

`apps/qw-oracle/scripts/extractors/ezquake/_handler_cvars.py:_attach_trailing_comments`
(lines 624-660). The `+1` / `+2` look-ahead grabs the trailing comment of a NEIGHBOURING
cvar's registration when the original cvar has no inline comment AND a later cvar within 2
lines does. Quantified: **78 of 230 cvar rows with non-empty trailing_comment at head are
wrong (~34%).** Independent of the Phase 2 `};` literal anchor fix (commit `4a98573`); a
distinct failure mode.

Concrete example: `scr_cursor_alpha` (`cl_screen.c:122`) currently carries
`scr_showcrosshair`'s trailing comment from line 124. ~70 other cvars affected, including
`cl_delay_packet_deviation`, `sys_command_line`, `cl_nofake`, `cl_camera_tpp_distance`,
`con_notify`, `gl_lightning_size`.

**Disposition:** drain-in-arc per ezquake follow-up plan. Local fix in one helper function;
high-value for data quality. Re-run extract-tag after the fix and verify count of cvar rows
with non-empty trailing_comment shrinks; also re-run the 40-row Section 3.1 sample and
confirm zero misattributions.

This is also a cross-extractor-audit lessons-learned: the audit's D.1.4 caught the `};` /
`,` literal anchor bug but did not catch the look-ahead misattribution because the audit's
cvars handler reads were at the regex / handler-method-level, not at the call-site
walk-through that the Mode B 40-row Section 3.1 sample forced. Update the runbook's Section
4.1 checklist to explicitly call out look-ahead loops as a class of bug to re-verify on
sample audit, not just to read.

### F-EZQ-03 (important, drain-in-arc): `command_versions.registration_file` and `macro_versions.registration_file` are misnamed

The columns store enclosing function names (e.g., `CL_InitInput`), not file paths. The
handler-side field is named `enclosing_function`; the loader maps it to a column called
`registration_file`. ezQuake's `hud_element_versions.enclosing_function` already uses the
correct name; the misnomer is on commands + macros + cmdline tables.

**Disposition:** drain-in-arc per ezquake follow-up plan. Schema migration: rename the
column on three tables; update the loader's INSERT column list; update SCHEMA.md. No data
loss (the column carries the right values, just under the wrong name).

QWCL agent surfaced the same finding as F-QWCL-06 (nit). Roll the QWCL nit into ezQuake's
plan since the schema migration touches the cross-project tables.

### F-QWCL-01 (important, drain-now): doc/code count drift

`apps/qw-oracle/scripts/extractors/qwcl/OUT_OF_SCOPE.md` line "Extraction total: 364
entities" and `apps/qw-oracle/CLAUDE.md` line "186 cvar / 120 command / 58 cmdline_param
entities loaded clean alongside ezQuake's 4041" both predate the cross-extractor arc. Live
DB is 187/121/72 = 380. The +1 cvar / +1 command / +14 cmdline came in via Phase 2/Phase 3
recoveries (presumably).

**Disposition:** drain-now. Single doc patch in this synthesis commit. (The HANDOVER
"Latest arc shipped" entry already names QWCL's pre-arc counts; it does not need amending --
HANDOVER captures point-in-time arcs, not live state.)

### F-EZQ-04 + F-FTE-04 + F-FTE-05 + F-QWCL-04..F-QWCL-06 (nits, mixed dispositions)

Small project-local hygiene items captured in each per-project plan; not aggregated here.
Total six nits across the three projects, all bounded to a single handler or doc file.

## HANDOVER amendments

The cross-extractor pattern audit follow-up arc section in HANDOVER is up-to-date as
shipped. This synthesis adds one new entry to the "New deferred follow-ups" subsection and
amends the audit's D.8.1 entry to reflect that QWCL + ezQuake + FTE OUT_OF_SCOPE.md dates
should refresh as part of this synthesis (drain-now).

New HANDOVER entry to add:

> **Per-project Mode B validation synthesis follow-ups (2026-04-28).** Three deep
> per-project validation passes (ezQuake@head / FTE@build-6698 / QWCL@2.33) ran to
> companion the cross-extractor audit. Total: 0 critical, 6 important, 13 nits across 20
> findings. Three cross-cutting items (S-01 FTE Phase 2 convergence gap; S-02 D.1.8
> lifecycle hooks confirmed open; S-03 uneven F1 probe coverage) and three per-project
> items (F-EZQ-01 trailing-comment misattribution affecting ~34% of ezquake cvar comments;
> F-EZQ-03 + F-QWCL-06 `registration_file` column misnamed schema migration; F-QWCL-01
> doc-drift drain-now). Synthesis report:
> `docs/superpowers/reviews/2026-04-28-per-project-validation-synthesis.md`. Per-project
> reports + plans linked from the synthesis. Sequencing recommendation: drain F-QWCL-01 +
> OUT_OF_SCOPE.md date refreshes (D.8.1) in the synthesis commit; queue S-01 + S-03 as a
> compact "cross-extractor Phase 6" arc; F-EZQ-01 + F-EZQ-03 + F-QWCL-06 ride a separate
> ezquake-focused arc since the schema migration touches all four projects' command /
> macro tables.

## Disposition summary

20 findings:

- **Drain-now (2, shipped in this synthesis commit):** F-QWCL-01 doc drift (qwcl
  OUT_OF_SCOPE.md + apps/qw-oracle/CLAUDE.md count refresh 364 -> 380); D.8.1 OUT_OF_SCOPE.md
  "last reviewed" date refresh for ezquake + fte + qwcl from 2026-04-26 to 2026-04-28.
- **Drain-in-arc (8):** S-01 (FTE Phase 2 convergence), S-03 (F1 probe coverage), F-EZQ-01
  (trailing-comment misattribution), F-EZQ-03 (registration_file rename), F-FTE-04 (asset
  monorepo_root), F-FTE-05 (cvargroup regex), F-QWCL-03 (qwcl F1 probes; subset of S-03 but
  drains immediately), F-EZQ-04 / F-EZQ-05 (ezquake OUT_OF_SCOPE.md content updates).
- **HANDOVER (7):** S-02 (D.1.8 lifecycle hooks), F-EZQ-02 + F-FTE-03 + F-QWCL-02 (D.8.2
  validation-fixtures missing for ezquake/fte/qwcl), F-QWCL-04 (D.6.1 Config.set_library_file
  hygiene), F-QWCL-05 (D.6.2 ALL_HANDLERS pattern divergence), F-FTE-02 (D.1.8 carry-over).
- **Logged-only (1):** F-QWCL-07 (FTE flags_raw NULL observation; rolled into S-01).

## Recommended next-arc shape

Two arcs (or one consolidated):

**Arc A -- "cross-extractor Phase 6: FTE convergence + grid uplift"** (roughly 2-3 phases,
small):

1. Section 3.2 runbook tightening: extend `flags_raw` sentinel-form audit to include `IS NULL`.
2. FTE handler updates: call `normalize_flags_raw` on no-flag-token paths; migrate five
   `_concat_string_literals` clones to `extractor_lib._cvar_shared.unescape_c_string` (or
   token-stream adapter, verify).
3. F1 probe uplift: 4 qwcl-keyed equality probes (drain-now from QWCL follow-up plan); +N
   ezquake-keyed equality probes to bring coverage in line with mvdsv.
4. Re-run extract-tag for fte; verify 1085 NULL flags_raw collapse to empty string;
   quality grid F1 + F2 clean.

**Arc B -- "ezquake trailing-comment + registration_file rename"** (roughly 2 phases, small):

1. Fix `_attach_trailing_comments` look-ahead misattribution. Re-run extract-tag for ezquake;
   verify 78 misattributions collapse to correct comments. Sample audit confirms.
2. Schema migration: rename `command_versions.registration_file` ->
   `command_versions.enclosing_function`; same for `macro_versions` and (if applicable)
   `cmdline_param_versions`. Schema bump to v19. Update SCHEMA.md.

Both arcs are small (each estimable at one focused session). Arc A is the higher-value
correctness arc; Arc B is the higher-value data-quality arc. Sequence Arc A first since
S-01's contract tightening updates the runbook that Arc B will validate against.

## Architecture verdict

The cross-extractor pattern audit's central thesis was correct: lift `resolve_fn_ref` and
the cvars normalization stack to `extractor_lib/`, and per-project deep validations land on
a cleaner shared baseline rather than re-discovering the same lift candidates four times.
Three independent Mode B passes confirm the cleaner baseline held: zero critical findings,
no byte-reproducibility violations, no schema drift, no silent data loss. The remaining
cross-cutting work (S-01) is the audit's Phase 2 not having fully converged for FTE -- a
discoverable gap given the audit's runbook contract did not check `IS NULL` as a sentinel
form. Tightening the contract is what makes the Phase 2 convergence arc small.

The per-project bugs (F-EZQ-01 trailing-comment misattribution; F-EZQ-03 column rename) are
genuinely Mode-B-discoverable: neither shows up at the handler-shape audit level, only at
the call-site walk-through that the 40-row Section 3.1 sample forces. The runbook's
prescription that Mode B doubles the sample size is paying off -- Mode A's 20-row sample on
ezquake would have likely missed F-EZQ-01 (10/40 vs 5/20 expected misattributions; with 5/20
the operator might not catch the systemic pattern, with 10/40 the pattern is unmistakable).
