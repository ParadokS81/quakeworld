"""Cmdline params handler for the MVDSV AST extractor.

Detects `COM_CheckParm("-foo")` call sites whose first argument is a literal
string. MVDSV does NOT have a manifest header (no `cmdline_params_ids.h`
equivalent) and does NOT use the `COM_CheckParmOffset` variant -- the simpler,
ezQuake Pattern 1 detection path is sufficient.

Param-name prefix: switches typically start with `-`, but MVDSV also uses
the `+gamedir` Quake-engine convention (fs.c:556) so the prefix filter
accepts both `-` and `+`.

Pattern-1 limit: 7 sv_*.c sites pass a wrapper helper as the first arg
(e.g. `SV_CommandLineEnableCheats()`, `SV_CommandLineHeapSizeMemoryMB()`)
rather than a literal. Those return literal strings internally; recovering
their param names would require Pattern 2 (function-body string-literal
return-value harvest) and is out of scope here.

The `enclosing_function` field is harvested via the walker's
`enter_function` / `exit_function` hooks (top-of-stack at the call site).

Per-file dedup on parameter name across all 3 platform variants
(server-base / win / linux). Cross-file (across all .c files) dedup is
first-wins by name in `finalize()`.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


def _read_extent(source_bytes: bytes, extent) -> str:
    """Return the source text for an AST extent."""
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return ""
    try:
        return source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return ""


def _strip_quotes(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1]
    return s


class CmdlineMvdsvHandler(Visitor):
    """MVDSV cmdline-params handler (Pattern 1 detection on COM_CheckParm).

    Target consumer fork: antilag-mvdsv.

    MVDSV does NOT have a manifest header (no `cmdline_params_ids.h`
    equivalent) and does NOT use `COM_CheckParmOffset` -- only the
    literal-string-arg shape is detected.

    Fork override hooks:
      - DETECTION_API: spelling of the parm-check API. Override at the
        class level if the fork ships a wider check (e.g. adds
        COM_CheckParmOffset).
      - PARAM_PREFIXES: prefix tuple for legitimate cmdline switches
        (default `-` and `+`). Override if the fork ships switches with
        a different prefix.
      - visit_cursor: detects literal-string COM_CheckParm sites with
        prefix filtering. Override to widen detection (e.g. resolve
        wrapper functions returning literal strings -- Pattern 2).
      - finalize: cross-file first-wins dedup. Short.
    """
    name = "cmdline"
    output_filename = "mvdsv-cmdline-params-ast.json"
    payload_field = "params"

    # Parm-check API spelling. Subclasses override to add fork variants.
    DETECTION_API: str = "COM_CheckParm"

    # Legitimate cmdline-switch prefixes. `-` covers modern switches, `+`
    # covers the `+gamedir` Quake-engine convention.
    PARAM_PREFIXES: tuple = ("-", "+")

    def setup(self, *, mvdsv_repo: Path, mvdsv_src: Path) -> None:
        self._repo_root = mvdsv_repo
        self._src_root = mvdsv_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    # Fork override hook: extend COM_CheckParm dispatch or prefix filtering
    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR or cursor.spelling != self.DETECTION_API:
            return

        args = list(cursor.get_arguments())
        if not args:
            return

        text = _read_extent(self.source_bytes, args[0].extent).strip()
        # Require a literal-quoted first argument. Non-literal args (variables,
        # macros) are skipped -- MVDSV's COM_CheckParm sites all use literal
        # strings (verified Pass 1).
        if not (text.startswith('"') and text.endswith('"')):
            return
        name = _strip_quotes(text)
        if not name:
            return
        # Sanity: cmdline params in MVDSV start with `-` (modern switches) or
        # `+` (legacy `+gamedir` Quake-engine convention). Anything else is
        # either a parse artefact or non-cmdline use of COM_CheckParm.
        if not name.startswith(self.PARAM_PREFIXES):
            return
        if name in self._seen_in_file:
            return

        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        enclosing_fn = self._func_stack[-1] if self._func_stack else None

        self._rows.append({
            "name": name,
            "ast": {
                "source_file": rel_file,
                "source_line": location.line,
                "source_column": location.column,
                "enclosing_function": enclosing_fn,
            },
        })
        self._seen_in_file.add(name)

    def _relative_source(self, abs_path: str) -> str:
        """Make source_file repo-relative; fall back to absolute if outside."""
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

    # Fork override hook: alter cross-file dedup or summary stats
    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Cross-file first-wins dedup by canonical name. Same convention as
        # the cvars / commands handlers.
        seen: set[str] = set()
        unique: list[dict] = []
        for r in all_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)
        unique.sort(key=lambda r: r["name"])
        stats = {
            "source_total": len(all_rows),
            "count": len(unique),
            "with_enclosing_function": sum(
                1 for r in unique if r["ast"].get("enclosing_function")
            ),
        }
        return {
            "params": unique,
            "_stats": stats,
        }
