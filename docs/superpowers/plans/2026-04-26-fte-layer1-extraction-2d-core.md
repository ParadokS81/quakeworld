# FTE Layer 1 Extraction — Phase 2d-core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load FTE Layer 1 entities (cvars, commands, macros, cmdline_params) from a single `head` snapshot into `apps/qw-oracle/data/knowledge.db` with `engine` and `plugin:ezhud` source-root provenance, validated via runtime cvarlist diff + field-accuracy audit.

**Architecture:** Mirror ezQuake/QWCL extractor structure under `apps/qw-oracle/scripts/extractors/fte/`. Driver iterates over `SOURCE_ROOTS = [("engine", "engine/"), ("plugin:ezhud", "plugins/ezhud/")]`, runs 4 TU parses per file (client/server/win/client_vk), dispatches all 4 through shared `walk_tu_dispatch` infrastructure to per-type handlers. Schema bumps to v11 with additive `source_root TEXT` column on cvar/command/macro version tables.

**Tech Stack:** Python 3 + libclang 18 (extractor), TypeScript + Bun + better-sqlite3 (loader), shared `extractor_lib/_visitor.py` walk infrastructure.

**Spec:** `docs/superpowers/specs/2026-04-26-fte-layer1-extraction-design.md`
**Locked head SHA:** `3584377302cda4bd1b6950b126d147451895a1da`
**Locked autobuild number:** `build-6698` (git rev-list fallback; grep on quakedef.h/version.c returned nothing)

**Predecessor templates:** `apps/qw-oracle/scripts/extractors/qwcl/` (cross-codebase port pattern), `apps/qw-oracle/scripts/extractors/ezquake/` (full-feature handler reference), `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` (pattern catalog + porting checklist).

**Sub-phase scope:** This plan covers Phase 2d-core only (cvars/commands/macros/cmdline). Phase 2d-bundle (asset extraction) gets its own plan after this one ships and validates.

**Out-of-scope reminders:**
- No Q2/Q3/Hexen2 cvars (game-type defines deliberately undefined).
- No software/D3D renderer cvars.
- No Apple variant (FTE has 0 Apple-gated cvars per verification 2026-04-26).
- No plugins beyond `ezhud`.
- No QuakeC.
- No deep-time backfill — single `head` snapshot only.
- No help-JSON authoring — descriptions come from `CVARD` macro args directly.

---

## File Structure

**New files (all under `apps/qw-oracle/scripts/extractors/fte/`):**

| File | Responsibility | Approx LoC |
|---|---|---|
| `extract.py` | Driver: walks SOURCE_ROOTS × variant matrix, dispatches to handlers | ~140 |
| `_handler_cvars.py` | Detects `cvar_t` post-macro struct-init from CVARD-family macros + Cvar_Register group attribution | ~220 |
| `_handler_commands.py` | Detects `Cmd_AddCommand`/`Cmd_AddCommandD`/`Cmd_AddCommandAD`/`Cmd_AddCommandOld` callsites | ~120 |
| `_handler_macros.py` | Detects `Cmd_AddMacro`/`Cmd_AddMacroD` callsites | ~80 |
| `_handler_cmdline.py` | Detects `COM_CheckParm("-flag")` callsites | ~80 |
| `_handler_ezhud.py` | Plugin-only: `HUD_Register` synthesis + `cvarfuncs->GetNVFDG()` v-table cvars | ~180 |
| `seeds/ezhud-hud-elements.yaml` | Curated HUD element table with custom params | ~120 |
| `output/*.json` | Generated AST outputs (committed to git) | n/a |

**Modified files:**

| File | Change |
|---|---|
| `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py` | Add `clang_args_fte_for()`, `clang_args_fte_server_for()`, `clang_args_fte_win_for()`, `clang_args_fte_vk_for()` |
| `apps/qw-oracle/scripts/load-knowledge/schema.ts` | v11 migration: add `source_root` column to cvar/command/macro version tables; widen project CHECK to include `fte` |
| `apps/qw-oracle/scripts/load-knowledge/load-cvars.ts` | Read+write `source_root` field |
| `apps/qw-oracle/scripts/load-knowledge/load-commands.ts` | Read+write `source_root` field |
| `apps/qw-oracle/scripts/load-knowledge/load-macros.ts` | Read+write `source_root` field |
| `apps/qw-oracle/scripts/load-knowledge/load-version.ts` | Add `fte` to PROJECT_VERSION_ALIASES, PROJECT_HAS_ASSET_BUNDLE, PROJECT_SRC_PREFIX |
| `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts` | Pass through `source_root` to slipgate snapshot |
| `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` | Register `fte` regression + anomaly probes |
| `apps/qw-oracle/SCHEMA.md` | Document `source_root` field semantics + v11 migration |
| `HANDOVER.md` | Update Phase 2d-2h entry: 2d-core shipped, 2d-bundle remaining |

**Files to retire after success (Task 17):**
- `apps/qw-oracle/scripts/extractors/fte/cvars.ts` (regex-based pre-libclang prototype)
- `apps/qw-oracle/scripts/extractors/fte/cvars-check.py` (libclang validation prototype)

---

## Task 1: Capture FTE head SHA and autobuild number

**Files:**
- Read: `research/repos/fteqw/engine/common/quakedef.h`
- Read: `research/repos/fteqw/engine/common/version.c` (if exists)
- Modify: top of this plan file (insert "Locked head SHA" + "Locked autobuild number" before Task 2)

- [ ] **Step 1: Pull FTE master to latest**

```bash
cd /home/paradoks/projects/quakeworld/research/repos/fteqw
git fetch origin
git checkout master
git pull origin master
```

Expected: clean fast-forward or "Already up to date."

- [ ] **Step 2: Capture the SHA**

```bash
cd /home/paradoks/projects/quakeworld/research/repos/fteqw && git rev-parse HEAD
```

Expected: 40-character hex SHA. Record it.

- [ ] **Step 3: Find the autobuild number in source**

```bash
cd /home/paradoks/projects/quakeworld/research/repos/fteqw && grep -rE 'FTE_VER_REVISION|BUILDNUMBER|REVISION_NUM' engine/common/quakedef.h engine/common/version.c 2>/dev/null
```

Expected: a line like `#define FTE_VER_REVISION 6488` or similar. Record the number.

If grep returns nothing, fall back to `git rev-list --count HEAD` (FTE CI uses this monotonic count as the autobuild number).

- [ ] **Step 4: Insert locked values into this plan**

Edit this plan file. Add these lines immediately after the **Spec:** line near the top:

```markdown
**Locked head SHA:** `<sha from Step 2>`
**Locked autobuild number:** `build-<N from Step 3>` (or `<YYYY-MM-DD>` if autobuild number unreadable)
```

These values are used in Tasks 12, 13, 16, and 18.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/superpowers/plans/2026-04-26-fte-layer1-extraction-2d-core.md
git commit -m "plan: lock FTE head SHA + autobuild number for Phase 2d-core"
```

---

## Task 2: Schema migration v11 — add source_root column + widen project allowlist

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/schema.ts`
- Modify: `apps/qw-oracle/SCHEMA.md`

- [ ] **Step 1: Read current schema head**

```bash
grep -n "SCHEMA_VERSION\|CHECK (project IN" /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge/schema.ts | head -20
```

Expected: shows `SCHEMA_VERSION = 10` (or whatever is current) and the `CHECK (project IN (...))` constraint locations.

- [ ] **Step 2: Bump SCHEMA_VERSION to 11 and add migration**

In `schema.ts`, locate the `migrations` block (typically a list/map of version → SQL strings). Append a new migration for v11:

```typescript
// v10 -> v11: add source_root column to per-type version tables; widen project CHECK to include fte
{
  from: 10,
  to: 11,
  sql: `
    ALTER TABLE cvar_versions ADD COLUMN source_root TEXT;
    ALTER TABLE command_versions ADD COLUMN source_root TEXT;
    ALTER TABLE macro_versions ADD COLUMN source_root TEXT;
  `,
}
```

Bump `export const SCHEMA_VERSION = 11`.

- [ ] **Step 3: Widen the project CHECK constraint**

Find every occurrence of `CHECK (project IN (...))` in `schema.ts`. Each should already include `'ezquake', 'qwcl'`. Add `'fte'` to each. Example:

```sql
-- Before:
project TEXT NOT NULL CHECK (project IN ('ezquake', 'qwcl', 'mvdsv', 'ktx'))
-- After (no change needed if 'fte' already not present, just add it):
project TEXT NOT NULL CHECK (project IN ('ezquake', 'qwcl', 'fte', 'mvdsv', 'ktx'))
```

If `fte` is already in the CHECK list (per spec note that mvdsv/ktx are pre-allowed), inspect to confirm. If absent, add it everywhere CHECK appears.

- [ ] **Step 4: Run the migration on a test DB to verify**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
cp data/knowledge.db data/knowledge.db.pre-v11.bak
bunx tsc --noEmit
npm run load-knowledge -- diff --project ezquake --from head --to head 2>&1 | head -10
```

The first call exercises the migration runner on actual DB. Expected: no errors; migration runs once and is idempotent on re-run.

Verify columns:

```bash
sqlite3 data/knowledge.db "PRAGMA table_info(cvar_versions);" | grep source_root
sqlite3 data/knowledge.db "PRAGMA table_info(command_versions);" | grep source_root
sqlite3 data/knowledge.db "PRAGMA table_info(macro_versions);" | grep source_root
```

Expected: each command outputs one line containing `source_root|TEXT|0||0`.

- [ ] **Step 5: Update SCHEMA.md**

In `apps/qw-oracle/SCHEMA.md`, add a new section near the field-reference area:

```markdown
### `source_root` (v11+)

Optional column on `cvar_versions`, `command_versions`, `macro_versions`. Identifies which source root the entity row came from when the project has multiple sources (e.g., FTE engine + plugins).

Values:
- `NULL` — backwards compat for pre-v11 rows; semantically equivalent to `"engine"`.
- `"engine"` — entity was registered in the project's main engine source tree.
- `"plugin:<name>"` — entity was registered inside a named plugin under the project's plugin directory (e.g., `"plugin:ezhud"` for FTE's ezQuake-HUD plugin).

Cmdline_params, keynames, hud_elements, rulesets, and token_primitives do NOT carry this field — they are engine-only by definition.
```

- [ ] **Step 6: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/schema.ts apps/qw-oracle/SCHEMA.md
git commit -m "feat(qw-oracle): schema v11 — source_root column + fte project allowlist"
```

---

## Task 3: Add FTE clang variants to extractor_lib

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py`

- [ ] **Step 1: Read existing clang_config.py to understand the function pattern**

```bash
grep -n "def clang_args" /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py
```

Expected: shows existing `clang_args_for`, `clang_args_server_for`, `clang_args_win_for`, `clang_args_apple_for`, `clang_args_qwcl_for`. Each takes a source-tree path and returns `list[str]`.

- [ ] **Step 2: Add four FTE variant functions to clang_config.py**

Append to the bottom of the file:

```python
def _clang_args_fte_base(fte_engine_dir: str, fte_plugin_dirs: list[str]) -> list[str]:
    """Common defines + includes for all FTE variants. Excludes game-type defines
    (HEXEN2/Q2CLIENT/Q3CLIENT/etc) per Phase 2d Option B scope."""
    includes = [fte_engine_dir + "/" + sub for sub in (
        "common", "client", "server", "qclib", "gl", "vk", "sw", "http",
    )]
    includes.extend(fte_plugin_dirs)
    return [
        "-x", "c", "-w",
        # Suppress Linux-specific defines so platform-gated code is reachable per variant
        # (mirrors ezQuake's pattern via -U__linux__ in win/apple variants)
    ] + [f"-I{p}" for p in includes]


def clang_args_fte_for(fte_repo: str) -> list[str]:
    """FTE client variant: GL renderer, NetQuake + QW protocols, common feature flags.

    Excluded: HEXEN2, Q2CLIENT, Q2SERVER, Q3CLIENT, Q3BSPS, Q2BSPS, VM_Q1 (game-type
    gates per Option B). SWQUAKE, D3DQUAKE excluded (renderer scope). __APPLE__ excluded
    (FTE has 0 Apple-gated cvars).
    """
    engine = f"{fte_repo}/engine"
    plugins = [f"{fte_repo}/plugins/ezhud"]
    return _clang_args_fte_base(engine, plugins) + [
        "-DHAVE_CLIENT", "-DGLQUAKE",
        "-DNQPROT", "-DCSQC_DAT", "-DRTLIGHTS",
        "-DMVD_RECORDING", "-DMULTITHREAD", "-DSUPPORT_ICE", "-DPLUGINS",
    ]


def clang_args_fte_server_for(fte_repo: str) -> list[str]:
    """FTE server variant: SERVERONLY + server-only feature flags."""
    engine = f"{fte_repo}/engine"
    plugins = [f"{fte_repo}/plugins/ezhud"]
    return _clang_args_fte_base(engine, plugins) + [
        "-DHAVE_SERVER", "-DSERVERONLY",
        "-DNQPROT", "-DMVD_RECORDING", "-DQUAKESTATS",
    ]


def clang_args_fte_win_for(fte_repo: str) -> list[str]:
    """FTE Windows-client variant: client defines + Windows platform defines.
    Suppresses __linux__ to reach Win-only code paths (mirrors ezQuake pattern)."""
    return clang_args_fte_for(fte_repo) + [
        "-D_WIN32", "-DWIN32",
        "-U__linux__", "-U__unix__",
    ]


def clang_args_fte_vk_for(fte_repo: str) -> list[str]:
    """FTE Vulkan-renderer client variant: GL undefined, VK defined."""
    base = clang_args_fte_for(fte_repo)
    # Drop GLQUAKE, add VKQUAKE
    base = [a for a in base if a != "-DGLQUAKE"]
    return base + ["-DVKQUAKE"]
```

- [ ] **Step 3: Verify compile (no Python syntax errors)**

```bash
cd /home/paradoks/projects/quakeworld
python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from extractor_lib.clang_config import clang_args_fte_for, clang_args_fte_server_for, clang_args_fte_win_for, clang_args_fte_vk_for; print(clang_args_fte_for('/tmp/fake')[:5])"
```

Expected: prints `['-x', 'c', '-w', '-I/tmp/fake/engine/common', '-I/tmp/fake/engine/client']` or similar (first 5 args).

- [ ] **Step 4: Smoke-test against real FTE source**

```bash
cd /home/paradoks/projects/quakeworld
python3 << 'EOF'
import sys
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors')
from extractor_lib.clang_config import clang_args_fte_for, PARSE_OPTS
from clang.cindex import Index, Config
Config.set_library_file("libclang-18.so.1")
idx = Index.create()
args = clang_args_fte_for("research/repos/fteqw")
tu = idx.parse("research/repos/fteqw/engine/common/cmd.c", args=args, options=PARSE_OPTS)
serious = [d for d in tu.diagnostics if d.severity >= 3]
print(f"Serious diagnostics on cmd.c: {len(serious)}")
EOF
```

Expected: `Serious diagnostics on cmd.c: <small number, ideally 0-5>`. If >50, the include paths in `_clang_args_fte_base` are wrong — re-check the engine subdirectory list.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py
git commit -m "feat(qw-oracle): clang_config — FTE variants (client/server/win/vk)"
```

---

## Task 4: Driver scaffold — extract.py with SOURCE_ROOTS × variant matrix

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/extract.py`

This task creates the driver but with NO handlers wired in yet. Tasks 5-9 add handlers one by one.

- [ ] **Step 1: Write extract.py skeleton**

Create `apps/qw-oracle/scripts/extractors/fte/extract.py`:

```python
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

# (source_root_label, repo-relative directory)
SOURCE_ROOTS = [
    ("engine", "engine"),
    ("plugin:ezhud", "plugins/ezhud"),
]

VARIANT_FUNCS = [
    ("client", clang_args_fte_for),
    ("server", clang_args_fte_server_for),
    ("win", clang_args_fte_win_for),
    ("client_vk", clang_args_fte_vk_for),
]


def collect_handlers(names: str):
    """Lazy import handlers — added one by one across Tasks 5-9.
    Returns dict[name, handler_instance] for the requested set."""
    available = {}
    # Tasks 5-9 will add imports + entries here.
    if names == "all":
        return available
    requested = {n.strip() for n in names.split(",") if n.strip()}
    return {k: v for k, v in available.items() if k in requested}


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo-root", default=None, help="FTE repo path (default: research/repos/fteqw)")
    ap.add_argument("--output-dir", default=None, help="Output JSON directory (default: extractors/fte/output)")
    ap.add_argument("--handlers", default="all", help="Comma-separated handler names or 'all'")
    ap.add_argument("--limit-files", type=int, default=0, help="Stop after N files (0 = no limit). Useful for smoke tests.")
    ap.add_argument("--progress-every", type=int, default=20)
    return ap.parse_args()


def walk_source_files(root_dir: Path) -> list[Path]:
    files = []
    for ext in (".c", ".h"):
        files.extend(root_dir.rglob(f"*{ext}"))
    return sorted(files)


def main() -> int:
    args = parse_args()
    fte_repo = Path(args.repo_root) if args.repo_root else FTE_REPO_DEFAULT
    output_dir = Path(args.output_dir) if args.output_dir else OUTPUT_DIR_DEFAULT
    output_dir.mkdir(parents=True, exist_ok=True)

    if not (fte_repo / "engine").is_dir():
        print(f"FTE repo missing 'engine/' subdir: {fte_repo}", file=sys.stderr)
        return 1

    handlers = collect_handlers(args.handlers)
    if not handlers:
        print(f"No handlers selected (or none yet implemented). Available: see collect_handlers()", file=sys.stderr)
        return 0

    # Setup phase: each handler may populate per-repo state
    for h in handlers.values():
        h.setup(str(fte_repo), str(fte_repo / "engine"))

    idx = Index.create()
    total_files = 0
    t_start = time.time()

    for source_root_label, source_root_rel in SOURCE_ROOTS:
        source_root_path = fte_repo / source_root_rel
        if not source_root_path.is_dir():
            print(f"  [skip] source root {source_root_rel} not found", file=sys.stderr)
            continue
        files = walk_source_files(source_root_path)
        if args.limit_files > 0:
            files = files[:args.limit_files]
        print(f"=== source_root={source_root_label} ({len(files)} files) ===")

        for n, file_path in enumerate(files, 1):
            target_str = str(file_path.resolve())
            for h in handlers.values():
                h.start_file(target_str, file_path.read_bytes())
            for variant_name, args_func in VARIANT_FUNCS:
                clang_args = args_func(str(fte_repo))
                tu = idx.parse(target_str, args=clang_args, options=PARSE_OPTS)
                walk_tu_dispatch(tu, list(handlers.values()), variant_name, target_str, source_root=source_root_label)
            for h in handlers.values():
                rows = h.end_file()
                if rows:
                    h.aggregate(rows)
            total_files += 1
            if args.progress_every and total_files % args.progress_every == 0:
                elapsed = time.time() - t_start
                print(f"  [progress] {total_files} files in {elapsed:.1f}s")

    # Finalize: each handler writes its output
    for h in handlers.values():
        out = h.finalize(str(fte_repo))
        out_path = output_dir / h.output_filename
        out_path.write_text(json.dumps(out, indent=2, sort_keys=True) + "\n")
        print(f"  wrote {out_path} ({len(out.get(h.output_top_key, {}))} entries)")

    print(f"Done. {total_files} files, {time.time() - t_start:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

**Note on `walk_tu_dispatch`:** the existing function in `extractor_lib/_visitor.py` may not currently accept a `source_root` kwarg. Check its signature:

```bash
grep -n "def walk_tu_dispatch" /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py
```

If `source_root` is not supported, add it as an optional kwarg in `_visitor.py` that gets attached to each handler call as `handler.current_source_root = source_root` before walking. Document the contract: handlers consult `self.current_source_root` when emitting rows.

- [ ] **Step 2: Make extract.py executable**

```bash
chmod +x /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/fte/extract.py
```

- [ ] **Step 3: Smoke-test (no handlers yet — should print "no handlers selected")**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/fte/extract.py --limit-files 3
```

Expected output ends with: `No handlers selected (or none yet implemented). Available: see collect_handlers()` and exits 0.

- [ ] **Step 4: Create empty output directory + .gitkeep**

```bash
mkdir -p /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/fte/output
touch /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/fte/output/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/fte/extract.py apps/qw-oracle/scripts/extractors/fte/output/.gitkeep apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py
git commit -m "feat(qw-oracle): FTE extractor driver scaffold (no handlers yet)"
```

---

## Task 5: Cvars handler — CVARD/CVARFD/CVARAFD/CVARAD detection

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py`
- Modify: `apps/qw-oracle/scripts/extractors/fte/extract.py` (wire handler into `collect_handlers`)
- Reference templates: `apps/qw-oracle/scripts/extractors/qwcl/_handler_cvars.py`, `apps/qw-oracle/scripts/extractors/ezquake/_handler_cvars.py`, `apps/qw-oracle/scripts/extractors/fte/cvars-check.py` (the validation prototype)

- [ ] **Step 1: Read existing cvars-check.py to refresh on field positions**

```bash
sed -n '95,145p' /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/fte/cvars-check.py
```

Confirms field positions in the post-macro-expanded `cvar_t` initializer:
- Field 0: name (string literal)
- Field 3: flags (CVAR_* identifiers)
- Field 7: alias / ConsoleName2
- Field 8: callback (function pointer)
- Field 9: description
- Field 10: default value

These positions are stable across CVARD / CVARFD / CVARAFD / CVARAD because all four macros expand to the same `cvar_t` struct shape; the macro just chooses which user-supplied args go into which positions.

- [ ] **Step 2: Read QWCL cvars handler for the handler-class shape**

```bash
sed -n '1,80p' /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors/qwcl/_handler_cvars.py
```

Note the lifecycle methods: `setup`, `start_file`, `visit_cursor`, `end_file`, `aggregate`, `finalize`, plus the `name`, `output_filename`, `output_top_key` class attributes.

- [ ] **Step 3: Create FTE cvars handler**

Create `apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py`:

```python
"""FTE cvars handler.

Detects post-macro-expanded `cvar_t` struct-init from CVARD-family macros
(CVARD, CVARFD, CVARAFD, CVARAD). All four expand to the same cvar_t layout;
field positions are stable per cvars-check.py validation.

Also captures cvar group attribution via `Cvar_Register(&var, cvargroup_xxx)`
calls and in-file `cvargroup_xxx` `#define` / `char[]` literals.

Sets `source_root` per row from the driver-supplied `current_source_root` attr.
"""
from __future__ import annotations

import os
import re
from pathlib import Path

from clang.cindex import CursorKind


# Field positions in the resolved cvar_t initializer (verified via cvars-check.py)
_FIELD_NAME = 0
_FIELD_FLAGS = 3
_FIELD_ALIAS = 7
_FIELD_CALLBACK = 8
_FIELD_DESCRIPTION = 9
_FIELD_DEFAULT = 10


def _tokens_of(cursor) -> list[str]:
    return [t.spelling for t in cursor.get_tokens()]


def _concat_string_literals(tokens: list[str]) -> str | None:
    parts = []
    for t in tokens:
        t = t.strip()
        if t.startswith('"') and t.endswith('"') and len(t) >= 2:
            parts.append(t[1:-1])
        elif t in ("NULL", "(((", "((void"):
            return None
    if not parts:
        return None
    return "".join(parts)


_GROUP_DEFINE_RE = re.compile(rb'#define\s+(cvargroup_\w+)\s+"([^"]+)"')
_GROUP_CHAR_RE = re.compile(rb'char\s+(cvargroup_\w+)\s*\[\s*\]\s*=\s*"([^"]+)"')


class CvarsFteHandler:
    name = "cvars"
    output_filename = "fte-variables-ast.json"
    output_top_key = "vars"

    def setup(self, repo_root: str, src_root: str) -> None:
        self._all_rows: dict[str, dict] = {}
        self._all_groups: dict[str, str] = {}
        self._all_registrations: dict[str, str] = {}  # var-identifier -> cvargroup_x
        self.current_source_root: str = "engine"

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._target = source_path
        self._source_bytes = source_bytes
        self._seen_in_file: set[str] = set()
        self._rows: list[dict] = []

        # Capture group definitions in this file
        for m in _GROUP_DEFINE_RE.finditer(source_bytes):
            self._all_groups[m.group(1).decode()] = m.group(2).decode()
        for m in _GROUP_CHAR_RE.finditer(source_bytes):
            self._all_groups[m.group(1).decode()] = m.group(2).decode()

    def visit_cursor(self, cursor, variant: str) -> None:
        # Branch 1: cvar_t struct-init (post-macro-expansion)
        if (cursor.kind == CursorKind.VAR_DECL
                and cursor.location.file is not None
                and os.path.samefile(cursor.location.file.name, self._target)
                and cursor.type.spelling in ("cvar_t", "const cvar_t")):
            self._extract_cvar_decl(cursor, variant)

        # Branch 2: Cvar_Register(&var_name, cvargroup_xxx) registration
        elif cursor.kind == CursorKind.CALL_EXPR and cursor.spelling == "Cvar_Register":
            args = list(cursor.get_arguments())
            if len(args) >= 2:
                # arg[0]: &var_identifier — extract the identifier
                var_id = self._extract_addressof_identifier(args[0])
                # arg[1]: cvargroup_xxx
                grp_tokens = _tokens_of(args[1])
                grp_id = grp_tokens[0] if grp_tokens else None
                if var_id and grp_id and grp_id.startswith("cvargroup_"):
                    self._all_registrations[var_id] = grp_id

    def _extract_cvar_decl(self, cursor, variant: str) -> None:
        init = None
        for c in cursor.get_children():
            if c.kind == CursorKind.INIT_LIST_EXPR:
                init = c
                break
        if init is None:
            return
        fields = list(init.get_children())

        name = (_concat_string_literals(_tokens_of(fields[_FIELD_NAME]))
                if len(fields) > _FIELD_NAME else None)
        if not name or name in self._seen_in_file:
            return

        default = (_concat_string_literals(_tokens_of(fields[_FIELD_DEFAULT]))
                   if len(fields) > _FIELD_DEFAULT else None)
        description = (_concat_string_literals(_tokens_of(fields[_FIELD_DESCRIPTION]))
                       if len(fields) > _FIELD_DESCRIPTION else None)
        alias = (_concat_string_literals(_tokens_of(fields[_FIELD_ALIAS]))
                 if len(fields) > _FIELD_ALIAS else None)

        # Flag identifiers (CVAR_*)
        flag_names: list[str] = []
        if len(fields) > _FIELD_FLAGS:
            flag_tokens = _tokens_of(fields[_FIELD_FLAGS])
            flag_names = [t for t in flag_tokens if t.startswith("CVAR_") and t != "CVAR_t"]

        # Callback: resolve referenced FUNCTION_DECL
        callback_name = None
        if len(fields) > _FIELD_CALLBACK:
            ref = fields[_FIELD_CALLBACK].referenced
            if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
                callback_name = ref.spelling

        var_identifier = cursor.spelling  # the C identifier for back-linking to Cvar_Register

        self._seen_in_file.add(name)
        self._rows.append({
            "name": name,
            "default": default if default is not None else "",
            "description": description or "",
            "alias": alias,
            "flags": flag_names,
            "callback": callback_name,
            "var_identifier": var_identifier,
            "source_file": self._target_relative(),
            "source_line": cursor.location.line,
            "source_root": self.current_source_root,
            "variant": variant,
        })

    def _extract_addressof_identifier(self, arg_cursor) -> str | None:
        # Walk to find the bare identifier inside &foo
        for c in arg_cursor.walk_preorder():
            if c.kind == CursorKind.DECL_REF_EXPR:
                return c.spelling
        return None

    def _target_relative(self) -> str:
        # Repo-relative path; FTE driver emits paths relative to the FTE repo root
        # (PROJECT_SRC_PREFIX['fte'] = '' per spec)
        return self._target  # caller (driver) makes this relative; for now full path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        return rows

    def aggregate(self, rows: list[dict]) -> None:
        for r in rows:
            n = r["name"]
            if n in self._all_rows:
                # First-wins; later variants only fill in missing fields
                existing = self._all_rows[n]
                if not existing.get("description") and r.get("description"):
                    existing["description"] = r["description"]
                if not existing.get("callback") and r.get("callback"):
                    existing["callback"] = r["callback"]
            else:
                self._all_rows[n] = r

    def finalize(self, repo_root: str) -> dict:
        repo_root_p = Path(repo_root)
        # Re-relativize source_file paths against repo root
        for r in self._all_rows.values():
            try:
                r["source_file"] = str(Path(r["source_file"]).relative_to(repo_root_p))
            except ValueError:
                pass
            # Attach group from var_identifier
            var_id = r.get("var_identifier")
            grp_id = self._all_registrations.get(var_id) if var_id else None
            grp_str = self._all_groups.get(grp_id) if grp_id else None
            if grp_str:
                r["group"] = grp_str
            r.pop("var_identifier", None)  # internal-only; not in output

        return {
            "vars": self._all_rows,
            "_stats": {
                "count": len(self._all_rows),
                "with_description": sum(1 for r in self._all_rows.values() if r.get("description")),
                "with_default": sum(1 for r in self._all_rows.values() if r.get("default")),
                "with_callback": sum(1 for r in self._all_rows.values() if r.get("callback")),
                "with_group": sum(1 for r in self._all_rows.values() if r.get("group")),
                "by_source_root": {
                    root: sum(1 for r in self._all_rows.values() if r.get("source_root") == root)
                    for root in ("engine", "plugin:ezhud")
                },
            },
        }
```

- [ ] **Step 4: Wire the handler into extract.py**

In `apps/qw-oracle/scripts/extractors/fte/extract.py`, modify `collect_handlers`:

```python
def collect_handlers(names: str):
    from _handler_cvars import CvarsFteHandler
    available = {
        "cvars": CvarsFteHandler(),
    }
    if names == "all":
        return available
    requested = {n.strip() for n in names.split(",") if n.strip()}
    return {k: v for k, v in available.items() if k in requested}
```

- [ ] **Step 5: Smoke-test against a single FTE file with known cvars**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/fte/extract.py --handlers cvars --limit-files 1
```

Pick a file likely to have cvars by adjusting `walk_source_files` temporarily, OR run a targeted single-file test:

```bash
cd /home/paradoks/projects/quakeworld
python3 << 'EOF'
import sys
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors')
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/fte')
from clang.cindex import Config, Index
Config.set_library_file("libclang-18.so.1")
from extractor_lib.clang_config import clang_args_fte_for, PARSE_OPTS
from extractor_lib._visitor import walk_tu_dispatch
from _handler_cvars import CvarsFteHandler

repo = "research/repos/fteqw"
target = "research/repos/fteqw/engine/server/sv_phys.c"
h = CvarsFteHandler()
h.setup(repo, repo + "/engine")
h.current_source_root = "engine"
src = open(target, "rb").read()
h.start_file(target, src)

idx = Index.create()
tu = idx.parse(target, args=clang_args_fte_for(repo), options=PARSE_OPTS)
walk_tu_dispatch(tu, [h], "client", target)
rows = h.end_file()
print(f"sv_phys.c rows: {len(rows)}")
for r in rows[:5]:
    print(f"  {r['name']}  default={r['default']!r}  desc={(r.get('description') or '')[:60]!r}")
EOF
```

Expected: at least 5 cvar rows, names like `sv_gravity`, `sv_friction`, `sv_maxvelocity`, etc., with defaults visible.

If 0 rows: re-check libclang macro expansion path (PARSE_DETAILED_PROCESSING_RECORD must be in PARSE_OPTS). If nonzero but defaults all `None`: check field positions against `cvars-check.py`'s findings.

- [ ] **Step 6: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py apps/qw-oracle/scripts/extractors/fte/extract.py
git commit -m "feat(qw-oracle): FTE cvars handler — CVARD-family struct-init detection"
```

---

## Task 6: Commands handler — Cmd_AddCommand{,D,AD,Old}

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/_handler_commands.py`
- Modify: `apps/qw-oracle/scripts/extractors/fte/extract.py` (add handler to `collect_handlers`)
- Reference: `apps/qw-oracle/scripts/extractors/qwcl/_handler_commands.py`

- [ ] **Step 1: Inventory FTE's Cmd_Add* signatures**

```bash
grep -hE 'void\s+Cmd_AddCommand[A-Za-z]*\s*\(' /home/paradoks/projects/quakeworld/research/repos/fteqw/engine/common/cmd.c | head -10
```

Confirms argument order. Expected:
- `Cmd_AddCommand(char *cmd_name, xcommand_t function)` — 2 args
- `Cmd_AddCommandD(char *cmd_name, xcommand_t function, char *description)` — 3 args
- `Cmd_AddCommandAD(char *cmd_name, xcommand_t function, struct argcompletion_ctx *(*argcompletion)(...), char *description)` — 4 args
- `Cmd_AddCommandOld(char *old_name, xcommand_t function, char *new_name)` — 3 args, legacy alias

- [ ] **Step 2: Create the commands handler**

Create `apps/qw-oracle/scripts/extractors/fte/_handler_commands.py`:

```python
"""FTE commands handler.

Detects Cmd_AddCommand, Cmd_AddCommandD (description), Cmd_AddCommandAD
(arg-completion + description), Cmd_AddCommandOld (legacy alias) callsites.
"""
from __future__ import annotations

import os
from pathlib import Path

from clang.cindex import CursorKind


def _tokens_of(cursor) -> list[str]:
    return [t.spelling for t in cursor.get_tokens()]


def _literal_string(arg_cursor) -> str | None:
    parts: list[str] = []
    for t in _tokens_of(arg_cursor):
        t = t.strip()
        if t.startswith('"') and t.endswith('"') and len(t) >= 2:
            parts.append(t[1:-1])
        elif t == "NULL":
            return None
    return "".join(parts) if parts else None


def _function_decl_name(arg_cursor) -> str | None:
    ref = arg_cursor.referenced
    if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
        return ref.spelling
    # Fallback: walk for DECL_REF_EXPR pointing at a function
    for c in arg_cursor.walk_preorder():
        if c.kind == CursorKind.DECL_REF_EXPR:
            r = c.referenced
            if r is not None and r.kind == CursorKind.FUNCTION_DECL:
                return r.spelling
    return None


CMD_ADDERS = {
    "Cmd_AddCommand":    {"args": 2, "name_idx": 0, "fn_idx": 1, "desc_idx": None, "legacy": False},
    "Cmd_AddCommandD":   {"args": 3, "name_idx": 0, "fn_idx": 1, "desc_idx": 2,    "legacy": False},
    "Cmd_AddCommandAD":  {"args": 4, "name_idx": 0, "fn_idx": 1, "desc_idx": 3,    "legacy": False},
    "Cmd_AddCommandOld": {"args": 3, "name_idx": 0, "fn_idx": 1, "desc_idx": None, "legacy": True, "alias_idx": 2},
}


class CommandsFteHandler:
    name = "commands"
    output_filename = "fte-commands-ast.json"
    output_top_key = "commands"

    def setup(self, repo_root: str, src_root: str) -> None:
        self._all_rows: dict[str, dict] = {}
        self.current_source_root: str = "engine"

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._target = source_path
        self._seen_in_file: set[str] = set()
        self._rows: list[dict] = []

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        if cursor.spelling not in CMD_ADDERS:
            return
        if cursor.location.file is None or not os.path.samefile(cursor.location.file.name, self._target):
            return
        spec = CMD_ADDERS[cursor.spelling]
        args = list(cursor.get_arguments())
        if len(args) < spec["args"]:
            return
        name = _literal_string(args[spec["name_idx"]])
        if not name or name in self._seen_in_file:
            return
        fn_name = _function_decl_name(args[spec["fn_idx"]])
        desc = _literal_string(args[spec["desc_idx"]]) if spec["desc_idx"] is not None else None

        row = {
            "name": name,
            "handler": fn_name,
            "description": desc or "",
            "source_file": self._target,
            "source_line": cursor.location.line,
            "source_root": self.current_source_root,
            "variant": variant,
            "registration_api": cursor.spelling,
        }
        if spec["legacy"]:
            row["legacy_alias_of"] = _literal_string(args[spec["alias_idx"]])
            row["handler"] = None  # legacy aliases have no fn target

        self._seen_in_file.add(name)
        self._rows.append(row)

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        return rows

    def aggregate(self, rows: list[dict]) -> None:
        for r in rows:
            n = r["name"]
            if n in self._all_rows:
                existing = self._all_rows[n]
                if not existing.get("description") and r.get("description"):
                    existing["description"] = r["description"]
            else:
                self._all_rows[n] = r

    def finalize(self, repo_root: str) -> dict:
        repo_root_p = Path(repo_root)
        for r in self._all_rows.values():
            try:
                r["source_file"] = str(Path(r["source_file"]).relative_to(repo_root_p))
            except ValueError:
                pass
        return {
            "commands": self._all_rows,
            "_stats": {
                "count": len(self._all_rows),
                "with_description": sum(1 for r in self._all_rows.values() if r.get("description")),
                "legacy_aliases": sum(1 for r in self._all_rows.values() if r.get("legacy_alias_of")),
                "by_source_root": {
                    root: sum(1 for r in self._all_rows.values() if r.get("source_root") == root)
                    for root in ("engine", "plugin:ezhud")
                },
            },
        }
```

- [ ] **Step 3: Wire into extract.py**

```python
def collect_handlers(names: str):
    from _handler_cvars import CvarsFteHandler
    from _handler_commands import CommandsFteHandler
    available = {
        "cvars": CvarsFteHandler(),
        "commands": CommandsFteHandler(),
    }
    if names == "all":
        return available
    requested = {n.strip() for n in names.split(",") if n.strip()}
    return {k: v for k, v in available.items() if k in requested}
```

- [ ] **Step 4: Smoke-test against `engine/common/cmd.c` (which registers many commands)**

```bash
cd /home/paradoks/projects/quakeworld
python3 << 'EOF'
import sys
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors')
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/fte')
from clang.cindex import Config, Index
Config.set_library_file("libclang-18.so.1")
from extractor_lib.clang_config import clang_args_fte_for, PARSE_OPTS
from extractor_lib._visitor import walk_tu_dispatch
from _handler_commands import CommandsFteHandler

repo = "research/repos/fteqw"
target = "research/repos/fteqw/engine/common/cmd.c"
h = CommandsFteHandler()
h.setup(repo, repo + "/engine")
h.current_source_root = "engine"
h.start_file(target, open(target, "rb").read())
idx = Index.create()
tu = idx.parse(target, args=clang_args_fte_for(repo), options=PARSE_OPTS)
walk_tu_dispatch(tu, [h], "client", target)
rows = h.end_file()
print(f"cmd.c command rows: {len(rows)}")
for r in rows[:5]:
    print(f"  {r['name']:25}  api={r['registration_api']}  handler={r['handler']}")
EOF
```

Expected: 5+ rows with names like `exec`, `echo`, `alias`, `cmdlist`, etc.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/fte/_handler_commands.py apps/qw-oracle/scripts/extractors/fte/extract.py
git commit -m "feat(qw-oracle): FTE commands handler — Cmd_AddCommand variants"
```

---

## Task 7: Macros handler — Cmd_AddMacro{,D}

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/_handler_macros.py`
- Modify: `apps/qw-oracle/scripts/extractors/fte/extract.py`

- [ ] **Step 1: Create macros handler**

Create `apps/qw-oracle/scripts/extractors/fte/_handler_macros.py`:

```python
"""FTE macros handler.

Detects Cmd_AddMacro and Cmd_AddMacroD callsites. Macro expansions in FTE
work like ezQuake's macros — runtime-resolved $name tokens.
"""
from __future__ import annotations

import os
from pathlib import Path

from clang.cindex import CursorKind


def _tokens_of(cursor) -> list[str]:
    return [t.spelling for t in cursor.get_tokens()]


def _literal_string(arg_cursor) -> str | None:
    parts = []
    for t in _tokens_of(arg_cursor):
        t = t.strip()
        if t.startswith('"') and t.endswith('"') and len(t) >= 2:
            parts.append(t[1:-1])
        elif t == "NULL":
            return None
    return "".join(parts) if parts else None


def _function_decl_name(arg_cursor) -> str | None:
    ref = arg_cursor.referenced
    if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
        return ref.spelling
    for c in arg_cursor.walk_preorder():
        if c.kind == CursorKind.DECL_REF_EXPR:
            r = c.referenced
            if r is not None and r.kind == CursorKind.FUNCTION_DECL:
                return r.spelling
    return None


MACRO_ADDERS = {
    "Cmd_AddMacro":  {"name_idx": 0, "fn_idx": 1, "desc_idx": None},
    "Cmd_AddMacroD": {"name_idx": 0, "fn_idx": 1, "desc_idx": 2},
}


class MacrosFteHandler:
    name = "macros"
    output_filename = "fte-macros-ast.json"
    output_top_key = "macros"

    def setup(self, repo_root: str, src_root: str) -> None:
        self._all_rows: dict[str, dict] = {}
        self.current_source_root: str = "engine"

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._target = source_path
        self._seen_in_file: set[str] = set()
        self._rows: list[dict] = []

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        if cursor.spelling not in MACRO_ADDERS:
            return
        if cursor.location.file is None or not os.path.samefile(cursor.location.file.name, self._target):
            return
        spec = MACRO_ADDERS[cursor.spelling]
        args = list(cursor.get_arguments())
        if len(args) < (3 if spec["desc_idx"] is not None else 2):
            return
        name = _literal_string(args[spec["name_idx"]])
        if not name or name in self._seen_in_file:
            return
        fn_name = _function_decl_name(args[spec["fn_idx"]])
        desc = _literal_string(args[spec["desc_idx"]]) if spec["desc_idx"] is not None else None

        self._seen_in_file.add(name)
        self._rows.append({
            "name": name,
            "handler": fn_name,
            "description": desc or "",
            "source_file": self._target,
            "source_line": cursor.location.line,
            "source_root": self.current_source_root,
            "variant": variant,
            "registration_api": cursor.spelling,
        })

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        return rows

    def aggregate(self, rows: list[dict]) -> None:
        for r in rows:
            n = r["name"]
            if n in self._all_rows:
                existing = self._all_rows[n]
                if not existing.get("description") and r.get("description"):
                    existing["description"] = r["description"]
            else:
                self._all_rows[n] = r

    def finalize(self, repo_root: str) -> dict:
        repo_root_p = Path(repo_root)
        for r in self._all_rows.values():
            try:
                r["source_file"] = str(Path(r["source_file"]).relative_to(repo_root_p))
            except ValueError:
                pass
        return {
            "macros": self._all_rows,
            "_stats": {
                "count": len(self._all_rows),
                "with_description": sum(1 for r in self._all_rows.values() if r.get("description")),
                "by_source_root": {
                    root: sum(1 for r in self._all_rows.values() if r.get("source_root") == root)
                    for root in ("engine", "plugin:ezhud")
                },
            },
        }
```

- [ ] **Step 2: Wire into extract.py**

Update `collect_handlers` to add `MacrosFteHandler` to `available` (key `"macros"`).

- [ ] **Step 3: Smoke-test (`engine/common/cmd.c` and `engine/client/cl_cmd.c` register macros)**

```bash
cd /home/paradoks/projects/quakeworld
grep -lE 'Cmd_AddMacro' research/repos/fteqw/engine/ -r --include='*.c' | head -5
```

Expected: a handful of files. Pick one, run a parallel smoke test pattern as in Task 6 Step 4, expecting ~5+ macros.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/fte/_handler_macros.py apps/qw-oracle/scripts/extractors/fte/extract.py
git commit -m "feat(qw-oracle): FTE macros handler — Cmd_AddMacro{,D}"
```

---

## Task 8: Cmdline handler — COM_CheckParm callsites

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/_handler_cmdline.py`
- Reference: `apps/qw-oracle/scripts/extractors/qwcl/_handler_cmdline.py`

- [ ] **Step 1: Create cmdline handler (close to QWCL pattern)**

Create `apps/qw-oracle/scripts/extractors/fte/_handler_cmdline.py`:

```python
"""FTE cmdline_params handler.

Detects COM_CheckParm("-flag") callsites. Same pattern as QWCL.
"""
from __future__ import annotations

import os
from pathlib import Path

from clang.cindex import CursorKind


def _tokens_of(cursor) -> list[str]:
    return [t.spelling for t in cursor.get_tokens()]


def _literal_string(arg_cursor) -> str | None:
    parts = []
    for t in _tokens_of(arg_cursor):
        t = t.strip()
        if t.startswith('"') and t.endswith('"') and len(t) >= 2:
            parts.append(t[1:-1])
        elif t == "NULL":
            return None
    return "".join(parts) if parts else None


CMDLINE_FNS = {"COM_CheckParm", "COM_CheckParmOff"}


class CmdlineFteHandler:
    name = "cmdline"
    output_filename = "fte-cmdline-params-ast.json"
    output_top_key = "params"

    def setup(self, repo_root: str, src_root: str) -> None:
        self._all_rows: dict[str, dict] = {}
        self.current_source_root: str = "engine"

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._target = source_path
        self._rows: list[dict] = []

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        if cursor.spelling not in CMDLINE_FNS:
            return
        if cursor.location.file is None or not os.path.samefile(cursor.location.file.name, self._target):
            return
        args = list(cursor.get_arguments())
        if not args:
            return
        flag = _literal_string(args[0])
        if not flag or not flag.startswith("-"):
            return
        self._rows.append({
            "name": flag,
            "source_file": self._target,
            "source_line": cursor.location.line,
            "source_root": self.current_source_root,
            "variant": variant,
        })

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        return rows

    def aggregate(self, rows: list[dict]) -> None:
        for r in rows:
            n = r["name"]
            if n not in self._all_rows:
                self._all_rows[n] = {
                    "name": n,
                    "usage_sites": [],
                    "source_root": r["source_root"],
                }
            self._all_rows[n]["usage_sites"].append({
                "source_file": r["source_file"],
                "source_line": r["source_line"],
                "variant": r["variant"],
            })

    def finalize(self, repo_root: str) -> dict:
        repo_root_p = Path(repo_root)
        for r in self._all_rows.values():
            for u in r["usage_sites"]:
                try:
                    u["source_file"] = str(Path(u["source_file"]).relative_to(repo_root_p))
                except ValueError:
                    pass
        return {
            "params": self._all_rows,
            "_stats": {
                "count": len(self._all_rows),
                "total_usage_sites": sum(len(r["usage_sites"]) for r in self._all_rows.values()),
            },
        }
```

- [ ] **Step 2: Wire into extract.py**

Update `collect_handlers` to add `CmdlineFteHandler` (key `"cmdline"`).

- [ ] **Step 3: Smoke-test**

```bash
cd /home/paradoks/projects/quakeworld
grep -hE 'COM_CheckParm\s*\(\s*"' research/repos/fteqw/engine/common/common.c | head -10
```

Expected: real flag strings like `-game`, `-port`, etc.

Run targeted smoke test against `engine/common/common.c`. Expected: at least 10 `-flag` entries.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/fte/_handler_cmdline.py apps/qw-oracle/scripts/extractors/fte/extract.py
git commit -m "feat(qw-oracle): FTE cmdline handler — COM_CheckParm callsites"
```

---

## Task 9: Ezhud plugin handler — HUD_Register synth + GetNVFDG

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py`
- Create: `apps/qw-oracle/scripts/extractors/fte/seeds/ezhud-hud-elements.yaml`
- Reference: existing logic in `apps/qw-oracle/scripts/extractors/fte/cvars.ts` lines 380-590 (regex extraction of HUD_Register)

This is the most complex of the engine handlers because it must (a) recognize `HUD_Register` calls and synthesize multiple cvars per call, (b) recognize `cvarfuncs->GetNVFDG()` v-table calls, (c) consult a YAML seed for known per-element custom-param sets.

- [ ] **Step 1: Author the seed YAML by inspecting `plugins/ezhud/hud.c`**

The pattern in the legacy `cvars.ts` (Task 17 will retire this file, but reference its logic now):
- Each `HUD_Register(name, alias, desc, flags, min_state, draw_order, draw_func, show, place, align_x, align_y, pos_x, pos_y, frame, frame_color, item_opacity, custom_param_pairs..., NULL)` call defines a HUD element.
- 9 standard subcvars are auto-created: `show`, `place`, `align_x`, `align_y`, `pos_x`, `pos_y`, `frame`, `frame_color`, `item_opacity`.
- Any extra `name, default` pairs after `item_opacity` and before `NULL` are custom params for that element.

Capture the custom-param lists by reading `plugins/ezhud/hud.c` and extracting them into seed form. Sample seed structure for `seeds/ezhud-hud-elements.yaml`:

```yaml
# FTE ezhud plugin: per-element custom param tables.
# Standard 9 subcvars (show/place/align_x/align_y/pos_x/pos_y/frame/frame_color/
# item_opacity) are synthesized for every element automatically by the handler.
# Only custom params beyond the standard 9 belong here.
#
# Format:
#   element_name:
#     description: short text from the HUD_Register description arg
#     custom_params:
#       - name: subcvar_name
#         default: "default_value"
#       - ...
#
# This file's content is verified by the handler against actual HUD_Register
# calls in plugins/ezhud/hud.c at extraction time. Mismatches are logged.

# Populate from grep of HUD_Register calls in plugins/ezhud/hud.c
# Initial values can be empty {} for elements with no custom params; the handler
# auto-discovers the custom-param list at run time and writes back any missing
# entries to a generated companion file.

speed:
  description: "Player movement speed indicator"
  custom_params:
    - name: text_align
      default: "1"
    - name: style
      default: "0"
    - name: width
      default: "200"
# ... (continued for all elements after author runs the discovery step)
```

For Step 1, create the YAML file with a placeholder header and a single example element (`speed`). The handler in Step 2 will run a "discovery" mode that fills in the rest by parsing `hud.c` directly.

- [ ] **Step 2: Create the ezhud handler**

Create `apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py`:

```python
"""FTE ezhud plugin handler.

Runs ONLY on files under plugins/ezhud/. Detects two registration patterns
absent from the engine:

  1. HUD_Register(name, alias, desc, flags, min_state, draw_order, draw_func,
       show, place, align_x, align_y, pos_x, pos_y, frame, frame_color,
       item_opacity, custom_param_pairs..., NULL)
     Synthesizes 9 standard hud_<name>_<sub> cvars + 1 hud_<name>_order +
     N custom hud_<name>_<param> cvars.

  2. cvarfuncs->GetNVFDG("name", "default", flags, "description", ...)
     Standalone cvar registrations from the plugin v-table.

All emitted rows carry source_root = "plugin:ezhud".
"""
from __future__ import annotations

import os
import re
from pathlib import Path

import yaml

from clang.cindex import CursorKind


HUD_STANDARD_SUBCVARS = (
    "show", "place", "align_x", "align_y",
    "pos_x", "pos_y", "frame", "frame_color", "item_opacity",
)


def _tokens_of(cursor) -> list[str]:
    return [t.spelling for t in cursor.get_tokens()]


def _literal_string(arg_cursor) -> str | None:
    parts: list[str] = []
    for t in _tokens_of(arg_cursor):
        t = t.strip()
        if t.startswith('"') and t.endswith('"') and len(t) >= 2:
            parts.append(t[1:-1])
        elif t == "NULL":
            return None
    return "".join(parts) if parts else None


def _is_ezhud_path(path: str) -> bool:
    return "/plugins/ezhud/" in path or "\\plugins\\ezhud\\" in path


class EzhudFteHandler:
    name = "ezhud"
    # Output merges into the cvars JSON via cross-handler coordination at finalize time.
    # For now, write a separate file the cvars finalize step consults.
    output_filename = "fte-ezhud-cvars-ast.json"
    output_top_key = "vars"

    def setup(self, repo_root: str, src_root: str) -> None:
        self._all_rows: dict[str, dict] = {}
        self._seed_path = Path(__file__).parent / "seeds" / "ezhud-hud-elements.yaml"
        self._seed = self._load_seed()
        self.current_source_root: str = "plugin:ezhud"

    def _load_seed(self) -> dict:
        if not self._seed_path.exists():
            return {}
        with open(self._seed_path) as f:
            return yaml.safe_load(f) or {}

    def start_file(self, source_path: str, source_bytes: bytes) -> None:
        self._target = source_path
        self._is_ezhud = _is_ezhud_path(source_path)
        self._rows: list[dict] = []

    def visit_cursor(self, cursor, variant: str) -> None:
        if not self._is_ezhud:
            return
        if cursor.kind != CursorKind.CALL_EXPR:
            return

        # Pattern 1: HUD_Register
        if cursor.spelling == "HUD_Register":
            self._handle_hud_register(cursor, variant)
            return

        # Pattern 2: cvarfuncs->GetNVFDG (member call expression)
        if cursor.spelling == "GetNVFDG":
            self._handle_getnvfdg(cursor, variant)
            return

    def _handle_hud_register(self, cursor, variant: str) -> None:
        args = list(cursor.get_arguments())
        # Need at least: name, alias, desc, flags, min_state, draw_order, draw_func,
        # + 9 standard defaults = 16 args minimum. Custom param pairs follow + NULL.
        if len(args) < 16:
            return
        elem_name = _literal_string(args[0])
        if not elem_name:
            return
        desc = _literal_string(args[2]) or ""

        # Standard 9 defaults are at args[7..15] (after name/alias/desc/flags/
        # min_state/draw_order/draw_func)
        standard_defaults = []
        for i in range(7, 16):
            v = _literal_string(args[i])
            if v is None:
                # Identifier — record as-is for downstream resolution
                toks = _tokens_of(args[i])
                v = toks[0] if toks else ""
            standard_defaults.append(v)

        # Custom params: args[16:] until NULL terminator, in (name, default) pairs
        custom_params = []
        i = 16
        while i + 1 < len(args):
            p_name = _literal_string(args[i])
            if p_name is None:
                break  # NULL terminator
            p_default = _literal_string(args[i + 1]) or ""
            custom_params.append((p_name, p_default))
            i += 2

        # Synthesize 9 standard subcvars
        for sub_name, sub_default in zip(HUD_STANDARD_SUBCVARS, standard_defaults):
            full = f"hud_{elem_name}_{sub_name}"
            self._rows.append({
                "name": full,
                "default": sub_default,
                "description": f"{desc} [{sub_name}]",
                "alias": None,
                "flags": [],
                "callback": None,
                "source_file": self._target,
                "source_line": cursor.location.line,
                "source_root": "plugin:ezhud",
                "variant": variant,
                "synthesized_from": "HUD_Register",
                "synthesized_parent": elem_name,
            })

        # Always-created order cvar
        self._rows.append({
            "name": f"hud_{elem_name}_order",
            "default": "0",
            "description": f"{desc} [draw order]",
            "source_file": self._target,
            "source_line": cursor.location.line,
            "source_root": "plugin:ezhud",
            "variant": variant,
            "synthesized_from": "HUD_Register",
            "synthesized_parent": elem_name,
        })

        # Custom params
        for p_name, p_default in custom_params:
            self._rows.append({
                "name": f"hud_{elem_name}_{p_name}",
                "default": p_default,
                "description": f"{desc} [{p_name}]",
                "source_file": self._target,
                "source_line": cursor.location.line,
                "source_root": "plugin:ezhud",
                "variant": variant,
                "synthesized_from": "HUD_Register",
                "synthesized_parent": elem_name,
            })

    def _handle_getnvfdg(self, cursor, variant: str) -> None:
        # cvarfuncs->GetNVFDG(name, default, flags, description, ...)
        args = list(cursor.get_arguments())
        if len(args) < 4:
            return
        name = _literal_string(args[0])
        if not name or name.startswith("tp_name_"):
            # tp_name_* are item-name aliases per legacy cvars.ts; skip
            return
        default = _literal_string(args[1]) or ""
        desc = _literal_string(args[3]) or ""
        self._rows.append({
            "name": name,
            "default": default,
            "description": desc,
            "source_file": self._target,
            "source_line": cursor.location.line,
            "source_root": "plugin:ezhud",
            "variant": variant,
            "synthesized_from": "GetNVFDG",
        })

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        return rows

    def aggregate(self, rows: list[dict]) -> None:
        for r in rows:
            n = r["name"]
            if n not in self._all_rows:
                self._all_rows[n] = r

    def finalize(self, repo_root: str) -> dict:
        repo_root_p = Path(repo_root)
        for r in self._all_rows.values():
            try:
                r["source_file"] = str(Path(r["source_file"]).relative_to(repo_root_p))
            except ValueError:
                pass
        return {
            "vars": self._all_rows,
            "_stats": {
                "count": len(self._all_rows),
                "by_synthesizer": {
                    "HUD_Register": sum(1 for r in self._all_rows.values() if r.get("synthesized_from") == "HUD_Register"),
                    "GetNVFDG": sum(1 for r in self._all_rows.values() if r.get("synthesized_from") == "GetNVFDG"),
                },
            },
        }
```

- [ ] **Step 3: Wire into extract.py + add merge step in cvars handler's finalize**

Update `collect_handlers`:

```python
def collect_handlers(names: str):
    from _handler_cvars import CvarsFteHandler
    from _handler_commands import CommandsFteHandler
    from _handler_macros import MacrosFteHandler
    from _handler_cmdline import CmdlineFteHandler
    from _handler_ezhud import EzhudFteHandler
    available = {
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
```

In the driver's `main()` after both handlers finalize, add a post-processing step that merges `fte-ezhud-cvars-ast.json` into `fte-variables-ast.json` so the loader sees a single cvars JSON:

```python
# After all handlers finalize
def merge_ezhud_into_cvars(output_dir: Path) -> None:
    cvars_path = output_dir / "fte-variables-ast.json"
    ezhud_path = output_dir / "fte-ezhud-cvars-ast.json"
    if not cvars_path.exists() or not ezhud_path.exists():
        return
    cvars = json.loads(cvars_path.read_text())
    ezhud = json.loads(ezhud_path.read_text())
    cvars["vars"].update(ezhud["vars"])  # plugin overlays engine in name collision (rare)
    cvars["_stats"]["count"] = len(cvars["vars"])
    cvars["_stats"]["by_source_root"] = {
        root: sum(1 for r in cvars["vars"].values() if r.get("source_root") == root)
        for root in ("engine", "plugin:ezhud")
    }
    cvars_path.write_text(json.dumps(cvars, indent=2, sort_keys=True) + "\n")

# Call merge_ezhud_into_cvars(output_dir) after the finalize loop
```

- [ ] **Step 4: Smoke-test against `plugins/ezhud/hud.c`**

```bash
cd /home/paradoks/projects/quakeworld
python3 << 'EOF'
import sys
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors')
sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/fte')
from clang.cindex import Config, Index
Config.set_library_file("libclang-18.so.1")
from extractor_lib.clang_config import clang_args_fte_for, PARSE_OPTS
from extractor_lib._visitor import walk_tu_dispatch
from _handler_ezhud import EzhudFteHandler

repo = "research/repos/fteqw"
target = "research/repos/fteqw/plugins/ezhud/hud.c"
h = EzhudFteHandler()
h.setup(repo, repo + "/engine")
h.current_source_root = "plugin:ezhud"
h.start_file(target, open(target, "rb").read())
idx = Index.create()
tu = idx.parse(target, args=clang_args_fte_for(repo), options=PARSE_OPTS)
walk_tu_dispatch(tu, [h], "client", target)
rows = h.end_file()
print(f"hud.c synthesized rows: {len(rows)}")
print("sample:")
for r in rows[:8]:
    print(f"  {r['name']:40}  default={r['default']!r}")
EOF
```

Expected: hundreds of synthesized cvars, names like `hud_speed_show`, `hud_speed_pos_x`, etc.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/fte/_handler_ezhud.py apps/qw-oracle/scripts/extractors/fte/seeds/ezhud-hud-elements.yaml apps/qw-oracle/scripts/extractors/fte/extract.py
git commit -m "feat(qw-oracle): FTE ezhud handler — HUD_Register synth + GetNVFDG"
```

---

## Task 10: Loader project gates

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`

- [ ] **Step 1: Find the project gate maps**

```bash
grep -n "PROJECT_VERSION_ALIASES\|PROJECT_HAS_ASSET_BUNDLE\|PROJECT_SRC_PREFIX" /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge/load-version.ts
```

- [ ] **Step 2: Add FTE entries**

In `load-version.ts`:

```typescript
PROJECT_VERSION_ALIASES['fte'] = ['head'];
PROJECT_HAS_ASSET_BUNDLE['fte'] = false;  // becomes true in Phase 2d-bundle
PROJECT_SRC_PREFIX['fte'] = '';            // FTE extractor emits repo-relative paths directly
```

Locate each map and add the entry alongside existing `ezquake` / `qwcl` entries.

- [ ] **Step 3: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/load-version.ts
git commit -m "feat(qw-oracle): loader project gates for fte"
```

---

## Task 11: Loader source_root passthrough

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-cvars.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-commands.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/load-macros.ts`
- Modify: `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`

- [ ] **Step 1: Read load-cvars.ts to find buildVersionRow**

```bash
grep -n "buildVersionRow\|source_root\|source_file" /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge/load-cvars.ts
```

- [ ] **Step 2: Add source_root to load-cvars.ts buildVersionRow**

In the function that constructs the row inserted into `cvar_versions`, add:

```typescript
source_root: entry.ast?.source_root ?? null,
```

And in the SQL INSERT statement, add `source_root` to the column list and `:source_root` to the values list.

- [ ] **Step 3: Repeat for load-commands.ts**

Same pattern. The ast row carries `source_root`; pass it through to the SQL insert for `command_versions`.

- [ ] **Step 4: Repeat for load-macros.ts**

Same pattern for `macro_versions`.

- [ ] **Step 5: Pass source_root through build-snapshot.ts**

In `build-snapshot.ts`, the snapshot writer reads from the version table and emits a JSON row per entity. Add `source_root` to the SELECT and to the emitted JSON row shape.

- [ ] **Step 6: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Verify loader works on existing ezQuake data (regression)**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
sqlite3 data/knowledge.db "SELECT COUNT(*) FROM cvar_versions WHERE source_root IS NULL"
```

Expected: equal to total ezQuake cvar version rows (no source_root assigned for them; remains NULL → "engine" semantically).

- [ ] **Step 8: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/load-cvars.ts apps/qw-oracle/scripts/load-knowledge/load-commands.ts apps/qw-oracle/scripts/load-knowledge/load-macros.ts apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts
git commit -m "feat(qw-oracle): loader passthrough for source_root field"
```

---

## Task 12: Run full FTE extraction + first head load

**Files:**
- Generated: `apps/qw-oracle/scripts/extractors/fte/output/*.json`
- Modified DB: `apps/qw-oracle/data/knowledge.db`

- [ ] **Step 1: Run full extraction**

```bash
cd /home/paradoks/projects/quakeworld
python3 apps/qw-oracle/scripts/extractors/fte/extract.py --handlers all 2>&1 | tee /tmp/fte-extract.log
```

Expected: progresses through engine + plugin:ezhud source roots, ends with "Done. N files, Xs". Output JSONs land in `apps/qw-oracle/scripts/extractors/fte/output/`.

- [ ] **Step 2: Sanity-check output stats**

```bash
cd /home/paradoks/projects/quakeworld
for f in apps/qw-oracle/scripts/extractors/fte/output/*.json; do
  echo "=== $f ==="
  python3 -c "import json; d=json.load(open('$f')); print(d.get('_stats', {}))"
done
```

Expected counts (per spec):
- cvars (`fte-variables-ast.json`): 2700-3000 (engine ~2200-2500 + ezhud HUD-synth ~400-500 + GetNVFDG ~30-50)
- commands: 600-800
- macros: 50-100
- cmdline: 150-250

If counts dramatically off, do NOT proceed to load — investigate first. See spec Section 5 troubleshooting.

- [ ] **Step 3: Load each type into the DB**

Replace `<SHA>` with the locked head SHA from Task 1 and `<N>` with the locked autobuild number.

```bash
cd /home/paradoks/projects/quakeworld

# cvars
npm --prefix apps/qw-oracle run load-knowledge -- load-version \
  --project fte --version build-<N> --type cvar \
  --json apps/qw-oracle/scripts/extractors/fte/output/fte-variables-ast.json \
  --commit <SHA> --ordinal 1

# commands
npm --prefix apps/qw-oracle run load-knowledge -- load-version \
  --project fte --version build-<N> --type command \
  --json apps/qw-oracle/scripts/extractors/fte/output/fte-commands-ast.json \
  --commit <SHA> --ordinal 1

# macros
npm --prefix apps/qw-oracle run load-knowledge -- load-version \
  --project fte --version build-<N> --type macro \
  --json apps/qw-oracle/scripts/extractors/fte/output/fte-macros-ast.json \
  --commit <SHA> --ordinal 1

# cmdline_params
npm --prefix apps/qw-oracle run load-knowledge -- load-version \
  --project fte --version build-<N> --type cmdline_param \
  --json apps/qw-oracle/scripts/extractors/fte/output/fte-cmdline-params-ast.json \
  --commit <SHA> --ordinal 1
```

Each command should report row counts inserted; no errors.

- [ ] **Step 4: Verify DB state**

```bash
cd /home/paradoks/projects/quakeworld
sqlite3 apps/qw-oracle/data/knowledge.db <<'SQL'
SELECT type, COUNT(*) FROM entities WHERE project='fte' GROUP BY type;
SQL
```

Expected: 4 rows (cvar, command, macro, cmdline_param) with counts in the spec's range.

- [ ] **Step 5: Commit the AST outputs**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/extractors/fte/output/
git commit -m "data(qw-oracle): FTE head AST outputs (build-<N>, sha <SHORT_SHA>)"
```

---

## Task 13: Validation Pass 1 — runtime cvarlist diff

**Files:**
- Created (transient): `/tmp/runtime-fte-cvars.txt`, `/tmp/db-fte-cvars.txt`, `/tmp/runtime-only.txt`, `/tmp/db-only.txt`

This task requires a running FTE instance. Coordinate with the user if you cannot run FTE locally.

- [ ] **Step 1: Boot FTE, dump cvarlist + cmdlist + cmdline_params**

User runs FTE, opens console, runs:

```
condump fte-runtime.log
cvarlist
cmdlist
cmdline_params
```

The user supplies `fte-runtime.log` to `/tmp/fte-runtime.log`.

- [ ] **Step 2: Parse cvarlist into clean name list**

```bash
awk '/^List of cvars:/{flag=1;next} /^[0-9]+\/[0-9]+ variables/{flag=0}
     flag{n=substr($0,4); sub(/\r$/,"",n); gsub(/\^C[0-9a-fA-F]{3}/,"",n);
          if (n ~ /^[A-Za-z_+\-\$\.][A-Za-z0-9_\.\+\-]*$/) print n}' \
  /tmp/fte-runtime.log | tr '[:upper:]' '[:lower:]' | sort -u > /tmp/runtime-fte-cvars.txt
wc -l /tmp/runtime-fte-cvars.txt
```

Expected: a number close to the cvar count visible in FTE's console (`cvarlist` echoes the count at the bottom).

- [ ] **Step 3: Pull DB cvar names**

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db \
  "SELECT name FROM entities WHERE project='fte' AND type='cvar' ORDER BY name" \
  | sort -u > /tmp/db-fte-cvars.txt
wc -l /tmp/db-fte-cvars.txt
```

- [ ] **Step 4: Diff**

```bash
comm -23 /tmp/runtime-fte-cvars.txt /tmp/db-fte-cvars.txt > /tmp/runtime-only-fte.txt
comm -13 /tmp/runtime-fte-cvars.txt /tmp/db-fte-cvars.txt > /tmp/db-only-fte.txt
echo "Runtime-only: $(wc -l < /tmp/runtime-only-fte.txt)"
echo "DB-only:      $(wc -l < /tmp/db-only-fte.txt)"
echo "Common:       $(comm -12 /tmp/runtime-fte-cvars.txt /tmp/db-fte-cvars.txt | wc -l)"
```

- [ ] **Step 5: Categorize runtime-only entries**

For each entry in `runtime-only-fte.txt`, place into one of these buckets (per spec Section 5):

```bash
# Q2/Q3/H2-gated (expected exclusion under Option B)
grep -lE '#ifdef\s+(Q2CLIENT|Q3CLIENT|HEXEN2|VM_Q1|Q3BSPS)' \
  -B0 -A20 /home/paradoks/projects/quakeworld/research/repos/fteqw/engine/ \
  --include='*.c' -r 2>/dev/null > /tmp/q2q3-files.txt
# (then manually inspect each runtime-only name against this set)

# Plugin candidates (registered by plugins beyond ezhud)
# — visible if the user has ffmpeg / cef / quakebot / etc. plugins loaded.

# Dynamic registrations (Cvar_Get/Cvar_FindOrGet/exec-driven)
# — typically user-defined script names like nick, tpname.

# Genuine extractor gap → goal is zero or near-zero.
```

Document the categorization in a temporary file `/tmp/runtime-only-categorized.md` for use in the findings doc (Task 18).

- [ ] **Step 6: Categorize DB-only entries**

DB-only is expected — these are cvars source-visible under our variant matrix but not loaded in this specific runtime build. Common categories:
- Server-only cvars when runtime is a client build.
- Vulkan cvars when runtime is GL.
- Win-specific cvars on Linux runtime (or vice versa).

Scan `db-only-fte.txt` and confirm each entry maps to a known variant gate.

- [ ] **Step 7: Pass criterion**

Pass criterion: runtime-only "genuine extractor gap" bucket is zero or near-zero (≤5 entries, each documented in findings).

If pass: proceed to Task 14. If fail: investigate gaps before continuing. Common causes: missing CVAR macro variant, missing variant in matrix, identifier-resolution-via-#define needed.

- [ ] **Step 8: Save categorization for the findings doc**

```bash
cp /tmp/runtime-only-fte.txt /tmp/db-only-fte.txt /tmp/runtime-only-categorized.md \
   /home/paradoks/projects/quakeworld/docs/superpowers/specs/assets/ 2>/dev/null || mkdir -p /home/paradoks/projects/quakeworld/docs/superpowers/specs/assets/
mv /tmp/runtime-only-fte.txt /tmp/db-only-fte.txt /tmp/runtime-only-categorized.md \
   /home/paradoks/projects/quakeworld/docs/superpowers/specs/assets/2026-04-26-fte-runtime-validation/
```

- [ ] **Step 9: Commit validation artifacts**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/superpowers/specs/assets/2026-04-26-fte-runtime-validation/
git commit -m "validation(qw-oracle): FTE Pass 1 runtime cvarlist diff artifacts"
```

---

## Task 14: Validation Pass 2 — field-accuracy sample audit

**Files:**
- Created (transient): a sample-audit checklist file in `docs/superpowers/specs/assets/`.

- [ ] **Step 1: Pull 20 random source_backed cvars**

```bash
sqlite3 -json /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db <<'SQL' > /tmp/fte-sample-audit.json
SELECT e.name, cv.default_value, cv.flags_raw, cv.description,
       cv.source_file, cv.source_line, cv.source_root
FROM entities e
JOIN cvar_versions cv ON cv.entity_id = e.id
WHERE e.project='fte' AND e.type='cvar'
ORDER BY RANDOM()
LIMIT 20;
SQL
```

- [ ] **Step 2: Manually verify each row**

For each of the 20 rows, open the source file at `source_line` and confirm the literal `cvar_t` initializer matches all 4 fields (default, flags, description, source line).

```bash
python3 << 'EOF'
import json
data = json.load(open('/tmp/fte-sample-audit.json'))
for row in data:
    sf = row['source_file']
    sl = row['source_line']
    print(f"\n=== {row['name']} ({sf}:{sl}, source_root={row['source_root']}) ===")
    print(f"  default: {row['default_value']!r}")
    print(f"  flags:   {row['flags_raw']!r}")
    print(f"  desc:    {(row['description'] or '')[:70]!r}")
    # Print 5 lines of source for visual verification
    full = f"/home/paradoks/projects/quakeworld/research/repos/fteqw/{sf}"
    try:
        lines = open(full).readlines()
        start = max(0, sl - 3)
        end = min(len(lines), sl + 4)
        for i in range(start, end):
            marker = ">>" if i + 1 == sl else "  "
            print(f"  {marker} {i+1:5}: {lines[i].rstrip()}")
    except FileNotFoundError:
        print(f"  [source file not found: {full}]")
EOF
```

Run the script, eyeball each of the 20 cvars. Mark each as PASS or FAIL.

- [ ] **Step 3: Pass criterion**

Pass criterion: 20/20 rows accurate (no field mismatched against source). If 1-2 mismatches: log as findings, investigate, may be deferrable. If 3+ mismatches: systematic misparse — investigate before declaring done.

- [ ] **Step 4: Save audit artifact**

```bash
cp /tmp/fte-sample-audit.json /home/paradoks/projects/quakeworld/docs/superpowers/specs/assets/2026-04-26-fte-runtime-validation/
```

- [ ] **Step 5: Commit (audit log included in next group commit; no separate commit needed)**

---

## Task 15: Validation Pass 3 — source_root sanity check

**Files:**
- Verification queries only.

- [ ] **Step 1: Bucket count by source_root**

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db <<'SQL'
SELECT cv.source_root, COUNT(*) AS n
FROM cvar_versions cv
JOIN entities e ON cv.entity_id = e.id
WHERE e.project = 'fte'
GROUP BY cv.source_root
ORDER BY n DESC;
SQL
```

Expected: two buckets:
- `engine` (~80-90% of rows)
- `plugin:ezhud` (~10-20% of rows)
- Zero rows with `NULL` source_root

If any rows are NULL: the loader passthrough has a bug — check Task 11 implementation.

- [ ] **Step 2: Spot-check 5 plugin:ezhud rows**

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db <<'SQL'
SELECT e.name, cv.source_file, cv.source_root
FROM cvar_versions cv
JOIN entities e ON cv.entity_id = e.id
WHERE e.project = 'fte' AND cv.source_root = 'plugin:ezhud'
ORDER BY RANDOM()
LIMIT 5;
SQL
```

Expected: 5 rows, every `source_file` starts with `plugins/ezhud/`. If any row has `source_file` from `engine/` while tagged `plugin:ezhud` — investigate.

- [ ] **Step 3: Confirm no engine row has plugin source_file**

```bash
sqlite3 /home/paradoks/projects/quakeworld/apps/qw-oracle/data/knowledge.db <<'SQL'
SELECT COUNT(*)
FROM cvar_versions cv
JOIN entities e ON cv.entity_id = e.id
WHERE e.project = 'fte'
  AND cv.source_root = 'engine'
  AND cv.source_file LIKE 'plugins/%';
SQL
```

Expected: 0.

- [ ] **Step 4: Pass criterion**

All three checks pass. If any fail, fix and re-run.

---

## Task 16: Quality grid integration

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`

- [ ] **Step 1: Find the existing project entries (ezquake, qwcl)**

```bash
grep -n "'ezquake'\|'qwcl'" /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/load-knowledge/quality-grid.ts | head -10
```

- [ ] **Step 2: Add fte regression + anomaly probes**

Add an FTE entry to whichever data structure holds project probes. Regression probes verify counts within ±5% of last run; anomaly probes verify field invariants.

Sample additions:

```typescript
// FTE regression probes
{
  project: 'fte',
  family: 'regression',
  name: 'fte-cvars-count',
  query: `SELECT COUNT(*) AS n FROM entities WHERE project='fte' AND type='cvar'`,
  expected_range: [2500, 3200],
},
{
  project: 'fte',
  family: 'regression',
  name: 'fte-commands-count',
  query: `SELECT COUNT(*) AS n FROM entities WHERE project='fte' AND type='command'`,
  expected_range: [550, 850],
},

// FTE anomaly probes
{
  project: 'fte',
  family: 'anomaly',
  name: 'fte-no-null-source-root',
  query: `SELECT COUNT(*) AS n FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='fte' AND cv.source_root IS NULL`,
  expected: 0,
},
{
  project: 'fte',
  family: 'anomaly',
  name: 'fte-plugin-ezhud-source-root-consistent',
  query: `SELECT COUNT(*) AS n FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='fte' AND cv.source_root='plugin:ezhud' AND cv.source_file NOT LIKE 'plugins/ezhud/%'`,
  expected: 0,
},
{
  project: 'fte',
  family: 'anomaly',
  name: 'fte-plugin-ezhud-min-count',
  query: `SELECT COUNT(*) AS n FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='fte' AND cv.source_root='plugin:ezhud'`,
  expected_range: [200, 800],
},
```

Adjust shape to match existing structure in `quality-grid.ts`.

- [ ] **Step 3: Run the quality grid**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
npm run load-knowledge -- quality-grid --project fte
```

Expected: all probes PASS. If any fails, debug.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
git commit -m "feat(qw-oracle): quality-grid probes for fte (regression + anomaly)"
```

---

## Task 17: Cleanup retired files

**Files:**
- Delete: `apps/qw-oracle/scripts/extractors/fte/cvars.ts`
- Delete: `apps/qw-oracle/scripts/extractors/fte/cvars-check.py`

- [ ] **Step 1: Confirm new pipeline produces equivalent or better output**

Counts comparison:

```bash
cd /home/paradoks/projects/quakeworld
# Old regex-based count (if cvars.ts ever ran and wrote to packages/qw-config/...):
ls -la packages/qw-config/src/data/fte-variables.json 2>&1 || echo "old output not present (qw-config dissolved)"
# New libclang-based count:
python3 -c "import json; d=json.load(open('apps/qw-oracle/scripts/extractors/fte/output/fte-variables-ast.json')); print(d['_stats'])"
```

Confirm new count is in the expected range (≥2500 cvars).

- [ ] **Step 2: Delete the retired files**

```bash
cd /home/paradoks/projects/quakeworld
rm apps/qw-oracle/scripts/extractors/fte/cvars.ts
rm apps/qw-oracle/scripts/extractors/fte/cvars-check.py
```

- [ ] **Step 3: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add -u apps/qw-oracle/scripts/extractors/fte/
git commit -m "cleanup(qw-oracle): retire pre-libclang FTE prototypes"
```

---

## Task 18: Findings doc

**Files:**
- Create: `docs/superpowers/specs/2026-04-26-fte-extraction-findings.md`

- [ ] **Step 1: Write the findings doc**

Create `docs/superpowers/specs/2026-04-26-fte-extraction-findings.md`:

```markdown
# FTE Extraction Findings — Phase 2d-core

**Date:** 2026-04-26
**Snapshot:** build-<N> at SHA <SHORT_SHA>
**Status:** Phase 2d-core shipped; 2d-bundle (asset extraction) remaining.
**Spec:** `docs/superpowers/specs/2026-04-26-fte-layer1-extraction-design.md`

## Counts that landed

| Type | Count | Range expected | Notes |
|---|---|---|---|
| cvar | <X> | 2700-3000 | engine ~<a> + plugin:ezhud ~<b> |
| command | <X> | 600-800 | |
| macro | <X> | 50-100 | |
| cmdline_param | <X> | 150-250 | |

## Source-root distribution

| source_root | cvars | commands | macros |
|---|---|---|---|
| engine | <X> | <X> | <X> |
| plugin:ezhud | <X> | 0 | 0 |
| (NULL) | 0 | 0 | 0 |

## Pattern catalog vs. ezQuake

What's the same:
- Pattern 1 (literal cvar_t struct-init via macro expansion) — base case for cvars; handled by libclang's PARSE_DETAILED_PROCESSING_RECORD.
- Pattern 5 (legacy alias) — handled via Cmd_AddCommandOld.
- Pattern 7 (platform-guarded code via multi-variant parse) — handled via 4-variant matrix (client/server/win/client_vk).

What's specific to FTE:
- Different macro families: CVARD/CVARFD/CVARAFD/CVARAD (not literal cvar_t).
- Different command APIs: Cmd_AddCommand{,D,AD,Old}.
- Different macro APIs: Cmd_AddMacro{,D}.
- Plugin source root concept (plugin:ezhud).
- ezhud's HUD_Register synthesizing 9+ subcvars per element.
- ezhud's cvarfuncs->GetNVFDG v-table pattern.

## Runtime validation

### Pass 1 — cvarlist diff
- Common: <X>
- Runtime-only: <X>
  - Categorized as Q2/Q3/H2-gated (expected): <X>
  - Categorized as plugin-not-loaded: <X>
  - Categorized as dynamic (Cvar_Get/exec): <X>
  - Genuine extractor gap: <X> (target: 0)

### Pass 2 — field accuracy
- 20/20 rows accurate. (Or document mismatches.)

### Pass 3 — source_root sanity
- All checks PASS.

## Known absences

(If any survivors from Pass 1 categorization remain unexplained, list here.)

## Updates to monorepo state

- HANDOVER.md updated to mark Phase 2d-core shipped.
- Memory entry added: `project_realignment_roadmap.md` reflects FTE Phase 2d-core complete.

## What's next

- Phase 2d-bundle: asset seed YAMLs + asset handler + path verifier. Separate plan.
- Phase 2e: MVDSV + KTX (KTX needs tree-sitter for QuakeC).
- Quarterly cadence: next FTE snapshot in ~3 months.
```

Replace `<X>` placeholders with actual numbers from Tasks 12-15.

- [ ] **Step 2: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/superpowers/specs/2026-04-26-fte-extraction-findings.md
git commit -m "docs(specs): FTE Phase 2d-core extraction findings"
```

---

## Task 19: HANDOVER + memory updates

**Files:**
- Modify: `HANDOVER.md`
- Create: `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_fte_phase2d.md`
- Modify: `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md`
- Modify: `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_realignment_roadmap.md`

- [ ] **Step 1: Update HANDOVER Phase 2d-2h entry**

In `HANDOVER.md`, find the "Phase 2d-2h: remaining QW knowledge rollout" section. Update the leading "Updated:" timestamp to today, and amend the body:

```markdown
**Updated:** 2026-04-26 — **FTE Phase 2d-core SHIPPED.** build-<N> at SHA <SHORT_SHA>: <X> cvars / <X> commands / <X> macros / <X> cmdline_params; engine + plugin:ezhud source roots; schema v11 stamped (source_root TEXT additive). Quality grid passes; 20/20 field accuracy. Findings: `docs/superpowers/specs/2026-04-26-fte-extraction-findings.md`. Next: Phase 2d-bundle (asset extraction) — separate plan; Phase 2e MVDSV+KTX after.
```

- [ ] **Step 2: Create new memory entry**

Create `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/project_fte_phase2d.md`:

```markdown
---
name: FTE Phase 2d-core shipped
description: FTE Layer 1 extraction core (cvars/commands/macros/cmdline) shipped 2026-04-26 at build-<N>; ezhud plugin in scope; bundle remaining
type: project
---

FTE Layer 1 extraction Phase 2d-core shipped 2026-04-26 at FTE build-<N> (SHA <SHORT_SHA>):
- <X> cvars (engine ~<a>, plugin:ezhud ~<b>) + <X> commands + <X> macros + <X> cmdline_params loaded into knowledge.db
- Schema v11 with additive source_root TEXT column on cvar/command/macro version tables (NULL = "engine" backwards compat)
- 4-variant clang matrix: client/server/win/client_vk (no Apple — 0 Apple-gated cvars in FTE; no Q2/Q3/H2 — Option B QW-only scope; no software/D3D — renderer scope GL+VK only)
- ezhud is the only plugin in scope; allowlist supports future plugins via single-line addition to SOURCE_ROOTS
- Pre-libclang regex-based prototype (cvars.ts) and validation script (cvars-check.py) retired

**Why:** FTE is a known consumer of slipgate config conversion (web FTE player on hub.quakeworld.nu); needed for cross-engine config translation alongside ezQuake/QWCL.

**How to apply:** When working on slipgate's FTE-side config converter, the build-snapshot CLI will emit `apps/slipgate-app/src/lib/config/data/fte-variables.json` with source_root field per row; UI can render plugin:ezhud cvars distinctly.

**Open follow-ups:** Phase 2d-bundle (asset extraction) — separate plan to be written after this one ships. Quarterly cadence for FTE snapshot updates (manual; Phase 2h automation deferred).
```

- [ ] **Step 3: Update MEMORY.md index**

In `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md`, add this line in alphabetical/topical order (near other project_* entries):

```markdown
- [FTE Phase 2d-core shipped](project_fte_phase2d.md) — FTE Layer 1 cvars/commands/macros/cmdline loaded; schema v11 source_root field; ezhud plugin scope
```

Also update the top-line "Latest arc shipped" pointer to mention FTE Phase 2d-core.

- [ ] **Step 4: Update project_realignment_roadmap.md**

Append a new updated-date line referencing FTE Phase 2d-core completion.

- [ ] **Step 5: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add HANDOVER.md
git commit -m "docs: HANDOVER + memory — FTE Phase 2d-core shipped"
```

(Memory files are outside the repo; their changes are already saved by the writes above.)

---

## Self-Review

**1. Spec coverage:**
- ✓ Locked scope decisions (Task 2 + 3 + 10): schema, project allowlist, clang variants, project gates
- ✓ File layout (Tasks 4-9): driver + 5 handlers + seed YAML
- ✓ Source-root concept (Tasks 4 + 5 + loader 11): SOURCE_ROOTS list + per-row tagging + DB column
- ✓ Variant matrix (Task 3): 4 variants in clang_config
- ✓ Handler responsibilities (Tasks 5-9): all 5 spec'd handlers covered
- ✓ Loader & schema (Tasks 2 + 10 + 11): v11 migration + project gates + source_root passthrough
- ✓ Versioning & cadence (Task 1 + 12): autobuild number capture + single head load
- ✓ Validation (Tasks 13 + 14 + 15): Pass 1 cvarlist diff + Pass 2 field accuracy + Pass 3 source_root sanity
- ✓ Quality grid integration (Task 16)
- ✓ Cleanup (Task 17): retire prototype files
- ✓ Findings doc (Task 18)
- ✓ HANDOVER + memory (Task 19)
- Phase 2d-bundle (asset extraction) explicitly out of scope → separate plan, called out at top of plan + in Task 19's followups list.

**2. Placeholder scan:**
- `<SHA>` and `<N>` placeholders in Task 12 + 18 — these are intentional reference to Task 1's locked values; user replaces them when executing.
- `<X>` in Task 18 is the same — gets filled with real counts when the findings doc is written.
- `<a>` / `<b>` in Task 19 same pattern.
- All other steps have concrete code, exact paths, exact commands.

**3. Type consistency:**
- `source_root` field name used consistently across schema, handlers, loader.
- `current_source_root` attr name used consistently across handlers (set by driver before walk).
- Handler class names: `CvarsFteHandler`, `CommandsFteHandler`, `MacrosFteHandler`, `CmdlineFteHandler`, `EzhudFteHandler` — consistent suffix convention.
- `output_top_key` attribute used consistently for finalize step.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-26-fte-layer1-extraction-2d-core.md`.

Two execution options:

**1. Subagent-Driven (recommended for plans of this length).** I dispatch a fresh subagent per task, review between tasks, fast iteration. Good fit for this plan because tasks 5-9 (handlers) are largely independent within their layer.

**2. Inline Execution.** Execute tasks in this session using executing-plans, batch execution with checkpoints. Good fit if you want to watch each handler land in real time.

Which approach?
