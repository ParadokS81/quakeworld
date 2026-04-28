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
