# qwiki-v1-beta -- arc plan

**Spec:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 LOCKED, complete 2026-05-12)

**Brainstorm handoff:** `docs/superpowers/parking/2026-05-12-qwiki-sandbox-planner-handoff.md`

**Goal:** Stand up a fresh **MediaWiki 1.43 LTS** substrate on Unraid at `wiki-beta.quake.world` (three-container stack: nginx 1.30-alpine + mediawiki:1.43-fpm + mariadb:11.4 + Citizen v3.16.0; per `decisions.md` D2 + Amendment #1 + #2) with auth + groups + quality tags + Layer 3 harvest path observable end-to-end (baseline phases), then deliver the Modes domain as a vertical-slice proof (27 mode pages authored, with the Layer 3 harvest path exercised against real content and the harvested concept-note queryable via oracle MCP).

**Status:** Substrate cluster (Phases 1-4) drafted. Phases 1-2 approved 2026-05-13; Phases 3-4 awaiting review (will be approved per-phase as substrate ships). Phase 1 ready for implementation via arc-orchestrator. Phases 5-8 (Modes vertical slice) deferred until substrate ships (operator decision 2026-05-13; rationale: redraft risk from substrate implementation surprises, especially Phase 3 Discord OAuth).

---

## Where we are right now

- **Stage:** Phases 1-4 drafted; Phases 1-2 approved; Phases 3-4 awaiting per-phase approval as substrate ships.
- **Last action:** 2026-05-13 -- Phase 4 draft landed (664 lines); light-review of Phases 1-4 GREEN; cross-phase coherence verified.
- **Next action:** Open fresh terminal in `/home/paradoks/projects/quakeworld/`, type `@docs/superpowers/parking/2026-05-13-qwiki-v1-beta-orchestrator-handoff.md` as first message. Arc-orchestrator drives Phase 1 executor dispatch from there.

Update these three lines whenever a phase boundary changes state. They are the source of truth for "where am I" when picking the arc back up cold.

---

## Read in this order

If you're new to this arc, read top-to-bottom:

1. **[`prerequisites.md`](prerequisites.md)** -- operator-side one-shot setup (Unraid + Cloudflare + Discord OAuth registration). Do this before kicking off any phase.
2. **[`decisions.md`](decisions.md)** -- 26 locked cross-cutting decisions + explicit non-goals. Every phase respects these. If a decision is wrong, change it here first; don't drift in a phase MD.
3. **[`review-findings.md`](review-findings.md)** -- F-finding ledger; empty at scaffold time, populates during phase-MD drafting.
4. **[`phase-template.md`](phase-template.md)** -- mandatory shape for each phase MD.
5. **Per-phase MDs** (drafted in order; see "Phase index" below).

If you're the fresh terminal that's about to draft a phase, also read:

6. **`phase-N-drafter-prompt.md`** for the phase you're drafting -- pre-substituted, self-contained instruction.

7. **[`handoff-prompt.md`](handoff-prompt.md)** -- generic template the per-phase prompts are generated from. Useful as reference, not directly used by drafters.

---

## Phase index

8 phases: 4 horizontal substrate + 4 vertical Modes. Pattern: horizontal foundation then vertical end-to-end (same shape as qw-oracle Arc 1's Phases 1-5 + 6-8 split).

| # | Status | Shape | Drafter prompt | MD (drafted) | Deliverable | Runnable state at end |
|---|---|---|---|---|---|---|
| 1 | approved | substrate | [phase-1-drafter-prompt.md](phase-1-drafter-prompt.md) | [phase-1-mw-core.md](phase-1-mw-core.md) | nginx 1.30-alpine + `mediawiki:1.43-fpm` + MariaDB 11.4 LTS + Citizen v3.16.0 on Unraid + Cloudflare Tunnel + `wiki-beta.quake.world` | URL returns HTTP 200; Citizen skin loads; anon edit blocked |
| 2 | approved | substrate | [phase-2-drafter-prompt.md](phase-2-drafter-prompt.md) | [phase-2-extensions.md](phase-2-extensions.md) | Page Forms + Semantic MediaWiki installed | Special:Version shows extensions; smwadmin clean; test form renders |
| 3 | drafted (awaiting review) | substrate | [phase-3-drafter-prompt.md](phase-3-drafter-prompt.md) | [phase-3-auth-groups.md](phase-3-auth-groups.md) | PluggableAuth + Discord OAuth + `wiki-contributor` / `wiki-curator` + namespace restrictions | Discord login flow works; contributor lands in right group; namespace gates enforce |
| 4 | drafted (awaiting review) | substrate | [phase-4-drafter-prompt.md](phase-4-drafter-prompt.md) | [phase-4-discipline-harvest.md](phase-4-discipline-harvest.md) | Quality-tag categories + URL slug authoring rule + Layer 3 harvest path verified against test page | Three categories exist; test-page harvest -> oracle MCP returns harvested chunk |
| 5 | not started | Modes | [phase-5-drafter-prompt.md](phase-5-drafter-prompt.md) | tbd (`phase-5-mode-page-type.md`) | Mode form + template + Modes Layer B category + Track C help-text | Form:Mode renders; test mode page submits with bones+slots; Category:Modes lists it |
| 6 | not started | Modes | [phase-6-drafter-prompt.md](phase-6-drafter-prompt.md) | tbd (`phase-6-modes-curator.md`) | Modes curator tool at `apps/qwiki-sandbox/scripts/curate-modes/` + smoke triage 3-5 modes | Tool launches; inventory loads; smoke triage pauseable+resumable proven |
| 7 | not started | Modes | [phase-7-drafter-prompt.md](phase-7-drafter-prompt.md) | tbd (`phase-7-triage-author.md`) | Complete 27-mode triage + flagship modes substantial + non-flagship per disposition | 27 dispositions recorded; flagship-substantial threshold met; skeletons exist for new-build modes |
| 8 | not started | Modes | [phase-8-drafter-prompt.md](phase-8-drafter-prompt.md) | tbd (`phase-8-harvest-verification.md`) | Harvest flagship modes -> oracle Layer 3 + MCP query verification | N concept-notes loaded; MCP `search_concepts` returns harvested mode content with strong match_quality |

Status progression per phase: `not started` -> `drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`.

---

## Reading the design substrate

The visual companion HTML at `docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html` (v3 2026-05-12) is the design substrate for ongoing iteration. It shows:

- Layer A: 6-tile main page nav with locked tile names (D7).
- Layer B example: Modes category page with sub-mode listing.
- Layer C example: Hoonymode mode page with bones+slots tagged (D8 + D9 + D10).

The companion is updated in place as design iterations land. Architecture-pass settles styling specifics during the substrate phases.

---

## What this arc deliberately does NOT cover

Per `decisions.md` non-goals section (full list there):

- **Content not in scope:** player stubs (5,000+ pages, dropped wholesale), long-tail stubs outside Modes.
- **Domains not in scope (each is its own future arc):** Game Content, Distributions, The Scene, Tutorials, Community & Lore.
- **Infrastructure not in scope:** custom backup scaffolding (inherited), generic per-domain-tool framework (Modes curator is de-facto), Visual Editor (defer post-baseline), AI-agent steering (`llms.txt` / bot tarpit), pipeline-mechanics tooling.
- **Federation not in scope:** bidirectional sync, the 5 schema-enforced page-type exclusions (per-Map / per-Asset / News / per-Season-Historical / per-Match).
- **Cutover not in scope:** cutover from `wiki-beta.quake.world` to old-wiki URL, bps cutover negotiation, image-tarball mass migration, subsequent domain priority order.

If a phase drifts into any of these, that's scope creep -- flag it.

---

## Operator quick-reference

- **Kicking off a fresh phase-drafting session:** open a new terminal, type `@docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-N-drafter-prompt.md` (substitute N for the phase you want drafted). The file is the first message; the model treats its content as your instruction directly. No BEGIN/END markers; no copy-paste shim.

- **Reviewing a drafted phase:** read the phase MD top-to-bottom, run the verification probes listed at the bottom, eyeball the file lists and config snippets, sign off. Update status in this README's Phase index.

- **A finding resolves but conflicts with a decision:** decisions.md wins. Reject the finding with a one-line rationale in the phase MD's "Open questions" section. If the decision itself is wrong, amend `decisions.md` (dated amendment block) before re-running the phase draft.

- **A new finding emerges during phase drafting:** append to `review-findings.md` with a sequential F-number, severity, and which phase resolves it.

- **A phase needs to deviate from a locked decision:** add a "Deviation" section at the top of that phase MD and stop for operator review. Do not silently override.

---

## How this differs from qw-oracle Arc 1

This scaffold mirrors qw-oracle Arc 1's six-artifact shape (decisions / findings / prereqs / template / handoff / README) with three deliberate changes:

1. **Per-phase prompts use file-as-prompt shape** -- no BEGIN/END markers, no copy-paste wrapper. Operator types `@<filepath>` in fresh terminal. (qw-oracle Arc 1 used BEGIN/END markers; this arc adopts the newer file-as-prompt convention.)
2. **Tasks declare Execution mode** (D26) -- each task in a phase MD picks subagent (at named model+effort) or inline with rationale. Closes the inline-execution defect from qw-oracle Arc 1.
3. **Strong arc identification at top of every per-phase prompt** -- sibling-arc tell-tales listed so a misdirected drafter self-detects.

Otherwise the section structure, drafter+sub-agent verification flow, and operator-review-at-phase-boundary rhythm match qw-oracle Arc 1.
