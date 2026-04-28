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
from extractor_lib._cvar_shared import normalize_flags_raw  # noqa: E402
from extractor_lib._source import concat_string_literals  # noqa: E402


# ---------------------------------------------------------------------------
# Token / string helpers
# ---------------------------------------------------------------------------

def _tokens_of(cursor) -> list[str]:
    """Return the raw spelling of every token in a cursor's extent."""
    return [t.spelling for t in cursor.get_tokens()]


def _flags_tokens_of_var_decl(node) -> list[str]:
    """Return CVAR_* token spellings from the VAR_DECL cursor's own source extent.

    fields[3].get_tokens() is unreliable when field 3 has a zero-length extent
    (the macro has been expanded away). In that case libclang walks the TU
    context rather than the field and picks up CVAR_t enum-definition tokens,
    inflating flag_names with every CVAR_* value in the header.

    Collecting tokens from the VAR_DECL itself (which always has a correct
    extent) and filtering to those whose start offset falls within that extent
    restricts collection to the actual CVAR_ARCHIVE | CVAR_VIDEOLATCH expression
    inside the macro argument list, regardless of whether it is single-line or
    multi-line.
    """
    ext = node.extent
    return [
        t.spelling
        for t in node.get_tokens()
        if t.spelling.startswith("CVAR_")
        and t.spelling != "CVAR_t"
        and ext.start.offset <= t.extent.start.offset < ext.end.offset
    ]


def _flags_tokens_of_init_list(init_list_node, var_decl_tokens: list) -> list[str]:
    """Return CVAR_* flag tokens for a nested cvar_t INIT_LIST_EXPR element.

    For nested cvars (inside cvar_t[] arrays or container struct arrays), the
    inner INIT_LIST_EXPR nodes have empty token extents after macro expansion.
    We pass in the pre-collected VAR_DECL token tuples and filter by the element's
    extent so each element only sees its own CVAR_* flags.

    var_decl_tokens is a list of (spelling, start_offset, end_offset) tuples
    pre-collected from the parent VAR_DECL.
    """
    ext = init_list_node.extent
    return [
        spelling
        for spelling, start, _end in var_decl_tokens
        if spelling.startswith("CVAR_")
        and spelling != "CVAR_t"
        and ext.start.offset <= start < ext.end.offset
    ]


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
    name = concat_string_literals(_tokens_of(fields[0])) if len(fields) > 0 else None
    if not name:
        return None

    # Field 3: flags -- collected from the VAR_DECL extent rather than
    # fields[3].get_tokens() because field 3 often has a zero-length extent
    # after macro expansion, causing the fallback token walk to pick up
    # CVAR_t enum-definition tokens from the header (the inflated-tokens bug).
    flags = _flags_tokens_of_var_decl(node)

    # Field 7: alias / ConsoleName2
    alias = concat_string_literals(_tokens_of(fields[7])) if len(fields) > 7 else None

    # Field 8: callback -- resolve FUNCTION_DECL reference
    callback = None
    if len(fields) > 8:
        ref = fields[8].referenced
        if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
            callback = ref.spelling

    # Field 9: description
    description = concat_string_literals(_tokens_of(fields[9])) if len(fields) > 9 else None

    # Field 10: default value
    default = concat_string_literals(_tokens_of(fields[10])) if len(fields) > 10 else None

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


def _extract_cvar_from_init_list(init_list, var_decl_tokens: list) -> Optional[dict]:
    """Extract a cvar row from a nested cvar_t INIT_LIST_EXPR.

    init_list must have type 'cvar_t'. var_decl_tokens is a list of
    (spelling, start_offset, end_offset) tuples from the parent VAR_DECL
    used for flag extraction (see _flags_tokens_of_init_list).

    Returns a raw-field dict or None if the init_list doesn't look like a
    valid cvar_t init (name field must resolve to a string literal).
    """
    fields = list(init_list.get_children())
    if len(fields) < 11:
        return None

    # Field 0: cvar name -- must be a string literal
    name = concat_string_literals(_tokens_of(fields[0]))
    if not name:
        return None

    # Field 3: flags -- windowed from parent VAR_DECL tokens
    flags = _flags_tokens_of_init_list(init_list, var_decl_tokens)

    # Field 7: alias / ConsoleName2
    alias = concat_string_literals(_tokens_of(fields[7]))

    # Field 8: callback -- resolve FUNCTION_DECL reference
    callback = None
    ref = fields[8].referenced
    if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
        callback = ref.spelling

    # Field 9: description
    description = concat_string_literals(_tokens_of(fields[9]))

    # Field 10: default value -- must be a string literal for a valid cvar
    default = concat_string_literals(_tokens_of(fields[10]))

    loc = init_list.location
    return {
        "name": name,
        "c_ident": "",   # no single C identifier for an array element
        "default": default,
        "description": description,
        "alias": alias,
        "flags": flags,
        "callback": callback,
        "source_line": loc.line,
        "source_file": loc.file.name if loc.file else None,
        "synthesized_from": "nested_struct",
    }


def _collect_nested_cvars(var_decl) -> list[dict]:
    """Walk a VAR_DECL of array type and collect all nested cvar_t init-list rows.

    Handles three shapes:
    - cvar_t[N]: outer INIT_LIST_EXPR -> inner INIT_LIST_EXPRs of type cvar_t
    - container_struct[N]: outer -> container INIT_LIST_EXPRs -> inner cvar_t ones
    - any deeper nesting (recursively found INIT_LIST_EXPR with type cvar_t)

    The detection signal is: INIT_LIST_EXPR whose type is exactly 'cvar_t'.
    This is reliable across all macro families because libclang resolves types
    post-macro-expansion.

    Returns list of raw-field dicts (may be empty if no nested cvars found).
    """
    # Pre-collect all VAR_DECL tokens as (spelling, start, end) for windowed
    # flag extraction across elements.
    var_decl_tokens = [
        (t.spelling, t.extent.start.offset, t.extent.end.offset)
        for t in var_decl.get_tokens()
    ]

    rows: list[dict] = []

    def _walk(cursor) -> None:
        if cursor.kind == CursorKind.INIT_LIST_EXPR and cursor.type.spelling == "cvar_t":
            row = _extract_cvar_from_init_list(cursor, var_decl_tokens)
            if row is not None:
                rows.append(row)
            # Don't descend further -- this node IS the cvar_t init
            return
        for c in cursor.get_children():
            _walk(c)

    for c in var_decl.get_children():
        _walk(c)

    return rows


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

        # Branch 1a: plain cvar_t VAR_DECL struct initializer (top-level scalar)
        if kind == CursorKind.VAR_DECL:
            tspell = cursor.type.spelling
            if re.fullmatch(r"(?:const\s+)?cvar_t", tspell):
                self._handle_var_decl(cursor)
                return

            # Branch 1b: array or container VAR_DECL that may contain nested
            # cvar_t init-list elements. Trigger on any array-shaped type
            # (contains '[') so we catch cvar_t[N] and container_struct[N] alike.
            if "[" in tspell:
                self._handle_nested_array_var_decl(cursor)
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

        # Static estimates from Pass 1 runtime-validation diff (2026-04-26).
        # Not computed dynamically -- derived from operator-driven runtime runs.
        # Update after each new runtime-validation pass.
        out_of_scope_estimate = {
            "bucket1_plugin_unvisited": 26,
            "bucket2_dynamic_registration": 27,
            "bucket3_runtime_synthesized": 56,
            "bucket4_sdk_blocked": 0,
            "last_validated_against_runtime": "2026-04-26",
        }
        # Build output vars dict
        vars_out: dict[str, dict] = {}
        stats = {
            "count": 0,
            "with_description": 0,
            "with_default": 0,
            "with_callback": 0,
            "with_group": 0,
            "by_source_root": {},
            "_out_of_scope_estimate": out_of_scope_estimate,
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
                "flags_raw": normalize_flags_raw(" | ".join(flags_list) if flags_list else None),
                "flag_names": flags_list,
                "on_change": row.get("callback"),
                "group_name_in_source": row.get("group"),
                "min_bound": None,
                "max_bound": None,
                "trailing_comment": None,
                # synthesized_from: present only for nested-struct extractions;
                # null for top-level VAR_DECL cvars.
                "synthesized_from": row.get("synthesized_from") or None,
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

    def _handle_nested_array_var_decl(self, cursor) -> None:
        """Process a VAR_DECL of array type looking for nested cvar_t elements.

        Called for any VAR_DECL whose type contains '[' (array). Walks all
        descendant INIT_LIST_EXPR nodes whose type is exactly 'cvar_t'. Each
        matching node is one cvar row. Dedup via _seen_names (per-file name set).
        """
        nested = _collect_nested_cvars(cursor)
        if not nested:
            return

        src_root = getattr(self, "current_source_root", None)
        for row in nested:
            cvar_name = row.get("name")
            if not cvar_name:
                continue
            if cvar_name in self._seen_names:
                continue
            self._seen_names.add(cvar_name)
            row["source_root"] = src_root
            self._rows.append(row)

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
