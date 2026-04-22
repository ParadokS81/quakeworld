#!/usr/bin/env python3
"""libclang-based extraction of ezQuake command-line parameters.

Inputs:

1. `cmdline_params_ids.h` — X-macro manifest. Each `CMDLINE_DEF(suffix, "-flag")`
   entry produces an enum constant `cmdline_param_<suffix>` whose canonical
   public string is `"-flag"`. This is the authoritative set.

2. `COM_CheckParm` / `COM_CheckParmOffset` call-exprs across the .c files.
   Arg 0 is either a DeclRefExpr to one of the manifest enum constants, or a
   string literal. Both cases are captured as usage sites.

3. `help_cmdline_params.json` — description / remarks / systems / flags.

Output: <repo>/packages/qw-config/src/data/ezquake-cmdline-params-ast.json

Every manifest entry is source-backed by definition (declaring the enum value
in cmdline_params_ids.h is itself presence in source). Additionally we report
usage_sites (list of (source_file, source_line)) so downstream consumers can
tell the difference between "declared but never checked" and "actively
consulted in code".

Help-only entries (documented but no manifest entry) emit ast=null.
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
REPO_ROOT = HERE.parent.parent.parent

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = (EZQ_REPO / "src") if (EZQ_REPO / "src").is_dir() and any((EZQ_REPO / "src").glob("*.c")) else EZQ_REPO
HELP_JSON = EZQ_REPO / "help_cmdline_params.json"
MANIFEST_H = EZQ_SRC / "cmdline_params_ids.h"
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-cmdline-params-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-cmdline-diagnostics.log"

Config.set_library_file("libclang-18.so.1")


# ----- dataclasses -----------------------------------------------------------


@dataclass
class ManifestEntry:
    enum_suffix: str     # e.g. "client_nosound"
    public_name: str     # e.g. "-nosound"
    manifest_line: int


@dataclass
class UsageSite:
    source_file: str
    source_line: int
    source_column: int
    enclosing_function: Optional[str]
    call_form: str       # "COM_CheckParm" | "COM_CheckParmOffset"
    build_variant: str   # "client" | "server-build"


# ----- libclang config -------------------------------------------------------


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


# ----- manifest parser -------------------------------------------------------


_MANIFEST_RE = re.compile(
    r'^\s*CMDLINE_DEF\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*"([^"]+)"\s*\)',
    re.MULTILINE,
)


def parse_manifest() -> list[ManifestEntry]:
    src = MANIFEST_H.read_text(encoding="utf-8", errors="replace")
    out: list[ManifestEntry] = []
    for i, line in enumerate(src.splitlines(), start=1):
        m = _MANIFEST_RE.match(line)
        if m:
            out.append(ManifestEntry(
                enum_suffix=m.group(1),
                public_name=m.group(2),
                manifest_line=i,
            ))
    return out


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


# ----- per-file extraction ---------------------------------------------------


def extract_from_file(
    path: Path,
    diagnostics: list[str],
) -> dict[str, list[UsageSite]]:
    """Return mapping public_name -> list of UsageSites found in this file."""
    try:
        source_bytes = path.read_bytes()
    except OSError as e:
        diagnostics.append(f"{path}: read failed: {e}")
        return {}

    idx = Index.create()
    tu = idx.parse(str(path), args=CLANG_ARGS, options=PARSE_OPTS)
    tu_server = idx.parse(str(path), args=CLANG_ARGS_SERVER, options=PARSE_OPTS)

    for d in tu.diagnostics:
        if d.severity >= 3:
            diagnostics.append(f"{path.name}:{d.location.line}: {d.spelling}")

    target_path = str(path.resolve())

    usages: dict[str, list[UsageSite]] = {}

    def collect(tu_cursor, label: str, seen_locations: set[tuple[int, int]]):
        def visit(node, current_fn: Optional[str]):
            if node.kind == CursorKind.FUNCTION_DECL:
                if node.location.file is not None and os.path.samefile(node.location.file.name, target_path):
                    current_fn = node.spelling
            if node.kind == CursorKind.CALL_EXPR and node.spelling in ("COM_CheckParm", "COM_CheckParmOffset"):
                loc = node.location
                if loc.file is not None and os.path.samefile(loc.file.name, target_path):
                    loc_key = (loc.line, loc.column)
                    if loc_key not in seen_locations:
                        seen_locations.add(loc_key)
                        args = list(node.get_arguments())
                        if args:
                            # Try enum constant first (new-style)
                            name_key: Optional[str] = None
                            enum_name = _resolve_enum_constant(args[0])
                            if enum_name and enum_name.startswith("cmdline_param_"):
                                name_key = enum_name  # we'll map to public name later
                            else:
                                lit = _literal_string(args[0], source_bytes)
                                if lit:
                                    name_key = lit  # public name directly
                            if name_key is not None:
                                usages.setdefault(name_key, []).append(UsageSite(
                                    source_file=Path(loc.file.name).name,
                                    source_line=loc.line,
                                    source_column=loc.column,
                                    enclosing_function=current_fn,
                                    call_form=node.spelling,
                                    build_variant=label,
                                ))
            for c in node.get_children():
                visit(c, current_fn)

        visit(tu_cursor.cursor, None)

    seen: set[tuple[int, int]] = set()
    collect(tu, "client", seen)
    collect(tu_server, "server-build", seen)
    return usages


# ----- enrichment ------------------------------------------------------------


def load_help_data() -> dict:
    return json.loads(HELP_JSON.read_text(encoding="utf-8"))


def build_output(
    manifest: list[ManifestEntry],
    usage_by_key: dict[str, list[UsageSite]],
    help_data: dict,
) -> dict:
    # Map enum name -> public name for fast lookup
    enum_to_public = {f"cmdline_param_{m.enum_suffix}": m.public_name for m in manifest}
    manifest_by_public: dict[str, ManifestEntry] = {m.public_name: m for m in manifest}

    # Fold usages by public name, resolving enum keys
    usages_by_public: dict[str, list[UsageSite]] = {}
    undeclared_source_only: dict[str, list[UsageSite]] = {}
    for key, sites in usage_by_key.items():
        if key.startswith("cmdline_param_"):
            public = enum_to_public.get(key)
            if public is None:
                # Unknown enum constant — record under the raw key for diagnostics
                undeclared_source_only[key] = sites
                continue
            usages_by_public.setdefault(public, []).extend(sites)
        else:
            # Literal string usage — may or may not map to a manifest entry
            if key in manifest_by_public:
                usages_by_public.setdefault(key, []).extend(sites)
            else:
                undeclared_source_only[key] = sites

    params_out: dict[str, dict] = {}

    stats = {
        "manifest_entries": len(manifest),
        "manifest_with_usage": 0,
        "manifest_unused_in_source": 0,
        "help_only": 0,
        "source_only_undeclared": len(undeclared_source_only),
        "with_help_desc": 0,
    }

    # Pass 1: every manifest entry
    for m in manifest:
        sites = usages_by_public.get(m.public_name, [])
        help_entry = help_data.get(m.public_name, {}) or {}
        if sites:
            stats["manifest_with_usage"] += 1
        else:
            stats["manifest_unused_in_source"] += 1

        entry: dict = {
            "ast": {
                "manifest_enum": f"cmdline_param_{m.enum_suffix}",
                "manifest_file": MANIFEST_H.name,
                "manifest_line": m.manifest_line,
                "usage_sites": [
                    {
                        "source_file": s.source_file,
                        "source_line": s.source_line,
                        "source_column": s.source_column,
                        "enclosing_function": s.enclosing_function,
                        "call_form": s.call_form,
                        "build_variant": s.build_variant,
                    }
                    for s in sites
                ],
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

        params_out[m.public_name] = entry

    # Pass 2: help-only entries (documented, not in manifest)
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

    # Pass 3: string-literal usages that don't match any manifest entry.
    # Flag as `ast.undeclared=true` so downstream can inspect.
    for key, sites in undeclared_source_only.items():
        # key can be an unknown enum name or a literal public name.
        # If it's a literal, use it as-is; otherwise tag with the enum name.
        is_literal = not key.startswith("cmdline_param_")
        display_name = key if is_literal else f"?{key}"
        if display_name in params_out:
            continue
        entry = {
            "ast": {
                "manifest_enum": None if is_literal else key,
                "manifest_file": None,
                "manifest_line": None,
                "usage_sites": [
                    {
                        "source_file": s.source_file,
                        "source_line": s.source_line,
                        "source_column": s.source_column,
                        "enclosing_function": s.enclosing_function,
                        "call_form": s.call_form,
                        "build_variant": s.build_variant,
                    }
                    for s in sites
                ],
                "usage_count": len(sites),
                "undeclared": True,
            },
        }
        params_out[display_name] = entry

    sorted_params = {k: params_out[k] for k in sorted(params_out)}
    return {"params": sorted_params, "_stats": stats}


# ----- main ------------------------------------------------------------------


def main() -> int:
    print("ezQuake cmdline-param AST extraction")
    print(f"  repo: {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    # Version tolerance: pre-3.6.0 tags may lack the cmdline_params_ids.h
    # manifest and help_cmdline_params.json enrichment file. Both are
    # post-3.2.3 artifacts. When absent, run with empty inputs -- Phase 2
    # (COM_CheckParm[Offset] call-site walk) still captures string-literal
    # usages and emits them as undeclared entries.
    skip_phase1 = not MANIFEST_H.is_file()
    skip_help = not HELP_JSON.is_file()

    startup_diagnostics: list[str] = []
    if skip_phase1:
        msg = f"cmdline_params_ids.h not found at {MANIFEST_H} -- skipping Phase 1 (pre-3.6.0 tag?)"
        print(f"  WARN: {msg}")
        startup_diagnostics.append(msg)
    if skip_help:
        msg = f"help_cmdline_params.json not found at {HELP_JSON} -- proceeding without help enrichment"
        print(f"  WARN: {msg}")
        startup_diagnostics.append(msg)

    print("Phase 1: parsing cmdline_params_ids.h manifest")
    if skip_phase1:
        manifest: list[ManifestEntry] = []
        print("  declared params: 0 (manifest absent)")
    else:
        manifest = parse_manifest()
        print(f"  declared params: {len(manifest)}")

    print("\nPhase 2: walking COM_CheckParm[Offset] call-exprs")
    c_files = sorted([p for p in EZQ_SRC.iterdir() if p.suffix == ".c"])
    usages: dict[str, list[UsageSite]] = {}
    diagnostics: list[str] = []
    for i, p in enumerate(c_files, 1):
        try:
            hits = extract_from_file(p, diagnostics)
            for key, sites in hits.items():
                usages.setdefault(key, []).extend(sites)
            if hits:
                total = sum(len(v) for v in hits.values())
                print(f"  [{i:>3}/{len(c_files)}] {p.name}: {total} usage sites over {len(hits)} params")
        except Exception as e:
            diagnostics.append(f"{p.name}: extraction failed: {type(e).__name__}: {e}")
            print(f"  [{i:>3}/{len(c_files)}] {p.name}: FAILED ({e})")

    total_sites = sum(len(v) for v in usages.values())
    print(f"\n  total usage sites: {total_sites} over {len(usages)} distinct argument forms")

    print("\nPhase 3: loading help_cmdline_params.json for enrichment")
    if skip_help:
        help_data: dict = {}
        print("  help entries: 0 (help_cmdline_params.json absent)")
    else:
        help_data = load_help_data()
        print(f"  help entries: {len(help_data)}")

    print("\nPhase 4: merging and writing output")
    output = build_output(manifest, usages, help_data)
    stats = output["_stats"]
    for k, v in stats.items():
        print(f"  {k:<30} {v}")
    print(f"  total output entries: {len(output['params'])}")

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"\n  written: {OUTPUT_JSON}")

    all_diagnostics = startup_diagnostics + diagnostics
    DIAGNOSTICS_LOG.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS_LOG.write_text(
        "\n".join(all_diagnostics) + "\n" if all_diagnostics else "(no diagnostics)\n",
        encoding="utf-8",
    )
    print(f"  diagnostics logged: {DIAGNOSTICS_LOG} ({len(all_diagnostics)} entries)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
