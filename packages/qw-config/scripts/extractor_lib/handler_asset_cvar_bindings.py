"""Asset cvar-bindings handler for the unified extraction driver.

Ports extract-ezquake-asset-cvar-bindings-clang.py. Walks both client+server
TUs for MEMBER_REF_EXPR on `.string` where the base is a cvar_t VAR_DECL,
paired with CALL_EXPR to any function in LOADER_FUNCTIONS within the same
COMPOUND_STMT scope. Emits auto-bindings at "auto" confidence.

setup() reads the committed ezquake-variables-ast.json to build a
c_ident -> cvar_name map. When running together with the cvars handler in
one unified pass, this still reads the PREVIOUSLY-committed data (not
the .json.unified output from this run), which matches legacy behavior.

NOTE: Legacy extractor used a slightly different CLANG_ARGS set (missing
a few debug/experimental defines). The unified driver uses the common
args. If the verifier reveals behavioral drift, revisit per-handler arg
overrides; for now the empirical check decides.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Optional

from clang.cindex import CursorKind


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
    "TP_LoadLocFile",
    "PlayQWZDemo",
    "FS_LoadHunkFile",
}

FUNCTION_TO_CATEGORY: dict[str, str] = {
    "S_PrecacheSound": "ezquake:asset_category:sound",
    "W_LoadWadFile": "ezquake:asset_category:wad",
    "R_LoadCharsetImage": "ezquake:asset_category:charset",
    "Mod_ForName": "ezquake:asset_category:model",
    "Mod_FindName": "ezquake:asset_category:model",
    "Draw_CachePicSafe": "ezquake:asset_category:hud_overlay",
    "R_LoadPicImage": "ezquake:asset_category:texture",
    "TP_LoadLocFile": "ezquake:asset_category:locfile",
    "PlayQWZDemo": "ezquake:asset_category:demo_archive",
}

TRIGGER_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^(Host_Init|Sys_Init|CL_Init|R_Init|S_Init|Cvar_Init|FS_Init|VID_Init|Com_Init|Con_Init|SV_Init|M_Init)\b"), "startup"),
    (re.compile(r"_Init(?:Module(?:FS)?|Crosshairs|Conback|Charset|Filesystem|Ex)?$"), "startup"),
    (re.compile(r"^(CL_Connect|CL_ConnectionlessPacket|CL_ParseServerData|CL_ParseServerInfo|CL_ProcessServerInfo|CL_NewTranslation|CL_ParseUpdate|Skin_Skins_f|Skin_NextDownload)\b"), "on_connect"),
    (re.compile(r"^(CL_ParseMapSetup|R_NewMap|Mod_LoadBrushModel|GL_BuildLightmaps|R_LoadSkys|R_SetSky|Sky_NewMap)\b"), "on_map_load"),
]


def _classify_load_trigger(enclosing: Optional[str]) -> str:
    if not enclosing:
        return "unknown"
    for pat, trigger in TRIGGER_RULES:
        if pat.search(enclosing):
            return trigger
    return "on_demand"


def _resolve_cvar_string_ref(member_ref_cursor) -> Optional[str]:
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


class AssetCvarBindingsHandler:
    name = "asset-cvar-bindings"
    output_filename = "ezquake-asset-cvar-bindings-ast.json"

    def __init__(self):
        self._cvar_ident_map: dict[str, str] = {}

    def setup(self, *, ezq_repo: Path, ezq_src: Path) -> None:
        # Read the committed ezquake-variables-ast.json to map c_ident ->
        # registered cvar name. Matches legacy.
        here = Path(__file__).resolve().parent
        monorepo_root = here.parent.parent.parent.parent  # scripts/extractor_lib -> scripts -> qw-config -> packages -> monorepo
        candidate = monorepo_root / "packages/qw-config/src/data/ezquake-variables-ast.json"
        self._cvar_ident_map = {}
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
                self._cvar_ident_map[ident] = cvar_name

    def _cvar_ident_to_name(self, ident: str) -> str:
        return self._cvar_ident_map.get(ident, ident)

    def process_file(
        self,
        *,
        tu_client: Any,
        tu_server: Any,
        source_bytes: bytes,
        source_path: Path,
    ) -> list[dict]:
        target_path = str(source_path.resolve())
        file_name = source_path.name
        bindings: list[dict] = []
        seen_keys: set[tuple[str, str, int, str]] = set()

        def walk(root):
            func_stack: list[str] = []
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
                    if cvar_refs and loader_calls:
                        for cref in cvar_refs:
                            for lc in loader_calls:
                                cvar_name = self._cvar_ident_to_name(cref["cvar_ident"])
                                canonical = f"ezquake:cvar:{cvar_name}"
                                cat = FUNCTION_TO_CATEGORY.get(lc["fn"])
                                trigger = _classify_load_trigger(cref["enclosing"])
                                source_ref = f"{file_name}:{cref['line']}"
                                dedup_key = (canonical, file_name, cref["line"], lc["fn"])
                                if dedup_key in seen_keys:
                                    continue
                                seen_keys.add(dedup_key)
                                bindings.append({
                                    "cvar_canonical_id": canonical,
                                    "category_id": cat,
                                    "load_trigger": trigger,
                                    "path_pattern": None,
                                    "confidence": "auto",
                                    "source_ref": source_ref,
                                    "enclosing_function": cref["enclosing"],
                                    "loader_function": lc["fn"],
                                    "notes": None,
                                })

                if pushed_func:
                    func_stack.pop()

            visit(root)

        walk(tu_client.cursor)
        walk(tu_server.cursor)
        return bindings

    def finalize(
        self,
        *,
        all_rows: list[dict],
        repo_root: Path,
    ) -> dict:
        bindings = sorted(
            all_rows,
            key=lambda b: (b["cvar_canonical_id"], b["source_ref"], b["loader_function"]),
        )

        by_cvar: dict = {}
        by_cat: dict = {}
        by_trigger: dict = {}
        for b in bindings:
            by_cvar[b["cvar_canonical_id"]] = by_cvar.get(b["cvar_canonical_id"], 0) + 1
            cat_key = b["category_id"] or "<null>"
            by_cat[cat_key] = by_cat.get(cat_key, 0) + 1
            by_trigger[b["load_trigger"]] = by_trigger.get(b["load_trigger"], 0) + 1

        stats = {
            "total_bindings": len(bindings),
            "unique_cvars": len(by_cvar),
            "by_category": dict(sorted(by_cat.items(), key=lambda kv: -kv[1])),
            "by_load_trigger": by_trigger,
        }
        return {
            "cvar_bindings": bindings,
            "_stats": stats,
        }
