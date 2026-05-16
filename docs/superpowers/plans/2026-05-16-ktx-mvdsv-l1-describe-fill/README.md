# KTX / MVDSV Layer-1 describe-fill -- arc plan

**Spec:** `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
(source of truth -- C1-C5, P-invariants, D1-D18, full rationale).
**Arc capture:** `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-fill.md`.
**Grounding:** `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/`
(gap-findings + probe-0 N/M denominators + coverage manifest).

**Goal:** every admin-configurable KTX/MVDSV knob (cvars, commands, cmdline
params, info_keys) ends up with a sensible, provenance-stamped Layer-1
description -- the single source of truth the MCP, the Slipgate JSON snapshot,
a future web server-manager, and wiki.slipgate.me all render from, and that
the separately-docketed game-mode L3 concept notes cite as anchors. This arc
builds the foundation; it does NOT write L3 concept notes.

**Status:** Planning. Scaffold landed 2026-05-16. Slicing analysis pending
operator review (Step 2). Per-phase MDs drafted in fresh terminals after
slicing locks, each sub-agent-verified before operator review at the phase
boundary.

---

## Read in this order

1. **`prerequisites.md`** -- operator-side Task 0. Mostly already satisfied
   in this environment; confirm before kicking off Phase 0.
2. **`decisions.md`** -- C1-C5 (cross-cutting), P1-P5 (project invariants),
   D1-D18 (locked arc decisions). Every phase respects these. They are LOCKED
   by the brainstorm; the spec is the full rationale. If a decision is wrong,
   amend it here (dated block) before drafting; never drift in a phase MD.
3. **`review-findings.md`** -- risk / carry-forward ledger (no prior
   monolithic plan; this is the watch-list, not a defect audit). Phase
   ownership table at the bottom.
4. **`phase-template.md`** -- mandatory shape for every phase MD, including
   the Execution-mode annotation rule and the verification sub-agent brief.
5. **`handoff-prompt.md`** -- the generic shape per-phase drafting prompts
   follow. Per-phase pre-substituted `phase-<N>-drafter-prompt.md` files are
   generated at planning Step 4.
6. **Per-phase MDs** -- drafted in order; see the index below.

---

## Phase index (D17 -- LOCKED shape; not re-derived by the planner)

KTX-first preserved (Phases 2-3 before MVDSV Phase 4). Phase 0 sizes Phase 4.
Phase 1 is the build-once spine both engines consume. Each phase ends in a
verifiable, runnable state. The verification-regime and context-budget columns
are filled when the slicing analysis is locked with the operator (Step 2);
until then they read "pending".

| Phase | Status | MD | Deliverable | Runnable state at end | Verif. regime | Ctx budget |
|---|---|---|---|---|---|---|
| 0 | not started | (pending draft) | Probes + the free win: ezquake.com shape-quant; C3 runtime-dead suspect-pool diff; `load-commands.ts` one-line fix | Suspect pool exists; ezquake.com shape known; 28/108 MVDSV commands reloaded | pending | pending |
| 1 | not started | (pending draft) | The discipline, built once: provenance/staleness schema (D2/D11); D6 synthesis skill; D7 two-tier gate; D11/D15 audit serializer; C5 probes | Spine round-trips against one fixture knob (self-contained smoke -- D17 planner note); C5 tag+anchor probes green | pending | pending |
| 2 | not started | (pending draft) | KTX mechanical extract (D9): new sibling extractor + loader adapter; in-repo + nQuake `ktx.cfg` -> structured choices + candidate text + retained provenance | ~157/260 KTX cvars carry shipped_doc candidates + retained per-source provenance; idempotent re-extract; provenance/jsonb probes green | pending | pending |
| 3 | not started | (pending draft) | KTX source-synthesis (D5-D8, D10): D6 skill fans out over CD_NODESC + residual cvars + bot/judgment (mechanism-only) + triage-failed comments; meaning-conflicts resolved inline at the D7 tail | Every in-scope KTX entity carries an affirmed-or-synthesized description; residue tracked to the C1 outreach track | pending | pending |
| 4 | not started | (pending draft) | MVDSV fill, sized by Phase 0: `mvdsv.6` man-page sibling parser (cmdline); loader-freed commands + synthesis tail; cvars split easy-common-`sv_*` vs hard-dedicated-tail per the Phase 0 probe | Every in-scope MVDSV entity carries an affirmed-or-synthesized description; residue tracked | pending | pending |
| 5 | not started | (pending draft) | Staleness + projections: wire the D4 walk-time re-review report into the new-version runbook; emit the D14 public wiki feed + snapshot.json; confirm C5 probes green; MCP public-projection delta (F-D13a) | New-version walk produces the staleness report; public projections regenerate from the record; all C5 probes green | pending | pending |
| 6 | not started | (pending draft) | **Deferrable tail** -- upstream pitch (D16): generate the dev showcase page from snapshot.json; hold the conversation; decide the PR path after | Showcase page renders from the record; conversation held | pending | pending |

Status flow: `not started` -> `drafted (awaiting review)` -> `approved` ->
`in execution` -> `shipped`. The drafter terminal does NOT auto-proceed;
operator reviews at every phase boundary.

**Phase 6 does NOT gate arc completion.** The arc is complete and useful at
the end of Phase 5 (D16/D17). Phase 6 is the deferrable tail.

---

## What this arc deliberately does NOT cover

Per `decisions.md` D1 + the arc capture's NOT-in-scope + the boundary findings
in `review-findings.md`:

- **The structural tier** (log_templates, protocol, qc_builtins,
  gameplay_tables/taxonomies, match_events) -- already ~100% complete in L1
  from structured extraction; proven to need no admin prose. Confirm-exclude,
  do not relitigate.
- **Mode narrative / the 27 game-mode concept notes** -- L3 prose, the
  separately-docketed `2026-05-09-ktx-game-mode-l3-concept-notes` arc,
  sequenced AFTER this one (D18). This arc is their foundation, not their
  replacement.
- **Recommended-value / best-practice settings as L1 facts** -- L3 by the
  locked L1-is-fact / L3-is-opinion boundary. Not an L1 deliverable (D8).
- **Re-extraction of the configurable element set** -- already done; this arc
  fills descriptions, it does not re-derive entities (D9).
- **Reachability classification** (genuine-dead vs build-excluded) -- the
  parked libclang call-graph arc (F-C3b). This arc only detects a suspect
  pool (C3).
- **The dusty-* antilag fork extraction** -- a separate future arc (F-D10c).
  This arc describes `sv_antilag` dual per D10.
- **Entity-name case fidelity** -- a separate tracked mini-arc (F-D10b);
  soft dependency, re-projects clean, never fixed here.
- **The wiki rendering UX + wiki-side namespace/bot plumbing** -- consumer
  surface / qwiki-v1-beta cross-arc scope (F-D14a). This arc owns the feed
  contract, not its implementation.
- **The upstream PR itself** -- deferred past Phase 6 to the operator + dev
  conversation (D16). Phase 6 is the showcase + conversation, not a PR.

If a phase drifts into one of these, that is scope creep -- flag it as a
deviation, do not silently proceed.

---

## Operator quick-reference

- **Kick off a phase draft:** open a fresh terminal, type
  `@docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-<N>-drafter-prompt.md`
  (those per-phase files are generated at Step 4; the generic shape is in
  `handoff-prompt.md`).
- **Review a drafted phase:** read the phase MD top to bottom, run the
  YES/NO verification at its bottom, eyeball file lists + Execution-mode
  annotations, sign off (status -> `approved`) or return for revision.
- **A sub-agent finding conflicts with a decision:** the decision wins;
  reject the finding with a one-line rationale in the phase's "Open
  questions". If the decision itself is wrong, amend `decisions.md` (dated
  block) before re-drafting.
- **A new risk emerges during drafting:** append to `review-findings.md` with
  the next sequential F-suffix and a phase tag.
