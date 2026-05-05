# Phase 2 -- Pass 1 first-class entity handlers + 4 loader wirings + KTX dispatch

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` (Pass 1 entire -- sections 1.1 through 1.7).
> 4. Source-walk the relevant KTX files at `research/repos/ktx/` -- spec sketches drift; live source wins. Reproduce the count anchors locked in `review-findings.md`.
> 5. Read MVDSV's `_handler_log_templates.py` + `_handler_info_keys.py` + `_handler_commands.py` and ezQuake's `_handler_cvars.py` + `_handler_commands.py` as templates. Do NOT subclass; port (D3).
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section below) before declaring the phase MD ready for operator review.

## Goal

Phase 2 ships KTX's Pass 1 first-class entity surface end-to-end. Four KTX-private handlers under `apps/qw-oracle/scripts/extractors/ktx/` (`_handler_cvars.py`, `_handler_commands.py`, `_handler_info_keys.py`, `_handler_log_templates.py`), each inheriting from `extractor_lib._visitor.Visitor` only (cross-codebase port per D3), produce per-tag JSON for KTX cvars / commands / info_keys / log_templates. A new `extract.py` driver wires these handlers through `walk_tu_dispatch` against KTX's single-variant TU parse. Loader wiring is data-driven: `extract-tag.ts` gains a populated `ENTITY_JSON_FILES.ktx` map (4 entries) plus a non-null `PROJECT_EXTRACTOR.ktx` path; `constants.ts` widens `LOG_TEMPLATE_CHANNELS` to include `'logfile'` so the new KTX channel survives loader-side name validation. Per-loader adapters (`load-cvars.ts`, `load-commands.ts`, `load-info-keys.ts`, `load-log-templates.ts`) need NO per-engine changes -- they are already engine-agnostic and consume KTX's payload through the generic `ADAPTERS` dispatch map already in `load-version.ts`. Runnable state at boundary: `bun scripts/load-knowledge/index.ts extract-tag --project ktx --version head` succeeds end-to-end; KTX cvars + commands + info_keys + log_templates are queryable in the dev DB; F1 quality-grid probes for KTX kinds (added in Phase 7) have data to assert against.

## Inputs from previous phase

Phase 0 complete (per README):
- Doctrine fixes shipped across five reference sites (OVERVIEW.md, EXTRACTOR-PLAYBOOK.md, extractors/CLAUDE.md, VALIDATION-RUNBOOK.md, user-memory `project_extraction_pipeline_vision.md`).
- Obsolete TS regex extractor at `apps/qw-oracle/scripts/extractors/ktx/commands.ts` deleted.
- `apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` exists with seven Phase-0 SKIP entries.
- `apps/qw-oracle/scripts/extractors/ktx/output/` directory preserved.

Phase 1 complete (per README):
- Pattern 6 cross-header lift in `extractor_lib._source.collect_file_macros` (depth-1 `#include` walk; D4 amended to leverage the pre-existing `PARSE_DETAILED_PROCESSING_RECORD` flag in `clang_config.PARSE_OPTS`). `walk_tu_dispatch` populates `v.file_macros` for every visitor before dispatching cursors; consumers read `self.file_macros`.
- Migrations 008 / 009 / 010 applied to dev DB. `log_template_versions.channel` admits `'logfile'`; `entities.type` admits `'match_event'`; `gameplay_entity_defs.kind` and `gameplay_mechanics.kind` widened (Phase 3-5 territory; Phase 2 only consumes 008's `'logfile'`).
- New `gameplay_sources` row for `'ktx'` exists in dev DB (Phase 3-5 use it; Phase 2 does not need it).
- Dev DB schema admits all KTX content; cross-header macros resolve via libclang for any engine.
- `ezquake/_handler_commands.py` refactored to consume `self.file_macros` (lift adopted by the only existing Pattern-6 consumer; KTX inherits the lifted shape from the start).

Plus inputs that have been true since Arc 1 (per `prerequisites.md`):
- Postgres dev container `qw-oracle-postgres-dev` running.
- `bun --version` >= 1.3 in `apps/qw-oracle/`.
- KTX research repo cloned at `research/repos/ktx/` with `master` checked out and the BOT_SUPPORT-enabled headers reachable.
- libclang 18 + python3-clang available (verified by any prior extractor run).

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/ktx/extract.py                              # KTX driver: single-variant TU parse, per-handler dispatch, output writing
apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py                       # RegisterCvar / RegisterCvarEx detection (Pattern 5 + Pattern 6)
apps/qw-oracle/scripts/extractors/ktx/_handler_commands.py                    # cmd_t cmds[] + frogbot_cmd_t std_commands[] + frogbot_cmd_t editor_commands[] (Pattern 4 + Pattern 14)
apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py                   # SetUserInfo star-key writes (producer-only; Pattern 14 with userinfo scope)
apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py               # G_bprint / G_sprint / G_cprint / log_printf format-string capture (multi-API; new logfile channel)
```

### Modified

```
apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py               # add clang_args_ktx_for(ktx_src_dir) -- single-variant; -DBOT_SUPPORT + -I qwprot/src
apps/qw-oracle/scripts/load-knowledge/constants.ts                            # LOG_TEMPLATE_CHANNELS += 'logfile' (mirrors migration 008's CHECK widening)
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts                          # PROJECT_EXTRACTOR.ktx -> ktx/extract.py path; ENTITY_JSON_FILES.ktx populated for cvar/command/info_key/log_template
```

### Deleted

n/a (Phase 0 already deleted the obsolete `apps/qw-oracle/scripts/extractors/ktx/commands.ts`)

## Tasks

### Task 1: Add `clang_args_ktx_for` to `extractor_lib/clang_config.py`

**Goal:** Add a KTX-specific clang args function so the new `ktx/extract.py` can pre-resolve the parse args for every TU. KTX needs `-I` for `src/` (the per-TU root), `-I` for the project-wide `include/` directory (KTX's headers like `g_local.h`, `progs.h`, `deathtype.h` live here -- sibling of `src/`, NOT a qwprot submodule like MVDSV), `-DBOT_SUPPORT=1` so `bot_commands.c`'s `std_commands` / `editor_commands` tables compile (they sit inside `#ifdef BOT_SUPPORT`; CMakeLists.txt:149 ships `-DBOT_SUPPORT=1` per the canonical build), and `-w` for warning suppression. Single-variant per spec section 1.2 ("only one platform-guard #ifdef exists in KTX source at native_lib.c:14, with zero RegisterCvar* inside guarded blocks") -- no Win / Linux / Apple variants needed.

**Files:**
- `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py` and append the following function block AFTER the last existing `clang_args_mvdsv_*` function and BEFORE the file's trailing whitespace / EOF (the file ends near line 290 today; this addition lands at the bottom of the file):

```python


# ---------- KTX (canonical -- https://github.com/QW-Group/ktx) ----------
#
# Pure C; QuakeC mods (dusty-ktx/qcsrc/) are NOT in scope -- canonical KTX
# has none. Single-variant TU parse: only one platform-guard #ifdef exists
# (native_lib.c:14, NO RegisterCvar* inside guarded blocks per Pass 1 spec).
# BOT_SUPPORT=1 is enabled so bot_commands.c's std_commands[] and
# editor_commands[] tables compile (Phase 2 _handler_commands.py target).
#
# KTX's project-wide headers (g_local.h, progs.h, deathtype.h, ...) live
# under <ktx_repo>/include/ -- a SIBLING of <ktx_repo>/src/ (NOT a
# qwprot submodule like MVDSV uses). Verified at canonical 1.46
# (CMakeLists.txt:143 -- target_include_directories(... PRIVATE "include")).
# The Phase 1 lift's depth-1 #include walk over collect_file_macros relies
# on this -I path so g_local.h's LGCMODE_VARIABLE / TOT_MODE_VARIABLE
# resolve when commands.c is parsed (Phase 3 modes handler dependency).

def clang_args_ktx_for(ktx_src_dir: str) -> list[str]:
    """KTX server-mod variant. ktx_src_dir is the absolute path to
    research/repos/ktx/src; project headers live at the sibling
    research/repos/ktx/include directory.

    Single variant: KTX has no Win / Linux / Apple platform splits. The
    one platform-guard at native_lib.c:14 wraps non-registration code
    only (verified by Pass 1 spike).

    BOT_SUPPORT=1 MUST be defined so bot_commands.c's std_commands[] and
    editor_commands[] (lines 2315 + 2332) are not preprocessed out;
    Phase 2 _handler_commands.py walks both tables. CMakeLists.txt:149
    ships -DBOT_SUPPORT=1 in the canonical build.
    """
    include_dir = str(pathlib.Path(ktx_src_dir).parent / "include")
    return [
        "-x", "c",
        f"-I{ktx_src_dir}",
        f"-I{include_dir}",
        "-w",
        "-DBOT_SUPPORT=1",
    ]
```

- [ ] Confirm the existing `import pathlib` at the top of the file is in scope (it is; used by the MVDSV / FTE definitions above). No new top-level imports required.

**Verification:**
- `grep -n "def clang_args_ktx_for" apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py` returns one match.
- `python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from extractor_lib.clang_config import clang_args_ktx_for; print(clang_args_ktx_for('/tmp/ktx/src'))"` prints a list whose first element is `-x` and whose flags include `-DBOT_SUPPORT=1`, `-I/tmp/ktx/src`, and `-I/tmp/ktx/include`.
- `test -d research/repos/ktx/include` exits 0 (sanity-check the include dir actually exists at the expected location for the live KTX repo).
- PASS condition: function importable; flag list correct; include dir exists.
- FAIL condition: import error, flag missing, OR `research/repos/ktx/include` not present.

**Execution mode:** `inline` -- pure Python source addition with full content shipped above; mechanical Edit; no logic synthesis.

### Task 2: Create the KTX extraction driver `apps/qw-oracle/scripts/extractors/ktx/extract.py`

**Goal:** New driver mirroring `mvdsv/extract.py`'s shape (chunked-pool over `src/*.c`, fork mode, single Index per worker chunk, deterministic merge). Single variant (`SOURCE_ROOT_LABEL = 'server'`; only `clang_args_ktx_for` -- no win / linux split), `-DBOT_SUPPORT` already inside the args function. Per `apps/qw-oracle/CLAUDE.md` always-on rules: handlers register lazily; collect_handlers takes `--handlers all|cvars,commands,...` per-handler dispatch.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/extract.py` (created)

**Steps:**

- [ ] Create `apps/qw-oracle/scripts/extractors/ktx/extract.py` with the following content. The structure intentionally mirrors `mvdsv/extract.py` (which Phase 2 uses as a template). Differences from MVDSV: single variant (no win / linux), single SOURCE_ROOT_LABEL, no Sys_*_for fanout. Differences from ezQuake: no help-JSON merge in finalize (no `help_*.json` in canonical KTX repo), no asset-bundle integration (KTX is server-only, no client-side asset surface).

```python
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
    available: dict = {
        "cvars": CvarsKtxHandler(),
        "commands": CommandsKtxHandler(),
        "info_keys": InfoKeysKtxHandler(),
        "log_templates": LogTemplatesKtxHandler(),
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
```

- [ ] Set the file mode to executable: `chmod +x apps/qw-oracle/scripts/extractors/ktx/extract.py`.

**Verification:**
- `python3 apps/qw-oracle/scripts/extractors/ktx/extract.py --help` exits 0 with the usage block visible.
- `python3 -c "import ast; ast.parse(open('apps/qw-oracle/scripts/extractors/ktx/extract.py').read())"` exits 0 (Python syntax-valid).
- `grep -n "from _handler_" apps/qw-oracle/scripts/extractors/ktx/extract.py | wc -l` returns `4` (one import per handler).
- PASS condition: --help works, syntax valid, all 4 handler imports present.
- FAIL condition: any failure.

**Execution mode:** `inline` -- pure Python source with full content shipped above; mechanical Write call. The driver structure is a near-verbatim port of `mvdsv/extract.py` with the variant-fanout collapsed; no synthesis required.

### Task 3: Create `_handler_cvars.py` (KTX cvar handler)

**Goal:** Walk `CALL_EXPR` cursors with `cursor.spelling in {"RegisterCvar", "RegisterCvarEx"}`. Extract cvar name from `arg[0]` (literal-string, OR Pattern-6 macro-arg resolved via `self.file_macros`). Extract default value from `arg[1]` (RegisterCvarEx only; RegisterCvar leaves `default_value=NULL`). Per spec section 1.2: cross-codebase port from `Visitor` only (D3); single-variant TU parse; `_seen_in_file` per-file dedup keyed on canonical name. Per F1: ~192 unique k_-prefixed source-registered cvars; per recon, additional ~33 non-k_ literal names (e.g., `_k_*`, `maxfps`) also registered -- handler emits ALL `RegisterCvar*("name", ...)` rows per the Exhaustive Mapping Rule (no name-prefix filter). Output JSON shape matches MVDSV's array-of-`{name, ast}` convention; load-version.ts normalizes the array to a dict.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py` (created)

**Steps:**

- [ ] Create the file with the following content. The handler shape is a cross-codebase port (D3): inherits from `Visitor` only; does NOT subclass any prior-engine handler. Pattern 5 (API-call with literal-string args) drives detection; Pattern 6 (now `self.file_macros` post-Phase-1 lift) resolves macro-arg call sites.

```python
"""Cvars handler for the KTX AST extractor.

Detects RegisterCvar / RegisterCvarEx call sites in KTX source. KTX
defines two registration APIs (verified at world.c:717 and world.c:751):

  - RegisterCvar(const char *var)             -> default_value=NULL
  - RegisterCvarEx(const char *var, default)  -> default_value=<arg[1]>

Both lookup-or-create the cvar and return qbool. RegisterCvar internally
calls RegisterCvarEx(var, "") so the no-default form gets an empty string
at runtime; from a source-extraction POV we preserve the source-fidelity
distinction: RegisterCvar -> NULL default, RegisterCvarEx -> literal
default_value.

PATTERN 6 INTEGRATION (Phase 1 lift). Bot-cvar registrations like
`RegisterCvar(FB_CVAR_DODGEFACTOR)` at bot_botimp.c:113-117 use
identifier args. The Phase 1 lift to extractor_lib._source.collect_file_macros
populates self.file_macros via walk_tu_dispatch with the depth-1
#include closure of the target file. For KTX this surfaces FB_CVAR_*
macros defined in bot_default.h via #include in bot_botimp.c. The
handler consults self.file_macros when arg[0] is a non-literal
identifier; this is the same shape ezQuake/_handler_commands.py uses
post-Phase-1.

CROSS-CODEBASE PORT (D3). Handler inherits from extractor_lib._visitor.Visitor
only -- NOT a subclass of MVDSV / ezQuake / FTE / QWCL handlers. KTX's
RegisterCvar* API differs from ezQuake's `cvar_t foo = {...}` declaration
shape; subclassing would tie KTX's extraction to a parent's API surface
that doesn't apply.

CANONICAL NAME (no Pattern 14 here). KTX cvars do not register across
multiple semantic scopes -- a name registered as `k_foo` is the same
entity wherever it appears. Pattern 14 suffixing applies only to commands
(D7) and info_keys (D7). Per-file dedup `_seen_in_file` is keyed on the
bare cvar name.

Output entity shape (one row per unique cvar name; first-wins on
cross-file duplicates in finalize):

    {
      "name": "k_lockmove",
      "ast": {
        "default_value": "0",        # NULL for RegisterCvar (no default arg)
        "source_file": "src/world.c", # RegisterCvar* call site
        "source_line": 845,
        "source_column": 2,
        "registration_api": "RegisterCvarEx",  # provenance for the bucket
        "trailing_comment": null,    # KTX has no convention; reserve field
      }
    }

KTX has NO help_*.json so finalize emits no help-merge step -- every row
is source-backed by definition. The loader's isSourceBacked predicate
returns true for `entry.ast !== null` which is always true here.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import literal_string, read_extent  # noqa: E402

# Identifier-arg fallback regex. When arg[0] of RegisterCvar* is not a
# literal string, libclang's literal_string() returns None; if the raw
# extent matches this regex, we look it up in self.file_macros (the
# Phase 1 lifted depth-1 #include macro map).
_MACRO_IDENT_RE = re.compile(r"^[A-Z_][A-Z0-9_]+$")


class CvarsKtxHandler(Visitor):
    """KTX cvars handler (Pattern 5 + Pattern 6 detection).

    Cross-codebase port (D3) -- inherits from Visitor only. No parent-
    project subclass.

    No fork override hooks today. KTX has only one canonical fork target
    (dusty-ktx, separate arc) which differs at the QC layer rather than
    the registration-API layer.
    """
    name = "cvars"
    output_filename = "ktx-variables-ast.json"
    payload_field = "vars"

    # Registration APIs. Both call shapes are detected; the difference is
    # default_value extraction (RegisterCvar -> NULL, RegisterCvarEx -> arg[1]).
    REGISTRATION_APIS: tuple = ("RegisterCvar", "RegisterCvarEx")

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        self._repo_root = ktx_repo
        self._src_root = ktx_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup. KTX has no client/server variant split (single TU
        # parse), but defensive against the same call site being visited
        # twice through cursor traversal.
        self._seen_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        spelling = cursor.spelling
        if spelling not in self.REGISTRATION_APIS:
            return
        args = list(cursor.get_arguments())
        if len(args) < 1:
            return

        # arg[0]: literal-string OR macro-arg fallback via self.file_macros
        # (Phase 1 lift -- depth-1 #include closure).
        name = literal_string(args[0], self.source_bytes)
        if not name:
            raw = read_extent(self.source_bytes, args[0].extent).strip()
            if _MACRO_IDENT_RE.match(raw):
                name = self.file_macros.get(raw)
        if not name:
            return
        if name in self._seen_in_file:
            return

        # arg[1]: default value, ONLY for RegisterCvarEx. RegisterCvar's
        # 1-arg signature has no arg[1]; default_value stays NULL per the
        # F1 anchor's "no default -> default_value NULL" rule.
        default_value: Optional[str] = None
        if spelling == "RegisterCvarEx" and len(args) >= 2:
            default_value = literal_string(args[1], self.source_bytes)
            # Best-effort: if arg[1] is a non-literal expression (rare in
            # KTX -- audit shows nearly all RegisterCvarEx use string
            # literals), preserve the raw extent so downstream consumers
            # see a non-NULL provenance.
            if default_value is None:
                raw = read_extent(self.source_bytes, args[1].extent).strip()
                # Strip surrounding quotes if a quoted-string slipped past
                # literal_string (multi-line concat etc).
                if raw.startswith('"') and raw.endswith('"'):
                    default_value = raw[1:-1]
                elif raw and raw != "NULL":
                    default_value = raw

        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None

        self._rows.append({
            "name": name,
            "ast": {
                "default_value": default_value,
                "source_file": rel_file,
                "source_line": location.line,
                "source_column": location.column,
                "registration_api": spelling,
                # Preserved for cross-engine schema parity. KTX has no
                # source-side flag system; load-cvars.ts handles None.
                "flags_raw": None,
                "flag_names": None,
                "on_change": None,
                "min_bound": None,
                "max_bound": None,
                "storage_class": None,
                "group_name_in_source": None,
                "trailing_comment": None,
            },
        })
        self._seen_in_file.add(name)

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Cross-file first-wins by canonical name. KTX has no help-JSON
        # so this is the only dedup pass.
        by_name: dict[str, dict] = {}
        order: list[str] = []
        for r in all_rows:
            if r["name"] not in by_name:
                by_name[r["name"]] = r
                order.append(r["name"])

        unique = [by_name[n] for n in order]
        unique.sort(key=lambda r: r["name"])

        # Bucket counts for stats. RegisterCvar (no default) vs
        # RegisterCvarEx (with default) -- inversion from F1's spec
        # estimate is documented in this phase MD's "Open questions"
        # section; live-source counts win.
        by_api: dict[str, int] = {}
        with_default = 0
        for r in unique:
            api = r["ast"].get("registration_api") or "?"
            by_api[api] = by_api.get(api, 0) + 1
            if r["ast"].get("default_value") is not None:
                with_default += 1

        return {
            "vars": unique,
            "_stats": {
                "source_total": len(all_rows),
                "count": len(unique),
                "by_api": by_api,
                "with_default": with_default,
            },
        }
```

- [ ] Confirm there are no unused imports (the `Optional` import and `re` import are referenced).

**Verification:**
- `python3 -c "import ast; ast.parse(open('apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py').read())"` exits 0.
- `grep -c "self.file_macros" apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py` returns at least `1` (Pattern 6 lift consumed).
- `grep -c "REGISTRATION_APIS" apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py` returns at least `2` (declared + dispatched).
- `grep -c "from extractor_lib._visitor import Visitor" apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py` returns `1`.
- `grep -c "from .*ezquake\|from .*mvdsv\|from .*fte\|from .*qwcl" apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py` returns `0` (no parent-project import per D3).
- PASS condition: syntax valid; Pattern 6 lift consumed; D3 cross-codebase rule respected.
- FAIL condition: any check fails.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis on a single file with a clear contract. The handler shape is well-specified above; refining the libclang call into idiomatic visitor code (initializer state, dedup, finalize) requires reasoning but is bounded. No architectural decisions; clear single-language Python output. Sonnet medium is the right calibration per D18 (Sonnet medium floor for code synthesis).

### Task 4: Create `_handler_commands.py` (KTX command handler -- 3 tables, Pattern 14)

**Goal:** Walk `VAR_DECL` cursors with type matching `cmd_t`, `frogbot_cmd_t` (the latter under array shape `frogbot_cmd_t[N]`). For each row in the `INIT_LIST_EXPR`, pull the literal name field + handler-function reference + description (per spec 1.5 priority order: CD_* macro via Pattern 6 -> banner harvest at FUNCTION_DECL -> inline string literal). Pattern 14 canonical-name suffixing per D7: bare for `cmd_t cmds[]`, `:frogbot:std` for `std_commands[]`, `:frogbot:editor` for `editor_commands[]`. Per-file dedup keyed on the FULL canonical name (post-suffix), not the bare name -- defends against future tags adding overlapping names across tables.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/_handler_commands.py` (created)

**Steps:**

- [ ] Create the file with the following content. Pattern 4 (struct-array INIT_LIST_EXPR walks) drives all three table extractions; Pattern 6 + Pattern 9 supply description-source priority. Pattern 14 suffixing keeps the entity-table `UNIQUE(project, type, name)` constraint clean across the three sub-namespaces.

```python
"""Commands handler for the KTX AST extractor.

Detects three command-table declarations in KTX source:

  - cmd_t cmds[]                     at src/commands.c:693 (~317-371 entries)
  - frogbot_cmd_t std_commands[]     at src/bot_commands.c:2315 (14 entries)
  - frogbot_cmd_t editor_commands[]  at src/bot_commands.c:2332 (25 entries)

PATTERN 4 (struct-literal command tables iterated via dispatch). KTX's
cmd_t cmds[] sits at module scope; FrogbotsCommand at commands.c:1047
selects between std_commands and editor_commands based on
FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE), so bot subcommands are
reached as `botcmd <name>` from the player console. Each handler walks
the array's static initializer directly to recover names + handler-fn
references; the runtime dispatch is irrelevant to extraction.

PATTERN 14 CANONICAL-NAME SUFFIXING (D7). The three tables overlap in
naming space without a suffix:
  - main vs std: 1 collision (info)
  - main vs editor: 1 collision (info)
  - std vs editor: 0 collisions in the canonical-1.46 source-walk; F1
    spec anchor said 25 collisions (every editor entry overlaps a std
    entry). Live source disagrees -- the std and editor tables are
    distinct command-name spaces (std: bot management; editor: marker /
    path manipulation). The Pattern 14 suffix is applied REGARDLESS of
    today's collision count -- it is a defensive API-surface marker
    (frogbot std vs editor are different runtime sub-namespaces) and
    survives any future tag adding overlapping names.

Suffix rules (D7):
  - cmd_t cmds[] entry "race"           -> canonical "race"
  - std_commands[] entry "skill"        -> canonical "skill:frogbot:std"
  - editor_commands[] entry "addmarker" -> canonical "addmarker:frogbot:editor"

Per-file dedup _seen_in_file is keyed on the FULL canonical name
(post-suffix), not the bare name. This preserves cross-table siblings if
any future name overlaps emerge.

DESCRIPTION SOURCES (priority order per spec 1.5):
  1. CD_* macro at the row's description-field index (Pattern 6 same-file
     #define resolution -- now via self.file_macros from the Phase 1 lift,
     reaching depth-1 #include'd headers like maps_macros.h or commands.h).
     Resolved via self.file_macros[ident] when the description-field
     extent is an all-caps identifier.
  2. Inline string literal in the row (frogbot tables already carry
     these as field 2 / 3 of the {name, fn, "desc"} init).
  3. Banner-comment harvest at the handler-function FUNCTION_DECL
     (Pattern 9; cross-file via two-row emission per Pattern 13). Falls
     back to NULL when no banner exists.

For the cmd_t cmds[] table, the description field is at index 4 (after
name, function, value, flags). For frogbot_cmd_t std/editor tables, it
is at index 2.

CROSS-CODEBASE PORT (D3). Inherits from Visitor only.

OUTPUT SHAPE (one row per unique canonical name; first-wins cross-file):

    {
      "name": "race",                # bare for cmds[]
      "bare_name": "race",
      "desc": "Toggle race mode",    # top-level so load-commands.ts pulls into help_desc
      "ast": {
        "handler_fn": "ToggleRace",
        "source_file": "src/commands.c",
        "source_line": 698,
        "source_column": 3,
        "table": "cmds",             # cmds | frogbot_std | frogbot_editor
        "description_source": "cd_macro" | "inline" | "banner" | null,
        "enclosing_function": null,  # KTX cmd_t / frogbot_cmd_t are module-scope arrays
      }
    }

For Pattern 14 suffixed entries, `name = "<bare>:frogbot:std"` /
`":frogbot:editor"`; `bare_name = "<bare>"` (preserved at top level for
load-commands.ts -- mirrors MVDSV's info_key bare_name pattern).

KTX has NO help_*.json, so finalize does not merge help text -- desc is
purely source-derived per the priority order.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._resolve import resolve_fn_ref  # noqa: E402
from extractor_lib._source import (  # noqa: E402
    literal_string,
    read_extent,
    strip_array_and_qualifiers,
    strip_quotes,
)

_DECORATION_RE = re.compile(r"^[=\-]+$")
_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_MACRO_IDENT_RE = re.compile(r"^[A-Z_][A-Z0-9_]+$")


# Per-table struct shape: maps the underlying base type (after
# strip_array_and_qualifiers) to (name_idx, handler_idx, desc_idx).
# Confirmed at canonical KTX 1.46:
#   cmd_t struct        @ src/commands.c:686-692  -> { name, function, value, flags, desc }
#   frogbot_cmd_t struct @ src/bot_commands.c:2308-2313 -> { name, function, desc }
_COMMAND_TABLE_SHAPES: dict[str, tuple[int, int, int]] = {
    "cmd_t":         (0, 1, 4),  # name, function, desc-idx in cmd_t init
    "frogbot_cmd_t": (0, 1, 2),  # name, function, desc-idx in frogbot_cmd_t init
}

# Map (base_type, var_spelling) -> sub-namespace tag for Pattern 14.
# When the sub-namespace tag is None (cmd_t cmds[]), no suffix applied.
# When non-None, canonical_name = "<bare>:" + sub_ns_tag.
_SUB_NS_BY_TABLE: dict[tuple[str, str], Optional[str]] = {
    ("cmd_t",         "cmds"):            None,
    ("frogbot_cmd_t", "std_commands"):    "frogbot:std",
    ("frogbot_cmd_t", "editor_commands"): "frogbot:editor",
}


def _function_banner(source_bytes: bytes, fn_def_offset: int) -> Optional[str]:
    """Doom-style /* === Title === Body === */ banner harvest. Mirrors
    mvdsv/_handler_commands.py::_function_banner -- shape-identical;
    behavior should match exactly. Bare-identifier-line elimination
    handles KTX's copy-paste banner-title mismatches the same way."""
    text = source_bytes.decode("utf-8", errors="replace")
    end_idx = text.rfind("*/", 0, fn_def_offset)
    if end_idx < 0:
        return None
    between = text[end_idx + 2:fn_def_offset]
    if between.strip():
        return None
    start_idx = text.rfind("/*", 0, end_idx)
    if start_idx < 0:
        return None
    block = text[start_idx + 2:end_idx]
    description_lines: list[str] = []
    for raw in block.splitlines():
        s = raw.strip()
        if not s:
            continue
        if _DECORATION_RE.match(s):
            continue
        if _IDENT_RE.match(s):
            continue
        description_lines.append(s)
    if not description_lines:
        return None
    return " ".join(description_lines).strip() or None


class CommandsKtxHandler(Visitor):
    """KTX commands handler (Pattern 4 + Pattern 6 + Pattern 9 + Pattern 14).

    Three target tables: cmd_t cmds[], frogbot_cmd_t std_commands[],
    frogbot_cmd_t editor_commands[]. Cross-codebase port from Visitor only
    (D3) -- no parent-project subclass.
    """
    name = "commands"
    output_filename = "ktx-commands-ast.json"
    payload_field = "commands"

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        self._repo_root = ktx_repo
        self._src_root = ktx_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup keyed on the FULL canonical name (post-Pattern-14
        # suffix). Bare-name dedup would drop legitimate cross-namespace
        # entries like "save" (editor_commands) vs a hypothetical future
        # "save" in cmds[].
        self._seen_in_file: set[str] = set()
        # FUNCTION_DECL banners harvested in this file (Pattern 9). Used by
        # finalize for cross-file resolution: a cmd row's handler_fn may
        # resolve to a function-def in another .c, so we emit banner rows
        # alongside cmd rows and merge in finalize.
        self._seen_fns_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        kind = cursor.kind

        # Pattern 9: FUNCTION_DECL banner harvest (cross-file via Pattern 13).
        if kind == CursorKind.FUNCTION_DECL and cursor.is_definition():
            fn_name = cursor.spelling
            if fn_name and fn_name not in self._seen_fns_in_file:
                self._seen_fns_in_file.add(fn_name)
                description = _function_banner(
                    self.source_bytes,
                    cursor.extent.start.offset,
                )
                self._rows.append({
                    "_kind": "_fn_def",
                    "fn_name": fn_name,
                    "description": description,
                })
            return

        # Pattern 4: struct-literal command tables.
        if kind != CursorKind.VAR_DECL:
            return
        base = strip_array_and_qualifiers(cursor.type.spelling)
        shape = _COMMAND_TABLE_SHAPES.get(base)
        if shape is None:
            return
        sub_ns = _SUB_NS_BY_TABLE.get((base, cursor.spelling))
        # Skip unknown VAR_DECLs of cmd_t/frogbot_cmd_t type that are not
        # the canonical three tables -- defensive against future helper
        # arrays that share the type but should not be treated as
        # registration tables.
        if (base, cursor.spelling) not in _SUB_NS_BY_TABLE:
            return

        outer_init = None
        for child in cursor.get_children():
            if child.kind == CursorKind.INIT_LIST_EXPR:
                outer_init = child
                break
        if outer_init is None:
            return

        name_idx, handler_idx, desc_idx = shape
        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None

        for elem in outer_init.get_children():
            init = elem
            if elem.kind != CursorKind.INIT_LIST_EXPR:
                # Designated-init or wrapped expression; descend to find
                # the actual INIT_LIST_EXPR if present.
                for ch in elem.get_children():
                    if ch.kind == CursorKind.INIT_LIST_EXPR:
                        init = ch
                        break
            if init.kind != CursorKind.INIT_LIST_EXPR:
                continue
            fields = list(init.get_children())
            if len(fields) <= max(name_idx, handler_idx):
                continue

            bare_name = literal_string(fields[name_idx], self.source_bytes)
            if not bare_name:
                continue

            handler_fn = resolve_fn_ref(fields[handler_idx])

            # Description resolution per spec 1.5 priority order.
            description: Optional[str] = None
            description_source: Optional[str] = None
            if len(fields) > desc_idx:
                desc_field = fields[desc_idx]
                # 1. Inline literal (frogbot std/editor tables ship these directly).
                inline = literal_string(desc_field, self.source_bytes)
                if inline:
                    description = inline
                    description_source = "inline"
                else:
                    # 2. CD_* macro via self.file_macros (Pattern 6 lift).
                    raw = read_extent(self.source_bytes, desc_field.extent).strip()
                    if _MACRO_IDENT_RE.match(raw):
                        macro_val = self.file_macros.get(raw)
                        if macro_val is not None:
                            description = macro_val
                            description_source = "cd_macro"
            # 3. Banner-comment fallback handled in finalize (handler_fn ->
            # banner via cross-file _fn_def merge per Pattern 13).

            # Pattern 14 suffix application.
            canonical_name = bare_name if sub_ns is None else f"{bare_name}:{sub_ns}"
            if canonical_name in self._seen_in_file:
                continue

            row: dict = {
                "_kind": "_cmd",
                "name": canonical_name,
                "bare_name": bare_name,
                "ast": {
                    "handler_fn": handler_fn,
                    "source_file": rel_file,
                    "source_line": init.location.line,
                    "source_column": init.location.column,
                    "table": cursor.spelling,
                    "description_source": description_source,
                    "enclosing_function": None,
                },
            }
            if description is not None:
                row["desc"] = description
            self._rows.append(row)
            self._seen_in_file.add(canonical_name)

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        self._seen_fns_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Partition into cmd rows and fn-def banners.
        fn_descriptions: dict[str, Optional[str]] = {}
        cmd_rows: list[dict] = []
        for r in all_rows:
            kind = r.get("_kind")
            if kind == "_fn_def":
                fn_name = r["fn_name"]
                if fn_name not in fn_descriptions:
                    fn_descriptions[fn_name] = r.get("description")
                else:
                    # Prefer non-None when the first observation lacked a banner.
                    if fn_descriptions[fn_name] is None and r.get("description"):
                        fn_descriptions[fn_name] = r["description"]
            elif kind == "_cmd":
                cmd_rows.append(r)

        # Cross-file first-wins by canonical name.
        seen: set[str] = set()
        unique: list[dict] = []
        for r in cmd_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)

        out_rows: list[dict] = []
        with_handler = 0
        with_description = 0
        by_table: dict[str, int] = {}
        for r in unique:
            handler_fn = r["ast"].get("handler_fn")
            description = r.get("desc")
            description_source = r["ast"].get("description_source")

            # Banner fallback: only fire if priority 1 + 2 produced nothing.
            if description is None and handler_fn:
                banner = fn_descriptions.get(handler_fn)
                if banner:
                    description = banner
                    description_source = "banner"

            entry: dict = {
                "name": r["name"],
                "bare_name": r["bare_name"],
                "ast": dict(r["ast"]),
            }
            entry["ast"]["description_source"] = description_source
            if description:
                entry["desc"] = description
                with_description += 1
            if handler_fn:
                with_handler += 1
            tbl = r["ast"].get("table") or "?"
            by_table[tbl] = by_table.get(tbl, 0) + 1

            out_rows.append(entry)

        out_rows.sort(key=lambda r: r["name"])
        return {
            "commands": out_rows,
            "_stats": {
                "source_total": len(cmd_rows),
                "function_defs_indexed": len(fn_descriptions),
                "count": len(out_rows),
                "with_handler": with_handler,
                "with_description": with_description,
                "by_table": by_table,
            },
        }
```

**Verification:**
- `python3 -c "import ast; ast.parse(open('apps/qw-oracle/scripts/extractors/ktx/_handler_commands.py').read())"` exits 0.
- `grep -c "_SUB_NS_BY_TABLE\|frogbot:std\|frogbot:editor" apps/qw-oracle/scripts/extractors/ktx/_handler_commands.py` returns at least `4` (Pattern 14 suffixes named).
- `grep -c "self.file_macros" apps/qw-oracle/scripts/extractors/ktx/_handler_commands.py` returns at least `1` (Pattern 6 lift consumed for CD_* description macros).
- `grep -c "from extractor_lib._visitor import Visitor" apps/qw-oracle/scripts/extractors/ktx/_handler_commands.py` returns `1`.
- `grep -E "from .*ezquake|from .*mvdsv|from .*fte|from .*qwcl" apps/qw-oracle/scripts/extractors/ktx/_handler_commands.py | wc -l` returns `0`.
- PASS condition: syntax valid; Pattern 14 + Pattern 6 visible; D3 cross-codebase port respected.
- FAIL condition: any check fails.

**Execution mode:** `subagent (Sonnet MAX)` -- judgment-dense across three table targets, two pattern overlays (Pattern 4 walks + Pattern 14 suffixing + Pattern 9 banner harvest + Pattern 6 macro resolution), and cross-file two-row emission for banner merging (Pattern 13). Three description sources with priority order. Sonnet MAX is the right calibration per D18: multi-file integration, multi-pattern, judgment-dense; subagent isolation prevents the surface from leaking into the drafter's working memory.

### Task 5: Create `_handler_info_keys.py` (KTX info_key handler -- producer-only)

**Goal:** Walk `CALL_EXPR` cursors with `cursor.spelling == "SetUserInfo"`. Match call sites with `arg[1]` literal-string starting with `*` (the producer convention for star-prefixed system keys). Emit one row per unique `(bare_key, scope=userinfo)` pair; canonical name = `<bare>:userinfo` per D7. Per F3: ~5-6 unique keys (recon shows 7 -- `*at`, `*is`, `*ml`, `*mm`, `*mp`, `*mt`, `*mu`); 36-38 write sites total. Consumer-only keys (KTX's 91+20 ezinfokey/infokey reads) are NOT extracted (per spec 1.6 producer-only emission rule).

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py` (created)

**Steps:**

- [ ] Create the file with the following content. Cross-codebase port from Visitor (D3). Mirrors MVDSV's `_handler_info_keys.py` structurally (cross-worker aggregation in finalize, all_call_sites fanout for high-fanout keys) but with KTX's API surface: only `SetUserInfo` (KTX has no `Info_*` consumer extraction per spec 1.6).

```python
"""Info keys handler for the KTX AST extractor.

Detects KTX's producer-side userinfo key writes via the SetUserInfo C
API. Consumer-only keys (the ~33 keys KTX reads via ezinfokey / infokey)
are NOT emitted -- they belong conceptually to the producer's project
(ezQuake CVAR_USERINFO, MVDSV info_key, or other KTX-produced star
keys). Per spec 1.6 producer-only emission rule.

API DETECTION:
  SetUserInfo(ent, "*KEY", value, SETUSERINFO_STAR)

The first arg is an entity pointer; the second arg is the key name as a
literal string starting with '*' (the producer convention for star
keys); the third is the value (often a va() expression -- not extracted
here; that is per-call-site state); the fourth is the SETUSERINFO_STAR
flag. We require the second arg to be a string-literal starting with '*'
to match the producer-emission shape; non-literal or non-star keys are
out of scope (they are caller-controlled keys, not KTX-defined).

CANONICAL NAME (D7 Pattern 14). Suffix `<bare>:userinfo` so the entity
table's UNIQUE(project, type, name) constraint cleanly disambiguates if
a future KTX tag adds the same bare key as a serverinfo or localinfo
write (KTX today emits userinfo only). Mirrors MVDSV's existing
suffixing convention. Bare name preserved at the top-level `bare_name`
field for MCP lookup_entity prefix-fallback.

KTX OUT OF SCOPE FOR THIS HANDLER:
  - ezinfokey / infokey READ sites (91 + 20 occurrences) -- consumer
    contract, not producer-emission. Per spec 1.6.
  - SetUserInfo writes whose second arg is NOT a literal star-key (e.g.
    Cmd_Argv-derived player-controlled keys) -- those are runtime
    payloads, not KTX-defined system keys.

CROSS-WORKER AGGREGATION (Approach B, mirrors MVDSV info_keys). Forked
workers each accumulate per-file primitive rows from end_file.
Aggregation by bare_name happens once in finalize in the parent, after
worker results merge.

Output entity shape (one row per unique bare_name):

    {
      "name": "*is:userinfo",
      "bare_name": "*is",
      "ast": {
        "scope": "userinfo",
        "operations": ["write"],
        "source_file": "src/g_userinfo.c",  # first-seen anchor
        "source_line": 226,
        "containing_function": "SomeFunc",
        "all_call_sites": [
          {"source_file": "src/g_userinfo.c", "source_line": 226, "operation": "write"}
        ]
      }
    }

Schema parity: load-info-keys.ts's buildInfoKeyVersionRow consumes
ast.scope, ast.operations (JSON-stringified TEXT), ast.all_call_sites
(JSONB array via tx.json per D14), ast.source_file, ast.source_line,
ast.containing_function. KTX's source_root field is NULL (single-engine
project, NULL = "engine" per SCHEMA.md).
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import literal_string  # noqa: E402


class InfoKeysKtxHandler(Visitor):
    """KTX info-keys handler (SetUserInfo producer-only detection).

    Cross-codebase port (D3) -- inherits from Visitor only. Read MVDSV's
    _handler_info_keys.py as a template; do NOT subclass it.

    No fork override hooks today.
    """
    name = "info_keys"
    output_filename = "ktx-info-keys-ast.json"
    payload_field = "info_keys"

    # Single producer API. KTX has no Info_Set / Info_SetStar wrappers
    # (those are MVDSV-side); the SETUSERINFO_STAR flag is KTX's
    # producer signal.
    REGISTRATION_API: str = "SetUserInfo"

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        self._repo_root = ktx_repo
        self._src_root = ktx_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup key: (line, key_name) so distinct call sites at
        # the same line (rare) survive while the single-variant walk's
        # potential re-emission of the same site collapses.
        self._seen_sites_in_file: set[tuple[int, str]] = set()
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        if cursor.spelling != self.REGISTRATION_API:
            return

        args = list(cursor.get_arguments())
        if len(args) < 2:
            return

        # Require a literal-string second arg (the key name).
        key_name = literal_string(args[1], self.source_bytes)
        if not key_name:
            return
        # Producer-emission filter: KTX system keys start with '*'. Non-star
        # keys here are caller-controlled (Cmd_Argv-derived) payloads, not
        # KTX-defined system keys. Per spec 1.6.
        if not key_name.startswith("*"):
            return

        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        containing_fn = self._func_stack[-1] if self._func_stack else None

        site_key = (location.line, key_name)
        if site_key in self._seen_sites_in_file:
            return
        self._seen_sites_in_file.add(site_key)

        # Emit primitive row -- one per call site. Cross-worker aggregation
        # by bare_name happens in finalize.
        self._rows.append({
            "name": key_name,        # bare key for now; suffixed in finalize
            "scope": "userinfo",     # KTX writes are userinfo-only per spec 1.6
            "op": "write",
            "source_file": rel_file,
            "source_line": location.line,
            "containing_function": containing_fn,
        })

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_sites_in_file = set()
        self._func_stack = []
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Approach B aggregation by bare_name. Pattern 14 suffix applied at
        # canonical-name emission time.
        aggregated: dict[str, dict] = {}
        for r in all_rows:
            bare = r["name"]
            site = {
                "source_file": r["source_file"],
                "source_line": r["source_line"],
                "operation": r["op"],
            }
            existing = aggregated.get(bare)
            if existing is None:
                aggregated[bare] = {
                    "name": f"{bare}:userinfo",   # Pattern 14 suffix per D7
                    "bare_name": bare,
                    "ast": {
                        "scope": "userinfo",
                        "operations": [r["op"]],
                        "source_file": r["source_file"],
                        "source_line": r["source_line"],
                        "containing_function": r["containing_function"],
                        "all_call_sites": [site],
                    },
                }
            else:
                ops = existing["ast"]["operations"]
                if r["op"] not in ops:
                    ops.append(r["op"])
                existing["ast"]["all_call_sites"].append(site)

        rows = list(aggregated.values())
        rows.sort(key=lambda r: r["name"])
        for r in rows:
            r["ast"]["operations"].sort()

        return {
            "info_keys": rows,
            "_stats": {
                "source_total_call_sites": len(all_rows),
                "count": len(rows),
                "by_scope": {"userinfo": len(rows)},
            },
        }
```

**Verification:**
- `python3 -c "import ast; ast.parse(open('apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py').read())"` exits 0.
- `grep -c "userinfo" apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py` returns at least `4` (Pattern 14 scope tag named).
- `grep -c "SETUSERINFO_STAR\|startswith.\"\\*\"\\)" apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py` returns at least `1` (star-key filter present).
- `grep -c "from extractor_lib._visitor import Visitor" apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py` returns `1`.
- `grep -E "from .*mvdsv" apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py | wc -l` returns `0` (no parent-project subclass per D3).
- PASS condition: syntax valid; Pattern 14 :userinfo suffix applied; producer-only filter present.
- FAIL condition: any check fails.

**Execution mode:** `subagent (Sonnet medium)` -- single-file code synthesis with a clear contract; the producer-only filter rule is a small twist on MVDSV's pattern but the surface is bounded. Sonnet medium per D18 floor for code-synthesis-shaped work.

### Task 6: Create `_handler_log_templates.py` (KTX log_template handler -- 4 APIs, new logfile channel)

**Goal:** Walk `CALL_EXPR` cursors matching one of four KTX print APIs (`G_bprint` -> broadcast, `G_sprint` -> client, `G_cprint` -> console, `log_printf` -> logfile). Pull the format-string literal at the per-API arg index. Emit per-call-site primitive rows; aggregate in finalize by `(channel, format_string_normalized)` with `all_call_sites` fanout (mirrors MVDSV's all_call_sites convention). Per F4: 655 + 1068 + 43 + 28 = 1794 emission sites; per recon, 681 + 1071 + 43 + 28 = 1823 (acceptable drift). Per F17 + D10: do NOT filter XML-shaped log_printfs -- they are intentionally emitted as channel='logfile' rows; Phase 6's match_event handler emits a SECOND row type per the dual-row design (D10).

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py` (created)

**Steps:**

- [ ] Create the file with the following content. Cross-codebase port from Visitor (D3). Mirrors MVDSV's `_handler_log_templates.py` shape (CHANNEL_TABLE dispatch, all_call_sites aggregation in finalize) with KTX's four-API surface, including the new `'logfile'` channel value (admitted by migration 008).

```python
"""Log templates handler for the KTX AST extractor.

Detects format-string call sites for KTX print emission and channel-
discriminates by API name:

  channel='broadcast' -> G_bprint(level, "fmt", ...)
  channel='client'    -> G_sprint(ent, level, "fmt", ...)
  channel='console'   -> G_cprint("fmt", ...)
  channel='logfile'   -> log_printf("fmt", ...)        # NEW channel per D5/F4

The 'logfile' channel value is admitted by migration 008 (Phase 1).
KTX is the first engine to emit channel='logfile' rows.

DUAL-ROW DESIGN (D10 + F17). Pass 1.7's printf-handler INTENTIONALLY
emits XML-shaped log_printf sites (e.g. log_printf("\\t\\t\\t<pickmi
time=...")) as channel='logfile' rows. Phase 6's _handler_match_events
.py (XSD-driven) emits a separate match_event_versions row for the same
emission sites. The duplication IS the design: per-site truth (printf
format string, file/line, channel) vs per-type truth (XSD attribute
schema, all sites). Do NOT add a filter to skip XML-shaped log_printfs.

Canonical entity name format: '<channel>:<format_string_normalized>'
where format_string_normalized strips the trailing newline. Same shape
as MVDSV's log_template handler. The same format string emitted via
different APIs becomes different entities (channel-discriminated), which
preserves per-channel distinction.

PER-FILE DEDUP. Per-file dedup on canonical name; cross-file aggregation
keyed by canonical name in finalize, with the first observation seeding
the top-level (containing_function, source_file, source_line) and EVERY
observation appended to all_call_sites (parity with MVDSV's Phase D
fanout convention).

MULTI-LINE STRING-LITERAL CONCAT. C lets you split a format string
across multiple adjacent quoted literals (e.g. log_printf("\\t\\t<event>\\n"
"foo\\n")). libclang's CALL_EXPR.get_arguments() returns ONE arg whose
extent covers both literals; the source extent reads as `"foo\\n"\n
"bar\\n"`. We accept the inter-literal whitespace noise in the
canonical name rather than try to merge adjacent literals -- the row is
still addressable, the format_string field preserves the raw source
form, and the cases are rare in KTX. Same convention as MVDSV.

ESCAPE PRESERVATION. Format strings stored in raw source form (\\n,
\\", \\\\ etc preserved as the C-source shows them). Consumers handle
interpretation. Mirrors MVDSV's escape-preservation contract per
SCHEMA.md log_template_versions section.

CROSS-CODEBASE PORT (D3). Inherits from Visitor only.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import read_extent  # noqa: E402


def _normalize_format(s: str) -> str:
    """Strip trailing newline (canonical-name normalization). Strip leading
    /trailing whitespace as defensive measure. Mirrors MVDSV's
    _normalize_format exactly."""
    return s.rstrip("\n").strip()


class LogTemplatesKtxHandler(Visitor):
    """KTX log-templates handler (4-API format-string detection).

    Cross-codebase port (D3) -- inherits from Visitor only. Read MVDSV's
    _handler_log_templates.py as a template; do NOT subclass it.

    No fork override hooks today.
    """
    name = "log_templates"
    output_filename = "ktx-log-templates-ast.json"
    payload_field = "log_templates"

    # API spelling -> (channel, format_string_arg_index). CALL_EXPR cursor
    # spelling matches the function name exactly. Indices are zero-based
    # into the cursor's get_arguments() iterator.
    #
    # Channel value 'logfile' is the new value admitted by migration 008
    # (Phase 1) -- KTX is the first engine to use it.
    CHANNEL_TABLE: dict = {
        # broadcast: sent to all connected clients (KTX equivalent of
        # MVDSV's SV_BroadcastPrintf).
        "G_bprint":   ("broadcast", 1),  # (level, fmt, ...)
        # client: sent to one client.
        "G_sprint":   ("client",    2),  # (ent, level, fmt, ...)
        # console: server-console / log channel.
        "G_cprint":   ("console",   0),  # (fmt, ...)
        # logfile: KTX's extralog / match-event emission channel.
        # Includes XML-shaped emissions per F17 + D10 dual-row design.
        "log_printf": ("logfile",   0),  # (fmt, ...)
    }

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        self._repo_root = ktx_repo
        self._src_root = ktx_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup on canonical name. KTX is single-variant TU; this
        # collapses any cursor-traversal re-emission of the same call.
        self._seen_in_file: set[str] = set()
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        spelling = cursor.spelling
        cfg = self.CHANNEL_TABLE.get(spelling)
        if cfg is None:
            return
        channel, fmt_idx = cfg

        args = list(cursor.get_arguments())
        if len(args) <= fmt_idx:
            return

        text = read_extent(self.source_bytes, args[fmt_idx].extent).strip()
        # Bare literal-string check. Concatenated literals like
        # ("foo " "bar") DO pass this check (text starts with the opening
        # `"` of the first literal and ends with the closing `"` of the
        # last) so they are captured. va() / identifier / ternary args
        # fail and get skipped.
        if not (text.startswith('"') and text.endswith('"')):
            return
        format_string = text[1:-1]
        if not format_string:
            return

        normalized = _normalize_format(format_string)
        if not normalized:
            return
        canonical = f"{channel}:{normalized}"
        if canonical in self._seen_in_file:
            return

        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        containing_fn = self._func_stack[-1] if self._func_stack else None

        self._rows.append({
            "name": canonical,
            "ast": {
                "channel": channel,
                "format_string": format_string,
                "format_string_normalized": normalized,
                "source_file": rel_file,
                "source_line": location.line,
                "containing_function": containing_fn,
            },
        })
        self._seen_in_file.add(canonical)

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        self._func_stack = []
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Cross-file aggregation by canonical name. Per-file dedup already
        # collapsed duplicate emissions in one walk. Across .c files the
        # first observation seeds the top-level fields for display
        # compatibility; EVERY observation accumulates into all_call_sites
        # so high-fanout templates retain the full set of sites (parity
        # with MVDSV's Phase D fanout convention).
        by_name: dict[str, dict] = {}
        order: list[str] = []
        for r in all_rows:
            ast = r["ast"]
            site = {
                "source_file": ast.get("source_file"),
                "source_line": ast.get("source_line"),
                "containing_function": ast.get("containing_function"),
            }
            if r["name"] not in by_name:
                merged_ast = dict(ast)
                merged_ast["all_call_sites"] = [site]
                by_name[r["name"]] = {"name": r["name"], "ast": merged_ast}
                order.append(r["name"])
            else:
                merged = by_name[r["name"]]
                sites = merged["ast"]["all_call_sites"]
                key = (site["source_file"], site["source_line"])
                if not any((s["source_file"], s["source_line"]) == key for s in sites):
                    sites.append(site)

        unique = [by_name[n] for n in order]
        unique.sort(key=lambda r: (r["ast"]["channel"], r["name"]))

        by_channel: dict[str, int] = {}
        total_call_sites = 0
        for r in unique:
            ch = r["ast"]["channel"]
            by_channel[ch] = by_channel.get(ch, 0) + 1
            total_call_sites += len(r["ast"].get("all_call_sites") or [])

        return {
            "log_templates": unique,
            "_stats": {
                "source_total": len(all_rows),
                "count": len(unique),
                "by_channel": by_channel,
                "total_call_sites": total_call_sites,
            },
        }
```

**Verification:**
- `python3 -c "import ast; ast.parse(open('apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py').read())"` exits 0.
- `grep -c "G_bprint\|G_sprint\|G_cprint\|log_printf" apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py` returns at least `4` (all four APIs in CHANNEL_TABLE).
- `grep -c "logfile" apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py` returns at least `2` (channel value + dual-row note).
- `grep -c "all_call_sites" apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py` returns at least `2` (fanout convention).
- `grep -c "from extractor_lib._visitor import Visitor" apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py` returns `1`.
- `grep -E "from .*mvdsv" apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py | wc -l` returns `0`.
- `grep -E "skip|filter" apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py | grep -i "xml\|<event>\|<pickmi" | wc -l` returns `0` (F17 anti-filter rule respected).
- PASS condition: syntax valid; CHANNEL_TABLE includes 'logfile'; all_call_sites fanout present; no XML filter; D3 cross-codebase port respected.
- FAIL condition: any check fails.

**Execution mode:** `subagent (Sonnet medium)` -- multi-API dispatch with a clear contract; mirrors MVDSV's pattern with the four-API substitution. Sonnet medium per D18 floor for clean-spec code synthesis.

### Task 7: Update `LOG_TEMPLATE_CHANNELS` in `constants.ts`

**Goal:** Widen the runtime channel allowlist to include `'logfile'` so the KTX log_template entries don't get rejected by the loader's name-validation gate. Migration 008 widens the SQL-level CHECK; this constant mirrors that for the runtime regex `LOG_TEMPLATE_NAME_RE` built in `load-version.ts:125`.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/constants.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/constants.ts` and replace the `LOG_TEMPLATE_CHANNELS` line. The existing content is:

```ts
export const LOG_TEMPLATE_CHANNELS = ['broadcast', 'client', 'console', 'system'] as const;
```

Replace with:

```ts
export const LOG_TEMPLATE_CHANNELS = ['broadcast', 'client', 'console', 'system', 'logfile'] as const;
```

- [ ] Update the comment immediately above the constant to note the migration provenance:

```ts
// Mirrored by the SQL-level CHECK constraints on info_key_versions.scope and
// log_template_versions.channel. Keep in sync with the literal CHECK values
// in db/migrations/002_layer1_schema.sql when adding a new scope/channel.
// 'logfile' added by migration 008_ktx_log_template_logfile_channel.sql for
// KTX's log_printf API.
export const INFO_KEY_SCOPES = ['userinfo', 'serverinfo', 'localinfo'] as const;
export const LOG_TEMPLATE_CHANNELS = ['broadcast', 'client', 'console', 'system', 'logfile'] as const;
```

(Only update the comment and the LOG_TEMPLATE_CHANNELS line; leave INFO_KEY_SCOPES unchanged -- KTX's info_keys all use scope='userinfo', no widening needed.)

**Verification:**
- `grep -c "'logfile'" apps/qw-oracle/scripts/load-knowledge/constants.ts` returns at least `1`.
- `bunx tsc --noEmit -p apps/qw-oracle/tsconfig.json` exits 0 (the constant is `as const`-typed; this also catches any consumer that destructured the old 4-element tuple). If apps/qw-oracle uses a different tsc invocation, mirror that.
- PASS condition: 'logfile' present in the constant; tsc clean.
- FAIL condition: 'logfile' missing OR tsc error.

**Execution mode:** `inline` -- one-line text edit with full content shipped above; no logic; mechanical Edit call.

### Task 8: Wire KTX into `extract-tag.ts`

**Goal:** Populate `PROJECT_EXTRACTOR.ktx` so the orchestrator can run the new ktx/extract.py; populate `ENTITY_JSON_FILES.ktx` with the four KTX entity types so loaders know which JSON file each type's payload lives in. Per-loader adapter is engine-agnostic; no other extract-tag changes required.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`. Find the `PROJECT_EXTRACTOR` declaration (lines 43-50) and replace the `ktx: null,` line with:

```ts
  ktx: join(EXTRACTORS_ROOT, 'ktx', 'extract.py'),
```

- [ ] Find the `ENTITY_JSON_FILES.ktx` declaration (line 155) and replace the empty `ktx:   {},` block with:

```ts
  ktx: {
    cvar:         'ktx-variables-ast.json',
    command:      'ktx-commands-ast.json',
    info_key:     'ktx-info-keys-ast.json',
    log_template: 'ktx-log-templates-ast.json',
  },
```

- [ ] Confirm the surrounding map lines for ezquake/fte/mvdsv/qwcl/qw remain unchanged (mechanical eyes-on; the change is two replacements only).

- [ ] Confirm `PROJECT_HAS_ASSET_BUNDLE.ktx` stays `false` (line 101 today; KTX is server-only, no asset bundle), `PROJECT_DEFAULT_BRANCH.ktx` stays `'master'` (line 72), `PROJECT_REPO_PATH.ktx` stays as the existing path (line 35), `PROJECT_EXTRACTOR_OUTPUT_DIR.ktx` stays as the existing path (line 56), and `PROJECT_VERSION_ALIASES.ktx` stays `{}` (line 87 -- KTX uses native git tags, no aliasing needed).

The full final shape of the relevant blocks (for verifier reference):

```ts
const PROJECT_EXTRACTOR: Record<Project, string | null> = {
  ezquake: join(EXTRACTORS_ROOT, 'ezquake', 'extract.py'),
  fte: join(EXTRACTORS_ROOT, 'fte', 'extract.py'),
  mvdsv: join(EXTRACTORS_ROOT, 'mvdsv', 'extract.py'),
  ktx: join(EXTRACTORS_ROOT, 'ktx', 'extract.py'),
  qwcl: join(EXTRACTORS_ROOT, 'qwcl', 'extract.py'),
  qw: null,
};
```

```ts
const ENTITY_JSON_FILES: Record<Project, Partial<Record<EntityType, string>>> = {
  // ... ezquake / qwcl / fte / mvdsv unchanged ...
  ktx: {
    cvar:         'ktx-variables-ast.json',
    command:      'ktx-commands-ast.json',
    info_key:     'ktx-info-keys-ast.json',
    log_template: 'ktx-log-templates-ast.json',
  },
  qw:    {},
};
```

**Verification:**
- `grep -E "ktx:.*extract\.py" apps/qw-oracle/scripts/load-knowledge/extract-tag.ts | wc -l` returns at least `1`.
- `grep -c "ktx-variables-ast.json" apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` returns `1`.
- `grep -c "ktx-commands-ast.json\|ktx-info-keys-ast.json\|ktx-log-templates-ast.json" apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` returns `3`.
- `grep -E "ktx:\s*null" apps/qw-oracle/scripts/load-knowledge/extract-tag.ts | wc -l` returns `0` (the old null mapping is gone).
- `bunx tsc --noEmit -p apps/qw-oracle/tsconfig.json` exits 0.
- PASS condition: all four JSON filenames present; null entry replaced; tsc clean.
- FAIL condition: any check fails.

**Execution mode:** `inline` -- two text replacements with full final content shipped above; no logic; mechanical Edit calls.

### Task 9: Run KTX extraction + load against the dev DB

**Goal:** Confirm the end-to-end extract -> load pipeline works for KTX. Per D15 idempotency: re-runs are safe and produce identical row counts; the load-version drop-guard is NOT bypassed.

**Files:** none modified by this task; the dev DB gains KTX rows.

**Steps:**

- [ ] From `apps/qw-oracle/`, run the KTX extractor manually first to confirm it produces the four JSON files:
  ```bash
  python3 scripts/extractors/ktx/extract.py \
      --repo-root ../../research/repos/ktx \
      --output-dir scripts/extractors/ktx/output \
      --handlers all
  ```
  Expected: four output JSON files at `apps/qw-oracle/scripts/extractors/ktx/output/`:
  - `ktx-variables-ast.json` (cvars)
  - `ktx-commands-ast.json` (commands)
  - `ktx-info-keys-ast.json` (info_keys)
  - `ktx-log-templates-ast.json` (log_templates)

- [ ] Inspect the per-file row counts from the four `_stats.count` fields. Expected ranges (per F1/F2/F3/F4 anchors, with the operator-confirmed amendments from this phase MD's Open Questions):
  - cvars: ~225 unique names (192 k_ + ~33 non-k_; F1 anchor 192 k_-prefixed only, this handler emits all per Exhaustive Mapping Rule)
  - commands: ~365-415 unique canonical names (main cmds[] ~317-371 + std_commands 14 + editor_commands 25, all suffixed via Pattern 14 where applicable)
  - info_keys: ~7 unique star-keys (anchor F3 says 5-6; recon shows 7: *at, *is, *ml, *mm, *mp, *mt, *mu)
  - log_templates: ~1500-2000 unique format strings after dedup (anchor F4 says 1500-2000; raw call sites ~1800-1830)

- [ ] If counts are wildly off (>50% from expected ranges), STOP and triage before loading -- the loader's drop-guard would catch a regression but a wrong-shape success would silently land bad rows.

- [ ] Now run the orchestrator end-to-end:
  ```bash
  bun scripts/load-knowledge/index.ts extract-tag --project ktx --version head
  ```
  This re-runs the extractor (idempotent), then dispatches loadVersion for each of the four entity types per the new ENTITY_JSON_FILES.ktx mapping.

- [ ] Confirm zero errors. The `[load-version]` warnings are acceptable IF they describe cross-type orphan pruning (per Pattern 8 expected behavior).

- [ ] Re-run the same command. The drop-guard should NOT fire (the re-run produces identical entity counts), and the per-row UPSERTs should leave row counts unchanged.

**Verification:**
- All four output JSON files exist at `apps/qw-oracle/scripts/extractors/ktx/output/` with non-empty `_stats.count`.
- The dev DB has KTX rows in each of the four target tables. SQL probes:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
    "SELECT type, COUNT(*) FROM entities WHERE project='ktx' GROUP BY type ORDER BY type"
  ```
  Expected: 4 rows -- cvar / command / info_key / log_template -- with non-zero counts in each.
- Channel distribution probe:
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
    "SELECT channel, COUNT(*) FROM log_template_versions ltv
     JOIN entities e ON e.id = ltv.entity_id
     WHERE e.project='ktx' GROUP BY channel ORDER BY channel"
  ```
  Expected: 4 channels -- broadcast / client / console / logfile -- each with non-zero count. The 'logfile' channel SHOULD be present (validates the migration 008 + constants.ts widening landed correctly).
- Pattern 14 probe (commands suffixing):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
    "SELECT COUNT(*) AS frogbot_count FROM entities
     WHERE project='ktx' AND type='command' AND name LIKE '%:frogbot:%'"
  ```
  Expected: 14 (std) + 25 (editor) = 39 frogbot-suffixed rows.
- Pattern 14 probe (info_keys suffixing):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
    "SELECT COUNT(*) FROM entities
     WHERE project='ktx' AND type='info_key' AND name LIKE '%:userinfo'"
  ```
  Expected: matches the info_keys count from `_stats.count`.
- JSONB-binding regression probe (D14 gate). Confirm `all_call_sites_json` and `call_sites_json` are JSONB arrays (not stringified):
  ```bash
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
    "SELECT
       jsonb_typeof(all_call_sites_json) AS lt_type,
       (SELECT jsonb_typeof(call_sites_json) FROM info_key_versions iv2
        JOIN entities e2 ON e2.id = iv2.entity_id WHERE e2.project='ktx' LIMIT 1) AS ik_type
     FROM log_template_versions ltv
     JOIN entities e ON e.id = ltv.entity_id
     WHERE e.project='ktx' LIMIT 1"
  ```
  Expected: `lt_type=array`, `ik_type=array` (NOT `string` -- the SQLite-era stringify bug).
- PASS condition: all four type counts non-zero; 'logfile' channel present; Pattern 14 suffixes applied; jsonb_typeof returns 'array'.
- FAIL condition: any check fails OR jsonb_typeof returns 'string'.

**Execution mode:** `inline` -- mechanical CLI invocations; no logic synthesis. The operator (or executor) copy-pastes the commands and reads the SQL output.

### Task 10: Single commit landing all Phase 2 changes

**Goal:** Commit Phase 2 as one coherent unit per D16 (phase atomicity). Per D20: directly to `main`, no PR ceremony.

**Files:** all the Phase 2 creates + modifies, plus the four output JSON files (committed since they are the canonical extraction artifact for `ktx@head`).

**Steps:**

- [ ] Stage:
  ```
  git add \
    apps/qw-oracle/scripts/extractors/ktx/extract.py \
    apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py \
    apps/qw-oracle/scripts/extractors/ktx/_handler_commands.py \
    apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py \
    apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py \
    apps/qw-oracle/scripts/extractors/ktx/output/ktx-variables-ast.json \
    apps/qw-oracle/scripts/extractors/ktx/output/ktx-commands-ast.json \
    apps/qw-oracle/scripts/extractors/ktx/output/ktx-info-keys-ast.json \
    apps/qw-oracle/scripts/extractors/ktx/output/ktx-log-templates-ast.json \
    apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py \
    apps/qw-oracle/scripts/load-knowledge/constants.ts \
    apps/qw-oracle/scripts/load-knowledge/extract-tag.ts \
    docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-2-pass1-entity-handlers.md \
    docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md \
    docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
  ```
  (review-findings.md updated with new F-numbers per this phase's Open Questions if amendments land.)

- [ ] Commit with the message:
  ```
  arc(ktx): Phase 2 -- Pass 1 entity handlers (cvars / commands / info_keys / log_templates) + dispatch wiring

  Four KTX-private handlers ship under apps/qw-oracle/scripts/extractors/ktx/:
  - _handler_cvars.py: RegisterCvar / RegisterCvarEx detection (Pattern 5);
    Pattern 6 macro-arg resolution via Phase 1's lifted self.file_macros for
    bot-cvar registrations.
  - _handler_commands.py: cmd_t cmds[] + frogbot_cmd_t std_commands[] +
    editor_commands[] (Pattern 4); Pattern 14 canonical-name suffixing per D7
    ('<name>' / '<name>:frogbot:std' / '<name>:frogbot:editor'); description
    priority order CD_*-macro -> inline literal -> banner harvest (Pattern 6 +
    Pattern 9 via Pattern 13 cross-file emission).
  - _handler_info_keys.py: SetUserInfo producer-only (~7 star-keys); Pattern 14
    ':userinfo' suffix per D7. Consumer-only ezinfokey/infokey reads
    intentionally NOT extracted per spec 1.6.
  - _handler_log_templates.py: G_bprint / G_sprint / G_cprint / log_printf
    (4 APIs); new 'logfile' channel value per F4/D5/008 admits log_printf
    rows; XML-shaped log_printfs intentionally captured per F17/D10 dual-row
    design.

  All four handlers cross-codebase port from extractor_lib._visitor.Visitor
  (D3); no parent-project subclass.

  ktx/extract.py driver mirrors mvdsv/extract.py shape with single-variant
  TU parse (KTX has no Win/Linux/Apple platform splits). clang_args_ktx_for
  added to extractor_lib/clang_config.py with -DBOT_SUPPORT enabled.

  Loader wiring: extract-tag.ts populates PROJECT_EXTRACTOR.ktx +
  ENTITY_JSON_FILES.ktx (cvar / command / info_key / log_template).
  constants.ts widens LOG_TEMPLATE_CHANNELS to admit 'logfile' so KTX
  log_template entity-name validation passes load-version.ts:463.

  Per-loader adapters (load-cvars.ts / load-commands.ts / load-info-keys.ts
  / load-log-templates.ts) are already engine-agnostic; no per-engine
  changes.

  Resolves: F1 (cvar bucket counts; reproduced), F2 (command counts +
  Pattern 14 collisions; flagged: F1/F2 spec anchors drift from live source --
  see Open Questions in phase MD; live-source counts win per D1 amendment
  process), F3 (info_key producer-only; 7 unique star-keys), F4 (log_template
  printf counts via four-API CHANNEL_TABLE with new 'logfile' channel),
  F17 (XML-shaped log_printfs intentionally NOT filtered per D10 dual-row
  design).

  Pre-stages: Phase 7 F1 quality-grid probes for KTX kinds; Phase 6 match_event
  handler relies on log_template rows surviving without filtering for the
  dual-row design.
  ```

- [ ] Push to origin per the project's git workflow.

**Verification:**
- `git log -1 --oneline` shows the new commit.
- `git status` is clean.
- PASS condition: clean commit, no uncommitted residuals.
- FAIL condition: working tree shows uncommitted changes after the commit OR git push fails.

**Execution mode:** `inline` -- mechanical git operations.

## Verification (phase boundary)

Operator runs the full sweep at the end of Phase 2. Each probe returns YES/NO:

**1. Four handler files present and syntax-valid.**
```bash
for f in _handler_cvars.py _handler_commands.py _handler_info_keys.py _handler_log_templates.py; do
  test -f apps/qw-oracle/scripts/extractors/ktx/$f && \
    python3 -c "import ast; ast.parse(open('apps/qw-oracle/scripts/extractors/ktx/$f').read())" \
    && echo "OK: $f" || echo "FAIL: $f"
done
```
- PASS condition: all four print "OK".
- FAIL condition: any print "FAIL" or are absent.

**2. KTX extractor driver runs end-to-end on canonical KTX.**
```bash
cd apps/qw-oracle && \
  python3 scripts/extractors/ktx/extract.py \
    --repo-root ../../research/repos/ktx \
    --output-dir scripts/extractors/ktx/output \
    --handlers all
```
- PASS condition: exit 0; the parse phase summarizes "[ktx] N .c files" and lists 4 handlers; per-handler raw row counts are non-zero.
- FAIL condition: any non-zero exit OR any handler with 0 raw rows.

**3. Four output JSON files exist with non-empty `_stats.count`.**
```bash
for f in ktx-variables-ast.json ktx-commands-ast.json ktx-info-keys-ast.json ktx-log-templates-ast.json; do
  jq '._stats.count' apps/qw-oracle/scripts/extractors/ktx/output/$f
done
```
- PASS condition: four non-zero integers; cvar count >= 192, command count >= 350, info_key count >= 5, log_template count >= 1000.
- FAIL condition: any zero or absent.

**4. Pattern 14 suffixes applied where expected.**
```bash
jq -r '.commands[] | select(.name | contains(":frogbot:")) | .name' \
  apps/qw-oracle/scripts/extractors/ktx/output/ktx-commands-ast.json | wc -l
```
- PASS condition: returns at least 39 (14 std + 25 editor).
- FAIL condition: returns less than 39.

```bash
jq -r '.info_keys[] | .name' apps/qw-oracle/scripts/extractors/ktx/output/ktx-info-keys-ast.json | head -20
```
- PASS condition: every name ends with `:userinfo`.
- FAIL condition: any name lacks the suffix.

**5. F17: XML-shaped log_printfs land as channel='logfile' rows.**
```bash
jq -r '.log_templates[] | select(.ast.channel == "logfile") | select(.ast.format_string | startswith("\t\t\t<")) | .ast.format_string' \
  apps/qw-oracle/scripts/extractors/ktx/output/ktx-log-templates-ast.json | wc -l
```
- PASS condition: returns >= 7 (the 7 distinct XML-event format strings recon found at canonical-1.46; bumps higher if the tag has more event sites).
- FAIL condition: returns 0 (means an unintended filter is in place).

**6. extract-tag dispatch wiring lands all four KTX types.**
```bash
bun apps/qw-oracle/scripts/load-knowledge/index.ts extract-tag --project ktx --version head
```
- PASS condition: exit 0; the orchestrator reports `entitiesLoaded` for cvar / command / info_key / log_template each non-zero.
- FAIL condition: any error OR any entitiesLoaded[type] is zero.

**7. KTX entity rows queryable per type.**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c \
  "SELECT type, COUNT(*) FROM entities
   WHERE project='ktx' GROUP BY type ORDER BY type"
```
- PASS condition: 4 rows -- cvar / command / info_key / log_template -- non-zero counts.
- FAIL condition: fewer rows OR zero count for any type.

**8. The new 'logfile' channel is populated for KTX log_templates.**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c \
  "SELECT channel, COUNT(*) FROM log_template_versions ltv
   JOIN entities e ON e.id = ltv.entity_id
   WHERE e.project='ktx' GROUP BY channel ORDER BY channel"
```
- PASS condition: at least one row with channel='logfile' and non-zero count; broadcast / client / console also present.
- FAIL condition: 'logfile' missing OR any expected channel returns zero.

**9. JSONB binding regression-gate (D14).**
```bash
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c \
  "SELECT
     jsonb_typeof(ltv.all_call_sites_json) AS lt,
     (SELECT jsonb_typeof(iv.call_sites_json) FROM info_key_versions iv
      JOIN entities e ON e.id = iv.entity_id WHERE e.project='ktx' LIMIT 1) AS ik
   FROM log_template_versions ltv
   JOIN entities e ON e.id = ltv.entity_id
   WHERE e.project='ktx' AND ltv.all_call_sites_json IS NOT NULL LIMIT 1"
```
- PASS condition: both columns return `array` (NOT `string`).
- FAIL condition: either returns `string` (the SQLite-era stringify bug per D14 -- regression gate).

**10. Idempotency probe (D15).**
```bash
# Capture pre-rerun counts.
PRE_CVAR=$(docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c \
  "SELECT COUNT(*) FROM entities WHERE project='ktx' AND type='cvar'")
# Re-run extract-tag.
bun apps/qw-oracle/scripts/load-knowledge/index.ts extract-tag --project ktx --version head
# Capture post-rerun counts.
POST_CVAR=$(docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c \
  "SELECT COUNT(*) FROM entities WHERE project='ktx' AND type='cvar'")
echo "pre=$PRE_CVAR post=$POST_CVAR"
```
- PASS condition: pre == post.
- FAIL condition: post != pre (means non-idempotent loader behavior).

**11. Phase 2 commit landed cleanly.**
```bash
git log -1 --pretty=oneline
git status --short
```
- PASS condition: latest commit names Phase 2; `git status --short` is empty.
- FAIL condition: latest commit is something else OR working tree dirty.

**12. No regression in unrelated extractors.**
Optional spot-check: re-run a small ezQuake / MVDSV extraction (1 file each via `--limit-files 1`). The Phase 1 lift's pass-through behavior on existing handlers should be identity. If the operator does not have a baseline to diff against, this probe is informational only.

If all required probes (1-11) pass, Phase 2 is done; proceed to Phase 3 (or Phases 3-6 in parallel). If any probe fails, see `## Recovery` below.

## Outputs to next phase

After Phase 2 ships, the following hold for Phases 3 / 4 / 5 (mutually independent at the data level):

- Dev DB has KTX rows for cvar + command + info_key + log_template entity types. Per-version tables `cvar_versions`, `command_versions`, `info_key_versions`, `log_template_versions` populated.
- The `'logfile'` channel value is exercised in production data; Phase 6's match_event handler can rely on log_template rows surviving as their persistent dual-row partner.
- KTX cvars `k_extralog`, `k_extralog_xsd_uri`, `extralogname` exist as cvar entities -- Phase 6's match_event handler references them as gating cvars without re-extracting (per F14 footnote).
- The four KTX handlers + driver + dispatch wiring serve as templates for Phase 3-5 gameplay-content handlers. Phase 3 (`_handler_modes.py`) follows the same shape (cross-codebase port, single-variant TU, walker-strategy-grouped per D6); Phase 4-5 likewise.
- `clang_args_ktx_for` is the canonical KTX clang args function in `extractor_lib/clang_config.py`; Phase 3-5 handlers reuse it via `_WORKER_CLANG_BASE`.
- The `LOG_TEMPLATE_CHANNELS` constant change (constants.ts) is durable for any future engine that emits to a 'logfile' channel -- not KTX-specific.
- The Pattern 14 suffix convention (`:frogbot:std` / `:frogbot:editor` / `:userinfo`) is in production. Future engine ports that surface multi-namespace registrations follow the same shape; no schema change.

## Open questions / deferred items

- **Question:** F1's "API split: ~205 RegisterCvarEx (with default), ~50 RegisterCvar (no default)" anchor is INVERTED relative to live source. Recon at canonical 1.46 (master HEAD) shows 181 RegisterCvar (no-default) + 114 RegisterCvarEx (with-default) = 295 raw call sites; ratio 1.6:1, not 4:1. The "192 unique k_-prefixed cvars" anchor remains valid.
  **Default chosen for now:** Phase 2's handler reproduces the 192-k_-anchor and emits all `RegisterCvar*` rows regardless of name prefix (per Exhaustive Mapping Rule); the `_stats.by_api` field captures the live ratio. The phase-boundary verification probes assert "cvar count >= 192" rather than reproducing F1's incorrect API split numerically.
  **Who can resolve:** operator. If F1's API split sub-anchor should be updated, append a 2026-05-05 amendment block to F1 with the new numbers (181 / 114) and the explanation that the brainstorm-time estimate inverted the count.

- **Question:** F2's command-count anchors don't fully match live source. Recon at canonical-1.46 (master HEAD) shows std_commands has 14 entries (F1 says 39); editor_commands has 25 entries (matches F1); main `cmd_t cmds[]` has ~371 raw `{ "..." }` lines (F1 says 317 unique). Cross-table collisions: std vs editor is 0 in live source (F1 says 25); main vs editor is at least 1 (`info`). Pattern 14 suffix is still applied per D7 because the suffix is a defensive API-surface marker, not just a collision-avoidance hack.
  **Default chosen for now:** Phase 2 reproduces the LIVE-SOURCE counts in `_stats.by_table` and verification probe 4 (frogbot_count >= 39 = 14 std + 25 editor). Pattern 14 suffix is applied unconditionally per D7. The phase MD ships the handler shape that survives any future tag adding new entries.
  **Who can resolve:** operator. F2 anchor amendment would update std_commands count (39 -> 14) and re-frame the cross-table collision count (25 -> 0 in canonical-1.46 with note that Pattern 14 still applies for API-surface clarity).

- **Question:** F3's "5-6 unique star-keys" anchor is slightly off at canonical-1.46. Recon shows 7 unique keys: `*at`, `*is`, `*ml`, `*mm`, `*mp`, `*mt`, `*mu`. Total write sites: 36 (F3 says 38).
  **Default chosen for now:** Phase 2 reproduces what live source shows; verification probe 4 asserts `>= 5` which both 7 and any future "6 -> 7" growth satisfy.
  **Who can resolve:** operator. F3 anchor amendment would update count (5-6 -> 7).

- **Question:** F4's per-API call-site counts (655 / 1068 / 43 / 28) drift modestly from live source (681 / 1071 / 43 / 28). Total 1794 vs 1823. Unique-format-string count after dedup is the load-bearing metric; F4 says 1500-2000.
  **Default chosen for now:** drift within tolerance. Verification probe 3 asserts log_template count >= 1000 (acceptable drift).
  **Who can resolve:** none -- drift within acceptable variance; not a finding worth re-anchoring.

- **Question:** F17's "13 XML-shaped log_printf emission sites" doesn't match recon. Recon's tightest pattern (`log_printf("\t\t\t<EVENT_NAME`) returns 7 distinct sites; broader patterns (`log_printf("\t\t<event>` and any embedded `<` after a tab) return 24. F17 says 13.
  **Default chosen for now:** F17 anchor "13" likely refers to the per-XSD-complexType emission count (events at three levels of indentation: `\t<events>`, `\t\t<event>`, `\t\t\t<eventname>`) -- the 13 is per Pass 4.5 spec, anchored to the XSD's 7 complexTypes + 6 wrapper structural sites. The handler doesn't filter; whatever the handler captures lands as channel='logfile' rows. Verification probe 5 asserts `>= 7` which both numbers satisfy.
  **Who can resolve:** operator. F17 anchor could be re-framed to "per-emission-site count varies by indentation pattern; the dual-row design captures all of them as logfile channel rows."

- **Question:** Per-loader adapters (`load-cvars.ts`, `load-commands.ts`, `load-info-keys.ts`, `load-log-templates.ts`) are already engine-agnostic. Phase 2 makes ZERO changes to them. The drafter prompt's "4 loader wirings (load-*.ts): inline each (data-driven dispatch updates ~5 lines each)" appears to be pre-port misframing. The actual loader-side wiring lives in `extract-tag.ts` (ENTITY_JSON_FILES + PROJECT_EXTRACTOR) plus `constants.ts` (LOG_TEMPLATE_CHANNELS). Total loader-side surface: ~6 lines across 2 files.
  **Default chosen for now:** Phase 2 ships extract-tag + constants edits as Tasks 7-8; per-loader files (load-X.ts) are NOT modified and not listed under "Files touched > Modified."
  **Who can resolve:** operator. If a load-X.ts edit is genuinely required (e.g., a KTX-specific `desc` source-priority handling not derivable from the generic `entry.desc ?? null` shape), surface during sub-agent verification or execution.

- **Question:** Description harvesting in `_handler_commands.py` priority order: CD_* macro (Pattern 6) -> inline literal -> banner harvest (Pattern 9). For frogbot_cmd_t tables, every row already has an inline literal description -- Pattern 9 fallback for those is dead code. For cmd_t cmds[], descriptions are CD_* macros (e.g., `CD_RACE`, `CD_VOTEMAP`). What if a cmd_t row's description is `CD_NODESC` or has no description at all?
  **Default chosen for now:** the handler's priority chain handles all three cases gracefully -- if all three fail, `description` stays None and `description_source` stays None. The loader writes the row with `help_desc=NULL`. The verification doesn't assert "description is non-NULL for every row"; it asserts "the row exists with valid name and source location."
  **Who can resolve:** Phase 2 executor -- if real-world cmd_t rows surface with no description AND require one for downstream, surface as a finding.

- **Question:** The `cmd_t` struct shape's description field is at index 4. Per recon: `{ name, function, value, flags, desc }` -- 5 fields. The `frogbot_cmd_t` struct shape is at index 2: `{ name, function, desc }` -- 3 fields. Are these confirmed?
  **Default chosen for now:** Phase 2's `_COMMAND_TABLE_SHAPES` dict ships with `cmd_t: (0, 1, 4)` and `frogbot_cmd_t: (0, 1, 2)`. Verification at execution time: parse one row from each table, confirm fields[4]/fields[2] resolve to the literal description string per recon's sample. If not, the executor adjusts the index.
  **Who can resolve:** Phase 2 executor.

- **Question:** Should commit Step 9 stage the four KTX output JSON files? They are extraction artifacts (regenerable from the source repo + extract.py) but are also the canonical input to the loaders. ezQuake / MVDSV / FTE / QWCL all commit their `output/` JSONs (per repo state).
  **Default chosen for now:** YES -- Phase 2 commits the four JSON files alongside handlers + driver + wiring. Mirrors the prior-engine convention; allows downstream consumers (e.g., Phase 7 quality-grid probes) to assert against a known artifact.
  **Who can resolve:** Phase 2 executor -- if the project's git ignore policy moves `output/` to gitignore between drafting and execution, the executor follows the new policy and notes the change.

- **Question:** Sub-agent verification flagged that as of drafting time (2026-05-05), Phase 0's `git rm scripts/extractors/ktx/commands.ts` AND Phase 1's `collect_file_macros` lift are NOT yet shipped in the live codebase -- both phases are at status `approved` (MD reviewed) but not yet `shipped` (code landed). Phase 2's "Inputs from previous phase" section assumes Phase 0 + Phase 1 outputs exist; this is correct for paper-only drafting but requires sequencing discipline at execution time.
  **Default chosen for now:** Phase 2 EXECUTION must be sequenced AFTER Phase 0 + Phase 1 ship. The sub-agent's "CRITICAL: Phase 1 prerequisite not yet landed" and "CRITICAL: commands.ts NOT deleted" findings are structural sequencing observations rather than defects in this MD. The executor confirms before starting that:
    - `apps/qw-oracle/scripts/extractors/ktx/commands.ts` does NOT exist (Phase 0 shipped F18).
    - `extractor_lib/_source.py` exports `collect_file_macros` (Phase 1 shipped D4).
    - `_visitor.py::walk_tu_dispatch` populates `v.file_macros` per visitor (Phase 1 shipped).
    - Migration `008_ktx_log_template_logfile_channel.sql` is recorded in `schema_migrations` (Phase 1 shipped).
  If any precondition fails, executor HALTs and surfaces to operator -- do NOT attempt to ship Phase 2 over a missing prerequisite.
  **Who can resolve:** Phase 2 executor at start-of-phase. The orchestrator (per `arc-orchestrator` skill) is responsible for verifying prior-phase outputs against live source before dispatching Phase 2's executor terminal.

## Recovery (if verification fails)

- **Probe 1 fails (handler file missing or syntax error):** the inline content for Tasks 3-6 is the source of truth; re-write the missing/broken file from that block. Sub-agent dispatch may have produced a divergent output -- the inline content always wins.
- **Probe 2 fails (extractor driver crash):**
  - "ImportError: No module named clang.cindex" -> libclang 18 not installed; see Phase 1's prerequisites (`libclang` + `python3-clang` apt packages).
  - "Config.set_library_file" failure -> system has libclang at a different path; verify with `find / -name 'libclang-18.so*' 2>/dev/null`.
  - Per-handler crash -> run `--handlers cvars` (or commands / info_keys / log_templates) individually to isolate; check the diagnostics output.
- **Probe 3 fails (low row counts):**
  - cvars < 192 -> `clang_args_ktx_for` may be missing `-DBOT_SUPPORT` (would skip bot-cvar registrations); verify Task 1 landed.
  - commands < 350 -> the cmd_t / frogbot_cmd_t struct-shape detection is broken; check the `_COMMAND_TABLE_SHAPES` dict and run `--handlers commands` with `--limit-files 1` + a single TU containing each table.
- **Probe 4 fails (Pattern 14 suffix missing):**
  - The handler's `_SUB_NS_BY_TABLE` dict isn't applied; verify the per-table tag emission in `_handler_commands.py::visit_cursor`.
  - For info_keys, verify `_handler_info_keys.py::finalize` emits `name = f"{bare}:userinfo"`.
- **Probe 5 fails (XML log_printfs missing):** an unintended filter has been added to `_handler_log_templates.py`. Read the handler's `visit_cursor` carefully and remove any XML-shaped string-skip rule. F17 + D10 explicitly forbid filtering.
- **Probe 6 fails (extract-tag error):** the orchestrator's `PROJECT_EXTRACTOR.ktx` may still be `null` (Task 8 incomplete) OR the four output JSON files don't match `ENTITY_JSON_FILES.ktx` filenames (Task 8 mismatch). Re-verify the full final block from Task 8.
- **Probe 7 fails (zero rows for a type):** the loader rejected every row. Most likely cause: name validation (`load-version.ts:462-468`) -- check the warn output for `[load-version] skipping entity with invalid name`. For info_key, ensure the `:userinfo` suffix is in place; for log_template with channel='logfile', ensure constants.ts widening landed (Task 7).
- **Probe 8 fails ('logfile' channel missing):** Either migration 008 didn't apply (check `schema_migrations` for `008_ktx_log_template_logfile_channel.sql`), OR `constants.ts` still has the 4-element tuple, OR the KTX log_template handler isn't emitting `channel='logfile'` for log_printf calls.
- **Probe 9 fails (jsonb_typeof returns 'string'):** D14 violation. The loader's adapter is pre-stringifying the JSON. Check that `load-info-keys.ts` and `load-log-templates.ts` pass `ast.all_call_sites` / `ast.call_sites_json` directly to `tx.json(...)` without `JSON.stringify(...)`. (No Phase 2 change to these files is expected, but if a regression slipped in this is the gate.)
- **Probe 10 fails (non-idempotent re-run):** the loader adds rows on re-run rather than upserting. Check that natural-keys upserts use `ON CONFLICT DO UPDATE` (not `DO NOTHING`). KTX should NOT have triggered a new code path here -- the per-type loaders are reused as-is.
- **Probe 11 fails (commit dirty):** `git status` to triage; the most likely cause is files were staged but `git commit` failed on a hook. Inspect hook output, fix the underlying issue, re-stage, re-commit.

If any failure resists local recovery, halt and surface to operator.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F1** (KTX cvar bucket counts). Resolved partially: Phase 2 reproduces the 192-unique-k_-prefixed anchor and emits all `RegisterCvar*` rows (including ~33 non-k_ names) per Exhaustive Mapping Rule. The "API split ~205/~50" sub-anchor is INVERTED relative to live source (live: 181/114); flagged in Open Questions for operator decision on amendment.
- **F2** (KTX command counts + Pattern 14 collisions). Resolved partially: Phase 2 ships the Pattern 14 suffix per D7 (`<bare>` for cmds[], `<bare>:frogbot:std` for std_commands, `<bare>:frogbot:editor` for editor_commands). Verification probe 4 asserts >= 39 frogbot-suffixed rows. Anchor count drift (std_commands 39 -> 14, std-vs-editor collisions 25 -> 0 in live source) flagged for operator decision; Pattern 14 still applies per D7 as a defensive API-surface marker.
- **F3** (KTX info_key producer-only). Resolved: Phase 2's `_handler_info_keys.py` emits SetUserInfo writes only (consumer ezinfokey/infokey reads NOT extracted per spec 1.6). Pattern 14 `:userinfo` suffix applied. Live source shows 7 unique star-keys (anchor says 5-6); flagged in Open Questions.
- **F4** (KTX log_template printf-shape counts). Resolved: Phase 2's `_handler_log_templates.py` registers all four APIs in CHANNEL_TABLE; the new `'logfile'` channel value is admitted by migration 008 (Phase 1) and surfaces in production data per verification probe 8. Drift between F4's per-API counts (655 / 1068 / 43 / 28) and live source (681 / 1071 / 43 / 28) is within tolerance and noted in Open Questions.
- **F17** (Pass 1.7 printf-handler intentionally catches XML-shaped log_printfs). Resolved: handler does NOT filter XML-shaped emissions per D10 dual-row design. Verification probe 5 asserts >= 7 channel='logfile' rows whose format string starts with `\t\t\t<` (the per-event tab-prefix shape). The 13 vs 7 vs 24 count drift between F17's anchor and live-source patterns is flagged in Open Questions; the dual-row design holds regardless of count.

No findings touched by Phase 2 are deferred without progress. F1 / F2 / F3 / F4 / F17 all ship in this phase; the count-anchor amendments are surfaced as Open Questions for operator decision (per D1 amendment process). Phase 6 also touches F17 (match_event handler emits the second row type per the dual-row design).

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

After the phase MD is drafted, the drafter spawns a sub-agent with the `Agent` tool, `subagent_type=Explore`, model: Sonnet medium, and the following brief shape:

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-2-pass1-entity-handlers.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
Read the design spec section relevant to this phase:
  /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
  (relevant section: Pass 1 entire -- 1.1 through 1.7)

Then verify, file-by-file:

1. Every locked count anchor in review-findings.md applicable to this phase
   (F1, F2, F3, F4, F17) -- verify the phase MD reproduces the count exactly
   OR documents the discrepancy in Open Questions with a default and a path to
   resolve. If the phase plans to ship counts without surfacing a discrepancy,
   flag CRITICAL.
2. Every CHECK constraint reference (entities.type / log_template_versions.channel /
   gameplay_*.kind) -- diff against decisions.md D5 (the three migration files).
   Phase 2 should ONLY rely on migration 008 (logfile channel) and migration 009
   (entities.type widening) -- the gameplay-kind widenings are Phase 3-5 territory.
3. Every JSONB column write -- confirm the phase MD does NOT introduce JSON.stringify
   followed by TEXT bind. The per-loader adapters (load-info-keys.ts,
   load-log-templates.ts) are unchanged in this phase -- if the phase MD claims
   any change to them that pre-stringifies, flag CRITICAL per D14.
4. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF
     is expected NOT to exist yet -- this is a paper plan, not
     executed code. Do NOT flag a Created file's non-existence as
     CRITICAL or anything else. Skip it entirely.
5. Every reference to a Pattern (Pattern 4 / 5 / 6 / 9 / 13 / 14) --
   confirm the pattern is correctly named and the EXTRACTOR-PLAYBOOK describes it.
   (Pattern 6 is post-Phase-1 lifted to extractor_lib._source.collect_file_macros;
   verify the phase MD's reference matches the lifted shape, NOT the pre-lift
   same-file regex.)
6. Every reference to a KTX source file or line:line range -- verify the file
   exists at research/repos/ktx/<path>; if a line range is cited, sanity-check
   that the line number is in range for the file. (Sample at least:
   src/world.c:717 + src/world.c:751 for the RegisterCvar function decls;
   src/commands.c:693 for cmd_t cmds[]; src/bot_commands.c:2315 + 2332 for
   the frogbot_cmd_t tables; src/g_userinfo.c:226 for the SetUserInfo example.)
7. Every reference to a finding (F1-F22 in review-findings.md) -- does this
   phase actually resolve / address the findings it claims to?
8. Every shell command -- does it use `bun` for scripts (D18 Bun discipline)
   and does it match the dev-DB connection convention (qw-oracle-postgres-dev
   container, qworacle user, qw_oracle DB)?
9. "Engineer ports X" / "fills in details" / TODO smell -- list any.
10. Any tables, columns, fields, or kinds the phase introduces that aren't in
    decisions.md and aren't in the design spec -- flag as potential drift.
11. Every per-task "Execution mode" declaration -- confirm rationale matches D18
    (subagent for code-synthesis; inline for markdown / mechanical edits).
    Per the prompt's rough cut: cvar/info_key/log_templates handlers ->
    Sonnet medium; commands handler -> Sonnet MAX; loader / extract-tag /
    constants edits + git ops -> inline. Flag if any task drifts from these.
12. Pattern 14 application: D7 says cvars do NOT get suffixed; commands and
    info_keys DO. Verify the phase MD's _handler_cvars.py does NOT apply a
    Pattern 14 suffix and the _handler_commands.py / _handler_info_keys.py DO.
13. F17 / D10 dual-row design: the log_template handler must NOT contain a filter
    that skips XML-shaped log_printfs. Verify by reading the inline content of
    Task 6's handler -- if you see any check like `if format_string.startswith
    ("\\t\\t\\t<"): skip` or similar, flag CRITICAL.
14. Loader wiring: per-loader adapters (load-cvars.ts / load-commands.ts /
    load-info-keys.ts / load-log-templates.ts) should NOT appear in Files Touched
    > Modified for Phase 2. The wiring is in extract-tag.ts (ENTITY_JSON_FILES.ktx +
    PROJECT_EXTRACTOR.ktx) plus constants.ts (LOG_TEMPLATE_CHANNELS). If the phase
    MD modifies any load-X.ts file, verify the rationale and flag if unjustified.
15. constants.ts widening: the LOG_TEMPLATE_CHANNELS array MUST gain 'logfile'
    in this phase. If absent, flag CRITICAL -- KTX log_template entity-name
    validation will reject every row at load-version.ts:463.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings to the phase MD before declaring the phase ready for operator review. If a sub-agent finding contradicts `decisions.md`, decisions.md wins and the finding is rejected with a one-line rationale in the phase MD's "Open questions" section.

---

*Phase 2 closes the Pass 1 first-class entity surface. Phases 3 / 4 / 5 / 6 (gameplay-content + match_event) are mutually independent at the data level and may draft in parallel after Phase 2 ships.*
