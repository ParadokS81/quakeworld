"""Ezhud plugin handler for the FTE AST extractor.

Handles two patterns from plugins/ezhud/:

1. HUD_Register synthesis -- detects CALL_EXPR to HUD_Register and synthesizes
   9 standard subcvars (show/place/align_x/align_y/pos_x/pos_y/frame/frame_color/
   item_opacity) + 1 order cvar + N custom params per element.

2. cvarfuncs->GetNVFDG() v-table calls -- direct cvar registration from the plugin
   to the engine outside the standard CVARD path.

File-scope gate: only fires on files under plugins/ezhud/. Engine files reference
HUD_Register in headers but have no call sites; the path check prevents spurious hits.

Output is a cvars-shaped JSON (vars dict + _stats). The extract.py post-finalize
merge step folds this into fte-variables-ast.json so the loader sees one cvar surface
tagged source_root=plugin:ezhud.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._cvar_shared import normalize_flags_raw  # noqa: E402


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Standard positional subcvar names, in the order they appear in HUD_Register
# args[7..15]. Each index maps to the arg offset within the full arg list.
HUD_STANDARD_SUBCVARS = [
    "show",
    "place",
    "align_x",
    "align_y",
    "pos_x",
    "pos_y",
    "frame",
    "frame_color",
    "item_opacity",
]

# #define constants used as defaults in HUD_Register calls. libclang collapses
# macro expansion for most string literals but SPEED_* are integer constants,
# not strings -- the cursor token will be the identifier, not its numeric value.
DEFINE_CONSTANTS: dict[str, str] = {
    "SPEED_GREEN":     "52",
    "SPEED_BROWN_RED": "100",
    "SPEED_DARK_RED":  "72",
    "SPEED_BLUE":      "216",
    "SPEED_RED":       "229",
    "SPEED_STOPPED":   "52",
    "SPEED_NORMAL":    "100",
    "SPEED_FAST":      "72",
    "SPEED_FASTEST":   "216",
    "SPEED_INSANE":    "229",
}


# ---------------------------------------------------------------------------
# Token / string helpers (mirror cvars handler patterns)
# ---------------------------------------------------------------------------

def _tokens_of(cursor) -> list[str]:
    return [t.spelling for t in cursor.get_tokens()]


def _concat_string_literals(tokens: list[str]) -> Optional[str]:
    """C adjacent-string-literal concatenation.

    ["\"foo\"", "\"bar\""] -> "foobar"
    Returns None if no string-literal tokens found (e.g. NULL arg).
    """
    parts = []
    for t in tokens:
        t = t.strip()
        if t.startswith('"') and t.endswith('"') and len(t) >= 2:
            # Unescape basic C escape sequences for readability.
            inner = t[1:-1]
            inner = inner.replace("\\n", " ").replace("\\t", " ").replace('\\"', '"')
            parts.append(inner)
        elif t in ("NULL", "((void", "((("):
            return None
    if not parts:
        return None
    return "".join(parts)


def _resolve_default(tokens: list[str]) -> str:
    """Extract the default value from a cursor's token list.

    Tries string literal first. Falls back to first identifier token. If
    that identifier is a known #define constant, resolves it. Otherwise
    stores the identifier name as-is -- downstream readers know it's a
    #define reference.
    """
    string_val = _concat_string_literals(tokens)
    if string_val is not None:
        return string_val

    # Not a string literal -- look for an identifier token (e.g. SPEED_NORMAL)
    for t in tokens:
        t = t.strip()
        if t in ("NULL", "", ",", "(", ")", ";"):
            continue
        # Skip punctuation / numbers that look like raw values
        if t.lstrip("-").isdigit():
            return t
        # Identifier -- resolve from known constants or return as-is
        if t.replace(".", "").replace("-", "").isdigit():
            return t  # floating point literal
        if t and t[0].isalpha() or (t and t[0] == "_"):
            return DEFINE_CONSTANTS.get(t, t)

    return ""


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------

class EzhudFteHandler(Visitor):
    name = "ezhud"
    output_filename = "fte-ezhud-cvars-ast.json"

    def __init__(self) -> None:
        # Cross-file accumulator: cvar_name -> row dict (first-wins)
        self._all_rows: dict[str, dict] = {}

    # -- Visitor lifecycle ---------------------------------------------------

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        # Gate: only process files under plugins/ezhud/
        path_str = str(source_path)
        self._is_ezhud = (
            "/plugins/ezhud/" in path_str or
            "\\plugins\\ezhud\\" in path_str
        )
        # Per-file state
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if not self._is_ezhud:
            return
        if cursor.kind != CursorKind.CALL_EXPR:
            return

        spelling = cursor.spelling
        if spelling == "HUD_Register":
            self._handle_hud_register(cursor)
        elif spelling == "GetNVFDG":
            self._handle_getnvfdg(cursor)

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        """Collapse per-file rows. First-wins dedup by cvar name."""
        deduped: dict[str, dict] = {}
        for row in all_rows:
            name = row["name"]
            if name not in deduped:
                deduped[name] = row

        repo_root_path = Path(repo_root).resolve()
        vars_out: dict[str, dict] = {}
        count_by_synth: dict[str, int] = {}

        for row in deduped.values():
            src_file = row.get("source_file")
            if src_file:
                try:
                    src_file = str(Path(src_file).resolve().relative_to(repo_root_path))
                except ValueError:
                    pass

            synth_from = row.get("synthesized_from", "")

            # Emit loader-compatible shape matching VariableEntry + AstBlock.
            # Ezhud cvars are always source-backed (synthesized from AST call sites).
            ast_block: dict = {
                "c_ident": "",
                "source_file": src_file,
                "source_line": row.get("source_line"),
                "source_column": None,
                "storage_class": None,
                "flags_raw": normalize_flags_raw(None),
                "flag_names": [],
                "on_change": None,
                "group_name_in_source": None,
                "min_bound": None,
                "max_bound": None,
                "trailing_comment": None,
            }

            desc_val = row.get("description")
            entry: dict = {
                "default": row.get("default"),
                "desc": desc_val or None,
                "source_root": row.get("source_root", "plugin:ezhud"),
                "ast": ast_block,
                # Extra metadata for ezhud-specific consumers; ignored by loader.
                "synthesized_from": synth_from,
            }
            if row.get("synthesized_parent"):
                entry["synthesized_parent"] = row["synthesized_parent"]

            vars_out[row["name"]] = entry
            count_by_synth[synth_from] = count_by_synth.get(synth_from, 0) + 1

        sorted_vars = {k: vars_out[k] for k in sorted(vars_out)}
        return {
            "vars": sorted_vars,
            "_stats": {
                "count": len(sorted_vars),
                "by_synthesizer": count_by_synth,
            },
        }

    # -- Pattern handlers ----------------------------------------------------

    def _handle_hud_register(self, cursor) -> None:
        """Synthesize subcvars from a HUD_Register(...) CALL_EXPR.

        Arg layout (0-indexed, first child of CALL_EXPR is the callee so we
        call get_arguments() which gives only the actual arguments):
          [0]  element name
          [1]  var_alias (skip)
          [2]  description
          [3..6] flags, min_state, draw_order, draw_func (skip)
          [7..15] 9 standard subcvar defaults (show..item_opacity)
          [16..] pairs of (param_name, param_default) until NULL
        """
        args = list(cursor.get_arguments())
        if len(args) < 8:
            # Malformed or definition stub -- skip
            return

        # Arg[0]: element name
        elem_name_tokens = _tokens_of(args[0])
        elem_name = _concat_string_literals(elem_name_tokens)
        if not elem_name:
            return

        # Skip function definition stub (first arg is a C type, not a literal)
        # The definition has `char *name` as first param -- the identifier won't
        # be a string literal.
        if not any(t.startswith('"') for t in elem_name_tokens):
            return

        # Arg[2]: description
        description = ""
        if len(args) > 2:
            desc_val = _concat_string_literals(_tokens_of(args[2]))
            if desc_val:
                description = desc_val

        # Args[7..15]: 9 standard subcvar defaults
        source_line = cursor.location.line
        source_file = cursor.location.file.name if cursor.location.file else None
        source_root = getattr(self, "current_source_root", "plugin:ezhud")

        for i, sub_name in enumerate(HUD_STANDARD_SUBCVARS):
            arg_idx = 7 + i
            if arg_idx >= len(args):
                break
            default = _resolve_default(_tokens_of(args[arg_idx]))
            cvar_name = f"hud_{elem_name}_{sub_name}"
            desc_full = f"{description} [{sub_name}]" if description else f"[{sub_name}]"
            self._emit_row(
                name=cvar_name,
                default=default,
                description=desc_full,
                source_file=source_file,
                source_line=source_line,
                source_root=source_root,
                synthesized_from="HUD_Register",
                synthesized_parent=elem_name,
            )

        # Always create the order cvar
        order_name = f"hud_{elem_name}_order"
        self._emit_row(
            name=order_name,
            default="0",
            description=f"{description} [draw order]" if description else "[draw order]",
            source_file=source_file,
            source_line=source_line,
            source_root=source_root,
            synthesized_from="HUD_Register",
            synthesized_parent=elem_name,
        )

        # Args[16..]: custom param pairs until NULL terminator
        # Each pair: (param_name_string, param_default_string)
        idx = 16
        while idx + 1 < len(args):
            param_name_tokens = _tokens_of(args[idx])
            param_name = _concat_string_literals(param_name_tokens)
            if not param_name:
                break  # NULL terminator reached

            param_default = _resolve_default(_tokens_of(args[idx + 1]))
            cvar_name = f"hud_{elem_name}_{param_name}"
            desc_full = (
                f"{description} [{param_name}]" if description else f"[{param_name}]"
            )
            self._emit_row(
                name=cvar_name,
                default=param_default,
                description=desc_full,
                source_file=source_file,
                source_line=source_line,
                source_root=source_root,
                synthesized_from="HUD_Register",
                synthesized_parent=elem_name,
            )
            idx += 2

    def _handle_getnvfdg(self, cursor) -> None:
        """Extract a cvar from cvarfuncs->GetNVFDG(name, default, flags, desc, ...).

        Args (via get_arguments()):
          [0] name
          [1] default
          [2] flags (skip)
          [3] description
        """
        args = list(cursor.get_arguments())
        if len(args) < 2:
            return

        name_tokens = _tokens_of(args[0])
        cvar_name = _concat_string_literals(name_tokens)
        if not cvar_name:
            return

        # Skip tp_name_* item-name aliases (not config cvars)
        if cvar_name.startswith("tp_name_"):
            return

        default = ""
        if len(args) > 1:
            default = _resolve_default(_tokens_of(args[1]))

        description = None
        if len(args) > 3:
            description = _concat_string_literals(_tokens_of(args[3]))

        source_file = cursor.location.file.name if cursor.location.file else None
        source_line = cursor.location.line
        source_root = getattr(self, "current_source_root", "plugin:ezhud")

        self._emit_row(
            name=cvar_name,
            default=default,
            description=description,
            source_file=source_file,
            source_line=source_line,
            source_root=source_root,
            synthesized_from="GetNVFDG",
            synthesized_parent=None,
        )

    # -- Internal helpers ----------------------------------------------------

    def _emit_row(
        self,
        *,
        name: str,
        default: str,
        description: Optional[str],
        source_file: Optional[str],
        source_line: int,
        source_root: str,
        synthesized_from: str,
        synthesized_parent: Optional[str],
    ) -> None:
        """Append a synthesized row, deduplicating by name within the current file."""
        if name in self._seen_in_file:
            return
        self._seen_in_file.add(name)

        row: dict = {
            "name": name,
            "default": default,
            "description": description,
            "source_file": source_file,
            "source_line": source_line,
            "source_root": source_root,
            "synthesized_from": synthesized_from,
        }
        if synthesized_parent is not None:
            row["synthesized_parent"] = synthesized_parent

        self._rows.append(row)
