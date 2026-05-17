You are drafting **Phase 4 -- MVDSV fill, sized by Phase 0** of the
**2026-05-16 KTX / MVDSV Layer-1 describe-fill** arc.

Phase 4 fills every in-scope MVDSV configurable-bucket entity by RE-USING the
exact machinery KTX rode (Phase 1's D6 skill + D7 two-tier gate + D11/D15
serializer + the C5 probes; Phase 2's mechanical-extract pattern; Phase 3's
proven D6 fan-out + operator-tail workflow): a `mvdsv.6` roff man-page sibling
parser for the cmdline params (D9 sibling tier, same shape as Phase 2's KTX
`.cfg` sibling), the Phase-0 loader-freed MVDSV commands plus the command
synthesis tail, and the MVDSV cvars split easy-common-`sv_*` vs the
hard-dedicated-server-only tail PER THE PHASE 0 ezquake.com shape probe --
every entity ending with an affirmed-or-synthesized owned description through
the D7 gate, D10 conflicts (incl. the `sv_antilag` cross-fork DUAL -- Phase 4
OWNS `mvdsv:cvar:sv_antilag`) resolved inline at the operator tail, residue
tracked to C1 (never importance-cut).

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything. The phase MD you write becomes input to a separate
execution session later. Phase 4's context budget is the arc's one genuine
unknown (README: ~200-400k, "uncertain until P0") -- Phase 0's ezquake.com
shape report resolves it; size the task table subagent-heavy to hold the
lower bound and say so.

Working directory: `/home/paradoks/projects/quakeworld`

## You are in the RIGHT arc/phase only if all of these hold

This arc fills provenance-stamped descriptions onto KTX/MVDSV configurable
entities that ALREADY exist in L1. Phase 4 is the MVDSV fill only. STOP and
tell the operator if your phase goal looks like any of these:

- "KTX cvars/commands/synthesis / `ktx.cfg` / the D6 KTX fan-out" -> Phases
  2-3 (approved). KTX is DONE; Phase 4 is MVDSV-only. Wrong phase.
- "Build the D6 skill / the D7 gate / the D11/D15 serializer / migration
  014" -> Phase 1 (approved). Phase 4 RE-USES them engine-agnostically; it
  does not rebuild them. Wrong phase.
- "Emit the wiki feed / snapshot.json / MCP public projection / the D16
  showcase" -> Phase 5/6 (F-D13a). Phase 4 writes the internal record + runs
  the operator D7 tail. Wrong phase.
- "Classify genuine-dead vs build-excluded / build the libclang call-graph"
  -> parked reachability arc. Phase 4 only STAMPS C3 suspects + routes to
  C1. Wrong scope.
- "Extract the dusty-* antilag fork / fork-aware schema" -> parked
  dusty-antilag-fork arc (F-D10c). Phase 4 describes `mvdsv:cvar:sv_antilag`
  as the D10 cross-fork DUAL meaning; it does NOT extract the fork. Wrong
  scope.
- "ezquake.com probe / coverage.ndjson authoring / the load-commands fix"
  -> that is Phase 0 (approved); Phase 4 CONSUMES its outputs. Wrong phase.

If your goal is "fill MVDSV cvars/commands/cmdline via the `mvdsv.6` sibling
+ the loader-freed commands + the D6 synthesis tail, sized by Phase 0",
proceed.

## Required reading (read all before drafting; do not skip)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md`
   -- phase index, slicing analysis, non-goals. Phase 4's verification
   regime is operator-run (the SAME D7 audit-page tail as Phase 3) plus the
   automated C5/coverage parts; self-contained (no downstream projection).
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   -- C1-C5 (incl. the **C3 amendment 2026-05-17**), P1-P5, D1-D19, and
   **read every dated amendment/clarification block in full**: the **D7
   clarification 2026-05-17** ("cheap" = effort-routing, ONE Opus-4.7-MAX
   D6 invocation per knob, NOT a cheaper pre-classify tier -- Phase 4 fans
   the SAME skill, this is locked, do NOT relitigate), the **D9 amendment**
   (the ~157->~109 conflation lesson -- verify your MVDSV numbers live, do
   not trust the spec figure blind), the **D11 amendment** (the widened
   `description_provenance` element incl. `structured_choices`), the **D2
   clarification**, **D19**. Especially: **D9** (the `mvdsv.6` roff man page
   is a NEW sibling parser, same tier/emit-shape as the KTX `.cfg` sibling;
   the harvest-and-STOP seam; one record per (entity, source-file)),
   **D5-D8** (every entity evaluated; bot/judgment mechanism-only =
   complete L1, D8), **D7** (two-tier gate; synthesis + independent review =
   **Opus 4.7 MAX, spec-locked, NOT yours to lower**; tier-2 = the operator
   batch tail on the D11/D15 page), **D10** (`sv_antilag` is the cross-fork
   DUAL exemplar -- the MVDSV engine side is line-identical across mainline
   and the dusty fork; describe the DUAL meaning, do NOT extract the fork),
   **D12** (Phase 0 sizes Phase 4; the ezquake.com shape probe is the
   sizing input). You turn these into a plan; you do not re-open them.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/review-findings.md`
   -- the rows touching Phase 4: **F-D12a** (the ezquake.com "124" was a
   fabricated metric; Phase 0 produced the real SHAPE -- consume that, never
   resurrect a `NN/183` figure), **F-D12b** (the load-commands free win =
   28/108 MVDSV commands; Phase 0 delivered it), **F-C2a/F-D10c** (the
   `sv_antilag` cross-fork DUAL; describe dual, do not extract), **F-C3b**
   (detect+stamp+route C3 suspects, do not classify). Read the dated
   CORRECTION 2026-05-17 in "Confirmed-good" (MVDSV is libclang/C; the
   `mvdsv.6` sibling is a NEW roff-text handler, NOT the libclang
   registration handler, NOT tree-sitter).
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-template.md`
   -- the MANDATORY shape. Section order exactly; the **REQUIRED "### Recon
   facts (verified ...)" Goal sub-block between Goal and "Inputs"**; per-task
   Execution-mode annotation (D6/D7 = Opus 4.7 MAX spec-locked, recorded;
   the sub-agent brief item 8 was corrected 2026-05-17 -- MVDSV is
   libclang/C, the man-page sibling is a non-libclang text handler).
5. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- source of truth for the why. Read **D9-D12** closely; note the dated
   correction on the D17 Phase 2 bullet (the ~157->109 precedent for
   verifying your own MVDSV numbers live).
6. The grounding evidence (consume, do not re-derive):
   `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md`
   + `coverage.ndjson` + the relevant `probe-*.md`. The probe-0 MVDSV
   denominators size your phase (C1 exhaustive): **cvar M=183, command
   M=108 (28 loader-freed by Phase 0), cmdline_param M=11 (9 from
   `mvdsv.6`)**. Verify live; do NOT trust the spec figures blind (the
   ~157->109 conflation is exactly the cautionary precedent).
7. `apps/qw-oracle/API_CONTRACTS.md` -- Phase 4 writes the INTERNAL record
   + runs the operator D7 tail. It does NOT touch the MCP public-projection
   surface (Phase 5 / F-D13a).
8. **Phases 0/1/2/3 are hard inputs -- read their real outputs as the
   contract you consume:**
   - `phase-0-probes.md` "Outputs": the **ezquake.com shape report**
     (`phase-0-artifacts/ezquake-com-shape.md`) -- the bucketed name lists
     (A = easy common `sv_*` mechanical-light; B = the hard
     dedicated-server-only tail -> D6 synthesis / C1 residue; C =
     ezquake.com-only). THIS sizes the Phase-4 cvar approach (D12/F-D12a).
     The C3 suspect pool (MVDSV portion -- gates synthesis). The
     load-commands free win (28/108 MVDSV commands now carry `help_desc`;
     the synthesis tail is the remaining ~80). Re-baselined probe-0 MVDSV
     denominators (recon the POST-Phase-0 figures, not the stale ones).
   - `phase-1-discipline.md` "Outputs": the D6 skill (engine-agnostic --
     Phase 4 fans it over MVDSV; recon its real slug), the D7 gate, the
     D11/D15 serializer, migration 014, the C5 probes.
   - `phase-3-ktx-source-synthesis.md` "Outputs": the PROVEN D6 fan-out
     pattern + the D7 tier-1/tier-2 operator-tail workflow + the new
     `F1.describe_fill.synthesized_requires_source_ref` C5 probe (Phase 4
     reuses it; ships a NEW C5 probe only if it is the first to write a new
     shape). Phase 3 deliberately DEFERRED `mvdsv:cvar:sv_antilag` to you
     (it is an MVDSV entity, description NULL) -- it is the D10 cross-fork
     DUAL you own.

## Per-phase live recon (run it; do not trust spec/prior-phase numbers blind)

Record in the mandatory "### Recon facts (verified ...)" Goal sub-block,
drafter-verified via psql/grep, never inferred (the ~157->109 conflation is
the precedent for why this block exists):

- The arc is in PLANNING: Phases 0/1/2/3 are approved-not-executed. Verify
  live what is absent (migration 014, the D6 skill, the C3 pool, the
  ezquake.com-shape artifact, the load-commands fix) and record that Phase 4
  EXECUTION presupposes Phases 0/1/2/3 EXECUTION (the same honest pattern
  Phases 2/3 used; flag as an orchestrator-sequencing Open Q, not a
  reshape).
- The live MVDSV denominators: `count(*) FROM entities WHERE
  project='mvdsv' AND type IN ('cvar','command','cmdline_param','info_key')`
  -- cvar (~183), command (~108), cmdline_param (~11), info_key (~45);
  the pre-execution `description_origin` distribution per type (the real
  baseline -- do NOT assume zero, the Phase 1 lesson).
- `mvdsv:cvar:sv_antilag` exists, description NULL (Phase 3 deferred it).
  The MVDSV engine-side `sv_antilag` registration + the mainline-vs-dusty
  meaning split (D10 DUAL; the engine side is line-identical -- the
  divergence is one entity's MEANING, not a divergent entity set; do NOT
  extract the dusty fork, F-D10c).
- The `mvdsv.6` roff man page: locate it live, confirm it is the cmdline
  source (~9 of M=11 per probe-0), and that a roff/man parser is a NEW
  non-libclang sibling handler (precedent: the Phase-2 KTX `.cfg` sibling /
  `_handler_match_events.py` text-reading shape -- NOT folded into the
  libclang registration handler).
- The Phase-0 ezquake.com-shape buckets (consume the report; do NOT
  re-fetch ezquake.com or compute a `NN/183` ratio -- F-D12a). The bucket
  split is the Phase-4 cvar sizing input; record which bucket drives the
  subagent-heavy posture.

## Drafting rules

- ASCII only; no em-dash/en-dash/emoji; comments explain WHY (P5).
  Main-tree git, no worktree/PR (P4). Bun runtime; any schema delta is a
  deviation (Phase 4 expects to FILL migration-014 columns, not migrate) --
  append-only + SCHEMA.md same task + surfaced (P1). JSONB binds JS values,
  never pre-stringified (P2). `source_ref` reuses the existing mechanism --
  no new format (P3).
- The `mvdsv.6` man-page parser is a D9 mechanical sibling: harvest
  structured facts + candidate text + provenance and STOP -- ZERO quality
  verdict; every candidate AND every comment-less entity flows to the D5-D8
  D6 fan-out. One record per (entity, source-file); drift preserved, never
  merged (F-C2a/D9/D10). Structured choices kept structured (the widened
  `structured_choices` provenance-element field, D11 amendment).
- The D6 synthesis fan-out + the D7 tier-1 independent re-check are
  **Opus 4.7 MAX -- spec-locked (D7), recorded, NOT lowered**. Per the
  **D7 clarification 2026-05-17**: ONE guarded D6 invocation per knob at
  Opus-MAX; "cheap"/"fast affirm" is the early-exit WITHIN it, NOT a
  cheaper pre-classify tier. Do NOT relitigate -- it is locked. Other
  tasks: subagent-default with model+effort + one-line rationale.
- EVERY in-scope MVDSV entity is evaluated (D5-amendment): a `help_desc` /
  man-page candidate is an input, never a "done" verdict. D8: dedicated-
  server / judgment cvars get mechanism-only descriptions and count as
  complete L1; tuning advice routes OUT to L3, not an L1 gap.
- Confabulation guard: not source-legible at Opus-max -> hedge or route to
  the C1 outreach residue track, NEVER guess. C3 sibling: a Phase-0
  MVDSV-suspect knob gets the truthful dead-stamp + C1 route, NOT a
  confident description; detect/stamp/route ONLY -- do NOT classify
  (F-C3b).
- `sv_antilag` (mvdsv:cvar:sv_antilag) is the D10 cross-fork DUAL: the
  description carries BOTH meanings (mainline-KTX-consumed vs dusty-ktx
  fork), source-grounded, C2-flagged, resolved INLINE at the D7 operator
  tail -- never collapsed to one, the fork NOT extracted (F-D10c).
- Coverage is the probe-0 MVDSV M denominators (verify live + use the
  POST-Phase-0 re-baselined figures), never a hand-picked subset; residue
  (incl. the hard dedicated-tail that fails source-legibility) is tracked
  to the C1 outreach track with a row -- NEVER importance-cut (C1). "It's a
  rare dedicated-server knob, skip it" is a C1 violation -- surface as a
  deviation, do not silently comply.
- Idempotent (C4/P3): the `mvdsv.6` extract + the D6 fan-out re-run
  reproduce identical committed rows; the >50%-drop guard is load-bearing.
  C4 recovery = re-run the corrected pipeline, NEVER an `UPDATE`.
- Stay out of scope: no KTX rework (Phases 2-3 done); no rebuild of the
  D6/D7/serializer (Phase 1); no public projection / MCP / wiki / showcase
  (Phase 5/6); no C3 classification; no dusty-* fork extraction; no casing
  fix (F-D10b).

## Step by step

1. Read everything in "Required reading", including Phases 0/1/2/3 real
   outputs. Note the Phase 4 findings (F-D12a/b, F-C2a, F-D10c, F-C3b) and
   the D7/D9/D11 dated amendments.
2. Run the per-phase live recon. Verify the MVDSV denominators, the
   `mvdsv:cvar:sv_antilag` state, the `mvdsv.6` man page, and consume (do
   not recompute) the Phase-0 ezquake.com-shape buckets. Record in the
   mandatory "### Recon facts (verified ...)" Goal sub-block -- live numbers,
   not spec figures (the ~157->109 precedent).
3. Draft the phase MD at
   `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-4-mvdsv-fill.md`
   following `phase-template.md` EXACTLY: section order; the required Recon
   sub-block; per-task Execution-mode (D6/D7 = Opus 4.7 MAX spec-locked,
   recorded; the `mvdsv.6` parser + fan-out driver subagent-default with
   rationale; subagent-heavy posture to hold the ~200-400k lower bound,
   stated); a HONEST hybrid phase-boundary verification (automated YES/NO:
   coverage vs the POST-Phase-0 MVDSV M denominators + residue tracked + C5
   probes GREEN + idempotent re-run; PLUS the operator-run D7 tier-2 tail --
   per-row judgment, NOT a probe); C4 recovery.
4. Dispatch the verification sub-agent (the brief at the bottom of
   `phase-template.md`; item 8 in its 2026-05-17-corrected form -- MVDSV is
   libclang/C, the man-page sibling is a non-libclang text handler). The
   brief must also confirm: every entity evaluated (no presumptive bucket);
   D6/D7 dials Opus 4.7 MAX + the D7 clarification honored (no cheaper
   pre-classify tier); C3 suspects dead-stamped not described; residue
   tracked to C1 never importance-cut; the Recon block records the real
   live MVDSV baseline + consumes (not recomputes) the Phase-0 shape.
5. Apply the sub-agent findings. If a finding contradicts `decisions.md`,
   the decision wins -- record the rejected finding under "Open questions"
   with a one-line rationale. If a lock premise looks wrong (a factual
   premise -- the OQ-3 discipline), surface it explicitly for amendment;
   never silently override, never silently comply.
6. Halt. Reply to the operator with: the phase MD path; the sub-agent
   finding counts (CRITICAL / SUBSTANTIVE / ADVISORY); any open questions
   needing operator attention before execution (esp. the resolved Phase-4
   context-budget call now that Phase 0's shape is consumable, and the
   operator-run D7-tail workload estimate for MVDSV); a recommendation --
   "ready for review" or "needs another pass".

Do NOT proceed to Phase 5. Do NOT execute anything. Do NOT modify the live
codebase. Drafting is paper-only.

## Optional hint slot

n/a -- first draft of Phase 4. (If a prior draft came back wrong, the planner
fills a one-paragraph hint here and a fresh terminal redrafts from the
corrections; do not preserve a prior draft's bugs.)
