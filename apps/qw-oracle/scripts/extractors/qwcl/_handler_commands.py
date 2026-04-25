"""Commands handler for the QWCL extractor.

Detects `Cmd_AddCommand("name", handler_fn)` literal-string call sites and
emits ezQuake-shape JSON so the existing load-commands.ts adapter ingests
it unchanged.

QWCL has no `Cmd_AddLegacyCommand` aliases, no struct-table command
registration (`log_t logs[]`), no `#define NAME "string"` macro
resolution, and no `help_commands.json`. All commands land in a single
group bucket "misc" since the ezQuake-era prefix-based group taxonomy
(tp_, hud_, sb_, etc.) doesn't apply meaningfully to 1996-era commands.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


GROUPS = [
    {"id": "misc", "name": "Miscellaneous"},
]


def _literal_string(arg_cursor, source_bytes: bytes) -> Optional[str]:
    extent = arg_cursor.extent
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return None
    try:
        text = source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return None

    parts: list[str] = []
    i = 0
    while i < len(text):
        while i < len(text) and text[i] in " \t\n\r":
            i += 1
        if i >= len(text):
            break
        if text[i] == '"':
            i += 1
            buf = []
            while i < len(text):
                c = text[i]
                if c == "\\" and i + 1 < len(text):
                    buf.append(text[i + 1])
                    i += 2
                    continue
                if c == '"':
                    i += 1
                    break
                buf.append(c)
                i += 1
            parts.append("".join(buf))
        else:
            break
    return "".join(parts) if parts else None


def _resolve_fn_ref(arg_cursor) -> Optional[str]:
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None and ref.kind in (CursorKind.FUNCTION_DECL, CursorKind.VAR_DECL):
                return ref.spelling
        stack.extend(list(n.get_children()))
    return None


class CommandsQwclHandler(Visitor):
    name = "commands"
    output_filename = "qwcl-commands-ast.json"

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._func_stack: list[str] = []
        self._seen_in_file: set[str] = set()
        self._rows: list[dict] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        if cursor.spelling != "Cmd_AddCommand":
            return
        args = list(cursor.get_arguments())
        if len(args) < 2:
            return
        name = _literal_string(args[0], self.source_bytes)
        if not name or name in self._seen_in_file:
            return
        handler = _resolve_fn_ref(args[1])
        loc = cursor.location
        self._rows.append({
            "name": name,
            "handler_fn": handler,
            "source_file": Path(loc.file.name).name,
            "source_line": loc.line,
            "source_column": loc.column,
            "enclosing_function": self._func_stack[-1] if self._func_stack else None,
            "build_variant": "client",
        })
        self._seen_in_file.add(name)

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._func_stack = []
        self._seen_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        deduped: dict[str, dict] = {}
        for row in all_rows:
            if row["name"] not in deduped:
                deduped[row["name"]] = row
        unique_cmds = list(deduped.values())

        commands_out: dict[str, dict] = {}
        stats = {
            "source_total": len(all_rows),
            "with_handler": 0,
            "with_help_desc": 0,
            "server_build_only": 0,
            "help_only": 0,
            "help_only_system_generated": 0,
        }

        for cmd in unique_cmds:
            ast_entry = {
                "handler_fn": cmd["handler_fn"],
                "source_file": cmd["source_file"],
                "source_line": cmd["source_line"],
                "source_column": cmd["source_column"],
                "enclosing_function": cmd["enclosing_function"],
                "build_variant": cmd["build_variant"],
            }
            entry = {
                "group-id": "misc",
                "ast": ast_entry,
            }
            if cmd["handler_fn"]:
                stats["with_handler"] += 1
            commands_out[cmd["name"]] = entry

        sorted_commands = {k: commands_out[k] for k in sorted(commands_out)}
        return {"groups": GROUPS, "commands": sorted_commands, "_stats": stats}
