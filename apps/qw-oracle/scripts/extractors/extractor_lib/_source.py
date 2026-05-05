"""Shared source-text helpers for libclang-based extractors.

`read_extent` returns the raw source text between an extent's start and end
offsets, falling back to "" on missing/invalid offsets.

`strip_quotes` peels exactly one matched pair of double-quotes from a
trimmed string. Use as the first step before C-escape interpretation.

`literal_string` parses a string-literal cursor's extent into the underlying
C-string value. Handles adjacent-literal concatenation (`"a" "b"` -> `"ab"`)
and the wide-string `L"..."` prefix (the L is admitted but discarded —
downstream loaders treat the string as UTF-8).

`strip_array_and_qualifiers` reduces a libclang type spelling like
`log_t[7]` or `const log_t[]` to its base type name (`log_t`).
"""
from __future__ import annotations

from typing import Optional


def read_extent(source_bytes: bytes, extent) -> str:
    """Return the source text for an AST extent. Defensive: returns "" on
    missing extent fields, invalid offsets, or decode errors."""
    if extent is None or extent.start is None or extent.end is None:
        return ""
    start = extent.start.offset
    end = extent.end.offset
    if start is None or end is None or start < 0 or end < start:
        return ""
    try:
        return source_bytes[start:end].decode("utf-8", errors="replace")
    except Exception:
        return ""


def strip_quotes(s: str) -> str:
    """Strip exactly one matched pair of `"`-double-quotes from a trimmed
    string. Returns the input unchanged when there's no quote pair."""
    s = s.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1]
    return s


def literal_string(arg_cursor, source_bytes: bytes) -> Optional[str]:
    """Extract the C string value from a string-literal cursor.

    Handles adjacent string-literal concatenation (`"a" "b"` -> `"ab"`)
    and the wide-string `L"..."` prefix (admitted, L discarded).
    Returns None for non-literal / non-string arguments.
    """
    text = read_extent(source_bytes, arg_cursor.extent).strip()
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


def strip_array_and_qualifiers(tspell: str) -> str:
    """Reduce a type spelling like `log_t[7]` or `const log_t[]` to `log_t`."""
    s = tspell.split("[", 1)[0].strip()
    for q in ("const ", "static "):
        if s.startswith(q):
            s = s[len(q):].strip()
    return s


# ---------------------------------------------------------------------------
# String-literal concatenation (post-v17 contract)
# ---------------------------------------------------------------------------

def _strip_and_concat(tokens: list[str]) -> tuple[Optional[list[str]], bool]:
    """Strip outer quotes from string-literal tokens; collect inner bodies.

    Returns (parts, all_literal):
      parts       -- list of inner string bodies (post-quote-strip,
                     pre-escape-interpretation), or None if a non-string-literal
                     terminator (NULL, (((, ((void) was hit OR no parts collected.
      all_literal -- True if every input token was a string literal; False if
                     any non-literal-and-non-terminator token surfaced.

    Caller decides whether to abort emission, fall back, or skip based on the
    boolean. Internal building block for concat_string_literals and
    concat_string_literals_compact.
    """
    parts: list[str] = []
    all_literal = True
    for t in tokens:
        t = t.strip()
        if t.startswith('"') and t.endswith('"') and len(t) >= 2:
            parts.append(t[1:-1])
        elif t in ("NULL", "(((", "((void"):
            return None, False
        else:
            all_literal = False
    if not parts:
        return None, all_literal
    return parts, all_literal


def concat_string_literals(tokens: list[str]) -> Optional[str]:
    """Canonical source-truth concatenation. Applies unescape_c_string.

    Composes _strip_and_concat with unescape_c_string. Use for cvar names,
    descriptions, default values, command names, macro names -- any field
    whose contract is "preserve source-truth meaning of escapes" (post-v17).

    Returns None for NULL terminator or no-string-literals input.
    """
    from extractor_lib._cvar_shared import unescape_c_string
    parts, _all_literal = _strip_and_concat(tokens)
    if parts is None:
        return None
    return unescape_c_string("".join(parts))


def concat_string_literals_compact(tokens: list[str]) -> Optional[str]:
    """Description-compaction concatenation.

    Replaces \\n / \\t with space, \\" with ". Use for description-domain fields
    where newlines should collapse for single-line display (HUD_Register
    descriptions, ezscript description args).

    Does NOT call unescape_c_string -- the compact policy is intentionally
    different from canonical (e.g. \\\\ passes through verbatim).

    Returns None for NULL terminator or no-string-literals input.
    """
    parts, _all_literal = _strip_and_concat(tokens)
    if parts is None:
        return None
    body = "".join(parts)
    body = body.replace("\\n", " ").replace("\\t", " ").replace('\\"', '"')
    return body


# ---------------------------------------------------------------------------
# Pattern 6 -- depth-1 #include closure macro collector (D4)
# ---------------------------------------------------------------------------

def collect_file_macros(tu, target_file_path: str) -> dict[str, str]:
    """Walk the depth-1 #include closure of target_file_path and collect
    string-literal #define macros.

    Returns dict[macro_name, string_body] where string_body has outer quotes
    stripped. Excludes function-like macros, integer/hex constants, and any
    macro whose body is not exactly one string-literal token.

    Scope is depth-1 only: macros in the target file itself plus macros in
    files that the target file directly #includes. Transitive includes are
    excluded (D4 -- depth-N revisit parked for a future arc).

    Requires that tu was parsed with PARSE_DETAILED_PROCESSING_RECORD (already
    the default in extractor_lib.clang_config.PARSE_OPTS). Returns {} with a
    stderr warning if no MACRO_DEFINITION cursors are found (flag absent or
    empty TU).
    """
    import sys
    from clang.cindex import CursorKind, TokenKind

    # Build depth-1 file allowlist.
    # Step 1: include the target file itself.
    depth1_files = {target_file_path}

    # Step 2: walk top-level cursors for INCLUSION_DIRECTIVE cursors whose
    # location is in the target file. Each one's included file is depth-1.
    for cursor in tu.cursor.get_children():
        if cursor.kind != CursorKind.INCLUSION_DIRECTIVE:
            continue
        loc = cursor.location
        if loc.file is None or loc.file.name != target_file_path:
            continue
        included = cursor.get_included_file()
        if included is not None:
            depth1_files.add(included.name)

    # Step 3: walk MACRO_DEFINITION cursors. Filter to depth-1 files.
    result: dict[str, str] = {}
    found_any_macro_def = False

    for cursor in tu.cursor.get_children():
        if cursor.kind != CursorKind.MACRO_DEFINITION:
            continue
        found_any_macro_def = True
        loc = cursor.location
        if loc.file is None or loc.file.name not in depth1_files:
            continue
        # Collect tokens: first is the macro name; rest are the body.
        tokens = list(cursor.get_tokens())
        if len(tokens) != 2:
            # Body must be exactly one token (name + 1 body token).
            # len(tokens) == 1 means empty macro body; > 2 means multi-token
            # (function-like params, complex expression, etc.).
            continue
        body_tok = tokens[1]
        if body_tok.kind != TokenKind.LITERAL:
            continue
        spelling = body_tok.spelling
        if not spelling.startswith('"'):
            continue
        # Strip outer quotes.
        if len(spelling) >= 2 and spelling[-1] == '"':
            body = spelling[1:-1]
        else:
            continue
        name = tokens[0].spelling
        if name not in result:
            result[name] = body

    if not found_any_macro_def:
        print(
            f"collect_file_macros: no MACRO_DEFINITION cursors found for "
            f"{target_file_path!r}. Ensure tu was parsed with "
            f"PARSE_DETAILED_PROCESSING_RECORD.",
            file=sys.stderr,
        )

    return result
