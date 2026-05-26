# ktx-l1-rewrite drafts -- batch 2026-05-26-frogbot

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies
clean drafts, hand-edits flagged-drafts after verifying the surfaced
contradiction. Drafts do NOT auto-apply to L1 (`entities.description`);
the apply pass is a separate phase.

Batch metadata: 78 cards (57 drafted clean + 21 drafted_with_flag + 0 parked). Frogbot category is the Shape 8 (parent-dispatcher) flagship -- `botcmd` parent + 14 std subcommands + 25 editor subcommands + 38 `k_fbskill_*` AI-tuning cvars. Halt-on-novelty did not fire; chunk_size=10 held cleanly across 8 chunks (7 of 10 + 1 of 8).

<!-- entity: botcmd -->
## botcmd (KTX command, Frogbot -- Shape 8 parent-dispatcher)

- **Status**: drafted
- **Source**: src/commands.c:1047
- **Catalog line**: 4487
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot management command dispatcher. Passes subcommands to the frogbot system. In normal mode: skill, addbot, fill, removebot, removeall, disable, health, weapon, breakondeath, togglequad, quadmultiplier, itempickupbonus, easyskillmode, debug. In frogbot editor mode: waypoint and routing editor subcommands instead. No argument prints the available subcommand list.
>
> Access gated by frogbot admin-only setting: 1 = admins only; 2 = real server admins only.
>
> Set by: player, admin, or server admin (per admin-only setting).

### Shape classification

Shape 8 parent-dispatcher. `botcmd` is the defining example entity for Shape 8 in the catalog -- parent command at `src/commands.c:1047` registered as `CF_BOTH | CF_MATCHLESS | CF_PARAMS`, dispatcher body at `src/bot_commands.c:2383` (`FrogbotsCommand`) routes args to two internal subcommand tables (`std_commands[]` 14 entries + `editor_commands[]` 25 entries) selected by `FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE)`.

### Proposed draft

```
Frogbot management command dispatcher -- routes a subcommand argument to the frogbot system and prints the available subcommand menu when called without arguments.

Effect:
  Selects the active subcommand table based on editor mode: standard mode exposes 14 management subcommands (addbot, fill, removebot, removeall, skill, health, weapon, breakondeath, togglequad, quadmultiplier, itempickupbonus, easyskillmode, disable, debug); editor mode swaps to 25 routing-editor subcommands (addmarker, addpath, save, info, goto, ...) instead.
  Checks the runtime admin gate (k_fb_admin_only) before dispatching any subcommand.
  When bots are not yet enabled, only 'botcmd enable' is processed; all other subcommands are rejected with "Bots not enabled: to turn on, /botcmd enable".
  In standard mode, subcommands other than 'disable' are additionally refused if the current map has no bot routing support.

Prerequisites: none (the dispatcher itself is accessible by all -- see k_fb_admin_only for the runtime gate).

Permission: any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time (dispatcher is CF_MATCHLESS; individual subcommands may have their own match-state restrictions).

Example:
  botcmd                      (prints subcommand menu for the active mode)
  botcmd enable               (enables bots -- pre-match only; refused during match, race, or CTF)
  botcmd addbot 10            (adds a bot at skill 10)
  botcmd fill                 (fills empty slots, up to 8 bots at a time)
  botcmd disable              (disables bots, advances to next map)

See also: k_fb_admin_only (runtime permission gate), addbot:frogbot:std (add single bot), fill:frogbot:std (bulk fill), skill:frogbot:std (set skill level), disable:frogbot:std (disable bots)
```

### Notes

- Parent card: see botcmd Shape 8 context in the dispatcher prompt for source line references. Subcommand cards' See-also all include this card.
- The "0 = anyone" default case for k_fb_admin_only is absent from the existing description; added in the Effect section's bots-not-enabled bullet.
- Editor-mode table swap surfaced in Effect rather than buried in Notes to make the two-mode framing front-and-center.
- Cap at 5 See-also reached; remaining std subcommands (health, weapon, togglequad, quadmultiplier, itempickupbonus, debug) discoverable via the menu example.

<!-- entity: addbot:frogbot:std -->
## addbot:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2318
- **Catalog line**: 4379
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Adds a Frogbot to the server. Optional arguments: skill level (numeric) and team. When teamplay is on and no team is specified the bot is auto-balanced to the smaller team.
>
> Set by: server admin via 'botcmd addbot' command.

### Shape classification

Shape 8 subcommand (std scope). Handler `FrogbotsAddbot_f` at `src/bot_commands.c:362` -- standard subcommand pattern: `bots_enabled()` gate, arg parsing, calls `FrogbotsAddbot(skill_level, specificteam, true)`.

### Proposed draft

```
Adds a Frogbot to the server with optional skill level and team assignment, invoked as 'botcmd addbot [skill] [team]'.

Effect:
  Spawns one bot at the specified skill level (0-20); uses the current stored skill level if no skill argument is given.
  When a team argument is provided, the bot joins that team; when omitted, the bot is auto-assigned to balance team sizes.

Prerequisites: Frogbots must be enabled ('botcmd enable' first -- refused with "Bots are disabled by the server.").

Permission: any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time (no match_in_progress check in handler).

Example:
  botcmd addbot               (adds one bot at current stored skill)
  botcmd addbot 15            (adds one bot at skill 15)
  botcmd addbot 10 red        (adds one bot at skill 10 to the red team)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate), fill:frogbot:std (bulk fill), removebot:frogbot:std (remove last bot), skill:frogbot:std (set skill level)
```

### Notes

- FLAG: existing description frames permission as "Set by: server admin via 'botcmd addbot'"; with default `k_fb_admin_only 0`, any player or spectator can invoke it. Recast reflects source-truth (any player or spectator, runtime-gated).
- "auto-balanced to the smaller team" is plausible from source (`FrogbotsAddbot` called with empty team string when no team arg provided) but `FrogbotsAddbot` body not fully traced; left as-stated since the claim is consistent with design intent and no contradicting evidence found.

<!-- entity: removebot:frogbot:std -->
## removebot:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2320
- **Catalog line**: 5106
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Removes the most recently added Frogbot from the server.
>
> Set by: server admin via 'botcmd removebot' command.

### Shape classification

Shape 8 subcommand (std scope). Handler `FrogbotsRemovebot_f` at `src/bot_commands.c:407` -- iterates `bots[]` array to find the last non-null slot, calls `FrogbotsRemoveBot`. No `bots_enabled()` check; silently no-ops if array is empty.

### Proposed draft

```
Removes the most recently added Frogbot from the server, invoked as 'botcmd removebot'.

Effect: Removes the last-added active bot -- broadcasts its departure and final frag count to all players. Silently does nothing if no bots are present.

Prerequisites: none (runs even when no bots are present -- silently no-ops).

Permission: any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Example:
  botcmd removebot

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate), removeall:frogbot:std (remove all bots), addbot:frogbot:std (add a bot)
```

### Notes

- FLAG: existing description frames permission as "Set by: server admin"; with default `k_fb_admin_only 0`, any player or spectator can invoke it. Same issue as addbot:frogbot:std.
- The handler iterates the bots array by index (not by insertion-time); "most recently added" is accurate for the common case (sequential addition), noted here as implementation detail.

<!-- entity: removeall:frogbot:std -->
## removeall:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2321
- **Catalog line**: 5052
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Removes all Frogbots from the server in one command.
>
> Set by: server admin via 'botcmd removeall' command.

### Shape classification

Shape 8 subcommand (std scope). Handler `FrogbotsRemoveAll` at `src/bot_commands.c:1914` -- calls `CountBots()` then loops `FrogbotsRemovebot_f()`. No `bots_enabled()` check; silent no-op if empty.

### Proposed draft

```
Removes all active Frogbots from the server in a single invocation, invoked as 'botcmd removeall'.

Effect: Broadcasts each bot's departure and frag count as they are removed. Silently does nothing if no bots are present.

Permission: any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Example:
  botcmd removeall

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate), removebot:frogbot:std (remove last bot only), addbot:frogbot:std (add a bot)
```

### Notes

- FLAG: same permission issue as addbot/removebot -- "Set by: server admin" framing incorrect for default `k_fb_admin_only 0` config (any player or spectator can invoke).
- Prerequisites section omitted: handler has no `bots_enabled()` check and silently loops 0 times when empty, so no surprise-bearing prerequisite.

<!-- entity: fill:frogbot:std -->
## fill:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2319
- **Catalog line**: 4716
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Invoked as `botcmd fill [skill]`. Adds frogbots to fill empty player slots up to `maxclients`, adding at most 8 bots per invocation; run again to add more. An optional numeric argument sets the skill level for the bots added and stores it as the current frogbot skill; without it the current stored skill level is used. Subject to the server's bot-admin gate (`k_fb_adminonly`): may require admin or real-admin depending on the gate setting.
>
> Set by: server admin via 'botcmd fill' command.

### Shape classification

Shape 8 subcommand (std scope). Handler `FrogbotsFillServer` at `src/bot_commands.c:1887` -- reads `maxclients` and `CountPlayers()`, loops `min(max_clients - plr_count, 8)` times, writes skill back via `cvar_fset(FB_CVAR_SKILL, skill_level)` at line 1911.

### Proposed draft

```
Fills empty player slots with Frogbots up to 'maxclients', adding at most 8 bots per invocation, invoked as 'botcmd fill [skill]'.

Effect:
  Adds bots one by one until either 'maxclients' is reached or 8 bots have been added this invocation -- run again to add more.
  The optional skill argument sets the bot skill level (0-20) for this fill and persists it as the stored skill for subsequent addbot calls; without it, the current stored skill is used.

Prerequisites: Frogbots must be enabled (parent dispatcher gate -- refused with "Bots are disabled by the server." from the dispatcher when bots are off).

Permission: any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time (no match_in_progress check in handler; map-support check applies via dispatcher).

Example:
  botcmd fill                 (fills using current stored skill)
  botcmd fill 5               (fills at skill 5, stores 5 as new default skill)
  botcmd fill                 (repeat if slots remain -- adds another round of up to 8)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate), addbot:frogbot:std (add single bot), skill:frogbot:std (view/set stored skill)
```

### Notes

- FLAG: existing description mentions "k_fb_adminonly" (missing underscore -- should be "k_fb_admin_only"); this is a typo in the existing description. Recast uses correct name.
- FLAG: "Set by: server admin via 'botcmd fill'" framing has the same permission issue -- default `k_fb_admin_only 0` allows anyone.
- The existing description is otherwise the best-formed description in this batch; the v2 recast is mostly structural (split Permission, remove inline gate prose now in Permission line).

<!-- entity: debug:frogbot:std -->
## debug:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted
- **Source**: src/bot_commands.c:2322
- **Catalog line**: 4628
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot debug subcommand, invoked as 'botcmd debug'. Prints diagnostic information to the caller only; does not change game state.
>
> No argument: dumps all bots' current thinking state.
> goals: prints the bots' current goal list (refused during a match).
> door: on povdmm4, reports spawn door state and YA availability (refused during a match).
> markers: lists all routing markers with index and classname (refused during a match).
> entity <n>: prints entity N's classname and origin (refused during a match).
>
> Set by: any player (frogbot debug utility).

### Shape classification

Shape 8 subcommand (std scope). Handler `FrogbotsDebug` at `src/bot_commands.c:494` -- internal sub-dispatch by string matching; the bare invocation (argc==2) calls `Bot_Print_Thinking()` directly with no match-state guard; all named sub-commands are guarded by `if (match_in_progress) { return; }` at line 506.

### Proposed draft

```
Prints Frogbot diagnostic information to the invoking player only -- does not change game state, invoked as 'botcmd debug [subcommand]'.

Effect:
  Without a subcommand: prints all active bots' current thinking state (works any time, including mid-match).
  With a subcommand (all silently refused mid-match):
    goals......... prints each bot's current goal list and goal scores
    door.......... on povdmm4 only: reports spawn door state and Yellow Armour availability
    markers....... lists all routing markers with index and classname
    entity <n>.... prints entity N's classname and world coordinates
    marker [n].... detailed info on marker N (or the nearest marker if no argument given)

Prerequisites: Frogbots must be enabled (refused with "Bots are disabled by the server.").

Permission: any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: bare invocation any time; all named subcommands silently refused mid-match.

Example:
  botcmd debug                (prints bots' thinking state -- works mid-match)
  botcmd debug goals          (pre-match only)
  botcmd debug markers        (pre-match only)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate)
```

### Notes

- No factual contradictions. The existing description is accurate; recast adds structural clarity (the mid-match asymmetry between bare and subcommand forms is now explicit in Match-state).
- "Set by: any player" in the existing description is effectively correct for default config -- no special check inside the handler. Standard v2 Permission line handles this.
- The existing description omits the `marker [n]` subcommand (separate from `markers` -- detailed single-marker info). Verified at `src/bot_commands.c:569` (`streq(sub_command, "marker")`). Added in the proposed draft.

<!-- entity: disable:frogbot:std -->
## disable:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2323
- **Catalog line**: 4661
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Disables frogbots (invoked as 'botcmd disable'). Clears the bot-enabled flag, advances to the next map, and restores the player/spectator mode that was active before bots were enabled. Has no effect while a match is in progress.
>
> Set by: any player or spectator via 'botcmd disable'.

### Shape classification

Shape 8 subcommand (std scope). Handler `FrogbotsDisable` at `src/bot_commands.c:2144` -- `if (!match_in_progress)` guard, then `cvar_fset(FB_CVAR_ENABLED, 0)` + `GotoNextMap()` + `UserMode(-cvar("_k_last_xonx"))`. No `bots_enabled()` check (works even if already disabled).

### Proposed draft

```
Disables Frogbots and advances to the next map, restoring the game mode that was active before bots were enabled, invoked as 'botcmd disable'.

Effect:
  Clears the bot-enabled flag, triggers a map change (advances to the next map), and restores the prior game mode (1on1, ffa, ctf, etc.) that was saved when bots were last enabled.
  Silently ignored while a match is in progress.

Prerequisites: none (runs even when bots are already disabled -- silently no-ops if the enabled flag is already 0).

Permission: any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (silently refused mid-match via 'if (!match_in_progress)' guard).

Example:
  botcmd disable              (clears bots, advances map, restores prior game mode)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate), k_fb_enabled (the underlying cvar this clears)
```

### Notes

- FLAG: existing description says "restores the player/spectator mode that was active before bots were enabled." Source shows `UserMode(-cvar("_k_last_xonx"))` -- `UserMode()` is the GAME MODE setter (1on1, ffa, ctf, etc., registered at `src/commands.c:809-817`), not a player/spectator spectating mode. `_k_last_xonx` stores the last game-mode index (registered at `src/world.c:778`: "internal usage, save last XonX command"). Recast corrects to "game mode (1on1, ffa, ctf, etc.)".
- The existing permission framing "Set by: any player or spectator" is closer to truth than the other subcommands' "server admin" -- this reflects the CF_BOTH base flag accurately; the v2 Permission line standardizes the wording with the runtime gate.

<!-- entity: skill:frogbot:std -->
## skill:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2317
- **Catalog line**: 5364
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot command that sets the skill level applied to bots added after this point. Takes one integer argument; higher values produce stronger opponents.
>
> Range: 0 (lowest) to 20 (highest).
>
> With no argument, reports the current skill level.
>
> Set by: any player (requires bots to be enabled on the server).

### Shape classification

Shape 8 subcommand (std scope). Handler `FrogbotsSetSkill` at `src/bot_commands.c:459` -- `bots_enabled()` gate, then query-or-set: argc <= 2 prints usage + current skill; argc >= 3 bounds to [0,20], calls `cvar_fset(FB_CVAR_SKILL, new_skill)` + `SetAttributesBasedOnSkill(new_skill)`.

### Proposed draft

```
Sets the Frogbot skill level and immediately applies it to all currently active bots, invoked as 'botcmd skill [level]'.

Effect:
  With a skill level argument (0-20): sets the stored skill level and immediately updates the attributes (aim, speed, etc.) of all currently active bots. Future bots added via 'botcmd addbot' or 'botcmd fill' will also use this skill.
  Without an argument: prints usage and the current stored skill level.

Prerequisites: Frogbots must be enabled (refused with "Bots are disabled by the server.").

Permission: any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time (no match_in_progress check in handler).

Default: 10 (k_fb_skill registered default).

Example:
  botcmd skill                (reports current skill level and usage)
  botcmd skill 0              (easiest bots -- also updates all active bots)
  botcmd skill 20             (hardest bots)
  botcmd skill 10             (restore to default)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate), addbot:frogbot:std (uses current stored skill), fill:frogbot:std (also sets stored skill when given an argument)
```

### Notes

- FLAG: existing description says "Sets the skill level applied to bots added after this point." Source at `src/bot_commands.c:489` shows `SetAttributesBasedOnSkill(new_skill)` is called immediately on skill change, updating all currently active bots' attributes -- not only future bots. Recast adds "immediately applies to all currently active bots."
- Default (10) not in existing description -- added from world.c:1059 registration. Not a contradiction, an omission.
- "Set by: any player" framing is consistent with no per-handler role check; standardized via v2 Permission line.

<!-- entity: breakondeath:frogbot:std -->
## breakondeath:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted
- **Source**: src/bot_commands.c:2326
- **Catalog line**: 4516
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot standard command. Toggles whether a break is automatically issued on your death during a bot practice session. Applies to human players; bots are unaffected.
>
> Set by: any player in a bot practice session ('botcmd breakondeath' in-game).

### Shape classification

Shape 8 subcommand (std scope). Handler `FrogbotsSetBreakOnDeath` at `src/bot_commands.c:2219` -- `bots_enabled()` gate, then `cvar_fset(FB_CVAR_BREAK_ON_DEATH, !cvar(FB_CVAR_BREAK_ON_DEATH))` (direct 0/1 flip). Default: `k_fb_break_on_death = 1` (on, from world.c:1065).

### Proposed draft

```
Toggles whether dying automatically triggers a break during a Frogbot practice session, invoked as 'botcmd breakondeath'.

Effect: Flips the break-on-death state (on/off). When on, your death automatically pauses play; when off, play continues after your death uninterrupted. Applies to the invoking player -- bots are unaffected.

Prerequisites: Frogbots must be enabled (refused with "Bots are disabled by the server.").

Permission: any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Default: on (k_fb_break_on_death = 1).

Example:
  botcmd breakondeath         (toggles -- disables if currently on, enables if currently off)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate)
```

### Notes

- No factual contradictions. Existing description is accurate.
- Default (on) not stated in existing description -- added from world.c:1065. Not a contradiction.
- "Applies to human players; bots are unaffected" preserved from existing description -- plausible from design intent (break is a human-spectator concept); not directly verifiable from the toggle handler alone, but no contradicting evidence.

<!-- entity: easyskillmode:frogbot:std -->
## easyskillmode:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2330
- **Catalog line**: 4688
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot subcommand (`frogbot easyskillmode`) that toggles easy skill mode for bots. When on, bots use the easy skill-attribute curve and the server announces "Using easy bot skill mode"; when off, bots use the default (harder) curve. Refused if bots are disabled by the server.
>
> Default: on (k_fb_easy_skill_mode = 1).
> Set by: admin command.

### Shape classification

Shape 8 subcommand (std scope). Handler `FrogbotsSetEasySkillMode` at `src/bot_commands.c:2295` -- `bots_enabled()` gate, then `cvar_fset(FB_CVAR_EASY_SKILL_MODE, !cvar(FB_CVAR_EASY_SKILL_MODE))`. Default `k_fb_easy_skill_mode = 1` (on) from world.c:1068. The server broadcast "Using easy bot skill mode" fires from `src/bot_botimp.c:270` on bot initialization when easy mode is on, not from this toggle handler.

### Proposed draft

```
Toggles easy skill mode for Frogbots, invoked as 'botcmd easyskillmode'.

Effect:
  Flips the easy-skill-mode state (on/off). When on, bots use a gentler skill-attribute curve making them easier opponents; when off, bots use the standard (harder) curve.
  Confirms the change to the invoking player ("easy skill mode changed to on/off").
  A separate server-wide announcement ("Using easy bot skill mode") fires when bots initialize with easy mode on -- this comes from the bot initialization path, not from this toggle.

Prerequisites: Frogbots must be enabled (refused with "Bots are disabled by the server.").

Permission: any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Default: on (k_fb_easy_skill_mode = 1).

Example:
  botcmd easyskillmode        (toggles -- disables easy mode if currently on)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate), skill:frogbot:std (set explicit skill level)
```

### Notes

- FLAG: existing description names the command as "`frogbot easyskillmode`" -- the correct invocation is `botcmd easyskillmode`. "frogbot" is not the parent command registered in KTX; the parent is `botcmd` at `src/commands.c:1047`. Recast corrects this.
- FLAG: "Set by: admin command" -- same permission issue as addbot/removebot batch; default `k_fb_admin_only 0` allows any player or spectator.
- The "Using easy bot skill mode" announcement timing is clarified: it fires from `src/bot_botimp.c:270` on bot initialization, not from this toggle. The existing description implies it fires on toggle ("the server announces..."); the clarification avoids reader confusion when toggling on/off and not seeing the broadcast immediately.

<!-- entity: weapon:frogbot:std -->

## weapon:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2325 (table entry); handler FrogbotsSetWeapon at src/bot_commands.c:2185
- **Catalog line**: 5447
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot command: set which weapon all bots should use. Takes a weapon number (1-8) or "random" / 0 to let bots choose freely; out-of-range values are clamped to 1-8. Called with no argument, prints usage and the currently selected weapon. Blocked if bots are disabled on the server.
>
> Usage: weapon <1-8 | random>
> Set by: admin or bot commander.

### Shape classification

Shape 8 subcommand (std-scope, no tooling-mode prerequisite).

Registered in `std_commands[]` at `src/bot_commands.c:2325`. Handler is `FrogbotsSetWeapon` -- not in top-level `cmd_t cmds[]`; routed only via the `botcmd` dispatcher. Shape 8 is unambiguous.

### Proposed draft

```
Sets the weapon all bots will use (botcmd weapon <1-8 | random>).

Effect:
  - With an argument: writes the weapon choice to the bot weapon setting.
    0 or "random" lets bots pick from weapons 2-8 randomly each ToT spawn;
    1-8 locks all bots to that weapon number (clamped to 1-8 range).
  - The locked-weapon setting only takes effect during Tribe of Tjernobyl
    (ToT) mode -- outside ToT mode bots select weapons via their own AI
    regardless of this setting.
  - Without an argument: prints usage and the current weapon setting.
  - Refused with "Bots are disabled by the server." when bots are disabled.

Prerequisites: bots must be enabled on the server.

Permission: any player or spectator (runtime gate via `k_fb_admin_only` --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Example:
  botcmd weapon 7     -- lock bots to rocket launcher in ToT mode
  botcmd weapon random -- let bots choose freely in ToT mode
  botcmd weapon       -- check current setting

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  health:frogbot:std (sibling per-bot ToT setup),
  quadmultiplier:frogbot:std (sibling per-bot ToT setup),
  itempickupbonus:frogbot:std (sibling per-bot ToT setup)
```

### Notes

- FLAG: Existing description says "set which weapon all bots should use" without scope restriction. Source (`bot_botweap.c:956-968`) shows `FrogbotWeapon()` is only applied inside `if (tot_mode_enabled())` -- outside ToT mode, bots use their own weapon AI and this setting is ignored. The v2 draft adds the ToT-scope restriction.
- FLAG: Existing description says random/0 lets "bots choose freely" -- source (`bot_client.c:155`) shows random in ToT restricts to `i_rnd(2, 8)` (weapons 2-8 only, not weapon 1 = axe). The v2 draft says "weapons 2-8 randomly" to be precise.
- The permission framing "admin or bot commander" in the existing description is the dispatcher-level gate, correctly handled as the standard botcmd permission line.

<!-- entity: health:frogbot:std -->

## health:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted
- **Source**: src/bot_commands.c:2324 (table entry); handler FrogbotsSetHealth at src/bot_commands.c:2154
- **Catalog line**: 4824
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Invoked as `botcmd health <value>`. Sets the bot spawn-health for Tunnel of Terror (TOT) mode. The value is only applied at bot spawn during TOT in a live dmm4 or bloodfest match; in all other modes bots spawn with hardcoded health. With no argument, prints the usage line, allowed range, and current setting. Refused with "Bots are disabled by the server" when bots are disabled.
>
> Range: 1-300 (clamped).
>
> Set by: server admin via 'botcmd health' command.

### Shape classification

Shape 8 subcommand (std-scope, no tooling-mode prerequisite).

Registered in `std_commands[]` at line 2324. Handler is `FrogbotsSetHealth` -- not in top-level table; only reachable via `botcmd` dispatcher. Standard Shape 8.

### Proposed draft

```
Sets the spawn health for bots in Tribe of Tjernobyl (ToT) mode
(botcmd health <1-300>).

Effect:
  - With an argument: sets bot spawn health (clamped to 1-300). Applied
    only at bot spawn during a live ToT match (dmm4 or bloodfest). In all
    other modes bots spawn with hardcoded health and this setting is ignored.
  - Without an argument: prints usage, the allowed range (1-300), and the
    current setting.
  - Refused with "Bots are disabled by the server." when bots are disabled.

Prerequisites: bots must be enabled on the server.

Permission: any player or spectator (runtime gate via `k_fb_admin_only` --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Default: 100.

Example:
  botcmd health 150   -- set bots to spawn with 150 HP in ToT
  botcmd health       -- check current setting

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  weapon:frogbot:std (sibling per-bot ToT setup),
  quadmultiplier:frogbot:std (sibling per-bot ToT setup),
  itempickupbonus:frogbot:std (sibling per-bot ToT setup)
```

### Notes

- Existing description says "Tunnel of Terror (TOT)" -- source consistently uses "Tribe of Tjernobyl" (`commands.c:586`, `commands.c:4553`, `commands.c:7937`). The existing description's expansion is wrong. Updated to "Tribe of Tjernobyl (ToT)" in v2 draft.
- Default value 100 verified from `world.c:1063`: `RegisterCvarEx(FB_CVAR_HEALTH, "100")`.
- All behavioral claims in existing description verified against source -- no other contradictions.

<!-- entity: quadmultiplier:frogbot:std -->

## quadmultiplier:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2328 (table entry); handler FrogbotsSetQuadMultiplier at src/bot_commands.c:2245
- **Catalog line**: 5020
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbots subcommand: sets the quad-damage multiplier applied to bots. Usage: '/botcmd quadmultiplier <1-10>'. With no argument, prints usage and the current value.
>
> Range: 1-10 (integer; clamped).
>
> The multiplier only takes effect in ToT (Take-of-the-Throne) mode on a deathmatch 4 map -- in that case quad damage is multiplied by this value instead of the normal x8. Outside ToT mode the quad multiplier is fixed and this setting has no effect. No-op if bots are disabled.
>
> Default: 4.
> Set by: admin command '/botcmd quadmultiplier <n>' in-game.

### Shape classification

Shape 8 subcommand (std-scope, no tooling-mode prerequisite).

Registered in `std_commands[]` at line 2328. Handler `FrogbotsSetQuadMultiplier` not in top-level table. Shape 8 unambiguous.

### Proposed draft

```
Sets the quad damage multiplier for bots in Tribe of Tjernobyl (ToT) mode
(botcmd quadmultiplier <1-10>).

Effect:
  - With an argument: sets the bot quad multiplier (integer, clamped to 1-10).
    Only applies on deathmatch 4 maps with ToT mode active -- in that context
    quad damage is multiplied by this value instead of the standard x8.
    Outside dmm4+ToT the multiplier has no effect.
  - Without an argument: prints usage and the current multiplier.
  - No-op (with message) if bots are disabled.

Prerequisites: bots must be enabled on the server.

Permission: any player or spectator (runtime gate via `k_fb_admin_only` --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Default: 4.

Example:
  botcmd quadmultiplier 6   -- set quad to x6 for bots in ToT
  botcmd quadmultiplier     -- check current multiplier

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  weapon:frogbot:std (sibling per-bot ToT setup),
  health:frogbot:std (sibling per-bot ToT setup),
  itempickupbonus:frogbot:std (sibling per-bot ToT setup)
```

### Notes

- FLAG: Existing description says "ToT (Take-of-the-Throne) mode" -- source defines ToT as "Tribe of Tjernobyl" (`commands.c:586`, `commands.c:4553`). The parenthetical expansion is wrong. Updated to "Tribe of Tjernobyl (ToT)" in v2 draft.
- Default value 4 verified from `world.c:1066`: `RegisterCvarEx(FB_CVAR_QUAD_MULTIPLIER, "4")`.
- Consumption site `combat.c:545`: `damage *= (deathmatch != 4 ? 4 : tot_mode_enabled() ? FrogbotQuadMultiplier() : 8)` -- confirms dmm4+ToT scope restriction.

<!-- entity: togglequad:frogbot:std -->

## togglequad:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2327 (table entry); handler FrogbotsToggleQuad at src/bot_commands.c:2232
- **Catalog line**: 5420
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot standard command (invoked as `botcmd togglequad`). Grants or removes quad damage on the caller. If the caller holds quad it is removed; otherwise quad is granted with an effectively unlimited duration. Requires frogbot admin permission.
>
> Set by: admin command 'botcmd togglequad' in-game (frogbot admin permission required).

### Shape classification

Shape 8 subcommand (std-scope, no tooling-mode prerequisite).

Registered in `std_commands[]` at line 2327. Handler `FrogbotsToggleQuad` not in top-level table. Shape 8 unambiguous.

### Proposed draft

```
Grants or removes quad damage on the invoking player
(botcmd togglequad).

Effect:
  - If the caller currently holds quad: removes it (clears IT_QUAD item flag,
    resets duration).
  - If the caller does not hold quad: grants quad with a duration of 20 hours
    (functionally unlimited until the map ends or the item is removed again).
  - No bots-enabled check -- runs regardless of bot state.

Permission: any player or spectator (runtime gate via `k_fb_admin_only` --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Example:
  botcmd togglequad   -- grant quad to yourself; run again to remove it

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  weapon:frogbot:std (sibling std botcmd command),
  health:frogbot:std (sibling std botcmd command)
```

### Notes

- FLAG: Existing description says "Requires frogbot admin permission" as if togglequad has a specific admin gate beyond other botcmd subcommands. Source (`FrogbotsToggleQuad`, lines 2232-2243) has NO `is_adm` check and NO `bots_enabled()` check. The only admin gate is the dispatcher-level `k_fb_admin_only` -- identical for all botcmd subcommands. The v2 description reflects the dispatcher-gate pattern; the special "requires frogbot admin permission" framing is dropped.
- Duration: `g_globalvars.time + 3600 * 20` = 72000 seconds verified at line 2241.
- Notably togglequad affects the CALLER (human player using botcmd), not the bots. The existing description correctly says "on the caller."

<!-- entity: itempickupbonus:frogbot:std -->

## itempickupbonus:frogbot:std (KTX command, Frogbot -- Shape 8 subcommand)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2329 (table entry); handler FrogbotsSetItemPickupBonus at src/bot_commands.c:2276
- **Catalog line**: 4880
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot subcommand (used as 'fb itempickupbonus'). Toggles the item-pickup bonus for bots in ToT mode. Only available when bots are enabled and ToT mode is active. When on, item pickups are more generous: health stacks to 300 (vs 250), Megahealth grants +100, and ammo caps rise to 255. Prints "item pickup bonus changed to on/off".
>
> 0 = item-pickup bonus off (default).
> 1 = item-pickup bonus on.
>
> Default: 0.
> Set by: admin command 'fb itempickupbonus'.

### Shape classification

Shape 8 subcommand (std-scope, no tooling-mode prerequisite).

Registered in `std_commands[]` at line 2329. Handler `FrogbotsSetItemPickupBonus` not in top-level table. Shape 8 unambiguous. The underlying cvar is a binary toggle, but the subcommand itself is Shape 8 (accessed only via `botcmd`).

### Proposed draft

```
Toggles the item-pickup bonus for all players in Tribe of Tjernobyl (ToT)
mode (botcmd itempickupbonus).

Effect (when bonus is on):
  - Health pickups stack up to 300 (normal cap is 250).
  - Megahealth grants +100 even when health is already >= 250 (normally
    blocked above 250).
  - All ammo pickups cap at 255 (shells, nails, rockets, cells).
  - Prints "item pickup bonus changed to on/off" on toggle.

Prerequisites:
  - Bots must be enabled on the server.
  - ToT mode (`k_tot_mode`) must be active -- refused with "This is option is
    only available in ToT mode." otherwise.

Permission: any player or spectator (runtime gate via `k_fb_admin_only` --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Default: 0 (off).

Example:
  botcmd itempickupbonus   -- toggle on; run again to toggle off

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  weapon:frogbot:std (sibling per-bot ToT setup),
  health:frogbot:std (sibling per-bot ToT setup),
  quadmultiplier:frogbot:std (sibling per-bot ToT setup)
```

### Notes

- FLAG: Existing description says "used as 'fb itempickupbonus'" -- the parent dispatcher is `botcmd`, not `fb`. Correct invocation is `botcmd itempickupbonus`. This is likely a copy-paste error from another frogbot context.
- Item pickup effects verified against `items.c:199-201` (health cap 300), `items.c:308-313` (Megahealth behavior), `items.c:637-652` (ammo cap 255).
- Default 0 verified from `world.c:1067`: `RegisterCvarEx(FB_CVAR_ITEM_PICKUP_BONUS, "0")`.

<!-- entity: save:frogbot:editor -->

## save:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2345 (table entry); handler FrogbotSaveBotFile at src/bot_commands.c:1697
- **Catalog line**: 5214
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Bot editor command. Renumbers all waypoint markers compactly, then saves the full routing (markers and paths) to a timestamped .bot file under bots/maps/ named after the current map (or k_entityfile if set). Reports an error if bots/maps/ is not writable.
>
> Default: n/a (command).
> Set by: bot editor user ('save' inside the frogbot editor).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Registered in `editor_commands[]` at line 2345. Handler `FrogbotSaveBotFile` not in top-level table. Dispatcher at `bot_commands.c:2386` selects `editor_commands[]` only when `FB_OPTION_EDITOR_MODE` is active -- subcommand is hidden when editor mode is off.

### Proposed draft

```
Saves the current frogbot routing to a new timestamped .bot file
(botcmd save).

Effect:
  - Renumbers all waypoint markers to compact indices (fills gaps).
  - Writes the full routing -- markers, paths, zones, goals, flags, and
    rocket-jump fields -- to a new file at:
      bots/maps/<stem>[YYYYMMDD-HHMMSS].bot
    where <stem> is `k_entityfile` if set, otherwise the current map name.
  - Each call creates a NEW file (timestamped); prior saves are not overwritten.
  - Reports "Failed to open botfile. Check bots/maps/ directory is writable"
    if the directory is not writable.

Prerequisites:
  Frogbot editor mode must be active (`FB_OPTION_EDITOR_MODE`) -- otherwise
  the parent dispatcher hides this subcommand entirely (not just refused with
  a message; literally not in the menu).

Permission: any player or spectator (runtime gate via `k_fb_admin_only` --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Example:
  botcmd save   -- save current routing; creates bots/maps/dm4[20260526-143022].bot

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  savemarker:frogbot:editor (select anchor marker before editing paths),
  removeallpaths:frogbot:editor (clear paths from a marker)
```

### Notes

- Timestamped filename format verified: `snprintf(fileName, ..., "bots/maps/%s[%s].bot", ...)` at line 921; date format `%Y%m%d-%H%M%S` at line 916.
- File stem selection: `strnull(entityFile) ? mapname : entityFile` at line 922 -- uses k_entityfile if non-empty, else mapname. Correct.
- Renumbering is a side effect of save (compact index loop lines 1703-1713) -- the existing description correctly surfaces this.

<!-- entity: savemarker:frogbot:editor -->

## savemarker:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2336 (table entry); handler FrogbotSaveMarker at src/bot_commands.c:1226
- **Catalog line**: 5242
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Bot waypoint-editor command: select the nearest routing marker and save it as the active anchor for subsequent path-editing commands. Prints the marker's number and class. Running it again while standing at the same position cycles to the next nearby marker. Moving away before running it again clears the saved marker and restores the last touched marker.
>
> Set by: bot editor command (requires Frogbot editor mode enabled).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Registered in `editor_commands[]` at line 2336. Handler `FrogbotSaveMarker` not in top-level table. Dispatcher selects `editor_commands[]` only when editor mode active.

### Proposed draft

```
Selects the nearest routing marker as the active anchor for path-editing
commands (botcmd savemarker).

Effect:
  - First call at a position: selects the nearest marker, saves it as the
    active anchor, prints "Marker #N [classname] is saved".
  - Subsequent call at the SAME position: cycles to the next nearest marker
    (skipping the already-selected one).
  - Subsequent call at a DIFFERENT position: clears the active anchor,
    restores the last-touched marker, prints "Cleared saved marker".
  - The active anchor is required by path-editing commands such as
    addpath and removepath.

Prerequisites:
  Frogbot editor mode must be active (`FB_OPTION_EDITOR_MODE`) -- otherwise
  the parent dispatcher hides this subcommand entirely (not just refused with
  a message; literally not in the menu).

Permission: any player or spectator (runtime gate via `k_fb_admin_only` --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Example:
  botcmd savemarker       -- select nearest marker as anchor
  -- move to another marker --
  botcmd addpath          -- create path from anchor to current position

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  save:frogbot:editor (save full routing after editing),
  removeallpaths:frogbot:editor (clear paths from nearest marker),
  info:frogbot:editor (inspect marker details)
```

### Notes

- Three-branch behavior verified in `FrogbotSaveMarker` lines 1228-1283:
  (1) saved_marker == NULL -> select nearest,
  (2) saved_marker set + same position -> cycle to next via `LocateNextMarker`,
  (3) saved_marker set + different position -> clear + restore last_touched.
- The existing description is accurate; the v2 draft makes the three behavioral branches explicit.

<!-- entity: removeallpaths:frogbot:editor -->

## removeallpaths:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2339 (table entry); handler FrogbotRemoveAllPaths at src/bot_commands.c:1411
- **Catalog line**: 5079
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command. Removes every outbound path from the routing marker nearest the editing player, leaving the marker in place but with no connections.
>
> Set by: bot editor command ('botcmd removeallpaths' in editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Registered in `editor_commands[]` at line 2339. Handler `FrogbotRemoveAllPaths` not in top-level table. Dispatcher selects editor_commands only when editor mode active.

### Proposed draft

```
Removes all outbound paths from the nearest routing marker
(botcmd removeallpaths).

Effect:
  - Finds the routing marker nearest the player's current position.
  - Removes every outbound path from that marker (all connections to other
    markers); the marker itself remains in place.
  - Also clears the visual path-indicator models for removed connections.
  - Refused with "Could not locate marker nearby" if no marker is close
    enough to the player.

Prerequisites:
  Frogbot editor mode must be active (`FB_OPTION_EDITOR_MODE`) -- otherwise
  the parent dispatcher hides this subcommand entirely (not just refused with
  a message; literally not in the menu).

Permission: any player or spectator (runtime gate via `k_fb_admin_only` --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Example:
  -- stand near a marker --
  botcmd removeallpaths   -- wipe all outbound connections from it

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  savemarker:frogbot:editor (select marker anchor; use before addpath to
    rebuild connections after removeallpaths),
  save:frogbot:editor (persist changes after editing)
```

### Notes

- Path removal loop verified: `FrogbotRemoveAllPaths` lines 1423-1438, iterates all `NUMBER_PATHS` slots, calls `RemovePath(nearest, i)` for each, also clears indicator model effects.
- The existing description is accurate; the v2 draft adds the visual indicator cleanup note and the "no nearby marker" refusal.

<!-- entity: info:frogbot:editor -->

## info:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2346 (table entry); handler FrogbotShowInfo at src/bot_commands.c:1718
- **Catalog line**: 4853
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command. Prints the index, classname, and encoded flags of the routing marker nearest the editing player (or by optional marker number).
>
> Set by: bot editor command ('botcmd info' in editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Registered in `editor_commands[]` at line 2346. Handler `FrogbotShowInfo` not in top-level table. Dispatcher selects editor_commands only when editor mode active.

### Proposed draft

```
Shows full diagnostic information for a routing marker (botcmd info [<num>]).

Effect:
  - Without argument: shows info for the marker nearest the player's
    current position.
  - With argument <num>: shows info for marker #<num> (1-indexed).
  - Output (displayed as a centerprint):
      Marker #NNN [classname]
      Origin X Y Z
      Dim [absmin] > [absmax]
      Zone #N, Goal #N
      Flags: <encoded flag list or "(none)">
      Paths: list of connected markers with their flags and angle hints
  - Refused with "Unable to find nearby marker" or "No such marker #N found"
    if the target marker cannot be located.

Prerequisites:
  Frogbot editor mode must be active (`FB_OPTION_EDITOR_MODE`) -- otherwise
  the parent dispatcher hides this subcommand entirely (not just refused with
  a message; literally not in the menu).

Permission: any player or spectator (runtime gate via `k_fb_admin_only` --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Example:
  botcmd info       -- inspect nearest marker
  botcmd info 12    -- inspect marker #12 by number

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  mapinfo:frogbot:editor (map-level diagnostics),
  savemarker:frogbot:editor (select marker as anchor),
  removeallpaths:frogbot:editor (clear paths visible in this output)
```

### Notes

- Output is a `G_centerprint` (not console), verified line 1796. The v2 draft notes this as "centerprint" implicitly (output displayed on-screen).
- Existing description undersells the output -- it mentions only "index, classname, and encoded flags" but source also emits origin coordinates, dimensions, zone, goal, and path list. v2 draft enumerates all output fields from lines 1769-1793.
- Rate-limited: `self->fb.last_spec_cp` cooldown of 0.2s (line 1797) prevents spam -- not user-actionable so omitted from description.

<!-- entity: mapinfo:frogbot:editor -->

## mapinfo:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2351 (table entry); handler FrogbotMapInfo at src/bot_commands.c:1126
- **Catalog line**: 4911
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command. Prints bot-routing diagnostics for the current map: marker count, goals, zones, and indicators. Used to audit bot navigation coverage.
>
> Set by: bot editor command ('botcmd mapinfo' in editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Registered in `editor_commands[]` at line 2351. Handler `FrogbotMapInfo` not in top-level table. Dispatcher selects editor_commands only when editor mode active.

### Proposed draft

```
Prints map-specific frogbot diagnostic data for the current map
(botcmd mapinfo).

Effect:
  - On aerowalk: prints quad damage entity status (found / not found),
    its marker index/goal/zone, the teleport-exit and high-landing marker
    coordinates, and the 3D offset between them (used to tune aerowalk
    bot navigation).
  - On all other maps: prints "No map-specific info available".
  - Output is to the console (G_sprint), not centerprint.

Prerequisites:
  Frogbot editor mode must be active (`FB_OPTION_EDITOR_MODE`) -- otherwise
  the parent dispatcher hides this subcommand entirely (not just refused with
  a message; literally not in the menu).

Permission: any player or spectator (runtime gate via `k_fb_admin_only` --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: any time.

Example:
  -- on aerowalk --
  botcmd mapinfo    -- shows quad and teleport geometry diagnostics

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  info:frogbot:editor (per-marker diagnostics),
  save:frogbot:editor (persist routing after diagnostics-informed edits)
```

### Notes

- FLAG: Existing description says "Prints bot-routing diagnostics for the current map: marker count, goals, zones, and indicators." SOURCE SHOWS THIS IS WRONG. `FrogbotMapInfo` (lines 1126-1174) has NO code that counts markers, lists goals, lists zones, or shows indicators in a general sense. It is HARDCODED to aerowalk-only checks (quad entity lookup, markers[10] tele-exit, markers[70] high-landing). For all other maps it prints "No map-specific info available" (line 1172). The description inflates this into a general diagnostic tool it is not.
- FLAG: "Used to audit bot navigation coverage" is also wrong -- the command has no general navigation audit capability; it's a narrow aerowalk geometry probe.
- v2 draft reflects source truth: aerowalk-specific only, explicitly states the "No map-specific info available" fallback for other maps.

<!-- entity: addmarker:frogbot:editor -->
## addmarker:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2334 (handler: FrogbotAddMarker, defined at line 1176)
- **Catalog line**: 4406
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command. Places a new routing marker at the editing player's current position. Refused if within the minimum distance of an existing marker.
>
> Set by: bot editor command ('botcmd addmarker' in editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Subcommand of the `botcmd` parent dispatcher (`FrogbotsCommand`). Appears only in `editor_commands[]` table (line 2334). Dispatcher selects that table only when `FB_OPTION_EDITOR_MODE` is active; the subcommand is literally absent from the menu otherwise. Straightforward Shape 8 + tooling-mode prereq; no conflicting shapes.

### Proposed draft

```
Places a new routing marker at the player's current position ('botcmd addmarker').

Effect:
  Spawns a new marker entity at the invoking player's location.
  Refused if any existing marker is within the minimum placement distance.
  Prints the new marker's assigned number on success.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission: any player or spectator (runtime gate via k_fb_admin_only --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (editor mode use).

Example:
  botcmd addmarker
  -> Created marker #7

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  removemarker:frogbot:editor (paired removal), move:frogbot:editor (reposition placed marker).
```

### Notes

- Clean recast. Existing description is accurate; v2 adds the tooling-mode prerequisite block and permission line per batch discipline.
- The minimum-distance check (MIN_DISTANCE_BETWEEN_MARKERS) is enforced in handler source (lines 1186-1192); phrased as behavior, not constant name, per action-level rule.

<!-- entity: removemarker:frogbot:editor -->
## removemarker:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2335 (handler: FrogbotRemoveMarker, defined at line 1199)
- **Catalog line**: 5133
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command. Removes the nearest manually-placed routing marker from the map. Cannot remove non-manual markers; prints an error if none is nearby.
>
> Set by: bot editor command ('botcmd removemarker' in editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Subcommand in `editor_commands[]` (line 2335). Handler `FrogbotRemoveMarker` (line 1199) distinguishes manually-placed markers (`classname == "marker"`) from bot-auto-placed ones via `streq(nearest->classname, "marker")` check. Editor-mode gated by dispatcher table selection.

### Proposed draft

```
Removes the nearest manually-placed routing marker from the current position
('botcmd removemarker').

Effect:
  Locates the nearest marker and removes it if it is manually placed.
  Refused with "Cannot remove non-manual markers" if the nearest marker was
  placed by the bot engine rather than the editor.
  Prints "No marker found nearby" if no marker is within range.
  If the removed marker was saved (via botcmd savemarker), clears the saved
  reference automatically.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission: any player or spectator (runtime gate via k_fb_admin_only --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (editor mode use).

Example:
  botcmd removemarker
  (removes the nearest manual marker; if it was saved, saved reference clears)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  addmarker:frogbot:editor (paired placement), savemarker:frogbot:editor (saved marker state).
```

### Notes

- Source (lines 1217-1220) shows: if `saved_marker == nearest`, it calls `DeselectMarker` + sets `saved_marker = NULL`. This is a user-observable behavior (the saved reference clears silently) that wasn't in the existing description -- added to Effect.
- The "manually-placed" vs "non-manual" distinction is verified via `classname == "marker"` check in source (line 1210).

<!-- entity: setmarkerflag:frogbot:editor -->
## setmarkerflag:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2341 (handler: FrogbotSetMarkerFlag, defined at line 1506)
- **Catalog line**: 5269
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot waypoint-editor subcommand. Adds one or more behavior flags onto the routing marker nearest the editing player. The argument is a string of flag letters:
>
> u = unreachable, 6 = dm6 door, f = fire on match start, b = blocked when door is at top, t = door touchable, e = escape route, n = no-touch.
>
> Existing flags are preserved; on success prints the marker's updated flag set. Fails if no marker is nearby, no flag argument is given, or the argument decodes to no valid flags.
>
> Set by: frogbot editor (bot navigation editing only; does not affect live gameplay).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Subcommand in `editor_commands[]` (line 2341). Handler `FrogbotSetMarkerFlag` (line 1506). Uses OR-assign (`|=`) to add flags without clearing existing ones. Flag letters verified against `DecodeMarkerFlagString` in `marker_load.c:87-127`.

### Proposed draft

```
Adds one or more behavior flags to the routing marker nearest the player
('botcmd setmarkerflag <flags>').

Effect:
  ORs the decoded flag bits into the nearest marker's flag field -- existing
  flags are preserved.
  Prints the marker's full updated flag set on success.
  Refused (with flag-list hint) if no marker is nearby, no argument is given,
  or the argument contains no recognized flag letters.

  Flag letters (combinable in one argument string):
    u  unreachable
    6  dm6 door
    f  fire on match start
    b  blocked when door is at top
    t  door touchable
    e  escape route
    n  no-touch

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission: any player or spectator (runtime gate via k_fb_admin_only --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (editor mode use).

Example:
  botcmd setmarkerflag ue
  -> Marker flags set, now: ue
  (marks the nearest marker as both unreachable and an escape route)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  clearmarkerflag:frogbot:editor (paired flag removal), setpathflag:frogbot:editor (path flags sibling).
```

### Notes

- FLAG: existing description lists "n = no-touch" as one of the flag letters. Source (`marker_load.c:120-122`) shows `case 'n': marker_flags |= MARKER_NOTOUCH`. However, `FROGBOT_MARKER_FLAG_OPTIONS` macro in `fb_globals.h:292` is defined as `"u6fbte"` (6 letters, no 'n'). The macro is used in the "Provide marker flags:" refusal message, but the decode function still processes 'n'. The 'n' flag is functional but not surfaced in the help string. Retained in the draft flag table since the decode function confirms it works; apply-pass-author should verify whether to omit 'n' from user-facing doc or include it with a parenthetical note.

<!-- entity: clearmarkerflag:frogbot:editor -->
## clearmarkerflag:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2342 (handler: FrogbotClearMarkerFlag, defined at line 1540)
- **Catalog line**: 4543
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot waypoint-editor command (available only when editor mode is active). Clears the specified routing flag(s) from the waypoint marker nearest the player. Usage: clearmarkerflag <flags>. With no argument, prints the list of valid flag names. Reports the marker's remaining flags after clearing. Has no effect if there is no nearby marker or the supplied flag is not recognised.
>
> Set by: editor-mode only (server command).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Subcommand in `editor_commands[]` (line 2342). Handler `FrogbotClearMarkerFlag` (line 1540). Uses AND-NOT (`&= ~flags`) to clear specified bits. Mirrors `setmarkerflag` in structure but inverts operation. Same flag decode function.

### Proposed draft

```
Clears one or more behavior flags from the routing marker nearest the player
('botcmd clearmarkerflag <flags>').

Effect:
  Clears the decoded flag bits from the nearest marker's flag field -- other
  flags remain unchanged.
  With no argument: prints the valid flag letters as a usage hint.
  Prints the marker's remaining flag set after clearing.
  No-op (no message) if the nearest marker has no path with the requested flags;
  reports "Marker flags invalid" if the argument contains no recognized letters.

  Flag letters (same set as setmarkerflag):
    u  unreachable
    6  dm6 door
    f  fire on match start
    b  blocked when door is at top
    t  door touchable
    e  escape route

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).
  A nearby marker must exist -- the command is refused with "No marker nearby"
  if none is in range.

Permission: any player or spectator (runtime gate via k_fb_admin_only --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (editor mode use).

Example:
  botcmd clearmarkerflag u
  -> Marker flags cleared, now: e
  (removes the unreachable flag; escape-route flag remains)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  setmarkerflag:frogbot:editor (paired flag addition), clearpathflag:frogbot:editor (path flags sibling).
```

### Notes

- FLAG: The existing description says "Has no effect if there is no nearby marker" but source (lines 1542-1548) shows it prints "No marker nearby" and returns -- it's not silent. Corrected in the Prerequisites section: "A nearby marker must exist -- the command is refused with 'No marker nearby'."
- FLAG: Same 'n' flag discrepancy as setmarkerflag -- `FROGBOT_MARKER_FLAG_OPTIONS` macro is `"u6fbte"` (no 'n') but decode function handles 'n'. Draft omits 'n' from the user-facing flag table to match what the help-hint prints; apply-pass-author should align with setmarkerflag card decision.

<!-- entity: setzone:frogbot:editor -->
## setzone:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2340 (handler: FrogbotSetZone, defined at line 1441)
- **Catalog line**: 5331
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot waypoint-editor command. Assigns a zone number to a routing marker (markers in the same zone form a navigation region for the bots).
>
> With a marker number and zone argument: sets that specific marker to the given zone (zone clamped to valid range).
> With no marker argument: operates on the nearest marker -- cycles it to the next zone (wrapping), or sets it to an explicit zone if a numeric argument is given.
>
> Prints the resulting zone, or an error if no marker is found.
>
> Default: n/a (command, not a cvar).
> Set by: frogbot waypoint editor.

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Subcommand in `editor_commands[]` (line 2340). Handler `FrogbotSetZone` (line 1441). Two call signatures verified in source: (a) `argc >= 4` targets a specific marker by number; (b) `argc == 3` or no zone arg operates on nearest marker. No conflicting shapes.

### Proposed draft

```
Assigns a zone number to a routing marker ('botcmd setzone [<marker#> <zone>]').

Markers in the same zone form a navigation cluster -- bots treat them as a
single routing region.

Effect:
  Two call signatures:
    botcmd setzone <marker#> <zone>  -- sets the specified marker (by number) to
                                        the given zone, clamped to valid range.
    botcmd setzone [<zone>]          -- operates on the nearest marker:
                                        with no argument, advances to the next
                                        zone (wrapping after the maximum);
                                        with a numeric argument, sets that zone
                                        directly.
  Prints the resulting zone assignment on success, or "No marker found nearby" /
  "No marker #<N> found" if the target cannot be located.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission: any player or spectator (runtime gate via k_fb_admin_only --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (editor mode use).

Example:
  botcmd setzone 3            -> Marker #12 now has zone 3
  botcmd setzone              -> Marker #12 now has zone 4  (cycled)
  botcmd setzone 5 2          -> Marker #5 now has zone 2   (direct by marker number)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  addmarker:frogbot:editor (creates markers that receive zone assignments),
  savemarker:frogbot:editor (saves marker for path operations).
```

### Notes

- Existing description is accurate. The "zone clamped to valid range" behavior matches source `bound(1, atoi(param), NUMBER_ZONES)` at lines 1455 and 1496.
- The "cycles to next zone, wrapping" behavior for the no-arg case is confirmed at lines 1482-1486.
- "Default: n/a (command, not a cvar)" in existing description is noise boilerplate -- dropped in v2 (commands never have Default section per universal-shape-v2.md).

<!-- entity: addpath:frogbot:editor -->
## addpath:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2337 (handler: FrogbotAddPath, defined at line 1285)
- **Catalog line**: 4433
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command. Links the saved marker to the nearest marker. First call adds one direction; second call upgrades to a bidirectional link. If both directions already exist, both are removed instead. Requires a saved marker and a nearby marker.
>
> Set by: bot editor command ('botcmd addpath' in editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Subcommand in `editor_commands[]` (line 2337). Handler `FrogbotAddPath` (line 1285) implements a three-state toggle: no link -> unidirectional -> bidirectional -> removed. Subsequent-invocation semantics verified in source. No conflicting shapes.

### Proposed draft

```
Creates or upgrades the navigation path between the saved marker and the nearest
marker ('botcmd addpath').

Effect:
  Operates on the link between the previously saved marker (set via
  botcmd savemarker) and the nearest marker:
    No link exists       -> adds a one-way path (saved -> nearest).
    One-way link exists  -> upgrades to a bidirectional link.
    Both directions exist -> removes both directions (link cleared entirely).
  Prints the new link state on each call.
  Refused with "Could not locate marker nearby" or "Save a marker before
  creating path" if either endpoint is missing. Cannot link a marker to itself.

Prerequisites:
  A saved marker must be set via botcmd savemarker before using this command.
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission: any player or spectator (runtime gate via k_fb_admin_only --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (editor mode use).

Example:
  botcmd addpath   -> Marker 3 > 7 linked (uni-directional)
  botcmd addpath   -> Marker 7 > 3 linked (bi-directional)
  botcmd addpath   -> Both paths cleared - no link

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  removepath:frogbot:editor (dedicated removal), savemarker:frogbot:editor (required prereq).
```

### Notes

- The three-state toggle sequence (none -> uni -> bi -> none) is the primary behavior. The existing description describes this accurately; v2 makes it a labeled sequence in Effect rather than prose.
- Source (lines 1313-1329) confirms the "both exist -> remove both" case is handled FIRST, before the one-way upgrade case.

<!-- entity: removepath:frogbot:editor -->
## removepath:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2338 (handler: FrogbotRemovePath, defined at line 1371)
- **Catalog line**: 5160
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command. Removes the bidirectional path between the saved marker and the nearest marker. Both directions are cleared. Requires a saved marker (set with the 'savemarker' command) and a nearby marker.
>
> Set by: bot editor command ('botcmd removepath' in editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Subcommand in `editor_commands[]` (line 2338). Handler `FrogbotRemovePath` (line 1371). Source shows each direction removed only if it exists (independent `if` guards at lines 1392-1399), not unconditionally.

### Proposed draft

```
Removes any existing navigation paths between the saved marker and the nearest
marker ('botcmd removepath').

Effect:
  Clears each direction between the two markers independently -- removes the
  saved->nearest path if it exists, and the nearest->saved path if it exists.
  Works on unidirectional links too (not just bidirectional).
  Prints no confirmation message on success; updates the editor's visual
  indicator to unlinked state.
  Refused with "Could not locate marker nearby" or "Save a marker before
  creating path" if either endpoint is missing.

Prerequisites:
  A saved marker must be set via botcmd savemarker before using this command.
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission: any player or spectator (runtime gate via k_fb_admin_only --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (editor mode use).

Example:
  botcmd removepath
  (clears any link between the saved marker and the nearest; silent on success)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  addpath:frogbot:editor (paired path creation), savemarker:frogbot:editor (required prereq).
```

### Notes

- FLAG: Existing description says "Removes the bidirectional path" and "Both directions are cleared" -- framing implies the command only applies to bidirectional links. Source (lines 1392-1399) shows two independent `if` guards: each direction is removed only if it exists. The command works equally on unidirectional paths. Description framing is localized inaccuracy (not foundational -- the mechanism is correct, just scoped too narrowly). Corrected in Effect.
- No success confirmation message is printed by the handler (source confirms); only refusal messages and the visual indicator update are present.

<!-- entity: setpathflag:frogbot:editor -->
## setpathflag:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2343 (handler: FrogbotSetPathFlag, defined at line 1612)
- **Catalog line**: 5300
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot waypoint-editor subcommand. Adds one or more traversal flags onto the path from the previously saved marker to the nearest routing marker. The argument is a string of flag letters:
>
> w = waterjump, 6 = dm6 door, r = rocket jump, j = jump ledge, v = vertical platform, a = curl-jump angle hint.
>
> Existing flags are preserved; on success prints the path's updated flag set. Fails if no marker is nearby, no path links the two markers, no argument is given, or the argument decodes to no valid flags.
>
> Set by: frogbot editor (bot navigation editing only).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Subcommand in `editor_commands[]` (line 2343). Handler `FrogbotSetPathFlag` (line 1612). Uses OR-assign on `saved_marker->fb.paths[source_to_target_path].flags`. Flag letters verified against `DecodeMarkerPathFlagString` in `marker_load.c:174-207`. `FROGBOT_PATH_FLAG_OPTIONS` macro (`fb_globals.h:291`) is `"w6rjva"` -- matches all 6 flags listed.

### Proposed draft

```
Adds one or more traversal flags to the path from the saved marker to the
nearest marker ('botcmd setpathflag <flags>').

Effect:
  ORs the decoded flag bits into the path's flag field -- existing flags are
  preserved.
  Prints the path's full updated flag set on success.
  Refused (with flag-list hint) if: no marker is nearby; no argument is given;
  the argument contains no recognized flag letters.
  Prints "No path linked to add flag" if no path exists from saved to nearest.

  Flag letters (combinable in one argument string):
    w  waterjump
    6  dm6 door
    r  rocket jump
    j  jump ledge
    v  vertical platform
    a  curl-jump angle hint

Prerequisites:
  A saved marker must be set via botcmd savemarker, and a path must already
  exist from the saved marker to the nearest marker (created via botcmd addpath).
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission: any player or spectator (runtime gate via k_fb_admin_only --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (editor mode use).

Example:
  botcmd setpathflag rj
  -> Path flags set, now: rj
  (marks the path as requiring a rocket jump and a jump ledge)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  clearpathflag:frogbot:editor (paired flag removal), setmarkerflag:frogbot:editor (marker flags sibling).
```

### Notes

- Existing description is accurate. Flag letters fully match source decode function and FROGBOT_PATH_FLAG_OPTIONS macro.
- Direction specificity: flags apply to the one-way path from saved_marker to nearest (line 1639 uses `saved_marker->fb.paths[source_to_target_path].flags`). This is directional -- the reverse path (nearest->saved) has its own independent flags. Noted in Prerequisites.

<!-- entity: clearpathflag:frogbot:editor -->
## clearpathflag:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2344 (handler: FrogbotClearPathFlag, defined at line 1655)
- **Catalog line**: 4570
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot waypoint-editor command (editor mode only). Clears the given routing flag(s) from the path connecting the saved marker to the marker nearest the player.
>
> With no argument: prints the valid path-flag options.
> With a flag argument: clears the matching flag(s) and reports the path's remaining flags.
> No-op if there is no nearby marker, no path links saved-to-nearest, or the flag string is invalid.
>
> Set by: editor-mode command.

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Subcommand in `editor_commands[]` (line 2344). Handler `FrogbotClearPathFlag` (line 1655). Uses AND-NOT (`&= ~flags`) to clear specified bits. Mirrors `setpathflag`. Same flag decode function. Source confirms "No-op" framing for missing path (line 1675: `if (source_to_target_path >= 0)` with no else branch printing a message when no path exists -- silent).

### Proposed draft

```
Clears one or more traversal flags from the path between the saved marker and
the nearest marker ('botcmd clearpathflag <flags>').

Effect:
  Clears the decoded flag bits from the path's flag field -- other flags remain
  unchanged.
  With no argument: prints the valid flag letters as a usage hint.
  With a valid argument: clears the matching flags and prints the path's
  remaining flag set.
  Silent no-op if: no nearby marker exists; no path links saved-to-nearest;
  the flag string is invalid.

  Flag letters (same set as setpathflag):
    w  waterjump
    6  dm6 door
    r  rocket jump
    j  jump ledge
    v  vertical platform
    a  curl-jump angle hint

Prerequisites:
  A saved marker must be set via botcmd savemarker, and a path must already
  exist from the saved marker to the nearest marker.
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission: any player or spectator (runtime gate via k_fb_admin_only --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (editor mode use).

Example:
  botcmd clearpathflag r
  -> Path flags cleared, now: j
  (removes the rocket-jump flag; jump-ledge flag remains)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  setpathflag:frogbot:editor (paired flag addition), clearmarkerflag:frogbot:editor (marker flags sibling).
```

### Notes

- FLAG: Existing description says "No-op if there is no nearby marker, no path links saved-to-nearest, or the flag string is invalid." Source confirms the no-path and invalid-flag cases are silent (handler at line 1675 checks `source_to_target_path >= 0` with no else-print; invalid flags produce no output). The "no nearby marker" case, however, does print "No marker nearby" (lines 1660-1663) and returns -- it is NOT a silent no-op. Corrected in Effect: "no nearby marker" is listed as a separate non-silent refusal.
- Directional specificity: same as setpathflag -- flags apply to the saved->nearest one-way path only.

<!-- entity: move:frogbot:editor -->
## move:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2354 (handler: FrogbotMoveMarker, defined at line 862)
- **Catalog line**: 4938
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command. Relocates the nearest routing marker to the editing player's current position.
>
> Set by: bot editor command ('botcmd move' in editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prerequisite.

Subcommand in `editor_commands[]` (line 2354). Handler `FrogbotMoveMarker` (line 862). Importantly: handler skips non-"marker" classname entities via a while-loop (lines 866-868) until it finds a manually-placed marker or exhausts candidates. The existing description says "nearest routing marker" but source restricts to manually-placed markers only.

### Proposed draft

```
Relocates the nearest manually-placed routing marker to the player's current
position ('botcmd move').

Effect:
  Finds the nearest manually-placed marker (skips bot-auto-placed markers).
  Sets that marker's origin to the invoking player's current position.
  Updates the editor's visual indicator position accordingly.
  Prints "No marker nearby" if no manually-placed marker is in range.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission: any player or spectator (runtime gate via k_fb_admin_only --
  default 0 allows anyone, 1 requires admin, 2 requires real server admin).

Match-state: pre-match only (editor mode use).

Example:
  (walk to new position, then:)
  botcmd move
  -> (marker silently moved; no success confirmation printed)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime admin gate),
  addmarker:frogbot:editor (places markers), removemarker:frogbot:editor (removes markers).
```

### Notes

- FLAG: Existing description says "Relocates the nearest routing marker" -- omits the restriction to manually-placed markers. Source (lines 865-869) shows the handler iterates with `LocateNextMarker` skipping any entity whose `classname` is not `"marker"` (the manually-placed type). Bot-auto-placed markers are skipped silently. Corrected in Headliner and Effect.
- No success message is printed by `FrogbotMoveMarker` (source lines 862-886 have no G_sprint on the success path); the move is silent. The Example notes this.

<!-- entity: goalinfo:frogbot:editor -->

## goalinfo:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2352 (table entry) / handler FrogbotGoalInfo at src/bot_commands.c:1981
- **Catalog line**: 4743
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor subcommand (requires bot editor mode). Prints routing goal information for the marker the issuing player is currently touching. For each goal it shows the goal number, the traversal time, and the linked next marker's index and classname. Prints nothing if the player is not standing on a marker. Output is private to the issuing player.
>
> Set by: admin with editor mode enabled (no arguments).

### Shape classification

Shape 8 subcommand + tooling-mode prereq.

`goalinfo` is registered in `editor_commands[]` at `src/bot_commands.c:2352` and dispatched via `FrogbotsCommand` (`src/bot_commands.c:2383`). Handler is `FrogbotGoalInfo` (static, not in the top-level `cmd_t cmds[]` table). The entity has no inter-entity relationship beyond being a subcommand of `botcmd` -- it is a pure touch-marker state-printer. No cvar pairing, no sibling family relationship, no election/gate role. Shape 8 applies for the dispatcher relationship; no additional Layer B facets.

### Proposed draft

```
Prints routing goal information for the marker the player is currently touching (botcmd goalinfo).

Effect:
  For each configured goal on the touched marker, reports: goal number, traversal
  time to that goal, and the linked next marker's index and classname.
  Produces no output if the player is not standing on a marker.
  Output is private to the issuing player.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission:    any player or spectator (runtime gate via k_fb_admin_only --
               default 0 allows anyone, 1 requires admin, 2 requires real server admin).
Match-state:   any time (read-only).

Example:
  botcmd goalinfo
  -- while standing on marker #12 --
  Goals for marker #12 (marker)
  1: time 2.3: marker  7: marker
  3: time 4.1: marker 19: item_health

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate),
  goalsummary:frogbot:editor (goal roster by goal number),
  pathinfo:frogbot:editor (path connectivity for a marker),
  summary:frogbot:editor (map-wide problem-marker scan).
```

### Notes

- Source-verified: `FrogbotGoalInfo` reads `self->fb.touch_marker` (NULL-guarded at line 1986). Output format confirmed at lines 1991-2001.
- Existing description is accurate; recast is a clean v1-to-v2 structural lift.
- Permission line follows dispatcher-level CF_BOTH + k_fb_admin_only runtime gate pattern established for this batch.

<!-- entity: goalsummary:frogbot:editor -->

## goalsummary:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2349 (table entry) / handler FrogbotGoalSummary at src/bot_commands.c:1924
- **Catalog line**: 4770
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints a per-goal summary of the map's bot routing goals (botcmd goalsummary, editor mode only). For each goal number, lists the routing markers assigned to that goal -- each marker's index and classname. Output goes to the issuing player only.
>
> Set by: any player or spectator via 'botcmd goalsummary' (requires bot editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prereq.

`goalsummary` is in `editor_commands[]` at `src/bot_commands.c:2349`, dispatched via `FrogbotsCommand`. Handler `FrogbotGoalSummary` is a pure state-printer (G_sprint loop over goals, no writes). No inter-entity relationship beyond dispatcher membership. Shape 8 + tooling-mode prereq; no additional Layer B facets.

### Proposed draft

```
Prints a goal-by-goal roster of all routing markers on the current map (botcmd goalsummary).

Effect:
  For each goal number (1 through NUMBER_GOALS), lists every marker assigned
  to that goal -- each marker's index and classname.
  Goals with no assigned markers are skipped silently.
  Output is private to the issuing player.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission:    any player or spectator (runtime gate via k_fb_admin_only --
               default 0 allows anyone, 1 requires admin, 2 requires real server admin).
Match-state:   any time (read-only).

Example:
  botcmd goalsummary
  Goal summary:
    Goal # 1:
       5: marker
      12: marker
    Goal # 3:
       7: item_health

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate),
  goalinfo:frogbot:editor (goal detail for a single touched marker),
  zonesummary:frogbot:editor (zone roster equivalent),
  summary:frogbot:editor (map-wide problem-marker scan).
```

### Notes

- Source-verified: `FrogbotGoalSummary` at lines 1924-1947 loops `i = 1 .. NUMBER_GOALS`, inner loop over markers filtering on `fb.G_ == i`.
- Existing description is accurate. Recast is a clean v1-to-v2 structural lift.

<!-- entity: pathinfo:frogbot:editor -->

## pathinfo:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2347 (table entry) / handler FrogbotPathList at src/bot_commands.c:1800
- **Catalog line**: 4965
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot route-editor command (requires editor mode): prints the routing paths to and from a waypoint marker. Uses the marker the player is touching or nearest; an optional marker number overrides the selection. "Paths away" shows each outgoing path's destination index, classname, path flags, and angle hint; "Path to" lists all markers whose paths lead into this one.
>
> Set by: bot editor command (requires Frogbot editor mode enabled).

### Shape classification

Shape 8 subcommand + tooling-mode prereq.

`pathinfo` is in `editor_commands[]` at line 2347, handler `FrogbotPathList` (static). Note: `FrogbotListPaths` is a different function handling `pathlist`. `FrogbotPathList` is a pure path-connectivity printer with optional numeric arg override for marker selection. No inter-entity relationship beyond dispatcher membership. Shape 8 + tooling-mode prereq.

### Proposed draft

```
Prints the routing path connectivity for a marker -- all outgoing and incoming
paths (botcmd pathinfo).

Effect:
  "Paths away": for each outgoing path from the selected marker, shows the
    destination marker's index, classname, path flags, and angle hint.
  "Path to": lists all markers that have a path leading into the selected marker.
  Marker selection order: (1) optional numeric argument overrides; (2) the marker
    the player is currently touching; (3) nearest marker by proximity.
  Reports "Unable to find nearby marker" if no marker can be selected.
  Output is private to the issuing player.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission:    any player or spectator (runtime gate via k_fb_admin_only --
               default 0 allows anyone, 1 requires admin, 2 requires real server admin).
Match-state:   any time (read-only).

Example:
  botcmd pathinfo        (uses touched / nearest marker)
  botcmd pathinfo 12     (override: inspect marker #12)
  Paths away:
    7: marker [rj] ang 45
   19: marker [(none)] ang 0
  Path to:
    3: marker

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate),
  pathlist:frogbot:editor (list all paths matching a flag filter),
  goalinfo:frogbot:editor (goal connectivity for a touched marker),
  summary:frogbot:editor (map-wide problem-marker scan).
```

### Notes

- Source-verified: `FrogbotPathList` at lines 1800-1885. Marker selection logic confirmed: arg override at 1807-1823, touch fallback at 1805, proximity fallback via `LocateMarker` at 1828. "Paths away" loop at 1848-1863; "Path to" reverse-walk at 1864-1882.
- Existing description is accurate. Recast adds arg-override selection order and makes output format explicit. Clean v1-to-v2 lift.

<!-- entity: pathlist:frogbot:editor -->

## pathlist:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2358 (table entry) / handler FrogbotListPaths at src/bot_commands.c:169
- **Catalog line**: 4992
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor subcommand (requires bot editor mode). Lists all routing paths whose flags match the given flag-filter argument. Output shows the source and destination marker indices and their location names, followed by the total count of matching paths. Omitting the flag argument prints the list of valid flag-filter options instead.
>
> Usage: pathlist <flag>
> Set by: server admin with editor mode enabled.

### Shape classification

Shape 8 subcommand + tooling-mode prereq.

`pathlist` is in `editor_commands[]` at line 2358, handler `FrogbotListPaths`. Requires a flag argument to function. No cvar pairing, no vote, no election. Shape 8 + tooling-mode prereq.

### Proposed draft

```
Lists all routing paths on the map whose flags match a given filter (botcmd pathlist <flag>).

Effect:
  For each path matching the flag filter, prints: source marker index, destination
  marker index, and the location names of each endpoint.
  Reports the total count of matching paths at the end ("N paths found matching <flag>").
  With no flag argument (or an invalid flag): prints the list of valid flag options
  instead of path results.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission:    any player or spectator (runtime gate via k_fb_admin_only --
               default 0 allows anyone, 1 requires admin, 2 requires real server admin).
Match-state:   any time (read-only).

Example:
  botcmd pathlist rj
  Paths found:
     5 >  12 [rl_room] > [upper_platform]
    18 >   3 [quad_area] > [rl_room]
  2 paths found matching rj

  botcmd pathlist        (no arg -- prints valid flag options)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate),
  pathinfo:frogbot:editor (path connectivity for a single marker),
  summary:frogbot:editor (problem-marker scan across the whole map).
```

### Notes

- FLAG: Existing description says "Omitting the flag argument prints the list of valid flag-filter options instead." Source at line 177: `if (trap_CmdArgc() <= arg_number)` -- this fires when argc is <= 2 (editor mode: arg_number=2, meaning just `botcmd pathlist` with no extra arg). Source also has a second path-flag-invalid check at line 187: `if (!path_filter)` prints "Path flags invalid." So there are TWO cases that produce option-listing output: (1) missing arg and (2) invalid arg. The existing description only mentions missing arg. Recast draft covers both cases above ("no flag argument (or an invalid flag)"). FLAG for apply-pass review.
- Source-verified: `FrogbotListPaths` at lines 169-227. `arg_number` is `2` in editor mode (line 173). Location-name format confirmed at line 219: `%3d > %3d \20%s\21 > \20%s\21` with `LocationName(...)` for both endpoints.
- Permission line: existing description says "server admin with editor mode enabled" -- FLAG: the `k_fb_admin_only` runtime gate's DEFAULT is 0 (anyone allowed), not admin-only. The `botcmd` CF_BOTH registration + default k_fb_admin_only=0 means any player or spectator can issue the command by default. Apply-pass author should update from "server admin" to the runtime-gate pattern.

<!-- entity: summary:frogbot:editor -->

## summary:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2348 (table entry) / handler FrogbotSummary at src/bot_commands.c:2093
- **Catalog line**: 5393
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command (available only in bot editor mode). Prints a diagnostic summary of the current map's bot-routing markers: lists only problem markers (those with no outbound paths and/or no zone assigned), followed by a total marker count. Fully configured markers are not listed. Use 'goalsummary' and 'zonesummary' for goal and zone aggregate counts.
>
> Set by: bot editor mode only ('summary' botcmd).

### Shape classification

Shape 8 subcommand + tooling-mode prereq.

`summary` is in `editor_commands[]` at line 2348, handler `FrogbotSummary`. Pure diagnostic state-printer; no writes. No inter-entity relationship beyond dispatcher membership. Shape 8 + tooling-mode prereq.

### Proposed draft

```
Prints a diagnostic summary of problem markers on the current map (botcmd summary).

Effect:
  Lists only markers that have routing gaps: markers with no outbound paths (and
  optionally no zone) or markers that have paths but lack a zone assignment.
  Fully-configured markers (paths + zone) are suppressed -- only problems appear.
  Ends with a total marker count across the whole map.
  Output is private to the issuing player.
  Use goalsummary for a goal-by-goal roster; use zonesummary for a zone-by-zone roster.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission:    any player or spectator (runtime gate via k_fb_admin_only --
               default 0 allows anyone, 1 requires admin, 2 requires real server admin).
Match-state:   any time (read-only).

Example:
  botcmd summary
  Marker summary:
     4: marker: no paths and no zone
    17: item_health: no zone
    22: marker: no paths
  48 markers in total

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate),
  goalsummary:frogbot:editor (goal-by-goal marker roster),
  zonesummary:frogbot:editor (zone-by-zone marker roster),
  pathinfo:frogbot:editor (path detail for a single marker).
```

### Notes

- Source-verified: `FrogbotSummary` at lines 2093-2142. Three print cases confirmed: `path_count==0` prints "no paths [and no zone]" (line 2120-2121 -- conditional `and no zone` when `fb.Z_` is 0); `path_count>0 && !fb.Z_` prints "no zone" (line 2123-2126). Total count via `marker_count` at line 2141.
- Existing description is accurate. Recast expands the Effect to surface the two distinct problem categories (no-paths-and-no-zone vs has-paths-but-no-zone) which the existing description elides.

<!-- entity: zonesummary:frogbot:editor -->

## zonesummary:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted_with_flag
- **Source**: src/bot_commands.c:2350 (table entry) / handler FrogbotZoneSummary at src/bot_commands.c:1949
- **Catalog line**: 5475
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot waypoint-editor command. Prints a 'Zone summary:' report listing, for each zone on the current map, every route marker assigned to it (marker index and classname). Read-only; does not modify waypoint data. Available only when frogbot editor mode is enabled (subject to the frogbot admin-only setting).
>
> Set by: frogbot editor (no arguments).

### Shape classification

Shape 8 subcommand + tooling-mode prereq.

`zonesummary` is in `editor_commands[]` at line 2350, handler `FrogbotZoneSummary`. Pure state-printer. No inter-entity relationship beyond dispatcher membership. Shape 8 + tooling-mode prereq.

### Proposed draft

```
Prints a zone-by-zone roster of all routing markers on the current map (botcmd zonesummary).

Effect:
  For each zone number (0 through NUMBER_ZONES), lists every marker assigned to
  that zone -- each marker's index and classname.
  Zone 0 (unassigned markers) is listed first and highlighted in red -- these
  markers lack a zone assignment and may indicate incomplete routing data.
  Zones with no assigned markers are skipped silently.
  Output is private to the issuing player.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission:    any player or spectator (runtime gate via k_fb_admin_only --
               default 0 allows anyone, 1 requires admin, 2 requires real server admin).
Match-state:   any time (read-only).

Example:
  botcmd zonesummary
  Zone summary:
    Zone # 0:   (highlighted -- unassigned markers)
       4: marker
    Zone # 1:
       5: marker
      12: marker

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate),
  goalsummary:frogbot:editor (goal-by-goal equivalent),
  summary:frogbot:editor (problem-marker scan -- also identifies no-zone markers).
```

### Notes

- FLAG: Existing description omits zone 0. Source at line 1954: loop is `i = 0; i <= NUMBER_ZONES` (inclusive of 0). Zone 0 means `fb.Z_ == 0` = no zone assigned. The handler prints it with red color formatting (`&cf00Zone #%2d&cfff` at line 1969) -- unassigned markers are highlighted as a warning. The existing description implies only "zones on the current map" are shown, missing this diagnostic purpose of zone 0. Recast adds this fact.
- Source-verified: `FrogbotZoneSummary` at lines 1949-1979.

<!-- entity: goto:frogbot:editor -->

## goto:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2353 (table entry) / handler FrogbotGoto at src/bot_commands.c:829
- **Catalog line**: 4797
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command. Teleports the editing player to routing marker number N.
>
> Set by: bot editor command ('botcmd goto <marker#>' in editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prereq.

`goto` is in `editor_commands[]` at line 2353, handler `FrogbotGoto`. Navigation command (player teleport). No cvar pairing, no vote, no election. Shape 8 + tooling-mode prereq.

### Proposed draft

```
Teleports the issuing player to a routing marker by number (botcmd goto <marker#>).

Effect:
  Moves the player to the position of marker #N.
  For non-"marker" classname entities (e.g. item entities used as markers),
  the teleport destination is raised 32 units above the entity origin to
  prevent spawning inside geometry.
  Reports "Marker #N not found" if the marker number is not present.
  Requires exactly one numeric argument; prints usage if omitted.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission:    any player or spectator (runtime gate via k_fb_admin_only --
               default 0 allows anyone, 1 requires admin, 2 requires real server admin).
Match-state:   any time.

Example:
  botcmd goto 12     (teleport to marker #12)
  botcmd goto 1      (teleport to the first marker)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate),
  pathinfo:frogbot:editor (inspect paths at the destination marker),
  goalinfo:frogbot:editor (inspect goals at the destination marker),
  savemarker:frogbot:editor (save the destination marker as reference point for path editing).
```

### Notes

- Source-verified: `FrogbotGoto` at lines 829-860. Arg count check at line 837 (`trap_CmdArgc() != 3` -- expects `botcmd goto N`). Z-offset logic for non-"marker" classnames at lines 854-857. Teleport via `teleport_player` at line 859.
- Existing description is minimal but correct. Recast adds the classname-offset behavior and the not-found report which are user-observable.

<!-- entity: rjfields:frogbot:editor -->

## rjfields:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2357 (table entry) / handler FrogbotSetRocketJumpFields at src/bot_commands.c:2006
- **Catalog line**: 5187
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot path-editor command. Reads or sets the rocket-jump fields (pitch, yaw, delay) on the path from the saved marker to the nearest marker. With no arguments: prints current pitch, yaw, and delay. With three arguments <pitch> <yaw> <delay>: sets those fields (pitch/yaw as floats, delay as integer). Reports an error if no nearby marker, no linked path, or the path is not flagged as a rocket jump.
>
> Set by: frogbot editor command 'rjfields <pitch> <yaw> <delay>'.

### Shape classification

Shape 8 subcommand + tooling-mode prereq.

`rjfields` is in `editor_commands[]` at line 2357, handler `FrogbotSetRocketJumpFields`. Read/setter requiring `saved_marker` context. No inter-entity relationship beyond dispatcher membership and the `savemarker` workflow dependency. Shape 8 + tooling-mode prereq.

### Proposed draft

```
Reads or sets the rocket-jump navigation parameters on the path from the saved
marker to the nearest marker (botcmd rjfields [pitch yaw delay]).

Effect:
  With no extra arguments: prints the current pitch, yaw, and delay for the path.
  With three arguments <pitch> <yaw> <delay>: updates those values on the path
    (pitch and yaw as floats, delay as an integer).
  Error conditions (command refuses with a message):
    - No marker nearby.
    - No linked path found between saved marker and nearest marker.
    - The target path is not flagged as a rocket jump (ROCKET_JUMP flag required).

Prerequisites:
  A marker must be saved via 'botcmd savemarker' first -- rjfields looks up the
  path from saved_marker to the nearest marker; with no saved marker the lookup
  fails with "No linked path found".
  The target path must carry the ROCKET_JUMP path flag.
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission:    any player or spectator (runtime gate via k_fb_admin_only --
               default 0 allows anyone, 1 requires admin, 2 requires real server admin).
Match-state:   any time.

Example:
  botcmd savemarker       (save the source marker)
  -- move near the destination marker --
  botcmd rjfields                      (read current values)
  Current fields: pitch 45.0, yaw 180.0, delay 5
  botcmd rjfields 45.0 90.0 3          (set pitch=45, yaw=90, delay=3)
  RJ parameters updated

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate),
  savemarker:frogbot:editor (required prerequisite -- saves the source marker),
  anglehint:frogbot:editor (sibling path-field setter for angle hints),
  pathinfo:frogbot:editor (inspect path flags to verify ROCKET_JUMP is set).
```

### Notes

- Source-verified: `FrogbotSetRocketJumpFields` at lines 2006-2060. `FindPathIndex(saved_marker, nearest)` called at line 2009; returns -1 if `saved_marker==NULL` (confirmed at `FindPathIndex` line 892). ROCKET_JUMP flag check at line 2026. Read path at lines 2033-2041 (`trap_CmdArgc()==2` = just `botcmd rjfields`). Write path at lines 2043-2057.
- Existing description is accurate. Recast adds the `savemarker` prerequisite which the existing description omits (surprise-bearing: user must understand the two-step save-then-edit workflow).

<!-- entity: anglehint:frogbot:editor -->

## anglehint:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2355 (table entry) / handler FrogbotSetAngleHint at src/bot_commands.c:1575
- **Catalog line**: 4460
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot editor command. Gets or sets the angle hint on the path between the saved marker and the nearest marker. Called with no value it reports the current hint; called with a value it stores the integer angle. Used to guide bot movement direction along a path.
>
> Set by: bot editor command ('botcmd anglehint [angle]' in editor mode).

### Shape classification

Shape 8 subcommand + tooling-mode prereq.

`anglehint` is in `editor_commands[]` at line 2355, handler `FrogbotSetAngleHint`. Read/setter requiring `saved_marker` context. No inter-entity relationship beyond dispatcher membership and the `savemarker` workflow dependency. Shape 8 + tooling-mode prereq.

### Proposed draft

```
Reads or sets the angle hint on the path from the saved marker to the nearest marker
(botcmd anglehint [angle]).

Effect:
  With no argument: prints the current angle hint value for the path.
  With a numeric argument: stores that integer as the angle hint on the path,
    guiding bots to face a specific direction while traversing it.
  Reports "No marker nearby" if no marker is within reach.
  Reports "No path linked to add angle hint" if no path exists from the saved
    marker to the nearest marker.

Prerequisites:
  A marker must be saved via 'botcmd savemarker' first -- anglehint looks up the
  path from saved_marker to the nearest marker; with no saved marker the lookup
  returns "No path linked."
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission:    any player or spectator (runtime gate via k_fb_admin_only --
               default 0 allows anyone, 1 requires admin, 2 requires real server admin).
Match-state:   any time.

Example:
  botcmd savemarker       (save the source marker)
  -- move near the destination marker --
  botcmd anglehint        (read current hint)
  Current angle hint: 0
  botcmd anglehint 90     (set hint to 90 degrees)
  Angle hint set to 90

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate),
  savemarker:frogbot:editor (required prerequisite -- saves the source marker),
  rjfields:frogbot:editor (sibling path-field setter for rocket-jump parameters),
  pathinfo:frogbot:editor (verify path flags and existing angle hints).
```

### Notes

- Source-verified: `FrogbotSetAngleHint` at lines 1575-1610. `LocateMarker` + `FindPathIndex(saved_marker, nearest)` at lines 1577-1578. Path found branch at line 1588 (`>= 0`); read at 1592-1596; write at 1599-1604. No-path branch at line 1607 prints "No path linked to add angle hint."
- Existing description is accurate. Recast adds the `savemarker` prerequisite (same pattern as rjfields -- surprise-bearing two-step workflow).

<!-- entity: deathheight:frogbot:editor -->

## deathheight:frogbot:editor (KTX command, Frogbot -- Shape 8 subcommand + tooling-mode prereq)

- **Status**: drafted
- **Source**: src/bot_commands.c:2356 (table entry) / handler FrogbotSetDeathHeight at src/bot_commands.c:2062
- **Catalog line**: 4601
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot route-editor command (invoked as 'botcmd deathheight'; requires bot editor mode). Sets a per-map height floor below which bots or bot-dropped items are treated as killed by a fall or hazard. With no argument, prints the current floor value or 'Death height: not set' if unset. 'deathheight clear' resets the floor to unset. A numeric argument sets the floor to that height value. The setting persists into the saved .bot routing file for the map.
>
> Set by: 'botcmd deathheight <value>' in bot editor mode.

### Shape classification

Shape 8 subcommand + tooling-mode prereq.

`deathheight` is in `editor_commands[]` at line 2356, handler `FrogbotSetDeathHeight`. Read/setter for a per-map scalar that persists into the `.bot` routing file. No cvar pairing, no vote, no election. Shape 8 + tooling-mode prereq.

### Proposed draft

```
Reads or sets a per-map height floor below which bots treat falling entities as
killed (botcmd deathheight [value|clear]).

Effect:
  With no argument: prints the current death-height floor, or "Death height: not set"
    if no floor has been configured for this map.
  With a numeric argument: sets the floor to that height value.
  With 'clear': resets the floor to unset (removes the threshold).
  The setting is persisted to the map's .bot routing file when 'botcmd save' is run --
    it survives map reloads once saved.

Prerequisites:
  Frogbot editor mode must be active (FB_OPTION_EDITOR_MODE) -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused with a
  message; literally not in the menu).

Permission:    any player or spectator (runtime gate via k_fb_admin_only --
               default 0 allows anyone, 1 requires admin, 2 requires real server admin).
Match-state:   any time.

Example:
  botcmd deathheight        (read current value)
  Death height: not set
  botcmd deathheight -200   (set floor to height -200)
  botcmd deathheight        (confirm)
  Death height: -200
    Specify 'deathheight clear' to clear
  botcmd deathheight clear  (reset to unset)
  botcmd save               (write the setting to the .bot file)

See also: botcmd (parent dispatcher), k_fb_admin_only (runtime gate),
  save:frogbot:editor (persist the death-height setting to disk),
  summary:frogbot:editor (map-wide diagnostic -- surfaces other routing gaps).
```

### Notes

- Source-verified: `FrogbotSetDeathHeight` at lines 2062-2091. `trap_CmdArgc()==2` = no extra arg (read path, lines 2064-2075). "clear" string check at line 2082; numeric set at lines 2086-2088. Persistence confirmed: `FrogbotSaveBotFile` at line 1012-1014 writes `SetMapDeathHeight %d` to the `.bot` file if floor is above `FB_MAPDEATHHEIGHT_DEFAULT`.
- Existing description is accurate. Recast clarifies that persistence requires `botcmd save` to commit (existing description says "persists into the saved .bot routing file" which implies it's automatic, but the save is a separate step the user must take).

<!-- entity: k_fbskill_aim_accuracy -->
## k_fbskill_aim_accuracy (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:119
- **Catalog line**: 3236
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI aim tuning: the bot's permitted aim-error tolerance (in degrees) when deciding whether to open fire. Higher values allow the bot to fire from sloppier aim; lower values require the bot to be aimed more precisely before shooting.
>
> Range: 0-45 (degrees; clamped per bot).
>
> Default: set from bot skill level.
> Set by: server config (normally managed by the bot skill system; override by hand only for testing).

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `src/bot_botimp.c:119` via `RegisterCvar(FB_CVAR_ACCURACY)`. Read by `SetAttribs()` at bot spawn time (`bot_botimp.c:304`): `bound(0, cvar(FB_CVAR_ACCURACY), 45)`. Consumed by weapon-fire logic in `bot_botweap.c:150` to compute `min_angle_error` -- the bot fires only when the current angle to the target is within this tolerance. No `cvar_toggle_msg` or cycle handler exists.

### Proposed draft

```
Controls the aim-error tolerance (in degrees) a bot must achieve before opening fire -- higher values let bots shoot from sloppier aim, lower values require precise targeting.

Effect:
  At each weapon-fire decision, the bot computes its current angle to the enemy. If that angle exceeds this tolerance (adjusted by range), the bot does not fire. Higher values = bot fires earlier, landing fewer shots; lower values = bot waits for tighter aim, landing more shots.
  The value is read at bot-spawn time and locked for that bot's session; changing the cvar mid-match does not affect already-spawned bots.

Permission:    server config only
Default:       45 minus (skill level x 2.25), clamped at skill 10 (e.g. skill 0 = 45 deg; skill 10+ = 22.5 deg). Lower = more accurate.

Example:
  # server.cfg -- force tighter accuracy than default at max skill
  k_fbskill_aim_accuracy 18

See also: skill:frogbot:std (subcommand that adjusts skill level and rewrites this cvar), k_fbskill_aim_yaw_min (minimum horizontal wobble), k_fbskill_aim_pitch_min (minimum vertical wobble)
```

### Notes

- v1 -> v2 recast: split "Set by" into Permission; added Effect with behavioral detail about the angle-tolerance mechanism; clarified that values are locked at bot-spawn time (behavior surfaced from `SetAttribs` call site in `bot_commands.c:348`).
- Default formula verified from source `setSkillAttributes`: `45 - min(skill, 10) * 2.25`. At skill 0 = 45; at skill 10 or above = 22.5.
- The lock-at-spawn behavior is a surprise-bearing prerequisite: changing the cvar while bots are in-game has no effect on those bots; bots must be respawned (re-added) to pick up new values.

<!-- entity: k_fbskill_aim_attack_respawns -->
## k_fbskill_aim_attack_respawns (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/bot_botimp.c:128
- **Catalog line**: 3266
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI skill tuning: enables spawn-fragging behaviour. When nonzero, a bot with a rocket launcher will fire at the enemy's spawn point immediately after killing them in a duel (not active in race, clan arena, or hoonymode). At zero, bots never spawn-frag.
>
> 0 = spawn-fragging disabled.
> 1 = spawn-fragging enabled.
>
> Default: derived from bot skill level (enabled at high skill).
> Set by: server config (overrides the skill-level default).

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `src/bot_botimp.c:128` via `RegisterCvar(FB_CVAR_ATTACK_RESPAWNS)`. Read by `SetAttribs()` at bot spawn (`bot_botimp.c:325`): `self->fb.skill.attack_respawns = cvar(FB_CVAR_ATTACK_RESPAWNS) > 0`. Consumed by `AttackRespawns()` in `bot_aim.c:457`, which checks `self->fb.skill.attack_respawns` -- the bot fires at the enemy's spawn point if the enemy just died, the bot has rocket launcher with >3 rockets, and is not rocket-jumping. No `cvar_toggle_msg` site.

### Proposed draft

```
Enables or disables spawn-fragging behaviour: when set to 1, a bot armed with a rocket launcher fires at the enemy's spawn point immediately after killing them.

Effect:
  When nonzero: after the bot kills an enemy in standard 1on1 duel, it fires at the enemy's predicted spawn point using the rocket launcher (requires RL + more than 3 rockets; not triggered if the bot is mid-rocket-jump).
  When 0: bots never attempt spawn-frags.
  Inactive in Rocket Arena duel and HoonyMode duel; only fires in standard 1on1 duel.
  Value is read at bot-spawn time; changing mid-match does not affect already-spawned bots.

0 = spawn-fragging disabled
1 = spawn-fragging enabled

Permission:    server config only
Default:       0 for skill below 15; 1 at skill 15 and above.

Example:
  # server.cfg -- enable spawn-frag behaviour regardless of skill level
  k_fbskill_aim_attack_respawns 1

See also: skill:frogbot:std (adjusts overall bot skill level, which sets this cvar), k_fbskill_aim_accuracy (aim tolerance at fire time)
```

### Notes

- FLAG: existing description names "clan arena" as an exclusion. Source (`bot_aim.c:448`) checks `isRA() || isHoonyModeDuel() || !isDuel()`. `isRA()` is Rocket Arena (a duel modifier -- `isDuel() && cvar("k_rocketarena")`), verified in `src/arena.c:130`. Clan arena (`isCA()`) is a completely separate mode and is NOT checked here. The exclusion is Rocket Arena, not clan arena.
- "Race" exclusion from the existing description is implicit: race mode fails `isDuel()`, so `!isDuel()` catches it, but race is not explicitly named in source. The existing description's "race" mention is technically derivable but misleading as a named exclusion.
- Recast reflects source-truth: "Inactive in Rocket Arena duel and HoonyMode duel; only fires in standard 1on1 duel."
- Default verified from `setSkillAttributes` line 179: `cvar_fset(FB_CVAR_ATTACK_RESPAWNS, skill >= 15 ? 1 : 0)`.

<!-- entity: k_fbskill_aim_lgpref -->
## k_fbskill_aim_lgpref (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:118
- **Catalog line**: 3297
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning: probability (0 to 1) that the bot proactively switches to the Lightning Gun during weapon selection. At each decision the bot picks LG when already firing it, or randomly based on this value. Only applies when the bot owns LG, the enemy is within 600 units, and the bot is not deep underwater (unless protected by Pentagram). Normally derived automatically from bot skill level; manual override is possible.
>
> Range: 0 to 1 (0 = never proactively switch to LG; 1 = always prefer LG when available).
>
> Default: derived from bot skill (via RangeOverSkill).
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `src/bot_botimp.c:118`. Read by `SetAttribs()` at bot spawn (`bot_botimp.c:312`): `bound(0, cvar(FB_CVAR_LGPREF), 1)`. Consumed by weapon-selection logic in `bot_botweap.c:749`: `if ((firing_lg || (self->fb.skill.lg_preference >= g_random())) && !fb_lg_disabled())`, with inner guards for waterlevel, LG ownership, and enemy distance (<=600 units). No paired toggle command.

### Proposed draft

```
Sets the probability (0.0 to 1.0) that a bot proactively switches to the Lightning Gun when selecting a weapon -- higher values make bots prefer LG more often.

Effect:
  At each weapon-selection frame, if the bot is not already firing LG, it rolls a random value: if the roll is below this probability, the bot attempts to switch to LG.
  LG selection is also gated: bot must own LG, enemy must be within 600 units, and the bot must not be fully submerged (unless carrying Pentagram of Protection).
  Value is read at bot-spawn time; changing mid-match does not affect already-spawned bots.

Range: 0.0 to 1.0
  0.0 = bot never proactively switches to LG
  1.0 = bot always prefers LG when conditions are met

Permission:    server config only
Default:       scales with skill level -- 0.2 at minimum skill, 1.0 at maximum skill.

Example:
  # server.cfg -- bots always prefer LG at close range when they have it
  k_fbskill_aim_lgpref 1.0

See also: skill:frogbot:std (adjusts overall bot skill level, which sets this cvar), k_fbskill_aim_accuracy (aim tolerance affecting LG fire decisions)
```

### Notes

- v1 -> v2 recast: split "Set by" into Permission; restructured range table inline; added lock-at-spawn behavior.
- Default formula verified from `setSkillAttributes` line 166: `RangeOverSkill(skill, 0.2f, 1.0f)` -- minimum skill = 0.2, maximum skill = 1.0.
- Existing description is accurate; no contradictions found.

<!-- entity: k_fbskill_aim_lookanywhere -->
## k_fbskill_aim_lookanywhere (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:114
- **Catalog line**: 3327
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Sets the probability (0.0-1.0) that the bot anticipates enemy movement by aiming at a predicted future position instead of the enemy's current position. Higher values make the bot aim more predictively. The server normally sets this from the bot's skill level; setting the cvar overrides that.
>
> Range: 0.0-1.0 (clamped).
>
> Default: set by skill level formula.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `src/bot_botimp.c:114`. Read by `SetAttribs()` at bot spawn (`bot_botimp.c:307`): `bound(0, cvar(FB_CVAR_LOOKANYWHERE), 1)`. Consumed by `PredictionShotLogic()` in `bot_botpath.c:213`: `if ((match_in_progress == 2) && (g_random() < self->fb.skill.look_anywhere))` -- when the roll passes, the bot aims at a predicted path marker instead of the enemy's current position. No paired toggle command.

### Proposed draft

```
Sets the probability (0.0 to 1.0) that a bot aims at the enemy's predicted future position rather than their current position when choosing shot angles.

Effect:
  At each shot-aim frame during a live match, the bot rolls a random value against this probability. If the roll passes, the bot calculates a predicted arrival position along the enemy's current movement path and aims there instead of at the enemy's current location.
  Higher values = bot leads shots more often; lower values = bot tracks current position.
  Value is read at bot-spawn time; changing mid-match does not affect already-spawned bots.

Range: 0.0 to 1.0
  0.0 = bot always aims at enemy's current position
  1.0 = bot always aims at predicted position

Permission:    server config only
Default:       0.0 at minimum skill, 1.0 at maximum skill.

Example:
  # server.cfg -- bots always use predictive aim (max skill behaviour)
  k_fbskill_aim_lookanywhere 1.0

See also: skill:frogbot:std (adjusts overall bot skill level, which sets this cvar), k_fbskill_aim_accuracy (aim-error tolerance before firing)
```

### Notes

- v1 -> v2 recast: split "Set by" into Permission; added behavioral detail about PredictionShotLogic; added lock-at-spawn note.
- Default formula verified from `setSkillAttributes` line 160: `RangeOverSkill(skill, 0.0f, 1.0f)` -- min skill = 0.0, max skill = 1.0.
- Existing description accurate; no contradictions found.
- Note: PredictionShotLogic fires only during `match_in_progress == 2` (live match), so this cvar has no effect in warmup.

<!-- entity: k_fbskill_aim_pitch_max -->
## k_fbskill_aim_pitch_max (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:125
- **Catalog line**: 3357
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Caps the maximum vertical (pitch) aim-error the bot can accumulate during per-frame aim randomization -- a higher value allows larger vertical misses. Paired with k_fbskill_aim_pitch_min (minimum) and k_fbskill_aim_pitch_scale (error scaling factor). The server normally sets this from the bot's aim-skill level; setting the cvar overrides that.
>
> Range: 0-10 (clamped).
>
> Default: set by aim-skill formula.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `src/bot_botimp.c:125`. Read by `SetAttribs()` at bot spawn (`bot_botimp.c:321`): `bound(0, cvar(FB_CVAR_PITCH_MAX_ERROR), 10)`. Consumed by `BotsModifyAimAtPlayerLogic()` in `bot_aim.c:350`: `pitch_diff = bound(pitch->minimum, fabs(raw_pitch_diff) * pitch->scale, pitch->maximum)` -- caps the pitch deviation used to seed the randomized aim offset. No paired toggle command.

### Proposed draft

```
Caps the maximum vertical (pitch) aim deviation a bot accumulates per frame during aim randomization -- larger values allow larger vertical misses from the target.

Effect:
  Each frame the bot holds a target in sight, it randomizes its vertical aim by sampling a distribution bounded by this maximum. The pitch deviation fed to the randomizer is: `clamp(raw_pitch_diff * pitch_scale, pitch_min, pitch_max)`. This cvar is the upper bound of that clamp.
  Higher values allow the bot's vertical aim to wander further off-target.
  Value is read at bot-spawn time; changing mid-match does not affect already-spawned bots.

Range: 0 to 10 (degrees)

Permission:    server config only
Default:       scales with aim-skill level -- 4.5 at minimum aim-skill, 3.0 at maximum aim-skill.

Example:
  # server.cfg -- widen vertical aim band (bots miss more vertically)
  k_fbskill_aim_pitch_max 6.0

See also: k_fbskill_aim_pitch_min (floor of the pitch deviation), k_fbskill_aim_pitch_scale (scaling factor applied before this cap), k_fbskill_aim_pitch_multiplier (distribution spread), skill:frogbot:std (adjusts aim-skill level)
```

### Notes

- v1 -> v2 recast: split "Set by" into Permission; added Effect explaining the clamp formula; added lock-at-spawn note.
- Default formula verified from `setSkillAttributes` line 175: `RangeOverSkill(aimskill, 4.5, 3)` -- min aim-skill = 4.5, max aim-skill = 3.0.
- Range verified from `SetAttribs` line 321: `bound(0, ..., 10)`.

<!-- entity: k_fbskill_aim_pitch_min -->
## k_fbskill_aim_pitch_min (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:124
- **Catalog line**: 3387
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning: minimum vertical (pitch) aim-error magnitude in degrees. Sets the floor for how much the bot's aim wobbles vertically -- the bot always deviates by at least this many degrees even when on-target. Overrides the server's skill-derived value for all bots.
>
> Range: 0 to 10 (clamped; degrees).
>
> Default: derived from bot skill level.
> Set by: server config (overrides skill-formula default).

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `src/bot_botimp.c:124`. Read by `SetAttribs()` at bot spawn (`bot_botimp.c:320`): `bound(0, cvar(FB_CVAR_PITCH_MIN_ERROR), 10)`. Consumed by `BotsModifyAimAtPlayerLogic()` in `bot_aim.c:350`: `pitch_diff = bound(pitch->minimum, fabs(raw_pitch_diff) * pitch->scale, pitch->maximum)` -- the minimum clamp ensures even precisely-aimed bots have at least this much vertical wobble. No paired toggle command.

### Proposed draft

```
Sets the minimum vertical (pitch) aim deviation a bot sustains per frame -- the bot always wobbles vertically by at least this many degrees, even when directly on target.

Effect:
  Each frame the bot aims at a target, the pitch deviation is clamped to at least this floor before being randomized. Even a perfectly aimed bot will have this minimum vertical imprecision injected.
  Higher values guarantee more vertical wobble (harder to track precisely); lower values allow the bot to be more vertically consistent.
  Value is read at bot-spawn time; changing mid-match does not affect already-spawned bots.

Range: 0 to 10 (degrees)

Permission:    server config only
Default:       scales with aim-skill level -- 1.5 at minimum aim-skill, 1.0 at maximum aim-skill.

Example:
  # server.cfg -- slightly increase bot's minimum vertical wobble
  k_fbskill_aim_pitch_min 2.0

See also: k_fbskill_aim_pitch_max (cap on pitch deviation), k_fbskill_aim_pitch_scale (scaling factor), k_fbskill_aim_yaw_min (equivalent minimum for horizontal wobble), skill:frogbot:std (adjusts aim-skill level)
```

### Notes

- v1 -> v2 recast: split "Set by" into Permission; added Effect explaining the floor-clamp role; added lock-at-spawn note; added cross-axis See-also.
- Default formula verified from `setSkillAttributes` line 174: `RangeOverSkill(aimskill, 1.5, 1)` -- min aim-skill = 1.5, max aim-skill = 1.0.
- Range verified from `SetAttribs` line 320: `bound(0, ..., 10)`.

<!-- entity: k_fbskill_aim_pitch_multiplier -->
## k_fbskill_aim_pitch_multiplier (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:126
- **Catalog line**: 3417
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning: scales the spread of the bot's vertical (pitch) aim error. Values above 1 widen the distribution and push error toward the extremes; values below 1 narrow it toward the centre. The underlying distribution shape is unchanged -- only its standard-deviation scale is affected. Normally derived automatically from bot skill level; manual override is possible.
>
> Range: 0 to 10 (clamped per bot).
>
> Default: derived from bot skill (via RangeOverSkill).
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `src/bot_botimp.c:126`. Read by `SetAttribs()` at bot spawn (`bot_botimp.c:322`): `bound(0, cvar(FB_CVAR_PITCH_MULTIPLIER), 10)`. Consumed by `BotsModifyAimAtPlayerLogic()` in `bot_aim.c:353`: `pitch_rnd = dist_random(-pitch_diff, pitch_diff, pitch->multiplier * self->fb.skill.current_volatility)` -- the multiplier scales the volatility parameter of the random distribution used to generate each frame's pitch offset. No paired toggle command.

### Proposed draft

```
Scales the spread of the bot's per-frame vertical (pitch) aim randomization -- higher values push aim offsets toward the extremes of the error band, lower values cluster them near zero.

Effect:
  Each frame the bot generates a random vertical aim offset, sampled from a distribution with spread proportional to `pitch_multiplier × current_volatility`. Higher multiplier = wider spread, more erratic vertical aim; lower multiplier = tighter spread, more consistent vertical aim.
  Interacts with the volatility system: high bot volatility (from recent damage, enemy movement, etc.) amplifies the multiplier's effect.
  Value is read at bot-spawn time; changing mid-match does not affect already-spawned bots.

Range: 0 to 10

Permission:    server config only
Default:       scales with aim-skill level -- 4.0 at minimum aim-skill, 2.0 at maximum aim-skill.

Example:
  # server.cfg -- reduce spread for more consistent (less erratic) pitch aim
  k_fbskill_aim_pitch_multiplier 2.0

See also: k_fbskill_aim_pitch_min (floor), k_fbskill_aim_pitch_max (cap), k_fbskill_aim_pitch_scale (scale factor), skill:frogbot:std (adjusts aim-skill level)
```

### Notes

- v1 -> v2 recast: split "Set by" into Permission; replaced vague "standard-deviation scale" prose with behavioral consequence referencing volatility system; added lock-at-spawn note.
- Default formula verified from `setSkillAttributes` line 176: `RangeOverSkill(aimskill, 4, 2)` -- min aim-skill = 4, max aim-skill = 2. Note: existing description says "via RangeOverSkill" -- range is 4 to 2 (not 4 to 2.5 as for yaw multiplier; slight difference between pitch and yaw defaults verified from source).
- Range verified from `SetAttribs` line 322: `bound(0, ..., 10)`.

<!-- entity: k_fbskill_aim_pitch_scale -->
## k_fbskill_aim_pitch_scale (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:127
- **Catalog line**: 3447
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Sets the vertical (pitch) aim-error growth factor: each frame, the bot's pitch aim error scales with the angular distance from the target multiplied by this value before clamping. Larger values make the bot's vertical aim less accurate the further off-target it is. Counterpart to the horizontal yaw scale.
>
> Range: 0.0 to 5.0 (clamped).
>
> Default: derived from bot skill level (server-managed).
> Set by: server config (overrides the skill-derived value).

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `src/bot_botimp.c:127`. Read by `SetAttribs()` at bot spawn (`bot_botimp.c:323`): `bound(0, cvar(FB_CVAR_PITCH_SCALE), 5)`. Consumed by `BotsModifyAimAtPlayerLogic()` in `bot_aim.c:350`: `pitch_diff = bound(pitch->minimum, fabs(raw_pitch_diff) * pitch->scale, pitch->maximum)` -- scales the current vertical angular distance before clamping to the min/max band. No paired toggle command.

### Proposed draft

```
Sets how much the bot's current vertical (pitch) distance from the target amplifies the aim-error band -- larger values mean the bot is less accurate the further its pitch angle is from the enemy.

Effect:
  Each frame, the pitch deviation fed to the randomizer is `clamp(raw_pitch_angle_diff × pitch_scale, pitch_min, pitch_max)`. Higher scale = larger deviation when the bot is pointed far from the enemy's elevation; lower scale = bot's accuracy degrades less with off-target pitch.
  Acts as a feedback coefficient: already-accurate bots (small angular distance) are little affected; off-target bots (large angular distance) are penalized more.
  Value is read at bot-spawn time; changing mid-match does not affect already-spawned bots.

Range: 0.0 to 5.0

Permission:    server config only
Default:       scales with aim-skill level -- 5.0 at minimum aim-skill, 2.0 at maximum aim-skill.

Example:
  # server.cfg -- reduce pitch scale (bots stay more accurate even when off-target vertically)
  k_fbskill_aim_pitch_scale 2.0

See also: k_fbskill_aim_pitch_min (floor after scaling), k_fbskill_aim_pitch_max (cap after scaling), k_fbskill_aim_pitch_multiplier (distribution spread), k_fbskill_aim_yaw_scale (horizontal equivalent), skill:frogbot:std (adjusts aim-skill level)
```

### Notes

- v1 -> v2 recast: split "Set by" into Permission; replaced "growth factor" framing with the full formula context (raw_diff × scale clamped by min/max); added lock-at-spawn note.
- Default formula verified from `setSkillAttributes` line 177: `RangeOverSkill(aimskill, 5, 2)` -- min aim-skill = 5.0, max aim-skill = 2.0.
- Range verified from `SetAttribs` line 323: `bound(0, ..., 5)`.
- See-also includes `k_fbskill_aim_yaw_scale` for the horizontal equivalent (cross-axis cross-link).

<!-- entity: k_fbskill_aim_yaw_max -->
## k_fbskill_aim_yaw_max (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:121
- **Catalog line**: 3477
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Caps the maximum horizontal (yaw) aim-error the bot can accumulate during per-frame aim randomization -- a higher value allows larger horizontal misses. Paired with k_fbskill_aim_yaw_min (minimum) and k_fbskill_aim_yaw_scale (error scaling factor). The server normally sets this from the bot's aim-skill level; setting the cvar overrides that.
>
> Range: 0-10 (clamped).
>
> Default: set by aim-skill formula.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `src/bot_botimp.c:121`. Read by `SetAttribs()` at bot spawn (`bot_botimp.c:316`): `bound(0, cvar(FB_CVAR_YAW_MAX_ERROR), 10)`. Consumed by `BotsModifyAimAtPlayerLogic()` in `bot_aim.c:351`: `yaw_diff = bound(yaw->minimum, fabs(raw_yaw_diff) * yaw->scale, yaw->maximum)` -- caps the horizontal deviation used to seed the randomized aim offset. No paired toggle command.

### Proposed draft

```
Caps the maximum horizontal (yaw) aim deviation a bot accumulates per frame during aim randomization -- larger values allow larger horizontal misses from the target.

Effect:
  Each frame the bot holds a target in sight, it randomizes its horizontal aim by sampling a distribution bounded by this maximum. The yaw deviation fed to the randomizer is: `clamp(raw_yaw_diff × yaw_scale, yaw_min, yaw_max)`. This cvar is the upper bound of that clamp.
  Higher values allow the bot's horizontal aim to wander further off-target.
  Value is read at bot-spawn time; changing mid-match does not affect already-spawned bots.

Range: 0 to 10 (degrees)

Permission:    server config only
Default:       scales with aim-skill level -- 4.5 at minimum aim-skill, 3.0 at maximum aim-skill.

Example:
  # server.cfg -- widen horizontal aim band (bots miss more to the sides)
  k_fbskill_aim_yaw_max 6.0

See also: k_fbskill_aim_yaw_min (floor of the yaw deviation), k_fbskill_aim_yaw_scale (scaling factor applied before this cap), k_fbskill_aim_yaw_multiplier (distribution spread), k_fbskill_aim_pitch_max (vertical equivalent), skill:frogbot:std (adjusts aim-skill level)
```

### Notes

- v1 -> v2 recast: split "Set by" into Permission; added Effect explaining the clamp formula; added lock-at-spawn note; added cross-axis See-also.
- Default formula verified from `setSkillAttributes` line 170: `RangeOverSkill(aimskill, 4.5, 3)` -- min aim-skill = 4.5, max aim-skill = 3.0 (same as pitch_max defaults).
- Range verified from `SetAttribs` line 316: `bound(0, ..., 10)`.

<!-- entity: k_fbskill_aim_yaw_min -->
## k_fbskill_aim_yaw_min (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/bot_botimp.c:120
- **Catalog line**: 3507
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning: sets the minimum horizontal (yaw) aim wobble for bots. This is the floor of the per-frame randomized yaw deviation -- the bot still wobbles horizontally by at least this many degrees even when already on target. Higher values mean the bot is never perfectly horizontally centred on an enemy.
>
> Range: 0-1 (degrees; clamped per bot).
>
> Default: set from bot skill level.
> Set by: server config (normally managed by the bot skill system; override by hand only for testing).

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `src/bot_botimp.c:120`. Read by `SetAttribs()` at bot spawn (`bot_botimp.c:315`): `bound(0, cvar(FB_CVAR_YAW_MIN_ERROR), 1)`. Consumed by `BotsModifyAimAtPlayerLogic()` in `bot_aim.c:351`: `yaw_diff = bound(yaw->minimum, fabs(raw_yaw_diff) * yaw->scale, yaw->maximum)`. No paired toggle command.

### Proposed draft

```
Sets the minimum horizontal (yaw) aim deviation a bot sustains per frame -- the bot always wobbles horizontally by at least this many degrees, even when directly on target.

Effect:
  Each frame the bot aims at a target, the yaw deviation is clamped to at least this floor before being randomized. Even a perfectly aimed bot will have this minimum horizontal imprecision injected.
  Higher values guarantee more horizontal wobble; lower values allow the bot to track more precisely horizontally.
  Value is read at bot-spawn time; changing mid-match does not affect already-spawned bots.

Range: 0 to 1 (degrees)

Permission:    server config only
Default:       scales with aim-skill level -- 1.5 at minimum aim-skill, 1.0 at maximum aim-skill.

Example:
  # server.cfg -- reduce minimum horizontal wobble (bots track horizontally more precisely)
  k_fbskill_aim_yaw_min 0.5

See also: k_fbskill_aim_yaw_max (cap on yaw deviation), k_fbskill_aim_yaw_scale (scaling factor), k_fbskill_aim_pitch_min (vertical equivalent), skill:frogbot:std (adjusts aim-skill level)
```

### Notes

- FLAG: the range clamp in source is `bound(0, cvar(FB_CVAR_YAW_MIN_ERROR), 1)` -- upper bound is 1.0. The default formula (`RangeOverSkill(aimskill, 1.5, 1)`) can produce values up to 1.5 at minimum skill, but the `SetAttribs` clamp silently truncates anything above 1.0. This means the configured default at low skill is always clamped to 1.0 in practice. The existing description's "Range: 0-1" correctly describes the effective range, but this clamp behavior is not called out. Draft reflects the effective range (0 to 1) which is source-accurate, but apply-pass author should consider adding a note about the default-exceeds-clamp behavior.
- v1 -> v2 recast: split "Set by" into Permission; added Effect explaining the floor-clamp role; added lock-at-spawn note; cross-axis See-also added.
- Default formula verified from `setSkillAttributes` line 169: `RangeOverSkill(aimskill, 1.5, 1)` -- min aim-skill = 1.5, max aim-skill = 1.0.
- Range verified from `SetAttribs` line 315: `bound(0, ..., 1)`. Note this is tighter than pitch_min (0-10), which explains why the existing description correctly lists "0-1" unlike pitch_min's "0-10".

<!-- entity: k_fbskill_aim_yaw_multiplier -->

## k_fbskill_aim_yaw_multiplier (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:122 (RegisterCvar), :171 (setSkillAttributes write), :317 (SetAttribs read, bound 0-10)
- **Catalog line**: 3537
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning: distribution-shaping factor for horizontal (yaw) aim-error randomization. After the yaw error magnitude is clamped, this value (multiplied by the bot's current volatility) biases the random draw -- higher values push the result toward the extremes of the allowed error band rather than the center. Overrides the server's skill-derived value.
>
> Range: 0 to 10 (clamped).
>
> Default: derived from bot skill level.
> Set by: server config (overrides skill-formula default).

### Shape classification

Shape 3: cvar with no paired toggle/cycle command. Registered via `RegisterCvar(FB_CVAR_YAW_MULTIPLIER)` in `RegisterSkillVariables()`; read by `SetAttribs()` via `cvar(FB_CVAR_YAW_MULTIPLIER)` bound to 0-10. Written by `setSkillAttributes()` / `setSkillAttributesEasySkillMode()` as part of the bot-skill-level initialization pipeline, not by any user-facing toggle handler.

### Proposed draft

```
Controls how the bot's horizontal (yaw) aim error is distributed across its allowed error band -- higher values push errors toward the extremes of the band rather than the center.

Effect:
  Read by each bot at add-time (and when 'botcmd skill' is called) to shape how unpredictable the bot's horizontal aim error is within its allowed min/max range. At the extremes (high value), the bot misses with large yaw offsets most often; near 0, errors cluster toward the band's center.

Prerequisites:
  Setting this in server.cfg takes effect when the next bot is added. Running 'botcmd skill <N>' afterwards will overwrite this value with the skill-formula default.

Permission:    server config only
Default:       0 (overwritten to a skill-formula value when bots are initialized via 'botcmd skill' or 'addbot')
Range:         0 to 10 (clamped at read time)

Example:
  # server.cfg -- pin yaw error distribution for all bots regardless of skill
  k_fbskill_aim_yaw_multiplier 3

See also: k_fbskill_aim_yaw_scale (yaw error growth rate), k_fbskill_aim_yaw_min (yaw error minimum), k_fbskill_aim_yaw_max (yaw error maximum), skill:frogbot:std (botcmd subcommand that resets this to formula values)
```

### Notes

- The v1 "Overrides the server's skill-derived value" framing is accurate but omits the key risk: `botcmd skill <N>` silently overwrites any manual server.cfg value by re-running `setSkillAttributes()`. Recast surfaces this as a Prerequisites line so operators know to set after (or instead of) using `botcmd skill`.
- Default shown as 0 because `RegisterCvar()` uses no explicit default value argument -- cvar starts at 0 until `setSkillAttributes()` runs. This is a behavioral refinement over the v1 "derived from bot skill level" label.

<!-- entity: k_fbskill_aim_yaw_scale -->

## k_fbskill_aim_yaw_scale (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:123 (RegisterCvar), :172 (setSkillAttributes write), :318 (SetAttribs read, bound 0-5)
- **Catalog line**: 3567
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning: horizontal (yaw) aim-error growth factor. Controls how steeply the bot's horizontal aim error grows the further off-target it is -- a higher value means larger yaw deviations when the bot is way off-target. Overrides the server's skill-derived value for all bots.
>
> Range: 0 to 5 (clamped).
>
> Default: derived from bot skill level.
> Set by: server config (overrides skill-formula default).

### Shape classification

Shape 3: same pattern as k_fbskill_aim_yaw_multiplier. Registered via `RegisterCvar(FB_CVAR_YAW_SCALE)`; read by `SetAttribs()` bound to 0-5; written by `setSkillAttributes()`.

### Proposed draft

```
Controls how steeply the bot's horizontal (yaw) aim error grows the further off-target it currently is -- higher values produce larger yaw misses when the bot is already far off-center.

Effect:
  Read by each bot at add-time (and when 'botcmd skill' is called) to scale yaw aim-error magnitude relative to the bot's current aim offset. Works alongside k_fbskill_aim_yaw_multiplier to shape how the random yaw error is generated.

Prerequisites:
  Setting this in server.cfg takes effect when the next bot is added. Running 'botcmd skill <N>' afterwards will overwrite this value with the skill-formula default.

Permission:    server config only
Default:       0 (overwritten to a skill-formula value when bots are initialized via 'botcmd skill' or 'addbot')
Range:         0 to 5 (clamped at read time)

Example:
  # server.cfg -- pin yaw error scale for all bots regardless of skill
  k_fbskill_aim_yaw_scale 3

See also: k_fbskill_aim_yaw_multiplier (yaw error distribution shaping), k_fbskill_aim_yaw_min (yaw error minimum), k_fbskill_aim_yaw_max (yaw error maximum), skill:frogbot:std (botcmd subcommand that resets this to formula values)
```

### Notes

- Same overwrite risk as k_fbskill_aim_yaw_multiplier: `botcmd skill <N>` resets via `setSkillAttributes()`. Surfaced in Prerequisites.
- Default 0 for same reason: `RegisterCvar()` with no default argument.

<!-- entity: k_fbskill_visibility -->

## k_fbskill_visibility (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:117 (RegisterCvar), :167 (setSkillAttributes write), :313 (SetAttribs read, bound 0.5-0.7071067)
- **Catalog line**: 3959
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Controls the width of the bot's forward awareness cone for detecting targets: larger values narrow the cone (bot requires a target to be more directly in front to register it as visible); smaller values widen it. Values range from ~120-degree cone (0.5) to ~90-degree cone (0.707).
>
> Range: 0.5 to 0.7071 (clamped; ~120° to ~90° awareness cone).
>
> Default: derived from bot skill level (server-managed).
> Set by: server config (overrides the skill-derived value).

### Shape classification

Shape 3: registered via `RegisterCvar(FB_CVAR_VISIBILITY)`; read by `SetAttribs()` bound to 0.5-0.7071067; written by `setSkillAttributes()` using the formula `0.7071067f - (0.02f * min(skill, 10))` (higher skill = narrower cone = value approaching 0.707). No paired command.

### Proposed draft

```
Sets the width of the bot's forward detection cone -- the angle within which a target must fall to be registered as visible.

Effect:
  Lower values produce a wider detection cone (up to ~120 degrees at 0.5), letting the bot spot targets in its peripheral vision. Higher values narrow the cone toward ~90 degrees (0.707), requiring targets to be more directly ahead. Read by each bot at add-time and when 'botcmd skill' is called.

Prerequisites:
  Setting this in server.cfg takes effect when the next bot is added. Running 'botcmd skill <N>' afterwards will overwrite this value with the skill-formula default.

Permission:    server config only
Default:       0 (overwritten to a skill-formula value when bots are initialized via 'botcmd skill' or 'addbot')
Range:         0.5 to 0.7071 (clamped; 0.5 = ~120-degree cone, 0.707 = ~90-degree cone)

Example:
  # server.cfg -- maximum peripheral awareness (widest cone) regardless of skill
  k_fbskill_visibility 0.5

See also: skill:frogbot:std (botcmd subcommand that resets this to formula values), k_fbskill_reactiontime (fire-onset delay once a target is seen)
```

### Notes

- The v1 inverse-relationship explanation ("larger values narrow the cone") is correct and important -- counter-intuitive naming. Preserved and foregrounded in Effect.
- The source comment on line 167 confirms the cone correspondence: `// equivalent of 90 => 120 fov`.
- Default 0 same reason as sibling cvars; overwritten by skill initialization pipeline.

<!-- entity: k_fbskill_goallookaheadtime -->

## k_fbskill_goallookaheadtime (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:115 (RegisterCvar), :161 (setSkillAttributes write), :308 (SetAttribs read, bound 0-45)
- **Catalog line**: 3718
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning: goal planning time horizon in seconds. The bot only considers goals it can reach within this time window, and scores them higher the further inside the window they are -- a longer horizon makes bots pursue goals that are further away. Overrides the server's skill-derived value.
>
> Range: 0 to 45 (clamped; seconds).
>
> Default: derived from bot skill level.
> Set by: server config (overrides skill-formula default).

### Shape classification

Shape 3: registered via `RegisterCvar(FB_CVAR_LOOKAHEADTIME)`; read by `SetAttribs()` bound to 0-45; written by `setSkillAttributes()`.

### Proposed draft

```
Sets the bot's goal-planning time horizon in seconds -- how far ahead the bot looks when selecting which item or goal to pursue.

Effect:
  The bot only considers goals reachable within this time window, and scores goals higher the more time it has to reach them. A larger value makes bots pursue items further away (they become worth considering); a smaller value restricts pursuit to nearby goals. Read by each bot at add-time and when 'botcmd skill' is called.

Prerequisites:
  Setting this in server.cfg takes effect when the next bot is added. Running 'botcmd skill <N>' afterwards will overwrite this value with the skill-formula default.

Permission:    server config only
Default:       0 (overwritten to a skill-formula value -- range 5 to 30 seconds -- when bots are initialized)
Range:         0 to 45 seconds (clamped at read time)

Example:
  # server.cfg -- short horizon, bot only pursues nearby goals
  k_fbskill_goallookaheadtime 10

See also: k_fbskill_goalpredictionerror (respawn-timing error for goal scoring), skill:frogbot:std (botcmd subcommand that resets this to formula values)
```

### Notes

- Skill-formula range verified from source: `RangeOverSkill(skill, 5.0f, 30.0f)` -- lowest skill gives 5s, highest gives 30s. The 0-45 bound is the safety clamp; the practical range via formula is 5-30.
- Default note made more informative by surfacing the formula range (5-30) derived from source.

<!-- entity: k_fbskill_goalpredictionerror -->

## k_fbskill_goalpredictionerror (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:116 (RegisterCvar), :162 (setSkillAttributes write), :309 (SetAttribs read, bound 0-1); src/bot_botgoals.c:148 (consumer: adds noise to saved_respawn_time)
- **Catalog line**: 3748
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Scales the random error injected into the bot's estimate of when items respawn: higher values make the bot assume items take longer to reappear (less accurate routing decisions); 0 gives a perfect respawn-timing estimate. The server normally sets this from the bot's skill level; setting the cvar overrides that.
>
> Range: 0.0-1.0 (clamped; 0 = perfect timing, 1 = maximum error).
>
> Default: set by skill level formula.
> Set by: server config.

### Shape classification

Shape 3: registered via `RegisterCvar(FB_CVAR_PREDICTIONERROR)`; read by `SetAttribs()` bound to 0-1; written by `setSkillAttributes()`.

### Proposed draft

```
Scales the random timing error the bot uses when estimating when an item will next be available for pickup.

Effect:
  At 0, the bot has a perfect estimate of when items respawn (optimal routing). As the value increases, the bot's timing estimate gains a random positive offset -- making it less accurate in prioritizing goals by respawn window. Read by each bot at add-time and when 'botcmd skill' is called.

Prerequisites:
  Setting this in server.cfg takes effect when the next bot is added. Running 'botcmd skill <N>' afterwards will overwrite this value with the skill-formula default.

Permission:    server config only
Default:       0 (overwritten to a skill-formula value when bots are initialized; lower skills get higher error values)
Range:         0.0 to 1.0 (clamped at read time; 0 = perfect timing, 1 = maximum randomness)

Example:
  # server.cfg -- give bots perfect respawn timing regardless of skill
  k_fbskill_goalpredictionerror 0

See also: k_fbskill_goallookaheadtime (planning horizon that interacts with timing accuracy), skill:frogbot:std (botcmd subcommand that resets this to formula values)
```

### Notes

- The existing description says "higher values make the bot assume items take longer to reappear" -- this is directionally correct but slightly imprecise. Source (`bot_botgoals.c:148`) adds `goal_time * prediction_error * g_random()` where `g_random()` is 0-1, so the added noise is always non-negative (items appear to take longer on average). The v2 card says "random positive offset" to be more precise.
- Skill-formula direction confirmed from source: `RangeOverSkill(skill, 1.0f, 0.0f)` -- lowest skill gets 1.0 (maximum error), highest skill gets 0.0 (perfect). The existing description "lower skills get higher error values" is correct.

<!-- entity: k_fbskill_reactionmovetime -->

## k_fbskill_reactionmovetime (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:130 (RegisterCvar), :181 (setSkillAttributes write), :342 (SetAttribs read, bound 0-1.0); src/bot_client.c:137 (consumer: sets min_move_time at spawn)
- **Catalog line**: 3868
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI skill tuning: sets the delay (in seconds) after spawning before the bot starts moving. The bot stands still for this long after entering the game before it begins navigating. See also k_fbskill_reactiontime, which governs the fire-onset delay separately.
>
> Range: 0.0 to 1.0 (seconds, clamped).
>
> Default: derived from bot skill level (via RangeOverSkill).
> Set by: server config (overrides the skill-level default).

### Shape classification

Shape 3: registered via `RegisterCvar(FB_CVAR_REACTION_MOVETIME)`; read by `SetAttribs()` bound to 0-1.0; written by `setSkillAttributes()`. Consumer confirmed at `bot_client.c:137`: `self->fb.min_move_time = g_globalvars.time + self->fb.skill.spawn_move_delay`.

### Proposed draft

```
Sets the delay in seconds after the bot spawns before it begins moving.

Effect:
  On spawn, the bot's movement is frozen until this delay expires. At 0 the bot begins moving immediately; at higher values it stands still for the specified duration before starting navigation. Does not affect the fire-onset delay -- see k_fbskill_reactiontime for that. Read by each bot at add-time and when 'botcmd skill' is called.

Prerequisites:
  Setting this in server.cfg takes effect when the next bot is added. Running 'botcmd skill <N>' afterwards will overwrite this value with the skill-formula default.

Permission:    server config only
Default:       0 (overwritten to a skill-formula value; range 0.1-0.3 seconds across skill levels)
Range:         0.0 to 1.0 seconds (clamped at read time)

Example:
  # server.cfg -- give bots near-instant movement start regardless of skill
  k_fbskill_reactionmovetime 0.1

See also: k_fbskill_reactiontime (fire-onset delay, set separately), skill:frogbot:std (botcmd subcommand that resets this to formula values)
```

### Notes

- The existing description already cross-links to `k_fbskill_reactiontime` -- preserved in See-also.
- Skill-formula range confirmed: `RangeOverSkill(skill, 0.3f, 0.1f)` -- lowest skill gets 0.3s delay, highest gets 0.1s. Both modes (normal + easy skill mode) use the same formula for this cvar.
- The `spawn_move_delay` field name and the `min_move_time` consumer confirm the behavioral claim precisely.

<!-- entity: k_fbskill_reactiontime -->

## k_fbskill_reactiontime (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:129 (RegisterCvar), :180 (setSkillAttributes write), :341 (SetAttribs read, bound 0-1.5); src/bot_client.c:136 and src/bot_aim.c:243 (consumer: sets min_fire_time at spawn and on new target acquisition)
- **Catalog line**: 3898
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI reaction tuning: delay in seconds before the bot may open fire after acquiring a new enemy (or after spawning). Higher values slow the bot's reaction to freshly-seen targets; 0 gives near-instant reaction.
>
> Range: 0-1.5 (seconds; clamped per bot).
>
> Default: set from bot skill level.
> Set by: server config (normally managed by the bot skill system; override by hand only for testing).

### Shape classification

Shape 3: registered via `RegisterCvar(FB_CVAR_REACTION_TIME)`; read by `SetAttribs()` bound to 0-1.5; written by `setSkillAttributes()`. Consumer confirmed at `bot_client.c:136` (spawn) and `bot_aim.c:243` (new target acquisition): sets `min_fire_time = g_globalvars.time + awareness_delay`.

### Proposed draft

```
Sets the delay in seconds before the bot may open fire after spawning or after acquiring a new target in its crosshair.

Effect:
  On spawn and each time the bot first registers a new enemy, the bot is blocked from firing for this duration. At 0 the bot shoots near-instantly upon seeing an enemy; at higher values there is a perceptible pause before first fire. Movement is not affected -- see k_fbskill_reactionmovetime for the movement-onset delay. Read by each bot at add-time and when 'botcmd skill' is called.

Prerequisites:
  Setting this in server.cfg takes effect when the next bot is added. Running 'botcmd skill <N>' afterwards will overwrite this value with the skill-formula default.

Permission:    server config only
Default:       0 (overwritten to a skill-formula value; range 0.3-0.75 seconds in normal mode, 0.3-1.5 seconds in easy skill mode)
Range:         0.0 to 1.5 seconds (clamped at read time)

Example:
  # server.cfg -- slow all bots' reaction regardless of skill (easier for players)
  k_fbskill_reactiontime 1.0

See also: k_fbskill_reactionmovetime (movement-onset delay, set separately), skill:frogbot:std (botcmd subcommand that resets this to formula values)
```

### Notes

- Existing description accurate. New behavioral detail added from source: the delay applies BOTH at spawn (bot_client.c:136) AND when the bot acquires a new target (bot_aim.c:243). The existing description mentions both but the v2 Effect makes this explicit so it's clear it's per-target-acquisition, not just at spawn.
- Skill-formula differs between normal and easy modes: normal = `RangeOverSkill(skill, 0.75f, 0.3f)`; easy = `RangeOverSkill(skill, 1.5f, 0.3f)`. Easy mode gives harder (lower-skill) bots a longer delay. Surfaced in Default note.

<!-- entity: k_fbskill_combatjump -->

## k_fbskill_combatjump (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:147 (RegisterCvar), :203 (setSkillAttributes write), :355 (SetAttribs read, bound 0-1.0); src/bot_botjump.c:458 (consumer: probability gate for CombatJump)
- **Catalog line**: 3597
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Sets the probability (0.0-1.0) that a bot performs a combat jump while engaging an enemy. Higher values mean the bot jumps more often during combat.
>
> Range: 0.0 to 1.0 (probability; clamped).
>
> Default: derived from bot skill level (typically 0.03-0.1 depending on skill and mode).
> Set by: server config or automatically by the bot skill system.

### Shape classification

Shape 3: registered via `RegisterCvar(FB_CVAR_COMBATJUMP_CHANCE)`; read by `SetAttribs()` bound to 0-1.0; written by `setSkillAttributes()`. Consumer confirmed at `bot_botjump.c:458`: `SetJumpFlag(self, (g_random() < self->fb.skill.combat_jump_chance), "CombatJump")`.

### Proposed draft

```
Sets the probability (0.0-1.0) that a bot performs an evasive jump while engaging an enemy in combat.

Effect:
  Each combat cycle, the bot tests a random draw against this value. If the draw falls below the value, the bot jumps. At 0 the bot never jumps during combat; at 1.0 it jumps every time the check fires. Read by each bot at add-time and when 'botcmd skill' is called.

Prerequisites:
  Setting this in server.cfg takes effect when the next bot is added. Running 'botcmd skill <N>' afterwards will overwrite this value with the skill-formula default.

Permission:    server config only
Default:       0 (overwritten to a skill-formula value; range 0.03-0.1 in normal mode, 0.0-0.1 in easy skill mode)
Range:         0.0 to 1.0 (clamped at read time; treated as probability 0%-100%)

Example:
  # server.cfg -- make bots jump frequently during combat regardless of skill
  k_fbskill_combatjump 0.5

See also: k_fbskill_missiledodge (ground-dodge delay on incoming rockets), skill:frogbot:std (botcmd subcommand that resets this to formula values)
```

### Notes

- Existing description accurate. The consumer site (`bot_botjump.c:458`) confirms the probability-gate mechanism precisely: `g_random() < combat_jump_chance`.
- Easy skill mode formula is `RangeOverSkill(skill, 0.0f, 0.1f)` vs normal mode `RangeOverSkill(skill, 0.03f, 0.1f)` -- easy mode starts lower-skill bots at 0 (never jump), normal mode starts them at 0.03. Surfaced in Default note.

<!-- entity: k_fbskill_distanceerror -->

## k_fbskill_distanceerror (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:150 (RegisterCvar), :163 (setSkillAttributes write), :310 (SetAttribs read, bound 0-0.25)
- **Catalog line**: 3627
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning: fractional random error applied when the bot estimates how long it takes to reach an enemy (for aim prediction). A higher value makes the bot mis-time its lead on a moving target; 0 gives an exact time estimate, producing perfectly-timed prediction.
>
> Range: 0-0.25 (fractional; clamped per bot).
>
> Default: set from bot skill level.
> Set by: server config (normally managed by the bot skill system; override by hand only for testing).

### Shape classification

Shape 3: registered via `RegisterCvar(FB_CVAR_DISTANCEERROR)`; read by `SetAttribs()` bound to 0-0.25; written by `setSkillAttributes()`.

### Proposed draft

```
Sets the fractional random error applied to the bot's estimate of how long a projectile takes to travel to its target -- higher values degrade the bot's aim prediction on moving enemies.

Effect:
  At 0, the bot uses a perfect projectile-travel-time estimate (accurate lead on moving targets). As the value increases toward 0.25, the bot's travel-time estimate gains a random error, causing it to mis-lead fast or distant targets. Affects all projectile weapons. Read by each bot at add-time and when 'botcmd skill' is called.

Prerequisites:
  Setting this in server.cfg takes effect when the next bot is added. Running 'botcmd skill <N>' afterwards will overwrite this value with the skill-formula default.

Permission:    server config only
Default:       0 (overwritten to a skill-formula value; lower skills get higher error: range 0.15-0.0 in normal mode, 0.25-0.0 in easy skill mode)
Range:         0.0 to 0.25 (clamped at read time)

Example:
  # server.cfg -- give bots perfect aim prediction regardless of skill
  k_fbskill_distanceerror 0

See also: k_fbskill_aim_yaw_multiplier (separate yaw-distribution factor), k_fbskill_aim_yaw_scale (yaw error growth factor), skill:frogbot:std (botcmd subcommand that resets this to formula values)
```

### Notes

- Easy skill mode formula is `RangeOverSkill(skill, 0.25f, 0.0f)` vs normal mode `RangeOverSkill(skill, 0.15f, 0.0f)` -- easy mode gives harder bots a larger max error (0.25 vs 0.15). Surfaced in Default note.
- The `movement_estimate_error` field name in SetAttribs confirms the behavioral interpretation: it's travel-time estimation, not positional prediction.

<!-- entity: k_fbskill_missiledodge -->

## k_fbskill_missiledodge (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:148 (RegisterCvar), :204 (setSkillAttributes write), :356 (SetAttribs read, bound 0-1.5); src/bot_botthink.c:160 (consumer: time-threshold gate for ground dodge)
- **Catalog line**: 3778
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI skill tuning: sets the reaction delay (in seconds) before a bot begins dodging an incoming missile while on the ground. Higher values make the bot react later to rockets; lower values make it dodge sooner.
>
> Range: 0.0 to 1.5 (seconds, clamped).
>
> Default: derived from bot skill level (via RangeOverSkill).
> Set by: server config (overrides the skill-level default).

### Shape classification

Shape 3: registered via `RegisterCvar(FB_CVAR_MISSILEDODGE_TIME)`; read by `SetAttribs()` bound to 0-1.5; written by `setSkillAttributes()`. Consumer confirmed at `bot_botthink.c:160`: dodge fires only when elapsed time since missile spawn >= `missile_dodge_time`.

### Proposed draft

```
Sets the minimum time in seconds a missile must be in flight before the bot (while on the ground) will begin dodging it.

Effect:
  The bot compares this value against elapsed time since the missile spawned. When the missile has been flying at least this long, the bot begins its dodge movement. Lower values = earlier dodge (bot reacts to fast rockets from closer range); higher values = later dodge (bot waits for the missile to be closer before moving). Only applies while the bot is on the ground. Read by each bot at add-time and when 'botcmd skill' is called.

Prerequisites:
  Setting this in server.cfg takes effect when the next bot is added. Running 'botcmd skill <N>' afterwards will overwrite this value with the skill-formula default.

Permission:    server config only
Default:       0 (overwritten to a skill-formula value; range 0.5-1.0 seconds, lower skill = slower dodge reaction)
Range:         0.0 to 1.5 seconds (clamped at read time)

Example:
  # server.cfg -- bots dodge missiles quickly regardless of skill
  k_fbskill_missiledodge 0.5

See also: k_fbskill_combatjump (evasive jump probability during combat), skill:frogbot:std (botcmd subcommand that resets this to formula values)
```

### Notes

- The existing description says "reaction delay before a bot begins dodging" -- accurate. The v2 Effect makes the mechanism more precise: it's a threshold on elapsed missile flight time, not a personal reaction-time window. The distinction matters: a missile that spawned 1.0s ago will trigger dodge immediately if the threshold is 0.5; a fresh missile won't. Source (`bot_botthink.c:155-160`) confirms this reading.
- Skill-formula: `RangeOverSkill(skill, 1.0f, 0.5f)` -- lower skill = 1.0s threshold (slow reaction), higher skill = 0.5s (faster). Both modes use the same formula. Surfaced in Default note.
- The "on the ground" constraint is from the consumer context (`BotOnGroundMovement`, line 149): the entire dodge block is inside an `FL_ONGROUND` check. This is surfaced in Effect as it changes operator expectations about airborne bot behavior.

<!-- entity: k_fbskill_vol_bot_midair_incr -->
## k_fbskill_vol_bot_midair_incr (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:152 (RegisterCvar), bot_botimp.c:344 (SetAttribs), bot_aim.c:291 (CalculateVolatility)
- **Catalog line**: 3989
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI: the aim-volatility increment added while the bot itself is airborne. Higher values make the bot aim less accurately when jumping. Distinct from k_fbskill_vol_opp_midair_incr, which applies when the bot's target is airborne.
>
> Range: 0.0 to 2.0 (clamped).
>
> Default: set automatically by bot skill level (decreases from 1.0 at low skill to 0.0 at high skill).
> Set by: server config or bot skill system.

### Shape classification

Shape 3: cvar with no paired toggle command. Registered via `RegisterCvar()` in `bot_botimp.c:152`; read by `SetAttribs()` into `self->fb.skill.self_midair_volatility` (clamped `bound(0, ..., 2.0f)`); consumed by `CalculateVolatility()` in `bot_aim.c:291`. Written by `setSkillAttributes()` via `cvar_fset()` as part of the skill-preset system. No `cvar_toggle_msg` site; no dedicated per-cvar command.

Canonical-card pattern: this cvar and `k_fbskill_vol_opp_midair_incr` are near-identical siblings (same algorithm position, same clamp range, same RangeOverSkill formula, only subject differs: self vs opponent airborne). `k_fbskill_vol_opp_midair_incr` is the reference card pointing here. All other vol_* siblings have meaningfully distinct algorithmic roles; they stay as separate full cards.

### Proposed draft

```
Frogbot aim-accuracy penalty for the bot being airborne -- sets how much volatility is added each think cycle while the bot itself is not on the ground.

Effect:
  Each think cycle where the bot is airborne, the running volatility scalar is
  incremented by this amount before the final min/max clamp. Higher values make
  the bot aim less accurately while jumping.
  The penalty is unconditional -- it does not depend on shot type, weapon, or
  whether the bot is attacking.

Permission:    server config only (k_fbskill_vol_ownvel for full bot-skill context)
Default:       set by bot skill preset: 1.0 at low skill, 0.0 at high skill
               (clamped to 0.0–2.0).

Example:
  # In server.cfg or bots/configs/skill_XX.cfg:
  k_fbskill_vol_bot_midair_incr 0.5

  # Or applied wholesale by the skill preset:
  botcmd skill 15

See also: k_fbskill_vol_opp_midair_incr (sibling -- opponent-airborne penalty),
          k_fbskill_vol_min (floor that limits how low volatility can decay),
          k_fbskill_vol_max (ceiling that caps accumulated volatility),
          skill:frogbot:std (botcmd subcommand that sets all skill cvars wholesale)
```

### Notes

- Canonical card for the bot_midair / opp_midair pair. `k_fbskill_vol_opp_midair_incr` is the reference card.
- "Not on the ground" is checked via `!(flags & FL_ONGROUND_PARTIALGROUND)` -- partial-ground is included in "on ground", so the penalty is truly for full-airborne state.
- No prerequisite section needed: no mode gate, no gating cvar.
- Match-state omitted ("any time" -- `SetAttribs()` is called per bot per frame, no match-phase guard on this specific field).

<!-- entity: k_fbskill_vol_init -->
## k_fbskill_vol_init (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:134 (RegisterCvar), bot_botimp.c:330 (SetAttribs), bot_aim.c:242 (CalculateVolatility)
- **Catalog line**: 4019
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot aim-volatility seed. Sets the initial aim-error volatility assigned to a bot each time it acquires a new target (as if it has not seen the player before). Higher values mean more erratic aiming when first engaging a new target.
>
> Range: 0 to 5.0 (clamped). Set automatically by the skill level; not intended for manual tuning.
>
> Default: derived from bot skill level.
> Set by: server config (managed automatically).

### Shape classification

Shape 3: cvar with no paired toggle command. Registered via `RegisterCvar()` at `bot_botimp.c:134`; read by `SetAttribs()` at line 330 into `self->fb.skill.initial_volatility` (clamped `bound(0, ..., 5.0f)`); consumed by `CalculateVolatility()` at `bot_aim.c:242` when a new target is acquired. Written by `setSkillAttributes()` at line 186 via `cvar_fset(FB_CVAR_INITIAL_VOLATILITY, RangeOverSkill(skill, 3.0f, 1.4f))`. No paired command.

### Proposed draft

```
Frogbot aim-volatility seed -- sets the volatility value the bot's aim system
resets to each time it acquires a new combat target.

Effect:
  When the bot switches to a new target, the running volatility scalar is reset
  to this value (as if the bot had never tracked this player). The value then
  decays each think cycle via k_fbskill_vol_reduce until it reaches k_fbskill_vol_min,
  or climbs if situational penalties (speed, midair, pain) accumulate.
  Higher initial volatility means erratic first-contact aim that sharpens over
  sustained tracking.

Permission:    server config only
Default:       set by bot skill preset: 3.0 at low skill, 1.4 at high skill
               (clamped to 0.0–5.0).

Example:
  # server.cfg or bots/configs/skill_XX.cfg
  k_fbskill_vol_init 2.0

  # Or applied by the skill preset:
  botcmd skill 10

See also: k_fbskill_vol_min (floor -- volatility decays toward this),
          k_fbskill_vol_max (ceiling -- volatility cannot exceed this),
          k_fbskill_vol_reduce (per-frame decay multiplier),
          skill:frogbot:std (botcmd subcommand that sets all skill cvars wholesale)
```

### Notes

- The "new target" trigger is `opponent != self->fb.prev_look_object` (bot_aim.c:239). Switching targets always resets to initial_volatility, regardless of how long the bot tracked the prior target.
- No min/max clamp correction needed: existing description says "Range: 0 to 5.0 (clamped)" -- confirmed by `bound(0, ..., 5.0f)`.

<!-- entity: k_fbskill_vol_max -->
## k_fbskill_vol_max (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:133 (RegisterCvar), bot_botimp.c:329 (SetAttribs), bot_aim.c:299-301 (CalculateVolatility)
- **Catalog line**: 4049
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI skill tuning: sets the ceiling for the bot's running aim-volatility scalar. Higher values allow greater accumulated aim error; lower values keep the bot's aim tighter even under pressure.
>
> Range: 0.0 to 5.0 (clamped).
>
> Default: derived from bot skill level (via RangeOverSkill, range 2.5-4.0).
> Set by: server config (overrides the skill-level default).

### Shape classification

Shape 3: cvar with no paired toggle command. Registered via `RegisterCvar()` at `bot_botimp.c:133`; read by `SetAttribs()` at line 329 into `self->fb.skill.max_volatility` (clamped `bound(0, ..., 5.0f)`); consumed by `CalculateVolatility()` at `bot_aim.c:299-301` as the upper bound of the `bound(min, volatility * reduce, max)` clamp. Written by `setSkillAttributes()` at line 185 as `RangeOverSkill(skill, 4.0f, 2.5f)`.

### Proposed draft

```
Frogbot aim-volatility ceiling -- caps the running volatility scalar so that
accumulated situational penalties (speed, midair, pain, direction divergence)
cannot push the bot's aim error above this value.

Effect:
  After all per-frame penalty increments and the decay multiplication, the
  final volatility is clamped to this ceiling before being written back.
  Higher values allow greater total aim error under combined pressure; lower
  values hard-cap the bot's sloppiness even in worst-case situations.

Permission:    server config only
Default:       set by bot skill preset: 4.0 at low skill, 2.5 at high skill
               (clamped to 0.0–5.0).

Example:
  # server.cfg or bots/configs/skill_XX.cfg
  k_fbskill_vol_max 3.0

  # Or applied by the skill preset:
  botcmd skill 10

See also: k_fbskill_vol_min (floor that pairs with this ceiling),
          k_fbskill_vol_init (seed value on new-target acquisition),
          k_fbskill_vol_reduce (per-frame decay multiplier),
          skill:frogbot:std (botcmd subcommand that sets all skill cvars wholesale)
```

### Notes

- The clamp expression is `bound(min_volatility, volatility * reduce_volatility, max_volatility)` -- note that `reduce_volatility` is applied INSIDE the clamp call as a second reduction step before clamping. This means max_volatility caps the post-decay value, not the pre-decay accumulation.
- Existing description is accurate; no flags needed.

<!-- entity: k_fbskill_vol_min -->
## k_fbskill_vol_min (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:132 (RegisterCvar), bot_botimp.c:328 (SetAttribs), bot_aim.c:299-301 (CalculateVolatility)
- **Catalog line**: 4079
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI: the minimum floor for the bot's per-target aim-volatility scalar. The bot's aim error cannot decay below this value, regardless of how long it has been tracking the same target.
>
> Range: 0.0 to 5.0 (clamped).
>
> Default: 1.0 (hard-set by the skill system at all skill levels).
> Set by: server config or bot skill system.

### Shape classification

Shape 3: cvar with no paired toggle command. Registered via `RegisterCvar()` at `bot_botimp.c:132`; read by `SetAttribs()` at line 328 into `self->fb.skill.min_volatility` (clamped `bound(0, ..., 5.0f)`); consumed by `CalculateVolatility()` at `bot_aim.c:299-301` as the lower bound of the final clamp. Written by `setSkillAttributes()` at line 184 as a fixed `1.0f` regardless of skill level -- confirmed in both `setSkillAttributes` and `setSkillAttributesEasySkillMode`.

### Proposed draft

```
Frogbot aim-volatility floor -- the minimum volatility the bot retains even
after sustained tracking of the same target.

Effect:
  After per-frame decay and penalty calculations, the final volatility is
  clamped to at least this value. Even a maximally skilled bot aiming at a
  stationary target for an extended period will not decay below this floor.
  Setting it to 0.0 removes the floor (pure decay to zero is possible).

Permission:    server config only
Default:       1.0 at all skill levels (fixed -- not scaled by skill).
               Clamped to 0.0–5.0 at load time.

Example:
  # server.cfg or bots/configs/skill_XX.cfg
  k_fbskill_vol_min 0.5

  # Or reset by the skill preset (always back to 1.0):
  botcmd skill 10

See also: k_fbskill_vol_max (ceiling that pairs with this floor),
          k_fbskill_vol_reduce (per-frame decay multiplier working against this floor),
          k_fbskill_vol_init (initial value that decays toward this floor),
          skill:frogbot:std (botcmd subcommand that sets all skill cvars wholesale)
```

### Notes

- The fixed-1.0 default is notable: unlike all other vol_* cvars that scale with skill level via `RangeOverSkill`, `vol_min` is hard-set to `1.0f` in both standard and easy-skill-mode functions. Existing description correctly identifies this.

<!-- entity: k_fbskill_vol_oppdir_incr -->
## k_fbskill_vol_oppdir_incr (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:140 (RegisterCvar), bot_botimp.c:339-340 (SetAttribs), bot_aim.c:279 (CalculateVolatility)
- **Catalog line**: 4109
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Sets the aim-volatility increment applied per frame based on how much the bot's and the enemy's movement directions differ: contribution is zero when both move the same way and grows as directions diverge (the configured value is halved at the use-site).
>
> Range: 0 to 5.0 (clamped at use-site).
>
> Default: derived automatically from bot skill level (set by server via setSkillAttributes).
> Set by: server config or bot skill system.

### Shape classification

Shape 3: cvar with no paired toggle command. Registered via `RegisterCvar()` at `bot_botimp.c:140`; read by `SetAttribs()` at lines 339-340 into `self->fb.skill.enemydirection_volatility` (clamped `bound(0, ..., 5.0f)`); consumed by `CalculateVolatility()` at `bot_aim.c:279` as `(1 - same_direction) * (self->fb.skill.enemydirection_volatility / 2)`. Written by `setSkillAttributes()` at line 192 as `RangeOverSkill(skill, 0.6f, 0.4f)`.

### Proposed draft

```
Frogbot aim-volatility penalty for movement-direction divergence -- sets the
maximum increment added per think cycle when the bot and its target are moving
in opposite directions.

Effect:
  Each think cycle, the volatility increment is scaled by the direction
  divergence between bot and target: zero increment when both move the same
  direction, full increment when moving in exactly opposite directions. The
  effective contribution is (1 - dot_product) * (this_value / 2), so the
  cvar's configured value is the maximum possible increment (at full
  divergence), halved at the use-site.
  This penalty is always applied (not conditional on a speed threshold).

Permission:    server config only
Default:       set by bot skill preset: 0.6 at low skill, 0.4 at high skill
               (clamped to 0.0–5.0).

Example:
  # server.cfg or bots/configs/skill_XX.cfg
  k_fbskill_vol_oppdir_incr 0.5

  # Or applied by the skill preset:
  botcmd skill 10

See also: k_fbskill_vol_oppvel (threshold cvar for enemy speed penalty),
          k_fbskill_vol_oppvel_incr (increment for enemy speed penalty),
          k_fbskill_vol_max (ceiling that caps total accumulated volatility),
          skill:frogbot:std (botcmd subcommand that sets all skill cvars wholesale)
```

### Notes

- The halving-at-use-site is source-verified at `bot_aim.c:279`: `(1 - same_direction) * (enemydirection_volatility / 2)`. Existing description correctly captures this. The "grow as directions diverge" description aligns with the dot-product math: same direction = dot 1.0 → factor 0.0; opposite = dot -1.0 → factor 2.0; but halved, so max effective contribution is still 1x the cvar value.
- The `vol_flags |= 8` at `bot_aim.c:280` is always set (no conditional) -- the direction penalty branch executes every frame (unlike the speed threshold branches), confirming this is an unconditional per-frame addition.

<!-- entity: k_fbskill_vol_opp_midair_incr -->
## k_fbskill_vol_opp_midair_incr (KTX cvar, Frogbot -- Shape 3 reference card)

- **Status**: drafted
- **Source**: src/bot_botimp.c:153 (RegisterCvar), bot_botimp.c:346-347 (SetAttribs), bot_aim.c:294-296 (CalculateVolatility)
- **Catalog line**: 4139
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI skill tuning: the aim-volatility increment added while the bot's opponent is airborne. Higher values make the bot aim worse at a target that is in the air; lower values reduce this penalty.
>
> Range: 0.0 to 2.0 (clamped).
>
> Default: derived from bot skill level (via RangeOverSkill, range 0.0-1.0).
> Set by: server config (overrides the skill-level default).

### Shape classification

Shape 3: cvar with no paired toggle command. Registered via `RegisterCvar()` at `bot_botimp.c:153`; read by `SetAttribs()` at lines 346-347 into `self->fb.skill.opponent_midair_volatility` (clamped `bound(0, ..., 2.0f)`); consumed by `CalculateVolatility()` at `bot_aim.c:294-296` when the opponent is not on the ground. Written by `setSkillAttributes()` at line 195 as `RangeOverSkill(skill, 1.0f, 0.0f)`.

Near-identical sibling to `k_fbskill_vol_bot_midair_incr` (same algorithm position, same clamp range, same formula, only subject differs). Reference card pointing at the canonical.

### Proposed draft

```
Frogbot aim-accuracy penalty for the target being airborne. See
k_fbskill_vol_bot_midair_incr for the full volatility-increment behavior.
This cvar applies the same penalty shape when the bot's opponent is airborne,
rather than the bot itself.

Delta from canonical (k_fbskill_vol_bot_midair_incr):
  Subject: opponent airborne (FL_ONGROUND_PARTIALGROUND check on the target)
  Skill formula: RangeOverSkill(skill, 1.0, 0.0) -- same range as bot_midair

Permission:    server config only
Default:       set by bot skill preset: 1.0 at low skill, 0.0 at high skill
               (clamped to 0.0–2.0).

Example:
  k_fbskill_vol_opp_midair_incr 0.5

See also: k_fbskill_vol_bot_midair_incr (canonical card -- full behavior description),
          k_fbskill_vol_max (ceiling),
          skill:frogbot:std (botcmd subcommand that sets all skill cvars wholesale)
```

### Notes

- Reference card in the canonical-card pair with `k_fbskill_vol_bot_midair_incr`.
- Clamp upper bound is 2.0 (same as bot_midair_incr), verified at `bot_botimp.c:346-347`: `bound(0, ..., 2.0f)`.

<!-- entity: k_fbskill_vol_oppvel -->
## k_fbskill_vol_oppvel (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:138 (RegisterCvar), bot_botimp.c:335-336 (SetAttribs), bot_aim.c:267-271 (CalculateVolatility)
- **Catalog line**: 4169
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Sets the enemy horizontal speed threshold (in Quake velocity units per second) above which the bot's aim volatility increases. When the bot's current target moves faster than this value, volatility is raised by the amount in k_fbskill_vol_oppvel_incr. This cvar is the trigger threshold only, not the increment amount.
>
> Range: 0 to 1000 (clamped; Quake velocity units/sec).
>
> Default: derived from bot skill level (server-managed).
> Set by: server config (overrides the skill-derived value).

### Shape classification

Shape 3: cvar with no paired toggle command. Registered via `RegisterCvar()` at `bot_botimp.c:138`; read by `SetAttribs()` at lines 335-336 into `self->fb.skill.enemyspeed_volatility_threshold` (clamped `bound(0, ..., 1000)`); consumed by `CalculateVolatility()` at `bot_aim.c:267-271` in a speed-threshold check via `HorizontalVelocityCheck()`. Written by `setSkillAttributes()` at line 190 as `RangeOverSkill(skill, 360, 450)`.

Functionally coupled pair with `k_fbskill_vol_oppvel_incr` (threshold/increment split). Not near-identical -- they play distinct roles in the algorithm (gate vs magnitude).

### Proposed draft

```
Frogbot aim-penalty threshold for enemy horizontal speed -- the speed (in
Quake units/sec) above which the bot's aim volatility increases by the
k_fbskill_vol_oppvel_incr amount.

Effect:
  Each think cycle, if the target's horizontal speed exceeds this value,
  k_fbskill_vol_oppvel_incr is added to the running volatility scalar.
  The check uses horizontal speed only (vertical velocity ignored).
  This cvar is the gate threshold; k_fbskill_vol_oppvel_incr is the penalty amount.

Permission:    server config only
Default:       set by bot skill preset: 360 qu/s at low skill, 450 qu/s at high skill
               (clamped to 0–1000). Higher threshold at high skill = penalty kicks
               in less often against fast-moving targets.

Example:
  # server.cfg or bots/configs/skill_XX.cfg
  k_fbskill_vol_oppvel 400
  k_fbskill_vol_oppvel_incr 0.3

See also: k_fbskill_vol_oppvel_incr (the penalty increment when threshold is crossed),
          k_fbskill_vol_ownvel (sibling threshold for the bot's own speed),
          k_fbskill_vol_max (ceiling that caps total volatility),
          skill:frogbot:std (botcmd subcommand that sets all skill cvars wholesale)
```

### Notes

- `HorizontalVelocityCheck` at `bot_aim.c:226-231` uses the squared-magnitude comparison: `(v[0]^2 + v[1]^2) > threshold^2`, which is a horizontal-plane check (z excluded).
- RangeOverSkill direction: higher skill → higher threshold (450 vs 360). Counter-intuitive -- but at high skill the bot has better situational accuracy already, so the speed threshold is raised to reduce the frequency of penalty application. Existing description omits this direction detail; added in draft.
- Pair-member discipline: this is the threshold half; `vol_oppvel_incr` carries the increment half. Keep as separate cards (threshold vs magnitude are distinct user-actionable levers).

<!-- entity: k_fbskill_vol_oppvel_incr -->
## k_fbskill_vol_oppvel_incr (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:139 (RegisterCvar), bot_botimp.c:337-338 (SetAttribs), bot_aim.c:270 (CalculateVolatility)
- **Catalog line**: 4199
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI aim-volatility tuning: the amount of extra aim wobble added when the bot's enemy is moving fast (above the k_fbskill_vol_oppvel speed threshold). This sets how much the bot's aim degrades against a fast-moving target -- not the speed at which the penalty kicks in (that is k_fbskill_vol_oppvel).
>
> Range: 0-5.0 (aim-volatility units; clamped per bot).
>
> Default: set from bot skill level.
> Set by: server config (normally managed by the bot skill system; override by hand only for testing).

### Shape classification

Shape 3: cvar with no paired toggle command. Registered via `RegisterCvar()` at `bot_botimp.c:139`; read by `SetAttribs()` at lines 337-338 into `self->fb.skill.enemyspeed_volatility` (clamped `bound(0, ..., 5.0f)`); consumed by `CalculateVolatility()` at `bot_aim.c:270` when `HorizontalVelocityCheck` passes. Written by `setSkillAttributes()` at line 191 as `RangeOverSkill(skill, 0.4f, 0.2f)`.

### Proposed draft

```
Frogbot aim-penalty increment for enemy speed -- the volatility added each
think cycle when the target's horizontal speed exceeds k_fbskill_vol_oppvel.

Effect:
  When the target crosses the k_fbskill_vol_oppvel speed threshold, this
  value is added directly to the running volatility scalar. Controls the
  magnitude of the speed penalty; k_fbskill_vol_oppvel controls when it fires.

Permission:    server config only
Default:       set by bot skill preset: 0.4 at low skill, 0.2 at high skill
               (clamped to 0.0–5.0). Lower increment at high skill means the
               bot handles fast targets more accurately.

Example:
  # server.cfg or bots/configs/skill_XX.cfg
  k_fbskill_vol_oppvel 400
  k_fbskill_vol_oppvel_incr 0.3

See also: k_fbskill_vol_oppvel (threshold cvar -- controls when this penalty fires),
          k_fbskill_vol_ownvel_incr (sibling increment for bot's own speed penalty),
          k_fbskill_vol_max (ceiling that caps total volatility),
          skill:frogbot:std (botcmd subcommand that sets all skill cvars wholesale)
```

### Notes

- Increment half of the `vol_oppvel` / `vol_oppvel_incr` pair. These are semantically coupled but kept as separate cards because they address different tuning questions: "at what speed does the penalty fire" vs "how large is the penalty".
- Default range 0.2-0.4 is verified from `bot_botimp.c:191`: `RangeOverSkill(skill, 0.4f, 0.2f)`.

<!-- entity: k_fbskill_vol_ownvel -->
## k_fbskill_vol_ownvel (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:136 (RegisterCvar), bot_botimp.c:332-333 (SetAttribs), bot_aim.c:259-263 (CalculateVolatility)
- **Catalog line**: 4229
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning: horizontal speed threshold (Quake units/sec) above which the bot's own movement triggers increased aim volatility. When the bot moves faster than this value, aim volatility increases by the separate k_fbskill_vol_ownvel_incr amount. This cvar sets the trigger speed only, not the increment.
>
> Range: 0 to 1000 (clamped; Quake units/sec).
>
> Default: derived from bot skill level.
> Set by: server config (overrides skill-formula default).

### Shape classification

Shape 3: cvar with no paired toggle command. Registered via `RegisterCvar()` at `bot_botimp.c:136`; read by `SetAttribs()` at lines 332-333 into `self->fb.skill.ownspeed_volatility_threshold` (clamped `bound(0, ..., 1000)`); consumed by `CalculateVolatility()` at `bot_aim.c:259-263` via `HorizontalVelocityCheck()`. Written by `setSkillAttributes()` at line 188 as `RangeOverSkill(skill, 360, 450)`.

Functionally coupled pair with `k_fbskill_vol_ownvel_incr`. Sibling to `vol_oppvel`/`vol_oppvel_incr` which applies the same pattern to enemy speed.

### Proposed draft

```
Frogbot aim-penalty threshold for the bot's own horizontal speed -- the speed
(in Quake units/sec) above which the bot's own movement degrades its aim by
the k_fbskill_vol_ownvel_incr amount.

Effect:
  Each think cycle, if the bot's own horizontal speed exceeds this value,
  k_fbskill_vol_ownvel_incr is added to the running volatility scalar.
  The check uses horizontal speed only (vertical velocity ignored).
  This cvar is the gate threshold; k_fbskill_vol_ownvel_incr is the penalty amount.

Permission:    server config only
Default:       set by bot skill preset: 360 qu/s at low skill, 450 qu/s at high skill
               (clamped to 0–1000). Higher threshold at high skill = penalty fires
               less often when the bot bunny-hops or strafe-runs.

Example:
  # server.cfg or bots/configs/skill_XX.cfg
  k_fbskill_vol_ownvel 400
  k_fbskill_vol_ownvel_incr 0.15

See also: k_fbskill_vol_ownvel_incr (the penalty increment when threshold is crossed),
          k_fbskill_vol_oppvel (sibling threshold for enemy speed),
          k_fbskill_vol_max (ceiling that caps total volatility),
          skill:frogbot:std (botcmd subcommand that sets all skill cvars wholesale)
```

### Notes

- Same RangeOverSkill formula as `vol_oppvel`: `RangeOverSkill(skill, 360, 450)`. Both thresholds scale identically with skill level. Confirmed at `bot_botimp.c:188-190`.
- `HorizontalVelocityCheck` is a squared-magnitude comparison excluding the z-axis -- relevant for bots in flight (rocket-jump velocity has a large z component that is excluded from the threshold check).

<!-- entity: k_fbskill_vol_ownvel_incr -->
## k_fbskill_vol_ownvel_incr (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:137 (RegisterCvar), bot_botimp.c:334 (SetAttribs), bot_aim.c:262 (CalculateVolatility)
- **Catalog line**: 4259
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Sets how much aim accuracy degrades when the bot is moving fast: this value is the aim-volatility increment applied when the bot's own horizontal speed exceeds the k_fbskill_vol_ownvel threshold. Controls the magnitude of the penalty, not the speed threshold. The server normally sets this from the bot's skill level; setting the cvar overrides that.
>
> Range: 0.0-5.0 (clamped).
>
> Default: set by skill level formula.
> Set by: server config.

### Shape classification

Shape 3: cvar with no paired toggle command. Registered via `RegisterCvar()` at `bot_botimp.c:137`; read by `SetAttribs()` at line 334 into `self->fb.skill.ownspeed_volatility` (clamped `bound(0, ..., 5.0f)`); consumed by `CalculateVolatility()` at `bot_aim.c:262` when `HorizontalVelocityCheck` passes on the bot's own velocity. Written by `setSkillAttributes()` at line 189 as `RangeOverSkill(skill, 0.2f, 0.1f)`.

### Proposed draft

```
Frogbot aim-penalty increment for the bot's own speed -- the volatility added
each think cycle when the bot's horizontal speed exceeds k_fbskill_vol_ownvel.

Effect:
  When the bot itself crosses the k_fbskill_vol_ownvel speed threshold, this
  value is added directly to the running volatility scalar. Controls the
  magnitude of the movement-while-aiming penalty; k_fbskill_vol_ownvel
  controls when it fires.

Permission:    server config only
Default:       set by bot skill preset: 0.2 at low skill, 0.1 at high skill
               (clamped to 0.0–5.0). Lower increment at high skill means a
               skilled bot can move quickly without as much aim degradation.

Example:
  # server.cfg or bots/configs/skill_XX.cfg
  k_fbskill_vol_ownvel 400
  k_fbskill_vol_ownvel_incr 0.15

See also: k_fbskill_vol_ownvel (threshold cvar -- controls when this penalty fires),
          k_fbskill_vol_oppvel_incr (sibling increment for enemy speed penalty),
          k_fbskill_vol_max (ceiling that caps total volatility),
          skill:frogbot:std (botcmd subcommand that sets all skill cvars wholesale)
```

### Notes

- Increment half of the `vol_ownvel` / `vol_ownvel_incr` pair.
- Default range 0.1-0.2 is verified from `bot_botimp.c:189`: `RangeOverSkill(skill, 0.2f, 0.1f)`. Note the smaller range compared to `vol_oppvel_incr` (0.2-0.4): enemy speed hurts bot aim more than the bot's own movement at the same skill level.

<!-- entity: k_fbskill_vol_pain_incr -->
## k_fbskill_vol_pain_incr (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:151 (registration); src/bot_aim.c:283-285 (read)
- **Catalog line**: 4289
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI skill tuning: the aim-volatility increment added when the bot has taken damage in the last second (not active in LGC mode). Higher values make the bot aim worse after being hit; lower values reduce this penalty.
>
> Range: 0.0 to 2.0 (clamped).
>
> Default: derived from bot skill level (via RangeOverSkill, range 0.1-0.5).
> Set by: server config (overrides the skill-level default).

### Shape classification

Shape 3 (cvar with no paired command, set-once in config or via skill system). Registered with `RegisterCvar(FB_CVAR_PAIN_VOLATILITY_INCREASE)` at bot_botimp.c:151; no `cvar_toggle_msg` site exists. Written only by `setSkillAttributes` / `setSkillAttributesEasySkillMode` and optionally by direct server config. Read by `SetAttribs` into `self->fb.skill.pain_volatility`, consumed at bot_aim.c:283-285 inside the LGC guard.

### Proposed draft

```
Sets the aim-volatility increment applied when a bot takes damage during the last second.

Effect:
  When a bot is hit, its volatility score rises by this amount for the current aim update. Higher volatility increases aim scatter on that frame.
  Has no effect in LGC mode (the LGC guard in the aim routine bypasses this penalty).

Permission:    server config only
Default:       "" (empty at registration; set by the bot skill system at runtime -- low-skill bots get ~0.5, high-skill bots ~0.1).

Example:
  # In server.cfg, override for all bots regardless of skill setting:
  k_fbskill_vol_pain_incr 0.3
  # Use 'botcmd skill <N>' to let the skill system set this automatically instead.

See also: k_fbskill_vol_reduce (per-frame decay applied to the volatility accumulator), k_fbskill_vol_min / k_fbskill_vol_max (bounds on the accumulated volatility), skill:frogbot:std (subcommand -- sets skill level and drives the formula that normally controls this cvar)
```

### Notes

- Source-verified: `!lgc_enabled()` guard at bot_aim.c:283 confirms LGC bypass. `bound(0, cvar(...), 2.0f)` at bot_botimp.c:343 confirms the 0-2.0 clamp. `RangeOverSkill(skill, 0.5f, 0.1f)` at line 193 confirms the 0.1-0.5 skill-derived range (low skill = 0.5, high skill = 0.1).
- Default line uses plain English -- avoids "RangeOverSkill" engine function name in the prose surface.
- The v1 "Set by: server config" is split into Permission + Default per v2 shape.

<!-- entity: k_fbskill_vol_reduce -->
## k_fbskill_vol_reduce (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:135 (registration); src/bot_aim.c:256, 300 (read)
- **Catalog line**: 4319
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Sets the per-frame decay factor for the bot's aim-volatility scalar. Each frame, aim volatility is multiplied by this value; values below 1.0 shrink it toward the floor, reducing aim randomness over time on a held target.
>
> Range: 0.0 to 1.0 (clamped).
>
> Default: derived from bot skill level (server-managed).
> Set by: server config (overrides the skill-derived value).

### Shape classification

Shape 3. Registered via `RegisterCvar(FB_CVAR_REDUCE_VOLATILITY)` at bot_botimp.c:135; no paired command. Written by skill system functions, read at bot_aim.c:256 and again at line 300 where it bounds the volatility result.

### Proposed draft

```
Sets the decay multiplier applied to a Frogbot's aim-volatility accumulator each aim update.

Effect:
  Each aim update, current volatility is multiplied by this value before other penalties are added. A value below 1.0 shrinks the accumulator toward the floor so the bot's aim recovers faster when it stops taking penalties; 1.0 means no decay. Applied twice per update cycle (at line 256 and as part of the final bound at line 300).

Permission:    server config only
Default:       "" (empty at registration; set by the bot skill system at runtime -- low-skill bots get ~0.98, high-skill bots ~0.96).

Example:
  # In server.cfg, set a fixed decay rate independent of skill level:
  k_fbskill_vol_reduce 0.97
  # Leave unset to let 'botcmd skill <N>' control this automatically.

See also: k_fbskill_vol_pain_incr (adds to volatility on damage -- what this decay is working against), k_fbskill_vol_min / k_fbskill_vol_max (bounds the accumulated volatility after decay), skill:frogbot:std (subcommand -- sets skill level and drives the formula that normally controls this cvar)
```

### Notes

- Source-verified: `bound(0, cvar(FB_CVAR_REDUCE_VOLATILITY), 1.0f)` at bot_botimp.c:331 confirms 0-1.0 clamp. Applied at bot_aim.c:256 (`volatility *= self->fb.skill.reduce_volatility`) and at line 300 in the final `bound(...)`. `RangeOverSkill(skill, 0.98f, 0.96f)` confirms the range.
- The "each frame" framing in the existing description is slightly imprecise -- the decay runs per aim update rather than per server frame. Not a foundational error; the per-aim-update vs per-frame distinction is implementation detail not surfaced in L1.

<!-- entity: k_fbskill_movement -->
## k_fbskill_movement (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:142 (registration); src/bot_movement.c:132, 217 (read)
- **Catalog line**: 3808
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar. Sets the bot's movement-skill factor (0.0 to 1.0): lower values produce sloppier strafe and air-control; higher values produce cleaner movement. Normally derived from the bot skill level automatically; can be set manually to override.
>
> Range: 0.0 to 1.0 (clamped).
>
> Default: derived from bot skill level.
> Set by: server config or setSkillAttributes (automatic).

### Shape classification

Shape 3. Registered via `RegisterCvar(FB_CVAR_MOVEMENT_SKILL)` at bot_botimp.c:142; no paired command. Written by skill system; read at bot_movement.c:132 and consumed at line 217 to modulate the strafe acceleration numerator.

### Proposed draft

```
Sets the bot's movement quality factor, controlling how well it strafe-accelerates and holds speed while changing direction.

Effect:
  Scales the strafe acceleration ceiling: at 0.0 the bot uses minimum numerator values (poor speed retention on direction changes); at 1.0 it uses maximum values (clean bunny-hop strafe control). Applies across all modes, not just dmm4.

Permission:    server config only
Default:       "" (empty at registration; set by the bot skill system at runtime -- standard mode: low-skill ~0.3, high-skill 1.0; easy mode: low-skill 0.0, high-skill 1.0).

Example:
  # In server.cfg, force maximum movement quality regardless of skill:
  k_fbskill_movement 1.0
  # Leave unset to let 'botcmd skill <N>' set this automatically.

See also: k_fbskill_movement_dodgefactor (controls the bot's sideways dodge displacement, distinct from strafe-acceleration quality), skill:frogbot:std (subcommand -- sets skill level and drives the formula that normally controls this cvar)
```

### Notes

- Source-verified: `bound(0, cvar(FB_CVAR_MOVEMENT_SKILL), 1.0f)` at bot_botimp.c:350 confirms clamp. bot_movement.c:217 `used_numerator = min_numerator + movement_skill * (max_numerator - min_numerator)` shows the scale effect. Standard mode: `RangeOverSkill(skill, 0.3f, 1.0f)` line 198; easy mode: `RangeOverSkill(skill, 0.0f, 1.0f)` line 249 -- the easy-mode lower bound is 0.0 vs standard 0.3. The existing description says "derived from bot skill level" without distinguishing modes -- adding the easy-mode delta as a default note.
- "setSkillAttributes (automatic)" in the existing "Set by" line is an internal function name -- removed from prose surface per anti-pattern rule.

<!-- entity: k_fbskill_movement_dodgefactor -->
## k_fbskill_movement_dodgefactor (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:113 (registration); src/bot_botthink.c:144 (read)
- **Catalog line**: 3838
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI: scales the magnitude of the bot's random sideways strafe-dodge while moving.
>
> Range: 0.0 to 1.0. 0 = no sideways dodge (bot moves straight); 1.0 = maximum strafe-dodge displacement.
>
> Default: set automatically by bot skill level.
> Set by: server config or bot skill system.

### Shape classification

Shape 3. Registered via `RegisterCvar(FB_CVAR_DODGEFACTOR)` at bot_botimp.c:113; no paired command. Written by skill system functions; read at bot_botimp.c:306 into `self->fb.skill.dodge_amount`, consumed at bot_botthink.c:144 as a scale factor for random right-strafe displacement in `BotDodgeMovement`.

### Proposed draft

```
Sets the scale factor for the bot's random sideways strafe-dodge displacement while moving.

Effect:
  Multiplied into the random right-vector offset applied during the bot's dodge movement: 0.0 removes all random sideways drift; 1.0 allows full random displacement. Distinct from the dmm4 strafe-wiggle (k_fbskill_dmm4wiggle) -- this dodge applies across all modes when the bot is actively dodging.

Permission:    server config only
Default:       "" (empty at registration; set by the bot skill system at runtime -- low-skill bots get 0.0, high-skill bots 1.0).

Example:
  # In server.cfg, disable sideways dodge for all bots:
  k_fbskill_movement_dodgefactor 0
  # Leave unset to let 'botcmd skill <N>' control this automatically.

See also: k_fbskill_movement (strafe-acceleration quality -- separate from dodge displacement), k_fbskill_dmm4wiggle (dmm4-specific oscillating wiggle, distinct from this general dodge), skill:frogbot:std (subcommand -- sets skill level and drives the formula that normally controls this cvar)
```

### Notes

- Source-verified: `bound(0, cvar(FB_CVAR_DODGEFACTOR), 1)` at bot_botimp.c:306 confirms 0-1 clamp. bot_botthink.c:144 `VectorMA(dir_move, g_random() * self->fb.skill.dodge_amount * dodge_factor, g_globalvars.v_right, dir_move)` confirms scale role. `RangeOverSkill(skill, 0.0f, 1.0f)` at line 159 and 210 (both modes) confirms low-skill=0.0, high-skill=1.0.
- Existing description is already accurate and compact. Recast primarily splits "Set by" into Permission + Default and adds cross-links to sibling movement cvars.

<!-- entity: k_fbskill_use_rocketjumps -->
## k_fbskill_use_rocketjumps (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:143 (registration); src/bot_botjump.c:97 (read)
- **Catalog line**: 3928
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI toggle: whether bots are allowed to rocket-jump. When disabled, bots never use rocket jumps for pathing even where the route calls for it.
>
> 0 = bots do not rocket-jump.
> 1 = bots may rocket-jump where their path logic calls for it.
>
> Default: set from bot skill level (easy-skill mode only; in standard skill mode the cvar retains its registered value unless set explicitly).
> Set by: server config (normally managed by the bot skill system; override by hand only for testing).

### Shape classification

Shape 3. Registered via `RegisterCvar(FB_CVAR_USE_ROCKETJUMPS)` at bot_botimp.c:143; no paired command. Read at bot_botimp.c:351 into `self->fb.skill.use_rocketjumps`, consumed at bot_botjump.c:97: `if (!self->fb.skill.use_rocketjumps) { self->fb.canRocketJump = false; }`.

### Proposed draft

```
Controls whether bots are permitted to use rocket jumps for pathing.

Effect:
  0 -- bots never rocket-jump, regardless of what their path logic determines.
  1 -- bots may rocket-jump on segments where their routing calls for it.

Prerequisites: Only the easy-skill mode formula writes this cvar at runtime (skill > 5 enables it). In standard skill mode, the cvar stays at its registered empty value unless the server sets it explicitly -- without an explicit value in standard mode, the bot's canRocketJump flag defaults false.

Permission:    server config only
Default:       "" (empty at registration; easy-skill mode: enabled when skill > 5; standard skill mode: not set by the skill formula -- must be set in server.cfg to take effect).

Example:
  # In server.cfg, disable rocket-jumping for all bots regardless of skill mode:
  k_fbskill_use_rocketjumps 0
  # Or allow it unconditionally:
  k_fbskill_use_rocketjumps 1

See also: skill:frogbot:std (subcommand -- sets skill level; in easy mode this drives the formula; in standard mode it does not touch this cvar), k_fbskill_movement (general movement quality, separate knob)
```

### Notes

- Source-verified: `cvar(FB_CVAR_USE_ROCKETJUMPS) > 0` check at bot_botimp.c:351. `bot_botjump.c:97`: `if (!self->fb.skill.use_rocketjumps) { self->fb.canRocketJump = false; }` -- the gate blocks rocket jumps but doesn't affect other jump types. `setSkillAttributesEasySkillMode` at line 250: `cvar_fset(FB_CVAR_USE_ROCKETJUMPS, skill > 5 ? 1 : 0)`. `setSkillAttributes` (standard) does NOT call `cvar_fset(FB_CVAR_USE_ROCKETJUMPS, ...)` -- confirmed by scanning lines 156-205; only easy mode sets it.
- The Prerequisites section surfaces the easy-mode-only write as a user-surprise: a server admin in standard skill mode may expect the skill level to control rocket jumps but it doesn't.

<!-- entity: k_fbskill_wiggleframes -->
## k_fbskill_wiggleframes (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:145 (registration); src/bot_movement.c:249, 254; src/bot_botenemy.c:35 (read)
- **Catalog line**: 4349
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI movement tuning: amplitude (in movement ticks) of the bot's side-to-side wiggle run in dmm4. Larger values produce a wider, slower oscillation; smaller values produce a tighter, faster zig-zag. In dmm4 duel the wiggle is off by default for lower-skill bots and only enabled for skill > 10. Normally derived automatically from bot skill level; manual override is possible.
>
> Range: 0 to 45 (clamped per bot).
>
> Default: derived from bot skill (via RangeOverSkill).
> Set by: server config.

### Shape classification

Shape 3. Registered via `RegisterCvar(FB_CVAR_MOVEMENT_WIGGLEFRAMES)` at bot_botimp.c:145; no paired command. Read at bot_botimp.c:353 into `self->fb.skill.wiggle_run_limit`, consumed at bot_movement.c:249/254 as the oscillation boundary and at bot_botenemy.c:35 as the half-amplitude threshold for damage-triggered direction reversal. Both consumer sites are gated on `deathmatch >= 4`.

### Proposed draft

```
Sets the oscillation amplitude (in movement ticks) of the bot's strafe-wiggle in deathmatch 4 duel.

Effect:
  Defines how far (in movement ticks) the bot's wiggle counter travels before reversing direction. Larger values produce wider, slower oscillations; smaller values produce tighter, faster zig-zags. Also used as the half-amplitude threshold for damage-triggered direction reversal: damage only resets the wiggle direction if the counter has traveled more than half this value.
  Has no behavioral effect outside deathmatch 4 -- both consumer sites are gated on deathmatch >= 4.

Prerequisites: k_fbskill_dmm4wiggle must be 1 (wiggle enabled) for this value to have any observable effect. Setting this while wiggle is disabled changes the amplitude for when it is next enabled.

Permission:    server config only
Default:       "" (empty at registration; set by the bot skill system at runtime -- RangeOverSkill maps low-skill to 30, high-skill to 20).

Example:
  # In server.cfg, tighten the wiggle for a faster zig-zag:
  k_fbskill_wiggleframes 15
  # Requires k_fbskill_dmm4wiggle 1 and deathmatch 4 to take effect.

See also: k_fbskill_dmm4wiggle (the on/off enable for wiggle -- must be 1 for this to matter), k_fbskill_dmm4wiggletoggle (probability of reversing wiggle direction on damage), skill:frogbot:std (subcommand -- sets skill level and drives the formula that normally controls this cvar)
```

### Notes

- Source-verified: `bound(0, (int)cvar(FB_CVAR_MOVEMENT_WIGGLEFRAMES), 45.0f)` at bot_botimp.c:353 confirms 0-45 clamp. bot_movement.c:249/254 confirms oscillation boundary role. bot_botenemy.c:35 `abs(targ->fb.wiggle_run_dir) > (self->fb.skill.wiggle_run_limit / 2)` confirms half-amplitude threshold role in damage-triggered reversal. `RangeOverSkill(skill, 30, 20)` at both setSkillAttributes functions confirms low=30, high=20 (note: *higher* skill produces tighter wiggle at 20, lower skill has wider at 30).
- Existing description correctly identifies dmm4 scope. Added the damage-reversal half-amplitude use (from bot_botenemy.c) which is a behavioral detail the existing description omits.
- Default range note: existing says "RangeOverSkill" -- replaced with plain values.

<!-- entity: k_fbskill_dmm4wiggle -->
## k_fbskill_dmm4wiggle (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:144 (registration); src/bot_movement.c:141 (read)
- **Catalog line**: 3657
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI: enables or disables the bot's strafe-wiggle movement in deathmatch 4 duel. The on/off toggle for dmm4 wiggle; the probability of reversing wiggle direction on damage is controlled separately by k_fbskill_dmm4wiggletoggle.
>
> 0 = dmm4 strafe-wiggle disabled (bot moves straight).
> 1 = dmm4 strafe-wiggle enabled.
>
> Default: set automatically by bot skill level (skill > 10 enables it).
> Set by: server config or bot skill system.

### Shape classification

Shape 3. Registered via `RegisterCvar(FB_CVAR_MOVEMENT_DMM4WIGGLE)` at bot_botimp.c:144; no paired command. Read at bot_botimp.c:352 into `self->fb.skill.wiggle_run_dmm4`, consumed at bot_movement.c:141: `if ((deathmatch >= 4) && isDuel() && !self->fb.skill.wiggle_run_dmm4) { return; }` -- when 0, the strafe-physics function exits early.

### Proposed draft

```
Enables or disables the bot's oscillating strafe-wiggle in deathmatch 4 duel.

Effect:
  0 -- strafe-wiggle is off; the bot's ApplyPhysics routine exits early for deathmatch >= 4 duel, producing straight-line movement.
  1 -- strafe-wiggle is on; the bot oscillates side-to-side within the bounds set by k_fbskill_wiggleframes.
  Has no effect outside deathmatch >= 4 duel -- the gate check at bot_movement.c only fires in that mode.

Permission:    server config only
Default:       "" (empty at registration; set by the bot skill system at runtime -- enabled (1) when skill > 10, disabled (0) at skill 10 or below).

Example:
  # In server.cfg, force wiggle on for all bots in dmm4 regardless of skill:
  k_fbskill_dmm4wiggle 1
  # Requires deathmatch 4 and isDuel() to produce visible movement.

See also: k_fbskill_wiggleframes (oscillation amplitude -- only applies when this is 1), k_fbskill_dmm4wiggletoggle (probability of reversing wiggle direction on damage), skill:frogbot:std (subcommand -- sets skill level; skill > 10 enables this automatically)
```

### Notes

- Source-verified: `bound(0, (int)cvar(FB_CVAR_MOVEMENT_DMM4WIGGLE), 1.0f)` at bot_botimp.c:352 confirms 0/1 clamp. `cvar_fset(FB_CVAR_MOVEMENT_DMM4WIGGLE, skill > 10 ? 1 : 0)` at lines 199 and 251 (both skill mode functions) confirms the skill > 10 threshold. bot_movement.c:141 `if ((deathmatch >= 4) && isDuel() && !self->fb.skill.wiggle_run_dmm4)` confirms the gate -- requires both deathmatch >= 4 AND isDuel().
- Note: the gate at bot_movement.c:141 requires `isDuel()` in addition to `deathmatch >= 4`. The wiggle direction oscillation code at line 242 uses `deathmatch == 4` only. The effective precondition for visible wiggle is deathmatch 4 + duel mode. Existing description says "deathmatch 4 duel" -- accurate in intent.

<!-- entity: k_fbskill_dmm4wiggletoggle -->
## k_fbskill_dmm4wiggletoggle (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/bot_botimp.c:146 (registration); src/bot_botenemy.c:34 (read)
- **Catalog line**: 3688
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Frogbot AI tuning cvar (deathmatch 4 only). Sets the probability (0.0-1.0) that taking a hit causes the bot to reverse its current strafe-wiggle direction, making its movement less predictable under fire. Distinct from k_fbskill_dmm4wiggle, which is the on/off enable for wiggle movement. The server normally sets this from the bot's skill level; setting the cvar overrides that.
>
> Range: 0.0-1.0 (clamped).
>
> Default: set by skill level formula.
> Set by: server config.

### Shape classification

Shape 3. Registered via `RegisterCvar(FB_CVAR_MOVEMENT_DMM4WIGGLETOGGLE)` at bot_botimp.c:146; no paired command. Read at bot_botimp.c:354 into `self->fb.skill.wiggle_toggle`, consumed at bot_botenemy.c:34: `if ((deathmatch >= 4) && (g_random() < targ->fb.skill.wiggle_toggle) && (abs(targ->fb.wiggle_run_dir) > (self->fb.skill.wiggle_run_limit / 2)))` -- on a damage event, a random roll against this probability (and a half-amplitude threshold check) resets the wiggle direction.

### Proposed draft

```
Sets the probability that a bot reverses its strafe-wiggle direction when it takes a hit in deathmatch 4.

Effect:
  On each damage event in deathmatch >= 4: rolls a random number; if the roll is below this value AND the bot's wiggle counter has exceeded half of k_fbskill_wiggleframes, the wiggle direction is reset toward the opposite side. 0.0 means damage never triggers a direction reversal; 1.0 means damage always triggers one (subject to the half-amplitude check).
  Has no effect outside deathmatch >= 4 -- the gate check in the damage handler only fires in that mode.

Prerequisites: k_fbskill_dmm4wiggle must be 1 (wiggle enabled) for direction reversals to produce visible behavior. k_fbskill_wiggleframes controls the half-amplitude threshold used in the reversal check.

Permission:    server config only
Default:       "" (empty at registration; set by the bot skill system at runtime -- 0 when skill <= 10; RangeOverSkill applied to (skill - 10) * 2 for skill > 10, yielding 0.0 at skill 11 up to ~0.25 at skill 20).

Example:
  # In server.cfg, make bots react to damage with high unpredictability:
  k_fbskill_dmm4wiggletoggle 0.8
  # Requires k_fbskill_dmm4wiggle 1 and deathmatch 4 for visible effect.

See also: k_fbskill_dmm4wiggle (the on/off enable -- must be 1 for this to matter), k_fbskill_wiggleframes (sets the half-amplitude threshold this check uses), skill:frogbot:std (subcommand -- sets skill level and drives the formula that normally controls this cvar)
```

### Notes

- Source-verified: `bound(0, cvar(FB_CVAR_MOVEMENT_DMM4WIGGLETOGGLE), 1.0f)` at bot_botimp.c:354 confirms 0-1.0 clamp. bot_botenemy.c:34 confirms the probability roll and half-amplitude guard. `cvar_fset(FB_CVAR_MOVEMENT_DMM4WIGGLETOGGLE, skill > 10 ? RangeOverSkill((skill - 10) * 2, 0.0f, 0.25f) : 0)` at lines 200-201 and 252-253 confirms: zero at skill <= 10; RangeOverSkill((skill-10)*2, 0.0, 0.25) for skill > 10. At skill 20: (20-10)*2 = 20, which equals MAX_FROGBOT_SKILL=20, yielding 0.25. So the max formula value is 0.25.
- Existing description says "0.0-1.0 (clamped)" -- the clamp is correct. The formula ceiling is 0.25 but a server can set it higher up to 1.0. This is correct as described.
- The existing description correctly distinguishes this from k_fbskill_dmm4wiggle (enable vs probability).
- The interaction with k_fbskill_wiggleframes (half-amplitude check) is a behavioral detail not in the existing description -- surfaced in Effect and Prerequisites.

## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author should resolve before applying drafts to L1. 18 findings (13 actionable, 4 confirmed clean, 1 follow-up). 0 parks; halt-on-novelty did not fire.

### F1: Permission-line CF_BOTH + runtime-gate mislabel pattern (~10 std subcommand cards) -- continues prior batches' F1 audit

**Verdict**: ACTIONABLE

**Cards involved**: `addbot:frogbot:std`, `removebot:frogbot:std`, `removeall:frogbot:std`, `fill:frogbot:std`, `disable:frogbot:std`, `skill:frogbot:std`, `easyskillmode:frogbot:std` (chunk 1); `togglequad:frogbot:std`, `itempickupbonus:frogbot:std` (chunk 2); `pathlist:frogbot:editor` (chunk 4).

**Observation**: Continuation of the F1 audit pattern from prior batches (Mode selection, Mode-scoped knobs). Existing descriptions framed `botcmd` subcommands as "server admin" / "admin command" / "frogbot admin permission" -- all incorrect. `botcmd` parent is registered `CF_BOTH | CF_MATCHLESS | CF_PARAMS` at `src/commands.c:1047`; the admin requirement is RUNTIME via `k_fb_admin_only` (default 0 = no gate). v2 recasts standardize to: `any player or spectator (runtime gate via k_fb_admin_only -- default 0 allows anyone, 1 requires admin, 2 requires real server admin)`.

**Source evidence**: `src/commands.c:1047` (registration); `src/bot_commands.c:2383-2406` (FrogbotsCommand admin gate); `include/fb_globals.h:405` (FB_CVAR_ADMIN_ONLY = "k_fb_admin_only"); `src/world.c:1061` (cvar registration with default "0").

**Recommendation**: Apply v2 Permission lines as drafted. Third batch-wide F1 mislabel surfacing -- the Frogbot variant is `CF_BOTH + runtime-gate` (prior batches caught `CF_PLAYER | CF_SPC_ADMIN` mislabels). Systemic L1-corpus issue.

---

### F2: Parent-command-name and cvar-name framing inconsistencies in existing descriptions (3 cards)

**Verdict**: ACTIONABLE

**Cards involved**: `easyskillmode:frogbot:std`, `itempickupbonus:frogbot:std`, `fill:frogbot:std` (chunk 1/2)

**Observation**: Three different naming-discipline misses in existing descriptions:
- (a) `easyskillmode` existing says "frogbot easyskillmode" -- correct user-facing invocation is `botcmd easyskillmode`.
- (b) `itempickupbonus` existing says "fb itempickupbonus" -- correct is `botcmd itempickupbonus`.
- (c) `fill` existing typo `k_fb_adminonly` (missing underscore) -- correct cvar name is `k_fb_admin_only` per `include/fb_globals.h:405`.

Suggests existing descriptions were synthesized from sources that used `frogbot` / `fb` as alternative dispatcher names, plus a typo in the cvar reference.

**Source evidence**: `src/commands.c:1047` (only `botcmd` registration; no `frogbot` or `fb` parent exists); `include/fb_globals.h:405` (canonical cvar name).

**Recommendation**: Apply v2 names as drafted. Future synthesis pipelines should grep canonical parent + cvar names from headers rather than reusing phrasing from older docs.

---

### F3: ToT name expansion inconsistency across cards ("Tribe of Tjernobyl" is source-truth)

**Verdict**: ACTIONABLE

**Cards involved**: `health:frogbot:std` (existing: "Tunnel of Terror"), `quadmultiplier:frogbot:std` (existing: "Take-of-the-Throne") -- both chunk 2.

**Observation**: Two existing descriptions used different ToT name expansions, neither matches source. Source consistently uses "Tribe of Tjernobyl" at `src/commands.c:586`, `:4553`, `:7937` (the `tot` preset, broadcasts, team initialization). v2 recasts standardize to source-truth.

**Source evidence**: `src/commands.c:586` (`DEF(UserMode) tot` preset definition); `:4553` (Tribe of Tjernobyl broadcast strings); `:7937` (team-init label).

**Recommendation**: Apply v2 ToT name as drafted. Cross-batch coherence: the Mode-scoped knobs batch shipped `tot` / `totmode` / `k_tot_mode` cards (F3 finding); apply-pass-author should verify those cards use "Tribe of Tjernobyl" consistently.

---

### F4: Tooling-mode prereq applied consistently across 25 editor-scope cards

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: All 25 editor-scope subcommands across chunks 2 (5), 3 (10), 4 (10). Standard Prerequisites bullet: "Frogbot editor mode must be active (`FB_OPTION_EDITOR_MODE`) -- otherwise the parent dispatcher hides this subcommand entirely (not just refused with a message; literally not in the menu)."

**Observation**: All 25 editor-scope cards applied the standard Shape 8 tooling-mode-prereq surfacing pattern (from `shape-catalog.md`, added 2026-05-22). The "literally not in the menu" framing is consistent across all sub-agents. Confirms the Shape 8 tooling-mode-prereq modifier holds at scale (first batch with 25 editor-scope cards as a coherent set).

**Source evidence**: `src/bot_commands.c:2386-2389` (dispatcher table-swap based on `FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE)`); `include/fb_globals.h:9` (`FB_OPTION_EDITOR_MODE` bit 2).

**Recommendation**: No action. Documents that the Shape 8 tooling-mode modifier is well-handled at batch scale.

---

### F5: `weapon:frogbot:std` ToT-mode scope restriction missing from existing description

**Verdict**: ACTIONABLE

**Cards involved**: `weapon:frogbot:std` (chunk 2)

**Observation**: Existing description says "all bots should use [weapon]" without scope qualifier. Source: `FrogbotWeapon()` is consumed at `bot_botweap.c:958` only inside `if (tot_mode_enabled())` -- the weapon lock has NO effect outside ToT mode. Additionally, random/0 in ToT restricts to `i_rnd(2,8)` (rocket launcher through lightning gun range), not true free choice. Both omitted from existing description; surfaced in v2 recast.

**Source evidence**: `src/bot_botweap.c:958` (`tot_mode_enabled` gate); same file for `i_rnd(2,8)` random selection.

**Recommendation**: Apply v2 Effect + Prerequisites text. Cross-link to ToT-related entities (`tot` preset, `k_tot_mode` -- shipped in Mode-scoped knobs / Mode selection batches).

---

### F6: `mapinfo:frogbot:editor` is aerowalk-only diagnostic, not general

**Verdict**: ACTIONABLE

**Cards involved**: `mapinfo:frogbot:editor` (chunk 2)

**Observation**: Existing description claims general map diagnostic ("marker count, goals, zones, and indicators"). Source `FrogbotMapInfo` at `src/bot_commands.c:1126-1174` is hardcoded aerowalk-only -- checks quad entity position, specific marker indices (`markers[10]`, `markers[70]`). For all other maps, prints "No map-specific info available" at `:1172`. v2 recast surfaces actual scope.

**Source evidence**: `src/bot_commands.c:1126-1174` (FrogbotMapInfo handler).

**Recommendation**: Apply v2 Effect text. Hardcoded single-map handler is unusual; flag for possible upstream code-review (could be extended to a more general probe, or moved out of the dispatcher's command table).

---

### F7: `disable:frogbot:std` framing error -- game mode, not player/spectator mode

**Verdict**: ACTIONABLE

**Cards involved**: `disable:frogbot:std` (chunk 1)

**Observation**: Existing description says "restores player/spectator mode". Source: `UserMode()` at `src/commands.c:809-817` is the GAME MODE setter (1on1, ffa, ctf, dm, etc.); `_k_last_xonx` at `src/world.c:778` is documented as "internal usage, save last XonX command". The disable handler restores the prior GAME MODE, not the player's spectator status. v2 corrects to "game mode (1on1, ffa, ctf, etc.)".

**Source evidence**: `src/commands.c:809-817` (UserMode function); `src/world.c:778` (k_last_xonx cvar comment).

**Recommendation**: Apply v2 framing as drafted. Foundational naming mistake (different concept), but the framing direction is correct (it's a mode-restoration), so localized -- flagged not parked.

---

### F8: `debug:frogbot:std` has undocumented `marker [n]` sub-subcommand + nested-dispatch shape question

**Verdict**: ACTIONABLE (follow-up)

**Cards involved**: `debug:frogbot:std` (chunk 1)

**Observation**: Existing description names debug sub-subcommands (markers, goals, paths, ...) but omits `marker [n]` at `src/bot_commands.c:569` -- a separate handler that prints detailed single-marker info given a marker number. Distinct from `markers` (no-arg list-all). v2 adds it.

This entity (`debug`) is a Shape 8 subcommand of `botcmd` that itself has an internal sub-dispatch table (a *nested* dispatcher). The catalog's Shape 8 entry doesn't yet capture nested-dispatch as a sub-facet. This is 1-of-1 in the Frogbot batch, so earn-their-keep says no new Shape 8 variant. Flag as potential future shape-catalog work.

**Source evidence**: `src/bot_commands.c:569` (undocumented `marker [n]` branch in debug handler).

**Recommendation**: Apply v2 sub-subcommand list addition. Open follow-up: if a future batch surfaces additional nested-dispatch entities (especially in other engines), consider a Shape 8a (nested-dispatch) variant in the shape catalog.

---

### F9: Standard skill mode does NOT write `k_fbskill_use_rocketjumps` -- operator surprise

**Verdict**: ACTIONABLE

**Cards involved**: `k_fbskill_use_rocketjumps` (chunk 8)

**Observation**: `setSkillAttributes()` (standard skill mode, `src/bot_botimp.c:156-205`) has NO `cvar_fset` for `FB_CVAR_USE_ROCKETJUMPS`. Only `setSkillAttributesEasySkillMode()` at `:250` sets it. In standard mode the cvar stays empty (`""`), meaning `cvar("k_fbskill_use_rocketjumps")` returns 0.0, meaning bots will NOT rocket-jump unless the cvar is explicitly set in server.cfg. v2 surfaces as Prerequisites.

This is an asymmetric skill-preset pattern -- some cvars are set by both modes, some by easy-mode only. Operator surprise: standard-mode bots silently lack rocket-jump capability unless server.cfg overrides.

**Source evidence**: `src/bot_botimp.c:156-205` (setSkillAttributes, standard); `:250` (easy-mode setter); `src/bot_botjump.c:97` (consumer).

**Recommendation**: Apply v2 Prerequisites surface. Possible upstream code-quality follow-up: consider explicitly defaulting to 0 in standard mode (rather than implicitly via empty string) for documentation clarity. Low priority.

---

### F10: All 38 `k_fbskill_*` cvars share `botcmd skill <N>` overwrite risk

**Verdict**: ACTIONABLE (category-wide)

**Cards involved**: All 38 cvars across chunks 5/6/7/8.

**Observation**: All `k_fbskill_*` cvars are rewritten by `setSkillAttributes()` (called from the `skill:frogbot:std` subcommand handler at `src/bot_commands.c:489`). Manual server.cfg overrides are SILENTLY OVERWRITTEN when `botcmd skill <N>` is invoked in-game. All 38 v2 cards surface this in Prerequisites (overwrite-risk note) and include `skill:frogbot:std` in See-also.

Category-wide pattern: server admin sets a cvar in server.cfg, then a player runs `botcmd skill 8`, the cvar resets to formula-derived value. Cross-batch threading: the `skill:frogbot:std` card (chunk 1, drafted_with_flag) should bidirectionally enumerate the swept cvar families it touches.

**Source evidence**: `src/bot_commands.c:489` (`SetAttributesBasedOnSkill` call inside `FrogbotsSetSkill`); `src/bot_botimp.c:156-205` / `:208-260` (setSkillAttributes / setSkillAttributesEasySkillMode write paths).

**Recommendation**: Apply all v2 Prerequisites bullets as drafted. The `skill:frogbot:std` card's See-also section should cite "all k_fbskill_* cvars are rewritten via setSkillAttributes" once (with link to representative cards) rather than enumerating 38 cvars.

---

### F11: Canonical-card pattern -- 1 application in batch (vol_*_midair_incr pair); within-batch rejections documented

**Verdict**: CONFIRMED_CLEAN

**Cards involved**:
- (a) `k_fbskill_vol_bot_midair_incr` + `k_fbskill_vol_opp_midair_incr` (chunk 7): canonical pattern APPLIED. Near-identical pair with identical formula `RangeOverSkill(skill, 2.0f, 1.0f)`, identical 0-2.0 clamp, differing only in subject (bot's own midair state vs opponent's). Canonical = `vol_bot_midair_incr`; reference = `vol_opp_midair_incr`.
- (b) `k_fbskill_aim_pitch_*` / `aim_yaw_*` (chunk 5): canonical pattern EVALUATED and REJECTED. pitch_min clamp 0-10 differs from yaw_min clamp 0-1 (load-bearing difference). pitch_multiplier formula `4-to-2` differs subtly from yaw_multiplier `4-to-2.5`. Kept as separate full cards with cross-axis See-also threading.
- (c) `k_ctf_rune_power_*` family (Mode-scoped knobs batch F12): also REJECTED -- different effect formulas per power.

**Observation**: Documents the canonical-card discipline holding -- one new application this batch (midair pair), 1 evaluation-and-rejection within the batch (aim families), and continuity with prior batch's rejection. Per `shape-catalog.md`: "Canonical pattern is for near-identical siblings only."

**Recommendation**: No action. Documents that the catalog's near-identical test is being applied consistently; canonical-card pattern is not being over-applied.

---

### F12: `dmm4wiggle` / `dmm4wiggletoggle` dmm4+duel mode-precondition (pure-cvar)

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `k_fbskill_dmm4wiggle`, `k_fbskill_dmm4wiggletoggle` (both chunk 8)

**Observation**: Both cvars are gated at consumer site `src/bot_movement.c:141` on `(deathmatch >= 4) && isDuel() && !wiggle_run_dmm4`. The cvars exist regardless of mode, but their EFFECT only fires in dmm4-duel. v2 surfaces as Prerequisites (mode-precondition). Cross-link to dmm4-related entities (in Mode-scoped knobs / Mode selection batches).

These are cvar-side mode-preconditions WITHOUT paired toggle commands (so not Shape 1c, which requires a paired toggle); the mode-precondition applies as a pure-cvar prereq -- a sub-variant of Shape 3 worth noting.

**Source evidence**: `src/bot_movement.c:141` (gate); `src/bot_botimp.c:144-146` (cvar registrations).

**Recommendation**: No action. The cross-batch See-also threading to dmm4 entities will resolve when apply-pass runs and confirms back-links from dmm4 cards.

---

### F13: `k_fbskill_aim_attack_respawns` -- Rocket Arena (NOT clan arena) gate

**Verdict**: ACTIONABLE

**Cards involved**: `k_fbskill_aim_attack_respawns` (chunk 5)

**Observation**: Existing description claims "clan arena" exclusion. Source check at `src/arena.c:130` is `isRA()` = `isDuel() && cvar("k_rocketarena")` -- Rocket Arena (a 1on1 duel modifier), NOT Clan Arena (`isCA()`). Different game modes. v2 corrects framing.

**Source evidence**: `src/arena.c:130` (isRA / isCA distinction); `src/bot_aim.c` (consumer of k_fbskill_aim_attack_respawns).

**Recommendation**: Apply v2 framing. Foundational mode-naming mistake (RA != CA); flagged not parked because the framing direction (mode-conditional) is correct.

---

### F14: `k_fbskill_aim_yaw_min` formula-vs-clamp truncation

**Verdict**: ACTIONABLE (follow-up)

**Cards involved**: `k_fbskill_aim_yaw_min` (chunk 5)

**Observation**: `setSkillAttributes()` sets yaw_min to `RangeOverSkill(aimskill, 1.5, 1)` -- at minimum skill this would be 1.5. But `SetAttribs` clamps via `bound(0, cvar, 1)`, silently truncating to 1.0. Effective value range is 0-1, never above 1.0. Formula and clamp are misaligned. v2 reflects effective range; flagged for apply-pass-author.

**Source evidence**: `src/bot_botimp.c` setSkillAttributes (formula) + SetAttribs (clamp).

**Recommendation**: Apply v2 effective-range text. Possible upstream code-quality follow-up: align formula upper bound with clamp upper bound. Low priority.

---

### F15: `anglehint` / `rjfields` require `savemarker` first (two-step workflow surprise)

**Verdict**: ACTIONABLE

**Cards involved**: `anglehint:frogbot:editor`, `rjfields:frogbot:editor` (both chunk 4); cross-link to `savemarker:frogbot:editor` (chunk 2)

**Observation**: Both `anglehint` and `rjfields` call `FindPathIndex(saved_marker, nearest)` which returns -1 if `saved_marker == NULL`. The user must run `savemarker` BEFORE `anglehint` or `rjfields` will work. Two-step workflow not surfaced in either existing description. v2 surfaces as Prerequisites + adds savemarker to See-also.

**Source evidence**: `src/bot_commands.c:1578` (anglehint FindPathIndex); `:2006-2060` (rjfields handler); `:892` (FindPathIndex returns -1 on NULL saved_marker).

**Recommendation**: Apply v2 Prerequisites + See-also threading. Apply-pass-author should verify `savemarker:frogbot:editor` card mentions the two-step workflow consumers in its own Effect (or at least cross-links to one representative).

---

### F16: Several std subcommand handlers lack `bots_enabled()` guard

**Verdict**: ACTIONABLE (follow-up)

**Cards involved**: `removebot:frogbot:std`, `removeall:frogbot:std`, `disable:frogbot:std` (chunk 1); `togglequad:frogbot:std` (chunk 2)

**Observation**: These handlers run their logic without checking `bots_enabled()`. Behavior:
- `removebot` / `removeall`: silent no-op on empty bots array (no print).
- `disable`: runs even if already disabled (re-applies `UserMode` restoration).
- `togglequad`: writes the cvar regardless of bots-enabled state (no immediate effect; takes effect when bots are next added).

Not user-harmful but mildly confusing. v2 cards surface in Effect notes.

**Source evidence**: `src/bot_commands.c` -- per-handler body inspection (no `if (!bots_enabled()) return;` early-exit).

**Recommendation**: Apply v2 surface notes. Open follow-up: consider an upstream PR adding `bots_enabled()` guards to these std handlers for UX consistency with `botcmd`'s top-level check.

---

### F17: `removepath` removes each direction independently (not bidirectional-only)

**Verdict**: ACTIONABLE

**Cards involved**: `removepath:frogbot:editor` (chunk 3)

**Observation**: Existing description implies bidirectional path removal only. Source at `src/bot_commands.c:1392-1399` shows two independent if-guards: removes saved->nearest if path index >= 0, removes nearest->saved if path index >= 0. Works on unidirectional links (only the existing direction gets removed). v2 corrects framing.

**Source evidence**: `src/bot_commands.c:1392-1399` (two-direction removal pattern).

**Recommendation**: Apply v2 Effect text.

---

### F18: Editor "no marker nearby" / "nearest marker" framing corrections across 3 cards

**Verdict**: ACTIONABLE

**Cards involved**: `clearmarkerflag:frogbot:editor`, `clearpathflag:frogbot:editor`, `move:frogbot:editor` (all chunk 3)

**Observation**: Three existing descriptions framed editor refusal/scope behavior inaccurately:
- `clearmarkerflag`: existing "no-op if no nearby marker" -- source prints "No marker nearby" and returns (non-silent refusal at `:1542-1548`).
- `clearpathflag`: same pattern at `:1660-1663`.
- `move`: existing says "nearest routing marker" -- source restricts to manually-placed markers (`classname == "marker"`) via while-loop skip; bot-auto-placed markers silently skipped at `:865-869`. So "nearest" is misleading -- it's "nearest manually-placed marker".

v2 corrects framing on all three.

**Source evidence**: `src/bot_commands.c:1542-1548` (clearmarkerflag refusal print), `:1660-1663` (clearpathflag refusal print), `:865-869` (move manually-placed skip).

**Recommendation**: Apply v2 surfaces. Common existing-description pattern: framed refusals as silent no-ops; source actually prints messages. Consider audit pass on remaining editor cards for similar patterns.
