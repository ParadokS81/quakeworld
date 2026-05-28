---
title: "Blitz 2v2"
summary: "Two-team variant of Hoonymode -- the spawn-rotation match shape extended from 1v1 duel to 2-on-2 team play. Four 3-minute rounds, friendly fire on, powerups enabled, exactly two teams of two."
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
activation_summary: "Type `/blitz2v2` on KTX servers where `k_allowed_free_modes` includes the `UM_1ON1HM` bit (value 128) -- the same bit that enables hoonymode and blitz4v4. Pre-match only; blocked when `k_auto_xonx` is active or on hoonymode-only maps."
wiki_status: l3-upstream
note_anchor_version: 1.47-2-g67253dc

family_slug: hoonymode
family_head_canonical_id: ktx:game_mode:hoonymode
um_internal_id: UM_1ON1HM
mode_default_init_array: _2on2hm_um_init
roster: "2v2"
family_delta: "Roster 2v2 (locked teams); team play with friendly fire (vs duel FFA); time-based 4-round series (vs hoonymode's 12 frag-based duel rounds); powerups enabled."

related_entities:
  - ktx:command:blitz2v2
  - ktx:cvar:k_allowed_free_modes
  - ktx:cvar:k_hoonymode
related_modes:
  - {slug: hoonymode, relation: family-head}
  - {slug: blitz4v4, relation: family-cousin}

note_origin: synthesized
---

## Lead

Blitz 2v2 is the two-team variant of Hoonymode -- the same spawn-rotation match shape extended from a duel into 2-on-2 play. Players type `/blitz2v2` in warmup to apply the preset; the match then plays as four 3-minute rounds with friendly fire on, powerups enabled, and exactly two teams of two locked in. Where Hoonymode resolves each round on a single frag in a duel FFA, Blitz 2v2 is team play with the round clock as the round-ender.

## Family delta

Blitz 2v2 shares the `UM_1ON1HM` family bit and the `k_hoonymode 1` machinery with the family head, but the preset diverges from `_1on1hm_um_init` (`commands.c:4232`) along several axes -- it is not a pure roster variant:

- **Roster**: 2 teams of 2 (`maxclients 4`, `k_maxclients 4`, locked via `k_lockmin 1` / `k_lockmax 2` / `k_membercount 1`) vs Hoonymode's 1v1 (`maxclients 2`, no team locks).
- **Teamplay**: `teamplay 2` (friendly fire on, real teams) vs Hoonymode's `teamplay 0` (duel FFA).
- **Round end**: time-based (`timelimit 3`, `fraglimit 0`, `k_overtime 0`) vs Hoonymode's frag-based (`fraglimit 1`, `timelimit 0`, `k_overtime 1`). A blitz round ends when the 3-minute clock expires; a hoonymode round ends when one player scores a frag.
- **Series length**: `k_hoonyrounds 4` (4 rounds = 2 sets of spawns) vs Hoonymode's 12.
- **Powerups**: `k_pow 1` (enabled) vs Hoonymode's `k_pow 0`.
- **Mode discriminator**: `k_mode 2` vs Hoonymode's `k_mode 1`.

Spawn-rotation logic (the per-round side-swap and curated spawn-point selection) is shared with Hoonymode and lives in the same code path -- the variant wraps that mechanism in a team-deathmatch round shell.

## Configuration

<!-- configuration table auto-projected from gameplay_mechanics WHERE props_json->>'initstring_array' = '_2on2hm_um_init'. The 16 mode-specific overrides applied on top of common_um_init (52 baseline cvars). Variant of _1on1hm_um_init -- key deltas: maxclients 4 (vs 2), teamplay 2 (vs 0 ffa), timelimit 3 / fraglimit 0 (vs hoonymode's timelimit 0 / fraglimit 1), k_hoonyrounds 4 (vs 12), k_pow 1 (vs 0), k_overtime 0 (vs 1), k_mode 2 (vs 1). -->

## See also

- `hoonymode` -- family head (`UM_1ON1HM`); shared spawn-rotation mechanism, 1v1 duel roster, frag-based round end.
- `blitz4v4` -- sibling variant; 4v4 roster of the same blitz preset.
- `/blitz2v2` -- activation command (`commands.c:4545`); pre-match only.
- `k_allowed_free_modes` -- server bitmask; must include `UM_1ON1HM` (value 128) for blitz2v2, hoonymode, and blitz4v4 to be selectable.
- `k_hoonymode` -- master cvar for the spawn-rotation mechanism; set to `1` by all three modes in the family.

<!-- triage notes: l3-upstream. No per-variant wiki page (Blitz.json is umbrella, not per-variant). Frontmatter and family-delta drafted from L1 entity ktx:command:blitz2v2 plus the _2on2hm_um_init vs _1on1hm_um_init cvar diff at commands.c:4232-4271. UM_1ON1HM bit-share verified at include/g_local.h:692; um_list[] entries at commands.c:4544-4546. Family head hoonymode.md and sibling blitz4v4.md not yet drafted -- related_modes refs are pending per the schema's allowance. -->
