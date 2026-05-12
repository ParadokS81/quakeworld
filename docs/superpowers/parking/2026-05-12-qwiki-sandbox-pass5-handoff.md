# QWiki sandbox -- Pass 5 handoff (contributor model + freedom-vs-structure)

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

This is the fifth arc-brainstormer entry point for the qwiki-sandbox arc. Passes 1-4 closed. Pass 5 designs the contributor model: who edits, why, how. On-ramp mechanics (Discord OAuth + Quad-bot auto-provisioning candidate from Pass 1). Freedom-vs-structure balance (Track C discipline vs low-barrier contribution -- Pass 4 4.4 tension). Quality / moderation model.

Still arc-planning, not implementation. Don't spin up MW yet.

---

## Where things are

**Plan shape (conceptual-first):**

- Pass 1 -- generic wiki frame -- COMPLETE
- Pass 2 -- current QWiki audit -- COMPLETE
- Pass 3 -- ecosystem map -- COMPLETE
- Pass 4 -- wiki's unique role + SHOULD list -- COMPLETE 2026-05-12
- **Pass 5 -- contributor model + freedom-vs-structure -- THIS SESSION**
- Pass 6 -- content strategy: extract / new-build / abandon -- pending
- Architecture passes (namespaces / templates / Page Forms+SMW / ecosystem-integration / discoverability+UX / cutover+deployment) -- downstream of Pass 6

**Active drain destination:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`. Pass 5 drains into the "Pass 5 -- contributor model + freedom-vs-structure -- pending" section (replace `pending` with `LOCKED` and fill, matching the shape used by Passes 1-4).

---

## What's locked from Passes 1-4 (don't relitigate)

**Generic wiki form (Pass 1):**

- Irreducible offering: prose + crosslinks + edit-in-place + page-as-current-canonical, under live multi-author maintenance.
- Operating points: account-required low-barrier signup (no admin gating); structured-with-narrative-slots default; schema/topic freedom deliberately constrained.

**Current QWiki state (Pass 2):**

- 2-4 active editors, NOT 30 organic. Design for thin-but-active.
- Concrete contributor pool: Alice (active later tournaments) / Link (active undisciplined) / Carapace (curator-burnout) / mystery Russian (bulk-dump) / tournament-organizer drive-bys.
- Author-once-harvest-many: wiki is upstream of Oracle Layer 3 / hub / future AI services.

**Ecosystem map (Pass 3):**

- Federation-with-peers: quake.world umbrella hosts wiki / hub / assets / servers / tools / tournaments / frontpage. Oracle + parsers + Discord + (deprioritized) forum are peers.
- Three-category wiki role model: Cat 1 (cede fully) / Cat 2 (wiki permanent) / Cat 3 (no knowledge ownership).
- (C-prime) loose-coupling: v1 link-only no sync; schema-bones designed sync-shaped for future opt-in; density-over-coverage.

**Pass 4 (wiki's unique role + SHOULD list):**

- **6-entry SHOULD list matches 6-tile main-page nav 1:1.** Modes / Game Content (mechanics + items + weapons + external Maps + Customizations) / Distributions (clients + servers + proxies, incl. server admin) / The Scene (Players + Clans + Tournaments transitional) / Tutorials / Community & Lore (incl. glossary).
- **Liquipedia-inspired 6-tile main-page layout** with integrated header search. Locked tile names. Visual companion at `docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html`.
- **Cut-axis:** "cross-entity OR has no entity-owner".
- **Baseline-plus-deviations pattern.** Combat baseline = single source of truth; mode pages have "Deviations from baseline" sections.
- **External-match-link slot.** Wiki references hub.quake.world matches via game ID; no per-Match wiki page-type.
- **Track C reframe: manual-curator-friendly, NOT auto-pipeline.** Four authoring disciplines (section-as-atom / self-contained sections / L1-L3 cross-refs / citation discipline). Concept-notes stay manually authored + reviewed + tested per `apps/qw-oracle/curated/concept-notes/CLAUDE.md` workflow.
- **5 schema-enforced page-type exclusions:** no per-Map / per-Asset / News / per-Season-Historical-Tournament / per-Match page-types.
- **Glossary lives in Community & Lore** (one umbrella page; v1 skeleton; fills out over time).
- **Cutover pitch + Q&A locked (4.6).** Seed for architecture-pass cutover messaging.
- **Tension carry-forward to Pass 5:** Track C structure vs low-barrier contribution. Resolution candidates: forms enforce for high-curator-value entries (modes / baseline / distributions); looser slots for casual contributions (community & lore); curator-pass cleans drift after the fact.

**The full Pass 4 mapping + per-entry page-type shapes + carry-forwards live in the vision spec's Pass 4 LOCKED sections.** That is the input Pass 5 reads off.

---

## Pass 5 scope -- contributor model + freedom-vs-structure

**Plain English:** Pass 5 settles the contributor model -- who edits, why, how. Three areas:

1. **On-ramp / signup mechanics.** Discord OAuth + Quad-bot auto-provisioning candidate locked from Pass 1. Shape: how does it actually wire (Discord roles, Quad bot's existing permissions, MW user auto-creation)? Not implementation yet; just the shape.
2. **Freedom-vs-structure balance.** Tension carry-forward from Pass 4 4.4: Track C structure vs low-barrier contribution. How tight are forms per entry type? When does curator-pass kick in? What's the schema enforcement level per page-type?
3. **Quality / moderation model.** Who curates, when. Sweep-mode curator workflow (Carapace-v2). Drive-by structured input from tournament organizers. Filter undisciplined random-format edits via schema enforcement (Link's reality).

**Candidate sub-questions (operator can reorder/merge):**

- 5.1 -- **Signup flow.** Discord OAuth + Quad-bot auto-provisioning end-to-end (shape level). What happens when someone clicks "sign up"? What signals does Quad need; what does it write to MW?
- 5.2 -- **Edit-gate level per entry type.** Which entries require form-driven structured input (modes / baseline / distributions / HoF)? Which accept looser prose (community & lore article-pages)? Cross-cuts the Pass 4 Track C tension.
- 5.3 -- **Curator workflow.** Sweep-mode (curator reviews and tidies in batches) vs drive-by (organizer fills form, page renders). Who, when, how often. Carapace-v2 framing from Pass 2.
- 5.4 -- **Moderation / quality-floor enforcement.** Schema enforcement (forms reject malformed entries) + curator-pass cleanup + tag-based quality flags (InfoboxComplete-style legacy carries forward).
- 5.5 -- **Quad-bot integration scope.** Bot already has Discord presence + Quad voice service. New role: wiki auto-provisioning. What signals does it need; what does it write to MW? (Lighter weight than implementation; just the shape of the integration.)

Output: Pass 5 LOCKED section in vision spec; feeds Pass 6 (content strategy) and architecture passes (Page Forms / templates / extension stack).

---

## Reads required (priority order)

1. **This file (handoff).**
2. **`docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`** -- Pass 4 LOCKED sections (4.1 - 4.6) + earlier passes' carry-forwards. MANDATORY.
3. **`apps/quad/CLAUDE.md`** -- Quad bot's existing Discord integration and capability surface; relevant for 5.1 + 5.5 (Discord OAuth + Quad-bot auto-provisioning).
4. **`docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html`** -- visual reference for Pass 4's locked page-type shapes (useful for 5.2 edit-gate decisions per entry type).
5. **Memory: `project_qwiki_sandbox_passes.md`** -- pass tracker with locked principles list.
6. **`docs/research/2026-05-09-qwiki-content-analysis.md`** -- contributor pattern context (Alice / Link / Carapace / mystery sweeper / tournament organizers); informs 5.3 + 5.4.

If short on time: 1, 2, 5 are mandatory.

---

## Critical rules (carry-forward + new)

- **Plan is conceptual-first.** If Pass 5 starts naming Discord API endpoints / MediaWiki extension config / Page Forms field types, you've drifted into implementation. Refocus on shape: what the contributor model HOLDS, not how it gets wired. Architecture passes downstream.
- **Pass 4 locked decisions are durable.** 6-entry SHOULD list, page-type shapes, Track C disciplines, Layer A 6-tile nav with locked names -- all locked. Don't reopen.
- **Pass 1 lock:** account-required, low-barrier signup, no admin gating. Discord OAuth + Quad-bot auto-provisioning candidate carries forward.
- **Pass 4 carry-forward tension:** Track C structure vs low-barrier contribution. Resolution candidates already named (forms enforce for high-curator-value; looser for casual; curator-pass cleans drift). Pass 5 picks among / refines them.
- **2-4 active contributors, NOT 30 organic.** Design for thin-but-active.
- **Operator preferences:** momentum over ceremony / plain English at decision points / one question at a time / decisive recommendations / no subagents for mechanical edits / ASCII-only in code and shared docs / commit early.

---

## First three actions

1. **Read this handoff (you're reading it).**
2. **Read the vision spec's Pass 4 LOCKED sections** in full -- load-bearing input for everything Pass 5 settles.
3. **Invoke arc-brainstormer.** Confirm the candidate Pass 5 sub-question list above with the operator (or refine), then start 5.1 (signup flow) one question at a time.

---

## When in doubt

- **Tempted to name Discord API endpoints / MW config / Page Forms field types** -> halt. Architecture territory.
- **Tempted to reopen the 6-entry SHOULD list / page-type shapes from Pass 4** -> don't. Locked.
- **Tempted to start a "Pass 5 minutes" doc** -> not needed. Drain into the vision spec's Pass 5 section directly.
- **Tempted to design for 30 organic contributors** -> the design point is 2-4 thin-but-active (Pass 2 lock).
- **Tempted to over-engineer Quad-bot integration** -> shape only; architecture pass details the API surface.

---

## Tooling state at handoff

- **mariadb container `qwiki-analysis`** still running with imported QWiki dump. Useful for ad-hoc queries if Pass 5 needs them (probably not; Pass 5 is synthesis, not data analysis). Operator can kill with `docker rm -f qwiki-analysis` when fully done with brainstorm.
- **Image tarball** at `apps/qwiki-sandbox/dumps/wiki-images.tar.gz` (6.4G), unextracted.
- **No fresh MW stack running yet.** Architecture passes downstream will kick that off.
- **Pass 4 visual companion HTML** at `docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html` (v3 2026-05-12). Useful reference for 5.2 edit-gate decisions per entry type.

---

## Context budget projection

Pass 5: ~25-35k. Comparable to Pass 4. Single-session aim: complete Pass 5, drain to vision spec, commit, fresh-terminal for Pass 6.
