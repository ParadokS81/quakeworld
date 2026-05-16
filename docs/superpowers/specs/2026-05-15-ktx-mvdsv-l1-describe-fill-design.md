# KTX / MVDSV Layer-1 describe-fill -- design spec

**Status:** in progress (arc-brainstormer multi-pass). Created 2026-05-15 during Pass 1.
**Arc capture:** `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-fill.md` (locked conceptual model; not re-derived here).
**Grounding evidence:** `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/` (gap-findings + probe-0 denominators + coverage manifest).

## Purpose

Every admin-configurable KTX/MVDSV knob (cvars, commands, cmdline params,
info_keys) ends up with a sensible, provenance-stamped Layer-1 description.
That baseline is the single source of truth that the MCP, the Slipgate JSON
snapshot, a future web server-manager, and wiki.slipgate.me all render from,
and that the separately-docketed game-mode L3 concept notes cite as anchors.
This arc builds the foundation; it does not write L3 concept notes.

## Locked conceptual model (from the capture; do not relitigate)

- Single source of truth + generated projections (MCP / snapshot / web / wiki
  are render targets, never hand-edited).
- Three-tier description model: mechanical-extract from a real shipped
  artifact / source-synthesis from observable call-site behavior / opinion
  banished to L3.
- Provenance graduation path: a description is born synthesized, can graduate
  only on deliberate logged upstream adoption, de-duplicated so our own
  contribution cannot echo back as independent source truth.
- Staleness anchoring: a synth description is pinned to the source version it
  was written against and auto-flagged for re-review when the underlying
  extracted fact drifts.
- Hard L1-is-fact / L3-is-opinion boundary.
- KTX-first sequencing. The brainstorm sizes phases; it does not relitigate
  engine order or the locked model.

## Cross-cutting constraints (every phase respects)

- **C1 -- Completeness is non-negotiable; "undocumented" never means
  "unimportant."** The operating theory that important settings were already
  documented and the undocumented residue (the ~13% KTX-command gap, the
  cvar NULLs) is a deliberate dev judgement that they "do not matter for
  server admins" is explicitly distrusted. Closing that residue into a
  complete documented baseline is the entire reason this arc exists. No phase
  may scope-cut the residue on an importance argument
  (`feedback_exhaustive_mapping`). Genuine not-source-legible residue still
  gets a row and routes to the community-outreach track -- it is tracked, not
  dropped.
- **C2 -- Clear discrepancies are never auto-resolved; they are flagged for
  manual operator review.** Config-vs-config (nQuake vs in-repo), comment-vs-
  observed-behavior, config-vs-source: a clear conflict is surfaced to the
  operator, not silently picked. There will be some. Pass 3 designs the
  concrete drift/conflict policy on top of this constraint; the constraint
  itself is locked here.

- **C3 -- Presence is not liveness; L1 never asserts function for a
  runtime-dead knob.** A symbol the source registers is not thereby alive: a
  `Cvar_Register` sitting in an init function with zero callers is extracted
  and stamped `source_backed` exactly like a live one
  (primary-source-verified: `sb_qtvlist_url`; both the audit worker and the
  independent Opus-max reviewer read the source and missed it -- the blind
  spot is structural, not effort). The arc splits the problem the way the
  liveness work does. **Detection** ("registered in source, absent from a
  running build") is cheap and consumed here, not built here: the
  operator-captured runtime dump `qw-1.log` (2026-04-27; live KTX 1.47-dev +
  MVDSV 1.20-dev, Apr 11 2026 build; full `cvarlist` 733 + `cmdlist` 107/107)
  is cleaned (CRLF-normalize, case-fold both sides, `LC_ALL=C` sort, discount
  runtime-only `__k_ls_*` auto-generated cvars) and diffed against the
  same-version L1 extract to yield a **suspect pool, never a verdict**.
  **Classification** ("genuinely dead vs build/`#ifdef`-excluded") needs the
  libclang call-graph and is explicitly out of scope -- it is the parked arc
  `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`.
  Because every suspect still passes the D6 truthful-stamp guard and the D7
  human gate, **date-proximate pinning is sufficient for this arc** (a
  mispinned entry costs one extra human glance, never a shipped lie); the
  parked arc needs hash-exact pinning because it publishes the authoritative
  classification -- different consumer, different rigor bar. Sequencing:
  detection is a hard prerequisite for the synthesis/describe phases only; the
  mechanical-extract tier is liveness-agnostic and is not gated by it.

  C3 amends three earlier locks (explicit, not silent):
  - **D6 confabulation-guard sibling:** a suspect-pool knob does not get a
    confident "tunes X" description; it gets a truthful stamped one
    ("registered in KTX/MVDSV source at version N; not reachable in a running
    build at this commit; appears non-functional, candidate upstream code
    bug") and routes to the C1 upstream/community track -- same disposition as
    D8 residue.
  - **D4 new drift trigger (f):** "reachability classification changed for
    this knob." When the parked arc later reaches KTX/MVDSV and splits
    genuine-dead from build-excluded, the stamped rows re-review through the
    existing D4 walk-time report. The two arcs compose through D4 -- no
    blocking dependency, no duplicated mechanism.
  - **C2 new conflict class:** a shipped config that sets a cvar the runtime
    reports dead (probe-1 already saw the shape: `k_666`, `k_dm2mod` in
    ktx.cfg, absent from the current RegisterCvar set) is a flag-don't-resolve
    discrepancy under C2's existing mechanism.

  Tracked carry-forward (planner/executor, not a brainstorm shape question):
  confirm the L1 KTX/MVDSV extract commit is contemporaneous with the Apr 11
  2026 dump build before relying on the suspect pool; if drift is large, take
  a fresh dump at the extract commit.

  **Amendment 2026-05-17 (operator decision, arc-planner Phase 0 review --
  supersedes the detection-input mechanism above; explicit, not silent).**
  Verified live state that forced this: the loaded L1 extract is dev-head at
  stale commits (mvdsv `f816d28` 2026-01-04; ktx `da73e06` 2026-03-03), the
  research clones are frozen there, and `MVDSV 1.20-dev` / `KTX 1.47-dev` are
  constant dev strings so the version label cannot expose the ~3-month
  (mvdsv) / ~6-week (ktx) gap to the Apr-11 dump build. Decisive fact:
  QuakeWorld servers run **dev-head**, not tagged releases (the latest KTX
  release 1.46 is Sep-2025, older than our clone; the Apr-11 dump itself is a
  dev-head build) -- so a release-anchored or stale-extract-anchored KB
  describes config that is not what is deployed. Resolution: C3's detection
  input is **self-generated and reproducible**, not a frozen third-party
  capture. Phase 0 fetches the dev-head clones forward, builds mvdsv and
  ktx (both are C, both build via CMake -- the `mvdsv` binary plus the
  `qwprogs.so` mod it loads; no QuakeC, no fteqcc -- corrected 2026-05-17,
  see OQ-3 / the original "QuakeC via fteqcc" wording was a planner inference
  error, never source-verified), runs a local `mvdsv +gamedir ktx` server to
  capture a fresh `cvarlist`/`cmdlist` dump of that exact build, and
  re-extracts L1 from the same commit. Source extract, the runtime
  oracle, and the describe-fill substrate are then ONE build -- the
  contemporaneity problem is dissolved by construction, not caveated (the
  "same-version L1 extract" / "date-proximate pinning" / "fresh dump at the
  extract commit" wording above is moot; F-C3a is dissolved). The dump is now
  reproducible on every version-walk, which strengthens (does not change) the
  D4 trigger (f) mechanism. The 2026-04-27 `ciscon-1.20-dev` production dump
  is RETAINED as a secondary real-deployment cross-check, not the primary
  oracle. Unchanged: classification (genuine-dead vs build/`#ifdef`-excluded)
  is still the parked arc -- a local default-config build can still exclude
  symbols by build flag, and that is exactly the classification C3 defers;
  detection (presence in source, absence from the running build) is sound
  because `cvarlist`/`cmdlist` enumerate registrations independent of config
  values. Phase 0 carries a documented fallback so the arc is never blocked:
  the only missing build tool is `cmake` (gcc/make/git/bun/python3 present;
  `cmake` is apt-installable, a Task-0-shaped step); if `cmake` cannot be
  obtained in-loop or the local server harness proves intractable, fall back
  to fetch-forward-source + the retained production dump under the original
  date-proximate caveat. Downstream flag (Phase 5, not
  this section): D4's "~1-2 reviews/engine/year" assumed release cadence;
  under dev-head anchoring the re-dump+re-extract becomes a routine
  version-walk runbook step -- the staleness cadence is settled at Phase 5,
  not here.

- **C4 -- Repair by re-running the corrected pipeline, never a one-off SQL
  patch (Pass 5.2).** When any phase discovers that a pipeline bug (extractor,
  loader, synthesis skill, or projection serializer) corrupted committed rows,
  the fix is to correct the code and re-run the affected extracts/loads
  end-to-end -- never a targeted `UPDATE` that patches the visibly-wrong rows
  in place. Reason (`feedback_repair_by_reextract_not_sql_update`, real
  incident 2026-05-02): a hand-patch only repairs the damage that was noticed;
  the same bug typically also silently re-shaped rows that were not noticed,
  and a surgical SQL repair leaves those broken with no trail of how. Re-running
  from the source-of-truth artifacts regenerates every affected row cleanly and
  exercises the corrected path end-to-end. D9 already states this for the
  mechanical-extract tier ("idempotent re-extract"); C4 generalizes it to every
  tier this arc touches (synthesis rows, retained provenance, staleness
  anchors, projections). Narrow exception, same as the memory: re-extract
  genuinely impossible (source artifact lost, non-deterministic generator) ->
  a targeted repair is acceptable, logged, totals re-verified against the
  pre-fix baseline.

- **C5 -- Every new data shape this arc introduces earns an F1 quality-grid
  probe before the arc ships (Pass 5.2).** This arc adds four data shapes no
  existing regression probe watches: (1) the owned description text, (2) the
  origin tag (`source_inline` / `synthesized` / `shipped_doc`), (3) the
  retained multi-source provenance (D11), (4) the synthesized-description
  anchor version + staleness flag (D2/D4). Each gets at least one probe in the
  qw-oracle F1 quality grid that fails loudly on the structural failure mode
  for that shape -- e.g. a `synthesized` row with a NULL anchor version; a
  `shipped_doc` row with no provenance entry; an origin tag outside the allowed
  vocabulary; a description column holding a JSONB string scalar (the existing
  `F1.jsonb_columns_not_strings` pattern, extended). Reason: the arc's entire
  value proposition is a trustworthy, honestly-labeled KB; an honesty guarantee
  nothing mechanically enforces is hollow, and silent drift in any of these
  four would ship unnoticed to every consumer (MCP, snapshot, wiki, the D16 dev
  showcase). Phase-boundary gate, not a final-phase afterthought: a shape's
  probe lands in the same phase that first writes that shape.

### Lessons honored structurally (cross-reference, not restated as constraints)

The operator asked for the hard-earned ezQuake/MVDSV documentation lessons
carried into this arc as explicit constraints (arc capture). Pass 5.2 decision:
the genuinely-uncovered two are promoted above (C4 repair-by-reextract
arc-wide; C5 F1 probe per new data shape). The remaining named lessons are
already enforced by locked decisions and are deliberately NOT restated as
standalone constraints -- restating an already-enforced rule adds words, not
protection, and dilutes attention on the two that needed promotion. Lineage,
so arc-planner sees they were encoded, not dropped:

- **Exhaustive-mapping** (`feedback_exhaustive_mapping`) -- IS C1 verbatim
  (C1 cites it; "undocumented never means unimportant").
- **Comment-promotion revert / two-audience model**
  (`reference_ezquake_dual_doc_model`) -- enforced structurally by D2
  (`source_inline` is a dev comment, never laundered into a separate user-doc
  field), the D5 amendment (every entity evaluated; an existing comment is one
  input, never a verdict), and D9 (the mechanical parser never blesses
  candidate text -- everything flows to the D5-D8 evaluation).
- **Upstream-PR attribution** (`reference_upstream_pr_attribution`) -- locked
  inside D16 (the constraint that rides whatever PR eventually lands).
- **Source-truth dichotomy** (`project_qw_oracle_source_truth`, additionally
  honored) -- enforced by the locked conceptual model's hard L1-fact/L3-opinion
  boundary and D10's resolution hierarchy (source behavior is L1 truth; config
  comments are candidate descriptions; on disagreement source wins and the
  conflict is C2-flagged).

## Decisions log

### D1 -- Data boundary: configurable buckets only; no L3 prose (Pass 1.1)

This arc fills descriptions for every configurable bucket -- cvars, commands,
cmdline params, info_keys -- for KTX and MVDSV, including every mode-related
knob (the cvars and commands an admin sets to run or tune a KTX game mode).

It does NOT write the gameplay story of a mode. Mode narrative is L3 synthesis
owned by the separately-docketed game-mode concept-note arc
(`docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md`).

Reason: single source of truth, no dual maintenance. A cvar description is an
L1 fact written once on the cvar; a mode's character is L3 prose written once
as a concept note that cites those same L1 cvars. Writing the mode story into
L1 too would duplicate knowledge across two homes and let it drift -- the
exact failure the single-source-of-truth model exists to prevent.

The 27 KTX game_mode catalog rows and 317 mode_default overlay rows in
`gameplay_mechanics` are out of scope: they are not a bucket of knobs. An
overlay row records "mode X sets cvar Y to value Z" and points at a cvar that
is already in the cvar bucket and gets its description here. Every actual knob
is a cvar or command this arc describes; nothing falls through. KTX absorbing
modes as a code blob only means KTX has more mode-related cvars/commands than
ezQuake -- all in the in-scope buckets.

Consequence for the provenance schema: it governs the `entities` table
descriptions only (KTX/MVDSV cvars, commands, cmdline params, info_keys). It
does not model provenance for `gameplay_mechanics`, which by design has no
`description_origin` column (structurally extracted; provenance via
`source_ref` + `props_json`).

### D2 -- Origin-state model: this arc creates the user-doc track KTX/MVDSV never had (Pass 1.2)

Framing (load-bearing, clearer than the capture doc): ezQuake is the only
engine with a user-facing documentation track (help-JSON), owned in its own
repo. KTX, MVDSV, FTE, QWCL have no user-doc track -- only dev code comments.
This arc creates the missing user-doc track for KTX and MVDSV, owned by us in
qw-oracle Layer 1 because upstream never wrote one. It is NOT a docs.json
clone: (a) it is the track plus provenance discipline (ezQuake help-JSON has
no origin/staleness tracking -- the cause of its 156 unwatched stale
references); (b) it is built to graduate upstream via the locked graduation
path, not to fork forever. FTE/QWCL are later arcs on the same engine-agnostic
pattern.

Origin-state model:

- `source_inline` -- unchanged. Means a KTX/MVDSV developer wrote this as a
  code comment. KTX/MVDSV have no help-JSON, so the comment is the only source
  surface and labeling it `source_inline` is correct -- this is NOT the
  ezQuake comment-promotion bug (that bug was laundering a comment into a
  separate user-doc field; KTX/MVDSV have no such field to launder into).
- One NEW tag for "lifted mechanically from a shipped human-written file"
  (in-repo ktx.cfg / nQuake ktx.cfg / mvdsv.6 man page). Which file is
  recorded in a separate provenance field, not its own tag (the
  nQuake-vs-in-repo conflict policy needs the file identity anyway; tag-per-
  file would bloat the vocabulary). Exact label + file field deferred to Pass 3.
- `synthesized` -- LLM-written from observable code behavior. Plus two
  per-row tracking fields built now (state that changes over time, so fields
  not tags): anchor version (which source version it was written against);
  re-review flag (auto-set when the underlying extracted fact drifts). The
  upstream-frozen marker is NOT built now -- see D3 (graduation deferred); it
  is a noted future hook, not a column.
- Opinion -- no tag; absent from L1 by the locked boundary.

Carry-forward to Pass 2: whether a given dev code comment is actually good
enough to serve a *user* (trust-but-verify) is the Pass 2 quality-bar / review-
gate question, not a Pass 1 schema question.

### D3 -- Upstream graduation deferred to a future deliberate procedure (Pass 1.3)

Graduation (synthesized text adopted upstream, then de-duplicated so it cannot
echo back as independent source truth) stays in the locked conceptual model
but its infrastructure is NOT designed or built in this arc. Reason: nothing
can self-echo until the operator has presented to the KTX/MVDSV dev group and
a deliberate manual adoption procedure has run -- building an automatic guard
now is infrastructure for an event that may not happen (premature complexity).

Pass 1 leaves only a non-boxing hook: `synthesized` is a distinct tag carrying
an anchor version, so a future procedure can identify "these entries are ours,
written against version X" and act deliberately. No upstream-frozen column, no
content-hash contribution ledger now. If/when graduation becomes real, it is
its own scoped piece of work (Pass 5 deferrable tail names it; does not design
it).

The one drift case that IS our-part now -- a maintainer independently writes a
genuine source comment for a knob we synthesized, with zero action from us --
is plain version drift, not graduation. Handled under staleness (Pass 1.4),
not the graduation machinery.

### D4 -- Staleness = a walk-time report, operator-reviewed in-terminal (Pass 1.4)

Each synthesized description stores the source version it was written against
(anchor version, D2). The per-version re-extract/ingest -- which already runs
when a new KTX/MVDSV version is walked -- compares each synthesized
description's knob against its anchor and produces a **walk-time report**,
baked into the new-version runbook. The report has three sections:

1. **Drifted** -- synthesized descriptions whose underlying facts changed vs
   the anchor. Trigger list (tight, nothing looser, so a flag means
   something): (a) default value changed; (b) type changed; (c) set of valid
   values / enum choices changed; (d) knob retired or renamed; (e) a genuine
   upstream source comment newly appeared for it. Read-site moves, cosmetic
   refactors, and unrelated nearby changes are explicitly NOT triggers.
2. **Added** -- new knobs with NULL description (need writing). Falls out of
   the same exhaustive N/M coverage count that drives the whole arc; no
   judgement call.
3. **Removed** -- knobs retired/renamed at the new version; their description
   is now orphaned and routes to the existing source_state transition
   handling.

Review model: the operator reviews the report in this terminal at walk time;
re-review is a manual confirm-or-rewrite pass (Claude proposes, operator
approves -- same model as the rest of the arc), operator-paced, not auto-edit
and not a notification system. A flagged description keeps serving, stamped
"may be stale as of version X" -- stale-but-present beats a hole. This is the
same auto-flag-on-drift property concept notes already have via typed anchors.

Cadence makes this sustainable: KTX ships ~1 tagged release/year (1.46
2025-09, 1.45 2025-02, 1.44 2024-10, 1.43 2024-03, 1.42 2022-11); MVDSV ~1-2/
year. ~1-2 review events per engine per year.

Explicitly an intermediary solution. Future non-blocking hook (NOT this arc):
a visual monitoring website replacing in-terminal report review once the
broader system is coherent.

### D5 -- Quality bar + cheap-classify triage of existing comments (Pass 2.1)

A description is good enough to serve a user when it: (1) says WHAT the knob
does in admin-observable terms, not WHY the code does it; (2) is not a
restatement of the knob's own name; (3) spells out units / enum meanings where
they exist; (4) is mechanism only -- no recommended value, no opinion (the
locked L1/L3 line); (5) is self-contained without reading source.

Existing `source_inline` dev comments (~87% of KTX commands, a chunk of
cvars) are neither blind-trusted nor all hand-read. A cheap classification
pass grades each against the rubric: clears it -> kept as-is, origin stays
`source_inline`; fails it (coder-rationale / tautological / cryptic /
opinion-laced) -> flagged for synthesis (becomes `synthesized` + anchored).
The classify pass is the cheap probe that sizes the real synthesis workload
instead of guessing it (cheap-probe-then-informed-pass; dual-doc lesson that a
code comment is coder-WHY by default and user-WHAT must be judged).

### D5 amendment -- no presumptively-covered bucket; evaluate every entity (Pass 2, post-close)

A trailing comment does NOT place an entity in a "documented / done" bucket.
Most KTX/MVDSV trailing comments are dev-to-dev rationale, not user docs
(dual-doc reality). Every entity -- with or without a comment -- is evaluated
equally for whether it warrants our own owned user-facing description. The
existing comment is one input to that evaluation, never a verdict.

- Comment genuinely reads as a user description -> adopt it; tag stays
  `source_inline` (honest: dev's own words, no separate user-doc field to
  launder into) but it is affirmed-by-evaluation, not skipped.
- Comment is dev-rationale / weak / absent -> synthesize ours ->
  `synthesized` + anchored.

The D5 cheap-classify step routes EFFORT (good comment = fast affirm; weak or
absent = full Opus-max synthesis); it does NOT exempt anything from
evaluation. Coverage = "every entity evaluated and carrying an owned,
affirmed-or-synthesized description," never "had a comment so counted."
Reinforces C1 and the dual-doc model; supersedes the "clears the bar -> kept
as-is, no rework" phrasing in D5.

### D6 -- Synthesis is delivered as a guardrailed skill (Pass 2.2)

The judgment + synthesis is a dedicated per-knob skill, on the proven
`asset-type-curate` / `guide-rewrite` / `validate-extractor` precedent (hard
pre-flight, enforced rules, sub-agent fan-out). It is the unit later phases
fan out over. The skill hard-codes: the D5 quality-bar rubric as the
keep-vs-synthesize judgment; the read-site-grounding method (input is code
use-sites, never the knob name); the evidence requirement (`source_ref`
file:line + anchor version on every synthesized row, reusing existing
mechanisms -- no new citation format); the hard confabulation guard (not
source-legible -> hedge or route to residue, never guess). The brainstorm
settles that the skill exists and what it enforces; the skill's prose is
arc-planner/executor work.

### D7 -- Two-tier review gate with Opus-max dials (Pass 2.3)

Gate before a synthesized description commits:

1. **Automated evidence re-check, every row, load-bearing.** An independent
   verifier (separate invocation, not the authoring context) confirms each
   cited `source_ref` file:line actually exhibits the claimed behavior and the
   text passes the D5 rubric mechanically. Fail -> bounced to re-synth or
   routed to residue. Applies the verify-dispatched-claims discipline at scale.
2. **Operator batch approval on the tail only** -- hedged ones, residue-routed
   ones, and a spot-check sample of the auto-passed bulk. Propose/approve
   model, operator-paced.

Model/effort dials (locked, operator decision): synthesis pass = the D6 skill
at **Opus 4.7, max reasoning**; review pass = an **independent Opus 4.7 at
max**. Rationale: the genuine synthesize-from-source corpus is bounded (~47
KTX CD_NODESC + ~65 non-bot KTX cvars + ~80 MVDSV commands + triage-failed
comments; MVDSV-cvar slice gated on the Pass 3 ezquake.com probe), much of it
routing to residue. A low-reasoning first pass is false economy on the one
thing that must be correct; cost is modest at this volume
(`feedback_best_tool_no_overkill`, Opus-MAX ceiling for hardest reasoning).

### D8 -- Bot/judgment-tier cvars: mechanism-only is complete L1 (Pass 2.4)

Bot-skill and judgment-tier cvars (~38 `k_fbskill_*` etc.) get no special
exclusion. "Documented nowhere" means no prose source, not source-illegible --
the bot-AI use-sites show what they do. They go through the same D6 skill,
mechanism-only ("controls the bot's RL accuracy weighting; higher = more
accurate"). That satisfies the success criterion: the criterion is "describes
what the knob does," never "recommends a value." These count as fully
described, not degraded. The recommended-value / tuning advice is L3 by the
locked boundary -- routed to an L3 candidate, and its absence does NOT count
as an L1 gap. Genuine residue is only the tail whose behavior is not
source-legible even at Opus-max (D6 confabulation guard) -> Pass 5
community-outreach, tracked, not blocking.

### D6/D7 amendment -- research documents are admissible aids (Pass 2.4)

Both the authoring skill (D6) and the independent reviewer (D7) may use the
landscape research documents -- `docs/superpowers/parking/2026-05-15-ktx-
mvdsv-doc-landscape/` probe-0..5, gap-findings, coverage manifest, and the
shipped-config corpus -- as aids to locate use-sites, corroborate, and
cross-check. This does not loosen grounding: source stays ground truth, and
the committed `source_ref` file:line + anchor version remain the evidence on
the row (source-truth dichotomy). Research docs speed and check the work; they
are not a substitute citation.

### D9 -- Mechanical extractor is a pure structured-lift; zero quality verdict (Pass 3.1)

The shipped-config mechanical-extract tier is a new sibling extractor handler
(its own AST JSON output + loader adapter, same plug-in pattern as every other
handler per `feedback_exhaustive_mapping`; the `mvdsv.6` roff man page is a
sibling parser -- same tier, same emit shape). It is NOT folded into the
existing KTX cvar registration handler: that handler harvests `source_inline`
call-site comments; this is the separate owned user-doc track (D2). It fills
description fields on cvar rows that already exist from the libclang
registration walk; it never creates entities. Idempotent re-extract
(`feedback_repair_by_reextract_not_sql_update`).

Emit, per (cvar, source-file) pair:

- the description text the config author wrote;
- structured choices kept structured -- `{value,label}` enum tables and
  bit-mask flag tables emitted as data, never prose-flattened (re-extract is
  cheap, but flattening now forces a re-extract later for the GUI/web-manager
  consumer; no reason to take that debt);
- the shipped value carried as data but NOT written as the source default
  (config opinion; 3.2 owns the conflict/opinion policy);
- source-file provenance (feeds 3.3).

One record per (cvar, source-file): in-repo-vs-nQuake drift is preserved as
data, never merged at extract time. Forced by C2 (never auto-resolve) + D2
(file in a provenance field); 3.2 designs the resolution on top of it.

Input boundary: the tier consumes only the `coverage.ndjson`
"mechanical"-classified sources. The "LLM-assisted" / "hand-curate" surfaces
(bare-`set` usermodes, `SETUP_FFA_CTF.txt`, installer prose) are NOT fed here
-- they route to the D6 synthesis skill or the C1 residue track. Keeps the
extractor a deep, dumb, exhaustive lift and makes its exhaustive denominator
precise (C1).

The seam (load-bearing, operator-confirmed): the extractor harvests structured
facts + candidate description text + provenance and **stops**. It does NOT
judge whether the text is good enough to be the user doc. Every harvested
candidate -- and every comment-less cvar -- flows to the D5-D8 evaluation,
which decides affirm-as-is vs synthesize-ours per the D5-amendment ("no
presumptively-covered bucket; evaluate every entity"). No first-pass "comment
looks fine" affirmation in the parser: a shipped-config `//` comment is the
config author's gloss, not a vetted user doc (dual-doc lesson); a parser
blessing text re-introduces the "had a comment so it counts" trap C1 and the
D5-amendment exist to kill, and hides the affirm/synthesize call from the D7
gate. The volume "saved" is exactly what D5's cheap-classify step is built to
route cheaply.

### D10 -- Drift/conflict policy: three classes, source-grounded, resolved inline at the D7 tail (Pass 3.2)

Built on C2 (clear discrepancies are never auto-resolved). Three classes,
distinct dispositions:

- **Value differences** (`sv_maxrate` 50000/500000, `maxclients` 32/8,
  `k_exclusive` 0/1, ...): a distribution's chosen value is config opinion,
  not an L1 fact. The two configs agree on what the knob *does*; only the
  shipped value differs. Not an L1 conflict -- L1 takes the shared behavior
  description; the differing values become an L3 "nQuake ships X, in-repo
  ships Y" recommended-value note. The locked-model "config opinion -> L3"
  applied concretely; most apparent conflicts dissolve here.
- **Meaning conflicts** (`k_noframechecks` polarity-label inversion; the
  `sv_antilag` cross-fork case): the description of what the knob does
  genuinely differs. Source is the tiebreaker (source-truth dichotomy); per C2
  the conflict is surfaced to the operator with the source evidence, never
  auto-picked. Cross-fork divergence (different codebase, not different config
  file) is NOT a fourth class -- it collapses into this one. No fork-aware
  provenance schema: the antilag-named entity surface is identical across
  mainline and the `dusty-*` fork (both register `sv_antilag` / `k_vp_antilag`
  and the `antilag` command; the MVDSV engine side is line-identical), so the
  divergence is one entity's *meaning*, not a divergent entity set.
- **Membership drift** (nQuake-only / in-repo-only; `sv_antilag` in-repo,
  omitted by nQuake): not a conflict -- union coverage, provenance records
  which file documented it. A deliberate omission is L3 operational context,
  not missing L1 data.

Resolution hierarchy: source behavior is L1 truth; config comments are
candidate descriptions; on disagreement, D6 source-grounded synthesis produces
the L1 text and the disagreement is flagged (C2).

Mechanism (operator decision -- inline): a meaning-conflict is resolved at
author-time -- the describe step proposes the source-grounded description and
the operator confirms it in the **same D7 review tail** as everything else. No
dedicated conflict queue, no separate batch pass: one workflow, source
evidence still in hand. A conflict that *changes* across versions re-surfaces
through the existing D4 walk-time report (composes via the C3 trigger family).
Reuses existing gates; adds no machinery.

`sv_antilag` worked example (primary-source verified this session): mainline
`ktx` has no `antilag.c`; `sv_antilag` is a thin passthrough toggled 0<->2,
"on" tested as `== 2`. `dusty-ktx` ships a 783-line `antilag.c` plus
weapons/client/vote changes; its antilag engages at `== 1`, vote increments
multi-mode. Same cvar name, different meaning per build, both deployed on
different port ranges. The L1 description is explicitly dual and never
collapsed to one value.

Carry-forwards surfaced (formalized at Pass 3 close):
- **Part B -- extract the `dusty-*` antilag fork into L1.** Separate future
  arc, reshaped: a behavior/description fork (shared entity names, divergent
  meaning), NOT an entity-set fork. arc-classifier sidequest + HANDOVER; cheap
  probe first to size the divergent-behavior surface (honest bound: only the
  antilag-named surface was verified this session).
- **Case-sensitivity loader arc -- soft output-fidelity dependency.**
  Descriptions land on a key the loader currently lowercases, so they project
  as `loadfragfile` not `loadFragfile`. Never blocks the work; resolves by
  re-projection when that arc lands, zero description rework. The fix is
  already a tracked, ready-to-execute mini-arc (loader-only fold-key column,
  no re-extraction) --
  `docs/superpowers/parking/2026-05-16-l1-entity-name-case-fidelity-miniarc.md`.
  Sibling to the C3 <-> reachability compose relationship.

### D11 -- Provenance + decision-trail shape; review via the audit-review HTML pattern (Pass 3.3)

Closes the D2 carry-forward (exact origin label + file-provenance field).

- **New origin tag: `shipped_doc`** (parallels `source_inline` /
  `synthesized` / ezQuake-only `help_json`). One tag for "mechanically lifted
  from a shipped human-written artifact" -- in-repo/nQuake `ktx.cfg`,
  `mvdsv.cfg`, `port_template.cfg`, the `mvdsv.6` man page. Not tag-per-file
  (D2: avoids vocabulary bloat); file identity lives in the provenance below.
- **Structured multi-source provenance, retained (operator decision -- option
  A).** Every contributing shipped file is kept on the record: file path,
  line, the value that file shipped, the raw comment text. The committed
  description's citation (`source_ref`, D6's existing mechanism -- no new
  citation format) points at the authoritative entry; alternates are retained
  as data, never discarded. Forced by D9 (one record per cvar+file, drift is
  data) + C2 + D10 (a conflict cannot be flagged, nor re-detected across
  versions by D4, if the losing source was dropped at load).
- **Decision trail is first-class, not ephemeral (operator requirement: "we
  don't want just the result, we want the reasoning so we can review it").**
  Each evaluated entity carries the established audit-review column family:
  `verdict` (affirm `source_inline` / synthesize / conflict-resolution /
  route-to-residue / flag-dead), `confidence`, `reasoning` (the why),
  `proposed_desc` (the result), alongside the structured provenance. D6 emits
  the reasoning; it is stored, not just logged.

Review surface: the D7 operator-tail batch approval is performed on a
generated **`cvar-audit-review.html`-pattern page** (sortable/filterable
table; the same `name / source_file / verdict / confidence / reasoning /
proposed_desc` column family as the 2026-05-15 ezQuake cvar-provenance audit
artifact), not raw terminal output. Consistent with the locked
single-source-of-truth model: the audit page is a generated projection of the
structured record, never hand-maintained.

Amends D7: "operator batch approval on the tail" is concretely the
audit-review HTML page above; Claude proposes, operator approves/overrides per
row.

Carry-forwards (formalized at Pass 3 close):
- The audit-review HTML exists as a 2026-05-15 artifact; its generator was
  not found under `apps/qw-oracle/scripts` -- locating/standardizing the
  generator (or emitting the page from the structured record) is
  arc-planner/executor scope, not brainstorm.
- The review surface as a generated projection of the single-source record
  feeds Pass 4 (multi-projection data contract): the audit-review page is one
  projection; MCP / snapshot / wiki / web-manager are others, all serialized
  from the same structured record.

### D12 -- Cheap-probe bundle is arc Phase 0; contained, not a pre-arc sidequest (Pass 3.4)

Operator decision (containment + momentum over a separate pre-arc
workstream): the three cheap probes run as **arc Phase 0**, inside the arc.
arc-planner scaffolds the later MVDSV-cvar phases against Phase 0's output --
a first phase that sizes later phases is normal arc-planner work
(phase-boundary + per-phase verification regime); it does not block
scaffolding the arc shape or the KTX-side phases, which are not probe-gated.

Phase 0 bundle:

1. **ezquake.com shape-quantification** (gap-findings #1). Fetch
   ezquake.com/docs/settings/server.html, cross-match vs MVDSV M=183, and
   measure the *shape* of the overlap, not a headline count. Verified
   architecture (slime, `reference_ezquake_dual_doc_model`): ezQuake imports
   MVDSV `sv_*` for its embedded local server, so ezquake.com is a real
   source for the `sv_*` subset it exposes -- but contributes **zero** to KTX
   `k_*` (no KTX in ezQuake) and is expected thin on dedicated-server-only
   MVDSV cvars (qtv / demo / master / server-antilag) that local play never
   exercises. The probe reveals that shape so the MVDSV-cvar phases are sized
   correctly (easy common `sv_*` vs the hard dedicated tail that routes to D6
   synthesis / C1 residue). ezquake.com is a `shipped_doc`-class source
   (D11); the artifact URI is recorded in the provenance field -- one tag,
   provenance disambiguates (D2 vocabulary discipline; no new origin value
   for a hosted-vs-repo distinction).
2. **C3 runtime-dead detection diff.** Clean `qw-1.log` (CRLF, case-fold
   both sides, `LC_ALL=C`, discount runtime-only `__k_ls_*`), diff vs the
   same-version L1 extract -> the C3 suspect pool. Phase-0 placement
   satisfies C3's "hard prerequisite for the synthesis/describe phases."
3. **`load-commands.ts` one-line fix** (gap-findings #2). Verified root
   cause, no re-extract; frees 28/108 MVDSV commands. First task, free win.

Probe -> triage -> informed-pass (`feedback_cheap_probes_inform_expensive_passes`)
realized at arc scale: Phase 0 is the probe, Phase 1 the triage, the
synthesis phases the informed pass.

### D13 -- Multi-projection contract: two-tier serialization over the single D11 record (Pass 4.1)

The locked single-source model already settles "one schema, N serializers" --
nothing is stored twice; every consumer reads off the one D11 record
(description + origin tag + anchor/staleness + structured choices + retained
multi-source provenance + verdict/confidence/reasoning trail). Pass 4.1 locks
WHERE the projection line sits: a two-tier split by audience.

- **Public projection** (MCP, Slipgate JSON snapshot, future web
  server-manager, wiki.slipgate.me): description text + origin tag
  (`source_inline` / `synthesized` / `shipped_doc`) + anchor-version /
  "may be stale as of X" stamp + type + default + the D9 structured
  choices/flags as data. The honest LABEL rides to every consumer (the D2
  point); structured choices stay structured for the GUI/web-manager (D9).
- **Internal projection** (`cvar-audit-review.html` only): the public set
  PLUS confidence + reasoning + verdict + the full multi-source provenance
  including losing alternates (the nQuake-vs-in-repo variant not chosen).

The embedding input is itself a serializer -- prose description plus a
text-flattened rendering of the structured choices so a "what values can X
take" query still retrieves -- a serializer config, NOT a separately stored
shape. "What goes into the embedding" is therefore not a schema decision.

Reasoning (operator-confirmed, strengthened in-pass): public consumers need
the honest label (origin + staleness), not the audit trail; an LLM answering
via MCP does not want a confidence float and a reasoning paragraph in context,
a wiki reader does not want the rejected config variant. That content serves
exactly one consumer -- the operator at the D7 review tail. Operator named the
long-term goal ("present it, help create a proper documentation strategy for
KTX/MVDSV"): the internal tier is precisely that evidence package -- our
description plus every shipped config cross-referenced plus the source
behavior grounding it. Same record, two audiences: consumers get the labeled
fact; the upstream pitch gets the full provenance + grounding trail. This
makes the D11 trail do double duty and concretely realizes D3's non-boxing
hook (the `synthesized` tag + anchor version + retained provenance record are
exactly what a future deliberate adoption procedure presents) -- no extra
machinery, D3 stays deferred.

Rejected alternative: honest-labeling-maximalist (surface confidence +
reasoning in the public projections too). The origin tag + staleness stamp
already discharge the D2 honesty obligation; leaking the trail bloats every
other consumer for the one reviewer's benefit. Audience, not honesty, is the
line.

### D14 -- Wiki-feed: bot-owned read-only namespace, regenerated each walk; operator-visibility is the near-term driver (Pass 4.2)

The L1 reference projection reaches wiki.slipgate.me (the qwiki-v1-beta
substrate, live Phases 1-3) as bot-generated, read-only pages in a dedicated
bot-owned namespace, stamped "auto-generated from qw-oracle Layer 1, do not
edit," regenerated from the snapshot on every KTX/MVDSV version walk.
Human-authored pages (mode narrative, concept prose) link to or transclude
these reference blocks; they never edit them. Humans curate the story, the
bot owns the facts, neither overwrites the other.

Rejected: seeded-then-editable. A human edit drifts the page from source;
the next upstream change either clobbers the edit or is blocked by it -- the
dual-maintenance failure the single-source model exists to prevent.
"Editable" and "single source of truth" cannot both hold on one page.

Operator reframe (load-bearing for sizing, not the contract): the near-term
primary consumer is the OPERATOR, as a visual progress anchor over the
describe-fill arc -- not gen-pop (the wiki is unpromoted, near-empty). This
strengthens read-only-regenerated: a hand-editable visual anchor drifts
silently and stops being a truthful mirror; a regenerated one drifts loudly,
which is the point (`feedback_visual_anchors_force_hygiene`). Public
availability is a free side benefit of hosting on our own wiki, not this
arc's design driver.

Scope boundary held: this arc locks the feed contract + mechanism
(read-only, fenced namespace, regenerate-on-walk, stamp). Wiki page styling /
templates / rendering UX stay consumer-surface scope, explicitly out of this
arc per the arc capture. A plain regenerated page already delivers operator
visibility; prettification is separate later work.

Cross-arc carry-forward (formalized at pass close): wiki-side namespace
creation + bot write path is qwiki-v1-beta / arc-planner-executor scope, not
this brainstorm. This arc owns the contract; the wiki implementation consumes
it. qwiki-v1-beta Modes Phases 5-8 are deferred; the reference-namespace feed
does not depend on them and can land on the shipped substrate independently.

### D15 -- Review page = internal-tier serializer, emitted from the record, row-per-entity inline comparison (Pass 4.3)

Closes the Pass 3 D11 carry-forward (the 2026-05-15 audit-review HTML
generator was not found in the codebase).

The `cvar-audit-review.html` review surface is not a special artifact: it is
the D13 internal-tier serializer -- one of the N serializers over the single
record, the one that additionally carries confidence + reasoning + verdict +
losing provenance.

Generation: emit fresh from the structured record, the same way every other
projection is produced. The 2026-05-15 artifact is retained as a VISUAL
TEMPLATE (look/feel, the sortable-filterable column family), not a generator
to reverse-engineer. Recovering an unknown old generator is rejected -- it
contradicts the operator's stated "quick 1 page" intent and breaks the
uniform one-record/N-serializers model.

Operator-stated function (load-bearing for the page design): one page, all
entries, scan-the-whole-work; per entry the operator sees the original
codebase comment, our proposed description, and the reasoning, together.
Design constraint from this (`feedback_inline_pairs_over_split_panels`): the
source-comment / our-description / reasoning triple is shown INLINE per row
as one before/after/why comparison unit -- not split into separate panels or
three filtered views. Row-per-entity; sortable + filterable across rows for
scanning. This is the D7 operator-tail batch-approval surface (D11 amended D7
to this page); Claude proposes per row, operator approves/overrides.

Implementation wiring (the exact emit script, where it hooks the walk) is
arc-planner/executor scope, not brainstorm. What locks here is the shape:
internal-tier serializer, emit-from-record, row-per-entity inline
comparison, existing file is visual reference only.

### D16 -- Upstream export: showcase-page-first, PR-path deferred to the post-pitch dev conversation (Pass 5.1)

Operator steer (decisive; supersedes the artifact menu posed in-pass): the
upstream export does NOT lead with a PR. Its first artifact is a standalone
single-page HTML showcase rendered from a `snapshot.json` export of the DB
record, hosted on an operator-controlled static surface (slipgate.me or the
matchscheduler site -- exact host is implementation scope), shown to KTX/MVDSV
devs to socialize the work and get their direction. It regenerates from a
fresh snapshot.json as the fill progresses.

The PR-path decision -- a repo-level `server-cvars.md`, the empty GitHub wiki
tabs, or a landing the devs themselves propose -- is explicitly DEFERRED until
after that dev conversation. Reason: probe-5 established the upstream doc
surface is abandoned (dead "complete guide" 301, empty GitHub wiki tabs, a
3-sentence 2022 MVDSV stub). An unsolicited PR into that state risks a year of
silence; a showcase-backed conversation lets the devs pick the landing they
will actually maintain. This is `feedback_cheap_probes_inform_expensive_passes`
at export scale -- the hosted showcase plus the dev conversation is the cheap
probe that informs the expensive, hard-to-reverse PR-path commitment.

Not a new data contract. The showcase is the D13 internal-tier projection
(description + honest origin tag + staleness anchor + provenance grounding +
reasoning trail -- exactly the upstream evidence package D13 already locked as
the deferred-D3 pitch input) served as a hosted page instead of generated
in-terminal. It is the same serializer as the D15 review page, a different
host and consumer; one more renderer over the one record, no machinery added
(D13/D15 N-serializers model holds). D13's "(cvar-audit-review.html only)"
clause scoped public-leak prevention (MCP/wiki/snapshot/web-manager do not get
the trail); D13 itself names the upstream pitch as an internal-tier use, so
D16 realizes a consumer D13 anticipated -- it does not amend D13. A pitch-tuned
column subset (e.g. dropping the internal confidence float / workflow verdict
labels for the dev audience) is a serializer-config choice, not a stored shape
and not a brainstorm shape question -- arc-planner/executor scope, same status
as the D13 embedding-serializer carry-forward.

Single-source-of-truth is absolute for artifact substance (answers the
operator's direct question -- "is there anything in those md files not taken
from the DB?"). Every per-knob fact in the showcase, and in any later PR
artifact, is a pure projection of the DB record. Nothing per-entity is ever
hand-added to an upstream artifact. The only non-DB content is the artifact's
static framing wrapper: title, the D14 "auto-generated from qw-oracle Layer 1,
do not hand-edit" stamp, a short how-to-read-the-provenance/origin-tags intro,
and attribution. That wrapper carries zero per-entity factual claims, so it
creates zero drift surface. The temptation to hand-improve a weak description
directly in the artifact is, by the locked model, the signal to fix the DB
row -- never the artifact. This applies the single-source-of-truth model
(D1/D13/D14) to the upstream surface; it confirms the model, it does not
amend it.

Distinct from the D14 wiki-feed and does not collide with it: D14 is the
public-tier reference on wiki.slipgate.me with the operator as near-term
progress anchor; D16's showcase is the internal-tier evidence projection on a
separate static host with KTX/MVDSV devs as the one-time consumer. Parallel
serializers off the one record (the D13 model), different audiences, no shared
surface.

Constraints that ride with the eventual PR (stated, not open):
- Attribution per `reference_upstream_pr_attribution` -- `Assisted-by:
  Claude:<model-id>`, operator signs `Signed-off-by`, AI never signs, follow
  each target repo's own contribution conventions. Applies to whatever PR
  lands; not a brainstorm choice.
- Freeze/de-dup is NAMED, not designed. Any upstream-adopted text must be
  logged at adoption time so re-extraction does not re-import our own
  contribution as independent source truth. The ledger / frozen-marker is
  D3-deferred graduation machinery, built only if and when adoption actually
  happens. The self-echo vector is universal (even a contributed markdown
  re-echoes as `shipped_doc` if it ever became a D9-harvested
  shipped-config-class artifact), so the freeze requirement is
  artifact-independent. Pass 5 records the requirement; D3 still owns the
  build.

### D17 -- Phase shape arc-planner scaffolds against (Pass 5.3)

Operator-confirmed. The locked decisions imply a seven-phase shape; the
brainstorm locks the shape and sequence only -- exact phase boundaries,
per-phase verification regime, model/effort dials, and context-budget slicing
are arc-planner scope, not relitigated here.

- **Phase 0 -- Probes + the free win (D12).** ezquake.com-vs-MVDSV
  shape-quantification; the C3 runtime-dead suspect-pool diff; the
  `load-commands.ts` one-line fix (frees 28/108 MVDSV commands). Sizes the
  MVDSV phases; does NOT gate the KTX side.
- **Phase 1 -- The discipline, built once.** Provenance/staleness schema
  fields (D2/D11), the guardrailed per-knob synthesis skill (D6), the two-tier
  review gate (D7), the internal-tier audit/review serializer (D11/D15), and
  the C5 F1 probes. Engine-agnostic; both engines ride it.
- **Phase 2 -- KTX mechanical extract (D9).** The new sibling extractor:
  in-repo + nQuake `ktx.cfg` -> structured choices + candidate description +
  retained multi-source provenance; fills ~157/260 KTX cvars. Idempotent
  re-extract (C4).
- **Phase 3 -- KTX source-synthesis (D5-D8, D10).** The D6 skill fans out
  over CD_NODESC commands + residual cvars + bot/judgment cvars
  (mechanism-only, D8) + triage-failed comments. D10 meaning-conflicts
  resolved inline at the D7 tail; genuine residue routed to the C1
  community-outreach track.
- **Phase 4 -- MVDSV fill, sized by Phase 0.** `mvdsv.6` man-page import for
  cmdline (D9 sibling parser); loader-freed commands + the synthesis tail;
  cvars split easy-common-`sv_*` vs hard-dedicated-tail per the Phase 0
  ezquake.com probe.
- **Phase 5 -- Staleness + projections.** Wire the D4 walk-time re-review
  report into the new-version runbook; emit the D14 public wiki feed + the
  snapshot.json; confirm the C5 probes green.
- **Phase 6 (deferrable tail) -- Upstream pitch (D16).** Generate the dev
  showcase page, hold the conversation, decide the PR path after. Explicitly
  optional: the arc is complete and useful at the end of Phase 5; Phase 6
  does NOT gate arc completion.

KTX-first preserved (Phases 2-3 before MVDSV Phase 4). Phase 0 sizes Phase 4.
Phase 1 is the build-once spine both engines consume. Each phase ends in a
verifiable, runnable state (arc-shape criterion 2 + 6 from the capture).

### D18 -- Game-mode L3 arc relationship: sequential by operator-bandwidth choice, not technical dependency (Pass 5.4)

Technically NOT a hard dependency (analysis, recorded so the choice is not
re-derived as a code constraint): the docketed game-mode L3 arc's own capture
establishes its substrate -- 27 `game_mode` + 317 `mode_default` structural
rows already in L1, plus wiki/usermodes prose -- is sufficient to author the
notes; note bodies are mode narrative from community sources, not
cvar-description text. There is no reverse coupling (D1 carves mode narrative
out of this arc). And the typed-anchor staleness mechanism (D4 auto-flag-on-
drift, which concept notes already have) means a note authored while its
`ktx:cvar:X` anchor is still empty is auto-flagged for re-review when this arc
fills the description -- parallel work is safe by construction, not merely
tolerable.

Operator decision nonetheless: **this arc completes before the game-mode L3
arc starts.** The gate is operator review-bandwidth, not code coupling. The
operator is the correctness judge on every row (the D7 review tail / D15
review page); as a non-coder and non-server-admin that correctness judgment
is high-focus work, and the monorepo has other parallel workflows competing
for that focus. Splitting attention across this arc's review tail and the
game-mode arc's authoring would degrade both. "It all has to get done" --
both arcs ship; this is ordering, not de-scoping.

Fundamentals-first framing (operator's words, load-bearing rationale): the
game-mode arc was not "blocked for a side mission" -- it surfaced that the L1
description foundation was missing, and this describe-fill arc IS that
foundation. Foundation lands before the synthesis layer that cites it
(reinforces `project_concept_notes_vertical_slice` L1-anchor/L3-substance and
`feedback_cheap_probes_inform_expensive_passes` -- the game-mode arc was the
probe that revealed the foundational gap).

Checkpoint (operator: "lets see how successful this arc will be"): the
game-mode arc start is explicitly contingent on this arc's outcome being
evaluated first. This arc's post-arc review (arc-shape criterion 8 from the
capture) is the natural greenlight checkpoint before the game-mode arc is
kicked off. The operational gate is bandwidth-driven, so if operator
circumstances change the order MAY be revisited (parallel is technically
safe) -- but the locked call is sequential.

## Pass status

| Pass | Scope | Status |
|---|---|---|
| 1 | Provenance + staleness schema | COMPLETE (D1-D4) |
| 2 | Source-synthesis method + quality bar + review gate | COMPLETE (D5-D8 + amendment) |
| 3 | Mechanical-extract pipeline + drift resolution + ezquake.com probe disposition | COMPLETE (D9-D12 + C3; amends D4/D6/D7) |
| 4 | Multi-projection data contract + wiki-feed mechanism | COMPLETE (D13-D15) |
| 5 | Upstream export (deferrable tail) + lessons-as-constraints + phase sizing + game-mode-arc relationship | COMPLETE (D16-D18 + C4/C5; brainstorm EXIT) |

### Pass 1 sub-questions

- 1.1 Data boundary -- LOCKED (D1).
- 1.2 Origin-state model -- LOCKED (D2).
- 1.3 De-dup / self-echo rule (graduation) -- LOCKED (D3: deferred).
- 1.4 Staleness anchoring + re-review trigger taxonomy + report -- LOCKED (D4).

### Pass 1 close

Resolved: D1 data boundary (buckets only, no L3); D2 origin-state model (this
arc creates the owned user-doc track KTX/MVDSV never had; keep source_inline,
one new shipped-file tag, synthesized + anchor/re-review fields, opinion
absent); D3 graduation deferred to a future deliberate procedure (non-boxing
hook only); D4 staleness = operator-reviewed walk-time report, sustainable at
~1 release/engine/year.

Carry-forwards (each with a track):

- **Trust-but-verify: is a given dev code comment good enough for a user?**
  -> Pass 2 (quality bar / review gate).
- **Exact shipped-file origin tag label + the file-provenance field + the
  nQuake-vs-in-repo conflict policy** -> Pass 3 (mechanical-extract pipeline).
- **Full upstream-graduation design (frozen marker, content-hash de-dup
  ledger, the deliberate adoption procedure)** -> Pass 5 deferrable tail;
  names it, does not design it. Gated on the operator presenting to the
  KTX/MVDSV dev group first.
- **L3 inverse-staleness problem** (a newly-introduced upstream entity that
  *should* be referenced by some concept note, but no typed anchor exists yet
  to flag it -- needs a changelog-reading LLM judgement). NOT an L1 problem;
  does not exist in this arc. Routed OUT to the L3 concept-note line
  (`docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md`
  and broader L3 staleness). To be breadcrumbed there at session wrap.
- **Visual monitoring website** replacing in-terminal walk-time report review
  -> future non-blocking hook, not this arc.

Pass plan revisions: none. Five-pass plan holds. Pass 5's upstream-export
piece remains the deferrable tail (operator steer + D3 reinforce it).

### Pass 2 sub-questions

- 2.1 Quality bar + triage of existing comments -- LOCKED (D5).
- 2.2 Synthesis method + citation/anchor format -- LOCKED (D6: guardrailed skill).
- 2.3 Review gate before a synth description commits -- LOCKED (D7).
- 2.4 Judgment-tier residue policy (bot cvars) -- LOCKED (D8 + D6/D7 amendment).

### Pass 2 close

Resolved: D5 quality bar + cheap-classify triage; D6 synthesis delivered as a
guardrailed per-knob skill; D7 two-tier review gate at Opus-max (independent
verifier + operator tail approval); D8 bot/judgment cvars get mechanism-only
synthesis and count as complete L1; D6/D7 amendment makes the landscape
research docs admissible aids for both author and reviewer without loosening
source grounding.

Carry-forwards (each with a track):

- **The synthesis skill's actual prose / pre-flight / fan-out wiring** ->
  arc-planner + executor (not brainstorm).
- **Recommended-value / tuning advice for bot + judgment cvars** -> L3
  candidate, routed to the L3 line (game-mode / community), not an L1 gap.
- **Genuine not-source-legible residue tail** -> Pass 5 community-outreach
  scope; tracked, not blocking the mechanical/synthesis arc.
- **MVDSV-cvar synthesis volume** still soft -> firms up at the Pass 3
  ezquake.com quantification probe.
- **Concrete discrepancy-flagging mechanism** (how a clear conflict surfaces
  in the walk-time report / review queue) -> Pass 3, built on constraint C2.

Pass plan revisions: none. Five-pass plan holds. Constraints C1 (completeness;
distrust "undocumented = unimportant") and C2 (discrepancies flagged, never
auto-resolved) added this pass; every later phase respects them.

### Pass 3 sub-questions

- 3.1 Mechanical extractor: emit shape + boundary -- LOCKED (D9: pure
  structured-lift, zero quality verdict; everything flows to D5-D8).
- 3.2 nQuake-vs-in-repo drift/conflict policy on C2 -- LOCKED (D10: three
  classes; meaning-conflicts source-grounded, C2-flagged, resolved inline at
  the D7 tail; cross-fork collapses into meaning, `sv_antilag` exemplar).
- 3.3 Origin tag + file-provenance field (D2 carry-forward) -- LOCKED (D11:
  `shipped_doc` + retained structured multi-source provenance + first-class
  verdict/confidence/reasoning trail; D7 review via the audit-review HTML
  pattern -- amends D7).
- 3.4 ezquake.com probe disposition + loader-fix sequencing -- LOCKED (D12:
  cheap-probe bundle as arc Phase 0).

### Pass 3 close

Resolved: D9 mechanical extractor is a pure structured-lift with no quality
verdict; D10 three-class conflict policy (value -> L3, meaning -> source-
grounded + C2-flagged + resolved inline at the D7 tail, membership -> union;
cross-fork collapses into meaning, `sv_antilag` the primary-source-verified
exemplar -- mainline KTX no `antilag.c`, 0<->2 on==2; `dusty-ktx` 783-line
`antilag.c`, ==1, multi-mode); D11 `shipped_doc` origin tag + retained
structured multi-source provenance + first-class verdict/confidence/reasoning
trail reviewed via the `cvar-audit-review.html` pattern (amends D7); D12 the
cheap probe bundle (ezquake.com shape-quant + C3 dead-detection + load-
commands fix) is arc Phase 0. Cross-cutting C3 added (presence != liveness;
suspect pool from `qw-1.log`, never a verdict; amends D4/D6, extends C2).

Carry-forwards (each with a track):

- **Part B -- extract the `dusty-*` antilag fork into L1.** Separate future
  arc; a behavior/description fork (shared entity names, divergent meaning),
  NOT an entity-set fork. Captured at
  `docs/superpowers/parking/2026-05-16-dusty-antilag-fork-l1.md` + HANDOVER
  Future-arcs. Cheap probe first to size the divergent-behavior surface
  beyond the antilag-named entities verified this session.
- **Case-sensitivity loader fidelity** -> existing tracked mini-arc
  (`docs/superpowers/parking/2026-05-16-l1-entity-name-case-fidelity-miniarc.md`);
  compose-not-block, descriptions re-project correctly when it lands.
- **Reachability classification (genuine-dead vs build-excluded)** -> the
  parked libclang call-graph arc
  (`docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`),
  composed via the C3 D4 trigger; never blocks this arc.
- **Audit-review HTML generator** not found under `apps/qw-oracle/scripts`
  -> arc-planner/executor scope (locate/standardize, or emit from the
  structured record).
- **Review surface as a generated projection** -> Pass 4 sub-question
  (multi-projection data contract): the audit page is one projection; MCP /
  snapshot / wiki / web-manager are others off the same structured record.

Pass plan revisions: none. Five-pass plan holds. Pass 4 (multi-projection
data contract + wiki-feed) gains the review-surface-as-projection
sub-question (within existing scope, not a plan change). Pass 5
(upstream-export deferrable tail) unchanged.

### Pass 4 sub-questions

- 4.1 Projection line: one schema, where the public/internal split sits --
  LOCKED (D13: two-tier serialization over the single D11 record; public =
  description + origin tag + staleness + type/default + structured choices;
  internal adds confidence/reasoning/verdict/losing-provenance and doubles
  as the D3 upstream evidence package).
- 4.2 Wiki-feed mechanism -- LOCKED (D14: bot-owned read-only namespace,
  regenerated each walk; operator-as-visual-anchor the near-term driver;
  seeded-then-editable rejected; page UX out of arc scope).
- 4.3 Review-surface-as-projection -- LOCKED (D15: internal-tier serializer,
  emit-from-record, row-per-entity inline comparison; 2026-05-15 artifact is
  a visual template only).

### Pass 4 close

Resolved: D13 two-tier projection over the single D11 record (the honest
label rides to all consumers, the audit trail is internal-only and doubles
as the deferred-D3 upstream evidence package, embedding input is a serializer
config not a stored shape); D14 wiki-feed is a bot-owned read-only
regenerated namespace with operator-as-visual-anchor the near-term driver,
scope boundary held (page UX out of arc), wiki-side plumbing is cross-arc;
D15 the review page is the internal-tier serializer emitted from the record
with row-per-entity inline comparison (`feedback_inline_pairs_over_split_panels`),
the 2026-05-15 file retained as visual-template-only.

Carry-forwards (each with a track):

- **Audit-review HTML emit script + walk hook** -> arc-planner/executor
  (D11/D15: emit-from-record; the 2026-05-15 file is the visual reference,
  not a generator to recover).
- **Wiki-side namespace creation + bot write path** -> qwiki-v1-beta arc /
  arc-planner-executor (different project; consumes this contract;
  independent of the deferred qwiki Modes Phases 5-8).
- **Embedding serializer config** (prose + text-flattened structured choices
  for retrieval recall) -> arc-planner/executor; a serializer config, not a
  stored shape, not a brainstorm shape question.
- **MCP public-projection contract delta** (origin tag + staleness stamp now
  ride the L1 entity response; Discovery/orientation-blob + tool-description
  update per the `API_CONTRACTS.md` new-dataset checklist) ->
  arc-planner/executor; must respect the API_CONTRACTS contract surface.
- **Upstream evidence package = the internal-tier record** -> Pass 5. The
  deferrable upstream-export tail now has a concrete defined input: the
  retained multi-source provenance + reasoning trail IS the pitch material
  (D11/D13 already lock its capture). Pass 5 designs the export, not the
  evidence capture.

Pass plan revisions: none. Five-pass plan holds. Pass 5 (upstream-export
deferrable tail + lessons-as-constraints + phase sizing + game-mode-arc
relationship) unchanged in scope; D13 gives its upstream-export piece a
defined input. Exit criterion not yet met -- Pass 5 remains; resume cold via
`docs/superpowers/parking/2026-05-16-ktx-mvdsv-l1-describe-fill-pass5-handoff.md`.

### Pass 5 sub-questions

- 5.1 Upstream export shape + freeze requirement -- LOCKED (D16:
  showcase-page-first from a snapshot.json, PR-path deferred to the post-pitch
  dev conversation; pure DB projection, no per-knob hand-add; freeze named not
  built; attribution per `reference_upstream_pr_attribution`).
- 5.2 Which hard-earned lessons become explicit arc constraints -- LOCKED
  (C4 repair-by-reextract arc-wide + C5 F1-probe-per-new-data-shape promoted;
  exhaustive-mapping / dual-doc / upstream-attribution / source-truth
  cross-referenced as already-encoded, not restated).
- 5.3 Phase sizing + brainstorm-exit check -- LOCKED (D17: seven-phase shape,
  KTX-first, Phase 0 sizes Phase 4, Phase 6 the deferrable tail; exit
  criterion met -- remaining unknowns are implementation-shaped).
- 5.4 Game-mode L3 arc relationship -- LOCKED (D18: sequential by
  operator-bandwidth choice, not a technical dependency; this arc fully before
  the game-mode arc; this arc's post-arc review is the greenlight checkpoint).

### Pass 5 close

Resolved: D16 upstream export leads with a hosted single-page HTML showcase
(from a regenerable `snapshot.json`), PR-path deferred until after the dev
conversation, every per-knob fact a pure DB projection (the only non-DB
content is the static framing wrapper), freeze/de-dup named not built (D3
still owns it), attribution constraint stated; C4 (repair by re-running the
corrected pipeline, never a one-off SQL patch -- arc-wide generalization of
D9's idempotent re-extract) and C5 (every new data shape -- description /
origin tag / retained provenance / staleness anchor -- earns an F1 quality
probe, phase-boundary gate) promoted to named constraints, the other four
named lessons cross-referenced to the decisions that already enforce them;
D17 the seven-phase shape arc-planner scaffolds against (Phase 0 probes +
free win -> Phase 1 build-once discipline -> Phase 2 KTX mechanical extract
-> Phase 3 KTX synthesis -> Phase 4 MVDSV fill sized by Phase 0 -> Phase 5
staleness + projections -> Phase 6 deferrable upstream pitch); D18 the
game-mode L3 arc runs after this arc by an operator-bandwidth sequencing
choice (not a code dependency -- parallel is technically safe via typed-anchor
auto-flag), greenlit at this arc's post-arc review.

Carry-forwards (each with a track):

- **Dev showcase generator + snapshot.json serializer config + static host
  (slipgate.me vs matchscheduler)** -> arc-planner/executor (D16: serializer
  config + host choice are implementation, not a brainstorm shape question;
  same status as the D13 embedding-serializer carry-forward).
- **PR-path decision (repo `server-cvars.md` / GitHub wiki tabs /
  dev-proposed landing)** -> explicitly DEFERRED, owned by the
  operator + KTX/MVDSV dev conversation after Phase 6; not an arc-planner
  decision and not a brainstorm question.
- **Freeze/de-dup ledger + frozen-marker (graduation machinery)** -> still
  D3-deferred; its own future scoped piece of work, built only if upstream
  adoption actually happens. Unchanged by Pass 5; Pass 5 only named the
  requirement.
- **C5 concrete probe SQL (the four shapes) + the D17 phase boundaries +
  per-phase verification regime + model/effort dials** -> arc-planner
  scaffold/slicing. Constraints and shape are locked; the implementations are
  planner/executor scope.
- **MCP public-projection contract delta + audit-review emit hook + wiki-side
  namespace plumbing + embedding serializer config** -> carried unchanged
  from the Pass 3/4 closes to arc-planner/executor; respect
  `apps/qw-oracle/API_CONTRACTS.md`.
- **Game-mode L3 concept-note arc**
  (`docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md`)
  -> sequenced AFTER this arc by D18; greenlight at this arc's post-arc
  review. To be noted on HANDOVER as gated-behind-this-arc at session wrap.

Pass plan revisions: none. The five-pass plan held unrevised across all five
closes. **Brainstorm COMPLETE.**

Exit criterion: **MET.** Every remaining unknown is implementation-shaped --
exact phase boundaries, per-phase verification regime, model/effort dials, the
snapshot.json field list, the C5 probe SQL, the showcase page columns, the
static host. None reshape the work; all are arc-planner scaffold/slicing
decisions. No shape question remains: no unresolved data model, no unresolved
subsystem boundary, no unresolved policy. The brainstorm is declared complete.
Next step: arc-planner, fresh terminal, via the handoff at
`docs/superpowers/parking/2026-05-16-ktx-mvdsv-l1-describe-fill-planner-handoff.md`.
