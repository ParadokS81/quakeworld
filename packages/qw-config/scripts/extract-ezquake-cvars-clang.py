#!/usr/bin/env python3
"""Research spike: libclang-based extraction of ezQuake cvars.

Parses every .c file in ezquake-source/src/ as a C translation unit and
captures, per cvar_t declaration:

  - cvar name, C identifier, default value
  - flags (raw source text of field 2, e.g. "CVAR_USERINFO | CVAR_NO_RESET")
  - flag names (parsed array: ["CVAR_USERINFO", "CVAR_NO_RESET"])
  - OnChange callback name (resolved via the AST, not text-matched)
  - storage class (static vs extern)
  - source file, line, column
  - group (resolved via Cvar_SetCurrentGroup / Cvar_Register flow analysis)
  - Cvar_SetBounds / Cvar_SetRange linkage (min, max) if present

Merged with help_variables.json enrichment (desc, type, enum values, remarks)
the same way the existing regex extractor does.

Output: <repo>/packages/qw-config/src/data/ezquake-variables-ast.json
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from clang.cindex import Config, CursorKind, Index, StorageClass, TranslationUnit

# ----- paths -----------------------------------------------------------------

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent
# CLI flags: --repo-root <path>    (default: research/repos/ezquake-source under REPO_ROOT)
#            --output <json-path>  (default: packages/qw-config/src/data/ezquake-variables-ast.json)
import argparse

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = EZQ_REPO / "src"
HELP_JSON = EZQ_REPO / "help_variables.json"
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-variables-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-spike-diagnostics.log"

Config.set_library_file("libclang-18.so.1")

# ----- dataclasses -----------------------------------------------------------


@dataclass
class ExtractedCvar:
    cvar_name: str
    c_ident: str
    default_value: str
    source_file: str          # basename
    source_line: int
    source_column: int
    storage_class: str        # "static" | "extern" | "none"
    flags_raw: Optional[str] = None           # "CVAR_USERINFO | CVAR_NO_RESET"
    flag_names: list[str] = field(default_factory=list)
    on_change: Optional[str] = None            # FUNCTION_DECL.spelling
    group_name: Optional[str] = None           # "Input - Mouse", etc.
    min_bound: Optional[str] = None
    max_bound: Optional[str] = None
    trailing_comment: Optional[str] = None     # filled by tree-sitter pass, not here


# ----- helpers ---------------------------------------------------------------


def strip_quotes(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1]
    return s


def read_extent_text(source_bytes: bytes, extent) -> str:
    """Read exact source text for a cursor extent."""
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return ""
    try:
        return source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return ""


FLAG_NAME_RE = re.compile(r"\bCVAR_[A-Z0-9_]+\b")


def parse_flag_names(raw: str) -> list[str]:
    """Pull CVAR_* macro names out of the flags source text. Handles
    bitwise-OR combinations and parenthesised groups."""
    return list(dict.fromkeys(FLAG_NAME_RE.findall(raw)))  # preserve order, dedupe


# ----- cvar_groups.h parsing -------------------------------------------------


def parse_cvar_groups_h() -> dict[str, str]:
    """CVAR_GROUP_X #defines -> human group name. Mirrors the regex extractor."""
    src = (EZQ_SRC / "cvar_groups.h").read_text(encoding="utf-8")
    out: dict[str, str] = {}
    for m in re.finditer(r'#define\s+(CVAR_GROUP_\w+)\s+"([^"]+)"', src):
        out[m.group(1)] = m.group(2)
    return out


# ----- per-file extraction ---------------------------------------------------


CLANG_ARGS = [
    "-x", "c",
    f"-I{EZQ_SRC}",
    # Do NOT define CLIENTONLY or SERVERONLY — we want both branches visible.
    # ezQuake source uses #ifndef CLIENTONLY to guard server-side cvars and
    # #ifndef SERVERONLY to guard client-side cvars; leaving both undefined
    # enables both branches (the cvar_t struct itself is defined only when
    # !SERVERONLY, which we preserve by leaving SERVERONLY undefined).
    "-w",  # silence warnings (most are glibc _Float128 noise)
    # Enable every common conditional branch so #ifdef-gated cvars are visible.
    # We want all build-variant cvars in the knowledge base, not just the
    # default build. Each flag here was taken from a `#ifdef X` in the source.
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
    "-DFTE_PEXT2_VOICECHAT",
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
    "-DSERVER_ONLY",            # note: with underscore, distinct from SERVERONLY
]

# Second pass args — used to catch cvars gated by `#ifdef SERVERONLY`.
# The cvar_t struct stays compatible (common fields first) so initializers
# like {"name", "default", CVAR_ROM} still parse even with the shorter struct.
CLANG_ARGS_SERVER = CLANG_ARGS + ["-DSERVERONLY"]

PARSE_OPTS = (
    TranslationUnit.PARSE_DETAILED_PROCESSING_RECORD
    | TranslationUnit.PARSE_INCOMPLETE
    # NOTE: we do NOT skip function bodies — we need Cvar_Register / SetBounds
    # call expressions which live inside functions.
)


def extract_from_file(
    path: Path,
    group_defs: dict[str, str],
    diagnostics: list[str],
) -> list[ExtractedCvar]:
    """Parse one .c file and return all cvar_t declarations it defines."""
    try:
        source_bytes = path.read_bytes()
    except OSError as e:
        diagnostics.append(f"{path}: read failed: {e}")
        return []

    idx = Index.create()
    tu = idx.parse(str(path), args=CLANG_ARGS, options=PARSE_OPTS)
    tu_server = idx.parse(str(path), args=CLANG_ARGS_SERVER, options=PARSE_OPTS)

    # log serious diagnostics but don't fail
    for d in tu.diagnostics:
        if d.severity >= 3:
            diagnostics.append(f"{path.name}:{d.location.line}: {d.spelling}")

    target_path = str(path.resolve())

    # Pass 1: collect cvar_t declarations defined in this file.
    # Two cases we handle:
    #   - `cvar_t x = {"name", "default", ...};`         scalar init
    #   - `cvar_t xs[N] = {{"a","0"}, {"b","1"}, ...};`  array-of-cvar_t init
    cvars_by_ident: dict[str, ExtractedCvar] = {}
    cvars_unnamed: list[ExtractedCvar] = []  # array-element cvars keyed by cvar name only

    def visit_for_decls(node):
        if (
            node.kind == CursorKind.VAR_DECL
            and node.location.file is not None
            and os.path.samefile(node.location.file.name, target_path)
        ):
            tspell = node.type.spelling
            # Word-boundary check so we don't match mv_temp_cvar_t / locked_cvar_t
            is_cvar_scalar = bool(
                re.fullmatch(r"(?:const\s+)?cvar_t", tspell)
            )
            is_cvar_array = bool(
                re.fullmatch(r"(?:const\s+)?cvar_t\s*\[\d*\]", tspell)
            )
            if is_cvar_scalar:
                extracted = _extract_cvar_decl(node, source_bytes)
                if extracted is not None:
                    cvars_by_ident[extracted.c_ident] = extracted
            elif is_cvar_array:
                for elem in _extract_cvar_array(node, source_bytes):
                    cvars_unnamed.append(elem)
        for c in node.get_children():
            visit_for_decls(c)

    visit_for_decls(tu.cursor)

    # Pass 1b: same visit on the server-build TU to catch declarations gated
    # by `#ifdef SERVERONLY`. Declarations already seen in the client pass are
    # skipped (first-pass wins — client-facing metadata is richer).
    seen_names = {cv.cvar_name for cv in cvars_by_ident.values()} | {cv.cvar_name for cv in cvars_unnamed}

    def visit_server(node):
        if (
            node.kind == CursorKind.VAR_DECL
            and node.location.file is not None
            and os.path.samefile(node.location.file.name, target_path)
        ):
            tspell = node.type.spelling
            is_cvar_scalar = bool(re.fullmatch(r"(?:const\s+)?cvar_t", tspell))
            is_cvar_array = bool(re.fullmatch(r"(?:const\s+)?cvar_t\s*\[\d*\]", tspell))
            if is_cvar_scalar:
                extracted = _extract_cvar_decl(node, source_bytes)
                if extracted is not None and extracted.cvar_name not in seen_names:
                    # Attribute a "server-build" marker so the report can count them.
                    extracted.storage_class = f"{extracted.storage_class} (server-build)"
                    cvars_by_ident[extracted.c_ident] = extracted
                    seen_names.add(extracted.cvar_name)
            elif is_cvar_array:
                for elem in _extract_cvar_array(node, source_bytes):
                    if elem.cvar_name not in seen_names:
                        elem.storage_class = f"{elem.storage_class} (server-build)"
                        cvars_unnamed.append(elem)
                        seen_names.add(elem.cvar_name)
        for c in node.get_children():
            visit_server(c)

    visit_server(tu_server.cursor)

    # Pass 2: collect Cvar_SetCurrentGroup / Cvar_Register / HUD_Register call
    # expressions, in source order. Groups get attributed to the cvars they
    # wrap; HUD_Register calls generate synthetic hud_<name>_<suffix> cvars.
    # (Cvar_SetBounds / Cvar_SetRange do not exist in ezQuake — dropped.)
    calls: list[tuple[int, str, list, object]] = []  # (offset, func_name, arg_cursors, call_cursor)

    def visit_for_calls(node):
        if node.kind == CursorKind.CALL_EXPR:
            if (
                node.location.file is not None
                and os.path.samefile(node.location.file.name, target_path)
            ):
                name = node.spelling
                if name in ("Cvar_SetCurrentGroup",
                            "Cvar_ResetCurrentGroup",
                            "Cvar_Register",
                            "HUD_Register"):
                    args = list(node.get_arguments())
                    calls.append((node.location.offset, name, args, node))
        for c in node.get_children():
            visit_for_calls(c)

    visit_for_calls(tu.cursor)
    calls.sort(key=lambda t: t[0])

    current_group: Optional[str] = None
    hud_cvars: list[ExtractedCvar] = []
    for _, name, args, call_cursor in calls:
        if name == "Cvar_SetCurrentGroup":
            if args:
                tok = read_extent_text(source_bytes, args[0].extent).strip()
                current_group = group_defs.get(tok)
        elif name == "Cvar_ResetCurrentGroup":
            current_group = None
        elif name == "Cvar_Register" and current_group:
            if args:
                ref_ident = _resolve_var_ref(args[0])
                if ref_ident and ref_ident in cvars_by_ident:
                    if cvars_by_ident[ref_ident].group_name is None:
                        cvars_by_ident[ref_ident].group_name = current_group
        elif name == "HUD_Register":
            hud_cvars.extend(
                _synthesize_hud_cvars(call_cursor, args, source_bytes, path.name)
            )

    return list(cvars_by_ident.values()) + cvars_unnamed + hud_cvars


def _extract_cvar_array(node, source_bytes: bytes) -> list[ExtractedCvar]:
    """Walk a `cvar_t xs[] = {{...}, {...}};` VAR_DECL and return one
    ExtractedCvar per element."""
    outer_init = None
    for c in node.get_children():
        if c.kind == CursorKind.INIT_LIST_EXPR:
            outer_init = c
            break
    if outer_init is None:
        return []
    out: list[ExtractedCvar] = []
    file_name = Path(node.location.file.name).name if node.location.file else ""
    for i, elem in enumerate(outer_init.get_children()):
        # elem might be UNEXPOSED_EXPR wrapping an INIT_LIST_EXPR, or an INIT_LIST_EXPR directly
        init = elem
        if elem.kind != CursorKind.INIT_LIST_EXPR:
            for ch in elem.get_children():
                if ch.kind == CursorKind.INIT_LIST_EXPR:
                    init = ch
                    break
        if init.kind != CursorKind.INIT_LIST_EXPR:
            continue
        fields = list(init.get_children())
        if len(fields) < 1:
            continue
        name = strip_quotes(read_extent_text(source_bytes, fields[0].extent).strip())
        if not name:
            continue
        default = ""
        if len(fields) >= 2:
            default = strip_quotes(read_extent_text(source_bytes, fields[1].extent).strip())
        flags_raw: Optional[str] = None
        flag_names: list[str] = []
        if len(fields) >= 3:
            flags_raw = read_extent_text(source_bytes, fields[2].extent).strip()
            flag_names = parse_flag_names(flags_raw)
        on_change: Optional[str] = None
        if len(fields) >= 4:
            ref = fields[3].referenced
            if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
                on_change = ref.spelling
            else:
                on_change = read_extent_text(source_bytes, fields[3].extent).strip() or None
        out.append(
            ExtractedCvar(
                cvar_name=name,
                c_ident=f"{node.spelling}[{i}]",
                default_value=default,
                source_file=file_name,
                source_line=init.location.line,
                source_column=init.location.column,
                storage_class={
                    StorageClass.STATIC: "static",
                    StorageClass.EXTERN: "extern",
                    StorageClass.NONE: "none",
                }.get(node.storage_class, str(node.storage_class)),
                flags_raw=flags_raw,
                flag_names=flag_names,
                on_change=on_change,
            )
        )
    return out


def _extract_cvar_decl(node, source_bytes: bytes) -> Optional[ExtractedCvar]:
    """Pull fields out of one cvar_t VAR_DECL."""
    init_list = None
    for c in node.get_children():
        if c.kind == CursorKind.INIT_LIST_EXPR:
            init_list = c
            break
    if init_list is None:
        return None

    fields = list(init_list.get_children())
    if len(fields) < 2:
        return None  # malformed — need at least name + default

    name_raw = read_extent_text(source_bytes, fields[0].extent).strip()
    default_raw = read_extent_text(source_bytes, fields[1].extent).strip()
    name = strip_quotes(name_raw)
    default = strip_quotes(default_raw)

    flags_raw: Optional[str] = None
    flag_names: list[str] = []
    if len(fields) >= 3:
        flags_raw = read_extent_text(source_bytes, fields[2].extent).strip()
        flag_names = parse_flag_names(flags_raw)

    on_change: Optional[str] = None
    if len(fields) >= 4:
        ref = fields[3].referenced
        if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
            on_change = ref.spelling
        else:
            # fall back to text
            on_change = read_extent_text(source_bytes, fields[3].extent).strip() or None

    storage = {
        StorageClass.STATIC: "static",
        StorageClass.EXTERN: "extern",
        StorageClass.NONE: "none",
    }.get(node.storage_class, str(node.storage_class))

    return ExtractedCvar(
        cvar_name=name,
        c_ident=node.spelling,
        default_value=default,
        source_file=Path(node.location.file.name).name,
        source_line=node.location.line,
        source_column=node.location.column,
        storage_class=storage,
        flags_raw=flags_raw,
        flag_names=flag_names,
        on_change=on_change,
    )


def _resolve_var_ref(cursor) -> Optional[str]:
    """Given an argument cursor like `&cl_bob`, return the referenced identifier."""
    # Walk to find the first DECL_REF_EXPR and return its referenced decl spelling
    stack = [cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None:
                return ref.spelling
        stack.extend(list(n.get_children()))
    return None


def _literal_string(arg_cursor, source_bytes: bytes) -> Optional[str]:
    """If the argument is a string literal (possibly wrapped in an implicit
    cast or paren), return the unquoted string. Otherwise return None."""
    text = read_extent_text(source_bytes, arg_cursor.extent).strip()
    # C adjacent-string-literal concatenation: "foo" "bar" -> "foobar"
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


# HUD_Register signature (ezquake hud.c):
#   HUD_Register(name, alias, desc, flags, min_state, draw_order, func,
#                "show", "place", "align_x", "align_y", "pos_x", "pos_y",
#                "frame", "frame_color", "item_opacity",
#                "custom1", "default1", ... NULL)
# Generates:
#   hud_<name>_order        default "0"       (always)
#   hud_<name>_draw         default "1"       (always)
#   hud_<name>_place        default place     (if non-NULL)
#   hud_<name>_show         default show      (if non-NULL)
#   hud_<name>_pos_x        default pos_x     (if non-NULL pair)
#   hud_<name>_align_x      default align_x   (")
#   hud_<name>_pos_y        default pos_y     (if non-NULL pair)
#   hud_<name>_align_y      default align_y   (")
#   hud_<name>_frame        default frame     (if non-NULL)
#   hud_<name>_frame_color  default frame_color
#   hud_<name>_item_opacity default item_opacity (or "1")
#   hud_<name>_<custom>     default <defaultN> (variadic pairs)
_HUD_GROUP_NAME = "MQWCL HUD"


def _literal_or_raw(arg_cursor, source_bytes: bytes) -> Optional[str]:
    """String literal if possible; otherwise the raw source token (e.g. a
    macro reference like SPEED_FAST that the regex extractor captures as-is).
    Returns None only for the literal NULL sentinel."""
    s = _literal_string(arg_cursor, source_bytes)
    if s is not None:
        return s
    raw = read_extent_text(source_bytes, arg_cursor.extent).strip()
    if not raw or raw == "NULL":
        return None
    return raw


def _synthesize_hud_cvars(call_cursor, args, source_bytes, file_name):
    """Generate synthetic hud_<name>_<suffix> cvars from one HUD_Register call."""
    if len(args) < 16:
        return []
    name = _literal_string(args[0], source_bytes)
    # Real element names are plain lowercase identifiers (no spaces or pointer syntax).
    if not name or not re.fullmatch(r"[a-z][a-z0-9_]*", name):
        return []
    show = _literal_or_raw(args[7], source_bytes)
    place = _literal_or_raw(args[8], source_bytes)
    align_x = _literal_or_raw(args[9], source_bytes)
    align_y = _literal_or_raw(args[10], source_bytes)
    pos_x = _literal_or_raw(args[11], source_bytes)
    pos_y = _literal_or_raw(args[12], source_bytes)
    frame = _literal_or_raw(args[13], source_bytes)
    frame_color = _literal_or_raw(args[14], source_bytes)
    item_opacity = _literal_or_raw(args[15], source_bytes)

    line = call_cursor.location.line
    col = call_cursor.location.column

    def mk(suffix: str, default: str) -> ExtractedCvar:
        return ExtractedCvar(
            cvar_name=f"hud_{name}_{suffix}",
            c_ident=f"hud_{name}_{suffix}",
            default_value=default,
            source_file=file_name,
            source_line=line,
            source_column=col,
            storage_class="generated",
            group_name=_HUD_GROUP_NAME,
        )

    out: list[ExtractedCvar] = [
        mk("order", "0"),
        mk("draw", "1"),
    ]
    if place is not None:
        out.append(mk("place", place))
    if show is not None:
        out.append(mk("show", show))
    if pos_x is not None and align_x is not None:
        out.append(mk("pos_x", pos_x))
        out.append(mk("align_x", align_x))
    if pos_y is not None and align_y is not None:
        out.append(mk("pos_y", pos_y))
        out.append(mk("align_y", align_y))
    if frame is not None:
        out.append(mk("frame", frame))
        out.append(mk("frame_color", frame_color if frame_color is not None else "0 0 0"))
    out.append(mk("item_opacity", item_opacity if item_opacity is not None else "1"))

    # Custom variadic pairs: args[16], args[17], ... ends at NULL sentinel.
    i = 16
    while i + 1 < len(args):
        suffix = _literal_string(args[i], source_bytes)  # suffix must be a string literal
        if suffix is None:
            break
        default = _literal_or_raw(args[i + 1], source_bytes)
        if default is None:
            break
        out.append(mk(suffix, default))
        i += 2

    return out


# ----- enrichment from help_variables.json -----------------------------------


def load_help_data() -> dict:
    return json.loads(HELP_JSON.read_text(encoding="utf-8"))


# ----- trailing-comment pass -------------------------------------------------


_COMMENT_RE = re.compile(r"//\s*(.*)$|/\*\s*(.*?)\s*\*/")


def extract_trailing_comments(cvars: list[ExtractedCvar]) -> int:
    """For each cvar, open its source file, read the declaration line, and
    capture any `// ...` or `/* ... */` comment AFTER the terminator (`;` or
    `,`). libclang discards comments — this is the textual complement."""
    # cache file contents by name
    file_cache: dict[str, list[str]] = {}
    attached = 0
    for cv in cvars:
        if cv.source_file not in file_cache:
            p = EZQ_SRC / cv.source_file
            try:
                file_cache[cv.source_file] = p.read_text(encoding="utf-8").split("\n")
            except OSError:
                file_cache[cv.source_file] = []
        lines = file_cache[cv.source_file]
        # line is 1-based in our dataclass; scan a small window in case of multi-line decl
        for probe in (cv.source_line, cv.source_line + 1, cv.source_line + 2):
            idx = probe - 1
            if idx < 0 or idx >= len(lines):
                continue
            l = lines[idx]
            terminator_idx = max(l.rfind(";"), l.rfind(","))
            tail = l[terminator_idx + 1:] if terminator_idx >= 0 else l
            tail = tail.strip()
            if tail.startswith("//"):
                cv.trailing_comment = tail[2:].strip()
                attached += 1
                break
            if tail.startswith("/*"):
                end = tail.find("*/", 2)
                cv.trailing_comment = (tail[2:end] if end >= 0 else tail[2:]).strip()
                attached += 1
                break
    return attached


def infer_type(default_value: str) -> str:
    if default_value in ("0", "1"):
        return "boolean"
    if re.fullmatch(r"-?\d+", default_value):
        return "integer"
    if re.fullmatch(r"-?\d+\.\d+", default_value):
        return "float"
    return "string"


def build_output(extracted: list[ExtractedCvar], help_data: dict) -> dict:
    """Merge extracted data with help_variables.json enrichment.
    Output schema tries to match the existing ezquake-variables.json layout,
    with new AST-derived fields added."""
    group_name_to_id = {g["name"]: g["id"] for g in help_data.get("groups", [])}
    help_groups = help_data.get("groups", [])
    help_vars: dict = help_data.get("vars", {})

    vars_out: dict[str, dict] = {}
    source_names: set[str] = set()

    stats = {
        "source_total": len(extracted),
        "client": 0,
        "server_only": 0,
        "with_flags": 0,
        "with_onchange": 0,
        "with_bounds": 0,
        "with_group": 0,
        "with_help_desc": 0,
        "flag_histogram": {},
    }

    for cv in extracted:
        source_names.add(cv.cvar_name)
        help_entry = help_vars.get(cv.cvar_name, {})

        # Determine group-id
        group_id: Optional[str] = None
        if cv.group_name:
            group_id = group_name_to_id.get(cv.group_name)
        if group_id is None and help_entry.get("group-id"):
            helpg = next(
                (g for g in help_groups if g["id"] == help_entry["group-id"]),
                None,
            )
            if helpg is not None and helpg.get("major-group") != "Obsolete":
                group_id = help_entry["group-id"]
        if group_id is None:
            if "sv_" == cv.source_file[:3]:
                group_id = group_name_to_id.get("Server Settings", "0")
            else:
                group_id = "0"

        ctype = help_entry.get("type") or infer_type(cv.default_value)
        is_server = cv.source_file.startswith("sv_")

        entry: dict = {
            "type": ctype,
            "group-id": group_id,
            "default": cv.default_value,
            "server-only": is_server,
            # AST-derived extras (always emitted even when empty, for consumer clarity)
            "ast": {
                "c_ident": cv.c_ident,
                "source_file": cv.source_file,
                "source_line": cv.source_line,
                "source_column": cv.source_column,
                "storage_class": cv.storage_class,
                "flags_raw": cv.flags_raw,
                "flag_names": cv.flag_names,
                "on_change": cv.on_change,
                "group_name_in_source": cv.group_name,
                "min_bound": cv.min_bound,
                "max_bound": cv.max_bound,
                "trailing_comment": cv.trailing_comment,
            },
        }
        if help_entry.get("desc"):
            entry["desc"] = help_entry["desc"]
            stats["with_help_desc"] += 1
        if help_entry.get("remarks"):
            entry["remarks"] = help_entry["remarks"]
        if help_entry.get("values"):
            entry["values"] = help_entry["values"]

        if is_server:
            stats["server_only"] += 1
        else:
            stats["client"] += 1
        if cv.flag_names:
            stats["with_flags"] += 1
            for fn in cv.flag_names:
                stats["flag_histogram"][fn] = stats["flag_histogram"].get(fn, 0) + 1
        if cv.on_change:
            stats["with_onchange"] += 1
        if cv.min_bound is not None:
            stats["with_bounds"] += 1
        if cv.group_name:
            stats["with_group"] += 1

        vars_out[cv.cvar_name] = entry

    # Preserve help-only entries flagged as not-in-source (same behavior as regex extractor).
    # help_variables.json upstream carries at least one stray duplicate key with
    # trailing whitespace (e.g. "cl_voip_capturingvol "); strip and skip post-strip
    # collisions with the canonical entry so we don't emit an invalid cvar name
    # that the loader then rejects.
    help_only = 0
    seen_help_names: set[str] = set()
    for raw_name, hv in help_vars.items():
        name = raw_name.strip()
        if not name:
            continue
        if name in source_names or name in vars_out or name in seen_help_names:
            continue
        seen_help_names.add(name)
        help_only += 1
        entry = {
            "type": hv.get("type", "string"),
            "group-id": hv.get("group-id", "0"),
        }
        if hv.get("default") is not None:
            entry["default"] = hv["default"]
        if hv.get("desc"):
            entry["desc"] = hv["desc"]
        if hv.get("remarks"):
            entry["remarks"] = hv["remarks"]
        if hv.get("values"):
            entry["values"] = hv["values"]
        entry["ast"] = None  # signal "not in source"
        vars_out[name] = entry
    stats["help_only"] = help_only

    # Sort for stable output
    sorted_vars = {k: vars_out[k] for k in sorted(vars_out)}
    return {"groups": help_groups, "vars": sorted_vars, "_stats": stats}


# ----- main ------------------------------------------------------------------


def main() -> int:
    print(f"ezQuake AST extraction")
    print(f"  repo: {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    if not EZQ_SRC.is_dir():
        print(f"ERROR: ezquake src not found at {EZQ_SRC}", file=sys.stderr)
        return 1

    print("Phase 1: parsing cvar_groups.h")
    group_defs = parse_cvar_groups_h()
    print(f"  found {len(group_defs)} CVAR_GROUP_* macros")

    print("\nPhase 2: parsing .c files with libclang")
    c_files = sorted([p for p in EZQ_SRC.iterdir() if p.suffix == ".c"])
    print(f"  {len(c_files)} source files")

    all_cvars: list[ExtractedCvar] = []
    diagnostics: list[str] = []
    for i, p in enumerate(c_files, 1):
        before = len(all_cvars)
        try:
            cvars = extract_from_file(p, group_defs, diagnostics)
            all_cvars.extend(cvars)
            added = len(all_cvars) - before
            if added:
                print(f"  [{i:>3}/{len(c_files)}] {p.name}: {added} cvars")
        except Exception as e:
            diagnostics.append(f"{p.name}: extraction failed: {type(e).__name__}: {e}")
            print(f"  [{i:>3}/{len(c_files)}] {p.name}: FAILED ({e})")

    # Deduplicate by cvar name (last declaration wins, same as regex extractor)
    deduped: dict[str, ExtractedCvar] = {}
    for cv in all_cvars:
        deduped[cv.cvar_name] = cv
    unique_cvars = list(deduped.values())
    print(f"\n  total cvar_t declarations: {len(all_cvars)}")
    print(f"  unique by cvar name:       {len(unique_cvars)}")

    print("\nPhase 2b: textual trailing-comment pass")
    attached = extract_trailing_comments(unique_cvars)
    print(f"  cvars with trailing comment attached: {attached}")

    print("\nPhase 3: loading help_variables.json for enrichment")
    help_data = load_help_data()
    print(f"  help entries: {len(help_data.get('vars', {}))}")

    print("\nPhase 4: merging and writing output")
    output = build_output(unique_cvars, help_data)
    stats = output["_stats"]
    print(f"  source cvars: client={stats['client']} server={stats['server_only']}")
    print(f"  with flags:       {stats['with_flags']}")
    print(f"  with on_change:   {stats['with_onchange']}")
    print(f"  with bounds:      {stats['with_bounds']}")
    print(f"  with group:       {stats['with_group']}")
    print(f"  with help desc:   {stats['with_help_desc']}")
    print(f"  help-only (not in source): {stats['help_only']}")
    print(f"  total output entries: {len(output['vars'])}")
    top_flags = sorted(stats["flag_histogram"].items(), key=lambda t: -t[1])[:10]
    print(f"  top flags: {top_flags}")

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
    raise SystemExit(main())
