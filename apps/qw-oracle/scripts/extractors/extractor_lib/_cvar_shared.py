"""Shared cvar normalisation helpers for libclang-based extractors.

`unescape_c_string` interprets standard C escape sequences in a cvar default
extent so the loaded value matches what the engine sees at runtime.

`normalize_flags_raw` canonicalises the cvar_t flags-field source form: the
literal `0`, `CVAR_NONE`, missing field, and empty string all collapse to
the empty string. All other forms pass through stripped. Single-sentinel
contract chosen at Phase D Task 9 so consumer queries can use
`WHERE flags_raw = ''` instead of mixing NULL + literal forms.

`parse_flag_names` extracts CVAR_* macro tokens from a flags expression in
source order, deduped first-wins.

`FLAG_NAME_RE` is the underlying regex; exported for handlers that need to
scan a non-flags-field surface (e.g. `Cvar_SetFlags(name, A | B)` calls).
"""
from __future__ import annotations

import re
from typing import Optional


FLAG_NAME_RE = re.compile(r"\bCVAR_[A-Z0-9_]+\b")


def unescape_c_string(s: str) -> str:
    """Interpret standard C escape sequences in `s`.

    Recognised: ``\\\\``, ``\\"``, ``\\n``, ``\\t``, ``\\r``, ``\\0``.
    Unknown ``\\x`` sequences pass through verbatim (the backslash plus
    the next character) so we never lose data on an unfamiliar sequence.
    A trailing ``\\`` at end-of-string also passes through verbatim.

    Composes with `strip_quotes`: callers strip outer quotes first, then
    unescape the body. Apply only to default_value extents; cvar names
    and flags don't typically carry escapes.
    """
    if not s or "\\" not in s:
        return s
    out: list[str] = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c != "\\" or i + 1 >= n:
            out.append(c)
            i += 1
            continue
        nxt = s[i + 1]
        if nxt == "\\":
            out.append("\\")
        elif nxt == '"':
            out.append('"')
        elif nxt == "n":
            out.append("\n")
        elif nxt == "t":
            out.append("\t")
        elif nxt == "r":
            out.append("\r")
        elif nxt == "0":
            out.append("\0")
        else:
            out.append("\\")
            out.append(nxt)
        i += 2
    return "".join(out)


def normalize_flags_raw(raw: Optional[str]) -> str:
    """Canonicalise a cvar_t flags-field source extent.

    Returns `""` for any source form that means "no flags": missing field,
    empty extent, the literal `0`, or `CVAR_NONE`. All other forms pass
    through stripped.
    """
    if raw is None:
        return ""
    s = raw.strip()
    if not s or s == "0" or s == "CVAR_NONE":
        return ""
    return s


def parse_flag_names(raw: Optional[str]) -> list[str]:
    """Extract CVAR_* macro tokens from a flags expression.

    Source-order, deduped first-wins. Returns `[]` for None/empty input.
    """
    if not raw:
        return []
    return list(dict.fromkeys(FLAG_NAME_RE.findall(raw)))
