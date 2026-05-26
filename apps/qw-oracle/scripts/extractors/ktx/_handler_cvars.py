"""Cvars handler for the KTX AST extractor.

Detects RegisterCvar / RegisterCvarEx call sites in KTX source. KTX
defines two registration APIs (verified at world.c:717 and world.c:751):

  - RegisterCvar(const char *var)             -> default_value=NULL
  - RegisterCvarEx(const char *var, default)  -> default_value=<arg[1]>

Both lookup-or-create the cvar and return qbool. RegisterCvar internally
calls RegisterCvarEx(var, "") so the no-default form gets an empty string
at runtime; from a source-extraction POV we preserve the source-fidelity
distinction: RegisterCvar -> NULL default, RegisterCvarEx -> literal
default_value.

PATTERN 6 INTEGRATION (Phase 1 lift). Bot-cvar registrations like
`RegisterCvar(FB_CVAR_DODGEFACTOR)` at bot_botimp.c:113-117 use
identifier args. The Phase 1 lift to extractor_lib._source.collect_file_macros
populates self.file_macros via walk_tu_dispatch with the transitive
#include closure of the target file (originally depth-1; bumped to
depth-N via D4 unpark 2026-05-26 after the k_fb_* family was found
missing -- world.c's RegisterCvarEx(FB_CVAR_*, ...) calls resolve via
fb_globals.h which sits depth-2 behind g_local.h). The handler consults
self.file_macros when arg[0] is a non-literal identifier; this is the
same shape ezQuake/_handler_commands.py uses post-Phase-1.

CROSS-CODEBASE PORT (D3). Handler inherits from extractor_lib._visitor.Visitor
only -- NOT a subclass of MVDSV / ezQuake / FTE / QWCL handlers. KTX's
RegisterCvar* API differs from ezQuake's `cvar_t foo = {...}` declaration
shape; subclassing would tie KTX's extraction to a parent's API surface
that doesn't apply.

CANONICAL NAME (no Pattern 14 here). KTX cvars do not register across
multiple semantic scopes -- a name registered as `k_foo` is the same
entity wherever it appears. Pattern 14 suffixing applies only to commands
(D7) and info_keys (D7). Per-file dedup `_seen_in_file` is keyed on the
bare cvar name.

Output entity shape (one row per unique cvar name; first-wins on
cross-file duplicates in finalize):

    {
      "name": "k_lockmove",
      "ast": {
        "default_value": "0",        # NULL for RegisterCvar (no default arg)
        "source_file": "src/world.c", # RegisterCvar* call site
        "source_line": 845,
        "source_column": 2,
        "registration_api": "RegisterCvarEx",  # provenance for the bucket
        "trailing_comment": "...",   # `// ...` or `/* ... */` on the call line, else None
      }
    }

KTX has NO help_*.json so finalize emits no help-merge step -- every row
is source-backed by definition. The loader's isSourceBacked predicate
returns true for `entry.ast !== null` which is always true here.
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
from extractor_lib._source import literal_string, read_extent  # noqa: E402

# Identifier-arg fallback regex. When arg[0] of RegisterCvar* is not a
# literal string, libclang's literal_string() returns None; if the raw
# extent matches this regex, we look it up in self.file_macros (the
# Phase 1 lifted transitive #include macro map).
_MACRO_IDENT_RE = re.compile(r"^[A-Z_][A-Z0-9_]+$")


def _trailing_comment(source_bytes: bytes, line: int) -> Optional[str]:
    """Find a trailing `// ...` or `/* ... */` comment on the same line as
    `line` in source_bytes. If a `//` trailing comment is followed by
    subsequent lines that are pure `//`-prefixed (after whitespace), those
    continuation lines are joined with single spaces.

    Anchor: KTX cvars register via call sites (`RegisterCvar(...);` /
    `RegisterCvarEx(...);`). Primary anchor is `);` (closing of the call
    statement); defensive fallback is the last `;` (statement terminator)
    in case `);` is absent.

    Example (world.c:780-781):
        RegisterCvar("_k_last_cycle_map");  // internal usage, name of last map in map cycle,
                                            // so we can back to map cycle if someone voted ...
    -> "internal usage, name of last map in map cycle, so we can back to map cycle if ..."

    Mirrors MVDSV's helper shape (anchor `};` -> `);`); see
    apps/qw-oracle/scripts/extractors/mvdsv/_handler_cvars.py:_trailing_comment
    for the parent pattern.
    """
    text = source_bytes.decode("utf-8", errors="replace")
    lines = text.splitlines()
    if line - 1 < 0 or line - 1 >= len(lines):
        return None
    raw = lines[line - 1]
    close_idx = raw.rfind(");")
    if close_idx >= 0:
        tail = raw[close_idx + 2:]
    else:
        semi_idx = raw.rfind(";")
        tail = raw[semi_idx + 1:] if semi_idx >= 0 else raw
    tail = tail.strip()

    if tail.startswith("//"):
        comment = tail[2:].strip()
        # Multi-line continuation: subsequent lines that are pure `//` comment
        # (after stripping leading whitespace).
        i = line  # 1-based line; lines[line] is the next line (0-based).
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


class CvarsKtxHandler(Visitor):
    """KTX cvars handler (Pattern 5 + Pattern 6 detection).

    Cross-codebase port (D3) -- inherits from Visitor only. No parent-
    project subclass.

    No fork override hooks today. KTX has only one canonical fork target
    (dusty-ktx, separate arc) which differs at the QC layer rather than
    the registration-API layer.
    """
    name = "cvars"
    output_filename = "ktx-variables-ast.json"
    payload_field = "vars"

    # Registration APIs. Both call shapes are detected; the difference is
    # default_value extraction (RegisterCvar -> NULL, RegisterCvarEx -> arg[1]).
    REGISTRATION_APIS: tuple = ("RegisterCvar", "RegisterCvarEx")

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        self._repo_root = ktx_repo
        self._src_root = ktx_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup. KTX has no client/server variant split (single TU
        # parse), but defensive against the same call site being visited
        # twice through cursor traversal.
        self._seen_in_file: set[str] = set()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        spelling = cursor.spelling
        if spelling not in self.REGISTRATION_APIS:
            return
        args = list(cursor.get_arguments())
        if len(args) < 1:
            return

        # arg[0]: literal-string OR macro-arg fallback via self.file_macros
        # (Phase 1 lift -- transitive #include closure).
        name = literal_string(args[0], self.source_bytes)
        if not name:
            raw = read_extent(self.source_bytes, args[0].extent).strip()
            if _MACRO_IDENT_RE.match(raw):
                name = self.file_macros.get(raw)
        if not name:
            return
        if name in self._seen_in_file:
            return

        # arg[1]: default value, ONLY for RegisterCvarEx. RegisterCvar's
        # 1-arg signature has no arg[1]; default_value stays NULL per the
        # F1 anchor's "no default -> default_value NULL" rule.
        default_value: Optional[str] = None
        if spelling == "RegisterCvarEx" and len(args) >= 2:
            default_value = literal_string(args[1], self.source_bytes)
            # Best-effort: if arg[1] is a non-literal expression (rare in
            # KTX -- audit shows nearly all RegisterCvarEx use string
            # literals), preserve the raw extent so downstream consumers
            # see a non-NULL provenance.
            if default_value is None:
                raw = read_extent(self.source_bytes, args[1].extent).strip()
                # Strip surrounding quotes if a quoted-string slipped past
                # literal_string (multi-line concat etc).
                if raw.startswith('"') and raw.endswith('"'):
                    default_value = raw[1:-1]
                elif raw and raw != "NULL":
                    default_value = raw

        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        trailing = _trailing_comment(self.source_bytes, location.line)

        self._rows.append({
            "name": name,
            "ast": {
                "default_value": default_value,
                "source_file": rel_file,
                "source_line": location.line,
                "source_column": location.column,
                "registration_api": spelling,
                # Preserved for cross-engine schema parity. KTX has no
                # source-side flag system; load-cvars.ts handles None.
                "flags_raw": None,
                "flag_names": None,
                "on_change": None,
                "min_bound": None,
                "max_bound": None,
                "storage_class": None,
                "group_name_in_source": None,
                "trailing_comment": trailing,
            },
        })
        self._seen_in_file.add(name)

    def _relative_source(self, abs_path: str) -> str:
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
        # Cross-file first-wins by canonical name. KTX has no help-JSON
        # so this is the only dedup pass.
        by_name: dict[str, dict] = {}
        order: list[str] = []
        for r in all_rows:
            if r["name"] not in by_name:
                by_name[r["name"]] = r
                order.append(r["name"])

        unique = [by_name[n] for n in order]
        unique.sort(key=lambda r: r["name"])

        # Bucket counts for stats. RegisterCvar (no default) vs
        # RegisterCvarEx (with default) -- inversion from F1's spec
        # estimate is documented in this phase MD's "Open questions"
        # section; live-source counts win.
        by_api: dict[str, int] = {}
        with_default = 0
        for r in unique:
            api = r["ast"].get("registration_api") or "?"
            by_api[api] = by_api.get(api, 0) + 1
            if r["ast"].get("default_value") is not None:
                with_default += 1

        return {
            "vars": unique,
            "_stats": {
                "source_total": len(all_rows),
                "count": len(unique),
                "by_api": by_api,
                "with_default": with_default,
            },
        }
