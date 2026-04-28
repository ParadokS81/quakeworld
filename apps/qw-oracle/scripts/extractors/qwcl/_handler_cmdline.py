"""Cmdline-params handler for the QWCL extractor.

Detects `COM_CheckParm("-name")` literal-string call sites and emits
ezQuake-shape JSON so the existing load-cmdline-params.ts adapter ingests
it unchanged.

QWCL has no `cmdline_params_ids.h` enum manifest and no
`help_cmdline_params.json`, so every entry comes from a literal call site
and ast.manifest_* fields are null. The TS loader already falls back to
`usage_sites[0]` for source citation when manifest_file is null.
"""
from __future__ import annotations

from pathlib import Path

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import literal_string  # noqa: E402


class CmdlineQwclHandler(Visitor):
    name = "cmdline"
    output_filename = "qwcl-cmdline-params-ast.json"

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
        if cursor.spelling != "COM_CheckParm":
            return
        loc = cursor.location
        loc_key = (loc.line, loc.column)
        if loc_key in self._seen_locations:
            return
        self._seen_locations.add(loc_key)
        args = list(cursor.get_arguments())
        if not args:
            return
        name = literal_string(args[0], self.source_bytes)
        if name is None:
            return
        self._rows.append({
            "arg_key": name,
            "source_file": self._source_file_name,
            "source_line": loc.line,
            "source_column": loc.column,
            "enclosing_function": self._func_stack[-1] if self._func_stack else None,
            "call_form": "COM_CheckParm",
            "build_variant": "client",
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

        params_out: dict[str, dict] = {}
        stats = {
            "manifest_entries": 0,
            "manifest_with_usage": 0,
            "manifest_unused_in_source": 0,
            "help_only": 0,
            "source_only_undeclared": len(usage_by_key),
            "with_help_desc": 0,
        }

        for key, sites in usage_by_key.items():
            usage_sites = [{
                "source_file": s["source_file"],
                "source_line": s["source_line"],
                "source_column": s["source_column"],
                "enclosing_function": s["enclosing_function"],
                "call_form": s["call_form"],
                "build_variant": s["build_variant"],
            } for s in sites]
            params_out[key] = {
                "ast": {
                    "manifest_enum": None,
                    "manifest_file": None,
                    "manifest_line": None,
                    "usage_sites": usage_sites,
                    "usage_count": len(usage_sites),
                },
            }

        sorted_params = {k: params_out[k] for k in sorted(params_out)}
        return {"params": sorted_params, "_stats": stats}
