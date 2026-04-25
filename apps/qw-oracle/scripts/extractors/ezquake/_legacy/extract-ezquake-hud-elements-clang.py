#!/usr/bin/env python3
"""libclang-based extraction of ezQuake HUD elements.

Walks `HUD_Register` call-exprs across all .c files. Signature:

  hud_t *HUD_Register(char *name, char *var_alias, char *description,
                      int flags, cactive_t min_state, int draw_order,
                      hud_func_type draw_func,
                      char *show, char *place, char *align_x, char *align_y,
                      char *pos_x, char *pos_y, char *frame, char *frame_color,
                      char *item_opacity, char *params, ...);

Per HUD element we emit:
  - public name (arg 0 string literal)
  - alias (arg 1 string literal or NULL)
  - description (arg 2 string literal)
  - flags raw (arg 3 source text, e.g. HUD_PLUSMINUS)
  - min_state raw (arg 4 source text, e.g. ca_disconnected)
  - draw_order raw (arg 5 source text)
  - draw function (arg 6, resolved function name)
  - owned_cvars: the set of hud_<name>_<suffix> cvars that would be
    synthesised at registration (9 base suffixes + each custom variadic
    suffix NULL-terminated pair).

Output: <repo>/packages/qw-config/src/data/ezquake-hud-elements-ast.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from clang.cindex import Config, CursorKind, Index, TranslationUnit

# ----- paths -----------------------------------------------------------------

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent.parent.parent.parent

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = (EZQ_REPO / "src") if (EZQ_REPO / "src").is_dir() and any((EZQ_REPO / "src").glob("*.c")) else EZQ_REPO
HUD_H = EZQ_SRC / "hud.h"
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (HERE.parent / "output/ezquake-hud-elements-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "diagnostics/ast-hud-elements-diagnostics.log"

Config.set_library_file("libclang-18.so.1")


# ----- dataclasses -----------------------------------------------------------


@dataclass
class ExtractedHudElement:
    name: str
    alias: Optional[str]
    description: Optional[str]
    flags_raw: str
    min_state_raw: str
    draw_order_raw: str
    draw_fn: Optional[str]
    owned_cvars: list[str] = field(default_factory=list)
    source_file: str = ""
    source_line: int = 0
    source_column: int = 0
    enclosing_function: Optional[str] = None
    build_variant: str = "client"


# ----- libclang config (matches cvar/command extractors) --------------------


CLANG_ARGS = [
    "-x", "c",
    f"-I{EZQ_SRC}",
    "-w",
    "-DWITH_IRC",
    "-DFTE_PEXT2_VOICECHAT",
    "-DMVD_PEXT1_SERVERSIDEWEAPON",
    "-DFTE_PEXT_CHUNKEDDOWNLOADS",
    "-DFTE_PEXT_FLOATCOORDS",
    "-DFTE_PEXT_TRANS",
    "-DFTE_PEXT_COLOURMOD",
    "-DFTE_PEXT_MODELDBL",
    "-DFTE_PEXT_ENTITYDBL",
    "-DFTE_PEXT_256PACKETENTITIES",
    "-DFTE_PEXT_SPAWNSTATIC2",
    "-DMVD_PEXT1_HIGHLAGTELEPORT",
    "-DMVD_PEXT1_HIDDEN_MESSAGES",
    "-DMVD_PEXT1_DEBUG",
    "-DPROTOCOL_VERSION_FTE",
    "-DPROTOCOL_VERSION_FTE2",
    "-DPROTOCOL_VERSION_MVD1",
    "-DUSE_PR2",
    "-DWITH_ZIP",
    "-DWITH_ZLIB",
    "-DWITH_PNG",
    "-DWITH_JPEG",
    "-DWITH_NQPROGS",
    "-DEZ_FREETYPE_SUPPORT",
    "-DEZ_MULTIPLE_RENDERERS",
    "-DJSS_CAM",
    "-DRENDERER_OPTION_CLASSIC_OPENGL",
    "-DRENDERER_OPTION_MODERN_OPENGL",
    "-DRENDERER_OPTION_VULKAN",
    "-DWITH_RENDERING_TRACE",
    "-DWWW_INTEGRATION",
    "-DEXPERIMENTAL_SHOW_ACCELERATION",
    "-DX11_GAMMA_WORKAROUND",
    "-DPARANOID",
    "-DDEBUG_VM",
    "-DDEBUG_MEMORY_ALLOCATIONS",
    "-DWEBSITE_LOGIN_SUPPORT",
    "-DSERVER_ONLY",
]

PARSE_OPTS = (
    TranslationUnit.PARSE_DETAILED_PROCESSING_RECORD
    | TranslationUnit.PARSE_INCOMPLETE
)


# ----- helpers ---------------------------------------------------------------


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
    """String literal if possible, else raw source token; None for NULL."""
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


# ----- hud_t struct field source lines --------------------------------------
# Maps C struct field names in hud_t (hud.h) to the schema.ts field names in
# hud_element_versions. Fields missing from hud_t (e.g. `hud_alias` derives
# from HUD_Register arg 1 `var_alias`, not a struct member) anchor to the
# closest structural pin: `name` is the element's identity in the struct and
# is the pragmatic source-line for hud_alias. `description` anchors help_desc
# similarly (desc comes from HUD_Register arg 2, not a struct member, but the
# `description` struct field is a natural source pin).
#
# Keys not listed (e.g. `show`, `place`, `opacity`) have no schema counterpart
# in hud_element_versions and are dropped.

HUD_T_C_TO_SCHEMA_NAME = {
    "name":        "hud_alias",
    "description": "help_desc",
    "draw_func":   "draw_fn",
    "order":       "draw_order_raw",
    "min_state":   "min_state_raw",
    "flags":       "flags_raw",
}

# Simple-declaration pattern: leading whitespace, optional `const`, then a
# type (which may be `struct X`, `unsigned`, `cvar_t`, etc.), any number of
# pointer stars, the captured identifier, optional array suffix, then `;`.
# Handles single-declarator lines only; multi-declarator lines like
# `int lx, ly, lw, lh;` are dropped (no schema counterpart anyway).
_HUD_FIELD_RE = re.compile(
    r"^\s*(?!struct\s+\w+\s*$)(?:const\s+)?(?:\w+|\*)(?:\s+|\s*\*+\s*)(?:\w+\s*\*+\s*)*(\w+)\s*(?:\[[^\]]+\])?\s*;",
    re.MULTILINE,
)

# Function-pointer pattern: `<return> (*name) (args);`.
_HUD_FP_FIELD_RE = re.compile(
    r"^\s*[^;{}]*\(\s*\*\s*(\w+)\s*\)\s*\([^;]*\)\s*;",
    re.MULTILINE,
)


def extract_hud_field_lines(hud_h_source: str) -> dict[str, int]:
    """Parse `typedef struct hud_s { ... } hud_t;` and return a map of C field
    name -> 1-indexed line number. Uses brace-depth walking for the struct
    bounds so nested unions/structs survive; uses two regex passes (simple
    decls + function pointers) for field enumeration."""
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


def build_hud_field_source_lines() -> dict[str, dict]:
    """Return the schema-keyed field_source_lines map for hud_t, shared by
    every HUD element entry (the struct is common). Keys use the schema
    vocabulary (hud_alias, flags_raw, etc.) so Task 12's diff pipeline can
    look up source_overrides by the same field_name it emits in change_events."""
    try:
        src = HUD_H.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return {}
    raw = extract_hud_field_lines(src)
    out: dict[str, dict] = {}
    for c_name, schema_name in HUD_T_C_TO_SCHEMA_NAME.items():
        line = raw.get(c_name)
        if line is None:
            continue
        out[schema_name] = {
            "source_file": HUD_H.name,
            "source_line": line,
        }
    return out


# ----- owned-cvar synthesis (mirrors extract-ezquake-cvars-clang.py) --------


def _synthesize_owned_cvar_names(name: str, args: list, source_bytes: bytes) -> list[str]:
    """Produce the list of `hud_<name>_<suffix>` cvar names that the ezQuake
    runtime would register as a side-effect of this HUD_Register call.

    Mirrors _synthesize_hud_cvars in the cvar extractor, producing only the
    names (no defaults, no source metadata) since the cvar rows themselves
    are already handled elsewhere.
    """
    if len(args) < 16:
        return []

    out: list[str] = []
    base = ["order", "draw"]
    for s in base:
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

    # Variadic pairs starting at args[16]
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

    # Dedupe while preserving order
    seen = set()
    deduped: list[str] = []
    for c in out:
        if c not in seen:
            seen.add(c)
            deduped.append(c)
    return deduped


# ----- per-file extraction ---------------------------------------------------


def extract_from_file(path: Path, diagnostics: list[str]) -> list[ExtractedHudElement]:
    try:
        source_bytes = path.read_bytes()
    except OSError as e:
        diagnostics.append(f"{path}: read failed: {e}")
        return []

    idx = Index.create()
    tu = idx.parse(str(path), args=CLANG_ARGS, options=PARSE_OPTS)

    for d in tu.diagnostics:
        if d.severity >= 3:
            diagnostics.append(f"{path.name}:{d.location.line}: {d.spelling}")

    target_path = str(path.resolve())
    out: list[ExtractedHudElement] = []

    def visit(node, current_fn: Optional[str]):
        if node.kind == CursorKind.FUNCTION_DECL:
            if node.location.file is not None and os.path.samefile(node.location.file.name, target_path):
                current_fn = node.spelling
        if node.kind == CursorKind.CALL_EXPR and node.spelling == "HUD_Register":
            loc = node.location
            if loc.file is not None and os.path.samefile(loc.file.name, target_path):
                args = list(node.get_arguments())
                if len(args) >= 16:
                    name = _literal_string(args[0], source_bytes)
                    # Only lowercase-identifier names are real HUD element names
                    if name and re.fullmatch(r"[a-z][a-z0-9_]*", name):
                        alias = _literal_string(args[1], source_bytes)
                        description = _literal_string(args[2], source_bytes)
                        flags_raw = _read_extent(source_bytes, args[3].extent).strip()
                        min_state_raw = _read_extent(source_bytes, args[4].extent).strip()
                        draw_order_raw = _read_extent(source_bytes, args[5].extent).strip()
                        draw_fn = _resolve_fn_ref(args[6])
                        owned = _synthesize_owned_cvar_names(name, args, source_bytes)

                        out.append(ExtractedHudElement(
                            name=name,
                            alias=alias,
                            description=description,
                            flags_raw=flags_raw,
                            min_state_raw=min_state_raw,
                            draw_order_raw=draw_order_raw,
                            draw_fn=draw_fn,
                            owned_cvars=owned,
                            source_file=Path(loc.file.name).name,
                            source_line=loc.line,
                            source_column=loc.column,
                            enclosing_function=current_fn,
                            build_variant="client",
                        ))
        for c in node.get_children():
            visit(c, current_fn)

    visit(tu.cursor, None)
    return out


# ----- main ------------------------------------------------------------------


def main() -> int:
    print("ezQuake HUD element AST extraction")
    print(f"  repo: {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    c_files = sorted([p for p in EZQ_SRC.iterdir() if p.suffix == ".c"])
    print(f"Phase 1: parsing {len(c_files)} .c files")

    all_elements: list[ExtractedHudElement] = []
    diagnostics: list[str] = []
    for i, p in enumerate(c_files, 1):
        try:
            els = extract_from_file(p, diagnostics)
            if els:
                print(f"  [{i:>3}/{len(c_files)}] {p.name}: {len(els)} HUD elements")
            all_elements.extend(els)
        except Exception as e:
            diagnostics.append(f"{p.name}: extraction failed: {type(e).__name__}: {e}")
            print(f"  [{i:>3}/{len(c_files)}] {p.name}: FAILED ({e})")

    # Dedupe by name (first wins). A HUD element may be registered only once;
    # duplicate names across files would be an ezQuake bug.
    deduped: dict[str, ExtractedHudElement] = {}
    for el in all_elements:
        if el.name not in deduped:
            deduped[el.name] = el
    unique = list(deduped.values())
    print(f"\n  total HUD_Register call sites: {len(all_elements)}")
    print(f"  unique element names:         {len(unique)}")

    stats = {
        "total": len(unique),
        "with_draw_fn": sum(1 for e in unique if e.draw_fn),
        "with_description": sum(1 for e in unique if e.description),
        "with_alias": sum(1 for e in unique if e.alias),
        "total_owned_cvars": sum(len(e.owned_cvars) for e in unique),
    }

    print("\nPhase 2: writing output")
    # Per-field source lines from hud_t in hud.h. The struct is common across
    # all HUD elements, so every entry receives the same map. Keys use the
    # schema-field vocabulary so Task 12's diff pipeline can look up
    # source_overrides by the same field_name it emits in change_events.
    field_source_lines_shared = build_hud_field_source_lines()
    print(f"  hud_t field source lines: {len(field_source_lines_shared)}")

    hud_out: dict[str, dict] = {}
    for el in sorted(unique, key=lambda e: e.name):
        entry: dict = {
            "ast": {
                "alias": el.alias,
                "flags_raw": el.flags_raw,
                "min_state_raw": el.min_state_raw,
                "draw_order_raw": el.draw_order_raw,
                "draw_fn": el.draw_fn,
                "owned_cvars": el.owned_cvars,
                "source_file": el.source_file,
                "source_line": el.source_line,
                "source_column": el.source_column,
                "enclosing_function": el.enclosing_function,
                "build_variant": el.build_variant,
                "field_source_lines": field_source_lines_shared,
            },
        }
        if el.description:
            entry["desc"] = el.description
        hud_out[el.name] = entry

    output = {"hud_elements": hud_out, "_stats": stats}

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    for k, v in stats.items():
        print(f"  {k:<22} {v}")
    print(f"  total output entries: {len(hud_out)}")
    print(f"\n  written: {OUTPUT_JSON}")

    DIAGNOSTICS_LOG.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS_LOG.write_text(
        "\n".join(diagnostics) + "\n" if diagnostics else "(no diagnostics)\n",
        encoding="utf-8",
    )
    print(f"  diagnostics logged: {DIAGNOSTICS_LOG} ({len(diagnostics)} entries)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
