You are drafting **Phase 3 -- KTX source-synthesis (D5-D8, D10)** of the
**2026-05-16 KTX / MVDSV Layer-1 describe-fill** arc.

Phase 3 runs the D6 guardrailed synthesis skill (built in Phase 1) as a
sub-agent fan-out over every in-scope KTX entity that Phase 2's mechanical
extract did NOT settle: the ~109 `shipped_doc` candidates (each EVALUATED
affirm-vs-synthesize, D5-amendment -- a comment is one input, never a
verdict), the residual still-NULL KTX cvars (~151 incl. the 38 bot
`k_fbskill_*`, mechanism-only per D8), the CD_NODESC KTX commands, and
triage-failed comments -- producing for every in-scope KTX entity an
affirmed-or-synthesized description through the D7 two-tier gate, with D10
meaning-conflicts resolved inline at the D7 operator tail and genuine
not-source-legible residue routed to the C1 outreach track (tracked, never
importance-cut).

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything -- no synthesis, no skill runs, no gate, no DB writes.
The phase MD you write becomes input to a separate execution session later.
This is the synthesis heart of the arc; expect a long, subagent-heavy task
table and an operator-run phase boundary (the D7/D15 audit-page tail).

Working directory: `/home/paradoks/projects/quakeworld`

## You are in the RIGHT arc/phase only if all of these hold

This arc fills provenance-stamped descriptions onto KTX/MVDSV configurable
entities that ALREADY exist in L1. Phase 3 is KTX source-synthesis only. STOP
and tell the operator if your phase goal looks like any of these:

- "Build the mechanical extractor / parse `ktx.cfg` / harvest shipped_doc
  candidates" -> that is **Phase 2** (already approved). Phase 3 CONSUMES
  Phase 2's harvested candidates + the comment-less cvars; it does not
  re-harvest. Wrong phase.
- "MVDSV fill / `mvdsv.6` man page / `sv_*` split" -> that is **Phase 4**
  (sized by Phase 0). KTX-first is locked (D17). Wrong phase.
- "Classify genuine-dead vs build-excluded / build the libclang call-graph"
  -> the parked reachability arc. Phase 3 only STAMPS C3 suspects truthfully
  and routes them to C1; it does NOT classify. Wrong scope.
- "Extract the dusty-* codebase / fork-aware schema" -> the parked
  dusty-antilag-fork arc (F-D10c). Phase 3 describes `sv_antilag` as a DUAL
  L1 description (D10 meaning-conflict); it does not extract the fork. Wrong
  scope.
- "Emit the wiki feed / snapshot.json / MCP public projection / showcase"
  -> Phase 5/6 (F-D13a). Phase 3 writes the internal record + runs the
  operator D7 tail on the Phase-1 audit page. Wrong phase.
- "Write game_mode concept-note bodies / mode narrative prose" -> the
  2026-05-09 game-mode L3 arc, sequenced AFTER this (D1/D18). Wrong arc.

If your goal is "fan the D6 skill over the KTX synthesize set through the D7
gate, D10 conflicts inline at the tail, residue to C1", proceed.

## Required reading (read all before drafting; do not skip)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md`
   -- phase index, the locked slicing analysis, non-goals. Phase 3's
   verification regime is **operator-run** (the D7 audit-page tail --
   per-row judgment) plus the automated C5 probes + coverage vs probe-0;
   it is self-contained (no downstream projection).
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   -- C1-C5 (incl. the **C3 amendment 2026-05-17**), P1-P5, D1-D19, and
   **read the dated amendment blocks in full**: the **D9 amendment
   2026-05-17** (the "~157" -> verified **~109/260** correction; M=260 is
   the C1 gate; ~151 residue incl. 38 `k_fbskill_*` tracked to Phase 3 --
   that residue is YOUR inbound work), the **D11 amendment 2026-05-17** (the
   `description_provenance` element is widened with an additive
   `structured_choices` field -- the shape you consume), the **D2
   clarification 2026-05-17**, **D19**. Especially: **D5 + the D5 amendment**
   (every entity evaluated; a trailing comment is one input, never a "done"
   verdict), **D6** (the guardrailed skill -- read-site grounding,
   `source_ref`+anchor evidence, hard confabulation guard, the C3
   dead-stamp sibling, the research-docs-as-aids amendment), **D7**
   (two-tier gate; **synthesis pass AND independent review pass are Opus 4.7
   MAX -- spec-locked, NOT yours to lower**; tier-2 is the operator batch
   tail on the D11/D15 audit page), **D8** (bot/judgment cvars
   mechanism-only = complete L1; tuning advice routes OUT to L3, not an L1
   gap), **D10** (three classes: value-diff -> L3 not flagged;
   meaning-conflict -> source-grounded + C2-flagged + resolved inline at the
   D7 tail; membership -> union; cross-fork collapses into meaning,
   `sv_antilag` the exemplar -- DUAL description, do NOT extract the fork),
   **C3** (a suspect-pool knob gets the truthful dead-stamp + C1 route,
   never a confident "tunes X"). You turn these into a plan; you do not
   re-open them. A genuine conflict surfaces for explicit amendment -- never
   silently overridden, never silently complied with.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/review-findings.md`
   -- the rows that touch Phase 3: **F-C2a** (the in-repo-vs-nQuake
   meaning-conflicts Phase 2 preserved per-source -- e.g. `k_noframechecks`
   polarity-label inversion -- YOU resolve inline at the D7 tail with source
   evidence, never auto-pick; value-diffs route to L3, not flagged),
   **F-D10c** (the dusty-* antilag fork is a SEPARATE arc -- describe
   `sv_antilag` dual, do not extract), **F-C3b** (reachability
   classification is the parked arc -- detect+stamp+route, do not classify).
   Read the dated CORRECTION 2026-05-17 in "Confirmed-good" (canonical KTX
   is libclang/C; tree-sitter is dusty-ktx only).
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-template.md`
   -- the MANDATORY shape. Follow section order exactly, including the
   **REQUIRED "### Recon facts (verified against live source <date>; do not
   re-derive blind)" sub-block of the Goal section, between Goal and "Inputs
   from previous phase"** (Phase 1's first draft omitted it and shipped two
   probe defects as a direct result -- do NOT repeat). Per-task
   Execution-mode annotation is mandatory; the D6 synthesis and D7 review
   dials are Opus 4.7 MAX, spec-locked -- record, do not lower.
5. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- the source of truth for the why. Read **D5-D8** (~lines 329-426),
   **D10** (~475-535), **C1/C3** closely. Note the dated correction on the
   D17 Phase 2 bullet (the ~157 -> ~109 fix).
6. The grounding evidence (consume, do not re-derive):
   `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md`
   + `coverage.ndjson` + the relevant `probe-*.md`. The probe-0 KTX
   denominators size your phase (C1 exhaustive): KTX cvar M=260, command
   M=358 (311 in L1, ~47 CD_NODESC), info_key 7/7. Verify live -- do NOT
   trust the spec numbers blind (the ~157->109 lesson is exactly this).
7. `apps/qw-oracle/API_CONTRACTS.md` -- Phase 3 writes the INTERNAL record
   only + runs the operator D7 tail on the Phase-1 audit page. It does NOT
   touch the MCP public-projection surface (Phase 5 / F-D13a).
8. **Phases 0, 1, 2 are hard inputs -- read their real outputs:**
   - `phase-2-ktx-mechanical-extract.md` "Outputs to next phase": the
     ~109/260 `shipped_doc`-candidate set + retained per-(cvar,source-file)
     provenance (with the widened `structured_choices`); the harvest STOPPED
     at the D9 seam (zero quality verdict) so EVERY `shipped_doc` candidate
     AND every still-NULL KTX cvar is YOUR D5-D8 inbound; the ~151 residue
     + 11 non-resolvers + 38 bot `k_fbskill_*` are the explicit tracked
     Phase-3 hand-off; the F-C2a meaning-conflicts preserved per-source.
   - `phase-1-discipline.md` "Outputs": the D6 guardrailed synthesis skill
     (the fan-out unit -- recon its ACTUAL slug under `~/.claude/skills/`,
     it was a Phase-1 placeholder Open Q (e)); the D7 two-tier
     `review-gate.ts`; the D11/D15 audit-review serializer (your operator
     tail surface); migration `014` (the verdict/confidence/reasoning/
     proposed/anchor/rereview columns Phase 3 populates); `k_short_gib`
     pre-filled (idempotent -- do NOT re-synthesize or double-count it).
   - `phase-0-probes.md` "Outputs": the **C3 suspect pool**
     (`phase-0-artifacts/c3-suspect-pool.md`, per-engine, build-pinned) --
     a HARD PREREQUISITE for Phase 3 synthesis (C3/D12). A suspect-pool
     knob gets the D6 truthful dead-stamp + C1 route, NOT a confident
     description.

## Per-phase live recon (run it; do not trust spec/prior-phase numbers blind)

Record every figure in the mandatory "### Recon facts (verified ...)" Goal
sub-block, drafter-verified via psql/grep, never inferred:

- The D6 skill's ACTUAL slug + shape under `~/.claude/skills/` (Phase 1
  built it; the slug was a placeholder -- find the real one; confirm the
  hard pre-flight + the six D6 guardrails + the Opus-4.7-MAX dial are
  present). It is the unit Phase 3 fans out over.
- `apps/qw-oracle/scripts/describe-fill/review-gate.ts` (the D7 tier-1
  independent evidence re-check) and
  `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts` (the
  D11/D15 operator-tail page) -- Phase 1 outputs; recon their actual
  interfaces, do not assume.
- The C3 suspect pool artifact (Phase 0): the path + the per-(engine,type)
  KTX suspect list -- the gate for "dead-stamp not describe".
- The live KTX synthesize set against M=260 / M=358: how many cvars are
  still `description_origin IS NULL` after Phase 2's ~109 `shipped_doc`
  fill; the ~47 CD_NODESC KTX commands (live `commands.c` CD_ table); the
  38 bot `k_fbskill_*` (registered in `bot_botimp.c`, no comment anywhere
  -- D8 mechanism-only); the F-C2a meaning-conflict set Phase 2 preserved.
- The `sv_antilag` mainline-KTX source (no `antilag.c`; thin passthrough
  0<->2, "on" tested `== 2`) for the D10 DUAL worked example -- describe
  dual, do NOT extract the dusty-ktx fork (F-D10c).
- `k_short_gib` is already a complete Phase-1 `synthesized` row (idempotent
  -- Phase 3 must not re-synthesize it or double-count it in coverage).

## Drafting rules

- ASCII only; no em-dash/en-dash/emoji; comments explain WHY (P5).
  Main-tree git, no worktree/PR (P4).
- The D6 skill is the fan-out unit. Synthesis pass = the D6 skill at
  **Opus 4.7 MAX**; the D7 tier-1 independent evidence re-check = an
  **independent Opus 4.7 MAX** invocation (separate from the authoring
  context). Spec-locked by D7 -- record the dial, do NOT lower it. Other
  tasks: subagent-default for code/judgment work, model+effort per
  `feedback_model_effort_range` with a one-line rationale.
- EVERY in-scope KTX entity is evaluated (D5-amendment): a `shipped_doc`
  candidate is an input to the affirm-vs-synthesize judgment, never a
  "done" verdict; a comment-less cvar is evaluated equally. No
  presumptively-covered bucket. Affirm -> origin stays/sets per the rule;
  synthesize -> `synthesized` + `source_ref` file:line + anchor version
  (existing mechanism, NO new citation format -- P3).
- Hard confabulation guard: not source-legible at Opus-max -> hedge or
  route to the C1 outreach residue track, NEVER guess. C3 sibling: a
  Phase-0 suspect-pool knob gets the truthful dead-stamp ("registered in
  KTX source at version N; not reachable in a running build at this commit;
  appears non-functional, candidate upstream code bug") + C1 route -- NOT
  a confident "tunes X".
- D8: bot/judgment cvars (the 38 `k_fbskill_*` etc.) get mechanism-only
  descriptions and count as COMPLETE L1; tuning advice routes OUT to L3,
  its absence is NOT an L1 gap.
- D10 three classes: value-differences route to L3 (NOT flagged as an L1
  conflict); meaning-conflicts (e.g. `k_noframechecks` polarity inversion;
  `sv_antilag` cross-fork) are source-grounded, C2-flagged, and resolved
  INLINE at the D7 operator tail with source evidence in hand (no separate
  conflict queue); membership-drift is union coverage. `sv_antilag` is a
  DUAL description (mainline vs dusty meaning) -- never collapsed; the fork
  is NOT extracted (F-D10c).
- D7 gate, every synthesized row, before commit: tier-1 independent
  automated evidence re-check (Opus 4.7 MAX, separate invocation) confirms
  the cited `source_ref` exhibits the claimed behavior + the D5 rubric
  passes; fail -> re-synth or residue. Tier-2 = the operator batch tail
  (hedged + residue-routed + a spot-check of the auto-passed bulk) on the
  Phase-1 D11/D15 audit page. Phase 3 is the first phase that RUNS the
  operator tail -- the phase boundary is operator-run.
- Coverage is the probe-0 M denominators (KTX cvar 260, command 358),
  never a hand-picked subset. The ~151 cvar residue + the CD_NODESC
  commands either get an affirmed-or-synthesized description OR are tracked
  to the C1 outreach track with a row -- NEVER importance-cut (C1). "It
  doesn't matter for admins" is a C1 violation -- surface it as a
  deviation, do not silently comply.
- `k_short_gib` is pre-filled by Phase 1 (idempotent, C4/D19): Phase 3 does
  not re-synthesize it and counts it exactly once toward coverage.
- C4 recovery: re-run the corrected pipeline end-to-end, NEVER an `UPDATE`
  that patches visibly-wrong rows.
- Stay out of scope: no MVDSV (Phase 4); no mechanical re-harvest (Phase 2);
  no C3 classification (parked arc -- detect/stamp/route only); no dusty-*
  fork extraction; no casing fix (F-D10b); no public projection / MCP /
  wiki / showcase (Phase 5/6).

## Step by step

1. Read everything in "Required reading", including Phases 0/1/2 real
   outputs as the contract you consume. Note the Phase 3 findings (F-C2a
   resolution, F-D10c boundary, F-C3b boundary) and the D9/D11 dated
   amendments.
2. Run the per-phase live recon (the D6 skill slug + guardrails, the D7
   gate + audit serializer interfaces, the C3 suspect pool, the live
   synthesize set vs M=260/M=358, the CD_NODESC + `k_fbskill_*` sets, the
   `sv_antilag` mainline source, `k_short_gib` already filled). Record in
   the mandatory "### Recon facts (verified ...)" Goal sub-block. Do NOT
   inline spec/prior-phase numbers unverified -- the ~157->109 conflation
   is the cautionary precedent.
3. Draft the phase MD at
   `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-3-ktx-source-synthesis.md`
   following `phase-template.md` EXACTLY: section order; the required Recon
   sub-block; per-task Execution-mode annotation (the D6 synthesis +
   D7 tier-1 review = Opus 4.7 MAX spec-locked, recorded; the fan-out
   driver + coverage harness subagent-default with rationale); a
   phase-boundary verification that is HONEST about being operator-run (the
   D7/D15 audit-page tail -- per-row judgment) PLUS the automated parts
   (the C5 probes GREEN; coverage vs M=260/M=358 with residue tracked;
   `k_short_gib` counted once, not regressed); C4 recovery.
4. Dispatch the verification sub-agent (the brief at the bottom of
   `phase-template.md` -- note item 8 was corrected 2026-05-17: canonical
   KTX is libclang/C, the D9 tier is the `.cfg`-text sibling, tree-sitter
   is dusty-ktx only; do not let a stale brief flag correct work). The
   brief must also confirm: every in-scope entity is evaluated (no
   presumptive bucket); the D6/D7 dials are Opus 4.7 MAX; C3 suspects get
   the dead-stamp not a description; residue is tracked to C1 never
   importance-cut; the Recon-facts block records the real live synthesize
   set, not an assumption.
5. Apply the sub-agent findings. If a finding contradicts `decisions.md`,
   the decision wins -- record the rejected finding under "Open questions"
   with a one-line rationale. If a lock itself looks wrong (a factual
   premise -- the OQ-3 discipline), surface it explicitly for amendment;
   never silently override, never silently comply.
6. Halt. Reply to the operator with: the phase MD path; the sub-agent
   finding counts (CRITICAL / SUBSTANTIVE / ADVISORY); any open questions
   needing operator attention before execution (esp. anything that would
   change the operator-run D7-tail workload estimate); a recommendation --
   "ready for review" or "needs another pass".

Do NOT proceed to Phase 4. Do NOT execute anything. Do NOT modify the live
codebase. Drafting is paper-only.

## Optional hint slot

n/a -- first draft of Phase 3. (If a prior draft came back wrong, the planner
fills a one-paragraph hint here and a fresh terminal redrafts from the
corrections; do not preserve a prior draft's bugs.)
