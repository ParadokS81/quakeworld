# Genesis handoff -- "id1 game-content catalog" extraction arc (2026-06-11)

**For:** a FRESH terminal to SHAPE THIS ARC. Routes to **`arc-brainstormer`** (this is a new arc with real design decisions -- schema + extraction method -- so brainstorm before planning; do NOT execute from a parking doc). The operator already knows it's an arc, so skip the arc-classifier "is it an arc" step. This is a **data/extraction arc** (qw-oracle L1 gameplay extension) -- NOT an L3 concept-note authoring arc; use the extractor methodology, not the concept-note skills.

> **STATUS 2026-06-11 -- brainstorm Pass 1 LOCKED; premise corrected.** Pre-flight verification overturned this handoff's core claim: the id1 content catalog ALREADY EXISTS (shipped 2026-04-27 as "Game mechanics Layer 1 arc 1" -- 37 entity defs + 41 mechanics rows from the hand-authored, per-value-cited seed `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml`; that arc's close even queued "KTX overrides" as arc 2). The arc is now a **COMPLETION arc**: id1 monster stats (from acquired v1.06 QC -- QW progs stripped single-player) + KTX override layer + completeness audit + maps join keys. Design spec: `docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md`. Also corrected: canonical KTX extraction is **libclang**, NOT tree-sitter as the reads-list below claims. **Brainstorm COMPLETE same-day** (Pass 2 method+validation also locked); next step is `arc-planner` via `docs/superpowers/parking/2026-06-11-game-content-catalog-planner-handoff.md` -- this handoff is now historical context only.

## What this arc is

Extract the missing **base-game content catalog** -- weapons / armor / items / monsters as first-class objects with properties (damage, splash, projectile speed, absorption, values, behavior) -- from QC source into L1 gameplay data. Today L1 has engine/config entities (from engine C), maps (from BSPs), and KTX modes/mechanics -- but nothing *defines* the game content the maps already *reference*. Operator's framing: "scan, extract, document," likely a **Workflow** fan-out over the finite entity set.

**Finite + frozen + extractable** -- the game's content is a closed set; this arc has a real DONE.

## The seed (read first)

`docs/superpowers/parking/2026-06-11-game-content-notes-and-catalog-direction.md` -- the full direction: why this layer is missing, the game-object note family it feeds, the verified decisions (megahealth = health not powerup; stats are L1-class but frozen; the maps `item_summary_json` IS a working item taxonomy + the **join target**), and the sequencing (the `rl/gl` concept note is the schema probe -- author it first to learn what shape the data needs).

## Reads required (in order)

1. **The seed** (above) -- direction + decisions + the maps join.
2. **Extraction methodology (the established pattern this EXTENDS, do not reinvent):**
   - `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` + `VALIDATION-RUNBOOK.md`.
   - The **gameplay precedent**: `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py` + `_handler_gameplay_tables.py` (KTX is tree-sitter, not libclang -- separate methodology) and the loaders `scripts/load-knowledge/load-gameplay.ts` / `load-gameplay-taxonomies.ts` / `load-gameplay-tables.ts`.
   - `apps/qw-oracle/SCHEMA.md` -- the `gameplay_mechanics` model (kinds + `gameplay_source_id`; current kinds: mode_default / death_rule / drop_item / game_mode / player_stat / env_hazard / ...).
3. **The source** -- `research/repos/ktx/src/`: `weapons.c` (fire logic/damage/spread), `combat.c` (damage+armor), `items.c` (items/powerups/health/armor/ammo -- `item_health`+`H_MEGA`, `item_artifact_*` powerups), the `sp_*.c` monster roster (demon/dog/enforcer/fish/hknight/knight/ogre/oldone/shalrath/shambler/soldier/tarbaby/wizard/zombie/boss).
4. **The join target** -- the `maps` table `item_summary_json` keys (`ga ra ya | mh h15 h25 bio | pent quad ring | cells shells spikes rockets | weapon classes`) + `class_counts_json`. The catalog's keys should align so maps JOIN to it.
5. **Cross-check oracles (NOT sources)** -- for MONSTERS there is decent public data to validate against: https://quake.fandom.com/wiki/Monster_(Q1) and https://quakewiki.org/wiki/Monsters. For WEAPONS/items the public wikis are **empty stubs** (https://quakewiki.org/wiki/Entity_guide has nothing on weapons) -- which is exactly why this arc exists: weapon/item data has **no good public source** and MUST be extracted from QC. Use the wikis to VALIDATE extracted monster values (where KTX matches id1) and flag KTX-modified ones; never copy. Source-truth = `ktx/src`, cited per value. **Asymmetry to expect:** monsters have cross-checks, weapons/items are source-only -- so the weapon/item extraction needs the tightest internal verification (per-value QC citation + the maps `item_summary` presence as the only external sanity check).

## Key design decisions the brainstorm must resolve

1. **Schema home:** new `gameplay_mechanics` kinds (`weapon` / `armor` / `item` / `monster`) with a properties JSON, vs a new table, vs entity types. Weapons carry more structure (multiple stats) than existing flat kinds -- a properties payload likely. Fit the existing gameplay model.
2. **KTX-vs-id1 scope + tagging:** `ktx/src` is the canonical source (competitive QW = KTX), but it inherits/modifies id1. Decide how `gameplay_source` tags id1-inherited vs KTX-modified values; the fandom page is the id1 baseline cross-check.
3. **Extraction method:** deterministic AST (tree-sitter, like the existing KTX handlers) for the declarative constants vs an **LLM-Workflow** for behavioral synthesis (spread cones, falloff, monster AI stats that are logic not constants). The operator's "scan/extract/document" Workflow fits the behavioral part -- but it needs hard verification (per-value QC citation + fandom + maps cross-check + idempotency).
4. **The Workflow shape (if used):** scan QC for the entity list -> per-entity extract (cite `file:line`) -> verify (fandom + internal consistency + maps presence) -> load. Bounded fan-out over a finite roster.
5. **Idempotency + validation:** re-running yields identical rows; every value source-cited; run the VALIDATION-RUNBOOK before declaring done. LLM-extracted values get the strongest cross-check.

## Critical rules

- **Source-truth from `ktx/src`, cited per value.** Fandom is a cross-check, never a source. This is the project's core discipline.
- **Extend the gameplay-extraction pattern**, don't fork a parallel one. The KTX gameplay handlers + loaders are the template.
- **No SDK** -- any LLM extraction routes through Workflow `agent()` (Max sub, no API key; `reference_max_subscription_no_api_key` + `reference_workflow_rate_limit_and_args`).
- **Sibling-arc guard:** the demand-driven-l3 arc + the docs-quake-world arc are live on `main`. NEVER `git add -A`; scope every add; prefer fresh commits over amend (HEAD moves under you).
- **`rl/gl` concept note scopes this** -- if it hasn't been authored yet, it reveals which stats the notes actually need; coordinate so the schema matches real demand, not a guessed model.

## First three actions

1. Read the seed + the gameplay precedent (the KTX handlers + loaders) + SCHEMA.md `gameplay_mechanics` cold. Confirm the extend-not-reinvent path.
2. Scan `ktx/src` (`items.c` / `weapons.c` / `combat.c` / `sp_*.c`) to inventory the entity set + how each entity's properties are expressed in QC (constants vs logic) -- this sizes the arc + informs decision #3.
3. Run `arc-brainstormer` with this handoff as genesis: drain the 5 design decisions into a design spec (schema, source-scope, method, Workflow shape, validation), then route to `arc-planner`. Likely a LIGHT brainstorm -- the methodology exists; the design work is the schema + the KTX/id1 + the extraction method.

## When in doubt

Route to the operator at intent/SME level (which values are id1 vs KTX is a domain call). The maps taxonomy + the gameplay precedent resolve most schema questions. Keep it bounded -- the content set is finite; don't let "document" balloon into strategy (that's the L3 notes + the wiki, not this data arc).
