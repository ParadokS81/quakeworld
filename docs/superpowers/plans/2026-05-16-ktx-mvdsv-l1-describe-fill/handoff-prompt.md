# Handoff prompt -- generic shape for per-phase drafting terminals

**This file is the TEMPLATE, not the thing the operator pastes.** Per-phase
pre-substituted prompts are generated at planning Step 4 as
`phase-<N>-drafter-prompt.md` in this directory. Those are pure file-as-prompt
(no preamble, no wrapper) -- the operator opens a fresh terminal and types
`@docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-<N>-drafter-prompt.md`
as the first message; the model treats the file content as the instruction
directly. No copy-paste markers, no "open a terminal and paste" wrapper -- the
file IS the prompt.

Below is the body shape every per-phase prompt follows. `<PHASE_NUMBER>`,
`<PHASE_NAME>`, `<PHASE_GOAL_ONE_LINER>`, and the per-phase reads/findings get
substituted when the per-phase file is generated. The drafter never sees this
preamble -- it sees only the substituted body.

---

You are drafting **Phase `<PHASE_NUMBER>` -- `<PHASE_NAME>`** of the
**2026-05-16 KTX / MVDSV Layer-1 describe-fill** arc.

`<PHASE_GOAL_ONE_LINER>`

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything -- no migrations, no extractors, no loaders, no
serializers, no probes. The phase MD you write becomes input to a separate
execution session later.

Working directory: `/home/paradoks/projects/quakeworld`

## You are in the RIGHT arc only if all of these hold

This arc fills **provenance-stamped descriptions** onto KTX/MVDSV
**configurable entities** (cvars, commands, cmdline params, info_keys) that
ALREADY exist in L1. Tell-tale signs you have been handed the WRONG arc's
prompt (STOP and tell the operator if you see these as your phase goal):

- "Postgres port / RRF / Voyage embedding pipeline / Layer 2 Discord /
  snapshot manifest delta-fetch" -> that is **qw-oracle Arc 1**
  (`2026-05-02-qw-oracle-arc1`), the exemplar, NOT this arc.
- "Write game_mode concept-note bodies / mode narrative prose" -> that is the
  **2026-05-09 game-mode L3 arc**, sequenced AFTER this one (D18). D1 carves
  mode narrative OUT of this arc. Wrong arc.
- "Build the libclang call-graph / classify genuine-dead vs build-excluded"
  -> the parked **reachability arc**
  (`2026-05-16-libclang-callgraph-reachability-arc`). This arc only DETECTS a
  suspect pool (C3); it does not classify. Wrong scope.
- "Extract the dusty-* codebase into L1" -> the parked
  **dusty-antilag-fork arc** (`2026-05-16-dusty-antilag-fork-l1`). This arc
  describes `sv_antilag` as a DUAL L1 description (D10); it does not extract
  the fork. Wrong scope.
- "Add a name_fold / case column to the loader" -> the
  **case-fidelity mini-arc** (`2026-05-16-l1-entity-name-case-fidelity-miniarc`).
  Soft dependency only; never fixed in this arc (F-D10b). Wrong scope.
- "probe-0..5 / gap-findings / coverage.ndjson authoring" -> that is the
  **2026-05-15 doc-landscape investigation**, the GROUNDING INPUT to this
  arc, already complete. You consume it; you do not re-author it.

If your phase goal matches this arc (describe-fill the configurable buckets,
provenance-stamped, per the D17 seven-phase shape), proceed.

## Required reading (read all before drafting; do not skip)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md`
   -- phase index, read-order, non-goals.
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   -- C1-C5, P1-P5, D1-D18. Every phase respects these. They are LOCKED;
   you turn them into a plan, you do not re-open them. A genuine conflict is
   surfaced for explicit amendment, never silently overridden and never
   silently complied with.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/review-findings.md`
   -- risk/carry-forward ledger. Find the rows whose "Phase" is
   `<PHASE_NUMBER>` (ownership table at the bottom).
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-template.md`
   -- the MANDATORY shape for the phase MD you produce. Follow section order
   and the Execution-mode annotation rule exactly.
5. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- the design spec; the SOURCE OF TRUTH for full rationale behind every
   C/D. `decisions.md` is the distillation; the spec is the why.
6. The grounding evidence (consume, do not re-derive):
   `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md`
   + `coverage.ndjson` + the relevant `probe-*.md`. The N/M denominators here
   size your phase (C1 exhaustive).
7. `apps/qw-oracle/API_CONTRACTS.md` -- the new-dataset checklist + the MCP
   public-projection contract any projection phase must respect (F-D13a).
8. Per-phase recon (run live; do not trust the spec's numbers blind):
   - Phase 0: the in-repo dump
     `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ciscon-1.20-dev-2026-04-27.log`;
     `scripts/load-knowledge/load-commands.ts`; the loaded L1 versions for
     ktx/mvdsv (SQL).
   - Phase 1/2: `apps/qw-oracle/SCHEMA.md` + `db/migrations/`; the existing
     F1 grid `scripts/load-knowledge/quality-grid.ts`; the existing
     extractor/loader plug-in pattern (KTX = tree-sitter sibling handler;
     this is NOT the libclang registration handler).
   - Phase 3/4: the D6 skill scaffold precedent
     (`asset-type-curate` / `guide-rewrite` / `validate-extractor`); the
     actual KTX `commands.c` CD_ table / `world.c` register sites; the
     `mvdsv.6` roff man page; the Phase 0 outputs.
   - Phase 5/6: the existing snapshot builder + orientation blob; the D11
     audit serializer Phase 1 built.

## Drafting rules

- ASCII only. No emoji. ASCII hyphen-minus, never em-dash or en-dash. No
  marketing voice. Code comments (in any inlined content) explain WHY (P5).
- Bun runtime; append-only `db/migrations/<NNN>.sql` + `SCHEMA.md` in the same
  task (P1). JSONB columns receive JS values, never pre-stringified (P2).
  `source_ref` reuses the existing citation mechanism -- no new format (P3).
  Main-tree git, commit-on-main, no worktree/PR ceremony (P4).
- Origin tag vocabulary is EXACTLY `source_inline` / `synthesized` /
  `shipped_doc` (D2/D11). No other tag; no tag-per-file.
- The D9 mechanical extractor STOPS at harvest with zero quality verdict;
  every candidate AND every comment-less entity flows to the D5-D8 evaluation
  (no parser "looks fine" affirmation).
- Coverage is the probe-0 N/M denominator, never a hand-picked subset; residue
  is tracked (C1 outreach track), never importance-cut.
- The D6 synthesis pass and the D7 independent review pass are **Opus 4.7
  MAX** -- spec-locked; record the dial, do not lower it. Other tasks: pick
  execution mode + model + effort per task shape with a one-line rationale
  (subagent-default for code synthesis; inline only for pure-textual no-logic
  edits with full content inlined).
- A C5 F1 probe for a NEW data shape lands in the SAME phase that first writes
  that shape -- not deferred.
- Phase 1's runnable state is self-contained (smoke probe against one fixture
  knob; does NOT depend on Phase 2/3 rows -- the D17 planner note).
- Stay out of the parked/sibling arcs (the WRONG-arc list above doubles as
  the boundary list: no fork extraction, no reachability classification, no
  casing fix, no wiki-side plumbing, no mode-narrative prose).

## Step by step

1. Read everything in "Required reading". Note the findings that touch
   Phase `<PHASE_NUMBER>`.
2. Run the per-phase live recon (item 8). Verify numbers/paths/shapes against
   live source -- do NOT inline spec numbers unverified.
3. Draft the phase MD at
   `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-<PHASE_NUMBER>-<slug>.md`
   following `phase-template.md` exactly (section order, Execution-mode
   annotation per task, YES/NO phase-boundary verification, C4 recovery).
4. Dispatch the verification sub-agent (the brief at the bottom of
   `phase-template.md`, paths filled for this phase).
5. Apply the sub-agent findings. If a finding contradicts `decisions.md`, the
   decision wins -- record the rejected finding under "Open questions" with a
   one-line rationale. If a lock itself looks wrong, surface it explicitly for
   amendment; do not silently override and do not silently comply.
6. Halt. Reply to the operator with: the phase MD path; the sub-agent finding
   counts (CRITICAL / SUBSTANTIVE / ADVISORY); any open questions needing
   operator attention before execution; and a recommendation -- "ready for
   review" or "needs another pass".

Do NOT proceed to phase N+1. Do NOT execute anything. Do NOT modify the live
codebase. Drafting is paper-only.

## Optional hint slot (planner/orchestrator fills when redrafting)

If a prior draft of this phase came back wrong, the per-phase prompt gets a
one-paragraph hint here: "The previous draft of phase-`<N>`-*.md had these
issues: <X>, <Y>. Read it at <path>, then redraft from scratch with the
corrections; do not preserve the old draft's bugs." Fresh terminal per
redraft (the polluted-context recovery pattern).
