# QWiki Sandbox -- v1-beta substrate

**Status:** Maintenance. The fresh-build MediaWiki substrate behind `wiki.slipgate.me` and its deploy artifacts; current work (the Modes mini-arc, Phases 5-8 of arc `2026-05-12-qwiki-v1-beta`) is the repo-root `HANDOVER.md` future-arc row.

## Documentation index

| When you need... | Read... |
|---|---|
| What this is and what runs live | `README.md` |
| Why fresh-build, the wiki's ecosystem role, non-goals (pre-pivot vision kept as an appendix) | `VISION.md` |
| Living map: stack, auth model, namespace gates, source artifacts, operations, decisions pointer | `OVERVIEW.md` |
| Deploy and operate the stack from the dev-cockpit: redeploys, MW image bumps, extension bumps, troubleshooting, backup and recovery (the DEPLOYMENT role for this app) | `deploy/README.md` |
| Arc plan, locked decisions D1-D26 with their amendments, phase MDs | `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/` (repo-root chronicle; its README's status block stopped at Phase 3 and is not maintained) |
| The dev MariaDB twin `qwiki-mariadb-dev` | `infra/dev-databases/docker-compose.yml` (repo-root tree) |

## Subsystem scopes

| Subfolder | Entry doc | What's there |
|---|---|---|
| `deploy/` | `deploy/README.md` | The prod stack as deployed: `docker-compose.prod.yml`, `nginx.conf`, `LocalSettings.php`, `composer.local.json`, `.env.prod.example`, the Phase 4 seed pages (`seed-pages/`) and the Phase 2 smoke-test form (`test-form/`) |

`scripts/curate-modes/` (the Modes curator tool, Phase 6) does not exist yet; it gets its own `CLAUDE.md` when it is born.

## Always-on rules

- Deploy and maintenance run from the dev-cockpit: `/mnt/user/appdata/qwiki-beta/` is mounted read-write at its host path and `docker` goes through the deploy proxy. There is no SSH to the host (fenced 2026-07-28); the `ssh unraid-deploy` / `scp` identity the arc deployed with no longer exists. `deploy/README.md` carries the current command forms.
- The prod stack is three containers from `deploy/docker-compose.prod.yml`: `qwiki-nginx` (Cloudflare Tunnel-facing on `192.168.1.205:8081`), `qwiki-mediawiki` (php-fpm on 9000, `qwiki-net` only), `qwiki-mariadb` (`qwiki-net` only). The fourth qwiki container on the box, `qwiki-mariadb-dev`, is the dev twin from `infra/dev-databases/`, not part of this compose. The MW source tree at `/var/www/html` is a host bind mount from `/mnt/user/appdata/qwiki-beta/mediawiki-html/`, extracted from the image once and refreshed on each MW image bump per the runbook.
- The files in `deploy/` are the committed copies of what runs. The repo copy is the source of truth: a change lands here first, is copied into the appdata tree, and the affected container is restarted (runbook). If a live copy was edited first, mirror it back in the same session; today they are byte-identical.
- `deploy/LocalSettings.php` reads every secret via `getenv()` and is safe to commit. Real values live in `/mnt/user/appdata/qwiki-beta/.env` (mode 600, never in the repo); write them with `secret-drop env`, never by pasting.
- `dumps/` is gitignored and absent on the cockpit. The old-wiki SQL dump and image tarball last lived on the retired WSL workstation (`OVERVIEW.md`, Source artifacts); never commit them.
- Wiki content is authored in the live wiki (form-driven via Page Forms), never in this repo. This folder is substrate and tooling.
- The pre-pivot plan (clone -> upgrade -> Citizen -> Page Forms -> EQL drain -> showcase; `VISION.md` appendix and the 2026-05-09 parking docs) is not the current plan. The arc at `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/` is.

## Related

- Sister project: `apps/qw-oracle/` -- ingests wiki content via the Layer 3 harvest path, proven end-to-end in Phase 4 (probe note `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md`).
- Arc spec: `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 locked 2026-05-12).
- Shipped history: `apps/qw-oracle/docs/arc-history.md`, the 2026-05-14 entry (qwiki-v1-beta Phases 1-4).
