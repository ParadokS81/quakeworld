#!/usr/bin/env python3
"""QWCL (1996 QuakeWorld client) AST extraction driver.

Single-variant client walk over `research/repos/qwcl-original/QW/client/*.c`.
Emits ezQuake-shape JSON outputs so the existing TypeScript loaders ingest
them unchanged:

    apps/qw-oracle/scripts/extractors/qwcl/output/qwcl-variables-ast.json
    apps/qw-oracle/scripts/extractors/qwcl/output/qwcl-commands-ast.json
    apps/qw-oracle/scripts/extractors/qwcl/output/qwcl-cmdline-params-ast.json

Why a separate driver from ezQuake's:

  - QWCL has no FTE protocol macros, no IRC/zlib feature flags, no platform
    `#ifdef` guards inside files. Win/Linux split is per-file (sys_win.c vs
    sys_linux.c, gl_vidnt.c vs gl_vidlinux_x11.c). One client variant
    suffices.
  - QWCL uses different registration call names (`Cvar_RegisterVariable`
    not `Cvar_Register`), no `Cmd_AddLegacyCommand`, no enum manifest for
    cmdline params, no `cvar_groups.h`, no help-JSON. The handler logic
    diverges enough that reusing ezQuake's handlers would require
    inventing project-flags inside each one — cleaner to write three
    QWCL-specific handlers and keep the shared lib focused on the cursor-
    walk infrastructure.
  - Single-commit repo (no version walk, no parallel pool needed for ~93
    .c files); the driver stays serial for clarity.

Usage:
    python3 extract.py \\
        --repo-root research/repos/qwcl-original \\
        --output-dir apps/qw-oracle/scripts/extractors/qwcl/output \\
        --handlers all
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from clang.cindex import Index

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib.clang_config import (  # noqa: E402
    PARSE_OPTS,
    clang_args_qwcl_for,
)
from extractor_lib._visitor import walk_tu_dispatch  # noqa: E402

from _handler_cvars import CvarsQwclHandler  # noqa: E402
from _handler_commands import CommandsQwclHandler  # noqa: E402
from _handler_cmdline import CmdlineQwclHandler  # noqa: E402


REPO_ROOT = HERE.parent.parent.parent.parent.parent

ALL_HANDLERS = {
    h.name: h for h in [
        CvarsQwclHandler(),
        CommandsQwclHandler(),
        CmdlineQwclHandler(),
    ]
}


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo-root", default=None,
                    help="Path to qwcl-original checkout (default: research/repos/qwcl-original under monorepo root)")
    ap.add_argument("--output-dir", default=None,
                    help="Directory to write JSON outputs (default: extractors/qwcl/output)")
    ap.add_argument("--handlers", default="all",
                    help=f"Comma-separated handler names, or 'all'. Available: {','.join(ALL_HANDLERS)}")
    ap.add_argument("--progress-every", type=int, default=20,
                    help="Print a progress line every N files (0 to disable).")
    return ap.parse_args()


def main() -> int:
    args = parse_args()

    repo_root = Path(args.repo_root).resolve() if args.repo_root else (REPO_ROOT / "research/repos/qwcl-original")
    qwcl_src = repo_root / "QW" / "client"
    if not qwcl_src.is_dir():
        print(f"ERROR: QWCL client source not found at {qwcl_src}", file=sys.stderr)
        return 1

    output_dir = Path(args.output_dir).resolve() if args.output_dir else (HERE / "output")
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

    c_files = sorted([p for p in qwcl_src.iterdir() if p.suffix == ".c"])

    print("QWCL AST extraction (serial)")
    print(f"  repo:     {repo_root}")
    print(f"  src:      {qwcl_src} ({len(c_files)} .c files)")
    print(f"  handlers: {[h.name for h in handlers]}")
    print(f"  output:   {output_dir}")
    print()

    clang_args = clang_args_qwcl_for(str(qwcl_src))

    rows_by_handler: dict[str, list[dict]] = {h.name: [] for h in handlers}
    diagnostics: list[str] = []

    t0 = time.perf_counter()
    idx = Index.create()
    for i, path in enumerate(c_files, 1):
        try:
            source_bytes = path.read_bytes()
        except OSError as e:
            diagnostics.append(f"{path.name}: read failed: {e}")
            continue
        tu = idx.parse(str(path), args=clang_args, options=PARSE_OPTS)
        target_str = str(path.resolve())
        for h in handlers:
            h.start_file(source_path=path, source_bytes=source_bytes)
        try:
            walk_tu_dispatch(tu, handlers, "client", target_str)
        except Exception as e:
            diagnostics.append(f"{path.name} [walk]: {type(e).__name__}: {e}")
        for h in handlers:
            try:
                rows_by_handler[h.name].extend(h.end_file())
            except Exception as e:
                diagnostics.append(f"{path.name} [{h.name}.end_file]: {type(e).__name__}: {e}")

        if args.progress_every and i % args.progress_every == 0:
            elapsed = time.perf_counter() - t0
            rate = i / elapsed if elapsed > 0 else 0
            print(f"  [{i:>3}/{len(c_files)}] {path.name:30} elapsed {elapsed:5.1f}s ({rate:.1f} files/s)")

    parse_time = time.perf_counter() - t0
    print(f"\nParse + visit phase: {parse_time:.1f}s")

    for h in handlers:
        out_path = output_dir / h.output_filename
        output = h.finalize(all_rows=rows_by_handler[h.name], repo_root=repo_root)
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
