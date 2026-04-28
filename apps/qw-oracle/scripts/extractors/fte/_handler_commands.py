"""Commands handler for the FTE (FTEQW) AST extractor.

Detects Cmd_AddCommand / Cmd_AddCommandD / Cmd_AddCommandAD / Cmd_AddCommandOld
CALL_EXPR callsites and collects per-command registration metadata.

API argument layout:
    Cmd_AddCommand(name, fn)                          -> 2 args, no desc
    Cmd_AddCommandD(name, fn, desc)                   -> 3 args, desc=arg[2]
    Cmd_AddCommandAD(name, fn, argcompletion, desc)   -> 4 args, desc=arg[3]
    Cmd_AddCommandOld(old_name, fn, new_name)         -> 3 args, legacy alias shim
        arg[0] = old command name, arg[2] = target (new) name, handler = None

Per-file dedup by command name. Cross-file: first-wins on collisions; later
rows fill missing description or handler fields (same merge policy as cvars).
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._resolve import resolve_fn_ref  # noqa: E402
from extractor_lib._source import concat_string_literals  # noqa: E402


# ---------------------------------------------------------------------------
# API descriptor table
# ---------------------------------------------------------------------------

# Maps function name -> (min_args, desc_arg_index_or_None, is_old_alias)
# desc_arg_index: 0-based index into CALL_EXPR get_arguments() result
# is_old_alias: True means arg[2] is the redirect target, no real handler
CMD_ADDERS: dict[str, tuple[int, Optional[int], bool]] = {
    "Cmd_AddCommand":    (2, None, False),
    "Cmd_AddCommandD":   (3, 2,    False),
    "Cmd_AddCommandAD":  (4, 3,    False),
    "Cmd_AddCommandOld": (3, None, True),
}


# ---------------------------------------------------------------------------
# String literal + function-ref helpers (same pattern as cvars handler)
# ---------------------------------------------------------------------------

def _tokens_of(cursor) -> list[str]:
    return [t.spelling for t in cursor.get_tokens()]


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------

class CommandsFteHandler(Visitor):
    name = "commands"
    output_filename = "fte-commands-ast.json"

    def __init__(self) -> None:
        # Cross-file aggregator: cmd_name -> row dict (first-wins; later rows
        # may fill missing description or handler)
        self._all_rows: dict[str, dict] = {}

    # -- Visitor lifecycle ---------------------------------------------------

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        api = cursor.spelling
        if api not in CMD_ADDERS:
            return

        loc = cursor.location
        if not loc.file:
            return

        min_args, desc_idx, is_old = CMD_ADDERS[api]
        args = list(cursor.get_arguments())
        if len(args) < min_args:
            return

        # arg[0] is always the command name string literal
        cmd_name = concat_string_literals(_tokens_of(args[0]))
        if not cmd_name:
            return

        # Per-file dedup by name
        if cmd_name in self._seen_in_file:
            return
        self._seen_in_file.add(cmd_name)

        # Description (or None)
        description: Optional[str] = None
        if desc_idx is not None and len(args) > desc_idx:
            description = concat_string_literals(_tokens_of(args[desc_idx]))

        # Handler function reference
        handler: Optional[str] = None
        if not is_old:
            handler = resolve_fn_ref(args[1])

        # For Cmd_AddCommandOld: arg[2] is the redirect target
        legacy_alias_of: Optional[str] = None
        if is_old and len(args) > 2:
            legacy_alias_of = concat_string_literals(_tokens_of(args[2]))

        row: dict = {
            "name": cmd_name,
            "handler": handler,
            "description": description or "",
            "source_file": loc.file.name,  # made relative in finalize
            "source_line": loc.line,
            "source_root": getattr(self, "current_source_root", None),
            "registration_api": api,
        }
        if legacy_alias_of is not None:
            row["legacy_alias_of"] = legacy_alias_of

        self._rows.append(row)

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        """Collapse per-file rows into final JSON output.

        Cross-file dedup is first-wins by command name. Later rows fill in
        missing description or handler when the winner lacks them.
        """
        deduped: dict[str, dict] = {}
        for row in all_rows:
            name = row["name"]
            if name not in deduped:
                deduped[name] = row
            else:
                existing = deduped[name]
                if not existing.get("description") and row.get("description"):
                    existing["description"] = row["description"]
                if not existing.get("handler") and row.get("handler"):
                    existing["handler"] = row["handler"]

        repo_root_path = Path(repo_root).resolve()

        commands_out: dict[str, dict] = {}
        stats: dict = {
            "count": 0,
            "with_description": 0,
            "legacy_aliases": 0,
            "by_source_root": {},
            "by_api": {},
        }

        for row in deduped.values():
            # Make source_file repo-relative
            src_file = row.get("source_file")
            if src_file:
                try:
                    src_file = str(Path(src_file).resolve().relative_to(repo_root_path))
                except ValueError:
                    pass  # leave absolute if not under repo_root

            # Emit loader-compatible shape: source-location fields inside an
            # `ast` block (matches CommandAstBlock in types.ts). Source-backed
            # is signalled by ast != null. FTE commands are always source-backed.
            ast_block: dict = {
                "handler_fn": row.get("handler"),
                "source_file": src_file,
                "source_line": row.get("source_line"),
                "source_column": None,
                "enclosing_function": None,
                "build_variant": "client",
            }

            desc_str = row.get("description") or ""
            entry: dict = {
                "desc": desc_str or None,
                "source_root": row.get("source_root"),
                "ast": ast_block,
            }
            if "legacy_alias_of" in row:
                entry["legacy_alias_of"] = row["legacy_alias_of"]

            commands_out[row["name"]] = entry

            # Stats
            stats["count"] += 1
            if desc_str:
                stats["with_description"] += 1
            if "legacy_alias_of" in entry:
                stats["legacy_aliases"] += 1
            src_root = row.get("source_root") or "unknown"
            stats["by_source_root"][src_root] = (
                stats["by_source_root"].get(src_root, 0) + 1
            )
            api_key = row.get("registration_api") or "unknown"
            stats["by_api"][api_key] = stats["by_api"].get(api_key, 0) + 1

        sorted_commands = {k: commands_out[k] for k in sorted(commands_out)}
        return {"commands": sorted_commands, "_stats": stats}
