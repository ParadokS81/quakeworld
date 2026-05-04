# KTX Onboarding -- Pass 4 handoff (fresh terminal)

**For:** the next arc-brainstormer session that opens Pass 4 (Gameplay-content scope + shape decision).
**Trigger to use this:** operator opens a fresh terminal and pastes this prompt, OR an arc-brainstormer-skill watcher hands off here from Pass 3 close.
**Date:** 2026-05-04.

---

## Where things are

The KTX Layer 1 Onboarding arc is brainstorming via the arc-brainstormer skill. Four passes closed:
- Pass 1 -- CLOSED 2026-05-04. Locked extraction methodology + 4 first-class entity types (cvar / command / info_key / log_template).
- Pass 2 -- CLOSED 2026-05-04. Locked the prod-MCP update lifecycle (generalised beyond KTX into the canonical Layer 1 update procedure for all codebases). Sibling spec at `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`.
- Pass 3 -- CLOSED 2026-05-04. Verified Pass 1's schema-delta claims; locked one migration (`008_ktx_log_template_logfile_channel.sql` widening `log_template_versions.channel` CHECK to admit `'logfile'`); SCHEMA.md sweep linked as end-of-arc obligation.
- Pass 4 -- CLOSED 2026-05-04. Gameplay-content scope + shape decided. 5 sub-questions locked: group disposition (qw-namespace for A+B, new `match_event` entity type for C); mode taxonomy spine (17-row flat catalog from `um_list[]`); remaining Group A enums (lsType_t / gameType_t SKIP, electType_t / deathType_t IN); Group B struct-arrays (5 IN, 4 OUT); `match_event` row shape + `match_event_versions` table. Total schema impact: 8 CHECK widenings + 1 new table.
- Pass 5 -- NEXT. Per-category gameplay-content design + extraction-handler shapes.

**Pass 4 scope (from arc-brainstormer original framing):**

KTX is more than just engine-shape entities. The Pass 1 Discovery Sweep inventoried a substantial gameplay-content surface that doesn't fit cleanly into the existing `cvar / command / info_key / log_template` taxonomy:

- **5 enum-backed gameplay taxonomies** — `UserModes_t` (15 values: 1on1, ctf, race, wipeout, etc.), `electType_t`, `gameType_t`, `lsType_t` (9 values: lsCA, lsRA, lsWO, etc.), `deathType_t`.
- **10 struct-array gameplay tables** — `fb_spawn_t` (item + std spawners), `bloodfest_monster_t` (13 monster types), `locmacro_t`, `teamplay_message_t`, `race_score_system_t`, `stats_format_t`, wipeout configs, `dropitem_spawn_t`, `fixed_maps_list[]`.
- **7 XSD-defined match-event types** — `pick_mapitem`, `pick_backpack`, `drop_backpack`, `pick_powerup`, `drop_powerup`, `damage`, `death` (from `resources/extralog/ktxlog_0.1.xsd`). Programmatic XML emission, structurally distinct from printf log_templates.

Pass 4's job: decide the **shape** for these (do they become new entity types? qw-namespace gameplay rows? Some hybrid? Some subset extracted, the rest deferred?). Pass 5 then designs each chosen category in detail.

Sub-question piles to settle:
- **Scope decision -- in or out of Layer 1.** Each of the three groups (enums / struct-arrays / XSD events) needs a yes/no/partial answer. Possible: "all in as new entity types", "qw-namespace rows like maps + gameplay_*", "Layer 3 only with citations", "deferred entirely to a future arc". Probably mixed.
- **Entity-type taxonomy decision.** If new types are added, what are their canonical IDs, version arcs, source citation discipline? Each new type widens the `entities.type` CHECK -- migration cost.
- **Cross-codebase modeling.** KTX gameplay content overlaps with the existing `qw` namespace (which holds id1-baseline gameplay -- `gameplay_entity_defs`, `gameplay_mechanics`). KTX overrides those. How are overrides modeled? New rows with KTX as project? Override edges in a relation table? Versioned per KTX tag?
- **XSD events vs printf log_templates.** XSD events are structurally distinct (programmatic emission, schema-defined, machine-consumable by qwhub). Should they become a new entity type (`match_event`?), a specially-shaped `log_template` row, an XSD-only Layer 3 reference, or a `qw_event_log` cross-reference (the parking doc at `docs/superpowers/parking/2026-04-XX-qw-event-log-cross-validation.md` is gated on this)?
- **What does "extract gameplay" actually mean in code?** libclang already handles the C source; the question is what handlers emit and into what schema slot. Source files mentioned: `arena.c`, `clan_arena.c`, `race.c`, `sp_monsters.c`, `bot_*.c`, `match.c`, `stats_xml.c`, `combat.c`, `items.c`, `client.c`.

This pass GENERALISES because the answer drives a lot:
- Schema migrations needed (potentially several CHECK widenings + new tables).
- Handler complexity (C struct walks for the 10 tables; enum walks for the 5 taxonomies; possibly XML inspection for the 7 XSD events).
- Cross-arc impact (qw_event_log parking doc unblocks; Layer 3 game-modes-index concept-note candidate gets richer L1 anchors).
- Pass 5's per-category design depends entirely on Pass 4's shape lock.

This pass is **HEAVY** -- not light like Pass 3. Expect multiple sub-questions across multiple turns. May warrant splitting into Pass 4a / Pass 4b if scope balloons.

**Drain destination for Pass 4:** the existing KTX onboarding spec at `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`, new "Pass 4" section under Pass 3's. If shape decisions warrant a sibling spec (e.g., a new "qw-namespace gameplay extension" design that's reusable beyond KTX), surface that mid-pass and split.

---

## Reads required

Mandatory before opening Pass 4:

1. **`docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`** -- the closed Pass 1/2/3 spec. Pass 4 reads back the Discovery Sweep findings (Leg A/B/C) for the gameplay-content surface.
2. **`apps/qw-oracle/SCHEMA.md`** -- in particular the `qw` namespace tables (`maps`, `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics`) added in v13/v14. Same model is the natural template for KTX gameplay content.
3. **`apps/qw-oracle/db/migrations/002_layer1_schema.sql`** -- the `entities.type` CHECK list (currently 15 values). Any new entity types widen it.
4. **`apps/qw-oracle/docs/arc-history.md`** -- the 2026-04-27 "Game mechanics Layer 1 arc 1 (id1 baseline)" entry. That arc shipped the qw-namespace gameplay tables; reading it shapes how KTX gameplay extension should align.
5. **`docs/superpowers/parking/2026-04-XX-qw-event-log-cross-validation.md`** -- the parking doc explicitly gated on KTX cvars + KTX gameplay overrides. The XSD-events sub-question's answer affects what unblocks here.
6. **`docs/superpowers/parking/2026-05-04-ktx-layer3-concept-note-candidates.md`** -- candidates 2 (KTX game modes index) and 7 (KTX matchlog format) depend on Pass 4 decisions for their L1 anchors.
7. **`apps/qw-oracle/CLAUDE.md`** -- always-on rules.

Optional but useful:
- KTX source files (in `/home/paradoks/projects/quakeworld/research/repos/ktx/src/`) for the 10 struct-array tables and 5 enums named in the Discovery Sweep -- spike-walk if needed during a sub-question.
- The `qw-event-log-handoff` Rust crate at `/home/paradoks/projects/qw-event-log-handoff/` -- relevant if the XSD-events sub-question routes toward MVD demo cross-validation.

---

## Critical rules

- **ASCII only** in all output (operator preference -- em dash / smart quotes forbidden in code + shared docs).
- **Plain English first; technical chain second.**
- **One sub-question per topic during the pass body.**
- **Be decisive.** Recommend, don't poll.
- **Verification first.** When proposing a shape (new entity type, qw-namespace extension, etc.), verify against the existing `entities.type` CHECK list + the existing qw-namespace table shapes before recommending.
- **Pass 4 is heavy.** Expect to split into 4a / 4b if scope balloons. Don't try to ram everything into one session.
- **Resist Pass 5 drift.** Pass 4 locks SHAPE. Pass 5 designs each category. If you find yourself asking "what columns does the new monster table have", that's Pass 5 territory -- park it and stay on shape.

---

## First three actions

1. Read the seven docs in the Reads-required list. In parallel.
2. State the pass-4 scope plainly to the operator: "Starting Pass 4 -- Gameplay-content scope + shape decision. Drain destination is the KTX onboarding spec (or a sibling spec if shape decisions warrant). Heavy pass; expect multiple sub-questions across multiple turns. Three groups to decide on: 5 enums, 10 struct-arrays, 7 XSD events. Sub-questions surface as we go."
3. Open with sub-question 4.1 -- the load-bearing decision: **what's the default disposition for KTX gameplay content -- in Layer 1 (what shape: new entity types vs qw-namespace extension vs both), Layer 3 only, or deferred to a separate future arc?** This shapes everything downstream.

---

## When in doubt

Ask the operator. The pass scope is bounded but the topic is broad. If a sub-question genuinely outgrows it, surface it as a Pass 4 -> Pass 5 carry-forward (or a sibling-spec spinoff) rather than absorbing it.

If Pass 4 shows signs of needing to split (more than 4 sub-questions surface, or sub-questions cross-couple in ways that resist sequential resolution), propose a Pass 4a / Pass 4b split early -- before context budget tightens.

---

## Tracking

Open task list at Pass 3 close:

| ID | Task | Status |
|---|---|---|
| 1 | Pass 2 -- prod-MCP update lifecycle | COMPLETED |
| 2 | Pass 3 -- schema impact for first-class types | COMPLETED |

Pass 4 should claim a fresh TaskCreate as it opens.
