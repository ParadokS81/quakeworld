"""Commands handler for the QWFWD AST extractor.

Detects `Cmd_AddCommand("name", fn)` call sites across QWFWD src/*.c and
emits one JSON entity per registered command. QWFWD uses only
`Cmd_AddCommand` -- no description-bearing variant exists.

NO FILE-LEVEL EXCLUSION for cmd.c or cvar.c. Both files contain genuine
Cmd_AddCommand registrations that MUST be captured:
  - cmd.c lines ~1071-1079: exec, echo, alias, wait, cmdlist, help,
    unaliasall, unalias, if  (9 genuine registrations)
  - cvar.c lines ~524-530: cvarlist, toggle, set, inc, cvar_hash_print
    (5 genuine registrations)

The CALL_EXPR filter handles cmd.c/cvar.c machinery naturally: the
function definition, Sys_Error calls, and Sys_Printf calls are NOT
Cmd_AddCommand CALL_EXPRs with a literal first arg and a function-ref
second arg, so the machinery is never emitted. Only the registration sites
match. No manual exclusion is needed.

Cross-file banner harvest (Pattern 9): QWFWD source uses the same Doom-style
block-comment convention as MVDSV (/* === Title === Body === */). We emit
_fn_def rows for FUNCTION_DECL definitions so finalize() can join handler
name -> description across file boundaries. Coverage is best-effort; many
handlers lack a preceding banner.

Cross-file dedup in finalize(): first-wins by command name (sorted
registration order is source order; the driver delivers files in sorted
path order, so first-wins is deterministic for V8 reproducibility).
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
from extractor_lib._source import read_extent, strip_quotes  # noqa: E402


# Banner parsing: same rules as MVDSV's handler.
_DECORATION_RE = re.compile(r"^[=\-]+$")
_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _is_valid_command_name(name: str) -> bool:
    """Cheap sanity check: real QW commands are short identifiers (letters,
    digits, underscores, optional leading +/-). Anything containing [ ] ( ) . or
    whitespace is a parse artefact (e.g. `logs[i].command` from a for-loop
    dispatch site where the arg is not a literal)."""
    if not name:
        return False
    if any(c in name for c in "[](). \t\n"):
        return False
    return True


def _function_banner(source_bytes: bytes, fn_def_offset: int) -> Optional[str]:
    """Walk back from fn_def_offset to the immediately preceding /* ... */ block
    and extract description text from a Doom-style banner.

    Rules (identical to MVDSV handler):
      - The block must be visually adjacent: only whitespace between */ and
        the function definition's start byte. Any non-whitespace means the
        comment belongs to something else.
      - Decoration lines matching ^[=-]+$ are skipped.
      - Bare identifier lines (the banner-title row, e.g. SV_AddIP_f) are
        skipped. Using bare-identifier elimination rather than name equality
        because QWFWD source has the same copy-paste title/function-name
        mismatches as MVDSV.
      - Blank lines are skipped.
      - Remaining lines are joined with single spaces.

    Returns None when no adjacent block exists or the block has no description
    content.
    """
    text = source_bytes.decode("utf-8", errors="replace")
    end_idx = text.rfind("*/", 0, fn_def_offset)
    if end_idx < 0:
        return None
    # Only whitespace between */ and the function's start = visually adjacent.
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
            # Bare identifier = banner-title row; skip without name equality
            # because title and actual function name sometimes disagree.
            continue
        description_lines.append(s)
    if not description_lines:
        return None
    return " ".join(description_lines).strip() or None


class CommandsQwfwdHandler(Visitor):
    """QWFWD commands handler (Cmd_AddCommand call-site detection + banner harvest).

    Direct port of CommandsMvdsvHandler. No file-level exclusion for cmd.c or
    cvar.c -- both contain genuine registrations. The CALL_EXPR filter ignores
    the machinery (function definitions, error/printf calls) because those are
    not Cmd_AddCommand CALL_EXPRs with the required arg shape.

    No struct-array dispatch: QWFWD does not use the log_t-style for-loop
    registration pattern found in MVDSV's sv_ccmds.c. Every registration site
    is a direct Cmd_AddCommand("literal", handler_fn) call.
    """
    name = "commands"
    output_filename = "qwfwd-commands-ast.json"
    payload_field = "commands"

    # Registration API spelling. QWFWD uses only Cmd_AddCommand.
    REGISTRATION_API: str = "Cmd_AddCommand"

    def setup(self, *, qwfwd_repo: Path, qwfwd_src: Path) -> None:
        # Store the repo root so _relative_source can produce reproducible paths.
        self._repo_root = qwfwd_repo

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        # No file-level exclusion: cmd.c and cvar.c contain genuine registrations.
        self._rows: list[dict] = []
        # Per-file dedup: a command name or function-def name should appear at
        # most once per file across the two platform variants (base + win).
        # First-wins within the file; cross-file first-wins in finalize().
        self._seen_cmds_in_file: set[str] = set()
        self._seen_fns_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        kind = cursor.kind

        # ---- Track FUNCTION_DECL definitions for banner harvest across files.
        # Registration call site and handler definition usually live in different
        # files. Emit a _fn_def row carrying the parsed banner; finalize() joins
        # handler name -> description after all files are processed.
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
            # FUNCTION_DECL is never a Cmd_AddCommand call; stop here.
            return

        # ---- Detect Cmd_AddCommand("literal", handler_fn) call sites.
        if kind != CursorKind.CALL_EXPR or cursor.spelling != self.REGISTRATION_API:
            return

        args = list(cursor.get_arguments())
        if len(args) < 2:
            return

        # First arg must be a string literal. Non-literal first args
        # (e.g. a variable or struct-field expression) indicate a for-loop
        # dispatch site we cannot resolve here; skip them.
        name_raw = read_extent(self.source_bytes, args[0].extent).strip()
        name = strip_quotes(name_raw)
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
            "source_column": location.column,
        })
        self._seen_cmds_in_file.add(name)

    def _relative_source(self, abs_path: str) -> str:
        """Return a repo-root-relative path string so source_file is
        reproducible across machines (V8). Falls back to absolute path if the
        file is somehow outside the repo root (should not happen for src/*.c)."""
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
        # Partition into function-def rows and command call-site rows.
        fn_descriptions: dict[str, Optional[str]] = {}
        cmd_rows: list[dict] = []
        for r in all_rows:
            kind = r.get("_kind")
            if kind == "_fn_def":
                fn_name = r["fn_name"]
                if fn_name not in fn_descriptions:
                    fn_descriptions[fn_name] = r.get("description")
                else:
                    # Prefer non-None: if a later definition carries banner text
                    # and the first entry didn't, take the text.
                    if fn_descriptions[fn_name] is None and r.get("description"):
                        fn_descriptions[fn_name] = r["description"]
            elif kind == "_cmd":
                cmd_rows.append(r)

        # Cross-file first-wins by command name. Driver delivers files in
        # sorted path order; first-wins is therefore deterministic (V8).
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
        for r in unique:
            handler_fn = r.get("handler_fn")
            description = fn_descriptions.get(handler_fn) if handler_fn else None
            if handler_fn:
                with_handler += 1
            if description:
                with_description += 1
            out_rows.append({
                "name": r["name"],
                "ast": {
                    "handler_fn": handler_fn,
                    "source_file": r.get("source_file"),
                    "source_line": r.get("source_line"),
                    "source_column": r.get("source_column"),
                    # description: banner text from the handler definition, or
                    # null. Filled by the Phase-3 describe pass for most entries.
                    "description": description,
                    # enclosing_function: adapter reads this for the
                    # registration_file column. QWFWD registrations are at
                    # file scope (init functions), not nested inside another
                    # command handler, so this is always null here.
                    "enclosing_function": None,
                },
            })

        # Sort by name for deterministic output (V8 reproducibility).
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
