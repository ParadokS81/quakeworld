# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [qw-oracle/CLAUDE.md is 192 lines (over 150 hard ceiling)](#qw-oraclecladuemd-is-192-lines-over-150-hard-ceiling) — split into Layer 2 docs next time qw-oracle gets active work
- [Execute modular keyboard panel plan](#execute-modular-keyboard-panel-plan) — 16-task plan, fresh session with subagent-driven execution recommended

---

## qw-oracle/CLAUDE.md is 192 lines (over 150 hard ceiling)

**Added:** 2026-04-14
**Status:** pending, expect to address when qw-oracle gets its next active session
**Verification first:** `wc -l apps/qw-oracle/CLAUDE.md`. If under 150, this item is resolved (someone already split it or trimmed it).

The monorepo doc philosophy puts a soft ceiling at 120 lines and a hard ceiling at 150 lines on any `CLAUDE.md`. Bloat is diagnostic: the cause is almost always a missing Layer 2 doc that should be holding the overflow content. `apps/qw-oracle/CLAUDE.md` is currently 192 lines, 28% over the hard ceiling.

The POC implementation plan at `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` includes rewriting `apps/qw-oracle/CLAUDE.md` in Task 1 as part of the three-layer scaffolding. That task will naturally trim the file AND create the Layer 2 docs (`layers/README.md`, `serve/README.md`, etc.) that should hold the content currently stuffed into CLAUDE.md.

### Fix shape

Don't split preemptively. The POC plan already handles it — Task 1 in `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` rewrites `apps/qw-oracle/CLAUDE.md` to the three-layer structure and creates the overflow docs. When that task lands, this handover item should resolve automatically. Only revisit if the POC plan stalls and qw-oracle/CLAUDE.md stays bloated for an extended period.

### Related

- The POC plan: `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` Task 1
- The doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`
- The memory: `project_doc_philosophy.md`

---

## Execute modular keyboard panel plan

**Added:** 2026-04-15
**Status:** plan committed and ready to execute; expected to need a dedicated fresh session
**Verification first:** `ls apps/slipgate-app/docs/superpowers/plans/2026-04-15-modular-keyboard-panel.md` (should exist) and `wc -l apps/slipgate-app/src/components/KeyboardLayout.tsx` (should still be ~331 lines — execution hasn't started yet if so).

The 2026-04-15 session produced a full design spec and a 16-task implementation plan for the modular right-slot keyboard feature in slipgate-app. The plan is self-contained: the ezQuake numpad key name table is baked into the plan's reference section (grepped from `apps/slipgate-app/reference/ezquake-source/src/keys.c`) so no further research is needed. Execution does not require any new research.

**Recommended execution path:** fresh session, subagent-driven development (one subagent per task, review between tasks). Per `feedback_fresh_context_for_execution.md`, wrapping the brainstorm and executing in a clean context window is the right shape for non-trivial plans. The 16 tasks are each compilable intermediate states with per-task commits, so batch execution is safe.

**Post-implementation polish not in the plan:** the plan's Task 16 is full manual verification but does not explicitly touch up `apps/slipgate-app/docs/STATE.md` or `apps/slipgate-app/docs/DESIGN.md`. Those two docs will have new facts worth a short addition after the plan ships:
- `STATE.md`: the two new `ProfilePrefs` fields `config_keyboard_right_module` and `profile_keyboard_right_module`.
- `DESIGN.md`: the two new semantic color vars (`--sg-kb-mouse-outline`, `--sg-kb-wheel-accent`) and the `.sg-config-kb-module-bar` / `.sg-keyboard-module-toggle-overlay` class patterns.

These doc updates are small enough to fold into the final wrap-up of the execution session rather than a separate task.

### Related

- Spec: `apps/slipgate-app/docs/superpowers/specs/2026-04-15-modular-keyboard-panel-design.md`
- Plan: `apps/slipgate-app/docs/superpowers/plans/2026-04-15-modular-keyboard-panel.md`
- Brief (now superseded by spec + plan): `apps/slipgate-app/docs/superpowers/plans/2026-04-15-modular-keyboard-panel-brief.md`
- Prior keyboard-panel work: `apps/slipgate-app/docs/superpowers/specs/2026-04-14-config-viewer-keyboard-panel-design.md`
- Relevant memories: `project_slipgate_architecture.md`, `project_config_architecture.md`, `feedback_fresh_context_for_execution.md`
