You are drafting **Phase 2 -- KTX mechanical extract (D9)** of the
**2026-05-16 KTX / MVDSV Layer-1 describe-fill** arc.

Build the KTX shipped-config mechanical-extract tier: a NEW sibling extractor
handler + loader adapter that lifts the in-repo and nQuake `ktx.cfg` files into
structured choices + candidate description text + retained multi-source
provenance onto the ~157/260 KTX cvar rows that already exist in L1 -- and
STOPS at the harvest seam with zero quality verdict (D9). It never creates
entities; it fills fields.

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything -- no extractor, no loader, no migration, no probes. The
phase MD you write becomes input to a separate execution session later. This
is a code-synthesis phase; expect a subagent-heavy task table (near-zero
inline) and a longish phase MD (the template caps shape, not length).

Working directory: `/home/paradoks/projects/quakeworld`

## You are in the RIGHT arc/phase only if all of these hold

This arc fills provenance-stamped descriptions onto KTX/MVDSV configurable
entities (cvars, commands, cmdline params, info_keys) that ALREADY exist in
L1. Phase 2 is the KTX MECHANICAL extract only. STOP and tell the operator if
your phase goal looks like any of these (wrong arc/phase):

- "Synthesize descriptions / judge whether a comment is good enough / run the
  D6 skill / resolve a meaning-conflict" -> that is **Phase 3** (KTX
  source-synthesis, D5-D8/D10). Phase 2 HARVESTS and STOPS at the D9 seam;
  it renders ZERO quality verdict. Wrong phase.
- "Build the libclang call-graph / classify genuine-dead vs build-excluded /
  consume the C3 suspect pool" -> the parked reachability arc; and C3 gates
  Phase 3/4 synthesis, not Phase 2 (KTX mechanical extract is
  liveness-agnostic). Wrong scope.
- "Extract the dusty-* codebase / fork-aware schema" -> the parked
  dusty-antilag-fork arc (F-D10c). Wrong scope.
- "Add a name_fold / case column / fix `loadFragfile` casing" -> the
  case-fidelity mini-arc (F-D10b), soft dep only, never fixed here. Wrong
  scope.
- "Emit the wiki feed / snapshot.json / MCP public projection / touch
  orientation.ts" -> Phase 5 / F-D13a. Phase 2 writes the internal record
  only. Wrong phase.
- "Postgres port / Voyage / Layer 2 Discord / RRF" -> qw-oracle Arc 1, the
  exemplar. Wrong arc.

If your goal is "the KTX shipped-config sibling extractor + loader adapter ->
structured choices + candidate text + retained per-(cvar,source-file)
provenance, fills ~157/260 KTX cvars, idempotent, harvest-and-STOP", proceed.

## Required reading (read all before drafting; do not skip)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md`
   -- phase index, the locked slicing analysis, non-goals. Phase 2's
   verification regime is DB-state coverage vs the probe-0 denominator +
   idempotency + the C5 prov/jsonb probes (Automated; self-contained -- it
   does NOT verify via a downstream projection).
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   -- C1-C5 (incl. the **C3 amendment 2026-05-17**), P1-P5, D1-D19 (incl.
   the **D2 clarification 2026-05-17** and **D19**). LOCKED. Especially:
   **D9** (the pure structured-lift; the harvest-and-STOP seam; one record
   per (cvar,source-file); never merge; consumes only coverage.ndjson
   "mechanical"-classified sources), **D11** (`shipped_doc` tag; retained
   structured multi-source provenance; file identity in provenance NOT
   tag-per-file), **D10** (three-class drift: value-diff -> L3, meaning ->
   Phase 3 C2-flag, membership -> union; Phase 2 PRESERVES so Phase 3 can
   flag), **C2** (never auto-resolve a conflict), **C1** (probe-0 N/M is the
   exhaustive gate; residue tracked never importance-cut), **C4/P3**
   (idempotent re-extract; the >50%-drop guard is load-bearing), **C5/P2**
   (the new data shapes earn F1 probes in the phase that first writes them;
   JSONB binds JS values, never pre-stringified), **D19** (`k_short_gib` is
   PRE-FILLED by Phase 1 -- treat it idempotently, count it once). You turn
   these into a plan; you do not re-open them. A genuine conflict is surfaced
   for explicit amendment, never silently overridden, never silently complied
   with.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/review-findings.md`
   -- the rows that touch Phase 2: **F-C2a (GRAVE)** -- in-repo vs nQuake
   `ktx.cfg` drift is REAL and concrete (probe-3, primary-source-verified:
   73 shared / 22 nQuake-only / 19 in-repo-only; value conflicts
   `sv_maxrate` 50000/500000, `k_exclusive` 0/1, `k_exttime` 3/5,
   `maxclients` 32/8, `fpd` 206/222, `sv_reliable_sound` 1/0; polarity-label
   drift `k_noframechecks`; `sv_antilag` in-repo-only). A naive merge at
   extract time silently encodes one distribution's opinion as fact and
   destroys the ability to flag the conflict -- Phase 2 preserves per
   (cvar,source-file), NEVER merges. **F-C5a (GRAVE)** -- Phase 2 is the
   first to write `shipped_doc` + retained-provenance JSONB at volume, so
   Phase 2 ships the provenance-entry-exists probe AND extends
   `F1.jsonb_columns_not_strings` (Phase 1 deferred that extension to Phase 2
   explicitly). Also read the **dated CORRECTION 2026-05-17** in
   "Confirmed-good".
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-template.md`
   -- the MANDATORY shape. Follow section order exactly. The **REQUIRED
   "### Recon facts (verified against live source <date>; do not re-derive
   blind)" sub-block of the Goal section, positioned between Goal and "Inputs
   from previous phase"** is not optional -- Phase 1's first draft omitted it
   and shipped two probe defects from a zero-baseline assumption as a direct
   result. Do NOT repeat that. The Execution-mode annotation per task is
   mandatory (subagent-default for code synthesis).
5. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- the source of truth for the why. Read **D9** (lines ~428-473 -- the
   emit shape + the load-bearing seam), **D10** (~475-535), **D11**
   (~537-582), **C2/C4/C5** closely.
6. The grounding evidence (consume, do not re-derive):
   `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md`
   + `coverage.ndjson` + the in-repo-vs-nQuake `ktx.cfg` drift probe
   (probe-3). The **KTX cvar M=260** denominator and the ~157/260
   mechanical-candidate target are here -- verify them live, do not trust the
   spec number blind (C1 exhaustive; the denominator is the coverage gate).
7. `apps/qw-oracle/API_CONTRACTS.md` -- confirm Phase 2 writes the INTERNAL
   record only; it does not touch the MCP public-projection surface (that is
   Phase 5 / F-D13a). No new tool, no orientation-blob edit in Phase 2.
8. **Phase 1 is a hard input -- read it as the contract you generalize:**
   `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-1-discipline.md`,
   especially "Outputs to next phase", Task 1 (the migration `014`
   description-provenance/staleness/trail family + the documented
   `description`/`description_origin` vocabulary), Task 2 (the two C5 probes
   already registered; the jsonb-extension deferred to YOU), Task 6
   (`smoke-one-cvar.ts` -- the EXACT candidate / per-(cvar,source-file)
   provenance record shape Phase 1 emitted for `k_short_gib`), and Open Q (c)
   (Phase 2 GENERALIZES that record-shape contract, it does not replace it).

## Per-phase live recon (run it; do not trust the spec or Phase 1 blind)

The Phase 1 review caught two probe defects rooted in a zero-baseline
assumption and a missing Recon-facts block. Do the live recon and record it in
the mandatory "### Recon facts (verified ...)" Goal sub-block, drafter-verified
via psql/grep, never inferred:

- The live `entities` schema AFTER migration `014`: the
  `description_provenance` JSONB shape (the array element shape Phase 1's
  migration defined: `{source_file, source_line, shipped_value,
  raw_comment}`), `description_origin` and the documented vocabulary
  (`SCHEMA.md` + `db/migrations/014_*.sql`). Phase 2 expects to FILL these
  columns, not migrate; if you believe a new migration is needed, that is a
  deviation -- surface it, do not assume it.
- The two shipped configs, live:
  `research/repos/ktx/resources/example-configs/ktx/ktx.cfg` (in-repo) and
  `research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg` (nQuake). Confirm
  the F-C2a drift shape against them directly.
- The existing extractor -> AST-JSON -> loader-adapter plug-in pattern
  (recon how a sibling handler + its loader adapter are actually shaped in
  `apps/qw-oracle/scripts/extractors/` and `scripts/load-knowledge/`). The
  D9 shipped-config tier is a **NEW sibling handler** distinct from the
  existing **libclang** KTX registration handler. **Canonical KTX is
  libclang/C, NOT tree-sitter** (tree-sitter is the out-of-scope dusty-ktx
  fork only -- dated CORRECTION 2026-05-17 in `review-findings.md` /
  `phase-template.md`, commit f3574f26). The shipped-config parser reads
  `.cfg` text, not C AST -- recon the real emit/adapter convention; do not
  hunt a tree-sitter handler and do not fold into the registration handler.
- The existing `scripts/load-knowledge/quality-grid.ts` F1 grid and the
  existing `F1.jsonb_columns_not_strings` probe (currently ezquake-scoped --
  Phase 2 extends it to the retained-provenance JSONB) and the two Phase 1
  C5 probes already in `REGRESSION_PROBES`.
- The probe-0 **KTX cvar M=260** denominator and the ~157/260
  mechanical-candidate count -- verify live (DB + coverage.ndjson), record
  old-vs-target.
- The live pre-existing baseline (Phase 1 established it; recon it again,
  do not assume zero): KTX cvar 68/260 already carry `source_inline`
  descriptions; `k_short_gib` is ALREADY filled by Phase 1 (origin
  `synthesized`, two `ktx.cfg` `shipped_doc` provenance entries). Phase 2's
  coverage math and idempotency contract are written against THIS baseline.

## Drafting rules

- ASCII only; no em-dash/en-dash/emoji; comments explain WHY (P5).
- Bun runtime; main-tree git, no worktree/PR (P4). Phase 2's expectation is
  FILL not MIGRATE -- it writes into migration `014`'s columns. Any schema
  delta is a deviation: append-only `db/migrations/<NNN>.sql` + `SCHEMA.md`
  in the same task (P1), and surfaced as a deviation for operator review.
- JSONB (retained provenance, structured choices) binds JS values directly
  or via `tx.json`, NEVER pre-stringified (P2). Phase 2 SHIPS the
  provenance-entry-exists probe AND extends `F1.jsonb_columns_not_strings`
  to the retained-provenance column -- both GREEN at the phase boundary
  (C5/F-C5a; the probe lands in the phase that first writes the shape).
- `source_ref` reuses the existing citation mechanism -- no new format (P3).
- Origin tag is EXACTLY `source_inline` / `synthesized` / `shipped_doc`
  (D2/D11). Phase 2 writes `shipped_doc` for the mechanically-lifted
  `ktx.cfg` candidates. File identity lives in the retained provenance, NOT
  a tag-per-file (D2 vocabulary discipline).
- **THE D9 SEAM (load-bearing, operator-confirmed).** The extractor harvests
  structured facts + candidate description text + provenance and STOPS. It
  does NOT judge whether the text is good enough. Every harvested candidate
  AND every comment-less cvar flows to the Phase 3 D5-D8 evaluation. NO
  first-pass "comment looks fine" affirmation in the parser -- that
  re-introduces the "had a comment so it counts" trap C1 + the D5-amendment
  exist to kill, and hides the affirm/synthesize call from the D7 gate.
- One record per (cvar, source-file). In-repo-vs-nQuake drift is preserved
  as DATA, never merged at extract time (F-C2a/D9/C2/D10). Structured
  choices kept structured (`{value,label}` enum + bitmask tables as JSONB
  DATA, never prose-flattened). The shipped value is carried as data but
  NOT written as the source default (config opinion -- Phase 3/D10 owns the
  policy).
- Input boundary: consume ONLY the `coverage.ndjson` "mechanical"-classified
  sources. LLM-assisted / hand-curate surfaces route to Phase 3 / the C1
  residue track -- they are NOT fed to this extractor (keeps the denominator
  precise; C1).
- Coverage is the probe-0 KTX-cvar M=260 denominator, never a hand-picked
  subset. Genuinely not-mechanically-liftable residue is tracked (flows to
  Phase 3 / the C1 outreach track), never importance-cut (C1).
- **D19 idempotency contract.** `k_short_gib` is already a complete
  provenance-stamped row from Phase 1. Re-running the Phase 2 extractor
  reproduces it identically -- no duplicate row, no double count -- and the
  probe-0 KTX-cvar coverage denominator counts it exactly once (C4/P3/D19).
  Phase 2 GENERALIZES the exact candidate / per-(cvar,source-file)
  provenance record shape Phase 1's `smoke-one-cvar.ts` emitted (Open Q c);
  it does not invent a divergent shape. If the Phase 1 shape needs widening
  for the volume case, that is a deviation -- surface it, do not silently
  diverge.
- Stay out of scope: no D5-D8 evaluation / quality verdict / synthesis
  (Phase 3); no C3 suspect classification; no dusty-* fork; no casing fix;
  no public projection / MCP / wiki plumbing; no orientation.ts.

## Step by step

1. Read everything in "Required reading", including Phase 1 as the contract
   you generalize. Note the Phase 2 findings (F-C2a, F-C5a) and D19.
2. Run the per-phase live recon. Verify the migration `014` columns + the
   `description_provenance` element shape, the two `ktx.cfg` files + the
   F-C2a drift, the extractor/loader plug-in pattern (NEW sibling, libclang
   engine, config-file parser -- NOT tree-sitter, NOT the registration
   handler), the F1 grid + the jsonb probe, the KTX cvar M=260 denominator,
   and the Phase 1 `smoke-one-cvar.ts` record shape + the `k_short_gib`
   pre-filled state. Record all of it in the mandatory "### Recon facts
   (verified against live source <date>; do not re-derive blind)" Goal
   sub-block (between Goal and "Inputs from previous phase") -- do NOT inline
   spec/Phase-1 numbers unverified.
3. Draft the phase MD at
   `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-2-ktx-mechanical-extract.md`
   following `phase-template.md` EXACTLY: section order; the required Recon
   sub-block; per-task Execution-mode annotation (subagent-default for the
   extractor / loader adapter / probe authoring, with model+effort +
   one-line rationale per `feedback_model_effort_range`); a YES/NO
   phase-boundary verification = coverage vs the probe-0 KTX-cvar
   denominator + idempotent re-extract (run twice, identical, `k_short_gib`
   counted once, no row inflation) + the provenance-entry-exists probe +
   the extended `F1.jsonb_columns_not_strings` both GREEN; C4 recovery
   (re-run the corrected pipeline, NEVER an `UPDATE`). Make every
   phase-boundary probe a real query against the live baseline, not a
   zero-baseline idealization (the Phase 1 lesson).
4. Dispatch the verification sub-agent (the brief at the bottom of
   `phase-template.md`, paths filled for Phase 2). Add to the brief, beyond
   the standard 13 checks: it must EXECUTE the coverage / idempotency /
   provenance / jsonb probes against the live DB (not merely format-check
   them -- the Phase 1 first-pass defect was probes that could never pass
   against the real baseline), and confirm the Recon-facts sub-block records
   the real live baseline (KTX cvar 68/260 + `k_short_gib` pre-filled), not
   a zero assumption, and that the harvest STOPS at the D9 seam with zero
   quality verdict.
5. Apply the sub-agent findings. If a finding contradicts `decisions.md`,
   the decision wins -- record the rejected finding under "Open questions"
   with a one-line rationale. If a lock itself looks wrong (factual premise
   or otherwise -- the OQ-3 discipline), surface it explicitly for
   amendment; never silently override, never silently comply.
6. Halt. Reply to the operator with: the phase MD path; the sub-agent
   finding counts (CRITICAL / SUBSTANTIVE / ADVISORY); any open questions
   needing operator attention before execution (and confirm the generalized
   record shape matches Phase 1's `smoke-one-cvar.ts` contract); a
   recommendation -- "ready for review" or "needs another pass".

Do NOT proceed to Phase 3. Do NOT execute anything. Do NOT modify the live
codebase. Drafting is paper-only.

## Optional hint slot

n/a -- first draft of Phase 2. (If a prior draft came back wrong, the planner
fills a one-paragraph hint here and a fresh terminal redrafts from the
corrections; do not preserve a prior draft's bugs.)
