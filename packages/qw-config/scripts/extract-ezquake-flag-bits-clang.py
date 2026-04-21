#!/usr/bin/env python3
"""Extract ezQuake bitmask-family flag_bits.

Scans a configured list of ezQuake headers for `#define FAMILY_NAME value`
lines. Regex-based: header defines are simple and stable. No libclang
dependency.

Families at head:
  - CVAR_*  in cvar.h  (cvar_t flag bits)
  - FPD_*   in teamplay.h  (teamplay full-pitch-disable flags)
  - STAT_*  in common.h  (player stat indices)

Extensible via FAMILY_TARGETS -- add (family, header, prefix) triples for
new families. Missing headers (e.g. in older tags) are skipped with a
diagnostic note rather than raising.

Output: <repo>/packages/qw-config/src/data/ezquake-flag-bits-ast.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = (EZQ_REPO / "src") if (EZQ_REPO / "src").is_dir() and any((EZQ_REPO / "src").glob("*.c")) else EZQ_REPO
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-flag-bits-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-flag-bits-diagnostics.log"

# (family, header_filename, name_prefix) triples. Header paths are resolved
# against EZQ_SRC. Adding new families = append a triple.
FAMILY_TARGETS: list[tuple[str, str, str]] = [
    ("cvar_flag",  "cvar.h",     "CVAR_"),
    ("fpd_flag",   "teamplay.h", "FPD_"),
    ("stat_const", "common.h",   "STAT_"),
]

# Matches `#define NAME value  [// trailing]` where value is a single
# whitespace-trimmed expression up to end-of-line-ish. Captures:
#   1: NAME
#   2: value (may include parens, bitshifts, hex, decimal)
_DEFINE_RE = re.compile(
    r"^\s*#define\s+([A-Z][A-Z0-9_]*)\s+([^\n/]+?)(?:\s*//.*)?$",
    re.MULTILINE,
)


def _resolve_numeric(value_raw: str) -> int | None:
    """Resolve a subset of #define RHS expressions to integer.

    Handles: plain decimal, 0x-hex, `(1<<N)`, `1<<N`, parenthesised plain.
    Returns None for anything else (e.g. macro references, arithmetic).
    """
    s = value_raw.strip()
    # Strip one layer of outer parens.
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1].strip()
    # Bit-shift: `1<<N` or `1 << N`.
    m = re.fullmatch(r"(\d+)\s*<<\s*(\d+)", s)
    if m:
        base = int(m.group(1))
        shift = int(m.group(2))
        return base << shift
    # Plain int / hex.
    try:
        return int(s, 0)
    except ValueError:
        return None


def extract_family(family: str, header_path: Path, prefix: str, diagnostics: list[str]) -> dict:
    if not header_path.is_file():
        diagnostics.append(f"[skip] {family}: {header_path} missing")
        return {}

    src = header_path.read_text(encoding="utf-8", errors="replace")
    found: dict[str, dict] = {}
    for m in _DEFINE_RE.finditer(src):
        name = m.group(1)
        if not name.startswith(prefix):
            continue
        value_raw = m.group(2).strip()
        value_numeric = _resolve_numeric(value_raw)
        source_line = src[:m.start()].count("\n") + 1
        found[name] = {
            "ast": {
                "bitmask_family": family,
                "value_raw": value_raw,
                "value_numeric": value_numeric,
                "source_file": header_path.name,
                "source_line": source_line,
            },
        }
    diagnostics.append(f"[ok] {family}: {len(found)} from {header_path.name}")
    return found


def main() -> int:
    print("ezQuake flag_bit extraction")
    print(f"  repo: {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    diagnostics: list[str] = []
    combined: dict[str, dict] = {}
    by_family: dict[str, int] = {}

    for family, header_name, prefix in FAMILY_TARGETS:
        header_path = EZQ_SRC / header_name
        found = extract_family(family, header_path, prefix, diagnostics)
        for name, entry in found.items():
            # First-wins on collisions. Shouldn't happen across CVAR/FPD/STAT.
            if name not in combined:
                combined[name] = entry
        by_family[family] = len(found)

    sorted_out = {k: combined[k] for k in sorted(combined)}
    stats = {
        "total": len(sorted_out),
        "by_family": by_family,
    }
    output = {"flag_bits": sorted_out, "_stats": stats}

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    print(f"  total:      {stats['total']}")
    print(f"  by family:  {stats['by_family']}")
    print(f"\n  written: {OUTPUT_JSON}")

    DIAGNOSTICS_LOG.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS_LOG.write_text("\n".join(diagnostics) + "\n", encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
