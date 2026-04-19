#!/usr/bin/env python3
"""libclang-based extraction of ezQuake runtime macros ($health, $armor, etc).

Two inputs:

1. `macro_ids.h` — the X-macro manifest. Each `MACRO_DEF(name)` entry is the
   authoritative public name (e.g., `MACRO_DEF(health)` -> public macro `$health`).
   This is the canonical set.

2. `Cmd_AddMacro` / `Cmd_AddMacroEx` call-exprs across the .c files. The first
   argument is a DeclRefExpr to an enum constant like `macro_health` — strip
   the `macro_` prefix to get the public name and match back against the
   manifest. Second argument is the handler function; the `Ex` variant takes
   a third argument: the teamplay-restriction flag.

Merged with `help_macros.json` enrichment (desc, type, teamplay-restricted,
related-cvars). Macros declared in macro_ids.h but never wired via
Cmd_AddMacro* are emitted with ast=null (declared-not-implemented).

Output: <repo>/packages/qw-config/src/data/ezquake-macros-ast.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from clang.cindex import Config, CursorKind, Index, TranslationUnit

# ----- paths -----------------------------------------------------------------

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = EZQ_REPO / "src"
HELP_JSON = EZQ_REPO / "help_macros.json"
MACRO_IDS_H = EZQ_SRC / "macro_ids.h"
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-macros-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-macros-diagnostics.log"

Config.set_library_file("libclang-18.so.1")


# ----- dataclasses -----------------------------------------------------------


@dataclass
class RegistrationSite:
    handler_fn: Optional[str]
    teamplay_raw: Optional[str]   # the raw source text of the teamplay arg (Cmd_AddMacroEx only)
    source_file: str
    source_line: int
    source_column: int
    enclosing_function: Optional[str]
    call_form: str                # "Cmd_AddMacro" | "Cmd_AddMacroEx"
    build_variant: str            # "client" | "server-build"


# ----- libclang config (mirrors cvar/command extractors) ---------------------


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
CLANG_ARGS_SERVER = CLANG_ARGS + ["-DSERVERONLY"]

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


def _resolve_fn_ref(arg_cursor) -> Optional[str]:
    """Given a cursor, find the first FUNCTION_DECL it references (handles
    casts, &Fn, bare Fn)."""
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
    """Given the first arg of Cmd_AddMacro*, find the referenced enum constant
    (e.g. `macro_health`)."""
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None and ref.kind == CursorKind.ENUM_CONSTANT_DECL:
                return ref.spelling
        stack.extend(list(n.get_children()))
    return None


# ----- macro_ids.h parser ----------------------------------------------------


_MACRO_DEF_RE = re.compile(r"^\s*MACRO_DEF\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)", re.MULTILINE)


def parse_macro_ids_h() -> list[str]:
    src = MACRO_IDS_H.read_text(encoding="utf-8")
    return [m.group(1) for m in _MACRO_DEF_RE.finditer(src)]


# ----- per-file extraction ---------------------------------------------------


def extract_from_file(path: Path, diagnostics: list[str]) -> list[tuple[str, RegistrationSite]]:
    """Return list of (public_macro_name, RegistrationSite) tuples found in
    this file."""
    try:
        source_bytes = path.read_bytes()
    except OSError as e:
        diagnostics.append(f"{path}: read failed: {e}")
        return []

    idx = Index.create()
    tu = idx.parse(str(path), args=CLANG_ARGS, options=PARSE_OPTS)
    tu_server = idx.parse(str(path), args=CLANG_ARGS_SERVER, options=PARSE_OPTS)

    for d in tu.diagnostics:
        if d.severity >= 3:
            diagnostics.append(f"{path.name}:{d.location.line}: {d.spelling}")

    target_path = str(path.resolve())

    def collect(tu_cursor, label: str, already_seen: set[str]) -> list[tuple[str, RegistrationSite]]:
        out: list[tuple[str, RegistrationSite]] = []

        def visit(node, current_fn: Optional[str]):
            if node.kind == CursorKind.FUNCTION_DECL:
                if node.location.file is not None and os.path.samefile(node.location.file.name, target_path):
                    current_fn = node.spelling
            if node.kind == CursorKind.CALL_EXPR and node.spelling in ("Cmd_AddMacro", "Cmd_AddMacroEx"):
                loc = node.location
                if loc.file is not None and os.path.samefile(loc.file.name, target_path):
                    args = list(node.get_arguments())
                    if len(args) >= 2:
                        enum_name = _resolve_enum_constant(args[0])
                        if enum_name and enum_name.startswith("macro_"):
                            public_name = enum_name[len("macro_"):]
                            if public_name not in already_seen:
                                handler = _resolve_fn_ref(args[1])
                                teamplay_raw: Optional[str] = None
                                if node.spelling == "Cmd_AddMacroEx" and len(args) >= 3:
                                    teamplay_raw = _read_extent(source_bytes, args[2].extent).strip() or None
                                out.append((public_name, RegistrationSite(
                                    handler_fn=handler,
                                    teamplay_raw=teamplay_raw,
                                    source_file=Path(loc.file.name).name,
                                    source_line=loc.line,
                                    source_column=loc.column,
                                    enclosing_function=current_fn,
                                    call_form=node.spelling,
                                    build_variant=label,
                                )))
                                already_seen.add(public_name)
            for c in node.get_children():
                visit(c, current_fn)

        visit(tu_cursor.cursor, None)
        return out

    seen: set[str] = set()
    hits = collect(tu, "client", seen)
    hits.extend(collect(tu_server, "server-build", seen))
    return hits


# ----- enrichment ------------------------------------------------------------


def load_help_data() -> dict:
    return json.loads(HELP_JSON.read_text(encoding="utf-8"))


def build_output(
    declared_names: list[str],
    registrations: dict[str, RegistrationSite],
    help_data: dict,
) -> dict:
    macros_out: dict[str, dict] = {}

    stats = {
        "declared_in_ids_h": len(declared_names),
        "with_registration": 0,
        "with_handler": 0,
        "with_teamplay_arg": 0,
        "declared_not_implemented": 0,
        "registered_not_declared": 0,
        "with_help_desc": 0,
        "help_only": 0,
    }

    declared_set = set(declared_names)

    # Pass 1: every macro declared in macro_ids.h. Attach registration if present.
    for name in declared_names:
        reg = registrations.get(name)
        help_entry = help_data.get(name, {}) or {}

        entry: dict = {}
        if reg is not None:
            entry["ast"] = {
                "handler_fn": reg.handler_fn,
                "source_file": reg.source_file,
                "source_line": reg.source_line,
                "source_column": reg.source_column,
                "enclosing_function": reg.enclosing_function,
                "call_form": reg.call_form,
                "teamplay_arg_raw": reg.teamplay_raw,
                "build_variant": reg.build_variant,
            }
            stats["with_registration"] += 1
            if reg.handler_fn:
                stats["with_handler"] += 1
            if reg.teamplay_raw is not None:
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

    # Pass 2: registrations whose name wasn't in macro_ids.h (shouldn't happen
    # in practice, but flag if it does — data-quality signal).
    for name in registrations:
        if name in declared_set:
            continue
        reg = registrations[name]
        stats["registered_not_declared"] += 1
        help_entry = help_data.get(name, {}) or {}
        entry = {
            "ast": {
                "handler_fn": reg.handler_fn,
                "source_file": reg.source_file,
                "source_line": reg.source_line,
                "source_column": reg.source_column,
                "enclosing_function": reg.enclosing_function,
                "call_form": reg.call_form,
                "teamplay_arg_raw": reg.teamplay_raw,
                "build_variant": reg.build_variant,
                "undeclared": True,
            },
        }
        if help_entry.get("description"):
            entry["desc"] = help_entry["description"]
        macros_out[name] = entry

    # Pass 3: help-only entries (documented but not declared in macro_ids.h
    # and not registered).
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


# ----- main ------------------------------------------------------------------


def main() -> int:
    print("ezQuake macro AST extraction")
    print(f"  repo: {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    if not MACRO_IDS_H.is_file():
        print(f"ERROR: macro_ids.h not found at {MACRO_IDS_H}", file=sys.stderr)
        return 1
    if not HELP_JSON.is_file():
        print(f"ERROR: help_macros.json not found at {HELP_JSON}", file=sys.stderr)
        return 1

    print("Phase 1: parsing macro_ids.h manifest")
    declared = parse_macro_ids_h()
    print(f"  declared macros: {len(declared)}")

    print("\nPhase 2: walking Cmd_AddMacro[Ex] call-exprs")
    c_files = sorted([p for p in EZQ_SRC.iterdir() if p.suffix == ".c"])
    registrations: dict[str, RegistrationSite] = {}
    diagnostics: list[str] = []
    for i, p in enumerate(c_files, 1):
        try:
            hits = extract_from_file(p, diagnostics)
            for name, site in hits:
                if name not in registrations:
                    registrations[name] = site
            if hits:
                print(f"  [{i:>3}/{len(c_files)}] {p.name}: {len(hits)} registrations")
        except Exception as e:
            diagnostics.append(f"{p.name}: extraction failed: {type(e).__name__}: {e}")
            print(f"  [{i:>3}/{len(c_files)}] {p.name}: FAILED ({e})")

    print(f"\n  unique macros registered: {len(registrations)}")

    print("\nPhase 3: loading help_macros.json for enrichment")
    help_data = load_help_data()
    print(f"  help entries: {len(help_data)}")

    print("\nPhase 4: merging and writing output")
    output = build_output(declared, registrations, help_data)
    stats = output["_stats"]
    for k, v in stats.items():
        print(f"  {k:<28} {v}")
    print(f"  total output entries: {len(output['macros'])}")

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
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
