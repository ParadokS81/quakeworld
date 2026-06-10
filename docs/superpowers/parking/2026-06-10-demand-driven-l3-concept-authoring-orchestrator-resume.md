# Orchestrator resume -- demand-driven L3 concept authoring (mid-arc, 2026-06-10)

**For:** a FRESH terminal to RESUME ORCHESTRATING this arc. Routes to `arc-orchestrator`. The prior orchestrator drove Phase 0 to ship and Phase-1 note #1 (HUD), then its context grew heavy (Phase 0 verification + the judge recalibration arc + wiki extraction + HUD + F11-F13). This hands a clean orchestrator the durable state. **Everything load-bearing is committed -- read the artifacts; do not rely on the prior session's narrative.**

## Where things are

- **Phase 0 SHIPPED** -- the machinery: anti-confab guardrail (`serve/mcp/src/orientation.ts`), the per-domain gate runner (`scripts/calibration/faq-gate/`, TRACKED), the `domain-concept-curate` skill (`~/.claude/skills/`). The gate went through three corrections, all live:
  - **F10** -- judge recalibrated to score "did it resolve the USER's question" (community resolution = one reference, not gold); judge now receives the user question. Was over-strict; fixed + validated.
  - **F11** -- top concept hit embeds the FULL note body (not a truncated snippet) in gate grounding, mirroring `get_concept_note` (commit `0ba3c840`). Verified: HUD re-gate 3/3, `hud_tracking_show` surfaced.
  - **F13** -- confab self-report now honors the alias-def-name filter (commit `e92900f7`, sibling to F8); was spuriously hard-confabbing user-alias names -> false gate fails.
- **Phase 1 IN PROGRESS** -- note-by-note, demand-tier order. **Note #1 (HUD) SHIPPED** (`curated/concept-notes/hud-configuration.md`, commit `ae2c0c75`): gated 3/3 + zero confab + operator-approved. It is the template -- decision-first (leads with the `scr_newhud` mode-gate), preferential-honesty ("this is preference" beats a fabricated "most players use X").
- **Wiki extracted + wired** -- the live quakeworld.nu wiki is at `apps/qwiki-sandbox/dumps/wiki-pages/` (9,184 `.wikitext` files, GITIGNORED, 45MB) and wired into the skill as an OPTIONAL per-page triage source (SKILL.md Step 2, beside the ezquake.com docs). Coverage is UNEVEN -- mine rich pages (Qwrookie/NQuake/mouse-polling), skip stubs (FPS.wikitext is 8 lines). Every entity still goes through L1 source-truth verification; apply OUR editorial line, do not inherit the wiki's option sprawl. (The `qwiki-analysis` Docker container holds the loaded dump if a re-extract with more namespaces is ever wanted.)
- **Branch `main`, all arc commits pushed.** A **SIBLING ARC IS ACTIVE in the same tree** (`2026-06-09-docs-quake-world`) -- it committed `743ffd17` (its Phase 3) and carries ~11 unrelated uncommitted changes (slipgate bundles, parking docs). NEVER `git add -A`; scope every add to this arc's files; verify `git diff --cached --stat` before commit.

## The two open items to carry forward

1. **F12 -- JUDGE-RIGOR GAP (open TRACK; the one real risk).** The Sonnet judge NAILs functionally-broken configs -- it pattern-matches ("self-rewriting alias + grounded commands") without tracing the state machine. Surfaced on weapon-scripts/12393 (F11 re-gate): the agent built a toggle that does NOT actually cycle, and the judge passed it. NOT an F11 regression and NOT an F10 regression -- it is the failure surface F10's "control held at PARTIAL" run happened to hide (that run's agent DECLINED to build the toggle; when it ATTEMPTS a broken one, the same recalibrated judge NAILs it). **Impact scales with construction-heaviness:** LOW for lookup/factual domains (network, demos, display -- correct cvar reports; HUD passed legitimately), HIGH for script/state-machine domains (weapon-scripts class). **Action:** a judge-hardening pass (judge traces config logic / a "does this run as described?" check, likely Opus or a dedicated step) is needed BEFORE any construction-heavy domain. Until then operator prose review is the correctness backstop -- and a gate NAILED certifies "looks right + grounded," NOT "actually runs." Tracked in `review-findings.md` F12; needs design -- do NOT inline-fix blindly.
2. **F9 -- weapon-scripts press-to-cycle gap (open; Phase-1 authoring call).** weapon-scripts.md has hold-modifier only, not the stateful press-to-cycle method; 12393 honestly PARTIALs for it. Disposition: add the method to the note, or accept it as an out-of-scope dig. Operator call, not urgent.

## Reads required (in order)

1. Scaffold: `README.md`, `decisions.md` (D1-D16 + amendment log), `review-findings.md` (F1-F13 -- esp. F9 open + F12 track), `phase-template.md`, `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md`.
2. Exemplar notes: `curated/concept-notes/weapon-scripts.md` (original template) + `hud-configuration.md` (note #1 -- decision-first + preferential-honesty exemplar).
3. The skill: `~/.claude/skills/domain-concept-curate/SKILL.md` (mode-gating scan Step 4b; decision-first + preferential-honesty draft rules; wiki triage Step 2).
4. The gate: `scripts/calibration/faq-gate/README.md` + the 4 scripts (F11 full-body in `faq-gate-retrieve.ts`; F13 fix in `faq-gate-confab.ts`).
5. Memories: `feedback_orchestrator_terminal_pattern`, `feedback_operator_not_technical_review_gate`, `feedback_model_effort_range`, `feedback_verify_dispatched_terminal_claims`, `reference_max_subscription_no_api_key`, `reference_workflow_rate_limit_and_args`, `feedback_one_at_a_time_template_first`.

## Critical rules

- **You are the technical gate; the operator reviews PROSE + intent + domain SME** -- and he sharpens the spec, not just approves (he added the preferential-honesty rule and the `scr_newhud` knowledge that shaped the HUD note). Verify EVERY executor claim against live source at the boundary.
- **Working rhythm:** ONE note at a time; each round's lesson folds into the skill BEFORE the next note; the operator paces and runs the prose gate (often via the skill's operator-consult gate mid-authoring + a final read).
- **No SDK -- Workflow `agent()` only** for gate LLM steps (no API key on this Max sub); Sonnet + low concurrency + paced; Bun not npm; 3-part `related_entities` refs; ASCII hyphens; sibling-arc guard (VitePress / build-snapshot = wrong arc).
- **Decisions + contract are law;** amend via dated blocks, never a silent override in a note or phase doc.

## First three actions

1. Read the scaffold + the two exemplar notes + the skill + `review-findings.md` F1-F13 cold.
2. Confirm git clean/pushed and the fixes are live: `grep full_note_body scripts/calibration/faq-gate/faq-gate-retrieve.ts` (F11), `grep -n collectAliasDefNames scripts/calibration/faq-gate/faq-gate-confab.ts` (F13, self-report path ~L238), `ls apps/qwiki-sandbox/dumps/wiki-pages/ | wc -l` (~9184), and that wiki triage is in SKILL.md Step 2.
3. **Drive note #2: network/connection**, then demo recording -- both technical/factual (LOW F12 risk; safe without the judge-hardening pass). Fresh executor terminal, `domain-concept-curate` via the refined skill + wiki triage, gated, operator-reviewed; verify each at the boundary against live runs (re-run the probes yourself -- don't trust "PASS"). Remaining Tier-1 after: world-rendering/brightness, textures/models, projectile/powerup cosmetics. **Onboarding DEFERRED** (moving target: hub v2 @ hub.quake.world + the operator's quake-manager replacing the nquake installer). Then Tier-2 (~10).

## When in doubt

Route to the operator with plain-English consequences at intent/SME level; decisions + contract resolve most; technical calls are yours. Track executor context; fresh-terminal handoff near ~350k. **Before any construction-heavy / script-class domain, resolve F12 (judge hardening) first.**
