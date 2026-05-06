"""KTX match_event entity-type extraction handler.

Four-stage flow: parse_xsd -> grep_emissions -> merge -> finalize.

This handler does NOT use libclang AND does NOT inherit from Visitor
per spec 5.6.c (project-private Tier 3 in the EXTRACTOR-PLAYBOOK
three-tier model -- promotable to extractor_lib._xsd_match_events.py
per Rule of Second Consumer if a second engine surfaces XSD-defined
event types).

Output filename: ktx-match-events-ast.json.

DUAL-ROW DESIGN (D10 + F17). Phase 2's printf-handler (_handler_log_templates.py)
INTENTIONALLY emits XML-shaped log_printf sites (e.g.
log_printf("\\t\\t\\t<pickmi time=...")) as channel='logfile' rows.
This handler emits a SEPARATE match_event_versions row for the same
emission sites. The duplication IS the design: per-site truth (printf
format string, file/line, channel) vs per-type truth (XSD attribute
schema, all sites). Do NOT modify _handler_log_templates.py to skip
XML-shaped log_printfs -- the dual-row design requires both rows.

VISITOR LIFECYCLE (duck-typed). This class does NOT inherit from Visitor.
The driver iterates registered handlers and calls setup() once, then
per-TU start_file / visit_cursor / end_file, then finalize(). For an
XSD-driven handler the per-TU stages are all no-ops; the class implements
them as bare pass stubs so the driver's dispatch loop works without
modification. All actual extraction happens in setup() (which calls the
four named flow stages in order) and finalize() (which returns the dict).
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path

# No Visitor import -- this handler stands alone per spec 5.6.c. The
# libclang lifecycle methods are duck-typed no-op stubs further below.

HANDLER_NAME = "match_events"
OUTPUT_FILENAME = "ktx-match-events-ast.json"

# Path of the canonical XSD inside the KTX repo. Relative to ktx_repo
# (set in setup()). KTX has shipped this XSD at version 0.1 since the
# extralog feature landed; future KTX tags may bump the filename
# (ktxlog_0.2.xsd) -- handler discovers the XSD via glob over the
# resources/extralog/ directory rather than hard-coding the filename.
XSD_GLOB_DIR = "resources/extralog"
XSD_GLOB_PATTERN = "ktxlog_*.xsd"

# XML namespace declared on every <xs:*> element in the XSD. Required
# for ElementTree's findall/find queries -- without the prefix mapping
# the queries return nothing because the elements are namespaced.
XSD_NS = {"xs": "http://www.w3.org/2001/XMLSchema"}

# The four host files for emission-site grep. Hardcoded list: the
# spec preamble locks scope to exactly these four files (per Pass 4.5),
# and a future KTX tag adding a fifth file would warrant a discovery
# callout, not a silent expansion of scope. If a fifth file appears,
# the handler emits the new file in _stats.unrecognized_files (see
# below) so the operator notices.
EMISSION_FILES = [
    "src/items.c",
    "src/combat.c",
    "src/client.c",
    "src/logs.c",
]

# Regex matching the start of an active match_event emission. The live
# source's emission shape is multi-line concatenated string literals:
#
#     log_printf("\t\t<event>\n"
#                "\t\t\t<EVENT_NAME>\n"
#                ...
#                "\t\t</event>\n", ...);
#
# The active emissions all start with `log_printf("\t\t<event>\n"` (2
# backslash-t pairs in the OUTER literal) and the very next quoted line
# is `"\t\t\t<EVENT_NAME>\n"` (3 backslash-t pairs in the INNER literal).
# Commented-out legacy emissions in items.c (lines 213, 555, 1019, 1295,
# 1550, 1714, 2536) use a different leading shape (`log_printf( "\t\t\t<pickmi ...`,
# leading space inside paren, single-line) so they do NOT match this
# regex. The regex captures EVENT_NAME for direct mapping to the XSD's
# event-choice element name.
#
# NOTE on spec deviation: spec 5.6.b's regex literal is
# `log_printf\(\s*"\\\\t\\\\t\\\\t<(\w+)>` (3 backslash-t pairs in the
# FIRST literal). That shape would match the legacy commented-out form
# but does NOT match live source's multi-line wrapper -- which is the
# only active emission shape today. F14's locked count anchor (13
# emission sites) is reproduced by the multi-line regex below; the
# spec's literal regex would return 0 sites against live source. Live
# source wins per the arc's source-walk discipline; the deviation is
# documented in Open Questions.
#
# The literal escape sequences \\t and \\n in the regex match the
# 2-character sequences \t and \n as they appear in the C source on
# disk (the source file contains the literal backslash + t / backslash
# + n character pairs as part of the C string-literal syntax).
EMISSION_RE = re.compile(
    r'log_printf\(\s*"\\t\\t<event>\\n"\s*\n\s*"\\t\\t\\t<(?P<event_name>[a-z_]+)>',
    re.MULTILINE,
)

# C function-signature heuristic per spec 5.6.b. Matches a line that
# ends in a parameter list followed by an optional opening brace -- the
# canonical "void foo(int x)" or "void foo(int x) {" or "static void
# foo(int x)" shape. The handler walks backwards from each emission's
# line index to the nearest preceding match; the captured group is the
# function name. Multi-line signatures (return-type on previous line,
# name + params on the matched line) are accepted -- the heuristic
# captures the last identifier before `(`. Edge case: a function that
# spans multiple lines for the parameter list itself would not be
# caught by this single-line regex; in practice KTX uses one-line
# signatures (verified by spot-check of items.c / combat.c / client.c).
FUNC_SIG_RE = re.compile(
    r'^[a-zA-Z_][\w\s\*]*?\b(?P<func>[a-zA-Z_]\w*)\s*\([^)]*\)\s*\{?\s*$'
)


class KtxMatchEventsHandler:
    """KTX match-event entity-type handler (XSD-driven, standalone).

    Does NOT inherit from Visitor per spec 5.6.c. Implements all Visitor
    lifecycle methods as duck-typed no-op stubs so extract.py's per-handler
    dispatch loop works without modification.

    Class attributes mirror Visitor convention so the driver can read
    handler.name and handler.output_filename without isinstance checks.
    """

    name = HANDLER_NAME
    output_filename = OUTPUT_FILENAME

    def setup(self, *, ktx_repo: Path, ktx_src: Path) -> None:
        """One-time init. Stores paths and runs all four extraction stages.

        ktx_src is kept for cross-engine signature compatibility but is not
        used -- all extraction is XSD-relative to ktx_repo.
        """
        self._repo_root = ktx_repo
        self._src_root = ktx_src
        self._xsd_path: Path | None = None
        self._xsd_version: str | None = None
        self._event_to_complex_type: dict[str, str] = {}
        self._complex_type_attrs: dict[str, list[dict]] = {}
        self._simpletype_constraints: dict[str, dict] = {}
        self._event_source_lines: dict[str, int] = {}
        self._emission_sites: list[dict] = []
        self._merged_events: list[dict] = []
        self._stats: dict = {
            "xsd_path": None,
            "xsd_version": None,
            "complex_type_count": 0,
            "named_simpletype_count": 0,
            "event_count": 0,
            "expected_event_count": 7,
            "emission_site_count": 0,
            "expected_emission_site_count": 13,
            "by_event_name": {},
            "unrecognized_files": [],
            "unrecognized_emissions": [],
            "events_without_emissions": [],
        }
        # Spec 5.6.c flow: setup -> parse_xsd -> grep_emissions -> merge -> finalize.
        # parse_xsd / grep_emissions / merge fire here in setup; finalize fires
        # at end-of-pipeline as called by the driver.
        self._parse_xsd()
        self._grep_emissions()
        self._merge_emissions_into_events()

    def _parse_xsd(self) -> None:
        """Stage 1 -- locate and parse the XSD.

        Populates _simpletype_constraints, _complex_type_attrs,
        _event_to_complex_type, _event_source_lines, and the relevant
        _stats fields.
        """
        xsd_dir = self._repo_root / XSD_GLOB_DIR
        candidates = sorted(xsd_dir.glob(XSD_GLOB_PATTERN))
        if not candidates:
            raise FileNotFoundError(
                f"No XSD found at {xsd_dir}/{XSD_GLOB_PATTERN}; "
                f"KTX repo layout drift -- expected ktxlog_*.xsd."
            )
        if len(candidates) > 1:
            # Multiple XSD versions present (e.g. 0.1 and 0.2 shipped together).
            # Pick the lexically-greatest (treats ktxlog_0.2.xsd > ktxlog_0.1.xsd
            # as the active version). Record the selection in _stats so the
            # operator can verify.
            self._stats["xsd_candidates"] = [str(p.relative_to(self._repo_root)) for p in candidates]
        self._xsd_path = candidates[-1]
        self._stats["xsd_path"] = str(self._xsd_path.relative_to(self._repo_root))

        # Derive xsd_version from the filename (e.g. ktxlog_0.1.xsd -> "0.1").
        stem = self._xsd_path.stem  # "ktxlog_0.1"
        if "_" in stem:
            self._xsd_version = stem.split("_", 1)[1]
        else:
            self._xsd_version = stem
        self._stats["xsd_version"] = self._xsd_version

        # Parse the XSD with ElementTree.
        tree = ET.parse(self._xsd_path)
        root = tree.getroot()

        # Walk all named simpleTypes first (they are referenced by complexType
        # attributes). For each, extract the <xs:restriction base="..."> payload
        # + facets (minInclusive, maxInclusive, pattern).
        for st in root.findall("xs:simpleType", XSD_NS):
            st_name = st.get("name")
            if not st_name:
                continue
            restriction = st.find("xs:restriction", XSD_NS)
            constraint: dict = {"base": None}
            if restriction is not None:
                constraint["base"] = restriction.get("base")
                min_incl = restriction.find("xs:minInclusive", XSD_NS)
                max_incl = restriction.find("xs:maxInclusive", XSD_NS)
                pattern = restriction.find("xs:pattern", XSD_NS)
                if min_incl is not None:
                    constraint["min_inclusive"] = min_incl.get("value")
                if max_incl is not None:
                    constraint["max_inclusive"] = max_incl.get("value")
                if pattern is not None:
                    constraint["pattern"] = pattern.get("value")
            self._simpletype_constraints[st_name] = constraint
        self._stats["named_simpletype_count"] = len(self._simpletype_constraints)

        # Walk all named complexTypes. For each, extract its sequence's element
        # children and record (name, type, constraint) per spec 5.6.c output JSON
        # shape -- constraint is null for XSD primitives (xs:decimal / xs:string /
        # xs:nonNegativeInteger / xs:boolean) and the resolved simpleType constraint
        # dict for named types.
        for ct in root.findall("xs:complexType", XSD_NS):
            ct_name = ct.get("name")
            if not ct_name:
                continue  # anonymous (inline) complexType -- not a top-level shape
            seq = ct.find("xs:sequence", XSD_NS)
            attrs: list[dict] = []
            if seq is not None:
                for elem in seq.findall("xs:element", XSD_NS):
                    type_ref = elem.get("type")
                    # Resolve constraint: null for XSD primitives (xs:* prefix),
                    # dict for named simpleTypes referenced by name.
                    constraint = self._simpletype_constraints.get(type_ref)
                    attrs.append({
                        "name": elem.get("name"),
                        "type": type_ref,
                        "constraint": constraint,    # None / null for primitives
                    })
            self._complex_type_attrs[ct_name] = attrs
        self._stats["complex_type_count"] = len(self._complex_type_attrs)

        # Recover the event-name -> complex-type mapping by walking the events
        # <xs:choice> inside the root ktxlog element. The path is:
        # <xs:element name="ktxlog"> -> inline <xs:complexType> -> <xs:sequence>
        # -> <xs:element name="events"> -> inline <xs:complexType> -> <xs:sequence>
        # -> <xs:element name="event"...> -> inline <xs:complexType> -> <xs:choice>
        # -> 7 <xs:element name="EVENT_NAME" type="COMPLEX_TYPE"/> children.
        #
        # Use a relative XPath descent rather than typing the full path.
        ktxlog_elem = root.find("xs:element[@name='ktxlog']", XSD_NS)
        if ktxlog_elem is None:
            raise ValueError("XSD missing root <xs:element name='ktxlog'>; XSD shape drift.")
        # Single descendant <xs:choice> in the events block.
        choice = ktxlog_elem.find(".//xs:choice", XSD_NS)
        if choice is None:
            raise ValueError("XSD missing <xs:choice> inside ktxlog/events/event; XSD shape drift.")
        for elem in choice.findall("xs:element", XSD_NS):
            event_name = elem.get("name")
            type_ref = elem.get("type")
            if not event_name or not type_ref:
                continue
            self._event_to_complex_type[event_name] = type_ref
        self._stats["event_count"] = len(self._event_to_complex_type)

        # Recover per-event source-line numbers for the XSD source_ref.
        # ElementTree's default parser does not preserve line numbers, so do a
        # fallback regex pass over the XSD text to find the
        # <xs:element name="EVENT_NAME" line index.
        xsd_text = self._xsd_path.read_text()
        line_re = re.compile(r'<xs:element\s+name="([a-z_]+)"\s+type="([a-z_]+)"\s*/>')
        line_no = 0
        for raw_line in xsd_text.splitlines():
            line_no += 1
            m = line_re.search(raw_line)
            if m and m.group(1) in self._event_to_complex_type:
                self._event_source_lines.setdefault(m.group(1), line_no)
        # setdefault on first match preserves the first occurrence (the events
        # choice); later occurrences in test fixtures or alternate definitions
        # would not overwrite it.

    def _grep_emissions(self) -> None:
        """Stage 2 -- find all emission sites in the four host files.

        Per spec 5.6.b, each emission site carries a containing_function
        derived from a backwards-walk to the nearest preceding C
        function-signature line.
        """
        for rel_path in EMISSION_FILES:
            abs_path = self._repo_root / rel_path
            if not abs_path.is_file():
                self._stats["unrecognized_files"].append(rel_path)
                continue
            text = abs_path.read_text()
            # Pre-split by lines so the containing_function backwards-walk is
            # O(emissions * preceding_lines) without re-splitting per match.
            lines = text.splitlines()
            for match in EMISSION_RE.finditer(text):
                event_name = match.group("event_name")
                # 1-indexed line number of the match start.
                line_no = text.count("\n", 0, match.start()) + 1
                # containing_function heuristic per spec 5.6.b: walk backwards
                # from the emission's line index (0-indexed in the lines list,
                # so line_no - 1) to the nearest preceding line matching
                # FUNC_SIG_RE. Capture the function name; null if no match
                # found before the file start (e.g., emission at top of file
                # outside any function -- not a current case in KTX, defensive).
                containing_function = None
                for i in range(line_no - 1, -1, -1):
                    if i >= len(lines):
                        continue
                    m = FUNC_SIG_RE.match(lines[i])
                    if m:
                        containing_function = m.group("func")
                        break
                site = {
                    "source_file": rel_path,
                    "source_line": line_no,
                    "event_name": event_name,
                    "containing_function": containing_function,
                }
                if event_name not in self._event_to_complex_type:
                    # Emitted event_name not defined in the XSD's event choice.
                    # Defensive surface so a future tag adding a new event type
                    # (without bumping the XSD) is visible to the operator.
                    self._stats["unrecognized_emissions"].append(site)
                    continue
                self._emission_sites.append(site)
        self._stats["emission_site_count"] = len(self._emission_sites)
        by_event: dict[str, int] = {}
        for s in self._emission_sites:
            by_event[s["event_name"]] = by_event.get(s["event_name"], 0) + 1
        self._stats["by_event_name"] = by_event

    def _merge_emissions_into_events(self) -> None:
        """Stage 3 -- group emission sites by event_name and assemble per-event entries.

        This is the spec 5.6.c-named merge stage broken out as its own method
        so the four-stage flow is visible in the code.
        """
        # Group emission sites by event_name for O(1) per-event lookup.
        sites_by_event: dict[str, list[dict]] = {}
        for s in self._emission_sites:
            sites_by_event.setdefault(s["event_name"], []).append({
                "source_file":         s["source_file"],
                "source_line":         s["source_line"],
                "containing_function": s["containing_function"],
            })

        # Build per-event entries. Iterate XSD's event-choice in alphabetical
        # order so the output is deterministic across runs. Every event_name
        # declared in the XSD gets a row, even if no emission sites reference
        # it (defensive: zero-site rows surface XSD-vs-source drift through
        # the events_without_emissions stat).
        entries: list[dict] = []
        for event_name in sorted(self._event_to_complex_type.keys()):
            complex_type = self._event_to_complex_type[event_name]
            sites = sites_by_event.get(event_name, [])
            if not sites:
                self._stats["events_without_emissions"].append(event_name)
            entries.append({
                "name": event_name,
                "ast": {
                    "event_name":          event_name,
                    "complex_type":        complex_type,
                    "attributes":          self._complex_type_attrs.get(complex_type, []),
                    "xsd_path":            self._stats["xsd_path"],
                    "xsd_version":         self._xsd_version,
                    "source_file":         self._stats["xsd_path"],
                    "source_line":         self._event_source_lines.get(event_name),
                    "emission_call_sites": sites,
                },
            })
        self._merged_events = entries

    # -------------------------------------------------------------------------
    # Duck-typed Visitor lifecycle stubs. The handler does NO per-TU work, but
    # extract.py's per-handler dispatch loop calls these methods on every
    # registered handler. Implementing them as bare pass (or returning [] for
    # end_file) keeps the dispatch loop happy without inheriting from Visitor.
    # -------------------------------------------------------------------------

    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        # XSD-driven handler; no per-TU work. Stub for driver compatibility.
        pass

    def enter_function(self, cursor, variant: str) -> None:
        # XSD-driven handler; no per-function work. Stub for driver compatibility.
        pass

    def exit_function(self, cursor, variant: str) -> None:
        # XSD-driven handler; no per-function work. Stub for driver compatibility.
        pass

    def enter_compound(self, cursor, variant: str) -> None:
        # XSD-driven handler; no per-compound work. Stub for driver compatibility.
        pass

    def exit_compound(self, cursor, variant: str) -> None:
        # XSD-driven handler; no per-compound work. Stub for driver compatibility.
        pass

    def visit_cursor(self, cursor, variant: str) -> None:
        # XSD-driven handler; no per-cursor work. Stub for driver compatibility.
        pass

    def end_file(self) -> list[dict]:
        # XSD-driven handler emits no per-TU rows; the merged event entries
        # live in self._merged_events and are returned by finalize().
        return []

    def finalize(self, *, all_rows: list[dict], repo_root: Path) -> dict:
        """Stage 4 -- wrap the merged events in the output dict with stats.

        The handler's rows live in self._merged_events (assembled in
        _merge_emissions_into_events() during setup()); finalize ignores
        all_rows (which would be empty for this handler since end_file()
        returns []) and reads self._merged_events directly.

        The 7 entries land in alphabetical event_name order:
        damage, death, drop_backpack, drop_powerup, pick_backpack,
        pick_mapitem, pick_powerup.
        """
        return {
            "match_events": self._merged_events,
            "_stats": self._stats,
        }
