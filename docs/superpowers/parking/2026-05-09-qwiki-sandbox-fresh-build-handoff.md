# QWiki sandbox -- fresh-build pivot handoff

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

This is the second arc-brainstormer entry point for the qwiki-sandbox arc. The first session (2026-05-09 day) ran arc-classifier (Mode D) + arc-brainstormer Pass 1 (phase-1 local sandbox mechanics, modernize-in-place framing) + a content analysis pass that surfaced data tilting the arc toward fresh-build. Operator decided to pivot. **This session's job: run a new arc-brainstormer pass plan in the fresh-build framing.**

This is still arc-planning, not implementation. Don't spin up a fresh MW container yet.

---

## What changed (the pivot in one paragraph)

Original arc scope: modernize the existing live wiki in place (MW 1.35 -> 1.39 LTS upgrade chain + Citizen + VisualEditor + Page Forms + cleanup pilot + showcase). Content analysis revealed structural decay (51% stubs in Main NS, 63% stale 5+ years, 5,903 player pages dominating with 3,353 community-tagged as stubs, edit attribution severed in ciscon's dump). Combined with operator articulating an ecosystem-integration vision (wiki + quake.world + hub + oracle + maps.quake.world + xantom's parsers, integrated via bidirectional citation + auto-population), the arc reframed to: **fresh-build with selective extract.** Stand up clean MW 1.39 LTS from scratch. Design template architecture for the aggregation-layer pattern from day 1 (auto-pop slots + manual narrative slots + ecosystem-aware citation). Selectively import irreplaceable content from the old dump (substantial articles, Purity's columns, KTX modes, tournament season pages, templates, file archive, InfoboxComplete-444 player set). Drop 5,903 stub player pages + broken-link debris + legacy template architecture.

---

## What carries forward from Pass 1

Some Pass 1 sub-question decisions are framing-independent; they apply to fresh-build too:

- **1.1 dump pre-flight inspection** -- still applicable. Dump structure didn't change.
- **1.3 image tarball extraction** -- carries forward unchanged. We still want the file/image archive (5,024 files including 178 demos). Same `--strip-components=5` + extract to `apps/qwiki-sandbox/images/`.
- **1.6 init.d auto-import pattern** -- now applied to extracted-subset SQL, not the full dump.
- **1.7 render-verification regime** -- reframed as "imported subset renders properly per the new template architecture," not "matches live."
- **1.5 extension acquisition** -- now "install latest from extdist + composer + Citizen skin from day 1," not "match live exactly via ciscon's bundle."

What got obsoleted by the pivot:

- 1.2 used `mediawiki:1.35` -- becomes `mediawiki:1.39`.
- 1.4 "ask ciscon for sanitized LocalSettings.php" -- becomes "design fresh LocalSettings.php for new template architecture."
- LiquiFlow preservation -- DROPPED. Citizen skin from day 1.
- Pass 2 (1.35 -> 1.39 upgrade choreography) -- DISSOLVED. Fresh-install 1.39 directly.
- Pass 3 (skin/VE swap) -- DISSOLVED. Designed in from day 1.

---

## New pass plan (sketch -- arc-brainstormer to confirm + refine in first turn)

- **Pass A -- extraction policy + foundation scope.** Platform call (MediaWiki + SMW + PF + Citizen confirmed as fit; alternative platforms like Wiki.js / DokuWiki / Hugo+git evaluated and rejected). What gets extracted from old wiki (substantial articles, Purity's columns, KTX modes, tournament season pages, templates worth keeping, file/image archive, InfoboxComplete-444 player set). What gets dropped (5,903 stub player pages, broken-link debris, legacy templates).
- **Pass B -- namespace + template architecture.** Custom namespaces per entity type (`Player:`, `Clan:`, `Tournament:`, `Map:`, `Mode:`, `Mechanic:`, `Equipment:`). Aggregation-layer template pattern (top-level entity page = aggregator with sub-pages for leaf content). Sub-page conventions.
- **Pass C -- Page Forms + SMW property scheme.** Form design per namespace. Required vs optional fields. Property model supporting `{{#ask}}` queries from front page + category pages.
- **Pass D -- ecosystem integration.** Citation template conventions (`{{hub-match|...}}`, `{{maps-qw|...}}`, `{{forum-thread|...}}`, `{{podcast|...}}`). External Data wiring for auto-pop slots. Stub-vs-substantial detection that gates whether a page is promoted.
- **Pass E -- quality + discoverability + UX.** Stub prevention + flagging. Broken-link tracker. Search design (CirrusSearch?). New-player onramp (front page + Get Started + Random Substantive Page). Contribution UX (form-driven for structured, free-form wiki for prose).
- **Pass F -- selective import + cutover + deployment.** Extraction procedure (SQL queries against `qwiki-analysis` container for the imported-subset list). URL preservation strategy. Legacy archive handling for non-imported pages. Unraid + Cloudflare wiring (carry-forward from old Pass 1.5 + bot observation strategy).

6 passes. Tighter than the old 5-pass modernize plan but each is denser.

---

## Reads required (priority order)

1. **This file (handoff).**
2. **`docs/research/2026-05-09-qwiki-content-analysis.md`** -- the data driving the pivot. Required reading before Pass A. Has full table breakdown by namespace + age + size + categories + SMW usage + KTX-mode coverage + EQL coverage.
3. **`docs/superpowers/specs/2026-05-09-qwiki-sandbox-architecture.md`** -- Pass 1 sub-question decisions + post-pivot status section + sketched new pass plan.
4. **`docs/superpowers/parking/2026-05-09-qwiki-sandbox-arc-planning-handover.md`** -- original framing for context (read AFTER the new framing is clear).
5. **`apps/qwiki-sandbox/{CLAUDE,VISION,OVERVIEW}.md`** -- project framing. VISION.md updated to reflect fresh-build mission.
6. **Memory: `project_qwiki_sandbox_passes.md`** -- pass tracker with locked principles.

If short on time: 1, 2, 3 are mandatory. 4-6 for context.

---

## Critical rules (carried forward + new)

- **Fresh-build is the path. NOT modernize-in-place.** If the new framing's pass plan starts trying to upgrade an existing wiki, you've slipped.
- **The old wiki is for extraction, not preservation.** New wiki is canonical going forward; old wiki becomes archive. Selective import only.
- **URL preservation matters.** Same article slugs -> same URLs. External code references (KTX source pointing to wiki pages) survive the cutover.
- **Ecosystem-aware design from day 1.** Templates have auto-pop slots + manual narrative slots + citation slots even before quake.world / hub / xantom's parsers exist. Build for the future state.
- **Drop player stubs, full stop.** 5,903 pages, 3,353 explicitly tagged stubs. Hub V2 will produce richer profiles. Don't migrate.
- **Wiki retains the narrative role.** Long-form prose, niche content, community memory, file archive. Quake.world owns structured data. Both feed oracle.
- **Tarpit preserved in cutover proposal.** ciscon's bot defense survives any live-cutover discussion.
- **Operator preferences:** momentum over ceremony / plain English at decision points / one question at a time / decisive recommendations / no subagents for mechanical edits / ASCII-only in code and shared docs / commit early.

---

## First three actions

1. **Read this handoff (you're reading it).**
2. **Read the content analysis report.** That's the data that should drive Pass A's extraction policy decisions.
3. **Invoke arc-brainstormer.** Confirm the 6-pass plan above with operator (or refine), then start Pass A (extraction policy + foundation scope).

---

## When in doubt

- **Tempted to slip back into upgrade choreography ("what if we just upgrade...")** -> don't. The pivot was deliberate. Fresh-build is the path.
- **Tempted to keep all the old wiki's content "just in case"** -> don't. The 51% stub rate IS the legacy debt. Selective import is the value-add.
- **Tempted to design templates for current ecosystem only (no auto-pop slots until quake.world exists)** -> don't. Design for the future state; the slots stay empty in the meantime, but the architecture is ready when other systems come online.
- **Tempted to engage the political "what will bps think" angle prematurely** -> defer. Phase 6 showcase is when stakeholder alignment happens; before then, operator is designing in his own playground.
- **Tempted to evaluate alternative wiki engines (Wiki.js / DokuWiki / Hugo+git)** -> permitted in Pass A but the operator has already concluded MediaWiki + SMW + PF + Citizen is the fit (structured-data primitives matter). Re-evaluate only if Pass A surfaces a hard objection.

---

## Tooling state at handoff

- **mariadb container `qwiki-analysis`** running locally with imported dump. Available for ad-hoc queries: `docker exec qwiki-analysis mariadb -uroot -panalyze qwiki -e "..."`. Use during Pass A + Pass F. Operator can kill with `docker rm -f qwiki-analysis` when done.
- **Image tarball** at `apps/qwiki-sandbox/dumps/wiki-images.tar.gz` (6.4G), unextracted yet.
- **No fresh MW stack running yet.** Pass F or post-Pass-F implementation kicks that off in another fresh terminal.

---

## Context budget projection

Arc-brainstormer 6 passes @ ~30-50k each = 180-300k total. Multi-session.

Single-session aim: confirm pass plan + start Pass A (extraction policy, the foundational pass). Wrap and fresh-terminal between subsequent passes per the established pattern.

---

## Reference: today's session outputs

Day session (2026-05-09) produced:
- arc-classifier Mode D capture
- arc-brainstormer Pass 1 (modernize-in-place framing) -- 7 sub-questions locked, now partially superseded
- Content analysis sidequest (mariadb container + 13 analytical queries + report)
- Strategic conversation that surfaced the ecosystem-integration framing
- Pivot decision

Commits: `790ce064` (Pass 1 close) + this session's wrap commit (pivot capture).

Container `qwiki-analysis` left running for next session's Pass A queries.
