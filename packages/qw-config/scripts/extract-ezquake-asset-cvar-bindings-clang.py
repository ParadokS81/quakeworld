#!/usr/bin/env python3
"""AST validator for ezQuake cvar -> asset bindings.

Peer to the hand-authored seed at
`packages/qw-config/seeds/ezquake-asset-cvar-bindings.yaml`. This
extractor walks every .c file and, for each `<cvar_name>.string`
MEMBER_REF_EXPR, checks whether the immediately enclosing compound
statement also contains a call to one of the loader functions in the
Task-2 watchlist. When it does, we emit an auto-binding row.

The loader at `apps/qw-oracle/scripts/load-knowledge/` reconciles the
seed against these auto rows:
  seed match       -> loader keeps seed, confidence 'auto_confirms_seed'
  seed but no auto -> loader keeps seed, logs "not AST-corroborated"
  auto but no seed -> loader writes confidence='auto_orphan' + warns

Output: <repo>/packages/qw-config/src/data/ezquake-asset-cvar-bindings-ast.json
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

# ----- paths ----------------------------------------------------------------

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = (EZQ_REPO / "src") if (EZQ_REPO / "src").is_dir() and any((EZQ_REPO / "src").glob("*.c")) else EZQ_REPO
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-asset-cvar-bindings-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-asset-cvar-bindings-diagnostics.log"

Config.set_library_file("libclang-18.so.1")


# ----- shared vocabulary (kept in sync with loader-sites extractor) --------

LOADER_FUNCTIONS: set[str] = {
    "FS_LoadFile",
    "FS_OpenVFS",
    "FS_WriteFile",
    "Draw_CachePicSafe",
    "R_LoadPicImage",
    "R_LoadCharsetImage",
    "Mod_ForName",
    "Mod_FindName",
    "S_PrecacheSound",
    "W_LoadWadFile",
}

FUNCTION_TO_CATEGORY: dict[str, str] = {
    "S_PrecacheSound": "ezquake:asset_category:sound",
    "W_LoadWadFile": "ezquake:asset_category:wad",
    "R_LoadCharsetImage": "ezquake:asset_category:charset",
    "Mod_ForName": "ezquake:asset_category:model",
    "Mod_FindName": "ezquake:asset_category:model",
    "Draw_CachePicSafe": "ezquake:asset_category:hud_overlay",
    "R_LoadPicImage": "ezquake:asset_category:texture",
}

TRIGGER_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^(Host_Init|Sys_Init|CL_Init|R_Init|S_Init|Cvar_Init|FS_Init|VID_Init|Com_Init|Con_Init|SV_Init|M_Init)\b"), "startup"),
    (re.compile(r"_Init(?:Module(?:FS)?|Crosshairs|Conback|Charset|Filesystem|Ex)?$"), "startup"),
    (re.compile(r"^(CL_Connect|CL_ConnectionlessPacket|CL_ParseServerData|CL_ParseServerInfo|CL_ProcessServerInfo|CL_NewTranslation|CL_ParseUpdate|Skin_Skins_f|Skin_NextDownload)\b"), "on_connect"),
    (re.compile(r"^(CL_ParseMapSetup|R_NewMap|Mod_LoadBrushModel|GL_BuildLightmaps|R_LoadSkys|R_SetSky|Sky_NewMap)\b"), "on_map_load"),
]


CLANG_ARGS = [
    "-x", "c",
    f"-I{EZQ_SRC}",
    "-w",
    "-DWITH_IRC",
    "-DFTE_PEXT2_VOICECHAT",
    "-DFTE_PEXT_CHUNKEDDOWNLOADS",
    "-DFTE_PEXT_FLOATCOORDS",
    "-DFTE_PEXT_TRANS",
    "-DFTE_PEXT_COLOURMOD",
    "-DFTE_PEXT_MODELDBL",
    "-DFTE_PEXT_ENTITYDBL",
    "-DFTE_PEXT_256PACKETENTITIES",
    "-DFTE_PEXT_SPAWNSTATIC2",
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
    "-DX11_GAMMA_WORKAROUND",
]
CLANG_ARGS_SERVER = CLANG_ARGS + ["-DSERVERONLY"]

PARSE_OPTS = (
    TranslationUnit.PARSE_DETAILED_PROCESSING_RECORD
    | TranslationUnit.PARSE_INCOMPLETE
)


# ----- dataclasses ----------------------------------------------------------


@dataclass
class AutoBinding:
    cvar_canonical_id: str
    category_id: Optional[str]
    load_trigger: str
    path_pattern: Optional[str]
    confidence: str  # always 'auto' at extraction time; loader upgrades to 'auto_confirms_seed' or 'auto_orphan'
    source_ref: str
    enclosing_function: Optional[str]
    loader_function: str
    notes: Optional[str] = None


# ----- helpers --------------------------------------------------------------


def _classify_load_trigger(enclosing: Optional[str]) -> str:
    if not enclosing:
        return "unknown"
    for pat, trigger in TRIGGER_RULES:
        if pat.search(enclosing):
            return trigger
    return "on_demand"


def _resolve_cvar_string_ref(member_ref_cursor) -> Optional[str]:
    """Given a MEMBER_REF_EXPR with spelling 'string', return the C ident of
    the referenced cvar_t VAR_DECL (or None if the base isn't a cvar_t)."""
    if member_ref_cursor.spelling != "string":
        return None
    base = None
    for c in member_ref_cursor.get_children():
        base = c
        break
    if base is None:
        return None
    for _ in range(4):
        if base.kind == CursorKind.DECL_REF_EXPR:
            break
        ch = list(base.get_children())
        if not ch:
            return None
        base = ch[0]
    if base.kind != CursorKind.DECL_REF_EXPR:
        return None
    ref = base.referenced
    if ref is None or ref.kind != CursorKind.VAR_DECL:
        return None
    if "cvar_t" not in ref.type.spelling:
        return None
    return ref.spelling


# C ident -> registered cvar name (see extract-ezquake-asset-loader-sites-clang.py)
_CVAR_IDENT_MAP: dict[str, str] = {}


def _load_cvar_ident_map() -> None:
    candidate = REPO_ROOT / "packages/qw-config/src/data/ezquake-variables-ast.json"
    if not candidate.is_file():
        return
    try:
        data = json.loads(candidate.read_text())
    except Exception:
        return
    vars_section = data.get("vars") if isinstance(data, dict) else None
    if not isinstance(vars_section, dict):
        return
    for cvar_name, entry in vars_section.items():
        if cvar_name.startswith("_"):
            continue
        ast = entry.get("ast") if isinstance(entry, dict) else None
        if not ast:
            continue
        ident = ast.get("c_ident")
        if ident:
            _CVAR_IDENT_MAP[ident] = cvar_name


def _cvar_ident_to_name(ident: str) -> str:
    return _CVAR_IDENT_MAP.get(ident, ident)


# ----- extraction -----------------------------------------------------------


def extract_from_file(path: Path, diagnostics: list[str]) -> list[AutoBinding]:
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
    bindings: list[AutoBinding] = []
    seen_keys: set[tuple[str, str, int, str]] = set()

    def walk(root):
        # Parallel stacks: enclosing function names, and lists-of-findings per
        # open COMPOUND_STMT. When a COMPOUND_STMT closes, we pair up cvar
        # refs with loader calls in the same scope and emit bindings.
        func_stack: list[str] = []
        # Each open scope is (cvar_refs, loader_calls) accumulated in DFS order.
        scope_stack: list[tuple[list[dict], list[dict]]] = [([], [])]

        def visit(node):
            pushed_func = False
            pushed_scope = False

            if node.kind == CursorKind.FUNCTION_DECL:
                if any(c.kind == CursorKind.COMPOUND_STMT for c in node.get_children()):
                    func_stack.append(node.spelling or "?")
                    pushed_func = True

            if node.kind == CursorKind.COMPOUND_STMT:
                scope_stack.append(([], []))
                pushed_scope = True

            # Inspect THIS node before recursing.
            if (
                node.kind == CursorKind.MEMBER_REF_EXPR
                and node.location.file is not None
                and os.path.samefile(node.location.file.name, target_path)
            ):
                ident = _resolve_cvar_string_ref(node)
                if ident:
                    scope_stack[-1][0].append({
                        "cvar_ident": ident,
                        "line": node.location.line,
                        "col": node.location.column,
                        "enclosing": func_stack[-1] if func_stack else None,
                    })

            if (
                node.kind == CursorKind.CALL_EXPR
                and node.spelling in LOADER_FUNCTIONS
                and node.location.file is not None
                and os.path.samefile(node.location.file.name, target_path)
            ):
                scope_stack[-1][1].append({
                    "fn": node.spelling,
                    "line": node.location.line,
                    "col": node.location.column,
                })

            for c in node.get_children():
                visit(c)

            if pushed_scope:
                cvar_refs, loader_calls = scope_stack.pop()
                # Any loader calls or cvar refs found in a nested scope are
                # NOT visible to the parent scope's pairing — they stay
                # scoped to where they were found. But a bound pair only
                # counts when both sides are in the same CURRENT scope,
                # which is exactly this frame.
                if cvar_refs and loader_calls:
                    for cref in cvar_refs:
                        # Pair with every loader in scope; deduplicate later.
                        for lc in loader_calls:
                            cvar_name = _cvar_ident_to_name(cref["cvar_ident"])
                            canonical = f"ezquake:cvar:{cvar_name}"
                            cat = FUNCTION_TO_CATEGORY.get(lc["fn"])
                            trigger = _classify_load_trigger(cref["enclosing"])
                            source_ref = f"{path.name}:{cref['line']}"
                            # Dedupe on (cvar, file, line, loader_fn).
                            dedup_key = (canonical, path.name, cref["line"], lc["fn"])
                            if dedup_key in seen_keys:
                                continue
                            seen_keys.add(dedup_key)
                            bindings.append(AutoBinding(
                                cvar_canonical_id=canonical,
                                category_id=cat,
                                load_trigger=trigger,
                                path_pattern=None,
                                confidence="auto",
                                source_ref=source_ref,
                                enclosing_function=cref["enclosing"],
                                loader_function=lc["fn"],
                            ))

            if pushed_func:
                func_stack.pop()

        visit(root)

    walk(tu.cursor)
    walk(tu_server.cursor)

    return bindings


# ----- main -----------------------------------------------------------------


def main() -> int:
    print("ezQuake cvar -> asset binding AST auto-pass")
    print(f"  repo:   {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    if not EZQ_SRC.is_dir():
        print(f"ERROR: ezquake-source/src not found at {EZQ_SRC}", file=sys.stderr)
        return 1

    _load_cvar_ident_map()
    print(f"  cvar ident -> name map: {len(_CVAR_IDENT_MAP)} entries")

    diagnostics: list[str] = []
    bindings: list[AutoBinding] = []

    c_files = sorted(EZQ_SRC.glob("*.c"))
    print(f"  scanning {len(c_files)} .c files")
    for i, f in enumerate(c_files, 1):
        if i % 40 == 0:
            print(f"    [{i}/{len(c_files)}] {f.name}")
        bindings.extend(extract_from_file(f, diagnostics))

    # Sort for stable output.
    bindings.sort(key=lambda b: (b.cvar_canonical_id, b.source_ref, b.loader_function))

    # Stats.
    by_cvar = {}
    by_cat = {}
    by_trigger = {}
    for b in bindings:
        by_cvar[b.cvar_canonical_id] = by_cvar.get(b.cvar_canonical_id, 0) + 1
        by_cat[b.category_id or "<null>"] = by_cat.get(b.category_id or "<null>", 0) + 1
        by_trigger[b.load_trigger] = by_trigger.get(b.load_trigger, 0) + 1

    stats = {
        "total_bindings": len(bindings),
        "unique_cvars": len(by_cvar),
        "by_category": dict(sorted(by_cat.items(), key=lambda kv: -kv[1])),
        "by_load_trigger": by_trigger,
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "cvar_bindings": [b.__dict__ for b in bindings],
        "_stats": stats,
    }
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    print()
    print(f"  total bindings: {stats['total_bindings']}")
    print(f"  unique cvars:   {stats['unique_cvars']}")
    print(f"  by category:    {stats['by_category']}")
    print(f"  by trigger:     {stats['by_load_trigger']}")
    print()
    print(f"  written: {OUTPUT_JSON}")

    DIAGNOSTICS_LOG.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS_LOG.write_text(
        "\n".join(diagnostics) + "\n" if diagnostics else "(no diagnostics)\n",
        encoding="utf-8",
    )
    print(f"  diagnostics logged: {DIAGNOSTICS_LOG} ({len(diagnostics)} entries)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
