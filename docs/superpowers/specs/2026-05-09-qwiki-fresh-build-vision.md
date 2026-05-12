---
status: brainstorm in progress (Passes 1-3 of 6 complete; Pass 4 next)
arc: 2026-05-09-qwiki-sandbox
parking: docs/superpowers/parking/2026-05-11-qwiki-sandbox-pass4-handoff.md
supersedes: docs/superpowers/specs/2026-05-09-qwiki-sandbox-architecture.md (modernize-in-place framing, pivoted 2026-05-09)
---

# QWiki Fresh-Build -- Vision

Living spec for the qwiki-sandbox arc, fresh-build framing. Drain destination for the conceptual passes (1-6) of the arc-brainstormer. Architecture spec is a separate doc downstream.

## Conceptual passes overview

- Pass 1 -- what wikis are for, generically (COMPLETE)
- Pass 2 -- current QWiki audit, purpose lens (COMPLETE)
- Pass 3 -- ecosystem map: where each kind of knowledge lives (COMPLETE)
- Pass 4 -- wiki's unique role + SHOULD list (pending)
- Pass 5 -- contributor model + freedom-vs-structure (pending)
- Pass 6 -- content strategy: extract / new-build / abandon (pending)

Architecture passes (namespaces / templates / Page Forms+SMW / ecosystem-integration mechanics / discoverability+UX / cutover+deployment) deferred until conceptual passes 1-6 land. Their shape will be informed by what 1-6 settle.

---

## Pass 1 -- what wikis are for, generically -- LOCKED

**Scope:** zero-experience baseline on the wiki form. Frame for subsequent passes. Not QWiki-specific.

### 1.1 Unique strengths -- LOCKED

A wiki's core strength is collaboratively-maintained narrative knowledge with crosslinking, where each page is the *current best version of a thing*, edited in place. The four ingredients matter together; remove any one and you have something else:

- **vs forum / Discord:** Forums are temporal -- message-N+1 buries message-N. Wikis consolidate the answer in one canonical page.
- **vs structured DB / hub.quakeworld.nu:** DBs store facts in known shapes. Wikis hold context that doesn't fit a schema -- *why* this matters, *how* it evolved, *what* the community thinks.
- **vs blog / static site:** Blogs are single-author, time-anchored. Wikis are multi-author, evergreen.
- **vs AI synthesis (oracle):** Wikis are a source the synthesis draws from, not a competitor.

Irreducible offering: **prose + crosslinks + edit-in-place + page-as-current-canonical**, *under live multi-author maintenance*. The italicized clause is load-bearing -- it is the precondition that makes the other four valuable.

A wiki is not "a website you can edit." MediaWiki provides the substrate; the wiki form (the social object) only exists when there is an active community editing.

### 1.2 Failure modes -- LOCKED

Four failure modes, ordered by how much they apply to QWiki today:

1. **Activation collapse -- too few live editors.** The fundamental one. Once decay starts it self-reinforces: contributors arriving see a graveyard and don't bother. QWiki is here -- 63% stale 5+ years.
2. **Scope drift / kitchen-sinking.** When the wiki tries to be everything, contributions cluster around what's easy, not what's needed. Old QWiki has 5,903 stub player pages because "make a player page" became the path of least resistance.
3. **Quality-floor collapse / stub normalization.** When stubs outnumber substantial pages (4,726 vs 679 in QWiki Main NS), the wiki teaches contributors that low-effort is the norm. InfoboxComplete-444 says someone tried to draw a quality line; the long tail says it didn't hold.
4. **Structural mismatch -- DB-shaped data forced into wiki form.** Records (match results, player stats, leaderboards) want to live in a DB; prose-and-crosslinks fights that data. Hub V2 will obsolete that role for QWiki.

**Implication, load-bearing for downstream passes:** design for a thin-but-active contributor base. The brief assumes scarcity of editors. Tooling (templates / forms / contribution UX) is load-bearing, not nice-to-have.

### 1.3 Freedom dimensions -- LOCKED

"Wiki freedom" denotes three things with different costs:

1. **Edit freedom** -- who can edit. Spectrum: open/anonymous (Wikipedia-default) -> account-gated low-barrier signup -> account-gated admin-approved (QWiki-current).
2. **Schema freedom** -- what shape pages can take.
3. **Topic freedom** -- what topics can have pages.

**Locked operating points for the new wiki:**

- **Edit freedom:** account-required, low-barrier signup, no admin gating. Edit history preserved. Filters bots and casual vandalism while keeping the latent contributor pool reachable.
- **Schema freedom:** deliberately constrained. Schema-per-page-type defined by us. Free-form prose slots *inside* the schema.
- **Topic freedom:** deliberately constrained. Topic must fit a defined page-type, or a new page-type gets explicitly added.

**Net shape: structured-with-narrative-slots + credentialed-but-not-curatorial on-ramp.** The inversion of how QWiki is built today (free-form-with-optional-templates). This is what makes wiki contribution tractable for a small community pool.

### Pass 1 carry-forwards

- **Pass 2:** What's the current QWiki gate's actual mechanism (admin-approved vs account-required)? How much of the stagnation traces to it being too tight?
- **Pass 2:** Latent contributor pool from the Discord server (~30-50 named users in the wiki-server sidebar) vs current active editors -- the gap is symptom, not cause. Audit current contributor pattern with this in mind.
- **Pass 5:** Signup + onboarding flow. **Discord OAuth + Quad-bot auto-provisioning** is the candidate mechanism (Quad already has Discord-server presence; clean reuse rather than greenfield).
- **Pass 5:** Contribution UX is load-bearing. Templates / forms / form-driven editing for structured content + free-form prose where it earns its place. Tooling investment cashes in here.
- **Pass 5 / architecture:** Inversion of QWiki's current default -- structured-with-narrative-slots, not free-form-with-optional-templates. Page-type-defining schema is the substrate, not the exception.

---

## Pass 2 -- current QWiki audit, purpose lens -- LOCKED

**Scope:** what QWiki is *doing* today (de-facto roles, contributor pattern, machine-readability state). Not implementation. Frame for Pass 3 + Pass 4.

### 2.1 Roles QWiki fills today -- LOCKED

**Alive roles** (currently maintained):
- **Tournament event coordination + archival** -- `Leagues` 53% touched in last 2 years, `Online_Tournaments` 73%, `Team_Tournaments` 73%, `InfoboxComplete` (the engaged set) 70%. Operator + bps + Alice all confirm this holds the wiki up.
- **Map descriptions** -- 205 pages, 85% touched in last 5 years. Depth uneven (Dm2 19KB / Dm3 13KB / E1m2 9KB rich; Aerowalk near-stub). 4on4_Maps subcat has 15 entries; 1on1_Maps has 1 -- structural taxonomy is partial.
- **File/image hosting** -- 7GB+ on disk (corrects earlier 2.8GB which was just `image` table originals). Quietly load-bearing -- every tournament page references images.
- **InfoboxComplete-tagged subset** -- 444 pages, 70% recently touched. The community quality-line; small but engaged.

**Attempted-but-failing roles:**
- **Player directory** -- 5,899 pages, 57% explicitly stub-tagged, mostly stale 5+ years. Bursty mass-edit cleanups in country buckets (Russian wave: 750 edits Jan 2025, 84% stub-or-tiny -- bulk dump not curation; Norwegian / Players_with_no_profile_picture similar). Hub V2 obsoletes this role going forward.
- **Mode + mechanic + tool descriptions** -- `Game_modes` 17, `Tools` 11, `Clients` 11. Genuinely tiny. KTX source links to wiki for mode descriptions: 15 of 27 modes have pages, half are stubs. **The role wikis are uniquely good at, currently failing hardest.** This is the central content gap the new wiki must fill.

**Not-current-but-Pass-4-candidate roles** (operator named explicitly):
- **Community section** -- interviews, podcasts, columns, written long-form content. Purity columns (280KB) are the legacy artifact. Operator wants this revived. Currently archived rather than curated.
- **History / timeline visualization** -- LAN events, tournament finals, tech breakthroughs (HUD editor introduction, popular client introductions). Currently MISSING. Strong candidate for unique-role-no-other-site-handles.
- **ELO** correction -- not encyclopedic; it's a player-elo-rated list. Single-purpose data table that is structurally DB-shaped. Hub V2 territory.

**Pattern:** alive where content shape fits the wiki form (narrative + crosslinks + maintainable) AND contributor motivation is cyclical (tournaments come back each season, so tournament pages come back). Failing where content shape fights the form (records = DB-shaped) OR motivation is one-time (a stub created in 2008, never revisited).

### 2.2 Contributor pattern -- LOCKED

**Concrete pool today** (operator firsthand):
- **Alice** -- active on later tournaments. Quality contributor. Pass 5 stakeholder.
- **Link** -- active, undisciplined. Adds pages with weird inconsistent formats. The canonical "what schema constraints prevent" -- in a structured-with-narrative-slots wiki, Link's contribution friction rises but the result stays usable.
- **Carapace** -- tried EQL cleanup, gave up midway. The canonical *curator-burnout* pattern.
- **Mystery Russian sweeper** -- bulk-dump pattern, single-month bursts of stubs (84% stub-or-tiny).
- **Tournament organizers** -- anonymous drive-bys, touch their event pages around the event, then leave.

**The pattern in plain English:** 2-4 active discipline-varied editors + tournament-organizer drive-bys + occasional bulk-import incidents. **NOT 30 people editing organically.** This concretizes the Pass 1 "design for thin-but-active contributor base" implication.

**Tooling implications** (Pass 5 carry-forward):
- Support sweep-mode curator workflows (the hypothetical "Carapace v2" who doesn't burn out on EQL backfill).
- Support drive-by structured input (organizer fills a form, page renders).
- Filter undisciplined random-format edits via schema enforcement (Link's reality).

**Edit-gate mechanism** -- admin-approved-by-invitation (operator was "invited," didn't sign up). Highest-friction gate. Likely contributor to stagnation: Discord pool of ~30-50 latent editors vs ~2-4 active = the gate suppresses conversion.

### 2.3 Wiki as data source -- LOCKED

**Today's QWiki is human-readable but machine-unreadable.** SMW capability is installed; property discipline isn't (InfoboxComplete-444 = ~5% conform). Effectively zero machine-mineable structured data despite the technical capability sitting there.

**The new wiki's data-source value is NOT direct query-target for downstream services.** Wiki and oracle have different formats by design (wiki = human narrative + crosslinks; oracle = curated concept notes for AI synthesis). Wiki content can't directly feed oracle queries.

**It IS dramatically easier-parse upstream.** Structured wiki content is parsable into oracle's `concept-notes/` .md files. Wiki feeds oracle's curation work, not direct queries.

**Author-once-harvest-many** -- the load-bearing principle (operator's words, paraphrased): "Whats the point of just creating it for my oracle.. when i could be creating it for the wiki, and harvesting it with ease after." Author at wiki (canonical narrative source), harvest downstream (oracle, hub, future AI services). Don't duplicate authorship in private .md files.

**Flagship case:** KTX modes -- 27 modes total, only 15 have wiki pages, half of those are stubs. This is the work that would otherwise happen in oracle's `concept-notes/`. Doing it in the wiki means humans + oracle + future hub + future AI services all inherit the work. Pass 6 will firm this up as the canonical extraction-vs-new-build case.

### Pass 2 carry-forwards

To Pass 4 (wiki's unique role + SHOULD list):
- Revive "community section" role (interviews / podcasts / columns; Purity columns are the legacy artifact).
- History / timeline visualization role -- strongest candidate for unique-no-other-site role.
- Scrapable / queryable for AI consumption is a SHOULD-list pillar -- not just human-readable.
- Tournament page template shape already named by operator: **Description / Rules / Format / Maps / Signups / Results**.
- **Author-once-harvest-many** as a Pass 4 design pillar.
- Stakeholder-pitch framing: fresh-build IS "upgrade taken to its logical extreme + URL preservation" -- the upgrade Alice/bps wanted, done thoroughly. Same URLs, modernized substrate, dead weight pruned.

To Pass 5 (contributor model + freedom-vs-structure):
- **Alice-flexibility reconciliation needs explicit confirmation.** Proposed: schema-bones for the consistent fields (description / rules / format / maps / signups / results), narrative slots inside for the variable parts (weird Frankenstein lineup rotations etc.). Alice keeps flexibility on the parts that vary, gains queryability on the bones.
- Contributor pool is concrete (Alice / Link / Carapace / mystery sweeper / tournament organizers). Tooling must support sweep-mode + drive-by + filter-undisciplined.
- Edit-gate is admin-approved-by-invitation today; new wiki uses Discord OAuth + Quad bot auto-provisioning (Pass 1 carry-forward, still standing).

To Pass 6 (content strategy):
- KTX modes are the flagship "author at wiki" case -- fill 12 missing + clean 8 thin. Reference instance for other underdeveloped-but-attempted roles.
- Map import policy needs substantial-vs-stub tag per page (depth uneven; Dm2/Dm3/E1m2 substantial, Aerowalk near-stub).
- ELO is DB-shaped, not wiki-shaped -- abandon-or-hand-off-to-Hub-V2 candidate.
- Russian-player-bulk-dump precedent: bulk imports without curation create stubs. Whatever import policy we land on must NOT leave that pattern in place.

## Pass 3 -- ecosystem map -- LOCKED

**Scope:** for every kind of QW knowledge, where across the ecosystem does it most naturally live. Frame for Pass 4 (wiki's unique role + SHOULD list) and Pass 6 (content strategy).

### 3.1 Ecosystem members + scope inventory -- LOCKED

The ecosystem reorganized during this pass from "8 peers" into a federation-with-peers shape: `quake.world` is an umbrella domain hosting most consumer-facing surfaces; Oracle, parsers, Discord, forum sit outside as peers.

#### quake.world federation (consumer-facing portal family)

- **`wiki.quake.world`** -- THIS arc; the new wiki. Integrated visually and navigationally with the rest of the family.
- **`hub.quake.world`** -- Hub V2 (xantom). Owns today: live-server view with in-browser FTE spec / quick join; replay/playback of any scraped game; match-data API (tournament sites use Hub URLs as canonical match reports). Owns when shipped (gated on demo-parser + matching demos to old EQL/NQR DBs): tournament archive over the 1TB demo trove; structured player + clan profiles derived from match/demo data. Does NOT own and does not aim to own: tournament *creation/running*; narrative/prose content.
- **`assets.quake.world`** (with `maps.quake.world` as alias resolving to `assets.quake.world/maps`) -- all binary community assets: skins, sounds, configs, HUDs, crosshairs, charsets, textures, **and maps (BSP files)**. Rich interactive surfaces: model viewer with live texturing, map fly-around, wireframe. Primary consumer is direct web users browsing rich pages; slipgate-app is ONE consumer via SHA256-manifest API. Per-asset + per-map narrative absorbs into the rich page's "History" section -- no parallel wiki narrative.
- **`servers.quake.world`** -- server browser. Functional surface; no knowledge ownership.
- **`tools.quake.world`** (already exists as link directory) -- functional surface; no knowledge ownership.
- **`tournaments.quake.world`** -- planned for Phase 2 of vikpe's roadmap (post-Hub-V2's tournament-archive validation). Will own structured tournament management (current + past) and per-tournament narrative as history sections on rich pages.
- **quake.world frontpage** -- portal/newsfeed aggregator across the family. Owns news/announcements.
- **Implicit future sub-properties** (named during the pass, not in original handoff list): `players.quake.world` / `clans.quake.world` (or equivalent sections) for the per-player + per-clan rich pages -- "the best clan page a QW clan wants, modular and customizable." These cede the player/clan domains fully when shipped.

#### Peers outside the federation

- **Oracle (qw-oracle)** -- knowledge service. Dual identity: *substrate* (Layer 1 source-extracted engine facts + Layer 2 chat corpus + Layer 3 curated concept-notes + MCP server -- different abstraction layer from consumer surfaces); *planned consumer surfaces inside the family* (chatbot on quake.world frontpage; Discord chatbot mode; slipgate-app help panel; user-pluggable MCP). Wiki relationship: Oracle is *downstream* of wiki content (author-once-harvest-many). Wiki authors canonical narrative; Oracle's curation pipeline harvests into Layer 3 concept-notes; chatbots answer using the harvested + Layer 1/2 substrate. Not competitors.
- **Xantom's parsers** -- data-extraction pipeline layer. Owns: demo parser, BSP parser, KTX stats extraction. Feeds: hub.quake.world (match data + future tournament archive), assets.quake.world/maps (BSP-derived map data), eventually tournaments.quake.world. **No relationship with the wiki -- by design.** Wiki is human-curated; no auto-pop pipelines feeding wiki content from external structured sources.
- **Discord** -- live community discussion. Owns: real-time discussion, social presence, bot integrations (Quad voice; future Oracle chatbot). Wiki relationships: contributor-pool source (Discord OAuth + Quad-bot auto-provisioning signup mechanism); future Oracle consumer surface (chatbot mode); source of experimental Layer 2 corpus (downgraded from "important" to "spice on top" -- Layer 1 + Layer 3 are load-bearing, Layer 2 is X-factor). Owns NO wiki knowledge directly.
- **Forum** -- legacy archive. Not on roadmap, no active development, no planned knowledge-ownership role going forward. Out of scope for this arc.
- **`maps.quakeworld.nu`** -- existing peer maps archive (folder layout: GPL / CORE / BASE / ALL, with BASE = actively played + tournament-included). Pre-existing; presumably absorbed/superseded by assets.quake.world's maps section when ready.
- **Old qwiki.nu** -- legacy state. Becomes read-only archive after cutover. Nothing migrated *from* it after cutover. Tarpit infrastructure preserved (ciscon's bot defense). Contributors who want exhaustive history preservation have it here indefinitely.

### 3.2 Knowledge-kinds catalog -- LOCKED

27 kinds across 7 clusters. Several handoff-seeded kinds split into structured + narrative halves because the halves have different owners. New kinds surfaced during the pass: cross-cutting narrative, distribution narrative, editorial images, Layer 3 concept-notes, LAN event content (speculative).

**Cluster A -- Match / event / structured-data:** A1 match-level data (demos/ktxstats/frags/results/replays); A2 tournament structured data (brackets/signups/results/season standings); A3 tournament narrative (Hall-of-Fame writeups, era recaps); A4 live-server/current-game data; A5 LAN event content (speculative future).

**Cluster B -- People + collective:** B6 player profile structured; B7 player profile narrative; B8 clan profile structured; B9 clan profile narrative.

**Cluster C -- Map / asset:** C10 map structured data (BSP-derived); C11 map narrative; C12 customization asset binaries + metadata; C13 per-asset narrative.

**Cluster D -- Engine / client / distribution:** D14 engine facts (cvars/commands/macros/...); D15 distribution narrative (nQuake, ezQuake, FTE, qwfwd, qizmo, MVDSV); D16 game-content facts (id1 maps, baseline mechanics).

**Cluster E -- Permanent wiki narrative:** E17 mode + mutator descriptions (KTX flagship); E18 mechanics / gameplay-physics; E19 history / timeline / era writeups (currently MISSING); E20 cross-cutting narrative; E21 lore / inside jokes / community memory; E22 columns / interviews / podcasts; E23 tutorials / how-tos.

**Cluster F -- Operational / ephemeral:** F24 news / announcements; F25 editorial images (logos/screenshots in articles -- distinct from C12 customization asset binaries).

**Cluster G -- Real-time discussion + AI:** G26 community chat (Discord -> Layer 2 corpus); G27 curated patterns / synthesized guidance (Oracle Layer 3 concept-notes).

### 3.3 Knowledge-kind -> canonical owner -- LOCKED

Three categorical patterns emerged for the wiki's relationship to each kind:

- **Category 1: Domains that fully cede long-term** (transitional Track A only) -- maps + per-asset, clans, players, tournaments. Wiki has no long-term claim on either structured or narrative halves; the federation surface absorbs both. Transitional wiki coverage exists only where it serves dual purpose (Hall-of-Fame for humans + Oracle primer).
- **Category 2: Domains that stay wiki-resident permanently** (Track B) -- modes, mechanics, distributions, history/timeline, cross-cutting narrative, lore, columns, tutorials.
- **Category 3: Functional surfaces with no knowledge ownership** -- servers.quake.world, tools.quake.world.

**Routing principle locked: *author at the layer that has long-term ownership.***

| Domain has long-term home at... | Authoring flow |
|---|---|
| Wiki (Track B / Category 2) | Human writes wiki page -> Layer 3 concept-note distills downstream |
| quake.world federation (players/clans/tournaments) | Wiki transitional (Hall-of-Fame, content-rich profiles) -> Layer 3 distills -> cede to federation when shipped |
| assets.quake.world (maps + per-asset narrative) | **Skip wiki entirely.** Direct Layer 3 .md authoring for the handful of Oracle-primer-worthy entries (~10 maps, half rich-prose). Old wiki existing pages remain archive |
| Oracle Layer 1 / `qw` namespace | Source-extracted; nothing for humans to author |

**Two-layer authoring is not redundancy:**
- Wiki page = canonical *human-readable* narrative. Crosslinked, multi-author, edit-in-place. Human audience.
- Layer 3 concept-note = LLM-readable *synthesis* of wiki + Layer 1 + Layer 2. Curated patterns, structured frontmatter, distilled guidance. AI audience.
- Voyage embedding indexes both -- Layer 3 as primary search target (curated synthesis), wiki content as supplementary raw-source coverage. Embedding wiki does not replace Layer 3 authoring.

**Full mapping table** (long-term canonical owner + transitional notes):

| # | Kind | Long-term canonical owner | Transitional / notes |
|---|---|---|---|
| A1 | Match-level data | hub.quake.world | Canonical today |
| A2 | Tournament structured data | tournaments.quake.world (Phase 2) | Wiki transitional (Alice's lane); structured-bones-with-narrative-slots |
| A3 | Tournament narrative | tournaments.quake.world (history on rich pages) | Wiki transitional with Hall-of-Fame consolidation (EQL/NQR/Smackdown one page each, NOT 28 per league) |
| A4 | Live-server / current-game data | hub.quake.world + servers.quake.world | Canonical today |
| A5 | LAN event content | TBD | Park as Pass 6 / future arc |
| B6 | Player profile structured | players section of federation | Wiki transitional, content-rich players only (no stubs) |
| B7 | Player profile narrative | players section of federation (prose slot) | Wiki transitional, full cede on graduation |
| B8 | Clan profile structured | clans section of federation | Wiki transitional, content-rich clans only |
| B9 | Clan profile narrative | clans section of federation (prose slot) | Wiki transitional, full cede on graduation |
| C10 | Map structured data | assets.quake.world | BSP-parser-derived |
| C11 | Map narrative | assets.quake.world (history sections) | **NOT new-wiki territory.** Old wiki pages remain archive; Oracle .md authoring for ~10 Oracle-primer-worthy maps |
| C12 | Customization asset binaries + metadata | assets.quake.world | slipgate is one consumer |
| C13 | Per-asset narrative | assets.quake.world | Same as C11 -- not new-wiki territory |
| D14 | Engine facts | Oracle Layer 1 | Source-extracted |
| D15 | Distribution narrative | **wiki Track B permanent** | The 11 Tools + 11 Clients pages -- distributions don't fit assets.quake.world's per-asset rich-page model |
| D16 | Game-content facts | Oracle `qw` namespace | BSP-derived |
| E17 | Mode + mutator descriptions | **wiki Track B permanent** | KTX 27-modes flagship; Oracle Layer 3 harvests |
| E18 | Mechanics / gameplay-physics | **wiki Track B permanent** | Oracle Layer 3 harvests |
| E19 | History / timeline / era writeups | **wiki Track B permanent** | Currently MISSING; new wiki fills the gap |
| E20 | Cross-cutting narrative | **wiki Track B permanent** | Doesn't fit per-entity surfaces |
| E21 | Lore / inside jokes / community memory | **wiki Track B permanent** | Track B core |
| E22 | Columns / interviews / podcasts | **wiki Track B permanent** | Purity legacy artifact; revival |
| E23 | Tutorials / how-tos | **wiki canonical** (Track B); Layer 3 distills patterns | Each imported tutorial reviewed for currency before adoption |
| F24 | News / announcements | quake.world frontpage portal | Wiki not strong at temporal; no wiki news section |
| F25 | Editorial images | wiki | Distinct from C12 customization assets |
| G26 | Community chat | Discord (live) -> Oracle Layer 2 (corpus, experimental) | No wiki role |
| G27 | Curated patterns / synthesized guidance | Oracle Layer 3 concept-notes | Downstream of wiki + Layer 1 + Layer 2 |

### 3.4 Duplications + bridges -- LOCKED

**Bridges (data flow):**

| Source | Destination | Mechanism | Status |
|---|---|---|---|
| Xantom's parsers | hub / assets / future tournaments | Direct pipeline | Live / planned |
| Wiki Track B pages | Oracle Layer 3 concept-notes | Manual harvest | Future arc -- pipeline doesn't exist |
| Wiki transitional Cluster B | Oracle Layer 3 concept-notes | Manual harvest | Same future arc |
| Wiki content | Voyage embedding index | Automated chunk + embed | Future arc |
| Old wiki | Read-only archive | None | Status quo |
| Discord chat | Oracle Layer 2 corpus | Existing import pipeline | Live (717K messages) |

**Intentional duplications + sync discipline (under C-prime loose-coupling):**

- **Player/clan/tournament structured fields:** wiki transitional + federation long-term; **NO sync v1**; structured-bones designed sync-shaped for future opt-in. Drift acceptable -- wiki version "gets stale" rather than divergent truth.
- **Map narrative across old wiki / new Oracle .md / future assets.quake.world history:** manual harvest from old wiki to .md; no sync. Old wiki = archive, .md = canonical for Oracle gap, assets.quake.world history = long-term.
- **Mode descriptions:** wiki canonical; KTX source code cites wiki URL (URL preservation locked). Bridge, not duplication.

**Sync architecture commitment (deferred):** when (or if) federation surfaces eventually push structured fields into wiki schema-bones, the contract is **federation = source of truth, wiki = mirrored display**. Wiki edits to structured fields discarded on next sync. Prose slots remain wiki-authored. Avoids bidirectional-edit-conflict; capture as architecture carry-forward.

**Accidental duplication risks to prevent at schema level:**

1. Wiki "Map" page-type -- **do not allow.** New wiki has no per-map pages; schema enforces.
2. Wiki "Asset" page-type -- **do not allow.**
3. Wiki "News" page-type -- **do not allow.**
4. Layer 3 concept-notes that copy wiki articles wholesale rather than synthesizing -- prevented by Layer 3 authoring template (`apps/qw-oracle/curated/concept-notes/CLAUDE.md`).
5. Per-season historical-tournament pages (EQL S1, S2, ...) -- **schema enforces:** tournament-page-type is either "active/upcoming season" or "historical league HoF." No per-season-historical-page.

### 3.5 Gaps -- LOCKED

**Inside the new wiki's scope (Pass 4 SHOULD list input):**

1. History / timeline / era writeups -- Track B / E19; currently MISSING.
2. Mode + mutator descriptions -- Track B / E17; KTX 27-modes flagship.
3. Mechanics / gameplay-physics -- Track B / E18.
4. Distribution narrative refresh -- Track B / D15; revival of 11 Tools + 11 Clients.
5. Cross-cutting era / scene narrative -- Track B / E20; genuinely absent today.
6. Tutorials with coordinated coverage -- Track B / E23; each imported tutorial needs manual currency review.
7. Server admin documentation -- Track B / E18-adjacent. NOT greenfield: `quakeworld.nu/wiki/How_to_server` is current; harvest + review + .md synthesis.
8. Map authoring / modding scene knowledge -- Track B / E22-adjacent; new authoring.
9. Demo analysis / notable-demo writeups ("clash of the titans" reports) -- Track B / E20-adjacent. Future possibility, not v1 priority; Pass 4 decides cut.
10. Tournament Hall-of-Fame consolidation -- Transitional Track A / A3; new authoring from scattered old-wiki seasons.

**Outside the new wiki's scope (other-home / Pass 6 / future-arc flags):**

11. Live tournament creation tool (real one, not bandaid) -- tournaments.quake.world Phase 2; Qwicky-revival possible interim.
12. Stats analytics / cross-season / ELO / "best player of all time" queries -- Hub V2 enhancement layer.
13. Asset creator credits + cross-creator scene history -- split: per-asset -> assets.quake.world; scene-history -> wiki (folds into #8 map-authoring cluster).
14. Public-web beginner onboarding flow ("first hour of QW") -- slipgate-app is the planned entry (replaces decade-old nQuake installer). NOT wiki's job. Out of arc scope.
15. Hardware / pro player configs / settings comparison -- community-managed; low priority; not wiki.
16. Streaming / content creator / VOD discovery -- quake.world frontpage (fav-vods channel exists in xantom's dev server); not wiki.
17. Translations / non-English documentation -- explicit non-goal v1; English-only.

### Pass 3 carry-forwards

**To Pass 4 (wiki's unique role + SHOULD list):**

- **Three-track wiki role model is LOCKED**, generalizing from per-tournament structuring to per-domain routing:
  - Track A (gap-filler with graduation contract) -- Category 1 domains (clans/players/tournaments). Wiki provisionally owns; designed migration-shaped; full cede when federation surfaces ship.
  - Track B (irreducibly-wiki) -- Category 2 domains. Wiki permanent; Oracle Layer 3 harvests downstream.
  - Track C (Oracle primer) -- ecosystem-integration role. Wiki content engineered for embedding harvest. Track C importance elevated: Layer 2 is experimental "spice"; Layer 3 (wiki-fed) is load-bearing.
- **The wiki's unique-role pitch** falls out of Category 2 + cross-cutting narrative + the embedding-substrate role. Pass 4 should pitch the wiki as: "the canonical home for what wikis are uniquely good at -- prose, crosslinks, multi-author history, narrative across entities -- engineered to also be Oracle's grounding substrate so the AI can make sense of QW community references."
- **SHOULD list seeds** (from gaps + Category 2):
  - KTX 27-modes flagship build-out
  - History/timeline section (currently MISSING)
  - Mechanics / gameplay-physics build-out
  - Distribution narrative revival (Tools + Clients refresh)
  - Cross-cutting era narrative
  - Tutorials with currency review
  - Server admin documentation (harvest path)
  - Map authoring / modding scene (new authoring)
  - Tournament Hall-of-Fame consolidation (transitional)
  - Player + clan content-rich pages, no stubs (transitional)
  - Columns / interviews revival (Purity legacy)
  - Demo analysis writeups (deferred decision)
- **Unique-role-no-other-site candidates** to highlight: history/timeline, cross-cutting narrative, demo analysis. Hub V2 + assets.quake.world + tournaments.quake.world cover their structured domains but none of these.

**To Pass 5 (contributor model + freedom-vs-structure):**

- **Stakeholder-messaging concern (narrow-scope pivot vs old-wiki contributors):** the pivot changes the social contract from "preserve everything" to "intentionally narrow scope." Framing strategy to soften without compromising design:
  - Old wiki doesn't die -- becomes archive. URL preservation already locked. Nothing deleted.
  - New wiki is "the slice that's irreducibly wiki-shaped," not "a smaller wiki." Pitch: quake.world handles structured/dynamic stuff richer than wiki can; new wiki holds what only wiki can do well, done properly.
  - Contributor crowd splits naturally: exhaustive-history crowd has old wiki archive; living-community-substrate contributors have new wiki.
  - Most active old-wiki contributors today (Alice, tournament organizers, mode/mechanic authors) work in domains the new wiki still serves -- not displaced.
- **Schema-enforcement at page-type level** (carries from 3.4 duplication-prevention list): wiki has no Map / per-Asset / per-Season-Historical-Tournament / News page-types. Schema constrains contributor creativity to prevent stub-farming.
- **Light-touch + density-over-coverage** is the operating mode: Hall-of-Fame consolidation; content-rich profiles only; abandon stubs aggressively. Sustains the 2-4-active-editor reality from Pass 2.
- **Discord OAuth + Quad-bot auto-provisioning signup** stays as locked from Pass 1.

**To Pass 6 (content strategy):**

- **Per-domain content strategy per the routing principle:**
  - Maps + per-asset narrative -> skip wiki, direct Layer 3 .md authoring (~10 maps, half rich-prose). Source: harvest old wiki + create fresh.
  - Players/clans/tournaments -> wiki transitional with Hall-of-Fame + content-rich-only model; selective import from old wiki + new authoring. Abandon stubs.
  - Track B domains (modes/mechanics/distributions/history/etc.) -> wiki canonical; new authoring + harvest from old wiki where current.
- **Manual currency review** mandatory for every tutorial / How_to_server / older Track B article before adoption.
- **LAN event content (A5)** -- speculative future-arc; not v1 scope.
- **Demo analysis (gap #9)** -- defer decision; Pass 4 cuts or keeps.
- **Russian-player-bulk-dump precedent** -- whatever import policy lands must NOT permit recurrence of that pattern (no bulk imports without per-page curation).

**To architecture passes:**

- `wiki.quake.world` integration with the federation: shared theming, cross-property navigation, optional shared auth (Discord OAuth doubles as quake.world-family auth candidate).
- Schema-bones across Cluster B (player/clan/tournament transitional pages) **designed sync-shaped** even though v1 has no sync wired. Future federation->wiki sync becomes opt-in upgrade, not v1 dependency.
- Sync contract when (if) shipped: federation = source of truth; wiki = mirrored display for structured fields; prose slots remain wiki-authored.
- Voyage embedding pipeline + wiki-content harvest path to Layer 3 concept-notes: own future arc downstream of this one.
- Page-type schema enforcement: no Map / per-Asset / News / per-Season-Historical-Tournament page-types.
- `maps.quakeworld.nu` folder layout (GPL/CORE/BASE/ALL with BASE = actively played + tournament-included) is prior art worth referencing for assets.quake.world's maps section organization.

## Pass 4 -- wiki's unique role + SHOULD list -- LOCKED

### 4.1 Unique-role pitch -- LOCKED (amended during 4.2 to sync taxonomy)

**The pitch.** The new wiki is the canonical home for **prose, crosslinks, multi-author narrative, and community memory** -- work that has to be written in human language, edited in place, and read across multiple entities at once. The federation's structured surfaces (hub / assets / tournaments / per-player + per-clan rich pages) own per-entity data AND per-entity narrative slots; **the wiki owns narrative that is cross-entity or has no entity-owner** -- modes, mechanics, distributions, scene history, lore, tutorials, columns. It is also Oracle's grounding substrate: pages are authored so the curation pipeline can harvest them into Layer 3 concept notes the AI uses to make sense of QW community references.

**What only the wiki does in this federation:**

- **Mode + mutator + mod descriptions** -- variant-specific narrative (KTX modes flagship; mutators / rulesets; standalone mods like Painkeep / Rocket Arena) for how each variant plays where the structured surface holds only the bracket or the binary.
- **Combat baseline (mechanics + items + physics)** -- encyclopedic baseline that mode pages reference and deviate from (rocket jumping, item respawn behavior, weapon properties, engine-combat terminology).
- **Distribution narrative + setup** -- per-distribution wiki pages (ezQuake / FTE / MVDSV / KTX / qwfwd / qizmo / nQuake); each holds narrative + history + install + setup. Wiki-shaped, not assets-shaped (no binary viewer needed).
- **Tutorials + how-tos** -- cross-engine player-facing USAGE guidance (binds, scripts, movement drills, config, demos); install lives on distribution pages, server ops live on server-admin docs.
- **Community & Lore** -- columns / interviews / podcasts / inside jokes / traditions / cultural essays; two decades of texture (Purity columns as legacy template).
- **Oracle grounding substrate (Track C)** -- every wiki page is also Layer 3 input; chunking + dense context + L1/L3 cross-refs built into the authoring norm.

**Cut-axis (load-bearing for 4.2 onward):** "Cross-entity OR has no entity-owner" is the test. Federation entities (matches, tournaments, players, clans, maps, customization assets) have their own rich pages with per-entity narrative slots; wiki narrative scoped to a single federation entity goes on that surface, not the wiki. Wiki narrative spans entities or addresses non-entities (modes, mechanics, distributions, scene-eras, lore).

**Hall-of-Fame note:** explicitly NOT in the permanent unique-role list. Hall-of-Fame is transitional Cat 1 (wiki carries it until tournaments.quake.world Phase 2 subsumes the structured side). Lands in 4.2 SHOULD list as a transitional entry, not in the permanent pitch.

**4.1 amendments log (applied during 4.2 to sync taxonomy):**

- Original "Mode + mechanic + mutator descriptions" bullet **split into two** (modes/mutators/mods vs Combat baseline) to align with 4.2 entry split (#1 modes vs #2 baseline).
- **Dropped "History + timeline + era writeups"** bullet -- timeline reframed as derived view (parked for 4.5 future arc); era essays scatter across distribution pages (#3), Hall-of-Fame (#4), and Community & Lore (#8).
- **Dropped "Cross-cutting narrative"** bullet -- no standalone content; routes to #4 Hall-of-Fame (time-anchored events) or #8 Community & Lore (cultural commentary).
- **Merged "Lore + community memory" + "Columns + interviews + podcasts"** into single **"Community & Lore"** umbrella (matches 4.2 entry #8).

### 4.2 SHOULD list curation -- LOCKED (revised 2026-05-12: 8 -> 6 entries; Server Admin folded into Distributions; Hall-of-Fame + Player/Clan merged into The Scene; Glossary moved from Combat Baseline to Community & Lore; Maps + Customizations as nav-only external links)

**Framework:**

- **Track A (transitional):** wiki provisionally owns; designed for migration when federation surface ships.
- **Track B (permanent):** wiki canonical; no graduation target.
- **Priority v1:** launches with substantial content authored.
- **Priority v1.5:** page-types defined at launch; serious authoring shortly after.
- **Priority later:** page-types exist; opportunistic authoring as authors emerge.
- **Depth skeleton:** page-type defined, framework templates ready, no expected v1 fill.
- **Depth substantial:** serious content depth expected; v1 push for real authoring.
- **Depth flagship:** canonical demonstration of how the wiki should work; biggest push.

**Cut-axis test:** "cross-entity OR has no entity-owner" (from 4.1).

**SHOULD list (6 entries; matches 6-tile main-page nav 1:1):**

| # | SHOULD entry | Layer A tile name | Track | Priority | Depth |
|---|---|---|---|---|---|
| 1 | Modes + mutators + standalone mods (E17) | Modes | B perm | v1 | **flagship** |
| 2 | Mechanics + items + weapons (E18, glossary moved out) | **Game Content** (+ external Maps + Customizations) | B perm | v1 | substantial |
| 3 | Distribution narrative + setup + server admin (D15 + E18-adj) | Distributions | B perm | v1 | substantial |
| 4 | Players + Clans + Tournaments (HoF + content-rich pages) | **The Scene** | A transitional | v1 (HoF) + v1.5 (player/clan) | substantial |
| 5 | Tutorials + how-tos (E23) | Tutorials | B perm | v1.5 | substantial |
| 6 | Community & Lore + glossary (E21 + E22 + glossary moved in) | Community & Lore | B perm | mixed (glossary v1 skeleton; rest later) | mixed |

**Per-entry content scope (example pages):**

1. **Modes + mutators + standalone mods (E17) -- v1 flagship; tile "Modes".**
   - KTX modes: 1on1 / 2on2 / 4on4 / CTF / Hoonymode / Race / Coop / Instagib / TDM variants
   - Mutators / rulesets: KTX rulesets, custom mutators
   - Standalone mods: Painkeep / Rocket Arena / ClanRing+ / MidAir
   - ~30+ pages. KTX 27-modes is the central pain point (15 stubs of 15 existing; 12 missing entirely; source code links here).
   - Page-type holds: gameplay description + rules + format + weapons + **"Deviations from baseline"** section + external-match-link slots (matches referenced by hub game ID).

2. **Mechanics + items + weapons (E18) -- v1 substantial; tile "Game Content".**
   - Mechanics: rocket jumping / bunny hopping / strafe jumping / LG discharge / spawn behavior / spawn fragging / damage falloff / powerup stacking / telefragging
   - Items: RA / YA / GA / MH / Quad / Pent / Ring / Biosuit
   - Weapons baselines: RL / LG / NG / SNG / SG / SSG / GL / Axe (damage, ammo, range, behavior)
   - **Glossary moved OUT** to entry #6 Community & Lore.
   - ~20-30 pages. Load-bearing -- every mode page links into this baseline.
   - Atomic concept-note shape (Track C: each mechanic / item / weapon = one Layer-3 candidate).
   - **Tile "Game Content" extends beyond wiki content** to include external nav links: Maps (-> maps.quake.world) + Customizations (-> assets.quake.world). Wiki HOSTS no map or customization pages (Pass 3 §3.4 schema enforces); wiki LINKS to them from nav as federation-corpus visibility.

3. **Distribution narrative + setup + server admin (D15 + E18-adj) -- v1 substantial; tile "Distributions".**
   - **Two sub-page-types under one entry:**
     - **Distribution-page** (one per distribution): Clients = ezQuake / FTE / nQuake / qizmo (legacy); Servers = MVDSV / KTX; Proxies = qwfwd / qizmo / qtv / utility tools. Each page = what-it-is + history + install + per-OS setup.
     - **Server-admin-overview page** (~1-3 cross-tool guides): "Setting up a QW server" umbrella covering MVDSV+KTX+qwfwd configuration, server cvars reference, match-day server prep. Harvest from `quakeworld.nu/wiki/How_to_server`.
   - ~20-30 distribution pages + ~1-3 server-admin overview pages = ~25-35 total.
   - **Server Admin folded into this entry** from prior amendment (was standalone entry #6 with overestimated ~10-20 pages; actual scope is small, lives nav-wise under Distributions/Servers).
   - Currency review per page.

4. **Players + Clans + Tournaments (B6-9 + A3) -- Track A transitional; tile "The Scene".**
   - Operator framing: "core of the community -- who we are (players), who we play with (clans), our recorded history (tournaments)".
   - **Three sub-page-types under one entry:**
     - **HoF-league-page** (~10-15 pages): ONE page per LEAGUE. EQL HoF / NQR HoF / Smackdown HoF / QHLAN HoF / DuelMania HoF / QuakeCon HoF. Page-type holds: league history + notable winners + era recaps + notable matches via hub. **Priority v1 substantial.**
     - **Player-page** (~50-100 pages): substantial player profiles only -- active or historically-significant. **Priority v1.5 substantial.** Sync-shaped bones for future federation player surface.
     - **Clan-page** (~50-100 pages): substantial clan profiles only -- active or historically-significant. **Priority v1.5 substantial.** Sync-shaped bones for future federation clan surface.
   - Aggregate ~100-200 pages (vs old wiki's 5,000+ stubs which are DROPPED entirely).
   - All three are Cat 1 transitional (graduate to federation surfaces when tournaments.quake.world / players.quake.world / clans.quake.world ship).
   - Schema enforces: no per-season-historical-tournament pages.

5. **Tutorials + how-tos (E23) -- v1.5 substantial; tile "Tutorials".**
   - Cross-engine USAGE: configure weapon binds / movement drills (bunny hop / strafe jump practice) / demo recording + playback / config setup (autoexec) / FOV + HUD setup / spectating
   - NOT install (lives on entry #3 distribution pages); NOT server-side ops (lives on entry #3 server-admin-overview sub-page-type).
   - ~15-30 pages. Each tutorial currency-reviewed before adoption.

6. **Community & Lore + glossary (E21 + E22 + glossary moved in) -- mixed priority; tile "Community & Lore".**
   - **Two sub-page-types under one entry:**
     - **Glossary-page** (1 page, **v1 skeleton**): single umbrella page; terminology as structured H3 sections (frag / spawnfrag / gib / telefrag / doubleshot / etc.). Authored at launch as skeletal reference so other pages can link to canonical terms. Fills out over time. **Moved IN from entry #2 Combat Baseline.**
     - **Article-page** (~30-50 pages, **later skeleton**): one page-type with format-type metadata (column / interview / podcast-index / cultural-essay / lore-essay). Author-availability bound; no v1 push.
   - Examples: Glossary / Purity columns archive / "ThresH wins Carmack's Ferrari" / Famous incidents (LG bug of 2009, etc.) / Podcast index / Interview transcripts / Inside jokes + traditions / cultural-history essays (the 2007 renaissance / Russian 4on4 era / etc.).

**Layer A architecture grounding (out of 4.2 scope; sketched in `2026-05-11-qwiki-nav-and-page-structure-sketch.html`):**

6-tile main-page layout matches 6 SHOULD entries 1:1, with integrated header search (Liquipedia-inspired). Tile sub-sections shown inline so the wiki's surface area is visible at a glance. The **Game Content** tile extends entry #2 with external nav links to maps.quake.world and assets.quake.world (Maps + Customizations live on federation surfaces; wiki nav makes them visible as part of the larger ecosystem corpus, but wiki HOSTS no content for them). The **The Scene** tile consolidates entry #4 cluster (Players + Clans + Tournaments; all transitional Cat 1).

Tile sub-sections are nav-design (architecture pass owns final shape); SHOULD-list entries are content-design (Pass 4.2 scope). The 1:1 entry-to-tile mapping is locked direction.

**Design patterns (4.3 holding notes -- operationalized in page-type shape):**

- **Baseline-plus-deviations.** Entry #2 Mechanics+items+weapons pages = single source of truth ("here's how QW works by default"). Entry #1 Mode pages each have a **"Deviations from baseline"** section explicitly naming deltas ("1on1: RA respawns 25s vs baseline 30s; quad disabled"). Benefits: no duplication, mode pages scannable, atomic for Track C harvest, single source of truth for QW basics.
- **External-match-link slot.** Wiki narrative referencing specific matches LINKS to hub.quake.world via game ID. No per-Match wiki page-type. Mode pages / HoF pages / Player pages / Clan pages include external-match-link slots (game-ID references to hub), not internal match-page slots. Extends Pass 3 §3.4 schema enforcement.

**Cuts captured for 4.5 (explicit non-goals -- to be consolidated in 4.5):**

- **Demo analysis writeups** -- hub.quake.world hosts demos with online replay + KTX stats + screenshots + analysis tools + comments + metadata. Wiki references hub matches by game ID; no per-match wiki narrative.
- **Map authoring + map-makers' ongoing-project feedback** -- maps.quake.world hosts (with feedback mechanism for map-makers).
- **Customization-modding (HUDs / skins / crosshairs / sounds / charsets)** -- assets.quake.world hosts (Pass 3 already locked).
- **History / era writeups as a standalone page-type** -- scattered across entry #3 distribution-page history-sections / entry #4 HoF era recaps / entry #6 cultural essays.
- **Cross-cutting narrative as a standalone page-type** -- routes to entry #4 (event-shaped) or entry #6 (culture-shaped).
- **No per-Match wiki page-type** -- extends Pass 3 §3.4 schema enforcement.

**Future arc captured (to be consolidated in 4.5):**

- **Timeline view (derived, filterable).** Architectural surface aggregating content chronologically across tournaments / modes / distributions / client+server tech releases. Pulls from multiple wiki + federation sources. Sparse until content accumulates. Architecture-pass + own arc later when data density supports it. Operator-named vision; kept-on-radar.

**Pass 6 content-strategy holding notes:**

- **Mechanics + items + weapons (#2) is mostly NEW AUTHORING.** Old QWiki doesn't have an encyclopedic QW physics+items+weapons reference. Some atoms (damage values, engine constants) live in Oracle Layer 1; the wiki narrative layer is new-build.
- **Tutorials (#5) + Distribution narrative + server admin (#3) need per-page CURRENCY REVIEW** -- harvest from old wiki where current, abandon where stale (Russian-bulk-dump precedent disallowed).
- **HoF sub-shape (#4) needs CONSOLIDATION** -- old wiki had per-season pages; new wiki has one HoF page per league. Selective extraction + new consolidating authoring.
- **Player + clan content-rich sub-shapes (#4) -- substantial-only IMPORT with new authoring fill.** Drop 5,000 stubs entirely.
- **Community & Lore + glossary (#6).** Glossary = mostly NEW AUTHORING (skeletal v1 launch, fills over time). Long-form content = mostly LEGACY HARVEST (Purity columns template; other content accrues organically).

### 4.3 Page-type shape per SHOULD entry -- LOCKED

**What this section covers:** at SHAPE level (not full field lists), each SHOULD entry resolves to one or more page-types. **Bones** = structured slots (filled via form). **Narrative slots** = prose blocks (free-form authoring inside the schema). Track C disciplines from 4.4 thread through each shape.

**Page-type-count discipline applied:** minimize page-types where shapes overlap; sub-page-types only where shapes genuinely diverge.

**Visual companion:** `docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html` (v3, 2026-05-12) shows Layer A (6-tile nav with locked names Game Content + The Scene), Layer B (Modes category-page example), and Layer C (Hoonymode page mockup) with bones / slots tagged inline. Hoonymode demonstrates the mode page-type shape concretely; Race-vs-Hoonymode generalization test answered (page-type works for Race via sub-type-driven conditional bones).

**Page-type shapes per SHOULD entry:**

**1. Modes + mutators + standalone mods.** One page-type ("mode-page") with sub-type field (mode / mutator / mod) driving conditional sections.
- Bones: name / sub-type / parent-mode-for-mutator / format (player count / rounds / win conditions) / **deviations-from-baseline** / **notable-games-via-hub-game-id** / cross-links.
- Narrative slots: description, gameplay strategy, history / origin.
- Track C: section-as-atom across description / strategy / history / deviations; L1/L3 anchors for weapons + mechanics + items; citations for origin to KTX source / forums / podcasts.
- Race generalization: sub-type="Race" toggles conditional infobox fields (Best times / Max time / Single-player flag instead of Win-condition); Deviations absorbs structural diffs (no combat / no items / single player); Notable runs replaces Notable matches but still external-links to hub by game ID.

**2. Mechanics + items + weapons (Game Content tile).** Three sub-page-types: mechanic-page / item-page / weapon-baseline-page.
- Bones: canonical-name / Layer-1-anchor / parameters (engine values from L1) / related-entities.
- Narrative slots: how-it-works, why-it-matters, interactions.
- Track C: atomic concept-note input; strict L1 anchors; citations point to engine source via L1.
- Maps + Customizations are NAV-ONLY external links on the Game Content tile; no wiki page-types.

**3. Distribution narrative + setup + server admin.** Two sub-page-types: distribution-page / server-admin-overview-page.
- Distribution page bones: name / current-version / source-URL / license / maintainer / supported-OS / changelog-link.
- Distribution page slots: what-it-is, history, install-walkthrough (per-OS), known-issues, related-distributions.
- Server-admin-overview page bones: applies-to (which tools / versions) / prerequisites / related-pages.
- Server-admin-overview page slots: setup walkthrough, configuration (cvars), operational tips, known-issues.
- Track C: section-as-atom; L1 anchors for cvars + rulesets; citations to release notes / source code / KTX docs.

**4. Players + Clans + Tournaments (The Scene tile).** Three sub-page-types: hof-league-page / player-page / clan-page.
- **HoF-league-page** bones: league-name / years-active / format / current-status / per-season-champions-roster (structured but on one page) / **notable-matches-via-hub**.
- HoF-league-page slots: history, notable eras / dominant clans, memorable matches narrative, legacy / current status.
- **Player-page** bones: name / aliases / country / active-years / clans-history (list) / notable-achievements (HoF + hub links) / cross-links.
- Player-page slots: bio, history, playstyle, memorable moments.
- **Clan-page** bones: name / country / active-years / members (list, may be empty) / tournament-history (HoF links) / cross-links.
- Clan-page slots: bio, history, known-for, memorable moments.
- **Sync-shaped (Pass 3 (C-prime))** for player + clan bones -- designed for future federation absorption.
- Track C: structured bones make harvest tractable; narrative is the rich slot.

**5. Tutorials + how-tos.** One page-type ("tutorial-page").
- Bones: applies-to (clients / versions) / prerequisites / related-tutorials.
- Narrative slots: what-this-teaches, numbered steps (procedural), troubleshooting, tips / advanced.
- Track C: section-as-atom (each step = atom); L1 anchors for cvars / commands referenced; citations to source where behavior comes from.

**6. Community & Lore + glossary.** Two sub-page-types: article-page / glossary-page.
- **Article-page** bones: author / date / subject / format-type (column / interview / podcast-index / cultural-essay / lore-essay) / cross-links.
- Article-page slots: body (prose).
- **Glossary-page** is one umbrella page; terminology as structured H3 sections within (term-name / canonical-anchor / cross-refs per section).
- Glossary-page slots per term: definition + cultural-context.
- Track C: **looser** schemas for article-page (per Pass 5 tension); **tighter** schema for glossary-page (terms are atomic, harvest-friendly).

**Layer A + B grounding (architecture-pass territory; sketched in nav-structure HTML):**

- 6 main-page tiles match 6 SHOULD entries 1:1; locked tile names: Modes / Game Content / Distributions / The Scene / Tutorials / Community & Lore.
- Each tile shows its sub-sections inline (Liquipedia-style) -- wiki's surface area visible at a glance.
- Game Content tile includes external nav links (Maps -> maps.quake.world; Customizations -> assets.quake.world).
- Lower-volume entries (Game Content's wiki side, Community & Lore) may skip Layer B and link sub-page-types directly from Layer A. Higher-volume entries (Modes, Distributions, Tutorials, The Scene) need Layer B category pages.
- Exact Layer A styling, Layer B layout, and Layer B / C transitions are architecture-pass decisions.

### 4.4 Track C as design pillar -- LOCKED

**What Track C is.** The wiki is authored such that a human curator can manually distill wiki content into Layer 3 concept-notes with minimal extraction friction. **Quality input for manual curation, not an auto-pipeline.** Concept-notes stay manually authored + reviewed + tested per the existing `apps/qw-oracle/curated/concept-notes/CLAUDE.md` workflow. Voyage embedding (if it happens later) is downstream search/discovery optimization, not a Track C precondition.

**The four authoring disciplines:**

1. **Section-as-atom.** Each H2/H3 section maps to one focused topic. A page covers one concept; sections decompose into atoms. Curator can lift a section as a concept-note topic instead of untangling spaghetti prose.
2. **Self-contained sections.** A reader entering at any section has enough page-local context to understand it without reading the whole page. Sections re-anchor to the parent concept where relevant. Curator doesn't have to re-read the whole page to extract a section.
3. **Cross-link to L1/L3 anchors.** When mentioning a cvar / command / mechanic / item / map / engine fact, link to (or canonical-name) the Oracle entity. Curator inherits the resolved references instead of chasing "is this the same cvar as Layer 1?". Broken refs flag for curator triage.
4. **Citation discipline.** Factual claims cite source (Layer 1 entity, official doc, measured behavior, recorded session, hub game ID). Opinion / speculation clearly marked. Curator inherits the citation chain.

**4.3 operationalization (forward-pointer).** Page-type schemas (4.3) bake the four disciplines into forms / templates / help text. High-curator-value entries (modes, baseline, distributions, server admin, tutorials) get **tighter schemas**; lower-priority entries (community & lore) get **looser slots**. Schema does the heavy lifting so contributors don't need to internalize Track C terminology.

**Pass 5 tension (carry-forward).** Track C structure vs Pass 1's "credentialed-but-not-curatorial on-ramp + low-barrier signup". Strict enforcement bounces drive-by contributors; loose enforcement degrades input quality. Resolution candidates:

- Forms enforce structure for high-curator-value entries (modes / baseline / distributions); looser slots for casual contributions (community & lore).
- Curator-pass cleans drift after the fact (Carapace-v2 sweep mode from Pass 2).
- Templates + authoring-help text invite discipline rather than enforce.

Pass 5 settles the enforcement-vs-invitation balance.

**Pass 6 implication.** Track B + Track A transitional entries that feed Layer 3 (modes / baseline / distributions / tutorials / Hall-of-Fame) need authoring that satisfies the four disciplines. Pass 6 content sources (extract from old wiki / new-build) get a discipline review before adoption.

**Pipeline-mechanics arc (deferred / lower-stakes).** If a tooling arc later materializes (curator workflow tools, search interface, draft suggestions, similarity match), it consumes wiki content + Layer 1 + existing Layer 3 corpus. Tools assist, not replace, the curator. Not load-bearing for Track C.

### 4.5 Cuts / explicit non-goals -- LOCKED

**Purpose:** consolidate every "wiki does NOT do this" decision from Pass 4 (and earlier passes) into one place. Sources: Pass 3 §3.4 schema enforcement + Pass 3 §3.5 outside-wiki gap list + Pass 4 amendments captured during 4.1-4.4.

**Schema-enforced page-type exclusions (wiki cannot host these page-types):**

| # | Excluded page-type | Lives where instead | Source |
|---|---|---|---|
| 1 | per-Map | maps.quake.world / assets.quake.world | Pass 3 §3.4 |
| 2 | per-Asset (HUDs, skins, crosshairs, sounds, charsets) | assets.quake.world | Pass 3 §3.4 |
| 3 | News | quake.world frontpage | Pass 3 §3.4 |
| 4 | per-Season-Historical-Tournament | one HoF page per league (entry #4 sub-shape), NOT per season | Pass 3 §3.4 |
| 5 | per-Match | hub.quake.world (game ID linked from wiki) | Pass 4 amendment |

**Content out of wiki scope (lives elsewhere in the ecosystem, or never authored):**

1. **Demo analysis writeups** -- hub.quake.world hosts demos with online replay + KTX stats + screenshots + analysis tools + comments + metadata. Wiki references hub matches by game ID; no per-match wiki narrative. Texts about important games live alongside the demo on hub, not on wiki.
2. **Map authoring + map-makers' ongoing-project feedback** -- maps.quake.world hosts (with its own feedback mechanism for map-makers in development).
3. **Customization-modding content** (HUDs / skins / crosshairs / sounds / charsets) -- assets.quake.world hosts (Pass 3 already locked).
4. **History / era writeups as a standalone page-type** -- scattered across entry #3 distribution-page history-sections / entry #4 HoF era recaps / entry #6 cultural-essay article-pages. No dedicated history page-type.
5. **Cross-cutting narrative as a standalone page-type** -- routes to entry #4 The Scene (event-shaped narrative) or entry #6 Community & Lore (culture-shaped narrative). No dedicated cross-cutting page-type.
6. **Live tournament creation tool** (real one, not stopgap) -- tournaments.quake.world Phase 2. Qwicky-revival possible interim outside wiki.
7. **Stats analytics / cross-season ELO / "best player of all time" queries** -- hub V2 enhancement layer.
8. **Public-web beginner onboarding flow** ("first hour of QW") -- slipgate-app (replaces decade-old nQuake installer). NOT wiki's job; out of arc scope.
9. **Hardware / pro-player configs / settings comparison** -- community-managed elsewhere; low priority; NOT wiki.
10. **Streaming / content creator / VOD discovery** -- quake.world frontpage (fav-vods channel exists in xantom's dev server). NOT wiki.
11. **Translations / non-English documentation** -- explicit non-goal v1; English-only.

**Future-arc captures (kept on radar; out of v1 scope but documented):**

- **Timeline view (derived, filterable)** -- architectural surface aggregating content chronologically across tournaments / modes / distributions / client+server tech releases. Pulls from multiple wiki + federation sources. Sparse until content accumulates. Operator-named vision (Pass 4 4.2 amendment); architecture-pass + own arc later when data density supports it.
- **Pipeline-mechanics tooling arc** (deferred / lower-stakes) -- curator workflow tools, search interface, draft suggestions, similarity match. Tools that assist (not replace) the curator. Consumes wiki + Layer 1 + Layer 3 corpus. May or may not materialize.

### 4.6 Stakeholder-pitch framing -- LOCKED

**Purpose:** one-paragraph pitch for cutover communication to old-wiki contributors, plus brief Q&A addressing predictable objections. Carries forward to Pass 5 (contributor model + on-ramp messaging) and to the architecture pass (actual cutover communication adapts the same content per channel).

**The pitch:**

> The new QWiki is the upgrade taken to its logical extreme, with URL preservation locked. Scope deliberately narrows to what wikis are irreducibly good at -- prose, crosslinks, multi-author narrative, community memory. The structured / dynamic stuff (match results, brackets, player profiles, asset binaries, map data) moves to quake.world's federation surfaces (hub / assets / tournaments) where it's done better. The old wiki becomes a read-only archive with URLs preserved indefinitely -- nothing deleted, external code references survive, exhaustive history stays accessible. The new wiki holds modes / mechanics / distributions / tutorials / Hall of Fame / community memory: where prose and crosslinks earn their place.

**Common-objections Q&A:**

- **"Are you deleting my work?"** No. Old wiki is preserved as a read-only archive with URLs intact. Nothing deleted; exhaustive history accessible indefinitely.
- **"Won't this fragment the community?"** Most active old-wiki contributors (tournament organizers, mode authors, mechanic writers, Alice) work in domains the new wiki still serves. The split is between exhaustive-archivist roles (old wiki archive) and living-substrate roles (new wiki) -- both legitimate.
- **"Why narrow scope?"** The wiki form was always strongest at prose-and-crosslinks. Structured data fights the form. quake.world's federation surfaces handle structured / dynamic better; the new wiki keeps what only wiki does well, done properly.
- **"Same URLs as old?"** Yes. Same slugs map to same URLs. KTX source linking to wiki pages still works.
- **"What about the player pages?"** Substantial, content-rich player profiles preserved (~100-200). The 5,000+ stubs go away -- Hub V2 will produce richer profiles automatically (auto-generated from match data via xantom's parsers).

**Carry-forwards:**

- **To Pass 5 (contributor model):** the pitch's "credentialed-but-not-curatorial on-ramp" framing meets the contributor model. Pass 5 settles on-ramp mechanics (Discord OAuth + Quad-bot auto-provisioning candidate locked from Pass 1) + structure-vs-freedom balance.
- **To architecture pass (cutover communication):** the pitch + Q&A here is the seed for actual cutover messaging. Adapt to channel (forum post / Discord announcement / email to known contributors). Same content, different framing per audience.

## Pass 5 -- contributor model + freedom-vs-structure -- LOCKED

**Pass 5 framing.** Pass 1 locked "credentialed-but-not-curatorial low-barrier signup" as the end-state operating point, not v1. **V1 is invite-only beta** -- a handful of trusted contributors test the form-driven authoring flow before broader access opens. The beta-vs-broader phase distinction threads through all of Pass 5; Pass 1's "no admin gating" applies to the broader end state, not the beta. 5.1 settles the on-ramp + gate; 5.2 settles per-page-type edit-gate; 5.3 + 5.4 settle curator + moderation; exit criteria from beta to broader fall out across 5.3 / 5.4.

### 5.1 Signup mechanism + invite gate -- LOCKED

**Auth bridge.** MediaWiki's standard PluggableAuth + a Discord-OAuth-provider extension (OpenID Connect or WSOAuth -- exact pick is architecture-pass). User clicks "Log in with Discord" on the wiki, completes Discord's OAuth dialog, returns with an MW account auto-provisioned. **Quad does NOT provision MW accounts.**

**Gate layer.** MW group membership: users without the `wiki-contributor` group are read-only; members can edit. **Auto-assigned on first login** via Discord-role-as-OAuth-claim: the OAuth extension reads the user's Discord roles from the OAuth response and maps `@wiki-beta` (Discord) -> `wiki-contributor` (MW). No two-step manual promotion.

Discord-role-as-claim chosen over a Quad-managed allowlist API because: operator sees invitees directly in Discord (no separate allowlist state); standard OAuth extension claim-mapping config (no custom MW hook); symmetric revocation (remove role -> edit access falls off on next session).

**Invite command.** Quad's `/invite_wiki @user` -> grants the `@wiki-beta` Discord role + DMs the invitee with the wiki login link. Text-command flow (no admin modal); spiritually matchscheduler-precedent, lighter UX.

**Revocation.** Remove the `@wiki-beta` Discord role; edit access falls off on next OAuth session resync.

**Read access.** Public; no account required to browse. Per Pass 1's wiki-form irreducible offering, public-archive value is preserved.

**Quad's v1 role.** Invite-command surface + invitee DM. Account provisioning delegated to the OAuth extension. Page-change Discord-channel notifications are downstream-nice-to-have, parked for v1.

**Phasing carry-forward.** Beta (v1) = `@wiki-beta` gates edit. Broader (later) = add a wider Discord role (e.g. `@wiki-contributor`) mapped to the same MW group, or loosen further. Exit criterion from beta to broader falls out in 5.3 / 5.4.

**Open question deferred to handoff.** Who's in the v1 beta invite wave -- operator-curated; final list lands when implementation begins. Likely first wave: Alice, the curator role (Carapace-v2 candidate), 1-2 active tournament organizers.

### 5.2 Edit-gate level per page-type -- LOCKED

**Three gate-levels (taxonomy):**

- **Strict-form.** Contributor fills structured fields only; no free-floating wiki-text. The form IS the entire authoring UX. Used where every section is harvest-atomic.
- **Form + narrative slots.** Contributor fills structured fields AND specific named text-areas (within the same form) accept short prose blocks. Free-form prose lives INSIDE named slots; nothing free-floating. Pass 4 4.3's default "bones + slots" shape.
- **Free-form + form metadata.** Tiny form for metadata only (author / date / format-type); body is open wiki-text. Used for creative content that resists structuring.

**Per-page-type assignment (12 page-types from Pass 4 4.3):**

| Page-type | Gate level | Reasoning |
|---|---|---|
| mode-page | Form + slots | Complex bones (format / deviations / hub-IDs); narrative for description / strategy / history. |
| mechanic-page | Strict-form | Atomic concept-note input; L1-anchored. |
| item-page | Strict-form | Atomic; L1-anchored. |
| weapon-baseline-page | Strict-form | Atomic; L1-anchored. |
| distribution-page | Form + slots | Per-OS install structured; history / known-issues narrative. |
| server-admin-overview-page | Form + slots | Setup walkthrough structured; operational tips narrative. |
| hof-league-page | Form + slots | Per-season-champions roster structured; history / notable matches narrative. |
| player-page | Form + slots | Sync-shaped bones; bio / history narrative. |
| clan-page | Form + slots | Sync-shaped bones; bio / history narrative. |
| tutorial-page | Form + slots | Procedural steps structured; troubleshooting / tips narrative. |
| article-page | Free-form + metadata | Columns / interviews / essays; format-type metadata only. |
| glossary-page | Strict-form | Single umbrella; H3-section-per-term needs uniform shape for harvest. |

**Pattern.** 8 form+slots / 3 strict-form (atoms) / 1 free-form (article). High-curator-value entries (modes / atoms / distributions / tutorials / glossary) get tight forms; article-page (cultural content, low Layer-3 weight) stays loose.

**Slot-detail discipline (iterates post-mockup).** Pass 5 locks the gate-LEVEL per page-type. Exact slot names + counts per "form + slots" page-type iterate during architecture pass + early beta authoring. Adding a slot to a "form + slots" page-type is near-zero cost (template parameter + form textarea); discovering missing slots during real authoring is expected and accommodated.

**Reversibility profile:**

- Adding a slot: near-zero cost.
- Removing a slot: medium-disruptive (loses authored content unless migrated).
- Changing gate-level (strict <-> form+slots <-> free-form): tolerable at v1 beta scale (handful of pages per type), painful at broader-phase scale (hundreds of pages). **v1 beta is the window to reshape gate-level if it turns out wrong.**

**Track C tension resolved (Pass 4 4.4 carry-forward).** High-curator-value entries get tight forms (strict or form+slots); article-page (low Track C weight) stays free-form. Beta phase tests all gate-levels in parallel since invitees author across page-types from day 1.

### 5.3 Curator workflow -- LOCKED

**Curator role exists, narrower than old-wiki curator work.** Pass 4 4.3 bones+slots + Pass 5 5.2 gate-levels make structural drift mostly impossible at authoring time -- forms reject malformed bones, missing required fields, and prose-in-wrong-place at submission. The curator does NOT detect structural drift; the load-bearing work is content-quality review + Layer 3 harvest + spam/vandalism response.

#### 5.3a Permission level -- LOCKED

**Curator is a separately-permissioned MW role: `wiki-curator` group.** Permissions beyond `wiki-contributor`:

- Delete pages.
- Protect pages from edit (vandalism response, stable-version lock).
- Edit restricted pages (forms / templates / categories that `wiki-contributor` cannot touch).
- Revert to specific revision.

v1 beta scale: 1-2 curators (operator + Carapace-candidate if available). Visible identity matters for community legibility.

Rejected: curator-as-label-only (operator becomes single-point-of-failure for delete / protect / form-fix); curator-with-narrow-rights (under-equipped; forms / templates need curator-editable for 5.2 slot iteration).

#### 5.3b Workflow shape -- LOCKED

**Where work happens.** Wiki UI in browser. Curator logs in, opens `Special:RecentChanges` + `Category:<tag>` pages, does the work directly in the wiki. No external dashboard, no Discord notifications, no email. (MW's Echo / watchlist notification system is architecture-pass-optional, not load-bearing.)

**Cadence.** Continuous-lightweight + periodic-batch.

- **Continuous-lightweight.** Curator scrolls `Special:RecentChanges` as time permits. Catches obvious problems early (spam, vandalism, content that slipped past form validation).
- **Periodic-batch.** Operator-set cadence (weekly / biweekly fits beta scale). Curator works through `Category:Needs review` queue. Does content review + currency review + Layer 3 harvest.

**Quality-tag system (narrowed; forms handle structural drift):**

| Category | Trigger | Curator action |
|---|---|---|
| `Category:Needs review` | Auto-applied on new page creation. | Read page, polish prose, clear tag. v1 main work queue. |
| `Category:Stale` | Explicit author or curator tag for currency-review backlog. | Currency-review content; update or escalate. |
| `Category:Draft` | Explicit author flag ("not ready"). | Skip until author removes Draft tag. |

Dropped tags (forms enforce these at authoring time): `Category:Incomplete bones`, `Category:Broken cross-refs`.

**What curators actually do (load-bearing list):**

1. **Content quality review.** Form lets contributor put any prose in named slots; curator reads and polishes (or asks author to rework).
2. **Cross-page coherence.** Two mode-pages might describe the same KTX ruleset differently. Curator catches and unifies.
3. **Currency review.** Stale install walkthroughs, outdated cvars in tutorials, deprecated distribution versions. Curator updates on cadence.
4. **Layer 3 harvest (Track C).** Curator picks matured sections and writes Layer 3 concept-notes in `apps/qw-oracle/curated/concept-notes/` per existing CLAUDE.md workflow. **Out-of-wiki work but central to Track C.** The load-bearing curator activity that doesn't exist in normal wikis.
5. **Spam / vandalism response.** Delete bad pages, revert vandalism, escalate persistent bad actors to operator (who removes the `@wiki-beta` Discord role).
6. **Template / form maintenance.** When a slot needs adjusting (per 5.2 iteration), curator edits the form / template definition. Requires `wiki-curator` rights.

**Anti-burnout discipline (Pass 2 carry-forward).** Carapace burned out on the old wiki. Design constraint: curator workload bounded by what's tagged + recent-changes that catch their eye. Curator does NOT chase the entire backlog. Tags re-surface on next cycle; periodic-batch has operator-set time cap; the queue is allowed to grow if curator capacity is low.

### 5.4 Moderation + quality-floor + transition criterion -- LOCKED

**Honest scope.** Most of original 5.4 was already settled by 5.1 / 5.2 / 5.3: schema enforcement (5.2 form gates), curator-pass cleanup (5.3 workflow), quality-flag tags (5.3 Needs review / Stale / Draft), filtering undisciplined edits (5.1 invite gate + 5.2 form gates), bad-actor revocation (5.1 remove Discord role). 5.4 settles two remaining small shape decisions.

#### 5.4a Edit-restriction defaults per MW namespace -- LOCKED

| MW namespace | Edit access | Reasoning |
|---|---|---|
| Main (content pages: mode-page, mechanic-page, etc.) | `wiki-contributor` | Where authoring happens. |
| `Form:` (Page Forms definitions) | `wiki-curator` only | One bad edit breaks every page using the form. |
| `Template:` (template definitions) | `wiki-curator` only | Structural. |
| `Category:` (category definitions) | `wiki-curator` only | Category structure is the curator's tool. |
| `MediaWiki:` (system messages) | sysop only (MW default) | System config. |
| `User:` / `User_talk:` | self + curator | Own profile, anyone's talk page. |
| `Talk:` (article discussions) | `wiki-contributor` | Discussion is part of authoring. |
| `File:` (uploaded images) | `wiki-contributor` | Authors upload screenshots / diagrams; curator can delete. |

#### 5.4b Beta -> broader transition criterion -- LOCKED

Exit criterion from invite-only beta phase (5.1 `@wiki-beta` gate) to broader Discord-pool access:

- **Forms have proven across all 12 page-types.** Each page-type used at least once with no major reshape required mid-authoring.
- **At least one page authored per page-type without curator hand-holding.** Form is self-explanatory enough for a `wiki-contributor` invitee to complete solo.
- **No major spam or vandalism incidents during beta.** Gate effectively filtering.
- **Curator workflow proven sustainable.** Curator hasn't burned out at the chosen cadence.
- **Operator subjective confidence.** "I'm ready to widen this."

When criteria are met: operator adds a `@wiki-contributor` Discord role mapped to the same `wiki-contributor` MW group. Existing `@wiki-beta` invitees keep access. New people get the broader role. **No hard switchover; both roles coexist.** Future tightening (revoke `@wiki-contributor` if quality degrades) is symmetric.

**Timeline expectation:** no fixed number. Beta runs until forms feel solid. Operator-set.

### Pass 5 carry-forwards

- **To architecture pass:**
  - Specific OAuth extension choice (OpenID Connect vs WSOAuth) + Discord-role-as-OAuth-claim configuration (5.1).
  - MW namespace edit-permission config per 5.4a.
  - Quality-tag template wiring: auto-apply `Category:Needs review` on save; explicit-tag UX for `Category:Stale` / `Category:Draft` (5.3b).
  - Page Forms slot specifics per page-type (iterate during architecture + early beta authoring) (5.2).
- **To Pass 6 (content strategy):**
  - Per-page-type gate-level + form discipline informs what's importable from old wiki (loose old content vs new structured forms) (5.2).
  - Layer 3 harvest pipeline shape: curator distills wiki sections into concept-notes in `apps/qw-oracle/curated/concept-notes/` (5.3b activity #4).
- **To implementation handoff:**
  - V1 beta invite list (operator-curated; Alice, Carapace-candidate, 1-2 tournament organizers) (5.1).
  - Curator role assignment (operator + Carapace-candidate if available) (5.3a).
- **To Quad bot work (apps/quad/):**
  - `/invite_wiki @user` command: grant `@wiki-beta` Discord role + DM invitee with login link (5.1).
  - `/uninvite_wiki @user` command: symmetric revocation (5.4 implicit).
  - Page-change Discord channel notifications: future nice-to-have, parked (5.1).

## Pass 6 -- content strategy -- LOCKED 2026-05-12

**Reframe from handoff candidates.** The Pass 6 handoff proposed five sub-questions: per-SHOULD-entry content-source decision / currency criteria / extract mechanism / URL preservation / migration cadence. Operator pushback during the session reshaped Pass 6: per-SHOULD-entry content-source decisions cannot be pre-locked in a brainstorm -- each domain needs its own mini-brainstorm with inventory in hand. Pass 6 instead locks the WORKFLOW that all per-domain mini-arcs follow, the PRIORITY order of those mini-arcs, and the BASELINE substrate they share. The handoff's per-entry decisions and currency criteria defer to per-domain mini-arcs; URL preservation policy was already locked Pass 4 4.6 (infra piece folds into 6.3 baseline); migration cadence becomes 6.2 priority order.

### 6.1 Workflow shape -- LOCKED

**Unit of work = per domain.** Per SHOULD entry (sometimes per sub-page-type within), five steps:

1. **Analyze the old wiki for this domain.** Query the dump or scrape; build inventory with relevant metadata (size / staleness / categories / SMW properties / link health). Also a map-building step -- the operator does not have a full mental model of the wiki per domain; the inventory pass builds it.
2. **Plan target shape.** Page-types already locked in Pass 4 4.3; per domain confirm bones+slots fit what the inventory reveals.
3. **Plan migration.** Per-page disposition: extract / new-build / merge / abandon. Brand-curator-style triage backed by a state file.
4. **Migrate.** Execute per-page; apply Track C disciplines (4.4).
5. **Verify.** Per-page sign-off against schema + Track C + curator review.

**Backed by per-domain curator tooling.** Same skeleton as the existing brand-curator (`apps/qw-oracle/scripts/curate-brands/`, validated by operator's 88-tournament-page sort with persistent `brand-curation-state.json`): three columns (inventory -> triage -> sign-off), per-item state badges, JSON-sidecar persistence, filter / search. Customized per domain's data shape. Small tools -- hours each, not days. State is checkpointable + diffable + commitable. Pauseable + resumable across sessions is the default, not a hard problem.

**Per-domain, not one mega-tool.** Data shapes diverge wildly (tournament brand-grouping is nothing like substantial-player-filtering or mode-coverage-mapping). Some domains barely need a tool (Modes is mostly new-build -- a simple "page-types-to-author checklist" suffices; Glossary is one page). Only the bigger / extract-heavy domains (HoF leagues, players, clans, distributions, tutorials) need full three-column tooling.

**Manual-vs-scripted dissolves into per-domain.** Brand-curator was manual triage on a scripted-inventory base. Each domain decides its mix during the analyze step. Not a global lock.

**Shape vs implementation.** Pass 6 locks the cycle + tooling-pattern + per-domain unit of work. Architecture-pass settles framework / state format / dump-query layer / specific tool implementation.

### 6.2 Priority order -- LOCKED

**First domain: Modes.** Vertical-slice proof-of-concept that exercises wiki authoring + Layer 3 harvest path + harvested result observable via oracle MCP end-to-end. Aligns with project memory `project_concept_notes_vertical_slice.md` (operator's preferred pitch shape: L1 anchors + L3 substance + observability of the harvested result).

**Why Modes is the right first:**

- 27 pages bounded; completable in meaningful timeframe.
- Full triage diversity: rich existing / sparse stubs / missing-entirely. Exercises every disposition in one domain.
- KTX source code already references wiki URLs here -- finishing the domain fixes Pass 2's named pain point.
- Cross-link dependency on Game Content (mechanics / items / weapons baselines via "Deviations from baseline") is non-blocking -- mode pages can land with red-links that resolve to blue when Game Content ships later.
- Layer 3 harvest target is concrete: each mode = one concept-note input + multiple atomic sections.

**Subsequent priority order: deferred post-Modes.** The order calcifies after we see what 27 pages actually takes at 2-4 contributors and what harvest looks like in practice. Candidate-next is **Game Content** (baselines close the cross-link loop on Modes' deviations sections), but not Pass-6-locked.

**Pass 4 4.2 priority field remains the durable starting hypothesis** for subsequent ordering (v1 flagship Modes / v1 substantial Game Content + Distributions + HoF + Tutorials / v1.5 Player+Clan substantial / later Community & Lore + Glossary skeleton at v1).

### 6.3 Baseline substrate -- LOCKED

**Cut: baseline = reusable across all future domains. Per-domain mini-arc = domain-specific.** Baseline is the spec for the first architecture pass. Per-domain artifacts (page-type form + Layer B category page + curator tool instance + triage cycle) are downstream mini-arcs.

**Baseline (4 items):**

1. **Wiki substrate.** MW 1.39 LTS + Citizen skin + Page Forms + Semantic MediaWiki + PluggableAuth + Discord OAuth extension + MW groups (`wiki-contributor` / `wiki-curator`) + quality-tag categories (`Needs review` / `Stale` / `Draft`). Implements Pass 5 5.1 + 5.4a wiring.

2. **URL slug discipline.** v1 beta uses same slugs as old wiki for kept pages, so when cutover happens, KTX source refs survive. Actual redirect-from-old-domain infra is cutover-event work, not baseline -- v1 needs only the authoring discipline of "keep the slug." Policy locked in Pass 4 4.6.

3. **Layer 3 harvest path observable end-to-end.** Workflow from wiki section -> `apps/qw-oracle/curated/concept-notes/` already exists per oracle's CLAUDE.md (Pass 5 5.3b's load-bearing curator activity). Baseline verifies that a newly-harvested note surfaces via oracle MCP query, closing the vertical-slice loop.

4. **Hosting.** MW Docker stack on Unraid (php-fpm + nginx + MariaDB + extensions). Cloudflare Tunnel for exposure. TLS via Cloudflare. Restricted URL e.g. `wiki-beta.quake.world` with invite-only access via Discord role. Backup inherited from existing Unraid -> Synology weekly cycle (`/home/paradoks/projects/unRAID/docs/server/backup.md`) -- new containers auto-included since the appdata-backup script tars all of `/mnt/user/appdata/`. Future migration off Unraid to long-term Hetzner+Cloudflare infrastructure (per Quake.World platform architecture wireframe) is a standard MW migration (DB dump + images + extensions); not a baseline lock-in concern.

**Skipped from baseline -- "Generic per-domain-tool framework."** Speculative without seeing what subsequent domains need. The Modes curator gets built as a Modes mini-arc deliverable; later domains crib from it (or reshape per their data). Avoids over-engineering on day 1.

**Modes mini-arc (NOT baseline; downstream):**
- Mode page-type form + template + Modes Layer B category page
- Modes curator tool instance (built on top of baseline; pattern cribbed from brand-curator)
- 27-mode triage + author + Layer 3 harvest cycle

### Pass 6 carry-forwards

**To per-domain mini-arcs (each becomes its own arc-classifier candidate; not Pass 6 scope):**

- Per-page extract / new-build / merge / abandon decisions per domain (handoff's original 6.1 -- deferred).
- Currency-review criteria per content type (genuinely per-domain; handoff's 6.2 -- deferred).
- Selective-extract specifics (which dump queries, which curator-tool features) per domain (handoff's 6.3 -- answered at workflow level; specifics per domain).
- Per-domain page-type form + template + Layer B category page.
- Per-domain curator tool instance.

**To architecture pass (substrate implementation):**

- Wiki substrate implementation specifics: Docker base image / MariaDB version / MW configuration / Page Forms + SMW version / OAuth extension choice (OpenID Connect vs WSOAuth, per Pass 5 5.1 carry-forward) / Citizen skin configuration including left-rail TOC if desired.
- URL slug discipline enforcement mechanism (template + form validation).
- Layer 3 harvest path observability verification test (newly-harvested note -> oracle MCP query result).
- Hosting deployment: docker-compose file, Cloudflare Tunnel config, Cloudflare DNS+TLS, Discord-role-as-OAuth-claim mapping config.
- Liquipedia patterns as visual reference for per-page-type template mockups (tabs / brackets / hover-lineup / left-rail TOC). Named, not locked. Liquipedia stack confirmed as MW family (MW + SMW + form-driven editing + heavily customized skin).

**To future architecture concern (not v1 baseline):**

- AI-agent steering: `llms.txt` at wiki root (optional v1 add; well-behaved AI agents bias toward indexed URLs), `MediaWiki:Robots.txt` rules, Cloudflare Worker user-agent steering at edge (`GPTBot` / `ClaudeBot` / `PerplexityBot` detection -> stripped link-only response). Adversarial bot tarpit pattern (ciscon's QWiki playbook, `reference_botload_tarpit_pattern.md`) separate from cooperative steering.

**To downstream events (operational concerns):**

- Subsequent priority order after Modes wraps -- revisited with Modes-mini-arc learnings.
- Cutover from `wiki-beta.quake.world` to old-wiki URL (Pass 5 5.4b transition gate).
- Image-tarball migration (`apps/qwiki-sandbox/dumps/wiki-images.tar.gz`, 6.4G) -- per-domain as needed; Modes may need a few screenshots, mass image import deferred.
- Migration off Unraid to long-term Hetzner+Cloudflare infrastructure -- operational concern when long-term platform ready.

**No conflicts with Pass 1-5 locks.** Pass 6 confirms and operationalizes prior locks; does not reopen them.

