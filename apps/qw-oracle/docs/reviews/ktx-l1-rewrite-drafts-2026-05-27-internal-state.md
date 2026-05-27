# ktx-l1-rewrite drafts -- batch 2026-05-27 (Internal state category)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies
clean drafts, hand-edits flagged-drafts after verifying the surfaced
contradiction. Drafts do NOT auto-apply to L1 (`entities.description`);
the apply pass is a separate phase.

Batch shape: 19 cards across 3 chunks (7+6+6 = 19). All 18 cvars classified
as Shape 9b (engine-only state-mirror); the 1 command (`cmdslist_dl`) is
shape-less internal-mechanism (sibling of `mapslist_dl`). Zero parks, zero
halts. 18 drafted clean + 1 drafted_with_flag.

Anchor: `v1.36-1633-g67253dc`.

---

# Captain-election state-mirrors

<!-- VERDICT: drafted -->
## _k_captcolor1 (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:1024
- **Catalog line**: 7970
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal mod-state cvar -- not intended for operator configuration. Stores captain #1's player colors (top color and bottom color, space-separated) during captain-based team picking. When captain #1 picks a player, the picked player is assigned these colors.
>
> Default: "" (empty; set at runtime by the team-picking process).
> Set by: internal mod state only.

### Shape classification

Shape 9b (engine-only state-mirror cvar).

`_k_captcolor1` is registered in `world.c:1024` with no default. It is written by `cvar_set(va("_k_captcolor%d", capt_num(p)), ...)` in `captain.c:390` inside a state-transition function that fires when both captains have been elected and team picking begins -- not via any command-arg path. It is read by `cvar_string(va("_k_captcolor%d", (int)k_captainturn))` in `captain.c:50` inside `SetPlayerParams()` to stuff the picked player's color. The user has no syntax to trigger the write. Classic Shape 9b: engine writes on a state transition (captain election concluded), engine reads on a subsequent event (player pick), no user write path.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists captain #1's player colors (top and bottom color, space-separated) across the team-picking phase so that players assigned to captain #1's team receive those colors.

Effect:
  Written when both captains have been elected and team picking begins: stores captain #1's topcolor and bottomcolor (from their userinfo) as a space-separated string.
  Read by SetPlayerParams() each time captain #1 picks a player: the picked player's client is stuffed with the stored color string, locking them to captain #1's colors.

Permission:    Engine internal only -- set automatically when captain election completes. Not user-actionable; direct set is overwritten on the next captain session.
Default:       "" (empty).

See also: _k_captteam1 (sibling -- stores captain #1's team name for the same picking session), _k_captcolor2 (sibling -- same role for captain #2), captain (Match flow -- the election that produces these values)
```

### Notes

- Verification: write site confirmed at `captain.c:390` (`cvar_set(va("_k_captcolor%d", capt_num(p)), va("%s %s", ezinfokey(p, "topcolor"), ezinfokey(p, "bottomcolor")))`). Read site confirmed at `captain.c:50` (`infocolor = cvar_string(va("_k_captcolor%d", (int)k_captainturn))`). No user write path found in source.
- Example section omitted per Shape 9b template (not user-actionable).
- Match-state section omitted (written at captain-election-to-picking transition; not a standard pre/mid/post-match gate that the user can reason about).
- Cross-batch See-also: `captain` lives in the Match flow batch (drafted 2026-05-27).

<!-- VERDICT: drafted -->
## _k_captcolor2 (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:1026
- **Catalog line**: 7998
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal mod-state cvar. Stores the second captain's player colors (top and bottom, space-separated) during captain-based team picking. When the second captain picks a player, that player is force-set to these colors. Not operator-tuned; managed automatically by the team-picking code.
>
> Default: "" (empty; set at runtime).
> Set by: server (internal; not configurable).

### Shape classification

Shape 9b (engine-only state-mirror cvar).

Structurally identical to `_k_captcolor1` -- same write site at `captain.c:390` (via `va("_k_captcolor%d", capt_num(p))` resolving to `_k_captcolor2` for captain #2), same read site at `captain.c:50` (via `k_captainturn` resolving to 2 when it is captain #2's turn). No user write path. Shape 9b.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists captain #2's player colors (top and bottom color, space-separated) across the team-picking phase so that players assigned to captain #2's team receive those colors.

Effect:
  Written when both captains have been elected and team picking begins: stores captain #2's topcolor and bottomcolor (from their userinfo) as a space-separated string.
  Read by SetPlayerParams() each time captain #2 picks a player: the picked player's client is stuffed with the stored color string, locking them to captain #2's colors.

Permission:    Engine internal only -- set automatically when captain election completes. Not user-actionable; direct set is overwritten on the next captain session.
Default:       "" (empty).

See also: _k_captteam2 (sibling -- stores captain #2's team name for the same picking session), _k_captcolor1 (sibling -- same role for captain #1), captain (Match flow -- the election that produces these values)
```

### Notes

- Verification: same write and read sites as `_k_captcolor1` -- both resolved dynamically via `va("_k_captcolor%d", ...)` with the captain number. Confirmed no separate write site for `_k_captcolor2` alone; the shared write path at `captain.c:390` handles both.
- Example section omitted per Shape 9b template.
- Cross-batch See-also: `captain` lives in the Match flow batch (drafted 2026-05-27).

<!-- VERDICT: drafted -->
## _k_captteam1 (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:1023
- **Catalog line**: 8026
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal mod-state cvar. Stores the first captain's team name during captain-based team picking. Not operator-tuned; set and consumed automatically by the team-picking code.
>
> Default: "" (empty -- reset between captain sessions).
> Set by: server runtime only (not intended for server config).

### Shape classification

Shape 9b (engine-only state-mirror cvar).

`_k_captteam1` is registered in `world.c:1023`. Write site: `cvar_set(va("_k_captteam%d", capt_num(p)), getteam(p))` at `captain.c:389` -- fires in the same state-transition function as `_k_captcolor1` (both captains elected, picking begins). Read site: `cvar_string("_k_captteam1")` at `g_userinfo.c:441` inside `FixPlayerTeam()` -- used to enforce that a picked player cannot change away from their assigned team. No user write path. Shape 9b.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists captain #1's team name across the team-picking phase so that players assigned to captain #1 are locked to that team.

Effect:
  Written when both captains have been elected and team picking begins: captures the team name captain #1 is currently on.
  Read by the team-change handler (FixPlayerTeam) when a player attempts to change team mid-pick: if the player was picked by captain #1, the stored team name is enforced and the change is refused.

Permission:    Engine internal only -- set automatically when captain election completes. Not user-actionable; direct set is overwritten on the next captain session.
Default:       "" (empty).

See also: _k_captteam2 (sibling -- same role for captain #2), _k_captcolor1 (sibling -- stores captain #1's colors for the same session), captain (Match flow -- the election that produces these values)
```

### Notes

- Verification: write site confirmed at `captain.c:389` (`cvar_set(va("_k_captteam%d", capt_num(p)), getteam(p))`). Read site confirmed at `g_userinfo.c:441` inside `FixPlayerTeam()`. Gate logic confirmed: `if (self->k_picked == 1) { s2 = cvar_string("_k_captteam1"); }` then `if (strneq(s1, s2))` refuses the team change.
- Example section omitted per Shape 9b template.
- Cross-batch See-also: `captain` lives in the Match flow batch (drafted 2026-05-27).

<!-- VERDICT: drafted -->
## _k_captteam2 (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:1025
- **Catalog line**: 8054
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal runtime state -- not for manual configuration. During captain-based team picking, stores the second captain's team name. Players picked by captain 2 are force-assigned to this team and cannot switch away from it. Written and read by the team-picking system; not meaningful outside of an active captain session.
>
> Set by: server automatically during captain team selection.

### Shape classification

Shape 9b (engine-only state-mirror cvar).

Structurally identical to `_k_captteam1`. Write site: `captain.c:389` (same dynamic write path via `capt_num(p)` resolving to 2 for captain #2). Read site: `g_userinfo.c:445` (`cvar_string("_k_captteam2")`) inside `FixPlayerTeam()` for players picked by captain 2. No user write path. Shape 9b.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists captain #2's team name across the team-picking phase so that players assigned to captain #2 are locked to that team.

Effect:
  Written when both captains have been elected and team picking begins: captures the team name captain #2 is currently on.
  Read by the team-change handler (FixPlayerTeam) when a player attempts to change team mid-pick: if the player was picked by captain #2, the stored team name is enforced and the change is refused.

Permission:    Engine internal only -- set automatically when captain election completes. Not user-actionable; direct set is overwritten on the next captain session.
Default:       "" (empty).

See also: _k_captteam1 (sibling -- same role for captain #1), _k_captcolor2 (sibling -- stores captain #2's colors for the same session), captain (Match flow -- the election that produces these values)
```

### Notes

- Verification: write site confirmed at `captain.c:389` (dynamic). Read site confirmed at `g_userinfo.c:445`. Existing description does not include Default -- added from registration site (RegisterCvar with no default argument = empty string default).
- The existing description has no explicit Default line. Added `Default: "" (empty)` from the registration site.
- Example section omitted per Shape 9b template.
- Cross-batch See-also: `captain` lives in the Match flow batch (drafted 2026-05-27).

---

# Coach-election state-mirrors (vestigial -- write side never implemented)

<!-- VERDICT: drafted -->
## _k_coachteam1 (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:1027
- **Catalog line**: 8081
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal cvar registered by KTX but never written anywhere in the source. Intended as the coach-side equivalent of _k_captteam1 (which stores captain team assignments), but the write side was never implemented. Has no observable effect at runtime.
>
> Default: empty (internal; do not set manually).
> Set by: never (dormant -- no write path exists).

### Shape classification

Shape 9b (engine-only state-mirror cvar -- vestigial/dormant variant).

`_k_coachteam1` is registered in `world.c:1027`. Source-verified: **no `cvar_set` or `cvar_fset` for `_k_coachteam1` exists anywhere in KTX source**. There is one read site: `g_userinfo.c:364` inside `FixPlayerTeam()`, inside a `k_coaches == 2` branch -- the block reads `_k_coachteam1` and `_k_coachteam2` to enforce team-lock on picked players. However, since nothing ever writes these cvars, the comparison always compares against `""` (empty string), making the lock-enforcement branch effectively a no-op. The source comment at `g_userinfo.c:355` reads: `// do we need this at all? // it is here because the coach stuff was copied from captain`. This confirms the existing description's "never written" claim. Shape 9b applies -- it is structurally a state-mirror cvar that is read by an engine state-transition function, just with a vestigial write path (not yet implemented). Classifying as Shape 9b with a flag noting the vestigial state rather than parked, since the mechanism type (state-mirror) is unambiguous and the cvar does have a read site with intended purpose.

### Proposed draft

```
Engine state mirror -- not user-actionable. Intended to persist the coach #1 team name across team-picking (parallel to _k_captteam1 for captains), but the write side was never implemented. Always empty at runtime.

Effect:
  Read by the team-change handler (FixPlayerTeam) when a player attempts to change team while k_coaches == 2 and the player was picked by coach #1: the stored team name would be enforced. Because no code writes this cvar, the comparison always evaluates against an empty string and the lock has no effect.

Permission:    Engine internal only -- never written by any in-game mechanism. Not user-actionable.
Default:       "" (empty).

See also: _k_coachteam2 (structurally identical sibling -- coach #2 slot), _k_captteam1 (captain-side equivalent with a functioning write path), coach (Match flow -- the election system this was intended to serve)
```

### Notes

- Verification: existing description claims "never written anywhere in the source" -- source-verified CONFIRMED. Grep for `cvar_set.*_k_coachteam` and `cvar_fset.*_k_coachteam` returns zero results. The read site at `g_userinfo.c:364` is confirmed but the write side is absent.
- The source comment at `g_userinfo.c:355` (`// do we need this at all? // it is here because the coach stuff was copied from captain`) explicitly acknowledges the vestigial nature of this block. The existing description is accurate; no factual contradiction.
- Cross-batch See-also: `coach` lives in the Match flow batch (drafted 2026-05-27).

<!-- VERDICT: drafted_with_flag -->
## _k_coachteam2 (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1028
- **Catalog line**: 8109
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal cvar registered by KTX but never written in the source. Intended as the slot-2 complement to _k_captteam2 for a coach-side team-lock path that was never fully wired; the branch that reads it is unreachable at runtime. Always empty; has no observable effect. See also _k_coachteam1 (structurally identical).
>
> Default: empty (no default set).
> Set by: not set by any in-game mechanism (internal / dead code).

### Shape classification

Shape 9b (engine-only state-mirror cvar -- vestigial/dormant variant).

Structurally identical to `_k_coachteam1`. Registered in `world.c:1028`. No `cvar_set` or `cvar_fset` write site found anywhere in source. Read site at `g_userinfo.c:368` inside the same `k_coaches == 2` block as `_k_coachteam1`. The existing description's claim that "the branch that reads it is unreachable at runtime" requires a minor correction: the branch IS reachable (when `k_coaches == 2` is true and the player's `k_picked == 2`), but the comparison against the always-empty cvar value means the lock enforcement has no real effect. The branch is reachable, not unreachable. This is a localized factual issue in framing, warranting a flag.

### Proposed draft

```
Engine state mirror -- not user-actionable. Intended to persist the coach #2 team name across team-picking (parallel to _k_captteam2 for captains), but the write side was never implemented. Always empty at runtime.

Effect:
  Read by the team-change handler (FixPlayerTeam) when a player attempts to change team while k_coaches == 2 and the player was picked by coach #2: the stored team name would be enforced. Because no code writes this cvar, the comparison always evaluates against an empty string and the lock has no effect.

Permission:    Engine internal only -- never written by any in-game mechanism. Not user-actionable.
Default:       "" (empty).

See also: _k_coachteam1 (structurally identical sibling -- coach #1 slot), _k_captteam2 (captain-side equivalent with a functioning write path), coach (Match flow -- the election system this was intended to serve)
```

### Notes

- FLAG: The existing description says "the branch that reads it is unreachable at runtime" -- source-verified PARTIALLY INCORRECT. The `k_coaches == 2` branch at `g_userinfo.c:357-382` IS reachable when two coaches have been elected and `k_picked == 2`. The branch is reachable; the lock enforcement within it is a no-op because the cvar is always empty (no write path). The draft corrects this framing.
- The "never written in source" claim is CONFIRMED. Grep for `cvar_set.*_k_coachteam2` returns zero results.
- Cross-batch See-also: `coach` lives in the Match flow batch (drafted 2026-05-27).

---

# Team-name state-mirrors

<!-- VERDICT: drafted -->
## _k_team1 (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:1029
- **Catalog line**: 8367
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal runtime state -- not for manual configuration. Stores the first competing team's name, captured when the match scoreboard is prepared. Used for scoreboard labels, score attribution, and the server hostname decoration (e.g. 'host (team1 vs. team2)'). Sibling of _k_team2 and _k_team3.
>
> Set by: server automatically at match start.

### Shape classification

Shape 9b (engine-only state-mirror cvar).

`_k_team1` is registered in `world.c:1029`. Write site: `cvar_set("_k_team1", team1)` at `match.c:1163` inside `SM_PrepareShowscores()` -- a state-transition function called at match start. It has numerous read sites across multiple files: `match.c:1189` (hostname decoration in `SM_PrepareHostname()`), `match.c:745,774` (score-lead broadcasts), `g_utils.c:1894` (score attribution), `client.c:3483,3520` (scoreboard display), `commands.c:3469,5378,5385,5386,6883` (score display and team-change enforcement), `clan_arena.c` (multiple CA-specific score/team tracking uses). No user write path exists. Shape 9b -- engine writes on match-start state transition, engine reads across multiple consumer functions for score attribution and display.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists the first competing team's name from match start so that score tracking, scoreboard display, and server hostname decoration can reference the team by name throughout the match.

Effect:
  Written at match start (SM_PrepareShowscores): captures the name of the first team found among ready players.
  Read by multiple consumers during the match:
    - Scoreboard display: labels team scores in the HUD overlay and score printouts.
    - Score-lead broadcasts: names the leading team in mid-match periodic updates.
    - Server hostname decoration: appended to the hostname as "(team1 vs. team2)" for the match duration.
    - Team-change enforcement (CA mode): verifies player team assignments during CA late-join and team-lock checks.

Permission:    Engine internal only -- set automatically at match start. Not user-actionable; direct set is overwritten at the next match start.
Default:       "" (empty).

See also: _k_team2 (sibling -- second team), _k_team3 (sibling -- third team in 3-way modes), _k_host (sibling -- original hostname saved alongside team names at match start)
```

### Notes

- Verification: write site confirmed at `match.c:1163` inside `SM_PrepareShowscores()`. Multiple read sites confirmed across `match.c`, `client.c`, `g_utils.c`, `commands.c`, `clan_arena.c`. No user write path found.
- The existing description mentions "scoreboard labels, score attribution, and hostname decoration" -- all confirmed. CA-specific team tracking reads were not in the existing description but are confirmed by source; added to Effect.
- Existing description omits Default -- added from registration site (empty).
- Example section omitted per Shape 9b template.
- Cross-batch See-also: scoreboard commands and teamplay commands are in other batches not yet shipped; See-also limited to sibling cvars confirmed in source.

<!-- VERDICT: drafted -->
## _k_team2 (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/match.c:1164 (write -- SM_SetTeams); src/world.c:1030 (registration)
- **Catalog line**: 8394
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal store of the second team's name, captured at match start. Used for scoreboard team labels, score attribution, and the match hostname decoration. Set by the server automatically -- not for manual configuration.
>
> Set by: server (internal, not for manual use).

### Shape classification

Shape 9b (engine-only state-mirror cvar). Written by `SM_SetTeams()` in `match.c` at match start via `cvar_set("_k_team2", team2)`. Read by multiple consumers (hostname decoration, score broadcasts, scoreboard, CA logic, spectator HUD) with no user-actionable write path.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists the second team's name from match start through the end of the match.

Effect:
  Written by the engine at match start when two distinct teams are detected. Read by:
  - Score broadcasts ("Team RED leads by N frags") during the match
  - Hostname decoration: appended as "team1 vs. team2" to the server hostname when k_showscores is set
  - Scoreboard and score display commands
  - Spectator HUD (tracking panel in two-team modes)
  - Clan Arena logic for dead-team detection and player-team membership checks

Prerequisites: none (engine self-manages).

Permission:    Engine internal only -- set automatically by SM_SetTeams() at match start. Not user-actionable; direct set is overwritten at the next match start.
Match-state:   Written at match start; persists through match end.
Default:       empty.

See also: _k_team1 (sibling -- first team name), _k_team3 (sibling -- third team name, three-team modes only)
```

### Notes

- Naming convention observation: `_k_team2` uses single underscore prefix (`_k_*`), consistent with the `_k_*` internal state-mirror family (`_k_team1`, `_k_team3`, `_k_host`, `_k_worldspawns`, etc.).
- The `Example` section is omitted per Shape 9b template -- entity is not user-actionable.

<!-- VERDICT: drafted -->
## _k_team3 (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/match.c:1183 (write -- SM_SetTeams); src/world.c:1031 (registration)
- **Catalog line**: 8421
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal store of the third team's name in three-team game modes (2on2on2, 3on3on3, 4on4on4). Captured at match start when a distinct third team is detected. Used for the three-team scoreboard labels, score attribution, and the server hostname display (team1 vs. team2 vs. team3).
>
> Empty/unset outside three-team modes. Internal; not for manual use.
> Set by: server automatically at match start.

### Shape classification

Shape 9b (engine-only state-mirror cvar). Written by `SM_SetTeams()` in `match.c:1183` only within the three-team mode branch (`current_umode >= um2on2on2 && current_umode <= um4on4on4`, covering 2on2on2, 3on3on3, 4on4on4). Not set in any other mode. Read by hostname decoration, score broadcasts, scoreboard, and spectator HUD in three-team mode paths.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists the third team's name during three-team matches (2on2on2, 3on3on3, 4on4on4 modes only).

Effect:
  Written at match start only when the active mode is 2on2on2, 3on3on3, or 4on4on4 and a distinct third team is detected. Outside three-team modes, this cvar is not written and remains empty. Read by:
  - Hostname decoration: appended as "team1 vs. team2 vs. team3" to the server hostname
  - Three-team score broadcasts during the match
  - Score display commands (three-team path)
  - Spectator HUD tracking panel (three-team path)

Prerequisites: none (engine self-manages).

Permission:    Engine internal only -- set automatically by SM_SetTeams() at match start when a three-team mode is active. Not user-actionable; direct set is overwritten at the next match start.
Match-state:   Written at match start (three-team modes only); persists through match end. Empty in all other modes.
Default:       empty.

See also: _k_team1 (sibling -- first team name), _k_team2 (sibling -- second team name)
```

### Notes

- The three-team mode restriction (2on2on2 / 3on3on3 / 4on4on4 only) is source-verified at `match.c:1165-1183`. The v2 recast makes this explicit in Effect -- the existing description mentioned it but not at the level of "not written and remains empty outside these modes."
- The `Example` section is omitted per Shape 9b template -- entity is not user-actionable.

---

# HoonyMode persistence (canonical Shape 9b worked examples)

<!-- VERDICT: drafted -->
## k_hoonymode_prevmap (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:890 (registration); src/hoonymode.c:1319 (write -- HM_store_spawns), src/hoonymode.c:1262 (read -- HM_restore_spawns)
- **Catalog line**: 8137
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal HoonyMode state -- do not set manually. Stores the map identifier (entity file name, or map name if no entity file) for which the previous team spawn nominations were saved.
>
> On the next team HoonyMode game: if the current map matches this value, the saved spawn assignments (k_hoonymode_prevspawns) are restored; if it differs, the saved spawns are cleared.
>
> Default: empty (no saved map).
> Set by: written automatically by the server; not a user-configurable setting.

### Shape classification

Shape 9b (engine-only state-mirror cvar). This is the canonical Shape 9b example per `worked-examples.md`. Written by `HM_store_spawns()` (called at HoonyMode match end) via `cvar_set("k_hoonymode_prevmap", strnull(entityFile) ? mapname : entityFile)`. Read by `HM_restore_spawns()` (called at map load) to decide whether to restore prior spawn nominations. Lifted from worked-examples.md Shape 9b section.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists the map identifier for which HoonyMode spawn nominations were last saved, so the engine can restore them on the next map load.

Effect:
  Written at HoonyMode match end: stores the entity-file name if one is active (k_entityfile), otherwise falls back to the bare map name.
  Read at the next map load: if the stored value matches the incoming map's identifier, the saved spawn nominations (k_hoonymode_prevspawns) are restored to their prior team assignments. If the map differs, k_hoonymode_prevspawns is cleared.

Prerequisites: none (engine self-manages).

Permission:    Engine internal only -- set automatically by HM_store_spawns() at HoonyMode match end. Not user-actionable; direct set is overwritten on the next HoonyMode match end.
Match-state:   Written at HoonyMode match end; read at next map load.
Default:       empty.

See also: k_hoonymode_prevspawns (sibling -- saved spawn nomination string), k_entityfile (determines which identifier is stored)
```

### Notes

- Lifted from worked-examples.md Shape 9b section as directed; these are the canonical Shape 9b examples in the catalog.
- The identifier logic (`strnull(entityFile) ? mapname : entityFile`) is source-verified at `hoonymode.c:1319`.

<!-- VERDICT: drafted -->
## k_hoonymode_prevspawns (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:891 (registration); src/hoonymode.c:1320 (write -- HM_store_spawns), src/hoonymode.c:1265,1295,1300 (read/clear -- HM_restore_spawns)
- **Catalog line**: 8167
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal state cvar -- do not set by hand. Stores the saved spawn-team nominations from the last team HoonyMode game as a digit string (one character per spawn, in map order: 0 = unnominated, 1 = red, 2 = blue). When the same map starts again in team HoonyMode, these nominations are reapplied; on map change or spawn-count mismatch the string is cleared.
>
> Default: empty string.
> Set by: written automatically by the server (HoonyMode engine).

### Shape classification

Shape 9b (engine-only state-mirror cvar). This is the canonical Shape 9b example per `worked-examples.md`. Written by `HM_store_spawns()` at HoonyMode match end. Read by `HM_restore_spawns()` at map load to re-apply spawn-team assignments. Cleared by `HM_restore_spawns()` on map-mismatch or spawn-count mismatch. Lifted from worked-examples.md Shape 9b section.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists HoonyMode spawn-team nominations across map transitions so they can be restored when the same map repeats.

Effect:
  Written at HoonyMode match end as a compact digit string -- one character per spawn point in map order:
    0 = unnominated
    1 = red team
    2 = blue team
  Read at the next map load: if k_hoonymode_prevmap matches the incoming map and the spawn-count matches the string length, all spawn points are restored to their saved nominations. If either check fails, the string is cleared.

Prerequisites: none (engine self-manages).

Permission:    Engine internal only -- set automatically by HM_store_spawns() at HoonyMode match end. Not user-actionable; direct set is overwritten on the next HoonyMode match end.
Match-state:   Written at HoonyMode match end; read at next map load.
Default:       empty.

See also: k_hoonymode_prevmap (sibling -- identifies the map for which these nominations were saved)
```

### Notes

- Lifted from worked-examples.md Shape 9b section as directed; these are the canonical Shape 9b examples in the catalog.
- The spawn-count mismatch guard (`strlen(spawns) == spawn_count`) is source-verified at `hoonymode.c:1274`. This is a user-visible behavioral guardrail: changing a map's spawn layout (e.g. different entity override) will trigger a clear on restore, which is the correct behavior.

---

# Match-bookkeeping state-mirrors

<!-- VERDICT: drafted -->
## _k_host (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:1032 (registration); src/match.c:1192 (write); src/match.c:302 (read/restore); src/logs.c:135 (XML log read)
- **Catalog line**: 8195
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal-state cvar set by KTX at runtime -- not intended for manual configuration. At match start the current server hostname is saved here; during the match it is written into the XML match log as the hostname field; at match end the server hostname is restored from it. Allows a temporary in-match hostname change to be logged and then automatically reverted.
>
> Default: (empty -- set by KTX at match start).
> Set by: KTX internal (runtime only; not set from server config).

### Shape classification

Shape 9b (engine-only state-mirror cvar).

`_k_host` is registered via `RegisterCvar("_k_host")` in `world.c:1032`. Write site is in `SM_PrepareHostname()` at `match.c:1192`: `cvar_set("_k_host", cvar_string("hostname"))` -- saves the server hostname at match start. Read sites are the XML log header (`logs.c:135`, writes `_k_host` value into the `<hostname>` XML element) and the match-end cleanup block (`match.c:302`, restores `hostname` cvar from `_k_host` via `trap_cvar_set`). No paired toggle/cycle command; no user-arg-derived write path. Write fires on a state-transition event (match start). Shape 9b is the correct classification: engine writes, engine reads, user has no actionable path.

### Proposed draft

```
Engine state mirror -- not user-actionable. Saves the server hostname at match start so KTX can stamp the XML match log and restore the hostname at match end.

Effect:
  Written at match start: the current `hostname` cvar value is copied here via `SM_PrepareHostname`.
  Read during match: the saved value is written into the `<hostname>` field of the XML match log (ktxlog).
  Read at match end: if non-empty, `hostname` is restored to this value (reverting any in-match hostname change applied by `SM_PrepareHostname`).

Permission:    Engine internal only -- set automatically at match start. Not user-actionable; direct `set` is overwritten at the next match start.
Match-state:   Written at match start; read during match (XML log) and at match end (restore).
Default:       (empty).

See also: k_extralog_xsd_uri (controls the XML log schema URI); _k_team1, _k_team2 (sibling state-mirrors saved alongside hostname at match start)
```

### Notes

- No contradictions found. The existing description is accurate and the v2 recast tightens it into the Shape 9b template.
- The XML log read site is in `StartLogs()` (`logs.c:135`), not a generic "during the match" write -- the actual log stamping happens at log-open time (match start), not repeatedly during the match. The Effect wording reflects this accurately.
- The match-end restore is conditional (`if (!strnull(tmp = cvar_string("_k_host")))`): only fires when the cvar is non-empty, which is the normal post-match-start state.

<!-- VERDICT: drafted -->
## _k_worldspawns (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:782 (registration), src/world.c:1116 (write -- map load), src/world.c:545,1118 (read sites)
- **Catalog line**: 8449
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal counter of how many maps the server has loaded since the process started. Incremented once per map. Used internally to gate first-map-only initialisation and to determine the map-check scheduling interval. Not intended for manual configuration.
>
> Default: empty/0 (internal; do not set manually).
> Set by: automatically by the server on each map load.

### Shape classification

Shape 9b (engine-only state-mirror cvar). Incremented via `cvar_fset("_k_worldspawns", (int)cvar("_k_worldspawns") + 1)` at each map load in `world.c:1116`. Read at `world.c:545` to schedule the map-checker interval (0.5s on first map, 60+random on subsequent), and at `world.c:1118` to gate first-map-only `k_defmode` initialization. No command arg path. No user-actionable write.

### Proposed draft

```
Engine state mirror -- not user-actionable. Counts how many maps the server has loaded since the process started, used to distinguish the first map from subsequent maps.

Effect:
  Incremented by 1 at each map load. The engine reads this counter to:
  - Schedule the map default-spawn checker: runs after 0.5 seconds on the first map, after 60-90 seconds on all subsequent maps
  - Gate first-map-only initialization: k_defmode mode selection runs only when this counter equals 1 (server's first map after restart)

Prerequisites: none (engine self-manages).

Permission:    Engine internal only -- incremented automatically at each map load. Not user-actionable; direct set is overwritten at the next map load.
Match-state:   Incremented at each map load; persists across the server process lifetime.
Default:       empty (0).

See also: _k_team1 (sibling -- engine state-mirror family), _k_team2 (sibling -- engine state-mirror family)
```

### Notes

- The two behavioral read paths are source-verified: `world.c:545` (map-checker scheduling) and `world.c:1118` (first-map defmode gate).
- Both read sites produce engine-internal timing/initialization effects only. No user-facing refusal or user-visible behavioral difference results from these paths -- the first-map/subsequent-map distinction affects internal scheduling, not gameplay rules the user can observe or change.
- See-also points to `_k_team1`/`_k_team2` as representative siblings from the `_k_*` engine state-mirror family; there is no shared concept note yet to point at.

<!-- VERDICT: drafted -->
## __k_ls (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:1036 (registration); src/commands.c:6961 (write -- match-results recorder), src/commands.c:6801,6986 (read sites)
- **Catalog line**: 8308
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal write cursor for the match-results ring buffer (lastscores / lastscoresktx). Advances by 1 (mod 30) each time a match result is recorded, wrapping around to overwrite the oldest entry. The lastscores command uses this as the starting point when printing recorded matches.
>
> Range: 0 to 29 (integer slot index). Internal; not for manual setting.
>
> Set by: server automatically after each match.

### Shape classification

Shape 9b (engine-only state-mirror cvar). The double-underscore prefix (`__k_*`) is unique in the KTX L1 corpus -- this entity and its ring-buffer siblings (`__k_ls_m_N`, `__k_ls_e1_N`, etc.) are the only `__k_*` registrations found. However, the mechanism is identical to Shape 9b: engine writes via `cvar_fset("__k_ls", ++k_ls % MAX_LASTSCORES)` in the match-results recording function (a non-handler state-transition path); no command-arg-derived path; no user-actionable write. The naming outlier does not change the shape classification. See Notes.

### Proposed draft

```
Engine state mirror -- not user-actionable. Holds the write cursor for the match-results ring buffer used by lastscores / lastscoresktx.

Effect:
  Advanced by 1 (mod 30) each time a match result is recorded, wrapping around after 30 entries to overwrite the oldest slot. The engine reads this value at two points:
  - Before writing a new result: determines which ring-buffer slot (0-29) the result is stored in
  - When lastscores / lastscoresktx is invoked: used as the starting index to iterate the ring buffer in order, so results are displayed from oldest to newest

Prerequisites: none (engine self-manages).

Permission:    Engine internal only -- advanced automatically after each match result is recorded. Not user-actionable; direct set is overwritten after the next recorded match.
Match-state:   Advanced at match end; persists across the server process lifetime.
Default:       empty (0).

See also: lastscores (consumer command -- displays the ring buffer contents), lastscoresktx (alias for lastscores)
```

### Notes

- The double-underscore prefix (`__k_ls`) is a naming outlier. All other KTX engine state-mirror cvars use a single leading underscore (`_k_*`). The `__k_*` prefix appears only in the lastscores ring-buffer family (`__k_ls`, `__k_ls_m_0..29`, `__k_ls_e1_0..29`, `__k_ls_e2_0..29`, `__k_ls_t1_0..29`, `__k_ls_t2_0..29`, `__k_ls_s_0..29`). The source comment at `world.c:1036` is "really internal mod usage" -- the same phrasing as the `_k_team*` family at 1029-1031, confirming the double-underscore is a naming choice for "even more internal" bookkeeping, not a distinct mechanism category.
- The mechanism matches Shape 9b exactly: engine-written at state-transition (match end), engine-read in consumer code, no user path. Classified as Shape 9b with this naming-outlier note for the operator.
- `MAX_LASTSCORES = 30` verified at `include/g_local.h:119`, confirming the 0-29 range stated in the existing description.
- The `Example` section is omitted per Shape 9b template -- entity is not user-actionable.

---

# Map-transition state-mirrors

<!-- VERDICT: drafted -->
## _k_last_cycle_map (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:780 (registration); src/maps.c:651 (read); src/maps.c:690 (write)
- **Catalog line**: 8223
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal runtime state -- not for manual configuration. Stores the 1-based index of the most recently used map-cycle entry. When choosing the next map KTX reads this value to resume the cycle from where it left off, so a voted map that is outside the cycle does not restart the rotation from the beginning.
>
> Set by: server automatically at each map transition.

### Shape classification

Shape 9b (engine-only state-mirror cvar).

`_k_last_cycle_map` is registered via `RegisterCvar("_k_last_cycle_map")` in `world.c:780`. The sole write site is `SelectMapInCycle()` (`maps.c:690`): `cvar_fset("_k_last_cycle_map", i)` -- writes the 1-based index of the selected map after it is located in the cycle. The read site is also in `SelectMapInCycle()` (`maps.c:651`): the function checks if the cvar is non-zero to resume from the last position instead of scanning from the current map. No paired toggle/cycle command; no user-arg-derived write path. Write fires inside the cycle-selection engine function. Shape 9b is correct.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists the 1-based index of the most recently selected map-cycle entry across map transitions so the cycle resumes in order.

Effect:
  Written by `SelectMapInCycle` after each map-cycle selection: stores the index of the chosen map entry.
  Read by `SelectMapInCycle` at the next map transition: if non-zero, the cycle resumes from this index rather than scanning from the current map's position. A voted map outside the cycle does not reset the counter.

Prerequisites: Applies only when the map-cycle rotation is active (k_ml_0, k_ml_1, ... entries configured); no effect when k_random_maplist overrides cycle selection.

Permission:    Engine internal only -- set automatically by the map-cycle selection logic. Not user-actionable; direct `set` is overwritten at the next cycle selection.
Default:       0 (cycle starts from the beginning or scans from the current map).

See also: k_ml_0 / k_ml_N (map-cycle entries this index addresses); k_random_maplist (bypasses the cycle when enabled)
```

### Notes

- No contradictions found. Existing description is accurate; v2 recast adds the Prerequisites and Default sections, and corrects the "at each map transition" write timing to "after each cycle selection" (the write only fires when `IsMapInCycle(buf)` succeeds -- i.e., when the selected new map is itself in the cycle).
- The existing description says "voted map that is outside the cycle does not restart the rotation" -- this is correct: the cvar retains its last-set value even when a non-cycle map is played.

<!-- VERDICT: drafted -->
## _k_lastmap (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:779 (registration); src/g_main.c:531 (write); src/world.c:1143 (read)
- **Catalog line**: 8250
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal cvar. Not set from config. Stores the name of the last map played; cleared to empty on a forced reset. On map load, KTX compares this to the current map name and re-applies the saved XonX user mode (via _k_last_xonx) only if the map actually changed -- so a team mode persists across a real map switch but not a same-map restart.
>
> Set by: KTX engine (map change / reset). Do not set manually.

### Shape classification

Shape 9b (engine-only state-mirror cvar).

`_k_lastmap` is registered via `RegisterCvar("_k_lastmap")` in `world.c:779`. Write site is in `g_main.c:531`: `cvar_set("_k_lastmap", (strnull(map) || force_map_reset ? "" : map))` -- stores the outgoing map name, cleared to empty on forced reset. Read site is in `world.c:1143`: `strneq(cvar_string("_k_lastmap"), mapname)` -- compared against the new map name to determine if a real map switch occurred; if both `_k_last_xonx > 0` and `_k_lastmap != current_map`, `UserMode(-cvar("_k_last_xonx"))` fires to re-apply the saved XonX mode. No paired toggle/cycle command; no user-arg-derived path. Write fires during pre-spawn cleanup (map transition). Shape 9b is correct.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists the name of the last map played so KTX can detect a genuine map switch and decide whether to re-apply the saved XonX game mode.

Effect:
  Written at each map transition: stores the name of the outgoing map. Cleared to empty when a forced reset occurs.
  Read at the start of each new map: compared against the incoming map name. If the map changed AND `_k_last_xonx` holds a remembered mode, KTX re-applies that mode automatically. If the map did not change (same-map restart), no re-application fires.

Permission:    Engine internal only -- set automatically at each map transition. Not user-actionable; direct `set` is overwritten on the next map change.
Default:       (empty).

See also: _k_last_xonx (stores the XonX mode index re-applied when this changes); _k_worldspawns (sibling state-mirror tracking spawn count across transitions)
```

### Notes

- No contradictions found. The v2 recast surfaces the behavioral consequence (the XonX re-apply gate) clearly in Effect, which the existing description already had; the recast just structures it under the v2 template.
- The "cleared to empty on a forced reset" behavior is confirmed: `force_map_reset` path sets the cvar to `""`.

<!-- VERDICT: drafted -->
## _k_last_xonx (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:778 (registration); src/commands.c:4847 (write, UserMode saves); src/commands.c:4857 (write, reset clears); src/world.c:1124, 1134, 1139 (write, FirstFrame init); src/world.c:1143-1145 (read, auto-reapply gate)
- **Catalog line**: 8277
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal mod-state cvar. Stores the last-applied XonX game mode (1on1 / 2on2 / 4on4 / ffa / ctf) so the server can auto-reapply it on map change. Not operator-tuned.
>
> 0 = no mode remembered (reset).
> Non-zero = a mode is remembered and will be re-applied on next map load.
>
> Default: 0.
> Set by: server runtime only (not intended for server config).

### Shape classification

Shape 9b (engine-only state-mirror cvar).

`_k_last_xonx` is registered via `RegisterCvar("_k_last_xonx")` in `world.c:778`. Write sites are in engine/mod state-transition functions: `UserMode()` in `commands.c:4847` writes `umode + 1` (a 1-based mode index) after applying a game mode; `execute_rules_reset()` at `commands.c:4857` clears it to 0; `world.c:1124/1134/1139` writes it during FirstFrame initialization to set default or ffa mode for matchless servers. Read sites are in `world.c:1143-1145`: `(cvar("_k_last_xonx") > 0) && strneq(cvar_string("_k_lastmap"), mapname)` gates the auto-reapply of `UserMode(-cvar("_k_last_xonx"))`. Also read by bot-command restoration paths (`bot_commands.c:2150, 2436`). No paired toggle/cycle command; no user-arg-derived path. Shape 9b is correct. Note: writes also fire from `UserMode()` which is reachable from user-invoked game-mode commands (1on1, ffa, etc.) -- but the user invokes those commands, not this cvar directly.

### Proposed draft

```
Engine state mirror -- not user-actionable. Persists the 1-based index of the last-applied XonX game mode so KTX can automatically re-apply it on the next genuine map switch.

Effect:
  Written by `UserMode()` each time a game mode is applied (1on1, 2on2, ffa, ctf, etc.): stores the mode index as a 1-based integer. Cleared to 0 by a rules reset.
  Read at map spawn: if non-zero AND `_k_lastmap` differs from the new map name, KTX re-applies the remembered mode automatically -- preserving the active game mode across map rotations without requiring a re-issue of the mode command.
  A value of 0 means no mode is remembered; no auto-reapply fires.

Permission:    Engine internal only -- written automatically when a game mode is applied or reset. Not user-actionable; direct `set` is overwritten when the next mode change or reset fires.
Default:       0.

See also: _k_lastmap (gate cvar -- auto-reapply only fires when the map actually changes); 1on1 / ffa / ctf (game-mode commands that trigger the write)
```

### Notes

- No contradictions. The existing description's "1on1 / 2on2 / 4on4 / ffa / ctf" enumeration of modes is user-helpful context for what the index represents, accurately conveying the semantic meaning.
- The stored value is `umode + 1` (1-based integer index into UserModes_t enum), not the mode name string. The Effect wording clarifies this without exposing the integer detail unnecessarily.
- Bot command paths (`bot_commands.c:2150, 2436`) also read `_k_last_xonx` to restore mode state -- minor behavioral depth, not user-actionable; omitted from L1 per MVI discipline.

<!-- VERDICT: drafted -->
## _k_pow_last (KTX cvar, Internal state -- Shape 9b)

- **Status**: drafted
- **Source**: src/world.c:783 (registration); src/g_main.c:532 (write); src/g_utils.c:1808 (read)
- **Catalog line**: 8337
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal carry-over of the powerups-enabled state from the previous map. Written at map end (stores the resolved on/off result of k_pow); read on the first frame of the next map to seed powerup spawning consistently across the map change.
>
> 0 = powerups were off on the previous map.
> 1 = powerups were on.
>
> Internal; not for manual setting. Set by: server automatically at map end.

### Shape classification

Shape 9b (engine-only state-mirror cvar).

`_k_pow_last` is registered via `RegisterCvar("_k_pow_last")` in `world.c:783`. Write site is in `g_main.c:532`: `cvar_fset("_k_pow_last", Get_Powerups())` -- stores the resolved powerups state at map transition (just before the new map spawns). Read site is in `g_utils.c:1808` inside `Get_Powerups()` at `framecount == 1`: `k_pow = cvar("_k_pow_last")` -- on the first frame of a new map, the restored value seeds the initial `k_pow` check before enough players are connected for a real count. No paired toggle/cycle command; no user-arg-derived path. Write fires during pre-spawn cleanup (map transition). Shape 9b is correct.

### Proposed draft

```
Engine state mirror -- not user-actionable. Carries the resolved powerups-enabled state from the previous map so the first-frame powerup check is seeded correctly before all players have reconnected.

Effect:
  Written at each map transition: stores the value returned by `Get_Powerups()` at map end -- the resolved powerup state accounting for player count and `k_pow`.
  Read on the first frame of the next map (`framecount == 1` inside `Get_Powerups()`): seeds `k_pow` before a full player count is available, ensuring powerup spawning is consistent with the previous map's state rather than defaulting to off during the reconnection window.

Permission:    Engine internal only -- set automatically at map transition. Not user-actionable; direct `set` is overwritten at the next map end.
Default:       0.

See also: k_pow (the powerups master switch whose resolved state this cvar carries over); k_pow_min_players (player-count gate that Get_Powerups() evaluates when writing this cvar)
```

### Notes

- No contradictions. The existing description's "0 = powerups were off, 1 = powerups were on" is a useful simplification. Source confirms `Get_Powerups()` returns 0 or the effective `k_pow` value (which is normally 0 or 1 but technically inherits whatever `k_pow` holds). The 0/1 framing is accurate for the typical case and is user-appropriate for L1.
- Apply-pass concern: `k_pow`'s card (drafted in Gameplay rules batch, 2026-05-27) should surface `_k_pow_last` in its See-also as a return cross-reference. The drafter should verify the Gameplay rules draft for `k_pow` and add `_k_pow_last (engine carry-over cvar)` to that card's See-also if absent.

---

# Internal command (server-stuffed bootstrap)

<!-- VERDICT: drafted -->
## cmdslist_dl (KTX command, Internal state -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:700 (registration); src/commands.c:1353 (handler); src/commands.c:1407 (self-recursive pagination stuffcmd); src/commands.c:1424 (StuffModCommands initial trigger)
- **Catalog line**: 8477
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Internal client-bootstrap command. Not aliasable and hidden from the commands listing. Sends the client a batch of command aliases (one per registered KTX command) so they become usable as plain client aliases; re-invokes itself in batches until the full list is transferred, then prints 'Commands loaded'.
>
> Skips commands not valid for the caller's class, commands with no handler, and non-aliasable commands. Reports 'cmdslist alredy stuffed' if already delivered.
>
> Default: n/a (command, not a cvar).
> Set by: server (part of the client connection/handshake flow; triggered automatically on connect).

### Shape classification

shape-less (internal command-side mechanism -- command-alias download sibling of `mapslist_dl`; no paired cvar, no inter-entity vote relationship, no cycle, no gate).

`cmdslist_dl` is the command-alias download counterpart to `mapslist_dl` (map-list download). Both have identical CF flags and parallel handler structure. The shape catalog's `shape-less` classification applies: this command carries no inter-entity relationship shape from the catalog; it is a pure internal mechanism executed via server-stuffed `cmd` invocations, not user-typed console commands. Like `mapslist_dl`, this is a shape-less internal-mechanism entity.

CF flags verified at `commands.c:700`: `CF_BOTH | CF_MATCHLESS | CF_PARAMS | CF_NOALIAS | CF_CONNECTION_FLOOD`.

Permission mapping per CF-flag-to-wording table:
- `CF_BOTH` = `CF_PLAYER | CF_SPECTATOR` -> "any player or spectator" at the flag level
- `CF_NOALIAS` = not aliasable; only accessible via `cmd cmdslist_dl <N>` syntax
- `CF_CONNECTION_FLOOD` = flood protection relaxed at connection time (first ~30 seconds)
- `CF_MATCHLESS` = valid in matchless mode

Because `CF_NOALIAS` is set, direct console invocation as a named command is blocked; the command is reachable only as `cmd cmdslist_dl <N>` (server-stuffed at connect by `StuffModCommands`, then self-recursive via `stuffcmd_flags`). The effective permission for a user is: not directly invocable -- server-internal bootstrap only.

### Proposed draft

```
Server-internal client-bootstrap command that transfers the KTX command-alias list to a connecting client in batches. Not directly invocable from the console.

Effect:
  On each invocation (server-stuffed as `cmd cmdslist_dl <N>`): installs up to `MAX_STUFFED_ALIASES_PER_FRAME` command aliases on the client, starting at index N. Each alias maps a KTX command name to its `cmd <index>` equivalent so the command becomes typeable without the `cmd` prefix.
  Skips commands that are not valid for the caller's class (player vs spectator), commands with no handler (`dummy` entries), and commands flagged CF_NOALIAS.
  Re-stuffs itself as `cmd cmdslist_dl <next>` until all eligible commands are transferred, then prints "Commands loaded".
  Reports "cmdslist alredy stuffed" if the client already received the full list this session.

Permission:    Server-internal only -- not directly invocable. Accessible only as `cmd cmdslist_dl <N>` (server-stuffed at connect by the bootstrap sequence; self-recursive until complete). CF_NOALIAS blocks console alias creation.
Match-state:   Any time (CF_MATCHLESS; also valid mid-match for late-connecting clients).

See also: mapslist_dl (sibling command -- same bootstrap mechanism for the map list); StuffModCommands (the internal function that initiates the first `cmd cmdslist_dl 0` stuffcmd at client connect)
```

### Notes

- No contradictions. The existing description is accurate; the v2 recast structures it under the universal shape template and derives the Permission line from CF flags rather than prose inference.
- CF flags verified: `CF_BOTH | CF_MATCHLESS | CF_PARAMS | CF_NOALIAS | CF_CONNECTION_FLOOD` at `commands.c:700`. Identical to `mapslist_dl` at `commands.c:699`.
- `StuffModCommands` is referenced in See-also as a plain label (not an L1 entity); it is the internal function, not a user-facing command. This is acceptable as a mechanism label in See-also.
- The existing description's typo "alredy" appears verbatim in source (`G_sprint(self, 2, "cmdslist alredy stuffed\n")`); preserved accurately in the draft.

---

## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author
should resolve before applying drafts to L1.

### F1: `_k_*` underscore-prefix as Shape 9b identification heuristic

**Verdict**: CONFIRMED_CLEAN (catalog-amendment candidate -- naming hint, not new shape)

**Cards involved**: 17 of 19 cards in this batch (all entities with `_k_*` single-underscore prefix: `_k_captcolor1`, `_k_captcolor2`, `_k_captteam1`, `_k_captteam2`, `_k_coachteam1`, `_k_coachteam2`, `_k_team1`, `_k_team2`, `_k_team3`, `_k_host`, `_k_worldspawns`, `_k_last_cycle_map`, `_k_lastmap`, `_k_last_xonx`, `_k_pow_last`); the 2 hoonymode cvars (`k_hoonymode_prevmap`, `k_hoonymode_prevspawns`) use single-`k_` prefix but are also Shape 9b.

**Observation**: All 17 `_k_*` entities classified cleanly as Shape 9b on independent per-card source verification (no shape-bias from prefix alone; sub-agents derived classification from source signature each time). The pattern is reliable: `_k_*` indicates engine-internal state-mirror with engine-only write paths and no user-actionable syntax. The 2 `k_hoonymode_prev*` cvars confirm that Shape 9b is not exclusively gated on the underscore prefix (`k_*` cvars can also be Shape 9b when the mechanism matches), but the converse holds: in this corpus, every `_k_*` cvar IS Shape 9b.

**Source evidence**: 19 source-verified write/read site reports in the per-card Notes sections (chunks A/B/C); registration locations in `world.c:778-1036` (the contiguous "internal mod usage" block).

**Recommendation**: Document the `_k_*` prefix as a Shape 9b identification heuristic in `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` (Shape 9 section, identification guide). This is a naming convention worth a one-line note as a pre-classification hint; do NOT promote to a new shape. Earn-their-keep: 17 instances across one category meet the instance threshold, but the differentiation is naming-only, not load-bearing template differentiation. Operator's call whether to surface this as a brief amendment alongside future batches.

---

### F2: `__k_*` double-underscore family is a Shape 9b sub-family (informational)

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `__k_ls` (chunk B); operator-visible context for the full `__k_*` ring-buffer family at `world.c:1036-1185` (`__k_ls_m_0..29`, `__k_ls_e1_0..29`, `__k_ls_e2_0..29`, `__k_ls_t1_0..29`, `__k_ls_t2_0..29`, `__k_ls_s_0..29` -- approximately 210 cvars total).

**Observation**: `__k_ls` is the only `__k_*` entity in this batch. Source comment at `world.c:1036` reads "really internal mod usage" (compare with `_k_team*` family at `1029-1031`: "internal mod usage" -- same phrasing without "really"). The double underscore is a naming choice for "even more internal" bookkeeping, not a distinct mechanism category. Mechanism for `__k_ls` is identical to Shape 9b (engine-written ring-buffer cursor; engine-read consumer in `lastscores` / `lastscoresktx`); no user-actionable path.

**Source evidence**: `world.c:1036-1185` (registration block with source comment); `commands.c:6961` (write site for `__k_ls`); `commands.c:6801,6986` (read sites); `include/g_local.h:119` (`MAX_LASTSCORES = 30`).

**Recommendation**: No action required. The `__k_*` family is a Shape 9b sub-family that would all classify identically if surfaced as L1 entities. The `__k_ls` draft's Notes section documents the naming outlier for the operator. If a future batch covers `__k_ls_*` sibling cvars (the per-slot ring-buffer entries), they will all classify as Shape 9b with the same observation -- apply the canonical-card pattern centralizing on `__k_ls` so the 210 sibling cards don't duplicate the full template.

---

### F3: `_k_pow_last` <-> `k_pow` cross-batch See-also back-link missing (ACTIONABLE -- apply pass)

**Verdict**: ACTIONABLE (apply-pass-author)

**Cards involved**: `_k_pow_last` (this batch, chunk C); `k_pow` (Gameplay rules batch, drafted 2026-05-27 in `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-gameplay-rules.md`).

**Observation**: `_k_pow_last`'s draft See-also correctly includes `k_pow` as the master switch whose resolved state it carries over. The reverse back-link is MISSING: `k_pow`'s draft See-also (Gameplay rules batch, drafted same date) enumerates per-type switches and matchless threshold cvars but does NOT include `_k_pow_last`. Grep against the Gameplay rules drafts file confirmed zero references to `_k_pow_last` in `k_pow`'s See-also or anywhere else in that drafts file.

**Source evidence**: `_k_pow_last` draft See-also (this file, chunk C section): `See also: k_pow (the powerups master switch whose resolved state this cvar carries over); k_pow_min_players (player-count gate that Get_Powerups() evaluates when writing this cvar)`. `k_pow` draft See-also (Gameplay rules drafts, line 75): `See also: powerups (toggle command), k_pow_q (quad switch), k_pow_p (pent switch), k_pow_r (ring switch), k_pow_s (suit switch), k_pow_min_players (matchless auto-toggle threshold), k_pow_check_time (matchless check interval)`. No mention of `_k_pow_last`.

**Recommendation**: At apply time, add `_k_pow_last (engine carry-over state-mirror -- seeds first-frame powerup check after map transition)` to `k_pow`'s See-also when applying the Gameplay rules drafts to L1. This is a one-line addition to an existing draft; do NOT modify the Gameplay rules drafts file itself (treat as an apply-pass-author concern). The bidirectional cross-link makes the carry-over relationship discoverable from both ends.

---

### F4: SKILL amendment validation -- F1 / F3 / F13 from Gameplay rules ship

**Verdict**: F13 CONFIRMED WORKING; F1 PARTIALLY VALIDATED (limited test surface); F3 NOT TRIGGERED (dormant)

**Cards involved**: All 19 cards in this batch; the 3 SKILL amendments landed 2026-05-27 after the Gameplay rules ship and before this batch dispatched.

**Observation**: This was the SKILL-amendment-validator batch per the handoff. Each amendment exercised:

- **F1 (CF flag mandatory extraction)**: Only 1 command entity in batch (`cmdslist_dl`). Chunk C sub-agent correctly derived Permission line from CF flags (`CF_BOTH | CF_MATCHLESS | CF_PARAMS | CF_NOALIAS | CF_CONNECTION_FLOOD`) rather than from existing prose. Permission narrative "Server-internal only -- not directly invocable" maps from `CF_NOALIAS` per the table; the other flags qualify access scope. The amendment WORKED on this single test case, but the broader pattern (multiple commands per batch with inferred-Permission residue) cannot be tested here -- Internal state is cvar-dominated. Future command-heavy batches (Race, Player communication) will provide a wider test.

- **F3 (manual-flip Shape 1 variant)**: NOT TRIGGERED in this batch. No Shape 1 toggle commands present (Internal state has zero `cvar_toggle_msg` / `cvar_fset` paired-toggle patterns). The amendment is dormant for this batch; first true validation will be in a batch containing Shape 1 toggle commands.

- **F13 (/tmp filename batch-date suffix)**: CONFIRMED WORKING. All 3 chunk scratch files used the correct `/tmp/chunk_<A|B|C>_2026-05-27.md` naming. Dispatcher validation passed: 7+6+6 = 19 sections; entity-name lists match input lists exactly; no stale content from prior batches surfaced. The Gameplay rules batch's F13 collision pattern is prevented by the amendment.

**Source evidence**: `/tmp/chunk_A_2026-05-27.md` (7 sections), `/tmp/chunk_B_2026-05-27.md` (6 sections), `/tmp/chunk_C_2026-05-27.md` (6 sections). Validation grep transcript in the dispatcher's Step 4 record.

**Recommendation**: No further amendment needed at this time. Continue monitoring F1 over the next 2 command-heavy batches (Race, Player communication). If F3 manual-flip Shape 1 still has zero triggers across the remaining batches, mark it as future-coverage-only and shelve until MVDSV / QWFWD / QTV forks. F13 is fully validated -- preserve the convention in future dispatchers.

---

### F5: Cross-batch See-also threading for captain / coach / team / mode families (informational)

**Verdict**: CONFIRMED_CLEAN (apply-pass-author cross-batch concerns documented)

**Cards involved**: `_k_captcolor1/2`, `_k_captteam1/2` -> `captain` (Match flow batch, drafted 2026-05-27); `_k_coachteam1/2` -> `coach` (Match flow batch); `_k_last_xonx` -> `1on1` / `ffa` / `ctf` (Match flow batch).

**Observation**: Six cards in this batch include cross-batch See-also pointers to entities drafted in the Match flow batch (same date, separate file). The draft See-also wording uses the canonical entity names (`captain`, `coach`, `1on1`, etc.) without inline annotation that those entities live in a different batch. Apply-pass-author should verify that the Match flow drafts file contains the named entities before applying these See-also lines, and at apply time the L1 cross-link is naturally resolved (entities are stored by name, not by batch).

**Source evidence**: Chunk A See-also lines (lines 43, 88, 132, 175, 219, 262); Chunk C See-also lines (line 181).

**Recommendation**: When applying drafts in batch order (Match flow ships before / alongside Internal state in the apply queue), the cross-batch See-also targets will already be in L1. No reordering required. If for any reason Match flow's apply gets deferred, the Internal state See-also lines remain accurate but reference yet-unapplied entities -- that's a sequencing concern for the operator, not a drafting bug.

---

### F6: Vestigial Shape 9b pattern -- first occurrence in any batch (informational)

**Verdict**: CONFIRMED_CLEAN (novel pattern recognized, not requiring catalog change)

**Cards involved**: `_k_coachteam1`, `_k_coachteam2` (chunk A).

**Observation**: Both coach-side cvars are registered in `world.c:1027-1028` and have read sites in `g_userinfo.c:355-382` inside a `k_coaches == 2` branch -- but NO write site exists anywhere in source. Grep for `cvar_set.*_k_coachteam` and `cvar_fset.*_k_coachteam` returns zero hits. Source comment at `g_userinfo.c:355` confirms: "do we need this at all? // it is here because the coach stuff was copied from captain". This is the first instance in any batch of a Shape 9b cvar that is registered + read but never written -- a "vestigial Shape 9b" where the write side was never implemented. The mechanism type (state-mirror) is unambiguous; the vestigial state is documented in Notes.

**Source evidence**: `world.c:1027-1028` (registration); `g_userinfo.c:355-382` (read sites + source comment); grep transcript confirming zero write sites.

**Recommendation**: No action required. The two cards correctly draft under Shape 9b with the vestigial-state observation surfaced in Notes. If future arcs surface additional vestigial Shape 9b cvars (e.g. partial-implementation features in newer KTX builds), the same pattern applies: classify under Shape 9b, document the missing write side in Notes, do NOT promote to a new shape. The pattern is a code-state observation, not a mechanism distinction.
