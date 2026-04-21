#!/usr/bin/env python3
"""libclang-based extraction of ezQuake asset-loader call sites.

Walks every .c file in ezquake-source/src/ and captures every CALL_EXPR
whose callee is a known file-I/O / asset-loader function. Each call site
becomes one row with:

  - canonical_id    ezquake:loader_site:<fn>_<source_file_basename>_<enclosing>_<ordinal>
                    where ordinal is the nth call to <fn> inside
                    <enclosing> within <basename>, ordered by source_line
                    ascending. Line-number is NOT embedded -- upstream
                    edits that shift lines no longer ripple into keys.
  - function_name   the callee's spelling
  - source_file     basename of the .c file
  - source_line/col call-site position
  - enclosing_function  name of the function surrounding the call
  - reads_category_id   inferred asset category canonical_id, or null
  - load_trigger        startup|on_connect|on_map_load|on_demand|unknown
  - path_source         literal|cvar|computed|unknown
  - path_literal        if path_source == 'literal'
  - path_cvar_id        if path_source == 'cvar' (resolved to ezquake:cvar:<name>)
  - confidence          certain|heuristic|unclassified
  - dev_only            1 if enclosing function looks dev/debug, 0 otherwise

Dual-TU parse (default + SERVERONLY) matches the cvar extractor so
server-gated loader sites aren't missed.

Output: <repo>/packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
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
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-asset-loader-sites-diagnostics.log"

Config.set_library_file("libclang-18.so.1")


# ----- watchlist & heuristics ----------------------------------------------

# Loader functions we capture. Every entry takes the path/name at arg[0].
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

# Function-name -> category_id heuristic (when we can classify). Keys are
# case-sensitive prefix/exact matches.
FUNCTION_TO_CATEGORY: dict[str, str] = {
    "S_PrecacheSound": "ezquake:asset_category:sound",
    "W_LoadWadFile": "ezquake:asset_category:wad",
    "R_LoadCharsetImage": "ezquake:asset_category:charset",
    "Mod_ForName": "ezquake:asset_category:model",
    "Mod_FindName": "ezquake:asset_category:model",
    "Draw_CachePicSafe": "ezquake:asset_category:hud_overlay",
    "R_LoadPicImage": "ezquake:asset_category:texture",
}

# Extension -> category fallback when the callee is generic (FS_LoadFile /
# FS_OpenVFS) but the path literal ends in a recognisable extension.
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
}

# Fallback category when path_source is literal but no extension matches
# (e.g. "sources.txt", an internal history file, etc.). Keeps those sites
# in the heuristic bucket rather than unclassified.
GENERIC_LITERAL_CATEGORY = "ezquake:asset_category:other"

# Enclosing-function-name -> category. Catches generic FS_* loaders whose
# role is clear from the function wrapping them. First substring match wins.
ENCLOSING_FN_CATEGORY_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"Demo_File|Demo_f|PlayDemo|CL_Demo|PlayQWZ"), "ezquake:asset_category:demo"),
    (re.compile(r"Image_Write|Image_Load|_LoadImage|LoadImagePixels|_WriteTGA|_WritePNG|_WriteJPEG|_OpenAPNG"), "ezquake:asset_category:screenshot"),
    (re.compile(r"WAVCapture|_LoadSound|Sound_"), "ezquake:asset_category:sound"),
    (re.compile(r"Skin_"), "ezquake:asset_category:skin"),
    (re.compile(r"LoadCharset|Charset_"), "ezquake:asset_category:charset"),
    (re.compile(r"Model_|LoadModel|LoadBrushModel"), "ezquake:asset_category:model"),
    (re.compile(r"Config_|Cfg_|Exec_f|ReadCfg|LoadConfig"), "ezquake:asset_category:config"),
]

# load_trigger heuristic from enclosing-function-name prefix/substring.
# Evaluated in order; first match wins.
TRIGGER_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^(Host_Init|Sys_Init|CL_Init|R_Init|S_Init|Cvar_Init|FS_Init|VID_Init|Com_Init|Con_Init|SV_Init|M_Init)\b"), "startup"),
    (re.compile(r"_Init(?:Module(?:FS)?|Crosshairs|Conback|Charset|Filesystem|Ex)?$"), "startup"),
    (re.compile(r"^(CL_Connect|CL_ConnectionlessPacket|CL_ParseServerData|CL_ParseServerInfo|CL_ProcessServerInfo|CL_NewTranslation|CL_ParseUpdate|Skin_Skins_f|Skin_NextDownload)\b"), "on_connect"),
    (re.compile(r"^(CL_ParseMapSetup|R_NewMap|Mod_LoadBrushModel|GL_BuildLightmaps|R_LoadSkys|R_SetSky|Sky_NewMap)\b"), "on_map_load"),
]

# dev_only heuristic from enclosing-function-name.
DEV_ONLY_RULES: list[re.Pattern] = [
    re.compile(r"^(Dev_|Debug_|Test_|Bench_)"),
    re.compile(r"_Debug_f$"),
    re.compile(r"^dev_"),
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
class LoaderSite:
    canonical_id: str
    function_name: str
    source_file: str
    source_line: int
    source_column: int
    enclosing_function: Optional[str]
    reads_category_id: Optional[str]
    load_trigger: str
    path_source: str
    path_literal: Optional[str]
    path_cvar_id: Optional[str]
    confidence: str
    dev_only: int
    notes: Optional[str] = None
    # Path 1 additions.
    path_template: Optional[str] = None
    path_parameters: Optional[list] = None
    path_extension: Optional[str] = None
    format_function: Optional[str] = None


# ----- helpers --------------------------------------------------------------


def read_extent_text(source_bytes: bytes, extent) -> str:
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return ""
    try:
        return source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return ""


def strip_quotes(s: str) -> str:
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


def _category_from_extension(path: str) -> Optional[str]:
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
    """If the argument is a <cvar>.string MEMBER_REF_EXPR, return the cvar's
    short name (i.e. the C identifier of the enclosing cvar_t VAR_DECL)."""
    # Walk into UNEXPOSED_EXPR wrappers.
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
    # The base expression of the member ref is the first child.
    base = None
    for c in node.get_children():
        base = c
        break
    if base is None:
        return None
    # Drill through UNEXPOSED_EXPR into DECL_REF_EXPR.
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
    return ref.spelling  # C identifier — maps to cvar name in a later pass


FORMAT_FUNCTIONS: dict[str, int] = {
    # function_name -> index of the format-string argument
    "va":          0,
    "sprintf":     1,   # sprintf(buf, fmt, ...)
    "snprintf":    2,   # snprintf(buf, size, fmt, ...)
    "Q_snprintfz": 2,   # ezQuake's bounded snprintf wrapper
}

def _conversion_slots(fmt: str) -> list[str]:
    """Return %-conversion specifiers in fmt, in order. Skips '%%'.
    Example: 'maps/%s_%d.tga' -> ['%s', '%d']."""
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
    """Single-line source-extent snippet for a cursor."""
    text = read_extent_text(source_bytes, cursor.extent).strip()
    return " ".join(text.split())


def _extension_from_template(tpl: str) -> Optional[str]:
    """Return '.<ext>' if the template has a literal suffix ending in '.<ext>';
    None otherwise. Any '%' after the last '.' disqualifies."""
    if not tpl:
        return None
    dot = tpl.rfind('.')
    if dot < 0:
        return None
    suffix = tpl[dot:]
    if '%' in suffix:
        return None
    return suffix


def _classify_parameterized_call(call_cursor, source_bytes: bytes):
    """If call_cursor is a format-family call (va/sprintf/snprintf/Q_snprintfz),
    return (template, parameters, extension, format_function). Else None."""
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
    template = strip_quotes(read_extent_text(source_bytes, lit_node.extent).strip())

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


def _find_enclosing_compound_from_stack(compound_stack):
    """Return the innermost COMPOUND_STMT from the visitor's compound_stack,
    or None if we're not currently inside one. libclang's semantic_parent is
    unreliable for expression cursors, so the caller must maintain this stack
    via a pre-order traversal."""
    return compound_stack[-1] if compound_stack else None


def _lookup_buffer_write_in_compound(compound, var_name: str, before_line: int,
                                      before_col: int, source_bytes: bytes):
    """Find the nearest format-family CALL_EXPR whose first arg is a
    DECL_REF_EXPR to var_name, occurring strictly before (before_line, before_col)
    inside compound. Returns parameterization tuple or None."""
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


def _resolve_semantic(arg_cursor, snippet: str) -> str:
    """Best-effort semantic label for a format-call argument."""
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


def _classify_first_arg(arg_cursor, source_bytes: bytes, enclosing_compound=None):
    """Return (path_source, path_literal, cvar_ident, parameterization).
    parameterization is (template, parameters, extension, format_function) or None.
    enclosing_compound, if provided, enables backward-lookup for DECL_REF_EXPR
    arguments (buffer written earlier by sprintf/snprintf/Q_snprintfz)."""
    node = arg_cursor
    for _ in range(4):
        if node.kind in (CursorKind.STRING_LITERAL, CursorKind.MEMBER_REF_EXPR, CursorKind.CALL_EXPR, CursorKind.DECL_REF_EXPR):
            break
        ch = list(node.get_children())
        if not ch:
            break
        node = ch[0]

    if node.kind == CursorKind.STRING_LITERAL:
        lit = strip_quotes(read_extent_text(source_bytes, node.extent).strip())
        return "literal", lit, None, None

    cvar_ident = _resolve_cvar_ref(arg_cursor)
    if cvar_ident:
        return "cvar", None, cvar_ident, None

    if node.kind == CursorKind.CALL_EXPR:
        param = _classify_parameterized_call(node, source_bytes)
        if param is not None:
            template = param[0]
            # path_literal keeps the template for DB back-compat; new fields
            # carry the structured data.
            return "computed", template, None, param
        return "computed", None, None, None

    if node.kind == CursorKind.DECL_REF_EXPR and enclosing_compound is not None:
        loc = arg_cursor.location
        param = _lookup_buffer_write_in_compound(
            enclosing_compound, node.spelling, loc.line, loc.column, source_bytes,
        )
        if param is not None:
            template = param[0]
            return "computed", template, None, param
        # Fall through to "unknown" below when no backward write found.

    return "unknown", None, None, None


# ----- extraction -----------------------------------------------------------


def extract_from_file(path: Path, diagnostics: list[str]) -> list[LoaderSite]:
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
    collected: list[LoaderSite] = []
    seen_keys: set[tuple[str, str, int, int]] = set()

    def walk(root, label: str):
        # Visitor that maintains stacks of enclosing function names and
        # COMPOUND_STMT ancestors. The compound stack lets backward-lookup
        # helpers find buffer writes in the same block as a loader call
        # (libclang's semantic_parent is unreliable for expression cursors).
        func_stack: list[str] = []
        compound_stack: list = []

        def visit(node):
            pushed = False
            pushed_compound = False
            if node.kind == CursorKind.FUNCTION_DECL:
                # Only push when we're entering the function body, i.e. the
                # node has a COMPOUND_STMT child.
                if any(c.kind == CursorKind.COMPOUND_STMT for c in node.get_children()):
                    func_stack.append(node.spelling or "?")
                    pushed = True
            if node.kind == CursorKind.COMPOUND_STMT:
                compound_stack.append(node)
                pushed_compound = True

            if (
                node.kind == CursorKind.CALL_EXPR
                and node.spelling in LOADER_FUNCTIONS
                and node.location.file is not None
                and os.path.samefile(node.location.file.name, target_path)
            ):
                fn = node.spelling
                src_line = node.location.line
                src_col = node.location.column
                key = (fn, path.name, src_line, src_col)
                if key not in seen_keys:
                    seen_keys.add(key)
                    enclosing = func_stack[-1] if func_stack else None
                    enclosing_compound = _find_enclosing_compound_from_stack(compound_stack)
                    args = list(node.get_arguments())
                    if args:
                        path_source, path_literal, cvar_ident, parameterization = _classify_first_arg(args[0], source_bytes, enclosing_compound)
                    else:
                        path_source, path_literal, cvar_ident, parameterization = ("unknown", None, None, None)

                    path_template = None
                    path_parameters = None
                    path_extension = None
                    format_function = None
                    if parameterization is not None:
                        path_template, path_parameters, path_extension, format_function = parameterization

                    # Category inference.
                    cat_from_fn = FUNCTION_TO_CATEGORY.get(fn)
                    cat_from_ext = _category_from_extension(path_literal) if path_literal else None
                    cat_from_enclosing = _category_from_enclosing(enclosing)
                    cat_fallback = GENERIC_LITERAL_CATEGORY if (path_source == "literal" and path_literal) else None
                    reads_category_id = cat_from_fn or cat_from_ext or cat_from_enclosing or cat_fallback

                    # Confidence classification.
                    #   certain       literal path AND a specific (non-fallback) category
                    #   heuristic     category known by fn, ext-matched, or path cvar/computed
                    #                 (also includes literal paths falling back to 'other')
                    #   unclassified  no path, no category, no function hint
                    has_specific_category = bool(cat_from_fn or cat_from_ext)
                    if path_source == "literal" and has_specific_category:
                        confidence = "certain"
                    elif reads_category_id or path_source in ("cvar", "computed"):
                        confidence = "heuristic"
                    else:
                        confidence = "unclassified"

                    load_trigger = _classify_load_trigger(enclosing)
                    dev_only = 1 if _is_dev_only(enclosing) else 0

                    # canonical_id is assigned in main() post-collection
                    # so ordinals are stable per (fn, enclosing, basename).
                    canonical = ""

                    notes = None
                    if label == "server":
                        notes = "server-build variant"

                    path_cvar_canonical = (
                        f"ezquake:cvar:{_cvar_ident_to_name(cvar_ident)}"
                        if cvar_ident else None
                    )

                    collected.append(LoaderSite(
                        canonical_id=canonical,
                        function_name=fn,
                        source_file=path.name,
                        source_line=src_line,
                        source_column=src_col,
                        enclosing_function=enclosing,
                        reads_category_id=reads_category_id,
                        load_trigger=load_trigger,
                        path_source=path_source,
                        path_literal=path_literal,
                        path_cvar_id=path_cvar_canonical,
                        confidence=confidence,
                        dev_only=dev_only,
                        notes=notes,
                        path_template=path_template,
                        path_parameters=path_parameters,
                        path_extension=path_extension,
                        format_function=format_function,
                    ))

            for c in node.get_children():
                visit(c)

            if pushed:
                func_stack.pop()
            if pushed_compound:
                compound_stack.pop()

        visit(root)

    walk(tu.cursor, "default")
    walk(tu_server.cursor, "server")

    return collected


# Map C identifier (e.g. `cl_teamskin`) back to registered cvar name
# (e.g. `teamskin`). The mapping is best-effort: we look up the
# registered-name table from the cvars-ast JSON if it exists, otherwise
# fall back to the C identifier as-is (loader will warn on stale refs).
_CVAR_IDENT_MAP: dict[str, str] = {}


def _load_cvar_ident_map() -> None:
    """Populate _CVAR_IDENT_MAP from the existing cvars AST JSON."""
    candidate = REPO_ROOT / "packages/qw-config/src/data/ezquake-variables-ast.json"
    if not candidate.is_file():
        return
    try:
        data = json.loads(candidate.read_text())
    except Exception:
        return
    # Shape is { "vars": { "<cvar_name>": { "ast": { "c_ident": "...", ... } } }, ... }.
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


def _cvar_ident_to_name(ident: Optional[str]) -> Optional[str]:
    if ident is None:
        return None
    return _CVAR_IDENT_MAP.get(ident, ident)


# ----- main -----------------------------------------------------------------


def main() -> int:
    print("ezQuake asset-loader call-site extraction")
    print(f"  repo:   {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    if not EZQ_SRC.is_dir():
        print(f"ERROR: ezquake-source/src not found at {EZQ_SRC}", file=sys.stderr)
        return 1

    _load_cvar_ident_map()
    print(f"  cvar ident -> name map: {len(_CVAR_IDENT_MAP)} entries")

    diagnostics: list[str] = []
    sites: list[LoaderSite] = []

    c_files = sorted(EZQ_SRC.glob("*.c"))
    print(f"  scanning {len(c_files)} .c files")
    for i, f in enumerate(c_files, 1):
        if i % 20 == 0:
            print(f"    [{i}/{len(c_files)}] {f.name}")
        sites.extend(extract_from_file(f, diagnostics))

    # Exact-duplicate dedup (same site observed in both default + server TUs).
    # seen_keys inside extract_from_file covers intra-file dup; belt-and-braces
    # cross-file check here in case a site ever slips through.
    dedup: dict[tuple[str, str, int, int], LoaderSite] = {}
    for s in sites:
        k = (s.function_name, s.source_file, s.source_line, s.source_column)
        if k in dedup:
            continue
        dedup[k] = s
    sites = list(dedup.values())

    # Assign ordinals per (function_name, enclosing_function, source_file) group,
    # sorting by source_line ascending so ordinals are deterministic and stable
    # across upstream line-shifts. The canonical_id is
    # ezquake:loader_site:<fn>_<basename>_<enclosing>_<ordinal>.
    sites.sort(key=lambda s: (
        s.source_file,
        s.enclosing_function or "",
        s.function_name,
        s.source_line,
        s.source_column,
    ))
    ordinal_counters: dict[tuple[str, str, str], int] = defaultdict(int)
    for s in sites:
        basename = s.source_file.rsplit(".", 1)[0]
        enc = s.enclosing_function or "global"
        group_key = (s.function_name, enc, s.source_file)
        ordinal_counters[group_key] += 1
        ordinal = ordinal_counters[group_key]
        s.canonical_id = f"ezquake:loader_site:{s.function_name}_{basename}_{enc}_{ordinal}"

    # Resort into emission order (source_file, source_line). Does not affect
    # canonical_ids (already assigned above) -- only JSON output ordering.
    sites = sorted(sites, key=lambda x: (x.source_file, x.source_line, x.source_column))

    # Stats.
    by_fn: dict[str, int] = {}
    by_conf: dict[str, int] = {}
    by_trigger: dict[str, int] = {}
    by_path_source: dict[str, int] = {}
    dev_count = 0
    for s in sites:
        by_fn[s.function_name] = by_fn.get(s.function_name, 0) + 1
        by_conf[s.confidence] = by_conf.get(s.confidence, 0) + 1
        by_trigger[s.load_trigger] = by_trigger.get(s.load_trigger, 0) + 1
        by_path_source[s.path_source] = by_path_source.get(s.path_source, 0) + 1
        if s.dev_only:
            dev_count += 1

    stats = {
        "total_sites": len(sites),
        "by_function": dict(sorted(by_fn.items(), key=lambda kv: -kv[1])),
        "by_confidence": by_conf,
        "by_load_trigger": by_trigger,
        "by_path_source": by_path_source,
        "dev_only_count": dev_count,
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    output = {
        "loader_sites": [s.__dict__ for s in sites],
        "_stats": stats,
    }
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    print()
    print(f"  total sites: {stats['total_sites']}")
    print(f"  by function:")
    for fn, n in stats["by_function"].items():
        print(f"    {fn:<24} {n}")
    print(f"  by confidence: {stats['by_confidence']}")
    print(f"  by load_trigger: {stats['by_load_trigger']}")
    print(f"  by path_source: {stats['by_path_source']}")
    print(f"  dev_only: {stats['dev_only_count']}")
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
