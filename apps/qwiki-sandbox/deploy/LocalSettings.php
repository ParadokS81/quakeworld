<?php
# apps/qwiki-sandbox/deploy/LocalSettings.php
# MediaWiki 1.43 LTS configuration for qwiki-v1-beta (wiki-beta.quake.world).
# Hand-authored; install.php is run once to bootstrap the DB schema, but its
# generated LocalSettings.php is discarded in favor of this committed file.
#
# Secrets read from the container's environment (populated via docker-compose
# env_file or environment block); never committed in plaintext here.
#
# Phase 1 scope: MW core + Citizen skin only. No extensions (Phase 2), no auth
# (Phase 3), no quality-tag categories (Phase 4). MW default
# $wgGroupPermissions['*']['edit'] = false (anonymous edit blocked) is preserved.

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
# phases as authoring conventions firm up. Per D2 Amendment #2 we do not set
# $wgCitizenEnableCommandPalette -- the v3 default enables the command palette,
# so the v2-era explicit pin is unnecessary.

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
