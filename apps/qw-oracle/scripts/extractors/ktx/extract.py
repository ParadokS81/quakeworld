#!/usr/bin/env python3
"""KTX Layer 1 AST extraction driver.

Walks src/*.c at the top level of the KTX repo under a single variant
(server-only) per file, dispatching to per-type handlers. Mirrors the
MVDSV driver's chunked-pool shape; differs in:
  - Single source root + single variant (KTX has no platform splits;
    only native_lib.c:14 has a platform-guard, with no registrations
    inside).
  - All variants dispatch with variant="server"; KTX is always
    server-only (a QC-replacement game module hosted by MVDSV).
  - Top-level src/*.c only; the qwprot submodule under src/qwprot/ is
    header-only and reachable via -I in the clang args, not parsed as
    TUs.

Architecture mirrors MVDSV:
  - Per-handler setup() runs once in the parent (before Pool fork).
  - Pre-fork globals (_WORKER_HANDLERS, _WORKER_CLANG_BASE) populated in
    parent; fork mode copy-on-write inherits them into workers without
    pickling.
  - multiprocessing.Pool (fork mode) over pre-chunked task lists;
    chunksize=1 so the Pool does not re-chunk our pre-split units of
    work.
  - Inside each worker: per file does 1 TU parse, dispatched through
    walk_tu_dispatch.
  - --workers 1 falls back to a serial loop for debugging.

Usage:
    python3 extract.py \\
        --repo-root research/repos/ktx \\
        --output-dir apps/qw-oracle/scripts/extractors/ktx/output \\
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
    clang_args_ktx_for,
)
from extractor_lib._visitor import walk_tu_dispatch  # noqa: E402

REPO_ROOT_DEFAULT = HERE.parent.parent.parent.parent.parent
KTX_REPO_DEFAULT = REPO_ROOT_DEFAULT / "research/repos/ktx"
OUTPUT_DIR_DEFAULT = HERE / "output"

# Single source-root label. KTX has no plugin tree; this exists so
# handlers that read current_source_root see a stable value matching the
# MVDSV / FTE / QWCL idiom.
SOURCE_ROOT_LABEL = "server"


def collect_handlers(names: str = "all") -> dict:
    """Lazy import handlers -- mirrors MVDSV. Returns dict[name, instance]."""
    from _handler_cvars import CvarsKtxHandler
    from _handler_commands import CommandsKtxHandler
    from _handler_info_keys import InfoKeysKtxHandler
    from _handler_log_templates import LogTemplatesKtxHandler
    from _handler_modes import KtxModesHandler
    available: dict = {
        "cvars": CvarsKtxHandler(),
        "commands": CommandsKtxHandler(),
        "info_keys": InfoKeysKtxHandler(),
        "log_templates": LogTemplatesKtxHandler(),
        "modes": KtxModesHandler(),
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


def _worker_process_chunk(tasks: list[str]) -> tuple[dict, list]:
    """Process a chunk of file-path strings in a worker.

    Creates one libclang Index for the whole chunk (kept warm across
    files). For each file: 1 TU parse, walk_tu_dispatch, end_file.

    Returns (local_rows, local_diag).
    """
    idx = Index.create()
    local_rows: dict[str, list[dict]] = {h.name: [] for h in _WORKER_HANDLERS}
    local_diag: list[str] = []

    for file_path_str in tasks:
        path = Path(file_path_str)

        try:
            source_bytes = path.read_bytes()
        except OSError as e:
            local_diag.append(f"{path.name}: read failed: {e}")
            continue

        for h in _WORKER_HANDLERS:
            h.start_file(source_path=path, source_bytes=source_bytes)

        tu = idx.parse(file_path_str, args=_WORKER_CLANG_BASE, options=PARSE_OPTS)
        try:
            walk_tu_dispatch(
                tu,
                _WORKER_HANDLERS,
                "server",
                file_path_str,
                source_root=SOURCE_ROOT_LABEL,
            )
        except Exception as e:
            local_diag.append(f"{path.name} [server|walk]: {type(e).__name__}: {e}")

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

        tu = idx.parse(target_str, args=_WORKER_CLANG_BASE, options=PARSE_OPTS)
        try:
            walk_tu_dispatch(
                tu,
                handlers,
                "server",
                target_str,
                source_root=SOURCE_ROOT_LABEL,
            )
        except Exception as e:
            diagnostics.append(f"{path.name} [server|walk]: {type(e).__name__}: {e}")

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
    """Parallel path: forked Pool, chunked map, ordered result merge."""
    chunks = [tasks[i:i + chunk_size] for i in range(0, len(tasks), chunk_size)]
    print(f"  parallel: {workers} workers, {len(chunks)} chunks of ~{chunk_size} files ({len(tasks)} total)")

    ctx = mp.get_context("fork")
    with ctx.Pool(processes=workers) as pool:
        results = pool.map(_worker_process_chunk, chunks, chunksize=1)

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
                    help="KTX repo path (default: research/repos/ktx)")
    ap.add_argument("--output-dir", default=None,
                    help="Output JSON directory (default: extractors/ktx/output)")
    ap.add_argument("--handlers", default="all",
                    help="Comma-separated handler names or 'all'")
    ap.add_argument("--workers", type=int, default=12,
                    help="Parallel worker processes. 1 = serial. 0 = auto.")
    ap.add_argument("--chunk-size", type=int, default=0,
                    help="Files per chunk. 0 = auto (len(tasks) / (workers*2)).")
    ap.add_argument("--limit-files", type=int, default=0,
                    help="Stop after N files (0 = no limit).")
    ap.add_argument("--progress-every", type=int, default=10,
                    help="Serial mode: print a progress line every N files.")
    return ap.parse_args()


def _list_source_files(ktx_src: Path) -> list[Path]:
    """Top-level src/*.c only. The qwprot submodule under src/qwprot/ is
    header-only and is reached via -I in the clang args. KTX has no
    src/qwprot/src/*.c targets to walk."""
    return sorted(ktx_src.glob("*.c"))


def main() -> int:
    global _WORKER_HANDLERS, _WORKER_CLANG_BASE

    args = parse_args()
    ktx_repo = Path(args.repo_root).resolve() if args.repo_root else KTX_REPO_DEFAULT
    ktx_src = ktx_repo / "src"
    output_dir = Path(args.output_dir).resolve() if args.output_dir else OUTPUT_DIR_DEFAULT
    output_dir.mkdir(parents=True, exist_ok=True)

    if not ktx_src.is_dir():
        print(f"KTX repo missing 'src/' subdir: {ktx_repo}", file=sys.stderr)
        return 1

    files = _list_source_files(ktx_src)
    if args.limit_files > 0:
        files = files[: args.limit_files]
    print(f"[ktx] {len(files)} .c files under {ktx_src}")

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
        print("[ktx] no handlers selected")
        return 0

    # One-time setup per handler. Runs in PARENT before fork so derived
    # state is inherited copy-on-write.
    for h in handlers:
        if hasattr(h, "setup"):
            h.setup(ktx_repo=ktx_repo, ktx_src=ktx_src)

    # Pre-resolve clang args once in the parent. Workers inherit via fork.
    ktx_src_str = str(ktx_src)
    _WORKER_HANDLERS = handlers
    _WORKER_CLANG_BASE = clang_args_ktx_for(ktx_src_str)

    tasks: list[str] = [str(f) for f in files]

    workers = args.workers
    if workers == 0:
        workers = os.cpu_count() or 4

    # Modes handler keeps cross-file refs on instance state (commands.c
    # references world.c activation-cvar registrations and race.c function
    # decls; finalize joins them into catalog rows). multiprocessing.Pool
    # fork-pool workers each get their own copy of the handler instance,
    # so state populated in workers does not survive into the parent's
    # finalize call. Force serial mode whenever modes is selected, until
    # the handler is refactored to emit refs through end_file (F25 in
    # review-findings; future arc).
    if any(h.name == "modes" for h in handlers) and workers != 1:
        print("[ktx] modes handler keeps cross-file state -- forcing --workers 1 (F25)")
        workers = 1

    if args.chunk_size > 0:
        chunk_size = args.chunk_size
    else:
        chunk_size = max(1, len(tasks) // max(1, workers * 2))

    mode_label = "serial" if workers == 1 else f"parallel x {workers}"
    print(f"KTX AST extraction ({mode_label})")
    print(f"  repo:     {ktx_repo}")
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
        output = h.finalize(all_rows=rows_by_handler[h.name], repo_root=ktx_repo)
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
