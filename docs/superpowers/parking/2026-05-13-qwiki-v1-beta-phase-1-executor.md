# Phase 1 executor prompt -- qwiki-v1-beta arc

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

You are the **Phase 1 executor** for the qwiki-v1-beta arc. Your job is to ship Phase 1 (MW core substrate) end-to-end: paper-edit Tasks 1-8, deploy Task 9 against live Unraid + Cloudflare, run V1-V5 verification probes, commit + push, halt with a structured status report. You do NOT draft phases, plan future work, or touch slipgate / qw-oracle / other arcs.

---

## Arc identification

You are working in the **qwiki-v1-beta** arc (date suffix `2026-05-12-qwiki-v1-beta`).

**Tell-tale signs that you are in the WRONG arc -- halt and report if your task scope drifts into any of these:**

- `decisions.md` references D1-D17 only -> that is qw-oracle Arc 1 (this arc has D1-D26).
- Phase MDs at `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` -> qw-oracle Arc 1.
- Phase MDs at `docs/superpowers/plans/2026-05-04-qwiki-community-reference/` -> the **superseded** old qwiki-sandbox arc (pre-pivot, modernize-in-place). This arc replaces it.
- References to JSONB, pgvector, voyage-4-large, voyage-4-lite, RRF retrieval, postgres-js, Layer 2 hygiene -> qw-oracle Arc 1 terminology.
- References to "modernize-in-place", "MW 1.35 -> 1.39 chain", "clone-and-upgrade", "EQL drain" -> the pre-pivot vision. This arc is **fresh-build** (D1).

If any of those surface in your work, halt immediately and surface to operator.

---

## First action: invoke `arc-executor` skill

Before reading anything else, invoke the `arc-executor` skill. It governs your pre-flight, per-task execution per declared mode (inline vs subagent), phase-boundary verification, and structured halt-and-report.

This Phase 1 has **9 tasks, all declared `inline`** (D22 / D26). No subagent dispatch. You execute everything directly via Edit / Write / Bash.

---

## Working directory and git policy

- **Working directory:** `/home/paradoks/projects/quakeworld/` (main tree).
- **Branch:** `main`. No worktree. No PR / branch ceremony. Commit + push to `main` directly. Operator's `superpowers:finishing-a-development-branch` + `superpowers:using-git-worktrees` are overridden in `CLAUDE.md`.
- **Operator does NOT touch git** -- you run all git operations silently.
- **16 unrelated files are currently uncommitted in the tree** at session start (slipgate, qw-oracle extractor outputs, parking docs for other arcs, asset investigation findings, the superseded `qwiki-community-reference` arc). **None of them touch `apps/qwiki-sandbox/` or `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`.** When you commit Phase 1 artifacts, add ONLY the Phase 1 paths -- never `git add -A` or `git add .`. The other files belong to other arcs and operator owns the decision of when to commit them.

Specifically, your commits should `git add` only:

```
apps/qwiki-sandbox/CLAUDE.md
apps/qwiki-sandbox/README.md
apps/qwiki-sandbox/OVERVIEW.md
apps/qwiki-sandbox/deploy/docker-compose.prod.yml
apps/qwiki-sandbox/deploy/nginx.conf
apps/qwiki-sandbox/deploy/.env.prod.example
apps/qwiki-sandbox/deploy/LocalSettings.php
apps/qwiki-sandbox/deploy/README.md
```

Plus this executor prompt itself if it's still in `docs/superpowers/parking/` -- mention it in the commit but commit it separately if convenient.

---

## Where things are

**Plan scaffold:** `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`

- `README.md` -- phase index + arc status + non-goals.
- `decisions.md` -- **D1-D26 plus D2 Amendment #1 + Amendment #2** (final version pins). Walk it cold; every decision is load-bearing.
- `prerequisites.md` -- operator-side state required before Phase 1 (Unraid SSH, Cloudflare zone access, weekly Synology backup -- all already in place from prior arcs).
- `review-findings.md` -- **F1 RESOLVED** by D2 Amendment #2. No open findings against Phase 1.
- `phase-template.md` -- mandatory phase MD shape (reference; you don't draft, you ship).
- `phase-1-mw-core.md` -- **the phase MD you are executing**. ~1200 lines, 9 tasks, full file content inlined.
- `handoff-prompt.md` -- template that generated this prompt (reference only).

**Arc spec:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 LOCKED, complete 2026-05-12). The arc's strategic basis; you do not reopen it.

**Working tree the phase modifies:**

- `apps/qwiki-sandbox/CLAUDE.md` (overwrite -- Task 1)
- `apps/qwiki-sandbox/README.md` (overwrite -- Task 2)
- `apps/qwiki-sandbox/OVERVIEW.md` (overwrite -- Task 3)
- `apps/qwiki-sandbox/deploy/` (new directory; six files -- Tasks 4-8)

**Unraid-side state** (created by you during Task 9 deploy, not in git):

- `/mnt/user/appdata/qwiki-beta/` (parent directory; subdirs: `mariadb-data/`, `mediawiki-data/`, `mediawiki-html/`, `citizen/`).
- `/mnt/user/appdata/qwiki-beta/.env` (operator-authored from `.env.prod.example`, chmod 600).
- The three running containers: `qwiki-nginx`, `qwiki-mediawiki`, `qwiki-mariadb`.

**Cloudflare-side state** (created by operator via dashboard during Task 9 step 9, NOT by you):

- Tunnel public-hostname entry: `wiki-beta.quake.world -> http://192.168.1.205:8081`.

**Exemplar precedents (do NOT copy blindly; reference if you hit ambiguity):**

- `apps/qw-oracle/DEPLOYMENT.md` -- shape exemplar for the deploy README in Task 8.
- `apps/quad/DEPLOYMENT.md` -- compose-plugin caveat referenced in Task 8 troubleshooting.
- The qw-oracle Arc 1 deploy phase at `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` -- different stack, but similar nginx-on-Unraid pattern.

---

## Required reads (in order)

1. **This prompt** (you are reading it).
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` -- arc orientation; phase status; non-goals.
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- **read all of it including D2 Amendments #1 and #2**. Critical: the version pins (`mediawiki:1.43-fpm`, `mariadb:11.4`, `nginx:1.30-alpine`, Citizen `v3.16.0`) are amended values, NOT the original D2 text.
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/prerequisites.md` -- confirm operator-side state.
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md` -- F1 RESOLVED context.
6. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md` -- the plan you execute. ~1200 lines; read all of it. Tasks ship full file content inline.

You do NOT need to read Phase 2 / Phase 3 / Phase 4 MDs for this work. Their Inputs-from-previous-phase will be your Outputs-to-next-phase; verify Phase 1's Outputs section matches expected downstream input shape, but do not draft anything for Phase 2+.

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
   # Capture the SHA so you can show drift in your halt report.
   ```

2. **Confirm Phase 1 paths land where the MD says.**
   ```bash
   ls -la apps/qwiki-sandbox/
   # Expect: CLAUDE.md, README.md, OVERVIEW.md, VISION.md, dumps/ (gitignored).
   # The deploy/ subdir does NOT exist yet; Task 4 creates it.
   ```

3. **Confirm Unraid SSH still works.**
   ```bash
   ssh unraid 'echo ok'
   # Expect: ok
   ```
   If this fails, Tailscale is down or SSH config drifted -- halt; operator fixes before you proceed.

4. **Confirm no qwiki-beta directory exists on Unraid yet** (this is a fresh deploy).
   ```bash
   ssh unraid 'ls /mnt/user/appdata/qwiki-beta 2>&1'
   # Expect: "No such file or directory" (or empty if operator pre-created the dir).
   ```
   If the directory exists with content, surface to operator before destructive deploy steps -- the existing content may be a prior partial deploy attempt.

5. **Confirm Cloudflare Tunnel agent is up on Unraid** (the same `cloudflared` that fronts `oracle.slipgate.me` or equivalent).
   ```bash
   ssh unraid 'docker ps --filter name=cloudflared --format "{{.Names}} {{.Status}}"'
   # Expect: a cloudflared container shown Up (healthy).
   ```
   If no cloudflared container is running, halt -- operator wires the Tunnel agent before you proceed.

6. **Confirm the working tree's uncommitted-state shape.**
   ```bash
   git status --short
   ```
   You should see ~16 entries, none touching `apps/qwiki-sandbox/` or `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`. If any entry DOES touch those paths, halt -- there is in-flight work in your phase scope that the orchestrator was not aware of.

Report pre-flight outcome at the top of your first response (one short paragraph; PASS/FAIL per probe).

---

## Critical rules

- **ASCII only.** No emoji. No em-dash / en-dash -- use ASCII hyphen-minus. No marketing voice. Comments explain WHY, not WHAT. (D21 + operator memory.)
- **No subagents for mechanical edits.** All 9 Phase 1 tasks declare `inline` -- execute directly via Edit / Write / Bash. Subagent dispatch is for code synthesis / multi-file integration / exploratory implementation, none of which Phase 1 contains. (D22 / D26 + operator memory `feedback_no_subagents_for_mechanical_edits.md`.)
- **Per-task execution mode is final.** If a task says `inline`, run it inline. Do not "promote" to subagent for safety. The MD's full file content + verification probes are the contract.
- **Verification before completion.** Run each task's Verification block immediately after the task's steps. If a probe FAILs, do NOT proceed to the next task -- triage and either fix in place or halt + surface. (Operator memory `verification-before-completion`.)
- **Plain English at decision points.** When you halt for an operator decision (especially during Task 9 deploy), lead with the plain-English consequence + tradeoff; full technical chain only where load-bearing. (Operator memory `feedback_plain_english_at_decision_points.md`.)
- **One question at a time during interactive scoping.** If Task 9 surfaces a deploy-time question, ask ONE; do not batch-dump. (Operator memory `feedback_one_question_at_a_time.md`.)
- **No silent decision overrides.** If you find a reason to deviate from `decisions.md` D1-D26 (including amendments), STOP. Add a "Deviation" note at the top of the phase MD and surface to operator. Do NOT amend the plan mid-execution. (D25.)
- **Trust operator pace estimates.** If operator says "this should be fast" and you project slow, surface concrete blockers as they emerge -- do not pre-debate. (Operator memory `feedback_trust_operator_pace_estimates.md`.)
- **Best tool wins.** No pre-rejecting on overkill -- if the right answer is `rsync -a --delete` for the MW image-bump procedure (it is, and the MD says so), use it. (Operator memory `feedback_best_tool_no_overkill.md`.)
- **Repair via re-extract for any phase-1 deploy-time drift.** If a paper artifact turns out wrong after a partial deploy, fix the source file in `apps/qwiki-sandbox/deploy/` and `scp` the corrected file -- do NOT edit the Unraid copy in place and leave repo drifted. (Operator memory `feedback_repair_by_reextract_not_sql_update.md` -- adapted: source-of-truth is the committed repo file.)

---

## Execution shape

**Phase 1 has 9 tasks, all `inline`. Natural seam points where you should HALT for operator confirmation:**

| Task | Mode | What it does | Halt before? |
|---|---|---|---|
| 1 | inline | Overwrite `apps/qwiki-sandbox/CLAUDE.md` | no -- pure doc edit |
| 2 | inline | Overwrite `apps/qwiki-sandbox/README.md` | no -- pure doc edit |
| 3 | inline | Overwrite `apps/qwiki-sandbox/OVERVIEW.md` | no -- pure doc edit |
| 4 | inline | Create `apps/qwiki-sandbox/deploy/docker-compose.prod.yml` | no -- pure file creation |
| 5 | inline | Create `apps/qwiki-sandbox/deploy/nginx.conf` | no -- pure file creation |
| 6 | inline | Create `apps/qwiki-sandbox/deploy/.env.prod.example` | no -- pure file creation |
| 7 | inline | Create `apps/qwiki-sandbox/deploy/LocalSettings.php` | no -- pure file creation |
| 8 | inline | Create `apps/qwiki-sandbox/deploy/README.md` | no -- pure file creation |
| -- | commit | **Commit Tasks 1-8 to main + push** | **yes** -- show operator the staged paths + commit message before push |
| 9 | inline | Operator-driven Unraid deploy + CF Tunnel route | **yes -- multi-stage; see below** |

**Commit between Task 8 and Task 9.** Paper artifacts are stable; commit them before destructive Unraid operations begin so they survive even if deploy hits a snag. Suggested commit message:

```
phase(qwiki-v1-beta): Phase 1 paper artifacts -- substrate compose + nginx + LocalSettings + deploy README

Per docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md Tasks 1-8.
Three-container stack pins: nginx:1.30-alpine + mediawiki:1.43-fpm + mariadb:11.4
+ Citizen v3.16.0 (per D2 Amendment #2). Deploy follows in same phase.
```

(Adjust wording to fit the project's commit-message conventions per `git log --oneline -20`; the recent qwiki-v1-beta commits use the `plan(qwiki-v1-beta): ...` or `docs(qwiki-v1-beta): ...` prefixes. This is a `phase` since it ships the phase's paper artifacts.)

**Task 9 sub-halts.** The deploy README's first-time-deploy section is 10 steps. Halt before each of these:

- **Before step 1 (`mkdir -p` appdata tree on Unraid):** confirm operator is ready; this creates state on prod Unraid.
- **Before step 3 (operator authors `.env`):** YOU CANNOT do this for the operator -- the `.env` file holds real secrets the operator generates with `openssl rand`. Surface the exact steps + which env vars need real values + chmod 600 reminder. Wait for operator to confirm `.env` is in place before you proceed.
- **Before step 7 (run `install.php`):** DESTRUCTIVE-equivalent (writes schema to fresh DB). Confirm operator is ready. The command sources `.env` then runs `docker run --rm ... install.php ...` with the install args from the deploy README.
- **Before step 9 (add CF Tunnel route via dashboard):** YOU CANNOT do this -- only operator can configure Cloudflare via the web dashboard. Surface the exact dashboard path + the values to enter:
  - Subdomain: `wiki-beta`
  - Domain: `quake.world`
  - Service: `http://192.168.1.205:8081`
  - Pick the existing Unraid tunnel (the same one fronting other Unraid services).

Between halt points, you run the `ssh unraid` commands directly. Capture each command's output and surface it concisely (don't dump full logs -- summarize unless operator asks for detail).

If a step fails:

- Consult the phase MD's `deploy/README.md` Troubleshooting section and the phase MD's "Recovery" section.
- Do NOT modify the committed paper artifacts to work around a transient issue. If the paper artifact is genuinely wrong (e.g., a typo in `nginx.conf` that breaks `nginx -t`), fix the repo file, commit the fix, scp the corrected file, retry. Surface to operator so they understand the loop.

---

## Phase-boundary verification (V1-V6)

After Task 9 step 10 completes (operator's external browser check), run the phase MD's V1-V5 probes in order. **You run them yourself** -- do not trust an "I clicked through it and it looked OK" report alone.

| Probe | Command / action | PASS condition |
|---|---|---|
| V1 | `curl -sIL https://wiki-beta.quake.world \| head -10` | `HTTP/2 301` then `HTTP/2 200` |
| V2 | Operator opens `https://wiki-beta.quake.world` in browser | Page source contains `class="skin-citizen"` (or equivalent Citizen marker) |
| V3 | Operator opens `https://wiki-beta.quake.world/index.php?title=Main_Page&action=edit` in incognito | "you do not have permission to edit" message |
| V4 | `ssh unraid 'docker compose -f /mnt/user/appdata/qwiki-beta/docker-compose.prod.yml ps'` | all three containers `Up`; mariadb `(healthy)` |
| V5 | `ssh unraid 'set -a && . /mnt/user/appdata/qwiki-beta/.env && set +a && docker exec -e MYSQL_PWD="$MARIADB_ROOT_PASSWORD" qwiki-mariadb mariadb -uroot -e "USE qwiki_beta; SHOW TABLES;"' \| wc -l` | >= 50 |
| V6 | (Asynchronous) After next Monday 04:00 cron, confirm `qwiki-beta` is in the latest weekly tarball | `tar -tzf <latest>.tar.gz \| grep -c qwiki-beta` returns >= 1 |

V1-V5 gate Phase 1 sign-off. V6 is async -- after Phase 1 ships clean on V1-V5, log V6 as a calendar check (next Monday) but do not block Phase 2 on it.

If V1-V5 all PASS, the phase is green. Move to halt protocol.

If any V1-V5 FAIL:

- Consult phase MD "Recovery (if verification fails)" section -- it has per-probe failure-mode guidance.
- Apply the recovery; re-run the probe.
- If recovery fails twice, halt + surface with the probe output + failure pattern.

---

## Halt protocol

When Phase 1 is complete (V1-V5 PASS) OR you've hit a blocker you cannot resolve, halt with this structured status report:

```
PHASE 1 EXECUTION -- HALTING

Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

Pre-flight: PASS | <which probe failed>

Tasks shipped:
  1. CLAUDE.md rewrite                              -- done | failed | skipped
  2. README.md rewrite                              -- done | failed | skipped
  3. OVERVIEW.md rewrite                            -- done | failed | skipped
  4. docker-compose.prod.yml                        -- done | failed | skipped
  5. nginx.conf                                     -- done | failed | skipped
  6. .env.prod.example                              -- done | failed | skipped
  7. LocalSettings.php                              -- done | failed | skipped
  8. deploy README                                  -- done | failed | skipped
  9. Unraid deploy + CF Tunnel route                -- done | failed | partial (which steps?)

Commit + push:
  Commit SHA: <hash>
  Pushed to origin/main: yes | no | n/a
  Files added (verify ONLY Phase 1 paths): <list>

Verification (phase boundary):
  V1 external HTTPS: PASS | FAIL -- <one-line detail>
  V2 Citizen skin renders: PASS | FAIL -- <one-line detail>
  V3 anonymous edit blocked: PASS | FAIL -- <one-line detail>
  V4 three containers healthy: PASS | FAIL -- <one-line detail>
  V5 DB has MW schema: PASS | FAIL -- <one-line detail>
  V6 (async; next Monday): pending -- calendar check logged | not yet

Concerns / open questions / deviations (if DONE_WITH_CONCERNS):
  - <numbered list of items the orchestrator should triage>

Cross-phase notes (anything Phase 2 should know):
  - <numbered list; "(none)" if clean>

Next action for orchestrator:
  - <recommendation>: verify-and-proceed-to-Phase-2 | redraft-X | halt-for-operator
```

**Status taxonomy:**

- **DONE:** all tasks shipped; all V1-V5 PASS; commit + push complete.
- **DONE_WITH_CONCERNS:** tasks shipped + V1-V5 PASS, but you flagged items the orchestrator should triage (e.g., a verification probe needed extra recovery steps, a deploy step required undocumented operator action, a decision amendment surfaced mid-execution).
- **NEEDS_CONTEXT:** you cannot proceed without information the phase MD + scaffold don't cover -- surface the gap; orchestrator provides; you resume.
- **BLOCKED:** you cannot complete the task. Triage shape (per arc-executor skill): context problem (provide more context, resume) | reasoning-capability problem (bump model+effort) | task-too-large (split mid-phase, rare) | plan-is-wrong (escalate to orchestrator / potentially redraft).

Do NOT proceed to Phase 2. Do NOT start drafting Phase 5+ (the operator deliberately deferred those until substrate ships). Halt cleanly and return control to the orchestrator session.

---

## When in doubt

- **Tempted to dispatch a subagent for a "complex" inline task** -> don't. All 9 tasks ship full file content inline; D22 + operator memory both say no.
- **Tempted to edit the live Unraid file directly during deploy because the repo file has a small typo** -> don't. Fix the repo file, commit, scp the corrected file, retry.
- **Tempted to skip V6 or downgrade it to "monitored later"** -> that is the explicit design (V6 is async; calendar check next Monday).
- **Tempted to commit the 16 unrelated uncommitted files because they're in your way** -> don't. They belong to other arcs. `git add` only Phase 1 paths.
- **Tempted to wait until "everything works" before committing** -> commit paper artifacts (Tasks 1-8) before destructive deploy steps. The commit is the recovery checkpoint.
- **Tempted to dispatch a verification subagent at phase boundary** -> not for Phase 1. The MD's V1-V5 probes are all direct commands you run. Verification subagents are for cross-phase audits the orchestrator runs.
- **Tempted to draft Phase 2** -> halt. Phase 2 awaits per-phase approval after Phase 1 ships clean. Your job ends at Phase 1 halt protocol.

---

*End of executor prompt. Begin pre-flight when you have read all required reads.*
