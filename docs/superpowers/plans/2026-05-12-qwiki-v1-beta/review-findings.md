# qwiki-v1-beta -- review findings ledger

This arc has no prior monolithic plan. The brainstorm (six conceptual passes 2026-05-09 through 2026-05-12; vision spec at `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`) drained directly into this six-artifact scaffold, not via a monolithic plan. As a result, the F-finding ledger is empty at scaffold time.

Findings accrue here during arc execution -- phase-MD drafting (sub-agent verifier surfaces drift between a draft phase MD and the live state), per-task execution (executor surfaces operational learnings), and phase-boundary verification (orchestrator catches cross-phase drift between shipped state and downstream phase MDs). Each finding gets a sequential F-number, a severity tag, and a phase pointer.

---

## Findings table

| F# | Severity | Title | Surfaced in | Resolved by |
|---|---|---|---|---|
| F1 | SUBSTANTIVE | MW 1.39 LTS is past upstream support window | Phase 1 drafting (2026-05-13) | RESOLVED 2026-05-13 -- `decisions.md` D2 Amendment #2 (MW 1.39 -> 1.43 LTS + cascading version bumps) |
| F2 | SUBSTANTIVE | Phase 1 execution-time learnings cluster (install.php GRANT 1133 + 3 minor) | Phase 1 execution (2026-05-13/14) | RESOLVED 2026-05-14 -- `apps/qwiki-sandbox/deploy/README.md` patches in commit `f6d26ee6` (pre-create qwiki@'mariadb' workaround + docker-based wipe recovery + nginx apex redirect scheme fix + Cloudflare One dashboard path correction) |
| F3 | SUBSTANTIVE | Cross-phase hostname + SSH identity drift in Phase 2/3/4 MDs + prerequisites.md | Phase 1 boundary verification (2026-05-14, orchestrator) | RESOLVED 2026-05-14 -- Option A applied: replace_all retarget across `phase-2-extensions.md` / `phase-3-auth-groups.md` / `phase-4-discipline-harvest.md` + `phase-3-drafter-prompt.md` line 49 + `phase-template.md` examples + `prerequisites.md` line 13 SSH identity update |
| F4 | SUBSTANTIVE | Composer platform-req mismatch when running composer:latest against MW source | Phase 2 execution (2026-05-14, composer resolve step) | RESOLVED 2026-05-14 -- `apps/qwiki-sandbox/deploy/README.md` + `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-2-extensions.md` amended to add `--ignore-platform-req=ext-calendar --ignore-platform-req=ext-intl` at all three composer-update sites (Phase 2 install step + image-bump procedure + SMW extension-bump section) in both files |
| F5 | SUBSTANTIVE | Page Forms `Special:FormEdit/<FormName>` (no target) returns HTTP 400 in PF 5.8.1 when the form has no built-in target-prompt input | Phase 2 execution (2026-05-14, V_PF2 step) | RESOLVED 2026-05-14 -- corrected V_PF2 URL to `Special:FormEdit/TestForm/TestPage` (target page in URL path). Form rendered cleanly + submission succeeded. Phase-MD `phase-2-extensions.md` V_PF2 probe + deploy README Phase-2-install step 8 + executor prompt sub-halts retain the no-target URL; future executor prompts inherit the corrected URL form. |
| F6 | SUBSTANTIVE | Cross-phase audit of MW bundled-extension activation surface (ParserFunctions not loaded, surfaced by Template:Test #if not resolving) | Phase 2 execution (2026-05-14, V_PF2 render check) | RESOLVED 2026-05-14 -- audit performed against `/var/www/html/extensions/` (34 bundled). LOAD: ParserFunctions, Cite, CategoryTree, TemplateData. SKIP: VisualEditor, OATHAuth, LoginNotify, Math, PdfHandler. DEFER: remaining 24. Activation surface captured as durable contract in `apps/qwiki-sandbox/deploy/LocalSettings.php` comments + `phase-2-extensions.md` Task 2 inline content. |

### F1 -- MW 1.39 LTS is past upstream support window

**Surfaced during:** Phase 1 redraft, 2026-05-13 (the same session as the D2 amendment that locked nginx + php-fpm + MariaDB).

**Finding.** `decisions.md` D2 names MW 1.39 LTS with "current LTS through Dec 2027." Live recon against the MW Version_lifecycle page (consulted 2026-05-13) shows:

- MW 1.39 is no longer listed in the lifecycle table.
- The active LTS is **MW 1.43** (end-of-life December 2027).
- The next LTS will be MW 1.47 (November 2026).
- The `mediawiki:1.39-fpm` Docker tag still pulls (latest patch is `1.39.17-fpm`), but the `1.39/` directory has been removed from the upstream `wikimedia/mediawiki-docker` master branch -- the image is in security-frozen state with no further upstream backports expected.

**Why this is SUBSTANTIVE.** Shipping wiki-beta.quake.world on MW 1.39 means the substrate is past its formal upstream-support window from day 1. An MW security CVE between Phase 1 ship and the eventual 1.43+ migration arc would leave the wiki unpatched. Even invite-only (`@wiki-beta` Discord role gates contribution per D19), the read-side is public to the internet, so XSS / SQLi / path-traversal CVEs are exploitable by any visitor.

**Phase 1's stance.** Phase 1 does NOT deviate from D2; it ships `mediawiki:1.39-fpm` as locked. The finding is captured in the phase MD's Open Questions section #1 with default = ship 1.39, who-can-resolve = operator.

**Resolution path.** Operator decision:

- **Keep D2 as-is (ship 1.39):** accept the security-frozen risk on a low-volume wiki with invite-only contributor pool, plan an MW upgrade arc for 1.43+ within the next 6-12 months.
- **Amend D2 to MW 1.43 LTS:** dated amendment block in `decisions.md` D2; bump image tags in Phase 1's `docker-compose.prod.yml` (`mediawiki:1.43-fpm`) and deploy README; switch Citizen skin pin from v2.40.2 (1.39-compatible) to main branch (1.43+ compatible) or another Citizen tag that supports 1.43; rerun Phase 1 drafter prompt to refresh the MD.

**Cross-phase implications.** If D2 is amended to 1.43 LTS:

- **Phase 2 (extensions):** Page Forms + Semantic MediaWiki release tags need to track 1.43-compatible versions (REL1_43 branches), not 1.39-compatible (REL1_39 branches). The Phase 2 drafter prompt has not been written yet; it must reference the resolved D2 image tag.
- **Phase 3 (auth):** PluggableAuth + Discord OAuth extension release tags need to track 1.43-compatible versions. Same drafter-prompt note.
- **Citizen skin (Phase 1 + carry-forward):** the v2.40.2 pin gives way to a 1.43-compatible Citizen reference; main branch is the default candidate; specific tag locked by operator.

**Recommendation.** Resolve before Phase 2 drafting begins. The amendment is a routine D2 edit; the Phase 1 redraft impact is mechanical (image tags + Citizen pin); the Phase 2/3 drafter prompts inherit the resolved decision without needing a redraft.

**Resolution 2026-05-13.** Operator approved amending D2. Live-source verification (Docker Hub registry API + MW Version_lifecycle + GitHub extension repos) revealed that ALL FOUR pinned versions in D2 Amendment #1 were drifted (training-data-era versions). `decisions.md` D2 Amendment #2 (same day) locks current-stable equivalents:

- MediaWiki: `1.39-fpm` -> `1.43-fpm` (PHP 8.3 bundled)
- MariaDB: `10.11` -> `11.4` (current `lts` tag; supported through May 2029)
- nginx: `1.27-alpine` -> `1.30-alpine` (current stable Alpine line)
- Citizen skin: `v2.40.2` -> `v3.16.0` (current release; requires MW 1.43+)

Phase 1 MD redrafted in place at `phase-1-mw-core.md` to reflect the new tags + drop the obsolete `$wgCitizenEnableCommandPalette` LocalSettings option (removed in Citizen v3). Phase 2 + Phase 3 drafter prompts (still to be written) inherit the resolved versions per the amendment's "Implication for later phases" section.

F1 closed.

---

### F2 -- Phase 1 execution-time learnings cluster

**Surfaced during:** Phase 1 execution + post-deploy patching, 2026-05-13/14. Caught by the executor (Claude) during Task 9 deploy on Unraid; resolved before halt-to-orchestrator.

**Finding.** Phase 1's nine tasks shipped clean, but the Task 9 deploy surfaced four operational learnings that the original Phase 1 MD did not anticipate. All four are now baked into `apps/qwiki-sandbox/deploy/README.md` (commit `f6d26ee6` 2026-05-14).

**Sub-findings:**

1. **install.php GRANT error 1133 against MariaDB 11.4.** First-time `install.php` attempt failed at the GRANT step with MariaDB error 1133 (`Can't find any matching row in the user table`). Root cause: the MW 1.43 installer detects the `qwiki` user already created by the MariaDB container's `MARIADB_USER` env, skips `CREATE USER`, then tries to `GRANT ... TO qwiki@<dbserver>` where `<dbserver>` resolves to `qwiki@'mariadb'` -- which doesn't exist (only `qwiki@'%'` was created by the container env). MariaDB 11.4 errors out at the missing-user case (more strict than older MariaDB versions). **Recovery:** wipe `mariadb-data/` via docker-based alpine container (non-root claude-deploy can't `rm -rf` uid-999-owned files), bring MariaDB back up, pre-create `qwiki@'mariadb'` with the same password as `qwiki@'%'`, re-run `install.php`. Now baked into deploy/README.md First-time-deploy step 7 + a new Troubleshooting entry for error 1133.

2. **nginx apex-redirect Location-header scheme.** Original `return 301 /index.php?title=Main_Page;` emitted `http://wiki.slipgate.me/...` in the Location header. Cloudflare Tunnel terminates TLS at the edge, so nginx sees plain HTTP -- and a relative-URL 301 takes the request scheme as the Location scheme. The client relied on CF's auto-https / HSTS to upgrade, but it was visible in the curl V1 chain as `Location: http://...`. **Fix:** explicit scheme: `return 301 https://$host/index.php?title=Main_Page;`. Reloaded in place via `nginx -s reload`; V1 chain now clean. Generic lesson: behind a TLS-terminating proxy, redirects need an explicit `https://` scheme.

3. **Cloudflare dashboard path drift.** Phase 1 MD + deploy/README.md original text directed the operator to `Zero Trust -> Access -> Tunnels` in the Cloudflare dashboard for Task 9 step 9 (Tunnel public-hostname route). Live state: the path is now `Cloudflare One -> Networks -> Tunnels` (Cloudflare rebranded Zero Trust as Cloudflare One; tunnel admin moved to Networks). **Fix:** corrected path in deploy/README.md step 9.

4. **Non-root claude-deploy user cannot `rm -rf` MariaDB data.** During the install.php failure recovery, attempting `rm -rf /mnt/user/appdata/qwiki-beta/mariadb-data/*` as `claude-deploy` (non-root, in docker group) was rejected because the MariaDB container writes data as uid 999 (mysql user inside the container), which the host `claude-deploy` uid 1002 cannot override. **Fix:** docker-based alpine container with the host path bind-mounted runs the wipe as root inside the container. Documented in deploy/README.md Troubleshooting under the "already installed" recovery path.

**Cross-phase implications:**

- Phase 2 (extensions): does not re-run install.php; installs Page Forms via `git clone` + SMW via `composer`. Not affected by sub-finding (1). May benefit from sub-finding (4) discipline (the docker-based-elevated-user pattern is reusable).
- Phase 3 (auth): same as Phase 2 -- no install.php; not affected by (1). The OAuth flow uses the Cloudflare One dashboard for an unrelated step (Discord OAuth app); sub-finding (3) helps the operator navigate.
- Phase 4 (quality-tag categories): no Cloudflare config; not affected.
- Future arcs (MW major-version upgrade, e.g., 1.43 -> 1.47 LTS): sub-finding (1) directly relevant; the upgrade arc should pre-create qwiki@'mariadb' before any installer-shaped command and budget for the recovery procedure.

**Why this is SUBSTANTIVE despite RESOLVED.** The Phase 1 MD as drafted would have shipped buggy behavior had the executor not surfaced + fixed each sub-finding in flight. The resolution is durable (committed to deploy/README.md), so future re-runs of Phase 1's first-time-deploy steps (e.g., disaster recovery, fresh deploy on a new Unraid) will not re-hit these traps.

**Resolution.** Closed 2026-05-14 with commit `f6d26ee6`. All four sub-findings documented in `apps/qwiki-sandbox/deploy/README.md`.

F2 closed.

---

### F3 -- Cross-phase hostname + SSH identity drift in Phase 2/3/4 MDs

**Surfaced during:** Phase 1 boundary verification, 2026-05-14 (orchestrator session). Independent grep against the three downstream phase MDs (`phase-2-extensions.md` / `phase-3-auth-groups.md` / `phase-4-discipline-harvest.md`) revealed they still reference the pre-D3-amendment `wiki-beta.quake.world` URL and the root `ssh unraid` identity in numerous operational sites.

**Finding.** Commit `f6d26ee6` (URL retarget + post-deploy patches) updated the URL in: `apps/qwiki-sandbox/{CLAUDE.md, README.md, OVERVIEW.md, deploy/LocalSettings.php, deploy/README.md}`, `plans/2026-05-12-qwiki-v1-beta/README.md`, `plans/2026-05-12-qwiki-v1-beta/decisions.md` (D3 amendment block), `plans/2026-05-12-qwiki-v1-beta/prerequisites.md` (subdomain + Discord OAuth redirect URI). Commit `21a7b7d1` (SSH identity retarget) updated only `apps/qwiki-sandbox/deploy/README.md`. **Neither commit touched the Phase 2 / Phase 3 / Phase 4 phase MDs**, which still contain ~50 stale references collectively (28+ in Phase 2 MD; 20+ in Phase 3 MD; many in Phase 4 MD including the URL-slug-discipline help-page wikitext that gets authored into the live wiki). `prerequisites.md` line 13 (`ssh unraid 'echo ok'`) is also stale -- it should be `ssh unraid-deploy`.

**Concrete failure modes if not resolved before Phase 2 dispatch:**

- Phase 2 LocalSettings.php fragment shipped to Unraid would set `$wgServer = "https://wiki-beta.quake.world"` (overwriting the in-place Phase 1 fix) and call `enableSemantics( 'wiki-beta.quake.world' )` -- semantic-binding the wiki to a non-existent domain. SMW's `$smwgConfigFileDir` and related state would persist this bad domain across Phase 3 and Phase 4.
- Phase 2/3/4 deploy commands (`ssh unraid 'docker ...'`) would attempt root SSH against an Unraid host configured for the scoped `unraid-deploy` user; the scoped-user convention's blast-radius bound is undermined.
- Phase 4 URL-slug-discipline help-page wikitext literally contains the string `wiki-beta.quake.world` as the "current beta URL" the slug rule guards against; this gets stored as wiki content and becomes out-of-date documentation visible to contributors.

**Severity rationale.** SUBSTANTIVE because the drift would ship buggy behavior (broken `enableSemantics()` domain pin + wrong SSH identity) if the executor takes the MD literally. ADVISORY for the help-page content; the cutover-narrative still applies but the URL string is stale.

**Resolution paths (orchestrator-surfaced for operator decision):**

- **Option A:** retarget the literal references in `phase-2-extensions.md`, `phase-3-auth-groups.md`, `phase-4-discipline-harvest.md`, and `prerequisites.md` line 13 now. Bounded mechanical edit (`wiki-beta.quake.world` -> `wiki.slipgate.me`; `ssh unraid '` -> `ssh unraid-deploy '`; `unraid:` -> `unraid-deploy:`). Single commit; Phase 2 MD becomes clean for executor dispatch. Matches the pattern applied to Phase 1's paper artifacts in `f6d26ee6`.
- **Option B:** leave Phase 2/3/4 MDs as drafted (historical record); bake the URL + SSH-identity substitution into each per-phase executor prompt as an explicit augmentation note. Higher risk that the executor misses a reference at execution time.

Orchestrator recommendation: Option A. Phase MDs are operational documents the executor reads literally and runs commands from; preserving them as historical record would force per-execution mental search-and-replace and risk wiki-state corruption. Option B's "preserve historical record" intent is already served by the git commit history showing the original drafted state.

**Status:** RESOLVED 2026-05-14. Operator chose Option A (retarget MDs in place). Substitution patterns applied via replace_all across `phase-2-extensions.md` (17 wiki + 14 ssh + 3 scp targets), `phase-3-auth-groups.md` (20 wiki + 20 ssh + 1 scp), `phase-4-discipline-harvest.md` (16 wiki + 5 ssh + 1 scp + 1 double-quote ssh variant). Also caught: `phase-3-drafter-prompt.md` line 49 (Discord OAuth redirect URI) + `phase-template.md` three illustrative example URLs + `prerequisites.md` line 13 SSH identity precheck. Phase 1 MD + Phase 1 drafter prompt + decisions.md D6/D19/non-goals original text preserved as historical record (D3 amendment block is authoritative for URL going forward).

**Cross-phase implications resolved:** Phase 2/3/4 MDs now match deployed state. Phase 2 executor dispatch can proceed against clean MD. No per-executor-prompt augmentation needed for hostname or SSH identity.

---

### F4 -- Composer platform-req mismatch when running composer:latest against MW source

**Surfaced during:** Phase 2 execution, 2026-05-14. Caught by the executor (Claude) at Task 7 step 4 (composer one-shot against `mediawiki-html/`) -- composer errored at dependency resolution before any filesystem writes.

**Finding.** The Phase 2 deploy command shipped to both `apps/qwiki-sandbox/deploy/README.md` and `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-2-extensions.md` runs `composer update` via the `composer:latest` Docker image bind-mounted against `/mnt/user/appdata/qwiki-beta/mediawiki-html/`. The `composer:latest` image is a minimal Alpine PHP CLI; it does NOT ship with `ext-calendar` or `ext-intl`. MediaWiki's `composer.json` declares both as required PHP extensions. Composer therefore refuses to resolve dependencies and exits with:

```
Problem 1
  - Root composer.json requires PHP extension ext-calendar * but it is missing from your system.
Problem 2
  - Root composer.json requires PHP extension ext-intl * but it is missing from your system.
```

The composer error message itself names the fix: `--ignore-platform-req=ext-calendar --ignore-platform-req=ext-intl`. The flags tell composer to resolve dependencies as if those extensions were present (which they ARE at runtime -- the `mediawiki:1.43-fpm` image bundles both extensions; only the `composer:latest` resolver-environment is missing them). The flags do NOT affect the resolved packages or the runtime behavior; they only suppress the resolver-time platform check.

**Why this is SUBSTANTIVE.** The Phase 2 MD as drafted would have broken at deploy step 4 across all future Phase 2 re-runs (e.g., disaster recovery, fresh deploy on a new Unraid). Composer fails fast (no filesystem writes before resolution succeeds), so no state cleanup is needed -- but without the fix the deploy stalls indefinitely.

**Resolution.** Both files amended at three composer-update sites each (six edits total):

- Phase 2 install step (single-line composer command).
- Image-bump procedure (composer chained with `&& \` between rsync + `docker compose up -d`).
- SMW extension-bump section (composer chained with `&& \` between scp + `restart mediawiki`).

**Cross-phase implications:**

- Phase 3 (PluggableAuth + Discord OAuth) installs via `git clone`; no composer use; **NOT affected**.
- Phase 4 (quality-tag categories + wikitext): no composer use; **NOT affected**.
- Future MW major-version upgrade arc (e.g., 1.43 -> 1.47 LTS) inherits the corrected commands via the deploy README's image-bump procedure (already Phase-2-aware).

**Alternative noted for future-arc consideration (not adopted now):** run composer INSIDE the `qwiki-mediawiki` container if composer is on PATH there (`docker exec qwiki-mediawiki which composer`). The official MW image bundles composer at build-time but may strip it for image size; this is verifiable but not worth investigating during this Phase 2 deploy -- the platform-req-ignore flag fix is two flags per ignore and works cleanly. Flag for the post-arc retrospective if running composer-in-runtime is preferable architecturally.

**Pattern recognition (for post-arc retrospective).** The Phase 2 MD's verification subagent did not catch this. The cross-image composer pattern (composer container against bind-mount whose runtime image differs) is well-known and produces this exact error. Future drafter-subagent prompts should explicitly check for cross-image platform-req mismatches when a composer step appears in a phase MD.

F4 closed.

---

### F5 -- Page Forms FormEdit (no target) returns 400 in PF 5.8.1

**Surfaced during:** Phase 2 execution, 2026-05-14. Caught by the executor (Claude) at V_PF2 step. Operator visited `Special:FormEdit/TestForm` (no target page argument), which returned HTTP 400 with body text "No target page specified." (page heading rendered as "Create TestForm").

**Finding.** The Phase 2 MD's V_PF2 step + the executor prompt's V_PF2 reference both name the URL `Special:FormEdit/TestForm` (no target page in URL path). In Page Forms 5.8.1 (current REL1_43 HEAD as of deploy), this URL returns HTTP 400 when the form definition does not include an explicit target-page-prompt input. The Phase 2 `Form:TestForm` smoke-test form (per `apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext`) has no such input — it's `{{{for template|Test}}}` + two `{{{field|...}}}` + `{{{end template}}}` + `{{{standard input|save|cancel}}}`, nothing more.

Older PF versions auto-rendered a "Page name:" input at the top of `Special:FormEdit/<FormName>` when no target was specified. PF 5.8.1 changed this — without an explicit form-side target-prompt mechanism, the page returns 400.

**Why this is SUBSTANTIVE.** Following the MD's V_PF2 URL literally would produce a 400 every time, blocking phase-boundary verification. The fix is trivial (append target page name to URL path) but discoverable only by reading PF source or experimenting.

**Resolution.** V_PF2 re-run with `Special:FormEdit/TestForm/TestPage` returned 200 + rendered the form cleanly + submission landed `TestPage` with `Test name`, `Test note`, and `Category:Test pages`. The MD V_PF2 probe text + deploy README Phase-2-install step 8 + executor-prompt sub-halt reference all retain the no-target URL as historical record; future executor prompts (Phase 3+, and any re-run of Phase 2) should use the target-in-URL form.

**Cross-phase implications.** Phase 5 (Mode page-type form) inherits this finding directly — the Mode form must EITHER include an explicit target-prompt input in its definition OR Phase 5 V-probes must use the target-in-URL form. Recommend the form-side mechanism (add `{{{info|create title=Mode name}}}` or `{{{info|partial form}}}` patterns to the Mode form) so contributors don't need to construct target URLs manually; this is a Phase 5 design concern.

F5 closed.

---

### F6 -- MW bundled-extension activation surface audit

**Surfaced during:** Phase 2 execution, 2026-05-14. Caught at V_PF2 final render check: `TestPage` showed `{{#if:Phase 2 verification|Test note: Phase 2 verification|}}` as raw wikitext (unparsed), indicating ParserFunctions was not loaded. Root cause: the Phase 2 MD's LocalSettings.php Extensions section loads only Page Forms + Semantic MediaWiki; the 34 MW-bundled extensions (universally available at `/var/www/html/extensions/` per the official `mediawiki:1.43-fpm` image) are all dormant by default — `wfLoadExtension()` is required to activate any of them.

**Finding.** ParserFunctions is bundled but unloaded — the immediate trigger. The broader concern: the activation surface of the 34 bundled extensions had never been audited against `decisions.md` scope. Other gaps could be lurking (e.g., Cite for citation discipline D11 #4; CategoryTree for Layer B nav per spec-sketch v3; TemplateData for Phase 5 template self-documentation). Without an explicit audit, future phases would discover gaps reactively (same shape as this finding) rather than proactively.

**Why this is SUBSTANTIVE.** Phase 5 will ship the Mode page-type template. Any non-trivial wiki template uses `#if`/`#switch`/`#ifeq` — without ParserFunctions loaded, Phase 5 forms would render with raw parser-function syntax visible. The activation-audit pattern needs to be a durable contract, not a Phase-5-rediscovery.

**Resolution.** Audit performed against the bundled extension list (`docker exec qwiki-mediawiki ls /var/www/html/extensions/`). Three-way classification:

- **LOAD (4)** -- active in v1 baseline:
  - **ParserFunctions** -- universal template primitive (`#if`/`#switch`/`#ifeq`/`#expr`/`#time`); biting us right now.
  - **Cite** -- footnote support (`<ref>` / `<references/>`); supports D11 #4 citation discipline.
  - **CategoryTree** -- Layer B sub-category nav per spec-sketch v3.
  - **TemplateData** -- `<templatedata>` JSON for template self-documentation; supports Phase 5+ page-type template discoverability (operator-overridden from DEFER -> LOAD).

- **SKIP (5)** -- locked decision against; do NOT load even later:
  - **VisualEditor** -- D2 explicit ("Visual Editor is NOT in v1 baseline").
  - **OATHAuth** -- D4 auth via Discord OAuth supersedes username/password 2FA.
  - **LoginNotify** -- D4 OAuth flow doesn't generate the email-login signals.
  - **Math** -- QW domain has no math/LaTeX rendering need.
  - **PdfHandler** -- QW domain has no PDF upload pathway.

- **DEFER (24)** -- not loaded now; revisit per phase when needed: AbuseFilter, CiteThisPage, CodeEditor, ConfirmEdit, DiscussionTools, Echo, Gadgets, ImageMap, InputBox, Interwiki, Linter, MultimediaViewer, Nuke, PageImages, Poem, ReplaceText, Scribunto, SecureLinkFixer, SpamBlacklist, SyntaxHighlight_GeSHi, TextExtracts, Thanks, TitleBlacklist, WikiEditor.

The LOAD/SKIP/DEFER decisions are captured as a durable activation contract in `apps/qwiki-sandbox/deploy/LocalSettings.php` comments + `phase-2-extensions.md` Task 2 inline content. Future MW LTS arcs (e.g., 1.43 -> 1.47 upgrade arc) inherit this surface as the starting baseline.

None of the LOAD trio (now quartet) carries DB schema (ParserFunctions, Cite, CategoryTree, TemplateData are wikitext-side only) -- no `update.php` re-run needed. Apply via LocalSettings.php edit + scp + `docker compose restart mediawiki`.

**Cross-phase implications.** Phase 3 (auth) is unaffected by extension scope. Phase 4 (quality-tag categories) inherits CategoryTree for category-tree rendering of `Category:Needs review` / `Category:Stale` / `Category:Draft` listings (no Phase-4 MD revision needed; CategoryTree availability is implicit). Phase 5 (Mode page-type) MUST verify the four LOAD extensions remain active before authoring Mode templates (verification probe: `Special:Version` lists the four extensions). Any DEFER extension that Phase 5+ wants to LOAD: amend this finding's resolution + LocalSettings.php + a new dated entry under D2 Amendments if the activation-surface contract changes.

**Pattern recognition (for post-arc retrospective).** This is the third Phase-2 finding caught at deploy time (F2 install.php, F4 composer platform-req, now F6 bundled-extension activation). The Phase 2 drafter-subagent verification missed all three. Future drafter-subagent prompts should explicitly include: (a) cross-image platform-req mismatches when composer steps appear, (b) cross-MW-version PF URL behavior changes, (c) bundled-vs-loaded extension audit against the phase's smoke-test wikitext content. Memory entry candidate: `reference_mw_bundled_extensions_loading_pattern.md` (orchestrator to author at Phase 2 boundary capture; not auto-written during execution).

F6 closed.

---

## Severity legend

- **CRITICAL** -- would break execution if shipped (e.g., wrong schema, missing config, broken deploy).
- **SUBSTANTIVE** -- would ship buggy behavior or violate a locked decision (e.g., gate-level mis-assignment, missing Track C discipline in a template).
- **ADVISORY** -- style / consistency; non-blocking (e.g., inconsistent section names, minor doc drift).

---

## How findings accrue

Per `phase-template.md` verification-sub-agent dispatch (drafter spawns a sub-agent after drafting a phase MD), the sub-agent reports findings in CRITICAL / SUBSTANTIVE / ADVISORY tiers. The drafter applies findings; if a finding contradicts `decisions.md`, decisions wins and the finding is rejected with a one-line rationale in the phase MD's Open Questions section.

If a finding has implications for OTHER phases (not just the one being drafted), append it here with cross-phase pointers so subsequent phase drafters consult it.

---

## How findings link to decisions

When a finding resolves via a `decisions.md` entry (D1-D26), the "Resolved by" column references the decision number. When a finding requires a NEW cross-cutting commitment, the resolution is "amend decisions.md (DXX)" -- which means a dated amendment block is added under the relevant decision, and the F-finding is closed.

A finding that's resolved by a phase-internal change (not cross-cutting) has "Resolved by" = the phase MD that absorbs it. These do not require a decisions amendment.
