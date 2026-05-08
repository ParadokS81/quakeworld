# Phase 3 -- parallel-vs-serial tests

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full). [DONE]
> 2. Read `review-findings.md` (no F-entries at draft time). [DONE]
> 3. Read parking doc Pass 1.2.3 + Pass 2.3. [DONE]
> 4. Source-walk `apps/qw-oracle/scripts/extractors/ktx/tests/` (3 KTX test files). [DONE]
> 5. Read `extractor_lib/__init__.py`. [DONE]
> 6. Grep MACRO_DEFINITION / ENUM_DECL / workers patterns across all 5 projects. [DONE]
> 7. Verify pytest infrastructure. [DONE]

## Goal

Phase 3 lifts the KTX-only parallel-vs-serial test helper from `ktx/tests/` into
`extractor_lib/tests/parallel_serial_helpers.py` so every project can reuse it with
`from extractor_lib.tests import assert_parallel_serial_equivalent`. It then ships
per-handler tests for handlers identified as parallel-aggregation-risky during the
catch-up audit: the two KTX handlers with confirmed fixed bugs (gameplay_taxonomies
D.3.1 + modes F25) have their imports updated to use the lifted helper, and a new
test is added for MVDSV's `_handler_protocol.py` (MACRO_DEFINITION walk with
`source_total` tracking -- the non-KTX handler most structurally similar to the risk
class). All other handlers across ezquake / fte / qwcl and remaining KTX / MVDSV
handlers use the safe `end_file -> all_rows param -> finalize` pattern with no
cross-worker instance state; they are explicitly audited and deferred per D8. Runnable
state at phase boundary: `pytest apps/qw-oracle/scripts/extractors/` runs without
import error and all per-handler equivalence tests pass.

## Inputs from previous phase

Phase 2 complete: `reproducibility-check.ts` shipped; dispatcher case `case 'reproducibility-check':` registered in `index.ts`; per-project config dict (5 entries); 5-project audit all PASS. The Python test infrastructure (pytest, libclang 18, extractor_lib shared lib) is unchanged by Phases 1 and 2 and was working before Phase 1 started (KTX tests were already discoverable via `pytest apps/qw-oracle/scripts/extractors/ktx/tests/`).

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py
apps/qw-oracle/scripts/extractors/mvdsv/tests/__init__.py
apps/qw-oracle/scripts/extractors/mvdsv/tests/test_handler_protocol_parallel_serial.py
```

### Modified

```
apps/qw-oracle/scripts/extractors/extractor_lib/tests/__init__.py   # add export: assert_parallel_serial_equivalent
apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py  # replace inner run_with_workers with lifted helper
apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py               # replace inner run_with_workers with lifted helper
```

### Deleted

```
(none)
```

## Recon findings (recorded here per D8 + D6)

These findings drove scope decisions for this phase. Recorded here so the executor
and operator see the audit trail in one place.

**Parallel-aggregation-risky handlers identified (all 5 projects):**

| Handler | Project | Risk class | Status | Action |
|---|---|---|---|---|
| `_handler_gameplay_taxonomies.py` | ktx | D.3.1 (KTX onboarding arc `review-findings.md`): per-worker `_election_seen_tags` dedup; `source_total` scaled with workers | Fixed (D.3.1 commit in KTX onboarding arc); existing test `test_parallel_serial_equivalence` in `test_handler_gameplay_taxonomies.py` | Update import to use lifted helper |
| `_handler_modes.py` | ktx | F25 (KTX onboarding arc `review-findings.md`): mode_defaults accumulated in workers instead of parent; parallel=0 mode_defaults | Fixed (F25 commit in KTX onboarding arc); existing test `test_parallel_serial_equivalence` in `test_handler_modes.py` (conditional on F25 guard removal) | Update import to use lifted helper |
| `_handler_protocol.py` | mvdsv | MACRO_DEFINITION walk: each .c file walk emits ALL protocol macros from protocol.h; `source_total = N_macros * N_c_files_with_protocol_h` should be worker-count-invariant -- certify via test | No bug found; structural risk class (MACRO_DEFINITION + stats tracking) | New test to certify invariance |

**Handlers audited and deferred (safe pattern -- no tests needed):**

ezquake: `_handler_cvars.py`, `_handler_commands.py`, `_handler_macros.py`, `_handler_asset_cvar_bindings.py`, `_handler_asset_loader_sites.py`, `_handler_cmdline.py`, `_handler_hud_elements.py`, `_handler_keynames.py` -- all use `_seen_in_file` (per-file reset in `end_file`) + `finalize(all_rows=...)` param; no cross-worker instance state. Deferred: no test needed.

fte: `_handler_cvars.py`, `_handler_commands.py`, `_handler_macros.py`, `_handler_ezhud.py`, `_handler_ezscript.py`, `_handler_asset_cvar_bindings.py`, `_handler_asset_loader_sites.py`, `_handler_cmdline.py` -- same safe pattern. `self._all_rows` instance dicts present in macros/commands/cvars/ezhud but confirmed dead attributes (finalize uses `all_rows` parameter, not `self._all_rows`). Deferred: no test needed.

qwcl: `_handler_cvars.py`, `_handler_commands.py`, `_handler_cmdline.py` -- simplest pattern; same safe shape. Deferred: no test needed.

mvdsv (remaining): `_handler_info_keys.py` (explicit Approach B doc: finalize in parent after merge), `_handler_commands.py` (explicit doc: emit fn-def rows so finalize resolves banner in parent), `_handler_log_templates.py` (safe finalize-via-param), `_handler_qc_builtins.py` (safe finalize-via-param), `_handler_cmdline.py` (safe). Deferred: no test needed.

ktx (remaining): `_handler_info_keys.py` (safe: end_file accumulates per-file, finalize receives all_rows), `_handler_log_templates.py` (safe), `_handler_match_events.py` (XSD-driven; setup() in parent; workers do nothing; finalize reads self._merged_events from setup state -- effectively static). Deferred: no test needed.

**Explicit reject (not a parallel-aggregation risk):**
FTE `self._all_rows` dead attribute in macros/commands/cvars/ezhud: these are instance dicts initialized in `__init__` but never populated (finalize uses the `all_rows` parameter). Not a risk; rationale: grep confirms `self._all_rows` is never written after `__init__`; finalize loop `for row in all_rows:` uses the driver-passed param, not `self._all_rows`. Reject from Phase 3 scope.

**KTX import update decision (per drafter prompt section f):**
Default chosen: keep KTX test files in place (`ktx/tests/test_handler_*.py`); update the inner `run_with_workers` closures to use `assert_parallel_serial_equivalent` from `extractor_lib.tests`. Per-handler assertions (row counts, field equality, stats checks) remain in the KTX test files unchanged. This minimizes diff surface while achieving the lift goal.

## Tasks

### Task 1: Create `extractor_lib/tests/parallel_serial_helpers.py` and update `__init__.py`

**Goal:** Author the reusable subprocess-run helper that KTX and MVDSV tests will import.

**Files:**
- `apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py` (create)
- `apps/qw-oracle/scripts/extractors/extractor_lib/tests/__init__.py` (modify: add export)

**Steps:**

- [ ] Read the `run_with_workers` inner function from both `test_handler_gameplay_taxonomies.py` and `test_handler_modes.py` in `ktx/tests/` to understand the exact subprocess invocation shape.

- [ ] Create `apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py` with the following full content:

```python
"""Shared helpers for parallel-vs-serial equivalence tests.

Provides assert_parallel_serial_equivalent(), the reusable subprocess runner
that every project's handler test imports.  Per-handler assertion logic
(row counts, field equality, stats invariants) lives in the per-handler test
files, not here.

Import shape:
    from extractor_lib.tests import assert_parallel_serial_equivalent
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest


def _run_extract_with_workers(
    *,
    extract_py: Path,
    repo_root: Path,
    handler_name: str,
    output_filename: str,
    tmp_path: Path,
    n_workers: int,
) -> dict:
    """Run extract.py with n_workers and return the parsed output dict.

    Calls pytest.fail if the subprocess exits non-zero or the output
    file is not produced.
    """
    out_dir = tmp_path / f"workers_{n_workers}"
    out_dir.mkdir(parents=True, exist_ok=True)
    import subprocess
    result = subprocess.run(
        [
            sys.executable,
            str(extract_py),
            "--repo-root", str(repo_root),
            "--output-dir", str(out_dir),
            "--handlers", handler_name,
            "--workers", str(n_workers),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        pytest.fail(
            f"extract.py exited {result.returncode} (workers={n_workers}):\n"
            f"stdout: {result.stdout[-2000:]}\n"
            f"stderr: {result.stderr[-2000:]}"
        )
    output_file = out_dir / output_filename
    if not output_file.is_file():
        pytest.fail(
            f"extract.py did not produce {output_filename} (workers={n_workers}). "
            f"stdout: {result.stdout[-1000:]}"
        )
    return json.loads(output_file.read_text(encoding="utf-8"))


def assert_parallel_serial_equivalent(
    *,
    extract_py: Path,
    repo_root: Path,
    handler_name: str,
    output_filename: str,
    tmp_path: Path,
    serial_workers: int = 1,
    parallel_workers: int = 4,
) -> tuple[dict, dict]:
    """Run extract.py twice and return (serial_output, parallel_output).

    Asserts both runs succeed (subprocess exit 0, output file present) and
    that both outputs have the same top-level keys.  Field-level equivalence
    assertions are the caller's responsibility.

    Args:
        extract_py: absolute path to the project's extract.py.
        repo_root: absolute path to the project's research repo root.
        handler_name: value for --handlers flag (e.g. "gameplay_taxonomies").
        output_filename: expected output filename (e.g. "ktx-gameplay-taxonomies-ast.json").
        tmp_path: pytest tmp_path fixture (caller passes it through).
        serial_workers: worker count for the serial run (default 1).
        parallel_workers: worker count for the parallel run (default 4).

    Returns:
        (serial_output, parallel_output) as parsed dicts.
    """
    serial_output = _run_extract_with_workers(
        extract_py=extract_py,
        repo_root=repo_root,
        handler_name=handler_name,
        output_filename=output_filename,
        tmp_path=tmp_path,
        n_workers=serial_workers,
    )
    parallel_output = _run_extract_with_workers(
        extract_py=extract_py,
        repo_root=repo_root,
        handler_name=handler_name,
        output_filename=output_filename,
        tmp_path=tmp_path,
        n_workers=parallel_workers,
    )
    assert set(serial_output.keys()) == set(parallel_output.keys()), (
        f"Top-level output keys differ between workers={serial_workers} and "
        f"workers={parallel_workers}: "
        f"serial={sorted(serial_output.keys())} "
        f"parallel={sorted(parallel_output.keys())}"
    )
    return serial_output, parallel_output
```

- [ ] Edit `apps/qw-oracle/scripts/extractors/extractor_lib/tests/__init__.py` to add the following line (after the existing content):

```python
from .parallel_serial_helpers import assert_parallel_serial_equivalent  # noqa: F401
```

**Verification:**
- `python3 -c "from extractor_lib.tests import assert_parallel_serial_equivalent; print('OK')"` run from `apps/qw-oracle/scripts/extractors/` exits 0 and prints `OK`.
- PASS condition: prints `OK`.
- FAIL condition: ImportError or ModuleNotFoundError.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis across 1 Python file; clear spec from KTX lift source; subprocess invocation shape is mechanical lift from existing test files.

---

### Task 2: Update KTX tests to import from lifted helper

**Goal:** Replace the inner `run_with_workers` closures in both KTX parallel-serial tests with calls to `assert_parallel_serial_equivalent`.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py` (modify)
- `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py` (modify)

**Steps:**

For `test_handler_gameplay_taxonomies.py`:

- [ ] Add to the top-of-file imports (after existing imports, before `if not KTX_REPO.exists():`):

```python
from extractor_lib.tests import assert_parallel_serial_equivalent  # noqa: E402
```

- [ ] Replace the body of `test_parallel_serial_equivalence(tmp_path)` in `test_handler_gameplay_taxonomies.py`. The current body has:
  1. An inner `def run_with_workers(n_workers: int) -> dict:` function (lines ~167-195)
  2. Calls `serial_output = run_with_workers(1)` and `parallel_output = run_with_workers(4)`
  3. Per-handler assertions (F7/F8 anchor invariants, D.3.1 regression gate)

  Replace steps 1-2 with:
  ```python
  serial_output, parallel_output = assert_parallel_serial_equivalent(
      extract_py=EXTRACT_PY,
      repo_root=KTX_REPO,
      handler_name="gameplay_taxonomies",
      output_filename="ktx-gameplay-taxonomies-ast.json",
      tmp_path=tmp_path,
  )
  ```
  Keep all assertion code (F7/F8 counts, source_total check, row-level equality) unchanged.

For `test_handler_modes.py`:

- [ ] Add to the top-of-file imports (after existing imports, before `if not KTX_REPO.exists():`):

```python
from extractor_lib.tests import assert_parallel_serial_equivalent  # noqa: E402
```

- [ ] Replace the body of `test_parallel_serial_equivalence(tmp_path)` in `test_handler_modes.py`. Same pattern: the inner `def run_with_workers(n_workers: int) -> dict:` closure (lines ~196-223) gets replaced with:
  ```python
  serial_output, parallel_output = assert_parallel_serial_equivalent(
      extract_py=EXTRACT_PY,
      repo_root=KTX_REPO,
      handler_name="modes",
      output_filename="ktx-modes-ast.json",
      tmp_path=tmp_path,
  )
  ```
  Keep the per-handler assertions (27 game_modes count for serial and parallel, mode_defaults count equality, sort-and-compare loop) unchanged.

**Verification:**
- `python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py --collect-only -q` collects `test_parallel_serial_equivalence`.
- `python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py --collect-only -q` collects `test_parallel_serial_equivalence`.
- PASS condition: both collect without ImportError.
- FAIL condition: `ModuleNotFoundError: No module named 'extractor_lib.tests'` or `ImportError` on `assert_parallel_serial_equivalent` -- means Task 1 is incomplete or `__init__.py` export is missing.

**Execution mode:** `subagent (Sonnet medium)` -- two-file edit requiring accurate read-before-edit; the inner `run_with_workers` closure spans ~28 lines and needs to be replaced precisely without disturbing surrounding assertion code.

---

### Task 3: Create MVDSV protocol parallel-serial test

**Goal:** Ship `mvdsv/tests/test_handler_protocol_parallel_serial.py` to certify that `ProtocolMvdsvHandler` produces invariant output regardless of worker count.

**Files:**
- `apps/qw-oracle/scripts/extractors/mvdsv/tests/__init__.py` (create, empty module marker)
- `apps/qw-oracle/scripts/extractors/mvdsv/tests/test_handler_protocol_parallel_serial.py` (create)

**Steps:**

- [ ] Create the directory `apps/qw-oracle/scripts/extractors/mvdsv/tests/` (it does not exist in the live codebase; must be created before writing files into it). Use `mkdir` or equivalent before any file write in this directory.

- [ ] Create `apps/qw-oracle/scripts/extractors/mvdsv/tests/__init__.py` as an empty file (module marker, no content needed).

- [ ] Create `apps/qw-oracle/scripts/extractors/mvdsv/tests/test_handler_protocol_parallel_serial.py` with the following full content:

```python
"""Parallel-vs-serial equivalence test for ProtocolMvdsvHandler.

Certifies that ProtocolMvdsvHandler (MACRO_DEFINITION walk) produces
identical output regardless of worker count.

Risk class: MACRO_DEFINITION walk. Each .c file that includes protocol.h
emits all protocol macros when its TU root is scanned. Workers process
disjoint file chunks. source_total = N_macros * N_c_files_with_protocol_h
must be invariant because the same total files are processed regardless of
worker split. finalize() cross-file dedup in the parent collapses duplicates.

Prerequisites:
  - libclang 18 must be installed and loadable as libclang-18.so.1.
  - Requires the MVDSV research repo at research/repos/mvdsv/ relative to
    the monorepo root.

Run from the monorepo root:
  python3 -m pytest apps/qw-oracle/scripts/extractors/mvdsv/tests/test_handler_protocol_parallel_serial.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
MVDSV_HANDLER_DIR = HERE.parent          # apps/qw-oracle/scripts/extractors/mvdsv/
EXTRACTORS_ROOT = MVDSV_HANDLER_DIR.parent  # apps/qw-oracle/scripts/extractors/

# parents[0] = mvdsv, parents[1] = extractors, parents[2] = scripts,
# parents[3] = qw-oracle, parents[4] = apps, parents[5] = quakeworld root
MVDSV_REPO = HERE.parents[5] / "research" / "repos" / "mvdsv"

EXTRACT_PY = MVDSV_HANDLER_DIR / "extract.py"

sys.path.insert(0, str(MVDSV_HANDLER_DIR))
sys.path.insert(0, str(EXTRACTORS_ROOT))

if not MVDSV_REPO.exists():
    pytest.skip(
        f"MVDSV repo not at {MVDSV_REPO}; clone it to run these tests.",
        allow_module_level=True,
    )

from extractor_lib.tests import assert_parallel_serial_equivalent  # noqa: E402


def test_parallel_serial_equivalence(tmp_path):
    """MACRO_DEFINITION walk: serial and parallel must produce identical output.

    Pre-condition: ProtocolMvdsvHandler.end_file() resets _seen_in_file per
    file (per-file dedup, not cross-worker).  finalize() deduplicates via
    the all_rows driver-passed parameter.  source_total = len(all_rows)
    before dedup, which equals N_macros_per_c_file * N_c_files_with_protocol_h
    regardless of how many workers split the file list.

    If this test fails (source_total differs), the most likely cause is a
    new per-worker cross-file dedup being introduced in visit_cursor or
    end_file without a matching finalize-time dedup on the driver-merged
    all_rows.
    """
    serial_output, parallel_output = assert_parallel_serial_equivalent(
        extract_py=EXTRACT_PY,
        repo_root=MVDSV_REPO,
        handler_name="protocol",
        output_filename="mvdsv-protocol-messages-ast.json",
        tmp_path=tmp_path,
    )

    # Protocol message count: finalize dedup produces the same unique set
    # regardless of worker count.
    assert len(serial_output["protocol_messages"]) == len(parallel_output["protocol_messages"]), (
        f"Protocol message count differs: workers=1 -> "
        f"{len(serial_output['protocol_messages'])}, "
        f"workers=4 -> {len(parallel_output['protocol_messages'])}. "
        "Finalize cross-file dedup must produce the same unique set."
    )

    # source_total: raw pre-dedup emissions. Must be worker-count-invariant.
    serial_total = serial_output["_stats"]["source_total"]
    parallel_total = parallel_output["_stats"]["source_total"]
    assert serial_total == parallel_total, (
        f"source_total differs: workers=1 -> {serial_total}, "
        f"workers=4 -> {parallel_total}. "
        "source_total = N_macros * N_c_files_with_protocol_h and must not "
        "depend on worker count."
    )
    assert serial_total > 0, (
        f"source_total must be positive (raw pre-dedup emissions). Got {serial_total}."
    )

    # Row-level equivalence: same protocol messages regardless of worker count.
    serial_msgs   = sorted(serial_output["protocol_messages"],   key=lambda r: r["name"])
    parallel_msgs = sorted(parallel_output["protocol_messages"], key=lambda r: r["name"])
    assert serial_msgs == parallel_msgs, (
        "Protocol message rows differ between serial and parallel runs. "
        "Inspect ast.kind and ast.value fields for per-worker vs finalize "
        "dedup divergence."
    )
```

**Verification:**
- `python3 -m pytest apps/qw-oracle/scripts/extractors/mvdsv/tests/ --collect-only -q` collects `test_parallel_serial_equivalence`.
- PASS condition: test is collected, no ImportError.
- FAIL condition: ImportError on `extractor_lib.tests` -- means Task 1 is incomplete.

**Execution mode:** `inline` -- full file content shipped above; single new test file; mechanical lift of KTX pattern with project-specific paths and MVDSV-specific field names (`protocol_messages`, `_stats.source_total`). All path values verified against live codebase during recon.

---

## Verification (phase boundary)

Run from the monorepo root (`/home/paradoks/projects/quakeworld`).

**V1. Helper import works:**
```
cd apps/qw-oracle/scripts/extractors && python3 -c "from extractor_lib.tests import assert_parallel_serial_equivalent; print('OK')"
```
PASS condition: prints `OK`.
FAIL condition: ImportError -- Task 1 incomplete (missing file or missing `__init__.py` export).

**V2. pytest collection -- all three test dirs discoverable:**
```
python3 -m pytest apps/qw-oracle/scripts/extractors/ --collect-only -q 2>&1 | grep -E 'test_parallel_serial_equivalence|error' | head -20
```
PASS condition: at least 3 lines matching `test_parallel_serial_equivalence` (one per handler), no collection errors.
FAIL condition: fewer than 3 matches, OR collection error on `extractor_lib.tests` import.

**V3. KTX taxonomy test collects and imports helper:**
```
python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py --collect-only -q
```
PASS condition: exits 0, `test_parallel_serial_equivalence` appears in output.
FAIL condition: ImportError or collection error.

**V4. KTX modes test collects and imports helper:**
```
python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py --collect-only -q
```
PASS condition: exits 0, `test_parallel_serial_equivalence` appears in output.
FAIL condition: ImportError or collection error.

**V5. MVDSV protocol test collects:**
```
python3 -m pytest apps/qw-oracle/scripts/extractors/mvdsv/tests/ --collect-only -q
```
PASS condition: exits 0, `test_parallel_serial_equivalence` appears in output.
FAIL condition: ImportError or collection error.

**V6. Full pytest discovery (no import errors, no cross-project collection failures):**
```
python3 -m pytest apps/qw-oracle/scripts/extractors/ --collect-only -q 2>&1 | tail -5
```
PASS condition: exits 0, summary line shows N tests collected (at least current count + 3 new MVDSV) and 0 errors.
FAIL condition: non-zero exit or "ERROR" lines in output.

**V7. Full suite passes (KTX + MVDSV repos available):**
```
python3 -m pytest apps/qw-oracle/scripts/extractors/ -v 2>&1 | tail -20
```
PASS condition: all parallel-serial tests PASS or SKIP (skip if research repo absent); no FAIL or ERROR.
FAIL condition: any test FAIL or ERROR (not SKIP).

**Per D6 (5-project catch-up audit):**
The audit for this phase is pytest-based rather than probe-based. Running `pytest apps/qw-oracle/scripts/extractors/` constitutes the 5-project catch-up. All 5 projects are either covered by a new or updated test (ktx: 2 updated, mvdsv: 1 new) or explicitly deferred with rationale in the Recon findings section above (ezquake: 0, fte: 0, qwcl: 0). Commit body captures the per-handler audit disposition.

## Outputs to next phase

- `extractor_lib/tests/parallel_serial_helpers.py` exists; `from extractor_lib.tests import assert_parallel_serial_equivalent` imports cleanly.
- KTX `test_handler_gameplay_taxonomies.py` and `test_handler_modes.py` updated to use lifted helper; per-handler assertions unchanged.
- MVDSV `tests/__init__.py` and `tests/test_handler_protocol_parallel_serial.py` exist.
- `pytest apps/qw-oracle/scripts/extractors/` runs without import error; all parallel-serial tests PASS or SKIP (SKIP only if research repo is absent, which is not a failure condition -- the gate is designed for developer environments where the repo is present).
- Phase 4 (migration probes, TS-based) may proceed independently. Phase 5 (authoring guide) may reference Phase 3's pytest pattern as Convention 2 in VALIDATION-GATES.md.

## Open questions / deferred items

**Q1: FTE `self._all_rows` dead attributes.**
- Question: FTE `_handler_macros.py`, `_handler_commands.py`, `_handler_cvars.py`, `_handler_ezhud.py` all initialize `self._all_rows: dict[str, dict] = {}` in `__init__` but finalize() uses the `all_rows` parameter, not `self._all_rows`. Is this a dead attribute or could a future refactor accidentally start using it cross-worker?
- Default chosen: Treat as dead attribute. No test added. The finalize-via-param pattern is correct; dead init attr is harmless.
- Who can resolve: Future code reviewer if a refactor touches these handlers. Phase 5's VALIDATION-GATES.md should document the finalize-via-param requirement so future authors don't accidentally break it.

**Q2: KTX `_handler_modes.py` F25 guard.**
- Question: The `test_parallel_serial_equivalence` in `test_handler_modes.py` is currently conditional (`@pytest.mark.skipif(_f25_guard_active(), ...)`) pending removal of the F25 serial guard in `extract.py`. Should Phase 3 also remove the F25 guard?
- Default chosen: No -- Phase 3 is paper-only test authoring. The F25 guard is a code change in `extract.py` that was explicitly deferred to "once the handler refactor is complete." Phase 3 does NOT remove the guard; it updates the import and leaves the skipif logic intact. If the guard was already removed before Phase 3 executes, the test will run actively rather than skip.
- Who can resolve: Operator, before Phase 3 execution. If the guard was removed by the time Phase 3 runs, no action needed. If not, the test remains conditional.

**Q3: QWCL -- no parallel-serial tests.**
- Question: QWCL has 3 handlers (cvars, commands, cmdline) all with safe patterns. Should QWCL get at least one test for coverage completeness?
- Default chosen: No tests for QWCL. Rationale: QWCL is the simplest project (1996-vintage, minimal handler complexity). The safe finalize-via-param pattern is confirmed. No structural risk. Phase 3's scope is "only handlers identified as parallel-aggregation-risky" (per D8). Adding tests for QWCL would be blanket coverage, which is explicitly out of scope.
- Who can resolve: Operator, if they want blanket coverage. Otherwise Phase 6's test-coverage-parity arc handles it.

n/a for any other open questions -- phase scope is fully resolved per the above.

## Recovery (if verification fails)

**V1 fails (ImportError on `assert_parallel_serial_equivalent`):**
- Most likely cause: `parallel_serial_helpers.py` not created, OR `__init__.py` export line missing.
- Fix: Verify `extractor_lib/tests/parallel_serial_helpers.py` exists; verify `__init__.py` contains `from .parallel_serial_helpers import assert_parallel_serial_equivalent`.

**V2 fails (fewer than 3 `test_parallel_serial_equivalence` collected):**
- Most likely cause: one of the KTX or MVDSV test files still has the old `run_with_workers` inner function without the new import; OR MVDSV `tests/__init__.py` is missing (making `mvdsv/tests/` an undiscoverable package).
- Fix: Check `mvdsv/tests/__init__.py` exists; re-read the modified KTX test files to confirm import lines were added.

**V2 fails (collection error on import):**
- Most likely cause: `extractor_lib/tests/__init__.py` is missing the export, or the `parallel_serial_helpers.py` has a syntax error.
- Fix: Run `python3 -c "import extractor_lib.tests.parallel_serial_helpers"` from `extractors/` to isolate.

**V7 fails (test FAIL, not SKIP):**
- Most likely cause for MVDSV protocol test: `source_total` differs between workers=1 and workers=4. This would be a newly discovered parallel-aggregation bug in the protocol handler (not an error in the test). Drain-now per D7: fix the handler's `end_file` / `visit_cursor` to not do cross-file per-worker dedup; or identify that `_seen_in_file` is NOT being reset per file.
- Most likely cause for KTX tests: import change broke something (unlikely since assertions are unchanged). Re-read the modified file; verify `assert_parallel_serial_equivalent` returns the same (serial_output, parallel_output) tuple the old `run_with_workers` calls produced.

---

## Findings resolved by this phase (per `review-findings.md`)

No F-entries exist at draft time (review-findings.md has none). If the MVDSV protocol test surfaces a new parallelism bug during execution, that bug becomes F1 and the fix rides this phase's commit per D7.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting, BEFORE handing back to operator)

Sub-agent dispatched after drafting. See findings section below.

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-3-parallel-serial-tests.md
Read decisions.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
Read review-findings.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
Read the relevant section of the brainstorm parking doc:
  /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
  (relevant Pass section: 1.2.3 + 2.3)

Then verify, file-by-file:

1. Every CI-readiness convention from D2 (exit codes, --project flag,
   --all, --json, --help, env-var driven DB, no CWD assumptions,
   deterministic output) -- verify the phase MD's gate authoring covers
   each. Flag CRITICAL on any missing convention for a TS-probe phase.
   NOTE: Phase 3 is a pytest phase (D4 carve-out), NOT a TS-probe phase.
   D2 conventions apply to TS gates only; pytest has its own dispatch
   convention (D4 + Pass 1.2.3). Flag only if the pytest pattern deviates
   from what D4 specifies for this phase.

2. Every per-project config dict entry the phase ships -- verify the
   shape matches Pass 1.2.3 (per-gate dict; not unified registry; one
   entry per project: ezquake / FTE / QWCL / MVDSV / KTX).
   Flag SUBSTANTIVE on shape drift or missing project entries.
   NOTE: Phase 3's "config" is the per-handler test entrypoint list, not
   a TS config dict. The D3 spirit for Phase 3 means each handler test
   carries its own extract_py / repo_root / handler_name / output_filename.
   Flag if this per-handler shape is inconsistent.

3. Every dispatcher case added to scripts/load-knowledge/index.ts --
   verify the case follows the F1 quality-grid mirror pattern (D4).
   NOTE: Phase 3 adds NO dispatcher case (pytest is its own dispatcher).
   Flag SUBSTANTIVE only if the phase MD incorrectly claims to add an
   index.ts case.

4. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF
     is expected NOT to exist yet -- this is a paper plan, not
     executed code. Do NOT flag a Created file's non-existence.

5. Every JSONB column write -- Phase 3 has no DB writes. Flag only if
   the phase MD incorrectly introduces DB interaction.

6. Every reference to a finding (F-numbers) -- none at draft time; flag
   if the phase MD references F-numbers that don't exist in review-findings.md.

7. Every shell command -- does it use `python3` for pytest invocations
   (acceptable per D2's carve-out for Python extractors)?
   `bun` is for TS scripts; `python3` is correct for pytest + extractors.

8. Every per-project audit step -- confirm phase MD's verification
   section includes coverage disposition for all 5 projects (ezquake /
   FTE / QWCL / MVDSV / KTX) per D6; confirm audit is pytest-based
   (not `bun run load-knowledge -- parallel-serial`).

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.

10. Every per-task "Execution mode" declaration -- confirm rationale
    matches D15 (subagent for code-synthesis; inline for mechanical lift
    with full content shipped). For Phase 3: Task 1 and Task 2 are code-
    synthesis/multi-file-edit -> subagent correct; Task 3 ships full file
    inline -> inline correct.

11. Every reference to existing infrastructure (extractor_lib/tests/,
    ktx/tests/ test files, mvdsv/extract.py paths, EXTRACT_PY paths,
    output_filename values, handler names for --handlers flag) -- verify
    the path/name exists and matches the live codebase.

12. n/a for Phase 5/6 SKILL.md checks.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

---

## Sub-agent findings (applied before operator review)

Sub-agent run: Explore / Sonnet medium. 1 CRITICAL, 1 SUBSTANTIVE, 7 ADVISORY.

**CRITICAL:**
- C1: `mvdsv/tests/` directory does not exist in live codebase; executor writing `__init__.py` there would fail. Applied: Task 3 now has an explicit `mkdir` step before any file creation in `mvdsv/tests/`.

**SUBSTANTIVE:**
- S1: F7, F8, F25, D.3.1 references in the Recon findings table were not qualified with their source arc (KTX onboarding arc `review-findings.md`). Applied: table now qualifies each finding with "(KTX onboarding arc `review-findings.md`)".

**ADVISORY (all confirmed correct, no action needed):**
- A1: `parents[5]` from `mvdsv/tests/` resolves correctly to monorepo root.
- A2: `handler_name="protocol"` and `output_filename="mvdsv-protocol-messages-ast.json"` verified correct.
- A3: `protocol_messages` and `_stats.source_total` output keys confirmed present.
- A4: Execution mode rationale matches D15.
- A5: No unexpected bun/tsx commands in pytest sections.
- A6: D3 per-handler config shape consistent.
- A7: No DB interaction introduced.

---

## Post-execution amendments (2026-05-08)

Phase 3 executor halted DONE_WITH_CONCERNS at commit `8f561cba`. Phase 3 deliverables shipped correctly (lifted helper at `extractor_lib/tests/parallel_serial_helpers.py` + export line in `__init__.py`; both KTX tests updated to import the lifted helper; new MVDSV protocol parallel-serial test). V1-V5 PASS, V7 PASS for Phase 3 deliverables; V6 strictly FAILed due to a pre-existing pytest sys.path pollution issue (logged as F1 with HANDOVER track). One V6 strictness amendment + an F1 ledger pointer; documented here for the audit trail.

### V6 strictness amendment

V6's strict PASS condition ("exits 0; summary line shows N tests collected and 0 errors") fails because full-suite `pytest apps/qw-oracle/scripts/extractors/ --collect-only -q` surfaces 3 pre-existing collection errors:

- `fte/tests/test_fte_asset_paths.py` -- `ImportError` resolving `_handler_asset_loader_sites` to ezquake's file (sys.path order pollution when ezquake/fte test dirs both discover in the same session).
- `qw/tests/test_bsp_parser.py` -- `ModuleNotFoundError: No module named 'tests.test_bsp_parser'` (multiple `tests/` packages in extractors tree cause pytest namespace conflict).
- `qw/tests/test_pak_extract.py` -- same root cause as `bsp_parser`.

All 15 affected tests collect and pass when run in isolation. Phase 3 added one new `tests/` package (`mvdsv/tests/`) but the underlying root cause (multiple `tests/` package namespaces in one pytest session) pre-existed Phase 3 -- `extractor_lib/tests/__init__.py` already created the namespace conflict before Phase 3.

**Amended PASS condition until F1 lands:** V6 is acceptable with up to 3 pre-existing collection errors (the three above), provided V7 with `--continue-on-collection-errors` confirms all parallel-serial tests PASS. Verify the 3 errors match F1's diagnosis (sys.path / namespace conflict) and not a Phase 3 regression. Once F1 ships, V6 reverts to its original strict shape.

### F1 HANDOVER pointer

Phase 3's V6 finding is recorded as F1 in `review-findings.md` (Severity Low; Track HANDOVER) and as a one-liner in `HANDOVER.md` "Small followups" ("Per-project conftest.py for extractor pytest"). Phase 5 / 6 / 7 do not add new test files to the extractors tree, so deferral is safe through arc close. Fix is needed before the next test-authoring effort touches the extractors tree.

---
