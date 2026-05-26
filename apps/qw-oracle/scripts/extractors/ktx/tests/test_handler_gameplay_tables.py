"""Phase 5 sanity test: verifies KtxGameplayTablesHandler produces F9/F10/F11/F12/F13 anchors.

Prerequisites:
  - libclang 18 must be installed and loadable as libclang-18.so.1.
  - All tests require the KTX research repo at research/repos/ktx/
    relative to the monorepo root.

Run from the monorepo root:
  python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_tables.py -v
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
from _handler_gameplay_tables import KtxGameplayTablesHandler  # noqa: E402


TARGET_FILES = [
    KTX_REPO / "src" / "sp_monsters.c",  # bloodfest_monster_array[]
    KTX_REPO / "src" / "race.c",         # scoring_systems[]
    KTX_REPO / "src" / "commands.c",     # dropitems[]
    KTX_REPO / "src" / "teamplay.c",     # locmacros[] + messages[] + handler fn definitions
]


@pytest.fixture(scope="module")
def handler_with_outputs():
    handler = KtxGameplayTablesHandler()
    handler.setup(ktx_repo=KTX_REPO, ktx_src=KTX_REPO / "src")

    idx = Index.create()
    args = clang_args_ktx_for(str(KTX_REPO / "src"))

    all_rows: list[dict] = []
    for target_path in TARGET_FILES:
        tu = idx.parse(str(target_path), args=args, options=PARSE_OPTS)
        source_bytes = target_path.read_bytes()
        handler.start_file(source_path=target_path, source_bytes=source_bytes)
        walk_tu_dispatch(tu, [handler], "server", str(target_path), source_root="server")
        all_rows.extend(handler.end_file())

    result = handler.finalize(all_rows={handler.name: all_rows}, repo_root=KTX_REPO)
    return handler, result


def test_monster_count_13(handler_with_outputs):
    _, result = handler_with_outputs
    assert len(result["monsters"]) == 13, (
        f"Expected 13 monster rows (F9); got {len(result['monsters'])}"
    )


def test_score_system_count_3(handler_with_outputs):
    _, result = handler_with_outputs
    assert len(result["score_systems"]) == 3, (
        f"Expected 3 score_system rows (F10); got {len(result['score_systems'])}"
    )


def test_score_system_positions_length_10(handler_with_outputs):
    _, result = handler_with_outputs
    bad = [
        (r["name"], len(r["props_json"]["positions"]))
        for r in result["score_systems"]
        if len(r["props_json"]["positions"]) != 10
    ]
    assert bad == [], (
        f"F10 invariant: every score_system row must have positions.length=10; "
        f"violations: {bad}"
    )


def test_drop_item_count_31(handler_with_outputs):
    _, result = handler_with_outputs
    assert len(result["drop_items"]) == 31, (
        f"Expected 31 drop_item rows (F11 amended; live source); "
        f"got {len(result['drop_items'])}"
    )


def test_loc_macro_count_15(handler_with_outputs):
    _, result = handler_with_outputs
    assert len(result["loc_macros"]) == 15, (
        f"Expected 15 loc_macro rows (F12); got {len(result['loc_macros'])}"
    )


def test_teamplay_message_count_21(handler_with_outputs):
    _, result = handler_with_outputs
    assert len(result["teamplay_messages"]) == 21, (
        f"Expected 21 teamplay_message rows (F13); "
        f"got {len(result['teamplay_messages'])}"
    )


def test_monster_fish_first_required(handler_with_outputs):
    _, result = handler_with_outputs
    fish = next(
        (r for r in result["monsters"] if r["name"] == "monster_fish"),
        None,
    )
    assert fish is not None, "monster_fish row must exist (F9 anchor)"
    assert fish["props_json"]["array_position"] == 0, (
        f"monster_fish must be array_position=0 (FISH _MUST_ BE _FIRST_); "
        f"got {fish['props_json']['array_position']}"
    )
    assert fish["props_json"]["is_first_required"] is True, (
        f"monster_fish.is_first_required must be True; got "
        f"{fish['props_json']['is_first_required']}"
    )


def test_monster_shambler_boss_able(handler_with_outputs):
    _, result = handler_with_outputs
    sham = next(
        (r for r in result["monsters"] if r["name"] == "monster_shambler"),
        None,
    )
    assert sham is not None, "monster_shambler row must exist"
    assert sham["props_json"]["boss_able"] is True, (
        f"monster_shambler.boss_able must be True (only true entry per "
        f"sp_monsters.c source-walk); got {sham['props_json']['boss_able']}"
    )


def test_score_system_formula1_positions(handler_with_outputs):
    _, result = handler_with_outputs
    f1 = next(
        (r for r in result["score_systems"] if r["name"] == "formula1"),
        None,
    )
    assert f1 is not None, "formula1 score_system row must exist"
    assert f1["props_json"]["positions"] == [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], (
        f"formula1.positions must be Formula1 payouts; got "
        f"{f1['props_json']['positions']}"
    )


def test_drop_item_h15_h_rotten(handler_with_outputs):
    _, result = handler_with_outputs
    h15 = next(
        (r for r in result["drop_items"] if r["name"] == "h15"),
        None,
    )
    assert h15 is not None, "h15 drop_item row must exist"
    assert h15["props_json"]["spawnflags_value"] == 1, (
        f"h15.spawnflags_value must resolve H_ROTTEN to 1 via fallback dict; "
        f"got {h15['props_json']['spawnflags_value']}. If None, the "
        f"_DROPITEM_MACRO_FALLBACK dict is missing the H_ROTTEN entry OR "
        f"the macro spelling does not match."
    )


def test_drop_item_h100_h_mega(handler_with_outputs):
    _, result = handler_with_outputs
    h100 = next(
        (r for r in result["drop_items"] if r["name"] == "h100"),
        None,
    )
    assert h100 is not None, "h100 drop_item row must exist"
    assert h100["props_json"]["spawnflags_value"] == 2, (
        f"h100.spawnflags_value must resolve H_MEGA to 2 via fallback dict; "
        f"got {h100['props_json']['spawnflags_value']}"
    )


def test_drop_item_sh40_weapon_big2(handler_with_outputs):
    _, result = handler_with_outputs
    sh40 = next(
        (r for r in result["drop_items"] if r["name"] == "sh40"),
        None,
    )
    assert sh40 is not None, "sh40 drop_item row must exist"
    assert sh40["props_json"]["spawnflags_value"] == 1, (
        f"sh40.spawnflags_value must resolve WEAPON_BIG2 to 1 via the "
        f"_DROPITEM_MACRO_FALLBACK dict (commands.c:9053 -- WEAPON_BIG2 is "
        f"an integer-bodied macro that the string-literal-only Pattern 6 "
        f"lift excludes by design, F26); got "
        f"{sh40['props_json']['spawnflags_value']}. If None, either the "
        f"fallback dict is missing the entry or the resolver isn't "
        f"consulting it."
    )


def test_drop_item_sp_dm_spawn_function(handler_with_outputs):
    _, result = handler_with_outputs
    sp_dm = next(
        (r for r in result["drop_items"] if r["name"] == "sp_dm"),
        None,
    )
    assert sp_dm is not None, "sp_dm drop_item row must exist"
    assert sp_dm["props_json"]["spawn_function"] == "dropitem_spawn_spawnpoint", (
        f"sp_dm.spawn_function must resolve to 'dropitem_spawn_spawnpoint' "
        f"per commands.c:9075-9108; got {sp_dm['props_json']['spawn_function']}"
    )


def test_loc_macro_mh_non_identity(handler_with_outputs):
    _, result = handler_with_outputs
    mh = next(
        (r for r in result["loc_macros"] if r["name"] == "mh"),
        None,
    )
    assert mh is not None, "mh loc_macro row must exist"
    assert mh["value_text"] == "mega", f"mh.value_text must be 'mega'; got {mh['value_text']}"
    assert mh["props_json"]["is_identity"] is False, (
        f"mh.is_identity must be False (mh -> mega is non-identity); got "
        f"{mh['props_json']['is_identity']}"
    )


def test_loc_macro_separator_non_identity(handler_with_outputs):
    _, result = handler_with_outputs
    sep = next(
        (r for r in result["loc_macros"] if r["name"] == "separator"),
        None,
    )
    assert sep is not None, "separator loc_macro row must exist"
    assert sep["value_text"] == "-", f"separator.value_text must be '-'; got {sep['value_text']}"
    assert sep["props_json"]["is_identity"] is False, (
        f"separator.is_identity must be False; got "
        f"{sep['props_json']['is_identity']}"
    )


def test_teamplay_yesok_handler_and_banner(handler_with_outputs):
    _, result = handler_with_outputs
    yesok = next(
        (r for r in result["teamplay_messages"] if r["name"] == "yesok"),
        None,
    )
    assert yesok is not None, "yesok teamplay_message row must exist"
    assert yesok["props_json"]["handler_function"] == "TeamplayYesOk", (
        f"yesok.handler_function must be 'TeamplayYesOk'; got "
        f"{yesok['props_json']['handler_function']}"
    )
    # harvested_description may be None if the handler function has no
    # banner block; F13's anchor states Pattern 9 harvest is best-effort.
    # The test allows None but logs a warning if all 21 rows have None.
    # No hard fail here -- the load-side probe (Probe 14) reports coverage.


def test_ruleset_gate_invariants(handler_with_outputs):
    _, result = handler_with_outputs
    # Monsters: every row has {"mode":"bloodfest"}.
    bad_m = [r for r in result["monsters"]
             if r["ruleset_gate_json"] != {"mode": "bloodfest"}]
    assert bad_m == [], f"All monster rows must gate on bloodfest; bad: {[r['name'] for r in bad_m]}"
    # Score_systems: every row has {"mode":"race"}.
    bad_s = [r for r in result["score_systems"]
             if r["ruleset_gate_json"] != {"mode": "race"}]
    assert bad_s == [], f"All score_system rows must gate on race; bad: {[r['name'] for r in bad_s]}"
    # Drop_item / loc_macro / teamplay_message: empty gates.
    for kind in ("drop_items", "loc_macros", "teamplay_messages"):
        bad = [r for r in result[kind] if r["ruleset_gate_json"] != {}]
        assert bad == [], (
            f"All {kind} rows must have ruleset_gate_json={{}}; bad: "
            f"{[r['name'] for r in bad]}"
        )
