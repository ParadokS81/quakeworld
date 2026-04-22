#!/usr/bin/env python3
"""Unified ezQuake AST extraction driver (Step 2: parallel).

Parses each .c file in ezquake-source/src/ once (client variant + server
variant) and dispatches the two translation units to each registered handler.
Replaces the 7 full-repo libclang extractors with a single shared parse pass.

STEP 2 OF THE OPTIMIZATION PLAN -- parallel execution via multiprocessing.Pool
on fork start method (validated by pre-flight spike). Step 1 (unified serial
architecture) is still reachable via --workers 1 or --serial for debugging.

Until the old extractors are retired, the driver writes outputs with a
".unified" suffix so the committed .json files still come from the legacy
per-entity extractors. Diff at the natural-key level, not byte level.

Usage:
    python3 extract-ezquake-unified.py \\
        --repo-root research/repos/ezquake-source \\
        --output-dir /tmp/unified-out \\
        --handlers all \\
        --workers 12

Row-order note: workers process file-chunks in input order and pool.map
returns results in input order. Combined, the final rows_by_handler list
per entity matches serial execution byte-for-byte, so handler finalize()
logic (first-wins / last-wins dedup) produces identical output.
"""
from __future__ import annotations

import argparse
import json
import multiprocessing as mp
import os
import sys
import time
from pathlib import Path

from clang.cindex import Index

# sys.path manipulation: the handlers package lives next to this script.
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from extractor_lib.clang_config import (  # noqa: E402
    PARSE_OPTS,
    clang_args_for,
    clang_args_server_for,
)
from extractor_lib.handler_commands import CommandsHandler  # noqa: E402
from extractor_lib.handler_cvars import CvarsHandler  # noqa: E402
from extractor_lib.handler_macros import MacrosHandler  # noqa: E402
from extractor_lib.handler_cmdline import CmdlineHandler  # noqa: E402
from extractor_lib.handler_hud_elements import HudElementsHandler  # noqa: E402
from extractor_lib.handler_asset_cvar_bindings import AssetCvarBindingsHandler  # noqa: E402
from extractor_lib.handler_asset_loader_sites import AssetLoaderSitesHandler  # noqa: E402
from extractor_lib.handler_keynames import KeynamesHandler  # noqa: E402

REPO_ROOT = HERE.parent.parent.parent

# Registry of all handlers. Add new entries as more extractors are ported.
ALL_HANDLERS = {
    h.name: h for h in [
        CommandsHandler(),
        CvarsHandler(),
        MacrosHandler(),
        CmdlineHandler(),
        HudElementsHandler(),
        AssetCvarBindingsHandler(),
        AssetLoaderSitesHandler(),
        KeynamesHandler(),
    ]
}


# ----- worker-process state -------------------------------------------------
# Populated in main() BEFORE the Pool forks. Workers inherit these via fork
# copy-on-write -- no pickling required. Do not mutate after fork.

_WORKER_HANDLERS: list = []
_WORKER_CLANG_CLIENT: list[str] = []
_WORKER_CLANG_SERVER: list[str] = []


def _worker_process_chunk(file_path_strs: list[str]) -> tuple[dict, list]:
    """Parse each file in the chunk, run all handlers, return merged rows.

    Returns (local_rows_by_handler_name, local_diagnostics). Workers are
    forked from the parent after setup() so handler internal state (cvar
    maps, group_defs, etc.) is inherited read-only.
    """
    idx = Index.create()
    local_rows: dict[str, list[dict]] = {h.name: [] for h in _WORKER_HANDLERS}
    local_diag: list[str] = []

    for ps in file_path_strs:
        path = Path(ps)
        try:
            source_bytes = path.read_bytes()
        except OSError as e:
            local_diag.append(f"{path.name}: read failed: {e}")
            continue

        tu_client = idx.parse(ps, args=_WORKER_CLANG_CLIENT, options=PARSE_OPTS)
        tu_server = idx.parse(ps, args=_WORKER_CLANG_SERVER, options=PARSE_OPTS)

        for h in _WORKER_HANDLERS:
            try:
                rows = h.process_file(
                    tu_client=tu_client,
                    tu_server=tu_server,
                    source_bytes=source_bytes,
                    source_path=path,
                )
                local_rows[h.name].extend(rows)
            except Exception as e:
                local_diag.append(f"{path.name} [{h.name}]: {type(e).__name__}: {e}")

    return local_rows, local_diag


def _run_serial(
    c_files: list[Path],
    handlers: list,
    clang_args_client: list[str],
    clang_args_server: list[str],
    progress_every: int,
) -> tuple[dict, list]:
    """Serial fallback, same behavior as Step 1. Used when workers == 1."""
    rows_by_handler: dict[str, list[dict]] = {h.name: [] for h in handlers}
    diagnostics: list[str] = []
    t0 = time.perf_counter()
    for i, path in enumerate(c_files, 1):
        try:
            source_bytes = path.read_bytes()
        except OSError as e:
            diagnostics.append(f"{path.name}: read failed: {e}")
            continue
        idx = Index.create()
        tu_client = idx.parse(str(path), args=clang_args_client, options=PARSE_OPTS)
        tu_server = idx.parse(str(path), args=clang_args_server, options=PARSE_OPTS)
        for h in handlers:
            try:
                rows = h.process_file(
                    tu_client=tu_client, tu_server=tu_server,
                    source_bytes=source_bytes, source_path=path,
                )
                rows_by_handler[h.name].extend(rows)
            except Exception as e:
                diagnostics.append(f"{path.name} [{h.name}]: {type(e).__name__}: {e}")
        if progress_every and i % progress_every == 0:
            elapsed = time.perf_counter() - t0
            rate = i / elapsed if elapsed > 0 else 0
            print(f"  [{i:>3}/{len(c_files)}] {path.name:40} elapsed {elapsed:6.1f}s ({rate:.1f} files/s)")
    return rows_by_handler, diagnostics


def _run_parallel(
    c_files: list[Path],
    handlers: list,
    clang_args_client: list[str],
    clang_args_server: list[str],
    workers: int,
    chunk_size: int,
) -> tuple[dict, list]:
    """Parallel path: forked Pool, chunked map, ordered result merge."""
    global _WORKER_HANDLERS, _WORKER_CLANG_CLIENT, _WORKER_CLANG_SERVER
    _WORKER_HANDLERS = handlers
    _WORKER_CLANG_CLIENT = clang_args_client
    _WORKER_CLANG_SERVER = clang_args_server

    file_strs = [str(p) for p in c_files]
    chunks = [file_strs[i:i + chunk_size] for i in range(0, len(file_strs), chunk_size)]

    print(f"  parallel: {workers} workers, {len(chunks)} chunks of ~{chunk_size} files")

    ctx = mp.get_context("fork")
    # chunksize=1 on the Pool side because OUR chunks are already the unit of
    # work. Pool.map would otherwise re-chunk our chunks.
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


def parse_args():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo-root", default=None,
                    help="Path to ezquake-source checkout (default: research/repos/ezquake-source under monorepo root)")
    ap.add_argument("--output-dir", default=None,
                    help="Directory to write .json.unified outputs (default: packages/qw-config/src/data/)")
    ap.add_argument("--handlers", default="all",
                    help=f"Comma-separated handler names, or 'all'. Available: {','.join(ALL_HANDLERS)}")
    ap.add_argument("--workers", type=int, default=0,
                    help="Parallel worker processes. 0 = auto (os.cpu_count()). 1 = serial.")
    ap.add_argument("--chunk-size", type=int, default=0,
                    help="Files per chunk. 0 = auto (len(files) / (workers*2), min 4).")
    ap.add_argument("--serial", action="store_true",
                    help="Force serial execution (equivalent to --workers 1).")
    ap.add_argument("--progress-every", type=int, default=25,
                    help="Serial mode: print a progress line every N files (0 to disable).")
    return ap.parse_args()


def main() -> int:
    args = parse_args()

    ezq_repo = Path(args.repo_root).resolve() if args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
    ezq_src = (ezq_repo / "src") if (ezq_repo / "src").is_dir() and any((ezq_repo / "src").glob("*.c")) else ezq_repo
    if not ezq_src.is_dir():
        print(f"ERROR: ezquake src not found at {ezq_src}", file=sys.stderr)
        return 1

    output_dir = Path(args.output_dir).resolve() if args.output_dir else (REPO_ROOT / "packages/qw-config/src/data")
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.handlers == "all":
        handlers = list(ALL_HANDLERS.values())
    else:
        names = [n.strip() for n in args.handlers.split(",") if n.strip()]
        unknown = [n for n in names if n not in ALL_HANDLERS]
        if unknown:
            print(f"ERROR: unknown handler(s): {unknown}. Known: {list(ALL_HANDLERS)}", file=sys.stderr)
            return 1
        handlers = [ALL_HANDLERS[n] for n in names]

    c_files = sorted([p for p in ezq_src.iterdir() if p.suffix == ".c"])

    workers = args.workers if args.workers > 0 else (os.cpu_count() or 4)
    if args.serial:
        workers = 1

    if args.chunk_size > 0:
        chunk_size = args.chunk_size
    else:
        # 2x over-chunking for load balancing: each worker gets ~2 chunks.
        chunk_size = max(4, len(c_files) // max(1, workers * 2))

    mode_label = "serial" if workers == 1 else f"parallel x {workers}"

    print(f"ezQuake unified AST extraction ({mode_label})")
    print(f"  repo:     {ezq_repo}")
    print(f"  src:      {ezq_src} ({len(c_files)} .c files)")
    print(f"  handlers: {[h.name for h in handlers]}")
    print(f"  output:   {output_dir} (.json.unified suffix)")
    print()

    clang_args_client = clang_args_for(str(ezq_src))
    clang_args_server = clang_args_server_for(str(ezq_src))

    # One-time per-handler init. Runs in the PARENT process before workers
    # fork, so derived state (cvar maps, group_defs, field_source_lines) is
    # inherited by every worker via copy-on-write.
    for h in handlers:
        setup = getattr(h, "setup", None)
        if callable(setup):
            setup(ezq_repo=ezq_repo, ezq_src=ezq_src)

    t0 = time.perf_counter()
    if workers == 1:
        rows_by_handler, diagnostics = _run_serial(
            c_files, handlers, clang_args_client, clang_args_server, args.progress_every
        )
    else:
        rows_by_handler, diagnostics = _run_parallel(
            c_files, handlers, clang_args_client, clang_args_server, workers, chunk_size
        )

    parse_time = time.perf_counter() - t0
    print(f"\nParse + visit phase: {parse_time:.1f}s")

    # Finalize and write per-handler outputs.
    for h in handlers:
        out_path = output_dir / f"{h.output_filename}.unified"
        output = h.finalize(all_rows=rows_by_handler[h.name], repo_root=ezq_repo)
        out_path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
        print(f"  [{h.name}] {len(rows_by_handler[h.name])} raw rows -> {out_path}")

    if diagnostics:
        print(f"\nDiagnostics: {len(diagnostics)} entries")
        for d in diagnostics[:20]:
            print(f"  {d}")
        if len(diagnostics) > 20:
            print(f"  ... ({len(diagnostics) - 20} more)")

    total_time = time.perf_counter() - t0
    print(f"\nTotal: {total_time:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
