"""Track-A serialization seam (enforce-L1-runtime-truth Phase 3, OQ-1).

WHY this file exists
--------------------
The callgraph passenger (extractor_lib/_callgraph.py) produces a 3-valued
reachability verdict per registered entity at the MECHANISM layer. Phase 3
re-shapes that mechanism verdict into the LOCKED L1 three-slot spine
{conclusion, evidence, dump_confirmation} and writes it as an ADDITIVE
10th extractor file so the TypeScript loader can overlay it onto the
existing cvar_versions / command_versions rows.

This seam consumes the PUBLIC `_callgraph.reachable()` contract READ-ONLY.
It NEVER re-parses, NEVER re-runs the post-walk/BFS (D6 -- re-paying the
parse/BFS is rejected), and NEVER re-derives a verdict cell. The
mechanism->L1 transform is SHAPE-ONLY (F5 OPAQUE round-trip): every value
`reachable()` returns is copied through verbatim; only the JSON STRUCTURE
is relocated to match the locked spine.

ADDITIVE-WRITE invariant (X3): this seam writes ONLY
`ezquake-callgraph-reachability-ast.json`. The 8 F6 byte-identical stems
and the 9th hud-commands file are byte-untouched -- this module never
opens them.

dump_confirmation is the CONSTANT "high-confidence-generalized" for EVERY
populated row (D13/D14 slot-3 representation rule). This seam NEVER writes
"dump-confirmed" -- the stage-2 stamp (the runtime-dump cross-check, D19)
is the Task-4 loader's job, applied via the X9 ON CONFLICT upsert path.

D22 STRUCTURAL GATE (Phase 4 / Task 4)
--------------------------------------
Before the additive 10th-file write, emit() consults the SHIPPED
acceptance validation record via _acceptance.validation_record_ok('ezquake',
<current oracle_meta pin>). This binds the acceptance gate to the pipeline
STRUCTURALLY: if ezQuake is not mechanism-validated GREEN at the current
pin (RED / record absent / wrong-commit), NO 10th file is written -> the
Track-A overlay (extract-tag.ts 3f) finds nothing (existsSync skip-and-log)
-> track_a_reachability stays NULL -> the pipeline falls back to EXACTLY
today's output (D18/D22, fail-safe-CLOSED). This REUSES the Phase-1
fail-safe shape (a guard biased to today's pipeline); it adds NO new
exception machinery. The 8 F6 byte-identical stems are untouched either
way -- emit_callgraph_signal.py only ever writes the 10th file (X3).
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import extractor_lib._acceptance as _acceptance
import extractor_lib._callgraph as _callgraph

# The single additive output. Lives in the SAME output dir as the 8+1
# existing files; the loader joins its entries to entities by name_fold.
OUTPUT_FILENAME = "ezquake-callgraph-reachability-ast.json"

# Slot-3 is a Phase-3 CONSTANT. See module docstring / D13.
DUMP_CONFIRMATION_LEVEL2 = "high-confidence-generalized"


def _spine_from_mechanism(mech: dict) -> dict:
    """Apply the Track-A mechanism->L1 transform (a)-(e).

    The mechanism `reachable()` return is the TOP-LEVEL shape
    {conclusion, feeder, evidence}. The locked L1 spine is
    {conclusion, evidence, dump_confirmation} where `feeder` has been
    RELOCATED into `evidence`. Every leaf value is copied UNCHANGED --
    this function only moves keys around (F5 shape-only).
    """
    conclusion = mech["conclusion"]  # (d) copied through unchanged
    feeder = mech["feeder"]          # (a) relocated below into evidence
    mech_ev = mech["evidence"]

    if feeder == _callgraph.FEEDER_CALLGRAPH:
        # (b) mechanism evidence is FLAT
        #   {client, server, win, apple, address_taken_residue}
        # -> L1 evidence nests the 4 variant cells under per_variant and
        # hoists the residue flag as a sibling. The 4 cells + the bool are
        # copied UNCHANGED (never re-derived / never normalized -- a
        # "not-compiled" cell stays "not-compiled", D5).
        evidence = {
            "feeder": _callgraph.FEEDER_CALLGRAPH,
            "per_variant": {
                "client": mech_ev[_callgraph.VARIANT_CLIENT],
                "server": mech_ev[_callgraph.VARIANT_SERVER],
                "win": mech_ev[_callgraph.VARIANT_WIN],
                "apple": mech_ev[_callgraph.VARIANT_APPLE],
            },
            "address_taken_residue": mech_ev["address_taken_residue"],
        }
    elif feeder == _callgraph.FEEDER_COMMENTED_REGISTER:
        # (c) mechanism evidence is {"commented_register": "<file>:<line>"}
        # (a single STRING). rsplit on the LAST ':' so a Windows-ish path
        # or a path containing ':' keeps everything before the final
        # separator as the file and the trailing token as the line. The
        # line is copied through as an int (the cite is always "<f>:<n>").
        cite = mech_ev["commented_register"]
        source_file, _, line_str = cite.rpartition(":")
        evidence = {
            "feeder": _callgraph.FEEDER_COMMENTED_REGISTER,
            "register_site": {
                "source_file": source_file,
                "source_line": int(line_str),
            },
        }
    else:
        # _callgraph.reachable() only ever returns the two feeders above.
        # An unknown feeder is a contract breach -- fail LOUD rather than
        # ship a malformed spine into an autonomously-consumed KB.
        raise ValueError(f"emit_callgraph_signal: unknown feeder {feeder!r}")

    # (e) dump_confirmation is the Phase-3 constant for EVERY populated row.
    return {
        "conclusion": conclusion,
        "evidence": evidence,
        "dump_confirmation": DUMP_CONFIRMATION_LEVEL2,
    }


def _entity_names(finalize_output: dict, key: str) -> list[str]:
    """Pull the entity-name keyset from a handler's finalize() output.

    `commands` finalize -> {"commands": {<name>: ...}, ...}
    `cvars`    finalize -> {"vars":     {<name>: ...}, ...}
    These are EXACTLY the names the TypeScript per-type loaders key on, so
    the 10th file's keys are guaranteed to name_fold-join to the rows the
    loader already inserted. Reusing the already-computed finalize output
    means ZERO re-parse and ZERO re-finalize work in this seam.
    """
    section = finalize_output.get(key) or {}
    return list(section.keys())


def build_signal(commands_finalize: dict, cvars_finalize: dict) -> dict:
    """Build the 10th-file payload from the two finalize outputs.

    For every command + cvar name the handlers emitted, query the PUBLIC
    `_callgraph.reachable()` (read-only) and store the transformed spine
    keyed by "<type>::<name>". `reachable()` is itself fail-safe (X4): an
    entity with no callgraph/commented evidence comes back
    build-excluded/reachable, never a false genuine-dead -- so emitting a
    row for EVERY emitted entity (exhaustive, no hand-picked subset) is
    safe; the loader overlays only where an entity actually matches.
    """
    entries: dict[str, dict] = {}

    def _add(entity_type: str, name: str) -> None:
        mech = _callgraph.reachable(name, entity_type)
        spine = _spine_from_mechanism(mech)
        entries[f"{entity_type}::{name}"] = {
            "type": entity_type,
            "name": name,
            "spine": spine,
        }

    for cmd_name in _entity_names(commands_finalize, "commands"):
        _add("command", cmd_name)
    for cvar_name in _entity_names(cvars_finalize, "vars"):
        _add("cvar", cvar_name)

    feeders = {"callgraph": 0, "commented-register": 0}
    conclusions = {"genuine-dead": 0, "build-excluded": 0}
    for e in entries.values():
        feeders[e["spine"]["evidence"]["feeder"]] = (
            feeders.get(e["spine"]["evidence"]["feeder"], 0) + 1
        )
        conclusions[e["spine"]["conclusion"]] = (
            conclusions.get(e["spine"]["conclusion"], 0) + 1
        )

    return {
        "project": "ezquake",
        "entries": entries,
        "_stats": {
            "total": len(entries),
            "by_feeder": feeders,
            "by_conclusion": conclusions,
        },
    }


# ---------------------------------------------------------------------------
# D22 structural gate (Phase 4 / Task 4) -- fail-safe-CLOSED.
# ---------------------------------------------------------------------------
# The fork this seam serves. emit_callgraph_signal.py is the single ezQuake
# Track-A instantiation; the gate predicate (_acceptance.validation_record_ok)
# is fork-parameterized and engine-agnostic (extractor_lib house rule).
_FORK = "ezquake"

# The oracle_meta key that records the FULL 40-char source commit the DB was
# extracted at. _acceptance.validation_record_ok is prefix-tolerant: the
# validation record holds the SHORT pin token, this value is the full hash
# (the F7 dump self-certifies via the short prefix).
_PIN_META_KEY = "ezquake:source_repo_commit"


def _current_pin() -> str:
    """Read the current source-repo commit from oracle_meta.

    Uses the SAME read-only psql invocation _acceptance.run_stage2 uses
    (extractor_lib._acceptance._PSQL) -- one psql shape across the gate.
    Returns "" on any read failure; the empty string makes
    validation_record_ok return False (fail-safe-CLOSED: a pin we cannot
    read is a pin we do not trust)."""
    try:
        proc = subprocess.run(
            _acceptance._PSQL
            + [f"SELECT value FROM oracle_meta WHERE key='{_PIN_META_KEY}'"],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            return ""
        return proc.stdout.strip()
    except OSError:
        # docker/psql not invokable -> no pin -> gate closes (today's
        # pipeline). NEVER raise -- this is the Phase-1 fail-safe shape.
        return ""


def _gate_status(pin: str) -> str:
    """Classify WHY the D22 gate is closed, for the LOUD banner.

    Pure read of the SHIPPED validation record (never writes). One of:
      'absent'       -- no record file at all.
      'RED'          -- record exists but status != GREEN (mechanism
                         broke OR upstream moved what it models).
      'wrong-commit' -- record GREEN but its validation_commit does not
                         agree with the current pin (prefix-tolerant; the
                         dump cross-check would be version-noise).
    Defensive default 'absent' if the record is unreadable -- the gate is
    already closed (validation_record_ok False); this only labels it."""
    try:
        path = _acceptance._validation_record_path(_FORK)
        record = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return "absent"
    if record.get("status") != "GREEN":
        return "RED"
    return "wrong-commit"


def emit(commands_finalize: dict, cvars_finalize: dict, output_dir: Path) -> Path | None:
    """Serialize the Track-A signal to the additive 10th file -- IFF the
    D22 structural gate is open.

    The caller invokes this ONLY when the callgraph passenger is on
    (ENABLE_CALLGRAPH_PASSENGER) and AFTER the post-walk has run
    (run_postwalk + feed_commented_registrations), so
    `_callgraph.reachable()` answers from real post-walk state rather than
    the all-safe fallback.

    D22 (Phase 4 / Task 4): before writing the 10th file, check
    `_acceptance.validation_record_ok(_FORK, <current oracle_meta pin>)`.
      - True  -> proceed EXACTLY as Phase 3: write the file, behaviour
                 byte-identical. Returns the written path.
      - False -> write NOTHING (no 10th file) + a LOUD banner; return
                 None. The Track-A overlay (extract-tag.ts 3f) then logs-
                 and-skips on its existsSync guard -> track_a_reachability
                 stays NULL for every row -> EXACTLY today's pipeline
                 (D18/D22 fail-safe-CLOSED). REUSES the Phase-1 fail-safe
                 shape; adds NO new exception machinery.
    """
    pin = _current_pin()
    if not _acceptance.validation_record_ok(_FORK, pin):
        status = _gate_status(pin)
        pin_label = pin if pin else "<unreadable>"
        # LOUD operator-facing banner (mirrors _acceptance._loud's 64-char
        # rule). RED/absent/wrong-commit must be visible -- not a quiet log.
        sep = "=" * 64
        print(sep, file=sys.stderr)
        print(
            f"D22 GATE: ezquake not mechanism-validated at {pin_label} "
            f"-> NO Track-A signal (today's pipeline). status={status}",
            file=sys.stderr,
        )
        print(sep, file=sys.stderr)
        return None

    payload = build_signal(commands_finalize, cvars_finalize)
    out_path = Path(output_dir) / OUTPUT_FILENAME
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return out_path
