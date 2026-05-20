"""House tests for _runtime_dead_entities.render_dead_entities.

Pure render-helper tests -- no DB, no I/O, no route_by_level logic.
Fixtures are synthetic rows matching the live ground truth at the 3f9e724f pin
(sb_qtvlist_url = Class 1 / callgraph; gl_outline_scale_world = Class 2 /
commented-register). Mirrors the test_help_json_pr_digest.py convention.
"""
from extractor_lib._runtime_dead_entities import render_dead_entities


# ---------------------------------------------------------------------------
# Synthetic fixtures (ground-truth rows at pin 3f9e724f)
# ---------------------------------------------------------------------------

_ROW_CLASS1 = {
    "name": "sb_qtvlist_url",
    "source_file": "EX_browser_qtvlist.c",
    "source_line": 30,
    "ta": {
        "evidence": {
            "feeder": "callgraph",
            "per_variant": {
                "client": "unreachable",
                "server": "unreachable",
                "win": "unreachable",
                "apple": "unreachable",
            },
            "address_taken_residue": False,
        },
        "conclusion": "genuine-dead",
        "dump_confirmation": "dump-confirmed",
    },
}

_ROW_CLASS2 = {
    "name": "gl_outline_scale_world",
    "source_file": "r_rmain.c",
    "source_line": 237,
    "ta": {
        "evidence": {
            "feeder": "commented-register",
            "register_site": {
                "source_file": "r_rmain.c",
                "source_line": 730,
            },
        },
        "conclusion": "genuine-dead",
        "dump_confirmation": "dump-confirmed",
    },
}


# ---------------------------------------------------------------------------
# Section-order tests
# ---------------------------------------------------------------------------

def test_section_order_h1_first():
    md = render_dead_entities([], [], "92 cvars / 74 commands", "2026-05-19")
    assert md.startswith(
        "# ezQuake runtime-dead entities (code-bug report -> nano/slime)"
    )


def test_status_line_present():
    md = render_dead_entities([], [], "92 cvars / 74 commands", "2026-05-19")
    assert "**Status:** Verified, ready to route upstream. 2026-05-19." in md


def test_channel_block_present():
    md = render_dead_entities([], [], "92 cvars / 74 commands", "2026-05-19")
    assert "**Channel:**" in md
    assert "upstream code-bug" in md


def test_routing_block_present():
    md = render_dead_entities([], [], "92 cvars / 74 commands", "2026-05-19")
    assert "**Routing:**" in md
    assert "nano (head dev) / slime" in md


def test_how_found_section_present():
    md = render_dead_entities([], [], "92 cvars / 74 commands", "2026-05-19")
    assert "## How these were found" in md


def test_how_found_carries_sha_framing():
    md = render_dead_entities([], [], "92 cvars / 74 commands", "2026-05-19")
    # Embedded-SHA and zero-skew framing must survive regeneration.
    assert "3f9e724f" in md
    assert "3f9e724fa" in md
    assert "zero version skew" in md


def test_pool_figure_substituted_not_stale():
    md = render_dead_entities([], [], "92 cvars / 74 commands", "2026-05-19")
    assert "92 cvars / 74 commands" in md
    assert "97 cvars" not in md


def test_class1_heading():
    md = render_dead_entities([_ROW_CLASS1], [], "92 cvars / 74 commands", "2026-05-19")
    assert "## Class 1 -- orphaned-init cvar" in md


def test_class2_heading():
    md = render_dead_entities([], [_ROW_CLASS2], "92 cvars / 74 commands", "2026-05-19")
    assert "## Class 2 -- commented-out registration" in md


def test_class3_block_carried_verbatim():
    md = render_dead_entities([], [], "92 cvars / 74 commands", "2026-05-19")
    assert "## Class 3 -- orphaned cmdline params" in md
    # Spot-check the 8-row table flag entries
    assert "`-cheats`" in md
    assert "`-r-debug`" in md
    assert "`-showliberrors`" in md
    assert "server_democache_kb" in md


def test_class3_provenance_note_appended():
    md = render_dead_entities([], [], "92 cvars / 74 commands", "2026-05-19")
    assert "cmdline-liveness" in md
    assert "SEPARATE concern from the call-graph mechanism" in md


def test_attribution_present():
    md = render_dead_entities([], [], "92 cvars / 74 commands", "2026-05-19")
    assert "## Attribution" in md
    assert "Assisted-by: Claude:" in md
    assert "DCO" in md


# ---------------------------------------------------------------------------
# Section ordering -- headings in locked sequence
# ---------------------------------------------------------------------------

def test_locked_section_order():
    md = render_dead_entities([_ROW_CLASS1], [_ROW_CLASS2], "92 cvars / 74 commands", "2026-05-19")
    pos_how = md.index("## How these were found")
    pos_c1 = md.index("## Class 1")
    pos_c2 = md.index("## Class 2")
    pos_c3 = md.index("## Class 3")
    pos_attr = md.index("## Attribution")
    assert pos_how < pos_c1 < pos_c2 < pos_c3 < pos_attr, (
        "Section headings are not in the locked order:"
        " How-found < Class1 < Class2 < Class3 < Attribution"
    )


# ---------------------------------------------------------------------------
# Class 1 row rendering (sb_qtvlist_url fixture)
# ---------------------------------------------------------------------------

def test_class1_entry_name_anchor():
    md = render_dead_entities([_ROW_CLASS1], [], "92 cvars / 74 commands", "2026-05-19")
    assert "### `sb_qtvlist_url`" in md


def test_class1_declared_cite():
    md = render_dead_entities([_ROW_CLASS1], [], "92 cvars / 74 commands", "2026-05-19")
    assert "- Declared: `EX_browser_qtvlist.c:30`" in md


def test_class1_reachability_per_variant():
    md = render_dead_entities([_ROW_CLASS1], [], "92 cvars / 74 commands", "2026-05-19")
    assert "client=unreachable" in md
    assert "server=unreachable" in md
    assert "win=unreachable" in md
    assert "apple=unreachable" in md


def test_class1_address_taken_residue():
    md = render_dead_entities([_ROW_CLASS1], [], "92 cvars / 74 commands", "2026-05-19")
    assert "address-taken residue=False" in md


def test_class1_disposition_templated_not_handwritten():
    md = render_dead_entities([_ROW_CLASS1], [], "92 cvars / 74 commands", "2026-05-19")
    # The disposition line must use the template; it must NOT contain the
    # hand-authored registrar / enclosing-function narrative from the old
    # artifact (OQ-2: registrar/enclosing-function is not persisted).
    assert "Disposition (maintainer call):" in md
    assert "unreachable" in md  # the feeder key (in Reachability line)
    # Hand-authored narrative from the old MD must NOT appear.
    assert "QTVList_Init" not in md
    assert "qtv-browser-list" not in md


def test_class1_no_build_excluded():
    md = render_dead_entities([_ROW_CLASS1], [], "92 cvars / 74 commands", "2026-05-19")
    assert "build-excluded" not in md


# ---------------------------------------------------------------------------
# Class 2 row rendering (gl_outline_scale_world fixture)
# ---------------------------------------------------------------------------

def test_class2_entry_name_anchor():
    md = render_dead_entities([], [_ROW_CLASS2], "92 cvars / 74 commands", "2026-05-19")
    assert "### `gl_outline_scale_world`" in md


def test_class2_declared_cite():
    md = render_dead_entities([], [_ROW_CLASS2], "92 cvars / 74 commands", "2026-05-19")
    assert "- Declared: `r_rmain.c:237`" in md


def test_class2_sole_registration_cite():
    md = render_dead_entities([], [_ROW_CLASS2], "92 cvars / 74 commands", "2026-05-19")
    assert "- Sole registration: `r_rmain.c:730` (commented out)" in md


def test_class2_disposition_templated():
    md = render_dead_entities([], [_ROW_CLASS2], "92 cvars / 74 commands", "2026-05-19")
    # Template disposition must appear; old hand-authored narrative must not.
    assert "Disposition (maintainer call):" in md
    assert "Cvar_Register" in md
    # Old artifact narrative phrases must not appear.
    assert "world-outline scaling" not in md


# ---------------------------------------------------------------------------
# Idempotency -- two calls with identical args produce identical output
# ---------------------------------------------------------------------------

def test_idempotent():
    args = ([_ROW_CLASS1], [_ROW_CLASS2], "92 cvars / 74 commands", "2026-05-19")
    assert render_dead_entities(*args) == render_dead_entities(*args)


# ---------------------------------------------------------------------------
# Stable sort -- rows already sorted by name produce consistent output
# ---------------------------------------------------------------------------

def test_multiple_class1_rows_stable_order():
    row_a = dict(_ROW_CLASS1, name="zzz_cvar")
    row_b = dict(_ROW_CLASS1, name="aaa_cvar")
    # Supply in reverse-alpha order; generator sorts before calling render,
    # but render itself just consumes the list order. This test verifies
    # that the caller's pre-sort is respected and the two entries appear.
    md = render_dead_entities([row_b, row_a], [], "92 cvars / 74 commands", "2026-05-19")
    pos_aaa = md.index("`aaa_cvar`")
    pos_zzz = md.index("`zzz_cvar`")
    assert pos_aaa < pos_zzz  # aaa supplied first -> appears first


# ---------------------------------------------------------------------------
# ASCII cleanliness (X10)
# ---------------------------------------------------------------------------

def test_ascii_only():
    md = render_dead_entities([_ROW_CLASS1], [_ROW_CLASS2], "92 cvars / 74 commands", "2026-05-19")
    non_ascii = [ch for ch in md if ord(ch) > 127]
    assert non_ascii == [], (
        f"Non-ASCII characters found: {[hex(ord(c)) for c in non_ascii]}"
    )


# ---------------------------------------------------------------------------
# Two-entry combined test (mirrors the live ground-truth at the pin)
# ---------------------------------------------------------------------------

def test_full_render_two_entries():
    """Smoke test with the exact live ground-truth fixture set."""
    md = render_dead_entities(
        [_ROW_CLASS1], [_ROW_CLASS2], "92 cvars / 74 commands", "2026-05-19"
    )
    # Both entries present
    assert "### `sb_qtvlist_url`" in md
    assert "### `gl_outline_scale_world`" in md
    # Correct section count: 2 entries -> 2 '### ' anchors
    assert md.count("\n### `") == 2
    # Class 1 entry appears before Class 2 entry
    assert md.index("### `sb_qtvlist_url`") < md.index("### `gl_outline_scale_world`")
