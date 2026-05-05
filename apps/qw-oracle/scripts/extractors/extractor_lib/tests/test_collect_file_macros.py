"""Tests for collect_file_macros (Pattern 6, depth-1 #include closure).

Prerequisites:
  - libclang 18 must be installed and loadable as libclang-18.so.1.
  - Tests 1 and 3 additionally require the KTX research repo at
    research/repos/ktx/ relative to the monorepo root.

Run from the extractors directory:
  python3 -m pytest extractor_lib/tests/test_collect_file_macros.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
EXTRACTORS_DIR = HERE.parent.parent  # apps/qw-oracle/scripts/extractors/
MONOREPO_ROOT = EXTRACTORS_DIR.parent.parent.parent.parent  # projects/quakeworld/

sys.path.insert(0, str(EXTRACTORS_DIR))

# Configure libclang before importing clang.cindex.
from extractor_lib.clang_config import PARSE_OPTS  # noqa: E402

from clang.cindex import Index  # noqa: E402
from extractor_lib._source import collect_file_macros  # noqa: E402

KTX_SRC_DIR = MONOREPO_ROOT / "research" / "repos" / "ktx" / "src"
KTX_INCLUDE_DIR = MONOREPO_ROOT / "research" / "repos" / "ktx" / "include"
KTX_COMMANDS_C = KTX_SRC_DIR / "commands.c"


def _ktx_available() -> bool:
    return KTX_COMMANDS_C.exists()


def _parse(path: Path, extra_args: list[str] | None = None) -> object:
    """Parse a C file with libclang and return the TU."""
    index = Index.create()
    args = ["-x", "c", "-w"] + (extra_args or [])
    return index.parse(str(path), args=args, options=PARSE_OPTS)


# ---------------------------------------------------------------------------
# Test 1: resolves cross-header string macros from depth-1 includes
# ---------------------------------------------------------------------------

def test_resolves_ktx_cross_header_macros():
    """LGCMODE_VARIABLE and TOT_MODE_VARIABLE are defined in g_local.h,
    which commands.c directly #includes. They should resolve."""
    if not _ktx_available():
        pytest.skip("KTX research repo not found at expected path")

    tu = _parse(KTX_COMMANDS_C, extra_args=[f"-I{KTX_INCLUDE_DIR}"])
    result = collect_file_macros(tu, str(KTX_COMMANDS_C))

    # Defined in include/g_local.h (depth-1 via #include "g_local.h")
    assert "LGCMODE_VARIABLE" in result, (
        f"LGCMODE_VARIABLE not found; got keys sample: {list(result.keys())[:10]}"
    )
    assert result["LGCMODE_VARIABLE"] == "k_lgcmode", (
        f"Expected 'k_lgcmode', got {result['LGCMODE_VARIABLE']!r}"
    )

    assert "TOT_MODE_VARIABLE" in result, "TOT_MODE_VARIABLE not found"
    assert result["TOT_MODE_VARIABLE"] == "k_tot_mode", (
        f"Expected 'k_tot_mode', got {result['TOT_MODE_VARIABLE']!r}"
    )

    # Same-file macro: commands.c itself defines CD_VOTEMAP "alternative map vote system"
    assert "CD_VOTEMAP" in result, (
        "CD_VOTEMAP (same-file macro) not found in result"
    )
    assert result["CD_VOTEMAP"] == "alternative map vote system"


# ---------------------------------------------------------------------------
# Test 2: excludes transitive (depth-2) macros
# ---------------------------------------------------------------------------

def test_excludes_transitive_includes():
    """DEPTH1_MACRO (defined in depth1.h, directly included by main.c) must
    appear. DEPTH2_MACRO (defined in depth2.h, included only by depth1.h)
    must NOT appear -- it's depth-2 from main.c's perspective."""
    fixtures = HERE / "fixtures" / "transitive"
    main_c = fixtures / "main.c"

    tu = _parse(main_c, extra_args=[f"-I{fixtures}"])
    result = collect_file_macros(tu, str(main_c))

    assert "DEPTH1_MACRO" in result, (
        f"DEPTH1_MACRO (depth-1) should be in result; got: {result}"
    )
    assert result["DEPTH1_MACRO"] == "depth1_val"

    assert "DEPTH2_MACRO" not in result, (
        f"DEPTH2_MACRO (depth-2) must be excluded; got: {result}"
    )


# ---------------------------------------------------------------------------
# Test 3: excludes non-string macros (integer constants, function-like)
# ---------------------------------------------------------------------------

def test_excludes_non_string_macros():
    """Result must only contain string-literal macros. Integer constants and
    function-like macros must not appear."""
    if not _ktx_available():
        pytest.skip("KTX research repo not found at expected path")

    tu = _parse(KTX_COMMANDS_C, extra_args=[f"-I{KTX_INCLUDE_DIR}"])
    result = collect_file_macros(tu, str(KTX_COMMANDS_C))

    # Every value must be a string without surrounding double-quote characters
    # (the function strips outer quotes). If quotes remain, something is wrong.
    for name, value in result.items():
        assert not (value.startswith('"') and value.endswith('"')), (
            f"Macro {name!r} still has surrounding quotes: {value!r}"
        )

    # Concrete negative: MAX_CLIENTS is an integer constant -- must not appear.
    assert "MAX_CLIENTS" not in result, (
        "MAX_CLIENTS (integer constant) must not appear in string-macro result"
    )

    # There must be at least some macros found (sanity check).
    assert len(result) > 0, "Expected at least one string-literal macro"


# ---------------------------------------------------------------------------
# Test 4: first-seen-wins on duplicate macro name
# ---------------------------------------------------------------------------

def test_first_seen_wins_on_duplicate():
    """When two depth-1 headers define the same macro name, the definition
    from the first-included header wins."""
    fixtures = HERE / "fixtures" / "duplicate_macros"
    main_c = fixtures / "main.c"

    # main.c includes hdr_a.h then hdr_b.h; both define DUPLICATE_MACRO.
    tu = _parse(main_c, extra_args=[f"-I{fixtures}"])
    result = collect_file_macros(tu, str(main_c))

    assert "DUPLICATE_MACRO" in result, (
        f"DUPLICATE_MACRO not found; got: {result}"
    )
    assert result["DUPLICATE_MACRO"] == "first_value", (
        f"Expected first-seen 'first_value', got {result['DUPLICATE_MACRO']!r}"
    )
