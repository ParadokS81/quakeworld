<?php
# apps/qwiki-sandbox/deploy/LocalSettings.php
# MediaWiki 1.43 LTS configuration for qwiki-v1-beta (wiki.slipgate.me).
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

# The wiki lives at the apex of wiki.slipgate.me; no /w/ script path.
$wgScriptPath = "";
$wgServer = "https://wiki.slipgate.me";
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
enableSemantics( 'wiki.slipgate.me' );

# --- MW bundled-extension activation surface (Phase 2) --------------------
#
# Audit performed 2026-05-14 against /var/www/html/extensions/ (34 bundled).
# F-finding F6 tracks this audit; future MW LTS arcs inherit this surface.
#
# LOAD (active in v1 baseline; universal-need extensions for a
# template-driven wiki):
#   ParserFunctions  -- #if / #switch / #ifeq / #expr / #time; required by
#                       Template:Test and any future page-type template.
#   Cite             -- footnote support (<ref>...</ref> + <references/>);
#                       supports D11 #4 citation discipline.
#   CategoryTree     -- supports Layer B sub-category nav per spec-sketch v3.
#   TemplateData     -- <templatedata> JSON for template self-documentation;
#                       supports Phase 5+ page-type template discoverability.
#
# SKIP (locked decision against; do NOT load even later):
#   VisualEditor  -- D2 explicit ("Visual Editor is NOT in v1 baseline").
#   OATHAuth      -- D4 auth via Discord OAuth supersedes username/password 2FA.
#   LoginNotify   -- D4 OAuth flow doesn't generate the email-login signals
#                    this extension watches.
#   Math          -- QW domain has no math/LaTeX rendering need.
#   PdfHandler    -- QW domain has no PDF upload pathway.
#
# DEFER (not loaded now; revisit when a downstream phase needs it):
#   AbuseFilter, CiteThisPage, CodeEditor, ConfirmEdit, DiscussionTools, Echo,
#   Gadgets, ImageMap, InputBox, Interwiki, Linter, MultimediaViewer, Nuke,
#   PageImages, Poem, ReplaceText, Scribunto, SecureLinkFixer, SpamBlacklist,
#   SyntaxHighlight_GeSHi, TextExtracts, Thanks, TitleBlacklist, WikiEditor.

wfLoadExtension( 'ParserFunctions' );
wfLoadExtension( 'Cite' );
wfLoadExtension( 'CategoryTree' );
wfLoadExtension( 'TemplateData' );
