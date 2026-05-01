# qw-oracle showcase site + contributor pipeline (2026-04-30)

**Added:** 2026-04-30 (consolidated from sidequests "Workstream B: concept-note authoring scaffolding" and "Workstream C: /docs ingest pipeline prep" during HANDOVER triage).
**Status:** **Active; design landed 2026-05-01.** Trigger (d) fired -- operator committed to building the showcase site. Design captured in `docs/superpowers/specs/2026-05-01-qw-oracle-showcase-site-design.md`. Next step is claude.ai/design mockup pass, then implementation plan.
**Pressure:** Medium. Slipgate Managed Mode arc remains higher pressure; showcase work is paced around it.

## What changed at 2026-05-01 (trigger firing)

The brainstorm session that fired the trigger landed the design as a five-section narrative site + parallel Layer 2 mining arc for seed topics. Key resolutions of the open questions below:

- **Stack / hosting:** Firebase Hosting frontend + Unraid + cloudflare tunnel for MCP backend (matchscheduler pattern). Domain `oracle.quake.world` pending vikpe confirmation.
- **Topic-voting mechanism:** GitHub Issues queue with three convergent feeds (operator wishlist + Layer 2 mining + contributor MCP self-test). No custom voting widget.
- **MCP+skills bundle distribution:** `claude-plugins` package; tooled contributors install it as the kung-fu-disk transfer of the operator's authoring framework. Hand-written path also supported.
- **Review-gate mechanics:** Operator final say + Claude review pass for mechanical discipline + GitHub PR comments for threaded review. No published guidelines doc on day one; corpus + review threads are the de facto guidelines.
- **Alternatives evaluated and rejected:** custom CMS (replaced by GitHub-as-backbone), custom feedback channel UI (collapsed into propose-flow + GitHub Issue native links), Discord-channel-only (skipped; site provides the showcase + recruiting surface GitHub alone cannot).
- **Parallel Layer 2 mining arc:** prerequisite for site launch (seeds 5-10 topics into the queue at v1). Three sub-tracks: re-ignite Discord scraping, trim/filter pass, hybrid FTS5+vector retrieval via `sqlite-vss`.

The original parking content below is preserved for historical context.

---

### Why this is parked, not active

Concept notes are "the golden nuggets of wisdom the community can provide" -- the tier of context that turns hard facts into helpful answers. Operator's reach as a competitive player is narrower than the ecosystem's surface (config tinkerers, HUD authors, server admins, mod authors all hold knowledge operator does not). Solo authoring will not drain the backlog. Community help is needed eventually.

But three preconditions are not yet met for opening contribution:

1. **Layer 1 server/mod side is incomplete.** Many concept notes ground against Layer 1 facts via the authoring skill. Server/mod (KTX, MVDSV) is the missing engine port. Notes on those topics cannot be grounded today.
2. **No showcase surface exists.** Contributors need to see what the oracle is, how it functions, how a question flows through the layers, and what a finished concept note looks like, before they will invest effort in writing one.
3. **No topic-discovery / voting mechanism exists.** Without one, contributor effort goes to the wrong topics or duplicates existing work.

Opening the gates prematurely would produce concept notes operator cannot ground or notes on the wrong topics. The arc unshelves when operator decides to push the showcase site forward as the leading indicator -- because building the site forces the topic-voting and standard-writing decisions to crystallize.

### Trigger

**(d) Operator decides to commit to the showcase site.** Site construction is the forcing function for the rest of the arc. Server/mod Layer 1 progress is a soft input (more notes become groundable as it lands) but not a strict gate.

Soft signals that might pull this forward:

- A specific dev-server contributor surfaces and asks "how can I help write these?" -- opportunistic; might warrant a hand-built one-off path before the full arc unshelves.
- Concept-note backlog grows past what solo authoring can drain comfortably.
- Server/mod Layer 1 lands a substantial chunk and operator wants to start populating those topics in volume.

### Spine: combination, with the website as connective tissue

Three legs working together rather than one primary:

- **Topic-discovery + drafting feedback loop on the site.** Community pitches topics, operator (with Claude assistance) researches and posts drafts, comments / iteration tighten the note before merge.
- **Sharable MCP + skills bundle as the tooling path.** Serious contributors who want to author end-to-end can install the same MCP and skills operator uses. They produce a draft locally, submit it the same way operator would.
- **Review gate as the merge mechanism.** Operator (and / or a Claude review pass) decides what lands in the canonical concept-note set. The standard ("guidelines") evolves as friction shows up rather than being fixed once upfront.

Implicit: the site is not just a contribution funnel, it is also the public face of the oracle -- explaining what it is, how it gathers data across layers, why concept notes matter, what makes a good one. The pitch and the pipeline share a surface.

### Audience: dev-server first, public later

**v1 audience: ~60 dedicated members of the QW dev server.** Closed-beta with people who already trust the project. v1 site does not need anti-spam, full account systems, or moderation tooling for strangers -- Discord auth or invite-link gating is enough.

**Public phase is its own future arc.** Triggered when the curated concept-note collection is substantial enough to demonstrate quality and scope. Public contribution adds spam, moderation, and quality-control surface area that v1 does not need to solve.

### Asset bundling: text + opportunistic images

Two distinct image roles to keep clear:

- **Authoring-aid image** -- contributor uploads a screenshot to help operator / Claude understand the concept while drafting. May not survive into the final note.
- **Embedded image** -- image judged useful enough to ship with the concept note. MCP returns it with `audience: ["assistant"]` so the model can reason about it on retrieval.

MCP image transport is supported (verified 2026-04-30): MCP spec has image content as a first-class tool-response format; Claude Code consumes images with `audience: ["assistant"]` as multimodal input.

**Storage caveat:** oracle has no image store today. The website's contribute flow accepts images, but the canonical concept-note pipeline is text-first until storage exists. Early iterations: images flow through the website's drafting feedback loop, only text lands in the snapshot. Image-storage design is a downstream task this arc surfaces but does not solve.

### Out-of-scope for v1

- Public contribution from anyone who is not on the dev server.
- Image storage in the oracle snapshot.
- Automated quality scoring of submissions.
- Author attribution / credit system in the snapshot.
- Multilingual content.

### Open questions for the brainstorm when this unshelves

- Site hosting and stack -- static site? Lightweight framework? Where does it live (subdomain of an existing QW property, or new domain)?
- Topic-voting mechanism -- GitHub Discussions, custom site widget, Discord poll bot?
- How does the MCP+skills bundle get distributed to a non-Claude-Code user? Or is it Claude-Code-only for v1?
- Review-gate mechanics -- single reviewer (operator), small reviewer pool, automated lint pass?
- Alternatives to a website worth a beat: Discord channel + structured templates, GitHub Discussions + PR flow, Notion-with-checks. Operator's working assumption is website but alternatives stay on the table.
- Standard-writing -- when do "guidelines" need to be a published document vs. evolving organic practice?

### Pressure

Low until trigger fires. This arc costs nothing to leave parked; concept-note authoring continues solo. Cost of unshelving prematurely is high (sets up a contribution funnel the project cannot yet feed or honor).

### Related

- Memory: `project_qw_oracle_vision` (three-layer architecture), `project_qw_oracle_product_vision` (active-assistance product framing), `project_layer3_two_path_curation` (community-curated imports + newly-earned authoring).
- Skills: `guide-rewrite` (current Path 2 authoring workflow), `extraction-review` (Layer 1 grounding pipeline).
- Layer 1 server/mod prerequisite: HANDOVER "Phase 2d-2h: remaining QW knowledge rollout" -- KTX is the only remaining engine port.
- Origin sidequests (now retired):
  - "Workstream B: concept-note authoring scaffolding" -- template MDX-compatibility test against ezquake.com vitepress + authoring-ritual shape.
  - "Workstream C: /docs ingest pipeline prep" -- gap-report output format as contributor onboarding kit; next guide-rewrite candidate (`scripting.md`, `player-skins.md`).

---
