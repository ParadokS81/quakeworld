"""Log templates handler for the KTX AST extractor.

Detects format-string call sites for KTX print emission and channel-
discriminates by API name:

  channel='broadcast' -> G_bprint(level, "fmt", ...)
  channel='client'    -> G_sprint(ent, level, "fmt", ...)
  channel='console'   -> G_cprint("fmt", ...)
  channel='logfile'   -> log_printf("fmt", ...)        # NEW channel per D5/F4

The 'logfile' channel value is admitted by migration 008 (Phase 1).
KTX is the first engine to emit channel='logfile' rows.

DUAL-ROW DESIGN (D10 + F17). Pass 1.7's printf-handler INTENTIONALLY
emits XML-shaped log_printf sites (e.g. log_printf("\\t\\t\\t<pickmi
time=...")) as channel='logfile' rows. Phase 6's _handler_match_events
.py (XSD-driven) emits a separate match_event_versions row for the same
emission sites. The duplication IS the design: per-site truth (printf
format string, file/line, channel) vs per-type truth (XSD attribute
schema, all sites). Do NOT add a filter to skip XML-shaped log_printfs.

Canonical entity name format: '<channel>:<format_string_normalized>'
where format_string_normalized strips the trailing newline. Same shape
as MVDSV's log_template handler. The same format string emitted via
different APIs becomes different entities (channel-discriminated), which
preserves per-channel distinction.

PER-FILE DEDUP. Per-file dedup on canonical name; cross-file aggregation
keyed by canonical name in finalize, with the first observation seeding
the top-level (containing_function, source_file, source_line) and EVERY
observation appended to all_call_sites (parity with MVDSV's Phase D
fanout convention).

MULTI-LINE STRING-LITERAL CONCAT. C lets you split a format string
across multiple adjacent quoted literals (e.g. log_printf("\\t\\t<event>\\n"
"foo\\n")). libclang's CALL_EXPR.get_arguments() returns ONE arg whose
extent covers both literals; the source extent reads as `"foo\\n"\n
"bar\\n"`. We accept the inter-literal whitespace noise in the
canonical name rather than try to merge adjacent literals -- the row is
still addressable, the format_string field preserves the raw source
form, and the cases are rare in KTX. Same convention as MVDSV.

ESCAPE PRESERVATION. Format strings stored in raw source form (\\n,
\\", \\\\ etc preserved as the C-source shows them). Consumers handle
interpretation. Mirrors MVDSV's escape-preservation contract per
SCHEMA.md log_template_versions section.

CROSS-CODEBASE PORT (D3). Inherits from Visitor only.
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
    """Strip trailing newline (canonical-name normalization). Strip leading
    /trailing whitespace as defensive measure. Mirrors MVDSV's
    _normalize_format exactly."""
    return s.rstrip("\n").strip()


class LogTemplatesKtxHandler(Visitor):
    """KTX log-templates handler (4-API format-string detection).

    Cross-codebase port (D3) -- inherits from Visitor only. Read MVDSV's
    _handler_log_templates.py as a template; do NOT subclass it.

    No fork override hooks today.
    """
    name = "log_templates"
    output_filename = "ktx-log-templates-ast.json"
    payload_field = "log_templates"

    # API spelling -> (channel, format_string_arg_index). CALL_EXPR cursor
    # spelling matches the function name exactly. Indices are zero-based
    # into the cursor's get_arguments() iterator.
    #
    # Channel value 'logfile' is the new value admitted by migration 008
    # (Phase 1) -- KTX is the first engine to use it.
    CHANNEL_TABLE: dict = {
        # broadcast: sent to all connected clients (KTX equivalent of
        # MVDSV's SV_BroadcastPrintf).
        "G_bprint":   ("broadcast", 1),  # (level, fmt, ...)
        # client: sent to one client.
        "G_sprint":   ("client",    2),  # (ent, level, fmt, ...)
        # console: server-console / log channel.
        "G_cprint":   ("console",   0),  # (fmt, ...)
        # logfile: KTX's extralog / match-event emission channel.
        # Includes XML-shaped emissions per F17 + D10 dual-row design.
        "log_printf": ("logfile",   0),  # (fmt, ...)
    }

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        self._repo_root = ktx_repo
        self._src_root = ktx_src

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        super().start_file(source_path=source_path, source_bytes=source_bytes)
        self._rows: list[dict] = []
        # Per-file dedup on canonical name. KTX is single-variant TU; this
        # collapses any cursor-traversal re-emission of the same call.
        self._seen_in_file: set[str] = set()
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
        # last) so they are captured. va() / identifier / ternary args
        # fail and get skipped.
        if not (text.startswith('"') and text.endswith('"')):
            return
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

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        # Cross-file aggregation by canonical name. Per-file dedup already
        # collapsed duplicate emissions in one walk. Across .c files the
        # first observation seeds the top-level fields for display
        # compatibility; EVERY observation accumulates into all_call_sites
        # so high-fanout templates retain the full set of sites (parity
        # with MVDSV's Phase D fanout convention).
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
                merged_ast = dict(ast)
                merged_ast["all_call_sites"] = [site]
                by_name[r["name"]] = {"name": r["name"], "ast": merged_ast}
                order.append(r["name"])
            else:
                merged = by_name[r["name"]]
                sites = merged["ast"]["all_call_sites"]
                key = (site["source_file"], site["source_line"])
                if not any((s["source_file"], s["source_line"]) == key for s in sites):
                    sites.append(site)

        unique = [by_name[n] for n in order]
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
