#!/usr/bin/env python3
"""MVDSV Layer 1 AST extraction driver.

Walks src/*.c at the top level of the MVDSV repo under three variants
(server-base / server+Win / server+Linux) per file, dispatching to per-type
handlers. Mirrors the FTE driver's chunked-pool shape; differs in:
  - Single source root (no plugin tree); SOURCE_ROOTS collapses to one label.
  - All variants dispatch with variant="server"; MVDSV is always server-only,
    the three variants exist to surface platform-conditional code paths.
  - Top-level src/*.c only; the qwprot submodule under src/qwprot/ is
    header-only and reachable via -I in the clang args, not parsed as TUs.

Architecture mirrors FTE:
  - Per-handler setup() runs once in the parent (before Pool fork).
  - Pre-fork globals (_WORKER_HANDLERS, _WORKER_CLANG_*) populated in parent;
    fork mode copy-on-write inherits them into workers without pickling.
  - multiprocessing.Pool (fork mode) over pre-chunked task lists; chunksize=1
    so the Pool does not re-chunk our pre-split units of work.
  - Inside each worker: per file does 3 TU parses (one per variant), each
    dispatched through walk_tu_dispatch.
  - --workers 1 falls back to a serial loop for debugging.

Usage:
    python3 extract.py \\
        --repo-root research/repos/mvdsv \\
        --output-dir apps/qw-oracle/scripts/extractors/mvdsv/output \\
        --handlers all \\
        --workers 12
"""
from __future__ import annotations

import argparse
import json
import multiprocessing as mp
import os
import sys
import time
from pathlib import Path

from clang.cindex import Config, Index

Config.set_library_file("libclang-18.so.1")

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))

from extractor_lib.clang_config import (  # noqa: E402
    PARSE_OPTS,
    clang_args_mvdsv_for,
    clang_args_mvdsv_win_for,
    clang_args_mvdsv_linux_for,
)
from extractor_lib._visitor import walk_tu_dispatch  # noqa: E402

REPO_ROOT_DEFAULT = HERE.parent.parent.parent.parent.parent
MVDSV_REPO_DEFAULT = REPO_ROOT_DEFAULT / "research/repos/mvdsv"
OUTPUT_DIR_DEFAULT = HERE / "output"

# Single source-root label. MVDSV has no plugin tree; this exists so handlers
# that read current_source_root see a stable value matching the FTE/QWCL idiom.
SOURCE_ROOT_LABEL = "server"

# Each entry: (variant_name, clang_args_func). All three dispatch as
# variant="server" in walk_tu_dispatch -- MVDSV is always server-only; the
# variant axis here is platform conditionals (Win / Linux) layered on the
# CMakeLists base. Per-variant arg lists differ; the dispatch label does not.
VARIANT_FUNCS = [
    ("server", clang_args_mvdsv_for),
    ("server", clang_args_mvdsv_win_for),
    ("server", clang_args_mvdsv_linux_for),
]


def collect_handlers(names: str = "all") -> dict:
    """Lazy import handlers -- added one by one across Tasks 6-12.
    Returns dict[name, handler_instance] for the requested names (or all).
    """
    from _handler_cvars import CvarsMvdsvHandler
    from _handler_commands import CommandsMvdsvHandler
    from _handler_cmdline import CmdlineMvdsvHandler
    from _handler_protocol import ProtocolMvdsvHandler
    from _handler_info_keys import InfoKeysMvdsvHandler
    from _handler_log_templates import LogTemplatesMvdsvHandler
    available: dict = {
        "cvars": CvarsMvdsvHandler(),
        "commands": CommandsMvdsvHandler(),
        "cmdline": CmdlineMvdsvHandler(),
        "protocol": ProtocolMvdsvHandler(),
        "info_keys": InfoKeysMvdsvHandler(),
        "log_templates": LogTemplatesMvdsvHandler(),
    }
    if names == "all":
        return available
    requested = {n.strip() for n in names.split(",") if n.strip()}
    return {k: v for k, v in available.items() if k in requested}


# ----- worker-process state --------------------------------------------------
# Set in the PARENT before Pool.map() via the pre-fork globals pattern
# (fork mode: copy-on-write, no pickling). Do not mutate after fork.

_WORKER_HANDLERS: list = []
_WORKER_CLANG_BASE: list[str] = []
_WORKER_CLANG_WIN: list[str] = []
_WORKER_CLANG_LINUX: list[str] = []


def _worker_process_chunk(tasks: list[str]) -> tuple[dict, list]:
    """Process a chunk of file-path strings in a worker.

    Creates one libclang Index for the whole chunk (kept warm across files).
    For each file: 3 TU parses (one per variant), walk_tu_dispatch, end_file.

    Returns (local_rows, local_diag):
      local_rows -- dict[handler_name, list[row_dict]]
      local_diag -- list of diagnostic strings
    """
    idx = Index.create()
    local_rows: dict[str, list[dict]] = {h.name: [] for h in _WORKER_HANDLERS}
    local_diag: list[str] = []

    variant_args = [
        ("server", _WORKER_CLANG_BASE),
        ("server", _WORKER_CLANG_WIN),
        ("server", _WORKER_CLANG_LINUX),
    ]

    for file_path_str in tasks:
        path = Path(file_path_str)

        try:
            source_bytes = path.read_bytes()
        except OSError as e:
            local_diag.append(f"{path.name}: read failed: {e}")
            continue

        for h in _WORKER_HANDLERS:
            h.start_file(source_path=path, source_bytes=source_bytes)

        for variant_name, clang_args in variant_args:
            tu = idx.parse(file_path_str, args=clang_args, options=PARSE_OPTS)
            try:
                walk_tu_dispatch(
                    tu,
                    _WORKER_HANDLERS,
                    variant_name,
                    file_path_str,
                    source_root=SOURCE_ROOT_LABEL,
                )
            except Exception as e:
                local_diag.append(f"{path.name} [{variant_name}|walk]: {type(e).__name__}: {e}")

        for h in _WORKER_HANDLERS:
            try:
                rows = h.end_file()
                local_rows[h.name].extend(rows)
            except Exception as e:
                local_diag.append(f"{path.name} [{h.name}.end_file]: {type(e).__name__}: {e}")

    return local_rows, local_diag


def _run_serial(
    tasks: list[str],
    handlers: list,
    progress_every: int,
) -> tuple[dict, list]:
    """Serial fallback. Used when --workers 1."""
    rows_by_handler: dict[str, list[dict]] = {h.name: [] for h in handlers}
    diagnostics: list[str] = []
    t0 = time.perf_counter()

    for i, file_path_str in enumerate(tasks, 1):
        path = Path(file_path_str)
        try:
            source_bytes = path.read_bytes()
        except OSError as e:
            diagnostics.append(f"{path.name}: read failed: {e}")
            continue

        idx = Index.create()
        target_str = file_path_str

        for h in handlers:
            h.start_file(source_path=path, source_bytes=source_bytes)

        # Use the same pre-resolved arg lists as parallel workers.
        serial_variant_args = [
            ("server", _WORKER_CLANG_BASE),
            ("server", _WORKER_CLANG_WIN),
            ("server", _WORKER_CLANG_LINUX),
        ]
        for variant_name, clang_args in serial_variant_args:
            tu = idx.parse(target_str, args=clang_args, options=PARSE_OPTS)
            try:
                walk_tu_dispatch(
                    tu,
                    handlers,
                    variant_name,
                    target_str,
                    source_root=SOURCE_ROOT_LABEL,
                )
            except Exception as e:
                diagnostics.append(f"{path.name} [{variant_name}|walk]: {type(e).__name__}: {e}")

        for h in handlers:
            try:
                rows_by_handler[h.name].extend(h.end_file())
            except Exception as e:
                diagnostics.append(f"{path.name} [{h.name}.end_file]: {type(e).__name__}: {e}")

        if progress_every and i % progress_every == 0:
            elapsed = time.perf_counter() - t0
            rate = i / elapsed if elapsed > 0 else 0
            print(f"  [progress] {i} files in {elapsed:.1f}s ({rate:.1f} files/s)")

    return rows_by_handler, diagnostics


def _run_parallel(
    tasks: list[str],
    handlers: list,
    workers: int,
    chunk_size: int,
) -> tuple[dict, list]:
    """Parallel path: forked Pool, chunked map, ordered result merge.

    Tasks are pre-split into sub-lists of chunk_size before submission.
    Pool.map chunksize=1 because our chunks are already the unit of work --
    letting Pool re-chunk would break the 2x over-dispatch load-balance goal.
    """
    chunks = [tasks[i:i + chunk_size] for i in range(0, len(tasks), chunk_size)]
    print(f"  parallel: {workers} workers, {len(chunks)} chunks of ~{chunk_size} files ({len(tasks)} total)")

    ctx = mp.get_context("fork")
    with ctx.Pool(processes=workers) as pool:
        results = pool.map(_worker_process_chunk, chunks, chunksize=1)

    # Deterministic merge: iterate results in input order.
    rows_by_handler: dict[str, list[dict]] = {h.name: [] for h in handlers}
    diagnostics: list[str] = []
    for local_rows, local_diag in results:
        for name, rows in local_rows.items():
            rows_by_handler[name].extend(rows)
        diagnostics.extend(local_diag)

    return rows_by_handler, diagnostics


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--repo-root", default=None,
                    help="MVDSV repo path (default: research/repos/mvdsv)")
    ap.add_argument("--output-dir", default=None,
                    help="Output JSON directory (default: extractors/mvdsv/output)")
    ap.add_argument("--handlers", default="all",
                    help="Comma-separated handler names or 'all'")
    ap.add_argument("--workers", type=int, default=12,
                    help="Parallel worker processes. 1 = serial. 0 = auto (cpu_count).")
    ap.add_argument("--chunk-size", type=int, default=0,
                    help="Files per chunk. 0 = auto (len(tasks) / (workers*2), min 1).")
    ap.add_argument("--limit-files", type=int, default=0,
                    help="Stop after N files (0 = no limit). Useful for smoke tests.")
    ap.add_argument("--progress-every", type=int, default=10,
                    help="Serial mode: print a progress line every N files (0 to disable).")
    return ap.parse_args()


def _list_source_files(mvdsv_src: Path) -> list[Path]:
    """Top-level src/*.c only. The qwprot submodule under src/qwprot/ is
    header-only and is reached via -I in the clang args, not parsed as a TU.
    Subdirectories under src/ (if any) are not enumerated."""
    return sorted(mvdsv_src.glob("*.c"))


def main() -> int:
    global _WORKER_HANDLERS, _WORKER_CLANG_BASE, _WORKER_CLANG_WIN, _WORKER_CLANG_LINUX

    args = parse_args()
    mvdsv_repo = Path(args.repo_root).resolve() if args.repo_root else MVDSV_REPO_DEFAULT
    mvdsv_src = mvdsv_repo / "src"
    output_dir = Path(args.output_dir).resolve() if args.output_dir else OUTPUT_DIR_DEFAULT
    output_dir.mkdir(parents=True, exist_ok=True)

    if not mvdsv_src.is_dir():
        print(f"MVDSV repo missing 'src/' subdir: {mvdsv_repo}", file=sys.stderr)
        return 1

    files = _list_source_files(mvdsv_src)
    if args.limit_files > 0:
        files = files[: args.limit_files]
    print(f"[mvdsv] {len(files)} .c files under {mvdsv_src}")

    all_handlers = collect_handlers()
    if args.handlers == "all":
        handlers = list(all_handlers.values())
    else:
        names = [n.strip() for n in args.handlers.split(",") if n.strip()]
        unknown = [n for n in names if n not in all_handlers]
        if unknown:
            print(f"ERROR: unknown handler(s): {unknown}. Known: {list(all_handlers)}", file=sys.stderr)
            return 1
        handlers = [all_handlers[n] for n in names]

    if not handlers:
        print("[mvdsv] no handlers registered yet (Tasks 6-12 will add them)")
        return 0

    # One-time setup per handler (e.g. parse header files, build lookup tables).
    # Runs in the PARENT before fork so derived state is inherited copy-on-write.
    for h in handlers:
        if hasattr(h, "setup"):
            h.setup(mvdsv_repo=mvdsv_repo, mvdsv_src=mvdsv_src)

    # Pre-resolve clang args once in the parent. Workers inherit via fork.
    mvdsv_src_str = str(mvdsv_src)
    _WORKER_HANDLERS = handlers
    _WORKER_CLANG_BASE  = clang_args_mvdsv_for(mvdsv_src_str)
    _WORKER_CLANG_WIN   = clang_args_mvdsv_win_for(mvdsv_src_str)
    _WORKER_CLANG_LINUX = clang_args_mvdsv_linux_for(mvdsv_src_str)

    tasks: list[str] = [str(f) for f in files]

    workers = args.workers
    if workers == 0:
        workers = os.cpu_count() or 4

    if args.chunk_size > 0:
        chunk_size = args.chunk_size
    else:
        # 2x over-chunking for load balance: each worker gets ~2 chunks.
        chunk_size = max(1, len(tasks) // max(1, workers * 2))

    mode_label = "serial" if workers == 1 else f"parallel x {workers}"
    print(f"MVDSV AST extraction ({mode_label})")
    print(f"  repo:     {mvdsv_repo}")
    print(f"  handlers: {[h.name for h in handlers]}")
    print(f"  output:   {output_dir}")
    print(f"  total:    {len(tasks)} file-tasks")
    print()

    t0 = time.perf_counter()
    if workers == 1:
        rows_by_handler, diagnostics = _run_serial(
            tasks, handlers, args.progress_every,
        )
    else:
        rows_by_handler, diagnostics = _run_parallel(
            tasks, handlers, workers, chunk_size,
        )

    parse_time = time.perf_counter() - t0
    print(f"\nParse + visit phase: {parse_time:.1f}s")

    for h in handlers:
        out_path = output_dir / h.output_filename
        output = h.finalize(all_rows=rows_by_handler[h.name], repo_root=mvdsv_repo)
        out_path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
        print(f"  [{h.name}] {len(rows_by_handler[h.name])} raw rows -> {out_path}")

    if diagnostics:
        print(f"\nDiagnostics: {len(diagnostics)} entries")
        for d in diagnostics[:20]:
            print(f"  {d}")
        if len(diagnostics) > 20:
            print(f"  ... ({len(diagnostics) - 20} more)")

    total_time = time.perf_counter() - t0
    print(f"\nDone. {len(tasks)} file-tasks, {total_time:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
