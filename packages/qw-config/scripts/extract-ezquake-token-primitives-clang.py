#!/usr/bin/env python3
"""Extract ezQuake teamsay $-code token primitives.

The switch statement in teamplay.c TP_ParseMacroString (lines 1701-1735 at
head) maps `$X` forms to expanded byte values. Patterns we handle:

  1. Direct case: `case 'X': c = 0xHH; break;`
  2. Fall-through:  `case 'c': case 'd': c = 0x8d; break;`  (both map to 0x8d)
  3. Digit branch:  `if (isdigit(s[1])) c = s[1] - '0' + 0x12;`
     -> $0..$9 map to 0x12..0x1B

Regex-based; the switch is small (<50 lines) and stable. Libclang would be
overkill.

Output: <repo>/packages/qw-config/src/data/ezquake-token-primitives-ast.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# ----- paths -----------------------------------------------------------------

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = EZQ_REPO / "src"
TEAMPLAY_C = EZQ_SRC / "teamplay.c"
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-token-primitives-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-token-primitives-diagnostics.log"


# ----- editorial categorisation ----------------------------------------------

CATEGORY_BY_SUFFIX: dict[str, str] = {
    # separators
    "\\": "separator",
    ":": "separator",
    # brackets
    "[": "bracket",
    "]": "bracket",
    # LED colors
    "G": "led",
    "R": "led",
    "Y": "led",
    "B": "led",
    "W": "led",
    # powerup indicators
    "(": "powerup_indicator",
    "=": "powerup_indicator",
    ")": "powerup_indicator",
    "a": "powerup_indicator",
    # literal escapes
    "$": "literal_escape",
    "^": "literal_escape",
    # others (directional / arrows / glyphs)
    "<": "glyph",
    "-": "glyph",
    ">": "glyph",
    ",": "glyph",
    ".": "glyph",
    "b": "glyph",
    "c": "glyph",
    "d": "glyph",
}

DIGIT_CATEGORY = "digit_font"


# ----- parsers ---------------------------------------------------------------


# Matches a single-case line:  case 'X': c = 0xHH; break;
# Where X can be an ordinary char or an escape like \\, \n, \t.
_SINGLE_CASE_RE = re.compile(
    r"case\s+'((?:\\.|[^\\']))'\s*:\s*c\s*=\s*([^;]+)\s*;\s*break\s*;",
)

# Matches a "stacked" fall-through case:
#   case 'c':
#   case 'd': c = 0x8d; break;
_STACKED_CASE_RE = re.compile(
    r"case\s+'((?:\\.|[^\\']))'\s*:\s*case\s+'((?:\\.|[^\\']))'\s*:\s*c\s*=\s*([^;]+)\s*;\s*break\s*;",
    re.DOTALL,
)


def _interpret_char(c: str) -> str:
    """Convert a C char literal body (inside '...') to its single-char
    representation. Keeps escape semantics minimal: '\\\\' -> '\\'."""
    if c.startswith("\\"):
        esc = c[1]
        return {
            "n": "\n",
            "t": "\t",
            "r": "\r",
            "0": "\x00",
            "\\": "\\",
            "'": "'",
            '"': '"',
        }.get(esc, esc)
    return c


def _interpret_rhs(rhs: str) -> int | None:
    """Convert a switch-case RHS expression to its integer value.

    Handles: `0xHH`, decimal, single-char literal `'X'`, `'^'`, `'$'`."""
    rhs = rhs.strip()
    # Char literal
    if len(rhs) >= 3 and rhs[0] == "'" and rhs[-1] == "'":
        body = rhs[1:-1]
        if len(body) == 1:
            return ord(body)
        if len(body) == 2 and body[0] == "\\":
            return ord(_interpret_char(body))
        return None
    # Integer literal
    try:
        return int(rhs, 0)
    except ValueError:
        return None


def parse_switch(source: str) -> list[dict]:
    """Return a list of {form, suffix_char, byte_value, case_line, case_style}.

    Walks the full teamplay.c text looking for the specific $-code switch
    by anchoring on the surrounding `if (*s == '$' && s[1])` check."""
    # Scope: find the enclosing `if (*s == '$' && s[1])` branch body.
    anchor = re.search(r"if\s*\(\s*\*s\s*==\s*'\\?\$'\s*&&\s*s\[1\]\s*\)\s*\{", source)
    if anchor is None:
        raise RuntimeError("Could not locate the $-code switch anchor in teamplay.c")
    i = anchor.end()
    depth = 1
    while i < len(source) and depth > 0:
        ch = source[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        i += 1
    block = source[anchor.end():i - 1]
    anchor_line = source[:anchor.start()].count("\n") + 1

    entries: list[dict] = []

    # First pass: stacked cases (consume them before single-case matching).
    used_spans: list[tuple[int, int]] = []
    for m in _STACKED_CASE_RE.finditer(block):
        used_spans.append(m.span())
        rhs = m.group(3)
        byte_value = _interpret_rhs(rhs)
        if byte_value is None:
            continue
        case_line = anchor_line + block[:m.start()].count("\n")
        for group in (1, 2):
            suffix_body = m.group(group)
            suffix_char = _interpret_char(suffix_body)
            entries.append({
                "form": f"${suffix_char}",
                "suffix_char": suffix_char,
                "suffix_literal": suffix_body,  # the raw C char literal body
                "byte_value": byte_value,
                "case_line": case_line,
                "case_style": "stacked",
            })

    # Second pass: single cases not already inside a stacked match.
    def _is_inside_used(span: tuple[int, int]) -> bool:
        for s, e in used_spans:
            if span[0] >= s and span[1] <= e:
                return True
        return False

    for m in _SINGLE_CASE_RE.finditer(block):
        if _is_inside_used(m.span()):
            continue
        rhs = m.group(2)
        byte_value = _interpret_rhs(rhs)
        if byte_value is None:
            continue
        suffix_body = m.group(1)
        suffix_char = _interpret_char(suffix_body)
        case_line = anchor_line + block[:m.start()].count("\n")
        entries.append({
            "form": f"${suffix_char}",
            "suffix_char": suffix_char,
            "suffix_literal": suffix_body,
            "byte_value": byte_value,
            "case_line": case_line,
            "case_style": "single",
        })

    return entries


def synthesize_digit_entries(anchor_line: int) -> list[dict]:
    """$0..$9 via the isdigit branch at teamplay.c:1728-1729."""
    out: list[dict] = []
    for d in range(10):
        out.append({
            "form": f"${d}",
            "suffix_char": str(d),
            "suffix_literal": str(d),
            "byte_value": d + 0x12,
            "case_line": anchor_line,
            "case_style": "digit_branch",
        })
    return out


# ----- main ------------------------------------------------------------------


def main() -> int:
    print("ezQuake $-code token primitive extraction")
    print(f"  repo: {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    if not TEAMPLAY_C.is_file():
        print(f"ERROR: teamplay.c not found at {TEAMPLAY_C}", file=sys.stderr)
        return 1

    src = TEAMPLAY_C.read_text(encoding="utf-8")

    switch_entries = parse_switch(src)

    # Locate the isdigit branch line for accurate source attribution.
    # The real source has nested parens (`isdigit((int)(unsigned char)s[1])`),
    # so anchor on the characteristic `0x12` addition instead.
    digit_m = re.search(
        r"isdigit[\s\S]{0,80}?s\[1\][\s\S]{0,40}?0x12",
        src,
    )
    digit_line = 1
    if digit_m is not None:
        digit_line = src[:digit_m.start()].count("\n") + 1
    digit_entries = synthesize_digit_entries(digit_line)

    all_entries = switch_entries + digit_entries

    # Build output keyed by form
    primitives_out: dict[str, dict] = {}
    for e in all_entries:
        form = e["form"]
        suffix = e["suffix_char"]
        category = DIGIT_CATEGORY if e["case_style"] == "digit_branch" else CATEGORY_BY_SUFFIX.get(suffix, "other")
        entry = {
            "ast": {
                "suffix_char": suffix,
                "suffix_literal": e["suffix_literal"],
                "byte_value": e["byte_value"],
                "category": category,
                "case_style": e["case_style"],
                "source_file": TEAMPLAY_C.name,
                "source_line": e["case_line"],
            },
        }
        # First-wins (stacked entries emit both c and d; if any later collision
        # happens, we keep the first one).
        if form not in primitives_out:
            primitives_out[form] = entry

    sorted_out = {k: primitives_out[k] for k in sorted(primitives_out)}

    stats = {
        "total": len(sorted_out),
        "switch_entries": len(switch_entries),
        "digit_entries": len(digit_entries),
        "by_category": {},
    }
    for entry in sorted_out.values():
        cat = entry["ast"]["category"]
        stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1

    output = {"token_primitives": sorted_out, "_stats": stats}

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    print(f"  switch entries: {stats['switch_entries']}")
    print(f"  digit entries:  {stats['digit_entries']}")
    print(f"  total:          {stats['total']}")
    print(f"  by category:    {stats['by_category']}")
    print(f"\n  written: {OUTPUT_JSON}")

    DIAGNOSTICS_LOG.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS_LOG.write_text("(no diagnostics)\n", encoding="utf-8")

    return 0


if __name__ == "__main__":
    sys.exit(main())
