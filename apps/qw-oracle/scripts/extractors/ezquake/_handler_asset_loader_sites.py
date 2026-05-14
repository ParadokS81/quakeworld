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
import sys
from collections import defaultdict
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import read_extent, strip_quotes  # noqa: E402


LOADER_FUNCTIONS: set[str] = {
    # FS primitives (generic; categorized by enclosing function or path extension)
    "FS_LoadFile",
    "FS_LoadHeapFile",          # call-graph audit 2026-05-14: used by config exec, fragfiles, palette reload, locfiles
    "FS_LoadHunkFile",
    "FS_LoadTempFile",          # call-graph audit 2026-05-14: used by skywind, sound, model, charset loaders
    "FS_OpenVFS",
    "FS_WriteFile",

    # Pre-existing categorized loaders
    "Draw_CachePicSafe",
    "Mod_FindName",
    "Mod_ForName",
    "PlayQWZDemo",
    "R_LoadCharsetImage",
    "R_LoadImagePixels",
    "R_LoadPicImage",
    "S_PrecacheSound",
    "TP_LoadLocFile",
    "W_LoadWadFile",

    # Sky / skybox (call-graph audit 2026-05-14)
    "Mod_LoadExternalSkyTexture",
    "R_LoadSkyTexturePixels",
    "Sky_LoadSkyboxTextures",

    # Models (call-graph audit 2026-05-14)
    "Mod_LoadAlias3Model",
    "Mod_LoadAliasModel",
    "Mod_LoadAllSkins",
    "Mod_LoadBrushModel",
    "Mod_LoadExternalSkin",
    "Mod_LoadExternalSpriteSkin",
    "Mod_LoadExternalTexture",
    "Mod_LoadLighting",
    "Mod_LoadModel",
    "Mod_LoadSimpleTexture",
    "Mod_LoadSpriteFrame",
    "Mod_LoadTextures",
    "Mod_MD3LoadSkins",
    "Mod_ReadFlagsFromMD1",
    "R_LoadBrushModelTextures",

    # Textures / images (call-graph audit 2026-05-14)
    "Image_LoadJPEG",
    "Image_LoadPCX",
    "Image_LoadPNG",
    "Image_LoadPNG_All",
    "Image_LoadTGA",
    # Image_OpenAPNG removed 2026-05-14 (refinement arc Phase B). It is a
    # "wb" movie-capture APNG writer at image.c:991,993, not a loader.
    # Watchlist inclusion was emitting a phantom texture site via
    # Movie_Demo_Capture_f (path template `%s/capture_.../capture.png`).
    "QMB_LoadTextureImage",
    "R_LoadTextureImage",

    # Charset (call-graph audit 2026-05-14)
    "Draw_LoadCharset",
    "Load_LMP_Charset",
    "Load_Locale_Charset",

    # Skins -- player (call-graph audit 2026-05-14)
    "Skin_Cache",
    "Skin_PixelsLoad",

    # HUD / UI / 2D (call-graph audit 2026-05-14)
    "CL_LoginImageLoad",
    "Draw_CachePic",
    "Draw_CacheWadPic",
    "SCR_HUD_LoadGroupPic",
    "SCR_LoadCursorImage",

    # Sound (call-graph audit 2026-05-14)
    "S_LoadSound",

    # Map / BSP + lighting (call-graph audit 2026-05-14)
    "CM_LoadMap",
    "CM_LoadPhysicsNormals",
    "CM_OpenMap",
    "LoadColoredLighting",

    # Demo (call-graph audit 2026-05-14)
    "CL_Open_Demo_File",

    # Archive (call-graph audit 2026-05-14)
    "WAD3_LoadWadFile",

    # QuakeC / VM (call-graph audit 2026-05-14)
    "PR1_LoadProgs",
    "PR2_LoadProgs",
    "VM_LoadQVM",
    "VM_LoadSymbols",

    # Palette / colormap (call-graph audit 2026-05-14)
    "ReloadPaletteAndColormap",

    # Frag stats (call-graph audit 2026-05-14)
    "LoadFragFile",
}

# Generic filesystem primitives. When called with a non-literal path and no
# resolvable category, the call site is the FS layer itself (or a runtime-
# filename consumer like QuakeC builtins) rather than an asset loader. Stamp
# these as `intentionally_generic` instead of `unclassified` so the review
# skill can distinguish "we know this is FS-layer code" from "novel finding
# that needs triage."
GENERIC_FS_PRIMITIVES: set[str] = {
    "FS_LoadFile",
    "FS_LoadHeapFile",
    "FS_LoadHunkFile",
    "FS_LoadTempFile",
    "FS_OpenVFS",
    "FS_WriteFile",
}

FUNCTION_TO_CATEGORY: dict[str, str] = {
    # Pre-existing
    "Draw_CachePicSafe": "ezquake:asset_category:hud_overlay",
    "Mod_FindName": "ezquake:asset_category:model",
    "Mod_ForName": "ezquake:asset_category:model",
    "PlayQWZDemo": "ezquake:asset_category:demo_archive",
    "R_LoadCharsetImage": "ezquake:asset_category:charset",
    "R_LoadPicImage": "ezquake:asset_category:texture",
    "S_PrecacheSound": "ezquake:asset_category:sound",
    "TP_LoadLocFile": "ezquake:asset_category:locfile",
    "W_LoadWadFile": "ezquake:asset_category:wad",

    # Sky / skybox (call-graph audit 2026-05-14)
    "Mod_LoadExternalSkyTexture": "ezquake:asset_category:skybox",
    "R_LoadSkyTexturePixels": "ezquake:asset_category:skybox",
    "Sky_LoadSkyboxTextures": "ezquake:asset_category:skybox",

    # Models (call-graph audit 2026-05-14)
    "Mod_LoadAlias3Model": "ezquake:asset_category:model",
    "Mod_LoadAliasModel": "ezquake:asset_category:model",
    "Mod_LoadBrushModel": "ezquake:asset_category:map",
    "Mod_LoadModel": "ezquake:asset_category:model",
    "Mod_LoadSpriteFrame": "ezquake:asset_category:sprite",
    "Mod_ReadFlagsFromMD1": "ezquake:asset_category:model",

    # Model textures / skins (call-graph audit 2026-05-14)
    "Mod_LoadAllSkins": "ezquake:asset_category:model_texture",
    "Mod_LoadExternalSkin": "ezquake:asset_category:model_texture",
    "Mod_LoadExternalSpriteSkin": "ezquake:asset_category:model_texture",
    "Mod_LoadSimpleTexture": "ezquake:asset_category:model_texture",
    "Mod_MD3LoadSkins": "ezquake:asset_category:model_texture",

    # Map textures / lighting (call-graph audit 2026-05-14)
    "Mod_LoadExternalTexture": "ezquake:asset_category:map_texture",
    "Mod_LoadTextures": "ezquake:asset_category:map_texture",
    "R_LoadBrushModelTextures": "ezquake:asset_category:map_texture",
    "Mod_LoadLighting": "ezquake:asset_category:map_lighting",
    "LoadColoredLighting": "ezquake:asset_category:map_lighting",

    # Map / BSP (call-graph audit 2026-05-14)
    "CM_LoadMap": "ezquake:asset_category:map",
    "CM_LoadPhysicsNormals": "ezquake:asset_category:map",
    "CM_OpenMap": "ezquake:asset_category:map",

    # Textures / images (call-graph audit 2026-05-14)
    "Image_LoadJPEG": "ezquake:asset_category:texture",
    "Image_LoadPCX": "ezquake:asset_category:skin",
    "Image_LoadPNG": "ezquake:asset_category:texture",
    "Image_LoadPNG_All": "ezquake:asset_category:texture",
    "Image_LoadTGA": "ezquake:asset_category:texture",
    # Image_OpenAPNG removed 2026-05-14 (refinement arc Phase B); see note in
    # LOADER_FUNCTIONS above.
    "QMB_LoadTextureImage": "ezquake:asset_category:texture",
    "R_LoadTextureImage": "ezquake:asset_category:texture",

    # Charset (call-graph audit 2026-05-14)
    "Draw_LoadCharset": "ezquake:asset_category:charset",
    "Load_LMP_Charset": "ezquake:asset_category:charset",
    "Load_Locale_Charset": "ezquake:asset_category:charset",

    # Skins -- player (call-graph audit 2026-05-14)
    "Skin_Cache": "ezquake:asset_category:skin",
    "Skin_PixelsLoad": "ezquake:asset_category:skin",

    # HUD / UI / 2D (call-graph audit 2026-05-14)
    "CL_LoginImageLoad": "ezquake:asset_category:hud_overlay",
    "Draw_CachePic": "ezquake:asset_category:hud_overlay",
    "Draw_CacheWadPic": "ezquake:asset_category:hud_overlay",
    "SCR_HUD_LoadGroupPic": "ezquake:asset_category:hud_overlay",
    "SCR_LoadCursorImage": "ezquake:asset_category:hud_overlay",

    # Sound (call-graph audit 2026-05-14)
    "S_LoadSound": "ezquake:asset_category:sound",

    # Demo (call-graph audit 2026-05-14)
    "CL_Open_Demo_File": "ezquake:asset_category:demo",

    # Archive (call-graph audit 2026-05-14)
    "WAD3_LoadWadFile": "ezquake:asset_category:wad",

    # QuakeC / VM (call-graph audit 2026-05-14)
    "PR1_LoadProgs": "ezquake:asset_category:quakec_progs",
    "PR2_LoadProgs": "ezquake:asset_category:quakec_progs",
    "VM_LoadQVM": "ezquake:asset_category:quakec_progs",
    "VM_LoadSymbols": "ezquake:asset_category:quakec_progs",

    # Palette / colormap (call-graph audit 2026-05-14)
    "ReloadPaletteAndColormap": "ezquake:asset_category:palette",

    # Frag stats (call-graph audit 2026-05-14)
    "LoadFragFile": "ezquake:asset_category:config",
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
    # .log removed 2026-05-14 (refinement arc Phase B). Dormant (0 sites);
    # symmetric with the FTE removal. No user installs .log files.
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

# Enclosing-function rules where the *role* of the enclosing context must
# override the function-name category. Checked BEFORE FUNCTION_TO_CATEGORY in
# the merge so the role wins. Use sparingly -- only when a generic loader
# (texture/shader) is being used to serve a more specific asset role.
ENCLOSING_FN_CATEGORY_OVERRIDES: list[tuple[re.Pattern, str]] = [
    # Crosshair cvar OnChange handler loads crosshairs/<name>.{png,tga,pcx}
    # via Draw_CachePicSafe; the function-name tier would otherwise tag it as
    # hud_overlay (Draw_CachePicSafe's default category).
    (re.compile(r"^OnChange_crosshairimage$"), "ezquake:asset_category:crosshair"),
    # Per-map console-background overlay drawn from textures/levelshots/<map>.
    # Single Draw_CachePicSafe call inside Draw_ConsoleBackground; without the
    # override the site would emit as hud_overlay.
    (re.compile(r"^Draw_ConsoleBackground$"), "ezquake:asset_category:levelshot"),
    # Hi-res model-skin replacement: textures/models/<identifier> + textures/<identifier>.
    # All R_LoadImagePixels sites inside Mod_LoadExternalSkin serve model_texture;
    # previously folded into the generic "texture" rule below.
    (re.compile(r"^Mod_LoadExternalSkin$"), "ezquake:asset_category:model_texture"),
    # Hi-res brush-model texture replacement: textures/<map>/<tex>, textures/<group>/<tex>,
    # textures/bmodels/<tex>, textures/<tex>. All R_LoadImagePixels sites inside
    # Mod_LoadExternalTexture serve map_texture; previously folded into "texture".
    (re.compile(r"^Mod_LoadExternalTexture$"), "ezquake:asset_category:map_texture"),
    # Sky overlay textures from BSP-internal sky-overlay replacements at
    # textures/<mapname>/<bsp_skytex>_{solid,alpha}.<ext>. The called function is
    # R_LoadTextureImage which routes to texture via FUNCTION_TO_CATEGORY; the
    # role (sky overlay) wins. Operator decision per refinement arc 2026-05-14:
    # keep at skybox (asset-note documents the dual install-layout mechanism).
    (re.compile(r"^Mod_LoadExternalSkyTexture$"), "ezquake:asset_category:skybox"),
    # Skywind config loader: gfx/env/<name>/skywind.cfg. FS_LoadTempFile primitive
    # has no FUNCTION_TO_CATEGORY entry; without the override the site stays null.
    # Symmetric to the FTE R_SetSky|Shader_ParseSkySides skybox override above.
    (re.compile(r"^Skywind_Load_f$"), "ezquake:asset_category:skybox"),
    # LMP charset loader: gfx/<name>.lmp via FS_LoadTempFile. Without the override,
    # the .lmp extension routes to hud_overlay. Load_LMP_Charset is in
    # FUNCTION_TO_CATEGORY but that mapping only fires when it is the CALLED
    # function, not the enclosing context for the FS primitive.
    (re.compile(r"^Load_LMP_Charset$"), "ezquake:asset_category:charset"),
    # Frag-stats config: ../ezquake/fragfile.dat via FS_LoadHeapFile. Without
    # the override, the .dat extension routes to quakec_progs (QuakeC bytecode),
    # but fragfile.dat is fuhquake-derived fragstats config text, not QC bytecode.
    # Confirmed at research/repos/ezquake-source/src/fragstats.c:37.
    (re.compile(r"^LoadFragFile$"), "ezquake:asset_category:config"),
]

ENCLOSING_FN_CATEGORY_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"Demo_File|Demo_f|PlayDemo|CL_Demo|PlayQWZ"), "ezquake:asset_category:demo"),
    # Screenshot-writer regex removed 2026-05-14 (refinement arc Phase B). It
    # caught FS_OpenVFS inside Image_WritePNG / Image_OpenAPNG / Image_WriteTGA /
    # Image_WriteJPEG -- all "wb" writes, not loader sites by definition.
    # Sites now fall through to null reads_category_id with confidence
    # intentionally_generic; downstream consumers skip null categories.
    (re.compile(r"WAVCapture|_LoadSound|Sound_"), "ezquake:asset_category:sound"),
    (re.compile(r"Skin_"), "ezquake:asset_category:skin"),
    (re.compile(r"LoadCharset|Charset_"), "ezquake:asset_category:charset"),
    (re.compile(r"Model_|LoadModel|LoadBrushModel"), "ezquake:asset_category:model"),
    (re.compile(r"Config_|Cfg_|Exec_f|ReadCfg|LoadConfig"), "ezquake:asset_category:config"),
    # BSP/map family -- CM_OpenMap opens the .bsp; SV_SpawnServer reads .ent
    # overrides; CM_LoadPhysicsNormals reads .qpn; R_ReadPointFile_f reads .pts.
    (re.compile(r"^CM_OpenMap$|^CM_LoadPhysicsNormals$|^SV_SpawnServer$|^R_ReadPointFile_f$"), "ezquake:asset_category:map"),
    # Skybox loader chain: R_SetSky -> Sky_LoadSkyboxTextures -> R_LoadSkyTexturePixels -> R_LoadImagePixels.
    # Must come BEFORE the generic texture rule so skybox faces aren't swallowed.
    (re.compile(r"^R_SetSky$|^Sky_LoadSkyboxTextures$|^R_LoadSkyTexturePixels$"), "ezquake:asset_category:skybox"),
    # WAD3 (Half-Life-style) wad-file loads.
    (re.compile(r"^WAD3_LoadWadFile$"), "ezquake:asset_category:wad"),
    # HUD-overlay-style image loads (chat icons, particle font).
    (re.compile(r"^R_InitChatIcons$|^QMB_InitParticles$"), "ezquake:asset_category:hud_overlay"),
    # Generic texture decoders + texture-load wrappers. Image_Load* are format
    # decoders (PNG/TGA/JPEG/PCX); R_LoadImagePixels/R_LoadTextureImage/R_LoadPicImage
    # are wrapper bodies. The pre-existing screenshot regex incorrectly caught
    # these read-paths until it was narrowed above.
    (re.compile(r"^Image_Load|^R_LoadImagePixels$|^R_LoadTextureImage$|^R_LoadPicImage$"), "ezquake:asset_category:texture"),
]

TRIGGER_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^(Host_Init|Sys_Init|CL_Init|R_Init|S_Init|Cvar_Init|FS_Init|VID_Init|Com_Init|Con_Init|SV_Init|M_Init)\b"), "startup"),
    (re.compile(r"_Init(?:Module(?:FS)?|Crosshairs|Conback|Charset|Filesystem|Ex)?$"), "startup"),
    (re.compile(r"^(CL_Connect|CL_ConnectionlessPacket|CL_ParseServerData|CL_ParseServerInfo|CL_ProcessServerInfo|CL_NewTranslation|CL_ParseUpdate|Skin_Skins_f|Skin_NextDownload)\b"), "on_connect"),
    (re.compile(r"^(CL_ParseMapSetup|R_NewMap|Mod_LoadBrushModel|GL_BuildLightmaps|Sky_LoadSkyboxTextures|R_SetSky|Sky_NewMap)\b"), "on_map_load"),
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


class AssetLoaderSitesEzquakeHandler(Visitor):
    """ezQuake asset loader-sites handler (Pattern 5/12 detection).

    Target consumer fork: unezQuake. The richest extraction surface in the
    suite -- 13+ classification axes (path source, format function,
    template, parameters, extension, category, confidence, trigger,
    dev_only). Forks that ship new loader primitives or new asset
    categories will likely override here.

    Fork override hooks:
      - visit_cursor: detects every CALL_EXPR to a LOADER_FUNCTIONS member
        and collects classification fields. Override to widen the loader-
        site detection (e.g. add a fork-specific loader API).
      - finalize: dedup + canonical_id assignment + summary stats. Short.
      - LOADER_FUNCTIONS / GENERIC_FS_PRIMITIVES / FUNCTION_TO_CATEGORY /
        EXT_TO_CATEGORY / ENCLOSING_FN_CATEGORY_RULES / TRIGGER_RULES /
        DEV_ONLY_RULES / FORMAT_FUNCTIONS (module-level): the eight
        classification surfaces a fork is most likely to extend. Each
        operates as a free-function input today; hoisting any to the
        class would force restructuring the helper graph -- defer until
        a fork actually pressures it.
      - _classify_first_arg / _classify_parameterized_call (module-level
        helpers): the path-source classifier. Fork override would route
        through subclassing visit_cursor and substituting the helper
        call.
    """
    name = "asset-loader-sites"
    output_filename = "ezquake-asset-loader-sites-ast.json"

    def __init__(self):
        self._cvar_ident_map: dict[str, str] = {}

    def setup(self, *, ezq_repo: Path, ezq_src: Path) -> None:
        here = Path(__file__).resolve().parent
        monorepo_root = here.parent.parent.parent.parent.parent
        candidate = monorepo_root / "apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-variables-ast.json"
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

    # Fork override hook: extend LOADER_FUNCTIONS dispatch or path-classification
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

    # Fork override hook: alter canonical_id assignment or summary stats
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
