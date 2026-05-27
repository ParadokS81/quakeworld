"""Cmdline-params handler (Visitor protocol).

Walks COM_CheckParm / COM_CheckParmOffset sites across client + server TUs
with per-file dedup by (line, column) so the same call seen through both
build variants counts once.
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
from extractor_lib._source import literal_string, read_extent  # noqa: E402


_MANIFEST_RE = re.compile(
    r'^\s*CMDLINE_DEF\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*"([^"]+)"\s*\)',
)


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


def _resolve_string_literal(arg_cursor) -> Optional[str]:
    """Walk the cursor tree for a STRING_LITERAL and return its unquoted value.

    Mirrors `_resolve_enum_constant`'s walk shape. Independent of source-bytes
    reads, so it survives macro-expanded literals whose extent libclang reports
    against the macro-invocation site (e.g. SERVERONLY-branch macros in
    server.h:1090-1096 expanding to COM_CheckParm("-foo") inside an #ifdef
    SERVERONLY block in sv_ccmds.c). The literal_string() extent-reader path
    fails for those because the extent text is the function-call source span,
    not the literal -- this walk uses the STRING_LITERAL cursor's spelling
    directly, which carries the literal regardless of extent. Adjacent-literal
    concatenation falls back to literal_string() below.
    """
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.STRING_LITERAL:
            sp = n.spelling
            if sp and len(sp) >= 2 and sp[0] == '"' and sp[-1] == '"':
                return sp[1:-1]
        stack.extend(list(n.get_children()))
    return None


class CmdlineEzquakeHandler(Visitor):
    """ezQuake cmdline-params handler (COM_CheckParm* call detection).

    Target consumer fork: unezQuake.

    Fork override hooks:
      - DETECTION_APIS: tuple of API names dispatched by visit_cursor.
        Override to add fork-specific cmdline-check APIs.
      - visit_cursor: COM_CheckParm / COM_CheckParmOffset detection plus
        `cmdline_param_*` enum-constant resolution. Override to capture
        new param-identification shapes.
      - finalize: manifest cross-check against cmdline_params_ids.h plus
        help-JSON merge plus undeclared-source-only fallback. Override to
        alter the manifest reconciliation policy.
      - setup: parses cmdline_params_ids.h via `_MANIFEST_RE`. Override if
        the fork introduces a new manifest layout.
    """
    name = "cmdline"
    output_filename = "ezquake-cmdline-params-ast.json"

    # Cmdline-check API surface. Subclasses extend to add fork APIs.
    DETECTION_APIS: tuple = ("COM_CheckParm", "COM_CheckParmOffset")

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

    # Fork override hook: extend COM_CheckParm / COM_CheckParmOffset dispatch
    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        sp = cursor.spelling
        if sp not in self.DETECTION_APIS:
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
            # Walk the cursor tree for STRING_LITERAL first -- this works for
            # both direct calls (COM_CheckParm("-cdaudio")) and macro-expanded
            # literals (SV_CommandLineEnableLocalCommand() -> "-enablelocalcommand"
            # in server.h's SERVERONLY branch). The literal_string() fallback
            # below handles adjacent-literal concatenation edge cases that the
            # walk doesn't merge.
            lit = _resolve_string_literal(args[0])
            if lit is None:
                lit = literal_string(args[0], self.source_bytes)
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

    # Fork override hook: alter manifest reconciliation or undeclared-source fallback
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
