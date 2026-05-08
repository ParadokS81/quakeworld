# QWiki Sandbox

**Status:** Just-spawned (2026-05-09). Holds ciscon's full DB dump + images tarball while we plan a stepwise upgrade-and-showcase arc.

**Goal:** take a local clone of the live QWiki, modernize it stepwise (MW 1.35 -> 1.39 LTS -> modern skin / VisualEditor -> Page Forms compliance), prove the upgrade path works, showcase to bps/ciscon/Hooraytio/alice for an eventual live cutover conversation.

**Why this matters:** the live QWiki runs on MediaWiki 1.35.10 + PHP 7.4 -- both EOL since 2022/2023. AI bot scraping is hitting always-different URIs (quasi-DDoS pattern, per ciscon). Tournament/player/clan pages have inconsistent template usage. A modernized clone proves the upgrade path is feasible, gives us a Page Forms cleanup environment for Phase B drain, and becomes the demo we bring to maintainers.

## Documentation index

| When you need... | Read... |
|---|---|
| Quick-start (what's here, how to run) | `README.md` |
| Vision: scope, success criteria, eventual cutover | `VISION.md` |
| Living state (current phase + what's done) | `OVERVIEW.md` |
| Source dumps | `dumps/` (gitignored) |

## Subsystem scopes

(none yet -- phase 1 will add `docker-compose.yml`, `LocalSettings.php`, etc.)

## Always-on rules

- `dumps/` is gitignored. SQL dump + image tarball are large; never commit them.
- This is operator's playground. Don't push edits made here back to live wiki without explicit bps + ciscon alignment.
- Each phase is a checkpoint -- stop after any phase and the project still has standalone value.
- LiquiFlow skin + Semantic MediaWiki + Page Forms already exist on the live wiki; the upgrade preserves them, doesn't replace.

## Related

- Sister project: `apps/qw-oracle/` (the QW knowledge service that consumes wiki data)
- Phase B drain workflow brainstorm: `docs/superpowers/parking/2026-05-08-qwiki-phase-4-phase-b-brainstorm-handover.md`
