# Game-mode concept-note frontmatter schema

## Purpose

Defines the YAML frontmatter shape for game-mode concept notes (one note per `gameplay_mechanics` row with `kind='game_mode'`, with the family-page exception noted in [[mode-vs-mutation-classification]]).

Game-mode notes extend the existing concept-note frontmatter convention (see `apps/qw-oracle/curated/concept-notes/README.md`) with structured factual data the LLM oracle can query directly, without having to parse prose.

The schema has three layers:
1. **Universal concept-note fields** (inherited from existing convention; non-negotiable for any concept note)
2. **Game-mode universal fields** (all three kinds: standalone / variant / mutation)
3. **Kind-specific fields** (only present when applicable to that kind)

Frontmatter is the structured contract; prose body holds the narrative. The LLM oracle reads both.

## Layer 1 -- universal concept-note fields (inherited)

These mirror the existing concept-notes convention. See `README.md` in this directory's parent for the source. All concept notes carry these; game-mode notes are no exception.

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| `title` | string | yes | Quoted. Display title. `"Wipeout"`, `"Clan Arena"`, `"Berzerk (mutation)"`, etc. |
| `summary` | string | yes | One-paragraph hook (~1-3 sentences). What the mode is and its central rule. |
| `slug` | string | yes | Filename basis. Matches `gameplay_mechanics.name` **strictly** (lowercased, exact, no expansion). So `ca` not `clan-arena`; `tot` not `tribe-of-tjernobyl`; `wipeout` as-is; `1on1` as-is. Alignment with `canonical_id` (`ktx:game_mode:<slug>`) is required so cross-references in `related_modes` resolve unambiguously. The expanded human-readable form goes in `title`, not slug. |
| `topic` | enum | yes | New value for this sub-shape: `game-mode-reference`. (Existing values: `domain-guide`, etc. -- not appropriate here.) |
| `status` | enum | yes | `draft` \| `reviewed` \| `published` |
| `authored_by` | string | yes | `qw-oracle` for skill-authored; `<handle>` for human curator |
| `last_updated` | date | yes | ISO date |
| `scope` | enum | yes | `engine-scoped` (game modes are engine-scoped to KTX) |
| `engines_covered` | list[string] | yes | `[ktx]` |
| `related_entities` | list[canonical_id] | yes | L1 entity refs the note draws from. See "Relations" below for game-mode-specific shape. |

## Layer 2 -- game-mode universal fields (all kinds)

Added for every game-mode concept note regardless of `kind`.

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| `kind` | enum | yes | `standalone` \| `variant` \| `mutation` -- per [[mode-vs-mutation-classification]] |
| `canonical_id` | string | yes | `ktx:game_mode:<name>` -- matches `gameplay_mechanics.name`'s canonical L1 id |
| `gameplay_source_id` | string | yes | The `gameplay_sources.id` value verbatim (`ktx` for KTX modes, `id1` for vanilla QuakeWorld). Does NOT carry version info; that goes in `note_anchor_version`. Do NOT write `ktx@<version>` or similar invented composites -- that won't join. |
| `source_ref` | string | yes | `<file>:<line>` where the mode is defined in KTX source (e.g., `commands.c:4551` for wipeout) |
| `activation_summary` | string | yes | One sentence: "Type `/wipeout` on KTX 1.41+ servers where admin has enabled the wipeout bit in `k_allowed_free_modes`." Captures the player-facing activation path. |
| `wiki_status` | enum | yes | `l3-upstream` (no useful wiki content; concept note is the source) \| `wiki-upstream` (wiki has substantial harvest-worthy content) \| `hybrid` (wiki has some, augment with L1) -- per [[triage-rules]] |
| `wiki_page_slug` | string | optional | Page name in local snapshot, if exists (e.g., `Capture_the_Flag`, `Clan_Arena`) |
| `introduced_by` | string | optional | Author / mod credit when known (e.g., `Dusty` for wipeout, `Molgrum` for yawnmode) |
| `introduced_in_version` | string | optional | KTX version (e.g., `1.41`) or original mod name (e.g., `KTPro` for legacy modes ported into KTX) |
| `note_anchor_version` | string | yes | KTX corpus version this note was anchored to (e.g., `v1.36-1633-g67253dc`). Used for stewardship: re-review when the corpus advances. |

## Layer 3a -- standalone-only fields

For `kind: standalone`. These capture the structural identity of a full game mode.

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| `um_internal_id` | string | yes | The `UM_*` identifier from `mode_cmd[]` table (e.g., `UM_CTF`, `UM_4ON4`). For race: `(separate)`. |
| `mode_default_init_array` | string | yes | Name of the `_um_init` array (e.g., `wipeout_um_init`). Joins to `gameplay_mechanics` rows with `kind='mode_default'` and `props_json.initstring_array = <value>`. |
| `common_baseline_init_array` | string | yes | Usually `common_um_init`. Identifies the baseline cvars applied before mode-specific ones. |
| `base_um_id` | string | optional | When a standalone is built on another UM's mechanics (e.g., wipeout's `mode_cmd` row says base = `UM_4ON4`). Captures inheritance. |
| `family_slug` | string | optional | If the standalone is also a family head (e.g., hoonymode), points to itself. Otherwise omit. |
| `team_count` | enum | yes | `solo` \| `team` \| `multi-team` \| `variable` |
| `roster` | string | yes | "1v1", "4v4", "variable (2v2 / 3v3 / 4v4)", etc. |
| `loadout` | enum | yes | `full-spawn` (CA, wipeout) \| `item-pickup` (1on1, 4on4) \| `mixed` (race?) |
| `items_on_map` | enum | yes | `all` \| `partial` \| `none` |
| `respawn_behavior` | string | yes | Short tag: `instant`, `increasing-delay-on-death`, `round-based-no-respawn`, `none`. |
| `objective` | string | yes | Short tag: `frag-leader-at-timelimit`, `eliminate-all-enemies`, `capture-most-flags`, `fastest-time`, etc. |
| `score_system` | string | yes | Short tag: `frags`, `rounds-won`, `flag-captures`, `time-best`, etc. |
| `shape_facets` | list[string] | optional | Cross-cutting tags: `arena`, `team_elimination`, `round_based`, `capture_objective`, etc. Aids LLM retrieval. |

## Layer 3b -- variant-only fields

For `kind: variant`. Variants live in families; the family page carries shared content, the variant page carries deltas.

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| `family_slug` | string | yes | Slug of the family page this variant belongs to (e.g., `xonx`, `hoonymode` -- the latter doubles as standalone head per cross-classification quirks in [[mode-vs-mutation-classification]]) |
| `family_head_canonical_id` | string | yes | Canonical id of the family head's L1 entity |
| `um_internal_id` | string | yes | Variant's UM identifier (often shared with family: `UM_1ON1HM` for both blitz2v2 and blitz4v4) |
| `mode_default_init_array` | string | yes | Variant's own `_um_init` array name |
| `roster` | string | yes | "1v1", "2v2", "3-team 2v2v2", etc. -- the variant delta dimension |
| `family_delta` | string | yes | One sentence: what differs from the family base. "Roster size 2v2; otherwise identical to hoonymode rules." |

Variants inherit `objective` / `score_system` / `loadout` / etc. from the family page; they're not repeated in the variant frontmatter.

## Layer 3c -- mutation-only fields

For `kind: mutation`. Mutations layer on top of a base mode; their frontmatter focuses on the activation cvar and interaction effects.

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| `activation_cvar` | string | yes | Primary cvar (e.g., `k_bzk` for berzerk, `k_lgcmode` for lgc -- NOT `k_lgc`). |
| `auxiliary_cvars` | list[string] | optional | Related cvars (duration, parameters): for berzerk, `["k_btime"]`; for freshteams, the ~15-cvar tuning family. |
| `applies_to` | enum | yes | `any` \| `standalone-modes-only` \| `team-modes-only` \| `dmm1-only` \| ... -- captures which base modes the mutation can layer on |
| `interaction_summary` | string | yes | One sentence describing what changes: "Applies quad damage to all players in the last `k_btime` seconds of a match." |
| `stacks_with_mutations` | enum | yes | `yes` (stacks freely with all other mutations) \| `no` (replaces or breaks others; admin should pick one) \| `partial` (stacks with most but has documented conflicts -- specific incompatible mutations listed in `related_modes` with `relation: incompatible-with`). Killquad is the canonical `partial` example: stacks with most mutations but is hard-gated against berzerk by `!k_berzerk` at `items.c:1974`. |
| `changes_section_set` | list[enum] | optional | Which gameplay sections this mutation affects: `respawn`, `loadout`, `powerups`, `scoring`, `time-window`, `weapon-pickup`, etc. Aids LLM retrieval. |

Mutations do NOT carry `mode_default_init_array` (they have no init array). They DO carry `related_entities` for the cvars they use.

## Relations -- the namespace split between `related_entities` and `related_modes`

There are two relation fields and they cover different namespaces. **Do not mix them.**

- `related_entities` -- canonical IDs that resolve to rows in the `entities` table: cvars, commands, macros, info_keys, hud_elements, etc. The `scripts/load-concepts/upsert.ts` loader joins this list to `entities` at upsert time; anything that doesn't resolve there is silently skipped. Game-mode IDs (e.g., `ktx:game_mode:ca`) live in `gameplay_mechanics`, not `entities`, so they DO NOT belong here.
- `related_modes` -- typed cross-references to other game-mode concept notes. Resolves slug-to-slug within `curated/concept-notes/`. Game-mode-to-game-mode references go here, exclusively.

Do NOT include the note's own canonical_id in either list (no self-references).

```yaml
# wipeout's frontmatter -- correct shape:
related_entities:
  - ktx:command:wipeout            # entities-table ref (a command)
  - ktx:cvar:k_clan_arena          # entities-table ref (a cvar)
  - ktx:cvar:k_allowed_free_modes  # entities-table ref (a cvar)
  # NO ktx:game_mode:* entries here

related_modes:
  - {slug: ca, relation: similar-shape}        # arena-style team elimination
  - {slug: bloodfest, relation: similar-loadout}   # full-spawn weapon arsenal
  - {slug: 1on1, relation: family-cousin}      # closely related family
```

The `relation` value in `related_modes` is a small enum, growing from worked examples. Current recognised values:

- `family-head` -- this mode is the head of the family containing the cross-referenced mode (used in variant -> standalone-head references)
- `family-cousin` -- both modes belong to the same family but neither is the head
- `similar-shape` -- modes share a top-level gameplay shape (arena, race, deathmatch) without family lineage
- `similar-loadout` -- modes share a distinctive loadout/item-rule pattern
- `derived-from` -- this mode is a direct evolution or fork of the cross-referenced mode
- `mutation-of` -- (used on mutation notes pointing at base modes) this mutation primarily applies on top of the cross-referenced mode
- `incompatible-with` -- mutation-pair conflict; both mutations cannot be active simultaneously (killquad <-> berzerk is the canonical case)

New relation values are added during worked-example authoring; don't invent unilaterally in a fan-out batch.

## Provenance fields (universal extensions)

Game-mode notes are mechanical enough that we want explicit provenance tracking beyond the existing `last_updated` convention.

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| `note_origin` | enum | yes | `synthesized` (sub-agent draft) \| `curator` (human-authored) \| `harvested` (harvested from wiki narrative) \| `hybrid` (synthesized + curator-polished) |
| `note_anchor_version` | string | yes | Already in Layer 2; restated here for emphasis. The L1 corpus version. |
| `note_last_verified` | date | optional | Last time a curator confirmed the note matches current source. Used by stewardship sweeps to find stale notes. |
| `note_rereview_flag` | bool | optional | When source signals the note may be stale (e.g., the underlying mode_default rows changed in a later KTX version), set this for curator attention. |

## Worked examples (one per kind)

### Standalone: wipeout

```yaml
---
title: "Wipeout"
summary: "Round-based team mode where players spawn with full weapons and items are absent from the map; a round ends when all enemy players are eliminated, with respawn delay growing on consecutive deaths."
slug: wipeout
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-28
scope: engine-scoped
engines_covered: [ktx]

kind: standalone
canonical_id: ktx:game_mode:wipeout
gameplay_source_id: ktx
source_ref: commands.c:4551
activation_summary: "Type /wipeout on KTX 1.41+ servers where k_allowed_free_modes includes the UM_4ON4 bit (value 8) -- the same bit that enables 4on4 and ca. See bit-sharing patterns below."
wiki_status: hybrid
wiki_page_slug: Wipeout
introduced_by: Dusty
introduced_in_version: KTX 1.41
note_anchor_version: 1.47-2-g67253dc

um_internal_id: UM_4ON4
mode_default_init_array: wipeout_um_init
common_baseline_init_array: common_um_init
base_um_id: UM_4ON4
team_count: team
roster: "variable (2v2 / 3v3 / 4v4)"
loadout: full-spawn
items_on_map: none
respawn_behavior: increasing-delay-on-death
objective: eliminate-all-enemies
score_system: rounds-won
shape_facets: [arena, team_elimination, round_based]

related_entities:
  - ktx:command:wipeout
  - ktx:cvar:k_mode
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: ca, relation: similar-shape}
  - {slug: bloodfest, relation: similar-loadout}

note_origin: synthesized
---
```

### Variant: blitz2v2

```yaml
---
title: "Blitz 2v2"
summary: "Two-team variant of Hoonymode -- spawn-rotation duel mechanics extended to 2-on-2."
slug: blitz2v2
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-28
scope: engine-scoped
engines_covered: [ktx]

kind: variant
canonical_id: ktx:game_mode:blitz2v2
gameplay_source_id: ktx
source_ref: commands.c:4545
activation_summary: "Type /blitz2v2 on KTX servers where k_allowed_free_modes includes the UM_1ON1HM bit (value 128) -- the same bit that enables hoonymode and blitz4v4. See bit-sharing patterns below."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc

family_slug: hoonymode
family_head_canonical_id: ktx:game_mode:hoonymode
um_internal_id: UM_1ON1HM
mode_default_init_array: _2on2hm_um_init
roster: "2v2"
family_delta: "Roster size 2v2; otherwise identical to hoonymode's spawn-rotation rules."

related_entities:
  - ktx:command:blitz2v2
related_modes:
  - {slug: hoonymode, relation: family-head}
  - {slug: blitz4v4, relation: family-cousin}

note_origin: synthesized
---
```

### Mutation: berzerk (stacks_with_mutations: yes)

```yaml
---
title: "Berzerk (mutation)"
summary: "Late-game mutation that grants Quad Damage to all players during the final seconds of a match. Layered on top of any base mode."
slug: berzerk
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-28
scope: engine-scoped
engines_covered: [ktx]

kind: mutation
canonical_id: ktx:game_mode:berzerk
gameplay_source_id: ktx
source_ref: match.c:689
activation_summary: "Server admin sets k_bzk to 1 in server.cfg, and optionally k_btime to set the duration in seconds."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc

activation_cvar: k_bzk
auxiliary_cvars: [k_btime]
applies_to: any
interaction_summary: "Applies quad damage to all players during the last k_btime seconds of a match. Internal state k_berzerk transitions 0 -> 1 at the threshold time."
stacks_with_mutations: yes
changes_section_set: [powerups, time-window]

related_entities:
  - ktx:cvar:k_bzk
  - ktx:cvar:k_btime
related_modes:
  - {slug: killquad, relation: incompatible-with}

note_origin: synthesized
---
```

### Mutation: killquad (stacks_with_mutations: partial)

Demonstrates the `partial` enum value for `stacks_with_mutations` and the `incompatible-with` relation pattern.

```yaml
---
title: "KillQuad (mutation)"
summary: "Mutation that replaces the normal Quad Damage pickup with a one-shot dropped quad: when the player carrying quad dies, a 10-second quad pickup spawns at their death position -- but only if no other player currently holds quad and no quad item is already on the level."
slug: killquad
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-28
scope: engine-scoped
engines_covered: [ktx]

kind: mutation
canonical_id: ktx:game_mode:killquad
gameplay_source_id: ktx
source_ref: world.c:969
activation_summary: "Server admin sets k_killquad 1 in server.cfg, or any player runs killquad in warmup to toggle it pre-match."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc

activation_cvar: k_killquad
applies_to: any
interaction_summary: "At match start the normal Quad Damage item is removed. When the quad-carrier dies, a 10-second quad pickup spawns at the corpse -- but only if no one else holds quad and no quad item is on the level. Cannot stack with berzerk: the drop path is hard-gated by !k_berzerk at items.c:1974."
stacks_with_mutations: partial
changes_section_set: [powerups, drop_item]

related_entities:
  - ktx:cvar:k_killquad
  - ktx:command:killquad
  - ktx:cvar:k_pow_q
  - ktx:cvar:dq
  - ktx:cvar:k_bzk
related_modes:
  - {slug: berzerk, relation: incompatible-with}

note_origin: synthesized
---
```

## UM bit-sharing patterns (load-bearing for activation_summary prose)

`k_allowed_free_modes` is a bitmask of `UM_*` flags (defined at `include/g_local.h:693-704`). KTX defines only 13 UM bits: `UM_1ON1`, `UM_2ON2`, `UM_3ON3`, `UM_4ON4`, `UM_10ON10`, `UM_FFA`, `UM_CTF`, `UM_1ON1HM`, `UM_2ON2ON2`, `UM_3ON3ON3`, `UM_4ON4ON4`, `UM_XONX`, `UM_RACEMODE`. The activation gate at `commands.c:4730` is `um_list[umode].um_flags & k_allowed_free_modes`.

Several standalones reuse base-mode bits rather than having their own. **A standalone's `activation_summary` MUST name the bit it actually uses, NOT a fictional per-mode bit.** Bit-sharing groups:

| Shared bit | Modes that activate from it |
|---|---|
| `UM_4ON4` (value 8) | 4on4, ca, wipeout |
| `UM_FFA` (value 32) | ffa, tot |
| `UM_1ON1HM` (value 128) | hoonymode, blitz2v2, blitz4v4 |
| `UM_RACEMODE` (1<<31) | race only |
| Each `UM_<N>ON<N>` (1on1, 2on2, 3on3, 10on10, 2on2on2, 3on3on3, 4on4on4, XonX) | own bit each |
| `UM_CTF` (value 64) | ctf only |

When drafting the activation_summary for ca, wipeout, tot, blitz2v2, or blitz4v4, name the shared bit explicitly and note which sibling modes also activate from it. Do not write "the wipeout bit" / "the ca bit" / "the tot bit" -- those bits do not exist.

This is also reflected in the `base_um_id` frontmatter field for standalones (which captures the bit the mode reuses) and in `um_internal_id` for variants (which carries the family-shared UM).

## Schema validation rules

- `kind` is the discriminator -- it determines which kind-specific layer applies.
- `canonical_id` MUST match the pattern `ktx:game_mode:<slug-lowercased>` (or the engine namespace appropriate when this skill ports to other engines).
- `mode_default_init_array` (for standalone/variant) MUST be a real `gameplay_mechanics.props_json.initstring_array` value.
- `activation_cvar` (for mutation) MUST be a real `ktx:cvar:<name>` entity in L1.
- `related_modes` slugs MUST resolve to other concept-note slugs in this directory (or be marked as `pending`).
- `wiki_page_slug` (when present) MUST match a file in `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/`.

Validation runs as part of the apply step in the `game-mode-curate` skill. Validation failures halt the note authoring and surface to operator.

## Open questions

1. **~~`relation` enum lock-in.~~** RESOLVED 2026-05-28 after the killquad + wipeout worked-example pair. Enum locked to: `family-head`, `family-cousin`, `similar-shape`, `similar-loadout`, `derived-from`, `mutation-of`, `incompatible-with`. Documented inline above. New values added during worked-example authoring; not invented in fan-out batches.
2. **`shape_facets` taxonomy.** Open-ended initially. Lock after ~3-5 standalone modes are drafted and the right vocabulary surfaces.
3. **`family_slug` for hoonymode self-reference.** Hoonymode is both standalone AND head of the hoonymode family. The standalone note's `family_slug` should point to itself; variants point to the same slug. Confirm this self-reference is acceptable rather than introducing a separate "is_family_head" boolean.
4. **`mode_default_init_array` indirection.** Variants' init arrays (e.g., `_2on2hm_um_init`) are explicit in commands.c. Verify all 11 variant init arrays are populated as `gameplay_mechanics` rows during per-variant drafting -- if any are absent, that's a Layer 1 extractor gap to report rather than a frontmatter problem.
5. **Concept-loader directory recursion.** The current loader (`scripts/load-concepts/index.ts:21`) reads only the top level of `curated/concept-notes/`, so subdir layouts are silently skipped. V1 of the game-mode notes ships flat alongside existing concept notes. If the directory grows unwieldy, extend the loader to recurse rather than reshape the naming convention; this is a future-arc question, not a v1 blocker.

These are not authoring blockers. The killquad + wipeout pair resolved #1 (the enum lock) and surfaced the bit-sharing patterns + namespace-split + slug-strictness refinements applied above.
