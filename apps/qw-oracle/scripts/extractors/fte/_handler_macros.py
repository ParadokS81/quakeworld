"""Macros handler for the FTE (FTEQW) AST extractor.

Detects Cmd_AddMacro callsites (runtime-resolved $name script tokens).

FTE's Cmd_AddMacroD is a C preprocessor macro:

    #define Cmd_AddMacroD(s,f,unsafe,desc) Cmd_AddMacro(s,f,unsafe)

libclang therefore sees every registration as Cmd_AddMacro with 3 args.
The description arg is discarded at preprocessor level and cannot be
recovered from the AST alone.

Strategy:
- AST pass: collect Cmd_AddMacro CALL_EXPRs -- name, handler, source loc.
- Source-text pass: regex-scan raw bytes for Cmd_AddMacroD callsites in the
  same file; extract the (name, desc) pairs. Merge desc into matching AST
  rows by name, and tag `registration_api` on each row accordingly.

API argument layout (post-expansion, what the AST sees):
    Cmd_AddMacro(name, fn, teamplay_safe)  -- 3 args

`Cmd_AddMacroD` signature in source (pre-expansion):
    Cmd_AddMacroD(name, fn, teamplay_safe, desc)  -- 4 args (desc discarded)
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


# ---------------------------------------------------------------------------
# Source-text regex: recover Cmd_AddMacroD description args
# ---------------------------------------------------------------------------

# Matches single-line Cmd_AddMacroD(name, fn, flag, "desc") callsites.
# Group 1: macro name (string literal content, without quotes).
# Group 2: description (string literal content, without quotes).
_RE_MACRO_D = re.compile(
    rb'Cmd_AddMacroD\s*\(\s*"([^"]+)"\s*,'  # "name",
    rb'[^,]+,'                               # fn (any tokens, skip),
    rb'[^,]+,'                               # teamplay_safe (skip),
    rb'\s*"([^"]*)"'                          # "desc"
)


def _parse_macrod_descs(source_bytes: bytes) -> dict[str, str]:
    """Scan raw source bytes for Cmd_AddMacroD calls, return name -> desc."""
    result: dict[str, str] = {}
    for m in _RE_MACRO_D.finditer(source_bytes):
        name = m.group(1).decode("utf-8", errors="replace")
        desc = m.group(2).decode("utf-8", errors="replace")
        result[name] = desc
    return result


# ---------------------------------------------------------------------------
# String literal + function-ref helpers (same pattern as commands handler)
# ---------------------------------------------------------------------------

def _concat_string_literals(tokens: list[str]) -> Optional[str]:
    """Reconstruct a C string value from adjacent string-literal tokens."""
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


def _tokens_of(cursor) -> list[str]:
    return [t.spelling for t in cursor.get_tokens()]


def _resolve_fn_ref(arg_cursor) -> Optional[str]:
    """Walk arg subtree for a DECL_REF_EXPR referencing a FUNCTION_DECL."""
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None and ref.kind in (
                CursorKind.FUNCTION_DECL,
                CursorKind.VAR_DECL,
            ):
                return ref.spelling
        stack.extend(list(n.get_children()))
    return None


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------

class MacrosFteHandler(Visitor):
    name = "macros"
    output_filename = "fte-macros-ast.json"

    def __init__(self) -> None:
        # Cross-file aggregator: macro_name -> row dict (first-wins)
        self._all_rows: dict[str, dict] = {}

    # -- Visitor lifecycle ---------------------------------------------------

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()
        # Pre-scan source for Cmd_AddMacroD desc args (lost in preprocessor expansion)
        self._macrod_descs: dict[str, str] = _parse_macrod_descs(source_bytes)

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        if cursor.spelling != "Cmd_AddMacro":
            return

        loc = cursor.location
        if not loc.file:
            return

        args = list(cursor.get_arguments())
        if len(args) < 2:
            return

        # arg[0]: macro name string literal
        macro_name = _concat_string_literals(_tokens_of(args[0]))
        if not macro_name:
            return

        # Per-file dedup by name
        if macro_name in self._seen_in_file:
            return
        self._seen_in_file.add(macro_name)

        # arg[1]: handler function reference
        handler = _resolve_fn_ref(args[1])

        # Recover description if this was originally Cmd_AddMacroD in source
        description = self._macrod_descs.get(macro_name, "")
        registration_api = "Cmd_AddMacroD" if macro_name in self._macrod_descs else "Cmd_AddMacro"

        row: dict = {
            "name": macro_name,
            "handler": handler,
            "description": description,
            "source_file": loc.file.name,  # made relative in finalize
            "source_line": loc.line,
            "source_root": getattr(self, "current_source_root", None),
            "registration_api": registration_api,
        }
        self._rows.append(row)

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        self._macrod_descs = {}
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        """Collapse per-file rows into final JSON output.

        Cross-file dedup is first-wins by macro name. Later rows fill in
        missing description or handler when the winner lacks them.
        """
        deduped: dict[str, dict] = {}
        for row in all_rows:
            name = row["name"]
            if name not in deduped:
                deduped[name] = row
            else:
                existing = deduped[name]
                if not existing.get("description") and row.get("description"):
                    existing["description"] = row["description"]
                if not existing.get("handler") and row.get("handler"):
                    existing["handler"] = row["handler"]

        repo_root_path = Path(repo_root).resolve()

        macros_out: dict[str, dict] = {}
        stats: dict = {
            "count": 0,
            "with_description": 0,
            "by_source_root": {},
            "by_api": {},
        }

        for row in deduped.values():
            # Make source_file repo-relative
            src_file = row.get("source_file")
            if src_file:
                try:
                    src_file = str(Path(src_file).resolve().relative_to(repo_root_path))
                except ValueError:
                    pass  # leave absolute if not under repo_root

            entry: dict = {
                "name": row["name"],
                "handler": row.get("handler"),
                "description": row.get("description") or "",
                "source_file": src_file,
                "source_line": row.get("source_line"),
                "source_root": row.get("source_root"),
                "registration_api": row.get("registration_api"),
            }
            macros_out[row["name"]] = entry

            stats["count"] += 1
            if entry["description"]:
                stats["with_description"] += 1
            src_root = entry["source_root"] or "unknown"
            stats["by_source_root"][src_root] = (
                stats["by_source_root"].get(src_root, 0) + 1
            )
            api_key = entry["registration_api"] or "unknown"
            stats["by_api"][api_key] = stats["by_api"].get(api_key, 0) + 1

        sorted_macros = {k: macros_out[k] for k in sorted(macros_out)}
        return {"macros": sorted_macros, "_stats": stats}
