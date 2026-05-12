# qwiki-v1-beta -- arc plan

**Spec:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 LOCKED, complete 2026-05-12)

**Brainstorm handoff:** `docs/superpowers/parking/2026-05-12-qwiki-sandbox-planner-handoff.md`

**Goal:** Stand up a fresh MediaWiki 1.39 LTS substrate on Unraid at `wiki-beta.quake.world` with auth + groups + quality tags + Layer 3 harvest path observable end-to-end (baseline phases), then deliver the Modes domain as a vertical-slice proof (27 mode pages authored, with the Layer 3 harvest path exercised against real content and the harvested concept-note queryable via oracle MCP).

**Status:** Planning. Slicing analysis pending. Per-phase MDs land in commit order after operator review at each phase boundary.

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

**Slicing analysis pending.** The phase index lands here after operator + arc-planner walk slicing options (verification-regime rule + context-budget projection + LLM-default vertical bias). Expected shape: ~4 horizontal substrate phases + ~4-5 vertical Modes phases.

| Phase | Status | MD | Deliverable | Runnable state at end |
|---|---|---|---|---|
| 1 | not started | tbd (phase-1-*.md) | tbd | tbd |
| 2 | not started | tbd | tbd | tbd |
| 3 | not started | tbd | tbd | tbd |
| 4 | not started | tbd | tbd | tbd |
| ... | ... | ... | ... | ... |

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
