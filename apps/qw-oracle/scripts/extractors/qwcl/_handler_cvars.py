"""Cvars handler for the QWCL (1996 QuakeWorld client) extractor.

Detects `cvar_t NAME = {"name", "default", archive?, info?};` literal-init
VAR_DECLs and emits ezQuake-shape JSON so the existing load-cvars.ts adapter
ingests it unchanged.

The QWCL cvar_t struct is positional:

    typedef struct cvar_s {
        char     *name;
        char     *string;     // default value
        qboolean  archive;    // optional 3rd field
        qboolean  info;       // optional 4th field
        float     value;
        struct cvar_s *next;
    } cvar_t;

There is no group taxonomy (`cvar_groups.h`), no flag bitmask
(`CVAR_*`), no on-change callback in the initializer, no nested cvar
tables, no help-JSON. archive/info are captured as canonical flag_names
`ARCHIVE` / `INFO` so downstream consumers see a uniform `flag_names`
list across projects.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind, StorageClass

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import (  # noqa: E402
    read_extent,
    strip_quotes,
)
from extractor_lib._cvar_shared import (  # noqa: E402
    normalize_flags_raw,
    unescape_c_string,
)


def _storage_str(storage_class) -> str:
    return {
        StorageClass.STATIC: "static",
        StorageClass.EXTERN: "extern",
        StorageClass.NONE: "none",
    }.get(storage_class, str(storage_class))


def _infer_type(default_value: str) -> str:
    if default_value in ("0", "1"):
        return "boolean"
    if re.fullmatch(r"-?\d+", default_value):
        return "integer"
    if re.fullmatch(r"-?\d+\.\d+", default_value):
        return "float"
    return "string"


def _bool_field(raw: str) -> Optional[bool]:
    """Parse a 3rd/4th-field token like `true`, `false`, `1`, `0` into a
    boolean. Returns None if the token doesn't look boolean-like (e.g. an
    enum or expression we shouldn't synthesize a flag from)."""
    t = raw.strip().rstrip(",").strip()
    if t in ("true", "1"):
        return True
    if t in ("false", "0"):
        return False
    return None


def _extract_cvar_decl(node, source_bytes: bytes) -> Optional[dict]:
    init_list = None
    for c in node.get_children():
        if c.kind == CursorKind.INIT_LIST_EXPR:
            init_list = c
            break
    if init_list is None:
        return None
    fields = list(init_list.get_children())
    if len(fields) < 2:
        return None
    name_raw = read_extent(source_bytes, fields[0].extent).strip()
    default_raw = read_extent(source_bytes, fields[1].extent).strip()
    name = strip_quotes(name_raw)
    default = unescape_c_string(strip_quotes(default_raw))
    if not name:
        return None

    archive: Optional[bool] = None
    info: Optional[bool] = None
    flags_raw_parts: list[str] = []
    if len(fields) >= 3:
        a_raw = read_extent(source_bytes, fields[2].extent).strip()
        flags_raw_parts.append(a_raw)
        archive = _bool_field(a_raw)
    if len(fields) >= 4:
        i_raw = read_extent(source_bytes, fields[3].extent).strip()
        flags_raw_parts.append(i_raw)
        info = _bool_field(i_raw)

    flag_names: list[str] = []
    if archive is True:
        flag_names.append("ARCHIVE")
    if info is True:
        flag_names.append("INFO")

    flags_raw: Optional[str] = normalize_flags_raw(", ".join(flags_raw_parts) if flags_raw_parts else None)

    return {
        "cvar_name": name,
        "c_ident": node.spelling,
        "default_value": default,
        "source_file": Path(node.location.file.name).name,
        "source_line": node.location.line,
        "source_column": node.location.column,
        "storage_class": _storage_str(node.storage_class),
        "flags_raw": flags_raw,
        "flag_names": flag_names,
        "on_change": None,
        "group_name": None,
        "min_bound": None,
        "max_bound": None,
        "trailing_comment": None,
    }


class CvarsQwclHandler(Visitor):
    name = "cvars"
    output_filename = "qwcl-variables-ast.json"

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        self._seen_names: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.VAR_DECL:
            return
        tspell = cursor.type.spelling
        if not re.fullmatch(r"(?:const\s+)?cvar_t", tspell):
            return
        extracted = _extract_cvar_decl(cursor, self.source_bytes)
        if extracted is None:
            return
        if extracted["cvar_name"] in self._seen_names:
            return
        self._seen_names.add(extracted["cvar_name"])
        self._rows.append(extracted)

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_names = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        deduped: dict[str, dict] = {}
        for cv in all_rows:
            # First-wins across files. Re-declarations across translation
            # units (extern decls, header redeclares) are rare in QWCL and
            # filtered by the per-file _seen_names anyway.
            if cv["cvar_name"] not in deduped:
                deduped[cv["cvar_name"]] = cv

        # Static estimates from Pass 1 runtime-validation diff (2026-04-26).
        # Not computed dynamically -- derived from operator-driven runtime runs.
        # Update after each new runtime-validation pass.
        out_of_scope_estimate = {
            "bucket1_plugin_unvisited": 0,
            "bucket2_dynamic_registration": 0,
            "bucket3_runtime_synthesized": 0,
            "bucket4_sdk_blocked": 2,
            "last_validated_against_runtime": "2026-04-26",
        }
        vars_out: dict[str, dict] = {}
        stats = {
            "source_total": len(all_rows),
            "client": 0,
            "server_only": 0,
            "with_flags": 0,
            "with_onchange": 0,
            "with_bounds": 0,
            "with_group": 0,
            "with_help_desc": 0,
            "flag_histogram": {},
            "help_only": 0,
            "_out_of_scope_estimate": out_of_scope_estimate,
        }

        for cv in deduped.values():
            ctype = _infer_type(cv["default_value"])
            entry: dict = {
                "type": ctype,
                "group-id": "0",
                "default": cv["default_value"],
                "server-only": False,
                "ast": {
                    "c_ident": cv["c_ident"],
                    "source_file": cv["source_file"],
                    "source_line": cv["source_line"],
                    "source_column": cv["source_column"],
                    "storage_class": cv["storage_class"],
                    "flags_raw": cv["flags_raw"],
                    "flag_names": cv["flag_names"],
                    "on_change": cv["on_change"],
                    "group_name_in_source": cv["group_name"],
                    "min_bound": cv["min_bound"],
                    "max_bound": cv["max_bound"],
                    "trailing_comment": cv["trailing_comment"],
                },
            }
            stats["client"] += 1
            if cv["flag_names"]:
                stats["with_flags"] += 1
                for fn in cv["flag_names"]:
                    stats["flag_histogram"][fn] = stats["flag_histogram"].get(fn, 0) + 1
            vars_out[cv["cvar_name"]] = entry

        sorted_vars = {k: vars_out[k] for k in sorted(vars_out)}
        return {
            "groups": [],
            "vars": sorted_vars,
            "default_overrides": {},
            "_stats": stats,
        }
