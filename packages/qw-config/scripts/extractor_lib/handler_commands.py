"""Commands handler for the unified extraction driver (Step 3: Visitor).

Ports the legacy walk to cursor-dispatch. Each file receives one client walk
and one server walk from the central walker; this handler emits per-file
first-wins rows (client then server).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

from ._visitor import Visitor


# ----- group assignment (mirrors legacy extractor exactly) -------------------

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


def _assign_group(name: str, deprecated: bool) -> str:
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


# ----- per-file visit helpers -----------------------------------------------

def _literal_string(arg_cursor, source_bytes: bytes) -> Optional[str]:
    extent = arg_cursor.extent
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return None
    try:
        text = source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return None

    parts = []
    i = 0
    while i < len(text):
        while i < len(text) and text[i] in " \t\n\r":
            i += 1
        if i >= len(text):
            break
        if text[i] == '"':
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
    stack = [arg_cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None and ref.kind in (CursorKind.FUNCTION_DECL, CursorKind.VAR_DECL):
                return ref.spelling
        stack.extend(list(n.get_children()))
    return None


# ----- Handler --------------------------------------------------------------

class CommandsHandler(Visitor):
    name = "commands"
    output_filename = "ezquake-commands-ast.json"

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._func_stack: list[str] = []
        # Per-file seen names — legacy rule: within one file, client sees
        # name X, server skips X if already-seen. Across files: first-wins
        # (in finalize).
        self._seen_in_file: set[str] = set()
        self._rows: list[dict] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        sp = cursor.spelling
        if sp not in ("Cmd_AddCommand", "Cmd_AddLegacyCommand"):
            return
        args = list(cursor.get_arguments())
        if len(args) < 2:
            return
        name = _literal_string(args[0], self.source_bytes)
        if not name or name in self._seen_in_file:
            return
        if sp == "Cmd_AddCommand":
            handler = _resolve_fn_ref(args[1])
            legacy_alias_of = None
        else:
            # Cmd_AddLegacyCommand("old_name", "new_name") — proxy alias with no
            # direct handler. arg[1] is the target command name as a literal.
            handler = None
            legacy_alias_of = _literal_string(args[1], self.source_bytes)
        loc = cursor.location
        build_variant = "client" if variant == "client" else "server-build"
        row = {
            "name": name,
            "handler_fn": handler,
            "source_file": Path(loc.file.name).name,
            "source_line": loc.line,
            "source_column": loc.column,
            "enclosing_function": self._func_stack[-1] if self._func_stack else None,
            "build_variant": build_variant,
        }
        if legacy_alias_of is not None:
            row["legacy_alias_of"] = legacy_alias_of
        self._rows.append(row)
        self._seen_in_file.add(name)

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._func_stack = []
        self._seen_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        help_json_path = repo_root / "help_commands.json"
        help_data: dict = json.loads(help_json_path.read_text(encoding="utf-8"))

        deduped: dict[str, dict] = {}
        for row in all_rows:
            if row["name"] not in deduped:
                deduped[row["name"]] = row
        unique_cmds = list(deduped.values())

        source_names: set[str] = set()
        commands_out: dict[str, dict] = {}
        stats = {
            "source_total": len(all_rows),
            "with_handler": 0,
            "with_help_desc": 0,
            "server_build_only": 0,
            "help_only": 0,
        }

        for cmd in unique_cmds:
            source_names.add(cmd["name"])
            help_entry = help_data.get(cmd["name"], {}) or {}

            ast_entry: dict = {
                "handler_fn": cmd["handler_fn"],
                "source_file": cmd["source_file"],
                "source_line": cmd["source_line"],
                "source_column": cmd["source_column"],
                "enclosing_function": cmd["enclosing_function"],
                "build_variant": cmd["build_variant"],
            }
            if "legacy_alias_of" in cmd:
                ast_entry["legacy_alias_of"] = cmd["legacy_alias_of"]
            entry: dict = {
                "group-id": _assign_group(cmd["name"], deprecated=False),
                "ast": ast_entry,
            }
            if help_entry.get("description"):
                entry["desc"] = help_entry["description"]
                stats["with_help_desc"] += 1
            if help_entry.get("remarks"):
                entry["remarks"] = help_entry["remarks"]
            if cmd["handler_fn"]:
                stats["with_handler"] += 1
            if cmd["build_variant"] == "server-build":
                stats["server_build_only"] += 1
            commands_out[cmd["name"]] = entry

        stats["help_only_system_generated"] = 0
        for name, hv in help_data.items():
            if name in source_names:
                continue
            entry = {
                "group-id": _assign_group(name, deprecated=True),
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
