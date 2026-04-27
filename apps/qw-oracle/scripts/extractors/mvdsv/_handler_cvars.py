"""Cvars handler for the MVDSV AST extractor.

Detects literal `cvar_t` struct-init declarations (Pattern 1):

    cvar_t  sv_mintic = {"sv_mintic", "0.013"};
    cvar_t  sv_maxfps = {"maxfps", "77", CVAR_SERVERINFO};
    static cvar_t qtv_streamport = {"qtv_streamport", "0"};
    cvar_t sys_select_timeout = {"sys_select_timeout", "10000", 0, OnChange_sysselecttimeout_var};

MVDSV does NOT use macro-style registrations (FTE-style CVARD/CVARFD), so the
detection path is the simpler ezQuake variant of Pattern 1. No nested-struct
container types observed in MVDSV (verified Pass 1); if any surface during
runtime validation the playbook's Pattern 3 is the recipe.

Per-file dedup on cvar name applied across all 3 variants (server-base / win
/ linux all dispatch as variant="server"); cross-file (across all .c files)
dedup is first-wins by name in finalize().

Flag inventory (per src/cvar.h, Pass 1):
  CVAR_NONE / CVAR_SERVERINFO / CVAR_ROM / CVAR_USER_CREATED
  No CVAR_ARCHIVE -- MVDSV is a dedicated server, no config save.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind, StorageClass

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402


_FLAG_NAME_RE = re.compile(r"\bCVAR_[A-Z0-9_]+\b")


def _read_extent(source_bytes: bytes, extent) -> str:
    """Return the source text for an AST extent."""
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


def _parse_flag_names(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    return list(dict.fromkeys(_FLAG_NAME_RE.findall(raw)))


def _storage_str(storage_class) -> Optional[str]:
    """Map clang StorageClass enum to the short-form label used by the schema.
    'none' is reported as None to keep the JSON tidy."""
    return {
        StorageClass.STATIC: "static",
        StorageClass.EXTERN: "extern",
    }.get(storage_class)


def _trailing_comment(source_bytes: bytes, line: int) -> Optional[str]:
    """Find a trailing `// ...` or `/* ... */` comment on the same line as
    `line` in source_bytes. If a `//` trailing comment is followed by
    subsequent lines that are pure `//`-prefixed (after whitespace), those
    continuation lines are joined with single spaces.

    Example (sv_main.c:50-52):
        cvar_t sv_maxfps = {"maxfps", "77", CVAR_SERVERINFO};  // It actually...
                                                                   // It was server...
                                                                   // Sad part is...
    -> "It actually... It was server... Sad part is..."
    """
    text = source_bytes.decode("utf-8", errors="replace")
    lines = text.splitlines()
    if line - 1 < 0 or line - 1 >= len(lines):
        return None
    raw = lines[line - 1]
    # Anchor to the terminator of the declaration so we don't pick up
    # in-line comments that fall inside the struct-init braces.
    terminator_idx = max(raw.rfind(";"), raw.rfind(","))
    tail = raw[terminator_idx + 1:] if terminator_idx >= 0 else raw
    tail = tail.strip()

    if tail.startswith("//"):
        comment = tail[2:].strip()
        # Multi-line continuation: subsequent lines that are pure `//` comment
        # (after stripping leading whitespace).
        i = line  # next line index = line (because line is 1-based, lines[line] is next)
        while i < len(lines):
            nxt = lines[i].strip()
            if nxt.startswith("//"):
                comment = (comment + " " + nxt[2:].strip()).strip()
                i += 1
            else:
                break
        return comment or None

    if tail.startswith("/*"):
        end = tail.find("*/", 2)
        body = tail[2:end] if end >= 0 else tail[2:]
        return body.strip() or None

    return None


def _is_cvar_t_decl(cursor) -> bool:
    """True if cursor is a VAR_DECL whose effective type is `cvar_t` (with
    optional const qualifier). Skips array-typed declarations -- Pass 1
    verified MVDSV has no `cvar_t[]` arrays."""
    if cursor.kind != CursorKind.VAR_DECL:
        return False
    tspell = cursor.type.spelling
    return bool(re.fullmatch(r"(?:const\s+)?cvar_t", tspell))


class CvarsMvdsvHandler(Visitor):
    name = "cvars"
    output_filename = "mvdsv-variables-ast.json"
    payload_field = "variables"

    def setup(self, *, mvdsv_repo: Path, mvdsv_src: Path) -> None:
        self._repo_root = mvdsv_repo
        self._src_root = mvdsv_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        self._seen_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if not _is_cvar_t_decl(cursor):
            return

        # Find the INIT_LIST_EXPR child. extern declarations and forward
        # declarations have no INIT_LIST_EXPR -- skip them.
        init_list = None
        for child in cursor.get_children():
            if child.kind == CursorKind.INIT_LIST_EXPR:
                init_list = child
                break
        if init_list is None:
            return

        fields = list(init_list.get_children())
        if len(fields) < 2:
            return

        name_raw = _read_extent(self.source_bytes, fields[0].extent).strip()
        name = _strip_quotes(name_raw)
        if not name:
            return
        if name in self._seen_in_file:
            return

        default_raw = _read_extent(self.source_bytes, fields[1].extent).strip()
        default_value = _strip_quotes(default_raw)

        flags_raw: Optional[str] = None
        flag_names: list[str] = []
        if len(fields) >= 3:
            flags_raw = _read_extent(self.source_bytes, fields[2].extent).strip() or None
            flag_names = _parse_flag_names(flags_raw)

        on_change: Optional[str] = None
        if len(fields) >= 4:
            ref = fields[3].referenced
            if ref is not None and ref.kind == CursorKind.FUNCTION_DECL:
                on_change = ref.spelling
            else:
                # Fallback to source extent if libclang couldn't resolve the
                # function reference (rare for MVDSV; on_change is always a
                # plain identifier in this codebase).
                on_change = _read_extent(self.source_bytes, fields[3].extent).strip() or None

        location = cursor.location
        storage_class = _storage_str(cursor.storage_class)
        trailing = _trailing_comment(self.source_bytes, location.line)
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
                "storage_class": storage_class,
                "trailing_comment": trailing,
            },
        })
        self._seen_in_file.add(name)

    def _relative_source(self, abs_path: str) -> str:
        """Make source_file relative to the repo root, falling back to the
        absolute path if the file lies outside the repo (shouldn't happen for
        top-level src/*.c)."""
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
        # First-wins dedup by canonical name across all files. Across the 3
        # variants (server-base / win / linux) the same declaration appears
        # multiple times when it isn't guarded by platform conditionals; the
        # per-file _seen_in_file set already collapses those. Cross-file
        # collisions (same cvar name re-declared in another .c) are rare and
        # first-wins is the same convention as the ezQuake/FTE handlers.
        seen: set[str] = set()
        unique: list[dict] = []
        for r in all_rows:
            if r["name"] in seen:
                continue
            seen.add(r["name"])
            unique.append(r)
        unique.sort(key=lambda r: r["name"])
        stats = {
            "source_total": len(all_rows),
            "count": len(unique),
            "with_flags": sum(1 for r in unique if r["ast"].get("flag_names")),
            "with_onchange": sum(1 for r in unique if r["ast"].get("on_change")),
            "with_trailing_comment": sum(1 for r in unique if r["ast"].get("trailing_comment")),
        }
        return {
            "variables": unique,
            "_stats": stats,
        }
