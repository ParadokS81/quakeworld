"""Commands handler for the MVDSV AST extractor.

Detects `Cmd_AddCommand("name", Function_f)` call sites. MVDSV uses ONLY
`Cmd_AddCommand` -- no `Cmd_AddCommandD` or `Cmd_AddLegacyCommand` (verified
Pass 1, sv_ccmds.c + sv_init.c + sv_demo.c + cvar.c + fs.c, 114 sites total).

NEW SUB-PATTERN: function-banner description harvest. For each registered
handler function (e.g. `SV_Kick_f`), find the function's *definition* cursor
and walk back from its source byte offset to the immediately preceding
`/* ... */` comment block. Parse the Doom-style banner using these rules:

  - Block delimited by `/*` and `*/`.
  - Block must be visually adjacent to the function definition (only
    whitespace between the closing `*/` and the function definition's start).
  - Decoration lines matching `^[=\\-]+$` are skipped.
  - Bare-identifier lines are skipped (the banner-title row, e.g.
    `SV_Kick_f`, `Cache_Print`, `ED2_PrintEdicts`). Bare-identifier
    elimination handles MVDSV's many copy-paste mismatches between banner
    title and actual function name.
  - Blank lines are skipped.
  - Remaining text lines are joined with single spaces and emitted as
    `description`.

Example (sv_ccmds.c around SV_Kick_f):

    /*
    ==================
    SV_Kick_f

    Kick a user off of the server
    ==================
    */
    void SV_Kick_f (void)  ->  description = "Kick a user off of the server"

Coverage estimated 30-50% of MVDSV commands (some handlers have banner-only
or no preceding comment block at all).

STRUCT-ARRAY DISPATCH (parallel to ezQuake handler_commands.py). MVDSV's
sv_ccmds.c registers 7 log commands via:

    log_t logs[MAX_LOG] = {
        {NULL, "logfile", "qconsole_", ..., SV_Logfile_f, 0},
        {NULL, "logerrors", "qerror_", ..., SV_ErrorLogfile_f, 0},
        ...
    };
    for (i = MIN_LOG; i < MAX_LOG; ++i)
        Cmd_AddCommand(logs[i].command, logs[i].function);

The Cmd_AddCommand at the loop site has non-literal args, so the call-site
detector can't resolve them. We additionally walk VAR_DECLs of recognised
table types (currently `log_t`) and emit one command row per array element.
Field indices match ezQuake's _COMMAND_TABLE_TYPES: name=1, handler=5.

CROSS-FILE RESOLUTION. Handler functions register in `sv_init.c` /
`sv_ccmds.c` but are defined elsewhere (different .c files). Because the
driver runs handlers under fork-mode multiprocessing -- workers accumulate
per-file rows and the parent merges -- per-handler `self._fn_defs` set in a
worker is invisible to `finalize` in the parent. Strategy: emit two row
types per file (command call sites and function definitions), merge in
`finalize`, then resolve handler -> banner there. The banner-walk happens
in the worker (where source_bytes is available) and the parsed description
travels in the row.

Per-file dedup: command name (within file). Cross-file: first-wins by
canonical name in `finalize` (same convention as ezQuake/FTE handlers).
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


_DECORATION_RE = re.compile(r"^[=\-]+$")
_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _read_extent(source_bytes: bytes, extent) -> str:
    """Return the source text for an AST extent."""
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


# `_resolve_fn_ref` was lifted to `extractor_lib/_resolve.py` (Phase D Task 9)
# with the more permissive qc_builtins-derived policy: when libclang fails to
# resolve the referenced decl, fall back to the cursor's own spelling rather
# than returning None. The earlier strict policy here silently dropped any
# unresolved reference; the unified helper keeps the spelling so MVDSV's
# Cmd_AddCommand handler-fn names survive even when the type-graph is
# incomplete.


def _strip_array_and_qualifiers(tspell: str) -> str:
    """Reduce a type spelling like `log_t[7]` or `const log_t[]` to `log_t`."""
    s = tspell.split("[", 1)[0].strip()
    for q in ("const ", "static "):
        if s.startswith(q):
            s = s[len(q):].strip()
    return s


# Struct-array tables whose elements register a command via for-loop iteration
# at a non-literal Cmd_AddCommand call site. Each entry maps the underlying
# struct-type name to (name_field_index, handler_field_index) for the nested
# initializer.
#
# log_t (src/log.h:27) layout: {sv_logfile, command, file_name, message_off,
# message_on, function, log_level} -- name=1, handler=5. sv_ccmds.c:217
# defines `log_t logs[MAX_LOG] = {...}` and registers them via
# `for (i = MIN_LOG; i < MAX_LOG; ++i) Cmd_AddCommand(logs[i].command,
# logs[i].function)` at sv_ccmds.c:1829.
_COMMAND_TABLE_TYPES: dict[str, tuple[int, int]] = {
    "log_t": (1, 5),
}


def _extract_command_table(node, source_bytes: bytes) -> list[dict]:
    """Walk a VAR_DECL of a recognised table-of-commands type and return one
    pseudo-call-site row per array element. Mirrors ezQuake's
    _extract_command_table; the row shape matches what visit_cursor produces
    for normal Cmd_AddCommand call sites."""
    base = _strip_array_and_qualifiers(node.type.spelling)
    idx_pair = _COMMAND_TABLE_TYPES.get(base)
    if idx_pair is None:
        return []
    name_idx, handler_idx = idx_pair
    outer_init = None
    for c in node.get_children():
        if c.kind == CursorKind.INIT_LIST_EXPR:
            outer_init = c
            break
    if outer_init is None:
        return []
    out: list[dict] = []
    for elem in outer_init.get_children():
        init = elem
        if elem.kind != CursorKind.INIT_LIST_EXPR:
            for ch in elem.get_children():
                if ch.kind == CursorKind.INIT_LIST_EXPR:
                    init = ch
                    break
        if init.kind != CursorKind.INIT_LIST_EXPR:
            continue
        fields = list(init.get_children())
        if len(fields) <= max(name_idx, handler_idx):
            continue
        name_raw = _read_extent(source_bytes, fields[name_idx].extent).strip()
        name = _strip_quotes(name_raw)
        if not name:
            continue
        handler = resolve_fn_ref(fields[handler_idx])
        out.append({
            "name": name,
            "handler_fn": handler,
            "source_line": init.location.line,
        })
    return out


def _is_valid_command_name(name: str) -> bool:
    """Cheap sanity check: real QW commands are short identifiers (letters,
    digits, underscores, plus optional leading +/-). Anything containing
    [ or ] or whitespace is a parse artefact (e.g. `logs[i].command`)."""
    if not name:
        return False
    if any(c in name for c in "[](). \t\n"):
        return False
    return True


def _function_banner(source_bytes: bytes, fn_def_offset: int) -> Optional[str]:
    """Walk back from `fn_def_offset` (the byte offset of a FUNCTION_DECL's
    extent.start) to the immediately preceding `/* ... */` block. Parse the
    Doom-style banner and return the description text, or None if no
    visually-adjacent block exists or the block has no description content.

    Banner-title detection uses bare-identifier-line elimination rather than
    name equality. MVDSV's source has multiple cases where the banner's
    title line disagrees with the handler's actual name (SV_Floodport_f vs
    SV_Floodprot_f, SV_Snap vs SV_SnapAll_f, SV_MasterPassword aligned with
    a different function). And many handlers don't follow the `_f`
    convention (Cache_Print, ED2_PrintEdicts). The bare-identifier rule
    cleanly skips all of these without requiring perfect name alignment.
    """
    text = source_bytes.decode("utf-8", errors="replace")
    end_idx = text.rfind("*/", 0, fn_def_offset)
    if end_idx < 0:
        return None
    # Comment block must be visually adjacent: only whitespace between `*/`
    # and the function-def's start. Anything else (`extern cvar_t ...;`,
    # another function, a `#include`) means the comment isn't this
    # function's banner.
    between = text[end_idx + 2:fn_def_offset]
    if between.strip():
        return None
    start_idx = text.rfind("/*", 0, end_idx)
    if start_idx < 0:
        return None
    block = text[start_idx + 2:end_idx]

    # Banner-title detection. MVDSV/QW convention puts the function's own
    # name on the line immediately under the top decoration row. Some title
    # lines disagree with the actual function name (copy-paste artefacts in
    # MVDSV source: SV_Floodport_f vs SV_Floodprot_f, SV_Snap vs
    # SV_SnapAll_f, SV_MasterPassword vs the actual handler) and many
    # handlers don't follow the `_f` suffix convention (Cache_Print,
    # ED2_PrintEdicts, Cache_Flush). The safest rule: any bare identifier
    # standing alone on its own line inside a banner block is the title --
    # legitimate description text never reduces to a single identifier.
    description_lines: list[str] = []
    for raw in block.splitlines():
        s = raw.strip()
        if not s:
            continue
        if _DECORATION_RE.match(s):
            continue
        if _IDENT_RE.match(s):
            # Bare identifier line: assumed to be the banner title row.
            continue
        description_lines.append(s)
    if not description_lines:
        return None
    return " ".join(description_lines).strip() or None


class CommandsMvdsvHandler(Visitor):
    name = "commands"
    output_filename = "mvdsv-commands-ast.json"
    payload_field = "commands"

    def setup(self, *, mvdsv_repo: Path, mvdsv_src: Path) -> None:
        self._repo_root = mvdsv_repo
        self._src_root = mvdsv_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        # Per-file dedup: command name (across the 3 platform variants) and
        # function-def name (FUNCTION_DECL definitions are visited under each
        # variant; first-wins per file).
        self._seen_cmds_in_file: set[str] = set()
        self._seen_fns_in_file: set[str] = set()
        self._rows: list[dict] = []

    def visit_cursor(self, cursor, variant: str) -> None:
        kind = cursor.kind

        # ---- Track FUNCTION_DECL definitions for cross-file banner harvest.
        # We can't resolve handler -> banner inside `visit_cursor` because the
        # registration call site and the handler definition usually live in
        # different files. Emit a "_fn_def" row carrying the parsed banner;
        # `finalize` merges these with the command rows.
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
            # Fall through -- a FUNCTION_DECL is never a Cmd_AddCommand call.
            return

        # ---- Struct-array dispatch for tables of (name, handler) pairs.
        # MVDSV uses log_t logs[MAX_LOG] = {...} + a for-loop registration in
        # sv_ccmds.c. The Cmd_AddCommand call at the loop site has non-literal
        # args; we recover the registrations by walking the array's static
        # initialiser instead.
        if kind == CursorKind.VAR_DECL:
            for row in _extract_command_table(cursor, self.source_bytes):
                if row["name"] in self._seen_cmds_in_file:
                    continue
                location = cursor.location
                rel_file = self._relative_source(location.file.name) if location.file else None
                self._rows.append({
                    "_kind": "_cmd",
                    "name": row["name"],
                    "handler_fn": row["handler_fn"],
                    "source_file": rel_file,
                    "source_line": row["source_line"],
                })
                self._seen_cmds_in_file.add(row["name"])
            return

        # ---- Detect Cmd_AddCommand call sites.
        if kind != CursorKind.CALL_EXPR or cursor.spelling != "Cmd_AddCommand":
            return

        args = list(cursor.get_arguments())
        if len(args) < 2:
            return

        name_raw = _read_extent(self.source_bytes, args[0].extent).strip()
        name = _strip_quotes(name_raw)
        # Reject parse artefacts: non-literal first args (e.g. `logs[i].command`)
        # produce text like `logs[i].command` here. The struct-array dispatch
        # above recovers these registrations from the array declaration.
        if not _is_valid_command_name(name):
            return
        if name in self._seen_cmds_in_file:
            return

        handler_fn = resolve_fn_ref(args[1])
        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None

        self._rows.append({
            "_kind": "_cmd",
            "name": name,
            "handler_fn": handler_fn,
            "source_file": rel_file,
            "source_line": location.line,
        })
        self._seen_cmds_in_file.add(name)

    def _relative_source(self, abs_path: str) -> str:
        """Make source_file repo-relative; fall back to absolute if outside."""
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_cmds_in_file = set()
        self._seen_fns_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Partition into command rows and function-def rows.
        fn_descriptions: dict[str, Optional[str]] = {}
        cmd_rows: list[dict] = []
        for r in all_rows:
            kind = r.get("_kind")
            if kind == "_fn_def":
                # First-wins on function name. A function may appear in
                # multiple files via `extern` forward-decls, but only the
                # definition site (is_definition() == True) makes it here.
                # Across the 3 platform variants the same definition is
                # visited up to 3 times; per-file dedup already collapsed
                # those into one row. Cross-file collisions are rare.
                fn_name = r["fn_name"]
                if fn_name not in fn_descriptions:
                    fn_descriptions[fn_name] = r.get("description")
                else:
                    # Prefer a non-None description if a later definition
                    # carries banner text and the first didn't.
                    if fn_descriptions[fn_name] is None and r.get("description"):
                        fn_descriptions[fn_name] = r["description"]
            elif kind == "_cmd":
                cmd_rows.append(r)

        # Cross-file first-wins by command name.
        seen: set[str] = set()
        unique: list[dict] = []
        for r in cmd_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)

        out_rows: list[dict] = []
        with_description = 0
        with_handler = 0
        for r in unique:
            handler_fn = r.get("handler_fn")
            description = (
                fn_descriptions.get(handler_fn) if handler_fn else None
            )
            if description:
                with_description += 1
            if handler_fn:
                with_handler += 1
            out_rows.append({
                "name": r["name"],
                "ast": {
                    "handler_fn": handler_fn,
                    "source_file": r.get("source_file"),
                    "source_line": r.get("source_line"),
                    "description": description,
                },
            })
        out_rows.sort(key=lambda r: r["name"])

        stats = {
            "source_total_call_sites": len(cmd_rows),
            "function_defs_indexed": len(fn_descriptions),
            "count": len(out_rows),
            "with_handler": with_handler,
            "with_description": with_description,
        }
        return {
            "commands": out_rows,
            "_stats": stats,
        }
