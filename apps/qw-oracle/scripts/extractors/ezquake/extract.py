#!/usr/bin/env python3
"""Unified ezQuake AST extraction driver.

Parses each .c file in ezquake-source/src/ once (client variant + server
variant) and dispatches the two translation units to each registered handler
via a shared cursor walk. Replaces the 8 legacy per-entity libclang
extractors archived at scripts/_legacy/.

Architecture:
  - Per-handler setup() runs once in the parent (before Pool fork).
  - multiprocessing.Pool (fork mode, validated by spike) across file chunks.
  - Inside each worker: for every file, one client TU parse + one server TU
    parse, then walk_tu_dispatch delivers every cursor to every Visitor.
  - Per-tag wall time on 12-core Ryzen: ~14s (vs ~830s legacy serial estimate).

Output: canonical <output-dir>/ezquake-<entity>-ast.json files. The original
verification phase used a .unified suffix to diff against legacy; that bar
is cleared (32/32 PASS across HEAD + 3.6.6 + 3.6.0 + 3.2.3) and the driver
now writes canonical names by default. Pass --validation-suffix to re-enable
.json.unified output for comparison against archived legacy scripts.

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

# sys.path manipulation: extractor_lib lives one level up at extractors/extractor_lib/;
# project-private _handler_*.py modules live alongside this file.
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))

from extractor_lib.clang_config import (  # noqa: E402
    PARSE_OPTS,
    clang_args_apple_for,
    clang_args_for,
    clang_args_server_for,
    clang_args_win_for,
)
from extractor_lib._visitor import Visitor, walk_tu_dispatch  # noqa: E402
import extractor_lib._callgraph as _callgraph  # noqa: E402
from extractor_lib._callgraph import CallGraphObserver  # noqa: E402
from _handler_commands import CommandsEzquakeHandler  # noqa: E402
from _handler_cvars import CvarsEzquakeHandler  # noqa: E402
from _handler_macros import MacrosEzquakeHandler  # noqa: E402
from _handler_cmdline import CmdlineEzquakeHandler  # noqa: E402
from _handler_hud_elements import HudElementsEzquakeHandler  # noqa: E402
from _handler_asset_cvar_bindings import AssetCvarBindingsEzquakeHandler  # noqa: E402
from _handler_asset_loader_sites import AssetLoaderSitesEzquakeHandler  # noqa: E402
from _handler_keynames import KeynamesEzquakeHandler  # noqa: E402
from _handler_hud import HudCommandsEzquakeHandler  # noqa: E402

REPO_ROOT = HERE.parent.parent.parent.parent.parent

# D2/D6/X4: per-fork gate. On for ezQuake only (other forks have no validated
# known-answer harness yet -- D22 precondition). Off => the observer is never
# constructed, no observer cycles run, no edges/BFS, no feeder-(b) scan, no
# "callgraph" key in rows_by_handler => byte-for-byte today's pipeline.
# To force OFF for the X3 baseline leg set the env var CALLGRAPH_OFF=1.
ENABLE_CALLGRAPH_PASSENGER: bool = (os.environ.get("CALLGRAPH_OFF", "") != "1")

# D2/D9/X4: per-fork gate for the Track-B HUD-commands handler. On for
# ezQuake only (other forks have their own extract.py and never import
# this handler -- the directory IS the per-fork gate, D22). Off => the
# handler is never constructed, never in ALL_HANDLERS, never subscribed
# => no 9th file, the 8 existing JSONs byte-for-byte today's pipeline.
# To force OFF for the X3 baseline leg set the env var HUD_COMMANDS_OFF=1.
ENABLE_HUD_COMMANDS_HANDLER: bool = (os.environ.get("HUD_COMMANDS_OFF", "") != "1")

# Registry of all handlers. Add new entries as more extractors are ported.
_HANDLER_INSTANCES = [
    CommandsEzquakeHandler(),
    CvarsEzquakeHandler(),
    MacrosEzquakeHandler(),
    CmdlineEzquakeHandler(),
    HudElementsEzquakeHandler(),
    AssetCvarBindingsEzquakeHandler(),
    AssetLoaderSitesEzquakeHandler(),
    KeynamesEzquakeHandler(),
]
if ENABLE_HUD_COMMANDS_HANDLER:
    _HANDLER_INSTANCES.append(HudCommandsEzquakeHandler())
ALL_HANDLERS = {h.name: h for h in _HANDLER_INSTANCES}


# ----- worker-process state -------------------------------------------------
# Populated in main() BEFORE the Pool forks. Workers inherit these via fork
# copy-on-write -- no pickling required. Do not mutate after fork.

_WORKER_HANDLERS: list = []
_WORKER_CLANG_CLIENT: list[str] = []
_WORKER_CLANG_SERVER: list[str] = []
_WORKER_CLANG_WIN: list[str] = []
_WORKER_CLANG_APPLE: list[str] = []
# Inherits the ENABLE_CALLGRAPH_PASSENGER value at fork time via copy-on-write.
# Set explicitly in _run_parallel so the worker sees the decided value even if
# the env var was parsed at import time in the parent. No pickling needed.
_WORKER_CALLGRAPH_ON: bool = False


def _split_handlers(handlers: list) -> tuple[list, list]:
    """Partition handlers into (visitors, legacy). Visitor handlers use the
    shared-walk dispatcher; legacy handlers still use process_file."""
    visitors = [h for h in handlers if isinstance(h, Visitor)]
    legacy = [h for h in handlers if not isinstance(h, Visitor)]
    return visitors, legacy


def _process_one_file(
    path: Path,
    source_bytes: bytes,
    tu_client,
    tu_server,
    tu_win,
    tu_apple,
    visitors: list,
    legacy: list,
    local_rows: dict,
    local_diag: list,
    obs=None,
) -> None:
    """Run all handlers against one file's TUs. Visitor handlers go through
    the shared walk; legacy handlers get their own process_file call.

    Four parse variants feed the visitor walk: client, server, Windows,
    and macOS. The win/apple passes dispatch as variant="client" so that
    existing handler behavior (primary-path add, per-file seen-name
    dedup, unconditional overwrite with identical data) applies uniformly
    without requiring each handler to learn about new variant labels.
    Code behind #ifdef _WIN32 / #ifdef __APPLE__ guards -- invisible to
    the baseline client+server passes -- surfaces through these extras.

    obs: optional CallGraphObserver. When present (ENABLE_CALLGRAPH_PASSENGER
    is on), the observer runs FOUR SEPARATE dispatch cycles with the TRUE
    variant labels (client/server/win/apple) -- NOT added to the shared
    visitor list. The shared 8-handler visitor list and its 4 dispatches
    (lines below) are byte-unchanged (X3/D6). The observer cycles are
    entirely additive and independent."""
    target_path_str = str(path.resolve())

    # Visitor path: shared walk per TU, dispatching to every visitor.
    # These 4 dispatch calls and their "client"/"server"/"client"/"client"
    # labels are LOAD-BEARING -- existing handlers depend on the collapsed
    # label for their dedup logic (see comment in extract.py:119-126).
    # NEVER change these labels (X3).
    if visitors:
        for v in visitors:
            v.start_file(source_path=path, source_bytes=source_bytes)
        try:
            walk_tu_dispatch(tu_client, visitors, "client", target_path_str)
            walk_tu_dispatch(tu_server, visitors, "server", target_path_str)
            walk_tu_dispatch(tu_win,    visitors, "client", target_path_str)
            walk_tu_dispatch(tu_apple,  visitors, "client", target_path_str)
        except Exception as e:
            local_diag.append(f"{path.name} [visitor-walk]: {type(e).__name__}: {e}")
        for v in visitors:
            try:
                rows = v.end_file()
                local_rows[v.name].extend(rows)
            except Exception as e:
                local_diag.append(f"{path.name} [{v.name}.end_file]: {type(e).__name__}: {e}")

    # Observer-only cycles: 4 separate dispatch passes with TRUE variant
    # labels. Completely separate from the shared visitor list above (D6
    # zero shared state). Only runs when obs is provided (boolean is on).
    # Each pass: set active_variant -> start_file -> single-observer walk
    # -> end_file -> accumulate facts. Per-file facts go into
    # local_rows["callgraph"] (a plain list of dicts -- crosses the
    # multiprocessing boundary fine; same shape as every other handler).
    if obs is not None:
        try:
            cg_rows: list = []
            for true_variant, tu in (
                ("client", tu_client),
                ("server", tu_server),
                ("win",    tu_win),
                ("apple",  tu_apple),
            ):
                obs.active_variant = true_variant
                obs.start_file(source_path=path, source_bytes=source_bytes)
                try:
                    walk_tu_dispatch(tu, [obs], true_variant, target_path_str)
                except Exception as e:
                    local_diag.append(
                        f"{path.name} [callgraph-obs {true_variant}]: "
                        f"{type(e).__name__}: {e}"
                    )
                try:
                    cg_rows.extend(obs.end_file())
                except Exception as e:
                    local_diag.append(
                        f"{path.name} [callgraph-obs.end_file {true_variant}]: "
                        f"{type(e).__name__}: {e}"
                    )
            local_rows.setdefault("callgraph", []).extend(cg_rows)
        except Exception as e:
            # X4: an observer failure must not perturb the 8-handler output.
            local_diag.append(f"{path.name} [callgraph-obs]: {type(e).__name__}: {e}")

    # Legacy path: each handler owns its walk via process_file. Only the
    # client+server TUs are passed; legacy handlers that need platform
    # variants spin up their own parses (e.g. handler_keynames).
    for h in legacy:
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


def _worker_process_chunk(file_path_strs: list[str]) -> tuple[dict, list]:
    """Parse each file in the chunk, run all handlers, return merged rows."""
    idx = Index.create()
    local_rows: dict[str, list[dict]] = {h.name: [] for h in _WORKER_HANDLERS}
    local_diag: list[str] = []
    visitors, legacy = _split_handlers(_WORKER_HANDLERS)

    # One observer instance per worker chunk. It is NOT in _WORKER_HANDLERS
    # (never added to ALL_HANDLERS or the visitor list) -- it runs through
    # separate observer-only dispatch cycles inside _process_one_file (D6).
    # _WORKER_CALLGRAPH_ON is inherited from the parent via fork copy-on-write.
    obs = None
    if _WORKER_CALLGRAPH_ON:
        try:
            obs = CallGraphObserver()
        except Exception as e:
            print(
                f"CALLGRAPH PASSENGER DISABLED (worker observer init failed: {e})",
                file=sys.stderr,
            )

    if obs is not None:
        local_rows["callgraph"] = []

    for ps in file_path_strs:
        path = Path(ps)
        try:
            source_bytes = path.read_bytes()
        except OSError as e:
            local_diag.append(f"{path.name}: read failed: {e}")
            continue

        tu_client = idx.parse(ps, args=_WORKER_CLANG_CLIENT, options=PARSE_OPTS)
        tu_server = idx.parse(ps, args=_WORKER_CLANG_SERVER, options=PARSE_OPTS)
        tu_win    = idx.parse(ps, args=_WORKER_CLANG_WIN,    options=PARSE_OPTS)
        tu_apple  = idx.parse(ps, args=_WORKER_CLANG_APPLE,  options=PARSE_OPTS)

        _process_one_file(
            path, source_bytes, tu_client, tu_server, tu_win, tu_apple,
            visitors, legacy, local_rows, local_diag, obs,
        )

    return local_rows, local_diag


def _run_serial(
    c_files: list[Path],
    handlers: list,
    clang_args_client: list[str],
    clang_args_server: list[str],
    clang_args_win: list[str],
    clang_args_apple: list[str],
    progress_every: int,
    callgraph_on: bool = False,
) -> tuple[dict, list]:
    """Serial fallback. Used when workers == 1."""
    rows_by_handler: dict[str, list[dict]] = {h.name: [] for h in handlers}
    diagnostics: list[str] = []
    visitors, legacy = _split_handlers(handlers)

    # Observer for the callgraph passenger (X4: fail-safe-off).
    # NOT added to visitors -- runs separate cycles per file (D6).
    obs = None
    if callgraph_on:
        try:
            obs = CallGraphObserver()
            rows_by_handler["callgraph"] = []
        except Exception as e:
            print(
                f"CALLGRAPH PASSENGER DISABLED (serial observer init failed: {e})",
                file=sys.stderr,
            )

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
        tu_win    = idx.parse(str(path), args=clang_args_win,    options=PARSE_OPTS)
        tu_apple  = idx.parse(str(path), args=clang_args_apple,  options=PARSE_OPTS)
        _process_one_file(
            path, source_bytes, tu_client, tu_server, tu_win, tu_apple,
            visitors, legacy, rows_by_handler, diagnostics, obs,
        )
        if progress_every and i % progress_every == 0:
            elapsed = time.perf_counter() - t0
            rate = i / elapsed if elapsed > 0 else 0
            print(f"  [{i:>3}/{len(c_files)}] {path.name:40} elapsed {elapsed:6.1f}s ({rate:.1f} files/s)")

    # Parent-side post-walk for the callgraph passenger (serial path).
    # Runs after all files' facts are collected (feeder a) and then
    # scans raw source text for commented-out registrations (feeder b).
    # Fail-safe: any exception here must not corrupt the 8-handler output
    # or abort the extractor (X4/D6).
    if obs is not None:
        try:
            _callgraph.reset_result()
            _callgraph.feed_file_facts(rows_by_handler.get("callgraph", []))
            _callgraph.run_postwalk()
        except Exception as e:
            print(
                f"CALLGRAPH PASSENGER DISABLED (serial feeder-a post-walk failed: {e})",
                file=sys.stderr,
            )
        try:
            _callgraph.reset_commented_index()
            for path in c_files:
                try:
                    text = path.read_text(encoding="utf-8", errors="replace")
                    _callgraph.feed_commented_registrations(text, str(path))
                except Exception:
                    # A single file failure only loses feeder-(b) evidence
                    # for that file -- conservative/safe direction.
                    pass
        except Exception as e:
            print(
                f"CALLGRAPH PASSENGER DISABLED (serial feeder-b scan failed: {e})",
                file=sys.stderr,
            )

    return rows_by_handler, diagnostics


def _run_parallel(
    c_files: list[Path],
    handlers: list,
    clang_args_client: list[str],
    clang_args_server: list[str],
    clang_args_win: list[str],
    clang_args_apple: list[str],
    workers: int,
    chunk_size: int,
    callgraph_on: bool = False,
) -> tuple[dict, list]:
    """Parallel path: forked Pool, chunked map, ordered result merge."""
    global _WORKER_HANDLERS, _WORKER_CLANG_CLIENT, _WORKER_CLANG_SERVER
    global _WORKER_CLANG_WIN, _WORKER_CLANG_APPLE, _WORKER_CALLGRAPH_ON
    _WORKER_HANDLERS = handlers
    _WORKER_CLANG_CLIENT = clang_args_client
    _WORKER_CLANG_SERVER = clang_args_server
    _WORKER_CLANG_WIN = clang_args_win
    _WORKER_CLANG_APPLE = clang_args_apple
    # Set before fork so every worker inherits the decided value via
    # copy-on-write (consistent with how _WORKER_HANDLERS is inherited).
    _WORKER_CALLGRAPH_ON = callgraph_on

    file_strs = [str(p) for p in c_files]
    chunks = [file_strs[i:i + chunk_size] for i in range(0, len(file_strs), chunk_size)]

    print(f"  parallel: {workers} workers, {len(chunks)} chunks of ~{chunk_size} files")

    ctx = mp.get_context("fork")
    # chunksize=1 on the Pool side because OUR chunks are already the unit of
    # work. Pool.map would otherwise re-chunk our chunks.
    with ctx.Pool(processes=workers) as pool:
        results = pool.map(_worker_process_chunk, chunks, chunksize=1)

    # Deterministic merge: iterate results in input order.
    # Seed with the 8 handler names + "callgraph" when the passenger is on
    # so the merge below never hits a KeyError on the extra key workers emit.
    rows_by_handler: dict[str, list[dict]] = {h.name: [] for h in handlers}
    if callgraph_on:
        rows_by_handler["callgraph"] = []
    diagnostics: list[str] = []
    for local_rows, local_diag in results:
        for name, rows in local_rows.items():
            rows_by_handler[name].extend(rows)
        diagnostics.extend(local_diag)

    # Parent-side post-walk for the callgraph passenger (parallel path).
    # Workers returned their per-file facts in rows_by_handler["callgraph"].
    # Here we feed them all into the module-level post-walk store and run
    # the BFS so reachable() answers. Then scan raw source text for
    # feeder-(b) commented-out registrations (pure text; D1 no-blend).
    # Fail-safe: any exception here must not corrupt the 8-handler output
    # or abort the extractor (X4/D6).
    if callgraph_on:
        try:
            _callgraph.reset_result()
            _callgraph.feed_file_facts(rows_by_handler.get("callgraph", []))
            _callgraph.run_postwalk()
        except Exception as e:
            print(
                f"CALLGRAPH PASSENGER DISABLED (parallel feeder-a post-walk failed: {e})",
                file=sys.stderr,
            )
        try:
            _callgraph.reset_commented_index()
            for path in c_files:
                try:
                    text = path.read_text(encoding="utf-8", errors="replace")
                    _callgraph.feed_commented_registrations(text, str(path))
                except Exception:
                    pass
        except Exception as e:
            print(
                f"CALLGRAPH PASSENGER DISABLED (parallel feeder-b scan failed: {e})",
                file=sys.stderr,
            )

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
    ap.add_argument("--validation-suffix", action="store_true",
                    help="Write outputs with a .json.unified suffix instead of the canonical "
                         ".json. Used when diffing against archived legacy scripts.")
    return ap.parse_args()


def main() -> int:
    args = parse_args()

    ezq_repo = Path(args.repo_root).resolve() if args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
    ezq_src = (ezq_repo / "src") if (ezq_repo / "src").is_dir() and any((ezq_repo / "src").glob("*.c")) else ezq_repo
    if not ezq_src.is_dir():
        print(f"ERROR: ezquake src not found at {ezq_src}", file=sys.stderr)
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
    suffix_label = ".json.unified" if args.validation_suffix else ".json"

    print(f"ezQuake unified AST extraction ({mode_label})")
    print(f"  repo:     {ezq_repo}")
    print(f"  src:      {ezq_src} ({len(c_files)} .c files)")
    print(f"  handlers: {[h.name for h in handlers]}")
    print(f"  output:   {output_dir} ({suffix_label})")
    print()

    clang_args_client = clang_args_for(str(ezq_src))
    clang_args_server = clang_args_server_for(str(ezq_src))
    clang_args_win    = clang_args_win_for(str(ezq_src))
    clang_args_apple  = clang_args_apple_for(str(ezq_src))

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
            c_files, handlers,
            clang_args_client, clang_args_server, clang_args_win, clang_args_apple,
            args.progress_every,
            callgraph_on=ENABLE_CALLGRAPH_PASSENGER,
        )
    else:
        rows_by_handler, diagnostics = _run_parallel(
            c_files, handlers,
            clang_args_client, clang_args_server, clang_args_win, clang_args_apple,
            workers, chunk_size,
            callgraph_on=ENABLE_CALLGRAPH_PASSENGER,
        )

    parse_time = time.perf_counter() - t0
    print(f"\nParse + visit phase: {parse_time:.1f}s")

    # Finalize and write per-handler outputs.
    suffix = ".unified" if args.validation_suffix else ""
    finalize_outputs: dict[str, dict] = {}
    for h in handlers:
        out_path = output_dir / f"{h.output_filename}{suffix}"
        output = h.finalize(all_rows=rows_by_handler[h.name], repo_root=ezq_repo)
        finalize_outputs[h.name] = output
        out_path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
        print(f"  [{h.name}] {len(rows_by_handler[h.name])} raw rows -> {out_path}")

    # Track-A serialization seam (enforce-L1-runtime-truth Phase 3, OQ-1).
    # Runs AFTER the post-walk (run_postwalk + feed_commented_registrations
    # already executed inside _run_serial / _run_parallel, so
    # _callgraph.reachable() answers from real post-walk state) AND after
    # finalize (so it reuses the already-computed commands/cvars finalize
    # outputs -- ZERO re-parse, ZERO re-finalize, D6-safe). ONE call site
    # here intentionally covers BOTH execution modes: serial and parallel
    # both return to this same main() section after their internal
    # post-walk. Behind the EXISTING ENABLE_CALLGRAPH_PASSENGER boolean
    # (OQ-1: no new boolean). ADDITIVE-ONLY: writes just the 10th file; the
    # 8+1 existing outputs above are byte-untouched. Fail-safe (X4/D6): a
    # seam failure must never corrupt the existing outputs or abort the
    # extractor -- it has already written every other file by this point.
    if ENABLE_CALLGRAPH_PASSENGER:
        cmds_fin = finalize_outputs.get("commands")
        cvars_fin = finalize_outputs.get("cvars")
        if cmds_fin is not None and cvars_fin is not None:
            try:
                from emit_callgraph_signal import emit as emit_callgraph_signal
                cg_path = emit_callgraph_signal(
                    cmds_fin, cvars_fin, output_dir
                )
                # cg_path is None when the D22 structural gate is closed
                # (not mechanism-validated GREEN at the current pin): emit()
                # already printed the LOUD D22 banner to stderr and wrote
                # NOTHING -- so do NOT print a misleading success line. The
                # Track-A overlay then existsSync-skips -> today's pipeline.
                if cg_path is not None:
                    print(
                        f"  [callgraph-signal] Track-A reachability "
                        f"-> {cg_path}"
                    )
            except Exception as e:
                print(
                    f"CALLGRAPH SIGNAL SEAM DISABLED "
                    f"(Track-A emit failed: {e}); the 8+1 existing outputs "
                    f"are unaffected.",
                    file=sys.stderr,
                )
        else:
            # Subset --handlers run that excluded commands or cvars: the
            # 10th file is only meaningful with BOTH keysets, so skip.
            print(
                "  [callgraph-signal] skipped "
                "(commands and/or cvars handler not in this run)",
                file=sys.stderr,
            )

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
