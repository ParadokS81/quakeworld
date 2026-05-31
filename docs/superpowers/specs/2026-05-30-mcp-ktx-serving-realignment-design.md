# MCP realignment to KTX-era data — design

**Date:** 2026-05-30. **Status:** approved design, ready to plan.
**Origin:** `docs/superpowers/parking/2026-05-30-mcp-realignment-ktx-data-handoff.md`.
**Scope:** qw-oracle MCP serving surface + governing docs. **Not** the data (verified sound), **not** the concept-note bodies/loading (owned by a parallel terminal).

## Why

The KTX arc loaded a rich Layer 1 gameplay layer but the **serving** side was never widened. The data is reachable in Postgres yet stranded behind the MCP tools, and the orientation blob over-promises capabilities the tools don't deliver. This runs the KTX-era data through `API_CONTRACTS.md`'s own new-dataset checklist (Discovery / Query / Storage) — Storage closed when the data loaded; Query and Discovery were skipped. MVDSV lands next and will route through the same checklist.

## Verified findings (the data is sound; the fix is tools + docs)

Confirmed against the live DB (`docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`) on 2026-05-30:

- `gameplay_mechanics`: **431 KTX rows** under `gameplay_source_id='ktx'` — `mode_default` 317, `game_mode` 27, `drop_item` 31, `death_rule` 27, `teamplay_message` 21, `loc_macro` 15, `election_type` 5, `score_system` 3. Base Quake (`id1`) holds 41 rows across the 8 original kinds.
- `mode_default` overlays are gated `ruleset_gate_json = {"mode":"<token>"}` with `props_json` keys `{apply_order, comment, is_baseline, initstring_array}`. 18 gate tokens; `common` (52 rows) is the baseline applied to every mode.
- `gameplay_entity_defs`: **13 KTX `monster` rows** under `gameplay_source_id='ktx'`; base Quake holds item/weapon/projectile.
- `entities`: 16 types; `match_event` has 7 rows.

**The gap set (broader than the originating handoff):**

| # | Gap | Evidence |
|---|---|---|
| G1 | **Source default is the master blocker.** All four flat tools (`search`/`lookup` × `mechanic`/`gameplay_entity`) hard-default `gameplay_source ?? 'id1'`. Every KTX row is under `'ktx'`, so a default-source caller gets **zero** KTX rows even after the kind enums are fixed. | `search-mechanics.ts:38`, `lookup-mechanic.ts:42`, `search-gameplay-entities.ts:49`, `lookup-gameplay-entity.ts:49` |
| G2 | `search_mechanics` `kind` enum lists only the 8 original kinds; the 7 KTX kinds (`game_mode`, `mode_default`, `election_type`, `score_system`, `drop_item`, `loc_macro`, `teamplay_message`) aren't selectable. No `mode` filter. Rows omit `ruleset_gate_json`/`props_json`, so results can't even be post-filtered by mode. | `search-mechanics.ts:13`, `:49` |
| G3 | `lookup_mechanic` is `LIMIT 1` — can't enumerate a mode's overlay set (`coop` has one overlay per mode). | `lookup-mechanic.ts:50` |
| G4 | `search_gameplay_entities` `kind` enum is `item\|weapon\|projectile` — no `monster`, though orientation promises it. Same lie-shape. | `search-gameplay-entities.ts:13` |
| G5 | `ENTITY_TYPE_ENUM` = `[cvar, command, macro, cmdline_param, ruleset]` — `match_event` not filterable/advertised. (10 other types are also absent but look deliberately internal — out of scope.) | `index.ts:57` |
| G6 | `orientation.ts` tells consumers to pass `kind='mode_default'`/`'game_mode'` to `lookup_mechanic` (which has **no** `kind` param) and `search_mechanics` (enum lacks them); promises `monster` and `match_event` filtering; never mentions `gameplay_source='ktx'`. The per-tool descriptions in `index.ts` `TOOL_LIST` carry the same stale enums + `"Defaults to id1"`. | `orientation.ts:13`, `index.ts:378/396/416` |
| G7 | Stale docs: `VISION.md` says *"KTX — engine port not started"* (`:71`) and *"ten tools"* / *"v0.4.0"* (`:35`; actual 12 tools, `SERVER_VERSION='0.5.0'`). `API_CONTRACTS.md` contradicts itself on the ToolResponse migration (`:67` vs `:158`). | — |

## Locked design decisions

- **D1 — Build `describe_mode` (a composite/deep verb), not flat-only.** Rationale: information-hiding. A flat surface forces every consumer (Claude Code, the chatbot, the wiki feed) to carry the um-vs-overlay-less + common-baseline assembly knowledge and bloats orientation to teach it — textbook leakage. `describe_mode` traps that complexity in one place. Earns its slot under the checklist's "new verb" rule; 12→13 tools is in the healthy band (~15).
- **D2 — Source default: omitted `gameplay_source` → search all sources; explicit value → scoped.** Every row carries `gameplay_source_id`. Unblocks the 444 KTX rows by default instead of relying on a consumer knowing to pass `'ktx'`. Intentionally a behavior change for default-source callers (they now see id1+ktx together) — acceptable: `API_CONTRACTS.md` declares these test-only with no SLA, and "all sources" is the honest default for a search verb.
- **D3 — Verb separation stays clean.** `lookup_*` = one fact by name; `search_*` = filtered set; `describe_mode` = composite assembly. `lookup_mechanic` keeps single-row semantics; **enumerating** a mode's overlays is `search_mechanics(kind='mode_default', mode=X)`.
- **D4 — Collision tiebreak: `DISTINCT ON (gameplay_source_id)`.** Only `lava` + `slime` collide (id1 `env_hazard` + ktx `death_rule` — two genuine facts). `lookup_*` with omitted source returns one least-gated row **per source**; explicit source → single row. Defines the collision out of existence rather than silently picking one.
- **D5 — `game_type` is retired; `experience_group` is the real axis.** The game-mode methodology (`curated/concept-notes/_methodology/game-modes/concept-note-frontmatter-schema.md`, reconciled 2026-05-29) replaced raw `game_type` (Team/Duel/Mutator — L1 `props_json`) with `experience_group` (10 user-facing slugs) as the primary axis. `experience_group` is a **curated L3** field, not in L1. `describe_mode` surfaces `mode_class` (standalone/mutator) from L1 always and `experience_group` from the linked note when loaded; **L1 `game_type` is dropped from the envelope** (still reachable via `lookup_mechanic` if ever needed).
- **D6 — Assembly branches on "overlays exist?", not mode_class.** Only `common` is a gate-without-catalog token → `describe_mode('common')` returns `none` (it's the baseline, surfaced inside every um-mode's `applied_settings`). 10 catalog modes have no overlays (9 mutators + `bloodfest` + `race`) → catalog + activation + empty `applied_settings`; `race` notes its settings come from `apply_race_settings` (QC), not overlays.
- **D7 — Concept-note link: by slug, graceful, carries `experience_group`.** Join `lower(concepts.slug) = lower(name)` (+ `frontmatter->>'topic'='game-mode-reference'` guard). Supplies the L3 block; **0 of 27 mode notes are loaded today** (the parallel refactor), so it returns `null` and lights up automatically as notes load. `related_entities` prefers the note's curated canonical_id list, falling back to mechanical `activation_cvar`+sub-flags when no note. Never touch the note files or loader.
- **D8 — Entity enum: add `match_event` only** (5→6 user-facing types). The other 10 `entities` types stay internal; a broader entity-type audit is a separate decision, not this arc.

## The new tool: `describe_mode`

`describe_mode(mode: string, gameplay_source?: string)` → `ToolResponse<ModeDescription>`. Single call assembles the composite; the um-vs-overlay-less branch lives inside. `gameplay_source` omitted resolves the catalog row across all sources (modes are ktx-only today; param future-proofs FTE/MVDSV).

```
ModeDescription {
  // L1 catalog (always)
  name, user_facing_label, community_name,
  mode_class,                  // 'standalone' | 'mutator'  (engine mechanism, L1)
  init_mechanism,              // um_init_string | cvar_toggle_only | cvar_toggle_with_init_string
  wiki_ref, source_refs[],

  activation: {                // how you turn it on
    mechanism, cvar,           // activation_cvar (mutators); null for um
    um_label, sub_flag_cvars[],
  },

  applied_settings: [{         // [] when the mode has no overlays
    cvar, value, scope,        // scope: 'baseline' (gate mode='common') | 'mode'
    apply_order, comment, initstring_array,
  }],                          // common baseline rows + mode rows, ORDER BY apply_order (full ordered sequence, not deduped)

  related_entities: [{ name, type, description }],   // curated note list if loaded, else mechanical activation_cvar+sub_flags

  concept_note: {              // null until the parallel refactor loads the note
    slug, summary, experience_group,
    deathmatch_flag?, roster?, loadout?, objective?, score_system?,
    related_modes: [{ slug, relation }],
  } | null,
}
```

- **Boundary (how deep):** `applied_settings` carries each overlay's cvar **name + value + comment**, not the full L1 doc of every cvar — a mode applies 13–52 settings and inlining the dictionary would bloat the envelope. `related_entities` resolves only the handful that gate activation. A consumer wanting `coop`'s full doc calls `lookup_entity('coop')`.
- **`applied_settings` is the full ordered sequence** (baseline then mode override, both shown). A consumer wanting effective-only reduces by `(cvar, max apply_order)`. Keeping one honest field beats a deduped one that hides the baseline.
- **`match_quality`:** binary row-presence (consistent with the sibling mechanic tools — no calibration). `strong` if a catalog row resolves; `none` (+ fallback to `search_mechanics`) for `common`, unknown modes, or no match.

## Floor (reachability) changes — ship first

Each enum/description change touches **two** sites: the TS union in the tool file **and** the JSON-schema `enum` + prose in `index.ts` `TOOL_LIST`.

1. **Source default (D2)** — all four flat tools: omitted `gameplay_source` drops the source filter (search all) and returns `gameplay_source_id` in every row; explicit value scopes. `lookup_*` use `DISTINCT ON (gameplay_source_id)` ordered by gate-width (D4).
2. **`search_mechanics`** — add the 7 KTX `kind` values; add a `mode` filter (`ruleset_gate_json->>'mode'`); add `ruleset_gate_json`/`props_json` to the returned row shape.
3. **`lookup_mechanic`** — keep single-row (D3); apply D2/D4. (Optionally note in `suggested_fallback` when a name has more variants — defer unless trivial.)
4. **`search_gameplay_entities`** — add `monster` to the `kind` enum; apply D2.
5. **`lookup_gameplay_entity`** — apply D2/D4.
6. **`ENTITY_TYPE_ENUM`** — add `match_event` (D8); update the "five types" prose in the `lookup_entity`/`search_entities` descriptions to six. Verify `search_entities` surfaces `match_event` rows.

## Discovery + Query re-truth (same commits as the tool changes)

- **`orientation.ts`** — remove the `kind`-on-`lookup_mechanic` instruction; correct the `search_mechanics` kind list; describe `gameplay_source` (omit = all sources); add `describe_mode` as the entry point for "tell me about / set up mode X"; keep the `monster` + `match_event` mentions now that the enums back them.
- **`index.ts` `TOOL_LIST`** — re-truth each affected tool's `description` + `inputSchema` (kind enums, `mode` param, `gameplay_source` wording, `match_event`); add the `describe_mode` entry; add the `case` to the dispatch switch + the import.

## Doc re-truth

- **`VISION.md`** — KTX is loaded (drop "engine port not started"); tool count 10→13; `v0.4.0`→`0.6.0`. Bump `SERVER_VERSION` to `0.6.0` (and `package.json` in lockstep).
- **`API_CONTRACTS.md`** — add `describe_mode` to the catalog (now 13); resolve the `:67`-vs-`:158` ToolResponse contradiction; refresh Open-drift (the KTX-serving item closes here).

## Sequencing

One arc, **floor-first**: land the reachability floor + its Discovery/doc re-truth (KTX data reachable, orientation honest) as the first shippable unit, then `describe_mode` + its orientation/catalog entry. The floor unblocks the data even if `describe_mode` slips; `describe_mode` is not conditional.

## Out of scope / boundaries

- **Do not change the data** — verified sound; the fix is tools + docs.
- **Do not touch concept-note files or the concept loader** — the body-complete refactor runs in a parallel terminal; `describe_mode` only *reads* `concepts` by slug and degrades to `null`.
- The 10 non-exposed `entities` types (log_template, info_key, keyname, …) are a possible separate audit, not this arc.
- No response-shape change: `ToolResponse<T>` already declares optional `count?`/`truncated?` (`types.ts:12-13`), so the `search_*` tools' `truncated` is conformant — there is no drift to fix here. (Corrects a first-pass note.)
- MVDSV's L1 data will route through this same checklist when it lands.

## Acceptance

- `search_mechanics({kind:'game_mode'})` (no source) returns the 27 KTX modes; `search_mechanics({kind:'mode_default', mode:'ca'})` returns ca's overlays with gate+props.
- `describe_mode('ca')` → standalone, populated `applied_settings` (common+mode), `concept_note:null` (until notes load). `describe_mode('instagib')` → mutator, empty `applied_settings`, activation `k_instagib`. `describe_mode('common')` → `none`.
- `lookup_mechanic('lava')` (no source) → 2 rows (id1 env_hazard + ktx death_rule).
- `search_gameplay_entities({kind:'monster'})` → 13 rows; `lookup_entity('<a match_event name>', type:'match_event')` filters.
- `bun` typecheck/build clean; existing `*.test.ts` pass; orientation/descriptions contain no claim the schema can't back.
