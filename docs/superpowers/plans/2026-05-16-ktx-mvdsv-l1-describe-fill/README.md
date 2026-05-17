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

**Status:** Planning. Scaffold + slicing LOCKED (operator-reviewed
2026-05-16; see "Slicing analysis" below). **Phase 1 APPROVED 2026-05-17**
(planner cold-review: two probe-gate defects + one template-shape deviation
caught and fixed across three passes, all fixes independently live-verified;
D19 smoke = `k_short_gib`). **Phase 0 APPROVED 2026-05-17** (self-built reproducible C3 oracle; F-C3a
dissolved; the OQ-3 "KTX = QuakeC/fteqcc" planner error was corrected across
spec/decisions/prompt/memory -- both engines are C/CMake). Per-phase MDs
drafted in fresh terminals, sub-agent-verified, operator-reviewed at each
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
verifiable, runnable state. Verification-regime + context-budget columns
LOCKED by the slicing analysis (operator-reviewed 2026-05-16; see the
"Slicing analysis" section below).

| Phase | Status | MD | Deliverable | Runnable state at end | Verif. regime | Ctx budget |
|---|---|---|---|---|---|---|
| 0 | **approved** 2026-05-17 | phase-0-probes.md | Free win (`load-commands.ts`, 28/108) + **self-built C3 oracle** (fetch dev-head fwd, build mvdsv+ktx, local-server dump, re-extract L1 same build) + ezquake.com shape-quant | 28/108 reloaded; fresh same-build dump + suspect pool; L1 re-extracted to dev-head; ezquake shape known; probe-0 denominators re-baselined | Automated (build+server succeeds; 0->28; same-build set-diff deterministic; no N/183) | ~200-350k (grew: 2 engine builds + server harness + re-extract) |
| 1 | **approved** 2026-05-17 | phase-1-discipline.md | The discipline, built once: provenance/staleness schema (D2/D11); D6 synthesis skill; D7 two-tier gate; D11/D15 audit serializer; C5 probes | Full pipeline round-trips one real KTX cvar (self-contained smoke -- D19); C5 tag+anchor probes green | Automated (smoke vs 1 real KTX cvar -- D19) | **~250-450k (watch)** |
| 2 | not started | (pending draft) | KTX mechanical extract (D9): new sibling extractor + loader adapter; in-repo + nQuake `ktx.cfg` -> structured choices + candidate text + retained provenance | ~157/260 KTX cvars carry shipped_doc candidates + retained per-source provenance; idempotent re-extract; provenance/jsonb probes green | Automated (coverage vs probe-0 + idempotency + jsonb/prov probes) | **~200-400k (watch)** |
| 3 | not started | (pending draft) | KTX source-synthesis (D5-D8, D10): D6 skill fans out over CD_NODESC + residual cvars + bot/judgment (mechanism-only) + triage-failed comments; meaning-conflicts resolved inline at the D7 tail | Every in-scope KTX entity carries an affirmed-or-synthesized description; residue tracked to the C1 outreach track | Operator-run (D7 audit-page tail -- per-row judgment) | ~200-350k thread |
| 4 | not started | (pending draft) | MVDSV fill, sized by Phase 0: `mvdsv.6` man-page sibling parser (cmdline); loader-freed commands + synthesis tail; cvars split easy-common-`sv_*` vs hard-dedicated-tail per the Phase 0 probe | Every in-scope MVDSV entity carries an affirmed-or-synthesized description; residue tracked | Operator-run (same D7 tail) | **200-400k (uncertain until P0)** |
| 5 | not started | (pending draft) | Staleness + projections: wire the D4 walk-time re-review report into the new-version runbook; emit the D14 public wiki feed + snapshot.json; confirm C5 probes green; MCP public-projection delta (F-D13a) | New-version walk produces the staleness report; public projections regenerate from the record; all C5 probes green | Mixed (staleness report op-run at walk; projections automated round-trip) | ~150-300k |
| 6 | not started | (pending draft) | **Deferrable tail** -- upstream pitch (D16): generate the dev showcase page from snapshot.json; hold the conversation; decide the PR path after | Showcase page renders from the record; conversation held | Operator-run; **non-gating** (arc complete at end of P5) | ~50-150k |

Status flow: `not started` -> `drafted (awaiting review)` -> `approved` ->
`in execution` -> `shipped`. The drafter terminal does NOT auto-proceed;
operator reviews at every phase boundary.

**Phase 6 does NOT gate arc completion.** The arc is complete and useful at
the end of Phase 5 (D16/D17). Phase 6 is the deferrable tail.

---

## Slicing analysis (locked 2026-05-16, operator-reviewed)

D17's seven-phase shape is operator-locked; the slicing analysis does NOT
re-derive it. It characterizes the shape, locks the per-phase verification
regime + context budget (columns above), and resolves the one structural
risk.

**Technique:** probe + walking-skeleton, then vertical-slice-per-engine -- the
blessed "horizontal foundation then vertical delivery" mixed pattern.
Phase 0 = a tracer-bullet probe through the highest unknown (MVDSV-cvar
sizing) before the expensive MVDSV phase commits. Phase 1 = a walking
skeleton for the describe-fill machinery. Phases 2-3 (KTX) and 4 (MVDSV) =
vertical slices per engine. Phases 5-6 = cross-cutting projection / deferrable
export.

**Why no verification-regime collision:** every fill phase verifies by
DB-state coverage count (vs the probe-0 N/M denominators), NOT by "the
downstream projection renders it." The consumer projection is deliberately
Phase 5. That separation is what makes each fill-phase boundary
self-contained -- no phase's verification needs a later phase to exist.

**The one resolved risk -- D19:** Phase 1 is a pure build-once foundation
with no consumer surface, which is a pass-through / verification-regime-
collision risk under arc-planner's own rules. Resolved WITHIN the locked D17
shape (not a reshape) by the Phase 1 walking-skeleton smoke probe: the full
pipeline runs end-to-end against one real simple KTX cvar (operator-ruled
2026-05-16). See `decisions.md` D19. Phase 2/3 handle that one cvar
idempotently (C4) and count it once.

**Honest uncertainty:** Phase 4's context budget (200-400k) is genuinely
unknowable until Phase 0's ezquake.com shape-quant lands -- a rich result
(toward 124/183) makes Phase 4 mechanical-heavy and lighter; a thin result
(toward the verified 34% floor) makes it synthesis-heavy and closer to
Phase 3's weight. Default to subagent-heavy execution to hold the lower
bound; re-project at the end of Phase 0.

**Phase 0 reshaped (2026-05-17, operator decision -- post-lock amendment):**
the C3 detection oracle is self-built and reproducible (fetch dev-head clones
forward, build mvdsv+ktx, local-server dump, re-extract L1 from the same
build) instead of diffing a frozen third-party capture. This DISSOLVES F-C3a
(contemporaneity is structural, not a risk), grows Phase 0's budget to
~200-350k (two engine builds + a server harness + re-extract), and
re-baselines the probe-0 denominators from fresher source (correct by C1).
Phase 0 still does not gate the KTX side and stays first + independent of
Phase 1. Authority: spec C3 amendment 2026-05-17 + `decisions.md` C3
amendment. KTX and MVDSV are BOTH C / CMake (not QuakeC/fteqcc -- a planner
inference error corrected 2026-05-17, OQ-3); the only missing build tool is
`cmake` (apt-installable, Task-0-shaped -- see `prerequisites.md`).
Documented fallback keeps the arc unblocked if `cmake` cannot be obtained
in-loop or the server harness is intractable.

**Execution-mode posture:** near-zero inline (this is a code-synthesis arc --
extractors, the D6 skill, serializers, schema, probes). Subagent-default
throughout. The D6 synthesis pass and the D7 independent review pass are
**Opus 4.7 MAX -- spec-locked (D7), not a planner dial.** The
phase-template's >70%-inline guard + the verification sub-agent brief defend
against the qw-oracle Arc 1 inline-execution defect.

**Draft order:** Phase 0 and Phase 1 are independent (Phase 1's spine is
engine-agnostic; Phase 0 sizes Phase 4, not Phase 1) -- draft them in
parallel fresh terminals first. Then 2 -> 3 -> 4 sequential; 5 after 1-4;
6 after 5. Watch phases for context budget: 1, 2, 4 (subagent-heavy
mandatory; Phase 1 likely needs a mid-phase fresh-terminal handoff at
execution time -- an orchestrator concern, flagged here).

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
