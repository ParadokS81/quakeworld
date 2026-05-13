# QWiki Sandbox -- v1-beta substrate + Modes mini-arc

**Status:** Active development. v1-beta fresh-build MediaWiki substrate (arc `2026-05-12-qwiki-v1-beta`). Houses the deploy artifacts for the new wiki at `wiki-beta.quake.world` and the Modes-mini-arc curator tool that ships later in the arc.

**Pivoted 2026-05-09 evening from modernize-in-place to fresh-build.** Old-wiki dump + image tarball under `dumps/` (gitignored) remain reference material for per-domain extracts. The substrate stands up clean (no upgrade-from-1.35 chain); old wiki is extraction source only.

## Documentation index

| When you need... | Read... |
|---|---|
| Quick-start (what's here, current state) | `README.md` |
| Vision: fresh-build scope + ecosystem role | `VISION.md` (preserves pre-pivot vision in an appendix) |
| Living state (current arc phase + deploy status) | `OVERVIEW.md` |
| Deploy runbook (Unraid + Cloudflare Tunnel + nginx + mediawiki-fpm + MariaDB + Citizen) | `deploy/README.md` (after Phase 1 ships) |
| Arc plan + decisions + phase MDs | `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/` (repo-root tree) |
| Modes curator tool (after Phase 6 ships) | `scripts/curate-modes/CLAUDE.md` |
| Source dumps | `dumps/` (gitignored) |

## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `deploy/` | `deploy/README.md` (Phase 1) | Three-container compose (nginx + mediawiki-fpm + mariadb) + nginx.conf + LocalSettings.php + env example for Unraid prod stack |
| `scripts/curate-modes/` | TBD (Phase 6) | Modes triage curator tool, brand-curator pattern |
| `dumps/` | n/a | Gitignored; ciscon's old-wiki SQL dump + image tarball (reference) |

## Always-on rules

- `dumps/` is gitignored. SQL dump + image tarball are large; never commit them.
- New-build wiki content is authored in the live wiki (form-driven via Page Forms after Phase 2); not in this repo. This directory is for substrate + tooling, not page content.
- `LocalSettings.php` in `deploy/` carries secrets via `getenv()` so the file is safe to commit. Real secrets live in `/mnt/user/appdata/qwiki-beta/.env` on Unraid (mode 600, not in repo).
- The prod stack is three containers: `qwiki-nginx` (CF Tunnel-facing on `192.168.1.205:8081`), `qwiki-mediawiki` (php-fpm at port 9000, internal-net-only), `qwiki-mariadb` (internal-net-only). The MW source tree at `/var/www/html` is a shared host bind-mount from `/mnt/user/appdata/qwiki-beta/mediawiki-html/`, extracted from the mediawiki image at first deploy and refreshed via the documented procedure on each MW image bump.
- Pre-pivot 6-phase plan (clone -> upgrade -> Citizen -> Page Forms -> EQL drain -> showcase) is NOT the current plan. Current plan: arc at `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`.

## Related

- Sister project: `apps/qw-oracle/` -- the QW knowledge service that ingests wiki content via the Layer 3 harvest path (verified during Phase 4 of this arc).
- Arc spec: `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 LOCKED 2026-05-12).
- Operator memory: `project_qwiki_sandbox_passes.md` (pass tracker), `project_qwiki_sandbox_genesis.md` (origin context).
