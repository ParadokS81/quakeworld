# Game-mode experience-group classification

**Locked:** 2026-05-28; **amended 2026-05-29** (absorbed the retired `mode-vs-mutation-classification.md`; `/ca`->`/carena` fixes + slug≠command lesson; corrected the killquad/berzerk interlock to coexist). Anchored to KTX `1.47-2-g67253dc`.

## Purpose

The primary user-facing classification of the 27 KTX game modes, organized by **playing experience** -- what a mode feels like to play, not how the engine implements it.

This is the load-bearing organizing axis for game-mode concept notes:

- Drives the `experience_group` frontmatter field on each note.
- Drives lateral cross-linking -- a note's "See also" leans on its same-group siblings first.
- Seeds the wiki overview / navigation page (deferred; the wiki nav is modeled on this taxonomy once the notes exist).

The engine mechanism (`standalone` vs `mutator` -- the L1 `mode_class`, carried in the `kind` frontmatter field) is retained as **factual metadata** in frontmatter. It answers "how is this built," not "what is this to a player." A player chooses an experience; whether KTX delivers it via a `mode_cmd[]` entry or a `k_<name>` cvar toggle is invisible to them and does not change the note's structure.

## Design principle

> The user experiences a mode, not a mechanism.

`midair` and `killquad` are cvar-toggle "mutators" in the engine, but to a player they are "the midair game" / "the killquad game" -- a distinct playing experience. The note is written to the experience; the mechanism is a frontmatter fact.

This **replaces mechanism-as-structural-driver**: all 27 notes share one section structure regardless of kind, instead of the earlier standalone-9 / mutation-6 / variant-4 split. (Section structure lives in [[concept-note-section-structure]]; frontmatter in [[concept-note-frontmatter-schema]].)

## The ten experience groups

| # | Group | What it is to a player | Members | Count |
|---|---|---|---|---|
| 1 | **Standard game** | Quake's core competitive deathmatch -- pick up weapons/items, frag to win, played as a duel or in even teams across roster sizes | `1on1` `2on2` `3on3` `4on4` `10on10` `XonX` `2on2on2` `3on3on3` `4on4on4` | 9 |
| 2 | **Free-for-all** | Everyone against everyone, no teams; frag count wins | `ffa` | 1 |
| 3 | **Arena** | Round-based elimination -- spawn with the full arsenal, no items on the map, last team standing takes the round | `ca` `wipeout` | 2 |
| 4 | **Spawn-rotation** | Pick your spawn; rounds swap sides. A duel format and its team variants (the hoony/blitz family) | `hoonymode` `blitz2v2` `blitz4v4` | 3 |
| 5 | **Objective** | Win by completing a goal rather than out-fragging | `ctf` | 1 |
| 6 | **Movement / time-trial** | Race the map against the clock; no combat objective | `race` | 1 |
| 7 | **Solo / PvE** | Play against bots or monsters, solo or coop, rather than other players | `tot` `bloodfest` | 2 |
| 8 | **Aim practice** | dmm4-style 1on1 aim/infight practice -- full stacks, fought on aim maps | `midair` `lgc` | 2 |
| 9 | **Match modifiers** | A single rule change layered on top of a normal game; the base mode remains the experience | `berzerk` `killquad` `freshteams` `nosweep` `yawnmode` | 5 |
| 10 | **Novelty / for-fun** | An imported or joke gimmick played casually for a few rounds, not as a competitive format | `instagib` | 1 |

Total: 27.

### Group detail

**1. Standard game.** The deathmatch flag splits this group on a clean, verified line: **team size 2-or-fewer runs `deathmatch 3` (weapons stay on the ground); team size 3-or-more runs `deathmatch 1` (weapons disappear on pickup).** So `1on1` / `2on2` / `2on2on2` are dmm3; `3on3` / `4on4` / `10on10` / `XonX` / `3on3on3` / `4on4on4` are dmm1. The competitive logic: in small teams weapons stay because they should always be available; in larger teams weapon denial and control matter, so picked-up weapons don't respawn in place. (Verified `commands.c:4216-4416`.) `k_mode` is `1` for the duel, `2` for teams.

**2. Free-for-all.** The living FFA experience is **matchless public FFA**: dedicated public servers locked to FFA, running continuously with no match wrapper -- drop in, frag, drop out. The **`ffa` command** is the secondary form: on a dynamic KTX server it starts a timed FFA *match* (countdown) under the same rules (`deathmatch 3`, `k_mode 3`, quad/ring drop on death, `dq 1` / `dr 1`). The single `ffa` note covers both, leading with the matchless public form. (See "How modes are run" below.)

**3. Arena.** `deathmatch 5` + `k_clan_arena` + `k_noitems 1` + `k_dmgfrags 1`. `ca` = no respawns within a round; `wipeout` = limited respawns with growing delay. (Verified `commands.c:4462-4509`.)

**4. Spawn-rotation.** `k_hoonymode 1` + spawn-rotation machinery shared across the family. `hoonymode` is the frag-based duel head; `blitz2v2` / `blitz4v4` are the time-based team variants.

**7. Solo / PvE.** `tot` (Tribe of Tjernobyl) = solo bot challenges, `deathmatch 4` + firebot (`k_fb_enabled 1`). `bloodfest` = waves of monsters, playable solo or coop.

**8. Aim practice.** Combat-focused, 1on1 on small arena aim maps. The baseline is **bare dmm4** (the `dmm4` command -- full arsenal on spawn, no items; a played mode but not one of the 27 -- see "The dmm commands" below). `midair` and `lgc` are dmm4 with rules layered on: `lgc` = the old Lightning Gun Challenge (had its own tournament site -- the reason `LGC.json` in the wiki snapshot is a tournament page, not mode rules); `midair` = score only for killing players mid-air.

**10. Novelty / for-fun.** `instagib` imports the railgun / instant-kill weapon from Quake 2/3 -- a concept foreign to Quake 1, which has no rail, so there is nothing to "practice" for. It is set up as an FFA and played for a few rounds as a gimmick; there are no permanent matchless instagib servers, and it is not a competitive format. Rarely played, documented for completeness. `yawnmode` (a joke mode, currently under Match modifiers because it toggles on a normal game) is a candidate to join here if its drafting shows it to be a standalone gimmick rather than a modifier.

**9. Match modifiers.** Each changes one rule on top of a normal game: `berzerk` (quad to everyone in the last `k_btime` seconds), `killquad` (quad transfers to whoever kills the carrier), `freshteams` / `nosweep` (dmm1 ammo / weapon-pickup tuning), `yawnmode` (a joke mode, "SHITMODE" per the source comment).

## The "go-play" vs "modify" line

Groups 8 and 9 are both built from engine "mutators," but they split on a real experiential line:

- **Aim practice** modes ARE the point of the session. You set up a midair / lgc server and that is the game you came to play. (Novelty / for-fun -- `instagib` -- is go-play in the same way.)
- **Match modifiers** are a tweak on a normal game. You play `4on4` (or any base mode) and `berzerk` / `killquad` / `freshteams` / `nosweep` / `yawnmode` changes one rule; the base game is still the experience.

Consequence for note authoring: a group-9 note leads its "How it plays" with the **delta against the base game**; a group-8 note describes a complete session.

## Specific-assignment notes

- **`instagib`** is Novelty / for-fun, not aim practice -- Quake 1 has no railgun, so there is nothing to practice for; it is a Quake 2/3 weapon imported as a gimmick FFA. (Reclassified from an initial Aim-practice placement after operator review.)
- **`bloodfest`** is Solo / PvE. L1 `mode_class` tags it `standalone` (an earlier mechanism read leaned toward `mutation`); that disagreement is mechanism metadata and does not affect its experience group.
- **`ctf` / `race`** are single-member groups -- each a genuinely distinct experience with no sibling, not an oversight. **`ffa`** likewise; its matchless public form (see "How modes are run") is the living experience and is covered within the same `ffa` note, not a separate mode.

## How modes are run (context for the How-to-play sections)

KTX modes are **dynamic**: one server runs them all, and you switch in the console (`/4on4`, `/1on1`, `/carena`, ...), gated by `k_allowed_free_modes`. This is a KTX-era change -- in the old days each mode ran on its own dedicated port (a 1on1 server, a 4on4 server, ...); KTX made it one-server-fits-all. Modes are **match-based**: the command starts a match (countdown, then the timed game).

The lone exception is **matchless FFA** -- public FFA servers locked to FFA, running continuously with no match wrapper. This is the living, common FFA experience; the `ffa` command (a timed FFA match started on a dynamic server) is the secondary form.

Consequence for authoring: a mode's "How to play" is "on a KTX server, `/<mode>` to start a match," NOT "connect to a dedicated `<mode>` server." Only FFA has a dedicated-server (matchless) form.

**Take the activation command from the `cmds[]` table (`commands.c:809+`), not the slug.** For all but one mode the command equals the slug (`/4on4`, `/1on1`, `/wipeout`). The lone exception is Clan Arena: its slug is `ca` but the registered command is `carena` -- `/ca` does nothing. Verify against `cmds[]` rather than assuming command == slug. (Don't confuse `/carena` with `/arena`, which is the separate Rocket Arena mode -- see below.)

The history itself (dedicated per-mode ports -> dynamic KTX) is candidate material for a foundational "how KTX modes work" note -- parked, operator's call.

## The dmm commands and bare dmm4 (not in the 27)

KTX has player-invokable `dmm1` / `dmm2` / `dmm3` / `dmm4` / `dmm5` commands (`commands.c:725-729`, dispatched to `ChangeDM`) that set the base deathmatch ruleset. They are a different command family from the UserMode modes (`/4on4`, `/carena`, ...) and from the cvar-toggle mutators -- which is why **none of them are in the 27**: the L1 extractor captured UserModes + mutators, not `ChangeDM` commands. Flag as an L1 coverage gap.

Most dmm values are baselines the named modes build on (4on4/3on3 -> dmm1; 1on1/2on2 -> dmm3; ca/wipeout -> dmm5; tot -> dmm4); you would not play "bare dmm1," you would play 4on4. **dmm4 is the exception -- it is played bare** as an aim/infight mode: write `dmm4`, play 1on1 on a small arena aim map (e.g. povdmm4), spawn with the full arsenal, no items. It is the baseline of the **Aim practice** group; `midair` and `lgc` are dmm4 with extra rules layered on.

So bare **dmm4 is a real played mode that warrants its own note**, even though it is not one of the 27 -- likely paired with a `deathmatch-modes` reference note covering the dmm flags. (Exact dmm4 spawn loadout to verify at the spawn handler when that note is drafted.)

**Rocket Arena (`/arena`, `k_rocketarena`) is another played mode outside the 27** -- a 1on1 winner-stays duel (NOT Clan Arena, despite the name collision, and NOT `/carena`). Like the dmm commands it is a cvar toggle the L1 extractor didn't capture as a `game_mode` row; flag it alongside the dmm gap.

The `deathmatch-modes` reference note is seeded by the QWiki "Deathmatch Modes" page (dmm0 = coop; dmm1 = items vanish then respawn; dmm2 = weapons stay, consumables vanish with no respawn [Doom2 holdover, unused]; dmm3 = weapons stay, consumables vanish then respawn [most common -- duels, FFA, some TDM]; dmm4 = full-loadout arena, items don't respawn [aim maps amphi/povdmm4, midair]; dmm5-8 = KTPro). **One wiki claim is stale and must be corrected when that note is drafted:** the page says "dmm5 absent from KTX," but KTX uses `deathmatch 5` as the clan-arena/wipeout ruleset -- live in `items.c:1347/2604`, `client.c:2308`, `bot_items.c:666` and set by `carena_um_init`/`wipeout_um_init`. What is absent from KTX is KTPro's dmm5-8 *gametypes*, not the deathmatch value 5.

### Command-table triage -- `CF_PLAYER` commands that are NOT game modes

Checked so the mode set is settled (these are excluded from the taxonomy):

- **`practice`** (`TogglePractice`) -- a prewar-only toggle: movement / doors / triggers active in a normal game before the match (reloads the map on exit). A utility, not a mode.
- **`freeze`** (`ToggleFreeze`, `commands.c:3797`) -- a prewar-only `k_freeze` toggle: `1` freezes the map's moving entities (doors, lifts/trains, triggers) so they stop during warmup; default `0` = live. KTX's `ktx.cfg:74` documents it: "freeze platforms and doors before matchstart (0 = no, 1 = yes)" (code guards: `doors.c:231`, `plats.c:364` "make trains stop if frozen", `triggers.c:1122`; `k_practice` bypasses). A utility, not a mode -- and note it *locks* the warmup map, the opposite of enabling it.
- **`rpickup`** (`RandomPickup`) -- an election/vote feature: when the vote passes, the server randomizes players into two teams. An election type, not a mode.

## Mechanism metadata: the `kind` field and mutation interlocks

(Absorbed from the retired `mode-vs-mutation-classification.md`. The three-bucket {standalone / variant / mutation} that doc defined is gone; what survives is the L1 two-bucket below, carried as frontmatter metadata.)

The `kind` frontmatter field is the L1 `props_json.mode_class` -- a two-bucket mechanism classifier:

- **`standalone`** -- registered in the `mode_cmd[]` table (`commands.c:4537+`) with its own `_um_init` array. Activation replaces the active mode.
- **`mutator`** -- activated by a `k_<name>` cvar toggle, no `_um_init` array; layers a rule change on top of whatever base mode is active.

This is mechanism, not experience. The user-facing axis is `experience_group` (above), and the two cross freely: a `mutator` like `killquad` is the `match-modifier` experience; `bloodfest` (L1-classed `standalone`) is the `solo-pve` experience. The old "variant" bucket is gone -- roster variants are `standard-game` modes related by `similar-shape`, not a separate kind.

### Mutation interlocks (authoring check when drafting a `mutator`)

Grep the mutator's use-site code paths for `&& !k_<other>` / `!k_<other>` guards -- a guard *can* mean two mutators cannot run together. **But verify what the guard actually gates before calling it an interlock; a gate is not always a mutual-exclusion:**

| Pair | Verdict | Evidence |
|---|---|---|
| `midair` <-> `lgc` | **incompatible** (symmetric) -- both `ToggleMidair` and `ToggleLGC` guard against the other | `commands.c` toggle paths |
| `lgc` <-> `instagib` | **incompatible** (symmetric) -- both toggles guard against the other | `commands.c` toggle paths |
| `killquad` <-> `berzerk` | **NOT incompatible -- they coexist** | `items.c:1974` + `match.c:1265`/`:700` |

The `killquad`/`berzerk` row is the cautionary case. The `!k_berzerk` gate on killquad's drop path (`items.c:1974`) is **window-scoped, not match-wide**: `k_berzerk` is `0` for the whole match and only flips to `1` during the final `k_btime`-second Berzerk window (`match.c:1265`/`:700`), so killquad runs normally until then and merely yields for that closing window (when every player already holds quad anyway). Encode genuine mutual-exclusions via `related_modes: incompatible-with`; encode coexisting pairs like killquad/berzerk as `similar-shape` with the interaction explained in prose. (This corrects the earlier interlocks table, which wrongly listed killquad/berzerk as an interlock.)

Candidates still to audit at their guard sites during per-mode drafting: `freshteams`/`nosweep` (both dmm1-tuned), `bloodfest` against various, `midair`/`instagib`.

## Open L1 gaps

This doc absorbed the mechanism + interlocks content from the now-retired `mode-vs-mutation-classification.md`. What remains open is **L1 coverage** -- flagged, not fixed (the eventual served `deathmatch-modes` note is captured in the parked "promote methodology learnings to served notes" stream in `HANDOVER.md`):

- The `dmm1`-`dmm5` `ChangeDM` commands (`commands.c:725-729`) are not in `gameplay_mechanics` (only UserModes + mutators were extracted). `dmm4` is a real played mode (the Aim-practice baseline).
- **Rocket Arena** (`/arena`, `k_rocketarena`) is a played 1on1 winner-stays mode also outside the 27.
- Decide whether to extend L1 extraction to these, and audit for any other playable mode-commands the 27 missed.

## Appendix -- the 27, fully assigned (verified against the live `gameplay_mechanics` table)

| Mode | experience_group | kind (L1 `mode_class`) | source_ref |
|---|---|---|---|
| 1on1 | standard-game | standalone | commands.c:4537 |
| 2on2 | standard-game | standalone | commands.c:4538 |
| 3on3 | standard-game | standalone | commands.c:4539 |
| 4on4 | standard-game | standalone | commands.c:4540 |
| 10on10 | standard-game | standalone | commands.c:4541 |
| XonX | standard-game | standalone | commands.c:4550 |
| 2on2on2 | standard-game | standalone | commands.c:4547 |
| 3on3on3 | standard-game | standalone | commands.c:4548 |
| 4on4on4 | standard-game | standalone | commands.c:4549 |
| ffa | free-for-all | standalone | commands.c:4542 |
| ca | arena | standalone | commands.c:4552 |
| wipeout | arena | standalone | commands.c:4551 |
| hoonymode | spawn-rotation | standalone | commands.c:4544 |
| blitz2v2 | spawn-rotation | standalone | commands.c:4545 |
| blitz4v4 | spawn-rotation | standalone | commands.c:4546 |
| ctf | objective | standalone | commands.c:4543 |
| race | movement | standalone | race.c:242 |
| tot | solo-pve | standalone | commands.c:4553 |
| bloodfest | solo-pve | standalone | world.c:971 |
| midair | aim-practice | mutator | world.c:966 |
| lgc | aim-practice | mutator | world.c:1083 |
| instagib | novelty | mutator | world.c:975 |
| berzerk | match-modifier | mutator | world.c:930 |
| killquad | match-modifier | mutator | world.c:969 |
| freshteams | match-modifier | mutator | world.c:894 |
| nosweep | match-modifier | mutator | world.c:909 |
| yawnmode | match-modifier | mutator | world.c:1011 |

`experience_group` slug form (for frontmatter): `standard-game` / `free-for-all` / `arena` / `spawn-rotation` / `objective` / `movement` / `solo-pve` / `aim-practice` / `match-modifier` / `novelty`.
