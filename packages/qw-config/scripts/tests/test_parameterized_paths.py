#!/usr/bin/env python3
"""Fixture-driven verification for Path 1 parameterized-path extraction.

Drives the Visitor-based asset-loader-sites handler through the same
shared-walk dispatcher the unified extractor uses in production. Each test
feeds one synthetic .c fixture and checks template/parameter/extension
recovery.

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

from clang.cindex import Config, Index, TranslationUnit  # noqa: E402

Config.set_library_file("libclang-18.so.1")

from extractor_lib._visitor import walk_tu_dispatch  # noqa: E402
from extractor_lib.handler_asset_loader_sites import AssetLoaderSitesHandler  # noqa: E402

# Minimal args sufficient for the synthetic fixtures. Fixtures don't exercise
# the full ezQuake define set; a plain C-frontend invocation is enough.
_CLANG_ARGS = ["-x", "c", "-w"]
_PARSE_OPTS = (
    TranslationUnit.PARSE_DETAILED_PROCESSING_RECORD
    | TranslationUnit.PARSE_INCOMPLETE
)


def _extract_sites(c_path: Path) -> list[dict]:
    handler = AssetLoaderSitesHandler()
    # No setup() so cvar_ident_map stays empty -- fixtures don't rely on it.

    idx = Index.create()
    tu_client = idx.parse(str(c_path), args=_CLANG_ARGS, options=_PARSE_OPTS)
    tu_server = idx.parse(str(c_path), args=_CLANG_ARGS, options=_PARSE_OPTS)

    source_bytes = c_path.read_bytes()
    target_path_str = str(c_path.resolve())

    handler.start_file(source_path=c_path, source_bytes=source_bytes)
    walk_tu_dispatch(tu_client, [handler], "client", target_path_str)
    walk_tu_dispatch(tu_server, [handler], "server", target_path_str)
    rows = handler.end_file()

    # Dedup by (fn, file, line, col) to mirror the finalize() dedup stage --
    # the shared walk sees each site on both client + server variants.
    dedup: dict = {}
    for s in rows:
        key = (s["function_name"], s["source_file"], s["source_line"], s["source_column"])
        if key not in dedup:
            dedup[key] = s
    return list(dedup.values())


def test_va_basic_emits_template_and_parameters():
    sites = _extract_sites(FIXTURE_DIR / "01_va_basic.c")
    loaders = [s for s in sites if s["function_name"] == "FS_LoadFile"]
    assert len(loaders) == 1, f"expected 1 FS_LoadFile site, got {len(loaders)}"
    s = loaders[0]
    assert s["path_template"] == "maps/%s.lit", f"path_template={s['path_template']!r}"
    assert s["path_extension"] == ".lit", f"path_extension={s['path_extension']!r}"
    assert s["format_function"] == "va", f"format_function={s['format_function']!r}"
    assert s["path_parameters"] == [
        {"slot": 0, "expression_snippet": "cl.worldmodel->name", "semantic": "current_map_name"}
    ], f"path_parameters={s['path_parameters']!r}"


def test_sprintf_writes_buffer_then_loader_reads_it():
    sites = _extract_sites(FIXTURE_DIR / "02_sprintf.c")
    loaders = [s for s in sites if s["function_name"] == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s["path_template"] == "env/%s_ft.tga"
    assert s["path_extension"] == ".tga"
    assert s["format_function"] == "sprintf"
    assert s["path_parameters"] and s["path_parameters"][0]["slot"] == 0


def test_snprintf_writes_buffer_then_loader_reads_it():
    sites = _extract_sites(FIXTURE_DIR / "03_snprintf.c")
    loaders = [s for s in sites if s["function_name"] == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s["path_template"] == "locs/%s.loc"
    assert s["path_extension"] == ".loc"
    assert s["format_function"] == "snprintf"


def test_q_snprintfz_writes_buffer_then_loader_reads_it():
    sites = _extract_sites(FIXTURE_DIR / "04_q_snprintfz.c")
    loaders = [s for s in sites if s["function_name"] == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s["path_template"] == "progs/%s.dat"
    assert s["path_extension"] == ".dat"
    assert s["format_function"] == "Q_snprintfz"


def test_cvar_value_semantic_detected():
    sites = _extract_sites(FIXTURE_DIR / "05_cvar_value.c")
    loaders = [s for s in sites if s["function_name"] == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s["path_parameters"] == [
        {"slot": 0, "expression_snippet": "baseskin.string", "semantic": "cvar_value:baseskin"},
    ]


def test_multi_slot_templates_report_each_slot():
    sites = _extract_sites(FIXTURE_DIR / "06_multi_slot.c")
    loaders = [s for s in sites if s["function_name"] == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s["path_template"] == "env/%s_%s.tga"
    assert len(s["path_parameters"]) == 2
    assert s["path_parameters"][0]["semantic"] == "current_map_name"
    assert s["path_parameters"][1]["semantic"] in ("function_parameter", "local_variable", "unknown")


def test_pointer_deref_assignment_recovers_template():
    sites = _extract_sites(FIXTURE_DIR / "07_pointer_deref_assignment.c")
    loaders = [s for s in sites if s["function_name"] == "FS_LoadHunkFile"]
    assert len(loaders) == 1, f"expected 1 FS_LoadHunkFile site, got {len(loaders)}"
    s = loaders[0]
    assert s["path_template"] == "maps/%s.lit", f"path_template={s['path_template']!r}"
    assert s["path_extension"] == ".lit", f"path_extension={s['path_extension']!r}"
    assert s["format_function"] == "va", f"format_function={s['format_function']!r}"


def test_multiple_deref_assignments_pick_nearest_prior():
    # Two *litfilename = va(...) writes precede the loader call. Classifier
    # must select the NEAREST prior ("maps/%s.lit"), not the first one
    # ("lits/%s.lit"). Guards the strict-before + nearest semantics shared
    # with _lookup_buffer_write_in_compound.
    sites = _extract_sites(FIXTURE_DIR / "08_multiple_deref_assignments.c")
    loaders = [s for s in sites if s["function_name"] == "FS_LoadHunkFile"]
    assert len(loaders) == 1, f"expected 1 FS_LoadHunkFile site, got {len(loaders)}"
    s = loaders[0]
    assert s["path_template"] == "maps/%s.lit", f"path_template={s['path_template']!r}"
    assert s["format_function"] == "va"


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
