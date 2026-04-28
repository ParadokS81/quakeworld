"""HUD elements handler (Visitor protocol).

SINGLE-parse: only processes the client variant (variant == "client"),
ignores server TUs. Legacy behavior preserved.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


HUD_T_C_TO_SCHEMA_NAME = {
    "name":        "hud_alias",
    "description": "help_desc",
    "draw_func":   "draw_fn",
    "order":       "draw_order_raw",
    "min_state":   "min_state_raw",
    "flags":       "flags_raw",
}

_HUD_FIELD_RE = re.compile(
    r"^\s*(?!struct\s+\w+\s*$)(?:const\s+)?(?:\w+|\*)(?:\s+|\s*\*+\s*)(?:\w+\s*\*+\s*)*(\w+)\s*(?:\[[^\]]+\])?\s*;",
    re.MULTILINE,
)

_HUD_FP_FIELD_RE = re.compile(
    r"^\s*[^;{}]*\(\s*\*\s*(\w+)\s*\)\s*\([^;]*\)\s*;",
    re.MULTILINE,
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


def _literal_or_raw(arg_cursor, source_bytes: bytes) -> Optional[str]:
    s = _literal_string(arg_cursor, source_bytes)
    if s is not None:
        return s
    raw = _read_extent(source_bytes, arg_cursor.extent).strip()
    if not raw or raw == "NULL":
        return None
    return raw


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


def _extract_hud_field_lines(hud_h_source: str) -> dict[str, int]:
    m = re.search(r"typedef\s+struct\s+hud_s\s*\{", hud_h_source)
    if m is None:
        return {}
    start = m.end()
    depth = 1
    i = start
    while i < len(hud_h_source) and depth > 0:
        ch = hud_h_source[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1
    block = hud_h_source[start:i]
    fields: dict[str, int] = {}
    for fm in _HUD_FIELD_RE.finditer(block):
        abs_offset = start + fm.start(1)
        line = hud_h_source.count("\n", 0, abs_offset) + 1
        fields[fm.group(1)] = line
    for fm in _HUD_FP_FIELD_RE.finditer(block):
        abs_offset = start + fm.start(1)
        line = hud_h_source.count("\n", 0, abs_offset) + 1
        fields.setdefault(fm.group(1), line)
    return fields


def _synthesize_owned_cvar_names(name: str, args: list, source_bytes: bytes) -> list[str]:
    if len(args) < 16:
        return []
    out: list[str] = []
    for s in ("order", "draw"):
        out.append(f"hud_{name}_{s}")
    show = _literal_or_raw(args[7], source_bytes)
    place = _literal_or_raw(args[8], source_bytes)
    align_x = _literal_or_raw(args[9], source_bytes)
    align_y = _literal_or_raw(args[10], source_bytes)
    pos_x = _literal_or_raw(args[11], source_bytes)
    pos_y = _literal_or_raw(args[12], source_bytes)
    frame = _literal_or_raw(args[13], source_bytes)
    if place is not None:
        out.append(f"hud_{name}_place")
    if show is not None:
        out.append(f"hud_{name}_show")
    if pos_x is not None and align_x is not None:
        out.append(f"hud_{name}_pos_x")
        out.append(f"hud_{name}_align_x")
    if pos_y is not None and align_y is not None:
        out.append(f"hud_{name}_pos_y")
        out.append(f"hud_{name}_align_y")
    if frame is not None:
        out.append(f"hud_{name}_frame")
        out.append(f"hud_{name}_frame_color")
    out.append(f"hud_{name}_item_opacity")
    i = 16
    while i + 1 < len(args):
        suffix = _literal_string(args[i], source_bytes)
        if suffix is None:
            break
        default = _literal_or_raw(args[i + 1], source_bytes)
        if default is None:
            break
        out.append(f"hud_{name}_{suffix}")
        i += 2
    seen = set()
    deduped: list[str] = []
    for c in out:
        if c not in seen:
            seen.add(c)
            deduped.append(c)
    return deduped


class HudElementsEzquakeHandler(Visitor):
    """ezQuake HUD-elements handler (Pattern 1 detection on HUD_Register).

    Target consumer fork: unezQuake. ezQuake's HUD system is unique enough
    that a fork is likely to either keep it untouched or replace it
    wholesale; partial overrides should be rare.

    Fork override hooks:
      - visit_cursor: HUD_Register call detection (16+ args) plus owned-
        cvar synthesis. Override only if the fork changes the HUD_Register
        argument shape.
      - finalize: cross-file dedup + field-source-line attachment. Short
        and well-bounded; override to add new HUD-element fields or
        change ordering.
      - setup: parses hud.h via `HUD_T_C_TO_SCHEMA_NAME`. Override if the
        fork relocates or restructures the hud_t struct definition.
      - HUD_T_C_TO_SCHEMA_NAME (module-level): if the fork renames a
        hud_t field, extend or replace this map. Class-level override is
        cleaner -- consider hoisting if pressured.
    """
    name = "hud-elements"
    output_filename = "ezquake-hud-elements-ast.json"

    def __init__(self):
        self._field_source_lines: dict[str, dict] = {}

    def setup(self, *, ezq_repo: Path, ezq_src: Path) -> None:
        hud_h = ezq_src / "hud.h"
        if not hud_h.is_file():
            self._field_source_lines = {}
            return
        src = hud_h.read_text(encoding="utf-8", errors="replace")
        raw = _extract_hud_field_lines(src)
        out: dict[str, dict] = {}
        for c_name, schema_name in HUD_T_C_TO_SCHEMA_NAME.items():
            line = raw.get(c_name)
            if line is None:
                continue
            out[schema_name] = {
                "source_file": hud_h.name,
                "source_line": line,
            }
        self._field_source_lines = out

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._func_stack: list[str] = []
        self._rows: list[dict] = []
        self._source_file_name = source_path.name

    def enter_function(self, cursor, variant: str) -> None:
        if variant != "client":
            return
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        if variant != "client":
            return
        self._func_stack.pop()

    # Fork override hook: extend HUD_Register dispatch or arg-shape parsing
    def visit_cursor(self, cursor, variant: str) -> None:
        # SINGLE-parse: client-only, matches legacy behavior.
        if variant != "client":
            return
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        if cursor.spelling != "HUD_Register":
            return
        args = list(cursor.get_arguments())
        if len(args) < 16:
            return
        name = _literal_string(args[0], self.source_bytes)
        if not name or not re.fullmatch(r"[a-z][a-z0-9_]*", name):
            return
        alias = _literal_string(args[1], self.source_bytes)
        description = _literal_string(args[2], self.source_bytes)
        flags_raw = _read_extent(self.source_bytes, args[3].extent).strip()
        min_state_raw = _read_extent(self.source_bytes, args[4].extent).strip()
        draw_order_raw = _read_extent(self.source_bytes, args[5].extent).strip()
        draw_fn = _resolve_fn_ref(args[6])
        owned = _synthesize_owned_cvar_names(name, args, self.source_bytes)
        loc = cursor.location
        self._rows.append({
            "name": name,
            "alias": alias,
            "description": description,
            "flags_raw": flags_raw,
            "min_state_raw": min_state_raw,
            "draw_order_raw": draw_order_raw,
            "draw_fn": draw_fn,
            "owned_cvars": owned,
            "source_file": self._source_file_name,
            "source_line": loc.line,
            "source_column": loc.column,
            "enclosing_function": self._func_stack[-1] if self._func_stack else None,
            "build_variant": "client",
        })

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._func_stack = []
        return rows

    # Fork override hook: alter cross-file dedup or hud-element field shape
    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        deduped: dict[str, dict] = {}
        for el in all_rows:
            if el["name"] not in deduped:
                deduped[el["name"]] = el
        unique = list(deduped.values())

        stats = {
            "total": len(unique),
            "with_draw_fn": sum(1 for e in unique if e["draw_fn"]),
            "with_description": sum(1 for e in unique if e["description"]),
            "with_alias": sum(1 for e in unique if e["alias"]),
            "total_owned_cvars": sum(len(e["owned_cvars"]) for e in unique),
        }

        hud_out: dict[str, dict] = {}
        for el in sorted(unique, key=lambda e: e["name"]):
            entry: dict = {
                "ast": {
                    "alias": el["alias"],
                    "flags_raw": el["flags_raw"],
                    "min_state_raw": el["min_state_raw"],
                    "draw_order_raw": el["draw_order_raw"],
                    "draw_fn": el["draw_fn"],
                    "owned_cvars": el["owned_cvars"],
                    "source_file": el["source_file"],
                    "source_line": el["source_line"],
                    "source_column": el["source_column"],
                    "enclosing_function": el["enclosing_function"],
                    "build_variant": el["build_variant"],
                    "field_source_lines": self._field_source_lines,
                },
            }
            if el["description"]:
                entry["desc"] = el["description"]
            hud_out[el["name"]] = entry

        return {"hud_elements": hud_out, "_stats": stats}
