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

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import (read_extent, strip_quotes)


LOADER_FUNCTIONS: set[str] = {
    "FS_OpenVFS",
    "FS_FLocateFile",
    "FS_LoadFile",
    "FS_OpenReadLocation",
    "FS_NativePath",
    "R_RegisterShader",
    "R_LoadHiResTexture",
    "R_RegisterCustom",
    "R_RegisterPic",
    "R_LoadShader",
    "S_PrecacheSound",
    "Mod_ForName",
    "Mod_FindName",
    "COM_WriteFile",
    "COM_LoadTempFile",
    "COM_LoadFile",
    "COM_LoadStackFile",
    "TP_LoadLocFile",
}

# Generic filesystem primitives. When called with a non-literal path and no
# resolvable category, the call site is the FS layer itself (or a runtime-
# filename consumer like QuakeC builtins) rather than an asset loader. Stamp
# these as `intentionally_generic` instead of `unclassified` so the review
# skill can distinguish "we know this is FS-layer code" from "novel finding
# that needs triage."
GENERIC_FS_PRIMITIVES: set[str] = {
    "FS_OpenVFS",
    "FS_LoadFile",
    "FS_FLocateFile",
}

FUNCTION_TO_CATEGORY: dict[str, str] = {
    "S_PrecacheSound":     "fte:asset_category:sound",
    "Mod_ForName":         "fte:asset_category:model",
    "Mod_FindName":        "fte:asset_category:model",
    "R_RegisterShader":    "fte:asset_category:shader",
    "R_LoadShader":        "fte:asset_category:shader",
    "R_LoadHiResTexture":  "fte:asset_category:texture",
    "R_RegisterPic":       "fte:asset_category:hud_overlay",
    "R_RegisterCustom":    "fte:asset_category:texture",
    "TP_LoadLocFile":      "fte:asset_category:locfile",
}

EXT_TO_CATEGORY: dict[str, str] = {
    ".cfg":    "fte:asset_category:config",
    ".rc":     "fte:asset_category:config",
    ".pak":    "fte:asset_category:pak",
    ".pk3":    "fte:asset_category:pk3",
    ".pk4":    "fte:asset_category:pk3",
    ".zip":    "fte:asset_category:pk3",
    ".wad":    "fte:asset_category:wad",
    ".bsp":    "fte:asset_category:map",
    ".mdl":    "fte:asset_category:model",
    ".md3":    "fte:asset_category:model",
    ".md2":    "fte:asset_category:model",
    ".iqm":    "fte:asset_category:model",
    ".wav":    "fte:asset_category:sound",
    ".ogg":    "fte:asset_category:sound",
    ".mp3":    "fte:asset_category:sound",
    ".qwd":    "fte:asset_category:demo",
    ".mvd":    "fte:asset_category:demo",
    ".dem":    "fte:asset_category:demo",
    ".qtv":    "fte:asset_category:demo",
    ".dz":     "fte:asset_category:demo_archive",
    ".lmp":    "fte:asset_category:hud_overlay",
    ".tga":    "fte:asset_category:texture",
    ".png":    "fte:asset_category:texture",
    ".jpg":    "fte:asset_category:texture",
    ".jpeg":   "fte:asset_category:texture",
    ".pcx":    "fte:asset_category:skin",
    # .log removed 2026-05-14 (refinement arc Phase B). Only catches write-path
    # FS_OpenVFS inside Log_String / PF_logtext / SV_Fraglogfile_f (2 "ab"
    # appends + 2 "rb" existence-check probes). No user installs .log files.
    ".loc":    "fte:asset_category:locfile",
    ".lit":    "fte:asset_category:map_lighting",
    ".dat":    "fte:asset_category:quakec_progs",
    ".spr":    "fte:asset_category:sprite",
    ".shader": "fte:asset_category:shader",
    ".dll":    "fte:asset_category:plugin",
    ".so":     "fte:asset_category:plugin",
}

GENERIC_LITERAL_CATEGORY = "fte:asset_category:other"

# Enclosing-function rules where the *role* of the enclosing context must
# override the function-name category. Checked BEFORE FUNCTION_TO_CATEGORY in
# the merge so the role wins. Use sparingly -- only when a generic loader
# (texture/shader) is being used to serve a more specific asset role.
#
# Skybox loads in FTE: R_SetSky calls R_LoadHiResTexture + R_RegisterShader
# directly, and the legacy 6-face path runs through Shader_ParseSkySides which
# also calls R_LoadHiResTexture in a loop. Without an override, the function-
# name tier wins and these sites read as texture/shader instead of skybox.
ENCLOSING_FN_CATEGORY_OVERRIDES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^R_SetSky$|^Shader_ParseSkySides$"), "fte:asset_category:skybox"),
    # Crosshair image cvar update path: R2D_Crosshair_Update calls
    # R_LoadHiResTexture(crosshairimage.string, "crosshairs", ...). The
    # function-name tier would default this to fte:asset_category:texture.
    (re.compile(r"^R2D_Crosshair_Update$"), "fte:asset_category:crosshair"),
    # Loading-plaque levelshot: SCR_ImageName builds "levelshots/<mapname>"
    # in a local buffer and calls R_LoadHiResTexture. Override needed because
    # the buffer is built via strcpy+COM_FileBase (not sprintf), so the
    # template-tracing helper can't recover a path_template/path_extension.
    # The m_single.c M_Menu_LoadSave_Preview_Draw site (R_RegisterPic on
    # "levelshots/%s") is intentionally NOT overridden here -- the same
    # function also loads save-game thumbnails ("saves/%s/screeny.tga").
    (re.compile(r"^SCR_ImageName$"), "fte:asset_category:levelshot"),
    # model_texture and map_texture in FTE flow through the generic shader
    # builders R_BuildDefaultTexnums / R_BuildLegacyTexnums (gl_shader.c),
    # which serve every shader-textured asset (BSP brush, alias model,
    # particle, lightmap, etc.). There is no enclosing-function signal that
    # separates "this R_LoadHiResTexture call is a model skin" from "this
    # one is a brush texture" -- the discrimination happens later inside
    # Image_LocateHighResTexture via the runtime path-template list. Until
    # the handler grows path-argument or subpath-argument analysis, both
    # slugs stay unresolved at the loader-site layer. Flagged in the
    # 2026-05-13 watchlist-coverage handoff.
    #
    # R2D_Conback_Callback owns the full conback loader chain: gfx/conback,
    # gfx/menu/conback.lmp, pics/conback.pcx, gfx/conback.lmp, plus a
    # R_RegisterCustom fallback. All 6 sites are conback variants; without
    # the override they split across hud_overlay / shader / texture.
    (re.compile(r"^R2D_Conback_Callback$"), "fte:asset_category:conback"),
    # Hexen2 conchars rebuilt into the Q1 charset system. Single FS_LoadFile
    # for gfx/menu/conchars.lmp; .lmp ext otherwise routes to hud_overlay.
    (re.compile(r"^Font_LoadHexen2Conchars$"), "fte:asset_category:charset"),
    # MD5 mesh model parser: 2 FS_FLocateFile sites for per-frame .lmp payloads
    # serving model-skin loading. Without the override the .lmp ext routes to
    # hud_overlay.
    (re.compile(r"^Mod_ParseMD5MeshModel$"), "fte:asset_category:model_texture"),
    # Player-skin preview in multiplayer setup menu: 3 FS_LoadFile sites for
    # gfx/menu/netp%i.lmp (Hexen2 class portrait), gfx/player/%s.lmp (custom
    # skin payload), gfx/menuplyr.lmp (default skin payload). All 3 are skin
    # data; .lmp ext otherwise routes to hud_overlay. L1 bucket is `skin`;
    # seed slug `player_skin` bridges via l1_hint_bare_categories: ["skin"].
    (re.compile(r"^MSetup_TransDraw$"), "fte:asset_category:skin"),
    # BSP brush-model load: Mod_FindName for "*%i:%s" (inline-model registration).
    # ENCLOSING_FN_CATEGORY_RULES catches LoadBrushModel substring and routes to
    # model; the role is map, not model.
    (re.compile(r"^Mod_LoadBrushModel$"), "fte:asset_category:map"),
    # Inline chat-embedded URL renderer: R_RegisterPic + R_RegisterShader +
    # R_RegisterCustom sites in Con_DrawConsoleLines fetch user-supplied URLs
    # embedded in chat-line text (tiprawimg / tiprawimgcube / tiprawimgarray),
    # not asset-typed file loads. New L1-internal category preserves filtering
    # information vs routing to null. Decision doc 2026-05-14 Phase 2 addendum.
    (re.compile(r"^Con_DrawConsoleLines$"), "fte:asset_category:inline_chat_url"),
    # FTE windowed-console UI chrome: R_RegisterPic loads of backshader /
    # backimage cvar values for the dev-console window background. Distinct
    # from gameplay `conback` (different rendering path, different filenames);
    # NOT folded into the conback slug per decision doc 2026-05-14.
    (re.compile(r"^Con_DrawConsole$"), "fte:asset_category:console_window_ui"),
]

ENCLOSING_FN_CATEGORY_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"Demo_File|Demo_f|PlayDemo|CL_Demo|CL_PlayDemo"), "fte:asset_category:demo"),
    # Screenshot-writer regex removed 2026-05-14 (refinement arc Phase B). It
    # caught FS_OpenVFS inside SCR_ScreenShot_f (one "rb" existence-check probe
    # to find a non-conflicting filename, not a content load) plus
    # Image_WriteKTXFile / Image_WriteDDSFile -- engine compressed-texture
    # encoders, not user screenshot writes. All 3 fall through to null with
    # confidence heuristic/intentionally_generic; downstream consumers skip
    # null categories.
    (re.compile(r"WAVCapture|_LoadSound|Sound_|S_Load"), "fte:asset_category:sound"),
    (re.compile(r"Skin_|R_LoadSkin"), "fte:asset_category:skin"),
    (re.compile(r"R_RegisterShader|Shader_|R_LoadShader"), "fte:asset_category:shader"),
    (re.compile(r"Model_|LoadModel|LoadBrushModel|Mod_LoadAlias|Mod_LoadSprite"), "fte:asset_category:model"),
    (re.compile(r"Config_|Cfg_|Exec_f|Cmd_Exec|ReadCfg|LoadConfig"), "fte:asset_category:config"),
    (re.compile(r"^FS_LoadPackFile|^COM_LoadPackFile|FS_AddPackage"), "fte:asset_category:pak"),
    # WAD2/WAD3 archive loads. W_LoadTextureWadFile handles both magic variants
    # (HL-style WAD3 + Quake-style WAD2); W_LoadWadFile is the legacy palette path.
    (re.compile(r"^W_LoadTextureWadFile$|^W_LoadWadFile$"), "fte:asset_category:wad"),
    # Generic texture decoders + texture-load wrappers. Image_Load* are format
    # decoders; the pre-existing screenshot regex incorrectly caught these
    # read-paths until it was narrowed above.
    (re.compile(r"^Image_Load|^LoadImagePixels$"), "fte:asset_category:texture"),
]

TRIGGER_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^(Host_Init|Sys_Init|CL_Init|R_Init|S_Init|Cvar_Init|FS_Init|VID_Init|Com_Init|Con_Init|SV_Init|M_Init|Mod_Init|COM_InitFilesystem|FS_ReloadPackFiles|Sh_RegisterShader_Init)\b"), "startup"),
    (re.compile(r"_Init(?:Module(?:FS)?|Crosshairs|Conback|Charset|Filesystem|Ex|Shaders|Textures)?$"), "startup"),
    (re.compile(r"^(CL_Connect|CL_ConnectionlessPacket|CL_ParseServerData|CL_ParseServerInfo|CL_ProcessServerInfo|CL_NewTranslation|CL_ParseUpdate|Skin_Skins_f|Skin_NextDownload)\b"), "on_connect"),
    (re.compile(r"^(CL_ParseMapSetup|R_NewMap|Mod_LoadBrushModel|GL_BuildLightmaps|R_LoadSkys|R_SetSky|Sky_NewMap|R_LoadHL2Map)\b"), "on_map_load"),
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


def _category_override_from_enclosing(enclosing: Optional[str]) -> Optional[str]:
    if not enclosing:
        return None
    for pat, cat in ENCLOSING_FN_CATEGORY_OVERRIDES:
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
    text = read_extent(source_bytes, cursor.extent).strip()
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
    template = strip_quotes(read_extent(source_bytes, lit_node.extent).strip())
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
        lit = strip_quotes(read_extent(source_bytes, node.extent).strip())
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


class AssetLoaderSitesFteHandler(Visitor):
    name = "asset-loader-sites"
    output_filename = "fte-asset-loader-sites-ast.json"

    def __init__(self):
        self._cvar_ident_map: dict[str, str] = {}

    def setup(self, *, fte_repo: Path, engine_dir: Path) -> None:
        here = Path(__file__).resolve().parent
        monorepo_root = here.parent.parent.parent.parent.parent
        candidate = monorepo_root / "apps/qw-oracle/scripts/extractors/fte/output/fte-variables-ast.json"
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

        cat_override = _category_override_from_enclosing(enclosing)
        cat_from_fn = FUNCTION_TO_CATEGORY.get(fn)
        cat_from_ext = _category_from_extension(path_literal) if path_literal else None
        cat_from_enclosing = _category_from_enclosing(enclosing)
        cat_fallback = GENERIC_LITERAL_CATEGORY if (path_source == "literal" and path_literal) else None
        reads_category_id = cat_override or cat_from_fn or cat_from_ext or cat_from_enclosing or cat_fallback

        has_specific_category = bool(cat_override or cat_from_fn or cat_from_ext)
        if path_source == "literal" and has_specific_category:
            confidence = "certain"
        elif reads_category_id or path_source in ("cvar", "computed"):
            confidence = "heuristic"
        elif fn in GENERIC_FS_PRIMITIVES and path_source == "unknown" and not reads_category_id:
            confidence = "intentionally_generic"
        else:
            confidence = "unclassified"

        load_trigger = _classify_load_trigger(enclosing)
        dev_only = 1 if _is_dev_only(enclosing) else 0

        notes = None
        if variant == "server":
            notes = "server-build variant"

        path_cvar_canonical = (
            f"fte:cvar:{self._cvar_ident_to_name(cvar_ident)}"
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
            s["canonical_id"] = f"fte:loader_site:{s['function_name']}_{basename}_{enc}_{ordinal}"

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
