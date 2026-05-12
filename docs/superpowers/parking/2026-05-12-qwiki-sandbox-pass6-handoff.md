# QWiki sandbox -- Pass 6 handoff (content strategy: extract / new-build / abandon)

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

This is the sixth arc-brainstormer entry point for the qwiki-sandbox arc. Passes 1-5 closed. Pass 6 is the final conceptual pass before architecture passes begin. It settles content strategy: per-SHOULD-list-entry, decide what comes from the old wiki (extract), what is new-build, what is abandoned, and what is handed off to another ecosystem member. The SHOULD list (Pass 4 4.2) meets the actual old-wiki content.

Still arc-planning, not implementation. Don't spin up MW yet.

---

## Where things are

**Plan shape (conceptual-first):**

- Pass 1 -- generic wiki frame -- COMPLETE
- Pass 2 -- current QWiki audit -- COMPLETE
- Pass 3 -- ecosystem map -- COMPLETE
- Pass 4 -- wiki's unique role + SHOULD list -- COMPLETE 2026-05-12
- Pass 5 -- contributor model + freedom-vs-structure -- COMPLETE 2026-05-12
- **Pass 6 -- content strategy: extract / new-build / abandon -- THIS SESSION**
- Architecture passes (namespaces / templates / Page Forms+SMW / ecosystem-integration / discoverability+UX / cutover+deployment) -- downstream of Pass 6

**Active drain destination:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`. Pass 6 drains into the "Pass 6 -- content strategy -- pending" section (replace `pending` with `LOCKED` and fill, matching the shape used by Passes 1-5).

---

## What's locked from Passes 1-5 (don't relitigate)

**Pass 1-3 (load-bearing summary):**

- Federation-with-peers ecosystem; quake.world umbrella hosts wiki / hub / assets / servers / tools / tournaments / frontpage. Oracle + parsers + Discord + (deprioritized) forum are peers.
- Three-category wiki role: Cat 1 cede fully (clans / players / tournaments / maps / per-asset; wiki transitional where dual-purpose) / Cat 2 wiki permanent (modes / mechanics / distributions / tutorials / lore / columns) / Cat 3 no knowledge ownership (servers / tools).
- Author-once-harvest-many; wiki upstream of Oracle Layer 3 / hub / future AI services.
- Loose-coupling (C-prime): v1 link-only, no sync; schema-bones designed sync-shaped for future opt-in.
- 2-4 active editors, NOT 30 organic. Design for thin-but-active.
- Concrete contributor pool: Alice (active later tournaments) / Link (active undisciplined) / Carapace (curator-burnout) / mystery Russian (bulk-dump) / tournament-organizer drive-bys.

**Pass 4 (SHOULD list + page-types):**

- 6-entry SHOULD list = 6-tile main-page nav 1:1: Modes / Game Content / Distributions / The Scene / Tutorials / Community & Lore.
- Cut-axis: cross-entity OR no entity-owner.
- Baseline-plus-deviations pattern. External-match-link slot (hub game ID).
- 12 page-types from 4.3 (mode-page / mechanic / item / weapon-baseline / distribution / server-admin-overview / hof-league / player / clan / tutorial / article / glossary).
- 5 schema-enforced page-type exclusions: per-Map / per-Asset / News / per-Season-Historical-Tournament / per-Match.
- Track C is manual-curator-friendly, NOT auto-pipeline. Four authoring disciplines (section-as-atom / self-contained sections / L1-L3 cross-refs / citation discipline).

**Pass 5 (contributor model):**

- V1 = invite-only beta, not low-barrier signup. Pass 1's low-barrier is end-state.
- MW PluggableAuth + Discord OAuth extension handles auth; Quad does NOT provision accounts.
- `wiki-contributor` MW group auto-assigned via Discord-role-as-OAuth-claim (`@wiki-beta` -> `wiki-contributor`).
- Gate-level taxonomy per page-type: 3 strict-form / 8 form+slots / 1 free-form. Slot specifics iterate post-mockup.
- `wiki-curator` MW group exists with elevated permissions. v1 = 1-2 curators.
- Curator scope = content quality + cross-page coherence + currency review + Layer 3 harvest + spam response + template maintenance. NOT structural drift (forms handle that).
- Quality-tag system: `Category:Needs review` / `Category:Stale` / `Category:Draft`.
- Beta -> broader transition is operator-judgement-based.

**The full per-pass lockings live in the vision spec's LOCKED sections** -- that's the input Pass 6 reads off, especially Pass 4 4.2 (per-SHOULD-entry holding notes for content sources) and Pass 4 4.5 (cuts / explicit non-goals).

---

## Pass 6 scope -- content strategy

**Plain English.** Pass 6 settles, per SHOULD-list entry from Pass 4 4.2, where v1 content comes from. Old-wiki extract / new authoring / both / abandon / hand-off to another ecosystem member. Pass 4 4.2's "Pass 6 holding notes" already named provisional answers for most entries; Pass 6 firms them up and resolves the edge cases.

**Candidate sub-questions (operator can reorder / merge):**

- 6.1 -- **Per-SHOULD-entry content-source decision.** For each of the 6 SHOULD entries (Modes / Game Content / Distributions / The Scene / Tutorials / Community & Lore), per-page-type within: harvest from old wiki / new authoring / mixed / abandon / hand-off. Pass 4 4.2 holding notes provide starting positions.
- 6.2 -- **Currency-review criteria.** When is old-wiki content too stale to import vs polishable? Per content-type heuristic (e.g. install walkthroughs need version-currency; cultural essays don't). Drives 6.1 mixed-track decisions.
- 6.3 -- **Selective-extract mechanism shape.** Manual page-by-page triage vs scripted batch (with manual review). Old-wiki dump in mariadb container is available. Not architecture-pass: the SHAPE of extract, not the actual implementation.
- 6.4 -- **URL preservation per page-type.** Pass 4 4.6 locked URL preservation as a load-bearing pitch element. Per page-type: which old URLs map to which new URLs? Auto-redirect from dropped pages?
- 6.5 -- **Migration cadence + ordering.** Which page-types get migrated first to populate the v1 beta? Likely follows Pass 4 priority (v1 flagship = Modes; v1 substantial = Game Content + Distributions + HoF + Tutorials).

Output: Pass 6 LOCKED section in vision spec. After Pass 6 closes, the brainstorm is COMPLETE; arc-planner takes over to scaffold the architecture passes.

---

## Reads required (priority order)

1. **This file (handoff).**
2. **`docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`** -- Pass 4 4.2 (SHOULD list + holding notes) + Pass 4 4.5 (cuts) + Pass 5 LOCKED sections (5.1-5.4). MANDATORY.
3. **`docs/research/2026-05-09-qwiki-content-analysis.md`** -- 51% stubs / 63% stale 5+ years / player-page-dominated; the empirical basis for Pass 6 abandonment decisions.
4. **Memory: `project_qwiki_sandbox_passes.md`** -- pass tracker with full locked principles list.
5. **`docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html`** -- visual companion; useful reference for page-type shapes when deciding what's salvageable from old wiki.

If short on time: 1, 2, 4 are mandatory.

---

## Critical rules (carry-forward + new)

- **Plan is conceptual-first.** If Pass 6 starts naming SQL queries against the mariadb dump, specific MW import scripts, or per-page migration mechanics, you've drifted into implementation. Refocus on shape: per-entry source decision, currency heuristic, extract-mechanism shape.
- **Pass 4 locked content boundaries are durable.** 6-entry SHOULD list, page-type shapes, 5 schema-enforced exclusions, 11 out-of-scope items -- all locked. Don't reopen.
- **Pass 5 locked contributor model is durable.** Invite-only beta v1, MW handles OAuth, curator role + workflow, gate-levels per page-type. Don't reopen.
- **Old wiki is for extraction, not preservation.** New wiki is canonical going forward; old wiki becomes read-only archive. URL preservation matters (KTX source references). Pass 4 4.6 pitch is locked.
- **Drop 5,000 player stubs entirely.** Pass 2 / Pass 4 lock. Substantial player profiles only (~100-200 imported with new authoring fill).
- **No Russian-bulk-dump precedent.** Don't import wholesale; selective triage.
- **2-4 active contributors, NOT 30 organic.** Migration cadence sized for thin-but-active.
- **Track C disciplines apply to imported content too.** Imported pages get a discipline review before adoption (Pass 4 4.4 lock).
- **Operator preferences:** momentum over ceremony / plain English at decision points / one question at a time / decisive recommendations / no subagents for mechanical edits / ASCII-only in code and shared docs / commit early.

---

## First three actions

1. **Read this handoff (you're reading it).**
2. **Read the vision spec's Pass 4 4.2 holding notes + Pass 4 4.5 cuts** -- load-bearing starting positions for 6.1.
3. **Invoke arc-brainstormer.** Confirm the candidate Pass 6 sub-question list above with the operator (or refine), then start 6.1 (per-SHOULD-entry content-source decision) one entry at a time.

---

## When in doubt

- **Tempted to name SQL queries / MW import scripts / per-page migration mechanics** -> halt. Architecture territory.
- **Tempted to reopen the 6-entry SHOULD list / page-type shapes from Pass 4** -> don't. Locked.
- **Tempted to reopen the contributor model from Pass 5** -> don't. Locked.
- **Tempted to start a "Pass 6 minutes" doc** -> not needed. Drain into the vision spec's Pass 6 section directly.
- **Tempted to import 5,000 player stubs** -> drop. Pass 2 / Pass 4 lock.
- **Tempted to design for 30 organic contributors** -> the design point is 2-4 thin-but-active.

---

## Tooling state at handoff

- **mariadb container `qwiki-analysis`** still running with imported QWiki dump. **Pass 6 will probably want it** -- ad-hoc queries on the dump inform 6.1 content-source decisions (e.g. "which of our HoF-league pages have substantial old-wiki content?"). Operator can kill with `docker rm -f qwiki-analysis` when fully done with brainstorm.
- **Image tarball** at `apps/qwiki-sandbox/dumps/wiki-images.tar.gz` (6.4G), unextracted. Pass 6 might surface decisions about which images to import (per page-type).
- **No fresh MW stack running yet.** Architecture passes downstream will kick that off.
- **Pass 4 visual companion HTML** at `docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html` (v3 2026-05-12). Useful reference when deciding what's salvageable from old wiki per page-type shape.

---

## Context budget projection

Pass 6: ~25-40k. Likely the largest of the conceptual passes (touches every SHOULD entry x every page-type x every content kind in the old dump). Single-session aim: complete Pass 6, drain to vision spec, declare brainstorm done, write arc-planner handoff parking doc, commit.

After Pass 6 closes: **arc-planner takes over.** The arc-planner handoff parking doc replaces this handoff as the active entry point.
