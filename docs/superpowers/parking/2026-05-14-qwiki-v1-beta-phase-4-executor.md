# Phase 4 executor prompt -- qwiki-v1-beta arc

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

You are the **Phase 4 executor** for the qwiki-v1-beta arc. Your job is to ship Phase 4 (three quality-tag categories + `Help:URL slug discipline` + Phase 4 harvest probe page + Layer 3 concept-note via load-concepts pipeline + oracle MCP query verification): paper-author Tasks 1-3 (seed-page wikitext) + Tasks 4-6 (deploy README + OVERVIEW + qw-oracle README), commit + push, guide operator through Task 7 (wiki UI paste-and-save for 5 pages), author Task 8 concept-note, guide operator through Task 9 (load-concepts pipeline + oracle MCP search query), run V_CAT1 / V_DOC1 / V_HARVEST1 / V_HARVEST2 / V_HARVEST3 / V_OPS1 verification, commit + push, halt with a structured status report.

This is the **final substrate phase** of qwiki-v1-beta. After Phase 4 ships, the Modes mini-arc (Phases 5-8) is unblocked.

---

## Arc identification

You are working in the **qwiki-v1-beta** arc (date suffix `2026-05-12-qwiki-v1-beta`).

**Tell-tale signs that you are in the WRONG arc -- halt and report if your task scope drifts into any of these:**

- `decisions.md` references D1-D17 only -> qw-oracle Arc 1 (this arc has D1-D26).
- Phase MDs at `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` -> qw-oracle Arc 1.
- Phase MDs at `docs/superpowers/plans/2026-05-04-qwiki-community-reference/` -> superseded old qwiki-sandbox arc (pre-pivot). This arc replaces it.
- References to "modernize-in-place", "MW 1.35 -> 1.39 chain", "clone-and-upgrade" -> pre-pivot vision. This arc is **fresh-build** (D1).
- References to `wiki-beta.quake.world` as the live URL -> stale. D3 was amended 2026-05-14; live URL is `wiki.slipgate.me`.
- References to `ssh unraid '...'` (root identity) for deploy commands -> stale. Phase 4 MD uses `ssh unraid-deploy` (claude-deploy non-root user, uid 1002, scoped to `/mnt/user/appdata/qwiki-beta/`). `ssh unraid` is operator-only.

If any of those surface in your work, halt immediately and surface to operator.

---

## First action: invoke `arc-executor` skill

Before reading anything else, invoke the `arc-executor` skill. It governs your pre-flight, per-task execution per declared mode (inline vs subagent), phase-boundary verification, and structured halt-and-report.

Phase 4 has **9 tasks** of varying shape. Per the phase MD, **8 are declared `inline`** (wikitext + markdown + doc edits -- content-shape work, no auth/extension/infrastructure synthesis) and **Task 8 is declared `subagent (Sonnet medium)`** for the Layer 3 concept-note distillation. That one subagent dispatch IS expected per D26 + operator memory `feedback_model_effort_range.md` (Sonnet medium is the reasoning floor for L3 authoring) + `feedback_no_subagents_for_mechanical_edits.md` (subagent dispatch is for content synthesis, not mechanical edits -- L3 distillation qualifies). The phase MD's Task 8 section ships the full subagent dispatch brief inline (around lines 431-453 of `phase-4-discipline-harvest.md`).

---

## Working directory and git policy

- **Working directory:** `/home/paradoks/projects/quakeworld/` (main tree).
- **Branch:** `main`. No worktree. No PR / branch ceremony. Commit + push to `main` directly. Operator's `superpowers:finishing-a-development-branch` + `superpowers:using-git-worktrees` are overridden in `CLAUDE.md`.
- **Operator does NOT touch git** -- you run all git operations silently.
- **Unrelated files may be uncommitted in the tree at session start** (slipgate, qw-oracle, ktx-onboarding, other arcs). Verify none of them touch `apps/qwiki-sandbox/` or `apps/qw-oracle/curated/concept-notes/` (Phase 4's two write surfaces) or `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`. When you commit Phase 4 artifacts, add ONLY the Phase 4 paths -- never `git add -A`.

Phase 4 paths your commits should `git add`:

```
apps/qwiki-sandbox/deploy/seed-pages/Category-Needs_review.wikitext   (new)
apps/qwiki-sandbox/deploy/seed-pages/Category-Stale.wikitext           (new)
apps/qwiki-sandbox/deploy/seed-pages/Category-Draft.wikitext           (new)
apps/qwiki-sandbox/deploy/seed-pages/Help-URL_slug_discipline.wikitext (new)
apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext    (new)
apps/qwiki-sandbox/deploy/README.md                                    (modify)
apps/qwiki-sandbox/OVERVIEW.md                                          (modify)
apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md        (new)
apps/qw-oracle/curated/concept-notes/README.md                          (modify)
```

Plus optionally this executor prompt at `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-phase-4-executor.md` if you find drift between MD and reality that you fix in-place during execution.

---

## State inherited from Phase 1 + Phase 2 + Phase 3 (must know before reading the MD)

Phase 3 shipped 2026-05-14 with three in-flight findings (F7 / F8 / F9) all RESOLVED + closed (cumulative F1-F9 ledger now closed). What this means for Phase 4:

### Substrate state Phase 4 inherits

- **Live wiki:** `https://wiki.slipgate.me` (three containers: nginx 1.30-alpine + mediawiki:1.43-fpm + mariadb 11.4 LTS; Citizen v3.16.0 skin).
- **8 active extensions:** Page Forms 5.8.1 + Semantic MediaWiki 6.0.1 + ParserFunctions + Cite + CategoryTree + TemplateData + PluggableAuth v7.5.0 + OpenIDConnect v8.3.0.
- **2 MW groups:** `wiki-contributor` (Discord-OAuth auto-assigned via bot-mode role sync) + `wiki-curator` (manually assigned via `Special:UserRights`).
- **Namespace gates (D5):** NS_FORM / NS_FORM_TALK / NS_TEMPLATE / NS_TEMPLATE_TALK / NS_CATEGORY / NS_CATEGORY_TALK all require `edit-curator-namespace` right (granted only to `wiki-curator`). Operator IS in `wiki-curator` (V_AUTH5 PASS).
- **Discord OAuth working:** bot-mode role sync (per D4 Amendment 2026-05-14, F9 resolution); `wiki.Quake.World` Discord bot reads role membership via `DISCORD_BOT_TOKEN` in `.env`.
- **Phase 2 smoke-test artifacts remain in the wiki:** `Form:TestForm`, `Template:Test`, `TestPage`. Deletable at operator discretion; low collision risk with Phase 4 content names.

### Carry-forward findings -- none directly bite Phase 4

Phase 4 is content-shape work (wikitext + markdown). NO docker-compose changes. NO LocalSettings.php changes. NO composer runs. NO new extensions activated. The F4-F9 carry-forwards from Phases 1-3 are durable in the deployed substrate; Phase 4 doesn't re-trigger any of them.

- **F4 (composer platform-req flags):** Phase 4 doesn't run composer. NOT affected.
- **F5 (PageForms FormEdit URL):** Phase 4 doesn't ship new forms. NOT affected.
- **F6 (bundled-ext LOAD list):** Phase 4 doesn't change LocalSettings extensions. F6 LOAD list (ParserFunctions / Cite / CategoryTree / TemplateData) STAYS in place; Phase 4 actively USES them (Category:Needs_review etc. rely on CategoryTree-style nav, the Help page can use Cite if needed). Verify after deploy: Special:Version still lists 8 extensions.
- **F7 (composer merge-plugin visibility):** no composer use; NOT affected.
- **F8 (PluggableAuthLogin URL form):** auth-related, no auth changes in Phase 4; NOT affected.
- **F9 (bot-mode role sync):** auth-related; NOT affected. (D4 amended; Phase 4 inherits working state.)

### Verifier checklist (5 checks; for any drafter-subagent dispatches inside this phase)

Per operator memory `feedback_drafter_subagent_verification_checklist.md` (sharpened to 5 checks at Phase 3 boundary capture):

1. Cross-image composer dependency resolution (platform-reqs AND merge-plugin path visibility) -- N/A for Phase 4 (no composer).
2. URL pattern assumptions against current extension version -- minor concern if any V-probe references a `Special:*` URL whose semantics depend on Page Forms / SMW / etc.; phase MD V-probes look safe (only `Special:Categories` referenced, which has stable behavior).
3. Bundled-vs-loaded extension audit -- N/A for Phase 4 (no LocalSettings changes).
4. Emitted-URL form probe inside running container -- N/A (Phase 4 doesn't register new redirect URIs).
5. Session-stored value write-site trace -- N/A (Phase 4 doesn't read session).

Phase 4 is the LOWEST-risk substrate phase by checklist coverage. No new infrastructure surface = no new traps.

### Cross-pipeline note: Phase 4 SPANS qwiki-sandbox + qw-oracle

This is the only substrate phase that touches BOTH `apps/qwiki-sandbox/` and `apps/qw-oracle/`. Specifically:

- **qwiki-sandbox writes:** the 5 seed-page wikitexts (categories + help + harvest probe) + deploy/README + OVERVIEW updates.
- **qw-oracle writes:** the Layer 3 concept-note `test-qwiki-harvest-probe.md` + the concept-notes/README table update.
- **Cross-pipeline run:** Task 9 invokes `bun apps/qw-oracle/scripts/load-concepts/index.ts` which ingests the new concept-note via the existing qw-oracle Arc 1 loader (the `F1.jsonb_columns_not_strings` regression gate per operator memory `reference_postgres_js_jsonb_binding.md` is part of that loader's verification surface; we expect zero WARN/ERROR lines from it).

Operator needs Claude MCP wired to `https://oracle.slipgate.me/mcp` for V_HARVEST3. If not wired, the deploy README's Phase 4 section + the phase MD's V_HARVEST3 step both name a psql fallback against the qw-oracle Postgres for the same check.

### Phase 3 cosmetic carry-forwards (NOT Phase 4 scope; flag for operator)

These two items surfaced at Phase 3 boundary but were deferred to a separate polish pass (NOT bundled into Phase 4 because they're auth-shape, not content-shape):

1. **Discord username extraction renders as literal "User"** in the Citizen user menu. Needs `$wgOpenIDConnect_UsernameClaim = 'preferred_username'` (or similar) in `LocalSettings.php` -- subject to verification against actual Discord OIDC payload claims. Config-only fix.
2. **`MediaWiki:Group-wiki-{contributor,curator}-member` interface-message pages missing** -- user menu renders `<group-wiki-contributor-member>` literal. Two sysop-side wiki edits to create the pages with localized strings.

DO NOT bundle these into Phase 4 work; surface to operator at halt if they're still pending. They live as a small Phase 3 polish micro-commit (operator's discretion when to land).

---

## Operator-side prerequisites (confirm at pre-flight; none new beyond Phase 3)

1. **Tailscale up** -- `ssh unraid-deploy 'echo ok'` returns `ok`.
2. **Operator is `wiki-curator`** -- required for Task 7 step 1-3 (creating NS_CATEGORY pages via wiki UI; categories are curator-only per D5). Phase 3 V_AUTH5 promoted the operator to `wiki-curator`; if rolled back, re-promote via `Special:UserRights` as Admin.
3. **Operator has Claude MCP wired to `https://oracle.slipgate.me/mcp`** (for V_HARVEST3). If not wired, the psql fallback is the path; deploy README documents both.
4. **Local WSL operator shell can run `bun apps/qw-oracle/scripts/load-concepts/index.ts`** against the live `qw_oracle` Postgres. Bun runtime + `apps/qw-oracle/.env` with `DATABASE_URL` pre-existing per qw-oracle Arc 1.

Confirm 1-2 at session start; 3-4 are operator-internal (transitively true from recent qw-oracle work).

---

## Where things are

**Plan scaffold:** `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`

- `README.md` -- phase index (Phases 1-3 = `shipped`; Phase 4 = `approved` after this prompt lands; Phases 5-8 = `not started` / deferred).
- `decisions.md` -- D1-D26 plus D2 / D3 / D4 amendments. Walk it cold.
- `prerequisites.md` -- operator-side state.
- `review-findings.md` -- F1-F9 all RESOLVED.
- `phase-template.md` -- mandatory phase MD shape (reference).
- `phase-4-discipline-harvest.md` -- **the phase MD you are executing**. ~660 lines, 9 tasks, full file content inlined.
- `phase-1-mw-core.md` + `phase-2-extensions.md` + `phase-3-auth-groups.md` -- shipped state; reference only.

**Arc spec:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 LOCKED). Do not reopen.

**Working tree the phase modifies (per the Files-touched section of the MD):**

Created (qwiki-sandbox side):
- `apps/qwiki-sandbox/deploy/seed-pages/Category-Needs_review.wikitext`
- `apps/qwiki-sandbox/deploy/seed-pages/Category-Stale.wikitext`
- `apps/qwiki-sandbox/deploy/seed-pages/Category-Draft.wikitext`
- `apps/qwiki-sandbox/deploy/seed-pages/Help-URL_slug_discipline.wikitext`
- `apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext`

Created (qw-oracle side):
- `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md`

Modified:
- `apps/qwiki-sandbox/deploy/README.md` (Phase 4 deploy section)
- `apps/qwiki-sandbox/OVERVIEW.md` (Phase 4 state marker)
- `apps/qw-oracle/curated/concept-notes/README.md` (Current notes table entry)

**Wiki-side state** (operator-created at deploy time; NOT in git):

- `Category:Needs review` / `Category:Stale` / `Category:Draft` (NS_CATEGORY; curator-only)
- `Help:URL slug discipline` (NS_HELP; not in D5 gate set; contributor or curator can create)
- `Phase 4 harvest probe` (main NS; contributor or curator can create)

---

## Required reads (in order)

1. **This prompt** (you are reading it).
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` -- arc orientation; Phases 1-3 = `shipped`; Phase 4 = `approved`.
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D1-D26 + amendments. Critical: D4 Amendment 2026-05-14 (bot-mode role sync).
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md` -- F1-F9 context (all RESOLVED).
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/prerequisites.md` -- confirm Tailscale + wiki-curator state.
6. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-4-discipline-harvest.md` -- the plan you execute. ~660 lines.
7. `apps/qwiki-sandbox/deploy/README.md` -- current state (Phase 1+2+3 install sections).
8. `apps/qw-oracle/curated/concept-notes/README.md` -- the Current notes table you'll extend in Task 6 + the concept-note schema requirements.
9. `apps/qw-oracle/curated/concept-notes/CLAUDE.md` (if it exists; otherwise the concept-notes/README serves as the L3 authoring discipline reference).

You do NOT need to read Phase 5+ MDs (not yet drafted; deferred until Phase 4 ships).

---

## Pre-flight (live-state checks before Task 1)

Run these probes BEFORE editing any file:

1. **Confirm working tree.**
   ```bash
   pwd
   # Expect: /home/paradoks/projects/quakeworld
   git rev-parse --abbrev-ref HEAD
   # Expect: main
   git rev-parse HEAD
   # Capture for halt report.
   ```

2. **Confirm Phase 1+2+3 substrate still live.** Re-run a subset of inherited V-probes:
   ```bash
   curl -s "https://wiki.slipgate.me/index.php?title=Special:Version" | grep -oE "(Page Forms|Semantic MediaWiki|ParserFunctions|Cite|CategoryTree|TemplateData|PluggableAuth|OpenID Connect)" | sort -u | wc -l
   # Expect: 8 (all Phase 1-3 extensions still active).
   ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}"'
   # Expect: qwiki-{mariadb(healthy),mediawiki,nginx} all Up.
   ```
   If either probe FAILS, halt -- substrate degraded between sessions.

3. **Confirm `claude-deploy` user state.**
   ```bash
   ssh unraid-deploy 'whoami && id'
   # Expect: claude-deploy, uid=1002, in docker group.
   ```

4. **Confirm Phase 4 paths clean.**
   ```bash
   git status --short apps/qwiki-sandbox/ apps/qw-oracle/curated/concept-notes/ docs/superpowers/plans/2026-05-12-qwiki-v1-beta/
   ```
   Expect: no entries under those paths (or entries unrelated to Phase 4 from parallel work).

5. **Confirm operator-side prereqs.** Ask:
   - Tailscale up?
   - Confirmed in `wiki-curator` group (per Phase 3 V_AUTH5)?
   - Claude MCP wired to `oracle.slipgate.me/mcp`? (If not, V_HARVEST3 uses psql fallback.)

Report pre-flight outcome at the top of your first response (one short paragraph; PASS/FAIL per probe; prereq confirmation status).

---

## Critical rules

- **ASCII only.** No emoji. No em-dash / en-dash -- use ASCII hyphen-minus. Comments explain WHY, not WHAT. (D21.)
- **8 tasks declared `inline`, 1 task (Task 8) declared `subagent (Sonnet medium)`.** Inline tasks execute directly via Edit / Write / Bash. Task 8 dispatches the L3 distillation subagent with the brief at Phase 4 MD lines ~431-453. (D22 / D26.)
- **Verification before completion.** Run each task's Verification block immediately after the steps. If a probe FAILs, do NOT proceed to the next task.
- **Plain English at decision points.** Lead with the plain-English consequence + tradeoff; technical chain only where load-bearing.
- **One question at a time during interactive scoping.** Don't batch-dump.
- **No silent decision overrides.** If you find a reason to deviate from `decisions.md` D1-D26 (including D2/D3/D4 amendments), STOP. Add a "Deviation" note at top of phase MD and surface to operator.
- **Phase 4 makes NO infrastructure changes.** If you find yourself drafting a docker-compose edit / LocalSettings.php edit / wfLoadExtension call / composer run -- HALT. That's scope creep into Phase 5+ or a missed cosmetic-followup boundary.
- **Cross-pipeline care:** Task 8 ships a markdown concept-note into qw-oracle's curated tree. Follow `apps/qw-oracle/curated/concept-notes/README.md` schema discipline (frontmatter shape, slug conventions, the F1.jsonb_columns_not_strings regression gate that load-concepts enforces).
- **Phase 3 cosmetic carry-forwards stay separate.** Do NOT bundle the Discord-username-claim fix or the interface-message pages into Phase 4 commits. They are auth-shape; flag at halt for operator to handle in a separate Phase 3 polish micro-commit.

---

## Execution shape

Phase 4 has 9 tasks + halt seams. Natural halt-before points:

| Task | Mode | What it does | Halt before? |
|---|---|---|---|
| 1 | inline | Author 3 Category seed-page wikitexts | no |
| 2 | inline | Author Help:URL_slug_discipline wikitext | no |
| 3 | inline | Author Phase_4_harvest_probe wikitext | no |
| 4 | inline | Extend deploy/README.md with Phase 4 section | no |
| 5 | inline | Update OVERVIEW.md Phase 4 marker | no |
| 6 | inline | Update qw-oracle concept-notes/README table | no |
| -- | commit | **Commit Tasks 1-6 to main + push** | **yes** -- show operator staged paths + commit message |
| 7 | operator | Paste 5 seed pages into wiki UI as curator | **yes** -- multi-step operator browser work |
| 8 | subagent (Sonnet medium) | Dispatch L3 distillation subagent -> author qw-oracle concept-note `test-qwiki-harvest-probe.md` | no |
| -- | commit | **Commit Task 8 (concept-note) to main + push** | **yes** -- separate commit because the concept-note lands in qw-oracle's `curated/concept-notes/` tree (different write surface than the qwiki-sandbox paper artifacts); the distillation reads Task 3's seed-page wikitext, so Task 7's wiki render is not a hard prerequisite |
| 9 | operator | Run load-concepts pipeline + oracle MCP search query | **yes** -- multi-step operator CLI work |

**Commit between Task 6 and Task 7.** Paper artifacts (seed-pages + deploy README + OVERVIEW + concept-notes README) are stable; commit them before the operator-driven wiki work. Suggested commit message (mirror Phase 3 style):

```
phase(qwiki-v1-beta): Phase 4 paper artifacts -- quality-tag categories + URL slug help page + harvest probe page + concept-notes README update

Per docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-4-discipline-harvest.md Tasks 1-6.
Five seed-page wikitexts under apps/qwiki-sandbox/deploy/seed-pages/ (3 categories +
1 help page + 1 harvest probe). Deploy README extended with Phase 4 paste-and-save
walkthrough + load-concepts pipeline invocation + MCP query verification steps.
OVERVIEW.md marks Phase 4 substrate state. qw-oracle concept-notes/README Current
notes table extended with the test-qwiki-harvest-probe entry placeholder.

Task 7 (operator deploy: wiki UI paste) + Task 8 (concept-note authoring) + Task 9
(operator deploy: load-concepts run + MCP query) follow as separate commits.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

**Commit between Task 8 and Task 9.** Concept-note is distilled from `apps/qwiki-sandbox/deploy/seed-pages/Phase_4_harvest_probe.wikitext` (Task 3's output, already committed in the paper-artifact commit). Task 7's live wiki render is the human-readable mirror, not the distillation source -- so Task 8 can run even if Task 7's wiki paste hits a snag. Commit the .md file when Task 8's subagent returns + the file lands cleanly, before operator runs load-concepts in Task 9.

**Task 7 + Task 9 are operator-driven; you cannot do them.** You surface the steps + wait for operator's PASS/FAIL report.

For Task 7 specifically -- guide operator through the wiki UI sequence:
1. As curator-logged-in (verify via `Special:UserGroupRights`), visit `https://wiki.slipgate.me/index.php?title=Category:Needs_review&action=edit`. Paste body from `apps/qwiki-sandbox/deploy/seed-pages/Category-Needs_review.wikitext`. Save.
2. Repeat for `Category:Stale` and `Category:Draft`.
3. Visit `Help:URL slug discipline&action=edit`. Paste body from `Help-URL_slug_discipline.wikitext`. Save.
4. Visit `Phase 4 harvest probe&action=edit` (this lands in main NS). Paste body from `Phase_4_harvest_probe.wikitext`. Save.

For Task 9 -- guide operator through:
1. From operator's WSL: `cd apps/qw-oracle && bun scripts/load-concepts/index.ts 2>&1 | tee /tmp/load-concepts-phase4.log`.
2. Check log for `test-qwiki-harvest-probe` mention + zero WARN/ERROR for that slug.
3. Operator queries oracle MCP via Claude Desktop/Claude Code: `search_concepts` for a distinctive phrase from the harvested chunk. Expect `slug: test-qwiki-harvest-probe` with `match_quality: strong` or `moderate`.
4. Fallback if MCP not callable: psql probe per Phase 4 MD V_HARVEST3 fallback section.

---

## Phase-boundary verification (V_CAT1 / V_DOC1 / V_HARVEST1 / V_HARVEST2 / V_HARVEST3 / V_OPS1)

After Task 9 completes (operator confirms load-concepts + MCP query both PASS), run the phase MD's V-probes. You can drive V_CAT1 + V_DOC1 + V_HARVEST1 (HTTP) + V_OPS1 directly via curl + ssh; V_HARVEST2 + V_HARVEST3 are operator-driven CLI / MCP probes.

| Probe | You vs operator | What it checks |
|---|---|---|
| V_CAT1 | YOU (curl) + OPERATOR (browser Special:Categories) | Three category pages exist with bodies; Special:Categories lists all three |
| V_DOC1 | YOU (curl) + OPERATOR (browser) | Help:URL_slug_discipline renders with the 4 expected sections |
| V_HARVEST1 | YOU (curl) + OPERATOR (browser auto-categorization test) | Harvest probe page renders; adding/removing `[[Category:Needs review]]` toggles category membership |
| V_HARVEST2 | OPERATOR (bun + log grep) | load-concepts ingests the new concept-note (zero WARN/ERROR for the slug) |
| V_HARVEST3 | OPERATOR (MCP query or psql fallback) | Oracle MCP returns the harvested chunk with strong/moderate match_quality |
| V_OPS1 | YOU (ssh + docker compose ps) | Three containers still healthy |

If all 6 PASS, Phase 4 is green and the qwiki-v1-beta substrate is COMPLETE. The Modes mini-arc (Phase 5+) is unblocked.

Phase 3 V_AUTH6 (Discord-role revocation symmetry) carries forward as an optional Phase 5 spot-check if the operator wants to validate role removal at some point. Phase 1 V6 (backup-tarball verification) -- 2026-05-19 calendar check, still pending.

If any V-probe FAILs:

- Consult Phase 4 MD "Recovery" section.
- Apply the recovery; re-run the probe.
- If recovery fails twice, halt + surface with the probe output + failure pattern.

---

## Halt protocol

When Phase 4 is complete (V_CAT1 + V_DOC1 + V_HARVEST1 + V_HARVEST2 + V_HARVEST3 + V_OPS1 PASS) OR you've hit a blocker you cannot resolve, halt with this structured status report:

```
PHASE 4 EXECUTION -- HALTING

Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

Pre-flight: PASS | <which probe or prereq failed>

Tasks shipped:
  1. Category seed-pages (3 wikitext files)        -- done | failed | skipped
  2. Help-URL_slug_discipline.wikitext             -- done | failed | skipped
  3. Phase_4_harvest_probe.wikitext                -- done | failed | skipped
  4. deploy README Phase 4 section                 -- done | failed | skipped
  5. OVERVIEW.md Phase 4 marker                    -- done | failed | skipped
  6. concept-notes README table entry              -- done | failed | skipped
  7. Operator wiki UI paste (5 pages)              -- done | failed | partial (which pages?)
  8. test-qwiki-harvest-probe concept-note         -- done | failed | skipped
  9. Operator load-concepts + MCP query            -- done | failed | partial (which step?)

Commit + push:
  Paper-artifact commit SHA: <hash>
  Concept-note commit SHA: <hash>
  Pushed to origin/main: yes | no | n/a
  Files added (verify ONLY Phase 4 paths): <list>

Verification (phase boundary):
  V_CAT1 three categories exist + Special:Categories: PASS | FAIL -- <one-line>
  V_DOC1 Help:URL_slug_discipline renders: PASS | FAIL -- <one-line>
  V_HARVEST1 harvest probe + auto-categorization: PASS | FAIL -- <one-line>
  V_HARVEST2 load-concepts ingests concept-note: PASS | FAIL -- <one-line; operator-reported>
  V_HARVEST3 oracle MCP returns harvested chunk: PASS | FAIL -- <one-line; operator-reported>
  V_OPS1 three containers healthy: PASS | FAIL -- <one-line>
  Special:Version extensions count: <N> (expect 8; F6 LOAD list preserved)
  (Phase 1 V6 inherited; calendar check 2026-05-19 pending. Phase 3 V_AUTH6 optional carry-forward to Phase 5.)

Concerns / open questions / deviations (if DONE_WITH_CONCERNS):
  - <numbered list>

Cross-phase notes for orchestrator (and Phase 5 prep):
  - Phase 3 cosmetic followups still pending (Discord-username-claim + interface-message pages) -- NOT bundled into Phase 4; operator to land in a separate polish micro-commit at convenience.
  - Phase 1 V6 backup-tarball check (2026-05-19) still pending.
  - Phase 5 (Mode page-type form + template) is the first Modes-mini-arc phase; awaits operator approval to draft.
  - <any other cross-phase observations>

Next action for orchestrator:
  - <recommendation>: ratify-Phase-4-and-prep-Phase-5 | redraft-X | halt-for-operator
```

**Status taxonomy:** DONE (all V_* PASS) | DONE_WITH_CONCERNS (PASS but flagged items) | NEEDS_CONTEXT (resume after info) | BLOCKED (cannot complete).

Do NOT draft Phase 5. Halt cleanly and return control to the orchestrator session.

---

## When in doubt

- **Tempted to draft Phase 5** -> halt. Phase 5+ awaits operator approval after Phase 4 ships clean. Your job ends at Phase 4 halt protocol.
- **Tempted to fix the Phase 3 cosmetic carry-forwards (username claim / interface-message pages) "while we're at it"** -> don't. Those are auth-shape work and belong in a separate Phase 3 polish micro-commit. Bundling them into Phase 4 dilutes the boundary discipline.
- **Tempted to add a `wfLoadExtension` call to LocalSettings.php for some Phase 4 convenience** -> halt. Phase 4 doesn't touch LocalSettings.php. If a real need surfaces (e.g., CategoryTree was somehow not active), that's an F-finding (probably F10) -- capture as cross-phase, don't silently mutate.
- **Tempted to commit unrelated uncommitted files because they're in your way** -> don't. `git add` only Phase 4 paths.
- **Operator's load-concepts run reports a WARN/ERROR for `test-qwiki-harvest-probe`** -> walk the F1.jsonb_columns_not_strings regression gate path per operator memory `reference_postgres_js_jsonb_binding.md`. Most likely cause: frontmatter shape mismatch (re-check Task 8 output against concept-notes/README schema).
- **Operator's MCP query returns zero results despite load-concepts PASS** -> embeddings probably didn't fire. Check `VOYAGE_API_KEY` in `apps/qw-oracle/.env`. Re-run load-concepts (idempotent + re-runnable).
- **A V-probe fails on a different finding shape entirely (something the F1-F9 ledger doesn't cover)** -> capture as F10+ with cross-phase implications. Same procedural shape as F4/F7 (the in-flight resolved pattern).
- **wiki-curator group rolled back / operator can't create categories in Task 7** -> Phase 3 V_AUTH5 may have been undone. Re-promote via Admin's Special:UserRights (Admin session might still be alive from Phase 3; if not, use the CLI fallback per Phase 3 V_AUTH5 guidance).

---

*End of executor prompt. Begin pre-flight when you have read all required reads + confirmed operator-side prereqs.*
