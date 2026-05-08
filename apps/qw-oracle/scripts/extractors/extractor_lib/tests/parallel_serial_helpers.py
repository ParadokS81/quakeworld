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
