"""Commands handler for the KTX AST extractor.

Detects three command-table declarations in KTX source:

  - cmd_t cmds[]                     at src/commands.c:693 (~317-371 entries)
  - frogbot_cmd_t std_commands[]     at src/bot_commands.c:2315 (14 entries)
  - frogbot_cmd_t editor_commands[]  at src/bot_commands.c:2332 (25 entries)

PATTERN 4 (struct-literal command tables iterated via dispatch). KTX's
cmd_t cmds[] sits at module scope; FrogbotsCommand at commands.c:1047
selects between std_commands and editor_commands based on
FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE), so bot subcommands are
reached as `botcmd <name>` from the player console. Each handler walks
the array's static initializer directly to recover names + handler-fn
references; the runtime dispatch is irrelevant to extraction.

PATTERN 14 CANONICAL-NAME SUFFIXING (D7). The three tables overlap in
naming space without a suffix:
  - main vs std: 1 collision (info)
  - main vs editor: 1 collision (info)
  - std vs editor: 0 collisions in the canonical-1.46 source-walk; F1
    spec anchor said 25 collisions (every editor entry overlaps a std
    entry). Live source disagrees -- the std and editor tables are
    distinct command-name spaces (std: bot management; editor: marker /
    path manipulation). The Pattern 14 suffix is applied REGARDLESS of
    today's collision count -- it is a defensive API-surface marker
    (frogbot std vs editor are different runtime sub-namespaces) and
    survives any future tag adding overlapping names.

Suffix rules (D7):
  - cmd_t cmds[] entry "race"           -> canonical "race"
  - std_commands[] entry "skill"        -> canonical "skill:frogbot:std"
  - editor_commands[] entry "addmarker" -> canonical "addmarker:frogbot:editor"

Per-file dedup _seen_in_file is keyed on the FULL canonical name
(post-suffix), not the bare name. This preserves cross-table siblings if
any future name overlaps emerge.

DESCRIPTION SOURCES (priority order per spec 1.5):
  1. CD_* macro at the row's description-field index (Pattern 6 same-file
     #define resolution -- now via self.file_macros from the Phase 1 lift,
     reaching the transitive #include closure, e.g. maps_macros.h or
     commands.h, plus deeper headers via depth-N). Resolved via
     self.file_macros[ident] when the description-field extent is an
     all-caps identifier.
  2. Inline string literal in the row (frogbot tables already carry
     these as field 2 / 3 of the {name, fn, "desc"} init).
  3. Banner-comment harvest at the handler-function FUNCTION_DECL
     (Pattern 9; cross-file via two-row emission per Pattern 13). Falls
     back to NULL when no banner exists.

For the cmd_t cmds[] table, the description field is at index 4 (after
name, function, value, flags). For frogbot_cmd_t std/editor tables, it
is at index 2.

CROSS-CODEBASE PORT (D3). Inherits from Visitor only.

OUTPUT SHAPE (one row per unique canonical name; first-wins cross-file):

    {
      "name": "race",                # bare for cmds[]
      "bare_name": "race",
      "desc": "Toggle race mode",    # top-level so load-commands.ts pulls into help_desc
      "ast": {
        "handler_fn": "ToggleRace",
        "source_file": "src/commands.c",
        "source_line": 698,
        "source_column": 3,
        "table": "cmds",             # cmds | frogbot_std | frogbot_editor
        "description_source": "cd_macro" | "inline" | "banner" | null,
        "enclosing_function": null,  # KTX cmd_t / frogbot_cmd_t are module-scope arrays
      }
    }

For Pattern 14 suffixed entries, `name = "<bare>:frogbot:std"` /
`":frogbot:editor"`; `bare_name = "<bare>"` (preserved at top level for
load-commands.ts -- mirrors MVDSV's info_key bare_name pattern).

KTX has NO help_*.json, so finalize does not merge help text -- desc is
purely source-derived per the priority order.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._resolve import resolve_fn_ref  # noqa: E402
from extractor_lib._source import (  # noqa: E402
    literal_string,
    read_extent,
    strip_array_and_qualifiers,
    strip_quotes,
)

_DECORATION_RE = re.compile(r"^[=\-]+$")
_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_MACRO_IDENT_RE = re.compile(r"^[A-Z_][A-Z0-9_]+$")


# Per-table struct shape: maps the underlying base type (after
# strip_array_and_qualifiers) to (name_idx, handler_idx, desc_idx).
# Confirmed at canonical KTX 1.46:
#   cmd_t struct        @ src/commands.c:686-692  -> { name, function, value, flags, desc }
#   frogbot_cmd_t struct @ src/bot_commands.c:2308-2313 -> { name, function, desc }
_COMMAND_TABLE_SHAPES: dict[str, tuple[int, int, int]] = {
    "cmd_t":         (0, 1, 4),  # name, function, desc-idx in cmd_t init
    "frogbot_cmd_t": (0, 1, 2),  # name, function, desc-idx in frogbot_cmd_t init
}

# Map (base_type, var_spelling) -> sub-namespace tag for Pattern 14.
# When the sub-namespace tag is None (cmd_t cmds[]), no suffix applied.
# When non-None, canonical_name = "<bare>:" + sub_ns_tag.
_SUB_NS_BY_TABLE: dict[tuple[str, str], Optional[str]] = {
    ("cmd_t",         "cmds"):            None,
    ("frogbot_cmd_t", "std_commands"):    "frogbot:std",
    ("frogbot_cmd_t", "editor_commands"): "frogbot:editor",
}


def _function_banner(source_bytes: bytes, fn_def_offset: int) -> Optional[str]:
    """Doom-style /* === Title === Body === */ banner harvest. Mirrors
    mvdsv/_handler_commands.py::_function_banner -- shape-identical;
    behavior should match exactly. Bare-identifier-line elimination
    handles KTX's copy-paste banner-title mismatches the same way."""
    text = source_bytes.decode("utf-8", errors="replace")
    end_idx = text.rfind("*/", 0, fn_def_offset)
    if end_idx < 0:
        return None
    between = text[end_idx + 2:fn_def_offset]
    if between.strip():
        return None
    start_idx = text.rfind("/*", 0, end_idx)
    if start_idx < 0:
        return None
    block = text[start_idx + 2:end_idx]
    description_lines: list[str] = []
    for raw in block.splitlines():
        s = raw.strip()
        if not s:
            continue
        if _DECORATION_RE.match(s):
            continue
        if _IDENT_RE.match(s):
            continue
        description_lines.append(s)
    if not description_lines:
        return None
    return " ".join(description_lines).strip() or None


class CommandsKtxHandler(Visitor):
    """KTX commands handler (Pattern 4 + Pattern 6 + Pattern 9 + Pattern 14).

    Three target tables: cmd_t cmds[], frogbot_cmd_t std_commands[],
    frogbot_cmd_t editor_commands[]. Cross-codebase port from Visitor only
    (D3) -- no parent-project subclass.
    """
    name = "commands"
    output_filename = "ktx-commands-ast.json"
    payload_field = "commands"

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        self._repo_root = ktx_repo
        self._src_root = ktx_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup keyed on the FULL canonical name (post-Pattern-14
        # suffix). Bare-name dedup would drop legitimate cross-namespace
        # entries like "save" (editor_commands) vs a hypothetical future
        # "save" in cmds[].
        self._seen_in_file: set[str] = set()
        # FUNCTION_DECL banners harvested in this file (Pattern 9). Used by
        # finalize for cross-file resolution: a cmd row's handler_fn may
        # resolve to a function-def in another .c, so we emit banner rows
        # alongside cmd rows and merge in finalize.
        self._seen_fns_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        kind = cursor.kind

        # Pattern 9: FUNCTION_DECL banner harvest (cross-file via Pattern 13).
        if kind == CursorKind.FUNCTION_DECL and cursor.is_definition():
            fn_name = cursor.spelling
            if fn_name and fn_name not in self._seen_fns_in_file:
                self._seen_fns_in_file.add(fn_name)
                description = _function_banner(
                    self.source_bytes,
                    cursor.extent.start.offset,
                )
                self._rows.append({
                    "_kind": "_fn_def",
                    "fn_name": fn_name,
                    "description": description,
                })
            return

        # Pattern 4: struct-literal command tables.
        if kind != CursorKind.VAR_DECL:
            return
        base = strip_array_and_qualifiers(cursor.type.spelling)
        shape = _COMMAND_TABLE_SHAPES.get(base)
        if shape is None:
            return
        sub_ns = _SUB_NS_BY_TABLE.get((base, cursor.spelling))
        # Skip unknown VAR_DECLs of cmd_t/frogbot_cmd_t type that are not
        # the canonical three tables -- defensive against future helper
        # arrays that share the type but should not be treated as
        # registration tables.
        if (base, cursor.spelling) not in _SUB_NS_BY_TABLE:
            return

        outer_init = None
        for child in cursor.get_children():
            if child.kind == CursorKind.INIT_LIST_EXPR:
                outer_init = child
                break
        if outer_init is None:
            return

        name_idx, handler_idx, desc_idx = shape
        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None

        for elem in outer_init.get_children():
            init = elem
            if elem.kind != CursorKind.INIT_LIST_EXPR:
                # Designated-init or wrapped expression; descend to find
                # the actual INIT_LIST_EXPR if present.
                for ch in elem.get_children():
                    if ch.kind == CursorKind.INIT_LIST_EXPR:
                        init = ch
                        break
            if init.kind != CursorKind.INIT_LIST_EXPR:
                continue
            fields = list(init.get_children())
            if len(fields) <= max(name_idx, handler_idx):
                continue

            bare_name = literal_string(fields[name_idx], self.source_bytes)
            if not bare_name:
                continue

            handler_fn = resolve_fn_ref(fields[handler_idx])

            # Description resolution per spec 1.5 priority order.
            description: Optional[str] = None
            description_source: Optional[str] = None
            if len(fields) > desc_idx:
                desc_field = fields[desc_idx]
                # 1. Inline literal (frogbot std/editor tables ship these directly).
                inline = literal_string(desc_field, self.source_bytes)
                if inline:
                    description = inline
                    description_source = "inline"
                else:
                    # 2. CD_* macro via self.file_macros (Pattern 6 lift).
                    raw = read_extent(self.source_bytes, desc_field.extent).strip()
                    if _MACRO_IDENT_RE.match(raw):
                        macro_val = self.file_macros.get(raw)
                        if macro_val is not None:
                            description = macro_val
                            description_source = "cd_macro"
            # 3. Banner-comment fallback handled in finalize (handler_fn ->
            # banner via cross-file _fn_def merge per Pattern 13).

            # Pattern 14 suffix application.
            canonical_name = bare_name if sub_ns is None else f"{bare_name}:{sub_ns}"
            if canonical_name in self._seen_in_file:
                continue

            row: dict = {
                "_kind": "_cmd",
                "name": canonical_name,
                "bare_name": bare_name,
                "ast": {
                    "handler_fn": handler_fn,
                    "source_file": rel_file,
                    "source_line": init.location.line,
                    "source_column": init.location.column,
                    "table": cursor.spelling,
                    "description_source": description_source,
                    "enclosing_function": None,
                },
            }
            if description is not None:
                row["desc"] = description
            self._rows.append(row)
            self._seen_in_file.add(canonical_name)

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        self._seen_fns_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Partition into cmd rows and fn-def banners.
        fn_descriptions: dict[str, Optional[str]] = {}
        cmd_rows: list[dict] = []
        for r in all_rows:
            kind = r.get("_kind")
            if kind == "_fn_def":
                fn_name = r["fn_name"]
                if fn_name not in fn_descriptions:
                    fn_descriptions[fn_name] = r.get("description")
                else:
                    # Prefer non-None when the first observation lacked a banner.
                    if fn_descriptions[fn_name] is None and r.get("description"):
                        fn_descriptions[fn_name] = r["description"]
            elif kind == "_cmd":
                cmd_rows.append(r)

        # Cross-file first-wins by canonical name.
        seen: set[str] = set()
        unique: list[dict] = []
        for r in cmd_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)

        out_rows: list[dict] = []
        with_handler = 0
        with_description = 0
        by_table: dict[str, int] = {}
        for r in unique:
            handler_fn = r["ast"].get("handler_fn")
            description = r.get("desc")
            description_source = r["ast"].get("description_source")

            # Banner fallback: only fire if priority 1 + 2 produced nothing.
            if description is None and handler_fn:
                banner = fn_descriptions.get(handler_fn)
                if banner:
                    description = banner
                    description_source = "banner"

            entry: dict = {
                "name": r["name"],
                "bare_name": r["bare_name"],
                "ast": dict(r["ast"]),
            }
            entry["ast"]["description_source"] = description_source
            if description:
                entry["desc"] = description
                with_description += 1
            if handler_fn:
                with_handler += 1
            tbl = r["ast"].get("table") or "?"
            by_table[tbl] = by_table.get(tbl, 0) + 1

            out_rows.append(entry)

        out_rows.sort(key=lambda r: r["name"])
        return {
            "commands": out_rows,
            "_stats": {
                "source_total": len(cmd_rows),
                "function_defs_indexed": len(fn_descriptions),
                "count": len(out_rows),
                "with_handler": with_handler,
                "with_description": with_description,
                "by_table": by_table,
            },
        }
