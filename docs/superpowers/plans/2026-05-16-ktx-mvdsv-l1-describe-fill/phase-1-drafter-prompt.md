You are drafting **Phase 1 -- The discipline, built once** of the **2026-05-16
KTX / MVDSV Layer-1 describe-fill** arc.

Phase 1 builds the describe-fill machinery once, engine-agnostic, so both
engines ride it: the provenance/staleness schema fields (D2/D11); the
guardrailed per-knob D6 synthesis skill; the D7 two-tier review gate; the
D11/D15 internal-tier audit/review serializer (emit-from-record -- NO generator
exists, F-D11a); and the C5 F1 probes for the data shapes Phase 1 is the first
to write. **Phase boundary = the full pipeline round-trips ONE real simple KTX
cvar end-to-end (D19 walking-skeleton smoke), self-contained, with ZERO
dependency on Phase 2/3.**

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything -- no migration, no skill authoring, no serializer, no
probes. The phase MD you write becomes input to a separate execution session
later. This is the heaviest BUILD phase; expect a long phase MD (the template
caps shape, not length) and an aggressively subagent-delegated task table.

Working directory: `/home/paradoks/projects/quakeworld`

## You are in the RIGHT arc only if this holds

This arc fills provenance-stamped descriptions onto KTX/MVDSV configurable
entities that ALREADY exist in L1. STOP and tell the operator if your phase
goal looks like any of these (wrong arc):

- "Postgres port / RRF / Voyage pipeline / Layer 2 Discord / snapshot delta"
  -> qw-oracle Arc 1 (`2026-05-02-qw-oracle-arc1`), the exemplar. Wrong arc.
- "Write game_mode concept-note bodies / mode narrative" -> the 2026-05-09
  game-mode L3 arc (sequenced AFTER this; D1 carves it out). Wrong arc.
- "Build the KTX mechanical extractor / fill KTX cvars at volume" -> that is
  Phase 2/3. Phase 1 builds the SPINE and proves it on exactly ONE cvar
  (D19). Filling at volume is NOT Phase 1.
- "Classify runtime-dead suspects / build the call-graph" -> the parked
  reachability arc. Not this arc.

If your goal is the build-once spine + the one-cvar smoke, proceed.

## Required reading (read all before drafting; do not skip)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md`
   -- phase index, the locked slicing analysis, non-goals.
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   -- C1-C5, P1-P5, D1-D19. LOCKED. Especially: D2 (origin-state model;
   exact vocabulary), D6 (the guardrailed skill -- what it hard-codes),
   D7 (two-tier gate; **synthesis + review dials are Opus 4.7 MAX,
   spec-locked, not yours to lower**), D11 (`shipped_doc` tag + retained
   structured multi-source provenance + first-class verdict/confidence/
   reasoning trail + the audit-review HTML pattern), D13 (two-tier
   serializer boundary the audit page sits inside), D15 (the review page IS
   the internal-tier serializer; inline per-row before/after/why; the
   2026-05-15 file is a VISUAL TEMPLATE only), C5 (F1 probe per new shape,
   same phase that first writes it), **D19 (the Phase 1 smoke = one real
   simple KTX cvar through the real pipeline; self-contained; Phase 2/3
   absorb it idempotently)**. You turn these into a plan; you do not re-open
   them. A genuine conflict is surfaced for amendment, never silently
   overridden, never silently complied with.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/review-findings.md`
   -- the rows that touch Phase 1: **F-C5a** (four new data shapes have no
   regression probe -- Phase 1 ships the origin-tag-vocabulary probe and the
   synthesized-needs-anchor probe, since Phase 1 first writes those shapes),
   **F-D11a** (the audit-review HTML generator AND artifact do NOT exist
   anywhere -- build a NEW emitter from the D11/D15 column family; do not
   hunt a phantom file; not a blocker).
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-template.md`
   -- the MANDATORY shape. The Execution-mode annotation rule: subagent-
   default for code synthesis; the D6 + D7 dials are Opus 4.7 MAX
   (spec-locked, record it). Phase 1's runnable state must be self-contained
   (D19) -- it does NOT depend on Phase 2/3 rows.
5. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- the source of truth for the why. Read D2, D6, D7, D11, D13, D15
   closely (lines ~193-249, ~325-385, ~495-545, ~578-689).
6. `apps/qw-oracle/API_CONTRACTS.md` -- the storage/query contracts; the
   audit serializer is internal-tier (NOT a public projection -- it does
   not touch the MCP contract surface; that delta is Phase 5/F-D13a).

## Per-phase live recon (run it; do not trust the spec blind)

- `apps/qw-oracle/SCHEMA.md` + `apps/qw-oracle/db/migrations/` -- the
  append-only migration convention (P1). **VERIFIED LIVE STATE (Phase 0
  review, decisions.md D2 clarification 2026-05-17 -- do NOT re-derive as
  create-from-zero):** `entities.description`, `entities.description_origin`,
  and `entities.name_fold` ALREADY EXIST. `description_origin` already holds
  the vocabulary `{help_json, source_inline, synthesized}` (`help_json` is
  ezQuake's, legitimate, pre-existing). Phase 1's migration therefore
  EXTENDS: add `shipped_doc` to the origin vocabulary, plus the NEW columns
  -- anchor version, re-review flag, retained multi-source provenance (JSONB
  -- P2: JS values, never stringified), and the
  verdict/confidence/reasoning/proposed_desc trail. The C5
  origin-tag-vocabulary probe must permit the full FOUR-set
  `{help_json, source_inline, synthesized, shipped_doc}`, not just the three
  this arc writes (rejecting the pre-existing `help_json` would red the probe
  on ezQuake rows). Recon the exact existing column types before authoring
  the ALTER.
- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` -- the existing F1
  grid shape and the existing `F1.jsonb_columns_not_strings` probe (C5
  extends this; the new probes live here).
- The D6-skill precedents: the SKILL.md shape of `asset-type-curate`,
  `guide-rewrite`, `validate-extractor` (hard pre-flight, enforced rules,
  sub-agent fan-out) -- the D6 skill is built on this proven pattern.
- The existing snapshot builder + `serve/mcp/src/orientation.ts` -- so the
  D13 two-tier serializer boundary is drawn correctly (Phase 1 builds the
  INTERNAL-tier serializer = the D15 audit page; the PUBLIC projections are
  Phase 5).
- One real simple KTX cvar candidate for the D19 smoke: a plain boolean/int
  KTX cvar with a single unambiguous registration site (KTX `world.c`-style
  `RegisterCvar`) AND a clear shipped-config comment (in-repo / nQuake
  `ktx.cfg`), so mechanical-candidate + source-grounding + the D7 gate are
  all exercised on an easy, unambiguous case. Record the chosen cvar in the
  phase MD's "Outputs to next phase" so Phase 2/3 drafters know which row is
  pre-filled (idempotent, counted once -- D19).

## Drafting rules

- ASCII only; no em-dash/en-dash/emoji; comments explain WHY (P5).
- Schema fields land as an append-only `db/migrations/<NNN>.sql` + a matching
  `SCHEMA.md` edit IN THE SAME TASK (P1). JSONB (retained provenance, the
  trail, structured choices) binds JS values directly or via `tx.json`,
  never pre-stringified (P2). `source_ref` reuses the existing citation
  mechanism -- no new format (P3). Main-tree git, no worktree/PR (P4).
- Origin-tag vocabulary is EXACTLY `source_inline` / `synthesized` /
  `shipped_doc` (D2/D11). No other tag; no tag-per-file (file identity lives
  in the retained provenance).
- The D6 skill HARD-CODES: the D5 quality-bar rubric as the
  keep-vs-synthesize judgment; the read-site-grounding method (input is code
  use-sites, never the knob name); the evidence requirement (`source_ref`
  file:line + anchor version on every synthesized row); the confabulation
  guard (not source-legible -> hedge or route to residue, never guess); the
  C3 sibling (a suspect-pool knob gets the truthful dead-stamp, not a
  confident description). The skill's prose/pre-flight/fan-out is the Phase 1
  deliverable.
- The D7 gate is two tiers: (1) an independent automated evidence re-check,
  every row, separate invocation from the authoring context; (2) the
  operator batch tail on the D11/D15 audit page. The synthesis pass AND the
  independent review pass are **Opus 4.7 MAX -- spec-locked (D7). Record the
  dial; do NOT lower it.**
- The D11/D15 audit serializer is emit-from-record, the INTERNAL-tier
  serializer of D13 (it additionally carries confidence + reasoning +
  verdict + losing provenance). Row-per-entity; the source-comment /
  our-description / reasoning triple shown INLINE per row as one
  before/after/why unit (NOT split into panels or filtered views). The
  2026-05-15 `cvar-audit-review.html` does NOT exist anywhere (F-D11a) --
  build a NEW emitter against the D11/D15 column family
  (`name / source_file / verdict / confidence / reasoning / proposed_desc`,
  sortable + filterable). Do not hunt a phantom file; not a blocker.
- C5: Phase 1 ships the F1 probes for the shapes it first writes -- the
  origin-tag-outside-vocabulary probe and the `synthesized`-row-with-NULL-
  anchor probe -- GREEN at the phase boundary. (The provenance-entry-exists
  and jsonb-not-string probes land in Phase 2, which first writes those.)
- **D19 self-contained smoke:** Phase 1's phase-boundary verification runs
  the FULL pipeline against one real simple KTX cvar and asserts its full
  record round-trips the D11/D15 serializer and the C5 probes go green on
  it -- with NO dependency on Phase 2/3 existing. This is the walking
  skeleton; it is what makes Phase 1 a self-contained verifiable slice
  rather than a pass-through.
- Stay out of scope: no public-projection / MCP-contract work (Phase 5,
  F-D13a); no KTX volume fill (Phase 2/3); no wiki-side plumbing (F-D14a);
  no reachability classification (F-C3b).

## Step by step

1. Read everything in "Required reading". Note F-C5a / F-D11a and D19.
2. Run the per-phase live recon. Verify the live schema/vocabulary, the F1
   grid shape, and the D6-skill precedent against live source. Pick the D19
   smoke cvar candidate. Do NOT inline spec details unverified.
3. Draft the phase MD at
   `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-1-discipline.md`
   following `phase-template.md` exactly (section order; per-task
   Execution-mode annotation -- subagent-heavy, the D6/D7 dials Opus 4.7 MAX
   recorded; YES/NO phase-boundary verification = the D19 smoke; C4
   recovery). Expect a long, subagent-delegated task table; that is correct
   for this phase.
4. Dispatch the verification sub-agent (the brief at the bottom of
   `phase-template.md`, paths filled for Phase 1).
5. Apply the sub-agent findings. If a finding contradicts `decisions.md`,
   the decision wins -- record the rejected finding under "Open questions"
   with a one-line rationale. If a lock itself looks wrong, surface it
   explicitly for amendment; never silently override, never silently comply.
6. Halt. Reply to the operator with: the phase MD path; the sub-agent
   finding counts (CRITICAL / SUBSTANTIVE / ADVISORY); any open questions
   needing operator attention before execution (including the chosen D19
   smoke cvar); recommendation -- "ready for review" or "needs another pass".

Do NOT proceed to Phase 2. Do NOT execute anything. Do NOT modify the live
codebase. Drafting is paper-only.
