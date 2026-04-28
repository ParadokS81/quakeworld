"""Log templates handler for the MVDSV AST extractor.

Detects format-string call sites for server-side log emission and channel-
discriminates by API name:

  channel='broadcast' -> SV_BroadcastPrintf(level, "fmt", ...)
                         SV_BroadcastPrintfEx(level, flags, "fmt", ...)
                         SV_BroadcastCommand("fmt", ...)
  channel='client'    -> SV_ClientPrintf(cl, level, "fmt", ...)
  channel='console'   -> Con_Printf("fmt", ...)
  channel='system'    -> Sys_Printf("fmt", ...)

Note: SV_BroadcastTPrintf and SV_ClientTPrintf do NOT exist in MVDSV
(verified by Task 1's pass-1 inventory). The plan spec listed them; they're
absent here. Likewise SV_ClientPrintf2 exists (~14 sites) but is intentionally
out of scope -- the channel table lists the canonical APIs only.

Canonical entity name format: '<channel>:<format_string_normalized>' where
format_string_normalized strips the trailing newline so a format like
'%s entered the game\\n' is addressable as 'broadcast:%s entered the game'.
The same format string emitted via different APIs becomes different entities
(channel-discriminated), which preserves per-channel distinction.

Per-call-site dedup: per-file dedup on canonical name; cross-file aggregation
is keyed by canonical name in finalize, with the first observation seeding
the top-level (containing_function, source_file, source_line) and EVERY
observation appended to `all_call_sites` so high-fanout templates retain the
full registration set (Phase D Task 10, parity with info_key.all_call_sites).
The pre-Phase-D handler kept only the first call site, dropping fanout data
that the schema is now wide enough to hold.

Multi-line string-literal concatenation: C lets you split a format string
across multiple adjacent quoted literals (e.g. SV_BroadcastCommand("foo\\n"
"bar\\n")). libclang's CALL_EXPR.get_arguments() returns ONE arg whose extent
covers both literals, so the source extent reads as `"foo\\n"\n  "bar\\n"`.
That happens to start and end with `"` so the simple quote-bracket check
passes; the outer-quote strip yields a canonical name with the inter-literal
`"  "` whitespace embedded. We accept that noise rather than try to merge
adjacent literals -- the row is still addressable, the format_string field
preserves the raw source form, and the cases are rare in MVDSV.

String escapes inside the format string (e.g. \\n, %s, %d) are kept in their
raw source-code form. Consumers handle interpretation.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from clang.cindex import CursorKind

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from extractor_lib._visitor import Visitor  # noqa: E402
from extractor_lib._source import read_extent  # noqa: E402


def _normalize_format(s: str) -> str:
    """Strip trailing newline (the canonical-name normalization). Also strips
    leading/trailing whitespace as a defensive measure -- format strings in
    practice don't have whitespace padding outside the quotes, but the rstrip
    happens before the strip so canonical names stay tight."""
    return s.rstrip("\n").strip()


class LogTemplatesMvdsvHandler(Visitor):
    """MVDSV log-templates handler (format-string call-site detection).

    Target consumer fork: antilag-mvdsv. A fork that adds new logging
    primitives (e.g. an antilag-specific replay-event channel) needs the
    CHANNEL_TABLE override to surface them.

    Fork override hooks:
      - CHANNEL_TABLE: dict mapping API spelling -> (channel,
        format_string_arg_index). Override at the class level to add
        fork-specific log primitives.
      - visit_cursor: dispatches CHANNEL_TABLE entries; extracts the
        format-string literal at the indicated argument index. Override
        to handle non-literal format strings (Pattern 2).
      - finalize: cross-file aggregation by canonical name with
        all_call_sites fanout. Override to alter the canonical-name
        normalization (e.g. preserve trailing newlines).
      - _normalize_format (module-level): canonical-name normalisation
        rule. Strips trailing newline + outer whitespace. Override only
        if the fork requires a different normalization policy.
    """
    name = "log_templates"
    output_filename = "mvdsv-log-templates-ast.json"
    payload_field = "log_templates"

    # API spelling -> (channel, format_string_arg_index). CALL_EXPR cursor
    # spelling matches the function name exactly. Indices are zero-based
    # into the cursor's get_arguments() iterator. Subclasses extend to add
    # fork-specific log primitives.
    CHANNEL_TABLE: dict = {
        # broadcast: sent to all clients
        "SV_BroadcastPrintf":   ("broadcast", 1),  # (level, fmt, ...)
        "SV_BroadcastPrintfEx": ("broadcast", 2),  # (level, flags, fmt, ...)
        "SV_BroadcastCommand":  ("broadcast", 0),  # (fmt, ...)
        # client: sent to one client
        "SV_ClientPrintf":      ("client", 2),     # (cl, level, fmt, ...)
        # server-side log
        "Con_Printf":           ("console", 0),    # (fmt, ...)
        "Sys_Printf":           ("system", 0),     # (fmt, ...)
    }

    def setup(self, *, mvdsv_repo: Path, mvdsv_src: Path) -> None:
        self._repo_root = mvdsv_repo
        self._src_root = mvdsv_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup on canonical name. Each call site is visited 3x
        # because the walker dispatches once per platform variant (server-base
        # / win / linux); same idiom as the other MVDSV handlers.
        self._seen_in_file: set[str] = set()
        self._func_stack: list[str] = []

    def enter_function(self, cursor, variant: str) -> None:
        self._func_stack.append(cursor.spelling or "?")

    def exit_function(self, cursor, variant: str) -> None:
        if self._func_stack:
            self._func_stack.pop()

    # Fork override hook: extend CHANNEL_TABLE dispatch or non-literal-fmt recovery
    def visit_cursor(self, cursor, variant: str) -> None:
        if cursor.kind != CursorKind.CALL_EXPR:
            return
        spelling = cursor.spelling
        cfg = self.CHANNEL_TABLE.get(spelling)
        if cfg is None:
            return
        channel, fmt_idx = cfg

        args = list(cursor.get_arguments())
        if len(args) <= fmt_idx:
            return

        text = read_extent(self.source_bytes, args[fmt_idx].extent).strip()
        # Bare literal-string check. Concatenated literals like
        # ("foo " "bar") DO pass this check (text starts with the opening
        # `"` of the first literal and ends with the closing `"` of the
        # last) so they are captured -- the canonical name embeds the
        # inter-literal `"  "` whitespace as noise. Only call sites whose
        # format-string arg is not a bare quoted literal (e.g. a `va()`
        # call, an identifier, a ternary) fail the check and get skipped.
        if not (text.startswith('"') and text.endswith('"')):
            return
        # Strip outer quotes only -- keep escape sequences as raw source form.
        format_string = text[1:-1]
        if not format_string:
            return

        normalized = _normalize_format(format_string)
        if not normalized:
            return
        canonical = f"{channel}:{normalized}"
        if canonical in self._seen_in_file:
            return

        location = cursor.location
        rel_file = self._relative_source(location.file.name) if location.file else None
        containing_fn = self._func_stack[-1] if self._func_stack else None

        self._rows.append({
            "name": canonical,
            "ast": {
                "channel": channel,
                "format_string": format_string,
                "format_string_normalized": normalized,
                "source_file": rel_file,
                "source_line": location.line,
                "containing_function": containing_fn,
            },
        })
        self._seen_in_file.add(canonical)

    def _relative_source(self, abs_path: str) -> str:
        """Make source_file repo-relative; fall back to absolute if outside."""
        try:
            return str(Path(abs_path).resolve().relative_to(self._repo_root.resolve()))
        except ValueError:
            return abs_path

    def end_file(self) -> list[dict]:
        rows = self._rows
        self._rows = []
        self._seen_in_file = set()
        self._func_stack = []
        return rows

    # Fork override hook: alter cross-file aggregation or canonical-name normalization
    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Cross-file aggregation by canonical name. Per-file dedup already
        # collapsed the 3-variant emission inside one walk. Across .c files
        # the first observation seeds the top-level fields (containing_function
        # / source_file / source_line) for display compatibility; EVERY
        # observation accumulates into all_call_sites so high-fanout templates
        # (e.g. broadcast disconnects fired from many code paths) retain the
        # full set of registration sites. Phase D Task 10 introduced this
        # aggregation; pre-Phase-D the handler emitted only the first site.
        by_name: dict[str, dict] = {}
        order: list[str] = []
        for r in all_rows:
            ast = r["ast"]
            site = {
                "source_file": ast.get("source_file"),
                "source_line": ast.get("source_line"),
                "containing_function": ast.get("containing_function"),
            }
            if r["name"] not in by_name:
                # Seed the entry with a fresh AST block (so we don't mutate
                # the row we got from the worker) and start the call-site
                # list with the first observation.
                merged_ast = dict(ast)
                merged_ast["all_call_sites"] = [site]
                by_name[r["name"]] = {"name": r["name"], "ast": merged_ast}
                order.append(r["name"])
            else:
                merged = by_name[r["name"]]
                # Skip duplicate sites (same file+line) so re-emissions
                # caused by include-graph quirks don't inflate the list.
                sites = merged["ast"]["all_call_sites"]
                key = (site["source_file"], site["source_line"])
                if not any((s["source_file"], s["source_line"]) == key for s in sites):
                    sites.append(site)

        unique = [by_name[n] for n in order]
        # Sort by (channel, name) for deterministic output.
        unique.sort(key=lambda r: (r["ast"]["channel"], r["name"]))

        by_channel: dict[str, int] = {}
        total_call_sites = 0
        for r in unique:
            ch = r["ast"]["channel"]
            by_channel[ch] = by_channel.get(ch, 0) + 1
            total_call_sites += len(r["ast"].get("all_call_sites") or [])

        return {
            "log_templates": unique,
            "_stats": {
                "source_total": len(all_rows),
                "count": len(unique),
                "by_channel": by_channel,
                "total_call_sites": total_call_sites,
            },
        }
