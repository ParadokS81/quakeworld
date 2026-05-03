# qw-oracle showcase site + contributor pipeline (2026-04-30)

**Added:** 2026-04-30 (consolidated from sidequests "Workstream B: concept-note authoring scaffolding" and "Workstream C: /docs ingest pipeline prep" during HANDOVER triage).
**Status:** **Active; design landed 2026-05-01; lockstep architecture added 2026-05-03.** Trigger (d) fired -- operator committed to building the showcase site. Design captured in `docs/superpowers/specs/2026-05-01-qw-oracle-showcase-site-design.md`. Next step is claude.ai/design mockup pass, then implementation plan.
**Pressure:** Medium. Slipgate Managed Mode arc remains higher pressure; showcase work is paced around it.

## Lockstep flagging architecture (added 2026-05-03)

**Why this section exists.** The original parking doc framed the showcase site as a discoverability + contribution surface paired with the MCP-internal concept-note corpus. The 2026-05-03 Phase 8 eval-set walkthrough surfaced that the public wiki and the MCP concept notes are not just "two surfaces" -- they need to be **operationally coupled** to fight staleness. Without this coupling, the wiki rots like every internet guide (the operator's own framing) and the concept notes drift from the wiki's authoritative claims. This section names the coupling.

The L3 multi-domain expansion sibling parking doc (`2026-05-03-layer3-multidomain-bucket-framework.md`) is the other half of this architecture; this doc owns the staleness machinery, the L3-multidomain doc owns the bucket framework that drives note categorization.

### The bidirectional flag contract

Two surfaces, one source of truth, lockstep flagging:

| Trigger | Flags |
|---|---|
| L1 entity changes (renamed, retired, new) | Related concept note + corresponding wiki entry |
| New L1 entity introduced | Scan all concept notes -- does any note's topic now have a new lever it should mention? (Semantic match, not FK lookup; LLM job.) |
| Concept note edited | Corresponding wiki entry "review me" |
| Wiki entry edited | Corresponding concept note "review me" |

The wiki entry is **human-facing** (browsable, link-shareable in Discord, contributor-PR-able). The concept note is **LLM-facing** (terse, structured for retrieval, RRF-friendly). Both express the same underlying claim, in different presentations.

**Surface wording can diverge intentionally.** The wiki needs narrative + screenshots + worked examples for humans. The concept note needs claim density for LLM retrieval. Same authoritative content, two presentations. The lockstep flag enforces "if you change the underlying truth on either surface, you must update the other"; it does NOT enforce "the surfaces must read identically." That's the right contract -- it preserves wording flexibility while guaranteeing factual consistency.

### Domain-aware decay rates

Engine-topics and system-topics decay differently. The flag mechanism handles both, but with different signals:

**Engine-topic notes:** L1-driven flags. When ezQuake retires `vid_renderer 0`, the concept note flags (via the `concept_entities` FK-not-FK pattern already in place since Phase 4), the wiki entry flags (via the lockstep contract). World stable inside QW corpus; signals deterministic.

**System-topic notes:** time-driven flags. The cited L1 entity might never change -- but the *advice* changes when Wayland ships a new release, NVIDIA changes their driver behavior, Microsoft pushes a Windows update. Pragmatic answer: notes carry a `recheck_after` frontmatter field. After that date, the note auto-flags for review. Cadence per topic calibrated to how fast that domain moves (Wayland-related: 6 months; HDR display tech: 12 months; "how to register a USB joystick on Linux": 24 months).

The schema supports both flavors without changes: `frontmatter` is JSONB, takes whatever fields the authoring conventions define.

### The flag queue and who acts on it

**Where flags live:** open question. Three options under consideration:

1. **GitHub Issues** auto-created against the showcase site repo. Pros: visible, contributor-actionable, integrates with existing review-gate mechanism. Cons: requires showcase site repo to exist + bot to create issues.
2. **A `flagged_concepts` table** in qw-oracle Postgres, surfaced via a new MCP tool (`list_flagged_notes`) or via a public dashboard endpoint. Pros: lives next to the data; queryable. Cons: needs UI work to be useful for non-MCP-consumers.
3. **`concepts.frontmatter.staleness_status`** field, set by the loader when L1/wiki/time triggers fire. Pros: simplest schema-wise. Cons: harder to discover (not pushed anywhere; operator has to query for it).

Decision deferred until showcase-site implementation phase begins. Likely answer is GitHub Issues for the wiki-side review queue, frontmatter-status for the concept-note-internal staleness state. Both compatible.

**Who acts on the flag:** primary author is the operator + Claude during authoring sessions; community contributors via PR once the showcase site opens to dev-server members (per the original "Audience: dev-server first, public later" section below).

### Connection to the L1 reverse-lookup direction

The "new L1 entity introduced → which concept notes should mention it?" direction is the harder half of the contract. FK lookup handles the reverse (entity-to-note); the forward direction (entity-to-relevant-notes) needs semantic matching.

**Approach:** when a new L1 entity lands (loader detects via `entities.first_seen_version` matching the latest extract), embed the entity's description and run a similarity search against `concept_chunks.embedding`. Concept notes whose chunks score above a threshold are flagged as "potentially affected -- review me." This is one Voyage call per new entity (cheap; happens at extract time) plus one similarity search (free).

This piggybacks on the Phase 5 / Phase 6 embedding infrastructure -- no new pipelines, just a new code path inside the loader.

### Cross-references for this section

- `2026-05-03-layer3-multidomain-bucket-framework.md` -- the bucket framework + recipe-shape-vs-encyclopedia decision that this lockstep architecture serves.
- `apps/qw-oracle/docs/phase-8-eval-candidates.md` -- the helpdesk scan whose multi-domain failures motivated this whole conversation.
- Phase 4 schema (`apps/qw-oracle/db/migrations/005_layer3_concepts.sql`) -- already supports the data model required (FK-not-FK on `concept_entities.entity_canonical_id`, JSONB `frontmatter`).

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
