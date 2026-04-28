# Extractor Architecture Consolidation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settle the canonical project shape across all four current QW Oracle Layer 1 extractors (ezQuake, FTE, QWCL, MVDSV), making fork onboarding (unezQuake → ezQuake, antilag-mvdsv → MVDSV) trivial when those land. Eliminate the misleading naming where ezQuake's project-specific handlers live in `extractor_lib/handler_*.py` (suggesting "shared base classes") when they're actually consumed only by ezQuake.

**Source:** Phase 1 architecture inventory ran 2026-04-28. Findings in conversation. The MVDSV Phase 2e follow-up validation pass exposed the question; the inventory answered it: project-private `_handler_*.py` is the canonical shape, used today by FTE/QWCL/MVDSV. ezQuake is the one outlier; consolidating ezQuake into the same shape unifies the architecture and makes the family-base-class lift pattern unambiguous when forks arrive.

**Tech Stack:** Python 3.12, libclang 18, multiprocessing. No schema or DB changes; pure code reorganization.

**Reference precedents:**
- `apps/qw-oracle/scripts/extractors/mvdsv/_handler_*.py` (canonical project-private handler shape, 7 files)
- `apps/qw-oracle/scripts/extractors/qwcl/_handler_*.py` (smaller example, 3 files)
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` (will gain a three-tier-architecture section in Phase 3)

**Spec:** none separately; this plan is the spec.

**Three-tier architecture (the doctrine to land):**

| Tier | Lives in | Examples | Rule |
|---|---|---|---|
| 1. Shared infrastructure | `extractor_lib/_*.py`, `clang_config.py` | `_visitor.py`, `_base.py`, `_resolve.py`, `clang_config.py` | ALWAYS shared. Every project imports. |
| 2. Family-base handlers | `extractor_lib/handler_<family>_<type>.py` | (none today; e.g. `handler_ezquake_family_cvars.py` after unezQuake ships if subclassing pressure warrants it) | Lift on second consumer if subclass coupling is tight. Refactor-on-demand, not pre-design. |
| 3. Project handlers | `<project>/_handler_*.py` | All current handlers post-this-arc | Default home for every project's handlers. Forks subclass directly from parent project's handler initially; lift to Tier 2 only when a second consumer exists and the abstraction is clear. |

---

## Phase A: ezQuake handler relocation

**Files affected:**
- Move (8 files): `apps/qw-oracle/scripts/extractors/extractor_lib/handler_*.py` → `apps/qw-oracle/scripts/extractors/ezquake/_handler_*.py`
- Modify (3 files): `apps/qw-oracle/scripts/extractors/extractor_lib/__init__.py`, `apps/qw-oracle/scripts/extractors/ezquake/extract.py`, `apps/qw-oracle/scripts/extractors/ezquake/tests/test_parameterized_paths.py`
- Delete (one cache): `apps/qw-oracle/scripts/extractors/extractor_lib/__pycache__/` (stale after the move)

### Task 1: Inventory current state and confirm preconditions

- [ ] **Step 1: Confirm no other consumers of `extractor_lib.handler_*`**

```bash
grep -rn "from extractor_lib\.handler_\|extractor_lib\.handler_" apps/qw-oracle/ \
  --include='*.py' | grep -v '__pycache__'
```

Expected: only `ezquake/extract.py` (8 hits, lines 58-65) and `ezquake/tests/test_parameterized_paths.py:28`. If anything else surfaces, halt and update this plan.

- [ ] **Step 2: Confirm the canonical project shape in the other three projects**

```bash
ls apps/qw-oracle/scripts/extractors/{fte,qwcl,mvdsv}/_handler_*.py | sort
```

Expected: 8 files in fte/, 3 in qwcl/, 7 in mvdsv/. Each starts with `_handler_` and lives in the project directory. Confirm.

- [ ] **Step 3: Capture the pre-move JSON output baseline**

```bash
cd /home/paradoks/projects/quakeworld
git -C apps/qw-oracle/scripts/extractors/ezquake/output rev-parse HEAD -- .
ls apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-*-ast.json
```

Note the count of JSON files. After Phase A, re-run extraction and `git diff --stat` MUST be empty for these files.

### Task 2: Relocate the 8 ezQuake handler files

For each file, this is a `git mv` plus a class rename plus a docstring touch-up. Class renames follow the pattern from FTE/QWCL/MVDSV (project name suffix).

| Source | Destination | Class rename |
|---|---|---|
| `extractor_lib/handler_cvars.py` | `ezquake/_handler_cvars.py` | `CvarsHandler` → `CvarsEzquakeHandler` |
| `extractor_lib/handler_commands.py` | `ezquake/_handler_commands.py` | `CommandsHandler` → `CommandsEzquakeHandler` |
| `extractor_lib/handler_macros.py` | `ezquake/_handler_macros.py` | `MacrosHandler` → `MacrosEzquakeHandler` |
| `extractor_lib/handler_cmdline.py` | `ezquake/_handler_cmdline.py` | `CmdlineHandler` → `CmdlineEzquakeHandler` |
| `extractor_lib/handler_hud_elements.py` | `ezquake/_handler_hud_elements.py` | `HudElementsHandler` → `HudElementsEzquakeHandler` |
| `extractor_lib/handler_asset_cvar_bindings.py` | `ezquake/_handler_asset_cvar_bindings.py` | `AssetCvarBindingsHandler` → `AssetCvarBindingsEzquakeHandler` |
| `extractor_lib/handler_asset_loader_sites.py` | `ezquake/_handler_asset_loader_sites.py` | `AssetLoaderSitesHandler` → `AssetLoaderSitesEzquakeHandler` |
| `extractor_lib/handler_keynames.py` | `ezquake/_handler_keynames.py` | `KeynamesHandler` → `KeynamesEzquakeHandler` |

- [ ] **Step 1: Move the files (one git operation per file or one bulk operation)**

```bash
cd /home/paradoks/projects/quakeworld
for type in cvars commands macros cmdline hud_elements asset_cvar_bindings asset_loader_sites keynames; do
  git mv apps/qw-oracle/scripts/extractors/extractor_lib/handler_${type}.py \
         apps/qw-oracle/scripts/extractors/ezquake/_handler_${type}.py
done
git status --short
```

- [ ] **Step 2: Rename the class in each moved file**

For each of the 8 files, the class definition + any internal references to its own name must update. Imports inside the file (e.g., `from ._visitor import Visitor`) need to change because the file is no longer inside `extractor_lib/` -- the relative import `._visitor` becomes `extractor_lib._visitor`:

```python
# OLD (inside extractor_lib/handler_cvars.py):
from ._visitor import Visitor

# NEW (inside ezquake/_handler_cvars.py):
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from extractor_lib._visitor import Visitor  # noqa: E402
```

(Match the sys.path pattern used by `mvdsv/_handler_cvars.py` and `qwcl/_handler_cvars.py` for consistency.)

Also rename the class. For example, in `_handler_cvars.py`:
```python
# OLD:
class CvarsHandler(Visitor):

# NEW:
class CvarsEzquakeHandler(Visitor):
```

Apply the same pattern across all 8 files. If a handler internally references its own class name (e.g., for `self.__class__.__name__` or in a docstring), update those too.

- [ ] **Step 3: Touch up docstrings**

Each moved file's module docstring may reference itself or the shared lib. Update so the docstring reflects "ezQuake's <type> handler" rather than "shared <type> handler." Keep the technical content; just adjust the framing.

- [ ] **Step 4: Update `extractor_lib/__init__.py`**

The package `__init__.py` likely re-exports the moved classes. After the move, those re-exports point at non-existent files. Either delete the re-exports (preferred -- forces consumers to import from the canonical location) or update them to point at `ezquake/_handler_*.py` (NOT preferred -- defeats the purpose of the move).

```bash
cat apps/qw-oracle/scripts/extractors/extractor_lib/__init__.py
```

Edit to remove any `from .handler_* import *Handler` lines. Keep imports of the genuinely-shared modules (`_visitor`, `_base`, `_resolve`, `clang_config`).

### Task 3: Update consumers

- [ ] **Step 1: Update `ezquake/extract.py`**

The 8 import lines (currently 58-65) change from `from extractor_lib.handler_<type> import <Class>Handler` to `from _handler_<type> import <Class>EzquakeHandler`. The bare `_handler_<type>` import (no package prefix) matches how `fte/extract.py:78-83` and `mvdsv/extract.py:79-85` do it -- they rely on `sys.path.insert(0, str(HERE))` early in the file (`HERE` being the project dir).

Confirm `sys.path.insert(0, str(HERE))` is already present in `ezquake/extract.py`; if not, add it (mirrors mvdsv/extract.py:46).

Update the `ALL_HANDLERS` registry block to instantiate the renamed classes. After this edit, `ezquake/extract.py` looks structurally identical to `mvdsv/extract.py` and `qwcl/extract.py`.

- [ ] **Step 2: Update `ezquake/tests/test_parameterized_paths.py`**

Single import line at line 28 changes from `from extractor_lib.handler_asset_loader_sites import AssetLoaderSitesHandler` to `from ezquake._handler_asset_loader_sites import AssetLoaderSitesEzquakeHandler` (or use sys.path insertion if the test file lives in a sub-directory; confirm the existing pattern).

- [ ] **Step 3: Clean up stale bytecode**

```bash
find apps/qw-oracle/scripts/extractors -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null || true
```

Stale `.pyc` files in the old `extractor_lib/__pycache__/` could shadow the moved code on subsequent runs.

### Task 4: Verification

- [ ] **Step 1: Re-run ezquake extraction**

```bash
python3 apps/qw-oracle/scripts/extractors/ezquake/extract.py --workers 12
```

Expected: completes successfully. Wall time similar to baseline (~14s for HEAD).

- [ ] **Step 2: Verify zero JSON diff**

```bash
git -C apps/qw-oracle/scripts/extractors/ezquake/output diff --stat HEAD
```

Expected: empty output. The relocation is byte-reproducible.

- [ ] **Step 3: Re-run loader and confirm count parity**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 -header "$DB" "SELECT type, COUNT(*) FROM entities WHERE project='ezquake' AND source_state='source_backed' GROUP BY type ORDER BY type;"
```

Compare against pre-move counts; must be identical.

- [ ] **Step 4: Run full quality grid**

```bash
for proj in mvdsv ezquake fte qwcl; do
  echo "=== $proj ==="
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family both
done
```

Expected: same as before this arc -- mvdsv/fte/qwcl all clean, ezquake has the 2 pre-existing F2 informational anomalies, no new failures.

- [ ] **Step 5: tsc + Python smoke**

```bash
bunx tsc --noEmit --project apps/qw-oracle  # clean
python3 -c "
import sys
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors')
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/ezquake')
import _handler_cvars, _handler_commands, _handler_macros, _handler_cmdline
import _handler_hud_elements, _handler_asset_cvar_bindings, _handler_asset_loader_sites, _handler_keynames
print('all imports OK')
"
```

- [ ] **Step 6: Run ezquake tests**

```bash
cd apps/qw-oracle/scripts/extractors/ezquake/tests && python3 -m pytest -x 2>&1 | tail -20
```

(Or whichever test runner is in use.) Expected: all green.

### Task 5: Commit Phase A

- [ ] Single commit:

```
refactor(qw-oracle): relocate ezquake handlers from extractor_lib/ to ezquake/_handler_*.py

Eight handler files moved into project-private location, matching the
canonical shape used by fte/qwcl/mvdsv. Class renames append project
suffix (CvarsHandler -> CvarsEzquakeHandler etc.). extractor_lib now
contains only genuinely-shared infrastructure (_visitor, _base, _resolve,
clang_config). No JSON diff; no DB diff; tests pass.
```

Push.

---

## Phase B: Subclassing-readiness audit (ezQuake + MVDSV)

ezQuake → unezQuake and MVDSV → antilag-mvdsv are the two known fork relationships. Read the leader projects' handlers with one specific question: **what does a fork need to override, and is the current shape friendly to that?**

Don't refactor everything. Just flag obvious "this is going to be hostile to subclassing" spots and either (a) fix them now if trivial, (b) annotate them with a `# Fork override hook:` comment that documents intent.

### Task 6: Audit ezQuake handlers for fork-extension points

Files: `apps/qw-oracle/scripts/extractors/ezquake/_handler_*.py` (8 files post-Phase A).

For each handler, look at:

- **Registration API names hardcoded in regex/string constants.** A fork might use a slightly different API name (e.g., a custom `Cvar_RegisterEx`). If the API name is in a class-level constant, easy to override. If buried in the middle of a regex, hostile.
  - **Action:** if buried, hoist to a class-level `REGISTRATION_APIS = ('Cvar_Register', 'Cvar_Get')` tuple that subclasses can extend.

- **Per-engine quirks that aren't override hooks.** E.g., ezquake's cvars handler may have a pattern like `if name.startswith('cl_'): ...` -- if a fork removes/adds prefixes, the pattern needs to be a method.
  - **Action:** convert hardcoded conditions to a `_is_fork_specific_pattern(self, name)` method (or similar) the subclass can override.

- **`finalize` and `end_file` doing too much in one method.** Forks often want to add a step or change one detail. Long monolithic finalize methods are hostile to subclasses.
  - **Action:** if `finalize` is >50 lines or has clear sequential phases, split into protected helper methods (`_phase_dedup`, `_phase_normalize`, `_phase_emit`).

- **Comments naming the fork relationship.** Add to every method that's plausibly an override target: `# Fork override hook: <reason>` so unezQuake's author sees the intent.

- [ ] **Step 1: Read each ezQuake handler. List override hooks needed.**

For each of the 8 handlers, write down (in a temp file or scratch comment) what a fork would plausibly need to override. Categorize: (a) trivial hoist to constant, (b) method extraction, (c) annotate with comment, (d) leave as-is.

- [ ] **Step 2: Apply (a) and (b) edits.** Trivial constant hoists and method extractions. Don't change semantics; just expose override surface.

- [ ] **Step 3: Apply (c) annotations.** One-line `# Fork override hook:` comments on candidate methods.

- [ ] **Step 4: Re-run extraction + verify zero JSON diff.** Hoists/extractions must not change output.

```bash
python3 apps/qw-oracle/scripts/extractors/ezquake/extract.py --workers 12
git -C apps/qw-oracle/scripts/extractors/ezquake/output diff --stat HEAD  # must be empty
```

### Task 7: Audit MVDSV handlers for fork-extension points

Same procedure as Task 6, applied to `apps/qw-oracle/scripts/extractors/mvdsv/_handler_*.py` (7 files). Anchor: the MVDSV-specific entity types (info_keys, log_templates, protocol, qc_builtins) likely have heavier project-coupling that antilag-mvdsv will need to override. Pay extra attention there.

- [ ] **Step 1: Read each MVDSV handler. List override hooks needed.**
- [ ] **Step 2: Apply trivial hoists + method extractions.**
- [ ] **Step 3: Apply annotations.**
- [ ] **Step 4: Re-run extraction + verify zero JSON diff.**

```bash
python3 apps/qw-oracle/scripts/extractors/mvdsv/extract.py --workers 12
git -C apps/qw-oracle/scripts/extractors/mvdsv/output diff --stat HEAD
```

### Task 8: Verification

- [ ] **Step 1: Quality grid all four projects, all clean** (per Task 4 Step 4).
- [ ] **Step 2: Re-load if any handler outputs changed (they shouldn't have).**

### Task 9: Commit Phase B

- [ ] Single commit:

```
refactor(qw-oracle): expose fork-override hooks in ezquake + mvdsv handlers

Flag plausible override surfaces with `# Fork override hook:` comments,
hoist hardcoded API names/patterns to class-level constants, split long
monolithic finalize methods into protected helper phases. No semantic
changes; JSON output byte-identical. Prepares ezquake for unezQuake fork
and mvdsv for antilag-mvdsv fork landing later.
```

Push.

(QWCL and FTE are not audited in this phase. QWCL has no known fork; FTE has fteqw vs ezquake-fte historical splits but they're not actively forking. If a fork relationship surfaces for either, audit at that point with the same procedure.)

---

## Phase C: Documentation

The architecture decision must be reflected in the playbook so the next person (human or LLM) sees the canonical shape immediately.

**Files affected:**
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` (cross-link addition)
- `apps/qw-oracle/CLAUDE.md` (mention the consolidated shape)
- `apps/qw-oracle/scripts/extractors/extractor_lib/README.md` (create if missing -- documents what lives there post-consolidation)

### Task 10: Add three-tier architecture section to EXTRACTOR-PLAYBOOK.md

- [ ] **Step 1: Add a new section near the top** (after "Architecture in two diagrams", before "Registration pattern catalog"). Title: `## Three-tier handler architecture`. Contents:
  - The three-tier table from the plan header.
  - Rule of second-consumer: don't lift to Tier 2 until the second project actually exists; speculative family-base classes get the abstraction wrong.
  - Fork import pattern: `from <parent>._handler_<type> import <Class><Parent>Handler`. Subclass directly. Lift to Tier 2 only on subclassing pressure.
  - Cross-codebase port pattern (different from fork): start fresh in `<project>/_handler_*.py`, no inheritance, just `Visitor`.
  - Concrete examples: ezQuake → (future) unezQuake; MVDSV → (future) antilag-mvdsv.

### Task 11: Add fork-onboarding subsection to "Porting to a new engine"

- [ ] **Step 1: Edit the existing "Porting to a new engine" section** (currently around line 563+). Add a sibling subsection: `### 0a. Is this a fork or a cross-codebase port?` that branches the porting process accordingly:
  - Fork (e.g., unezQuake from ezQuake): start with import-from-parent + subclass. Inventory the deltas. Override only what differs. Lift to Tier 2 if subclass overrides exceed ~30% of methods.
  - Cross-codebase port (e.g., FTE was a fresh port): start fresh in `<project>/_handler_*.py`. Inherit from `Visitor` only.

### Task 12: Update extractor_lib/README.md (create if missing)

- [ ] **Step 1: Check whether the file exists.**

```bash
ls apps/qw-oracle/scripts/extractors/extractor_lib/README.md 2>/dev/null
```

- [ ] **Step 2: Write or update.** Contents: a short description of what lives in extractor_lib (Tier 1 infrastructure: visitor, walker, base protocol, clang config, resolver). Explicit statement that this directory does NOT contain project-specific handlers; those live in `<project>/_handler_*.py`. Pointer to EXTRACTOR-PLAYBOOK.md for the full architecture explanation.

### Task 13: Cross-link from VALIDATION-RUNBOOK.md

- [ ] **Step 1: In the runbook's Section 4.4 (cross-project sibling-handler audit)**, add a paragraph noting that all four projects (post-this-arc) follow the same `<project>/_handler_*.py` shape, and divergences are now apples-to-apples comparisons. Link to EXTRACTOR-PLAYBOOK's three-tier section.

### Task 14: Update apps/qw-oracle/CLAUDE.md

- [ ] **Step 1: One-paragraph addition to the status section** noting "Architecture consolidation 2026-04-28: ezquake handlers relocated to project-private `_handler_*.py`; extractor_lib now contains only Tier-1 infrastructure. Three-tier handler architecture documented in EXTRACTOR-PLAYBOOK.md. Sets up unezQuake (ezquake fork) and antilag-mvdsv (mvdsv fork) for clean fork-onboarding when those land."

### Task 15: Commit Phase C

- [ ] Single commit:

```
docs(qw-oracle): three-tier extractor architecture

EXTRACTOR-PLAYBOOK adds the three-tier model (shared infrastructure /
family-base / project-private) plus rule-of-second-consumer and
fork-vs-port branch. extractor_lib/README documents the tier-1 scope.
VALIDATION-RUNBOOK cross-links. CLAUDE.md notes the consolidation.
```

Push.

---

## Verification (end-to-end after all three phases)

```bash
# 1. All extractors reproduce bytewise
for proj in ezquake fte qwcl mvdsv; do
  python3 apps/qw-oracle/scripts/extractors/$proj/extract.py --workers 12
  git -C apps/qw-oracle/scripts/extractors/$proj/output diff --stat HEAD
done
# All four diffs must be empty.

# 2. Full quality grid
for proj in mvdsv ezquake fte qwcl; do
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family both
done
# All clean except the 2 pre-existing ezquake F2 informational anomalies.

# 3. TypeScript clean
cd apps/qw-oracle && bunx tsc --noEmit

# 4. Python imports
for proj in ezquake fte qwcl mvdsv; do
  echo "=== $proj ==="
  python3 -c "
import sys
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors')
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/$proj')
import os
for f in os.listdir('apps/qw-oracle/scripts/extractors/$proj'):
    if f.startswith('_handler_') and f.endswith('.py'):
        __import__(f[:-3])
print('all imports OK')
"
done

# 5. extractor_lib contains only Tier-1 modules
ls apps/qw-oracle/scripts/extractors/extractor_lib/*.py
# Expected: __init__.py, _base.py, _resolve.py, _visitor.py, clang_config.py.
# No handler_*.py files.

# 6. Each project has _handler_*.py files
for proj in ezquake fte qwcl mvdsv; do
  echo "=== $proj ==="
  ls apps/qw-oracle/scripts/extractors/$proj/_handler_*.py 2>/dev/null | wc -l
done
# Expected: ezquake=8, fte=8, qwcl=3, mvdsv=7.
```

## Documentation updates checklist

- [ ] `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` -- three-tier section + fork-vs-port branch in porting checklist.
- [ ] `apps/qw-oracle/scripts/extractors/extractor_lib/README.md` -- tier-1 scope.
- [ ] `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` -- cross-link to three-tier section.
- [ ] `apps/qw-oracle/CLAUDE.md` -- consolidation paragraph.
- [ ] `MEMORY.md` entry update (`project_qw_oracle_vision.md` or new memory): note the architecture consolidation and fork-readiness.

## What comes after this arc

1. **Onboarding skill draft.** With the canonical shape settled, write the `onboard-extractor` skill that walks new-codebase setup. Covers fork case (unezQuake, antilag-mvdsv) and cross-codebase port case (KTX-after-treesitter, future engines).
2. **Cross-project audit Phase 2.** Run the full audit per `docs/superpowers/specs/2026-04-28-cross-extractor-pattern-audit.md` against the consolidated baseline. With D.5 answered, the audit's findings are sharper.
3. **Per-project deep validations.** ezQuake, FTE, QWCL each get a Mode B validation pass (Mode B in the validate-extractor skill) once cross-cutting issues from #2 are drained.

## Out of scope

- Handler refactoring beyond override-hook surface exposure. Don't change registration logic, finalize semantics, or output shape.
- Lifting any handler logic to Tier 2 (family base classes). No second consumer exists yet for any project. Phase B preps for it; doesn't do it.
- KTX. Tree-sitter, separate methodology, separate runbook.
- Any change to schema, DB, or load-knowledge TypeScript. This arc is pure Python reorganization.
