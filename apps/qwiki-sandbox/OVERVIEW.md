# QWiki Sandbox -- Overview

Living map of the v1-beta substrate + Modes mini-arc tooling. Updated as state changes during the arc.

## Current arc

**`docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`** -- 8-phase arc, 4 substrate phases + 4 Modes-mini-arc phases. See that directory's `README.md` for the phase index and live status table.

Pre-pivot 6-phase plan (clone -> upgrade -> Citizen -> Page Forms -> EQL drain -> showcase) is superseded; preserved in `VISION.md` as ORIGINAL VISION appendix for historical context.

## Substrate state

After Phase 1 ships: a three-container Docker stack on Unraid -- `qwiki-nginx` (nginx 1.30-alpine, the CF Tunnel-facing entry point) + `qwiki-mediawiki` (mediawiki:1.43-fpm, php-fpm at port 9000) + `qwiki-mariadb` (mariadb 11.4 LTS) -- plus the Citizen skin v3.16.0 git checkout. Vanilla; no extensions; no auth (anonymous read works, anonymous edit blocked). Live at `wiki-beta.quake.world` via Cloudflare Tunnel.

Phases 2 / 3 / 4 layer Page Forms + SMW, then PluggableAuth + Discord OAuth + MW groups, then quality-tag categories + Layer 3 harvest verification.

## Modes mini-arc state

Phases 5-8 deliver Mode page-type form + curator tool + 27-mode triage + harvest verification. Status tracked in the arc README's phase index.

## Source artifacts on operator's side

- `dumps/qwiki.sql.gz` (87M -> ~710M uncompressed, MariaDB 11.8.6 dump, 96 tables; 94 InnoDB / 2 MyISAM, binary charset). Source of per-domain extract queries.
- `dumps/wiki-images.tar.gz` (6.4G, 50,150 files incl 178 bonus QW demos). Per-domain image migration deferred; Modes may need a few screenshots.
- Local `qwiki-analysis` MariaDB container (operator's WSL Docker) holds the imported dump for inventory queries. Kept alive through the Modes mini-arc.

## Key external dependencies

- **bps** -- founder of QWiki, decision-maker for live-wiki cutover (future arc).
- **ciscon** -- sysadmin of live wiki; source of the dumps.
- **Hooraytio + alice** -- top live-wiki contributors; potential v1-beta invitees.
- **Live wiki** at https://www.quakeworld.nu/wiki/ -- extraction source.

## Decisions log

Cross-cutting decisions live in the arc's `decisions.md` (D1-D26, locked 2026-05-12; D2 amended 2026-05-13 to lock nginx + php-fpm + MariaDB composition). No project-internal decisions log; if a phase needs to deviate from a locked decision, the phase MD's "Deviation" section + operator review handles it (per D25).
