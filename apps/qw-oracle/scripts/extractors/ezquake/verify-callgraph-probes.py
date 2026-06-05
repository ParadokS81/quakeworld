#!/usr/bin/env python3
"""ezQuake 3-gate known-answer probe harness for the Track-A call-graph
reachability passenger.

Drives the ezQuake extractor IN-PROCESS (serial, workers=1) so the
parent-side post-walk (_run_serial feeder-a + feeder-b scan) populates
_callgraph._RESULT in THIS process, making reachable() queryable here.

Why serial? The parallel path also populates _callgraph._RESULT in the
parent process (the pool returns facts; the parent runs run_postwalk),
but it needs os.fork(), which adds multiprocessing complexity and a
potential for orphaned worker processes if the gate assertions abort.
Serial is deterministic, simpler, and the post-walk BFS is in this
process by construction (no pickling, no inter-process signalling).
The run parses a small committed synthetic fixture (probe_fixture.c via
--repo-root), not the live ezQuake tree, so it completes in seconds and
the three known-answer cvars cannot be deleted by upstream cleanup.

X2 / W4 compliance: ALL assertions query reachable() and the feeder tag
only -- NO L1 column read (no schema until Phase 3), NO combined/cross-
track harness (Phase 4). The oracle is the mechanism's own output.

D18 gate shape: hard, all-or-nothing, loud. Any RED gate exits non-zero
with a full per-gate report (expected vs actual + the raw reachable()
dict). On all-GREEN exits 0 with exactly three GREEN lines.

X10: ASCII only. Comments explain WHY, not WHAT.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

# The extractor and extractor_lib live alongside / one level up from this
# file. Both must be on sys.path before we import extract or _callgraph.
# extract.py itself does the same manipulation at import time (HERE.parent
# and HERE added to sys.path in its top section), but we do it here as
# well so that importing extractor_lib._callgraph directly for the gate
# assertions works regardless of the caller's working directory.
HERE = Path(__file__).resolve().parent
EXTRACTORS_ROOT = HERE.parent  # apps/qw-oracle/scripts/extractors/

# The committed synthetic fixture tree the probe parses INSTEAD of the live
# ezQuake source. We own it; no upstream dead-cvar cleanup can delete the
# three known-answer cases (the disease that retired the live-source
# fixtures). extract.main() resolves --repo-root to <root>/src when that holds
# .c files, so FIXTURE_ROOT points at the dir CONTAINING src/.
FIXTURE_ROOT = HERE / "fixtures" / "callgraph-probe"
# The cvar names the fixture registers, one per gate (see probe_fixture.c).
FIXTURE_CVAR_DEAD_CALLGRAPH = "fix_dead_cg"          # GATE 1
FIXTURE_CVAR_DEAD_COMMENTED = "fix_dead_commented"   # GATE 2
FIXTURE_CVAR_REACHABLE = "fix_reachable"             # GATE 3
# GATE 2's commented-register cite. Coupled to the fixture (which is stable
# and self-owned) -- if probe_fixture.c is edited so the disabled line moves,
# update this line number to match (grep `// Cvar_Register` in the fixture).
FIXTURE_COMMENTED_CITE = "probe_fixture.c:88"

if str(EXTRACTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXTRACTORS_ROOT))
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

# Import the module under test NOW so the constants are available for
# assertions even before the extractor run. The run populates _RESULT
# in this same module object (same process, same import).
import extractor_lib._callgraph as cg  # noqa: E402

# Pull the constant names so assertions read exactly what the module
# defines. A rename in _callgraph.py would then surface as an
# ImportError here rather than a silent string mismatch.
from extractor_lib._callgraph import (  # noqa: E402
    CONCLUSION_BUILD_EXCLUDED,
    CONCLUSION_GENUINE_DEAD,
    FEEDER_CALLGRAPH,
    FEEDER_COMMENTED_REGISTER,
    STATE_NOT_COMPILED,
    STATE_REACHABLE,
    STATE_UNREACHABLE,
    VARIANT_APPLE,
    VARIANT_CLIENT,
    VARIANT_SERVER,
    VARIANT_WIN,
)

# extract.main() is the in-process entry point. We patch sys.argv to
# pass the desired flags (serial, temp output dir) and call it directly.
# This is the ONLY correct in-process drive pattern: a subprocess.run
# would populate _callgraph._RESULT in a DIFFERENT process and our
# reachable() queries here would see an empty result.
import extract  # noqa: E402 -- the ezquake extractor


def _run_extractor(tmp_dir: str) -> int:
    """Drive extract.main() in this process, serial, over the FIXTURE tree.

    Serial (--workers 1) is chosen because _run_serial's parent-side
    post-walk executes in the calling process, guaranteeing _callgraph
    module-level state is populated HERE. The parallel path also works
    (the parent process runs run_postwalk after pool.map returns), but
    serial avoids forked-worker teardown complexity and is fully
    deterministic for a gate script.

    Source: --repo-root points at the committed synthetic fixture tree
    (FIXTURE_ROOT), NOT the live ezQuake checkout. The three known-answer
    cases live in probe_fixture.c, so no upstream dead-cvar cleanup can
    delete them, and the ~90-line fixture parses in a fraction of a second
    (vs ~minutes for the 308-file tree).

    Handlers: --handlers "" runs ZERO entity handlers. The call-graph
    passenger is a Visitor-independent observer (D6 zero shared state); it
    runs and its post-walk populates _callgraph._RESULT regardless of the
    handler list. Skipping the handlers avoids their finalize() steps,
    which read ezQuake help-JSON files (help_commands.json, ...) absent
    from the fixture -- and keeps the probe decoupled from the handler
    roster (it tests the passenger, not the handlers).
    """
    old_argv = sys.argv[:]
    sys.argv = [
        "extract.py",
        "--repo-root", str(FIXTURE_ROOT),
        "--handlers", "",          # observer-only: no handler finalize (D6)
        "--output-dir", tmp_dir,
        "--workers", "1",          # serial: parent-side post-walk in THIS process
        "--progress-every", "0",   # suppress progress noise in gate output
    ]
    try:
        rc = extract.main()
    finally:
        sys.argv = old_argv
    return rc


def _loud_fail(gate: int, expected: dict, actual: dict, notes: str = "") -> None:
    """Print a loud per-gate RED report and accumulate for final exit.

    Matches D18's "loud" requirement: gate number, expected shape,
    actual shape, the raw reachable() dict. Does NOT call sys.exit
    directly -- caller collects all RED gates and exits once at the end
    (all-or-nothing: all gates must pass or the whole gate is RED).
    """
    sep = "-" * 60
    print(f"\n{sep}")
    print(f"GATE {gate} RED")
    if notes:
        print(f"  reason:   {notes}")
    print(f"  expected: {json.dumps(expected, indent=4)}")
    print(f"  actual:   {json.dumps(actual, indent=4)}")
    print(sep)


def _check_gate_1(actual: dict) -> bool:
    """fix_dead_cg -- genuine-dead via call-graph feeder.

    NeverCalled (probe_fixture.c) has zero callers and its address is never
    taken, so its cvar registration is unreachable in every compiled
    variant -- yet libclang compiles its body. This is the D5 'genuine-dead
    core' path (unreachable everywhere compiled AND compiled in >=1 variant).

    RED conditions:
      - conclusion is build-excluded (wrong: the registrar IS compiled,
        just never called)
      - feeder is commented-register (wrong: the Cvar_Register IS in the
        source, just never reached; libclang sees it; feeder-a should own it)
    """
    expected_shape = {
        "conclusion": CONCLUSION_GENUINE_DEAD,
        "feeder": FEEDER_CALLGRAPH,
    }
    ok = True
    notes = []

    if actual.get("conclusion") != CONCLUSION_GENUINE_DEAD:
        ok = False
        notes.append(
            f"conclusion: expected '{CONCLUSION_GENUINE_DEAD}', got '{actual.get('conclusion')}'"
        )
    if actual.get("feeder") != FEEDER_CALLGRAPH:
        ok = False
        notes.append(
            f"feeder: expected '{FEEDER_CALLGRAPH}', got '{actual.get('feeder')}'"
        )
    # The per-variant evidence states: every compiled variant must be
    # unreachable (client/win/apple compiled, server not-compiled because
    # EX_browser_qtvlist.c is client-only). We check the evidence is
    # present and the conclusion follows; we do NOT assert exact per-variant
    # values (those are the mechanism's derivation, not this probe's
    # job -- the conclusion + feeder are the load-bearing assertions here).
    # The phase MD requires: "unreachable in every compiled variant,
    # not-compiled where its TU is not built". The conclusion genuine-dead
    # subsumes that requirement by D5's combination rule -- if the
    # conclusion is genuine-dead AND the feeder is callgraph, the
    # per-variant evidence MUST satisfy the D5 rule.

    if not ok:
        _loud_fail(1, expected_shape, actual, "; ".join(notes))
    return ok


def _check_gate_2(actual: dict) -> bool:
    """fix_dead_commented -- genuine-dead via commented-register feeder.

    The SOLE Cvar_Register for this fixture cvar is commented out (the
    `// Cvar_Register(&fix_dead_commented);` line in probe_fixture.c).
    libclang strips comments, so feeder-a sees NO registration call and
    signals _no_registration. reachable() then consults feeder-b (the
    textual scanner), which must find the commented line and return:
      conclusion: genuine-dead
      feeder:     commented-register
      evidence:   {commented_register: FIXTURE_COMMENTED_CITE}

    RED conditions:
      - feeder is callgraph (wrong: feeder-a must be blind to a commented-
        out Cvar_Register -- this would mean the commented-register scanner
        is not being consulted or feeder-a somehow "sees" the comment)
      - no commented_register cite in evidence (feeder-b found nothing)
      - cite basename != probe_fixture.c (wrong file)
      - cite line != the fixture's disabled-line number (wrong line)
    """
    expected_base, expected_line = FIXTURE_COMMENTED_CITE.rsplit(":", 1)
    expected_shape = {
        "conclusion": CONCLUSION_GENUINE_DEAD,
        "feeder": FEEDER_COMMENTED_REGISTER,
        "evidence": {"commented_register": FIXTURE_COMMENTED_CITE},
    }
    ok = True
    notes = []

    if actual.get("conclusion") != CONCLUSION_GENUINE_DEAD:
        ok = False
        notes.append(
            f"conclusion: expected '{CONCLUSION_GENUINE_DEAD}', got '{actual.get('conclusion')}'"
        )
    if actual.get("feeder") != FEEDER_COMMENTED_REGISTER:
        ok = False
        notes.append(
            f"feeder: expected '{FEEDER_COMMENTED_REGISTER}', got '{actual.get('feeder')}'"
            " -- if callgraph, feeder-a incorrectly claims to see a registration that"
            " exists only as a comment (libclang should strip it)"
        )

    evidence = actual.get("evidence", {})
    cite = evidence.get("commented_register", "")
    if not cite:
        ok = False
        notes.append(
            "evidence['commented_register'] is absent or empty"
            " -- feeder-b textual scanner produced no cite"
        )
    else:
        # The cite is "basename:lineno". Verify both components exactly
        # (phase MD OQ-3 note: assert basename and line separately so a
        # regression that shifts the line number is not masked by a prefix
        # match).
        parts = cite.rsplit(":", 1)
        if len(parts) != 2:
            ok = False
            notes.append(f"cite '{cite}' is not in 'file:line' format")
        else:
            cite_base, cite_line = parts
            if cite_base != expected_base:
                ok = False
                notes.append(
                    f"cite basename: expected '{expected_base}', got '{cite_base}'"
                )
            if cite_line != expected_line:
                ok = False
                notes.append(
                    f"cite line: expected '{expected_line}', got '{cite_line}'"
                )

    if not ok:
        _loud_fail(2, expected_shape, actual, "; ".join(notes))
    return ok


def _check_gate_3(actual: dict) -> bool:
    """fix_reachable -- build-excluded; reachable in all 4 variants.

    Cvar_Register(&fix_reachable) is inside RegisterReachable
    (probe_fixture.c), reached via the normal main -> Host_Init ->
    RegisterReachable cascade. The fixture has NO #ifdef guards, so the
    registrar compiles and resolves `reachable` in every variant --
    including server (nothing removes its TU under -DSERVERONLY). A
    reachable-anywhere registrar yields conclusion `build-excluded` (the
    cleared/live-cvar bucket; verdict() in _callgraph.py), which is the
    load-bearing assertion here. not-compiled stays correctly derivable
    for genuinely #ifdef-guarded code -- the fixture simply has none.

    RED conditions (per D5 AMENDMENT + OQ-3):
      - conclusion != build-excluded (load-bearing -- genuine-dead would
        mean a live cvar was false-accused)
      - server evidence is not-compiled (would mean the registrar's TU was
        excluded under -DSERVERONLY -- the fixture is unguarded, so server
        must resolve `reachable`, never `not-compiled`)
      - address_taken_residue is True (fix_reachable's registrar is reached
        via the normal entry cascade, not via address-taken forcing)
    """
    expected_shape = {
        "conclusion": CONCLUSION_BUILD_EXCLUDED,
        "feeder": FEEDER_CALLGRAPH,
        "evidence": {
            VARIANT_CLIENT: STATE_REACHABLE,
            VARIANT_SERVER: STATE_REACHABLE,
            VARIANT_WIN: STATE_REACHABLE,
            VARIANT_APPLE: STATE_REACHABLE,
            "address_taken_residue": False,
        },
    }
    ok = True
    notes = []

    if actual.get("conclusion") != CONCLUSION_BUILD_EXCLUDED:
        ok = False
        notes.append(
            f"conclusion: expected '{CONCLUSION_BUILD_EXCLUDED}', got '{actual.get('conclusion')}'"
        )
    if actual.get("feeder") != FEEDER_CALLGRAPH:
        ok = False
        notes.append(
            f"feeder: expected '{FEEDER_CALLGRAPH}', got '{actual.get('feeder')}'"
        )

    evidence = actual.get("evidence", {})

    # The three client-family variants must all be reachable
    # (RegisterReachable sits in the unguarded main -> Host_Init ->
    # RegisterReachable cascade, identical across client/win/apple).
    for v in (VARIANT_CLIENT, VARIANT_WIN, VARIANT_APPLE):
        if evidence.get(v) != STATE_REACHABLE:
            ok = False
            notes.append(
                f"evidence['{v}']: expected '{STATE_REACHABLE}', got '{evidence.get(v)}'"
            )

    # decisions.md D5 AMENDMENT 2026-05-17 (operator-ratified): not-compiled
    # is PREPROCESSOR-derivable only. The fixture has no #ifdef guards, so
    # RegisterReachable's TU is present under -DSERVERONLY and it resolves
    # `reachable` in the server variant. The ratified RED predicate is
    # narrow: server == not-compiled is RED (a TU that should be present
    # going missing). reachable AND unreachable are both acceptable here --
    # the load-bearing assertion is the conclusion build-excluded (checked
    # above). Do NOT RED on server == unreachable: that would be stricter
    # than the operator-ratified contract.
    server_state = evidence.get(VARIANT_SERVER)
    if server_state == STATE_NOT_COMPILED:
        ok = False
        notes.append(
            f"evidence['{VARIANT_SERVER}']: got '{STATE_NOT_COMPILED}' --"
            " violates decisions.md D5 AMENDMENT 2026-05-17: the fixture is"
            " unguarded, so RegisterReachable's TU is present under"
            f" -DSERVERONLY and server must resolve '{STATE_REACHABLE}' (or"
            f" unreachable), never '{STATE_NOT_COMPILED}'"
        )

    # OQ-3 tightening: fix_reachable's registrar RegisterReachable is reached
    # via the normal entry cascade. If the residue flag is True it would mean
    # RegisterReachable is only a root because its address is taken, which is
    # wrong (the fixture never takes its address).
    residue = evidence.get("address_taken_residue")
    if residue is not False:
        ok = False
        notes.append(
            f"evidence['address_taken_residue']: expected False, got {residue!r}"
            " (OQ-3: fix_reachable's registrar is normally-reachable, not residue-forced)"
        )

    if not ok:
        _loud_fail(3, expected_shape, actual, "; ".join(notes))
    return ok


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="cg-probe-") as tmp_dir:
        print("Running ezQuake extractor (serial) to populate call-graph...")
        rc = _run_extractor(tmp_dir)
        if rc != 0:
            print(
                f"ERROR: extract.main() returned {rc} -- extractor failed;"
                " call-graph state may be incomplete.",
                file=sys.stderr,
            )
            # Do not immediately abort: _callgraph may be partially populated.
            # The gate assertions will report RED if the state is unusable.

    # The tmp_dir is cleaned up here. The handler JSON files in it are
    # irrelevant -- this probe queries reachable() only (X2 / W4). The
    # JSON files are written by the handler finalize() steps and are not
    # consulted by any gate.

    # Query the mechanism's own output for each of the three probes (the
    # fixture cvars from probe_fixture.c).
    r1 = cg.reachable(FIXTURE_CVAR_DEAD_CALLGRAPH, "cvar")   # GATE 1
    r2 = cg.reachable(FIXTURE_CVAR_DEAD_COMMENTED, "cvar")   # GATE 2
    r3 = cg.reachable(FIXTURE_CVAR_REACHABLE, "cvar")        # GATE 3

    g1 = _check_gate_1(r1)
    g2 = _check_gate_2(r2)
    g3 = _check_gate_3(r3)

    if g1:
        print("GATE 1 GREEN")
    if g2:
        print("GATE 2 GREEN")
    if g3:
        print("GATE 3 GREEN")

    if not (g1 and g2 and g3):
        # D18 all-or-nothing: any RED gate means the whole gate is RED and
        # the passenger emits NO signal for this fork (Phase 4 wires this).
        # The loud per-gate reports were already printed by _loud_fail above.
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
