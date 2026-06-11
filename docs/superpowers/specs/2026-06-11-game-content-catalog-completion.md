# Game-content catalog completion -- design spec (2026-06-11)

**Arc slug:** `game-content-catalog`
**Status:** brainstorm COMPLETE 2026-06-11 -- Pass 1 (scope + data model, D1-D7) and Pass 2 (method + validation, M1-M5) both LOCKED in one session. Next: arc-planner (handoff: `docs/superpowers/parking/2026-06-11-game-content-catalog-planner-handoff.md`).
**Genesis:** `docs/superpowers/parking/2026-06-11-game-content-catalog-arc-brainstorm-handoff.md` + `docs/superpowers/parking/2026-06-11-game-content-notes-and-catalog-direction.md` (both carry dated correction blocks pointing here).

## The reframe (pre-flight finding, 2026-06-11)

The genesis framing ("base-game content catalog -- never extracted") had decayed before the brainstorm started. Verified against live Postgres on 2026-06-11:

| Dataset | Live rows |
|---|---|
| `gameplay_entity_defs` id1 | 8 weapon + 4 projectile + 25 item |
| `gameplay_mechanics` id1 | 41 (armor_model / constant / death_rule / dm_mode_rule / env_hazard / player_stat / powerup_behavior / spawn_rule) |
| `gameplay_entity_defs` ktx | 13 monster rows -- bloodfest SPAWN-ECONOMY data (`hp_for_kill` / `array_position` / `boss_able`), NOT stats |
| `gameplay_mechanics` ktx | 446 across 8 kinds (KTX onboarding arc, 2026-05) |

The id1 baseline shipped 2026-04-27 ("Game mechanics Layer 1 arc 1", schema v14) from a hand-authored, per-value-cited YAML seed: `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` (1011 lines), loaded by `load-gameplay.ts` (CLI `load-gameplay [--yaml <path>]`, idempotent upsert keyed `(gameplay_source_id, kind, name, ruleset_gate_json)`). The rows are rich, not skeletal (RL: damage 110, splash 120, radius 160, refire 0.8, `damage_formula: 100_plus_random_times_20`, per-prop source_refs into `weapons.qc`/`items.qc`/`combat.qc`). That arc's closing note queued "KTX overrides" as arc 2 -- **this arc IS that arc 2, plus monsters, plus an audit.**

**Therefore: COMPLETION arc, not creation arc.**

One handoff correction so it does not propagate: canonical KTX extraction is **libclang**, not tree-sitter (tree-sitter is reserved for the dusty-ktx fork's `qcsrc/`, never onboarded).

## Scope

**In:**
1. Completeness audit + re-verification of the existing id1 rows (D4).
2. id1 monster stats (D1).
3. KTX override layer for weapons/items/combat/monsters (D2 + D3).
4. Maps join-key mapping (D5).
5. Documentation ride-along: the SCHEMA.md gameplay section gains the conventions this arc relies on (D7).

**Out:**
- The L3 concept notes (weapon pairs / powerups / resources) -- Track A, the live demand-driven-l3 arc. Notes cite catalog rows and do NOT wait for this arc.
- The "what does the oracle know" coverage map -- Track C, folded into the queued docs.quake.world front-page brainstorm (HANDOVER carries the line).
- Engine-tunable cvars (`sv_maxspeed` etc.) -- engine cvar track, per the standing v14 rule.
- Whole-subsystem KTX content (race scoring, grapple, CTF flag logic) -- only VALUE deltas to cataloged combat entities are in (D2).

**No schema migration expected (D6).** Every kind this arc writes already passes the CHECKs (`gameplay_entity_defs.kind`: item/weapon/projectile/monster); `props_json` carries kind-specific structure. Only registry touch is the P2 source_root wrinkle.

## Locked decisions

### D1 -- Monsters: id1-sourced from acquired v1.06 QC; KTX deviations as overlay

Structural facts: QuakeWorld's gamecode stripped single-player -- `QW/progs/` (the id1 gameplay_source root) contains no monster QC. The monsters that run in competitive QW live in KTX's `sp_*.c` (~15 files, C reimplementation, values as inline literals). The original Quake v1.06 progs QC (soldier.qc, demon.qc, shambler.qc...) is the true baseline and is publicly mirrored; we do not hold it in-tree yet.

Rationale for id1-sourcing (operator, 2026-06-11): the oracle's id1 baseline must include Quake 1 itself, not just QW ("it's not just a QuakeWorld oracle"); and single-player is *reachable runtime content* in the flagship client -- ezQuake's built-in MVDSV-derived server runs the original `progs.dat` from the user's paks. Monster facts are live ecosystem content, not retro trivia.

- New **ungated stat rows**: `kind='monster'`, `gameplay_source_id='id1'`, gate `{}` -- health, melee/ranged attacks (damage dice), projectile speeds, behavior props. Full roster, exhaustively (~15 incl. boss/oldone/fish; exact count pinned at execution).
- Existing 13 ktx bloodfest rows **unchanged** -- different fact-family (mode-gated spawn economy). Two rows per monster under different gates is the established pattern (cf. mode_defaults).
- KTX `sp_*.c` diffed against id1 QC; **deviations become ktx-source overlay rows** (same model as weapons). If KTX is faithful, zero ktx stat rows result.
- Cross-checks, never sources: quake.fandom.com + quakewiki.org monster pages; the `progs.dat` in the operator's id1 paks (`data/pak-cache/`) is the runtime oracle for fidelity disputes.

### D2 -- KTX override scope: exhaustive value-deltas within four file families

- Files: `ktx/src/weapons.c`, `items.c`, `combat.c`, `sp_*.c`.
- Within those files, **every cvar/mode-gated value divergence from an id1 baseline row earns a ktx row** (exhaustive-mapping rule; no hand-picked subsets). Known inventory from the 2026-06-11 source scan: yawnmode (axe 50 in dmm3, SSG 21 pellets + 0.18/0.12 spread, SNG 16, GA absorb 0.4, grenade randomness off, backpack 1/4 cap), midair (rocket speed 2000 with quad), instagib (5000-damage bullets), bloodfest (free ammo, shambler-rule bypass), dmm4 (quad 8x, quad strips armor/cells), CTF rune damage modifiers (combat.c), k_dis discharge rules, k_hitboxcheck_bullets, k_classic_shotgun.
- **Three-layer clarity -- what does NOT earn rows here:** knob *existence* (KTX cvar track); what modes *set knobs to* (`mode_default`, 317 rows); id1-native dm1-4 variants (props on id1 rows -- existing convention: `damage_dm_gt_3`, `refire_seconds_dm4`). This arc adds only **hard-coded behavior deltas under a gate**.

### D3 -- Gate vocabulary: reuse the game_mode catalog tokens

- `{"mode":"<token>"}` whenever the gate is a cataloged mode/mutator (yawnmode, midair, instagib, bloodfest...). Override rows thereby JOIN the existing 27-row game_mode catalog + 317 mode_defaults on the same token -- `describe_mode` can assemble a mode's hardcoded overrides with zero new wiring.
- `{"dm":N}` for deathmatch-number gates not already covered by the id1-props convention.
- Single-key gates (KTX arc D8 convention). Compound conditions keep the mode as the gate; the secondary condition goes in props (midair rocket boost: gate `{"mode":"midair"}`, props `requires_quad: true`). Gates stay simple so row identity stays clean.
- Principle (operator-ratified): baseline + named delta, joinable by the same word -- never invent a second vocabulary for a condition the catalog already names.

### D4 -- Audit: re-verify everything + exhaustive gap sweep

- **Re-verify all existing values** (~400 cited props across 37 entity + 41 mechanics rows): citation correctness against the QC source. Per-value Workflow fan-out makes this cheap; converts April's "authored carefully" into "verified under the current regime." Prior verified-state is a hypothesis.
- **Exhaustive gap sweep** over the full `QW/progs/` tree (~20 small QC files) for gameplay-value constants/behaviors with no row.
- **Known gap seeds** (found by casual inspection 2026-06-11): the splash **falloff gradient** (T_RadiusDamage: points = damage - 0.5 * distance) and the **self-splash half-damage rule** (attacker takes 0.5x own radius damage). Both absent from the 41 mechanics rows.
- Track A note demands = prioritization input, not the boundary. The sweep stays exhaustive so the catalog's DONE is independent of which notes exist.

### D5 -- Maps join keys: `map_summary_key` prop on item rows

- `maps.item_summary_json` speaks 20 short keys (`ga ra ya | mh h15 h25 bio | pent quad ring | cells shells spikes rockets | gl lg ng rl sng ssg`). Catalog rows gain a props field `map_summary_key`.
- 1:1 for armors/health/powerups. Weapon keys go on the `pickup_*` item rows (map entities ARE pickups). Ammo keys collapse small+large: both variant rows carry the same key; a join returns both variants, which is the correct answer.
- The classname join (`class_counts_json` -> `rows.classname`) already works today; untouched.
- Aliasing principle (operator-ratified): vocabularies in the wild are load-bearing in their own settings (`ra` = player/maps shorthand, `item_armor1` = engine, `red_armor` = catalog); standardizing the world is the wrong effort. One canonical row carries all its names; aliases live ON the row, never as consumer-side translation tables.

### D6 -- No migration

Existing CHECKs + `props_json` suffice. (The `monster` kind was added to `gameplay_entity_defs` by KTX onboarding migration 011.) One small loader extension IS needed: `load-gameplay.ts` reads `weapons`/`projectiles`/`items`/`mechanics` seed sections only -- a `monsters` section must be added (`SeedFile` interface + `ENTITY_KIND_BY_LIST`, ~10 lines, planner task).

### D7 -- SCHEMA.md carries the conventions (operator request, 2026-06-11)

The tricks this arc locks -- gate-token vocabulary, the three-layer knob/mode_default/override model, the id1 props-variant convention (`damage_dm_gt_3`), `map_summary_key` aliasing, the gameplay_sources registry model -- currently live only in arc docs + YAML header comments: exactly the knowledge the operator will forget. Deliverable: the SCHEMA.md gameplay section gains a **conventions subsection** as part of this arc's ship, updated alongside the data (same spirit as the standing "update SCHEMA.md alongside migrations" rule). SCHEMA.md is the living manual ("cumulative reference, organized topically"); specs are point-in-time and don't serve recall.

## Prerequisites (planner scaffolds)

- **P1 -- Acquire original Quake v1.06 progs QC** into `research/repos/` (the 1996 id source release, widely mirrored). Record provenance (mirror URL, commit/checksum) in `gameplay_sources.notes`. Import sanity-check: spot-verify known values (shambler 600hp, ogre 200hp, ...) against the wikis; where in doubt, the pak `progs.dat` is the runtime oracle.
- **P2 -- id1 source_root wrinkle:** `gameplay_sources.id1.source_root` currently = `research/repos/qwcl-original/QW/progs/`; monster refs will cite the newly acquired second tree. Resolve via path-prefixed source_refs or a widened root -- planner decision, no migration.

## Interplay with live tracks

- **Track A (demand-driven-l3 notes): unblocked NOW.** Notes cite existing rows. Inline targeted backfills to `id1-gameplay.yaml` are allowed + encouraged when a note hits a missing fact (add cited row, run `load-gameplay`, cite) -- the idempotent loader makes the tracks collision-free. This arc consumes any accumulated "notes needed X" list as D4 priority input.
- **Track C (coverage map):** carried in HANDOVER under the docs.quake.world front-page brainstorm.
- **Sibling-arc guard:** demand-driven-l3 + docs.quake.world are live on `main`. Scope every `git add`; never `-A`; fresh commits over amend.

## Pass 2 LOCKED (2026-06-11): method + validation

### M1 -- Seed-file layout: one YAML per source

- `id1-gameplay.yaml` GROWS: a `monsters:` cluster (~15 rows), the audit corrections, the new mechanics rows (falloff gradient, self-splash rule), and the `map_summary_key` props. One file stays the complete id1 picture.
- NEW `ktx-gameplay.yaml`: the override layer (weapon/item/combat deltas + any monster deviations) with its own `gameplay_source: ktx` block (registry row exists; upsert idempotent). Loaded as a second `load-gameplay --yaml` call.
- Loader extension required: `monsters` seed section (`SeedFile` interface + `ENTITY_KIND_BY_LIST`, ~10 lines). Rejected: one mega-file (mixes sources against the loader's one-source-per-file shape); per-kind files (fragments review).

### M2 -- Workflow shape: extract -> verify -> SME gate -> assemble

1. **Extract:** bounded fan-out with schema-enforced structured output -- per-monster (~15), per-file for the KTX delta sweep, per-cluster for the audit re-verify. Per-value citation mandatory at extraction time, never patched in later.
2. **Verify:** independent re-derivation by a different agent (cold read of the same source); monsters add the wiki cross-check (M3). Only discrepancies escalate; agreement auto-passes.
3. **Operator gate at SME level:** three short lists only -- gap-sweep candidates ("gameplay-relevant or engine plumbing?"), the KTX delta list ("does this match community reality?"), wiki-vs-source mismatches. Never per-citation review.
4. **Assembly:** ONE inline assembler writes the YAML from verified outputs (uniform style); then load, load AGAIN (idempotency), F1 probes, spot SQL.
5. **Dials:** Sonnet high reasoning per agent, low concurrency + pacing (`reference_workflow_rate_limit_and_args`); no SDK -- Workflow `agent()` only (Max sub). The 2026-06-11 Explore inventory of `ktx/src` is the cheap probe that bounds the delta sweep.

### M3 -- Validation regime

- **Idempotency:** load each seed twice -> identical counts + content hashes (`idempotency-ktx.sh` pattern extended to both YAML loads).
- **F1 grid:** re-baselined per-(source, kind) floor probes + anchor probes whose predicates are verified against the live DB before shipping (F29 discipline). The JSONB-not-string gate already covers these tables.
- **Citation gate:** every `source_ref` / per-prop `*_source_ref` mechanically resolves (file exists, line in range); semantic correctness is the verify stage's job.
- **Wiki cross-check (monsters only), via one-time local snapshot:** fetch the ~15 per-monster pages from each wiki (Jina reader, one prep step) into a cache dir, fetch-date + URL recorded per file; verify agents GREP THE LOCAL COPY -- zero per-agent web fetches (operator wall-time/token concern, 2026-06-11). Stub pages degrade gracefully ("no external data" for that monster -- costs nothing, blocks nothing). Results live in the arc findings doc, never in rows; the pak `progs.dat` is the final arbiter.
- **VALIDATION-RUNBOOK** gains a `qw` gameplay section mirroring the per-engine sections.
- **Ride-along fix:** `verify-gameplay.ts` stale hardcoded counts (37/41 vs live 50/487; standing HANDOVER item folds into this arc).

### M4 -- Sequencing

Execution starts AFTER the first Track-A weapon-pair notes ship. Notes are unblocked now against existing rows; gaps they hit meanwhile become inline cited backfills to `id1-gameplay.yaml` (idempotent loader keeps the tracks collision-free; this arc absorbs whatever backfills already landed).

### M5 -- Surfacing

Post-load: regenerate the slipgate snapshot (`qw-gameplay.json` via build-snapshot); confirm MCP needs nothing new (`search_gameplay_entities` already admits `kind=monster` + the `gameplay_source` filter). Verify-at-execution, no design content.

## Brainstorm exit (2026-06-11)

Both passes locked in one session. Remaining unknowns are implementation-shaped -- loader-extension details, phase slicing, P1 acquisition mechanics, probe predicates -- all arc-planner territory. Carry-forwards routed: coverage map -> docs.quake.world front-page brainstorm (HANDOVER); falloff/self-damage gap seeds -> D4 audit input; Track A interplay -> M4. Planner handoff: `docs/superpowers/parking/2026-06-11-game-content-catalog-planner-handoff.md`.
