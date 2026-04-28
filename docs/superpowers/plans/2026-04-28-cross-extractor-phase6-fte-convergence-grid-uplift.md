# Cross-Extractor Phase 6 Implementation Plan: FTE Convergence + Grid Uplift

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drain S-01 + S-03 from the three Mode B validations (2026-04-28) by hardening three layers (handler, verification, grid) against the same structural failure: post-lift incomplete adoption silently emitting wrong-shape data.

**Architecture:** Verification-first phasing. Phase 1 lands the runbook positive contract that gates everything else, captures baseline violations. Phase 2 (3 commits) drains the handler-layer findings: ezhud `flags_raw: None` bypass (1085 actual rows recovered) + lift `concat_string_literals` + `concat_string_literals_compact` to `extractor_lib/_source.py` and delete 5 FTE private copies + QWCL `, ` -> ` | ` canonical separator. Phase 3 (2 commits) builds the quality-grid universal floor (entity_type x {count, source_state}) + 4 per-project anchors. Six commits in one PR-equivalent chunk.

**Tech Stack:** Python 3.12 + libclang 18 (extractors, handlers); TypeScript + Bun/Node (loader, quality-grid via `tsx --test`); SQLite v18 schema (no schema migration in this arc); pytest-style self-running Python tests; node:test for TS.

**Spec:** `docs/superpowers/specs/2026-04-28-cross-extractor-phase6-fte-convergence-grid-uplift-design.md` (commit `7c5a05b`).

**Prerequisites:**
- Working directory: `/home/paradoks/projects/quakeworld`.
- Branch: `main`.
- Apps/qw-oracle tree clean. (Slipgate-app uncommitted changes are a parallel arc; do not touch.)
- DB at `apps/qw-oracle/data/knowledge.db` loaded with: ezquake @ head + 14 tags, fte @ build-6698, qwcl @ 2.33, mvdsv @ head.
- Schema at v18 (verify: `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT value FROM schema_meta WHERE key='schema_version';"` returns `18`).

---

## File Structure

**Created:**
- `apps/qw-oracle/scripts/extractors/extractor_lib/tests/__init__.py` (empty file, marks tests as a package)
- `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_source_concat.py` (unit tests for the two new helpers + internal `_strip_and_concat`)
- `apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts` (unit tests for the floor probe factory function)

**Modified:**
- `apps/qw-oracle/scripts/extractors/extractor_lib/_source.py` -- adds `_strip_and_concat`, `concat_string_literals`, `concat_string_literals_compact` (+1 import line for `unescape_c_string`)
- `apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py` -- delete private `_concat_string_literals` (line 100), import lifted, replace 8 call sites
- `apps/qw-oracle/scripts/extractors/fte/_handler_commands.py` -- delete private `_concat_string_literals` (line 50), import lifted, replace 3 call sites
- `apps/qw-oracle/scripts/extractors/fte/_handler_macros.py` -- delete private `_concat_string_literals` (line 70), import lifted, replace 1 call site
- `apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py` -- delete private `_concat_string_literals` (line 76), import both lifted variants, replace 6 call sites with audit-table-driven canonical/compact split, fix line 200 `flags_raw: None`
- `apps/qw-oracle/scripts/extractors/fte/_handler_ezscript.py` -- delete private `_concat_string_literals` (line 41), import lifted canonical, replace 2 call sites
- `apps/qw-oracle/scripts/extractors/qwcl/_handler_cvars.py:113` -- `", "` -> `" | "` join separator
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` -- split Section 3.2 into 3.2.1 + 3.2.2 + candidate-positive-contracts list
- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` -- adds `makeFloorCountProbe` + `makeFloorSourceStateProbe` factory functions, ~54-58 floor probes, 4 anchor probes, per-project comment block with seed values
- `HANDOVER.md` -- adds 3 entries (deep-time-walk re-extract obligation, broader positive-contract pointer, restate D.1.8)

**Re-generated (commit alongside their handler change):**
- `apps/qw-oracle/scripts/extractors/fte/output/fte-variables-ast.json` (W1: 1085 `flags_raw: null` -> `""`; W2: zero diff vs W1)
- `apps/qw-oracle/scripts/extractors/qwcl/output/qwcl-variables-ast.json` (W3: `, ` -> ` | ` in flags_raw fields)

---

## Task 0: Pre-flight verification

**Goal:** Confirm baseline state matches spec assumptions before any work starts.

- [ ] **Step 0.1: Confirm working directory + branch + tree state**

```bash
cd /home/paradoks/projects/quakeworld
pwd                              # /home/paradoks/projects/quakeworld
git branch --show-current        # main
git rev-parse HEAD               # should be 7c5a05b or descendant
git status --short | grep -v '^.M apps/slipgate-app\|^.M docs/superpowers/.*managed-mode\|^?? apps/qw-oracle/data/'
```

Expected last command: empty output (apps/qw-oracle/ tree clean except `data/` which is gitignored; slipgate-app uncommitted changes are the parallel arc).

- [ ] **Step 0.2: Confirm DB state matches spec**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT value FROM schema_meta WHERE key='schema_version';"
sqlite3 "$DB" "SELECT project, COUNT(*) FROM versions GROUP BY project ORDER BY project;"
sqlite3 "$DB" "SELECT COUNT(*) FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='fte' AND cv.flags_raw IS NULL AND e.source_state='source_backed';"
```

Expected:
- Schema: `18`
- Versions: `ezquake|15`, `fte|1`, `mvdsv|1`, `qwcl|1` (counts may vary slightly; ezquake is 14 tags + head)
- FTE NULL flags_raw: `1085`

If schema_version != 18 OR FTE NULL count != 1085, STOP and report the divergence -- the spec assumptions don't hold.

---

## Phase 1: Verification layer (Commit 1)

### Task 1: Split runbook Section 3.2 into 3.2.1 + 3.2.2

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` (Section 3.2, currently lines 161-173)

- [ ] **Step 1.1: Read current Section 3.2**

```bash
sed -n '161,180p' apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
```

This captures the existing 3.2 block for reference.

- [ ] **Step 1.2: Replace the existing Section 3.2 block**

Use the Edit tool to replace the entire current Section 3.2 (from `### 3.2 Cross-project field-shape audit` through to but not including `## Section 4: Code review`) with:

```markdown
### 3.2 Cross-project field-shape audit

When validating multiple projects, check that the same field type is stored the same way across projects. Two checks run as a pair: a regression bar (3.2.1) catches the immediate failure shapes; a positive contract (3.2.2) gates on the canonical post-v17 form.

#### 3.2.1 Regression bar (negative shape check)

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
for proj in mvdsv ezquake fte qwcl; do
  echo "=== $proj ==="
  sqlite3 "$DB" "SELECT flags_raw, COUNT(*) FROM cvar_versions cv
                 JOIN entities e ON cv.entity_id=e.id
                 WHERE e.project='$proj'
                   AND e.source_state='source_backed'
                   AND (flags_raw IN ('0', 'CVAR_NONE') OR flags_raw IS NULL)
                 GROUP BY flags_raw;"
done
```

**Acceptance:** zero rows in all four projects. Catches the post-v17 sentinel-form contract violations PLUS the IS-NULL shape that escaped the original check (the failure mode that surfaced 1085 FTE source_backed rows in the 2026-04-28 Mode B FTE validation).

#### 3.2.2 Positive contract (positive shape check)

For `source_state = 'source_backed'` cvars in `project IN ('ezquake', 'fte', 'mvdsv')`: `flags_raw` MUST be non-NULL AND either `''` (empty, the post-v17 sentinel) OR match `^[A-Z0-9_]+( \| [A-Z0-9_]+)*$` (CVAR_* identifiers joined by ` | `).

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT
                 e.project,
                 cv.source_root,
                 COUNT(*) AS violation_count,
                 GROUP_CONCAT(DISTINCT cv.flags_raw) AS sample_shapes
               FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project IN ('ezquake', 'fte', 'mvdsv')
                 AND e.source_state='source_backed'
                 AND NOT (
                   cv.flags_raw IS NOT NULL
                   AND (
                     cv.flags_raw = ''
                     OR cv.flags_raw GLOB '[A-Z0-9_]*'
                   )
                 )
               GROUP BY e.project, cv.source_root
               ORDER BY violation_count DESC;"
```

(GLOB is used as a regex-lite filter; the executing shell may also pipe to `grep -E '^[A-Z0-9_]+( \| [A-Z0-9_]+)*$'` for a stricter match. Per-project + per-source-root breakdown columns make findings actionable: "FTE has 1085 violations in plugin:ezhud" vs "ezQuake has 0 violations" tells the operator exactly where to look.)

**QWCL carve-out rationale.** QWCL's 1996-vintage `cvar_t` emits lowercase boolean field values (`"true"`, `"false"`, `"true | false"` post-Phase-6 W3 normalization). The 3.2.2 contract's domain is post-v17 CVAR_* bitmask normalization; QWCL's flag-field semantic isn't in that domain. Carve-out is cleaner than widening the regex (admits typos like `cvar_archive` lowercase) or renormalizing QWCL (invasive, breaks source-truth representation). "QWCL `flags_raw` shape positive contract" is captured as future-arc work in the candidate-positive-contracts list below.

**Acceptance:** zero rows. Any non-empty output is a finding -- either a handler is bypassing the lifted normalizer (the failure mode this contract is designed to catch) or a new flag-name shape needs to be admitted to the regex.

#### Candidate positive contracts (future-arc work)

The 3.2.2 contract gates only on `flags_raw`. Other fields with similar lift/contract gaps that may need positive contracts in future arcs:

- `default_value` C-escape interpretation across all four projects (post-v17 unescape contract; today gated only by hand-spot-check during Mode B).
- `info_key` canonical name shape (`<bare>:<scope>` post-v17 reshape; today gated by `validInfoKey` carve-out in load-version.ts).
- `qc_builtin` canonical name shape (`<bare>:<table>` post-v18 reshape).
- `handler_fn` shape across cvars + commands + macros (today carries no positive contract).
- Description fields (cvars, commands, macros, hud_elements; today carry no shape gate).
- QWCL `flags_raw` shape (lowercase boolean field values) -- distinct from the post-v17 CVAR_* contract.

```

- [ ] **Step 1.3: Verify the runbook still reads cleanly**

```bash
head -200 apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md | tail -80
```

Spot-check the new 3.2.1 / 3.2.2 sections render correctly.

### Task 2: Run the new contract against current DB and capture baseline

**Files:**
- No file changes; this captures baseline data for the commit body.

- [ ] **Step 2.1: Run 3.2.1 regression bar**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
for proj in mvdsv ezquake fte qwcl; do
  echo "=== $proj ==="
  sqlite3 "$DB" "SELECT flags_raw, COUNT(*) FROM cvar_versions cv
                 JOIN entities e ON cv.entity_id=e.id
                 WHERE e.project='$proj'
                   AND e.source_state='source_backed'
                   AND (flags_raw IN ('0', 'CVAR_NONE') OR flags_raw IS NULL)
                 GROUP BY flags_raw;" 2>&1
done
```

**Capture this output** for the commit message. Expected: only FTE returns rows (`|1085` for the IS NULL bucket).

- [ ] **Step 2.2: Run 3.2.2 positive contract**

```bash
sqlite3 "$DB" "SELECT
                 e.project,
                 cv.source_root,
                 COUNT(*) AS violation_count,
                 SUBSTR(GROUP_CONCAT(DISTINCT cv.flags_raw), 1, 80) AS sample_shapes
               FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project IN ('ezquake', 'fte', 'mvdsv')
                 AND e.source_state='source_backed'
                 AND NOT (
                   cv.flags_raw IS NOT NULL
                   AND (
                     cv.flags_raw = ''
                     OR cv.flags_raw GLOB '[A-Z0-9_]*'
                   )
                 )
               GROUP BY e.project, cv.source_root
               ORDER BY violation_count DESC;"
```

**Capture this output** for the commit message. Expected: FTE plugin:ezhud row with violation_count >= 1085 (depending on how the GLOB pattern matches; pipe through `awk` if needed to filter).

- [ ] **Step 2.3: Measure QWCL `, `-separator count (Phase 1's "N")**

```bash
sqlite3 "$DB" "SELECT COUNT(*) FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project='qwcl'
                 AND e.source_state='source_backed'
                 AND cv.flags_raw LIKE '%, %';"
```

**Capture this number as N.** This is the count of QWCL rows that W3 will normalize from `, ` to ` | `.

### Task 3: Confirm QWCL widen-or-normalize decision

- [ ] **Step 3.1: Operator decision (or unattended-path default)**

The spec's unattended-path default is **normalize** (W3 as written, QWCL emits ` | `). Reasoning: convergence theme of the arc; fewer special-cases in the runbook contract; no QWCL deep-time history.

If executing autonomously, proceed with default (W3 normalizes). Document the choice in the commit body: "Decision: normalize (default; N=<value> rows affected). Operator override available at PR review."

If operator is reachable: present N from Step 2.3 and confirm normalize vs widen-regex. Default = normalize.

### Task 4: Commit Phase 1

- [ ] **Step 4.1: Stage and commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
git commit -m "$(cat <<'EOF'
docs(qw-oracle): runbook 3.2 split into regression bar + positive contract

Phase 1 of cross-extractor Phase 6 arc. Splits Section 3.2 into:
- 3.2.1 regression bar -- existing query gains OR flags_raw IS NULL,
  catches the IS-NULL shape that escaped the original check (the
  failure mode that surfaced 1085 FTE source_backed rows in Mode B).
- 3.2.2 positive contract -- gates on source_state='source_backed' AND
  project IN ('ezquake','fte','mvdsv'). flags_raw must be non-NULL AND
  either '' OR match /^[A-Z0-9_]+( \| [A-Z0-9_]+)*$/.

QWCL carved out (1996 cvar_t lowercase boolean values are outside the
post-v17 CVAR_* domain). QWCL flags_raw shape added to candidate-positive-
contracts list as future-arc work.

Baseline violations (pre Phase 2):
- 3.2.1: FTE plugin:ezhud = 1085 IS NULL rows; all other projects clean.
- 3.2.2: <paste output from Task 2.2>
- QWCL ', '-separated rows: N=<paste from Task 2.3>

QWCL decision: normalize (default; W3 will rewrite N rows from ', ' to ' | ').

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Replace `<paste output from Task 2.2>` and `<paste from Task 2.3>` with actual captured values before running the commit command.

- [ ] **Step 4.2: Verify commit landed**

```bash
git log --oneline -1
```

Expected: most recent commit is `docs(qw-oracle): runbook 3.2 split ...`.

---

## Phase 2: Handler convergence

### Task 5 (W1): ezhud handler fix -- recover 1085 rows

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py:200`

- [ ] **Step 5.1: Add `normalize_flags_raw` import to ezhud handler**

Read `apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py` lines 1-35 to confirm import block.

Use Edit tool to add the import. After the existing `from extractor_lib._visitor import Visitor  # noqa: E402` (around line 30), add:

```python
from extractor_lib._cvar_shared import normalize_flags_raw  # noqa: E402
```

- [ ] **Step 5.2: Patch line 200**

Use Edit tool. Change:

```python
                "flags_raw": None,
```

to:

```python
                "flags_raw": normalize_flags_raw(None),
```

(Inside `EzhudFteHandler.finalize`'s `ast_block` dict construction. The exact line number may shift after the import edit; grep to confirm: `grep -n '"flags_raw":' apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py` should show one line.)

- [ ] **Step 5.3: Re-extract FTE**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/fte/extract.py --workers 12
```

Expected: clean run, ~47s wall time. The merged JSON output (`fte/output/fte-variables-ast.json`) now has `flags_raw: ""` for the 1085 ezhud rows that were previously `null`.

- [ ] **Step 5.4: Sanity-check the JSON change**

```bash
grep -c '"flags_raw": null' apps/qw-oracle/scripts/extractors/fte/output/fte-variables-ast.json
grep -c '"flags_raw": ""' apps/qw-oracle/scripts/extractors/fte/output/fte-variables-ast.json
```

Expected: `null` count drops to 0; `""` count rises by ~1085.

- [ ] **Step 5.5: Re-load FTE into the DB**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project fte --version build-6698
```

Expected: clean run; counts match prior baseline (2482 cvars, 556 commands, 67 macros, 108 cmdline_params).

- [ ] **Step 5.6: Verify W1 contract gate**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT COUNT(*) FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project='fte' AND cv.flags_raw IS NULL AND e.source_state='source_backed';"
```

Expected: `0`. (Was 1085 pre-fix.)

- [ ] **Step 5.7: Re-run 3.2.2 positive contract**

```bash
sqlite3 "$DB" "SELECT
                 e.project,
                 cv.source_root,
                 COUNT(*) AS violation_count
               FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project IN ('ezquake', 'fte', 'mvdsv')
                 AND e.source_state='source_backed'
                 AND NOT (
                   cv.flags_raw IS NOT NULL
                   AND (
                     cv.flags_raw = ''
                     OR cv.flags_raw GLOB '[A-Z0-9_]*'
                   )
                 )
               GROUP BY e.project, cv.source_root;"
```

Expected: empty (no rows) -- FTE plugin:ezhud violations dropped from 1085 to 0; ezquake + mvdsv unchanged at 0.

- [ ] **Step 5.8: Commit W1**

```bash
git add apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py apps/qw-oracle/scripts/extractors/fte/output/
git commit -m "$(cat <<'EOF'
fix(qw-oracle): ezhud handler routes flags_raw through normalize_flags_raw (1085 rows recovered)

W1 of cross-extractor Phase 6 arc. EzhudFteHandler.finalize hardcoded
"flags_raw": None on the synthesized ast_block at line 200; the post-v17
contract is empty-string sentinel ("" ) for absent/0/CVAR_NONE. Re-routes
through normalize_flags_raw(None) which yields "".

1085 source_backed FTE cvars (1080 from plugins/ezhud/hud_common.c,
4 from hud_editor.c, 1 from ezquakeisms.c) silently shipped flags_raw IS
NULL. The runbook's pre-Phase-6 3.2 check missed this because the
failure shape was IS NULL not IN ('0', 'CVAR_NONE') -- the gap that
Phase 1's 3.2.1 + 3.2.2 close.

Verification:
- Pre-W1: SELECT COUNT(*) ... WHERE flags_raw IS NULL = 1085
- Post-W1: SELECT COUNT(*) ... WHERE flags_raw IS NULL = 0
- 3.2.2 positive contract: zero violations across ezquake/fte/mvdsv.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 6 (W2): Lift `concat_string_literals` + delete 5 private copies

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/extractor_lib/tests/__init__.py`
- Create: `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_source_concat.py`
- Modify: `apps/qw-oracle/scripts/extractors/extractor_lib/_source.py` (add 3 new functions)
- Modify: 5 FTE handler files (delete private copies, import + adopt lifted helpers)

#### Subtask 6A: TDD the lifted helpers

- [ ] **Step 6A.1: Create the tests directory marker**

```bash
mkdir -p apps/qw-oracle/scripts/extractors/extractor_lib/tests
touch apps/qw-oracle/scripts/extractors/extractor_lib/tests/__init__.py
```

- [ ] **Step 6A.2: Write failing tests for `concat_string_literals` + `concat_string_literals_compact` + `_strip_and_concat`**

Create `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_source_concat.py`:

```python
#!/usr/bin/env python3
"""Tests for concat_string_literals + concat_string_literals_compact + _strip_and_concat.

Run directly: python3 apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_source_concat.py
Exit 0 = all pass. Exit 1 = first failure printed.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
EXTRACTORS_DIR = HERE.parent.parent  # apps/qw-oracle/scripts/extractors/
sys.path.insert(0, str(EXTRACTORS_DIR))

from extractor_lib._source import (  # noqa: E402
    _strip_and_concat,
    concat_string_literals,
    concat_string_literals_compact,
)


FAILURES: list[str] = []


def assert_eq(actual, expected, label: str) -> None:
    if actual != expected:
        FAILURES.append(f"FAIL {label}: expected {expected!r}, got {actual!r}")


def test_strip_and_concat_basic_pair():
    parts, all_literal = _strip_and_concat(['"foo"', '"bar"'])
    assert_eq(parts, ['foo', 'bar'], 'strip_and_concat basic pair: parts')
    assert_eq(all_literal, True, 'strip_and_concat basic pair: all_literal')


def test_strip_and_concat_null_terminator_returns_none():
    parts, all_literal = _strip_and_concat(['"foo"', 'NULL'])
    assert_eq(parts, None, 'strip_and_concat NULL terminator: parts None')
    assert_eq(all_literal, False, 'strip_and_concat NULL terminator: all_literal False')


def test_strip_and_concat_empty_input():
    parts, all_literal = _strip_and_concat([])
    assert_eq(parts, None, 'strip_and_concat empty: parts None')
    # all_literal True is acceptable for an empty list (no non-literal seen)
    # We don't assert on all_literal for empty input.


def test_strip_and_concat_non_literal_token():
    parts, all_literal = _strip_and_concat(['"foo"', 'identifier_token'])
    # parts collects the literal but all_literal = False
    assert_eq(parts, ['foo'], 'strip_and_concat non-literal: parts')
    assert_eq(all_literal, False, 'strip_and_concat non-literal: all_literal False')


def test_concat_string_literals_basic():
    assert_eq(concat_string_literals(['"hello"']), 'hello', 'canonical basic')
    assert_eq(concat_string_literals(['"foo"', '"bar"']), 'foobar', 'canonical pair concat')


def test_concat_string_literals_unescapes():
    # Canonical applies unescape_c_string: \n -> newline, \" -> ", \\ -> \, etc.
    assert_eq(
        concat_string_literals([r'"line1\nline2"']),
        'line1\nline2',
        'canonical \\n -> newline'
    )
    assert_eq(
        concat_string_literals([r'"a\"b"']),
        'a"b',
        'canonical \\" -> "'
    )
    assert_eq(
        concat_string_literals([r'"path\\to\\file"']),
        'path\\to\\file',
        'canonical \\\\ -> \\'
    )


def test_concat_string_literals_null_returns_none():
    assert_eq(concat_string_literals(['NULL']), None, 'canonical NULL -> None')
    assert_eq(concat_string_literals([]), None, 'canonical empty -> None')


def test_concat_string_literals_compact_basic():
    assert_eq(concat_string_literals_compact(['"hello"']), 'hello', 'compact basic')


def test_concat_string_literals_compact_collapses_newlines():
    # Compact: \n -> space, \t -> space, \" -> "
    assert_eq(
        concat_string_literals_compact([r'"line1\nline2"']),
        'line1 line2',
        'compact \\n -> space'
    )
    assert_eq(
        concat_string_literals_compact([r'"col1\tcol2"']),
        'col1 col2',
        'compact \\t -> space'
    )
    assert_eq(
        concat_string_literals_compact([r'"a\"b"']),
        'a"b',
        'compact \\" -> "'
    )


def test_concat_string_literals_compact_preserves_other_escapes():
    # Compact policy is description-focused; \n and \t collapse, but \\ should
    # still pass through verbatim (no canonical-style \\ -> \ transformation
    # because compact intentionally does NOT call unescape_c_string).
    # The expected behavior here documents the compact contract.
    assert_eq(
        concat_string_literals_compact([r'"path\\file"']),
        r'path\\file',
        'compact preserves \\\\ verbatim'
    )


def test_concat_string_literals_compact_null_returns_none():
    assert_eq(concat_string_literals_compact(['NULL']), None, 'compact NULL -> None')


def main() -> int:
    test_strip_and_concat_basic_pair()
    test_strip_and_concat_null_terminator_returns_none()
    test_strip_and_concat_empty_input()
    test_strip_and_concat_non_literal_token()
    test_concat_string_literals_basic()
    test_concat_string_literals_unescapes()
    test_concat_string_literals_null_returns_none()
    test_concat_string_literals_compact_basic()
    test_concat_string_literals_compact_collapses_newlines()
    test_concat_string_literals_compact_preserves_other_escapes()
    test_concat_string_literals_compact_null_returns_none()

    if FAILURES:
        for f in FAILURES:
            print(f)
        print(f"\n{len(FAILURES)} failure(s)")
        return 1
    print("All tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 6A.3: Run tests, confirm they fail**

```bash
python3 apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_source_concat.py
```

Expected: import error (`ImportError: cannot import name '_strip_and_concat'`) or similar -- the new helpers don't exist yet.

- [ ] **Step 6A.4: Add the three helpers to `_source.py`**

Read `apps/qw-oracle/scripts/extractors/extractor_lib/_source.py` to confirm current structure. Then use Edit tool to append (after the existing `literal_string` function):

```python


# ---------------------------------------------------------------------------
# String-literal concatenation (post-v17 contract)
# ---------------------------------------------------------------------------

def _strip_and_concat(tokens: list[str]) -> tuple[Optional[list[str]], bool]:
    """Strip outer quotes from string-literal tokens; collect inner bodies.

    Returns (parts, all_literal):
      parts       -- list of inner string bodies (post-quote-strip,
                     pre-escape-interpretation), or None if a non-string-literal
                     terminator (NULL, (((, ((void) was hit OR no parts collected.
      all_literal -- True if every input token was a string literal; False if
                     any non-literal-and-non-terminator token surfaced.

    Caller decides whether to abort emission, fall back, or skip based on the
    boolean. Internal building block for concat_string_literals and
    concat_string_literals_compact.
    """
    parts: list[str] = []
    all_literal = True
    for t in tokens:
        t = t.strip()
        if t.startswith('"') and t.endswith('"') and len(t) >= 2:
            parts.append(t[1:-1])
        elif t in ("NULL", "(((", "((void"):
            return None, False
        else:
            all_literal = False
    if not parts:
        return None, all_literal
    return parts, all_literal


def concat_string_literals(tokens: list[str]) -> Optional[str]:
    """Canonical source-truth concatenation. Applies unescape_c_string.

    Composes _strip_and_concat with unescape_c_string. Use for cvar names,
    descriptions, default values, command names, macro names -- any field
    whose contract is "preserve source-truth meaning of escapes" (post-v17).

    Returns None for NULL terminator or no-string-literals input.
    """
    from extractor_lib._cvar_shared import unescape_c_string
    parts, _all_literal = _strip_and_concat(tokens)
    if parts is None:
        return None
    return unescape_c_string("".join(parts))


def concat_string_literals_compact(tokens: list[str]) -> Optional[str]:
    """Description-compaction concatenation.

    Replaces \\n / \\t with space, \\" with ". Use for description-domain fields
    where newlines should collapse for single-line display (HUD_Register
    descriptions, ezscript description args).

    Does NOT call unescape_c_string -- the compact policy is intentionally
    different from canonical (e.g. \\\\ passes through verbatim).

    Returns None for NULL terminator or no-string-literals input.
    """
    parts, _all_literal = _strip_and_concat(tokens)
    if parts is None:
        return None
    body = "".join(parts)
    body = body.replace("\\n", " ").replace("\\t", " ").replace('\\"', '"')
    return body
```

Confirm `Optional` is already imported at the top of `_source.py` (it is -- verified during exploration).

- [ ] **Step 6A.5: Run tests, confirm pass**

```bash
python3 apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_source_concat.py
```

Expected: `All tests passed.` Exit code 0.

#### Subtask 6B: Delete 5 private copies + adopt lifted helpers

For each of the 5 FTE handlers, the routing follows the spec's audit table. The pattern per handler is identical: delete the local `def _concat_string_literals`, add an import from `extractor_lib._source`, replace each call site.

- [ ] **Step 6B.1: FTE cvars handler -- 8 call sites, all canonical**

Read `apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py` lines 95-120 to see the private function + surrounding imports.

Use Edit tool to:
1. Add import (after existing `from extractor_lib._cvar_shared import normalize_flags_raw  # noqa: E402` at line 43):
   ```python
   from extractor_lib._source import concat_string_literals  # noqa: E402
   ```
2. Delete the entire private `_concat_string_literals` function (lines 100-115 originally; line numbers shift after import additions, so grep first).
3. Replace each of 8 call sites: `_concat_string_literals(` -> `concat_string_literals(`. Lines are 179, 190, 200, 203, 234, 242, 251, 254 (verify with grep before editing).

For the bulk replacement, use the Edit tool with `replace_all=true`:
```
old_string: _concat_string_literals(
new_string: concat_string_literals(
```

(Safe because the function is only called via this name; the deleted definition is the only other occurrence.)

- [ ] **Step 6B.2: FTE commands handler -- 3 call sites, all canonical**

Read `apps/qw-oracle/scripts/extractors/fte/_handler_commands.py` lines 45-70.

Edit: add import `from extractor_lib._source import concat_string_literals  # noqa: E402` after existing `from extractor_lib._resolve import resolve_fn_ref  # noqa: E402` (line 28). Delete the private function (lines 50-64). Replace 3 call sites with `replace_all=true` on `_concat_string_literals(` -> `concat_string_literals(`.

- [ ] **Step 6B.3: FTE macros handler -- 1 call site, canonical**

Read `apps/qw-oracle/scripts/extractors/fte/_handler_macros.py` lines 65-90.

Edit: add import `from extractor_lib._source import concat_string_literals` near the top (after existing extractor_lib imports). Delete private function (lines 70-83). Replace the single call site at line 124 with `replace_all=true` on `_concat_string_literals(` -> `concat_string_literals(`.

- [ ] **Step 6B.4: FTE ezscript handler -- 2 call sites, both canonical**

Read `apps/qw-oracle/scripts/extractors/fte/_handler_ezscript.py` lines 35-85.

**Note:** ezscript's private copy uses the compact policy (mirrors ezhud), but per the spec audit table both call sites in ezscript are value/data extraction (canonical domain). Deleting the compact-policy private copy and adopting `concat_string_literals` (canonical) is the right call.

Edit: add import `from extractor_lib._source import concat_string_literals` near the top. Delete private function (lines 41-52). Replace 2 call sites at lines 65, 78 with `replace_all=true` on `_concat_string_literals(` -> `concat_string_literals(`.

- [ ] **Step 6B.5: FTE ezhud handler -- 6 call sites, mixed canonical + compact**

This handler needs the audit-table-driven split. Two helpers from `_source.py`; the call site for cvar default values must NOT use compact (would silently mangle `\n` to space).

Read `apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py` lines 70-130 + 235-380.

Edit:
1. Add imports near the top (after existing extractor_lib imports):
   ```python
   from extractor_lib._source import (  # noqa: E402
       concat_string_literals,
       concat_string_literals_compact,
   )
   ```
2. Delete private `_concat_string_literals` (lines 76-94).
3. Replace call sites per the audit table. Manual edit per site (cannot use `replace_all=true` because two variants are in play):

   | Line | Site | Variant |
   |---|---|---|
   | 105 (in `_resolve_default`) | cvar default value extraction | `concat_string_literals` (canonical) |
   | 254 | HUD_Register element name (arg 0) | `concat_string_literals` (canonical) |
   | 267 | HUD_Register description (arg 2) | `concat_string_literals_compact` |
   | 312 | HUD_Register custom param name | `concat_string_literals` (canonical) |
   | 347 | GetNVFDG name (arg 0) | `concat_string_literals` (canonical) |
   | 361 | GetNVFDG description (arg 3) | `concat_string_literals_compact` |

   Edit each call site individually. After all edits: `grep -n "concat_string_literals\|_concat_string_literals" apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py` should show 6 calls (4 canonical + 2 compact) and ZERO `_concat_string_literals` (private) references.

#### Subtask 6C: Verify the lift convergence

- [ ] **Step 6C.1: Confirm zero private copies remain**

```bash
grep -c "^def _concat_string_literals" apps/qw-oracle/scripts/extractors/fte/_handler_*.py
```

Expected: 0 across all 5 files (one zero per file, total = 0). If non-zero on any file, that handler still has the private copy.

- [ ] **Step 6C.2: Re-extract FTE**

```bash
python3 apps/qw-oracle/scripts/extractors/fte/extract.py --workers 12
```

Expected: clean run, ~47s. No traceback, no diagnostics about missing `_concat_string_literals`.

- [ ] **Step 6C.3: Verify byte-stable diff**

```bash
git diff --stat apps/qw-oracle/scripts/extractors/fte/output/
```

Expected: empty (no changes). Per the spec's narrow claim: no current FTE value carries an escape, so canonical-form lift produces byte-identical output to pre-lift token-walk.

**If the diff is non-empty, STOP and triage** per the spec's W2 failure path (Section 4):
- (a) Pre-lift `_concat_string_literals` was emitting raw escapes -> finding, pause Phase 6, decide drain-in-arc.
- (b) Lift bug -> investigate `concat_string_literals` composition with `unescape_c_string`.
- (c) Unrelated extraction non-determinism -> investigate.

- [ ] **Step 6C.4: Re-load FTE (idempotent re-load)**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project fte --version build-6698
```

Expected: clean run; counts unchanged from W1.

- [ ] **Step 6C.5: Re-run 3.2.2 contract**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT
                 e.project,
                 cv.source_root,
                 COUNT(*) AS violation_count
               FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project IN ('ezquake', 'fte', 'mvdsv')
                 AND e.source_state='source_backed'
                 AND NOT (
                   cv.flags_raw IS NOT NULL
                   AND (
                     cv.flags_raw = ''
                     OR cv.flags_raw GLOB '[A-Z0-9_]*'
                   )
                 )
               GROUP BY e.project, cv.source_root;"
```

Expected: empty (still zero post-W1).

- [ ] **Step 6C.6: Run unit tests**

```bash
python3 apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_source_concat.py
```

Expected: `All tests passed.` Exit 0.

#### Subtask 6D: Commit W2

- [ ] **Step 6D.1: Stage and commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/extractor_lib/_source.py \
        apps/qw-oracle/scripts/extractors/extractor_lib/tests/ \
        apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py \
        apps/qw-oracle/scripts/extractors/fte/_handler_commands.py \
        apps/qw-oracle/scripts/extractors/fte/_handler_macros.py \
        apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py \
        apps/qw-oracle/scripts/extractors/fte/_handler_ezscript.py
git commit -m "$(cat <<'EOF'
refactor(qw-oracle): lift concat_string_literals + delete 5 FTE private copies

W2 of cross-extractor Phase 6 arc. Lifts two new helpers to
extractor_lib/_source.py:
- concat_string_literals (canonical: applies unescape_c_string)
- concat_string_literals_compact (descriptions: collapses \n / \t to space)
Both share an internal _strip_and_concat building block.

Deletes 5 FTE private copies (cvars, commands, macros, ezhud, ezscript)
and routes each call site per the spec's audit table:
- Canonical for cvar/command/macro names + descriptions + defaults +
  ezhud HUD_Register element/param/default args + GetNVFDG name/default
  + ezscript value/default extraction.
- Compact for HUD_Register description (arg 2) + GetNVFDG description (arg 3).

Verification:
- grep -c "^def _concat_string_literals" fte/_handler_*.py = 0 (all 5 files)
- python3 fte/extract.py clean
- git diff --stat fte/output/ empty (byte-stable; no current FTE value
  carries an escape, so canonical lift produces identical output to
  pre-lift token-walk)
- 3.2.2 positive contract: zero violations across ezquake/fte/mvdsv
- python3 extractor_lib/tests/test_source_concat.py: 11 tests pass

Surface widening note: Mode B FTE report flagged 3 private copies; full
inventory is 5 (macros + ezscript also carried copies). Lift covers all 5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 7 (W3): QWCL `, ` -> ` | ` canonical separator

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/qwcl/_handler_cvars.py:113`

- [ ] **Step 7.1: Verify the QWCL line**

```bash
grep -n '", "\.join' apps/qw-oracle/scripts/extractors/qwcl/_handler_cvars.py
```

Expected: line 113 returns `flags_raw: Optional[str] = normalize_flags_raw(", ".join(flags_raw_parts) if flags_raw_parts else None)`.

- [ ] **Step 7.2: Edit the join**

Use Edit tool on `apps/qw-oracle/scripts/extractors/qwcl/_handler_cvars.py`:

```python
# old_string:
    flags_raw: Optional[str] = normalize_flags_raw(", ".join(flags_raw_parts) if flags_raw_parts else None)
# new_string:
    flags_raw: Optional[str] = normalize_flags_raw(" | ".join(flags_raw_parts) if flags_raw_parts else None)
```

- [ ] **Step 7.3: Re-extract QWCL**

```bash
python3 apps/qw-oracle/scripts/extractors/qwcl/extract.py
```

Expected: clean run, ~25s. Output JSON now uses ` | ` instead of `, ` between flag tokens.

- [ ] **Step 7.4: Sanity-check the JSON change**

```bash
grep -c '", "' apps/qw-oracle/scripts/extractors/qwcl/output/qwcl-variables-ast.json
grep -c '" | "' apps/qw-oracle/scripts/extractors/qwcl/output/qwcl-variables-ast.json
```

(These are rough; the json may use other separators. The actual signal is the next step's DB query.)

- [ ] **Step 7.5: Re-load QWCL**

```bash
npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- extract-tag --project qwcl --version 2.33
```

Expected: clean run; counts unchanged (187 cvars, 121 commands, 72 cmdline_params).

- [ ] **Step 7.6: Verify the QWCL N drop to 0**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT COUNT(*) FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project='qwcl'
                 AND e.source_state='source_backed'
                 AND cv.flags_raw LIKE '%, %';"
```

Expected: `0`. (Was N from Step 2.3.)

- [ ] **Step 7.7: Verify Phase 2 end gate -- 3.2.1 + 3.2.2 both clean across all four projects**

```bash
# 3.2.1 regression bar:
for proj in mvdsv ezquake fte qwcl; do
  echo "=== $proj ==="
  sqlite3 "$DB" "SELECT flags_raw, COUNT(*) FROM cvar_versions cv
                 JOIN entities e ON cv.entity_id=e.id
                 WHERE e.project='$proj'
                   AND e.source_state='source_backed'
                   AND (flags_raw IN ('0', 'CVAR_NONE') OR flags_raw IS NULL)
                 GROUP BY flags_raw;"
done

# 3.2.2 positive contract:
sqlite3 "$DB" "SELECT
                 e.project,
                 cv.source_root,
                 COUNT(*) AS violation_count
               FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project IN ('ezquake', 'fte', 'mvdsv')
                 AND e.source_state='source_backed'
                 AND NOT (
                   cv.flags_raw IS NOT NULL
                   AND (
                     cv.flags_raw = ''
                     OR cv.flags_raw GLOB '[A-Z0-9_]*'
                   )
                 )
               GROUP BY e.project, cv.source_root;"
```

Expected: 3.2.1 returns no rows for any project; 3.2.2 returns no rows. End-of-Phase-2 gate met.

- [ ] **Step 7.8: Commit W3**

```bash
git add apps/qw-oracle/scripts/extractors/qwcl/_handler_cvars.py apps/qw-oracle/scripts/extractors/qwcl/output/
git commit -m "$(cat <<'EOF'
refactor(qw-oracle): QWCL flags_raw join switches to canonical ' | ' separator

W3 of cross-extractor Phase 6 arc. QWCL's _handler_cvars.py:113 was joining
flag-name parts with ', ' instead of the canonical ' | ' used by ezquake +
fte + mvdsv. Phase 6 normalizes for cross-project canonical form.

QWCL's 1996-vintage cvar_t emits lowercase boolean field values (true,
false, "true | false" post-W3) and remains carved-out of the 3.2.2 positive
contract; QWCL flags_raw shape positive contract is captured as future-arc
work in the candidate-positive-contracts list.

Verification:
- Pre-W3: SELECT COUNT(*) ... WHERE flags_raw LIKE '%, %' = N
  (where N was captured in Phase 1 baseline)
- Post-W3: SELECT COUNT(*) ... WHERE flags_raw LIKE '%, %' = 0
- Phase 2 end gate: 3.2.1 + 3.2.2 both return zero violations across all
  four projects.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7.9: Push at end of Phase 2 (optional)**

```bash
git push origin main
```

(Per spec: push at end of Phase 1 + end of Phase 3 OR single push at end of Phase 3. End-of-Phase-2 push is fine but not required.)

---

## Phase 3: Grid uplift

### Task 8 (W5): Floor probe factory + 54-58 floor probes

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts` (factory tests)
- Modify: `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (add factory + floor probes + per-project comment block)

#### Subtask 8A: Pre-Phase-3 SQL verification step (mandatory)

- [ ] **Step 8A.1: Capture per-project entity counts**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT project, type, COUNT(*) FROM entities
               GROUP BY project, type HAVING COUNT(*) > 0
               ORDER BY project, type;"
```

**Capture this output verbatim.** It defines the floor probe inventory: every (project, type) row gets a count probe + a source_state probe. Save the output to a temp file for use in Step 8C.4 (commit body) and Step 8C.5 (per-project comment block in quality-grid.ts).

The output also locks the dead-probe gate: only entity types with `COUNT(*) > 0` get probes. Probes for unloaded entity types would assert COUNT=0 and silently PASS forever.

- [ ] **Step 8A.2: Capture per-project source_state distributions**

```bash
sqlite3 "$DB" "SELECT project, type, source_state, COUNT(*) FROM entities
               GROUP BY project, type, source_state HAVING COUNT(*) > 0
               ORDER BY project, type, source_state;"
```

Capture this output too. Each (project, type) row from Step 8A.1 needs a corresponding source_state-distribution probe; this output gives the expected distributions.

#### Subtask 8B: TDD the floor probe factory

- [ ] **Step 8B.1: Write failing tests for `makeFloorCountProbe` + `makeFloorSourceStateProbe`**

Create `apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts`:

```typescript
// Uses node:test + tsx because better-sqlite3 is a native Node addon that
// Bun cannot load. Run with: tsx --test scripts/load-knowledge/quality-grid.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { applySchema } from './schema.js';
import { makeFloorCountProbe, makeFloorSourceStateProbe } from './quality-grid.js';

function newDb(): Database.Database {
  const db = new Database(':memory:');
  applySchema(db);
  // Seed minimal data: one entity per (project, type) the test cares about.
  db.exec(`
    INSERT INTO entities (id, project, type, name, source_state)
    VALUES
      ('e1', 'fte', 'cvar', 'cv_one', 'source_backed'),
      ('e2', 'fte', 'cvar', 'cv_two', 'source_backed'),
      ('e3', 'fte', 'command', 'cmd_one', 'source_backed'),
      ('e4', 'ezquake', 'cvar', 'cv_three', 'doc_only');
  `);
  return db;
}

describe('makeFloorCountProbe', () => {
  it('returns PASS when count matches expected', () => {
    const db = newDb();
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    const result = probe.run({ db, project: 'fte' });
    assert.equal(result.status, 'PASS');
    assert.equal(result.count, 2);
  });

  it('returns FAIL when count differs from expected', () => {
    const db = newDb();
    const probe = makeFloorCountProbe('fte', 'cvar', 99);
    const result = probe.run({ db, project: 'fte' });
    assert.equal(result.status, 'FAIL');
    assert.equal(result.count, 2);
  });

  it('skips when project does not match the probe project', () => {
    const db = newDb();
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    const result = probe.run({ db, project: 'ezquake' });
    assert.equal(result.status, 'PASS');
    assert.match(result.summary, /skipped/);
  });

  it('uses canonical probe name', () => {
    const probe = makeFloorCountProbe('fte', 'cvar', 2);
    assert.equal(probe.name, 'F1.fte.floor.cvar_count');
    assert.equal(probe.family, 'regression');
  });
});

describe('makeFloorSourceStateProbe', () => {
  it('returns PASS when source_state distribution matches', () => {
    const db = newDb();
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 2 });
    const result = probe.run({ db, project: 'fte' });
    assert.equal(result.status, 'PASS');
  });

  it('returns FAIL when source_state distribution differs', () => {
    const db = newDb();
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 1, doc_only: 1 });
    const result = probe.run({ db, project: 'fte' });
    assert.equal(result.status, 'FAIL');
  });

  it('uses canonical probe name', () => {
    const probe = makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 2 });
    assert.equal(probe.name, 'F1.fte.floor.cvar_source_state');
    assert.equal(probe.family, 'regression');
  });
});
```

- [ ] **Step 8B.2: Run tests, confirm they fail**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npx tsx --test scripts/load-knowledge/quality-grid.test.ts
```

Expected: import error or undefined-export error -- `makeFloorCountProbe` and `makeFloorSourceStateProbe` don't exist yet.

- [ ] **Step 8B.3: Add the two factories to `quality-grid.ts`**

Read the existing probe shape in `quality-grid.ts` (especially around `probeFteCvarsCount` at line 462-478) to confirm the `Probe` and `ProbeContext` types.

Use Edit tool to insert the two factory functions before the registration list (around line 1297, before `const ALL_PROBES`):

```typescript
// ---------------------------------------------------------------------------
// Floor probe factories (Phase 6 -- universal mechanical floor)
// ---------------------------------------------------------------------------

export function makeFloorCountProbe(
  project: Project,
  type: string,
  expected: number,
): Probe {
  return {
    name: `F1.${project}.floor.${type}_count`,
    family: 'regression',
    description: `Floor count probe: entities[project=${project}, type=${type}].`,
    run: ({ db, project: ctxProject }) => {
      if (ctxProject !== project) {
        return {
          name: `F1.${project}.floor.${type}_count`,
          family: 'regression',
          description: '',
          status: 'PASS',
          count: 0,
          summary: `skipped (not ${project} project)`,
          examples: [],
        };
      }
      const row = db
        .prepare("SELECT COUNT(*) AS n FROM entities WHERE project=? AND type=?")
        .get(project, type) as { n: number };
      const actual = row.n;
      const status = actual === expected ? 'PASS' : 'FAIL';
      return {
        name: `F1.${project}.floor.${type}_count`,
        family: 'regression',
        description: '',
        status,
        count: actual,
        summary: `${type}: actual=${actual}, expected=${expected}`,
        examples: [],
      };
    },
  };
}

export function makeFloorSourceStateProbe(
  project: Project,
  type: string,
  expected: Record<string, number>,
): Probe {
  return {
    name: `F1.${project}.floor.${type}_source_state`,
    family: 'regression',
    description: `Floor source_state probe: entities[project=${project}, type=${type}] grouped by source_state.`,
    run: ({ db, project: ctxProject }) => {
      if (ctxProject !== project) {
        return {
          name: `F1.${project}.floor.${type}_source_state`,
          family: 'regression',
          description: '',
          status: 'PASS',
          count: 0,
          summary: `skipped (not ${project} project)`,
          examples: [],
        };
      }
      const rows = db
        .prepare(
          "SELECT source_state, COUNT(*) AS n FROM entities WHERE project=? AND type=? GROUP BY source_state",
        )
        .all(project, type) as { source_state: string; n: number }[];
      const actual: Record<string, number> = {};
      for (const r of rows) actual[r.source_state] = r.n;
      const expectedKeys = Object.keys(expected).sort().join(',');
      const actualKeys = Object.keys(actual).sort().join(',');
      let match = expectedKeys === actualKeys;
      if (match) {
        for (const k of Object.keys(expected)) {
          if (expected[k] !== actual[k]) {
            match = false;
            break;
          }
        }
      }
      const status = match ? 'PASS' : 'FAIL';
      return {
        name: `F1.${project}.floor.${type}_source_state`,
        family: 'regression',
        description: '',
        status,
        count: rows.reduce((s, r) => s + r.n, 0),
        summary: `actual=${JSON.stringify(actual)}, expected=${JSON.stringify(expected)}`,
        examples: [],
      };
    },
  };
}
```

The `Project` type is already exported (used in the existing probe-skip pattern at line 462). The `Probe` interface is defined near line 41; if it's not exported, export it now (`export interface Probe { ... }`).

- [ ] **Step 8B.4: Run tests, confirm pass**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npx tsx --test scripts/load-knowledge/quality-grid.test.ts
```

Expected: 7 tests pass.

#### Subtask 8C: Add the floor probes from the seed values

- [ ] **Step 8C.1: Construct the per-project comment block**

Open `quality-grid.ts` and add a comment block right before the floor probes section (which we'll add next). Format:

```typescript
// ---------------------------------------------------------------------------
// Floor probes (Phase 6, 2026-04-28)
// ---------------------------------------------------------------------------
//
// Universal mechanical floor: every (project, type) entity row gets a
// count probe + a source_state distribution probe.
//
// Seed values captured from:
//   sqlite3 "$DB" "SELECT project, type, COUNT(*) FROM entities
//                  GROUP BY project, type HAVING COUNT(*) > 0
//                  ORDER BY project, type;"
//
// Per-project entity counts (locked at 2026-04-28, schema v18):
//
//   ezquake:
//     <paste from Step 8A.1 ezquake rows>
//
//   fte:
//     <paste from Step 8A.1 fte rows>
//
//   mvdsv:
//     <paste from Step 8A.1 mvdsv rows>
//
//   qwcl:
//     <paste from Step 8A.1 qwcl rows>
//
// Source_state distributions captured from:
//   sqlite3 "$DB" "SELECT project, type, source_state, COUNT(*) FROM entities
//                  GROUP BY project, type, source_state HAVING COUNT(*) > 0
//                  ORDER BY project, type, source_state;"
//
//   <paste full source_state output from Step 8A.2>
//
// When an entity-type count legitimately changes (new entities loaded, schema
// migration shifts row counts, etc.), update both the count probe's `expected`
// constant AND this comment block. Failure messages surface actual-vs-expected
// naturally.
```

Replace each `<paste ...>` placeholder with the corresponding output captured in Steps 8A.1 / 8A.2.

- [ ] **Step 8C.2: Add the floor probe instantiations**

After the comment block, add per-project arrays of probe instantiations using the factories. The pattern (filled in with actual counts from Step 8A):

```typescript
const EZQUAKE_FLOOR_PROBES: Probe[] = [
  makeFloorCountProbe('ezquake', 'cvar', /* expected */),
  makeFloorSourceStateProbe('ezquake', 'cvar', { /* state: count, ... */ }),
  makeFloorCountProbe('ezquake', 'command', /* expected */),
  makeFloorSourceStateProbe('ezquake', 'command', { /* state: count, ... */ }),
  // ... one count + one source_state probe per (ezquake, type) row from Step 8A.1
];

const FTE_FLOOR_PROBES: Probe[] = [
  makeFloorCountProbe('fte', 'cvar', /* expected */),
  // ... etc
];

const MVDSV_FLOOR_PROBES: Probe[] = [
  // ...
];

const QWCL_FLOOR_PROBES: Probe[] = [
  makeFloorCountProbe('qwcl', 'cvar', 187),
  makeFloorSourceStateProbe('qwcl', 'cvar', { source_backed: 187 }),
  makeFloorCountProbe('qwcl', 'command', 121),
  makeFloorSourceStateProbe('qwcl', 'command', { source_backed: 121 }),
  makeFloorCountProbe('qwcl', 'cmdline_param', 72),
  makeFloorSourceStateProbe('qwcl', 'cmdline_param', { source_backed: 72 }),
];
```

(QWCL example shows the expected populated values from current DB; ezquake/fte/mvdsv require populating from the captured Step 8A output.)

- [ ] **Step 8C.3: Register the floor probes in `ALL_PROBES`**

Append to the `ALL_PROBES` array (around line 1302+):

```typescript
const ALL_PROBES: Probe[] = [
  // ... existing probes ...

  // Phase 6 floor probes (added 2026-04-28)
  ...EZQUAKE_FLOOR_PROBES,
  ...FTE_FLOOR_PROBES,
  ...MVDSV_FLOOR_PROBES,
  ...QWCL_FLOOR_PROBES,
];
```

- [ ] **Step 8C.4: Run quality grid for each project, confirm all PASS**

```bash
cd /home/paradoks/projects/quakeworld
for proj in ezquake fte mvdsv qwcl; do
  echo "=== $proj ==="
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family regression
done
```

Expected: all PASS for all four projects, including all floor probes. If any FAIL, the seed value mismatches the live DB; re-run Steps 8A.1 + 8A.2 and update the probe's `expected` constant.

- [ ] **Step 8C.5: Run unit tests one more time**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npx tsx --test scripts/load-knowledge/quality-grid.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 8C.6: Commit W5**

```bash
cd /home/paradoks/projects/quakeworld
FLOOR_PROBE_COUNT=$(grep -c "makeFloorCountProbe\|makeFloorSourceStateProbe" apps/qw-oracle/scripts/load-knowledge/quality-grid.ts | head -1)
git add apps/qw-oracle/scripts/load-knowledge/quality-grid.ts apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts
git commit -m "$(cat <<'EOF'
feat(qw-oracle): add quality-grid floor probes (entity_type x {count, source_state})

W5 of cross-extractor Phase 6 arc. Universal mechanical floor: every
(project, type) entity row gets a count probe + a source_state distribution
probe. Closes the silent-dead-probe failure mode (probes for unloaded entity
types would assert COUNT=0 and PASS forever).

Two factory functions in quality-grid.ts:
- makeFloorCountProbe(project, type, expected) -> Probe
- makeFloorSourceStateProbe(project, type, expected: Record<state, count>) -> Probe

Seed values captured from a one-time pre-Phase-3 SQL pass:
  sqlite3 "$DB" "SELECT project, type, COUNT(*) FROM entities
                 GROUP BY project, type HAVING COUNT(*) > 0;"
Per-project comment block in quality-grid.ts documents the seed values +
date + the SQL query used to derive them (audit trail for the magic
constants).

Floor probe count: <FLOOR_PROBE_COUNT> (per-project breakdown in spec
docs/superpowers/specs/2026-04-28-cross-extractor-phase6-fte-convergence-grid-uplift-design.md).

Verification:
- npx tsx --test scripts/load-knowledge/quality-grid.test.ts: 7 tests pass
- npm run quality-grid for each of ezquake/fte/mvdsv/qwcl: all PASS

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

(Replace `<FLOOR_PROBE_COUNT>` with the actual count from the grep one-liner.)

### Task 9 (W6): Per-project anchor probes

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` (add 4 anchor probes + register)
- Modify: `HANDOVER.md` (add 3 entries)

#### Subtask 9A: Add the 4 anchor probes

The anchors are individual functions (not factory-generated, since each captures a project-specific invariant). Pattern matches existing project-specific probes like `probeFteCvarsCount`.

- [ ] **Step 9A.1: Add `probeEzquakeGlLightmodePingPongEquality`**

Add to `quality-grid.ts` (place near other ezquake-related probes; if no ezquake-specific probes exist yet, add a new section):

```typescript
function probeEzquakeGlLightmodePingPongEquality(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'ezquake') {
    return {
      name: 'F1.ezquake.anchor.gl_lightmode_ping_pong',
      family: 'regression', description: '',
      status: 'PASS', count: 0,
      summary: 'skipped (not ezquake project)', examples: [],
    };
  }
  // gl_lightmode oscillates default_value across 15 versions; this anchor
  // pins the historical pattern as an equality assertion.
  // Capture the count of distinct (default_value, version) tuples for gl_lightmode
  // at HEAD's snapshot; equality asserts the historical record holds.
  const row = ctx.db.prepare(`
    SELECT COUNT(DISTINCT cv.default_value || ':' || cv.version) AS n
    FROM cvar_versions cv
    JOIN entities e ON cv.entity_id = e.id
    WHERE e.project='ezquake' AND e.name='gl_lightmode'
  `).get() as { n: number };
  const expected = /* capture pre-W6 from a one-shot query: see Step 9B */ 0;
  const actual = row.n;
  const status = actual === expected ? 'PASS' : 'FAIL';
  return {
    name: 'F1.ezquake.anchor.gl_lightmode_ping_pong',
    family: 'regression', description: '',
    status, count: actual,
    summary: `gl_lightmode distinct (default_value,version) tuples: actual=${actual}, expected=${expected}`,
    examples: [],
  };
}
```

The `expected` constant is captured in Step 9B from a one-shot query.

- [ ] **Step 9A.2: Add `probeEzquakeDocOnlyCount`**

```typescript
function probeEzquakeDocOnlyCount(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'ezquake') {
    return {
      name: 'F1.ezquake.anchor.doc_only_count',
      family: 'regression', description: '',
      status: 'PASS', count: 0,
      summary: 'skipped (not ezquake project)', examples: [],
    };
  }
  const row = ctx.db.prepare(`
    SELECT COUNT(*) AS n FROM entities
    WHERE project='ezquake' AND source_state='doc_only'
  `).get() as { n: number };
  const expected = 194;
  const actual = row.n;
  const status = actual === expected ? 'PASS' : 'FAIL';
  return {
    name: 'F1.ezquake.anchor.doc_only_count',
    family: 'regression', description: '',
    status, count: actual,
    summary: `ezquake doc_only entities: actual=${actual}, expected=${expected}`,
    examples: [],
  };
}
```

- [ ] **Step 9A.3: Add `probeQwclAllSourceBacked`**

```typescript
function probeQwclAllSourceBacked(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'qwcl') {
    return {
      name: 'F1.qwcl.anchor.all_source_backed',
      family: 'regression', description: '',
      status: 'PASS', count: 0,
      summary: 'skipped (not qwcl project)', examples: [],
    };
  }
  const row = ctx.db.prepare(`
    SELECT COUNT(*) AS n FROM entities
    WHERE project='qwcl' AND source_state != 'source_backed'
  `).get() as { n: number };
  const actual = row.n;
  const status = actual === 0 ? 'PASS' : 'FAIL';
  return {
    name: 'F1.qwcl.anchor.all_source_backed',
    family: 'regression', description: '',
    status, count: actual,
    summary: `qwcl entities with non-source_backed state: actual=${actual}, expected=0`,
    examples: [],
  };
}
```

- [ ] **Step 9A.4: Add `probeFteEngineVsPluginSplit`**

```typescript
function probeFteEngineVsPluginSplit(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return {
      name: 'F1.fte.anchor.engine_vs_plugin_ezhud_split',
      family: 'regression', description: '',
      status: 'PASS', count: 0,
      summary: 'skipped (not fte project)', examples: [],
    };
  }
  const rows = ctx.db.prepare(`
    SELECT cv.source_root, COUNT(*) AS n
    FROM cvar_versions cv
    JOIN entities e ON cv.entity_id = e.id
    WHERE e.project='fte'
    GROUP BY cv.source_root
  `).all() as { source_root: string; n: number }[];
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.source_root] = r.n;
  const expectedEngine = 1397;
  const expectedPluginEzhud = 1085;
  const actualEngine = counts['engine'] ?? 0;
  const actualPluginEzhud = counts['plugin:ezhud'] ?? 0;
  const status = (actualEngine === expectedEngine && actualPluginEzhud === expectedPluginEzhud) ? 'PASS' : 'FAIL';
  return {
    name: 'F1.fte.anchor.engine_vs_plugin_ezhud_split',
    family: 'regression', description: '',
    status,
    count: actualEngine + actualPluginEzhud,
    summary: `engine: actual=${actualEngine} expected=${expectedEngine}, plugin:ezhud: actual=${actualPluginEzhud} expected=${expectedPluginEzhud}`,
    examples: [],
  };
}
```

- [ ] **Step 9A.5: Register the four anchor probes in `ALL_PROBES`**

Append to the `ALL_PROBES` array:

```typescript
  // Phase 6 anchor probes (added 2026-04-28)
  { name: 'F1.ezquake.anchor.gl_lightmode_ping_pong', family: 'regression', description: '', run: probeEzquakeGlLightmodePingPongEquality },
  { name: 'F1.ezquake.anchor.doc_only_count', family: 'regression', description: '', run: probeEzquakeDocOnlyCount },
  { name: 'F1.qwcl.anchor.all_source_backed', family: 'regression', description: '', run: probeQwclAllSourceBacked },
  { name: 'F1.fte.anchor.engine_vs_plugin_ezhud_split', family: 'regression', description: '', run: probeFteEngineVsPluginSplit },
```

#### Subtask 9B: Calibrate the gl_lightmode anchor's expected value

- [ ] **Step 9B.1: Run the seed query for gl_lightmode**

```bash
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT COUNT(DISTINCT cv.default_value || ':' || cv.version) AS n
               FROM cvar_versions cv
               JOIN entities e ON cv.entity_id = e.id
               WHERE e.project='ezquake' AND e.name='gl_lightmode';"
```

Capture the value. Edit `probeEzquakeGlLightmodePingPongEquality` to replace the placeholder `0` in `const expected = /* capture pre-W6 from a one-shot query */ 0;` with the captured value.

#### Subtask 9C: Verify + Commit + HANDOVER + Push

- [ ] **Step 9C.1: Run quality grid for all four projects**

```bash
cd /home/paradoks/projects/quakeworld
for proj in ezquake fte mvdsv qwcl; do
  echo "=== $proj ==="
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family regression
done
```

Expected: all PASS. Each project sees its own anchor probes and skips the others.

- [ ] **Step 9C.2: Update HANDOVER.md**

Read `HANDOVER.md` to find the right insertion point (top of the open-items list). Add three new entries:

```markdown
- [Cross-extractor] Lifecycle hooks gap (D.1.8 from cross-extractor audit; restated for visibility) -- FTE commands/macros/cmdline + MVDSV commands lack `enter_function`/`exit_function` hooks. Result: `enclosing_function` / `registration_file` columns NULL for those rows. Per-arc fix would lift Visitor's lifecycle hooks across the missing handlers; deferred from Phase 6.
- [Cross-extractor] Broader positive-contract coverage (handler_fn, descriptions, default_value C-escape interpretation, info_key/qc_builtin canonical names, QWCL flags_raw shape) -- see VALIDATION-RUNBOOK.md Section 3.2 'candidate positive contracts' list. Phase 6 closed the flags_raw gap; the rest remain.
- [Cross-extractor] Deep-time-walk re-extract obligation: any future FTE or QWCL historical-version load must re-extract under post-Phase-6 handlers (otherwise pre-Phase-6 historical versions would carry the wrong-shape flags_raw the prior arc emitted). FTE today has only build-6698; QWCL only 2.33; the obligation activates when a multi-version walk is scheduled.
```

- [ ] **Step 9C.3: Commit W6**

```bash
git add apps/qw-oracle/scripts/load-knowledge/quality-grid.ts HANDOVER.md
git commit -m "$(cat <<'EOF'
feat(qw-oracle): add quality-grid anchor probes + HANDOVER updates

W6 of cross-extractor Phase 6 arc. Four per-project anchor probes for
load-bearing invariants Mode B identified:
- F1.ezquake.anchor.gl_lightmode_ping_pong  (was F2 informational, now
  F1 equality on distinct (default_value, version) tuples)
- F1.ezquake.anchor.doc_only_count          (=194, the historical doc_only
  count from the v17 walk)
- F1.qwcl.anchor.all_source_backed          (=0 entities with non-source_backed
  state; QWCL has no help-JSON so all rows must be source_backed)
- F1.fte.anchor.engine_vs_plugin_ezhud_split (engine=1397, plugin:ezhud=1085)

HANDOVER updated with three entries:
- D.1.8 lifecycle hooks gap (restate)
- Broader positive-contract coverage pointer to runbook 3.2 candidates
- Deep-time-walk re-extract obligation for future FTE/QWCL multi-version loads

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9C.4: Push at end of Phase 3**

```bash
git push origin main
```

---

## Final Verification

- [ ] **Step F.1: Confirm all six commits landed**

```bash
git log --oneline -7
```

Expected, top-to-bottom:
```
<hash> feat(qw-oracle): add quality-grid anchor probes + HANDOVER updates
<hash> feat(qw-oracle): add quality-grid floor probes (entity_type x {count, source_state})
<hash> refactor(qw-oracle): QWCL flags_raw join switches to canonical ' | ' separator
<hash> refactor(qw-oracle): lift concat_string_literals + delete 5 FTE private copies
<hash> fix(qw-oracle): ezhud handler routes flags_raw through normalize_flags_raw (1085 rows recovered)
<hash> docs(qw-oracle): runbook 3.2 split into regression bar + positive contract
<hash> docs(qw-oracle): tighten Phase 6 spec (QWCL flags_raw carve-out + floor probe verification step)
```

- [ ] **Step F.2: Verify acceptance criteria**

Run each acceptance check from the spec:

```bash
# 1. Positive contract clean across all four projects
DB=/home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT
                 e.project, cv.source_root, COUNT(*) AS violation_count
               FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project IN ('ezquake', 'fte', 'mvdsv')
                 AND e.source_state='source_backed'
                 AND NOT (cv.flags_raw IS NOT NULL AND (cv.flags_raw = '' OR cv.flags_raw GLOB '[A-Z0-9_]*'))
               GROUP BY e.project, cv.source_root;"
# Expected: empty

# 2. Zero private _concat_string_literals copies in FTE
grep -c "^def _concat_string_literals" apps/qw-oracle/scripts/extractors/fte/_handler_*.py
# Expected: 5x "0"

# 3. Zero flags_raw IS NULL for source_backed cvars
sqlite3 "$DB" "SELECT COUNT(*) FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE cv.flags_raw IS NULL AND e.source_state='source_backed';"
# Expected: 0 (or only QWCL rows if QWCL has any -- check separately)

# 4. QWCL emits canonical ' | '
sqlite3 "$DB" "SELECT COUNT(*) FROM cvar_versions cv
               JOIN entities e ON cv.entity_id=e.id
               WHERE e.project='qwcl' AND cv.flags_raw LIKE '%, %';"
# Expected: 0

# 5. Quality grid PASS across all four projects
for proj in ezquake fte mvdsv qwcl; do
  npm --prefix apps/qw-oracle --no-workspaces run load-knowledge -- quality-grid --project $proj --family regression | tail -3
done
# Expected: all PASS
```

- [ ] **Step F.3: Run typecheck (defense)**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run typecheck
```

Expected: clean exit. (Catches any TS type slip in the factory functions or anchor probes.)

- [ ] **Step F.4: Verify Mode B disposition complete**

The arc was scoped against the synthesis: S-01 + S-03 in scope; S-02 deferred to HANDOVER.

```bash
grep -c "lifecycle hooks gap (D.1.8" HANDOVER.md
# Expected: 1 (the W6 update)
```

If all checks pass, Phase 6 is complete. The seven commits (1 spec tightening + 6 implementation) form the PR-equivalent.

---

## Self-Review Checklist (post-write)

After writing all the above tasks:

**1. Spec coverage:**
- [x] Section 1 (Framing): Tasks 1-9 implement all three layers.
- [x] Section 2.1-2.5 (Components -- handler-side): Tasks 5, 6, 7.
- [x] Section 2.6 (Verification layer): Task 1.
- [x] Section 2.7 (Grid uplift): Tasks 8, 9.
- [x] Section 2.8 (No schema migration): No task needed; verified during baseline.
- [x] Section 3 (Data flow): Phase shape matches spec's 6-commit shape.
- [x] Section 4 (Verification gates): Each task has the spec's verification gate as its final-step check.
- [x] Section 5 (Acceptance): Final Verification step F.2 runs each acceptance check.
- [x] Section 6 (Phase ordering): Tasks numbered 1-9 with explicit Phase 1/2/3 grouping.

**2. Placeholder scan:**
- The plan has 4 intentional measurement-time placeholders: N (QWCL `, ` count) in Step 2.3, baseline output in Step 2.2, FLOOR_PROBE_COUNT in Step 8C.6, expected for gl_lightmode in Step 9A.1. Each has explicit instructions to capture and substitute. No other TODOs / TBDs.

**3. Type consistency:**
- `concat_string_literals` / `concat_string_literals_compact` / `_strip_and_concat` -- consistent across spec and plan.
- `makeFloorCountProbe` / `makeFloorSourceStateProbe` -- consistent across factory definition + tests + instantiation.
- Anchor probe names use `F1.<project>.anchor.<invariant>` pattern -- consistent across all four.
- The `Probe` / `ProbeResult` / `ProbeContext` types are consumed but not redefined; existing quality-grid.ts shapes them.
