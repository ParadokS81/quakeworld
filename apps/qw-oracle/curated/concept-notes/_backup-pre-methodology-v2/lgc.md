---
title: "LGC Mode (mutation)"
summary: "Mutation that transforms any dmm4 match into a Lightning Gun-only duel: players spawn with LG, Red Armor, and 255 cells; items and buttons are disabled; scoring is damage-based (1 frag per 100 damage) rather than kill-based. Named after the Lightning Gun Competition tournament series."
slug: lgc
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-28
scope: engine-scoped
engines_covered: [ktx]

kind: mutation
canonical_id: ktx:game_mode:lgc
gameplay_source_id: ktx
source_ref: world.c:1083
activation_summary: "Any player (or server admin) runs `/lgcmode` in warmup, or admin sets `k_lgcmode 1` in server.cfg. Requires dmm4 (`deathmatch 4`) -- the command prints an error and aborts if dmm4 is not active."
wiki_status: l3-upstream
introduced_by: meag
note_anchor_version: 1.47-2-g67253dc

activation_cvar: k_lgcmode
applies_to: dmm4-only
interaction_summary: "Transforms a dmm4 match into a forced-LG environment: players spawn with only Lightning Gun and Red Armor, all item pickups are disabled, buttons are inoperable, and scoring switches to damage-based frags (100 damage = 1 frag) with no overtime."
stacks_with_mutations: partial
changes_section_set: [loadout, powerups, scoring, weapon-pickup]

related_entities:
  - ktx:cvar:k_lgcmode
  - ktx:command:lgcmode
  - ktx:cvar:k_midair
  - ktx:cvar:k_instagib
  - ktx:cvar:k_dmgfrags
related_modes:
  - {slug: midair, relation: incompatible-with}
  - {slug: instagib, relation: incompatible-with}

note_origin: synthesized
---

## Lead

LGC Mode is a KTX mutation for dmm4 that replicates the rules of the Lightning Gun Competition (LGC) tournament series inside a live server. Players spawn holding only the Lightning Gun with full cells and Red Armor; all map items and environmental buttons are disabled for the duration of the match. Scoring switches from kill-based frags to damage frags: every 100 damage dealt to an opponent earns 1 frag. The result is a clinical measure of LG skill rather than a general deathmatch.

## What it does

When `k_lgcmode` is enabled, the following changes apply for the match:

**Spawn loadout** -- Every player spawns with exactly:
- Lightning Gun + 255 cells
- Red Armor (200 armor value, 0.8 absorption)
- 250 health

No other weapons or items are granted at spawn. Other items on the map remain visible but cannot be touched.

**Item and button lockout** -- All item pickups are disabled (`items.c:443`): players cannot pick up weapons, armor, health, or powerups. Environmental buttons are also inoperable (`buttons.c:124`). Backpacks in dmm4 normally grant +10 health; in LGC that interaction is capped at 300 HP (`items.c:2446`) and bonus powers (invisibility/invulnerability at 300 HP) are suppressed.

**Damage-based scoring** -- Normal frag increments on kill are blocked (`client.c:5414`). Instead, every 100 points of damage dealt to an enemy earns the attacker 1 frag (`combat.c:936`). This is the same scoring path as `k_dmgfrags` -- in fact the dmgfrags toggle command is blocked while LGC is active because LGC already owns the damage-frag path.

**No overtime** -- LGC matches end at the time limit with no overtime extension (`match.c:557`).

**Per-match LG statistics** -- LGC activates an extended stats package: undershaft count, overshaft count, and hit/miss counts bucketed by distance to opponent. These appear in the end-of-match stats output and in the JSON match report (`stats_json.c:649`).

**Handicap disabled** -- The `/handicap` command is blocked while LGC is active, keeping the playing field identical for all players.

## How to enable

Any player or spectator admin can toggle LGC during warmup:

```
lgcmode
```

Or a server admin sets it persistently in `server.cfg`:

```
deathmatch 4        // required -- lgcmode aborts if not dmm4
k_lgcmode 1
```

The `/lgcmode` command uses the same `is_rules_change_allowed()` gate as other mutation toggles: it is blocked once a match is in progress.

## Interaction with base modes

**Requires dmm4.** LGC refuses to activate (`commands.c:7850`) unless `deathmatch` is set to 4. It makes no sense on dmm1/dmm2/dmm3 because the spawn loadout and item-lockout mechanics are built around the dmm4 respawn model.

**Incompatible with `midair`** -- The interlock is symmetric: enabling LGC disables midair (`commands.c:7858`); enabling midair disables LGC (`commands.c:7547`). Both mutations require dmm4 and both modify the damage or loadout model in ways that conflict.

**Incompatible with `instagib`** -- The same symmetric interlock applies: enabling LGC disables instagib (`commands.c:7863`); enabling instagib disables LGC (`commands.c:7763`).

**Subsumes `k_dmgfrags`** -- LGC uses the same damage-frag scoring path as the standalone `k_dmgfrags` cvar. The `/dmgfrags` toggle command prints an error and returns early while LGC is active (`commands.c:8119`). Do not set both.

**Other mutations** -- LGC is orthogonal to `berzerk`, `killquad`, `yawnmode`, `nosweep`, `freshteams`, and `bloodfest`. None of those mutations touch the dmm4 spawn loadout, item-lockout, or damage-frag paths that LGC owns, so they stack cleanly. (Note: bloodfest and freshteams are rarely meaningful on dmm4 anyway; their operational context is different base modes.)

## Configuration

| Cvar | Default | What it does |
|---|---|---|
| `k_lgcmode` | `0` | Master toggle. `0` = standard dmm4 rules. `1` = LGC mode active. |

LGC has no auxiliary tuning cvars. All LGC behavior -- spawn loadout, item lockout, damage-frag scoring, no overtime -- is hard-coded to the `k_lgcmode` toggle. Related cvars (`k_midair`, `k_instagib`, `k_dmgfrags`) are auto-disabled when LGC activates; they do not tune LGC.

## See also

- `lgcmode` -- in-game toggle command (warmup only; same gate as other mutation toggles)
- `midair` -- incompatible mutation (symmetric interlock; also requires dmm4)
- `instagib` -- incompatible mutation (symmetric interlock)
- `k_dmgfrags` -- damage-frag scoring cvar; LGC subsumes this path (blocked while LGC active)

<!-- triage notes: l3-upstream. The wiki snapshot LGC.json (6289 chars) is about the Lightning Gun Competition tournament series (LGC1, LGC2, LGC3 results, player leaderboards, crew credits) -- completely wrong-topic for the KTX mutation. The char count in triage-rules.md's applied table placed LGC as wiki-upstream based on length alone; actual content review shows it belongs on the l3-upstream path. No harvest performed. Mechanical content drafted entirely from L1 + KTX source (world.c:1083, commands.c:7840-7882, client.c:2216-2226, combat.c:936-946, items.c:443, buttons.c:124, match.c:555-557, stats_json.c:649-672). Author credit from git history (meag, 2017-11-26, commit 209f13a). -->
