"""Parallel-vs-serial equivalence test for ProtocolMvdsvHandler.

Certifies that ProtocolMvdsvHandler (MACRO_DEFINITION walk) produces
identical output regardless of worker count.

Risk class: MACRO_DEFINITION walk. Each .c file that includes protocol.h
emits all protocol macros when its TU root is scanned. Workers process
disjoint file chunks. source_total = N_macros * N_c_files_with_protocol_h
must be invariant because the same total files are processed regardless of
worker split. finalize() cross-file dedup in the parent collapses duplicates.

Prerequisites:
  - libclang 18 must be installed and loadable as libclang-18.so.1.
  - Requires the MVDSV research repo at research/repos/mvdsv/ relative to
    the monorepo root.

Run from the monorepo root:
  python3 -m pytest apps/qw-oracle/scripts/extractors/mvdsv/tests/test_handler_protocol_parallel_serial.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
MVDSV_HANDLER_DIR = HERE.parent          # apps/qw-oracle/scripts/extractors/mvdsv/
EXTRACTORS_ROOT = MVDSV_HANDLER_DIR.parent  # apps/qw-oracle/scripts/extractors/

# parents[0] = mvdsv, parents[1] = extractors, parents[2] = scripts,
# parents[3] = qw-oracle, parents[4] = apps, parents[5] = quakeworld root
MVDSV_REPO = HERE.parents[5] / "research" / "repos" / "mvdsv"

EXTRACT_PY = MVDSV_HANDLER_DIR / "extract.py"

sys.path.insert(0, str(MVDSV_HANDLER_DIR))
sys.path.insert(0, str(EXTRACTORS_ROOT))

if not MVDSV_REPO.exists():
    pytest.skip(
        f"MVDSV repo not at {MVDSV_REPO}; clone it to run these tests.",
        allow_module_level=True,
    )

from extractor_lib.tests import assert_parallel_serial_equivalent  # noqa: E402


def test_parallel_serial_equivalence(tmp_path):
    """MACRO_DEFINITION walk: serial and parallel must produce identical output.

    Pre-condition: ProtocolMvdsvHandler.end_file() resets _seen_in_file per
    file (per-file dedup, not cross-worker).  finalize() deduplicates via
    the all_rows driver-passed parameter.  source_total = len(all_rows)
    before dedup, which equals N_macros_per_c_file * N_c_files_with_protocol_h
    regardless of how many workers split the file list.

    If this test fails (source_total differs), the most likely cause is a
    new per-worker cross-file dedup being introduced in visit_cursor or
    end_file without a matching finalize-time dedup on the driver-merged
    all_rows.
    """
    serial_output, parallel_output = assert_parallel_serial_equivalent(
        extract_py=EXTRACT_PY,
        repo_root=MVDSV_REPO,
        handler_name="protocol",
        output_filename="mvdsv-protocol-messages-ast.json",
        tmp_path=tmp_path,
    )

    # Protocol message count: finalize dedup produces the same unique set
    # regardless of worker count.
    assert len(serial_output["protocol_messages"]) == len(parallel_output["protocol_messages"]), (
        f"Protocol message count differs: workers=1 -> "
        f"{len(serial_output['protocol_messages'])}, "
        f"workers=4 -> {len(parallel_output['protocol_messages'])}. "
        "Finalize cross-file dedup must produce the same unique set."
    )

    # source_total: raw pre-dedup emissions. Must be worker-count-invariant.
    serial_total = serial_output["_stats"]["source_total"]
    parallel_total = parallel_output["_stats"]["source_total"]
    assert serial_total == parallel_total, (
        f"source_total differs: workers=1 -> {serial_total}, "
        f"workers=4 -> {parallel_total}. "
        "source_total = N_macros * N_c_files_with_protocol_h and must not "
        "depend on worker count."
    )
    assert serial_total > 0, (
        f"source_total must be positive (raw pre-dedup emissions). Got {serial_total}."
    )

    # Row-level equivalence: same protocol messages regardless of worker count.
    serial_msgs   = sorted(serial_output["protocol_messages"],   key=lambda r: r["name"])
    parallel_msgs = sorted(parallel_output["protocol_messages"], key=lambda r: r["name"])
    assert serial_msgs == parallel_msgs, (
        "Protocol message rows differ between serial and parallel runs. "
        "Inspect ast.kind and ast.value fields for per-worker vs finalize "
        "dedup divergence."
    )
