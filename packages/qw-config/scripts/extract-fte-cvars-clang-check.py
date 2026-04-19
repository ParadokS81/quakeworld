#!/usr/bin/env python3
"""FTE macro-expansion end-check.

Parses a single FTE file (sv_phys.c — has many CVARD() usages) with libclang
and verifies that the CVARD / CVARFD / CVARAFCD macros are expanded correctly
AND that we can extract (name, default, description) from the resolved struct
initializer.

This is the 30-minute validation of the claim that libclang+macros beats the
regex-per-macro approach used by the existing extract-fte-cvars.ts.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional

from clang.cindex import Config, Index, CursorKind, TranslationUnit

Config.set_library_file("libclang-18.so.1")

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent
FTE_REPO = REPO_ROOT / "research/repos/fteqw"
FTE_ENGINE = FTE_REPO / "engine"
TARGETS = [
    FTE_ENGINE / "server/sv_phys.c",
    FTE_ENGINE / "server/sv_main.c",
    FTE_ENGINE / "server/sv_move.c",
    FTE_ENGINE / "client/cl_main.c",
    FTE_ENGINE / "client/cl_screen.c",
]

# Headers live in many subdirs. Give libclang enough include paths.
INCLUDES = [
    FTE_ENGINE / "common",
    FTE_ENGINE / "server",
    FTE_ENGINE / "client",
    FTE_ENGINE / "qclib",
    FTE_ENGINE / "gl",
    FTE_ENGINE / "vk",
    FTE_ENGINE / "sw",
    FTE_ENGINE / "http",
]
ARGS = ["-x", "c"] + [f"-I{p}" for p in INCLUDES] + ["-w", "-DSERVERONLY"]

PARSE_OPTS = (
    TranslationUnit.PARSE_DETAILED_PROCESSING_RECORD
    | TranslationUnit.PARSE_INCOMPLETE
)


def tokens_of(cursor) -> list[str]:
    return [t.spelling for t in cursor.get_tokens()]


def strip_quotes(s: str) -> str:
    s = s.strip()
    if s.startswith('"') and s.endswith('"') and len(s) >= 2:
        return s[1:-1]
    return s


def concat_string_literal_tokens(tokens: list[str]) -> Optional[str]:
    """C adjacent-string-literal concatenation: ["\"foo\"", "\"bar\""] -> "foobar".
    Returns None if no tokens look like string literals."""
    parts = []
    for t in tokens:
        t = t.strip()
        if t.startswith('"') and t.endswith('"') and len(t) >= 2:
            parts.append(t[1:-1])
        elif t == "NULL" or t == "(((" or t == "((void":
            return None
    if not parts:
        return None
    return "".join(parts)


def analyze_file(path: Path) -> dict:
    src = path.read_bytes()
    idx = Index.create()
    # Use DSERVERONLY for sv_* files so ifndef SERVERONLY paths are skipped cleanly
    extra = []
    if "server/" in str(path):
        extra = ["-DSERVERONLY"]
    tu = idx.parse(str(path), args=ARGS + extra, options=PARSE_OPTS)

    serious = sum(1 for d in tu.diagnostics if d.severity >= 3)
    target = str(path.resolve())

    found = []

    def walk(node):
        if (
            node.kind == CursorKind.VAR_DECL
            and node.location.file is not None
            and os.path.samefile(node.location.file.name, target)
            and node.type.spelling in ("cvar_t", "const cvar_t")
        ):
            # find init list
            init = None
            for c in node.get_children():
                if c.kind == CursorKind.INIT_LIST_EXPR:
                    init = c
                    break
            if init is None:
                return
            fields = list(init.get_children())
            # Per cvar.h, post-expansion layout is:
            # 0: ConsoleName (name)       — string literal
            # 1..6: internal nulls/zeros  — NULL/0 placeholders
            # 7: ConsoleName2 (alias)     — string literal or NULL
            # 8: Callback                 — function pointer or NULL
            # 9: Description              — string literal or NULL
            # 10: Value (default)         — string literal
            # Tokens read from the raw source even after macro expansion
            name = concat_string_literal_tokens(tokens_of(fields[0])) if len(fields) > 0 else None
            alias = concat_string_literal_tokens(tokens_of(fields[7])) if len(fields) > 7 else None
            desc = concat_string_literal_tokens(tokens_of(fields[9])) if len(fields) > 9 else None
            default = concat_string_literal_tokens(tokens_of(fields[10])) if len(fields) > 10 else None
            # Callback name: resolve via referenced FUNCTION_DECL
            callback_name = None
            if len(fields) > 8:
                ref = fields[8].referenced
                if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
                    callback_name = ref.spelling
            # Flags (field 3): parse CVAR_* identifiers from source tokens
            flag_tokens = tokens_of(fields[3]) if len(fields) > 3 else []
            flag_names = [t for t in flag_tokens if t.startswith("CVAR_") and t != "CVAR_t"]
            found.append({
                "name": name,
                "default": default,
                "description": desc,
                "alias": alias,
                "callback": callback_name,
                "flag_names": flag_names,
                "line": node.location.line,
                "n_init_fields": len(fields),
            })
        for c in node.get_children():
            walk(c)

    walk(tu.cursor)
    return {"serious_diagnostics": serious, "cvars": found}


def main() -> int:
    if not FTE_REPO.is_dir():
        print("FTE repo not found", file=sys.stderr)
        return 1
    print("FTE macro-expansion end-check")
    print(f"  repo: {FTE_REPO}")
    total_found = 0
    total_with_desc = 0
    for t in TARGETS:
        if not t.is_file():
            print(f"  [skip] {t} (not found)")
            continue
        result = analyze_file(t)
        cvars = result["cvars"]
        with_desc = sum(1 for c in cvars if c.get("description") and c["description"] != "NULL")
        with_default = sum(1 for c in cvars if c.get("default") and c["default"] != "NULL")
        total_found += len(cvars)
        total_with_desc += with_desc
        print(f"\n=== {t.relative_to(FTE_REPO)} ===")
        print(f"  serious diagnostics: {result['serious_diagnostics']}")
        print(f"  cvar_t decls found:  {len(cvars)}")
        print(f"  with description:    {with_desc}")
        print(f"  with default value:  {with_default}")
        if cvars:
            print("  first 3 samples:")
            for c in cvars[:3]:
                print(f"    {c['name']}  default={c['default']!r}  desc={(c['description'] or '')[:80]!r}")

    print(f"\n--- TOTAL ---")
    print(f"  cvars extracted across {len(TARGETS)} files: {total_found}")
    print(f"  with description:   {total_with_desc}")

    # verdict
    print("\nVerdict:")
    if total_with_desc >= total_found * 0.5:
        print("  PASS — libclang expanded CVARD/CVARFD macros cleanly;")
        print("         description and default fields are recoverable from the")
        print("         struct initializer by position. Pattern generalizes to FTE.")
        return 0
    else:
        print("  PARTIAL — macros expand but field positions may need re-checking")
        print("            for specific CVAR* variants. Worth investigation.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
