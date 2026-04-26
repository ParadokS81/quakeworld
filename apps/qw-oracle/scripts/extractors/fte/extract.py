#!/usr/bin/env python3
"""FTE Layer 1 AST extraction driver.

Walks two source roots (engine + plugins/ezhud) under 4 variants
(client/server/win/client_vk) per file, dispatching to per-type handlers.

Usage:
    python3 extract.py \\
        --repo-root research/repos/fteqw \\
        --output-dir apps/qw-oracle/scripts/extractors/fte/output \\
        --handlers all
"""
from __future__ import annotations

import argparse
import json
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
    available: dict = {
        "cvars": CvarsFteHandler(),
        "commands": CommandsFteHandler(),
    }
    if names == "all":
        return available
    requested = {n.strip() for n in names.split(",") if n.strip()}
    return {k: v for k, v in available.items() if k in requested}


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
    ap.add_argument("--limit-files", type=int, default=0,
                    help="Stop after N files per source root (0 = no limit). Useful for smoke tests.")
    ap.add_argument("--progress-every", type=int, default=20,
                    help="Print a progress line every N files (0 to disable).")
    return ap.parse_args()


def walk_source_files(root_dir: Path) -> list[Path]:
    """Collect all .c and .h files under root_dir, sorted."""
    files: list[Path] = []
    for ext in (".c", ".h"):
        files.extend(root_dir.rglob(f"*{ext}"))
    return sorted(files)


def main() -> int:
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
    # hasattr guard: handlers that don't need setup omit the method entirely.
    for h in handlers:
        if hasattr(h, "setup"):
            h.setup(fte_repo=fte_repo, engine_dir=fte_repo / "engine")

    idx = Index.create()
    rows_by_handler: dict[str, list[dict]] = {h.name: [] for h in handlers}
    diagnostics: list[str] = []
    total_files = 0
    t0 = time.perf_counter()

    for source_root_label, source_root_rel in SOURCE_ROOTS:
        source_root_path = fte_repo / source_root_rel
        if not source_root_path.is_dir():
            print(f"  [skip] source root '{source_root_rel}' not found under {fte_repo}", file=sys.stderr)
            continue

        files = walk_source_files(source_root_path)
        if args.limit_files > 0:
            files = files[: args.limit_files]

        print(f"=== source_root={source_root_label} ({len(files)} files) ===")

        for file_path in files:
            target_str = str(file_path.resolve())
            try:
                source_bytes = file_path.read_bytes()
            except OSError as e:
                diagnostics.append(f"{file_path.name}: read failed: {e}")
                continue

            for h in handlers:
                h.start_file(source_path=file_path, source_bytes=source_bytes)

            for variant_name, args_func in VARIANT_FUNCS:
                clang_args = args_func(str(fte_repo))
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
                    diagnostics.append(f"{file_path.name} [{variant_name}|walk]: {type(e).__name__}: {e}")

            for h in handlers:
                try:
                    rows_by_handler[h.name].extend(h.end_file())
                except Exception as e:
                    diagnostics.append(f"{file_path.name} [{h.name}.end_file]: {type(e).__name__}: {e}")

            total_files += 1
            if args.progress_every and total_files % args.progress_every == 0:
                elapsed = time.perf_counter() - t0
                rate = total_files / elapsed if elapsed > 0 else 0
                print(f"  [progress] {total_files} files in {elapsed:.1f}s ({rate:.1f} files/s)")

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

    total_time = time.perf_counter() - t0
    print(f"\nDone. {total_files} files, {total_time:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
