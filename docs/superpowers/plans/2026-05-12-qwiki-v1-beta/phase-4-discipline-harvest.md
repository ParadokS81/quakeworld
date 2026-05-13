# Phase 4 -- discipline + harvest verification

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (table at bottom of that file).
> 3. Read prior approved phase MDs (Phase 1, Phase 2, Phase 3) -- their "Outputs to next phase" sections name what state this phase inherits.
> 4. After drafting, dispatch the verification sub-agent (brief at bottom of this template).

## Goal

Close out the substrate layer of the qwiki-v1-beta arc with three small but load-bearing deliverables:

1. **Quality-tag categories per D18.** Create the three MW categories `Category:Needs review`, `Category:Stale`, `Category:Draft` as actual pages on the wiki with descriptions of their trigger + curator action. The auto-categorization mechanism (page-type templates emit `[[Category:Needs review]]` on save) is documented in the category page bodies + carried forward to Phase 5 (the first page-type template that wires it is the Mode template).
2. **URL slug authoring rule per D6.** Author a `Help:URL slug discipline` documentation page that names the rule: for pages kept from the old wiki (per-domain migration extracts), use the same URL slug; for new-build pages, choose a slug per the page-type form's convention. v1 baseline ships the rule + the doc page; form-validation hooks land in Phase 5 alongside the Mode page-type form.
3. **Layer 3 harvest path observable end-to-end.** Author a small test page on the wiki (`Phase 4 harvest probe` in main namespace) with a single self-contained section worth harvesting. Distill the section into a Layer 3 concept-note at `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md` matching the corpus README + OPERATIONS conventions. Run the load-concepts pipeline (`bun apps/qw-oracle/scripts/load-concepts/index.ts`) to ingest. Query the live oracle MCP `search_concepts` tool at `https://oracle.slipgate.me/mcp` with a phrase from the section + confirm the harvested chunk returns. Closes Pass 6 6.3 substrate item 3 (the vertical-slice observability loop) for the substrate.

This phase does NOT ship the Mode page-type form, the Modes Layer B category page, the Modes curator tool, the form-validation hook for slug discipline, or any Modes content. Those are Phases 5-8 (the vertical Modes mini-arc).

**Runnable state at phase boundary:** visiting `https://wiki-beta.quake.world/index.php?title=Special:Categories` lists `Needs review`, `Stale`, and `Draft` as category pages; clicking each shows the description + trigger + curator-action wikitext from `apps/qwiki-sandbox/deploy/seed-pages/`; visiting `https://wiki-beta.quake.world/wiki/Help:URL_slug_discipline` renders the slug-discipline doc; visiting `https://wiki-beta.quake.world/wiki/Phase_4_harvest_probe` renders the test page with its self-contained section; the file `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md` exists in the repo and is committed; the load-concepts CLI run shows the new concept-note ingested without warnings; an oracle MCP `search_concepts` query for the test phrase returns the harvested chunk with non-zero `match_quality`. Three Docker containers (`qwiki-nginx`, `qwiki-mediawiki`, `qwiki-mariadb`) all `Up`; mariadb `(healthy)`.

## Inputs from previous phase

Phase 3 complete:

- Three-container Docker stack on Unraid (`qwiki-nginx`, `qwiki-mediawiki`, `qwiki-mariadb`) live at `https://wiki-beta.quake.world` via Cloudflare Tunnel. Citizen v3.16.0 skin loaded.
- Page Forms (REL1_43 branch HEAD) + Semantic MediaWiki 6.0.x installed. `enableSemantics()` active. `Form:TestForm`, `Template:Test`, `TestPage` are Phase 2 smoke-test breadcrumbs (kept; deletable at operator discretion).
- PluggableAuth (REL1_43 v7.5.0+) + OpenIDConnect (REL1_43 v8.3.0+) installed. Discord OAuth wired via manual `providerConfig` endpoints + `openid identify guilds.members.read` scopes. `jumbojett/openid-connect-php 1.0.2` Composer dep in `vendor/`.
- Two MW groups defined: `wiki-contributor` (auto-assigned via Discord `@wiki-beta` role on every login through the inline `qwikiBetaSyncDiscordRole()` helper hooked into `LocalUserCreated` + `UserLoggedIn`) and `wiki-curator` (manually assigned via `Special:UserRights`).
- Custom right `edit-curator-namespace` granted to `wiki-curator`; paired with `$wgNamespaceProtection` to gate edits to NS_TEMPLATE (10), NS_TEMPLATE_TALK (11), NS_CATEGORY (14), NS_CATEGORY_TALK (15), NS_FORM (106), NS_FORM_TALK (107). Main / Talk / File / User remain `wiki-contributor`-editable. `MediaWiki:` is sysop-only.
- The operator's MW user account exists and is in `wiki-contributor` AND `wiki-curator` (operator was promoted to `wiki-curator` during Phase 3 V_AUTH5). A second test user is also in `wiki-curator`.
- `apps/qwiki-sandbox/deploy/` carries committed `docker-compose.prod.yml`, `nginx.conf`, `LocalSettings.php`, `composer.local.json`, `.env.prod.example`, `README.md`, `test-form/Form-TestForm.wikitext`, `test-form/Template-Test.wikitext`.
- F1 (MW 1.39 lifecycle) closed.

Operator-side prerequisites for Phase 4 (no new infrastructure prerequisites beyond Phase 3):

- Tailscale up; `ssh unraid 'echo ok'` returns `ok`.
- Operator is logged into the wiki as the Discord-OAuth-provisioned user. `wiki-curator` rights are required for Task 7's Category page creation (NS_CATEGORY is in D5's curator-only list); the Help page (Task 3) and the main-namespace harvest probe page (Task 7) work with `wiki-contributor` rights alone since Help + Main namespaces are not restricted by D5. Phase 3 V_AUTH5 promotes the operator to `wiki-curator`; if that promotion was skipped, do it now via `Special:UserRights` as `Admin`.
- Operator has Claude Desktop or Claude Code wired to the oracle MCP server at `https://oracle.slipgate.me/mcp` (per qw-oracle Arc 1 prereq; transitively true if operator has been using oracle MCP queries during recent work). If not wired, the deploy README's Phase 4 section notes the one-time MCP config step.
- The local WSL operator shell can run `bun apps/qw-oracle/scripts/load-concepts/index.ts` against the live `qw_oracle` Postgres (validated by any recent Layer 1/Layer 3 work). The Bun runtime + `apps/qw-oracle/.env` with `DATABASE_URL` are pre-existing per qw-oracle's own setup; Phase 4 does not provision them.

## Files touched

### Created

```
apps/qwiki-sandbox/deploy/seed-pages/                                   # new directory; wikitext breadcrumbs for committed page bodies
apps/qwiki-sandbox/deploy/seed-pages/Category-Needs_review.wikitext     # body for Category:Needs review
apps/qwiki-sandbox/deploy/seed-pages/Category-Stale.wikitext            # body for Category:Stale
apps/qwiki-sandbox/deploy/seed-pages/Category-Draft.wikitext            # body for Category:Draft
apps/qwiki-sandbox/deploy/seed-pages/Help-URL_slug_discipline.wikitext  # body for Help:URL slug discipline
apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext     # body for the main-namespace harvest probe test page
apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md        # Layer 3 concept-note distilled from the harvest probe wiki section
```

On the running wiki (operator-created at phase-boundary deploy, not in git, not on Unraid filesystem):

```
Category:Needs review          -- created in NS_CATEGORY by pasting seed-pages/Category-Needs_review.wikitext (wiki-curator-only namespace; operator has rights)
Category:Stale                 -- created in NS_CATEGORY by pasting seed-pages/Category-Stale.wikitext
Category:Draft                 -- created in NS_CATEGORY by pasting seed-pages/Category-Draft.wikitext
Help:URL slug discipline       -- created in NS_HELP by pasting seed-pages/Help-URL_slug_discipline.wikitext
Phase 4 harvest probe          -- created in main NS by pasting seed-pages/Phase_4_harvest_probe.wikitext
```

### Modified

```
apps/qwiki-sandbox/deploy/README.md                       # add Phase 4 deploy section (paste-seed-pages walkthrough + load-concepts run + MCP query check)
apps/qwiki-sandbox/OVERVIEW.md                            # Phase 4 state note (categories + slug doc + harvest path verified)
apps/qw-oracle/curated/concept-notes/README.md            # add test-qwiki-harvest-probe to the Current notes table
```

### Deleted

n/a -- no files removed in this phase.

## Tasks

### Task 1 -- Author seed-pages wikitext for the three quality-tag categories

**Goal.** Ship the bodies of `Category:Needs review`, `Category:Stale`, `Category:Draft` as committed wikitext files under `apps/qwiki-sandbox/deploy/seed-pages/`. The committed files are the source of truth; the operator pastes them into the wiki UI during Task 7 deploy. Each body describes the trigger + curator action per D18 + Pass 5 5.3b's quality-tag table; the `Needs review` body additionally documents that auto-categorization fires via page-type template includes (Phase 5+ wires the first template; Phase 4 documents the mechanism).

**Files.** `apps/qwiki-sandbox/deploy/seed-pages/Category-Needs_review.wikitext`, `Category-Stale.wikitext`, `Category-Draft.wikitext`.

**Execution mode.** `inline` -- pure wikitext; full content shipped (D22 / D26).

**Steps.**

- [ ] Create directory `apps/qwiki-sandbox/deploy/seed-pages/`.
- [ ] Write `apps/qwiki-sandbox/deploy/seed-pages/Category-Needs_review.wikitext` with the content block below.
- [ ] Write `apps/qwiki-sandbox/deploy/seed-pages/Category-Stale.wikitext` with the content block below.
- [ ] Write `apps/qwiki-sandbox/deploy/seed-pages/Category-Draft.wikitext` with the content block below.

Full file content to write -- `Category-Needs_review.wikitext`:

```wikitext
This category contains pages flagged for curator content review per arc qwiki-v1-beta decision D18.

== Trigger ==

Auto-added to a page on save via the page-type template's <code><nowiki>[[Category:Needs review]]</nowiki></code> include. Phase 5's Mode template is the first page-type template that wires this; subsequent per-domain page-types follow the same pattern. Until a page-type template covers a given page, contributors may add the tag manually for explicit curator review.

== Curator action ==

Read the page, polish prose, verify cross-refs to Layer 1 entities and to other wiki pages, then remove the category. For pages tagged via template include, removal happens when the underlying template is changed or when the curator overrides the include locally; for ad-hoc tags, the curator edits the page wikitext directly.

== Related ==

* [[:Category:Stale]] -- pages flagged for currency review.
* [[:Category:Draft]] -- pages flagged "not ready for review" by the author.
* [[Help:URL slug discipline]] -- related curator authoring rule.
```

Full file content to write -- `Category-Stale.wikitext`:

```wikitext
This category contains pages flagged for currency review per arc qwiki-v1-beta decision D18.

== Trigger ==

Explicit author or curator tag added when a page's content has aged beyond confidence. Add <code><nowiki>[[Category:Stale]]</nowiki></code> to a page wikitext (or template) when install walkthroughs reference removed cvars, when distribution versions are outdated, when mode rules have shifted, or when any other content-currency drift is suspected.

== Curator action ==

Currency-review the content against current sources (Layer 1 head-of-tree, current upstream releases, current ruleset state). Update facts in place, escalate to the original author for rework, or merge into a successor page. Remove the category once the page is current.

== Related ==

* [[:Category:Needs review]] -- pages flagged for content review (different curator activity).
* [[:Category:Draft]] -- pages flagged "not ready for review" by the author.
```

Full file content to write -- `Category-Draft.wikitext`:

```wikitext
This category contains pages flagged "not ready for review" per arc qwiki-v1-beta decision D18.

== Trigger ==

Explicit author flag added when a page is actively being drafted and is not yet ready for curator review. Add <code><nowiki>[[Category:Draft]]</nowiki></code> to a page being worked on; remove it when the page is ready.

== Curator action ==

Skip pages in this category. Curator review starts after the author removes the Draft tag (at which point the page typically picks up [[:Category:Needs review]] from the page-type template if not already present).

== Related ==

* [[:Category:Needs review]] -- pages flagged for content review.
* [[:Category:Stale]] -- pages flagged for currency review.
```

**Verification.** `ls apps/qwiki-sandbox/deploy/seed-pages/Category-*.wikitext | wc -l` returns `3`. `grep -c "Category:Needs review\|Category:Stale\|Category:Draft\|D18" apps/qwiki-sandbox/deploy/seed-pages/Category-Needs_review.wikitext apps/qwiki-sandbox/deploy/seed-pages/Category-Stale.wikitext apps/qwiki-sandbox/deploy/seed-pages/Category-Draft.wikitext | awk -F: '{s+=$2} END {print s}'` returns >= 6 (each file mentions at least its own category name + D18).

### Task 2 -- Author seed-pages/Help-URL_slug_discipline.wikitext

**Goal.** Ship the body of `Help:URL slug discipline` as a committed wikitext file. The page documents the D6 + Pass 4 4.6 authoring rule for v1 baseline; the form-validation hook that enforces it lives in Phase 5 alongside the Mode page-type form.

**Files.** `apps/qwiki-sandbox/deploy/seed-pages/Help-URL_slug_discipline.wikitext`.

**Execution mode.** `inline` -- pure wikitext; full content shipped (D22 / D26).

**Steps.**

- [ ] Write `apps/qwiki-sandbox/deploy/seed-pages/Help-URL_slug_discipline.wikitext` with the content block below.

Full file content to write:

```wikitext
This page documents the URL slug authoring rule for QWiki v1 beta. The rule preserves external references (KTX source comments, forum links, archived Discord and ezquake.com cross-references) across the eventual cutover from <code>wiki-beta.quake.world</code> to the canonical wiki URL.

== The rule ==

For pages '''kept from the old wiki''' (extracted via per-domain migration arcs), use '''the same URL slug as the old wiki page'''. The title casing and word order should match the legacy URL even when MediaWiki's automatic capitalization would prefer otherwise.

For '''new-build pages''' (content authored fresh in v1), choose a new slug that follows the page-type form's convention (documented per page-type form during the per-domain mini-arc that ships the form).

== Why ==

KTX source code references wiki URLs directly. ezquake.com/docs cross-references, forum threads, and Discord archives also cite wiki slugs. Preserving the legacy slug means those external references continue to resolve after the v1-beta -> canonical-URL cutover (a future arc, not part of qwiki-v1-beta).

== Enforcement ==

''Phase 4 of arc qwiki-v1-beta ships the rule as authoring discipline only.'' Page-type forms ship in Phase 5 onward and will add slug-validation hooks that warn or block on deviation from the legacy slug when an "extract from old wiki" disposition is selected. v1 beta until then relies on contributor + curator awareness; no automated enforcement at the form layer yet.

== Examples ==

* '''Keep''' (extracted from old wiki, slug = old-wiki slug): a page kept from the old wiki at <code>/wiki/Mid_Air</code> stays at <code>/wiki/Mid_Air</code> on the new wiki.
* '''New-build''' (slug per page-type convention): a newly-authored Mode page picks its slug from the Mode form's recommendation; subsequent per-domain forms document their own slug conventions.

== Related ==

* [[:Category:Needs review]] -- quality-tag for pages awaiting curator content review.
* [[:Category:Stale]] -- quality-tag for pages awaiting currency review.
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/seed-pages/Help-URL_slug_discipline.wikitext && echo OK` returns `OK`. `grep -c "URL slug\|D6\|wiki-beta\|legacy slug" apps/qwiki-sandbox/deploy/seed-pages/Help-URL_slug_discipline.wikitext` returns >= 3.

### Task 3 -- Author seed-pages/Phase_4_harvest_probe.wikitext

**Goal.** Ship the body of the main-namespace harvest probe test page. Per recon item (c), the section content is a tiny self-contained glossary-style entry on "spectator mode" -- a real QW concept that isn't part of the 27 KTX modes in Phase 5-8 scope, so it does not collide with future authoring. The page also carries a preamble naming itself as the Phase 4 harvest-probe artifact, and a note pointing at the harvested concept-note slug.

**Files.** `apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext`.

**Execution mode.** `inline` -- pure wikitext; full content shipped (D22 / D26).

**Steps.**

- [ ] Write `apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext` with the content block below.

Full file content to write:

```wikitext
This is the Phase 4 harvest-probe test page for arc qwiki-v1-beta. It exists to verify the Layer 3 harvest path end-to-end: a wiki section is distilled into a concept-note under <code>apps/qw-oracle/curated/concept-notes/</code>, ingested via the <code>load-concepts</code> pipeline, and made retrievable through the oracle MCP <code>search_concepts</code> tool. The page can be deleted after the phase ships; the harvested concept-note remains as a breadcrumb proving the path works.

== Spectator mode ==

In QuakeWorld, ''spectator mode'' is a non-player connection state in which a client joins a server as an observer rather than a combatant. A spectator can follow a specific player's view via the <code>track</code> command or roam the level freely with a freelook camera. Server admins enable or disable spectator slots per ruleset; some competitive matches admit spectators only after the game has started, while practice servers default to open spectator access.

== Notes ==

The harvested concept-note for this section lives at <code>apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md</code>. After Phase 4 ships, this wiki page may be deleted at curator discretion; the concept-note remains as the Layer 3 record. If a fuller spectator-mode page is authored under a future Game Content domain mini-arc, both this stub and the concept-note can be superseded by the production content.
```

**Verification.** `test -f apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext && echo OK` returns `OK`. `grep -c "Spectator mode\|harvest probe\|harvest path" apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext` returns >= 3.

### Task 4 -- Update apps/qwiki-sandbox/deploy/README.md with Phase 4 deploy section

**Goal.** Append a Phase 4 install section to the deploy README. The section walks the operator through (a) pasting the five seed-page bodies into the wiki UI via `Special:CreatePage` (or direct title navigation + Create), (b) running the load-concepts pipeline against the new concept-note, (c) querying the oracle MCP `search_concepts` tool to verify retrieval. The image-bump procedure is unchanged in Phase 4 (no extension installs, no Composer changes); only the per-deploy seed-page paste step is new and one-shot.

**Files.** `apps/qwiki-sandbox/deploy/README.md`.

**Execution mode.** `inline` -- ship the FULL appended section content (D22 / D26). The executor `Read`s the existing Phase 3-state README, locates the end of the Phase 3 section, and appends the Phase 4 section block below verbatim.

**Steps.**

- [ ] Read `apps/qwiki-sandbox/deploy/README.md` to locate the end of the existing Phase 3 install section (typically a divider line or the start of the Troubleshooting block).
- [ ] Append the content block below immediately before the Troubleshooting section (or at the file end if no Troubleshooting block exists yet).

Content block to append:

```markdown
## Phase 4: quality-tag categories + URL slug doc + Layer 3 harvest-path verification

Phase 4 ships three small deliverables: the three quality-tag categories (`Needs review` / `Stale` / `Draft` per D18), the URL slug authoring rule documentation page (per D6), and an end-to-end verification of the Layer 3 harvest path (per Pass 6 6.3 substrate item 3). No new extensions or Composer changes; the deploy is paste-five-seed-pages + run-the-harvest-probe.

Prerequisite: operator is logged into `https://wiki-beta.quake.world` as the Discord-OAuth-provisioned user with `wiki-curator` rights (so `Category:*` pages can be created -- D5 namespace gate). Phase 3 V_AUTH5 promotes the operator's user; if that step was skipped, run it now via `Special:UserRights` as `Admin`.

### Step 1: scp the seed-pages directory to Unraid (optional convenience)

The seed-page bodies are committed under `apps/qwiki-sandbox/deploy/seed-pages/`; they don't need to live on Unraid (they're not consumed by any container), but the operator may scp them for grep/diff convenience:

```bash
scp -r apps/qwiki-sandbox/deploy/seed-pages \
  unraid:/mnt/user/appdata/qwiki-beta/
```

### Step 2: create the three Category pages via the wiki UI

For each of `Needs review`, `Stale`, `Draft`:

1. In the browser (logged in as the operator's wiki-curator user), visit `https://wiki-beta.quake.world/index.php?title=Category:<Name>&action=edit` (substituting the category name; spaces in URLs become underscores).
2. Paste the body verbatim from `apps/qwiki-sandbox/deploy/seed-pages/Category-<Name>.wikitext` (replacing space with underscore in the filename).
3. Save with edit summary `Phase 4: create quality-tag category per D18`.

After all three: visit `https://wiki-beta.quake.world/index.php?title=Special:Categories`. Confirm all three categories are listed (they appear once they have a body, even if no member pages reference them yet -- MW shows non-empty category pages in `Special:Categories`).

### Step 3: create the Help:URL slug discipline page

1. Visit `https://wiki-beta.quake.world/index.php?title=Help:URL_slug_discipline&action=edit`.
2. Paste the body from `apps/qwiki-sandbox/deploy/seed-pages/Help-URL_slug_discipline.wikitext`.
3. Save with edit summary `Phase 4: URL slug discipline doc per D6`.

Confirm: visiting `https://wiki-beta.quake.world/wiki/Help:URL_slug_discipline` renders the page.

### Step 4: create the harvest probe test page

1. Visit `https://wiki-beta.quake.world/index.php?title=Phase_4_harvest_probe&action=edit`.
2. Paste the body from `apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext`.
3. Save with edit summary `Phase 4: harvest probe test page`.

Confirm: visiting `https://wiki-beta.quake.world/wiki/Phase_4_harvest_probe` renders the page with the `== Spectator mode ==` section visible.

### Step 5: smoke probe auto-categorization mechanism

Phase 4 does not wire auto-categorization globally -- that's a page-type-template concern starting Phase 5. To confirm the underlying mechanism works:

1. In the browser, edit `https://wiki-beta.quake.world/wiki/Phase_4_harvest_probe`.
2. Add `[[Category:Needs review]]` at the bottom of the wikitext. Save.
3. Visit `https://wiki-beta.quake.world/index.php?title=Category:Needs_review`. Confirm: `Phase 4 harvest probe` appears in the category's member list.
4. (Optional) Edit the page again, remove the category tag, save. Confirm: the page disappears from the category listing on the next visit.

This proves the MW category mechanism works against the seed pages. Phase 5's Mode template will exercise the same mechanism via template-include.

### Step 6: run the load-concepts pipeline against the new concept-note

The harvested concept-note file `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md` is committed in the repo at Phase 4 boundary (authored by the Phase 4 executor's subagent during Task 8). From the operator's WSL terminal in the project root:

```bash
cd apps/qw-oracle
bun scripts/load-concepts/index.ts
```

Expected output: a summary line indicating the new note ingested without warnings; the existing 9 notes either re-ingested or hash-skipped (most should hash-skip since unchanged). No `WARN` lines mentioning `test-qwiki-harvest-probe`. Exit code 0.

### Step 7: query oracle MCP search_concepts to verify retrieval

The oracle MCP server is at `https://oracle.slipgate.me/mcp`. In the operator's Claude Desktop or Claude Code session with the oracle MCP wired:

1. Issue a `search_concepts` query for a phrase that should match the harvested chunk -- e.g. "spectator mode joining server as observer".
2. Confirm: at least one result returned with `slug: test-qwiki-harvest-probe` and a non-zero `match_quality` (typically `strong` or `moderate` depending on RRF calibration).

If the MCP query interface isn't directly callable from the operator's tooling, the alternative is a `psql` probe against the `qw_oracle` DB:

```bash
cd apps/qw-oracle
PSQL_CMD='SELECT slug FROM concepts WHERE slug = '\''test-qwiki-harvest-probe'\'';'
echo "$PSQL_CMD" | bun run db:psql
```

(Substitute the actual psql shim from your repo if `db:psql` isn't the name; the live oracle CLAUDE.md names the canonical command.)

### Step 8: commit + push the Phase 4 artifacts

```bash
git add apps/qwiki-sandbox/deploy/seed-pages/ \
        apps/qwiki-sandbox/deploy/README.md \
        apps/qwiki-sandbox/OVERVIEW.md \
        apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md \
        apps/qw-oracle/curated/concept-notes/README.md \
        docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-4-discipline-harvest.md
git commit -m "phase 4: quality-tag categories + URL slug doc + L3 harvest verification (arc qwiki-v1-beta)"
git push origin main
```

(`docs/superpowers/plans/.../phase-4-discipline-harvest.md` is included if the phase MD itself was just-approved + committed in the same window; if the MD landed in an earlier commit, omit from the add list.)

### Troubleshooting -- Phase 4 specific

**Category page edit blocked with "you do not have permission to edit this page".** The operator's wiki user isn't in `wiki-curator`. Promote via `Special:UserRights` as `Admin` (Phase 1 sysop). The Discord-role-sync helper from Phase 3 only manages `wiki-contributor`; `wiki-curator` is manual.

**load-concepts run errors with "no concept-note file found".** Verify the file lives at `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md` (the CLI scans that directory only). Verify the frontmatter is parseable YAML (`gray-matter` is strict on indentation + colon spacing).

**load-concepts run errors with `JSONB string scalar` warning or DB constraint.** The `qw_oracle` schema has the `F1.jsonb_columns_not_strings` regression gate. If the note's frontmatter accidentally has a stringified JSON value in a JSONB column, the loader rejects it. Re-run the Task 8 authoring with the canonical YAML shape from `apps/qw-oracle/curated/concept-notes/README.md`.

**MCP search_concepts returns 0 results.** Verify the chunk was embedded -- `bun scripts/load-concepts/index.ts` should also dispatch `embed-chunks.ts` per the loader's index.ts. If embeddings didn't fire (e.g., Voyage API key absent from `.env`), the search falls back to lexical-only. Re-run after ensuring `VOYAGE_API_KEY` is set in `apps/qw-oracle/.env` (operator's existing oracle env should have it from Layer 3 work).

**MCP search_concepts returns the wrong slug.** The RRF score may rank a sibling concept-note higher for an ambiguous query. Try a more distinctive phrase from the harvested chunk; the `Phase 4 harvest probe` source page deliberately includes the word "harvest probe" in the prose for this reason.

**Phase 4 harvest probe wiki page disappears from Category:Needs review.** The tag was removed (deliberately or by edit) -- not a failure. The auto-categorization mechanism doesn't fire here because Phase 4 doesn't ship a page-type template; the smoke test in Step 5 is one-shot.

---
```

**Verification.** `grep -c "## Phase 4: quality-tag categories" apps/qwiki-sandbox/deploy/README.md` returns `1`. `grep -c "Special:Categories\|load-concepts\|search_concepts" apps/qwiki-sandbox/deploy/README.md` returns >= 4 (the section mentions each substring at least once).

### Task 5 -- Update apps/qwiki-sandbox/OVERVIEW.md with Phase 4 state

**Goal.** Update the "Substrate state" + "Current arc" sections of OVERVIEW.md to reflect Phase 4 shipping. The change is additive: the Phase 3-state paragraph is extended to mention quality-tag categories + URL slug doc + harvest path verification.

**Files.** `apps/qwiki-sandbox/OVERVIEW.md`.

**Execution mode.** `inline` -- ship the updated paragraph in place (D22 / D26).

**Steps.**

- [ ] Read `apps/qwiki-sandbox/OVERVIEW.md` to locate the "Substrate state" section and the paragraph beginning "After Phase 3 ships:".
- [ ] Replace that paragraph with the content block below (preserving surrounding section headers + sibling paragraphs).

Content block to write:

```markdown
After Phase 4 ships: the substrate from Phase 3 (three-container nginx + mediawiki:1.43-fpm + mariadb:11.4 stack on Unraid + Citizen v3.16.0 + Page Forms + Semantic MediaWiki 6.0.x + PluggableAuth + OpenIDConnect + Discord OAuth + `wiki-contributor` / `wiki-curator` groups + namespace edit restrictions per D5) PLUS three additional small surfaces: three quality-tag categories (`Category:Needs review` / `Category:Stale` / `Category:Draft` per D18) with descriptions on each page documenting their trigger + curator action, a `Help:URL slug discipline` page documenting the D6 authoring rule for cutover URL preservation, and an end-to-end verification that the Layer 3 harvest path works (a wiki section authored at `Phase 4 harvest probe` was distilled to a concept-note at `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md`, ingested via the load-concepts pipeline, and confirmed retrievable through the oracle MCP `search_concepts` tool at `https://oracle.slipgate.me/mcp`). Auto-categorization on save lands in Phase 5 via page-type templates that include `[[Category:Needs review]]`; the slug-validation form hook also lands in Phase 5 alongside the Mode form. v1 beta substrate is complete; the vertical Modes mini-arc (Phases 5-8) is unblocked.
```

**Verification.** `grep -c 'After Phase 4 ships:' apps/qwiki-sandbox/OVERVIEW.md` returns `1`. `grep -c 'After Phase 3 ships:' apps/qwiki-sandbox/OVERVIEW.md` returns `0` (the prior phrasing is gone). `grep -c 'quality-tag categor\|URL slug discipline\|harvest probe\|search_concepts' apps/qwiki-sandbox/OVERVIEW.md` returns >= 3.

### Task 6 -- Update apps/qw-oracle/curated/concept-notes/README.md Current notes table

**Goal.** Add `test-qwiki-harvest-probe` as a new row in the Current notes table. Row values mirror the existing 9 rows' shape (slug / title / topic / status). The note is explicitly labeled as a harvest-probe breadcrumb so future readers understand its provenance.

**Files.** `apps/qw-oracle/curated/concept-notes/README.md`.

**Execution mode.** `inline` -- single-row table edit; full table context preserved (D22 / D26).

**Steps.**

- [ ] Read the Current notes table block in `apps/qw-oracle/curated/concept-notes/README.md` (the table sits under the "## Current notes" heading).
- [ ] Append the row below as the LAST row of that table (after `player-skins`).

Row to append:

```markdown
| `test-qwiki-harvest-probe` | Spectator mode harvest-probe breadcrumb (arc qwiki-v1-beta Phase 4) | domain-guide | draft |
```

**Verification.** `grep -c "test-qwiki-harvest-probe" apps/qw-oracle/curated/concept-notes/README.md` returns >= 1. `grep -c "qwiki-v1-beta Phase 4" apps/qw-oracle/curated/concept-notes/README.md` returns >= 1.

### Task 7 -- Operator deploy: paste the five seed pages into the wiki UI

**Goal.** Execute Steps 2-5 of the Phase 4 install section in `deploy/README.md` against the live wiki. The operator types in the wiki UI (paste + save) and observes the smoke probe in Step 5; no code synthesis.

**Files.** None in repo. Wiki-side state changes only.

**Execution mode.** `inline` -- this is an operator-driven deploy. The commands are documented in the just-edited `deploy/README.md`. The executor's role is to walk the operator through, capture screenshots / outputs if useful, and verify each page renders. No subagent dispatch (D22 / D26).

**Steps.**

- [ ] Confirm Phase 4 seed-pages are committed (Task 1-3 outputs + Task 4 README edit). Verify with `git status apps/qwiki-sandbox/deploy/seed-pages/ apps/qwiki-sandbox/deploy/README.md` -- expect "nothing to commit" on those paths if the Phase 4 commit already landed, OR a clean diff if commits are batched at phase end.
- [ ] Follow `apps/qwiki-sandbox/deploy/README.md` "Phase 4: quality-tag categories + URL slug doc + Layer 3 harvest-path verification" Steps 2-5 in order.
- [ ] Confirm each of the three Category pages, the Help page, and the harvest probe page renders cleanly + their text matches the seed-pages file content.
- [ ] Run the auto-categorization smoke probe (Step 5): tag `Phase 4 harvest probe` with `[[Category:Needs review]]`, confirm it appears in `Category:Needs review`, then remove the tag and confirm it disappears.

**Verification.** Phase-boundary verification probes V_CAT1 / V_DOC1 / V_HARVEST1 (next section) gate this task. See "Verification (phase boundary)" below.

### Task 8 -- Author apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md

**Goal.** Distill the `== Spectator mode ==` section from the wiki harvest probe page into a Layer 3 concept-note .md file that conforms to the `apps/qw-oracle/curated/concept-notes/README.md` schema (frontmatter + body sections). The .md file is the committed artifact that the load-concepts pipeline ingests in Task 9; the wiki section is the source.

The note's shape is a "Short how-to" or "Domain walkthrough" depending on how the distillation reads -- per the README shape catalog, the precise mapping is the subagent's judgment call. Voice + length per the corpus README's tier table. Body must include Summary + at least one drill-down section + Consumer implications + References. References cites the wiki source URL + the qwiki-v1-beta arc + the harvest-probe role.

Frontmatter must match the README schema exactly: `title`, `slug` (= `test-qwiki-harvest-probe`), `topic: domain-guide`, `status: draft`, `authored_by: qw-oracle`, `upstream_status: authored`, `primary_contributors: ["@ParadokS"]`, `related_entities: []`, `related_messages: []`, `last_updated: 2026-05-13`. Omit `source_url`, `imported_from`, `last_imported_at`, `upstream_target` (per the README's "omit when upstream_status is authored" rule).

The note is intentionally a small-scope breadcrumb -- not a polished domain-guide. Its Layer 3 value is "the harvest path works"; its content value is bounded. The body should not exceed ~40 lines; Short how-to or compact Domain walkthrough is the right shape.

**Files.** `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md`.

**Execution mode.** `subagent (Sonnet medium)` -- Layer 3 distillation is judgment work: section atomicity per Track C discipline 1 (4.4), frontmatter compliance against the corpus README, shape selection from the catalog, voice + length per the tier table. Sonnet medium fits per `feedback_model_effort_range.md` (reasoning floor for Layer 3 authoring tasks). Single-file output; no multi-file synthesis required.

**Subagent dispatch brief.**

```
You are authoring a Layer 3 concept-note for the QW Oracle corpus.

Context: arc qwiki-v1-beta Phase 4 (the substrate-closing phase before the Modes mini-arc).
The wiki page `Phase 4 harvest probe` at https://wiki-beta.quake.world contains a section
`== Spectator mode ==` (source wikitext at apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext).
Distill that section into a concept-note at apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md.

Required reading before authoring:
- apps/qw-oracle/curated/concept-notes/README.md -- corpus authoring schema + shape catalog + voice tier table
- apps/qw-oracle/curated/concept-notes/OPERATIONS.md -- stewardship playbook (especially Section 2 feeding paths)
- apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext -- the wiki section to distill

Constraints:
- Frontmatter must match the README schema exactly. Required fields: title, slug (= test-qwiki-harvest-probe), topic (= domain-guide), status (= draft), authored_by (= qw-oracle), upstream_status (= authored), primary_contributors (= ["@ParadokS"]), related_entities (= []), related_messages (= []), last_updated (= 2026-05-13). Omit source_url, imported_from, last_imported_at, upstream_target (the README's "omit when upstream_status is authored" rule).
- Body shape: Short how-to or compact Domain walkthrough. Max ~40 lines body content.
- Sections: Summary (2-4 sentences) + one drill-down section (mechanism / behavior) + Consumer implications + References. Optionally a "Related concept notes" section with "n/a (probe artifact)".
- The note's framing must acknowledge it's a Phase 4 harvest-probe breadcrumb -- not a polished domain-guide -- without burying the actual content (spectator mode is real, useful information; the harvest-probe nature is metadata, not content). Surface that role in References + (briefly) Summary.
- Output is just the .md file content. Do not run load-concepts; that's a separate task.
- ASCII only (D21). No em-dashes / en-dashes -- use ASCII hyphen-minus. No emoji. Comments-in-code are not applicable to a markdown note.

Return: the full file content as a markdown block. The executor will Write it to the target path.
```

**Steps.**

- [ ] Dispatch the subagent with the brief above.
- [ ] On successful return: write the returned content to `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md`.
- [ ] Sanity-check the written file: frontmatter parses (eyeball YAML); body has Summary + mechanism section + Consumer implications + References; line count is reasonable (~30-50 lines including frontmatter).

**Verification.** `test -f apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md && echo OK` returns `OK`. `head -1 apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md` returns `---`. `python3 -c "import yaml, re, sys; m = re.match(r'^---\n(.*?)\n---', open('apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md').read(), re.DOTALL); fm = yaml.safe_load(m.group(1)); assert fm['slug'] == 'test-qwiki-harvest-probe' and fm['status'] == 'draft' and fm['authored_by'] == 'qw-oracle' and fm['topic'] == 'domain-guide'; print('OK')"` returns `OK` (frontmatter shape conforms).

### Task 9 -- Operator runs load-concepts pipeline + oracle MCP search_concepts query

**Goal.** Execute Steps 6 + 7 of the Phase 4 install section in `deploy/README.md` against the live `qw_oracle` Postgres + the deployed oracle MCP server. Result: the new concept-note is ingested without warnings + the MCP `search_concepts` tool returns the harvested chunk when queried with a representative phrase.

**Files.** None in repo. State changes on the `qw_oracle` Postgres (`concepts` / `concept_chunks` / `concept_entities` / `concept_concepts` rows for slug `test-qwiki-harvest-probe`).

**Execution mode.** `inline` -- operator runs the bun CLI from WSL + queries oracle MCP from their Claude-MCP-wired session. The commands are in `deploy/README.md`. The executor's role is to confirm output cleanliness + interpret MCP response; no subagent dispatch adds value beyond observation (D22 / D26).

**Steps.**

- [ ] Follow `apps/qwiki-sandbox/deploy/README.md` "Step 6: run the load-concepts pipeline" -- run `bun scripts/load-concepts/index.ts` from `apps/qw-oracle/` and capture stdout.
- [ ] Confirm: stdout includes a line referencing `test-qwiki-harvest-probe` (either "ingested" or "loaded"); no `WARN` lines mentioning that slug; exit code 0.
- [ ] Follow `apps/qwiki-sandbox/deploy/README.md` "Step 7: query oracle MCP search_concepts" -- operator queries the live MCP with a representative phrase from the harvested chunk (e.g. "spectator mode joining server as observer", or whichever phrase the Task 8 subagent's distillation made distinctive).
- [ ] Confirm: at least one result returned with `slug: test-qwiki-harvest-probe` and a non-zero `match_quality`. If MCP isn't directly callable from operator's tooling, fall back to the DB probe in Step 7's alternative.

**Verification.** Phase-boundary V_HARVEST2 + V_HARVEST3 (next section) gate this task. See "Verification (phase boundary)" below.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of Phase 4. YES/NO answers per D24.

**V_CAT1. Three quality-tag categories exist with bodies.**

```bash
for c in Needs_review Stale Draft; do
  echo -n "$c: "
  ssh unraid "curl -s -o /dev/null -w '%{http_code}' \
    http://192.168.1.205:8081/index.php?title=Category:$c"
  echo
done
```

Operator-facing confirmation (browser): open `https://wiki-beta.quake.world/index.php?title=Special:Categories`. Confirm `Needs review`, `Stale`, `Draft` are all listed.

- **PASS condition:** each curl prints `200`, AND `Special:Categories` lists all three category names.
- **FAIL condition:** any curl prints `404` (category page absent -- redo Step 2 of the Phase 4 deploy README section); or `Special:Categories` omits a category (check the page body landed without surrounding whitespace breaking the wikitext).

**V_DOC1. Help:URL slug discipline page exists.**

```bash
ssh unraid 'curl -s -o /dev/null -w "%{http_code}\n" \
  http://192.168.1.205:8081/index.php?title=Help:URL_slug_discipline'
```

Operator-facing confirmation (browser): visit `https://wiki-beta.quake.world/wiki/Help:URL_slug_discipline`. Confirm the page renders with the "The rule" + "Why" + "Enforcement" + "Examples" sections per the seed wikitext.

- **PASS condition:** curl prints `200`; browser renders the doc page with at least the "The rule" section visible.
- **FAIL condition:** curl prints `404` (page absent -- redo Step 3 of the Phase 4 deploy README section); or the page renders but is empty (paste landed without the body content).

**V_HARVEST1. Phase 4 harvest probe wiki page exists + auto-categorization mechanism works.**

```bash
ssh unraid 'curl -s -o /dev/null -w "%{http_code}\n" \
  http://192.168.1.205:8081/index.php?title=Phase_4_harvest_probe'
```

Operator-facing confirmation (browser):

1. Visit `https://wiki-beta.quake.world/wiki/Phase_4_harvest_probe`. Confirm the `== Spectator mode ==` section renders.
2. Edit the page; add `[[Category:Needs review]]` at the bottom; save.
3. Visit `https://wiki-beta.quake.world/index.php?title=Category:Needs_review`. Confirm `Phase 4 harvest probe` appears in the member list.
4. Edit the page again; remove the category tag; save. Visit the category page. Confirm `Phase 4 harvest probe` is gone from the member list.

- **PASS condition:** curl prints `200`; the four-step browser sequence completes (page renders, category member shows up after tagging, member disappears after untagging).
- **FAIL condition:** curl prints `404` (page absent); or category membership doesn't update (MW category-link tracking is broken -- likely no schema migration since Phase 1; re-run `maintenance/update.php` from the Phase 1 README).

**V_HARVEST2. Concept-note ingested by load-concepts pipeline.**

```bash
cd apps/qw-oracle
bun scripts/load-concepts/index.ts 2>&1 | tee /tmp/load-concepts-phase4.log
```

Then:

```bash
grep -E "test-qwiki-harvest-probe|WARN|ERROR" /tmp/load-concepts-phase4.log
```

- **PASS condition:** the grep shows at least one line mentioning `test-qwiki-harvest-probe` (the loader's per-file log line); zero `WARN` lines mentioning that slug; zero `ERROR` lines mentioning that slug. CLI exit code 0.
- **FAIL condition:** any `WARN` or `ERROR` line referencing the new slug. Most common: frontmatter shape mismatch (re-check Task 8 output against `apps/qw-oracle/curated/concept-notes/README.md` schema); JSONB-string-scalar regression (check that no frontmatter value was pre-stringified -- the loader's `F1.jsonb_columns_not_strings` probe gates this).

**V_HARVEST3. Oracle MCP search_concepts returns the harvested chunk.**

Operator queries the live oracle MCP server at `https://oracle.slipgate.me/mcp` via their Claude Desktop / Claude Code MCP-wired session:

1. Issue a `search_concepts` query for a distinctive phrase from the harvested chunk -- e.g. "spectator mode joining a quakeworld server as observer". The exact phrase depends on Task 8's distillation; pick one that's lexically distinctive enough not to collide with the 9 existing concept-notes.
2. Confirm: the response contains at least one result with `slug: test-qwiki-harvest-probe` and `match_quality` of `strong` or `moderate` (RRF-calibrated thresholds per API_CONTRACTS.md).

Fallback if MCP isn't directly callable from operator's tooling -- DB probe via the `qw_oracle` Postgres:

```bash
cd apps/qw-oracle
# Assumes the operator's existing shim resolves DATABASE_URL from apps/qw-oracle/.env.
# Substitute the canonical psql invocation from apps/qw-oracle/CLAUDE.md if this shim's name differs.
psql "$(cat apps/qw-oracle/.env | grep ^DATABASE_URL= | cut -d= -f2-)" \
  -c "SELECT slug, last_updated FROM concepts WHERE slug = 'test-qwiki-harvest-probe';"
```

- **PASS condition:** the MCP query returns the slug, OR the psql probe returns one row with the matching slug + a recent `last_updated` timestamp.
- **FAIL condition:** the MCP query returns zero results AND the psql probe returns zero rows (loader didn't insert the row); or psql returns the row but MCP returns zero results (embeddings didn't fire -- check VOYAGE_API_KEY in `apps/qw-oracle/.env` + re-run load-concepts which dispatches `embed-chunks.ts`).

**V_OPS1. All three containers still healthy.**

```bash
ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'
```

- **PASS condition:** `qwiki-nginx`, `qwiki-mediawiki`, `qwiki-mariadb` all `Up`; `qwiki-mariadb` `(healthy)`.
- **FAIL condition:** any container `Restarting` / `Exited`. Phase 4 makes no docker-compose / LocalSettings changes; a failure here is unrelated to Phase 4 work (consult Phase 1 + Phase 2 + Phase 3 recovery sections).

If V_CAT1 + V_DOC1 + V_HARVEST1 + V_HARVEST2 + V_HARVEST3 + V_OPS1 all PASS, the phase is green. v1 beta substrate is complete; the Modes mini-arc (Phase 5 onwards) is unblocked. Phase 3's V_AUTH6 (Discord-role revocation symmetry) carries forward as an optional Phase 5 spot-check if it was skipped at Phase 3 sign-off; Phase 4 does not re-introduce its scope.

## Outputs to next phase

State now true that wasn't before Phase 4:

- Three category pages exist on the wiki: `Category:Needs review`, `Category:Stale`, `Category:Draft`. Each page renders its trigger + curator action + Related links per D18 + Pass 5 5.3b. The pages are visible in `Special:Categories` and accept members via `[[Category:<name>]]` page-side tags.
- A `Help:URL slug discipline` page exists on the wiki, rendering the D6 + Pass 4 4.6 authoring rule (keep-old-slug for extracts; per-page-type-convention for new-build). The rule is authoring-discipline-only at v1; form-validation hooks roll into Phase 5 alongside the Mode form.
- A `Phase 4 harvest probe` page exists on the wiki with a self-contained `== Spectator mode ==` section. The page is a deletable breadcrumb (curator discretion) once Phase 4 ships.
- A Layer 3 concept-note exists at `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md` with frontmatter matching the corpus README schema (slug = `test-qwiki-harvest-probe`, topic = `domain-guide`, status = `draft`, authored_by = `qw-oracle`, upstream_status = `authored`, primary_contributors = [`@ParadokS`], last_updated = `2026-05-13`). The note's body is a Short how-to / compact Domain walkthrough shape on spectator mode.
- The `qw_oracle` Postgres has a row in `concepts` for slug `test-qwiki-harvest-probe` + chunks in `concept_chunks` (embedded via `embed-chunks.ts` during the load-concepts run). Oracle MCP `search_concepts` returns the chunk on a representative query.
- `apps/qwiki-sandbox/deploy/seed-pages/` directory committed with five wikitext breadcrumbs (3 categories + Help page + harvest probe page). Future operator deploys can replay the Phase 4 paste steps from these files.
- `apps/qwiki-sandbox/deploy/README.md` extended with the Phase 4 install section + Troubleshooting additions.
- `apps/qwiki-sandbox/OVERVIEW.md` updated to mark Phase 4 shipped.
- `apps/qw-oracle/curated/concept-notes/README.md` Current notes table updated with the new test-qwiki-harvest-probe row.

Phase 5's inputs match this output set + Phase 5-specific operator prerequisites:

- The three quality-tag categories exist (Phase 5's Mode template includes `[[Category:Needs review]]`; the category MUST exist for the include to land in `Special:Categories`'s member-list automatically).
- The URL slug discipline rule is documented + linkable from the Mode form's help-text (Phase 5 wires the form-validation hook against the rule).
- The Layer 3 harvest path is proven end-to-end (Phase 8's Modes harvest probe replays the same shape against real Mode content).

**Carry forward to Phase 5 (hard prerequisites the Phase 5 drafter must surface in its Inputs section):**

1. **`Category:Needs review` MUST exist before Phase 5's Mode template is authored.** Phase 5's Mode template embeds `[[Category:Needs review]]` as a wikitext literal; MW does not auto-create category pages, so a missing `Category:Needs review` page means template-included tags land in a category with no description (works, but the description body is lost). Phase 4 Task 7 creates the page. If Phase 5 drafting begins before Phase 4 ships, surface this as a blocker.
2. **`Help:URL slug discipline` MUST exist before Phase 5's Mode form ships slug-validation help-text.** Phase 5's Mode form help-text links to `Help:URL slug discipline` at the slug field. A dead link would render as a red-link in the form -- not broken, but visually noisy and confusing for contributors. Phase 4 Task 7 creates the page.
3. **The Phase 4 harvest-probe artifacts (wiki page + concept-note + DB row + chunk embedding) are non-load-bearing for Phase 5.** They prove the path works; Phase 5 + Phase 8 replay the path against real Mode content. Phase 5 may delete `Phase 4 harvest probe` (wiki side) at curator discretion without consulting Phase 4; the concept-note + DB row + embedding stay in the corpus as breadcrumbs.

## Open questions / deferred items

- **Question:** Auto-categorization mechanism. D18 names the rule (`Needs review` auto-added on save) but doesn't pin a specific mechanism. This phase MD documents "via page-type template include" -- meaning Phase 5+ page-type templates emit `[[Category:Needs review]]` in their bodies, so any page using the template inherits the category. The alternative is a `$wgHooks`-based `PageSaveComplete` hook in LocalSettings.php that auto-adds the category to every page-save event. The template-include path is preferred because (a) it scopes auto-categorization to form-driven content (free-form glossary entries opt in by being added to the template), (b) it doesn't require a LocalSettings.php hook (which would tightly couple substrate config to authoring policy), (c) the recon hint (e) in the drafter prompt names it as the typical MW pattern.
  - **Default chosen for now:** template-include via Phase 5's Mode template (first instance) + replicated in subsequent per-domain page-type forms.
  - **Who can resolve:** operator at Phase 5 sign-off. If template-include doesn't fit certain page-types (e.g., article-page is free-form per D9 -- no template), Phase 5 may revisit and add a $wgHooks-based fallback. Not blocking Phase 4.

- **Question:** Should the `Phase 4 harvest probe` wiki page + `test-qwiki-harvest-probe.md` concept-note be deleted at Phase 5 boundary, or kept as a long-lived smoke probe? Keeping them means a real Layer 3 entry on "spectator mode" sits in the corpus indefinitely; that content might be superseded by a future Game Content domain mini-arc (when an authoritative spectator-mode page is authored). The concept-note's frontmatter does NOT mark it as a probe artifact (it's labeled `domain-guide` / `draft`), so any Layer 3 consumer sees it as a normal note.
  - **Default chosen for now:** keep both artifacts post-Phase-4 as breadcrumbs (mirrors the Phase 2 `Form:TestForm` + `Template:Test` + `TestPage` retention pattern). Operator may delete either side at any later phase boundary. Game Content arc may supersede (`status: superseded` + `superseded_by:` per the OPERATIONS lifecycle section).
  - **Who can resolve:** operator at Game Content domain mini-arc kickoff, OR earlier if the test artifacts cause confusion in Layer 3 consumers.

- **Question:** Frontmatter `topic: domain-guide` for the harvest-probe note. Per the corpus README's topic vocabulary, `domain-guide` covers narrative / walkthrough content; the harvest-probe content (a short spectator-mode walkthrough) fits, though loosely. Adding a `harvest-probe` topic value would split the vocabulary speculatively (the OPERATIONS rule says don't); using `domain-guide` is the README-consistent option.
  - **Default chosen for now:** `topic: domain-guide`. Frontmatter still records the probe-role through the title prefix + References section + the `apps/qw-oracle/curated/concept-notes/README.md` table row's title text.
  - **Who can resolve:** n/a -- chosen per the existing vocabulary discipline.

- **Question:** The Phase 4 harvest probe wiki page exists in main namespace, where it's editable by any `wiki-contributor`. A future invitee could edit the section body, which would drift the wiki source away from the concept-note. Phase 4 does NOT lock the page via `protect` (which would require curator action + visibility surface that's overkill for a probe).
  - **Default chosen for now:** leave the page unprotected. Drift between wiki page + concept-note is a corpus-stewardship concern (the load-concepts pipeline is the canonical source for retrieval; the wiki page is the human-readable mirror). If drift becomes noisy, the curator can `protect` the probe page or delete the wiki side entirely (concept-note remains).
  - **Who can resolve:** curator at periodic-batch review (Pass 5 5.3b cadence). Not blocking Phase 4.

- **Question:** The oracle MCP `search_concepts` query in V_HARVEST3 depends on the operator's tooling having MCP wired to `https://oracle.slipgate.me/mcp`. If this isn't true at deploy time, the fallback is a direct `psql` probe against `qw_oracle.concepts` -- which proves ingest landed but not retrieval-via-MCP. The MCP retrieval check is the more complete verification of "the harvest path is observable end-to-end."
  - **Default chosen for now:** prefer MCP query; fall back to psql if MCP not wired. Both branches PASS condition documented.
  - **Who can resolve:** operator. If oracle MCP isn't routinely wired, the deploy README's Phase 4 section can add a one-time MCP-setup pointer; but per the drafter prompt's recon item (b), the operator should have it wired from prior arcs.

- **Question:** D24 requires phase-boundary verification commands to return YES/NO. V_HARVEST3's MCP probe is harder to script into a one-liner (MCP queries are interactive with the MCP-wired Claude session). The fallback psql probe IS scriptable; the MCP probe is more reliant on operator confirmation. This is a known shape-mismatch between D24 + MCP-based verification.
  - **Default chosen for now:** the V_HARVEST3 probe accepts EITHER the MCP query result OR the psql result as evidence. Operator picks whichever is convenient.
  - **Who can resolve:** n/a for this phase. A future arc that builds a CLI wrapper around MCP queries (`curl` to the MCP HTTP endpoint with a JSON body) could close this. Not blocking Phase 4.

## Recovery (if verification fails)

Per-failure-mode recovery; anticipatable failures only. Unanticipated failures route to operator.

- **V_CAT1 fails (Category page returns 404):** the seed wikitext wasn't saved into NS_CATEGORY. Most likely cause: the operator's user isn't in `wiki-curator` group (D5 namespace gate). Verify via `Special:UserGroupRights`; promote via `Special:UserRights` as `Admin` if needed; redo Step 2 of the Phase 4 deploy README section.

- **V_CAT1 fails (Category page exists but is empty):** the body paste landed empty -- typically a copy/paste mishap. Re-edit the page; re-paste from `apps/qwiki-sandbox/deploy/seed-pages/Category-<Name>.wikitext`; save.

- **V_DOC1 fails (Help page returns 404):** the seed wikitext wasn't saved into NS_HELP. Verify the title casing: MW capitalizes the first letter of page titles by default, so `Help:URL slug discipline` and `Help:URL_slug_discipline` resolve to the same page. If the operator created `Help:url slug discipline` (lowercase u) accidentally, MW redirects but the canonical title differs. Redo Step 3 with the exact title.

- **V_HARVEST1 fails (harvest probe page returns 404):** redo Step 4 of the Phase 4 deploy README section. Verify the title exactly matches `Phase 4 harvest probe` (with space, not underscore -- MW normalizes underscores to spaces on read).

- **V_HARVEST1 fails (category membership doesn't update after tag):** MW category-link tracking depends on `categorylinks` table + the `LinksUpdate` job. If a `runJobs.php` drain has been skipped, the membership view may lag. Run from operator's WSL:

  ```bash
  ssh unraid 'docker exec qwiki-mediawiki php /var/www/html/maintenance/runJobs.php'
  ```

  Expect `<N> jobs run, 0 failed`. Then revisit the category page.

- **V_HARVEST2 fails (load-concepts errors on test-qwiki-harvest-probe):** the frontmatter shape is the likely culprit.
  - Verify frontmatter parses: `python3 -c "import yaml, re; m = re.match(r'^---\n(.*?)\n---', open('apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md').read(), re.DOTALL); print(yaml.safe_load(m.group(1)))"`. Should print a dict with `title`, `slug`, etc.
  - Verify the required fields are present (compare against `apps/qw-oracle/curated/concept-notes/README.md` schema).
  - If JSONB-related: ensure no frontmatter value is pre-stringified JSON (e.g., `related_entities: '["..."]'` instead of `related_entities: ["..."]`). Per oracle's always-on rule, JS arrays/objects go to JSONB columns directly, never as string scalars. Re-author the file via Task 8 if needed.

- **V_HARVEST3 fails (MCP query returns zero results despite psql showing the row):** embeddings didn't fire during load-concepts. Most common: `VOYAGE_API_KEY` absent from `apps/qw-oracle/.env`.
  - Verify: `grep VOYAGE_API_KEY apps/qw-oracle/.env` shows a key value (do not log the key itself).
  - Re-run `bun scripts/load-concepts/index.ts`. Should pick up the unembedded chunks (filter is `embedding IS NULL OR embedding_stale = TRUE` per `embed-chunks.ts`).
  - Re-issue the MCP query.

- **V_HARVEST3 fails (MCP query returns zero results AND psql shows the row + non-NULL embedding):** the query phrase didn't match the chunk strongly enough -- below the RRF threshold. Try a more distinctive phrase that includes a noun unique to the harvested section (e.g. `spectator` + `track` together). The harvested chunk's distinctiveness is bounded by Task 8's distillation; if the distillation is too generic, re-run Task 8 with a more anchored phrasing.

- **V_OPS1 fails:** Phase 4 makes no docker-compose / LocalSettings.php changes, so a container failure here is unrelated to Phase 4 work. Consult Phase 1 V4 / Phase 2 V_OPS1 / Phase 3 V_OPS1 recovery sections.

---

*Phase 4 ships when V_CAT1 + V_DOC1 + V_HARVEST1 + V_HARVEST2 + V_HARVEST3 + V_OPS1 PASS. v1 beta substrate is complete; the Modes vertical-slice mini-arc (Phase 5: Mode page-type form + template + Modes Layer B category page + Track C help-text) is unblocked once Phase 4 is committed + pushed.*
