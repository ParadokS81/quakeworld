# qwiki-sandbox

Fresh-build MediaWiki 1.43 substrate for the v1-beta successor wiki at `wiki.slipgate.me`, plus the Modes-mini-arc curator tool home.

## What this is

The deploy + tooling home for the qwiki-v1-beta arc (`docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`). Pivoted 2026-05-09 from a modernize-in-place clone to a fresh-build successor with selective extract from the old wiki.

The live wiki at https://www.quakeworld.nu/wiki/ (MediaWiki 1.35.10 + PHP 7.4) is the extraction source; the v1-beta wiki at https://wiki.slipgate.me is the new substrate. Cutover from beta to the live URL is a future arc (not this one).

## Status

After Phase 1 of the arc ships: a three-container stack (nginx 1.30-alpine + mediawiki:1.43-fpm + mariadb:11.4) + Citizen skin v3.16.0 live at wiki.slipgate.me. Phase 2 adds Page Forms + Semantic MediaWiki. Phase 3 wires PluggableAuth + Discord OAuth. Phase 4 adds quality-tag categories + verifies the Layer 3 harvest path end-to-end. Phases 5-8 ship the Modes mini-arc.

Old-wiki dumps remain at `dumps/` (gitignored) for per-domain extracts.

## Files

- `deploy/` -- three-container compose + nginx.conf + LocalSettings.php + deploy runbook (after Phase 1)
- `scripts/curate-modes/` -- Modes triage curator tool (after Phase 6)
- `dumps/` -- gitignored, holds ciscon's SQL dump + image tarball (reference)
- `CLAUDE.md` -- entry-point for Claude sessions touching this directory
- `VISION.md` -- fresh-build scope; preserves pre-pivot vision in an appendix
- `OVERVIEW.md` -- arc-phase status + current state

## Plan

See `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` for the eight-phase index. This directory is touched by Phase 1 (deploy) and Phase 6 (curator tool).
