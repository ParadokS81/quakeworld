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
populated row (D13/D14 slot-3 representation rule). Phase 3 NEVER writes
"dump-confirmed" -- that is Phase 4 / D19 (the runtime-dump cross-check).
"""

from __future__ import annotations

import json
from pathlib import Path

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


def emit(commands_finalize: dict, cvars_finalize: dict, output_dir: Path) -> Path:
    """Serialize the Track-A signal to the additive 10th file.

    Returns the written path. The caller invokes this ONLY when the
    callgraph passenger is on (ENABLE_CALLGRAPH_PASSENGER) and AFTER the
    post-walk has run (run_postwalk + feed_commented_registrations), so
    `_callgraph.reachable()` answers from real post-walk state rather than
    the all-safe fallback.
    """
    payload = build_signal(commands_finalize, cvars_finalize)
    out_path = Path(output_dir) / OUTPUT_FILENAME
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return out_path
