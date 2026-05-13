# qwiki-v1-beta orchestrator handoff (2026-05-13)

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

The qwiki-v1-beta arc has Phases 1-4 drafted (substrate cluster). Phase 1 is approved and ready for implementation. Phases 5-8 (Modes vertical slice) are deliberately deferred -- they get drafted AFTER substrate ships, to avoid redraft risk from substrate implementation surprises (operator decision 2026-05-13).

You are the **arc-orchestrator** for this arc. Invoke the `arc-orchestrator` skill. Your job is cross-phase coordination + executor terminal dispatch; you do NOT execute deploy commands directly.

---

## Where things are

- **Plan directory:** `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`
- **Working tree:** `/home/paradoks/projects/quakeworld/` (main branch, no worktree -- per operator git policy, slipgate-app constraint also forces main-tree-only)
- **Phase status:**
  - Phase 1 (MW core substrate): **approved** -- ready for executor dispatch
  - Phase 2 (PF + SMW extensions): drafted, awaiting per-phase approval at Phase 2 gate
  - Phase 3 (PluggableAuth + Discord OAuth + groups): drafted, awaiting per-phase approval
  - Phase 4 (quality-tag categories + URL slug + harvest probe): drafted, awaiting per-phase approval
  - Phases 5-8: NOT YET DRAFTED (intentional; draft after substrate ships)
- **Latest commit:** `118186d9` -- all 4 substrate phase MDs + handoff prompts pushed to origin/main.

---

## Phase 1 specifics (your first dispatch)

- **Phase MD:** `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md` (1198 lines)
- **Deliverable:** three-container Docker stack on Unraid (`nginx:1.30-alpine` + `mediawiki:1.43-fpm` + `mariadb:11.4`) with Citizen v3.16.0 skin, Cloudflare Tunnel routing `https://wiki-beta.quake.world` -> Unraid LAN `192.168.1.205:8081`. nginx fronts static assets + fastcgi-proxies `.php` to `mediawiki:9000`.
- **Verification probes:** V1-V5 mandatory at phase boundary; V6 async (next-Monday Synology backup confirmation).
- **Prerequisites:** see `prerequisites.md`. Operator-side one-shot: Unraid SSH, Cloudflare zone access, weekly Synology backup script already in place. All inherited from prior arcs; no new setup required.
- **Open questions:** all 5 first-pass questions resolved during draft + light-review pass. No pending decisions.

---

## What you (orchestrator) own

- **Executor dispatch.** Prepare per-phase executor prompts; direct operator to open a fresh terminal for execution. Output convention: file-as-prompt at `docs/superpowers/parking/2026-05-13-qwiki-v1-beta-phase-N-executor.md`, then operator types `@<path>` as first message in fresh terminal.
- **Cross-phase memory.** Amend `decisions.md` (dated amendment block) if implementation surfaces learnings. Append to `review-findings.md` as F-numbered entries.
- **Executor-prompt augmentation.** Each executor prompt should bake in learnings from prior phases (e.g., if Phase 1 implementation surfaced an `nginx.conf` tweak, Phase 2's executor prompt notes it as baseline state).
- **Phase-boundary verification.** After each executor halts, verify outputs against live source (don't trust the executor's "verified" claim blindly).
- **Context budget tracking.** When orchestrator context approaches ~350k tokens, recommend a fresh orchestrator terminal with a session-boundary handoff doc.

---

## Reads required (priority order)

1. This handoff (you're reading it).
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md` -- arc index + Phase index table + "Where we are right now" block.
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D1-D26 + D2 amendments dated 2026-05-13 (Amendment #1 = nginx+fpm composition; Amendment #2 = MW 1.43 + MariaDB 11.4 + nginx 1.30-alpine + Citizen v3.16.0 final pins).
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md` -- the phase you're about to dispatch.
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/prerequisites.md` -- operator-side prereqs.
6. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md` -- F-finding ledger.

Phase 2/3/4 MDs are reference reads (you'll dispatch them later but don't need them deeply yet).

---

## Critical rules (operator-anchored)

- **No PR / branch ceremony.** Commit + push to `main` directly at phase boundary (operator git policy).
- **No subagents for mechanical edits.** If executor-prompt augmentation is mechanical, do it inline with Edit/Write; don't delegate.
- **Plain English at decision points.** Lead with the rule + tradeoff; technical chain only where load-bearing.
- **One question at a time during interactive scoping.** Don't batch-dump options.
- **ASCII only in docs and code** (D21).
- **Verify discipline.** Before naming a number/path/function in any output, verify against live source. Evidence first, conclusion second.

---

## First three actions

1. Read this handoff (you're reading it).
2. Read the priority-1 reads above (README + decisions.md + phase-1-mw-core.md + prerequisites.md).
3. Prepare the arc-executor prompt for Phase 1 deployment. Output as `docs/superpowers/parking/2026-05-13-qwiki-v1-beta-phase-1-executor.md` (file-as-prompt convention). Halt with the prompt path for operator review before they open the executor terminal.

---

## When in doubt

- **Tempted to execute deploy commands directly** (docker/ssh/curl against Unraid) -> don't. That's executor work. Your job is dispatch + verify.
- **Tempted to draft Phase 5+** -> halt. Operator explicitly deferred this; redraft risk from substrate implementation surprises is the reason.
- **Tempted to skip a verification probe** -> don't. V1-V5 (plus V6 async) gate Phase 1 sign-off.
- **Tempted to dispatch Phase 1 and Phase 2 executors in parallel** -> don't. Sequential with operator review at each boundary.
- **Tempted to write an "implementation plan"** as a separate artifact -> the phase MD IS the implementation plan. Executor reads it + executes.

---

## Tooling state

- All 4 substrate phase MDs committed + pushed (commit `118186d9`).
- D2 Amendment #2 final pins are reflected in README + decisions.md + all relevant drafter prompts (verified 2026-05-13).
- Light review of Phases 1-4 (2026-05-13) found GREEN across the board; cross-phase coherence verified (Phase N+1 Inputs match Phase N Outputs).
- HANDOVER.md still has a stale `community-reference` "Active arc" entry from the old arc (now superseded by this fresh-build); not load-bearing for this orchestrator session, but worth a cleanup pass at end-of-arc wrap-up.
