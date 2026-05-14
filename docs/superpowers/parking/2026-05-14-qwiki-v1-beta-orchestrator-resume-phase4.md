# qwiki-v1-beta orchestrator resume -- Phase 4 prep (2026-05-14)

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

The prior orchestrator session (2026-05-14 Phase 2 + Phase 3 ride-through) shipped Phase 2 + Phase 3, captured both boundaries, drafted phase-3-executor.md + phase-4-executor.md prompts, sharpened the drafter-subagent verifier checklist from 3 to 5 checks based on F4-F9 cumulative lessons, and retired at ~400k+ context. You pick up here.

You are the **arc-orchestrator** for the qwiki-v1-beta arc. Invoke the `arc-orchestrator` skill. Your job is cross-phase coordination + executor-terminal dispatch + phase-boundary verification; you do NOT execute deploy commands directly.

---

## Operator's specific first ask

**Before dispatching Phase 4, give the Phase 4 executor prompt a cold once-over.** The prior orchestrator drafted it at ~280-400k context; a fresh terminal will catch any drift between what's promised in that prompt and what's actually in the Phase 4 MD / decisions.md / repo state. Operator wants a BLOCK / SHIP / NEEDS-EDIT recommendation before they open the executor terminal.

The prompt to once-over: `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-phase-4-executor.md` (~450 lines).

Focus the once-over on:

1. **Path correctness.** Verify every file path the prompt names actually exists (`apps/qw-oracle/scripts/load-concepts/index.ts`, `apps/qw-oracle/curated/concept-notes/README.md`, the seed-pages target locations, etc.).
2. **Phase 4 MD references.** The prompt references Phase 4 MD line numbers + section names + verification probe names (V_CAT1 / V_DOC1 / V_HARVEST1 / V_HARVEST2 / V_HARVEST3 / V_OPS1). Confirm they match `phase-4-discipline-harvest.md`.
3. **F-finding carry-forward accuracy.** Prompt claims F4-F9 do NOT bite Phase 4 (content-shape work, no infrastructure changes). Confirm by spot-checking the Phase 4 task list against each F-finding's trigger condition.
4. **Operator-side prereq surface.** Prompt names Tailscale + wiki-curator + MCP wiring + bun runtime as the only operator-side prereqs (none new beyond Phase 3). Confirm against `prerequisites.md`.
5. **No stale `wiki-beta.quake.world` / `ssh unraid` (root) references.** F3 retargeting should be clean, but verify.
6. **Halt-seam placement.** Prompt halts before Task 7 (operator wiki UI work) and Task 9 (operator CLI work). Confirm these are the right operator-driven seams.
7. **D4 Amendment 2026-05-14 ratification.** The bot-mode role sync was ratified at Phase 3 boundary. Phase 4 doesn't touch auth, but the prompt references the amendment as historical context. Verify reference accuracy.

Surface findings to operator as: SHIP (no edits needed) / NEEDS-EDIT (specific list of fixes) / BLOCK (major rework). Recommend in plain English.

Do NOT touch the prompt yourself until operator signs off on a NEEDS-EDIT or BLOCK recommendation. Once they approve fixes, edit in-place and re-commit.

---

## Where things are

- **Plan directory:** `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`
- **Working tree:** `/home/paradoks/projects/quakeworld/` (main branch; no worktree).
- **Live wiki:** `https://wiki.slipgate.me` (Phase 1+2+3 shipped 2026-05-14).
- **SSH identity for deploy ops:** `ssh unraid-deploy` (claude-deploy non-root user, uid 1002, scoped to `/mnt/user/appdata/qwiki-beta/`). `ssh unraid` (root) is operator-only.
- **Phase status:**
  - Phase 1 (MW core substrate): **shipped 2026-05-14** at https://wiki.slipgate.me. V1-V5 PASS.
  - Phase 2 (Page Forms + Semantic MediaWiki + F6 bundled-ext LOAD list): **shipped 2026-05-14**. V_PF1 / V_PF2 / V_SMW1 / V_SMW2 / V_OPS1 PASS.
  - Phase 3 (PluggableAuth + OpenIDConnect + Discord OAuth bot-mode + wiki-contributor / wiki-curator groups + D5 namespace gates): **shipped 2026-05-14**. V_AUTH1-5 PASS; V_AUTH6 optional, skipped.
  - Phase 4 (quality-tag categories + URL slug help + Layer 3 harvest verification): **approved + executor prompt drafted**, awaiting once-over (operator's first ask above).
  - Phases 5-8 (Modes vertical slice): NOT YET DRAFTED (deferred until Phase 4 ships).
- **Latest commit (this arc):** `5407d60a` (orchestrator boundary capture + Phase 4 executor prompt). Prior session commits this arc spanned `e7acd56c` through `5407d60a` (~13 commits including paper artifacts + 9 in-flight findings F4-F9 + boundary captures).

---

## What just happened (Phase 2 + Phase 3 boundary captures, this session)

The prior orchestrator session shipped two phases and captured two boundaries:

1. **Phase 2 shipped clean.** 6 paper-artifact tasks + Unraid deploy + 3 in-flight findings:
   - F4 (composer platform-req flags): composer:latest lacks ext-calendar + ext-intl; fix is `--ignore-platform-req` flags.
   - F5 (PageForms FormEdit URL): PF 5.8.1 returns HTTP 400 on `Special:FormEdit/<Form>` without explicit target-prompt; fix is target-in-URL form.
   - F6 (bundled-ext audit): the 34 MW-bundled extensions had never been audited. Resolved with LOAD/SKIP/DEFER contract; 4 activated (ParserFunctions / Cite / CategoryTree / TemplateData).

2. **Phase 3 shipped clean.** 6 paper-artifact tasks + Unraid deploy + 3 in-flight findings:
   - F7 (composer merge-plugin path visibility): composer:latest can't see sibling-overlay extension paths; fix is direct-require jumbojett at MW root.
   - F8 (PluggableAuthLogin URL form): MW emits path-info form, not query-string form; Discord registered redirect URI must match path-info exactly.
   - F9 (bot-mode role sync): OIDC_ACCESSTOKEN_SESSION_KEY stores decoded JWT payload (array), not raw Bearer token; switched to bot-mode via wiki.Quake.World bot + DISCORD_BOT_TOKEN. D4 amended 2026-05-14 to ratify.

3. **Memory entries authored / updated** (in `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/`):
   - `reference_mw_bundled_extensions_loading_pattern.md` (new)
   - `reference_mw_composer_platform_reqs.md` (new)
   - `feedback_drafter_subagent_verification_checklist.md` (new at Phase 2 boundary; SHARPENED at Phase 3 boundary from 3 to 5 checks based on F7/F8/F9 lessons)

4. **Executor prompts authored** (in `docs/superpowers/parking/`):
   - `2026-05-14-qwiki-v1-beta-phase-3-executor.md` (committed `709ee333`; used by Phase 3 executor terminal)
   - `2026-05-14-qwiki-v1-beta-phase-4-executor.md` (committed `5407d60a`; awaiting once-over per operator's first ask)

5. **D3 + D4 amendments landed in decisions.md:**
   - D3 (URL form clarification: path-info, not query-string).
   - D4 Amendment 2026-05-14 (bot-mode role sync per F9 resolution).

6. **Phase 3 cosmetic carry-forwards STILL PENDING** -- operator handles when convenient (NOT Phase 4 scope):
   - Discord username extraction: renders as literal "User" in Citizen user menu. Needs deploy-time recon of actual Discord OIDC payload before shipping a `$wgOpenIDConnect_UsernameClaim` fix. Operator can wfDebugLog the session payload once + pick the right claim.
   - `MediaWiki:Group-wiki-{contributor,curator}-member` interface-message pages: ~30 second sysop browser edits. Visit `MediaWiki:Group-wiki-contributor-member&action=edit`, type `wiki contributor`, save. Same for curator.

7. **Security hygiene queued for operator:** `MW_ADMIN_PASSWORD=Sl4ck3rs@wiki` was inadvertently exposed in the prior session's transcript (via a `.env` recovery tail-output). Operator should rotate via `Special:ChangePassword` while logged in as Admin. Bundle with the cosmetic followups if convenient. (Old OAuth Client Secret + bot token already invalidated / never leaked.)

---

## Reads required (priority order)

1. This resume handoff (you are reading it).
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` -- arc index + phase index table (Phase 1+2+3 = shipped; Phase 4 = approved; Phases 5-8 = not started).
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D1-D26 + D2 Amendments #1 + #2 + D3 Amendment + D4 Amendment 2026-05-14.
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md` -- F1-F9 all RESOLVED; the F4/F7 cluster (cross-image composer issues) and F8/F9 cluster (URL form + session storage shape) carry the durable lessons.
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-4-discipline-harvest.md` -- the phase MD Phase 4 executor will run.
6. `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-phase-4-executor.md` -- THE PROMPT TO ONCE-OVER per operator's first ask.

Reference reads (consult when needed):

- Prior resume `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-orchestrator-resume.md` -- historical (Phase 2 dispatch context).
- `docs/superpowers/parking/2026-05-14-qwiki-v1-beta-phase-3-executor.md` -- Phase 3's prompt; useful as shape-reference for the Phase 4 once-over.
- Memory entries: `feedback_drafter_subagent_verification_checklist.md` (5 checks now), `reference_mw_bundled_extensions_loading_pattern.md`, `reference_mw_composer_platform_reqs.md`.
- `apps/qwiki-sandbox/deploy/README.md` -- live deploy runbook with Phase 1+2+3 sections.
- `apps/qw-oracle/curated/concept-notes/README.md` -- the L3 authoring schema Phase 4 Task 8 ships against.

---

## Critical rules (operator-anchored)

- **No PR / branch ceremony.** Commit + push to `main` directly at phase boundary (operator git policy; superpowers PR/worktree skills overridden in CLAUDE.md).
- **No subagents for mechanical edits.** Inline edits via Edit/Write/Bash. (D22 + operator memory.)
- **Plain English at decision points.** Lead with the rule + tradeoff; technical chain only where load-bearing.
- **One question at a time during interactive scoping.** Don't batch-dump.
- **ASCII only in docs and code.** (D21.)
- **Verify discipline.** Before naming a number/path/function, verify against live source. Phase 4 executor halt PASS claims need independent re-running (operator memories `feedback_no_inference.md` + `feedback_audit_predictions_not_contracts.md`).
- **Never `cd <current-directory>`** prefix on git commands -- triggers upstream-PR hook false-positive.
- **`git add` only qwiki-v1-beta + qw-oracle-concept-notes paths** at every commit. Working tree has unrelated uncommitted files (qw-oracle parallel work, slipgate, ktx-onboarding, others). Never `git add -A` or `git add .`.
- **Context budget.** This handoff exists because prior session hit ~400k. Re-trigger another handoff if you approach 350k. Phase 4 boundary capture + Phase 5 prep would push you past safely; consider handing off after Phase 4 ships if context is tight.
- **DO NOT auto-bundle Phase 3 cosmetic followups into Phase 4 commits.** They're auth-shape work; live in a separate operator-driven polish micro-commit.

---

## First three actions

1. Read this handoff (you are reading it).
2. Read the priority reads above (README + decisions + review-findings + phase-4 MD + phase-4-executor.md).
3. **Cold once-over on phase-4-executor.md** per operator's first ask. Verify the 7 focus points above. Surface SHIP / NEEDS-EDIT (with specific list) / BLOCK recommendation in plain English. Wait for operator sign-off before any edits or dispatch.

After once-over + (if needed) edits + operator sign-off: stand by for executor dispatch. When executor halts, triage per arc-orchestrator skill Step 3-6:
- Read the halt report.
- Run independent V_CAT1 / V_DOC1 / V_HARVEST1 / V_HARVEST2 / V_HARVEST3 / V_OPS1 verification yourself.
- Capture any new cross-phase findings (F10+ if anything surfaces; expected to be minimal given Phase 4's content-shape scope).
- Update README phase index (Phase 4 -> shipped).
- Surface orchestrator review summary to operator.
- On operator approval, prep Phase 5 (drafter prompt exists at `phase-5-drafter-prompt.md`; Phase 5 MD does NOT yet exist; you'd dispatch a fresh drafter terminal first, NOT an executor).

---

## Verification posture for Phase 4 boundary

Phase 4's six probes (run them yourself; do not trust the executor's PASS claim alone):

- **V_CAT1** Three quality-tag categories exist with bodies: `curl http://192.168.1.205:8081/index.php?title=Category:Needs_review` returns 200 (same for Stale + Draft); `Special:Categories` browser-confirms all three listed.
- **V_DOC1** `Help:URL_slug_discipline` exists: HTTP 200; browser shows the 4 expected sections.
- **V_HARVEST1** Harvest probe page exists + auto-categorization works: HTTP 200; tagging `[[Category:Needs review]]` makes the page appear in `Category:Needs_review` member list; untagging removes it.
- **V_HARVEST2** load-concepts pipeline ingests `test-qwiki-harvest-probe`: zero WARN/ERROR for the slug; exit 0. (Operator-driven; you read their log report.)
- **V_HARVEST3** Oracle MCP `search_concepts` returns the harvested chunk with strong/moderate match_quality. Fallback: psql probe against `qw_oracle` Postgres. (Operator-driven; you read their MCP response.)
- **V_OPS1** Three containers healthy: `docker compose ps` shows qwiki-{nginx,mediawiki,mariadb} all Up; mariadb (healthy).

Inherited probes (don't need to re-run unless suspicious):

- Phase 1 V6 (backup tarball includes qwiki-beta): 2026-05-19 calendar check, still pending.
- Phase 3 V_AUTH6 (revocation symmetry): operator-discretionary; carries to Phase 5 spot-check if operator wants to validate.

---

## When in doubt

- **Tempted to skip the Phase 4 executor once-over and just dispatch** -> don't. Operator explicitly asked for it before firing the executor; the once-over is the contract.
- **Tempted to draft Phase 5** -> halt. Phase 5 awaits Phase 4 shipping + operator approval.
- **Tempted to bundle Phase 3 cosmetic followups into Phase 4** -> don't. They're separate scope; flag at Phase 4 halt for operator's separate polish commit.
- **Tempted to skip independent V-probe verification at Phase 4 boundary** -> don't. Executor claims are predictions; verify against live source.
- **Tempted to execute deploy commands directly** (docker/ssh/curl against Unraid mutating state) -> read-only verification is fine; mutating ops go through the executor terminal. Slight rule-bend acceptable for trivial corrective like a heredoc-broken `.env` recovery; not for routine deploy work.
- **`gh pr create` from this terminal** -> never. No PRs for this repo.

---

## Outstanding security + hygiene queue (operator-side; not your work, but track them)

1. `MW_ADMIN_PASSWORD=Sl4ck3rs@wiki` exposed in prior transcript. Rotate via `Special:ChangePassword` (Admin session) -- 30 seconds when convenient.
2. Phase 3 cosmetic followup #1: Discord username claim (renders as "User" literal). Needs OIDC payload recon to pick the right `$wgOpenIDConnect_UsernameClaim`.
3. Phase 3 cosmetic followup #2: `MediaWiki:Group-wiki-{contributor,curator}-member` interface-message pages (30 sec each in Admin browser).

These are NOT phase boundaries; they're operator-controlled hygiene tasks. If operator brings them up, walk them through; otherwise stay focused on Phase 4 boundary.

---

## Tooling state at handoff

- Commits this arc (qwiki-v1-beta paths, in order): `3ea48f5f` (Phase 1 paper), `c294800d`, `21a7b7d1`, `f6d26ee6`, `81a7c94f`, `302acb3e`, `ce2834c9`, `adec9098` (Phase 2 executor prompt), `97aec0f0`, `ce5e8d47` (HANDOVER), `e7acd56c` (Phase 2 paper), `fb1ab20c` (F4), `899010b9` (F5+F6), `709ee333` (Phase 2 boundary capture + Phase 3 executor prompt), `b34b57b0` (Phase 3 paper), `7ae5f8ee` (F7), `b85d4f94` (F8+F9), `9b63e3a9` (Phase 3 README status bump), `5407d60a` (Phase 3 boundary capture + Phase 4 executor prompt -- LATEST).
- Working tree at handoff has unrelated uncommitted files (qw-oracle parallel work, slipgate, ktx-onboarding, others); none touch qwiki-v1-beta paths or qw-oracle/curated/concept-notes/.
- Calendar check at `.claude/calendar-checks.txt`: 2026-05-19 entry for V6 backup tarball verification.
