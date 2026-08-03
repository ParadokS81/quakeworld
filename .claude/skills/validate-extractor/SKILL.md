---
name: validate-extractor
description: Use this skill to run a third-party validation pass on a QW Oracle Layer 1 extractor (ezQuake, FTE, QWCL, MVDSV, or any future libclang-based fork). Triggers on "validate the X ship", "run validation pass", "validate extractor", "post-ship validation", "cross-project audit", "/validate-extractor", or any request to verify Layer 1 extractor output is correct, reproducible, and free of silent data loss. Picks the validation mode (post-ship / per-project / cross-project), reads the canonical methodology from VALIDATION-RUNBOOK.md, dispatches subagents in parallel where possible, synthesizes findings, and produces a follow-up action plan. Does NOT cover KTX (tree-sitter, separate runbook).
---

# validate-extractor

Orchestrator for QW Oracle Layer 1 extractor validation passes. Reads `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` as ground truth and executes against it.

The skill knows HOW to run a validation efficiently (mode detection, parallelization, synthesis); the runbook knows WHAT to check. If a check is missing, fix the runbook -- not this skill.

---

## Modes

Pick exactly one. Ask the user if unclear; do not guess.

### Mode A: post-ship validation
**Trigger:** "validate the X arc", "post-ship validation for Y", explicit reference to a recently shipped Layer 1 arc.

**Scope:** one project, one specific version (usually `head`). Runs the full runbook (Sections 0-8) for that project.

**Inputs:**
- `project` -- ezquake / fte / qwcl / mvdsv / fork name.
- `version` -- typically `head`, sometimes a specific tag.
- `arc-spec` (optional) -- path to the arc's spec or plan file for Section 5 spec compliance.

**Output:** one report at `docs/superpowers/reviews/<date>-<project>-<version>-validation.md`. If findings exist, also a follow-up plan at `docs/superpowers/plans/<date>-<project>-<version>-validation-followups.md`.

### Mode B: per-project deep validation
**Trigger:** "deep validation pass on X", "per-project validation", "audit project Y end-to-end".

**Scope:** same as Mode A but typically run against a project that hasn't had a validation pass yet (e.g., ezQuake / FTE / QWCL pre-2026-04-28 had none). Distinguishing factor: deeper handler review, larger random samples in Section 3, more aggressive cross-walk against sibling projects.

**Sample-size adjustment:** Section 3.1 random sample goes from 20 to 40 rows per entity type.

**Output:** same as Mode A.

### Mode C: cross-project pattern audit
**Trigger:** "cross-project audit", "validate all extractors", "cohesive view of all extraction scripts".

**Scope:** all four projects (ezquake / fte / qwcl / mvdsv) AND `extractor_lib/`. Reads the trees side-by-side looking for:
- Sibling-handler shape divergences
- `extractor_lib` lift candidates (helpers duplicated across projects)
- Naming/policy inconsistencies (`valid*` carve-outs, `source_state` predicates, dedup strategies)
- CHECK constraint values vs reachable handler outputs
- Pre-existing HANDOVER residuals worth elevating

**This mode is shallower per-project than Modes A/B but wider in cross-cutting analysis.** Reproduction (Section 1) and runtime cross-validation (Section 2) are run only as smoke checks (one project sample); the focus is Section 4.4 (sibling-handler audit).

**Output:** one cohesive doc at `docs/superpowers/specs/<date>-cross-extractor-pattern-audit.md` (the audit report itself). Follow-up plan at `docs/superpowers/plans/<date>-cross-extractor-followups.md` if findings warrant a shared-lib arc.

---

## Pre-flight (always)

Before any mode runs:

1. **Confirm the runbook exists at the canonical location.**

```bash
test -f apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md && echo OK || echo MISSING
```

If missing, abort and tell the user. The skill is non-functional without the runbook.

2. **Confirm the working tree is clean enough.**

```bash
git status --porcelain | head -20
```

Uncommitted changes in `apps/qw-oracle/scripts/extractors/`, `apps/qw-oracle/scripts/load-knowledge/`, or `data/knowledge.db` mean validation runs against a state that isn't reproducible. Surface this to the user; ask whether to proceed anyway.

3. **Confirm the schema version matches.**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "PRAGMA user_version;"
grep -E "SCHEMA_VERSION\s*=" apps/qw-oracle/scripts/load-knowledge/schema.ts | head -1
```

If they diverge, the DB is stale. Run `extract-tag` for the affected project before continuing, or abort.

4. **Detect available projects.**

```bash
ls apps/qw-oracle/scripts/extractors/*/extract.py 2>/dev/null | sed 's|.*/extractors/||;s|/extract.py||' | sort
```

This is the working set. Anything in this list is fair game; KTX (tree-sitter) is excluded by this skill.

---

## Orchestration plan by mode

### Mode A: post-ship validation

Sequential phases, with parallelism inside each phase:

**Phase 1: reproduction (must run first; everything else depends on byte-stable extractor output).**
- Section 1.1 (extract + git diff)
- Section 1.2 (load + count check)
- Section 1.3 (idempotency)
Run sequentially, in this terminal. Wall time ~30s for MVDSV-sized projects, ~2-5min for ezQuake.

**Phase 2: parallel deep checks** (dispatch as four subagents simultaneously):
- Subagent 1: Section 2 (runtime cross-validation + allowlist verification)
- Subagent 2: Section 3 (field-accuracy audit, 20-row sample per type)
- Subagent 3: Section 4.1 + 4.2 + 4.3 (handler + adapter + load-version review)
- Subagent 4: Section 5 (spec compliance) + Section 7 (determinism review)

Each subagent gets a self-contained brief: working directory, project name, version, post-v17 conventions to check, the relevant runbook section quoted, and a "report under N words" budget.

**Phase 3: integration checks (sequential, in this terminal).**
- Section 6 (quality grid for all four projects)
- Section 8 (tsc, Python imports, MCP smoke)

**Phase 4: synthesis.**
Read all subagent reports + Phase 1/3 outputs. Produce the final report with one section per runbook section. Severity-rank findings. Generate the follow-up plan (drain-now / drain-in-arc / HANDOVER per finding).

### Mode B: per-project deep validation

Same as Mode A with these adjustments:
- Section 3.1 sample size 20 → 40.
- Section 4.4 (cross-project sibling audit) added to Subagent 3's brief.
- Subagent 3 reads ALL four projects' siblings of the relevant handlers, not just the target project's.

### Mode C: cross-project pattern audit

Different shape: NOT per-project. Three subagents in parallel, each reading a slice of the codebase:

- Subagent 1: Read `extractor_lib/*.py` end-to-end. Identify shared helpers, list which projects use which helpers, flag duplicated logic that should be lifted.
- Subagent 2: Read `_handler_cvars.py`, `_handler_commands.py`, `_handler_cmdline.py` across all four projects (12 files). Look for shape divergences (Section 4.4).
- Subagent 3: Read `_handler_*.py` for project-specific entity types (mvdsv: protocol/info_keys/log_templates/qc_builtins; fte: macros, asset_*; ezquake: hud_elements, keynames, etc.). Look for divergent dedup strategies, CHECK-constraint reachability gaps, undocumented divergences.

Plus, in this terminal:
- Read `load-version.ts` end-to-end, looking for project-specific carve-outs that should generalize or vice versa.
- Read `schema.ts` end-to-end, looking for CHECK values that handlers can't actually produce or vice versa.

Synthesis produces ONE cross-project audit doc with:
- Inventory of shared helpers and their consumers.
- List of cross-cutting findings (each tagged with severity and which projects it affects).
- Recommended shared-lib follow-up arc with phases.

---

## Subagent brief template

When dispatching a subagent, the brief MUST include:

1. **Goal statement** in plain English (one paragraph).
2. **Working directory** -- always `/home/paradoks/projects/quakeworld`.
3. **Files to read** -- explicit absolute paths, no globbing the agent has to interpret.
4. **What to look for** -- the runbook section quoted (or paraphrased) plus any anchor cases from prior validation passes that surfaced findings.
5. **Output budget** -- "report under N words" or "max one page."
6. **Severity rubric** -- copy the runbook's Severity guidance verbatim.
7. **Out-of-scope marker** -- explicitly say "do not fix anything; report only."

The skill must not delegate understanding. Subagents synthesize within their slice; the skill synthesizes across slices.

---

## Reporting format

The final report at `docs/superpowers/reviews/<date>-<descriptor>-validation.md` has this shape:

```markdown
# <Project> <Version> Validation Report

**Date:** YYYY-MM-DD
**Mode:** post-ship / per-project / cross-project
**Validated commit:** <SHA>
**Schema version:** vN
**Validator:** Claude (validate-extractor skill)

## Summary

One paragraph: what was validated, headline verdict, count of findings by severity.

## Section-by-section results

### Section 0: Pre-flight
**Verdict:** as-claimed / caveat / findings.
[evidence]

### Section 1: Reproducibility
[as above]

... (one heading per runbook section run) ...

## Findings table

| ID | Section | Severity | File:Line | Description | Disposition |
|---|---|---|---|---|---|
| F-01 | 4.4 | important | ... | ... | drain-in-arc / HANDOVER / drain-now |

## Follow-up plan

If any findings have disposition `drain-in-arc` or `drain-now`, link to a separate plan file at `docs/superpowers/plans/<date>-<descriptor>-followups.md` with phase-by-phase breakdown.

If only `HANDOVER` dispositions, append the lines to `HANDOVER.md` directly and note that here.
```

---

## Anchor cases to check (cumulative library)

These are findings from prior validation passes. Every new pass should at least confirm these specific cases are still healthy.

**From MVDSV Phase 2e validation (2026-04-28):**
- `flags_raw` for absent/`0`/`CVAR_NONE` cvars should be empty string (post-v17). Section 3.2 covers.
- `_resolve_fn_ref` lives in `extractor_lib/_resolve.py`, not duplicated in handlers. Section 4.4 covers.
- info_key cross-scope canonical names follow `<bare>:<scope>`. Section 4.4 covers; check by querying `entities WHERE type='info_key' AND project='mvdsv'`.
- protocol_message kind taxonomy is 13 values (svc/clc/nq/protocol_version/protocol_extension_id/pext_fte_{bit,const,alias,marker}/pext_mvd_{bit,const,alias,marker}). Section 4.2 covers.
- F1.*.count probes are equality assertions (`n === expected`), not floors. Section 6 covers.
- log_template has `all_call_sites_json`. Section 4.2 covers.

**From HANDOVER residuals (carry forward until drained):**
- qc_builtin cross-scope name collisions across std_builtins/ext_builtins/ext_syscalls (Pattern-14 candidate).
- pext_*_alias fall-through (aliases to other macros not always resolved).
- `validInfoKey` alphabet is hardcoded (limits future scope additions).
- 14 historical-version `sv_demoregexp` rows with field anomalies (ezquake-specific).

When validating, check these explicitly. If any has been silently fixed, note that and clear from HANDOVER.

---

## What this skill does NOT do

- It does not modify code. Findings drive a follow-up plan; another session executes that plan.
- It does not validate KTX (tree-sitter). When KTX ships, write a parallel skill or extend this one with a tree-sitter mode.
- It does not validate Layer 2 (chat corpus) or Layer 3 (concept notes). Different domains, different review processes.
- It does not bypass the runbook. If a check seems missing, fix the runbook first.

---

## Forks

When validating a fork (unezQuake, antilag-mvdsv, etc.):

1. Treat the fork as Mode A or Mode B.
2. Add a "diff against parent" step before Section 4.4: `diff -r apps/qw-oracle/scripts/extractors/<parent>/ apps/qw-oracle/scripts/extractors/<fork>/`. Any divergence in handlers / driver / clang_config is a finding unless justified in a docstring.
3. Section 3.2's cross-project field-shape audit MUST include the fork alongside its parent.

---

## When unsure, ask

If the user invokes the skill ambiguously ("run validation"), ask which mode and which project. If they ask for "all extractors" without saying cross-project vs per-project, ask which. If they ask for KTX, decline and explain.
