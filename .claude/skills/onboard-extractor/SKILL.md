---
name: onboard-extractor
description: Use this skill to onboard a new codebase into the QW Oracle Layer 1 extraction pipeline. Triggers on "onboard X extractor", "add X codebase", "new fork", "set up unezQuake extractor", "set up antilag-mvdsv extractor", "port X to qw-oracle", "new engine", "/onboard-extractor", or any request to add a new project to the four-project extractor lineup (ezQuake / FTE / QWCL / MVDSV). Detects whether the new codebase is a fork (subclass parent project's handlers) or a cross-codebase port (write fresh handlers extending only Visitor), walks the post-consolidation canonical setup, sets up the directory structure, wires into load-knowledge, adds F1 quality-grid probes, and runs the validation runbook's reproducibility section as a smoke check before declaring onboarding done. Does NOT cover KTX (tree-sitter, separate methodology).
---

# onboard-extractor

Orchestrator for adding a new codebase to QW Oracle's Layer 1 extraction pipeline. Reads `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` (sections "Three-tier handler architecture" + "Porting to a new engine") as ground truth and executes the onboarding workflow.

The skill knows HOW to walk the workflow (mode detection, directory setup, wiring, validation handoff); the playbook knows WHAT each step requires technically. If technical content seems missing, fix the playbook -- not this skill.

---

## Modes

Pick exactly one. Ask the user if unclear.

### Mode F: Fork onboarding
**Trigger:** the new codebase is a fork of an already-onboarded project. The new codebase shares ~80%+ of its registration patterns with the parent.

**Examples:**
- unezQuake → fork of ezQuake. Imports from `ezquake._handler_*`, subclasses, overrides only what differs.
- antilag-mvdsv → fork of MVDSV. Imports from `mvdsv._handler_*`, subclasses, overrides only what differs.

**Output:** new project directory at `apps/qw-oracle/scripts/extractors/<fork-name>/` containing thin subclass handlers, an `extract.py` adapted from the parent, and the standard scaffolding (output/, validation-fixtures/, OUT_OF_SCOPE.md).

### Mode P: Cross-codebase port
**Trigger:** the new codebase is genuinely independent of all four existing projects. Different registration APIs, different file layout, different conventions.

**Examples:**
- (Historically) FTE was a port. QWCL was a port.
- A future fully-independent QW client would be a port.

**Output:** new project directory at `apps/qw-oracle/scripts/extractors/<project-name>/` containing fresh `_handler_*.py` files extending only `Visitor`, an `extract.py` written from scratch (using ezQuake's, FTE's, or MVDSV's as a template depending on shape), and the standard scaffolding.

### Mode K: Tree-sitter port (NOT YET SUPPORTED)
**Trigger:** the new codebase is QuakeC, Lua, or similar tree-sitter-targetable source rather than C.

**Action:** decline. Tell the user this skill covers libclang-based extractors only. KTX (the canonical tree-sitter case) gets a separate runbook + skill when it ships. Ask whether they want to proceed with KTX setup, in which case route them to the (not-yet-existent) tree-sitter onboarding doc.

---

## Pre-flight (always)

Before any mode runs:

1. **Confirm working directory and clean tree.**

```bash
pwd  # ends in 'quakeworld'
git status --porcelain | head -20  # surface uncommitted changes
```

If uncommitted changes exist in `apps/qw-oracle/scripts/extractors/`, surface them and ask whether to proceed.

2. **Confirm the playbook has the canonical architecture sections.**

```bash
grep -nE "Three-tier handler architecture|Porting to a new engine|Is this a fork or a cross-codebase port" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
```

Expected: three matches at lines (approximately) 72, 624, 635. If missing, the playbook is pre-consolidation and this skill cannot run safely. Abort and tell the user to land the architecture consolidation arc first.

3. **Confirm the new codebase is checked out.**

The new codebase must live at `research/repos/<project>/` with a complete source tree. If absent, ask the user to clone it and provide the canonical name (lowercase, hyphens, no spaces -- e.g., `unezquake`, `antilag-mvdsv`).

```bash
ls research/repos/<project>/ 2>/dev/null && echo OK || echo MISSING
```

4. **For Mode F (fork): identify the parent project.**

Ask the user: which of {ezquake, fte, qwcl, mvdsv} is the parent? Confirm the answer is one of the four onboarded projects. If the user names a non-onboarded project, route to Mode P instead.

5. **Capture metadata the user must provide.**

Required:
- Project name (canonical, lowercase, kebab-case).
- Parent project (Mode F only).
- Source root path under `research/repos/<project>/` (typically `src/` for servers, `Quake/` or `QW/client/` for older clients).
- Engine type: server / client / both.
- Initial version to load: typically `head` for active codebases, or a specific tag.

Optional but useful:
- Known divergences from parent (Mode F): different cvar API name, different help-JSON path, additional registration patterns.
- Multi-variant TU dispatch needed: client/server, win/linux, etc. (Defaults: ezquake = client+server+win+apple; mvdsv = server-base+win+linux; fte = engine+plugins, 4 variants; qwcl = single client variant.)

---

## Mode F: Fork onboarding workflow

### Phase F1: Directory scaffold

Create the new project directory mirroring the parent's structure:

```
apps/qw-oracle/scripts/extractors/<fork>/
├── extract.py                              (adapted from parent)
├── _handler_<type>.py                      (one per entity type, thin subclass of parent's handler)
├── output/                                 (gitignored except the .json files)
├── validation-fixtures/                    (only if a runtime dump exists for this fork)
│   ├── README.md
│   └── <runtime-dump>.log
├── OUT_OF_SCOPE.md                         (initially empty -- populate after first runtime validation)
└── seeds/                                  (only if the fork has hand-authored taxonomy like asset bundles)
```

Steps:

- [ ] **Step 1: Create the directory and stub files.**

```bash
mkdir -p apps/qw-oracle/scripts/extractors/<fork>/output
mkdir -p apps/qw-oracle/scripts/extractors/<fork>/validation-fixtures
touch apps/qw-oracle/scripts/extractors/<fork>/OUT_OF_SCOPE.md
```

- [ ] **Step 2: Copy parent's `extract.py` as the starting template.**

```bash
cp apps/qw-oracle/scripts/extractors/<parent>/extract.py apps/qw-oracle/scripts/extractors/<fork>/extract.py
```

Edit the copy:
- Update the module docstring to describe THIS fork (not the parent).
- Update default repo path: `<parent>` → `<fork>` in `<PROJECT>_REPO_DEFAULT`.
- Update output filename prefix: parent's prefix (e.g. `ezquake-`) → fork's (e.g. `unezquake-`).
- Update handler imports: `from _handler_cvars import Cvars<Parent>Handler` → `from _handler_cvars import Cvars<Fork>Handler`.
- If the fork has different multi-variant TU dispatch needs, update `VARIANT_FUNCS`. If unsure, start with the parent's variants and adjust after the first extraction.

### Phase F2: Subclass handlers

For each handler in the parent project:

- [ ] **Step 1: Determine if a subclass is needed for this entity type.**

If the fork doesn't have this entity type at all (e.g., antilag-mvdsv might not have a different log_template surface), skip. The fork's `extract.py` registers only the handlers it needs.

If the fork has the entity type but no known divergences, the subclass is trivial:

```python
# apps/qw-oracle/scripts/extractors/<fork>/_handler_cvars.py
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parent / "<parent>"))

from _handler_cvars import Cvars<Parent>Handler  # noqa: E402


class Cvars<Fork>Handler(Cvars<Parent>Handler):
    """<Fork>-specific cvar handler. Inherits all behavior from <Parent>.

    Override surface (see parent class for hooks):
    - <list any methods this fork overrides; empty if none>
    """
    name = "cvars"
    output_filename = "<fork>-variables-ast.json"
```

If the fork has KNOWN divergences (user provided in pre-flight Step 5), override the relevant methods. Use the parent's `# Fork override hook:` annotations as a guide for which methods are designed for override. Do NOT override methods that aren't annotated as fork hooks unless you've confirmed the parent's author would accept the new override surface (escalate to the user if unclear).

- [ ] **Step 2: Repeat for each handler the fork needs.**

### Phase F3: Wire into load-knowledge

The TypeScript loader needs to know about the new project.

- [ ] **Step 1: Add to `PROJECT_EXTRACTOR` and `ENTITY_JSON_FILES` in `extract-tag.ts`.**

```bash
grep -n "PROJECT_EXTRACTOR\|ENTITY_JSON_FILES" apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
```

Read those constants. Add the fork's entry mirroring the parent's, with paths updated to point at the fork's directory.

- [ ] **Step 2: If the fork has a different per-type loader requirement** (it shouldn't, normally -- the loaders are project-agnostic), surface that to the user. The default assumption is the fork uses the same `load-<type>.ts` adapters as every other project.

### Phase F4: Quality-grid probes

Per post-v17 convention, every project gets F1 equality-assertion probes for entity counts.

- [ ] **Step 1: Run a first extraction + load to capture baseline counts.**

```bash
python3 apps/qw-oracle/scripts/extractors/<fork>/extract.py --workers 12
bun --cwd apps/qw-oracle run load-knowledge -- extract-tag --project <fork> --version <version> --ordinal <next-ordinal>
psql "$DATABASE_URL" -c "SELECT type, COUNT(*) FROM entities WHERE project='<fork>' AND source_state='source_backed' GROUP BY type ORDER BY type;"
```

Record the counts.

- [ ] **Step 2: Add F1.<fork>.*_count equality probes to `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`.**

Mirror the existing F1.<parent>.*_count probes; replace `expected` with the values from Step 1. Add corresponding entries to the probes registry at the bottom of the file.

- [ ] **Step 3: If the fork has fork-specific anomaly checks** (e.g., a probe that asserts the fork retains the `unezquake_*` prefix on its custom cvars), add F2.<fork>.* probes. Skip if no fork-specific assertions are warranted.

- [ ] **Step 4: Run the quality grid; confirm green.**

```bash
bun --cwd apps/qw-oracle run load-knowledge -- quality-grid --project <fork> --family both
```

### Phase F4.5: Register in universal gate config dicts

Register the new project in each universal gate's per-project config dict.
This step takes approximately 5 minutes per gate file. The gates and their
config keys:

- **`idempotency.ts` (`PROJECT_IDEMPOTENCY_CONFIG`):** add entry with
  `versionsTables` (read each `scripts/load-knowledge/load-*.ts` file to
  find which `*_versions` tables get rows written for this project) and
  `gameplayTables` (empty `[]` unless the project has gameplay rows like KTX).

- **`reproducibility-check.ts` (`PROJECT_REPRODUCIBILITY_CONFIG`):** add
  entry with `extractPy`, `repoRoot`, and `outputDir` (resolve via
  `resolve(SCRIPT_DIR, '../extractors/<project>/...')` -- see existing entries
  for the exact pattern).

- **`extractor_lib/tests/parallel_serial_helpers.py`:** write per-handler test
  file(s) at `<project>/tests/test_handler_<name>_parallel_serial.py` for any
  handlers identified as parallel-aggregation-risky. Use
  `assert_parallel_serial_equivalent` from `extractor_lib.tests`. If no
  handlers have parallel-aggregation risk, skip.

- **`migration-probes.ts`:** n/a -- migrations are global; no per-project
  config needed.

Cross-reference: `scripts/load-knowledge/VALIDATION-GATES.md` Section 5 has
the full per-gate config dict shapes and a step-by-step checklist.

This phase also applies as **Phase P4.5** in Mode P (cross-codebase port)
onboarding. The steps are identical.

> **Anti-pattern -- no per-project bash scripts.** The KTX-era `idempotency-ktx.sh` pattern (a per-project bash script running a snapshot-diff idempotency check) is retired. Universal gates in `scripts/load-knowledge/` handle idempotency, reproducibility, and related checks for all projects via `bun run load-knowledge -- <gate> --project <name>`. Do NOT author a new per-project bash script for any gate the universal suite covers. Instead, add the new project to each universal gate's per-project config dict (see `scripts/load-knowledge/VALIDATION-GATES.md` Section 5 for the config dict shape).

### Phase F5: Validation handoff

Run ALL universal gates against the new project. All must pass before declaring
the onboarding complete. The smoke check has grown from one probe (re-extract
diff) to four probes.

- [ ] **Step 1: Reproducibility -- re-run extraction + confirm zero git diff.**

```bash
bun run load-knowledge -- reproducibility-check --project <fork>
```

PASS condition: exit 0 (empty diff -- extractor output is reproducible).

- [ ] **Step 2: Idempotency -- re-run load + confirm no row drift.**

```bash
bun run load-knowledge -- idempotency --project <fork>
```

PASS condition: exit 0 (no count or content drift across all checked tables).

- [ ] **Step 3: Parallel-vs-serial equivalence -- run per-handler tests (if any).**

```bash
pytest apps/qw-oracle/scripts/extractors/<fork>/tests/ -v
```

PASS condition: all tests pass. If no test files exist (no handlers with
parallel-aggregation risk were identified in Phase F4.5), this step is skipped.

- [ ] **Step 4: Migration probes (if applicable).**

Run only if the onboarding introduced a new schema migration:

```bash
bun run load-knowledge -- migration-probes
```

PASS condition: all probes PASS (exit 0).

- [ ] **Step 5: Recommend a follow-up validate-extractor pass.**

Tell the user: "First-ship onboarding complete. All universal gates pass.
Recommend running `validate-extractor` skill in Mode A (post-ship validation)
on `<fork>` before declaring the project production-ready. The runbook's full
Sections 0-8 catch issues that the Phase F5 gate set does not."

If the fork has a runtime dump (cvarlist/cmdlist), also recommend populating
`validation-fixtures/` and running the runbook's Section 2.

### Phase F6: Documentation

- [ ] **Step 1: Update `apps/qw-oracle/CLAUDE.md`.** Add one-paragraph status entry naming the fork, its parent, the loaded version + commit SHA, the entity counts, and any known divergences from parent.

- [ ] **Step 2: Update `apps/qw-oracle/SCHEMA.md` if any new entity types or schema changes were introduced.** (Forks shouldn't normally introduce schema changes; if they do, escalate to the user before proceeding.)

- [ ] **Step 3: Memory amendment.** Add or update a memory file `project_<fork>_extraction.md` noting onboarding date, parent, key divergences, baseline counts, and a pointer to the validation report (when run).

### Phase F7: Commit

Single commit per phase, or one bundled commit if the work was small. Pattern:

```
feat(qw-oracle): <fork> Layer 1 extractor (fork of <parent>) -- onboard at version <v>

<fork> handlers subclass <parent>'s. Counts: <type=N, ...>. Quality grid
F1.<fork>.*_count equality probes added. Smoke validation passes (zero JSON
diff post re-extraction). Full validate-extractor Mode A pass recommended
before production use.
```

Push.

---

## Mode P: Cross-codebase port workflow

Same overall shape as Mode F but with these differences:

### Phase P1: Directory scaffold

Same as F1, but `extract.py` is written from scratch (or copied from the most-similar existing project as a structural template, then heavily edited). Use the project that most closely matches the new codebase's shape:

- Single-variant client extractor → use `qwcl/extract.py` as template.
- Multi-variant client extractor → use `ezquake/extract.py` as template.
- Server-only extractor → use `mvdsv/extract.py` as template.
- Engine + plugin tree → use `fte/extract.py` as template.

Document why this template was chosen at the top of the new `extract.py`.

### Phase P2: Fresh handlers

Each handler extends `Visitor` directly (not a parent project's handler):

```python
# apps/qw-oracle/scripts/extractors/<project>/_handler_cvars.py
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


class Cvars<Project>Handler(Visitor):
    """<Project>-specific cvar handler. Walks the project's registration
    pattern, which differs from the four canonical projects in the following
    ways:
    - <document the divergences>
    """
    name = "cvars"
    output_filename = "<project>-variables-ast.json"

    # ... implementation specific to this project's registration patterns ...
```

Inventory the project's registration APIs first (see EXTRACTOR-PLAYBOOK.md "Porting to a new engine" Step 1). Map each to a pattern in the playbook's "Registration pattern catalog" (Patterns 1-14). New patterns mean new handler logic; document at the top of the handler.

### Phase P3 onward

Phases P3 (load-knowledge wiring), P4 (quality-grid probes), P4.5 (register in universal gate config dicts), P5 (validation handoff), P6 (documentation), P7 (commit) are identical to Mode F's F3, F4, F4.5, F5-F7.

---

## Subagent dispatch

For Mode F, most phases run in this terminal. Subagent dispatch is appropriate for:
- Phase F2 if there are 5+ handlers to subclass (one subagent per handler, parallel).
- Phase F4 Step 2 (probe additions) -- one subagent reads parent's probes and produces the fork's variant.

For Mode P, subagent dispatch is appropriate for:
- Phase P2 if there are 5+ entity types to implement (one subagent per handler, but be aware these are non-trivial implementations -- the subagent needs the full playbook + parent project's handler as reference).

When dispatching, the brief MUST include:
1. Working directory: `/home/paradoks/projects/quakeworld`.
2. Specific files to read: parent project's handler, EXTRACTOR-PLAYBOOK relevant sections, divergences inventory.
3. Output file path: `apps/qw-oracle/scripts/extractors/<new-project>/_handler_<type>.py`.
4. Acceptance: subclass passes Phase F5 smoke validation when integrated.
5. Out-of-scope marker: "do not modify parent project's handlers."

---

## Reporting

The skill produces an onboarding report at `docs/superpowers/reviews/<date>-<project>-onboard.md`:

```markdown
# <Project> Layer 1 Onboarding Report

**Date:** YYYY-MM-DD
**Mode:** F (fork) / P (cross-codebase port)
**Parent:** <parent project, if Mode F>
**Source:** research/repos/<project> @ <commit SHA>
**Loader version:** <schema version>

## Phases completed

- [x] Phase F1/P1: directory scaffold
- [x] Phase F2/P2: handlers (N created)
- [x] Phase F3/P3: load-knowledge wiring
- [x] Phase F4/P4: quality-grid probes
- [x] Phase F5/P5: smoke validation
- [x] Phase F6/P6: documentation
- [x] Phase F7/P7: commit

## Baseline counts

| Type | Count |
|---|---|
| cvar | N |
| command | N |
| ... | ... |

## Known divergences from parent (Mode F only)

- <list any handler overrides + reasons>

## Outstanding issues

- <anything that needs the validate-extractor follow-up pass>

## Recommended next step

Run `validate-extractor` skill in Mode A (post-ship) on `<project>` before declaring production-ready.
```

---

## What this skill does NOT do

- It does not validate the onboarded project beyond Phase F5/P5's smoke check. Full validation is `validate-extractor` Mode A's job.
- It does not modify parent project handlers. If a fork needs an override surface that the parent doesn't expose, escalate to the user; don't silently extend the parent.
- It does not handle KTX or other tree-sitter-based extractors (Mode K declines).
- It does not introduce schema changes. If a port needs new entity types, escalate -- schema migration is a separate arc.
- It does not auto-decide whether something is a fork or port. Ask the user.

---

## Anchor cases (cumulative library)

These are scenarios the skill should handle smoothly, captured as new forks/ports come in:

- **unezQuake (planned).** Fork of ezQuake. Mode F. Parent = ezquake. Likely divergences: TBD (possibly different default cvar set, possibly added cvars under `unezquake_` prefix). Quality-grid baseline TBD on first onboarding.
- **antilag-mvdsv (planned).** Fork of MVDSV. Mode F. Parent = mvdsv. Likely divergences: antilag-related cvar additions, possibly modified default values. Quality-grid baseline TBD.
- **(Future) unified ezQuake/MVDSV (speculative).** If/when this happens, treat as Mode P (cross-codebase port) -- inherits from neither ezQuake's nor MVDSV's handlers. Document why in the new project's `extract.py`.

---

## When unsure, ask

If the user invokes the skill ambiguously ("set up a new extractor"), ask: which codebase, fork or port, parent (if fork), source location. If the user names a tree-sitter-based codebase (KTX, QuakeC progs, Lua mods), decline politely and route to the future tree-sitter onboarding skill.
