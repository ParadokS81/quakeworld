# qwiki-v1-beta orchestrator resume (2026-05-14)

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

The prior orchestrator session (2026-05-13/14) shipped Phase 1, captured cross-phase memory, retargeted Phase 2/3/4 MDs for the D3 URL amendment, parked the cross-project Unraid scoping convergence as a future arc, and drafted the Phase 2 executor prompt. It retired at ~350k context. You pick up here.

You are the **arc-orchestrator** for the qwiki-v1-beta arc. Invoke the `arc-orchestrator` skill. Your job is cross-phase coordination + executor-terminal dispatch + phase-boundary verification; you do NOT execute deploy commands directly.

---

## Where things are

- **Plan directory:** `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`
- **Working tree:** `/home/paradoks/projects/quakeworld/` (main branch; no worktree).
- **Live wiki:** `https://wiki.slipgate.me` (Phase 1 shipped 2026-05-14; V1-V5 PASS verified by prior orchestrator).
- **SSH identity for deploy ops:** `ssh unraid-deploy` (claude-deploy non-root user, uid 1002, scoped to `/mnt/user/appdata/qwiki-beta/`). `ssh unraid` (root) is operator-only.
- **Phase status:**
  - Phase 1 (MW core substrate): **shipped 2026-05-14** at https://wiki.slipgate.me
  - Phase 2 (Page Forms + Semantic MediaWiki): **approved + ready for executor dispatch** -- prompt at `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-phase-2-executor.md` (332 lines). Operator dispatches in a separate fresh terminal.
  - Phase 3 (PluggableAuth + Discord OAuth + groups): drafted + retargeted (F3 commit `302acb3e`); awaiting per-phase approval at Phase 3 gate.
  - Phase 4 (quality-tag categories + URL slug + harvest probe): drafted + retargeted (F3); awaiting per-phase approval.
  - Phases 5-8: NOT YET DRAFTED (intentional; draft after substrate ships).
- **Latest commit (this arc):** `adec9098` (Phase 2 executor prompt landed in parking/). Prior session commits this arc: `3ea48f5f`, `c294800d`, `21a7b7d1`, `f6d26ee6`, `81a7c94f`, `302acb3e`, `ce2834c9`, `adec9098`.

---

## What just happened (Phase 1 boundary capture)

The prior orchestrator session did the following work that you must understand before driving Phase 2:

1. **Phase 1 boundary verified clean.** V1-V5 PASS independently confirmed at `https://wiki.slipgate.me`. 59 tables in qwiki_beta; three containers Up; Citizen skin renders; anon edit blocked.
2. **D3 amendment captured** (URL `wiki-beta.quake.world` -> `wiki.slipgate.me`; dated 2026-05-14 block under D3 in `decisions.md`).
3. **F2 RESOLVED** -- Phase 1 execution-time learnings cluster (install.php GRANT 1133 + 3 minor) baked into `apps/qwiki-sandbox/deploy/README.md` patches in commit `f6d26ee6`.
4. **F3 RESOLVED** -- cross-phase hostname + SSH-identity drift in Phase 2/3/4 MDs + phase-template + phase-3-drafter-prompt + prerequisites.md retargeted via commit `302acb3e` (~50 line touches via replace_all). Phase 2 MD now reads clean; no per-prompt URL/SSH substitution needed.
5. **Cross-project Unraid scoping convergence parked** as future arc at `docs/superpowers/parking/2026-05-14-unraid-scoping-convergence.md` (commit `ce2834c9`). HANDOVER.md has the one-liner. Operator declined to preemptively write the `reference_unraid_claude_deploy_scoping.md` memory entry.
6. **V6 calendar check** added at `.claude/calendar-checks.txt` for 2026-05-19 (verify next Monday's backup tarball includes `/mnt/user/appdata/qwiki-beta/`).
7. **Phase 2 executor prompt drafted** at `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-phase-2-executor.md` (commit `adec9098`). Operator was about to dispatch.

**Operator-side state at handoff:** operator has done the first Admin login at https://wiki.slipgate.me (preparation for Phase 2's V_PF2 probe which requires a logged-in Admin in a browser to create Form:TestForm + Template:Test).

---

## Reads required (priority order)

1. This resume handoff (you are reading it).
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` -- arc index + Phase index table + "Where we are right now" block.
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D1-D26 + D2 Amendments #1 and #2 + D3 Amendment dated 2026-05-14 (URL retarget).
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md` -- F1 + F2 + F3 all RESOLVED; pre-existing F-entries are reference for ledger discipline.
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-2-extensions.md` -- the phase MD currently being executed.
6. `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-phase-2-executor.md` -- the executor prompt the operator is dispatching.
7. (When Phase 2 executor halts in the operator's other terminal) read its halt report carefully before running independent verification.

Reference reads (consult when needed):
- `docs/superpowers/parking/2026-05-13-qwiki-v1-beta-orchestrator-handoff.md` -- original orchestrator handoff (Phase 1 dispatch context; historical).
- `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md` -- Phase 1 MD (shipped state; not retargeted retroactively per D3 amendment language).
- `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-3-auth-groups.md` + `phase-4-discipline-harvest.md` -- drafted + retargeted; you dispatch them later.
- `apps/qwiki-sandbox/deploy/README.md` -- live deploy runbook with Phase 1 + post-deploy patches.

---

## Critical rules (operator-anchored)

- **No PR / branch ceremony.** Commit + push to `main` directly at phase boundary (operator git policy; superpowers PR/worktree skills overridden in CLAUDE.md).
- **No subagents for mechanical edits.** Inline edits via Edit/Write/Bash. (D22 + operator memory `feedback_no_subagents_for_mechanical_edits.md`.)
- **Plain English at decision points.** Lead with the rule + tradeoff; technical chain only where load-bearing.
- **One question at a time during interactive scoping.** Don't batch-dump.
- **ASCII only in docs and code.** (D21.)
- **Verify discipline.** Before naming a number/path/function, verify against live source. Phase 2 verification PASS claims from the executor need independent re-running (operator memory `feedback_no_inference.md` + `feedback_audit_predictions_not_contracts.md`).
- **Never `cd <current-directory>`** prefix on git commands (per CLAUDE.md) -- it triggers the upstream-PR hook false-positive. Just run git directly.
- **`git add` only qwiki-v1-beta paths** at every commit. The working tree has ~18 unrelated uncommitted files (slipgate, qw-oracle, ktx-onboarding, qwiki-community-reference, asset corpus investigations). Never `git add -A` or `git add .`.
- **Context budget.** This handoff exists because the prior session hit ~350k. Re-trigger another handoff if you approach 350k yourself; the smell-zone discipline is the load-bearing reason for orchestrator session boundaries.

---

## First three actions

1. Read this handoff (you are reading it).
2. Read the priority reads above (README + decisions.md + review-findings.md + phase-2-extensions.md + phase-2-executor-prompt parking doc).
3. Determine where the operator is:
   - If Phase 2 executor has not yet been dispatched: confirm to operator that the prompt is ready (it is, at `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-phase-2-executor.md`) and wait for executor halt before acting further.
   - If Phase 2 executor has halted in another terminal with a status report (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED): the operator pastes the halt report into this terminal. Triage per arc-orchestrator skill Step 3-6: read the report; run independent V_PF1 / V_PF2 / V_SMW1 / V_SMW2 / V_OPS1 verification yourself; capture any new cross-phase findings; update README phase index (Phase 2 -> shipped); surface orchestrator review summary to operator; on operator approval, prep Phase 3 executor prompt (Phase 3 needs the executor prompt drafted -- the existing phase-3-drafter-prompt.md is the drafter prompt, NOT an executor prompt).

---

## Verification posture for Phase 2 boundary

Phase 2's five probes (run them yourself; do not trust the executor's PASS claim alone):

- **V_PF1** Page Forms extension loaded: `ssh unraid-deploy 'curl -s -o /dev/null -w "%{http_code}\n" http://192.168.1.205:8081/index.php?title=Special:Forms'` returns `200`. Also browser-verify "Page Forms" appears in `Special:Version` Installed extensions.
- **V_PF2** Smoke-test form (operator-driven; requires Admin login at wiki.slipgate.me): Form:TestForm + Template:Test created from wikitext breadcrumbs at `apps/qwiki-sandbox/deploy/test-form/`; submission via `Special:FormEdit/TestForm` lands `TestPage` with `Test name` + `Test note` fields + `Category:Test pages`.
- **V_SMW1** SMW loaded + schema migrated: HTTP probe against `Special:Browse` returns `200`; SQL `SHOW TABLES LIKE 'smw_%'` count >= 10; browser shows SMW 6.0.x.
- **V_SMW2** SMW jobs queue drains: `docker exec qwiki-mediawiki php /var/www/html/maintenance/runJobs.php` ends with `0 failed` + exit 0.
- **V_OPS1** Three containers healthy: `docker compose ps` shows qwiki-{nginx,mediawiki,mariadb} all Up; mariadb (healthy).

Phase 1's V6 calendar check (2026-05-19) remains pending; not blocking on Phase 2.

---

## When in doubt

- **Tempted to draft Phase 5+** -> halt. Operator explicitly deferred those.
- **Tempted to retarget Phase 3/4 MDs again** -> F3 closed (commit `302acb3e`). Verify before re-doing.
- **Tempted to skip independent V-probe verification** -> don't. Executor claims are predictions; verify against live source.
- **Tempted to dispatch Phase 3 executor immediately after Phase 2 ships** -> halt for operator review at the phase boundary first. Per skill Step 6, operator decides proceed/revise/pause; orchestrator does not auto-advance.
- **Tempted to execute deploy commands directly** (docker/ssh/curl against Unraid mutating state) -> read-only verification is fine; mutating ops go through the executor terminal.
- **`gh pr create` from this terminal** -> never. No PRs for this repo; commits go straight to main per operator git policy.

---

## Outstanding memory candidates (operator approval pending)

- `reference_unraid_claude_deploy_scoping.md` -- captures the qwiki-v1-beta SSH-identity convention (claude-deploy non-root + ssh unraid-deploy alias + chowned subtree). Operator chose not to preemptively write this; details live in the parking doc at `docs/superpowers/parking/2026-05-14-unraid-scoping-convergence.md`. Defer the memory entry to whenever the convergence arc fires (or sooner if a new Unraid deploy is set up in the meantime).

If Phase 2 surfaces new durable lessons, propose memory entries for operator approval per the skill's Step 5.

---

## Tooling state at handoff

- 4 commits this orchestrator session (`81a7c94f`, `302acb3e`, `ce2834c9`, `adec9098`) all pushed to origin/main.
- Phase 1 executor session commits (`3ea48f5f`, `c294800d`, `21a7b7d1`, `f6d26ee6`) shipped 2026-05-13/14.
- Working tree has ~18 unrelated uncommitted files at handoff; none touch qwiki-v1-beta paths. Status before handoff:
  - `.claude/scripts/upstream-pr-reminder.sh`, `.claude/settings.json`
  - `apps/qw-oracle/...` (curated/asset-notes, extractor outputs, audit-loader-discovery dir)
  - `apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json`
  - Various docs/superpowers/parking docs (asset corpus, gfx corpus, skybox handoff)
  - `docs/superpowers/plans/2026-05-04-ktx-onboarding/...`
  - `docs/superpowers/plans/2026-05-04-qwiki-community-reference/...` (superseded arc; operator owns when to commit)
  - `docs/superpowers/specs/2026-05-11-slipgate-managed-mode-review-findings.md`
- Calendar check at `.claude/calendar-checks.txt`: 2026-05-19 entry for V6 backup tarball verification.
- HANDOVER.md gained one Future-arcs entry (Unraid scoping convergence) this session.
