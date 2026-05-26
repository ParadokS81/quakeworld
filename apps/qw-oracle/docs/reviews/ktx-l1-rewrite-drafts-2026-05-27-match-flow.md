# ktx-l1-rewrite drafts -- batch 2026-05-27 (Match flow category)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the `ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies clean drafts, hand-edits flagged-drafts after verifying the surfaced contradiction. Drafts do NOT auto-apply to L1 (`entities.description`); the apply pass is a separate phase.

**Batch summary**: 71 entities catalog total -- 70 drafted (41 clean + 29 flagged) + 1 aborted (k_sready, empty description routes to describe-fill-synthesis) + 0 parked + 0 novelty halts. Chunk_size=9, 8 parallel chunks (7 of 9 + 1 of 8).

**Anchor**: `v1.36-1633-g67253dc`

# Match-state cvars (mode masters, defaults, configs, toggles)

<!-- VERDICT: drafted -->
## k_matchless (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:795
- **Catalog line**: 8821
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for matchless mode -- removes the formal match lifecycle (no prewar/countdown) so players play continuously.
>
> 0 = regular match server with prewar/countdown/match cycle.
> 1 = matchless server (FFA by default; CTF is supported as first-class with teamplay forced to 2 if needed). Coop and singleplayer are always treated as matchless regardless.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config).

`RegisterCvar("k_matchless")` at `world.c:795`. No `cvar_toggle_msg` or `cvar_fset` write site found. Read as `cvar("k_matchless")` at `client.c:387`, `client.c:3077`, and cached into the global `k_matchLess` at `world.c:1095`. No command handler writes this cvar.

### Proposed draft

```
Removes the formal match lifecycle so players can play continuously without prewar or countdown phases.

0 = standard match server -- prewar, ready-up, countdown, and match cycle are active.
1 = matchless server -- no prewar or countdown; play begins immediately. FFA by default; CTF is supported as a first-class matchless mode (teamplay is forced to 2 when needed). Coop and singleplayer are always treated as matchless regardless of this setting.

Default: 0.
Permission:    server config only.

Example:
  # server.cfg -- run a continuous FFA server:
  k_matchless 1

  # Optional companions:
  k_matchless_countdown 0            # suppress the "match has begun" announcement
  k_matchless_max_idle_time 120      # force-spec idle players after 2 minutes

See also: k_matchless_countdown (countdown behaviour in matchless mode), k_matchless_max_idle_time (idle enforcement), k_prewar (prewar permissions in standard mode).
```

### Notes

- Clean recast. Existing description is accurate; v2 adds Example with companion cvars and clarifies the coop/singleplayer special case.
- Verification: `world.c:1095` reads `k_matchLess = cvar("k_matchless")` at init; `client.c:387` reads it to skip certain client setup steps in matchless mode. No command writes it.

---

---

<!-- VERDICT: drafted -->
## k_matchless_countdown (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:796
- **Catalog line**: 8852
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Only effective in matchless mode. When 0, the pre-game countdown and "The match has begun!" announcement are suppressed and play begins immediately. When non-zero, the normal countdown runs even in matchless mode.
>
> 0 = no countdown in matchless mode.
> 1 = countdown runs in matchless mode.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config).

`RegisterCvar("k_matchless_countdown")` at `world.c:796`. No command writes this cvar. Read at `match.c:1294` (controls whether "The match has begun!" is printed) and `match.c:2462` (controls whether the countdown timer is suppressed).

### Proposed draft

```
In matchless mode only: controls whether the startup countdown and "The match has begun!" announcement run before play begins.

0 = suppress countdown and announcement -- play starts immediately when matchless mode is active.
1 = run the normal countdown even in matchless mode.

Has no effect when k_matchless is 0.

Default: 0.
Permission:    server config only.
Prerequisites: k_matchless must be 1 for this setting to have any effect.

Example:
  # server.cfg -- matchless server with countdown retained:
  k_matchless 1
  k_matchless_countdown 1

See also: k_matchless (matchless mode master toggle), k_matchless_max_idle_time (idle enforcement).
```

### Notes

- Clean recast. "Has no effect when k_matchless is 0" clause source-verified at `match.c:1294`: `if (!k_matchLess || cvar("k_matchless_countdown"))` -- the "The match has begun!" print fires when NOT matchless OR when countdown is enabled. Countdown suppression at `match.c:2460-2465`: `else if (k_matchLess) { if (!cvar("k_matchless_countdown")) { timer->cnt2 = 0; } }`.

---

---

<!-- VERDICT: drafted -->
## k_matchless_max_idle_time (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:797
- **Catalog line**: 8883
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Matchless mode only: maximum seconds a player may go without firing before being force-moved to spectator and asked to reconnect. A warning is sent beforehand -- 30 seconds before the limit if the limit exceeds 30 seconds, or at half the limit otherwise. Set to 0 to disable idle enforcement.
>
> Range: 0-N seconds (0 = disabled; no upper clamp).
>
> Default: 0 (disabled; bare registration).
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config).

`RegisterCvar("k_matchless_max_idle_time")` at `world.c:797`. Read at `world.c:1097` (cached into `k_matchLess_idle_time` global) and consumed in `TimerThink` at `match.c:637-668` (idle check, warning, and force-spectate). No command writes this cvar.

### Proposed draft

```
In matchless mode only: maximum number of seconds a player may go without firing before being force-moved to spectator and prompted to reconnect.

A warning is sent before the deadline: 30 seconds before the limit if the limit exceeds 30 seconds, or at half the limit otherwise. Players force-spectated are also prompted to reconnect their client.

Set to 0 to disable idle enforcement entirely.

Range: 0 or more seconds (0 = disabled; no upper clamp).
Default: 0 (idle enforcement off).
Permission:    server config only.
Prerequisites: k_matchless must be 1 for idle enforcement to be active.

Example:
  # server.cfg -- force-spec idle players after 3 minutes:
  k_matchless 1
  k_matchless_max_idle_time 180

See also: k_matchless (matchless mode master toggle), k_matchless_countdown (countdown behaviour in matchless mode).
```

### Notes

- Clean recast. Source-verified idle logic at `match.c:637-668`: `idle_time = g_globalvars.time - p->attack_finished`; warning fires when `idle_time == k_matchLess_idle_warn`; force-spectate fires when `idle_time > k_matchLess_idle_time`. The existing description's warning-timing formula is correct and traced to the cached globals at `world.c:1097`.

---

---

<!-- VERDICT: drafted -->
## k_privategame (KTX cvar, Match flow -- Shape 3 + Shape 7b state-cvar peer)

- **Status**: drafted
- **Source**: src/world.c:1087
- **Catalog line**: 9040
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Tracks whether the server is currently in private-game mode. When enabled, only logged-in players may ready up; unauthenticated players attempting to ready are told to log in first.
>
> 0 = public game (login not required to ready).
> 1 = private game (only logged-in players may ready).
>
> Not set directly in server config -- toggled via a private-game vote, which also configures login requirements and optionally kicks or force-spectates unauthenticated players when enabled mid-setup.
>
> Default: 0.
> Set by: private-game vote.

### Shape classification

Shape 3 + Shape 7b state-cvar peer (state cvar written by voteprivate vote on pass).

`RegisterCvarEx("k_privategame", "0")` at `world.c:1087`. The cvar is written only by `private_game_toggle()` at `vote.c:1556` (`cvar_fset("k_privategame", enable ? 1 : 0)`), which is called when the `voteprivate` vote passes or an admin veto triggers at `vote.c:1467-1484`. Read by `is_private_game()` at `vote.c:1602` to gate ready-up checks. No direct `cvar_toggle_msg` or user-invocable set path exists. This is the state-cvar pattern for Shape 7b: the cvar that reflects the outcome of the voteprivate vote.

### Proposed draft

```
Tracks whether the server is currently running a private game. When active, only logged-in players may ready up; unauthenticated players who attempt to ready are told to log in first.

0 = public game -- login not required to ready up.
1 = private game -- only players logged in via sv_login may ready up.

This cvar is not set directly in server.cfg. It is written automatically when a 'voteprivate' vote passes or an admin veto overrides it. On vote pass, KTX also configures sv_login and optionally force-spectates or disconnects unauthenticated players, depending on k_privategame_allow_specs and k_privategame_force_reconnect.

To restore private-game mode as the default on each new map, set k_privategame_default 1. To enable the voteprivate command, set k_privategame_voteable 1.

Default: 0.
Permission:    set automatically by the voteprivate vote system; not user-settable directly.

See also: voteprivate (vote command that flips this cvar on pass), k_vp_privategame (vote threshold percentage), k_privategame_voteable (must be 1 to enable voteprivate), k_privategame_default (restores private-game state per map), k_privategame_allow_specs (whether unauthenticated spectators are permitted).
```

### Notes

- Clean recast. Write site source-verified at `vote.c:1556` (called from `vote_check_privategame` at `vote.c:1453`). Admin veto path source-verified at `vote.c:1467-1484`: `is_admins_vote(OV_PRIVATE)` triggers `private_game_toggle(enable)`. The cvar is the state-outcome of the vote, not a direct server-config knob.
- See-also is at the 5-entry cap. The `k_privategame_*` companion family is large; a concept note for the private-game system would consolidate the cross-links.
- The `voteprivate` command (CF_PLAYER, gated by `k_privategame_voteable`) is the Shape 7b command that drives this state cvar. OV_PRIVATE threshold is at `vote.c:326`: `percent = cvar("k_vp_privategame")`.

---

<!-- VERDICT: drafted -->
## k_privategame_default (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1088
- **Catalog line**: 9073
- **Anchor**: v1.36-1633-g67253dc

### Current description

> The private-game state the server restores on a rules or map reset. Only takes effect when the current private-game state differs from this value and private-game voting is enabled (k_privategame_voteable).
>
> 0 = return to public game on reset.
> 1 = return to private game on reset.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config).

`RegisterCvarEx("k_privategame_default", "0")` at world.c:1088. Read via `private_game_by_default()` helper (vote.c:1615-1617) which returns `cvar("k_privategame_default")`. Consumed at commands.c:4863 inside `execute_rules_reset()` -- no `cvar_toggle_msg` site, no cycle handler. Pure server-config gate for reset behavior.

### Proposed draft

```
The private-game state the server restores when rules or map reset.

Effect:
  During a rules/map reset, if the current private-game state differs from
  this default AND private-game voting is enabled (k_privategame_voteable 1),
  the server automatically toggles the private-game state to match this value.

0 = restore to public game on reset.
1 = restore to private game on reset.

Permission:    server config only
Default:       0

Example:
  # server.cfg -- keep server public after any reset
  k_privategame_default 0
  k_privategame_voteable 1

  # make a private-game-by-default server:
  k_privategame_default 1
  k_privategame_voteable 1

See also: k_privategame (current private-game state), k_privategame_voteable (must be 1 for this default to take effect on reset), voteprivate (vote command that changes the current private-game state)
```

### Notes

- Existing description is accurate. Recast adds Effect section making the reset-trigger behavior explicit; moves the k_privategame_voteable condition from the mixed-in original text into the Effect bullet.

---

---

<!-- VERDICT: drafted -->
## k_count (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:939
- **Catalog line**: 8546
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Duration in seconds of the pre-match countdown before a game starts. The countdown is always at least 3 seconds (at least 5 in bloodfest mode). In coop and other non-deathmatch modes there is no countdown regardless of this value.
>
> Range: 0 upward (effective minimum 3, or 5 in bloodfest).
>
> Default: 10.
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config). `RegisterCvarEx("k_count", "10")` at world.c:939; read at match.c:2443 and 2453. No command calls `cvar_toggle_msg` or `cvar_fset` on it.

### Proposed draft

```
Duration in seconds of the pre-match countdown before a game starts.

Effect:
  KTX clamps the value to a minimum of 3 seconds; in bloodfest mode the minimum is 5 seconds.
  In coop and other non-deathmatch modes, no countdown fires regardless of this setting.
  In matchless mode, countdown only fires if k_matchless_countdown is set; otherwise countdown is skipped.

Permission:    server config only
Default:       10.

Example:
  set k_count 5    // in server.cfg -- 5-second countdown (clamped to 3 minimum)

See also: k_matchless_countdown (controls whether countdown fires in matchless mode)
```

### Notes

- Verification: `RegisterCvarEx("k_count", "10")` at world.c:939 confirms default 10. Clamping at match.c:2443 (`max(3, ...)`) and match.c:2453 (`max(5, ...)` for bloodfest) is source-verified. Non-deathmatch no-countdown at match.c:2455 (`!deathmatch -> cnt2 = 0`) is source-verified. Matchless-mode conditional at match.c:2460-2465 (`k_matchLess -> check k_matchless_countdown`) is source-verified.

---

---

<!-- VERDICT: drafted -->
## k_prewar (KTX cvar, Match flow -- Shape 2 cvar + paired cycle command)

- **Status**: drafted
- **Source**: src/world.c:844
- **Catalog line**: 9008
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Server policy for fire and jump permissions during the prewar (warm-up) phase before the match goes live.
>
> 0 = no fire or jump in prewar.
> 1 = fire and jump allowed in prewar.
> 2 = fire and jump require typing 'ready' first (per-player gate).
>
> Default: 1. Once the match is live the gate is bypassed regardless of value.
> Set by: server config or 'prewar' admin command (cycles 0 -> 1 -> 2 -> 0).

### Shape classification

Shape 2 (cvar + paired cycle command).

`RegisterCvarEx("k_prewar", "1")` at `world.c:844`. `TogglePreWar` at `admin.c:793` reads `cvar("k_prewar")`, increments with wrap (0->1->2->0), and writes back via `cvar_fset("k_prewar", k_prewar)` at `admin.c:846`. Command `prewar` registered at `commands.c:755` with `CF_BOTH_ADMIN` (admin only); the handler also has an explicit `is_adm(self)` guard at `admin.c:797`. The existing description is accurate.

### Proposed draft

```
Controls what players are permitted to do during the prewar (warm-up) phase before the match goes live.

0 = no fire or jump allowed during prewar.
1 = fire and jump are allowed freely throughout prewar.
2 = fire and jump require the player to type 'ready' first (per-player gate; players who have not readied up are blocked until they do).

Once the match is live, this setting has no effect.

Default: 1.
Permission:    server config, or admin (any slot) via the 'prewar' cycle command.
Match-state:   effective during prewar only; bypassed once the match is live.

Example:
  # server.cfg -- require ready before firing:
  k_prewar 2

  # admin in-game, cycle to the next prewar mode:
  prewar

See also: prewar (paired cycle command, 0->1->2->0).
```

### Notes

- Clean recast. Source-verified: `TogglePreWar` at `admin.c:793-847` confirms 0->1->2->0 cycle; broadcast messages per value at lines 811-843 confirm the per-value behavior. CF_BOTH_ADMIN confirmed at `commands.c:755`.
- `weapons.c:2811` read site: `k_prewar = cvar("k_prewar")` caches into a global used for the per-player fire/jump gate during prewar.

---

---

<!-- VERDICT: drafted_with_flag -->
## k_exttime (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:855
- **Catalog line**: 8607
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Length of the overtime period in minutes when k_overtime is 1 (timed overtime). Has no effect under other k_overtime modes (sudden death, tie-break, golden frag).
>
> Range: 1-999 (minutes; clamped).
>
> Default: 5.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired toggle command). The `overtimeup` command (commands.c:799, CF_PLAYER | CF_SPC_ADMIN) increments `k_exttime` via `cvar_fset` and wraps at 11->1, but does not match the Shape 2 pattern (no preset array; values are direct minute counts not indices). Primary classification is Shape 3; `overtimeup` is a secondary in-game setter that modifies this cvar. The existing description omits `overtimeup` entirely. Flagged.

### Proposed draft

```
Length of the overtime period in minutes, used when k_overtime is set to 1 (timed overtime mode).

Effect:
  KTX clamps the value to 1-999 at overtime start.
  Has no effect when k_overtime is 0 (no overtime), 2 (sudden death), 3 (tie-break), or 4 (golden frag).

Permission:    server config or 'overtimeup' command in-game (pre-match only; in-game range 1-10)
Default:       0 (bare registration; conventional value in example configs is 5).

Example:
  set k_exttime 5       // in server.cfg -- 5-minute overtime period
  set k_overtime 1      // enable timed overtime

  // step through values 1-10 in-game:
  overtimeup            // increments by 1, wraps 10 -> 1; broadcasts "Overtime length set to N minute(s)"

See also: k_overtime (overtime mode; k_exttime only applies when k_overtime = 1), overtimeup (increments k_exttime 1-10 in-game)
```

### Notes

- FLAG: existing description says "Set by: server config" but `overtimeup` (CF_PLAYER | CF_SPC_ADMIN, commands.c:799) also writes `k_exttime` via `cvar_fset` (ChangeOvertimeUp at commands.c:1770-1790). The Permission/Set-by line must be updated to include `overtimeup`. Apply-pass-author should confirm whether `overtimeup` has its own L1 card and add it to See-also accordingly.
- FLAG: existing description says "Default: 5" but `RegisterCvar("k_exttime")` at world.c:855 is a bare registration (no explicit default = 0). The "5" is a convention from `ktx.cfg` example config. Apply-pass-author should decide whether to record the registered default (0) or the conventional config default (5); the proposed draft uses 0 with a parenthetical note.
- Verification: clamping range 1-999 at overtime start confirmed at match.c:523 (`bound(1, cvar("k_exttime"), 999)`). `overtimeup` wrap logic at commands.c:1781-1783 (`(k_exttime >= 11) || (k_exttime <= 0) -> k_exttime = 1`) confirmed; effective in-game range is 1-10.

---

---

<!-- VERDICT: drafted_with_flag -->
## k_overtime (KTX cvar, Match flow -- Shape 2 cvar + paired cycle command)

- **Status**: drafted_with_flag
- **Source**: src/world.c:854
- **Catalog line**: 8943
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Selects what happens when a drawn match reaches its time limit.
>
> 0 = no overtime (match ends as a draw).
> 1 = time-based overtime (play extended by k_exttime minutes).
> 2 = sudden death (next frag wins).
> 3 = tie-break (extra time, only granted when the score difference is more than one frag).
> 4 = golden frag (one decisive frag ends the match).
>
> Default: 0.
> Set by: server config or 'overtime' admin command in-game. Overtime is suppressed in hoonymode, lgc mode, and team/CTF games without exactly two teams.

### Shape classification

Shape 2 (cvar + paired cycle command).

`RegisterCvar("k_overtime")` at `world.c:854`. `ChangeOvertime` at `commands.c:1723` reads `cvar("k_overtime")`, cycles through 0->1->2->3->4->0 via sequential `cvar_fset` calls, and has a `match_in_progress` early-return at `commands.c:1727`. Command `overtime` registered at `commands.c:798` with `CF_PLAYER | CF_SPC_ADMIN`. The existing description calls it an "admin command" -- but `CF_PLAYER | CF_SPC_ADMIN` means any player or admin spectator, not admin-only.

### Proposed draft

```
Selects the overtime rule applied when a drawn match reaches its time limit.

0 = no overtime -- match ends as a draw.
1 = time-based overtime -- play extended by k_exttime minutes.
2 = sudden death -- next frag wins.
3 = tie-break -- extra time granted only when the score difference is at most one frag.
4 = golden frag -- one decisive frag ends the match immediately.

Overtime is suppressed automatically in: hoonymode (handled by its own round-end logic), lgc mode, and team/CTF games with fewer or more than exactly two teams.

Default: 0.
Permission:    server config, or any player or admin spectator via the 'overtime' cycle command (pre-match only).
Match-state:   set in server.cfg before match; the 'overtime' in-game command is pre-match only.

Example:
  # server.cfg -- golden frag overtime:
  k_overtime 4

  # server.cfg -- time-based overtime, 5 extra minutes:
  k_overtime 1
  k_exttime 5

  # in-game (pre-match), cycle to the next overtime mode:
  overtime

See also: overtime (paired cycle command, 0->1->2->3->4->0), overtimeup (cycles k_exttime for time-based overtime duration), k_exttime (overtime extension length in minutes).
```

### Notes

- FLAG: Existing description says "Set by: server config or 'overtime' admin command in-game." Source shows `overtime` command registered at `commands.c:798` with `CF_PLAYER | CF_SPC_ADMIN` -- this is any player or admin spectator, NOT admin-only. The "admin command" label is incorrect. Apply-pass-author should update Permission to reflect any-player access.
- Suppression conditions source-verified at `match.c:526-577`: hoonymode early-return at line 526; lgc mode at line 557; team/CTF teams != 2 at line 560.
- SD_GOLDEN_FRAG = 4 confirmed at `include/g_consts.h:305`.
- Value 3 tie-break: the description says "score difference is more than one frag" but source at `match.c:567` says `abs(sc) > 1` (more than 1 frag difference). Recast draft clarifies to "at most one frag" from the perspective of when overtime IS granted (mirror phrasing).

---

---

<!-- VERDICT: drafted -->
## k_idletime (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:933
- **Catalog line**: 8668
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Timeout in seconds after which KTX force-starts the match if players have not all readied up. Once at least half the players are ready, a countdown begins from this value (minimum 3 seconds); when it expires the match starts automatically. Set to 0 to disable the auto-start.
>
> Range: 0 or more (seconds; minimum effective countdown is 3 seconds).
>
> Default: 0 (disabled).
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config). `RegisterCvar("k_idletime")` at world.c:933 (bare, default 0); read at match.c:2611, 2678, 2738. No command calls `cvar_toggle_msg` or `cvar_fset` on it.

### Proposed draft

```
Timeout in seconds before KTX auto-starts the match when players have not all readied up.

Effect:
  Once at least half the players are ready (and at least 2 non-bot players are present), an idle-bot countdown begins from k_idletime, clamped to a minimum of 3 seconds.
  The countdown ticks down; players who haven't readied receive per-second warnings at 5 seconds and below.
  When the countdown expires, KTX starts the match automatically.
  The idle bot is cancelled if the ready-player ratio drops below half before expiry.
  Set to 0 to disable -- no auto-start fires.

Permission:    server config only
Default:       0 (disabled).

Example:
  set k_idletime 60    // in server.cfg -- auto-start 60 seconds after half the players are ready

See also: k_count (pre-match countdown duration once the match actually starts)
```

### Notes

- Verification: bare `RegisterCvar("k_idletime")` at world.c:933 -- default 0. Gate `cvar("k_idletime") <= 0` at match.c:2611, 2678 confirms "0 disables." Minimum clamping `max(3, cvar("k_idletime"))` at match.c:2738 confirms 3-second floor. Half-ready threshold `0.5f * i > CountRPlayers()` at match.c:2621, 2690 source-verified. Per-second warnings at match.c:2657-2665 (`if ((i < 5) || !(i % 5))`) added to Effect (not in existing description but load-bearing user info). Bots suppress idle bot (`bots` check at match.c:2678) -- minor; not added to Effect. Practice mode also suppresses (`k_practice` at match.c:2712) -- minor; not added.

---

---

<!-- VERDICT: drafted -->
## k_pause_without_matchtag (KTX cvar, Match flow -- Shape 3 + Shape 4 composition)

- **Status**: drafted
- **Source**: src/world.c:788
- **Catalog line**: 8977
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether players can pause outside of a tagged (organised) match. By default, pausing is only permitted when the server has a matchtag set; enabling this cvar lifts that restriction. The per-player pause-request budget applies regardless.
>
> 0 = pause allowed only when a matchtag info key is set on the server.
> 1 = pause allowed even without a matchtag.
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 + Shape 4 composition.

`RegisterCvarEx("k_pause_without_matchtag", "0")` at `world.c:788`. No command writes this cvar. Read at `client.c:5799` inside `PlayerCanPause()`: `if (cvar("k_pause_without_matchtag") || ((matchtag != NULL) && matchtag[0]))`. This is a gate condition on the `pause` command (Shape 4): when 0 and no matchtag serverinfo key is set, non-admin pause requests are blocked with "Pause is not allowed" at `commands.c:8795`. No toggle command exists (Shape 3 primary). Shape 4 relationship is to the `pause` command.

### Proposed draft

```
Controls whether the player-facing 'pause' command is allowed on servers without a matchtag serverinfo key configured.

By default, player-initiated pausing is restricted to organised matches (servers where a 'matchtag' serverinfo key has been set). Setting this to 1 lifts that restriction so any game can be paused.

Admins may always pause regardless of this setting. The per-player pause-request budget (reset to the server maximum at each match start) applies regardless and is a separate limit.

0 = pause allowed only when the 'matchtag' serverinfo key is non-empty.
1 = pause allowed regardless of matchtag.

Default: 0.
Permission:    server config only.

Example:
  # server.cfg -- allow pausing on casual servers:
  k_pause_without_matchtag 1

See also: pause (the gated player command).
```

### Notes

- Clean recast. Gate logic source-verified at `client.c:5793-5810`: `PlayerCanPause` checks `k_pause_without_matchtag || (matchtag != NULL && matchtag[0])`. Admin bypass at `commands.c:8793`: `!cvar("pausable") && !is_adm(self) && !PlayerCanPause(self)` -- admins skip the `PlayerCanPause` gate.
- Per-player budget: `p->k_pauseRequests` decremented at `client.c:5802`; reset to `MAX_PAUSE_REQUESTS` at `match.c:1085`. Action-level summary retained; implementation detail deferred.
- `pause` command at `commands.c:1002`: `CF_PLAYER | CF_MATCHLESS | CF_SPC_ADMIN` (any player or admin spectator).

---

---

<!-- VERDICT: drafted -->
## k_auto_xonx (KTX cvar, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/world.c:794
- **Catalog line**: 8515
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Automatically sets the XonX user mode based on the count of players plus ready spectators. Only active outside of a live match and outside matchless mode. When enabled, manual user-mode commands are blocked ("Command blocked due to k_auto_xonx").
>
> 0 = off.
> 1 = on (0-3 players -> 1on1; 4-5 -> 2on2; 6-7 -> 3on3; 8-9 -> 4on4; 10+ -> 10on10).
>
> Default: 0.
> Set by: server config.

### Shape classification

shape-less. No paired toggle or cycle command; no gate relationship to another command. `k_auto_xonx` is a pure server-config state cvar whose value is read by `CheckAutoXonX` (world.c:1199) and the spectator ready/break paths (match.c:2766, 2984) to control auto-mode selection and whether spectators may mark themselves ready. No inter-entity relationship pattern from the shape catalog applies.

### Proposed draft

```
Controls whether KTX automatically selects the XonX user mode based on current player and ready-spectator count.

Effect:
  When on, KTX counts active players plus ready spectators and applies the matching mode:
    0-3  -> 1on1
    4-5  -> 2on2
    6-7  -> 3on3
    8-9  -> 4on4
    10+  -> 10on10
  Manual user-mode preset commands are blocked while this is active ("Command blocked due to k_auto_xonx").
  When on, spectators may mark themselves ready (to be counted toward the player total) and unready via the break command.
  Inactive during a live match and inactive in matchless mode.

0 = off -- user mode must be set manually.
1 = on -- mode switches automatically as player/ready-spectator count changes.

Permission:    server config only
Default:       0.

Example:
  set k_auto_xonx 1    // in server.cfg -- auto-selects 1on1/2on2/3on3/4on4/10on10

See also: break (spectators can ready/unready when k_auto_xonx is on and non-matchless)
```

### Notes

- Verification: `CheckAutoXonX` at world.c:1191 has early-return on `match_in_progress || k_matchLess` (world.c:1199), confirming inactive during match and matchless mode. Spectator ready path at match.c:2763-2789 gates on `!cvar("k_auto_xonx") || k_matchLess` before allowing spectators to ready. The command-block message at commands.c:4654 fires when a manual user-mode command is issued while k_auto_xonx is on. Ready-spectator counting at world.c:1210 uses `(p->ct == ctSpec) && p->ready` loop. All source-verified at this anchor.

---

---

<!-- VERDICT: drafted -->
## k_membercount (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:935
- **Catalog line**: 8913
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Minimum number of players each team must have before a match can start. In team/CTF modes, if any team is below this count the match is blocked and players see "Server wants at least N players in each team". 0 means no per-team minimum.
>
> Range: 0 or more (players per team).
>
> Default: 0 (no minimum).
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config).

`RegisterCvar("k_membercount")` at `world.c:935`. Read at `match.c:1822` inside `isCanStart()`. The check at `match.c:1858` (`if (!isTeam() && !isCTF()) { return true; }`) confirms the minimum applies only in team and CTF modes -- duel and FFA bypass it entirely. No command writes this cvar.

### Proposed draft

```
Minimum number of players each team must have before a match can start, in team and CTF modes.

If any team falls below this count when the match is about to start, play is blocked and all players see: "Server wants at least N players in each team / Waiting..."

Has no effect in duel or FFA modes.

Range: 0 or more players per team (0 = no minimum).
Default: 0.
Permission:    server config only.

Example:
  # server.cfg -- require at least 2 players per team:
  k_membercount 2

See also: k_lockmin (minimum number of teams required to start), k_lockmax (maximum number of teams allowed).
```

### Notes

- Clean recast. Source-verified: `isCanStart()` at `match.c:1818` calls `CheckMembers(k_membercount)` at line 1927 only after the `!isTeam() && !isCTF()` early-return at line 1858 (duel/FFA return true immediately). Refusal message at `match.c:1937-1940` confirmed.

---

---

<!-- VERDICT: drafted_with_flag -->
## k_lockmin (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:858
- **Catalog line**: 8759
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Minimum number of teams required for a match to start. If fewer teams have ready players than this value, the match is blocked and players are told "N more teams required!". Ignored in Clan Arena and Race modes, where the minimum is forced to 2.
>
> Range: integer team count.
>
> Default: 2.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config). `RegisterCvar("k_lockmin")` at world.c:858 (bare, default 0); read at match.c:1820 inside `isCanStart()`. No command calls `cvar_toggle_msg` or `cvar_fset` on it.

### Proposed draft

```
Minimum number of teams with ready players required for a match to start.

Effect:
  If ready-team count is below k_lockmin, KTX refuses to start and broadcasts "N more teams required!".
  In Clan Arena and Race modes, k_lockmin is ignored and the minimum is forced to 2.
  In duel mode and Rocket Arena, team-count limits are bypassed entirely.
  Only applies to team and CTF game modes; non-team modes (FFA, duel) use player-count rules instead.

Permission:    server config only
Default:       0.

Example:
  set k_lockmin 1    // in server.cfg -- require at least 1 team
  set k_lockmax 2    // combined with k_lockmax to enforce a 2-team match

See also: k_lockmax (maximum team count counterpart), k_membercount (per-team minimum player count)
```

### Notes

- FLAG: existing description says "Default: 2" but `RegisterCvar("k_lockmin")` at world.c:858 is a bare registration (default 0). The example config `resources/example-configs/ktx/ktx.cfg:9` shows `set k_lockmin 0`. Apply-pass-author must correct the default from 2 to 0.
- Verification: CA/Race override at match.c:1820 (`(isCA() || isRACE()) ? 2 : cvar("k_lockmin")`) source-verified. "N more teams required!" message at match.c:1887 (`va("%d more team%s required!\n", sub, count_s(sub))`) source-verified. Duel early-return at match.c:1836 source-verified. RA bypass at match.c:1830 source-verified. Non-team-mode bypass at match.c:1858 source-verified.

---

<!-- VERDICT: drafted_with_flag -->
## k_lockmax (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:859
- **Catalog line**: 8729
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Maximum number of teams required for a match to start. If more teams have ready players than this value, the match is blocked and players are told "Get rid of N teams!". Ignored in Clan Arena and Race modes, where the maximum is forced to 2.
>
> Range: integer team count.
>
> Default: 2.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command, set-once in config). `RegisterCvar("k_lockmax")` at world.c:859 (bare, default 0); read at match.c:1821 inside `isCanStart()`. No command calls `cvar_toggle_msg` or `cvar_fset` on it.

### Proposed draft

```
Maximum number of teams with ready players allowed for a match to start.

Effect:
  If ready-team count exceeds k_lockmax, KTX refuses to start and broadcasts "Get rid of N teams!".
  In Clan Arena and Race modes, k_lockmax is ignored and the maximum is forced to 2.
  In duel mode and Rocket Arena, team-count limits are bypassed entirely.
  Only applies to team and CTF game modes; non-team modes (FFA, duel) use player-count rules instead.

Permission:    server config only
Default:       0.

Example:
  set k_lockmin 1
  set k_lockmax 2    // in server.cfg -- enforce exactly 2 teams

See also: k_lockmin (minimum team count counterpart), k_membercount (per-team minimum player count)
```

### Notes

- FLAG: existing description says "Default: 2" but `RegisterCvar("k_lockmax")` at world.c:859 is a bare registration (default 0). The example config `resources/example-configs/ktx/ktx.cfg:8` shows `set k_lockmax 32`. Apply-pass-author must correct the default from 2 to 0.
- Verification: CA/Race override at match.c:1821 (`(isCA() || isRACE()) ? 2 : cvar("k_lockmax")`) source-verified. "Get rid of N teams!" message at match.c:1904 source-verified. Duel early-return at match.c:1836-1855 (uses player-count, not team-count logic) source-verified. RA bypass at match.c:1830 (`isRA() -> return true`) source-verified. Non-team-mode bypass at match.c:1858 (`!isTeam() && !isCTF() -> return true`) source-verified.

---

---

<!-- VERDICT: drafted -->
## k_exclusive (KTX cvar, Match flow -- Shape 1)

- **Status**: drafted
- **Source**: src/world.c:940
- **Catalog line**: 8576
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for exclusive mode -- when enabled, the server stops accepting new player joins once the expected match player count (k_attendees) is reached. Players attempting to join after the lock are told "Sorry, server is full / Please reconnect as spectator".
>
> 0 = anyone can join (subject to maxclients).
> 1 = new player joins are rejected once player count reaches k_attendees (spectator joins still allowed).
>
> Default: 0.
> Set by: server config or 'exclusive' admin command in-game.

### Shape classification

Shape 1 (cvar + paired toggle command). The `exclusive` command (commands.c:1000, CF_BOTH_ADMIN) calls `cvar_toggle_msg(self, "k_exclusive", redtext("exclusive mode"))` inside `ToggleExclusive`, which has a `match_in_progress` early-return. No mode-precondition -- Shape 1 (not 1c).

### Proposed draft

```
Controls whether the server locks player-slot joins once the expected match headcount (k_attendees) is reached.

0 = open -- anyone may join as a player (subject to maxclients).
1 = exclusive -- once player count reaches k_attendees, further player joins are refused ("Sorry, server is full / Please reconnect as spectator"); spectator joins are still allowed.

Permission:    server config or 'exclusive' admin command in-game (pre-match only)
Match-state:   pre-match only (the 'exclusive' toggle command is blocked while a match is in progress)
Default:       0.

Example:
  set k_exclusive 1          // in server.cfg
  set k_attendees 4          // lock at 4 players
  // or toggle in-game before the match:
  exclusive                  // admin toggles exclusive mode on/off

See also: exclusive (paired toggle command), k_attendees (player count threshold that triggers the join lock)
```

### Notes

- Verification: `ToggleExclusive` at commands.c:8613 has `match_in_progress` early-return, confirming pre-match only for the command. `CF_BOTH_ADMIN` at commands.c:1000 confirms admin only. Gate check at client.c:1455 (`CountPlayers() >= k_attendees && cvar("k_exclusive")`) and refusal messages at client.c:1457-1458 are source-verified.

---

---

<!-- VERDICT: drafted -->
## k_lockmap (KTX cvar, Match flow -- Shape 1 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:845
- **Catalog line**: 8698
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Locks the current map. When locked, non-admin players cannot change the map via vote ("MAP IS LOCKED!"), and the automatic reload-to-default-map that fires when the server empties or holds only bots is suppressed.
>
> 0 = map not locked.
> 1 = map locked.
>
> Default: 0.
> Set by: server config or 'lockmap' admin command in-game (toggles 0/1).

### Shape classification

Shape 1 + Shape 4 composition. Shape 1: the `lockmap` command (commands.c:756, CF_BOTH_ADMIN) calls `ToggleMapLock` at admin.c:849, which writes `k_lockmap` via `cvar_fset` at admin.c:862 and 876 (no `match_in_progress` early-return -- toggle fires at any time). Shape 4: `k_lockmap` is read as a gate at maps.c:434 (`if (cvar("k_lockmap") && !is_adm(self))`) refusing non-admin map-vote attempts with "MAP IS LOCKED!" across all paths that feed `DoSelectMap`. This composition is the verified classification per mechanism map.

### Proposed draft

```
Locks the current map, blocking non-admin map-vote attempts and suppressing the server's auto-reload to the default map.

0 = map not locked -- all map-vote routes and auto-reload operate normally.
1 = map locked -- non-admin map-vote attempts are refused ("MAP IS LOCKED!"); auto-reload to default map on empty server is suppressed.

Effect:
  When set, all map-vote paths that feed DoSelectMap are blocked for non-admins -- this includes the votemap command, the cm command, and auto-aliased map-name shortcuts (e.g. /dm3).
  Admins can still vote for or force a map change regardless of the lock.
  When set, the empty-server auto-reload to k_defmap is suppressed -- the server stays on the current map even when no players remain.

Permission:    server config or 'lockmap' admin command in-game (any time)
Default:       0.

Example:
  set k_lockmap 1    // in server.cfg -- map locked from start
  // or in-game at any time:
  lockmap            // admin toggles lock; broadcasts "<name> locks map" pre-match, private "Map locked" mid-match

See also: lockmap (paired admin toggle command), votemap (gated by k_lockmap for non-admins), k_defmap (auto-reload-to-default mechanism this suppresses when set)
```

### Notes

- Verification: `ToggleMapLock` at admin.c:849 writes via `cvar_fset` (not `cvar_toggle_msg`) but functions as Shape 1 toggle. No `match_in_progress` early-return confirms "any time." Broadcast wording difference (bprint pre-match vs sprint mid-match) at admin.c:864-870 and 878-884 source-verified. Gate at maps.c:434 source-verified. Empty-server auto-reload suppression at world.c:112 (`!cvar("k_lockmap")` guard on CheckDefMap) source-verified.
- Mechanism map at `apps/qw-oracle/docs/reviews/ktx-map-voting-mechanism-map.md` confirms the Shape 1 + Shape 4 composition and the DoSelectMap gate framing. Used as verified reference for this anchor.

---

---

<!-- VERDICT: drafted_with_flag -->
## k_lockmode (KTX cvar, Match flow -- Shape 2 cvar + paired cycle command)

- **Status**: drafted_with_flag
- **Source**: src/world.c:941
- **Catalog line**: 8789
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether new player joins are allowed during a live match.
>
> 0 = unlocked -- anyone may join (no ghost tracking).
> 1 = team-locked -- only players already on an existing team may rejoin (ghost tracking active); new players are blocked.
> 2 = fully locked -- no players may join; they are told to reconnect as spectators.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 2 (cvar + paired cycle command).

`ChangeLock` at `commands.c:3344` reads `cvar("k_lockmode")`, increments with wrap (0->1->2->0), and writes back via `cvar_fset("k_lockmode", lock)`. This is the Shape 2 cycle pattern. The command `lockmode` is registered at `commands.c:748` with `CF_PLAYER | CF_SPC_ADMIN` and has a `match_in_progress` early-return. The existing description omits the `lockmode` cycle command entirely -- the "Set by: server config" line is incomplete.

### Proposed draft

```
Controls how aggressively new player joins are restricted once a match is live.

0 = unlocked -- any new player may join during a match (no ghost tracking).
1 = team-locked -- only players already on an existing team may rejoin (ghost tracking active); brand-new players are blocked.
2 = fully locked -- all new joins are refused; the player is told to reconnect as a spectator.

Default: 0.
Permission:    server config, or any player or admin spectator via the 'lockmode' cycle command (pre-match only).
Match-state:   set in server.cfg before match; the 'lockmode' in-game command is pre-match only.

Example:
  # server.cfg -- start team-locked:
  k_lockmode 1

  # in-game (pre-match), cycle to the next lock mode:
  lockmode

See also: lockmode (paired cycle command, 0->1->2->0), k_lockmin (minimum teams), k_lockmax (maximum teams).
```

### Notes

- FLAG: Existing description says "Set by: server config" only. Source shows `lockmode` at `commands.c:748` (CF_PLAYER | CF_SPC_ADMIN) with `cvar_fset("k_lockmode", lock)` at `commands.c:3374` and `match_in_progress` early-return at `commands.c:3348` -- the cvar has a full cycle command. Apply-pass-author should add Permission and Match-state lines reflecting the `lockmode` command.
- The `lockmode` command's CF flags (`CF_PLAYER | CF_SPC_ADMIN`) mean any player (not just admins) can cycle the lock mode pre-match. This is an unusual delegation of lock-control to all players; the lockmode command card should note this.
- Ghost tracking (value 1) source-verified at `client.c:1352-1354` and `client.c:2902-2904`.

---

---

<!-- VERDICT: drafted_with_flag -->
## k_freeze (KTX cvar, Match flow -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:871
- **Catalog line**: 8637
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether moving map entities (platforms, doors, trains) are frozen during warm-up and pre-match. During the match countdown they are always frozen regardless of this setting. Practice mode bypasses freezing entirely.
>
> 0 = map entities move freely before the match.
> 1 = map entities are frozen until the match starts.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 1 (cvar + paired toggle command). The `freeze` command (commands.c:806, CF_PLAYER | CF_SPC_ADMIN) calls `cvar_toggle_msg(self, "k_freeze", redtext("map freeze"))` with a `match_in_progress` early-return. No mode-precondition -- Shape 1 (not 1c).

### Proposed draft

```
Controls whether moving map entities (platforms, doors, trains) are frozen during warm-up and pre-match phases.

0 = map entities move freely before the match starts.
1 = map entities are frozen until the match starts.

Effect:
  During the match countdown (match_in_progress = 1), entities are always frozen regardless of this setting.
  Practice mode bypasses freezing entirely -- map entities always move in practice mode.

Permission:    server config or 'freeze' command in-game (pre-match only)
Match-state:   pre-match only (the 'freeze' toggle command is blocked while a match is in progress)
Default:       0.

Example:
  set k_freeze 1    // in server.cfg -- freeze platforms/doors/trains before match
  // or in-game:
  freeze            // any player or admin spectator toggles map freeze on/off

See also: freeze (paired toggle command)
```

### Notes

- FLAG: existing description says "Default: 1" but `RegisterCvar("k_freeze")` at world.c:871 is a bare registration (default 0). The example config `resources/example-configs/ktx/ktx.cfg:74` shows `set k_freeze 0`. Apply-pass-author must correct the default from 1 to 0.
- FLAG: existing description says "Set by: server config" but the `freeze` command (CF_PLAYER | CF_SPC_ADMIN, commands.c:806) is the paired toggle. The shape is Shape 1, not Shape 3; the Permission/Set-by line must be updated to include the `freeze` command.
- Verification: `ToggleFreeze` at commands.c:3797 has `match_in_progress` early-return (pre-match only for command). CF_PLAYER | CF_SPC_ADMIN at commands.c:806 = "any player or admin spectator" -- not admin-only. Frozen-during-countdown `match_in_progress == 1` condition at plats.c:126, 162, doors.c:231, 290, triggers.c:1122 is source-verified. Practice-mode bypass `k_practice` guard at plats.c:124, 160, 364 is source-verified. The `cvar_toggle_msg` call at commands.c:3804 is the canonical Shape 1 signal.

---

---

<!-- VERDICT: drafted -->
## lock_practice (KTX cvar, Match flow -- Shape 3 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:851
- **Catalog line**: 9129
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether practice mode can be toggled and whether it persists across level changes.
>
> 0 = practice mode auto-clears on level change (returns server to normal mode).
> 1 = practice-toggle command allowed; practice mode persists across level changes.
> 2 = server locked in current practice mode; toggle command refused with "console: command is locked". Any value other than 0 or 1 is also treated as locked.
>
> Default: 0 (empty; bare registration).
> Set by: server config.

### Shape classification

Shape 3 + Shape 4 composition.

`RegisterCvar("lock_practice")` at world.c:851 (bare, default = 0). Read at:
- commands.c:4913 in `TogglePractice()` -- gates the `practice` toggle command (value 2 or unknown refuses with "console: command is locked").
- g_main.c:521 -- determines whether practice auto-clears on level change (if `!cvar("lock_practice") && k_practice`, calls `SetPractice(0, NULL)`).
- client.c:3100 -- same auto-clear check on client-connect event.
- race.c:297, 318 -- race mode sets `lock_practice 1` on init and `lock_practice 0` on cleanup.

Shape 3: no paired toggle command (the `practice` command toggles `srv_practice_mode` via `SetPractice()`, not this cvar). Shape 4: explicitly gates `practice` toggle command at commands.c:4921-4922.

### Proposed draft

```
Controls whether the 'practice' toggle command is permitted and whether
practice mode persists across level changes.

Effect:
  0 = practice mode auto-clears on level change -- when a new map loads while
    practice mode is active, the server returns to normal mode automatically.
  1 = the 'practice' toggle command is allowed and practice mode persists
    across level changes (map loads do not clear it).
  2 = server is locked in its current practice mode -- the 'practice' toggle
    command is refused with "console: command is locked". Any value other
    than 0 or 1 also triggers the locked behavior.

Prerequisites: Race mode automatically sets lock_practice 1 on init and
  restores it to 0 on cleanup; the server config value is overridden during
  active race mode.

Permission:    server config only
Default:       0

Example:
  # server.cfg -- allow practice toggling and persist across maps
  lock_practice 1

  # lock server permanently in normal mode (no practice toggling)
  srv_practice_mode 0
  lock_practice 2

See also: srv_practice_mode (the practice on/off state this cvar constrains), practice (toggle command gated by this cvar), allow_toggle_practice (who is permitted to invoke the toggle command)
```

### Notes

- Existing description is accurate. Recast surfaces the race-mode override (not in original) as a surprise-bearing prerequisite (verified at race.c:297, 318).

---

---

<!-- VERDICT: drafted_with_flag -->
## srv_practice_mode (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:944
- **Catalog line**: 9161
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Server-wide toggle for practice mode, which allows freeplay outside a match by disabling match-only mechanics (item and pack respawns, door/platform/trigger gating, teledeath, and related match logic). Changing this setting reloads the map and announces the new mode to all players.
>
> 0 = normal play (announces "Server in normal mode", reloads map).
> 1 = practice mode (announces "Server in practice mode", match mechanics disabled).
>
> Default: 0.
> Set by: server config. Cannot be changed while a match is in progress.

### Shape classification

Shape 3 (cvar with no direct user-facing paired toggle -- the `practice` command calls `SetPractice()` which internally `cvar_fset`s this cvar, but the relationship is not a standard `cvar_toggle_msg` Shape 1 pair; the `practice` command's access is gated by `allow_toggle_practice` and `lock_practice`, not by a direct Shape 1 pairing against this cvar).

`RegisterCvar("srv_practice_mode")` at world.c:944. Written by `SetPractice()` via `cvar_fset("srv_practice_mode", ...)` at commands.c:4894. Read at world.c:549 on map load to restore practice mode if set. Race.c:296 sets `srv_practice_mode 1` in its init string; race.c:319 sets `srv_practice_mode 0` on cleanup.

### Proposed draft

```
Server-wide switch for practice mode, which disables match-only mechanics
(item and pack respawns, trigger gating, teledeath) to allow freeplay
outside a match.

Effect:
  0 = normal play -- announces "Server in normal mode"; if changing from
      practice mode, reloads the current map.
  1 = practice mode -- announces "Server in practice mode"; match mechanics
      disabled for the session; map is NOT reloaded when switching TO
      practice mode.
  Changing this value while a match is in progress is refused (G_Error).
  Race mode sets srv_practice_mode 1 on init and restores it to 0 on cleanup.

Permission:    server config, or in-game via the 'practice' command (subject
               to lock_practice and allow_toggle_practice)
Match-state:   pre-match only
Default:       0

Example:
  # server.cfg -- start server in practice mode
  srv_practice_mode 1
  lock_practice 1    # keep it locked so players cannot toggle it off

See also: practice (in-game toggle command), lock_practice (controls toggle permission and level-change persistence), allow_toggle_practice (who may invoke the toggle command)
```

### Notes

- FLAG: Existing description says "Changing this setting reloads the map and announces the new mode to all players" -- source shows the map reload is direction-dependent. `SetPractice(1, ...)` (switching to practice) only fires the `G_bprint` announcement; it does NOT reload the map. `SetPractice(0, "")` (switching to normal mode, as invoked by `TogglePractice`) calls `changelevel(mapname)` only in the `!k_practice` branch. The recast corrects this to "if changing FROM practice mode, reloads the current map." Apply-pass-author should verify the `SetPractice()` body at commands.c:4886-4908 before applying.

---

---


# Mode-team-size presets

<!-- VERDICT: drafted -->
## 1on1 (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:809
- **Catalog line**: 9220
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switches the server to 1on1 (duel) mode. Applies the built-in duel preset (2 players, timelimit 10, weapons-stay deathmatch, overtime on) and execs the duel config chain (configs/usermodes/1on1/default.cfg plus any map-specific overrides). Announces "1 on 1 settings enabled".
>
> Accepts an optional matchtag argument (written to serverinfo). Subject to k_free_mode / k_allowed_free_modes access control.
>
> Set by: player or spectator-admin command '1on1' in-game.

### Shape classification

Shape-less (plain mode preset -- no modifier cvar with paired toggle, no vote channel, no Shape 4 gate-cvar of its own).

`DEF(UserMode)` at commands.c:809 with index 1, CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS. Bundle `_1on1_um_init[]` confirmed at commands.c:4216-4230: teamplay 0, deathmatch 3 (weapons stay), k_mode 1, k_membercount/lockmin/lockmax all 0 (not applicable in duel). Structurally different from all team-mode presets (which use teamplay 2, k_mode 2, real member/lock values). Canonical-card pattern does NOT apply -- 1on1 is its own full card.

### Proposed draft

```
Switches the server to 1on1 (duel) mode and applies the built-in duel preset.

Effect:
  Applies the _1on1 preset bundle:
    maxclients 2        (two players)
    k_maxclients 2
    timelimit 10        (10-minute rounds)
    teamplay 0          (no teammates -- hurt yourself only)
    deathmatch 3        (weapons stay on pickup)
    k_overtime 1        (time-based overtime)
    k_exttime 3         (3-minute overtime)
    k_pow 0             (powerups off)
    k_membercount 0     (not applicable in duel)
    k_lockmin 0
    k_lockmax 0
    k_mode 1
  Loads configs/usermodes/1on1/default.cfg and any map-specific overrides.
  Announces "1 on 1 settings enabled" to all players.
  Accepts an optional match-tag argument (written to serverinfo).

Prerequisites:
  - Blocked on hoonymode-only maps ("This map is designed for hoonymode only").
  - Blocked while k_auto_xonx is set ("Command blocked due to k_auto_xonx").
  - Requires k_free_mode to permit the invoking player's role.
  - The UM_1ON1 bit must be set in k_allowed_free_modes (otherwise refused
    with "Server disallows this command").

Permission:    any player or admin spectator (CF_PLAYER | CF_SPC_ADMIN)
Match-state:   pre-match only

Example:
  1on1               # apply duel preset
  1on1 mymatchtag    # apply duel preset and record match tag in serverinfo

See also: k_free_mode (role access control for mode selection), k_allowed_free_modes (bitmask enabling/disabling specific mode presets), 2on2 (team-mode sibling), ffa (free-for-all sibling)
```

### Notes

- Existing description is accurate. Recast adds full bundle inline, surfaces prerequisite refusal paths (hoonymode-only, k_auto_xonx, k_free_mode, k_allowed_free_modes) from the `UserMode()` dispatcher, and splits Permission from Set-by.

---

---

<!-- VERDICT: drafted -->
## 2on2 (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:810
- **Catalog line**: 9249
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the built-in 2on2 match preset. Sets maxclients 4, timelimit 10 minutes, teamplay 2 (self and teammate damage), deathmatch 3 (weapons stay on pickup), powerups on, 1 player minimum per team, 1-2 teams, and 3-minute overtime. Accepts an optional match-tag argument.
>
> Default: n/a (command, not a cvar).
> Set by: any player or admin spectator (subject to k_free_mode access control and k_allowed_free_modes gating).

### Shape classification

Shape-less (plain mode preset). `DEF(UserMode)` at commands.c:810 with index 2. Bundle `_2on2_um_init[]` at commands.c:4271-4285. Structurally different from 1on1 (teamplay 2, dm3, k_mode 2, real member/lock values). Different from 3on3 (dm3 vs dm1, timelimit 10 vs 15, k_membercount 1 vs 2, k_exttime 3 vs 5). Canonical-card pattern does not apply -- separate full card.

### Proposed draft

```
Switches the server to 2on2 (2v2 team) mode and applies the built-in 2on2 preset.

Effect:
  Applies the _2on2 preset bundle:
    maxclients 4        (four players)
    k_maxclients 4
    timelimit 10        (10-minute rounds)
    teamplay 2          (self and teammate damage on)
    deathmatch 3        (weapons stay on pickup)
    k_overtime 1        (time-based overtime)
    k_exttime 3         (3-minute overtime)
    k_pow 1             (powerups on)
    k_membercount 1     (minimum 1 player per team)
    k_lockmin 1         (minimum 1 team)
    k_lockmax 2         (maximum 2 teams)
    k_mode 2
  Loads configs/usermodes/2on2/default.cfg and any map-specific overrides.
  Accepts an optional match-tag argument (written to serverinfo).

Prerequisites:
  - Blocked on hoonymode-only maps.
  - Blocked while k_auto_xonx is set.
  - Requires k_free_mode to permit the invoking player's role.
  - The UM_2ON2 bit must be set in k_allowed_free_modes.

Permission:    any player or admin spectator (CF_PLAYER | CF_SPC_ADMIN)
Match-state:   pre-match only

Example:
  2on2               # apply 2on2 preset
  2on2 mymatchtag    # apply 2on2 preset and record match tag

See also: k_free_mode (role access control for mode selection), k_allowed_free_modes (bitmask enabling/disabling specific mode presets), 1on1 (duel sibling), 3on3 (team-mode sibling, dm1 variant)
```

### Notes

- Existing description is accurate. Recast drops "Default: n/a (command, not a cvar)" (commands have no Default field in v2 shape). Adds full bundle and prerequisite paths.

---

---

<!-- VERDICT: drafted -->
## 3on3 (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:811
- **Catalog line**: 9277
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the built-in 3on3 (3v3) match preset. Sets maxclients 6, timelimit 15 minutes, teamplay 2 (self and teammate damage), deathmatch 1 (weapons do not stay), powerups on, 2 players minimum per team, 1-2 teams, and 5-minute overtime. Accepts an optional match-tag argument.
>
> Default: n/a (command, not a cvar).
> Set by: any player or admin spectator (rejected on hoonymode-only maps, while k_auto_xonx is set, or when blocked by k_free_mode / k_allowed_free_modes).

### Shape classification

Shape-less (plain mode preset). `DEF(UserMode)` at commands.c:811 with index 3. Bundle `_3on3_um_init[]` at commands.c:4303-4317. Different from 2on2 (dm1 vs dm3, timelimit 15 vs 10, k_membercount 2 vs 1, k_exttime 5 vs 3). Near-identical to 3on3on3 in most values except maxclients (6 vs 9) and k_lockmax (2 vs 3). That difference is meaningful (2-team vs 3-team structure), so separate full cards.

### Proposed draft

```
Switches the server to 3on3 (3v3 team) mode and applies the built-in 3on3 preset.

Effect:
  Applies the _3on3 preset bundle:
    maxclients 6        (six players)
    k_maxclients 6
    timelimit 15        (15-minute rounds)
    teamplay 2          (self and teammate damage on)
    deathmatch 1        (weapons do not stay on pickup)
    k_pow 1             (powerups on)
    k_membercount 2     (minimum 2 players per team)
    k_lockmin 1         (minimum 1 team)
    k_lockmax 2         (maximum 2 teams)
    k_overtime 1        (time-based overtime)
    k_exttime 5         (5-minute overtime)
    k_mode 2
  Loads configs/usermodes/3on3/default.cfg and any map-specific overrides.
  Accepts an optional match-tag argument (written to serverinfo).

Prerequisites:
  - Blocked on hoonymode-only maps.
  - Blocked while k_auto_xonx is set.
  - Requires k_free_mode to permit the invoking player's role.
  - The UM_3ON3 bit must be set in k_allowed_free_modes.

Permission:    any player or admin spectator (CF_PLAYER | CF_SPC_ADMIN)
Match-state:   pre-match only

Example:
  3on3               # apply 3on3 preset
  3on3 mymatchtag    # apply 3on3 preset and record match tag

See also: k_free_mode (role access control for mode selection), k_allowed_free_modes (bitmask enabling/disabling specific mode presets), 2on2 (dm3 team sibling), 10on10 (high-player-count team sibling), 3on3on3 (3-team FFA variant, same rules but k_lockmax 3)
```

### Notes

- Existing description is accurate. The Set-by line already named the prerequisite paths -- moved to Prerequisites in v2 shape. Full bundle added to Effect.

---

---

<!-- VERDICT: drafted -->
## 3on3on3 (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:820
- **Catalog line**: 9305
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the 3-on-3-on-3 match preset: 3 teams of up to 3 players, 15-minute timelimit, 5-minute overtime, teamplay 2 (teammate damage on), deathmatch 1 (weapons not left on floor), powerups on, 9-player cap. Loads any matching override .cfg files and announces "3 on 3 on 3 settings enabled" to all players. Accepts an optional matchtag argument.
>
> Set by: any player or spectator-admin via '3on3on3' command.

### Shape classification

Shape-less (plain mode preset -- 3-team variant). `DEF(UserMode)` at commands.c:820 with index 12, CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS. Bundle `_3on3on3_um_init[]` at commands.c:4319-4333. Key structural difference from `3on3`: k_lockmax 3 (enables 3-team play) vs k_lockmax 2, maxclients 9 vs 6. Separate full card (3-team vs 2-team structure is a meaningful behavioral difference, not a near-identical sibling).

### Proposed draft

```
Switches the server to 3on3on3 (three-team) mode and applies the built-in
3-team preset.

Effect:
  Applies the _3on3on3 preset bundle:
    maxclients 9        (nine players -- three teams of up to three)
    k_maxclients 9
    timelimit 15        (15-minute rounds)
    teamplay 2          (self and teammate damage on)
    deathmatch 1        (weapons do not stay on pickup)
    k_pow 1             (powerups on)
    k_membercount 2     (minimum 2 players per team)
    k_lockmin 1         (minimum 1 team)
    k_lockmax 3         (maximum 3 teams -- enables three-team play)
    k_overtime 1        (time-based overtime)
    k_exttime 5         (5-minute overtime)
    k_mode 2
  Loads configs/usermodes/3on3on3/default.cfg and any map-specific overrides.
  Announces "3 on 3 on 3 settings enabled" to all players.
  Accepts an optional match-tag argument (written to serverinfo).

Prerequisites:
  - Blocked on hoonymode-only maps.
  - Blocked while k_auto_xonx is set.
  - Requires k_free_mode to permit the invoking player's role.
  - The UM_3ON3ON3 bit must be set in k_allowed_free_modes.

Permission:    any player or admin spectator (CF_PLAYER | CF_SPC_ADMIN)
Match-state:   pre-match only

Example:
  3on3on3               # apply 3-team preset
  3on3on3 mymatchtag    # apply 3-team preset and record match tag

See also: k_free_mode (role access control), k_allowed_free_modes (bitmask enabling/disabling mode presets), 3on3 (2-team variant, same rules but k_lockmax 2), 2on2on2 (2-team-of-2 three-team sibling)
```

### Notes

- Existing description is accurate. "3 teams of up to 3 players" is an inference from maxclients 9 / k_lockmax 3 -- consistent with source. Recast uses source bundle directly. Adds prerequisite refusal paths not in the original (same paths as all other mode presets from UserMode dispatcher).

---

<!-- PREVIOUS BATCH CONTENT BELOW (Demo & spectator) -- do not process -->

---

<!-- VERDICT: drafted -->
## 10on10 (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:813
- **Catalog line**: 9192
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Applies the built-in 10-on-10 match preset. Sets maxclients 20, timelimit 20 minutes, teamplay 2 (self and teammate damage), deathmatch 1 (weapons do not stay), powerups on, 5 players minimum per team, 1-2 teams, and 5-minute overtime. Accepts an optional match-tag argument.
>
> Default: n/a (command, not a cvar).
> Set by: any player, admin spectator, or server (also auto-selected as the high-player-count fallback when k_auto_xonx is active).

### Shape classification

Shape-less (plain mode preset). `DEF(UserMode)` at commands.c:813 with index 5. Bundle `_10on10_um_init[]` at commands.c:4387-4401. Structurally same category as 3on3 (teamplay 2, dm1, k_mode 2) but different values (maxclients 20, timelimit 20, k_membercount 5). Separate full card.

### Proposed draft

```
Switches the server to 10on10 (10v10 team) mode and applies the built-in
10on10 preset.

Effect:
  Applies the _10on10 preset bundle:
    maxclients 20       (twenty players)
    k_maxclients 20
    timelimit 20        (20-minute rounds)
    teamplay 2          (self and teammate damage on)
    deathmatch 1        (weapons do not stay on pickup)
    k_pow 1             (powerups on)
    k_membercount 5     (minimum 5 players per team)
    k_lockmin 1         (minimum 1 team)
    k_lockmax 2         (maximum 2 teams)
    k_overtime 1        (time-based overtime)
    k_exttime 5         (5-minute overtime)
    k_mode 2
  Loads configs/usermodes/10on10/default.cfg and any map-specific overrides.
  Accepts an optional match-tag argument (written to serverinfo).
  Also auto-applied by k_auto_xonx as the high-player-count fallback mode.

Prerequisites:
  - Blocked on hoonymode-only maps.
  - k_auto_xonx blocks manual invocation (the server auto-applies this mode
    instead when player count triggers k_auto_xonx selection).
  - Requires k_free_mode to permit the invoking player's role.
  - The UM_10ON10 bit must be set in k_allowed_free_modes.

Permission:    any player or admin spectator (CF_PLAYER | CF_SPC_ADMIN)
Match-state:   pre-match only

Example:
  10on10             # apply 10on10 preset
  10on10 mymatchtag  # apply 10on10 preset and record match tag

See also: k_free_mode (role access control for mode selection), k_allowed_free_modes (bitmask enabling/disabling specific mode presets), k_auto_xonx (auto-selects 10on10 as high-player-count fallback), 3on3 (team-mode sibling)
```

### Notes

- Existing description is accurate. Recast adds full bundle, prerequisite paths, notes k_auto_xonx auto-selection in Effect (it appeared in the original Set-by line).

---

---


# Match-control commands (start, stop, pause, ready, late-join)

<!-- VERDICT: drafted -->
## forcestart (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:751 (handler: src/admin.c:642)
- **Catalog line**: 9500
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Forces a match to start without waiting for all players to ready up. Broadcasts "forces matchstart!" and sets the server status to "Forcestart".
>
> Refused if: a match is already running or over; server is in practice mode; a forced start is already pending; start preconditions are not met; no players are present.
>
> Set by: admin command 'forcestart'.

### Shape classification

shape-less admin one-shot. Registration: CF_BOTH_ADMIN = "admin only". No cvar pairing, no vote mechanism, no election. Single dispatch action that spawns a `mess` think-entity (`ReadyThink`, 0.1s delay). Sibling `forcebreak` is also CF_BOTH_ADMIN in admin.c.

### Proposed draft

```
Forces a match to start, bypassing the normal ready-up wait.

Effect:
  - If issuing admin is in a player slot and not yet ready, automatically readies them first.
  - Broadcasts "<name> forces matchstart!" to all players.
  - Sets server status to "Forcestart".

Prerequisites:
  - No match currently in progress or over.
  - Server not in practice mode (k_practice must be 0).
  - No forcestart already pending ("forcestart already in progress!").
  - isCanStart() preconditions met.
  - At least one player present.

Permission:    admin only
Match-state:   pre-match only

Example: forcestart

See also: forcebreak (admin cancel of a pending forcestart or live match)
```

### Notes

- No contradictions with source. Existing description was accurate; v2 recast restructures into standard sections.
- Handler is in `src/admin.c:642`, forward-declared at `src/commands.c:34`. Registration row is at commands.c:751.
- k_practice check: line 651 in admin.c. isCanStart() check: line 680.
<!-- END ENTITY -->

---

---

<!-- VERDICT: drafted_with_flag -->
## ready (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:707; handler at match.c:2965 (calls PlayerReady(true))
- **Catalog line**: 10020
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Marks the calling player as ready to start the match; once enough players have readied, the match countdown begins. In race mode it readies you for the next race instead. For an auto-pickup spectator, broadcasts your intent to play and triggers team balancing. Rejected or no-ops when already ready, in practice mode, after the match has ended, in a private game without being logged in, or in CTF/HoonyTDM without being on the red or blue team.
>
> Set by: any player (in-game command).

### Shape classification

shape-less -- direct ready-state setter. Calls PlayerReady(true). No paired cvar, no vote channel, no cvar_toggle_msg. The ready-state mechanism (self->ready = 1) is a direct flag set with match-start trigger logic.

Reasoning: match.c:2965 PlayerFastReady() = PlayerReady(true). match.c:2864: self->ready = 1. match.c:2888-2958: checks isCanStart() + broadcasts countdown initiation. The true argument enables CheckAutoXonX at line 2787 for spectators. shape-less because no inter-entity relationship: no paired cvar partner, no vote channel.

### Proposed draft

```
Marks you as ready to start the match; triggers the countdown when enough players are ready.

Effect:
  Sets your ready state and broadcasts "<player> is ready".
  Once enough players are ready, the match countdown begins automatically.
  In race mode: readies you for the next race instead of normal ready flow.
  Auto-xonx spectator: broadcasts your intent to play and triggers team balancing.

Prerequisites:
  Not already marked ready ("Type break to unready yourself").
  Match must not be in progress, ended, or in intermission.
  Not in practice mode ("Server in practice mode").
  Private game: must be logged in ("You must login first").
  CTF or HoonyTDM: must be on team red or blue ("You must be on team red or blue").
  Team / CTF / CA modes: team name must be set ("Set your team before ready!").
  k_force set in team/CTF: at least one other team member with the same team name must already be ready.

Permission:    any player or spectator (CF_BOTH | CF_MATCHLESS)
Match-state:   pre-match only (refused if match already in progress or ended)

Example:
  ready           # mark yourself ready; countdown starts when all required players ready up

See also: break (clears ready state), slowready (same effect, skips idle-player check), toggleready (ready/break in one command)
```

### Notes

- FLAG: The existing description says "Set by: any player (in-game command)" but the registration is CF_BOTH | CF_MATCHLESS, meaning spectators can also invoke it (for the auto-xonx path). The v2 Permission line is "any player or spectator". The existing "any player" framing is incomplete.
- PlayerReady(true) vs PlayerReady(false): the `true` (startIdlebot) argument enables CheckAutoXonX at match.c:2787 when a spectator invokes ready in auto-xonx mode. PlayerSlowReady passes false, skipping this path. This is the only behavioral difference between ready and slowready; surfaced in the See-also link to slowready.
- The k_force team-join requirement (match.c:2828-2848) is a surprise-bearing prerequisite: in team mode with forced teams, ready is refused unless a team member with the same name is already ready. Surfaced in Prerequisites.

---

---

<!-- VERDICT: drafted -->
## slowready (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:708; handler at match.c:2960 (calls PlayerReady(false))
- **Catalog line**: 10101
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Marks you as ready for the match to start, like the 'ready' command, but skips the idle-player check that 'ready' triggers when not all players are ready yet.
>
> Usable by players and spectators, and outside an active match. Has no effect during a running match, in practice mode, or after the match is over.
>
> Default: n/a (command).
> Set by: any player or spectator in-game.

### Shape classification

shape-less -- direct ready-state setter, variant of ready. Calls PlayerReady(false). No paired cvar, no vote channel, no cvar_toggle_msg. Functionally identical to ready except the startIdlebot bool is false (skips CheckAutoXonX for the spectator auto-xonx path).

### Proposed draft

```
Marks you as ready to start the match, like ready, but skips the idle-player team-balance check.

Effect:
  Sets your ready state and broadcasts "<player> is ready".
  Does NOT trigger the auto-xonx idle-player detection that ready triggers when a spectator joins.
  Once enough players are ready, the match countdown begins automatically.
  In race mode: readies you for the next race.

Prerequisites: (identical to ready)
  Not already marked ready.
  Match must not be in progress, ended, or in intermission.
  Not in practice mode.
  Private game: must be logged in.
  CTF or HoonyTDM: must be on team red or blue.
  Team / CTF / CA modes: team name must be set.

Permission:    any player or spectator (CF_BOTH | CF_MATCHLESS)
Match-state:   pre-match only

Example:
  slowready       # ready up without triggering auto-xonx team rebalancing

See also: ready (same effect with idle-player check enabled), break (clears ready state), toggleready (ready/break in one command)
```

### Notes

- The existing description is accurate and concise. The v2 recast adds the Prerequisites block (aligned with ready's) and tightens the Permission line to the CF_BOTH framing.
- The key distinction from ready: PlayerReady(false) does not call CheckAutoXonX at match.c:2787. The idle-player check is specifically in the spectator auto-xonx path (match.c:2763-2789); it fires only when `startIdlebot` is true.
- The existing description says "Usable by players and spectators" which is correct per CF_BOTH. v2 Permission line confirms.
- No FLAGs: the existing description is accurate. Verdict is drafted (clean).

---

---

<!-- VERDICT: drafted_with_flag -->
## toggleready (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:962; handler at commands.c:7966
- **Catalog line**: 10436
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the caller's ready state for match start: if the player is already ready it cancels ready (breaks), otherwise it readies the player up immediately. In race mode it toggles the player's race ready/break state instead.
>
> Default: n/a (command).
> Set by: any player in-game ('toggleready').

### Shape classification

shape-less -- dispatcher that routes to PlayerBreak() or PlayerFastReady() based on current ready state. Not a Shape 1 cvar+toggle (no cvar_toggle_msg, no paired cvar). Not paired with k_sready -- k_sready is read only in client.c:4266 (an unready-player visual dim-light path), not in ToggleReady. The toggle is over self->ready (a runtime flag, not a cvar).

Reasoning: commands.c:7966-7982. ToggleReady: if isRACE() -> r_changestatus(3); if self->ready -> PlayerBreak(); else -> PlayerFastReady(). No cvar_toggle_msg, no RegisterCvar pair. k_sready confirmed as unrelated (client.c:4266 visual dim path). shape-less correct.

### Proposed draft

```
Toggles your ready state: readies you if not ready, unreadies you if already ready.

Effect:
  Not ready: calls ready (PlayerFastReady -- includes idle-player check).
  Already ready: calls break (PlayerBreak -- clears ready state; in a live match, casts a break vote).
  Race mode: toggles between race-ready and race-break states.

Permission:    any player or spectator (CF_BOTH | CF_MATCHLESS)
Match-state:   pre-match only (follows ready and break's own match-state gates)

Example:
  bind space toggleready    # one key to toggle ready state

See also: ready (explicit ready), break (explicit unready; also vote-to-end in a live match), slowready (ready without idle-player check)
```

### Notes

- The existing description is accurate. The v2 recast is mechanical -- adds the CF_BOTH permission correction and surfaces the live-match edge (toggleready in a live match calls PlayerBreak, which casts a break vote).
- FLAG: The existing description says "any player in-game" but registration is CF_BOTH | CF_MATCHLESS -- spectators can also invoke it (the auto-xonx spectator path in PlayerFastReady and the spec-gate path in PlayerBreak both run). v2 Permission: "any player or spectator".
- The dispatch note that "already ready" calls PlayerBreak() (not a mere flag clear) is important for the live-match case: a player binding toggleready and hitting it mid-match will cast a break vote. Surfaced in Effect.
- k_sready is NOT the paired cvar. Confirmed: ToggleReady does not read or write k_sready. k_sready at client.c:4266 controls whether unready players show a dim-light visual indicator. No Shape 1 relationship.

---

<!-- VERDICT: drafted_with_flag -->
## agree (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:902; handler at commands.c:6742
- **Catalog line**: 9332
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Selects and switches to the most recently voted map without a further vote. No-op if no map vote has occurred. The map change still goes through the normal match-in-progress and related guards before it is applied.
>
> Default: n/a (command).
> Set by: any player in-game ('agree').

### Shape classification

shape-less -- convenience shortcut that calls DoSelectMap with the cached last-voted map index. No own vote channel; no inter-entity cvar relationship. It re-enters the same OV_MAP vote path (Shape 7b) that votemap / cm use. The Shape 7b relationship tag lives on the votemap / cm cards; agree is their satellite leaf with no additional Layer B relationship.

Reasoning: handler body (commands.c:6742-6751) is exactly `if (!k_lastvotedmap) return; DoSelectMap(k_lastvotedmap)`. DoSelectMap at maps.c:392 is the full vote-cast body -- all gating, cooldown, and per-player vote-flag writes happen inside it. k_lastvotedmap is set at maps.c:472 each time DoSelectMap is called. agree is shape-less per the lever/leaf discipline.

### Proposed draft

```
Casts (or withdraws) your vote for the most recently nominated map without retyping the name.

Effect:
  Submits your map vote for the map most recently nominated by any player on this server (the same vote path as votemap / cm).
  If no map has been nominated since the last map reset, does nothing.
  Re-running while your vote is already set for that map withdraws it (normal cast/withdraw cycle).

Permission:    any player (spectators excluded)
Match-state:   pre-match only (same guards as votemap; refused during a live match unless matchless)

Example:
  # After someone nominates dm3 and you want to agree:
  agree           # casts your map vote for dm3

See also: votemap (explicit map-name vote), cm (legacy index vote), k_vp_map (vote threshold), k_no_vote_map (gate cvar)
```

### Notes

- FLAG: The existing description says "switches to the most recently voted map WITHOUT a further vote" -- this framing is incorrect. agree calls DoSelectMap(k_lastvotedmap), which IS the full Shape 7b vote-cast path (OV_MAP). It does not bypass the vote; it casts a vote for the last-voted map index. The "without a further vote" prose must be replaced with the vote-cast framing above.
- The globals.c:64 comment says `// last voted map, used for agree command?` (note the trailing question mark) -- a coder uncertainty annotation, but the source is unambiguous: DoSelectMap is called with it.
- CF_PLAYER | CF_MATCHLESS: CF_PLAYER = any player (spectators excluded); CF_MATCHLESS = command valid in matchless mode. DoSelectMap's internal guards determine acceptance.
- shape-less is correct: agree is a lever / leaf for the OV_MAP vote channel. The Layer B relationship lives on the votemap / cm cards.

---

---

<!-- VERDICT: drafted -->
## break (KTX command, Match flow -- Shape 7b + mode-conditional facets)

- **Status**: drafted
- **Source**: src/commands.c:709; handler at match.c:2970
- **Catalog line**: 9360
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Vote to stop the current match or countdown. During a pre-match countdown, stops the timer immediately. During a live match, casts a vote to end the match; issuing it again withdraws the vote. In matchless mode, votes for the next map instead. A not-yet-ready spectator in auto-xonx mode uses it to retract their ready state. No effect during intermission or after match end.
>
> Set by: any player or eligible spectator.

### Shape classification

Shape 7b vote-cast (OV_BREAK channel) with mode-conditional facets. The live-match branch is canonical Shape 7b: toggles self->v.brk, broadcasts tally, calls vote_check_break() via get_votes_req(OV_BREAK, true). Threshold cvar is phase-dependent (vote.c:245-247): matchless reads k_vp_map; non-matchless reads k_vp_break. Handler also has pre-match, countdown-stop, race-redirect, and spectator-gate branches as mode-conditional facets on the same command.

Reasoning: match.c:2970-3089. Per-player vote flag v.brk at lines 3066-3076; vote_check_break() call at 3088. OV_BREAK threshold phase-switch at vote.c:245-247. Classic Shape 7b. Additional branches are mode-conditional facets, not separate shapes. Per mechanism map verified.

### Proposed draft

```
Casts (or withdraws) your vote to end the current match, or clears your ready state before the match starts.

Effect (varies by match phase):
  Pre-match (waiting for start): clears your ready state and broadcasts "is not ready".
  Countdown phase: stops the countdown timer immediately (takes effect at once; not a vote).
  Live match: casts your vote to end the match. Re-running withdraws the vote (normal cast/withdraw cycle, NOT a subsequent-invocation toggle in the abort-election sense).
  Matchless mode (live): votes for advancing to the next map instead of ending the match.
  Race mode (non-match): transitions you to race break state.
  Auto-xonx spectator (pre-match, non-matchless): clears your desire-to-play state.

Prerequisites:
  Live match (non-CA): your ready flag must be set to cast a break vote.
  Live match in Clan Arena: you must be active in the current round (not watching from sideline).
  Matchless mode: k_no_vote_map must be 0 (otherwise refused with "Voting next map is not allowed").

Permission:    any player or spectator (CF_BOTH); spectators gated at handler level -- requires k_auto_xonx set and non-matchless mode
Match-state:   any time (handler branches by match phase)

Example:
  break           # during a live match: cast vote to end early
  break           # again: withdraw the vote

See also: next_map (matchless-only sibling, same handler + OV_BREAK channel), forcebreak (admin one-shot override), k_vp_break (vote threshold in standard mode), k_vp_map (vote threshold in matchless mode)
```

### Notes

- The existing description is substantially accurate. The v2 recast adds Permission precision (CF_BOTH with handler-level spectator gate) and restructures by match phase.
- Per mechanism map: OV_BREAK threshold is phase-dependent (vote.c:245-247). k_vp_break governs non-matchless; k_vp_map governs matchless. Both drafted in Voting batch.
- Bloodfest edge case (match.c:3038-3058): in bloodfest mid-round, the countdown cannot be stopped (treated as a standard break request instead). Not surfaced in L1 per MVI discipline.
- CA branch (match.c:3011-3016): "You must be in the game to vote" -- surfaced in Prerequisites.
- The cast/withdraw behavior on re-run is the natural Shape 7b cycle, NOT a "subsequent-invocation toggle" in the elect-aborts sense (per shape-catalog.md Shape 7b discipline).

---

---

<!-- VERDICT: drafted -->
## forcebreak (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:752; handler at admin.c:708
- **Catalog line**: 9473
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command that forcibly ends or resets match state. During a live match: broadcasts "<player> forces a break!" and ends the match normally (any admin, including a playing admin). During a warmup countdown: cancels the countdown timer (non-playing admin only). Before the match begins with a forced start queued: clears the standby state (non-playing admin only). Runnable by any admin (rcon-assigned or elected via /elect), whether playing or spectating; the playing-admin restriction applies only to the pre-match branches.
>
> Set by: admin command 'forcebreak' in-game.

### Shape classification

shape-less -- admin one-shot end-match command. Does NOT toggle self->v.brk, does NOT feed OV_BREAK. The admin override path is architecturally separate from break's vote channel (OV_BREAK has no is_admins_vote() arm). No paired cvar, no vote channel, no inter-entity relationship beyond family siblings.

Reasoning: admin.c:708-740. No cvar_toggle_msg, no per-player vote flag, no get_votes_req() call. Calls EndMatch(0) directly in the live-match branch. Per mechanism map verified. shape-less is correct per the standalone/lever discipline.

### Proposed draft

```
Immediately ends the match or resets match state as an admin override -- no vote required.

Effect (varies by match phase and admin type):
  Live match (any admin, playing or spectating): restores sv_maxspeed if it was throttled, broadcasts "<player> forces a break!", and calls EndMatch immediately.
  Countdown phase (non-playing admin only): stops the countdown timer without a broadcast.
  Pre-match with forced-start queued (non-playing admin only): clears the forced-start flag and sets server status to Standby.
  No match in progress or non-admin invoker: silent no-op.

Permission:    admin only (CF_BOTH_ADMIN -- any admin whether playing or spectating)
Match-state:   any time (handler branches by match phase and admin type)

Example:
  forcebreak      # end the current match immediately as admin

See also: break (vote-cast peer -- requires threshold), forcemap (sibling admin one-shot for map change), forcestart (sibling admin one-shot for match start)
```

### Notes

- The existing description is accurate. The v2 recast restructures into the universal shape.
- CF_BOTH_ADMIN = admin only (any slot). "admin only" is the canonical permission line.
- The "playing-admin restriction on pre-match branches" described in the existing description is source-confirmed: admin.c:710 checks `self->ct != ctPlayer` for the pre-match branch; admin.c:724 checks `self->ct != ctPlayer` for the countdown branch. The live-match branch at admin.c:732-739 has no player/spec check.
- shape-less: no cvar pairing, no vote channel. The command IS the override mechanism.

---

---

<!-- VERDICT: drafted_with_flag -->
## ra_break (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:969; handler at arena.c:811
- **Catalog line**: 9993
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Rocket Arena command: toggle your position in the arena waiting queue. If you are in the queue, removes you and grants a 5-minute break (idle timeout extended). Running it again re-enters you into the queue. Only works in Rocket Arena mode; ignored if you are the current round's winner or a loser awaiting your turn.
>
> Set by: player command (Rocket Arena mode only).

### Shape classification

shape-less -- RA-specific queue-toggle command. Not a vote-cast (no OV_* channel), not a Shape 1 cvar toggle (no cvar_toggle_msg). The toggle is over the player's own queue-state flag. No inter-entity cvar relationship.

Reasoning: arena.c:811-832. Handler calls ra_isin_que(self) to check state, then either ra_out_que() (leave queue + set idle timeout extension) or ra_in_que() (rejoin queue + clear idle timeout). No cvar write, no vote flag. Pure RA queue management. shape-less correct.

### Proposed draft

```
Toggles your position in the Rocket Arena waiting queue.

Effect:
  In queue: removes you from the queue and grants a 5-minute idle extension ("You can have up to a 5 minute break").
  Not in queue: re-enters you into the queue and clears the idle extension.

Prerequisites:
  Rocket Arena mode must be active; no-op in all other modes.
  You must not be the current round's winner or a loser awaiting your turn.

Permission:    any player (spectators excluded)
Match-state:   any time (within a running RA session)

Example:
  ra_break        # step out of the queue for a break
  ra_break        # re-enter the queue when ready

See also: race_break (unrelated race-mode status command with a similar name)
```

### Notes

- FLAG: The existing description says "Only works in Rocket Arena mode; ignored if you are the current round's winner or a loser awaiting your turn." Source at arena.c:813: `if (!isRA() || isWinner(self) || isLoser(self)) return;` -- three conditions produce a silent return with no message. The description correctly says "ignored" but frames it as two separate conditions. The v2 draft consolidates into Prerequisites.
- CF_PLAYER = "any player (spectators excluded)". Existing "Set by: player command" is consistent.
- The idle-timeout extension is set to MAXIDLETIME (arena.c:824: `self->idletime = g_globalvars.time + MAXIDLETIME`). The "5 minutes" in the description matches the in-game message string at arena.c:820: "You can have up to a 5 minute break". Verified accurate.
- The "loser awaiting your turn" phrase in the existing description: isLoser() at arena.c:813 refers to a player who lost the round and is waiting to re-enter the queue -- a RA-specific state. Kept in v2 Prerequisites as-is since it accurately describes the condition.

---

---

<!-- VERDICT: drafted_with_flag -->
## pause (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1002 (registration); src/commands.c:8726 (TogglePause handler)
- **Catalog line**: 9729
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the game's pause state, applying the change after a 3-second countdown in either direction. If a pause or unpause is already pending, repeated calls report the pending state instead of stacking.
>
> Pause is refused when:
> - 3 or fewer seconds remain in the match.
> - pausing is not permitted (the pausable cvar is off) AND the caller is not an admin AND the player has no pause requests remaining.
>
> Only active during a running match (outside matchless mode).
>
> Set by: admin command, or any player if pausable is enabled and pause requests remain.

### Shape classification

shape-less -- standalone command acting on engine pause state. No k_* cvar+toggle pair; `sv_paused` is an engine cvar, not a KTX-registered entity. `k_pause_without_matchtag` is a Shape 4 gate for non-admin players, but pause itself is the gated command side. No vote mechanism.

### Proposed draft

```
Pauses or unpauses the running match after a 3-second countdown.

Effect:
  - If the game is live: schedules a pause in 3 seconds; broadcasts the
    countdown to all players; then freezes the game clock.
  - If the game is already paused: schedules an unpause in 3 seconds;
    broadcasts the countdown; then resumes.
  - Re-running while a pause or unpause is already counting down reports
    the pending state instead of stacking another request.

Prerequisites:
  - Refused if 3 or fewer seconds remain on the match clock.
  - Non-admin players may only pause if the server's `pausable` cvar is
    enabled OR `k_pause_without_matchtag` is set AND the player has pause
    requests remaining (up to 3 per match, reset at match start).

Permission:    any player or admin spectator
Match-state:   mid-match only (and matchless mode when k_matchLess is set)

Example:
  pause         (pauses; 3-second countdown broadcast to all)
  pause         (while paused: schedules unpause in 3 seconds)

See also: k_pause_without_matchtag (enables non-admin pause requests
without a matchtag serverinfo key)
```

### Notes

- FLAG: Existing description says "Only active during a running match (outside matchless mode)" -- this is inverted. Source at commands.c:8731-8738: `if (!k_matchLess) { if (match_in_progress != 2) { return; } }`. The early-return fires ONLY in non-matchless mode; in matchless mode the restriction is bypassed. The registration also carries `CF_MATCHLESS`. Corrected in proposed draft.
- FLAG: Existing description frames this as an "admin command." Registration is `CF_PLAYER | CF_MATCHLESS | CF_SPC_ADMIN` -- any player or admin spectator. Admins bypass the `pausable`/pause-request gate, but the command is available to any player. Corrected in proposed draft.
- MAX_PAUSE_REQUESTS = 3 (g_local.h:831); initialized per player at match start (match.c:1085). Non-admin pause budget only activates when `k_pause_without_matchtag` is set OR the `matchtag` serverinfo key is present (client.c:5799).

---

---

<!-- VERDICT: drafted -->
## latejoin (KTX command, Match flow -- Shape 7a election)

- **Status**: drafted
- **Source**: src/commands.c:838 (handler at line 5335)
- **Catalog line**: 9585
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Lets a teamless player request to join a team mid-match. Only works during a live Clan Arena or Wipeout game; the player must not already be on a team.
>
> Usage: latejoin <team> (team must be one of the two active team names).
>
> The request starts a 30-second election that the chosen team approves by typing /yes. Rejected if an election is already running, the player is in the election cooldown, or the chosen team already has more players. Issuing latejoin again while your own request is pending aborts it.
>
> Set by: any player (in-game command, CA/Wipeout only).

### Shape classification

Shape 7a election. Handler (commands.c:5335) sets `self->v.elect = 1` + `self->v.elect_type = etLateJoin` (progs.h:224), spawns an `electguard` think-entity with `ElectThink` and 30-second timeout (`g_globalvars.time + 30`). The universal `yes` command routes through the election-type dispatcher for etLateJoin (vote.c:109). Re-running while election pending calls `AbortElect()` via `is_elected(self, etLateJoin)` check (line 5357) -- subsequent-invocation toggle.

Registration: CF_PLAYER | CF_PARAMS | CF_SPC_ADMIN. CF_PARAMS (bit 5) = command takes parameters.

Specialization from standard Shape 7a: approval is targeted to the chosen team's members (not a server-wide vote); the isCA() check gates on mid-match (requires match_in_progress, opposite of most Shape 7a elections).

### Proposed draft

```
Requests to join a team mid-match, starting a 30-second team-approval election.

Effect:
  - Broadcasts "<name> has requested to late-join team <team>" to all players.
  - Broadcasts "Team <team> members: type yes to approve" to all players.
  - Team members cast approval via the 'yes' command.
  - If the team reaches the threshold within 30 seconds, you join that team.
  - Re-running latejoin while your own request is still pending aborts it.

Prerequisites:
  - Match must be in progress (CA or Wipeout only -- "Late-join requests are only allowed during CA or Wipeout").
  - You must not already be on a team ("You're already on a team").
  - No other election currently running ("An election is already in progress").
  - Not in post-rejection cooldown ("Wait N seconds!").
  - Chosen team must not have more players than the other team.
  - Team name must match one of the two active teams (_k_team1 / _k_team2).

Permission:    any player or admin spectator
Match-state:   mid-match only (CA or Wipeout)

Example:
  latejoin Red
  (Team "Red" members type: yes)

See also: yes (approval vote), elect (admin election -- different election type, pre-match)
```

### Notes

- No contradictions with source. Existing description was accurate and thorough; v2 recast restructures into standard sections.
- isCA() check covers both CA and Wipeout (source line 5347).
- Election timeout: 30 seconds (line 5423), shorter than the typical 60-second window for elect/captain/coach elections.
- Subsequent-invocation toggle source-verified: line 5357-5360.
- _k_team1/_k_team2 read via cvar_string() at lines 5378, 5385-5386.
<!-- END ENTITY -->

---

---


# Election commands

<!-- VERDICT: drafted -->
## captain (KTX command, Match flow -- Shape 7a election)

- **Status**: drafted
- **Source**: src/commands.c:803; handler at captain.c:218
- **Catalog line**: 9387
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Player command to request, abort, or relinquish captain status. A first use starts a captain election; other players cast approval with the 'yes' command (60-second timeout). A second use while the election is pending aborts it; using it while already a captain steps down.
>
> Refused during a live match or intermission, in non-team or non-CTF modes, with fewer than 3 players, when 2 captains already exist, while another election is in progress, before setting a team name, or (in CTF) unless on team red or blue.
>
> Set by: any player in-game.

### Shape classification

Shape 7a election. Handler (captain.c:218) sets self->v.elect = 1 and self->v.elect_type = etCaptain at line 336, spawns an electguard think-entity with 60-second timeout at lines 353-357. Universal yes command routes through OV_ELECT election-type dispatcher. vote.c:278 reads k_vp_captain as the threshold percentage. Multiple prerequisite gates (mode, player count, captain count, team name, CTF color check).

Two subsequent-invocation behaviors confirmed in source: (1) is_elected(self, etCaptain) -> AbortElect() path (captain.c:224-231); (2) capt_num(self) != 0 -> ExitCaptain() path (captain.c:233-240).

### Proposed draft

```
Starts a captain election, or steps down / aborts your pending election.

Effect:
  First use (no pending election, not yet a captain): broadcasts "<player> has requested captain status!" and opens a 60-second election window; other players type yes to approve.
  Re-running while your election is pending: aborts the election (subsequent-invocation -- different outcome from a first use).
  Running while already a captain: steps down from captain role immediately.

Prerequisites:
  Team or CTF mode must be active ("No team picking in non team mode").
  At least 3 players must be present ("Not enough players present").
  Fewer than 2 captains already exist (server limit is 2).
  No other election currently in progress ("An election is already in progress").
  Your team name must be set ("Set your team name first").
  In CTF: must be on team red or blue ("Must be team red or blue for ctf").
  In CTF: no existing captain with the same team name or same player color.
  Election cooldown: a per-player block timer applies for 30 seconds after a prior election expires.

Permission:    any player (spectators excluded)
Match-state:   pre-match only (refused during a live match or intermission)

Example:
  captain         # request captain status; opens 60-second election
  captain         # while election is pending: aborts it

See also: k_vp_captain (election threshold), yes (approval command), no (rejection command), coach (parallel role for spectators)
```

### Notes

- The existing description is accurate. The v2 recast reorganizes into Effect / Prerequisites and surfaces the two subsequent-invocation behaviors as explicit Effect bullets.
- Permission is CF_PLAYER (plain): "any player (spectators excluded)". Existing "any player in-game" is consistent; v2 uses the canonical phrasing.
- k_vp_captain is in the Voting batch (cross-batch threaded). Value enum lives on that cvar card, not here.
- Election cooldown: captain.c:276 checks self->v.elect_block_till. vote.c:62 sets it to 30 seconds after an election expires. Not listed in the existing description; surfaced in Prerequisites as a surprise-bearing gate.
- CTF color check: captain.c:322-331. Not listed in the existing description; surfaced in Prerequisites.

---

---

<!-- VERDICT: drafted_with_flag -->
## coach (KTX command, Match flow -- Shape 7a election)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:804; handler at coach.c:85
- **Catalog line**: 9416
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command to request, abort, or relinquish coach status. A first use starts a coach election; players cast approval with the 'yes' command (60-second timeout). A second use while the election is pending aborts it; using it while already a coach steps down.
>
> Refused during a live match or intermission, in non-team or non-CTF modes, with fewer than 3 players, when 2 coaches already exist, while another election is in progress, before setting a team name, or when a coach with the same team name already exists.
>
> Set by: spectators only (in-game command).

### Shape classification

Shape 7a election. Handler (coach.c:85) sets self->v.elect = 1 and self->v.elect_type = etCoach at line 178, spawns electguard with 60-second timeout at lines 195-199. vote.c:283 reads k_vp_coach as threshold. Parallel structure to captain but gated to spectators via CF_SPECTATOR.

Two subsequent-invocation behaviors: (1) is_elected(self, etCoach) -> AbortElect() path (coach.c:91-97); (2) coach_num(self) != 0 -> ExitCoach() path (coach.c:100-107).

### Proposed draft

```
Starts a coach election, or steps down / aborts your pending election.

Effect:
  First use (no pending election, not yet a coach): broadcasts "<player> has requested coach status!" and opens a 60-second election window; players type yes to approve.
  Re-running while your election is pending: aborts the election (subsequent-invocation -- different outcome from a first use).
  Running while already a coach: steps down from coach role immediately.

Prerequisites:
  Team or CTF mode must be active ("No team picking in non team mode").
  At least 3 players must be present ("Not enough players present").
  Fewer than 2 coaches already exist (server limit is 2).
  No other election currently in progress ("An election is already in progress").
  Your team name must be set ("Set your team name first").
  No existing coach with the same team name ("A coach with team X already exists").
  Election cooldown: a per-player block timer applies for 30 seconds after a prior election expires.

Permission:    any spectator (players excluded)
Match-state:   pre-match only (refused during a live match or intermission)

Example:
  coach           # request coach status as spectator; opens 60-second election
  coach           # while election is pending: aborts it

See also: k_vp_coach (election threshold), yes (approval command), no (rejection command), captain (parallel role for players)
```

### Notes

- FLAG: The existing description does not list the election cooldown (self->v.elect_block_till at coach.c:143) as a refusal condition. This is a surprise-bearing prerequisite (30-second block after a prior election expires). Surfaced in Prerequisites above.
- CF_SPECTATOR = "any spectator (players excluded)". Existing "spectators only" is confirmed correct by source.
- k_vp_coach is in the Voting batch (cross-batch threaded). Value enum lives on that cvar card.
- No CTF color check in coach (unlike captain): coach.c has no color-match check; only the team-name duplicate check at lines 161-173.
- The existing description lists all refusal conditions correctly except the cooldown. verdict is drafted_with_flag for the missing cooldown prerequisite.

---

---


# Match-time control (canonical + reference + adjusters)

<!-- VERDICT: drafted_with_flag -->

## time10 (KTX command, Match flow -- shape-less, canonical card for time5/10/15/20/25/30 family)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:764
- **Catalog line**: 10131
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the match timelimit to 10 minutes. Clamped by k_timetop, so it takes effect only if k_timetop is at least 10. Ignored during a live match. Announces the new length to all players, or reports no change if it was already 10.
>
> Set by: admin command 'time10' in-game (not during a live match).

### Shape classification

Shape-less (canonical card for the 6-sibling timelimit-setter family). All 6 commands register via `DEF(TimeSet)` at commands.c:763-768 with float constants 5.0f/10.0f/15.0f/20.0f/25.0f/30.0f. The DEF macro passes each float as `t` to the shared `TimeSet` handler at commands.c:3017. Behavior is identical across all 6 except the target value. No sibling has a unique gate, mode-precondition, or side effect. CANONICAL-CARD STRAIGHTFORWARD. `time10` selected as canonical (typical duel default). Other 5 are reference cards.

No Layer B shape: no paired k_* cvar, no vote channel, no gating cvar. Standalone setter (writes `timelimit` via `cvar_fset` at commands.c:3035, broadcasts to all).

### Proposed draft

```
Sets the match timelimit to 10 minutes.

Effect:
  Writes timelimit to 10. Broadcasts the new match length to all players.
  If timelimit is already 10, reports "timelimit still 10" to you only.
  Clamped by k_timetop: if k_timetop is below 10, the command sets
  timelimit to k_timetop instead (which will be less than 10).
  k_timetop auto-defaults to 30 when unset, so time10 works on any
  freshly configured server.

Permission:    any player or admin spectator
Match-state:   pre-match only (silently returns while match is in progress)

Example:
  time10    (set timelimit to 10 minutes; all players see the broadcast)
  time5     (set to 5 minutes)
  time20    (set to 20 minutes)

See also: k_timetop (maximum timelimit cap; clamps all timeN commands),
time5 (sets 5), time15 (sets 15), time20 (sets 20), time25 (sets 25),
time30 (sets 30)
```

### Notes

- FLAG: existing-description says "Set by: admin command" and implies admin-only access. Registration at commands.c:764 is `CF_PLAYER | CF_SPC_ADMIN` = any player or admin spectator (NOT admin-only). Apply-pass-author must correct the permission framing on this card and all 5 reference cards. Any in-game player can run time10, not only admins.
- k_timetop RegisterCvar at world.c:934 has no explicit default (empty string = 0). Code at world.c:1696 auto-sets it to 30 if <= 0 at map start.
- TimeSet handler at commands.c:3017: `timelimit = bound(0, t, cvar("k_timetop"))`. If k_timetop is 5, `time10` silently sets timelimit to 5. The existing description's "has no effect if k_timetop is below 10" is slightly wrong: it DOES take effect but sets to k_timetop, not to 10. Draft corrects this.

---

---

<!-- VERDICT: drafted -->

## time5 (KTX command, Match flow -- shape-less, reference card)

- **Status**: drafted
- **Source**: src/commands.c:763
- **Catalog line**: 10266
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the match timelimit to 5 minutes (clamped to k_timetop; has no effect if k_timetop is below 5). Ignored while a match is in progress. Broadcasts the new match length to all players; reports unchanged if the value did not change.
>
> Default: n/a (command, not a cvar).
> Set by: admin command 'time5' in-game or server console.

### Shape classification

Shape-less (reference card for `time10` canonical). Sets timelimit to 5 instead of 10.

### Proposed draft

```
Sets the match timelimit to 5 minutes. See `time10` for full behavior
including the k_timetop clamp and broadcast semantics.
This command differs only in the timelimit value (5 instead of 10).

Permission:    any player or admin spectator
Match-state:   pre-match only

See also: time10 (canonical card for this family), k_timetop (maximum
timelimit cap)
```

### Notes

- Reference card; canonical is `time10`.
- Registration: `{ "time5", DEF(TimeSet), 5.0f, CF_PLAYER | CF_SPC_ADMIN, CD_TIME5 }` at commands.c:763.
- Permission corrected to "any player or admin spectator" (same CF_PLAYER | CF_SPC_ADMIN flag as all siblings).

---

---

<!-- VERDICT: drafted -->

## time15 (KTX command, Match flow -- shape-less, reference card)

- **Status**: drafted
- **Source**: src/commands.c:765
- **Catalog line**: 10158
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the match timelimit to 15 minutes. Clamped by k_timetop, so it takes effect only if k_timetop is at least 15. Ignored during a live match. Announces the new length to all players, or reports no change if it was already 15.
>
> Set by: admin command 'time15' in-game (not during a live match).

### Shape classification

Shape-less (reference card for `time10` canonical). Sets timelimit to 15 instead of 10.

### Proposed draft

```
Sets the match timelimit to 15 minutes. See `time10` for full behavior
including the k_timetop clamp and broadcast semantics.
This command differs only in the timelimit value (15 instead of 10).

Permission:    any player or admin spectator
Match-state:   pre-match only

See also: time10 (canonical card for this family), k_timetop (maximum
timelimit cap)
```

### Notes

- Reference card; canonical is `time10`.
- Registration: `{ "time15", DEF(TimeSet), 15.0f, CF_PLAYER | CF_SPC_ADMIN, CD_TIME15 }` at commands.c:765.

---

---

<!-- VERDICT: drafted -->

## time20 (KTX command, Match flow -- shape-less, reference card)

- **Status**: drafted
- **Source**: src/commands.c:766
- **Catalog line**: 10185
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the match timelimit to 20 minutes. Clamped by k_timetop, so it takes effect only if k_timetop is at least 20. Ignored during a live match. Announces the new length to all players, or reports no change if it was already 20.
>
> Set by: admin command 'time20' in-game (not during a live match).

### Shape classification

Shape-less (reference card for `time10` canonical). Sets timelimit to 20 instead of 10.

### Proposed draft

```
Sets the match timelimit to 20 minutes. See `time10` for full behavior
including the k_timetop clamp and broadcast semantics.
This command differs only in the timelimit value (20 instead of 10).

Permission:    any player or admin spectator
Match-state:   pre-match only

See also: time10 (canonical card for this family), k_timetop (maximum
timelimit cap)
```

### Notes

- Reference card; canonical is `time10`.
- Registration: `{ "time20", DEF(TimeSet), 20.0f, CF_PLAYER | CF_SPC_ADMIN, CD_TIME20 }` at commands.c:766.

---

---

<!-- VERDICT: drafted -->

## time25 (KTX command, Match flow -- shape-less, reference card)

- **Status**: drafted
- **Source**: src/commands.c:767
- **Catalog line**: 10212
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the match timelimit to 25 minutes. Clamped by k_timetop, so it takes effect only if k_timetop is at least 25. Ignored during a live match. Announces the new length to all players, or reports no change if it was already 25.
>
> Set by: admin command 'time25' in-game (not during a live match).

### Shape classification

Shape-less (reference card for `time10` canonical). Sets timelimit to 25 instead of 10.

### Proposed draft

```
Sets the match timelimit to 25 minutes. See `time10` for full behavior
including the k_timetop clamp and broadcast semantics.
This command differs only in the timelimit value (25 instead of 10).

Permission:    any player or admin spectator
Match-state:   pre-match only

See also: time10 (canonical card for this family), k_timetop (maximum
timelimit cap)
```

### Notes

- Reference card; canonical is `time10`.
- Registration: `{ "time25", DEF(TimeSet), 25.0f, CF_PLAYER | CF_SPC_ADMIN, CD_TIME25 }` at commands.c:767.

---

---

<!-- VERDICT: drafted -->

## time30 (KTX command, Match flow -- shape-less, reference card)

- **Status**: drafted
- **Source**: src/commands.c:768
- **Catalog line**: 10239
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the match timelimit to 30 minutes. Clamped by k_timetop, so it takes effect only if k_timetop is at least 30. Ignored during a live match. Announces the new length to all players, or reports no change if it was already 30.
>
> Set by: admin command 'time30' in-game (not during a live match).

### Shape classification

Shape-less (reference card for `time10` canonical). Sets timelimit to 30 instead of 10. Note: 30 is also k_timetop's auto-default when unconfigured; time30 is the practical ceiling command on freshly configured servers.

### Proposed draft

```
Sets the match timelimit to 30 minutes. See `time10` for full behavior
including the k_timetop clamp and broadcast semantics.
This command differs only in the timelimit value (30 instead of 10).
Note: 30 is k_timetop's auto-default when unconfigured, so this command
is also the effective ceiling on servers that have not set k_timetop
explicitly.

Permission:    any player or admin spectator
Match-state:   pre-match only

See also: time10 (canonical card for this family), k_timetop (maximum
timelimit cap; auto-defaults to 30 when unset)
```

### Notes

- Reference card; canonical is `time10`.
- Registration: `{ "time30", DEF(TimeSet), 30.0f, CF_PLAYER | CF_SPC_ADMIN, CD_TIME30 }` at commands.c:768.
- k_timetop auto-defaults to 30 at map start when unset (world.c:1696); time30 will report "still 30" on freshly initialized servers where timelimit has already been auto-clamped to k_timetop=30.

---

---

<!-- VERDICT: drafted_with_flag -->
## timedown1 (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:731
- **Catalog line**: 10322
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Decreases the match time limit by 1 minute and announces the new value to all players. The result is clamped between 0 and k_timetop. If lowering the time limit would leave both timelimit and fraglimit at 0 simultaneously, the change is refused. Has no effect while a match is in progress.
>
> Default: n/a (command).
> Set by: admin command 'timedown1' (match-gated).

### Shape classification

shape-less. Sibling of `timedown` / `timeup` / `timeup1` -- same `TimeDown` handler called with `t=1.0` instead of `t=5.0`. No catalog shape captures parameterized step-adjustment command families. shape-less with sibling cross-links is correct.

### Proposed draft

```
Decreases the pre-match time limit by exactly 1 minute and broadcasts the new value to all players.

Effect:
  Subtracts 1 from timelimit. No stepped rounding; always a flat 1-minute decrement.
  Result is clamped to 0..k_timetop. If the change would leave both timelimit and
  fraglimit at 0, the change is refused and timelimit is restored. If already at
  the floor, prints the current value without changing it.

Match-state:   pre-match only (no effect while a match is in progress).
Permission:    any player or admin spectator

Example:
  timedown1     ; subtract exactly 1 minute

See also: timedown (subtract 5 mins, stepped at low values), timeup1 (add 1 min), timeup (add 5 mins), k_timetop (upper clamp on timelimit)
```

### Notes

- FLAG: Same permission-line correction as `timedown`: existing description says "admin command" but source registration is `CF_PLAYER | CF_SPC_ADMIN` (commands.c:731) = "any player or admin spectator", not admin-only.
- Unlike `timedown`, `timedown1` always subtracts exactly 1 -- no HoonyMode modulation (the `isHoonyModeAny()` branch in `TimeDown` only fires when `t == 5`).
- The existing description is accurate on behavior; the only v2 changes are permission wording and structural recast.

---

---

<!-- VERDICT: drafted_with_flag -->
## timedown (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:733
- **Catalog line**: 10294
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Decreases the match time limit (in minutes) and announces the new value. Normally subtracts 5 minutes; steps 5->3->1 when already at 5 or 3; subtracts 2 instead of 5 in HoonyMode. Result is clamped to 0..k_timetop. Refused if both timelimit and fraglimit would reach 0, or while a match is in progress.
>
> Default: n/a (command).
> Set by: admin command 'timedown'.

### Shape classification

shape-less. `timedown` is a standalone match-time adjustment command. It reads and writes the engine `timelimit` cvar directly via `cvar_set`; there is no paired toggle cvar (Shape 1), no cycle (Shape 2), no gate cvar (Shape 4), no vote (Shape 7). Its four siblings (`timedown1`, `timeup`, `timeup1`) share the same handler with different step sizes; the `timedown`/`timeup` and `*1` pairs are leaf siblings in the `options` Shape 10 family. No catalog shape captures a family of parameterized step-adjustment commands -- shape-less with sibling cross-links is correct.

### Proposed draft

```
Decreases the pre-match time limit by 5 minutes and broadcasts the new value to all players.

Effect:
  Subtracts 5 from timelimit with stepped rounding at low values: 5 -> 3 -> 1 (not
  5 -> 0). In HoonyMode, subtracts 2 instead of 5. Result is clamped to 0..k_timetop.
  If the change would leave both timelimit and fraglimit at 0, the change is refused
  ("You need some timelimit or fraglimit at least") and timelimit is restored.
  If already at the floor (or clamped), prints the current value without changing it.

Match-state:   pre-match only (no effect while a match is in progress).
Permission:    any player or admin spectator

Example:
  timedown      ; subtract 5 minutes (or step 5->3 or 3->1 at low values)
  timedown1     ; subtract 1 minute (precise step, no rounding)

See also: timeup (add 5 mins, same ramp logic), timedown1 (subtract 1 min), timeup1 (add 1 min), k_timetop (upper clamp on timelimit), options (match-options roster)
```

### Notes

- FLAG: The existing description says "Set by: admin command 'timedown'" implying admin-only. Source registration is `CF_PLAYER | CF_SPC_ADMIN` (commands.c:733) which maps to "any player or admin spectator" -- not admin-only. Draft uses corrected permission wording.
- The existing description covers all behavioral detail accurately (HoonyMode step change, refusal condition, clamp). The v2 recast preserves all of this and adds the stepped-rounding behavior for low values (0->1->3->5 described in TimeUp; the corresponding down ramp is 5->3->1 from source).
- The 4-command family (timedown / timedown1 / timeup / timeup1) uses two shared handlers (TimeDown / TimeUp) parameterized by `t` (1.0 or 5.0 via DEF macro). These are confirmed siblings.
- All four are leaves in the `options` Shape 10 help-printer family.

---

---

<!-- VERDICT: drafted_with_flag -->
## timeup1 (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:732
- **Catalog line**: 10379
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Increases the match time limit by 1 minute and announces the new length to all players. The result is clamped to 0-k_timetop. Ignored while a match is in progress.
>
> Default: n/a (command).
> Set by: admin command 'timeup1' in-game (not during a live match).

### Shape classification

shape-less. Mirror sibling of `timedown1` -- `TimeUp` handler called with `t=1.0`. No catalog shape for parameterized step-adjustment families. shape-less is correct.

### Proposed draft

```
Increases the pre-match time limit by exactly 1 minute and broadcasts the new value to all players.

Effect:
  Adds 1 to timelimit. No stepped rounding; always a flat 1-minute increment.
  Result is clamped to k_timetop. If already at the ceiling, prints the current
  value without changing it.

Match-state:   pre-match only (no effect while a match is in progress).
Permission:    any player or admin spectator

Example:
  timeup1       ; add exactly 1 minute

See also: timeup (add 5 mins, stepped at low values), timedown1 (subtract 1 min), timedown (subtract 5 mins), k_timetop (upper clamp on timelimit)
```

### Notes

- FLAG: Existing description says "Set by: admin command 'timeup1'" implying admin-only. Source registration is `CF_PLAYER | CF_SPC_ADMIN` (commands.c:732) = "any player or admin spectator", not admin-only. Draft corrects permission wording.
- `timeup1` uses `TimeUp(t=1.0)`: the low-value ramp (0->1->3->5) only fires when `t == 5`; with t=1 the handler falls through to the plain `timelimit += t` branch. So `timeup1` always adds exactly 1 with no ramp.

---

---

<!-- VERDICT: drafted_with_flag -->
## timeup (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:734
- **Catalog line**: 10350
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Increases the match time limit (timelimit, in minutes) and announces the new value to all players. Ignored while a match is in progress.
>
> Normally adds 5 minutes. Low-value ramp: steps 0 -> 1 -> 3 -> 5 when the current limit is 0, 1, or 3. Result is clamped to k_timetop.
>
> Set by: admin command 'timeup'.

### Shape classification

shape-less. Mirror sibling of `timedown` -- same `TimeUp` handler called with `t=5.0`. No catalog shape for parameterized step-adjustment families. shape-less with sibling cross-links is correct.

### Proposed draft

```
Increases the pre-match time limit by 5 minutes and broadcasts the new value to all players.

Effect:
  Adds 5 to timelimit with stepped rounding at low values: 0 -> 1 -> 3 -> 5 (not
  0 -> 5). Result is clamped to k_timetop. If already at the ceiling (or clamped
  by k_timetop), prints the current value without changing it.

Match-state:   pre-match only (no effect while a match is in progress).
Permission:    any player or admin spectator

Example:
  timeup        ; add 5 minutes (or step 0->1, 1->3, or 3->5 at low values)
  timeup1       ; add 1 minute (precise step, no rounding)

See also: timedown (subtract 5 mins, same ramp logic), timeup1 (add 1 min), timedown1 (subtract 1 min), k_timetop (upper clamp on timelimit), options (match-options roster)
```

### Notes

- FLAG: Existing description says "Set by: admin command 'timeup'" implying admin-only. Source registration is `CF_PLAYER | CF_SPC_ADMIN` (commands.c:734) = "any player or admin spectator", not admin-only. Draft corrects permission wording.
- Unlike `timedown`, `TimeUp` has no HoonyMode branch; in HoonyMode the step-down is 2 instead of 5, but the step-up is always 5 (with the low-value ramp). Verified at commands.c:2977-3015.
- The existing description does not mention the "no effect when clamped" path (prints current value). Added to draft for completeness.

---

---


# Match-setting state/help commands

<!-- VERDICT: drafted_with_flag -->
## options (KTX command, Match flow -- Shape 10)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:706 (handler at line 1553)
- **Catalog line**: 9643
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints a quick-reference list of available match-control commands to the caller's console, each with a one-line description. Covers: match time (+/-1, +/-5 min), frag limit (+/-10), deathmatch/teamplay mode, drop settings (quad/ring/packs on death), lock mode, spawntype, speed limit, powerups, fair packs, discharge, spectator talk, midair, grenade mode, instagib, berzerk. Does not change any server state.
>
> Set by: any player.

### Shape classification

Shape 10 curated-family help-printer. Handler `ShowOpts` (line 1553) is a single `G_sprint` call with 22 hardcoded sibling names and one-line descriptions. No args, no state write, no dispatch. All listed siblings are independent top-level commands in the command table.

Registration: CF_PLAYER alone = "any player (spectators excluded)".

### Proposed draft

```
Prints the match-control command roster -- 22 commands for adjusting match settings before a game.

Effect: Displays the following command menu to your console (hardcoded):

  timedown1....  -1 mins match time
  timeup1......  +1 mins match time
  timedown.....  -5 mins match time
  timeup.......  +5 mins match time
  fragsdown....  -10 fraglimit
  fragsup......  +10 fraglimit
  dm...........  change deathmatch mode
  tp...........  change teamplay mode
  dropquad.....  drop quad when killed
  dropring.....  drop ring when killed
  droppacks....  drop pack when killed
  lock.........  change locking mode
  spawn........  change spawntype
  speed........  toggle sv_maxspeed
  powerups.....  quad, 666, ring & suit
  fairpacks....  best/last weapon dropped
  discharge....  underwater discharges
  silence......  toggle spectator talk
  midair.......  toggle midair mode
  gren_mode....  toggle grenade mode
  instagib.....  toggle instagib mode
  berzerk......  toggle berzerk mode

No state is changed. Each sibling has its own permission and match-state requirements.

Permission:    any player (spectators excluded)
Match-state:   any time

Example: options

See also: qizmo (sibling Shape 10 help-printer for the q* family), fragsdown, fragsup, dm (siblings listed above)
```

### Notes

- FLAG: existing description says "Covers: ... [category list]" and implies ~16 commands. Source-verified roster has 22 hardcoded entries in ShowOpts (lines 1555-1582). Proposed draft enumerates all 22 from source verbatim.
- The `powerups` line in source: `"%s.... quad, %s, ring & suit\n"` with `redtext("powerups"), redtext("666")` -- 666 is a separate named command embedded in the format string (not a description label). Enumerated accurately above.
- Registration CF_PLAYER alone (line 706) -- NOT CF_PLAYER | CF_SPC_ADMIN. Spectators (even admin spectators) are excluded. Per CF flag table: "any player (spectators excluded)".
- Existing description "any player" is technically correct but the v2 template uses the precise phrasing per the CF flag mapping.
<!-- END ENTITY -->

---

---

<!-- VERDICT: drafted_with_flag -->
## fragsup (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:737 (handler at line 3095)
- **Catalog line**: 9558
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Raises the server fraglimit by 10, capped at 100. Has no effect during a live match. Refuses in HoonyMode ("No fraglimit in hoonymode"). If already at the cap, reports "fraglimit still <n>" privately; otherwise broadcasts "Fraglimit set to <n>" to all players.
>
> Set by: admin command 'fragsup'.

### Shape classification

shape-less command action. Registration: CF_PLAYER | CF_SPC_ADMIN. Writes to engine cvar `fraglimit` via `cvar_set`. Sibling is `fragsdown`. Both listed in `options` Shape 10 roster.

### Proposed draft

```
Raises the fraglimit by 10 (maximum 100), broadcasting the new value to all players.

Effect:
  - Increases fraglimit by 10; maximum is 100.
  - If already at the cap, reports "fraglimit still <n>" to you only (no broadcast).
  - Broadcasts "Fraglimit set to <n>" on success.

Permission:    any player or admin spectator
Match-state:   pre-match only (silently ignored during a live match; "No fraglimit in hoonymode" in HoonyMode)

Example: fragsup
  (fraglimit was 20 -> broadcast "Fraglimit set to  30")

See also: fragsdown (inverse), options (full match-control roster)
```

### Notes

- FLAG: existing description says "Set by: admin command 'fragsup'" implying admin-only. Registration is CF_PLAYER | CF_SPC_ADMIN -- any player or admin spectator, not admin-only. Proposed draft corrects the Permission line.
- Silent return at match_in_progress (line 3097-3100) -- no message printed. Existing description "Has no effect during a live match" is accurate.
- HoonyMode: prints refusal message but still returns without incrementing (lines 3101-3103).
<!-- END ENTITY -->

---

---

<!-- VERDICT: drafted_with_flag -->
## fragsdown (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:736 (handler at line 3047)
- **Catalog line**: 9529
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Lowers the server fraglimit by 10 (clamped to 1-100), announcing the new value to all players. Has no effect during a match or in any hoonymode ("No fraglimit in hoonymode"). Will not reduce if doing so would leave both fraglimit and timelimit at zero.
>
> Special cases: fraglimit 1 drops directly to 0; fraglimit 0 stays at 0.
>
> Set by: admin command 'fragsdown' in-game.

### Shape classification

shape-less command action. Registration: CF_PLAYER | CF_SPC_ADMIN. Writes to engine cvar `fraglimit` via `cvar_set`. No cvar_toggle_msg; no paired k_* cvar ownership. Sibling is `fragsup` (inverse direction). Both listed in the `options` Shape 10 roster.

### Proposed draft

```
Lowers the fraglimit by 10, broadcasting the new value to all players.

Effect:
  - Decreases fraglimit by 10 (minimum result is 1).
  - Special cases: fraglimit 1 drops directly to 0; fraglimit 0 stays at 0.
  - Will not reduce if doing so would leave both fraglimit and timelimit at zero.
  - Broadcasts "Fraglimit set to <n>" to all players on success.
  - Privately reports "fraglimit still <n>" if no change could be made.

Permission:    any player or admin spectator
Match-state:   pre-match only (silently ignored during a live match; "No fraglimit in hoonymode" in HoonyMode)

Example: fragsdown
  (fraglimit was 30 -> broadcast "Fraglimit set to  20")

See also: fragsup (inverse), options (full match-control roster)
```

### Notes

- FLAG: existing description says "Set by: admin command 'fragsdown' in-game" implying admin-only. Registration is CF_PLAYER | CF_SPC_ADMIN -- any player or admin spectator, not admin-only. Proposed draft corrects the Permission line.
- Special case behavior source-verified: FragsDown lines 3063-3072. fraglimit==1 sets to 0; fraglimit==0 stays at 0 (the latter is the `bound()` path via AdjustFragLimit that clamps at 1 but that path is only reached for fraglimit > 1).
- AdjustFragLimit (line 3042) step is 10 in normal mode; HoonyMode path is unreachable in FragsDown due to early return at line 3053.
<!-- END ENTITY -->

---

---

<!-- VERDICT: drafted_with_flag -->
## overtime (KTX command, Match flow -- Shape 2)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:798 (handler at line 1723)
- **Catalog line**: 9670
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cycles the overtime mode through a fixed sequence each time it is run. Has no effect while a match is in progress.
>
> Sequence (advances on each call):
> off -> time-based (extra k_exttime minutes; k_exttime is set to 1 if it was 0) -> sudden death -> tie-break -> golden frag -> off.
>
> The new mode is announced to all players.
>
> Set by: admin command 'overtime'.

### Shape classification

Shape 2 (paired cycle command). Registration: CF_PLAYER | CF_SPC_ADMIN. Handler `ChangeOvertime` (line 1723) reads `k_overtime` via `cvar("k_overtime")`, advances through 5 states (0→1→2→3→SD_GOLDEN_FRAG[4]→0) via `cvar_fset`, broadcasts the new mode name. `k_overtime` is registered via `RegisterCvar("k_overtime")` in world.c:854. This is the command side of a Shape 2 cvar+cycle pair; the cvar card is `k_overtime` (Chunk B).

The state cycle maps named overtime modes to enum values -- equivalent to a preset array indexed by value. The conditional chain (if/else if) rather than array-indexed increment is an implementation detail; the behavioral pattern is identical to Shape 2.

### Proposed draft

```
Advances the overtime mode to the next value in the fixed cycle, announcing the change to all players.

Effect:
  Cycles k_overtime through the fixed sequence on each call:
    off (0) -> time-based (1) -> sudden death (2) -> tie-break (3) -> golden frag (4) -> off (wraps)
  When advancing from off to time-based: if k_exttime was 0, it is also set to 1 (minimum duration).
  Broadcasts the new mode name to all players.

Permission:    any player or admin spectator
Match-state:   pre-match only (silently ignored during a live match)

Example:
  overtime          -> "Overtime: time based" + "Overtime length: 1 minute(s)"
  overtime (again)  -> "Overtime: sudden death"
  overtime (again)  -> "Overtime: tie-break"
  overtime (again)  -> "Overtime: golden frag"
  overtime (again)  -> "Overtime: off"

See also: k_overtime (state cvar; set directly to skip cycling), overtimeup (adjusts k_exttime duration), k_exttime (duration for time-based mode)
```

### Notes

- FLAG: existing description says "Set by: admin command 'overtime'". Registration is CF_PLAYER | CF_SPC_ADMIN -- any player or admin spectator, not admin-only. Proposed draft corrects the Permission line.
- SD_GOLDEN_FRAG = 4 (include/g_consts.h:305). Sequence source-verified from ChangeOvertime lines 1735-1766.
- k_exttime auto-set-to-1 source-verified at lines 1739-1741.
- Shape 2: value enum lives on the k_overtime cvar card (Chunk B), not this command card.
<!-- END ENTITY -->

---

---

<!-- VERDICT: drafted_with_flag -->
## overtimeup (KTX command, Match flow -- Shape 2)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:799 (handler at line 1770)
- **Catalog line**: 9702
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command that increases the overtime duration (k_exttime) by one minute and announces the new value to all players. Wraps back to 1 minute if the value would reach 11 or fall to 0 or below. No effect while a match is in progress.
>
> Set by: admin command (before match start).

### Shape classification

Shape 2 (paired cycle command). Registration: CF_PLAYER | CF_SPC_ADMIN. Handler `ChangeOvertimeUp` (line 1770) reads `k_exttime` via `cvar("k_exttime")`, increments by 1, wraps at >=11 or <=0 back to 1, writes via `cvar_fset`, broadcasts. `k_exttime` is registered via `RegisterCvar("k_exttime")` in world.c:855. This is the command side of a Shape 2 cvar+cycle pair; the cvar card is `k_exttime`.

Note: `overtimeup` is a single-direction incrementer (no `overtimedown` counterpart). Single-direction cycle still qualifies as Shape 2 -- the wrap behavior makes it a cycle, just unidirectional.

### Proposed draft

```
Increases the overtime duration (k_exttime) by one minute, announcing the new value to all players.

Effect:
  - Increments k_exttime by 1.
  - Wraps back to 1 if the result would reach 11 or fall to 0 or below (effective range: 1-10).
  - Broadcasts "Overtime length set to N minute(s)" to all players.

Permission:    any player or admin spectator
Match-state:   pre-match only (silently ignored during a live match)

Example:
  overtimeup    (k_exttime was 5 -> broadcast "Overtime length set to  6 minute(s)")
  overtimeup    (k_exttime was 10 -> broadcast "Overtime length set to  1 minute(s)")

See also: k_exttime (duration cvar; set directly to skip cycling), overtime (cycles the overtime mode type), k_overtime (the mode type cvar)
```

### Notes

- FLAG: existing description says "Admin command" and "Set by: admin command". Registration is CF_PLAYER | CF_SPC_ADMIN -- any player or admin spectator, not admin-only. Proposed draft corrects the Permission line.
- Wrap behavior source-verified at lines 1779-1783.
- Shape 2: value range/enum lives on the k_exttime cvar card, not this command card.
- No k_exttime cvar default verified from world.c:855 (bare RegisterCvar, no default argument -- engine defaults to 0). Context: k_exttime=0 means overtime uses 0 extra minutes; overtimeup starts cycling from 1.

---

<!-- VERDICT: drafted -->
## dm (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:724
- **Catalog line**: 9445
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the server's current deathmatch mode (1-5) to the player who runs it. Display-only -- the mode is changed by the separate dmm1..dmm5 commands.
>
> Default: n/a (command).
> Set by: any player or spectator-admin in-game ('dm').

### Shape classification

shape-less state-printer. Handler `ShowDMM` (commands.c:2866) is three lines: `G_sprint(self, 2, "Deathmatch %s\n", dig3(deathmatch))`. No arg dispatch, no state write, no cvar pairing. Pure display only.

The chunk guidance note ("dual-purpose state/setter") was preemptive. Source verification confirms `ShowDMM` has no argument handling -- it is a pure state-printer. The setters `dmm1`-`dmm5` are separate entities using `ChangeDM(float dmm)` -- no ownership relationship between them and `dm`. Classifying shape-less (pure standalone state-printer).

### Proposed draft

```
Prints the server's current deathmatch mode (1-5) to your console.

Permission:    any player or admin spectator
Match-state:   any time

Example: dm
  Output: "Deathmatch   2"

See also: dmm1, dmm2, dmm3, dmm4, dmm5 (the mode setters)
```

### Notes

- No contradictions with source. Existing description was accurate; v2 recast applies standard template.
- Registration: CF_PLAYER | CF_SPC_ADMIN = "any player or admin spectator". Existing description says "any player or spectator-admin" which is correct, just informal phrasing.
<!-- END ENTITY -->

---

---

<!-- VERDICT: drafted -->
## list (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:715 (handler at line 2468)
- **Catalog line**: 9616
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Broadcasts the list of not-yet-ready players to all clients, each with their status line. Only available when no match is in progress ("Game in progress" during a match; "All players ready" when everyone is ready; "Ready yourself first" if the caller is unready). Rate-limited to one broadcast per 10 seconds; prints "can't find not ready players" privately when none are unready.
>
> Set by: any player or spectator-admin ('list').

### Shape classification

shape-less state-broadcaster. Registration: CF_PLAYER | CF_SPC_ADMIN. Handler `ListWhoNot` (line 2468) iterates players, broadcasts not-ready status lines to all clients. No state write, no cvar pairing.

### Proposed draft

```
Broadcasts the list of not-yet-ready players to all clients, each with their status line.

Effect:
  - Sends each not-ready player's status line to every connected client.
  - If no unready players exist, reports "can't find not ready players" to you privately.
  - Rate-limited: only one broadcast every 10 seconds.

Prerequisites:
  - No match currently in progress ("Game in progress").
  - Not all players already ready ("All players ready").
  - Caller must be ready ("Ready yourself first").

Permission:    any player or admin spectator
Match-state:   pre-match only

Example: list

See also: ready (mark yourself ready)
```

### Notes

- No contradictions with source. Existing description was accurate; v2 recast restructures into standard sections.
- Rate-limit is via `k_whonottime` (a non-cvar float in globals.c:42), not user-configurable.
- Per-player status line is generated by `OnePlayerStatus(p, p2)` (line 2521).
<!-- END ENTITY -->

---

---

<!-- VERDICT: drafted -->
## who (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:712
- **Catalog line**: 10518
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the connected player list to the caller. Each line shows a ready/not-ready marker, an admin marker, the player's team tag (in team modes), and the player's name; the caller's own entry is tagged. Prints "no players" if none are connected. Unavailable during a live match ("Game in progress").
>
> Set by: any player or spectator (no arguments).

### Shape classification

shape-less. Pure state-printer: `PlayerStatus` iterates connected players, formats each with ready/admin/team/name fields, and prints to the caller only (G_sprint, not G_bprint). No cvar pairing, no sibling family requiring canonical-card treatment, no gating or voting relationship. Registration CF_BOTH without CF_MATCHLESS: available any time for spectators, pre-match only for the effective player use case (the handler has a `match_in_progress` -> "Game in progress" early return). Sibling to `whonot` (not-ready filter).

### Proposed draft

```
Prints the connected player list to the caller only (not broadcast).

Effect:
  Each line shows: ready marker (checkmark/x), admin marker, team tag (team modes
  only), player name. The caller's own entry is tagged with "you". Prints "no
  players" if no players are connected.

Match-state:   pre-match only (prints "Game in progress" during a live match).
Permission:    any player or spectator

Example:
  who           ; see who is connected and their ready status

See also: whonot (lists only the not-ready players), whovote (vote status per player), ready (mark yourself ready)
```

### Notes

- The existing description is accurate. The v2 recast adds the output-is-caller-only detail (G_sprint, not broadcast) and the Match-state line explicitly.
- CF_BOTH = "any player or spectator" (confirmed g_local.h:649). No match_in_progress check in the registration; the check is inside the handler.
- `who` and `whonot` are a natural sibling pair; both are pure state-printers. Each is shape-less.

---

---

<!-- VERDICT: drafted -->
## whonot (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:714
- **Catalog line**: 10545
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the list of players who are not yet ready, one per line with ready status, admin marker, team tag (in team modes), and name.
>
> Prints "All players ready" if everyone is ready. Prints "Game in progress" without a list while a match is running.
>
> Set by: any player or spectator.

### Shape classification

shape-less. Pure state-printer: `PlayerStatusN` filters the player list to not-ready players only and prints to the caller only. Sibling to `who` (full player list). No cvar pairing, no gating, no voting. shape-less state-printer with sibling cross-link to `who`.

### Proposed draft

```
Prints the list of players who have not yet readied up, to the caller only (not
broadcast).

Effect:
  Each line shows: ready marker, admin marker, team tag (team modes only), player
  name -- for not-ready players only. Prints "All players ready" when all players
  are ready. Prints "Game in progress" during a live match without a list.

Match-state:   pre-match only (prints "Game in progress" during a live match).
Permission:    any player or spectator

Example:
  whonot        ; see who still needs to ready up

See also: who (full player list, not filtered), ready (mark yourself ready), whovote (vote status per player)
```

### Notes

- The existing description is accurate. The v2 recast adds caller-only output detail and explicit Match-state line.
- `PlayerStatusN` at commands.c:2423: checks `CountRPlayers() == CountPlayers()` to emit the "All players ready" message before the loop, then filters `p->ready == true` entries out of the per-player print. Source confirms the description is correct.
- CF_BOTH = "any player or spectator".

---


# Position / spawn commands

<!-- VERDICT: drafted -->
## pos_angles (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:910 (registration); src/commands.c:6559 (Pos_Set handler, set_type=2)
- **Catalog line**: 9789
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sets the player's view angles to the three given values (pitch, yaw, roll). Pass "*" for any component to leave it unchanged. Requires exactly three arguments; invalid usage prints a usage message. Rate-limited to one change per second. May be blocked by server-side position restrictions.
>
> Usage: pos_angles <pitch> <yaw> <roll>  (use '*' to keep a component unchanged)
>
> Set by: any player in-game ('pos_angles').

### Shape classification

shape-less -- standalone set-angles-to-values command. Dispatched via DEF(Pos_Set) with set_type=2 (case 2 in Pos_Set handler at commands.c:6597). Sibling to pos_origin (set_type=1). Gated by Pos_Disallowed(). Separate full card.

### Proposed draft

```
Sets your view angles directly to explicit pitch, yaw, and roll values.

Effect:
  - Snaps view to the given angles. Use "*" for any component to leave
    that axis at its current value.
  - Does NOT change position or velocity -- view orientation only.
  - Rate-limited: only one change per second allowed (shared limit with
    pos_move and pos_origin).
  - Refused with a usage hint if not exactly three arguments are provided.

Prerequisites:
  Blocked during a match, intermission, while the game is paused, or
  during an active race round.

Permission:    any player or spectator
Match-state:   pre-match only (and outside intermission / race rounds)

Example:
  pos_angles 0 90 0     (look east, level horizon, no roll)
  pos_angles * 180 *    (turn south, keep pitch and roll)

See also: pos_save (save current angles to a slot), pos_move (restore
all three components from a slot), pos_origin (set world position to
explicit coordinates), pos_show (inspect a saved slot)
```

### Notes

- The rate-limit field `self->pos_move_time` is shared between pos_move and all Pos_Set invocations (commands.c:6526 for pos_move, 6585 for Pos_Set). pos_angles and pos_origin block each other within the same second.
- The v_angle is set via both `self->s.v.angles` and `self->s.v.v_angle` plus `fixangle = true` to force client-side angle update (commands.c:6501-6505).

---

---

<!-- VERDICT: drafted -->
## pos_move (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:905 (registration); src/commands.c:6509 (Pos_Move handler)
- **Catalog line**: 9818
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Restores the player's saved position: origin, view angles, and velocity from the stored slot. Rate-limited to one restore per second. Has no effect when position commands are restricted by the server.
>
> Set by: any player 'pos_move'.

### Shape classification

shape-less -- standalone restore-all-components command. Reads saved slot, applies origin+angles+velocity together. Gated by Pos_Disallowed(). Sibling family. Separate full card.

### Proposed draft

```
Teleports you to a saved position slot, restoring origin, view angles, and
velocity all at once.

Effect:
  - Moves your player to the slot's saved origin. Refused with "Can't move,
    location occupied" if the destination is solid or blocked.
  - Restores view angles and velocity from the slot.
  - Confirms with "Position N was restored".
  - Rate-limited: only one restore per second allowed.
  - Refused with "Save your position first" if the slot's origin is zero
    (never saved).

Prerequisites:
  Blocked during a match, intermission, while the game is paused, or
  during an active race round.

Permission:    any player or spectator
Match-state:   pre-match only (and outside intermission / race rounds)

Example:
  pos_save        (save current spot to slot 1)
  (move elsewhere)
  pos_move        (teleport back to slot 1; all three components restored)
  pos_move 2      (restore from slot 2)

See also: pos_save (save current position to a slot), pos_show (inspect a
saved slot without moving), pos_origin (set origin to explicit coordinates),
pos_angles (set angles to explicit values)
```

### Notes

- The occupied-location check runs TraceCapsule at the destination (commands.c:6482-6495); if a solid entity is present the move is silently refused.
- Rate-limit uses `self->pos_move_time` field, shared with Pos_Set (pos_origin and pos_angles). A pos_origin or pos_angles call within the same second blocks pos_move too.

---

---

<!-- VERDICT: drafted -->
## pos_origin (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:909 (registration); src/commands.c:6559 (Pos_Set handler, set_type=1)
- **Catalog line**: 9845
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Teleports you to the map position given as three coordinates (x y z). Use "*" to leave a coordinate unchanged. Requires exactly three arguments; rate-limited to one position change per second. May be restricted by the server.
>
> Default: n/a (command).
> Set by: any player ('pos_origin <x> <y> <z>').

### Shape classification

shape-less -- standalone set-origin-to-coordinates command. Dispatched via DEF(Pos_Set) with set_type=1 (case 1 in Pos_Set handler at commands.c:6589). Sibling to pos_angles (set_type=2). Gated by Pos_Disallowed(). Separate full card.

### Proposed draft

```
Teleports you directly to explicit world coordinates (x y z).

Effect:
  - Moves your player to the given origin. Use "*" for any component to
    leave that axis at its current value.
  - Does NOT restore saved angles or velocity -- position only.
  - Rate-limited: only one position change per second allowed (shared
    limit with pos_move and pos_angles).
  - Refused with a usage hint if not exactly three arguments are provided.

Prerequisites:
  Blocked during a match, intermission, while the game is paused, or
  during an active race round.

Permission:    any player or spectator
Match-state:   pre-match only (and outside intermission / race rounds)

Example:
  pos_origin 100 200 50    (teleport to x=100, y=200, z=50)
  pos_origin * * 80        (keep x and y, set z to 80)

See also: pos_save (save current position to a slot), pos_move (restore
all three components from a slot), pos_angles (set view angles to explicit
values), pos_show (inspect a saved slot)
```

### Notes

- The handler pre-fills pos from current values before parsing (`Pos_Save_origin(&pos)` then `Pos_Parse_Set`), so `*` genuinely preserves the current component (commands.c:6590-6593).
- "May be restricted by the server" in existing description refers to Pos_Disallowed() -- not a separate server-config flag. Rephrased to list specific conditions.

---

---

<!-- VERDICT: drafted -->
## pos_save (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:904 (registration); src/commands.c:6444 (Pos_Save handler)
- **Catalog line**: 9873
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Saves your current position (origin, view angles, and velocity) into one of 5 numbered slots. With no argument uses slot 1; an optional number (1-5) selects the slot. Confirms with "Position N was saved". Refused during a match, intermission, while paused, or during an active race round. Recalled by pos_show / pos_move / pos_origin / pos_angles.
>
> Default: n/a (command).
> Set by: any player.

### Shape classification

shape-less -- standalone save-to-slot command. Saves three position components. Gated by Pos_Disallowed() macro. Sibling to pos_show / pos_move / pos_origin / pos_angles. Separate full card.

### Proposed draft

```
Saves your current position -- origin, view angles, and velocity -- into one
of 5 numbered slots for later recall.

Effect:
  Captures all three position components into the chosen slot.
  Confirms with "Position N was saved".

Prerequisites:
  Blocked during a match, intermission, while the game is paused, or
  during an active race round.

Permission:    any player or spectator
Match-state:   pre-match only (and outside intermission / race rounds)

Example:
  pos_save      (saves to slot 1)
  pos_save 3    (saves to slot 3)

See also: pos_move (restores saved position -- all three components),
pos_show (inspect a saved slot without restoring), pos_origin (teleport
to explicit coordinates), pos_angles (set view to explicit angles)
```

### Notes

- Pos_Disallowed() at commands.c:6406: `match_in_progress || intermission_running || cvar("sv_paused") || (isRACE() && race.status)`.
- Existing description's "Recalled by pos_show / pos_move / pos_origin / pos_angles" rephrased -- pos_show only reads/prints; pos_move/origin/angles read and act on the slot data.

---

---

<!-- VERDICT: drafted -->
## pos_show (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:903 (registration); src/commands.c:6422 (Pos_Show handler)
- **Catalog line**: 9901
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints a saved position slot (velocity, origin, view angle) and the caller's current values side by side, for comparison. Without an argument shows slot 1; pass a number 1-5 to select a slot. Available at any time -- not blocked during a match, intermission, or race.
>
> Set by: any player or spectator ('pos_show [1-5]').

### Shape classification

shape-less -- pure state-printer. Reads from per-player `self->pos[]` array, prints to console only. No Pos_Disallowed() check (verified: Pos_Show handler at commands.c:6422 has no guard). Sibling to pos_save / pos_move / pos_origin / pos_angles with distinct behavior (print vs save vs restore vs set-component). Separate full card with mutual See-also cross-references.

### Proposed draft

```
Prints a saved position slot alongside your current position for comparison.

Effect:
  Shows velocity, origin, and view angles from the chosen slot on the
  left, and your current live values on the right -- useful for checking
  what is stored before restoring.

Permission:    any player or spectator
Match-state:   any time (not blocked during match, intermission, or race)

Example:
  pos_show        (prints slot 1 vs your current position)
  pos_show 3      (prints slot 3 vs your current position)

See also: pos_save (saves current position to a slot), pos_move (restores
all three components from a slot), pos_origin (sets origin to explicit
coordinates), pos_angles (sets view angles to explicit values)
```

### Notes

- pos_show is the ONLY pos_* command with no Pos_Disallowed() guard. This is source-confirmed: Pos_Show at commands.c:6422 reads directly without any check.
- CF_BOTH | CF_PARAMS confirmed: spectators can also inspect their saved slots.

---

---

<!-- VERDICT: drafted -->
## pickspawn (KTX command, Match flow -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1055 (registration); src/hoonymode.c:900 (HM_pick_spawn handler)
- **Catalog line**: 9762
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Nominates the spawn point nearest the player's current position. In hoonymode duel, each player nominates their own spawns. In team mode, nominees are per-team (red/blue) with a cap of maxclients/2 spawns per team. Running the command on an already-nominated spawn unpicks it. Refused if the closest spawn is held by the opposing team, the team cap is reached, or a match is in progress.
>
> Set by: any in-game player ('pickspawn' during prewar).

### Shape classification

shape-less -- standalone spawn-nomination command. No cvar+toggle, no vote, no election. NOT listed in the `options` Shape 10 help-printer (verified: ShowOpts at commands.c:1553 enumerates 23 commands; pickspawn is absent). Hoonymode-specific match-prep command.

### Proposed draft

```
Nominates the spawn point nearest your current position for the upcoming match.

Effect:
  - Hoonymode duel: nominates the closest spawn for yourself. Re-running
    on the same nominated spawn un-nominates it (reverts you to random
    spawning for this match).
  - Team mode (red/blue): nominates the closest spawn for your team. Each
    team may hold at most maxclients/2 spawns. Re-running on an already-
    team-nominated spawn un-nominates it.
  - Broadcasts the nomination or un-nomination to all players.

Prerequisites:
  - Only available in hoonymode (duel or team). Refused in other modes
    with "Command only available in hoonymode duel mode."
  - Refused if a match is in progress or intermission is running.
  - Refused if the closest spawn is already held by the opposing team.
  - Refused if your team has already reached the spawn cap (maxclients/2).

Permission:    any player (spectators excluded)
Match-state:   pre-match only

Example:
  (walk near desired spawn)
  pickspawn     (nominates it; broadcast: "PlayerName picks spawn X")
  pickspawn     (at same spawn: un-nominates; "PlayerName opts for random spawns")

See also: hoonymode (mode that enables spawn nomination), options (match
control command roster)
```

### Notes

- Per-team cap is `cvar("maxclients") / 2` (hoonymode.c:1021).
- In duel mode each player's nomination is stored as `spawn->hoony_nomination = self_num` (player entity index); in team mode as teamflag (1=red, 2=blue).
- `options` added to See-also for discoverability; pickspawn is NOT in the options menu but is a peer match-prep command.

---

---


# Practice / prewar mode commands

<!-- VERDICT: drafted_with_flag -->
## practice (KTX command, Match flow -- shape-less + Shape 4 gated)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:827 (registration); src/commands.c:4911 (TogglePractice handler)
- **Catalog line**: 9928
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the server between practice mode and normal mode. Leaving practice mode reloads the current map. Refused during a match, while a forcestart or idlebot is active, or when the mode is locked.
>
> Access controlled by cvar allow_toggle_practice:
> 0 = nobody can use this command.
> 1-2 = admins only.
> 3-4 = admins only (judges path not implemented).
> 5 = all players.
>
> Default access: server config (allow_toggle_practice).
> Set by: player or admin (per allow_toggle_practice setting).

### Shape classification

shape-less (command side) + Shape 4 gated by `allow_toggle_practice`. The command's access is controlled by `allow_toggle_practice` in a Shape 4 relationship. Registration is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator at the registration level); the actual access control is handler-internal via `allow_toggle_practice`.

### Proposed draft

```
Toggles the server between practice mode and normal mode.

Effect:
  - Entering practice mode: broadcasts "Server in practice mode" to all players.
  - Leaving practice mode: broadcasts "Server in normal mode" and reloads the
    current map.

Prerequisites:
  - `allow_toggle_practice` controls who may issue this command:
      0 = nobody (always refused)
      1 or 2 = admins only
      3 or 4 = admins only (judges path not implemented; falls back to admin)
      5 = any player
  - Refused during a match.
  - Refused if a forcestart is active or an idlebot is running.
  - Refused if `lock_practice` is 2 (locked in current state) or an
    unrecognized value.

Permission:    any player or admin spectator (further restricted by allow_toggle_practice)
Match-state:   pre-match only

Example:
  (server.cfg)
  allow_toggle_practice 5    (any player may toggle practice mode)

  (in-game)
  practice                   (enter practice; map reloads when exiting)

See also: allow_toggle_practice (access-control cvar), lock_practice (prevents
toggling when set to 2), srv_practice_mode (underlying practice state cvar)
```

### Notes

- FLAG: The existing description implies a simple admin-vs-player split. Source registration at commands.c:827 is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator at the CF level); the actual restriction is `allow_toggle_practice`, whose default (from `RegisterCvar("allow_toggle_practice")` at world.c:876 -- no default) is 0 (nobody). The two-layer access model is not surfaced in the existing description.
- Cases 3 and 4 in `allow_toggle_practice` fall through to admin check at commands.c:4956-4963 with message "judges is not implemented in this mode, you must be an admin." Preserved in proposed draft.
- `lock_practice` registered with no default (world.c:851); when 0 or empty no lock applies. Value 1 allows one-time toggle (commands.c:4921 only blocks on value 2 and values != 0 and != 1).

---

---

<!-- VERDICT: drafted_with_flag -->
## prewar (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:755 (registration); src/admin.c:793 (TogglePreWar handler)
- **Catalog line**: 9962
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command that cycles the `k_prewar` setting through 0 -> 1 -> 2 -> 0 on each use, and broadcasts the change to all players.
>
> 0 = no fire or jump before the match.
> 1 = fire and jump allowed before the match.
> 2 = fire and jump require typing 'ready' first (per-player gate).
>
> Set by: admin command 'prewar' in-game (cycles the value; non-admins silently refused).

### Shape classification

shape-less -- command-side lever for the `k_prewar` cvar. The command writes to `k_prewar` via `cvar_fset` (admin.c:846) but this is not a Shape 1 toggle (not binary 0/1) nor a canonical Shape 2 cycle command (k_prewar has discrete named values and is also set directly in server.cfg). The shape tag for any cvar-relationship belongs on the k_prewar cvar card. See-also references k_prewar.

### Proposed draft

```
Cycles the pre-match fire/jump permission (k_prewar) through its three
states, broadcasting the change to all players.

Effect:
  Advances k_prewar: 0 -> 1 -> 2 -> 0 on each invocation.
    0  players may not fire before the match
    1  players may fire before the match
    2  players may fire after typing 'ready' first (per-player gate)
  Broadcasts the new state to all players (pre-match) or reports only
  to the admin (if called mid-match -- value is accepted but not
  broadcast to all).

Permission:    admin only
Match-state:   any time (effective pre-match; accepted mid-match admin-only)

Example:
  prewar    (from k_prewar 1: cycles to 2)
  prewar    (cycles to 0 -- no fire)
  prewar    (cycles back to 1)

See also: k_prewar (underlying cvar; default 1; can be set directly in
server.cfg to skip cycling)
```

### Notes

- FLAG: The existing description says "0 = no fire or jump" and "1 = fire and jump allowed." Source broadcast at admin.c:812 says "Players may fire before match" (no mention of jump for value 1); and admin.c:837 says "Players may not fire before match" (no mention of jump for value 0). The "jump" restriction for values 0/1 is NOT confirmed in the TogglePreWar handler or its broadcasts. Only value 2 references `ready`. Jump restriction may apply via separate mechanism (weapons.c:2804-2813 checks k_prewar for fire gating only). Flag for operator to verify whether jump is truly gated by k_prewar 0/1.
- Non-admin early-return at admin.c:797-800: `if (!is_adm(self)) { return; }` -- silent refusal confirmed.
- k_prewar default is "1" (`RegisterCvarEx("k_prewar", "1")` at world.c:844).
- Registration `CF_BOTH_ADMIN` confirmed (admin only).
- Mid-match: no `match_in_progress` early-return; the handler uses `!match_in_progress` to decide broadcast scope (all players vs admin-only). The cvar_fset executes regardless of match state.

---


# Voting / toggle / player-setter

<!-- VERDICT: drafted_with_flag -->

## votemap (KTX command, Match flow -- Shape 7b vote-cast)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:701
- **Catalog line**: 10491
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switch to a named map immediately, if it exists in the server's map list. Usage: votemap <mapname>. Prints a usage line if no argument is given; prints "Map '<name>' not available on this server" if the map is not found. Usable by players and spectators, with no match restriction.
>
> Set by: player or spectator command.

### Shape classification

Shape 7b vote-cast (OV_MAP channel). Handler chain: `VoteMap` (maps.c:503) -> `VoteMapSpecific` (maps.c:486) -> `DoSelectMap(map_num)` (maps.c:392). `DoSelectMap` is the canonical Shape 7b vote body: per-player vote flag `self->v.map`, cooldown checks, `k_no_vote_map` gate, `k_lockmap` gate, self-revote no-op, tally call via `vote_check_map()` at vote.c:597 -> OV_MAP. Threshold cvar `k_vp_map`. Registration: `CF_BOTH | CF_MATCHLESS | CF_PARAMS` at commands.c:701.

Source-verified against mechanism map `ktx-map-voting-mechanism-map.md` and direct read of VoteMap/VoteMapSpecific at maps.c:503/486.

### Proposed draft

```
Casts (or withdraws) your vote to play a specific map.

Effect:
  Toggles your map vote to the named map. If you already voted for the
  same map, reports "your vote is still good" (no double-cast). Voting
  for a different map updates your active vote. When enough players vote
  for the same map (per k_vp_map threshold), the server changes to that
  map. Each vote is broadcast as "suggests map" / "agrees on" / "would
  rather play on" based on the current tally state.

Prerequisites:
  - k_no_vote_map must be 0 (matchless mode gate; when set, map voting
    is disabled entirely).
  - k_lockmap must be 0 or you must be admin ("MAP IS LOCKED!" if not).
  - Cooldown: 15 seconds since last map vote in matchless mode; 7 seconds
    in non-matchless mode.

Permission:    any player; non-admin spectators refused at the map-vote gate
Match-state:   pre-match only in standard mode; countdown phase only in
               matchless mode

Example:
  votemap dm3       (cast your vote for dm3; broadcast to all)
  votemap aerowalk  (change vote to aerowalk)
  votemap dm3       (already voted: "your vote is still good")

See also: k_vp_map (vote threshold percentage), k_no_vote_map (matchless
gate), k_lockmap (map lock; blocks non-admin votes), cm (internal legacy-
client peer; same OV_MAP channel via DoSelectMap), maps (lists available
maps to vote for)
```

### Notes

- FLAG: existing-description-framing-wrong -- source treats votemap as Shape 7b vote-cast (VoteMap -> VoteMapSpecific -> DoSelectMap at maps.c:503/486/392), not immediate switch. Per mechanism map ktx-map-voting-mechanism-map.md. The entire framing "Switch to a named map immediately" is incorrect. Apply-pass-author MUST replace the existing description entirely.
- FLAG: existing-description says "Usable by players and spectators, with no match restriction" -- both claims are wrong. Non-admin spectators are refused at maps.c:424 (internal gate in DoSelectMap: `self->ct == ctSpec && !is_adm(self)`). There IS a match restriction: standard mode is pre-match only; matchless mode is countdown phase only (maps.c:406-425 gates).
- Discipline 1 check: VERDICT: drafted_with_flag marker appears above. Consistent with body.
- `mapslist_dl` stuffs per-player `alias <mapname> "cmd votemap <mapname>"` at connect time for modern clients (maps.c:296); typing `/dm3` resolves to `cmd votemap dm3`. This is the user-visible path but implementation-level; not included in L1 prose. Users who discover `votemap` should see that typing map names directly also works.

# ===== CHUNK G END =====

---

<!-- VERDICT: drafted_with_flag -->

## rpickup (KTX command, Match flow -- Shape 7b vote-cast)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:807
- **Catalog line**: 10047
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Casts or withdraws your vote for a random-team shuffle. When enough players vote (or an admin vetoes), teams are reshuffled randomly. Silently refused during a live match. Refused with a message when a captain pick or coach pick is in progress, or when fewer than 4 players are in-game. Casting or withdrawing the vote is announced to all players along with the remaining votes still required.
>
> Set by: any in-game player or spectator-admin via 'rpickup' command.

### Shape classification

Shape 7b vote-cast (OV_RPICKUP channel). Registration `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator). Per-player vote flag `self->v.rpickup` at commands.c:5545. Threshold cvar `k_vp_rpickup` (world.c:830), shared with `swapall` per vote.c:252-254. `is_admins_vote(OV_RPICKUP)` at vote.c:792 counts admins who voted FOR rpickup; condition `if (veto || !get_votes_req(...))` at vote.c:794 fires immediately if any admin has voted -- this is an admin fast-pass (immediate execution), not an admin veto/block. Minimum 3 votes required regardless of percentage (vote.c:379-381). Minimum 4 players enforced at handler entry (commands.c:5536) and tally entry (vote.c:786).

### Proposed draft

```
Casts (or withdraws) your vote for a random team shuffle.

Effect:
  Toggles your rpickup vote. Re-running withdraws. When the threshold is
  reached -- or when any admin casts their vote -- all players are
  redistributed into random teams and the vote clears.
  Each toggle is broadcast to all players along with the remaining votes
  still needed.

Prerequisites:
  - No match in progress (silently refused mid-match).
  - No captain or coach pick in progress ("No random pickup when
    captain/coach stuffing").
  - At least 4 players must be in-game; minimum 3 votes required
    regardless of k_vp_rpickup percentage.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  rpickup    (cast vote; remaining count broadcast to all)
  rpickup    (re-run to withdraw)

See also: k_vp_rpickup (vote threshold percentage, shared with swapall),
swapall (team-swap vote sharing same threshold),
pickup (team-pickup vote, separate OV_PICKUP channel)
```

### Notes

- FLAG: existing-description says "an admin vetoes" -- source shows the reverse: `is_admins_vote(OV_RPICKUP)` at vote.c:792 returns the count of admins who voted FOR rpickup; the condition `if (veto || !get_votes_req(OV_RPICKUP, true))` at vote.c:794 fires (and executes the shuffle) when any admin has voted. This is an admin fast-pass/override (instant execution), not a block. Apply-pass-author must remove the "admin vetoes" framing and replace with "any admin vote triggers immediate execution."
- `k_vp_rpickup` is shared with `swapall` (vote.c:253: `case OV_SWAPALL: percent = cvar("k_vp_rpickup")`); both channels use the same threshold cvar.
- `CF_PLAYER | CF_SPC_ADMIN` at commands.c:807 = any player or admin spectator; the existing "spectator-admin" phrasing is directionally correct but non-standard vs the CF flag wording table.

---

---

<!-- VERDICT: drafted_with_flag -->
## toggleklist (KTX command, Match flow -- Shape 1 cvar+toggle)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:834
- **Catalog line**: 10407
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles whether the klist command (full client list) is available to players during a live match. The new state is broadcast to all players with a reminder to also toggle tracklist. Has no effect while a match is in progress.
>
> Controls the k_allowklist cvar.
>
> Set by: admin command 'toggleklist'.

### Shape classification

Shape 1 cvar+toggle. `toggleklist` reads `!cvar("k_allowklist")` then calls `cvar_fset("k_allowklist", ...)` -- functionally a binary flip of `k_allowklist`. The `k_allowklist` cvar is registered in world.c:861 with default "1". This is the command side of a Shape 1 pair; `k_allowklist` is the cvar side. Note: the handler uses `cvar_fset` rather than `cvar_toggle_msg` (the Shape 1 canonical signature), but the behavioral pattern is identical -- 0/1 flip with broadcast. The match_in_progress early return confirms pre-match-only behavior.

### Proposed draft

```
Toggles the k_allowklist rule, which controls whether players can use the klist
command during a live match.

Effect:
  Flips k_allowklist between 0 and 1 and broadcasts the new state to all players
  ("klist: on/off -- remember to also toggle tracklist"). When k_allowklist is
  off (0), player-slot clients are refused from running klist mid-match; spectators
  are always permitted.

Match-state:   pre-match only (no effect while a match is in progress).
Permission:    any player or spectator

Example:
  toggleklist          ; flip klist availability
  toggletracklist      ; companion toggle (reminder is broadcast by both commands)

See also: k_allowklist (the cvar this toggles), toggletracklist (companion toggle -- both commands remind each other), klist (the command whose mid-match access is gated)
```

### Notes

- FLAG: The existing description says "Set by: admin command 'toggleklist'" implying admin-only. Source registration is `CF_BOTH | CF_MATCHLESS` (commands.c:834), which maps to "any player or spectator" -- not admin-only. The match_in_progress early return inside the handler limits effective use to pre-match regardless. Draft uses "any player or spectator" and "pre-match only".
- The `CF_MATCHLESS` flag means the command is also available in matchLess server mode (g_local.h:653). Not user-facing; not surfaced in L1 prose.
- The companion reminder ("remember to also toggle tracklist") is wired into both handlers symmetrically -- `toggleklist` broadcasts "klist: on/off - remember to also toggle tracklist"; `toggletracklist` broadcasts "tracklist: on/off - remember to also toggle klist". This bidirectional reminder is surfaced in the Effect.
- `klist` handler gates on `k_allowklist` only when `match_in_progress && self->ct == ctPlayer` (commands.c:5077) -- spectators are always allowed regardless of the cvar. This distinction is noted in Effect.

---

---

<!-- VERDICT: drafted -->
## toggletracklist (KTX command, Match flow -- Shape 1 cvar+toggle)

- **Status**: drafted
- **Source**: src/commands.c:843
- **Catalog line**: 10464
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the tracklist permission on or off and broadcasts the new state ("tracklist: on/off -- remember to also toggle klist"). When on, players may use the spectator-tracking list during a match. Has no effect during a live match.
>
> Set by: any player or spectator via 'toggletracklist'.

### Shape classification

Shape 1 cvar+toggle. `toggletracklist` reads `!cvar("k_allowtracklist")` then calls `cvar_fset("k_allowtracklist", ...)` -- binary flip of `k_allowtracklist`. Registered in world.c:862 with default "1". CF_BOTH | CF_MATCHLESS (commands.c:843). Companion to `toggleklist`; both are Shape 1 toggle commands for their respective access-control cvars. Cross-batch: `k_allowtracklist` belongs to Admin & permissions batch (2026-05-26).

### Proposed draft

```
Toggles the k_allowtracklist rule, which controls whether players can use the
tracklist command during a live match.

Effect:
  Flips k_allowtracklist between 0 and 1 and broadcasts the new state to all
  players ("tracklist: on/off -- remember to also toggle klist"). When
  k_allowtracklist is off (0), player-slot clients are refused from running
  tracklist mid-match; spectators are always permitted.

Match-state:   pre-match only (no effect while a match is in progress).
Permission:    any player or spectator

Example:
  toggletracklist      ; flip tracklist availability
  toggleklist          ; companion toggle (reminder is broadcast by both commands)

See also: k_allowtracklist (the cvar this toggles), toggleklist (companion toggle -- both commands remind each other), tracklist (the command whose mid-match access is gated)
```

### Notes

- The existing description correctly identifies "any player or spectator" permission, matching CF_BOTH. No permission flag correction needed here.
- Same behavioral structure as `toggleklist`: `match_in_progress` early return in handler, `cvar_fset` rather than `cvar_toggle_msg`, companion broadcast reminder.
- Cross-batch reference: `k_allowtracklist` is an Admin & permissions batch entity (2026-05-26). See-also names it; apply-pass-author resolves the cross-link.
- `tracklist` command gates on `k_allowtracklist` only when `match_in_progress && self->ct == ctPlayer` (commands.c:5433) -- spectator access is always permitted.

---

---

<!-- VERDICT: drafted_with_flag -->

## sh_speed (KTX command, Match flow -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:912
- **Catalog line**: 10074
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the prewar speed display for your client. While on, during prewar the HUD stat numbers (armor, frags, ammo) are replaced with your current movement speed. Has no effect once a match is in progress. Reports "showing speed in prewar: on/off" on each toggle.
>
> Set by: any player (per-client toggle, in-game command).

### Shape classification

Shape-less (command-side lever for the `kf` userinfo bitmask, specifically bit 64 / KF_SPEED). The handler at commands.c:6622-6624 stuffs `cmd info kf <current_kf XOR KF_SPEED>` back to the invoking client. No paired k_* cvar, no `cvar_toggle_msg`, no vote channel. The `kf` userinfo key (g_userinfo.c:65) is the bitmask container; `sh_speed` is the sole KTX command that provides a per-bit toggle lever for one of its bits. The shape tag belongs on the `kf` entity; `sh_speed` is shape-less as its command-side lever.

### Proposed draft

```
Toggles the movement speed display during the pre-match warmup phase.

Effect:
  Flips the KF_SPEED bit in your kf userinfo value. When on, the HUD
  stat numbers (armor, frags, ammo) are replaced by your current movement
  speed during pre-match warmup. Has no effect during a live match.
  Announces "showing speed in prewar: on/off" on each toggle.

Permission:    any player or spectator
Match-state:   effect is warmup-phase-only (command accepted at any time;
               speed display only activates during pre-match)

Example:
  sh_speed    (toggle on; speed replaces HUD stats during warmup)
  sh_speed    (toggle off)

See also: kf (userinfo bitmask containing the KF_SPEED bit this command
toggles), options (match-settings help-printer family)
```

### Notes

- FLAG: existing-description says "Set by: any player" but registration at commands.c:912 is `CF_BOTH` (CF_PLAYER | CF_SPECTATOR = any player or spectator). Apply-pass-author must correct to include spectators.
- Mechanism note (not for L1): handler stuffs `cmd info kf %d` (commands.c:6624 with STUFFCMD_IGNOREINDEMO flag), causing the client to re-send `setinfo kf <new_value>`, which triggers `info_kf_update` server-side (g_utils.c:2551). The `STUFFCMD_IGNOREINDEMO` flag means the toggle is suppressed during demo playback -- state does not change when watching a demo.
- The client.c:4582 read site confirms speed display fires only when `!match_in_progress && !match_over && !k_captains && !k_matchLess && !isHoonyModeAny()`. The Match-state note covers the primary restriction.
- Dispatcher instruction to cross-link `options` verified: `options` (ShowOpts) does NOT list `sh_speed` in its roster (lists `speed` = ToggleSpeed, not `sh_speed`). Cross-link to `options` as "related pre-match tools family" is appropriate but `sh_speed` is not enumerated in the options menu.

---

---


# Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author should resolve before applying drafts to L1.

---

### F1: Permission-line CF flag mislabel pattern -- 6th batch continuing

**Verdict**: ACTIONABLE

**Cards involved (15)**: `fragsdown`, `fragsup`, `overtime`, `overtimeup`, `time10` (canonical), `timedown`, `timedown1`, `timeup`, `timeup1`, `toggleklist`, `pause`, `ready`, `toggleready`, `sh_speed`, `practice`

**Observation**: The systematic "Admin command" / admin-only framing in existing descriptions continues for the 6th batch (the F1 pattern first surfaced in Mode selection batch 2026-05-26 and has recurred every batch since). Match flow surfaces several CF flag variants of the same mislabel root cause: (a) 9 cards with `CF_PLAYER | CF_SPC_ADMIN` ("any player or admin spectator") labeled as admin-only; (b) `toggleklist` with `CF_BOTH` ("any player or spectator") labeled as admin-only; (c) `pause` with `CF_PLAYER | CF_MATCHLESS | CF_SPC_ADMIN` labeled as admin-only; (d) `ready`, `toggleready` with `CF_BOTH | CF_MATCHLESS` understated as "any player in-game" (missing spectator scope); (e) `sh_speed` with `CF_BOTH` understated as "any player"; (f) `practice` with `CF_PLAYER | CF_SPC_ADMIN` plus runtime `allow_toggle_practice` gate -- two-layer access model not surfaced.

**Source evidence**: All 15 cards' FLAG: bullets cite registration rows in `src/commands.c` and the `include/g_local.h:647-658` CF flag table. Demo & spectator batch's F1 surfaced a NEW direction (under-state); Match flow surfaces both directions (over-state on 12 cards; under-state on 3: ready, toggleready, sh_speed).

**Recommendation**: Apply-pass-author updates all 15 cards' Permission lines per the source CF flags + the universal-shape-v2.md Permission discipline table. Six batches affected (Mode selection / Frogbot / Admin & permissions / Demo & spectator / Voting / Match flow). Consider a permanent `~/.claude/skills/ktx-l1-rewrite/SKILL.md` amendment if this pattern continues another batch.

---

### F2: Default-value error class -- bare `RegisterCvar` = 0, not the existing-description value

**Verdict**: ACTIONABLE

**Cards involved (4)**: `k_exttime`, `k_freeze`, `k_lockmax`, `k_lockmin`

**Observation**: All 4 cvars use bare `RegisterCvar("name")` in `src/world.c` (NOT `RegisterCvarEx("name", "default")`), so the engine default is 0. Existing descriptions cite "Default: 5" (k_exttime), "Default: 1" (k_freeze), "Default: 2" (k_lockmax + k_lockmin) -- all wrong relative to source. Example configs (`server.cfg` typical-setup blocks) DO set non-zero values (`k_exttime 5`, `k_lockmax 32`), but those are CONFIG defaults, not engine defaults.

**Source evidence**: `world.c:855` (k_exttime), `world.c:871` (k_freeze), `world.c:858-859` (k_lockmin/k_lockmax). All bare `RegisterCvar`.

**Recommendation**: Apply-pass-author updates "Default: N" to "Default: 0" for all 4 cvars. Same root-cause class as Admin & permissions batch F4 (`k_privategame_allow_specs` / `k_privategame_force_reconnect` default-value sweep). A wider sweep of all `RegisterCvar` (bare) vs `RegisterCvarEx` (default-specified) cvars across batches may be warranted.

---

### F3: Shape paired-command omissions in cvar Set-by lines

**Verdict**: ACTIONABLE

**Cards involved (4)**: `k_exttime`, `k_freeze`, `k_lockmode`, `k_overtime`

**Observation**: Existing descriptions for these cvars omit their paired toggle/cycle commands in "Set by" lines:
- `k_exttime` Set-by says "server config" only -- missed `overtimeup` (Shape 2 cycle, CF_PLAYER | CF_SPC_ADMIN, this batch Chunk E).
- `k_freeze` Set-by says "server config" only -- missed `freeze` command (Shape 1 toggle, CF_PLAYER | CF_SPC_ADMIN, `commands.c:806` -- NOT in this batch, likely Gameplay rules or other future batch).
- `k_lockmode` Set-by says "server config" only -- missed `lockmode` cycle command (Shape 2 cycle, CF_PLAYER | CF_SPC_ADMIN, `commands.c:748` -- drafted in Admin & permissions batch 2026-05-26).
- `k_overtime` Set-by mentions "overtime admin command" -- correct that overtime writes it, but "admin" framing wrong (F1 overlap; `overtime` is CF_PLAYER | CF_SPC_ADMIN).

**Source evidence**: Registration rows + `cvar_fset` / `cvar_toggle_msg` write sites per per-card FLAG bullets.

**Recommendation**: Apply-pass-author updates cvar Set-by lines + See-also wiring. For `k_freeze`, surface the `freeze` command for follow-up drafting (likely a future batch alongside Gameplay rules).

---

### F4: votemap foundational framing wrong (mechanism map applied)

**Verdict**: ACTIONABLE

**Cards involved (1)**: `votemap`

**Observation**: Per `ktx-map-voting-mechanism-map.md` (source-truth cross-batch reference; verified at investigation 2026-05-26): `votemap` is a Shape 7b vote-cast (`VoteMap` -> `VoteMapSpecific` -> `DoSelectMap` at `maps.c:503/486/392`) -- NOT an immediate map switch. Two FLAGs on the votemap card: (a) foundational framing wrong (immediate-switch vs vote-cast); (b) permission/match-state claims also wrong ("usable by players and spectators, no match restriction" -- actual: non-admin-spectator gate at `maps.c:424`, 15s matchless / 7s non-matchless cooldown, `k_lockmap` gate, `k_no_vote_map` gate). The card was drafted_with_flag rather than parked (trigger 3) because the mechanism map provided sufficient source-verified semantics for the sub-agent to draft a correct recast.

**Source evidence**: `commands.c:701` (registration), `maps.c:503/486/392` (handler chain), `maps.c:408/424/434` (gates), mechanism map.

**Recommendation**: Apply-pass-author treats votemap's drafted_with_flag entry as a foundational rewrite per the mechanism map's verified semantics. No re-research needed.

---

### F5: agree mechanism framing wrong -- calls DoSelectMap (Shape 7b vote path)

**Verdict**: ACTIONABLE

**Cards involved (1)**: `agree`

**Observation**: Existing description says agree "switches to the most recently voted map WITHOUT a further vote." Source: agree's handler calls `DoSelectMap(k_lastvotedmap)` -- which is the same Shape 7b OV_MAP vote-cast path as `cm` and `votemap`. agree IS the further vote (cast for the previously-named map). Existing framing inverts the mechanism.

**Source evidence**: `commands.c:902` (registration), `agree` handler in `match.c` invoking `DoSelectMap(k_lastvotedmap)`.

**Recommendation**: Apply-pass-author corrects the framing per the FLAG bullet on the agree card.

---

### F6: rpickup admin-veto framing reversed -- admin = fast-pass, not block

**Verdict**: ACTIONABLE

**Cards involved (1)**: `rpickup`

**Observation**: Existing description says "an admin vetoes" the vote. Source `is_admins_vote(OV_RPICKUP)` at `vote.c:792` returns true -- meaning admin vote = fast-pass (immediate execution on admin's lone yes-vote), NOT a veto. Inverted semantics from existing description.

**Source evidence**: `vote.c:792` + `is_admins_vote()` switch logic.

**Recommendation**: Apply-pass-author corrects rpickup's admin-mechanism framing per the FLAG bullet.

---

### F7: Canonical-card decisions across 3 candidate families

**Verdict**: INFORMATIONAL

**Cards involved (16)**: time fan-out (6 cards: time5/time10/time15/time20/time25/time30), mode presets (5 cards: 1on1/2on2/3on3/3on3on3/10on10), pos_* (5 cards: pos_show/pos_save/pos_move/pos_origin/pos_angles)

**Observation**: Three potential canonical-card families source-verified during this batch:

- **time fan-out: CANONICAL-CARD APPLIED**. All 6 commands register via `DEF(TimeSet)` with different float constants and an identical handler. Canonical: `time10` (QW duel default match-length convention). Reference cards: `time5`, `time15`, `time20`, `time25`, `time30` (Headliner + per-sibling delta + See-also -> time10). 6-card application; ~9% of this batch.

- **Mode presets: NOT canonical-card (5 separate full cards)**. Source-verified bundles differ structurally (different timelimits, deathmatch values, member counts, teamplay constants -- not "near-identical modulo team-count"). Per Mode selection batch's F2 precedent: mode presets stay shape-less; the bundle IS the description. `3on3on3` is a 3-team variant (k_lockmax 3 vs 3on3's k_lockmax 2).

- **pos_* family: NOT canonical-card (5 separate full cards)**. Source-verified meaningfully-different behaviors: pos_show (state-printer), pos_save (save to slot), pos_move (restore all), pos_origin (set origin only), pos_angles (set angles only). Dispatch through different `DEF(Pos_Set)` set_type values OR different handlers. Per Frogbot batch's F11 precedent: source-verify behavioral identity before canonical-card; not satisfied here.

**Recommendation**: No apply-pass action; this finding documents the canonical-card decision discipline working as intended.

---

### F8: options Shape 10 roster source-verified (22 siblings) + bidirectional cross-link inconsistencies

**Verdict**: ACTIONABLE

**Cards involved (4)**: `options` + 3 missing back-link cards (timedown1, timeup1, dm) + 1 incorrectly-linked card (pickspawn)

**Observation**: `options` is Shape 10 (curated-family help-printer) with 22 hardcoded sibling entries in its `ShowOpts` handler at `commands.c:1553` (handoff doc estimated ~16). The full roster is enumerated inline in options' Effect block. Notable: the time-N family (time5/time10/time15/time20/time25/time30) is NOT in the options roster -- the roster contains the timer ADJUSTERS (`timedown1`, `timeup1`, `timedown`, `timeup`) instead.

**Per Shape 10 companion-side discipline** (every sibling's See-also should reference the help-printer parent), the 7 options siblings in THIS batch should each See-also `options`:
- timedown, timeup, fragsdown, fragsup -- correctly reference options in See-also (4 of 7 OK).
- **timedown1, timeup1, dm -- MISSING See-also reference to options** (apply-pass action: add `options` to See-also).
- **pickspawn INCORRECTLY references options** in See-also (sub-agent F followed an incorrect hint in the dispatcher prompt that pickspawn is an options sibling; source-verified pickspawn is NOT in the ShowOpts roster). Apply-pass action: REMOVE `options` from pickspawn's See-also.

The 6 time-N family cards correctly do NOT reference options. `sh_speed` mentions options in Notes only (not See-also) and is also NOT in the options roster -- Notes reference is acceptable as commentary, See-also did not over-link.

**Source evidence**: `commands.c:1553-1582` (full ShowOpts G_sprint). The 22-entry roster is verbatim enumerable from source.

**Recommendation**: Apply-pass-author (a) adds `options (parent Shape 10 help-printer)` to See-also on timedown1, timeup1, dm; (b) removes `options` from pickspawn's See-also.

---

### F9: dm classified as PURE state-printer (handoff "dual-purpose" hypothesis overridden by source)

**Verdict**: CONFIRMED CLEAN

**Cards involved (1)**: `dm`

**Observation**: Dispatcher prompt to Chunk E hypothesized `dm` is "dual-purpose state/setter" (with args = mode setter; without args = state display) per the Shape 10 disambiguation guidance. Sub-agent source-verified `ShowDMM` at `commands.c:2866` is a 3-line pure G_sprint state-printer with NO arg dispatch. The mode setters are separate entities (`dmm1` through `dmm5`); `dm` is shape-less state-printer only.

**Source evidence**: `commands.c:724` (registration), `commands.c:2866` (3-line handler).

**Recommendation**: No apply-pass action. This finding documents the handoff-Rule-7 / Rule-9 discipline ("HYPOTHESES not contracts; trust source over handoff") working as intended -- same precedent class as Demo & spectator batch's F8 (`_k_nospecs`) and F10 (trex family) source-overrides. Three consecutive batches now show this discipline triggering correctly.

---

### F10: Localized factual contradiction fixes (4 cards, all drafted_with_flag)

**Verdict**: ACTIONABLE

**Cards involved (4)**: `srv_practice_mode`, `prewar`, `ra_break`, `time10`

**Observation**: Four cards have localized factual contradictions in existing descriptions:

- `srv_practice_mode`: existing description claims "Changing this setting reloads the map and announces" in both directions; source `SetPractice()` only reloads on practice->normal transition. `SetPractice(1, ...)` only announces.
- `prewar`: existing description claims k_prewar=0 disables both jump AND fire; source broadcasts (`admin.c:812`, `admin.c:837`) mention only fire. Jump gating by k_prewar 0/1 unconfirmed in source -- flagged for operator verification.
- `ra_break`: existing description frames RA-mode / winner / loser as two separate "ignored" conditions; source has THREE silent-return conditions (not-RA, winner, loser) consolidated by sub-agent into Prerequisites.
- `time10` (canonical card): existing description for time-N family says "no effect if k_timetop is below N"; source uses `bound(0, t, k_timetop)`, so `time10` with `k_timetop=5` sets `timelimit` to 5 (clamps, NOT no-op). Same correction applies to all 5 reference cards.

**Source evidence**: Per-card FLAG: bullets cite specific source lines.

**Recommendation**: Apply-pass-author reviews each FLAG bullet and applies the localized factual correction.

---

### F11: Election commands -- captain 2-branch subsequent-invocation + coach elect_block_till + latejoin 30s timeout

**Verdict**: INFORMATIONAL

**Cards involved (3)**: `captain`, `coach`, `latejoin`

**Observation**:

- `captain` handler has TWO subsequent-invocation behaviors surfaced in Effect: (1) re-invoking while own captain election pending -> aborts the pending election (subsequent-invocation toggle pattern per universal-shape-v2.md Shape 7a discipline); (2) re-invoking after winning election (you ARE the captain) -> steps down from captain role.
- `coach`: source-verified the 30s `elect_block_till` cooldown after a prior election expires as a refusal condition -- this is missing from the existing description (drafted_with_flag).
- `latejoin`: Shape 7a election with 30s electguard timeout (faster than typical 60s for elect/captain/coach). Uses etLateJoin election type. Mid-match CA/Wipeout only.

**Source evidence**: `commands.c:803-804` (captain/coach registration); `coach.c:143` (elect_block_till write site); `commands.c:838` (latejoin registration); `match.c` electguard timeout values.

**Recommendation**: No apply-pass action beyond the standard drafted_with_flag review on coach. Findings document shape-classification depth + cross-Shape-7a variation in timeouts (30s for latejoin vs 60s for elect/captain/coach).

---

### F12: Cross-batch See-also threading inventory + k_sready needs-synthesis routing

**Verdict**: INFORMATIONAL

**Cards involved (varies)**

**Observation**:

**Cross-batch See-also threading established by this batch** (apply-pass-author validates symmetric wiring when each paired batch ships):

- To Voting batch (`drafts-2026-05-26.md`): k_vp_break (break/forcebreak/ra_break), k_vp_map (votemap/cm), k_vp_captain (captain), k_vp_coach (coach), k_vp_rpickup (rpickup), voteprivate + k_vp_privategame (k_privategame state-cvar peer).
- To Admin & permissions batch (`drafts-2026-05-26-admin-permissions.md`): k_allowtracklist (toggletracklist), lockmode command (k_lockmode Shape 2 cycle pair), lockmap command (k_lockmap Shape 1 + Shape 4 composition pair).
- Internal pairs within Match flow: k_pause_without_matchtag <-> pause (Chunks B + F); k_overtime / k_exttime <-> overtime / overtimeup (Chunks B + E); k_prewar <-> prewar (Chunks B + F); k_privategame <-> k_privategame_default (Chunks B + C).
- Cross-batch future: `freeze` command (k_freeze's Shape 1 paired toggle, NOT yet in any batch -- likely Gameplay rules or future); `k_allowklist` (toggleklist's paired cvar, not yet in any batch).

**k_sready aborted to describe-fill-synthesis**: `k_sready` has an EMPTY existing_description in L1 (per the pre-fetch JSON; desc_len=0). Per the per-card skill's hard pre-flight gate point 2 (trivial < 100 chars), the entity aborted with reason `needs-synthesis`. NOT a park (no per-card park file entry); routes to the separate `describe-fill-synthesis` skill for cold synthesis from source. Not the first aborted-to-synthesis -- Server-config batch (2026-05-23) also surfaced similar route-to-synthesis cases. Track as a separate apply-pass queue (synthesis pile vs recast pile).

**Recommendation**: No apply-pass action on the threading itself; the See-also wiring lands per-card in this batch's drafts. The k_sready synthesis is a separate workstream (queue for describe-fill-synthesis dispatch).
