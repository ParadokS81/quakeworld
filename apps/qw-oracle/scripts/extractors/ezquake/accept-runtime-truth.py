#!/usr/bin/env python3
"""ezQuake instantiation of the three-stage acceptance contract
(enforce-L1-runtime-truth Phase 4 / Task 3).

This is the SINGLE ezQuake instantiation of the engine-general
``extractor_lib._acceptance`` module. It supplies the Task-1-LOCKED ezQuake
descriptor and drives the three shared stages:

  stage 1  -- HARD all-or-nothing mechanism-validation gate: subprocess-runs
              the SHIPPED Phase-1 (verify-callgraph-probes.py) and Phase-2
              (verify-hud-probes.py) probe scripts and aggregates
              all-or-nothing (X2/R5 -- pure composition, NO re-authored probe
              logic). Writes acceptance-validated-ezquake.json.
  stage 2  -- proxy-gated conservative runtime-dump cross-check: invokes the
              Task-2 version-pin-proxy.sh as the HARD sub-gate, reads the
              Phase-3 rows READ-ONLY, applies the conservative slot-3 mapping,
              writes level3-stamp-set-3f9e724f.json. ZERO DB mutation here
              (the Task-4 loader applies the stamp-set via X9).
  stage 3  -- the pure route_by_level predicate is smoke-checked (it is total;
              "STAGE 3 OK" means it imports and the predicate is total).

The ABSENCE of any other fork descriptor IS the off-by-default toggle
(D2/D22): no other fork is wired by this arc.

X10: ASCII only -- ``--`` for dashes, no em/en-dash, no emoji. Comments
explain WHY, not WHAT.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# scripts/extractors/ezquake/ -> ... -> <repo>. Five .parent hops, identical
# depth-resolution to the house idiom in verify-unified-output.py
# (REPO_ROOT = HERE.parent x5; verified: resolves to the monorepo root).
HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent.parent.parent
EXTRACTORS_ROOT = HERE.parent  # apps/qw-oracle/scripts/extractors/

# The shared acceptance module lives under extractor_lib/. Put extractors/
# on sys.path so ``import extractor_lib._acceptance`` resolves regardless of
# the caller's working directory (same pattern the probe siblings use).
if str(EXTRACTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXTRACTORS_ROOT))

import extractor_lib._acceptance as acc  # noqa: E402 -- after sys.path fix


# The Task-1-LOCKED ezQuake descriptor. The probe_scripts order is the fixed
# positional contract [callgraph (Phase 1, Track A), hud (Phase 2, Track B)].
# validation_commit is the SHORT pin token (the dump self-certifies via this
# prefix -- F7); Task 4 will pass the full 40-char oracle_meta value to
# validation_record_ok, which is prefix-tolerant for exactly that reason.
_DETECTION_DIR = REPO_ROOT / "apps" / "qw-oracle" / "data" / "detection"

EZQUAKE_DESCRIPTOR = {
    "fork": "ezquake",
    "validation_commit": "3f9e724f",
    "probe_scripts": [
        str(HERE / "verify-callgraph-probes.py"),  # Phase 1 -- Track A
        str(HERE / "verify-hud-probes.py"),        # Phase 2 -- Track B
    ],
    "tracks": ["A", "B"],
    "dump": str(_DETECTION_DIR / "entities-runtime-dump-3f9e724f.txt"),
    "proxy": str(_DETECTION_DIR / "version-pin-proxy.sh"),
}


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument(
        "--stage",
        choices=["1", "2", "all"],
        default="all",
        help="Which stage(s) to run (default: all -> 1 -> 2 -> 3).",
    )
    args = ap.parse_args()

    run_1 = args.stage in ("1", "all")
    run_2 = args.stage in ("2", "all")
    run_3 = args.stage == "all"

    stage1_record = None

    # -- Stage 1: HARD all-or-nothing mechanism-validation gate (D18). --
    if run_1:
        stage1_record = acc.run_stage1(EZQUAKE_DESCRIPTOR)
        if stage1_record.get("status") != "GREEN":
            # run_stage1 already printed the LOUD STAGE 1 RED banner with the
            # failing probe(s); the captured probe reports are in the record.
            print("STAGE 1 RED")
            return 1
        print("STAGE 1 GREEN")

    # -- Stage 2: proxy-gated conservative cross-check (D19/D3/D8). --
    if run_2:
        stamp_set = acc.run_stage2(EZQUAKE_DESCRIPTOR, stage1_record)
        if stamp_set.get("proxy") != "PASS":
            # run_stage2 already printed the LOUD sub-gate banner (stage-1 RED
            # precondition OR broken-pin proxy FAIL -> zero level-3, D19).
            print("STAGE 2 FAIL")
            return 1
        print("STAGE 2 GREEN")

    # -- Stage 3: the pure routing predicate is total; smoke it. --
    if run_3:
        # route_by_level is pure/total -- "STAGE 3 OK" means it imports and
        # the three-way predicate is total over the representative inputs.
        # Phase 5 CONSUMES it; this phase does NOT build any Phase-5 output.
        ok = (
            acc.route_by_level("dump-confirmed") == "autonomous-eligible"
            and acc.route_by_level("high-confidence-generalized")
            == "assistant-only"
            and acc.route_by_level(None) == "no-signal"
        )
        if not ok:
            sep = "=" * 64
            print(sep)
            print("STAGE 3 RED -- route_by_level predicate is not total")
            print(sep)
            return 1
        print("STAGE 3 OK")

    return 0


if __name__ == "__main__":
    sys.exit(main())
