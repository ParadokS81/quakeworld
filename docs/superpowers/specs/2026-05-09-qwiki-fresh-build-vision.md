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

## Pass 4 -- wiki's unique role + SHOULD list -- pending

## Pass 5 -- contributor model + freedom-vs-structure -- pending

## Pass 6 -- content strategy -- pending
