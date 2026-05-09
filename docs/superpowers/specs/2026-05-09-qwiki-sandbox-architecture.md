---
status: brainstorm in progress (Pass 1 of 5)
arc: 2026-05-09-qwiki-sandbox
parking: docs/superpowers/parking/2026-05-09-qwiki-sandbox-arc-planning-handover.md
---

# QWiki Sandbox -- Architecture Spec

Living spec for the qwiki-sandbox modernization arc. Pass-by-pass drain destination during arc-brainstormer; arc-planner phase MDs reference this spec for cross-cutting decisions.

## Arc passes

- Pass 1 -- phase-1 local sandbox mechanics (in progress)
- Pass 1.5 -- production deployment: Unraid + Cloudflare tunnel + bot observation (carry-forward, deferred from Pass 1)
- Pass 2 -- phase 2 + 3 upgrade choreography + UX layer (MW 1.35 -> 1.39 LTS + PHP 8.x + Citizen + VisualEditor + dark mode)
- Pass 3 -- phase 4 Page Forms audit + form authoring (preserve flexibility per alice's pushback)
- Pass 4 -- phase 5 EQL cleanup pilot + ongoing-event form demo (gives alice a self-interest hook)
- Pass 5 -- phase 6 showcase + cutover proposal (preserve ciscon's tarpit infrastructure)

---

## Pass 1 -- phase-1 local sandbox mechanics

**Scope:** local Docker sandbox on WSL. Dump import + render verification vs live wiki. Production deployment (Unraid + Cloudflare tunnel + bot observation) deferred to Pass 1.5.

**Working dir:** `apps/qwiki-sandbox/`. Dumps already in place:

- `dumps/qwiki.sql.gz` -- 87M compressed -> 710M uncompressed
- `dumps/wiki-images.tar.gz` -- 6.4G

### 1.1 Dump pre-flight inspection -- LOCKED

Inspection performed 2026-05-09. Findings:

- **Source:** MariaDB 11.8.6-MariaDB-ubu2404 (Debian-linux-gnu container) via `mysqldump 10.19`
- **Database name:** `qwiki`
- **Sizes:** 87M compressed (90,745,624 bytes), 710M uncompressed (709,939,461 bytes)
- **Connection preamble:** `SET NAMES utf8mb4` on dump load
- **Tables:** 96 total
  - 94 InnoDB / `DEFAULT CHARSET=binary` -- the MediaWiki-recommended setup (MW handles its own UTF-8 internally; binary storage avoids double-encoding)
  - 2 MyISAM / `DEFAULT CHARSET=utf8mb3` / `COLLATE=utf8mb3_general_ci` -- likely `searchindex` (FULLTEXT requires MyISAM on older MW) plus one legacy table

- **Schema era:** MW 1.31+ (post-MCR: `slots`, `content`, `actor` tables present). Consistent with reported live MW 1.35.10.
- **SMW tables present:** full SMW 4.x schema
  - Data-item tables: `smw_di_blob`, `smw_di_bool`, `smw_di_coords`, `smw_di_number`, `smw_di_time`, `smw_di_uri`, `smw_di_wikipage`
  - Fixed property tables: ~30 `smw_fpt_*` tables
  - Object/property infra: `smw_object_aux`, `smw_object_ids`, `smw_prop_stats`, `smw_query_links`, `smw_concept_cache`, `smw_ft_search`
- **Page Forms:** no dedicated tables (PF stores forms as wiki pages in the `Form:` namespace -- normal)
- **Cargo:** not installed (no `cargo__*` tables) -- live wiki uses SMW exclusively
- **Discord Notifications:** no tables (hook-based extension, no schema)

**Implications for compose stack:**

- Target image: `mariadb:11` (matches dump source minor exactly)
- Server must support `binary` charset (default in MariaDB) and `utf8mb3` (still supported in MariaDB 11 though deprecated)
- No special foreign-key juggling needed -- dump wraps inserts in `FOREIGN_KEY_CHECKS=0`
- No InnoDB-only constraint -- the 2 MyISAM tables import as-is
- Expected import time: 5-10 minutes on local SSD

### 1.2 Compose stack shape -- LOCKED

**Services (two):**

- `mediawiki:1.35` -- latest 1.35.x tag (currently 1.35.14). Pin via tag, not `latest`, so we control the upgrade beat.
- `mariadb:11` -- matches dump source minor (11.8.6). Pin via tag.

**Bind mounts (host -> container):**

- `./images/` -> `/var/www/html/images` (extracted tarball)
- `./extensions/` -> `/var/www/html/extensions` (extension dirs we acquire in 1.5)
- `./skins/LiquiFlow/` -> `/var/www/html/skins/LiquiFlow` (skin dir from 1.5)
- `./LocalSettings.php` -> `/var/www/html/LocalSettings.php` (config from 1.4)

**Named volume:**

- `mariadb_data` -> `/var/lib/mysql` -- so re-creating the mediawiki container doesn't blow away the imported DB.

**Network:**

- Default bridge. mediawiki published to `localhost:8080`. mariadb internal-only (no host port).

**Init:**

- An `init.sql` in `/docker-entrypoint-initdb.d/` of the mariadb service creates the empty `qwiki` database on first mariadb boot.
- The actual dump load is a separate `docker exec` step (specced in 1.6).

**Excluded for Phase 1:**

- No parsoid (added in Pass 2 alongside VisualEditor).
- No elasticsearch / CirrusSearch (live wiki uses MW's built-in SearchEngine; we stay matched).
- No init container, no reverse proxy. Direct port bind to localhost is sufficient for local-only sandbox.

**Why this shape:** minimal services for "render existing data identically to live"; portable as-is to Unraid in Pass 1.5; mariadb data volume persists across `docker compose down`, so re-imports are opt-in.

### 1.3 Image tarball extraction -- LOCKED

**Tarball structure verified (2026-05-09):**

- 50,150 total entries
- Internal path layout: `mnt/nas-backup/qw3/docker/wiki/images/<sharded MW subdirs>/<file>`
- Sample entries: `mnt/nas-backup/qw3/docker/wiki/images/0/00/Faust1.jpg`, etc.

**Extraction procedure:**

- Working dir: `apps/qwiki-sandbox/`
- Command: `tar -xzf dumps/wiki-images.tar.gz --strip-components=5 -C ./`
- Result: `apps/qwiki-sandbox/images/<sharded subdirs>/<files>` -- matches the bind-mount path locked in 1.2
- Add `images/` to `apps/qwiki-sandbox/.gitignore` (parent `dumps/` is already gitignored)
- One-time prep at start of Phase 1 implementation; ~5-10 min on SSD
- 870G free disk space at extraction target -- 6.4G extraction is trivial

**Permission note (carry-forward to Pass 2/3):**

Phase 1 is read-only (render verification only), so default host-extracted ownership (paradoks:1000) is fine for container read. When Phase 3-4 introduces actual editing through VisualEditor + Page Forms, the mediawiki service may need `user: "1000:1000"` so container writes (uploads, thumbnails, cache) land with host-compatible ownership. Re-evaluate during Pass 2/3.

### 1.4 LocalSettings.php strategy -- LOCKED

**Two-path decision:**

- **Primary (A):** ask ciscon for the live wiki's `LocalSettings.php`, sanitized:
  - Strip: `$wgDBpassword`, `$wgSecretKey`, `$wgUpgradeKey`, any SMTP / Discord webhook / API credentials
  - Keep: site name, language, default skin, DB connection structure (with `$wgDBpassword` placeholder), extension load list + per-extension config, logo + favicon paths, `$wgGroupPermissions`, custom snippets, cache config
  - Operator messaged ciscon 2026-05-09; reply window 12-24h (different timezone)
- **Fallback (B):** if ciscon unavailable when implementation starts, bootstrap via `php install.php` against the imported DB to get a vanilla LocalSettings.php, then reconstruct the extension load list from the Special:Version data already captured in the handover (~8 extensions affect Phase 1 rendering: SMW, Page Forms, ParserFunctions, Arrays, Variables, Validator, External Data, image-related). Less faithful -- per-extension config knobs may be missed and surface as render gaps in 1.7.

**Sandbox file split (regardless of A or B):**

- Vanilla baseline `LocalSettings.php` from primary or fallback path
- Sandbox-specific override file `LocalSettings.local.php` (included from main) holds:
  - `$wgServer = 'http://localhost:8080'`
  - Freshly-generated `$wgSecretKey` + `$wgUpgradeKey`
  - `$wgDBpassword` for the local mariadb container
  - Debug toggles (`$wgShowExceptionDetails = true`, etc.)
- Same baseline, different `LocalSettings.local.php` per environment makes Pass 1.5 (Unraid deploy) clean.

**Does this block planning?** No. Pass 1 sub-questions 1.5 / 1.6 / 1.7 are settle-able without ciscon's file in hand. Only blocks the moment of `docker compose up` -- and Passes 2-5 of brainstorm still ahead, so ciscon's response window likely overlaps implementation kickoff.

### 1.5 Extension + skin acquisition -- LOCKED

**Bundled with 1.4 ask.** Operator messaged ciscon 2026-05-09 requesting: `LocalSettings.php` (sanitized) + `extensions/` tarball + `skins/` tarball. Single ask, three artifacts (or one combined `qwiki-config.tar.gz`).

**Live extension stack (per Special:Version, 2026-05-08):**

- Semantic MediaWiki 4.1.3
- Page Forms 4.9.4
- External Data 2.1
- WikiEditor 0.5.3
- Validator 2.2.3
- ParserFunctions, Arrays, Variables (versions to be confirmed from ciscon's bundle)
- EmbedVideo, MultimediaViewer, PageImages, TextExtracts (versions various)
- Discord Notifications 1.1.3

**Live skin stack:**

- LiquiFlow 1.1 (custom, Liquipedia-derived) -- active
- MonoBook + Vector (legacy MW defaults, available)

**Two-path decision:**

- **Primary (A):** ciscon's bundle. Version-matched, zero guesswork. Extracted into `apps/qwiki-sandbox/extensions/` and `apps/qwiki-sandbox/skins/` (matches bind-mount paths from 1.2).
- **Fallback (B):**
  - Standard extensions: REL1_35 release tarballs from `extdist.wmflabs.org` (Wikimedia's per-MW-version extension distributor).
  - SMW family: `composer require mediawiki/semantic-media-wiki:~4.1.3` (and similar for Page Forms / Validator / External Data).
  - **LiquiFlow specifically:** check Liquipedia's GitHub for public source. If absent, drop to stock Vector skin for Phase 1 and accept reduced skin-chrome equivalence (data layer still verifies). Revisit in Pass 2 -- LiquiFlow gets replaced with Citizen during the MW 1.39 upgrade anyway, so the loss is temporary.

**LiquiFlow escape-hatch rationale:** without it, ciscon becomes a hard blocker on Phase 1. With it, Phase 1 can proceed in skin-degraded mode and full chrome equivalence catches up in Pass 2 / Phase 3.

**Gitignore:** `extensions/` and `skins/` added (3rd-party / vendored content; sourcing reproducible from ciscon's bundle or extdist).

### 1.6 Dump import procedure -- LOCKED

**Two-mode approach.**

#### Mode 1: First-boot auto-import (happy path)

The `mariadb:11` Docker image auto-runs anything in `/docker-entrypoint-initdb.d/` on first boot of a fresh data volume; supports `.sql`, `.sh`, `.sql.gz` directly.

- Bind-mount `./dumps/qwiki.sql.gz` -> `/docker-entrypoint-initdb.d/qwiki.sql.gz`
- Set `MYSQL_DATABASE=qwiki` env var so the database is created before the dump loads
- First `docker compose up -d` -> mariadb creates `qwiki`, auto-imports the dump (~5-10 min), comes up healthy
- Zero scripting for the happy path

#### Mode 2: Explicit re-import (for dev iteration)

When something breaks and we want to restore from clean dump without nuking the named volume:

- `apps/qwiki-sandbox/scripts/reimport-dump.sh`
- Steps: DROP DATABASE qwiki; CREATE DATABASE qwiki; gunzip -c dumps/qwiki.sql.gz | docker compose exec -T mariadb mysql qwiki
- Runs in ~5-10 min, no compose-down needed, mediawiki container restart afterwards (clears object cache)

#### Post-import verification

`apps/qwiki-sandbox/scripts/verify-import.sh` runs:

- `SELECT COUNT(*) FROM page` -- expect ~9000+ (live wiki has roughly 9 years of articles per operator)
- `SELECT COUNT(*) FROM revision`
- `SELECT COUNT(*) FROM image` -- sanity-check vs 50,150 tarball entries (caveat: tarball includes thumbnails + variants; `image` table only counts originals, expect orders of magnitude less)
- `SELECT COUNT(*) FROM smw_object_ids` -- confirms SMW data imported, not just schema
- `SHOW TABLES` -- expect 96 tables (matches 1.1 pre-flight)

#### Notes / gotchas

- Dump has no `USE qwiki;` / `CREATE DATABASE` (standard mysqldump for single-DB without `--databases` flag). `MYSQL_DATABASE` env var creates the DB context first; dump's `CREATE TABLE` statements land into it.
- Charset alignment: dump preamble `SET NAMES utf8mb4` matches mariadb 11 default. No charset flag needed on import.
- The 2 MyISAM tables (1.1 finding) import cleanly under mariadb 11 (engine still supported).
- Root password lives in `.env` (gitignored); compose file references via `${MARIADB_ROOT_PASSWORD}`.

### 1.7 Render-verification regime -- LOCKED

Becomes the Phase 1 success gate AND a regression suite reused in Phases 2-5 (upgrade chain + cleanup pilot).

#### Page sample (8 pages)

Operator picks specific instances at implementation time; categories below ensure load-bearing components are exercised:

- Front page (basic sanity)
- Tournament page (heavy template + SMW use, e.g. recent EQL season)
- Brand page (SMW property-rich, e.g. Brand:EQL)
- Player page (infobox-driven)
- Clan page (member list, history)
- Map page (image-heavy, dimensions)
- A page with embedded `{{#ask}}` SMW query (proves SMW end-to-end)
- `Special:Version` (proves extension load list matches expectation)

#### Comparison mechanism: HTML diff with normalization

`apps/qwiki-sandbox/scripts/verify-render.sh` runs per page slug:

- `curl -s https://wiki.quakeworld.nu/wiki/<slug>` -> `live.html`
- `curl -s http://localhost:8080/wiki/<slug>` -> `sandbox.html`
- Normalize both: strip variable IDs (`mw-rev-id`, edit tokens), HTML-comment timestamps, server-URL prefixes (rewrite `https://www.quakeworld.nu` -> `http://localhost:8080`)
- `diff` the normalized output; report line count and per-page status

#### Pass criteria (two tiers, depending on 1.5 outcome)

- **Strict tier (LiquiFlow available):** HTML structure identical after normalization. Zero or near-zero diff lines.
- **Relaxed tier (Vector fallback):** article body (`<div class="mw-parser-output">`) + extension-rendered components identical. Skin chrome diffs (Vector wraps differently than LiquiFlow) acknowledged and accepted.
- **Both tiers, hard fails:** any "Template:X not found" / "Extension:Y not loaded" error in HTML; visible PHP errors; SMW queries returning empty when live shows data; Page Forms rendering as raw `{{#forminput:...}}` syntax.

#### Phase 1 success gate

All 8 sample pages pass per their tier. Then Phase 1 ships.

#### Reusability payoff

Same script becomes the regression suite for:

- Phase 2 -- post-MW-1.39-upgrade verification (did upgrading break anything?)
- Phase 3 -- post-skin/VE swap verification
- Phase 5 -- cleanup pilot (after Page-Forms-driven edit, does the page still render?)

Investment now pays back across every later phase.

---

## Pass 1 close (2026-05-09)

**Status:** COMPLETE.

### Sub-questions resolved

- **1.1 Dump pre-flight inspection** -- LOCKED. Clean MW 1.35 + SMW 4.x dump from MariaDB 11.8.6, 96 tables (94 InnoDB / 2 MyISAM), binary charset.
- **1.2 Compose stack shape** -- LOCKED. Two services (mediawiki:1.35 + mariadb:11), bind mounts for images / extensions / skins / LocalSettings.php, named volume for DB persistence, mariadb internal-only.
- **1.3 Image tarball extraction** -- LOCKED. `tar` with `--strip-components=5` to `apps/qwiki-sandbox/images/`, gitignored. Permission concern flagged for Pass 2 / 3.
- **1.4 LocalSettings.php strategy** -- LOCKED. Primary: ciscon ships sanitized version. Fallback: bootstrap via installer + reconstruct extension load. Sandbox file split: vanilla baseline + `LocalSettings.local.php` per environment.
- **1.5 Extension + skin acquisition** -- LOCKED. Bundled with 1.4 ask. Fallback for standard extensions = `extdist.wmflabs.org` REL1_35 + composer for SMW family. LiquiFlow escape hatch = drop to stock Vector for Phase 1 (LiquiFlow gets replaced with Citizen in Phase 3 anyway).
- **1.6 Dump import procedure** -- LOCKED. Mode 1: first-boot auto-import via `/docker-entrypoint-initdb.d/`. Mode 2: explicit `reimport-dump.sh` for dev iteration. Post-import verification script with row counts.
- **1.7 Render-verification regime** -- LOCKED. 8 sample pages, HTML diff with normalization, two-tier pass criteria (strict if LiquiFlow available / relaxed if Vector fallback). Reusable as regression suite for Phases 2-5.

### Carry-forwards

- **Pass 1.5 -- production deployment.** Track: new pass added to plan, runs after Pass 1, before Pass 2. Scope: Unraid migration mechanics + Cloudflare tunnel + `wiki.slipgate.me` wiring + bot observation strategy (Cloudflare Analytics + ask ciscon for live access logs + slow-bake on the sandbox).
- **Permission/ownership for write-mode editing.** Track: Pass 2 / 3 sub-question. Revisit when Phase 3-4 introduces VisualEditor + Page Forms editing on the sandbox.
- **LiquiFlow vs Citizen replacement decision.** Track: Pass 2 sub-question (skin selection during MW 1.39 upgrade choreography).
- **Awaiting ciscon's config bundle** (LocalSettings.php sanitized + extensions/ + skins/). Track: external dependency, NOT planning-blocking. Phase 1 implementation gated on it (with B fallback documented).

### Pass plan revisions

Pass 1.5 added; Pass 2-5 unchanged in scope.

- Pass 1 -- COMPLETE
- Pass 1.5 -- production deployment (Unraid + Cloudflare + bot observation) -- pending
- Pass 2 -- phase 2 + 3 upgrade choreography + UX layer -- pending
- Pass 3 -- phase 4 Page Forms audit + form authoring -- pending
- Pass 4 -- phase 5 EQL cleanup pilot + ongoing-event form demo -- pending
- Pass 5 -- phase 6 showcase + cutover proposal -- pending
