---
status: brainstorm in progress (Pass 1 of 6 conceptual + N architecture passes downstream)
arc: 2026-05-09-qwiki-sandbox
parking: docs/superpowers/parking/2026-05-09-qwiki-sandbox-fresh-build-handoff.md
supersedes: docs/superpowers/specs/2026-05-09-qwiki-sandbox-architecture.md (modernize-in-place framing, pivoted 2026-05-09)
---

# QWiki Fresh-Build -- Vision

Living spec for the qwiki-sandbox arc, fresh-build framing. Drain destination for the conceptual passes (1-6) of the arc-brainstormer. Architecture spec is a separate doc downstream.

## Conceptual passes overview

- Pass 1 -- what wikis are for, generically (COMPLETE)
- Pass 2 -- current QWiki audit, purpose lens (pending)
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

## Pass 2 -- current QWiki audit, purpose lens -- pending

(To be drained at Pass 2 close.)

## Pass 3 -- ecosystem map -- pending

## Pass 4 -- wiki's unique role + SHOULD list -- pending

## Pass 5 -- contributor model + freedom-vs-structure -- pending

## Pass 6 -- content strategy -- pending
