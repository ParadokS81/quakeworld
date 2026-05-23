# ktx-l1-rewrite drafts -- batch 2026-05-23

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill. Apply-pass-author
reviews each card, applies clean drafts, hand-edits flagged-drafts after
verifying the surfaced contradiction. Drafts do NOT auto-apply to L1
(`entities.description`); the apply pass is a separate phase.

---

## k_entityfile (KTX cvar, Server config & network -- Shape 9a)

- **Status**: drafted
- **Source**: src/world.c:886
- **Catalog line**: 15690
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Alternate filename stem used when locating per-map auxiliary files (bot markers, race routes, location files). When non-empty, KTX looks for files under this stem instead of the actual map name. Set automatically when a map is loaded with the `<map>#<entityfile>` syntax; the full string including the '#' is stored. Cleared to empty when no '#' is present in the map change request.
>
> Default: empty (uses actual map name).
> Set by: set automatically on map change with `<map>#<entityfile>` syntax; not typically set directly.

### Shape classification

Shape 9a (Side-channel cvar -- user-influenced via another command's arg syntax).

`RegisterCvar("k_entityfile")` in `world.c:886` with no default (empty). Write sites in `changelevel()` (`g_utils.c:1722,1729`) -- not a handler function, fires on every map change triggered by any route. No `cvar_toggle_msg`, no `cvar_fset` cycle, no gate-read. The user influences the write by embedding `#` in the map name passed to `forcemap`; the cvar stores the full `<map>#<variant>` string, which consumers use as-is as a filename stem.

### Proposed draft

```
Stores the full map-name-with-variant string (e.g. `dm4#ctf`) used as a filename stem for all per-map auxiliary file lookups on the current map.

Effect:
  When non-empty, consumers look up files under `k_entityfile` as the stem instead of the bare map name:
    maps/<k_entityfile>.bot              bot marker routing (marker_load.c)
    bots/maps/<k_entityfile>.bot         bot marker routing (fallback path)
    bots/maps/<k_entityfile>[<date>].bot frogbot file generation (bot_commands.c)
    locs/<k_entityfile>.loc              location names (teamplay.c)
    race/routes/<k_entityfile>.route     race routes (race.c)
  Also used as the spawn-map key in hoonymode spawn-state restoration
  (HM_store_spawns / HM_restore_spawns) and as the "stay on this map" target
  when the `samelevel` engine cvar is set.

Prerequisites: Variant files (e.g. `maps/dm4#ctf.bot`, `locs/dm4#ctf.loc`) must
  exist on the server's file system before `forcemap dm4#ctf` has any practical
  effect on file lookups.

Permission:    Side-effect of `forcemap <map>#<variant>` (admin only).
               Direct `set k_entityfile <value>` is syntactically valid but is
               overwritten on the next map change.
Match-state:   Written on each map change; takes effect immediately on the next
               auxiliary file read.
Default:       empty (all consumers fall back to the bare map name).

Example:
  # Place variant files on the server first:
  #   maps/dm4#ctf.bot
  #   locs/dm4#ctf.loc
  # Then force the map with the variant:
  forcemap dm4#ctf
  # k_entityfile is now "dm4#ctf"; bot routing and location files load from
  # the variant stem instead of "dm4".

See also: forcemap (the command that sets this via its map-name argument),
          k_hoonymode_prevmap (sibling engine-state-mirror cvar),
          k_hoonymode_prevspawns (sibling engine-state-mirror cvar)
```

### Notes

- The existing description states "the full string including the '#' is stored" -- verified correct. Consumers use the full `<map>#<variant>` string (e.g. `dm4#ctf`) as a filesystem stem, so files are named with `#` in them (e.g. `maps/dm4#ctf.bot`). No contradiction.
- The existing description lists "bot markers, race routes, location files" as consumers but omits hoonymode spawn restoration (`hoonymode.c:1253,1306`), frogbot file generation (`bot_commands.c:911`), and samelevel/set_nextmap use (`client.c:565,805`). These additions are captured in the Effect block above.
- `k_entityfile` can also be set (to a value with `#`) via a successful `cm`/`next_map` map vote when the winning map has a `#` variant in the server's map list (`vote.c:626` -> `changelevel(map)` where `map` may contain `#`). Not surfaced in the card prose (minor path; admin forcemap is the primary user-actionable route).
- The `.ent` entity-override file is handled by `trap_changelevel(mapName, name)` directly (passing the full name string), NOT via `k_entityfile`. So entity overrides are NOT in the Effect table -- they're a `trap_changelevel` concern, not a `k_entityfile` lookup.

---

## qizmo (KTX command, Server config & network -- Shape 10)

- **Status**: drafted
- **Source**: src/commands.c:777
- **Catalog line**: 16789
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints a short help listing of the three QiZmo proxy sub-commands: qlag (lag settings), qenemy (enemy vicinity reporting), and qpoint (point function). Displays only; changes no settings. The three listed sub-commands themselves are usable by any in-game player or admin spectators.
>
> Set by: in-game player command (players only; spectators cannot invoke this command).

### Shape classification

Shape 10 (Curated-family help-printer command).

Handler `ShowQizmo()` (`commands.c:1585-1591`) is a pure `G_sprint(self, 2, ...)` that prints `qlag`, `qenemy`, `qpoint` with one-line descriptions hardcoded inline. No state writes, no dispatch, no args. The three listed siblings are independent top-level commands (registered separately at `commands.c:784-786` -- not subcommands of a parent dispatcher). This is the canonical Shape 10 example identified in the shape catalog.

### Proposed draft

```
Prints the qizmo command roster -- three player commands that toggle QiZmo-protocol features in the server's 'fpd' serverinfo bitmask.

Effect:
  Displays the following family roster:
    qlag....... lag settings              (toggles fpd bit 8)
    qenemy..... enemy vicinity reporting  (toggles fpd bit 32)
    qpoint..... point function            (toggles fpd bit 128)
  Read-only. Changes no settings.

Permission:    any player (not admin spectators; the siblings qlag / qenemy / qpoint accept admin spectators)
Match-state:   any time

Example:
  qizmo
  > qlag....... lag settings
  > qenemy..... enemy vicinity reporting
  > qpoint..... point function

See also: qlag (toggles fpd bit 8), qenemy (toggles fpd bit 32), qpoint (toggles fpd bit 128),
          rules (sibling help-printer -- rule-toggle roster),
          options (sibling help-printer -- match-setting roster)
```

### Notes

- The existing description calls the siblings "sub-commands" -- they are independent top-level commands (separate registrations at `commands.c:784-786`). Corrected in recast to "player commands"; the "sub" framing is cosmetically imprecise but not foundationally wrong (no park trigger).
- Permission asymmetry is load-bearing: `qizmo` itself is CF_PLAYER only (spectators cannot invoke it), while the siblings `qlag`, `qenemy`, `qpoint` are CF_PLAYER|CF_SPC_ADMIN (admin spectators CAN invoke the siblings). The existing description already surfaces this distinction; the recast preserves and sharpens it.
- fpd bit values verified from handler source: `ToggleQLag` XORs bit 8 (`fpd ^= 8`, `commands.c:3695`); `ToggleQEnemy` XORs bit 32 (`commands.c:3712`); `ToggleQPoint` XORs bit 128 (`commands.c:3728`). Existing description omits these bit values -- added in recast per Shape 10 template discipline.
- All three siblings have `match_in_progress` early-return (pre-match only for their toggle effect), but `qizmo` itself has no match-state guard -- it prints at any time. Correctly captured as "any time" for the help-printer; the siblings' pre-match restriction belongs on their own cards, not here.
- No L3 concept note for the QiZmo / fpd protocol feature exists yet. Not forwarded in See-also per the no-forward-reference discipline.

---

## k_entityfile [re-run] (KTX cvar, Server config & network -- Shape 9a)

- **Status**: drafted
- **Source**: src/world.c:886
- **Catalog line**: 15690
- **Anchor**: v1.36-1633-g67253dc
- **Re-run date**: 2026-05-23 (Step-1.5 behavioral-unpacking enforcement pass)

### Current description

> Alternate filename stem used when locating per-map auxiliary files (bot markers, race routes, location files). When non-empty, KTX looks for files under this stem instead of the actual map name. Set automatically when a map is loaded with the `<map>#<entityfile>` syntax; the full string including the '#' is stored. Cleared to empty when no '#' is present in the map change request.
>
> Default: empty (uses actual map name).
> Set by: set automatically on map change with `<map>#<entityfile>` syntax; not typically set directly.

### Step-1.5 behavioral-unpacking notes

All read/write use-sites found; behavioral unpacking per-site:

1. **`g_utils.c:1722/1729` (changelevel write site):** The full `map#variant` string is stored, not just the stem. This fact is already in the existing description. No new behavior.

2. **`client.c:565` (GotoNextMap / samelevel path):** When `samelevel` (engine cvar) is non-zero, `GotoNextMap` passes the full `k_entityfile` value directly into `changelevel()`, which re-parses the `#`, re-sets `k_entityfile`, and reloads. **New behavior: the variant sticks automatically across same-level loop restarts** -- the admin does not need to re-issue `forcemap map#variant` after each match on the same map. The first run noted `client.c:565` in the Effect block but described it as "samelevel/set_nextmap use" without surfacing this specific self-perpetuating loop.

3. **`client.c:805` (match-end nextmap trigger):** At match end (non-bloodfest, non-CA context), `set_nextmap(entityfile)` sets the `nextmap` global to the full `k_entityfile` string. When `execute_changelevel` fires, it calls `changelevel(nextmap)` which re-parses `#`. **New behavior: the variant also propagates into automatic match-end map transitions** (the engine's own trigger_changelevel flow), not just admin-forced transitions. This was grouped with the samelevel note in the first run without distinguishing the behavioral consequence.

4. **`hoonymode.c:1253/1306` (HM_restore_spawns / HM_store_spawns):** `k_entityfile` is used as the identity key for hoonymode TDM spawn-nomination persistence. `HM_store_spawns` stores `k_entityfile` (or `mapname` if empty) as `k_hoonymode_prevmap`. `HM_restore_spawns` compares that stored value against the current `k_entityfile` to decide whether to restore. **New behavior: on a hoonymode TDM server, if the next map load uses a different variant name (or no variant at all) versus the previous session, spawn nominations reset to default** -- a surprise-bearing dependency for admins toggling variants mid-rotation. The first run noted hoonymode in the Effect block but did not surface this consequence.

5. **`bot_commands.c:911` (BotFileGenerate / botcmd generate):** When saving bot routes via the frogbot editor, the output filename uses `k_entityfile` (falling back to `mapname`) -- so a route generated during a variant session gets a variant-named `.bot` file. **New behavior: generate-then-load is coherent** (the same stem that `LoadBotRoutingFromFile` will look for is the same stem `BotFileGenerate` uses), but only if the variant is still active when `generate` is run. This confirms that the bot routing system is fully variant-aware in both directions (read and write).

6. **`maps.c:110` (GetCustomEntityMapsForDirectory startup scan):** At startup, KTX scans `maps/` for `.ent` files with the `#` separator and adds them to the maps list. `forcemap` validates the map name via `GetMapNum` against this list. **New behavior: `forcemap map#variant` is refused with "Map X not available on this server" if `maps/map#variant.ent` did not exist at startup** -- the `.ent` file must be in place before the server starts, not just before `forcemap` is issued. Direct `set k_entityfile map#variant` bypasses this check (syntactically valid) but the consumers still look for the files. The first run's Prerequisites said "variant files must exist" but did not surface the startup-scan gate that blocks `forcemap` specifically.

7. **`race.c:3827` (race route loading):** `race/routes/<k_entityfile>.route` file lookup. Same pattern as bot/loc. No new behavior beyond what the existing description implies.

8. **`teamplay.c:1543` (LocationInitialise):** `locs/<k_entityfile>.loc` file lookup. Covered in existing description.

### Shape classification

Shape 9a (Side-channel cvar -- user-influenced via another command's arg syntax). Same as first run; clean match confirmed.

`RegisterCvar("k_entityfile")` in `world.c:886` with no default (empty). Write site in `changelevel()` (`g_utils.c:1722,1729`) -- a non-handler engine function. No `cvar_toggle_msg`, no `cvar_fset` cycle. Side channel: user embeds `#` in the map name argument to `forcemap`, which calls `changelevel()`, which sets this cvar. Shape 9a match is definitive; the shape-catalog worked example cites this cvar as canonical.

### Proposed draft

```
Stores the full map-name-with-variant string (e.g. `dm4#ctf`) used as a
filename stem for all per-map auxiliary file lookups on the current map.

Effect:
  When non-empty, all per-map file lookups use this stem instead of the
  bare map name:
    maps/<k_entityfile>.bot                bot marker routing (primary)
    bots/maps/<k_entityfile>.bot           bot marker routing (fallback)
    bots/maps/<k_entityfile>[<date>].bot   frogbot route file saved by
                                           'botcmd generate'
    locs/<k_entityfile>.loc                location names
    race/routes/<k_entityfile>.route       race routes
  Once set, the variant persists automatically into:
    - subsequent maps when 'samelevel' is active (same-level loop restarts
      re-pass the full string into changelevel, which re-applies the variant)
    - the automatic match-end map transition (the nextmap trigger uses this
      value, so the variant carries over without re-issuing forcemap)
  On hoonymode TDM servers, this value is the identity key for per-spawn
  nomination persistence: if the next load uses a different variant name (or
  no variant), previously saved spawn nominations are discarded.

Prerequisites:
  For 'forcemap map#variant' to be accepted, the file
  'maps/map#variant.ent' must exist on the server's filesystem at startup
  (KTX scans for '#'-named .ent files at startup and adds them to the maps
  list; forcemap rejects names not in that list).
  The variant auxiliary files (e.g. maps/dm4#ctf.bot, locs/dm4#ctf.loc)
  must exist on disk for the file-lookup consumers to actually find them;
  'forcemap' accepts the variant name regardless of whether these files exist.

Permission:    Side-effect of 'forcemap <map>#<variant>' (admin only).
               Direct 'set k_entityfile <value>' is syntactically valid but
               is overwritten on the next map change and bypasses the startup
               maps-list check that forcemap enforces.
Default:       empty (all consumers fall back to the bare map name).

Example:
  # 1. Place variant files before the server starts:
  #      maps/dm4#ctf.ent       (entity override -- enables forcemap acceptance)
  #      maps/dm4#ctf.bot       (optional: bot routing for the variant)
  #      locs/dm4#ctf.loc       (optional: location names for the variant)
  # 2. Force the map with the variant:
  forcemap dm4#ctf
  # k_entityfile is now "dm4#ctf"; bot routing, locations, and race routes
  # all load from the "dm4#ctf" stem instead of "dm4".
  # On a samelevel server, the variant automatically re-applies each restart.

See also: forcemap (the command that triggers this via its map-name argument),
          k_hoonymode_prevmap (sibling engine-state-mirror that stores this
          value as the spawn-map identity key),
          k_hoonymode_prevspawns (sibling engine-state-mirror for spawn state)
```

### Notes

- **Delta vs first run -- stickiness across transitions (client.c:565,805):** First run noted "samelevel/set_nextmap use" in the Effect block generically. This re-run surfaces the specific user-observable consequence: the variant self-perpetuates across same-level loop restarts AND automatic match-end transitions without any re-action from the admin. Added as explicit Effect bullets.
- **Delta vs first run -- Prerequisites sharpened:** First run said "variant files must exist on the server's file system." This re-run splits the prerequisite into two layers: (a) the `maps/map#variant.ent` startup-scan requirement that gates `forcemap` acceptance, and (b) the consumer file existence requirement for the lookup behavior. These are independent -- `forcemap` can succeed with only the `.ent` file present; consumers silently fall back to mapname if other variant files are missing.
- **Delta vs first run -- hoonymode TDM spawn reset (hoonymode.c:1253/1306):** First run mentioned "spawn-map key in hoonymode spawn-state restoration" in the Effect block without flagging the surprise-bearing consequence: changing or dropping the variant on a hoonymode TDM server discards saved spawn nominations. Added as a named Effect bullet with the specific user-observable failure mode.
- **Delta vs first run -- BotFileGenerate coherence (bot_commands.c:911):** First run included `bots/maps/<k_entityfile>[<date>].bot` in the Effect table. This re-run confirms the generate-then-load coherence explicitly (same stem in both directions) and adds the caveat that the variant must still be active when `generate` is run.
- **No foundational contradictions:** The existing description's framing is correct. All additions are omissions (missing behaviors), not contradictions. Verdict stays `drafted`.
- **cm/next_map vote path (minor):** `changelevel(map)` is also called by the map vote system when a voted map wins; if the voted map name contains `#`, `k_entityfile` is set. Not surfaced in the card prose (minor path; `forcemap` is the primary admin-actionable route). Carried forward from first run Notes.
- **Entity override (.ent) handled by trap_changelevel, not by k_entityfile consumers:** The `.ent` file is passed directly via `trap_changelevel(mapName, name)`. Entity overrides are not in the Effect table. Confirmed again from source. Carried forward from first run Notes.

---

## allow_timing (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:849 (registration), src/client.c:135 (read site)
- **Catalog line**: 15421
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Master toggle for KTX's lagged-player detection. When enabled, players who have not been active for timing_players_time seconds are flagged as timing out and the server applies the responses configured by timing_players_action: a "WARNING: <player> is timing out!" broadcast, a glow effect on the lagged player, and/or making them temporarily invincible and frozen.
>
> 0 = timing-out detection disabled.
> 1 = timing-out detection enabled.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 -- cvar with no paired command (set-once in config).

`RegisterCvar("allow_timing")` in `world.c:849`; no `cvar_toggle_msg` site anywhere in the codebase; no cycle handler; no paired admin command. The cvar is read as a top-level gate in `CheckTiming()` (`client.c:135`), which is an internal per-frame function called by `StartFrame()` -- not a user command. Gate-read in a non-command engine function = Shape 3, not Shape 4. Three sibling Shape 3 cvars registered immediately adjacent: `timing_players_time` and `timing_players_action`.

### Proposed draft

```
Master toggle for the lagged-player detection system. When enabled, the server
checks each player every frame and applies the responses configured by
timing_players_action when a player has gone unreachable for longer than
timing_players_time seconds.

0 = timing-out detection disabled; the server skips all lag checks.
1 = timing-out detection enabled.

Permission:  server config only
Default:     0

Example:
  # server.cfg -- enable with an 8-second threshold and all three responses
  timing_players_time 8    ; flag after 8 seconds of no response
  timing_players_action 7  ; warning broadcast + glow + invincible/frozen
  allow_timing 1

See also: timing_players_time (inactivity threshold in seconds; 0 maps to a
          6-second internal default, not truly disabled),
          timing_players_action (bitmask controlling which of the three
          responses fire when a player is detected as timing out)
```

### Notes

- **Match-state omitted:** `CheckTiming()` is called from `StartFrame()` every server frame regardless of match state (pre-match, in-match, intermission). Omitting Match-state is correct.
- **Velocity-not-restored nuance (belongs on timing_players_action card):** When TA_INVINCIBLE fires, velocity is zeroed and explicitly NOT restored on recovery (`// speed is zeroed and not restored`, client.c:172). The `allow_timing` master-toggle card does not carry this detail -- it belongs on `timing_players_action`'s card where the per-action bitmask breakdown lives. Flagged here as a follow-up for the `timing_players_action` recast.
- **Warning repeats every 20 seconds:** If a player remains lagged, the warning broadcast re-fires every 20 seconds (not a single one-time event). The existing description implies a single event. The v2 draft omits this detail at the master-toggle level and defers it to `timing_players_action`.
- **timing_players_time = 0 fallback:** When `timing_players_time` is 0, `CheckTiming()` uses 6 seconds as an implicit internal default (client.c:140). This surprise behavior belongs on `timing_players_time`'s card.
- **Recovery message:** `BackFromLag()` broadcasts "is back from lag" when a player recovers. Not carried on the master-toggle card; belongs on `timing_players_action`.

---

## k_cmd_fp_count (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:995
- **Catalog line**: 15452
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Number of console commands a player may send within the k_cmd_fp_per time window before triggering command flood protection. Distinct from say/chat flood protection (k_fp).
> 
> Range: 0-10. Value 0 uses the built-in default of 10.
> 
> Default: 0 (effective 10 commands per window).
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

`RegisterCvar("k_cmd_fp_count")` at `world.c:995`; no `cvar_toggle_msg` or `cvar_fset` site confirmed by grep. The cvar is read into a C global at `FixCmdFloodProtect()` and consumed by `isCmdFlood()` as a ring-buffer size parameter. The 6-sibling family (`k_cmd_fp_count` / `k_cmd_fp_per` / `k_cmd_fp_for` / `k_cmd_fp_kick` / `k_cmd_fp_dontkick` / `k_cmd_fp_disabled`) are all Shape 3 individually; siblings control distinct parameters (count vs time-window vs lockout vs warnings vs kick-disable vs master-off) and are NOT near-identical -- the canonical-card pattern does not apply.

### Proposed draft

```
Maximum number of console commands a player may send within the k_cmd_fp_per time window before KTX triggers command flood protection.

Effect:
  0-10. 0 uses the built-in default of 10.
  Values above 10 are silently clamped to 10.

Permission:    server config only
Default:       0 (effective: 10 commands per window)

See also: k_cmd_fp_per (paired time-window width), k_cmd_fp_disabled (master on/off -- overrides this setting when 1), k_cmd_fp_for (lockout duration on flood), k_cmd_fp_kick (kick-warning threshold), k_fp (say flood protection -- distinct system)
```

### Notes

- **No contradictions found:** all six claims in the existing description verified against source. Recast is a structural upgrade (v1 → v2 shape) not a factual correction.
- **Effect/Default duplication resolved:** v1 had "Range: 0-10" as a standalone line and "Default: 0 (effective 10)" as a separate line. v2 merges the range into Effect and keeps Default as the registered value with effective notation.
- **Match-state omitted:** server config cvars are set at startup / map load via `FixRules()` → `FixCmdFloodProtect()`. No in-game toggle path exists; "any time" (server config) is the default and is omitted per v2 discipline.
- **Example omitted:** value enum + Default makes invocation self-evident (`k_cmd_fp_count 7` in server.cfg). No pedagogical value from an example.
- **Canonical-card pattern does NOT apply:** see Shape classification note. Siblings have distinct behavioral roles and non-identical descriptions.
- **Follow-up -- L3 concept note:** the 6-sibling family collectively describes the command flood protection system. See-also is at its 5-entry cap. A concept note covering the full cmd-fp system (all 6 cvars, the ring-buffer mechanics, interaction with `k_cmd_fp_disabled`) would let each sibling's See-also slim to 2-3 entries.
- **k_fp disambiguation verified structurally:** `FixSayFloodProtect()` is called separately from `FixCmdFloodProtect()` at `world.c:1575-1576`, confirming these are independent systems.
- **No foundational contradiction:** The existing description's framing as a master toggle is correct and source-verified. The v2 recast is mostly a template migration from v1 shape to v2 shape (Effect/Permission/Match-state split) with sibling cvars moved to See-also.

---

## k_defmode (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:793
- **Catalog line**: 15662
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the server's default game mode, specified as a usermode name (e.g. 1on1, 2on2, 4on4, ffa, ctf). Applied on the first map spawn and re-applied on a full server reset. On matchless servers, ffa is always used on reset regardless of this value. An unrecognised name is silently ignored and no default mode is forced.
>
> Default: (empty -- no forced default mode).
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

Registration at `world.c:793` with no paired `cvar_toggle_msg` site and no `cvar_fset` cycle handler. No engine-write (`cvar_set("k_defmode", ...)`) site exists -- the engine only reads it. No gate-read pattern. Clean Shape 3.

### Proposed draft

```
Sets the game mode applied automatically on first server startup and on each full server reset.

Effect:
- On first map spawn: looks up the named usermode in the registered mode list and seeds the startup mode accordingly. If the name is not found, no mode is forced and the server starts with no default mode active.
- On full reset (all players have left): `execute_rules_reset` looks up this value and re-applies the named mode, loading that mode's config as if the mode command had been issued. If the name is not found, no mode is applied.
- On matchless servers (`k_matchless 1`): the reset path forces `ffa` unconditionally, overriding this value.

Permission:    server config only
Default:       (empty) -- no default mode forced; server starts without a preset mode.

Example:
  k_defmode 1on1   ; in server.cfg -- server opens in 1on1 mode and resets to 1on1 when empty

See also: k_matchless (overrides to ffa on reset when matchless), k_allowed_free_modes (controls which modes are selectable at all)
```

### Notes

- **No contradictions found:** all claims in the existing description verified against source. Recast is a structural upgrade (v1 → v2) not a factual correction.
- **"Full server reset" trigger clarified:** source shows `execute_rules_reset` is called at `client.c:3092` inside the `if (!(CountPlayers() - CountBots()))` block -- i.e., when the last human player leaves. A secondary call fires at `race.c:341` on race-mode toggle-off. The existing description's "full server reset" is accurate plain-English for this; the v2 recast says "all players have left" which is more precise and action-level for an admin.
- **Matchless override scope:** the matchless override (`k_matchLess ? "ffa" : cvar_string("k_defmode")`) only fires in `execute_rules_reset` (the reset path at `commands.c:4878`). The first-spawn path at `world.c:1122` does NOT apply the matchless override -- it reads `k_defmode` directly. In practice, on a matchless server the world spawn path is pre-empted by `world.c:1130-1140` which forces `_k_last_xonx` to the `ffa` index regardless. The net effect is consistent with the existing description's framing, but the mechanism is two separate code paths.
- **Example omits secondary race-toggle-off path:** that path is rare and adds no admin-actionable content. Omitted per MVI discipline.
- **See-also cap:** two entries; well within the 4-5 cap. The mode preset commands (1on1, ffa, ctf, etc.) are value examples in the Effect prose, not separate See-also entries -- per discipline (don't repeat what's already in Effect).

---

## k_extralog (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1004
- **Catalog line**: 15718
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables the per-match XML event log. When on, KTX opens a log file (path set by `extralogname`) at match start and writes a structured document with match info (timestamp, hostname, port, map, mode) and per-event records for the duration of the match. When off, no file is opened and no events are written.
>
> 0 = event log disabled.
> 1 = event log written to file at match start.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3: Cvar with no paired command (set-once in config).

`RegisterCvar("k_extralog")` in `world.c:1004`. No `cvar_toggle_msg` site, no `cvar_fset` cycle, no paired command. The cvar is read via `cvar("k_extralog")` inside `log_open()` (logs.c:42) and `log_printf()` (logs.c:79) as a gate; no command handler reads it as a gate. Set in server.cfg only.

### Proposed draft

```
Enables the per-match XML event log. When set, KTX writes a structured .xml file (named by `extralogname`) covering the full match duration.

Effect:
  At match start: opens the file set by `extralogname` and writes an XML header containing timestamp, hostname, IP, port, map, and mode.
  During match: appends one `<event>` record per death, damage hit, item pickup, and backpack pickup.
  At match end: closes the `<events>` block and the file handle.
  When off (0): no file is opened and no events are written.

Prerequisites:
  `sv_local_addr` must be set and contain a valid `IP:port` string -- `StartLogs` returns without opening the file if this cvar is empty or malformed.
  `extralogname` must be set to a non-empty path before match start. In the typical demo-recording workflow, `sv_demoeasyrecord` sets `extralogname` automatically; if demo recording is skipped, `extralogname` is cleared to "" and no file opens even with `k_extralog 1`.

Permission:    server config only
Default:       0

Example:
  server.cfg:
    k_extralog 1
    k_extralog_xsd_uri "http://mirror.quakeworld.eu/ktx/ktxlog_0.1.xsd"
  When demo_tmp_record is enabled, sv_demoeasyrecord sets extralogname automatically.
  To set the log path manually:
    set extralogname "logs/match.xml"   (before match start)

See also: extralogname (file path for the log; typically set by the demo recording system), k_extralog_xsd_uri (XSD schema URI embedded in the log header)
```

### Notes

- **No contradictions found:** all claims in the existing description verified against source. Recast is a structural upgrade (v1 -> v2) plus two new prerequisites surfaced by Step 1.5.
- **sv_local_addr prerequisite is surprise-bearing:** `StartLogs()` at `logs.c:100` returns early if `sv_local_addr` is empty or malformed. An admin enabling `k_extralog 1` with a valid `extralogname` will silently get no log file if this cvar is not populated. Not in the existing description; added to Prerequisites.
- **extralogname-easyrecord interaction is surprise-bearing:** `match.c:2351-2353` comment says "extralog should be set by easyrecord"; the code clears `extralogname` to "" as a safety net before `sv_demoeasyrecord` sets it. Manual `extralogname` sets are overwritten on the next demo-record call. Surfaced in Prerequisites + Example.
- **Event types listed:** source confirms death, damage, item pick (health/ammo/weapons), backpack pickup. Brief mention in Effect ("death, damage hit, item pickup, backpack pickup") is user-actionable without becoming implementation-level.
- **See-also cap:** two entries; both are direct companion cvars (`extralogname` = where the file goes; `k_extralog_xsd_uri` = schema URI embedded in the header). Within 4-5 cap.

---

## k_spm_show (KTX cvar, Server config & network -- Shape 2)

- **Status**: drafted_with_flag
- **Source**: src/world.c:882
- **Catalog line**: 16176
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls when spawn-point marker entities are visible to players.
>
> 0 = markers never shown.
> 1 = markers shown during prewar only (hidden once the match starts).
> 2 = markers shown during prewar and remain visible during the match.
>
> Default: 0.
> Set by: server config or admin command 'spm_show'.

### Shape classification

Shape 2 (cvar + paired cycle command, 3-value cycle).

`RegisterCvarEx("k_spm_show", "1")` in `world.c:882`. The paired command `spawn_show` (commands.c:718, handler `ToggleSpawnPoints`) increments the value 0→1→2→0 (wraps at SPAWN_SHOW_MATCH+1) and writes back via `cvar_set` -- a 3-state cycle, not a binary flip. No `cvar_toggle_msg` site. The three states map to named constants: `SPAWN_SHOW_DISABLED=0`, `SPAWN_SHOW_PREWAR=1`, `SPAWN_SHOW_MATCH=2` (defined in `include/g_local.h:1258-1260`).

Member of the `k_spm_*` family (`k_spm_glow`, `k_spm_custom_model`, `k_spm_color_rgba`) -- siblings have distinct semantics; full separate cards, not canonical-card pattern.

### Proposed draft

```
Controls whether spawn-point marker entities are visible to players.

0 = markers never shown.
1 = markers shown during prewar; hidden when the match starts.
2 = markers shown during prewar and remain visible during the match.

Permission:  server config or 'spawn_show' admin command in-game.
Match-state: pre-match only (the 'spawn_show' cycle command is refused
             while a match is in progress; the cvar can still be set
             directly in server.cfg at any time).
Default:     1.

Example:
  # server.cfg -- show markers during prewar only (default)
  k_spm_show 1

  # in-game: admin steps from 1 -> 2 (match-visible)
  spawn_show

  # in-game: admin steps from 2 -> 0 (off)
  spawn_show

See also: spawn_show (cycle command that steps this value), k_spm_glow (glow
  effect on markers), k_spm_custom_model (replacement model), k_spm_color_rgba
  (marker color)
```

### Notes

- **FLAG: wrong default.** Existing description says `Default: 0`; source has `RegisterCvarEx("k_spm_show", "1")` -- default is **1** (prewar-only visible). Apply-pass-author: update the Default line.
- **FLAG: wrong command name.** Existing description says `admin command 'spm_show'`; source registration row at commands.c:718 is `"spawn_show"` (handler `ToggleSpawnPoints`). Apply-pass-author: update the command name throughout.
- **Shape 2 cycle, not binary toggle.** `ToggleSpawnPoints` increments 0→1→2→0 via `cvar_set`; not a `cvar_toggle_msg` shape. The description surfaces this as a step-cycle in the Permission line ("steps this value") rather than calling it a toggle.
- **Match-state placement.** The `match_in_progress` early-return in `ToggleSpawnPoints` (commands.c:2704) means the `spawn_show` cycle command is pre-match only. However the cvar itself can be set in server.cfg at any time. The Match-state line captures both sides.
- **Spawnicide interaction not surfaced.** `ToggleSpawnicide` (commands.c:2753) refreshes the spawn marker display if `k_spm_show` is nonzero. This is an implementation detail (display refresh, not a behavioral prerequisite for `k_spm_show` itself) -- omitted per action-level discipline.
- **Race + hoonymode interactions.** `race_shutdown()` (race.c:532) and `hoonymode.c:858` read `SpawnShowStatus()` to decide marker cleanup behavior. These are internal display-management details; not user-actionable context for the `k_spm_show` card itself.
- **See-also:** four siblings listed (spawn_show + three k_spm_* family members). At the 4-5 cap limit; all are direct peers.

---

## k_maxclients (KTX cvar, Server config & network -- Shape 3 + Shape 4)

- **Status**: drafted_with_flag
- **Source**: src/world.c:989
- **Catalog line**: 15872
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Ceiling for the engine's maxclients value when adjusted in-game via the player-count controls. The in-game raise/lower commands will not push maxclients above this value; when the ceiling is reached the server reports the limit. Has no effect while a match is in progress.
>
> Range: 1 or higher (player slots).
>
> Default: server-configured.
> Set by: server config only.

### Shape classification

Shape 3 (server-config cvar with no paired toggle command) + Shape 4 (gates the `upplayers`/`downplayers` commands as a ceiling).

`RegisterCvar("k_maxclients")` in world.c with no `cvar_toggle_msg` site. `ChangeClientsCount` (commands.c:8019) reads it as a ceiling via `if (cvar("maxclients") >= cvar("k_maxclients")) { print "reached"; return; }` -- classic Shape 4 gate. Mode preset bundles (`_1on1_um_init[]`, `_2on2_um_init[]`, etc.) and `race_switch_usermode` (race.c:5489) write it via `cvar_fset`, but these are config-bundle writes, not a cycle command pattern.

### Proposed draft

```
Maximum player slots the server's 'upplayers' and 'downplayers' commands are allowed to set.

Effect:
  'upplayers' raises the engine's 'maxclients' by one per invocation; it stops when 'maxclients' reaches k_maxclients and prints "'maxclients' reached" to the invoker.
  'downplayers' lowers 'maxclients' by one per invocation; k_maxclients is the upper bound of the result clamp.
  Mode presets (1on1, 2on2, 3on3, 4on4, ca, wipeout, race, etc.) set k_maxclients automatically to their canonical slot count alongside 'maxclients'.

Prerequisites: 'k_allowcountchange' must be non-zero -- its value controls which permission level may use 'upplayers'/'downplayers' (1 = real admin only; 2 = any admin). Default of 0 means nobody until explicitly configured.

Permission:    server config, or set automatically by mode preset application
Match-state:   pre-match only ('upplayers'/'downplayers' refuse while match is in progress)
Default:       0 (empty -- mode preset or server.cfg must configure; all mode presets override this)

Example:
  # In server.cfg, cap an FFA server at 32 player slots with any-admin control:
  k_allowcountchange 2
  k_maxclients 32

  # Applying a mode preset sets both maxclients and k_maxclients in one step:
  1on1          // sets k_maxclients 2 (duel ceiling) as part of the preset bundle

See also: upplayers (raises maxclients toward this ceiling), downplayers (lowers maxclients), k_allowcountchange (gates who may invoke upplayers/downplayers), k_maxspectators (parallel ceiling for spectator slots)
```

### Notes

- **FLAG: "Set by: server config only" is incomplete.** Source shows `race_switch_usermode` (race.c:5489) calls `cvar_fset("k_maxclients", maxClients)` directly, and all mode preset `*_um_init[]` bundles include `k_maxclients <N>`. The v2 Permission line reflects this: "set automatically by mode preset application." The apply-pass-author should verify the existing description's "Set by: server config only" claim was intentionally narrowed and not an omission.
- **FLAG: "Default: server-configured" is technically wrong.** `RegisterCvar("k_maxclients")` = `RegisterCvarEx("k_maxclients", "")` = empty string default = 0. The existing description frames it as "server-configured" to indicate it should always be set by config or preset, but the raw default is 0. The v2 draft explicitly states `0 (empty)` and names the override mechanism. Apply-pass-author confirm.
- **Behavioral addition: `k_allowcountchange` prerequisite.** The existing description omits that `ChangeClientsCount` checks `k_allowcountchange` before enforcing the ceiling. When `k_allowcountchange = 0` (the raw default), the whole function returns "no one can use this command" before the ceiling check even runs. This is a surprise-bearing prerequisite (admin sees "no one can use this command" instead of the expected "maxclients reached"). Surfaced in Prerequisites.
- **Behavioral addition: mode preset co-write.** The existing description presents `k_maxclients` purely as a ceiling you set in server.cfg. Source shows every mode preset sets both `maxclients` and `k_maxclients` to the same value, so the ceiling tracks the active format's canonical slot count automatically. Surfaced in Effect bullet 3.
- **See-also cap.** Four entries listed: upplayers, downplayers, k_allowcountchange, k_maxspectators. At the 4-5 cap; all are direct peers.

---

## about (KTX command, Server config & network -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:761
- **Catalog line**: 16363
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the server identity panel to the issuing player: server name, version, build, date, and homepage (from the qws_* cvars), followed by the mod name, version, and build (from the qwm_* cvars). Read-only.
>
> Set by: n/a (read-only command).

### Shape classification

Shape-less (no Layer B tag). Pure read-only state-printer command with no cvar pair, no gate, no vote, no subcommand structure, no toggle relationship. The KTX shape catalog explicitly calls out `about` (ShowVersion) as the canonical "State report" neighbor that is NOT Shape 10 -- directly cited in the Shape 10 section as "prints server identity panel, not a help menu." Applies v2 universal shape without a Layer B relationship tag.

### Proposed draft

```
Prints the server and mod identity panel to the issuing player.

Effect:
  Server panel (from qws_* cvars): Name, Version, Build, Date, Webpage. Each
  field is shown only if the corresponding qws_* cvar is non-empty; the Name
  field falls back to the engine 'version' cvar if qws_fullname is unset.
  Mod panel (always shown): Name, Version, Build, Date, Webpage. These fields
  are written by KTX at startup from compile-time constants and reflect the
  running KTX build.
  If the server has sv_specprint set with the sprint bit active, also appends:
  "WARNING: Spectators may see team messages (mm2) on this server!"

Permission:  any player or spectator

Example:
  about
  (Output: server + mod identity panel, sent to the caller only.)

See also: qws_fullname (server name cvar), qws_version (server version cvar),
  qws_homepage (server homepage cvar)
```

### Notes

- **FLAG: Existing description understates mod panel fields.** Source shows `ShowVersion` unconditionally prints five mod fields: Name (qwm_fullname), Version (qwm_version), Build (qwm_buildnum with platform suffix), Date (qwm_builddate), and Webpage (qwm_homepage). The existing description lists only "mod name, version, and build." The v2 draft corrects this to five fields. Apply-pass-author confirm.
- **FLAG: sv_specprint warning branch missing from existing description.** `ShowVersion` checks `(int)cvar("sv_specprint") & SPECPRINT_SPRINT` (0x2) and appends a spectator-privacy warning if set. This is observable output visible to the issuing player. Surfaced in Effect bullet 3. Apply-pass-author confirm the warning text verbatim: "Spectators may see team messages (mm2) on this server!"
- **qws_* conditional/fallback behavior.** The existing description implies all five server fields always print; source shows each is guarded by `strlen(cvar_string("qws_x"))`. Name has an explicit fallback to engine `version`. This is a localized behavioral gap (not a framing error).
- **qwm_* are engine-set, not admin-configurable.** g_main.c:501-507 writes these at startup from compile-time constants (MOD_FULLNAME, MOD_VERSION, GIT_COMMIT, etc.). The existing description's framing "(from the qwm_* cvars)" is technically correct but may imply configurability. The v2 draft clarifies "written by KTX at startup from compile-time constants."
- **Permission mapping.** CF_BOTH = CF_PLAYER | CF_SPECTATOR = "any player or spectator." CF_MATCHLESS = available outside a match too. No admin restriction. Match-state omitted (any time per v2 discipline).
- **See-also cap.** Three entries listed (qws_fullname, qws_version, qws_homepage) -- within the 4-5 cap. The qwm_* cvars are engine-set with no user-actionable path; omitting them from See-also is correct (they don't change the reader's action plan).

---

## forcemap (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:753 (registration); admin.c:742 (handler)
- **Catalog line**: 16503
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Immediately changes the server to the named map. Usage: forcemap <mapname>. Refused if a match is currently in progress (unless the server runs in matchless mode), if no map name is given, or if the map is not available on the server. Announces the change and loads the new level at once.
>
> Set by: admin command 'forcemap <mapname>'.

### Shape classification

Shape-less command (no named KTX Layer B shape applies). forcemap is an admin action command: validate -> announce -> changelevel(). No cvar_toggle_msg, no cvar_fset cycle, no vote mechanism, no userinfo state write. It IS the side-channel trigger for k_entityfile (Shape 9a) when the `<map>#<variant>` syntax is used -- that relationship is captured in See-also and Effect.

### Proposed draft

```
Admin command that immediately changes the server to the named map.

Effect:
  - Broadcasts the map change to all connected players, then loads the new map.
  - Accepts '<map>#<variant>' syntax: sets k_entityfile to the full '<map>#<variant>' string, causing the new map to load with the named entity override file (.ent). The variant persists across subsequent map transitions (samelevel loops, end-of-match auto-advance) until overwritten by the next map change.

Prerequisites:
  - During a live match: refused unless the server runs in matchless mode (k_matchless 1). Use 'break' or 'forcebreak' to end the match first.
  - The map (or '<map>#<variant>' form) must appear in the server's map list. For the '#variant' form: the file 'maps/<map>#<variant>.ent' must have existed when the server started (the startup scan, not runtime discovery).

Permission:    admin only (player-admin or spectator-admin)
Match-state:   refused mid-match unless k_matchless 1

Example:
  forcemap dm2
  forcemap dm2#tourney        (loads dm2 using maps/dm2#tourney.ent entity overrides;
                               variant stays active on samelevel loops and at end-of-match)

See also: k_entityfile (cvar storing the active variant string; set as a side-effect of the '#' syntax), k_matchless (matchless-mode gate), break (player-side match termination), forcebreak (admin match termination)
```

### Notes

- No contradictions found in spot-check. All six claims in the existing description are source-verified.
- The existing description omits: (a) the `#variant` syntax; (b) the prerequisite that the `.ent` file must exist at startup; (c) the stickiness / transition-propagation behavior. All three are additive, not corrective.
- Stickiness behavior traced to: g_utils.c:1722 sets k_entityfile on the variant path; client.c:565 reads k_entityfile in GotoNextMap() for samelevel; client.c:805 reads k_entityfile to populate set_nextmap for end-of-match auto-advance. Both paths pass the full entity file string (including '#variant') to the next changelevel() call.
- The '#variant' prerequisite (must exist at server startup) is traced to GetCustomEntityMapsForDirectory() in maps.c:83 -- the startup scan adds 'mapname#variant' entries to mapslist[]. GetMapNum() used in the handler checks this list; if the .ent file wasn't there at startup, the variant is absent from mapslist and forcemap refuses with "Map not available on this server."
- forcemap is also called from vote.c (cm/next_map vote path) and world.c (various map-cycling paths). Those callers go through changelevel() the same way; they are not the forcemap command.
- See-also at 4 entries (k_entityfile, k_matchless, break, forcebreak) -- within the cap.

---

## qenemy (KTX command, Server config & network -- v2 universal, no Layer B tag)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:785
- **Catalog line**: 16760
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles QiZmo enemy-nearby reporting on or off. Sets or clears the relevant bit in the server's fpd serverinfo value and broadcasts "QiZmo enemy reporting allowed" or "... disallowed" to all players. The actual enforcement of enemy reporting is handled by the QiZmo proxy, which reads the fpd serverinfo -- KTX itself only sets the flag.
>
> Refused while a match is in progress.
>
> Set by: admin command 'qenemy' in-game.

### Shape classification

v2 universal shape, no Layer B tag. The mechanism -- XOR a named bit into the world's `fpd` serverinfo bitmask + broadcast via `G_bprint` -- does not match any current catalog shape. Not Shape 1 (no `cvar_toggle_msg`, no paired `k_*` cvar). Not Shape 4/4b (writes the value rather than gating on another cvar). The 3-sibling family (qlag / qenemy / qpoint, bits 8 / 32 / 128) confirms the pattern is recurring and qualifies for a new shape by earn-their-keep (2-3 instance count passes); that crystallization is operator-level, not skill-level. Drafted shapeless under v2 universal while flagging the family candidate.

### Proposed draft

```
Toggles QiZmo enemy vicinity reporting on or off by flipping bit 32 in the server's fpd serverinfo bitmask.

Effect:
  XORs bit 32 in the server's fpd serverinfo value (0 -> 32 -> 0 on successive invocations).
  Broadcasts "QiZmo enemy reporting allowed" or "... disallowed" to all players with the new state.
  KTX sets the flag only; the QiZmo proxy reads fpd and enforces the feature accordingly.

Permission:    any player or admin spectator
Match-state:   pre-match only (silently refused if a match is in progress -- no message printed)

Example:
  qenemy
  > QiZmo enemy reporting allowed

  Running again:
  qenemy
  > QiZmo enemy reporting disallowed

See also: qlag (sibling -- toggles fpd bit 8, lag settings), qpoint (sibling -- toggles fpd bit 128, waypoint marking), qizmo (family roster command)
```

### Notes

- FLAG: existing description says "Set by: admin command 'qenemy' in-game" implying admin-only access. Source registration is `CF_PLAYER | CF_SPC_ADMIN` (commands.c:785): any player can run this command; spectators additionally require admin rights. This is a localized factual error in the existing description -- the v2 draft corrects it to "any player or admin spectator".
- New-shape candidate: qlag / qenemy / qpoint are 3 confirmed siblings with identical mechanism (XOR a named fpd bit + G_bprint broadcast + match_in_progress gate). Meets earn-their-keep instance count (2-3). Operator can crystallize a "serverinfo-bitmask-bit-toggle" shape when cataloging this family.
- Silent refusal: `match_in_progress` check has bare `return` (no print). Existing description says "Refused while a match is in progress" which is correct but doesn't note the absence of a message. Not flagged as a factual error (refusal is accurate); noted for awareness.
- match.c:2112-2141 shows a pre-match-start broadcast that reads fpd and prints which QiZmo features are active ("QiZmo: lag enemy point disabled" format). Not surfaced in the L1 card -- it's a server status printout, not the qenemy command's own behavior.

---

## status1 (KTX command, Server config & network -- no Layer B shape)

- **Status**: drafted
- **Source**: src/commands.c:710
- **Catalog line**: 16897
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the first page of server settings: maxspeed, deathmatch mode, teamplay, time limit, frag limit, powerups, discharge, drop-quad, drop-ring, fair backpacks, drop-backpacks, spectator-info permission, more-spec-info, teleteam, and berzerk. Also appends live match state: pending-start countdown, any election with vote tally, whether team picking / a captain / a coach is present, and once a match is running -- sudden-death/overtime status or minutes remaining.
>
> Set by: any player or spectator (in-game command).

### Shape classification

No Layer B shape. `status1` is a read-only state display: a pure `G_sprint` panel printing 15 live cvar values followed by a conditional match-state overlay. It has no cvar/command pair relationship, no vote mechanism, no dispatch table, no gate, and no side effects. The catalog explicitly excludes this class (state-report commands like `about`/ShowVersion are NOT Shape 10). Shape-less: apply v2 universal shape without a Layer B tag.

`status2` is a sibling (second page of settings), but the two commands display meaningfully different content -- they are not near-identical, so the canonical-card pattern does not apply. Each gets its own full card with a See-also cross-link.

### Proposed draft

```
Prints the first page of current server settings.

Effect:
  Always displayed (15 fields):
    Maxspeed, Deathmatch, Teamplay, Timelimit, Fraglimit, Powerups,
    Discharge, Drop Quad, Drop Ring, Fair Backpacks, Drop Backpacks,
    spec info perm (adm/all), more spec info (on/off), Teleteam, Berzerk

  Live match-state overlay (appended based on phase):
    - Countdown phase (match_in_progress=1): seconds until start, then stops --
      election, captain, coach, and overtime info are suppressed during countdown.
    - Pre-match: any active election with yes/no tally; team-picking in progress;
      captain present; coach present (each shown only if applicable).
    - Match running: sudden-death / overtime type, or full minutes remaining.

Permission:  any player or spectator

Example:     status1

See also: status2 (second page -- server mode, overtime settings, spectalk, lock settings, and more)
```

### Notes

- No flags. The existing description is factually accurate and complete; this is a mechanical v1-to-v2 reformat.
- The countdown early-return detail (elections/captains/coaches suppressed during countdown) is source-verified at commands.c:1881-1891. The existing description lists countdown alongside elections in a flat list, implying they can coexist; v2 draft makes the mutual-exclusion explicit as an Effect bullet.
- Permission framing: existing description says "any player or spectator (in-game command)." The `CF_BOTH | CF_MATCHLESS` registration confirms this, and CF_MATCHLESS extends access to matchless mode (no match configured). "In-game" dropped from the v2 Permission line as it is not a standard phrasing and slightly undersells the matchless availability.
- `spec info perm` and `more spec info` both derive from the `k_spec_info` bitmask (via `mi_adm_only()` and `mi_on()`), not from two separate cvars. Not surfaced in L1 -- the display is what it is; the implementation detail belongs to `k_spec_info`'s card, not here.
- `Fair Backpacks` uses `get_frp_str()` which returns a multi-value string (not just on/off). The field is reported as-is; the values are defined by `k_frp` / related cvars, not by `status1`.
- Follow-up work surfaced: `status2` will need its own v2 recast (sibling; same shape-less classification).

---

## k_cmd_fp_disabled (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1000
- **Catalog line**: 15482
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Master switch for command flood protection. Affects only command-rate flooding; say/chat flood protection is a separate system (k_fp).
> 
> 0 = command flood protection active (clients exceeding the command rate are warned, locked out, and optionally kicked).
> 1 = command flood protection disabled (no tracking, no warnings, no kicks).
> 
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set once in config). No `cvar_toggle_msg` site, no cycle handler. The cvar is read by `isCmdFlood()` (commands.c:1177) as a bypass gate and by `ModStatus2()` (commands.c:2060) for status display only. Shape 3 + implicit Shape 4 gating role (gates the flood-protection subsystem, not a single named command). The shape tag is Shape 3; the gating relationship is surfaced in See-also.

### Proposed draft

```
Master switch for command flood protection -- disabling it bypasses all rate tracking, warnings, lockouts, and kicks for console commands.

Effect:
  0 = command flood protection active: clients exceeding the command rate are warned, locked out temporarily, and optionally kicked after repeated violations.
  1 = command flood protection disabled: no rate tracking, no warnings, no lockouts, no kicks.

Note: affects only command-rate flooding. Say and chat flood protection is a separate system controlled by k_fp.

Permission:    server config only
Default:       0

See also: k_cmd_fp_count (commands-per-window limit), k_cmd_fp_per (rate window width), k_cmd_fp_dontkick (disables kicks while leaving warnings active), k_fp (say flood protection -- distinct system)
```

### Notes

- No contradictions found. Existing description is source-accurate; the v2 recast is a template migration from v1 shape (value enum + Set-by prose) to v2 shape (Effect section with enum + Permission + See-also).
- The disambiguation from `k_fp` (say flood protection) is load-bearing: the similar name is a real confusion risk for server admins. Retained as a Note line in the body rather than relegated to See-also, since administrators need to see it before they decide whether `k_cmd_fp_disabled` is the right knob.
- See-also at 4 entries (under cap). k_cmd_fp_for and k_cmd_fp_kick are omitted from this card's See-also -- they are secondary parameters relative to the master switch, and the cap discipline applies. A reader finding this card is most likely deciding whether to disable cmd flood protection altogether (not tuning fine parameters); the most relevant siblings are count (what's being tracked), per (the rate window), dontkick (partial-disable alternative), and k_fp (disambiguation).
- Consistent with k_cmd_fp_count sibling card: that card lists `k_cmd_fp_disabled (master on/off -- overrides this setting when 1)` in its See-also; this card reciprocates with `k_cmd_fp_count (commands-per-window limit)`.

---

## k_cmd_fp_per (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:996
- **Catalog line**: 15604
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Time window (in seconds) for command flood protection. A player triggers flood protection when they issue k_cmd_fp_count commands within this many seconds. On flood, the player is locked out for k_cmd_fp_for seconds and warned; after k_cmd_fp_kick accumulated warnings they are force-disconnected (unless k_cmd_fp_dontkick is set). Value 0 falls back to a hardcoded default of 4 seconds.
>
> Range: 0-30 (clamped; 0 = effective 4).
>
> Default: 0 (effective 4 seconds).
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

`RegisterCvar("k_cmd_fp_per")` at `world.c:996`; no `cvar_toggle_msg` or `cvar_fset` site confirmed by grep. Consumed by `isCmdFlood()` at `commands.c:1198` as the time-window operand in the flood-trigger comparison. Consistent with the Shape 3 classification of siblings `k_cmd_fp_count` and `k_cmd_fp_disabled` already drafted.

### Proposed draft

```
Time window (in seconds) used by command flood protection. A player triggers flood protection when they issue k_cmd_fp_count commands within this many seconds.

Effect:
  0-30. 0 uses the built-in default of 4 seconds.
  Values above 30 are silently clamped to 30.

Permission:    server config only
Default:       0 (effective: 4 seconds)

See also: k_cmd_fp_count (paired command-count limit), k_cmd_fp_disabled (master on/off -- overrides this setting when 1), k_cmd_fp_for (lockout duration on flood), k_cmd_fp_kick (kick-warning threshold), k_fp (say flood protection -- distinct system)
```

### Notes

- No contradictions found. All claims in the existing description are source-verified against `world.c:1431-1432` (bound + 0-fallback) and `commands.c:1198` (flood-trigger comparison). Recast is a template migration (v1 to v2 shape) not a factual correction.
- Existing description prose includes a summary of the downstream siblings' behaviors (lockout duration, kick, dontkick). These belong on the sibling cards, not here. v2 recast strips them from the body; they remain accessible via See-also cross-links.
- Example omitted: value enum + Default makes invocation self-evident (`k_cmd_fp_per 6` in server.cfg). Consistent with `k_cmd_fp_count` sibling card.
- See-also at 5 entries (at cap). Mirrors the sibling card pattern: `k_cmd_fp_count` <-> `k_cmd_fp_per` are the natural pair; `k_cmd_fp_disabled` is the master override; `k_cmd_fp_for` and `k_cmd_fp_kick` are the consequence cvars; `k_fp` is the disambiguation anchor.
- Match-state omitted: server config cvar set at startup/map load via `FixCmdFloodProtect()`. No in-game toggle path; "any time" (server config) is omitted per v2 discipline.
- Step 1.5 check: `ModStatus2()` at `commands.c:2068` prints `k_cmd_fp_per` as part of the `status2` output. Display-only; no additional behavior to surface in the description.

---

## k_spm_color_rgba (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:885
- **Catalog line**: 16085
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Color and opacity tint for spawn-point marker entities. A space-separated string of floats: R G B [A], where each component is clamped to a minimum of 0.0 and a value of 1.0 leaves the channel unmodified. The alpha (fourth value) is optional; if omitted the markers render at full opacity. Requires at least three components; fewer than three leaves markers untinted.
>
> Default: "1.0 1.0 1.0 1.0" (no tint, full opacity).
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command). `RegisterCvarEx` in `world.c:885`; read once per marker entity created inside `Spawn_OnePoint()` at `items.c:2933`. No `cvar_toggle_msg` site, no `cvar_fset` cycle site, no engine-write site, no gate-read site. Set in server.cfg only.

The `k_spm_*` family (color_rgba / custom_model / glow / show) individually classify as Shape 3 per the worked-examples note. `k_spm_show` classifies as Shape 2 (paired with `spawn_show` cycle command) but that relationship lives on `k_spm_show`'s card; `k_spm_color_rgba` has no paired command of its own.

### Proposed draft

```
Color tint and opacity for spawn-point marker entities.

Effect:
  R G B [A] floats control the colormod and alpha of each marker.
  R/G/B each floored at 0.0 (negatives treated as 0.0); no upper limit on
  RGB (values above 1.0 are accepted and may brighten the model on
  supporting engines). Alpha clamped to [0.0, 1.0]; values above 1.0 are
  treated as 1.0.
  The tint is applied per-marker at creation time. Changing this cvar while
  markers are already visible has no effect until markers are next
  re-created (e.g. when spawn_show is cycled or the map reloads).
  On engines without colormod support the tint is silently ignored and
  markers appear untinted.

Prerequisites:
  Three components (R G B) are required; fewer leaves all markers untinted.
  Alpha (fourth component) is optional; if omitted, full opacity.

Permission:    server config only
Default:       "1.0 1.0 1.0 1.0" (no tint, full opacity)

Example:
  # server.cfg -- green-tinted semi-transparent markers
  k_spm_color_rgba 0.4 1.0 0.4 0.7

  # white markers with reduced opacity (default tint, visible alpha)
  k_spm_color_rgba 1.0 1.0 1.0 0.5

See also: k_spm_show (controls when markers are shown; cycles via spawn_show),
          k_spm_glow (adds engine glow effect to markers),
          k_spm_custom_model (changes marker model)
```

### Notes

- FLAG: Existing description says "each component is clamped to a minimum of 0.0". Source confirms the floor (`max(0.0f, ...)` in `ExtFieldSetColorMod`), but this description implies RGB has no ceiling -- which is correct. However, it also implies alpha has only a floor clamp. Source (`ExtFieldSetAlpha`, `g_syscalls_extra.c:17`) shows `alpha = bound(0.0f, alpha, 1.0f)` -- alpha is clamped to [0.0, 1.0], not merely floored. The v2 draft corrects this: alpha has both floor and ceiling; RGB has only a floor.
- Step 1.5 -- creation-time read: `Spawn_OnePoint()` reads the cvar once when creating each marker entity. Changing the cvar value mid-session does not retroactively update displayed markers; the change takes effect on the next `ShowSpawnPoints()` call (triggered by `spawn_show` cycle, map reload, hoony-mode spawn reassignment). This is a surprise-bearing behavior not in the existing description; added to Effect.
- Step 1.5 -- engine extension dependency: `ExtFieldSetColorMod` has a `HAVEEXTENSION` guard; if the engine does not support `MapExtFieldPtr + SetExtFieldPtr`, the colormod is silently skipped and markers appear without tint. Added to Effect as a silent-ignore clause.
- See-also capped at 3 (family siblings only). `k_spm_show` is the most load-bearing peer (controls whether markers appear at all; cycles via `spawn_show`). `k_spm_glow` and `k_spm_custom_model` are the remaining appearance-control siblings.
- Match-state omitted: server config cvar, set at startup. No in-game path.
- Example shows two realistic invocations to illustrate the RGB and alpha components together.

---

## k_spm_glow (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/items.c:3014
- **Catalog line**: 16145
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Adds a glow effect to spawn-point marker entities shown by the spawn-markers system.
>
> 0 = no glow on spawn markers.
> 1 = markers glow (red+green on deathmatch spawns; team-1 red and team-2 blue in CTF).
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config).

`RegisterCvarEx("k_spm_glow", "0")` in `world.c:883`. No `cvar_toggle_msg` site, no `cvar_fset` cycle, no `cvar_set` engine-write site. Pure read in `ShowSpawnPoints()` (`items.c:3014-3019`). Clean Shape 3.

### Proposed draft

```
Controls whether spawn-point markers glow with colored lights when the spawn-marker overlay is active.

0 = markers shown without glow (flat appearance).
1 = markers glow: deathmatch spawns with orange-yellow light (EF_RED + EF_GREEN combined); CTF team-1 spawns with red light; CTF team-2 spawns with blue light.

Prerequisites: k_spm_show must be 1 or 2 (spawn markers must be enabled). In HoonyMode duel, per-spawn glow is driven by spawn nominations instead of this setting.

Permission:  server config only
Default:     0

Example:
  k_spm_show 1
  k_spm_glow 1

See also: k_spm_show (prerequisite -- markers must be enabled for glow to be visible), k_spm_color_rgba (sibling -- tints marker appearance), k_spm_custom_model (sibling -- custom marker model)
```

### Notes

- The existing description describes the deathmatch glow as "red+green" -- technically accurate at the engine-flag level (`EF_GREEN | EF_RED`) but the rendered visual is an orange-yellow combined glow, not two separate lights. The v2 draft says "orange-yellow light (EF_RED + EF_GREEN combined)" to be user-helpful without stripping the source signal.
- Step 1.5: `k_spm_show` is a real prerequisite. `ShowSpawnPoints()` is only called when `SpawnShowStatus() > SPAWN_SHOW_DISABLED` (i.e., `k_spm_show > 0`). If `k_spm_show` is 0, no markers are drawn and `k_spm_glow` has no visible effect. Added to Prerequisites.
- Step 1.5: HoonyMode duel override. Inside `Spawn_SpawnPoints()` (`items.c:2977-2980`, `3002-3005`), when `isHoonyModeDuel()` is true, the `effects` argument passed in from `ShowSpawnPoints` is replaced per-spawn based on `e->hoony_nomination` (nominated = EF_GREEN|EF_RED, else 0). `k_spm_glow` is thus bypassed in HoonyMode duel. This is a surprise-bearing behavior for servers running HoonyMode. Added to Prerequisites.
- Match-state omitted: server config cvar, no in-game write path.
- See-also capped at 3 siblings. `k_spm_show` is load-bearing (prerequisite); `k_spm_color_rgba` and `k_spm_custom_model` are the remaining appearance siblings.


## k_extralog_xsd_uri (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1003
- **Catalog line**: 15749
- **Anchor**: v1.36-1633-g67253dc

### Current description

> URI written as the schema location into the extra match log's root element when k_extralog is active. Identifies the .xsd that validates the log format. Has no effect unless k_extralog is enabled.
>
> Default: "http://mirror.quakeworld.eu/pub/quakeworld/servers/ktx/ktxlog_0.1.xsd".
> Set by: server config.

### Shape classification

Shape 3: cvar with no paired command (set-once in config).

`RegisterCvarEx` in `world.c:1003`; one read site in `logs.c:123` (string interpolated into the XML root element as `xsi:noNamespaceSchemaLocation`); no `cvar_toggle_msg`, no `cvar_fset` cycle, no `cvar_set` engine-write site, no gate-read site. Classic set-once server config string cvar.

### Proposed draft

```
URI embedded as the schema location in the extra match log's XML root element when extra logging is active.

Effect: written as `xsi:noNamespaceSchemaLocation="<uri>"` in the `<ktxlog>` root element each time a new log file is opened at match start.

Prerequisites:
  - k_extralog must be enabled; without it, no log file is created and this URI is never written.
  - sv_local_addr must be set to a valid ip:port string; if absent, the log-open routine silently aborts regardless of k_extralog.

Permission:    server config only
Default:       "http://mirror.quakeworld.eu/ktx/ktxlog_0.1.xsd"

Example:
  # server.cfg -- point validators at a local or custom schema copy
  k_extralog 1
  k_extralog_xsd_uri "http://example.com/myserver/ktxlog_0.1.xsd"
  extralogname "logs/mymatch"

See also: k_extralog (master enable for extra logging), extralogname (sets the log file path)
```

### Notes

- FLAG: existing description default URL is `http://mirror.quakeworld.eu/pub/quakeworld/servers/ktx/ktxlog_0.1.xsd` but `world.c:1003` registers `http://mirror.quakeworld.eu/ktx/ktxlog_0.1.xsd` (no `/pub/quakeworld/servers/ktx/` path segment). Recast uses the source-verified value.
- Step 1.5: `sv_local_addr` silent abort. `StartLogs()` (`logs.c:100-104`) returns immediately if `sv_local_addr` is empty or lacks a colon+port -- no log file is opened and this URI is never written even with `k_extralog 1`. Added as a surprise-bearing prerequisite.
- `extralogname` added to See-also; it is the filename companion and is needed for the example to be actionable.
- Match-state omitted: server config cvar, no in-game write path.

---

## k_fp (KTX cvar, Server config & network -- Shape 2)

- **Status**: drafted
- **Source**: src/g_cmd.c:159 (FixSayFloodProtect, primary consumer) + src/g_cmd.c:193 (fp_toggle, cycle handler)
- **Catalog line**: 15808
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Selects the say/say_team flood-protection profile for players. Exceeding the message rate silences the player for the configured duration.
>
> 1 = Low: up to 9 messages per 1 second, silenced 1 second.
> 2 = Medium: 4 per 1 second, silenced 5 seconds.
> 3 = High: 5 per 3 seconds, silenced 7 seconds.
>
> Default: 1. Out-of-range values are clamped to 1-3.
> Set by: server config.

### Shape classification

Shape 2 (cvar + paired cycle command). `fp_toggle` in `g_cmd.c:211` writes back via `cvar_fset("k_fp", k_fp)` after incrementing and wrapping at `say_fp_levels_cnt` (3). The `fp` command is registered at `commands.c:963` as the paired cycle command. Shape catalog explicitly cites `k_fp + fp` as the canonical Shape 2 example.

### Proposed draft

```
Selects the say/say_team flood-protection preset applied to players.

1 = Low:    up to 9 messages per 1 second; excess silences for 1 second.
2 = Medium: up to 4 messages per 1 second; excess silences for 5 seconds.
3 = High:   up to 5 messages per 3 seconds; excess silences for 7 seconds.

Out-of-range values are clamped to 1-3.

Permission: server config, or 'fp' admin command in-game.
Default:    1 (Low).

Example:
  # server.cfg -- set flood protection to medium
  k_fp 2

  # or cycle through presets in-game with the fp admin command:
  fp

See also: fp (paired cycle command), k_fp_spec (spectator counterpart), k_cmd_fp_count / k_cmd_fp_per / k_cmd_fp_for (command flood-protection family -- distinct system).
```

### Notes

- Step 1.5: `fp_toggle` has NO `match_in_progress` early-return -- the preset can be changed mid-match (unusual for admin toggles). Match-state section omitted ("any time" is the rule).
- Step 1.5: `FixSayFloodProtect()` also issues a backward-compat `floodprot` engine command; this is internal and not user-actionable. Not surfaced in L1 (implementation detail).
- Existing description's "Set by: server config" was accurate but incomplete for Shape 2 -- the paired `fp` cycle command is the primary in-game mutation path and belongs in Permission. Added.
- See-also reciprocity: k_cmd_fp_* siblings have a See-also entry pointing here; this card returns the cross-link.
- `k_fp_spec` is the spectator counterpart (cycled by `fp_spec`); cross-linked in See-also for discoverability.
- Shape 5 direct-set escape: `k_fp 2` in Example demonstrates direct-set already; no separate See-also annotation needed beyond the example itself.


## k_maxspectators (KTX cvar, Server config & network -- Shape 3 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:990
- **Catalog line**: 15902
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the upper limit for spectator slots (maxspectators) when adjusted in-game via the spectator-count up/down controls. While no match is in progress, maxspectators can be raised or lowered but never above this value. Has no effect during a live match.
>
> Range: 1 and above (spectator slots).
>
> Default: see server config.
> Set by: server config.

### Shape classification

Shape 3 + Shape 4 (ceiling-gate cvar, parallel to k_maxclients).

Shape 3: no paired toggle or cycle command; `RegisterCvar("k_maxspectators")` in `world.c:990` with no default; set via server.cfg or mode init only. Shape 4: read inside `ChangeClientsCount(type=2, ...)` as a ceiling gate -- `upspecs` is refused when `cvar("maxspectators") >= cvar("k_maxspectators")`. This is the same composition as k_maxclients.

### Proposed draft

```
Sets the ceiling for in-game spectator slot adjustments -- `upspecs` cannot raise `maxspectators` above this value.

Effect:
  When `upspecs` is called, KTX checks whether `maxspectators` is already at or above `k_maxspectators`; if so, the command is refused ("maxspectators reached"). `downspecs` reads this value as a floor bound but is never blocked by it -- it can reduce `maxspectators` to a minimum of 1.

Permission:    server config only.
Default:       0 (no ceiling enforced at startup). Usermode presets apply `k_maxspectators 4` via common init -- servers running any usermode will have a ceiling of 4 unless overridden in server.cfg.

Example:
  # server.cfg -- allow up to 6 spectators, adjusted in-game by real admins
  k_maxspectators 6
  k_allowcountchange 1

See also: upspecs (command ceiling-gated by this), downspecs (also reads this for floor calc), k_allowcountchange (permission gate for both commands), k_maxclients (parallel ceiling for player slots)
```

### Notes

- Existing "Default: see server config" was not wrong but was incomplete. The `RegisterCvar` default is 0 (empty), but `common_um_init` in `commands.c:4201` applies `k_maxspectators 4` whenever any usermode preset is initialized -- in practice every server running a usermode gets a ceiling of 4. The v2 draft surfaces this explicitly.
- Existing description's match-state framing ("Has no effect during a live match") describes the behavior of the upspecs/downspecs commands, not the cvar itself. Moved to the command cards; the cvar's Permission stays as server config only.
- The "Range: 1 and above" claim is indirectly enforced via `bound(1, current - 1, max(1, k_maxspectators))` in downspecs, not by a direct validation on the cvar. Not propagated literally into the v2 draft; the Effect bullets cover the behavioral floor (minimum 1 on downward adjustment).
- See-also cap: 4 entries (upspecs / downspecs / k_allowcountchange / k_maxclients). Within the 4-5 limit.

---

## timing_players_action (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:848
- **Catalog line**: 16301
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Bitmask controlling how the server reacts to a player who is timing out (lagging beyond timing_players_time). Bits combine additively.
>
> 1 = info: broadcast "WARNING: <player> is timing out!" and "<player> is back from lag" on return.
> 2 = glow: give the lagged player a visible glow effect while flagged.
> 4 = invincible: make the lagged player non-interactive (no damage taken, frozen) and restore them when lag clears.
>
> Default: 0. Requires allow_timing to be enabled.
> Set by: server config.

### Shape classification

Shape 3 -- cvar with no paired command (set-once in server config).

`RegisterCvar("timing_players_action")` in `world.c:848` with no explicit default. No `cvar_toggle_msg` site, no `cvar_fset` cycle, no gate-command read. The cvar is read in `CheckTiming()` and `BackFromLag()` in `client.c` to configure bitmask-driven lag response behavior. Straightforward Shape 3.

### Proposed draft

```
Bitmask that controls what the server does when a player lags beyond the timing_players_time threshold. Bits combine additively.

Effect:
  1 (info): broadcasts "WARNING: <player> is timing out!" to all players at lag onset, then repeats every 20 seconds while the player stays lagged; broadcasts "<player> is back from lag" when connection recovers.
  2 (glow): applies a dim-light glow effect to the lagged player while they are flagged as timing out.
  4 (invincible): on lag onset, freezes the player in place (removes damage, collision, and movement) and restores damage + collision on recovery. Velocity is zeroed at freeze and is NOT restored on recovery -- the player returns interactive but stationary.

Prerequisites: allow_timing must be set to 1.

Permission:    server config only
Default:       0 (no lag response actions).

Example:
  # server.cfg -- broadcast + glow, no freeze
  allow_timing 1
  timing_players_time 6
  timing_players_action 3

See also: allow_timing (master enable), timing_players_time (lag threshold that triggers this cvar's actions)
```

### Notes

- FLAG: Existing description says "restore them when lag clears" for bit 4. Source (`BackFromLag()`, `client.c:3128-3133`) restores `takedamage`, `solid`, and `movetype`, but velocity was zeroed at onset via `SetVector(p->s.v.velocity, 0, 0, 0)` with an inline comment "speed is zeroed and not restored" (`client.c:172`). The v2 draft surfaces this explicitly. Apply-pass-author should verify this is still accurate against the anchor commit.
- The 20-second warn repeat is source-verified (`client.c:151`: `if (firstTime || ((p->k_timingWarnTime + 20) < g_globalvars.time))`). The existing description omits this; added to the v2 Effect for bit 1.
- Bit 8 (autokpause): appears in some shipped ktx.cfg comments but does NOT exist in source. The `TA_ALL` mask is `(TA_INFO | TA_GLOW | TA_INVINCIBLE)` = bits 0-2 only; higher bits are silently masked. Bit 8 has no effect in source. The v2 draft correctly omits it. Apply-pass-author: if ktx.cfg comment is in scope for correction, note that bit 8 is a phantom -- consult the timing trilogy note before making upstream changes.
- Part of the timing trilogy: `allow_timing` (master enable, Shape 3) + `timing_players_time` (threshold, Shape 3) + `timing_players_action` (response bitmask, this card). allow_timing was drafted Shape 3 by the batch dispatcher.
- See-also: 2 entries (`allow_timing`, `timing_players_time`). Both are direct Prerequisites-class peers. Within the 4-5 cap.

## timing_players_time (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:847
- **Catalog line**: 16333
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Time in seconds a player must be lagging (no network activity) before the server applies the timing_players_action effects. Clamped to 0-30; a value of 0 falls back to 6 seconds. Requires allow_timing to be enabled.
>
> Range: 0 to 30 (seconds). 0 = use built-in default of 6.
>
> Default: 0 (effective 6 seconds).
> Set by: server config.

### Shape classification

Shape 3 -- cvar with no paired command, set-once in server config.

`RegisterCvar("timing_players_time")` in world.c with no default argument (default = 0). No `cvar_toggle_msg` site, no `cvar_fset` cycle site. Sole consumer is `CheckTiming()` in `client.c`, called every frame from `StartFrame`. The cvar is a configuration threshold; no inter-entity command pairing. Sibling of `allow_timing` and `timing_players_action` in the timing trilogy; those are Shape 3 peers, not a structural shape -- cross-linked via See-also.

### Proposed draft

```
How long a player must go without any server-side frame activity before the timing detection fires. Part of the timing trilogy with allow_timing and timing_players_action.

Effect:
  Sets the silence window (in seconds). When a connected player's last processed frame timestamp is more than this many seconds behind the server clock, CheckTiming classifies them as lagging and triggers the actions configured in timing_players_action.

Prerequisites: allow_timing must be enabled -- when allow_timing is 0, CheckTiming returns immediately and this value has no effect.

Permission:    server config only
Default:       0 (effective 6 seconds -- setting 0 applies the built-in 6-second fallback, not "disabled"; use allow_timing 0 to disable timing detection entirely).

Example:
  # server.cfg
  allow_timing 1
  timing_players_time 10       // flag as lagging after 10 seconds of silence
  timing_players_action 7      // apply info + glow + invincibility on detection

See also: allow_timing (master enable for the timing system), timing_players_action (bitmask controlling what happens on detection)
```

### Notes

- Clean recast. All claims in the existing description are source-verified.
- The 0→6 fallback is the primary surprise; moved to the Default line with explicit "not disabled" clarification. Setting 0 expecting to suppress timing behavior is a plausible server-admin mistake -- `allow_timing 0` is the correct suppression path.
- Range (0-30) is implicit in the Default and the `bound(0, ..., 30)` clamp; not restated as a separate Range: line (v1 pattern, removed in v2).
- Part of the timing trilogy: `allow_timing` (master enable) + `timing_players_time` (this card, threshold) + `timing_players_action` (response bitmask). allow_timing was drafted Shape 3 master; timing_players_action was drafted Shape 3 with drafted_with_flag.
- See-also: 2 entries. Both are direct peers in the trilogy; within the 4-5 cap.

## k_random_maplist (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:790
- **Catalog line**: 16054
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether the server picks the next map sequentially or at random from the configured map cycle (k_ml_0, k_ml_1, ...).
>
> 0 = advance through the map list in order, respecting each entry's min/max player requirements.
> 1 (non-zero) = pick the next map at random from the list, retrying a few times to avoid repeating the current map.
>
> Default: not enforced by registration (no default value set).
> Set by: server config.

### Shape classification

Shape 3 (cvar, no paired command, set-once in server config).

`RegisterCvar("k_random_maplist")` in `world.c:790` with no default value (engine default 0). Single read use-site in `SelectMapInCycle()` (`maps.c:643`) as a gate: when non-zero, redirects to `SelectRandomMap()` instead of the sequential scan. No `cvar_toggle_msg` or `cvar_fset` site -- no paired command at all. Not Shape 4 (the cvar doesn't gate a user-visible command; it redirects an internal selection algorithm). Layer B = Shape 3.

### Proposed draft

```
Whether the server selects the next map randomly or advances through the cycle in order at end of match.

Effect:
  0 = sequential: advance through k_ml_0, k_ml_1, ... in order; each entry's min/max player requirements
      (k_ml_minp_N, k_ml_maxp_N) are checked and entries whose requirements aren't met are skipped.
  1 = random: pick uniformly at random from all populated k_ml_N entries; up to 5 retries to avoid
      repeating the current map. Player-count requirements on individual entries are NOT checked --
      any map in the list may be selected regardless of current player count.

Default: 0.

Permission: server config only.

Example:
  set k_random_maplist 1   // in server.cfg, alongside the map pool:
  set k_ml_0 dm6
  set k_ml_1 dm4
  set k_ml_2 dm2
  set k_ml_3 ztndm3

See also: k_ml_0 (first map in the cycle; format for the pool), k_ml_minp_0 / k_ml_maxp_0
          (per-entry player requirements, only enforced in sequential mode)
```

### Notes

- Clean recast. All claims in the existing description are source-verified.
- Key behavioral delta added: the random path (`SelectRandomMap`, `maps.c:584`) bypasses the per-entry min/max player checks that the sequential path enforces. The existing description's "0 = advance through the map list in order, respecting each entry's min/max player requirements" implied (correctly) that the sequential path respects them, but didn't surface the corollary that the random path does NOT. Added explicitly under the `1 =` bullet.
- Retry behavior (up to 5 attempts to avoid the current map) confirmed from `maps.c:607` (`for (c = 0; c < 5; c++)`). If all 5 picks land on the current map (only possible on a very short list), the last attempt is returned regardless. Not surfaced as a separate caveat -- the existing "retrying a few times" phrasing was adequate and the edge case is rare.
- Default phrasing in existing description ("not enforced by registration") was awkward; corrected to `Default: 0` (the engine default when no argument to `RegisterCvar`).
- See-also: 2 entries. `k_ml_0` anchors the pool format; the minp/maxp family is the load-bearing peer because the player-count bypass in random mode is the primary behavioral surprise. Within the 4-5 cap.

---

## downplayers (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:981
- **Catalog line**: 16419
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command that decrements the server's player slot count (maxclients) by 1 each time it is run. The new value is clamped to the range 1..k_maxclients. Refused while a match is in progress; permission level controlled by k_allowcountchange. Broadcasts the new count when changed. (Counterpart of upplayers.)
>
> Set by: admin command in-game.

### Shape classification

`shape-less` -- command-side lever for the k_maxclients ceiling-gate relationship. Per the shape-less lever discipline in the shape catalog: the shape tag lives on the cvar (k_maxclients); the command is the knob. Same pattern as forcemap → k_entityfile (Shape 9a lever). No own inter-entity relationship to tag; cross-links in See-also.

### Proposed draft

```
Decrements the server's player slot limit (maxclients) by 1 each time it is run.

Effect:
  Lowers maxclients by 1, broadcasting the new count to all players.
  The new value is clamped to the range [1, k_maxclients]; cannot go below 1.
  Silently no-ops if clamped value equals the current value (already at floor).
  Refused silently while a match is in progress.

Prerequisites: k_allowcountchange must be set to 1 or 2. The default value (0) blocks everyone -- the command is a no-op on a fresh server until k_allowcountchange is explicitly configured.

Permission:    Controlled by k_allowcountchange: 1 = real admin only, 2 = any admin.
Match-state:   Pre-match only.

Example:
  # server.cfg -- set the ceiling and permission level:
  k_maxclients 8
  k_allowcountchange 2
  # In-game, step down one slot at a time:
  downplayers

See also: upplayers (counterpart -- increments maxclients), k_maxclients (slot ceiling), k_allowcountchange (permission gate for both commands), downspecs (same operation for spectator slots)
```

### Notes

- shape-less verdict per lever discipline: the cvar-relationship shape (k_maxclients + ceiling gate) lives on the k_maxclients card; downplayers is the knob. No Layer B tag on this card.
- Key behavioral addition: k_allowcountchange defaults to 0 (blocked for everyone). The existing description mentioned the permission gate but did not call out that the default leaves the command disabled. This is surprise-bearing and user-actionable -- surfaced in Prerequisites.
- CF_PLAYER | CF_SPC_ADMIN registration: the existing "admin command" framing is functionally correct (only admins can pass the check_perm gate in practice), but the actual permission is entirely determined by k_allowcountchange, not the CF flags. The recast makes this explicit.
- Silent no-op at floor: source line 8048-8051 -- if `bound(1, maxclients-1, max(1,k_maxclients))` equals `maxclients` (already at 1), the handler returns without broadcasting. Not in existing description; added as an Effect bullet.
- Sibling `downspecs` uses the same handler (type=2) for spectator slots. Cross-linked in See-also.
- `upplayers` card (next in this batch) is the symmetric counterpart; both share k_allowcountchange as the gate.

---

## upplayers (KTX command, Server config & network -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:980
- **Catalog line**: 17010
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Raises the server's player-slot count (maxclients) by one, up to k_maxclients. Broadcasts the new value when applied. Refused during a live match, when k_allowcountchange is not set, or when maxclients already equals k_maxclients ("maxclients reached").
>
> Set by: any in-game player, or an admin spectator (rcon or elected).

### Shape classification

`shape-less` -- command-side lever for the k_maxclients ceiling-gate relationship. Per the shape-less lever discipline: the shape tag lives on the cvar (k_maxclients); the command is the knob. Mirror of `downplayers` (same handler `ChangeClientsCount`, opposite increment). No own inter-entity relationship to tag; cross-links in See-also.

### Proposed draft

```
Increments the server's player slot limit (maxclients) by 1 each time it is run.

Effect:
  Raises maxclients by 1, broadcasting the new count to all players.
  The new value is clamped to [1, k_maxclients]; refused with "maxclients reached" if maxclients already equals k_maxclients.
  Silently no-ops if clamped value equals the current value.
  Refused silently while a match is in progress.

Prerequisites: k_allowcountchange must be set to 1 or 2. The default value (0) blocks everyone -- the command is a no-op on a fresh server until k_allowcountchange is explicitly configured.

Permission:    Controlled by k_allowcountchange: 1 = real admin only, 2 = any admin.
Match-state:   Pre-match only.

Example:
  # server.cfg -- set the ceiling and permission level:
  k_maxclients 8
  k_allowcountchange 2
  # In-game, step up one slot at a time:
  upplayers

See also: downplayers (counterpart -- decrements maxclients), k_maxclients (slot ceiling), k_allowcountchange (permission gate for both commands), upspecs (same operation for spectator slots)
```

### Notes

- FLAG: existing "Set by: any in-game player, or an admin spectator (rcon or elected)" is incorrect. The CF_PLAYER flag nominally allows any player to invoke the command, but the real gate is `check_perm(self, cvar("k_allowcountchange"))`. With k_allowcountchange=0 (default), `check_perm` case 0 blocks everyone. With k_allowcountchange=1, only real admins pass; with value=2, any admin passes. Value=5 allows anyone. The existing "any in-game player" framing overstates who can actually use it on a configured server. Recast Permission line reflects the actual check_perm gate.
- shape-less verdict per lever discipline: the cvar-relationship shape (k_maxclients + ceiling gate) lives on the k_maxclients card; upplayers is the knob. Same pattern as downplayers.
- k_allowcountchange default=0 blocks everyone. This is surprise-bearing (the command registers as CF_PLAYER but silently fails for everyone until the server operator configures it). Surfaced in Prerequisites, consistent with downplayers card treatment.
- "maxclients reached" message confirmed at src/commands.c:8041; the existing description already captures this correctly.
- Silent match-in-progress refusal confirmed at src/commands.c:8022-8025 (no message printed, just returns).
- `upspecs` at line 982 uses the same handler (`DEF(upplayers)`) with arg=2, operating on maxspectators/k_maxspectators instead. Cross-linked as the parallel spectator-slot operation.
- Broadcast is G_bprint (server-wide), not private -- all connected players see the new count. Existing description already noted this; preserved in Effect.

---

## exclusive (KTX command, Server config & network -- Shape 1)

- **Status**: drafted
- **Source**: src/commands.c:1000
- **Catalog line**: 16473
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Toggles exclusive mode (k_exclusive) and announces the new state to all players. Has no effect while a match is in progress.
>
> 0 = anyone may join (subject to maxclients).
> 1 = new player joins are refused once the player count reaches k_attendees; latecomers may only connect as spectators.
>
> Set by: admin command 'exclusive' (toggle).

### Shape classification

Shape 1 -- cvar + paired toggle command, command side.

Handler `ToggleExclusive()` at `commands.c:8613` calls `cvar_toggle_msg(self, "k_exclusive", redtext("exclusive mode"))` -- the defining Shape 1 signal. Registration `CF_BOTH_ADMIN` at `commands.c:1000`. `match_in_progress` early-return (no mode-check) -- Shape 1 base, not 1c. No additional facets (no vote gate, no enable-gate cvar).

Per session-2 pair-tag discipline: both `exclusive` (command) and `k_exclusive` (cvar) carry the Shape 1 pair tag jointly.

### Proposed draft

```
Admin command that toggles exclusive mode (k_exclusive).

Effect: Flips k_exclusive between 0 and 1 and broadcasts the new state to all players.

Permission:  any admin
Match-state: pre-match only

Example:
  exclusive            (toggles exclusive on or off)

See also: k_exclusive (paired cvar -- controls whether new players may join mid-match)
```

### Notes

- Value enum (0/1 + join-gate behavior) belongs on the k_exclusive cvar card per Shape 1 command-side discipline. Removed from this card.
- Existing description references "k_attendees" as if it were a user-settable cvar threshold. Verified: k_attendees is a runtime float (globals.c:27), set at match-start to CountPlayers(). It is not user-configurable. Removed from command card -- cvar card should describe the gate mechanism without implying k_attendees is user-facing.
- Match-state: silent no-op during match (no message to admin; `if (match_in_progress) { return; }`). "pre-match only" in Match-state line covers this; no extra prose needed.
- Broadcast confirmed: cvar_toggle_msg calls G_bprint -- server-wide visibility of toggle.
- CF_BOTH_ADMIN definition: `CF_PLR_ADMIN | CF_SPC_ADMIN` (g_local.h:652) -- admin rights required for both player and spectator slots. Permission "any admin" is accurate.

## fpslist (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:844 (handler at :5478)
- **Catalog line**: 16530
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints a per-player framerate table to the issuer: current, maximum, minimum, and average FPS for each connected player, derived from their reported frame times. Reports "No players present" when empty.
>
> Set by: n/a (read-only command).

### Shape classification

shape-less -- pure standalone state-printer. No cvar pairing, no sibling family relationship, no election/gate/side-channel role. Handler reads per-player accumulated frame-time fields (written each server frame by PlayerPreThink) and prints a formatted table to the caller. Analogous to `about` / `status1` from the shape catalog's standalone-state-printer examples.

### Proposed draft

```
Prints a per-player FPS table to the caller -- current, peak, lowest, and average frame rates for each connected player. Reports "No players present" if no players are on the server.

Permission:    any player or spectator

Example:
  fpslist

See also: status1 (server/match state report), scores (score/stats report)
```

### Notes

- Existing description is accurate; recast removes the v1 "Set by: n/a" line and restructures to v2 Permission slot.
- CF_BOTH confirmed: available to players and spectators. CF_MATCHLESS confirmed: available any time (mid-match and pre-match); Match-state line omitted per v2 discipline (collapses when "any time").
- "Peak" replaces "maximum" for cur/max/min terminology alignment with source naming (`fLowestFrameTime` = shortest interval = highest/peak FPS). Functionally equivalent to the existing "maximum" wording.
- The frame-time accumulator resets every ~15 seconds (ZeroFpsStats in PlayerPreThink); stats represent a rolling window, not session-lifetime. This is an implementation detail that does not change the user's action plan; not surfaced in L1.
- Output is private to caller (G_sprint, not G_bprint).
- No Example line in the source-facing command table (CD_FPSLIST = "fps list" -- only a label). Example in draft is minimal (bare invocation) per v2 discipline for trivial standalone printers.

---

## status2 (KTX command, Server config & network -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:711
- **Catalog line**: 16924
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints a second page of server settings to your console. Always shows: respawn model, game mode (duel / FFA / CTF / team), spectalk on/off, and the overtime setting (off / N-minute / sudden death / tie-break / golden frag).
>
> In CTF or team modes: also shows the server-locking mode (off / team / all). In CTF: additionally shows hook, runes, and grappling-hook allowed states.
>
> Outside a match: also shows current team-count info (current / min / max teams).
>
> Set by: 'status2' command (any player or spectator).

### Shape classification

Shape-less. `status2` is a pure read-only state printer: a `G_sprint` panel printing live cvar and server-state values, with no cvar/command pair relationship, no vote mechanism, no dispatch table, no gate, and no side effects. Same classification as `status1` (sibling). The catalog explicitly excludes state-report commands from Shape 10 (they are not curated-family help-printers). Shape-less: apply v2 universal shape without a Layer B tag.

`status1` and `status2` display meaningfully different content (different fields, different conditional logic). Canonical-card pattern does not apply; each gets a full card with a See-also cross-link.

### Proposed draft

```
Prints the second page of current server settings.

Effect:
  Always displayed:
    Respawn model (k_spw)
    Server mode: duel / FFA / CTF / team (or "unknown")
    Spectalk: on / off (k_spectalk)
    Overtime: off / N-minute / sudden death / N tie-break / golden frag (k_overtime + k_exttime)
    QiZmo lag: on/off           (fpd bit 8)
    QiZmo timers: on/off        (fpd bit 2)
    QiZmo enemy reporting: on/off (fpd bit 32)
    QiZmo pointing: on/off      (fpd bit 128)
    Admin election: allowed / not allowed (k_allowvoteadmin)
    Check frametimes: enabled / disabled (framechecks)
    Prewar: players may not fire / may fire / may fire and jump (k_prewar)
    Command floodprot: off, or N commands per M sec with kick-after-W-warnings

  Shown only in CTF or team mode:
    Server locking: off / team / all (k_lockmode)

  Shown only in CTF mode:
    CTF settings: hook on/off, runes on/off, green armor on/off (k_ctf_hook / k_ctf_runes / k_ctf_ga)

  Shown only while no match is in progress:
    Teaminfo: current / min / max teams (k_lockmin, k_lockmax)

  Shown only when server is temporarily locked:
    server is temporary locked: N seconds remaining (k_sv_locktime)

Permission:  any player or spectator

Example:     status2

See also: status1 (first page -- maxspeed, deathmatch mode, teamplay, time/frag limits, powerups, discharge, and live match state)
```

### Notes

- FLAG: Existing description says "grappling-hook allowed states" for the third CTF field. Source at commands.c:1959 shows the field is `k_ctf_ga`, and ctf.c:802 confirms `k_ctf_ga` controls "green armor" (not a grappling hook -- that is `k_ctf_hook`, the first CTF field). The v2 draft corrects this to "green armor on/off."
- FLAG: Existing description covers only 5 of the ~13 display sections (respawn model, game mode, spectalk, overtime, and the mode-conditional lock/CTF/teaminfo fields). Missing always-shown fields: QiZmo settings (4 fpd-bit flags), Admin election allowed, Frametime checks, Prewar behavior, Command floodprot detail, and the conditional temporary-lock countdown. The v2 draft surfaces all source-verified fields.
- CF_BOTH | CF_MATCHLESS confirms: any player or spectator, any time (including matchless mode). Match-state line omitted per v2 discipline (collapses when "any time").
- The tie-break overtime format shows `N tie-break` where N comes from `tiecount()` -- a live counter reflecting current tiebreak depth. N can be > 1 for repeated ties.
- QiZmo settings are read from `iKey(world, "fpd")` (the world entity's `fpd` serverinfo key), not from k_* cvars. The four bits displayed by status2 match the qizmo/qlag/qenemy/qpoint family.
- The "Command floodprot" block is compound: if `k_cmd_fp_disabled` is set, it prints "off"; otherwise it prints the N/M/kick thresholds. Whether it kicks or just warns depends on `k_cmd_fp_dontkick`. The v2 draft captures this as a single compound line without replicating all k_cmd_fp_* sub-cvars inline (their own cards carry those details).
- `framechecks` is a C variable, not a k_* cvar -- it reflects the server's frametime-checking state. Displayed as "enabled/disabled" via the `Enabled()` macro.
- Cross-link: status1 See-also already references status2. This card's See-also mirrors back.
