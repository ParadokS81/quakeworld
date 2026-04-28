"""ezQuake keynames handler.

Unlike the other ezQuake handlers:
  - Only keys.c matters (all other files contribute nothing).
  - Needs a -D__APPLE__ variant, NOT the driver's -DSERVERONLY variant.
  - Uses a minimal CLANG_ARGS set that doesn't match the common one.

Compromise: the driver's tu_client and tu_server are IGNORED. When
process_file is called with keys.c, this handler spins up its own Index
and parses keys.c twice (default + apple). For every other file,
process_file returns []. The two extra parses cost ~2 seconds total
against a file the driver was going to parse anyway, which is fine.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

from clang.cindex import CursorKind, Index, TranslationUnit


# Minimal args that match the legacy keynames extractor exactly.
_KEYNAMES_CLANG_ARGS_BASE = [
    "-x", "c",
    "-w",
    "-DWITH_IRC",
    "-DRENDERER_OPTION_CLASSIC_OPENGL",
    "-DRENDERER_OPTION_MODERN_OPENGL",
]

_PARSE_OPTS = (
    TranslationUnit.PARSE_DETAILED_PROCESSING_RECORD
    | TranslationUnit.PARSE_INCOMPLETE
)


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
    text = text.strip()
    if not text:
        return None
    if len(text) >= 3 and text[0] == "'" and text[-1] == "'":
        body = text[1:-1]
        if len(body) == 1:
            return ord(body)
        if len(body) == 2 and body[0] == "\\":
            esc_map = {"n": 10, "t": 9, "r": 13, "0": 0, "\\": 92, "'": 39, '"': 34}
            return esc_map.get(body[1])
        return None
    try:
        return int(text, 0)
    except ValueError:
        return None


def _extract_keynames_from_tu(tu, source_bytes: bytes, target_path: str, label: str) -> list[dict]:
    out: list[dict] = []

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
                if not (name_raw.startswith('"') and name_raw.endswith('"')):
                    continue
                name = _strip_quotes(name_raw)
                if not name:
                    continue
                ident, numeric = _resolve_enum(fields[1])
                raw_second = _read_extent(source_bytes, fields[1].extent).strip()
                if ident is None and numeric is None:
                    numeric = _resolve_literal_value(raw_second)
                key_code_ident = ident if ident is not None else raw_second
                out.append({
                    "name": name,
                    "key_code_ident": key_code_ident,
                    "key_code": numeric,
                    "source_file": Path(inner.location.file.name).name if inner.location.file else "keys.c",
                    "source_line": inner.location.line,
                    "source_column": inner.location.column,
                    "build_variant": label,
                })
            return
        for c in node.get_children():
            visit(c)

    visit(tu.cursor)
    return out


class KeynamesEzquakeHandler:
    name = "keynames"
    output_filename = "ezquake-keynames-ast.json"

    def __init__(self):
        self._processed = False

    def process_file(
        self,
        *,
        tu_client: Any,
        tu_server: Any,
        source_bytes: bytes,
        source_path: Path,
    ) -> list[dict]:
        # Only care about keys.c. And only process it once (guards against the
        # unlikely case of two keys.c in the source tree).
        if source_path.name != "keys.c" or self._processed:
            return []
        self._processed = True

        # Spin up our own parses with the minimal args + apple variant.
        # We can't reuse tu_client because it was parsed with args that differ
        # from the legacy keynames extractor and would drift the output.
        include_dir = str(source_path.parent)
        clang_args = _KEYNAMES_CLANG_ARGS_BASE + [f"-I{include_dir}"]
        clang_args_apple = clang_args + ["-D__APPLE__"]

        idx = Index.create()
        tu_default = idx.parse(str(source_path), args=clang_args, options=_PARSE_OPTS)
        tu_apple = idx.parse(str(source_path), args=clang_args_apple, options=_PARSE_OPTS)

        target_path = str(source_path.resolve())
        default_entries = _extract_keynames_from_tu(tu_default, source_bytes, target_path, "default")
        apple_entries = _extract_keynames_from_tu(tu_apple, source_bytes, target_path, "apple")
        # Tag each so finalize knows ordering for merge precedence.
        return [{"_pass": "default", **e} for e in default_entries] + [{"_pass": "apple", **e} for e in apple_entries]

    def finalize(
        self,
        *,
        all_rows: list[dict],
        repo_root: Path,
    ) -> dict:
        # Split back into default + apple to preserve merge-order semantics.
        default_entries = [r for r in all_rows if r["_pass"] == "default"]
        apple_entries = [r for r in all_rows if r["_pass"] == "apple"]

        # Merge by name: default-build wins; apple-build only contributes
        # entries whose name is missing from default.
        seen_names: set[str] = set()
        merged: list[dict] = []
        for k in default_entries:
            if k["name"] in seen_names:
                continue
            seen_names.add(k["name"])
            merged.append(k)
        for k in apple_entries:
            if k["name"] in seen_names:
                continue
            seen_names.add(k["name"])
            merged.append(k)

        stats = {
            "total_entries": len(merged),
            "with_numeric_resolved": sum(1 for k in merged if k["key_code"] is not None),
            "apple_only": sum(1 for k in merged if k["build_variant"] == "apple"),
            "unique_key_codes": len({k["key_code"] for k in merged if k["key_code"] is not None}),
        }

        keynames_out: dict[str, dict] = {}
        for k in merged:
            ast_entry = {
                "key_code": k["key_code"],
                "key_code_ident": k["key_code_ident"],
                "source_file": k["source_file"],
                "source_line": k["source_line"],
                "source_column": k["source_column"],
                "build_variant": k["build_variant"],
            }
            if k["name"] in keynames_out:
                existing = keynames_out[k["name"]]["ast"]
                if existing.get("key_code") == k["key_code"]:
                    continue
                alt_key = f"{k['name']}@{k['key_code_ident']}"
                keynames_out[alt_key] = {"ast": ast_entry}
                continue
            keynames_out[k["name"]] = {"ast": ast_entry}

        sorted_keynames = {name: keynames_out[name] for name in sorted(keynames_out)}
        return {"keynames": sorted_keynames, "_stats": stats}
