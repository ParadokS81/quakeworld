"""Asset loader-sites handler (Visitor protocol).

Emits on every CALL_EXPR to a LOADER_FUNCTION. Uses func_stack and
compound_stack (maintained via enter/exit hooks) for enclosing-function
name and for backward-lookup helpers (buffer writes / deref assignments
within the same compound scope).

canonical_id requires cross-file ordinal stability, assigned in finalize().
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
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

EXT_TO_CATEGORY: dict[str, str] = {
    ".cfg":  "ezquake:asset_category:config",
    ".rc":   "ezquake:asset_category:config",
    ".pak":  "ezquake:asset_category:pak",
    ".pk3":  "ezquake:asset_category:pk3",
    ".wad":  "ezquake:asset_category:wad",
    ".bsp":  "ezquake:asset_category:map",
    ".mdl":  "ezquake:asset_category:model",
    ".md3":  "ezquake:asset_category:model",
    ".wav":  "ezquake:asset_category:sound",
    ".ogg":  "ezquake:asset_category:sound",
    ".qwd":  "ezquake:asset_category:demo",
    ".mvd":  "ezquake:asset_category:demo",
    ".dem":  "ezquake:asset_category:demo",
    ".qtv":  "ezquake:asset_category:demo",
    ".lmp":  "ezquake:asset_category:hud_overlay",
    ".tga":  "ezquake:asset_category:texture",
    ".png":  "ezquake:asset_category:texture",
    ".jpg":  "ezquake:asset_category:texture",
    ".jpeg": "ezquake:asset_category:texture",
    ".pcx":  "ezquake:asset_category:skin",
    ".log":  "ezquake:asset_category:log",
    ".loc":  "ezquake:asset_category:locfile",
    ".lit":  "ezquake:asset_category:map_lighting",
    ".xml":  "ezquake:asset_category:help_xml",
    ".dat":  "ezquake:asset_category:quakec_progs",
    ".kmap": "ezquake:asset_category:keymap",
    ".spr":  "ezquake:asset_category:sprite",
    ".qwz":  "ezquake:asset_category:demo_archive",
    ".dll":  "ezquake:asset_category:plugin",
}

GENERIC_LITERAL_CATEGORY = "ezquake:asset_category:other"

ENCLOSING_FN_CATEGORY_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"Demo_File|Demo_f|PlayDemo|CL_Demo|PlayQWZ"), "ezquake:asset_category:demo"),
    (re.compile(r"Image_Write|Image_Load|_LoadImage|LoadImagePixels|_WriteTGA|_WritePNG|_WriteJPEG|_OpenAPNG"), "ezquake:asset_category:screenshot"),
    (re.compile(r"WAVCapture|_LoadSound|Sound_"), "ezquake:asset_category:sound"),
    (re.compile(r"Skin_"), "ezquake:asset_category:skin"),
    (re.compile(r"LoadCharset|Charset_"), "ezquake:asset_category:charset"),
    (re.compile(r"Model_|LoadModel|LoadBrushModel"), "ezquake:asset_category:model"),
    (re.compile(r"Config_|Cfg_|Exec_f|ReadCfg|LoadConfig"), "ezquake:asset_category:config"),
]

TRIGGER_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^(Host_Init|Sys_Init|CL_Init|R_Init|S_Init|Cvar_Init|FS_Init|VID_Init|Com_Init|Con_Init|SV_Init|M_Init)\b"), "startup"),
    (re.compile(r"_Init(?:Module(?:FS)?|Crosshairs|Conback|Charset|Filesystem|Ex)?$"), "startup"),
    (re.compile(r"^(CL_Connect|CL_ConnectionlessPacket|CL_ParseServerData|CL_ParseServerInfo|CL_ProcessServerInfo|CL_NewTranslation|CL_ParseUpdate|Skin_Skins_f|Skin_NextDownload)\b"), "on_connect"),
    (re.compile(r"^(CL_ParseMapSetup|R_NewMap|Mod_LoadBrushModel|GL_BuildLightmaps|R_LoadSkys|R_SetSky|Sky_NewMap)\b"), "on_map_load"),
]

DEV_ONLY_RULES: list[re.Pattern] = [
    re.compile(r"^(Dev_|Debug_|Test_|Bench_)"),
    re.compile(r"_Debug_f$"),
    re.compile(r"^dev_"),
]

FORMAT_FUNCTIONS: dict[str, int] = {
    "va":          0,
    "sprintf":     1,
    "snprintf":    2,
    "Q_snprintfz": 2,
}


def _read_extent(source_bytes: bytes, extent) -> str:
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return ""
    try:
        return source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return ""


def _strip_quotes(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1]
    return s


def _classify_load_trigger(enclosing: Optional[str]) -> str:
    if not enclosing:
        return "unknown"
    for pat, trigger in TRIGGER_RULES:
        if pat.search(enclosing):
            return trigger
    return "on_demand"


def _is_dev_only(enclosing: Optional[str]) -> bool:
    if not enclosing:
        return False
    return any(p.search(enclosing) for p in DEV_ONLY_RULES)


def _category_from_extension(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    lp = path.lower()
    for ext, cat in EXT_TO_CATEGORY.items():
        if lp.endswith(ext):
            return cat
    return None


def _category_from_enclosing(enclosing: Optional[str]) -> Optional[str]:
    if not enclosing:
        return None
    for pat, cat in ENCLOSING_FN_CATEGORY_RULES:
        if pat.search(enclosing):
            return cat
    return None


def _resolve_cvar_ref(arg_cursor) -> Optional[str]:
    node = arg_cursor
    for _ in range(4):
        if node.kind == CursorKind.MEMBER_REF_EXPR:
            break
        children = list(node.get_children())
        if not children:
            return None
        node = children[0]
    if node.kind != CursorKind.MEMBER_REF_EXPR:
        return None
    if node.spelling != "string":
        return None
    base = None
    for c in node.get_children():
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
    t = ref.type.spelling
    if "cvar_t" not in t:
        return None
    return ref.spelling


def _conversion_slots(fmt: str) -> list[str]:
    out: list[str] = []
    i = 0
    while i < len(fmt):
        if fmt[i] != '%':
            i += 1
            continue
        if i + 1 < len(fmt) and fmt[i + 1] == '%':
            i += 2
            continue
        j = i + 1
        while j < len(fmt) and fmt[j] in "-+ #0123456789.*hljztL":
            j += 1
        if j < len(fmt):
            out.append(fmt[i:j + 1])
        i = j + 1
    return out


def _extract_expression_snippet(cursor, source_bytes: bytes) -> str:
    text = _read_extent(source_bytes, cursor.extent).strip()
    return " ".join(text.split())


def _extension_from_template(tpl: str) -> Optional[str]:
    if not tpl:
        return None
    dot = tpl.rfind('.')
    if dot < 0:
        return None
    suffix = tpl[dot:]
    if '%' in suffix:
        return None
    return suffix


def _resolve_semantic(arg_cursor, snippet: str) -> str:
    cvar = _resolve_cvar_ref(arg_cursor)
    if cvar:
        return f"cvar_value:{cvar}"
    map_accessors = (
        "cl.worldmodel->name",
        "cl.mapname",
        "host_mapname",
        "mod->name",
    )
    if snippet in map_accessors or (snippet.endswith("->name") and "worldmodel" in snippet):
        return "current_map_name"
    if "precache" in snippet.lower() or "cl.model_name" in snippet or "cl.sound_name" in snippet:
        return "precached_model_name"
    if snippet.isidentifier():
        return "local_variable"
    return "unknown"


def _classify_parameterized_call(call_cursor, source_bytes: bytes):
    if call_cursor.kind != CursorKind.CALL_EXPR:
        return None
    fn = call_cursor.spelling
    if fn not in FORMAT_FUNCTIONS:
        return None
    fmt_idx = FORMAT_FUNCTIONS[fn]
    args = list(call_cursor.get_arguments())
    if len(args) <= fmt_idx:
        return None
    fmt_cursor = args[fmt_idx]
    lit_node = fmt_cursor
    for _ in range(4):
        if lit_node.kind == CursorKind.STRING_LITERAL:
            break
        ch = list(lit_node.get_children())
        if not ch:
            return None
        lit_node = ch[0]
    if lit_node.kind != CursorKind.STRING_LITERAL:
        return None
    template = _strip_quotes(_read_extent(source_bytes, lit_node.extent).strip())
    slots = _conversion_slots(template)
    variadic = args[fmt_idx + 1: fmt_idx + 1 + len(slots)]
    parameters: list[dict] = []
    for i, (_spec, arg) in enumerate(zip(slots, variadic)):
        snippet = _extract_expression_snippet(arg, source_bytes)
        parameters.append({
            "slot": i,
            "expression_snippet": snippet,
            "semantic": _resolve_semantic(arg, snippet),
        })
    extension = _extension_from_template(template)
    return template, parameters, extension, fn


def _unary_op_token(cursor, source_bytes: bytes) -> Optional[str]:
    if cursor.kind != CursorKind.UNARY_OPERATOR:
        return None
    children = list(cursor.get_children())
    if not children:
        return None
    operand = children[0]
    try:
        start = cursor.extent.start.offset
        end = operand.extent.start.offset
    except AttributeError:
        return None
    if start >= end:
        return None
    prefix = source_bytes[start:end].decode("utf-8", errors="replace").strip()
    return prefix if prefix else None


def _binary_op_token(cursor, source_bytes: bytes) -> Optional[str]:
    if cursor.kind != CursorKind.BINARY_OPERATOR:
        return None
    children = list(cursor.get_children())
    if len(children) != 2:
        return None
    lhs, rhs = children
    try:
        start = lhs.extent.end.offset
        end = rhs.extent.start.offset
    except AttributeError:
        return None
    if start >= end:
        return None
    return source_bytes[start:end].decode("utf-8", errors="replace").strip()


def _drill_to_decl_ref(cursor, depth: int = 4):
    n = cursor
    for _ in range(depth):
        if n.kind == CursorKind.DECL_REF_EXPR:
            return n
        ch = list(n.get_children())
        if not ch:
            break
        n = ch[0]
    return n if n.kind == CursorKind.DECL_REF_EXPR else None


def _lookup_buffer_write_in_compound(compound, var_name: str, before_line: int, before_col: int, source_bytes: bytes):
    best = None
    best_pos = (-1, -1)

    def visit(node):
        nonlocal best, best_pos
        if node.kind == CursorKind.CALL_EXPR and node.spelling in FORMAT_FUNCTIONS:
            args = list(node.get_arguments())
            if args:
                buf = args[0]
                n = buf
                for _ in range(4):
                    if n.kind == CursorKind.DECL_REF_EXPR:
                        break
                    ch = list(n.get_children())
                    if not ch:
                        break
                    n = ch[0]
                if n.kind == CursorKind.DECL_REF_EXPR and n.spelling == var_name:
                    pos = (node.location.line, node.location.column)
                    if pos < (before_line, before_col) and pos > best_pos:
                        param = _classify_parameterized_call(node, source_bytes)
                        if param is not None:
                            best = param
                            best_pos = pos
        for c in node.get_children():
            visit(c)

    visit(compound)
    return best


def _lookup_deref_assignment_in_compound(compound, var_name: str, before_line: int, before_col: int, source_bytes: bytes):
    best = None
    best_pos = (-1, -1)

    def visit(node):
        nonlocal best, best_pos
        if node.kind == CursorKind.BINARY_OPERATOR and _binary_op_token(node, source_bytes) == "=":
            children = list(node.get_children())
            if len(children) == 2:
                lhs, rhs = children
                if (lhs.kind == CursorKind.UNARY_OPERATOR
                    and _unary_op_token(lhs, source_bytes) == "*"):
                    inner = _drill_to_decl_ref(lhs)
                    if inner is not None and inner.spelling == var_name:
                        rhs_call = rhs
                        for _ in range(4):
                            if rhs_call.kind == CursorKind.CALL_EXPR:
                                break
                            ch = list(rhs_call.get_children())
                            if not ch:
                                break
                            rhs_call = ch[0]
                        if (rhs_call.kind == CursorKind.CALL_EXPR
                            and rhs_call.spelling in FORMAT_FUNCTIONS):
                            pos = (node.location.line, node.location.column)
                            if pos < (before_line, before_col) and pos > best_pos:
                                param = _classify_parameterized_call(rhs_call, source_bytes)
                                if param is not None:
                                    best = param
                                    best_pos = pos
        for c in node.get_children():
            visit(c)

    visit(compound)
    return best


def _classify_first_arg(arg_cursor, source_bytes: bytes, enclosing_compound=None):
    node = arg_cursor
    for _ in range(4):
        if node.kind in (
            CursorKind.STRING_LITERAL, CursorKind.MEMBER_REF_EXPR,
            CursorKind.CALL_EXPR, CursorKind.DECL_REF_EXPR,
            CursorKind.UNARY_OPERATOR,
        ):
            break
        ch = list(node.get_children())
        if not ch:
            break
        node = ch[0]

    if node.kind == CursorKind.STRING_LITERAL:
        lit = _strip_quotes(_read_extent(source_bytes, node.extent).strip())
        return "literal", lit, None, None

    cvar_ident = _resolve_cvar_ref(arg_cursor)
    if cvar_ident:
        return "cvar", None, cvar_ident, None

    if node.kind == CursorKind.CALL_EXPR:
        param = _classify_parameterized_call(node, source_bytes)
        if param is not None:
            template = param[0]
            return "computed", template, None, param
        return "computed", None, None, None

    if (node.kind == CursorKind.UNARY_OPERATOR
        and enclosing_compound is not None
        and _unary_op_token(node, source_bytes) == "*"):
        inner = _drill_to_decl_ref(node)
        if inner is not None:
            loc = arg_cursor.location
            param = _lookup_deref_assignment_in_compound(
                enclosing_compound, inner.spelling,
                loc.line, loc.column, source_bytes,
            )
            if param is not None:
                template = param[0]
                return "computed", template, None, param

    if node.kind == CursorKind.DECL_REF_EXPR and enclosing_compound is not None:
        loc = arg_cursor.location
        param = _lookup_buffer_write_in_compound(
            enclosing_compound, node.spelling, loc.line, loc.column, source_bytes,
        )
        if param is not None:
            template = param[0]
            return "computed", template, None, param

    return "unknown", None, None, None


class AssetLoaderSitesHandler(Visitor):
    name = "asset-loader-sites"
    output_filename = "ezquake-asset-loader-sites-ast.json"

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

    def _cvar_ident_to_name(self, ident: Optional[str]) -> Optional[str]:
        if ident is None:
            return None
        return self._cvar_ident_map.get(ident, ident)

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._source_file_name = source_path.name
        self._func_stack: list[str] = []
        self._compound_stack: list = []
        self._collected: list[dict] = []
        self._seen_keys: set[tuple[str, str, int, int]] = set()

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        self._func_stack.pop()

    def enter_compound(self, cursor, variant: str) -> None:
        self._compound_stack.append(cursor)

    def exit_compound(self, cursor, variant: str) -> None:
        self._compound_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        fn = cursor.spelling
        if fn not in LOADER_FUNCTIONS:
            return
        src_line = cursor.location.line
        src_col = cursor.location.column
        key = (fn, self._source_file_name, src_line, src_col)
        if key in self._seen_keys:
            return
        self._seen_keys.add(key)

        enclosing = self._func_stack[-1] if self._func_stack else None
        enclosing_compound = self._compound_stack[-1] if self._compound_stack else None
        args = list(cursor.get_arguments())
        if args:
            path_source, path_literal, cvar_ident, parameterization = _classify_first_arg(args[0], self.source_bytes, enclosing_compound)
        else:
            path_source, path_literal, cvar_ident, parameterization = ("unknown", None, None, None)

        path_template = None
        path_parameters = None
        path_extension = None
        format_function = None
        if parameterization is not None:
            path_template, path_parameters, path_extension, format_function = parameterization

        cat_from_fn = FUNCTION_TO_CATEGORY.get(fn)
        cat_from_ext = _category_from_extension(path_literal) if path_literal else None
        cat_from_enclosing = _category_from_enclosing(enclosing)
        cat_fallback = GENERIC_LITERAL_CATEGORY if (path_source == "literal" and path_literal) else None
        reads_category_id = cat_from_fn or cat_from_ext or cat_from_enclosing or cat_fallback

        has_specific_category = bool(cat_from_fn or cat_from_ext)
        if path_source == "literal" and has_specific_category:
            confidence = "certain"
        elif reads_category_id or path_source in ("cvar", "computed"):
            confidence = "heuristic"
        else:
            confidence = "unclassified"

        load_trigger = _classify_load_trigger(enclosing)
        dev_only = 1 if _is_dev_only(enclosing) else 0

        notes = None
        if variant == "server":
            notes = "server-build variant"

        path_cvar_canonical = (
            f"ezquake:cvar:{self._cvar_ident_to_name(cvar_ident)}"
            if cvar_ident else None
        )

        self._collected.append({
            "canonical_id": "",
            "function_name": fn,
            "source_file": self._source_file_name,
            "source_line": src_line,
            "source_column": src_col,
            "enclosing_function": enclosing,
            "reads_category_id": reads_category_id,
            "load_trigger": load_trigger,
            "path_source": path_source,
            "path_literal": path_literal,
            "path_cvar_id": path_cvar_canonical,
            "confidence": confidence,
            "dev_only": dev_only,
            "notes": notes,
            "path_template": path_template,
            "path_parameters": path_parameters,
            "path_extension": path_extension,
            "format_function": format_function,
        })

    def end_file(self) -> list[dict]:
        rows = self._collected
        self._collected = []
        self._seen_keys = set()
        self._compound_stack = []
        self._func_stack = []
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        dedup: dict[tuple[str, str, int, int], dict] = {}
        for s in all_rows:
            k = (s["function_name"], s["source_file"], s["source_line"], s["source_column"])
            if k in dedup:
                continue
            dedup[k] = s
        sites = list(dedup.values())

        sites.sort(key=lambda s: (
            s["source_file"],
            s["enclosing_function"] or "",
            s["function_name"],
            s["source_line"],
            s["source_column"],
        ))
        ordinal_counters: dict[tuple[str, str, str], int] = defaultdict(int)
        for s in sites:
            basename = s["source_file"].rsplit(".", 1)[0]
            enc = s["enclosing_function"] or "global"
            group_key = (s["function_name"], enc, s["source_file"])
            ordinal_counters[group_key] += 1
            ordinal = ordinal_counters[group_key]
            s["canonical_id"] = f"ezquake:loader_site:{s['function_name']}_{basename}_{enc}_{ordinal}"

        sites = sorted(sites, key=lambda x: (x["source_file"], x["source_line"], x["source_column"]))

        by_fn: dict[str, int] = {}
        by_conf: dict[str, int] = {}
        by_trigger: dict[str, int] = {}
        by_path_source: dict[str, int] = {}
        dev_count = 0
        for s in sites:
            by_fn[s["function_name"]] = by_fn.get(s["function_name"], 0) + 1
            by_conf[s["confidence"]] = by_conf.get(s["confidence"], 0) + 1
            by_trigger[s["load_trigger"]] = by_trigger.get(s["load_trigger"], 0) + 1
            by_path_source[s["path_source"]] = by_path_source.get(s["path_source"], 0) + 1
            if s["dev_only"]:
                dev_count += 1

        stats = {
            "total_sites": len(sites),
            "by_function": dict(sorted(by_fn.items(), key=lambda kv: -kv[1])),
            "by_confidence": by_conf,
            "by_load_trigger": by_trigger,
            "by_path_source": by_path_source,
            "dev_only_count": dev_count,
        }
        return {"loader_sites": sites, "_stats": stats}
