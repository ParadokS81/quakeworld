# QWiki Sandbox -- Vision

> **Pivoted 2026-05-09 evening.** Original mission was "modernize the existing wiki in place." After content analysis (`docs/research/2026-05-09-qwiki-content-analysis.md`) and ecosystem-integration thinking, the mission reframed to fresh-build with selective extract. The original vision is preserved at the bottom for context.

## What we're building

A **fresh-build successor wiki** for the QuakeWorld community, designed from day 1 to be one layer in an integrated ecosystem (alongside quake.world, hub V2, oracle, maps.quake.world, and xantom's BSP + demo parsers).

The successor wiki:

1. Stands up as a clean MW 1.39 LTS install with Citizen skin + Page Forms + SMW from day 1 -- no legacy upgrade chain
2. Has template architecture designed for an aggregation-layer pattern: top-level entity pages combine auto-populated structured data slots + manually-authored narrative slots + ecosystem-aware citation slots
3. Selectively imports irreplaceable content from the existing wiki dump (substantial articles, Purity's columns, KTX mode pages, tournament season pages, file/image archive, the InfoboxComplete-tagged player set)
4. Drops the long tail of the existing wiki -- player stubs, broken-link debris, legacy template architecture
5. Preserves URL structure for imported content so external code references survive

## What we are NOT building

- A 1:1 modernization of the existing wiki (the legacy structural decisions don't match the ecosystem role)
- A replacement for quake.world or hub V2 (those own structured data: tournaments, brackets, player achievements, BSP-derived map data)
- A standalone knowledge base (it's a layer; quake.world / hub / oracle are the others)
- A fork of MediaWiki or a new wiki engine (MediaWiki + SMW + Page Forms + Citizen still has the right primitives)

## The wiki's role in the ecosystem

The wiki retains what wikis are actually good at:

- Long-form narrative (mode descriptions, mechanics, history, lore, columns, tournament writeups)
- Free-form community contribution by anyone with a browser
- Search-engine discoverability (Google -> wiki page is how new players find QW info)
- Encyclopedic browse experience (no question to formulate -- just read)
- File and image hosting (5,024 files including 178 demos)
- Operator-absence resilience (the wiki survives even when operator is offline)

Quake.world owns: tournament results / brackets / player achievements / team rosters / map BSP-derived data / demo references / current-state stats. Hub V2 owns: live games + match history. Oracle owns: structured Q&A across all of the above. The successor wiki integrates with these via:

- Citation templates (`{{hub-match|...}}`, `{{maps-qw|...}}`, `{{forum-thread|...}}`, `{{podcast|...}}`)
- External Data extension wired to ecosystem APIs for auto-pop slots
- SMW property model that supports `{{#ask}}` queries from the front page + category pages

## Success criteria

- **Pass A delivers:** locked extraction policy + foundation scope. We know what to extract from the old wiki and what to drop.
- **Pass B delivers:** namespace + template architecture. Each entity type has its home and its aggregation pattern.
- **Pass C delivers:** Page Forms + SMW property scheme. Form-driven editing for structured content.
- **Pass D delivers:** ecosystem integration scaffolding. Citation template conventions + External Data wiring (against placeholder endpoints if quake.world isn't live yet).
- **Pass E delivers:** quality + discoverability + UX design. Stub prevention + search + new-player onramp.
- **Pass F delivers:** selective import + cutover + deployment. Fresh-stack running locally with imported subset; ready for Unraid + Cloudflare deployment.
- **Implementation phases (post-arc):** stand up the stack, run extraction queries against the old dump, import subset, wire up External Data, deploy to Unraid + wiki.slipgate.me, showcase to community.

## Strategic value

- Aligns with the broader ecosystem (quake.world + hub + oracle + xantom's parsers) instead of preserving 2007-era architecture
- Reduces ciscon's long-term maintenance burden (modern stack, smaller corpus, automated quality gates)
- Provides oracle with cleaner narrative data via cross-citation rather than scrape-and-hope
- Serves new-player retention by giving Google a trustworthy landing page for QW concepts
- Makes the wiki *more* valuable per page even though it's structurally smaller

## Eventual cutover (out of scope of this arc)

After fresh-stack ships locally + community alignment is reached, operator + ciscon decide if/when the new wiki replaces the live wiki at quakeworld.nu/wiki. Same DNS pattern (xantom controls); same URL slugs (preserved). The successor wiki is the canonical wiki going forward; the original wiki becomes archive (read-only banner pointing forward).

---

## ORIGINAL VISION (pre-pivot, preserved for context)

> The text below was the original modernize-in-place mission. It is no longer the active mission as of 2026-05-09 evening. Read for historical context only.

### What we were building (original)

A local, modernized clone of the QuakeWorld community wiki, used to:

1. Prove the MediaWiki upgrade path works (1.35 -> 1.39 LTS or later)
2. Provide a Page Forms compliance environment for the Phase B cleanup pilot
3. Serve as a showcase demo when proposing the upgrade to bps/ciscon/Hooraytio/alice
4. Eventually contribute back via cutover (operator's stretch goal, not blocking)

### Original success criteria

- Phase 1 -- dump imports cleanly into MW 1.35 clone; pages render identically to live wiki
- Phase 2 -- upgrade to MW 1.39 LTS + PHP 8.x clean, no data loss, all extensions still functional
- Phase 3 -- Citizen skin + VisualEditor working; dark mode visible
- Phase 4 -- Page Forms authored for tournament/brand/player/clan templates
- Phase 5 -- EQL drain runs end-to-end on sandbox via form-driven editing
- Phase 6 -- maintainers see a credible demo and the live-cutover conversation has a concrete proposal anchored in real demo

### Why the original framing was reframed

Content analysis after Pass 1 surfaced that 51% of Main NS pages are stubs, 63% are stale 5+ years, the wiki is dominated by player profiles (5,903) most of which are stub-quality (3,353 community-tagged stubs), and edit attribution is severed in ciscon's dump. The substantial-content tail (~679 pages 5KB+) is real but narrow. Combined with the operator's articulation of an ecosystem-integration vision (bidirectional citation + auto-population across wiki + quake.world + hub + oracle + xantom's parsers), modernize-in-place would have polished a 2007-era information architecture instead of redesigning for the ecosystem role. Fresh-build with selective extract gets the same end-state more directly.
