# Phase 2 -- Page Forms + Semantic MediaWiki extensions

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (table at bottom of that file).
> 3. Read prior approved phase MDs (Phase 1) -- their "Outputs to next phase" sections name what state this phase inherits.
> 4. After drafting, dispatch the verification sub-agent (brief at bottom of this template).

## Goal

Install Page Forms + Semantic MediaWiki onto the MW 1.43 substrate from Phase 1, wire them into `LocalSettings.php`, run the MW + SMW schema-migration commands, and confirm the form pipeline works end-to-end via a single committed smoke-test form. No page-type forms or templates land here -- per D8 + D14, the Mode page-type is Phase 5 work and the other eleven page-types are deferred to future per-domain arcs (D16). What Phase 2 ships is the *substrate*: PF + SMW loaded, semantics enabled at the `wiki-beta.quake.world` domain, the `Form` / `Form_talk` namespaces present, and the SMW jobs queue draining cleanly.

Two important framing points that govern the install-shape choices below:

1. **Page Forms is git-clone overlay; SMW is Composer-managed.** Page Forms has no Packagist deps (it autoloads its own classes via `extension.json`), so a `git clone --branch REL1_43` into a sibling host path + `:ro` overlay bind onto `/var/www/html/extensions/PageForms` is the canonical install. SMW has ~10 Composer dependencies (`onoi/*`, `param-processor/param-processor`, `serialization/serialization`, `mediawiki/parser-hooks`, etc.) that need to live in MW's `vendor/`; SMW's own `INSTALL.md` names Composer as the recommended path. We therefore composer-install SMW into MW root via a committed `composer.local.json` + one-shot `composer:latest` container, which lands SMW source at `extensions/SemanticMediaWiki/` and its deps in `vendor/` (both under Phase 1's parent `mediawiki-html/` bind-mount).

2. **The MW image-bump procedure (Phase 1 deploy README) needs a Phase-2-aware amendment.** Phase 1's image-bump rsync `--delete` against `mediawiki-html/` would wipe SMW + vendor/ deps on every patch refresh. Phase 2 amends that procedure to (a) `--exclude composer.local.json` / `--exclude composer.lock` from the rsync, and (b) re-run `composer update --no-dev` after rsync to rebuild `extensions/SemanticMediaWiki/` + the SMW deps in `vendor/`. Page Forms is unaffected by image bumps because it lives at the sibling host path `page-forms/` and the overlay bind survives the rsync.

Per drafter prompt, D5's namespace-level edit restrictions (Form / Template / Category curator-only) are NOT enforced in Phase 2 -- those land in Phase 3 alongside the `wiki-contributor` / `wiki-curator` group creation. The Form namespace is created by Page Forms via `extension.json` (so it exists at end of Phase 2); the test form + template are created by the sysop user from the install.php run, who has unrestricted edit rights regardless of group config.

**Runnable state at phase boundary:** `Special:Version` lists `Page Forms` and `Semantic MediaWiki` with their version strings; `Special:SMWAdmin` loads without error; the MariaDB `qwiki_beta` database contains the SMW core tables (`smw_object_ids`, `smw_di_blob`, `smw_di_wikipage`, etc.); `Special:FormEdit/TestForm` renders the smoke-test form and submitting it creates `TestPage` in main namespace with `Template:Test` transcluded; `php maintenance/runJobs.php` exits 0 with the SMW jobs queue cleared.

## Inputs from previous phase

Phase 1 complete:

- nginx 1.30-alpine + `mediawiki:1.43-fpm` + MariaDB 11.4 LTS three-container stack running on Unraid at `192.168.1.205:8081`.
- `https://wiki-beta.quake.world` returns the MW main page with Citizen v3.16.0 skin loaded.
- `qwiki_beta` MariaDB database has the MW 1.43 core schema (~58 tables); admin user `Admin` exists with password from `MW_ADMIN_PASSWORD`.
- `apps/qwiki-sandbox/deploy/` directory committed to `main` with: `docker-compose.prod.yml` (three-service compose), `nginx.conf` (fastcgi to mediawiki:9000), `LocalSettings.php` (no extensions yet), `.env.prod.example`, `README.md` (first-time deploy + routine redeploy + MW image-bump procedure).
- `/mnt/user/appdata/qwiki-beta/` populated on Unraid with `mariadb-data/`, `mediawiki-data/`, `mediawiki-html/` (MW core extracted from image), `citizen/` (Citizen skin overlay), plus the scp'd compose / nginx.conf / LocalSettings.php / `.env`.
- `apps/qwiki-sandbox/{CLAUDE.md, README.md, OVERVIEW.md}` rewritten to fresh-build language with three-container topology references.
- F1 (MW 1.39 lifecycle) closed by `decisions.md` D2 Amendment #2; Phase 1 ships MW 1.43 LTS.

Operator-side prerequisites for Phase 2 (no new prerequisites beyond Phase 1):

- Tailscale up; `ssh unraid 'echo ok'` returns `ok`.
- Operator's WSL can reach Docker Hub (for the one-shot `composer:latest` pull) -- transitively true since Phase 1 already pulled the upstream MW + nginx + mariadb images via SSH to Unraid.
- The admin password set during Phase 1 install.php run is still known (used to log in as `Admin` and create the smoke-test form + template at the wiki UI). If the operator has already rotated it via `Special:ChangePassword`, the rotated password is what's needed.

Discord OAuth + Phase-3 group prerequisites are NOT required for Phase 2.

## Files touched

### Created

```
apps/qwiki-sandbox/deploy/composer.local.json               # SMW package declaration; merged into MW's composer.json by composer-merge-plugin
apps/qwiki-sandbox/deploy/test-form/                        # new directory; smoke-test form + template wikitext as committed artifacts
apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext  # paste-into-wiki body for Form:TestForm
apps/qwiki-sandbox/deploy/test-form/Template-Test.wikitext  # paste-into-wiki body for Template:Test
```

On Unraid (operator-created during deploy, not in git):

```
/mnt/user/appdata/qwiki-beta/page-forms/                    # git clone --branch REL1_43 of mediawiki-extensions-PageForms; overlay-bound onto /var/www/html/extensions/PageForms
/mnt/user/appdata/qwiki-beta/mediawiki-html/composer.local.json    # scp'd from apps/qwiki-sandbox/deploy/composer.local.json
/mnt/user/appdata/qwiki-beta/mediawiki-html/extensions/SemanticMediaWiki/    # composer-installed (one-shot composer:latest), populated automatically
/mnt/user/appdata/qwiki-beta/mediawiki-html/vendor/                # MW core deps from Phase 1 image extract + SMW deps added by composer update
```

On the running wiki (operator-created at phase-boundary verification, not in git, not on Unraid filesystem):

```
Form:TestForm (NS_FORM) -- created by pasting test-form/Form-TestForm.wikitext into Special:CreatePage as Admin
Template:Test           -- created by pasting test-form/Template-Test.wikitext into Special:CreatePage as Admin
TestPage (main NS)      -- created by submitting Special:FormEdit/TestForm; transcludes Template:Test
```

### Modified

```
apps/qwiki-sandbox/deploy/docker-compose.prod.yml           # add Page Forms overlay bind to mediawiki + nginx services
apps/qwiki-sandbox/deploy/LocalSettings.php                 # add Extensions section: wfLoadExtension(PageForms) + wfLoadExtension(SemanticMediaWiki) + enableSemantics()
apps/qwiki-sandbox/deploy/README.md                         # add Phase 2 install section; amend image-bump procedure; add extension-version-bump redeploy section
apps/qwiki-sandbox/OVERVIEW.md                              # Phase 2 state note (extensions installed; Modes page-type still pending)
```

### Deleted

n/a -- no files removed in this phase.

## Tasks

### Task 1 -- Author apps/qwiki-sandbox/deploy/composer.local.json

**Goal.** Declare the SMW package + version constraint so MW's bundled `composer-merge-plugin` picks it up on `composer update --no-dev`. The committed file is the source of truth; the running Unraid host gets a scp'd copy. Pin tightly enough that patch releases auto-resolve (~6.0.1 means `>=6.0.1, <6.1.0`) but minor / major bumps require an operator-driven update.

**Files.** `apps/qwiki-sandbox/deploy/composer.local.json`.

**Execution mode.** `inline` -- pure config; full content shipped (D22 / D26).

**Steps.**

- [ ] Write `apps/qwiki-sandbox/deploy/composer.local.json` with the content below.

Full file content to write:

```json
{
    "require": {
        "mediawiki/semantic-media-wiki": "~6.0.1"
    }
}
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/composer.local.json && echo OK` returns `OK`. `python3 -c "import json; json.load(open('apps/qwiki-sandbox/deploy/composer.local.json'))" && echo OK` returns `OK` (valid JSON; the dependency-on-python3 is fine for the offline check -- WSL has it). `jq -r '.require | keys[]' apps/qwiki-sandbox/deploy/composer.local.json` returns `mediawiki/semantic-media-wiki`.

### Task 2 -- Update apps/qwiki-sandbox/deploy/LocalSettings.php with Extensions section

**Goal.** Append a Phase 2 Extensions block to the Phase 1 LocalSettings.php: load Page Forms + Semantic MediaWiki, then call `enableSemantics()` with the wiki's host. Order is load-before-enable per SMW's `INSTALL.md`; loading Page Forms first is conventional (PF is a lower-level form-rendering framework that SMW can integrate with, not the other way around). The file remains hand-authored + committed + scp'd; secrets continue to flow via `getenv()` from the Unraid `.env`.

**Files.** `apps/qwiki-sandbox/deploy/LocalSettings.php`.

**Execution mode.** `inline` -- ship the FULL updated file content (D22 / D26). The change is additive: Phase 1's content stays verbatim, with a new `# --- Extensions ---` block appended before the file end. The executor `Write`'s the file in place.

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/deploy/LocalSettings.php` with the content below.

Full file content to write:

```php
<?php
# apps/qwiki-sandbox/deploy/LocalSettings.php
# MediaWiki 1.43 LTS configuration for qwiki-v1-beta (wiki-beta.quake.world).
# Hand-authored; install.php is run once to bootstrap the DB schema, but its
# generated LocalSettings.php is discarded in favor of this committed file.
#
# Secrets read from the container's environment (populated via docker-compose
# env_file or environment block); never committed in plaintext here.
#
# Phase 1 scope: MW core + Citizen skin only.
# Phase 2 scope (this revision): + Page Forms + Semantic MediaWiki.
# Phase 3: + PluggableAuth + Discord OAuth + wiki-contributor / wiki-curator
# groups + namespace edit restrictions per D4 / D5.
# Phase 4: + quality-tag categories per D18.

if ( !defined( 'MEDIAWIKI' ) ) {
    exit;
}

# --- Site identity ---------------------------------------------------------

$wgSitename = "QuakeWorld Wiki (beta)";
$wgMetaNamespace = "QuakeWorld_Wiki";

# The wiki lives at the apex of wiki-beta.quake.world; no /w/ script path.
$wgScriptPath = "";
$wgServer = "https://wiki-beta.quake.world";
$wgResourceBasePath = $wgScriptPath;

# Make MW trust the X-Forwarded-Proto / X-Forwarded-For headers that
# Cloudflare Tunnel + the nginx front set, so MW generates https:// URLs
# and logs the real client IP.
$wgUsePrivateIPs = true;

# --- Logo + favicon (placeholders; updated post-Phase 1) -------------------

$wgLogos = [
    '1x' => "$wgResourceBasePath/resources/assets/wiki.png",
];
$wgFavicon = "$wgResourceBasePath/favicon.ico";

# --- Email --------------------------------------------------------------------

# Disabled in v1 beta; can be enabled post-Phase-3 if account-recovery emails
# are needed. PluggableAuth + Discord OAuth (Phase 3) is the primary signup
# path, so password resets are not load-bearing at v1.
$wgEnableEmail = false;
$wgEnableUserEmail = false;
$wgEmergencyContact = "";
$wgPasswordSender = "";

# --- Database -------------------------------------------------------------

$wgDBtype = "mysql";
$wgDBserver = "mariadb";
$wgDBname = "qwiki_beta";
$wgDBuser = "qwiki";
$wgDBpassword = getenv( 'MW_DB_PASSWORD' ) ?: "";

$wgDBprefix = "";
$wgDBTableOptions = "ENGINE=InnoDB, DEFAULT CHARSET=binary";

# --- Shared / caching -----------------------------------------------------

# Single-container MW; no external cache backend in Phase 1. CACHE_ACCEL uses
# PHP APCu when available (the official mediawiki:1.43-fpm image ships APCu).
$wgMainCacheType = CACHE_ACCEL;
$wgMemCachedServers = [];

# Upload defaults; per-page screenshot inclusion is operator-controlled.
$wgEnableUploads = true;
$wgUploadDirectory = "/var/www/html/images";

# --- Skins ----------------------------------------------------------------

# Citizen is the locked skin per D2. Vector + MonoBook + Timeless ship in the
# base image; loading them too keeps Special:Preferences's skin selector usable
# during early sanity checks. Citizen remains the default.
wfLoadSkin( 'Vector' );
wfLoadSkin( 'MonoBook' );
wfLoadSkin( 'Timeless' );
wfLoadSkin( 'Citizen' );

$wgDefaultSkin = "citizen";

# Citizen v3 options. Phase 1 keeps defaults; wiki-specific tuning (left-rail
# TOC behavior, dark-mode default, search subsystem) lands in subsequent
# phases as authoring conventions firm up. Note: the v2-era
# $wgCitizenEnableCommandPalette option was removed in Citizen v3 (search
# subsystem renamed); the v3 default is already what we want.

# --- Permissions ----------------------------------------------------------

# MW defaults already block anonymous edit ($wgGroupPermissions['*']['edit'] = false
# is the documented MW 1.43 default). Setting it explicitly here makes the
# Phase 1 verification probe self-documenting; Phase 3 will introduce
# wiki-contributor / wiki-curator groups and namespace restrictions (D4 / D5).
$wgGroupPermissions['*']['createaccount'] = false;
$wgGroupPermissions['*']['edit'] = false;
$wgGroupPermissions['*']['createpage'] = false;
$wgGroupPermissions['*']['createtalk'] = false;
$wgGroupPermissions['*']['read'] = true;

# Sysop (the install-time admin user only) keeps the MW defaults so initial
# wiki-setup edits and namespace administration work via the admin account.

# --- Security keys --------------------------------------------------------

$wgSecretKey = getenv( 'MW_SECRET_KEY' ) ?: "";
$wgUpgradeKey = getenv( 'MW_UPGRADE_KEY' ) ?: "";

# --- Language + license ---------------------------------------------------

$wgLanguageCode = "en";

$wgRightsPage = "";
$wgRightsUrl = "https://creativecommons.org/licenses/by-sa/4.0/";
$wgRightsText = "Creative Commons Attribution-ShareAlike 4.0 International";
$wgRightsIcon = "$wgResourceBasePath/resources/assets/licenses/cc-by-sa.png";

# --- Misc -----------------------------------------------------------------

$wgEnotifUserTalk = false;
$wgEnotifWatchlist = false;

# Honor X-Forwarded-For from CF Tunnel + nginx for accurate IP logging.
$wgUseCdn = false;
$wgUsePathInfo = true;

# --- Extensions (Phase 2) -------------------------------------------------
#
# Page Forms (REL1_43 branch HEAD at deploy time). Installed via git clone
# into /mnt/user/appdata/qwiki-beta/page-forms/ on Unraid; overlay-bound
# onto /var/www/html/extensions/PageForms by docker-compose.prod.yml.
# Introduces the Form (NS_FORM = 106) and Form_talk namespaces; Phase 3
# restricts these to the wiki-curator group per D5.
wfLoadExtension( 'PageForms' );

# Semantic MediaWiki 6.0.x. Installed via Composer (composer.local.json at
# MW root declares mediawiki/semantic-media-wiki ~6.0.1; one-shot
# `composer update --no-dev` resolves SMW into extensions/SemanticMediaWiki/
# and its dependencies into vendor/, both under the mediawiki-html parent
# bind-mount). enableSemantics() activates SMW's hooks, special pages, and
# semantic namespaces (Property = NS_PROPERTY, Concept = NS_CONCEPT, etc.);
# the call MUST follow wfLoadExtension( 'SemanticMediaWiki' ) and takes
# the wiki's host (no scheme, no trailing slash).
wfLoadExtension( 'SemanticMediaWiki' );
enableSemantics( 'wiki-beta.quake.world' );
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/LocalSettings.php && echo OK` returns `OK`. `php -l apps/qwiki-sandbox/deploy/LocalSettings.php` returns `No syntax errors detected` (WSL has PHP CLI; alternatively defer to the post-scp run on Unraid as the integration check). `grep -c 'wfLoadExtension' apps/qwiki-sandbox/deploy/LocalSettings.php` returns `2` (Page Forms + SMW). `grep -c 'enableSemantics' apps/qwiki-sandbox/deploy/LocalSettings.php` returns `1`.

### Task 3 -- Update apps/qwiki-sandbox/deploy/docker-compose.prod.yml with Page Forms overlay bind

**Goal.** Add the Page Forms overlay bind mount to both the `mediawiki` and `nginx` services. Both services need it: mediawiki executes PF's PHP code; nginx serves PF's static assets (CSS / JS under `extensions/PageForms/` per the static-asset location block in `nginx.conf`). SMW does NOT get a new compose bind because composer installs it under `mediawiki-html/extensions/SemanticMediaWiki/`, which is already inside Phase 1's parent `mediawiki-html` bind. Page Forms gets a sibling-host-path + overlay because it must survive MW image bumps (the rsync in Phase 1's image-bump procedure would otherwise wipe it).

**Files.** `apps/qwiki-sandbox/deploy/docker-compose.prod.yml`.

**Execution mode.** `inline` -- ship the FULL updated file content (D22 / D26). The change is additive: two new bind-mount lines (mediawiki + nginx services). The executor `Write`'s the file in place.

**Steps.**

- [ ] Overwrite `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` with the content below.

Full file content to write:

```yaml
# apps/qwiki-sandbox/deploy/docker-compose.prod.yml
# Unraid stack for qwiki-v1-beta: nginx 1.30-alpine + MediaWiki 1.43 (fpm)
# + MariaDB 11.4 LTS. nginx fronts both static-asset serving (from the
# shared mediawiki-html bind mount) and fastcgi proxying to mediawiki:9000.
#
# Phase 2 (this revision) adds the Page Forms overlay bind. Semantic
# MediaWiki is installed via Composer into mediawiki-html/extensions/
# SemanticMediaWiki/ and does NOT need a new bind (it lives inside the
# parent mediawiki-html bind-mount).
#
# Operator workflow (see deploy/README.md). All persistent data lives under
# /mnt/user/appdata/qwiki-beta/, which is on the weekly Unraid -> Synology
# backup (D3). That includes the MW source tree at mediawiki-html/, which
# the operator extracts from the mediawiki:1.43-fpm image once at first deploy
# and refreshes on each MW image bump via the documented procedure in
# deploy/README.md. No named docker volumes; bind-mounts only.

services:
  mariadb:
    image: mariadb:11.4
    container_name: qwiki-mariadb
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD: ${MARIADB_ROOT_PASSWORD}
      MARIADB_DATABASE: qwiki_beta
      MARIADB_USER: qwiki
      MARIADB_PASSWORD: ${MW_DB_PASSWORD}
    volumes:
      - /mnt/user/appdata/qwiki-beta/mariadb-data:/var/lib/mysql
    networks:
      - qwiki-net
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 6

  mediawiki:
    image: mediawiki:1.43-fpm
    container_name: qwiki-mediawiki
    restart: unless-stopped
    depends_on:
      mariadb:
        condition: service_healthy
    environment:
      # Surfaced to LocalSettings.php via getenv(); see deploy/LocalSettings.php.
      MW_DB_PASSWORD: ${MW_DB_PASSWORD}
      MW_SECRET_KEY: ${MW_SECRET_KEY}
      MW_UPGRADE_KEY: ${MW_UPGRADE_KEY}
    volumes:
      # Shared MW source tree -- nginx mounts the same host path read-only.
      # mediawiki-html is populated once at first-time deploy via the
      # docker-create + docker-cp extraction step in deploy/README.md;
      # refreshed on each MW image bump via the documented procedure.
      # Living on /mnt/user/appdata/ means it's inspectable from Unraid GUI
      # and included in the weekly Synology backup tarball (D3).
      - /mnt/user/appdata/qwiki-beta/mediawiki-html:/var/www/html
      # Persistent uploaded images + cache; survives container rebuild.
      - /mnt/user/appdata/qwiki-beta/mediawiki-data:/var/www/html/images
      # Citizen skin overlay (git-checked-out v3.16.0 on host); read-only.
      - /mnt/user/appdata/qwiki-beta/citizen:/var/www/html/skins/Citizen:ro
      # Page Forms overlay (Phase 2; git-checked-out REL1_43 on host);
      # read-only. Sibling host path so MW image-bump rsync against
      # mediawiki-html/ doesn't wipe it.
      - /mnt/user/appdata/qwiki-beta/page-forms:/var/www/html/extensions/PageForms:ro
      # Hand-authored LocalSettings.php overlay; read-only.
      - /mnt/user/appdata/qwiki-beta/LocalSettings.php:/var/www/html/LocalSettings.php:ro
    networks:
      - qwiki-net
    # No host port: the only public reachability is via nginx -> Cloudflare
    # Tunnel. Direct port exposure would skip CF rate limiting and bypass the
    # nginx static-asset serving + fastcgi entry-point whitelisting.

  nginx:
    image: nginx:1.30-alpine
    container_name: qwiki-nginx
    restart: unless-stopped
    depends_on:
      - mediawiki
    ports:
      # Bind to the Unraid host's LAN address (192.168.1.205) only -- the
      # existing Cloudflare Tunnel agent routes wiki-beta.quake.world to this
      # address from the same Unraid box. Loopback would not be reachable from
      # the cloudflared container (separate network namespace); 0.0.0.0 would
      # expose the wiki on the LAN without Cloudflare's edge protection.
      - "192.168.1.205:8081:80"
    volumes:
      # nginx config via conf.d include shape (default.conf replaces the bundled
      # one). Operator scp's apps/qwiki-sandbox/deploy/nginx.conf here.
      - /mnt/user/appdata/qwiki-beta/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      # Same MW source tree as the mediawiki container, read-only.
      - /mnt/user/appdata/qwiki-beta/mediawiki-html:/var/www/html:ro
      # Same uploaded-images bind as mediawiki, read-only.
      - /mnt/user/appdata/qwiki-beta/mediawiki-data:/var/www/html/images:ro
      # Same Citizen skin overlay, read-only.
      - /mnt/user/appdata/qwiki-beta/citizen:/var/www/html/skins/Citizen:ro
      # Same Page Forms overlay (Phase 2), read-only. Static CSS / JS under
      # extensions/PageForms/ is served by nginx directly per the
      # /(skins|extensions|resources)/.../...static-extensions location
      # block in nginx.conf.
      - /mnt/user/appdata/qwiki-beta/page-forms:/var/www/html/extensions/PageForms:ro
    networks:
      - qwiki-net

networks:
  qwiki-net:
    name: qwiki-net
    driver: bridge
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml && echo OK` returns `OK`. `docker compose -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml config -q && echo OK` returns `OK` (valid compose syntax; offline). `grep -c 'page-forms:/var/www/html/extensions/PageForms' apps/qwiki-sandbox/deploy/docker-compose.prod.yml` returns `2` (one for mediawiki, one for nginx).

### Task 4 -- Author smoke-test form + template wikitext

**Goal.** Create the two committed wikitext snippets the operator pastes into the wiki UI at phase-boundary verification. `Form-TestForm.wikitext` is a minimal Page Forms form (one text input, one textarea input, save / cancel buttons); `Template-Test.wikitext` is the receiving template (displays the two fields + `Category:Test pages`). The committed artifacts let future-arc Claude terminals grep for "where's the Phase 2 smoke test?" and recreate the verification if needed; they're not loaded into MW directly by any automated step.

**Files.** `apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext`, `apps/qwiki-sandbox/deploy/test-form/Template-Test.wikitext`.

**Execution mode.** `inline` -- pure wikitext content; ship full body of each file (D22 / D26).

**Steps.**

- [ ] Create directory `apps/qwiki-sandbox/deploy/test-form/`.
- [ ] Write `apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext` with the content below.
- [ ] Write `apps/qwiki-sandbox/deploy/test-form/Template-Test.wikitext` with the content below.

Full file content for `Form-TestForm.wikitext`:

```
<noinclude>
This is the Phase 2 smoke-test form. Created during the arc qwiki-v1-beta
substrate verification to confirm Page Forms is loaded, the NS_FORM
namespace exists, and form submissions create pages via Template:Test.

After Phase 2 phase-boundary verification passes, the operator may delete
Form:TestForm + Template:Test + the resulting TestPage, OR keep them as
breadcrumbs. The wikitext is preserved here regardless.

Paste this entire <includeonly>...</includeonly> block (without the
<noinclude> preamble) into Special:CreatePage at page title "Form:TestForm".
</noinclude>
<includeonly>{{{for template|Test}}}
{| class="formtable"
! Test name:
| {{{field|name|input type=text|mandatory|size=40}}}
|-
! Test note:
| {{{field|note|input type=textarea|rows=4|cols=60}}}
|}
{{{end template}}}

{{{standard input|save}}} {{{standard input|cancel}}}
</includeonly>
```

Full file content for `Template-Test.wikitext`:

```
<noinclude>
This is the Phase 2 smoke-test template. Receives the two fields submitted
by Form:TestForm. Paste this entire body into Special:CreatePage at page
title "Template:Test".
</noinclude>'''Test name:''' {{{name|}}}

{{#if:{{{note|}}}|'''Test note:''' {{{note}}}|}}

[[Category:Test pages]]
```

**Verification.** `test -d apps/qwiki-sandbox/deploy/test-form && echo OK` returns `OK`. `test -f apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext && echo OK` returns `OK`. `test -f apps/qwiki-sandbox/deploy/test-form/Template-Test.wikitext && echo OK` returns `OK`. `grep -c 'for template|Test' apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext` returns `1`. `grep -c 'Category:Test pages' apps/qwiki-sandbox/deploy/test-form/Template-Test.wikitext` returns `1`.

### Task 5 -- Update apps/qwiki-sandbox/deploy/README.md with Phase 2 install + image-bump amendment + extension-bump redeploy

**Goal.** Extend the deploy runbook so the operator has copy-paste commands for: (a) the Phase 2 install steps (Page Forms git clone, composer.local.json scp, composer one-shot, LocalSettings scp, maintenance/update.php, restart, runJobs, test-form paste), (b) the amended MW image-bump procedure that preserves composer.local.json and re-runs composer update, (c) a new routine-redeploy section for extension version bumps. Other Phase 1 sections (Topology, Prerequisites, First-time deploy steps 1-10, routine LocalSettings / nginx / compose redeploy, Operator commands, Troubleshooting, Backup + recovery) remain untouched except for two small Topology + Prerequisites footnotes about Page Forms + SMW.

The README is the source of truth the operator follows when executing Task 8 below. The committed artifact is what the executor ships in this task; the operator's read happens after the commit lands.

**Files.** `apps/qwiki-sandbox/deploy/README.md`.

**Execution mode.** `inline` -- the changes are surgical edits at three known anchor points (Topology section, Prerequisites section, after "Routine MW image bump procedure" section). Shipping the full ~600-line file would be redundant; the executor uses Edit with the exact old / new strings shipped below. This is mechanical text replacement -- no judgment, no synthesis (D22 / D26 inline rationale).

**Steps.**

The executor applies each of the following six Edits to `apps/qwiki-sandbox/deploy/README.md` using the Edit tool. The old strings are taken verbatim from Phase 1's committed file; the new strings extend or replace surgically.

- [ ] **Edit 1 -- amend Topology section** to mention Page Forms + SMW.

  **Old string** (the Topology bullet list, exactly as committed in Phase 1):

  ```
  Persistent data and configs live at `/mnt/user/appdata/qwiki-beta/`:

  - `mariadb-data/`             - MariaDB state. Covered by the weekly Unraid -> Synology backup.
  - `mediawiki-data/`           - MW uploaded images + cache (`/var/www/html/images`).
  - `mediawiki-html/`           - MW core source tree (`/var/www/html`). Extracted from `mediawiki:1.43-fpm` at first deploy; refreshed on each MW image bump per the procedure below.
  - `citizen/`                  - Citizen skin git checkout at v3.16.0 (overlays `/var/www/html/skins/Citizen`).
  - `docker-compose.prod.yml`   - scp'd from `apps/qwiki-sandbox/deploy/`.
  - `nginx.conf`                - scp'd from `apps/qwiki-sandbox/deploy/`.
  - `LocalSettings.php`         - scp'd from `apps/qwiki-sandbox/deploy/`.
  - `.env`                      - operator-authored from `.env.prod.example`, mode 600.
  ```

  **New string:**

  ```
  Persistent data and configs live at `/mnt/user/appdata/qwiki-beta/`:

  - `mariadb-data/`             - MariaDB state. Covered by the weekly Unraid -> Synology backup.
  - `mediawiki-data/`           - MW uploaded images + cache (`/var/www/html/images`).
  - `mediawiki-html/`           - MW core source tree (`/var/www/html`). Extracted from `mediawiki:1.43-fpm` at first deploy; refreshed on each MW image bump per the procedure below. Includes `composer.local.json` + `composer.lock` + `extensions/SemanticMediaWiki/` + `vendor/` (composer-managed, Phase 2+).
  - `citizen/`                  - Citizen skin git checkout at v3.16.0 (overlays `/var/www/html/skins/Citizen`).
  - `page-forms/`               - Page Forms git checkout at REL1_43 branch (overlays `/var/www/html/extensions/PageForms`); added in Phase 2.
  - `docker-compose.prod.yml`   - scp'd from `apps/qwiki-sandbox/deploy/`.
  - `nginx.conf`                - scp'd from `apps/qwiki-sandbox/deploy/`.
  - `LocalSettings.php`         - scp'd from `apps/qwiki-sandbox/deploy/`.
  - `.env`                      - operator-authored from `.env.prod.example`, mode 600.
  ```

- [ ] **Edit 2 -- add Phase 2 install section** immediately after "Step 10: external curl + browser check" of the First-time deploy section (i.e., between the end of step 10 and the start of "## Routine redeploy (LocalSettings change)").

  **Old string** (the final paragraph of step 10 in First-time deploy plus the section break):

  ```
      Then open `https://wiki-beta.quake.world` in a browser; expect the MW main
      page rendered with the Citizen skin. Click "View source" or attempt to edit
      while logged out; expect "you must be logged in" or "you do not have
      permission to edit this page."

  ## Routine redeploy (LocalSettings change)
  ```

  **New string:**

  ```
      Then open `https://wiki-beta.quake.world` in a browser; expect the MW main
      page rendered with the Citizen skin. Click "View source" or attempt to edit
      while logged out; expect "you must be logged in" or "you do not have
      permission to edit this page."

  ## Phase 2: install Page Forms + Semantic MediaWiki

  Run these steps after Phase 1 first-time-deploy succeeds and after the
  Phase 2 commit (composer.local.json, updated docker-compose.prod.yml,
  updated LocalSettings.php, test-form artifacts) is on `main`. Same
  operator-WSL + Unraid SSH pattern as first-time deploy.

  1. Create the Phase 2 sibling appdata directory:

     ```bash
     ssh unraid 'mkdir -p /mnt/user/appdata/qwiki-beta/page-forms'
     ```

  2. Git-clone Page Forms at the `REL1_43` branch into the sibling path:

     ```bash
     ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
       git clone --branch REL1_43 --depth 1 \
         https://github.com/wikimedia/mediawiki-extensions-PageForms.git page-forms'
     ```

     The Wikimedia mirror tracks the canonical Gerrit repo and is the same
     source the bundled MW Composer ecosystem uses. REL1_43 is the active
     branch for MW 1.43.x; no GitHub-tagged release exists on this mirror.
     The `--depth 1` is fine because we do not maintain Page Forms
     development history locally -- we only need the checkout to bind into
     the mediawiki container.

  3. scp the Phase 2 deploy artifacts (composer.local.json + updated
     LocalSettings.php + updated docker-compose.prod.yml) to Unraid:

     ```bash
     # from operator's WSL
     scp apps/qwiki-sandbox/deploy/composer.local.json \
         unraid:/mnt/user/appdata/qwiki-beta/mediawiki-html/
     scp apps/qwiki-sandbox/deploy/LocalSettings.php \
         apps/qwiki-sandbox/deploy/docker-compose.prod.yml \
         unraid:/mnt/user/appdata/qwiki-beta/
     ```

     The Phase 2 LocalSettings.php is the file in step 4 below -- before
     `wfLoadExtension( 'SemanticMediaWiki' )` parses cleanly, SMW source +
     deps must exist on disk, so the LocalSettings scp happens here but
     the mediawiki container restart waits until step 5 finishes.

  4. Composer-install SMW 6.0.x + its dependencies via a one-shot
     `composer:latest` container. MW's bundled `composer.json` includes the
     `composer-merge-plugin`, which picks up `composer.local.json` and
     merges its `require` section into the resolution graph. The result
     is: `extensions/SemanticMediaWiki/` populated with SMW source +
     `vendor/` populated with SMW deps (alongside MW's own vendor entries).

     ```bash
     ssh unraid 'docker run --rm \
       -v /mnt/user/appdata/qwiki-beta/mediawiki-html:/app \
       -w /app composer:latest \
       composer update --no-dev --no-interaction --no-progress --prefer-dist'
     ```

     Expected output ends with `Generating optimized autoload files` plus
     the per-package install lines. Verify SMW landed on disk:

     ```bash
     ssh unraid 'ls /mnt/user/appdata/qwiki-beta/mediawiki-html/extensions/SemanticMediaWiki/extension.json && \
                 ls /mnt/user/appdata/qwiki-beta/mediawiki-html/composer.lock'
     ```

     Both `ls` calls should return paths without error.

  5. Bring the updated docker-compose up so the mediawiki + nginx services
     pick up the new Page Forms bind. The mediawiki container needs a
     restart anyway to pick up the new LocalSettings.php; a single
     `up -d` covers both:

     ```bash
     ssh unraid 'cd /mnt/user/appdata/qwiki-beta && \
       docker compose -f docker-compose.prod.yml up -d && \
       docker compose -f docker-compose.prod.yml ps'
     ```

     Wait until all three containers show `Up` (mariadb `(healthy)`). If
     mediawiki keeps restarting, consult Troubleshooting below.

  6. Run MW's `maintenance/update.php` inside the mediawiki container to
     create the SMW + Page Forms schema tables (`smw_object_ids`,
     `smw_di_blob`, `smw_di_wikipage`, etc.; plus PF's `pf_forms` etc.):

     ```bash
     ssh unraid 'docker exec qwiki-mediawiki \
       php /var/www/html/maintenance/update.php --quick'
     ```

     `--quick` skips the 5-second "press control-c to abort" delay. Expect
     a sequence of `Creating ...` and `... Done` lines, ending with
     `Done in <N>.<N>s.`. Confirm SMW tables exist:

     ```bash
     ssh unraid 'set -a && . /mnt/user/appdata/qwiki-beta/.env && set +a && \
       docker exec -e MYSQL_PWD="$MARIADB_ROOT_PASSWORD" qwiki-mariadb \
       mariadb -uroot -N -B -e "USE qwiki_beta; SHOW TABLES LIKE \"smw_%\";"' | wc -l
     ```

     Expect a count >= 10 (SMW 6.0.x ships ~16 `smw_*` tables; threshold
     of 10 is the conservative pass condition). The `-N -B` flags suppress
     mariadb's column-header + ASCII-border formatting so `wc -l` counts
     table rows only.

  7. Drain any SMW jobs that the update queued:

     ```bash
     ssh unraid 'docker exec qwiki-mediawiki \
       php /var/www/html/maintenance/runJobs.php'
     ```

     Expect exit code 0 and a line like `Job queue is empty.` or
     `<N> jobs run, <0> failed` (post-Phase-2-install the queue typically
     starts empty since no pages have semantic annotations yet).

  8. Create the smoke-test Form + Template + verify form-driven page
     creation. Log into the wiki at `https://wiki-beta.quake.world` as the
     `Admin` user from the Phase 1 install.php run (or the rotated
     password if the operator changed it).

     - Visit `Special:CreatePage` (or paste a URL: `https://wiki-beta.quake.world/index.php?title=Special:CreatePage`).
     - Page title: `Form:TestForm`. Paste the body from
       `apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext` (the
       `<includeonly>...</includeonly>` block, without the `<noinclude>`
       preamble). Save.
     - Repeat: page title `Template:Test`. Paste the body from
       `apps/qwiki-sandbox/deploy/test-form/Template-Test.wikitext`
       (without the `<noinclude>` preamble). Save.
     - Visit `Special:FormEdit/TestForm`. The form renders with two
       inputs (Test name + Test note) and a Save / Cancel button row.
     - Enter "TestPage" as the page title (top input), "Hello QWiki" as
       Test name, "Phase 2 verification" as Test note. Submit.
     - MW redirects to `TestPage` in main namespace; the rendered output
       shows the two fields plus `Category:Test pages` at the bottom.
     - Visit `Special:Version`. Confirm a "Page Forms" entry (with
       version string from REL1_43 HEAD) and a "Semantic MediaWiki"
       entry (with `6.0.x` version string) appear under
       "Installed extensions".

     If `Special:FormEdit/TestForm` 404s or "no such page" errors,
     `Form:TestForm` did not save correctly -- recheck the paste body
     for accidentally-included `<noinclude>` block (the preamble must
     NOT be pasted; only the `<includeonly>` body).

  9. Final job-queue drain (the test-form submission likely enqueued one
     or two SMW jobs):

     ```bash
     ssh unraid 'docker exec qwiki-mediawiki \
       php /var/www/html/maintenance/runJobs.php'
     ```

     Expect `<N> jobs run, 0 failed`.

  10. Commit + push the Phase 2 artifacts (composer.local.json + the
      updated compose / LocalSettings / README + the test-form/
      directory + OVERVIEW.md update) to `main`. Operator-WSL side:

      ```bash
      # from /home/paradoks/projects/quakeworld
      git add apps/qwiki-sandbox/deploy/composer.local.json \
              apps/qwiki-sandbox/deploy/docker-compose.prod.yml \
              apps/qwiki-sandbox/deploy/LocalSettings.php \
              apps/qwiki-sandbox/deploy/README.md \
              apps/qwiki-sandbox/deploy/test-form/ \
              apps/qwiki-sandbox/OVERVIEW.md
      git commit -m "phase(qwiki-v1-beta): Phase 2 -- Page Forms REL1_43 + Semantic MediaWiki 6.0.x extensions installed on wiki-beta.quake.world"
      git push origin main
      ```

  ## Routine redeploy (LocalSettings change)
  ```

- [ ] **Edit 3 -- amend the Routine MW image bump procedure** to preserve composer.local.json across rsync + re-run composer update + re-run maintenance/update.php for both MW + SMW schema changes.

  **Old string** (the entire "Routine MW image bump procedure" section as committed in Phase 1):

  ```
  ## Routine MW image bump procedure

  Use whenever a new MW patch ships (typically every ~2 months for the 1.43.x LTS line). Refreshes the `mediawiki-html/` bind-mount tree from the new image, preserving the overlay paths (uploads / Citizen / LocalSettings / Phase 2+ extensions).

  ```bash
  ssh unraid 'docker pull mediawiki:1.43-fpm && \
    docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml down && \
    rm -rf /tmp/mw-extract && mkdir -p /tmp/mw-extract && \
    docker create --name qwiki-mw-extract mediawiki:1.43-fpm && \
    docker cp qwiki-mw-extract:/var/www/html/. /tmp/mw-extract/ && \
    docker rm qwiki-mw-extract && \
    rsync -a --delete /tmp/mw-extract/ /mnt/user/appdata/qwiki-beta/mediawiki-html/ && \
    rm -rf /tmp/mw-extract && \
    docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml up -d'
  ```

  Then run MW's update.php to apply any DB schema migrations the new patch ships:

  ```bash
  ssh unraid 'docker exec qwiki-mediawiki php /var/www/html/maintenance/update.php --quick'
  ```

  Smoke-check via the V1 / V2 probes from the phase MD's "Verification (phase boundary)" section.

  **Why the rsync indirection (vs `docker cp` directly into mediawiki-html/)?** `docker cp` doesn't delete files removed in the new image; rsync with `--delete` keeps the tree in sync with the image (no stale .php files from the prior patch). The child overlay binds (images/, skins/Citizen/, LocalSettings.php, Phase 2+ extensions/*) live at sibling host paths under `/mnt/user/appdata/qwiki-beta/` so they're untouched by the rsync to `mediawiki-html/`.

  **MW major-version upgrades (e.g., 1.43 -> 1.47 LTS)** are out of scope for this procedure; they're a separate arc that handles release-notes review, extension-version coordination, schema migration auditing, and pre-upgrade backup snapshotting.
  ```

  **New string:**

  ```
  ## Routine MW image bump procedure

  Use whenever a new MW patch ships (typically every ~2 months for the 1.43.x LTS line). Refreshes the `mediawiki-html/` bind-mount tree from the new image, preserving the overlay paths (uploads / Citizen / Page Forms / LocalSettings) AND the composer-managed Phase 2 surface (composer.local.json + composer.lock + extensions/SemanticMediaWiki/ + SMW's deps in vendor/).

  ```bash
  ssh unraid 'docker pull mediawiki:1.43-fpm && \
    docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml down && \
    rm -rf /tmp/mw-extract && mkdir -p /tmp/mw-extract && \
    docker create --name qwiki-mw-extract mediawiki:1.43-fpm && \
    docker cp qwiki-mw-extract:/var/www/html/. /tmp/mw-extract/ && \
    docker rm qwiki-mw-extract && \
    rsync -a --delete \
      --exclude composer.local.json \
      --exclude composer.lock \
      --exclude extensions/SemanticMediaWiki \
      /tmp/mw-extract/ /mnt/user/appdata/qwiki-beta/mediawiki-html/ && \
    rm -rf /tmp/mw-extract && \
    docker run --rm \
      -v /mnt/user/appdata/qwiki-beta/mediawiki-html:/app \
      -w /app composer:latest \
      composer update --no-dev --no-interaction --no-progress --prefer-dist && \
    docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml up -d'
  ```

  Then run MW's update.php to apply any DB schema migrations the new patch (and any auto-bumped SMW patch) ships:

  ```bash
  ssh unraid 'docker exec qwiki-mediawiki php /var/www/html/maintenance/update.php --quick'
  ```

  Drain any SMW jobs the update enqueued:

  ```bash
  ssh unraid 'docker exec qwiki-mediawiki php /var/www/html/maintenance/runJobs.php'
  ```

  Smoke-check via the V1 / V2 probes from Phase 1's "Verification (phase boundary)" section plus the Phase 2 V_PF and V_SMW probes.

  **Why the rsync excludes?** `--exclude composer.local.json` keeps the Phase 2 SMW require declaration alive across the bump (the upstream image has no `composer.local.json`, so without the exclude the `--delete` flag would remove it). `--exclude composer.lock` keeps the resolved version pinning across the bump; the subsequent `composer update --no-dev` re-resolves from composer.local.json. `--exclude extensions/SemanticMediaWiki` keeps the prior SMW source tree in place until composer overwrites it; this avoids a transient state where SMW is half-removed.

  **Why re-run composer after rsync?** The rsync wipes MW's own `vendor/` (replacing it with the new image's vendor) but the Phase 2 SMW Composer deps (`onoi/*`, etc.) are not in MW core's vendor. Re-running `composer update` rebuilds the full dependency graph including SMW + its transitive deps. Idempotent; safe to re-run.

  **Why the rsync indirection (vs `docker cp` directly into mediawiki-html/)?** `docker cp` doesn't delete files removed in the new image; rsync with `--delete` keeps the tree in sync with the image (no stale .php files from the prior patch). The child overlay binds (images/, skins/Citizen/, extensions/PageForms via the `page-forms/` sibling, LocalSettings.php) live at sibling host paths under `/mnt/user/appdata/qwiki-beta/` so they're untouched by the rsync to `mediawiki-html/`.

  **MW major-version upgrades (e.g., 1.43 -> 1.47 LTS)** are out of scope for this procedure; they're a separate arc that handles release-notes review, extension-version coordination (Page Forms `REL1_47` branch + SMW major-version bump), schema migration auditing, and pre-upgrade backup snapshotting.

  ## Routine redeploy (extension version bump)

  Two flavors: Page Forms (git-clone overlay) and Semantic MediaWiki (Composer).

  ### Page Forms

  Pull the latest commit on the `REL1_43` branch into the sibling host path. The bind-mount picks it up; mediawiki + nginx restart picks up any cached class autoloads.

  ```bash
  ssh unraid 'cd /mnt/user/appdata/qwiki-beta/page-forms && git pull --ff-only && \
    cd /mnt/user/appdata/qwiki-beta && \
    docker compose -f docker-compose.prod.yml restart mediawiki && \
    docker exec qwiki-mediawiki php /var/www/html/maintenance/update.php --quick'
  ```

  If `git pull` reports a non-fast-forward (the wikimedia mirror force-pushed `REL1_43`, which is rare), inspect upstream history before pulling. For a major-version Page Forms bump (REL1_43 -> REL1_47 etc.), see "MW major-version upgrades" above.

  ### Semantic MediaWiki

  Bump the SMW version pin in `apps/qwiki-sandbox/deploy/composer.local.json` (on operator's WSL), commit, scp the new file to Unraid, re-run composer update + maintenance/update.php + runJobs.

  ```bash
  # on operator's WSL: edit composer.local.json, commit, push.
  scp apps/qwiki-sandbox/deploy/composer.local.json \
      unraid:/mnt/user/appdata/qwiki-beta/mediawiki-html/
  ssh unraid 'docker run --rm \
    -v /mnt/user/appdata/qwiki-beta/mediawiki-html:/app \
    -w /app composer:latest \
    composer update --no-dev --no-interaction --no-progress --prefer-dist && \
    docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml restart mediawiki && \
    docker exec qwiki-mediawiki php /var/www/html/maintenance/update.php --quick && \
    docker exec qwiki-mediawiki php /var/www/html/maintenance/runJobs.php'
  ```
  ```

- [ ] **Edit 4 -- amend Troubleshooting** with two Phase-2-specific entries (composer / SMW errors). Append immediately before the existing `**`docker compose` command not found after Unraid reboot**` bullet, so the new entries sit at the end of the extension-related troubleshooting and Unraid-platform troubleshooting stays at the bottom.

  **Old string:**

  ```
  - **`docker compose` command not found after Unraid reboot** -- compose plugin
    is on tmpfs; reinstall per `apps/quad/DEPLOYMENT.md` "Compose plugin caveat".
  ```

  **New string:**

  ```
  - **`composer update` fails with "Your requirements could not be resolved"** --
    common cause is a too-tight version constraint in `composer.local.json` vs
    what Packagist has published for SMW. Verify the latest tag at
    `https://packagist.org/packages/mediawiki/semantic-media-wiki` and adjust
    the constraint (e.g., relax `~6.0.1` to `~6.0` if 6.0.x has churned). Less
    common: a transient Packagist outage; retry the composer run.

  - **`maintenance/update.php` errors with "SemanticMediaWiki: class not found"** --
    composer did not generate the autoload entries for SMW. Verify
    `/mnt/user/appdata/qwiki-beta/mediawiki-html/vendor/composer/autoload_classmap.php`
    contains `SMW\` entries; if not, re-run `composer update --no-dev` and check
    the output for "Generating optimized autoload files". If the file is empty
    or missing, delete `vendor/composer/installed.json` + `composer.lock` and
    re-run.

  - **`Special:FormEdit/TestForm` returns "Form does not exist"** -- the
    `Form:TestForm` page was not saved into the NS_FORM namespace. Verify the
    namespace was registered: `ssh unraid 'docker exec qwiki-mediawiki \
    php /var/www/html/maintenance/run.php showJobs.php'` should not error; the
    Form namespace appears in `Special:AllPages` namespace dropdown. If
    NS_FORM is absent, restart mediawiki (the LocalSettings.php
    `wfLoadExtension( 'PageForms' )` call may not have run after the scp).

  - **`Special:Version` lists Page Forms or SMW with an "ERROR" tag** -- check
    `docker logs qwiki-mediawiki --tail 100` for PHP fatals. Common: PHP
    extension missing (SMW requires `intl` + `mbstring`; the upstream
    `mediawiki:1.43-fpm` image bundles both, so this is unlikely). If the log
    shows a class-not-found, see the "class not found" troubleshooting entry
    above.

  - **`docker compose` command not found after Unraid reboot** -- compose plugin
    is on tmpfs; reinstall per `apps/quad/DEPLOYMENT.md` "Compose plugin caveat".
  ```

- [ ] **Edit 5 -- amend Backup + recovery** with a SMW-store hint (the SMW state lives in MariaDB tables under `qwiki_beta` + the source tree under `mediawiki-html/extensions/SemanticMediaWiki/`; both are covered by the inherited backup).

  **Old string:**

  ```
  - **Backup:** inherited from Unraid -> Synology weekly tarball of `/mnt/user/appdata/`
    per `/home/paradoks/projects/unRAID/docs/server/backup.md`. No bespoke wiring
    required. Everything the stack needs is under `/mnt/user/appdata/qwiki-beta/`
    (MariaDB data, MW source tree, uploaded images, Citizen, configs); the
    weekly tarball captures all of it.
  ```

  **New string:**

  ```
  - **Backup:** inherited from Unraid -> Synology weekly tarball of `/mnt/user/appdata/`
    per `/home/paradoks/projects/unRAID/docs/server/backup.md`. No bespoke wiring
    required. Everything the stack needs is under `/mnt/user/appdata/qwiki-beta/`
    (MariaDB data including SMW's `smw_*` tables, MW source tree including SMW
    source + Composer-managed vendor/, uploaded images, Citizen + Page Forms
    overlays, configs); the weekly tarball captures all of it.
  ```

- [ ] **Edit 6 -- amend Recovery (data loss)** with a SMW + PF note (no special handling needed beyond restoring the tarball; both extensions come back automatically).

  **Old string:**

  ```
  - **Recovery (data loss):** restore `/mnt/user/appdata/qwiki-beta/` from the
    most recent Synology tarball, then bring the stack up. MariaDB state lives
    in `mariadb-data/`; MW source in `mediawiki-html/`; uploaded images in
    `mediawiki-data/`; Citizen skin in `citizen/`. Nothing else needs to be
    re-pulled or re-extracted; the bind-mount layout means everything was in
    the backup.
  ```

  **New string:**

  ```
  - **Recovery (data loss):** restore `/mnt/user/appdata/qwiki-beta/` from the
    most recent Synology tarball, then bring the stack up. MariaDB state lives
    in `mariadb-data/` (including the `smw_*` tables); MW source in
    `mediawiki-html/` (including SMW source at `extensions/SemanticMediaWiki/`
    + SMW deps in `vendor/` + the `composer.local.json` / `composer.lock`
    pins); uploaded images in `mediawiki-data/`; Citizen skin in `citizen/`;
    Page Forms checkout in `page-forms/`. Nothing else needs to be re-pulled
    or re-extracted; the bind-mount layout means everything was in the
    backup.
  ```

**Verification.** After Edit 1-6 applied: `grep -c 'page-forms/' apps/qwiki-sandbox/deploy/README.md` returns >= 4 (Topology + first-time-deploy step 1 + image-bump procedure + Recovery). `grep -c '## Phase 2: install' apps/qwiki-sandbox/deploy/README.md` returns `1`. `grep -c '## Routine redeploy (extension version bump)' apps/qwiki-sandbox/deploy/README.md` returns `1`. `grep -c 'composer.local.json' apps/qwiki-sandbox/deploy/README.md` returns >= 6 (declaration in step 3 + multiple mentions in image-bump + extension-bump sections). The full file is no longer than ~900 lines.

### Task 6 -- Update apps/qwiki-sandbox/OVERVIEW.md with Phase 2 state

**Goal.** Amend the Substrate state prose in the per-arc overview to reflect Phase 2's shipped extensions. Phase 1 wrote OVERVIEW.md's Substrate state as a two-paragraph prose summary ("After Phase 1 ships: ..." + "Phases 2 / 3 / 4 layer ..."); Phase 2 rewrites both paragraphs to "After Phase 1 + Phase 2 ship: ..." + "Phases 3 / 4 layer ...". The arc README's phase index (separately tracked) remains the authoritative per-phase status table.

**Files.** `apps/qwiki-sandbox/OVERVIEW.md`.

**Execution mode.** `inline` -- surgical Edit at the "Substrate state" prose block (D22 / D26).

**Steps.**

- [ ] Apply the following Edit to `apps/qwiki-sandbox/OVERVIEW.md`:

  **Old string** (the Substrate state two-paragraph block exactly as committed in Phase 1):

  ```
  ## Substrate state

  After Phase 1 ships: a three-container Docker stack on Unraid -- `qwiki-nginx` (nginx 1.30-alpine, the CF Tunnel-facing entry point) + `qwiki-mediawiki` (mediawiki:1.43-fpm, php-fpm at port 9000) + `qwiki-mariadb` (mariadb 11.4 LTS) -- plus the Citizen skin v3.16.0 git checkout. Vanilla; no extensions; no auth (anonymous read works, anonymous edit blocked). Live at `wiki-beta.quake.world` via Cloudflare Tunnel.

  Phases 2 / 3 / 4 layer Page Forms + SMW, then PluggableAuth + Discord OAuth + MW groups, then quality-tag categories + Layer 3 harvest verification.
  ```

  **New string:**

  ```
  ## Substrate state

  After Phase 1 + Phase 2 ship: the three-container Docker stack on Unraid -- `qwiki-nginx` (nginx 1.30-alpine, the CF Tunnel-facing entry point) + `qwiki-mediawiki` (mediawiki:1.43-fpm, php-fpm at port 9000) + `qwiki-mariadb` (mariadb 11.4 LTS) -- plus the Citizen skin v3.16.0 git checkout, Page Forms (REL1_43 branch HEAD, overlay-bound) and Semantic MediaWiki 6.0.x (composer-managed under `mediawiki-html/`). Anonymous read works, anonymous edit blocked; `Special:Version` lists both extensions; `Form:TestForm` + `Template:Test` + main-namespace `TestPage` exist as Phase 2 smoke-test breadcrumbs (deletable at operator discretion). Live at `wiki-beta.quake.world` via Cloudflare Tunnel.

  Phases 3 / 4 layer PluggableAuth + Discord OAuth + MW groups, then quality-tag categories + Layer 3 harvest verification.
  ```

**Verification.** `grep -c 'After Phase 1 + Phase 2 ship' apps/qwiki-sandbox/OVERVIEW.md` returns `1`. `grep -c 'Page Forms (REL1_43 branch HEAD' apps/qwiki-sandbox/OVERVIEW.md` returns `1`. `grep -c 'Semantic MediaWiki 6.0.x' apps/qwiki-sandbox/OVERVIEW.md` returns `1`. `grep -c 'After Phase 1 ships:' apps/qwiki-sandbox/OVERVIEW.md` returns `0` (the prior phrasing is gone).

### Task 7 -- Operator deploy: install extensions on Unraid + verify

**Goal.** Execute the Phase 2 install section of `deploy/README.md` against the live Unraid host (steps 1-9 of "Phase 2: install Page Forms + Semantic MediaWiki"). Result: `Special:Version` shows both extensions, the smoke-test form submits cleanly, `runJobs.php` drains without error.

**Files.** None in repo. Operator-side state changes on Unraid (`/mnt/user/appdata/qwiki-beta/page-forms/` + `/mnt/user/appdata/qwiki-beta/mediawiki-html/composer.local.json` + `extensions/SemanticMediaWiki/` + `vendor/` updates) + on-wiki content (`Form:TestForm`, `Template:Test`, `TestPage`).

**Execution mode.** `inline` -- this is an operator-driven deploy. The commands are documented in the just-edited `deploy/README.md`. The executor's role is to run them in order, capture output, and confirm verification at each step. No code synthesis; subagent dispatch adds no value (D22 / D26).

**Steps.**

- [ ] Confirm `apps/qwiki-sandbox/deploy/` Phase 2 artifacts (composer.local.json + updated compose / LocalSettings / README + test-form/) are committed on `main`.
- [ ] Follow `apps/qwiki-sandbox/deploy/README.md` "Phase 2: install Page Forms + Semantic MediaWiki" steps 1-9 in order:
  - Step 1: create `/mnt/user/appdata/qwiki-beta/page-forms/` directory.
  - Step 2: git-clone PF REL1_43 into `page-forms/`.
  - Step 3: scp composer.local.json + LocalSettings.php + docker-compose.prod.yml.
  - Step 4: composer one-shot via `composer:latest` container; verify `extensions/SemanticMediaWiki/extension.json` + `composer.lock` exist.
  - Step 5: `docker compose up -d` to apply the new bind + restart mediawiki.
  - Step 6: `maintenance/update.php` to migrate DB schema; confirm `smw_*` tables >= 10.
  - Step 7: `maintenance/runJobs.php` to drain queue.
  - Step 8: paste Form:TestForm + Template:Test bodies into wiki UI (logged in as Admin); submit form to create TestPage; verify Special:Version lists both extensions.
  - Step 9: final `runJobs.php` drain.
- [ ] On any step failure: consult `deploy/README.md` Troubleshooting; do NOT modify the committed files mid-deploy. If a substantive change is needed, halt + escalate to operator for arc-amendment decision (D25).
- [ ] After successful deploy + verification, commit + push the Phase 2 artifacts to `main` per step 10 of the Phase 2 install section.

**Verification.** Phase-boundary verification (next section) is the gate for this task. See "Verification (phase boundary)" below.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of Phase 2. YES/NO answers per D24.

**V_PF1. Page Forms extension is loaded + registered.**

Page Forms' `Special:Forms` is a public special page (no login required) that lists all defined forms; reachable iff PF's extension.json registered the page during MW bootstrap. Probe shape returns HTTP 200 when PF is loaded, 404 when the special page is unrecognized.

```bash
ssh unraid 'curl -s -o /dev/null -w "%{http_code}\n" \
  http://192.168.1.205:8081/index.php?title=Special:Forms'
```

Operator-facing confirmation (browser): open `https://wiki-beta.quake.world/index.php?title=Special:Version`, scroll to "Installed extensions", confirm a "Page Forms" entry with version string (typically `5.x.y` for PF on REL1_43; verify against PF release notes if uncertain).

- **PASS condition:** the curl probe prints `200`, AND the browser page lists "Page Forms" under "Installed extensions".
- **FAIL condition:** the curl prints `404` (PF special page unregistered), browser page omits Page Forms, OR a PHP fatal appears in `docker logs qwiki-mediawiki --tail 50`.

**V_PF2. Smoke-test form renders + submits.**

In a browser logged in as `Admin`:

1. Visit `https://wiki-beta.quake.world/index.php?title=Special:FormEdit/TestForm`.
2. Enter `TestPage` in the page title field, `Hello QWiki` as Test name, `Phase 2 verification` as Test note. Submit.

- **PASS condition:** the form renders with two visible inputs + Save / Cancel buttons; submission redirects to `/wiki/TestPage`; the rendered page shows `Test name: Hello QWiki`, `Test note: Phase 2 verification`, and `Category:Test pages` at the bottom.
- **FAIL condition:** `Special:FormEdit/TestForm` returns 404 / "Form does not exist" (the Form:TestForm page didn't save into NS_FORM -- recheck step 8 of the Phase 2 install: only the `<includeonly>` body should be pasted, not the `<noinclude>` preamble); submission errors with "internal error" (check `docker logs qwiki-mediawiki --tail 50`); or `Category:Test pages` is missing from the rendered TestPage (Template:Test wasn't saved correctly).

**V_SMW1. Semantic MediaWiki extension is loaded + schema migrated.**

Two probes -- one for extension-registered (HTTP), one for schema-migrated (SQL). Both must PASS.

Extension-registered probe (same shape as V_PF1, against SMW's `Special:Browse` -- the SMW data-browser special page, public-readable, present iff SMW registered hooks during MW bootstrap):

```bash
ssh unraid 'curl -s -o /dev/null -w "%{http_code}\n" \
  http://192.168.1.205:8081/index.php?title=Special:Browse'
```

Schema-migrated probe (SMW core tables exist in qwiki_beta):

```bash
ssh unraid 'set -a && . /mnt/user/appdata/qwiki-beta/.env && set +a && \
  docker exec -e MYSQL_PWD="$MARIADB_ROOT_PASSWORD" qwiki-mariadb \
  mariadb -uroot -N -B -e "USE qwiki_beta; SHOW TABLES LIKE \"smw_%\";"' | wc -l
```

Operator-facing confirmation (browser): `Special:Version` lists "Semantic MediaWiki" with version `6.0.x` under "Installed extensions".

- **PASS condition:** HTTP probe prints `200`; SQL probe returns count `>= 10` (SMW 6.0.x ships ~16 `smw_*` tables; threshold conservative-pass); browser shows SMW with a 6.0.x version string.
- **FAIL condition:** HTTP probe prints `404` (SMW special page unregistered); SQL count `< 10` (`maintenance/update.php` didn't run or failed -- re-run and inspect output); browser omits SMW or shows it with "ERROR" tag (consult Troubleshooting "Special:Version lists Page Forms or SMW with an ERROR tag").

(The `-N -B` flags on mariadb suppress column headers + format borders so `wc -l` counts table rows only, not the header line.)

**V_SMW2. SMW jobs queue drains cleanly.**

```bash
ssh unraid 'docker exec qwiki-mediawiki \
  php /var/www/html/maintenance/runJobs.php; echo "exit=$?"'
```

- **PASS condition:** the script's stdout ends with a line like `<N> jobs run, 0 failed` or `Job queue is empty.`; `exit=0`.
- **FAIL condition:** any `jobs run, <>0 failed` line; or non-zero exit code; or `Fatal error:` / `Uncaught Exception` in stdout/stderr.

**V_OPS1. All three containers still healthy.**

```bash
ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'
```

- **PASS condition:** `qwiki-nginx`, `qwiki-mediawiki`, `qwiki-mariadb` all `Up`; `qwiki-mariadb` `(healthy)`. The Phase 2 docker-compose bind addition didn't break the stack.
- **FAIL condition:** any container `Restarting` / `Exited` (consult Phase 1 V4 recovery + Phase 2 Troubleshooting additions).

If V_PF1 + V_PF2 + V_SMW1 + V_SMW2 + V_OPS1 all PASS, the phase is green and Phase 3 (auth + groups) is unblocked. Phase 1's V6 (backup tarball includes qwiki-beta) remains the asynchronous next-Monday check; Phase 2 didn't change the appdata path so V6's pass state is inherited.

## Outputs to next phase

State now true that wasn't before Phase 2:

- Page Forms extension (REL1_43 branch HEAD at deploy time) installed at `/mnt/user/appdata/qwiki-beta/page-forms/` and overlay-bound onto `/var/www/html/extensions/PageForms` in both mediawiki + nginx services. NS_FORM (106) and NS_FORM_TALK (107) namespaces exist; `Special:FormEdit/<FormName>` / `Special:RunQuery/<FormName>` special pages registered.
- Semantic MediaWiki 6.0.x installed via Composer; SMW source at `/mnt/user/appdata/qwiki-beta/mediawiki-html/extensions/SemanticMediaWiki/`; SMW deps at `/mnt/user/appdata/qwiki-beta/mediawiki-html/vendor/` (alongside MW core's own vendor entries). `enableSemantics()` activated at `wiki-beta.quake.world`. Special pages registered: `Special:SMWAdmin`, `Special:Browse`, `Special:Ask`, `Special:SearchByProperty`, etc. Semantic namespaces registered: `Property:` (102), `Concept:` (108).
- DB schema migrated by `maintenance/update.php`: ~16 `smw_*` tables present in `qwiki_beta` + `pf_*` tables (Page Forms internal); core MW table count up from ~58 (Phase 1) to ~74-80 (Phase 1 + Phase 2 extension tables).
- `apps/qwiki-sandbox/deploy/composer.local.json` committed and scp'd to `/mnt/user/appdata/qwiki-beta/mediawiki-html/`; pins SMW to `~6.0.1`.
- `apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext` + `Template-Test.wikitext` committed as breadcrumb artifacts for Phase 2 smoke-test reproducibility.
- `apps/qwiki-sandbox/deploy/README.md` extended with Phase 2 install section + Phase-2-aware image-bump procedure + extension-version-bump redeploy section + Troubleshooting additions for composer / SMW / Page Forms errors.
- `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` extended with the Page Forms overlay bind on mediawiki + nginx services.
- `apps/qwiki-sandbox/deploy/LocalSettings.php` extended with `wfLoadExtension( 'PageForms' )` + `wfLoadExtension( 'SemanticMediaWiki' )` + `enableSemantics( 'wiki-beta.quake.world' )`.
- `apps/qwiki-sandbox/OVERVIEW.md` marks Phase 2 shipped.
- The wiki has three concrete pages: `Form:TestForm`, `Template:Test`, `TestPage` (main NS). These can be deleted at operator discretion or kept as breadcrumbs; nothing downstream depends on them.

Phase 3's inputs match this output set + Phase 3-only operator prerequisites:

- Discord OAuth application registered in the Discord developer portal (per `prerequisites.md`).
- `@wiki-beta` Discord role created in the operator's Discord server.
- Operator's Discord user-ID + the `@wiki-beta` role's OAuth claim value known.

Phase 2 does NOT consume any of these prerequisites.

## Open questions / deferred items

- **Question:** D22 says "MW LocalSettings.php config" and "docker-compose YAML" are mechanical and should run `inline`. The drafter prompt's "Drafting rules" section suggested defaulting Phase 2's LocalSettings.php + SMW init tasks to `subagent (Sonnet medium)` for verification value. This phase MD follows D22 (all six implementation tasks declare `inline`); the verification value the prompt cited is absorbed instead by the sub-agent verification pass that runs against this MD before operator review.
  - **Default chosen for now:** all six implementation tasks `inline`. The sub-agent verification (per phase-template) catches drift before commit.
  - **Who can resolve:** operator. If a future phase has a task where subagent verification of inlined content actually carries value (e.g., a complex multi-extension auth wiring with conditional logic), this MD's pattern can flip; the present phase doesn't have that shape.

- **Question:** Page Forms is pinned to "REL1_43 branch HEAD at deploy time" rather than a specific commit SHA. This means two Phase 2 deploys on different dates can land different PF revisions; the difference is typically a handful of i18n updates or minor bugfixes.
  - **Default chosen for now:** branch-HEAD pinning. Page Forms releases infrequently from this branch; the operator can pin a specific commit later if reproducibility becomes load-bearing.
  - **Who can resolve:** operator. If pinning becomes important (e.g., for cross-contributor reproducibility once Phase 3 ships the `@wiki-beta` group), `composer.local.json` could grow a `mediawiki/page-forms` entry similar to SMW's, OR the Page Forms git-clone command could capture a SHA.

- **Question:** The smoke-test Form / Template / TestPage live in the wiki database; they're not part of the committed `main` branch. After Phase 5 (Mode page-type) ships, the test artifacts may collide with Phase 5's Form / Template names or pollute Special:Categories listings.
  - **Default chosen for now:** keep the artifacts post-Phase-2. The names (`Form:TestForm`, `Template:Test`, `TestPage`, `Category:Test pages`) are unambiguously prefixed enough that Phase 5's Mode-related Form / Template / Category names are unlikely to collide. Operator may delete at any phase boundary if they pollute listings.
  - **Who can resolve:** operator at Phase 5 sign-off, OR earlier if the test artifacts annoy curator review.

- **Question:** D5 namespace edit restrictions for Form / Template / Category land in Phase 3 alongside `wiki-contributor` / `wiki-curator` groups. Between Phase 2 and Phase 3, only the admin sysop user can create the smoke-test form (because anonymous edit is blocked at the global `$wgGroupPermissions['*']['edit'] = false` level). This is intentional and aligned with D5's "namespace prep in Phase 2, full restriction in Phase 3" framing.
  - **Default chosen for now:** Phase 2 admin-only edit access is fine. The smoke-test form creation is a one-shot admin action; no contributor-flow constraint applies yet.
  - **Who can resolve:** n/a -- resolved by D5 / drafter prompt scope-of-Phase-2 framing.

## Recovery (if verification fails)

Per-failure-mode recovery; anticipatable failures only. Unanticipated failures route to operator.

- **V_PF1 fails (Page Forms not in Special:Version):** `extensions/PageForms` doesn't resolve inside the container.
  - Verify host bind exists: `ssh unraid 'ls /mnt/user/appdata/qwiki-beta/page-forms/extension.json'` returns a path.
  - Verify container sees it: `ssh unraid 'docker exec qwiki-mediawiki ls /var/www/html/extensions/PageForms/extension.json'`. If this fails but the host path is present, the bind-mount didn't take -- run `docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml up -d --force-recreate mediawiki` and retest.
  - Verify LocalSettings actually loads PageForms: `ssh unraid 'docker exec qwiki-mediawiki grep wfLoadExtension /var/www/html/LocalSettings.php'`. Expect two lines (PageForms + SemanticMediaWiki).

- **V_PF2 fails (Special:FormEdit/TestForm 404s):** the Form:TestForm page wasn't saved into NS_FORM. Most likely cause: the operator pasted the `<noinclude>` preamble along with the `<includeonly>` body, leaving the actual form syntax inside a `<noinclude>` block that the parser drops at render time. Fix: re-edit `Form:TestForm`, delete everything, paste ONLY the `<includeonly>...</includeonly>` block (no preamble). Save.

- **V_PF2 fails (form submits but TestPage doesn't render fields):** `Template:Test` wasn't saved or has a syntax error. Visit `Template:Test`, re-paste the body from `apps/qwiki-sandbox/deploy/test-form/Template-Test.wikitext`, save.

- **V_SMW1 fails (SMW absent from Special:Version):** either composer didn't run or LocalSettings doesn't `enableSemantics()`.
  - Verify composer ran: `ssh unraid 'test -f /mnt/user/appdata/qwiki-beta/mediawiki-html/extensions/SemanticMediaWiki/extension.json && echo OK'` returns `OK`. If not, re-run the composer one-shot from Phase 2 step 4.
  - Verify LocalSettings: `ssh unraid 'docker exec qwiki-mediawiki grep -c enableSemantics /var/www/html/LocalSettings.php'` returns `1`.
  - Verify mediawiki restarted: `ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml restart mediawiki'`.

- **V_SMW1 fails (smw_* tables absent):** `maintenance/update.php` didn't run or ran before SMW was loaded.
  - Re-run: `ssh unraid 'docker exec qwiki-mediawiki php /var/www/html/maintenance/update.php --quick'`. Expect creation messages for `smw_object_ids`, `smw_di_blob`, etc.
  - If update.php errors with "class not found", composer's autoload isn't being read -- see Troubleshooting "maintenance/update.php errors with SemanticMediaWiki class not found".

- **V_SMW2 fails (runJobs.php errors / non-zero exit):**
  - If error mentions `smw_*` table not found: `update.php` only partially ran -- re-run it.
  - If error mentions class not found in SMW namespace: composer's autoload is broken -- delete `vendor/composer/installed.json` + `composer.lock` and re-run `composer update --no-dev`.
  - If `<N> jobs run, <>0 failed`: inspect `docker logs qwiki-mediawiki --tail 100` for which job class failed and why. Typically a malformed property annotation in TestPage; delete TestPage, re-submit the test form.

- **V_OPS1 fails (mediawiki restarting):** most likely PHP syntax error in LocalSettings.php (Phase 2 additions broke parsing).
  - Verify syntax: `php -l apps/qwiki-sandbox/deploy/LocalSettings.php` from operator's WSL. Fix locally + scp + restart.
  - Or `docker logs qwiki-mediawiki --tail 50` to see the parse error line.

- **V_OPS1 fails (nginx exits):** the Phase 2 docker-compose addition broke the volumes block syntax.
  - Verify locally: `docker compose -f apps/qwiki-sandbox/deploy/docker-compose.prod.yml config -q`. Fix + scp + `up -d`.

---

*Phase 2 ships when V_PF1 + V_PF2 + V_SMW1 + V_SMW2 + V_OPS1 PASS. Phase 3 (PluggableAuth + Discord OAuth + wiki-contributor / wiki-curator groups + namespace edit restrictions per D4 / D5) is unblocked once Phase 2 is committed + pushed.*
