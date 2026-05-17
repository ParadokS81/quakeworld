# Phase 5 -- Staleness + projections

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- C1-C5, P1-P5, D1-D19, every dated
>    amendment/clarification: D9 amendment + D9 clarification 2026-05-17,
>    D11 amendment, D2 clarification, D4, D13, D14, D16).
> 2. Read `review-findings.md`; the rows whose "Phase" is this phase:
>    **F-D13a (Substantive -- MCP contract surface delta, same-commit
>    Discovery+Query edit, NO new tool)**, **F-D14a (Boundary -- wiki
>    side is cross-arc; contract + consumed snapshot only)**, **F-D10b
>    (Boundary -- case-fidelity soft dep; note only, never fixed here)**.
> 3. Recon the LIVE source before inlining anything: canonical KTX AND
>    MVDSV are BOTH libclang/C -- the D9 per-engine difference is a
>    shipped-config sibling parser, NOT a tree-sitter-vs-libclang split;
>    tree-sitter is the out-of-scope dusty-ktx fork only (dated CORRECTION
>    2026-05-17 in `review-findings.md` "Confirmed-good"). Phase 5 touches
>    NO extractor (it serializes an existing record), but the recon
>    discipline holds: the live snapshot builder, the live MCP
>    orientation/tool surface, the live derive-tail walk seam, the live
>    probe-0 denominators, and the D4 anchor column are verified against
>    the DB/repo on 2026-05-17 -- see "Recon facts" below; numbers and
>    paths are NOT copied from the spec/prior-phase MDs unchecked.
> 4. After drafting, dispatch the verification sub-agent (brief at the
>    bottom of `phase-template.md`, item 8 in its 2026-05-17-corrected
>    form) before declaring the phase MD ready.

## Goal

Phase 5 is the cross-cutting projection + staleness phase that turns the
now-content-complete describe-fill record (KTX from Phase 3 + MVDSV from
Phase 4 -- every in-scope configurable-bucket entity carrying an
affirmed-or-synthesized provenance-stamped owned description, or an
enumerated C1-outreach-track residue row) into its consumer-facing
projections and wires the D4 staleness re-review into the new-version
walk. Four deliverables, all serializers/wiring over the SAME single D11
record (one record, N serializers -- nothing stored twice): (1) the D13
PUBLIC projection -- extend the EXISTING `build-snapshot.ts` with
KTX/MVDSV emitters that carry description text + origin tag +
anchor-version / "may be stale as of X" stamp + type + default + the D9
structured choices as DATA, and confirm the embedding serializer config
(prose + text-flattened structured choices for retrieval recall -- a
serializer config, not a stored shape); (2) the F-D13a MCP
public-projection delta -- the origin tag + staleness stamp ride the L1
entity response, with the Discovery orientation blob + the tool
descriptions + the Query `match_quality` story edited in the SAME commit
and NO new MCP tool (API_CONTRACTS new-dataset checklist: this is L1,
the query shape matches `lookup_entity`/`search_entities`); (3) the D14
wiki-feed CONTRACT + the snapshot the wiki consumes (bot-owned read-only
fenced namespace, regenerate-on-walk, the "auto-generated from qw-oracle
Layer 1, do not edit" stamp) -- the CONTRACT only, NOT the wiki-side
implementation (F-D14a cross-arc); (4) the D4 walk-time re-review report
wired into the new-KTX/MVDSV-version runbook at the existing
`deriveEntityDescriptionsForVersion` derive-tail seam -- a manual
operator-paced confirm-or-rewrite pass at walk time (Drifted / Added /
Removed against the tight triggers a-f), NOT auto-edit, NOT a notifier,
with the owned describe-fill rows protected from the blind
recompute-clobber so a flagged description keeps serving stamped "may be
stale as of version X" (stale-but-present beats a hole). The arc is
COMPLETE and useful at the end of Phase 5 (D16/D17); Phase 6 (the D16
upstream showcase) is the deferrable, non-gating tail and is NOT this
phase. The runnable, verifiable state at the phase boundary is HONESTLY
MIXED: the automated half -- the public snapshot.json regenerates
deterministically (re-run byte-identical), carries every in-scope
KTX+MVDSV entity OR its enumerated C1-residue disposition vs the C1 N/M
gate, the origin tag + stale stamp ride the MCP L1 response, the
orientation/tool/match_quality edit is in the SAME commit with NO new
tool, the embedding serializer config is set, and all C5 probes (the
four `F1.describe_fill.*` + the jsonb ktx+mvdsv extension) stay GREEN
through the projection round-trip -- PLUS the operator-run half: the D4
walk-time staleness report worked at a SIMULATED new-version walk,
per-row confirm-or-rewrite by the operator, owned descriptions kept
serving stamped, never auto-edited (an honest operator pass, NOT a
YES/NO probe). Phase 5 is complete only when BOTH halves hold.

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

Drafter-verified via `psql` against `qw-oracle-postgres-dev`, `ls`/`grep`
against the live repo on 2026-05-17. NOT inferred, NOT copied from the
spec/prior-phase MDs unchecked (the spec "~157"->109 conflation Phase 2
corrected is the standing cautionary precedent for this block).

- **The arc is in PLANNING; Phases 0/1/2/3/4 are approved-not-executed.**
  Live-verified absent this draft: highest migration = `013`
  (`013_entity_name_source_case_fold.sql`; the seven Phase-1 trail
  columns -- `description_anchor_version`, `description_rereview`,
  `description_provenance`, `description_verdict`,
  `description_confidence`, `description_reasoning`,
  `description_proposed` -- `information_schema.columns` count = `0`;
  migration 014 unexecuted); `apps/qw-oracle/scripts/describe-fill/`
  does NOT exist (Phase 1 creates it);
  `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts`
  does NOT exist (Phase 1 creates it -- the D13 INTERNAL-tier
  serializer Phase 5's PUBLIC tier is a sibling of); the four
  `F1.describe_fill.*` probes are NOT in `quality-grid.ts`
  (`F1.jsonb_columns_not_strings` is the only live F1 probe and is
  ezquake-scoped at `quality-grid.ts:220`); `phase-0-artifacts/` holds
  only `.gitkeep`. **Consequence:** this Phase 5 MD is a paper plan
  whose EXECUTION presupposes Phases 0+1+2+3+4 EXECUTION (see "Inputs
  from previous phase" + Open Q (a)) -- exactly the honest pattern
  Phases 2/3/4 recorded; an orchestrator-sequencing concern, NOT a
  reshape.
- **Probe-0 C1 denominators (live -- the public-projection coverage
  gate, never a hand-picked subset):** `count(*) FROM entities WHERE
  project IN ('ktx','mvdsv') AND type IN ('cvar','command',
  'cmdline_param','info_key')` GROUP BY = KTX cvar **260** / command
  **358** / info_key **7**; MVDSV cvar **183** / command **108** /
  cmdline_param **11** / info_key **45**. These match probe-0 and the
  Phase 2/3/4 Recon blocks exactly. Phase 0 re-extracts forward and
  re-baselines them (correct by C1); Phase 5 EXECUTION asserts coverage
  against the POST-Phase-0 M from `phase-0-results.md`, not these
  pre-Phase-0 numbers -- the values here are the live gate-SHAPE, not a
  frozen contract number.
- **Pre-execution origin distribution (live, pre-014, arc scope):**
  KTX `source_inline:386 / NULL:239`; MVDSV `source_inline:80 /
  NULL:267`. ZERO `synthesized`, ZERO `shipped_doc` (Phases 1-4
  unexecuted). At Phase 5 EXECUTION time the describe-fill record is
  content-complete (Phase 3 KTX + Phase 4 MVDSV: every in-scope row
  affirmed-or-synthesized or C1-residue-tracked); the projections
  mirror THAT post-Phase-4 record.
- **The PUBLIC projection mechanism is the EXISTING
  `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`** (verified
  live, 715 lines). It reads the DB and writes slipgate-shaped JSON to
  `apps/slipgate-app/src/lib/config/data/`. It supports `ezquake` /
  `qwcl` / `qw`; **KTX and MVDSV currently hit the explicit
  `else { throw new Error("build-snapshot does not yet support
  project=" + opts.project) }` branch (~line 705).** Its emitters read
  `cvar_versions.help_desc` / `help_remarks` / `help_values` etc. --
  they do NOT read `entities.description` / `description_origin` / the
  migration-014 fields. The D13 PUBLIC tier is a sibling serializer
  over the SAME record the Phase-1 internal `serialize-audit-review.ts`
  reads: Phase 5 EXTENDS this builder (adds the KTX/MVDSV branch +
  reads the describe-fill columns), it does NOT create a parallel
  snapshot mechanism (one record, N serializers -- D13). The
  build-snapshot subcommand wiring is in
  `scripts/load-knowledge/index.ts`.
- **The D4 walk seam is the EXISTING derive tail** (verified live):
  `scripts/load-knowledge/index.ts:~650` lazy-imports
  `deriveEntityDescriptionsForVersion` from
  `./derive-entity-description.js`; `index.ts:~679` calls it inside the
  load transaction; `derive-entity-description.ts:425` exports it;
  `DEVELOPMENT.md` documents `extract-tag` ("git checkout <tag> + run
  extractors + load every type" -- THE new-version walk) and
  `re-derive` ("Rebuild entities.description over existing rows ...
  flips description_embedding_stale=TRUE"). **`deriveCvar`
  (`derive-entity-description.ts:70-121`) UNCONDITIONALLY
  `UPDATE entities SET description=COALESCE(help_desc/remarks/values,
  trailing_comment), description_origin=CASE ... 'source_inline' ...
  ELSE NULL` for every cvar at the walked `last_seen_version` -- there
  is NO describe-fill guard** (grep for
  `describe_fill|description_origin IN|anchor|shipped_doc` in that file
  returns only header-comment lines + the `deriveMatchEvent`
  hard-coded `'synthesized'`; NO owned-row protection). **This is the
  load-bearing D4-wiring interaction:** on the next KTX/MVDSV walk this
  tail will overwrite every describe-fill owned
  `synthesized`/`shipped_doc` description back to a help_*/comment
  value or NULL. D4 ("a flagged description keeps serving, stamped may
  be stale as of version X") REQUIRES the walk not to clobber it --
  protecting the owned rows at this seam is intrinsic to D4's wiring
  and is squarely Phase 5 (D4 = "wire the walk-time re-review into the
  new-version runbook"; Phases 1-4 do not touch this file). Surfaced
  precisely in Open Q (b).
- **The D4 anchor column is Phase-1-owned, NOT Phase 5's to invent.**
  Migration 014 (Phase 1) adds `description_anchor_version TEXT NULL`
  (the version a `synthesized` description was authored against) and
  `description_rereview BOOLEAN NOT NULL DEFAULT FALSE` (the D4
  walk-time staleness flag). Phase 3/4 stamp `description_anchor_version`
  on every `synthesized` row (the live KTX/MVDSV head
  `versions.commit_sha`). Phase 5 wires the walk-time COMPARE
  (anchor vs current per the tight D4 triggers a-f) + sets/serves the
  `description_rereview` flag; it does NOT add a new staleness column
  (a schema delta in Phase 5 is a deviation -- P1, surface it).
- **The live MCP contract surface (F-D13a edit sites, grep-verified --
  do NOT infer):**
  - `serve/mcp/src/entity-record.ts` -- `EntityRow` SELECT (lines
    ~38-42: `SELECT id, canonical_id, project, type, name,
    source_state, first_seen_version, last_seen_version`) +
    `toEntityRecord()` (~151-169) build the `EntityRecord` returned by
    BOTH `lookup_entity` and `search_entities`. Neither the SELECT nor
    the returned shape carries `description`/`description_origin`/the
    014 stamp today. The F-D13a delta lands here.
  - `serve/mcp/src/types.ts` -- the `EntityRecord` type (the public
    shape; add the public-tier describe-fill fields).
  - `serve/mcp/src/index.ts` -- `TOOL_LIST` (~line 202+): the
    `lookup_entity` description (line ~205) and the `search_entities`
    description (line ~230) + the `search_entities.query` input
    description (~line 234, currently "matched against entity names +
    concatenated help text (help_desc + help_remarks + per-value
    descriptions ...)"). These are the F-D13a Discovery
    tool-description edits.
  - `serve/mcp/src/orientation.ts` -- the single exported
    `ORIENTATION_INSTRUCTIONS` template literal (2827 bytes; no current
    mention of origin/staleness). The F-D13a Discovery orientation-blob
    edit.
  - `serve/mcp/src/tools/lookup-entity.ts:~53` -- `matchQuality` is
    computed ONLY from `r.current.help_desc && help_desc.length > 20`.
    KTX/MVDSV describe-fill rows carry `entities.description` but
    `help_desc` is NULL -> they would read `weak`/`none` despite an
    owned description. The F-D13a Query `match_quality`-story edit
    reconciles this (the owned description counts toward match_quality).
  All five edits land in the SAME commit as the public projection
  (F-D13a / API_CONTRACTS "Update rule"). The tool catalog stays at 12
  -- NO new tool (API_CONTRACTS new-dataset checklist step 2: same verb
  + same return shape = rows behind an existing tool, stop here).
- **API_CONTRACTS new-dataset checklist (verbatim, read live
  `apps/qw-oracle/API_CONTRACTS.md:106-116`):** step 1 layer = L1;
  step 2 "Does the query shape match an existing tool? Same verb +
  same return shape = rows behind an existing tool. If yes, stop here"
  -> YES (`lookup_entity`/`search_entities`), NO new tool; step 5
  "Discovery update. Edit the orientation blob and any affected tool
  description"; step 6 "Query update. Define the match_quality story".
  The "Update rule" (`API_CONTRACTS.md:104`): "every ... change to
  citation discipline requires an edit to the orientation blob in the
  same commit". F-D13a is exactly steps 5+6 + the Update rule.
- **D14 wiki feed is NOT the inbound `scripts/snapshot-wiki/`
  (verified live).** `scripts/snapshot-wiki/snapshot.py` +
  `data/wiki-snapshots/` is the INBOUND capture tool: it READS the
  live quakeworld.nu MediaWiki 1.35 API into local JSON for the
  qwiki-community-reference arc. D14's feed is OUTBOUND (qw-oracle L1
  -> wiki.slipgate.me bot-owned namespace). DIFFERENT contract,
  DIFFERENT direction. Phase 5 must NOT extend/conflate snapshot.py;
  per F-D14a it emits the feed CONTRACT + names the wiki-consumed
  payload (= the Task-1 public projection, no second stored copy), and
  does NOT create the wiki namespace / bot write path / page styling
  (qwiki-v1-beta cross-arc).
- **The C5 probe set Phase 5 confirms GREEN through the round-trip
  (delivered by Phases 1-4; Phase 5 writes NO new shape so ships NO
  new probe -- C5):** `F1.describe_fill.origin_vocabulary` (Phase 1),
  `F1.describe_fill.synthesized_requires_anchor` (Phase 1),
  `F1.describe_fill.provenance_entry_exists` (Phase 2),
  `F1.describe_fill.synthesized_requires_source_ref` (Phase 3),
  `F1.jsonb_columns_not_strings` extended to `ktx` (Phase 2) +
  `mvdsv` (Phase 4). Live `quality-grid.ts` is 2110 lines; runner is
  `bun scripts/load-knowledge/index.ts quality-grid ...`
  (`apps/qw-oracle/CLAUDE.md` pins Bun, forbids npm even though
  `DEVELOPMENT.md` still shows `npm run` -- do not hard-code npm).
- **F-D10b (note only, never fixed here):** describe-fill descriptions
  project on the loader-lowercased `entities.name_fold` key (migration
  013, the any-case-in/source-case-out contract), so they project as
  e.g. `loadfragfile` not `loadFragfile`. This re-projects clean with
  ZERO description rework when the tracked case-fidelity mini-arc lands
  (`docs/superpowers/parking/2026-05-16-l1-entity-name-case-fidelity-miniarc.md`).
  Phase 5 NOTES this in a boundary line; it does NOT fix casing.

## Inputs from previous phase

**Phase 5 consumes the completed Phase 0+1+2+3+4 record.** Per the
locked slicing analysis (`README.md`): the fill phases verify by
DB-state coverage, the consumer projection is deliberately Phase 5 (no
verification-regime collision -- each fill-phase boundary is
self-contained). Phase 5 EXECUTION requires all five EXECUTED:

- **Phase 0 executed:** `phase-0-artifacts/c3-suspect-pool.md` exists
  (the C3 dead-stamp inputs the Phase 3/4 records carry -- D4 trigger
  (f) composes through it); the probe-0 denominators re-baselined from
  the forward-fetched dev-head (`phase-0-results.md` old-vs-new --
  Phase 5 recons the POST-Phase-0 M); `versions` rows at the fresh
  dev-head SHA (the `description_anchor_version` source).
- **Phase 1 executed:** migration `014_description_provenance_trail.sql`
  applied (`description`/`description_origin` extended +
  `description_anchor_version`/`description_rereview`/
  `description_provenance`/`description_verdict`/`description_confidence`/
  `description_reasoning`/`description_proposed`); the D11/D15
  internal-tier `serialize-audit-review.ts` exists (Phase 5's PUBLIC
  tier is its sibling over the same record); the four Phase-1/2/3 C5
  probes + the jsonb ktx/mvdsv extension registered in
  `REGRESSION_PROBES`; `k_short_gib` carries its Phase-1 terminal
  `synthesized` record.
- **Phase 2+3 executed:** the KTX slice is content-complete -- every
  in-scope KTX entity (cvar M=260 / command M=358 / info_key M=7,
  POST-Phase-0-rebaselined) carries an affirmed-or-synthesized
  description with the D11 trail OR an enumerated C1-outreach-track
  residue row; the C1 outreach track enumerated in the Phase-3 Task-4
  run report (the tracked hand-off to Phase 5).
- **Phase 4 executed:** the MVDSV slice is content-complete -- every
  in-scope MVDSV entity (cvar M=183 / command M=108 / cmdline_param
  M=11 / info_key M=45, POST-Phase-0-rebaselined) carries an
  affirmed-or-synthesized description with the D11 trail OR an
  enumerated C1-residue row; the `sv_antilag` D10 cross-fork DUAL
  described dual + operator-confirmed; the C1 outreach track enumerated
  in the Phase-4 Task-7 run report; every synthesized KTX+MVDSV row
  carries `description_anchor_version` (the D4 staleness anchor Phase 5
  consumes).
- Operator-side `prerequisites.md` items verified satisfied 2026-05-16
  (Postgres dev container up; L1 KTX+MVDSV loaded).

If any of Phases 0-4 has not executed when Phase 5 is picked up, Phase 5
is BLOCKED on it (not a Phase 5 defect -- the slicing order is
0/1 -> 2 -> 3 -> 4 -> 5). Halt and report (Open Q (a)).

## Files touched

### Created

```
apps/qw-oracle/scripts/describe-fill/serialize-public.ts            # the D13 PUBLIC-tier serializer helper (sibling of Phase-1 serialize-audit-review.ts; one record, N serializers); shared by the snapshot.json projection + the D14 wiki-consumed payload
apps/qw-oracle/scripts/describe-fill/staleness-walk-report.ts       # the D4 walk-time Drifted/Added/Removed report + owned-row protection at the derive-tail seam
apps/qw-oracle/scripts/describe-fill/verify-phase-5.ts              # the automated phase-boundary harness (idempotent round-trip + C1 coverage + C5-green + same-commit/no-new-tool checks)
apps/qw-oracle/docs/wiki-feed-contract.md                           # the D14 feed CONTRACT the qwiki-v1-beta arc consumes (bot-owned read-only fenced namespace, regenerate-on-walk, the do-not-edit stamp)
```

The `apps/qw-oracle/scripts/describe-fill/` directory is the Phase-1
engine-agnostic-spine home; Phase 5 lands the projection/wiring siblings
beside it (the Phase-1 `serialize-audit-review.ts` internal tier, the
Phase-2/3/4 extract/fan-out drivers already live there).

### Modified

```
apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts             # add the KTX/MVDSV public-tier emitters (read entities.description/origin/anchor/rereview + structured choices via serialize-public.ts); replace the "does not yet support" throw for ktx/mvdsv
apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts   # D4 owned-row guard: do NOT recompute/clobber description+origin for describe-fill rows (description_origin IN ('synthesized','shipped_doc') with a description_anchor_version); they keep serving (D4)
apps/qw-oracle/scripts/load-knowledge/index.ts                      # wire the D4 staleness-walk report into the derive-tail seam (beside deriveEntityDescriptionsForVersion); add the build-snapshot ktx/mvdsv subcommand path + usage if not already generic
apps/qw-oracle/serve/mcp/src/entity-record.ts                       # F-D13a: SELECT + return the public-tier describe-fill fields on the L1 EntityRecord (origin tag + anchor/stale stamp)
apps/qw-oracle/serve/mcp/src/types.ts                               # F-D13a: extend the EntityRecord type with the public-tier describe-fill fields
apps/qw-oracle/serve/mcp/src/index.ts                               # F-D13a (SAME commit): lookup_entity + search_entities TOOL_LIST descriptions + the search query-input description teach the owned description + origin/staleness
apps/qw-oracle/serve/mcp/src/orientation.ts                         # F-D13a (SAME commit): ORIENTATION_INSTRUCTIONS teaches the origin tag + "may be stale as of X" stamp on L1 facts
apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts                 # F-D13a (SAME commit): match_quality story -- an owned describe-fill description counts (not only help_desc)
apps/qw-oracle/API_CONTRACTS.md                                     # F-D13a Update rule: record the L1-response delta + the new-dataset-checklist resolution (NO new tool) + a pointer to docs/wiki-feed-contract.md; "Open drift" only if a real gap remains
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md  # Phase 5 status column only (operator-driven)
```

### Deleted

```
n/a   # Phase 5 is purely additive (new serializers/wiring + a contract doc + a same-commit MCP-surface edit). NO migration (it serializes an existing record; any schema delta is a P1 deviation -- surface it, do not silently add).
```

## Tasks

> **Execution-mode posture (stated per the drafter prompt):** Phase 5 is
> a projection + wiring + doc/runbook phase -- subagent-default,
> near-zero inline (a serializer / a runbook-wiring guard+report / a
> cross-cutting MCP-surface edit are NOT inline-shaped per
> `feedback_no_subagents_for_mechanical_edits` sharpened +
> phase-template). **Phase 5 has NO spec-locked Opus-MAX task** -- the
> D6 synthesis / D7 review Opus-4.7-MAX dial is the fill phases' (D7),
> not Phase 5's. Models per `feedback_model_effort_range`: Sonnet MAX /
> Opus medium for the judgment-dense cross-cutting work, Sonnet medium
> for the harness/contract-doc.

### Task 1 -- The D13 PUBLIC-tier serializer + the snapshot.json projection + the embedding serializer config

- **Goal:** a PUBLIC-tier serializer (sibling of the Phase-1 internal
  `serialize-audit-review.ts`, one record N serializers) that the
  existing `build-snapshot.ts` consumes to project every in-scope
  KTX+MVDSV entity's description text + origin tag + anchor-version /
  "may be stale as of X" stamp + type + default + the D9 structured
  choices as DATA; and a one-paragraph confirmation that the embedding
  input is that prose + a text-flattened rendering of the structured
  choices (a serializer config, not a stored shape -- D13).
- **Files:** `apps/qw-oracle/scripts/describe-fill/serialize-public.ts`
  (created); `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`
  (modified); `apps/qw-oracle/scripts/load-knowledge/index.ts`
  (modified, subcommand path only).
- **Steps:**
  - [ ] Write `serialize-public.ts`: a pure read-from-record helper
        (use the existing postgres-js `db.ts` pattern -- no new DB
        access layer) that, for an in-scope `(project, type)` row,
        emits the PUBLIC field set ONLY: `description`,
        `description_origin` (the honest tag:
        `source_inline`/`synthesized`/`shipped_doc`),
        `description_anchor_version` + a derived
        `stale_as_of` string when `description_rereview = TRUE`
        ("may be stale as of version " + anchor), `type`,
        `default`, and the D9 structured choices as DATA (the
        `{value,label}` enum / `{bit,label}` bitmask arrays carried in
        `description_provenance[].structured_choices` -- the D11
        amendment's additive element; bound/returned as JS values, P2,
        never prose-flattened in this projection). `structured_choices`
        is ADDITIVE/OPTIONAL (D11 amendment 2026-05-17): a row with no
        enum/bitmask (e.g. the Phase-1 boolean `k_short_gib`) simply has
        no `structured_choices` -- the serializer OMITS the field for
        that row (never an empty array or a null placeholder), so the
        projection stays byte-stable + idempotent with no re-extract
        debt. It MUST NOT emit
        `description_verdict` / `description_confidence` /
        `description_reasoning` / `description_proposed` / the losing
        retained-provenance alternates -- those are the D13 INTERNAL
        tier (`serialize-audit-review.ts`, Phase 1). The exclusion is
        AUDIENCE, not honesty: the origin tag + stale stamp already
        discharge the D2 honesty obligation (D13).
  - [ ] Extend `build-snapshot.ts`: replace the
        `else { throw "build-snapshot does not yet support
        project=..." }` branch so `ktx` and `mvdsv` emit per-bucket
        public JSON via `serialize-public.ts`. Preserve the existing
        file-root metadata shape (`schema_version`, `generated_at`,
        `oracle_commit`, `knowledge_db_schema_version`, project,
        version) and the existing `buildSnapshot()` entry contract so
        the slipgate consumer needs zero structural change; the
        describe-fill fields are ADDITIVE per entity (mirrors how the
        existing emitters add the enrichment block). Comment WHY the
        KTX/MVDSV branch reads `entities.description*` instead of
        `cvar_versions.help_desc` (P5: describe-fill is the owned
        user-doc track KTX/MVDSV never had -- D2; help_* is ezQuake's).
  - [ ] Coverage is the C1 N/M gate (the POST-Phase-0 denominators):
        the projection carries EVERY in-scope KTX+MVDSV entity that has
        an owned description, OR -- for an enumerated C1-outreach-track
        residue row -- its honest residue disposition (the D6 truthful
        dead-stamp text + origin tag rides the projection like any
        other row; "skip the residue / the rare dedicated knob in the
        public view" is a C1 violation, surface as a deviation, do NOT
        silently comply). The projection is a faithful mirror of the
        completed record, not a curated subset.
  - [ ] Idempotent (C4/P3): the projection regenerates
        deterministically from the record -- a re-run produces a
        byte-identical output (stable key ordering, no timestamp in the
        per-entity body; `generated_at` is the only volatile field and
        is file-root metadata, excluded from the idempotency
        fingerprint as the existing builder already isolates it).
  - [ ] Confirm the embedding serializer config (D13, recorded NOT
        re-opened -- planner/executor serializer-config scope): the
        embedding input for a describe-filled row is the owned
        `description` prose PLUS a text-flattened rendering of the D9
        structured choices (so a "what values can X take" query still
        retrieves) -- this is a config of the existing
        `derive-entity-description.ts` -> `embed-entities.ts` ->
        `description_tsv`/`description_embedding` path (the owned
        `description` already feeds it once the Task-2-of-Phase-1
        record is committed; Task 4's owned-row guard keeps the owned
        prose in `description`). VERIFY this assumption rather than
        assume it: confirm against live `embed-entities.ts` that it
        embeds the `entities.description` column (not a help_*-derived
        string), so the owned describe-fill prose IS the embedding
        input with NO embed-path change -- and confirm
        `description_embedding_stale` flips on the owned-row write so
        the next embed pass re-embeds (the existing
        derive-entity-description.ts header documents this stale-flip;
        the Task-4 guard must preserve it for owned rows). If the
        embed path does NOT already ingest the owned `description`,
        that is a silent embeddings-not-updated bug -- surface it as a
        deviation, do NOT silently add a new stored shape. Phase 5
        STATES this confirmed config in a code comment + the contract
        doc; it adds NO new stored shape (if one is required, that is
        a deviation -- surface it).
- **Verification:**
  `cd apps/qw-oracle && bun scripts/load-knowledge/index.ts
  build-snapshot --project ktx` then `--project mvdsv` emits the
  per-bucket public JSON; `bun scripts/describe-fill/verify-phase-5.ts
  --coverage` reports KTX+MVDSV covered-or-residue-tracked == the
  POST-Phase-0 N/M denominators (NOT a lowered denominator); re-run
  build-snapshot and `diff` the two outputs (minus `generated_at`) ->
  byte-identical. PASS condition: both projects emit; coverage equals
  the C1 N/M gate with residue carried (never importance-cut); the
  re-run diff is empty; NO `verdict`/`confidence`/`reasoning`/
  `proposed`/losing-alternate key appears anywhere in the public JSON
  (`jq '[.. | objects | keys[]] | unique'` contains none of them).
- **Execution mode:** `subagent (Sonnet 4.7 MAX)` -- judgment-dense
  serializer over a verified existing builder (the public/internal
  field split, the structured-choices-as-DATA discipline, the
  one-record-N-serializers fidelity, idempotent byte-stability) with
  the design fully specified by D13; Sonnet MAX preferred for speed
  over Opus medium. NOT inline: a serializer is explicitly not
  inline-shaped (phase-template).

### Task 2 -- The F-D13a MCP public-projection delta (SAME commit; NO new tool)

- **Goal:** the origin tag + staleness stamp ride the L1 entity
  response, and the Discovery orientation blob + the tool descriptions
  + the Query `match_quality` story are edited in the SAME commit, with
  the tool catalog unchanged at 12 (NO new tool -- API_CONTRACTS
  new-dataset checklist).
- **Files:** `serve/mcp/src/entity-record.ts`, `serve/mcp/src/types.ts`,
  `serve/mcp/src/index.ts`, `serve/mcp/src/orientation.ts`,
  `serve/mcp/src/tools/lookup-entity.ts`,
  `apps/qw-oracle/API_CONTRACTS.md` (all modified, ONE commit).
- **Steps:**
  - [ ] `entity-record.ts`: extend the `EntityRow` SELECT to also
        fetch `e.description, e.description_origin,
        e.description_anchor_version, e.description_rereview` from
        `entities`; in `toEntityRecord()` add a PUBLIC-tier
        `description_meta` block (or equivalently-named additive field)
        carrying the owned description text + origin tag + the
        derived "may be stale as of version X" stamp when
        `description_rereview`. PUBLIC tier ONLY -- never surface
        `verdict`/`confidence`/`reasoning`/losing provenance on the MCP
        response (D13 audience line). Reuse `serialize-public.ts`
        (Task 1) so the MCP delta and the snapshot.json are the SAME
        serializer over the SAME record (one record, N serializers --
        not a second hand-rolled shape).
  - [ ] `types.ts`: extend the `EntityRecord` type with the additive
        public describe-fill fields (typed, optional -- ezquake/fte/
        qwcl rows without a describe-fill record simply omit them).
  - [ ] `index.ts` (`TOOL_LIST`): edit the `lookup_entity` description
        and the `search_entities` description so a consumer LLM learns
        the L1 record now carries an honest origin tag
        (`source_inline`/`synthesized`/`shipped_doc`) and a "may be
        stale as of version X" staleness stamp; edit the
        `search_entities.query` input description (currently names only
        `help_desc + help_remarks + per-value descriptions`) to include
        the owned describe-fill description as a matched field. NO new
        tool entry; the `TOOL_LIST` length stays 12.
  - [ ] `orientation.ts` (`ORIENTATION_INSTRUCTIONS`): add a sentence
        to the Layer 1 / citation-discipline teaching that L1 facts now
        carry an origin tag + staleness stamp and how a consumer should
        read them (an `synthesized` + "may be stale as of X" fact is
        still citable by `canonical_id`, the stamp is honesty metadata
        not a `match_quality` downgrade). ASCII only (P5).
  - [ ] `tools/lookup-entity.ts`: the `matchQuality` computation
        currently keys ONLY on `r.current.help_desc.length > 20`.
        Reconcile the Query `match_quality` story so a row whose owned
        `entities.description` is substantive counts as `strong`
        (KTX/MVDSV describe-fill rows have `help_desc` NULL but a real
        owned description) -- otherwise the projection is invisible to
        the honest-failure protocol. Keep the existing help_desc path
        for ezquake/fte; this is an OR, not a replacement.
  - [ ] `API_CONTRACTS.md`: under the new-dataset checklist / Open
        drift, record that the KTX/MVDSV describe-fill projection rode
        the EXISTING `lookup_entity`/`search_entities` (step 2: same
        verb + same return shape -> NO new tool), that Discovery + the
        match_quality story were updated in the same commit (the Update
        rule), and add a one-line pointer to
        `docs/wiki-feed-contract.md`. Do NOT invent a new "Open drift"
        row unless a real residual gap exists.
  - [ ] Commit ALL of the above as ONE commit (F-D13a / API_CONTRACTS
        Update rule: shipping the projection without the
        orientation/tool/match_quality edit silently breaks Discovery).
        Adding an MCP tool here is WRONG and is a hard constraint.
- **Verification:**
  rebuild the MCP server (`bun` typecheck/build per the live MCP build
  script); `lookup_entity` on a known describe-filled KTX cvar (e.g.
  `k_short_gib`) returns the origin tag + the stale stamp field;
  `git show --stat HEAD` lists all of `entity-record.ts` `types.ts`
  `index.ts` `orientation.ts` `lookup-entity.ts` `API_CONTRACTS.md` in
  ONE commit; the `TOOL_LIST` length is unchanged
  (`grep -c "name: '" serve/mcp/src/index.ts` or the live tool-count
  assertion == 12). PASS condition: the L1 response carries the
  public-tier origin+stale fields; the six edits are in one commit; the
  tool count is unchanged; NO internal-tier field
  (verdict/confidence/reasoning/losing-provenance) appears on the MCP
  response.
- **Execution mode:** `subagent (Opus 4.7 medium)` -- a cross-cutting
  contract-surface edit across six files where the API_CONTRACTS
  "Update rule" + the new-dataset checklist are load-bearing and a
  miss silently breaks Discovery; knowledge breadth across the MCP
  surface + the honest-failure protocol matters more than raw speed.
  NOT Opus MAX (no spec-locked dial in Phase 5). NOT inline (a
  multi-file contract-surface edit with logic is not inline-shaped).

### Task 3 -- The D14 wiki-feed CONTRACT + the consumed snapshot payload

- **Goal:** emit the D14 feed CONTRACT (bot-owned read-only fenced
  namespace, regenerate-on-walk, the "auto-generated from qw-oracle
  Layer 1, do not edit" stamp) and name the snapshot the wiki consumes
  -- the CONTRACT only, NOT the wiki-side implementation (F-D14a
  cross-arc); not the inbound `scripts/snapshot-wiki/snapshot.py`.
- **Files:** `apps/qw-oracle/docs/wiki-feed-contract.md` (created);
  `apps/qw-oracle/API_CONTRACTS.md` (modified -- the pointer line is
  written in Task 2's commit; this task authors the contract body).
- **Steps:**
  - [ ] Write `docs/wiki-feed-contract.md` (ASCII, P5) stating: (a)
        the wiki receives bot-generated, read-only pages in a dedicated
        bot-owned namespace; (b) every page is stamped "auto-generated
        from qw-oracle Layer 1, do not edit" verbatim; (c) the pages
        regenerate from the snapshot on every KTX/MVDSV version walk
        (the SAME walk seam Task 4 wires -- the `extract-tag` /
        `deriveEntityDescriptionsForVersion` derive tail; reference it,
        do not duplicate it); (d) human-authored pages link/transclude
        these blocks, never edit them; seeded-then-editable is
        REJECTED (a human edit drifts the page from source -- the
        dual-maintenance failure the single-source model prevents); (e)
        the near-term primary consumer is the OPERATOR as a visual
        progress anchor (a plain regenerated page delivers it --
        prettification is separate later work, do NOT gold-plate, D14).
  - [ ] Name the consumed payload: it IS the Task-1 PUBLIC projection
        (`serialize-public.ts` output), NOT a second stored copy and
        NOT a new shape (one record, N serializers -- D13). State the
        exact payload contract as the PER-ENTITY PUBLIC field set
        (`{description, description_origin,
        description_anchor_version, stale_as_of?, type, default,
        structured_choices?}` -- `stale_as_of`/`structured_choices`
        omitted when absent), explicitly NOT the build-snapshot
        file-root metadata block (`schema_version`/`generated_at`/
        `oracle_commit`/...); the wiki consumes facts per knob, so the
        contract is the per-knob object shape, not the whole JSON
        tree. This lets the qwiki-v1-beta arc build the wiki side
        against a stable, precisely-named contract.
  - [ ] State the F-D14a boundary explicitly IN the doc: this contract
        does NOT create the wiki namespace, does NOT write the bot
        wiki-write path, does NOT style wiki pages -- that is
        qwiki-v1-beta / cross-arc scope, independent of the deferred
        qwiki Modes Phases 5-8. Distinguish it from the inbound
        `scripts/snapshot-wiki/snapshot.py` (that READS quakeworld.nu;
        this feed WRITES qw-oracle L1 facts outbound -- different
        direction, different contract; do not extend snapshot.py).
- **Verification:** `apps/qw-oracle/docs/wiki-feed-contract.md` exists,
  is ASCII-only, and states the five contract clauses + the consumed
  payload (= Task-1 projection, no second copy) + the F-D14a boundary +
  the inbound-vs-outbound distinction; `API_CONTRACTS.md` carries the
  pointer line (committed in Task 2). PASS condition: the contract doc
  carries all five D14 clauses, names the Task-1 projection as the
  payload (no new stored shape), and holds the F-D14a boundary; no
  wiki-side file is created anywhere.
- **Execution mode:** `subagent (Sonnet 4.7 medium)` -- a contract doc
  that is logic-bearing (the regenerate-on-walk seam reference, the
  payload-is-the-Task-1-projection identity, the F-D14a boundary, the
  inbound/outbound distinction) and must hold a precise cross-arc
  boundary; not inline because it wires to the Task-4 walk seam and the
  Task-1 payload contract and a boundary miss is a real scope-creep
  risk (F-D14a).

### Task 4 -- The D4 walk-time staleness report + owned-row protection at the derive seam

- **Goal:** wire the D4 walk-time Drifted/Added/Removed report into the
  new-KTX/MVDSV-version runbook at the existing
  `deriveEntityDescriptionsForVersion` derive-tail seam, and protect
  the owned describe-fill rows from the blind recompute-clobber so a
  flagged description keeps serving stamped "may be stale as of version
  X" -- a manual operator-paced confirm-or-rewrite pass, NOT auto-edit,
  NOT a notification system.
- **Files:**
  `apps/qw-oracle/scripts/describe-fill/staleness-walk-report.ts`
  (created);
  `apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts`
  (modified -- the owned-row guard);
  `apps/qw-oracle/scripts/load-knowledge/index.ts` (modified -- wire
  the report into the derive-tail seam).
- **Steps:**
  - [ ] Owned-row guard in `derive-entity-description.ts`: this file
        has a SEPARATE per-type deriver function (verified live:
        `deriveCvar`, `deriveCommand`, ... -- the header documents 13
        derivers), each issuing its own `UPDATE entities SET
        description=..., description_origin=...` for the walked
        `last_seen_version` with NO describe-fill guard. The guard MUST
        be added to EVERY deriver that writes an arc-scope bucket --
        cvar, command, cmdline_param, info_key (the four describe-fill
        types). Editing only one (e.g. `deriveCvar`) ships a PARTIAL
        guard: the command/cmdline_param/info_key derivers would still
        clobber owned rows. Each such deriver's `UPDATE` gets the same
        WHERE-clause exclusion: a row with
        `description_origin IN ('synthesized','shipped_doc')` AND
        `description_anchor_version IS NOT NULL` is NOT recomputed --
        the owned describe-fill description keeps serving (D4:
        "stale-but-present beats a hole"). ezquake/fte/qwcl rows are
        unaffected (they are not describe-fill-owned -- they carry
        `help_json`/`source_inline` with no `description_anchor_version`,
        so the exclusion predicate is false for them); the macro/
        hud_element/pure-template derivers (non-arc-bucket types) need
        no edit. The executor recons the exact deriver function names
        at execution and guards each of the four arc-bucket ones.
        Comment WHY (P5: D4 -- the walk must not silently overwrite the
        owned user-doc track).
  - [ ] `staleness-walk-report.ts`: at walk time compute, per owned
        synthesized row, anchor (`description_anchor_version`) vs the
        freshly-walked source facts and classify into three sections:
        **Drifted** -- the TIGHT triggers, nothing looser: (a) default
        changed; (b) type changed; (c) valid-values/enum set changed;
        (d) knob retired/renamed; (e) a genuine upstream source comment
        newly appeared; **(f -- C3) reachability classification changed
        for the knob** (composes with the parked reachability arc via
        the C3 stamp; no blocking dependency -- F-C3b). Read-site
        moves / cosmetic refactors are explicitly NOT triggers.
        **Added** -- new NULL-description knobs (falls out of the same
        exhaustive C1 N/M coverage count; no judgement call).
        **Removed** -- retired/renamed knobs whose description is now
        orphaned (routes to the existing `source_state_transitions`
        handling; do not invent a new mechanism). A Drifted row sets
        `description_rereview = TRUE` (the Phase-1 column) so the public
        projection stamps "may be stale as of version X" and KEEPS
        SERVING -- the report does NOT auto-edit the description.
  - [ ] Wire the report into the walk in `index.ts` beside
        `deriveEntityDescriptionsForVersion` (the `extract-tag` /
        `re-derive` seam): after the (now owned-row-guarded) derive
        tail runs for a KTX/MVDSV version, emit the report for the
        operator to review in-terminal at walk time (Claude proposes
        per row, operator approves/rewrites -- same model as the rest
        of the arc). It is operator-paced, NOT a notifier, NOT a
        monitoring website (those are explicitly future non-blocking
        hooks, NOT this arc -- D4).
  - [ ] The report is emitted under the Phase-1
        `scripts/describe-fill/` run-report convention (ASCII, P5);
        exact filename per the Phase-1/2/3/4 convention (executor
        confirms at execution -- low-stakes, mirrors Phase 1 Open Q
        (e)).
- **Verification:** operator-run at a SIMULATED new-version walk (this
  is the HONEST operator half of the phase boundary -- NOT a YES/NO
  probe). Steps: pick a describe-filled KTX or MVDSV cvar, simulate a
  drift trigger (e.g. bump a default in the extractor fixture, or use a
  Phase-0 forward-fetch that legitimately moved one), run the
  guarded derive tail + the report; confirm (i) the owned description
  was NOT clobbered (it still serves, now stamped
  `description_rereview=TRUE` / "may be stale as of version X"), (ii)
  the row appears in the report's Drifted section under the correct
  trigger, (iii) Added/Removed sections behave, (iv) the operator can
  work it per-row (confirm-or-rewrite) in-terminal. PASS condition: the
  operator confirms the report is correct, owned rows kept serving
  stamped (not auto-edited, not clobbered), per-row review works. This
  is operator judgement, recorded honestly -- not a probe.
- **Execution mode:** `subagent (Opus 4.7 medium)` -- this touches the
  SHARED `derive-entity-description.ts` load tail (must not regress the
  existing ezquake/fte/qwcl derive behavior) and encodes the tight D4
  trigger taxonomy + the C3-trigger-(f) compose + the owned-row
  protection; cross-cutting, judgment-dense, knowledge breadth across
  the load-version path matters. NOT Opus MAX (no spec-locked dial in
  Phase 5). NOT inline (a load-tail guard + a walk-wired report is not
  inline-shaped).

### Task 5 -- The phase-boundary harness (automated half) + the C5 round-trip confirmation

- **Goal:** a thin driver that asserts the automated half of the mixed
  phase boundary -- idempotent public-projection round-trip, C1
  coverage vs the N/M gate, all C5 probes GREEN through the projection
  round-trip, the F-D13a same-commit/no-new-tool invariants -- so the
  operator can run one command and read YES/NO. (Phase 5 writes NO new
  data shape -> ships NO new probe; its C5 obligation is to CONFIRM the
  Phase-1/2/3/4 probes stay GREEN through the round-trip.)
- **Files:**
  `apps/qw-oracle/scripts/describe-fill/verify-phase-5.ts` (created).
- **Steps:**
  - [ ] Idempotent round-trip: run `build-snapshot --project ktx` +
        `--project mvdsv` twice; fingerprint the per-entity bodies
        (exclude the file-root `generated_at`); assert byte-identical
        (C4/P3). C4 recovery is re-run the corrected serializer, NEVER
        an `UPDATE`.
  - [ ] C1 coverage: assert every in-scope KTX+MVDSV entity (the
        POST-Phase-0 N/M denominators, recon them live from
        `phase-0-results.md` at execution -- do NOT hard-code the
        pre-Phase-0 260/358/7 + 183/108/11/45) is carried in the public
        projection OR is an enumerated C1-outreach-track residue row.
        Residue carried, never importance-cut (C1) -- a count below the
        denominator with no matching residue row is a FAIL, not a
        lowered gate.
  - [ ] C5 round-trip: run `quality-grid --project ktx` and
        `--project mvdsv --family regression` for
        `F1.describe_fill.origin_vocabulary`,
        `F1.describe_fill.synthesized_requires_anchor`,
        `F1.describe_fill.provenance_entry_exists`,
        `F1.describe_fill.synthesized_requires_source_ref`,
        `F1.jsonb_columns_not_strings` -- assert all GREEN AFTER the
        public projection regenerates (the serializer must not regress
        an honesty invariant). Phase 5 adds NO new probe (no new
        shape); if the serializer somehow introduced a new shape that
        is a deviation -- surface it, do not silently add a probe.
  - [ ] F-D13a invariants: assert the MCP L1 response carries the
        public origin+stale fields; assert the tool catalog count is
        unchanged (NO new tool); assert (via `git show --stat` of the
        Task-2 commit) the orientation/tool/match_quality edit shipped
        in the SAME commit as the projection-surface change.
  - [ ] Emit a run report (the idempotency fingerprint, the coverage
        table vs the N/M gate, the C5 probe statuses, the F-D13a
        invariant results) under the Phase-1 `describe-fill/`
        convention. ASCII (P5).
- **Verification:** see the phase-boundary block below (this task's
  automated assertions ARE the automated half of the phase boundary;
  Task 4's operator simulated-walk is the operator half).
- **Execution mode:** `subagent (Sonnet 4.7 medium)` -- glue/driver +
  assertions against clear contracts (the hard logic is in Tasks 1/2/4),
  single file, light integration. NOT inline (a verification harness
  with logic is not inline-shaped).

## Verification (phase boundary)

HONESTLY MIXED. Run from `apps/qw-oracle/`, against the post-Phase-4
baseline (Phases 0-4 executed: the describe-fill record is
content-complete). PART A is automated YES/NO; PART B is the honest
operator-run D4 simulated walk (NOT a probe).

```
# === PART A -- automated (YES/NO) ===

# A1. Public projection emits for KTX + MVDSV and is idempotent
cd apps/qw-oracle
bun scripts/load-knowledge/index.ts build-snapshot --project ktx
bun scripts/load-knowledge/index.ts build-snapshot --project mvdsv
bun scripts/describe-fill/verify-phase-5.ts --idempotent
# PASS: build-snapshot no longer throws for ktx/mvdsv; the driver prints
# IDENTICAL=YES (two regenerations byte-identical minus generated_at -- C4/P3).

# A2. C1 coverage vs the POST-Phase-0 N/M gate (residue carried, never cut)
bun scripts/describe-fill/verify-phase-5.ts --coverage
# PASS: every in-scope KTX+MVDSV entity is carried OR is an enumerated
# C1-outreach-track residue row; covered+residue == the POST-Phase-0
# denominators (recon them live; pre-Phase-0 were KTX 260/358/7,
# MVDSV 183/108/11/45). FAIL: any importance-cut of residue, or a
# lowered denominator.

# A3. The PUBLIC tier excludes the INTERNAL fields (D13 audience line)
jq '[.. | objects | keys[]] | unique' \
  ../slipgate-app/src/lib/config/data/ktx-*.json | \
  grep -E 'verdict|confidence|reasoning|proposed|losing' && echo FAIL || echo PASS
# PASS: none of verdict/confidence/reasoning/proposed/losing-alternate
# appears in the public JSON (those are the Phase-1 internal tier only).

# A4. F-D13a: origin+stale ride the MCP L1 response; NO new tool; one commit
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "SELECT description_origin IS NOT NULL FROM entities \
  WHERE canonical_id='ktx:cvar:k_short_gib';"      # t
# (then) lookup_entity k_short_gib via the MCP test path returns the
# public origin tag + the may-be-stale stamp field.
git show --stat HEAD | grep -E 'entity-record|types.ts|index.ts|orientation|lookup-entity|API_CONTRACTS'
# PASS: the L1 response carries the public origin+stale fields; the MCP
# tool catalog count is unchanged (NO new tool); the orientation +
# tool-description + match_quality edit is in the SAME commit as the
# projection-surface change. FAIL: a new tool, or a split commit.

# A5. All C5 probes GREEN through the projection round-trip
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.describe_fill.origin_vocabulary
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.describe_fill.synthesized_requires_anchor
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.describe_fill.provenance_entry_exists
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.describe_fill.synthesized_requires_source_ref
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.jsonb_columns_not_strings
# (repeat the five with --project mvdsv)
# PASS: all print [PASS] AFTER the public projection regenerates (the
# serializer did not regress an honesty invariant). Phase 5 ships NO
# new probe (no new shape).

# A6. D14 contract exists; the wiki side is NOT implemented
test -f apps/qw-oracle/docs/wiki-feed-contract.md && \
  ! git status --porcelain | grep -E 'snapshot-wiki|wiki-bot|mediawiki' && echo PASS || echo FAIL
# PASS: the D14 feed contract doc exists (the five clauses + the
# consumed-payload identity + the F-D14a boundary); NO wiki-side file
# created (F-D14a -- contract + consumed snapshot only).

# === PART B -- operator-run (HONEST, not a probe) ===

# B1. The D4 walk-time staleness report at a SIMULATED new-version walk
#     Pick a describe-filled KTX or MVDSV cvar, induce one tight drift
#     trigger (a-f), run the owned-row-guarded derive tail + the report.
bun scripts/describe-fill/staleness-walk-report.ts --simulate <cvar>
# OPERATOR CONFIRMS, in-terminal, per row:
#  - the owned description was NOT clobbered by the derive tail (it
#    still serves, now stamped description_rereview=TRUE / "may be
#    stale as of version X");
#  - the drifted row appears in the report's Drifted section under the
#    correct trigger; Added/Removed sections behave;
#  - the report is a manual confirm-or-rewrite pass (Claude proposes,
#    operator approves) -- NOT auto-edit, NOT a notifier.
# This is operator judgement recorded honestly. There is no YES/NO
# probe for it -- that is the D4 design (an intermediary operator-paced
# report, ~1-2 events/engine/year), not a test gap.
```

If PART A all-PASS and the operator signs off PART B, operator proceeds
(Phase 5 -> approved/executed; the arc is COMPLETE -- Phase 6 is the
deferrable non-gating tail). If any PART A FAILs, consult Recovery; if
PART B surfaces a clobber or an auto-edit, that is a D4-wiring defect ->
Recovery.

## Outputs to next phase

The arc is COMPLETE and useful at the end of Phase 5 (D16/D17). Phase 6
is the deferrable, non-gating tail (the D16 upstream showcase); it is a
SEPARATE later prompt and is NOT planned or built here. State now true
that was not before:

- **The D13 PUBLIC projection exists:** `build-snapshot.ts` emits
  KTX+MVDSV public JSON (description + origin tag + anchor/"may be
  stale as of X" stamp + type + default + D9 structured choices as
  DATA) via the `serialize-public.ts` sibling serializer over the SAME
  D11 record the Phase-1 internal tier reads (one record, N
  serializers -- nothing stored twice); idempotent (re-run
  byte-identical); the embedding serializer config (prose +
  text-flattened structured choices) is confirmed and recorded (a
  serializer config, not a stored shape -- D13).
- **The F-D13a MCP delta shipped:** the origin tag + staleness stamp
  ride the `lookup_entity`/`search_entities` L1 response; the Discovery
  orientation blob + the two tool descriptions + the Query
  `match_quality` story were edited in the SAME commit; NO new MCP tool
  (the catalog stays 12 -- API_CONTRACTS new-dataset checklist honored,
  the Update rule satisfied). `API_CONTRACTS.md` records the resolution
  + points at the D14 contract.
- **The D14 wiki-feed CONTRACT exists** at
  `apps/qw-oracle/docs/wiki-feed-contract.md` (bot-owned read-only
  fenced namespace, regenerate-on-walk at the derive-tail seam, the
  do-not-edit stamp); the consumed payload IS the Task-1 public
  projection (no second stored copy); the wiki-side namespace/bot
  write path/page styling is NOT implemented (F-D14a cross-arc;
  qwiki-v1-beta consumes this contract independently).
- **The D4 walk-time staleness re-review is wired** into the
  new-KTX/MVDSV-version runbook at the existing
  `deriveEntityDescriptionsForVersion` derive-tail seam: the owned
  describe-fill rows are protected from the blind recompute-clobber
  (a flagged description keeps serving stamped "may be stale as of
  version X" -- D4); the Drifted/Added/Removed report (tight triggers
  a-f, incl. the C3 trigger (f) that composes with the parked
  reachability arc -- F-C3b, no blocking dependency) runs for the
  operator in-terminal at walk time; manual confirm-or-rewrite, NOT
  auto-edit, NOT a notifier.
- **All C5 probes stay GREEN through the projection round-trip** (the
  four `F1.describe_fill.*` + the jsonb ktx+mvdsv extension); Phase 5
  introduced NO new data shape and shipped NO new probe (C5).
- **F-D10b note (boundary, not fixed here):** the public projection
  carries descriptions on the loader-lowercased `name_fold` key; it
  re-projects clean with ZERO description rework when the tracked
  case-fidelity mini-arc lands. Phase 5 does NOT fix casing.

Runnable state: the completed KTX+MVDSV describe-fill record projects
deterministically to the public snapshot.json + the MCP L1 response +
the D14 wiki-feed contract, and the D4 staleness re-review is wired into
the version walk with the owned rows protected. The commit at the phase
boundary leaves the system runnable (P4: commits on `main`, no
worktree/PR ceremony; the arc-ship tag
`arc-ktx-mvdsv-l1-describe-fill-shipped` is the end-of-arc landmark --
operator/orchestrator tags at ship, not a per-phase tag).

## Open questions / deferred items

- **Question (a) -- Phase 5 EXECUTION presupposes Phases 0+1+2+3+4
  EXECUTION.** The arc is in PLANNING (live-verified this draft: no
  migration 014, no `describe-fill/`, no `serialize-audit-review.ts`,
  the four `F1.describe_fill.*` probes absent, build-snapshot still
  throws for ktx/mvdsv). **Default chosen for now:** "Inputs from
  previous phase" makes all five a hard precondition; if any has not
  executed, Phase 5 halts and reports BLOCKED with the missing
  precondition (not a Phase 5 defect -- the slicing order is
  0/1 -> 2 -> 3 -> 4 -> 5; the consumer projection is deliberately
  Phase 5 per the locked slicing analysis, no verification-regime
  collision). **Who can resolve:** arc-orchestrator at execution time
  (sequencing, flagged here -- not a reshape; README locks 5 after
  1-4). Same honest pattern Phases 2/3/4 recorded.

- **Question (b) -- the D4 owned-row guard lives in the existing
  `derive-entity-description.ts` load tail; is that Phase 5 wiring or a
  retroactive Phase-1-spine concern?** Live-verified: `deriveCvar`
  (and the sibling derivers) UNCONDITIONALLY recompute
  `description`+`description_origin` for the walked version with NO
  describe-fill guard; Phases 1-4 do not touch this file. D4 ("a
  flagged description keeps serving stamped may be stale as of version
  X") is impossible unless the walk stops clobbering the owned rows,
  and D4 is explicitly "wire the walk-time re-review into the
  new-version runbook" -- the walk IS the `extract-tag` /
  `deriveEntityDescriptionsForVersion` tail. **Default chosen for now
  (recommended):** the owned-row guard + the report are Phase 5's D4
  wiring (Task 4) -- it is the new-version-runbook wiring D4 names, not
  a Phase-1 spine rebuild (Phase 1 built schema/skill/gate/internal
  serializer; it never touched the load-version derive tail). **Who
  can resolve:** operator -- confirm this is the faithful D4 reading
  (the guard is intrinsic to "keeps serving"; surfaced per the
  never-silently-comply / never-silently-skip rule -- this is a real
  load-bearing interaction, not glossed). Not a `decisions.md` change
  (D4 already locks the walk-time wiring as Phase 5's); if the operator
  reads the derive-tail edit as Phase-1-spine scope, that is a one-line
  routing note, not a reshape.

- **Question (c) -- the snapshot.json field list + the embedding
  serializer config are planner/executor serializer-config scope (D13),
  recorded NOT re-opened.** D13 explicitly: "what goes into the
  embedding" + "the snapshot.json field list" are serializer configs,
  NOT schema or brainstorm questions. **Default chosen for now:** the
  PUBLIC field set is `description` + `description_origin` +
  `description_anchor_version`/derived stale stamp + `type` + `default`
  + the D9 structured choices as DATA (Task 1); the embedding input is
  that prose + a text-flattened structured-choices rendering (Task 1
  config statement). **Who can resolve:** executor confirms the exact
  field names against the Phase-1 014 column names at execution
  (low-stakes, mirrors Phase 1 Open Q (e)); recorded here per D13, not
  re-opened.

- **Question (d) -- the F-D13a exact orientation/tool-description edit
  sites are pinned (grep-verified), recorded for the executor.**
  Sites: `serve/mcp/src/entity-record.ts` (SELECT + `toEntityRecord`),
  `serve/mcp/src/types.ts` (`EntityRecord`), `serve/mcp/src/index.ts`
  (`TOOL_LIST` `lookup_entity` ~205 / `search_entities` ~230 + the
  search query-input desc ~234), `serve/mcp/src/orientation.ts`
  (`ORIENTATION_INSTRUCTIONS`), `serve/mcp/src/tools/lookup-entity.ts`
  (`matchQuality` ~53). **Default chosen for now:** Task 2 edits
  exactly these six (incl. `API_CONTRACTS.md`) in ONE commit; NO new
  tool. **Who can resolve:** executor verifies the line numbers are
  still accurate at execution (the MCP server may have moved lines;
  the file set is the contract, line numbers are a convenience).

- **Question (e) -- run-report / contract-doc exact filenames.** The
  Phase-5 drivers emit run reports under the Phase-1
  `scripts/describe-fill/` convention; the D14 contract is at
  `apps/qw-oracle/docs/wiki-feed-contract.md`. **Default chosen for
  now:** these paths per the Phase-1/2/3/4 convention; exact run-report
  filenames are low-stakes, executor confirms at execution (mirrors
  Phase 1 Open Q (e) / Phase 3 Open Q (c) / Phase 4 Open Q (c)).
  **Who can resolve:** executor at execution.

If a sub-agent finding contradicts `decisions.md`, the decision wins
and the finding is rejected here with a one-line rationale; if a lock's
factual premise looks wrong (the OQ-3 discipline), it is surfaced for
amendment, never silently overridden, never silently complied with.

- **Sub-agent verification pass completed 2026-05-17** (Explore agent,
  full phase-template brief with item 8 in its 2026-05-17-corrected
  form + the 13 template checks + the Phase-5-specific F-D13a/F-D14a/
  D13-audience/D4 confirmations + a live spot-check of the Recon
  claims). Result: **ZERO CRITICAL, THREE SUBSTANTIVE, THREE
  ADVISORY.** No finding contradicted `decisions.md`; nothing
  rejected; no lock's factual premise looked wrong (OQ-3 -- nothing
  surfaced for amendment). All three SUBSTANTIVE were clarity
  strengthenings within the locked design, APPLIED: (1) `serialize-
  public.ts` must OMIT the optional `structured_choices` element for
  no-enum rows (D11-amendment additive shape; k_short_gib boolean) so
  the projection stays byte-stable -- Task 1 step sharpened; (2) the
  D4 owned-row guard must be added to EVERY arc-bucket deriver
  (cvar/command/cmdline_param/info_key), not one -- a single-deriver
  edit ships a partial guard; Task 4 step now states this explicitly
  + the executor recons the exact per-type deriver function names; (3)
  Task 1 must VERIFY (not assume) that live `embed-entities.ts`
  embeds the owned `entities.description` column + that the owned-row
  write flips `description_embedding_stale`, so the embedding
  serializer config holds with no embed-path change -- Task 1 step
  now requires the verification + surfaces a silent
  embeddings-not-updated bug as a deviation. ADVISORY: (2) Task 3's
  consumed-payload contract sharpened to the explicit PER-ENTITY
  PUBLIC field set (not the build-snapshot file-root metadata) --
  APPLIED; (1) coverage-denominator-freshness was ALREADY explicit in
  Task 5's coverage step + the phase-boundary A2 block ("recon live
  from phase-0-results.md; do NOT hard-code the pre-Phase-0 numbers")
  -- no redundant edit; (3) the per-task model+effort range was a PASS
  confirmation (Sonnet MAX / Opus medium / Sonnet medium consistent
  with the stated posture; no spec-locked MAX) -- no change.

## Recovery (if verification fails)

C4 discipline throughout: recovery is re-running the corrected
serializer / re-running the corrected walk wiring end-to-end, NEVER an
`UPDATE` that patches the visibly-wrong rows in place (a hand-patch
repairs only noticed damage; the same bug typically re-shaped unnoticed
rows too -- `feedback_repair_by_reextract_not_sql_update`).

- **A1 build-snapshot still throws for ktx/mvdsv, or IDENTICAL=NO (not
  idempotent):** the KTX/MVDSV branch was not added, or the serializer
  has a non-deterministic step (unstable key ordering, a timestamp in
  the per-entity body). Make `serialize-public.ts` deterministic
  (stable ordering, `generated_at` is the only volatile field and is
  file-root metadata), re-run build-snapshot twice (C4/P3). Suspect
  idempotency before staleness (`feedback_idempotency_before_staleness`).
- **A2 coverage below the N/M gate, or residue silently shrunk:** the
  serializer dropped in-scope rows or filtered residue on an importance
  argument (a C1 violation). The projection is a faithful MIRROR of the
  completed record -- carry every in-scope row OR its enumerated
  residue disposition; do NOT lower the denominator (C1). Fix the
  serializer, re-emit (C4).
- **A3 an internal-tier field leaked into the public JSON:** the
  public/internal split was breached (D13 audience line). Remove the
  verdict/confidence/reasoning/proposed/losing-alternate from
  `serialize-public.ts`, re-emit (C4). The origin tag + stale stamp
  already discharge the D2 honesty obligation -- the trail is the
  internal tier (`serialize-audit-review.ts`, Phase 1) only.
- **A4 a new MCP tool appeared, or the F-D13a edit split across
  commits:** adding a tool is WRONG (API_CONTRACTS new-dataset
  checklist step 2 -- same verb + shape = rows behind an existing
  tool). Remove the tool; redo the change as the orientation +
  tool-description + match_quality + entity-record edit in ONE commit
  (the Update rule). Re-run A4.
- **A5 a C5 probe FAILs after the projection round-trip:** the
  serializer regressed an honesty invariant (e.g. it re-stringified a
  JSONB read, or dropped an origin tag in a derived view). Fix the
  serializer, re-emit, re-run the probe (C4). Do NOT loosen the probe;
  Phase 5 ships no new probe and must not weaken an existing one.
- **B1 the owned description was clobbered, or the report auto-edited
  it:** the Task-4 owned-row guard failed or the report wrote the
  description. D4 is NOT auto-edit -- a flagged description keeps
  serving stamped, only `description_rereview` is set. Fix the guard
  in `derive-entity-description.ts` (skip
  `description_origin IN ('synthesized','shipped_doc')` with an
  anchor) and the report (set the flag, never the text), re-run the
  simulated walk (C4). Do NOT `UPDATE` the clobbered row back by hand
  -- re-run the corrected guarded derive tail.
- **Unanticipated failure:** route to operator with the failing check's
  output verbatim; do not explain the gap away (CLAUDE.md verification
  discipline).
