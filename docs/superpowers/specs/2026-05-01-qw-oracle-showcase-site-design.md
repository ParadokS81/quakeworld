# qw-oracle showcase site - design (2026-05-01)

**Status:** Design complete; pending mockup pass on claude.ai/design.
**Trigger:** Operator commits to the showcase-site arc (per parking doc `2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md`, trigger (d) fired 2026-05-01).
**Supersedes:** Parking doc `2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` becomes implemented-by-this-spec on landing.

---

## Summary

A public-facing site at `oracle.quake.world` (TBD with vikpe) that serves three purposes simultaneously, for one overlapping audience:

1. Explain what oracle is and why it is structurally different from a wiki or chatbot.
2. Open contribution to dev-server members, packaged so authoring expertise transfers wholesale.
3. Give the operator self-visibility into the corpus the operator has been building.

The site is a single-page narrative with five sections plus a tabbed inspect view. GitHub is the contribution backbone; no custom CMS or moderation surface is built.

The deliverable for the immediate next step is a design frame from claude.ai/design, produced from this spec, which then feeds an implementation plan.

---

## Audience

**v1 audience:** ~60 dev-server members, closed beta, technical, QW community insiders. Three overlapping roles in the same person:

- **Curious browsers** - want to see what oracle is, no commitment.
- **Active askers** - want to use oracle to answer their own QW questions.
- **Potential contributors** - want to add knowledge they hold.

**v1 access gate:** Discord OAuth or invite-link. No anti-spam or moderation tooling for strangers in v1. Public phase is a future arc, triggered when the curated corpus is substantial enough to demonstrate quality.

**Audience implication for design:** the site can assume technical literacy, can show real markdown / YAML / source citations, and does not need to dumb down the architecture explanation. Systems-minded reviewers will pattern-match the layered architecture from a concrete example faster than from an abstract block diagram.

---

## Locked decisions

These are settled and should not be re-litigated during mockup iteration:

- **Three-leg spine:** the site itself + MCP+skills bundle + GitHub-mediated review gate. All three exist together; none alone is the product.
- **GitHub as the contribution backbone.** Issues = topic queue. PRs = drafts in flight. Comments = review threads. Merges = canonical corpus updates that the MCP serves. No custom CMS, no custom comment system, no custom moderation surface.
- **MCP self-test as the contributor triage.** A contributor proposing a topic must first run their question through the MCP query playground. The failed query becomes the proposal's anchor evidence. Self-filters duplicates; provides motivation for free.
- **Three convergent topic-creation paths:** operator-curated wishlist + Layer 2 mining (community demand, evidence-backed) + contributor proposals via MCP self-test. All three feed the same GitHub Issue queue.
- **Two contributor paths after a topic is claimed:** tooled (install Claude Code + the qw-oracle skills bundle, drive the same `guide-rewrite` skill the operator uses) or hand-written (web form, operator + Claude take it the rest of the way). The site supports both.
- **Text-first ingestion.** Images live only in the drafting flow until oracle has an image store; not in v1.
- **Concept notes are vertical slices.** Each note threads Layer 1 anchors + Layer 3 substance + optional Layer 2 garnish. The Layer 1 anchors are typed wires that auto-flag the note for review when source changes.

---

## Out of v1

Explicitly excluded from this design:

- Public contribution from anyone who is not on the dev server.
- Image storage in the oracle snapshot.
- Automated quality scoring of submissions.
- Author attribution / credit system in the served snapshot beyond what the markdown frontmatter already carries.
- Multilingual content.
- A web-mediated drafting wrapper that proxies GitHub editing. v1 contributors edit in GitHub's web UI or in a local editor; a friendlier wrapper is a v1.5 candidate if real friction emerges.
- A separate feedback-on-outputs channel UI. Feedback collapses into the existing flows: weak MCP answers route through the propose-flow; concept-note errors route through GitHub's native edit/comment links; Layer 1 factual errors route through bug reports.

---

## Audience-to-section map

The site is a single-page scrolling narrative. Default reading order is top-to-bottom, but each section stands alone for someone who navigated directly via header link.

| Section | Curious browser | Active asker | Potential contributor |
|---|---|---|---|
| 1. What is oracle | Primary | Primary | Primary |
| 2. Why concept notes matter | Primary | Secondary | Primary |
| 3. What makes a good concept note | Skim | Skim | Primary |
| 4. How to contribute | Skip | Skim | Primary |
| 5. Inspect the oracle (tabbed view) | Skim | Primary | Primary |

The same content serves all three roles; the depth they consume differs. No personalization or role-detection in v1.

---

## Section 1: What is oracle

**Goal:** 30-second understanding of what oracle is and why it is structurally different from existing QW knowledge resources (wikis, ezquake.com guides, forum threads).

### Three-tier reveal

**Tier 1 - Elevator visual (above the fold).**

Single forward-arrow flow:

```
[user question] -> [LLM] -> [MCP] -> [Layer 1] [Layer 2] [Layer 3] -> [answer]
```

Each layer briefly previewed with a one-line teaser:
- Layer 1: "extracted facts (e.g. cvar `cl_weaponpreselect`, source-grounded, version-aware)"
- Layer 2: "community testimony (e.g. Discord thread on weapon-script preferences, dated)"
- Layer 3: "curated concept notes (e.g. `weapon-scripts`: three practical methods)"

Five seconds to understand. No mechanics yet.

**Tier 2 - Consumer landscape (reveal on scroll or toggle).**

Oracle as a data product with multiple consumers, not just LLMs. Diagram:

```
                    Layer 1 (extracted facts)
                    Layer 2 (chat corpus)
                    Layer 3 (concept notes)
                          |
            +-------------+--------------+--------------+
            |             |              |              |
       MCP server    Snapshot       Direct SQL    [future:
       (LLM-shaped)  (JSON,         (any tool,    web API,
                     Layer 1)       any layer)    vector RPC]
            |             |              |
       Claude Code   Slipgate-app   Power users
       Quad bot      ConfigViewer   ad-hoc analysis
       Future LLMs   Quake browser
```

Caption: *"Oracle is a knowledge service. The MCP path serves LLMs and is the most general consumer (touches all three layers). Slipgate-app's ConfigViewer consumes Layer 1 directly via a snapshot, never touching the MCP. Direct SQL access is available for ad-hoc analysis. New consumer types plug in without redesigning the layers."*

**Tier 3 - Mechanics ping-pong (deep-dive reveal).**

For visitors who scroll further or toggle "show me how":

The LLM is the orchestrator. The MCP is a stateless tool surface. Each MCP call hits one layer with one query and returns one structured response. Cross-layer breadcrumbs (concept-note pointers in entity responses, canonical-id refs in concept notes, suggested-fallback strings in tool responses) let the LLM hop between layers iteratively.

Worked example, animated through five tool calls:

1. LLM calls `search_entities("skin")` -> 30+ cvars, several reference the `player-skins` concept note.
2. LLM calls `get_concept_note("player-skins")` -> markdown body cites `cl_enemyskin`, `cl_teamskin`, `r_lerpframes`, `cl_deadbodyfilter`, etc. plus a Layer 2 session ID.
3. LLM calls `lookup_entity("cl_enemyskin")` -> version range, source ref, related concept notes.
4. LLM calls `search_solved_issues("teammate skin override")` -> Layer 2 chat thread context.
5. LLM has enough; synthesizes answer with citations.

Caption: *"The server never knew there was a session. The LLM decided each call from what the prior response surfaced. This is why oracle is LLM-agnostic, why each tool call is auditable and cacheable, and why the architecture stays simple as the corpus grows."*

### Tagline candidate

*"Oracle does not replace the wiki. The LLM is the wiki page - written on the fly, fed by oracle's structured layers, flavored by the asker's model and directives. We do the curation; the LLM does the synthesis; the user gets a real answer."*

---

## Section 2: Why concept notes matter

**Goal:** Make the case for Layer 3 specifically. Show that source code alone does not carry what concept notes carry, and that concept notes resist staleness in a way wikis do not.

### Visual: vertical slice diagram

One topic threading through all three layers as a literal vertical column. The column is the concept note.

```
Topic: "Customizing the Lightning Gun"

      +- Layer 1 anchor row -------------------------------+
      |  - cvar:gl_lightning (ezquake) - source-grounded  |
      |  - cvar:gl_smoothshaft - version range 3.6+       |
      |  - cvar:r_shaftalpha - RULESET-disabled smackdown |
      |  - cmd:f_fakeshaft - chat-trigger handler         |
      |  - ruleset:smackdown - 14-cvar disable list       |
      +-------------+-------------------------------------+
                    |  (typed wires - auto-flag on change)
      +-------------v-------------------------------------+
      |  Layer 3 substance:                               |
      |  Mechanical behavior + visual tuning + audio +    |
      |  ruleset awareness + cross-engine notes.          |
      |  Authority-grounded recommendations:              |
      |  - engine mechanics (file:line)                   |
      |  - operator SME (@ParadokS)                       |
      |  - hedged community knowledge (palette overlap)   |
      +-------------+-------------------------------------+
                    |
      +-------------v-------------------------------------+
      |  Layer 2 garnish (optional):                      |
      |  Discord testimony quote on shaft customization.  |
      +---------------------------------------------------+

       Concept note = the vertical slice that threads all three.
```

### Three classes of knowledge concept notes carry that source alone cannot

This is the load-bearing argument:

1. **Mechanic rationale.** *Why* a pattern exists. The death-drop-on-reload mechanic motivates weapon scripts existing at all - not in any source line; emerges from server behavior interacting with weapon spawn frequency interacting with damage values, processed through 25 years of community play.
2. **Domain canon and named-authority recommendation.** RL > LG > SG > axe is not a code constraint; it is community judgment grounded in named expertise (vikpe, BLooD_DoG, meag, johnnycz, operator). Layer 3 carries this with explicit authority labels.
3. **Cross-system contracts.** Mod-and-client joint behavior (KTX server rules + ezQuake client cvars + QC progs.dat mechanics) emerges across codebases. No single-codebase AST parse can synthesize it.

### Closer: the auto-review property

Concept notes do not go quietly stale. The mechanism:

```
Concept note frontmatter carries typed Layer 1 references:
  related_entities:
    - ezquake:cvar:cl_weaponpreselect
    - ezquake:command:+fire_ar
    ...

Each entity is a subscription.

When an extraction-walk runs on a new engine tag:
  - diff identifies retired entities (last_seen_version set)
  - diff identifies renamed entities (canonical_id changes)
  - diff identifies semantic changes (default value, flags, validation)

System scans concept-notes/ for any note whose frontmatter
references the changed entity. Flags those notes for review.

Operator dashboard surfaces flagged notes. Resolution:
  - update prose
  - mark `status: deprecated` if pattern is no longer recommended
  - mark `status: historical` if feature is gone but pattern teaches
  - archive if entirely superseded
```

Concrete contrast that lands:

> ezquake.com uses an automated process to display cvar JSON help files. **156 of those references are cvars that no longer exist in the codebase** (48 renamed, 93 retired, 15 never-implemented; verified via the help-JSON classifier shipped 2026-05-01). They went stale silently because nothing was watching the link between the displayed reference and the source-of-truth.
>
> Concept notes carry typed Layer 1 references. When the codebase changes, every note that touches the change is flagged automatically. Knowledge can drift in prose; the *anchor* between the note and source cannot drift without being detected.

Not a hypothetical advantage - we have evidence right now.

### Tagline candidate

*"Layer 1 is the Lego blocks. Layer 3 is the recommendation on how to build with them. The blocks are source-grounded; the recommendation is named-authority-grounded; the wires between them are typed and watched. Knowledge stays alive instead of going quietly stale."*

---

## Section 3: What makes a good concept note

**Goal:** Show the contract a good note satisfies, with real examples. Surface the corpus is not all big guides - small sticky-note explainers are part of the corpus too.

### Visual: 1 big + 2 small notes side by side

**Big example - anatomy view of `weapon-scripts.md`:**

Render the top ~30 lines (Summary + The three methods at a glance table, the progressive-disclosure opener) with four callouts:

- **Frontmatter callout (top-left):** *"Provenance: `authored_by: qw-oracle`, builds on five `primary_contributors` (named experts: @ParadokS, @johnnycz, @meag, @BLooD_DoG, @vikpe), cites 14 Layer 1 entities + 3 commits in `related_entities`."*
- **Earn-trigger callout (top-right):** *"Earned by: synthesis across multiple Lego blocks (3 commands + 4 cvars + cross-engine + ruleset interaction). Cannot be answered from any single Layer 1 row."*
- **Shape callout (bottom-left):** *"Domain walkthrough shape. Opener is a three-method-glance table - first ~30 lines stand alone as the default-serve answer."*
- **Authority-grounding callout (bottom-right):** *"Each recommendation labeled. `+fire_ar` recommendation grounds in: (1) engine mechanics - `cl_input.c:338, 388` closes the one-frame window, (2) community consensus - johnnycz's 2011 commit message, (3) operator SME - @ParadokS on the user-facing taxonomy."*

**Small example A - legacy/artifact flavor (`kmap-legacy-keymap-system.md`):**

Compact strip view showing the title, summary, and one anchor callout: *"This exists because the understanding cannot be derived from Layer 1 alone - Layer 1 says the loader was removed in 2014, but it does not say nQuake still ships the files. Synthesis across source removal commit + nQuake bundle inspection + community testimony."*

**Small example B - current-version edge flavor (`ruleset-anti-script-restriction-pattern.md`):**

Same compact strip view: *"This exists because the restriction lives in source but the consequences need a story - five primitives, four rulesets, when each bites, what bypass paths existed. A user asking 'why does my exec fail under smackdown' cannot get the answer from any single cvar lookup."*

### Earn-prompts (positive contributor framing)

You hold a note's worth of knowledge if you can answer *yes* to any of these:

1. **Can you explain a feature whose consequences are non-obvious?** (`cl_portpingprobe` black magic. View-shake cvars. `cl_independentphysics`. cshift family.)
2. **Can you encode use-knowledge that source code does not carry?** (Weapon priority canon. Teamplay binding grammar. HUD layout patterns.)
3. **Can you synthesize multiple entities into a pattern?** (Weapon scripts = 3 methods x 4 modulation cvars. HUD design = per-element cvars + layout system.)
4. **Can you document a workflow that spans features?** (Serverbrowser efficient use - filters + bookmarks + ping ranking + ruleset awareness. Demo-recording-to-replay flow.)
5. **Can you connect mod and client behavior?** (Anti-script ruleset interactions. KTX `wreg` + ezQuake `+fire_ar`. Server-side rules that change client cvar legality.)

### Authority grounding contract (visible briefly)

Every recommendation in a concept note grounds in one of four labeled sources. Bare assertion is disallowed:

1. **Engine mechanics** - source-defensible, cite file:line.
2. **Community consensus** - commit messages, PR threads, Layer 2 testimony with message-ID.
3. **Operator SME** - credited in `primary_contributors` frontmatter.
4. **Hedged community knowledge** - flagged inline as not-source-defensible.

Authority statements, not population claims. Phrases like "most players use X" are forbidden because oracle has zero population data; recommendations are framed as named-authority statements.

### Tagline candidate

*"Concept notes are bonsai - curated deliberately, grounded in named expertise, machine-checkable provenance via Layer 1 anchors. The bar is real; if you hold knowledge that fits, contributing is straightforward."*

---

## Section 4: How to contribute

**Goal:** Make contribution feel low-friction and tangible. Surface the kung-fu-transfer story (skills bundle = operator's authoring framework, transferred wholesale).

### Three convergent topic-creation paths

```
1. Operator-curated wishlist     -+
2. Pre-seeded from Layer 2        +-> GitHub Issues queue
   mining (community demand)      +    (label: `proposed`)
3. Contributor proposes via MCP   -+
   self-test
```

All three converge on the same GitHub Issues queue. Different sources, same review pipeline.

**MCP self-test triage flow** (the contributor-proposed path, also the visitor's first encounter with oracle):

```
1. "What question are you trying to get answered?"
   Visitor types: "How does cl_portpingprobe pick the best port?"

2. Site runs the question through the MCP, shows the response.

3. Three branches:
   - "Oracle answered it" -> No note needed. Educational moment;
     visitor just learned how the layers worked together.
   - "Partial / wrong" -> Route to GitHub issue with
     `feedback-on-output` label.
   - "Oracle had nothing useful" -> Proceed to topic submission
     with the failed query attached as evidence-of-gap.
```

The third branch creates a GitHub Issue with `proposed` + `from-mcp-self-test` labels. Issue body contains the query, the MCP response, and the contributor's "what was missing" prose.

### Two contributor paths after a topic is claimed

**Tooled path (the Matrix-disk transfer):**

The skills the operator uses to author concept notes are user-global at `~/.claude/skills/` (primarily `guide-rewrite` plus supporting research helpers). These are packaged as a `claude-plugins` distribution.

Install steps:
1. Install Claude Code (or any MCP-capable LLM client).
2. Install the `qw-oracle` plugin bundle (`claude plugins install qw-oracle`).
3. Point MCP at the public oracle endpoint (`oracle.quake.world/mcp`).
4. Clone the source repos the skill expects (`research/repos/ezquake-source/`, etc.) - all public.
5. Run `/guide-rewrite <topic>` on a claimed topic. The skill walks the contributor through entity extraction, source verification, cross-engine checks, drafting against the template, and self-review.

Output: a draft note in the contributor's fork. Submitted via GitHub PR.

**Hand-written path (no install):**

Contributor writes prose in plain markdown via the web form. Submits via the same form, which creates a GitHub Issue with `draft-text` label. Operator + Claude take it the rest of the way (entity extraction, citation discipline, shape conformance) before merging.

Both paths land in the same GitHub PR review pipeline.

### Backbone: GitHub maps cleanly

| Step | GitHub primitive |
|---|---|
| Topic queue | Issues + labels (`proposed` / `claimed` / `drafting` / `in-review`) |
| Topic claim | Self-assign the issue |
| Drafting | Branch + draft `.md` in `concept-notes/` |
| Submit for review | Pull Request |
| Threaded conversation | PR comments (inline + general) |
| Diff tracking | Git, free |
| Review-and-merge gate | Operator merges PR; CI runs `build-snapshot`; MCP picks up new note |
| Auth | GitHub OAuth |
| History after merge | `git log` |

### Review gate

- Operator has final say. Always. Single-reviewer minimum.
- Claude review pass runs automatically on every submitted PR. Mechanical discipline check: frontmatter complete? earn-prompt satisfied? entity refs resolve in Layer 1? authority grounds labeled? shape matches body? scope on-target? Posts as a structured comment to the thread.
- Other shipped contributors can comment but cannot approve in v1.
- No formal published guidelines doc on day one. The corpus + the visible threaded reviews ARE the guidelines. Contributors learn by reading prior accepted notes and prior review threads.

### Tagline candidates

*"Install the skills bundle, you have the operator's authoring framework. Or just write what you know - we will take it from there."*

*"Topics come from three places: operator curation, community demand mined from chat, and contributors hitting walls in oracle. All three converge in one queue. Pick one, write it, ship it."*

---

## Section 5: Inspect the oracle

**Goal:** Three views, three audiences, one tabbed page. Curious browsers play with the playground; active askers use it as their primary interface; potential contributors check the corpus state before proposing duplicates.

### Three sub-views as tabs

**5.1 Ask oracle (query playground)** - default tab.

Two modes:

- **Natural-language mode (default):** visitor types a real question, backend runs it through Haiku 4.5 + the MCP. UI shows the assembled answer plus the tool-call trace as expandable steps. Mirrors the Section 1 ping-pong viz with the visitor's own question. Doubles as the propose-flow self-test from Section 4.
- **Advanced mode (toggle, deferred):** direct MCP tool forms (`search_entities`, `lookup_entity`, etc.) for systems-minded contributors who want raw API access. Skipped in v1; install the MCP locally for direct access.

Cost control: rate-limit per session (10 LLM-backed queries per IP per day), cache popular queries, Haiku 4.5 keeps per-query cost under a cent.

Below every answer card: one button - *"This answer was weak. Propose as topic ->"*. Click routes to the propose-flow with the failed query pre-filled.

**5.2 Browse notes** - second tab.

List view + per-note pages.

- **List view:** filterable by engine / shape / status / topic / authored-by. Each row shows title + one-line summary + status badge + entity-count.
- **Per-note page:** renders the markdown. Frontmatter surfaced visually (provenance badge, status, related entities as clickable chips, primary contributors with GitHub avatars). Cvars/commands cited inline link to their Layer 1 entity panel (popover or side rail with version range, source ref, blame). Footer: "Edit on GitHub" link (direct PR path) + "Report issue with this note" link (creates a GitHub Issue).

**5.3 Corpus state (operator-self-visibility leg)** - third tab.

Card grid with at-a-glance state:

- **Layer 1 namespaces card** - per-project entity counts (ezQuake: N cvars / M commands / etc.), per-type breakdowns, "last extracted" timestamp per namespace. KTX/future namespaces shown as placeholders with status (`pending extraction`).
- **Layer 2 card** - message count by channel, date range, "last imported" timestamp, vector-index coverage status (when that ships).
- **Layer 3 card** - note count by shape + status, gap inventory ("N topics needing notes", linked to GitHub Issues queue from Section 4), authored-by split (community-imported vs authored-here).
- **MCP service card** - tool inventory, schema version, snapshot timestamp, version drift between snapshot and extraction HEAD.
- **Future namespaces card** - placeholders for `qw-history` (xantom's tournament data), assets/maps catalog when those land. Makes the architecture's openness visible.

Information-dense but scannable. Click a card -> full breakdown.

### Tagline candidate

*"Inspect what is there before proposing what is not. Transparency is the contract - garbage in, garbage out, so we show you what is in."*

---

## Architectural framings visible across the site

Five framings should be reinforced in multiple places, not buried in one section:

1. **Three-layer model** (extracted facts / chat corpus / concept notes) - Sections 1, 2.
2. **Multiple consumers, not just LLMs** - Section 1, hinted in Section 5's snapshot card.
3. **Vertical-slice concept notes with typed Layer 1 anchors** - Sections 2, 3.
4. **Auto-review against staleness via typed wires** - Section 2, mentioned again in Section 5 corpus dashboard.
5. **GitHub-as-backbone** - Section 4, mentioned again in Section 5 (Edit on GitHub links).

These are the framings that distinguish oracle from a wiki or chatbot. Repeating them across sections is intentional.

---

## Stack and hosting recommendation

**Frontend:** Firebase Hosting. Same pattern as matchscheduler. Free tier sufficient for ~60 dev-server users + future public phase. Static SPA or scrolling-narrative single-page.

**Auth:** GitHub OAuth (for contribution actions: propose topic, submit feedback, claim issue). Discord OAuth or invite-link gate for v1 closed-beta access control.

**MCP backend:** Unraid + cloudflare tunnel. Same pattern as matchscheduler's existing services. The MCP server itself is the existing TypeScript implementation at `apps/qw-oracle/serve/mcp/`; promoting from local-only to public requires hosting + auth + rate-limiting, no rewrite.

**LLM-for-playground:** Haiku 4.5 via Anthropic API. Rate-limited per session.

**Contribution backbone:** Public `qw-oracle` repo on GitHub. Issues + PRs as designed.

**Domain:** `oracle.quake.world` (TBD with vikpe). Slots cleanly next to the existing assets/maps/hub services-family.

This is a recommendation, not a binding decision. Mockup pass on claude.ai/design will not depend on these choices; iterate after implementation planning.

---

## Build cost (rough)

| Section | Build estimate |
|---|---|
| Section 1 visuals (3-tier reveal) | ~1 week |
| Section 2 visuals (vertical slice + auto-review demo) | ~3-4 days |
| Section 3 visuals (anatomy + small-note strips) | ~3-4 days |
| Section 4 (propose-flow + GitHub integration) | ~1 week |
| Section 5 (playground + browse + dashboard) | ~2-3 weeks (heaviest custom piece) |
| Skills bundle as claude-plugins package | ~3 days |
| MCP public hosting (auth + rate-limit) | ~3-4 days |
| Layer 2 mining tool (parallel arc, see below) | ~1 week |

**Total v1 estimate:** roughly 6-8 weeks of focused work, with the playground + browse + dashboard view in Section 5 being the longest single build.

This is a build estimate, not a commitment. Slipgate-app remains the higher-pressure project; showcase work is paced around Slipgate's Managed Mode arc.

---

## Parallel arc: Layer 2 mining for seed topics

Not v1-blocking, but produces critical input for v1: a populated topic queue at launch.

**Why parallel:** the showcase site's empty-queue-at-launch is a much weaker recruiting position than "here are 30 questions from your community waiting to be answered." Pre-seeded topics from Layer 2 mining give the queue substance on day one.

**Sub-tracks:**

1. **Re-ignite Discord scraping.** Existing scraper at `apps/qw-oracle/scripts/import-*.mjs` (state: dormant per memory). First step: read what is there, determine current-state, channel allowlist, what changed in Discord API since last run.
2. **Trim/filter pass.** Define what is in-scope for mining. Likely filters: help-flavored channels only, drop bot messages, drop one-word messages, drop emoji-only messages, drop known shitposters.
3. **Hybrid retrieval (FTS5 + vector).** Keep SQLite + FTS5 as the primary store; add `sqlite-vss` extension for embeddings sidecar. FTS5 for exact-phrase, vectors for paraphrase. Required for good question-clustering in step 4.
4. **Mining tool.** SQL pass against trimmed corpus -> question-shape heuristics -> resolution heuristics -> LLM cluster analysis -> ranked output of unresolved-question candidates with cluster-volume + representative quotes + suggested shape.
5. **Manual review.** Operator filters 20-40 candidates down to 5-10 elevated as concept-note seeds. Each becomes a GitHub Issue with `proposed` + `from-layer2-mining` labels at site launch.

**IRC scope:** IRC stays in Layer 2 for preservation depth. Mining is Discord-only - 10-year staleness is a real signal-quality issue, and most QW-as-it-is-played-today expertise lives in Discord.

**Output integration with the showcase:** mined topics seed the GitHub Issues queue before site launch. The site's Section 4 topic-discovery view shows them with their evidence-of-gap quotes already attached. Optional showcase widget: "Top unresolved questions in QW community chat history" on the homepage as a permanent recruiting hook.

---

## Open questions (for mockup pass and beyond)

These are not v1-blockers but should be revisited as design lands:

- **Domain.** `oracle.quake.world` is the working assumption; pending vikpe confirmation.
- **Closed-beta gate mechanism.** Discord OAuth vs invite-link. Discord OAuth is more durable; invite-link is simpler. Pick during implementation.
- **Public-phase trigger.** When does the closed-beta open up? Soft signal: when the curated corpus reaches some threshold of breadth + quality. Defer; not a v1 question.
- **Standard-writing.** When do "guidelines" need to be a published document vs evolving organic practice? Current lean: the corpus + visible review threads ARE the guidelines until friction shows up. Revisit if friction shows.
- **MCP plugin distribution channel.** `claude-plugins` registry vs git repo install vs npm package. Pick the lowest-friction option that exists when v1 ships.
- **Image storage.** Out of v1 by explicit decision. Expect to surface again when Section 3 anatomy view or contributor flows would benefit from screenshots. Image-storage design is a downstream task this site surfaces but does not solve.

---

## Related work

- **Parking doc this spec implements:** `docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` - graduates from parked to active on landing.
- **Three-layer architecture spec:** `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`.
- **Layer 3 pivot design:** `docs/superpowers/specs/2026-04-23-layer3-pivot-design.md` - the two-path curation framing.
- **Concept-note authoring template:** `apps/qw-oracle/concept-notes/README.md` - frontmatter, shapes, voice/length tiers, R7 authority grounds.
- **Stewardship playbook:** `apps/qw-oracle/concept-notes/OPERATIONS.md`.
- **`guide-rewrite` skill:** `~/.claude/skills/guide-rewrite/` - the authoring recipe that gets packaged for tooled contributors.
- **Web-services family vision:** memory `project_slipgate_web_services_vision.md` - assets/maps/hub triad oracle slots next to.

---

## Next step

Take this spec to claude.ai/design as the brief for a first visual pass. Iterate the mockups against this spec rather than against fresh conversation. When mockups stabilize into a chosen direction, write an implementation plan via the `writing-plans` skill.
