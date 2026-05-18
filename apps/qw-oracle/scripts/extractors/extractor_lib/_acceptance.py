#!/usr/bin/env python3
"""Engine-general three-stage acceptance contract (enforce-L1-runtime-truth
Phase 4 / Task 3).

This module is the SHARED, fork-agnostic realization of the Task-1-LOCKED
acceptance-contract shape (decisions D17/D18/D19/D13/D22). It is parameterized
entirely by a per-fork descriptor; the single ezQuake instantiation lives in
``ezquake/accept-runtime-truth.py``. No engine-specific literal appears here
(extractor_lib house rule: no engine-specific logic in the shared lib).

Four public functions:

  run_stage1(descriptor)            -- HARD all-or-nothing mechanism-validation
                                       gate. Pure COMPOSITION: subprocess-runs
                                       the descriptor's Phase-1/2 probe scripts;
                                       NEVER re-implements probe logic (X2/R5).
  run_stage2(descriptor)            -- proxy-gated conservative runtime-dump
                                       cross-check. READS the DB + the runtime
                                       name-sets (the latter via the Task-2
                                       proxy's --emit-runtime-sets shell mode --
                                       NEVER a Python reimplementation of the
                                       banked sed/awk/grep; R6 reuse-not-
                                       reinvent). WRITES only the JSON stamp-set.
                                       ZERO DB mutation here (the Task-4 loader
                                       applies the stamp-set via X9 ON CONFLICT).
  route_by_level(dump_confirmation) -- pure/total stage-3 routing predicate.
                                       Reads ONLY slot-3; no track/feeder
                                       branch (D13/D17 stage 3 uniform). SHIPPED
                                       + TESTED here; Phase 5 CONSUMES it.
  validation_record_ok(fork, pin)   -- the D22 structural-gate binding point.
                                       Fail-safe-CLOSED: any read/parse failure
                                       -> False (D22/X4).

X10: ASCII only -- use ``--`` for dashes, no em/en-dash, no emoji. Comments
explain WHY, not WHAT.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# extractor_lib/ -> scripts/extractors/ -> scripts/ -> apps/qw-oracle/ ->
# apps/ -> <repo>. Five .parent hops, identical depth-resolution to the house
# idiom in ezquake/verify-unified-output.py (REPO_ROOT = HERE.parent x5).
HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent.parent.parent
DETECTION_DIR = REPO_ROOT / "apps" / "qw-oracle" / "data" / "detection"

# Phase-3 populated rows are all at this version (verified live: every
# track_a/track_b row sits at version='head'). The cross-check reads exactly
# this slice -- D13 "per-version" / D19 "this dump confirms this slice".
PINNED_DUMP_VERSION = "head"

# The read-only psql invocation. Stage 2 ONLY reads via this; it never issues
# an INSERT/UPDATE/DELETE (X9: the Task-4 loader owns the write path).
_PSQL = [
    "docker", "exec", "qw-oracle-postgres-dev",
    "psql", "-U", "qworacle", "-d", "qw_oracle", "-tAc",
]

# The D14 slot-3 trust-level string vocabulary. route_by_level is the single
# authority that maps these to a routing decision.
LEVEL3_DUMP_CONFIRMED = "dump-confirmed"               # autonomous-eligible
LEVEL2_GENERALIZED = "high-confidence-generalized"     # assistant-only
# (None / level-1 / anything else) -> no-signal

# Track-A conclusion vocabulary (verified live: cvar/command track_a rows
# carry exactly 'genuine-dead' or 'build-excluded').
CONCLUSION_GENUINE_DEAD = "genuine-dead"
CONCLUSION_BUILD_EXCLUDED = "build-excluded"


# ---------------------------------------------------------------------------
# Stage 3 -- pure routing predicate (D13/D17). Total, no I/O, no track branch.
# ---------------------------------------------------------------------------
def route_by_level(dump_confirmation: Optional[str]) -> str:
    """Map a D14 slot-3 dump-confirmation string to a routing decision.

    Pure and TOTAL: every input (incl. None, level-1, any unknown string)
    maps to exactly one of three outcomes. Identical for Track A and Track B
    -- stages 1-2 already carried the track/feeder specifics; stage 3 is
    uniform (D17). Phase 5 CONSUMES this (the level-3-only delete-list + the
    level-2 assistant surface) -- this module does NOT build any Phase-5
    output.
    """
    if dump_confirmation == LEVEL3_DUMP_CONFIRMED:
        return "autonomous-eligible"
    if dump_confirmation == LEVEL2_GENERALIZED:
        return "assistant-only"
    # None, the level-1 absence, or any unrecognized value -> no autonomous
    # AND no assistant trust. Conservative by construction (D13 level-1).
    return "no-signal"


# ---------------------------------------------------------------------------
# Stage 2 conservative mapping -- factored as a PURE, testable core.
# ---------------------------------------------------------------------------
# Outcomes:
#   'L3'                 -> stamp dump-confirmed (autonomously shippable)
#   'stayL2'             -> no stamp; row keeps Phase-3's level-2
#   'stayL2+overridden'  -> no stamp + count into static_dead_overridden_by_dump
#                           (the D3 "drop the accusation" operator signal:
#                           static said dead, the dump says it is live)
def classify_entity(
    track: str,
    conclusion: Optional[str],
    name: str,
    cmdlist_set: set,
    cvarlist_set: set,
    entity_type: Optional[str] = None,
) -> str:
    """The Task-1-LOCKED conservative slot-3 cross-check, as a pure function.

    Conservative on EVERY static-vs-dump disagreement: Track A drops the
    accusation (D3), Track B does not autonomously ship the name (D8).
    build-excluded NEVER reaches level-3 (OQ-3: a single runtime dump cannot
    confirm a cross-build verdict; the human-gated bucket).

    For Track A the runtime set is chosen by entity type: a cvar checks the
    CVARLIST set, a command checks the CMDLIST set. For Track B (commands
    only) the CMDLIST set is always the relevant one.

    Returns 'L3' | 'stayL2' | 'stayL2+overridden'. No I/O; no DB; no proxy.
    """
    if track == "A":
        if conclusion == CONCLUSION_BUILD_EXCLUDED:
            # OQ-3 / D20: a single runtime dump cannot confirm a cross-build
            # exclusion verdict -- L3 would over-claim. Human-gated bucket;
            # never the autonomous delete-list. Stays Phase-3 level-2.
            return "stayL2"
        if conclusion == CONCLUSION_GENUINE_DEAD:
            # The static mechanism accuses this entity of being dead. The
            # dump is the overriding answer key (D19): if the name is ABSENT
            # from its runtime set the dump CONFIRMS the kill -> level-3; if
            # PRESENT the dump REFUTES it -> conservative D3 (drop the
            # accusation, withhold level-3, surface as operator signal).
            if entity_type == "cvar":
                runtime_set = cvarlist_set
            else:
                # Track-A commands check the cmdlist runtime set.
                runtime_set = cmdlist_set
            if name in runtime_set:
                return "stayL2+overridden"
            return "L3"
        # Any unexpected Track-A conclusion -> conservative: no level-3.
        return "stayL2"

    if track == "B":
        # Track B is commands-only (D21 / D11-amended). The recovered HUD
        # command is trusted (level-3) ONLY when the runtime cmdlist actually
        # exposes it; absent -> conservative D8 (do not autonomously ship the
        # name; still a first-class level-2 entity -- D21 nothing withheld).
        if name in cmdlist_set:
            return "L3"
        return "stayL2"

    # Unknown track -> conservative no-op (defensive; the descriptor only
    # ever supplies "A"/"B").
    return "stayL2"


# ---------------------------------------------------------------------------
# Stage 1 -- HARD all-or-nothing mechanism-validation gate (D18). Pure
# COMPOSITION of the already-shipped Phase-1/2 probe scripts (X2/R5).
# ---------------------------------------------------------------------------
def _loud(msg: str) -> None:
    """Print a LOUD operator-facing banner line. Stage 1/2 RED states must be
    visible (D18 loud-fallback); a banner -- not a quiet log line."""
    sep = "=" * 64
    print(sep)
    print(msg)
    print(sep)


def _validation_record_path(fork: str) -> Path:
    return DETECTION_DIR / f"acceptance-validated-{fork}.json"


def _stamp_set_path(pin: str) -> Path:
    return DETECTION_DIR / f"level3-stamp-set-{pin}.json"


def run_stage1(descriptor: dict) -> dict:
    """Run the descriptor's Phase-1/2 probe scripts ONCE; aggregate
    all-or-nothing into a durable validation record.

    COMPOSITION ONLY: each probe is invoked as ``subprocess.run([sys.
    executable, <abs script>])`` -- this function NEVER imports or re-derives
    probe logic (X2/R5; a missing probe is a Phase-1/2 GAP surfaced LOUD, not
    patched here). ``status='GREEN'`` iff EVERY probe exits 0; ANY non-zero
    (or a missing script) -> ``status='RED'`` -> the fork emits NO signal and
    the D22 gate then falls the pipeline back to exactly today's output.

    The descriptor's probe_scripts order is fixed [callgraph, hud]; the record
    keys them 'callgraph' and 'hud' accordingly (Task-1 ADVISORY carry-forward:
    the probe scripts emit their LOUD report to STDOUT and do NOT hand it back
    structured, so the record captures the raw stdout per probe).

    Returns the written validation record (locked schema). The caller checks
    ``record['status']`` and propagates a non-zero exit on RED.
    """
    fork = descriptor["fork"]
    probe_scripts = descriptor["probe_scripts"]
    # Fixed positional contract: [0]=Phase-1 callgraph, [1]=Phase-2 hud.
    probe_keys = ["callgraph", "hud"]

    probes: dict = {}
    all_green = True

    for idx, script in enumerate(probe_scripts):
        key = probe_keys[idx] if idx < len(probe_keys) else f"probe{idx}"
        script_path = Path(script)
        if not script_path.is_file():
            all_green = False
            probes[key] = {"exit": 127, "report": ""}
            # A missing probe is a Phase-1/2 gap. Surface LOUD; do NOT
            # synthesize a replacement here (R5/X2).
            _loud(
                f"PHASE-1/2 GAP: {script} missing -- not patched here (R5/X2)"
            )
            continue
        proc = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
        )
        probes[key] = {"exit": proc.returncode, "report": proc.stdout}
        if proc.returncode != 0:
            all_green = False

    status = "GREEN" if all_green else "RED"
    record = {
        "fork": fork,
        "validation_commit": descriptor["validation_commit"],
        "status": status,
        "probes": probes,
        "validated_at": datetime.now(timezone.utc).isoformat(),
    }

    path = _validation_record_path(fork)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")

    if status == "RED":
        # D18 LOUD-fallback: the mechanism is broken OR upstream moved what
        # it models; the confidence claim is void by definition. The D22 gate
        # then suppresses all signal for this fork.
        failed = [
            f"{k} (exit={v['exit']})"
            for k, v in probes.items()
            if v["exit"] != 0
        ]
        _loud(
            f"STAGE 1 RED [{fork}] -- mechanism-validation FAILED: "
            f"{', '.join(failed)}. The fork emits NO signal; the pipeline "
            f"falls back to exactly today's output. Probe reports captured "
            f"in {path.name}."
        )

    return record


# ---------------------------------------------------------------------------
# Stage 2 -- proxy-gated conservative runtime-dump cross-check (D19/D3/D8).
# ---------------------------------------------------------------------------
def _psql_one(sql: str) -> str:
    """Run a read-only single-statement query, return raw stdout (-tA)."""
    proc = subprocess.run(_PSQL + [sql], capture_output=True, text=True)
    if proc.returncode != 0:
        # A DB read failure is fatal to stage 2 (it cannot cross-check
        # without the Phase-3 rows). Surface LOUD and let the caller treat
        # it as a non-PASS (empty stamp-set).
        _loud(
            "STAGE 2 DB READ FAILED -- cannot enumerate Phase-3 rows; "
            f"psql exited {proc.returncode}: {proc.stderr.strip()}"
        )
        raise RuntimeError("stage-2 DB read failed")
    return proc.stdout


def _read_runtime_sets(proxy: str, dump: Optional[str], tmpdir: str):
    """Obtain the runtime cmdlist + cvarlist name-sets by SHELLING OUT to the
    Task-2 proxy's --emit-runtime-sets mode.

    This is the R6 reuse-not-reinvent contract made literal: the cmdlist /
    cvarlist extraction is the banked front1-diff.sh norm() + line-range
    pipeline (path-repointed in version-pin-proxy.sh). We NEVER re-author that
    sed/awk/grep in Python -- we run the shell that owns it and read the two
    files it writes (the detection README's "do NOT reinvent it" is decisive).
    """
    args = ["bash", proxy]
    if dump:
        args.append(dump)
    args += ["--emit-runtime-sets", tmpdir]
    # The proxy's exit code is consumed by the caller's separate PASS check;
    # here we only need the emitted files. Run it without raising on the
    # exit code (the caller already gated on the proxy PASS leg).
    subprocess.run(args, capture_output=True, text=True)
    cmds_path = Path(tmpdir) / "rt-cmds.txt"
    cvars_path = Path(tmpdir) / "rt-cvars.txt"
    cmdlist_set = set(
        cmds_path.read_text(encoding="utf-8").split()
    ) if cmds_path.is_file() else set()
    cvarlist_set = set(
        cvars_path.read_text(encoding="utf-8").split()
    ) if cvars_path.is_file() else set()
    return cmdlist_set, cvarlist_set


def _empty_stamp_set(pin: str, proxy_status: str, reason: str) -> dict:
    """Build + write a stamp-set with EMPTY confirmed lists.

    Used for the two HARD zero-level-3 sub-gates: stage-1 RED, and proxy
    FAIL (broken pin). The stamp-set is STILL written (the loader consumes
    it; an absent file would be ambiguous) -- the materialization of
    "broken pin/mechanism -> nothing to stamp -> every row stays level-2"
    (D18/D19).
    """
    stamp_set = {
        "validated_commit": pin,
        "proxy": proxy_status,
        "track_a_dump_confirmed": [],
        "track_b_dump_confirmed": [],
        "static_dead_overridden_by_dump": [],
        "counts": {
            "track_a_dump_confirmed": 0,
            "track_b_dump_confirmed": 0,
            "static_dead_overridden_by_dump": 0,
            "track_a_rows_scanned": 0,
            "track_b_rows_scanned": 0,
        },
    }
    path = _stamp_set_path(pin)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(stamp_set, indent=2) + "\n", encoding="utf-8")
    _loud(reason)
    return stamp_set


def run_stage2(descriptor: dict, stage1_record: Optional[dict] = None) -> dict:
    """Conservative runtime-dump cross-check; writes the additive stamp-set.

    Preconditions, in order, each a HARD zero-level-3 sub-gate:
      1. stage-1 GREEN -- else EMPTY confirmed lists + LOUD line, return.
      2. the Task-2 proxy PASSes -- else proxy:'FAIL', EMPTY confirmed lists
         (the broken-pin -> zero-level-3 HARD sub-gate, D19) + LOUD, return.

    On both preconditions met: obtain the runtime name-sets by shelling out
    to the proxy's --emit-runtime-sets mode (R6), read every Phase-3-populated
    row at version='head' (READ-ONLY), apply the pure conservative mapping,
    and write level3-stamp-set-<pin>.json. MUTATES NOTHING in the DB (the
    Task-4 loader applies the stamp-set via the X9 ON CONFLICT path).
    """
    fork = descriptor["fork"]
    pin = descriptor["validation_commit"]
    proxy = descriptor["proxy"]
    dump = descriptor.get("dump")

    # -- Precondition 1: stage-1 GREEN. Re-read the record if not supplied. --
    if stage1_record is None:
        rec_path = _validation_record_path(fork)
        try:
            stage1_record = json.loads(rec_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            stage1_record = None
    if not stage1_record or stage1_record.get("status") != "GREEN":
        return _empty_stamp_set(
            pin,
            "FAIL",
            "STAGE 2 PRECONDITION FAILED -- stage-1 not GREEN -> zero "
            "level-3 (every Phase-3 row stays level-2; D18/D22).",
        )

    # -- Precondition 2: the Task-2 proxy is the HARD version-pin sub-gate. --
    proxy_args = ["bash", proxy]
    if dump:
        proxy_args.append(dump)
    proxy_proc = subprocess.run(proxy_args, capture_output=True, text=True)
    if proxy_proc.returncode != 0:
        # Broken pin -> ZERO level-3 (D19). The proxy already printed its
        # [FAIL] leg(s); echo its stdout so the operator sees which leg.
        return _empty_stamp_set(
            pin,
            "FAIL",
            "STAGE 2 HARD SUB-GATE FAILED -- version-pin proxy exited "
            f"{proxy_proc.returncode} (broken pin -> zero level-3; D19). "
            f"Proxy output:\n{proxy_proc.stdout.strip()}",
        )

    # -- Proxy PASS: build the runtime name-sets by shell-reuse (R6). --
    with tempfile.TemporaryDirectory(prefix="accept-rtsets-") as tmpdir:
        cmdlist_set, cvarlist_set = _read_runtime_sets(proxy, dump, tmpdir)

    if not cmdlist_set or not cvarlist_set:
        # The proxy PASSed but the emitted sets are empty -- defensive guard
        # against a silent extraction regression. Conservative: zero level-3.
        return _empty_stamp_set(
            pin,
            "FAIL",
            "STAGE 2 RUNTIME-SET EMPTY -- proxy PASSed but rt-cmds/rt-cvars "
            "came back empty; conservative zero level-3 (D19).",
        )

    # -- Read every Phase-3-populated row at the pinned-dump version. --
    # Track A: name + type + conclusion, from BOTH cvar_versions and
    # command_versions. The pipe-delimited -tA output is name|type|conclusion.
    track_a_rows = []
    for table, etype_filter in (
        ("cvar_versions", "cvar"),
        ("command_versions", "command"),
    ):
        sql = (
            f"SELECT e.name, e.type, "
            f"x.track_a_reachability->>'conclusion' "
            f"FROM {table} x JOIN entities e ON e.id = x.entity_id "
            f"WHERE x.version = '{PINNED_DUMP_VERSION}' "
            f"AND x.track_a_reachability IS NOT NULL"
        )
        out = _psql_one(sql)
        for line in out.splitlines():
            if not line:
                continue
            parts = line.split("|")
            if len(parts) < 3:
                continue
            name, etype, conclusion = parts[0], parts[1], parts[2]
            track_a_rows.append((name, etype, conclusion))

    # Track B (commands only): entity name where track_b_hud_recovery present.
    sql_b = (
        "SELECT e.name FROM command_versions x "
        "JOIN entities e ON e.id = x.entity_id "
        f"WHERE x.version = '{PINNED_DUMP_VERSION}' "
        "AND x.track_b_hud_recovery IS NOT NULL"
    )
    track_b_rows = [
        line for line in _psql_one(sql_b).splitlines() if line
    ]

    # -- Apply the pure conservative mapping. --
    track_a_dump_confirmed: list = []
    static_dead_overridden_by_dump: list = []
    for name, etype, conclusion in track_a_rows:
        verdict = classify_entity(
            "A", conclusion, name, cmdlist_set, cvarlist_set,
            entity_type=etype,
        )
        if verdict == "L3":
            track_a_dump_confirmed.append(name)
        elif verdict == "stayL2+overridden":
            static_dead_overridden_by_dump.append(name)
        # 'stayL2' -> no list membership (keeps Phase-3 level-2).

    track_b_dump_confirmed: list = []
    for name in track_b_rows:
        verdict = classify_entity(
            "B", None, name, cmdlist_set, cvarlist_set,
        )
        if verdict == "L3":
            track_b_dump_confirmed.append(name)
        # 'stayL2' -> conservative D8 (not autonomously shipped; still L2).

    track_a_dump_confirmed.sort()
    track_b_dump_confirmed.sort()
    static_dead_overridden_by_dump.sort()

    stamp_set = {
        "validated_commit": pin,
        "proxy": "PASS",
        "track_a_dump_confirmed": track_a_dump_confirmed,
        "track_b_dump_confirmed": track_b_dump_confirmed,
        "static_dead_overridden_by_dump": static_dead_overridden_by_dump,
        "counts": {
            "track_a_dump_confirmed": len(track_a_dump_confirmed),
            "track_b_dump_confirmed": len(track_b_dump_confirmed),
            "static_dead_overridden_by_dump": len(
                static_dead_overridden_by_dump
            ),
            "track_a_rows_scanned": len(track_a_rows),
            "track_b_rows_scanned": len(track_b_rows),
        },
    }
    path = _stamp_set_path(pin)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(stamp_set, indent=2) + "\n", encoding="utf-8")

    if static_dead_overridden_by_dump:
        # OPERATOR SIGNAL, LOUD-but-non-fatal: stage 2 doing its job (D3 "the
        # runtime dump mops residue"). NOT a stage-1 all-or-nothing failure.
        _loud(
            f"STAGE 2 OPERATOR SIGNAL -- "
            f"{len(static_dead_overridden_by_dump)} static-dead entit(ies) "
            f"OVERRIDDEN by the runtime dump (present at runtime; the "
            f"accusation was dropped, D3). Not a failure; non-fatal."
        )

    return stamp_set


# ---------------------------------------------------------------------------
# D22 structural-gate binding point -- fail-safe-CLOSED (D22/X4).
# ---------------------------------------------------------------------------
def validation_record_ok(fork: str, current_pin: str) -> bool:
    """True ONLY iff the validation record exists AND status=='GREEN' AND the
    recorded validation_commit agrees with current_pin.

    PIN-MATCH SEMANTICS -- PREFIX-TOLERANT (case-insensitive): True if either
    string is a prefix of the other.

    WHY prefix-tolerant rather than exact ``==``: the F7 PRIMARY proxy leg
    itself asserts the dump's embedded ``version``-command banner SHA is a
    PREFIX of the full 40-char ``oracle_meta ezquake:source_repo_commit``
    (the dump self-certifies via the short prefix ``3f9e724fa``). The
    descriptor/record ``validation_commit`` is the short pin token
    ``3f9e724f`` while Task 4 passes the FULL 40-char ``oracle_meta`` value
    as ``current_pin``. An exact ``==`` would never match those two -- so
    prefix-tolerance is the faithful realization of the D22
    "validation_commit == current_pin" gate GIVEN F7's prefix
    self-certification. The locked SHAPE (exists AND GREEN AND pin-agreement)
    is unchanged; only the string-comparison mechanic -- the part Task 1
    explicitly left to synthesis -- is realized here.

    FAIL-SAFE-CLOSED: any read/parse failure (missing file, bad JSON, missing
    key, type error) -> return False. The D22 gate's False branch falls the
    pipeline back to exactly today's output (D22/X4). Pure read; NEVER writes.
    """
    try:
        path = _validation_record_path(fork)
        record = json.loads(path.read_text(encoding="utf-8"))
        if record.get("status") != "GREEN":
            return False
        recorded = record.get("validation_commit")
        if not recorded or not current_pin:
            return False
        a = str(recorded).lower()
        b = str(current_pin).lower()
        # Prefix-tolerant either-direction: the record holds the short token,
        # Task 4 supplies the full hash (F7 self-certifies via a prefix).
        return a.startswith(b) or b.startswith(a)
    except (OSError, ValueError, TypeError, KeyError):
        # Fail-safe-CLOSED -- a record we cannot trust is a record that
        # withholds the signal (D22/X4).
        return False
