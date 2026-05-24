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

---

## k_cmd_fp_dontkick (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:999
- **Catalog line**: 15513
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether players who repeatedly flood the server with commands are kicked, in addition to being warned and locked out. Applies to command flood protection only (not say/chat flood -- see k_fp).
>
> 0 = flooders are warned, locked out, and eventually kicked.
> 1 = flooders are warned and locked out, but never kicked.
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 -- cvar with no paired command (set-once in server config). `RegisterCvar("k_cmd_fp_dontkick")` in `world.c:999`; no `cvar_toggle_msg`, no `cvar_fset`, no cycle handler. Consumed as a gate at `commands.c:1204` (`if (!k_cmd_fp_dontkick) { ... kick block ... }`) inside `isCmdFlood`. Classic Shape 3.

### Proposed draft

```
Controls whether command flood protection can kick players. When enabled, flooders receive the base lockout (k_cmd_fp_for) but the kick-warning countdown and eventual disconnect are suppressed.

Effect:
  0 = kick progression active: each flood trigger issues a warning countdown ("X warnings to kick") and eventually disconnects the player after k_cmd_fp_kick violations.
  1 = kicks suppressed: flooders receive the "You are a command flooder man!" notification and lockout only -- no kick-warning progression, no disconnect.

Note: affects only command-rate flooding. Say and chat flood protection is a separate system controlled by k_fp.

Permission:    server config only
Default:       0

See also: k_cmd_fp_kick (kick-warning threshold that dontkick suppresses), k_cmd_fp_disabled (master on/off -- if 1, dontkick is moot), k_cmd_fp_count (command-count trigger threshold), k_fp (say flood protection -- distinct system)
```

### Notes

- Step 1.5 split: source shows two distinct notification paths. The unconditional "You are a command flooder man!" message at `commands.c:1200` fires regardless of dontkick; the kick-countdown progression ("X warnings to kick" etc.) at `commands.c:1208-1213` is entirely inside the `if (!k_cmd_fp_dontkick)` gate. The v2 draft names the unconditional notification explicitly on the value-1 side, making the behavioral split unambiguous. No factual contradiction with the existing description; it was technically accurate but imprecise on which message fires when.
- D7-tail divergence noted in catalog metadata: ktx-repo `ktx.cfg` ships value 0, nquake-distfiles `ktx.cfg` ships value 1 -- shipped-default divergence across config sources. The canonical default per `RegisterCvar` is 0; the v2 Default line states the engine default. The cfg-shipped divergence is a D7 operator concern, not L1 description content; not surfaced in the recast body.

---

## k_cmd_fp_for (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:997
- **Catalog line**: 15544
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Lockout duration (in seconds) applied when a player trips the command flood limit. Commands are blocked for this many seconds.
>
> Range: 0-30. Value 0 uses the built-in default of 5 seconds.
>
> Default: 0 (effective 5 seconds).
> Set by: server config only.

### Shape classification

Shape 3 -- cvar with no paired command. `RegisterCvar("k_cmd_fp_for")` in `world.c:997`; no `cvar_toggle_msg`, no `cvar_fset` cycle. Consumed as a duration parameter by `isCmdFlood` at `commands.c:1202` (`p->fp_c.locked = g_globalvars.time + k_cmd_fp_for`).

### Proposed draft

```
How long a player is locked out of console commands after tripping command flood protection.

Effect:
  0-30 (seconds). 0 applies the built-in 5-second fallback.
  Values above 30 are silently clamped to 30.
  On a flood trigger, isCmdFlood stamps the player's lockout expiry to (now + k_cmd_fp_for). Subsequent commands while still locked return "command floodprot (N sec)" showing the remaining lockout window. Each new flood event while locked re-stamps the expiry from the new trigger time, so repeated flooding extends the lockout.

Permission:    server config only
Default:       0 (effective 5 seconds -- setting 0 applies the built-in 5-second fallback, not "no lockout")

See also: k_cmd_fp_count (command-count trigger threshold), k_cmd_fp_per (time-window width), k_cmd_fp_kick (kick-warning threshold after repeated lockouts), k_cmd_fp_dontkick (suppresses kicks while keeping lockouts active), k_fp (say flood protection -- distinct system)
```

### Notes

- 0->5 fallback surfaced in Default line with explicit "not 'no lockout'" note -- same pattern as `timing_players_time` (0->6 fallback) and `k_motd_time` (0->mode-dependent fallback).
- Step 1.5 gain: re-flooding while locked re-stamps the expiry from the new trigger time (not from lockout start). User-observable and changes tuning calculus for aggressive flooders. Surfaced in Effect.
- See-also at 5 entries (at cap). k_cmd_fp_disabled omitted from this card (its relationship to k_cmd_fp_for is "if disabled=1 this cvar is moot" -- covered adequately by the disabled card; including it here would push to 6).
- Example omitted: consistent with all four drafted siblings (value enum + Default is self-evident).

---

## k_cmd_fp_kick (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:998
- **Catalog line**: 15574
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Number of command-flood warnings a client receives before being kicked from the server. Applies to command flooding only (not chat/say flooding, which is governed by k_fp). Ignored entirely when k_cmd_fp_dontkick is set.
>
> Range: 0-10. Value 0 falls back to a built-in default of 4 warnings.
>
> Default: 0 (effective 4 warnings).
> Set by: server config.

### Shape classification

Shape 3 -- cvar with no paired command. `RegisterCvar("k_cmd_fp_kick")` in `world.c:998`; consumed as a kick-threshold counter inside the dontkick-gated kick block at `commands.c:1206-1223`.

### Proposed draft

```
How many times a player trips command flood protection before being kicked from the server.

Effect:
  0-10 (warnings before kick). 0 applies the built-in 4-warning fallback.
  Values above 10 are silently clamped to 10.
  Each flood trigger increments the player's warning counter. At (k_cmd_fp_kick - warnings) > 1: the player sees "N warnings to kick". At == 1: "next time you will be kicked". When the counter exceeds the threshold: server broadcasts the kick, the player receives "Go away!", and is disconnected.
  The warning counter is per-player and persists across lockout cycles -- repeated offenses without a server restart accumulate toward the kick threshold even if the player waits out each lockout.

Prerequisites: k_cmd_fp_dontkick must be 0. When dontkick is 1, the entire kick-warning progression and disconnect are suppressed regardless of this setting.

Permission:    server config only
Default:       0 (effective 4 warnings -- setting 0 applies the built-in 4-warning fallback, not "no kick threshold")

See also: k_cmd_fp_dontkick (suppresses kicks entirely -- makes this cvar moot when set to 1), k_cmd_fp_disabled (master on/off for all command flood protection), k_cmd_fp_for (lockout duration per flood trigger), k_cmd_fp_count (command-count trigger threshold), k_fp (say flood protection -- distinct system)
```

### Notes

- Two Step 1.5 precision gains: (1) the warning counter persists across lockout cycles -- waiting out a lockout does not reset accumulated warnings; (2) the three-phase countdown sequence is now named explicitly ("N warnings to kick" / "next time you will be kicked" / broadcast + kick).
- dontkick interaction promoted to Prerequisites (load-bearing suppression relationship).
- 0->4 fallback "not 'no kick threshold'" note follows the sibling pattern.

---

## k_defmap (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:852
- **Catalog line**: 15634
- **Anchor**: v1.36-1633-g67253dc

### Current description

> The server's home map. When the last player leaves, the server changes to this map.
>
> Default: "" (empty; server stays on current map if unset).
> Set by: server config only.

### Shape classification

Shape 3 -- cvar with no paired command. `RegisterCvar("k_defmap")` in `world.c:852`; consumed by `CheckDefMap()` at `world.c:107-118` (periodic empty-server check) and `vote.c:1156` (bloodfest coop-vote reset target). No `cvar_toggle_msg`, no `cvar_fset`, no paired command.

### Proposed draft

```
The map the server returns to when all human players have left.

Effect:
  When the server becomes empty (or bot-only), KTX waits up to ~90 seconds then
  changes to k_defmap if the current map differs. If k_defmap is empty, the server
  reloads the current map instead (or the current map in intermission).
  On bloodfest servers, k_defmap also sets the destination when a coop vote is
  un-voted (coop off under k_bloodfest).

Prerequisites:
  - k_lockmap must be 0 (off). If map lock is active, CheckDefMap exits immediately
    and the server stays on the current map regardless of k_defmap.
  - Matchless mode suppresses the home-map check entirely (except in CTF). On a
    matchless non-CTF server, k_defmap has no effect.

Permission:    server config only
Default:       "" (empty). When empty, server reloads the current map on vacancy
               rather than changing to a home map.

Example:
  # server.cfg
  k_defmap dm4   ; return to dm4 when server goes empty

See also: k_lockmap (admin toggle that suppresses this cvar's changelevel),
          k_matchless (matchless-mode flag that disables home-map switching),
          k_bloodfest (secondary consumer of k_defmap on coop-vote reset)
```

### Notes

- Four Step 1.5 gains over the existing description: (1) `k_lockmap` gates `CheckDefMap()` at `world.c:112` -- when lock is active, the entire changelevel is skipped; (2) matchless mode (non-CTF) prevents `Spawn_DefMapChecker` from scheduling at all (`world.c:139`); (3) `vote.c:1156` is a genuine secondary consumer (bloodfest coop-uncheck destination); (4) bot-only case fires when `player_count == bot_count` (not only at zero players).

---

## k_force_mapcycle (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:803
- **Catalog line**: 15777
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Forces the server to follow the map cycle on level change even when deathmatch is 0. Normally the map cycle is only used when deathmatch is non-zero. Has no effect when samelevel is set (samelevel always keeps the current map regardless).
>
> 0 = off (map cycle requires deathmatch non-zero).
> 1 = map cycle is followed even when deathmatch is 0.
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 -- cvar-only, set-once in server.cfg. `RegisterCvar` at `world.c:803`; consumed at `client.c:580` in the post-intermission level-select path (`if (deathmatch || cvar("k_force_mapcycle")) SelectMapInCycle(...)`). The gate lives inside `GotoNextMap()` (engine-internal), not in a command handler -- so this is Shape 3, not Shape 4.

### Proposed draft

```
Controls whether the server advances through the map cycle on level change even when deathmatch is 0.

Without this enabled, the map cycle is only consulted when deathmatch is non-zero. Servers running deathmatch 0 (cooperative or singleplayer style) will not advance through the cycle unless this cvar is set.

0 = map cycle requires deathmatch non-zero (default behavior).
1 = map cycle is followed on level change regardless of deathmatch.

Has no effect when samelevel is active -- samelevel always returns to the current map and the cycle is never consulted.

Permission:  server config only
Default:     0

Example:
  // server.cfg -- run map cycle on deathmatch 0 server
  set k_force_mapcycle 1

See also: k_random_maplist (whether the cycle advances sequentially or randomly once active), mapcycle (command to view or reload the map cycle list), samelevel (takes precedence over this cvar)
```

### Notes

- Clean v1->v2 mechanical recast; existing description was factually correct throughout.
- Step 1.5: `SelectMapInCycle` reads `k_random_maplist` first when it runs -- added to See-also as the behavioral neighbor a deathmatch 0 server operator would want to find.
- `samelevel` precedence verified: `client.c:557-575` shows `samelevel` checked in its own branch before the `deathmatch || k_force_mapcycle` test.

---

## k_fp_spec (KTX cvar, Server config & network -- Shape 2)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1008
- **Catalog line**: 15840
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Flood-protection profile for spectator chat (the spectator counterpart of k_fp). Selects one of three presets that limit how many messages a spectator can send before being silenced.
>
> 1 = up to 9 messages per second; silence 1 second.
> 2 = up to 4 messages per second; silence 5 seconds.
> 3 = up to 5 messages per 3 seconds; silence 7 seconds.
>
> Default: 3.
> Set by: server config or 'fp_toggle' admin command in-game (cycles 1-3).

### Shape classification

Shape 2 -- cvar + paired cycle command. The user-facing cycle command is `fp_spec` (registered at `commands.c:964`); the internal C handler is `fp_toggle` with type!=1 dispatching to the spectator path. Shape catalog explicitly cites `k_fp_spec + fp_spec` as a Shape 2 instance.

### Proposed draft

```
Selects the say/say_team flood-protection preset applied to spectators.

1 = Low:    up to 9 messages per 1 second; excess silences for 1 second.
2 = Medium: up to 4 messages per 1 second; excess silences for 5 seconds.
3 = High:   up to 5 messages per 3 seconds; excess silences for 7 seconds.

Out-of-range values are clamped to 1-3.

Permission: server config, or 'fp_spec' admin command in-game.
Default:    3 (High).

Example:
  # server.cfg -- set spectator flood protection to medium
  k_fp_spec 2

  # or cycle through presets in-game with the fp_spec admin command:
  fp_spec

See also: fp_spec (paired cycle command), k_fp (player counterpart -- same preset table, independent setting).
```

### Notes

- FLAG: existing "Set by: ... 'fp_toggle' admin command" names the internal C function. The user-facing command is `fp_spec` (registered at `commands.c:964`). Recast Permission line uses the user-facing name.
- FLAG: existing description implies pre-match-only via the "admin command" framing. Source `g_cmd.c:193-219` (fp_toggle handler) has no `match_in_progress` guard -- callable any time by an admin. Match-state section omitted per v2 discipline (collapses when "any time").
- Default `3 (High)` label aligned with k_fp draft's Low/Medium/High naming (`say_fp_levels[].name` at `g_cmd.c:152-154`).
- See-also at 2 entries (paired command + player counterpart); the cmd_fp family disambiguation lives on the sibling cmd-fp cards.

---

## k_minrate (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:880
- **Catalog line**: 15932
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Server-enforced minimum network rate (bytes per second) for connecting players and spectators. Clients with a rate below this value are told their rate is too low and are force-corrected up to this minimum.
>
> Range: 0-unlimited. 0 = no minimum enforced.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 -- cvar with no paired command. `RegisterCvar("k_minrate")` in `world.c:880`; consumed as a per-client enforcement floor in `client.c` connect / rate-change / periodic-check sites and clamped by `FixRules()` against `sv_maxrate`.

### Proposed draft

```
Server-enforced minimum connection rate (bytes per second); clients below the threshold are notified and force-corrected up to this value.

Effect:
  - Any player or spectator whose rate userinfo key falls below k_minrate receives a server message and a stuffcmd that resets their rate to the minimum.
  - Enforcement fires at connect (players and spectators), when a player changes their rate via setinfo mid-session, and periodically (~every 20 seconds) for all connected clients.
  - If k_minrate is set to 0, FixRules corrects it to 500 at match reconfigure -- 0 does not disable the minimum; 500 is the effective floor.
  - If k_minrate exceeds sv_maxrate, FixRules clamps k_minrate down to sv_maxrate.

Range: 0-100000 (values above 100000 are silently clamped by FixRules).

Default:       0 (corrected to 500 at reconfigure; see Effect above).
Permission:    server config only.

Example:
  k_minrate 2500    // floor all clients at 2500 bytes/sec
  sv_maxrate 30000  // ceiling companion -- k_minrate must not exceed this

See also: sv_maxrate (rate ceiling companion; k_minrate is clamped to sv_maxrate if k_minrate > sv_maxrate)
```

### Notes

- FOUR FLAGS surfaced by Step 1.5:
  1. "0 = no minimum enforced" is wrong -- `FixRules()` auto-corrects 0 to 500 (`world.c:1729-1731`). The v2 draft surfaces this.
  2. "Range: 0-unlimited" is wrong -- `bound(0, cvar("k_minrate"), 100000)` caps effective max at 100000 (`world.c:1559`).
  3. "Connecting players and spectators" is too narrow -- enforcement also fires on `setinfo rate` changes (`g_userinfo.c:277`) and periodically every ~20 seconds via `CheckAll()` (`client.c:74`).
  4. The companion ceiling cvar is `sv_maxrate` (not `k_maxrate` -- deprecated per `world.c:879` comment). Added to See-also.

---

## k_motd_time (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:841
- **Catalog line**: 15962
- **Anchor**: v1.36-1633-g67253dc

### Current description

> How long the message-of-the-day (MOTD) is displayed to connecting players, in seconds.
>
> Range: 0-30 (clamped). Value 0 falls back to a built-in default: 7 seconds during a match, 3 seconds otherwise.
>
> Default: 0 (effective 7s in-match / 3s matchless).
> Set by: server config.

### Shape classification

Shape 3 -- cvar with no paired command. `RegisterCvar` at `world.c:841`; consumed by the connect-time MOTD display at `motd.c:139-147` (`bound(0, cvar("k_motd_time"), 30)` + `(i ? i : (k_matchLess ? 3 : 7))`).

### Proposed draft

```
How long the connect-time message-of-the-day (MOTD) is displayed to a player or spectator joining the server, in seconds.

Effect:
  Controls the timer on the MOTD overlay shown automatically at connect. When the timer expires, the overlay clears. The MOTD is also dismissed early if the player fires a weapon (indicating they want to play) or the match starts (in standard match-mode servers).
  Note: the /motd command (player-triggered re-display) always uses a hardcoded 10-second window and is not affected by this cvar.

Permission:    server config only
Default:       0 (effective 7 seconds on standard match-mode servers; 3 seconds on matchless servers -- setting 0 is not "disabled", it applies the built-in mode-dependent fallback).

Example:
  # server.cfg
  k_motd_time 15    // show MOTD for 15 seconds on connect

See also: motd (player command to re-show the MOTD on demand)
```

### Notes

- 0-fallback split (`k_matchLess ? 3 : 7` at `motd.c:146`) follows the "0 = effective X, not disabled" Default treatment used on `timing_players_time` and `k_cmd_fp_per`.
- Existing description's "7 seconds during a match, 3 seconds otherwise" reworded to "standard match-mode servers / matchless servers" -- `k_matchLess` is a server mode flag, not a live-match signal.
- Behavioral gap surfaced: `/motd` command (`commands.c:6704`) hardcodes 10s and ignores `k_motd_time` entirely. Cross-link added to See-also.

---

## k_noframechecks (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:946
- **Catalog line**: 15992
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls the server's frametime/FPS enforcement for human players. When checks are on, the server warns players whose FPS exceeds the server cap or whose machine uptime is triggering a QW timing bug, and disconnects after repeated warnings. Bots are exempt.
>
> 0 = frame checks enabled (default).
> 1 = frame checks disabled.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 -- cvar with no paired command. Negative-polarity: `framechecks = !cvar("k_noframechecks")` at `world.c:1862`. Consumed by the per-client check at `client.c:3824` (FPS cap + uptime drift detection, run every 15s per human client).

### Proposed draft

```
Disables the server's per-player FPS and uptime enforcement. When checks are enabled (default), the server monitors each human player's frame rate and machine uptime every 15 seconds; repeated violations result in a forced disconnect.

Effect:
  0 = checks active: FPS cap and uptime anomaly detection run every 15 seconds for all human players (bots are always exempt).
  1 = checks disabled: all frametime monitoring is suppressed for the entire server session.

  When active, two enforcement paths run independently:
  - FPS cap: players whose average FPS exceeds maxfps + 2 receive a server-wide broadcast warning; after 3 accumulated FPS warnings the player is force-disconnected ("gets kicked for potential cheat").
  - Uptime bug: players whose QW client timing drifts beyond the expected ratio (symptom of a Windows long-uptime timing bug) receive a private warning pre-match; if the drift exceeds the stricter threshold, a violation counter increments and the player is force-disconnected after 3 accumulated violations ("gets kicked for too long uptime").

Permission:    server config only
Default:       0

Example:
  # server.cfg -- disable frame checks on a practice or casual server
  k_noframechecks 1

See also: maxfps (FPS cap that frame checks enforce), status2 (prints "Check frametimes: enabled/disabled" reflecting the current enforcement state)
```

### Notes

- FLAG (cross-card consistency, surfaced by `maxfps` recast): the "after 3 accumulated FPS warnings" wording is imprecise. Source `client.c:3868-3870` reads `fIllegalFPSWarnings > 3` -- the counter increments first, then the kick fires when it exceeds 3, i.e. on the 4th violation. The `maxfps` recast (also this batch, `drafted_with_flag`) uses the more precise wording "the fourth warning in a session triggers a forced disconnect". Apply-pass-author should align this card's "after 3 accumulated FPS warnings" wording with the maxfps card's "fourth warning" phrasing. Same logical fact, more accurate phrasing.
- Step 1.5 precision: FPS threshold is `maxfps + 2` (2-FPS fluctuation allowance hardcoded at `client.c:3859`).
- Step 1.5 precision: uptime-bug warning fires pre-match only (`!match_in_progress` at `client.c:3832`), but the violation counter still increments and the disconnect fires at any time.
- `status2` (`commands.c:2032`) prints the effective state from the internal `framechecks` global -- added to See-also for operators verifying enforcement state.
- C2 polarity divergence in shipped distfile comments noted in catalog metadata; source at `world.c:1862` is unambiguous (cvar 0 = checks ON, cvar 1 = checks OFF). Recast reflects source-truth.

---

## k_no_scoreboard_ghosts (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1081
- **Catalog line**: 16023
- **Anchor**: v1.36-1633-g67253dc

### Current description

> When set to any non-empty value, disables the ghost-scoreboard feature: disconnected players' slots are not preserved and they are not restored to the scoreboard on reconnect. Empty (the default) keeps the ghost-scoreboard behavior. Intended for QuakeWorld-Engine client compatibility.
>
> "" (empty) = ghost-scoreboard enabled.
> any non-empty value = ghost-scoreboard disabled.
>
> Default: "" (ghost-scoreboard on).
> Set by: server config.

### Shape classification

Shape 3 -- cvar with no paired command. String-emptiness toggle (any non-empty string disables). `RegisterCvar` at `world.c:1081`; gated reads at `g_utils.c:2243` (`ghostClearScores`) and `g_utils.c:2277` (`ghost2scores`), both via `cvar_string("k_no_scoreboard_ghosts")[0]`.

### Proposed draft

```
Controls whether disconnected players appear as ghost entries on the scoreboard while awaiting reconnect.

Effect:
  "" (empty) -- ghost-scoreboard on: when a player disconnects mid-match,
    their slot and frag count are preserved on the scoreboard until they
    reconnect or the slot is needed.
  any non-empty value -- ghost-scoreboard off: disconnected players' slots
    are released immediately and do not appear on the scoreboard. Set this
    for compatibility with QuakeWorld-Engine clients.

Note: ghost entries are always suppressed in Rocket Arena and Clan Arena
modes regardless of this setting.

Permission:    server config only
Default:       "" (ghost-scoreboard on)

Example:
  # server.cfg -- disable ghost scoreboard for QE client compatibility
  set k_no_scoreboard_ghosts 1
```

### Notes

- Headliner rewritten as a neutral state description rather than leading with the disabling direction -- makes the default (enabled) the anchor.
- Effect bullet ordering reversed: default path first (empty), then disabling path. Easier to read for users who just want to know what the default does.
- QE-compat rationale folded into the non-empty Effect bullet as an action-level use-case prompt rather than a standalone "Intended for..." sentence (per universal-shape-v2 action-level discipline).
- Step 1.5 surfaced: `ghost2scores` exits early for RA and CA modes regardless of this cvar -- a server admin enabling ghost-scoreboard on a server running RA/CA will see no ghosts. Added as a "Note:" line.
- See-also omitted: no companion cvars, no gated commands, no paired toggle.
- Match-state omitted (server.cfg cvar, no in-match write path).

---

## k_spm_custom_model (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:884
- **Catalog line**: 16113
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Model used for spawn-point marker entities. Numeric values select a built-in model; non-numeric values are used as a literal model path.
>
> 0 = gold-key model (progs/w_g_key.mdl).
> 1 (or any non-zero number) = wizard model (progs/wizard.mdl).
> "progs/spawn.mdl" (example) = any custom model path.
>
> Default: 0 (gold-key model).
> Set by: server config.

### Shape classification

Shape 3 -- cvar with no paired command. `RegisterCvar` at `world.c:884`; consumed by `Spawn_GetModel()` at `items.c:2901-2904` (only_digits/atoi fork). Precached at `world.c:333` during map initialization.

### Proposed draft

```
Selects the model used for spawn-point marker entities when the spawn-marker overlay is active.

0 = gold-key model (progs/w_g_key.mdl).
Any other integer = wizard model (progs/wizard.mdl).
Non-numeric string = used as a literal model path (e.g. progs/spawn.mdl).

Prerequisites: k_spm_show must be 1 or 2 (spawn markers must be enabled; with k_spm_show 0 no markers are spawned and the model setting has no effect). The model is resolved and precached at map load -- changes to this cvar take effect on the next map, not mid-map.

Permission:  server config only
Default:     0 (gold-key model)

Example:
  # server.cfg -- use the wizard model for spawn markers
  k_spm_custom_model 1

  # or supply a custom model (must be accessible to clients)
  k_spm_custom_model progs/spawn.mdl

See also: k_spm_show (prerequisite -- controls when markers are shown; cycles via spawn_show), k_spm_glow (sibling -- adds glow effect to markers), k_spm_color_rgba (sibling -- tints marker color)
```

### Notes

- Closes the spm family in this batch (k_spm_show + k_spm_color_rgba + k_spm_glow + k_spm_custom_model all drafted now).
- Step 1.5: map-load caching surfaced as Prerequisites. `Spawn_GetModel()` caches the resolved model in a `static char` on first call, and the model is precached at `world.c:333` during map initialization. Mid-map cvar changes have no effect.
- k_spm_show prerequisite added (mirrors k_spm_glow's Prerequisites treatment).
- No HoonyMode override (confirmed distinct from k_spm_glow): `isHoonyModeDuel()` branch in `Spawn_SpawnPoints()` only overrides the `effects` argument (glow/color), not the model.

---

## k_teamoverlay (KTX cvar, Server config & network -- Shape 7b state-cvar)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1015
- **Catalog line**: 16208
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether live teammate location/status info (team overlay) is sent to players on a team. Only takes effect in team, CTF, or coop games; no effect in duel or race.
>
> 0 = team info is sent to spectators only.
> 1 = team info is also sent to teammates (each client must have requested it).
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 7b state-cvar -- the state cvar paired with the `teamoverlay` vote command (registered at `commands.c:1034`, handler at `vote.c:1073`). Per-player vote flag `self->v.teamoverlay`, threshold via `get_votes_req(OV_TEAMOVERLAY, true)`, applies via `cvar_fset("k_teamoverlay", ...)` at `vote.c:1057` on pass. Classic Shape 7b state-cvar role.

### Proposed draft

```
Whether live teammate location and status data (the "team overlay") is broadcast
to active players in addition to spectators -- the state cvar flipped by the
`teamoverlay` vote.

0 = overlay data is sent to spectators only.
1 = overlay data is also sent to active teammates.

Prerequisites:
  - Active game mode must be team play, CTF, or coop. Race is explicitly
    excluded; duel and FFA have no team info to send.
  - Per-client opt-in: clients that have set `setinfo ti -1` are skipped and
    receive no overlay data regardless of this cvar's value. ezQuake clients
    receive overlay automatically (no `setinfo` needed); other clients need
    `setinfo ti 1` to opt in.

Permission:    server config, or set at runtime by the `teamoverlay` vote
               (any player or admin spectator, pre-match only). A single admin
               vote counts as a veto and flips the cvar immediately without
               waiting for the threshold.
Default:       0.

Example:
  # server.cfg -- enable teamoverlay by default for team-play servers
  k_teamoverlay 1

  # set the vote threshold (70% of players required to flip the current state)
  k_vp_teamoverlay 70

  # in-game: a player votes to flip the current overlay state
  teamoverlay

See also: teamoverlay (vote command that casts or withdraws a vote to flip this),
          k_vp_teamoverlay (vote percentage threshold)
```

### Notes

- TWO FLAGS: (1) "Set by: server config only" is wrong -- the vote mechanism writes the cvar at runtime via `cvar_fset`. Corrected in Permission line. (2) "Each client must have requested it" is incomplete -- ezQuake clients (`p->ezquake_version > 0`) receive overlay automatically without `setinfo ti 1`. Corrected in Prerequisites.
- Admin-veto surfaced: `is_admins_vote(OV_TEAMOVERLAY)` at `vote.c:1050` treats a single admin vote as an immediate veto-flip.
- In-match `teamoverlay` command behavior (prints state only, no vote cast) is on the command-side card, not this cvar card.
- NOTE for dispatcher / next batch: the paired `teamoverlay` vote command is NOT in this 29-card batch's list -- it should be drafted in a later batch (likely the Spectator chat & visibility category or the Voting category).

---

## k_use_matchless_dir (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:798
- **Catalog line**: 16239
- **Anchor**: v1.36-1633-g67253dc

### Current description

> In matchless mode, selects which usermode config directory the server loads. Value 2 additionally forces the CTF variant config within the matchless directory.
>
> 0 = use the standard FFA usermode config.
> 1 = use the matchless usermode config (matchless/default.cfg).
> 2 = use the matchless usermode config and load matchless/ctf.cfg instead.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 -- cvar with no paired command, three-value enum. `RegisterCvar` at `world.c:798`; two read use-sites: `commands.c:4692` (truthy-redirect from ffa to matchless dir) and `commands.c:4812` (exact-2 branch that swaps `default.cfg` for `ctf.cfg`).

### Proposed draft

```
Selects which usermode config directory and file the server loads when switching modes on a matchless server.

Effect:
  0 = standard FFA config (configs/usermodes/ffa/).
  1 = matchless config: configs/usermodes/matchless/default.cfg.
  2 = matchless CTF config: configs/usermodes/matchless/ctf.cfg.

Prerequisites: k_matchless 1 must be set. On a standard match-mode server this cvar has no effect.

Permission:  server config only
Default:     0

Example:
  # server.cfg -- matchless FFA server
  k_matchless 1
  k_use_matchless_dir 1

  # server.cfg -- matchless CTF server
  k_matchless 1
  k_use_matchless_dir 2

See also: k_matchless (matchless mode prerequisite)
```

### Notes

- Clean v1->v2 mechanical recast. Three-value enum captured in Effect; matchless-mode prerequisite surfaced as explicit Prerequisites block.
- Value 2 is explicitly tested at `commands.c:4812` -- not "non-zero takes branch Y" but "exactly 2 takes the ctf.cfg branch".
- C2 distfile divergence noted in catalog metadata (ktx.cfg shows incomplete `(0 = no, 1 = yes)` enum; nquake port_template.cfg shows correct `(0 = no, 1 = yes FFA, 2 = yes CTF)`). Source is the D10 tiebreaker; recast reflects the three-value source-truth.

---

## maxfps (KTX cvar, Server config & network -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:772
- **Catalog line**: 16271
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Maximum client frame rate (FPS) the server permits. Clients exceeding this limit by more than 2 FPS receive a public high-FPS warning; four warnings result in disconnection. Values outside the valid range are reset to the default.
>
> Range: 50-1981 (values outside this range are reset to 77).
>
> Default: 77.
> Set by: server config only.

### Shape classification

Shape 3 -- cvar with no paired command. `RegisterCvarEx` at `world.c:772` (default 77); consumed as the FPS cap inside the `k_noframechecks`-gated per-client check (`client.c:3859` `if (fps > current_maxfps + 2)`).

### Proposed draft

```
Sets the maximum average FPS the server permits per client. Clients detected above this cap (with a 2-FPS fluctuation allowance) receive a server-wide warning broadcast; the fourth warning in a session triggers a forced disconnect.

Effect:
  - FPS cap: the server measures each human player's average frame rate every 15 seconds. Players whose average exceeds maxfps + 2 receive a broadcast warning and a per-player violation counter increments.
  - On the fourth violation, a disconnect is issued ("gets kicked for potential cheat"). The warning and the disconnect are issued in the same detection event -- there is no warning-only 4th event before the kick.
  - Values outside 50-1981 are reset to 77 (not clamped to the nearest valid value). Setting maxfps 30 does not produce a 50 FPS cap -- it resets to 77. The reset fires every game frame via FixRules, so a rcon-set out-of-range value is corrected on the next frame.
  - Bots are exempt from FPS enforcement regardless of this setting.

Permission:    server config only
Default:       77

Example:
  # server.cfg
  maxfps 100

See also: k_noframechecks (disables FPS enforcement entirely; the cap set here has no effect when k_noframechecks 1)
```

### Notes

- Existing description is source-true ("four warnings result in disconnection" matches `fIllegalFPSWarnings > 3` at `client.c:3868-3870`). The verdict is `drafted_with_flag` because the FLAG is on a sibling card, not on this card.
- FLAG (cross-card): the `k_noframechecks` recast (also this batch) says "after 3 accumulated FPS warnings the player is force-disconnected" -- imprecise phrasing for the same source fact. Source: counter increments first, then kick fires when count exceeds 3 (i.e. on the 4th detection event). Apply-pass-author should align both cards' wording (this card's "fourth warning triggers disconnect" is the clearer phrasing).
- Reset-not-clamp surprise surfaced (`world.c:1580-1585` inside `FixRules()`): out-of-range values get reset to 77, not floor-clamped. `maxfps 30` produces 77, not 50.
- Bots-exempt clause carried from existing description; verified.

---

## downspecs (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:983
- **Catalog line**: 16446
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Decrements the server's spectator slot count (maxspectators) by 1. The result is clamped to the range 1 to k_maxspectators. Refused while a match is in progress. Requires the k_allowcountchange permission level. Broadcasts the new spectator count when changed. Spectator-slot counterpart of downplayers.
>
> Set by: admin command (permission level set by k_allowcountchange).

### Shape classification

`shape-less` -- command-side lever for the k_maxspectators ceiling-gate relationship. Per the shape-less lever discipline in the shape catalog: the shape tag lives on the cvar (k_maxspectators, already drafted in this batch as Shape 3 + Shape 4); the command is the knob. Same pattern as downplayers (player-slot counterpart, drafted earlier in this batch as shape-less by the same discipline). No own inter-entity relationship to tag; cross-links in See-also.

### Proposed draft

```
Decrements the server's spectator slot limit (maxspectators) by 1 each time it is run.

Effect:
  Lowers maxspectators by 1, broadcasting the new count to all players.
  The new value is clamped to a minimum of 1; cannot go below 1.
  Silently no-ops if already at 1 (no broadcast, no change written).
  Refused silently while a match is in progress.

Prerequisites: k_allowcountchange must be set to 1 or 2. The default value (0) blocks everyone -- the command is a no-op on a fresh server until k_allowcountchange is explicitly configured.

Permission:    Controlled by k_allowcountchange: 1 = real admin only, 2 = any admin.
Match-state:   Pre-match only.

Example:
  # server.cfg -- set the ceiling and permission level:
  k_maxspectators 4
  k_allowcountchange 2
  # In-game, step down one slot at a time:
  downspecs

See also: upspecs (counterpart -- increments maxspectators), k_maxspectators (slot ceiling), k_allowcountchange (permission gate for both commands), downplayers (same operation for player slots)
```

### Notes

- shape-less verdict per lever discipline: the cvar-relationship shape (k_maxspectators + ceiling gate) lives on the k_maxspectators card; downspecs is the knob. No Layer B tag on this card.
- Key behavioral addition: k_allowcountchange defaults to 0 (blocked for everyone). The existing description mentions the permission gate but does not surface that the default leaves the command disabled for everyone. This is surprise-bearing and user-actionable -- surfaced in Prerequisites. Mirrors the downplayers treatment exactly.
- Silent no-op at floor: source lines 8048-8051 -- if `bound(1, maxspectators-1, max(1, k_maxspectators))` equals `maxspectators` (already at 1), the handler returns without broadcasting. Not in existing description; added as an Effect bullet. Mirrors downplayers.
- Ceiling clamp in existing description ("clamped to the range 1 to k_maxspectators"): the `bound()` call does include k_maxspectators as the upper bound (via `max(1, k_maxspectators)`), but for a decrement operation the ceiling never constrains in normal use. Recast drops the "to k_maxspectators" upper-bound language in favor of "minimum of 1" -- clearer for a downward command. Not a flag; a v2 precision improvement.
- The CF_PLAYER | CF_SPC_ADMIN registration flags mean both in-game players and admin spectators can invoke the command at the transport level, but the actual permission is entirely determined by k_allowcountchange (the check_perm gate). Recast makes this explicit.
- Shared handler: `downspecs` uses `DEF(downplayers)` with arg `2` (type=2 selects the spectator path in ChangeClientsCount). The only behavioral difference from `downplayers` is maxspectators vs maxclients and k_maxspectators vs k_maxclients. All other behavior (match gate, permission gate, floor clamp, silent no-op, broadcast) is identical.

## info (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:943
- **Catalog line**: 16557
- **Anchor**: v1.36-1633-g67253dc

### Current description

> KTPRO-compatibility alias of kinfo. Inspects or sets the calling client's own userinfo keys.
>
> With no arguments (or more than two): lists the client's settable userinfo keys.
> With one argument: prints the value of that key as `key <k> = "<v>"`.
> With two arguments: sets the key to the given value.
>
> Default: n/a (command, not a cvar).
> Set by: any player or spectator.

### Shape classification

shape-less (leaf of the canonical-card arrangement for the kinfo / info pair).

`info` and `kinfo` share the same `cmdinfo` handler with no argc-branch or permission differences. Per the canonical-card discipline, `kinfo` is the family head carrying the full v2 description; `info` is the short reference card (leaf). The Layer B shape tag lives on `kinfo`. `info` itself carries no Layer B relationship -- `shape-less` is correct.

### Proposed draft

```
KTPRO-compatibility alias of kinfo -- identical behavior, registered separately for KTPRO client compatibility.

Permission: any player or admin spectator
Match-state: any time

See also: kinfo (canonical -- full argc-dispatch description lives there)
```

### Notes

- Canonical-card pattern: `kinfo` (commands.c:940) and `info` (commands.c:943) both register `cmdinfo` as their handler. The source comment at line 942 reads `// saved for ktpro compatibility`, bracketing `info` and `uinfo` as a compatibility pair. No behavioral difference at any argc; no CF_ flag difference that changes user-observable behavior (`CF_NOALIAS` on `info` prevents it from being used in alias definitions -- an alias-system guard, not a command-behavior difference).
- The kinfo card is the family head and has not yet been drafted in this batch as of this card's write time, but `kinfo` exists as a live L1 entity (commands.c:940) -- the See-also cross-link is to an existing L1 entity, not a forward reference to a non-existent concept note.
- The argc-dispatch enum (no-args / one-arg / two-arg) lives on the `kinfo` card only, per canonical-card pattern discipline. No duplication here.
- Existing description's framing ("KTPRO-compatibility alias of kinfo") is correct and preserved in the Headliner. Recast shortens to reference-card form; no content is lost because all behavioral content is centralized on `kinfo`.

---

## kinfo (KTX command, Server config & network -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:940
- **Catalog line**: 16589
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Inspects or sets the calling client's own userinfo keys.
>
> With no arguments (or more than two): lists the client's settable userinfo keys.
> With one argument: prints the value of that key as `key <k> = "<v>"`.
> With two arguments: sets the key to the given value.
>
> Default: n/a (command, not a cvar).
> Set by: any player or spectator (usable outside a match).

### Shape classification

shape-less -- pure standalone userinfo inspector/setter for the calling client. No cvar pairing, no sibling vote family, no election/gate role, no curated-menu print. The canonical-card relationship with `info` (KTPRO alias) is structural (shared handler via re-registration), not a relational pattern the Layer B catalog covers. Classified shape-less by the same rationale as `fpslist` / `status1` / `status2`.

### Proposed draft

```
Inspects or sets the calling client's own userinfo keys.

Effect:
  With no arguments (or more than two arguments): triggers the client to display its full userinfo
    key list (server stuffs 'cmd setinfo' back to the caller).
  With one argument: prints the current value of that key as 'key <k> = "<v>"'.
  With two arguments: sets the named key to the given value.

Permission:    any player or spectator
Match-state:   any time

Example:
  kinfo                       (lists your current userinfo keys)
  kinfo name                  (prints the value of your 'name' key)
  kinfo premsg "[AFK] "       (sets premsg to a message prefix)

See also: info (KTPRO-compatibility alias -- identical behavior), kuinfo (inspect another player's userinfo)
```

### Notes

- **FLAG -- cross-card correction required**: The `info` reference card drafted earlier in this batch (commands.c:943) has "Permission: any player or admin spectator" -- this is WRONG. Source registration for `info` is `CF_BOTH | CF_MATCHLESS | CF_PARAMS | CF_NOALIAS` with NO `CF_SPC_ADMIN` or `CF_PLR_ADMIN` flag. `CF_BOTH` = `CF_PLAYER | CF_SPECTATOR` (g_local.h:649) -- any player AND any spectator, no admin check in either case. The apply-pass-author must correct the `info` card's Permission line to "any player or spectator" to match.
- CF_BOTH semantics confirmed: g_local.h line 649 defines `CF_BOTH = (CF_PLAYER | CF_SPECTATOR)` with no admin flag. Neither `CF_PLR_ADMIN` nor `CF_SPC_ADMIN` appears in either registration row.
- "Any time" (Match-state omitted): `cmdinfo` has no `match_in_progress` check. `CF_MATCHLESS` means "also works in matchless-server-mode" -- it doesn't restrict the command to pre-match; it expands availability to matchless-mode servers. The command is usable at any match phase.
- The no-args "list" path uses `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd setinfo\n")` -- the server stuffs the client to self-display its userinfo. The existing description "lists the client's settable userinfo keys" is mechanically accurate and is preserved.
- Empty-value behavior (`kinfo <key> ""`): KTX passes the empty string straight to `trap_SetUserInfo` with no stripping. Engine-level (MVDSV) determines whether empty-string sets or removes the key. This is not surfaced in L1 (engine-scope, not KTX-scope).
- No system-key (`*`-prefixed) guard in `cmdinfo`: the handler does not call `isSysKey()` before passing to `SetUserInfo`. Engine enforcement is outside KTX scope. Not surfaced in L1.
- No flood/rate-limit logic in `cmdinfo`; `CF_CONNECTION_FLOOD` is absent from the registration.
- See-also cap: 2 entries -- within 4-5 limit. `kuinfo` is the natural disambiguation peer (inspects another player's userinfo vs self); `info` is the KTPRO alias structural peer.

## kuinfo (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:941
- **Catalog line**: 16621
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints a connected client's userinfo fields. Given a player ID or name, lists all non-empty userinfo keys and their values. Given an optional second argument (a key name), prints just that key's value. System keys (those beginning with '*') are always hidden. Prints a usage line if arguments are missing or too many.
>
> Usage: kuinfo <id/name> [key]
> Set by: any player or spectator.

### Shape classification

shape-less -- pure standalone state-printer for another player's userinfo. No cvar pairing, no sibling vote family, no election/gate role, no curated-menu print. Same shape-less classification as `fpslist` / `status1` / `status2` / `kinfo` (all already in this drafts file). This is the canonical-card family head for the kuinfo/uinfo pair; `uinfo` is the KTPRO-compatibility alias (registered at commands.c:944, same handler `cmduinfo`) and will be drafted separately as a short reference card pointing here.

### Proposed draft

```
Inspects a connected player's or spectator's userinfo keys (read-only).

Effect:
  With one argument (id or name): prints all non-system, non-empty userinfo keys for that client as
    '<name>'s personal keys:' followed by 'key <k> = "<v>"' per key.
  With two arguments (id or name, then key name): prints the value of that specific key for that
    client. If the key begins with '*' (a system key), prints 'key "<k>" is hidden' regardless of
    its value.
  With no arguments or more than two arguments: prints a usage line.

Permission:    any player or spectator
Match-state:   any time

Example:
  kuinfo 3                        (lists all readable keys for the player with slot ID 3)
  kuinfo Slayer                   (lists all readable keys for the player named Slayer)
  kuinfo Slayer name              (prints Slayer's 'name' key value)
  kuinfo Slayer *spectator        (prints: key "*spectator" is hidden)

See also: uinfo (KTPRO-compatibility alias -- identical behavior), kinfo (inspect or set your own userinfo keys)
```

### Notes

- CF_BOTH semantics confirmed: g_local.h:649 defines `CF_BOTH = (CF_PLAYER | CF_SPECTATOR)` with no admin flag. No `CF_SPC_ADMIN` or `CF_PLR_ADMIN` in the registration row (commands.c:941). Permission = "any player or spectator" -- no admin check. This mirrors the kinfo card wording exactly, as instructed.
- CF_MATCHLESS at commands.c:941 means "also valid in matchless-server mode" -- expands availability, does not restrict. `cmduinfo` has no `match_in_progress` check. Match-state = any time.
- ID-or-name resolution (`SpecPlayer_by_IDorName`, g_utils.c:1485): tries `player_by_IDorName` first (numeric -> player slot via `atoi`; non-numeric -> name match), then `spec_by_IDorName` for spectators. Target can be player or spectator. Not-found path: prints `client "<arg>" not found`.
- `isSysKey` macro (g_userinfo.c:33): `#define isSysKey(key) (!strnull(key) && *(key) == '*')` -- any key with `*` prefix is a system key. In argc==2 (list-all) path: system keys are silently skipped. In argc==3 (specific-key) path: system key request prints `key "<k>" is hidden` (g_userinfo.c:209).
- argc==2 list-all path iterates `cinfos[]` registry (the server's known userinfo key table); it does NOT enumerate arbitrary custom keys the client may have set outside that registry. A specific custom key can still be queried by name in the argc==3 path. This edge-case is not surfaced in L1 -- implementation detail, not user-action-plan content.
- The existing description's "lists all non-empty userinfo keys" is slightly imprecise (iterates cinfos[] registry, not a raw infostring scan) but not foundational enough to flag -- the user-observable behavior matches.
- Canonical-card pattern: `kuinfo` (commands.c:941) and `uinfo` (commands.c:944) both register `cmduinfo` as their handler. `uinfo` carries `CF_NOALIAS` (prevents alias usage) which is an alias-system guard with no command-behavior effect. No behavioral difference at any argc. `kuinfo` is the family head; `uinfo` will be drafted as a short reference card in this batch.
- Distinct from kinfo/info family (handler `cmdinfo`): kinfo/info inspect AND set the caller's OWN userinfo; kuinfo/uinfo only INSPECT (read-only) another connected player's userinfo. Different handlers; the two families do not combine.
- See-also: 2 entries -- `uinfo` (alias peer) and `kinfo` (disambiguation: self-inspect vs other-inspect). Within 4-5 cap.

## mapcycle (KTX command, Server config & network -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:996 (registration); src/commands.c:8536 (handler)
- **Catalog line**: 16649
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the server's configured map-rotation list (k_ml_0..k_ml_N) to the caller, one map per line with a 1-based index; the current map is marked. Prints "Map cycle: empty" when no rotation is configured. Prints "Map cycle: not active" additionally when the samelevel cvar is set (which pins the server to the current map). Read-only: lists, does not advance or change the rotation.
>
> Set by: any player or spectator-admin ('mapcycle').

### Shape classification

shape-less -- pure standalone state-printer. No cvar pairing (mapcycle does not toggle, cycle, or gate any cvar), no sibling-family relationship, no election/vote mechanism, no dispatch table, no side effects beyond printing. The handler reads k_ml_N slots and samelevel for display only; it does not write any state. Analogous to fpslist / status1 / status2 / kuinfo (all drafted as shape-less in this batch by the same rationale). The cross-links to k_ml_* (cycle config), k_random_maplist, k_force_mapcycle (cycle-behavior cvars), and samelevel (pin mechanism) are navigational See-also edges, not shape-defining inter-entity relationships.

### Proposed draft

```
Prints the server's map-rotation list to the caller -- one map per line with a 1-based index, with the current map marked.

Effect:
  - Iterates k_ml_0 through k_ml_N (stops at the first empty slot) and prints a formatted id | name table.
  - If no slots are configured (k_ml_0 is empty): prints "Map cycle: empty".
  - If samelevel is set (server pinned to the current map): appends "Map cycle: not active" after the listing.
  - Read-only: does not advance or modify the rotation.

Permission:    any player or spectator
Example:
  mapcycle

  Map cycle:
   id | name
  001 | dm2
  002 | dm4 * current
  003 | dm6
  004 | aerowalk

See also: k_ml_0..k_ml_N (cycle slot cvars -- set these to configure the rotation), k_random_maplist (whether the cycle advances sequentially or randomly), k_force_mapcycle (whether the cycle applies outside deathmatch mode), samelevel (mvdsv cvar that pins the server to the current map -- suppresses cycle advance), forcemap (admin command to advance to a specific map immediately)
```

### Notes

- FLAG: Existing description says "any player or spectator-admin" -- WRONG. Registration at commands.c:996 is `CF_BOTH | CF_MATCHLESS`. CF_BOTH = CF_PLAYER | CF_SPECTATOR (g_local.h:649). No CF_SPC_ADMIN flag present. Correct permission: "any player or spectator" (no admin gate on spectators). Recast reflects source-truth.
- Match-state: command has no match_in_progress early-return in the handler (commands.c:8536-8571), and CF_MATCHLESS is set -- callable any time (during a match, pre-match, in matchless mode). Match-state section omitted (defaults to "any time").
- The "Map cycle: not active" message is appended AFTER the listing (not instead of it): the handler only reaches the samelevel check (line 8567) after the loop exits with i > 0. When the cycle is empty (i == 0 at loop exit), the handler returns early from the "Map cycle: empty" branch and never reaches the samelevel check. The existing description's word "additionally" is accurate.
- The loop iterates k_ml_0..k_ml_999 but breaks on the first empty cvar_string result -- a gap in the sequence truncates the displayed cycle at that point. This is implementation detail (not action-level); not surfaced in L1.
- See-also count: 5 entries -- at the cap. All five are load-bearing: k_ml_0..k_ml_N (the cycle's configuration substrate), k_random_maplist and k_force_mapcycle (cycle-behavior cvars already drafted as Shape 3 in this batch), samelevel (the pin mechanism the display explicitly reports on), forcemap (the advance command the cycle backs). Prioritized by relationship strength.
- samelevel is an mvdsv server cvar (not a KTX k_* cvar); the See-also reference is by name only (no L1 entity card may exist for it in the KTX project scope -- the apply-pass-author should verify before linking).

---

## maps (KTX command, Server config & network -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/maps.c:519
- **Catalog line**: 16676
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the custom map list available on the server, with instructions for voting ('votemap <map>' or type the map name). An optional argument filters the list to maps containing that substring. Output ends with a '(shown/total maps)' count. Read-only.
>
> Set by: any player ('maps' or 'maps <filter>').

### Shape classification

shape-less (pure standalone state-printer). No cvar pairing, no vote flag, no election, no gate, no dispatch. Reads engine-populated `mapslist[]` at startup and prints. Same classification as `mapcycle`, `status1`, `fpslist`.

### Proposed draft

```
Prints the server's custom map list, with a voting prompt at the top and an optional substring filter.

Effect:
  Always prints a voting instructions header ("Vote for maps by typing the
  mapname, for example dm6 or use votemap dm6") before the list.
  With no argument: lists all maps in two-column format, followed by a
  (shown/total) count.
  With a filter argument: lists only maps whose names contain the substring;
  the count footer is omitted if no names match.
  The list includes map variants (e.g. dm3#lowgrav) if the server has custom
  entity files alongside standard BSP maps.

Permission:  any player or spectator
Match-state: any time

Example:
  maps                  (lists all maps with voting prompt)
  maps dm               (filters to map names containing "dm")
  maps aerowalk         (confirm a specific map is available before voting)

See also: votemap (cast a map vote from this list), mapcycle (server map rotation), mapslist_dl (internal bulk download of the list), forcemap (admin direct map change)
```

### Notes

- FLAG: Permission mismatch. Existing description says "any player"; source shows CF_BOTH = CF_PLAYER | CF_SPECTATOR (confirmed at include/g_local.h:647-648). Spectators can invoke `maps`. Recast uses "any player or spectator".
- FLAG: Count-footer claim. Existing description says "Output ends with a '(shown/total maps)' count" without qualification. Source (maps.c:546-549): the footer block is inside `if (cnt) { ... }` -- it only prints when at least one map matched. With a filter that matches nothing, the header and voting instructions print but the list and footer do not. Recast qualifies: "the count footer is omitted if no names match."
- CF_MATCHLESS is set (not CF_MATCHLESS_ONLY), and there is no `match_in_progress` early-return in ShowMaps. Available any time. Match-state section omitted (defaults to "any time").
- Map variants: `mapslist[]` is populated by both `GetMapList` (scans .bsp files) and `GetCustomEntityMaps` (scans .ent variant files like `mapname#variant.ent`). The list can include entries like `dm3#lowgrav`. This is user-surprise-bearing (the list is not just BSP base maps) and surfaced in Effect.
- No mode-specific behavior found in ShowMaps. The handler has no CTF/duel/mode checks; output is identical in all modes.
- Voting instructions header always prints (before the list loop), even when the filter matches nothing. This is accurately captured by the "always prints" Effect bullet.
- See-also: 4 entries (under the cap). votemap is the consumer the listing instructs the user toward; mapcycle is the sibling map-state printer; mapslist_dl is the internal counterpart; forcemap is the admin override. All four are load-bearing.

---

## mapslist_dl (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:699
- **Catalog line**: 16703
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal client-bootstrap command. Transfers the server's map list to the connecting client as 'votemap' shortcut aliases, sent in batches until the full list is delivered ('Maps loaded'), then triggers the command-list transfer.
>
> Skipped if the client's 'nomaps' userinfo is set. Refuses with 'mapslist already stuffed' if already delivered. Not an operator-facing setting; part of the client connection flow.
>
> Default: n/a (command, not a cvar).
> Set by: server (triggered automatically on connect).

### Shape classification

shape-less

One-off connection-bootstrap command. No paired cvar, no gate cvar, no vote channel, no sibling family. The `nomaps` key it reads is a raw `infokey` read (no registered handler in `g_userinfo.c`), not a cvar+command relationship. `cmdslist_dl` is a functional sibling (identical flags, same batch pattern) but the two don't form a named inter-entity relationship shape -- they're sequenced by the connection-bootstrap caller, not paired in the Shape 1-10 sense.

### Proposed draft

```
Server-side bootstrap that delivers the server's map list to a connecting client as votemap shortcut aliases, in batches, as part of the client connection sequence.

Effect:
  Stuffs one batch of map aliases to the client (e.g. "alias dm6 cmd votemap dm6"); re-issues itself with the next batch index until all maps are delivered, then prints "Maps loaded" and triggers the command-list transfer.
  Skipped entirely if the client's 'nomaps' userinfo key is set to 1 or higher -- the delivery phase is bypassed and the command-list transfer proceeds directly.
  Refuses with "mapslist already stuffed" if delivery was already completed this session.

Permission:    Issued by the server during client connection -- not directly invokable by players (CF_NOALIAS).
Match-state:   Any time.
Default:       N/A (command, not a cvar).

Example:
  To skip alias delivery (e.g. on a slow connection, or if you don't use votemap shortcuts):
    setinfo nomaps 1   (add to your quake config)
  The server detects this at connect time and skips the map list; the command-list transfer still runs.

See also: votemap (the command the stuffed aliases invoke), maps (human-readable listing of the same map set), cmdslist_dl (sibling bootstrap command that follows this one)
```

### Notes

- shape-less is the correct tag. The dispatcher note confirms this: "no cvar pairing, no relationship-shape -- it's a one-off connection-flow command."
- `nomaps` is the only user-actionable path. It is read via raw `infokey(self, "nomaps", ...)` at maps.c:251 -- not a registered g_userinfo handler, so it has no L1 entity of its own to cross-link. Named in Example only.
- CF_NOALIAS means the user cannot invoke this directly; the server stuffs it via `cmd mapslist_dl 0` from StuffMaps (maps.c:352), which is triggered by the MOTD think chain (motd.c:128).
- CF_CONNECTION_FLOOD bypasses the connection-time flood limiter for first 30 seconds post-connect, enabling the batch re-invoke loop to complete without rate-throttling.
- `cmdslist_dl` (commands.c:700) is the functional sibling with identical flags and the same batch pattern; it delivers the command alias list and runs after mapslist_dl completes.
- ezQuake clients get a more efficient delivery path (tempalias-based bulk helpers ktx_am4/ktx_am8 stuffed via isSupport_Params check at maps.c:276). Non-ezQuake clients get plain `alias <map> cmd votemap <map>` per map. Both produce the same net user-facing result; the mechanism difference is implementation detail not surfaced in L1.
- The existing description is accurate and well-framed; the recast is primarily structural (v2 sections, action-level framing, Example surfaces the user-actionable opt-out).
- No contradictions with source. Clean draft.

## motd (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:929
- **Catalog line**: 16733
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Re-displays the server's message-of-the-day to the calling client for about 10 seconds. Prints 'Already showing motd' if one is already active for this client. Has no effect during a live match (unless the server is in matchless mode).
>
> Set by: any player or spectator via 'motd'.

### Shape classification

shape-less -- standalone read-only display command, no cvar pair, no toggle, no inter-entity relationship to tag. Same class as `kuinfo`, `status1`, `about`.

Registration is `CF_BOTH | CF_MATCHLESS` (players and spectators; allowed in matchless mode). Handler `motd_show` spawns a MOTD think-entity with a hardcoded 10-second `attack_finished` deadline. No `cvar_toggle_msg`, no cycle, no gating cvar read, no userinfo star-key write, no vote, no dispatcher table -- no Layer B shape applies.

### Proposed draft

```
Player or spectator command that re-displays the server's message-of-the-day as a centerprint for up to 10 seconds.

Effect:
  Shows the MOTD text for up to 10 seconds; clears automatically when the timer expires.
  Firing a weapon while the MOTD is showing dismisses it early.
  Re-running while the MOTD is already active prints "Already showing motd" and does nothing -- the existing window continues unchanged.

Permission:    any player or spectator
Match-state:   No effect during a live match on standard servers. On matchless-mode servers, the MOTD dismisses automatically when countdown begins.

Example:
  motd

See also: k_motd_time (controls the connect-time MOTD window, not this command's window -- the /motd command always uses a hardcoded 10-second window), about (server identity panel), commands (command roster -- also linked in the MOTD text itself)
```

### Notes

- shape-less is the correct Layer B tag. Standalone display command -- same pattern as `kuinfo`, `fpslist`, `status1`. The dispatcher note confirms this.
- The 10-second window is hardcoded at `commands.c:6704` (`attack_finished = g_globalvars.time + 10`). "Up to 10 seconds" is more precise than the existing "about 10 seconds" because weapon-fire (`motd.c:34`: `owner->attack_finished > time`) can dismiss it early. No flag raised -- this is a wording tightening, not a factual error in the existing description.
- Weapon-fire early-dismiss (`motd.c:34`) was not in the existing description. Added to Effect as a user-actionable behavior: a player who wants to clear the MOTD can fire to dismiss it, and a player who accidentally fires may be surprised the MOTD disappears.
- SMOTDThink and PMOTDThink are nominally different per `motd_show` (`commands.c:6702`), but `SMOTDThink` just calls `PMOTDThink()` (`motd.c:97`): "equal motd for player and spectator now." No user-observable split; not surfaced in the recast.
- Matchless countdown nuance (`motd.c:33`): the think-loop removes the MOTD when `k_matchLess && match_in_progress == 1` (countdown). The handler itself doesn't block the initial spawn in matchless mode. Surfaced in Match-state as "MOTD dismisses automatically when countdown begins."
- See-also cross-links `k_motd_time` with the critical distinction: that cvar controls the connect-time MOTD window (3-7 seconds depending on mode, configurable 1-30), but the `/motd` command always uses the hardcoded 10-second window regardless of `k_motd_time`. Per the note context from k_motd_time's recast.
- No contradictions with source. Clean draft.

---

## rules (KTX command, Server config & network -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:747
- **Catalog line**: 16816
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the current server game mode to the caller only (duel, CTF, FFA, team, or "unknown mode"). In CTF mode also lists mode-specific commands/impulses (grappling hook, tossrune, tossflag, flagstatus). In team mode notes the scores/stats/efficiency info commands. If berserk mode is active, appends a notice about the Quad/Octa grant at the k_btime countdown threshold.
>
> Set by: any player ('rules').

### Shape classification

shape-less (pure mode-aware state printer)

`ShowRules` at `commands.c:3299-3342` is a pure `G_sprint` state printer that branches on `isDuel()` / `isCTF()` / `isFFA()` / `isTeam()` and optionally appends a berserk notice. It prints no hardcoded sibling-command roster. The shape catalog's Shape 10 claim that `rules` "markets 23 rule-toggle commands" is a session-3 misobservation -- the handler contains no such list. This entity is correctly shape-less: same pattern as `about`, `status1`, `motd`. No inter-entity relationship to tag.

### Proposed draft

```
Prints the active game mode to the caller, with mode-specific command hints.

Effect:
  - Duel mode: "Server is in duel mode."
  - CTF mode: "Server is in CTF mode." + lists grappling hook (impulse 22), tossrune, tossflag, flagstatus commands.
  - FFA mode: "Server is in FFA mode."
  - Team mode: "Server is in team mode." + notes scores, stats, and efficiency commands.
  - Unknown mode: "Server is in unknown mode."
  - If berserk mode is active (k_bzk set): appends a notice that all players receive Quad/Octa power when k_btime seconds remain.

Permission:    any player (spectators excluded -- CF_PLAYER only, no CF_SPECTATOR)
Match-state:   any time (available during pre-match, matchless mode, and live match)

Example:
  rules

See also: about (server identity panel), status1 (server rule/config summary), options (match-setting command roster), k_bzk (berserk mode toggle), k_btime (berserk Quad/Octa threshold countdown)
```

### Notes

- FLAG: shape catalog's Shape 10 section (`~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md`) and the worked-examples Shape 10 entry both list `rules` as a Shape 10 example claiming it "markets 23 rule-toggle commands (timedown1 / timeup1 / dm / tp / dropquad / ...)". This is factually wrong. `ShowRules` at `commands.c:3299-3342` contains no such roster -- it is a pure mode-branching state printer. The shape catalog needs a correction pass: remove `rules` from the Shape 10 example list and adjust the confirmed-instance count accordingly. This is a catalog-maintenance task for the operator; this skill cannot extend or correct the catalog.
- FLAG (localized -- structural only): the existing description reads "Set by: any player ('rules')" which is the v1-shape Set-by line. The v2 recast splits this into Permission + Match-state. No factual error; purely structural upgrade.
- shape-less is the correct Layer B classification. The three Shape 10 examples listed in the catalog are `qizmo`, `rules`, and `options`. With `rules` corrected, only `qizmo` and `options` remain confirmed instances of Shape 10 from session-3 catalog walk. The earn-their-keep discipline is not violated (qizmo + options = 2 instances, which meets the 2-3 confirmation threshold); the catalog shape itself stands, just with `rules` removed from its example list.
- Permission confirmed: `CF_PLAYER | CF_MATCHLESS`. `CF_PLAYER` = bit 0 (players only, per `g_local.h:647`); `CF_SPECTATOR` = bit 1 (not set, per `g_local.h:648`). Spectators cannot use `rules`. Existing description says "any player" -- correct in KTX terms (players = non-spectators).
- Match-state: `CF_MATCHLESS` means the command is allowed even in matchless mode (otherwise blocked by `DoCommand` at `commands.c:1078`). The handler has no `match_in_progress` early-return, so it fires during live matches too. Available at any time.
- The CTF hint block (impulse 22 / tossrune / tossflag / flagstatus) is mode-conditional situational help, not a Shape 10 roster. Shape 10 requires an unconditional hardcoded print of N sibling commands that exist as independent top-level entities; the CTF block only appears when the server is already in CTF mode and lists command syntax hints, not a sibling-command menu.
- Berserk notice: reads `cvar("k_bzk")` and `cvar("k_btime")` directly at call time (live reads, no caching). Both are surfaced in Effect and See-also.

---

## sct_hex (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:760
- **Catalog line**: 16843
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the QuakeWorld character set to your console as a hexadecimal table (character codes 16-255, 16 columns wide). Useful for looking up codes for colored names or message text. Output goes only to the caller.
>
> Set by: any player or spectator ('sct_hex').

### Shape classification

shape-less -- pure standalone caller-only console table printer. No cvar pairing, no sibling-family Layer B relationship, no vote/gate/dispatch. Same classification as `fpslist` / `status1` / `kuinfo` / `mapcycle` (all drafted as shape-less in this batch). The canonical-card pattern does NOT apply to `sct_hex` / `sct_oct`: the pair produces distinct user-observable artifacts (hex lookup for `^x` color codes vs octal lookup for `$x` legacy codes) and thus each gets its own full v2 card with a See-also cross-link. The sibling relationship is a navigational peer edge, not a Layer B shape.

### Proposed draft

```
Prints the QuakeWorld character set to your console as a 16-column hexadecimal reference table (character codes 16-255).

Effect:
  Outputs a header line ("Hexadecimal charset table:"), a column legend
  (0123456789ABCDEF), then rows labeled by high hex nibble (1.. through F..),
  each showing 16 consecutive characters. Codes 0-15 are omitted (control
  characters). Output goes only to the caller.

Permission:    any player or spectator
Example:
  sct_hex

  Use the row label and column position to read a character's hex code.
  Example: the character at row 3, column 6 has code 0x36. For colored
  player-name codes (^x syntax), the relevant codes are in rows 1 through 9.

See also: sct_oct (octal charset table -- for $x legacy color-code lookup)
```

### Notes

- No contradictions. All existing-description claims verified against source (commands.c:760 + commands.c:1607-1628).
- Handler verified: `ShowCharsetTableHexa` is a pure `G_sprint(self, 2, ...)` loop -- no state writes, no match-state guard, no args parsed, no cvar reads.
- Permission: `CF_BOTH` = `CF_PLAYER | CF_SPECTATOR` (confirmed at include/g_local.h:647-649). No `CF_SPC_ADMIN` or `CF_PLR_ADMIN`; no admin gate. Existing description "any player or spectator" is correct.
- Match-state: No `CF_MATCHLESS` flag at line 760, meaning the command is blocked by `DoCommand` (commands.c:1078) on matchless servers. On normal (match-based) servers the handler has no `match_in_progress` guard, so `sct_hex` fires during pre-match and live match alike. The omission of `CF_MATCHLESS` is a narrow edge case (matchless is an unusual server mode); Match-state section omitted -- the command is effectively "any time" on the servers where players encounter it.
- `^x` color codes: the hex table's primary practical use is identifying the code for a character in ezQuake's `^x` color syntax (for `name` / `say` / `setinfo` fields). The example text surface-references this without requiring a forward L1 link (the `name` command is a client-side entity, not a KTX L1 entity).
- See-also: 1 entry. `sct_oct` is the only natural peer (sibling with distinct artifact). No other load-bearing peers. Well under the 4-5 cap.
- Follow-up work: `sct_oct` (card 25 in this batch) will mirror this card's structure with its own full v2 description, cross-linking back to `sct_hex`.

---

## sct_oct (KTX command, Server config & network -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:759
- **Catalog line**: 16870
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the QuakeWorld character set as an octal table to the caller's console. Output is an 8-column grid covering codes 16-255 with a row label showing the octal high-bits group. Takes no arguments; output is private to the caller.
>
> Set by: any player (in-game command).

### Shape classification

shape-less -- pure standalone caller-only console table printer. No cvar pairing, no sibling-family Layer B relationship, no vote/gate/dispatch. Same classification as `sct_hex` (shape-less, drafted this batch). The sibling relationship with `sct_hex` is a navigational peer edge (See-also), not a Layer B shape -- each command produces a distinct user-observable artifact (octal lookup for `$x` legacy codes vs hex lookup for `^x` color codes), so each gets its own full v2 card.

### Proposed draft

```
Prints the QuakeWorld character set to your console as an 8-column octal reference table (character codes 16-255).

Effect:
  Outputs a header line ("Octal charset table:"), a column legend
  (01234567), then rows labeled by octal high-bits group (02.. through 37..),
  each showing 8 consecutive characters. Codes 0-15 are omitted (control
  characters). Output goes only to the caller.

Permission:    any player or spectator
Example:
  sct_oct

  Use the row label and column position to read a character's octal code.
  Example: the character at row 02, column 3 has code 023 (octal). For
  legacy color-code lookup using the $x variable syntax, locate the target
  character in the table and read off its octal code.

See also: sct_hex (hexadecimal charset table -- for ^x color-code lookup)
```

### Notes

- FLAG: existing description says "any player (in-game command)" -- registration at commands.c:759 uses `CF_BOTH`, which means any player OR admin spectator (same as `sct_hex` at line 760). The existing permission string is too narrow; corrected to "any player or spectator" in the draft.
- Handler verified: `ShowCharsetTableOctal` (commands.c:1633-1653) is a pure `G_sprint(self, 2, ...)` loop -- no state writes, no match-state guard, no args parsed, no cvar reads. Behavior exactly parallels `ShowCharsetTableHexa`.
- Row labels: `%02o..` applied at `(i % 8) == 0`, so the first row label is `02..` (i=16, i/8=2 in octal). The last row label before 255 is `37..` (i=248, i/8=31=037 in octal). The column legend "01234567" reflects the 8-column stride.
- Match-state: No `CF_MATCHLESS` flag at line 759 (same as `sct_hex` at 760). Omission is a narrow edge case (matchless is an unusual server mode); Match-state section omitted -- the command is effectively "any time" on the servers where players encounter it. Mirrors the sct_hex treatment.
- See-also: 1 entry. `sct_hex` is the only natural peer (sibling with distinct artifact). Well under the 4-5 cap.

## time (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:960 (registration); handler sv_time at commands.c:7901-7909
- **Catalog line**: 16955
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the current server date and time privately to the player who issued it, formatted as weekday, month, day, then HH:MM:SS and year (server local time). Takes no arguments and changes no game state.
>
> Default: n/a (command).
> Set by: any player or spectator in-game ('time').

### Shape classification

shape-less -- pure standalone caller-only timestamp printer. No cvar pairing, no toggle, no vote flag, no election, no gate-read, no stateful userinfo write, no curated sibling-command menu. Same classification as `fpslist` / `status1` / `kuinfo` / `mapcycle` / `sct_hex` / `sct_oct` (all drafted shape-less in this batch).

### Proposed draft

```
Prints the current server date and time to the caller only.

Effect: Outputs one line formatted as weekday, month, day, HH:MM:SS, year (for example, "Fri May 23, 14:35:07 2026"). The time is the server's local clock with no timezone label -- on servers hosted in a different region the displayed time may not match your local time.

Permission:  any player or spectator
Match-state: any time

Example:
  time
  -> Fri May 23, 14:35:07 2026
```

### Notes

- Recast is mechanical v1->v2: split "Set by" into Permission, dropped "Default" (not applicable to commands), promoted the format note from inline prose to a named Effect.
- Added the "no timezone label" observation from source verification (QVMstrftime call at commands.c:7905 uses `%a %b %d, %H:%M:%S %Y` -- no `%Z` specifier). The existing description says "server local time" which is correct; the recast adds the user-facing implication (output carries no timezone indicator, so cross-region players see a time without context). This is a mild surprise-bearing detail worth a single Effect clause; it passes the MVI test.
- Naming-collision check: operator queried whether the QW engine exposes a player-facing `time` command that KTX might shadow. No such command found in mvdsv source. The `time` token at the engine level is a console variable in the C host layer, not a user-issuing in-game command. KTX's registration supersedes within its own command table; no user-observable conflict surfaces. No disambiguation paragraph warranted (unlike `mmode` vs engine `messagemode 1/2/3` where both are explicitly user-facing with distinct user-flows).
- CF_MATCHLESS at registration confirms the command fires in pre-match (matchless) mode as well as during match. Match-state is genuinely "any time"; section omitted per convention.
- CF_BOTH = CF_PLAYER | CF_SPECTATOR verified at include/g_local.h:649. Permission line matches existing description exactly.
- See-also: omitted. No natural peers -- no paired cvar, no sibling family, no gate, no related command the user would need to navigate to from here. `options` roster lists `time` (the match-duration-set commands time5/time10/...) which is a different entity family; no cross-link warranted.

## uinfo (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:944
- **Catalog line**: 16983
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Queries a connected client's userinfo keys. With one argument (player id or name) shows the curated subset of tracked keys that the target has set. With two arguments (id/name + key) shows that specific key's value for the target; system keys (starting with `*`) are shown as hidden. Prints usage if called with no arguments. Also available as 'kuinfo'.
>
> Set by: any player or spectator ('uinfo' / 'kuinfo' command; no match-state restriction).

### Shape classification

shape-less -- KTPRO alias leaf. `uinfo` and `kuinfo` share the same `cmduinfo` handler with no argc-branch or permission differences. Per the canonical-card discipline, `kuinfo` is the family head carrying the full v2 description; `uinfo` is the short reference card (leaf). The Layer B shape tag lives on `kuinfo`. `uinfo` itself carries no Layer B relationship -- `shape-less` is correct by the leaf-of-a-family rationale.

### Proposed draft

```
KTPRO-compatibility alias of kuinfo -- identical behavior, registered separately for KTPRO client compatibility.

Permission: any player or spectator
Match-state: any time

See also: kuinfo (canonical -- full argc-dispatch description lives there)
```

### Notes

- Canonical-card pattern: `kuinfo` (commands.c:941) and `uinfo` (commands.c:944) both register `cmduinfo` as their handler. The source comment at line 942 reads `// saved for ktpro compatibility`, bracketing `info` and `uinfo` as the KTPRO compatibility pair. No behavioral difference at any argc; no CF_ flag difference that changes user-observable behavior (`CF_NOALIAS` on `uinfo` prevents use in alias definitions -- an alias-system guard, not a command-behavior difference). `CD_NODESC` on `uinfo` vs `CD_KUINFO` on `kuinfo` confirms `kuinfo` is the canonical registration.
- Framing correction: the existing description says "Also available as 'kuinfo'" -- this is the wrong direction. `uinfo` is the KTPRO alias; `kuinfo` is the primary. The recast Headliner corrects this to "KTPRO-compatibility alias of kuinfo". Mirrors the `info`/`kinfo` pair's correction in this same batch (info card Notes: "The existing description's framing... is correct and preserved").
- CF_BOTH semantics confirmed: g_local.h:649 defines `CF_BOTH = (CF_PLAYER | CF_SPECTATOR)` with no admin flag. Neither `CF_PLR_ADMIN` nor `CF_SPC_ADMIN` appears in the uinfo registration row (commands.c:944). Permission = "any player or spectator" -- no admin restriction. Matches the kuinfo card wording exactly.
- Match-state: `cmduinfo` has no `match_in_progress` check. `CF_MATCHLESS` expands availability to matchless-mode servers; it does not restrict the command to pre-match. The command is usable at any match phase. Section omitted per "any time" convention.
- The argc-dispatch enum (no-args / one-arg / two-arg) lives on the `kuinfo` card only, per canonical-card pattern discipline. No duplication here.
- See-also: 1 entry -- `kuinfo` (canonical). The `kinfo` cross-link that appears on the `kuinfo` card ("inspect or set your own userinfo keys") is not repeated here; the short reference card points only at its canonical. Reader navigates from `uinfo` -> `kuinfo` -> `kinfo` via kuinfo's own See-also.

---

## upspecs (KTX command, Server config & network -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:982
- **Catalog line**: 17037
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Raises the server's spectator-slot count (maxspectators) by one, up to k_maxspectators. Broadcasts the new value when applied. Refused during a live match, when k_allowcountchange is not set, or when maxspectators already equals k_maxspectators ("maxspectators reached").
>
> Set by: any in-game player, or an admin spectator (rcon or elected).

### Shape classification

`shape-less` -- command-side lever for the k_maxspectators ceiling-gate relationship. Per the shape-less lever discipline: the shape tag (Shape 3 + Shape 4) lives on the k_maxspectators cvar card (already drafted in this batch); upspecs is the knob. Mirror of upplayers (same handler `ChangeClientsCount` at commands.c:8017, arg type=2 routes to maxspectators/k_maxspectators instead of maxclients/k_maxclients). No own inter-entity relationship to tag; cross-links in See-also.

### Proposed draft

```
Increments the server's spectator slot limit (maxspectators) by 1 each time it is run.

Effect:
  Raises maxspectators by 1, broadcasting the new count to all players.
  The new value is clamped to [1, k_maxspectators]; refused with "maxspectators reached" if maxspectators already equals k_maxspectators.
  Silently no-ops if clamped value equals the current value.
  Refused silently while a match is in progress.

Prerequisites: k_allowcountchange must be set to 1 or 2. The default value (0) blocks everyone -- the command is a no-op on a fresh server until k_allowcountchange is explicitly configured.

Permission:    Controlled by k_allowcountchange: 1 = real admin only, 2 = any admin.
Match-state:   Pre-match only.

Example:
  # server.cfg -- set the ceiling and permission level:
  k_maxspectators 4
  k_allowcountchange 2
  # In-game, step up one spectator slot at a time:
  upspecs

See also: downspecs (counterpart -- decrements maxspectators), k_maxspectators (slot ceiling), k_allowcountchange (permission gate for both commands), upplayers (same operation for player slots)
```

### Notes

- FLAG: existing "Set by: any in-game player, or an admin spectator (rcon or elected)" is incorrect. The CF_PLAYER | CF_SPC_ADMIN flags nominally allow any player or admin spectator to invoke the command, but the real gate is `check_perm(self, cvar("k_allowcountchange"))` at commands.c:8027. With k_allowcountchange=0 (default), check_perm case 0 blocks everyone with "no one can use this command". With k_allowcountchange=1, only real admins pass; with value=2, any admin passes; value=5 allows anyone. The existing "any in-game player, or an admin spectator" framing overstates who can actually use it on a configured server. Same flag raised on the upplayers card. Recast Permission line reflects the actual check_perm gate.
- shape-less verdict per lever discipline: the cvar-relationship shape lives on the k_maxspectators card (Shape 3 + Shape 4 already drafted in this batch); upspecs is the knob. Exact mirror of upplayers treatment.
- k_allowcountchange default=0 blocks everyone. Surprise-bearing: the command registers with CF_PLAYER but silently fails for everyone until explicitly configured. Surfaced in Prerequisites, consistent with upplayers and downspecs card treatment.
- "maxspectators reached" message confirmed at commands.c:8041 (same code path -- sv_max is set to "maxspectators" for type=2). Existing description correctly names this message; preserved.
- Silent match-in-progress refusal confirmed at commands.c:8022-8025 (no message printed, just returns). Existing description mentions this correctly.
- Silent no-op at floor: commands.c:8048-8051 -- if `bound(1, maxspectators+1, max(1, k_maxspectators))` equals current `maxspectators`, handler returns without broadcasting. Only reachable when k_maxspectators=0 or 1 and maxspectators is already at max(1, 0)=1.
- Broadcast is G_bprint (server-wide) at commands.c:8054, not private -- all connected players see the new count. Existing description already calls this out; preserved.
- k_maxspectators registered at world.c:990 with no default (empty string / 0). Operator must set it for the ceiling to be meaningful.
- Example uses k_maxspectators 4 -- mirrors the inline comment at commands.c:4201 ("some default value") in the ktpro config string.

---

## whoskin (KTX command, Server config & network -- shape-less)

- **Status**: drafted
- **Source**: commands.c:713 (registration), commands.c:2400-2421 (handler PlayerStatusS)
- **Catalog line**: 17064
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints a player-skins list to the caller: one line per connected player showing that player's skin userinfo value next to their name. Prints "no players" if none are connected. Works regardless of match state.
>
> Default: n/a (command).
> Set by: any player or spectator in-game ('whoskin').

### Shape classification

shape-less -- pure standalone state-printer. No cvar pairing, no sibling family with shared mechanism, no election/gate/side-channel role. `whoskin` reads the `skin` userinfo key from each player entity and prints a formatted list to the caller; the relationship is player->caller only, with no inter-entity structural link in the Layer B catalog. Same classification as `fpslist`, `status1`, `kuinfo`, `mapcycle`, `sct_hex`, `sct_oct`, `time`.

### Proposed draft

```
Prints each connected player's skin userinfo value alongside their name -- one line per player, under a "Players skins list:" header.

Effect:
  Iterates all connected players (not spectators) and prints one line each: skin value padded left to 10 characters, then player name. If a player has not set a skin, that column is blank. Prints "no players" when no players are connected.

Permission:    any player or spectator
Match-state:   any time (unlike 'who', which is refused mid-match)

Example:
  whoskin
  Players skins list:
       base_r Player1
       ctf_r  Player2

See also: who (player readiness + team list; pre-match only), whonot (players not ready; pre-match only), whovote (vote-status list; any time)
```

### Notes

- CF_BOTH | CF_MATCHLESS confirmed at commands.c:713. CF_BOTH = any player or spectator (no admin gate). CF_MATCHLESS = callable mid-match. Both match the existing description's "any player or spectator" + "Works regardless of match state."
- find_plr (g_utils.c:1315) iterates ctPlayer only -- spectators are excluded from the output even when the caller is a spectator. Existing description's "connected player" phrasing is accurate; precision added to Effect to clarify the caller/output asymmetry.
- ezinfokey(p, "skin") at commands.c:2416 reads the skin userinfo key from each player entity. No default fallback in ezinfokey: if the key is absent, the field is blank. Surfaced in Effect.
- No whois command exists in KTX source (confirmed grep). See-also uses who/whonot/whovote as the natural sibling cluster.
- Match-state section retained (not omitted as "any time" default) because the sibling contrast with who (CF_BOTH, refused mid-match at commands.c:2375-2380) is surprise-bearing for users discovering whoskin via who.
- No shape-fit issues; no factual contradictions; recast is clean.

---
