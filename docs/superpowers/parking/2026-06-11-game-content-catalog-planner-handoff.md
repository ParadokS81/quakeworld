# Planner handoff -- game-content-catalog completion arc (2026-06-11)

**For:** a FRESH terminal running **`arc-planner`**. The brainstorm is COMPLETE (both passes locked 2026-06-11, single session); remaining unknowns are implementation-shaped. Build the six-artifact scaffold + phase MDs against the design spec. Do NOT relitigate locked decisions.

## Where things are

- **Design spec (the complete decision record, D1-D7 + M1-M5):** `docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md`.
- **The reframe:** this is a COMPLETION arc. The id1 baseline EXISTS (shipped 2026-04-27: 37 entity defs + 41 mechanics rows, per-value cited, from `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml`, 1011 lines). Verified live 2026-06-11. The genesis + seed parking docs carry dated correction blocks -- trust the spec over their original prose.
- **Work items:** (1) audit re-verify + exhaustive gap sweep over `QW/progs` (gap seeds: splash falloff gradient, self-splash half damage); (2) id1 monster stats from acquired v1.06 QC; (3) KTX override layer (4 file families, exhaustive value-deltas); (4) `map_summary_key` join props; (5) SCHEMA.md conventions subsection (D7) + `verify-gameplay.ts` count fix + snapshot regen.
- **Sequencing (operator-locked M4):** execution AFTER the first Track-A weapon-pair notes ship. Scaffold now; shelf until then.
- **HANDOVER:** "Active arcs" carries the dashboard entry -- update its stage line when planning completes.

## Reads required (in order)

1. The design spec (above), end to end.
2. `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` -- THE template for every new row (cluster layout, per-prop `*_source_ref` convention, header comments).
3. `apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts` -- loader shape; the missing `monsters` section is the M1 extension (~10 lines: `SeedFile` + `ENTITY_KIND_BY_LIST`).
4. `apps/qw-oracle/SCHEMA.md` -- "Map knowledge layer" + "v14" + KTX gameplay-kinds sections (table shapes, the `ruleset_gate_json NOT NULL DEFAULT '{}'` upsert trick, natural keys).
5. The spec's D2 inventory -- the bounded KTX delta list from the 2026-06-11 source scan (yawnmode / midair / instagib / bloodfest / dmm4 / CTF runes / k_dis / k_hitboxcheck_bullets / k_classic_shotgun).
6. `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` + `scripts/load-knowledge/quality-grid.ts` (existing gameplay-kind probes) -- the regime M3 extends.

## Critical rules

- **Source-truth cited per value.** Wikis + pak `progs.dat` are cross-checks, never sources (D1/M3). Wiki check = monsters-only, one-time LOCAL snapshot, agents grep the cache (M3).
- **Gate vocabulary joins the game_mode catalog tokens** (`{"mode":"<token>"}`, `{"dm":N}`, single-key + props fine print) -- never invent a second vocabulary (D3).
- **Exhaustive within the four KTX file families; deltas-not-knobs** (D2 three-layer rule: knob existence = cvar track; mode settings = mode_default; this arc = hardcoded behavior deltas only).
- **One YAML per source; ONE assembler writes YAML** (M1/M2). id1-native dm variants stay as props on id1 rows.
- **Sonnet high, low concurrency + pacing** for fan-outs (`reference_workflow_rate_limit_and_args`); no SDK -- Workflow `agent()` only (Max sub, `reference_max_subscription_no_api_key`).
- **Operator gates are SME-level lists only** (M2.3): gap candidates / KTX delta list / wiki mismatches.
- **Sibling-arc guard:** demand-driven-l3 + docs.quake.world are live on `main`. Scope every `git add`; never `-A`; fresh commits over amend.
- **D7 ships with the data:** SCHEMA.md gameplay conventions subsection is a deliverable, not an afterthought.
- **No schema migration** (D6); anchor-probe predicates verified against live DB before shipping (F29).

## First three actions

1. Read the spec + seed YAML + loader cold; confirm the M1 loader-extension shape against the live file.
2. Scaffold the prerequisites as Phase 0: **P1** acquire Quake v1.06 progs QC into `research/repos/` (pick mirror, record provenance in `gameplay_sources.notes`, spot-verify known values vs wikis + pak `progs.dat`); **P2** resolve the id1 source_root wrinkle (path-prefixed source_refs vs widened root -- planner's call, no migration).
3. Run the slicing analysis (verification-regime + context-budget per phase). Natural phase shape to validate, not assume: 0 prereqs+loader / 1 audit / 2 monsters / 3 KTX overlays / 4 join keys + D7 docs + surfacing.

## When in doubt

Route to the operator at SME level only (which KTX deltas are community-real; wiki-vs-source arbitration). Technical calls resolve against the live DB + the spec. The id1 seed YAML answers row-shape questions; the KTX onboarding arc's decisions answer gate/probe questions. Do NOT relitigate D/M locks -- amend via explicit operator sign-off only.
