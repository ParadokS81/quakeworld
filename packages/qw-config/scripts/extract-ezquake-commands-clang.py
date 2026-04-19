#!/usr/bin/env python3
"""libclang-based extraction of ezQuake commands.

Walks every .c file in ezquake-source/src/ and captures, per Cmd_AddCommand
call site:

  - command name (first arg, string literal)
  - handler function (second arg, resolved via AST)
  - source file, line, column of the call
  - enclosing function (e.g. CL_InitCommands)

Merged with help_commands.json enrichment (desc, remarks) and a prefix-based
group-id assignment shared with the legacy TS extractor.

Commands in help_commands.json but NOT in source are emitted with ast=null.
The loader flips these to source_state='doc_only'.

Output: <repo>/packages/qw-config/src/data/ezquake-commands-ast.json
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
EZQ_SRC = EZQ_REPO / "src"
HELP_JSON = EZQ_REPO / "help_commands.json"
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-commands-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-commands-diagnostics.log"

Config.set_library_file("libclang-18.so.1")


# ----- group assignment (mirrors extract-ezquake-commands.ts) ----------------

GROUPS = [
    {"id": "action",     "name": "Press/Release Actions"},
    {"id": "teamplay",   "name": "Teamplay"},
    {"id": "demo",       "name": "Demo Recording & Playback"},
    {"id": "hud",        "name": "HUD"},
    {"id": "video",      "name": "Video & Screenshots"},
    {"id": "menu",       "name": "Menus"},
    {"id": "sb",         "name": "Server Browser"},
    {"id": "stateful",   "name": "Stateful / Toggle"},
    {"id": "game",       "name": "In-Game Actions"},
    {"id": "config",     "name": "Config & Scripting"},
    {"id": "comm",       "name": "Communication"},
    {"id": "dev",        "name": "Developer / Diagnostics"},
    {"id": "deprecated", "name": "Deprecated"},
    {"id": "misc",       "name": "Miscellaneous"},
]

_DEMO_EXACT = {"record", "stop", "playdemo", "timedemo", "easyrecord", "stopdemo"}
_HUD_EXACT = {"sizeup", "sizedown", "hud_editor", "hud_recalculate", "hud_planmode", "loadcharset"}
_VIDEO_EXACT = {"screenshot", "bf", "r_restart"}
_MENU_EXACT = {"togglemenu"}
_SB_EXACT = {"serverinfo", "status", "who", "whoami", "whonot", "ping"}
_STATEFUL_EXACT = {"floodprot", "mapgroup", "skygroup", "filter", "sb_sourcemark", "sb_sourceunmarkall"}
_GAME_EXACT = {
    "kill", "god", "noclip", "fly", "give", "pause", "quit", "disconnect",
    "connect", "reconnect", "changing", "notify", "join", "observe", "ready",
    "break", "noready", "vwep",
}
_CONFIG_EXACT = {
    "exec", "alias", "unalias", "unalias_re", "unaliasall",
    "bind", "unbind", "unbindall",
    "set", "seta", "unset", "toggle", "inc", "dec", "reset", "resetall",
    "cvar_reset", "cfg_save", "cfg_load", "cfg_reset",
    "wait", "if", "echo",
}
_COMM_EXACT = {"say", "say_team", "messagemode", "messagemode2", "rcon", "name", "team", "color"}
_DEV_EXACT = {"cmdlist", "cvarlist", "apropos", "snd_restart", "dumpent"}


def assign_group(name: str, deprecated: bool) -> str:
    if deprecated:
        return "deprecated"
    if name.startswith("+") or name.startswith("-"):
        return "action"
    if name.startswith("tp_"):
        return "teamplay"
    if name.startswith("demo_") or name in _DEMO_EXACT:
        return "demo"
    if name.startswith("hud_") or name.startswith("hud262_") or name in _HUD_EXACT:
        return "hud"
    if name.startswith("vid_") or name in _VIDEO_EXACT:
        return "video"
    if name.startswith("menu_") or name in _MENU_EXACT:
        return "menu"
    if name.startswith("sb_") or name in _SB_EXACT:
        return "sb"
    if name in _STATEFUL_EXACT:
        return "stateful"
    if name in _GAME_EXACT:
        return "game"
    if name in _CONFIG_EXACT:
        return "config"
    if name in _COMM_EXACT:
        return "comm"
    if name.startswith("dev_") or name in _DEV_EXACT:
        return "dev"
    return "misc"


# ----- dataclasses -----------------------------------------------------------


@dataclass
class ExtractedCommand:
    name: str
    handler_fn: Optional[str]
    source_file: str
    source_line: int
    source_column: int
    enclosing_function: Optional[str]
    # Set to "server-build" when only seen in the SERVERONLY translation unit.
    build_variant: str = "client"


# ----- libclang setup mirrors the cvar extractor ----------------------------


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


def _literal_string(arg_cursor, source_bytes: bytes) -> Optional[str]:
    """String literal, handling C adjacent-literal concat."""
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


def _resolve_fn_ref(arg_cursor) -> Optional[str]:
    """Given arg[1] of Cmd_AddCommand, walk the subtree to find the referenced
    function decl. Handles `NULL`, `&Fn`, bare `Fn`, and cast-wrapped forms."""
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None and ref.kind in (CursorKind.FUNCTION_DECL, CursorKind.VAR_DECL):
                return ref.spelling
        stack.extend(list(n.get_children()))
    return None


# libclang's cursor.semantic_parent doesn't walk reliably from CALL_EXPR up
# to the enclosing FUNCTION_DECL across versions / binding quirks. Instead, we
# track the active FUNCTION_DECL during the tree walk and read it off when we
# hit a Cmd_AddCommand call.


# ----- per-file extraction ---------------------------------------------------


def extract_from_file(
    path: Path,
    diagnostics: list[str],
) -> list[ExtractedCommand]:
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

    def collect(tu_cursor, label: str, already_seen: set[str]) -> list[ExtractedCommand]:
        found: list[ExtractedCommand] = []

        def visit(node, current_fn: Optional[str]):
            if node.kind == CursorKind.FUNCTION_DECL:
                if node.location.file is not None and os.path.samefile(node.location.file.name, target_path):
                    current_fn = node.spelling
            if node.kind == CursorKind.CALL_EXPR and node.spelling == "Cmd_AddCommand":
                loc = node.location
                if loc.file is not None and os.path.samefile(loc.file.name, target_path):
                    args = list(node.get_arguments())
                    if len(args) >= 2:
                        name = _literal_string(args[0], source_bytes)
                        if name and name not in already_seen:
                            handler = _resolve_fn_ref(args[1])
                            found.append(ExtractedCommand(
                                name=name,
                                handler_fn=handler,
                                source_file=Path(loc.file.name).name,
                                source_line=loc.line,
                                source_column=loc.column,
                                enclosing_function=current_fn,
                                build_variant=label,
                            ))
                            already_seen.add(name)
            for c in node.get_children():
                visit(c, current_fn)

        visit(tu_cursor.cursor, None)
        return found

    seen: set[str] = set()
    client_hits = collect(tu, "client", seen)
    server_hits = collect(tu_server, "server-build", seen)
    return client_hits + server_hits


# ----- enrichment ------------------------------------------------------------


def load_help_data() -> dict:
    return json.loads(HELP_JSON.read_text(encoding="utf-8"))


def build_output(extracted: list[ExtractedCommand], help_data: dict) -> dict:
    help_entries: dict = help_data  # help_commands.json is a flat name -> {desc, remarks, ...} map

    source_names: set[str] = set()
    commands_out: dict[str, dict] = {}

    stats = {
        "source_total": len(extracted),
        "with_handler": 0,
        "with_help_desc": 0,
        "server_build_only": 0,
        "help_only": 0,
    }

    for cmd in extracted:
        source_names.add(cmd.name)
        help_entry = help_entries.get(cmd.name, {}) or {}

        entry: dict = {
            "group-id": assign_group(cmd.name, deprecated=False),
            "ast": {
                "handler_fn": cmd.handler_fn,
                "source_file": cmd.source_file,
                "source_line": cmd.source_line,
                "source_column": cmd.source_column,
                "enclosing_function": cmd.enclosing_function,
                "build_variant": cmd.build_variant,
            },
        }
        if help_entry.get("description"):
            entry["desc"] = help_entry["description"]
            stats["with_help_desc"] += 1
        if help_entry.get("remarks"):
            entry["remarks"] = help_entry["remarks"]

        if cmd.handler_fn:
            stats["with_handler"] += 1
        if cmd.build_variant == "server-build":
            stats["server_build_only"] += 1

        commands_out[cmd.name] = entry

    # help-only entries (docs without a matching Cmd_AddCommand in source).
    # Include system-generated synthetic entries so downstream consumers get
    # the full docs surface; flag them with system_generated=true so they can
    # be filtered if desired.
    stats["help_only_system_generated"] = 0
    for name, hv in help_entries.items():
        if name in source_names:
            continue
        entry: dict = {
            "group-id": assign_group(name, deprecated=True),
            "ast": None,
        }
        if hv.get("description"):
            entry["desc"] = hv["description"]
        if hv.get("remarks"):
            entry["remarks"] = hv["remarks"]
        if hv.get("system-generated"):
            entry["system_generated"] = True
            stats["help_only_system_generated"] += 1
        commands_out[name] = entry
        stats["help_only"] += 1

    sorted_commands = {k: commands_out[k] for k in sorted(commands_out)}
    return {"groups": GROUPS, "commands": sorted_commands, "_stats": stats}


# ----- main ------------------------------------------------------------------


def main() -> int:
    print("ezQuake command AST extraction")
    print(f"  repo: {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    if not EZQ_SRC.is_dir():
        print(f"ERROR: ezquake src not found at {EZQ_SRC}", file=sys.stderr)
        return 1
    if not HELP_JSON.is_file():
        print(f"ERROR: help_commands.json not found at {HELP_JSON}", file=sys.stderr)
        return 1

    c_files = sorted([p for p in EZQ_SRC.iterdir() if p.suffix == ".c"])
    print(f"Phase 1: parsing {len(c_files)} .c files")

    all_cmds: list[ExtractedCommand] = []
    diagnostics: list[str] = []
    for i, p in enumerate(c_files, 1):
        before = len(all_cmds)
        try:
            cmds = extract_from_file(p, diagnostics)
            all_cmds.extend(cmds)
            added = len(all_cmds) - before
            if added:
                print(f"  [{i:>3}/{len(c_files)}] {p.name}: {added} commands")
        except Exception as e:
            diagnostics.append(f"{p.name}: extraction failed: {type(e).__name__}: {e}")
            print(f"  [{i:>3}/{len(c_files)}] {p.name}: FAILED ({e})")

    # Commands can be registered multiple times in different files (rare). Dedupe by name.
    deduped: dict[str, ExtractedCommand] = {}
    for c in all_cmds:
        if c.name not in deduped:
            deduped[c.name] = c
    unique_cmds = list(deduped.values())
    print(f"\n  total Cmd_AddCommand hits: {len(all_cmds)}")
    print(f"  unique by name:             {len(unique_cmds)}")

    print("\nPhase 2: loading help_commands.json for enrichment")
    help_data = load_help_data()
    print(f"  help entries: {len(help_data)}")

    print("\nPhase 3: merging and writing output")
    output = build_output(unique_cmds, help_data)
    stats = output["_stats"]
    print(f"  source commands:   {stats['source_total']}")
    print(f"  with handler:      {stats['with_handler']}")
    print(f"  with help desc:    {stats['with_help_desc']}")
    print(f"  server-build only: {stats['server_build_only']}")
    print(f"  help-only (deprecated / doc-only): {stats['help_only']}")
    print(f"  total output entries: {len(output['commands'])}")

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
