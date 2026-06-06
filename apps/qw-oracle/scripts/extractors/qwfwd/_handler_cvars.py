"""Cvars handler for the QWFWD AST extractor.

Detects dynamic cvar registration calls (Pattern: CALL_EXPR on the
registration APIs), NOT struct-init VAR_DECL like MVDSV. QWFWD registers
cvars at runtime via:

    Cvar_Get("name", default, flags)
    Cvar_FullSet("name", default, flags)

Both APIs create the cvar if it does not already exist. Cvar_FullSet is
also a registration site because cvar.c:228 shows it calls Cvar_Get
internally on the first call. net.c uses Cvar_FullSet for net_ip/net_port
when command-line args override cfg values; the same names appear via
Cvar_Get on the else-branch. First-wins dedup handles the net_ip/net_port
duplicate naturally.

F6 exclusion: cvar.c contains the Cvar_Get and Cvar_FullSet function
definitions and a recursive Cvar_Get pass-through at line 228. None of
those are user-facing registrations. The file-level guard
(_is_cvar_machinery flag set in start_file) is simpler and more robust
than trying to exclude individual call sites by enclosing-function check.

Flag constants in QWFWD (cvar.h:58-64):
  CVAR_NONE / CVAR_SERVERINFO / CVAR_READONLY / CVAR_NOSET /
  CVAR_ARCHIVE / CVAR_USER_CREATED

Adapter contract: load-cvars.ts buildCvarVersionRow reads ast.default_value,
ast.flags_raw, ast.flag_names, ast.on_change, ast.source_file,
ast.source_line, ast.source_column, ast.storage_class, ast.trailing_comment.
All keys must be present (null where N/A).
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import (  # noqa: E402
    read_extent,
    strip_quotes,
)
from extractor_lib._cvar_shared import (  # noqa: E402
    normalize_flags_raw,
    parse_flag_names,
    unescape_c_string,
)


class CvarsQwfwdHandler(Visitor):
    """QWFWD cvars handler (CALL_EXPR detection on Cvar_Get/Cvar_FullSet).

    Cross-codebase port: subclasses Visitor directly, not a MVDSV subclass.
    MVDSV detects VAR_DECL struct-init; QWFWD uses dynamic registration
    calls, so the detection mechanism is entirely different.

    Fork override hooks (if a future QWFWD fork introduces a new registration
    API or a struct-init variant):
      - visit_cursor: add the new pattern alongside the CALL_EXPR check.
      - finalize: dedup / stats policy. Short; override to adjust.
    """

    name = "cvars"
    output_filename = "qwfwd-variables-ast.json"
    payload_field = "vars"

    # Both APIs create a cvar on first call; both are registration sites.
    REGISTRATION_APIS: tuple = ("Cvar_Get", "Cvar_FullSet")

    def setup(self, *, qwfwd_repo: Path, qwfwd_src: Path) -> None:
        # Repo root is needed by _relative_source to produce reproducible
        # source_file paths (V8 depends on this being relative, not absolute).
        self._repo_root = qwfwd_repo
        self._src_root = qwfwd_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()
        # F6: cvar.c holds the Cvar_Get/Cvar_FullSet implementations and a
        # recursive Cvar_Get pass-through. None of those are registration sites.
        # Flag here rather than checking per-cursor to avoid per-call overhead.
        self._is_cvar_machinery = (source_path.name == "cvar.c")

    def visit_cursor(self, cursor, variant: str) -> None:
        # F6: skip cvar.c entirely -- it is the cvar subsystem implementation.
        if self._is_cvar_machinery:
            return

        if cursor.kind != CursorKind.CALL_EXPR:
            return
        if cursor.spelling not in self.REGISTRATION_APIS:
            return

        args = list(cursor.get_arguments())
        # Both APIs require at least name + default; fewer args = malformed call.
        if len(args) < 2:
            return

        # arg0: cvar name -- must be a non-empty string literal.
        name_raw = read_extent(self.source_bytes, args[0].extent).strip()
        name = strip_quotes(name_raw)
        if not name:
            return

        # Per-file first-wins dedup: net_ip/net_port appear via both
        # Cvar_FullSet and Cvar_Get in net.c; emit each name once.
        if name in self._seen_in_file:
            return

        # arg1: default value -- unescape so the loaded value matches runtime.
        default_raw = read_extent(self.source_bytes, args[1].extent).strip()
        default_value = unescape_c_string(strip_quotes(default_raw))

        flags_raw: str = ""
        flag_names: list[str] = []
        if len(args) >= 3:
            flags_raw = normalize_flags_raw(read_extent(self.source_bytes, args[2].extent))
            flag_names = parse_flag_names(flags_raw)

        on_change: Optional[str] = None
        if len(args) >= 4:
            ref = args[3].referenced
            if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
                on_change = ref.spelling
            else:
                # Fallback: resolve via source extent when libclang can't
                # give us the FUNCTION_DECL reference (uncommon for QWFWD).
                on_change = read_extent(self.source_bytes, args[3].extent).strip() or None

        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None

        self._rows.append({
            "name": name,
            "ast": {
                "default_value": default_value,
                "flags_raw": flags_raw,
                "flag_names": flag_names,
                "on_change": on_change,
                "source_file": rel_file,
                "source_line": location.line,
                "source_column": location.column,
                # QWFWD uses dynamic registration calls, not static declarations,
                # so there is no storage class to report.
                "storage_class": None,
                # Trailing comments are on the assignment lines (e.g. `hostname =
                # Cvar_Get(...);`); those are not the call-expr cursor's own line
                # in a way that _trailing_comment from MVDSV can reliably anchor on.
                # Not implemented; the describe pass fills descriptions instead.
                "trailing_comment": None,
            },
        })
        self._seen_in_file.add(name)

    def _relative_source(self, abs_path: str) -> str:
        """Return source_file relative to the repo root for reproducibility.
        Absolute fallback when the file lies outside the repo (shouldn't happen
        for top-level src/*.c but defensive)."""
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
        # Cross-file first-wins dedup by canonical name. Multiple parse
        # variants (base + win) dispatch as the same "server" variant and
        # may produce duplicate rows for platform-unconditional sites.
        # The per-file _seen_in_file set already collapses per-file duplicates;
        # this loop collapses cross-file + cross-variant duplicates.
        seen: set[str] = set()
        unique: list[dict] = []
        for r in all_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)

        # Sort by name for deterministic output (V8: re-extract must produce
        # empty git diff; non-deterministic sort is the most common cause of failure).
        unique.sort(key=lambda r: r["name"])

        stats = {
            "source_total": len(all_rows),
            "count": len(unique),
            "with_flags": sum(1 for r in unique if r["ast"].get("flag_names")),
            "with_onchange": sum(1 for r in unique if r["ast"].get("on_change")),
            "with_trailing_comment": sum(1 for r in unique if r["ast"].get("trailing_comment")),
        }
        return {
            "vars": unique,
            "_stats": stats,
        }
