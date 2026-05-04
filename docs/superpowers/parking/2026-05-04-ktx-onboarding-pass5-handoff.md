# KTX Onboarding -- Pass 5 handoff (fresh terminal)

**For:** the next arc-brainstormer session that opens Pass 5 (per-category gameplay-content design + extraction-handler shapes).
**Trigger to use this:** operator opens a fresh terminal and pastes this prompt, OR an arc-brainstormer-skill watcher hands off here from Pass 4 close.
**Date:** 2026-05-04.

---

## Where things are

The KTX Layer 1 Onboarding arc is brainstorming via the arc-brainstormer skill. Four passes closed:

- Pass 1 -- CLOSED 2026-05-04. Locked extraction methodology + 4 first-class entity types (cvar / command / info_key / log_template).
- Pass 2 -- CLOSED 2026-05-04. Locked the prod-MCP update lifecycle (sibling spec at `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`).
- Pass 3 -- CLOSED 2026-05-04. Schema impact for first-class types -- one CHECK widening (`log_template_versions.channel` admits `'logfile'`), one migration file (`008_ktx_log_template_logfile_channel.sql`), SCHEMA.md sweep linked as end-of-arc obligation.
- Pass 4 -- CLOSED 2026-05-04. Gameplay-content scope + shape. Five sub-questions locked. Total Pass 4 schema impact: 8 CHECK widenings + 1 new table. Total row impact: ~136 qw-namespace gameplay rows + 7 match_event rows per KTX tag. Spec drained at `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` (Pass 4 section). Commit: `b352c13`.
- **Pass 5 -- NEXT. This handoff opens it.** Per-category gameplay-content design + extraction-handler shapes.

**Pass 5 scope (from Pass 4 carry-forwards):**

Pass 4 LOCKED the shape (which kinds, which tables, which gates). Pass 5 fills in the per-category implementation-shape: how each kind's rows are EXTRACTED from KTX source, what their final `props_json` field set is, and what migration files actually need to land. This is closer to arc-planner territory than earlier passes -- the brainstorm exits when remaining unknowns are arc-planner-shaped (handler dispatch, file paths, etc.).

Sub-question piles to settle:

- **5.1 -- `race` mode disposition.** Pass 4.2 locked the 17-row catalog from `um_list[]` (`commands.c:4527-4546`). The `race` command (`commands.c:695`) calls `ToggleRace` (separate code path; not in `um_list[]`). Question: is `race` an 18th catalog row in its own right, or does it sit outside the catalog entirely (race-mode rules gated some other way)? Brief source spike -- read `ToggleRace`, see if there's a UserModes_t / um_list[] equivalent. Likely a 5-minute settle.

- **5.2 -- Per-`_um_init` extraction shape.** This is the load-bearing Pass 5 sub-question. Each user-facing mode's `_um_init` function (e.g. `_2on2_um_init`, `wipeout_um_init`, `carena_um_init`) sets up the mode's rules via cvar writes + helper calls (e.g., `cvar_set("k_membercount", "2"); cvar_set("teamplay", "2"); ...`). To populate per-mode `gameplay_mechanics` rows (gated `{"mode":"<token>"}`) with the actual rule values, the handler needs to walk these function bodies. Sub-questions:
  - Scope of extraction: every `cvar_set` call inside `_um_init`? Only specific cvars (k_*-prefixed)? Helper calls into `match.c` / `world.c` (e.g. `setup_default_cvars()`)?
  - One row per cvar-set, or one composite row per `_um_init` summarising the rule changes?
  - What about static-config strings (the cmd_to_um shows tot mode loads `"k_tot_mode 1\nmaxclients 9\nteamplay 0\ntimelimit 5\n"` -- a literal config string)? Each line a row, or rolled up?
  - How deep does extraction go (one-level helper-call resolution, or recursive)?
- **5.3 -- Handler architecture.** Pass 4 created 7 distinct kinds across two qw-namespace tables (gameplay_entity_defs.kind in {monster}; gameplay_mechanics.kind in {game_mode, election_type, score_system, drop_item, loc_macro, teamplay_message}) plus 25 deathType_t death_rule rows + 5+ election_type rows + the new match_event entity type. Architectural choice: one combined `_handler_gameplay.py` (cross-kind walker that dispatches on struct-array name to kind), one handler per kind (~7 separate Python files), or some hybrid? Trade-offs around shared INIT_LIST_EXPR walkers vs per-kind specialization. Pattern reuse from existing handlers (Pattern 4 INIT_LIST_EXPR walks; Pattern 6 #define resolution).

- **5.4 -- Per-kind props_json field finalization.** Pass 4 sketched props_json shapes ("at minimum"); Pass 5 walks each source table once more and locks the final field set. Particularly:
  - `monster` (bloodfest_monster_t): full per-row field walk including any source-comment-harvested annotations.
  - `teamplay_message` (teamplay_message_t): handler-function names need source-citation + any banner-comment harvest from the handler implementations.
  - `score_system` (race_score_system_t): the 10-element points array -- preserve as JSON int array, validate every row has exactly 10 elements.
  - `drop_item` (dropitem_spawn_t): spawn_flag macro values -- need #define resolution per Pattern 6 (e.g., `H_ROTTEN`, `H_MEGA`, `WEAPON_BIG2`).
  - `loc_macro` (locmacro_t): the related_item join target (each macro might map to a known item / weapon canonical_id).
  - `game_mode` catalog: `game_type` field values per mode (Pass 4.3 listed informed-best-guess; verify by reading each `_um_init` to confirm `k_mode` setting).
  - `match_event`: emission_call_sites_json -- mechanical grep over `items.c` / `combat.c` / `client.c`, locked.

- **5.5 -- Migration files and ordering.** Pass 3 already drafted `008_ktx_log_template_logfile_channel.sql`. Pass 4 locked 7 more CHECK widenings (1 on entities.type, 1 on gameplay_entity_defs.kind, 5 on gameplay_mechanics.kind) + 1 new table (`match_event_versions`). Sub-questions:
  - Single migration `009_ktx_gameplay_schema.sql` covering all 7 widenings + the new table, or split per concern (e.g., 009 entities.type widening + match_event_versions table; 010 gameplay_*.kind widenings)?
  - Lex-ordering and migrator constraints: latest committed migration is 008 (Pass 3 draft); 009/010 land here.
  - Migrator behavior on adding values to existing CHECK constraints: standard ALTER TABLE DROP CONSTRAINT + ADD CONSTRAINT pattern (per Pass 3.1 precedent).
  - Validation queries: post-migration probes that confirm the CHECK admits the new values (regression gate for the migrator's own correctness).

- **5.6 -- match_event handler architecture detail.** Pass 4.5 locked the row shape and named the two-stage approach (XSD parse + emission-site grep). Pass 5 specifies: which Python XML library (xml.etree vs lxml -- lxml requires extra install, xml.etree is stdlib), exact glob pattern for emission sites, output file convention. This is a 30-minute settle.

**Drain destination for Pass 5:** the existing KTX onboarding spec at `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`, new "Pass 5" section under Pass 4's. If 5.2 (`_um_init` extraction shape) genuinely outgrows the spec into its own design doc, surface that mid-pass.

**Pass 5 weight:** medium. 5.2 is heavy; 5.1 / 5.3 / 5.5 / 5.6 are bounded. 5.4 is a careful walk. Realistic target: settle all sub-questions in one focused session unless 5.2 balloons -- in which case split off `_um_init` extraction shape as its own sub-spec.

**After Pass 5 closes:** the brainstorm exits. The arc-planner takes over and scaffolds the six-artifact arc (decisions.md / review-findings.md / prerequisites.md / phase-template.md / handoff-prompt.md / README) using the spec as input. Pass 5 close should produce an arc-planner-handoff parking doc (`2026-05-04-ktx-onboarding-planner-handoff.md`) per arc-brainstormer skill convention.

---

## Reads required

Mandatory before opening Pass 5:

1. **`docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`** -- the closed Pass 1/2/3/4 spec. Pass 5 reads back the locked shape decisions per kind. Source-of-truth for what's already settled.
2. **`apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`** -- handler conventions, especially Pattern 4 (INIT_LIST_EXPR walks for struct-literal arrays) and Pattern 6 (same-file #define resolution). Pass 5 handler-architecture decisions reuse these patterns.
3. **`apps/qw-oracle/scripts/extractors/extractor_lib/`** -- shared infra (`_resolve.py` for fn-ref resolution, `_cvar_shared.py` for cvar parsing helpers, `_source.py` for string-shape helpers). Pass 5 handler dispatch decisions ride on what's already lifted into the shared lib.
4. **`apps/qw-oracle/SCHEMA.md`** -- the qw-namespace tables (v13/v14) plus v15+ per-version table conventions. Pass 5's match_event_versions table mirrors v15's per-version-table shape.
5. **`apps/qw-oracle/db/migrations/`** directory -- list of existing migrations (latest is Pass 3's `008_ktx_log_template_logfile_channel.sql`). Pass 5 numbers new migrations starting at 009.
6. **`apps/qw-oracle/CLAUDE.md`** -- always-on rules.
7. **`docs/superpowers/parking/2026-05-04-ktx-onboarding-pass4-handoff.md`** -- the prior pass's handoff for context on the brainstorm's overall arc.

Optional but useful:
- `apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py` -- existing log_template handler; useful precedent for the match_event two-stage handler design.
- `apps/qw-oracle/scripts/extractors/qw/extract.py` -- the existing qw-namespace extractor (id1 baseline gameplay_entity_defs / gameplay_mechanics rows). KTX gameplay extraction will live alongside or build on this.
- KTX source files -- `match.c`, `commands.c`, `world.c`, `race.c`, `sp_monsters.c`, `teamplay.c`, `vote.c`, `items.c`, `combat.c`, `client.c`, `bot_*.c`, `logs.c`, `stats.c`, `stats_xml.c` -- spike-walk per sub-question.

---

## Critical rules

- **ASCII only** in all output (operator preference -- em dash / smart quotes forbidden in code + shared docs).
- **Plain English first; technical chain second.** When asking the operator to approve a decision, lead with the plain-English summary of what's being decided. Put SQL DDL, JSON schemas, full column lists in the drained spec where they belong. Don't dump implementation detail into the conversation when the load-bearing decision is at the design-intent level.
- **One sub-question per topic during the pass body.**
- **Be decisive.** Recommend, don't poll.
- **Verification first.** When proposing handler scope or extraction depth, verify against actual KTX source (read `_um_init` functions, walk struct-array declarations, check helper-call chains) before recommending.
- **Pass 4 decisions are LOCKED.** The 7 new kind values, the match_event entity type, the qw-namespace dispositions for Group A/B/C -- these are durable. If a Pass 5 question contradicts a Pass 4 commitment, surface the conflict explicitly before relitigating.
- **Resist drift into actual implementation.** Pass 5 designs SHAPE for handlers (architecture, scope, output filename, libraries used). It does NOT write the handler code. arc-planner scaffolds; arc-executor writes.
- **Pass 5 should produce an arc-planner-handoff** at `docs/superpowers/parking/2026-05-04-ktx-onboarding-planner-handoff.md` on close. That handoff routes the arc to the arc-planner skill in a fresh terminal.

---

## First three actions

1. Read the seven docs in the Reads-required list. In parallel.
2. State the pass-5 scope plainly to the operator: "Starting Pass 5 -- per-category gameplay-content design + handler shapes. Drain destination is the KTX onboarding spec. Six sub-questions: race mode disposition, per-_um_init extraction shape, handler architecture, per-kind props_json finalization, migration files, match_event handler details. After Pass 5 closes the brainstorm exits and arc-planner takes over."
3. Open with sub-question 5.1 -- the lightest one. **Is `race` an 18th catalog row, or does it sit outside `um_list[]`?** Quick spike of `ToggleRace` and surrounding race-mode setup code; settle in 5 minutes; move to 5.2.

---

## When in doubt

Ask the operator. Pass 5 is bounded but per-sub-question depth varies. If 5.2 (`_um_init` extraction shape) reveals layered complexity (helper-call chains that go 3+ levels deep, or extraction scope that touches files beyond the per-mode init), surface explicitly: "this is bigger than I expected; want me to split off `_um_init` extraction as its own sub-spec, or fold a smaller scope?"

If a sub-question turns out to be implementation-shaped rather than design-shaped (e.g., "should the handler use a Python set for dedup or a list?"), explicitly route it to arc-planner: "that's a planner decision; deferring."

If you find yourself naming function signatures, exact regex patterns, or specific test cases -- HALT. That's drift past the shape lock. Refocus on architecture-level decisions or exit Pass 5 if all design-shape questions are settled.

---

## Tracking

Open task list at Pass 4 close:

| ID | Task | Status |
|---|---|---|
| 1 | Pass 4 -- gameplay-content scope + shape decision | COMPLETED |

Pass 5 should claim a fresh TaskCreate as it opens.

---

## After Pass 5 closes

The arc-brainstormer skill exits when remaining unknowns are implementation-shaped (arc-planner territory). Pass 5 close should produce:

1. Final spec content -- all five passes drained into `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`.
2. Updated parking doc -- this file (`2026-05-04-ktx-onboarding-pass5-handoff.md`) gets a "Pass 5 -- CLOSED" marker, OR a new short close-doc summarising the five-pass arc.
3. Arc-planner handoff at `docs/superpowers/parking/2026-05-04-ktx-onboarding-planner-handoff.md` following the standard handoff shape (Where things are / Reads required / Critical rules / First three actions / When in doubt). Routes the now-shape-locked spec to arc-planner for six-artifact scaffolding.
4. Commit + push.
