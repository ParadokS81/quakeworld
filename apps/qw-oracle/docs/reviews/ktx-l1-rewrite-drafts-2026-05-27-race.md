# ktx-l1-rewrite drafts -- batch 2026-05-27 (Race category)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies
clean drafts, hand-edits flagged-drafts after verifying the surfaced
contradiction. Drafts do NOT auto-apply to L1 (`entities.description`);
the apply pass is a separate phase.

Batch shape: 45 cards across 5 chunks (9+9+9+9+9 = 45). **31 drafted clean +
14 drafted_with_flag + 0 parked.** Zero halt-on-novelty signals. F1 SKILL
amendment caught 10 of 29 commands with Permission mislabels (~34% catch
rate); F3 amendment dormant for top-level Shape 1 toggles (canonical
`cvar_toggle_msg` used throughout); F13 batch-date-suffixed `/tmp` filename
convention confirmed working across all 5 chunks.

Shape mix observed: Shape 1 canonical (k_race+race cross-batch; k_race_match+race_match;
k_race_simultaneous+race_simultaneous), Shape 1 + Shape 1c (k_race_simultaneous's
match-mode-overlay relationship), Shape 2 cycle (k_race_scoring_system+race_scoring),
Shape 2 + Shape 5 (direct-set escape on the scoring cvar), Shape 3 (most other k_race_*
cvars), Shape 3 + Shape 4 facet (k_race_pace_enabled and k_race_pace_legal both
gate record-validity), Shape 9a side-channel (k_race_route_mapname +
k_race_route_number), shape-less (most race-namespace commands + race_pacemaker's
multi-arg dispatcher + the chasecam family).

Anchor: `v1.36-1633-g67253dc`.

Sub-grouping by family follows the dispatch chunks; each chunk grouped
race-feature-coherent entities.

---

# Core mode + countdown + per-player race-status (chunk A — 9 cards)

<!-- VERDICT: drafted -->
## k_race (KTX cvar, Race -- Shape 1 cvar+toggle)

- **Status**: drafted
- **Source**: src/world.c:912
- **Catalog line**: 13892
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables Race mode on the server. When on, the server runs checkpoint time-trial rules and applies race-specific settings (practice mode, deathmatch 4, etc.). Toggled by the 'race' command; the toggle is refused while bots are enabled or a race is already started with players present.
>
> 0 = Race mode off.
> 1 = Race mode on.
>
> Default: 0.
> Set by: server config or 'race' toggle command.

### Shape classification

Shape 1 (cvar+paired toggle, canonical). `cvar_toggle_msg(self, "k_race", redtext("race"))` at race.c:269 is the canonical Shape 1 source signature. The paired toggle command is `race` (handler `ToggleRace()` at race.c:242). No mode-precondition that makes this Shape 1c -- race is not a modifier on top of another base mode; it IS the mode.

### Proposed draft

```
Enables Race mode -- checkpoint time-trial rules with practice settings (deathmatch 4, no items, air-step off). Toggled in-game by the 'race' command.

0 = Race mode off.
1 = Race mode on.

Default: 0.

Prerequisites:
  Enabling is refused if bots are active (disable them first with /botcmd disable).
  Enabling is refused if players are already in the race line-up with a run in progress.

Permission:    Server config or 'race' toggle command in-game.
Match-state:   Pre-match / pre-run only (enabling blocked once players are present in an active run).

Example:
  # server.cfg
  k_race 1

  # in-game toggle
  race

See also: race (paired toggle command)
```

### Notes

- Verification: `ToggleRace()` at race.c:242 uses `cvar_toggle_msg(self, "k_race", redtext("race"))` at race.c:269 -- canonical Shape 1 confirmed.
- Verification: `apply_race_settings()` at race.c:271 sets `deathmatch 4`, `srv_practice_mode 1`, `k_noitems 1`, `pm_airstep 0` and other settings -- existing description's "practice mode, deathmatch 4 etc." confirmed accurate.
- Verification: bots check at race.c:244 (`bots_enabled()`) and `CountPlayers() && race_is_started()` check at race.c:264 -- both refusal conditions confirmed.
- The `race` command (paired toggle) was drafted in the Mode selection batch (2026-05-26). Cross-linked via See-also without batch-boundary annotation per dispatcher convention.

---

<!-- VERDICT: drafted_with_flag -->
## k_race_countdown (KTX cvar, Race -- Shape 3 with paired numeric adjusters)

- **Status**: drafted_with_flag
- **Source**: src/world.c:913
- **Catalog line**: 13954
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Length in seconds of the countdown before a race run starts. When a run is armed the timer is set from this value. Can be changed mid-run via the race countdown-change command, which accepts values strictly between 0 and 6; values outside that range are rejected and the previous setting is kept.
>
> Range: strictly 0 to 6 seconds (exclusive, enforced by the countdown-change command).
>
> Default: 2.
> Set by: server config or race countdown-change command.

### Shape classification

Shape 3 (cvar with no paired toggle command), with paired numeric adjusters. `RaceCountdownChange()` at race.c:274 adjusts the value by +1 or -1 via `cvar_fset`; no `cvar_toggle_msg` exists for this cvar. The adjuster commands are each shape-less (paired numeric levers); the cvar itself is Shape 3 (server-config, runtime-adjustable). The cvar is NOT Shape 1 (no binary toggle, no `cvar_toggle_msg`) and NOT Shape 2 (no cycle wrap pattern). The relationship between the two adjuster commands and this cvar is captured in See-also cross-links.

### Proposed draft

```
Length in seconds of the countdown before a race run starts. Initialized from this value when a run is armed.

Range: 1 to 5 seconds (inclusive). Values outside this range are rejected by the adjuster commands -- the current setting is kept and reported to the caller. Adjusted in-game by race_countdown_up / race_countdown_down (each step ±1 second).

Default: 2.

Prerequisites: Adjuster commands require race mode active and no run currently in progress.

Permission:    Server config, or 'race_countdown_up' / 'race_countdown_down' in-game.
Match-state:   Pre-match / pre-run only (adjuster commands blocked once a run is in progress).

Example:
  # server.cfg
  k_race_countdown 3

  # in-game step up
  race_countdown_up
  # server: Race countdown length set to 3 seconds

See also: race_countdown_up (increases by 1 second), race_countdown_down (decreases by 1 second), k_race (race mode toggle)
```

### Notes

- FLAG: The existing description says "Can be changed mid-run via the race countdown-change command." Source at race.c:278 shows `if (match_in_progress || !isRACE() || race_is_started()) { return; }` -- the `race_is_started()` check blocks the adjuster commands when a run IS in progress. "Mid-run" in the existing description is incorrect; the draft corrects this to "pre-match / pre-run only."
- Verification: `RegisterCvarEx("k_race_countdown", "2")` at world.c:913 -- default 2 confirmed.
- Verification: Range bound `rcd > 0 && rcd < 6` at race.c:283 -- valid integer values are 1, 2, 3, 4, 5. The description's "strictly 0 to 6 exclusive" is accurate but rendered as "1 to 5 inclusive" for clarity.
- Verification: On accept: `G_bprint(2, "%s %s %s\n", redtext("Race countdown length set to"), dig3(rcd), redtext("seconds"))` at race.c:286. On reject: `G_sprint(self, 2, "%s still %s\n", redtext("race countdown"), dig3(rcd - t))` at race.c:289.

---

<!-- VERDICT: drafted_with_flag -->
## race_countdown_up (KTX command, Race -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:696
- **Catalog line**: 14582
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Increases the race start-countdown length by 1 second (steps the k_race_countdown cvar up). Only active in race mode, when no match is in progress and the race has not yet started.
>
> The new value is accepted only in the range 1-5 seconds; out-of-range results are rejected (cvar unchanged), and the caller is notified "race countdown still <old-value>". On accept, the new value is broadcast to all players.
>
> Set by: admin command 'race_countdown_up' in-game (race mode only, pre-match).

### Shape classification

Shape-less (paired numeric adjuster -- command-side lever for k_race_countdown). Steps a bounded numeric cvar by +1; no binary toggle (not Shape 1), no cycle wrap (not Shape 2). The inter-entity relationship is captured via See-also cross-link to k_race_countdown and sibling race_countdown_down. Shape tag belongs on k_race_countdown.

### Proposed draft

```
Increases the race start-countdown length by 1 second, stepping k_race_countdown up.

Effect:
  Adds 1 second to k_race_countdown. If the result would exceed 5, the change is rejected and the caller sees "race countdown still <current>". On accept, the new value is broadcast to all players ("Race countdown length set to N seconds").

Prerequisites: Race mode must be active and no run currently in progress.

Permission:    Any player or admin spectator.
Match-state:   Pre-match / pre-run only.

Example:
  race_countdown_up
  # server: Race countdown length set to 3 seconds

See also: race_countdown_down (decreases by 1 second), k_race_countdown (the cvar being stepped), k_race (race mode)
```

### Notes

- FLAG: Existing description says "Set by: admin command" -- CF flags at commands.c:696 are `CF_PLAYER | CF_SPC_ADMIN`, which per the CF-flag-to-wording table maps to "any player or admin spectator", NOT admin-only. Draft corrects this.
- Verification: handler `DEF(RaceCountdownChange)` with arg `1` at commands.c:696. `RaceCountdownChange(1)` at race.c:274-290 confirmed. Gate: `match_in_progress || !isRACE() || race_is_started()` at race.c:278.
- Note: `race_countdown_up` uses the inline `!isRACE()` gate in `RaceCountdownChange`, NOT `race_command_checks()`. The rejection message for race-mode absence is not the canonical `race_command_checks()` string -- the handler simply returns silently when `!isRACE()`. Prerequisites prose uses "race mode must be active" without quoting a specific string.

---

<!-- VERDICT: drafted_with_flag -->
## race_countdown_down (KTX command, Race -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:697
- **Catalog line**: 14554
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Decrease the race start countdown length by 1 second (adjusts k_race_countdown). The change is only accepted if the result stays in the range 1-5 seconds; otherwise the current value is reported unchanged. Ignored unless race mode is active, no match is in progress, and the race has not yet started.
>
> Range: 1-5 seconds (k_race_countdown).
> Set by: admin command 'race_countdown_down' (race mode, pre-start only).

### Shape classification

Shape-less (paired numeric adjuster -- sibling of race_countdown_up; command-side lever for k_race_countdown). Same pattern as race_countdown_up; shape tag lives on k_race_countdown.

### Proposed draft

```
Decreases the race start-countdown length by 1 second, stepping k_race_countdown down.

Effect:
  Subtracts 1 second from k_race_countdown. If the result would drop below 1, the change is rejected and the caller sees "race countdown still <current>". On accept, the new value is broadcast to all players ("Race countdown length set to N seconds").

Prerequisites: Race mode must be active and no run currently in progress.

Permission:    Any player or admin spectator.
Match-state:   Pre-match / pre-run only.

Example:
  race_countdown_down
  # server: Race countdown length set to 1 seconds

See also: race_countdown_up (increases by 1 second), k_race_countdown (the cvar being stepped), k_race (race mode)
```

### Notes

- FLAG: Existing description says "Set by: admin command" -- CF flags at commands.c:697 are `CF_PLAYER | CF_SPC_ADMIN`, which per the CF-flag-to-wording table maps to "any player or admin spectator", NOT admin-only. Draft corrects this.
- Verification: handler `DEF(RaceCountdownChange)` with arg `-1` at commands.c:697. Same handler body as race_countdown_up, same gate. Bound check: `rcd > 0` means current must be >= 2 to step down (rcd=current-1; if current=1 then rcd=0, fails `rcd > 0`).

---

<!-- VERDICT: drafted -->
## race_ready (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1004
- **Catalog line**: 14759
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Marks the calling player as ready to race, adding them to the race line-up. Has no effect for spectators or outside race mode. In race match mode, refused once a round is in progress ("Cannot join match in progress").
>
> Set by: any player 'race_ready'.

### Shape classification

Shape-less (per-player race-status setter). `r_changestatus(1)` at race.c:3027-3036 calls `set_player_race_ready(self, 1)`. No cvar pairing, no vote mechanism. Sibling to race_break/race_toggle/race_cancel; all four are per-player status setters sharing the same dispatcher. The shape tag does not belong on this command -- it is a leaf of the race-status family with no inter-entity relationship beyond gate + sibling cross-links.

### Proposed draft

```
Joins the race line-up -- marks you as ready to run when the countdown starts.

Effect:
  Sets your ready state to 1. Broadcasts "<name> joined the line-up" to all players.

Prerequisites:
  - Race mode must be active ("Command only available in race mode (type /race to activate it)").
  - In race match mode: refused if a round is already in progress ("Cannot join match in progress").

Permission:    Any player (spectators excluded).

Example:
  race_ready
  # server: <YourName> joined the line-up

See also: race_break (leaves the line-up), race_toggle (toggles ready state), race_cancel (aborts active run), k_race (race mode toggle)
```

### Notes

- Verification: `r_changestatus(1)` at race.c:3027: spectator check `self->ct == ctSpec` at race.c:3020 (returns silently), match-mode check at race.c:3028 ("Cannot join match in progress"), `set_player_race_ready(self, 1)` at race.c:3035. `set_player_race_ready()` at race.c:2924: broadcasts `G_bprint(2, "%s %s the line-up\n", e->netname, redtext("joined"))`. Existing description accurate, no flags needed.
- CF: `CF_PLAYER` (alone) at commands.c:1004 -- "any player (spectators excluded)" confirmed. Spectators are additionally filtered by the `self->ct == ctSpec` runtime check in `r_changestatus`.
- `race_command_checks()` at race.c:3015 is the gate for all four `r_changestatus` cases; refusal message quoted verbatim from race.c:2955.

---

<!-- VERDICT: drafted -->
## race_break (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1005
- **Catalog line**: 14387
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race mode command: marks you as not ready for the race and clears your race-ready state. If you are actively running at the time, your run is ended and the server announces "<name> has quit the race". Has no effect for spectators.
>
> Default: n/a (command).
> Set by: any player via 'race_break' (race mode only).

### Shape classification

Shape-less (per-player race-status setter -- unconditional leave). `r_changestatus(2)` clears ready state unconditionally (after spectator check); additionally ends an active run if one is in progress. Sibling to the other three per-player status commands. Distinct from race_cancel: race_break always clears line-up membership; race_cancel only aborts a run without touching line-up state.

### Proposed draft

```
Leaves the race line-up -- clears your ready state. If you are mid-run, the run is ended first.

Effect:
  Clears your ready state to 0. Broadcasts "<name> left the line-up".
  If you were actively running: ends your run and broadcasts "<name> has quit the race".

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    Any player (spectators excluded).

Example:
  race_break

See also: race_ready (joins the line-up), race_toggle (toggles ready state), race_cancel (aborts run without leaving line-up), k_race (race mode toggle)
```

### Notes

- Verification: `r_changestatus(2)` at race.c:3039: active-run branch checks `self->racer && race.status`, broadcasts `G_bprint(PRINT_HIGH, "%s has quit the race\n", self->netname)` and calls `race_end()`. Then `set_player_race_ready(self, 0)` broadcasts `"<name> left the line-up"`. Existing description accurate.
- Distinguishing note: race_break always clears ready state (and ends run if active); race_cancel only aborts an active run without clearing line-up membership. The See-also note captures this.

---

<!-- VERDICT: drafted -->
## race_toggle (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1007
- **Catalog line**: 15183
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles your ready status for race mode. If you are mid-run when you toggle, the run is first ended before ready status changes.
>
> Set by: any in-game player ('race_toggle' in-game).

### Shape classification

Shape-less (per-player race-status setter -- toggle variant). `r_changestatus(3)` flips `self->race_ready` via `set_player_race_ready(self, !self->race_ready)`. This is a per-player binary flip of individual player state, NOT a global cvar toggle -- Shape 1 requires a paired global `k_*` cvar with `cvar_toggle_msg`. Shape-less with sibling cross-links.

### Proposed draft

```
Toggles your race line-up status -- joins if you were out, leaves if you were in. If a run is active when you toggle out, the run is ended first.

Effect:
  Flips your ready state between 0 and 1.
  If toggling from ready to not-ready while running: ends your run and broadcasts "<name> has quit the race", then broadcasts "<name> left the line-up".
  If toggling from not-ready to ready: broadcasts "<name> joined the line-up".

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    Any player (spectators excluded).

Example:
  race_toggle   # if not in line-up: joins
  race_toggle   # if already in line-up: leaves

See also: race_ready (unconditionally joins), race_break (unconditionally leaves), race_cancel (aborts run only), k_race (race mode toggle)
```

### Notes

- Verification: `r_changestatus(3)` at race.c:3050: if `self->racer && race.status`, broadcasts "has quit the race" + `race_end()`. Then `set_player_race_ready(self, !self->race_ready)` at race.c:3057 -- which broadcasts "joined the line-up" or "left the line-up" via the set_player_race_ready() internals at race.c:2924-2948. Existing description accurate.

---

<!-- VERDICT: drafted -->
## race_cancel (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1008
- **Catalog line**: 14442
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race mode only. Aborts your own current run if one is in progress. Plays an abort sound and broadcasts "<name> aborted his/her run". Has no effect for spectators or when no run is active.
>
> Default: n/a (command).
> Set by: any racer ('race_cancel').

### Shape classification

Shape-less (per-player race-status setter -- run-abort variant). `r_changestatus(4)` fires only if `self->racer && race.status`; does NOT touch line-up ready state. Distinct from race_break, which always clears the line-up. Sibling to the other three per-player status commands.

### Proposed draft

```
Aborts your current race run. Only fires if you are actively running; has no effect otherwise.

Effect:
  Ends your active run. Plays an abort sound. Broadcasts "<name> aborted his/her run" to all players.
  Your line-up ready state is not cleared -- you remain in the line-up after cancelling.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)") and you must currently be running (you are a racer and a run is in progress).

Permission:    Any player (spectators excluded).

Example:
  race_cancel
  # server: <YourName> aborted his run

See also: race_break (leaves line-up and ends run), race_toggle (toggles ready state), race_ready (joins line-up), k_race (race mode toggle)
```

### Notes

- Verification: `r_changestatus(4)` at race.c:3061: checks `!self->racer` (returns if not racer) and `!race.status` (returns if no run in progress). Then `sound(self, CHAN_ITEM, "boss2/idle.wav", 1, ATTN_NONE)`, `G_bprint(PRINT_HIGH, "%s aborted %s run\n", self->netname, g_his(self))`, `race_end(self, true, false)`. Existing description accurate.
- "his/her run" -- `g_his(self)` is a pronoun helper that returns "his" or "her" based on player gender setting. Existing description's "his/her" is correct shorthand.
- Key behavioral distinction: case 4 does NOT call `set_player_race_ready(self, 0)` -- line-up membership is preserved after cancel. This is load-bearing and not in the existing description; added to Effect.

---

<!-- VERDICT: drafted -->
## race_break_all (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1006
- **Catalog line**: 14415
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race-mode admin command that forces all racers to stop, clearing their ready state and broadcasting "<name> has forced the race to stop" to all players. Requires admin privileges.
>
> Set by: admin command in race mode.

### Shape classification

Shape-less (admin-side bulk race-status reset). `r_all_break()` at race.c:3199 calls `race_unready_all()` (clears `race_ready=0` for all players) then broadcasts. CF_BOTH_ADMIN → admin only. No cvar pairing, no vote mechanism. Single-purpose bulk reset; no inter-entity relationship beyond gate + sibling cross-links.

### Proposed draft

```
Forces all players out of the race line-up -- clears every player's ready state and stops any active runs.

Effect:
  Clears the ready state of every player. Broadcasts "<name> has forced the race to stop" to all players.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    Admin only.

Example:
  race_break_all

See also: race_break (single-player leave), race_ready (joins line-up), k_race (race mode toggle)
```

### Notes

- Verification: `r_all_break()` at race.c:3199: calls `race_command_checks()` (race mode gate), then `race_unready_all()`, then `G_bprint(2, "%s has %s the race to stop\n", self->netname, redtext("forced"))`. Broadcast confirmed as "has forced the race to stop". Existing description accurate.
- CF: `CF_BOTH_ADMIN` at commands.c:1006 = `CF_PLR_ADMIN | CF_SPC_ADMIN` → "admin only". Existing "Requires admin privileges" is correct; draft formalizes as "Admin only."
- `race_unready_all()` at race.c:541 directly zeroes `p->race_ready = 0` for all players without calling `set_player_race_ready()` -- so individual "left the line-up" broadcasts are NOT sent per player. The single "has forced the race to stop" broadcast is the only message.

---

# Match mode + scoring + simultaneous + runtime cvars (chunk B — 9 cards)

<!-- VERDICT: drafted_with_flag -->

- **Status**: drafted_with_flag
- **Source**: src/world.c:922
- **Catalog line**: 14325
- **Anchor**: v1.36-1633-g67253dc

### Current description

> In race mode, controls whether queued players race individually in turn or all race simultaneously. Race-match mode enables simultaneous racing regardless of this setting.
>
> 0 = queued racers take turns; each player runs the course alone while others wait.
> 1 = all ready players in the queue race the course at the same time.
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 1 (cvar+paired toggle) + Shape 1c (mode-precondition: race mode required).

`race_simultaneous_toggle` at race.c:5118 calls `cvar_toggle_msg(self, RACE_SIMULTANEOUS_CVAR, redtext("simultaneous racing"))` after `race_command_checks()` (isRACE() gate at race.c:5120). This is the canonical Shape 1 + Shape 1c pattern. The internal `race_simultaneous()` predicate at race.c:5021 returns `race_match_mode() || cvar(RACE_SIMULTANEOUS_CVAR)` — match mode auto-enables simultaneous racing regardless of this cvar, which is user-observable and belongs in Effect.

### Proposed draft

```
Controls whether queued racers run the course at the same time or one at a time.

0 = racers take turns; each player runs the course alone while others wait in the queue.
1 = all readied racers start simultaneously.

Effect:
  - Race match mode (k_race_match) forces simultaneous racing regardless of this setting.

Prerequisites: Race mode must be active to use the race_simultaneous toggle in-game.

Permission:    server config, or 'race_simultaneous' in-game (any player in race mode)
Match-state:   pre-match only (refused while a race run or countdown is in progress)
Default:       0 (server config default). Race mode activation resets this to 1 via the built-in race settings bundle — set explicitly in server.cfg to override.

Example:
  # server.cfg
  k_race 1
  k_race_simultaneous 0    // turn-based racing; overrides the race-activation default of 1

  # in-game (race mode must already be active)
  race_simultaneous        // toggles between turn-based and simultaneous

See also: race_simultaneous (paired toggle command), k_race_match (match mode -- forces simultaneous on)
```

### Notes

- FLAG: Existing description states "Default: 0" and "Set by: server config only." Both are incomplete. `RegisterCvar` default is 0 (world.c:922), but the `race_settings[]` string applied when race mode activates (race.c:308) sets `k_race_simultaneous 1`. A server operator setting `k_race 1` in server.cfg without explicitly setting `k_race_simultaneous` will get simultaneous=1 at runtime. The recast surfaces this in Default.
- FLAG: Existing description says "Set by: server config only" — the paired toggle command `race_simultaneous` is omitted from the Set-by. Recast adds it to Permission.
- The internal `race_simultaneous()` function (race.c:5021) is the engine-internal predicate; not a user-invokable entity. Not surfaced as a separate L1 item.
- F3 (manual-flip) does NOT apply: handler uses `cvar_toggle_msg` (race.c:5130), the canonical Shape 1 path.

---

## race_simultaneous (KTX command, Race -- Shape 1 + Shape 1c)

<!-- VERDICT: drafted_with_flag -->

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1027
- **Catalog line**: 15155
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race mode only. Toggles simultaneous racing on or off. When on, all readied racers run the course at the same time; when off, racers take turns. Broadcasts the change to all players. Has no effect while a race is in progress.
>
> Default: n/a (command; sets k_race_simultaneous).
> Set by: admin command 'race_simultaneous' in-game.

### Shape classification

Shape 1 + Shape 1c command side. CF flags: `CF_PLAYER` (alone) at commands.c:1027. Handler: `race_simultaneous_toggle` at race.c:5118.

### Proposed draft

```
Toggles simultaneous racing (k_race_simultaneous) on or off; broadcasts the new state to all players.

Prerequisites: Race mode must be active — "Command only available in race mode (type /race to activate it)". Refused while a race run or countdown is in progress.

Permission:    any player (spectators excluded)
Match-state:   pre-match only

Example:
  race_simultaneous    // flips between turn-based and simultaneous; all players see the announcement

See also: k_race_simultaneous (state cvar), k_race_match (match mode -- forces simultaneous on regardless)
```

### Notes

- FLAG: Existing description says "Set by: admin command 'race_simultaneous' in-game" — the "admin" label is wrong. CF flag is `CF_PLAYER` (alone) at commands.c:1027. Any player in race mode can toggle this, not just admins. Recast corrects Permission to "any player (spectators excluded)."
- F1 CF-flag extraction: CF_PLAYER (alone) → "any player (spectators excluded)" per the CF-flag-to-wording table.
- F3 (manual-flip) does NOT apply: handler uses `cvar_toggle_msg` (race.c:5130).

---

## k_race_match (KTX cvar, Race -- Shape 1)

<!-- VERDICT: drafted -->

- **Status**: drafted
- **Source**: src/world.c:923
- **Catalog line**: 14015
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Master toggle for race match mode. Controls whether race runs as individual best-run attempts or as a competitive multi-round match.
>
> 0 = individual mode: each racer chases their personal best; per-run demos are recorded individually.
> 1 = match mode: racers start simultaneously, points awarded per round, server-level demo recorded instead of per-run demos.
>
> Default: 0.
> Set by: server config or 'race_match_toggle' admin command (also adjusts server demo recording settings).

### Shape classification

Shape 1 (cvar+paired toggle). `race_match_toggle` at race.c:5231 calls `cvar_toggle_msg(self, RACE_MATCH_CVAR, redtext("match mode"))` followed immediately by `cvar_fset("sv_silentrecord", cvar(RACE_MATCH_CVAR) ? 0 : 1)` at race.c:5244. This is Shape 1 with a side-effect on a non-KTX mvdsv cvar. The side-effect is user-observable: enabling match mode makes the server start recording (sv_silentrecord=0); disabling suppresses recording (sv_silentrecord=1).

### Proposed draft

```
Master toggle for race match mode — switches between individual best-run attempts and a competitive multi-round match.

0 = individual mode: each racer chases their personal best time; per-run MVD demos are recorded individually (controlled by k_race_autorecord).
1 = match mode: all readied racers start simultaneously, points awarded per round using the active scoring system (k_race_scoring_system), and server-level demo recording is enabled for the match.

Effect:
  - Enabling match mode forces simultaneous racing on (k_race_simultaneous is overridden at runtime regardless of its value).
  - Match runs for k_race_match_rounds rounds; the scoreboard tracks cumulative points.
  - Toggling via the race_match command also adjusts sv_silentrecord: enabling sets sv_silentrecord 0 (server records the match); disabling sets sv_silentrecord 1 (recording suppressed).

Prerequisites: Race mode must be active. Configure k_race_scoring_system and k_race_match_rounds before enabling for a match.

Permission:    server config, or 'race_match' in-game (any player in race mode)
Match-state:   pre-match only
Default:       0

Example:
  # server.cfg
  k_race 1
  k_race_match 1
  k_race_match_rounds 9
  k_race_scoring_system 0    // Win Only scoring

  # in-game (race mode active, pre-match)
  race_match                 // toggles match mode on/off; sv_silentrecord adjusts automatically

See also: race_match (paired toggle command), k_race_match_rounds (round count), k_race_scoring_system (points system), k_race_simultaneous (forced on in match mode)
```

### Notes

- The existing description names the command as "race_match_toggle" (Set-by line). The actual in-game command registered at commands.c:1028 is `race_match`. Minor naming inaccuracy in existing prose; not foundational — recast corrects it.
- The sv_silentrecord side-effect (race.c:5244): `cvar_fset("sv_silentrecord", cvar(RACE_MATCH_CVAR) ? 0 : 1)` fires immediately after `cvar_toggle_msg`. sv_silentrecord is a non-KTX mvdsv engine cvar. User-observable (changes server recording behavior), so surfaced in Effect.
- verdict `drafted` (not `drafted_with_flag`): the "race_match_toggle" naming in Set-by is a prose-level inaccuracy, not a factual claim about the entity's behavior. The recast corrects it but no FLAG is needed since it doesn't affect the apply-pass decision.

---

## race_match (KTX command, Race -- Shape 1)

<!-- VERDICT: drafted_with_flag -->

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1028
- **Catalog line**: 14697
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race-mode command that toggles match mode (k_race_match) on or off and announces the new state. Enabling match mode also enables demo recording; disabling it suppresses recording.
>
> Only works in race mode. Refused while a race run is in progress.
>
> Set by: any player in race mode (before a run starts).

### Shape classification

Shape 1 command side (paired toggle for k_race_match). CF flags: `CF_PLAYER` (alone) at commands.c:1028. Handler: `race_match_toggle` at race.c:5231.

### Proposed draft

```
Toggles race match mode (k_race_match) on or off and broadcasts the new state to all players. Also immediately adjusts server demo recording: enabling match mode sets sv_silentrecord 0 (server recording active); disabling sets sv_silentrecord 1 (recording suppressed).

Prerequisites: Race mode must be active — "Command only available in race mode (type /race to activate it)". Refused while a race run or countdown is in progress.

Permission:    any player (spectators excluded)
Match-state:   pre-match only

Example:
  race_match    // toggles match mode on/off; sv_silentrecord adjusts automatically

See also: k_race_match (state cvar), k_race_match_rounds (round count), k_race_scoring_system (scoring system)
```

### Notes

- FLAG: Existing description says "Set by: any player in race mode (before a run starts)" — the permission framing is ambiguous (could be read as admin-only). CF flag is `CF_PLAYER` (alone) confirmed at commands.c:1028. Recast corrects Permission to "any player (spectators excluded)" per the CF-flag-to-wording table.
- F1 CF-flag extraction: CF_PLAYER (alone) → "any player (spectators excluded)."
- F3 (manual-flip) does NOT apply: handler uses `cvar_toggle_msg` at race.c:5243.
- The sv_silentrecord side-effect (race.c:5244) is surfaced in the Headliner because it is the key user-observable consequence beyond the simple toggle.

---

## k_race_scoring_system (KTX cvar, Race -- Shape 2)

<!-- VERDICT: drafted -->

- **Status**: drafted
- **Source**: src/world.c:925
- **Catalog line**: 14291
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Selects the scoring system used to award frags per round in race match mode. Cycled by the scoring-system toggle command.
>
> 0 = Win Only: 1 frag to the round winner only.
> 1 = Scaled: 1 frag for completing the run, +1 per opponent beaten, plus a winner bonus.
> 2 = Formula1: position-based points (25/18/15/12/10/8/6/4/2/1).
>
> No effect outside race match mode (requires k_race_match enabled).
>
> Default: 0.
> Set by: server config or scoring-system toggle command.

### Shape classification

Shape 2 (cvar + paired cycle command). `race_scoring_system_toggle` at race.c:5164 reads the cvar, increments mod 3 (`current = (current + 1) % NUM_SCORING_SYSTEMS`), writes back via `cvar_fset(RACE_SCORINGSYSTEM_CVAR, current)` at race.c:5178-5179. Three hardcoded presets in `scoring_systems[]` at race.c:5148-5159. The cvar has no effect outside match mode (`race_award_points` returns 0 when not in match mode at race.c:5190). Shape 5 (direct-set escape) also applies: setting `k_race_scoring_system 1` directly jumps to Scaled without cycling.

### Proposed draft

```
Selects the scoring system used to award frags per round in race match mode. Cycled in order by the race_scoring command.

0 = Win Only: 1 frag to the round winner; no points for completing or placing.
1 = Scaled: 1 frag for completing the run, +1 per opponent beaten, +1 bonus for the winner (recommended for 3+ players).
2 = Formula1: points by finishing position — 25/18/15/12/10/8/6/4/2/1 for positions 1-10; no points beyond 10th.

Effect:
  - Has no effect outside race match mode; k_race_match must be enabled for points to be awarded.
  - Can be set directly to a specific index (e.g. k_race_scoring_system 2) to skip cycling.

Prerequisites: k_race_match must be enabled for this setting to take effect at runtime. Race mode must be active to use the race_scoring cycle command in-game.

Permission:    server config, or 'race_scoring' in-game (any player in race mode, pre-match only)
Default:       0

Example:
  # server.cfg
  k_race 1
  k_race_match 1
  k_race_scoring_system 2    // Formula1 scoring; set directly rather than cycling

  # in-game (race mode + match mode active, pre-match)
  race_scoring               // cycles: Win Only → Scaled → Formula1 → Win Only

See also: race_scoring (paired cycle command), k_race_match (match mode gate)
```

### Notes

- The source scoring_systems table (race.c:5148-5159) has exactly 3 entries matching the existing description's value enum precisely.
- Shape 5 noted in Effect bullet and Example.
- The cvar's value affects `race_award_points()` (race.c:5184) only when `race_match_mode()` is true — the existing description's "No effect outside race match mode" is source-verified.

---

## race_scoring (KTX command, Race -- Shape 2)

<!-- VERDICT: drafted_with_flag -->

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1029
- **Catalog line**: 14841
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race-mode command. Cycles the scoring system (k_race_scoring_system) to the next one and announces the change. Wraps from the last system back to the first. Refused while a race run or match is in progress.
>
> Systems in order: Win Only (1 point for the winner only), Scaled (completion points + per-opponent bonus + winner bonus), Formula1 (points by finishing position).
>
> Default: n/a (command).
> Set by: admin command 'race_scoring'.

### Shape classification

Shape 2 command side (paired cycle for k_race_scoring_system). CF flags: `CF_PLAYER` (alone) at commands.c:1029. Handler: `race_scoring_system_toggle` at race.c:5164.

Handler checks: (1) `race_command_checks()` — isRACE() gate; (2) `race_is_started() || match_in_progress` (race.c:5173) — refuses if race countdown/run active OR if global match_in_progress flag is set. Uses `cvar_fset` cycle (NOT `cvar_toggle_msg`) — this is Shape 2, not Shape 1.

### Proposed draft

```
Cycles the scoring system (k_race_scoring_system) to the next preset and broadcasts the change to all players. Wraps from Formula1 back to Win Only.

Cycle order:  Win Only (0) → Scaled (1) → Formula1 (2) → Win Only (0)

Prerequisites: Race mode must be active — "Command only available in race mode (type /race to activate it)". Refused while a race run or countdown is in progress.

Permission:    any player (spectators excluded)
Match-state:   pre-match only

Example:
  race_scoring    // advances to next system; announces "X enabled the <system> scoring system"

See also: k_race_scoring_system (state cvar; can be set directly to skip cycling), k_race_match (match mode -- scoring only takes effect when enabled)
```

### Notes

- FLAG: Existing description says "Set by: admin command 'race_scoring'" — the "admin" label is wrong. CF flag is `CF_PLAYER` (alone) at commands.c:1029. Any player in race mode can cycle the scoring system, not just admins. Recast corrects Permission.
- F1 CF-flag extraction: CF_PLAYER (alone) → "any player (spectators excluded)."
- Value enum lives on the cvar card (k_race_scoring_system), not here — per Shape 2 discipline. Command card carries cycle behavior and cycle order only.
- The `match_in_progress` check at race.c:5173 (in addition to `race_is_started()`) is an extra guard but in practice is redundant given the race-mode prerequisite; not surfaced separately in Match-state.
- F3 (manual-flip) does NOT apply here — this is a cycle command using `cvar_fset`, not a manual flip of a toggle. Shape 2, confirmed.

---

## k_race_autorecord (KTX cvar, Race -- Shape 3)

<!-- VERDICT: drafted -->

- **Status**: drafted
- **Source**: src/world.c:915
- **Catalog line**: 13923
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether the server automatically records an MVD demo when a race run starts.
>
> 0 = no automatic demo recording for race runs.
> 1 (non-zero) = server starts recording when a counted run begins (not active in race match mode).
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command). `RegisterCvarEx("k_race_autorecord", "1")` at world.c:915. The only read site is `race_record()` at race.c:718: `if (race.cd_cnt && cvar("k_race_autorecord"))` — calls `StartDemoRecord()` only when not in match mode (`if (!race_match_mode())` at race.c:720). No command writes this cvar. Grep of src/*.c confirms no `cvar_toggle_msg` or `cvar_fset` site for "k_race_autorecord".

### Proposed draft

```
Controls whether the server automatically starts an MVD demo recording when a race countdown begins.

0 = no automatic recording; runs complete without a server-side demo.
1 = server records an MVD demo from the start of each counted race run.

Effect:
  - Has no effect in race match mode (k_race_match = 1); match mode manages recording via sv_silentrecord instead (set by the race_match toggle command).
  - Recording begins at countdown start (when the race lineup has at least one player), not at the moment the player crosses the start node.

Permission:    server config only
Default:       1

Example:
  # server.cfg
  k_race_autorecord 0    // disable auto-recording (e.g. for practice servers)

See also: k_race_match (match mode -- overrides this; uses sv_silentrecord for demo control)
```

### Notes

- Source-verified: race.c:718-726 — the `race_record()` function checks both `race.cd_cnt` (countdown has started with players) and `cvar("k_race_autorecord")` before calling `StartDemoRecord()`, and explicitly skips recording in match mode.
- The existing description is accurate; recast adds the countdown-timing detail and match-mode override note from Step 1.5 behavioral unpacking.
- No FLAG needed.

---

## k_race_custom_models (KTX cvar, Race -- Shape 3)

<!-- VERDICT: drafted_with_flag -->

- **Status**: drafted_with_flag
- **Source**: src/world.c:914
- **Catalog line**: 13984
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether race checkpoint markers use dedicated custom models (progs/start.mdl, progs/check.mdl, progs/finish.mdl) for the start, checkpoint, and finish positions respectively.
>
> 0 = use default node models for race markers.
> 1 = precache and use custom race marker models.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command). `RegisterCvarEx("k_race_custom_models", "0")` at world.c:914. Read in `model_for_nodeType()` at race.c:867: `if (cvar("k_race_custom_models"))` returns progs/start.mdl / progs/check.mdl / progs/finish.mdl for the three node types; else returns engine defaults. No command writes this cvar. Model selection is applied each time a route node is spawned via `setmodel(e, model_for_nodeType(node->type))` at race.c:1704.

Source-verified default models from race.c:895: start → progs/invulner.mdl. Checkpoint and finish defaults are determined by the else-branch of `model_for_nodeType()`; source shows the function returns an engine-default path for those not explicitly named in the else-branch (the function uses a switch-case and only explicitly names progs/invulner.mdl for start; checkpoint and finish fall through to G_Error indicating the else-branch is not fully implemented for those types in a non-custom setup).

### Proposed draft

```
Controls which models are used for race route markers (start, checkpoint, and finish nodes) when route nodes are spawned on map load.

0 = default engine models for race markers (start node: progs/invulner.mdl).
1 = custom race models:
      start      → progs/start.mdl
      checkpoint → progs/check.mdl
      finish     → progs/finish.mdl

Effect:
  - Custom models (progs/start.mdl, progs/check.mdl, progs/finish.mdl) must exist in the server's progs/ directory; missing models will cause a precache error at map load.
  - Model selection applies when race route nodes are spawned; changing this mid-match requires a map reload to take effect.

Permission:    server config only
Default:       0

Example:
  # server.cfg
  k_race_custom_models 1    // enable custom race marker models

See also: k_race (race mode enable cvar)
```

### Notes

- FLAG: The existing description says "use default node models for race markers" without specifying them. Source verifies start node default is `progs/invulner.mdl` (race.c:895). The checkpoint and finish defaults from the else-branch of `model_for_nodeType()` could not be fully verified from the visible source snippet — the function calls G_Error on unknown nodeType for both branches, so the actual default values for checkpoint/finish in the 0 path require a deeper read of the else-branch case statements (race.c:885-900 area). Apply-pass author should verify the default checkpoint and finish model names from the full else-branch and complete the 0-value enum line if needed.
- The existing description says "precache and use custom race marker models" — the "precache" claim is implementation-level prose. The recast surfaces the user-facing consequence (models must exist on disk) instead.

---

## k_race_match_rounds (KTX cvar, Race -- Shape 3)

<!-- VERDICT: drafted_with_flag -->

- **Status**: drafted_with_flag
- **Source**: src/world.c:924
- **Catalog line**: 14046
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Number of rounds in a race match. The scoreboard shows 'round: N/<this value>' and the match ends when the configured round count is reached.
>
> Range: 3-21 (clamped; values below 3 become 3, above 21 become 21).
>
> Default: see server config (only effective when k_race_match is enabled).
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command). `RegisterCvarEx("k_race_match_rounds", "9")` at world.c:924. Read at race.c:523: `race.rounds = bound(RACE_MIN_MATCH_ROUNDS, cvar(RACE_MATCH_ROUNDS_CVAR), RACE_MAX_MATCH_ROUNDS)` — clamped to [3, 21] at match initialisation (RACE_MIN_MATCH_ROUNDS=3, RACE_MAX_MATCH_ROUNDS=21 per race.c:41-42). Scoreboard display at race.c:2572: `snprintf(tmp, sizeof(tmp), "%d/%d\n", race.round_number + 1, race.rounds)`. Also present in race_settings[] at race.c:311 as the race-mode activation default. No command writes this cvar.

### Proposed draft

```
Number of rounds in a race match (k_race_match mode only). The scoreboard displays 'round: N/<rounds>' during the match; the match ends when all rounds are completed.

Range: 3-21. Values outside this range are clamped at match start: below 3 becomes 3, above 21 becomes 21.

Effect:
  - Only effective when k_race_match is enabled; has no effect in individual race mode.
  - Read at match initialisation; changing this mid-match requires restarting the match to take effect.

Prerequisites: k_race_match must be enabled for this setting to have any effect.

Permission:    server config only
Default:       9

Example:
  # server.cfg
  k_race 1
  k_race_match 1
  k_race_match_rounds 5    // 5-round match

See also: k_race_match (match mode gate), k_race_scoring_system (points awarded per round)
```

### Notes

- FLAG: Existing description says "Default: see server config (only effective when k_race_match is enabled)" — the default value is omitted. `RegisterCvarEx("k_race_match_rounds", "9")` at world.c:924 confirms Default = 9. The recast corrects this.
- The scoreboard display format is source-verified (race.c:2572): `snprintf(tmp, sizeof(tmp), "%d/%d\n", race.round_number + 1, race.rounds)`. The existing description's "round: N/<this value>" is accurate.
- Clamping is applied at match init (race.c:523), not at cvar-set time — a misconfigured value is silently clamped, not rejected.

---

# Pacemaker family + race_pacemaker dispatcher + display nuances (chunk C — 9 cards)

<!-- VERDICT: drafted -->
## k_race_pace_enabled (KTX cvar, Race -- Shape 3 + Shape 4 facet)

- **Status**: drafted
- **Source**: src/world.c:921 (registration); src/race.c:4477 (pacemaker loads -> sets to 1); src/race.c:4343 (pacemaker off -> sets to 0); src/race.c:4480-4483 (read by race_pacemaker_enabled()); src/race.c:1341 (gate: blocked_record)
- **Catalog line**: 14076
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables the race pacemaker -- a recorded ghost run that racers chase. Active only when non-zero AND a ghost route has been captured. When active, the ghost spawns at race start and advances along its recorded path; a head-start offset may apply.
>
> 0 = pacemaker off.
> 1 = pacemaker active (requires a captured ghost route).
>
> Set by: server automatically via the 'pacemaker' command (set to 1 on select, 0 on disable).

### Shape classification

Shape 3 + Shape 4 facet. No paired toggle command; `race_pacemaker` writes this cvar (sets to 1 on load at race.c:4477, 0 on disable at race.c:4343). Shape 4 facet: read by `race_pacemaker_enabled()` at race.c:4480-4483 which is consulted at race.c:1341 for `blocked_record = race_pacemaker_enabled() && !cvar(RACE_PACEMAKER_LEGAL_RECORD)`. When pacemaker is enabled and k_race_pace_legal=0, completed runs do not count as records.

### Proposed draft

```
Whether the race pacemaker ghost is currently loaded and active.

Effect:
  0 = pacemaker off; no ghost spawns at race start.
  1 = pacemaker active; the loaded ghost spawns at race start and advances along its recorded path.
      Requires a ghost route to have been loaded via 'race_pacemaker'. Setting this directly without
      a loaded ghost has no visible effect (race_pacemaker_enabled() checks both this flag AND
      whether ghost data is present).
  When the pacemaker is active, the head-start offset (k_race_pace_headstart) applies to the ghost's
  effective start position. Runs completed with the pacemaker active do not count as records unless
  k_race_pace_legal is set to 1.

Permission:    Set by 'race_pacemaker' command in-game (not a server.cfg cvar in practice -- overwritten
               by race_pacemaker on load/disable). Direct server.cfg set is syntactically valid but
               the real-world path is always via the race_pacemaker command.
Default:       0.

Example:
  race_pacemaker           (no arg, race mode -- loads ghost and sets k_race_pace_enabled 1)
  race_pacemaker off       (sets k_race_pace_enabled 0 and clears ghost data)

See also: race_pacemaker (command that sets this), k_race_pace_legal (controls record eligibility when pacemaker active), k_race_pace_headstart (head-start offset applied when active), k_race_pace_jumps (jump marker display)
```

### Notes

- Both conditions confirmed for effective pacemaker: `race_pacemaker_enabled()` at race.c:4482 = `cvar(RACE_PACEMAKER_ENABLED_CVAR) && guide.capture.position_count`. So setting the cvar to 1 without loaded ghost data does not make the pacemaker appear.
- Shape 4 gate confirmed at race.c:1341: `blocked_record = race_pacemaker_enabled() && !cvar(RACE_PACEMAKER_LEGAL_RECORD)`.
- Default 0 confirmed at world.c:921.

---

<!-- VERDICT: drafted -->
## k_race_pace_headstart (KTX cvar, Race -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:917 (registration, default "0.5"); src/race.c:4306 (adjusted by 'race_pacemaker headstart' via race_toggle_incr_cvar(RACE_INCR_PARAMS(HEADSTART))); src/race.c:4768-4769 (read: race_time += bound(MIN, cvar(CVAR), MAX))
- **Catalog line**: 14106
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Head-start given to the pacemaker ghost in seconds. Added to the ghost's effective race time so it appears that many seconds ahead on its recorded path.
>
> Range: 0.00 to 1.00 (seconds, clamped).
>
> Default: 0.5.
> Set by: server config.

### Shape classification

Shape 3 cvar. No paired toggle command. Adjusted by the `race_pacemaker headstart` sub-action (bounded increment via `race_toggle_incr_cvar(RACE_INCR_PARAMS(HEADSTART))`). INCR=0.25, MIN=0.00, MAX=1.00 -- values step 0.00 -> 0.25 -> 0.50 -> 0.75 -> 1.00 -> wraps to 0.00. Read at race.c:4768-4769 to offset the ghost's effective time offset during playback.

### Proposed draft

```
Head-start given to the pacemaker ghost in seconds -- shifts the ghost's effective race time forward so it appears ahead on its recorded path.

Effect:
  Values: 0.00, 0.25, 0.50, 0.75, 1.00 (stepped in 0.25s increments via 'race_pacemaker headstart'; wraps after 1.00).
  0.00 = no head-start; ghost starts at its recorded position for time 0.
  0.25 / 0.50 / 0.75 / 1.00 = ghost appears N seconds ahead on its recorded path.
  Applied via bound() clamp at runtime, so server.cfg values outside 0.00-1.00 are clamped.

Permission:    server config, or adjusted in-game via 'race_pacemaker headstart' (any player in race mode)
Default:       0.5.

Example:
  # Server config:
  k_race_pace_headstart 0.5

  # In-game adjustment (each call steps 0.00 -> 0.25 -> 0.50 -> 0.75 -> 1.00 -> 0.00):
  race_pacemaker headstart

See also: race_pacemaker (command that adjusts this), k_race_pace_enabled (pacemaker must be active for this to have effect)
```

### Notes

- INCR=0.25, MIN=0.00, MAX=1.00 confirmed at race.c:33-35 (RACE_PACEMAKER_HEADSTART_INCR=0.25f, MIN=0.00f, MAX=1.00f).
- Default 0.5 confirmed at world.c:917.
- `race_toggle_incr_cvar` at race.c:4269-4279: increments, wraps to MIN if > MAX after increment.
- Existing description "Range: 0.00 to 1.00" correct. Step-value detail is new content added in v2 recast.

---

<!-- VERDICT: drafted -->
## k_race_pace_jumps (KTX cvar, Race -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:918 (registration, default "0"); src/race.c:4331-4336 (toggled by 'race_pacemaker jumps'); src/race.c:4902 (read: jumps_enabled = cvar(CVAR) && resolution)
- **Catalog line**: 14136
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles visible jump markers along the pacemaker ghost trail in race mode. When enabled and a trail is active, small markers appear at the ghost's recorded jump points.
>
> 0 = no jump markers shown.
> 1 = jump markers visible along the ghost trail.
>
> Default: 0.
> Set by: server config or pacemaker 'jumps' subcommand.

### Shape classification

Shape 3 cvar. No independent paired toggle command. Toggled by the `race_pacemaker jumps` sub-action via inline `cvar_fset(RACE_PACEMAKER_JUMPS_CVAR, enabled ? 1 : 0)` where `enabled = !cvar(RACE_PACEMAKER_JUMPS_CVAR)` (race.c:4331-4336). Read at race.c:4902 with a two-condition check: `jumps_enabled = cvar(RACE_PACEMAKER_JUMPS_CVAR) && resolution`.

### Proposed draft

```
Whether jump markers are shown along the pacemaker ghost trail.

Effect:
  0 = no jump markers; ghost trail shows position path only.
  1 = jump markers visible at the ghost's recorded jump points along the trail.
  Requires k_race_pace_resolution to be non-zero -- if resolution is 0 (no trail), jump markers are
  suppressed even when this cvar is 1.

Permission:    server config, or toggled in-game via 'race_pacemaker jumps' (any player in race mode)
Default:       0.

Example:
  # Enable jump markers (trail resolution must also be non-zero):
  k_race_pace_resolution 2
  k_race_pace_jumps 1

  # In-game toggle:
  race_pacemaker jumps

See also: race_pacemaker (command that toggles this), k_race_pace_resolution (trail resolution -- must be non-zero for jump markers), k_race_pace_enabled (pacemaker must be active)
```

### Notes

- Default 0 confirmed at world.c:918.
- Two-condition requirement confirmed at race.c:4902: `jumps_enabled = cvar(RACE_PACEMAKER_JUMPS_CVAR) && resolution`. Both this cvar AND non-zero resolution are required.
- **F3 pattern signal (NOT a top-level F3 trigger)**: `race_pacemaker jumps` flips this cvar via `enabled = !cvar(...); cvar_fset(..., enabled ? 1 : 0)` at race.c:4331-4336 -- a manual-flip pattern. This is inside the `race_pacemaker` arg-dispatch handler, NOT a dedicated top-level paired toggle command. F3 (Shape 1 manual-flip variant) applies to top-level cvar+toggle pairs; this is a sub-action within a multi-arg dispatcher. Documented here as a cross-batch synthesis signal; not classified as Shape 1 manual-flip.
- Existing description is accurate (both the value enum and the trail-dependency note). v2 recast makes the trail-dependency explicit in the Effect section.

---

<!-- VERDICT: drafted -->
## k_race_pace_legal (KTX cvar, Race -- Shape 3 + Shape 4 facet)

- **Status**: drafted
- **Source**: src/world.c:920 (registration, default "0"); src/race.c:1341 (gate: blocked_record = race_pacemaker_enabled() && !cvar(RACE_PACEMAKER_LEGAL_RECORD))
- **Catalog line**: 14167
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether a run completed with the pacemaker ghost active is allowed to set a record. Has no effect when the pacemaker is off.
>
> 0 = runs made with the pacemaker enabled do not count as records.
> 1 = runs made with the pacemaker enabled can set records.
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 + Shape 4 facet. No paired toggle command. Shape 4 facet: read as a gate condition at race.c:1341 -- `blocked_record = race_pacemaker_enabled() && !cvar(RACE_PACEMAKER_LEGAL_RECORD)`. This cvar controls whether the pacemaker-enabled state triggers the record block.

### Proposed draft

```
Controls whether a run completed with the pacemaker ghost active counts as a record.

Effect:
  0 = pacemaker-active runs are not saved as records (default -- keeps pacemaker as practice-only tool).
  1 = pacemaker-active runs may set records normally.
  Has no effect when the pacemaker is off or not loaded (k_race_pace_enabled = 0 or no ghost route loaded).

Permission:    server config only
Default:       0.

Example:
  # Allow pacemaker-assisted record setting:
  k_race_pace_legal 1

See also: k_race_pace_enabled (pacemaker enable state this gates against), race_pacemaker (command that loads/disables the pacemaker)
```

### Notes

- Gate logic confirmed at race.c:1341: `blocked_record = race_pacemaker_enabled() && !cvar(RACE_PACEMAKER_LEGAL_RECORD)`. The compound condition means: pacemaker active AND legal=0 -> blocked. If pacemaker is off, `race_pacemaker_enabled()` returns false regardless of this cvar value.
- Default 0 confirmed at world.c:920.
- Existing description accurate and clean; v2 recast is structural upgrade only.

---

<!-- VERDICT: drafted_with_flag -->
## k_race_pace_resolution (KTX cvar, Race -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:919 (registration, default "2"); src/race.c:4315 (adjusted by 'race_pacemaker trail'); src/race.c:4845-4847 (read: resolution = bound(MIN, cvar(CVAR), MAX))
- **Catalog line**: 14198
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the trail length of the race pacemaker ghost. Each step adds 12 recorded ghost positions in each direction around the ghost. A non-zero value is also required for jump markers (k_race_pace_jumps) to display.
>
> 0 = no trail (pacemaker shown without a trail).
> 1 = short trail (12 positions each side).
> 2 = medium trail (24 positions each side).
> 3 = long trail (36 positions each side).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 cvar. No independent paired toggle command. Adjusted by `race_pacemaker trail` sub-action via `race_toggle_incr_cvar(RACE_INCR_PARAMS(RESOLUTION))` (INCR=1, MIN=0, MAX=3, wraps after 3 back to 0). Read at race.c:4845-4847 to determine trail length rendered.

### Proposed draft

```
Trail length for the pacemaker ghost -- controls how many recorded positions are shown behind and ahead of the ghost's current position.

Effect:
  0 = no trail; pacemaker ghost displayed as a single point.
  1 = short trail (12 recorded positions each side of the ghost).
  2 = medium trail (24 recorded positions each side).
  3 = long trail (36 recorded positions each side).
  A non-zero value is required for k_race_pace_jumps to display jump markers.

Permission:    server config, or adjusted in-game via 'race_pacemaker trail' (any player in race mode; cycles 0 -> 1 -> 2 -> 3 -> 0)
Default:       2.

Example:
  # Server config -- medium trail (matches default):
  k_race_pace_resolution 2

  # In-game step (each call: 0 -> 1 -> 2 -> 3 -> wraps to 0):
  race_pacemaker trail

See also: race_pacemaker (command that adjusts this), k_race_pace_jumps (jump markers require non-zero resolution), k_race_pace_enabled (pacemaker must be active)
```

### Notes

- FLAG: Existing description states "Default: 0". Source at world.c:919 shows `RegisterCvarEx("k_race_pace_resolution", "2")`. Default is **2**, not 0. Apply-pass-author must correct this value in the applied L1 record.
- RACE_PACEMAKER_TRAIL_COUNT = 12 confirmed at race.c:40. Positions per side = resolution * 12.
- Step increment INCR=1, MAX=3 confirmed at race.c:36-38 (RACE_PACEMAKER_RESOLUTION_MIN=0, MAX=3, INCR=1).
- Value enum (positions per side) in the proposed draft is consistent with the existing description; only the default value changes.

---

<!-- VERDICT: drafted -->
## k_race_times_per_port (KTX cvar, Race -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:916 (registration, default "0"); src/race.c:201 (read in race_filename() to select filename template)
- **Catalog line**: 14356
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether race-time record files are stored separately per server UDP port. Relevant when multiple server instances share the same gamedir.
>
> 0 = shared record files (all instances on the same gamedir use the same race records).
> 1 = per-port record files (each port gets its own independent set of saved race times).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 cvar. No paired command. Single read site: `race_filename()` at race.c:197-215. When non-zero, the filename template appends `_<port>` to the base name; when zero, the shared template is used. This function is called whenever race record files are opened or written throughout race.c.

### Proposed draft

```
Controls whether race record files include the server UDP port in their filename -- relevant when multiple KTX server instances share the same gamedir.

Effect:
  0 = shared record files; all instances on the same gamedir read and write the same race record files.
  1 = per-port record files; filename includes the server port number, giving each instance independent records.

Permission:    server config only
Default:       0.

Example:
  # Two race servers sharing a gamedir, each keeping independent records:
  k_race_times_per_port 1

See also: (no direct pair -- affects all race file I/O paths)
```

### Notes

- `race_filename()` at race.c:197-215 is the sole read site. Port-suffixed template: `race[<map>_r<N>]-w<N>s<N>_<port>.<ext>`; shared template: `race[<map>_r<N>]-w<N>s<N>.<ext>`. The `<ext>` covers .pos, .top, and other race file types -- affects all race record file I/O.
- Default 0 confirmed at world.c:916.
- Existing description is accurate; v2 recast is structural upgrade only.
- See-also is empty -- no L1 entity pair or sibling command. Orphan entity in relational terms.

---

<!-- VERDICT: drafted -->
## race_pacemaker (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1026 (`CF_PLAYER | CF_PARAMS`); src/race.c:4284-4478 (handler race_pacemaker())
- **Catalog line**: 14726
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race mode only. Configures the pacemaker -- a ghost replay that racers can chase. Only available in race mode; refused while a race is active.
>
> No argument: loads a recorded run as the pacemaker, or disables it if one is already loaded.
> headstart: adjusts the pacemaker's head-start time.
> trail: adjusts (or disables) the trail resolution.
> jumps: toggles the pacemaker jump indicators.
> off: disables the pacemaker.
>
> Set by: any player.

### Shape classification

Shape-less. This command is the multi-action adjuster for the pacemaker cvar family but fits NO cataloged shape:
- NOT Shape 8: Shape 8 requires sub-actions to be registered as independent L1 entities with namespaced IDs. The `race_pacemaker` sub-args (headstart, trail, jumps, off) are NOT separately registered L1 entities -- they are literal strings matched inline via `streq()` in the handler body. There is no `frogbot_cmd_t commands[]` lookup table; the sub-args have no L1 cards.
- NOT Shape 1: the command targets four different cvars across sub-args; there is no single cvar it exclusively pairs with as a binary toggle.
Shape-less: it is the "command-side lever" for multiple cvars (k_race_pace_enabled, k_race_pace_headstart, k_race_pace_resolution, k_race_pace_jumps). Each target cvar has its own Shape 3 card and cross-links here via See-also.

### Proposed draft

```
Loads the pacemaker ghost in race mode or adjusts its display settings.

Effect:
  race_pacemaker             -- Loads the current record's position data as the pacemaker ghost and enables
                                it (k_race_pace_enabled 1). If a ghost is already loaded, disables it instead
                                (k_race_pace_enabled 0) and clears the ghost data.
  race_pacemaker headstart   -- Steps k_race_pace_headstart through 0.00, 0.25, 0.50, 0.75, 1.00 s (wraps).
  race_pacemaker trail       -- Steps k_race_pace_resolution through 0, 1, 2, 3 (wraps back to 0).
  race_pacemaker jumps       -- Toggles k_race_pace_jumps between 0 and 1.
  race_pacemaker off         -- Disables the pacemaker and clears the loaded ghost (k_race_pace_enabled 0).

Prerequisites:
  Race mode must be active ("Command only available in race mode (type /race to activate it)").
  Cannot adjust pacemaker settings while a race is in progress ("Cannot change pacemaker settings while race is active.").

Permission:    any player (spectators excluded)
Match-state:   pre-race only (refused while race is in progress)

Example:
  race_pacemaker             # load record #1 ghost and activate pacemaker
  race_pacemaker headstart   # step head-start 0.50 -> 0.75 s
  race_pacemaker trail       # step trail resolution 2 -> 3
  race_pacemaker jumps       # toggle jump markers on
  race_pacemaker off         # disable pacemaker and clear ghost

See also: k_race_pace_enabled (enable/disable state set by this), k_race_pace_headstart (head-start adjusted by 'headstart'), k_race_pace_resolution (trail adjusted by 'trail'), k_race_pace_jumps (jump markers toggled by 'jumps'), k_race_pace_legal (record eligibility while pacemaker active)
```

### Notes

- **F1 (CF flags)**: commands.c:1026 `CF_PLAYER | CF_PARAMS`. `CF_PLAYER` alone -> "any player (spectators excluded)". `CF_PARAMS` indicates the command accepts arguments; does not affect permission scope.
- **Shape 8 vs shape-less decision**: Shape 8 canonically requires sub-actions to be independently registered L1 entities with namespaced IDs (as in the frogbot `addmarker:frogbot:editor` pattern). The `race_pacemaker` sub-args are inline `streq()` matches in the handler body -- not a `frogbot_cmd_t commands[]` lookup table with independently-registered sub-entities. Shape-less is correct.
- **F3 pattern (NOT a top-level F3 trigger)**: The `race_pacemaker jumps` sub-action uses a manual-flip pattern (`enabled = !cvar(RACE_PACEMAKER_JUMPS_CVAR); cvar_fset(..., enabled ? 1 : 0)`) at race.c:4331-4336. This is the F3 manual-flip pattern but occurring INSIDE a multi-arg dispatcher handler, not via a dedicated top-level paired toggle command. F3 Shape 1 manual-flip applies to top-level cvar+command pairs; this is a sub-action in an arg-dispatch handler. Documented for cross-batch synthesis signal; NOT classified as Shape 1.
- **"No arg" logic**: race.c:4340 `(guide.capture.position_count != 0) && (trap_CmdArgc() == 1)` means "no arg AND ghost already loaded" -> disable. "No arg AND no ghost loaded" -> falls through to the load path. The existing description "loads a recorded run, or disables it if one is already loaded" is verified correct.
- See-also has 5 entries (at the cap). An L3 concept note for the pacemaker feature family would consolidate all 5 cvars + this command into a single navigable entry.

---

<!-- VERDICT: drafted -->
## race_hide_players (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1030 (`CF_PLAYER`); src/race.c:5650-5666 (handler race_hide_players_toggle())
- **Catalog line**: 14667
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles your personal preference for whether other racers are drawn while you race. Each call flips between hidden and shown for you only -- other players are not affected. If a race is currently running the change takes effect immediately.
>
> Only works in race mode; has no effect in other modes.
>
> Default: n/a (command).
> Set by: any player in-game (race mode only).

### Shape classification

Shape-less. Toggles per-player entity field `self->hideplayers_default` (race.c:5657) with no cvar pairing. The toggle target is an in-memory per-player ent field, not a `k_*` cvar registered in world.c. No election, no bitmask, no sub-dispatcher. Pure per-player preference toggle. The existing description correctly identifies this as player-scoped.

### Proposed draft

```
Toggles your personal preference for hiding other players while you race.

Effect:
  Each invocation flips between hidden and shown for you only; other players are not affected.
  If a race is currently running, the change takes effect immediately for your ongoing race.
  If no race is running, the preference is stored and applied at the start of your next race.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    any player (spectators excluded)

Example:
  race_hide_players   # hide other racers during your run
  race_hide_players   # show them again

See also: (no cvar pair -- preference is per-player in-memory state only)
```

### Notes

- **F1 (CF flags)**: commands.c:1030 `CF_PLAYER`. Alone -> "any player (spectators excluded)".
- Handler at race.c:5650-5666: toggles `self->hideplayers_default` (per-player ent field), then sets `self->hideplayers = self->hideplayers_default` if `race.status` (race in progress). No `k_*` cvar touched.
- Existing description is accurate. Recast is structural upgrade only.
- See-also is empty -- no cvar pair; toggle target is a per-player ent field with no L1 card.

---

<!-- VERDICT: drafted -->
## race_dl_record_demo (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1025 (`CF_BOTH | CF_PARAMS`); src/race.c:3112-3137 (handler race_download_record_demo())
- **Catalog line**: 14639
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Downloads the saved demo for a stored race record to the requesting client. Takes the record number as an argument (1-based). Prints "record not found" if that record does not exist, or "demo for record #N is not available" if the record has no associated demo file.
>
> Default: n/a (command).
> Set by: any player or spectator via 'race_dl_record_demo <record_number>' (race mode only).

### Shape classification

Shape-less. One-shot user-actionable download trigger. No cvar pairing, no election, no bitmask, no sub-dispatcher. Distinct from `mapslist_dl`/`cmdslist_dl` (which are internal multi-step download-handshake callbacks carrying `CF_MATCHLESS | CF_NOALIAS | CF_CONNECTION_FLOOD`); `race_dl_record_demo` uses only `CF_BOTH | CF_PARAMS` and performs a direct single `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "download ...")` with no re-entrant callback chain.

### Proposed draft

```
Downloads the demo file for a stored race record to your client.

Effect:
  Takes the record number (1-based) as an argument and triggers a client-side download of the associated demo file (MVD format).
  "record not found" -- no stored record at that number.
  "demo for record #N is not available" -- the record exists but has no associated demo file.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    any player or spectator
Match-state:   any time within race mode (not blocked while a race is running -- only race mode gated, not race-status gated)

Example:
  race_dl_record_demo 1   # download the demo file for record #1

See also: (no direct cvar pair -- part of race record system)
```

### Notes

- **F1 (CF flags)**: commands.c:1025 `CF_BOTH | CF_PARAMS`. `CF_BOTH` = `CF_PLAYER | CF_SPECTATOR` -> "any player or spectator". `CF_PARAMS` indicates the command takes parameters; does not affect permission scope.
- Handler at race.c:3112-3137: arg is read via `read_record_param(1)` BEFORE `race_command_checks()` is called (line order: 3114 arg parse, 3116 mode gate). Issues `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "download \"demos/%s.mvd\"\n", ...)` at race.c:3135.
- **Match-state behavioral detail**: `race_command_checks()` gates only on race mode (`isRACE()`), NOT on `race.status`. Unlike `race_pacemaker`, this command does NOT check `race.status` -- it can be invoked while a race is running. This is a user-visible behavioral nuance not surfaced in the existing description.
- **Mechanism vs mapslist_dl**: `race_dl_record_demo` is user-facing (takes record number arg, user receives a demo file). `mapslist_dl`/`cmdslist_dl` are internal multi-step callbacks (`CF_MATCHLESS | CF_NOALIAS | CF_CONNECTION_FLOOD`). Different mechanism; not shape-less for the same reason as those commands. The correct shape-less rationale here is "no inter-entity relationship (no cvar pair, no sibling family, no election/gate/vote)."
- Error messages verified verbatim from source: race.c:3123 "record not found\n" and race.c:3130 "demo for record #%d is not available\n".

---

# Route definition + node-edit commands + Shape 9a side-channel cvars (chunk D — 9 cards)

<!-- VERDICT: drafted -->
## k_race_route_mapname (KTX cvar, Race -- Shape 9a)

- **Status**: drafted
- **Source**: src/world.c:927
- **Catalog line**: 14231
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Stores the map name that the saved race route number (k_race_route_number) belongs to. On a server-side route reload, if this matches the current map the stored route number is reused; otherwise the next route is selected. Cleared to empty when a custom route is set; updated to the current map name whenever a route loads.
>
> Internal; managed automatically. Set by: server automatically on route load or custom route set.

### Shape classification

Shape 9a (side-channel cvar). Written by the race system via `cvar_set(RACE_ROUTE_MAPNAME_CVAR, mapname)` at race.c:3392 (on successful `race_route_switch`) and `cvar_set(RACE_ROUTE_MAPNAME_CVAR, "")` at race.c:2785 (when a route is marked custom via `race_route_now_custom`). No paired toggle or cycle command. User influences the value indirectly via `race_route_switch` -- the map name is always the current map at load time; the user cannot supply a different value. Also read at race.c:4982 to attach route metadata to race-attempt web log posts. Paired with `k_race_route_number` as the other side-channel cvar in the same 9a relationship group.

### Proposed draft

```
Stores the map name associated with the currently loaded preset race route.

Effect:
  When `race_route_switch` successfully loads a preset route, this cvar is set
  to the current map name and k_race_route_number records the route index.
  On a subsequent server-side `race_route_switch` call: if this value matches
  the current map, the stored route index (k_race_route_number) is reloaded
  directly instead of cycling to the next route.
  Set to empty ("") when a custom (non-preset) route is active -- signalling
  that k_race_route_number is not a valid preset index for the current map.
  Both values are sent with race-attempt records to the stats web endpoint.

Permission:   Set automatically by the race system; not user-configurable.
              Direct `set k_race_route_mapname` is syntactically valid but
              will be overwritten on the next route switch or custom-route edit.
Match-state:  Updated any time a preset route loads or a custom route edit begins.
Default:      "" (empty).

Example:
  # Race server with a preset route stored for dm2:
  race_route_switch      ; loads next route; sets k_race_route_mapname "dm2"
                         ;   and k_race_route_number to the loaded index.
  # After a custom checkpoint is placed, both are cleared:
  race_set_checkpoint    ; calls race_route_now_custom internally;
                         ;   k_race_route_mapname "" and k_race_route_number -1.

See also: k_race_route_number (paired route index, same 9a group),
          race_route_switch (the command whose success triggers the write),
          race_set_start / race_set_checkpoint / race_set_finish / race_del_checkpoint
          (route-edit commands that clear this cvar via custom-route marking)
```

### Notes

- Shape 9a confirmed: cvar is written by the race system in a non-command-handler context (race_route_now_custom + r_route success path). The user cannot supply the mapname value directly -- it is always the current mapname at write time.
- See-also exceeds 4 peers slightly; the route-edit family is collapsed to avoid bloat. If a route-editing concept note exists later, simplify.
- The existing description is largely accurate; the recast surfaces the two distinct write events and the web-log read path which the v1 description omitted.

---

<!-- VERDICT: drafted -->
## k_race_route_number (KTX cvar, Race -- Shape 9a)

- **Status**: drafted
- **Source**: src/world.c:926
- **Catalog line**: 14258
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Stores the race route index (0-based) currently selected for the map. Updated automatically when a route loads.
>
> Range: 0-based integer. Out-of-range values fall back to route 0.
> -1 = a custom (non-stored) route is active.
>
> On route load: if k_race_route_mapname matches the current map, this index is reloaded; otherwise the next available route is selected.
>
> Default: 0.
> Set by: managed automatically by the race system; not intended for manual config.

### Shape classification

Shape 9a (side-channel cvar). Written by `cvar_fset(RACE_ROUTE_NUMBER_CVAR, next_route)` at race.c:3391 on successful `race_route_switch`, and by `cvar_fset(RACE_ROUTE_NUMBER_CVAR, -1)` at race.c:2784 when marking a custom route via `race_route_now_custom`. Read at race.c:3350 (to restore server-configured route index on player-triggered switch) and race.c:4983 (race-attempt web log). Paired with `k_race_route_mapname` in the same 9a cross-link group.

### Proposed draft

```
Stores the 0-based index of the currently loaded preset race route for the map.

Effect:
  When `race_route_switch` successfully loads a preset route, this cvar is set
  to the loaded route index. On a subsequent server-side `race_route_switch`:
  if k_race_route_mapname still matches the current map, the stored index is
  reloaded directly (preserving the configured route across switch cycles)
  instead of advancing to the next.
  Set to -1 when a custom (non-preset) route is active -- a custom route has no
  stored index. Both this value and k_race_route_mapname are sent with
  race-attempt records to the stats web endpoint.

Permission:   Set automatically by the race system; not user-configurable.
              Direct `set k_race_route_number` is syntactically valid but will
              be overwritten on the next route switch or custom-route edit.
Match-state:  Updated any time a preset route loads or a custom route edit begins.
Default:      0.

Example:
  race_route_switch     ; loads route 0 (first); k_race_route_number 0,
                        ;   k_race_route_mapname "dm2".
  race_route_switch     ; loads route 1 (next); k_race_route_number 1.
  race_set_start        ; places custom start; k_race_route_number -1,
                        ;   k_race_route_mapname "".

See also: k_race_route_mapname (paired map name, same 9a group),
          race_route_switch (the command whose success triggers the write),
          race_set_start / race_set_checkpoint / race_set_finish / race_del_checkpoint
          (route-edit commands that set this to -1 via custom-route marking)
```

### Notes

- Shape 9a confirmed. Same cross-link discipline as k_race_route_mapname -- both cvars are written together by the same write events.
- Existing description mention "Out-of-range values fall back to route 0" -- source at race.c:3357-3360 confirms this: `if ((next_route < 0) || (next_route >= race.cnt)) { next_route = 0; }`. Retained in spirit in the effect.
- RegisterCvarEx sets default "0"; existing description has Default: 0. Confirmed correct.

---

<!-- VERDICT: drafted -->
## race_route_switch (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1020
- **Catalog line**: 14813
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race-mode command. Cycles to the next predefined route for the current map, wrapping back to the first after the last. Resets the map and hides spawn points before switching. Prints an error if no routes exist for the map or a route fails to load. A server-configured route number overrides the cycle when the configured map matches. Refused while a race is in progress.
>
> Default: n/a (command).
> Set by: admin command 'race_route_switch'.

### Shape classification

Shape-less (command-side lever for the Shape 9a cvars k_race_route_mapname and k_race_route_number). The shape tag lives on the two cvar cards; this command is the lever that triggers their write. CF flags: `CF_PLAYER | CF_SPC_ADMIN` -> "any player or admin spectator". No cvar-toggle or vote relationship of its own.

### Proposed draft

```
Cycles to the next predefined route for the current map, wrapping to the first after the last.

Effect:
  Hides spawn points and cleans the map before loading the next route.
  On success: loads the route, updates k_race_route_number (the loaded
  route index) and k_race_route_mapname (the current map name), clears
  the pacemaker, and broadcasts the new route info.
  If k_race_route_mapname already matches the current map when called from
  a server context (not player), the stored k_race_route_number is reloaded
  directly instead of advancing to the next route.
  On failure: prints "Failed to load route N" and marks the route as custom.
  If no routes are defined: prints "No routes defined for this map" and exits.

Prerequisites: "Command only available in race mode (type /race to activate it)"
               Cannot be used while a race is in progress.

Permission:    any player or admin spectator
Match-state:   pre-race only (refused while a race run is in progress)

Example:
  race_route_switch    ; load route 1 (or the server-configured route if map matches)
  race_route_switch    ; advance to route 2
  race_route_switch    ; wrap to route 1 if only 2 routes exist

See also: k_race_route_number (route index written on success),
          k_race_route_mapname (map name written on success),
          race_route_clear (clears the active route entirely)
```

### Notes

- CF_PLAYER | CF_SPC_ADMIN confirmed at commands.c:1020. Permission = "any player or admin spectator".
- Handler r_route at race.c:3325. The "server context" branch (line 3348) reads `self->ct != ctPlayer` -- this is a server-side reload path, not a normal player invocation.
- Existing description says "A server-configured route number overrides the cycle when the configured map matches" -- this is accurate but uses slightly opaque phrasing; the recast makes the mechanism explicit via k_race_route_mapname comparison.

---

<!-- VERDICT: drafted -->
## race_route_clear (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1021
- **Catalog line**: 14786
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Clears the current race route: removes all route entities (start, checkpoints, finish), restores every player's full weapon set, unmutes all players, clears the pacemaker, and broadcasts the clear. Only available in race mode; refused while a race run is in progress.
>
> Set by: any player (or admin spectator) via 'race_route_clear'.

### Shape classification

Shape-less. Standalone route-clearing command; no cvar-toggle, no vote, no cycle relationship. CF flags: `CF_PLAYER | CF_SPC_ADMIN` -> "any player or admin spectator". Note: this command does NOT update k_race_route_mapname or k_race_route_number directly -- those are cleared by `race_route_now_custom`, which is triggered by route-editing commands (race_set_start, race_set_checkpoint, race_set_finish, race_del_checkpoint), not by this clear command.

### Proposed draft

```
Clears the active race route: removes all start, checkpoint, and finish markers,
restores full weapon sets for all players, unmutes all players, and clears the pacemaker.

Prerequisites: "Command only available in race mode (type /race to activate it)"
               Cannot be used while a race is in progress.

Permission:    any player or admin spectator
Match-state:   pre-race only (refused while a race run is in progress)

Example:
  race_route_clear    ; remove all route nodes, restore weapons and voice

See also: race_route_switch (loads a predefined route),
          race_set_start / race_set_checkpoint / race_set_finish (place route nodes),
          race_del_checkpoint (remove the last checkpoint only)
```

### Notes

- CF_PLAYER | CF_SPC_ADMIN confirmed at commands.c:1021.
- Handler r_clear_route at race.c:3210. Source confirms: removes entities via race_remove_ent(), restores weapons via setwepall(), clears mute, calls race_clear_pacemaker().
- The dispatcher pre-flight note said this handler "clears route number to -1, clears mapname to ''" -- this is NOT what r_clear_route does. Those cvar writes happen in race_route_now_custom, which is called by r_Xset and r_cdel (the node-placement/deletion commands), not by r_clear_route. This is a dispatcher-hypothesis correction (Rule 11: SOURCE OVER HANDOFF).

---

<!-- VERDICT: drafted -->
## race_set_start (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1013
- **Catalog line**: 14957
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race route editing command (player or spectator-admin). Places the race start gate at the caller's current position and facing direction, so racers spawn aimed down the route.
>
> No-op if the race is already running or the route has reached the maximum node count.
> On success: broadcasts the start-node coordinates and direction, and marks the route as custom (not a preset).
>
> Set by: player or spectator-admin command in race mode.

### Shape classification

Shape-less. Route-editing command; dispatched via shared handler `r_Xset` with arg `1` (nodeStart type). No cvar-toggle or vote relationship. Sibling to race_set_finish (arg 3) and race_set_checkpoint (arg 2), all sharing the same handler. CF flags: `CF_PLAYER | CF_SPC_ADMIN` -> "any player or admin spectator".

### Proposed draft

```
Places the race start gate at your current position and facing direction.

Effect:
  Spawns a start-node entity at your current coordinates and angle, so
  racers spawn aimed down the route at run start. Broadcasts the start
  coordinates and facing direction to all players.
  Marks the route as custom: k_race_route_number is set to -1 and
  k_race_route_mapname is cleared, replacing any previously loaded preset.
  Refused silently if the route is already at the node limit ("Can't add
  more checkpoints!").

Prerequisites: "Command only available in race mode (type /race to activate it)"
               Cannot be used while a race is in progress.

Permission:    any player or admin spectator
Match-state:   pre-race only (refused while a race run is in progress)

Example:
  # Stand at the intended start, facing the route direction:
  race_set_start           ; places start gate at current position + angle

See also: race_set_finish (place the finish gate),
          race_set_checkpoint (add a checkpoint node),
          race_del_checkpoint (remove the last checkpoint),
          race_route_switch (load a preset route instead of building custom)
```

### Notes

- CF_PLAYER | CF_SPC_ADMIN confirmed at commands.c:1013.
- Handler r_Xset called with arg 1 (nodeStart). Source at race.c:2788-2840 confirms: checks race_command_checks, checks race_is_started, checks MAX_ROUTE_NODES, then spawns node and calls race_route_now_custom (which sets k_race_route_number -1 and k_race_route_mapname "").
- MAX_ROUTE_NODES cap uses the same "Can't add more checkpoints!" message for all node types.

---

<!-- VERDICT: drafted -->
## race_set_finish (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1014
- **Catalog line**: 14928
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Places the race finish checkpoint at the caller's current position on the custom race route. Broadcasts the finish coordinates and marks the route as custom (overriding any preset route). No effect if the race is already running or if the route is already at the maximum of 20 nodes (start, checkpoints, and finish combined).
>
> Requires race mode to be active (k_race). Available to any in-game player and admin spectators (rcon-set or elected admin).
>
> Set by: 'race_set_finish' command (players and admin spectators, race mode only).

### Shape classification

Shape-less. Route-editing command; dispatched via shared handler `r_Xset` with arg `3` (nodeEnd type). Sibling to race_set_start and race_set_checkpoint. CF flags: `CF_PLAYER | CF_SPC_ADMIN` -> "any player or admin spectator".

### Proposed draft

```
Places the race finish gate at your current position on the custom race route.

Effect:
  Spawns a finish-node entity at your current coordinates. Broadcasts the
  finish coordinates to all players.
  Marks the route as custom: k_race_route_number is set to -1 and
  k_race_route_mapname is cleared, replacing any previously loaded preset.
  Refused silently if the route is already at the 20-node limit ("Can't add
  more checkpoints!").

Prerequisites: "Command only available in race mode (type /race to activate it)"
               Cannot be used while a race is in progress.

Permission:    any player or admin spectator
Match-state:   pre-race only (refused while a race run is in progress)

Example:
  # Stand at the intended finish line:
  race_set_finish          ; places finish gate at current position

See also: race_set_start (place the start gate),
          race_set_checkpoint (add a checkpoint node),
          race_del_checkpoint (remove the last checkpoint),
          race_route_switch (load a preset route instead of building custom)
```

### Notes

- CF_PLAYER | CF_SPC_ADMIN confirmed at commands.c:1014.
- MAX_ROUTE_NODES = 20 confirmed at progs.h:28. Existing description's "maximum of 20 nodes" claim is correct; retained in recast.
- Existing description says "Requires race mode to be active (k_race)" -- the prerequisite is the race mode being active, not k_race directly. The canonical refusal message from race_command_checks is "Command only available in race mode (type /race to activate it)". Recast uses verbatim refusal.

---

<!-- VERDICT: drafted -->
## race_set_checkpoint (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1015
- **Catalog line**: 14871
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race route editing command. Adds a checkpoint node at the caller's current position to the custom race route. Has no effect while a race is running or when the route is already at its node limit ("Can't add more checkpoints!"). On success broadcasts the new checkpoint's id and coordinates and marks the route as custom.
>
> Set by: any player or spectator-admin.

### Shape classification

Shape-less. Route-editing command; dispatched via shared handler `r_Xset` with arg `2` (nodeCheckPoint type). Sibling to race_set_start and race_set_finish. CF flags: `CF_PLAYER | CF_SPC_ADMIN` -> "any player or admin spectator".

### Proposed draft

```
Adds a checkpoint node at your current position to the custom race route.

Effect:
  Spawns a checkpoint entity at your current coordinates and assigns it the
  next available checkpoint ID. Broadcasts the checkpoint ID and coordinates
  to all players.
  Marks the route as custom: k_race_route_number is set to -1 and
  k_race_route_mapname is cleared, replacing any previously loaded preset.
  Refused with "Can't add more checkpoints!" if the route has reached the
  node limit.

Prerequisites: "Command only available in race mode (type /race to activate it)"
               Cannot be used while a race is in progress.

Permission:    any player or admin spectator
Match-state:   pre-race only (refused while a race run is in progress)

Example:
  # Stand at each checkpoint position in order:
  race_set_checkpoint      ; adds checkpoint 1
  race_set_checkpoint      ; adds checkpoint 2
  race_del_checkpoint      ; removes the last-added checkpoint if misplaced

See also: race_set_start (place the start gate),
          race_set_finish (place the finish gate),
          race_del_checkpoint (remove the last checkpoint),
          race_route_switch (load a preset route instead of building custom)
```

### Notes

- CF_PLAYER | CF_SPC_ADMIN confirmed at commands.c:1015.
- Handler r_Xset called with arg 2 (nodeCheckPoint). Source at race.c:2819-2827 shows checkpoint-specific broadcast: "Coordinates: X Y Z" and the checkpoint ID via `e->race_id`. The nodeStart branch also broadcasts direction (v_angle); checkpoint does not broadcast facing direction.
- "Can't add more checkpoints!" message confirmed verbatim at race.c:2805.

---

<!-- VERDICT: drafted_with_flag -->
## race_del_checkpoint (KTX command, Race -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1016
- **Catalog line**: 14611
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Removes the highest-numbered checkpoint from the current map's race route. Only works in race mode and only while no race run is in progress; prints an error if the route has no checkpoints.
>
> Default: n/a (command).
> Set by: any player in-game (race mode only, not during an active run).

### Shape classification

Shape-less. Route-editing command with no cvar-toggle or vote relationship. CF flags: `CF_PLAYER | CF_SPC_ADMIN` -> "any player or admin spectator". (Existing description says "any player" but registration confirms CF_SPC_ADMIN is included -- this is a localized permission mismatch resolved by the F1 amendment.)

### Proposed draft

```
Removes the highest-numbered checkpoint from the active race route.

Effect:
  Finds the checkpoint with the highest race_id, removes it, and re-anchors
  the remaining checkpoint sequence. Broadcasts the removed checkpoint ID.
  Marks the route as custom: k_race_route_number is set to -1 and
  k_race_route_mapname is cleared.
  Refused with a "Can't find any checkpoint" error if no checkpoints exist.

Prerequisites: "Command only available in race mode (type /race to activate it)"
               Cannot be used while a race is in progress.

Permission:    any player or admin spectator
Match-state:   pre-race only (refused while a race run is in progress)

Example:
  race_del_checkpoint      ; remove the last-placed checkpoint (undo last add)

See also: race_set_checkpoint (add a checkpoint),
          race_set_start (place the start gate),
          race_set_finish (place the finish gate),
          race_route_switch (load a preset route instead of building custom)
```

### Notes

- FLAG: Existing description says "Set by: any player in-game" -- this misses CF_SPC_ADMIN. CF flags at commands.c:1016 confirm `CF_PLAYER | CF_SPC_ADMIN`, meaning admin spectators can also call this. Permission updated to "any player or admin spectator" per F1 amendment.
- Handler r_cdel at race.c:2842. Confirmed: finds highest race_id checkpoint, removes it via ent_remove, calls race_fix_end_checkpoint, broadcasts removed ID, then calls race_route_now_custom to mark custom (race.c:2889).
- "Can't find any checkpoint" error confirmed at race.c:2862: `G_sprint(self, 2, "Can't find any %s\n", redtext(name_for_nodeType(nodeCheckPoint)))`.

---

<!-- VERDICT: drafted -->
## race_set_falsestart (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1018
- **Catalog line**: 14898
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race route setup command. Cycles the race start mode between two states. Has no effect while a race is running. On change, broadcasts the new mode and reloads the top scores (scores are tracked per start mode).
>
> no falsestart = racers are frozen at the start until the go signal.
> falsestart enabled = racers may move any time before the go signal.
>
> Set by: any player or spectator-admin.

### Shape classification

Shape-less. This command toggles `race.falsestart` (a C-struct field on the `race` global), NOT a paired k_* cvar. The state is `race.falsestart` of type `raceFalseStartMode_t` (enum values: `raceFalseStartNo` = 1, `raceFalseStartYes` = 2). The handler at race.c:3185-3189 does `race.falsestart++` then wraps: if out of range [raceFalseStartNo, raceFalseStartMAX), reset to raceFalseStartNo. Functionally binary (2 values) but no k_* cvar is involved. This is NOT the F3 Shape 1 manual-flip trigger -- F3 requires `cvar_fset("<k_name>", !cvar("<k_name>"))` style on a paired KTX cvar; here there is no paired cvar at all. CF flags: `CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS` -> "any player or admin spectator".

### Proposed draft

```
Toggles the race start mode between "no falsestart" and "falsestart enabled".

Effect:
  no falsestart    = racers are frozen at the start gate until the "go" signal.
  falsestart       = racers may move freely before the "go" signal is given.
  On change: broadcasts the new start mode and reloads the top-score table
  (top scores are tracked separately per start mode) and clears the pacemaker.

Prerequisites: "Command only available in race mode (type /race to activate it)"
               Cannot be used while a race is in progress.

Permission:    any player or admin spectator
Match-state:   pre-race only (refused while a race is in progress)

Example:
  race_set_falsestart      ; switch from no-falsestart to falsestart-enabled
  race_set_falsestart      ; switch back to no-falsestart

See also: race_set_start (set the start gate position),
          race_route_switch (load a preset route)
```

### Notes

- CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS confirmed at commands.c:1018. CF_PARAMS does not affect permission scope. Permission = "any player or admin spectator".
- F3 NOT triggered. Handler r_falsestart (race.c:3173) modifies `race.falsestart` (C struct field), NOT a k_* cvar. There is no `cvar_fset("<cvar>", !cvar("<cvar>"))` pattern. The falsestart state has no corresponding KTX cvar entity. Shape-less confirmed.
- The existing description is accurate. Mode names confirmed verbatim from `race_falsestart_mode()` at race.c:749-764: "no falsestart" and "falsestart enabled".
- Existing description says "Reads trap_CmdArgv args" (from dispatcher notes) -- source shows the handler does NOT call trap_CmdArgv. CF_PARAMS flag is present but args are ignored at runtime. The description correctly does not mention arg reading.
- The `race_clear_pacemaker()` call at race.c:3196 was observed in source; added to Effect as it's user-observable behavior (resets the pacemaker reference times).

---

# Timing/weapon + state-printers + chasecam family (chunk E — 9 cards)

<!-- VERDICT: drafted -->
## race_set_timeout (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1017, handler src/race.c:3084
- **Catalog line**: 14987
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race mode command: sets the race time limit in seconds. A value of 0 or empty resets to the default (60 seconds); other values are clamped to 1-3600 seconds. Has no effect while a race is running; announces the new time limit on change.
>
> Range: 1-3600 seconds. Value 0 resets to default of 60 seconds.
>
> Default: 60 seconds.
> Set by: any player or spectator via 'race_set_timeout <seconds>' (race mode only, not while a race is running).

### Shape classification

shape-less. This command writes to `race.timeout_setting` (a per-route in-memory field), not to any registered cvar. There is no paired cvar entity, no vote mechanism, no bitmask bit, and no Shape X relationship to tag. It is a direct per-route state setter.

### Proposed draft

```
Sets the time limit for the current race route.

Effect:
  - Sets the per-route time limit. A value of 0 (or omitting the argument) resets to the default of 60 seconds.
  - Clamped to 1-3600 seconds.
  - Broadcasts the new time limit to all players.
  - Refused while a race is in progress.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    any player or admin spectator
Match-state:   pre-match only (refused while a race is in progress)

Example:
  race_set_timeout 120   ; set a 2-minute limit
  race_set_timeout 0     ; reset to default 60 seconds
  race_set_timeout       ; same as 0 -- resets to default

See also: race_show_route (displays current route timeout), race (activates race mode)
```

### Notes

- No FLAG. Existing description is factually consistent with source. Recast adds Match-state line and improves structure.
- Existing "Set by: any player or spectator" was incorrect -- CF flags are `CF_PLAYER | CF_SPC_ADMIN`, which maps to "any player or admin spectator" (not all spectators). Corrected in Permission line above.
- Source: `race.timeout_setting` is not a cvar; it is an in-memory struct field. "Default: 60 seconds" from the existing description refers to `RACE_DEFAULT_TIMEOUT` macro (race.c:151).

---

<!-- VERDICT: drafted_with_flag -->
## race_set_weapon_mode (KTX command, Race -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1019, handler src/race.c:3236
- **Catalog line**: 15017
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race-mode command. Cycles the weapon availability mode one step forward, wrapping from last to first. Has no effect while a race is running. On change, broadcasts the new mode, reloads top scores for that weapon mode, and marks the route as custom.
>
> Modes in order: disallowed (no weapons), allowed (weapons available immediately), allowed after 2s (weapons unlock two seconds into the run).
>
> Default: n/a (command).
> Set by: admin command 'race_set_weapon_mode'.

### Shape classification

shape-less. Cycles `race.weapon` (an in-memory struct field over the enum `raceWeaponNo` / `raceWeaponAllowed` / `raceWeapon2s`), not a registered cvar. No paired cvar entity -- this is not Shape 2 (which requires a named cvar as the state container). Pure per-route mode cycler.

### Proposed draft

```
Cycles the weapon availability mode for the current race route.

Effect:
  - Steps the weapon mode forward one position, wrapping from the last back to the first.
  - Modes cycle in order: disallowed -> allowed -> allowed after 2s -> disallowed -> ...
    - disallowed: no weapons available during the run.
    - allowed: weapons available from race start.
    - allowed after 2s: weapons unlock two seconds into the run.
  - Broadcasts the new mode to all players.
  - Reloads the top-scores leaderboard for the new weapon mode.
  - Marks the current route as custom (overriding any saved route's default weapon setting).
  - Refused while a race is in progress.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    any player or admin spectator
Match-state:   pre-match only (refused while a race is in progress)

Example:
  race_set_weapon_mode   ; cycle from "allowed" to "allowed after 2s"
  race_set_weapon_mode   ; cycle from "allowed after 2s" to "disallowed"
  race_set_weapon_mode   ; cycle from "disallowed" back to "allowed"

See also: race_show_route (displays current weapon mode), race (activates race mode)
```

### Notes

- FLAG: Existing "Set by: admin command" implies admin-only permission. Source CF flags are `CF_PLAYER | CF_SPC_ADMIN` -- "any player or admin spectator", not admin-only. Permission line corrected above. This is a localized permission mismatch (not foundational framing error).
- "Marks the route as custom" sourced from `race_route_now_custom()` call at race.c:3260; behavioral consequence is that subsequently switching routes via `race_route_switch` will not restore the weapon mode from the saved route definition.

---

<!-- VERDICT: drafted -->
## race_show_lineup (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1009, handler src/race.c:1887
- **Catalog line**: 15047
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race-mode query command available to players and spectators. Prints a numbered list of all race-ready players to the caller; players currently mid-race are flagged with a distinct marker. Prints "(Empty)" when no player is race-ready.
>
> Set by: any player or spectator in race mode.

### Shape classification

shape-less. Pure standalone state-printer. Prints per-round player lineup state to the caller (G_sprint, private). No state writes, no cvar pair, no sibling family relationship. Same class as `about`, `status1`.

### Proposed draft

```
Prints the current race lineup to you: all race-ready players, numbered in order, with mid-race players flagged with a distinct marker. Prints "(Empty)" if no player is race-ready.

Permission:    any player or spectator
Match-state:   any time (race mode required)

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Example:
  race_show_lineup

See also: race_show_toptimes (leaderboard), race_show_route (current route info), race (activates race mode)
```

### Notes

- No FLAG. Source matches existing description well. Recast adds Prerequisites from `race_command_checks()` gate and restructures to v2 shape.
- CF_BOTH confirmed at commands.c:1009 -- "any player or spectator" is correct.

---

<!-- VERDICT: drafted -->
## race_show_record_details (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1011, handler src/race.c:3139
- **Catalog line**: 15074
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints full details of a stored race record to the caller. Takes one argument: the record slot number to inspect. Output includes finishing time (seconds), racer name, demo name, distance, max speed, average speed, date, weapon mode, and falsestart mode. Prints "record not found" if the slot is empty. Available to both players and spectators.
>
> Set by: any player or spectator (in-game command).

### Shape classification

shape-less. Pure standalone state-printer with argument. Reads from `race.records[]` and prints to the caller (G_sprint, private). No state writes, no cvar pair, no sibling family relationship.

### Proposed draft

```
Prints the full details of a stored race record to you.

Effect:
  - Takes one argument: the record slot number (1-based).
  - Output: finishing time, racer name, demo name, distance, max speed, average speed, date, weapon mode, and falsestart mode.
  - Prints "record not found" if the slot is empty.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    any player or spectator

Example:
  race_show_record_details 1   ; inspect the top record
  race_show_record_details 3   ; inspect the third-place record

See also: race_show_toptimes (leaderboard showing which slots are filled), race_dl_record_demo (download the demo for a record slot)
```

### Notes

- No FLAG. Source confirms all output fields at race.c:3160-3170. "record not found" message is verbatim from race.c:3150.
- CF_BOTH | CF_PARAMS confirmed at commands.c:1011.

---

<!-- VERDICT: drafted -->
## race_show_route (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1012, handler src/race.c:3396
- **Catalog line**: 15101
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race-mode query command available to players and spectators. Prints the current route summary to the caller: route name, active route number, time limit (seconds), route description (for non-custom routes only), and weapon mode.
>
> Set by: any player or spectator in race mode.

### Shape classification

shape-less. Pure standalone state-printer. Calls `race_print_route_info(self)` (private G_sprint output). No state writes, no cvar pair, no sibling family relationship.

### Proposed draft

```
Prints the current race route summary to you: route name, route number, time limit (in seconds), route description (for saved routes only -- not shown for custom routes), and weapon mode.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    any player or spectator
Match-state:   any time (race mode required)

Example:
  race_show_route

See also: race_show_toptimes (leaderboard for the current route), race_set_timeout (set the time limit), race_set_weapon_mode (set the weapon mode), race (activates race mode)
```

### Notes

- No FLAG. Source at race.c:3295-3322 confirms output fields. The "non-custom routes only" for description is from the `if (race.active_route)` guard at race.c:3303 (active_route is 0 for custom routes, nonzero for saved routes).
- CF_BOTH confirmed at commands.c:1012.

---

<!-- VERDICT: drafted -->
## race_show_toptimes (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1010, handler src/race.c:1849
- **Catalog line**: 15128
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race mode command available to players and spectators. Prints a private leaderboard of the best recorded times for the current map: ranked slots showing position, finishing time (in seconds), and racer name. Empty slots display dashes. Your own records are flagged with a distinct marker.
>
> Set by: any player or spectator (in-game command, race mode only).

### Shape classification

shape-less. Pure standalone state-printer. Reads `race.records[]` and prints to caller (G_sprint, private). No state writes, no cvar pair, no sibling family relationship.

### Proposed draft

```
Prints the top-times leaderboard for the current race route to you: ranked positions with finishing time and racer name. Empty slots show dashes. Your own records are flagged with a distinct marker.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    any player or spectator
Match-state:   any time (race mode required)

Example:
  race_show_toptimes

See also: race_show_record_details (full details for a specific record slot), race_show_route (current route info), race (activates race mode)
```

### Notes

- No FLAG. Source at race.c:1858-1884 confirms ranked output with bullet marker for own records (`\215` byte used as marker, matching existing description).
- CF_BOTH confirmed at commands.c:1010.

---

<!-- VERDICT: drafted_with_flag -->
## race_chasecam (KTX command, Race -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1022, handler src/race.c:2980 (r_changefollowstatus, arg=3)
- **Catalog line**: 14470
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the spectator's race chasecam follow on or off. Has no effect if the caller is an active racer or if race-mode preconditions are not met. Spectator-only.
>
> Set by: any spectator 'race_chasecam'.

### Shape classification

shape-less. Toggles per-player field `self->race_chasecam` (0/1). Not a registered cvar; no paired cvar, no vote, no bitmask relationship. Pure per-player toggle command.

### Proposed draft

```
Toggles race chasecam follow on or off for you.

Effect:
  - Enables: sets your chasecam active. If you are not actively racing, your weapons are hidden (chasecam follow mode).
  - Disables: clears your chasecam, restores your weapons, and stops your movement.
  - Silently ignored if you are an active racer.
  - Prints "Your chasecam is now enabled/disabled" on change.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    any player (spectators excluded)
Match-state:   any time (race mode required)

Example:
  race_chasecam   ; toggle chasecam follow on; use again to turn off

See also: race_chasecam_view (cycle view mode while in chasecam), race_chasecam_freelook (toggle freelook while in chasecam), race (activates race mode)
```

### Notes

- FLAG: Existing description says "Spectator-only" but the CF registration flag is `CF_PLAYER` (commands.c:1022) -- the command is valid for player-slot clients, not spectators. The existing description's "Spectator-only" and "Set by: any spectator" are both incorrect. The handler silently returns if `self->racer` (actively racing), so non-racing players (including those in the ready lineup) can use it. Permission corrected to "any player (spectators excluded)" per CF_PLAYER mapping.
- "Weapons hidden / weapons restored" behavior sourced from `setwepnone(e)` / `setwepall(e)` calls at race.c:2907 and 2919.

---

<!-- VERDICT: drafted_with_flag -->
## race_chasecam_view (KTX command, Race -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1023, handler src/race.c:2283
- **Catalog line**: 14524
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Race mode only. Cycles the spectator's chasecam through its four view modes, one step per call, wrapping at the end. The new mode is printed each time. Has no effect for racers.
>
> 0 = 1st person. 1 = 3rd person. 2 = hawk eye. 3 = backpack ride.
>
> Default: n/a (command).
> Set by: any spectator ('race_chasecam_view').

### Shape classification

shape-less. Cycles per-player field `self->race_chasecam_view` (0-3 wrapping at NUM_CHASECAMS=4). Not a cvar, not a paired cvar+command (Shape 2 requires a named cvar as state container). Pure per-player cycle command.

### Proposed draft

```
Cycles your chasecam view mode forward one step, wrapping after the last.

Effect:
  - Steps through four modes in order, printing the new mode each time:
    0 = 1st person
    1 = 3rd person
    2 = hawk eye
    3 = backpack ride
  - Wraps from mode 3 back to mode 0 on the next call.
  - Silently ignored if you are an active racer.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    any player (spectators excluded)
Match-state:   any time (race mode required)

Example:
  race_chasecam_view   ; step to next view; bind to a key for quick cycling

See also: race_chasecam (enable/disable chasecam follow), race_chasecam_freelook (toggle freelook), race (activates race mode)
```

### Notes

- FLAG: Existing description says "any spectator" / "Set by: any spectator". Source CF registration is `CF_PLAYER` (commands.c:1023), which maps to "any player (spectators excluded)". The "spectator" framing in the existing description is incorrect. Permission corrected above.
- View mode labels sourced from verbatim strings in race_chasecam_change() at race.c:2304/2308/2312/2316.
- The `self->racer` silent-return at race.c:2290 means actively racing players cannot cycle the view -- consistent with existing description's "Has no effect for racers" note, but that is not a reason to call it "spectator-only".

---

<!-- VERDICT: drafted -->
## race_chasecam_freelook (KTX command, Race -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1024, handler src/race.c:2259
- **Catalog line**: 14497
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles race chasecam freelook on or off and prints the new state ("Chasecam freelook enabled/disabled"). With freelook enabled, the viewer can look around freely while following a racer in chasecam. Only available in race mode.
>
> Set by: any player via 'race_chasecam_freelook'.

### Shape classification

shape-less. Toggles per-player field `self->race_chasecam_freelook` (0/1). Not a registered cvar; no paired cvar, no vote, no bitmask relationship. Pure per-player toggle command.

### Proposed draft

```
Toggles chasecam freelook on or off.

Effect:
  - When enabled: you can look around freely while following a racer in chasecam.
  - When disabled: view is locked to the followed racer's perspective.
  - Prints "Chasecam freelook enabled" or "Chasecam freelook disabled" on each toggle.
  - Available to all players in race mode, including active racers.

Prerequisites: Race mode must be active ("Command only available in race mode (type /race to activate it)").

Permission:    any player (spectators excluded)
Match-state:   any time (race mode required)

Example:
  race_chasecam_freelook   ; enable; run again to disable

See also: race_chasecam (enable/disable chasecam follow), race_chasecam_view (cycle view mode), race (activates race mode)
```

### Notes

- No FLAG. CF flags are `CF_PLAYER` at commands.c:1024 -- matches existing "any player" framing. No `self->racer` check in this handler (unlike race_chasecam and race_chasecam_view), so active racers can also use this command; the note "Available to all players in race mode, including active racers" is a behavioral distinction from the sibling chasecam commands.
- Broadcast strings sourced verbatim from race.c:2271 ("Chasecam freelook disabled") and race.c:2275 ("Chasecam freelook enabled").

---

## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author
should resolve before applying drafts to L1.

### F1: F1 SKILL amendment validation -- STRONG SHIPPING SIGNAL

**Verdict**: ACTIONABLE (skill ops, not apply-pass)

**Cards involved**: 10 of the batch's 29 commands had Permission mislabels caught by the F1 CF-flag-extraction amendment. Per-chunk catch counts: A=2 (race_countdown_up, race_countdown_down -- both labelled "admin command", actually CF_PLAYER|CF_SPC_ADMIN); B=3 (race_simultaneous, race_match, race_scoring -- all labelled "admin command", actually CF_PLAYER alone); C=0 (all 3 commands' existing permissions matched source); D=1 (race_del_checkpoint -- missing CF_SPC_ADMIN); E=4 (race_set_timeout -- "any player or spectator" -> "any player or admin spectator" silent correction without flag; race_set_weapon_mode -- "admin command"; race_chasecam -- "spectator-only"; race_chasecam_view -- "any spectator"). 9 of the 10 were surfaced as drafted_with_flag; race_set_timeout was corrected silently by the chunk E sub-agent.

**Observation**: F1 catch rate is ~34% across 29 race-namespace commands. Without the F1 amendment, all 10 Permission mislabels would have shipped as L1 lies (most labelling CF_PLAYER|CF_SPC_ADMIN or CF_PLAYER commands as "admin command"). This is the F1 stress-test result the handoff predicted: the Race batch validates the amendment at scale. The Gameplay rules batch ship 2026-05-27 introduced F1 after observing the 7-batch Permission-mislabel pattern; Internal state (1 command) gave partial validation; Race (29 commands) is the conclusive validation.

**Source evidence**: All 29 commands' CF flags verified against `src/commands.c:695-1030` registration table; mappings applied per the CF-flag-to-wording table in `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` (locked 2026-05-26 after Mode selection batch F1 finding).

**Recommendation**: F1 amendment is shipping-ready. Apply-pass-author should expect ~1/3 of Race command cards to carry a `FLAG: Permission corrected via F1` bullet; review the corrected Permission line against the existing description before applying. The Player communication batch (next and final KTX L1 batch) will be a smaller-scale F1 follow-up (estimated 10-15 commands). Future batches outside KTX (MVDSV, QWFWD, QTV forks) will need their own CF-flag-to-wording table per codebase but inherit the F1 discipline.

---

### F2: F3 SKILL amendment status -- DORMANT for top-level Shape 1; sub-action manual-flip pattern observed

**Verdict**: CONFIRMED_CLEAN (catalog-amendment-candidate; no apply-pass action)

**Cards involved**: All Shape 1 paired toggles in batch (k_race + Mode-selection-batch `race`; k_race_simultaneous + race_simultaneous; k_race_match + race_match) use canonical `cvar_toggle_msg` (race.c:269, race.c:5130, race.c:5243). Zero top-level manual-flip Shape 1 patterns. ONE sub-action manual-flip observed inside race_pacemaker handler (race.c:4331-4336: `enabled = !cvar(RACE_PACEMAKER_JUMPS_CVAR); cvar_fset(RACE_PACEMAKER_JUMPS_CVAR, enabled ? 1 : 0)` -- the "jumps" sub-action body).

**Observation**: The handoff doc predicted F3 (manual-flip Shape 1 variant introduced in Gameplay rules batch) would get its first production validation here. Result: F3 strictly dormant for the Race batch -- no top-level paired toggle command uses manual flip. The closest pattern is the race_pacemaker "jumps" sub-action which DOES use manual flip syntactically but is structurally a sub-action of a multi-arg dispatcher (race_pacemaker), not a top-level paired toggle. F3 as currently defined does NOT apply to sub-action contexts. If similar dispatchers surface in MVDSV / QWFWD / QTV forks, the operator may want to consider whether the F3 definition should extend to sub-action manual flips inside multi-arg dispatchers.

**Source evidence**: race.c:269 (k_race canonical cvar_toggle_msg); race.c:5130 (k_race_simultaneous canonical); race.c:5243 (k_race_match canonical); race.c:4331-4336 (race_pacemaker jumps sub-action manual flip).

**Recommendation**: No catalog amendment needed at this time. Document the sub-action manual-flip observation in the race_pacemaker and k_race_pace_jumps cards' Notes (already done by chunk C sub-agent). If a future batch surfaces 2+ sub-action manual-flip patterns inside multi-arg dispatchers AND those patterns share a recognizable Layer A shape, the operator can crystallize an F3-extension shape per earn-their-keep discipline.

---

### F3: k_race_pace_resolution default value mismatch (ACTIONABLE -- apply pass)

**Verdict**: ACTIONABLE

**Cards involved**: `k_race_pace_resolution` (chunk C).

**Observation**: Existing L1 description says `Default: 0`; source confirms `RegisterCvarEx("k_race_pace_resolution", "2")` at world.c:919 -- default is 2. The recast text reflects the correct value (2); the flag tells the apply-pass-author the change is intentional and source-true.

**Source evidence**: `world.c:919`.

**Recommendation**: Apply-pass-author confirms the corrected default value (2) is intentional before applying. No further action required.

---

### F4: k_race_match_rounds default value missing in existing description (ACTIONABLE -- apply pass)

**Verdict**: ACTIONABLE

**Cards involved**: `k_race_match_rounds` (chunk B).

**Observation**: Existing description says `Default: see server config` without naming the value; `world.c:924` confirms `RegisterCvarEx("k_race_match_rounds", "9")` -- default is 9. Recast includes the explicit value.

**Source evidence**: `world.c:924`.

**Recommendation**: Apply-pass-author confirms the added default value (9) before applying.

---

### F5: race_settings[] mode-activation override of RegisterCvar defaults (cross-cutting pattern)

**Verdict**: CONFIRMED_CLEAN (informational; surfaces on individual cards as needed)

**Cards involved**: Every k_race_* cvar potentially. Explicitly surfaced on `k_race_simultaneous` (chunk B): `RegisterCvarEx` default is 0 (world.c:922), but the `race_settings[]` bundle at race.c:308 sets it to 1 when race mode activates via `apply_race_settings()` (race.c:323 called from race.c:271 -- the `ToggleRace()` handler). A server running `k_race 1` without an explicit `k_race_simultaneous` config line gets `simultaneous=1` at runtime.

**Observation**: The `race_settings[]` and `norace_settings[]` arrays (race.c:293-322) are applied at race-mode activation/deactivation. They override `RegisterCvar` defaults for cvars they cover. This affects: k_race_simultaneous (0 -> 1), k_race_scoring_system (matches default 0), k_race_match (matches default 0). For cvars where race_settings[] differs from RegisterCvar default, the runtime behavior surprises the operator reading just the cvar card; the cvar's draft should note the override.

**Source evidence**: race.c:271 (`apply_race_settings()` call from `ToggleRace()`); race.c:293-322 (the two settings arrays); race.c:323-403 (the `apply_race_settings()` body).

**Recommendation**: No action required at apply-pass time -- the `k_race_simultaneous` draft surfaces this explicitly; other affected cvars match their `RegisterCvar` defaults. If a future operator audit identifies additional cvars where race_settings[] differs from registration default, surface as a per-cvar flag at that time. Cross-card pattern documented for skill discipline.

---

### F6: race_match sv_silentrecord cross-engine side-effect (load-bearing)

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `k_race_match` and `race_match` (chunk B).

**Observation**: `race_match_toggle()` at race.c:5231-5244 first toggles `k_race_match` via canonical `cvar_toggle_msg`, then immediately sets `sv_silentrecord` via `cvar_fset("sv_silentrecord", cvar(RACE_MATCH_CVAR) ? 0 : 1)` (race.c:5244). `sv_silentrecord` is a non-KTX mvdsv engine cvar. When match mode is on, `sv_silentrecord=0` (server recording enabled, overriding the silent-record default); when match mode is off, `sv_silentrecord=1` (recording suppressed). Both the cvar and command cards in chunk B surface this side-effect in Effect.

**Source evidence**: `race.c:5243-5244`.

**Recommendation**: No action required -- both cards correctly surface the side-effect. The cross-engine cvar reference (`sv_silentrecord`) is a plain mechanism label in Effect, not a See-also entity (mvdsv cvars aren't yet in KTX L1).

---

### F7: race_chasecam family asymmetry -- race_chasecam_freelook does NOT skip active racers (informational)

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `race_chasecam`, `race_chasecam_view`, `race_chasecam_freelook` (chunk E).

**Observation**: All three chasecam commands are CF_PLAYER and gated by `race_command_checks()`. race_chasecam (r_changefollowstatus at race.c:2980) and race_chasecam_view (race_chasecam_change at race.c:2283) additionally check `self->racer` and refuse if the caller is an active racer (a chasecam is a spectator-view-mode that doesn't apply during a run). race_chasecam_freelook (race_chasecam_freelook_change at race.c:2259) does NOT check `self->racer` -- it toggles the per-player freelook field even mid-run, though the field's effect is only realized when chasecam mode is active (which requires non-racer status). The asymmetry is intentional and preserved in the drafts.

**Source evidence**: race.c:2259, 2283, 2980.

**Recommendation**: No action required -- documented on each card. Apply-pass-author understands the asymmetry from the per-card text.

---

### F8: k_race_countdown + race_countdown_up/down -- paired-numeric-adjuster pattern (catalog-amendment-candidate)

**Verdict**: CONFIRMED_CLEAN (catalog-amendment-candidate, naming-hint; not shipping action)

**Cards involved**: `k_race_countdown`, `race_countdown_up`, `race_countdown_down` (chunk A).

**Observation**: Two paired commands (up/down) adjust one bounded numeric cvar via shared handler `DEF(RaceCountdownChange)` with arg values +1 and -1 (commands.c:696-697). Handler at race.c:274-294 reads `cvar("k_race_countdown") + t`, validates bounds (rcd >= 1 && rcd <= 5), writes via `cvar_fset`. Neither Shape 1 (no binary flip) nor Shape 2 (no cycle/wrap) cleanly fits. Each command is classified shape-less; the cvar is Shape 3 with paired numeric adjusters noted in Effect. Similar pattern candidate: KTX race-pacemaker headstart/trail increments inside `race_pacemaker` (different shape because sub-action of a dispatcher rather than top-level commands).

**Source evidence**: commands.c:696-697 (registration rows); race.c:274-294 (shared handler body).

**Recommendation**: Per earn-their-keep discipline, do NOT extend the shape catalog on a 1-of-1 (chunk A is the only Race-batch instance of this exact pattern). If a future batch surfaces 2+ additional paired-numeric-adjuster pairs (top-level commands, NOT sub-actions), the operator may consider crystallizing a new Shape N (e.g. "Shape 1e: cvar + paired numeric adjusters"). Until then, shape-less is correct.

---

### F9: Pacemaker family is concept-note candidate (apply-pass follow-up; L3)

**Verdict**: CONFIRMED_CLEAN (L3 follow-up; not apply-pass action)

**Cards involved**: `race_pacemaker`, `k_race_pace_enabled`, `k_race_pace_headstart`, `k_race_pace_jumps`, `k_race_pace_legal`, `k_race_pace_resolution` (chunk C, 6 entities).

**Observation**: The pacemaker feature spans 1 command + 5 cvars + a multi-arg dispatcher with 5 sub-actions. race_pacemaker's See-also is at the 5-cap, listing only sibling cvars. The Shape 1-only entities are loosely interlocked (k_race_pace_enabled gates record validity together with k_race_pace_legal; k_race_pace_headstart and k_race_pace_resolution are adjustable; k_race_pace_jumps is toggleable; all are sub-actions of race_pacemaker). An L3 concept note would carry the cross-cvar interlock + the sub-action arg syntax in one place.

**Source evidence**: race.c:4284-4477 (race_pacemaker handler + helpers); race.c:22-44 (cvar-name + INCR_PARAMS macros); race.c:1341 (record-validity gate).

**Recommendation**: Track as L3 concept-note follow-up (operator-side, not skill-side). Do NOT inline-write the note in any drafts file -- See-also stays at 5 entries per card.

---

### F10: Cross-batch See-also -- k_race ↔ `race` (Mode selection batch)

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `k_race` (chunk A); cross-batch reference to `race` command (drafted 2026-05-26 in `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-mode-selection.md`).

**Observation**: `k_race` is canonical Shape 1: registered at world.c:912, paired with the `race` command (commands.c:695, handler `ToggleRace` at race.c:242 calling `cvar_toggle_msg(self, "k_race", redtext("race"))` at race.c:269). The paired command was drafted in the Mode selection batch a day earlier. Chunk A's k_race draft references `race` in See-also without inline batch annotation; entities apply by name so the cross-link resolves naturally.

**Source evidence**: `world.c:912` (registration); `commands.c:695` (command row); `race.c:269` (toggle call); Mode selection drafts file (existing `race` card).

**Recommendation**: No action required. If Mode selection drafts haven't been applied yet at the time Race drafts get applied, the See-also reference is still accurate text-wise; the L1 cross-link gets resolved on apply. Apply ordering is operator's discretion.

---

### F11: Dispatcher-hypothesis corrections via Rule 11 (source-over-handoff)

**Verdict**: CONFIRMED_CLEAN (informational; Rule 11 working as designed)

**Cards involved**: Three cards across two chunks surfaced corrections to dispatcher pre-flight hypotheses:

1. **race_toggle is NOT the k_race toggle** (chunk A): handoff doc hypothesized race_toggle as the Shape 1 paired toggle for k_race. Source check: commands.c:1007 registers race_toggle with handler `DEF(r_changestatus)` arg=3 -- a per-player racer-state command (one of 4 statuses ready/break/toggle/cancel sharing r_changestatus dispatcher at race.c:3011). The k_race toggle is actually the `race` command (Mode selection batch). race_toggle is shape-less per-player state setter. Corrected by chunk A sub-agent.

2. **r_clear_route does NOT write k_race_route_* cvars** (chunk D): dispatcher pre-flight hypothesized r_clear_route (handler for race_route_clear) clears k_race_route_number to -1 and k_race_route_mapname to "". Source check: those writes happen in `race_route_now_custom` (race.c:2784-2785), called by r_Xset (node-placement commands like race_set_start/finish/checkpoint) and by the route-load failure path inside r_route (race.c:3391-3392 is the success path). race_route_clear (r_clear_route at race.c:3210) removes route entities, restores weapons, unmutes -- does NOT directly write the route-identity cvars. Corrected by chunk D sub-agent.

3. **k_race_countdown NOT adjustable mid-run** (chunk A): existing L1 description claimed the cvar is adjustable mid-run. Source check: `RaceCountdownChange` at race.c:278 includes `if (match_in_progress || !isRACE() || race_is_started()) { return; }` -- the gate blocks both up and down adjusters during an active run. Corrected on the cvar card (drafted_with_flag).

**Source evidence**: commands.c:1007 (race_toggle row); race.c:3011 (r_changestatus); race.c:2784-2785, 3210, 3391-3392 (route cvar writers); race.c:278 (countdown gate).

**Recommendation**: No action required. Rule 11 (source over handoff) operated correctly across all three cases; sub-agents surfaced the corrections in records + notes_for_dispatcher. Worth noting for skill discipline: handoff-doc claims are hypotheses, not contracts -- the per-card source check is the ground truth.

---

### F12: See-also bidirectional spot-check -- 22 of 25 sibling pairs symmetric

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: All 45 cards in batch.

**Observation**: Dispatcher ran a bidirectional spot-check across 25 high-confidence sibling pairs (cvar ↔ paired command, cvar ↔ cvar in same family, sibling commands in same family). 22 of 25 pairs symmetric. 3 asymmetries identified, all defensible:

1. `k_race_route_mapname` / `k_race_route_number` ↔ `race_route_clear`: NOT cross-linked in either direction. race_route_clear does NOT write the route-identity cvars (per F11.2); it clears route ENTITIES (start/finish/checkpoint nodes) but the cvars are written by r_Xset (route-edit commands) and r_route (preset-route load). The non-relationship is structurally correct.

2. `race_break_all` → `race_ready` one-way: race_break_all references race_ready in See-also (as the per-player version of what the admin command does in bulk), but race_ready does NOT reference race_break_all (the admin bulk command isn't a natural sibling from the player perspective). Asymmetry follows the "Order by relationship strength" discipline.

**Source evidence**: All 5 chunk scratch files at `/tmp/chunk_{A,B,C,D,E}_2026-05-27.md`; dispatcher bidirectional-check transcript.

**Recommendation**: No action required. The 3 asymmetries are defensible; the 22 symmetric pairs confirm sibling cross-linking discipline holds across chunks.
