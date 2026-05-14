# Phase 3 executor prompt -- qwiki-v1-beta arc

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

You are the **Phase 3 executor** for the qwiki-v1-beta arc. Your job is to ship Phase 3 (PluggableAuth + OpenIDConnect + Discord OAuth + `wiki-contributor` / `wiki-curator` MW groups + D5 namespace edit restrictions + Discord-role-sync hooks) end-to-end: paper-edit Tasks 1-6, deploy Task 7 against the live wiki at `https://wiki.slipgate.me`, walk operator through V_AUTH1 / V_AUTH2 / V_AUTH3 / V_AUTH4 / V_AUTH5 / V_OPS1 verification (V_AUTH6 operator-discretionary), commit + push, halt with a structured status report. You do NOT draft phases, plan future work, or touch slipgate / qw-oracle / other arcs.

---

## Arc identification

You are working in the **qwiki-v1-beta** arc (date suffix `2026-05-12-qwiki-v1-beta`).

**Tell-tale signs that you are in the WRONG arc -- halt and report if your task scope drifts into any of these:**

- `decisions.md` references D1-D17 only -> qw-oracle Arc 1 (this arc has D1-D26).
- Phase MDs at `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` -> qw-oracle Arc 1.
- Phase MDs at `docs/superpowers/plans/2026-05-04-qwiki-community-reference/` -> superseded old qwiki-sandbox arc (pre-pivot). This arc replaces it.
- References to JSONB, pgvector, voyage-4-large, RRF retrieval, postgres-js -> qw-oracle Arc 1 terminology.
- References to "modernize-in-place", "MW 1.35 -> 1.39 chain", "clone-and-upgrade", "EQL drain" -> pre-pivot vision. This arc is **fresh-build** (D1).
- References to `wiki-beta.quake.world` as the live URL -> stale. D3 was amended 2026-05-14; live URL is `wiki.slipgate.me`. Phase 3 MD already retargeted.
- References to `ssh unraid '...'` (root identity) for deploy commands -> stale. The Phase 3 MD uses `ssh unraid-deploy` (claude-deploy non-root user, uid 1002, scoped to `/mnt/user/appdata/qwiki-beta/`). `ssh unraid` is operator-only.

If any of those surface in your work, halt immediately and surface to operator.

---

## First action: invoke `arc-executor` skill

Before reading anything else, invoke the `arc-executor` skill. It governs your pre-flight, per-task execution per declared mode (inline vs subagent), phase-boundary verification, and structured halt-and-report.

Phase 3 has **6 paper tasks + 1 deploy task**. Execution-mode mix (per D26):

- Task 1 (composer.local.json) -- `inline`
- Task 2 (docker-compose.prod.yml) -- `inline`
- Task 3 (.env.prod.example) -- `inline`
- Task 4 (LocalSettings.php Auth section) -- `subagent (Sonnet medium)` -- this is the one task that gets subagent dispatch (real PHP logic for Discord API call + group-membership sync + error handling, not mechanical config). Per D22 carve-out: subagent is for reasoning, not text shuffling.
- Task 5 (deploy/README.md) -- `inline`
- Task 6 (OVERVIEW.md) -- `inline`
- Task 7 (Unraid deploy + operator-driven OAuth verification) -- direct execution + operator-driven browser steps; not annotated as a task with mode.

---

## Working directory and git policy

- **Working directory:** `/home/paradoks/projects/quakeworld/` (main tree).
- **Branch:** `main`. No worktree. No PR / branch ceremony. Commit + push to `main` directly. Operator's `superpowers:finishing-a-development-branch` + `superpowers:using-git-worktrees` are overridden in `CLAUDE.md`.
- **Operator does NOT touch git** -- you run all git operations silently.
- **Unrelated files may be uncommitted in the tree at session start** (slipgate, qw-oracle, ktx-onboarding, other arcs). **Verify none of them touch `apps/qwiki-sandbox/` or `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`.** When you commit Phase 3 artifacts, add ONLY the Phase 3 paths -- never `git add -A` or `git add .`.

Your commits should `git add` only:

```
apps/qwiki-sandbox/OVERVIEW.md
apps/qwiki-sandbox/deploy/composer.local.json
apps/qwiki-sandbox/deploy/docker-compose.prod.yml
apps/qwiki-sandbox/deploy/LocalSettings.php
apps/qwiki-sandbox/deploy/.env.prod.example
apps/qwiki-sandbox/deploy/README.md
```

Plus optionally this executor prompt at `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-phase-3-executor.md` if you find drift between MD and reality that you fix in-place during execution.

---

## State inherited from Phase 1 + Phase 2 (must know before reading the MD)

Phase 2 shipped 2026-05-14 with three in-flight findings (F4 / F5 / F6) all RESOLVED + closed. What this means for Phase 3:

### F4 carry-forward (composer platform-req flags)

The composer step in Phase 3 Task 5 step 5 (deploy README) requires `--ignore-platform-req=ext-calendar --ignore-platform-req=ext-intl` flags. This is **already baked into the Phase 3 MD** (commit landed during Phase 2 boundary capture). If you find the composer command without the flags, halt -- the MD is stale and the deploy will fail at resolution. Background: `composer:latest` is a minimal Alpine PHP CLI lacking ext-calendar + ext-intl; MW's `composer.json` requires both; flags skip the resolver-time platform check (the runtime image has both extensions).

### F6 carry-forward (bundled-ext LOAD list is locked)

Phase 2 audited the 34 MW-bundled extensions and locked a LOAD/SKIP/DEFER contract:

- **LOAD (4):** ParserFunctions, Cite, CategoryTree, TemplateData.
- **SKIP (5):** VisualEditor, OATHAuth, LoginNotify, Math, PdfHandler.
- **DEFER (24):** all others (revisit per phase when needed).

Phase 3 **does NOT re-audit** the bundled extensions. Phase 3 Task 4 ADDS only the two Phase-3-specific loads (PluggableAuth + OpenIDConnect) on top of the Phase 2 LOAD list. The Phase 3 MD's Task 4 inline LocalSettings.php content **preserves** the F6 LOAD block between the Phase 2 Extensions section and the Phase 3 Extensions section (it was patched into Phase 3 MD during Phase 2 boundary capture). If you find the LocalSettings.php inline content MISSING any of those four bundled-ext activations, halt -- the MD is stale.

After Phase 3 ships, the active LocalSettings.php extensions should be 8:

- PageForms, SemanticMediaWiki (Phase 2 third-party)
- ParserFunctions, Cite, CategoryTree, TemplateData (Phase 2 F6 LOAD list)
- PluggableAuth, OpenIDConnect (Phase 3 third-party)

If Phase 3 deploy ends with fewer than 8, F6 was silently rolled back -- HALT.

### F5 carry-forward (Page Forms FormEdit URL semantics)

F5 affects forms (PF 5.8.1+ requires either a target-prompt input in form definition OR a target-in-URL pattern). Phase 3 does NOT ship any new forms -- only auth wiring. F5 carries to Phase 5 (Mode page-type form) and does not bite Phase 3.

### Verifier checklist (for Task 4 subagent)

Per the new operator memory `feedback_drafter_subagent_verification_checklist.md`, the Task 4 subagent must explicitly cross-check:

1. **Cross-image composer platform-req mismatches** -- if your subagent recommends a new composer step (it shouldn't; Task 4 doesn't touch composer), verify --ignore-platform-req flags.
2. **URL pattern assumptions against current extension version** -- if your subagent references any `Special:*` URL in the PHP hook code or config, verify against current PluggableAuth 7.5.0 + OpenIDConnect 8.3.0 source (REL1_43 HEAD).
3. **Bundled-vs-loaded extension audit** -- not load-bearing for Phase 3 (no new bundled-ext activations); Task 4's only `wfLoadExtension` calls are for the two third-party extensions PluggableAuth + OpenIDConnect.

Pass this checklist into the Task 4 subagent prompt explicitly.

### Other Phase 1 + 2 state for context

1. **URL is `wiki.slipgate.me`.** D3 amendment 2026-05-14. MD reads clean. Do NOT substitute on the fly.

2. **SSH identity is `ssh unraid-deploy`.** The claude-deploy non-root user (uid 1002, docker group, scoped to `/mnt/user/appdata/qwiki-beta/`). Root `ssh unraid` is operator-only (compose-plugin reinstall after reboot; not relevant in Phase 3).

3. **MariaDB user state.** `qwiki_beta` database has both `qwiki@'%'` and `qwiki@'mariadb'` users (dual-user state from Phase 1 install.php recovery, F2 sub-finding 1). Phase 3 does NOT re-run install.php. The composer step runs against `mediawiki-html/` only; no GRANT path.

4. **MediaWiki Admin credentials.** The `Admin` user's password is `MW_ADMIN_PASSWORD` from `/mnt/user/appdata/qwiki-beta/.env` on Unraid. Phase 3 V_AUTH5 requires Admin-side `Special:UserRights` access to promote a user to `wiki-curator`.

5. **F2 idioms baked in to `deploy/README.md`.** Phase 1 surfaced four execution-time learnings (docker-as-elevated-user pattern; `up -d --wait` instead of poll-for-healthy; Cloudflare One dashboard path; nginx 301 Location scheme). Not directly relevant for Phase 3 but documented if anything goes sideways.

6. **The wiki is live + functional with Phase 2 extensions active.** As of Phase 2 boundary: 39 smw_ tables; 97 total tables; PageForms 5.8.1 + SMW 6.0.1 + 4 bundled-ext LOAD list active; TestPage / Form:TestForm / Template:Test smoke-test artifacts remain in the wiki (deletable at operator discretion, low collision risk with Phase 5 Mode names).

7. **Phase 1 V6 calendar check (2026-05-19)** remains the asynchronous Monday verification (next backup tarball includes qwiki-beta). Not Phase 3 work; inherited.

---

## Operator-side prerequisites (BLOCKING -- confirm before Task 1)

Phase 3 cannot ship without Discord OAuth prereqs in place. Confirm with operator at session start before doing any work:

1. **Discord OAuth application** registered at `https://discord.com/developers/applications`.
   - Redirect URI: `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin` (case-sensitive in query-string).
   - Client ID + Client Secret captured.
2. **`@wiki-beta` Discord role** exists in the relevant Discord server. Role ID captured (right-click role -> Copy ID with developer mode enabled).
3. **Operator's Discord user-ID** captured (for self-verification of V_AUTH3 auto-assignment).
4. **Discord Server (Guild) ID** captured.

The four values populate `.env` on Unraid as `DISCORD_OAUTH_CLIENT_ID`, `DISCORD_OAUTH_CLIENT_SECRET`, `DISCORD_GUILD_ID`, `DISCORD_WIKI_BETA_ROLE_ID`. The operator MUST have all four before Task 7 step 4 (populate `.env`). If any are missing, halt at pre-flight and surface for operator to handle.

---

## Where things are

**Plan scaffold:** `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`

- `README.md` -- phase index (Phase 1 + 2 = `shipped`, Phase 3 = `approved`, Phase 4 = `drafted`).
- `decisions.md` -- D1-D26 plus D2 Amendments + D3 Amendment (URL `wiki.slipgate.me`). Walk it cold.
- `prerequisites.md` -- operator-side state. Discord OAuth section is your prereq surface.
- `review-findings.md` -- F1-F6 all RESOLVED. Read F4 + F5 + F6 sections carefully; they bake in cross-phase learnings.
- `phase-template.md` -- mandatory phase MD shape (reference).
- `phase-3-auth-groups.md` -- **the phase MD you are executing**. ~1220 lines, 6 tasks, full file content inlined (Task 4 large -- ~370 lines of LocalSettings.php content).
- `phase-1-mw-core.md` + `phase-2-extensions.md` -- shipped state; reference only.

**Arc spec:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 LOCKED). Do not reopen.

**Working tree the phase modifies:**

- `apps/qwiki-sandbox/deploy/composer.local.json` (modify -- Task 1; adds merge-plugin path entry)
- `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` (modify -- Task 2; adds PluggableAuth + OpenIDConnect overlay binds on mediawiki + nginx + four DISCORD_* env vars)
- `apps/qwiki-sandbox/deploy/.env.prod.example` (modify -- Task 3; adds DISCORD_* template variables)
- `apps/qwiki-sandbox/deploy/LocalSettings.php` (modify -- Task 4; adds Auth + Groups + Namespace + Hooks section; preserves Phase 2 F6 LOAD list)
- `apps/qwiki-sandbox/deploy/README.md` (modify -- Task 5; adds Phase 3 install section + image-bump amendment + OAuth Troubleshooting)
- `apps/qwiki-sandbox/OVERVIEW.md` (modify -- Task 6; marks Phase 3 shipped)

**Unraid-side state** (modified during Task 7 deploy, not in git):

- `/mnt/user/appdata/qwiki-beta/pluggable-auth/` (git clone REL1_43; new dir)
- `/mnt/user/appdata/qwiki-beta/openid-connect/` (git clone REL1_43; new dir)
- `/mnt/user/appdata/qwiki-beta/mediawiki-html/vendor/jumbojett/` (composer-installed)
- `/mnt/user/appdata/qwiki-beta/.env` (operator appends four DISCORD_* lines; chmod 600)
- The running `qwiki-mediawiki` container recreated with new compose + LocalSettings + extensions overlay.

---

## Required reads (in order)

1. **This prompt** (you are reading it).
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` -- arc orientation; Phase 1 + 2 = `shipped`; Phase 3 = `approved`.
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- read all D1-D26 + amendments.
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md` -- F1-F6 context. Read F4 / F5 / F6 carefully (they bake in cross-phase learnings).
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/prerequisites.md` -- confirm Discord OAuth + Tailscale + dual-SSH-identity state.
6. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-3-auth-groups.md` -- the plan you execute. ~1220 lines.
7. `apps/qwiki-sandbox/deploy/README.md` -- current state (includes Phase 1 + Phase 2 install sections, F2 idioms, F4 composer flags).
8. `apps/qwiki-sandbox/deploy/LocalSettings.php` -- current Phase 2 state (you'll extend this in Task 4).

You do NOT need to read Phase 4 / 5+ MDs for this work. Phase 4's "Inputs from previous phase" should match your Phase 3 Outputs; verify before halt.

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
   # Capture the SHA for the halt report.
   ```

2. **Confirm Phase 2 still live.** Re-run V_PF1 + V_SMW1 + V_OPS1 + the F6-audit re-render check:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://wiki.slipgate.me/index.php?title=Special:Forms
   # Expect: 200
   curl -s -o /dev/null -w "%{http_code}\n" https://wiki.slipgate.me/index.php?title=Special:Browse
   # Expect: 200
   curl -s "https://wiki.slipgate.me/index.php?title=Special:Version" | grep -oE "(Page Forms|Semantic MediaWiki|ParserFunctions|Cite|CategoryTree|TemplateData)" | sort -u
   # Expect: all six listed (one per line).
   curl -s "https://wiki.slipgate.me/index.php?title=TestPage" | grep -c '{{#if:'
   # Expect: 0 (ParserFunctions actively rendering Template:Test).
   ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}"'
   # Expect: qwiki-{mariadb,mediawiki,nginx} all Up; mariadb (healthy).
   ```
   If any probe FAILS, halt -- Phase 2 substrate degraded between sessions; operator triages before Phase 3 starts.

3. **Confirm claude-deploy user state.**
   ```bash
   ssh unraid-deploy 'whoami && id'
   # Expect: claude-deploy, uid=1002, in docker group.
   ssh unraid-deploy 'ls -la /mnt/user/appdata/qwiki-beta/ | head -20'
   # Expect: pluggable-auth/ + openid-connect/ should NOT yet be present.
   ```

4. **Confirm Phase 3 prereqs.** Ask operator to confirm:
   - Discord OAuth app registered with redirect URI `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin`.
   - Client ID + Client Secret captured.
   - `@wiki-beta` Discord role exists; role ID captured.
   - Operator's Discord user-ID captured.
   - Discord Guild ID captured.

   If ANY are missing, halt. Phase 3 deploy cannot complete without all four `.env` values.

5. **Confirm working-tree clean of Phase 3 paths.**
   ```bash
   git status --short apps/qwiki-sandbox/ docs/superpowers/plans/2026-05-12-qwiki-v1-beta/
   ```
   Expect: no entries under those paths. If there are entries (e.g., another session edited them), halt -- in-flight scope drift not anticipated.

Report pre-flight outcome at the top of your first response (one short paragraph; PASS/FAIL per probe; operator confirmation status for Discord prereqs).

---

## Critical rules

- **ASCII only.** No emoji. No em-dash / en-dash -- use ASCII hyphen-minus. Comments explain WHY, not WHAT. (D21 + operator memory.)
- **Execution mode is final.** Task 4 is `subagent (Sonnet medium)`; the other 5 paper tasks are `inline`. Do not flip modes. (D22 / D26.)
- **Verification before completion.** Run each task's Verification block immediately after the steps. If a probe FAILs, do NOT proceed to the next task.
- **Plain English at decision points.** When you halt for an operator decision, lead with the plain-English consequence + tradeoff; technical chain only where load-bearing.
- **One question at a time during interactive scoping.** Don't batch-dump.
- **No silent decision overrides.** If you find a reason to deviate from `decisions.md` D1-D26 (including D3 + D2 amendments), STOP. Add a "Deviation" note at top of phase MD and surface to operator.
- **Repair via re-extract for any Phase 3 deploy-time drift.** If a paper artifact turns out wrong after a partial deploy, fix the source file in `apps/qwiki-sandbox/deploy/` and `scp` the corrected file. Do NOT edit Unraid copies in place and leave repo drifted.
- **F6 LOAD list is locked.** Task 4 ADDS PluggableAuth + OpenIDConnect on top of the existing Phase 2 + F6 LOAD list. It does NOT re-audit bundled extensions. After Task 7 deploy, Special:Version should list 8 extensions: PageForms / SemanticMediaWiki / ParserFunctions / Cite / CategoryTree / TemplateData / PluggableAuth / OpenIDConnect.
- **Task 4 subagent must run the three-check verifier** before reporting back (composer platform-reqs N/A here; URL patterns against PluggableAuth 7.5.0 + OpenIDConnect 8.3.0; bundled-vs-loaded N/A). Pass the checklist explicitly into the subagent prompt.

---

## Execution shape

**Phase 3 has 6 paper tasks + 1 deploy task. Natural seam points where you should HALT for operator confirmation:**

| Task | Mode | What it does | Halt before? |
|---|---|---|---|
| 1 | inline | Add merge-plugin path entry to `composer.local.json` so jumbojett library resolves | no |
| 2 | inline | Extend `docker-compose.prod.yml` with PluggableAuth + OpenIDConnect overlay binds + four DISCORD_* env vars | no |
| 3 | inline | Add DISCORD_* template variables to `.env.prod.example` | no |
| 4 | subagent (Sonnet medium) | Extend `LocalSettings.php` with Auth + Groups + Namespace + Discord-role-sync hooks (~190 new lines) | no -- but verify subagent output cross-references against the verifier checklist |
| 5 | inline | Extend `deploy/README.md` with Phase 3 install section + image-bump amendment + Troubleshooting | no |
| 6 | inline | Update `OVERVIEW.md` to mark Phase 3 shipped | no |
| -- | commit | **Commit Tasks 1-6 to main + push** | **yes** -- show operator the staged paths + commit message before push |
| 7 | mixed | Operator-driven Unraid deploy + OAuth verification | **yes -- multi-stage; see below** |

**Commit between Task 6 and Task 7.** Paper artifacts are stable; commit them before Unraid operations begin. Suggested commit message:

```
phase(qwiki-v1-beta): Phase 3 paper artifacts -- PluggableAuth + OpenIDConnect + Discord OAuth + wiki-contributor / wiki-curator groups + D5 namespace gates

Per docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-3-auth-groups.md Tasks 1-6.
PluggableAuth pinned to REL1_43 branch HEAD (currently v7.5.0); OpenIDConnect pinned
to REL1_43 branch HEAD (currently v8.3.0); jumbojett/openid-connect-php:1.0.2
pulled via merge-plugin composer.local.json path entry. LocalSettings.php extended
with $wgPluggableAuth_Config Discord entry, wiki-contributor / wiki-curator group
permissions, $wgNamespaceProtection per D5, and LocalUserCreated / UserLoggedIn
hooks calling qwikiBetaSyncDiscordRole(). Preserves Phase 2 F6 LOAD list
(ParserFunctions / Cite / CategoryTree / TemplateData) above the new Phase 3
Extensions section. Deploy follows in same phase.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

Adjust wording to fit `git log --oneline -20` conventions. Recent commits use `phase(qwiki-v1-beta): ...` / `orchestrator(qwiki-v1-beta): ...` / `fix(qwiki-v1-beta): ...` prefixes. Include `Co-Authored-By:` footer per Phase 2 convention.

**Task 7 sub-halts.** Phase 3 deploy has 8 named steps in the Phase 3 install section of deploy/README.md plus the operator-driven V_AUTH3-6 browser flow. Halt before each of:

- **Before scp + composer run (steps 3-5):** confirm operator is ready; composer will pull jumbojett/openid-connect-php into `mediawiki-html/vendor/`. Use the F4-amended composer command with `--ignore-platform-req=ext-calendar --ignore-platform-req=ext-intl`. **Verify the Phase 3 MD's composer command in Task 5 step 5 has these flags before pasting** -- if not, halt; the MD is stale.
- **Before populating `.env` (step 4):** the four DISCORD_* values must be ready. Walk operator through. Confirm `.env` mode `0600` after edit.
- **Before container recreate (step 6):** confirms `up -d --force-recreate mediawiki nginx`. DESTRUCTIVE-equivalent in the sense that the running mediawiki container is replaced; no data loss (DB + mediawiki-html + vendor all persist via bind-mounts). Fast (~10-15s).
- **Before update.php (step 7):** DESTRUCTIVE-equivalent (writes OpenIDConnect's schema migration -- one new table `openid_connect`). Confirm operator is ready. Idempotent + re-runnable.
- **Before V_AUTH3 (operator-driven OAuth flow):** YOU CANNOT walk through the OAuth flow -- it's browser-driven in incognito by the operator. Surface the five-step V_AUTH3 checklist + the redirect-URI expectation; wait for operator's PASS/FAIL report.
- **Before V_AUTH4 (operator-driven Main edit + Template edit block):** YOU CANNOT do this; surface the checklist; operator returns PASS/FAIL.
- **Before V_AUTH5 (operator promotes test user to wiki-curator via Special:UserRights, then re-tests Template edit):** YOU CANNOT do this; surface the checklist + the Admin login URL.
- **Before V_AUTH6 (operator-discretionary; revocation test):** SKIP unless operator wants to disrupt a real Discord role. Surface as Phase 4 carry-forward if skipped.

Between halt points, run the `ssh unraid-deploy` commands directly. Capture each command's output and surface it concisely (summary unless operator asks for detail).

If a step fails:

- Consult Phase 3 MD's "Recovery" section + the deploy README's "Troubleshooting" section.
- Do NOT modify the committed paper artifacts to work around a transient issue. If the paper artifact is genuinely wrong (e.g., a Discord redirect URI typo), fix the repo file, commit the fix, scp the corrected file, retry.

---

## Phase-boundary verification (V_AUTH1 / V_AUTH2 / V_AUTH3 / V_AUTH4 / V_AUTH5 / V_OPS1; V_AUTH6 optional)

After Task 7 step 7 (update.php) completes + operator confirms the OAuth flow probes, run the phase MD's V-probes. **You run V_AUTH1 + V_AUTH2 + V_OPS1 yourself; V_AUTH3-V_AUTH6 are operator-driven** (browser-based; you can't simulate a real OAuth flow).

| Probe | Operator vs you | What it checks |
|---|---|---|
| V_AUTH1 | YOU (HTTP + browser confirmation) | PluggableAuth + OpenIDConnect loaded; Special:Version count >= 2 |
| V_AUTH2 | YOU (SQL) | OpenIDConnect schema table `openid_connect` exists |
| V_AUTH3 | OPERATOR (browser, incognito) | End-to-end Discord OAuth login + wiki-contributor auto-assignment |
| V_AUTH4 | OPERATOR | wiki-contributor CAN edit Main namespace; CANNOT edit Template namespace |
| V_AUTH5 | OPERATOR | wiki-curator (manually promoted via Special:UserRights) CAN edit Template namespace |
| V_OPS1 | YOU | Three containers still healthy after Phase 3 changes |
| V_AUTH6 | OPERATOR (optional) | Removing @wiki-beta Discord role drops wiki-contributor on next login |

Capture each operator-driven probe's PASS/FAIL by waiting for their report before declaring the phase shipped.

Also check after Task 7: Special:Version lists 8 extensions total (Phase 2's 6 + Phase 3's 2). If only 7, F6 LOAD list got silently overwritten -- HALT, root-cause, fix.

If any V-probe FAILs:

- Consult Phase 3 MD "Recovery" section + `deploy/README.md` Troubleshooting (extended in Task 5).
- Apply the recovery; re-run the probe.
- If recovery fails twice, halt + surface with the probe output + failure pattern.

---

## Halt protocol

When Phase 3 is complete (V_AUTH1 + V_AUTH2 + V_AUTH3 + V_AUTH4 + V_AUTH5 + V_OPS1 PASS; V_AUTH6 optional) OR you've hit a blocker you cannot resolve, halt with this structured status report:

```
PHASE 3 EXECUTION -- HALTING

Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

Pre-flight: PASS | <which probe or prereq failed>

Tasks shipped:
  1. composer.local.json merge-plugin entry      -- done | failed | skipped
  2. docker-compose.prod.yml PA + OIDC overlay   -- done | failed | skipped
  3. .env.prod.example DISCORD_* templates       -- done | failed | skipped
  4. LocalSettings.php Auth + Groups + Hooks     -- done | failed | skipped
  5. deploy README Phase 3 sections              -- done | failed | skipped
  6. OVERVIEW.md Phase 3 marker                  -- done | failed | skipped
  7. Unraid deploy + OAuth verification          -- done | failed | partial (which steps?)

Commit + push:
  Commit SHA: <hash>
  Pushed to origin/main: yes | no | n/a
  Files added (verify ONLY Phase 3 paths): <list>

Verification (phase boundary):
  V_AUTH1 PluggableAuth + OpenIDConnect loaded: PASS | FAIL -- <one-line detail>
  V_AUTH2 OpenIDConnect schema migrated: PASS | FAIL -- <one-line detail>
  V_AUTH3 Discord OAuth login + auto-assign: PASS | FAIL -- <one-line detail; operator-reported>
  V_AUTH4 contrib edit Main / Template block: PASS | FAIL -- <one-line detail; operator-reported>
  V_AUTH5 curator edit Template: PASS | FAIL -- <one-line detail; operator-reported>
  V_OPS1 three containers healthy: PASS | FAIL -- <one-line detail>
  V_AUTH6 revocation symmetry: PASS | FAIL | SKIPPED (operator-discretionary) -- <one-line detail>
  Special:Version extensions count: <N> (expect 8: PF + SMW + ParserFunctions + Cite + CategoryTree + TemplateData + PluggableAuth + OpenIDConnect)
  (Phase 1 V6 inherited; calendar check 2026-05-19 remains pending.)

Concerns / open questions / deviations (if DONE_WITH_CONCERNS):
  - <numbered list of items the orchestrator should triage>

Cross-phase notes (anything Phase 4 should know):
  - <numbered list; "(none)" if clean>

Next action for orchestrator:
  - <recommendation>: verify-and-proceed-to-Phase-4 | redraft-X | halt-for-operator
```

**Status taxonomy:**

- **DONE:** all tasks shipped; V_AUTH1 + V_AUTH2 + V_AUTH3 + V_AUTH4 + V_AUTH5 + V_OPS1 PASS; commit + push complete.
- **DONE_WITH_CONCERNS:** tasks shipped + load-bearing V-probes PASS, but you flagged items the orchestrator should triage (e.g., V_AUTH6 unexpectedly failed but operator chose to ship anyway; extra deploy step needed; subagent verification surfaced a concern).
- **NEEDS_CONTEXT:** you cannot proceed without information the phase MD + scaffold don't cover -- surface the gap; orchestrator provides; you resume.
- **BLOCKED:** you cannot complete the task. Triage shape (per arc-executor skill): context problem | reasoning-capability problem | task-too-large | plan-is-wrong.

Do NOT proceed to Phase 4. Halt cleanly and return control to the orchestrator session.

---

## When in doubt

- **Tempted to flip Task 4 from subagent to inline** -> don't. The auth PHP logic (Discord API call + error handling + group sync) is exactly the shape D26's subagent declaration exists for. The other 5 tasks stay inline.
- **Tempted to edit the live Unraid file directly during deploy because the repo file has a small typo** -> don't. Fix the repo file, commit, scp, retry. (F2 repair-via-re-extract pattern.)
- **Tempted to commit unrelated uncommitted files because they're in your way** -> don't. `git add` only Phase 3 paths.
- **Tempted to wait until "everything works" before committing** -> commit paper artifacts (Tasks 1-6) before Unraid operations begin. The commit is the recovery checkpoint. (F4 + F5 + F6 in Phase 2 followed this pattern; cross-phase carry-forward.)
- **Tempted to retarget the URL or SSH identity in the Phase 3 MD** -> already done by orchestrator commit `302acb3e`. If you see `wiki-beta.quake.world` or `ssh unraid` (root) in your Phase 3 MD, halt -- something is drift; report.
- **Tempted to skip operator-driven V_AUTH3/4/5 because "the HTTP probes passed"** -> don't. V_AUTH3+ exercise the full OAuth flow + group permissions which HTTP probes don't cover. Guide the operator through them; wait for their PASS/FAIL.
- **Tempted to draft Phase 4** -> halt. Phase 4 awaits per-phase approval after Phase 3 ships clean. Your job ends at Phase 3 halt protocol.
- **Tempted to write the LocalSettings.php Auth section inline despite the `subagent (Sonnet medium)` declaration** -> don't. Dispatch the subagent per D26 + the operator memory `feedback_model_effort_range.md`. Pass the verifier checklist into the subagent prompt explicitly.
- **Composer step fails at resolution** -> verify the command has `--ignore-platform-req=ext-calendar --ignore-platform-req=ext-intl` (F4 carry-forward). If the MD's command is missing those flags, the MD is stale; halt.
- **Special:Version after deploy shows < 8 extensions** -> halt. F6 LOAD list was silently overwritten. Compare LocalSettings.php on Unraid against the committed repo file; restore the F6 block; restart mediawiki; re-verify.
- **OpenIDConnect 8.3.0 returns "unable to verify id_token" at OAuth callback** -> the `issuerValidator` in LocalSettings.php must return `true` unconditionally (Discord's issuer string is non-standard; see Phase 3 MD Open Question on Discord-OIDC quirks). Walk Troubleshooting "Discord OAuth redirect errors" in deploy/README.md.
- **`autocreateaccount` permission error** -> Phase 3 grants `$wgGroupPermissions['*']['autocreateaccount'] = true` per PluggableAuth upstream docs. If this got missed in Task 4, MW will refuse to auto-provision the user record on first Discord login. Open question #5 in the Phase 3 MD names this; check LocalSettings.php after Task 4 completes.

---

*End of executor prompt. Begin pre-flight when you have read all required reads + confirmed operator-side Discord prereqs.*
