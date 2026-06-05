# Arc-orchestrator handoff -- QTV + QWFWD L1 extraction

**Arc:** `2026-06-05-qtv-qwfwd-l1-extraction`
**Routes to:** `arc-orchestrator` skill (wave 2), in a fresh terminal. Or the operator drives executor terminals manually, one per phase.
**Written:** 2026-06-05, at planning completion (all 5 phase MDs approved).

This is the orientation layer. The scaffold is the source of truth; this doc tells you what is not obvious from reading it cold.

---

## Where things are

Planning is COMPLETE. All five phase MDs are drafted, sub-agent verified, independently Explore-verified, and operator-approved. Nothing has executed yet -- these are paper plans.

**Scaffold:** `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`

| Phase | Status | MD | Deliverable | Runnable state at end |
|---|---|---|---|---|
| 0 | approved | `phase-0-schema-plumbing.md` | Migration 020 (10 CHECKs / 9 tables) + `Project` union widened + 12 `Record<Project>` sites filled | DB accepts qtv/qwfwd rows; `tsc --noEmit` green |
| 1 | approved | `phase-1-qwfwd-extractor.md` | QWFWD libclang extractor on `extractor_lib` rails + `load-version --json` load path | QWFWD L1 rows loaded + MCP-queryable; reproducible + idempotent |
| 2 | approved | `phase-2-qtv-extractor.md` | QTV native `go/ast` extractor (first non-C front-end) -> same per-type JSON, reusing Phase-1 load path | QTV L1 rows loaded + MCP-queryable; reproducible + idempotent |
| 3 | approved | `phase-3-describe-fill.md` | Per-knob `describe-fill-synthesis` (both tools), source-verified, C-vs-Go QTV guard (D6), mother-ledger | Every qtv/qwfwd knob carries a source-verified description in MCP |
| 4 | approved | `phase-4-validate-decision.md` | `validate-extractor` (Postgres) + F1 floor probes for both + the if/which concept-note decision | Both extractors validated; concept-note decision documented; arc complete |

Phases land in commit order. Each ends with a commit that leaves the system runnable (D11). The executor does NOT auto-proceed; the operator reviews at every boundary.

---

## Reads required (in order)

1. The scaffold, in the order its README prescribes: `prerequisites.md` -> `decisions.md` (13 cross-cutting decisions) -> `review-findings.md` (F1-F8 + the phase-ownership table) -> `phase-template.md` -> the per-phase MDs.
2. The approved design spec: `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` (corrected at `2b64c68e`).
3. The seed: `docs/superpowers/parking/2026-05-31-qtv-qwfwd-documentation.md` (the knob-inventory recon that started the arc).
4. Operator memory: `feedback_orchestrator_terminal_pattern`, `feedback_model_effort_range`, `feedback_no_subagents_for_mechanical_edits`, `feedback_fresh_context_for_execution`, `feedback_planning_first`, `feedback_be_decisive`, `feedback_verify_typescript`, `reference_rigor_bar_follows_consumer`.
5. `~/.claude/skills/arc-planner/references/arc-phase-archetypes.md` (verification-approach-per-phase-shape).

---

## Critical rules

**Git (operator does not touch git).** Claude runs all git silently. Commit after each phase with a one-line message (what changed + why). Push at phase boundaries / session checkpoints. At arc ship: `git tag -a arc-qtv-qwfwd-l1-shipped -m "..."`. No PR ceremony, no merge menus -- main tree, commit direct.

**The load path is `load-version --json`, never `extract-tag` (D1, F2).** Both targets are frozen vendored snapshots with no `.git`, and QTV's extractor is Go. `extract-tag.ts` cannot drive them and is intentionally `null` for both in `PROJECT_EXTRACTOR`. This was the arc's actual technical risk; Phase 1 retires it.

**No new entity types (D5).** Everything maps to cvar / command / cmdline_param / info_key. QWFWD carries all four; QTV has cvar + command only (0 cmdline_param, 0 info_key).

**Postgres only (D12, F3).** The DB is Postgres 16; `data/knowledge.db` is 0 bytes. The VALIDATION-RUNBOOK and validate-extractor skill still carry stale `sqlite3` commands -- Phase 4 already translates them, but if you touch validation, use `psql "$DATABASE_URL"` / postgres-js.

**ASCII only (D7).** No emoji, no em-dash or en-dash, ASCII hyphen-minus only. The operator runs docs-check validation that flags these.

**Concept notes: decide, do NOT author (D9).** Phase 4 produces an author/defer/drop write-up only. The operator endorsed the drafter's priors at planning approval as the executor's STARTING BIAS: (a) master-server registration/heartbeat = author (strong); (b) `parse_delay` ghosting = author-lean, defer if breadcrumbs thin; (c) `qtv_password` matrix = defer. Phase 4 Step 0 refines these against the live Phase-3 breadcrumb harvest. The FINAL call stays the operator's at execution sign-off. Authoring, if greenlit, is a SEPARATE follow-on arc.

**Phase atomicity + YES/NO verification (D11).** Every phase MD ends with copy-paste probes that return YES/NO. Run them at the boundary. Self-contained -- no probe depends on a later phase.

**Re-verify; do not trust prior-session "verified" claims.** Verify phase outputs against live source at every boundary. This arc has shown three times that an INDEPENDENT pass catches mechanism errors the drafter missed (Phase 4: a probe selected a non-existent `command_versions.description`; the real column is `help_desc`), while the OPERATOR's eyes-on catches framing/convention (Phase 1 port/ip naming; Phase 3 Probe-B). Keep that cadence: independent verifier for mechanism, operator for framing.

---

## Execution-time prerequisites (carried; NOT yet applied)

These are real and must be handled before the phase that needs them. None blocks Phase 0.

- **Before Phase 0:** `prerequisites.md` P1 -- Postgres dev container up, migrator reports `019_embedding_freshness_comments.sql` as latest (`bun db:up` + `bun db/migrate.ts`).
- **Before Phase 1:** P5 -- libclang 18 + python3-clang import clean (almost certainly already present; the ezquake/fte/mvdsv extractors run on it).
- **Before Phase 2:** P6 -- Go 1.24+ toolchain (`go version`). Phase 0 and Phase 1 do not need Go.
- **Before Phase 3:** **Q-SKILL Option A (F8)** -- widen the `describe-fill-synthesis` skill gate. `~/.claude/skills/describe-fill-synthesis/SKILL.md` line 102 hard-aborts when project is not exactly `ktx` or `mvdsv`. Widen to `{'ktx','mvdsv','qtv','qwfwd'}` and update the FOUR doc references that name only ktx/mvdsv: SKILL.md lines 4 / 53 / 354 and `references/subagent-brief-template.md:17`. This is safe-additive (cannot change ktx/mvdsv behavior); independent verification + operator eyes-on (2026-06-05) confirmed the skill has no project-branching beyond the gate. It is a shared user-global skill edit -- operator-confirmed.

No GitHub token, no Voyage/embedding key, no new env vars (prerequisites.md "Not prerequisites").

---

## Cross-phase memory you must own

The orchestrator owns state that crosses phase boundaries. Capture these or later phases break:

- **Phase 1 V4 QWFWD loaded counts** (cvar/command/cmdline_param/info_key). These are NOT hardcoded in the plan (F7: the extractor count is truth, not the design's hand-count of ~13-14 cvars / ~30 commands / 2 cmdline_param / 6 info_key). Record the actual per-type counts at the Phase-1 boundary -- they become the Phase-4 `QWFWD_FLOOR_PROBES` baselines (equality assertions).
- **Phase 2 V4 QTV counts** are known: cvar=41, command=12 (Phase-2 V4 hardcoded + grep-verified). The Phase-4 `QTV_FLOOR_PROBES` use these; the executor re-confirms against a live count.
- **Phase 3 breadcrumbs.** Phase 3 introduces a NEW convention: a `[L3 breadcrumb: <candidate>]` tag written into `entities.description_reasoning` (mother-ledger SR-5; absent from the sibling KTX/MVDSV arc). Phase 4 queries these tags as the concept-note decision's evidence. If Phase 3's harvest for candidate (b) `parse_delay`/`tick_time` comes back empty, Phase 4 defers (b) per the endorsed bias.
- **decisions.md amendments** land as dated blocks under the original decision -- never silent overrides in a phase MD (the arc-planner pattern; D8-style amendment in the sibling arc is the model).
- **New findings** append to `review-findings.md` with sequential F-numbers (next is F9) + the phase they touch.

Context budgets: all phases sit under 500k with subagent-heavy execution. Phase 3 is the heaviest -- it runs the mother-ledger pattern (D10): a mother terminal owns a living prep+learnings ledger; disposable per-batch workers (4-6 parallel `describe-fill-synthesis` invocations per wave, one knob each) read it warm and return tight deltas. Watch the mother's context; hand off to a fresh mother terminal if it enters the ~350k smell zone.

---

## First three actions

1. **Scope check.** Confirm arc identity (`2026-06-05-qtv-qwfwd-l1-extraction`); read the scaffold cold. Run prerequisites.md P1 (Postgres up + migrator at 019). Confirm the four phase-0/1 verify-checks (P2 sources present, P5 libclang) before committing to a phase-0 kickoff.
2. **Kick off Phase 0.** Open a fresh executor terminal (arc-executor, or operator-driven). Phase 0 is the self-contained horizontal foundation: migration 020 + the `Project` union widening that `tsc` then forces across 12 `Record<Project>` sites. Gate at its boundary: `bunx tsc --noEmit` green AND a DB smoke insert of a qtv/qwfwd row succeeds. Do not start Phase 1 until that boundary passes.
3. **Set up cross-phase memory capture.** Create your running orchestrator ledger; pre-note the two capture obligations above (Phase-1 V4 QWFWD counts -> Phase-4 floor baselines; Phase-3 breadcrumb harvest -> Phase-4 concept-note evidence). These are the cross-phase wires that silently break if not tracked.

---

## When in doubt

Route to the operator with concise plain-English consequences (lead with what changes / the tradeoff / the recommendation; technical chain only where it carries decision content). Specifically:

- **The concept-note FINAL author/defer/drop is the operator's call** at Phase-4 execution sign-off, not the executor's. The endorsed priors are the bias; the live breadcrumbs refine; the operator ratifies. Framing/convention is human eyes-on in this arc by established pattern.
- **A finding that conflicts with a decision:** the decision wins; reject the finding with a one-line rationale in the phase's "Open questions." If the decision itself is wrong, amend `decisions.md` first (dated block), then re-draft any downstream phase the amendment invalidates.
- **A prerequisite missing mid-phase:** halt and surface it; do not work around it (prerequisites.md footer).
- **Scope creep into a D13 non-goal** (fteqtv as a target, the web QTV viewer, re-opening MVDSV qtv_* rows, the MVDSV qtv_password trim, concept-note authoring, qtv-go predecessor): flag it, do not proceed.

---

*Plan complete. Wave-2 execution starts at Phase 0. The scaffold's README is the live status board; update its phase-index status column as phases ship.*
