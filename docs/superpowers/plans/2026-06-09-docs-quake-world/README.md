# docs.quake.world -- L1 reference site (Arc plan)

**Spec:** `docs/superpowers/specs/2026-06-09-docs-quake-world-design.md`
**Roadmap (locked architecture):** `docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md`
**Precursor (shipped 2026-06-09):** `docs/superpowers/plans/2026-06-09-docs-l1-enrichment/` -- L1 is docs-ready for 6 codebases.

**Goal:** Build the human-browsable, per-codebase Layer 1 reference for the QuakeWorld ecosystem -- every tunable knob (cvars, commands, macros, cmdline params, info keys, ...) auto-projected from the QW Oracle's L1 corpus, across 6 codebases (ezQuake / KTX / MVDSV / QTV / QWFWD / QWCL), as filterable per-type lists with inline entity cards, player-facing type words, source links, ezQuake version-walk, and cross-links to the L3 guides portal on docs.quake.world (a later docs-web surface; the wiki narrows to social/strategy -- see decisions.md amendment 2026-06-09). VitePress + Tailwind v4 / daisyUI on Cloudflare Pages.

**Status:** In execution. Scaffold built; **slicing LOCKED (6 phases, operator-approved 2026-06-09).** Phase 1 SHIPPED (`0979d4ad`; 20 files / 5016 records; all 3 probes green incl. the slipgate-parity hard gate, independently re-verified; type-scope + git-tracking signed off 2026-06-09). Phase 2a DRAFTED + orchestrator-reviewed 2026-06-10 (all recon claims re-verified against live data; D18 implication amended; SHIPPED 2026-06-10 as commit `945a3292`; all six boundary checks independently re-verified by the orchestrator; F9-F12 ratified into review-findings). Phase 2b SHIPPED 2026-06-10 (the D14/D15 generic renderer, proven on ezQuake; boundary independently re-verified -- 23/23 unit tests incl. the boolean-with-values->toggle rule, tsc/build clean, D14/D15/F10 grep gates green). Phase 3 SHIPPED 2026-06-10 (`2b4c76a6`..`6dffd58c`): cold boundary verification found the 5-codebase fan-out was ALREADY structurally shipped by 2b's codebase-generic loaders (the build emits all 28 routes with correct graceful degradation -- the D14 payoff, F13), so Phase 3 reduced to a verification gate + a thin display-name/ASCII polish pass (operator-approved "verify + light polish" 2026-06-10). Graceful degradation operator-confirmed across all 6 codebases in the live floor-check, which also surfaced + fixed two scaffold-era daisyUI/VitePress theme collisions (nav `.menu`, card `.vp-doc h2` -- F14); boundary independently re-verified by the orchestrator (23/23 tests, build clean + 28 routes, D14/D15/&mdash; greps empty, D20 isolated, sibling-L3-arc no collision). **F14 logs an OPEN pre-deploy visual-polish pass the orchestrator slots before Phase 5 -- EXPANDED 2026-06-10 to FIVE items after the Phase-4 floor-check: (1) F17 cvar-link auto-expand, (2) F18 entity site-search + likely D9 amendment, (3) trim daisyUI include, (4) resolve D10 "adopt vikpe's theme", (5) density/spacing.** Phase 4 SHIPPED + pushed (cross-links live-verified in the operator floor-check 2026-06-10); Phase 5 not yet drafted. Per-phase MDs are drafted by fresh terminals following `handoff-prompt.md` (or orchestrator-authored from cold verification when a phase reduces to verify+polish), verified at each boundary, operator-reviewed.

---

## Status (W11, added 2026-08-11 at the chunk-6 HANDOVER migration)

- **Outcome:** Not yet shipped to production. L1 reference site built + preview-deployed at `https://quakeworld-docs.pages.dev/`; Phase 5 (Cloudflare Pages + vikpe DNS) is the only remaining phase.
- **Phase:** Phase 5 (deploy) -- not started. Phases 1, 2a, 2b, 3, 4, and the F14 pre-deploy pass all shipped (last: F14 shipped 2026-06-11).
- **Next authorized action:** Show vikpe the preview link for DNS greenlight; resume handoff at `docs/superpowers/parking/2026-06-11-docs-quake-world-orchestrator-resume-phase5.md` (confirmed present on disk; `phase-5-deploy.md` itself not yet drafted).
- **Lane:** Main checkout (`/home/dev/projects/quakeworld`, branch `main`). No worktree noted.
- **Last verification:** 2026-06-11 (F14 shipped + operator floor-check; visual-confirm noted pending in the README's own Phase-index row).
- **Effects crossed:** none stated in scaffold text beyond its own precursor arc (`docs/superpowers/plans/2026-06-09-docs-l1-enrichment/`).
- **Decisions:** `decisions.md` -- D1-D11 (product) + D12-D21 (build/execution).
- **Open findings:** `review-findings.md` -- known hazards (slipgate-parity gate, shape-freeze timing, category-version inversion).
- **In-flight:** none.
- **Pause:** Paused, waiting on vikpe DNS greenlight (external gate) -- per HANDOVER's own row for this arc.

## Read in this order

1. **[`prerequisites.md`](prerequisites.md)** -- operator-side Task 0. Short for this arc (most setup is loop-doable). Do the local-dev items before Phase 1; the slipgate-parity baseline matters.
2. **[`decisions.md`](decisions.md)** -- D1-D11 (product, verbatim from spec) + D12-D21 (build/execution, arc-planner). Every phase respects these. If a decision is wrong, amend it here first; don't drift in a phase MD.
3. **[`review-findings.md`](review-findings.md)** -- known hazards found while reading the live producer (slipgate-parity gate, shape-freeze timing, category-version inversion). The checklist when drafting phases.
4. **[`phase-template.md`](phase-template.md)** -- mandatory shape for each phase MD (note the required Execution-mode column).
5. **Per-phase MDs** (drafted in order; see "Phase index").

If you are the fresh terminal about to draft a phase, also read **[`handoff-prompt.md`](handoff-prompt.md)**.

---

## Phase index (slicing LOCKED -- operator-approved 2026-06-09)

This refines the spec's suggested 5-phase breakdown (spec section 12). The one change: **Phase 2 is split** into 2a (scaffold + design system) and 2b (ezQuake template / generic renderer), because the scaffold-boots state and the ezQuake-renders state are independently-runnable commits and keeping them together projects into the context smell zone. See the slicing analysis (delivered with this scaffold) for the rationale and budget projections.

| Phase | Status | MD | Deliverable | Runnable state at end |
|---|---|---|---|---|
| 1 | shipped (`0979d4ad`) | `phase-1-l1-export.md` | Extend build-snapshot (in-file docs section): uniform docs JSON for all 6 codebases + 3 probes (slipgate-parity, uniform-shape, category-coverage) | DONE: 20 files / 5016 records in `apps/docs-web/data/`; all probes green; slipgate's consumed files provably untouched (additive-only diff) |
| 2a | shipped (`945a3292`) | `phase-2a-scaffold.md` | VitePress scaffold in `apps/docs-web` (pnpm + Tailwind v4 + daisyUI tokens); data-loading module skeleton; routing | dev server boots and serves a landing page with daisyUI tokens applied |
| 2b | shipped (`a160688a`..`f2f167b7`) | `phase-2b-ezquake-template.md` | Type-generic browse + card components; friendly-type module; category Flat/Grouped toggle; source links; ezQuake version-walk; stable per-entity anchors (D22) -- all proven on ezQuake | ezQuake browse views render end-to-end: filter, group, inline-expand cards |
| 3 | shipped (`2b4c76a6`..`6dffd58c`) | `phase-3-fanout.md` | VERIFY graceful degradation across the 5 non-ezQuake codebases (already render via 2b's generic `listSnapshots()` loaders -- F13) + thin display-name/ASCII polish. Zero new component code (D14 held) | DONE: all 6 codebases browse-able, graceful degradation operator-confirmed across all 6; headings + root grid read the nav casing; 2 scaffold-era theme collisions fixed (F14); boundary independently re-verified (tsc/test 23-23/build/28 routes, D14/D15/&mdash; greps empty, D20 isolated) |
| 4 | shipped (`d1940492`..`236326c3`, pushed) + floor-check PASSED | `phase-4-crosslinks.md` | cvar->cvar build-time auto-link (within-codebase); source links for the 5 non-ezQuake codebases (F6: qtv/qwfwd omit -> plain text; ktx/mvdsv/qwcl SHA URLs); entity->guide reverse-index BUILT + tested but render-SUPPRESSED in v1 via `GUIDES_PORTAL_LIVE=false` (D7 no-dead-links by construction) | DONE. Orch boundary-verified cold (re-run 2026-06-10 in a 2nd session): tsc 0 / 40-40 tests / build 0 / 28 routes; D7 .html-scoped gate empty; F15 source-link fix HTTP-200 (ktx/mvdsv/qwcl); qtv plain-text path code-verified. Operator live floor-check PASSED 2026-06-10 (cvar-link renders + scrolls + ezQuake source link confirmed on the r_tracker card). The floor-check ALSO surfaced F17 (cvar-link scrolls to a *collapsed* row, no auto-expand) + F18 (site-search indexes only the home page, ~5000 entities unreachable) -- both folded into the F14 pre-deploy pass (operator-approved 2026-06-10), now a 5-item punch-list. F14 still owed before Phase 5 |
| F14 (pre-deploy) | shipped 2026-06-11 (F17 / F18 / daisyUI-trim / D10-closed / density + F22 fix + F23 Ctrl+K-disable `d105b9bf`); operator visual-confirm pending -> then Phase 5 | `phase-f14-predeploy.md` | Pre-deploy UX + visual pass: F18 global entity search (MiniSearch over the docs JSON), F17 cvar-link auto-expand+highlight, daisyUI include trim, density/spacing polish. D10 CLOSED (no theme swap -- theme already = vikpe's). Presentation-only (D15) | all 6 codebases searchable site-wide; cvar-link click lands on the expanded card; nav stays horizontal; build 0 + operator floor-check |
| 5 | not started | `phase-5-deploy.md` | Cloudflare Pages config + build + deploy; vikpe DNS | `docs.quake.world` live (operator-run smoke) |

Status flow per phase: `not started` -> `drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`.

---

## Slicing shape (one-liner)

Horizontal foundation (Phase 1: export) -> scaffold (2a) -> **tracer bullet through ezQuake end-to-end** (2b) -> horizontal fan-out (Phase 3) -> enhancement layer (Phase 4) -> deploy (Phase 5). This is the canonical "horizontal-first-then-vertical" mixed pattern: Phase 1 has a self-contained verification regime (JSON well-formed + slipgate unbroken, no dependency on later phases), and the end-user-visible vertical (2b) comes immediately after the foundation. Deploy is last because the CF-Pages + vikpe-DNS path is low-risk and well-trodden (scheduler.quake.world precedent), not a high-unknown that needs Hello-Production de-risking up front.

---

## What this arc deliberately does NOT cover

Per `decisions.md` D21:

- **FTE** -- active project, no usable categories yet; lands as a later add (the architecture degrades to a flat list for it, no rework).
- **Concept-note / L3-guide authoring** -- separate arc (`2026-06-09-demand-driven-l3-concept-authoring`); docs only cross-links to it. The L3 guides render ON docs.quake.world (a later surface), not the wiki; the wiki narrows to social/strategy. See decisions.md amendment 2026-06-09.
- **The guides-portal render surface** -- the L3-rendered guides on docs.quake.world are a LATER docs-web surface (downstream of the concept-notes arc), NOT v1. v1 ships the L1 reference + the dormant entity->guide reverse-index only (decisions.md D1/D21 amendment 2026-06-09).
- **Cross-engine browsing** (compare a cvar across forks) -- deferred.
- **Faceted search** -- VitePress local search only for v1.
- **Min/max ranges** -- L1 bounds columns are empty; not declaratively extractable; a later backfill.
- **Category-granularity curation** (splitting oversized groups; categorizing the ~128 uncategorized ezQuake commands -- they are ~all HUD, belong in the existing `hud` group, see review-findings F7) -- later refinement (an L1 enrichment, recommended pre-launch).
- **Automated deploy** -- manual for v1; automate-on-extract later.
- **Community-data integration** -- future, after community-platform sections land.

If a phase drifts into one of these, that is scope creep -- flag it.

---

## Operator quick-reference

- **Kicking off a phase draft:** open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, type `@docs/superpowers/plans/2026-06-09-docs-quake-world/phase-<N>-drafter-prompt.md` (file-as-prompt; the per-phase prompts are written after the slicing lock).
- **Reviewing a drafted phase:** read the phase MD top-to-bottom, run the phase-boundary verification commands, eyeball the file lists + execution-mode annotations, sign off.
- **A finding conflicts with a decision:** the decision wins; reject the finding with a one-line rationale in the phase's "Open questions." If the decision itself is wrong, amend `decisions.md` (dated block) before re-drafting.
- **A new hazard emerges during drafting:** append to `review-findings.md` with the next F-number and a phase owner.

---

## Why per-phase MDs (not one monolith)

Two reasons, same as qw-oracle Arc 1: (1) context-window discipline -- a monolithic plan crowds the executor's working memory; per-phase MDs leave room for live source reads + sub-agent verification; (2) verification at boundaries -- each phase gets a dedicated sub-agent pass + operator review before the next starts, catching drift (a shape regression that breaks slipgate; a logic-in-component violation) mechanically instead of three phases later.
