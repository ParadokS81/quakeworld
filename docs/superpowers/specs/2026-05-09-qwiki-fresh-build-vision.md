---
status: brainstorm in progress (Passes 1-2 of 6 complete; Pass 3 next)
arc: 2026-05-09-qwiki-sandbox
parking: docs/superpowers/parking/2026-05-10-qwiki-sandbox-pass3-handoff.md
supersedes: docs/superpowers/specs/2026-05-09-qwiki-sandbox-architecture.md (modernize-in-place framing, pivoted 2026-05-09)
---

# QWiki Fresh-Build -- Vision

Living spec for the qwiki-sandbox arc, fresh-build framing. Drain destination for the conceptual passes (1-6) of the arc-brainstormer. Architecture spec is a separate doc downstream.

## Conceptual passes overview

- Pass 1 -- what wikis are for, generically (COMPLETE)
- Pass 2 -- current QWiki audit, purpose lens (COMPLETE)
- Pass 3 -- ecosystem map: where each kind of knowledge lives (pending)
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

## Pass 3 -- ecosystem map -- pending

## Pass 4 -- wiki's unique role + SHOULD list -- pending

## Pass 5 -- contributor model + freedom-vs-structure -- pending

## Pass 6 -- content strategy -- pending
