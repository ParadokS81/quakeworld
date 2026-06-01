# Game-mode concept-note frontmatter schema

**Reconciled to the experience-first model:** 2026-05-29; refined to the audience-split structure 2026-05-31. Anchored to KTX `1.47-2-g67253dc`. (Supersedes the kind-driven 3-layer schema; see [[experience-group-classification]] for the reframe and [[concept-note-section-structure]] for the v2 body skeleton. The 2026-05-31 refinement drops `activation_summary` — see Retired fields.)

## Purpose

Defines the YAML frontmatter for game-mode concept notes — one note per `gameplay_mechanics` row with `kind='game_mode'`. Frontmatter is the structured contract the LLM oracle can query without parsing prose; the body carries the narrative.

There is **one uniform field set for all 27 modes**. The engine mechanism (is this a `mode_cmd[]` standalone or a `k_<name>` cvar toggle) is retained as a single metadata field (`kind`), not as a structural driver. The old three-layer split (universal / standalone-only / variant-only / mutation-only) is retired along with the kind-driven structure — there are no kind-specific frontmatter layers. What varies between a standalone mode and a match-modifier is which of the *optional queryable facts* apply (a modifier has no roster/loadout/init-array of its own), handled by the absent-not-empty rule below, not by a separate schema layer.

## Layer 1 — universal concept-note fields (inherited)

Mirror the existing concept-notes convention (`README.md` in the parent dir). All concept notes carry these.

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| `title` | string | yes | Quoted display title. `"4on4"`, `"Clan Arena"`, `"Wipeout"`, `"KillQuad"`. No `(mutation)` suffix — `kind` carries the mechanism. |
| `summary` | string | yes | The hook (~1-3 sentences): what the mode is and its central rule. Kept tight; the body's `## Summary` elaborates. |
| `slug` | string | yes | Matches `gameplay_mechanics.name` **strictly** (lowercased, exact, no expansion): `ca` not `clan-arena`; `tot` not `tribe-of-tjernobyl`; `1on1`/`wipeout` as-is. Must align with `canonical_id` so `related_modes` cross-refs resolve. The expanded name goes in `title`. |
| `topic` | enum | yes | `game-mode-reference`. |
| `status` | enum | yes | `draft` \| `reviewed` \| `published` |
| `authored_by` | string | yes | `qw-oracle` for skill-authored; `<handle>` for human curator. |
| `last_updated` | date | yes | ISO date. |
| `scope` | enum | yes | `engine-scoped` (game modes are KTX-scoped). |
| `engines_covered` | list[string] | yes | `[ktx]` |
| `related_entities` | list[canonical_id] | yes | L1 entity refs (cvars/commands) the note draws from. See "Relations" below. |

## Layer 2 — game-mode fields (uniform across all 27 modes)

### Identity + provenance (every mode)

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| `experience_group` | enum | yes | **The primary user-facing axis.** One of the 10 slugs from [[experience-group-classification]]: `standard-game` / `free-for-all` / `arena` / `spawn-rotation` / `objective` / `movement` / `solo-pve` / `aim-practice` / `match-modifier` / `novelty`. |
| `kind` | enum | yes | Engine mechanism **metadata** = the L1 `props_json.mode_class` value: `standalone` (registered in `mode_cmd[]` with a `_um_init` array) \| `mutator` (activated by a `k_<name>` cvar toggle, no init array). Answers "how is it built," not "what is it to a player." NOT the retired three-bucket {standalone/variant/mutation}. |
| `canonical_id` | string | yes | `ktx:game_mode:<slug>`. |
| `gameplay_source_id` | string | yes | `ktx` verbatim (the `gameplay_sources.id`). No version composites (`ktx@<v>` won't join). |
| `source_ref` | string | yes | `<file>:<line>` where the mode is defined (`commands.c:4540` for 4on4; `world.c:969` for killquad). |
| `wiki_status` | enum | yes | `l3-upstream` \| `wiki-upstream` \| `hybrid` — per [[triage-rules]]. |
| `wiki_page_slug` | string | optional | Snapshot page name when wiki was consulted (`Clan_Arena`, `Wipeout`). |
| `introduced_by` | string | optional | Author/mod credit when known (`Dusty` for wipeout). |
| `introduced_in_version` | string | optional | KTX version (`KTX 1.41`) or origin mod (`KTPro`). |
| `note_anchor_version` | string | yes | KTX corpus version the note was anchored to (`1.47-2-g67253dc`). Drives stewardship re-review. |
| `note_origin` | enum | yes | `synthesized` \| `curator` \| `harvested` \| `hybrid`. |

### Queryable gameplay facts (apply only when the mode has its own — absent-not-empty)

These are the few facts worth querying structurally. A **standalone mode** carries the ones that apply to it; a **match-modifier inherits the base mode's** and so **omits** them (it has no roster/loadout/objective/init-array of its own — omit the field, do not write `n/a`). Same discipline as the body's conditional sections.

| Field | Type | When | Notes |
|---|---|---|---|
| `deathmatch_flag` | int | mode sets its own `deathmatch` | `1` (4on4 / team dm1), `3` (1on1 / 2on2 / ffa), `5` (arena). Omit for modifiers. |
| `roster` | string | mode defines a roster | `"4v4"`, `"up to 4v4 (8-player cap)"`. Omit for modifiers. |
| `loadout` | enum | mode defines spawn loadout | `item-pickup` (4on4) \| `full-spawn` (ca/wipeout). Omit for modifiers. |
| `objective` | string | — | Short tag: `frag-leader-at-timelimit`, `eliminate-all-enemies`, `capture-most-flags`, `fastest-time`. Omit for modifiers. |
| `score_system` | string | optional | `frags`, `rounds-won`, `flag-captures`, `time-best`. |
| `mode_default_init_array` | string | `kind: standalone` | Name of the `_um_init` array (`_4on4_um_init`, `carena_um_init`). **Latent metadata, not a live pointer:** it has no MCP resolver today (zero code consumers), so nothing turns `carena_um_init` into its settings. The note's `## Basic ruleset` section is the body-complete source of truth for the enforced values; this field is retained for a future resolver that would join to `gameplay_mechanics` rows with `kind='mode_default'` and `props_json.initstring_array = <value>`. Omit for modifiers (no init array). |

### Retired fields (do NOT carry — dropped with the kind-driven model)

`um_internal_id`, `common_baseline_init_array`, `base_um_id` (UM/bit internals — bit-sharing belongs in Hosting prose); `team_count`, `items_on_map`, `respawn_behavior`, `shape_facets` (over-specified — the prose carries these); `family_slug`, `family_head_canonical_id`, `family_delta` (the variant/family overlay is gone — replaced by `experience_group` + `similar-shape`); `activation_cvar`, `auxiliary_cvars`, `applies_to`, `interaction_summary`, `stacks_with_mutations`, `changes_section_set` (mutation-specific heavy fields — the cvars live in `related_entities`, the interaction in prose).

**Dropped 2026-05-31 (audience-split refinement):** `activation_summary` — zero code consumers, and the body `## Activate` section (see [[concept-note-section-structure]]) is the canonical, richer home for how a player turns the mode on. Take the activation command from the `cmds[]` table there (`ca` → `/carena`, the lone slug≠command case), not in frontmatter.

## Relations — the namespace split between `related_entities` and `related_modes`

Two fields, two namespaces. **Do not mix them.**

- `related_entities` — canonical IDs that resolve to `entities` rows: cvars, commands, macros, info_keys, etc. The `scripts/load-concepts/upsert.ts` loader joins this list to `entities`; anything that doesn't resolve is silently skipped. Game-mode IDs (`ktx:game_mode:*`) live in `gameplay_mechanics`, NOT `entities`, so they do NOT belong here.
- `related_modes` — typed cross-references to other game-mode concept notes; resolves slug-to-slug within `curated/concept-notes/`.

Never self-reference (don't list the note's own id in either).

`relation` enum (leaned to the experience-first model):

- `similar-shape` — **the primary relation**: modes in the same `experience_group` (4on4 ↔ 3on3/2on2/1on1; ca ↔ wipeout; killquad ↔ berzerk as match-modifiers).
- `similar-loadout` — shared distinctive loadout/item rule across groups.
- `derived-from` — direct evolution or fork of the referenced mode.
- `incompatible-with` — a **source-verified** toggle mutual-exclusion: both cvars cannot be active at once because each `Toggle<X>` guards `&& !k_<other>` (midair ↔ lgc, lgc ↔ instagib). **Verify at the toggle handler before using it** — do NOT assume a conflict from a gate. killquad and berzerk are NOT incompatible: they coexist, and berzerk's end-window merely suppresses the killquad drop (`items.c:1974`, window-scoped `k_berzerk`). They are `similar-shape`, not `incompatible-with`.

**Retired relations:** `family-head`, `family-member` (the variant/family overlay is gone), `mutation-of` (modifiers layer on any base — not useful).

**Bit-sharing is NOT a relation.** 4on4 / ca / wipeout share the `UM_4ON4` bit, but that's an engine hosting detail, not a gameplay relationship — it goes in `## See also` **prose**, not in `related_modes`. (This closes the old `sibling-preset` open question: prose, no enum value.)

## Worked examples

### Standalone: ca (arena)

```yaml
---
title: "Clan Arena"
summary: "Round-based team elimination -- every player spawns each round with the full arsenal and red armor, there are no items on the map, and a round ends when one team is wiped out. First team to a majority of rounds takes the series."
slug: ca
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: arena
kind: standalone
deathmatch_flag: 5
roster: "up to 4v4 (8-player cap)"
loadout: full-spawn
objective: eliminate-all-enemies
score_system: rounds-won

canonical_id: ktx:game_mode:ca
gameplay_source_id: ktx
source_ref: commands.c:4552
mode_default_init_array: carena_um_init
wiki_status: hybrid
wiki_page_slug: Clan_Arena
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:command:carena
  - ktx:cvar:k_clan_arena
  - ktx:cvar:k_clan_arena_rounds
  - ktx:cvar:k_noitems
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: wipeout, relation: similar-shape}
---
```

### Match-modifier: killquad (mutator)

Note the omitted queryable facts — a modifier inherits the base mode's roster/loadout/dm/init-array, so it carries none.

```yaml
---
title: "KillQuad"
summary: "A 'kill the carrier' match modifier: the Quad has no map spawn, only a dropped one. While a player holds it no one else can get one, and whenever no Quad is in play a new one drops on the next killed body. Layers on top of any base mode."
slug: killquad
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-29
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:killquad
gameplay_source_id: ktx
source_ref: world.c:969
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc
note_origin: synthesized

related_entities:
  - ktx:cvar:k_killquad
  - ktx:command:killquad
  - ktx:cvar:k_pow_q
  - ktx:cvar:dq
  - ktx:cvar:k_bzk
related_modes:
  - {slug: berzerk, relation: similar-shape}
---
```

## Schema validation rules

- `experience_group` MUST be one of the 10 slugs in [[experience-group-classification]].
- `kind` ∈ {`standalone`, `mutator`} — the L1 `mode_class` value (verify against `gameplay_mechanics.props_json.mode_class`).
- `canonical_id` MUST match `ktx:game_mode:<slug>` (slug = `gameplay_mechanics.name` strictly).
- `mode_default_init_array` (standalone) MUST be a real `gameplay_mechanics.props_json.initstring_array` value.
- `related_modes` slugs MUST resolve to concept-note slugs in this directory (or be marked `pending`).
- `related_entities` MUST resolve to `entities` rows (non-resolving refs are silently dropped by the loader).
- `wiki_page_slug` (when present) MUST match a file in `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/`.

Validation runs in the `game-mode-curate` skill's apply step; failures halt and surface to operator.

## Open questions

1. **`mode_default_init_array` indirection for standard-game rosters.** The roster modes (`1on1`/`2on2`/`3on3`/...) each have their own `_<roster>_um_init`. Verify the array rows exist in `gameplay_mechanics` during drafting; an absent array is an L1 extractor gap to report, not a frontmatter problem.
2. **`score_system` taxonomy.** Kept optional and open-ended; lock the vocabulary if a wiki/renderer consumer needs a closed set.

(Resolved by the reconciliation: the relation enum re-lean, the `shape_facets` removal, and the `sibling-preset` candidate — all handled above.)
