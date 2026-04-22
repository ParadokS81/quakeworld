#!/usr/bin/env python3
"""libclang-based extraction of the ezQuake keyname table.

Parses the `keyname_t keynames[] = { {"NAME", K_CODE}, ... };` array in
keys.c. Each element becomes one entry:

  - public key name (first field, string literal)
  - key_code_ident (second field, enum constant DeclRefExpr spelling)
  - key_code numeric value (resolved via the enum constant's enum_value)
  - source file, line, column

Duplicate names are expected (e.g. SCROLLLOCK / SCROLLOCK / SCRLCK all map to
K_SCRLCK) and each is emitted as a distinct entry. Apple-specific keys gated
behind `#ifdef __APPLE__` are captured via a second TU pass with -D__APPLE__
defined.

Output: <repo>/packages/qw-config/src/data/ezquake-keynames-ast.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from clang.cindex import Config, CursorKind, Index, TranslationUnit

# ----- paths -----------------------------------------------------------------

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent.parent

_cli = argparse.ArgumentParser(add_help=True)
_cli.add_argument("--repo-root", default=None)
_cli.add_argument("--output", default=None)
_args, _ = _cli.parse_known_args()

EZQ_REPO = Path(_args.repo_root).resolve() if _args.repo_root else (REPO_ROOT / "research/repos/ezquake-source")
EZQ_SRC = (EZQ_REPO / "src") if (EZQ_REPO / "src").is_dir() and any((EZQ_REPO / "src").glob("*.c")) else EZQ_REPO
KEYS_C = EZQ_SRC / "keys.c"
OUTPUT_JSON = Path(_args.output).resolve() if _args.output else (REPO_ROOT / "packages/qw-config/src/data/ezquake-keynames-ast.json")
DIAGNOSTICS_LOG = HERE.parent / "docs/ast-keynames-diagnostics.log"

Config.set_library_file("libclang-18.so.1")


# ----- dataclasses -----------------------------------------------------------


@dataclass
class ExtractedKeyname:
    name: str                   # "F1", "MOUSE1", etc.
    key_code_ident: str         # "K_F1"
    key_code: Optional[int]     # numeric enum value (May be None if resolution fails)
    source_file: str
    source_line: int
    source_column: int
    build_variant: str          # "default" | "apple"


# ----- libclang config -------------------------------------------------------


CLANG_ARGS = [
    "-x", "c",
    f"-I{EZQ_SRC}",
    "-w",
    # Match the other extractors' build-variant sweep so we see all keynames
    # that any real build would include.
    "-DWITH_IRC",
    "-DRENDERER_OPTION_CLASSIC_OPENGL",
    "-DRENDERER_OPTION_MODERN_OPENGL",
]
CLANG_ARGS_APPLE = CLANG_ARGS + ["-D__APPLE__"]

PARSE_OPTS = (
    TranslationUnit.PARSE_DETAILED_PROCESSING_RECORD
    | TranslationUnit.PARSE_INCOMPLETE
)


# ----- helpers ---------------------------------------------------------------


def _read_extent(source_bytes: bytes, extent) -> str:
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


def _resolve_enum(cursor):
    """Walk a child subtree to find the first ENUM_CONSTANT_DECL reference.
    Returns (spelling, enum_value) or (None, None)."""
    stack = [cursor]
    while stack:
        n = stack.pop()
        if n.kind == CursorKind.DECL_REF_EXPR:
            ref = n.referenced
            if ref is not None and ref.kind == CursorKind.ENUM_CONSTANT_DECL:
                try:
                    return ref.spelling, ref.enum_value
                except Exception:
                    return ref.spelling, None
        stack.extend(list(n.get_children()))
    return None, None


def _resolve_literal_value(text: str) -> Optional[int]:
    """Parse the raw source text of the second field as a C int/char literal.
    Handles: `';'` (char literal), `59` (decimal int), `0x3B` (hex int).
    Returns None if the text doesn't parse as an integer."""
    text = text.strip()
    if not text:
        return None
    # Character literal: 'X' or '\n' etc.
    if len(text) >= 3 and text[0] == "'" and text[-1] == "'":
        body = text[1:-1]
        if len(body) == 1:
            return ord(body)
        if len(body) == 2 and body[0] == "\\":
            esc_map = {"n": 10, "t": 9, "r": 13, "0": 0, "\\": 92, "'": 39, '"': 34}
            return esc_map.get(body[1])
        return None
    # Integer literal
    try:
        return int(text, 0)  # auto-detects 0x / 0 prefixes
    except ValueError:
        return None


# ----- extraction -----------------------------------------------------------


def extract_keynames_from_tu(tu, source_bytes: bytes, target_path: str,
                             label: str, diagnostics: list[str]) -> list[ExtractedKeyname]:
    out: list[ExtractedKeyname] = []

    def visit(node):
        if (
            node.kind == CursorKind.VAR_DECL
            and node.location.file is not None
            and os.path.samefile(node.location.file.name, target_path)
            and node.spelling == "keynames"
        ):
            init_list = None
            for c in node.get_children():
                if c.kind == CursorKind.INIT_LIST_EXPR:
                    init_list = c
                    break
            if init_list is None:
                diagnostics.append(f"keynames[]: no INIT_LIST_EXPR found")
                return
            for elem in init_list.get_children():
                inner = elem
                if elem.kind != CursorKind.INIT_LIST_EXPR:
                    for ch in elem.get_children():
                        if ch.kind == CursorKind.INIT_LIST_EXPR:
                            inner = ch
                            break
                if inner.kind != CursorKind.INIT_LIST_EXPR:
                    continue
                fields = list(inner.get_children())
                if len(fields) < 2:
                    continue
                name_raw = _read_extent(source_bytes, fields[0].extent).strip()
                # The final `{NULL, 0}` sentinel has a bare NULL identifier,
                # not a string literal. Skip it.
                if not (name_raw.startswith('"') and name_raw.endswith('"')):
                    continue
                name = _strip_quotes(name_raw)
                if not name:
                    continue

                # Second field: prefer enum constant reference (e.g. K_F1).
                # Fall back to parsing integer / character literals for cases
                # like {"SEMICOLON", ';'}.
                ident, numeric = _resolve_enum(fields[1])
                raw_second = _read_extent(source_bytes, fields[1].extent).strip()
                if ident is None and numeric is None:
                    numeric = _resolve_literal_value(raw_second)
                key_code_ident = ident if ident is not None else raw_second

                out.append(ExtractedKeyname(
                    name=name,
                    key_code_ident=key_code_ident,
                    key_code=numeric,
                    source_file=Path(inner.location.file.name).name if inner.location.file else KEYS_C.name,
                    source_line=inner.location.line,
                    source_column=inner.location.column,
                    build_variant=label,
                ))
            return
        for c in node.get_children():
            visit(c)

    visit(tu.cursor)
    return out


# ----- main ------------------------------------------------------------------


def main() -> int:
    print("ezQuake keyname AST extraction")
    print(f"  repo: {EZQ_REPO}")
    print(f"  output: {OUTPUT_JSON}")
    print()

    if not KEYS_C.is_file():
        print(f"ERROR: keys.c not found at {KEYS_C}", file=sys.stderr)
        return 1

    diagnostics: list[str] = []
    source_bytes = KEYS_C.read_bytes()
    target_path = str(KEYS_C.resolve())

    idx = Index.create()

    print("Phase 1: parsing keys.c (default build)")
    tu_default = idx.parse(str(KEYS_C), args=CLANG_ARGS, options=PARSE_OPTS)
    for d in tu_default.diagnostics:
        if d.severity >= 3:
            diagnostics.append(f"default: keys.c:{d.location.line}: {d.spelling}")
    default_entries = extract_keynames_from_tu(tu_default, source_bytes, target_path, "default", diagnostics)
    print(f"  default-build entries: {len(default_entries)}")

    print("Phase 2: parsing keys.c (-D__APPLE__)")
    tu_apple = idx.parse(str(KEYS_C), args=CLANG_ARGS_APPLE, options=PARSE_OPTS)
    for d in tu_apple.diagnostics:
        if d.severity >= 3:
            diagnostics.append(f"apple: keys.c:{d.location.line}: {d.spelling}")
    apple_entries = extract_keynames_from_tu(tu_apple, source_bytes, target_path, "apple", diagnostics)
    print(f"  apple-build entries:   {len(apple_entries)}")

    # Merge by NAME only. keys.h gates K_CMD and K_PARA behind __APPLE__ so
    # every enum ordinal after them shifts by +2 in the apple-build TU. If we
    # deduped on (name, code), names like "F1" would appear twice with
    # different codes. Correct behaviour: default-build entries win; only
    # entries whose names are *missing* from the default build get promoted
    # from the apple pass (that's the genuine apple-only set: K_CMD / K_PARA
    # / F13-F15 / KP_EQUAL aliases).
    seen_names: set[str] = set()
    merged: list[ExtractedKeyname] = []
    for k in default_entries:
        if k.name in seen_names:
            continue
        seen_names.add(k.name)
        merged.append(k)
    for k in apple_entries:
        if k.name in seen_names:
            continue
        seen_names.add(k.name)
        merged.append(k)
    print(f"\n  merged unique names: {len(merged)}")

    stats = {
        "total_entries": len(merged),
        "with_numeric_resolved": sum(1 for k in merged if k.key_code is not None),
        "apple_only": sum(1 for k in merged if k.build_variant == "apple"),
        "unique_key_codes": len({k.key_code for k in merged if k.key_code is not None}),
    }

    print("\nPhase 3: writing output")
    keynames_out: dict[str, dict] = {}
    for k in merged:
        # Duplicate names are expected (aliases map to same enum). Use "name"
        # as the primary key; collisions on name alone would drop data, so we
        # key on the canonical (name, code) pair by suffixing with the code
        # only when a duplicate name would otherwise conflict.
        if k.name in keynames_out:
            existing = keynames_out[k.name]["ast"]
            if existing.get("key_code") == k.key_code:
                # Same key code -- truly redundant; skip (can happen across
                # default+apple passes for the same entry).
                continue
            # Same name, different code -- shouldn't normally happen but
            # preserve under a disambiguated key.
            alt_key = f"{k.name}@{k.key_code_ident}"
            keynames_out[alt_key] = {
                "ast": _ast_dict(k),
            }
            continue
        keynames_out[k.name] = {"ast": _ast_dict(k)}

    sorted_keynames = {name: keynames_out[name] for name in sorted(keynames_out)}
    output = {"keynames": sorted_keynames, "_stats": stats}

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    for k, v in stats.items():
        print(f"  {k:<26} {v}")
    print(f"  total output entries: {len(sorted_keynames)}")
    print(f"\n  written: {OUTPUT_JSON}")

    DIAGNOSTICS_LOG.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS_LOG.write_text(
        "\n".join(diagnostics) + "\n" if diagnostics else "(no diagnostics)\n",
        encoding="utf-8",
    )
    print(f"  diagnostics logged: {DIAGNOSTICS_LOG} ({len(diagnostics)} entries)")

    return 0


def _ast_dict(k: ExtractedKeyname) -> dict:
    return {
        "key_code": k.key_code,
        "key_code_ident": k.key_code_ident,
        "source_file": k.source_file,
        "source_line": k.source_line,
        "source_column": k.source_column,
        "build_variant": k.build_variant,
    }


if __name__ == "__main__":
    sys.exit(main())
