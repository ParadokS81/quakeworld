# Phase 6 -- match_event handler (XSD-driven; not libclang)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (F14 + F17 -- see "Phase ownership of findings" table).
> 3. Read the relevant section of `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` for the spec commitment behind this phase (Pass 4.5 -- match_event entity-type column shape; Pass 5.6 -- handler architecture detail).
> 4. Source-walk the XSD at `research/repos/ktx/resources/extralog/ktxlog_0.1.xsd` and the four emission-host files (`items.c`, `combat.c`, `client.c`, `logs.c`) -- spec sketches drift; live source wins. Reproduce the count anchors locked in F14.
> 5. Read the analogous prior-engine handler / loader as a template. For the loader, MVDSV's `load-log-templates.ts` is the closest precedent (multi-call-site JSONB binding shape; `*_PAYLOAD_FIELD` + `*IsSourceBacked` + `build*VersionRow` + `upsert*Row` exports). For the handler, there is NO direct precedent in the lineup -- match_event is the lone XSD-driven handler per D6. Phase 4's `_handler_gameplay_taxonomies.py` is the closest cross-codebase reference for a non-AST-walk handler shape (its Stage 2 reads `deathtype.h` directly). Port, do not subclass per D3.
> 6. After drafting, dispatch the verification sub-agent (see "Verification sub-agent" section in `phase-template.md`) before declaring the phase MD ready for operator review.

## Goal

Phase 6 lands KTX's match-event taxonomy as queryable Layer 1 entity rows. Two deliverables: (1) `_handler_match_events.py` -- a project-private XSD-driven handler under `apps/qw-oracle/scripts/extractors/ktx/`. Per spec 5.6.c (line 1380), this handler does NOT inherit from `Visitor` -- the XSD pattern doesn't fit the libclang Visitor lifecycle, and the handler stands alone with its own `setup -> parse_xsd -> grep_emissions -> merge -> finalize` flow. The handler implements duck-typed no-op stubs of the Visitor lifecycle methods (`start_file` / `end_file` / `visit_cursor` / `enter_function` / `exit_function`) for compatibility with extract.py's per-handler dispatch loop, but does NOT subclass `Visitor` -- the spec's "stands alone" framing wins over D3's "inherit from Visitor only" prose for this lone XSD-driven handler (D1 lock; the deviation is documented in Open Questions). The two-stage flow: parse_xsd uses Python's `xml.etree.ElementTree` (stdlib, NOT lxml per 5.6.a) to recover the 7 distinct event names declared in the events `<xs:choice>` plus the 4 named simpleType constraint definitions (`maxed_integer`, `iptype`, `modetype`, `porttype`); grep_emissions uses Python `re` over a fixed 4-file glob (`items.c`, `combat.c`, `client.c`, `logs.c`) to find every multi-line `log_printf("\t\t<event>\n" "\t\t\t<event_name>\n" ...)` emission site, with a `containing_function` heuristic that walks backwards from each match to the nearest preceding C function-signature line per spec 5.6.b. Merge joins emission sites to events (group by event_name, attach to per-event entries with simpleType constraints resolved); finalize wraps the result in the output dict. Output is `ktx-match-events-ast.json` (cross-engine `-ast` suffix retained per 5.6.c even though no AST is involved). The handler emits 7 `match_event` entity rows + 7 `match_event_versions` rows whose `emission_call_sites_json` aggregates to 13 total emission sites across the four host files. (2) `load-match-events.ts` -- an entity-shaped TS loader that reads the AST JSON and idempotently UPSERTs each entity into `entities` + the per-version row into `match_event_versions`, with both `attributes_json` and `emission_call_sites_json` bound directly via postgres-js JSONB (D14, NEVER pre-stringified). The dual-row design with Pass 1.7's printf-handler is preserved per F17 / D10 -- this phase does NOT add a filter to KTX's log_template handler to skip XML-shaped log_printfs; the duplicate IS the design (per-site truth in `log_template_versions` + per-type truth in `match_event_versions`). Runnable state at boundary: `entities` holds 7 `(project='ktx', type='match_event')` rows; `match_event_versions` holds the matching 7 per-version rows with attribute schemas (with simpleType constraints resolved) and emission-site aggregates (with `containing_function` populated); the qw-event-log validation harness is fully unblocked at the schema level (the per-XSD-complexType anchors it needs are now Layer 1 queryable).

## Inputs from previous phase

Phase 1 complete:
- Migration `009_ktx_match_event_type.sql` (or its renumbered equivalent per Phase 1's resolved numbering -- see Phase 1 phase MD; the `008_community_schema.sql` collision was acknowledged in F-amendments and resolved at Phase 1 drafting time) widens `entities.type` CHECK to admit `'match_event'` AND creates the `match_event_versions` table with PK `(entity_id, version)` and indexes on `complex_type` and `xsd_version` (D5 row 2; F14).
- The dev DB `\d+ match_event_versions` returns the column list locked at Pass 4.5: `entity_id BIGINT NOT NULL REFERENCES entities(id)`, `version TEXT NOT NULL`, `event_name TEXT NOT NULL`, `complex_type TEXT NOT NULL`, `attributes_json JSONB NOT NULL`, `xsd_path TEXT NOT NULL`, `xsd_version TEXT NOT NULL`, `emission_call_sites_json JSONB NOT NULL`, `raw_ast_hash TEXT`, `source_root TEXT`, `extracted_at TIMESTAMPTZ NOT NULL`, plus the PK and the two indexes. The exact migration filename + column types are owned by Phase 1; this phase reads from the table as-is.

Phase 2 complete:
- KTX driver at `apps/qw-oracle/scripts/extractors/ktx/extract.py` exists with the Pass 1 handlers (cvars / commands / info_keys / log_templates) registered in `ALL_HANDLERS`. Phase 6 adds the `MATCH_EVENTS` handler entry to that dict.
- KTX's log_template handler (Phase 2 Pass 1.7) emits `log_template_versions` rows with `channel='logfile'` for every XML-shaped `log_printf` emission site. Per F17, those rows ARE intentional duplicates of the per-site information match_event also captures via `emission_call_sites_json`. Phase 6 does NOT modify Phase 2's printf-handler.
- `apps/qw-oracle/scripts/extractors/ktx/output/` directory exists; the four Pass-1 AST JSONs and (when Phases 3 / 4 / 5 ship) up to four Pass-5 AST JSONs sit there. Phase 6 writes a new sibling `ktx-match-events-ast.json` into the same dir.
- `extract-tag.ts` has KTX dispatch wiring; `PROJECT_EXTRACTOR.ktx` resolves to the KTX driver path; `ENTITY_JSON_FILES.ktx` carries entries for the four Pass-1 entity types. Phase 6 adds the `match_event` entry pointing at `ktx-match-events-ast.json`.

Phase 3 / 4 / 5 are independent at the data level -- Phase 6 does not depend on those phases having shipped. All four (Phases 3, 4, 5, 6) can draft / execute in parallel after Phase 1 lands the foundation.

Plus the prerequisites inherited from Arc 1 (`prerequisites.md`):
- Postgres dev container running and reachable; `bun --version` >= 1.3 in `apps/qw-oracle/`.
- KTX research repo cloned at `research/repos/ktx/`. The handler reads `research/repos/ktx/resources/extralog/ktxlog_0.1.xsd` and the four emission-host source files; all are part of the canonical KTX source tree and present at any commit.
- Python 3 stdlib only -- `xml.etree.ElementTree` and `re` ship with python3-base; no third-party XSD library is installed (lxml is explicitly NOT used per the cross-engine python3-clang baseline -- new third-party deps require operator approval; stdlib coverage is sufficient for KTX's flat XSD).

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py
apps/qw-oracle/scripts/load-knowledge/load-match-events.ts
```

### Modified

```
apps/qw-oracle/scripts/extractors/ktx/extract.py                 # register MATCH_EVENTS handler in ALL_HANDLERS
apps/qw-oracle/scripts/load-knowledge/types.ts                   # add MatchEventEntry / MatchEventAst / MatchEventVersionRow interfaces
apps/qw-oracle/scripts/load-knowledge/natural-keys.ts            # add upsertMatchEventVersion function
apps/qw-oracle/scripts/load-knowledge/load-version.ts            # dispatch type='match_event' to load-match-events helpers
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts             # add match_event -> ktx-match-events-ast.json to ENTITY_JSON_FILES.ktx
```

The TS-side changes (types.ts / natural-keys.ts / load-version.ts / extract-tag.ts) are small additive insertions parallel to the existing `log_template` entries -- log_template is the closest existing analog (per-version table with two JSONB columns: `all_call_sites_json` was added at v17). Mirror its slot ordering.

### Deleted

n/a

## Tasks

### Task 1: Author `apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py`

**Goal:** Ship the project-private XSD-driven KTX match-event handler that emits the `ktx-match-events-ast.json` payload (7 event entries with attribute schemas including resolved simpleType constraints + emission-site aggregates with containing_function, plus a `_stats` block). Per spec 5.6.c, this handler does NOT inherit from `Visitor` -- it stands alone with its own `setup -> parse_xsd -> grep_emissions -> merge -> finalize` flow. The Visitor lifecycle methods (`start_file` / `end_file` / `visit_cursor` / `enter_function` / `exit_function`) exist only as duck-typed no-op stubs so that extract.py's per-handler dispatch loop can call them without error -- they do NO work. All extraction happens in `setup()` (which calls the four named flow stages in order) and `finalize()` (which returns the assembled output dict).

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py` (created)

**Steps:**

- [ ] Create the file at `apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py`. Module docstring opens with: handler purpose (KTX match_event entity-type extraction), four-stage flow summary (parse_xsd + grep_emissions + merge + finalize), explicit note that this handler does NOT use libclang AND does NOT inherit from `Visitor` per spec 5.6.c (project-private Tier 3 in the EXTRACTOR-PLAYBOOK three-tier model -- promotable to `extractor_lib._xsd_match_events.py` per Rule of Second Consumer if a second engine surfaces XSD-defined event types), output filename (`ktx-match-events-ast.json`).

  The Visitor lifecycle is duck-typed -- the driver iterates registered handlers and calls each one's `setup` once, then per-TU `start_file` / `visit_cursor` / `end_file`, then a single `finalize`. For an XSD-driven handler the per-TU stages are no-ops; the handler implements `start_file` / `end_file` / `visit_cursor` / `enter_function` / `exit_function` as bare `pass` stubs WITHOUT inheriting from Visitor (so that the driver's `hasattr` / direct-call dispatch works regardless of whether Phase 2's extract.py's `ALL_HANDLERS` declaration uses a `dict[str, type[Visitor]]` annotation -- see Task 2's note on type widening). All actual extraction happens in `setup()` (which calls the four named flow stages in order) and `finalize()` (which returns the dict).

  Preserve dual-row design with log_template per F17 / D10 -- the docstring includes a "Dual-row design" paragraph explaining why this handler does NOT modify Phase 2's printf-handler to skip XML-shaped log_printfs. Future maintainers reading the file should understand the duplicate is intentional.

- [ ] Add module-level imports and constants. The `extractor_lib._visitor.Visitor` import is intentionally absent -- the handler stands alone per spec 5.6.c.

  ```python
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
  ```

- [ ] Implement the `KtxMatchEventsHandler` class. Per spec 5.6.c, this class does NOT inherit from `Visitor` (no parent class; implicit `object` base). Required attributes / methods:

  - Class attributes: `name = HANDLER_NAME`, `output_filename = OUTPUT_FILENAME`. No `payload_field` -- finalize() returns a dict with multiple top-level keys (`match_events` array + `_stats` block) per the precedent in MVDSV's protocol handler return shape.

  - `setup(*, ktx_repo: Path, ktx_src: Path)`: store both paths (only `ktx_repo` is used; `ktx_src` is kept for cross-engine signature compatibility). Initialize state, then run the four named flow stages in order:

    ```python
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
    ```

  - `_parse_xsd()`: Stage 1 -- locate and parse the XSD.

    Glob for the XSD inside the repo:
    ```python
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
    ```

    Derive `xsd_version` from the filename (e.g. `ktxlog_0.1.xsd` -> `"0.1"`):
    ```python
    stem = self._xsd_path.stem  # "ktxlog_0.1"
    if "_" in stem:
        self._xsd_version = stem.split("_", 1)[1]
    else:
        self._xsd_version = stem
    self._stats["xsd_version"] = self._xsd_version
    ```

    Parse the XSD with ElementTree:
    ```python
    tree = ET.parse(self._xsd_path)
    root = tree.getroot()
    ```

    Walk all named simpleTypes first (they are referenced by complexType attributes). For each, extract the `<xs:restriction base="...">` payload + facets (`<xs:minInclusive>`, `<xs:maxInclusive>`, `<xs:pattern>`):
    ```python
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
    ```

    Walk all named complexTypes. For each, extract its sequence's element children and record (attribute_name, attribute_type, constraint) per spec 5.6.c output JSON shape -- constraint is `null` for XSD primitives (xs:decimal / xs:string / xs:nonNegativeInteger / xs:boolean) and the resolved simpleType constraint dict for named types:
    ```python
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
    ```

    Recover the event-name -> complex-type mapping by walking the events `<xs:choice>` inside the root `ktxlog` element. The path is:
    `<xs:element name="ktxlog">` -> inline `<xs:complexType>` -> `<xs:sequence>` -> `<xs:element name="events">` -> inline `<xs:complexType>` -> `<xs:sequence>` -> `<xs:element name="event"...>` -> inline `<xs:complexType>` -> `<xs:choice>` -> 7 `<xs:element name="EVENT_NAME" type="COMPLEX_TYPE"/>` children.

    Use a relative XPath descent rather than typing the full path:
    ```python
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
    ```

    Recover per-event source-line numbers for the XSD source_ref. ElementTree's default parser does not preserve line numbers, so do a fallback regex pass over the XSD text to find the `<xs:element name="EVENT_NAME"` line index:
    ```python
    xsd_text = self._xsd_path.read_text()
    line_re = re.compile(r'<xs:element\s+name="([a-z_]+)"\s+type="([a-z_]+)"\s*/>')
    line_no = 0
    for raw_line in xsd_text.splitlines():
        line_no += 1
        m = line_re.search(raw_line)
        if m and m.group(1) in self._event_to_complex_type:
            self._event_source_lines.setdefault(m.group(1), line_no)
    ```

    The `setdefault` on first match preserves the first occurrence (the events choice; later occurrences in test fixtures or alternate definitions would not overwrite it).

  - `_grep_emissions()`: Stage 2 -- find all emission sites in the four host files. Per spec 5.6.b, each emission site carries a `containing_function` derived from a backwards-walk to the nearest preceding C function-signature line.

    ```python
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
    ```

  - `_merge_emissions_into_events()`: Stage 3 -- group emission sites by event_name and assemble the per-event entry list. This is the spec 5.6.c-named `merge` stage broken out as its own method so the four-stage flow is visible in the code.

    ```python
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
    ```

  - Duck-typed Visitor lifecycle stubs. The handler does NO per-TU work, but extract.py's per-handler dispatch loop calls these methods on every registered handler. Implementing them as bare `pass` (or returning `[]` for `end_file`) keeps the dispatch loop happy without inheriting from `Visitor`. Each stub carries a one-line comment explaining why it's inert.

    ```python
    def start_file(self, *, source_path: Path, source_bytes: bytes) -> None:
        # XSD-driven handler; no per-TU work. Stub for driver compatibility.
        pass

    def enter_function(self, cursor, variant: str) -> None:
        # XSD-driven handler; no per-function work. Stub for driver compatibility.
        pass

    def exit_function(self, cursor, variant: str) -> None:
        # XSD-driven handler; no per-function work. Stub for driver compatibility.
        pass

    def visit_cursor(self, cursor, variant: str) -> None:
        # XSD-driven handler; no per-cursor work. Stub for driver compatibility.
        pass

    def end_file(self) -> list[dict]:
        # XSD-driven handler emits no per-TU rows; the merged event entries
        # live in self._merged_events and are returned by finalize().
        return []
    ```

  - `finalize(*, all_rows, repo_root) -> dict`: Stage 4 -- wrap the merged events in the output dict with stats. The handler's rows live in `self._merged_events` (assembled in `_merge_emissions_into_events()` during `setup()`); finalize ignores `all_rows` (which would be empty for this handler since `end_file()` returns `[]`) and reads `self._merged_events` directly.

    ```python
    return {
        "match_events": self._merged_events,
        "_stats": self._stats,
    }
    ```

    The 7 entries land in alphabetical event_name order: damage, death, drop_backpack, drop_powerup, pick_backpack, pick_mapitem, pick_powerup.

- [ ] Run a syntax sanity pass:
  ```bash
  python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/ktx'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from _handler_match_events import KtxMatchEventsHandler; print('ok')"
  ```
  Expected: prints `ok` (clean import; no syntax errors; no missing names).

**Verification:**
- `test -f apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py` exits 0.
- The above import probe prints `ok`.
- `grep -nE "^class KtxMatchEventsHandler" apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py | grep -c '(Visitor)'` returns `0` (handler does NOT inherit from Visitor per spec 5.6.c).
- `grep -n "from extractor_lib._visitor" apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py` returns 0 matches (no Visitor import; standalone handler per spec 5.6.c).
- `grep -n "from _handler_" apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py` returns 0 matches (no parent-project subclassing per D3 cross-codebase port rule).
- `grep -n "import lxml\|from lxml" apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py` returns 0 matches (stdlib `xml.etree.ElementTree` only; no third-party XSD dep per 5.6.a).
- `grep -nE "^from clang\." apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py` returns 0 matches (no libclang import; this handler is XSD-driven).
- `grep -nE "def (start_file|end_file|visit_cursor|enter_function|exit_function)" apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py` returns 5 matches (all five lifecycle stubs present for driver compatibility).
- `grep -nE "def (_parse_xsd|_grep_emissions|_merge_emissions_into_events)" apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py` returns 3 matches (all three flow-stage methods named per spec 5.6.c).
- PASS condition: file present + clean import + standalone class shape (no Visitor inheritance, no Visitor import) + 5 lifecycle stubs + 3 flow-stage methods + no third-party / libclang deps.
- FAIL condition: any of the above fails.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis across one new Python file (~250 lines). XSD parse via stdlib ElementTree + regex grep over 4 fixed files; contained shape; no novel architectural decisions; clear data shapes specified in steps. Sonnet medium adequate per D18.

### Task 2: Register `KtxMatchEventsHandler` in `extract.py`

**Goal:** Add the handler to the KTX driver's `ALL_HANDLERS` dict so `--handlers all` (or `--handlers match_events`) runs it. Mirrors Phase 3 / 4 / 5's handler-registration pattern.

**Files:**
- `apps/qw-oracle/scripts/extractors/ktx/extract.py` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/extractors/ktx/extract.py`. Locate the `ALL_HANDLERS` dict (Phase 2 registers four Pass-1 entries; Phases 3 / 4 / 5 register `MODES` / `TAXONOMIES` / `TABLES`).

- [ ] Add the `MATCH_EVENTS` entry adjacent to the others. The handler instance is constructed with no constructor args; `setup()` is called by the driver post-fork with `ktx_repo` + `ktx_src`.

  Because `KtxMatchEventsHandler` does NOT inherit from `Visitor` (per spec 5.6.c), the existing Phase-2-established `ALL_HANDLERS` type annotation `dict[str, type[Visitor]]` no longer fits. Two options for the implementer:

  - Option A (recommended): widen the annotation to `dict[str, type]` (accepts any class). Loses type-narrowness; gains simplicity. The driver's per-handler dispatch is duck-typed at runtime anyway -- it calls `handler.setup(...)` / `handler.start_file(...)` / etc. by attribute name; the annotation never gates dispatch.

  - Option B: declare `ALL_HANDLERS: dict[str, Union[type[Visitor], type[KtxMatchEventsHandler]]]`. Preserves type-narrowness; introduces a maintenance burden if more standalone handlers land. Not recommended unless a future arc adds a third handler shape.

  Pick option A unless Phase 2 / 3 / 4 / 5 have already established a different convention.

  ```python
  from _handler_match_events import KtxMatchEventsHandler

  # Annotation widened from `dict[str, type[Visitor]]` to `dict[str, type]`
  # because match_events is a standalone (non-Visitor-inheriting) handler
  # per spec 5.6.c.
  ALL_HANDLERS: dict[str, type] = {
      # ... Phase-2 entries (cvars / commands / info_keys / log_templates) ...
      # ... Phase-3 modes entry ...
      # ... Phase-4 taxonomies entry ...
      # ... Phase-5 tables entry ...
      "match_events": KtxMatchEventsHandler,
  }
  ```

  The exact local-import shape may vary by what Phase 2 / 3 / 4 / 5 establish; mirror their pattern. If those phases use a `try/except ImportError` guard (defensive against partial-rollout), do the same here.

- [ ] Confirm the driver's per-handler dispatch (`--handlers <name>` CLI arg) works with the new entry:
  ```bash
  python3 apps/qw-oracle/scripts/extractors/ktx/extract.py --help
  ```
  Expected: `match_events` appears in the handler-name list.

**Verification:**
- `grep -n "match_events\|KtxMatchEventsHandler" apps/qw-oracle/scripts/extractors/ktx/extract.py` returns at least 2 matches (import + ALL_HANDLERS entry).
- PASS condition: handler discoverable via `--help`.
- FAIL condition: handler missing from ALL_HANDLERS OR `--help` exits with an import error.

**Execution mode:** `inline` -- two-line additions to an existing file with the literal new content shipped above.

### Task 3: Add `MatchEventEntry` / `MatchEventAst` / `MatchEventVersionRow` to `types.ts`

**Goal:** Declare the TS interfaces the loader and dispatcher consume. Mirrors the existing `LogTemplateEntry` / `LogTemplateAst` / `LogTemplateVersionRow` shape (closest analog -- per-version table with two JSONB-shaped array fields).

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/types.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/types.ts`. Locate the `LogTemplateEntry` / `LogTemplateAst` / `LogTemplateVersionRow` definitions. Add the three match_event interfaces immediately below them (alphabetical-after-log_template ordering matches the schema's table order).

- [ ] Add the interfaces:

  ```ts
  // Per-attribute schema entry inside MatchEventAst.attributes. Mirrors
  // the XSD's <xs:element name="..." type="..."/> shape PLUS the resolved
  // simpleType constraint when type is a named simpleType (maxed_integer,
  // iptype, modetype, porttype). For XSD primitives (xs:decimal,
  // xs:string, xs:nonNegativeInteger, xs:boolean) constraint is null.
  // Per spec 5.6.c output JSON shape (line 1395):
  //     {"name":"time","type":"xs:decimal","constraint":null}
  export interface MatchEventAttributeConstraint {
    base: string | null;
    min_inclusive?: string;
    max_inclusive?: string;
    pattern?: string;
  }
  export interface MatchEventAttribute {
    name: string;
    type: string; // XSD type ref, e.g. 'xs:decimal', 'xs:string', 'maxed_integer'
    constraint: MatchEventAttributeConstraint | null;
  }

  // Per-emission call site. Tracks where in the C source each event
  // type is emitted via log_printf, plus the enclosing C function name
  // per spec 5.6.b's containing_function heuristic. The handler
  // aggregates ALL sites that emit a given event_name into
  // emission_call_sites.
  export interface MatchEventEmissionSite {
    source_file: string;
    source_line: number;
    containing_function: string | null;
  }

  export interface MatchEventAst {
    event_name: string;            // e.g. 'pick_mapitem'
    complex_type: string;          // e.g. 'mapitemtype'
    attributes: MatchEventAttribute[];
    xsd_path: string;              // repo-relative path to the XSD
    xsd_version: string;           // e.g. '0.1'
    source_file: string;           // = xsd_path; the XSD is the source of truth for this entity
    source_line: number | null;    // line in the XSD where <xs:element name="EVENT_NAME"...> appears
    emission_call_sites: MatchEventEmissionSite[];
  }

  export interface MatchEventEntry {
    name: string;                  // = ast.event_name; handler convention
    ast: MatchEventAst | null;     // null for doc_only rows; in practice unused for match_event (XSD is the producer)
  }

  export interface MatchEventVersionRow {
    entity_id: number;
    version: string;
    event_name: string;
    complex_type: string;
    attributes_json: MatchEventAttribute[];          // JSONB array (D14: pass directly, do NOT JSON.stringify)
    xsd_path: string;
    xsd_version: string;
    emission_call_sites_json: MatchEventEmissionSite[]; // JSONB array (D14: pass directly, do NOT JSON.stringify)
    raw_ast_hash: string | null;
    source_root: string | null;
    extracted_at: string;
  }
  ```

**Verification:**
- `grep -n "MatchEventEntry\|MatchEventAst\|MatchEventVersionRow" apps/qw-oracle/scripts/load-knowledge/types.ts` returns at least 3 matches (one per interface declaration).
- `bun --filter @qw/oracle build` (or `bunx tsc --noEmit`) exits 0 (no type errors introduced).
- PASS condition: interfaces declared + clean type-check.
- FAIL condition: type-check fails or the interfaces are missing.

**Execution mode:** `inline` -- pure-additive insertion to an existing file with full content shipped above; no logic changes.

### Task 4: Add `upsertMatchEventVersion` to `natural-keys.ts`

**Goal:** Provide the per-version idempotent UPSERT function the loader calls. Mirrors `upsertLogTemplateVersion` shape (closest precedent -- per-version table with two JSONB columns; D14-compliant binding).

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts`. Locate `upsertLogTemplateVersion`. Add `upsertMatchEventVersion` immediately below.

- [ ] Add the function (binding both JSONB columns directly per D14):

  ```ts
  // Idempotent UPSERT for match_event_versions. PK is (entity_id, version).
  // Both attributes_json and emission_call_sites_json are JSONB columns
  // bound via tx.json(...) per D14 (NEVER JSON.stringify + TEXT bind).
  // ON CONFLICT DO UPDATE makes re-runs no-ops at the row-content level;
  // re-running the handler against the same XSD + source produces
  // identical row content modulo the extracted_at timestamp.
  export async function upsertMatchEventVersion(
    tx: postgres.TransactionSql<{}>,
    row: MatchEventVersionRow,
  ): Promise<void> {
    await tx`
      INSERT INTO match_event_versions (
        entity_id, version,
        event_name, complex_type,
        attributes_json,
        xsd_path, xsd_version,
        emission_call_sites_json,
        raw_ast_hash, source_root, extracted_at
      ) VALUES (
        ${row.entity_id}, ${row.version},
        ${row.event_name}, ${row.complex_type},
        ${tx.json(row.attributes_json as never)},
        ${row.xsd_path}, ${row.xsd_version},
        ${tx.json(row.emission_call_sites_json as never)},
        ${row.raw_ast_hash}, ${row.source_root}, ${row.extracted_at}
      )
      ON CONFLICT (entity_id, version) DO UPDATE SET
        event_name               = EXCLUDED.event_name,
        complex_type             = EXCLUDED.complex_type,
        attributes_json          = EXCLUDED.attributes_json,
        xsd_path                 = EXCLUDED.xsd_path,
        xsd_version              = EXCLUDED.xsd_version,
        emission_call_sites_json = EXCLUDED.emission_call_sites_json,
        raw_ast_hash             = EXCLUDED.raw_ast_hash,
        source_root              = EXCLUDED.source_root,
        extracted_at             = EXCLUDED.extracted_at
    `;
  }
  ```

- [ ] Add `MatchEventVersionRow` to the import list at the top of the file (it currently imports the per-version row types it owns; add the new one):

  ```ts
  import type {
    // ... existing types ...
    LogTemplateVersionRow,
    MatchEventVersionRow,    // NEW
    // ... existing types ...
  } from './types.js';
  ```

**Verification:**
- `grep -n "upsertMatchEventVersion" apps/qw-oracle/scripts/load-knowledge/natural-keys.ts` returns at least 1 match (function declaration).
- `grep -n "JSON.stringify" apps/qw-oracle/scripts/load-knowledge/natural-keys.ts | grep -v "raw_ast_hash"` returns 0 matches inside the new function (D14: no pre-stringification of JSONB columns).
- `grep -n "tx.json(row.attributes_json\|tx.json(row.emission_call_sites_json" apps/qw-oracle/scripts/load-knowledge/natural-keys.ts` returns 2 matches (both JSONB columns bound via `tx.json(...)`).
- `bun --filter @qw/oracle build` (or `bunx tsc --noEmit`) exits 0.
- PASS condition: function declared + JSONB binding compliance + clean type-check.
- FAIL condition: any JSONB column gets `JSON.stringify`'d, or the type-check fails.

**Execution mode:** `inline` -- additive insertion with full content shipped above; pattern is mechanical (mirror `upsertLogTemplateVersion`).

### Task 5: Author `apps/qw-oracle/scripts/load-knowledge/load-match-events.ts`

**Goal:** Ship the entity-shaped TS loader that converts each `MatchEventEntry` from the AST JSON into a `MatchEventVersionRow` and persists it. Mirrors `load-log-templates.ts` shape (`*_PAYLOAD_FIELD` constant, `*IsSourceBacked` predicate, `build*VersionRow` pure builder, `upsert*Row` thin wrapper).

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/load-match-events.ts` (created)

**Steps:**

- [ ] Create the file with the following content. Both JSONB columns bound directly per D14 (no JSON.stringify; no TEXT bind; postgres-js handles the serialization).

  ```ts
  // apps/qw-oracle/scripts/load-knowledge/load-match-events.ts
  //
  // Phase 6 KTX: match_event adapter. Consumes the array of {name, ast}
  // rows emitted by ktx/_handler_match_events.py and writes them to
  // match_event_versions. attributes_json + emission_call_sites_json are
  // JSONB columns bound directly via postgres-js per D14 (passing JS
  // arrays/objects directly produces the JSONB structured value; pre-
  // stringifying produces a JSONB string scalar -- the legacy SQLite-era
  // TEXT bug; F1.jsonb_columns_not_strings is the regression gate).
  //
  // The handler does not emit doc_only entries (the XSD is the producer
  // and every event_name in the events <xs:choice> gets a row), so
  // matchEventIsSourceBacked is effectively `entry.ast !== null` --
  // future-proofing for the same pattern as info_key / log_template.
  //
  // Dual-row design with log_template (D10 / F17): every emission site
  // tracked in emission_call_sites_json is ALSO captured as a
  // log_template_versions row with channel='logfile' by Phase 2's
  // printf-handler. The duplicate is intentional -- per-site truth in
  // log_template + per-type truth in match_event. Future maintainers
  // looking to "deduplicate" should read D10 first.

  import { createHash } from 'crypto';
  import type postgres from 'postgres';
  import { upsertMatchEventVersion } from './natural-keys.js';
  import type { MatchEventEntry, MatchEventVersionRow } from './types.js';

  export const MATCH_EVENT_PAYLOAD_FIELD = 'match_events';

  export function matchEventIsSourceBacked(entry: MatchEventEntry): boolean {
    return entry.ast !== null;
  }

  export function buildMatchEventVersionRow(
    entityId: number,
    version: string,
    entry: MatchEventEntry,
    now: string,
  ): MatchEventVersionRow {
    const ast = entry.ast;
    const raw_ast_hash = ast
      ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
      : null;

    return {
      entity_id: entityId,
      version,
      // NOT NULL at the schema level. Defensive empty fallback mirrors the
      // log_template builder; doc_only entries are filtered upstream by
      // matchEventIsSourceBacked.
      event_name: ast?.event_name ?? '',
      complex_type: ast?.complex_type ?? '',
      // JSONB columns. Pass JS arrays directly; postgres-js encodes as
      // JSONB array structured values per D14. NEVER JSON.stringify.
      // The natural-keys upsert wraps with tx.json(...) for explicit
      // JSONB type tagging.
      attributes_json: ast?.attributes ?? [],
      xsd_path: ast?.xsd_path ?? '',
      xsd_version: ast?.xsd_version ?? '',
      emission_call_sites_json: ast?.emission_call_sites ?? [],
      raw_ast_hash,
      // KTX is single-engine (no client / server split); source_root is
      // NULL = "engine" per SCHEMA.md semantics. Mirrors the log_template
      // and info_key handlers' single-engine convention.
      source_root: null,
      extracted_at: now,
    };
  }

  export async function upsertMatchEventRow(
    tx: postgres.TransactionSql<{}>,
    row: MatchEventVersionRow,
  ): Promise<void> {
    await upsertMatchEventVersion(tx, row);
  }
  ```

**Verification:**
- `test -f apps/qw-oracle/scripts/load-knowledge/load-match-events.ts` exits 0.
- `grep -n "JSON.stringify" apps/qw-oracle/scripts/load-knowledge/load-match-events.ts | grep -v "raw_ast_hash"` returns 0 matches (D14 compliance: only the hash uses JSON.stringify).
- `grep -nE "MATCH_EVENT_PAYLOAD_FIELD|matchEventIsSourceBacked|buildMatchEventVersionRow|upsertMatchEventRow" apps/qw-oracle/scripts/load-knowledge/load-match-events.ts` returns 4 matches (one per export).
- `bun --filter @qw/oracle build` (or `bunx tsc --noEmit`) exits 0.
- PASS condition: file present + four exports + D14 compliance + clean type-check.
- FAIL condition: any of the above fails.

**Execution mode:** `inline` -- small file (~70 lines) with full content shipped above; mirrors `load-log-templates.ts` mechanically. No logic decisions to delegate.

### Task 6: Wire `match_event` dispatch in `extract-tag.ts` and `load-version.ts`

**Goal:** Hook the new entity type into the existing per-tag pipeline. Two edits, both small: (a) add `match_event` to `ENTITY_JSON_FILES.ktx` so `extract-tag.ts` knows where to read the AST JSON; (b) add a `match_event` branch to `load-version.ts`'s entity-type dispatcher so the loader calls the right `build*` / `upsert*` pair.

**Files:**
- `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` (modified)
- `apps/qw-oracle/scripts/load-knowledge/load-version.ts` (modified)

**Steps:**

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`. Locate `ENTITY_JSON_FILES`. The `ktx` entry exists from Phase 2 with the four Pass-1 entries. Add the `match_event` slot:

  ```ts
  // ... existing ENTITY_JSON_FILES.ktx Pass-1 entries (cvar / command /
  //     info_key / log_template) added by Phase 2 ...
  ENTITY_JSON_FILES.ktx.match_event = 'ktx-match-events-ast.json';
  ```

  The exact in-file shape may use object-literal syntax (single declaration with all entries inline) or post-declaration assignments; mirror Phase 2's pattern. If Phase 2 used the object-literal form, add `match_event: 'ktx-match-events-ast.json'` as a new property; if it used post-declaration assignments, append the line above adjacent to the others.

- [ ] Open `apps/qw-oracle/scripts/load-knowledge/load-version.ts`. Locate the `EntityType` dispatcher (the per-type branch that selects the `is*SourceBacked` / `build*Row` / `upsert*Row` triple based on `type`). The existing dispatcher branches on `cvar`, `command`, `info_key`, `log_template`, etc. Add the `match_event` branch:

  ```ts
  import {
    MATCH_EVENT_PAYLOAD_FIELD,
    matchEventIsSourceBacked,
    buildMatchEventVersionRow,
    upsertMatchEventRow,
  } from './load-match-events.js';

  // Inside the dispatcher (mirror the log_template branch shape):
  if (type === 'match_event') {
    const isSourceBacked = matchEventIsSourceBacked;
    const buildRow = buildMatchEventVersionRow;
    const upsertRow = upsertMatchEventRow;
    const payloadField = MATCH_EVENT_PAYLOAD_FIELD;
    // ... rest of the dispatcher uses these four refs identically to other types ...
  }
  ```

  The exact dispatcher shape varies by what Phase 2 / earlier phases established (it could be a switch statement, a map of type -> handlers, or a series of if/else branches). Mirror the existing log_template branch's shape exactly -- the four refs (predicate / builder / upsert / payload field) all have direct counterparts in the new module.

- [ ] Confirm the EntityType union admits `match_event`. The `entities.type` enum is mirrored at the TS level in `types.ts` (or `constants.ts` -- whichever Phase 2 / earlier phases established). If the union does NOT yet include `match_event`, add it -- the existing arc has 11 values per SCHEMA.md `entities` row; adding `match_event` brings it to 12 (matches the 009 migration's CHECK widening).

  ```ts
  // Mirror the entities.type CHECK from migration 009 -- list grows by one:
  export type EntityType =
    | 'cvar'
    | 'command'
    | 'macro'
    | 'cmdline_param'
    | 'keyname'
    | 'hud_element'
    | 'ruleset'
    | 'token_primitive'
    | 'asset_category'
    | 'flag_bit'
    | 'cvar_alias'
    | 'protocol_message'
    | 'info_key'
    | 'log_template'
    | 'qc_builtin'
    | 'match_event';        // NEW (Phase 6 / migration 009)
  ```

  If a previous KTX-onboarding phase (Phase 2's log_template extension) already widened this union, the `match_event` line was reserved for this phase and just needs to be added at the bottom. If both Phase 2 and Phase 6 need to widen, Phase 2 owns its addition (`log_template`) and Phase 6 owns this one (`match_event`).

**Verification:**
- `grep -n "match_event.*ktx-match-events-ast.json" apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` returns 1 match (ENTITY_JSON_FILES entry).
- `grep -nE "matchEventIsSourceBacked|buildMatchEventVersionRow|upsertMatchEventRow" apps/qw-oracle/scripts/load-knowledge/load-version.ts` returns at least 3 matches (dispatcher import).
- `grep -n "'match_event'" apps/qw-oracle/scripts/load-knowledge/types.ts apps/qw-oracle/scripts/load-knowledge/constants.ts 2>/dev/null` returns at least 1 match (EntityType union member).
- `bun --filter @qw/oracle build` (or `bunx tsc --noEmit`) exits 0.
- PASS condition: dispatcher + ENTITY_JSON_FILES wire-up done + EntityType union admits the value + clean type-check.
- FAIL condition: any of the above fails or type-check errors out.

**Execution mode:** `inline` -- small additive changes to three existing files with full content shipped above; mechanical port of the log_template branch.

### Task 7: Smoke-test the end-to-end pipeline at KTX head

**Goal:** Run the extractor against KTX head, run the loader, and confirm the dev DB holds 7 match_event entity rows + 7 match_event_versions rows whose `attributes_json` and `emission_call_sites_json` are structured JSONB values (not string scalars; D14 regression gate).

**Files:**
- n/a -- this task only invokes existing scripts and queries.

**Steps:**

- [ ] Run the KTX extractor for just the match_events handler:
  ```bash
  python3 apps/qw-oracle/scripts/extractors/ktx/extract.py \
      --version head --handlers match_events
  ```
  Expected: exits 0; writes `apps/qw-oracle/scripts/extractors/ktx/output/ktx-match-events-ast.json`.

- [ ] Inspect the AST JSON shape:
  ```bash
  jq '._stats' apps/qw-oracle/scripts/extractors/ktx/output/ktx-match-events-ast.json
  jq '.match_events | length' apps/qw-oracle/scripts/extractors/ktx/output/ktx-match-events-ast.json
  jq '.match_events | map({event_name: .ast.event_name, complex_type: .ast.complex_type, attr_count: (.ast.attributes | length), site_count: (.ast.emission_call_sites | length)})' apps/qw-oracle/scripts/extractors/ktx/output/ktx-match-events-ast.json
  jq '.match_events[0].ast.attributes[0]' apps/qw-oracle/scripts/extractors/ktx/output/ktx-match-events-ast.json
  jq '.match_events[0].ast.emission_call_sites[0]' apps/qw-oracle/scripts/extractors/ktx/output/ktx-match-events-ast.json
  ```
  Expected:
  - `_stats.event_count` = 7
  - `_stats.expected_event_count` = 7
  - `_stats.named_simpletype_count` = 4 (`maxed_integer`, `iptype`, `modetype`, `porttype` -- live XSD has 4 named simpleTypes; the user-prompt recon hint of 5 is recorded as a discrepancy in Open Questions)
  - `_stats.emission_site_count` = 13
  - `_stats.expected_emission_site_count` = 13
  - `_stats.unrecognized_emissions` = `[]`
  - `_stats.unrecognized_files` = `[]`
  - `_stats.events_without_emissions` = `[]`
  - `.match_events | length` = 7
  - Per-event attribute counts: damage=8, death=8, drop_backpack=7, drop_powerup=4, pick_backpack=7, pick_mapitem=4, pick_powerup=4
  - Per-event emission-site counts: damage=2, death=1, drop_backpack=1, drop_powerup=1, pick_backpack=1, pick_mapitem=6, pick_powerup=1 (totals 13)
  - First attribute object has shape `{"name": <str>, "type": <str>, "constraint": null | <object>}` -- per spec 5.6.c output JSON shape line 1395.
  - First emission-call-site object has shape `{"source_file": <str>, "source_line": <int>, "containing_function": <str | null>}` -- per spec 5.6.b output structure (line 1373).

- [ ] Run the loader for KTX head:
  ```bash
  bun apps/qw-oracle/scripts/load-knowledge/index.ts load-version \
      --project ktx --version head
  ```
  Expected: exits 0; loads all KTX entity types including the new match_event rows.

- [ ] Verify entity row count in the dev DB:
  ```sql
  SELECT count(*) FROM entities WHERE project = 'ktx' AND type = 'match_event';
  -- Expected: 7

  SELECT count(*) FROM match_event_versions WHERE entity_id IN (
    SELECT id FROM entities WHERE project = 'ktx' AND type = 'match_event'
  );
  -- Expected: 7
  ```

- [ ] Verify JSONB binding (D14 regression gate -- the load-bearing probe):
  ```sql
  -- attributes_json should be a JSONB ARRAY, NOT a JSONB string scalar.
  SELECT
    e.name AS event_name,
    jsonb_typeof(v.attributes_json) AS attrs_typeof,
    jsonb_array_length(v.attributes_json) AS attrs_length,
    jsonb_typeof(v.emission_call_sites_json) AS sites_typeof,
    jsonb_array_length(v.emission_call_sites_json) AS sites_length
  FROM match_event_versions v
  JOIN entities e ON e.id = v.entity_id
  WHERE e.project = 'ktx' AND e.type = 'match_event'
  ORDER BY e.name;
  ```
  Expected: 7 rows. Every `attrs_typeof` = 'array' (NOT 'string'); every `sites_typeof` = 'array' (NOT 'string'). Per-row attrs_length matches XSD's complexType field count; per-row sites_length matches the emission grep totals.

- [ ] Verify content sanity for one event entity:
  ```sql
  SELECT
    e.name,
    v.complex_type,
    v.xsd_version,
    v.attributes_json -> 0 AS first_attr,
    v.emission_call_sites_json -> 0 AS first_site
  FROM match_event_versions v
  JOIN entities e ON e.id = v.entity_id
  WHERE e.project = 'ktx' AND e.type = 'match_event' AND e.name = 'pick_mapitem';
  ```
  Expected: 1 row. `complex_type` = 'mapitemtype'. `xsd_version` = '0.1'. `first_attr` is a JSONB object with `name` = 'time' and `type` = 'xs:decimal'. `first_site` is a JSONB object with `source_file` = 'src/items.c' and `source_line` somewhere in the items.c emission range (219, 561, 1025, 1301, 1556, or 1720 -- whichever sorts first by source_line).

- [ ] Re-run the loader to confirm idempotency (D15):
  ```bash
  bun apps/qw-oracle/scripts/load-knowledge/index.ts load-version \
      --project ktx --version head
  ```
  Then re-run the entity-count query above. Expected: still 7 entity rows + 7 version rows; no inflation. JSONB columns unchanged structurally.

**Verification:**
- All `Expected:` lines above hold. Specifically:
  - `_stats.event_count` and `entities` count = 7.
  - `_stats.emission_site_count` = 13.
  - All `jsonb_typeof` results = 'array' (NOT 'string') for both JSONB columns.
  - Re-run produces no count drift.
- PASS condition: every probe matches the expected value; idempotency holds.
- FAIL condition: count drift, JSONB columns stored as string scalars, or any `unrecognized_*` stats non-empty (which signals the XSD or source emission set has drifted from the locked anchors).

**Execution mode:** `inline` -- shell + SQL probes; the operator runs them directly at phase boundary. No code synthesis.

## Verification (phase boundary)

The operator runs these probes at the end of Phase 6 to confirm it landed correctly. YES/NO answers per D16.

- [ ] **Probe 1 -- handler file present and clean import:**
  ```bash
  test -f apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py && \
  python3 -c "import sys; sys.path.insert(0, 'apps/qw-oracle/scripts/extractors/ktx'); sys.path.insert(0, 'apps/qw-oracle/scripts/extractors'); from _handler_match_events import KtxMatchEventsHandler; print('ok')"
  ```
  PASS condition: prints `ok`. FAIL condition: import error or file missing.

- [ ] **Probe 2 -- handler discoverable in extract.py:**
  ```bash
  python3 apps/qw-oracle/scripts/extractors/ktx/extract.py --help | grep match_events
  ```
  PASS condition: returns at least one match. FAIL condition: handler not registered.

- [ ] **Probe 3 -- TS surface compiles:**
  ```bash
  cd apps/qw-oracle && bunx tsc --noEmit
  ```
  PASS condition: exits 0. FAIL condition: any type error.

- [ ] **Probe 4 -- AST JSON shape correct:**
  ```bash
  python3 apps/qw-oracle/scripts/extractors/ktx/extract.py --version head --handlers match_events
  jq '{event_count: ._stats.event_count, emission_site_count: ._stats.emission_site_count, expected_event_count: ._stats.expected_event_count, expected_emission_site_count: ._stats.expected_emission_site_count}' apps/qw-oracle/scripts/extractors/ktx/output/ktx-match-events-ast.json
  ```
  PASS condition: `event_count` = `expected_event_count` = 7 AND `emission_site_count` = `expected_emission_site_count` = 13. FAIL condition: any drift.

- [ ] **Probe 5 -- DB row counts at KTX head:**
  ```sql
  SELECT
    (SELECT count(*) FROM entities WHERE project = 'ktx' AND type = 'match_event') AS entity_count,
    (SELECT count(*) FROM match_event_versions v JOIN entities e ON e.id = v.entity_id
     WHERE e.project = 'ktx' AND e.type = 'match_event') AS version_count;
  ```
  PASS condition: both counts = 7. FAIL condition: any drift.

- [ ] **Probe 6 -- JSONB binding compliance (D14 regression gate):**
  ```sql
  SELECT count(*) FROM match_event_versions v
  JOIN entities e ON e.id = v.entity_id
  WHERE e.project = 'ktx' AND e.type = 'match_event'
    AND (jsonb_typeof(v.attributes_json) <> 'array'
         OR jsonb_typeof(v.emission_call_sites_json) <> 'array');
  ```
  PASS condition: returns 0 (every row's JSONB columns are arrays, not string scalars). FAIL condition: returns >0 -- D14 violation; loader was pre-stringifying.

- [ ] **Probe 7 -- emission-site totals match F14:**
  ```sql
  SELECT sum(jsonb_array_length(emission_call_sites_json)) AS total_sites
  FROM match_event_versions v JOIN entities e ON e.id = v.entity_id
  WHERE e.project = 'ktx' AND e.type = 'match_event';
  ```
  PASS condition: `total_sites` = 13 (matches F14 anchor). FAIL condition: any other value.

- [ ] **Probe 8 -- idempotency (D15):**
  Re-run `bun apps/qw-oracle/scripts/load-knowledge/index.ts load-version --project ktx --version head`. Re-run probe 5. PASS condition: counts unchanged (still 7 + 7). FAIL condition: counts inflated (loader is not idempotent).

- [ ] **Probe 9 -- dual-row design preserved (F17):**
  ```sql
  -- format_string stores the v17 escape-preservation contract: literal
  -- backslash-t bytes (NOT tab characters). The regex match operator (~)
  -- avoids LIKE's escape-character ambiguity. SQL string '\\\\' parses to
  -- 2 backslash chars (standard_conforming_strings=on, modern Postgres
  -- default); regex '\\\\' matches one literal backslash, so '^\\\\t\\\\t<event>'
  -- matches '\t\t<event>' as the literal 5-character sequence at start of
  -- the string.
  SELECT count(*) AS xml_logfile_rows
  FROM log_template_versions v JOIN entities e ON e.id = v.entity_id
  WHERE e.project = 'ktx' AND e.type = 'log_template'
    AND v.channel = 'logfile'
    AND v.format_string ~ '^\\\\t\\\\t<event>';
  ```
  PASS condition: `xml_logfile_rows` >= 7 (Phase 2's printf-handler still emits one row per unique format string for XML-shaped log_printfs; the count varies because format strings dedupe across emission sites that share identical structure). FAIL condition: `xml_logfile_rows` = 0 -- Phase 6 accidentally added a filter that suppresses the dual rows.

If all 9 probes PASS, Phase 6 is complete. If any FAIL, consult Recovery below.

## Outputs to next phase

Phase 7 (validation) inputs:
- `entities` holds 7 `(project='ktx', type='match_event')` rows.
- `match_event_versions` holds 7 corresponding per-version rows with structured JSONB `attributes_json` + `emission_call_sites_json` columns.
- `_handler_match_events.py` is registered in KTX driver's `ALL_HANDLERS` and runnable via `--handlers match_events`.
- `load-match-events.ts` + `upsertMatchEventVersion` + dispatcher wiring in place; loader is idempotent (D15) and D14-compliant.
- The qw-event-log validation harness's Layer 1 anchor for KTX match-events (entity rows + per-XSD-complexType attribute schemas + per-emission-site source citations) is fully populated. The harness is unblocked at the schema level.

Phase 7's tasks include adding `F1` quality-grid probes for the new `match_event` kind (mirrors the per-kind probes for cvars / commands / info_keys / log_templates / etc.) AND adding a dedicated `F1.jsonb_columns_not_strings` extension covering both new JSONB columns. Phase 7's cross-project audit confirms no Phase 6 change broke any prior-engine probe.

## Open questions / deferred items

- **Question:** D3 (locked decision) says "All KTX handlers ... inherit from `extractor_lib._visitor.Visitor` ONLY." Spec 5.6.c (line 1380) says the match_event handler "Does NOT inherit from `Visitor` (the XSD pattern doesn't fit the libclang Visitor lifecycle)." These conflict.

  **Default chosen for now:** Spec 5.6.c wins per D1 ("design spec is the source of truth -- do not relitigate"). Phase 6's handler stands alone (no Visitor inheritance, no Visitor import) but ships duck-typed no-op stubs of the Visitor lifecycle methods so extract.py's per-handler dispatch loop works without modification. D3 prose covers the cross-codebase port rule generally; spec 5.6.c carves out an exception for this lone XSD-driven handler. Treating "inherit ONLY from Visitor" as "if you inherit, only inherit from Visitor (not from a parent-project handler)" reconciles the two: D3 forbids inheritance from MVDSV/ezQuake/FTE/QWCL handlers; spec 5.6.c says match_event doesn't need any inheritance.

  **Who can resolve:** operator. If the operator wants D3 amended explicitly (rather than carrying this implicit reconciliation), the amendment lands in `decisions.md` as a dated block under D3 ("Amendment 2026-05-05 (Phase 6 drafter): match_event handler is the lone exception; XSD-driven handlers stand alone with duck-typed Visitor lifecycle stubs").

- **Question:** Spec 5.6.b's regex literal is `log_printf\(\s*"\\\\t\\\\t\\\\t<(\w+)>` (3 backslash-t pairs in the FIRST quoted literal). Live source's active emissions use a multi-line wrapper shape (2 backslash-t pairs in the FIRST literal `"\t\t<event>\n"`, 3 in the SECOND `"\t\t\t<event_name>\n"`). The spec's regex would match the LEGACY single-line shape (commented-out at items.c lines 213, 555, 1019, 1295, 1550, 1714, 2536) but NOT the active multi-line shape. Reproducing F14's locked count anchor of 13 emission sites requires a regex that matches the multi-line shape.

  **Default chosen for now:** Use the multi-line regex `r'log_printf\(\s*"\\t\\t<event>\\n"\s*\n\s*"\\t\\t\\t<(?P<event_name>[a-z_]+)>'` (re.MULTILINE) -- matches live source and produces 13 sites per F14. The spec's literal regex is documented as a deviation; live source wins per the arc's source-walk discipline ("phase MD drafters MUST source-walk during draft, not paraphrase the spec" -- review-findings.md commendations section).

  **Who can resolve:** operator. If this needs to land as a formal amendment, the amendment goes under spec 5.6.b ("Amendment 2026-05-05 (Phase 6 drafter): live source uses multi-line wrapper; regex literal updated to `log_printf\(\s*"\\t\\t<event>\\n"\s*\n\s*"\\t\\t\\t<(\w+)>` with re.MULTILINE flag"). F17's amendment block would also expand to capture this distinction.

- **Question:** The user-prompt recon hint named "5 distinct simpleTypes" in the XSD. Live source has only 4 named simpleTypes: `maxed_integer`, `iptype`, `modetype`, `porttype`. The 5th is unaccounted for.

  **Default chosen for now:** Record only the 4 named simpleTypes the live XSD declares. The handler's per-attribute `constraint` field is `null` for XSD primitives (`xs:decimal`, `xs:string`, `xs:nonNegativeInteger`, `xs:boolean`) and the resolved restriction dict for named simpleTypes (per spec 5.6.c's `{"name":"time","type":"xs:decimal","constraint":null}` example). The phase MD's `_stats.named_simpletype_count` records 4 against an explicit anchor; the operator notices any future drift.

  **Who can resolve:** operator. If the recon hint was based on counting XSD primitive types as distinct types (xs:decimal / xs:string / xs:nonNegativeInteger / xs:boolean + 4 named = 8, not 5), the hint had a counting bug; if there's an additional named simpleType the live XSD doesn't declare, that would warrant a Phase 6 amendment.

- **Question:** Phase 1's Pattern 6 `#define` lift is irrelevant to this XSD-driven handler (no C-source preprocessor work). Does the handler need any of Phase 1's foundation work?

  **Default chosen for now:** No. Phase 1 Inputs reduce to "migration 009 applied + match_event_versions table exists + entities.type CHECK admits 'match_event'." The Pattern 6 lift (D4) is an extractor_lib change that other phases consume; this phase does not import `_source.read_extent` or `_file_macros`.

  **Who can resolve:** n/a -- this is implementation-shaped, not a question awaiting decision.

- **Note (advisory):** Per-task execution-mode rough-cut is 1/7 subagent + 6/7 inline (~14% subagent). D18's >70%-inline-for-code-synthesis-phase smell does NOT apply here -- the bulk of code synthesis (Task 1: ~300 lines of Python with two-stage flow, simpleType constraint extraction, and containing_function heuristic) is correctly subagent-dispatched at Sonnet medium; Tasks 2 / 3 / 4 / 5 / 6 / 7 are mechanical edits with full content shipped inline (Task 5's loader is ~80 lines mirroring `load-log-templates.ts` mechanically; Tasks 3 / 4 / 6 are small additive insertions to existing files; Task 7 is shell + SQL probes). The qw-oracle Arc 1 inline-execution defect was inline-by-default for code-synthesis tasks; that is not the pattern here.

## Recovery (if verification fails)

- **Probe 1 fails (import error):** read the traceback. The likely cause is a missing import (forgot `import re` or `import xml.etree.ElementTree as ET`). Add the missing import; re-run.

- **Probe 2 fails (handler not registered):** check `apps/qw-oracle/scripts/extractors/ktx/extract.py`'s `ALL_HANDLERS` dict. Confirm `match_events` key + `KtxMatchEventsHandler` import. Re-run.

- **Probe 3 fails (TS errors):** read the type errors. The likely causes: `MatchEventVersionRow` not exported from `types.ts`; the dispatcher branch returned the wrong shape; `tx.json(...)` cast missing. Cross-check Tasks 3-6 inline content; re-run.

- **Probe 4 fails (event_count != 7 or emission_site_count != 13):**
  - If `event_count != 7`: the XSD parse failed to find all 7 events. Run the parse manually:
    ```bash
    python3 -c "
    import xml.etree.ElementTree as ET
    tree = ET.parse('research/repos/ktx/resources/extralog/ktxlog_0.1.xsd')
    root = tree.getroot()
    ns = {'xs': 'http://www.w3.org/2001/XMLSchema'}
    ktxlog = root.find(\"xs:element[@name='ktxlog']\", ns)
    choice = ktxlog.find('.//xs:choice', ns)
    for elem in choice.findall('xs:element', ns):
        print(elem.get('name'), '->', elem.get('type'))
    "
    ```
    Expected output: 7 lines. If fewer, the XSD is malformed at HEAD or the namespace prefix is wrong; surface to operator.
  - If `emission_site_count != 13`: the regex pass failed. Run:
    ```bash
    grep -c 'log_printf("\\t\\t<event>' research/repos/ktx/src/items.c research/repos/ktx/src/combat.c research/repos/ktx/src/client.c research/repos/ktx/src/logs.c
    ```
    Expected: items.c=10, combat.c=2, client.c=1, logs.c=0 (totals 13). If the totals are stable but the handler reports a different number, the handler's regex anchor is wrong; cross-check `EMISSION_RE`.
  - If `_stats.unrecognized_emissions` is non-empty: KTX added a new event type whose name is not in the XSD's events choice. Surface to operator -- this is a new-tag drift signal; either bump the XSD or add the new event_name explicitly.

- **Probe 5 fails (DB counts wrong):** check `extract-tag.ts` `ENTITY_JSON_FILES.ktx.match_event` entry; check `load-version.ts` dispatcher; re-run `bun ... load-version --project ktx --version head` and inspect logs for warnings.

- **Probe 6 fails (D14 violation -- JSONB columns stored as string scalars):** the loader is `JSON.stringify`ing one or both JSONB columns. Re-read Task 4 (`upsertMatchEventVersion`) and Task 5 (`buildMatchEventVersionRow`) and confirm: builder does NOT stringify; upsert wraps with `tx.json(...)`. Drop the table content (`TRUNCATE match_event_versions; DELETE FROM entities WHERE project='ktx' AND type='match_event';`), fix the binding, re-run the loader. **Idempotent migration** -- the schema is unchanged; only the row content was wrong.

- **Probe 7 fails (emission-site totals != 13):** the AST JSON had 13 sites (probe 4 passed) but the DB shows a different total. Likely cause: the loader's `emission_call_sites_json` field is not being persisted correctly (e.g., assigned `null` or `[]` instead of the AST array). Re-run with `LOG_LEVEL=debug` and trace the load.

- **Probe 8 fails (count inflation on re-run):** the loader is missing the ON CONFLICT DO UPDATE clause. Re-read Task 4 (`upsertMatchEventVersion`); confirm it has `ON CONFLICT (entity_id, version) DO UPDATE SET ...`. The `entities` upsert is owned by `upsertEntity` (existing function from Phase 1 / Phase 2); confirm it uses `ON CONFLICT (project, type, name)`.

- **Probe 9 fails (dual-row design broken):** Phase 6 accidentally added a filter to Phase 2's printf-handler. `git diff apps/qw-oracle/scripts/extractors/ktx/_handler_log_templates.py` should be EMPTY for this phase. Revert any accidental changes; F17's "do NOT filter" rule is locked.

If multiple probes fail in unrelated ways, suspect the migration: confirm `\d+ match_event_versions` matches the column list in Inputs, and that `entities.type` admits `'match_event'`. If the migration didn't run cleanly, Phase 1 must complete before Phase 6 retries.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F14** (match_event row count = 7 entity rows + 13 emission sites). Resolved by Task 1 (handler emits 7 entity rows from the XSD's events choice; 13 emission sites from the regex grep over 4 host files) + Task 5 (loader persists per-version rows including `emission_call_sites_json`) + Task 7 probes assert both counts.

- **F17** (Pass 1.7 printf-handler intentionally catches XML-shaped log_printfs; also emits emission_call_sites_json). Resolved by Task 1's docstring + Task 5's docstring (both explicitly state the dual-row design is intentional) + Probe 9 in the phase-boundary verification (asserts the dual rows survive). This phase deliberately does NOT modify Phase 2's printf-handler. Phase 8 lands the EXTRACTOR-PLAYBOOK note documenting the dual-row design for future maintainers.

---

## Verification sub-agent dispatch

Per `phase-template.md`'s "Verification sub-agent" template, the drafter spawns one sub-agent (Sonnet medium, Explore-shape) with the standard brief. The brief verifies F14 + F17 anchor reproduction, JSONB binding compliance, file paths, KTX source-line citations, finding ownership, execution-mode rationale, and pattern references. Findings under 400 words; CRITICAL / SUBSTANTIVE / ADVISORY shape.

---

*End of Phase 6 phase MD. Next phase: Phase 7 (validation -- F1 probes + JSONB regression gate + cross-project audit).*
