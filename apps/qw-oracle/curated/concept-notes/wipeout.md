---
title: "Wipeout"
summary: "Round-based team elimination mode where players spawn with a full loadout and items are absent from the map. A round ends when every player on one team is dead; each player has a fixed number of respawns, and the per-respawn delay grows with consecutive deaths. Introduced by Dusty in KTX 1.41, derived from Diabotical's Wipeout."
slug: wipeout
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-28
scope: engine-scoped
engines_covered: [ktx]

kind: standalone
canonical_id: ktx:game_mode:wipeout
gameplay_source_id: ktx@1.47-2-g67253dc
source_ref: commands.c:4551
activation_summary: "Type `/wipeout` on KTX 1.41+ servers where `k_allowed_free_modes` includes the `UM_4ON4` bit (value 8) -- the same bit that enables 4on4 and ca (wipeout, 4on4, and ca all share UM_4ON4; tot uses UM_FFA instead)."
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
  - ktx:cvar:k_clan_arena
  - ktx:cvar:k_clan_arena_rounds
  - ktx:cvar:k_clan_arena_max_respawns
  - ktx:cvar:k_mode
  - ktx:cvar:k_noitems
  - ktx:cvar:k_spw
  - ktx:cvar:k_allowed_free_modes
related_modes:
  - {slug: ca, relation: similar-shape}

note_origin: hybrid
---

## Lead

Wipeout is a round-based team mode in KTX where players spawn with a full weapon loadout and items are absent from the map. A round ends when every player on one team is eliminated; each player has a fixed number of respawns per round, and consecutive deaths increase the respawn delay -- the fourth respawn on a 4-player team is 30 seconds away. Introduced by Dusty in KTX 1.41 as a QuakeWorld take on Diabotical's Wipeout mode, it plays similarly to Clan Arena but with respawns instead of one-shot rounds.

## How to play

Type `/wipeout` in the console on a KTX server (1.41 or later) where `k_allowed_free_modes` includes the `UM_4ON4` bit (value 8). Most public servers that allow 4on4 or Clan Arena also implicitly allow Wipeout, since the three modes share the same UM_4ON4 bit (ToT uses UM_FFA instead). Players join a team and ready up; the round begins when both teams are ready. Standard team-switch and late-join commands apply (`/team`, `/latejoin <team>`).

The mode operates on top of the Clan Arena machinery (`k_clan_arena 2` is the wipeout discriminator throughout `clan_arena.c`), so the player-facing rhythm is familiar: queue up, ready up, play the series, see end-of-round stats.

## Rules

- **Spawns**: every player spawns with a full weapon arsenal and 100/100 health/armor (the `k_spw 1` "KT safety spawns" path used by Clan Arena and Wipeout).
- **Items**: no items on the map (`k_noitems 1`). No mega-health, no armor pickups, no weapon pickups -- the loadout you spawn with is the loadout for the round.
- **Series structure**: a match is 9 rounds (`k_clan_arena_rounds 9`). The team that wins the most rounds takes the match.
- **Round end**: a round ends when every player on one team is dead with no respawns left. The surviving team wins the round.
- **Respawns**: each player gets up to 4 respawns per round (`k_clan_arena_max_respawns 4`). After exhausting respawns, the player is out for the rest of the round.
- **Respawn delay** scales with consecutive deaths and team size (`calc_respawn_time` in `clan_arena.c:125`):
  - 4-player team: 5, 10, 20, 30 seconds for deaths 1 through 4
  - 3-player team: 4, 8, 16, 24 seconds
  - 2-player team: 3, 6, 12, 18 seconds
- **Solo-team exception**: a player who is the only one on their team gets one free instant respawn on their first death of the round. After that, normal scaling applies.
- **Spawn protection**: fresh spawns are invulnerable briefly to prevent spawn-camping. The invuln only applies during live matches, not in prewar.
- **Suicides**: a player who suicides cannot respawn for the rest of that round (a hard rule, not a delay scaling -- separate from the normal respawn-count budget).
- **Per-map spawn placements**: Wipeout uses curated spawn-point configurations on some maps (`wipeout_spawn_configs[]` in `clan_arena.c:32`; currently shipped for `dm3`). On maps without curated configs, default DM spawns are used.
- **Teams**: 2 teams of 1-4 players each (`k_lockmin 1` / `k_lockmax 2` / `k_maxclients 8`). Non-participating players are forced to spectator and have no team assignment.

## Strategy

Wipeout's round economy rewards teams that trade efficiently and play the respawn budget. Three patterns recur:

- **First-death tempo**. The 5-second first-respawn (4-team) is cheap; the second is 10, third is 20, fourth is 30. Trading early in a round costs less than dying late. Teams that win the opening duel can press the surviving advantage before the punished side's respawns trickle back in.
- **Stack respawn waves**. If two teammates die within seconds of each other, they come back in roughly the same window. A team that gets staggered respawns -- one player up, one player down -- often loses the man-advantage fights even with equal frags.
- **Solo-team play**. Solo players' first-death-instant-respawn rule makes 1v1, 1v2, and 1v3 sub-rounds more recoverable than the raw frag count suggests. Aggressive trade-downs from the solo side can flip a lost round.
- **Map control without items**. With no map items to contest, the strategic terrain is sightlines, choke points, and respawn-side rotations. Map knowledge transfers from CA more than from regular team deathmatch.

<!-- verify: strategy section is curator-extrapolation from the mechanical rules + general arena-mode patterns. No source-defensible community testimony anchored here; first curator pass should ground these claims or remove them. -->

## Maps

The Wipeout wiki page lists community-tested maps by roster size. The list reflects community judgment about which maps play well at each size; KTX source carries one curated spawn-point config (for `dm3`) but does not enforce the map list.

| Map | 2v2 | 3v3 | 4v4 |
|---|---|---|---|
| naked6 (a.k.a. small Cmt3) | yes | no | no |
| qtdm3 | yes | no | no |
| shifter | yes | no | no |
| rwild | yes | yes | no |
| Halo | yes | no | no |
| bloodwalk / aerorun | no | yes | yes |
| vaporize_beta103 | no | yes | no |
| a2 | no | yes | no |
| katla | no | yes | yes |
| Schloss | no | yes | yes |
| Dm3 | no | no | yes |
| Stroggopolis | no | no | yes |
| CMT3 | no | no | yes |
| CMT4 | no | no | yes |
| Dust2 | no | no | yes |
| ht_almostlost | kinda | yes | no |
| q3dm6qw | yes | yes | yes |

Community judgment (per the Wipeout wiki page, 2024-10-30 snapshot): maps marked "no" tend to be either too sparse or too large for that roster size.

## History

Wipeout was added to KTX by Dusty (`dusty-qw` on GitHub) on 2022-02-11 (`1e8b612` -- "CLAN ARENA: added wipeout mode"). The `/wipeout` activation command landed about five weeks later (`1194647`, 2022-03-17 -- "CLAN ARENA: /wipeout enables wipeout mode"). The mode has continued to evolve through 2024-2025 with spawn-config refinements (PR #368), per-team-size respawn-time tuning, solo-team rules, and tracking-while-dead polish (PRs #327 / #338 / #415). The bulk of wipeout's source lives in `clan_arena.c` because the mechanism reuses the CA round/team plumbing, gated on `k_clan_arena == 2`.

KTX 1.41 was the first stable release to ship wipeout. The mode is designed after Diabotical's Wipeout (and conceptually similar to Quake Champions' Sacrifice and CSGO's standard round model) -- spawn with everything, fight to elimination, scale rewards by round survival.

## Server setup

Set `k_allowed_free_modes` to include the `UM_4ON4` bit (value 8). The same bit also enables 4on4 and Clan Arena -- KTX does not assign a separate bit per shared-family mode (see `g_local.h:693-704` for the bit map; ToT shares UM_FFA with FFA, not UM_4ON4). KTX 1.41 or later is required.

Beyond that, no per-mode hosting setup is needed -- the mode plays on any standard QW map; per-map spawn configs are shipped in source for `dm3` and fall back to default spawns elsewhere.

## Configuration

<!-- configuration table auto-projected from gameplay_mechanics WHERE props_json->>'initstring_array' = 'wipeout_um_init'. The 22 mode-specific overrides applied on top of common_um_init (52 baseline cvars). Key wipeout-only values: k_clan_arena=2 (wipeout discriminator), k_clan_arena_rounds=9, k_clan_arena_max_respawns=4, k_noitems=1, k_spw=1, timelimit=0, deathmatch=5, teamplay=4, k_maxclients=8. -->

## See also

- `ca` -- Clan Arena, the sibling mode that shares the CA round/team machinery (`k_clan_arena 1`). Wipeout differs in respawns (CA is one death, you're out) and round structure.
- `/wipeout` -- activation command (`commands.c:4551`).
- `k_clan_arena` -- master discriminator; `1` = Clan Arena, `2` = Wipeout.
- `k_clan_arena_rounds` / `k_clan_arena_max_respawns` -- series length and per-round respawn budget.

<!-- triage notes: hybrid. Wiki page (Wipeout, ~1.5K chars) provides Lead + Rules + Maps as scaffold; all mechanical claims (loadout, respawn cap, 30-second max, no items, round-based win) verified against L1 wipeout_um_init + clan_arena.c source. Maps table harvested as-is (community judgment, not source-anchored). Strategy section is curator extrapolation flagged for review. History section harvested from KTX git log (commit messages + PR numbers, 2022-2025). -->
