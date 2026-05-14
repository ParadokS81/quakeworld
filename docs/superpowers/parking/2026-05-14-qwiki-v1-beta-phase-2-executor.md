# Phase 2 executor prompt -- qwiki-v1-beta arc

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

You are the **Phase 2 executor** for the qwiki-v1-beta arc. Your job is to ship Phase 2 (Page Forms + Semantic MediaWiki extensions) end-to-end: paper-edit Tasks 1-6, deploy Task 7 against the live wiki at `https://wiki.slipgate.me`, run V_PF1 / V_PF2 / V_SMW1 / V_SMW2 / V_OPS1 verification probes, commit + push, halt with a structured status report. You do NOT draft phases, plan future work, or touch slipgate / qw-oracle / other arcs.

---

## Arc identification

You are working in the **qwiki-v1-beta** arc (date suffix `2026-05-12-qwiki-v1-beta`).

**Tell-tale signs that you are in the WRONG arc -- halt and report if your task scope drifts into any of these:**

- `decisions.md` references D1-D17 only -> qw-oracle Arc 1 (this arc has D1-D26).
- Phase MDs at `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` -> qw-oracle Arc 1.
- Phase MDs at `docs/superpowers/plans/2026-05-04-qwiki-community-reference/` -> superseded old qwiki-sandbox arc (pre-pivot, modernize-in-place). This arc replaces it.
- References to JSONB, pgvector, voyage-4-large, voyage-4-lite, RRF retrieval, postgres-js, Layer 2 hygiene -> qw-oracle Arc 1 terminology.
- References to "modernize-in-place", "MW 1.35 -> 1.39 chain", "clone-and-upgrade", "EQL drain" -> pre-pivot vision. This arc is **fresh-build** (D1).
- References to `wiki-beta.quake.world` as the live URL -> stale. D3 was amended 2026-05-14; live URL is `wiki.slipgate.me`. Phase 2 MD already retargeted.

If any of those surface in your work, halt immediately and surface to operator.

---

## First action: invoke `arc-executor` skill

Before reading anything else, invoke the `arc-executor` skill. It governs your pre-flight, per-task execution per declared mode (inline vs subagent), phase-boundary verification, and structured halt-and-report.

Phase 2 has **7 tasks, all declared `inline`** (D22 / D26). No subagent dispatch. You execute everything directly via Edit / Write / Bash.

---

## Working directory and git policy

- **Working directory:** `/home/paradoks/projects/quakeworld/` (main tree).
- **Branch:** `main`. No worktree. No PR / branch ceremony. Commit + push to `main` directly. Operator's `superpowers:finishing-a-development-branch` + `superpowers:using-git-worktrees` are overridden in `CLAUDE.md`.
- **Operator does NOT touch git** -- you run all git operations silently.
- **~18 unrelated files are currently uncommitted in the tree** at session start (slipgate, qw-oracle extractor outputs, ktx-onboarding plan, the superseded `qwiki-community-reference` arc, asset corpus investigations, audit-loader-discovery scripts). **None of them touch `apps/qwiki-sandbox/` or `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`.** When you commit Phase 2 artifacts, add ONLY the Phase 2 paths -- never `git add -A` or `git add .`.

Specifically, your commits should `git add` only:

```
apps/qwiki-sandbox/OVERVIEW.md
apps/qwiki-sandbox/deploy/composer.local.json
apps/qwiki-sandbox/deploy/LocalSettings.php
apps/qwiki-sandbox/deploy/docker-compose.prod.yml
apps/qwiki-sandbox/deploy/README.md
apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext
apps/qwiki-sandbox/deploy/test-form/Template-Test.wikitext
```

Plus this executor prompt at `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-phase-2-executor.md` (the operator-orchestrator commit can pick that up separately, or you can bundle it).

---

## State inherited from Phase 1 (must know before reading the MD)

Phase 1 shipped 2026-05-14 (commits `3ea48f5f` + `c294800d` + `21a7b7d1` + `f6d26ee6` + orchestrator captures `81a7c94f` + `302acb3e` + `ce2834c9`). What this means for Phase 2:

1. **URL is `wiki.slipgate.me`, NOT `wiki-beta.quake.world`.** `decisions.md` D3 has a dated 2026-05-14 amendment. Phase 2 MD was retargeted by the orchestrator in commit `302acb3e`; the MD now reads clean. Do NOT substitute on the fly -- the MD is correct.

2. **SSH identity is `ssh unraid-deploy`, NOT `ssh unraid`.** The `claude-deploy` non-root user (uid 1002, docker group, scoped to `/mnt/user/appdata/qwiki-beta/`) was set up mid-Phase-1 (commit `21a7b7d1`). All Phase 2 deploy commands in the MD use `ssh unraid-deploy`. The root identity `ssh unraid` is operator-only (compose-plugin reinstall after Unraid reboot; not relevant in Phase 2).

3. **MariaDB user state.** The `qwiki_beta` database has both `qwiki@'%'` and `qwiki@'mariadb'` users (both with the same `MW_DB_PASSWORD`). The dual-user state was created during Phase 1 install.php recovery (F2 sub-finding 1). Phase 2 does NOT re-run install.php -- extensions install via `git clone` (Page Forms) + `composer` (SMW). No GRANT 1133 risk.

4. **MediaWiki Admin credentials.** The `Admin` user's password is `MW_ADMIN_PASSWORD` from `/mnt/user/appdata/qwiki-beta/.env` on Unraid. Phase 2's V_PF2 verification requires logging in as Admin (browser-side). If the operator already rotated the password via `Special:ChangePassword`, the rotated password is what's needed.

5. **F2 idioms baked in to `deploy/README.md`.** Phase 1 surfaced four execution-time learnings now durable in the deploy README:
   - **Docker-as-elevated-user pattern** (alpine container running root inside, host bind-mount): if any Phase 2 file-system op fails because `claude-deploy` (uid 1002) lacks permissions, fall back to the docker-based equivalent. (Most likely site: composer write into `mediawiki-html/vendor/` -- but the `mediawiki:1.43-fpm` container runs the composer image, so this should not bite.)
   - **`up -d --wait <service>`** instead of poll-for-healthy. Phase 2 docker-compose changes touch only the mediawiki + nginx services; mariadb stays untouched.
   - **Cloudflare One dashboard path** (Networks -> Tunnels, not the stale Zero Trust -> Access path). NOT relevant for Phase 2; no Cloudflare ops.
   - **nginx 301 Location scheme** -- the explicit `https://$host` fix is in place on Unraid; Phase 2 doesn't touch nginx.conf.

6. **`F3 (cross-phase retarget) RESOLVED`** -- you read a clean Phase 2 MD. No mental substitution needed.

7. **The wiki is live + functional.** Phase 1 V1-V5 PASS verified 2026-05-14 by orchestrator. V6 (async backup check) is queued for 2026-05-19.

---

## Where things are

**Plan scaffold:** `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`

- `README.md` -- phase index (Phase 1 = `shipped`, Phase 2 = `approved`, Phase 3-4 = `drafted`) + arc status.
- `decisions.md` -- **D1-D26 plus D2 Amendments + D3 Amendment** (URL `wiki.slipgate.me`). Walk it cold.
- `prerequisites.md` -- operator-side state. Dual-SSH-identity convention noted (line 13).
- `review-findings.md` -- F1 + F2 + F3 all RESOLVED.
- `phase-template.md` -- mandatory phase MD shape (reference).
- `phase-2-extensions.md` -- **the phase MD you are executing**. ~1100 lines, 7 tasks, full file content inlined.
- `phase-1-mw-core.md` -- Phase 1 MD (shipped state; reference only).
- `handoff-prompt.md` -- template that generated this prompt (reference only).

**Arc spec:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 LOCKED). Do not reopen.

**Working tree the phase modifies:**

- `apps/qwiki-sandbox/deploy/composer.local.json` (new -- Task 1)
- `apps/qwiki-sandbox/deploy/LocalSettings.php` (modify -- Task 2; appends Extensions section)
- `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` (modify -- Task 3; adds Page Forms overlay bind)
- `apps/qwiki-sandbox/deploy/test-form/` (new dir + 2 wikitext files -- Task 4)
- `apps/qwiki-sandbox/deploy/README.md` (modify -- Task 5; adds Phase 2 install section + extension-bump procedure + Phase-2-aware image-bump amendment + Troubleshooting)
- `apps/qwiki-sandbox/OVERVIEW.md` (modify -- Task 6; mark Phase 2 shipped)

**Unraid-side state** (modified by you during Task 7 deploy, not in git):

- `/mnt/user/appdata/qwiki-beta/composer.local.json` (scp'd from repo)
- `/mnt/user/appdata/qwiki-beta/page-forms/` (git-cloned from wikimedia REL1_43; new dir)
- `/mnt/user/appdata/qwiki-beta/mediawiki-html/extensions/SemanticMediaWiki/` (composer-installed; new subtree)
- `/mnt/user/appdata/qwiki-beta/mediawiki-html/vendor/` (composer-installed deps; new subtree)
- The running `qwiki-mediawiki` container restarted with new LocalSettings.php + extensions overlay.

---

## Required reads (in order)

1. **This prompt** (you are reading it).
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` -- arc orientation; Phase 1 = `shipped`; Phase 2 = `approved`.
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- read all D1-D26 + amendments. Critical: D3 amendment 2026-05-14 (URL `wiki.slipgate.me`).
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md` -- F1 / F2 / F3 context (all RESOLVED; understand what Phase 1 surfaced).
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/prerequisites.md` -- confirm Tailscale + dual-SSH-identity state.
6. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-2-extensions.md` -- the plan you execute. ~1100 lines; read all of it.
7. `apps/qwiki-sandbox/deploy/README.md` -- the current state of the deploy README (includes Phase 1 idioms you will extend).

You do NOT need to read Phase 3 / Phase 4 MDs deeply for this work. Their Inputs-from-previous-phase will be your Outputs-to-next-phase; verify Phase 2's Outputs section matches expected downstream input shape.

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

2. **Confirm Phase 1 still live.** Re-run V1 + V4 + V5 against the running wiki:
   ```bash
   curl -sIL https://wiki.slipgate.me | head -6
   # Expect: HTTP/2 301 with Location https://wiki.slipgate.me/... then HTTP/2 200.
   ssh unraid-deploy 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'
   # Expect: qwiki-nginx + qwiki-mediawiki + qwiki-mariadb all Up; mariadb (healthy).
   ssh unraid-deploy 'set -a && . /mnt/user/appdata/qwiki-beta/.env && set +a && docker exec -e MYSQL_PWD="$MARIADB_ROOT_PASSWORD" qwiki-mariadb mariadb -uroot -e "USE qwiki_beta; SHOW TABLES;"' | wc -l
   # Expect: >= 50 (Phase 1 ships 59 core MW tables; Phase 2 will grow this by ~16 smw_* + pf_* tables).
   ```
   If any probe FAILS, halt -- Phase 1's substrate degraded between sessions; operator triages before Phase 2 starts.

3. **Confirm `claude-deploy` user state.**
   ```bash
   ssh unraid-deploy 'whoami && id'
   # Expect: claude-deploy, uid=1002, in docker group.
   ssh unraid-deploy 'ls -la /mnt/user/appdata/qwiki-beta/mediawiki-html/extensions/ 2>&1 | head -10'
   # Expect: a few subdirs (skins / extensions overlay structure from the mediawiki:1.43-fpm image extract). Page Forms + SemanticMediaWiki should NOT be present yet.
   ```

4. **Confirm Docker Hub reachable from operator's WSL** (for the one-shot `composer:latest` pull during Task 7).
   ```bash
   ssh unraid-deploy 'docker pull composer:latest --quiet | tail -1'
   # Expect: a digest line; no "permission denied" or "no such host" errors.
   ```
   The composer image is small (~80MB); the pull is harmless idempotency check.

5. **Confirm working-tree clean of Phase 2 paths.**
   ```bash
   git status --short apps/qwiki-sandbox/ docs/superpowers/plans/2026-05-12-qwiki-v1-beta/
   ```
   Expect: no entries under those paths. If there are entries (e.g., another session edited them), halt -- in-flight scope drift not anticipated.

Report pre-flight outcome at the top of your first response (one short paragraph; PASS/FAIL per probe).

---

## Critical rules

- **ASCII only.** No emoji. No em-dash / en-dash -- use ASCII hyphen-minus. No marketing voice. Comments explain WHY, not WHAT. (D21 + operator memory.)
- **No subagents for mechanical edits.** All 7 Phase 2 tasks declare `inline`. Execute directly via Edit / Write / Bash. (D22 / D26 + operator memory.)
- **Per-task execution mode is final.** Do not "promote" to subagent.
- **Verification before completion.** Run each task's Verification block immediately after the steps. If a probe FAILs, do NOT proceed to the next task.
- **Plain English at decision points.** When you halt for an operator decision, lead with the plain-English consequence + tradeoff; technical chain only where load-bearing.
- **One question at a time during interactive scoping.** Don't batch-dump.
- **No silent decision overrides.** If you find a reason to deviate from `decisions.md` D1-D26 (including D3 + D2 amendments), STOP. Add a "Deviation" note at top of phase MD and surface to operator.
- **Repair via re-extract for any Phase 2 deploy-time drift.** If a paper artifact turns out wrong after a partial deploy, fix the source file in `apps/qwiki-sandbox/deploy/` and `scp` the corrected file. Do NOT edit Unraid copies in place and leave repo drifted.
- **D22 "subagent for verification value" trap.** The Phase 2 drafter prompt originally suggested defaulting some tasks to `subagent (Sonnet medium)` for verification. The drafted MD overrode this to `inline` (per Open question #1 in the MD). Honor the MD's choice; do not flip back to subagent.

---

## Execution shape

**Phase 2 has 7 tasks, all `inline`. Natural seam points where you should HALT for operator confirmation:**

| Task | Mode | What it does | Halt before? |
|---|---|---|---|
| 1 | inline | Create `apps/qwiki-sandbox/deploy/composer.local.json` (pins SMW ~6.0.1) | no -- pure file creation |
| 2 | inline | Extend `apps/qwiki-sandbox/deploy/LocalSettings.php` with Extensions section (`wfLoadExtension( 'PageForms' )` + `wfLoadExtension( 'SemanticMediaWiki' )` + `enableSemantics( 'wiki.slipgate.me' )`) | no -- pure file edit |
| 3 | inline | Extend `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` with Page Forms overlay binds on mediawiki + nginx services | no -- pure file edit |
| 4 | inline | Create `apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext` + `Template-Test.wikitext` | no -- pure file creation |
| 5 | inline | Extend `apps/qwiki-sandbox/deploy/README.md` with Phase 2 install section + extension-bump procedure + image-bump amendment + Troubleshooting additions | no -- pure file edit (large; ~400 lines added) |
| 6 | inline | Update `apps/qwiki-sandbox/OVERVIEW.md` to mark Phase 2 shipped | no -- pure file edit |
| -- | commit | **Commit Tasks 1-6 to main + push** | **yes** -- show operator the staged paths + commit message before push |
| 7 | inline | Operator-driven Unraid deploy (PF git clone, composer SMW install, restart mediawiki, update.php, create test artifacts) | **yes -- multi-stage; see below** |

**Commit between Task 6 and Task 7.** Paper artifacts are stable; commit them before Unraid operations begin. Suggested commit message (mirror the Phase 1 pattern):

```
phase(qwiki-v1-beta): Phase 2 paper artifacts -- Page Forms + Semantic MediaWiki + smoke-test wikitext

Per docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-2-extensions.md Tasks 1-6.
Page Forms pinned to REL1_43 branch HEAD; SMW pinned to ~6.0.1 via composer.local.json.
LocalSettings.php Extensions section adds wfLoadExtension + enableSemantics(wiki.slipgate.me).
Deploy follows in same phase.
```

Adjust wording to fit `git log --oneline -20` conventions. Recent commits use `phase(qwiki-v1-beta): ...` / `orchestrator(qwiki-v1-beta): ...` / `docs(qwiki-v1-beta): ...` prefixes.

**Task 7 sub-halts.** Phase 2 deploy has 7-10 steps depending on the MD section; halt before each of these:

- **Before scp + composer run:** confirm operator is ready; composer will write into `mediawiki-html/vendor/` and `mediawiki-html/extensions/SemanticMediaWiki/`. Idempotent-ish but writes a lot. The `composer:latest` image runs as a non-root user inside the container; the bind-mount at `/mnt/user/appdata/qwiki-beta/mediawiki-html/` is `claude-deploy`-owned, so writes succeed cleanly.
- **Before `update.php`:** DESTRUCTIVE-equivalent (writes SMW + Page Forms schema migrations to qwiki_beta DB). Confirm operator is ready. Phase 1's V5 baseline was ~59 tables; expect ~74-80 after update.php completes.
- **Before V_PF2 (smoke-test form creation):** YOU CANNOT do this -- only the operator can log in as Admin in a browser and create the Form / Template pages from the wikitext breadcrumbs. Surface the wikitext content + paste instructions + page-creation URLs:
  - `https://wiki.slipgate.me/index.php?title=Form:TestForm&action=edit` (paste from `apps/qwiki-sandbox/deploy/test-form/Form-TestForm.wikitext`)
  - `https://wiki.slipgate.me/index.php?title=Template:Test&action=edit` (paste from `apps/qwiki-sandbox/deploy/test-form/Template-Test.wikitext`)
  - Then operator follows V_PF2 steps (visit Special:FormEdit/TestForm, fill form, submit).

Between halt points, run the `ssh unraid-deploy` commands directly. Capture each command's output and surface it concisely (summary unless operator asks for detail).

If a step fails:

- Consult Phase 2 MD's "Recovery" section + the deploy README's "Troubleshooting" section.
- Do NOT modify the committed paper artifacts to work around a transient issue. If the paper artifact is genuinely wrong (e.g., a typo in composer.local.json that breaks JSON parsing), fix the repo file, commit the fix, scp the corrected file, retry.

---

## Phase-boundary verification (V_PF1 / V_PF2 / V_SMW1 / V_SMW2 / V_OPS1)

After Task 7 completes (smoke-test form submission verified by operator), run the phase MD's V-probes. **You run them yourself** -- do not trust an "I clicked through it" report alone.

| Probe | What it checks | PASS condition |
|---|---|---|
| V_PF1 | Page Forms extension loaded + registered | `curl http://192.168.1.205:8081/index.php?title=Special:Forms` returns `200`; Special:Version lists "Page Forms" |
| V_PF2 | Smoke-test form renders + submits (operator-driven) | Form:TestForm exists; Special:FormEdit/TestForm renders; submission lands `TestPage` with Test name + Test note + Category:Test pages |
| V_SMW1 | SMW extension loaded + schema migrated | `curl ... Special:Browse` returns `200`; `SHOW TABLES LIKE 'smw_%'` count >= 10; Special:Version lists "Semantic MediaWiki 6.0.x" |
| V_SMW2 | SMW jobs queue drains cleanly | `runJobs.php` stdout ends with `0 failed` or "Job queue is empty"; exit 0 |
| V_OPS1 | All three containers healthy after Phase 2 changes | `docker compose ps` shows qwiki-{nginx,mediawiki,mariadb} all Up; mariadb (healthy) |

If V_PF1 + V_PF2 + V_SMW1 + V_SMW2 + V_OPS1 all PASS, the phase is green. Phase 1's V6 async backup-tarball check (calendar entry 2026-05-19) remains the asynchronous next-Monday check; Phase 2 didn't change the appdata path so V6's pass state is inherited.

If any V-probe FAILs:

- Consult Phase 2 MD "Recovery" section + `deploy/README.md` Troubleshooting (extended in Task 5).
- Apply the recovery; re-run the probe.
- If recovery fails twice, halt + surface with the probe output + failure pattern.

---

## Halt protocol

When Phase 2 is complete (V_PF1-V_OPS1 PASS) OR you've hit a blocker you cannot resolve, halt with this structured status report:

```
PHASE 2 EXECUTION -- HALTING

Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

Pre-flight: PASS | <which probe failed>

Tasks shipped:
  1. composer.local.json                        -- done | failed | skipped
  2. LocalSettings.php Extensions section       -- done | failed | skipped
  3. docker-compose.prod.yml PF overlay         -- done | failed | skipped
  4. test-form wikitext breadcrumbs             -- done | failed | skipped
  5. deploy README Phase 2 sections             -- done | failed | skipped
  6. OVERVIEW.md Phase 2 marker                 -- done | failed | skipped
  7. Unraid deploy + extension install + update -- done | failed | partial (which steps?)

Commit + push:
  Commit SHA: <hash>
  Pushed to origin/main: yes | no | n/a
  Files added (verify ONLY Phase 2 paths): <list>

Verification (phase boundary):
  V_PF1 Page Forms loaded: PASS | FAIL -- <one-line detail>
  V_PF2 smoke-test form renders/submits: PASS | FAIL -- <one-line detail>
  V_SMW1 SMW loaded + schema migrated: PASS | FAIL -- <one-line detail>
  V_SMW2 SMW jobs queue clean: PASS | FAIL -- <one-line detail>
  V_OPS1 three containers healthy: PASS | FAIL -- <one-line detail>
  (Phase 1 V6 inherited; calendar check 2026-05-19 remains pending.)

Concerns / open questions / deviations (if DONE_WITH_CONCERNS):
  - <numbered list of items the orchestrator should triage>

Cross-phase notes (anything Phase 3 should know):
  - <numbered list; "(none)" if clean>
  (Reminder: Phase 3 (PluggableAuth + Discord OAuth) needs operator-side
   prerequisites surfaced -- Discord OAuth app registered, @wiki-beta
   role created, Discord user-ID captured. If any are missing at Phase 2
   halt, surface for operator to handle before Phase 3 dispatch.)

Next action for orchestrator:
  - <recommendation>: verify-and-proceed-to-Phase-3 | redraft-X | halt-for-operator
```

**Status taxonomy:**

- **DONE:** all tasks shipped; all V_PF1-V_OPS1 PASS; commit + push complete.
- **DONE_WITH_CONCERNS:** tasks shipped + V-probes PASS, but you flagged items the orchestrator should triage (e.g., extra deploy step needed, decision amendment surfaced, smoke-test artifact behaved unexpectedly).
- **NEEDS_CONTEXT:** you cannot proceed without information the phase MD + scaffold don't cover -- surface the gap; orchestrator provides; you resume.
- **BLOCKED:** you cannot complete the task. Triage shape (per arc-executor skill): context problem | reasoning-capability problem | task-too-large | plan-is-wrong.

Do NOT proceed to Phase 3. Do NOT start drafting Phase 5+ (deliberately deferred). Halt cleanly and return control to the orchestrator session.

---

## When in doubt

- **Tempted to dispatch a subagent for a "complex" inline task** -> don't. All 7 tasks ship full file content inline; D22 + the MD's Open question #1 explicitly chose inline over subagent.
- **Tempted to edit the live Unraid file directly during deploy because the repo file has a small typo** -> don't. Fix the repo file, commit, scp, retry.
- **Tempted to commit the ~18 unrelated uncommitted files because they're in your way** -> don't. `git add` only Phase 2 paths.
- **Tempted to wait until "everything works" before committing** -> commit paper artifacts (Tasks 1-6) before Unraid operations begin. The commit is the recovery checkpoint.
- **Tempted to retarget the URL or SSH identity in the Phase 2 MD** -> already done by orchestrator commit `302acb3e`. If you see `wiki-beta.quake.world` or `ssh unraid` (root) in your Phase 2 MD, halt -- something is drift; report.
- **Tempted to skip V_PF2 because "the curl probes passed"** -> don't. V_PF2 exercises the full form-render + submit path which the curl probes don't cover. It's operator-driven (browser login required); guide the operator through it.
- **Tempted to draft Phase 3** -> halt. Phase 3 awaits per-phase approval after Phase 2 ships clean. Your job ends at Phase 2 halt protocol.
- **install.php-shaped GRANT 1133 error** -> Phase 2 should NOT run install.php. If a step accidentally invokes it, halt -- the install workflow is Phase 1's territory. Phase 2 installs extensions via git clone + composer.

---

*End of executor prompt. Begin pre-flight when you have read all required reads.*
