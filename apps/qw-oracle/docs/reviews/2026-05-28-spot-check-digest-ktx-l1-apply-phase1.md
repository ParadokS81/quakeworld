# Spot-check digest -- KTX L1 apply-pass Phase 1

**Date:** 2026-05-28
**Sample:** 32 cards across 11 batches (~5% of 640).
**Stratification:** weighted by domain intuition + per-batch flag rate.

Scan for:
- Does the proposed draft text make sense as a user-facing description?
- For flagged cards: does the Notes block describe a real source-truth contradiction?
- Any systematic issues (e.g. one batch's cards all look wrong) -> escalate that batch to per-batch sign-off.

---

## Batch: 2026-05-26  (4 of 35 cards)

<!-- batch: 2026-05-26 | status: drafted -->

## k_vp_map (KTX cvar, Voting -- Shape 7b threshold)

- **Status**: drafted
- **Source**: src/world.c:828
- **Catalog line**: 17657
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Percentage of eligible voters (players minus bots) required to pass a map-change vote. Values below 51 are treated as 51; maximum is 100. In Race mode a mode-specific vote-count formula is used. In matchless mode this cvar also sets the threshold for the /break (next-map) vote.
>
> Range: 51-100 (effective; values below 51 floor to 51).
>
> Default: 51.
> Set by: server config.

### Shape classification

Shape 7b threshold cvar.

`k_vp_map` is read at vote-tally time for two OV_* paths: OV_MAP (`cm` command, map selection vote) and OV_BREAK in matchless mode (`next_map` command). No paired toggle or cycle command exists. No `cvar_toggle_msg` site. Standard `k_vp_*` threshold cvar for continuous toggle vote channels -- Shape 7b. The dual-consumer pattern (two commands reading the same threshold) is a behavioral complexity surfaced in Effect, not a shape distinction.

### Proposed draft

```
Percentage of eligible voters (players minus bots) required to pass a map-change vote; also governs the next-map vote threshold in matchless mode.

Effect:
  - Values below 51 are clamped to 51; maximum effective value is 100. At 51 (default), just over half of non-bot players must vote for the same map.
  - Governs the `votemap` map-vote (and its internal `cm` alias-target on legacy clients) on the OV_MAP channel. In matchless mode, the same cvar also governs the OV_BREAK tally (`next_map`, and `break` when invoked matchless) via the matchless conditional at `vote.c:245-247`. In non-matchless (standard match) mode, `k_vp_break` governs OV_BREAK instead.
  - In Race mode, when at least one player is race-ready and the match has run for more than 10 seconds, the required vote count switches to the number of race-ready players regardless of the k_vp_map percentage. In all other Race scenarios the standard formula applies.
  - No admin veto path for map votes -- an admin's map preference earns tie-breaking priority when multiple maps are nominated, but does not bypass the threshold.

Permission:    server config only
Default:       51 (stored as 0/empty; clamped to 51 at tally time).

Example:
  k_vp_map 60   // 60% of non-bot players must vote for the same map

See also: votemap (user-facing map-vote command; primary OV_MAP consumer), next_map (matchless end-match vote; matchless OV_BREAK consumer via `vote.c:245-247`), cm (internal alias-target for legacy clients; OV_MAP consumer routing through DoSelectMap), k_no_vote_map (Shape 4 gate disables matchless map+break voting), k_vp_break (governs `break` in non-matchless mode)
```

### Notes

- Stored default is 0 (empty string, `RegisterCvar` with no explicit default). The `bound(51, percent, 100)` clamp at vote.c:330 makes the effective floor 51. The existing description says "Default: 51" which matches the effective/user-facing truth. Surfaced in the Default line as "stored as 0/empty; clamped to 51 at tally time" -- informative without contradicting the existing description's framing.
- Race-mode formula (`race_count_votes_req` at race.c:5624): when `isRACE() && fofs == OV_MAP` and racers-ready count > 0 AND time > 10s, requires ALL race-ready players to vote (returns `racers_ready` directly). Otherwise falls back to `ceil(percent * CountPlayers())`. The existing description says "mode-specific vote-count formula is used" -- accurate but vague. Recast surfaces the practical meaning (all race-ready players must vote).
- OV_MAP has no `max(N, vt_req)` minimum-vote floor clause (unlike most other OV_* paths which have explicit minimums of 1-3). The `CountBots() > 0 && (CountPlayers() - CountBots()) == 1` single-human-with-bots override at vote.c:420-423 does apply (sets vt_req = 1), but this is the cross-all-paths bot override, not OV_MAP-specific.
- OV_BREAK matchless path minimum: `max(2, vt_req)` at vote.c:373 -- so `next_map` in matchless requires at least 2 votes regardless of percentage. Not surfaced in the recast (threshold cvar card; the floor behavior is the command card's content).
- Admin vote priority for map selection (vote_get_maps tie-breaking at maps.c:588): when multiple maps are equally voted, an admin's choice wins. Not a threshold bypass. Surfaced in Effect as "tie-breaking priority" to distinguish from the admin-veto pattern in other OV_* paths.
- `cm` registration: `CF_BOTH | CF_MATCHLESS | CF_NOALIAS` -- available to players and admin spectators. `next_map` registration: `CF_PLAYER | CF_MATCHLESS_ONLY` -- player-only, matchless only. Both consume k_vp_map for their respective threshold check.

---

<!-- batch: 2026-05-26 | status: drafted_with_flag -->

## k_no_vote_map (KTX cvar, Voting -- Shape 4)

- **Status**: drafted_with_flag
- **Source**: src/world.c:836 (registration); src/maps.c:408 (cm gate); src/match.c:3021 (next_map gate)
- **Catalog line**: 17353
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Disables map voting and the /next_map command in matchless (pickup-style) mode. When blocked, players attempting either action see "Voting map is not allowed". Has no effect outside matchless mode or during Bloodfest.
>
> 0 = map voting and /next_map allowed.
> 1 = map voting and /next_map blocked.
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 4 -- cvar that gates two commands without toggling them.

`k_no_vote_map` is read inside `if (!...)` early-return blocks in both `DoSelectMap` (the `cm` handler, `maps.c:408`) and `PlayerBreak` (the `next_map` handler, `match.c:3021`). Neither handler writes back to the cvar. No `cvar_toggle_msg` or `cvar_fset` site exists for this cvar. Classic Shape 4 gate; the only variation is that it gates two commands rather than one (same pattern as `k_admins` gating both `/admin` and `/elect`).

### Proposed draft

```
Blocks the matchless map-vote commands (`votemap` plus the auto-aliased map-name shortcuts) and the matchless end-match votes (`next_map`, plus `break` when invoked in matchless mode) in matchless (pickup-style) mode.

Effect:
  When set to 1 in matchless mode (excluding Bloodfest):
  - votemap and its internal cm alias-target receive "Voting map is not allowed" (from DoSelectMap at maps.c:410)
  - next_map and matchless-mode break receive "Voting next map is not allowed" (from PlayerBreak at match.c:3023)
  - The auto-aliased map shortcuts (`/dm3` etc.) route through votemap or cm and inherit the gate.
  Outside matchless mode, or during Bloodfest, the gate has no effect --
  all commands behave as if k_no_vote_map were 0.

Prerequisites: Only active in matchless mode (k_matchLess) and only when
  Bloodfest is not running. On a standard match server this cvar has no
  behavioral effect.

Permission:    server config only
Default:       0

0 = matchless map-vote and end-match-vote commands operate normally (subject to their own threshold and timing rules).
1 = matchless map-vote and end-match-vote commands print refusal messages and the vote is rejected.

Example:
  # server.cfg -- lock the map in pickup mode; players vote via other means
  k_no_vote_map 1

See also: votemap (user-facing map-vote command; primary gated consumer),
  next_map (matchless end-match vote; gated via PlayerBreak), break (also
  gated when invoked in matchless mode), k_vp_map (vote threshold shared by
  votemap and the matchless OV_BREAK path used by next_map + matchless break)
```

### Notes

- FLAG: The existing description quotes only one refusal message: "Voting map is not allowed". Source shows two distinct strings: `cm` (`maps.c:410`) prints "Voting map is **not** allowed"; `next_map` (`match.c:3023`) prints "Voting **next** map is not allowed". The recast surfaces both. Apply-pass-author should verify these strings match the anchor commit before applying.
- The Bloodfest exclusion is verified at both consumer sites: the gate condition is `if (k_matchLess && !k_bloodfest)` in both `DoSelectMap` and `PlayerBreak`. The cvar read fires only inside that compound condition.
- `k_lockmap` is a separate, independent gate within `DoSelectMap` that fires after the `k_no_vote_map` check. Not cross-linked here; it is a distinct cvar with a different scope.
- See-also is 3 entries (under the 4-5 cap): cm + next_map + k_vp_map. All three are load-bearing for users discovering this gate.

---

<!-- batch: 2026-05-26 | status: drafted_with_flag -->

## yes (KTX command, Voting -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/vote.c:84 (handler); src/commands.c:801 (registration)
- **Catalog line**: 18313
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Casts a vote in favour of the current election (captain, coach, admin, or late-join). No effect when no election is active. Cannot vote for yourself; a vote already cast remains counted. For late-join elections only members of the requested team may vote.
>
> Broadcasts "<name> gives his vote" and reports remaining votes needed. Use 'no' to withdraw a previously cast vote.
>
> Set by: any player, usable outside a match.

### Shape classification

shape-less -- universal approval lever for multiple Shape 7a election starters (elect, suggestcolor, captain, coach, late-join). The Shape 7a relationship tag lives on each election starter's card; `yes` is the command-side lever that all of them consume, with no own inter-entity relationship to tag.

`yes` is hardcoded to `OV_ELECT` only (vote.c:89 -- `get_votes(OV_ELECT)`). It never touches Shape 7b continuous-vote channels. All Shape 7a election starters route their approval through this single universal command.

### Proposed draft

```
Casts your vote to approve the current election.

Effect:
  - Registers your approval for the active election (admin, color suggestion,
    captain, coach, or late-join). Broadcasts "<name> gives his vote" and
    announces remaining votes needed.
  - If your vote is already registered: prints "--- your vote is still good
    ---"; your vote remains counted (no double-counting).
  - When the approval threshold is met, the election resolves immediately.

Prerequisites:
  - An election must be active (started by elect, suggestcolor, or the captain
    / coach election starters).
  - For late-join elections: you must be a ready player on the requested team.

Permission:    any player
Match-state:   any time

Example:
  elect     (starts admin election; other players are prompted to type yes)
  yes       (approve -- broadcasts "<name> gives his vote", shows votes remaining)

See also: no (withdraws your vote), elect (admin election starter), suggestcolor (color election starter), captain (captain election starter), coach (coach election starter)
```

### Notes

- FLAG: Existing description lists election types as "captain, coach, admin, or late-join" -- omits `suggestcolor` (etSuggestColor). The `get_votes_req(OV_ELECT, ...)` switch at vote.c:286 confirms suggestcolor elections go through the same OV_ELECT channel and are approved via `yes`. The v2 draft adds "color suggestion" to the election type list.
- "Cannot vote for yourself" cut per discipline: logically-implied self-state refusal. A player who is the election candidate would not be running `yes` to approve their own election; the refusal is noise for the action-level reader.
- Registration: CF_PLAYER | CF_MATCHLESS (commands.c:801). CF_MATCHLESS means the command is available in matchless-mode servers in addition to standard mode; it does not restrict to matchless-only (CF_MATCHLESS_ONLY is a separate flag, g_local.h:657). No `match_in_progress` early-return in VoteYes -- the function fires at any match state but returns silently if no election is active (`get_votes(OV_ELECT)` returns 0).
- See-also at cap (5 entries): no (companion withdrawal) + 4 Shape 7a election starters that consume yes. All are load-bearing. No concept note cross-link added (no existing elections concept note).
- Mirror of the `no` card (card 26): the shape-less verdict, "logically-implied self-refusal cut", and See-also structure are symmetric. The `no` handler additionally silently ignores callers who haven't voted yet (self->v.elect == 0 check at vote.c:148) -- `yes` has no equivalent silent-no-op (it prints "--- your vote is still good ---" for duplicates instead).

---

<!-- batch: 2026-05-26 | status: drafted_with_flag -->

## k_vp_hookstyle (KTX cvar, Voting -- Shape 7b threshold + command-per-value fan-out modifier)

- **Status**: drafted_with_flag
- **Source**: src/world.c:834 (registration); src/vote.c:318 (threshold read in get_votes_req)
- **Catalog line**: 17627
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Percentage of eligible voters required to pass a grappling-hook-style change vote in CTF (smooth / fast / classic). The required vote count is calculated as ceil(percent/100 * eligible players).
>
> Range: 51-100 (values below 51 are treated as 51; values above 100 are capped at 100).
>
> Default: 51.
> Set by: server config.

### Shape classification

Shape 7b threshold + command-per-value fan-out modifier.

`k_vp_hookstyle` is the percentage-threshold cvar for the hook-style vote family. The fan-out modifier applies because `k_ctf_hookstyle` is enum-valued (values 1-4) and KTX defines 4 sibling vote commands, one per style. The threshold cvar gates 3 of the 4 commands (`hook_smooth`, `hook_fast`, `hook_classic`) via the `OV_HOOKSMOOTH / OV_HOOKFAST / OV_HOOKCLASSIC` cases in `get_votes_req()`. `hook_crhook` (`OV_HOOKCRHOOK`) is NOT in the switch and falls through to the `percent = 51` default -- see FLAG below.

### Proposed draft

```
Minimum percentage of eligible players required for a hook-style vote to pass in CTF. Applies to the hook_smooth, hook_fast, and hook_classic vote channels; hook_crhook uses a hardcoded 51% floor regardless of this setting.

Effect:
  - Threshold is calculated as ceil(k_vp_hookstyle / 100 * eligible_players), minimum 1 vote.
  - A single admin vote passes any of the three hook-style channels immediately (admin veto path).
  - On pass, k_ctf_hookstyle is set to the winning style's value (1 = smooth, 2 = fast, 3 = classic).
  - hook_crhook (k_ctf_hookstyle = 4) is not gated by this cvar; it uses 51% regardless.

Prerequisites: CTF mode must be active (all hook vote commands refuse outside CTF with "hook style can only be set in CTF mode").

Permission:    server config only
Match-state:   pre-match only (hook style votes are refused while a match is in progress)
Default:       (empty -- effective 51 at vote-tally time; stored as "" by RegisterCvar)

Example:
  # server.cfg -- require 60% for hook style changes
  k_vp_hookstyle 60

See also: k_ctf_hookstyle (state cvar written on vote pass), hook_smooth (votes for style 1), hook_fast (votes for style 2), hook_classic (votes for style 3), hook_crhook (votes for style 4 -- not gated by this cvar)
```

### Notes

- FLAG: existing description lists only "smooth / fast / classic" -- omits `hook_crhook` as the 4th value. `hook_crhook` (`OV_HOOKCRHOOK`) is registered at `commands.c:920` with the same `CF_PLAYER | CF_MATCHLESS` flags but its `OV_HOOKCRHOOK` case is absent from the `get_votes_req()` switch (`vote.c:315-319`). It falls through to the `percent = 51` initialized value and gets no explicit minimum-vote floor beyond the single-bot-single-human catch-all at `vote.c:420`. In practice `hook_crhook` always requires 51% regardless of `k_vp_hookstyle`. Apply-pass-author should verify this interpretation of the switch fall-through is intentional (not a code bug) before finalizing the recast.
- FLAG: existing description states "Default: 51". Source shows `RegisterCvar("k_vp_hookstyle")` which resolves to `RegisterCvarEx(var, "")` (empty string default). The effective vote-tally result is 51 via `bound(51, 0, 100)`, but the stored default is "" not "51". The recast records this accurately as "(empty -- effective 51 at vote-tally time)".
- Minimum-vote floor is `max(1, vt_req)` for OV_HOOKSMOOTH / OV_HOOKFAST / OV_HOOKCLASSIC (`vote.c:401, 405, 409`). This means a single player can cast the winning vote (e.g. solo server). Not in existing description; added to Effect.
- Admin veto: `is_admins_vote(OV_HOOK*)` applies to all 4 hook handlers. A single admin vote immediately passes the channel. Added to Effect.
- See-also exceeds 4 entries here (5 with k_ctf_hookstyle + 4 vote commands). Acceptable for the threshold cvar in a 4-sibling fan-out -- the canonical-card pattern for this family lives on hook_classic (card 21), so the See-also on this threshold cvar functions as the family discovery anchor. Monitor for concept-note candidacy if the See-also grows further.

---

## Batch: 2026-05-27-match-flow  (5 of 70 cards)

<!-- batch: 2026-05-27-match-flow | status: drafted -->

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

---

<!-- batch: 2026-05-27-match-flow | status: drafted -->

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

---

<!-- batch: 2026-05-27-match-flow | status: drafted -->

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

---

<!-- batch: 2026-05-27-match-flow | status: drafted_with_flag -->

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

---

<!-- batch: 2026-05-27-match-flow | status: drafted_with_flag -->

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

---

## Batch: 2026-05-27-gameplay-rules  (4 of 70 cards)

<!-- batch: 2026-05-27-gameplay-rules | status: drafted -->

## dq (KTX cvar, Gameplay rules -- Shape 1)

- **Status**: drafted
- **Source**: src/world.c:866
- **Catalog line**: 5947
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for whether dying players drop their active quad during a live match.
>
> 0 = no quad drop on death.
> 1 = quad drops on death with its remaining duration preserved.
>
> Default: 0 (standard in competitive team play; may be 1 on FFA servers).
> Set by: server config or 'dropquad' command in-game.

### Shape classification

Shape 1 (cvar + paired toggle command). `dq` is registered via `RegisterCvar("dq")` at `world.c:866`; `dropquad` at `commands.c:741` calls `ToggleDropQuad` which is `cvar_toggle_msg(self, "dq", redtext("DropQuad"))` with a `match_in_progress` early-return.

### Proposed draft

```
Whether a player carrying Quad Damage drops it on death, preserving the remaining duration.

0 = quad is lost on death (not dropped).
1 = quad drops on death with remaining duration preserved.

Prerequisites: k_pow_q (quad powerup rule) and powerups enabled (k_pow) must both be on; otherwise the drop is silently skipped even when dq = 1.

Permission:    server config or 'dropquad' in-game (pre-match only)
Default:       0

Example:
  # server.cfg
  dq 1
  k_pow_q 1   # quad powerup must also be on

  # toggle in warmup
  dropquad

See also: dropquad (paired toggle), dp (backpack-drop rule), dr (ring-drop rule), k_pow_q (quad powerup enable)
```

### Notes

- Prerequisites added: source-confirmed at items.c:1974 (`cvar("dq") && Get_Powerups() && cvar("k_pow_q")`). Not present in existing description.
- Default 0 is consistent with `common_um_init` (`dq 0` at commands.c:4191) and with `RegisterCvar` no-explicit-default (raw default is also 0).

---

<!-- batch: 2026-05-27-gameplay-rules | status: drafted -->

## k_pow_min_players (KTX cvar, Gameplay rules -- Shape 3)

<!-- VERDICT: drafted -->

- **Status**: drafted
- **Source**: src/world.c:816
- **Catalog line**: 6628
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Matchless deathmatch only. Minimum number of connected players required for powerups to stay enabled. Below this threshold the server automatically disables powerups; once the count is met again powerups re-enable (re-checked every k_pow_check_time seconds). Has no effect outside matchless deathmatch mode.
>
> Range: 0-999. Value 0 disables the auto-toggle (powerups follow k_pow regardless of player count).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command). Registration at world.c:816 via `RegisterCvar("k_pow_min_players")` -- no toggle command. Read in `Get_Powerups()` at g_utils.c:1786 and 1809/1813. The 0-999 bounds are applied via `bound(0, cvar(...), 999)` at g_utils.c:1786. The `_k_pow_last` internal cvar persists powerup state across map transitions for the matchless edge case (g_utils.c:1808).

### Proposed draft

```
Matchless deathmatch only. Sets the minimum number of connected players required for powerups to remain enabled. When the count drops below this threshold, the server automatically disables powerups; when the count is met again, powerups re-enable. The check fires every k_pow_check_time seconds. Has no effect outside matchless mode.

Range: 0-999 players. Setting 0 disables the auto-toggle (powerups follow k_pow regardless of player count).

Permission:    server config only
Default:       0 (auto-toggle disabled).

Example:
  # server.cfg -- auto-disable powerups if fewer than 4 players
  k_pow_min_players 4
  k_pow_check_time 15

See also: k_pow_check_time (interval between auto-toggle checks), k_pow (master powerup switch)
```

### Notes

- Verification: `Get_Powerups()` at g_utils.c:1786-1813 confirms the clamped 0-999 range, the 0=disabled behavior, and the re-enable behavior on count recovery. The `framecount == 1` path at g_utils.c:1808 handles the map-transition edge case.
- No contradictions with existing description.

---

<!-- batch: 2026-05-27-gameplay-rules | status: drafted_with_flag -->

## fairpacks (KTX command, Gameplay rules -- Shape 2 command side)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:758
- **Catalog line**: 7178
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Cycles the fair-packs setting (k_frp) through three states, broadcasting the change to all players. Has no effect while a match is in progress; yawnmode forces the setting to 2.
>
> 0 = disabled (standard backpack drop).
> 1 = the player's best weapon goes into the death backpack.
> 2 = the last weapon the player fired goes into the death backpack.
>
> Default: 0.
> Set by: admin command 'fairpacks' (cycles 0 -> 1 -> 2 -> 0).

### Shape classification

Shape 2 command side (paired cycle command for k_frp).

Registration: `CF_PLAYER` at commands.c:758. Handler `ToggleFairPacks` reads k_frp, increments/wraps 0-2, writes back via `cvar_fset`. Per Shape 2 discipline: value enum lives on the k_frp cvar card, not here.

### Proposed draft

```
Cycles the fair-packs drop rule (k_frp) through its three states, broadcasting the result to all players.

Prerequisites: yawnmode forces fair-packs to state 2 (last weapon fired) and locks it there; invoking in yawnmode resets to 2 rather than advancing.

Permission:    any player (spectators excluded).
Match-state:   pre-match only.

Example:
  fairpacks   // 0 -> 1 -> 2 -> 0 (cycles; broadcasts result each step)

See also: k_frp (cvar storing current state; can be set directly to skip cycling).
```

### Notes

- FLAG: The existing description labels this "Admin command." Source shows `CF_PLAYER` at commands.c:758 -- not admin-only; any player (spectators excluded) can cycle. Recast reflects source-truth.
- Value enum removed from command card per Shape 2 discipline -- lives on k_frp card.
- Yawnmode behavior verified: `ToggleFairPacks` at commands.c:3184-3187 -- in yawnmode, calls `get_fair_pack()` (returns 2) and does not increment. Surfaced as Prerequisites since it's a surprise-bearing interaction.
- match_in_progress guard confirmed at commands.c:3179.

---

<!-- batch: 2026-05-27-gameplay-rules | status: drafted_with_flag -->

## k_dis (KTX cvar, Gameplay rules -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:865
- **Catalog line**: 6134
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls lightning-gun discharge -- the area damage dealt when the LG is fired while the player stands in water.
>
> 0 = discharge disabled (cells are consumed but no area damage is dealt).
> 1 = discharge enabled (radius damage scaled by cells spent).
> 2 = discharge fires but only hits players who are themselves in liquid.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 1 (cvar + paired toggle command). `k_dis` is registered via `RegisterCvar("k_dis")` at `world.c:865`; `discharge` at `commands.c:723` calls `ToggleDischarge` which is `cvar_toggle_msg(self, "k_dis", redtext("discharges"))` with a `match_in_progress` early-return.

Nuance: `cvar_toggle_msg` performs a strict binary flip (any non-zero -> 0, zero -> 1). Value 2 is only reachable via direct server config; the `discharge` command toggles between 0 and 1 only. The cvar has 3 meaningful values but the toggle command is binary.

### Proposed draft

```
Controls lightning-gun discharge -- the radius damage dealt when the LG is fired while the player stands in water.

0 = discharge disabled (cells consumed, no area damage).
1 = discharge enabled; radius damage scales with cells spent, hitting all players in range (attacker takes half damage).
2 = discharge enabled but only damages players who are also in water; out-of-water players unaffected. Value 2 is server config only -- the 'discharge' toggle command only switches between 0 and 1.

Permission:    server config (all values); or 'discharge' in-game for 0/1 toggle (pre-match only)
Default:       1

Example:
  # server.cfg -- standard competitive
  k_dis 1

  # server.cfg -- CTF (no out-of-water splash)
  k_dis 2

  # toggle discharge on/off in warmup
  discharge

See also: discharge (paired toggle, flips between 0 and 1 only)
```

### Notes

- FLAG: RegisterCvar("k_dis") has no explicit default -- raw cvar default is 0. The value 1 reflects common_um_init (k_dis 1 at commands.c:4195, applied by all standard mode presets). CTF preset overrides to 2 (commands.c:4447). "Default: 1" is accurate for standard mode presets; apply-pass-author may annotate as "Default: 1 (set by standard mode presets; CTF preset uses 2)".
- FLAG: Existing description says "Set by: server config" -- the `discharge` command exists as a paired toggle for 0/1. Shape 1 confirmed; corrected in draft.
- Verification: radius damage at weapons.c:1208 (35 * cells); attacker half-damage at combat.c:1191-1193; value-2 out-of-water exclusion at combat.c:1195-1199.

---

## Batch: 2026-05-26-mode-scoped-knobs  (4 of 65 cards)

<!-- batch: 2026-05-26-mode-scoped-knobs | status: drafted -->

## k_clan_arena_rounds (KTX cvar, Mode-scoped knobs -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:984
- **Catalog line**: 11109
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Number of rounds in a Clan Arena or Wipeout series. Values are clamped to 3-101; even values are silently rounded up to the next odd number. The series is best-of-that, won by the first team to take a majority of rounds.
>
> Range: 3-101 (odd values only; even inputs are rounded up).
>
> Default: 9.
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired toggle or cycle command). Confirmed: no `cvar_toggle_msg`, no `cvar_fset` cycle handler exists for `k_clan_arena_rounds`. The only write paths are server.cfg and the `carena` / `wipeout` preset bundles. Bound + odd-rounding applied at read time inside `CA_wins_required()` (`clan_arena.c:286-290`), not at set time.

### Proposed draft

```
Number of rounds in a Clan Arena or Wipeout series. The first team to win a majority of rounds wins the series.

Effect:
  Values are clamped to 3-101 at match time. Even values are silently rounded up to the next odd number (so 8 becomes 9, 10 becomes 11, etc.). The required wins are computed as (rounds + 1) / 2 after the odd-rounding step.

  Both the 'carena' and 'wipeout' presets set this to 9 by default; 'wipeout' additionally sets k_clan_arena_max_respawns 4.

Permission:    server config only
Default:       9.

Example:
  # server.cfg -- 11-round series (first to 6)
  k_clan_arena 1
  k_clan_arena_rounds 11
  k_clan_arena_max_respawns 0

See also: k_clan_arena (mode enable cvar), k_clan_arena_max_respawns (respawns per round), carena (preset that bundles this), wipeout (preset that bundles this)
```

### Notes

- Odd-rounding and clamping verified at `clan_arena.c:286-290` (`CA_wins_required()`). Applied at match-start read time, not at set time -- so `server.cfg k_clan_arena_rounds 8` is stored as 8 but treated as 9 at runtime. This is a surprise-bearing behavior worth surfacing in Effect.
- The existing description is accurate; no contradictions found.

---

<!-- batch: 2026-05-26-mode-scoped-knobs | status: drafted -->

## k_ctf_hook (KTX cvar, Mode-scoped knobs -- Shape 1)

- **Status**: drafted
- **Source**: src/world.c:953
- **Catalog line**: 11233
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Enables the grappling hook for all players in CTF mode. When on, players spawn with the hook in their inventory and can quick-switch to it by re-selecting the axe. When turned off, the hook is removed from all players and any in-flight hook is reset.
>
> 0 = hook disabled.
> 1 = hook enabled (given at spawn).
>
> Default: 0.
> Set by: server config or 'nohook' admin command in-game.

### Shape classification

Shape 1c cvar side (Shape 1 + mode-precondition). The `nohook` command calls `cvar_toggle_msg(self, "k_ctf_hook", redtext("hook"))` (ctf.c:772) and has a CTF mode check (ctf.c:765). `nohook` CF registration: `CF_PLAYER | CF_MATCHLESS` -- any player (spectators excluded), not admin-only.

The existing description says "Set by: server config or 'nohook' admin command" -- `nohook` is any-player, not admin. This is a localized flag. However, given `nohook` is the paired toggle card and will be flagged there, and the cvar card's reference to "admin command" is just a label inherited from the old shape -- the factual claim is technically on the command card. The cvar card is accurate about the behavior; the permission attribution is a note for the apply-pass-author.

### Proposed draft

```
Enables the grappling hook for all players in CTF mode.

Effect:
  0 = hook disabled; not given at spawn; any in-flight hook is reset and
      removed on toggle-off.
  1 = hook enabled; players receive it in inventory at spawn and can
      quick-switch to it by re-selecting the axe slot.

In matchless mode, toggling takes effect live for all connected players.

Prerequisites: CTF mode must be active (nohook refuses with "Can't do this in non CTF mode" otherwise).

Permission:    server config, or `nohook` in-game (any player; CTF only; pre-match only).
Match-state:   pre-match only (unless matchless mode).
Default:       0.

Example:
  # server.cfg
  k_ctf_hook 1
  # in-game (pre-match, any player):
  nohook

See also: nohook (paired toggle), k_ctf_hookstyle (selects hook physics style when hook is enabled).
```

### Notes

- The "Set by: server config or 'nohook' admin command" from the existing description reflects old shape framing. The corrected Permission line on this card reads "any player" to match the `nohook` CF flag (`CF_PLAYER | CF_MATCHLESS`). The apply-pass-author should verify the `nohook` card is updated simultaneously to avoid inconsistency.
- Live-apply-on-toggle behavior in matchless mode is explicitly coded at ctf.c:774-785 (`AddHook(true/false)` call when `k_matchLess`). Surfaced in Effect.

---

<!-- batch: 2026-05-26-mode-scoped-knobs | status: drafted_with_flag -->

## norunes (KTX command, Mode-scoped knobs -- Shape 1 + Shape 1c)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:921 (registration), src/ctf.c:724 (handler)
- **Catalog line**: 12807
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles CTF runes on or off and announces the new state server-wide. Only available in CTF mode. Blocked while a match is in progress, unless the server runs in matchless mode.
>
> When run in matchless mode: turning runes off strips any rune currently carried by a player (resetting their movement speed); turning them on immediately respawns the rune items in the map.
>
> Set by: admin command 'norunes' in-game.

### Shape classification

Shape 1 + Shape 1c command side (paired with `k_ctf_runes`, with CTF mode precondition).

`ctf.c:738` calls `cvar_toggle_msg(self, "k_ctf_runes", ...)`. Handler has `isCTF()` mode-precondition that prints "Can't do this in non CTF mode". This is the command side of the Shape 1c pair.

### Proposed draft

```
Toggles the runes rule (k_ctf_runes) and announces the new state server-wide.

Effect:
  Flips k_ctf_runes between 0 and 1 and broadcasts the change.
  In matchless mode, also takes immediate effect:
    - Turning off: strips any rune currently carried by a player and resets
      their movement speed.
    - Turning on: respawns all enabled rune items in the map immediately.

Prerequisites: CTF mode must be active ("Can't do this in non CTF mode").

Permission:    any player (spectators excluded).
Match-state:   pre-match only (silently ignored while a regular match is in progress;
               available any time in matchless mode).

Example:
  norunes

See also: k_ctf_runes (paired cvar), k_ctf_rune_power_hst (haste rune power/enable)
```

### Notes

- FLAG: The existing description says "Set by: admin command 'norunes' in-game." -- the `commands.c:921` registration is `CF_PLAYER | CF_MATCHLESS`, which is `CF_PLAYER` alone for permission purposes (CF_MATCHLESS is a match-state modifier, not a permission flag). `CF_PLAYER` = "any player (spectators excluded)" per `g_local.h:647`. No `CF_PLR_ADMIN`, no `CF_SPC_ADMIN`, no `CF_BOTH_ADMIN`. The existing "admin command" framing is INCORRECT. Permission is "any player (spectators excluded)". The v2 draft corrects this. Apply-pass-author: verify `commands.c:921` CF flag before applying.
- Match-state is non-standard: the handler silently returns (no message) when `match_in_progress && !k_matchLess`. In matchless mode, it proceeds even while match is running. The v2 Match-state line reflects this two-phase behavior.
- No value enum on the command card (lives on `k_ctf_runes`). Standard Shape 1c command-side discipline.
- See-also capped at 2 entries (the paired cvar + one power cvar as example). The full rune power family is accessible from `k_ctf_runes`'s See-also.

---

<!-- batch: 2026-05-26-mode-scoped-knobs | status: drafted_with_flag -->

## freshguns (KTX command, Mode-scoped knobs -- Shape 1 + Shape 4 gate)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:952
- **Catalog line**: 12468
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command: toggle the FreshGuns rule on or off. When on, picking up (sweeping) a weapon in FreshTeams mode grants limited ammo rather than the full load. Broadcasts the new state when toggled. Requires FreshTeams to be enabled first; blocked during a live match or in race mode.
>
> Set by: admin command '/freshguns' (outside of a live match).

### Shape classification

Shape 1 command side (toggles `k_freshteams_limit_sweep_ammo` via `cvar_toggle_msg`) + Shape 4 gate (checks `!k_freshteams`, refuses with "FreshGuns requires FreshTeams (/fresh)"). The existing description labels this "Admin command" but the CF flag is `CF_PLAYER | CF_SPC_ADMIN` -- any player or admin spectator, not admin-only. This is a localized factual error in the permission framing.

### Proposed draft

```
Toggles the FreshGuns rule (k_freshteams_limit_sweep_ammo) on or off.

Effect: flips k_freshteams_limit_sweep_ammo between 0 and 1. When on, picking up
a weapon you already own gives only the reduced sweep-ammo amount instead of the
full load. Broadcasts the new state.

Prerequisites: k_freshteams must be enabled ("FreshGuns requires FreshTeams (/fresh)").

Permission:    any player or admin spectator.
Match-state:   pre-match only.

Example:
  fresh        # enable Fresh Teams first
  freshguns    # toggle FreshGuns on

See also: k_freshteams_limit_sweep_ammo (cvar this toggles), k_freshteams (prerequisite master toggle), fresh (prerequisite toggle command), k_freshteams_sweep_*_ammo cvars (per-weapon sweep amounts when on)
```

### Notes

- FLAG: existing description says "Admin command" -- source CF flag is `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator, not admin-only). Permission line corrected.
- The cvar this toggles (`k_freshteams_limit_sweep_ammo`) carries the 0/1 value enum; not duplicated here per Shape 1 discipline.

---

## Batch: 2026-05-27-race  (3 of 45 cards)

<!-- batch: 2026-05-27-race | status: drafted -->

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

---

<!-- batch: 2026-05-27-race | status: drafted -->

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

---

<!-- batch: 2026-05-27-race | status: drafted_with_flag -->

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

---

## Batch: 2026-05-26-mode-selection  (3 of 29 cards)

<!-- batch: 2026-05-26-mode-selection | status: drafted -->

## gamemodes (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:1062 (registration); handler ListGameModes at src/commands.c:9513
- **Catalog line**: 10755
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Lists the game-mode selection commands available on this server (e.g. 1on1, race, wipeout, totmode).
>
> Set by: any player ('gamemodes' in-game).

### Shape classification

Shape-less. `ListGameModes` is NOT a pure `G_sprint` roster print (Shape 10). It cross-references a hardcoded `known[]` array of 25 mode command names against the live `cmds[]` registration table and prints only those that match -- output is filtered by which commands are registered on the server at boot time. Shape 10 requires "a pure G_sprint listing N other command names with one-line descriptions"; this handler prints names only (no descriptions) and filters by server registration. The 25-entry `known[]` array is a curated allowlist, not a printed description table. Classification: shape-less filtered discovery printer. No inter-entity relationship (gating, pairing, voting, or dispatch) requiring a Layer B shape tag.

### Proposed draft

```
Prints the list of mode-selection commands available on this server.

Effect: checks each command in a curated allowlist of 25 known mode commands against what is registered on this server, and prints those that match. The output reflects which modes the server operator has enabled -- commands not registered (e.g. because a mode is disabled) are omitted.

Allowlist (commands that appear when registered):
  race        1on1        2on2        3on3        4on4
  2on2on2     3on3on3     4on4on4     10on10      XonX
  ffa         ctf         hoonymode   blitz2v2    blitz4v4
  practice    midair      instagib    berzerk     lgcmode
  arena       carena      wipeout     yawnmode    totmode

Permission:    any player or spectator
Match-state:   any time

Example:
  gamemodes             # list available mode commands on this server

See also: 1on1 (mode preset), ffa (mode preset), ctf (mode preset), hoonymode (mode preset), wipeout (mode preset)
```

### Notes

- `CF_BOTH` = `CF_PLAYER | CF_SPECTATOR` -- any player or spectator, no admin requirement.
- The handler has no match-state check (no `match_in_progress` guard) -- available any time.
- Shape 10 was considered but ruled out: Shape 10 requires hardcoded sibling descriptions inline; this handler prints names only, and output is filtered by registration (not a static hardcoded list). The distinction is load-bearing: on a server with CTF disabled, `ctf` does not appear in the output. The allowlist is curated but the output is server-conditional.
- The per-dispatch instruction noted gamemodes might be "a state-printer (mode-aware, prints currently active mode + available alternatives)." Source confirms it is NOT mode-aware -- it does not check which mode is currently active. It prints registered mode commands from the hardcoded allowlist. No mode-state dependency.

---

<!-- batch: 2026-05-26-mode-selection | status: drafted -->

## dmm4 (KTX command, Mode selection -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:728
- **Catalog line**: 10639
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switches the server to deathmatch mode 4. Sets deathmatch to 4, forces timelimit to 3 minutes, and broadcasts the change. Mode 4 is the only deathmatch mode that permits k_midair and k_instagib -- switching away from dmm4 zeroes both options automatically. The Quad Damage powerup is renamed "OctaPower" while dmm4 is active.
>
> Set by: any in-game player or admin spectator ('dmm4' command; subject to rules-change permission).

### Shape classification

shape-less. Same `ChangeDM` dispatch (src/commands.c:728, arg 4). No paired cvar+toggle or vote relationship of its own. It acts as the prerequisite mode for k_midair, k_instagib, k_rocketarena, and the lgc/tot/instagib modifier families (Shape 1c/1d), but that relationship lives on those entities' cards -- dmm4 itself has no Layer B relationship to tag.

### Proposed draft

```
Switches the server to deathmatch mode 4 -- the only mode that permits midair, instagib, LGC, and Rocket Arena modifiers.

Effect:
  - Sets timelimit to 3 minutes automatically.
  - Renames Quad Damage to "OctaPower" while mode 4 is active.
  - k_midair and k_instagib become available (refused with "requires dmm4" in any other mode).
  - Switching away from mode 4 immediately clears k_midair and k_instagib.
  - If already in mode 4, prints "dmm4 already set" and does nothing.

Prerequisites: Rule changes must be allowed (refused mid-match and while race mode is active).

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  dmm4            (switch to mode 4 -- timelimit auto-set to 3)
  midair          (now available)
  instagib        (now available)

See also: dmm1 (sibling mode), dmm2 (sibling mode), dmm3 (sibling mode), dmm5 (sibling mode), k_midair (requires dmm4), k_instagib (requires dmm4)
```

### Notes

- timelimit auto-set to 3 verified at commands.c:2896: `cvar_set("timelimit", "3")` inside the `else` branch when `dmm == 4`.
- OctaPower rename verified at items.c:2341: `self->netname = deathmatch == 4 ? "OctaPower" : "Quad Damage"`.
- k_midair/k_instagib clear on mode-change verified at commands.c:2891-2892 inside ChangeDM.
- See-also cap at 6 (4 siblings + 2 most load-bearing requirers). k_rocketarena, lgc, tot, instagib are also dmm4-dependent but their cards reference dmm4 in Prerequisites -- cross-link is bidirectional there, not needed on this card.

---

<!-- batch: 2026-05-26-mode-selection | status: drafted_with_flag -->

## dmm5 (KTX command, Mode selection -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:729
- **Catalog line**: 10666
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switches the server to deathmatch mode 5 and announces the change. In mode 5, picked-up weapons stay on the ground and ammo respawn time is halved (15 seconds instead of 30). Enabling mode 5 forces k_midair and k_instagib off.
>
> Note: The rule distinguishing mode 5 from mode 3 is not definitively established in KTX source.
>
> Set by: admin command in-game.

### Shape classification

shape-less. Same `ChangeDM` dispatch (src/commands.c:729, arg 5). No relational shape. Sibling family.

### Proposed draft

```
Switches the server to deathmatch mode 5 -- a "super-spawn" variant used by Wipeout and Clan Arena setups.

Effect:
  - Picked-up weapons remain on the ground (not removed on pickup).
  - Ammo respawn time is halved to 15 seconds.
  - Players spawn during a live match with all weapons (SSG, NG, SNG, RL, GL, LG), 200 health, 200 armor (red), full ammo loadout, and brief invincibility.
  - Clears k_midair and k_instagib (both require dmm4).
  - If already in mode 5, prints "dmm5 already set" and does nothing.

Prerequisites: Rule changes must be allowed (refused mid-match and while race mode is active).

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  dmm5          (switch to mode 5 -- players spawn fully loaded in live match)

See also: dmm1 (sibling mode), dmm2 (sibling mode), dmm3 (sibling mode; shares weapon-stay + halved ammo respawn but no super-spawn), dmm4 (sibling mode)
```

### Notes

- FLAG: The existing description states "The rule distinguishing mode 5 from mode 3 is not definitively established in KTX source" -- this is source-incorrect. The distinguishing rule is the full-loadout spawn behavior confirmed at client.c:2308-2332: when `deathmatch == 5 && match_in_progress == 2`, spawning players receive all 6 weapons, 200 HP, 200 RA (armorvalue=200, armortype=0.8), full ammo, and invincibility. This is the primary behavioral distinction from mode 3. The apply-pass-author should verify client.c:2308-2332 and remove the "not definitively established" caveat.
- FLAG: The existing description says "Set by: admin command in-game" but CF_PLAYER | CF_SPC_ADMIN means any in-game player can invoke it. Corrected in recast.
- Weapon-stay verified at items.c:835 (dmm==5 included in leave=1 group).
- Halved ammo respawn verified at items.c:1347 (dmm==5 included with dmm==3).
- Super-spawn verified at client.c:2308-2332.
- Wipeout preset sets deathmatch 5 (commands.c:4469); Clan Arena (carena) also uses deathmatch 5 (commands.c:4493 context). The "super-spawn" description in the Headliner gives context for why mode 5 exists.

---

## Batch: 2026-05-23  (3 of 57 cards)

<!-- batch: 2026-05-23 | status: drafted -->

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

<!-- batch: 2026-05-23 | status: drafted -->

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

<!-- batch: 2026-05-23 | status: drafted_with_flag -->

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

## Batch: 2026-05-26-admin-permissions  (2 of 36 cards)

<!-- batch: 2026-05-26-admin-permissions | status: drafted -->

## socd (KTX command, Admin & permissions -- Shape 2 cycle command-side lever for k_socd)

- **Status**: drafted
- **Source**: src/commands.c:1040; handler src/commands.c:9398
- **Catalog line**: 1207
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cycles the k_socd enforcement level one step per invocation (0 -> 1 -> 2 -> 3 -> 0) and announces the new mode. Cannot be used while a match is in progress.
>
> 0 = allow (SOCD inputs are not acted on).
> 1 = stats only (post-game SOCD detection count is reported).
> 2 = warn (broadcasts a public warning after repeated detections, prewar only).
> 3 = kick (force-disconnects the player after repeated detections).
>
> Set by: admin command 'socd' in-game (not allowed during a live match).

### Shape classification

Shape 2 cycle command-side lever for `k_socd`

`socd` reads `cvar("k_socd")`, increments and wraps at 4 (0→1→2→3→0), writes back via `cvar_set`. This is a Shape 2 cycle command paired with the `k_socd` cvar. The value enum (0-3 with meanings) belongs on the `k_socd` cvar card. The SOCD detection mechanism itself (strafe-change pattern analysis in `PlayerPreThink`) is sophisticated, but the `socd` command's role is the simple cycle-lever -- consistent with Shape 2.

### Proposed draft

```
Cycles the SOCD (Simultaneous Opposite Cardinal Directions) enforcement level one step per invocation (0 → 1 → 2 → 3 → 0) and broadcasts the new mode.

Effect:
  0 (allow):      no enforcement -- SOCD inputs are permitted and unreported.
  1 (stats):      SOCD detection counts appear in the post-game movement report for each player.
  2 (warn):       broadcasts a public warning when a player accumulates repeated SOCD detections (prewar only -- detection during live match does not warn).
  3 (kick):       force-disconnects a player after repeated SOCD detections.

Permission:    any player (spectators excluded)
Match-state:   pre-match only

Example:
  socd      advance enforcement from current level to next (wraps 3 → 0)

See also: k_socd (state cvar this cycles -- default and value enum on cvar card)
```

### Notes

- Handler `socd` at `commands.c:9398`. Reads `cvar("k_socd")`, increments, wraps using `SOCD_ALLOW` (0) / `SOCD_KICK` (3) bounds check, writes back via `cvar_set`. `match_in_progress` early-return at `commands.c:9402` confirmed; pre-match only.
- Constants verified: `SOCD_ALLOW=0`, `SOCD_STATS=1`, `SOCD_WARN=2`, `SOCD_KICK=3` from `include/g_consts.h:346-349`.
- SOCD detection mechanism (for context -- not in L1): `PlayerPreThink` (`client.c:3748-3804`) tracks rapid direction reversals (fStrafeChangeCount >= 25 with >= 75% frame-perfect reversals). Detection fires as a counter increment; levels 2/3 check `socdDetectionCount >= 3` threshold.
- Default: `RegisterCvarEx("k_socd", "1")` at `world.c:1017` -- default is 1 (SOCD_STATS), not 0. Value enum and default belong on `k_socd` cvar card.
- CF registration is `CF_PLAYER` (`commands.c:1040`) -- any player in a player slot; spectators are excluded. Permission corrected from the existing description (which does not specify this) to "any player (spectators excluded)".
- FLAG: `CF_PLAYER` alone (not `CF_PLAYER | CF_SPC_ADMIN`) means spectators cannot invoke `socd`. The existing description says "admin command" -- source shows any player in a player slot can cycle socd, not admin-only. This is a material factual error in the existing description.
- Warn level (2): source at `client.c:3785` confirms warn only fires `!match_in_progress` -- detection during a live match is silently counted but no public broadcast. The existing description's "prewar only" annotation is correct.

---

<!-- batch: 2026-05-26-admin-permissions | status: drafted_with_flag -->

## hdptoggle (KTX command, Admin & permissions -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:835 (handler: hdptoggle at commands.c:5196)
- **Catalog line**: 894
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command that toggles the server-wide handicap lock (k_lock_hdp) and announces the new state to all players. While locked, any player's attempt to change their handicap is refused. Has no effect while a match is in progress.
>
> Default: unlocked (follows k_lock_hdp default of 0).
> Set by: admin command 'hdptoggle' (match-gated).

### Shape classification

Shape 1: cvar + paired toggle command. Handler uses `trap_cvar_set_float("k_lock_hdp", !cvar("k_lock_hdp"))` (boolean NOT flip) rather than `cvar_toggle_msg`, but the semantic pattern is identical to Shape 1 -- binary flip on the paired cvar + broadcast. Pre-match gate via `match_in_progress` early-return. CF_BOTH_ADMIN confirms admin-only. Paired cvar `k_lock_hdp` registered with no default (= 0) in world.c:801.

### Proposed draft

```
Toggles the server-wide handicap lock (k_lock_hdp), preventing or re-enabling players' ability to set their own handicap.

Effect:
  Flips k_lock_hdp between 0 (unlocked) and 1 (locked).
  While locked: player handicap changes are refused, and all players' effective handicap is forced to 100 (neutral) until unlocked.
  Broadcasts the new state including the admin's name.

Permission:    admin only
Match-state:   pre-match only

Example: hdptoggle

See also: k_lock_hdp (paired cvar -- stores the lock state)
```

### Notes

- FLAG: Existing description includes "Default: unlocked (follows k_lock_hdp default of 0)" on the command card. Commands have no default in the v2 shape -- defaults belong on the cvar card (`k_lock_hdp`). This is a v1-shape artifact; apply-pass-author should move the default note to the k_lock_hdp cvar card when that batch ships.
- Source adds one behavioral detail not in existing description: `GetHandicap()` at g_utils.c:1662 forces effective handicap to 100 when locked -- players don't just get refused on new changes; their active handicap is overridden too. Surfaced in Effect.
- Cross-batch: paired cvar `k_lock_hdp` lives in a different batch. Apply-pass-author should verify symmetric See-also when that batch ships.

---

## Batch: 2026-05-26-frogbot  (2 of 79 cards)

<!-- batch: 2026-05-26-frogbot | status: drafted -->

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

---

<!-- batch: 2026-05-26-frogbot | status: drafted_with_flag -->

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

---

## Batch: 2026-05-27-demo-spectator  (1 of 76 cards)

<!-- batch: 2026-05-27-demo-spectator | status: drafted -->

## 10fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:875
- **Catalog line**: 1608
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator-only command. Switches your point of view to the player saved in favourites slot 10. Slot 10 is populated with the `fav10_add` command (run while tracking a player). If the slot is empty, prints "fav go: slot 10 is not defined". If the saved player has since disconnected, prints "fav go: slot 10 can't find player". If already tracking that player, prints "fav go: already observing...". One command exists per slot (1fav_go through 20fav_go).
>
> Set by: spectator command '10fav_go' (spectator-only).

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 10. See `1fav_go` for full mechanism. This command operates on slot 10.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav10_add (saves current tracked player into slot 10)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=10.
- CF flag: `CF_SPECTATOR` (bit 1) -- uniform across all 20 Nfav_go commands.
- Handler: `xfav_go(float fav_num)` with `fav_num=10`. Reads `self->favx[9]`.

---

## Batch: 2026-05-27-internal-state  (1 of 20 cards)

<!-- batch: 2026-05-27-internal-state | status: drafted -->

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

---


**Total cards in digest: 32**
