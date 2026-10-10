# qwiki-sandbox

Fresh-build MediaWiki 1.43 substrate for the v1-beta successor wiki at https://wiki.slipgate.me, and the home for the Modes curator tool when it ships.

## What this is

The deploy and tooling home for the qwiki-v1-beta arc (`docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`). The arc pivoted on 2026-05-09 from modernizing the existing wiki in place to building a fresh successor and extracting selectively from the old one.

The old wiki at https://www.quakeworld.nu/wiki/ (MediaWiki 1.35.10 + PHP 7.4 when last checked, 2026-05-08) is the extraction source; wiki.slipgate.me is the new substrate. Cutover from the beta URL to the live one is a future arc, not this one.

## What runs live

Three containers on the Unraid box, defined in `deploy/docker-compose.prod.yml` and fronted by the shared Cloudflare Tunnel:

- `qwiki-nginx` (nginx 1.30-alpine), `qwiki-mediawiki` (mediawiki:1.43-fpm), `qwiki-mariadb` (MariaDB 11.4).
- Citizen skin 3.16.0; Page Forms (REL1_43) and Semantic MediaWiki 6.0.1; PluggableAuth + OpenIDConnect against Discord OAuth, with `wiki-contributor` granted from the `@wiki-beta` Discord role on every login and `wiki-curator` assigned by hand.
- The three quality-tag categories (`Needs review` / `Stale` / `Draft`), the `Help:URL slug discipline` page and the Layer 3 harvest-probe page.

Current work (the Modes mini-arc, Phases 5-8, unstarted) is the repo-root `HANDOVER.md` future-arc row; what shipped and when is `apps/qw-oracle/docs/arc-history.md` (the 2026-05-14 entry).

## Operating it

Everything runs from the dev-cockpit: edit the file in `deploy/`, copy it into `/mnt/user/appdata/qwiki-beta/`, restart the affected container. The exact sequences, the MW image-bump procedure, the operator command table and troubleshooting are in `deploy/README.md`.

## Files

- `deploy/` -- compose, nginx.conf, LocalSettings.php, composer.local.json, `.env.prod.example`, the Phase 4 seed pages and the Phase 2 smoke-test form, plus the runbook
- `CLAUDE.md` -- entry point and rules for agents touching this directory
- `VISION.md` -- why fresh-build; the pre-pivot vision kept as an appendix
- `OVERVIEW.md` -- living map: stack, auth model, source artifacts, operations, decisions pointer
- `dumps/` -- gitignored and absent on the cockpit (see `OVERVIEW.md`, Source artifacts)
- `scripts/curate-modes/` -- not created yet; Phase 6 births the Modes curator tool here
