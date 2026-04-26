#!/usr/bin/env python3
"""FTE Layer 1 AST extraction driver.

Walks two source roots (engine + plugins/ezhud) under 4 variants
(client/server/win/client_vk) per file, dispatching to per-type handlers.

Architecture:
  - Per-handler setup() runs once in the parent (before Pool fork).
  - multiprocessing.Pool (fork mode) over the per-file work list.
  - Inside each worker: 4 TU parses per file (one per variant), dispatched
    through walk_tu_dispatch with the correct source_root label.
  - Per-tag wall time on 12-core: ~30s (vs ~326s serial baseline).
  - --workers 1 falls back to serial loop for debugging.

Usage:
    python3 extract.py \\
        --repo-root research/repos/fteqw \\
        --output-dir apps/qw-oracle/scripts/extractors/fte/output \\
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
    clang_args_fte_for,
    clang_args_fte_server_for,
    clang_args_fte_win_for,
    clang_args_fte_vk_for,
)
from extractor_lib._visitor import walk_tu_dispatch  # noqa: E402

REPO_ROOT_DEFAULT = HERE.parent.parent.parent.parent.parent
FTE_REPO_DEFAULT = REPO_ROOT_DEFAULT / "research/repos/fteqw"
OUTPUT_DIR_DEFAULT = HERE / "output"

# Each entry: (source_root_label, relative path under fte repo)
SOURCE_ROOTS = [
    ("engine", "engine"),
    ("plugin:ezhud", "plugins/ezhud"),
]

# Each entry: (variant_name, clang_args_func)
VARIANT_FUNCS = [
    ("client", clang_args_fte_for),
    ("server", clang_args_fte_server_for),
    ("win", clang_args_fte_win_for),
    ("client_vk", clang_args_fte_vk_for),
]


def collect_handlers(names: str = "all") -> dict:
    """Lazy import handlers -- added one by one across Tasks 5-9.
    Returns dict[name, handler_instance] for the requested names (or all).
    """
    from _handler_cvars import CvarsFteHandler
    from _handler_commands import CommandsFteHandler
    from _handler_macros import MacrosFteHandler
    from _handler_cmdline import CmdlineFteHandler
    from _handler_ezhud import EzhudFteHandler
    available: dict = {
        "cvars": CvarsFteHandler(),
        "commands": CommandsFteHandler(),
        "macros": MacrosFteHandler(),
        "cmdline": CmdlineFteHandler(),
        "ezhud": EzhudFteHandler(),
    }
    if names == "all":
        return available
    requested = {n.strip() for n in names.split(",") if n.strip()}
    return {k: v for k, v in available.items() if k in requested}


def merge_ezhud_into_cvars(output_dir: Path) -> None:
    """Merge fte-ezhud-cvars-ast.json into fte-variables-ast.json.

    The loader expects one cvars JSON. Ezhud rows enter that surface tagged
    source_root=plugin:ezhud. Called after finalize so both files exist.
    Engine cvar count is preserved -- only new ezhud entries are added.
    """
    cvars_path = output_dir / "fte-variables-ast.json"
    ezhud_path = output_dir / "fte-ezhud-cvars-ast.json"
    if not cvars_path.exists() or not ezhud_path.exists():
        return
    cvars = json.loads(cvars_path.read_text())
    ezhud = json.loads(ezhud_path.read_text())
    cvars["vars"].update(ezhud["vars"])
    cvars["_stats"]["count"] = len(cvars["vars"])
    cvars["_stats"]["by_source_root"] = {
        root: sum(1 for r in cvars["vars"].values() if r.get("source_root") == root)
        for root in ("engine", "plugin:ezhud")
    }
    cvars_path.write_text(json.dumps(cvars, indent=2, sort_keys=True) + "\n")


# ----- worker-process state --------------------------------------------------
# Set in the PARENT before Pool.map() via the pre-fork globals pattern
# (fork mode: copy-on-write, no pickling). Do not mutate after fork.

_WORKER_HANDLERS: list = []
_WORKER_CLANG_CLIENT: list[str] = []
_WORKER_CLANG_SERVER: list[str] = []
_WORKER_CLANG_WIN: list[str] = []
_WORKER_CLANG_VK: list[str] = []


def _worker_process_file(task: tuple) -> tuple[dict, list]:
    """Process one (file_path_str, source_root_label) pair in a worker.

    Parses the file under all 4 variants, runs every handler via the shared
    walk, and returns per-file rows for all handlers.

    Returns (local_rows, local_diag):
      local_rows  -- dict[handler_name, list[row_dict]]
      local_diag  -- list of diagnostic strings
    """
    file_path_str, source_root_label = task
    path = Path(file_path_str)

    local_rows: dict[str, list[dict]] = {h.name: [] for h in _WORKER_HANDLERS}
    local_diag: list[str] = []

    try:
        source_bytes = path.read_bytes()
    except OSError as e:
        local_diag.append(f"{path.name}: read failed: {e}")
        return local_rows, local_diag

    idx = Index.create()
    target_str = file_path_str

    variant_args = [
        ("client",    _WORKER_CLANG_CLIENT),
        ("server",    _WORKER_CLANG_SERVER),
        ("win",       _WORKER_CLANG_WIN),
        ("client_vk", _WORKER_CLANG_VK),
    ]

    for h in _WORKER_HANDLERS:
        h.start_file(source_path=path, source_bytes=source_bytes)

    for variant_name, clang_args in variant_args:
        tu = idx.parse(target_str, args=clang_args, options=PARSE_OPTS)
        try:
            walk_tu_dispatch(
                tu,
                _WORKER_HANDLERS,
                variant_name,
                target_str,
                source_root=source_root_label,
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
    tasks: list[tuple],
    handlers: list,
    progress_every: int,
) -> tuple[dict, list]:
    """Serial fallback. Used when --workers 1."""
    rows_by_handler: dict[str, list[dict]] = {h.name: [] for h in handlers}
    diagnostics: list[str] = []
    t0 = time.perf_counter()

    for i, (file_path_str, source_root_label) in enumerate(tasks, 1):
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
            ("client",    _WORKER_CLANG_CLIENT),
            ("server",    _WORKER_CLANG_SERVER),
            ("win",       _WORKER_CLANG_WIN),
            ("client_vk", _WORKER_CLANG_VK),
        ]
        for variant_name, clang_args in serial_variant_args:
            tu = idx.parse(target_str, args=clang_args, options=PARSE_OPTS)
            try:
                walk_tu_dispatch(
                    tu,
                    handlers,
                    variant_name,
                    target_str,
                    source_root=source_root_label,
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
    tasks: list[tuple],
    handlers: list,
    workers: int,
) -> tuple[dict, list]:
    """Parallel path: forked Pool, one task per file, ordered result merge."""
    global _WORKER_HANDLERS, _WORKER_CLANG_CLIENT, _WORKER_CLANG_SERVER
    global _WORKER_CLANG_WIN, _WORKER_CLANG_VK
    _WORKER_HANDLERS = handlers
    # clang args already set by caller (main)

    print(f"  parallel: {workers} workers, {len(tasks)} files")

    ctx = mp.get_context("fork")
    with ctx.Pool(processes=workers) as pool:
        results = pool.map(_worker_process_file, tasks, chunksize=1)

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
                    help="FTE repo path (default: research/repos/fteqw)")
    ap.add_argument("--output-dir", default=None,
                    help="Output JSON directory (default: extractors/fte/output)")
    ap.add_argument("--handlers", default="all",
                    help="Comma-separated handler names or 'all'")
    ap.add_argument("--workers", type=int, default=0,
                    help="Parallel worker processes. 0 = auto (min(cpu_count, 12)). 1 = serial.")
    ap.add_argument("--limit-files", type=int, default=0,
                    help="Stop after N files per source root (0 = no limit). Useful for smoke tests.")
    ap.add_argument("--progress-every", type=int, default=20,
                    help="Serial mode: print a progress line every N files (0 to disable).")
    return ap.parse_args()


def walk_source_files(root_dir: Path) -> list[Path]:
    """Collect all .c and .h files under root_dir, sorted."""
    files: list[Path] = []
    for ext in (".c", ".h"):
        files.extend(root_dir.rglob(f"*{ext}"))
    return sorted(files)


def main() -> int:
    global _WORKER_HANDLERS, _WORKER_CLANG_CLIENT, _WORKER_CLANG_SERVER
    global _WORKER_CLANG_WIN, _WORKER_CLANG_VK

    args = parse_args()
    fte_repo = Path(args.repo_root).resolve() if args.repo_root else FTE_REPO_DEFAULT
    output_dir = Path(args.output_dir).resolve() if args.output_dir else OUTPUT_DIR_DEFAULT
    output_dir.mkdir(parents=True, exist_ok=True)

    if not (fte_repo / "engine").is_dir():
        print(f"FTE repo missing 'engine/' subdir: {fte_repo}", file=sys.stderr)
        return 1

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
        print(
            "No handlers selected (or none yet implemented). Available: see collect_handlers()",
            file=sys.stderr,
        )
        return 0

    # One-time setup per handler (e.g. parse header files, build lookup tables).
    # Runs in the PARENT before fork so derived state is inherited copy-on-write.
    for h in handlers:
        if hasattr(h, "setup"):
            h.setup(fte_repo=fte_repo, engine_dir=fte_repo / "engine")

    # Pre-resolve clang args once in the parent. Workers inherit via fork.
    fte_repo_str = str(fte_repo)
    _WORKER_HANDLERS = handlers
    _WORKER_CLANG_CLIENT = clang_args_fte_for(fte_repo_str)
    _WORKER_CLANG_SERVER = clang_args_fte_server_for(fte_repo_str)
    _WORKER_CLANG_WIN    = clang_args_fte_win_for(fte_repo_str)
    _WORKER_CLANG_VK     = clang_args_fte_vk_for(fte_repo_str)

    # Build the flat list of (file_path_str, source_root_label) tasks,
    # preserving the same source-root order as the original serial loop.
    tasks: list[tuple] = []
    source_root_file_counts: list[tuple[str, int]] = []
    for source_root_label, source_root_rel in SOURCE_ROOTS:
        source_root_path = fte_repo / source_root_rel
        if not source_root_path.is_dir():
            print(f"  [skip] source root '{source_root_rel}' not found under {fte_repo}", file=sys.stderr)
            continue
        files = walk_source_files(source_root_path)
        if args.limit_files > 0:
            files = files[: args.limit_files]
        source_root_file_counts.append((source_root_label, len(files)))
        for f in files:
            tasks.append((str(f), source_root_label))

    workers = args.workers
    if workers == 0:
        workers = min(os.cpu_count() or 4, 12)

    mode_label = "serial" if workers == 1 else f"parallel x {workers}"
    print(f"FTE AST extraction ({mode_label})")
    print(f"  repo:     {fte_repo}")
    for label, count in source_root_file_counts:
        print(f"  source_root={label}: {count} files")
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
            tasks, handlers, workers,
        )

    parse_time = time.perf_counter() - t0
    print(f"\nParse + visit phase: {parse_time:.1f}s")

    for h in handlers:
        out_path = output_dir / h.output_filename
        output = h.finalize(all_rows=rows_by_handler[h.name], repo_root=fte_repo)
        out_path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
        print(f"  [{h.name}] {len(rows_by_handler[h.name])} raw rows -> {out_path}")

    if diagnostics:
        print(f"\nDiagnostics: {len(diagnostics)} entries")
        for d in diagnostics[:20]:
            print(f"  {d}")
        if len(diagnostics) > 20:
            print(f"  ... ({len(diagnostics) - 20} more)")

    # Fold ezhud cvar rows into the main cvars JSON so the loader sees one surface.
    merge_ezhud_into_cvars(output_dir)
    ezhud_merged_path = output_dir / "fte-variables-ast.json"
    if ezhud_merged_path.exists():
        merged = json.loads(ezhud_merged_path.read_text())
        stats = merged.get("_stats", {})
        print(f"\n[merge] fte-variables-ast.json after ezhud merge: {stats}")

    total_time = time.perf_counter() - t0
    print(f"\nDone. {len(tasks)} file-tasks, {total_time:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
