"""Protocol messages handler for the MVDSV AST extractor.

Detects #define constants for protocol-message bytes and protocol-version
constants. libclang under PARSE_DETAILED_PROCESSING_RECORD exposes
MACRO_DEFINITION cursors as top-level children of the TRANSLATION_UNIT root.
We filter by name prefix to one of seven discriminator kinds:

  - 'svc_'                -> kind='svc'   (server-to-client message byte)
  - 'clc_'                -> kind='clc'   (client-to-server message byte)
  - 'nq_'                 -> kind='nq'    (NQ-protocol legacy message byte)
  - 'FTE_PEXT_'           -> kind='pext_fte'
  - 'FTE_PEXT2_'          -> kind='pext_fte'
  - 'MVD_PEXT'            -> kind='pext_mvd'
  - 'PROTOCOL_VERSION'    -> kind='protocol_version'

Value extraction: read the macro tokens after the name and emit the raw text
plus a value_kind discriminator ('integer', 'bitshift', 'hex', 'expression').

WALKER FILTER BYPASS. The shared walker (_visitor.walk_tu_dispatch) skips
cursors whose location.file != target_path_str so per-handler dispatch never
descends into included headers. The MVDSV protocol macros all live in
src/qwprot/src/protocol.h, NOT in the .c file being walked. Trick: the
walker DOES dispatch visit_cursor on the TRANSLATION_UNIT root cursor (its
location.file is None, so the file filter doesn't trigger). When we see the
TU root we do our own one-shot scan over its children for MACRO_DEFINITION
cursors. Per-file dedup absorbs the 3-variant emission; cross-file dedup in
finalize() collapses the per-(.c file)-walked emissions across the whole
chunk and across workers.

Trailing-comment harvest: macros are defined in protocol.h, not the current
TU's .c file. We cache protocol.h's bytes once on first encounter (per
worker) and read trailing-line comments from the cached bytes.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


_INTEGER_RE = re.compile(r"^-?\d+$")
_HEX_RE = re.compile(r"^0[xX][0-9a-fA-F]+$")
# Bit-shift form `( 1 << N )` or `(1<<N)`; tolerate optional outer parens
# and any whitespace between tokens. After whitespace stripping the value
# reduces to `(1<<N)` or `1<<N`.
_BITSHIFT_RE = re.compile(r"^\(?1<<\d+\)?$")


def _kind_for(name: str) -> Optional[str]:
    """Map a macro name to its protocol-message kind, or None to skip.
    Order matters only for non-overlapping prefixes; nq_svc_* starts with
    `nq_` and never matches `svc_` because Python `startswith` checks the
    leading bytes, not a substring.
    """
    if name.startswith("svc_"):
        return "svc"
    if name.startswith("clc_"):
        return "clc"
    if name.startswith("nq_"):
        return "nq"
    if name.startswith("FTE_PEXT_") or name.startswith("FTE_PEXT2_"):
        return "pext_fte"
    if name.startswith("MVD_PEXT"):
        return "pext_mvd"
    if name.startswith("PROTOCOL_VERSION"):
        return "protocol_version"
    return None


def _classify_value(raw: str) -> str:
    """Classify a macro body as one of integer/hex/bitshift/expression.
    Strips whitespace before applying the bitshift pattern; integer/hex
    keep their original form so a leading minus or `0x` prefix survives.
    """
    s = raw.strip()
    if _INTEGER_RE.match(s):
        return "integer"
    if _HEX_RE.match(s):
        return "hex"
    if _BITSHIFT_RE.match(s.replace(" ", "")):
        return "bitshift"
    return "expression"


def _trailing_comment(source_bytes: bytes, line: int) -> Optional[str]:
    """Read a trailing `// ...` or `/* ... */` comment from `line` of
    source_bytes. protocol.h uses single-line `//` comments after the value
    (e.g. `#define svc_print 8  // [byte] id [string] ...`); these are
    captured. Block comments on the same line are also handled.
    """
    text = source_bytes.decode("utf-8", errors="replace")
    lines = text.splitlines()
    if line - 1 < 0 or line - 1 >= len(lines):
        return None
    raw = lines[line - 1]
    idx = raw.find("//")
    if idx >= 0:
        return raw[idx + 2:].strip() or None
    bidx = raw.find("/*")
    if bidx >= 0:
        e = raw.find("*/", bidx + 2)
        if e >= 0:
            return raw[bidx + 2:e].strip() or None
    return None


class ProtocolMvdsvHandler(Visitor):
    name = "protocol"
    output_filename = "mvdsv-protocol-messages-ast.json"
    payload_field = "protocol_messages"

    def setup(self, *, mvdsv_repo: Path, mvdsv_src: Path) -> None:
        self._repo_root = mvdsv_repo
        self._src_root = mvdsv_src
        # Worker-local cache of bytes for headers that contribute macros.
        # protocol.h is the only one in practice; the dict shape lets us
        # absorb future cases without restructuring.
        self._header_bytes_cache: dict[str, bytes] = {}

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        # The walker dispatches visit_cursor for every cursor inside the
        # target .c file, plus the TU root (whose location.file is None and
        # thus passes the walker's per-file filter). MACRO_DEFINITION
        # cursors live in protocol.h, not the .c file, so they would be
        # filtered out if we relied on the walker to deliver them. Instead,
        # when we see the TU root we do our own one-shot scan over its
        # children and fish out the MACRO_DEFINITION cursors directly.
        if cursor.kind != CursorKind.TRANSLATION_UNIT:
            return
        for child in cursor.get_children():
            if child.kind != CursorKind.MACRO_DEFINITION:
                continue
            self._handle_macro(child)

    def _handle_macro(self, cursor) -> None:
        name = cursor.spelling
        if not name:
            return
        kind = _kind_for(name)
        if kind is None:
            return
        if name in self._seen_in_file:
            return

        # Read macro body tokens. Token 0 is the macro name; tokens[1:] is
        # the body. Some macros (e.g. an empty `#define FOO`) have only the
        # name token -- treat their value as None.
        tokens = list(cursor.get_tokens())
        if len(tokens) > 1:
            value_raw = " ".join(t.spelling for t in tokens[1:]).strip() or None
        else:
            value_raw = None
        value_kind = _classify_value(value_raw) if value_raw else None

        location = cursor.location
        if location.file is None:
            # Should not happen for MACRO_DEFINITION cursors, but defend
            # against it anyway.
            return
        abs_file = location.file.name
        rel_file = self._relative_source(abs_file)

        # Macros are defined in protocol.h, not the current .c file. Read
        # the trailing comment from the macro's own file (cached per worker).
        header_bytes = self._header_bytes_cache.get(abs_file)
        if header_bytes is None:
            try:
                header_bytes = Path(abs_file).read_bytes()
            except OSError:
                header_bytes = b""
            self._header_bytes_cache[abs_file] = header_bytes
        trailing = _trailing_comment(header_bytes, location.line) if header_bytes else None

        self._rows.append({
            "name": name,
            "ast": {
                "kind": kind,
                "value": value_raw,
                "value_kind": value_kind,
                "source_file": rel_file,
                "source_line": location.line,
                "trailing_comment": trailing,
            },
        })
        self._seen_in_file.add(name)

    def _relative_source(self, abs_path: str) -> str:
        """Make source_file repo-relative; fall back to absolute if outside
        the repo (shouldn't happen for protocol.h)."""
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Cross-file first-wins dedup by name. The same MACRO_DEFINITION is
        # emitted once per .c-file walk (because every .c file's TU re-parses
        # protocol.h via -I), times the 3 variants, times every worker that
        # touched any .c file. Per-file dedup already collapsed the 3-variant
        # emission inside one walk; this collapses across .c files and workers.
        seen: set[str] = set()
        unique: list[dict] = []
        for r in all_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)
        unique.sort(key=lambda r: (r["ast"]["kind"], r["name"]))

        kinds_count: dict[str, int] = {}
        value_kinds_count: dict[str, int] = {}
        for r in unique:
            k = r["ast"]["kind"]
            kinds_count[k] = kinds_count.get(k, 0) + 1
            vk = r["ast"].get("value_kind") or "none"
            value_kinds_count[vk] = value_kinds_count.get(vk, 0) + 1

        return {
            "protocol_messages": unique,
            "_stats": {
                "source_total": len(all_rows),
                "count": len(unique),
                "by_kind": kinds_count,
                "by_value_kind": value_kinds_count,
                "with_trailing_comment": sum(
                    1 for r in unique if r["ast"].get("trailing_comment")
                ),
            },
        }
