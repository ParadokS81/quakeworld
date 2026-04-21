# Oracle Source-Extraction Paths - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land three in-pass source-extraction capabilities - parameterized-path extraction, reserved-subdirs catalog, and asset-bundle coverage fill - against the existing ezQuake libclang extractor, without touching the oracle schema.

**Architecture:** All work extends `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py` and its downstream bundle assembly in `apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts`. New extractor fields travel through the bundle for downstream consumers (slipgate, MCP) but do not change `asset_loader_sites` DB columns (format template continues to live in `path_literal` as today; parameter metadata rides in new optional bundle fields that the DB loader ignores). Path 2's reserved-subdirs catalog is emitted as a derived JSON section of the bundle, not a new SQL table. Path 3 is coverage extension (seed YAML + extractor watchlist entries).

**Tech Stack:** Python 3 + libclang 18 for the extractor. TypeScript + Node (tsx) for build-asset-bundle. Bun test for TypeScript unit tests. Extractor verification uses hand-rolled fixture drivers (no pytest — the project has no Python test infrastructure and this plan does not introduce one).

**Constraints (from frame spec `2026-04-21-layer1-identity-model-design.md`):**
- No schema migration. All outputs emit into existing `asset_*` tables or the bundle JSON.
- No artifact parsing (BSP / progs / pak / WAD / MDL / SPR stay roadmapped).
- No multi-engine work (FTE / MVDSV / KTX remain on their own track).
- No slipgate code changes (slipgate consumes the regenerated bundle shape downstream).

**HANDOVER findings this plan closes:**
- Path 1 + Path 3: `ezquake asset-bundle gaps surfaced by slipgate quake-dir inventory` (Gap B + Gap C).
- Path 1: `Asset reference-resolution graph - research foundation` - closes Capability A.
- Path 2: same handover entry - closes Capability D.
- Path 3: `ezquake asset-bundle gaps` Gap B (.png/.jpg path_hints) + Gap C (9 loader families).

---

## File structure

| File | Responsibility | Change kind |
|---|---|---|
| `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py` | Main libclang walker. Owns loader-function watchlist, category heuristics, arg classification. | Modify (Path 1 + Path 3). |
| `packages/qw-config/scripts/tests/test_parameterized_paths.py` | Fixture-driven verification for Path 1 classifier helpers. Runs directly via `python3`; no pytest. | Create. |
| `packages/qw-config/scripts/tests/fixtures/param_paths/*.c` | Minimal C source fixtures each exercising one parameterized-path shape. | Create. |
| `packages/qw-config/scripts/derive-reserved-subdirs.ts` | Path 2 derivation - reads loader-sites AST JSON, emits reserved-subdirs JSON. | Create. |
| `packages/qw-config/src/data/ezquake-reserved-subdirs.json` | Derived output (versioned). | Create. |
| `packages/qw-config/seeds/ezquake-asset-extensions.yaml` | Extension -> category map with path_hints. | Modify (Path 3). |
| `packages/qw-config/seeds/ezquake-asset-categories.yaml` | Asset category entity list. | Modify (Path 3). |
| `packages/qw-config/tests/reserved-subdirs.test.ts` | Bun test for derivation logic. | Create. |
| `packages/qw-config/tests/asset-bundle-shape.test.ts` | Bun test asserting the regenerated bundle carries Path 1 + Path 2 + Path 3 outputs. | Create. |
| `apps/qw-oracle/scripts/load-knowledge/types.ts` | TypeScript types for bundle + loader-site rows. | Modify - add optional pass-through fields (Path 1) and `reserved_subdirs` bundle section (Path 2). |
| `apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts` | Bundle assembly. | Modify - pass Path 1 fields through; merge Path 2 derived JSON; Path 3 rides on seed changes only. |
| `apps/qw-oracle/scripts/load-knowledge/load-assets.ts` | DB loader. | No changes required - new fields arrive optional and are ignored when writing `asset_loader_sites`. Confirm via test. |
| `packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json` | Extractor output (versioned). | Regenerated (Path 1 + Path 3). |
| `packages/qw-config/src/data/ezquake-asset-bundle.json` | Bundle output (versioned). | Regenerated (Paths 1-3). |
| `HANDOVER.md` | Session handover log. | Modify - strike through closed items. |

---

## Path 1: Parameterized-path extraction

**What:** Teach the libclang walker to recognise `sprintf` / `va` / `snprintf` / `Q_snprintfz` / `strlcpy` / concat-style constructions feeding loader calls, and emit structured template + parameter metadata alongside the existing `path_literal`.

**Status today:** `va("fmt", ...)` is partially captured - the format string lands in `path_literal` when `path_source == 'computed'`. There is no structured parameter-source data, and `sprintf` / `snprintf` / `Q_snprintfz` / concat sites are not recognised.

**Output shape (new fields on each loader_site row in the AST JSON + bundle):**
```
path_template       string | null   # format template, e.g. "maps/%s.lit"
path_parameters     [{slot, expression_snippet, semantic}]   # one per % conversion
path_extension      string | null   # ".lit", derived from template suffix
format_function     string | null   # "va" | "sprintf" | "snprintf" | "Q_snprintfz" | "strlcpy" | "concat"
```

**Semantic ontology for `path_parameters[*].semantic`:**
- `current_map_name` - arg resolves to `cl.worldmodel->name` / `cl.mapname` / `host_mapname` / similar.
- `cvar_value:<cvar_name>` - arg reads `<cvar>.string`.
- `precached_model_name` - arg is a precache index or `cl.model_name[...]`.
- `function_parameter` - arg is a parameter of the enclosing function (slipgate / caller context infers further).
- `local_variable` - arg is a local, not resolvable further.
- `unknown` - anything else.

---

### Task 1.1: Extend LoaderSite dataclass with parameterized-path fields

**Files:**
- Modify: `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py:193-208` (dataclass LoaderSite)
- Create: `packages/qw-config/scripts/tests/test_parameterized_paths.py`
- Create: `packages/qw-config/scripts/tests/fixtures/param_paths/01_va_basic.c`

- [ ] **Step 1: Create fixture file for basic va() case**

Create `packages/qw-config/scripts/tests/fixtures/param_paths/01_va_basic.c`:

```c
#include <stddef.h>
typedef struct { char *name; } model_t;
typedef struct { model_t *worldmodel; } client_t;
extern client_t cl;
char *va(const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void Mod_LoadLighting(void) {
    void *buf = FS_LoadFile(va("maps/%s.lit", cl.worldmodel->name), 0);
    (void)buf;
}
```

- [ ] **Step 2: Write failing test asserting LoaderSite carries the new fields**

Create `packages/qw-config/scripts/tests/test_parameterized_paths.py`:

```python
#!/usr/bin/env python3
"""Fixture-driven verification for Path 1 parameterized-path extraction.

Run directly: python3 packages/qw-config/scripts/tests/test_parameterized_paths.py
Exit 0 = all pass. Exit 1 = first failure printed.
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPTS_DIR = HERE.parent
sys.path.insert(0, str(SCRIPTS_DIR))

FIXTURE_DIR = HERE / "fixtures" / "param_paths"

# Import the extractor as a module. The script file has no .py package marker
# but we can exec-load the helpers we need. Prefer a direct import via runpy.
import runpy

_EXTRACTOR_SCRIPT = SCRIPTS_DIR / "extract-ezquake-asset-loader-sites-clang.py"


def _load_extractor_ns():
    # Load without triggering main(): runpy.run_path runs top-level only if
    # __name__ == "__main__". The extractor's main() is guarded, so this
    # exposes module-level symbols without scanning ezQuake.
    return runpy.run_path(str(_EXTRACTOR_SCRIPT), run_name="not_main")


def _extract_sites(c_path: Path):
    ns = _load_extractor_ns()
    return ns["extract_from_file"](c_path, [])


def test_va_basic_emits_template_and_parameters():
    sites = _extract_sites(FIXTURE_DIR / "01_va_basic.c")
    loaders = [s for s in sites if s.function_name == "FS_LoadFile"]
    assert len(loaders) == 1, f"expected 1 FS_LoadFile site, got {len(loaders)}"
    s = loaders[0]
    assert s.path_template == "maps/%s.lit", f"path_template={s.path_template!r}"
    assert s.path_extension == ".lit", f"path_extension={s.path_extension!r}"
    assert s.format_function == "va", f"format_function={s.format_function!r}"
    assert s.path_parameters == [
        {"slot": 0, "expression_snippet": "cl.worldmodel->name", "semantic": "current_map_name"}
    ], f"path_parameters={s.path_parameters!r}"


if __name__ == "__main__":
    tests = [fn for name, fn in globals().items() if name.startswith("test_")]
    failed = 0
    for fn in tests:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except AssertionError as e:
            print(f"FAIL {fn.__name__}: {e}")
            failed += 1
    sys.exit(0 if failed == 0 else 1)
```

- [ ] **Step 3: Run test - expect failure (fields don't exist yet)**

Run: `python3 packages/qw-config/scripts/tests/test_parameterized_paths.py`
Expected: `FAIL test_va_basic_emits_template_and_parameters: 'LoaderSite' object has no attribute 'path_template'` (or similar AttributeError).

- [ ] **Step 4: Extend LoaderSite dataclass**

In `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py`, modify the `LoaderSite` dataclass (around lines 193-208) to add the four new fields with `None` defaults:

```python
@dataclass
class LoaderSite:
    canonical_id: str
    function_name: str
    source_file: str
    source_line: int
    source_column: int
    enclosing_function: Optional[str]
    reads_category_id: Optional[str]
    load_trigger: str
    path_source: str
    path_literal: Optional[str]
    path_cvar_id: Optional[str]
    confidence: str
    dev_only: int
    notes: Optional[str] = None
    # Path 1 additions.
    path_template: Optional[str] = None
    path_parameters: Optional[list] = None   # list[dict[str, str]] or None
    path_extension: Optional[str] = None
    format_function: Optional[str] = None
```

JSON output uses `s.__dict__` (see `main()` around line 604), so the new fields serialise automatically once populated.

- [ ] **Step 5: Run test - expect failure progresses (fields exist but are None)**

Run: `python3 packages/qw-config/scripts/tests/test_parameterized_paths.py`
Expected: `FAIL test_va_basic_emits_template_and_parameters: path_template=None` - the fields exist now but nothing populates them. That's the next task.

- [ ] **Step 6: Commit**

```bash
git add packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py \
        packages/qw-config/scripts/tests/test_parameterized_paths.py \
        packages/qw-config/scripts/tests/fixtures/param_paths/01_va_basic.c
git commit -m "feat(qw-config): scaffold parameterized-path fields on LoaderSite dataclass"
```

---

### Task 1.2: Implement format-template classifier for va() sites

**Files:**
- Modify: `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py` (extend `_classify_first_arg` + add `_classify_parameterized_call`)

- [ ] **Step 1: Add helper that classifies a va()/sprintf-family call and extracts template + arg expressions**

Insert before `_classify_first_arg` (around line 328):

```python
FORMAT_FUNCTIONS: dict[str, int] = {
    # function_name -> index of the format-string argument
    "va":          0,
    "sprintf":     1,   # sprintf(buf, fmt, ...)
    "snprintf":    2,   # snprintf(buf, size, fmt, ...)
    "Q_snprintfz": 2,   # ezQuake's bounded snprintf wrapper
}

def _conversion_slots(fmt: str) -> list[str]:
    """Return the %-conversion specifiers in fmt, in order. Skips '%%'.
    Example: 'maps/%s_%d.tga' -> ['%s', '%d']."""
    out: list[str] = []
    i = 0
    while i < len(fmt):
        if fmt[i] != '%':
            i += 1
            continue
        if i + 1 < len(fmt) and fmt[i + 1] == '%':
            i += 2
            continue
        # Walk flags / width / precision / length to the conversion char.
        j = i + 1
        while j < len(fmt) and fmt[j] in "-+ #0123456789.*hljztL":
            j += 1
        if j < len(fmt):
            out.append(fmt[i:j + 1])
        i = j + 1
    return out


def _extract_expression_snippet(cursor, source_bytes: bytes) -> str:
    """Readable single-line snippet of a cursor's source extent."""
    text = read_extent_text(source_bytes, cursor.extent).strip()
    # Collapse whitespace and strip enclosing parens we don't need.
    text = " ".join(text.split())
    return text


def _extension_from_template(tpl: str) -> Optional[str]:
    """If the template ends in '.<ext>' (after the last % or literal segment),
    return '.<ext>'. If the template ends with '%s' or has no literal suffix,
    return None. Only extensions whose entire text is literal count."""
    if not tpl:
        return None
    # Find the rightmost '.' and ensure everything after it is literal (no %).
    dot = tpl.rfind('.')
    if dot < 0:
        return None
    suffix = tpl[dot:]
    if '%' in suffix:
        return None
    return suffix


def _classify_parameterized_call(call_cursor, source_bytes: bytes) -> Optional[tuple[str, list[dict], Optional[str], str]]:
    """If call_cursor is a format-family call (va/sprintf/snprintf/Q_snprintfz),
    return (template, parameters, extension, format_function). Else None.

    parameters is a list[{slot, expression_snippet, semantic}], one per %
    conversion. semantic is filled by _resolve_semantic; default 'unknown'."""
    if call_cursor.kind != CursorKind.CALL_EXPR:
        return None
    fn = call_cursor.spelling
    if fn not in FORMAT_FUNCTIONS:
        return None
    fmt_idx = FORMAT_FUNCTIONS[fn]
    args = list(call_cursor.get_arguments())
    if len(args) <= fmt_idx:
        return None

    # Extract format literal.
    fmt_cursor = args[fmt_idx]
    lit_node = fmt_cursor
    for _ in range(4):
        if lit_node.kind == CursorKind.STRING_LITERAL:
            break
        ch = list(lit_node.get_children())
        if not ch:
            return None
        lit_node = ch[0]
    if lit_node.kind != CursorKind.STRING_LITERAL:
        return None
    template = strip_quotes(read_extent_text(source_bytes, lit_node.extent).strip())

    # Parameter slots -> variadic args after the format string.
    slots = _conversion_slots(template)
    variadic = args[fmt_idx + 1: fmt_idx + 1 + len(slots)]
    parameters: list[dict] = []
    for i, (_spec, arg) in enumerate(zip(slots, variadic)):
        snippet = _extract_expression_snippet(arg, source_bytes)
        parameters.append({
            "slot": i,
            "expression_snippet": snippet,
            "semantic": _resolve_semantic(arg, snippet),
        })

    extension = _extension_from_template(template)
    return template, parameters, extension, fn


def _resolve_semantic(arg_cursor, snippet: str) -> str:
    """Best-effort classification of a format-call argument expression into
    the Path 1 semantic ontology. Returns a string."""
    # cvar value: member access to '.string' where base is a cvar_t.
    cvar = _resolve_cvar_ref(arg_cursor)
    if cvar:
        return f"cvar_value:{cvar}"
    # Known map-name accessors. Snippet-based match is reliable here because
    # ezQuake consistently names these fields.
    map_accessors = (
        "cl.worldmodel->name",
        "cl.mapname",
        "host_mapname",
        "mod->name",
    )
    if snippet in map_accessors or snippet.endswith("->name") and "worldmodel" in snippet:
        return "current_map_name"
    # Precache-index-style patterns.
    if "precache" in snippet.lower() or "cl.model_name" in snippet or "cl.sound_name" in snippet:
        return "precached_model_name"
    # Crude fallbacks.
    if snippet.isidentifier():
        return "local_variable"
    return "unknown"
```

- [ ] **Step 2: Wire the classifier into `_classify_first_arg`**

Modify `_classify_first_arg` (around lines 328-356) so that when it detects a CALL_EXPR, it calls `_classify_parameterized_call` and returns the richer tuple. Change return signature from `(path_source, path_literal, cvar_ident)` to `(path_source, path_literal, cvar_ident, parameterization)` where `parameterization` is the tuple from the new helper or None.

```python
def _classify_first_arg(arg_cursor, source_bytes: bytes):
    """Return (path_source, path_literal, cvar_ident, parameterization).
    parameterization is (template, parameters, extension, format_function) or None."""
    node = arg_cursor
    for _ in range(4):
        if node.kind in (CursorKind.STRING_LITERAL, CursorKind.MEMBER_REF_EXPR, CursorKind.CALL_EXPR, CursorKind.DECL_REF_EXPR):
            break
        ch = list(node.get_children())
        if not ch:
            break
        node = ch[0]

    if node.kind == CursorKind.STRING_LITERAL:
        lit = strip_quotes(read_extent_text(source_bytes, node.extent).strip())
        return "literal", lit, None, None

    cvar_ident = _resolve_cvar_ref(arg_cursor)
    if cvar_ident:
        return "cvar", None, cvar_ident, None

    if node.kind == CursorKind.CALL_EXPR:
        param = _classify_parameterized_call(node, source_bytes)
        if param is not None:
            template, _, _, _ = param
            # path_literal retains the template for DB back-compat; new fields
            # carry the structured data.
            return "computed", template, None, param
        return "computed", None, None, None

    return "unknown", None, None, None
```

- [ ] **Step 3: Use the parameterization tuple in the call-site visitor**

In `extract_from_file` -> `walk` -> `visit`, the tuple is unpacked from `_classify_first_arg`. Update the unpacking + LoaderSite construction (around lines 410-465):

```python
if args:
    path_source, path_literal, cvar_ident, parameterization = _classify_first_arg(args[0], source_bytes)
else:
    path_source, path_literal, cvar_ident, parameterization = ("unknown", None, None, None)

# ... existing confidence/category/trigger logic unchanged ...

path_template = None
path_parameters = None
path_extension = None
format_function = None
if parameterization is not None:
    path_template, path_parameters, path_extension, format_function = parameterization

collected.append(LoaderSite(
    # ... existing fields unchanged ...
    path_template=path_template,
    path_parameters=path_parameters,
    path_extension=path_extension,
    format_function=format_function,
))
```

- [ ] **Step 4: Run fixture test - expect pass**

Run: `python3 packages/qw-config/scripts/tests/test_parameterized_paths.py`
Expected: `PASS test_va_basic_emits_template_and_parameters`.

- [ ] **Step 5: Commit**

```bash
git add packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py
git commit -m "feat(qw-config): classify va() format-call args as structured template + parameters"
```

---

### Task 1.3: Cover sprintf / snprintf / Q_snprintfz format families

**Files:**
- Create: `packages/qw-config/scripts/tests/fixtures/param_paths/02_sprintf.c`
- Create: `packages/qw-config/scripts/tests/fixtures/param_paths/03_snprintf.c`
- Create: `packages/qw-config/scripts/tests/fixtures/param_paths/04_q_snprintfz.c`
- Modify: `packages/qw-config/scripts/tests/test_parameterized_paths.py`

**Note on mechanism:** These format families write into a local buffer that is then passed to the loader. The buffer is a DECL_REF_EXPR, not a CALL_EXPR, so the current visitor misses them. The minimal-sufficient approach: when the loader-call's first arg is a DECL_REF_EXPR, look backward within the same `COMPOUND_STMT` for the most recent write into that variable via a format family; if found, synthesize the same `parameterization` tuple.

- [ ] **Step 1: Add three fixtures covering each format family**

`02_sprintf.c`:

```c
#include <stddef.h>
typedef struct { char *name; } model_t;
typedef struct { model_t *worldmodel; } client_t;
extern client_t cl;
int sprintf(char *s, const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void R_LoadSkybox_Sprintf(const char *basename) {
    char path[128];
    sprintf(path, "env/%s_ft.tga", basename);
    FS_LoadFile(path, 0);
}
```

`03_snprintf.c`:

```c
#include <stddef.h>
int snprintf(char *s, unsigned long n, const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void TP_LoadLocFile_Snprintf(const char *mapname) {
    char path[256];
    snprintf(path, sizeof(path), "locs/%s.loc", mapname);
    FS_LoadFile(path, 0);
}
```

`04_q_snprintfz.c`:

```c
#include <stddef.h>
void Q_snprintfz(char *buf, unsigned long size, const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void LoadProgs_QSnprintfz(const char *modname) {
    char path[64];
    Q_snprintfz(path, 64, "progs/%s.dat", modname);
    FS_LoadFile(path, 0);
}
```

- [ ] **Step 2: Add failing assertions to the test driver**

Append to `packages/qw-config/scripts/tests/test_parameterized_paths.py`:

```python
def test_sprintf_writes_buffer_then_loader_reads_it():
    sites = _extract_sites(FIXTURE_DIR / "02_sprintf.c")
    loaders = [s for s in sites if s.function_name == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s.path_template == "env/%s_ft.tga"
    assert s.path_extension == ".tga"
    assert s.format_function == "sprintf"
    assert s.path_parameters and s.path_parameters[0]["slot"] == 0


def test_snprintf_writes_buffer_then_loader_reads_it():
    sites = _extract_sites(FIXTURE_DIR / "03_snprintf.c")
    loaders = [s for s in sites if s.function_name == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s.path_template == "locs/%s.loc"
    assert s.path_extension == ".loc"
    assert s.format_function == "snprintf"


def test_q_snprintfz_writes_buffer_then_loader_reads_it():
    sites = _extract_sites(FIXTURE_DIR / "04_q_snprintfz.c")
    loaders = [s for s in sites if s.function_name == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s.path_template == "progs/%s.dat"
    assert s.path_extension == ".dat"
    assert s.format_function == "Q_snprintfz"
```

- [ ] **Step 3: Run tests - expect three failures**

Run: `python3 packages/qw-config/scripts/tests/test_parameterized_paths.py`
Expected: `FAIL test_sprintf_writes_buffer_then_loader_reads_it`, `FAIL test_snprintf_...`, `FAIL test_q_snprintfz_...`. The va test still passes.

- [ ] **Step 4: Implement backward lookup for format-family writes into a buffer**

Add to `extract-ezquake-asset-loader-sites-clang.py`:

```python
def _find_enclosing_compound(cursor):
    """Walk up the parse tree to the closest COMPOUND_STMT ancestor."""
    p = cursor.semantic_parent
    while p is not None:
        if p.kind == CursorKind.COMPOUND_STMT:
            return p
        p = p.semantic_parent
    return None


def _lookup_buffer_write_in_compound(compound, var_name: str, before_line: int,
                                      before_col: int, source_bytes: bytes):
    """Scan compound for the nearest format-family CALL_EXPR whose first arg
    is a DECL_REF_EXPR to var_name, occurring strictly before (before_line,
    before_col). Return the parameterization tuple or None."""
    best = None
    best_pos = (-1, -1)
    def visit(node):
        nonlocal best, best_pos
        if node.kind == CursorKind.CALL_EXPR and node.spelling in FORMAT_FUNCTIONS:
            args = list(node.get_arguments())
            if args:
                buf = args[0]
                # Drill through wrappers.
                n = buf
                for _ in range(4):
                    if n.kind == CursorKind.DECL_REF_EXPR:
                        break
                    ch = list(n.get_children())
                    if not ch:
                        break
                    n = ch[0]
                if n.kind == CursorKind.DECL_REF_EXPR and n.spelling == var_name:
                    pos = (node.location.line, node.location.column)
                    if pos < (before_line, before_col) and pos > best_pos:
                        param = _classify_parameterized_call(node, source_bytes)
                        if param is not None:
                            best = param
                            best_pos = pos
        for c in node.get_children():
            visit(c)
    visit(compound)
    return best
```

Then extend `_classify_first_arg` to handle the DECL_REF_EXPR case:

```python
    # ... after the existing CALL_EXPR branch ...

    if node.kind == CursorKind.DECL_REF_EXPR:
        compound = _find_enclosing_compound(arg_cursor)
        if compound is not None:
            loc = arg_cursor.location
            param = _lookup_buffer_write_in_compound(
                compound, node.spelling, loc.line, loc.column, source_bytes,
            )
            if param is not None:
                template = param[0]
                return "computed", template, None, param
        # Fall through to "unknown" if no backward write found.

    return "unknown", None, None, None
```

- [ ] **Step 5: Run tests - expect all four pass**

Run: `python3 packages/qw-config/scripts/tests/test_parameterized_paths.py`
Expected: `PASS` on all four tests.

- [ ] **Step 6: Commit**

```bash
git add packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py \
        packages/qw-config/scripts/tests/test_parameterized_paths.py \
        packages/qw-config/scripts/tests/fixtures/param_paths/
git commit -m "feat(qw-config): recognise sprintf/snprintf/Q_snprintfz buffer writes feeding loader calls"
```

---

### Task 1.4: Parameter-semantic ontology coverage

**Files:**
- Create: `packages/qw-config/scripts/tests/fixtures/param_paths/05_cvar_value.c`
- Create: `packages/qw-config/scripts/tests/fixtures/param_paths/06_multi_slot.c`
- Modify: `packages/qw-config/scripts/tests/test_parameterized_paths.py`

- [ ] **Step 1: Add fixtures exercising cvar_value and multi-slot templates**

`05_cvar_value.c`:

```c
#include <stddef.h>
typedef struct cvar_s { char *string; } cvar_t;
extern cvar_t baseskin;
char *va(const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void Skin_Load_Cvar(void) {
    FS_LoadFile(va("skins/%s.pcx", baseskin.string), 0);
}
```

`06_multi_slot.c`:

```c
#include <stddef.h>
typedef struct { char *name; } model_t;
typedef struct { model_t *worldmodel; } client_t;
extern client_t cl;
char *va(const char *fmt, ...);
void *FS_LoadFile(const char *path, int quiet);

void LoadSkyboxFace(const char *face) {
    FS_LoadFile(va("env/%s_%s.tga", cl.worldmodel->name, face), 0);
}
```

- [ ] **Step 2: Add failing assertions**

```python
def test_cvar_value_semantic_detected():
    sites = _extract_sites(FIXTURE_DIR / "05_cvar_value.c")
    loaders = [s for s in sites if s.function_name == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s.path_parameters == [
        {"slot": 0, "expression_snippet": "baseskin.string", "semantic": "cvar_value:baseskin"},
    ]


def test_multi_slot_templates_report_each_slot():
    sites = _extract_sites(FIXTURE_DIR / "06_multi_slot.c")
    loaders = [s for s in sites if s.function_name == "FS_LoadFile"]
    assert len(loaders) == 1
    s = loaders[0]
    assert s.path_template == "env/%s_%s.tga"
    assert len(s.path_parameters) == 2
    assert s.path_parameters[0]["semantic"] == "current_map_name"
    assert s.path_parameters[1]["semantic"] in ("function_parameter", "local_variable", "unknown")
```

- [ ] **Step 3: Run tests - verify cvar_value passes (already works via `_resolve_cvar_ref`) and multi-slot passes with current classifier**

Run: `python3 packages/qw-config/scripts/tests/test_parameterized_paths.py`
Expected: both new tests pass. If multi-slot's slot 1 semantic comes back `unknown` that is acceptable per the assertion's `in (...)` tuple.

- [ ] **Step 4: If failure, refine `_resolve_semantic`**

If either test fails, tighten `_resolve_semantic` in `extract-ezquake-asset-loader-sites-clang.py`. Keep changes scoped to that helper - do not touch the extraction walker. Re-run tests until green.

- [ ] **Step 5: Commit**

```bash
git add packages/qw-config/scripts/tests/
git commit -m "test(qw-config): cover cvar_value and multi-slot parameter semantics"
```

---

### Task 1.5: Pass Path 1 fields through the TypeScript bundle

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/types.ts:454-473` (AssetLoaderSiteRow)
- Modify: `apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts:91-106` (AutoLoaderSite) and bundle assembly around lines 343-362
- Create: `packages/qw-config/tests/asset-bundle-shape.test.ts`

- [ ] **Step 1: Write failing bun test asserting parameterized fields appear in bundle output**

Create `packages/qw-config/tests/asset-bundle-shape.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const BUNDLE_PATH = resolve(REPO_ROOT, "packages/qw-config/src/data/ezquake-asset-bundle.json");

describe("ezquake-asset-bundle.json shape (Path 1)", () => {
  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));

  test("every loader site row has parameterized-path fields declared (may be null)", () => {
    const sites = bundle.asset_loader_sites;
    expect(Array.isArray(sites)).toBe(true);
    expect(sites.length).toBeGreaterThan(100);
    for (const s of sites) {
      expect(s).toHaveProperty("path_template");
      expect(s).toHaveProperty("path_parameters");
      expect(s).toHaveProperty("path_extension");
      expect(s).toHaveProperty("format_function");
    }
  });

  test("at least 20 computed-path sites carry a non-null path_template", () => {
    const sites = bundle.asset_loader_sites;
    const withTemplate = sites.filter((s: any) => s.path_template !== null);
    expect(withTemplate.length).toBeGreaterThanOrEqual(20);
  });

  test("bsp-companion template maps/%s.lit is present", () => {
    const sites = bundle.asset_loader_sites;
    const lit = sites.find((s: any) => s.path_template === "maps/%s.lit");
    expect(lit).toBeDefined();
    expect(lit.path_extension).toBe(".lit");
  });
});
```

- [ ] **Step 2: Run bun test - expect failure (fields not in bundle yet)**

Run: `cd packages/qw-config && bun test tests/asset-bundle-shape.test.ts`
Expected: `test every loader site row has parameterized-path fields declared` fails because the shipped `ezquake-asset-bundle.json` does not carry those keys yet.

- [ ] **Step 3: Extend TypeScript AssetLoaderSiteRow with optional fields**

Modify `apps/qw-oracle/scripts/load-knowledge/types.ts` around line 470 - append before `raw_ast_hash`:

```typescript
export interface AssetLoaderSiteRow {
  project: Project;
  version: string;
  canonical_id: string;
  function_name: string;
  source_file: string;
  source_line: number;
  source_column: number | null;
  enclosing_function: string | null;
  reads_category_id: string | null;
  load_trigger: AssetLoadTrigger;
  path_source: AssetLoaderSitePathSource;
  path_literal: string | null;
  path_cvar_id: string | null;
  confidence: AssetLoaderSiteConfidence;
  dev_only: number;
  notes: string | null;
  // Path 1 additions. Optional so DB loader can ignore cleanly; bundle
  // carries them verbatim for downstream consumers.
  path_template?: string | null;
  path_parameters?: Array<{ slot: number; expression_snippet: string; semantic: string }> | null;
  path_extension?: string | null;
  format_function?: string | null;
  raw_ast_hash: string | null;
  extracted_at: string;
}
```

- [ ] **Step 4: Pass fields through the bundle builder**

Modify `apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts`:

1. Extend `AutoLoaderSite` (lines 91-106) with matching optional fields.
2. In the `asset_loader_sites` assembly loop (lines 343-362), pass through the new fields:

```typescript
for (const s of loaderSitesDoc.loader_sites) {
  asset_loader_sites.push({
    canonical_id: s.canonical_id,
    function_name: s.function_name,
    source_file: s.source_file,
    source_line: s.source_line,
    source_column: s.source_column,
    enclosing_function: s.enclosing_function,
    reads_category_id: s.reads_category_id,
    load_trigger: s.load_trigger,
    path_source: s.path_source,
    path_literal: s.path_literal,
    path_cvar_id: s.path_cvar_id,
    confidence: s.confidence,
    dev_only: s.dev_only,
    notes: s.notes ?? null,
    path_template: s.path_template ?? null,
    path_parameters: s.path_parameters ?? null,
    path_extension: s.path_extension ?? null,
    format_function: s.format_function ?? null,
    raw_ast_hash: null,
  });
}
```

- [ ] **Step 5: Typecheck passes**

Run: `cd apps/qw-oracle && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Verify load-assets.ts still writes DB rows unchanged**

Read `apps/qw-oracle/scripts/load-knowledge/load-assets.ts:171-208` and confirm: the explicit row construction passes only columns that exist in `asset_loader_sites` schema. No new column is referenced. The optional fields land on the bundle type but never hit the INSERT statement. No code change required in load-assets.ts.

Manual check: run `cd apps/qw-oracle && npm run typecheck`. Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/types.ts \
        apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts \
        packages/qw-config/tests/asset-bundle-shape.test.ts
git commit -m "feat(qw-oracle): pass parameterized-path fields through asset bundle"
```

---

### Task 1.6: Regenerate ezQuake bundle against head and commit artefacts

**Files:**
- Modify (regenerate): `packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json`
- Modify (regenerate): `packages/qw-config/src/data/ezquake-asset-bundle.json`

- [ ] **Step 1: Run the extractor against ezQuake head**

Run:
```bash
cd /home/paradoks/projects/quakeworld
python3 packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py
```

Expected: prints `total sites: NNN` where NNN >= 110 (baseline). `by_path_source` shows `computed` >= 11 (baseline).

- [ ] **Step 2: Rebuild the asset bundle**

Run:
```bash
cd apps/qw-oracle
npm run load-knowledge -- build-asset-bundle --project ezquake --version head
```

If a dedicated `build-asset-bundle` subcommand does not exist yet, invoke via tsx:

```bash
cd /home/paradoks/projects/quakeworld
npx tsx apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts --project ezquake --version head
```

Expected: bundle written to `packages/qw-config/src/data/ezquake-asset-bundle.json` with the new fields populated on computed-path sites.

- [ ] **Step 3: Re-run the bundle-shape tests against the regenerated bundle**

Run: `cd packages/qw-config && bun test tests/asset-bundle-shape.test.ts`
Expected: all tests pass.

- [ ] **Step 4: Sanity-check the regeneration manually**

Run:
```bash
python3 -c "
import json
b = json.load(open('packages/qw-config/src/data/ezquake-asset-bundle.json'))
sites = b['asset_loader_sites']
tpls = [s['path_template'] for s in sites if s.get('path_template')]
print('sites total:', len(sites))
print('sites with template:', len(tpls))
print('unique templates:', len(set(tpls)))
print('sample:', sorted(set(tpls))[:10])
"
```

Expected: `sites with template` > 20; sample includes entries like `maps/%s.bsp`, `gfx/%s`, `textures/charsets/%s`.

- [ ] **Step 5: Commit the regenerated artefacts**

```bash
git add packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json \
        packages/qw-config/src/data/ezquake-asset-bundle.json
git commit -m "chore(qw-config): regenerate ezquake asset bundle with Path 1 parameterized-path fields"
```

---

## Path 2: Reserved-subdirs catalog

**What:** From the extracted loader sites (both literal and parameterized), identify fixed-literal subdir prefixes that the engine unconditionally uses (e.g. `textures/charsets/`, `textures/wad/`, `gfx/`, `env/`, `crosshairs/`). Emit as a derived JSON section so slipgate can disambiguate "engine reserves this dir" from "per-map or community dir."

**Design decision (flagged for user review):** Emit as a side-car JSON (`ezquake-reserved-subdirs.json`) merged into the bundle as a new top-level `reserved_subdirs` section. No SQL schema change. Alternative: a SQLite VIEW over `asset_loader_sites`. The JSON approach matches slipgate's current bundle-only consumption; the VIEW approach matches the spec's "derived table" language. Pick JSON unless the user says otherwise.

**Derivation rule:** for each loader_site row with `path_literal` or `path_template` of the form `<parent>/<literal-segment>/<remainder>` (where the first two segments are pure-literal and `<literal-segment>` is not itself a format specifier), emit a reserved-subdir entry keyed by `<parent>/<literal-segment>`.

---

### Task 2.1: Derivation logic + fixtures

**Files:**
- Create: `packages/qw-config/scripts/derive-reserved-subdirs.ts`
- Create: `packages/qw-config/tests/reserved-subdirs.test.ts`

- [ ] **Step 1: Write failing bun test with fixture loader-site input**

Create `packages/qw-config/tests/reserved-subdirs.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { deriveReservedSubdirs } from "../scripts/derive-reserved-subdirs.js";

const fixtureSites = [
  { canonical_id: "ezquake:loader_site:a_1", path_source: "computed", path_literal: "textures/charsets/%s", path_template: "textures/charsets/%s" },
  { canonical_id: "ezquake:loader_site:a_2", path_source: "computed", path_literal: "textures/wad/%s",       path_template: "textures/wad/%s" },
  { canonical_id: "ezquake:loader_site:a_3", path_source: "computed", path_literal: "textures/%s",            path_template: "textures/%s" },
  { canonical_id: "ezquake:loader_site:a_4", path_source: "computed", path_literal: "gfx/%s",                 path_template: "gfx/%s" },
  { canonical_id: "ezquake:loader_site:a_5", path_source: "literal",  path_literal: "gfx/conback.lmp",        path_template: null },
  { canonical_id: "ezquake:loader_site:a_6", path_source: "computed", path_literal: "maps/%s.bsp",            path_template: "maps/%s.bsp" },
  { canonical_id: "ezquake:loader_site:a_7", path_source: "computed", path_literal: "env/%s_ft.tga",          path_template: "env/%s_ft.tga" },
];

describe("deriveReservedSubdirs", () => {
  test("extracts two-segment reserved subdirs, skips single-segment patterns", () => {
    const out = deriveReservedSubdirs(fixtureSites as any);
    const keys = out.map((r) => `${r.parent_dir}/${r.subdir_name}`).sort();
    expect(keys).toEqual(["textures/charsets", "textures/wad"]);
  });

  test("single-segment templates (textures/%s, gfx/%s, maps/%s.bsp, env/%s_ft.tga) are not reserved", () => {
    const out = deriveReservedSubdirs(fixtureSites as any);
    for (const r of out) {
      expect(r.subdir_name).not.toBe("%s");
    }
  });

  test("each reserved subdir carries loader_site_refs with at least one canonical_id", () => {
    const out = deriveReservedSubdirs(fixtureSites as any);
    for (const r of out) {
      expect(Array.isArray(r.loader_site_refs)).toBe(true);
      expect(r.loader_site_refs.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run bun test - expect module-not-found failure**

Run: `cd packages/qw-config && bun test tests/reserved-subdirs.test.ts`
Expected: fails with "Cannot find module '../scripts/derive-reserved-subdirs.js'".

- [ ] **Step 3: Implement `derive-reserved-subdirs.ts`**

Create `packages/qw-config/scripts/derive-reserved-subdirs.ts`:

```typescript
#!/usr/bin/env tsx
/**
 * Path 2 derivation: scan a loader-sites AST JSON, emit a list of reserved
 * subdirs. A "reserved subdir" is any path prefix of the shape
 *   <parent>/<literal-segment>/<remainder>
 * where <parent> and <literal-segment> are pure literals (no % conversion),
 * drawn from any loader_site's path_literal or path_template.
 */

import { readFileSync, writeFileSync } from "fs";
import { parseArgs } from "util";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

export interface InputLoaderSite {
  canonical_id: string;
  path_source: string;
  path_literal: string | null;
  path_template?: string | null;
}

export interface ReservedSubdir {
  canonical_id: string;         // e.g. "ezquake:reserved_subdir:textures_charsets"
  parent_dir: string;           // "textures"
  subdir_name: string;          // "charsets"
  loader_site_refs: string[];   // canonical_ids of sites where this prefix appears
}

function firstTwoSegments(path: string): [string, string] | null {
  if (!path) return null;
  const parts = path.split("/");
  if (parts.length < 2) return null;
  const p0 = parts[0];
  const p1 = parts[1];
  if (!p0 || !p1) return null;
  if (p0.includes("%") || p1.includes("%")) return null;
  // Must be "<parent>/<sub>/<something>" - reject two-segment filenames like
  // "maps/%s.bsp" where the second segment IS the filename.
  if (parts.length < 3) return null;
  return [p0, p1];
}

export function deriveReservedSubdirs(sites: InputLoaderSite[]): ReservedSubdir[] {
  const byKey = new Map<string, { parent: string; sub: string; refs: Set<string> }>();
  for (const s of sites) {
    const candidates: string[] = [];
    if (s.path_template) candidates.push(s.path_template);
    if (s.path_literal)  candidates.push(s.path_literal);
    for (const p of candidates) {
      const seg = firstTwoSegments(p);
      if (!seg) continue;
      const [parent, sub] = seg;
      const key = `${parent}/${sub}`;
      const rec = byKey.get(key) ?? { parent, sub, refs: new Set<string>() };
      rec.refs.add(s.canonical_id);
      byKey.set(key, rec);
    }
  }
  const out: ReservedSubdir[] = [];
  for (const [, rec] of byKey) {
    out.push({
      canonical_id: `ezquake:reserved_subdir:${rec.parent}_${rec.sub}`,
      parent_dir: rec.parent,
      subdir_name: rec.sub,
      loader_site_refs: [...rec.refs].sort(),
    });
  }
  out.sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
  return out;
}

// CLI entrypoint
async function main(): Promise<void> {
  const HERE = dirname(fileURLToPath(import.meta.url));
  const REPO_ROOT = resolve(HERE, "../../..");
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      input:  { type: "string" },
      output: { type: "string" },
    },
  });
  const input  = values.input  ?? resolve(REPO_ROOT, "packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json");
  const output = values.output ?? resolve(REPO_ROOT, "packages/qw-config/src/data/ezquake-reserved-subdirs.json");

  const raw = JSON.parse(readFileSync(input, "utf-8")) as { loader_sites: InputLoaderSite[] };
  const derived = deriveReservedSubdirs(raw.loader_sites);

  writeFileSync(output, JSON.stringify({ reserved_subdirs: derived }, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${derived.length} reserved_subdirs to ${output}`);
}

const invokedAsScript = (() => {
  try { return fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? ""); } catch { return false; }
})();
if (invokedAsScript) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
```

- [ ] **Step 4: Run bun test - expect pass**

Run: `cd packages/qw-config && bun test tests/reserved-subdirs.test.ts`
Expected: all three tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/qw-config/scripts/derive-reserved-subdirs.ts \
        packages/qw-config/tests/reserved-subdirs.test.ts
git commit -m "feat(qw-config): derive reserved-subdirs catalog from loader-sites AST"
```

---

### Task 2.2: Merge reserved_subdirs into the bundle

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/types.ts` (AssetBundle)
- Modify: `apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts`
- Modify: `packages/qw-config/tests/asset-bundle-shape.test.ts`

- [ ] **Step 1: Add failing bundle-shape test for reserved_subdirs**

Append to `packages/qw-config/tests/asset-bundle-shape.test.ts`:

```typescript
describe("ezquake-asset-bundle.json shape (Path 2)", () => {
  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));

  test("bundle carries a non-empty reserved_subdirs array", () => {
    expect(Array.isArray(bundle.reserved_subdirs)).toBe(true);
    expect(bundle.reserved_subdirs.length).toBeGreaterThanOrEqual(5);
  });

  test("reserved_subdirs includes textures/charsets and textures/wad", () => {
    const keys = bundle.reserved_subdirs.map((r: any) => `${r.parent_dir}/${r.subdir_name}`);
    expect(keys).toContain("textures/charsets");
    expect(keys).toContain("textures/wad");
  });
});
```

- [ ] **Step 2: Run bun test - expect failure (bundle has no reserved_subdirs yet)**

Run: `cd packages/qw-config && bun test tests/asset-bundle-shape.test.ts`
Expected: `test bundle carries a non-empty reserved_subdirs array` fails.

- [ ] **Step 3: Extend AssetBundle type**

In `apps/qw-oracle/scripts/load-knowledge/types.ts` around line 493:

```typescript
export interface ReservedSubdirEntry {
  canonical_id: string;
  parent_dir: string;
  subdir_name: string;
  loader_site_refs: string[];
}

export interface AssetBundle {
  project: Project;
  version: string;
  client_defaults?: ClientDefaults;
  asset_categories: Record<string, AssetCategoryEntry>;
  asset_extensions: Omit<AssetExtensionRow, 'project' | 'version' | 'extracted_at'>[];
  asset_path_rules: Omit<AssetPathRuleRow, 'project' | 'version' | 'extracted_at'>[];
  asset_cvar_bindings: Omit<AssetCvarBindingRow, 'project' | 'version' | 'extracted_at'>[];
  asset_loader_sites: Omit<AssetLoaderSiteRow, 'project' | 'version' | 'extracted_at'>[];
  reserved_subdirs?: ReservedSubdirEntry[];
  _stats?: Record<string, unknown>;
}
```

- [ ] **Step 4: Read reserved-subdirs JSON during bundle assembly**

In `apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts`, after the extension assembly (around line 225) add:

```typescript
  // 2b. Reserved subdirs (Path 2). Optional: warn-and-continue if the
  // derivation output is missing.
  let reserved_subdirs: { canonical_id: string; parent_dir: string; subdir_name: string; loader_site_refs: string[] }[] | undefined;
  const reservedPath = resolve(dataDir, `${options.project}-reserved-subdirs.json`);
  try {
    const doc = JSON.parse(readFileSync(reservedPath, 'utf-8')) as {
      reserved_subdirs: typeof reserved_subdirs;
    };
    reserved_subdirs = doc.reserved_subdirs;
  } catch {
    console.warn(
      `[build-asset-bundle] reserved_subdirs derivation missing (${reservedPath}); bundle will omit the block`,
    );
  }
```

And include in the final bundle object (around line 364):

```typescript
  const bundle: AssetBundle = {
    project: options.project,
    version: options.version,
    ...(clientDefaults ? { client_defaults: clientDefaults } : {}),
    asset_categories,
    asset_extensions,
    asset_path_rules,
    asset_cvar_bindings,
    asset_loader_sites,
    ...(reserved_subdirs ? { reserved_subdirs } : {}),
    _stats: { /* unchanged */ },
  };
```

- [ ] **Step 5: Regenerate reserved-subdirs JSON + bundle**

```bash
cd /home/paradoks/projects/quakeworld
npx tsx packages/qw-config/scripts/derive-reserved-subdirs.ts
npx tsx apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts --project ezquake --version head
```

- [ ] **Step 6: Re-run bundle-shape tests - expect pass**

Run: `cd packages/qw-config && bun test tests/asset-bundle-shape.test.ts`
Expected: all tests including Path 2 assertions pass.

- [ ] **Step 7: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/types.ts \
        apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts \
        packages/qw-config/tests/asset-bundle-shape.test.ts \
        packages/qw-config/src/data/ezquake-reserved-subdirs.json \
        packages/qw-config/src/data/ezquake-asset-bundle.json
git commit -m "feat(qw-oracle): merge reserved-subdirs catalog into asset bundle"
```

---

## Path 3: Asset-bundle coverage fill

**What:** Close the concrete gaps the real-world 14,859-file inventory surfaced: png/jpg path_hint variants matching .tga's coverage, and nine missing loader families (`.log`, `.loc`, `.lit`, `.xml`, `.dat`, `.kmap`, `.spr`, `.qwz`, `.dll`). Mechanism overlaps with Path 1 - most of these loaders are reachable by the extractor walk once watchlisted; the seed YAMLs also need extension + category additions.

**Verification target (from HANDOVER):** the 6252-file "Other" bucket in the real install's inventory drops substantially. Specifically: 2206 `.log` + 1621 `.loc` + 80 `.lit` + 2178 `.xml` = ~6085 files reclassify out of Other.

---

### Task 3.1: Add png/jpg path_hint variants to the extensions seed

**Files:**
- Modify: `packages/qw-config/seeds/ezquake-asset-extensions.yaml`
- Create: `packages/qw-config/tests/asset-extensions-coverage.test.ts`

- [ ] **Step 1: Write failing bun test for png/jpg variant coverage**

Create `packages/qw-config/tests/asset-extensions-coverage.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

const BUNDLE_PATH = resolve(import.meta.dir, "../src/data/ezquake-asset-bundle.json");

describe("asset_extensions path_hint coverage", () => {
  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));
  const byExt = (ext: string) =>
    bundle.asset_extensions.filter((e: any) => e.extension === ext);

  test(".png has all six path_hint variants that .tga has", () => {
    const tga = byExt(".tga").map((e: any) => e.path_hint).sort();
    const png = byExt(".png").map((e: any) => e.path_hint).sort();
    expect(png).toEqual(tga);
  });

  test(".jpg has all six path_hint variants that .tga has", () => {
    const tga = byExt(".tga").map((e: any) => e.path_hint).sort();
    const jpg = byExt(".jpg").map((e: any) => e.path_hint).sort();
    expect(jpg).toEqual(tga);
  });
});
```

- [ ] **Step 2: Run bun test - expect failure**

Run: `cd packages/qw-config && bun test tests/asset-extensions-coverage.test.ts`
Expected: both tests fail - `.png` has 2 variants, `.jpg` has 1, `.tga` has 6.

- [ ] **Step 3: Edit seed YAML to add missing variants**

Modify `packages/qw-config/seeds/ezquake-asset-extensions.yaml` - replace the `.png` and `.jpg` section (lines 55-61) with:

```yaml
  # .png variants mirror .tga's path_hints (same loader call-sites accept both).
  - extension: ".png"
    path_hint: "textures/"
    category: texture
  - extension: ".png"
    path_hint: "skins/"
    category: skin
  - extension: ".png"
    path_hint: "crosshairs/"
    category: crosshair
  - extension: ".png"
    path_hint: "gfx/"
    category: hud_overlay
  - extension: ".png"
    path_hint: "env/"
    category: skybox
  - extension: ".png"
    category: screenshot
  # .jpg variants mirror .tga's path_hints.
  - extension: ".jpg"
    path_hint: "textures/"
    category: texture
  - extension: ".jpg"
    path_hint: "skins/"
    category: skin
  - extension: ".jpg"
    path_hint: "crosshairs/"
    category: crosshair
  - extension: ".jpg"
    path_hint: "gfx/"
    category: hud_overlay
  - extension: ".jpg"
    path_hint: "env/"
    category: skybox
  - extension: ".jpg"
    category: screenshot
```

- [ ] **Step 4: Regenerate bundle**

```bash
cd /home/paradoks/projects/quakeworld
npx tsx apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts --project ezquake --version head
```

- [ ] **Step 5: Run bun test - expect pass**

Run: `cd packages/qw-config && bun test tests/asset-extensions-coverage.test.ts`
Expected: both tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/qw-config/seeds/ezquake-asset-extensions.yaml \
        packages/qw-config/tests/asset-extensions-coverage.test.ts \
        packages/qw-config/src/data/ezquake-asset-bundle.json
git commit -m "feat(qw-config): mirror .tga path_hint coverage for .png and .jpg"
```

---

### Task 3.2: Add asset categories for new loader families

**Files:**
- Modify: `packages/qw-config/seeds/ezquake-asset-categories.yaml`
- Modify: `packages/qw-config/seeds/ezquake-asset-extensions.yaml`

**Categories to add:**

| Category name | Display name | Used for |
|---|---|---|
| `log` | "Log File" | Console + match logs (`.log`) |
| `locfile` | "Location File" | Team-reporting loc files (`.loc`) |
| `map_lighting` | "Map Lighting" | Colored-lighting companions (`.lit`) |
| `help_xml` | "Help Documentation" | Help system XML (`.xml`) |
| `quakec_progs` | "QuakeC Progs" | Compiled QuakeC bytecode (`.dat`) |
| `keymap` | "Keymap File" | Keyboard-layout data (`.kmap`) |
| `sprite` | "Sprite" | Sprite models (`.spr`) - model-kin but precache path differs |
| `demo_archive` | "Demo Archive" | Compressed demo archives (`.qwz`) |
| `plugin` | "Client Plugin" | FTE plugin DLLs (`.dll`) - cross-client presence signal |

- [ ] **Step 1: Write failing bundle-shape assertion for new categories**

Append to `packages/qw-config/tests/asset-extensions-coverage.test.ts`:

```typescript
describe("new loader-family categories + extensions", () => {
  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));

  const expectedCategories = [
    "log", "locfile", "map_lighting", "help_xml", "quakec_progs",
    "keymap", "sprite", "demo_archive", "plugin",
  ];

  for (const c of expectedCategories) {
    test(`asset_category '${c}' exists in bundle`, () => {
      expect(bundle.asset_categories[c]).toBeDefined();
    });
  }

  const expectedExtensionToCategory: Array<[string, string]> = [
    [".log",   "log"],
    [".loc",   "locfile"],
    [".lit",   "map_lighting"],
    [".xml",   "help_xml"],
    [".dat",   "quakec_progs"],
    [".kmap",  "keymap"],
    [".spr",   "sprite"],
    [".qwz",   "demo_archive"],
    [".dll",   "plugin"],
  ];

  for (const [ext, cat] of expectedExtensionToCategory) {
    test(`extension ${ext} maps to category ${cat}`, () => {
      const catCanonical = `ezquake:asset_category:${cat}`;
      const match = bundle.asset_extensions.find((e: any) => e.extension === ext && e.category_id === catCanonical);
      expect(match).toBeDefined();
    });
  }
});
```

- [ ] **Step 2: Run bun test - expect 18 failures**

Run: `cd packages/qw-config && bun test tests/asset-extensions-coverage.test.ts`
Expected: 9 category-missing + 9 extension-missing failures.

- [ ] **Step 3: Add categories to `ezquake-asset-categories.yaml`**

Append to `packages/qw-config/seeds/ezquake-asset-categories.yaml`:

```yaml
  - name: log
    display_name: "Log File"
    description: "Console and match logs. Produced by the Log_* subsystem and auto-recording."
  - name: locfile
    display_name: "Location File"
    description: "Team-reporting location file (.loc) keyed to a map name; used by %l macros."
  - name: map_lighting
    display_name: "Map Lighting"
    description: "Per-map colored-lighting companion (.lit) loaded alongside a .bsp."
  - name: help_xml
    display_name: "Help Documentation"
    description: "Engine help system XML files, shipped in ezquake.pk3."
  - name: quakec_progs
    display_name: "QuakeC Progs"
    description: "Compiled QuakeC bytecode (qwprogs.dat, spprogs.dat, mod progs.dat)."
  - name: keymap
    display_name: "Keymap File"
    description: "Keyboard-layout data consumed by the key-binding subsystem (.kmap)."
  - name: sprite
    display_name: "Sprite"
    description: "Sprite model (.spr). Distinct from .mdl via the precache path."
  - name: demo_archive
    display_name: "Demo Archive"
    description: "Compressed demo archive (.qwz). Decoded via qwdtools before playback."
  - name: plugin
    display_name: "Client Plugin"
    description: "Native plugin DLL (FTE's fteplug_*.dll family). ezQuake does not consume these; surfaced as a cross-client presence signal."
```

- [ ] **Step 4: Add extensions to `ezquake-asset-extensions.yaml`**

Append:

```yaml
  - extension: ".log"
    category: log
  - extension: ".loc"
    category: locfile
  - extension: ".lit"
    category: map_lighting
  - extension: ".xml"
    category: help_xml
  - extension: ".dat"
    category: quakec_progs
  - extension: ".kmap"
    category: keymap
  - extension: ".spr"
    category: sprite
  - extension: ".qwz"
    category: demo_archive
  - extension: ".dll"
    category: plugin
```

- [ ] **Step 5: Regenerate bundle + run tests**

```bash
cd /home/paradoks/projects/quakeworld
npx tsx apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts --project ezquake --version head
cd packages/qw-config && bun test tests/asset-extensions-coverage.test.ts
```

Expected: all 18 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/qw-config/seeds/ezquake-asset-categories.yaml \
        packages/qw-config/seeds/ezquake-asset-extensions.yaml \
        packages/qw-config/src/data/ezquake-asset-bundle.json
git commit -m "feat(qw-config): add 9 loader-family categories + extension rules"
```

---

### Task 3.3: Extend LOADER_FUNCTIONS + FUNCTION_TO_CATEGORY for new families

**Files:**
- Modify: `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py`
- Modify: `packages/qw-config/scripts/extract-ezquake-asset-cvar-bindings-clang.py` (watchlist sync)

**Loader functions to add** (names derived from HANDOVER entry and ezQuake source - each needs a spot-check in the real repo before shipping):

| Category | Loader function candidates | Source file hint |
|---|---|---|
| `locfile` | `TP_LoadLocFile`, `TP_LoadLocs` | `tp.c`, `tp_triggers.c` |
| `map_lighting` | `R_LoadLighting`, `Mod_LoadLighting` | `gl_rlight.c`, `model.c` |
| `log` | `Log_OpenLogfile`, `Log_f` | `log.c` |
| `help_xml` | `Help_LoadXML`, `Help_DescribeCmd` | `help.c` |
| `keymap` | `Key_LoadBindings`, `IN_LoadKeymap` | `keys.c`, `in_*.c` |
| `quakec_progs` | `PR_LoadProgs` (already covered if it calls FS_LoadFile internally - confirm) | `pr_cmds.c` |
| `demo_archive` | `CL_Demo_Unpack_QWZ`, `CL_PlayDemo_f` (the QWZ branch) | `cl_demo.c` |
| `sprite` | sprite loader routes through `Mod_ForName` already - may not need new entry | `model.c` |
| `plugin` | FTE-specific: `Plug_Load` etc. ezQuake does not load these, so we add the extension mapping but not a loader entry. | n/a for ezQuake |

- [ ] **Step 1: Confirm each function name in the real ezquake source**

Run:
```bash
cd /home/paradoks/projects/quakeworld
for fn in TP_LoadLocFile TP_LoadLocs R_LoadLighting Mod_LoadLighting \
          Log_OpenLogfile Log_f Help_LoadXML Help_DescribeCmd \
          Key_LoadBindings IN_LoadKeymap PR_LoadProgs CL_Demo_Unpack_QWZ; do
  echo "--- $fn ---"
  grep -rn "^\(static \)\?[a-zA-Z_][a-zA-Z0-9_ *]*\b$fn\s*(" research/repos/ezquake-source/src/*.c | head -3
done
```

Record the actually-present function names. Discard the ones that don't exist; promote alternates (e.g. if `TP_LoadLocFile` doesn't exist but `TP_LoadLoc` does). Adjust the plan below accordingly.

- [ ] **Step 2: Write failing acceptance test**

Append to `packages/qw-config/tests/asset-bundle-shape.test.ts`:

```typescript
describe("Path 3: new loader-family call sites", () => {
  const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));
  const siteFunctions = new Set(bundle.asset_loader_sites.map((s: any) => s.function_name));

  // Loaders that should appear at least once in the extracted site list.
  // Keep this list conservative - if Step 1's confirmation renames any,
  // update these assertions in lock-step.
  const expected = [
    "R_LoadLighting",        // .lit
    "TP_LoadLocFile",        // .loc
  ];

  for (const fn of expected) {
    test(`extractor captures at least one call to ${fn}`, () => {
      expect(siteFunctions.has(fn)).toBe(true);
    });
  }
});
```

- [ ] **Step 3: Run test - expect failures**

Run: `cd packages/qw-config && bun test tests/asset-bundle-shape.test.ts`
Expected: `expect(siteFunctions.has(fn)).toBe(true)` fails for each new loader.

- [ ] **Step 4: Extend LOADER_FUNCTIONS + FUNCTION_TO_CATEGORY + ENCLOSING_FN_CATEGORY_RULES**

In `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py`:

```python
LOADER_FUNCTIONS: set[str] = {
    "FS_LoadFile",
    "FS_OpenVFS",
    "FS_WriteFile",
    "Draw_CachePicSafe",
    "R_LoadPicImage",
    "R_LoadCharsetImage",
    "Mod_ForName",
    "Mod_FindName",
    "S_PrecacheSound",
    "W_LoadWadFile",
    # Path 3 additions (confirmed in Step 1).
    "TP_LoadLocFile",        # or TP_LoadLoc, per Step 1
    "R_LoadLighting",        # or Mod_LoadLighting
    "Log_OpenLogfile",
    "Help_LoadXML",
    "Key_LoadBindings",
    "CL_Demo_Unpack_QWZ",
}

FUNCTION_TO_CATEGORY: dict[str, str] = {
    "S_PrecacheSound":      "ezquake:asset_category:sound",
    "W_LoadWadFile":        "ezquake:asset_category:wad",
    "R_LoadCharsetImage":   "ezquake:asset_category:charset",
    "Mod_ForName":          "ezquake:asset_category:model",
    "Mod_FindName":         "ezquake:asset_category:model",
    "Draw_CachePicSafe":    "ezquake:asset_category:hud_overlay",
    "R_LoadPicImage":       "ezquake:asset_category:texture",
    # Path 3.
    "TP_LoadLocFile":       "ezquake:asset_category:locfile",
    "R_LoadLighting":       "ezquake:asset_category:map_lighting",
    "Log_OpenLogfile":      "ezquake:asset_category:log",
    "Help_LoadXML":         "ezquake:asset_category:help_xml",
    "Key_LoadBindings":     "ezquake:asset_category:keymap",
    "CL_Demo_Unpack_QWZ":   "ezquake:asset_category:demo_archive",
}
```

Also extend `EXT_TO_CATEGORY` (around line 93) with the new extensions:

```python
EXT_TO_CATEGORY: dict[str, str] = {
    # existing...
    ".log":  "ezquake:asset_category:log",
    ".loc":  "ezquake:asset_category:locfile",
    ".lit":  "ezquake:asset_category:map_lighting",
    ".xml":  "ezquake:asset_category:help_xml",
    ".dat":  "ezquake:asset_category:quakec_progs",
    ".kmap": "ezquake:asset_category:keymap",
    ".spr":  "ezquake:asset_category:sprite",
    ".qwz":  "ezquake:asset_category:demo_archive",
    ".dll":  "ezquake:asset_category:plugin",
}
```

- [ ] **Step 5: Sync the watchlist in the cvar-bindings extractor**

Mirror the same `LOADER_FUNCTIONS` additions in `packages/qw-config/scripts/extract-ezquake-asset-cvar-bindings-clang.py` (around lines 53-64). Keep the two watchlists in lockstep - both extractors read the same loader-call universe and divergence causes auto-corroboration drift.

- [ ] **Step 6: Re-run extractor, regenerate bundle, run tests**

```bash
cd /home/paradoks/projects/quakeworld
python3 packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py
python3 packages/qw-config/scripts/extract-ezquake-asset-cvar-bindings-clang.py
npx tsx packages/qw-config/scripts/derive-reserved-subdirs.ts
npx tsx apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts --project ezquake --version head
cd packages/qw-config && bun test tests/
```

Expected: Path 3 tests pass; total loader-site count increases from 110 baseline to somewhere in the 120-180 range (exact count depends on how many call sites each new loader has).

- [ ] **Step 7: Commit**

```bash
git add packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py \
        packages/qw-config/scripts/extract-ezquake-asset-cvar-bindings-clang.py \
        packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json \
        packages/qw-config/src/data/ezquake-asset-cvar-bindings-ast.json \
        packages/qw-config/src/data/ezquake-reserved-subdirs.json \
        packages/qw-config/src/data/ezquake-asset-bundle.json
git commit -m "feat(qw-config): extend loader-function watchlist with 9 new asset families"
```

---

### Task 3.4: Verify coverage closure against the real-install inventory

**Files:**
- Create: `packages/qw-config/scripts/verify-inventory-coverage.ts`

**Why this task exists:** the HANDOVER entry promises the 6252-file "Other" bucket shrinks substantially. We verify that claim by replaying the bundle's extension + path_hint rules against the real inventory at `/mnt/c/Games/QuakeWorld/QuakeWorld/quake-dir-inventory.md` and asserting the residual Other-bucket size is at most a low-hundreds figure (user-workflow files: `.bat`, `.ahk`, etc.).

- [ ] **Step 1: Write verification script**

Create `packages/qw-config/scripts/verify-inventory-coverage.ts`:

```typescript
#!/usr/bin/env tsx
/**
 * Replay the asset bundle's extension + path_hint rules against a real
 * slipgate inventory dump. Prints a coverage summary and exits 1 if the
 * residual "Other" bucket exceeds the configured threshold.
 *
 * Usage:
 *   tsx packages/qw-config/scripts/verify-inventory-coverage.ts \
 *     --inventory /mnt/c/Games/QuakeWorld/QuakeWorld/quake-dir-inventory.md \
 *     --bundle packages/qw-config/src/data/ezquake-asset-bundle.json \
 *     --max-other 400
 */

import { readFileSync } from "fs";
import { parseArgs } from "util";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    inventory:  { type: "string" },
    bundle:     { type: "string" },
    "max-other": { type: "string", default: "400" },
  },
});

if (!values.inventory) throw new Error("--inventory required");
if (!values.bundle)    throw new Error("--bundle required");

const bundle = JSON.parse(readFileSync(values.bundle, "utf-8"));
const inv = readFileSync(values.inventory, "utf-8");

// The inventory file is a markdown dump that lists files one per line in
// code-block sections, with extension and path visible. We extract
// extension + first-path-segment from each data line.
// Accepts any line matching "^<path>\s" inside a fenced block, where <path>
// contains at least one '/'.
const paths: string[] = [];
let inCodeBlock = false;
for (const line of inv.split("\n")) {
  if (line.startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
  if (!inCodeBlock) continue;
  const m = line.match(/^\s*(\S+\/\S+?)(?:\s|$)/);
  if (m) paths.push(m[1].toLowerCase());
}

function extOf(p: string): string | null {
  const i = p.lastIndexOf(".");
  if (i < 0) return null;
  return p.slice(i);
}
function firstSegment(p: string): string {
  const i = p.indexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}

// Group bundle extensions by ext with their path_hints.
const extRules = new Map<string, Array<{ path_hint: string | null; category_id: string }>>();
for (const e of bundle.asset_extensions) {
  const arr = extRules.get(e.extension) ?? [];
  arr.push({ path_hint: e.path_hint ?? null, category_id: e.category_id });
  extRules.set(e.extension, arr);
}

function classify(path: string): string {
  const ext = extOf(path);
  if (!ext) return "other";
  const rules = extRules.get(ext);
  if (!rules) return "other";
  // Longest-matching path_hint wins; fall back to the unqualified row.
  let best = null as null | { path_hint: string | null; category_id: string };
  for (const r of rules) {
    if (r.path_hint && path.startsWith(r.path_hint)) {
      if (!best || (best.path_hint && r.path_hint.length > best.path_hint.length) || !best.path_hint) {
        best = r;
      }
    }
  }
  if (best) return best.category_id;
  const unq = rules.find((r) => r.path_hint === null);
  return unq ? unq.category_id : "other";
}

const counts = new Map<string, number>();
for (const p of paths) {
  const c = classify(p);
  counts.set(c, (counts.get(c) ?? 0) + 1);
}

const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
console.log(`Total paths: ${paths.length}`);
for (const [cat, n] of sorted) console.log(`  ${cat.padEnd(36)} ${n}`);

const maxOther = Number(values["max-other"]);
const otherCount = counts.get("other") ?? 0;
if (otherCount > maxOther) {
  console.error(`FAIL: 'other' bucket = ${otherCount} exceeds max ${maxOther}`);
  process.exit(1);
}
console.log(`OK: 'other' bucket = ${otherCount} within max ${maxOther}`);
```

- [ ] **Step 2: Run against the real inventory**

```bash
cd /home/paradoks/projects/quakeworld
npx tsx packages/qw-config/scripts/verify-inventory-coverage.ts \
  --inventory /mnt/c/Games/QuakeWorld/QuakeWorld/quake-dir-inventory.md \
  --bundle packages/qw-config/src/data/ezquake-asset-bundle.json \
  --max-other 400
```

Expected:
- `Total paths:` near 14,859.
- The top categories include `log`, `locfile`, `help_xml`, `texture`, `screenshot`, `sound`, `demo`.
- Final line: `OK: 'other' bucket = NNN within max 400`.
- If `other` exceeds 400: inspect the top unclassified extensions via the dump; fold them back into the seed or loader families as a follow-up task. This may reveal additional work to narrow before declaring Path 3 complete.

- [ ] **Step 3: Commit the verification tool**

```bash
git add packages/qw-config/scripts/verify-inventory-coverage.ts
git commit -m "tool(qw-config): inventory-coverage verifier for asset-bundle regressions"
```

---

### Task 3.5: Close HANDOVER entries

**Files:**
- Modify: `HANDOVER.md`

- [ ] **Step 1: Update the `ezquake asset-bundle gaps surfaced by slipgate quake-dir inventory` entry**

Open `HANDOVER.md`. Find the section (around line 154). Mark the status header to reflect closure:

```markdown
## ezquake asset-bundle gaps surfaced by slipgate quake-dir inventory

**Added:** 2026-04-21
**Closed:** <today's date>
**Status:** RESOLVED. Gap A (client_defaults) drained 2026-04-21 via seed-driven bundle. Gap B (png/jpg path_hints) + Gap C (9 loader families) landed via plan `docs/superpowers/plans/2026-04-22-oracle-source-extraction-paths.md`. Inventory coverage verified: <fill in the actual Other-bucket count from the verifier run>.
```

Also update the index line at the top of HANDOVER.md:

```markdown
- [ezquake asset-bundle gaps surfaced by slipgate quake-dir inventory](#ezquake-asset-bundle-gaps-surfaced-by-slipgate-quake-dir-inventory) — RESOLVED <today's date>: all three gaps closed (Gap A via seed-driven client_defaults, Gap B + C via the parameterized-path + loader-family extraction plan).
```

- [ ] **Step 2: Update the `Asset reference-resolution graph` entry**

Same file, around line 212. Add a resolution note for Capability A + D:

```markdown
**Closed (partial):** <today's date>. Capabilities A (parameterized paths) + D (reserved subdirs) shipped via `docs/superpowers/plans/2026-04-22-oracle-source-extraction-paths.md`. Capabilities B (BSP parser) + C (progs.dat parser) remain roadmapped under `docs/superpowers/specs/2026-04-21-layer1-identity-model-design.md` (artifact-derived-facts track).
```

- [ ] **Step 3: Commit HANDOVER changes**

```bash
git add HANDOVER.md
git commit -m "docs(handover): close ezquake asset-bundle gaps + graph Capabilities A+D"
```

---

## Closing tasks

### Task C.1: Final typecheck + test sweep

- [ ] **Step 1: Run all TypeScript typecheck + tests**

```bash
cd /home/paradoks/projects/quakeworld
cd apps/qw-oracle && npm run typecheck && cd -
cd packages/qw-config && bun test && cd -
```

Expected: no type errors; all bun tests pass.

- [ ] **Step 2: Run Python extractor verification driver**

```bash
cd /home/paradoks/projects/quakeworld
python3 packages/qw-config/scripts/tests/test_parameterized_paths.py
```

Expected: all tests pass.

- [ ] **Step 3: Run inventory-coverage verifier with final artefacts**

```bash
cd /home/paradoks/projects/quakeworld
npx tsx packages/qw-config/scripts/verify-inventory-coverage.ts \
  --inventory /mnt/c/Games/QuakeWorld/QuakeWorld/quake-dir-inventory.md \
  --bundle packages/qw-config/src/data/ezquake-asset-bundle.json \
  --max-other 400
```

Expected: PASS line printed.

- [ ] **Step 4: If anything failed, stop and fix before declaring the plan complete**

No amend-hack - fix with a new commit.

---

## Non-scope guardrails

These items are flagged in the frame spec and must not creep into this plan:

- **No schema migration.** If a task seems to require a new column in `asset_loader_sites` or a new table, stop and revise. Extractor JSON fields + bundle optional fields are the allowed escape hatches.
- **No artifact parsers.** BSP / progs.dat / pak / WAD / MDL / SPR stay roadmapped under the identity-model spec.
- **No FTE / MVDSV / KTX work.** Each port proceeds on its own track and inherits these extractors.
- **No slipgate code changes.** Slipgate's bundle consumption is unchanged; it picks up new fields on its next bundle refresh.
- **No backfill of historical ezQuake tags.** Fix head first; backfill rides on Phase 2f's general machinery.
- **No pytest infrastructure.** Python verification uses hand-rolled drivers at `packages/qw-config/scripts/tests/*.py` invoked directly.
