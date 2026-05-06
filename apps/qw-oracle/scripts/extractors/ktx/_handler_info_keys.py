"""Info keys handler for the KTX AST extractor.

Detects KTX's producer-side userinfo key writes via the SetUserInfo C
API. Consumer-only keys (the ~33 keys KTX reads via ezinfokey / infokey)
are NOT emitted -- they belong conceptually to the producer's project
(ezQuake CVAR_USERINFO, MVDSV info_key, or other KTX-produced star
keys). Per spec 1.6 producer-only emission rule.

API DETECTION:
  SetUserInfo(ent, "*KEY", value, SETUSERINFO_STAR)

The first arg is an entity pointer; the second arg is the key name as a
literal string starting with '*' (the producer convention for star
keys); the third is the value (often a va() expression -- not extracted
here; that is per-call-site state); the fourth is the SETUSERINFO_STAR
flag. We require the second arg to be a string-literal starting with '*'
to match the producer-emission shape; non-literal or non-star keys are
out of scope (they are caller-controlled keys, not KTX-defined).

CANONICAL NAME (D7 Pattern 14). Suffix `<bare>:userinfo` so the entity
table's UNIQUE(project, type, name) constraint cleanly disambiguates if
a future KTX tag adds the same bare key as a serverinfo or localinfo
write (KTX today emits userinfo only). Mirrors MVDSV's existing
suffixing convention. Bare name preserved at the top-level `bare_name`
field for MCP lookup_entity prefix-fallback.

KTX OUT OF SCOPE FOR THIS HANDLER:
  - ezinfokey / infokey READ sites (91 + 20 occurrences) -- consumer
    contract, not producer-emission. Per spec 1.6.
  - SetUserInfo writes whose second arg is NOT a literal star-key (e.g.
    Cmd_Argv-derived player-controlled keys) -- those are runtime
    payloads, not KTX-defined system keys.

CROSS-WORKER AGGREGATION (Approach B, mirrors MVDSV info_keys). Forked
workers each accumulate per-file primitive rows from end_file.
Aggregation by bare_name happens once in finalize in the parent, after
worker results merge.

Output entity shape (one row per unique bare_name):

    {
      "name": "*is:userinfo",
      "bare_name": "*is",
      "ast": {
        "scope": "userinfo",
        "operations": ["write"],
        "source_file": "src/g_userinfo.c",  # first-seen anchor
        "source_line": 226,
        "containing_function": "SomeFunc",
        "all_call_sites": [
          {"source_file": "src/g_userinfo.c", "source_line": 226, "operation": "write"}
        ]
      }
    }

Schema parity: load-info-keys.ts's buildInfoKeyVersionRow consumes
ast.scope, ast.operations (JSON-stringified TEXT), ast.all_call_sites
(JSONB array via tx.json per D14), ast.source_file, ast.source_line,
ast.containing_function. KTX's source_root field is NULL (single-engine
project, NULL = "engine" per SCHEMA.md).
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import literal_string  # noqa: E402


class InfoKeysKtxHandler(Visitor):
    """KTX info-keys handler (SetUserInfo producer-only detection).

    Cross-codebase port (D3) -- inherits from Visitor only. Read MVDSV's
    _handler_info_keys.py as a template; do NOT subclass it.

    No fork override hooks today.
    """
    name = "info_keys"
    output_filename = "ktx-info-keys-ast.json"
    payload_field = "info_keys"

    # Single producer API. KTX has no Info_Set / Info_SetStar wrappers
    # (those are MVDSV-side); the SETUSERINFO_STAR flag is KTX's
    # producer signal.
    REGISTRATION_API: str = "SetUserInfo"

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        self._repo_root = ktx_repo
        self._src_root = ktx_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup key: (line, key_name) so distinct call sites at
        # the same line (rare) survive while the single-variant walk's
        # potential re-emission of the same site collapses.
        self._seen_sites_in_file: set[tuple[int, str]] = set()
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        if cursor.spelling != self.REGISTRATION_API:
            return

        args = list(cursor.get_arguments())
        if len(args) < 2:
            return

        # Require a literal-string second arg (the key name).
        key_name = literal_string(args[1], self.source_bytes)
        if not key_name:
            return
        # Producer-emission filter: KTX system keys start with '*'. Non-star
        # keys here are caller-controlled (Cmd_Argv-derived) payloads, not
        # KTX-defined system keys. Per spec 1.6.
        if not key_name.startswith("*"):
            return

        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        containing_fn = self._func_stack[-1] if self._func_stack else None

        site_key = (location.line, key_name)
        if site_key in self._seen_sites_in_file:
            return
        self._seen_sites_in_file.add(site_key)

        # Emit primitive row -- one per call site. Cross-worker aggregation
        # by bare_name happens in finalize.
        self._rows.append({
            "name": key_name,        # bare key for now; suffixed in finalize
            "scope": "userinfo",     # KTX writes are userinfo-only per spec 1.6
            "op": "write",
            "source_file": rel_file,
            "source_line": location.line,
            "containing_function": containing_fn,
        })

    def _relative_source(self, abs_path: str) -> str:
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_sites_in_file = set()
        self._func_stack = []
        return rows

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Approach B aggregation by bare_name. Pattern 14 suffix applied at
        # canonical-name emission time.
        aggregated: dict[str, dict] = {}
        for r in all_rows:
            bare = r["name"]
            site = {
                "source_file": r["source_file"],
                "source_line": r["source_line"],
                "operation": r["op"],
            }
            existing = aggregated.get(bare)
            if existing is None:
                aggregated[bare] = {
                    "name": f"{bare}:userinfo",   # Pattern 14 suffix per D7
                    "bare_name": bare,
                    "ast": {
                        "scope": "userinfo",
                        "operations": [r["op"]],
                        "source_file": r["source_file"],
                        "source_line": r["source_line"],
                        "containing_function": r["containing_function"],
                        "all_call_sites": [site],
                    },
                }
            else:
                ops = existing["ast"]["operations"]
                if r["op"] not in ops:
                    ops.append(r["op"])
                existing["ast"]["all_call_sites"].append(site)

        rows = list(aggregated.values())
        rows.sort(key=lambda r: r["name"])
        for r in rows:
            r["ast"]["operations"].sort()

        return {
            "info_keys": rows,
            "_stats": {
                "source_total_call_sites": len(all_rows),
                "count": len(rows),
                "by_scope": {"userinfo": len(rows)},
            },
        }
