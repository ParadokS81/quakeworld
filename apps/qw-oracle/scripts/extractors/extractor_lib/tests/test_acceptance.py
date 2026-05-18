"""Unit tests for the engine-general three-stage acceptance contract
(extractor_lib._acceptance -- enforce-L1-runtime-truth Phase 4 / Task 3).

Scope: the PURE pieces and the all-or-nothing aggregation. The DB and the
Task-2 proxy are MOCKED -- this test never hits Postgres and never runs the
real probe scripts (the full ezQuake harness lives in
ezquake/accept-runtime-truth.py and is verified separately).

X10: ASCII only -- ``--`` for dashes. Comments explain WHY, not WHAT.
"""
import json
import subprocess

import pytest

from extractor_lib._acceptance import (
    classify_entity,
    route_by_level,
    run_stage1,
    validation_record_ok,
)


# ---------------------------------------------------------------------------
# Stage 3 -- route_by_level: pure, total, three-way (D13/D17).
# ---------------------------------------------------------------------------
def test_route_by_level_dump_confirmed_is_autonomous():
    assert route_by_level("dump-confirmed") == "autonomous-eligible"


def test_route_by_level_generalized_is_assistant_only():
    assert route_by_level("high-confidence-generalized") == "assistant-only"


def test_route_by_level_none_is_no_signal():
    # The level-1 absence. Conservative by construction.
    assert route_by_level(None) == "no-signal"


def test_route_by_level_unknown_string_is_no_signal():
    # TOTAL: any unrecognized value collapses to the conservative outcome --
    # never autonomous, never assistant. Defends against a schema drift that
    # introduces a new slot-3 token before stage 3 is taught about it.
    assert route_by_level("something-else") == "no-signal"
    assert route_by_level("") == "no-signal"


# ---------------------------------------------------------------------------
# Stage 2 conservative mapping -- classify_entity (the PURE testable core).
# Outcomes: 'L3' | 'stayL2' | 'stayL2+overridden'.
# ---------------------------------------------------------------------------
def test_track_a_genuine_dead_cvar_absent_is_L3():
    # Static accuses it dead; the dump's cvarlist does NOT contain it ->
    # the dump CONFIRMS the kill -> level-3 (D19).
    assert classify_entity(
        "A", "genuine-dead", "sb_qtvlist_url",
        cmdlist_set=set(), cvarlist_set={"name", "fov"},
        entity_type="cvar",
    ) == "L3"


def test_track_a_genuine_dead_cvar_present_is_overridden():
    # Static accuses it dead but the dump's cvarlist DOES contain it ->
    # static-vs-dump DISAGREEMENT -> conservative D3 (drop the accusation,
    # withhold level-3, surface as operator signal).
    assert classify_entity(
        "A", "genuine-dead", "cl_bobhead",
        cmdlist_set=set(), cvarlist_set={"cl_bobhead", "name"},
        entity_type="cvar",
    ) == "stayL2+overridden"


def test_track_a_genuine_dead_command_uses_cmdlist_set():
    # A Track-A *command* checks the CMDLIST set, not the cvarlist.
    assert classify_entity(
        "A", "genuine-dead", "some_dead_cmd",
        cmdlist_set={"echo", "quit"}, cvarlist_set={"some_dead_cmd"},
        entity_type="command",
    ) == "L3"
    assert classify_entity(
        "A", "genuine-dead", "echo",
        cmdlist_set={"echo", "quit"}, cvarlist_set=set(),
        entity_type="command",
    ) == "stayL2+overridden"


def test_track_a_build_excluded_never_L3():
    # OQ-3 / D20: a single runtime dump cannot confirm a cross-build
    # exclusion verdict. build-excluded ALWAYS stays level-2 -- regardless
    # of presence/absence in any runtime set.
    assert classify_entity(
        "A", "build-excluded", "cl_bobhead",
        cmdlist_set=set(), cvarlist_set={"cl_bobhead"},
        entity_type="cvar",
    ) == "stayL2"
    assert classify_entity(
        "A", "build-excluded", "ghost_cvar",
        cmdlist_set=set(), cvarlist_set=set(),
        entity_type="cvar",
    ) == "stayL2"


def test_track_a_unknown_conclusion_is_conservative():
    # Any unexpected Track-A conclusion -> conservative: no level-3.
    assert classify_entity(
        "A", "weird-new-conclusion", "x",
        cmdlist_set=set(), cvarlist_set=set(), entity_type="cvar",
    ) == "stayL2"


def test_track_b_command_present_is_L3():
    # The recovered HUD command is trusted (level-3) ONLY when the runtime
    # cmdlist actually exposes it.
    assert classify_entity(
        "B", None, "+hud_radar",
        cmdlist_set={"+hud_radar", "radar"}, cvarlist_set=set(),
    ) == "L3"


def test_track_b_command_absent_is_stayL2():
    # Conservative D8: not autonomously shipped; still a first-class level-2
    # entity (D21 nothing withheld).
    assert classify_entity(
        "B", None, "+hud_phantom",
        cmdlist_set={"radar"}, cvarlist_set=set(),
    ) == "stayL2"


# ---------------------------------------------------------------------------
# Stage 1 -- run_stage1 all-or-nothing aggregation (D18). Probe scripts are
# MOCKED via tiny fixture scripts that exit 0/1; no real probe runs.
# ---------------------------------------------------------------------------
def _make_exit_script(tmp_path, name, code):
    """Write a trivial python script that prints a marker and exits `code`."""
    p = tmp_path / name
    p.write_text(
        "import sys\n"
        f"print('FIXTURE {name} exit {code}')\n"
        f"sys.exit({code})\n",
        encoding="utf-8",
    )
    return str(p)


def _descriptor(tmp_path, probe_scripts):
    return {
        "fork": "ezquake",
        "validation_commit": "3f9e724f",
        "probe_scripts": probe_scripts,
        "tracks": ["A", "B"],
        "dump": "unused-in-stage1",
        "proxy": "unused-in-stage1",
    }


@pytest.fixture(autouse=True)
def _isolate_record_dir(tmp_path, monkeypatch):
    """Redirect the validation-record write into a tmp dir so the unit test
    never touches the real data/detection/ artifact (the live harness owns
    that file)."""
    import extractor_lib._acceptance as acc

    monkeypatch.setattr(acc, "DETECTION_DIR", tmp_path / "detection")
    return tmp_path / "detection"


def test_run_stage1_all_green_is_GREEN(tmp_path, _isolate_record_dir):
    s1 = _make_exit_script(tmp_path, "p1.py", 0)
    s2 = _make_exit_script(tmp_path, "p2.py", 0)
    rec = run_stage1(_descriptor(tmp_path, [s1, s2]))
    assert rec["status"] == "GREEN"
    assert rec["probes"]["callgraph"]["exit"] == 0
    assert rec["probes"]["hud"]["exit"] == 0
    # The probe stdout is captured verbatim (Task-1 ADVISORY carry-forward).
    assert "FIXTURE p1.py exit 0" in rec["probes"]["callgraph"]["report"]
    # Record was written to the isolated dir.
    written = json.loads(
        (_isolate_record_dir / "acceptance-validated-ezquake.json")
        .read_text(encoding="utf-8")
    )
    assert written["status"] == "GREEN"


def test_run_stage1_one_red_is_RED(tmp_path, _isolate_record_dir):
    # 0 + 1 -> the all-or-nothing aggregation must yield RED (D18: NOT
    # per-gate soft degradation -- a single non-zero fails the whole gate).
    s1 = _make_exit_script(tmp_path, "p1.py", 0)
    s2 = _make_exit_script(tmp_path, "p2.py", 1)
    rec = run_stage1(_descriptor(tmp_path, [s1, s2]))
    assert rec["status"] == "RED"
    assert rec["probes"]["callgraph"]["exit"] == 0
    assert rec["probes"]["hud"]["exit"] == 1


def test_run_stage1_missing_script_is_RED(tmp_path, _isolate_record_dir):
    # A missing probe script is a Phase-1/2 GAP -> RED (surfaced LOUD, not
    # patched here -- R5/X2). The present sibling still exits 0.
    s1 = _make_exit_script(tmp_path, "p1.py", 0)
    missing = str(tmp_path / "does-not-exist.py")
    rec = run_stage1(_descriptor(tmp_path, [s1, missing]))
    assert rec["status"] == "RED"
    assert rec["probes"]["hud"]["exit"] == 127


def test_run_stage1_red_does_not_raise(tmp_path, _isolate_record_dir):
    # The LOUD banner is printed but the function RETURNS the record (the
    # caller propagates the non-zero exit) -- it must not raise.
    s1 = _make_exit_script(tmp_path, "p1.py", 1)
    s2 = _make_exit_script(tmp_path, "p2.py", 1)
    rec = run_stage1(_descriptor(tmp_path, [s1, s2]))
    assert rec["status"] == "RED"


# ---------------------------------------------------------------------------
# D22 structural-gate binding -- validation_record_ok, fail-safe-CLOSED.
# ---------------------------------------------------------------------------
def _write_record(detection_dir, fork, status, commit):
    detection_dir.mkdir(parents=True, exist_ok=True)
    (detection_dir / f"acceptance-validated-{fork}.json").write_text(
        json.dumps(
            {
                "fork": fork,
                "validation_commit": commit,
                "status": status,
                "probes": {},
                "validated_at": "2026-05-18T00:00:00+00:00",
            }
        ),
        encoding="utf-8",
    )


def test_validation_record_ok_green_exact_pin(_isolate_record_dir):
    _write_record(_isolate_record_dir, "ezquake", "GREEN", "3f9e724f")
    assert validation_record_ok("ezquake", "3f9e724f") is True


def test_validation_record_ok_prefix_tolerant_full_hash(_isolate_record_dir):
    # The record holds the SHORT token; Task 4 supplies the FULL 40-char
    # oracle_meta hash. Prefix-tolerance is the faithful realization of the
    # D22 gate given F7's prefix self-certification.
    _write_record(_isolate_record_dir, "ezquake", "GREEN", "3f9e724f")
    assert validation_record_ok(
        "ezquake", "3f9e724fa608e516040f02b9557808ff3efda53e"
    ) is True
    # Case-insensitive, either direction.
    assert validation_record_ok("ezquake", "3F9E724FA608E516") is True


def test_validation_record_ok_red_status_is_false(_isolate_record_dir):
    _write_record(_isolate_record_dir, "ezquake", "RED", "3f9e724f")
    assert validation_record_ok("ezquake", "3f9e724f") is False


def test_validation_record_ok_pin_mismatch_is_false(_isolate_record_dir):
    _write_record(_isolate_record_dir, "ezquake", "GREEN", "3f9e724f")
    # Neither string is a prefix of the other -> mismatch -> False.
    assert validation_record_ok("ezquake", "deadbeef") is False


def test_validation_record_ok_missing_file_is_false(_isolate_record_dir):
    # Fail-safe-CLOSED: no record -> withhold the signal (D22/X4).
    assert validation_record_ok("ezquake", "3f9e724f") is False


def test_validation_record_ok_bad_json_is_false(_isolate_record_dir):
    _isolate_record_dir.mkdir(parents=True, exist_ok=True)
    (_isolate_record_dir / "acceptance-validated-ezquake.json").write_text(
        "{ not valid json", encoding="utf-8"
    )
    assert validation_record_ok("ezquake", "3f9e724f") is False


# ---------------------------------------------------------------------------
# Stage 2 -- proxy FAIL / stage-1 RED => EMPTY confirmed lists (D18/D19).
# DB + proxy fully MOCKED (no Postgres, no real proxy).
# ---------------------------------------------------------------------------
def test_run_stage2_proxy_fail_writes_empty_stamp_set(
    tmp_path, _isolate_record_dir, monkeypatch
):
    import extractor_lib._acceptance as acc

    # stage-1 GREEN precondition satisfied via an isolated record.
    _write_record(_isolate_record_dir, "ezquake", "GREEN", "3f9e724f")

    # Mock the proxy subprocess to FAIL (non-zero) -- the broken-pin HARD
    # sub-gate (D19): zero level-3, stamp-set still written with empty lists.
    def fake_run(args, capture_output=False, text=False):
        return subprocess.CompletedProcess(
            args, returncode=1, stdout="[FAIL] PRIMARY: mismatch", stderr=""
        )

    monkeypatch.setattr(acc.subprocess, "run", fake_run)

    descriptor = {
        "fork": "ezquake",
        "validation_commit": "3f9e724f",
        "probe_scripts": [],
        "tracks": ["A", "B"],
        "dump": "x",
        "proxy": "x",
    }
    stamp = acc.run_stage2(descriptor)
    assert stamp["proxy"] == "FAIL"
    assert stamp["track_a_dump_confirmed"] == []
    assert stamp["track_b_dump_confirmed"] == []
    written = json.loads(
        (_isolate_record_dir / "level3-stamp-set-3f9e724f.json")
        .read_text(encoding="utf-8")
    )
    assert written["proxy"] == "FAIL"
    assert written["track_a_dump_confirmed"] == []


def test_run_stage2_stage1_red_precondition_zero_level3(
    tmp_path, _isolate_record_dir
):
    # No stage-1 record at all -> precondition fails -> empty confirmed lists
    # (D18/D22): the proxy is never even consulted.
    descriptor = {
        "fork": "ezquake",
        "validation_commit": "3f9e724f",
        "probe_scripts": [],
        "tracks": ["A", "B"],
        "dump": "x",
        "proxy": "x",
    }
    from extractor_lib._acceptance import run_stage2

    stamp = run_stage2(descriptor)
    assert stamp["proxy"] == "FAIL"
    assert stamp["track_a_dump_confirmed"] == []
    assert stamp["track_b_dump_confirmed"] == []
