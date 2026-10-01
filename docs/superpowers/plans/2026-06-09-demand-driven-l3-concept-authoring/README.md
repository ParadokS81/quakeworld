# demand-driven L3 player-help concept authoring (Arc plan)

**Parking / shaping:** `docs/superpowers/parking/2026-06-09-demand-driven-l3-concept-authoring.md` (validated context, taxonomy, ranking, the hypothesis-test result) + `…-plan-handoff.md`.
**Demand map:** `docs/superpowers/parking/2026-06-09-helpdesk-faq-landscape.md` (48 clusters).
**Cross-arc contract:** `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md` (guides=L3 rendered on docs.quake.world; reference=L1 per-codebase; wiki=social). **Every note-authoring phase reads this.**

**Goal:** Author the bounded, demand-ranked set of ~16-17 **player-help** Layer 3 concept notes that turn the #helpdesk demand into precomputed, fact-checked "gold on a platter" -- so one `search_concepts` retrieval answers the majority of a domain's questions instead of the LLM digging through raw L2 chat. Claude drafts each note from source truth (complete L1 descriptions + live codebase + L2 demand threads); each note is gated by the generalized hypothesis-test harness (moves its domain's threads dig/PARTIAL -> platter/NAILED, zero confabulation) AND by operator prose review. The 3 existing notes are the template; weapon-scripts already passed the gate's manual precursor.

**Status:** Planning. Scaffold built; **slicing LOCKED (4 phases, operator-approved 2026-06-09).** Phase MDs not yet drafted. Each phase MD is drafted by a fresh terminal following its `phase-<N>-drafter-prompt.md`, sub-agent-verified, operator-reviewed at the boundary.

---

## Status (W11, added 2026-08-11 at the chunk-6 HANDOVER migration)

- **Outcome:** Not shipped; arc in progress. 3 of the planned ~16-17 notes shipped (hud-configuration / network-connection / match-recording-playback) per the 2026-06-16 resume handoff; the Phase index below has not been updated to reflect this (still reads Phase 1 "not started").
- **Phase:** Phase 1 (Tier-1: 7 new notes) -- 3 of 7 shipped as of 2026-06-16.
- **Next authorized action:** Author the next note -- `rl/gl` (game-object archetype, rank-1 demand) or `textures` (rank-2 demand-domain) -- per the resume handoff.
- **Lane:** Main checkout (`/home/dev/projects/quakeworld`, branch `main`). No worktree noted.
- **Last verification:** unverified at migration (2026-08-11). This README was last touched 2026-06-10 (`62d8fa5c`); the arc's own last confirmed activity is 2026-06-16 (`docs/superpowers/parking/2026-06-16-demand-driven-l3-concept-authoring-orchestrator-resume.md`, confirmed present on disk).
- **Effects crossed:** none stated in scaffold text.
- **Decisions:** `decisions.md` -- D1-D8 (product) + D9-D16 (build/execution).
- **Open findings:** `review-findings.md` -- 7 hazards (F1 harness-location correction, F2 SDK trap, F3 cross-arc conflict with docs-quake-world, F5 4-part-ref gotcha, among others).
- **In-flight:** none.
- **Pause:** Paused, waiting on operator pickup (next note: rl/gl or textures) -- per HANDOVER's own row for this arc.

## Read in this order

1. **[`prerequisites.md`](prerequisites.md)** -- operator-side Task 0 (dev DB + 3 existing notes loaded + Bun + optional Voyage key). Light.
2. **[`decisions.md`](decisions.md)** -- D1-D8 (product) + D9-D16 (build/execution). Every phase respects these. Amend here first if one is wrong; don't drift in a phase MD.
3. **[`review-findings.md`](review-findings.md)** -- 7 hazards from the live-source digests (the SDK trap F2, the cross-arc conflict F3, the harness-location correction F1, the 4-part-ref gotcha F5). The checklist when drafting phases.
4. **[`phase-template.md`](phase-template.md)** -- mandatory phase-MD shape (note the Execution-mode column + the sub-agent verification brief).
5. **[the cross-arc contract](../../../../contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md)** -- the note-structure contract the authoring phases produce to.
6. **Per-phase MDs** (drafted in order; see Phase index).

If you are the fresh terminal about to draft a phase, also read its **`phase-<N>-drafter-prompt.md`**.

---

## Phase index (slicing LOCKED -- operator-approved 2026-06-09)

| Phase | Status | MD | Deliverable | Runnable state at end |
|---|---|---|---|---|
| 0 | approved | `phase-0-machinery.md` | Anti-confab guardrail + per-domain harness runner (generalized from scratch) + forked `domain-concept-curate` skill. Runner + skill builds delegated to subagent tasks (D15). | Runner scores **weapon-scripts NAILED + zero-confab** on its domain threads; the skill produces a structurally-valid note for one dry-run domain; the guardrail rule is in place. Verified against the 3 EXISTING notes -- no Phase-1 note required. |
| 1 | not started | `phase-1-tier1-notes.md` | **Tier-1: 7 new notes** (~41% of demand) -- HUD, onboarding/install, world-rendering/brightness, textures/models, network/connection, projectile/powerup cosmetics, demo recording. Parallel drafts (Sonnet MAX), each gated + operator-reviewed. | 7 notes loaded, each gate-passed + operator prose-reviewed; ~41% of FAQ demand on a platter. |
| 2 | not started | `phase-2-tier2-notes.md` | **Tier-2: ~10 notes** -- display, mouse/input, audio, ruleset/legality, maps/locs, config-mgmt, server-browser, binds/aliases, teamplay-comms, spectating/QTV (fonts folds into HUD/console). | ~10 notes loaded, each gate-passed + reviewed; the player-help core (~16-17 total) complete. |
| 3 | **provisional (D16)** | `phase-3-caveated-trio.md` | **Decision-point, not a commitment:** the caveated trio (performance/stutter, crash, Linux) -- honest diagnostic checklists, not guaranteed fixes. In/out decided after Phase 1-2 ship. | Either 3 caveated checklist-notes, or a recorded decision to drop them. |

Status flow per phase: `not started` -> `drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`.

---

## Slicing shape (one-liner)

Horizontal **machinery** foundation (Phase 0: guardrail + runner + skill, self-verified against the 3 existing notes) -> **vertical** note-by-note delivery batched by demand tier (Phases 1-3), notes fanned out in parallel within each tier. Canonical horizontal-first-then-vertical: Phase 0 has a self-contained verification regime (it scores the EXISTING weapon-scripts note -- no dependency on later phases), and the end-user-visible vertical (real notes) comes immediately after. No regime collision: each note self-verifies through the gate.

---

## What this arc deliberately does NOT cover

Per `decisions.md` + the contract's deferred section:

- **Server-admin / hosting notes** -- different audience, cross-engine (mvdsv/ktx/qtv/qwfwd); its OWN future arc. The docs portal holds a slot.
- **The delivery surface** (Discord `!ask`, support.quake.world, slipgate chatbot) -- deferred; no MCP users yet, delivery is not the gate.
- **The docs.quake.world renderer / guides portal** -- that is the docs-quake-world arc's surface (downstream of this arc's notes), not built here.
- **Prod MCP deploy/rewire** -- dev DB has the full stack; prod is a post-arc step.
- **Structured per-method capability schema** -- prose-now; deferred to rust-client onboarding (contract).
- **The caveated trio** -- provisional (D16), not a committed deliverable yet.

If a phase drifts into one of these, that is scope creep -- flag it and stop.

---

## Operator quick-reference

- **Kicking off a phase draft:** open a fresh `claude` in `/home/paradoks/projects/quakeworld/`, type `@docs/superpowers/plans/2026-06-09-demand-driven-l3-concept-authoring/phase-<N>-drafter-prompt.md` (file-as-prompt).
- **Reviewing a drafted phase:** read the phase MD top-to-bottom, run the phase-boundary probes, eyeball file lists + execution-mode annotations, sign off.
- **A finding conflicts with a decision:** the decision wins; reject the finding with a one-line rationale in the phase's "Open questions." If the decision itself is wrong, amend `decisions.md` (dated block) before re-drafting.
- **A new hazard emerges during drafting:** append to `review-findings.md` with the next F-number and a phase owner.
- **Sibling-arc guard:** this is `2026-06-09-demand-driven-l3-concept-authoring`. The neighbor is `2026-06-09-docs-quake-world` (the L1 reference site). If a prompt mentions VitePress, build-snapshot, or per-codebase reference rendering, you are in the wrong arc.

---

## Why per-phase MDs (not one monolith)

Same as the sibling arcs: (1) context-window discipline -- a monolith crowds the executor's working memory; per-phase MDs leave room for live source reads + sub-agent verification; (2) verification at boundaries -- each phase gets a dedicated sub-agent pass + operator review before the next starts, catching drift (a confabulation slipping the gate; a note authored by-engine instead of by-domain) mechanically instead of three notes later.
