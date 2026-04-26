"""Cmdline-params handler for the FTE (FTEQW) AST extractor.

Detects COM_CheckParm(literal-string) callsites and aggregates them by flag
name. FTE has only one variant -- COM_CheckParm (no COM_CheckParmOff in the
codebase). Multiple callsites for the same flag across files are all recorded
under one entity as usage_sites, matching the schema that load-cmdline-params.ts
expects (same CmdlineAstBlock shape as the QWCL handler).

FTE has no cmdline_params_ids.h manifest and no help JSON, so all entries come
from callsites and ast.manifest_* fields are null.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


CMDLINE_FNS = {"COM_CheckParm"}


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
    """Extract the C string value from a string-literal cursor.

    Handles adjacent string-literal concatenation ("a" "b" -> "ab").
    Returns None for non-literal or non-string arguments.
    """
    text = _read_extent(source_bytes, arg_cursor.extent).strip()
    if not text.startswith('"'):
        return None
    parts: list[str] = []
    i = 0
    while i < len(text):
        while i < len(text) and text[i].isspace():
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


class CmdlineFteHandler(Visitor):
    name = "cmdline"
    output_filename = "fte-cmdline-params-ast.json"

    def __init__(self) -> None:
        # Cross-file aggregator: flag_name -> list of usage_site dicts
        self._all_sites: dict[str, list[dict]] = {}

    # -- Visitor lifecycle ---------------------------------------------------

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup: (flag_name, line, col) to avoid 4-variant re-visits
        self._seen_in_file: set[tuple[str, int, int]] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        if cursor.spelling not in CMDLINE_FNS:
            return

        loc = cursor.location
        if not loc.file:
            return

        args = list(cursor.get_arguments())
        if not args:
            return

        name = _literal_string(args[0], self.source_bytes)
        if name is None or not name.startswith("-"):
            return

        # Dedup within this file across variants by (name, line, col)
        site_key = (name, loc.line, loc.column)
        if site_key in self._seen_in_file:
            return
        self._seen_in_file.add(site_key)

        self._rows.append({
            "name": name,
            "source_file": loc.file.name,   # made repo-relative in finalize
            "source_line": loc.line,
            "source_column": loc.column,
            "call_form": cursor.spelling,
            "build_variant": variant,
            "source_root": getattr(self, "current_source_root", None),
        })

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        """Aggregate per-callsite rows into per-flag entries.

        Output schema matches CmdlineAstBlock in types.ts so load-cmdline-params.ts
        can ingest FTE the same way it ingests QWCL (no manifest fields for either).
        """
        repo_root_path = Path(repo_root).resolve()

        # Aggregate: flag_name -> list of usage_site dicts
        sites_by_flag: dict[str, list[dict]] = {}
        for row in all_rows:
            flag = row["name"]
            sites_by_flag.setdefault(flag, []).append(row)

        params_out: dict[str, dict] = {}
        stats: dict = {
            "count": 0,
            "total_usage_sites": 0,
            "by_source_root": {},
        }

        for flag, sites in sorted(sites_by_flag.items()):
            usage_sites = []
            for s in sites:
                src_file = s.get("source_file") or ""
                if src_file:
                    try:
                        src_file = str(
                            Path(src_file).resolve().relative_to(repo_root_path)
                        )
                    except ValueError:
                        pass  # leave absolute if outside repo

                usage_sites.append({
                    "source_file": src_file,
                    "source_line": s["source_line"],
                    "source_column": s["source_column"],
                    "enclosing_function": None,
                    "call_form": s["call_form"],
                    "build_variant": s["build_variant"],
                })

            params_out[flag] = {
                "ast": {
                    "manifest_enum": None,
                    "manifest_file": None,
                    "manifest_line": None,
                    "usage_sites": usage_sites,
                    "usage_count": len(usage_sites),
                    "undeclared": True,
                },
            }

            # Stats
            stats["count"] += 1
            stats["total_usage_sites"] += len(usage_sites)
            # by_source_root: count unique flags per source_root based on
            # their first usage site
            sr = sites[0].get("source_root") or "unknown"
            stats["by_source_root"][sr] = stats["by_source_root"].get(sr, 0) + 1

        return {"params": params_out, "_stats": stats}
