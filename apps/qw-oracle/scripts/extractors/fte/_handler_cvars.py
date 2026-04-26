"""Cvars handler for the FTE (FTEQW) AST extractor.

Detects post-macro-expanded `cvar_t` struct-initializer VAR_DECLs produced
by the CVARD / CVARFD / CVARAFD / CVARAD macro families, and collects
Cvar_Register call-sites that attribute group labels to cvar variables.

FTE's cvar macros expand to a `cvar_t` struct initializer. libclang sees the
post-expansion struct when PARSE_DETAILED_PROCESSING_RECORD is enabled. The
field layout after expansion is:

  0: ConsoleName         -- string literal (cvar name)
  1..6: internal fields  -- NULL/0 placeholders
  7: ConsoleName2/alias  -- string literal or NULL
  8: Callback            -- function pointer or NULL
  9: Description         -- string literal or NULL
  10: Value/default      -- string literal

Flags live in field 3, parsed from source tokens for CVAR_* identifiers.

Group attribution: Cvar_Register(&varname, cvargroup_xxx) links a cvar C
identifier to a group string. Group string literals are sourced from either
#define cvargroup_xxx "..." or char cvargroup_xxx[] = "..."; in the same
translation unit (or its headers).

The driver calls start_file once, then walk_tu_dispatch 4 times (client /
server / win / client_vk) before end_file. Per-file dedup on cvar name is
applied across all 4 variants; cross-file (across all files) dedup is
first-wins by name in finalize().
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

import sys
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


# ---------------------------------------------------------------------------
# Token / string helpers
# ---------------------------------------------------------------------------

def _tokens_of(cursor) -> list[str]:
    """Return the raw spelling of every token in a cursor's extent."""
    return [t.spelling for t in cursor.get_tokens()]


def _concat_string_literals(tokens: list[str]) -> Optional[str]:
    """C adjacent-string-literal concatenation.

    ["\"foo\"", "\"bar\""] -> "foobar"
    Returns None if there are no string-literal tokens (e.g. NULL arg).
    """
    parts = []
    for t in tokens:
        t = t.strip()
        if t.startswith('"') and t.endswith('"') and len(t) >= 2:
            parts.append(t[1:-1])
        elif t in ("NULL", "(((", "((void"):
            return None
    if not parts:
        return None
    return "".join(parts)


def _flags_from_tokens(tokens: list[str]) -> list[str]:
    """Extract CVAR_* identifiers from a token list, skipping CVAR_t noise."""
    return [t for t in tokens if t.startswith("CVAR_") and t != "CVAR_t"]


# ---------------------------------------------------------------------------
# Per-file group-definition parsing (regex over source bytes)
# ---------------------------------------------------------------------------

# Matches:  #define cvargroup_foo "Input controls"
_RE_DEFINE_GROUP = re.compile(
    rb'#\s*define\s+(cvargroup_\w+)\s+"([^"]*)"'
)

# Matches:  char cvargroup_foo[] = "Input controls";
_RE_ARRAY_GROUP = re.compile(
    rb'char\s+(cvargroup_\w+)\s*\[\s*\]\s*=\s*"([^"]*)"'
)


def _parse_group_defs_from_source(source_bytes: bytes) -> dict[str, str]:
    """Scan raw source bytes for cvargroup_xxx definitions.

    Returns dict mapping C identifier -> human-readable group string.
    Both #define and char[] forms are supported.
    """
    groups: dict[str, str] = {}
    for m in _RE_DEFINE_GROUP.finditer(source_bytes):
        ident = m.group(1).decode("utf-8", errors="replace")
        label = m.group(2).decode("utf-8", errors="replace")
        groups[ident] = label
    for m in _RE_ARRAY_GROUP.finditer(source_bytes):
        ident = m.group(1).decode("utf-8", errors="replace")
        label = m.group(2).decode("utf-8", errors="replace")
        groups[ident] = label
    return groups


# ---------------------------------------------------------------------------
# cvar_t field extractor
# ---------------------------------------------------------------------------

def _extract_cvar_fields(node) -> Optional[dict]:
    """Walk a VAR_DECL node of type cvar_t and extract all relevant fields.

    Returns a raw-field dict or None if the node lacks an INIT_LIST_EXPR
    (forward declarations, extern decls).
    """
    init_list = None
    for c in node.get_children():
        if c.kind == CursorKind.INIT_LIST_EXPR:
            init_list = c
            break
    if init_list is None:
        return None

    fields = list(init_list.get_children())
    if len(fields) < 2:
        return None

    # Field 0: cvar name
    name = _concat_string_literals(_tokens_of(fields[0])) if len(fields) > 0 else None
    if not name:
        return None

    # Field 3: flags (CVAR_* token list)
    flags = _flags_from_tokens(_tokens_of(fields[3])) if len(fields) > 3 else []

    # Field 7: alias / ConsoleName2
    alias = _concat_string_literals(_tokens_of(fields[7])) if len(fields) > 7 else None

    # Field 8: callback -- resolve FUNCTION_DECL reference
    callback = None
    if len(fields) > 8:
        ref = fields[8].referenced
        if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
            callback = ref.spelling

    # Field 9: description
    description = _concat_string_literals(_tokens_of(fields[9])) if len(fields) > 9 else None

    # Field 10: default value
    default = _concat_string_literals(_tokens_of(fields[10])) if len(fields) > 10 else None

    return {
        "name": name,
        "c_ident": node.spelling,
        "default": default,
        "description": description,
        "alias": alias,
        "flags": flags,
        "callback": callback,
        "source_line": node.location.line,
        # source_file set after extraction (uses absolute path, caller makes relative)
        "source_file": node.location.file.name if node.location.file else None,
    }


# ---------------------------------------------------------------------------
# Cvar_Register call-site extraction
# ---------------------------------------------------------------------------

_RE_CVARGROUP_IDENT = re.compile(r"cvargroup_\w+")


def _extract_cvar_register(cursor) -> Optional[tuple[str, str]]:
    """Extract (c_ident, cvargroup_ident) from a Cvar_Register(& varname, group) call.

    Returns None if the call shape doesn't match.
    """
    args = [c for c in cursor.get_children()
            if c.kind not in (CursorKind.UNEXPOSED_EXPR,)]
    # First child of CALL_EXPR is the function reference; arguments follow.
    # We want argument 0 (the &var address-of) and argument 1 (the group ident).
    call_children = list(cursor.get_children())
    # call_children[0] is the callee; [1..] are the actual arguments
    if len(call_children) < 3:
        return None

    # Argument 0: &varname  -- walk tokens for a DECL_REF_EXPR under the arg
    arg0 = call_children[1]
    var_ident = None
    def _find_decl_ref(node):
        nonlocal var_ident
        if node.kind == CursorKind.DECL_REF_EXPR:
            var_ident = node.spelling
            return
        for c in node.get_children():
            _find_decl_ref(c)
    _find_decl_ref(arg0)

    if not var_ident:
        return None

    # Argument 1: the group identifier token
    arg1 = call_children[2]
    arg1_tokens = _tokens_of(arg1)
    group_ident = None
    for t in arg1_tokens:
        if t.startswith("cvargroup_"):
            group_ident = t
            break

    if not group_ident:
        return None

    return (var_ident, group_ident)


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------

class CvarsFteHandler(Visitor):
    name = "cvars"
    output_filename = "fte-variables-ast.json"

    def __init__(self) -> None:
        # Cross-file aggregator: c_ident -> row dict (first-wins for duplicates)
        self._all_rows: dict[str, dict] = {}

    # -- Visitor lifecycle ---------------------------------------------------

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        # Per-file state: reset for each new file
        self._rows: list[dict] = []
        self._seen_names: set[str] = set()      # cvar name dedup within file
        self._seen_c_idents: set[str] = set()   # c_ident dedup across variants
        # Cvar_Register links: c_ident -> cvargroup_ident (accumulated this file)
        self._reg_links: dict[str, str] = {}
        # Group definitions found in this file's source (by regex scan)
        self._group_defs: dict[str, str] = _parse_group_defs_from_source(source_bytes)

    def visit_cursor(self, cursor, variant: str) -> None:
        kind = cursor.kind

        # Branch 1: cvar_t VAR_DECL struct initializer
        if kind == CursorKind.VAR_DECL:
            tspell = cursor.type.spelling
            if re.fullmatch(r"(?:const\s+)?cvar_t", tspell):
                self._handle_var_decl(cursor)
            return

        # Branch 2: Cvar_Register call
        if kind == CursorKind.CALL_EXPR:
            if cursor.spelling == "Cvar_Register":
                result = _extract_cvar_register(cursor)
                if result:
                    c_ident, group_ident = result
                    self._reg_links[c_ident] = group_ident
            return

    def end_file(self) -> list[dict]:
        # Apply group attribution from Cvar_Register links before emitting
        for row in self._rows:
            c_ident = row.get("c_ident")
            if c_ident and c_ident in self._reg_links:
                group_ident = self._reg_links[c_ident]
                # Resolve group string from defs collected this file
                row["group"] = self._group_defs.get(group_ident, group_ident)

        rows = self._rows
        # Reset all per-file state
        self._rows = []
        self._seen_names = set()
        self._seen_c_idents = set()
        self._reg_links = {}
        self._group_defs = {}
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        """Collapse all per-file rows into final output JSON.

        all_rows is the flat list collected by the driver from all end_file()
        calls. Cross-file dedup is first-wins by cvar name. Later rows only
        fill in fields missing from the winner (description, callback).
        """
        deduped: dict[str, dict] = {}
        for row in all_rows:
            name = row["name"]
            if name not in deduped:
                deduped[name] = row
            else:
                # Fill missing fields from later occurrences
                existing = deduped[name]
                if not existing.get("description") and row.get("description"):
                    existing["description"] = row["description"]
                if not existing.get("callback") and row.get("callback"):
                    existing["callback"] = row["callback"]
                if not existing.get("group") and row.get("group"):
                    existing["group"] = row["group"]

        # Build output vars dict
        vars_out: dict[str, dict] = {}
        stats = {
            "count": 0,
            "with_description": 0,
            "with_default": 0,
            "with_callback": 0,
            "with_group": 0,
            "by_source_root": {},
        }

        repo_root_path = Path(repo_root).resolve()

        for row in deduped.values():
            # Make source_file repo-relative
            src_file = row.get("source_file")
            if src_file:
                try:
                    src_file = str(Path(src_file).resolve().relative_to(repo_root_path))
                except ValueError:
                    pass  # leave absolute if not under repo_root

            # Emit loader-compatible shape: source-location fields inside an
            # `ast` block (matches AstBlock in types.ts), description at top
            # level as `desc`, default at top level. Source-backed is signalled
            # by ast != null. FTE entries are always source-backed (no help-JSON
            # complement), so ast is always non-null when source_file is present.
            flags_list = row.get("flags") or []
            ast_block: dict = {
                "c_ident": row.get("c_ident") or "",
                "source_file": src_file,
                "source_line": row.get("source_line"),
                "source_column": None,
                "storage_class": None,
                # flags_raw: join CVAR_* flag tokens as space-separated string
                "flags_raw": " | ".join(flags_list) if flags_list else None,
                "flag_names": flags_list,
                "on_change": row.get("callback"),
                "group_name_in_source": row.get("group"),
                "min_bound": None,
                "max_bound": None,
                "trailing_comment": None,
            }

            entry: dict = {
                "default": row["default"],
                "desc": row.get("description") or None,
                # alias stored in desc for now; no dedicated slot in VariableEntry.
                # Keep alias as extra field so downstream tools can use it.
                "alias": row.get("alias"),
                "source_root": row.get("source_root"),
                "ast": ast_block,
            }

            vars_out[row["name"]] = entry

            # Stats accumulation
            stats["count"] += 1
            if entry.get("desc"):
                stats["with_description"] += 1
            if entry["default"] is not None:
                stats["with_default"] += 1
            if entry["ast"].get("on_change"):
                stats["with_callback"] += 1
            if entry["ast"].get("group_name_in_source"):
                stats["with_group"] += 1
            src_root = entry.get("source_root") or "unknown"
            stats["by_source_root"][src_root] = stats["by_source_root"].get(src_root, 0) + 1

        sorted_vars = {k: vars_out[k] for k in sorted(vars_out)}
        return {
            "vars": sorted_vars,
            "_stats": stats,
        }

    # -- Internal helpers ----------------------------------------------------

    def _handle_var_decl(self, cursor) -> None:
        """Process one cvar_t VAR_DECL cursor."""
        c_ident = cursor.spelling

        # Skip if we already saw this C identifier in a prior variant this file.
        # (All 4 variants parse the same struct declaration; only the first wins.)
        if c_ident in self._seen_c_idents:
            return
        self._seen_c_idents.add(c_ident)

        extracted = _extract_cvar_fields(cursor)
        if extracted is None:
            return

        cvar_name = extracted["name"]

        # Per-file name dedup (catches extern re-declarations)
        if cvar_name in self._seen_names:
            return
        self._seen_names.add(cvar_name)

        # Tag with source_root from the driver
        extracted["source_root"] = getattr(self, "current_source_root", None)

        self._rows.append(extracted)
