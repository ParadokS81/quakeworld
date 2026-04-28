# Cross-Extractor Pattern Audit Spec

**Status:** ready to execute (post-consolidation; D.5 architecture meta-finding answered)
**Date:** 2026-04-28
**Updated:** 2026-04-28 (post architecture-consolidation arc, commits 5b943d4 → 8115b48)
**Mode:** cross-project (Mode C in `validate-extractor` skill)
**Schema baseline:** v17
**Architecture baseline:** post-consolidation -- all four projects use `<project>/_handler_*.py`; `extractor_lib/` contains only Tier-1 infrastructure (`_visitor`, `_base`, `_resolve`, `clang_config`, `__init__`).

## Context

The MVDSV Phase 2e validation (2026-04-28) was the first third-party validation pass run on a Layer 1 extractor. It surfaced 5 findings that drove the v16+v17 schema migration arc, several of which were cross-cutting (`flags_raw` normalization across all four projects, `_resolve_fn_ref` divergence between handlers, info_key cross-scope collapse). The other three projects (ezQuake, FTE, QWCL) shipped without comparable validation. They almost certainly have similar latent issues.

The MVDSV pass was deep-per-project. This audit is the orthogonal direction: **shallow per-project, wide cross-project.** Look for shape divergences, duplicated logic with policy drift, undocumented divergences, and `extractor_lib` lift candidates that the per-project deep dives would miss because each project looks healthy in isolation.

This audit's output drives a shared-lib follow-up arc that drains cross-cutting issues BEFORE the per-project deep validations run. Same sequencing logic as: drain MVDSV follow-up → then write the runbook + skill. Cleaner baseline = smaller per-project plans = less duplicate work.

## Goal

Produce one cohesive doc that:
1. Inventories the current extractor architecture (which projects use what shape).
2. Identifies cross-cutting findings (each tagged with severity and projects affected).
3. Recommends a shared-lib follow-up arc with phases.

Findings discipline: every finding gets a track (drain-now / drain-in-arc / HANDOVER). No prose deferrals.

## Non-goals

- This audit does NOT do deep per-project validation. That comes after the cross-cutting follow-up arc lands. Anchor cases from the runbook's "anchor cases" library are checked here only as smoke; full per-project Sections 1-8 happen later.
- KTX is out of scope (tree-sitter, separate runbook when KTX ships).
- Layer 2 / Layer 3 are out of scope.

## Architecture inventory (do this first)

Before the audit can name divergences, it has to map the current shape. Pre-audit reading:

### A.1 Extractor architecture per project (POST-CONSOLIDATION)

Each of the four projects now follows the canonical project-private shape post architecture-consolidation arc (commits 5b943d4 → 8115b48, 2026-04-28). For each, confirm:

- ezQuake: `apps/qw-oracle/scripts/extractors/ezquake/extract.py` + 8 `_handler_*.py` (cvars, commands, cmdline, macros, hud_elements, keynames, asset_cvar_bindings, asset_loader_sites). Class names: `Cvars<Project>EzquakeHandler` etc.
- FTE: `apps/qw-oracle/scripts/extractors/fte/extract.py` + 8 `_handler_*.py` (cvars, commands, cmdline, macros, asset_cvar_bindings, asset_loader_sites, ezhud, ezscript).
- QWCL: `apps/qw-oracle/scripts/extractors/qwcl/extract.py` + 3 `_handler_*.py` (cvars, commands, cmdline).
- MVDSV: `apps/qw-oracle/scripts/extractors/mvdsv/extract.py` + 7 `_handler_*.py` (cvars, commands, cmdline, info_keys, log_templates, protocol, qc_builtins).

All four projects now look structurally identical: `<project>/_handler_*.py` for project-specific handlers, imports `Visitor` (and post-v17 `_resolve.resolve_fn_ref`) from `extractor_lib`. **The pre-consolidation architecture divergence (D.5) is resolved.**

### A.2 extractor_lib inventory (POST-CONSOLIDATION)

`apps/qw-oracle/scripts/extractors/extractor_lib/` now contains ONLY Tier-1 shared infrastructure:

- `__init__.py` -- package marker.
- `_base.py` -- `Handler` protocol.
- `_visitor.py` -- `Visitor` base class + `walk_tu_dispatch`.
- `_resolve.py` -- `resolve_fn_ref` (post-v17 lift; both commands and qc_builtins handlers import from here in MVDSV).
- `clang_config.py` -- per-engine clang args functions.

No `handler_*.py` files. No project-specific code. Verify via `ls extractor_lib/*.py` in pre-flight.

The Tier-2 (family-base handlers) tier remains empty today -- no fork has landed yet. When unezQuake or antilag-mvdsv lands, the rule is: subclass parent project's handlers directly first, lift to a `handler_<family>_<type>.py` in extractor_lib only on subclassing pressure.

### A.3 load-version.ts inventory

Read `apps/qw-oracle/scripts/load-knowledge/load-version.ts` end-to-end. Map:
- Per-type adapter dispatch table (`ADAPTERS` constant).
- The array-to-dict normalization (post-v15) and which projects actually emit array-shaped payloads.
- The `valid*` carve-outs (`validIdentifier`, `validLogTemplate`, `validInfoKey`, etc.) and their `options.type ===` gates.
- Any project-specific or type-specific code paths that aren't load-bearing across all four projects.

### A.4 schema.ts inventory

Read schema.ts top-to-bottom. For the audit:
- Every `CHECK` constraint on entity-versions tables. Note the allowed value set.
- Cross-reference each CHECK against handler outputs to find unreachable values OR handler outputs that violate CHECK.

## Audit dimensions

Once architecture is mapped, look for divergences along each dimension below. Each dimension produces zero or more findings, each tagged with severity (critical / important / nit) and projects affected (intersection of {ezquake, fte, qwcl, mvdsv}).

### D.1 Sibling-handler shape divergences

For each entity type that exists in 2+ projects (cvar, command, cmdline_param, macro), line up the handlers side-by-side. Look for:

- Different fallback policies for the same edge case (e.g., what does the cvar handler do when the `cvar_t` has only 2 positional args vs 3 vs 4? Each project handles this; is the handling identical?).
- Different defensive normalization rules (post-v17, MVDSV normalizes `flags_raw` for absent/`0`/`CVAR_NONE` to empty -- does FTE/QWCL/ezQuake do the same? If they inherit from `extractor_lib/handler_cvars.py`, yes. Verify.).
- Different dedup strategies (first-wins vs last-wins vs aggregate-into-list).
- Different lifecycle handling (`start_file`/`end_file` reset patterns; per-variant state isolation).

Anchor cases (from HANDOVER residuals): qc_builtin cross-scope name collisions in MVDSV (4 names span std_builtins/ext_builtins/ext_syscalls). Do FTE / ezQuake / QWCL have analogous cross-table dedup issues anywhere?

### D.2 extractor_lib lift candidates

Identify helpers duplicated across 2+ projects' `_handler_*.py` files. For each:

- Is the duplicate identical, or has it drifted (different fallback, different regex, different normalization)?
- If drifted: what's the right unified policy?
- If identical: lift to `extractor_lib/`.

Anchor cases:
- `_resolve_fn_ref` lifted in v17 -- audit other helpers in `_handler_*.py` for the same shape (helper functions starting with `_resolve_*`, `_parse_*`, `_normalize_*`, `_extract_*`).
- Regex constants (`_INTEGER_RE`, `_HEX_RE`, `_BITSHIFT_RE`, `_DECORATION_RE`, etc.) -- duplicates across handlers?

### D.3 Schema CHECK reachability

For each CHECK constraint in schema.ts:
- List the allowed values.
- Trace which handler outputs (via the corresponding adapter) can produce each value.
- Flag values that are CHECK-allowed but never produced by any handler (dead allow).
- Flag values that handlers can produce but CHECK doesn't allow (would cause INSERT failures -- critical).

Anchor case: post-v17 protocol_message has 13 kinds. Confirm all 13 are reachable from `_handler_protocol.py`. Confirm `_handler_protocol.py` doesn't ever emit a kind outside that 13-set.

### D.4 valid* carve-outs in load-version.ts

For each `valid*` predicate in `load-version.ts`:
- What entity types is it gated to? (Should be `options.type === '<type>'`.)
- Does the carve-out alphabet/syntax match what the corresponding Python handler emits?
- Does the carve-out exclude legitimate identifiers that some other handler emits? (E.g., does `validLogTemplate` accidentally accept identifiers from `info_key` or `command` types? It's gated by type, so it shouldn't, but verify the gate is tight.)

Anchor case (from HANDOVER): `validInfoKey` alphabet is hardcoded -- limits future scope additions or info_key naming evolutions. Surface this and propose a parameterized version.

### D.5 Project-private vs shared handler architecture (ANSWERED)

Resolved by the architecture-consolidation arc (commits 5b943d4 → 8115b48, 2026-04-28). The canonical shape is:

- All projects use `<project>/_handler_*.py` (Tier 3).
- `extractor_lib/` holds Tier-1 shared infrastructure only.
- Tier-2 (family-base handlers in `extractor_lib/handler_<family>_*.py`) is empty pending the rule-of-second-consumer trigger when unezQuake / antilag-mvdsv land.

This dimension's audit work for the cross-project pass is now: **verify the consolidation invariants hold.** Specifically, confirm:
- `extractor_lib/` contains no `handler_*.py` files.
- Each `<project>/` contains the expected count of `_handler_*.py` files (ezquake=8, fte=8, qwcl=3, mvdsv=7).
- Class names follow the `<Type><Project>Handler` convention (`CvarsEzquakeHandler`, `CvarsFteHandler`, `CvarsQwclHandler`, `CvarsMvdsvHandler`).
- All projects extend `Visitor` (directly, not via a shared concrete handler).

If any invariant fails, that's a regression on the consolidation arc -- file as a critical finding.

### D.6 Driver shape divergences

`extract.py` shape across the four projects:
- Multi-variant TU dispatch (ezQuake: client/server/win/apple; MVDSV: server-base/win/linux; FTE: ?; QWCL: ?). Document.
- Multiprocessing setup (fork mode? worker count default? chunk size?). Are these consistent? Should they be?
- Pre-fork global state (`_WORKER_HANDLERS` etc.). Is the pattern identical across projects?
- Output filename conventions (`<project>-<type>-ast.json`). Verify consistency.

### D.7 Idempotency and determinism

Per project, can extraction be re-run with identical output? The runbook's Section 1 covers this. For the audit, we're not fully running it -- but we should sample one project (recommend MVDSV since it just shipped clean) and confirm the runbook's Section 1.1 still passes. If it doesn't, that's a critical regression independent of this audit.

### D.8 OUT_OF_SCOPE.md and validation-fixtures

Per project, the documentation of WHY things are excluded:
- Each project should have an `OUT_OF_SCOPE.md` (MVDSV does; ezQuake?, FTE?, QWCL?).
- Each project that has a runtime-validation harness should have `validation-fixtures/` with allowlists, prefixes, and reference dumps (only MVDSV has this today).
- Surface gaps: which projects need an `OUT_OF_SCOPE.md` written?

## Execution plan

Three parallel subagents + this terminal.

**Subagent 1: extractor_lib audit.** Read all of `extractor_lib/*.py` end-to-end. For each shared handler, document its current consumers (which projects use it). Identify lift candidates from looking at the project-private `_handler_*.py` files. Output: section A.2 + dimension D.2 findings.

**Subagent 2: cvar/command/cmdline cross-project sibling audit.** Read `_handler_cvars.py`, `_handler_commands.py`, `_handler_cmdline.py` from FTE, QWCL, MVDSV (9 files), plus the corresponding `extractor_lib/handler_*.py` (3 files) used by ezQuake. Output: dimension D.1 findings.

**Subagent 3: project-specific handler audit.** Read the handlers that exist only in some projects: FTE's `_handler_macros.py`, `_handler_asset_*.py`, `_handler_ezhud.py`, `_handler_ezscript.py`; MVDSV's `_handler_info_keys.py`, `_handler_log_templates.py`, `_handler_protocol.py`, `_handler_qc_builtins.py`; ezQuake's flag-bits.py / rulesets.py / token-primitives.py. Output: dimension D.1 findings (project-specific divergences) + dimension D.5 (architecture meta-finding).

In this terminal:
- Section A.1 architecture inventory by directory listing + reading each `extract.py` header.
- Section A.3 `load-version.ts` end-to-end read.
- Section A.4 `schema.ts` CHECK constraint mapping (dimension D.3).
- Dimension D.4 (`valid*` carve-outs in load-version.ts).
- Dimension D.6 (driver shape divergences).
- Dimension D.8 (OUT_OF_SCOPE.md + validation-fixtures inventory).

Synthesis at the end: collect all subagent findings + this-terminal findings, deduplicate, severity-rank, group by recommended fix scope.

## Deliverables

1. **`docs/superpowers/specs/2026-04-28-cross-extractor-pattern-audit.md`** -- this file (the spec).

2. **`docs/superpowers/reviews/<date>-cross-extractor-audit-report.md`** -- the audit report itself, produced when the spec is executed. Shape:
   - Architecture inventory (sections A.1-A.4).
   - Findings table grouped by dimension (D.1-D.8). Each finding: id, dimension, severity, projects affected, description, evidence (file:line + quoted code), recommended disposition.
   - Architecture recommendation (D.5 meta-finding answer).

3. **`docs/superpowers/plans/<date>-cross-extractor-shared-lib-arc.md`** -- the follow-up arc plan, produced if drain-in-arc findings exist. Shape mirrors `2026-04-28-mvdsv-phase2e-followups.md`: phases with file paths, surgery notes, verification commands.

4. **HANDOVER.md amendments** -- any drain-later findings.

## Acceptance

The audit is done when:
- Every dimension D.1-D.8 has a written verdict (findings or "clean").
- The architecture meta-finding (D.5) has a recommendation.
- Every finding has a disposition.
- The follow-up arc plan, if any, is written and passes a quick sanity check (the user reads it and agrees it's the right scope).

## What comes after

Once the cross-extractor follow-up arc lands (whatever scope the audit produces), the per-project deep validation passes can run with confidence that they won't surface the same cross-cutting issues four times. Each per-project pass becomes its own arc:

1. Per-project deep validation: ezQuake (Mode B in the skill).
2. Per-project deep validation: FTE.
3. Per-project deep validation: QWCL.

These can run in parallel as three subagents in one session, OR one at a time across three sessions. Either is fine; per-project work is mostly independent post-cross-cutting-arc.

After all three plus the cross-extractor audit, Layer 1 has been validated end-to-end across the entire libclang-based extractor surface. KTX is the next missing piece (separate methodology, separate runbook).
