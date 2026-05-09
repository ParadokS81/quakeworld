# QWiki Sandbox -- Overview

Living map of the project. Updated when state changes.

## Current phase

**ARC PIVOTED 2026-05-09 evening.** Reframed from modernize-in-place to fresh-build with selective extract.

Day session ran arc-classifier + Pass 1 (modernize-in-place framing, 7 sub-questions locked) + content analysis pass. Content analysis revealed structural decay (51% stubs, 63% stale 5+ years, player-page-dominated, severed edit attribution). Operator articulated ecosystem-integration vision needing redesigned templates from day 1 -> arc reframed.

**Next session entry point:** `docs/superpowers/parking/2026-05-09-qwiki-sandbox-fresh-build-handoff.md`.

**Active artifacts:**
- Content analysis: `docs/research/2026-05-09-qwiki-content-analysis.md`
- Architecture spec (Pass 1 + pivot): `docs/superpowers/specs/2026-05-09-qwiki-sandbox-architecture.md`
- Pass tracker: `project_qwiki_sandbox_passes.md` (memory)

**Tooling state:** mariadb container `qwiki-analysis` running locally with imported dump for Pass A / Pass F queries.

- Project folder created at `apps/qwiki-sandbox/`
- `dumps/qwiki.sql.gz` (87M -> 710M uncompressed, MariaDB 11.8.6 dump, 96 tables; 94 InnoDB / 2 MyISAM, binary charset)
- `dumps/wiki-images.tar.gz` (6.4G, 50,150 files incl 178 bonus QW demos)
- Tarball internal prefix verified: `mnt/nas-backup/qw3/docker/wiki/images/...` -- extract with `--strip-components=5`

## Phase plan

| # | Phase | Status |
|---|---|---|
| 0 | Scaffolding + dump grab | DONE 2026-05-09 |
| 1 | MW 1.35 clone via Docker; dump import; render verification | pending |
| 2 | Upgrade to MW 1.39 LTS + PHP 8.1 | pending |
| 3 | Citizen skin + VisualEditor + dark mode | pending |
| 4 | Page Forms audit + author missing forms | pending |
| 5 | EQL cleanup pilot drain on sandbox | pending |
| 6 | Showcase to bps/ciscon/Hooraytio/alice | pending |

## Current files

- `CLAUDE.md` -- project instructions for Claude
- `README.md` -- quick-start
- `VISION.md` -- scope + success criteria
- `OVERVIEW.md` -- this file
- `.gitignore` -- excludes `dumps/`
- `dumps/` -- gitignored, holds downloaded artifacts

## Key external dependencies

- **ciscon** -- provides DB dump + image tarball; sysadmin of live wiki
- **bps** -- founder of QWiki, decision-maker for live-wiki changes
- **Hooraytio + alice** -- top wiki contributors, will drive form-driven cleanup
- **Live wiki** at https://www.quakeworld.nu/wiki/ -- source of truth

## Decisions log

(empty -- to be added as decisions land)
