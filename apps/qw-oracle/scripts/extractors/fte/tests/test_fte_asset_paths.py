#!/usr/bin/env python3
"""Path-1 / classification fixtures for the FTE asset-loader-sites handler.

Mirrors apps/qw-oracle/scripts/extractors/ezquake/tests/test_parameterized_paths.py
adapted to the FTE handler at fte/_handler_asset_loader_sites.py and FTE-specific
loader functions (R_RegisterShader, FS_OpenVFS, COM_LoadFile).

Each fixture is a tiny self-contained .c file under tests/fixtures/fte_paths/.
Run directly: python3 apps/qw-oracle/scripts/extractors/fte/tests/test_fte_asset_paths.py
Exit 0 = all pass. Exit 1 = first failure printed.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
EXTRACTORS_DIR = HERE.parent.parent           # apps/qw-oracle/scripts/extractors/
FTE_DIR = HERE.parent                          # apps/qw-oracle/scripts/extractors/fte/

sys.path.insert(0, str(EXTRACTORS_DIR))
sys.path.insert(0, str(FTE_DIR))

FIXTURE_DIR = HERE / "fixtures" / "fte_paths"

from clang.cindex import Config, Index, TranslationUnit  # noqa: E402

Config.set_library_file("libclang-18.so.1")

from extractor_lib._visitor import walk_tu_dispatch  # noqa: E402
from _handler_asset_loader_sites import AssetLoaderSitesHandler  # noqa: E402

# Plain C-frontend invocation is enough -- fixtures are self-contained and
# don't pull in FTE engine headers.
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

    source_bytes = c_path.read_bytes()
    target_path_str = str(c_path.resolve())

    handler.start_file(source_path=c_path, source_bytes=source_bytes)
    walk_tu_dispatch(tu_client, [handler], "client", target_path_str, source_root="engine")
    rows = handler.end_file()

    dedup: dict = {}
    for s in rows:
        key = (s["function_name"], s["source_file"], s["source_line"], s["source_column"])
        if key not in dedup:
            dedup[key] = s
    return list(dedup.values())


def test_register_shader_va_emits_template_and_parameters():
    sites = _extract_sites(FIXTURE_DIR / "01_register_shader_va" / "main.c")
    loaders = [s for s in sites if s["function_name"] == "R_RegisterShader"]
    assert len(loaders) == 1, f"expected 1 R_RegisterShader site, got {len(loaders)}"
    s = loaders[0]
    assert s["path_template"] == "textures/%s/baseshader", f"path_template={s['path_template']!r}"
    assert s["format_function"] == "va", f"format_function={s['format_function']!r}"
    assert s["path_parameters"] is not None and len(s["path_parameters"]) == 1
    assert s["path_parameters"][0]["slot"] == 0


def test_fs_openvfs_buffer_recovers_template():
    sites = _extract_sites(FIXTURE_DIR / "02_fs_openvfs_buffer" / "main.c")
    loaders = [s for s in sites if s["function_name"] == "FS_OpenVFS"]
    assert len(loaders) == 1, f"expected 1 FS_OpenVFS site, got {len(loaders)}"
    s = loaders[0]
    assert s["path_template"] == "users/%s/config.cfg", f"path_template={s['path_template']!r}"
    assert s["path_extension"] == ".cfg", f"path_extension={s['path_extension']!r}"
    assert s["format_function"] == "Q_snprintfz", f"format_function={s['format_function']!r}"


def test_com_loadfile_literal_classifies_path_source():
    sites = _extract_sites(FIXTURE_DIR / "03_com_loadfile_literal" / "main.c")
    loaders = [s for s in sites if s["function_name"] == "COM_LoadFile"]
    assert len(loaders) == 1, f"expected 1 COM_LoadFile site, got {len(loaders)}"
    s = loaders[0]
    assert s["path_source"] == "literal", f"path_source={s['path_source']!r}"
    assert s["path_literal"] == "gfx/charset.png", f"path_literal={s['path_literal']!r}"


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
