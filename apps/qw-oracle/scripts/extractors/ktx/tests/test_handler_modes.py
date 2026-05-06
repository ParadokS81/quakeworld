"""Phase 3 sanity test: verifies KtxModesHandler produces F5/F6 anchors.

Prerequisites:
  - libclang 18 must be installed and loadable as libclang-18.so.1.
  - All tests require the KTX research repo at research/repos/ktx/
    relative to the monorepo root.

Run from the monorepo root:
  python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_modes.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
KTX_HANDLER_DIR = HERE.parent          # apps/qw-oracle/scripts/extractors/ktx/
EXTRACTORS_ROOT = KTX_HANDLER_DIR.parent  # apps/qw-oracle/scripts/extractors/

# parents[0] = ktx, parents[1] = extractors, parents[2] = scripts,
# parents[3] = qw-oracle, parents[4] = apps, parents[5] = quakeworld root
KTX_REPO = HERE.parents[5] / "research" / "repos" / "ktx"

sys.path.insert(0, str(KTX_HANDLER_DIR))
sys.path.insert(0, str(EXTRACTORS_ROOT))

if not KTX_REPO.exists():
    pytest.skip(
        f"KTX repo not at {KTX_REPO}; clone it to run these tests.",
        allow_module_level=True,
    )

from clang.cindex import Config, Index  # noqa: E402
Config.set_library_file("libclang-18.so.1")

from extractor_lib.clang_config import PARSE_OPTS, clang_args_ktx_for  # noqa: E402
from extractor_lib._visitor import walk_tu_dispatch  # noqa: E402
from _handler_modes import KtxModesHandler  # noqa: E402


@pytest.fixture(scope="module")
def handler_with_outputs():
    handler = KtxModesHandler()
    handler.setup(ktx_repo=KTX_REPO, ktx_src=KTX_REPO / "src")

    idx = Index.create()
    args = clang_args_ktx_for(str(KTX_REPO / "src"))

    for filename in ["commands.c", "world.c", "race.c"]:
        target_path = KTX_REPO / "src" / filename
        tu = idx.parse(str(target_path), args=args, options=PARSE_OPTS)
        source_bytes = target_path.read_bytes()
        handler.start_file(source_path=target_path, source_bytes=source_bytes)
        walk_tu_dispatch(tu, [handler], "server", str(target_path), source_root="server")
        handler.end_file()

    result = handler.finalize(all_rows=[], repo_root=KTX_REPO)
    return handler, result


def test_catalog_count_27(handler_with_outputs):
    _, result = handler_with_outputs
    assert len(result["game_modes"]) == 27, (
        f"Expected 27 catalog rows (F5); got {len(result['game_modes'])}"
    )


def test_mode_default_count_in_band(handler_with_outputs):
    _, result = handler_with_outputs
    n = len(result["mode_defaults"])
    assert 280 <= n <= 360, f"Expected ~309 (F6); got {n}"


def test_cross_header_macros_resolved(handler_with_outputs):
    _, result = handler_with_outputs
    # Phase 1's Pattern 6 lift must resolve LGCMODE_VARIABLE and
    # TOT_MODE_VARIABLE; nothing in unresolved_macro_lines should name
    # either identifier.
    unresolved = [
        u for u in result["_stats"]["unresolved_macro_lines"]
        if u.get("identifier") in ("LGCMODE_VARIABLE", "TOT_MODE_VARIABLE")
    ]
    assert unresolved == [], (
        f"Phase 1's Pattern 6 lift should resolve LGCMODE_VARIABLE and TOT_MODE_VARIABLE "
        f"in commands.c via depth-1 #include of g_local.h. Unresolved: {unresolved}"
    )

    # Stronger check: the resolved-and-emitted rows must carry the
    # macro-resolved cvar name (NOT the macro identifier itself, NOT a
    # whitespace-collapsed glyph like "k_lgcmode0"). value_text must be
    # the literal "0" from the common_um_init source line.
    common_lgcmode = [
        r for r in result["mode_defaults"]
        if r["name"] == "k_lgcmode"
        and r["ruleset_gate_json"].get("mode") == "common"
    ]
    assert len(common_lgcmode) == 1, (
        f"Expected exactly one mode_default row (name='k_lgcmode', mode='common'); "
        f"got {len(common_lgcmode)}. Names like 'k_lgcmode0' indicate the "
        f"macro+literal concat path is collapsing the field separator."
    )
    assert common_lgcmode[0]["value_text"] == "0", (
        f"common_um_init's LGCMODE_VARIABLE line is `LGCMODE_VARIABLE \" 0\\n\"` -- "
        f"resolved value must be '0'. Got: {common_lgcmode[0]['value_text']!r}"
    )

    common_totmode = [
        r for r in result["mode_defaults"]
        if r["name"] == "k_tot_mode"
        and r["ruleset_gate_json"].get("mode") == "common"
    ]
    assert len(common_totmode) == 1, (
        f"Expected exactly one mode_default row (name='k_tot_mode', mode='common'); "
        f"got {len(common_totmode)}."
    )
    assert common_totmode[0]["value_text"] == "0", (
        f"common_um_init's TOT_MODE_VARIABLE line is `TOT_MODE_VARIABLE \" 0\\n\"` -- "
        f"resolved value must be '0'. Got: {common_totmode[0]['value_text']!r}"
    )


def test_ca_team_structure(handler_with_outputs):
    _, result = handler_with_outputs
    ca = next((r for r in result["game_modes"] if r["name"] == "ca"), None)
    assert ca is not None, "catalog row for 'ca' missing"
    assert ca["props_json"]["team_structure"] == "UM_4ON4", (
        f"D9 source-fidelity: ca shares UM_4ON4 with 4on4/wipeout. Got: {ca['props_json']['team_structure']}"
    )


def test_berzerk_activation_cvar_is_k_bzk(handler_with_outputs):
    _, result = handler_with_outputs
    bz = next((r for r in result["game_modes"] if r["name"] == "berzerk"), None)
    assert bz is not None, "mutator row for 'berzerk' missing"
    assert bz["props_json"]["activation_cvar"] == "k_bzk", (
        f"F5 fact: k_bzk is the enable cvar; k_berzerk is runtime state. Got: {bz['props_json']['activation_cvar']}"
    )


def test_4on4_overlay_has_teamplay(handler_with_outputs):
    _, result = handler_with_outputs
    hit = [r for r in result["mode_defaults"]
           if r["name"] == "teamplay"
           and r["ruleset_gate_json"].get("mode") == "4on4"]
    assert len(hit) >= 1, (
        f"Expected at least one mode_default for (name='teamplay', mode='4on4'). "
        f"Got: {hit}. (Inspect _4on4_um_init at commands.c:4346 if absent.)"
    )
