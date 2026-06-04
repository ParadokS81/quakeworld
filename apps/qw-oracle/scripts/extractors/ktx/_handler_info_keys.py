"""Info keys handler for the KTX AST extractor.

Detects userinfo key writes (producer side) AND reads (consumer side) via
KTX's userinfo C APIs. Three APIs are recognised; each call site contributes
one operation (read/write) on a key_name.

API -> operation map:

  Writes (producer side -- KTX-defined star keys via SETUSERINFO_STAR)
    SetUserInfo(ent, "*KEY", value, SETUSERINFO_STAR)
  Reads (consumer side -- KTX interprets the value)
    ezinfokey(ent, "key")        string-typed read
    iKey(ent, "key")             int-typed read (e.g. for bitmask interpretation)
    infokey(ent, "key", buf, n)  string read into a caller-supplied buffer

Scope is derived from the FIRST argument (the read entity): a read on the
`world` entity targets the global serverinfo string (scope='serverinfo'); a
read on any other (client) entity targets that client's userinfo
(scope='userinfo'). KTX has no localinfo reads. See `_classify_scope`.

ALL-SITES EMISSION (supersedes spec 1.6 producer-only rule, 2026-05-27).
The prior "producer-only" rule (only emit SetUserInfo writes with
star-prefixed keys) created a documentation gap: keys KTX interprets but
does not write -- e.g. `kf`, `k_nick`, `postmsg`, `premsg`, `k_sdir`, `k`
-- never surfaced as L1 entities, leaving downstream v2 drafts for the
consuming commands (`killer` / `victim` / `newcomer`) referencing them via
See-also lines that pointed at non-existent rows. The rewrite aligns with
MVDSV's existing `_handler_info_keys.py` convention: emit every literal
call site, tag operations per site, let the description layer carry
semantic ownership. Full rationale at
`docs/superpowers/parking/2026-05-27-ktx-userinfo-consumer-handler-design-decision.md`.

Semantic-ownership note: not every emitted entity is KTX-defined. Cross-
engine keys (e.g. `bottomcolor`, `topcolor`, `rate`) surface here as read-
only entities but their semantics belong to ezQuake CVAR_USERINFO or the
QW protocol. The L1 row is a flat inventory; the entity-level description
text resolves ownership ("read by KTX; defined by <other engine>" pointer
descriptions for cross-engine reads).

CANONICAL NAME (D7 Pattern 14). Suffix `<bare>:<scope>` so the entity
table's UNIQUE(project, type, name) constraint cleanly disambiguates a key
read both as serverinfo (via `world`) and userinfo (via a client entity).
Mirrors MVDSV's existing suffixing convention. Bare name preserved at the
top-level `bare_name` field for MCP lookup_entity prefix-fallback.

KTX OUT OF SCOPE FOR THIS HANDLER:
  - Call sites whose key (second arg) is NOT a literal string -- runtime-
    resolved keys (e.g. the `va("%d", n)` team-slot reads, Cmd_Argv-derived
    keys) are out of scope, same as MVDSV's Pattern 1 detection. Pattern 2
    (data-flow back through caller chain) is not implemented.

CROSS-WORKER AGGREGATION (Approach B, mirrors MVDSV info_keys). Forked
workers each accumulate per-file primitive rows from end_file. Aggregation
by bare_name happens once in finalize in the parent, after worker results
merge.

Output entity shape (one row per unique bare_name). Example for a key
with mixed read/write call sites (none observed today, but the shape is
union-stable):

    {
      "name": "kf:userinfo",
      "bare_name": "kf",
      "ast": {
        "scope": "userinfo",
        "operations": ["read"],
        "source_file": "src/client.c",  # first-seen anchor
        "source_line": 711,
        "containing_function": "PlayerPreThink",
        "all_call_sites": [
          {"source_file": "src/client.c", "source_line": 711, "operation": "read"},
          {"source_file": "src/client.c", "source_line": 4582, "operation": "read"},
          {"source_file": "src/g_utils.c", "source_line": 2420, "operation": "read"},
          {"source_file": "src/commands.c", "source_line": 3385, "operation": "read"},
          {"source_file": "src/commands.c", "source_line": 6624, "operation": "read"}
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
from extractor_lib._source import literal_string, read_extent  # noqa: E402


def _classify_scope(first_arg_text: str) -> str:
    """KTX scope rule: a read on the `world` entity targets the global
    serverinfo string; a read on any other (client) entity targets that
    client's userinfo. KTX has no localinfo reads.

    Mirrors MVDSV's `_classify_scope` in intent (first-arg shape decides
    scope) but uses KTX's entity-based idiom (`ezinfokey(world, ...)` vs
    `ezinfokey(self, ...)`) rather than MVDSV's string-buffer idiom
    (`svs.info` vs `cl->userinfo`)."""
    return "serverinfo" if first_arg_text.strip() == "world" else "userinfo"


class InfoKeysKtxHandler(Visitor):
    """KTX info-keys handler (all-sites emission with operation tagging).

    Cross-codebase port (D3) -- inherits from Visitor only. Read MVDSV's
    _handler_info_keys.py as a template; do NOT subclass it.

    No fork override hooks today.
    """
    name = "info_keys"
    output_filename = "ktx-info-keys-ast.json"
    payload_field = "info_keys"

    # Three KTX userinfo APIs: one write (producer), two read (consumer).
    # Writes are star-key-only by KTX convention; reads target any key
    # whose value KTX interprets. KTX has no Info_Set / Info_SetStar
    # wrappers (those are MVDSV-side).
    API_OP_MAP: dict = {
        "SetUserInfo":  "write",
        "ezinfokey":    "read",
        "iKey":         "read",
        "infokey":      "read",
    }

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        self._repo_root = ktx_repo
        self._src_root = ktx_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup: key by (line, key_name, op) so distinct call
        # sites at the same line (rare but possible) survive while the
        # walker's potential re-emission of the same site collapses.
        self._seen_sites_in_file: set[tuple[int, str, str, str]] = set()
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        spelling = cursor.spelling
        if spelling not in self.API_OP_MAP:
            return

        args = list(cursor.get_arguments())
        if len(args) < 2:
            return

        # Require a literal-string second arg (the key name).
        key_name = literal_string(args[1], self.source_bytes)
        if not key_name:
            return

        # Scope from the first arg (the read entity): a `world` read targets
        # serverinfo; any other entity targets that client's userinfo.
        first_text = read_extent(self.source_bytes, args[0].extent)
        scope = _classify_scope(first_text)

        op = self.API_OP_MAP[spelling]
        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        containing_fn = self._func_stack[-1] if self._func_stack else None

        site_key = (location.line, key_name, scope, op)
        if site_key in self._seen_sites_in_file:
            return
        self._seen_sites_in_file.add(site_key)

        # Emit primitive row -- one per call site. Cross-worker aggregation
        # by (bare_name, scope) happens in finalize.
        self._rows.append({
            "name": key_name,        # bare key for now; suffixed in finalize
            "scope": scope,
            "op": op,
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
        # Approach B aggregation by (bare_name, scope) -- mirrors MVDSV so a
        # key read on both `world` (serverinfo) and a client entity (userinfo)
        # survives as two entities under UNIQUE(project, type, name). Pattern
        # 14 suffix is `<bare>:<scope>`. Operations union across all sites.
        aggregated: dict[tuple[str, str], dict] = {}
        for r in all_rows:
            agg_key = (r["name"], r["scope"])
            site = {
                "source_file": r["source_file"],
                "source_line": r["source_line"],
                "operation": r["op"],
            }
            existing = aggregated.get(agg_key)
            if existing is None:
                aggregated[agg_key] = {
                    "name": f"{r['name']}:{r['scope']}",   # Pattern 14 suffix per D7
                    "bare_name": r["name"],
                    "ast": {
                        "scope": r["scope"],
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
        rows.sort(key=lambda r: (r["ast"]["scope"], r["name"]))
        for r in rows:
            r["ast"]["operations"].sort()

        by_scope: dict[str, int] = {}
        for r in rows:
            sc = r["ast"]["scope"]
            by_scope[sc] = by_scope.get(sc, 0) + 1

        by_ops: dict[str, int] = {}
        for r in rows:
            ops_key = ",".join(r["ast"]["operations"])
            by_ops[ops_key] = by_ops.get(ops_key, 0) + 1

        return {
            "info_keys": rows,
            "_stats": {
                "source_total_call_sites": len(all_rows),
                "count": len(rows),
                "by_scope": by_scope,
                "by_ops": by_ops,
            },
        }
