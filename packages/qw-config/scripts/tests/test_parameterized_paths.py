#!/usr/bin/env python3
"""Fixture-driven verification for Path 1 parameterized-path extraction.

Run directly: python3 packages/qw-config/scripts/tests/test_parameterized_paths.py
Exit 0 = all pass. Exit 1 = first failure printed.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPTS_DIR = HERE.parent
sys.path.insert(0, str(SCRIPTS_DIR))

FIXTURE_DIR = HERE / "fixtures" / "param_paths"

import runpy

_EXTRACTOR_SCRIPT = SCRIPTS_DIR / "extract-ezquake-asset-loader-sites-clang.py"

_cached_ns = None


def _load_extractor_ns():
    # libclang's Config.set_library_file can only be called once per process,
    # so we memoize the namespace across multiple test calls.
    global _cached_ns
    if _cached_ns is None:
        _cached_ns = runpy.run_path(str(_EXTRACTOR_SCRIPT), run_name="not_main")
    return _cached_ns


def _extract_sites(c_path: Path):
    ns = _load_extractor_ns()
    return ns["extract_from_file"](c_path, [])


def test_va_basic_emits_template_and_parameters():
    sites = _extract_sites(FIXTURE_DIR / "01_va_basic.c")
    loaders = [s for s in sites if s.function_name == "FS_LoadFile"]
    assert len(loaders) == 1, f"expected 1 FS_LoadFile site, got {len(loaders)}"
    s = loaders[0]
    assert s.path_template == "maps/%s.lit", f"path_template={s.path_template!r}"
    assert s.path_extension == ".lit", f"path_extension={s.path_extension!r}"
    assert s.format_function == "va", f"format_function={s.format_function!r}"
    assert s.path_parameters == [
        {"slot": 0, "expression_snippet": "cl.worldmodel->name", "semantic": "current_map_name"}
    ], f"path_parameters={s.path_parameters!r}"


def test_sprintf_writes_buffer_then_loader_reads_it():
    sites = _extract_sites(FIXTURE_DIR / "02_sprintf.c")
    loaders = [s for s in sites if s.function_name == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s.path_template == "env/%s_ft.tga"
    assert s.path_extension == ".tga"
    assert s.format_function == "sprintf"
    assert s.path_parameters and s.path_parameters[0]["slot"] == 0


def test_snprintf_writes_buffer_then_loader_reads_it():
    sites = _extract_sites(FIXTURE_DIR / "03_snprintf.c")
    loaders = [s for s in sites if s.function_name == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s.path_template == "locs/%s.loc"
    assert s.path_extension == ".loc"
    assert s.format_function == "snprintf"


def test_q_snprintfz_writes_buffer_then_loader_reads_it():
    sites = _extract_sites(FIXTURE_DIR / "04_q_snprintfz.c")
    loaders = [s for s in sites if s.function_name == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s.path_template == "progs/%s.dat"
    assert s.path_extension == ".dat"
    assert s.format_function == "Q_snprintfz"


if __name__ == "__main__":
    tests = [fn for name, fn in globals().items() if name.startswith("test_")]
    failed = 0
    for fn in tests:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except AssertionError as e:
            print(f"FAIL {fn.__name__}: {e}")
            failed += 1
    sys.exit(0 if failed == 0 else 1)
