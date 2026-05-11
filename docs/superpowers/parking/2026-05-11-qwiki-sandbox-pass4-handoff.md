# QWiki sandbox -- Pass 4 handoff (wiki's unique role + SHOULD list)

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

This is the fourth arc-brainstormer entry point for the qwiki-sandbox arc. Passes 1-3 closed. Pass 4 synthesizes the wiki's *unique slot* in the ecosystem (Pass 3 produced the map; Pass 4 reads the wiki's row off it and names what only the wiki does well) and locks the SHOULD list (kinds of content the wiki should host, with rationale).

Still arc-planning, not implementation. Don't spin up MW yet.

---

## Where things are

**Plan shape (post-double-pivot, conceptual-first):**
- Pass 1 -- generic wiki frame -- COMPLETE
- Pass 2 -- current QWiki audit -- COMPLETE
- Pass 3 -- ecosystem map -- COMPLETE 2026-05-11
- **Pass 4 -- wiki's unique role + SHOULD list -- THIS SESSION**
- Pass 5 -- contributor model + freedom-vs-structure -- pending
- Pass 6 -- content strategy: extract / new-build / abandon -- pending
- Architecture passes (namespaces / templates / Page Forms+SMW / ecosystem-integration / discoverability+UX / cutover+deployment) -- downstream of Pass 6.

**Active drain destination:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`. Pass 4 drains into the existing "Pass 4 -- wiki's unique role + SHOULD list -- pending" section (replace `pending` with `LOCKED` and fill).

---

## What's locked from Passes 1-3 (don't relitigate)

**Generic wiki form (Pass 1):**
- Wiki form's irreducible offering: prose + crosslinks + edit-in-place + page-as-current-canonical, *under live multi-author maintenance.*
- Failure modes: activation collapse, scope drift, quality-floor collapse, structural mismatch with DB-shaped data.
- Operating points: account-gated low-barrier signup (no admin gating); structured-with-narrative-slots default; schema/topic freedom deliberately constrained.

**Current QWiki state (Pass 2):**
- 2-4 active editors, NOT 30 organic. Design for thin-but-active.
- Author-once-harvest-many: wiki is upstream of oracle / hub / AI services.
- KTX modes (27 modes, 15 pages, half-bad) is the flagship "author at wiki" case.

**Ecosystem map (Pass 3):**
- **Federation-with-peers shape.** quake.world is an umbrella hosting wiki / hub / assets (+ maps alias) / servers / tools / tournaments / frontpage. Oracle + xantom's parsers + Discord + (deprioritized) forum are peers.
- **Three-category wiki role model:**
  - Category 1 (fully cede long-term) -- clans / players / tournaments / maps + per-asset. Wiki transitional only where it serves dual purpose. Maps + per-asset skip wiki entirely (direct Layer 3 .md).
  - Category 2 (wiki permanent) -- modes / mechanics / distributions / history / cross-cutting narrative / lore / columns / tutorials.
  - Category 3 (no knowledge ownership) -- functional surfaces only.
- **Routing principle:** author at the layer with long-term ownership.
- **Track C (Oracle primer) elevated to design pillar.** Wiki content engineered for embedding harvest. Layer 3 (wiki-fed) is load-bearing for Oracle; Layer 2 is "experimental spice."
- **(C-prime) loose-coupling + lighter-touch** wiki <-> quake.world: v1 link-only no sync; schema-bones designed sync-shaped for future opt-in; density-over-coverage.
- **Schema enforces no Map / per-Asset / News / per-Season-Historical-Tournament page-types.**
- Old wiki becomes read-only archive; URL preservation locked; ciscon's tarpit preserved.

**The full Pass 3 mapping table + 17 gaps + carry-forwards live in the vision spec's Pass 3 section.** That is the input Pass 4 reads off.

---

## Pass 4 scope -- wiki's unique role + SHOULD list

**Plain English:** Pass 3 mapped the ecosystem and locked which kinds the wiki owns (transitional + permanent). Pass 4 articulates the *pitch* -- what the wiki uniquely does in this federation, in language that explains the value to (a) the operator's own clarity, (b) stakeholder messaging to old-wiki contributors, (c) potential new contributors, (d) Pass 5+6's planning. Then locks the SHOULD list with rationale per entry: priority, depth, sketch of the page-type shape.

**Pass 3 already provided the SHOULD list *seeds* in the carry-forwards section.** Pass 4's job is not enumerating from scratch -- it's curating, prioritizing, and shaping.

**Candidate sub-questions** (operator can reorder/merge):
- 4.1 -- **The unique-role pitch.** What does the new wiki do that nothing else in the federation does, in one paragraph + supporting bullets. Differentiates against: hub (DB-shaped match data), assets (rich asset/map viewers + history sections), tournaments (structured tournament management), Oracle (LLM-readable synthesis), Discord (temporal chatter), forum (deprioritized). Articulate it positively, not as residue.
- 4.2 -- **SHOULD list curation.** Take the Pass 3 seed list (10 inside-wiki gaps + Category 2 domains), apply priority (v1 / v1.5 / later), depth (skeleton / substantial / flagship), and confirm cuts (e.g., demo analysis writeups was deferred for Pass 4 to decide).
- 4.3 -- **Page-type shape** for each SHOULD list entry. Structured-bones-plus-narrative-slots from Pass 1 applied per page-type: what are the bones, where do narrative slots live. NOT full template field lists (that's architecture pass territory) -- just shape.
- 4.4 -- **Track C (Oracle primer) explicit design pillar.** How wiki content is engineered for embedding harvest: chunking-friendly structure, dense context per page, cross-references that resolve to Layer 1 / Layer 3 entities. NOT pipeline mechanics (that's a future arc); just authoring discipline that makes harvest tractable.
- 4.5 -- **Cut list / explicit non-goals.** What the new wiki DOES NOT do, named explicitly. Pass 3 listed most (no Map page-type, no News, no per-season-historical-tournament, no public-web onboarding flow, no per-clan-customizable theming, etc.). Pass 4 consolidates into a clean "non-goals" section.
- 4.6 -- **Stakeholder-pitch framing.** Carry-forward from Pass 3 (narrow-scope vs old-wiki contributors). One-paragraph pitch usable in cutover communication.

Output: Pass 4 section in vision spec; feeds Pass 5 (contributor model on-ramps people to the SHOULD list) and Pass 6 (content strategy decides how each SHOULD entry gets filled).

---

## Reads required (priority order)

1. **This file (handoff).**
2. **`docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`** -- Pass 3 section is the load-bearing input. Mandatory.
3. **`apps/qw-oracle/curated/concept-notes/CLAUDE.md`** -- Layer 3 authoring template; informs Track C / 4.4 discipline.
4. **`apps/qw-oracle/VISION.md`** -- if Track C framing needs re-grounding.
5. **`docs/research/2026-05-09-qwiki-content-analysis.md`** -- old QWiki content distribution, useful for SHOULD-list cuts.
6. **Memory: `project_qwiki_sandbox_passes.md`** -- pass tracker.

If short on time: 1, 2, 3 are mandatory.

---

## Critical rules (carry-forward + new)

- **The plan is conceptual-first.** If Pass 4 starts naming template field lists / specific MW extensions / Page Forms field types, you've drifted into architecture territory. Refocus on shape: what the wiki should HOLD, not how it gets stored. Architecture passes are downstream.
- **Three-category framing from Pass 3 is locked.** Don't reopen Category 1 vs Category 2 boundaries -- accept the routing and curate within it.
- **Routing principle is locked: author at the layer with long-term ownership.** Maps + per-asset narrative skip the wiki entirely. Don't try to add them back to SHOULD.
- **(C-prime) loose-coupling is locked.** No bidirectional sync in v1; structured fields in transitional pages designed sync-shaped for future opt-in. Don't propose architecture that depends on sync.
- **Track C (Oracle primer) is a design pillar, not a side note.** SHOULD list entries should articulate Track C value where applicable. Layer 3 (wiki-fed) is load-bearing for Oracle.
- **Schema enforces page-type constraints.** Wiki has no Map / per-Asset / News / per-Season-Historical-Tournament page-types. SHOULD list cannot include them.
- **Light-touch + density-over-coverage** is the operating mode. Hall-of-Fame consolidation. Content-rich pages only. Abandon stubs aggressively. SHOULD list entries respect 2-4-active-editor sustainability.
- **Operator preferences:** momentum over ceremony / plain English at decision points / one question at a time / decisive recommendations / no subagents for mechanical edits / ASCII-only in code and shared docs / commit early.

---

## First three actions

1. **Read this handoff (you're reading it).**
2. **Read the vision spec's Pass 3 section** in full -- that's the load-bearing input.
3. **Invoke arc-brainstormer.** Confirm the candidate Pass 4 sub-question list above with the operator (or refine), then start 4.1 (unique-role pitch) one question at a time.

---

## When in doubt

- **Tempted to write template field lists / specific MW extensions** -> halt. Architecture territory.
- **Tempted to reopen the Category 1 / Category 2 cede decisions** -> don't. Locked in Pass 3.
- **Tempted to add Map / per-Asset / News page-types to SHOULD** -> don't. Schema forbids; Pass 3 locked the cede.
- **Tempted to fully spec Hub V2 / quake.world / xantom's parsers** -> don't. They're peers, not subjects of this arc. Pass 3 settled their scope intent.
- **Tempted to start a "Pass 4 minutes" doc** -> not needed. Drain into the vision spec's Pass 4 section directly.
- **Tempted to over-promote the demo-analysis gap (#9)** -> Pass 4 decides cut or keep. If kept, "later" tier with rationale. If cut, document the cut in the explicit non-goals (4.5).

---

## Tooling state at handoff

- **mariadb container `qwiki-analysis`** still running with imported QWiki dump. Useful if Pass 4 needs ad-hoc queries (probably not -- Pass 4 is synthesis, not data analysis). Operator can kill with `docker rm -f qwiki-analysis` when fully done with brainstorm.
- **Image tarball** at `apps/qwiki-sandbox/dumps/wiki-images.tar.gz` (6.4G), unextracted.
- **No fresh MW stack running yet.** Architecture passes downstream will kick that off.

---

## Context budget projection

Pass 4 alone: ~25-40k. Lighter than Pass 3 because Pass 3 produced the structural framing; Pass 4 is curation + articulation on top. Single-session aim: complete Pass 4, drain to vision spec, commit, fresh-terminal for Pass 5.
