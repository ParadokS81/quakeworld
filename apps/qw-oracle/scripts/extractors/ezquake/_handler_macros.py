"""Macros handler (Visitor protocol).

Walks Cmd_AddMacro / Cmd_AddMacroEx sites across client + server TUs with
per-file first-wins dedup on public_name (client variant sees it first).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


_MACRO_DEF_RE = re.compile(r"^\s*MACRO_DEF\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)", re.MULTILINE)


def _read_extent(source_bytes: bytes, extent) -> str:
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return ""
    try:
        return source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return ""


def _resolve_fn_ref(arg_cursor) -> Optional[str]:
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
                return ref.spelling
        stack.extend(list(n.get_children()))
    return None


def _resolve_enum_constant(arg_cursor) -> Optional[str]:
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None and ref.kind == CursorKind.ENUM_CONSTANT_DECL:
                return ref.spelling
        stack.extend(list(n.get_children()))
    return None


def _literal_string(arg_cursor, source_bytes: bytes) -> Optional[str]:
    text = _read_extent(source_bytes, arg_cursor.extent).strip()
    if not (text.startswith('"') or text.startswith('L"')):
        return None
    parts: list[str] = []
    i = 0
    while i < len(text):
        while i < len(text) and text[i].isspace():
            i += 1
        if i < len(text) and text[i] == "L":
            i += 1
        if i < len(text) and text[i] == '"':
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


class MacrosEzquakeHandler(Visitor):
    name = "macros"
    output_filename = "ezquake-macros-ast.json"

    def __init__(self):
        self._declared: list[str] = []
        self._help_available = True
        self._manifest_available = True

    def setup(self, *, ezq_repo: Path, ezq_src: Path) -> None:
        manifest = ezq_src / "macro_ids.h"
        if manifest.is_file():
            src = manifest.read_text(encoding="utf-8", errors="replace")
            self._declared = [m.group(1) for m in _MACRO_DEF_RE.finditer(src)]
        else:
            self._declared = []
            self._manifest_available = False
        help_path = ezq_repo / "help_macros.json"
        self._help_available = help_path.is_file()

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._func_stack: list[str] = []
        self._seen_in_file: set[str] = set()
        self._rows: list[dict] = []
        self._source_file_name = source_path.name

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        sp = cursor.spelling
        if sp not in ("Cmd_AddMacro", "Cmd_AddMacroEx"):
            return
        args = list(cursor.get_arguments())
        if len(args) < 2:
            return
        public_name: Optional[str] = None
        enum_name = _resolve_enum_constant(args[0])
        if enum_name and enum_name.startswith("macro_"):
            public_name = enum_name[len("macro_"):]
        else:
            lit = _literal_string(args[0], self.source_bytes)
            if lit:
                public_name = lit
        if not public_name or public_name in self._seen_in_file:
            return
        handler = _resolve_fn_ref(args[1])
        teamplay_raw: Optional[str] = None
        if sp == "Cmd_AddMacroEx" and len(args) >= 3:
            teamplay_raw = _read_extent(self.source_bytes, args[2].extent).strip() or None
        loc = cursor.location
        build_variant = "client" if variant == "client" else "server-build"
        self._rows.append({
            "public_name": public_name,
            "handler_fn": handler,
            "teamplay_raw": teamplay_raw,
            "source_file": self._source_file_name,
            "source_line": loc.line,
            "source_column": loc.column,
            "enclosing_function": self._func_stack[-1] if self._func_stack else None,
            "call_form": sp,
            "build_variant": build_variant,
        })
        self._seen_in_file.add(public_name)

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._func_stack = []
        self._seen_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        registrations: dict[str, dict] = {}
        for row in all_rows:
            if row["public_name"] not in registrations:
                registrations[row["public_name"]] = row

        help_data: dict = {}
        if self._help_available:
            help_path = repo_root / "help_macros.json"
            help_data = json.loads(help_path.read_text(encoding="utf-8"))

        macros_out: dict[str, dict] = {}
        stats = {
            "declared_in_ids_h": len(self._declared),
            "with_registration": 0,
            "with_handler": 0,
            "with_teamplay_arg": 0,
            "declared_not_implemented": 0,
            "registered_not_declared": 0,
            "with_help_desc": 0,
            "help_only": 0,
        }
        declared_set = set(self._declared)

        for name in self._declared:
            reg = registrations.get(name)
            help_entry = help_data.get(name, {}) or {}
            entry: dict = {}
            if reg is not None:
                entry["ast"] = {
                    "handler_fn": reg["handler_fn"],
                    "source_file": reg["source_file"],
                    "source_line": reg["source_line"],
                    "source_column": reg["source_column"],
                    "enclosing_function": reg["enclosing_function"],
                    "call_form": reg["call_form"],
                    "teamplay_arg_raw": reg["teamplay_raw"],
                    "build_variant": reg["build_variant"],
                }
                stats["with_registration"] += 1
                if reg["handler_fn"]:
                    stats["with_handler"] += 1
                if reg["teamplay_raw"] is not None:
                    stats["with_teamplay_arg"] += 1
            else:
                entry["ast"] = None
                stats["declared_not_implemented"] += 1
            if help_entry.get("description"):
                entry["desc"] = help_entry["description"]
                stats["with_help_desc"] += 1
            if help_entry.get("remarks"):
                entry["remarks"] = help_entry["remarks"]
            if help_entry.get("type") is not None:
                entry["type"] = help_entry["type"]
            if help_entry.get("teamplay-restricted") is not None:
                entry["teamplay-restricted"] = help_entry["teamplay-restricted"]
            if help_entry.get("related-cvars") is not None:
                entry["related-cvars"] = help_entry["related-cvars"]
            macros_out[name] = entry

        for name in registrations:
            if name in declared_set:
                continue
            reg = registrations[name]
            stats["registered_not_declared"] += 1
            help_entry = help_data.get(name, {}) or {}
            entry = {
                "ast": {
                    "handler_fn": reg["handler_fn"],
                    "source_file": reg["source_file"],
                    "source_line": reg["source_line"],
                    "source_column": reg["source_column"],
                    "enclosing_function": reg["enclosing_function"],
                    "call_form": reg["call_form"],
                    "teamplay_arg_raw": reg["teamplay_raw"],
                    "build_variant": reg["build_variant"],
                    "undeclared": True,
                },
            }
            if help_entry.get("description"):
                entry["desc"] = help_entry["description"]
            macros_out[name] = entry

        for name, hv in help_data.items():
            if name in macros_out:
                continue
            stats["help_only"] += 1
            entry = {"ast": None}
            if hv.get("description"):
                entry["desc"] = hv["description"]
            if hv.get("remarks"):
                entry["remarks"] = hv["remarks"]
            if hv.get("type") is not None:
                entry["type"] = hv["type"]
            if hv.get("teamplay-restricted") is not None:
                entry["teamplay-restricted"] = hv["teamplay-restricted"]
            if hv.get("related-cvars") is not None:
                entry["related-cvars"] = hv["related-cvars"]
            macros_out[name] = entry

        sorted_macros = {k: macros_out[k] for k in sorted(macros_out)}
        return {"macros": sorted_macros, "_stats": stats}
