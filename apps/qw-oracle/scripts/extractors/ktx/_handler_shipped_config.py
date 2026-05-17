"""KTX shipped-config handler -- parse three .cfg files for D9 mechanical-extract seam.

D9 HARVEST-AND-STOP SEAM. This handler emits cvar descriptions, shipped values,
and structured_choices as DATA harvested from the config author's own comments.
It renders ZERO quality verdicts (no verdict / confidence / reasoning / affirm /
quality keys anywhere in its output). Verdict assignment is the loader's concern.

Why standalone / no Visitor: this handler parses .cfg text files, not C AST.
It does not use libclang and does not inherit from Visitor. The match_events
handler (ktx/_handler_match_events.py) establishes this same precedent for
non-AST-driven handlers that still need to participate in the driver's dispatch
loop. Duck-typed lifecycle stubs make the driver work without modification.

Why per-(cvar, source-file) records, never merged: three config files ship
with different defaults (e.g. k_short_gib=1 in example-configs vs =0 in
nquake-distfiles). Merging would silently discard the drift signal. The loader
(Task 2) decides which value wins; this handler only harvests (F-C2a / D9).
"""
from __future__ import annotations

import re
from pathlib import Path

# No Visitor import -- standalone per match_events precedent (spec 5.6.c shape).
# The driver calls setup() once, then duck-typed per-TU stubs, then finalize().

HANDLER_NAME = "shipped_config"
OUTPUT_FILENAME = "ktx-shipped-config-ast.json"

# Set-line regex. Matches after CR-strip (F-D9a). Handles:
#   - tab or space after 'set' (\s+ covers both)
#   - quoted values: "..." capturing inner + outer quotes as a token
#   - bare values: any non-whitespace token
#   - optional whitespace before //
#   - comment group is everything after "// " (may be empty string)
SET_RE = re.compile(
    r'^\s*set\s+(?P<name>\S+)\s+(?P<value>"[^"]*"|\S+)\s*//\s*(?P<comment>.*)$'
)

# Comment-only line: starts with optional whitespace then //
# Used to detect bitmask continuation lines that follow a set line whose
# comment ends with ':'. No 'set' keyword present.
COMMENT_ONLY_RE = re.compile(r'^\s*//')

# Inline enum: captures (digit = label) pairs inside a (...) parenthesised group.
# Applied to the comment text to extract structured_choices for inline enum values.
# Lookahead (?=[,)]|\s*\d+\s*=|$) terminates label before the next delimiter.
ENUM_PAIR_RE = re.compile(r'(\d+)\s*=\s*([^,()]+?)(?=[,)\s]*\d+\s*=|[,)]|$)')

# Bitmask continuation: captures digit=label pairs from a continuation line.
# Applied to the text AFTER stripping the leading '//'.
BITMASK_PAIR_RE = re.compile(r'(\d+)\s*=\s*([^,\s]+)')


def _strip_comment_prefix(line: str) -> str:
    """Return text after the leading '//' marker, stripped of extra whitespace."""
    idx = line.find("//")
    if idx == -1:
        return ""
    return line[idx + 2:].strip()


def _parse_inline_enum(comment: str) -> list[dict]:
    """Extract N=label pairs from inside a parenthesised group in the comment.

    Returns a flat list of {value, label} dicts or [] when no pairs found.
    Applied uniformly (no special-case for booleans) per D9 mechanical rule.
    """
    choices: list[dict] = []
    paren_m = re.search(r'\(([^)]+)\)', comment)
    if not paren_m:
        return choices
    inner = paren_m.group(1)
    for m in ENUM_PAIR_RE.finditer(inner):
        choices.append({"value": m.group(1), "label": m.group(2).strip()})
    return choices


def _parse_bitmask_continuation(continuation_text: str) -> list[dict]:
    """Extract N=label pairs from a bitmask continuation line's text.

    continuation_text is the text AFTER stripping the leading '//' marker.
    Returns a flat list of {value, label} dicts matching the same shape as
    _parse_inline_enum -- the loader sees a single flat structured_choices
    regardless of whether the source was inline-enum or bitmask-continuation.
    """
    choices: list[dict] = []
    for m in BITMASK_PAIR_RE.finditer(continuation_text):
        choices.append({"value": m.group(1), "label": m.group(2).strip()})
    return choices


def _parse_config(path: Path, source_file: str) -> list[dict]:
    """Parse one .cfg file and return a list of record dicts.

    F-D9a: CRLF strip. The in-repo ktx.cfg and nquake sv-configs ktx.cfg
    are CRLF; port_template.cfg is LF. Splitting on '\\n' then .rstrip('\\r')
    from every line before regex match ensures no silent \\r in values or
    raw_comment strings. Skipping this would embed \\r in every record --
    a defect the downstream JSONB probes do not catch.
    """
    raw = path.read_bytes().decode("utf-8", errors="replace")
    lines = [line.rstrip("\r") for line in raw.split("\n")]

    records: list[dict] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        line_no = i + 1  # 1-indexed

        m = SET_RE.match(line)
        if m:
            name = m.group("name")
            value = m.group("value")
            comment = m.group("comment").strip()

            # Bitmask continuation: comment ends with ':' means the NEXT
            # comment-only line carries the table of N=label pairs.
            # Absorb exactly one such continuation line per the live config
            # layout (all four verified bitmask blocks have exactly one
            # continuation line). spec: "absorb each immediately-following
            # line that is comment-only ... until a line that is blank, a set
            # line, or any non-// line".
            choices: list[dict] = []
            if comment.endswith(":"):
                next_i = i + 1
                # Absorb all consecutive comment-only lines (spec says until
                # blank / set / non-// line). In practice all verified cases
                # have exactly one, but absorbing the loop is more robust.
                while next_i < len(lines):
                    next_line = lines[next_i].rstrip("\r")
                    if not next_line.strip():
                        break  # blank line terminates continuation
                    if SET_RE.match(next_line):
                        break  # set line terminates continuation
                    if COMMENT_ONLY_RE.match(next_line):
                        cont_text = _strip_comment_prefix(next_line)
                        choices.extend(_parse_bitmask_continuation(cont_text))
                        next_i += 1
                        continue
                    break  # non-// non-blank terminates continuation
                # Do NOT advance i here; continuation lines are consumed by
                # updating next_i but i stays on the set line. The outer loop
                # increments i by 1 from the set line; continuations are
                # effectively skipped because they match COMMENT_ONLY_RE and
                # are not set lines, so they produce no records.
            else:
                # Inline enum: parse (N = label, ...) group from the comment.
                choices = _parse_inline_enum(comment)

            record: dict = {
                "name": name,
                "source_file": source_file,
                "source_line": line_no,
                "shipped_value": value,
                "raw_comment": comment,
            }
            # Why omit structured_choices when empty: the live Phase-1 type is
            # optional (ProvenanceEntry.structured_choices?: Array<...>). An
            # absent key is the correct representation for bare cvars with no
            # enum table; emitting [] would add noise and break byte-identity
            # for downstream probes that check key presence.
            if choices:
                record["structured_choices"] = choices

            records.append(record)

        i += 1

    return records


class KtxShippedConfigHandler:
    """KTX shipped-config parser handler (text-driven, standalone).

    Does NOT inherit from Visitor per the match_events precedent (spec 5.6.c
    shape). Implements all Visitor lifecycle methods as duck-typed no-op stubs
    so extract.py's per-handler dispatch loop works without modification.

    Class attributes mirror Visitor convention so the driver can read
    handler.name and handler.output_filename without isinstance checks.

    D9 SEAM: this handler harvests and stops. It emits raw parsed data only.
    No verdict / confidence / reasoning / affirm / quality keys are emitted
    anywhere in the output. Those fields are the loader's concern (Task 2).
    """

    name = HANDLER_NAME
    output_filename = OUTPUT_FILENAME

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        """One-time init: resolve the three config paths and parse them.

        ktx_src is accepted for driver signature compatibility but is not used --
        all three config files are derived from ktx_repo.

        The three source files and their monorepo-root-relative POSIX paths are
        the D9 input boundary. source_file strings are computed as
        path.relative_to(ktx_repo.parents[2]).as_posix() for byte-identity
        across runs. No other files are read.
        """
        # Derive monorepo root from ktx_repo (ktx_repo is 3 levels deep:
        # <monorepo>/research/repos/ktx, so parents[2] = monorepo root).
        monorepo_root = ktx_repo.parents[2]

        # The three config paths (D9 boundary -- ONLY these three).
        config_specs = [
            ktx_repo / "resources/example-configs/ktx/ktx.cfg",
            ktx_repo.parent / "nquake-distfiles/sv-configs/ktx/ktx.cfg",
            ktx_repo.parent / "nquake-distfiles/sv-gpl/ktx/port_template.cfg",
        ]

        self._records: list[dict] = []
        self._files_parsed: list[str] = []
        self._by_source_file: dict[str, int] = {}

        for cfg_path in config_specs:
            # Compute source_file as monorepo-root-relative POSIX string EXACTLY.
            # Phase 1 stored 'research/repos/ktx/resources/example-configs/ktx/ktx.cfg';
            # this derivation reproduces that byte-identity.
            source_file = cfg_path.relative_to(monorepo_root).as_posix()
            self._files_parsed.append(source_file)
            records = _parse_config(cfg_path, source_file)
            self._records.extend(records)
            self._by_source_file[source_file] = len(records)

        # Deterministic ordering by (source_file, source_line) for byte-stable
        # output across runs (C4 / P3 idempotency). No timestamps, no run-ids,
        # no absolute paths in the JSON.
        self._records.sort(key=lambda r: (r["source_file"], r["source_line"]))

    # -------------------------------------------------------------------------
    # Duck-typed Visitor lifecycle stubs. All actual extraction runs in setup()
    # and finalize(). The per-TU stubs are no-ops, matching the match_events
    # precedent for non-AST-driven handlers.
    # -------------------------------------------------------------------------

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        # Config-text handler; no per-TU work. Stub for driver compatibility.
        pass

    def enter_function(self, cursor, variant: str) -> None:
        # Config-text handler; no per-function work. Stub for driver compatibility.
        pass

    def exit_function(self, cursor, variant: str) -> None:
        # Config-text handler; no per-function work. Stub for driver compatibility.
        pass

    def enter_compound(self, cursor, variant: str) -> None:
        # Config-text handler; no per-compound work. Stub for driver compatibility.
        pass

    def exit_compound(self, cursor, variant: str) -> None:
        # Config-text handler; no per-compound work. Stub for driver compatibility.
        pass

    def visit_cursor(self, cursor, variant: str) -> None:
        # Config-text handler; no per-cursor work. Stub for driver compatibility.
        pass

    def end_file(self) -> list[dict]:
        # Config-text handler emits no per-TU rows; all records live in
        # self._records assembled during setup() and returned by finalize().
        return []

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        """Return the parsed output dict.

        all_rows is ignored (end_file() returns [] for this handler; per-TU
        rows are not applicable). All data lives in self._records from setup().

        unresolved is always an empty list: this handler has no DB access and
        cannot determine which cvar names resolve to live KTX cvars. The loader
        (Task 2, which has DB access) makes the final resolve/unresolved split.
        Keeping the key present (empty list) stabilises the output shape for
        downstream tooling.
        """
        return {
            "records": self._records,
            "unresolved": [],
            "_stats": {
                "by_source_file": self._by_source_file,
                "record_count": len(self._records),
                "files_parsed": self._files_parsed,
            },
        }
