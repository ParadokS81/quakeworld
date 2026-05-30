---
title: "KTX server setup: mode gating, defaults, and activation"
summary: "How a KTX server decides which game modes exist, which one it boots into, and how players switch between them. The admin controls availability (a default mode + an allow-list bitmask); the player activates modes with console commands. KTX is built so one server runs every mode -- forcing a server to a single mode runs against the grain."
slug: server-setup
topic: domain-guide
status: draft
authored_by: qw-oracle
scope: engine-scoped
engines_covered: [ktx]
note_anchor_version: 1.47-2-g67253dc
related_entities:
  - ktx:cvar:k_defmode
  - ktx:cvar:k_allowed_free_modes
  - ktx:cvar:k_lockmode
  - ktx:cvar:k_rocketarena
  - ktx:cvar:k_race
related_messages: []
last_updated: 2026-05-30
---

# KTX server setup: mode gating, defaults, and activation

> **Status: draft seed (2026-05-30).** Captures the source-verified hosting/gating model derived during the game-mode concept-note arc. Structure and the per-mode "enforced settings vs tunable knobs" split are still open -- see "Open questions." This note is the single home for hosting mechanics so the per-mode notes don't repeat them.

## Summary

On a KTX server the admin does **not** configure "which mode to run" -- the server offers modes and players switch between them in the console. The admin controls two things: the **default mode** the server boots into (`k_defmode`) and **which modes players may switch to** (`k_allowed_free_modes`, a bitmask). On a stock server every mode is already available. This is a deliberate break from the old model.

## Why one server runs everything

In the old days each game mode was effectively a separate install: a server ran its own gamedir/port for 1on1, another for 4on4, another for Rocket Arena, and you could not switch between them live (you couldn't even change max players freely). KTX collapsed that into **one server that runs every mode**, switchable in-console (`/4on4`, `/1on1`, `/carena`, ...). The hosting model below is all about that one-server design; "force a server to a single mode" is the rare against-the-grain case.

## Two mode families

KTX wires modes two different ways, and they're configured differently:

- **UserModes** -- the 17 entries in `um_list[]` (`commands.c`): the 9 rosters (1on1/2on2/.../4on4on4) + `ffa` + `ctf` + `hoonymode`/`blitz2v2`/`blitz4v4` + `wipeout` + `ca` + `tot`. These are gated by the `k_allowed_free_modes` bitmask. **No per-mode `k_<name>` enable cvar.**
- **Toggle modes** -- activated purely by their own `k_<name>` cvar / command: `rocket-arena`, `midair`, `lgc`, `instagib`, `berzerk`, `killquad`, `freshteams`, `nosweep`, `yawnmode`, `race`, `bloodfest`, plus the `dmm1`-`dmm5` deathmatch-flag commands. **Not in the bitmask** (with the race caveat below).

## Admin levers (`server.cfg`)

### `k_defmode` -- the default mode

`set k_defmode 4on4` -- the UserMode the server boots into at first map load (`world.c:793` register, read `world.c:1119`). Takes a UserMode name only; toggle modes can't be a `k_defmode`. `ktx.cfg` ships it as `4on4`.

### `k_allowed_free_modes` -- the allow-list (bitmask)

A bitmask of `UM_*` bits (`g_local.h:693-705`) controlling which UserModes a player may switch to (gate at `commands.c:4730`).

- **Default is `4095` -- but from `ktx.cfg`, not the engine.** `k_allowed_free_modes` is registered with bare `RegisterCvar` (`world.c:873`), which sets no default, so an *untouched* cvar is `0` = no modes (a broken server). `ktx.cfg` ships `set k_allowed_free_modes 4095`, which every real server execs. So "all modes on by default" is true for real servers, as a *config* default.
- **`4095` = bits 0-11 all on** (the 12 standard slots, values 1..2048). You set it lower only to **restrict** the menu -- not to enable anything.
- **Bit-sharing:** `ca` + `wipeout` ride `UM_4ON4` (8); `tot` rides `UM_FFA` (32). So you cannot ban Clan Arena without also banning 4on4 and Wipeout -- same bit. Bits 12-30 are unused.

## How players activate modes (user side)

| Mode kind | Activate |
|---|---|
| UserMode | `/4on4`, `/1on1`, `/carena`, ... (any still in the allow-list; `ca`'s command is `/carena`, not `/ca`) |
| Toggle mode | get into the required base, then toggle: `/1on1` -> `/arena`, `/dmm4` -> `/midair`, `/killquad` (any base) |
| dmm flag | `/dmm4` etc. (`ChangeDM`) |

All pre-match. Toggle modes are activated by their **command**, never by a `server.cfg` cvar (see next).

## Toggle modes can't be forced from `server.cfg`

Setting `k_rocketarena 1` (or `k_midair 1`, `k_killquad 1`, ...) in `server.cfg` **does not stick**: `common_um_init[]` -- "common settings for all user modes" (`commands.c:4161`) -- resets these cvars to `0` every time any UserMode activates, including the boot default mode. The cvars it resets: `k_killquad`, `k_yawnmode`, `k_instagib`, `k_clan_arena`, `k_rocketarena`, `k_race`, `k_freshteams`, `k_nosweep`, `k_midair`, `k_bzk`. So the warmup command is the only activation.

**Exception:** `k_lgcmode` is **not** in that reset block (nor reset by `ChangeDM`), so LGC's cvar persists -- it's the one toggle that a `server.cfg` set survives.

## Restricting access

- **`k_allowed_free_modes` is the only per-mode ban.** Remove a mode's bit to take it off the menu (mind bit-sharing).
- **Ban by association:** a toggle mode whose base is a UserMode dies if you ban the base. Rocket Arena needs *a duel* (`isDuel()` = `k_mode == duel`, `g_utils.c:1576`), and **two** modes are duels -- 1on1 *and* hoonymode -- so banning 1on1 alone leaves the hoonymode path; ban both `UM_1ON1` and `UM_1ON1HM` to cut arena. (dmm4-based toggles -- midair/lgc/instagib -- can't be bitmask-banned at all, since dmm4 is a command, not a bitmask mode.)
- **`k_lockmode` is not a mode gate** -- it locks teams/roster (with `k_lockmin`/`k_lockmax`), not mode-switching. `is_rules_change_allowed()` (the gate on toggles/changes) only checks **match-in-progress** and **race-mode-on**.

## The seams (the wiring is ad-hoc)

- **`race`** has a `UM_` bit it doesn't use through the menu -- `UM_RACEMODE = 1<<31` (`g_local.h:705`, not in the default 4095) -- yet activates via the `k_race` toggle. A server "allows" race by adding bit 31 to `k_allowed_free_modes` (e.g. `2147487743` = `4095 + 2^31`).
- **`rocket-arena`** has no bit at all (could have been a UserMode; made a bare toggle).
- **`bloodfest`** is coop/single-only, entered by **vote**; its `/bloodfest` command is commented out (`commands.c:740`).

## Forcing a dedicated single-mode server (against the grain)

When a mode activates, KTX execs a config cascade *after* `common_um_init` (`commands.c:4802-4831`): `configs/usermodes/default.cfg` -> `configs/usermodes/<mode>/default.cfg` -> `<mode>/<map>.cfg`. To pin a toggle mode on, put its cvar in the per-usermode file (e.g. `k_rocketarena 1` in `configs/usermodes/1on1/default.cfg`) -- it runs after the reset, so it survives. This is the dedicated-server path; it is deliberately *not* a `server.cfg` thing.

## Open questions (for the fresh-terminal continuation)

1. **Enforced settings vs tunable knobs.** Where do a mode's *enforced* init values (the `_um_init` / mode_default array, e.g. `deathmatch 5`) belong vs the *admin-tunable* knobs (`k_clan_arena_rounds`)? Today the per-mode note curates 3-7 knobs and defers the full array to L1. Confirm or refine.
2. **The bots gap.** Frogbots are used under the hood (tot's firebot, the LGC bot benchmark, practice) but have no concept note, and the `botcmd` command family isn't documented anywhere. Bots aren't a mode, so they don't fit the game-mode shape -- likely a standalone `frogbots.md` feature note. Possibly a bigger gap than it looks.

## References

KTX `1.47-2-g67253dc`. `k_defmode` `world.c:793`/`:1119`; `k_allowed_free_modes` register `world.c:873`, gate `commands.c:4730`, `UM_*` bits `g_local.h:693-705`; `common_um_init` reset block `commands.c:4161`; per-usermode exec cascade `commands.c:4802-4831`; `isDuel` `g_utils.c:1576`; `is_rules_change_allowed` (match + race only) `commands.c`; `ktx.cfg` defaults `resources/example-configs/ktx/ktx.cfg:58,60`.

## Related concept notes

- `deathmatch-modes` -- the `deathmatch` flag values the modes set.
- The per-mode game-mode notes -- each links here for the hosting mechanics rather than repeating them.
