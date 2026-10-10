# QWiki Sandbox -- Overview

Living map of the v1-beta substrate and the Modes mini-arc tooling home.

## The arc

`docs/superpowers/plans/2026-05-12-qwiki-v1-beta/` -- eight phases: four substrate phases (shipped) and four Modes mini-arc phases (unstarted). Coarse status is the repo-root `HANDOVER.md` future-arc row; shipped history is `apps/qw-oracle/docs/arc-history.md` (the 2026-05-14 entry). The plan README's own status block stopped at Phase 3 and is chronicle, not status.

The pre-pivot six-phase plan (clone -> upgrade -> Citizen -> Page Forms -> EQL drain -> showcase) is superseded; `VISION.md` keeps it as the ORIGINAL VISION appendix.

## Substrate

- **Stack.** nginx 1.30-alpine + mediawiki:1.43-fpm + MariaDB 11.4 on Unraid (`deploy/docker-compose.prod.yml`), TLS at the Cloudflare edge via the shared tunnel (`slipgate-tunnel`, ops-owned), Citizen skin 3.16.0 as the default skin. MariaDB's datadir is bound via `/mnt/cache/appdata/qwiki-beta/mariadb-data` (same bytes as the `/mnt/user` path; MariaDB must not run over the shfs layer, 2026-08-14).
- **Extensions.** Page Forms (REL1_43 checkout, overlay bind) + Semantic MediaWiki 6.0.1 (Composer, inside `mediawiki-html/`), plus the bundled ParserFunctions / Cite / CategoryTree / TemplateData (the F6 audit's LOAD list; the SKIP and DEFER lists are in `deploy/LocalSettings.php`). VisualEditor is deliberately not loaded (D2).
- **Auth.** PluggableAuth + OpenIDConnect against Discord OAuth (manual endpoint config, `openid identify guilds.members.read` scopes; Discord is the only login path, local login is off). The `wiki-contributor` group is re-synced on every login from the user's `@wiki-beta` Discord role, read server-side by the wiki-owned `wiki.Quake.World` bot (`/guilds/<id>/members/<sub>` with the bot token; D4 amendment 2026-05-14, F9: the user's access token does not survive the OIDC flow). `wiki-curator` is assigned by hand via `Special:UserRights`. Anonymous read is public; anonymous edit is blocked.
- **Namespace gates (D5).** `Form` / `Form_talk` / `Template` / `Template_talk` / `Category` / `Category_talk` need the custom `edit-curator-namespace` right (curators only) via `$wgNamespaceProtection`; `Main` / `Talk` / `File` / `File_talk` / `User` / `User_talk` are contributor-editable; `MediaWiki:` is sysop-only (MW default).
- **Quality tags and discipline pages (D18, D6).** `Category:Needs review` / `Category:Stale` / `Category:Draft`, each documenting its trigger and curator action; `Help:URL slug discipline`; the `Phase 4 harvest probe` page. Wikitext bodies are in `deploy/seed-pages/`. Auto-categorization on save and the slug-validation form hook are Phase 5 work (page-type templates), not wired yet.
- **Harvest path.** A wiki section distilled to `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md`, loaded by qw-oracle's load-concepts pipeline and retrievable through the oracle MCP `search_concepts` tool -- proven end-to-end in Phase 4.

## Modes mini-arc

Phases 5-8: the Mode page-type form, the curator tool (`scripts/curate-modes/`, brand-curator pattern per D20), the 27-mode triage and a second harvest verification. Nothing exists yet; the HANDOVER row is the status home.

## Source artifacts (old wiki)

- `dumps/qwiki.sql.gz` (87M, ~710M uncompressed; MariaDB 11.8.6 dump, 96 tables, binary charset) and `dumps/wiki-images.tar.gz` (6.4G, 50,150 files incl. 178 QW demos). Source of the per-domain extract queries.
- Neither is on the cockpit. They last lived on the operator's retired WSL workstation, together with the `qwiki-analysis` MariaDB container that held the imported dump. A Modes pickup needs the dump re-staged first (into `qwiki-mariadb-dev` from `infra/dev-databases/`, for instance); the operator carries the data, there is no automated route.
- Content analysis of the dump: `docs/research/2026-05-09-qwiki-content-analysis.md`.

## Operations

- **Deploy and maintenance** run from the dev-cockpit against the appdata tree and the deploy proxy: `deploy/README.md`.
- **Backup.** `/mnt/user/appdata/qwiki-beta/` is in the nightly borgmatic run (the MariaDB datadir path plus a logical dump taken inside `qwiki-mariadb`): `infra/unraid-backup/README.md`. Borgmatic and restores are ops-plane; a restore is a letter to ops.
- **Dev twin.** `qwiki-mariadb-dev` (MariaDB 11.4, a `qwiki_beta` database) from `infra/dev-databases/docker-compose.yml`.

## Key external dependencies

- **bps** -- founder of QWiki, decision-maker for live-wiki cutover (future arc).
- **ciscon** -- sysadmin of the live wiki; source of the dumps.
- **Hooraytio + alice** -- top live-wiki contributors; potential v1-beta invitees.
- **Live wiki** at https://www.quakeworld.nu/wiki/ -- extraction source.

## Decisions

Cross-cutting decisions live in the arc's `decisions.md` (D1-D26, locked 2026-05-12; amendments dated 2026-05-13 and 2026-05-14 on D2, D3 and D4). No project-internal decisions log; a phase that must deviate adds a "Deviation" section to its phase MD for operator review (D25).
