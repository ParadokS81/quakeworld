# qwiki-sandbox

Local clone of QWiki for upgrade-and-showcase experimentation.

## What this is

Modernization sandbox for the QuakeWorld community wiki at https://www.quakeworld.nu/wiki/.

Live wiki runs MediaWiki 1.35.10 + PHP 7.4 (both EOL). This sandbox holds the full DB dump + image tarball from ciscon, lets us upgrade in steps, and produces a credible demo/proposal for the live cutover.

## Status

2026-05-09: Folder scaffolded. SQL dump + image tarball downloading from ciscon's host (`nicotinelounge.com/qw3-abab/`).

## Files

- `dumps/qwiki.sql.gz` -- full DB dump (gitignored)
- `dumps/wiki-images.tar.gz` -- uploaded images (gitignored)
- `docker-compose.yml` -- to come (mariadb + mediawiki)
- `LocalSettings.php` -- to come

## Plan

See `CLAUDE.md` for arc framing. Phased upgrade:

1. Import dump to MW 1.35 first, verify rendering matches live wiki
2. Upgrade to MW 1.39 LTS + PHP 8.x
3. Citizen skin + VisualEditor + dark mode
4. Audit existing Page Forms; author missing tournament/brand/player/clan forms
5. EQL cleanup pilot drain on the sandbox
6. Showcase to bps/ciscon/Hooraytio/alice
