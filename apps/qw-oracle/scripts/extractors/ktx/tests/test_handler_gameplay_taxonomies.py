"""Phase 4 sanity test: verifies KtxGameplayTaxonomiesHandler produces F7/F8 anchors.

Prerequisites:
  - libclang 18 must be installed and loadable as libclang-18.so.1.
  - All tests require the KTX research repo at research/repos/ktx/
    relative to the monorepo root.

Run from the monorepo root:
  python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_gameplay_taxonomies.py -v
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
KTX_HANDLER_DIR = HERE.parent          # apps/qw-oracle/scripts/extractors/ktx/
EXTRACTORS_ROOT = KTX_HANDLER_DIR.parent  # apps/qw-oracle/scripts/extractors/

# parents[0] = ktx, parents[1] = extractors, parents[2] = scripts,
# parents[3] = qw-oracle, parents[4] = apps, parents[5] = quakeworld root
KTX_REPO = HERE.parents[5] / "research" / "repos" / "ktx"

EXTRACT_PY = KTX_HANDLER_DIR / "extract.py"

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
from _handler_gameplay_taxonomies import KtxGameplayTaxonomiesHandler  # noqa: E402
from extractor_lib.tests import assert_parallel_serial_equivalent  # noqa: E402


@pytest.fixture(scope="module")
def handler_with_outputs():
    handler = KtxGameplayTaxonomiesHandler()
    handler.setup(ktx_repo=KTX_REPO, ktx_src=KTX_REPO / "src")

    idx = Index.create()
    args = clang_args_ktx_for(str(KTX_REPO / "src"))

    # Walk one .c file -- any TU's #include closure exposes progs.h's
    # electType_t enum decl. world.c is small and central; pick it.
    target_path = KTX_REPO / "src" / "world.c"
    tu = idx.parse(str(target_path), args=args, options=PARSE_OPTS)
    source_bytes = target_path.read_bytes()
    handler.start_file(source_path=target_path, source_bytes=source_bytes)
    walk_tu_dispatch(tu, [handler], "server", str(target_path), source_root="server")
    rows = handler.end_file()

    # Driver convention: collect per-file rows into all_rows[handler.name].
    all_rows = {handler.name: list(rows)}
    result = handler.finalize(all_rows=all_rows, repo_root=KTX_REPO)
    return handler, result


def test_election_count_5(handler_with_outputs):
    _, result = handler_with_outputs
    assert len(result["election_types"]) == 5, (
        f"Expected 5 election_type rows (F7); got {len(result['election_types'])}"
    )


def test_death_rule_count_27(handler_with_outputs):
    _, result = handler_with_outputs
    assert len(result["death_rules"]) == 27, (
        f"Expected 27 death_rule rows (F8); got {len(result['death_rules'])}"
    )


def test_etnone_skipped(handler_with_outputs):
    _, result = handler_with_outputs
    hits = [r for r in result["election_types"] if r["value_text"] == "etNone"]
    assert hits == [], (
        f"etNone sentinel must be skipped (F7); got rows: {hits}"
    )


def test_dtnone_dtunknown_skipped(handler_with_outputs):
    _, result = handler_with_outputs
    sentinels = [r for r in result["death_rules"]
                 if r["value_text"] in ("dtNONE", "dtUNKNOWN")]
    assert sentinels == [], (
        f"dtNONE/dtUNKNOWN sentinels must be skipped (F8); got rows: {sentinels}"
    )


def test_dtchangelevel_structural(handler_with_outputs):
    _, result = handler_with_outputs
    cl = next(
        (r for r in result["death_rules"] if r["value_text"] == "dtCHANGELEVEL"),
        None,
    )
    assert cl is not None, "dtCHANGELEVEL must be present (F8 keep-rule)"
    assert cl["props_json"]["category"] == "structural", (
        f"dtCHANGELEVEL category must be 'structural' (F8 + spec 5.4.4); "
        f"got: {cl['props_json']['category']}"
    )


def test_dtrl_related_weapon_underscored(handler_with_outputs):
    _, result = handler_with_outputs
    rl = next(
        (r for r in result["death_rules"] if r["value_text"] == "dtRL"),
        None,
    )
    assert rl is not None, "dtRL row missing"
    assert rl["props_json"]["related_weapon"] == "rocket_launcher", (
        f"dtRL related_weapon must be 'rocket_launcher' (matches id1 baseline "
        f"gameplay_entity_defs.name for FK joinability); "
        f"got: {rl['props_json']['related_weapon']}"
    )


def test_id1_ktx_flags_mutually_exclusive(handler_with_outputs):
    _, result = handler_with_outputs
    bad = [
        r for r in result["death_rules"]
        if r["props_json"]["id1_baseline"] == r["props_json"]["ktx_extension"]
    ]
    assert bad == [], (
        f"Each death_rule row must have exactly one of id1_baseline / "
        f"ktx_extension set to True (mutually exclusive). "
        f"Violators: {[(r['name'], r['props_json']) for r in bad]}"
    )


def test_etcaptain_required_role(handler_with_outputs):
    _, result = handler_with_outputs
    cap = next(
        (r for r in result["election_types"] if r["value_text"] == "etCaptain"),
        None,
    )
    assert cap is not None, "etCaptain row missing"
    assert cap["props_json"]["required_role"] == "player", (
        f"etCaptain required_role must be 'player' (CF_PLAYER per "
        f"commands.c:803 cmds[] entry). Got: {cap['props_json']['required_role']}"
    )


def test_parallel_serial_equivalence(tmp_path):
    """D.3.1 regression gate: parallel and serial extraction must produce
    identical handler output, including the source_total stat.

    Pre-fix evidence: workers=1 source_total=5, workers=12 source_total=60
    (per-worker self._election_seen_tags dedup made the count scale with
    worker count). Post-fix: source_total is parallelism-invariant because
    dedup happens only in finalize() against the driver-merged all_rows.

    This test invokes extract.py as a subprocess so it exercises the actual
    multiprocessing.Pool fork-pool code path, not just the handler in-process.
    """
    serial_output, parallel_output = assert_parallel_serial_equivalent(
        extract_py=EXTRACT_PY,
        repo_root=KTX_REPO,
        handler_name="gameplay_taxonomies",
        output_filename="ktx-gameplay-taxonomies-ast.json",
        tmp_path=tmp_path,
    )

    # F7 + F8 anchor invariants (worker-independent).
    assert len(serial_output["election_types"]) == 5
    assert len(parallel_output["election_types"]) == 5
    assert len(serial_output["death_rules"]) == 27
    assert len(parallel_output["death_rules"]) == 27

    # D.3.1 regression gate: source_total is parallelism-invariant after
    # the per-worker dedup removal.
    serial_total   = serial_output["_stats"]["election_type"]["source_total"]
    parallel_total = parallel_output["_stats"]["election_type"]["source_total"]
    assert serial_total == parallel_total, (
        f"D.3.1 regression: source_total differs across worker counts. "
        f"workers=1 -> {serial_total}, workers=4 -> {parallel_total}. "
        "They must be equal after the per-worker _election_seen_tags removal."
    )
    assert serial_total > 0, (
        f"source_total must be positive (raw observations across TUs that "
        f"include progs.h). Got {serial_total}."
    )

    # Election type rows: byte-equality after stable sort by name (finalize
    # already sorts by name; sort here defensively against future ordering
    # tweaks).
    serial_et   = sorted(serial_output["election_types"],   key=lambda r: r["name"])
    parallel_et = sorted(parallel_output["election_types"], key=lambda r: r["name"])
    for s, p in zip(serial_et, parallel_et):
        assert s == p, (
            f"election_type row mismatch for {s['name']!r}: "
            f"serial={s} parallel={p}"
        )

    # Death rules: byte-equality. Stage 2 fires pre-fork in setup() so the
    # output should be identical regardless of worker count.
    assert serial_output["death_rules"] == parallel_output["death_rules"], (
        "death_rules differ between serial and parallel runs. Stage 2 "
        "(deathtype.h X-macro parse) fires pre-fork in setup() and should "
        "produce identical output regardless of worker count."
    )
