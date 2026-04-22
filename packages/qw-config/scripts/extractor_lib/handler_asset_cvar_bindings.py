"""Asset cvar-bindings handler (Visitor protocol).

Per-compound scope pairing: on COMPOUND_STMT exit, if the scope saw both
cvar.string member-refs AND loader-function call-exprs, emit one binding
per (cvar_ref, loader_call) pair.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

from ._visitor import Visitor


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


class AssetCvarBindingsHandler(Visitor):
    name = "asset-cvar-bindings"
    output_filename = "ezquake-asset-cvar-bindings-ast.json"

    def __init__(self):
        self._cvar_ident_map: dict[str, str] = {}

    def setup(self, *, ezq_repo: Path, ezq_src: Path) -> None:
        here = Path(__file__).resolve().parent
        monorepo_root = here.parent.parent.parent.parent
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

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._source_file_name = source_path.name
        self._func_stack: list[str] = []
        # Each compound entry is (cvar_refs_list, loader_calls_list).
        self._scope_stack: list[tuple[list, list]] = []
        self._bindings: list[dict] = []
        self._seen_keys: set[tuple[str, str, int, str]] = set()

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        self._func_stack.pop()

    def enter_compound(self, cursor, variant: str) -> None:
        self._scope_stack.append(([], []))

    def exit_compound(self, cursor, variant: str) -> None:
        cvar_refs, loader_calls = self._scope_stack.pop()
        if not (cvar_refs and loader_calls):
            return
        for cref in cvar_refs:
            for lc in loader_calls:
                cvar_name = self._cvar_ident_to_name(cref["cvar_ident"])
                canonical = f"ezquake:cvar:{cvar_name}"
                cat = FUNCTION_TO_CATEGORY.get(lc["fn"])
                trigger = _classify_load_trigger(cref["enclosing"])
                source_ref = f"{self._source_file_name}:{cref['line']}"
                dedup_key = (canonical, self._source_file_name, cref["line"], lc["fn"])
                if dedup_key in self._seen_keys:
                    continue
                self._seen_keys.add(dedup_key)
                self._bindings.append({
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

    def visit_cursor(self, cursor, variant: str) -> None:
        kind = cursor.kind
        if kind == CursorKind.MEMBER_REF_EXPR:
            ident = _resolve_cvar_string_ref(cursor)
            if ident and self._scope_stack:
                self._scope_stack[-1][0].append({
                    "cvar_ident": ident,
                    "line": cursor.location.line,
                    "col": cursor.location.column,
                    "enclosing": self._func_stack[-1] if self._func_stack else None,
                })
            return
        if kind == CursorKind.CALL_EXPR:
            if cursor.spelling in LOADER_FUNCTIONS and self._scope_stack:
                self._scope_stack[-1][1].append({
                    "fn": cursor.spelling,
                    "line": cursor.location.line,
                    "col": cursor.location.column,
                })

    def end_file(self) -> list[dict]:
        rows = self._bindings
        self._bindings = []
        self._seen_keys = set()
        self._scope_stack = []
        self._func_stack = []
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
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
        return {"cvar_bindings": bindings, "_stats": stats}
