# KTX Onboarding -- arc-planner handoff (fresh terminal)

**For:** the next arc-planner session that scaffolds the KTX Layer 1 onboarding arc.
**Trigger to use this:** operator opens a fresh terminal and pastes this prompt, OR an arc-brainstormer-skill watcher hands off here from Pass 5 close.
**Date:** 2026-05-05.

---

## Where things are

The KTX Layer 1 Onboarding arc has completed five-pass arc-brainstorming via the arc-brainstormer skill. All passes closed. The brainstorm exits because remaining unknowns are implementation-shaped (arc-planner territory): handler dispatch internals, file paths, exact regex patterns, slicing, parallelism, etc.

**Pass close summary:**

- Pass 1 -- CLOSED 2026-05-04. Locked extraction methodology + 4 first-class entity types (cvar / command / info_key / log_template).
- Pass 2 -- CLOSED 2026-05-04. Locked the prod-MCP update lifecycle (sibling spec at `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`).
- Pass 3 -- CLOSED 2026-05-04. Schema impact for first-class types -- one CHECK widening, one drafted migration file (`008_ktx_log_template_logfile_channel.sql`).
- Pass 4 -- CLOSED 2026-05-04. Gameplay-content scope + shape decided. Group A (5 enums) + Group B (10 struct-arrays) + Group C (7 XSD events). Mixed disposition: qw-namespace for A+B, new `match_event` entity type for C.
- Pass 5 -- CLOSED 2026-05-05. Per-category gameplay-content design + handler shapes finalized.

**Total schema impact** (Pass 4+5 cumulative, three migration files):
- `entities.type` widening: +1 (`'match_event'`).
- `gameplay_entity_defs.kind` widening: +1 (`'monster'`).
- `gameplay_mechanics.kind` widenings: +7 (`'game_mode'`, `'election_type'`, `'score_system'`, `'drop_item'`, `'loc_macro'`, `'teamplay_message'`, `'mode_default'`).
- New table: `match_event_versions`.
- **9 CHECK widenings + 1 new table, split across three migrations: 008 / 009 / 010.**

**Total row impact** (per KTX tag, when extraction lands):
- Pass 1 first-class entity rows (cvars / commands / info_keys / log_templates) -- counts in the spec.
- 27 game_mode catalog rows + ~309 mode_default rows + 5 election_type + 27 death_rule + 13 monster + 3 score_system + 30 drop_item + 15 loc_macro + 21 teamplay_message = **~450 qw-namespace gameplay rows.**
- 7 match_event entity rows + 7 match_event_versions rows.

**Drain destination:** `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`. All five passes drained there. Sibling spec for Pass 2: `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`.

**This is a HEAVY arc by qw-oracle standards.** Phase count likely 6-10. Estimated work: doctrine fixes (Phase 0) + cross-header Pattern 6 extension to `extractor_lib` + Pass 1 four-first-class-entity handlers + Pass 5 four gameplay handlers + 3 migration files + 4 loader adapters + SCHEMA.md sweep + EXTRACTOR-PLAYBOOK additions + validation across all kinds. Plus the standard validation runbook + cross-project audit.

The arc has natural slicing points:
1. Doctrine fixes (Phase 0): OVERVIEW.md / EXTRACTOR-PLAYBOOK.md / CLAUDE.md / memory all need "KTX uses tree-sitter" -> "KTX uses libclang" corrections. Independent.
2. Shared-infrastructure lift: extend Pattern 6 (`extractor_lib._source`) to walk `#include`d headers, depth-1. Prerequisite for `_handler_modes.py`.
3. Migration file landing: 008 (Pass 3) + 009 (entities.type + match_event_versions) + 010 (gameplay kind widenings).
4. Handler implementation per group (4 handlers, can land in parallel after migrations).
5. Loader adapter implementation per type (4 adapters).
6. Validation runbook: cvarlist / cmdlist diff + per-kind row-count probes + JSONB-binding regression gate.
7. SCHEMA.md sweep + EXTRACTOR-PLAYBOOK additions (end-of-arc).

---

## Reads required

Mandatory before opening arc-planner work:

1. **`docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`** -- the closed five-pass spec. THE source of truth for what's locked.
2. **`docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`** -- Pass 2 sibling spec; describes the canonical Layer 1 update lifecycle that arc execution will use.
3. **`apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`** -- handler conventions; Pattern catalog; three-tier handler architecture; cross-codebase port pattern (KTX is a port, not a fork).
4. **`apps/qw-oracle/scripts/extractors/extractor_lib/_source.py`** + `_visitor.py` + `clang_config.py` -- what gets touched by the cross-header Pattern 6 extension.
5. **`apps/qw-oracle/SCHEMA.md`** -- v14 game-mechanics tables (qw-namespace), v15+ per-version table convention, v17 `all_call_sites_json` shape (precedent for `match_event_versions.emission_call_sites_json`).
6. **`apps/qw-oracle/db/migrations/`** -- existing migration files (007 latest committed; 008 drafted-but-uncommitted per Pass 3).
7. **`apps/qw-oracle/scripts/load-knowledge/`** -- existing loader adapters (`load-cvars.ts`, `load-log-templates.ts` -- the latter is the closest precedent for `load-match-events.ts`).
8. **`apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py`** -- closest precedent for `_handler_match_events.py` (two-stage / mixed-source pattern).
9. **`apps/qw-oracle/scripts/extractors/qw/extract.py`** -- existing qw-namespace extractor (id1 baseline gameplay rows). KTX gameplay extraction lands alongside, using the same v14 polymorphic tables.
10. **`apps/qw-oracle/CLAUDE.md`** -- always-on rules (postgres-js JSONB binding gotcha; bun-runtime; idempotent loader; regression-guard).

Optional but useful:
- **`docs/superpowers/parking/2026-05-04-ktx-onboarding-pass5-handoff.md`** -- the prior pass's handoff for context on the brainstorm's overall arc.
- **`docs/superpowers/parking/2026-05-04-ktx-onboarding-pass4-handoff.md`** -- Pass 4's handoff.
- **`/tmp/qwiki-snapshot/articles/`** -- quakeworld.nu wiki rip (9173 articles); useful when authoring Layer 3 concept-note candidates for mutators.
- **KTX source files** (per spec sections):
  - `commands.c` -- `um_list[]` catalog, all `_um_init` const char[] arrays, gameplay-table extraction sites.
  - `world.c` -- cvar registrations including all 8 mutator cvars + race + bloodfest.
  - `race.c` -- ToggleRace, race_settings[], scoring_systems[].
  - `sp_monsters.c` -- bloodfest_monster_array[].
  - `teamplay.c` -- locmacros[], messages[].
  - `match.c` -- berzerk mechanics, mutator-state resets.
  - `items.c`, `combat.c`, `client.c`, `logs.c` -- match_event emission sites.
  - `include/g_local.h` -- UM_* flags, electType_t, LGCMODE_VARIABLE / TOT_MODE_VARIABLE.
  - `include/deathtype.h` -- deathType_t X-macro.
  - `include/progs.h` -- electType_t.
  - `resources/extralog/ktxlog_0.1.xsd` -- 7 match-event types.

---

## Critical rules

- **ASCII only** in all output (operator preference -- em dash / smart quotes forbidden in code + shared docs).
- **Plain English first; technical chain second.** When asking the operator to approve a plan slice or phase shape, lead with plain-English summary; put SQL DDL / handler internals / file diffs in the drained plan where they belong.
- **Be decisive.** Recommend, don't poll.
- **Verification first.** When proposing handler scope, file paths, or pattern reuse, verify against the spec + against actual KTX source (read the code, walk the struct-arrays) before recommending. Pass 4 had several spec-sketch corrections that surfaced via Pass 5's source spike (`_um_init` arrays are literal char[] not functions; Berzerk + KillQuad + FreshTeams + NoSweep promotion path; row-count corrections on multiple kinds). Continue that discipline at planning time.
- **Pass 1-5 decisions are LOCKED.** Don't relitigate. If a planning question contradicts a brainstorm commitment, surface the conflict explicitly before relitigating.
- **No subagents for mechanical markdown edits** (operator memory `feedback_no_subagents_for_mechanical_edits.md`). When the plan ships full file content / per-file diffs inline, execute directly with Edit/Write/Bash. Subagents are for genuine context-bearing work or parallel research.
- **JSONB binding discipline** (operator memory `feedback_postgres_js_jsonb_binding.md`): pass JS arrays/objects directly to postgres-js or wrap with `tx.json(...)`; NEVER pre-stringify. Probe `F1.jsonb_columns_not_strings` is the regression gate; per-handler JSONB columns include `attributes_json`, `emission_call_sites_json`, `props_json`, `ruleset_gate_json`.
- **Idempotency gate** (operator memory `feedback_idempotency_before_staleness.md`): all three migrations + all loader adapters must be idempotent. Re-run on already-loaded data is a no-op + identical outcome.
- **Regression guards are load-bearing** -- `load-version` aborts when entity counts drop >50% without `--force`. Don't bypass.
- **Six-artifact arc scaffold** (per `superpowers:writing-plans` + `arc-planner` skill): decisions.md / review-findings.md / prerequisites.md / phase-template.md / handoff-prompt.md / README. Build all six during scaffold step, before drafting per-phase MDs.

---

## First three actions

1. Read the ten docs in the Reads-required list. Read in parallel where possible. Particularly: spec end-to-end (~1100 lines, dense). Then EXTRACTOR-PLAYBOOK + SCHEMA.md.
2. State the arc scope plainly to the operator: "Starting KTX Layer 1 onboarding arc-planning. Five-pass brainstorm closed; spec at `2026-05-04-ktx-onboarding-design.md`. Building the six-artifact arc scaffold + slicing analysis. Estimated 6-10 phases. Phase 0 = doctrine fixes; subsequent phases = shared-infra lift, three migrations, four extractors, four loaders, validation, end-of-arc obligations."
3. Run slicing analysis per the `arc-planner` skill: per-phase verification regime, per-phase context budget estimate, per-task execution mode (subagent + model + effort | inline) with rationale. Surface to operator for approval before drafting per-phase MDs.

---

## When in doubt

Ask the operator. The spec is the source of truth; if a planning question contradicts the spec, halt and surface. If a phase scope balloons during slicing analysis, propose splitting before proceeding.

If a sub-question turns out to be brainstorm-shaped (a NEW shape question, not implementation-shaped), surface explicitly: "this is a shape question, not a planning question. Want to re-open arc-brainstormer for one more pass?"

If you find yourself proposing functional changes that aren't in the spec, halt -- spec is locked. Surface to operator and update spec via amendment if approved.

---

## Tracking

Open task list at Pass 5 close:

| ID | Task | Status |
|---|---|---|
| 1 | Pass 5 -- per-category gameplay-content design + handler shapes | COMPLETED |

arc-planner should claim a fresh task tracking the six-artifact scaffold + slicing analysis as it opens.

---

## After arc-planner closes

The arc-planner skill produces the six-artifact scaffold + per-phase MDs. After scaffold:

1. Operator reviews the scaffold + slicing analysis. Pushback on phase boundaries / verification regime / execution-mode-per-task happens here.
2. Once scaffold is approved, arc-orchestrator opens (separate fresh terminal; operator-triggered when ready to ship).
3. Each phase runs under arc-executor (per-phase fresh terminal).
4. After all phases ship, arc-reviewer audits the arc cold (separate fresh terminal) -- spec-vs-shipped walkthrough.

The spec drives all four downstream skills. Do not lose the spec.
