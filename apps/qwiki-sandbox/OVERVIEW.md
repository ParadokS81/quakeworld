# QWiki Sandbox -- Overview

Living map of the project. Updated when state changes.

## Current phase

**arc-brainstormer Pass 1 COMPLETE** (2026-05-09). 7 sub-questions locked; architecture drained to `docs/superpowers/specs/2026-05-09-qwiki-sandbox-architecture.md`.

Pass 1.5 (production deployment) + Passes 2-5 pending, fresh terminal each. Phase 1 implementation gated on ciscon's config bundle (LocalSettings.php sanitized + extensions/ + skins/), requested 2026-05-09 via Discord.

Memory tracker: `project_qwiki_sandbox_passes.md`.

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
