"""Cmdline-params handler (Visitor protocol).

Walks COM_CheckParm / COM_CheckParmOffset sites across client + server TUs
with per-file dedup by (line, column) so the same call seen through both
build variants counts once.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

from ._visitor import Visitor


_MANIFEST_RE = re.compile(
    r'^\s*CMDLINE_DEF\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*"([^"]+)"\s*\)',
)


def _read_extent(source_bytes: bytes, extent) -> str:
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return ""
    try:
        return source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return ""


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


class CmdlineHandler(Visitor):
    name = "cmdline"
    output_filename = "ezquake-cmdline-params-ast.json"

    def __init__(self):
        self._manifest: list[dict] = []
        self._manifest_filename: str = "cmdline_params_ids.h"
        self._help_available = True

    def setup(self, *, ezq_repo: Path, ezq_src: Path) -> None:
        manifest_path = ezq_src / "cmdline_params_ids.h"
        if manifest_path.is_file():
            src = manifest_path.read_text(encoding="utf-8", errors="replace")
            entries: list[dict] = []
            for i, line in enumerate(src.splitlines(), start=1):
                m = _MANIFEST_RE.match(line)
                if m:
                    entries.append({
                        "enum_suffix": m.group(1),
                        "public_name": m.group(2),
                        "manifest_line": i,
                    })
            self._manifest = entries
            self._manifest_filename = manifest_path.name
        else:
            self._manifest = []
        help_path = ezq_repo / "help_cmdline_params.json"
        self._help_available = help_path.is_file()

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._func_stack: list[str] = []
        self._seen_locations: set[tuple[int, int]] = set()
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
        if sp not in ("COM_CheckParm", "COM_CheckParmOffset"):
            return
        loc = cursor.location
        loc_key = (loc.line, loc.column)
        if loc_key in self._seen_locations:
            return
        self._seen_locations.add(loc_key)
        args = list(cursor.get_arguments())
        if not args:
            return
        name_key: Optional[str] = None
        enum_name = _resolve_enum_constant(args[0])
        if enum_name and enum_name.startswith("cmdline_param_"):
            name_key = enum_name
        else:
            lit = _literal_string(args[0], self.source_bytes)
            if lit:
                name_key = lit
        if name_key is None:
            return
        build_variant = "client" if variant == "client" else "server-build"
        self._rows.append({
            "arg_key": name_key,
            "source_file": self._source_file_name,
            "source_line": loc.line,
            "source_column": loc.column,
            "enclosing_function": self._func_stack[-1] if self._func_stack else None,
            "call_form": sp,
            "build_variant": build_variant,
        })

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._func_stack = []
        self._seen_locations = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        usage_by_key: dict[str, list[dict]] = {}
        for row in all_rows:
            usage_by_key.setdefault(row["arg_key"], []).append(row)

        enum_to_public = {f"cmdline_param_{m['enum_suffix']}": m["public_name"] for m in self._manifest}
        manifest_by_public: dict[str, dict] = {m["public_name"]: m for m in self._manifest}

        usages_by_public: dict[str, list[dict]] = {}
        undeclared_source_only: dict[str, list[dict]] = {}
        for key, sites in usage_by_key.items():
            if key.startswith("cmdline_param_"):
                public = enum_to_public.get(key)
                if public is None:
                    undeclared_source_only[key] = sites
                    continue
                usages_by_public.setdefault(public, []).extend(sites)
            else:
                if key in manifest_by_public:
                    usages_by_public.setdefault(key, []).extend(sites)
                else:
                    undeclared_source_only[key] = sites

        help_data: dict = {}
        if self._help_available:
            help_path = repo_root / "help_cmdline_params.json"
            help_data = json.loads(help_path.read_text(encoding="utf-8"))

        params_out: dict[str, dict] = {}
        stats = {
            "manifest_entries": len(self._manifest),
            "manifest_with_usage": 0,
            "manifest_unused_in_source": 0,
            "help_only": 0,
            "source_only_undeclared": len(undeclared_source_only),
            "with_help_desc": 0,
        }

        def site_dict(s: dict) -> dict:
            return {
                "source_file": s["source_file"],
                "source_line": s["source_line"],
                "source_column": s["source_column"],
                "enclosing_function": s["enclosing_function"],
                "call_form": s["call_form"],
                "build_variant": s["build_variant"],
            }

        for m in self._manifest:
            sites = usages_by_public.get(m["public_name"], [])
            help_entry = help_data.get(m["public_name"], {}) or {}
            if sites:
                stats["manifest_with_usage"] += 1
            else:
                stats["manifest_unused_in_source"] += 1
            entry: dict = {
                "ast": {
                    "manifest_enum": f"cmdline_param_{m['enum_suffix']}",
                    "manifest_file": self._manifest_filename,
                    "manifest_line": m["manifest_line"],
                    "usage_sites": [site_dict(s) for s in sites],
                    "usage_count": len(sites),
                },
            }
            if help_entry.get("description"):
                entry["desc"] = help_entry["description"]
                stats["with_help_desc"] += 1
            if help_entry.get("remarks"):
                entry["remarks"] = help_entry["remarks"]
            if help_entry.get("arguments"):
                entry["arguments"] = help_entry["arguments"]
            if help_entry.get("systems"):
                entry["systems"] = help_entry["systems"]
            if help_entry.get("flags"):
                entry["flags"] = help_entry["flags"]
            params_out[m["public_name"]] = entry

        for name, hv in help_data.items():
            if name in params_out:
                continue
            stats["help_only"] += 1
            entry = {"ast": None}
            if hv.get("description"):
                entry["desc"] = hv["description"]
            if hv.get("remarks"):
                entry["remarks"] = hv["remarks"]
            if hv.get("arguments"):
                entry["arguments"] = hv["arguments"]
            if hv.get("systems"):
                entry["systems"] = hv["systems"]
            if hv.get("flags"):
                entry["flags"] = hv["flags"]
            params_out[name] = entry

        for key, sites in undeclared_source_only.items():
            is_literal = not key.startswith("cmdline_param_")
            display_name = key if is_literal else f"?{key}"
            if display_name in params_out:
                continue
            entry = {
                "ast": {
                    "manifest_enum": None if is_literal else key,
                    "manifest_file": None,
                    "manifest_line": None,
                    "usage_sites": [site_dict(s) for s in sites],
                    "usage_count": len(sites),
                    "undeclared": True,
                },
            }
            params_out[display_name] = entry

        sorted_params = {k: params_out[k] for k in sorted(params_out)}
        return {"params": sorted_params, "_stats": stats}
