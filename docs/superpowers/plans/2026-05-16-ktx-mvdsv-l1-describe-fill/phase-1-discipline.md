# Phase 1 -- The discipline, built once

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- C1-C5, P1-P5, D1-D19).
> 2. Read `review-findings.md`; identify the rows whose "Phase" is this
>    phase (ownership table at the bottom).
> 3. Recon the LIVE source before inlining anything: the actual extractor
>    shape for the engine in scope (KTX tree-sitter vs MVDSV libclang are
>    DIFFERENT -- F confirmed-good note), the actual `entities` /
>    `*_versions` schema (`apps/qw-oracle/SCHEMA.md` + `db/migrations/`),
>    the actual probe-0 N/M denominators. Do NOT copy numbers or code from
>    the spec without verifying against live source.
> 4. After drafting, dispatch the verification sub-agent (brief at the
>    bottom of `phase-template.md`) before declaring the phase MD ready.

> **Recon note (RESOLVED at scaffold 2026-05-17 -- not re-raised).** The
> earlier "KTX extractor is tree-sitter" scaffold wording is corrected:
> canonical KTX is libclang/C; the D9 per-engine difference is a
> shipped-config sibling parser, not a tree-sitter-vs-libclang split. See the
> dated CORRECTION 2026-05-17 in `review-findings.md` "Confirmed-good" and
> `phase-template.md` (commit f3574f26). No Phase 1 impact -- Phase 1 harvests
> one shipped-config comment line and touches no source AST.

## Goal

Phase 1 builds the entire describe-fill discipline ONCE, engine-agnostic, so
both KTX and MVDSV ride identical machinery: the provenance/staleness schema
fields on `entities` (D2/D11) as an append-only migration plus the matching
`SCHEMA.md` documentation; the guardrailed per-knob D6 synthesis skill on the
proven `asset-type-curate`/`guide-rewrite`/`validate-extractor` precedent; the
D7 two-tier review gate (independent automated evidence re-check + the operator
batch tail surface); the D11/D15 internal-tier audit-review HTML serializer
emitted from the record (no prior generator exists -- F-D11a -- this is a NEW
emitter against the D11/D15 column family); and the two C5 F1 quality-grid
probes for the data shapes Phase 1 is the first to write. The phase is a
build-once horizontal foundation with no consumer surface of its own, so its
verifiable state is the **D19 walking-skeleton smoke**: the FULL pipeline
(single-cvar mechanical-candidate harvest -> D5-D8 evaluate -> D6 synthesize
-> D7 two-tier gate -> D11/D15 serialize -> C5 probe) runs end-to-end against
ONE real simple KTX cvar (`k_short_gib`), its full provenance-stamped record
round-trips the D11/D15 serializer, and the two C5 probes go GREEN on it --
with ZERO dependency on Phase 2 or Phase 3 rows existing. That self-contained
one-cvar round-trip IS the runnable, verifiable state at the phase boundary.

## Inputs from previous phase

**Phase 1 does NOT consume Phase 0.** Per the locked slicing analysis
(`README.md`): Phase 0 and Phase 1 are independent and draftable/executable in
parallel -- Phase 1's spine is engine-agnostic; Phase 0 sizes Phase 4, not
Phase 1. Phase 1's inputs are the operator-side `prerequisites.md`
"Required before Phase 0 / Phase 1" items, all verified satisfied 2026-05-16:

- Postgres dev container up and L1 KTX + MVDSV extracts loaded
  (`entities` carries `ktx|1827`, `mvdsv|1236` -- the describe-fill fills
  description fields on cvar rows that ALREADY exist; it never creates
  entities).
- `apps/qw-oracle/.env` populated with `DATABASE_URL`
  (`postgresql://qworacle:dev@localhost:5432/qw_oracle`); `.env` gitignored.
- Research repos present:
  `research/repos/ktx/resources/example-configs/ktx/ktx.cfg` and
  `research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg` (the two shipped
  KTX configs the D19 one-cvar harvest reads), and
  `research/repos/ktx/src/world.c` (the cvar registration site for source
  grounding).
- Awareness item acknowledged: the "2026-05-15 cvar-audit-review.html" visual
  template does NOT exist anywhere in the tree (F-D11a, re-verified by this
  drafter's recon -- no artifact, no generator under `/home/paradoks/projects`).
  Phase 1 builds a NEW emitter from the D11/D15 enumerated column family.

## Recon facts (live baseline -- drafter-verified via psql 2026-05-17)

Live-DB facts the tasks and probes build on. Verified by the drafter against
`qw-oracle-postgres-dev` on 2026-05-17 (not inferred). The correction vs the
first draft: the description baseline is NOT zero -- every probe and
phase-boundary check in this phase is written against this real baseline.

- **`entities` `description%` columns TODAY = 6** (verified):
  `description`, `description_embedding`, `description_embedding_sha256`,
  `description_embedding_stale`, `description_origin`, `description_tsv`. The
  four `description_embedding*` / `description_tsv` columns belong to the
  L3/embedding + tsvector pipeline, NOT this arc. Consequence: a
  `column_name LIKE 'description%'` count is ambiguous (it sweeps those four
  in) -- every schema check in this phase uses the explicit 9-name IN-list
  (Task 1 verification == phase-boundary check 1), never `LIKE`.
- **Pre-existing description coverage is non-zero** (described =
  `description IS NOT NULL`), against the probe-0 denominators (verified):
  - KTX: cvar 68/260, command 311/358, info_key 7/7.
  - MVDSV: cvar 35/183, info_key 45/45, command 0/108, cmdline_param 0/11.
  - Arc-scope total described = 466.
- **All 466 baseline-described arc rows carry `description_origin =
  'source_inline'`** (verified: arc-scope origin distribution is exactly
  `source_inline:466`, nothing else). `source_inline` is in the arc-scoped
  allowed set, so `F1.describe_fill.origin_vocabulary` is **already GREEN on
  the baseline** -- recorded as the expected pass state, NOT a defect and NOT
  something Phase 1 remediates.
- **KTX cvars with `description_origin IN ('synthesized','shipped_doc')` = 0**
  at baseline (verified). The D19 smoke is the first row to enter that set --
  which is exactly what makes the origin-scoped self-containment check
  (phase-boundary check 5) a precise PASS=1 signal rather than a
  guaranteed-false `description IS NOT NULL` count (which is 68 at baseline).
- **The D19 target is unfilled** (verified): `entities` row
  `canonical_id='ktx:cvar:k_short_gib'` has `description` NULL and
  `description_origin` NULL today. The smoke fills exactly this row.

## Files touched

### Created

```
apps/qw-oracle/db/migrations/014_description_provenance_trail.sql   # append-only (P1); the D2/D11 schema fields
~/.claude/skills/<d6-skill-slug>/SKILL.md                           # the D6 guardrailed synthesis skill (name: Open Q e)
~/.claude/skills/<d6-skill-slug>/references/                        # heavy material externalized (SKILL.md < ~300 lines)
apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts     # NEW D11/D15 internal-tier HTML emitter (emit-from-record)
apps/qw-oracle/scripts/describe-fill/review-gate.ts                 # D7 tier-1 independent automated evidence re-check harness
apps/qw-oracle/scripts/describe-fill/smoke-one-cvar.ts              # D19 walking-skeleton driver (one-cvar harvest + wire)
```

The `apps/qw-oracle/scripts/describe-fill/` directory is new; it is the home
for the engine-agnostic spine. Phase 2/3/4 add the volume extractors and the
fan-out drivers beside it; Phase 1 lands only the spine + the one-cvar smoke.

### Modified

```
apps/qw-oracle/SCHEMA.md                                            # document description / description_origin (pre-existing 012 doc gap) + the 7 new fields, SAME task as the migration (P1)
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts               # register the 2 new C5 probes in REGRESSION_PROBES
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md  # Phase 1 status -> drafted/approved (status column only; operator-driven)
```

The `SCHEMA.md` entities section (lines 61-92 today) documents neither
`description` nor `description_origin` (migration 012 added the column but did
not update `SCHEMA.md` -- a pre-existing doc-drift). Phase 1's P1 obligation to
update `SCHEMA.md` alongside its migration closes that gap honestly: the new
entities-section block documents `description`, `description_origin` (live
vocabulary), AND the seven Phase 1 fields together as one coherent
description-provenance family.

### Deleted

```
n/a   # Phase 1 is purely additive; the loader-fix delete-shaped change is Phase 0, not here.
```

## Tasks

### Task 1 -- The D2/D11 schema migration + SCHEMA.md

- **Goal:** add the description-provenance/staleness/trail field family to
  `entities` as one append-only migration, documented in `SCHEMA.md` in the
  same task.
- **Files:** `apps/qw-oracle/db/migrations/014_description_provenance_trail.sql`
  (created); `apps/qw-oracle/SCHEMA.md` (modified).
- **Steps:**
  - [ ] Confirm against live `db/migrations/` that the next free number is
        `014` (current highest is `013_entity_name_source_case_fold.sql`).
  - [ ] Write `014_description_provenance_trail.sql` adding to `entities`,
        ALL nullable or defaulted so the add is safe on the 1827 KTX + 1236
        MVDSV existing rows (mirrors the safe-additive shape of migrations
        012/013):
        - `description_anchor_version TEXT NULL` -- the version string a
          `synthesized` description was authored against (D2/D4 staleness
          anchor; NULL for non-synthesized rows).
        - `description_rereview BOOLEAN NOT NULL DEFAULT FALSE` -- D4
          walk-time staleness flag; a flagged description keeps serving,
          stamped "may be stale as of version X".
        - `description_provenance JSONB NULL` -- D11 retained multi-source
          provenance: a JSON array, one object per contributing shipped
          file, each `{source_file, source_line, shipped_value,
          raw_comment}`. Losing/alternate sources are retained as DATA, never
          discarded (D10/D11). NULL when there is no shipped-file contributor.
        - `description_verdict TEXT NULL` -- D11 decision trail: the D5-D8
          evaluation verdict.
        - `description_confidence TEXT NULL` -- D11 trail: synthesis/eval
          confidence.
        - `description_reasoning TEXT NULL` -- D11 trail: D6's reasoning,
          STORED not just logged ("we want the reasoning so we can review
          it").
        - `description_proposed TEXT NULL` -- D11 trail: the proposed
          description as it stood before the D7 gate (so the audit page can
          show before/after even after commit).
  - [ ] Add NO CHECK constraint on `description_origin` or any new column.
        This is deliberate and load-bearing: migration 012's header states
        the column is "kept loose so future origin values ... can be
        introduced without a migration". The D2/D11 vocabulary is enforced by
        the C5 F1 probe (Task 2), consistent with C5's principle that an
        honesty guarantee nothing mechanically enforces is hollow -- the
        probe IS the enforcement; a CHECK would fight 012's deliberate design
        and P1's append-only spirit. Comment this WHY in the migration (P5).
  - [ ] Update `SCHEMA.md`'s `entities` section: add `description`,
        `description_origin` (closing the pre-existing 012 doc gap), and the
        seven new fields. Document the origin vocabulary precisely: the
        column-wide superset is
        `help_json` / `source_inline` / `inherited` / `synthesized` /
        `shipped_doc` / NULL; the KTX/MVDSV configurable buckets this arc
        fills are restricted to `source_inline` / `synthesized` /
        `shipped_doc` (D2/D11); `help_json` is ezQuake/FTE-only and
        `inherited` is the reserved-unused QWCL slot. State that the
        vocabulary is enforced by `F1.describe_fill.origin_vocabulary`, not a
        CHECK.
  - [ ] Apply the migration: `bun db/migrate.ts` from `apps/qw-oracle/`
        (the migrator runs `.sql` in lexical order, tracks
        `schema_migrations` by filename+sha256, rejects edits to applied
        migrations).
- **Verification:** identical to phase-boundary check 1 -- mirror it; do NOT
  use `LIKE 'description%'` (the live column set already has 6 `description%`
  columns incl 4 embedding/tsv ones -- see Recon facts -- so a LIKE count is
  ambiguous):
  `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc
  "SELECT count(*) FROM information_schema.columns WHERE
  table_name='entities' AND column_name IN ('description','description_origin',
  'description_anchor_version','description_rereview','description_provenance',
  'description_verdict','description_confidence','description_reasoning',
  'description_proposed');"`
  -- PASS condition: prints `9` (pre-migration baseline is `2` --
  `description`, `description_origin`; the migration adds the other 7).
- **Execution mode:** `subagent (Opus medium)` -- schema-foundation design
  that must reconcile the existing 012 looseness, honor P1 (append-only) and
  P2 (JSONB shape), and write faithful SCHEMA.md prose; knowledge breadth
  across the existing migration corpus matters more than raw speed. Not
  inline: a schema migration is explicitly NOT inline-shaped
  (`feedback_no_subagents_for_mechanical_edits` sharpened; phase-template).

### Task 2 -- The two C5 F1 quality-grid probes

- **Goal:** ship the regression probes for the two data shapes Phase 1 is the
  first to write (origin tag vocabulary; synthesized-row anchor), registered
  and GREEN at the phase boundary (C5 / F-C5a).
- **Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`
  (modified).
- **Steps:**
  - [ ] Write `probeDescribeFillOriginVocabulary` returning `ProbeResult`
        (the live `Probe` interface: `{ name, family, description,
        run(ctx: { sql, project }) }`; pure read-only SQL; no writes).
        Two-part assertion:
        (i) GLOBAL guard, runs for every project: no `entities` row has
        `description_origin` outside
        `{help_json, source_inline, inherited, synthesized, shipped_doc}`
        (NULL is allowed only where `description IS NULL`);
        (ii) ARC-SCOPED guard, for `project IN ('ktx','mvdsv')` and
        `type IN ('cvar','command','cmdline_param','info_key')`:
        `description_origin` is `IN ('source_inline','synthesized',
        'shipped_doc')` whenever `description IS NOT NULL`. `status='FAIL'`
        with offending rows in `examples` on any violation, else `'PASS'`.
  - [ ] Write `probeDescribeFillSynthesizedRequiresAnchor` returning
        `ProbeResult`: every `entities` row with
        `description_origin='synthesized'` has a non-NULL
        `description_anchor_version`. `FAIL` lists offenders, else `PASS`.
  - [ ] Register both in `REGRESSION_PROBES` (the array at quality-grid.ts
        ~line 1962), name them `F1.describe_fill.origin_vocabulary` and
        `F1.describe_fill.synthesized_requires_anchor`, `family:'regression'`
        (pinned invariants, not open-ended anomalies).
  - [ ] Do NOT extend `F1.jsonb_columns_not_strings` here. That extension is
        Phase 2's (Phase 2 is the first to write the retained-provenance
        JSONB at volume; C5 places a shape's probe in the phase that first
        writes it -- Phase 1 writes JSONB only for the one D19 cvar, Phase 2
        first writes it as a data shape).
- **Verification:**
  `cd apps/qw-oracle && bun scripts/load-knowledge/index.ts quality-grid
  --project ktx --family regression --probe F1.describe_fill.origin_vocabulary`
  then `--probe F1.describe_fill.synthesized_requires_anchor`
  -- PASS condition: both report `[PASS]`. Baseline state (Recon facts):
  `origin_vocabulary` is already GREEN (all 466 baseline arc rows are
  `source_inline`, in-vocabulary -- NOT zero rows); `synthesized_requires_anchor`
  is vacuously GREEN (0 `synthesized` rows at baseline). After Task 6 fills
  `k_short_gib` (origin synthesized/shipped_doc + anchor stamped) both stay
  GREEN -- that is the real assertion.
- **Execution mode:** `subagent (Sonnet medium)` -- code synthesis against a
  clear, established in-file pattern (the existing probe functions are the
  template), single file, reasoning required for the project/type-scoped SQL.

### Task 3 -- The D6 guardrailed per-knob synthesis skill

- **Goal:** author the dedicated synthesis skill on the proven precedent,
  hard-coding every D6 guardrail; this is the unit Phase 3/4 fan out over.
- **Files:** `~/.claude/skills/<d6-skill-slug>/SKILL.md` +
  `~/.claude/skills/<d6-skill-slug>/references/` (created).
- **Steps:**
  - [ ] Follow the verified common precedent shape (from
        `asset-type-curate` 249 / `guide-rewrite` 392 / `validate-extractor`
        250 lines): frontmatter (name + trigger description); trigger
        phrases; inputs; context-files-to-load; a HARD pre-flight gate with
        explicit abort conditions; numbered workflow steps each carrying its
        own output schema + who-runs-it + in-step rules; a status/verdict
        enum; flag-gated output branches; an output-locations table; a
        sub-agent brief template (>=6 non-inferential elements); a
        reporting/halt contract; a verification-discipline section;
        escape hatches; common pitfalls; a `references/` subdir for heavy
        material; a "when unsure, ask" rule.
  - [ ] HARD-CODE the D6 guardrails (decisions.md D6 + amendments):
        - The D5 quality-bar rubric (amended) is the keep-vs-synthesize
          judgment: WHAT the knob does in admin-observable terms, not WHY the
          code does it; not a restatement of the name; units/enum meanings
          spelled out; mechanism only, no opinion; self-contained without
          reading source. EVERY entity is evaluated; a trailing comment is
          one input, never a "done" verdict (the D5 amendment supersedes the
          original "clears the bar -> kept as-is" phrasing).
        - Read-site grounding: the synthesis input is the code USE-SITES, not
          the knob name. The skill forbids name-only synthesis.
        - Evidence requirement: every `synthesized` row carries a
          `source_ref` file:line plus the anchor version, reusing the
          EXISTING citation mechanism (the `cvar_versions`/`command_versions`
          `source_file`+`source_line` pair, indexed
          `idx_cvar_versions_source`) -- NO new citation format invented
          (P3, D6).
        - Hard confabulation guard: not source-legible -> hedge or route to
          the C1 residue/outreach track, NEVER guess.
        - C3 sibling: a suspect-pool knob gets the truthful dead-stamp
          ("registered in KTX/MVDSV source at version N; not reachable in a
          running build at this commit; appears non-functional, candidate
          upstream code bug") and routes to the C1 track -- NOT a confident
          "tunes X". (Phase 1 only needs the skill to ENCODE this rule; the
          suspect pool itself is Phase 0's product, consumed Phase 3/4.)
        - Research-docs amendment: the landscape research docs are admissible
          AIDS (locate use-sites, corroborate); source stays ground truth;
          the committed `source_ref` + anchor remain the evidence.
        - D8 sibling: bot/judgment-tier cvars get mechanism-only descriptions
          and count as complete L1; tuning advice routes OUT to L3, never
          tracked as an L1 gap.
  - [ ] Record IN THE SKILL that its synthesis pass runs at **Opus 4.7 MAX
        reasoning** -- spec-locked by D7; the skill declares this dial, it is
        not a per-invocation choice.
  - [ ] Keep `SKILL.md` under ~300 lines (operator memory
        `feedback_skill_size_lean_skill_md`; long skills lose rule
        adherence). Push the rubric text, the residue-routing recipe, the
        dead-stamp template, and the sub-agent brief into `references/`.
- **Verification:** the skill file exists and `SKILL.md` is < ~300 lines;
  a read-through confirms each of the six D6 guardrails above is explicitly
  present (the Task 6 smoke is the behavioral proof). PASS condition:
  `wc -l` < 320 AND the six guardrails each have a named section/rule.
- **Execution mode:** `subagent (Opus 4.7 MAX)` -- this is the spec-locked D6
  synthesis discipline; every synthesized KTX/MVDSV description in Phases 3-4
  rides it, the precedent-fidelity + guardrail-correctness judgment is
  architecturally load-bearing, and D7 fixes the synthesis dial at Opus 4.7
  MAX. Best-tool, no overkill filter -- this is the one artifact that must be
  right.

### Task 4 -- The D7 two-tier review gate

- **Goal:** build the gate every synthesized row passes before commit: an
  independent automated evidence re-check (tier 1) and the wiring to the
  operator batch tail (tier 2, surfaced on the Task 5 audit page).
- **Files:** `apps/qw-oracle/scripts/describe-fill/review-gate.ts` (created).
- **Steps:**
  - [ ] Build the tier-1 independent automated evidence re-check: a separate
        invocation (NOT the authoring context) that, for every candidate
        row, confirms the cited `source_ref` file:line actually exhibits the
        claimed behavior AND the text passes the D5 rubric mechanically.
        Fail -> the row is bounced back to re-synthesis or routed to the C1
        residue track; it does NOT commit.
  - [ ] Record that the tier-1 review pass runs at **Opus 4.7 MAX, as an
        independent Opus 4.7 invocation** -- spec-locked by D7; the
        annotation records the dial, the planner does not lower it.
  - [ ] Wire tier 2: the operator batch tail (hedged rows + residue-routed
        rows + a spot-check sample of the auto-passed bulk) is performed on
        the D11/D15 audit-review HTML page (Task 5). Tier 1 marks which rows
        land in the tail; the page renders them. Phase 1 builds the
        plumbing; the actual operator pass runs in Phase 3/4.
  - [ ] The gate is engine-agnostic: it consumes the structured candidate +
        the D6 reasoning/verdict/confidence trail; it has no KTX- or
        MVDSV-specific logic.
- **Verification:** the Task 6 smoke routes `k_short_gib` through tier 1 and
  the row commits with `description_verdict` / `description_confidence` /
  `description_reasoning` populated. PASS condition: post-smoke,
  `SELECT description_verdict, description_confidence FROM entities WHERE
  canonical_id='ktx:cvar:k_short_gib'` returns non-NULL for both.
- **Execution mode:** `subagent (Opus 4.7 MAX)` -- the gate is cross-cutting
  correctness machinery on the one thing that must be correct; the tier-1
  review pass it performs is spec-locked Opus 4.7 MAX (D7). Recorded, not
  lowered.

### Task 5 -- The D11/D15 internal-tier audit-review HTML serializer

- **Goal:** build a NEW emit-from-record serializer that renders the internal
  tier of the D13 model as one sortable/filterable HTML page, row-per-entity,
  with the before/after/why triple INLINE per row.
- **Files:**
  `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts` (created).
- **Steps:**
  - [ ] Read the record from Postgres via the existing postgres-js helper
        (`apps/qw-oracle/scripts/load-knowledge/db.ts` pattern); no new DB
        access layer. There is NO prior generator and NO `cvar-audit-review.html`
        artifact anywhere (F-D11a, re-verified) -- build a NEW emitter against
        the D11/D15 enumerated column family:
        `name / source_file / verdict / confidence / reasoning /
        proposed_desc`, plus the committed description and the retained
        `description_provenance` entries (losing alternates included -- this
        is the internal tier; D13).
  - [ ] One page, all in-scope entries, scan-the-whole-work. Row-per-entity.
        Sortable + filterable. The original codebase/config comment, our
        proposed/committed description, and the D6 reasoning are shown
        TOGETHER, INLINE per row, as ONE before/after/why comparison unit --
        NOT split into separate panels or three filtered views
        (`feedback_inline_pairs_over_split_panels`; D15 locked).
  - [ ] This is the INTERNAL-tier serializer only. It additionally carries
        confidence + reasoning + verdict + losing provenance vs the public
        projection. The PUBLIC projections (wiki feed, snapshot.json) and the
        MCP public-projection delta are Phase 5 / F-D13a -- explicitly OUT of
        Phase 1 scope. Do not touch `serve/mcp/src/orientation.ts` or any
        public tool here.
  - [ ] Output is ASCII (P5): the generated HTML emits ASCII only, no
        em-dash/en-dash/emoji.
- **Verification:** the Task 6 smoke emits the page; opening it shows
  `k_short_gib` as one row with the two ktx.cfg comments, the committed
  description, and the reasoning inline. PASS condition: the emitted HTML
  file exists, contains exactly one entity row for `k_short_gib`, and that
  row carries the before/after/why triple inline (not in separate sections).
- **Execution mode:** `subagent (Sonnet 4.7 MAX)` -- judgment-dense emitter
  (inline-pairs discipline, sort/filter, a novel HTML-from-Postgres pattern
  with no in-repo precedent), 1 file, multi-file integration is light;
  Sonnet MAX preferred for speed over Opus medium since the design
  constraints are fully specified by D11/D15.

### Task 6 -- The D19 walking-skeleton smoke (one real KTX cvar, end-to-end)

- **Goal:** prove the spine round-trips by running the FULL pipeline
  end-to-end against exactly one real simple KTX cvar, self-contained, with
  zero Phase 2/3 dependency. This task IS the phase-boundary verification.
- **Files:**
  `apps/qw-oracle/scripts/describe-fill/smoke-one-cvar.ts` (created).
- **Chosen D19 cvar -- `k_short_gib` (recorded per D19; verified by drafter
  recon):**
  - Type: plain boolean (0/1). No enum/bitmask complexity.
  - Single unambiguous registration site:
    `research/repos/ktx/src/world.c:942` -> `RegisterCvar("k_short_gib");`
    (grep-verified single site across `src/`).
  - Clear shipped-config comment in BOTH configs (identical comment text;
    differing value -- a D10 value-difference, NOT a meaning conflict):
    - in-repo `research/repos/ktx/resources/example-configs/ktx/ktx.cfg:6`:
      `set k_short_gib 1 // remove gibs after 2 seconds (0 = no, 1 = yes)`
    - nQuake `research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg:7`:
      `set k_short_gib 0 // remove gibs after 2 seconds (0 = no, 1 = yes)`
  - Live L1 state (verified): `entities` has exactly one row
    `canonical_id='ktx:cvar:k_short_gib'`, `description IS NULL`,
    `description_origin` empty, `source_state='source_backed'`;
    `cvar_versions` carries `source_file='src/world.c'`,
    `source_line=942`, `default_value` NULL, `trailing_comment` empty (the
    human prose lives ONLY in the configs -- exactly the describe-fill case).
  - Why this is a strong smoke: it exercises mechanical-candidate harvest
    from a real shipped comment, source-grounding against a real
    registration site, the D7 gate, AND the D11 two-source retained
    provenance with a value-difference that must NOT be flagged as a
    meaning conflict (D10) -- all on an easy, unambiguous boolean.
  - Backups if `k_short_gib` is disqualified at execution time:
    `k_pow` (boolean, `world.c:811`, comment in both configs);
    `k_classic_shotgun` (int via `RegisterCvarEx`, `world.c:948`, comment
    in-repo only -- exercises the with-default path).
- **Steps:**
  - [ ] Minimal single-cvar mechanical-candidate harvest: read the
        `k_short_gib` line from BOTH ktx.cfg files and emit the candidate
        record in the EXACT shape the Phase 2 D9 extractor must also emit --
        per-(cvar, source-file) records: candidate text (the comment),
        structured choice if any, the shipped value as data (not as source
        default), and one retained-provenance entry per file. This is a
        minimal REAL harvest of one knob, NOT the Phase 2 volume extractor
        and NOT a synthetic fixture (D19: a real cvar exercises real
        source-grounding, the part most likely to be wrong). The contract
        this stub emits is the contract Phase 2 generalizes (Open Q c).
  - [ ] Run the harvested candidate through D5-D8 evaluation -> the D6 skill
        synthesis (Opus 4.7 MAX) -> the D7 tier-1 independent re-check
        (Opus 4.7 MAX) -> commit the full record onto the existing
        `ktx:cvar:k_short_gib` entity row: `description`,
        `description_origin` (here `synthesized` -- the source line has no
        comment; the configs are `shipped_doc` evidence retained in
        provenance), `description_anchor_version`,
        `description_provenance` (JSONB, TWO entries, bound as a JS value
        NOT pre-stringified -- P2), `description_verdict`,
        `description_confidence`, `description_reasoning`,
        `description_proposed`.
  - [ ] Emit the D11/D15 audit-review page (Task 5) and assert the
        `k_short_gib` record round-trips: the page renders one row with the
        before/after/why triple inline.
  - [ ] Run the two C5 probes (Task 2) and assert both GREEN on the filled
        row.
  - [ ] Idempotency contract for Phase 2/3: re-running this smoke reproduces
        the identical record (no duplicate row, no double count). Record in
        "Outputs to next phase" that `k_short_gib` is pre-filled so Phase 2/3
        treat it idempotently and count it once in the probe-0 denominators
        (D19/C4/P3).
- **Verification:** see the phase-boundary block below (this task's
  verification IS the phase boundary).
- **Execution mode:** mixed, recorded per sub-step --
  the harvest stub: `subagent (Sonnet medium)` (clear contract, one file);
  the synthesis pass: **Opus 4.7 MAX** (spec-locked D7, via the Task 3
  skill); the tier-1 review pass: **Opus 4.7 MAX** (spec-locked D7, via the
  Task 4 gate); the wire-up + assertions: `subagent (Sonnet medium)`.

## Verification (phase boundary)

Copy-paste, YES/NO. Run from `apps/qw-oracle/` after Task 6.

```
# 1. Schema family present
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "SELECT count(*) FROM information_schema.columns WHERE table_name='entities' \
  AND column_name IN ('description','description_origin','description_anchor_version',\
'description_rereview','description_provenance','description_verdict',\
'description_confidence','description_reasoning','description_proposed');"
# PASS condition: prints 9.

# 2. The one D19 cvar carries a full provenance-stamped record
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "SELECT (description IS NOT NULL) AND description_origin IN ('synthesized','shipped_doc','source_inline') \
  AND description_anchor_version IS NOT NULL AND jsonb_typeof(description_provenance)='array' \
  AND jsonb_array_length(description_provenance)=2 AND description_verdict IS NOT NULL \
  AND description_reasoning IS NOT NULL FROM entities WHERE canonical_id='ktx:cvar:k_short_gib';"
# PASS condition: prints t. (jsonb_typeof='array' proves P2 -- not a string scalar.)

# 3. The two C5 probes are GREEN on the filled row
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.describe_fill.origin_vocabulary
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.describe_fill.synthesized_requires_anchor
# PASS condition: both print [PASS].

# 4. The D11/D15 serializer round-trips the record
#    (Task 6 emits the page to its declared output path; open it.)
# PASS condition: exactly one entity row for k_short_gib, showing the two
# ktx.cfg comments + committed description + reasoning INLINE in one row
# (not split into separate panels/views).

# 5. Self-containment via the arc-owned origin scope. NOT
#    "description IS NOT NULL" -- KTX cvar baseline already has 68
#    source_inline-described rows (Recon facts); the arc-owned signal is the
#    synthesized/shipped_doc origin set, which is 0 at baseline.
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "SELECT count(*) FROM entities WHERE project='ktx' AND type='cvar' \
  AND description_origin IN ('synthesized','shipped_doc');"
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "SELECT canonical_id FROM entities WHERE project='ktx' AND type='cvar' \
  AND description_origin IN ('synthesized','shipped_doc');"
# PASS condition: first prints 1; second prints exactly
# ktx:cvar:k_short_gib. Proves the smoke filled exactly the one D19 cvar and
# no Phase 2/3 volume leaked in (baseline for this set is 0).
```

If all five PASS, operator proceeds (Phase 1 -> approved). If any FAIL,
consult Recovery.

## Outputs to next phase

State now true that was not before:

- Migration `014_description_provenance_trail.sql` applied; `entities`
  carries the description-provenance/staleness/trail family;
  `SCHEMA.md` documents it (and the previously-undocumented
  `description`/`description_origin`).
- The D6 guardrailed synthesis skill exists at
  `~/.claude/skills/<d6-skill-slug>/` (final slug confirmed at review --
  Open Q e); it is the unit Phase 3/4 fan out over; its synthesis dial is
  spec-locked Opus 4.7 MAX.
- The D7 two-tier gate exists
  (`apps/qw-oracle/scripts/describe-fill/review-gate.ts`); tier-1 review
  dial is spec-locked Opus 4.7 MAX; tier 2 surfaces on the audit page.
- The D11/D15 internal-tier audit-review HTML serializer exists
  (`apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts`),
  emit-from-record, inline-pairs, sortable/filterable.
- The two C5 probes `F1.describe_fill.origin_vocabulary` and
  `F1.describe_fill.synthesized_requires_anchor` are registered in
  `REGRESSION_PROBES` and GREEN.
- **Pre-filled row (D19 hand-off):** the KTX cvar `k_short_gib`
  (`canonical_id='ktx:cvar:k_short_gib'`, entity present in L1) carries a
  full provenance-stamped record. Phase 2 (KTX mechanical extract) and
  Phase 3 (KTX synthesis) MUST treat it idempotently: re-running the
  corrected Phase 2/3 pipeline reproduces it identically (no duplicate row,
  no double count), and the probe-0 KTX-cvar coverage denominator counts it
  exactly once -- it is already filled when Phase 2/3 run (C4/P3/D19).

Runnable state: the full describe-fill spine round-trips one real KTX cvar
end-to-end, self-contained, with zero Phase 2/3 dependency. The commit at the
phase boundary leaves the system runnable (P4: one commit on `main`, no
worktree/PR ceremony; no per-phase tag -- the arc-ship tag is end-of-arc).

## Open questions / deferred items

- **Question (a) -- RESOLVED at scaffold 2026-05-17, no action.** The
  "KTX extractor is tree-sitter" scaffold error was corrected by the planner
  in `review-findings.md` "Confirmed-good" + `phase-template.md` (dated
  CORRECTION 2026-05-17, commit f3574f26): canonical KTX is libclang/C; the
  D9 per-engine difference is a shipped-config sibling parser, not a
  tree-sitter-vs-libclang split. No Phase 1 impact; not re-raised.

- **Question (b):** D2/D11 lock the origin vocabulary as "exactly
  source_inline/synthesized/shipped_doc; no other tag", but the live
  `description_origin` column (migration 012) legitimately also carries
  `help_json` (ezQuake/FTE) and the reserved-unused `inherited` (QWCL) --
  and D11's own text parenthesizes `help_json` as a parallel ezQuake-only
  tag.
  **Default chosen for now:** the C5 vocabulary probe is two-part: the
  arc-scoped KTX/MVDSV configurable buckets are restricted to the locked
  three; the column-wide guard admits the full known superset
  `{help_json, source_inline, inherited, synthesized, shipped_doc}`. No
  CHECK constraint (012's deliberate looseness preserved; the probe is the
  enforcement per C5).
  **Who can resolve:** operator -- confirm this is the faithful reading of
  D2/D11's "no other tag" (a scoping refinement for the arc's buckets, not
  an override of the lock; recorded here per the never-silently-comply
  rule). If the operator wants the lock re-stated, it is a one-line
  decisions.md amendment.

- **Question (c):** D19 requires Phase 1 to run a "mechanical-candidate
  harvest" for one cvar, but the D9 mechanical extractor is the Phase 2
  deliverable; Phase 1 must not build it.
  **Default chosen for now:** Phase 1's Task 6 does a minimal REAL
  single-cvar harvest that emits the EXACT candidate/provenance record shape
  the Phase 2 extractor must also emit -- a walking-skeleton stub of the D9
  seam, not the volume extractor, not a synthetic fixture. Phase 2
  generalizes that contract rather than replacing it, and reproduces
  `k_short_gib` idempotently (C4/D19).
  **Who can resolve:** Phase 2 drafter must honor this candidate-record
  contract; operator confirms the boundary at review.

- **Question (d):** schema placement -- the seven new fields as columns on
  `entities` vs a sidecar table.
  **Default chosen for now (resolved in-phase, recorded per "design two
  options"):** columns on `entities`. It parallels the existing
  `description`/`description_origin` columns; D1 states the provenance schema
  governs the `entities` table descriptions only; the D13 internal serializer
  reads one entity row with no join. The sidecar alternative was considered
  and rejected: it forces a join on every serializer/probe read for zero
  multiplicity benefit (one description per entity).
  **Who can resolve:** resolved; surfaced only so the reviewer can override.

- **Question (e):** the D6 skill slug/path and the audit-review HTML output
  path are placeholders (`<d6-skill-slug>`,
  `serialize-audit-review.ts` output dir).
  **Default chosen for now:** propose concrete names at execution and
  confirm with the operator at the Task 3 / Task 5 review (low-stakes,
  reversible; not worth blocking the draft).
  **Who can resolve:** operator at phase review.

- **Question (f):** Phase 1's execution-time context budget is projected
  ~250-450k (README slicing analysis -- the heaviest BUILD phase) and likely
  needs a mid-phase fresh-terminal handoff.
  **Default chosen for now:** subagent-heavy throughout (this task table is
  near-zero inline, every code-synthesis task delegated) to hold the lower
  bound.
  **Who can resolve:** arc-orchestrator at execution time -- flagged here as
  an orchestrator concern, NOT a reshape (README already notes Phase 1 is a
  watch phase).

No sub-agent finding contradicted `decisions.md` at draft time; the
verification sub-agent pass (next) may add rejected-finding rationales here.

## Recovery (if verification fails)

C4 discipline throughout: recovery is re-running the corrected pipeline,
NEVER an `UPDATE` that patches the visibly-wrong rows in place.

- **Migration apply fails / wrong columns (boundary check 1 != 9):** do NOT
  edit `014_*.sql` if it was already applied (P1; the migrator rejects it by
  sha256 anyway). Add a corrective `015_*.sql`, re-run `bun db/migrate.ts`,
  re-run check 1.
- **`F1.describe_fill.origin_vocabulary` FAIL:** a row carries a tag outside
  the vocabulary. Fix the emitter/skill that wrote the bad tag, re-run the
  Task 6 one-cvar pipeline end-to-end (C4), re-run the probe. Do not
  SQL-patch the row, do not loosen the probe.
- **`F1.describe_fill.synthesized_requires_anchor` FAIL:** the D6 skill
  emitted a `synthesized` row without stamping the anchor version. Fix the
  skill's evidence step (Task 3), re-run synthesis for the cvar through the
  gate, re-run the probe.
- **Boundary check 2 prints `f` (record incomplete) or `jsonb_typeof` !=
  `array`:** if `jsonb_typeof` is `string`, the provenance was
  pre-stringified -- the P2 bug. Fix the write to bind the JS value directly
  (or `tx.json`), re-run the smoke. Never `UPDATE` the JSONB in place.
- **Serializer round-trip FAIL (check 4):** fix
  `serialize-audit-review.ts`, re-emit from the record (the page is a pure
  projection -- re-generation is the fix, never hand-edit the HTML).
- **Self-containment check 5 fails (count != 1, or canonical_id !=
  ktx:cvar:k_short_gib):** the synthesized/shipped_doc origin set must hold
  exactly `k_short_gib` after the smoke (baseline is 0 -- Recon facts).
  count > 1 or a different cid means Phase 2/3 volume leaked in or the smoke
  wrote the wrong row. Scope breach -- route to operator with the query
  output verbatim; do not lower the assertion.
- **Unanticipated failure:** route to operator with the failing check's
  output verbatim; do not explain the gap away (CLAUDE.md verification
  discipline).
